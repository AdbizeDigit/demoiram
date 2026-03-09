import express from 'express'
import { protect } from '../middleware/auth.js'
import { pool } from '../config/database.js'

const router = express.Router()

// ==========================================
// DASHBOARD DE MÉTRICAS EN TIEMPO REAL
// ==========================================

// Obtener métricas generales
router.get('/overview', protect, async (req, res) => {
  try {
    const user = req.user
    const { period = '30' } = req.query // días

    // Métricas de leads
    const leadsResult = await pool.query(
      `SELECT
        COUNT(*) as total_leads,
        COUNT(*) FILTER (WHERE lead_quality = 'hot') as hot_leads,
        COUNT(*) FILTER (WHERE lead_quality = 'warm') as warm_leads,
        COUNT(*) FILTER (WHERE lead_quality = 'cold') as cold_leads,
        COUNT(*) FILTER (WHERE status = 'contacted') as contacted,
        COUNT(*) FILTER (WHERE status = 'meeting_scheduled') as meetings_scheduled,
        COUNT(*) FILTER (WHERE status = 'closed_won') as deals_won,
        AVG(lead_score) as avg_score
       FROM captured_leads
       WHERE user_id = $1
       AND created_at >= NOW() - INTERVAL '${period} days'`,
      [user.id]
    )

    // Métricas de búsquedas programadas
    const scheduledSearchesResult = await pool.query(
      `SELECT
        COUNT(*) as total_scheduled,
        COUNT(*) FILTER (WHERE enabled = true) as active_scheduled
       FROM scheduled_searches
       WHERE user_id = $1`,
      [user.id]
    )

    // Últimas ejecuciones
    const recentRunsResult = await pool.query(
      `SELECT
        COUNT(*) as total_runs,
        SUM(qualified_leads) as total_qualified_leads,
        AVG(qualified_leads) as avg_qualified_per_run
       FROM scheduled_search_runs ssr
       JOIN scheduled_searches ss ON ssr.scheduled_search_id = ss.id
       WHERE ss.user_id = $1
       AND ssr.run_date >= NOW() - INTERVAL '${period} days'`,
      [user.id]
    )

    // Métricas de seguimiento
    const trackingResult = await pool.query(
      `SELECT
        COUNT(*) as active_trackings,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_trackings
       FROM lead_tracking
       WHERE user_id = $1`,
      [user.id]
    )

    // Acciones pendientes
    const pendingActionsResult = await pool.query(
      `SELECT COUNT(*) as pending_actions
       FROM tracking_actions ta
       JOIN lead_tracking lt ON ta.tracking_id = lt.id
       WHERE lt.user_id = $1
       AND ta.status = 'pending'
       AND ta.scheduled_date <= NOW() + INTERVAL '7 days'`,
      [user.id]
    )

    // Tasa de conversión
    const conversionResult = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE status IN ('contacted')) as contacted,
        COUNT(*) FILTER (WHERE status IN ('meeting_scheduled')) as meetings,
        COUNT(*) FILTER (WHERE status IN ('closed_won')) as won,
        COUNT(*) as total
       FROM captured_leads
       WHERE user_id = $1
       AND created_at >= NOW() - INTERVAL '${period} days'`,
      [user.id]
    )

    const conversion = conversionResult.rows[0]
    const contactRate = conversion.total > 0 ? (conversion.contacted / conversion.total * 100).toFixed(1) : 0
    const meetingRate = conversion.contacted > 0 ? (conversion.meetings / conversion.contacted * 100).toFixed(1) : 0
    const winRate = conversion.meetings > 0 ? (conversion.won / conversion.meetings * 100).toFixed(1) : 0

    res.json({
      success: true,
      period: `${period} días`,
      metrics: {
        leads: leadsResult.rows[0],
        scheduledSearches: scheduledSearchesResult.rows[0],
        recentRuns: recentRunsResult.rows[0],
        tracking: trackingResult.rows[0],
        pendingActions: pendingActionsResult.rows[0].pending_actions,
        conversion: {
          contactRate: parseFloat(contactRate),
          meetingRate: parseFloat(meetingRate),
          winRate: parseFloat(winRate)
        }
      }
    })
  } catch (error) {
    console.error('Error obteniendo métricas:', error)
    res.status(500).json({ error: error.message })
  }
})

// Obtener tendencias por día
router.get('/trends', protect, async (req, res) => {
  try {
    const user = req.user
    const { period = '30' } = req.query

    const result = await pool.query(
      `SELECT
        DATE(created_at) as date,
        COUNT(*) as total_leads,
        COUNT(*) FILTER (WHERE lead_quality = 'hot') as hot_leads,
        COUNT(*) FILTER (WHERE lead_quality = 'warm') as warm_leads,
        AVG(lead_score) as avg_score
       FROM captured_leads
       WHERE user_id = $1
       AND created_at >= NOW() - INTERVAL '${period} days'
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [user.id]
    )

    res.json({
      success: true,
      trends: result.rows
    })
  } catch (error) {
    console.error('Error obteniendo tendencias:', error)
    res.status(500).json({ error: error.message })
  }
})

