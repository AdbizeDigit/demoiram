import express from 'express'
import { protect } from '../middleware/auth.js'
import { pool } from '../config/database.js'
import axios from 'axios'

const router = express.Router()

// ==========================================
// SISTEMA DE CAMPAÑAS AUTOMÁTICAS
// ==========================================

// Crear campaña automática
router.post('/create', protect, async (req, res) => {
  try {
    const user = req.user
    const {
      name,
      targetCriteria,
      emailTemplates,
      schedule,
      enabled
    } = req.body

    // Validar
    if (!name || !emailTemplates || emailTemplates.length === 0) {
      return res.status(400).json({ error: 'Nombre y templates son requeridos' })
    }

    // Crear campaña
    const result = await pool.query(
      `INSERT INTO auto_campaigns
       (user_id, name, status, target_criteria, email_templates, schedule, enabled, created_at)
       VALUES ($1, $2, 'draft', $3, $4, $5, $6, NOW())
       RETURNING *`,
      [
        user.id,
        name,
        JSON.stringify(targetCriteria || {}),
        JSON.stringify(emailTemplates),
        JSON.stringify(schedule || {}),
        enabled !== false
      ]
    )

    res.json({
      success: true,
      campaign: result.rows[0]
    })
  } catch (error) {
    console.error('Error creando campaña:', error)
    res.status(500).json({ error: error.message })
  }
})

// Listar campañas
router.get('/list', protect, async (req, res) => {
  try {
    const user = req.user

    const result = await pool.query(
      `SELECT * FROM auto_campaigns
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [user.id]
    )

    res.json({
      success: true,
      campaigns: result.rows
    })
  } catch (error) {
    console.error('Error listando campañas:', error)
    res.status(500).json({ error: error.message })
  }
})

// Iniciar campaña
router.post('/:id/start', protect, async (req, res) => {
  try {
    const user = req.user
    const { id } = req.params

    // Obtener campaña
    const campaignResult = await pool.query(
      `SELECT * FROM auto_campaigns WHERE id = $1 AND user_id = $2`,
      [id, user.id]
    )

    if (campaignResult.rows.length === 0) {
      return res.status(404).json({ error: 'Campaña no encontrada' })
    }

    const campaign = campaignResult.rows[0]

    // Obtener leads que cumplen criterios
    const targetCriteria = campaign.target_criteria
    let query = `SELECT * FROM captured_leads WHERE user_id = $1`
    const params = [user.id]
    let paramIndex = 2

    if (targetCriteria.minScore) {
      query += ` AND lead_score >= $${paramIndex}`
      params.push(targetCriteria.minScore)
      paramIndex++
    }

    if (targetCriteria.quality) {
      query += ` AND lead_quality = $${paramIndex}`
      params.push(targetCriteria.quality)
      paramIndex++
    }

    if (targetCriteria.status) {
      query += ` AND status = $${paramIndex}`
      params.push(targetCriteria.status)
      paramIndex++
    }

    if (targetCriteria.industry) {
      query += ` AND lead_data->>'industry' = $${paramIndex}`
      params.push(targetCriteria.industry)
      paramIndex++
    }

    const leadsResult = await pool.query(query, params)
    const targetLeads = leadsResult.rows

    // Actualizar campaña
    await pool.query(
      `UPDATE auto_campaigns
       SET status = 'running',
           started_at = NOW(),
           stats = $1
       WHERE id = $2`,
      [
        JSON.stringify({
          totalLeads: targetLeads.length,
          emailsSent: 0,
          emailsOpened: 0,
          emailsReplied: 0
        }),
        id
      ]
    )

    // Crear tracking para cada lead
    const emailTemplates = campaign.email_templates
    const schedule = campaign.schedule || {}

    for (const lead of targetLeads) {
      // Crear seguimiento
      const trackingResult = await pool.query(
        `INSERT INTO lead_tracking
         (user_id, lead_id, lead_data, sequence_type, status, created_at)
         VALUES ($1, $2, $3, 'campaign', 'active', NOW())
         RETURNING *`,
        [user.id, lead.id, lead.lead_data]
      )

      const tracking = trackingResult.rows[0]

      // Programar emails según templates
      for (let i = 0; i < emailTemplates.length; i++) {
        const template = emailTemplates[i]
        const delayDays = template.delayDays || (i * 3) // Default: 3 días entre emails

        const scheduledDate = new Date()
        scheduledDate.setDate(scheduledDate.getDate() + delayDays)

        await pool.query(
          `INSERT INTO tracking_actions
           (tracking_id, action_type, subject, scheduled_date, status)
           VALUES ($1, 'email', $2, $3, 'pending')`,
          [tracking.id, template.subject, scheduledDate]
        )
      }
    }

    res.json({
      success: true,
      message: `Campaña iniciada con ${targetLeads.length} leads`,
      stats: {
        totalLeads: targetLeads.length,
        emailsScheduled: targetLeads.length * emailTemplates.length
      }
    })
  } catch (error) {
    console.error('Error iniciando campaña:', error)
    res.status(500).json({ error: error.message })
  }
})

// Pausar campaña
router.post('/:id/pause', protect, async (req, res) => {
  try {
    const user = req.user
    const { id } = req.params

    await pool.query(
      `UPDATE auto_campaigns
       SET status = 'paused'
       WHERE id = $1 AND user_id = $2`,
      [id, user.id]
    )

    res.json({
      success: true,
      message: 'Campaña pausada'
    })
  } catch (error) {
    console.error('Error pausando campaña:', error)
    res.status(500).json({ error: error.message })
  }
})

// Obtener estadísticas de campaña
router.get('/:id/stats', protect, async (req, res) => {
  try {
    const user = req.user
    const { id } = req.params

    const result = await pool.query(
      `SELECT * FROM auto_campaigns WHERE id = $1 AND user_id = $2`,
      [id, user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Campaña no encontrada' })
    }

    const campaign = result.rows[0]

    // Obtener estadísticas actualizadas
    const trackingStats = await pool.query(
      `SELECT
        COUNT(*) as total_leads,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'active') as active
       FROM lead_tracking
       WHERE user_id = $1
       AND sequence_type = 'campaign'
       AND created_at >= $2`,
      [user.id, campaign.started_at || campaign.created_at]
    )

    res.json({
      success: true,
      campaign: campaign,
      stats: {
        ...campaign.stats,
        tracking: trackingStats.rows[0]
      }
    })
  } catch (error) {
    console.error('Error obteniendo stats:', error)
    res.status(500).json({ error: error.message })
  }
})

// ==========================================
// TEMPLATES DE EMAIL
// ==========================================

// Crear template
router.post('/templates/create', protect, async (req, res) => {
  try {
    const user = req.user
    const {
      name,
      subject,
      body,
      category,
      variables
    } = req.body

    const result = await pool.query(
      `INSERT INTO email_templates
       (user_id, name, subject, body, category, variables, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [user.id, name, subject, body, category || 'general', JSON.stringify(variables || [])]
    )

    res.json({
      success: true,
      template: result.rows[0]
    })
  } catch (error) {
    console.error('Error creando template:', error)
    res.status(500).json({ error: error.message })
  }
})

