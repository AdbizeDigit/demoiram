// Herramientas avanzadas para vendedores: briefing IA, intent detector, asistente conversacional,
// deal health, battlecards, propuestas IA, alertas, secuencias, agenda
import { Router } from 'express';
import { protect, adminOnly, sellerOrAdmin } from '../middleware/auth.js';
import { pool } from '../config/database.js';
import deepseek from '../services/deepseek.js';
import crypto from 'crypto';

const router = Router();
const publicRouter = Router(); // sin auth: pixel tracking + booking público

// ─── 1. BRIEFING PRE-LLAMADA ──────────────────────────────────────────────────

router.post('/leads/:id/briefing', protect, sellerOrAdmin, async (req, res) => {
  try {
    const lead = (await pool.query('SELECT * FROM leads WHERE id = $1', [req.params.id])).rows[0];
    if (!lead) return res.status(404).json({ message: 'Lead no encontrado' });

    const recentMessages = (await pool.query(
      `SELECT channel, body, status, sent_at FROM outreach_messages
       WHERE lead_id = $1 ORDER BY COALESCE(sent_at, created_at) DESC LIMIT 5`,
      [req.params.id]
    )).rows;
    const calls = (await pool.query(
      `SELECT outcome, notes, created_at FROM seller_calls WHERE lead_id = $1 ORDER BY created_at DESC LIMIT 3`,
      [req.params.id]
    )).rows;

    let briefing = null;
    try {
      const prompt = `Sos un coach de ventas B2B argentino. Estoy por llamar a "${lead.name}" (${lead.sector || 'sin sector'}, ${lead.city || ''}).
Datos: web=${lead.website || 'n/a'}, descripción=${lead.description || 'n/a'}, score=${lead.score || 0}, etapa=${lead.status || 'NUEVO'}.
Histórico (max 5): ${recentMessages.map(m => `[${m.channel}/${m.status}] ${(m.body || '').slice(0, 120)}`).join(' | ') || 'sin contactos'}.
Llamadas: ${calls.map(c => `${c.outcome}: ${(c.notes || '').slice(0, 80)}`).join(' | ') || 'ninguna'}.

Devolveme JSON estricto con esta estructura:
{
  "company_summary": "<2-3 líneas sobre la empresa y su contexto probable>",
  "decision_maker_hint": "<qué cargo buscar y cómo abordarlo>",
  "pain_points": ["<dolor probable 1>", "<dolor 2>", "<dolor 3>"],
  "opening_questions": ["<pregunta 1>", "<pregunta 2>", "<pregunta 3>"],
  "likely_objections": [{"objection":"<obj>","response":"<respuesta breve>"}],
  "value_props": ["<por qué nosotros 1>", "<2>"],
  "urgency_indicator": "<frío/tibio/caliente y por qué>"
}`;
      const ai = await deepseek.chat({
        messages: [
          { role: 'system', content: 'Sos un experto en ventas consultivas B2B en Argentina. Respondés solo en JSON válido en español rioplatense.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5, maxTokens: 1200
      });
      const cleaned = ai.content.replace(/```json|```/g, '').trim();
      briefing = JSON.parse(cleaned);
    } catch (e) {
      console.warn('Briefing IA fallback:', e.message);
      briefing = {
        company_summary: `Empresa del sector ${lead.sector || 'desconocido'}. ${lead.description ? lead.description.slice(0, 200) : 'Sin descripción adicional.'}`,
        decision_maker_hint: 'Buscar a Gerente Comercial / Director / Owner según tamaño',
        pain_points: ['Validar dolor durante la llamada'],
        opening_questions: ['¿Cómo manejan hoy X?', '¿Qué los llevó a contactarse con nosotros?', '¿Quién decide en estos temas?'],
        likely_objections: [{ objection: 'Es caro', response: 'Costo vs ROI: armar el caso del beneficio' }],
        value_props: ['IA aplicada al negocio', 'Implementación rápida'],
        urgency_indicator: 'tibio (fallback IA)'
      };
    }

    res.json({ briefing, lead: { id: lead.id, name: lead.name, sector: lead.sector, city: lead.city } });
  } catch (err) {
    console.error('Error briefing:', err);
    res.status(500).json({ message: 'Error al generar briefing' });
  }
});

// ─── 2. INTENT DETECTOR ───────────────────────────────────────────────────────

router.get('/leads/:id/intent', protect, sellerOrAdmin, async (req, res) => {
  try {
    // Toma los últimos 5 mensajes (incoming + outgoing) y detecta intent en el último incoming
    const msgs = (await pool.query(
      `SELECT channel, body, status, sent_at, replied_at, reply_sentiment
       FROM outreach_messages
       WHERE lead_id = $1
       ORDER BY COALESCE(replied_at, sent_at, created_at) DESC LIMIT 8`,
      [req.params.id]
    )).rows;

    const lastReply = msgs.find(m => String(m.status).toUpperCase() === 'REPLIED');
    if (!lastReply) {
      return res.json({ intent: null, reason: 'Sin respuestas todavía' });
    }

    // Heurística rápida primero (sin AI)
    const text = (lastReply.body || '').toLowerCase();
    const buyingSignals = ['interes', 'precio', 'cuánto', 'cuanto', 'cotiz', 'reunión', 'reunion', 'agend', 'demo', 'cuándo', 'cuando podemos', 'sí me', 'si me', 'llamame', 'mándame', 'mandame', 'envíame', 'enviame'];
    const negativeSignals = ['no me interesa', 'no gracias', 'baja', 'remov', 'no escrib', 'spam'];

    let intent = 'neutral';
    let confidence = 0.5;
    let signals = [];

    for (const s of buyingSignals) if (text.includes(s)) { intent = 'buying'; confidence = 0.85; signals.push(s); }
    for (const s of negativeSignals) if (text.includes(s)) { intent = 'negative'; confidence = 0.9; signals.push(s); }

    // Si hay sentiment guardado, usarlo
    if (lastReply.reply_sentiment === 'positive' && intent !== 'negative') { intent = 'buying'; confidence = Math.max(confidence, 0.8); }
    if (lastReply.reply_sentiment === 'negative') { intent = 'negative'; confidence = Math.max(confidence, 0.85); }

    res.json({
      intent, confidence, signals,
      lastReply: {
        body: lastReply.body,
        channel: lastReply.channel,
        at: lastReply.replied_at || lastReply.sent_at
      },
      action: intent === 'buying' ? 'Agendá reunión YA' : intent === 'negative' ? 'Marcá como perdido' : 'Hacé follow-up'
    });
  } catch (err) {
    console.error('Error intent:', err);
    res.status(500).json({ message: 'Error al detectar intent' });
  }
});

// ─── 3. ASISTENTE IA CONVERSACIONAL ───────────────────────────────────────────

router.get('/leads/:id/assistant', protect, sellerOrAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT messages FROM seller_chat_threads WHERE seller_id = $1 AND lead_id = $2 ORDER BY updated_at DESC LIMIT 1`,
      [req.user.id, req.params.id]
    );
    res.json({ messages: rows[0]?.messages || [] });
  } catch (err) {
    res.status(500).json({ message: 'Error' });
  }
});

router.post('/leads/:id/assistant', protect, sellerOrAdmin, async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || !question.trim()) return res.status(400).json({ message: 'Pregunta vacía' });

    const lead = (await pool.query('SELECT * FROM leads WHERE id = $1', [req.params.id])).rows[0];
    if (!lead) return res.status(404).json({ message: 'Lead no encontrado' });

    const msgs = (await pool.query(
      `SELECT channel, body, status FROM outreach_messages WHERE lead_id = $1 ORDER BY COALESCE(sent_at, created_at) DESC LIMIT 8`,
      [req.params.id]
    )).rows;

    // Toma el thread previo si existe
    const existing = (await pool.query(
      `SELECT id, messages FROM seller_chat_threads WHERE seller_id = $1 AND lead_id = $2 ORDER BY updated_at DESC LIMIT 1`,
      [req.user.id, req.params.id]
    )).rows[0];
    const history = existing?.messages || [];

    const systemPrompt = `Sos el asistente de ventas de un vendedor B2B argentino. Tu trabajo es ayudarlo a cerrar al lead "${lead.name}" del sector "${lead.sector || 'desconocido'}".
Datos del lead: ${JSON.stringify({ ciudad: lead.city, score: lead.score, status: lead.status, descripcion: lead.description?.slice(0, 200) })}.
Histórico reciente: ${msgs.map(m => `[${m.channel}/${m.status}] ${(m.body || '').slice(0, 100)}`).join(' | ') || 'sin contactos'}.
Respondé corto, accionable, en español rioplatense. Si te piden un mensaje, dale el texto listo para copiar.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-6).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: question }
    ];

    let answer = '';
    try {
      const ai = await deepseek.chat({ messages, temperature: 0.6, maxTokens: 600 });
      answer = ai.content;
    } catch (e) {
      answer = 'No pude consultar la IA en este momento. Reintentá en un minuto.';
    }

    const newMessages = [
      ...history,
      { role: 'user', content: question, at: new Date().toISOString() },
      { role: 'assistant', content: answer, at: new Date().toISOString() }
    ].slice(-30);

    if (existing) {
      await pool.query('UPDATE seller_chat_threads SET messages = $1, updated_at = NOW() WHERE id = $2',
        [JSON.stringify(newMessages), existing.id]);
    } else {
      await pool.query(
        'INSERT INTO seller_chat_threads (seller_id, lead_id, messages) VALUES ($1, $2, $3)',
        [req.user.id, req.params.id, JSON.stringify(newMessages)]
      );
    }

    res.json({ answer, messages: newMessages });
  } catch (err) {
    console.error('Error assistant:', err);
    res.status(500).json({ message: 'Error en asistente' });
  }
});