// Obtener top fuentes de leads
router.get('/top-sources', protect, async (req, res) => {
  try {
    const user = req.user
    const { period = '30' } = req.query

    const result = await pool.query(
      `SELECT
        source_type,
        COUNT(*) as total_leads,
        COUNT(*) FILTER (WHERE lead_quality = 'hot') as hot_leads,
        AVG(lead_score) as avg_score
       FROM captured_leads
       WHERE user_id = $1
       AND created_at >= NOW() - INTERVAL '${period} days'
       GROUP BY source_type
       ORDER BY total_leads DESC
       LIMIT 10`,
      [user.id]
    )

    res.json({
      success: true,
      topSources: result.rows
    })
  } catch (error) {
    console.error('Error obteniendo top fuentes:', error)
    res.status(500).json({ error: error.message })
  }
})

// Obtener distribución por industria
router.get('/industry-distribution', protect, async (req, res) => {
  try {
    const user = req.user
    const { period = '30' } = req.query

    const result = await pool.query(
      `SELECT
        lead_data->>'industry' as industry,
        COUNT(*) as count,
        AVG(lead_score) as avg_score
       FROM captured_leads
       WHERE user_id = $1
       AND created_at >= NOW() - INTERVAL '${period} days'
       AND lead_data->>'industry' IS NOT NULL
       GROUP BY lead_data->>'industry'
       ORDER BY count DESC
       LIMIT 10`,
      [user.id]
    )

    res.json({
      success: true,
      industries: result.rows
    })
  } catch (error) {
    console.error('Error obteniendo distribución por industria:', error)
    res.status(500).json({ error: error.message })
  }
})

// Obtener próximas acciones
router.get('/upcoming-actions', protect, async (req, res) => {
  try {
    const user = req.user

    const result = await pool.query(
      `SELECT
        ta.*,
        lt.lead_data,
        lt.sequence_type
       FROM tracking_actions ta
       JOIN lead_tracking lt ON ta.tracking_id = lt.id
       WHERE lt.user_id = $1
       AND ta.status = 'pending'
       AND ta.scheduled_date <= NOW() + INTERVAL '7 days'
       ORDER BY ta.scheduled_date ASC
       LIMIT 20`,
      [user.id]
    )

    res.json({
      success: true,
      upcomingActions: result.rows
    })
  } catch (error) {
    console.error('Error obteniendo próximas acciones:', error)
    res.status(500).json({ error: error.message })
  }
})

// Obtener leads prioritarios (Hot leads que necesitan atención)
router.get('/priority-leads', protect, async (req, res) => {
  try {
    const user = req.user

    const result = await pool.query(
      `SELECT *
       FROM captured_leads
       WHERE user_id = $1
       AND lead_quality = 'hot'
       AND status IN ('new', 'contacted')
       AND (last_contact_date IS NULL OR last_contact_date < NOW() - INTERVAL '3 days')
       ORDER BY lead_score DESC, created_at DESC
       LIMIT 10`,
      [user.id]
    )

    res.json({
      success: true,
      priorityLeads: result.rows
    })
  } catch (error) {
    console.error('Error obteniendo leads prioritarios:', error)
    res.status(500).json({ error: error.message })
  }
})

