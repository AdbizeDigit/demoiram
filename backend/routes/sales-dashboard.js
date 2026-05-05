import { Router } from 'express';
import { protect, adminOnly, sellerOrAdmin } from '../middleware/auth.js';
import { pool } from '../config/database.js';

const router = Router();
const leadsRouter = Router();
router.use(protect, sellerOrAdmin);
leadsRouter.use(protect, sellerOrAdmin);

const ACTIVE_STAGES = ['CONTACTADO', 'EN_CONVERSACION', 'PROPUESTA', 'NEGOCIACION'];
const STAGE_ORDER = ['NUEVO', 'CONTACTADO', 'EN_CONVERSACION', 'PROPUESTA', 'NEGOCIACION', 'GANADO', 'PERDIDO'];
const NEW_ALIASES = ['NUEVO', 'NEW', 'PENDING', ''];

function pct(n, d) { return d > 0 ? +((n / d) * 100).toFixed(1) : 0; }
function normalizeStage(s) {
  if (!s) return 'NUEVO';
  const u = String(s).toUpperCase().replace(/\s+/g, '_');
  if (NEW_ALIASES.includes(u)) return 'NUEVO';
  return u;
}

/**
 * GET /api/dashboard/sales-metrics
 * Everything the frontend needs to render the sales dashboard, shaped to match
 * the UI. All computations are pooled into a few parallel queries for speed.
 */
