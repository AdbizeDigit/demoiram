import express from 'express'
import { protect } from '../middleware/auth.js'
import { pool } from '../config/database.js'
import { analyzeWithDeepSeek } from '../services/deepseek.js'

const router = express.Router()

// ==========================================
// 🎯 PERSONALIZATION & OPTIMIZATION ENGINE
// ==========================================

/**
 * 1. AI PERSONALIZATION ENGINE
 * Motor de personalización ultra avanzado con AI
 */
router.post('/personalize', protect, async (req, res) => {
  try {
    const {
      templateType = 'email',
      baseTemplate,
      contactData,
      companyData,
      intentData,
      interactionHistory = []
    } = req.body

    // Crear contexto completo para personalización profunda
    const context = {
      contact: contactData,
      company: companyData,
      intent_signals: intentData,
      past_interactions: interactionHistory,
      template_type: templateType
    }

    // Generar contenido ultra-personalizado con AI
    const prompt = `Crea una comunicación ALTAMENTE personalizada usando todo el contexto disponible:

TEMPLATE BASE:
${baseTemplate}

CONTEXTO COMPLETO:
${JSON.stringify(context, null, 2)}

REGLAS DE PERSONALIZACIÓN:
1. Usar datos específicos del contacto y empresa
2. Mencionar señales de intención detectadas
3. Referenciar interacciones previas si existen
4. Adaptar tono según el perfil
5. Incluir triggers emocionales relevantes
6. CTA personalizado según buyer journey stage

Genera en JSON:
{
  "personalized_content": {
    "subject": "subject line ultra personalizado (si aplica)",
    "opening": "apertura personalizada",
    "body": "cuerpo completo personalizado",
    "closing": "cierre personalizado",
    "cta": "call to action personalizado"
  },
  "personalization_analysis": {
    "personalization_score": 1-100,
    "elements_personalized": ["lista", "de", "elementos"],
    "data_sources_used": ["fuentes", "de", "datos"],
    "emotional_triggers": ["triggers", "usados"],
    "buyer_journey_stage": "awareness/consideration/decision",
    "predicted_response_rate": "porcentaje"
  },
  "optimization_recommendations": [
    {
      "element": "elemento a optimizar",
      "current": "estado actual",
      "recommended": "recomendación",
      "expected_lift": "mejora esperada"
    }
  ]
}`

    let personalization = null
    try {
      const aiResponse = await analyzeWithDeepSeek(prompt)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      personalization = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch (e) {
      console.error('Error personalizing content:', e)
    }

    // Guardar personalization para tracking
    await pool.query(`
      INSERT INTO personalization_history (
        user_id, template_type, contact_data, personalized_content,
        personalization_score, created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
    `, [
      req.user.id,
      templateType,
      JSON.stringify(contactData),
      JSON.stringify(personalization),
      personalization?.personalization_analysis?.personalization_score || 0
    ])

    res.json({
      success: true,
      personalized_content: personalization?.personalized_content,
      analysis: personalization?.personalization_analysis,
      optimizations: personalization?.optimization_recommendations,
      message: `Personalización completada con score ${personalization?.personalization_analysis?.personalization_score}/100`
    })

  } catch (error) {
    console.error('Error in personalization:', error)
    res.status(500).json({
      success: false,
      message: 'Error en personalización',
      error: error.message
    })
  }
})

/**
 * 2. A/B TEST ORCHESTRATION
 * Sistema completo de A/B testing multi-variable
 */
router.post('/ab-test/create', protect, async (req, res) => {
  try {
    const {
      testName,
      testType = 'email',
      variants,
      testMetrics = ['open_rate', 'reply_rate'],
      sampleSize,
      audience
    } = req.body

    // Validar variantes
    if (!variants || variants.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren al menos 2 variantes'
      })
    }

    // Generar hipótesis con AI
    const prompt = `Analiza estas variantes de A/B test y genera hipótesis:

TEST: ${testName}
TIPO: ${testType}
VARIANTES:
${JSON.stringify(variants, null, 2)}

MÉTRICAS: ${testMetrics.join(', ')}

Genera análisis en JSON:
{
  "hypothesis": {
    "control_variant": "cual debería ser el control",
    "expected_winner": "variante que esperamos gane",
    "reasoning": "por qué esperamos ese resultado",
    "confidence_level": "high/medium/low"
  },
  "variant_analysis": [
    {
      "variant_id": "id",
      "strengths": ["fortalezas"],
      "weaknesses": ["debilidades"],
      "predicted_performance": "high/medium/low",
      "target_audience_fit": "qué audiencia favorece esta variante"
    }
  ],
  "test_recommendations": {
    "minimum_sample_size": "tamaño mínimo recomendado",
    "test_duration": "duración recomendada",
    "statistical_significance_threshold": "umbral recomendado"
  }
}`

    let testAnalysis = null
    try {
      const aiResponse = await analyzeWithDeepSeek(prompt)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      testAnalysis = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch (e) {
      console.error('Error analyzing test:', e)
    }

    // Crear A/B test
    const test = await pool.query(`
      INSERT INTO ab_tests (
        user_id, test_name, test_type, variants, test_metrics,
        sample_size, audience, hypothesis, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', NOW())
      RETURNING id
    `, [
      req.user.id,
      testName,
      testType,
      JSON.stringify(variants),
      JSON.stringify(testMetrics),
      sampleSize,
      JSON.stringify(audience),
      JSON.stringify(testAnalysis?.hypothesis)
    ])

    res.json({
      success: true,
      test_id: test.rows[0].id,
      test_analysis: testAnalysis,
      message: `A/B test "${testName}" creado y activo`
    })

  } catch (error) {
    console.error('Error creating A/B test:', error)
    res.status(500).json({
      success: false,
      message: 'Error creando A/B test',
      error: error.message
    })
  }
})

