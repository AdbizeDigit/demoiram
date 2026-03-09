import express from 'express'
import { protect } from '../middleware/auth.js'
import { pool } from '../config/database.js'
import axios from 'axios'

const router = express.Router()

// ==========================================
// AI ASSISTANT PARA ANÁLISIS DE LEADS
// ==========================================

// Analizar lead con IA
router.post('/analyze-lead', protect, async (req, res) => {
  try {
    const { leadId, leadData } = req.body

    // Construir prompt para IA
    const prompt = `
Analiza este lead B2B y proporciona recomendaciones estratégicas:

INFORMACIÓN DEL LEAD:
- Nombre: ${leadData.name || 'N/A'}
- Empresa: ${leadData.company || 'N/A'}
- Cargo: ${leadData.title || 'N/A'}
- Industria: ${leadData.industry || 'N/A'}
- Score: ${leadData.leadScore || 'N/A'}/100
- Calidad: ${leadData.leadQuality || 'N/A'}
- Señales de compra: ${JSON.stringify(leadData.buyingSignals || [])}
- Empleados: ${leadData.employees || 'N/A'}
- Descripción: ${leadData.description || leadData.content || 'N/A'}

TAREAS:
1. Evaluar el potencial de conversión (1-10)
2. Identificar pain points probables
3. Sugerir ángulo de venta óptimo
4. Recomendar siguientes 3 acciones
5. Predecir objeciones y cómo superarlas
6. Estimar tamaño de deal (S/M/L/XL)

Responde en formato JSON estructurado.
`

    // Llamar a DeepSeek
    const deepseekResponse = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'Eres un experto en ventas B2B y análisis de leads. Proporcionas insights accionables basados en datos.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )

    const analysis = deepseekResponse.data.choices[0].message.content

    // Guardar análisis
    await pool.query(
      `INSERT INTO ai_lead_analysis
       (user_id, lead_id, lead_data, analysis, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [req.user.id, leadId, JSON.stringify(leadData), analysis]
    )

    res.json({
      success: true,
      analysis: analysis
    })
  } catch (error) {
    console.error('Error analizando lead:', error)
    res.status(500).json({ error: error.message })
  }
})

// Generar estrategia de outreach
router.post('/generate-strategy', protect, async (req, res) => {
  try {
    const { leadData, goal } = req.body

    const prompt = `
Genera una estrategia completa de outreach para este lead B2B:

LEAD:
${JSON.stringify(leadData, null, 2)}

OBJETIVO: ${goal || 'Agendar demo'}

GENERA:
1. Secuencia de 5 touchpoints (email, LinkedIn, llamada, etc.)
2. Timing óptimo para cada touchpoint
3. Mensaje clave para cada touchpoint
4. Call-to-action específico
5. Plan B si no responde

Formato: JSON estructurado con cada touchpoint detallado.
`

    const deepseekResponse = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'Eres un experto en estrategias de outreach B2B.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.4,
        max_tokens: 1500
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )

    const strategy = deepseekResponse.data.choices[0].message.content

    res.json({
      success: true,
      strategy: strategy
    })
  } catch (error) {
    console.error('Error generando estrategia:', error)
    res.status(500).json({ error: error.message })
  }
})

// Predecir probabilidad de cierre
router.post('/predict-close-probability', protect, async (req, res) => {
  try {
    const { leadData, interactions } = req.body

    // Calcular probabilidad usando factores ponderados
    let probability = 0
    const factors = []

    // Factor 1: Lead Score (30%)
    if (leadData.leadScore) {
      const scoreWeight = (leadData.leadScore / 100) * 30
      probability += scoreWeight
      factors.push({ factor: 'Lead Score', weight: scoreWeight.toFixed(1) })
    }

    // Factor 2: Señales de compra (25%)
    if (leadData.buyingSignals && leadData.buyingSignals.length > 0) {
      const signalsWeight = Math.min(leadData.buyingSignals.length * 8, 25)
      probability += signalsWeight
      factors.push({ factor: 'Señales de Compra', weight: signalsWeight.toFixed(1) })
    }

    // Factor 3: Engagement (20%)
    if (interactions && interactions.length > 0) {
      const engagementWeight = Math.min(interactions.length * 4, 20)
      probability += engagementWeight
      factors.push({ factor: 'Nivel de Engagement', weight: engagementWeight.toFixed(1) })
    }

    // Factor 4: Fit de empresa (15%)
    let fitWeight = 0
    if (leadData.employees) {
      const empRange = leadData.employees.split('-').map(n => parseInt(n))
      const avgEmployees = empRange.length === 2 ? (empRange[0] + empRange[1]) / 2 : 0
      if (avgEmployees >= 100) fitWeight = 15
      else if (avgEmployees >= 50) fitWeight = 10
      else if (avgEmployees >= 25) fitWeight = 5
    }
    probability += fitWeight
    if (fitWeight > 0) factors.push({ factor: 'Tamaño de Empresa', weight: fitWeight.toFixed(1) })

    // Factor 5: Recencia (10%)
    if (leadData.created_at) {
      const daysOld = (Date.now() - new Date(leadData.created_at)) / (1000 * 60 * 60 * 24)
      const recencyWeight = daysOld < 7 ? 10 : daysOld < 14 ? 7 : daysOld < 30 ? 4 : 0
      probability += recencyWeight
      if (recencyWeight > 0) factors.push({ factor: 'Recencia', weight: recencyWeight.toFixed(1) })
    }

    // Normalizar a 0-100
    probability = Math.min(100, Math.max(0, probability))

    // Categorizar
    let category = 'low'
    let recommendation = ''

    if (probability >= 75) {
      category = 'very_high'
      recommendation = 'Prioridad máxima. Contactar hoy. Alta probabilidad de cierre.'
    } else if (probability >= 60) {
      category = 'high'
      recommendation = 'Alta prioridad. Contactar esta semana. Buen potencial.'
    } else if (probability >= 40) {
      category = 'medium'
      recommendation = 'Prioridad media. Nurturing constante.'
    } else {
      category = 'low'
      recommendation = 'Prioridad baja. Secuencia de largo plazo.'
    }

    res.json({
      success: true,
      probability: probability.toFixed(1),
      category,
      recommendation,
      factors
    })
  } catch (error) {
    console.error('Error prediciendo probabilidad:', error)
    res.status(500).json({ error: error.message })
  }
})

// ==========================================
// RE-ENRIQUECIMIENTO AUTOMÁTICO
// ==========================================

// Re-enriquecer lead
router.post('/re-enrich/:leadId', protect, async (req, res) => {
  try {
    const user = req.user
    const { leadId } = req.params

    // Obtener lead
    const leadResult = await pool.query(
      `SELECT * FROM captured_leads WHERE id = $1 AND user_id = $2`,
      [leadId, user.id]
    )

    if (leadResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lead no encontrado' })
    }

    const lead = leadResult.rows[0]
    const leadData = lead.lead_data
    const companyDomain = leadData.website?.replace(/^www\./, '')

    if (!companyDomain) {
      return res.status(400).json({ error: 'Lead no tiene dominio para enriquecer' })
    }

    // Enriquecer con APIs externas
    const enrichedData = await enrichLeadData(companyDomain, leadData.company)

    // Actualizar lead
    const updatedLeadData = {
      ...leadData,
      ...enrichedData.company,
      enriched_at: new Date().toISOString(),
      enrichment_sources: enrichedData.enrichmentSources
    }

    await pool.query(
      `UPDATE captured_leads
       SET lead_data = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(updatedLeadData), leadId]
    )

    // Registrar enriquecimiento
    await pool.query(
      `INSERT INTO lead_interactions
       (lead_id, interaction_type, subject, content, created_at)
       VALUES ($1, 're_enrichment', 'Lead re-enriquecido', $2, NOW())`,
      [leadId, JSON.stringify(enrichedData)]
    )

    res.json({
      success: true,
      enrichedData,
      message: 'Lead re-enriquecido exitosamente'
    })
  } catch (error) {
    console.error('Error re-enriqueciendo lead:', error)
    res.status(500).json({ error: error.message })
  }
})

