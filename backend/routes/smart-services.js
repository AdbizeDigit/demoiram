import express from 'express'
import { protect } from '../middleware/auth.js'
import { emailValidator, emailListCleaner } from '../services/email-validator.js'
import { mlLeadScorer } from '../services/ml-lead-scoring.js'
import { proxyManager, rateLimiter, requestAnalytics } from '../services/proxy-manager.js'
import { pool } from '../config/database.js'

const router = express.Router()

// ==========================================
// 📧 EMAIL VALIDATION & VERIFICATION
// ==========================================

/**
 * Valida un solo email
 */
router.post('/validate-email', protect, async (req, res) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email es requerido'
      })
    }

    const result = await emailValidator.validateComplete(email)

    res.json({
      success: true,
      validation: result
    })

  } catch (error) {
    console.error('Error validating email:', error)
    res.status(500).json({
      success: false,
      message: 'Error validando email',
      error: error.message
    })
  }
})

/**
 * Valida múltiples emails en batch
 */
router.post('/validate-emails-batch', protect, async (req, res) => {
  try {
    const { emails } = req.body

    if (!emails || !Array.isArray(emails)) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de emails'
      })
    }

    const result = await emailValidator.validateBatch(emails)

    // Guardar resultados en BD
    await pool.query(`
      INSERT INTO email_validations (
        user_id, total_emails, valid_emails, deliverable_emails,
        corporate_emails, validation_data, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `, [
      req.user.id,
      result.summary.total,
      result.summary.valid,
      result.summary.deliverable,
      result.summary.corporate,
      JSON.stringify(result)
    ])

    res.json({
      success: true,
      ...result
    })

  } catch (error) {
    console.error('Error validating emails batch:', error)
    res.status(500).json({
      success: false,
      message: 'Error validando emails',
      error: error.message
    })
  }
})

/**
 * Limpia una lista de emails
 */
router.post('/clean-email-list', protect, async (req, res) => {
  try {
    const { emails, options } = req.body

    if (!emails || !Array.isArray(emails)) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de emails'
      })
    }

    const result = await emailListCleaner.cleanList(emails, options)

    res.json({
      success: true,
      ...result,
      recommendation: `Removidos ${result.stats.removedCount} emails (${result.stats.removalRate}). Lista limpia lista para outreach.`
    })

  } catch (error) {
    console.error('Error cleaning email list:', error)
    res.status(500).json({
      success: false,
      message: 'Error limpiando lista de emails',
      error: error.message
    })
  }
})

// ==========================================
// 🤖 ML LEAD SCORING
// ==========================================

/**
 * Score un lead individual con ML
 */
router.post('/ml-score-lead', protect, async (req, res) => {
  try {
    const { lead } = req.body

    if (!lead) {
      return res.status(400).json({
        success: false,
        message: 'Lead data es requerido'
      })
    }

    const scoringResult = mlLeadScorer.calculatePredictiveScore(lead)

    // Generar recomendaciones con IA
    const recommendations = await mlLeadScorer.generateActionRecommendations(lead, scoringResult)

    // Guardar scoring en BD
    await pool.query(`
      INSERT INTO ml_lead_scores (
        user_id, lead_data, score, quality, conversion_probability,
        features, recommendations, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `, [
      req.user.id,
      JSON.stringify(lead),
      scoringResult.score,
      scoringResult.quality,
      scoringResult.conversionProbability,
      JSON.stringify(scoringResult.features),
      JSON.stringify(recommendations)
    ])

    res.json({
      success: true,
      lead,
      scoring: scoringResult,
      recommendations,
      action: `Este es un lead ${scoringResult.quality} con ${scoringResult.conversionProbability}% de probabilidad de conversión`
    })

  } catch (error) {
    console.error('Error scoring lead with ML:', error)
    res.status(500).json({
      success: false,
      message: 'Error en ML scoring',
      error: error.message
    })
  }
})

/**
 * Score múltiples leads en batch
 */
router.post('/ml-score-batch', protect, async (req, res) => {
  try {
    const { leads } = req.body

    if (!leads || !Array.isArray(leads)) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de leads'
      })
    }

    const result = await mlLeadScorer.scoreBatch(leads)

    res.json({
      success: true,
      ...result,
      insights: {
        topLeadsCount: result.topLeads.length,
        avgScore: result.summary.avgScore.toFixed(2),
        avgConversionProb: result.summary.avgConversionProbability.toFixed(2),
        hotLeadsRecommendation: `Contacta inmediatamente a los ${result.summary.hot} leads HOT`
      }
    })

  } catch (error) {
    console.error('Error scoring leads batch:', error)
    res.status(500).json({
      success: false,
      message: 'Error en batch scoring',
      error: error.message
    })
  }
})

/**
 * Obtiene importancia de features del modelo ML
 */
router.get('/ml-feature-importance', protect, async (req, res) => {
  try {
    const importance = mlLeadScorer.getFeatureImportance()

    res.json({
      success: true,
      ...importance,
      explanation: 'Estos son los factores más importantes que determinan la calidad de un lead'
    })

  } catch (error) {
    console.error('Error getting feature importance:', error)
    res.status(500).json({
      success: false,
      message: 'Error obteniendo feature importance',
      error: error.message
    })
  }
})

/**
 * Entrena el modelo ML con datos históricos
 */
router.post('/ml-train-model', protect, async (req, res) => {
  try {
    const { historicalLeads } = req.body

    if (!historicalLeads || !Array.isArray(historicalLeads)) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de leads históricos con status (won/lost)'
      })
    }

    const trainingResult = mlLeadScorer.trainModel(historicalLeads)

    res.json({
      success: true,
      ...trainingResult,
      message: 'Modelo entrenado exitosamente con datos históricos'
    })

  } catch (error) {
    console.error('Error training ML model:', error)
    res.status(500).json({
      success: false,
      message: 'Error entrenando modelo',
      error: error.message
    })
  }
})