/**
 * 3. RESPONSE TRACKING & ANALYTICS
 * Sistema de tracking de respuestas con ML
 */
router.post('/track-response', protect, async (req, res) => {
  try {
    const {
      messageId,
      channel,
      responseType,
      responseContent,
      sentiment,
      contactId
    } = req.body

    // Analizar respuesta con AI para extraer insights
    const prompt = `Analiza esta respuesta de un prospecto:

CANAL: ${channel}
TIPO: ${responseType}
CONTENIDO: ${responseContent}

Extrae insights en JSON:
{
  "sentiment_analysis": {
    "sentiment": "positive/neutral/negative",
    "confidence": 0-1,
    "emotions_detected": ["emociones"],
    "tone": "tono de la respuesta"
  },
  "intent_analysis": {
    "buying_intent": "high/medium/low/none",
    "stage_in_journey": "awareness/consideration/decision",
    "next_best_action": "acción recomendada",
    "urgency_level": "high/medium/low"
  },
  "objections_detected": [
    {
      "objection": "objeción identificada",
      "type": "price/timing/fit/authority",
      "recommended_response": "cómo responder"
    }
  ],
  "qualification_signals": {
    "budget_signals": ["señales sobre presupuesto"],
    "authority_signals": ["señales sobre autoridad"],
    "need_signals": ["señales sobre necesidad"],
    "timing_signals": ["señales sobre timing"]
  },
  "recommended_follow_up": {
    "action": "acción específica",
    "timing": "cuándo hacer follow-up",
    "channel": "canal recomendado",
    "message_angle": "ángulo del mensaje"
  }
}`

    let responseAnalysis = null
    try {
      const aiResponse = await analyzeWithDeepSeek(prompt)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      responseAnalysis = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch (e) {
      console.error('Error analyzing response:', e)
    }

    // Guardar tracking
    await pool.query(`
      INSERT INTO response_tracking (
        user_id, message_id, channel, response_type,
        response_content, sentiment, contact_id,
        analysis, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    `, [
      req.user.id,
      messageId,
      channel,
      responseType,
      responseContent,
      sentiment,
      contactId,
      JSON.stringify(responseAnalysis)
    ])

    // Actualizar lead score basado en respuesta
    if (responseAnalysis?.intent_analysis?.buying_intent === 'high') {
      await pool.query(`
        UPDATE contacts
        SET lead_score = lead_score + 20,
            last_interaction = NOW()
        WHERE id = $1
      `, [contactId])
    }

    res.json({
      success: true,
      response_analysis: responseAnalysis,
      message: 'Respuesta analizada y trackeada'
    })

  } catch (error) {
    console.error('Error tracking response:', error)
    res.status(500).json({
      success: false,
      message: 'Error trackeando respuesta',
      error: error.message
    })
  }
})

/**
 * 4. CONVERSATION INTELLIGENCE
 * Analiza conversaciones completas para insights
 */
router.post('/conversation-intelligence', protect, async (req, res) => {
  try {
    const { contactId, conversationHistory } = req.body

    // Analizar conversación completa con AI
    const prompt = `Analiza esta conversación completa con un prospecto:

HISTORIAL DE CONVERSACIÓN:
${JSON.stringify(conversationHistory, null, 2)}

Genera análisis completo en JSON:
{
  "conversation_summary": {
    "total_touchpoints": número,
    "channels_used": ["canales"],
    "duration_days": número,
    "response_rate": "porcentaje",
    "engagement_level": "high/medium/low"
  },
  "relationship_health": {
    "score": 1-100,
    "trend": "improving/stable/declining",
    "key_indicators": ["indicadores"],
    "risk_factors": ["factores de riesgo"]
  },
  "deal_stage_assessment": {
    "current_stage": "stage actual",
    "confidence": 0-1,
    "blockers": ["bloqueadores identificados"],
    "accelerators": ["aceleradores identificados"],
    "next_milestone": "próximo milestone"
  },
  "competitive_intel": {
    "competitors_mentioned": ["competidores"],
    "comparison_points": ["puntos de comparación"],
    "differentiation_opportunities": ["oportunidades"]
  },
  "action_plan": {
    "immediate_actions": ["acciones inmediatas"],
    "short_term_strategy": "estrategia 1-2 semanas",
    "long_term_approach": "enfoque a largo plazo"
  },
  "predicted_outcomes": {
    "win_probability": "porcentaje",
    "estimated_close_date": "fecha estimada",
    "deal_size_estimate": "tamaño estimado",
    "confidence_level": "high/medium/low"
  }
}`

    let conversationIntel = null
    try {
      const aiResponse = await analyzeWithDeepSeek(prompt)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      conversationIntel = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch (e) {
      console.error('Error analyzing conversation:', e)
    }

    // Guardar análisis
    await pool.query(`
      INSERT INTO conversation_intelligence (
        user_id, contact_id, conversation_data,
        intelligence, created_at
      ) VALUES ($1, $2, $3, $4, NOW())
    `, [
      req.user.id,
      contactId,
      JSON.stringify(conversationHistory),
      JSON.stringify(conversationIntel)
    ])

    res.json({
      success: true,
      conversation_intelligence: conversationIntel,
      message: 'Análisis de conversación completado'
    })

  } catch (error) {
    console.error('Error in conversation intelligence:', error)
    res.status(500).json({
      success: false,
      message: 'Error en conversation intelligence',
      error: error.message
    })
  }
})

/**
 * 5. SEND TIME OPTIMIZATION
 * Optimiza timing de envío por contacto
 */
router.post('/optimize-send-time', protect, async (req, res) => {
  try {
    const {
      contactId,
      channel,
      messageType,
      timezone
    } = req.body

    // Obtener historial de engagement del contacto
    const history = await pool.query(`
      SELECT response_time, sent_time, channel
      FROM response_tracking
      WHERE contact_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `, [contactId])

    // Analizar patrones con AI
    const prompt = `Analiza los patrones de engagement de este contacto:

CANAL: ${channel}
TIMEZONE: ${timezone}
HISTORIAL: ${JSON.stringify(history.rows, null, 2)}

Genera recomendaciones en JSON:
{
  "optimal_send_times": [
    {
      "day_of_week": "día",
      "time": "hora",
      "confidence": 0-1,
      "reasoning": "por qué esta hora"
    }
  ],
  "best_overall_time": {
    "day": "día",
    "time": "hora",
    "expected_response_rate": "porcentaje"
  },
  "times_to_avoid": [
    {
      "time_range": "rango",
      "reason": "por qué evitar"
    }
  ],
  "channel_preferences": {
    "preferred_channels": ["canales"],
    "channel_engagement_score": {"email": score, "linkedin": score},
    "recommended_channel_mix": "recomendación"
  }
}`

    let sendTimeOptimization = null
    try {
      const aiResponse = await analyzeWithDeepSeek(prompt)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      sendTimeOptimization = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch (e) {
      console.error('Error optimizing send time:', e)
    }

    res.json({
      success: true,
      send_time_optimization: sendTimeOptimization,
      message: 'Timing optimizado para este contacto'
    })

  } catch (error) {
    console.error('Error optimizing send time:', error)
    res.status(500).json({
      success: false,
      message: 'Error optimizando timing',
      error: error.message
    })
  }
})

/**
 * 6. CONTENT PERFORMANCE ANALYTICS
 * Analiza performance de diferentes tipos de contenido
 */
router.get('/content-analytics', protect, async (req, res) => {
  try {
    const { timeRange = '30days', groupBy = 'content_type' } = req.query

    // Obtener métricas de contenido
    const contentMetrics = await pool.query(`
      SELECT
        template_type,
        AVG(personalization_score) as avg_personalization,
        COUNT(*) as total_sent,
        COUNT(CASE WHEN opened = true THEN 1 END) as opens,
        COUNT(CASE WHEN replied = true THEN 1 END) as replies
      FROM personalization_history ph
      LEFT JOIN email_tracking et ON ph.id = et.personalization_id
      WHERE ph.user_id = $1
      GROUP BY template_type
    `, [req.user.id])

    // Generar insights con AI
    const prompt = `Analiza estas métricas de performance de contenido:

MÉTRICAS:
${JSON.stringify(contentMetrics.rows, null, 2)}

Genera insights en JSON:
{
  "top_performing_content": [
    {
      "content_type": "tipo",
      "why_it_works": "por qué funciona",
      "key_success_factors": ["factores"],
      "recommended_usage": "cuándo usarlo"
    }
  ],
  "underperforming_content": [
    {
      "content_type": "tipo",
      "issues": ["problemas"],
      "improvement_suggestions": ["sugerencias"]
    }
  ],
  "optimization_opportunities": [
    {
      "opportunity": "oportunidad",
      "expected_impact": "impacto",
      "implementation": "cómo implementar"
    }
  ],
  "best_practices": ["mejores", "prácticas", "identificadas"]
}`

    let contentInsights = null
    try {
      const aiResponse = await analyzeWithDeepSeek(prompt)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      contentInsights = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch (e) {
      console.error('Error analyzing content:', e)
    }

    res.json({
      success: true,
      content_metrics: contentMetrics.rows,
      insights: contentInsights,
      message: 'Análisis de contenido completado'
    })

  } catch (error) {
    console.error('Error in content analytics:', error)
    res.status(500).json({
      success: false,
      message: 'Error en content analytics',
      error: error.message
    })
  }
})

// Crear tablas necesarias
const tables = [
  `CREATE TABLE IF NOT EXISTS personalization_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    template_type VARCHAR(50),
    contact_data JSONB,
    personalized_content JSONB,
    personalization_score INTEGER,
    opened BOOLEAN DEFAULT false,
    replied BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS ab_tests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    test_name VARCHAR(255),
    test_type VARCHAR(50),
    variants JSONB,
    test_metrics JSONB,
    sample_size INTEGER,
    audience JSONB,
    hypothesis JSONB,
    results JSONB,
    winner VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS response_tracking (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    message_id VARCHAR(255),
    channel VARCHAR(50),
    response_type VARCHAR(50),
    response_content TEXT,
    sentiment VARCHAR(50),
    contact_id INTEGER,
    analysis JSONB,
    created_at TIMESTAMP DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS conversation_intelligence (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    contact_id INTEGER,
    conversation_data JSONB,
    intelligence JSONB,
    created_at TIMESTAMP DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_personalization_user ON personalization_history(user_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_response_tracking_contact ON response_tracking(contact_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON ab_tests(status, created_at DESC)`
]

tables.forEach(tableSQL => {
  pool.query(tableSQL).catch(err => console.error('Error creating table:', err))
})

export default router