router.get('/sales-metrics', async (req, res) => {
  try {
    const [
      contactedToday,
      contactedYesterday,
      totalSent,
      totalReplied,
      sent7d, replied7d, sent14to7d, replied14to7d,
      activeConvos,
      wonMonth,
      pipelineValue,
      wonPerdidoCount,
      avgReplyTime,
      dailyByChannel,
      hourlyRate,
      funnelRows,
      sectorRows,
      channelsRows,
      recentRepliesRows,
      topPriorityRows,
      inactiveRows,
      recentWinsRows,
      coachSummary,
      coachActiveVersions,
    ] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM outreach_messages WHERE sent_at >= CURRENT_DATE AND UPPER(status) = 'SENT'"),
      pool.query("SELECT COUNT(*) FROM outreach_messages WHERE sent_at >= CURRENT_DATE - 1 AND sent_at < CURRENT_DATE AND UPPER(status) = 'SENT'"),
      pool.query("SELECT COUNT(*) FROM outreach_messages WHERE UPPER(status) = 'SENT'"),
      pool.query("SELECT COUNT(*) FROM outreach_messages WHERE UPPER(status) = 'REPLIED'"),
      pool.query("SELECT COUNT(*) FROM outreach_messages WHERE sent_at >= NOW() - INTERVAL '7 days' AND UPPER(status) = 'SENT'"),
      pool.query("SELECT COUNT(*) FROM outreach_messages WHERE sent_at >= NOW() - INTERVAL '7 days' AND UPPER(status) = 'REPLIED'"),
      pool.query("SELECT COUNT(*) FROM outreach_messages WHERE sent_at >= NOW() - INTERVAL '14 days' AND sent_at < NOW() - INTERVAL '7 days' AND UPPER(status) = 'SENT'"),
      pool.query("SELECT COUNT(*) FROM outreach_messages WHERE sent_at >= NOW() - INTERVAL '14 days' AND sent_at < NOW() - INTERVAL '7 days' AND UPPER(status) = 'REPLIED'"),
      pool.query("SELECT COUNT(*) FROM leads WHERE UPPER(status) = 'EN_CONVERSACION'"),
      pool.query("SELECT COUNT(*) AS c, COALESCE(SUM(COALESCE(score, 0) * 100), 0) AS v FROM leads WHERE UPPER(status) = 'GANADO' AND updated_at >= date_trunc('month', CURRENT_DATE)"),
      pool.query(`SELECT COALESCE(SUM(COALESCE(score, 0) * 100), 0) AS v FROM leads WHERE UPPER(status) IN ('CONTACTADO','EN_CONVERSACION','PROPUESTA','NEGOCIACION')`),
      pool.query(`SELECT
        COUNT(*) FILTER (WHERE UPPER(status) = 'GANADO') AS won,
        COUNT(*) FILTER (WHERE UPPER(status) = 'PERDIDO') AS lost
        FROM leads`),
      // Median-ish: avg hours between first SENT and first REPLIED per lead, in the last 30d
      pool.query(`
        WITH pairs AS (
          SELECT om.lead_id,
            MIN(om.sent_at) FILTER (WHERE UPPER(om.status) = 'SENT') AS first_sent,
            MIN(om.sent_at) FILTER (WHERE UPPER(om.status) = 'REPLIED') AS first_reply
          FROM outreach_messages om
          WHERE om.lead_id IS NOT NULL
            AND om.sent_at >= NOW() - INTERVAL '30 days'
          GROUP BY om.lead_id
        )
        SELECT AVG(EXTRACT(EPOCH FROM (first_reply - first_sent)) / 3600.0) AS avg_hours
        FROM pairs
        WHERE first_sent IS NOT NULL AND first_reply IS NOT NULL AND first_reply > first_sent
      `),
      // Daily breakdown by channel, last 14 days
      pool.query(`
        SELECT DATE(sent_at) AS day, UPPER(channel) AS channel, COUNT(*) AS c
        FROM outreach_messages
        WHERE sent_at >= CURRENT_DATE - INTERVAL '13 days'
          AND UPPER(status) IN ('SENT', 'REPLIED', 'OPENED', 'FAILED')
          AND channel IS NOT NULL
        GROUP BY DATE(sent_at), UPPER(channel)
        ORDER BY day
      `),
      // Reply rate per hour of day (0-23). Only buckets with a meaningful number of sends.
      pool.query(`
        SELECT EXTRACT(HOUR FROM sent_at)::int AS hour,
          COUNT(*) FILTER (WHERE UPPER(status) IN ('SENT','REPLIED','OPENED')) AS sent,
          COUNT(*) FILTER (WHERE UPPER(status) = 'REPLIED') AS replied
        FROM outreach_messages
        WHERE sent_at IS NOT NULL AND sent_at >= NOW() - INTERVAL '60 days'
        GROUP BY EXTRACT(HOUR FROM sent_at)
        ORDER BY hour
      `),
      // Funnel by normalized stage
      pool.query(`
        SELECT UPPER(COALESCE(NULLIF(status,''), 'NUEVO')) AS stage, COUNT(*) AS c
        FROM leads GROUP BY UPPER(COALESCE(NULLIF(status,''), 'NUEVO'))
      `),
      // Top sectors by reply rate with at least 5 sends
      pool.query(`
        SELECT
          COALESCE(NULLIF(l.sector,''), 'sin_sector') AS sector,
          COUNT(om.*) AS sent,
          COUNT(om.*) FILTER (WHERE UPPER(om.status) = 'REPLIED') AS replied,
          COUNT(DISTINCT om.lead_id) FILTER (WHERE UPPER(l.status) = 'GANADO') AS won
        FROM outreach_messages om
        JOIN leads l ON l.id = om.lead_id
        WHERE UPPER(om.status) IN ('SENT','REPLIED')
        GROUP BY COALESCE(NULLIF(l.sector,''), 'sin_sector')
        HAVING COUNT(om.*) >= 5
        ORDER BY (COUNT(om.*) FILTER (WHERE UPPER(om.status) = 'REPLIED'))::float / COUNT(om.*) DESC
        LIMIT 10
      `),
      // Per-channel breakdown
      pool.query(`
        SELECT UPPER(channel) AS channel,
          COUNT(*) FILTER (WHERE UPPER(status) IN ('SENT','REPLIED','OPENED')) AS sent,
          COUNT(*) FILTER (WHERE UPPER(status) = 'REPLIED') AS replied,
          AVG(outcome_score) FILTER (WHERE outcome_score IS NOT NULL) AS avg_score
        FROM outreach_messages
        WHERE channel IS NOT NULL
        GROUP BY UPPER(channel)
      `),
      // Recent replies — prefer incoming reply rows (step 0 / status REPLIED), decorate with sentiment from scoring
      pool.query(`
        SELECT om.id, om.body AS message, om.subject, om.channel,
               COALESCE(om.replied_at, om.sent_at, om.created_at) AS date,
               om.lead_id,
               l.name AS lead_name, l.sector AS lead_sector,
               (
                 SELECT om2.reply_sentiment FROM outreach_messages om2
                 WHERE om2.lead_id = om.lead_id
                   AND om2.reply_sentiment IS NOT NULL
                   AND om2.sent_at < COALESCE(om.replied_at, om.sent_at, om.created_at)
                 ORDER BY om2.sent_at DESC LIMIT 1
               ) AS sentiment
        FROM outreach_messages om
        LEFT JOIN leads l ON l.id = om.lead_id
        WHERE UPPER(om.status) = 'REPLIED'
        ORDER BY COALESCE(om.replied_at, om.sent_at, om.created_at) DESC
        LIMIT 20
      `),
      // Top-priority leads: active stages, highest score, recent
      pool.query(`
        SELECT l.id, l.name, l.sector, l.city, l.email, l.phone, l.score,
               UPPER(l.status) AS stage,
               l.updated_at,
               (SELECT MAX(sent_at) FROM outreach_messages WHERE lead_id = l.id) AS last_activity,
               EXTRACT(DAY FROM (NOW() - l.updated_at))::int AS days_in_stage
        FROM leads l
        WHERE UPPER(l.status) = ANY($1)
        ORDER BY l.score DESC NULLS LAST, l.updated_at DESC
        LIMIT 12
      `, [ACTIVE_STAGES]),
      // Inactive leads: EN_CONVERSACION/PROPUESTA/NEGOCIACION with no activity in 3+ days
      pool.query(`
        SELECT l.id, l.name, l.email, l.phone, UPPER(l.status) AS stage,
               (SELECT MAX(sent_at) FROM outreach_messages WHERE lead_id = l.id) AS last_activity,
               (SELECT body FROM outreach_messages WHERE lead_id = l.id ORDER BY COALESCE(sent_at, created_at) DESC LIMIT 1) AS last_message,
               EXTRACT(DAY FROM (NOW() - (SELECT MAX(sent_at) FROM outreach_messages WHERE lead_id = l.id)))::int AS days_inactive
        FROM leads l
        WHERE UPPER(l.status) IN ('EN_CONVERSACION','PROPUESTA','NEGOCIACION')
          AND (SELECT MAX(sent_at) FROM outreach_messages WHERE lead_id = l.id) < NOW() - INTERVAL '3 days'
        ORDER BY (SELECT MAX(sent_at) FROM outreach_messages WHERE lead_id = l.id) ASC NULLS LAST
        LIMIT 12
      `),
      // Recent wins (last 60d)
      pool.query(`
        SELECT l.id, l.name, l.sector, l.city, l.updated_at AS won_at,
               COALESCE(l.score, 0) * 100 AS value
        FROM leads l
        WHERE UPPER(l.status) = 'GANADO' AND l.updated_at >= NOW() - INTERVAL '60 days'
        ORDER BY l.updated_at DESC
        LIMIT 10
      `),
      // Coach scoring summary
      pool.query(`
        SELECT COUNT(*) FILTER (WHERE outcome_score IS NOT NULL) AS scored,
               COUNT(*) FILTER (WHERE outcome_score IS NULL AND UPPER(status) IN ('SENT','OPENED','FAILED','BOUNCED')) AS pending,
               AVG(outcome_score) FILTER (WHERE outcome_score IS NOT NULL) AS avg_score
        FROM outreach_messages
      `),
      pool.query(`SELECT COUNT(*) AS c FROM outreach_params WHERE is_active = true`).catch(() => ({ rows: [{ c: 0 }] })),
    ]);

    // KPIs + trends
    const cToday = parseInt(contactedToday.rows[0].count) || 0;
    const cYesterday = parseInt(contactedYesterday.rows[0].count) || 0;
    const contactedTrend = cYesterday > 0 ? +(((cToday - cYesterday) / cYesterday) * 100).toFixed(1) : (cToday > 0 ? 100 : 0);

    const sent = parseInt(totalSent.rows[0].count) || 0;
    const replied = parseInt(totalReplied.rows[0].count) || 0;
    const responseRate = pct(replied, sent);
    const s7 = parseInt(sent7d.rows[0].count) || 0;
    const r7 = parseInt(replied7d.rows[0].count) || 0;
    const s14 = parseInt(sent14to7d.rows[0].count) || 0;
    const r14 = parseInt(replied14to7d.rows[0].count) || 0;
    const rate7 = pct(r7, s7);
    const rate14 = pct(r14, s14);
    const responseRateTrend = rate14 > 0 ? +(rate7 - rate14).toFixed(1) : 0;

    const wonMonthRow = wonMonth.rows[0] || {};
    const wpCount = wonPerdidoCount.rows[0] || { won: 0, lost: 0 };
    const wTotal = (parseInt(wpCount.won) || 0) + (parseInt(wpCount.lost) || 0);
    const conversionRate = wTotal > 0 ? pct(parseInt(wpCount.won) || 0, wTotal) : 0;
    const avgHours = avgReplyTime.rows[0]?.avg_hours != null ? +parseFloat(avgReplyTime.rows[0].avg_hours).toFixed(1) : null;

    // Daily contacts — pivot the (day, channel, c) rows into one row per day
    const daysIndex = {};
    const today = new Date(); today.setHours(0, 0, 0, 0);
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      daysIndex[key] = { date: key, email: 0, whatsapp: 0, total: 0 };
    }
    for (const r of dailyByChannel.rows) {
      const key = new Date(r.day).toISOString().slice(0, 10);
      if (!daysIndex[key]) continue;
      const ch = (r.channel || '').toLowerCase();
      const c = parseInt(r.c) || 0;
      if (ch === 'email') daysIndex[key].email += c;
      else if (ch === 'whatsapp') daysIndex[key].whatsapp += c;
      daysIndex[key].total += c;
    }
    const dailyContacts = Object.values(daysIndex);

    // Hourly response rate 0-23
    const hourMap = {};
    for (let h = 0; h < 24; h++) hourMap[h] = { hour: h, sent: 0, replied: 0, rate: 0 };
    for (const r of hourlyRate.rows) {
      const h = r.hour;
      hourMap[h].sent = parseInt(r.sent) || 0;
      hourMap[h].replied = parseInt(r.replied) || 0;
      hourMap[h].rate = pct(hourMap[h].replied, hourMap[h].sent);
    }
    const hourlyResponse = Object.values(hourMap);

    // Funnel — complete with zeros for missing stages, compute conversion from prev stage
    const funnelMap = {};
    for (const s of STAGE_ORDER) funnelMap[s] = 0;
    for (const r of funnelRows.rows) {
      const s = normalizeStage(r.stage);
      if (funnelMap[s] != null) funnelMap[s] += parseInt(r.c) || 0;
    }
    const funnel = [];
    let prev = null;
    for (const s of STAGE_ORDER) {
      const count = funnelMap[s] || 0;
      const fromPrev = prev && prev > 0 ? pct(count, prev) : null;
      funnel.push({ stage: s, count, fromPrev });
      prev = count;
    }

    // Sectors
    const sectors = sectorRows.rows.map(r => ({
      sector: r.sector,
      sent: parseInt(r.sent) || 0,
      replied: parseInt(r.replied) || 0,
      won: parseInt(r.won) || 0,
      replyRate: pct(parseInt(r.replied) || 0, parseInt(r.sent) || 0),
    }));

    // Channels
    const channels = {};
    for (const r of channelsRows.rows) {
      const sentN = parseInt(r.sent) || 0;
      const rep = parseInt(r.replied) || 0;
      channels[r.channel] = {
        sent: sentN,
        replied: rep,
        replyRate: pct(rep, sentN),
        avgScore: r.avg_score != null ? +parseFloat(r.avg_score).toFixed(1) : null,
      };
    }

    const recentReplies = recentRepliesRows.rows.map(r => ({
      id: r.id,
      leadId: r.lead_id,
      leadName: r.lead_name || 'Lead',
      leadSector: r.lead_sector,
      message: r.message || '',
      subject: r.subject || '',
      channel: (r.channel || '').toLowerCase(),
      date: r.date,
      sentiment: r.sentiment || null,
    }));

    const topPriorityLeads = topPriorityRows.rows.map(r => ({
      id: r.id,
      name: r.name || 'Lead sin nombre',
      sector: r.sector || '',
      city: r.city || '',
      email: r.email || '',
      phone: r.phone || '',
      score: parseInt(r.score) || 0,
      stage: r.stage,
      daysInStage: parseInt(r.days_in_stage) || 0,
      lastActivity: r.last_activity,
    }));

    const inactiveLeads = inactiveRows.rows.map(r => ({
      id: r.id,
      name: r.name || 'Lead sin nombre',
      email: r.email || '',
      phone: r.phone || '',
      stage: r.stage,
      daysInactive: parseInt(r.days_inactive) || 0,
      lastActivity: r.last_activity,
      lastMessage: (r.last_message || '').slice(0, 160),
    }));

    const recentWins = recentWinsRows.rows.map(r => ({
      id: r.id,
      name: r.name || 'Cliente',
      sector: r.sector || '',
      city: r.city || '',
      wonAt: r.won_at,
      value: parseInt(r.value) || 0,
    }));

    const coach = {
      scored: parseInt(coachSummary.rows[0]?.scored) || 0,
      pending: parseInt(coachSummary.rows[0]?.pending) || 0,
      avgScore: coachSummary.rows[0]?.avg_score != null ? +parseFloat(coachSummary.rows[0].avg_score).toFixed(1) : null,
      activeVersions: parseInt(coachActiveVersions.rows[0]?.c) || 0,
    };

    res.json({
      success: true,
      generated_at: new Date().toISOString(),
      kpis: {
        contactedToday: cToday,
        contactedTodayTrend: contactedTrend,
        responseRate,
        responseRateTrend,
        sent,
        replied,
        activeConversations: parseInt(activeConvos.rows[0].count) || 0,
        wonThisMonth: parseInt(wonMonthRow.c) || 0,
        wonValue: parseInt(wonMonthRow.v) || 0,
        pipelineValue: parseInt(pipelineValue.rows[0]?.v) || 0,
        conversionRate,
        avgResponseHours: avgHours,
      },
      dailyContacts,
      hourlyResponse,
      funnel,
      sectors,
      channels,
      recentReplies,
      topPriorityLeads,
      inactiveLeads,
      recentWins,
      coach,
    });
  } catch (err) {
    console.error('[SalesDashboard] error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/leads/:id/follow-up
 * Generates + sends an AI follow-up for a lead using whichever channel has
 * history (WhatsApp preferred if available + we have a connected account).
 */
leadsRouter.post('/:id/follow-up', async (req, res) => {
  try {
    const { id } = req.params;
    const leadRes = await pool.query('SELECT * FROM leads WHERE id = $1', [id]);
    if (leadRes.rows.length === 0) return res.status(404).json({ success: false, error: 'Lead no encontrado' });
    const lead = leadRes.rows[0];

    // Pull recent history to decide channel + build context
    const historyRes = await pool.query(
      `SELECT UPPER(channel) AS channel, UPPER(status) AS status, body, subject, sent_at
       FROM outreach_messages
       WHERE lead_id = $1
       ORDER BY COALESCE(sent_at, created_at) DESC
       LIMIT 20`,
      [id]
    );
    const history = historyRes.rows;

    const hasWhatsAppHistory = history.some(m => m.channel === 'WHATSAPP');
    const hasEmailHistory = history.some(m => m.channel === 'EMAIL');
    const whatsappPhone = lead.social_whatsapp || lead.phone;

    // Channel selection: prefer whatsapp if lead has an active whatsapp number + past history there.
    // Fallback to email if the lead has email.
    let useChannel = null;
    if (hasWhatsAppHistory && whatsappPhone) useChannel = 'WHATSAPP';
    else if (hasEmailHistory && lead.email) useChannel = 'EMAIL';
    else if (whatsappPhone) useChannel = 'WHATSAPP';
    else if (lead.email) useChannel = 'EMAIL';

    if (!useChannel) {
      return res.status(400).json({ success: false, error: 'Lead no tiene email ni WhatsApp disponibles' });
    }

    if (useChannel === 'WHATSAPP') {
      const { waManager } = await import('../services/outreach/whatsapp-connection-service.js');
      const { whatsappOutreachService } = await import('../services/outreach/whatsapp-outreach-service.js');

      const convo = history
        .filter(m => m.channel === 'WHATSAPP')
        .map(m => {
          const who = m.status === 'REPLIED' ? 'Cliente' : 'Gian Franco Koch';
          return `${who}: ${(m.body || '').slice(0, 200)}`;
        })
        .reverse()
        .join('\n');

      const message = convo
        ? await whatsappOutreachService.generateFollowUp(lead, convo)
        : await whatsappOutreachService.generateMessage(lead);

      const result = await waManager.sendMessageRotating(whatsappPhone, message, id, { allowOverLimit: true });
      await pool.query(
        "INSERT INTO outreach_messages (lead_id, channel, step, body, ai_generated, status, sent_at, wa_account_id, params_version_id) VALUES ($1, 'WHATSAPP', 2, $2, true, 'SENT', NOW(), $3, $4)",
        [id, message, result.wa_account_id, whatsappOutreachService.lastParamsVersionId || null]
      );
      return res.json({ success: true, channel: 'WHATSAPP', message });
    }

    // EMAIL follow-up
    const { emailOutreachService } = await import('../services/outreach/email-outreach-service.js');
    const stepCount = history.filter(m => m.channel === 'EMAIL' && m.status !== 'REPLIED').length;
    const stepType = stepCount >= 4 ? 'last_chance'
                   : stepCount >= 3 ? 'urgency'
                   : stepCount >= 2 ? 'case_study'
                   : stepCount >= 1 ? 'value'
                   : 'introduction';
    const email = await emailOutreachService.generateEmail(lead, stepType, stepCount + 1);
    await emailOutreachService.sendEmail(lead.email, email.subject, email.body);
    await pool.query(
      `INSERT INTO outreach_messages (lead_id, channel, step, subject, body, ai_generated, status, sent_at, params_version_id)
       VALUES ($1, 'EMAIL', $2, $3, $4, true, 'SENT', NOW(), $5)`,
      [id, stepCount + 1, email.subject, email.body, email._paramsVersionId || null]
    );
    res.json({ success: true, channel: 'EMAIL', subject: email.subject });
  } catch (err) {
    console.error('[Follow-up] error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
export { leadsRouter };