// ─── 4. DEAL HEALTH SCORE ─────────────────────────────────────────────────────

router.get('/leads/:id/health', protect, sellerOrAdmin, async (req, res) => {
  try {
    const lead = (await pool.query('SELECT * FROM leads WHERE id = $1', [req.params.id])).rows[0];
    if (!lead) return res.status(404).json({ message: 'Lead no encontrado' });

    const stats = (await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE UPPER(status) = 'SENT') AS sent,
        COUNT(*) FILTER (WHERE UPPER(status) = 'REPLIED') AS replied,
        MAX(COALESCE(replied_at, sent_at)) AS last_activity,
        EXTRACT(DAY FROM (NOW() - MAX(COALESCE(replied_at, sent_at))))::int AS days_since
      FROM outreach_messages WHERE lead_id = $1
    `, [req.params.id])).rows[0];

    const opens = (await pool.query(
      `SELECT COUNT(*) AS c FROM seller_email_opens WHERE lead_id = $1`,
      [req.params.id]
    )).rows[0];

    const stage = String(lead.status || 'NUEVO').toUpperCase();
    const stageScore = { NUEVO: 10, CONTACTADO: 25, EN_CONVERSACION: 60, PROPUESTA: 75, NEGOCIACION: 90, GANADO: 100, PERDIDO: 0 }[stage] || 20;
    const replied = parseInt(stats.replied) || 0;
    const sent = parseInt(stats.sent) || 0;
    const replyBonus = replied > 0 ? Math.min(20, replied * 5) : 0;
    const opensBonus = Math.min(10, parseInt(opens.c) || 0);
    const daysSince = parseInt(stats.days_since) || 999;
    const cooldownPenalty = daysSince > 7 ? Math.min(30, (daysSince - 7) * 2) : 0;
    const scoreBoost = (lead.score || 0) > 70 ? 10 : (lead.score || 0) > 40 ? 5 : 0;

    const health = Math.max(0, Math.min(100, stageScore + replyBonus + opensBonus + scoreBoost - cooldownPenalty));
    const tier = health >= 75 ? 'hot' : health >= 50 ? 'warm' : health >= 25 ? 'cool' : 'cold';

    const reasons = [];
    if (stageScore >= 60) reasons.push(`Etapa avanzada (${stage})`);
    if (replyBonus > 0) reasons.push(`${replied} respuesta(s) recibida(s)`);
    if (opensBonus > 0) reasons.push(`${opens.c} apertura(s) de email`);
    if (cooldownPenalty > 0) reasons.push(`Sin actividad hace ${daysSince}d`);
    if (scoreBoost > 0) reasons.push(`Score IA alto (${lead.score})`);

    res.json({
      health, tier,
      breakdown: { stageScore, replyBonus, opensBonus, scoreBoost, cooldownPenalty },
      reasons,
      stats: { sent, replied, opens: parseInt(opens.c) || 0, daysSince }
    });
  } catch (err) {
    console.error('Error health:', err);
    res.status(500).json({ message: 'Error al calcular health' });
  }
});

// ─── 5. BATTLECARDS ───────────────────────────────────────────────────────────

router.get('/battlecards', protect, sellerOrAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM seller_battlecards WHERE active = true ORDER BY competitor_name`);
    res.json({ battlecards: rows });
  } catch (err) { res.status(500).json({ message: 'Error' }); }
});

