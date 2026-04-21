import { pool } from '../../config/database.js';
import { analyzeWithDeepSeek } from '../deepseek.js';

/**
 * Outreach Scoring Service
 *
 * Replaces the binary "replied or not" signal with a numeric score 0-100
 * per outreach message. The score is used by the tuning loop to decide
 * which parameter configurations are actually working.
 *
 * Rubric (higher is better):
 *   100 — lead reached GANADO after this message
 *    80 — lead reached PROPUESTA / NEGOCIACION after this message
 *    60 — lead reached EN_CONVERSACION after this message
 *    50 — replied with positive sentiment (interested, asked questions)
 *    40 — replied with neutral sentiment
 *    20 — replied with negative sentiment (polite rejection / not interested)
 *    10 — opened but never replied (email only)
 *     0 — no reply after the grace window (7 days)
 *  null — too recent to score yet (grace window still open)
 */

const GRACE_DAYS_EMAIL = 7;
const GRACE_DAYS_WHATSAPP = 4;
const SENTIMENT_CACHE = new Map();

class OutreachScoringService {
  async initSchema() {
    await pool.query(`
      ALTER TABLE outreach_messages
        ADD COLUMN IF NOT EXISTS outcome_score INTEGER,
        ADD COLUMN IF NOT EXISTS outcome_reason VARCHAR(40),
        ADD COLUMN IF NOT EXISTS scored_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS reply_sentiment VARCHAR(20),
        ADD COLUMN IF NOT EXISTS params_version_id INTEGER
    `).catch(() => {});
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_outreach_msg_score ON outreach_messages(outcome_score)`).catch(() => {});
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_outreach_msg_scored_at ON outreach_messages(scored_at)`).catch(() => {});
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_outreach_msg_params_version ON outreach_messages(params_version_id)`).catch(() => {});
  }

  /**
   * Classify a reply body with DeepSeek. Returns 'positive' | 'neutral' | 'negative'.
   * Cached per (lead_id, body-hash) in-process so repeated calls don't hit the API.
   */
  async classifyReplySentiment(leadId, replyBody) {
    if (!replyBody || replyBody.length < 3) return 'neutral';
    const key = `${leadId}|${replyBody.slice(0, 200)}`;
    if (SENTIMENT_CACHE.has(key)) return SENTIMENT_CACHE.get(key);

    const prompt = `Clasifica esta respuesta de un lead B2B a un mensaje de prospeccion. Responde UNA palabra: "positive" (interesado, pide info, responde preguntas), "neutral" (acusa recibo sin avanzar, pide tiempo) o "negative" (rechaza, pide que no lo contacten, no interesa).

RESPUESTA DEL LEAD:
${replyBody.slice(0, 600)}

Una palabra:`;

    try {
      const text = await analyzeWithDeepSeek(prompt, 20, { temperature: 0.0 });
      const match = (text || '').toLowerCase().match(/positive|neutral|negative/);
      const result = match ? match[0] : 'neutral';
      SENTIMENT_CACHE.set(key, result);
      if (SENTIMENT_CACHE.size > 500) {
        // keep the map bounded
        const firstKey = SENTIMENT_CACHE.keys().next().value;
        SENTIMENT_CACHE.delete(firstKey);
      }
      return result;
    } catch {
      return 'neutral';
    }
  }

  /**
   * Score a single outreach message using current lead state + replies.
   * Returns { score, reason, sentiment } or null if the message is too young to score.
   */
  async scoreMessage(msg) {
    const channel = (msg.channel || '').toUpperCase();
    const status = (msg.status || '').toUpperCase();
    const grace = channel === 'EMAIL' ? GRACE_DAYS_EMAIL : GRACE_DAYS_WHATSAPP;

    // Failed / bounced messages: fixed low score, not driven by lead state.
    if (status === 'FAILED' || status === 'BOUNCED') {
      return { score: 0, reason: 'FAILED_SEND', sentiment: null };
    }

    // Lead stage — dominant signal. A message that eventually advanced the lead wins.
    const leadStage = (msg.lead_status || '').toUpperCase();
    if (leadStage === 'GANADO') return { score: 100, reason: 'WON', sentiment: 'positive' };
    if (leadStage === 'NEGOCIACION' || leadStage === 'PROPUESTA') {
      return { score: 80, reason: 'QUALIFIED', sentiment: 'positive' };
    }
    if (leadStage === 'EN_CONVERSACION') {
      return { score: 60, reason: 'ENGAGED', sentiment: 'positive' };
    }
    if (leadStage === 'PERDIDO') {
      // Only penalize as "lost" if the lead actually engaged first, else treat as silent.
      const { rows: engagedCheck } = await pool.query(
        `SELECT 1 FROM outreach_messages WHERE lead_id = $1 AND UPPER(status) = 'REPLIED' LIMIT 1`,
        [msg.lead_id]
      ).catch(() => ({ rows: [] }));
      if (engagedCheck.length > 0) {
        return { score: 20, reason: 'LOST_AFTER_REPLY', sentiment: 'negative' };
      }
    }

    // Lead never advanced beyond CONTACTADO. Look at this specific message's reply.
    // Find a reply from this lead that came AFTER this message was sent.
    const sentAt = msg.sent_at || msg.created_at;
    if (!sentAt) return null;

    const { rows: repliesAfter } = await pool.query(
      `SELECT body, sent_at, created_at
       FROM outreach_messages
       WHERE lead_id = $1
         AND UPPER(channel) = $2
         AND UPPER(status) = 'REPLIED'
         AND COALESCE(sent_at, created_at) > $3
       ORDER BY COALESCE(sent_at, created_at) ASC
       LIMIT 1`,
      [msg.lead_id, channel, sentAt]
    ).catch(() => ({ rows: [] }));

    if (repliesAfter.length > 0) {
      const reply = repliesAfter[0];
      const sentiment = await this.classifyReplySentiment(msg.lead_id, reply.body || '');
      const score = sentiment === 'positive' ? 50 : sentiment === 'neutral' ? 40 : 20;
      return { score, reason: `REPLY_${sentiment.toUpperCase()}`, sentiment };
    }

    // No reply. Check the grace window: if recent, don't score yet.
    const ageMs = Date.now() - new Date(sentAt).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    if (ageDays < grace) return null;

    // Past grace: if email and it was opened, small positive signal.
    if (channel === 'EMAIL' && msg.opened_at) {
      return { score: 10, reason: 'OPENED_NO_REPLY', sentiment: null };
    }

    return { score: 0, reason: 'SILENT', sentiment: null };
  }

  /**
   * Score messages that are eligible:
   *  - never scored, OR
   *  - their lead's status has changed since they were scored (re-score opportunity).
   * Processes a batch on each run so one pass doesn't block for minutes.
   */
  async scoreBatch({ limit = 50 } = {}) {
    await this.initSchema();

    // Pick unscored first (oldest SENT messages past the minimum wait).
    // Plus: re-score leads whose stage has advanced since the last scoring.
    const { rows: candidates } = await pool.query(`
      SELECT
        om.id, om.lead_id, om.channel, om.status, om.sent_at, om.created_at, om.opened_at,
        UPPER(COALESCE(l.status, 'NUEVO')) AS lead_status,
        l.updated_at AS lead_updated_at
      FROM outreach_messages om
      LEFT JOIN leads l ON l.id = om.lead_id
      WHERE om.lead_id IS NOT NULL
        AND om.channel IS NOT NULL
        AND UPPER(COALESCE(om.status,'')) NOT IN ('SCHEDULED','PENDING','GENERATED','REPLIED')
        AND COALESCE(om.sent_at, om.created_at) IS NOT NULL
        AND COALESCE(om.sent_at, om.created_at) > NOW() - INTERVAL '180 days'
        AND (
          om.outcome_score IS NULL
          OR (l.updated_at IS NOT NULL AND om.scored_at IS NOT NULL AND l.updated_at > om.scored_at)
        )
      ORDER BY COALESCE(om.sent_at, om.created_at) ASC
      LIMIT $1
    `, [limit]).catch(() => ({ rows: [] }));

    let scored = 0, skipped = 0;
    for (const msg of candidates) {
      try {
        const result = await this.scoreMessage(msg);
        if (!result) { skipped++; continue; }
        await pool.query(
          `UPDATE outreach_messages
             SET outcome_score = $1,
                 outcome_reason = $2,
                 reply_sentiment = $3,
                 scored_at = NOW()
           WHERE id = $4`,
          [result.score, result.reason, result.sentiment || null, msg.id]
        );
        scored++;
      } catch (err) {
        skipped++;
        console.error('[OutreachScoring] Failed to score', msg.id, err.message);
      }
    }

    return { scored, skipped, considered: candidates.length };
  }

  /**
   * Aggregate scoring stats by (channel, sector, params_version_id).
   * Used by the tuning loop to decide who is winning.
   */
  async statsByBucket() {
    const { rows } = await pool.query(`
      SELECT
        UPPER(om.channel) AS channel,
        COALESCE(NULLIF(l.sector, ''), 'default') AS sector,
        om.params_version_id,
        COUNT(*) FILTER (WHERE om.outcome_score IS NOT NULL) AS scored_count,
        AVG(om.outcome_score) FILTER (WHERE om.outcome_score IS NOT NULL) AS avg_score,
        COUNT(*) FILTER (WHERE om.outcome_score >= 50) AS wins,
        COUNT(*) FILTER (WHERE om.outcome_score = 0 OR om.outcome_score = 20) AS losses
      FROM outreach_messages om
      LEFT JOIN leads l ON l.id = om.lead_id
      WHERE om.outcome_score IS NOT NULL
      GROUP BY UPPER(om.channel), COALESCE(NULLIF(l.sector, ''), 'default'), om.params_version_id
    `).catch(() => ({ rows: [] }));
    return rows.map(r => ({
      channel: r.channel,
      sector: r.sector,
      params_version_id: r.params_version_id,
      scored_count: parseInt(r.scored_count) || 0,
      avg_score: r.avg_score != null ? +parseFloat(r.avg_score).toFixed(2) : null,
      wins: parseInt(r.wins) || 0,
      losses: parseInt(r.losses) || 0,
    }));
  }

  /**
   * Overall scoring metrics for the frontend.
   */
  async summary() {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE outcome_score IS NOT NULL) AS scored,
        COUNT(*) FILTER (WHERE outcome_score IS NULL) AS pending,
        AVG(outcome_score) FILTER (WHERE outcome_score IS NOT NULL) AS avg_score,
        COUNT(*) FILTER (WHERE outcome_score = 100) AS won,
        COUNT(*) FILTER (WHERE outcome_score = 80) AS qualified,
        COUNT(*) FILTER (WHERE outcome_score = 60) AS engaged,
        COUNT(*) FILTER (WHERE outcome_score = 50) AS positive_reply,
        COUNT(*) FILTER (WHERE outcome_score = 40) AS neutral_reply,
        COUNT(*) FILTER (WHERE outcome_score = 20) AS negative_reply,
        COUNT(*) FILTER (WHERE outcome_score = 10) AS opened_no_reply,
        COUNT(*) FILTER (WHERE outcome_score = 0) AS silent
      FROM outreach_messages
    `).catch(() => ({ rows: [{}] }));
    const r = rows[0] || {};
    return {
      scored: parseInt(r.scored) || 0,
      pending: parseInt(r.pending) || 0,
      avg_score: r.avg_score != null ? +parseFloat(r.avg_score).toFixed(1) : 0,
      buckets: {
        won: parseInt(r.won) || 0,
        qualified: parseInt(r.qualified) || 0,
        engaged: parseInt(r.engaged) || 0,
        positive_reply: parseInt(r.positive_reply) || 0,
        neutral_reply: parseInt(r.neutral_reply) || 0,
        negative_reply: parseInt(r.negative_reply) || 0,
        opened_no_reply: parseInt(r.opened_no_reply) || 0,
        silent: parseInt(r.silent) || 0,
      },
    };
  }
}

export const outreachScoring = new OutreachScoringService();
export default outreachScoring;