// ==========================================
// 🔒 PROXY & RATE LIMITING MANAGEMENT
// ==========================================

/**
 * Agregar proxies al pool
 */
router.post('/proxy/add', protect, async (req, res) => {
  try {
    const { proxies } = req.body

    if (!proxies || (!Array.isArray(proxies) && typeof proxies !== 'string')) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un proxy (string) o array de proxies'
      })
    }

    if (Array.isArray(proxies)) {
      proxyManager.addProxies(proxies)
    } else {
      proxyManager.addProxy(proxies)
    }

    res.json({
      success: true,
      message: `${Array.isArray(proxies) ? proxies.length : 1} proxy(s) agregado(s)`,
      stats: proxyManager.getStats()
    })

  } catch (error) {
    console.error('Error adding proxies:', error)
    res.status(500).json({
      success: false,
      message: 'Error agregando proxies',
      error: error.message
    })
  }
})

/**
 * Obtiene estadísticas de proxies
 */
router.get('/proxy/stats', protect, async (req, res) => {
  try {
    const stats = proxyManager.getStats()

    res.json({
      success: true,
      proxies: stats,
      summary: {
        total: stats.length,
        active: stats.filter(p => !p.blocked && !p.isBlacklisted).length,
        blocked: stats.filter(p => p.blocked).length,
        blacklisted: stats.filter(p => p.isBlacklisted).length,
        avgSuccessRate: (stats.reduce((sum, p) => sum + p.successRate, 0) / stats.length).toFixed(2)
      }
    })

  } catch (error) {
    console.error('Error getting proxy stats:', error)
    res.status(500).json({
      success: false,
      message: 'Error obteniendo estadísticas',
      error: error.message
    })
  }
})

/**
 * Reset estadísticas de proxies
 */
router.post('/proxy/reset-stats', protect, async (req, res) => {
  try {
    proxyManager.resetStats()

    res.json({
      success: true,
      message: 'Estadísticas de proxies reseteadas'
    })

  } catch (error) {
    console.error('Error resetting proxy stats:', error)
    res.status(500).json({
      success: false,
      message: 'Error reseteando estadísticas',
      error: error.message
    })
  }
})

/**
 * Configura rate limit para un dominio
 */
router.post('/rate-limit/set', protect, async (req, res) => {
  try {
    const { domain, requestsPerMinute } = req.body

    if (!domain || !requestsPerMinute) {
      return res.status(400).json({
        success: false,
        message: 'domain y requestsPerMinute son requeridos'
      })
    }

    rateLimiter.setLimit(domain, requestsPerMinute)

    res.json({
      success: true,
      message: `Rate limit configurado: ${requestsPerMinute} requests/min para ${domain}`
    })

  } catch (error) {
    console.error('Error setting rate limit:', error)
    res.status(500).json({
      success: false,
      message: 'Error configurando rate limit',
      error: error.message
    })
  }
})

/**
 * Obtiene estadísticas de rate limiting
 */
router.get('/rate-limit/stats', protect, async (req, res) => {
  try {
    const stats = rateLimiter.getStats()

    res.json({
      success: true,
      domains: stats,
      summary: {
        totalDomains: stats.length,
        totalQueuedRequests: stats.reduce((sum, d) => sum + d.queueLength, 0),
        processing: stats.filter(d => d.processing).length
      }
    })

  } catch (error) {
    console.error('Error getting rate limit stats:', error)
    res.status(500).json({
      success: false,
      message: 'Error obteniendo estadísticas',
      error: error.message
    })
  }
})

/**
 * Obtiene analytics de requests
 */
router.get('/request-analytics', protect, async (req, res) => {
  try {
    const analytics = requestAnalytics.getStats()

    res.json({
      success: true,
      analytics,
      insights: {
        performanceSummary: `${analytics.successful} de ${analytics.total} requests exitosos (${(analytics.successRate * 100).toFixed(2)}%)`,
        avgResponseTime: `${analytics.avgDuration.toFixed(0)}ms`,
        requestsLastHour: analytics.lastHour,
        topDomains: Object.entries(analytics.domainStats)
          .sort((a, b) => b[1].total - a[1].total)
          .slice(0, 5)
          .map(([domain, stats]) => ({
            domain,
            requests: stats.total,
            successRate: `${(stats.successRate * 100).toFixed(2)}%`,
            avgDuration: `${stats.avgDuration.toFixed(0)}ms`
          }))
      }
    })

  } catch (error) {
    console.error('Error getting request analytics:', error)
    res.status(500).json({
      success: false,
      message: 'Error obteniendo analytics',
      error: error.message
    })
  }
})

// Crear tablas necesarias
const tables = [
  `CREATE TABLE IF NOT EXISTS email_validations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    total_emails INTEGER,
    valid_emails INTEGER,
    deliverable_emails INTEGER,
    corporate_emails INTEGER,
    validation_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS ml_lead_scores (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    lead_data JSONB,
    score INTEGER,
    quality VARCHAR(50),
    conversion_probability INTEGER,
    features JSONB,
    recommendations JSONB,
    created_at TIMESTAMP DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_ml_scores_quality ON ml_lead_scores(quality)`,
  `CREATE INDEX IF NOT EXISTS idx_ml_scores_score ON ml_lead_scores(score DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_email_validations_user ON email_validations(user_id)`
]

tables.forEach(tableSQL => {
  pool.query(tableSQL).catch(err => console.error('Error creating table:', err))
})

export default router