router.post('/battlecards', protect, adminOnly, async (req, res) => {
  try {
    const { competitor_name, aliases, differentiators, objection_responses, notes } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO seller_battlecards (competitor_name, aliases, differentiators, objection_responses, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [competitor_name, aliases || null, JSON.stringify(differentiators || []),
       JSON.stringify(objection_responses || []), notes || null, req.user.id]
    );
    res.status(201).json({ battlecard: rows[0] });
  } catch (err) {
    console.error('Error battlecard:', err);
    res.status(500).json({ message: 'Error al crear battlecard' });
  }
});

router.patch('/battlecards/:id', protect, adminOnly, async (req, res) => {
  try {
    const { competitor_name, aliases, differentiators, objection_responses, notes, active } = req.body;
    const sets = [], params = [];
    let idx = 1;
    if (competitor_name !== undefined) { sets.push(`competitor_name = $${idx++}`); params.push(competitor_name); }
    if (aliases !== undefined) { sets.push(`aliases = $${idx++}`); params.push(aliases); }
    if (differentiators !== undefined) { sets.push(`differentiators = $${idx++}`); params.push(JSON.stringify(differentiators)); }
    if (objection_responses !== undefined) { sets.push(`objection_responses = $${idx++}`); params.push(JSON.stringify(objection_responses)); }
    if (notes !== undefined) { sets.push(`notes = $${idx++}`); params.push(notes); }
    if (active !== undefined) { sets.push(`active = $${idx++}`); params.push(active); }
    if (!sets.length) return res.status(400).json({ message: 'Nada que actualizar' });
    params.push(req.params.id);
    sets.push(`updated_at = NOW()`);
    await pool.query(`UPDATE seller_battlecards SET ${sets.join(', ')} WHERE id = $${idx}`, params);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ message: 'Error' }); }
});

