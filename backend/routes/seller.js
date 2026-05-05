import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { protect, adminOnly, sellerOrAdmin } from '../middleware/auth.js';
import { pool } from '../config/database.js';
import deepseek from '../services/deepseek.js';

const router = Router();

// ─── ADMIN: Gestión de vendedores ──────────────────────────────────────────────

// Listar todos los vendedores con sus métricas resumidas
router.get('/admin/sellers', protect, adminOnly, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.id, u.name, u.email, u.role, COALESCE(u.active, true) AS active, u.created_at,
        (SELECT COUNT(*) FROM leads WHERE assigned_seller_id = u.id) AS leads_assigned,
        (SELECT COUNT(*) FROM leads WHERE assigned_seller_id = u.id AND UPPER(status) = 'GANADO') AS won,
        (SELECT COUNT(*) FROM seller_calls WHERE seller_id = u.id AND created_at >= NOW() - INTERVAL '30 days') AS calls_30d,
        (SELECT COUNT(*) FROM outreach_messages om
           JOIN leads l ON l.id = om.lead_id
           WHERE l.assigned_seller_id = u.id AND UPPER(om.status) = 'SENT'
             AND om.sent_at >= NOW() - INTERVAL '30 days') AS contacts_30d
      FROM users u
      WHERE u.role = 'seller'
      ORDER BY u.created_at DESC
    `);
    res.json({ sellers: rows });
  } catch (err) {
    console.error('Error listando vendedores:', err);
    res.status(500).json({ message: 'Error al listar vendedores' });
  }
});

// Crear vendedor
router.post('/admin/sellers', protect, adminOnly, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password || password.length < 6) {
      return res.status(400).json({ message: 'Nombre, email y contraseña (≥6) son requeridos' });
    }
    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (exists.rows.length) return res.status(409).json({ message: 'Email ya en uso' });

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password, role, active)
       VALUES ($1, $2, $3, 'seller', true)
       RETURNING id, name, email, role, active, created_at`,
      [name, email.toLowerCase(), hash]
    );
    res.status(201).json({ seller: rows[0] });
  } catch (err) {
    console.error('Error creando vendedor:', err);
    res.status(500).json({ message: 'Error al crear vendedor' });
  }
});

// Activar/desactivar vendedor
router.patch('/admin/sellers/:id', protect, adminOnly, async (req, res) => {
  try {
    const { active, name } = req.body;
    const sets = [];
    const params = [];
    let idx = 1;
    if (typeof active === 'boolean') { sets.push(`active = $${idx++}`); params.push(active); }
    if (name) { sets.push(`name = $${idx++}`); params.push(name); }
    if (!sets.length) return res.status(400).json({ message: 'Nada que actualizar' });
    params.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE users SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${idx} AND role = 'seller'
       RETURNING id, name, email, role, active`,
      params
    );
    if (!rows.length) return res.status(404).json({ message: 'Vendedor no encontrado' });
    res.json({ seller: rows[0] });
  } catch (err) {
    console.error('Error actualizando vendedor:', err);
    res.status(500).json({ message: 'Error al actualizar vendedor' });
  }
});

// Resetear contraseña de un vendedor
router.post('/admin/sellers/:id/reset-password', protect, adminOnly, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Contraseña debe tener al menos 6 caracteres' });
    }
    const hash = await bcrypt.hash(password, 10);
    const { rowCount } = await pool.query(
      `UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2 AND role = 'seller'`,
      [hash, req.params.id]
    );
    if (!rowCount) return res.status(404).json({ message: 'Vendedor no encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Error reset password:', err);
    res.status(500).json({ message: 'Error al resetear contraseña' });
  }
});

// Ranking comparativo de vendedores
router.get('/admin/sellers/ranking', protect, adminOnly, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.id, u.name, u.email,
        COUNT(DISTINCT l.id) FILTER (WHERE UPPER(l.status) = 'GANADO') AS won,
        COUNT(DISTINCT l.id) FILTER (WHERE UPPER(l.status) IN ('CONTACTADO','EN_CONVERSACION','PROPUESTA','NEGOCIACION')) AS active_pipeline,
        COUNT(DISTINCT om.id) FILTER (WHERE UPPER(om.status) = 'SENT' AND om.sent_at >= NOW() - INTERVAL '30 days') AS contacts_30d,
        COUNT(DISTINCT om.id) FILTER (WHERE UPPER(om.status) = 'REPLIED' AND om.replied_at >= NOW() - INTERVAL '30 days') AS replies_30d,
        COALESCE(SUM(CASE WHEN UPPER(l.status) = 'GANADO' THEN COALESCE(l.score, 0) * 100 ELSE 0 END), 0) AS won_value
      FROM users u
      LEFT JOIN leads l ON l.assigned_seller_id = u.id
      LEFT JOIN outreach_messages om ON om.lead_id = l.id
      WHERE u.role = 'seller'
      GROUP BY u.id, u.name, u.email
      ORDER BY won DESC, contacts_30d DESC
    `);
    res.json({ ranking: rows });
  } catch (err) {
    console.error('Error ranking vendedores:', err);
    res.status(500).json({ message: 'Error al obtener ranking' });
  }
});

