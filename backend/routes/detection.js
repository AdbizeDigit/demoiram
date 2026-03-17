import express from 'express'
import { protect, adminOnly } from '../middleware/auth.js'
import { pool } from '../config/database.js'
import OpportunityScannerService from '../services/detection-scanner.js'

const router = express.Router()
const scanner = OpportunityScannerService.getInstance()

// All routes require authentication + admin role
router.use(protect, adminOnly)

// GET /opportunities - List with filters, pagination
router.get('/opportunities', async (req, res) => {
  try {
    const { status, type, minScore, search, page = 1, limit = 20 } = req.query
    const offset = (parseInt(page) - 1) * parseInt(limit)
    const conditions = []
    const params = []
    let paramIndex = 1

    if (status) {
      conditions.push(`status = $${paramIndex++}`)
      params.push(status)
    }
    if (type) {
      conditions.push(`opportunity_type = $${paramIndex++}`)
      params.push(type)
    }
    if (minScore) {
      conditions.push(`relevance_score >= $${paramIndex++}`)
      params.push(parseInt(minScore))
    }
    if (search) {
      conditions.push(`(title ILIKE $${paramIndex} OR summary ILIKE $${paramIndex} OR company_mentioned ILIKE $${paramIndex})`)
      params.push(`%${search}%`)
      paramIndex++
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM detected_opportunities ${whereClause}`,
      params
    )
    const total = parseInt(countResult.rows[0].count)

    params.push(parseInt(limit))
    params.push(offset)

    const result = await pool.query(
      `SELECT * FROM detected_opportunities ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    )

    res.json({
      opportunities: result.rows,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    })
  } catch (error) {
    console.error('Error fetching opportunities:', error)
    res.status(500).json({ message: 'Error al obtener oportunidades', error: error.message })
  }
})

// GET /opportunities/stats - Stats summary
router.get('/opportunities/stats', async (req, res) => {
  try {
    const byStatus = await pool.query(
      `SELECT status, COUNT(*) as count FROM detected_opportunities GROUP BY status`
    )
    const byType = await pool.query(
      `SELECT opportunity_type, COUNT(*) as count FROM detected_opportunities GROUP BY opportunity_type`
    )
    const avgScore = await pool.query(
      `SELECT COALESCE(AVG(relevance_score), 0) as avg_score, COUNT(*) as total FROM detected_opportunities`
    )

    res.json({
      byStatus: byStatus.rows,
      byType: byType.rows,
      averageScore: Math.round(parseFloat(avgScore.rows[0].avg_score)),
      total: parseInt(avgScore.rows[0].total)
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    res.status(500).json({ message: 'Error al obtener estadísticas', error: error.message })
  }
})

// GET /opportunities/:id - Detail with associated articles
router.get('/opportunities/:id', async (req, res) => {
  try {
    const { id } = req.params

    const oppResult = await pool.query(
      'SELECT * FROM detected_opportunities WHERE id = $1',
      [id]
    )

    if (oppResult.rows.length === 0) {
      return res.status(404).json({ message: 'Oportunidad no encontrada' })
    }

    const articlesResult = await pool.query(
      'SELECT * FROM news_articles WHERE opportunity_id = $1 ORDER BY fetched_at DESC',
      [id]
    )

    res.json({
      opportunity: oppResult.rows[0],
      articles: articlesResult.rows
    })
  } catch (error) {
    console.error('Error fetching opportunity detail:', error)
    res.status(500).json({ message: 'Error al obtener detalle', error: error.message })
  }
})

// POST /opportunities/:id/convert - Set status to CONVERTED
router.post('/opportunities/:id/convert', async (req, res) => {
  try {
    const { id } = req.params

    const result = await pool.query(
      `UPDATE detected_opportunities SET status = 'CONVERTED', admin_id = $1, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [req.user.id, id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Oportunidad no encontrada' })
    }

    res.json({ opportunity: result.rows[0], message: 'Oportunidad convertida exitosamente' })
  } catch (error) {
    console.error('Error converting opportunity:', error)
    res.status(500).json({ message: 'Error al convertir oportunidad', error: error.message })
  }
})

// PATCH /opportunities/:id - Update status/priority
router.patch('/opportunities/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { status, priority } = req.body
    const updates = []
    const params = []
    let paramIndex = 1

    if (status) {
      updates.push(`status = $${paramIndex++}`)
      params.push(status)
    }
    if (priority) {
      updates.push(`priority = $${paramIndex++}`)
      params.push(priority)
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No hay campos para actualizar' })
    }

    updates.push(`updated_at = NOW()`)
    params.push(id)

    const result = await pool.query(
      `UPDATE detected_opportunities SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Oportunidad no encontrada' })
    }

    res.json({ opportunity: result.rows[0] })
  } catch (error) {
    console.error('Error updating opportunity:', error)
    res.status(500).json({ message: 'Error al actualizar oportunidad', error: error.message })
  }
})

// GET /articles - List articles with filters, pagination
router.get('/articles', async (req, res) => {
  try {
    const { source, analyzed, page = 1, limit = 30 } = req.query
    const offset = (parseInt(page) - 1) * parseInt(limit)
    const conditions = []
    const params = []
    let paramIndex = 1

    if (source) {
      conditions.push(`source_name = $${paramIndex++}`)
      params.push(source)
    }
    if (analyzed !== undefined) {
      conditions.push(`analyzed = $${paramIndex++}`)
      params.push(analyzed === 'true')
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM news_articles ${whereClause}`,
      params
    )
    const total = parseInt(countResult.rows[0].count)

    params.push(parseInt(limit))
    params.push(offset)

    const result = await pool.query(
      `SELECT * FROM news_articles ${whereClause}
       ORDER BY fetched_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    )

    res.json({
      articles: result.rows,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    })
  } catch (error) {
    console.error('Error fetching articles:', error)
    res.status(500).json({ message: 'Error al obtener artículos', error: error.message })
  }
})

// GET /sources - List all sources
router.get('/sources', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM detection_sources ORDER BY created_at ASC'
    )
    res.json({ sources: result.rows })
  } catch (error) {
    console.error('Error fetching sources:', error)
    res.status(500).json({ message: 'Error al obtener fuentes', error: error.message })
  }
})