router.delete('/battlecards/:id', protect, adminOnly, async (req, res) => {
  try {
    await pool.query('DELETE FROM seller_battlecards WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ message: 'Error' }); }
});

// ─── 6. PROPUESTA IA ──────────────────────────────────────────────────────────

router.post('/leads/:id/proposal', protect, sellerOrAdmin, async (req, res) => {
  try {
    const lead = (await pool.query('SELECT * FROM leads WHERE id = $1', [req.params.id])).rows[0];
    if (!lead) return res.status(404).json({ message: 'Lead no encontrado' });

    const { service_type = 'IA aplicada al negocio', custom_instructions = '' } = req.body || {};

    let proposal = null;
    try {
      const prompt = `Sos un experto en armar propuestas comerciales B2B argentinas para Adbize (servicios de IA, automatización y growth).
Cliente potencial: ${lead.name} (${lead.sector || 'sin sector'}, ${lead.city || 'Argentina'}). Descripción: ${lead.description || 'n/a'}.
Servicio a proponer: ${service_type}.
Instrucciones específicas: ${custom_instructions || 'ninguna'}.

Devolveme JSON con la propuesta:
{
  "title": "<título de la propuesta>",
  "executive_summary": "<resumen 3-4 líneas>",
  "challenges_identified": ["<desafío 1>", "<2>", "<3>"],
  "proposed_solution": "<descripción 1 párrafo>",
  "deliverables": ["<entregable 1>", "<2>", "<3>", "<4>"],
  "timeline_weeks": <número>,
  "investment": {"setup": "<rango ARS>", "monthly": "<rango ARS>", "notes": "<notas>"},
  "next_steps": ["<paso 1>", "<2>"]
}`;
      const ai = await deepseek.chat({
        messages: [
          { role: 'system', content: 'Sos un consultor B2B argentino. Respondés solo en JSON válido en español rioplatense.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.6, maxTokens: 1500
      });
      const cleaned = ai.content.replace(/```json|```/g, '').trim();
      proposal = JSON.parse(cleaned);
    } catch (e) {
      console.warn('Propuesta IA fallback:', e.message);
      proposal = {
        title: `Propuesta para ${lead.name}`,
        executive_summary: `Propuesta de ${service_type} para ${lead.name}. Personalizar después.`,
        challenges_identified: ['Validar con el cliente'],
        proposed_solution: 'Solución a definir según descubrimiento.',
        deliverables: ['Discovery', 'Implementación', 'Capacitación'],
        timeline_weeks: 8,
        investment: { setup: 'A definir', monthly: 'A definir', notes: '' },
        next_steps: ['Reunión de descubrimiento', 'Validación de scope']
      };
    }

    // Markdown del cuerpo
    const bodyMd = [
      `# ${proposal.title}`,
      ``,
      `## Resumen ejecutivo`,
      proposal.executive_summary,
      ``,
      `## Desafíos identificados`,
      ...(proposal.challenges_identified || []).map(c => `- ${c}`),
      ``,
      `## Solución propuesta`,
      proposal.proposed_solution,
      ``,
      `## Entregables`,
      ...(proposal.deliverables || []).map(d => `- ${d}`),
      ``,
      `## Timeline`,
      `${proposal.timeline_weeks || 'A definir'} semanas.`,
      ``,
      `## Inversión`,
      `- Setup: ${proposal.investment?.setup || 'A definir'}`,
      `- Mensual: ${proposal.investment?.monthly || 'A definir'}`,
      proposal.investment?.notes ? `- Notas: ${proposal.investment.notes}` : '',
      ``,
      `## Próximos pasos`,
      ...(proposal.next_steps || []).map(s => `- ${s}`)
    ].filter(Boolean).join('\n');

    const saved = await pool.query(
      `INSERT INTO seller_proposals (seller_id, lead_id, title, body_md, pricing, status)
       VALUES ($1, $2, $3, $4, $5, 'DRAFT') RETURNING *`,
      [req.user.id, req.params.id, proposal.title, bodyMd, JSON.stringify(proposal.investment || {})]
    );

    res.json({ proposal: { ...saved.rows[0], structured: proposal } });
  } catch (err) {
    console.error('Error proposal:', err);
    res.status(500).json({ message: 'Error al generar propuesta' });
  }
});

router.get('/leads/:id/proposals', protect, sellerOrAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM seller_proposals WHERE lead_id = $1 ORDER BY created_at DESC`,
      [req.params.id]
    );
    res.json({ proposals: rows });
  } catch (err) { res.status(500).json({ message: 'Error' }); }
});

// ─── 7. ALERTAS CONTEXTUALES ──────────────────────────────────────────────────

router.get('/me/alerts', protect, sellerOrAdmin, async (req, res) => {
  try {
    // Genera alertas dinámicas + lee las persistentes
    const sellerId = req.user.id;
    const dynamicAlerts = [];

    // 1. Leads con respuesta positiva sin follow-up en 24h
    const positives = (await pool.query(`
      SELECT l.id, l.name, om.replied_at FROM leads l
      JOIN outreach_messages om ON om.lead_id = l.id
      WHERE l.assigned_seller_id = $1
        AND UPPER(om.status) = 'REPLIED'
        AND om.reply_sentiment = 'positive'
        AND om.replied_at > NOW() - INTERVAL '7 days'
        AND NOT EXISTS (
          SELECT 1 FROM outreach_messages om2 WHERE om2.lead_id = l.id
          AND om2.sent_at > om.replied_at AND UPPER(om2.status) = 'SENT'
        )
      LIMIT 10
    `, [sellerId])).rows;
    for (const p of positives) {
      dynamicAlerts.push({
        id: `dyn-pos-${p.id}`,
        type: 'positive_reply_no_followup',
        severity: 'high',
        title: `${p.name} respondió positivo`,
        message: `Sin follow-up todavía. Respondio hace ${Math.floor((Date.now() - new Date(p.replied_at)) / 3600000)}h.`,
        lead_id: p.id,
        action: 'send_followup'
      });
    }

    // 2. Leads en negociación inactivos 5+ días
    const stalled = (await pool.query(`
      SELECT l.id, l.name, EXTRACT(DAY FROM (NOW() - l.updated_at))::int AS days
      FROM leads l
      WHERE l.assigned_seller_id = $1
        AND UPPER(l.status) IN ('PROPUESTA','NEGOCIACION')
        AND l.updated_at < NOW() - INTERVAL '5 days'
      LIMIT 10
    `, [sellerId])).rows;
    for (const s of stalled) {
      dynamicAlerts.push({
        id: `dyn-stall-${s.id}`,
        type: 'stalled_negotiation',
        severity: 'medium',
        title: `${s.name} estancado`,
        message: `En negociación sin movimiento hace ${s.days} días.`,
        lead_id: s.id,
        action: 'check_status'
      });
    }

    // 3. Apertura de email reciente sin reacción
    const opens = (await pool.query(`
      SELECT eo.lead_id, l.name, MAX(eo.opened_at) AS last_open, COUNT(*) AS open_count
      FROM seller_email_opens eo
      JOIN leads l ON l.id = eo.lead_id
      WHERE l.assigned_seller_id = $1
        AND eo.opened_at > NOW() - INTERVAL '24 hours'
      GROUP BY eo.lead_id, l.name
      HAVING COUNT(*) >= 2
      LIMIT 10
    `, [sellerId])).rows;
    for (const o of opens) {
      dynamicAlerts.push({
        id: `dyn-open-${o.lead_id}`,
        type: 'multiple_email_opens',
        severity: 'high',
        title: `${o.name} abrió tu email ${o.open_count} veces`,
        message: `Está mirando tu propuesta. Llamalo ahora.`,
        lead_id: o.lead_id,
        action: 'call_now'
      });
    }

    // Persistentes (alertas guardadas, no descartadas)
    const persisted = (await pool.query(
      `SELECT * FROM seller_alerts
       WHERE seller_id = $1 AND dismissed = false
       ORDER BY created_at DESC LIMIT 30`,
      [sellerId]
    )).rows;

    res.json({
      alerts: [...dynamicAlerts, ...persisted],
      counts: {
        dynamic: dynamicAlerts.length,
        persisted: persisted.length,
        unread: persisted.filter(a => !a.read).length
      }
    });
  } catch (err) {
    console.error('Error alertas:', err);
    res.status(500).json({ message: 'Error al cargar alertas' });
  }
});

router.patch('/me/alerts/:id/dismiss', protect, sellerOrAdmin, async (req, res) => {
  try {
    if (req.params.id.startsWith('dyn-')) return res.json({ ok: true }); // dinámicas no se persisten
    await pool.query('UPDATE seller_alerts SET dismissed = true, read = true WHERE id = $1 AND seller_id = $2',
      [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ message: 'Error' }); }
});

// ─── 8. SECUENCIAS DE FOLLOW-UP ───────────────────────────────────────────────

router.get('/sequences', protect, sellerOrAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT s.*, (SELECT COUNT(*) FROM seller_sequence_runs WHERE sequence_id = s.id AND status = 'ACTIVE') AS active_runs
       FROM seller_sequences s
       WHERE s.seller_id = $1 OR s.seller_id IS NULL
       ORDER BY s.created_at DESC`,
      [req.user.id]
    );
    res.json({ sequences: rows });
  } catch (err) { res.status(500).json({ message: 'Error' }); }
});

router.post('/sequences', protect, sellerOrAdmin, async (req, res) => {
  try {
    const { name, description, steps } = req.body;
    if (!name || !steps || !Array.isArray(steps)) {
      return res.status(400).json({ message: 'Nombre y steps requeridos' });
    }
    const { rows } = await pool.query(
      `INSERT INTO seller_sequences (seller_id, name, description, steps)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, name, description || null, JSON.stringify(steps)]
    );
    res.status(201).json({ sequence: rows[0] });
  } catch (err) {
    console.error('Error sequence:', err);
    res.status(500).json({ message: 'Error al crear secuencia' });
  }
});

router.patch('/sequences/:id', protect, sellerOrAdmin, async (req, res) => {
  try {
    const { name, description, steps, active } = req.body;
    const sets = [], params = [];
    let idx = 1;
    if (name !== undefined) { sets.push(`name = $${idx++}`); params.push(name); }
    if (description !== undefined) { sets.push(`description = $${idx++}`); params.push(description); }
    if (steps !== undefined) { sets.push(`steps = $${idx++}`); params.push(JSON.stringify(steps)); }
    if (active !== undefined) { sets.push(`active = $${idx++}`); params.push(active); }
    if (!sets.length) return res.status(400).json({ message: 'Nada que actualizar' });
    params.push(req.params.id);
    params.push(req.user.id);
    sets.push(`updated_at = NOW()`);
    await pool.query(
      `UPDATE seller_sequences SET ${sets.join(', ')}
       WHERE id = $${idx++} AND (seller_id = $${idx} OR seller_id IS NULL)`,
      params
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ message: 'Error' }); }
});

router.delete('/sequences/:id', protect, sellerOrAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM seller_sequences WHERE id = $1 AND seller_id = $2', [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ message: 'Error' }); }
});

// Enrolar lead en secuencia
router.post('/sequences/:id/enroll', protect, sellerOrAdmin, async (req, res) => {
  try {
    const { lead_id } = req.body;
    if (!lead_id) return res.status(400).json({ message: 'lead_id requerido' });
    const seq = (await pool.query('SELECT * FROM seller_sequences WHERE id = $1', [req.params.id])).rows[0];
    if (!seq) return res.status(404).json({ message: 'Secuencia no encontrada' });
    const firstStep = (seq.steps || [])[0];
    const nextRunAt = new Date();
    if (firstStep?.delay_days) nextRunAt.setDate(nextRunAt.getDate() + firstStep.delay_days);
    const { rows } = await pool.query(
      `INSERT INTO seller_sequence_runs (sequence_id, lead_id, seller_id, current_step, next_run_at)
       VALUES ($1, $2, $3, 0, $4) RETURNING *`,
      [req.params.id, lead_id, req.user.id, nextRunAt]
    );
    res.status(201).json({ run: rows[0] });
  } catch (err) {
    console.error('Error enroll:', err);
    res.status(500).json({ message: 'Error al enrolar' });
  }
});

router.get('/sequences/:id/runs', protect, sellerOrAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.*, l.name AS lead_name FROM seller_sequence_runs r
       LEFT JOIN leads l ON l.id = r.lead_id
       WHERE r.sequence_id = $1 ORDER BY r.started_at DESC LIMIT 100`,
      [req.params.id]
    );
    res.json({ runs: rows });
  } catch (err) { res.status(500).json({ message: 'Error' }); }
});

router.post('/runs/:runId/stop', protect, sellerOrAdmin, async (req, res) => {
  try {
    await pool.query(
      `UPDATE seller_sequence_runs SET status = 'STOPPED', stopped_reason = 'manual', completed_at = NOW()
       WHERE id = $1 AND seller_id = $2`,
      [req.params.runId, req.user.id]
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ message: 'Error' }); }
});

