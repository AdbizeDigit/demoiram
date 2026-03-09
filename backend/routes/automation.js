import express from 'express'
import { protect } from '../middleware/auth.js'
import { pool } from '../config/database.js'
import cron from 'node-cron'
import axios from 'axios'

const router = express.Router()

// Almacenar tareas cron activas
const activeCronJobs = new Map()

// ==========================================
// 1. BÚSQUEDAS PROGRAMADAS AUTOMÁTICAS
// ==========================================

// Crear búsqueda programada
router.post('/scheduled-search/create', protect, async (req, res) => {
  try {
    const user = req.user
    const {
      name,
      location,
      industry,
      minEmployees,
      maxEmployees,
      schedule, // 'daily', 'weekly', 'monthly', 'custom'
      cronExpression, // Para custom schedule
      minLeadScore, // Score mínimo para notificar
      enabled,
      notifyEmail,
      webhookUrl
    } = req.body

    if (!name || !location) {
      return res.status(400).json({ error: 'Nombre y ubicación son requeridos' })
    }

    // Validar y generar expresión cron
    let finalCronExpression = cronExpression

    if (schedule === 'daily') {
      finalCronExpression = '0 9 * * *' // Todos los días a las 9am
    } else if (schedule === 'weekly') {
      finalCronExpression = '0 9 * * 1' // Todos los lunes a las 9am
    } else if (schedule === 'monthly') {
      finalCronExpression = '0 9 1 * *' // Primer día del mes a las 9am
    }

    // Guardar en BD
    const result = await pool.query(
      `INSERT INTO scheduled_searches
       (user_id, name, location, industry, min_employees, max_employees,
        schedule, cron_expression, min_lead_score, enabled, notify_email, webhook_url, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
       RETURNING *`,
      [
        user.id,
        name,
        location,
        industry,
        minEmployees,
        maxEmployees,
        schedule,
        finalCronExpression,
        minLeadScore || 70,
        enabled !== false,
        notifyEmail,
        webhookUrl
      ]
    )

    const scheduledSearch = result.rows[0]

    // Programar tarea si está habilitada
    if (scheduledSearch.enabled) {
      scheduleSearchTask(scheduledSearch)
    }

    res.json({
      success: true,
      scheduledSearch,
      message: 'Búsqueda programada creada exitosamente'
    })
  } catch (error) {
    console.error('Error creando búsqueda programada:', error)
    res.status(500).json({ error: error.message })
  }
})

