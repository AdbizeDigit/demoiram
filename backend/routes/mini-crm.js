import express from 'express'
import { protect } from '../middleware/auth.js'
import { pool } from '../config/database.js'

const router = express.Router()

// ==========================================
// MINI CRM AUTOMÁTICO
// ==========================================

// Capturar lead automáticamente (llamado desde scraping)
router.post('/capture-lead', protect, async (req, res) => {
  try {
    const user = req.user
    const {
      sourceType,
      sourceId,
      leadData,
      leadScore,
      leadQuality
    } = req.body

    // Verificar si el lead ya existe (por email)
    const email = leadData.email || leadData.contact?.email
    if (email) {
      const existing = await pool.query(
        `SELECT id FROM captured_leads
         WHERE user_id = $1
         AND lead_data->>'email' = $2`,
        [user.id, email]
      )

      if (existing.rows.length > 0) {
        // Actualizar lead existente
        const result = await pool.query(
          `UPDATE captured_leads
           SET lead_score = GREATEST(lead_score, $1),
               lead_quality = CASE
                 WHEN $2 = 'hot' THEN 'hot'
                 WHEN $2 = 'warm' AND lead_quality != 'hot' THEN 'warm'
                 ELSE lead_quality
               END,
               updated_at = NOW()
           WHERE id = $3
           RETURNING *`,
          [leadScore, leadQuality, existing.rows[0].id]
        )

        return res.json({
          success: true,
          lead: result.rows[0],
          action: 'updated'
        })
      }
    }

    // Crear nuevo lead
    const result = await pool.query(
      `INSERT INTO captured_leads
       (user_id, source_type, source_id, lead_data, lead_score, lead_quality, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'new', NOW(), NOW())
       RETURNING *`,
      [user.id, sourceType, sourceId, JSON.stringify(leadData), leadScore, leadQuality]
    )

    const lead = result.rows[0]

    // Auto-asignar siguiente acción basada en calidad
    const nextActionDays = leadQuality === 'hot' ? 0 : leadQuality === 'warm' ? 1 : 3
    const nextActionDate = new Date()
    nextActionDate.setDate(nextActionDate.getDate() + nextActionDays)

    await pool.query(
      `UPDATE captured_leads
       SET next_action_date = $1
       WHERE id = $2`,
      [nextActionDate, lead.id]
    )

    // Registrar interacción inicial
    await pool.query(
      `INSERT INTO lead_interactions
       (lead_id, interaction_type, channel, subject, content, created_at)
       VALUES ($1, 'discovered', $2, 'Lead capturado', $3, NOW())`,
      [lead.id, sourceType, `Lead descubierto via ${sourceType} con score ${leadScore}`]
    )

    res.json({
      success: true,
      lead: lead,
      action: 'created'
    })
  } catch (error) {
    console.error('Error capturando lead:', error)
    res.status(500).json({ error: error.message })
  }
})

