import express from 'express'
import { protect } from '../middleware/auth.js'
import { pool } from '../config/database.js'
import { analyzeWithDeepSeek } from '../services/deepseek.js'
import nodemailer from 'nodemailer'
import cron from 'node-cron'

const router = express.Router()

// ==========================================
// 📧 EMAIL SEQUENCES & AUTOMATION SYSTEM
// ==========================================

/**
 * 1. CREATE EMAIL SEQUENCE TEMPLATE
 * Crea una secuencia de emails automatizada
 */
router.post('/create-sequence', protect, async (req, res) => {
  try {
    const { name, description, industry, persona, goal } = req.body

    // Generar secuencia con AI
    const prompt = `Crea una secuencia de emails profesional para outbound sales:

CONTEXTO:
- Industry: ${industry}
- Persona objetivo: ${persona}
- Goal: ${goal}

Genera una secuencia de 7 emails en JSON:
{
  "sequence": [
    {
      "step": 1,
      "day": 0,
      "type": "initial_outreach",
      "subject_line": "Subject personalizado y llamativo",
      "body_template": "Email body con [PERSONALIZATION_TAGS] donde corresponda",
      "personalization_variables": ["company_name", "pain_point", "recent_news"],
      "call_to_action": "CTA específico",
      "expected_response_rate": "porcentaje estimado",
      "best_send_time": "hora óptima"
    }
  ],
  "sequence_strategy": {
    "overall_approach": "estrategia general",
    "value_progression": "cómo aumenta el valor en cada email",
    "breakup_strategy": "estrategia para último email"
  }
}`

    let aiSequence = null
    try {
      const aiResponse = await analyzeWithDeepSeek(prompt)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      aiSequence = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch (e) {
      console.error('Error generating sequence:', e)
    }

    // Guardar secuencia
    const result = await pool.query(`
      INSERT INTO email_sequences (
        user_id, name, description, industry, persona, goal,
        sequence_data, total_steps, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING id, name, total_steps
    `, [
      req.user.id,
      name,
      description,
      industry,
      persona,
      goal,
      JSON.stringify(aiSequence),
      aiSequence?.sequence?.length || 0
    ])

    res.json({
      success: true,
      sequence_id: result.rows[0].id,
      sequence: aiSequence,
      message: `Secuencia "${name}" creada con ${result.rows[0].total_steps} emails`
    })

  } catch (error) {
    console.error('Error creating email sequence:', error)
    res.status(500).json({
      success: false,
      message: 'Error creando secuencia',
      error: error.message
    })
  }
})

/**
 * 2. ENROLL CONTACT IN SEQUENCE
 * Inscribe un contacto en una secuencia de emails
 */
router.post('/enroll-contact', protect, async (req, res) => {
  try {
    const {
      sequenceId,
      contactEmail,
      contactName,
      companyName,
      personalizationData = {}
    } = req.body

    // Validar que la secuencia existe
    const sequence = await pool.query(
      'SELECT * FROM email_sequences WHERE id = $1 AND user_id = $2',
      [sequenceId, req.user.id]
    )

    if (sequence.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Secuencia no encontrada'
      })
    }

    // Verificar si ya está inscrito
    const existing = await pool.query(
      'SELECT id FROM sequence_enrollments WHERE sequence_id = $1 AND contact_email = $2',
      [sequenceId, contactEmail]
    )

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Contacto ya inscrito en esta secuencia'
      })
    }

    // Inscribir contacto
    const enrollment = await pool.query(`
      INSERT INTO sequence_enrollments (
        user_id, sequence_id, contact_email, contact_name,
        company_name, personalization_data, current_step,
        status, enrolled_at, next_send_date
      ) VALUES ($1, $2, $3, $4, $5, $6, 0, 'active', NOW(), NOW())
      RETURNING id
    `, [
      req.user.id,
      sequenceId,
      contactEmail,
      contactName,
      companyName,
      JSON.stringify(personalizationData)
    ])

    res.json({
      success: true,
      enrollment_id: enrollment.rows[0].id,
      message: `${contactName} inscrito en la secuencia`,
      next_send: 'Inmediatamente'
    })

  } catch (error) {
    console.error('Error enrolling contact:', error)
    res.status(500).json({
      success: false,
      message: 'Error inscribiendo contacto',
      error: error.message
    })
  }
})

/**
 * 3. SEND EMAIL WITH PERSONALIZATION
 * Envía un email personalizado con AI
 */
