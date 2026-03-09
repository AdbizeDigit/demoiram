import express from 'express'
import { protect } from '../middleware/auth.js'
import { pool } from '../config/database.js'

const router = express.Router()

// Crear tabla si no existe
async function initTerritoriesTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scraping_territories (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        location_name VARCHAR(255) NOT NULL,
        lat DOUBLE PRECISION NOT NULL,
        lng DOUBLE PRECISION NOT NULL,
        zoom INTEGER DEFAULT 10,
        scrape_type VARCHAR(100) DEFAULT 'auto-search',
        results_count INTEGER DEFAULT 0,
        hot_leads INTEGER DEFAULT 0,
        warm_leads INTEGER DEFAULT 0,
        cold_leads INTEGER DEFAULT 0,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_territories_user ON scraping_territories(user_id)
    `)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_territories_created ON scraping_territories(created_at DESC)
    `)
  } catch (err) {
    console.error('Error creating scraping_territories table:', err)
  }
}

initTerritoriesTable()

// GET /api/scraping/territories - Obtener todos los territorios scrapeados
router.get('/territories', protect, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, location_name, lat, lng, zoom, scrape_type, results_count,
              hot_leads, warm_leads, cold_leads, metadata, created_at
       FROM scraping_territories
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 500`,
      [req.user.id]
    )

    // Agrupar por ubicacion para el mapa de calor
    const grouped = {}
    for (const row of rows) {
      const key = `${row.lat.toFixed(2)},${row.lng.toFixed(2)}`
      if (!grouped[key]) {
        grouped[key] = {
          lat: row.lat,
          lng: row.lng,
          location_name: row.location_name,
          total_scrapes: 0,
          total_results: 0,
          total_hot: 0,
          total_warm: 0,
          total_cold: 0,
          last_scrape: row.created_at,
          scrapes: []
        }
      }
      grouped[key].total_scrapes++
      grouped[key].total_results += row.results_count || 0
      grouped[key].total_hot += row.hot_leads || 0
      grouped[key].total_warm += row.warm_leads || 0
      grouped[key].total_cold += row.cold_leads || 0
      grouped[key].scrapes.push({
        id: row.id,
        type: row.scrape_type,
        results: row.results_count,
        date: row.created_at
      })
    }

    res.json({
      success: true,
      territories: rows,
      grouped: Object.values(grouped),
      stats: {
        total_territories: rows.length,
        unique_locations: Object.keys(grouped).length,
        total_results: rows.reduce((sum, r) => sum + (r.results_count || 0), 0),
        total_hot: rows.reduce((sum, r) => sum + (r.hot_leads || 0), 0)
      }
    })
  } catch (error) {
    console.error('Error fetching territories:', error)
    res.status(500).json({ success: false, error: 'Error al obtener territorios' })
  }
})

// POST /api/scraping/territories - Registrar un territorio scrapeado
router.post('/territories', protect, async (req, res) => {
  try {
    const { location_name, lat, lng, zoom, scrape_type, results_count, hot_leads, warm_leads, cold_leads, metadata } = req.body

    if (!location_name || lat == null || lng == null) {
      return res.status(400).json({ success: false, error: 'location_name, lat y lng son requeridos' })
    }

    const { rows } = await pool.query(
      `INSERT INTO scraping_territories (user_id, location_name, lat, lng, zoom, scrape_type, results_count, hot_leads, warm_leads, cold_leads, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [req.user.id, location_name, lat, lng, zoom || 10, scrape_type || 'auto-search', results_count || 0, hot_leads || 0, warm_leads || 0, cold_leads || 0, JSON.stringify(metadata || {})]
    )

    res.json({ success: true, territory: rows[0] })
  } catch (error) {
    console.error('Error saving territory:', error)
    res.status(500).json({ success: false, error: 'Error al guardar territorio' })
  }
})

// DELETE /api/scraping/territories/:id
router.delete('/territories/:id', protect, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM scraping_territories WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    )
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al eliminar territorio' })
  }
})

export default router