// Listar leads con filtros
router.get('/leads', protect, async (req, res) => {
  try {
    const user = req.user
    const {
      status,
      quality,
      minScore,
      search,
      limit = 50,
      offset = 0
    } = req.query

    let query = `
      SELECT *
      FROM captured_leads
      WHERE user_id = $1
    `
    const params = [user.id]
    let paramIndex = 2

    if (status) {
      query += ` AND status = $${paramIndex}`
      params.push(status)
      paramIndex++
    }

    if (quality) {
      query += ` AND lead_quality = $${paramIndex}`
      params.push(quality)
      paramIndex++
    }

    if (minScore) {
      query += ` AND lead_score >= $${paramIndex}`
      params.push(minScore)
      paramIndex++
    }

    if (search) {
      query += ` AND (
        lead_data->>'name' ILIKE $${paramIndex} OR
        lead_data->>'company' ILIKE $${paramIndex} OR
        lead_data->>'email' ILIKE $${paramIndex}
      )`
      params.push(`%${search}%`)
      paramIndex++
    }

    query += ` ORDER BY
      CASE lead_quality
        WHEN 'hot' THEN 1
        WHEN 'warm' THEN 2
        WHEN 'cold' THEN 3
        ELSE 4
      END,
      lead_score DESC,
      created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `
    params.push(limit, offset)

    const result = await pool.query(query, params)

    // Contar total
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM captured_leads WHERE user_id = $1`,
      [user.id]
    )

    res.json({
      success: true,
      leads: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    })
  } catch (error) {
    console.error('Error listando leads:', error)
    res.status(500).json({ error: error.message })
  }
})

// Obtener lead individual con historial
router.get('/leads/:id', protect, async (req, res) => {
  try {
    const user = req.user
    const { id } = req.params

    const leadResult = await pool.query(
      `SELECT * FROM captured_leads WHERE id = $1 AND user_id = $2`,
      [id, user.id]
    )

    if (leadResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lead no encontrado' })
    }

    const lead = leadResult.rows[0]

    // Obtener historial de interacciones
    const interactionsResult = await pool.query(
      `SELECT * FROM lead_interactions
       WHERE lead_id = $1
       ORDER BY created_at DESC`,
      [id]
    )

    res.json({
      success: true,
      lead: lead,
      interactions: interactionsResult.rows
    })
  } catch (error) {
    console.error('Error obteniendo lead:', error)
    res.status(500).json({ error: error.message })
  }
})

// Actualizar estado del lead
router.put('/leads/:id/status', protect, async (req, res) => {
  try {
    const user = req.user
    const { id } = req.params
    const { status, notes } = req.body

    const result = await pool.query(
      `UPDATE captured_leads
       SET status = $1,
           notes = COALESCE($2, notes),
           last_contact_date = CASE
             WHEN $1 IN ('contacted', 'meeting_scheduled') THEN NOW()
             ELSE last_contact_date
           END,
           updated_at = NOW()
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
      [status, notes, id, user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead no encontrado' })
    }

    // Registrar interacción
    await pool.query(
      `INSERT INTO lead_interactions
       (lead_id, interaction_type, subject, content, created_at)
       VALUES ($1, 'status_change', $2, $3, NOW())`,
      [id, `Estado cambiado a ${status}`, notes || `Lead movido a estado ${status}`]
    )

    res.json({
      success: true,
      lead: result.rows[0]
    })
  } catch (error) {
    console.error('Error actualizando estado:', error)
    res.status(500).json({ error: error.message })
  }
})