// Registrar métrica del día
router.post('/record-metric', protect, async (req, res) => {
  try {
    const user = req.user
    const {
      metricType,
      value,
      date = new Date()
    } = req.body

    // Actualizar o insertar métrica del día
    await pool.query(
      `INSERT INTO lead_metrics (user_id, metric_date, ${metricType})
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, metric_date)
       DO UPDATE SET ${metricType} = lead_metrics.${metricType} + $3`,
      [user.id, date, value]
    )

    res.json({
      success: true,
      message: 'Métrica registrada'
    })
  } catch (error) {
    console.error('Error registrando métrica:', error)
    res.status(500).json({ error: error.message })
  }
})

// Obtener resumen de rendimiento
router.get('/performance-summary', protect, async (req, res) => {
  try {
    const user = req.user
    const { period = '30' } = req.query

    const result = await pool.query(
      `SELECT
        SUM(total_leads) as total_leads,
        SUM(hot_leads) as hot_leads,
        SUM(emails_sent) as emails_sent,
        SUM(emails_opened) as emails_opened,
        SUM(emails_replied) as emails_replied,
        SUM(meetings_scheduled) as meetings_scheduled,
        SUM(deals_closed) as deals_closed,
        SUM(revenue) as revenue
       FROM lead_metrics
       WHERE user_id = $1
       AND metric_date >= CURRENT_DATE - INTERVAL '${period} days'`,
      [user.id]
    )

    const summary = result.rows[0]

    // Calcular tasas
    const openRate = summary.emails_sent > 0
      ? (summary.emails_opened / summary.emails_sent * 100).toFixed(1)
      : 0

    const replyRate = summary.emails_sent > 0
      ? (summary.emails_replied / summary.emails_sent * 100).toFixed(1)
      : 0

    const meetingRate = summary.emails_replied > 0
      ? (summary.meetings_scheduled / summary.emails_replied * 100).toFixed(1)
      : 0

    const closeRate = summary.meetings_scheduled > 0
      ? (summary.deals_closed / summary.meetings_scheduled * 100).toFixed(1)
      : 0

    res.json({
      success: true,
      period: `${period} días`,
      summary: {
        ...summary,
        rates: {
          openRate: parseFloat(openRate),
          replyRate: parseFloat(replyRate),
          meetingRate: parseFloat(meetingRate),
          closeRate: parseFloat(closeRate)
        }
      }
    })
  } catch (error) {
    console.error('Error obteniendo resumen de rendimiento:', error)
    res.status(500).json({ error: error.message })
  }
})

// Comparar periodos
router.get('/compare-periods', protect, async (req, res) => {
  try {
    const user = req.user

    // Último mes
    const lastMonthResult = await pool.query(
      `SELECT
        COUNT(*) as total_leads,
        COUNT(*) FILTER (WHERE lead_quality = 'hot') as hot_leads,
        AVG(lead_score) as avg_score
       FROM captured_leads
       WHERE user_id = $1
       AND created_at >= NOW() - INTERVAL '30 days'
       AND created_at < NOW()`,
      [user.id]
    )

    // Mes anterior
    const previousMonthResult = await pool.query(
      `SELECT
        COUNT(*) as total_leads,
        COUNT(*) FILTER (WHERE lead_quality = 'hot') as hot_leads,
        AVG(lead_score) as avg_score
       FROM captured_leads
       WHERE user_id = $1
       AND created_at >= NOW() - INTERVAL '60 days'
       AND created_at < NOW() - INTERVAL '30 days'`,
      [user.id]
    )

    const current = lastMonthResult.rows[0]
    const previous = previousMonthResult.rows[0]

    // Calcular cambios porcentuales
    const leadsChange = previous.total_leads > 0
      ? ((current.total_leads - previous.total_leads) / previous.total_leads * 100).toFixed(1)
      : 0

    const hotLeadsChange = previous.hot_leads > 0
      ? ((current.hot_leads - previous.hot_leads) / previous.hot_leads * 100).toFixed(1)
      : 0

    const scoreChange = previous.avg_score > 0
      ? ((current.avg_score - previous.avg_score) / previous.avg_score * 100).toFixed(1)
      : 0

    res.json({
      success: true,
      comparison: {
        current: current,
        previous: previous,
        changes: {
          totalLeads: parseFloat(leadsChange),
          hotLeads: parseFloat(hotLeadsChange),
          avgScore: parseFloat(scoreChange)
        }
      }
    })
  } catch (error) {
    console.error('Error comparando periodos:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