// ─── 9. AGENDA / BOOKING SETTINGS DEL VENDEDOR ────────────────────────────────

router.get('/me/booking', protect, sellerOrAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM seller_booking_settings WHERE seller_id = $1', [req.user.id]);
    res.json({ settings: rows[0] || null });
  } catch (err) { res.status(500).json({ message: 'Error' }); }
});

router.put('/me/booking', protect, sellerOrAdmin, async (req, res) => {
  try {
    const { slug, title, description, duration_min, buffer_min, weekly_hours, timezone, active } = req.body;
    // Genero slug si no viene
    const finalSlug = slug || (req.user.name || 'vendedor').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) + '-' + req.user.id;
    const { rows } = await pool.query(
      `INSERT INTO seller_booking_settings (seller_id, slug, title, description, duration_min, buffer_min, weekly_hours, timezone, active, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       ON CONFLICT (seller_id) DO UPDATE SET
         slug = COALESCE(EXCLUDED.slug, seller_booking_settings.slug),
         title = COALESCE(EXCLUDED.title, seller_booking_settings.title),
         description = COALESCE(EXCLUDED.description, seller_booking_settings.description),
         duration_min = COALESCE(EXCLUDED.duration_min, seller_booking_settings.duration_min),
         buffer_min = COALESCE(EXCLUDED.buffer_min, seller_booking_settings.buffer_min),
         weekly_hours = COALESCE(EXCLUDED.weekly_hours, seller_booking_settings.weekly_hours),
         timezone = COALESCE(EXCLUDED.timezone, seller_booking_settings.timezone),
         active = COALESCE(EXCLUDED.active, seller_booking_settings.active),
         updated_at = NOW()
       RETURNING *`,
      [req.user.id, finalSlug, title || null, description || null,
       duration_min || null, buffer_min || null,
       weekly_hours ? JSON.stringify(weekly_hours) : null, timezone || null,
       active !== undefined ? active : null]
    );
    res.json({ settings: rows[0] });
  } catch (err) {
    console.error('Error booking settings:', err);
    res.status(500).json({ message: 'Error al guardar settings' });
  }
});