// Registrar interacción manualmente
router.post('/leads/:id/interaction', protect, async (req, res) => {
  try {
    const user = req.user
    const { id } = req.params
    const {
      interactionType,
      channel,
      subject,
      content,
      outcome
    } = req.body

    // Verificar que el lead existe y pertenece al usuario
    const leadCheck = await pool.query(
      `SELECT id FROM captured_leads WHERE id = $1 AND user_id = $2`,
      [id, user.id]
    )

    if (leadCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Lead no encontrado' })
    }

    // Registrar interacción
    const result = await pool.query(
      `INSERT INTO lead_interactions
       (lead_id, interaction_type, channel, subject, content, outcome, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING *`,
      [id, interactionType, channel, subject, content, outcome, user.id]
    )

    // Actualizar fecha de último contacto
    await pool.query(
      `UPDATE captured_leads
       SET last_contact_date = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [id]
    )

    res.json({
      success: true,
      interaction: result.rows[0]
    })
  } catch (error) {
    console.error('Error registrando interacción:', error)
    res.status(500).json({ error: error.message })
  }
})

// Agregar tags a un lead
router.post('/leads/:id/tags', protect, async (req, res) => {
  try {
    const user = req.user
    const { id } = req.params
    const { tags } = req.body

    const result = await pool.query(
      `UPDATE captured_leads
       SET tags = $1,
           updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [JSON.stringify(tags), id, user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead no encontrado' })
    }

    res.json({
      success: true,
      lead: result.rows[0]
    })
  } catch (error) {
    console.error('Error agregando tags:', error)
    res.status(500).json({ error: error.message })
  }
})

// Pipeline: Obtener resumen del pipeline
router.get('/pipeline/summary', protect, async (req, res) => {
  try {
    const user = req.user

    const result = await pool.query(
      `SELECT
        status,
        COUNT(*) as count,
        AVG(lead_score) as avg_score
       FROM captured_leads
       WHERE user_id = $1
       GROUP BY status
       ORDER BY
         CASE status
           WHEN 'new' THEN 1
           WHEN 'contacted' THEN 2
           WHEN 'qualified' THEN 3
           WHEN 'meeting_scheduled' THEN 4
           WHEN 'proposal_sent' THEN 5
           WHEN 'closed_won' THEN 6
           WHEN 'closed_lost' THEN 7
           ELSE 8
         END`,
      [user.id]
    )

    res.json({
      success: true,
      pipeline: result.rows
    })
  } catch (error) {
    console.error('Error obteniendo pipeline:', error)
    res.status(500).json({ error: error.message })
  }
})

// Mover lead en el pipeline
router.post('/pipeline/move', protect, async (req, res) => {
  try {
    const user = req.user
    const { leadId, newStatus, notes } = req.body

    // Actualizar estado
    const result = await pool.query(
      `UPDATE captured_leads
       SET status = $1,
           last_contact_date = NOW(),
           updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [newStatus, leadId, user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead no encontrado' })
    }

    // Registrar movimiento
    await pool.query(
      `INSERT INTO lead_interactions
       (lead_id, interaction_type, subject, content, created_at)
       VALUES ($1, 'pipeline_move', $2, $3, NOW())`,
      [leadId, `Movido a ${newStatus}`, notes || `Lead movido a etapa ${newStatus}`]
    )

    res.json({
      success: true,
      lead: result.rows[0]
    })
  } catch (error) {
    console.error('Error moviendo lead en pipeline:', error)
    res.status(500).json({ error: error.message })
  }
})

// Obtener leads que necesitan atención
router.get('/leads/needs-attention', protect, async (req, res) => {
  try {
    const user = req.user

    const result = await pool.query(
      `SELECT *
       FROM captured_leads
       WHERE user_id = $1
       AND status IN ('new', 'contacted', 'qualified')
       AND (
         -- Hot leads sin contactar en 24h
         (lead_quality = 'hot' AND (last_contact_date IS NULL OR last_contact_date < NOW() - INTERVAL '1 day'))
         OR
         -- Warm leads sin contactar en 3 días
         (lead_quality = 'warm' AND (last_contact_date IS NULL OR last_contact_date < NOW() - INTERVAL '3 days'))
         OR
         -- Cualquier lead con acción vencida
         (next_action_date IS NOT NULL AND next_action_date < NOW())
       )
       ORDER BY
         CASE lead_quality
           WHEN 'hot' THEN 1
           WHEN 'warm' THEN 2
           ELSE 3
         END,
         next_action_date ASC NULLS LAST
       LIMIT 20`,
      [user.id]
    )

    res.json({
      success: true,
      leadsNeedingAttention: result.rows
    })
  } catch (error) {
    console.error('Error obteniendo leads que necesitan atención:', error)
    res.status(500).json({ error: error.message })
  }
})

// Búsqueda avanzada de leads
router.post('/leads/search', protect, async (req, res) => {
  try {
    const user = req.user
    const {
      industry,
      minScore,
      maxScore,
      tags,
      dateFrom,
      dateTo,
      hasEmail,
      hasPhone
    } = req.body

    let query = `SELECT * FROM captured_leads WHERE user_id = $1`
    const params = [user.id]
    let paramIndex = 2

    if (industry) {
      query += ` AND lead_data->>'industry' = $${paramIndex}`
      params.push(industry)
      paramIndex++
    }

    if (minScore) {
      query += ` AND lead_score >= $${paramIndex}`
      params.push(minScore)
      paramIndex++
    }

    if (maxScore) {
      query += ` AND lead_score <= $${paramIndex}`
      params.push(maxScore)
      paramIndex++
    }

    if (tags && tags.length > 0) {
      query += ` AND tags ?| $${paramIndex}`
      params.push(tags)
      paramIndex++
    }

    if (dateFrom) {
      query += ` AND created_at >= $${paramIndex}`
      params.push(dateFrom)
      paramIndex++
    }

    if (dateTo) {
      query += ` AND created_at <= $${paramIndex}`
      params.push(dateTo)
      paramIndex++
    }

    if (hasEmail) {
      query += ` AND lead_data->>'email' IS NOT NULL`
    }

    if (hasPhone) {
      query += ` AND lead_data->>'phone' IS NOT NULL`
    }

    query += ` ORDER BY lead_score DESC, created_at DESC LIMIT 100`

    const result = await pool.query(query, params)

    res.json({
      success: true,
      leads: result.rows
    })
  } catch (error) {
    console.error('Error en búsqueda avanzada:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
