import { pool } from '../../config/database.js';
import { analyzeWithDeepSeek } from '../deepseek.js';

/**
 * Outreach Learning Service
 *
 * Closed-loop feedback system:
 *   1. Pulls every outreach_message we ever sent + the eventual lead outcome.
 *   2. Computes hard metrics (reply rate, conversion rate, by channel/sector/length).
 *   3. Asks DeepSeek to compare REPLIED/WON messages vs ignored ones and write a
 *      concise "playbook" of what is actually working right now.
 *   4. Saves the playbook + metrics in `outreach_playbook` (versioned).
 *   5. The active playbook is then injected as extra system prompt in the email
 *      and WhatsApp generators, so every new message benefits from the learnings.
 */

let activePlaybookCache = null;
let activePlaybookCacheAt = 0;
const CACHE_TTL_MS = 60_000; // 1 min — playbook is refreshed at most once a minute when read by senders

class OutreachLearningService {
  async initTable() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS outreach_playbook (
        id SERIAL PRIMARY KEY,
        version INTEGER NOT NULL,
        playbook TEXT NOT NULL,
        metrics JSONB NOT NULL DEFAULT '{}',
        sample_size INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        generated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `).catch(() => {});
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_outreach_playbook_active ON outreach_playbook(is_active, generated_at DESC)`).catch(() => {});
  }

  /**
   * Compute the raw metrics that drive the playbook.
   * Everything is derived from outreach_messages joined to leads.
   */
  async computeMetrics() {
    // Per-channel counts
    const { rows: byChannel } = await pool.query(`
      SELECT
        UPPER(channel) AS channel,
        COUNT(*) FILTER (WHERE UPPER(status) = 'SENT')                         AS sent,
        COUNT(*) FILTER (WHERE UPPER(status) = 'REPLIED')                      AS replied,
        COUNT(*) FILTER (WHERE UPPER(status) IN ('FAILED','BOUNCED'))          AS failed
      FROM outreach_messages
      WHERE channel IS NOT NULL
      GROUP BY UPPER(channel)
    `).catch(() => ({ rows: [] }));

    // Reply rate by sector (only sectors with at least 5 sent)
    const { rows: bySector } = await pool.query(`
      SELECT
        COALESCE(NULLIF(l.sector, ''), 'sin_sector') AS sector,
        COUNT(*)                                       AS sent,
        COUNT(*) FILTER (WHERE UPPER(om.status) = 'REPLIED') AS replied
      FROM outreach_messages om
      JOIN leads l ON l.id = om.lead_id
      WHERE om.lead_id IS NOT NULL AND UPPER(om.status) IN ('SENT','REPLIED')
      GROUP BY COALESCE(NULLIF(l.sector, ''), 'sin_sector')
      HAVING COUNT(*) >= 5
      ORDER BY (COUNT(*) FILTER (WHERE UPPER(om.status) = 'REPLIED'))::float / COUNT(*) DESC
      LIMIT 20
    `).catch(() => ({ rows: [] }));

    // Reply rate by message length bucket
    const { rows: byLength } = await pool.query(`
      SELECT
        CASE
          WHEN LENGTH(body) < 200 THEN 'short (<200)'
          WHEN LENGTH(body) < 400 THEN 'medium (200-400)'
          WHEN LENGTH(body) < 700 THEN 'long (400-700)'
          ELSE 'very_long (>700)'
        END AS bucket,
        COUNT(*) AS sent,
        COUNT(*) FILTER (WHERE UPPER(status) = 'REPLIED') AS replied
      FROM outreach_messages
      WHERE body IS NOT NULL AND UPPER(status) IN ('SENT','REPLIED')
      GROUP BY 1
      ORDER BY 1
    `).catch(() => ({ rows: [] }));

    // Funnel — leads that received at least one message vs each downstream stage
    const { rows: funnelRows } = await pool.query(`
      SELECT
        COUNT(DISTINCT om.lead_id) AS contacted,
        COUNT(DISTINCT om.lead_id) FILTER (WHERE UPPER(l.status) IN ('EN_CONVERSACION','PROPUESTA','NEGOCIACION','GANADO')) AS engaged,
        COUNT(DISTINCT om.lead_id) FILTER (WHERE UPPER(l.status) IN ('PROPUESTA','NEGOCIACION','GANADO'))                  AS qualified,
        COUNT(DISTINCT om.lead_id) FILTER (WHERE UPPER(l.status) = 'GANADO')                                                AS won
      FROM outreach_messages om
      JOIN leads l ON l.id = om.lead_id
      WHERE om.lead_id IS NOT NULL
    `).catch(() => ({ rows: [{}] }));
    const funnel = funnelRows[0] || {};

    // Totals + reply rates per channel
    const channels = {};
    let totalSent = 0, totalReplied = 0;
    for (const r of byChannel) {
      const sent = parseInt(r.sent) || 0;
      const replied = parseInt(r.replied) || 0;
      channels[r.channel] = {
        sent,
        replied,
        failed: parseInt(r.failed) || 0,
        reply_rate: sent ? +(replied / sent * 100).toFixed(1) : 0,
      };
      totalSent += sent;
      totalReplied += replied;
    }

    return {
      generated_at: new Date().toISOString(),
      total: {
        sent: totalSent,
        replied: totalReplied,
        reply_rate: totalSent ? +(totalReplied / totalSent * 100).toFixed(1) : 0,
      },
      channels,
      by_sector: bySector.map(r => ({
        sector: r.sector,
        sent: parseInt(r.sent),
        replied: parseInt(r.replied),
        reply_rate: +((parseInt(r.replied) / parseInt(r.sent)) * 100).toFixed(1),
      })),
      by_length: byLength.map(r => ({
        bucket: r.bucket,
        sent: parseInt(r.sent),
        replied: parseInt(r.replied),
        reply_rate: +((parseInt(r.replied) / parseInt(r.sent)) * 100).toFixed(1),
      })),
      funnel: {
        contacted: parseInt(funnel.contacted) || 0,
        engaged: parseInt(funnel.engaged) || 0,
        qualified: parseInt(funnel.qualified) || 0,
        won: parseInt(funnel.won) || 0,
      },
    };
  }

  /**
   * Pull a sample of message bodies for the LLM: top performers (REPLIED) and
   * silent ones (SENT but no reply for >3 days). Caps the sample so the prompt
   * stays a reasonable size.
   */
  async sampleMessages(limit = 30) {
    const { rows: winners } = await pool.query(`
      SELECT om.channel, om.body, om.subject, l.sector, l.name AS company, UPPER(l.status) AS lead_status
      FROM outreach_messages om
      JOIN leads l ON l.id = om.lead_id
      WHERE UPPER(om.status) = 'REPLIED' AND om.body IS NOT NULL
      ORDER BY om.replied_at DESC NULLS LAST
      LIMIT $1
    `, [limit]).catch(() => ({ rows: [] }));

    const { rows: silent } = await pool.query(`
      SELECT om.channel, om.body, om.subject, l.sector, l.name AS company
      FROM outreach_messages om
      JOIN leads l ON l.id = om.lead_id
      WHERE UPPER(om.status) = 'SENT'
        AND om.body IS NOT NULL
        AND om.sent_at < NOW() - INTERVAL '3 days'
        AND NOT EXISTS (
          SELECT 1 FROM outreach_messages om2
          WHERE om2.lead_id = om.lead_id AND UPPER(om2.status) = 'REPLIED'
        )
      ORDER BY om.sent_at DESC
      LIMIT $1
    `, [limit]).catch(() => ({ rows: [] }));

    return { winners, silent };
  }

  /**
   * Build a playbook by feeding metrics + sample messages to DeepSeek.
   * Falls back to a deterministic summary built from metrics if the LLM fails.
   */
  async generatePlaybook(metrics, samples) {
    const truncate = (s, n = 350) => (s || '').replace(/\s+/g, ' ').slice(0, n);

    const winnersText = samples.winners.slice(0, 15).map((m, i) =>
      `${i + 1}. [${m.channel}] sector=${m.sector || 'n/a'}\n   subject: ${truncate(m.subject, 100)}\n   body: ${truncate(m.body)}`
    ).join('\n\n');

    const silentText = samples.silent.slice(0, 15).map((m, i) =>
      `${i + 1}. [${m.channel}] sector=${m.sector || 'n/a'}\n   subject: ${truncate(m.subject, 100)}\n   body: ${truncate(m.body)}`
    ).join('\n\n');

    const sectorTop = metrics.by_sector.slice(0, 5).map(s => `${s.sector} (${s.reply_rate}%)`).join(', ') || 'n/a';
    const sectorBot = [...metrics.by_sector].reverse().slice(0, 5).map(s => `${s.sector} (${s.reply_rate}%)`).join(', ') || 'n/a';
    const lengthLine = metrics.by_length.map(b => `${b.bucket}: ${b.reply_rate}%`).join(' | ') || 'n/a';

    const prompt = `Sos un coach de outreach comercial B2B. Te paso datos REALES de campañas pasadas y tenes que devolver un PLAYBOOK breve, accionable y especifico, en espanol argentino, que un generador de mensajes IA va a inyectar como parte de su system prompt para todos los proximos mensajes.

METRICAS GLOBALES
- Mensajes enviados: ${metrics.total.sent}
- Tasa de respuesta global: ${metrics.total.reply_rate}%
- Email: ${metrics.channels.EMAIL?.sent || 0} enviados, ${metrics.channels.EMAIL?.reply_rate || 0}% respuesta
- WhatsApp: ${metrics.channels.WHATSAPP?.sent || 0} enviados, ${metrics.channels.WHATSAPP?.reply_rate || 0}% respuesta
- Embudo: ${metrics.funnel.contacted} contactados → ${metrics.funnel.engaged} en conversacion → ${metrics.funnel.qualified} calificados → ${metrics.funnel.won} ganados
- Sectores que MAS responden: ${sectorTop}
- Sectores que MENOS responden: ${sectorBot}
- Longitud vs respuesta: ${lengthLine}

MENSAJES QUE GENERARON RESPUESTA (${samples.winners.length})
${winnersText || '(sin datos aun)'}

MENSAJES QUE NO RECIBIERON RESPUESTA (${samples.silent.length})
${silentText || '(sin datos aun)'}

INSTRUCCIONES
Devolve EXACTAMENTE este formato (sin titulos extra, sin JSON, sin markdown raro):

LO QUE FUNCIONA:
- 4 a 6 bullets concretos extraidos de los mensajes ganadores. Cada bullet menciona el patron observable (ej: "abrir con una observacion especifica del rubro del lead") y opcionalmente un mini-ejemplo entre comillas.

LO QUE EVITAR:
- 3 a 5 bullets concretos extraidos de los mensajes silenciosos. Patrones a no repetir (ej: "frases genericas de 'somos lideres en'").

LONGITUD IDEAL:
- 1 linea con la longitud que mejor performa segun los datos.

SECTORES PRIORITARIOS:
- 1 linea listando los sectores top y por que el mensaje deberia adaptarse a ellos.

Maximo 250 palabras totales. Sin emojis. Sin asteriscos de markdown. Sin bloques de codigo.`;

    try {
      const text = await analyzeWithDeepSeek(prompt, 1200);
      const cleaned = (text || '').trim();
      if (cleaned.length > 50) return cleaned;
    } catch (err) {
      console.error('[OutreachLearning] DeepSeek failed:', err.message);
    }

    // Fallback: deterministic mini playbook from metrics
    const bestLen = [...metrics.by_length].sort((a, b) => b.reply_rate - a.reply_rate)[0];
    return [
      'LO QUE FUNCIONA:',
      `- Mensajes en sectores con mayor tasa de respuesta: ${sectorTop}.`,
      '- Mantener un tono natural argentino, sin formulas vendedoras.',
      '- Personalizar con el rubro real del lead en la primera linea.',
      '',
      'LO QUE EVITAR:',
      '- Frases genericas tipo "somos lideres" o "soluciones a medida".',
      '- Pedir reunion en el primer mensaje sin antes generar curiosidad.',
      '',
      `LONGITUD IDEAL: ${bestLen ? bestLen.bucket : 'short (<200)'} (mejor tasa observada).`,
      `SECTORES PRIORITARIOS: ${sectorTop}`,
    ].join('\n');
  }

  /**
   * Full regeneration cycle. Returns the new playbook row.
   * Marks all previous playbooks as inactive.
   */
  async regenerate() {
    await this.initTable();

    const metrics = await this.computeMetrics();
    const samples = await this.sampleMessages();
    const playbook = await this.generatePlaybook(metrics, samples);

    const sampleSize = (samples.winners?.length || 0) + (samples.silent?.length || 0);

    // Find next version
    const { rows: vRows } = await pool.query(`SELECT COALESCE(MAX(version), 0) AS v FROM outreach_playbook`)
      .catch(() => ({ rows: [{ v: 0 }] }));
    const nextVersion = (parseInt(vRows[0]?.v) || 0) + 1;

    await pool.query(`UPDATE outreach_playbook SET is_active = false WHERE is_active = true`).catch(() => {});

    const { rows } = await pool.query(
      `INSERT INTO outreach_playbook (version, playbook, metrics, sample_size, is_active)
       VALUES ($1, $2, $3, $4, true) RETURNING *`,
      [nextVersion, playbook, JSON.stringify(metrics), sampleSize]
    );

    // Bust the cache so the new playbook is picked up immediately
    activePlaybookCache = null;
    activePlaybookCacheAt = 0;

    return rows[0];
  }

  /**
   * Returns the active playbook row, or null if none has been generated yet.
   * Cached for 60s.
   */
  async getActive() {
    const now = Date.now();
    if (activePlaybookCache && now - activePlaybookCacheAt < CACHE_TTL_MS) {
      return activePlaybookCache;
    }
    await this.initTable();
    const { rows } = await pool.query(
      `SELECT * FROM outreach_playbook WHERE is_active = true ORDER BY generated_at DESC LIMIT 1`
    ).catch(() => ({ rows: [] }));
    activePlaybookCache = rows[0] || null;
    activePlaybookCacheAt = now;
    return activePlaybookCache;
  }

  /**
   * Convenience for message generators: returns just the playbook text (or '').
   */
  async getActivePlaybookText() {
    const row = await this.getActive();
    return row?.playbook || '';
  }
}

export const outreachLearning = new OutreachLearningService();
export default outreachLearning;
