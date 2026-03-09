import express from 'express'
import { protect } from '../middleware/auth.js'
import { pool } from '../config/database.js'
import { analyzeWithDeepSeek } from '../services/deepseek.js'

const router = express.Router()

// ==========================================
// 🚀 MULTI-CHANNEL OUTREACH SYSTEM
// ==========================================

/**
 * 1. LINKEDIN AUTOMATION
 * Automatiza outreach en LinkedIn
 */
router.post('/linkedin/connection-request', protect, async (req, res) => {
  try {
    const {
      linkedinUrl,
      contactName,
      companyName,
      personalizationData = {}
    } = req.body

    // Generar mensaje personalizado con AI
    const prompt = `Genera un mensaje de connection request para LinkedIn extremadamente personalizado:

DATOS DEL CONTACTO:
- Nombre: ${contactName}
- Empresa: ${companyName}
- Datos adicionales: ${JSON.stringify(personalizationData)}

REGLAS:
- Máximo 300 caracteres (límite de LinkedIn)
- Altamente personalizado
- Mencionar algo específico sobre la persona o empresa
- Sin pitch de venta
- Natural y genuino

Genera en JSON:
{
  "message": "mensaje de connection request",
  "personalization_elements": ["elementos", "personalizados"],
  "expected_acceptance_rate": "porcentaje estimado"
}`

    let connectionMessage = null
    try {
      const aiResponse = await analyzeWithDeepSeek(prompt)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      connectionMessage = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch (e) {
      console.error('Error generating connection message:', e)
    }

    // Guardar en queue para procesamiento
    await pool.query(`
      INSERT INTO linkedin_outreach_queue (
        user_id, linkedin_url, contact_name, company_name,
        action_type, message, personalization_data,
        status, created_at
      ) VALUES ($1, $2, $3, $4, 'connection_request', $5, $6, 'pending', NOW())
    `, [
      req.user.id,
      linkedinUrl,
      contactName,
      companyName,
      connectionMessage?.message || '',
      JSON.stringify(personalizationData)
    ])

    res.json({
      success: true,
      linkedin_url: linkedinUrl,
      connection_message: connectionMessage,
      message: 'Connection request en cola para envío'
    })

  } catch (error) {
    console.error('Error creating LinkedIn connection:', error)
    res.status(500).json({
      success: false,
      message: 'Error creando connection request',
      error: error.message
    })
  }
})

/**
 * 2. LINKEDIN INMAILS
 * Envía InMails personalizados
 */
router.post('/linkedin/inmail', protect, async (req, res) => {
  try {
    const {
      linkedinUrl,
      contactName,
      contactData,
      objective
    } = req.body

    // Generar InMail con AI
    const prompt = `Genera un InMail de LinkedIn altamente efectivo:

CONTACTO:
${JSON.stringify({ name: contactName, ...contactData }, null, 2)}

OBJETIVO: ${objective}

Genera en JSON:
{
  "subject": "subject line (max 200 chars)",
  "body": "cuerpo del InMail (max 1900 chars)",
  "opening": "primera línea altamente personalizada",
  "value_proposition": "propuesta de valor clara",
  "call_to_action": "CTA específico y de bajo compromiso",
  "personalization_score": 1-10,
  "expected_response_rate": "porcentaje"
}`

    let inmail = null
    try {
      const aiResponse = await analyzeWithDeepSeek(prompt)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      inmail = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch (e) {
      console.error('Error generating InMail:', e)
    }

    // Guardar
    await pool.query(`
      INSERT INTO linkedin_outreach_queue (
        user_id, linkedin_url, contact_name, action_type,
        message, subject, personalization_data, status, created_at
      ) VALUES ($1, $2, $3, 'inmail', $4, $5, $6, 'pending', NOW())
    `, [
      req.user.id,
      linkedinUrl,
      contactName,
      inmail?.body || '',
      inmail?.subject || '',
      JSON.stringify(contactData)
    ])

    res.json({
      success: true,
      inmail: inmail,
      message: 'InMail en cola para envío'
    })

  } catch (error) {
    console.error('Error creating InMail:', error)
    res.status(500).json({
      success: false,
      message: 'Error creando InMail',
      error: error.message
    })
  }
})

/**
 * 3. VOICEMAIL DROP AUTOMATION
 * Deja voicemails pregrabados automáticamente
 */
router.post('/voicemail/drop', protect, async (req, res) => {
  try {
    const {
      phoneNumber,
      contactName,
      companyName,
      voicemailScriptId
    } = req.body

    // Generar script de voicemail con AI si no se proporciona
    let voicemailScript = null

    if (!voicemailScriptId) {
      const prompt = `Genera un script de voicemail profesional para outbound sales:

CONTACTO:
- Nombre: ${contactName}
- Empresa: ${companyName}

REGLAS:
- Duración: 20-30 segundos máximo
- Profesional pero cálido
- Mencionar value proposition brevemente
- CTA claro (devolver llamada o agendar reunión)
- Dejar callback number

Genera en JSON:
{
  "script": "script completo del voicemail",
  "duration_seconds": número estimado,
  "tone": "tono recomendado",
  "key_points": ["puntos", "clave"]
}`

      try {
        const aiResponse = await analyzeWithDeepSeek(prompt)
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
        voicemailScript = jsonMatch ? JSON.parse(jsonMatch[0]) : null
      } catch (e) {
        console.error('Error generating voicemail script:', e)
      }
    }

    // Programar voicemail drop
    await pool.query(`
      INSERT INTO voicemail_drops (
        user_id, phone_number, contact_name, company_name,
        script, status, scheduled_at
      ) VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
    `, [
      req.user.id,
      phoneNumber,
      contactName,
      companyName,
      voicemailScript?.script || ''
    ])

    res.json({
      success: true,
      phone_number: phoneNumber,
      voicemail_script: voicemailScript,
      message: 'Voicemail drop programado'
    })

  } catch (error) {
    console.error('Error dropping voicemail:', error)
    res.status(500).json({
      success: false,
      message: 'Error programando voicemail',
      error: error.message
    })
  }
})

/**
 * 4. SMS OUTREACH
 * Envía SMS personalizados
 */
router.post('/sms/send', protect, async (req, res) => {
  try {
    const {
      phoneNumber,
      contactName,
      personalizationData = {}
    } = req.body

    // Generar SMS con AI
    const prompt = `Genera un SMS para outbound sales:

CONTACTO:
- Nombre: ${contactName}
- Datos: ${JSON.stringify(personalizationData)}

REGLAS:
- Máximo 160 caracteres
- Personalizado
- Value-driven
- CTA claro
- No spam

Genera en JSON:
{
  "message": "texto del SMS",
  "character_count": número,
  "personalization_level": "high/medium/low",
  "expected_response_rate": "porcentaje"
}`

    let smsMessage = null
    try {
      const aiResponse = await analyzeWithDeepSeek(prompt)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      smsMessage = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch (e) {
      console.error('Error generating SMS:', e)
    }

    // Guardar para envío
    await pool.query(`
      INSERT INTO sms_outreach (
        user_id, phone_number, contact_name,
        message, personalization_data, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
    `, [
      req.user.id,
      phoneNumber,
      contactName,
      smsMessage?.message || '',
      JSON.stringify(personalizationData)
    ])

    res.json({
      success: true,
      phone_number: phoneNumber,
      sms_message: smsMessage,
      message: 'SMS en cola para envío'
    })

  } catch (error) {
    console.error('Error sending SMS:', error)
    res.status(500).json({
      success: false,
      message: 'Error enviando SMS',
      error: error.message
    })
  }
})

/**
 * 5. WHATSAPP AUTOMATION
 * Automatiza mensajes de WhatsApp Business
 */
router.post('/whatsapp/send', protect, async (req, res) => {
  try {
    const {
      phoneNumber,
      contactName,
      messageTemplate,
      personalizationData = {}
    } = req.body

    // Generar mensaje de WhatsApp con AI
    const prompt = `Genera un mensaje de WhatsApp Business para outbound:

CONTACTO:
- Nombre: ${contactName}
- Datos: ${JSON.stringify(personalizationData)}

REGLAS:
- Conversacional pero profesional
- Personalizado
- Value-first approach
- CTA claro
- Respetar privacidad

Genera en JSON:
{
  "message": "mensaje de WhatsApp",
  "tone": "tono usado",
  "suggested_follow_up": "sugerencia para follow-up",
  "expected_response_rate": "porcentaje"
}`

    let whatsappMessage = null
    try {
      const aiResponse = await analyzeWithDeepSeek(prompt)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      whatsappMessage = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch (e) {
      console.error('Error generating WhatsApp message:', e)
    }

    // Guardar
    await pool.query(`
      INSERT INTO whatsapp_outreach (
        user_id, phone_number, contact_name,
        message, personalization_data, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
    `, [
      req.user.id,
      phoneNumber,
      contactName,
      whatsappMessage?.message || '',
      JSON.stringify(personalizationData)
    ])

    res.json({
      success: true,
      phone_number: phoneNumber,
      whatsapp_message: whatsappMessage,
      message: 'Mensaje de WhatsApp en cola'
    })

  } catch (error) {
    console.error('Error sending WhatsApp:', error)
    res.status(500).json({
      success: false,
      message: 'Error enviando WhatsApp',
      error: error.message
    })
  }
})

/**
 * 6. VIDEO EMAIL / PERSONALIZED VIDEO
 * Crea video emails personalizados
 */
router.post('/video/create-personalized', protect, async (req, res) => {
  try {
    const {
      contactName,
      companyName,
      videoTemplate,
      personalizationData = {}
    } = req.body

    // Generar script para video personalizado
    const prompt = `Genera un script para video email personalizado:

CONTACTO:
- Nombre: ${contactName}
- Empresa: ${companyName}
- Datos: ${JSON.stringify(personalizationData)}

REGLAS:
- Duración: 60-90 segundos
- Inicio con personalización (mencionar nombre, empresa)
- Middle: value proposition específica
- End: CTA claro
- Tono: profesional pero cercano

Genera en JSON:
{
  "script": "script completo del video",
  "duration_seconds": número,
  "scene_breakdown": [
    {
      "scene": 1,
      "duration": "segundos",
      "content": "qué decir/mostrar",
      "personalization": "elemento personalizado"
    }
  ],
  "thumbnail_suggestions": ["sugerencias", "para", "thumbnail"],
  "subject_line": "subject line para el email con video"
}`

    let videoScript = null
    try {
      const aiResponse = await analyzeWithDeepSeek(prompt)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      videoScript = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch (e) {
      console.error('Error generating video script:', e)
    }

    // Guardar
    await pool.query(`
      INSERT INTO personalized_videos (
        user_id, contact_name, company_name,
        video_script, personalization_data, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
    `, [
      req.user.id,
      contactName,
      companyName,
      JSON.stringify(videoScript),
      JSON.stringify(personalizationData)
    ])

    res.json({
      success: true,
      video_script: videoScript,
      message: 'Video personalizado en proceso de creación'
    })

  } catch (error) {
    console.error('Error creating personalized video:', error)
    res.status(500).json({
      success: false,
      message: 'Error creando video personalizado',
      error: error.message
    })
  }
})

/**
 * 7. DIRECT MAIL / GIFTING AUTOMATION
 * Automatiza envío de regalos físicos y direct mail
 */
router.post('/direct-mail/send-gift', protect, async (req, res) => {
  try {
    const {
      recipientName,
      companyName,
      address,
      giftType = 'branded_swag',
      occasion = 'prospecting'
    } = req.body

    // Generar nota personalizada con AI
    const prompt = `Genera una nota personalizada para acompañar un regalo de prospecting:

DESTINATARIO:
- Nombre: ${recipientName}
- Empresa: ${companyName}
- Ocasión: ${occasion}
- Tipo de regalo: ${giftType}

REGLAS:
- Breve (2-3 líneas)
- Personal y genuino
- No pushy sales
- Mencionar por qué enviamos el regalo
- Invitación sutil a conectar

Genera en JSON:
{
  "note": "texto de la nota",
  "tone": "tono usado",
  "follow_up_suggestion": "cómo hacer follow-up después",
  "expected_impact": "impacto esperado"
}`

    let giftNote = null
    try {
      const aiResponse = await analyzeWithDeepSeek(prompt)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      giftNote = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch (e) {
      console.error('Error generating gift note:', e)
    }

    // Programar envío
    await pool.query(`
      INSERT INTO direct_mail_queue (
        user_id, recipient_name, company_name, address,
        gift_type, occasion, note, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW())
    `, [
      req.user.id,
      recipientName,
      companyName,
      JSON.stringify(address),
      giftType,
      occasion,
      giftNote?.note || ''
    ])

    res.json({
      success: true,
      recipient: recipientName,
      gift_type: giftType,
      gift_note: giftNote,
      message: 'Regalo programado para envío'
    })

  } catch (error) {
    console.error('Error scheduling gift:', error)
    res.status(500).json({
      success: false,
      message: 'Error programando envío de regalo',
      error: error.message
    })
  }
})

/**
 * 8. MULTI-CHANNEL SEQUENCE ORCHESTRATION
 * Orquesta secuencias multi-canal automáticas
 */
router.post('/orchestration/create-sequence', protect, async (req, res) => {
  try {
    const {
      name,
      targetPersona,
      channels = ['email', 'linkedin', 'phone'],
      duration = '21days'
    } = req.body

    // Generar secuencia multi-canal con AI
    const prompt = `Diseña una secuencia de outreach multi-canal altamente efectiva:

CONFIGURACIÓN:
- Persona objetivo: ${targetPersona}
- Canales disponibles: ${channels.join(', ')}
- Duración: ${duration}

Genera una secuencia en JSON:
{
  "sequence": [
    {
      "day": 0,
      "channel": "email",
      "action": "Initial value-driven email",
      "timing": "9:00 AM",
      "goal": "objetivo de este touchpoint",
      "expected_response_rate": "porcentaje"
    },
    {
      "day": 2,
      "channel": "linkedin",
      "action": "Connection request with personalized note",
      "timing": "10:00 AM",
      "goal": "Build relationship on LinkedIn"
    },
    {
      "day": 4,
      "channel": "email",
      "action": "Follow-up email with case study",
      "timing": "2:00 PM",
      "goal": "Provide social proof"
    },
    {
      "day": 7,
      "channel": "phone",
      "action": "Cold call or voicemail drop",
      "timing": "11:00 AM",
      "goal": "Direct conversation"
    }
  ],
  "strategy": {
    "channel_mix_rationale": "por qué esta combinación de canales",
    "cadence_logic": "lógica del timing entre touchpoints",
    "expected_overall_response_rate": "porcentaje",
    "optimization_tips": ["tips", "para", "optimizar"]
  }
}`

    let multiChannelSequence = null
    try {
      const aiResponse = await analyzeWithDeepSeek(prompt)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      multiChannelSequence = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch (e) {
      console.error('Error generating multi-channel sequence:', e)
    }

    // Guardar secuencia
    await pool.query(`
      INSERT INTO multi_channel_sequences (
        user_id, name, target_persona, channels, duration,
        sequence_data, total_touchpoints, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING id
    `, [
      req.user.id,
      name,
      targetPersona,
      JSON.stringify(channels),
      duration,
      JSON.stringify(multiChannelSequence),
      multiChannelSequence?.sequence?.length || 0
    ])

    res.json({
      success: true,
      sequence_name: name,
      multi_channel_sequence: multiChannelSequence,
      message: 'Secuencia multi-canal creada'
    })

  } catch (error) {
    console.error('Error creating multi-channel sequence:', error)
    res.status(500).json({
      success: false,
      message: 'Error creando secuencia multi-canal',
      error: error.message
    })
  }
})

// Crear tablas necesarias
const tables = [
  `CREATE TABLE IF NOT EXISTS linkedin_outreach_queue (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    linkedin_url TEXT,
    contact_name VARCHAR(255),
    company_name VARCHAR(255),
    action_type VARCHAR(50),
    message TEXT,
    subject VARCHAR(500),
    personalization_data JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    sent_at TIMESTAMP,
    accepted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS voicemail_drops (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    phone_number VARCHAR(50),
    contact_name VARCHAR(255),
    company_name VARCHAR(255),
    script TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    scheduled_at TIMESTAMP,
    dropped_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS sms_outreach (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    phone_number VARCHAR(50),
    contact_name VARCHAR(255),
    message TEXT,
    personalization_data JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    sent_at TIMESTAMP,
    replied_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS whatsapp_outreach (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    phone_number VARCHAR(50),
    contact_name VARCHAR(255),
    message TEXT,
    personalization_data JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    sent_at TIMESTAMP,
    replied_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS personalized_videos (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    contact_name VARCHAR(255),
    company_name VARCHAR(255),
    video_script JSONB,
    video_url TEXT,
    thumbnail_url TEXT,
    personalization_data JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    sent_at TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS direct_mail_queue (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    recipient_name VARCHAR(255),
    company_name VARCHAR(255),
    address JSONB,
    gift_type VARCHAR(100),
    occasion VARCHAR(100),
    note TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    shipped_at TIMESTAMP,
    delivered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS multi_channel_sequences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255),
    target_persona VARCHAR(255),
    channels JSONB,
    duration VARCHAR(50),
    sequence_data JSONB,
    total_touchpoints INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_linkedin_queue_status ON linkedin_outreach_queue(status, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_sms_status ON sms_outreach(status, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_whatsapp_status ON whatsapp_outreach(status, created_at)`
]

tables.forEach(tableSQL => {
  pool.query(tableSQL).catch(err => console.error('Error creating table:', err))
})

export default router