// Listar búsquedas programadas
router.get('/scheduled-search/list', protect, async (req, res) => {
  try {
    const user = req.user

    const result = await pool.query(
      `SELECT * FROM scheduled_searches
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [user.id]
    )

    res.json({
      success: true,
      scheduledSearches: result.rows
    })
  } catch (error) {
    console.error('Error listando búsquedas programadas:', error)
    res.status(500).json({ error: error.message })
  }
})

// Actualizar búsqueda programada
router.put('/scheduled-search/:id', protect, async (req, res) => {
  try {
    const user = req.user
    const { id } = req.params
    const { enabled, ...updateData } = req.body

    // Actualizar en BD
    const result = await pool.query(
      `UPDATE scheduled_searches
       SET enabled = COALESCE($1, enabled),
           name = COALESCE($2, name),
           location = COALESCE($3, location),
           industry = COALESCE($4, industry),
           min_lead_score = COALESCE($5, min_lead_score),
           updated_at = NOW()
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [enabled, updateData.name, updateData.location, updateData.industry, updateData.minLeadScore, id, user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Búsqueda programada no encontrada' })
    }

    const scheduledSearch = result.rows[0]

    // Reprogramar o cancelar tarea
    if (activeCronJobs.has(id)) {
      activeCronJobs.get(id).stop()
      activeCronJobs.delete(id)
    }

    if (scheduledSearch.enabled) {
      scheduleSearchTask(scheduledSearch)
    }

    res.json({
      success: true,
      scheduledSearch
    })
  } catch (error) {
    console.error('Error actualizando búsqueda programada:', error)
    res.status(500).json({ error: error.message })
  }
})

// Eliminar búsqueda programada
router.delete('/scheduled-search/:id', protect, async (req, res) => {
  try {
    const user = req.user
    const { id } = req.params

    // Detener tarea si está activa
    if (activeCronJobs.has(id)) {
      activeCronJobs.get(id).stop()
      activeCronJobs.delete(id)
    }

    // Eliminar de BD
    await pool.query(
      `DELETE FROM scheduled_searches WHERE id = $1 AND user_id = $2`,
      [id, user.id]
    )

    res.json({
      success: true,
      message: 'Búsqueda programada eliminada'
    })
  } catch (error) {
    console.error('Error eliminando búsqueda programada:', error)
    res.status(500).json({ error: error.message })
  }
})

// Función para programar tarea de búsqueda
function scheduleSearchTask(scheduledSearch) {
  const task = cron.schedule(scheduledSearch.cron_expression, async () => {
    console.log(`Ejecutando búsqueda programada: ${scheduledSearch.name}`)

    try {
      // Realizar búsqueda automática
      const response = await axios.post(
        `${process.env.BASE_URL || 'http://localhost:5000'}/api/multi-scraping/auto-search`,
        {
          location: scheduledSearch.location,
          industry: scheduledSearch.industry,
          minEmployees: scheduledSearch.min_employees,
          maxEmployees: scheduledSearch.max_employees,
          limit: 50
        },
        {
          headers: {
            'Authorization': `Bearer ${scheduledSearch.user_id}` // Necesitarás implementar auth por user_id
          }
        }
      )

      const results = response.data.results || []

      // Filtrar por score mínimo
      const qualifiedLeads = results.filter(
        lead => lead.leadScore >= scheduledSearch.min_lead_score
      )

      // Guardar resultados
      await pool.query(
        `INSERT INTO scheduled_search_runs
         (scheduled_search_id, total_results, qualified_leads, run_date)
         VALUES ($1, $2, $3, NOW())`,
        [scheduledSearch.id, results.length, qualifiedLeads.length]
      )

      // Enviar notificaciones si hay leads calificados
      if (qualifiedLeads.length > 0) {
        await sendNotifications(scheduledSearch, qualifiedLeads)
      }

      console.log(`Búsqueda completada: ${qualifiedLeads.length} leads calificados encontrados`)
    } catch (error) {
      console.error('Error ejecutando búsqueda programada:', error)

      // Registrar error
      await pool.query(
        `INSERT INTO scheduled_search_runs
         (scheduled_search_id, total_results, qualified_leads, run_date, error)
         VALUES ($1, $2, $3, NOW(), $4)`,
        [scheduledSearch.id, 0, 0, error.message]
      )
    }
  })

  activeCronJobs.set(scheduledSearch.id.toString(), task)
}

// ==========================================
// 2. SISTEMA DE SEGUIMIENTO AUTOMÁTICO
// ==========================================

// Crear seguimiento automático para un lead
router.post('/lead-tracking/create', protect, async (req, res) => {
  try {
    const user = req.user
    const {
      leadId,
      leadData, // Información del lead
      sequence, // 'hot', 'warm', 'cold' - Secuencia de seguimiento
      startDate
    } = req.body

    // Definir secuencias de seguimiento
    const sequences = {
      hot: [
        { day: 0, action: 'email_1', subject: 'Primer contacto', type: 'email' },
        { day: 2, action: 'follow_up_1', subject: 'Seguimiento', type: 'email' },
        { day: 5, action: 'phone_call', subject: 'Llamada telefónica', type: 'task' },
        { day: 7, action: 'follow_up_2', subject: 'Último seguimiento', type: 'email' }
      ],
      warm: [
        { day: 0, action: 'email_1', subject: 'Primer contacto', type: 'email' },
        { day: 3, action: 'follow_up_1', subject: 'Seguimiento', type: 'email' },
        { day: 7, action: 'value_content', subject: 'Contenido de valor', type: 'email' },
        { day: 14, action: 'check_in', subject: 'Check-in', type: 'email' }
      ],
      cold: [
        { day: 0, action: 'email_1', subject: 'Introducción', type: 'email' },
        { day: 7, action: 'value_content', subject: 'Contenido educativo', type: 'email' },
        { day: 21, action: 'case_study', subject: 'Caso de estudio', type: 'email' },
        { day: 45, action: 'follow_up', subject: 'Seguimiento trimestral', type: 'email' }
      ]
    }

    const selectedSequence = sequences[sequence] || sequences.warm

    // Crear tracking
    const result = await pool.query(
      `INSERT INTO lead_tracking
       (user_id, lead_id, lead_data, sequence_type, status, created_at)
       VALUES ($1, $2, $3, $4, 'active', NOW())
       RETURNING *`,
      [user.id, leadId, JSON.stringify(leadData), sequence]
    )

    const tracking = result.rows[0]

    // Programar acciones de seguimiento
    const start = startDate ? new Date(startDate) : new Date()

    for (const step of selectedSequence) {
      const scheduledDate = new Date(start)
      scheduledDate.setDate(scheduledDate.getDate() + step.day)

      await pool.query(
        `INSERT INTO tracking_actions
         (tracking_id, action_type, subject, scheduled_date, status)
         VALUES ($1, $2, $3, $4, 'pending')`,
        [tracking.id, step.type, step.subject, scheduledDate]
      )
    }

    res.json({
      success: true,
      tracking,
      message: `Seguimiento automático creado con ${selectedSequence.length} acciones programadas`
    })
  } catch (error) {
    console.error('Error creando seguimiento:', error)
    res.status(500).json({ error: error.message })
  }
})

// Obtener acciones pendientes
router.get('/lead-tracking/pending-actions', protect, async (req, res) => {
  try {
    const user = req.user

    const result = await pool.query(
      `SELECT ta.*, lt.lead_data, lt.sequence_type
       FROM tracking_actions ta
       JOIN lead_tracking lt ON ta.tracking_id = lt.id
       WHERE lt.user_id = $1
       AND ta.status = 'pending'
       AND ta.scheduled_date <= NOW() + INTERVAL '1 day'
       ORDER BY ta.scheduled_date ASC`,
      [user.id]
    )

    res.json({
      success: true,
      pendingActions: result.rows
    })
  } catch (error) {
    console.error('Error obteniendo acciones pendientes:', error)
    res.status(500).json({ error: error.message })
  }
})

// ==========================================
// 3. GENERADOR AUTOMÁTICO DE EMAILS
// ==========================================

router.post('/email-generator/generate', protect, async (req, res) => {
  try {
    const {
      leadData,
      emailType, // 'first_contact', 'follow_up', 'value_content', 'case_study'
      buyingSignals,
      companyInfo
    } = req.body

    // Generar email personalizado usando IA (DeepSeek)
    const prompt = generateEmailPrompt(leadData, emailType, buyingSignals, companyInfo)

    const deepseekResponse = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'Eres un experto en ventas B2B y copywriting. Generas emails personalizados y efectivos.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )

    const generatedEmail = deepseekResponse.data.choices[0].message.content

    // Guardar email generado
    await pool.query(
      `INSERT INTO generated_emails
       (user_id, lead_data, email_type, subject, body, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [req.user.id, JSON.stringify(leadData), emailType, extractSubject(generatedEmail), generatedEmail]
    )

    res.json({
      success: true,
      email: {
        subject: extractSubject(generatedEmail),
        body: generatedEmail,
        type: emailType
      }
    })
  } catch (error) {
    console.error('Error generando email:', error)
    res.status(500).json({ error: error.message })
  }
})

// ==========================================
// 4. SISTEMA DE NOTIFICACIONES
// ==========================================

router.post('/notifications/create', protect, async (req, res) => {
  try {
    const user = req.user
    const {
      type, // 'hot_lead', 'buying_signal', 'daily_summary'
      channels, // ['email', 'webhook', 'slack']
      criteria, // Criterios para notificar
      enabled
    } = req.body

    const result = await pool.query(
      `INSERT INTO notification_settings
       (user_id, type, channels, criteria, enabled, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [user.id, type, JSON.stringify(channels), JSON.stringify(criteria), enabled !== false]
    )

    res.json({
      success: true,
      notificationSetting: result.rows[0]
    })
  } catch (error) {
    console.error('Error creando notificación:', error)
    res.status(500).json({ error: error.message })
  }
})

// ==========================================
// 5. WEBHOOKS PARA INTEGRACIONES
// ==========================================

router.post('/webhooks/create', protect, async (req, res) => {
  try {
    const user = req.user
    const {
      name,
      url,
      events, // ['new_hot_lead', 'scheduled_search_complete', 'buying_signal_detected']
      enabled
    } = req.body

    const result = await pool.query(
      `INSERT INTO webhooks
       (user_id, name, url, events, enabled, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [user.id, name, url, JSON.stringify(events), enabled !== false]
    )

    res.json({
      success: true,
      webhook: result.rows[0]
    })
  } catch (error) {
    console.error('Error creando webhook:', error)
    res.status(500).json({ error: error.message })
  }
})

// Trigger webhook
async function triggerWebhook(event, data) {
  try {
    const result = await pool.query(
      `SELECT * FROM webhooks
       WHERE enabled = true
       AND events @> $1::jsonb`,
      [JSON.stringify([event])]
    )

    for (const webhook of result.rows) {
      try {
        await axios.post(webhook.url, {
          event,
          data,
          timestamp: new Date().toISOString(),
          webhook_id: webhook.id
        }, {
          timeout: 5000
        })

        // Log éxito
        await pool.query(
          `INSERT INTO webhook_logs
           (webhook_id, event, status, created_at)
           VALUES ($1, $2, 'success', NOW())`,
          [webhook.id, event]
        )
      } catch (error) {
        // Log error
        await pool.query(
          `INSERT INTO webhook_logs
           (webhook_id, event, status, error, created_at)
           VALUES ($1, $2, 'error', $3, NOW())`,
          [webhook.id, event, error.message]
        )
      }
    }
  } catch (error) {
    console.error('Error triggering webhooks:', error)
  }
}

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================

async function sendNotifications(scheduledSearch, qualifiedLeads) {
  // Enviar email
  if (scheduledSearch.notify_email) {
    // Implementar envío de email
    console.log(`Enviando email a ${scheduledSearch.notify_email} con ${qualifiedLeads.length} leads`)
  }

  // Trigger webhook
  if (scheduledSearch.webhook_url) {
    await triggerWebhook('scheduled_search_complete', {
      searchName: scheduledSearch.name,
      location: scheduledSearch.location,
      totalResults: qualifiedLeads.length,
      leads: qualifiedLeads.slice(0, 10) // Primeros 10
    })
  }
}

function generateEmailPrompt(leadData, emailType, buyingSignals, companyInfo) {
  const signals = buyingSignals?.map(s => s.signal).join(', ') || 'N/A'

  return `
Genera un email profesional de ventas B2B con las siguientes características:

INFORMACIÓN DEL LEAD:
- Nombre: ${leadData.name || leadData.author || 'Prospecto'}
- Empresa: ${leadData.company || 'la empresa'}
- Cargo: ${leadData.title || 'N/A'}
- Industria: ${leadData.industry || 'N/A'}
- Señales de compra detectadas: ${signals}

TIPO DE EMAIL: ${emailType}

CONTEXTO:
${emailType === 'first_contact' ? 'Este es el primer contacto. Debe ser breve, personalizado y generar interés.' :
  emailType === 'follow_up' ? 'Este es un seguimiento. Debe recordar el contexto anterior y agregar valor.' :
  emailType === 'value_content' ? 'Este email debe proporcionar contenido de valor educativo.' :
  'Este email debe compartir un caso de estudio relevante.'}

REQUISITOS:
1. Asunto atractivo y personalizado (max 60 caracteres)
2. Saludo personalizado
3. Mencionar específicamente las señales de compra si existen
4. Propuesta de valor clara
5. Call-to-action específico
6. Firma profesional
7. Máximo 150 palabras
8. Tono: profesional pero cercano

Formato:
ASUNTO: [asunto aquí]

[Cuerpo del email]

Saludos,
[Tu nombre]
`
}

function extractSubject(emailText) {
  const match = emailText.match(/ASUNTO:\s*(.+)/i)
  return match ? match[1].trim() : 'Asunto del email'
}

// Inicializar búsquedas programadas al iniciar el servidor
export async function initializeScheduledSearches() {
  try {
    const result = await pool.query(
      `SELECT * FROM scheduled_searches WHERE enabled = true`
    )

    for (const search of result.rows) {
      scheduleSearchTask(search)
    }

    console.log(`✅ ${result.rows.length} búsquedas programadas inicializadas`)
  } catch (error) {
    console.error('Error inicializando búsquedas programadas:', error)
  }
}

export default router