router.get('/me/meetings', protect, sellerOrAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT m.*, l.name AS lead_name FROM seller_meetings m
       LEFT JOIN leads l ON l.id = m.lead_id
       WHERE m.seller_id = $1 AND m.starts_at >= NOW() - INTERVAL '7 days'
       ORDER BY m.starts_at ASC LIMIT 50`,
      [req.user.id]
    );
    res.json({ meetings: rows });
  } catch (err) { res.status(500).json({ message: 'Error' }); }
});

// ─── 10. EMAIL TRACKING (private query) ───────────────────────────────────────

router.get('/leads/:id/email-opens', protect, sellerOrAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT eo.*, om.subject FROM seller_email_opens eo
       LEFT JOIN outreach_messages om ON om.id = eo.message_id
       WHERE eo.lead_id = $1 ORDER BY eo.opened_at DESC LIMIT 50`,
      [req.params.id]
    );
    res.json({ opens: rows });
  } catch (err) { res.status(500).json({ message: 'Error' }); }
});

// ─── PUBLIC ROUTER (sin auth) ─────────────────────────────────────────────────

// Pixel tracking 1x1 GIF transparente
const TRANSPARENT_GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

publicRouter.get('/track/o/:trackingId.gif', async (req, res) => {
  res.set('Content-Type', 'image/gif');
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.send(TRANSPARENT_GIF);

  // Grabo apertura en background (no bloqueo la respuesta)
  setImmediate(async () => {
    try {
      const { trackingId } = req.params;
      const msg = (await pool.query(
        'SELECT id, lead_id FROM outreach_messages WHERE tracking_id = $1',
        [trackingId]
      )).rows[0];
      if (!msg) return;
      await pool.query(
        `INSERT INTO seller_email_opens (tracking_id, message_id, lead_id, user_agent, ip)
         VALUES ($1, $2, $3, $4, $5)`,
        [trackingId, msg.id, msg.lead_id, req.headers['user-agent'] || null, req.ip || null]
      );
      // Actualizar status del mensaje a OPENED si era SENT
      await pool.query(
        `UPDATE outreach_messages SET status = 'OPENED', opened_at = NOW()
         WHERE id = $1 AND UPPER(status) = 'SENT'`,
        [msg.id]
      );
    } catch (e) {
      // Silencio el error — no debe afectar la respuesta del pixel
      console.warn('Track open error:', e.message);
    }
  });
});