// ─── SELLER: métricas personales ──────────────────────────────────────────────

router.get('/me/metrics', protect, sellerOrAdmin, async (req, res) => {
  try {
    const sellerId = req.user.id;
    const [
      contactedToday, replied30d, sent30d, activeConvos, wonMonth, callsThisWeek,
      pipelineValue, recentWins
    ] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS c FROM outreach_messages om JOIN leads l ON l.id = om.lead_id
                  WHERE l.assigned_seller_id = $1 AND om.sent_at >= CURRENT_DATE AND UPPER(om.status) = 'SENT'`, [sellerId]),
      pool.query(`SELECT COUNT(*) AS c FROM outreach_messages om JOIN leads l ON l.id = om.lead_id
                  WHERE l.assigned_seller_id = $1 AND UPPER(om.status) = 'REPLIED' AND om.replied_at >= NOW() - INTERVAL '30 days'`, [sellerId]),
      pool.query(`SELECT COUNT(*) AS c FROM outreach_messages om JOIN leads l ON l.id = om.lead_id
                  WHERE l.assigned_seller_id = $1 AND UPPER(om.status) = 'SENT' AND om.sent_at >= NOW() - INTERVAL '30 days'`, [sellerId]),
      pool.query(`SELECT COUNT(*) AS c FROM leads WHERE assigned_seller_id = $1 AND UPPER(status) = 'EN_CONVERSACION'`, [sellerId]),
      pool.query(`SELECT COUNT(*) AS c, COALESCE(SUM(COALESCE(score,0)*100),0) AS v FROM leads
                  WHERE assigned_seller_id = $1 AND UPPER(status) = 'GANADO' AND updated_at >= date_trunc('month', CURRENT_DATE)`, [sellerId]),
      pool.query(`SELECT COUNT(*) AS c FROM seller_calls WHERE seller_id = $1 AND created_at >= NOW() - INTERVAL '7 days'`, [sellerId]),
      pool.query(`SELECT COALESCE(SUM(COALESCE(score,0)*100),0) AS v FROM leads
                  WHERE assigned_seller_id = $1 AND UPPER(status) IN ('CONTACTADO','EN_CONVERSACION','PROPUESTA','NEGOCIACION')`, [sellerId]),
      pool.query(`SELECT id, name, sector, city, updated_at AS won_at, COALESCE(score,0)*100 AS value
                  FROM leads WHERE assigned_seller_id = $1 AND UPPER(status) = 'GANADO'
                  ORDER BY updated_at DESC LIMIT 5`, [sellerId])
    ]);

    const sent = parseInt(sent30d.rows[0].c) || 0;
    const replied = parseInt(replied30d.rows[0].c) || 0;
    const responseRate = sent > 0 ? +((replied / sent) * 100).toFixed(1) : 0;

    res.json({
      kpis: {
        contactedToday: parseInt(contactedToday.rows[0].c) || 0,
        sent30d: sent,
        replied30d: replied,
        responseRate,
        activeConversations: parseInt(activeConvos.rows[0].c) || 0,
        wonThisMonth: parseInt(wonMonth.rows[0].c) || 0,
        wonValue: parseFloat(wonMonth.rows[0].v) || 0,
        callsThisWeek: parseInt(callsThisWeek.rows[0].c) || 0,
        pipelineValue: parseFloat(pipelineValue.rows[0].v) || 0,
      },
      recentWins: recentWins.rows
    });
  } catch (err) {
    console.error('Error métricas vendedor:', err);
    res.status(500).json({ message: 'Error al obtener métricas' });
  }
});

// Próximas acciones del vendedor (leads que requieren seguimiento hoy)
router.get('/me/next-actions', protect, sellerOrAdmin, async (req, res) => {
  try {
    const sellerId = req.user.id;
    const [followUps, scheduledCalls, inactive] = await Promise.all([
      pool.query(`
        SELECT l.id, l.name, l.sector, UPPER(l.status) AS stage, l.score,
               (SELECT MAX(sent_at) FROM outreach_messages WHERE lead_id = l.id) AS last_activity
        FROM leads l
        WHERE l.assigned_seller_id = $1
          AND UPPER(l.status) IN ('EN_CONVERSACION','PROPUESTA','NEGOCIACION')
          AND (SELECT MAX(sent_at) FROM outreach_messages WHERE lead_id = l.id) < NOW() - INTERVAL '2 days'
        ORDER BY l.score DESC NULLS LAST LIMIT 10
      `, [sellerId]),
      pool.query(`
        SELECT sc.id, sc.lead_id, sc.next_action, sc.next_action_at, l.name
        FROM seller_calls sc JOIN leads l ON l.id = sc.lead_id
        WHERE sc.seller_id = $1 AND sc.next_action_at IS NOT NULL
          AND sc.next_action_at <= NOW() + INTERVAL '3 days'
          AND sc.next_action_at >= NOW() - INTERVAL '1 day'
        ORDER BY sc.next_action_at ASC LIMIT 10
      `, [sellerId]),
      pool.query(`
        SELECT id, name, sector, score FROM leads
        WHERE assigned_seller_id = $1 AND UPPER(status) = 'CONTACTADO'
          AND updated_at < NOW() - INTERVAL '5 days'
        ORDER BY score DESC NULLS LAST LIMIT 10
      `, [sellerId])
    ]);
    res.json({
      followUps: followUps.rows,
      scheduledCalls: scheduledCalls.rows,
      coldLeads: inactive.rows
    });
  } catch (err) {
    console.error('Error next actions:', err);
    res.status(500).json({ message: 'Error al obtener próximas acciones' });
  }
});

// ─── SELLER: Recomendaciones IA de leads ──────────────────────────────────────

router.get('/recommendations', protect, sellerOrAdmin, async (req, res) => {
  try {
    const { limit = 8 } = req.query;
    // Score heurístico: prioriza no-asignados, alto score, sector con buena conversión histórica,
    // y recientemente actualizados
    const { rows } = await pool.query(`
      WITH sector_perf AS (
        SELECT l.sector,
          COUNT(*) FILTER (WHERE UPPER(l.status) = 'GANADO')::float /
            NULLIF(COUNT(*) FILTER (WHERE UPPER(l.status) IN ('GANADO','PERDIDO')), 0) AS win_rate
        FROM leads l GROUP BY l.sector
      )
      SELECT l.id, l.name, l.sector, l.city, l.score, l.email, l.phone,
             l.social_linkedin, l.website, UPPER(l.status) AS stage,
             l.assigned_seller_id,
             COALESCE(sp.win_rate, 0) AS sector_win_rate,
             (
               COALESCE(l.score, 0) * 1.0
               + COALESCE(sp.win_rate, 0) * 50
               + CASE WHEN UPPER(l.status) IN ('NUEVO','') OR l.status IS NULL THEN 30 ELSE 0 END
               + CASE WHEN l.email IS NOT NULL THEN 10 ELSE 0 END
               + CASE WHEN l.phone IS NOT NULL OR l.social_whatsapp IS NOT NULL THEN 10 ELSE 0 END
               + CASE WHEN l.social_linkedin IS NOT NULL THEN 10 ELSE 0 END
             ) AS recommendation_score
      FROM leads l
      LEFT JOIN sector_perf sp ON sp.sector = l.sector
      WHERE l.assigned_seller_id IS NULL
        AND UPPER(COALESCE(l.status, 'NUEVO')) NOT IN ('GANADO','PERDIDO','DESCARTADO')
      ORDER BY recommendation_score DESC
      LIMIT $1
    `, [parseInt(limit)]);
    res.json({ recommendations: rows });
  } catch (err) {
    console.error('Error recomendaciones:', err);
    res.status(500).json({ message: 'Error al obtener recomendaciones' });
  }
});

// Reclamar / asignarse un lead
router.post('/leads/:id/claim', protect, sellerOrAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE leads SET assigned_seller_id = $1, updated_at = NOW()
       WHERE id = $2 AND (assigned_seller_id IS NULL OR assigned_seller_id = $1)
       RETURNING id, name, assigned_seller_id`,
      [req.user.id, req.params.id]
    );
    if (!rows.length) return res.status(409).json({ message: 'Lead ya asignado a otro vendedor' });
    res.json({ lead: rows[0] });
  } catch (err) {
    console.error('Error claim lead:', err);
    res.status(500).json({ message: 'Error al reclamar lead' });
  }
});

