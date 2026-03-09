import express from 'express'
import { protect, adminOnly } from '../middleware/auth.js'
import { pool } from '../config/database.js'

const router = express.Router()

// ============================================
// MÓDULO 1: RASTREO Y RECOLECCIÓN
// ============================================

// Iniciar búsqueda de prospectos
router.post('/search-prospects', protect, adminOnly, async (req, res) => {
  try {
    const { country, industry, keywords } = req.body
    const adminId = req.user.id

    // Registrar evento de monitoreo
    await pool.query(
      `INSERT INTO pac_monitoring (admin_id, event_type, event_description, status)
       VALUES ($1, $2, $3, $4)`,
      [adminId, 'search_started', `Búsqueda iniciada: ${country}, ${industry}`, 'in_progress']
    )

    // Aquí iría la lógica de scraping real
    // Por ahora, retornamos datos simulados
    const mockProspects = [
      {
        company_name: 'Tech Innovations Inc',
        website: 'https://techinnovations.com',
        email: 'info@techinnovations.com',
        phone: '+1-555-0100',
        location: 'San Francisco, CA',
        country: country,
        latitude: 37.7749,
        longitude: -122.4194,
        industry: industry,
        description: 'Empresa de tecnología enfocada en soluciones de IA',
        source: 'web_scraping'
      },
      {
        company_name: 'Digital Solutions LLC',
        website: 'https://digitalsolutions.io',
        email: 'contact@digitalsolutions.io',
        phone: '+1-555-0101',
        location: 'Austin, TX',
        country: country,
        latitude: 30.2672,
        longitude: -97.7431,
        industry: industry,
        description: 'Proveedor de soluciones digitales y consultoría',
        source: 'web_scraping'
      }
    ]

    // Guardar prospectos en la BD
    const savedProspects = []
    for (const prospect of mockProspects) {
      const result = await pool.query(
        `INSERT INTO pac_prospects (
          admin_id, company_name, website, email, phone, location, country,
          latitude, longitude, industry, description, source, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          adminId, prospect.company_name, prospect.website, prospect.email,
          prospect.phone, prospect.location, prospect.country,
          prospect.latitude, prospect.longitude, prospect.industry,
          prospect.description, prospect.source, 'new'
        ]
      )
      savedProspects.push(result.rows[0])
    }

    // Actualizar evento de monitoreo
    await pool.query(
      `INSERT INTO pac_monitoring (admin_id, event_type, event_description, status)
       VALUES ($1, $2, $3, $4)`,
      [adminId, 'search_completed', `Se encontraron ${savedProspects.length} prospectos`, 'completed']
    )

    res.json({
      success: true,
      message: `Se encontraron ${savedProspects.length} prospectos`,
      prospects: savedProspects
    })
  } catch (error) {
    console.error('Search prospects error:', error)
    res.status(500).json({ message: 'Error al buscar prospectos', error: error.message })
  }
})

// Obtener prospectos del admin
router.get('/prospects', protect, adminOnly, async (req, res) => {
  try {
    const adminId = req.user.id
    const { status, country, industry } = req.query

    let query = 'SELECT * FROM pac_prospects WHERE admin_id = $1'
    const params = [adminId]

    if (status) {
      query += ` AND status = $${params.length + 1}`
      params.push(status)
    }
    if (country) {
      query += ` AND country = $${params.length + 1}`
      params.push(country)
    }
    if (industry) {
      query += ` AND industry = $${params.length + 1}`
      params.push(industry)
    }

    query += ' ORDER BY created_at DESC'

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    console.error('Get prospects error:', error)
    res.status(500).json({ message: 'Error al obtener prospectos', error: error.message })
  }
})

// ============================================
// MÓDULO 2: ANÁLISIS Y CALIFICACIÓN (IA)
// ============================================

// Analizar prospecto con IA
router.post('/analyze-prospect/:prospectId', protect, adminOnly, async (req, res) => {
  try {
    const { prospectId } = req.params
    const adminId = req.user.id

    // Obtener prospecto
    const prospectResult = await pool.query(
      'SELECT * FROM pac_prospects WHERE id = $1 AND admin_id = $2',
      [prospectId, adminId]
    )

    if (prospectResult.rows.length === 0) {
      return res.status(404).json({ message: 'Prospecto no encontrado' })
    }

    const prospect = prospectResult.rows[0]

    // Simular análisis IA
    const aiAnalysis = {
      classification: prospect.industry.includes('Tech') ? 'Alto potencial IA/ML' : 'Alto potencial Web/App',
      thesis_versions: [
        {
          version: 'CTO',
          title: 'Optimización Técnica',
          content: `Hemos identificado oportunidades de optimización en tu stack tecnológico que podrían mejorar la eficiencia un 40%`
        },
        {
          version: 'CEO',
          title: 'ROI y Crecimiento',
          content: `Nuestras soluciones han ayudado a empresas similares a aumentar sus ingresos en un 35% en 6 meses`
        }
      ],
      key_contacts: [
        { name: 'John Smith', role: 'CTO', email: 'john.smith@company.com', confidence: 0.95 },
        { name: 'Sarah Johnson', role: 'Head of Digital', email: 'sarah.j@company.com', confidence: 0.87 }
      ],
      sentiment_score: 0.78,
      confidence_score: 0.85
    }

    // Guardar análisis
    const analysisResult = await pool.query(
      `INSERT INTO pac_ai_analysis (
        admin_id, prospect_id, analysis_type, classification,
        thesis_versions, key_contacts, sentiment_score, confidence_score
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        adminId, prospectId, 'deep_analysis', aiAnalysis.classification,
        JSON.stringify(aiAnalysis.thesis_versions),
        JSON.stringify(aiAnalysis.key_contacts),
        aiAnalysis.sentiment_score,
        aiAnalysis.confidence_score
      ]
    )

    // Actualizar prospecto con score
    await pool.query(
      `UPDATE pac_prospects SET ai_score = $1, ai_analysis = $2, status = $3 WHERE id = $4`,
      [aiAnalysis.confidence_score, JSON.stringify(aiAnalysis), 'analyzed', prospectId]
    )

    // Registrar evento
    await pool.query(
      `INSERT INTO pac_monitoring (admin_id, event_type, event_description, status, prospect_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [adminId, 'ai_analysis_completed', `Análisis IA completado para ${prospect.company_name}`, 'completed', prospectId]
    )

    res.json({
      success: true,
      message: 'Análisis completado',
      analysis: analysisResult.rows[0]
    })
  } catch (error) {
    console.error('Analyze prospect error:', error)
    res.status(500).json({ message: 'Error al analizar prospecto', error: error.message })
  }
})

// ============================================
// MÓDULO 3: INTERACCIÓN Y AUTOMATIZACIÓN
// ============================================

// Enviar secuencia de email
router.post('/send-email-sequence/:prospectId', protect, adminOnly, async (req, res) => {
  try {
    const { prospectId } = req.params
    const { emailSubject, emailBody, contactEmail } = req.body
    const adminId = req.user.id

    // Validar prospecto
    const prospectResult = await pool.query(
      'SELECT * FROM pac_prospects WHERE id = $1 AND admin_id = $2',
      [prospectId, adminId]
    )

    if (prospectResult.rows.length === 0) {
      return res.status(404).json({ message: 'Prospecto no encontrado' })
    }

    // Guardar secuencia de email
    const sequenceResult = await pool.query(
      `INSERT INTO pac_email_sequences (
        admin_id, prospect_id, sequence_number, email_subject, email_body, status, sent_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *`,
      [adminId, prospectId, 1, emailSubject, emailBody, 'sent']
    )

    // Registrar evento
    await pool.query(
      `INSERT INTO pac_monitoring (admin_id, event_type, event_description, status, prospect_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [adminId, 'email_sent', `Email enviado a ${contactEmail}`, 'completed', prospectId]
    )

    res.json({
      success: true,
      message: 'Email enviado correctamente',
      sequence: sequenceResult.rows[0]
    })
  } catch (error) {
    console.error('Send email sequence error:', error)
    res.status(500).json({ message: 'Error al enviar email', error: error.message })
  }
})

// Obtener secuencias de email
router.get('/email-sequences/:prospectId', protect, adminOnly, async (req, res) => {
  try {
    const { prospectId } = req.params
    const adminId = req.user.id

    const result = await pool.query(
      `SELECT * FROM pac_email_sequences 
       WHERE prospect_id = $1 AND admin_id = $2
       ORDER BY created_at DESC`,
      [prospectId, adminId]
    )

    res.json(result.rows)
  } catch (error) {
    console.error('Get email sequences error:', error)
    res.status(500).json({ message: 'Error al obtener secuencias', error: error.message })
  }
})

// ============================================
// MÓDULO 4: VISUALIZACIÓN Y MONITOREO
// ============================================

// Obtener eventos de monitoreo en tiempo real
router.get('/monitoring-events', protect, adminOnly, async (req, res) => {
  try {
    const adminId = req.user.id
    const { limit = 50 } = req.query

    const result = await pool.query(
      `SELECT * FROM pac_monitoring 
       WHERE admin_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [adminId, parseInt(limit)]
    )

    res.json(result.rows)
  } catch (error) {
    console.error('Get monitoring events error:', error)
    res.status(500).json({ message: 'Error al obtener eventos', error: error.message })
  }
})

// Obtener estadísticas del dashboard
router.get('/dashboard-stats', protect, adminOnly, async (req, res) => {
  try {
    const adminId = req.user.id

    // Total de prospectos
    const prospectsResult = await pool.query(
      'SELECT COUNT(*) as total FROM pac_prospects WHERE admin_id = $1',
      [adminId]
    )

    // Prospectos por estado
    const statusResult = await pool.query(
      `SELECT status, COUNT(*) as count FROM pac_prospects 
       WHERE admin_id = $1 GROUP BY status`,
      [adminId]
    )

    // Emails enviados
    const emailsResult = await pool.query(
      `SELECT COUNT(*) as total FROM pac_email_sequences 
       WHERE admin_id = $1 AND status = 'sent'`,
      [adminId]
    )

    // Análisis completados
    const analysisResult = await pool.query(
      `SELECT COUNT(*) as total FROM pac_ai_analysis WHERE admin_id = $1`,
      [adminId]
    )

    // Score promedio
    const scoreResult = await pool.query(
      `SELECT AVG(ai_score) as avg_score FROM pac_prospects 
       WHERE admin_id = $1 AND ai_score IS NOT NULL`,
      [adminId]
    )

    res.json({
      totalProspects: parseInt(prospectsResult.rows[0].total),
      prospectsByStatus: statusResult.rows,
      emailsSent: parseInt(emailsResult.rows[0].total),
      analysisCompleted: parseInt(analysisResult.rows[0].total),
      averageScore: parseFloat(scoreResult.rows[0].avg_score || 0).toFixed(2)
    })
  } catch (error) {
    console.error('Get dashboard stats error:', error)
    res.status(500).json({ message: 'Error al obtener estadísticas', error: error.message })
  }
})

// Obtener prospectos en mapa
router.get('/map-prospects', protect, adminOnly, async (req, res) => {
  try {
    const adminId = req.user.id

    const result = await pool.query(
      `SELECT id, company_name, latitude, longitude, ai_score, status, industry
       FROM pac_prospects 
       WHERE admin_id = $1 AND latitude IS NOT NULL AND longitude IS NOT NULL
       ORDER BY ai_score DESC NULLS LAST`,
      [adminId]
    )

    res.json(result.rows)
  } catch (error) {
    console.error('Get map prospects error:', error)
    res.status(500).json({ message: 'Error al obtener prospectos para mapa', error: error.message })
  }
})

export default router