router.post('/send-email', protect, async (req, res) => {
  try {
    const {
      to,
      subject,
      bodyTemplate,
      personalizationData
    } = req.body

    // Personalizar email con AI
    const prompt = `Personaliza este email usando los datos proporcionados:

TEMPLATE:
Subject: ${subject}
Body: ${bodyTemplate}

DATOS DE PERSONALIZACIÓN:
${JSON.stringify(personalizationData, null, 2)}

Genera el email personalizado en JSON:
{
  "subject": "subject line personalizado",
  "body": "cuerpo del email completamente personalizado",
  "personalization_score": 1-10,
  "personalization_elements": ["elementos", "personalizados"]
}`

    let personalizedEmail = null
    try {
      const aiResponse = await analyzeWithDeepSeek(prompt)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      personalizedEmail = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch (e) {
      console.error('Error personalizing email:', e)
    }

    // En producción: enviar email real usando nodemailer o servicio SMTP
    // Por ahora simular envío
    const emailSent = {
      to,
      subject: personalizedEmail?.subject || subject,
      body: personalizedEmail?.body || bodyTemplate,
      sent_at: new Date(),
      personalization_score: personalizedEmail?.personalization_score || 5
    }

    // Guardar en tracking
    await pool.query(`
      INSERT INTO email_tracking (
        user_id, recipient_email, subject, body,
        personalization_data, sent_at, status
      ) VALUES ($1, $2, $3, $4, $5, NOW(), 'sent')
    `, [
      req.user.id,
      to,
      emailSent.subject,
      emailSent.body,
      JSON.stringify(personalizationData)
    ])

    res.json({
      success: true,
      email_sent: emailSent,
      message: 'Email enviado exitosamente'
    })

  } catch (error) {
    console.error('Error sending email:', error)
    res.status(500).json({
      success: false,
      message: 'Error enviando email',
      error: error.message
    })
  }
})

/**
 * 4. PROCESS SEQUENCE AUTOMATION
 * Procesa emails automáticos de secuencias activas
 */
router.post('/process-sequences', protect, async (req, res) => {
  try {
    // Obtener todos los enrollments que necesitan envío
    const dueEnrollments = await pool.query(`
      SELECT
        e.id,
        e.sequence_id,
        e.contact_email,
        e.contact_name,
        e.company_name,
        e.current_step,
        e.personalization_data,
        s.sequence_data
      FROM sequence_enrollments e
      JOIN email_sequences s ON e.sequence_id = s.id
      WHERE e.status = 'active'
        AND e.next_send_date <= NOW()
        AND e.user_id = $1
      LIMIT 50
    `, [req.user.id])

    const processed = []

    for (const enrollment of dueEnrollments.rows) {
      const sequenceData = enrollment.sequence_data
      const currentStep = enrollment.current_step
      const nextStep = sequenceData.sequence[currentStep]

      if (!nextStep) {
        // Secuencia completada
        await pool.query(
          'UPDATE sequence_enrollments SET status = $1, completed_at = NOW() WHERE id = $2',
          ['completed', enrollment.id]
        )
        continue
      }

      // Personalizar email
      const personalizationData = {
        ...enrollment.personalization_data,
        contact_name: enrollment.contact_name,
        company_name: enrollment.company_name
      }

      // Simular envío (en producción usar servicio real)
      const emailSent = {
        to: enrollment.contact_email,
        subject: nextStep.subject_line,
        body: nextStep.body_template,
        step: currentStep + 1
      }

      // Actualizar enrollment
      const nextSendDate = new Date()
      if (sequenceData.sequence[currentStep + 1]) {
        const daysToNext = sequenceData.sequence[currentStep + 1].day - nextStep.day
        nextSendDate.setDate(nextSendDate.getDate() + daysToNext)
      }

      await pool.query(`
        UPDATE sequence_enrollments
        SET current_step = $1, next_send_date = $2, last_email_sent_at = NOW()
        WHERE id = $3
      `, [currentStep + 1, nextSendDate, enrollment.id])

      processed.push({
        enrollment_id: enrollment.id,
        email: enrollment.contact_email,
        step: currentStep + 1
      })
    }

    res.json({
      success: true,
      processed_count: processed.length,
      processed_enrollments: processed,
      message: `${processed.length} emails procesados`
    })

  } catch (error) {
    console.error('Error processing sequences:', error)
    res.status(500).json({
      success: false,
      message: 'Error procesando secuencias',
      error: error.message
    })
  }
})

/**
 * 5. A/B TEST EMAIL VARIANTS
 * Crea y ejecuta A/B tests de emails
 */
router.post('/ab-test', protect, async (req, res) => {
  try {
    const {
      name,
      variantA,
      variantB,
      testMetric = 'open_rate',
      sampleSize = 100
    } = req.body

    // Crear A/B test
    const test = await pool.query(`
      INSERT INTO email_ab_tests (
        user_id, test_name, variant_a, variant_b,
        test_metric, sample_size, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'active', NOW())
      RETURNING id
    `, [
      req.user.id,
      name,
      JSON.stringify(variantA),
      JSON.stringify(variantB),
      testMetric,
      sampleSize
    ])

    res.json({
      success: true,
      test_id: test.rows[0].id,
      message: 'A/B test creado',
      variants: {
        a: variantA,
        b: variantB
      }
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
 * 6. ANALYZE EMAIL PERFORMANCE
 * Analiza performance de emails enviados
 */
router.get('/analytics', protect, async (req, res) => {
  try {
    const { timeRange = '30days' } = req.query

    // Calcular fecha de inicio
    const startDate = new Date()
    if (timeRange === '7days') startDate.setDate(startDate.getDate() - 7)
    else if (timeRange === '30days') startDate.setDate(startDate.getDate() - 30)
    else startDate.setDate(startDate.getDate() - 90)

    // Obtener métricas
    const metrics = await pool.query(`
      SELECT
        COUNT(*) as total_sent,
        COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END) as total_opened,
        COUNT(CASE WHEN clicked_at IS NOT NULL THEN 1 END) as total_clicked,
        COUNT(CASE WHEN replied_at IS NOT NULL THEN 1 END) as total_replied,
        COUNT(CASE WHEN bounced_at IS NOT NULL THEN 1 END) as total_bounced,
        COUNT(CASE WHEN unsubscribed_at IS NOT NULL THEN 1 END) as total_unsubscribed
      FROM email_tracking
      WHERE user_id = $1 AND sent_at >= $2
    `, [req.user.id, startDate])

    const data = metrics.rows[0]
    const analytics = {
      total_sent: parseInt(data.total_sent),
      total_opened: parseInt(data.total_opened),
      total_clicked: parseInt(data.total_clicked),
      total_replied: parseInt(data.total_replied),
      total_bounced: parseInt(data.total_bounced),
      total_unsubscribed: parseInt(data.total_unsubscribed),

      open_rate: data.total_sent > 0
        ? ((data.total_opened / data.total_sent) * 100).toFixed(2) + '%'
        : '0%',
      click_rate: data.total_sent > 0
        ? ((data.total_clicked / data.total_sent) * 100).toFixed(2) + '%'
        : '0%',
      reply_rate: data.total_sent > 0
        ? ((data.total_replied / data.total_sent) * 100).toFixed(2) + '%'
        : '0%',
      bounce_rate: data.total_sent > 0
        ? ((data.total_bounced / data.total_sent) * 100).toFixed(2) + '%'
        : '0%'
    }

    // Comparar con benchmarks
    const benchmarks = {
      industry_avg_open_rate: '21%',
      industry_avg_reply_rate: '8.5%',
      your_performance: {
        open_rate: parseFloat(analytics.open_rate) > 21 ? 'Above average' : 'Below average',
        reply_rate: parseFloat(analytics.reply_rate) > 8.5 ? 'Above average' : 'Below average'
      }
    }

    res.json({
      success: true,
      time_range: timeRange,
      analytics,
      benchmarks,
      recommendation: parseFloat(analytics.open_rate) < 21
        ? 'Mejora tus subject lines - open rate bajo'
        : 'Excelente open rate - enfócate en mejorar reply rate'
    })

  } catch (error) {
    console.error('Error getting analytics:', error)
    res.status(500).json({
      success: false,
      message: 'Error obteniendo analytics',
      error: error.message
    })
  }
})

/**
 * 7. SMART SUBJECT LINE GENERATOR
 * Genera subject lines optimizados con AI
 */
router.post('/generate-subject-lines', protect, async (req, res) => {
  try {
    const {
      contactData,
      emailPurpose,
      tone = 'professional',
      count = 5
    } = req.body

    const prompt = `Genera ${count} subject lines altamente efectivos para un email de outbound sales:

DATOS DEL CONTACTO:
${JSON.stringify(contactData, null, 2)}

PROPÓSITO DEL EMAIL: ${emailPurpose}
TONO: ${tone}

Genera subject lines en JSON:
{
  "subject_lines": [
    {
      "text": "subject line",
      "strategy": "estrategia usada (curiosity/value/pain-point/urgency/personalization)",
      "predicted_open_rate": "porcentaje estimado",
      "reason": "por qué este subject line debería funcionar",
      "personalization_level": "low/medium/high"
    }
  ],
  "best_overall": "index del mejor subject line",
  "recommendations": "recomendaciones para maximizar open rate"
}`

    let subjectLines = null
    try {
      const aiResponse = await analyzeWithDeepSeek(prompt)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      subjectLines = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch (e) {
      console.error('Error generating subject lines:', e)
    }

    res.json({
      success: true,
      subject_lines: subjectLines,
      message: `${count} subject lines generados`
    })

  } catch (error) {
    console.error('Error generating subject lines:', error)
    res.status(500).json({
      success: false,
      message: 'Error generando subject lines',
      error: error.message
    })
  }
})

/**
 * 8. WARMUP EMAIL ACCOUNT
 * Sistema de warmup de cuentas de email
 */
router.post('/warmup-account', protect, async (req, res) => {
  try {
    const { emailAccount, dailyLimit = 10 } = req.body

    // Crear plan de warmup
    const warmupPlan = {
      email_account: emailAccount,
      phase: 'warmup',
      current_day: 1,
      schedule: [
        { day: 1, emails_to_send: 5, goal: 'Establecer sender reputation' },
        { day: 2, emails_to_send: 10, goal: 'Aumentar volumen gradualmente' },
        { day: 3, emails_to_send: 15, goal: 'Mantener engagement positivo' },
        { day: 4, emails_to_send: 20, goal: 'Continuar incremento gradual' },
        { day: 5, emails_to_send: 25, goal: 'Acercarse al objetivo diario' },
        { day: 6, emails_to_send: 30, goal: 'Estabilizar en volumen objetivo' },
        { day: 7, emails_to_send: dailyLimit, goal: 'Full capacity - warmup completado' }
      ],
      best_practices: [
        'Enviar emails espaciados durante el día',
        'Mantener bounce rate < 2%',
        'Obtener respuestas positivas',
        'Evitar spam complaints',
        'Usar dominios con SPF, DKIM, DMARC configurados'
      ],
      current_status: 'active',
      started_at: new Date()
    }

    // Guardar plan
    await pool.query(`
      INSERT INTO email_warmup_plans (
        user_id, email_account, warmup_data, daily_limit,
        current_day, status, created_at
      ) VALUES ($1, $2, $3, $4, 1, 'active', NOW())
    `, [
      req.user.id,
      emailAccount,
      JSON.stringify(warmupPlan),
      dailyLimit
    ])

    res.json({
      success: true,
      warmup_plan: warmupPlan,
      message: 'Plan de warmup iniciado - completar en 7 días',
      recommendation: 'Envía emails gradualmente y monitorea bounce rate diariamente'
    })

  } catch (error) {
    console.error('Error creating warmup plan:', error)
    res.status(500).json({
      success: false,
      message: 'Error creando plan de warmup',
      error: error.message
    })
  }
})

// Crear tablas necesarias
const tables = [
  `CREATE TABLE IF NOT EXISTS email_sequences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255),
    description TEXT,
    industry VARCHAR(100),
    persona VARCHAR(100),
    goal VARCHAR(255),
    sequence_data JSONB,
    total_steps INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS sequence_enrollments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    sequence_id INTEGER REFERENCES email_sequences(id) ON DELETE CASCADE,
    contact_email VARCHAR(255),
    contact_name VARCHAR(255),
    company_name VARCHAR(255),
    personalization_data JSONB,
    current_step INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    enrolled_at TIMESTAMP DEFAULT NOW(),
    last_email_sent_at TIMESTAMP,
    next_send_date TIMESTAMP,
    completed_at TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS email_tracking (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    recipient_email VARCHAR(255),
    subject TEXT,
    body TEXT,
    personalization_data JSONB,
    sent_at TIMESTAMP DEFAULT NOW(),
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP,
    replied_at TIMESTAMP,
    bounced_at TIMESTAMP,
    unsubscribed_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'sent'
  )`,

  `CREATE TABLE IF NOT EXISTS email_ab_tests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    test_name VARCHAR(255),
    variant_a JSONB,
    variant_b JSONB,
    test_metric VARCHAR(50),
    sample_size INTEGER,
    status VARCHAR(50) DEFAULT 'active',
    winner VARCHAR(10),
    results JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS email_warmup_plans (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    email_account VARCHAR(255),
    warmup_data JSONB,
    daily_limit INTEGER,
    current_day INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
  )`,

  `CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_status ON sequence_enrollments(status, next_send_date)`,
  `CREATE INDEX IF NOT EXISTS idx_email_tracking_user ON email_tracking(user_id, sent_at DESC)`
]

tables.forEach(tableSQL => {
  pool.query(tableSQL).catch(err => console.error('Error creating table:', err))
})

// Cron job para procesar secuencias automáticamente cada hora
cron.schedule('0 * * * *', async () => {
  console.log('Processing email sequences automatically...')
  // En producción: procesar todas las secuencias de todos los usuarios
})

export default router