// Liberar lead
router.post('/leads/:id/release', protect, sellerOrAdmin, async (req, res) => {
  try {
    await pool.query(
      `UPDATE leads SET assigned_seller_id = NULL, updated_at = NOW()
       WHERE id = $1 AND (assigned_seller_id = $2 OR $3 = 'admin')`,
      [req.params.id, req.user.id, req.user.role]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Error release lead:', err);
    res.status(500).json({ message: 'Error al liberar lead' });
  }
});

// ─── Llamadas ─────────────────────────────────────────────────────────────────

router.get('/leads/:id/calls', protect, sellerOrAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT sc.*, u.name AS seller_name FROM seller_calls sc
      LEFT JOIN users u ON u.id = sc.seller_id
      WHERE sc.lead_id = $1 ORDER BY sc.created_at DESC
    `, [req.params.id]);
    res.json({ calls: rows });
  } catch (err) {
    console.error('Error listando llamadas:', err);
    res.status(500).json({ message: 'Error al listar llamadas' });
  }
});

router.post('/leads/:id/calls', protect, sellerOrAdmin, async (req, res) => {
  try {
    const { duration_seconds, outcome, notes, next_action, next_action_at } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO seller_calls (lead_id, seller_id, duration_seconds, outcome, notes, next_action, next_action_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.params.id, req.user.id, duration_seconds || 0, outcome || null, notes || null,
       next_action || null, next_action_at || null]
    );
    res.status(201).json({ call: rows[0] });
  } catch (err) {
    console.error('Error guardando llamada:', err);
    res.status(500).json({ message: 'Error al guardar llamada' });
  }
});

// ─── LinkedIn research ────────────────────────────────────────────────────────

router.get('/leads/:id/linkedin-research', protect, sellerOrAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM seller_linkedin_research WHERE lead_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [req.params.id]
    );
    res.json({ research: rows[0] || null });
  } catch (err) {
    console.error('Error linkedin research:', err);
    res.status(500).json({ message: 'Error al obtener investigación' });
  }
});

router.post('/leads/:id/linkedin-research', protect, sellerOrAdmin, async (req, res) => {
  try {
    const leadId = req.params.id;
    const lead = (await pool.query('SELECT * FROM leads WHERE id = $1', [leadId])).rows[0];
    if (!lead) return res.status(404).json({ message: 'Lead no encontrado' });

    const profileUrl = lead.social_linkedin || req.body.profile_url || null;

    let aiSummary = '';
    let talkingPoints = '';
    try {
      const prompt = `Sos un asistente de prospección B2B. Sobre la empresa "${lead.name}" del sector "${lead.sector || 'desconocido'}" en "${lead.city || 'Argentina'}".\n` +
        `Datos: web=${lead.website || 'n/a'}, linkedin=${profileUrl || 'n/a'}, descripción=${lead.description || 'n/a'}.\n\n` +
        `Devolveme en JSON estricto: {"summary": "<resumen 3-4 líneas para el vendedor>", "talking_points": ["<punto 1>", "<punto 2>", "<punto 3>"], "decision_makers_hint": "<qué cargos/roles buscar en LinkedIn>"}`;
      const ai = await deepseek.chat({
        messages: [
          { role: 'system', content: 'Sos experto en investigación de prospectos B2B en Argentina. Respondés siempre en JSON válido en español.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.4, maxTokens: 700
      });
      try {
        const cleaned = ai.content.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        aiSummary = parsed.summary || '';
        talkingPoints = [
          ...(parsed.talking_points || []),
          parsed.decision_makers_hint ? `Buscar en LinkedIn: ${parsed.decision_makers_hint}` : null
        ].filter(Boolean).join('\n• ');
        if (talkingPoints) talkingPoints = '• ' + talkingPoints;
      } catch {
        aiSummary = ai.content;
      }
    } catch (e) {
      console.warn('IA no disponible para research:', e.message);
      aiSummary = `Empresa: ${lead.name}. Sector: ${lead.sector || 'N/D'}. Sin análisis IA disponible.`;
      talkingPoints = '• Verificar tamaño de la empresa en LinkedIn\n• Identificar al decisor principal (Gerente / Director / Owner)\n• Buscar publicaciones recientes para personalizar';
    }

    const { rows } = await pool.query(
      `INSERT INTO seller_linkedin_research (lead_id, seller_id, profile_url, ai_summary, ai_talking_points)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [leadId, req.user.id, profileUrl, aiSummary, talkingPoints]
    );
    res.json({ research: rows[0] });
  } catch (err) {
    console.error('Error linkedin research POST:', err);
    res.status(500).json({ message: 'Error al generar investigación' });
  }
});