// Programar re-enriquecimiento automático
router.post('/schedule-auto-enrichment', protect, async (req, res) => {
  try {
    const user = req.user
    const {
      frequency, // 'weekly', 'monthly', 'quarterly'
      criteria,
      enabled
    } = req.body

    const result = await pool.query(
      `INSERT INTO auto_enrichment_jobs
       (user_id, frequency, criteria, enabled, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [user.id, frequency, JSON.stringify(criteria || {}), enabled !== false]
    )

    res.json({
      success: true,
      job: result.rows[0]
    })
  } catch (error) {
    console.error('Error programando re-enriquecimiento:', error)
    res.status(500).json({ error: error.message })
  }
})

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================

async function enrichLeadData(companyDomain, companyName) {
  const enrichedData = {
    company: {},
    contacts: [],
    socialMedia: {},
    enrichmentSources: []
  }

  // Hunter.io
  const hunterApiKey = process.env.HUNTER_API_KEY
  if (hunterApiKey && companyDomain) {
    try {
      const hunterUrl = `https://api.hunter.io/v2/domain-search?domain=${companyDomain}&api_key=${hunterApiKey}`
      const hunterResp = await axios.get(hunterUrl, { timeout: 5000 })

      if (hunterResp.data && hunterResp.data.data) {
        const emails = hunterResp.data.data.emails || []
        enrichedData.contacts = emails.slice(0, 5).map(e => ({
          firstName: e.first_name,
          lastName: e.last_name,
          email: e.value,
          position: e.position,
          verified: e.verification?.status === 'valid'
        }))
        enrichedData.enrichmentSources.push('Hunter.io')
      }
    } catch (err) {
      console.error('Hunter.io error:', err.message)
    }
  }

  // Clearbit
  const clearbitApiKey = process.env.CLEARBIT_API_KEY
  if (clearbitApiKey && companyDomain) {
    try {
      const clearbitUrl = `https://company.clearbit.com/v2/companies/find?domain=${companyDomain}`
      const clearbitResp = await axios.get(clearbitUrl, {
        headers: { 'Authorization': `Bearer ${clearbitApiKey}` },
        timeout: 5000
      })

      if (clearbitResp.data) {
        const data = clearbitResp.data
        enrichedData.company = {
          employees: data.metrics?.employees,
          founded: data.foundedYear,
          revenue: data.metrics?.estimatedAnnualRevenue,
          techStack: data.tech || []
        }
        enrichedData.enrichmentSources.push('Clearbit')
      }
    } catch (err) {
      console.error('Clearbit error:', err.message)
    }
  }

  // Si no hay API keys, datos simulados
  if (enrichedData.enrichmentSources.length === 0) {
    enrichedData.company = {
      employees: 100 + Math.floor(Math.random() * 400),
      founded: 2010 + Math.floor(Math.random() * 14),
      revenue: `${Math.floor(Math.random() * 50)}M`,
      lastUpdated: new Date().toISOString()
    }
    enrichedData.enrichmentSources.push('Demo Data')
  }

  return enrichedData
}

export default router
