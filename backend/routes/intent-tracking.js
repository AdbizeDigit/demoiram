import express from 'express'
import { protect } from '../middleware/auth.js'
import { pool } from '../config/database.js'
import { analyzeWithDeepSeek } from '../services/deepseek.js'
import { trackedSmartFetch } from '../services/proxy-manager.js'
import * as cheerio from 'cheerio'

const router = express.Router()

// ==========================================
// 🎯 INTENT DATA TRACKING SYSTEM
// Sistema para rastrear señales de intención de compra
// ==========================================

/**
 * 1. TRACK WEBSITE VISITS
 * Rastrea cuando un lead visita tu website
 */
router.post('/track-website-visit', async (req, res) => {
  try {
    const {
      leadEmail,
      leadCompany,
      pageVisited,
      timeOnPage,
      referrer,
      device,
      location
    } = req.body

    // Calcular intent score basado en la página visitada
    const intentScore = calculatePageIntentScore(pageVisited, timeOnPage)

    await pool.query(`
      INSERT INTO intent_signals (
        lead_email, lead_company, signal_type, signal_data,
        intent_score, created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
    `, [
      leadEmail,
      leadCompany,
      'website_visit',
      JSON.stringify({
        page: pageVisited,
        timeOnPage,
        referrer,
        device,
        location
      }),
      intentScore
    ])

    // Check si cruza threshold para alert
    await checkIntentThreshold(leadEmail, leadCompany)

    res.json({
      success: true,
      intentScore,
      message: 'Website visit tracked'
    })

  } catch (error) {
    console.error('Error tracking website visit:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * 2. TRACK CONTENT DOWNLOADS
 * Rastrea descargas de contenido (whitepapers, case studies, etc.)
 */
router.post('/track-content-download', protect, async (req, res) => {
  try {
    const {
      leadEmail,
      leadCompany,
      contentType,
      contentTitle,
      contentTopic
    } = req.body

    const intentScore = calculateContentIntentScore(contentType, contentTopic)

    await pool.query(`
      INSERT INTO intent_signals (
        user_id, lead_email, lead_company, signal_type, signal_data,
        intent_score, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `, [
      req.user.id,
      leadEmail,
      leadCompany,
      'content_download',
      JSON.stringify({
        contentType,
        contentTitle,
        contentTopic
      }),
      intentScore
    ])

    await checkIntentThreshold(leadEmail, leadCompany)

    res.json({
      success: true,
      intentScore,
      message: 'Content download tracked'
    })

  } catch (error) {
    console.error('Error tracking content download:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * 3. TRACK EMAIL ENGAGEMENT
 * Rastrea opens y clicks de emails
 */
router.post('/track-email-engagement', protect, async (req, res) => {
  try {
    const {
      leadEmail,
      leadCompany,
      emailSubject,
      action, // 'open' | 'click'
      linkClicked
    } = req.body

    const intentScore = action === 'click' ? 15 : 5

    await pool.query(`
      INSERT INTO intent_signals (
        user_id, lead_email, lead_company, signal_type, signal_data,
        intent_score, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `, [
      req.user.id,
      leadEmail,
      leadCompany,
      `email_${action}`,
      JSON.stringify({
        emailSubject,
        linkClicked
      }),
      intentScore
    ])

    await checkIntentThreshold(leadEmail, leadCompany)

    res.json({
      success: true,
      intentScore,
      message: `Email ${action} tracked`
    })

  } catch (error) {
    console.error('Error tracking email engagement:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * 4. TRACK COMPETITOR RESEARCH
 * Detecta cuando un lead está investigando competidores o alternativas
 */
router.post('/detect-competitor-research', protect, async (req, res) => {
  try {
    const { leadCompany, searchQuery } = req.body

    // Buscar señales de investigación de competidores
    const competitorKeywords = [
      'vs', 'alternative', 'comparison', 'review', 'pricing',
      'mejor que', 'alternativa a', 'comparación'
    ]

    const isResearchingCompetitors = competitorKeywords.some(keyword =>
      searchQuery.toLowerCase().includes(keyword)
    )

    if (isResearchingCompetitors) {
      const intentScore = 60 // High intent

      await pool.query(`
        INSERT INTO intent_signals (
          user_id, lead_company, signal_type, signal_data,
          intent_score, created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
      `, [
        req.user.id,
        leadCompany,
        'competitor_research',
        JSON.stringify({ searchQuery }),
        intentScore
      ])

      await checkIntentThreshold(null, leadCompany)

      res.json({
        success: true,
        isResearchingCompetitors: true,
        intentScore,
        recommendation: 'High intent detected - contact ASAP with competitive pitch'
      })
    } else {
      res.json({
        success: true,
        isResearchingCompetitors: false
      })
    }

  } catch (error) {
    console.error('Error detecting competitor research:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * 5. TRACK SOCIAL MEDIA ENGAGEMENT
 * Rastrea engagement en social media (LinkedIn, Twitter, etc.)
 */
router.post('/track-social-engagement', protect, async (req, res) => {
  try {
    const {
      leadEmail,
      leadCompany,
      platform,
      engagementType, // 'like', 'comment', 'share', 'follow'
      contentUrl
    } = req.body

    const engagementScores = {
      'follow': 10,
      'like': 5,
      'comment': 20,
      'share': 25
    }

    const intentScore = engagementScores[engagementType] || 5

    await pool.query(`
      INSERT INTO intent_signals (
        user_id, lead_email, lead_company, signal_type, signal_data,
        intent_score, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `, [
      req.user.id,
      leadEmail,
      leadCompany,
      'social_engagement',
      JSON.stringify({
        platform,
        engagementType,
        contentUrl
      }),
      intentScore
    ])

    await checkIntentThreshold(leadEmail, leadCompany)

    res.json({
      success: true,
      intentScore,
      message: 'Social engagement tracked'
    })

  } catch (error) {
    console.error('Error tracking social engagement:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * 6. GET INTENT SCORE FOR LEAD
 * Obtiene el intent score acumulado de un lead
 */
router.get('/intent-score/:identifier', protect, async (req, res) => {
  try {
    const { identifier } = req.params // email o company
    const { days = 30 } = req.query

    const result = await pool.query(`
      SELECT
        lead_email,
        lead_company,
        SUM(intent_score) as total_intent_score,
        COUNT(*) as signal_count,
        MAX(created_at) as last_signal_date,
        json_agg(json_build_object(
          'type', signal_type,
          'score', intent_score,
          'data', signal_data,
          'date', created_at
        ) ORDER BY created_at DESC) as signals
      FROM intent_signals
      WHERE (lead_email = $1 OR lead_company = $1)
        AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY lead_email, lead_company
    `, [identifier])

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        intentScore: 0,
        signals: [],
        message: 'No intent signals found'
      })
    }

    const data = result.rows[0]

    // Generar insights con IA
    const prompt = `Analiza las siguientes señales de intención de compra:

TOTAL INTENT SCORE: ${data.total_intent_score}
NÚMERO DE SEÑALES: ${data.signal_count}
ÚLTIMA SEÑAL: ${data.last_signal_date}

SEÑALES RECIENTES:
${data.signals.slice(0, 10).map((s, i) => `${i + 1}. ${s.type} (score: ${s.score}) - ${new Date(s.date).toLocaleDateString()}`).join('\n')}

Genera en JSON:
{
  "intent_level": "hot/warm/cold",
  "buying_stage": "awareness/consideration/decision",
  "recommended_action": "acción específica inmediata",
  "optimal_timing": "cuándo contactar",
  "channel": "mejor canal de contacto",
  "message_angle": "ángulo del mensaje",
  "urgency": "low/medium/high/critical"
}`

    let aiInsights = null
    try {
      const aiResponse = await analyzeWithDeepSeek(prompt)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      aiInsights = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch (e) {
      console.error('Error generating AI insights:', e)
    }

    res.json({
      success: true,
      lead: {
        email: data.lead_email,
        company: data.lead_company
      },
      intentScore: data.total_intent_score,
      signalCount: data.signal_count,
      lastSignalDate: data.last_signal_date,
      signals: data.signals,
      aiInsights
    })

  } catch (error) {
    console.error('Error getting intent score:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * 7. GET HOT LEADS BASED ON INTENT
 * Lista de leads con highest intent en los últimos días
 */
router.get('/hot-leads', protect, async (req, res) => {
  try {
    const { days = 7, minScore = 50, limit = 20 } = req.query

    const result = await pool.query(`
      SELECT
        lead_email,
        lead_company,
        SUM(intent_score) as total_intent_score,
        COUNT(*) as signal_count,
        MAX(created_at) as last_signal_date,
        json_agg(DISTINCT signal_type) as signal_types
      FROM intent_signals
      WHERE user_id = $1
        AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY lead_email, lead_company
      HAVING SUM(intent_score) >= $2
      ORDER BY total_intent_score DESC, last_signal_date DESC
      LIMIT $3
    `, [req.user.id, minScore, limit])

    res.json({
      success: true,
      hotLeads: result.rows,
      total: result.rows.length,
      recommendation: `${result.rows.length} leads con high intent detectados - contactar ASAP`
    })

  } catch (error) {
    console.error('Error getting hot leads:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * 8. TRACK PRICING PAGE VISITS
 * Señal ultra-fuerte de intent
 */
router.post('/track-pricing-visit', async (req, res) => {
  try {
    const { leadEmail, leadCompany, pricingPlan, timeOnPage } = req.body

    // Pricing page visits = high intent
    let intentScore = 40

    if (timeOnPage > 60) intentScore += 20 // Más de 1 minuto
    if (pricingPlan) intentScore += 30 // Vio plan específico

    await pool.query(`
      INSERT INTO intent_signals (
        lead_email, lead_company, signal_type, signal_data,
        intent_score, created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
    `, [
      leadEmail,
      leadCompany,
      'pricing_page_visit',
      JSON.stringify({ pricingPlan, timeOnPage }),
      intentScore
    ])

    // Trigger immediate alert
    await createHighIntentAlert(leadEmail, leadCompany, intentScore)

    res.json({
      success: true,
      intentScore,
      alert: 'High intent alert created - contact immediately!',
      recommendedAction: 'Call within 1 hour or send personalized pricing email'
    })

  } catch (error) {
    console.error('Error tracking pricing visit:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// ==========================================
// 🔔 INTELLIGENT ALERTS SYSTEM
// ==========================================

/**
 * CREATE ALERT RULE
 * Configura reglas de alertas automáticas
 */
router.post('/alerts/create-rule', protect, async (req, res) => {
  try {
    const {
      ruleName,
      condition, // 'intent_score_threshold', 'specific_signal', 'signal_frequency'
      threshold,
      signalTypes,
      frequency,
      notificationChannels, // ['email', 'slack', 'webhook']
      enabled = true
    } = req.body

    const result = await pool.query(`
      INSERT INTO alert_rules (
        user_id, rule_name, condition_type, threshold,
        signal_types, frequency, notification_channels, enabled, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *
    `, [
      req.user.id,
      ruleName,
      condition,
      threshold,
      JSON.stringify(signalTypes),
      frequency,
      JSON.stringify(notificationChannels),
      enabled
    ])

    res.json({
      success: true,
      rule: result.rows[0],
      message: 'Alert rule created successfully'
    })

  } catch (error) {
    console.error('Error creating alert rule:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * GET ACTIVE ALERTS
 * Obtiene alertas activas del usuario
 */
router.get('/alerts/active', protect, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        a.*,
        json_build_object(
          'email', l.lead_email,
          'company', l.lead_company,
          'intentScore', l.intent_score
        ) as lead_info
      FROM alerts a
      LEFT JOIN intent_signals l ON a.lead_identifier = l.lead_email OR a.lead_identifier = l.lead_company
      WHERE a.user_id = $1 AND a.status = 'active'
      ORDER BY a.created_at DESC
      LIMIT 50
    `, [req.user.id])

    res.json({
      success: true,
      alerts: result.rows,
      total: result.rows.length
    })

  } catch (error) {
    console.error('Error getting active alerts:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * MARK ALERT AS ACTIONED
 */
router.post('/alerts/:alertId/action', protect, async (req, res) => {
  try {
    const { alertId } = req.params
    const { action, notes } = req.body

    await pool.query(`
      UPDATE alerts
      SET status = 'actioned', action_taken = $1, action_notes = $2, actioned_at = NOW()
      WHERE id = $3 AND user_id = $4
    `, [action, notes, alertId, req.user.id])

    res.json({
      success: true,
      message: 'Alert marked as actioned'
    })

  } catch (error) {
    console.error('Error marking alert as actioned:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function calculatePageIntentScore(pageUrl, timeOnPage) {
  let score = 5 // base score

  // High-intent pages
  if (pageUrl.includes('/pricing')) score += 40
  if (pageUrl.includes('/demo')) score += 35
  if (pageUrl.includes('/trial')) score += 35
  if (pageUrl.includes('/contact')) score += 25
  if (pageUrl.includes('/features')) score += 15
  if (pageUrl.includes('/case-study') || pageUrl.includes('/customers')) score += 20

  // Time on page bonus
  if (timeOnPage > 120) score += 15
  else if (timeOnPage > 60) score += 10
  else if (timeOnPage > 30) score += 5

  return score
}

function calculateContentIntentScore(contentType, contentTopic) {
  const typeScores = {
    'case_study': 30,
    'whitepaper': 25,
    'ebook': 20,
    'webinar': 35,
    'product_demo': 40,
    'pricing_guide': 45,
    'roi_calculator': 50
  }

  let score = typeScores[contentType] || 15

  // Topic-based bonus
  const highIntentTopics = ['pricing', 'roi', 'implementation', 'migration', 'comparison']
  if (highIntentTopics.some(topic => contentTopic?.toLowerCase().includes(topic))) {
    score += 20
  }

  return score
}

async function checkIntentThreshold(leadEmail, leadCompany) {
  // Check si el lead ha cruzado threshold de 100 puntos en últimos 7 días
  const result = await pool.query(`
    SELECT SUM(intent_score) as total_score
    FROM intent_signals
    WHERE (lead_email = $1 OR lead_company = $2)
      AND created_at >= NOW() - INTERVAL '7 days'
  `, [leadEmail, leadCompany])

  const totalScore = result.rows[0]?.total_score || 0

  if (totalScore >= 100) {
    await createHighIntentAlert(leadEmail, leadCompany, totalScore)
  }
}

async function createHighIntentAlert(leadEmail, leadCompany, intentScore) {
  try {
    await pool.query(`
      INSERT INTO alerts (
        lead_identifier, alert_type, alert_data, severity, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
    `, [
      leadEmail || leadCompany,
      'high_intent_detected',
      JSON.stringify({
        email: leadEmail,
        company: leadCompany,
        intentScore
      }),
      'critical',
      'active'
    ])
  } catch (error) {
    console.error('Error creating alert:', error)
  }
}

// Crear tablas necesarias
const tables = [
  `CREATE TABLE IF NOT EXISTS intent_signals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    lead_email VARCHAR(255),
    lead_company VARCHAR(255),
    signal_type VARCHAR(100),
    signal_data JSONB,
    intent_score INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS alert_rules (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    rule_name VARCHAR(255),
    condition_type VARCHAR(100),
    threshold INTEGER,
    signal_types JSONB,
    frequency VARCHAR(50),
    notification_channels JSONB,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    lead_identifier VARCHAR(255),
    alert_type VARCHAR(100),
    alert_data JSONB,
    severity VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active',
    action_taken VARCHAR(255),
    action_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    actioned_at TIMESTAMP
  )`,

  `CREATE INDEX IF NOT EXISTS idx_intent_signals_email ON intent_signals(lead_email)`,
  `CREATE INDEX IF NOT EXISTS idx_intent_signals_company ON intent_signals(lead_company)`,
  `CREATE INDEX IF NOT EXISTS idx_intent_signals_date ON intent_signals(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status)`,
  `CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id, status)`
]

tables.forEach(tableSQL => {
  pool.query(tableSQL).catch(err => console.error('Error creating table:', err))
})

export default router