// ─── Sugerencia IA de seguimiento ─────────────────────────────────────────────

router.post('/leads/:id/ai-followup', protect, sellerOrAdmin, async (req, res) => {
  try {
    const leadId = req.params.id;
    const lead = (await pool.query('SELECT * FROM leads WHERE id = $1', [leadId])).rows[0];
    if (!lead) return res.status(404).json({ message: 'Lead no encontrado' });

    const history = (await pool.query(
      `SELECT channel, body, subject, status, sent_at, replied_at FROM outreach_messages
       WHERE lead_id = $1 ORDER BY COALESCE(sent_at, created_at) DESC LIMIT 10`, [leadId]
    )).rows;
    const calls = (await pool.query(
      `SELECT outcome, notes, created_at FROM seller_calls WHERE lead_id = $1 ORDER BY created_at DESC LIMIT 5`, [leadId]
    )).rows;

    let suggestion = { channel: 'EMAIL', subject: '', body: '', reasoning: '' };
    try {
      const prompt = `Lead: ${lead.name} (${lead.sector || 'sin sector'}, ${lead.city || ''}). Estado actual: ${lead.status || 'NUEVO'}. Score: ${lead.score || 0}.\n` +
        `Histórico (max 10 mensajes):\n${history.map(h => `[${h.channel}] ${h.status} ${h.subject || ''} ${(h.body || '').slice(0, 200)}`).join('\n') || 'Sin contactos previos'}\n` +
        `Llamadas: ${calls.map(c => `${c.outcome}: ${(c.notes || '').slice(0, 100)}`).join(' | ') || 'Sin llamadas'}\n\n` +
        `Devolveme JSON: {"channel":"EMAIL|WHATSAPP|CALL","subject":"<si email>","body":"<mensaje listo para enviar, tono cercano y argentino, max 100 palabras>","reasoning":"<por qué este mensaje y canal>"}`;
      const ai = await deepseek.chat({
        messages: [
          { role: 'system', content: 'Sos un coach de ventas B2B argentino. Generás follow-ups efectivos en español rioplatense, breves y personalizados. Respondés solo JSON válido.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.6, maxTokens: 600
      });
      const cleaned = ai.content.replace(/```json|```/g, '').trim();
      suggestion = JSON.parse(cleaned);
    } catch (e) {
      console.warn('IA follow-up fallback:', e.message);
      suggestion = {
        channel: lead.social_whatsapp || lead.phone ? 'WHATSAPP' : 'EMAIL',
        subject: `Seguimiento - ${lead.name}`,
        body: `Hola! Quería retomar la conversación sobre ${lead.sector || 'tu negocio'}. ¿Tenés un minuto esta semana para charlar?`,
        reasoning: 'Sugerencia genérica (IA no disponible). Ajustá según el contexto del lead.'
      };
    }

    // Persisto la sugerencia
    const saved = await pool.query(
      `INSERT INTO seller_ai_suggestions (seller_id, lead_id, type, title, body, payload)
       VALUES ($1,$2,'followup',$3,$4,$5) RETURNING id`,
      [req.user.id, leadId, suggestion.subject || `Follow-up ${suggestion.channel}`, suggestion.body, JSON.stringify(suggestion)]
    );

    res.json({ suggestion: { ...suggestion, id: saved.rows[0].id } });
  } catch (err) {
    console.error('Error ai-followup:', err);
    res.status(500).json({ message: 'Error al generar sugerencia IA' });
  }
});

// Marcar una sugerencia como usada
router.patch('/suggestions/:id/use', protect, sellerOrAdmin, async (req, res) => {
  try {
    await pool.query(
      `UPDATE seller_ai_suggestions SET used = true, used_at = NOW() WHERE id = $1 AND seller_id = $2`,
      [req.params.id, req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: 'Error' });
  }
});

export default router;