// Listar templates
router.get('/templates/list', protect, async (req, res) => {
  try {
    const user = req.user
    const { category } = req.query

    let query = `SELECT * FROM email_templates WHERE user_id = $1`
    const params = [user.id]

    if (category) {
      query += ` AND category = $2`
      params.push(category)
    }

    query += ` ORDER BY created_at DESC`

    const result = await pool.query(query, params)

    res.json({
      success: true,
      templates: result.rows
    })
  } catch (error) {
    console.error('Error listando templates:', error)
    res.status(500).json({ error: error.message })
  }
})

// Renderizar template con variables
router.post('/templates/:id/render', protect, async (req, res) => {
  try {
    const user = req.user
    const { id } = req.params
    const { variables } = req.body

    // Obtener template
    const result = await pool.query(
      `SELECT * FROM email_templates WHERE id = $1 AND user_id = $2`,
      [id, user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template no encontrado' })
    }

    const template = result.rows[0]

    // Reemplazar variables
    let subject = template.subject
    let body = template.body

    for (const [key, value] of Object.entries(variables || {})) {
      const regex = new RegExp(`{{${key}}}`, 'g')
      subject = subject.replace(regex, value)
      body = body.replace(regex, value)
    }

    res.json({
      success: true,
      rendered: {
        subject,
        body
      }
    })
  } catch (error) {
    console.error('Error renderizando template:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