// Booking público: obtener disponibilidad
publicRouter.get('/booking/:slug', async (req, res) => {
  try {
    const settings = (await pool.query(
      'SELECT * FROM seller_booking_settings WHERE slug = $1 AND active = true',
      [req.params.slug]
    )).rows[0];
    if (!settings) return res.status(404).json({ message: 'Vendedor no disponible' });
    const seller = (await pool.query('SELECT name, email FROM users WHERE id = $1', [settings.seller_id])).rows[0];

    // Slots ocupados próximos 30 días
    const taken = (await pool.query(
      `SELECT starts_at, ends_at FROM seller_meetings
       WHERE seller_id = $1 AND starts_at >= NOW() AND starts_at < NOW() + INTERVAL '30 days'
         AND status != 'CANCELLED'`,
      [settings.seller_id]
    )).rows;

    res.json({
      seller: { name: seller?.name, email: seller?.email },
      settings: {
        title: settings.title,
        description: settings.description,
        duration_min: settings.duration_min,
        buffer_min: settings.buffer_min,
        weekly_hours: settings.weekly_hours,
        timezone: settings.timezone
      },
      taken_slots: taken.map(t => ({ start: t.starts_at, end: t.ends_at }))
    });
  } catch (err) {
    console.error('Error public booking:', err);
    res.status(500).json({ message: 'Error' });
  }
});