// PATCH /sources/:id - Toggle enabled/disabled
router.patch('/sources/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { enabled } = req.body

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ message: 'El campo "enabled" debe ser boolean' })
    }

    const result = await pool.query(
      `UPDATE detection_sources SET enabled = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [enabled, id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Fuente no encontrada' })
    }

    res.json({ source: result.rows[0] })
  } catch (error) {
    console.error('Error updating source:', error)
    res.status(500).json({ message: 'Error al actualizar fuente', error: error.message })
  }
})

// POST /scan - Trigger manual scan (async - returns immediately)
router.post('/scan', async (req, res) => {
  try {
    if (scanner.isScanning) {
      return res.json({ success: false, message: 'Ya hay un escaneo en progreso' })
    }

    // Start scan in background - don't await
    scanner.runFullScan()
      .then(result => {
        console.log(`✅ Escaneo completado: ${result.articlesFound || 0} articulos, ${result.opportunitiesCreated || 0} oportunidades`)
      })
      .catch(err => {
        console.error('❌ Error en escaneo:', err.message)
      })

    res.json({ success: true, message: 'Escaneo iniciado en segundo plano' })
  } catch (error) {
    console.error('Error running scan:', error)
    res.status(500).json({ message: 'Error al ejecutar escaneo', error: error.message })
  }
})

// POST /scan/auto/start - Start auto-scan
router.post('/scan/auto/start', async (req, res) => {
  try {
    const { intervalMinutes = 60 } = req.body
    const result = scanner.startAutoScan(parseInt(intervalMinutes))
    res.json(result)
  } catch (error) {
    console.error('Error starting auto-scan:', error)
    res.status(500).json({ message: 'Error al iniciar auto-scan', error: error.message })
  }
})

// POST /scan/auto/stop - Stop auto-scan
router.post('/scan/auto/stop', async (req, res) => {
  try {
    const result = scanner.stopAutoScan()
    res.json(result)
  } catch (error) {
    console.error('Error stopping auto-scan:', error)
    res.status(500).json({ message: 'Error al detener auto-scan', error: error.message })
  }
})

// GET /scan/status - Get scan status
router.get('/scan/status', async (req, res) => {
  try {
    const status = scanner.getScanStatus()
    res.json(status)
  } catch (error) {
    console.error('Error getting scan status:', error)
    res.status(500).json({ message: 'Error al obtener estado', error: error.message })
  }
})

// GET /logs - Get scan logs
router.get('/logs', async (req, res) => {
  try {
    const { limit = 20 } = req.query

    const result = await pool.query(
      `SELECT * FROM detection_scan_logs ORDER BY started_at DESC LIMIT $1`,
      [parseInt(limit)]
    )

    res.json({ logs: result.rows })
  } catch (error) {
    console.error('Error fetching logs:', error)
    res.status(500).json({ message: 'Error al obtener logs', error: error.message })
  }
})

// DELETE /opportunities/:id - Soft delete (set status to DISMISSED)
router.delete('/opportunities/:id', async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query(
      `UPDATE detected_opportunities SET status = 'DISMISSED', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Oportunidad no encontrada' })
    }
    res.json({ opportunity: result.rows[0], message: 'Oportunidad eliminada' })
  } catch (error) {
    console.error('Error deleting opportunity:', error)
    res.status(500).json({ message: 'Error al eliminar oportunidad', error: error.message })
  }
})

// PUT /opportunities/:id - Full update
router.put('/opportunities/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { status, priority } = req.body
    const updates = []
    const params = []
    let paramIndex = 1

    if (status) {
      updates.push(`status = $${paramIndex++}`)
      params.push(status)
    }
    if (priority) {
      updates.push(`priority = $${paramIndex++}`)
      params.push(priority)
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No hay campos para actualizar' })
    }

    updates.push(`updated_at = NOW()`)
    params.push(id)

    const result = await pool.query(
      `UPDATE detected_opportunities SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Oportunidad no encontrada' })
    }

    res.json({ opportunity: result.rows[0] })
  } catch (error) {
    console.error('Error updating opportunity:', error)
    res.status(500).json({ message: 'Error al actualizar oportunidad', error: error.message })
  }
})

export default router