publicRouter.post('/booking/:slug', async (req, res) => {
  try {
    const { starts_at, guest_name, guest_email, guest_phone, notes, lead_id } = req.body;
    if (!starts_at || !guest_name || !guest_email) {
      return res.status(400).json({ message: 'Campos requeridos: starts_at, guest_name, guest_email' });
    }
    const settings = (await pool.query(
      'SELECT * FROM seller_booking_settings WHERE slug = $1 AND active = true',
      [req.params.slug]
    )).rows[0];
    if (!settings) return res.status(404).json({ message: 'Vendedor no disponible' });

    const start = new Date(starts_at);
    const end = new Date(start.getTime() + (settings.duration_min || 30) * 60000);

    // Verificar que el slot esté libre
    const conflict = (await pool.query(
      `SELECT id FROM seller_meetings
       WHERE seller_id = $1 AND status != 'CANCELLED'
         AND tstzrange(starts_at, ends_at) && tstzrange($2::timestamp, $3::timestamp)`,
      [settings.seller_id, start, end]
    )).rows;
    if (conflict.length) return res.status(409).json({ message: 'Slot ocupado' });

    const { rows } = await pool.query(
      `INSERT INTO seller_meetings (seller_id, lead_id, guest_name, guest_email, guest_phone, starts_at, ends_at, duration_min, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [settings.seller_id, lead_id || null, guest_name, guest_email, guest_phone || null,
       start, end, settings.duration_min, notes || null]
    );

    // Notificación al vendedor
    try {
      await pool.query(
        `INSERT INTO notifications (type, title, body, lead_id, lead_name, created_at)
         VALUES ('meeting_booked', $1, $2, $3, $4, NOW())`,
        [`Nueva reunión: ${guest_name}`, `${start.toLocaleString('es-AR')} · ${guest_email}`, lead_id || null, guest_name]
      );
    } catch {}

    res.status(201).json({ meeting: rows[0] });
  } catch (err) {
    console.error('Error book meeting:', err);
    res.status(500).json({ message: 'Error al reservar' });
  }
});

export default router;
export { publicRouter };
