import express from 'express'
import cors from 'cors'
import compression from 'compression'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
import authRoutes from './routes/auth.js'
import chatbotRoutes from './routes/chatbot.js'
import customChatbotRoutes from './routes/customChatbot.js'
import agentRoutes from './routes/agent.js'
import agentGeneratorRoutes from './routes/agentGenerator.js'
import marketplaceRoutes from './routes/marketplace.js'
import pythonApiRoutes from './routes/python-api.js'
import scrapingRoutes from './routes/scraping.js'
import scrapingNewsRoutes from './routes/scraping-news.js'
import companySearchRoutes from './routes/company-search.js'
import multiSourceScrapingRoutes from './routes/multi-source-scraping.js'
import advancedScrapingRoutes from './routes/advanced-scraping.js'
import competitiveIntelligenceRoutes from './routes/competitive-intelligence.js'
import smartServicesRoutes from './routes/smart-services.js'
import intentTrackingRoutes from './routes/intent-tracking.js'
import automationRoutes from './routes/automation.js'
import dashboardMetricsRoutes from './routes/dashboard-metrics.js'
import miniCrmRoutes from './routes/mini-crm.js'
import campaignsRoutes from './routes/campaigns.js'
import aiAssistantRoutes from './routes/ai-assistant.js'
import socialScrapingRoutes from './routes/social-scraping.js'
import orgChartScrapingRoutes from './routes/org-chart-scraping.js'
import financialLegalScrapingRoutes from './routes/financial-legal-scraping.js'
import jobScrapingRoutes from './routes/job-scraping.js'
import emailSequencesRoutes from './routes/email-sequences.js'
import multiChannelOutreachRoutes from './routes/multi-channel-outreach.js'
import personalizationOptimizationRoutes from './routes/personalization-optimization.js'
import pac3Routes from './routes/pac-3.0.js'
import scrapingTerritoriesRoutes from './routes/scraping-territories.js'
import detectionRoutes from './routes/detection.js'
import scrapingSystemRoutes from './routes/scraping-routes.js'
import outreachRoutes from './routes/outreach-routes.js'
import avatarRoutes from './routes/avatar-routes.js'
import agentRunnerRoutes from './routes/agent-runner-routes.js'
import { connectDB } from './config/database.js'
import { initializeScheduledSearches } from './routes/automation.js'
import CustomChatbot from './models/CustomChatbot.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(compression())
app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// Connect to database
connectDB()

// Initialize custom chatbots table
CustomChatbot.initTable().catch(err => console.error('Error initializing custom_chatbots table:', err))

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/chatbot', chatbotRoutes)
app.use('/api/custom-chatbot', customChatbotRoutes)
app.use('/api/agent', agentRoutes)
app.use('/api/agent-generator', agentGeneratorRoutes)
app.use('/api/marketplace', marketplaceRoutes)
app.use('/python-api', pythonApiRoutes)
app.use('/api/scraping', scrapingRoutes)
app.use('/api/scraping', scrapingNewsRoutes)
app.use('/api/scraping', companySearchRoutes)
app.use('/api/multi-scraping', multiSourceScrapingRoutes)
app.use('/api/advanced-scraping', advancedScrapingRoutes)
app.use('/api/competitive-intelligence', competitiveIntelligenceRoutes)
app.use('/api/smart-services', smartServicesRoutes)
app.use('/api/intent', intentTrackingRoutes)
app.use('/api/automation', automationRoutes)
app.use('/api/metrics', dashboardMetricsRoutes)
app.use('/api/crm', miniCrmRoutes)
app.use('/api/campaigns', campaignsRoutes)
app.use('/api/ai', aiAssistantRoutes)
app.use('/api/social-scraping', socialScrapingRoutes)
app.use('/api/org-chart', orgChartScrapingRoutes)
app.use('/api/financial-legal', financialLegalScrapingRoutes)
app.use('/api/job-scraping', jobScrapingRoutes)
app.use('/api/email-sequences', emailSequencesRoutes)
app.use('/api/multi-channel', multiChannelOutreachRoutes)
app.use('/api/personalization', personalizationOptimizationRoutes)
app.use('/api/pac-3.0', pac3Routes)
app.use('/api/scraping', scrapingTerritoriesRoutes)
app.use('/api/detection', detectionRoutes)
app.use('/api/scraping-engine', scrapingSystemRoutes)
// Email webhook (no auth - Brevo calls this directly)
app.post('/api/webhook/email', async (req, res) => {
  try {
    const event = req.body
    console.log('[Email Webhook]', event.event || event.type, event.email || '')

    const eventType = event.event || event.type || ''
    const from = event.sender || event.from || event.email || ''
    const subject = event.subject || ''
    const content = event.content || event.text || event['stripped-text'] || ''

    if (['reply', 'inbound'].includes(eventType) || (content && from)) {
      const { pool } = await import('./config/database.js')
      const leadRes = await pool.query("SELECT id, name FROM leads WHERE email = $1 LIMIT 1", [from])
      const leadId = leadRes.rows[0]?.id || null
      const leadName = leadRes.rows[0]?.name || from
      await pool.query(
        `INSERT INTO outreach_messages (lead_id, channel, step, subject, body, ai_generated, status, sent_at)
         VALUES ($1, 'EMAIL', 0, $2, $3, false, 'REPLIED', NOW())`,
        [leadId, subject ? `RE: ${subject}` : 'Respuesta', content || 'Respuesta recibida']
      )
      // Move lead to EN_CONVERSACION
      if (leadId) {
        await pool.query(
          "UPDATE leads SET status = 'EN_CONVERSACION' WHERE id = $1 AND UPPER(status) IN ('NEW', 'NUEVO', 'CONTACTADO', 'CONTACTED', 'PENDING')",
          [leadId]
        ).catch(() => {})
      }
      // Create notification
      await pool.query(
        `INSERT INTO notifications (type, title, body, lead_id, lead_name, phone, read, created_at)
         VALUES ('email_reply', $1, $2, $3, $4, NULL, false, NOW())`,
        [`${leadName} respondio por Email`, (subject || content || '').slice(0, 200), leadId, leadName]
      ).catch(() => {})
    }

    if (['opened', 'open', 'unique_opened'].includes(eventType)) {
      const { pool } = await import('./config/database.js')
      await pool.query("UPDATE outreach_messages SET status = 'OPENED', opened_at = NOW() WHERE status = 'SENT' ORDER BY sent_at DESC LIMIT 1").catch(() => {})
    }

    res.json({ success: true })
  } catch (err) {
    console.error('[Email Webhook] Error:', err.message)
    res.json({ success: true })
  }
})

app.use('/api/outreach', outreachRoutes)
app.use('/api/avatars', avatarRoutes)
app.use('/api/agent-runner', agentRunnerRoutes)

// ── Notifications ────────────────────────────────────────────────────────────
// Init table
import('./config/database.js').then(({ pool }) => {
  pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      type VARCHAR(50) NOT NULL,
      title TEXT NOT NULL,
      body TEXT,
      lead_id UUID,
      lead_name VARCHAR(200),
      phone VARCHAR(50),
      read BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(() => {})
})

app.get('/api/notifications', async (req, res) => {
  try {
    const { pool } = await import('./config/database.js')
    const { rows } = await pool.query(
      'SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50'
    )
    const unread = rows.filter(n => !n.read).length
    res.json({ success: true, notifications: rows, unread })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

app.patch('/api/notifications/:id/read', async (req, res) => {
  try {
    const { pool } = await import('./config/database.js')
    await pool.query('UPDATE notifications SET read = true WHERE id = $1', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

app.patch('/api/notifications/read-all', async (req, res) => {
  try {
    const { pool } = await import('./config/database.js')
    await pool.query('UPDATE notifications SET read = true WHERE read = false')
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// Find lead for notification click
app.get('/api/notifications/find-lead', async (req, res) => {
  try {
    const { pool } = await import('./config/database.js')
    const { name, phone } = req.query

    // Strategy 1: phone match in leads
    if (phone) {
      const clean = phone.replace(/\D/g, '')
      // Try last 8, last 10, full number
      for (const slice of [clean.slice(-8), clean.slice(-10), clean]) {
        if (slice.length < 6) continue
        const r = await pool.query(
          "SELECT id FROM leads WHERE replace(replace(replace(phone, '+', ''), ' ', ''), '-', '') LIKE $1 OR replace(replace(replace(social_whatsapp, '+', ''), ' ', ''), '-', '') LIKE $1 LIMIT 1",
          [`%${slice}%`]
        )
        if (r.rows[0]) return res.json({ success: true, lead_id: r.rows[0].id })
      }
    }

    // Strategy 2: name match in leads (strip emojis and special chars)
    if (name) {
      const cleanName = name.replace(/[\u{1F600}-\u{1F9FF}]/gu, '').replace(/[^\w\sáéíóúñüÁÉÍÓÚÑÜ]/gi, '').trim()
      if (cleanName.length > 2) {
        // Try exact-ish match first
        const r = await pool.query("SELECT id FROM leads WHERE name ILIKE $1 LIMIT 1", [`%${cleanName}%`])
        if (r.rows[0]) return res.json({ success: true, lead_id: r.rows[0].id })
        // Try first word only
        const firstWord = cleanName.split(/\s+/)[0]
        if (firstWord.length > 3) {
          const r2 = await pool.query("SELECT id FROM leads WHERE name ILIKE $1 LIMIT 1", [`%${firstWord}%`])
          if (r2.rows[0]) return res.json({ success: true, lead_id: r2.rows[0].id })
        }
      }
    }

    // Strategy 3: find most recent WA message sent around the notification time
    // This catches cases where JID doesn't match phone
    const r3 = await pool.query(
      "SELECT DISTINCT lead_id FROM outreach_messages WHERE channel = 'WHATSAPP' AND status = 'SENT' AND lead_id IS NOT NULL ORDER BY sent_at DESC LIMIT 30"
    )
    // Return the first one that has a name similar to the notification name
    if (name && r3.rows.length) {
      const cleanName = name.replace(/[\u{1F600}-\u{1F9FF}]/gu, '').replace(/[^\w\sáéíóúñü]/gi, '').trim().toLowerCase()
      for (const row of r3.rows) {
        const lr = await pool.query("SELECT id, name FROM leads WHERE id = $1", [row.lead_id])
        if (lr.rows[0]?.name?.toLowerCase().includes(cleanName.split(/\s+/)[0]?.toLowerCase())) {
          return res.json({ success: true, lead_id: lr.rows[0].id })
        }
      }
      // If no name match, just return the most recent sent lead as fallback
      if (r3.rows[0]) return res.json({ success: true, lead_id: r3.rows[0].lead_id })
    }

    res.json({ success: true, lead_id: null })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// Leads that received replies (for pipeline alert)
app.get('/api/leads/replied', async (req, res) => {
  try {
    const { pool } = await import('./config/database.js')
    const { rows } = await pool.query(`
      SELECT DISTINCT l.id, l.name, l.phone, l.email, l.sector, l.status, l.score,
             n.body as last_message, n.created_at as replied_at
      FROM notifications n
      JOIN leads l ON l.id = n.lead_id
      WHERE n.type = 'whatsapp_reply' AND n.created_at > NOW() - INTERVAL '7 days'
      ORDER BY n.created_at DESC
      LIMIT 20
    `)
    // Also get leads in EN_CONVERSACION that might not have notifications with lead_id
    const { rows: rows2 } = await pool.query(`
      SELECT DISTINCT l.id, l.name, l.phone, l.email, l.sector, l.status, l.score,
             m.body as last_message, m.sent_at as replied_at
      FROM leads l
      JOIN outreach_messages m ON m.lead_id = l.id AND m.status = 'REPLIED'
      WHERE m.sent_at > NOW() - INTERVAL '7 days'
      AND l.id NOT IN (SELECT COALESCE(lead_id, '00000000-0000-0000-0000-000000000000') FROM notifications WHERE type = 'whatsapp_reply' AND lead_id IS NOT NULL)
      ORDER BY m.sent_at DESC
      LIMIT 20
    `)
    const all = [...rows, ...rows2]
    // Dedupe by id
    const seen = new Set()
    const unique = all.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true })
    res.json({ success: true, leads: unique })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// Derived leads by source
app.get('/api/leads/by-source', async (req, res) => {
  try {
    const { pool } = await import('./config/database.js')
    const { source } = req.query
    if (!source) return res.json({ success: true, leads: [] })
    const { rows } = await pool.query(
      'SELECT * FROM leads WHERE source_url = $1 ORDER BY created_at DESC LIMIT 20',
      [source]
    )
    res.json({ success: true, leads: rows })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ── Auto-Play Engine (server-side, survives page reload) ─────────────────────
const autoPlayState = { running: false, done: 0, total: 0, current: '', startedAt: null }

app.get('/api/autoplay/status', (req, res) => {
  res.json({ success: true, ...autoPlayState })
})

function isBusinessHours() {
  const now = new Date()
  const hour = now.getUTCHours() - 3 // Argentina UTC-3
  const day = now.getUTCDay()
  return day >= 1 && day <= 5 && hour >= 9 && hour <= 19
}

app.post('/api/autoplay/start', async (req, res) => {
  if (autoPlayState.running) return res.json({ success: false, error: 'Ya esta corriendo' })
  autoPlayState.running = true
  autoPlayState.done = 0
  autoPlayState.total = 0
  autoPlayState.current = ''
  autoPlayState.startedAt = new Date().toISOString()
  res.json({ success: true, message: 'Auto-play iniciado' })

  // Run in background
  try {
    const { pool } = await import('./config/database.js')
    const { rows: leads } = await pool.query(
      `SELECT l.id, l.name, l.email, l.phone, l.social_whatsapp, l.sector
       FROM leads l
       WHERE UPPER(l.status) IN ('NEW', 'NUEVO')
       AND (l.email IS NOT NULL OR l.phone IS NOT NULL)
       AND l.sector NOT LIKE 'ai-agent:%'
       AND (l.source_url IS NULL OR l.source_url NOT LIKE 'referido:%')
       AND NOT EXISTS (SELECT 1 FROM outreach_messages m WHERE m.lead_id = l.id)
       ORDER BY l.score DESC NULLS LAST, l.created_at DESC
       LIMIT 30`
    )
    autoPlayState.total = leads.length

    // Wait for business hours if needed
    if (!isBusinessHours()) {
      autoPlayState.current = 'Esperando horario laboral (9-19hs)...'
      while (!isBusinessHours() && autoPlayState.running) {
        await new Promise(r => setTimeout(r, 60000))
      }
    }

    for (let i = 0; i < leads.length; i++) {
      if (!autoPlayState.running) break
      const lead = leads[i]
      autoPlayState.done = i
      autoPlayState.current = lead.name || 'Lead'

      try {
        // Generate report
        try {
          const { default: reportService } = await import('./services/scraping/lead-report-service.js')
          await reportService.generateReport(lead.id)
        } catch {}

        // Send email
        if (lead.email) {
          try {
            const { emailOutreachService } = await import('./services/outreach/email-outreach-service.js')
            const leadObj = { name: lead.name || 'Contacto', sector: lead.sector || 'general', city: '', state: '', email: lead.email, website: '', score: 70 }
            const email = await emailOutreachService.generateEmail(leadObj, 'introduction', 1)
            if (email?.subject && email?.body) {
              await emailOutreachService.sendEmail(lead.email, email.subject, email.body)
              await pool.query(
                "INSERT INTO outreach_messages (lead_id, channel, step, subject, body, ai_generated, status, sent_at) VALUES ($1, 'EMAIL', 1, $2, $3, true, 'SENT', NOW())",
                [lead.id, email.subject, email.body]
              )
            }
          } catch (e) { console.error('[AutoPlay] Email error:', e.message) }
        }

        // Send WhatsApp
        const phone = lead.social_whatsapp || lead.phone
        if (phone) {
          try {
            const { default: waOutreach } = await import('./services/outreach/whatsapp-outreach-service.js')
            const { default: waConn } = await import('./services/outreach/whatsapp-connection-service.js')
            if (waConn.connectionStatus === 'connected') {
              const msg = await waOutreach.generateMessage({ name: lead.name, sector: lead.sector, city: '' })
              await waConn.sendMessage(phone, msg, lead.id)
              await pool.query(
                "INSERT INTO outreach_messages (lead_id, channel, step, body, ai_generated, status, sent_at) VALUES ($1, 'WHATSAPP', 1, $2, true, 'SENT', NOW())",
                [lead.id, msg]
              )
            }
          } catch (e) { console.error('[AutoPlay] WA error:', e.message) }
        }

        // Move to CONTACTADO
        await pool.query("UPDATE leads SET status = 'CONTACTADO' WHERE id = $1", [lead.id])
      } catch (e) { console.error('[AutoPlay] Lead error:', e.message) }

      // 45s delay between contacts (30 leads in ~22min, avoids WhatsApp ban)
      if (autoPlayState.running && i < leads.length - 1) {
        await new Promise(r => setTimeout(r, 45000))
      }
    }

    autoPlayState.done = autoPlayState.total
    autoPlayState.current = ''
    autoPlayState.running = false
    console.log(`[AutoPlay] Finished: ${autoPlayState.done}/${autoPlayState.total} leads contacted`)
  } catch (err) {
    console.error('[AutoPlay] Fatal error:', err.message)
    autoPlayState.running = false
    autoPlayState.current = ''
  }
})

app.post('/api/autoplay/stop', (req, res) => {
  autoPlayState.running = false
  autoPlayState.current = ''
  res.json({ success: true, message: 'Auto-play detenido' })
})

// ── WhatsApp IA Auto Mode (persists across page reloads) ─────────────────────
const waAutoLeads = new Set() // lead IDs with IA auto mode active
global.waAutoLeads = waAutoLeads // expose to WhatsApp service for auto-reply

app.get('/api/wa-auto/status/:leadId', (req, res) => {
  res.json({ success: true, active: waAutoLeads.has(req.params.leadId) })
})

app.post('/api/wa-auto/start/:leadId', (req, res) => {
  waAutoLeads.add(req.params.leadId)
  res.json({ success: true })
})

app.post('/api/wa-auto/stop/:leadId', (req, res) => {
  waAutoLeads.delete(req.params.leadId)
  res.json({ success: true })
})

app.get('/api/wa-auto/list', (req, res) => {
  res.json({ success: true, leads: [...waAutoLeads] })
})

// ── Auto-detect new contacts in replies (runs every 30s) ─────────────────────
setInterval(async () => {
  try {
    const { pool } = await import('./config/database.js')
    // Find REPLIED messages with phone numbers that haven't been processed
    const { rows } = await pool.query(`
      SELECT m.id, m.lead_id, m.body, l.name as lead_name, l.sector as lead_sector
      FROM outreach_messages m
      LEFT JOIN leads l ON l.id = m.lead_id
      WHERE m.status = 'REPLIED' AND m.channel = 'WHATSAPP'
      AND m.body ~ '[0-9].*[0-9].*[0-9].*[0-9].*[0-9].*[0-9].*[0-9]'
      AND NOT EXISTS (SELECT 1 FROM leads WHERE source_url = 'referido:' || m.lead_id::text AND m.lead_id IS NOT NULL)
      AND m.lead_id IS NOT NULL
      ORDER BY m.sent_at DESC LIMIT 10
    `)

    for (const msg of rows) {
      // Extract phone numbers from message
      const numbers = (msg.body || '').match(/\+?\d[\d\s\-().]{6,18}\d/g) || []
      const shorts = (msg.body || '').match(/\b\d{7,15}\b/g) || []
      const allNums = [...new Set([...numbers, ...shorts].map(n => n.replace(/\D/g, '')).filter(n => n.length >= 7 && n.length <= 15))]

      for (const num of allNums) {
        // Check if lead already exists for this number
        const exists = await pool.query(
          "SELECT id FROM leads WHERE replace(replace(phone,'+',''),' ','') LIKE $1 OR replace(replace(social_whatsapp,'+',''),' ','') LIKE $1 LIMIT 1",
          [`%${num.slice(-8)}%`]
        )
        if (exists.rows.length) continue

        // Also check it's not the same lead's phone
        if (msg.lead_id) {
          const parentLead = await pool.query("SELECT phone, social_whatsapp FROM leads WHERE id = $1", [msg.lead_id])
          const parentPhone = (parentLead.rows[0]?.phone || '').replace(/\D/g, '')
          const parentWa = (parentLead.rows[0]?.social_whatsapp || '').replace(/\D/g, '')
          if (parentPhone.includes(num.slice(-8)) || parentWa.includes(num.slice(-8))) continue
        }

        // Create derived lead
        const phoneFormatted = num.startsWith('54') ? `+${num}` : `+54${num}`
        const nameHint = `Contacto de ${msg.lead_name || 'Lead'}`
        const newLead = await pool.query(
          `INSERT INTO leads (name, phone, social_whatsapp, sector, source_url, status, score)
           VALUES ($1, $2, $2, $3, $4, 'new', 60) RETURNING id`,
          [nameHint, phoneFormatted, msg.lead_sector || 'referido', `referido:${msg.lead_id}`]
        )
        const newLeadId = newLead.rows[0]?.id
        if (!newLeadId) continue

        // Auto-send WhatsApp with context
        try {
          const { default: waConn } = await import('./services/outreach/whatsapp-connection-service.js')
          const { default: waOutreach } = await import('./services/outreach/whatsapp-outreach-service.js')
          if (waConn.connectionStatus === 'connected') {
            const message = await waOutreach.generateMessage({ name: nameHint, sector: msg.lead_sector, source_url: `referido:${msg.lead_id}` })
            await waConn.sendMessage(phoneFormatted, message, newLeadId)
            await pool.query(
              "INSERT INTO outreach_messages (lead_id, channel, step, body, ai_generated, status, sent_at) VALUES ($1, 'WHATSAPP', 1, $2, true, 'SENT', NOW())",
              [newLeadId, message]
            )
          }
        } catch {}

        // Create notification
        await pool.query(
          `INSERT INTO notifications (type, title, body, lead_id, lead_name, phone, read, created_at)
           VALUES ('new_contact', $1, $2, $3, $4, $5, false, NOW())`,
          [`Nuevo contacto: ${nameHint}`, `${msg.lead_name} paso el numero ${phoneFormatted}. Se inicio conversacion.`, newLeadId, nameHint, phoneFormatted]
        )

        console.log(`[AutoDetect] New contact created: ${nameHint} (${phoneFormatted}) from ${msg.lead_name}`)
        break // Only create one derived lead per message
      }
    }
  } catch (err) {
    // Silent fail
  }
}, 30000) // Every 30 seconds

// ── Multi WhatsApp Accounts ───────────────────────────────────────────────────
import('./config/database.js').then(({ pool }) => {
  pool.query(`
    CREATE TABLE IF NOT EXISTS whatsapp_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(50),
      status VARCHAR(20) DEFAULT 'disconnected',
      daily_limit INTEGER DEFAULT 100,
      messages_today INTEGER DEFAULT 0,
      messages_total INTEGER DEFAULT 0,
      last_reset DATE DEFAULT CURRENT_DATE,
      session_data TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(() => {})
})

// Track which account sent to which lead (no duplicates)
import('./config/database.js').then(({ pool }) => {
  pool.query('ALTER TABLE outreach_messages ADD COLUMN IF NOT EXISTS wa_account_id UUID').catch(() => {})
})

// Reset daily counters at midnight
setInterval(async () => {
  try {
    const { pool } = await import('./config/database.js')
    await pool.query("UPDATE whatsapp_accounts SET messages_today = 0, last_reset = CURRENT_DATE WHERE last_reset < CURRENT_DATE")
  } catch {}
}, 60000) // check every minute

app.get('/api/whatsapp-accounts', async (req, res) => {
  try {
    const { pool } = await import('./config/database.js')
    const { rows } = await pool.query('SELECT id, name, phone, status, daily_limit, messages_today, messages_total, is_active, created_at FROM whatsapp_accounts ORDER BY created_at')
    // Get connection status from WhatsApp service
    try {
      const { default: waConn } = await import('./services/outreach/whatsapp-connection-service.js')
      const mainStatus = waConn.connectionStatus
      const mainPhone = waConn.connectedPhone
      // Add main account as first if not in DB
      const hasMain = rows.some(r => r.name === 'Principal')
      if (!hasMain) {
        rows.unshift({ id: 'main', name: 'Principal (Baileys)', phone: mainPhone || 'Sin conectar', status: mainStatus, daily_limit: 30, messages_today: 0, messages_total: 0, is_active: true, isMain: true })
      }
    } catch {}
    res.json({ success: true, accounts: rows })
  } catch (err) { res.status(500).json({ success: false, error: err.message }) }
})

app.post('/api/whatsapp-accounts', async (req, res) => {
  try {
    const { pool } = await import('./config/database.js')
    const { name, daily_limit } = req.body
    const { rows } = await pool.query(
      'INSERT INTO whatsapp_accounts (name, daily_limit) VALUES ($1, $2) RETURNING *',
      [name || 'WhatsApp ' + Date.now(), daily_limit || 100]
    )
    res.json({ success: true, account: rows[0] })
  } catch (err) { res.status(500).json({ success: false, error: err.message }) }
})

app.put('/api/whatsapp-accounts/:id', async (req, res) => {
  try {
    const { pool } = await import('./config/database.js')
    const { name, daily_limit, is_active } = req.body
    await pool.query('UPDATE whatsapp_accounts SET name=$1, daily_limit=$2, is_active=$3 WHERE id=$4',
      [name, daily_limit || 100, is_active !== false, req.params.id])
    res.json({ success: true })
  } catch (err) { res.status(500).json({ success: false, error: err.message }) }
})

app.delete('/api/whatsapp-accounts/:id', async (req, res) => {
  try {
    const { pool } = await import('./config/database.js')
    await pool.query('DELETE FROM whatsapp_accounts WHERE id = $1', [req.params.id])
    res.json({ success: true })
  } catch (err) { res.status(500).json({ success: false, error: err.message }) }
})

// Get best available account for a lead (no duplicates)
app.get('/api/whatsapp-accounts/best', async (req, res) => {
  try {
    const { pool } = await import('./config/database.js')
    const { leadId } = req.query

    // If lead was already contacted by an account, return that same account
    if (leadId) {
      const existing = await pool.query(
        "SELECT DISTINCT wa_account_id FROM outreach_messages WHERE lead_id = $1 AND wa_account_id IS NOT NULL LIMIT 1",
        [leadId]
      )
      if (existing.rows[0]?.wa_account_id) {
        const acc = await pool.query("SELECT * FROM whatsapp_accounts WHERE id = $1 AND is_active = true AND messages_today < daily_limit", [existing.rows[0].wa_account_id])
        if (acc.rows[0]) return res.json({ success: true, account: acc.rows[0], reason: 'same_account' })
      }
    }

    // Get account with lowest usage that hasn't contacted this lead
    const { rows } = await pool.query(
      "SELECT * FROM whatsapp_accounts WHERE is_active = true AND messages_today < daily_limit ORDER BY messages_today ASC LIMIT 1"
    )
    res.json({ success: true, account: rows[0] || null, reason: 'lowest_usage' })
  } catch (err) { res.status(500).json({ success: false, error: err.message }) }
})

// Increment message count
app.post('/api/whatsapp-accounts/:id/increment', async (req, res) => {
  try {
    const { pool } = await import('./config/database.js')
    await pool.query('UPDATE whatsapp_accounts SET messages_today = messages_today + 1, messages_total = messages_total + 1 WHERE id = $1', [req.params.id])
    res.json({ success: true })
  } catch (err) { res.status(500).json({ success: false, error: err.message }) }
})

// ── LinkedIn Profiles ─────────────────────────────────────────────────────────
import('./config/database.js').then(({ pool }) => {
  pool.query(`
    CREATE TABLE IF NOT EXISTS linkedin_profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      avatar_id UUID REFERENCES avatars(id) ON DELETE SET NULL,
      linkedin_url TEXT,
      username VARCHAR(255),
      headline TEXT,
      auto_post BOOLEAN DEFAULT false,
      auto_connect BOOLEAN DEFAULT false,
      auto_dm BOOLEAN DEFAULT false,
      posts JSONB DEFAULT '[]',
      dm_templates JSONB DEFAULT '[]',
      stats JSONB DEFAULT '{"posts":0,"connections":0,"messages":0}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(() => {})
  pool.query(`
    CREATE TABLE IF NOT EXISTS scheduled_posts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      profile_id UUID REFERENCES linkedin_profiles(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      hashtags JSONB DEFAULT '[]',
      image_url TEXT,
      scheduled_at TIMESTAMPTZ NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      published_at TIMESTAMPTZ,
      error TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(() => {})
})

// Scheduler: check every minute for posts to publish
setInterval(async () => {
  try {
    const { pool } = await import('./config/database.js')
    const { rows } = await pool.query(
      `SELECT sp.*, lp.name as profile_name FROM scheduled_posts sp
       JOIN linkedin_profiles lp ON lp.id = sp.profile_id
       WHERE sp.status = 'pending' AND sp.scheduled_at <= NOW()
       ORDER BY sp.scheduled_at ASC LIMIT 3`
    )
    if (!rows.length) return

    const { linkedinBrowser } = await import('./services/linkedin/linkedin-browser-service.js')
    for (const post of rows) {
      try {
        // Mark as processing immediately to prevent duplicate runs
        const { rowCount } = await pool.query(
          "UPDATE scheduled_posts SET status = 'processing' WHERE id = $1 AND status = 'pending'", [post.id]
        )
        if (rowCount === 0) continue // Already picked up by another cycle

        // Check if browser session exists and is logged in
        const session = linkedinBrowser.sessions?.get(post.profile_id)
        if (!session?.loggedIn) {
          console.log(`[Scheduler] No active session for ${post.profile_name}, skipping`)
          await pool.query('UPDATE scheduled_posts SET status = $1, error = $2 WHERE id = $3',
            ['pending', 'Esperando sesion activa de LinkedIn', post.id])
          liLog(post.profile_id, `Post programado no publicado: no hay sesion activa`, 'error', 'post')
          continue
        }

        console.log(`[Scheduler] Publishing scheduled post for ${post.profile_name}: "${post.text.slice(0, 50)}..."`)
        liLog(post.profile_id, `Publicando post programado: "${post.text.slice(0, 50)}..."`, 'info', 'post')

        // Track retry count from error field (format: "retry:N|message")
        const retryMatch = (post.error || '').match(/^retry:(\d+)\|/)
        const retryCount = retryMatch ? parseInt(retryMatch[1]) : 0
        const MAX_IMAGE_RETRIES = 10 // ~10 minutes of retrying

        // Generate image if not already set (retry up to 2 times per cycle)
        let imageUrl = post.image_url
        if (!imageUrl) {
          const { freepikImageService } = await import('./services/linkedin/freepik-image-service.js')
          for (let attempt = 1; attempt <= 2; attempt++) {
            try {
              liLog(post.profile_id, `Generando imagen (intento ${attempt}/2, ciclo ${retryCount + 1})...`, 'info', 'post')
              const imgResult = await freepikImageService.generateForPost(post.text)
              imageUrl = imgResult?.url || null
              if (imageUrl) {
                await pool.query('UPDATE scheduled_posts SET image_url = $1, error = NULL WHERE id = $2', [imageUrl, post.id])
                liLog(post.profile_id, 'Imagen generada para post programado', 'success', 'post')
                break
              }
            } catch (e) {
              liLog(post.profile_id, `Imagen intento ${attempt} falló: ${e.message?.slice(0, 60)}`, 'error', 'post')
              if (attempt < 2) await new Promise(r => setTimeout(r, 5000))
            }
          }
        }

        // NEVER publish without image - defer to next scheduler cycle (up to MAX_IMAGE_RETRIES)
        if (!imageUrl) {
          const newRetry = retryCount + 1
          if (newRetry >= MAX_IMAGE_RETRIES) {
            liLog(post.profile_id, `No se pudo generar imagen después de ${MAX_IMAGE_RETRIES} ciclos, marcando como fallido`, 'error', 'post')
            await pool.query("UPDATE scheduled_posts SET status = 'failed', error = $1 WHERE id = $2",
              [`No se pudo generar imagen después de ${MAX_IMAGE_RETRIES} intentos`, post.id])
          } else {
            liLog(post.profile_id, `No se pudo generar imagen (ciclo ${newRetry}/${MAX_IMAGE_RETRIES}), reintentando en próximo ciclo...`, 'error', 'post')
            await pool.query("UPDATE scheduled_posts SET status = 'pending', error = $1 WHERE id = $2",
              [`retry:${newRetry}|Esperando imagen`, post.id])
          }
          continue
        }

        liLog(post.profile_id, 'Publicando CON imagen...', 'info', 'post')
        const result = await linkedinBrowser.createPost(post.profile_id, post.text, imageUrl, { requireImage: true })
        liLog(post.profile_id, `Resultado createPost: ${JSON.stringify(result)}`, 'info', 'post')
        if (result.success) {
          await pool.query('UPDATE scheduled_posts SET status = $1, published_at = NOW(), image_url = COALESCE($3, image_url), error = NULL WHERE id = $2', ['published', post.id, imageUrl])
          liLog(post.profile_id, `Post programado publicado con imagen! (${result.message})`, 'success', 'post')
        } else {
          // If image upload to LinkedIn failed, go back to pending to retry
          const newRetry = retryCount + 1
          if (newRetry >= MAX_IMAGE_RETRIES) {
            await pool.query("UPDATE scheduled_posts SET status = 'failed', error = $1 WHERE id = $2", [result.message, post.id])
            liLog(post.profile_id, `Error publicando después de ${MAX_IMAGE_RETRIES} intentos: ${result.message}`, 'error', 'post')
          } else {
            liLog(post.profile_id, `Error publicando: ${result.message}, reintentando ciclo ${newRetry}...`, 'error', 'post')
            await pool.query("UPDATE scheduled_posts SET status = 'pending', error = $1 WHERE id = $2",
              [`retry:${newRetry}|${result.message}`, post.id])
          }
        }
      } catch (e) {
        await pool.query('UPDATE scheduled_posts SET status = $1, error = $2 WHERE id = $3', ['failed', e.message, post.id])
        liLog(post.profile_id, `Error scheduler: ${e.message?.slice(0, 80)}`, 'error', 'post')
      }
    }
  } catch {}
}, 60000) // Check every minute

// Pre-generate images for upcoming posts (every 2 minutes)
setInterval(async () => {
  try {
    const { pool } = await import('./config/database.js')
    const { rows } = await pool.query(
      `SELECT * FROM scheduled_posts WHERE status = 'pending' AND image_url IS NULL AND scheduled_at <= NOW() + interval '6 hours' LIMIT 3`
    )
    if (!rows.length) return

    const { freepikImageService } = await import('./services/linkedin/freepik-image-service.js')
    for (const post of rows) {
      try {
        console.log(`[ImagePregen] Generating image for post ${post.id}`)
        const imgResult = await freepikImageService.generateForPost(post.text)
        const imageUrl = imgResult?.url || null
        if (imageUrl) {
          await pool.query('UPDATE scheduled_posts SET image_url = $1 WHERE id = $2', [imageUrl, post.id])
          console.log(`[ImagePregen] Image saved for post ${post.id}`)
        }
      } catch (e) {
        console.log(`[ImagePregen] Failed for ${post.id}: ${e.message?.slice(0, 80)}`)
      }
    }
  } catch {}
}, 120000) // Every 2 minutes

app.get('/api/linkedin-profiles', async (req, res) => {
  try {
    const { pool } = await import('./config/database.js')
    const { rows } = await pool.query(`
      SELECT lp.*, a.name as avatar_name, a.photo_url as avatar_photo, a.role as avatar_role, a.company as avatar_company
      FROM linkedin_profiles lp
      LEFT JOIN avatars a ON a.id = lp.avatar_id
      ORDER BY lp.created_at DESC
    `)
    res.json({ success: true, profiles: rows })
  } catch (err) { res.status(500).json({ success: false, error: err.message }) }
})

app.post('/api/linkedin-profiles', async (req, res) => {
  try {
    const { pool } = await import('./config/database.js')
    const { name, avatar_id, linkedin_url, username, headline } = req.body
    const { rows } = await pool.query(
      'INSERT INTO linkedin_profiles (name, avatar_id, linkedin_url, username, headline) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [name, avatar_id || null, linkedin_url, username, headline]
    )
    res.json({ success: true, profile: rows[0] })
  } catch (err) { res.status(500).json({ success: false, error: err.message }) }
})

app.put('/api/linkedin-profiles/:id', async (req, res) => {
  try {
    const { pool } = await import('./config/database.js')
    const { name, avatar_id, linkedin_url, username, headline, auto_post, auto_connect, auto_dm } = req.body
    await pool.query(
      `UPDATE linkedin_profiles SET name=$1, avatar_id=$2, linkedin_url=$3, username=$4, headline=$5, auto_post=$6, auto_connect=$7, auto_dm=$8, updated_at=NOW() WHERE id=$9`,
      [name, avatar_id || null, linkedin_url, username, headline, auto_post || false, auto_connect || false, auto_dm || false, req.params.id]
    )
    res.json({ success: true })
  } catch (err) { res.status(500).json({ success: false, error: err.message }) }
})

app.delete('/api/linkedin-profiles/:id', async (req, res) => {
  try {
    const { pool } = await import('./config/database.js')
    await pool.query('DELETE FROM linkedin_profiles WHERE id = $1', [req.params.id])
    res.json({ success: true })
  } catch (err) { res.status(500).json({ success: false, error: err.message }) }
})

app.post('/api/linkedin-profiles/:id/save-post', async (req, res) => {
  try {
    const { pool } = await import('./config/database.js')
    const { post, hashtags, status } = req.body
    const entry = { post, hashtags, status: status || 'draft', createdAt: new Date().toISOString() }
    await pool.query("UPDATE linkedin_profiles SET posts = COALESCE(posts,'[]'::jsonb) || $1::jsonb, stats = jsonb_set(COALESCE(stats,'{}'), '{posts}', (COALESCE((stats->>'posts')::int,0)+1)::text::jsonb) WHERE id = $2", [JSON.stringify(entry), req.params.id])
    res.json({ success: true })
  } catch (err) { res.status(500).json({ success: false, error: err.message }) }
})

// ── LinkedIn Automation ───────────────────────────────────────────────────────

// Get automation status + limits for a profile
app.get('/api/linkedin-profiles/:id/automation/status', async (req, res) => {
  try {
    const { linkedinAutomation } = await import('./services/linkedin/linkedin-automation-service.js')
    res.json({ success: true, ...linkedinAutomation.getStatus(req.params.id) })
  } catch (err) { res.status(500).json({ success: false, error: err.message }) }
})

// Queue actions for a profile
app.post('/api/linkedin-profiles/:id/automation/queue', async (req, res) => {
  try {
    const { linkedinAutomation } = await import('./services/linkedin/linkedin-automation-service.js')
    const { actions } = req.body // [{type:'connect',target:'name'}, {type:'message',target:'name',text:'msg'}]
    const scheduled = linkedinAutomation.generateSchedule(req.params.id, actions || [])
    for (const a of scheduled) {
      if (a.scheduledAt) linkedinAutomation.queueAction(req.params.id, a)
    }
    res.json({ success: true, scheduled, queueSize: linkedinAutomation.getQueue(req.params.id).length })
  } catch (err) { res.status(500).json({ success: false, error: err.message }) }
})

// Get action queue
app.get('/api/linkedin-profiles/:id/automation/queue', async (req, res) => {
  try {
    const { linkedinAutomation } = await import('./services/linkedin/linkedin-automation-service.js')
    res.json({ success: true, queue: linkedinAutomation.getQueue(req.params.id) })
  } catch (err) { res.status(500).json({ success: false, error: err.message }) }
})

// Clear queue
app.delete('/api/linkedin-profiles/:id/automation/queue', async (req, res) => {
  try {
    const { linkedinAutomation } = await import('./services/linkedin/linkedin-automation-service.js')
    linkedinAutomation.clearQueue(req.params.id)
    res.json({ success: true })
  } catch (err) { res.status(500).json({ success: false, error: err.message }) }
})

// ── Scheduled Posts (Calendar) ────────────────────────────────────────────────
app.get('/api/linkedin-profiles/:id/scheduled-posts', async (req, res) => {
  try {
    const { pool } = await import('./config/database.js')
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scheduled_posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        profile_id UUID,
        text TEXT NOT NULL,
        hashtags JSONB DEFAULT '[]',
        image_url TEXT,
        scheduled_at TIMESTAMPTZ NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        published_at TIMESTAMPTZ,
        error TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    const { rows } = await pool.query(
      'SELECT * FROM scheduled_posts WHERE profile_id = $1 ORDER BY scheduled_at ASC',
      [req.params.id]
    )
    res.json({ success: true, posts: rows })
  } catch (err) { res.status(500).json({ success: false, error: err.message }) }
})

app.post('/api/linkedin-profiles/:id/scheduled-posts', async (req, res) => {
  try {
    const { pool } = await import('./config/database.js')
    const { text, hashtags, image_url, scheduled_at } = req.body
    const { rows } = await pool.query(
      'INSERT INTO scheduled_posts (profile_id, text, hashtags, image_url, scheduled_at) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.params.id, text, JSON.stringify(hashtags || []), image_url || null, scheduled_at]
    )
    res.json({ success: true, post: rows[0] })

    // Pre-generate image in background if none provided
    if (!image_url && rows[0]?.id) {
      ;(async () => {
        try {
          const { freepikImageService } = await import('./services/linkedin/freepik-image-service.js')
          const imgResult = await freepikImageService.generateForPost(text)
          const url = imgResult?.url || null
          if (url) {
            await pool.query('UPDATE scheduled_posts SET image_url = $1 WHERE id = $2', [url, rows[0].id])
            console.log(`[ImagePregen] Image pre-generated for new post ${rows[0].id}`)
          }
        } catch (e) {
          console.log(`[ImagePregen] Failed for new post ${rows[0].id}: ${e.message?.slice(0, 80)}`)
        }
      })()
    }
  } catch (err) { res.status(500).json({ success: false, error: err.message }) }
})

app.delete('/api/linkedin-profiles/:id/scheduled-posts/:postId', async (req, res) => {
  try {
    const { pool } = await import('./config/database.js')
    await pool.query('DELETE FROM scheduled_posts WHERE id = $1 AND profile_id = $2', [req.params.postId, req.params.id])
    res.json({ success: true })
  } catch (err) { res.status(500).json({ success: false, error: err.message }) }
})

// Generate full week of scheduled posts with AI
app.post('/api/linkedin-profiles/:id/generate-week', async (req, res) => {
  try {
    const { pool } = await import('./config/database.js')

    // Ensure table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scheduled_posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        profile_id UUID,
        text TEXT NOT NULL,
        hashtags JSONB DEFAULT '[]',
        image_url TEXT,
        scheduled_at TIMESTAMPTZ NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        published_at TIMESTAMPTZ,
        error TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    const { rows } = await pool.query(`
      SELECT lp.*, a.name as avatar_name, a.role as avatar_role, a.company as avatar_company, a.specialties as avatar_specialties
      FROM linkedin_profiles lp LEFT JOIN avatars a ON a.id = lp.avatar_id WHERE lp.id = $1`, [req.params.id])
    if (!rows.length) return res.status(404).json({ success: false, error: 'Profile not found' })
    const p = rows[0]

    const { analyzeWithDeepSeek } = await import('./services/deepseek.js')
    const today = new Date()
    const days = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() + i)
      days.push(d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }))
    }

    console.log('[Calendar] Generating week for', p.name)

    const styles = ['storytelling', 'opinion', 'tip practico', 'pregunta abierta', 'caso de exito', 'tutorial', 'reflexion']
    const topics = [
      'como la IA esta transformando la atencion al cliente',
      'automatizacion de procesos repetitivos con IA',
      'por que las PyMEs necesitan adoptar IA ahora',
      'chatbots inteligentes para ventas',
      'analisis de datos con IA para tomar mejores decisiones',
      'IA generativa aplicada al marketing digital',
      'el futuro del trabajo con inteligencia artificial',
    ]
    const hours = [8, 9, 10, 11, 12, 14, 16]

    const scheduled = []
    // Generate each post individually (faster, avoids timeout)
    for (let i = 0; i < 7; i++) {
      const scheduledDate = new Date(today)
      scheduledDate.setDate(scheduledDate.getDate() + i)
      scheduledDate.setHours(hours[i] || 9, Math.floor(Math.random() * 30), 0, 0)
      const dayName = scheduledDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })

      let postText = '', hashtags = []
      try {
        const resp = await analyzeWithDeepSeek(`
Sos ${p.avatar_name || p.name}, ${p.avatar_role || 'profesional'} en ${p.avatar_company || 'empresa de tecnologia'}.
Genera UN post de LinkedIn estilo ${styles[i]} sobre: ${topics[i]}.
Max 150 palabras, natural, no vendedor. Español argentino.
Responde SOLO JSON sin comentarios: {"post":"texto","hashtags":["tag1","tag2","tag3"]}
        `)
        const parsed = JSON.parse(resp.match(/\{[\s\S]*\}/)?.[0] || '{}')
        if (parsed.post) {
          postText = parsed.post
          hashtags = parsed.hashtags || []
        }
      } catch (aiErr) {
        console.log(`[Calendar] AI failed for day ${i+1}, using fallback:`, aiErr.message?.slice(0, 80))
      }

      // Fallback if AI failed
      if (!postText) {
        postText = `${topics[i].charAt(0).toUpperCase() + topics[i].slice(1)}.\n\nEn ${p.avatar_company || 'Adbize'} venimos trabajando con empresas que quieren dar el salto a la inteligencia artificial. Lo que mas nos sorprende es lo rapido que se ven resultados cuando se implementa bien.\n\nLa clave no es reemplazar personas, sino potenciarlas. La IA se encarga de lo repetitivo para que tu equipo se enfoque en lo que realmente importa.\n\nSi queres ver como funciona, te ofrecemos una demo gratis.`
        hashtags = ['InteligenciaArtificial', 'IAparaEmpresas', 'TransformacionDigital']
      }

      const fullText = postText + '\n\n' + hashtags.map(h => '#' + h).join(' ')
      const { rows: inserted } = await pool.query(
        'INSERT INTO scheduled_posts (profile_id, text, hashtags, scheduled_at) VALUES ($1,$2,$3,$4) RETURNING *',
        [req.params.id, fullText, JSON.stringify(hashtags), scheduledDate.toISOString()]
      )
      scheduled.push({ ...inserted[0], style: styles[i], day: dayName })
      console.log(`[Calendar] Scheduled day ${i+1}: ${dayName}`)
    }

    console.log('[Calendar] Scheduled', scheduled.length, 'posts')
    res.json({ success: true, posts: scheduled })

    // Pre-generate images for all new posts in background
    ;(async () => {
      try {
        const { freepikImageService } = await import('./services/linkedin/freepik-image-service.js')
        for (const post of scheduled) {
          if (post.image_url) continue
          try {
            const imgResult = await freepikImageService.generateForPost(post.text)
            const url = imgResult?.url || null
            if (url) {
              await pool.query('UPDATE scheduled_posts SET image_url = $1 WHERE id = $2', [url, post.id])
              console.log(`[ImagePregen] Calendar image ready for post ${post.id}`)
            }
          } catch (e) {
            console.log(`[ImagePregen] Calendar failed for ${post.id}: ${e.message?.slice(0, 80)}`)
          }
        }
      } catch (e) { console.log('[ImagePregen] Calendar batch error:', e.message) }
    })()
  } catch (err) {
    console.error('[Calendar] Error:', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// Optimize profile with Gemini
app.post('/api/linkedin-profiles/:id/optimize', async (req, res) => {
  try {
    const { pool } = await import('./config/database.js')
    const { rows } = await pool.query(`
      SELECT lp.*, a.name as avatar_name, a.role as avatar_role, a.company as avatar_company
      FROM linkedin_profiles lp LEFT JOIN avatars a ON a.id = lp.avatar_id WHERE lp.id = $1`, [req.params.id])
    if (!rows.length) return res.status(404).json({ success: false, error: 'Profile not found' })
    const p = rows[0]

    // Try Gemini first, fallback to DeepSeek
    try {
      const { geminiImageService } = await import('./services/linkedin/gemini-image-service.js')
      const result = await geminiImageService.optimizeProfile({
        name: p.name, headline: p.headline, role: p.avatar_role, company: p.avatar_company
      })
      return res.json({ success: true, optimization: result, provider: 'gemini' })
    } catch {}

    // Fallback to DeepSeek
    const { analyzeWithDeepSeek } = await import('./services/deepseek.js')
    const resp = await analyzeWithDeepSeek(`
      Sos un experto en LinkedIn y marketing personal. Optimiza este perfil de LinkedIn para maximizar visibilidad y conexiones.

      Datos del perfil:
      - Nombre: ${p.name}
      - Headline actual: ${p.headline || 'Sin headline'}
      - Rol: ${p.avatar_role || 'No especificado'}
      - Empresa: ${p.avatar_company || 'No especificada'}

      IMPORTANTE: Todo en ESPAÑOL ARGENTINO. Usa lenguaje profesional pero cercano.

      Responde SOLO con un JSON valido sin comentarios:
      {
        "headline": "headline optimizado, max 120 caracteres, con keywords de la industria y propuesta de valor clara",
        "about": "seccion Acerca De optimizada, max 200 palabras. Debe incluir: quien sos, que haces, como ayudas, logros clave, llamada a la accion. Usa keywords naturalmente. Tono argentino profesional.",
        "keywords": ["5 a 8 keywords estrategicas para el perfil, en español"],
        "contentSuggestion": "estrategia semanal de contenido: que tipo de posts hacer, con que frecuencia, y sobre que temas para posicionarse como referente",
        "profileTips": "3 tips concretos para mejorar el perfil (foto, banner, experiencia, recomendaciones, etc)"
      }
    `)
    const parsed = JSON.parse(resp.match(/\{[\s\S]*\}/)?.[0] || '{}')
    res.json({ success: true, optimization: parsed, provider: 'deepseek' })
  } catch (err) { res.status(500).json({ success: false, error: err.message }) }
})

// Generate image prompt with Gemini
app.post('/api/linkedin-profiles/:id/generate-image', async (req, res) => {
  try {
    const { postContent, style } = req.body
    try {
      const { geminiImageService } = await import('./services/linkedin/gemini-image-service.js')
      const result = await geminiImageService.generateImagePrompt(postContent, style)
      return res.json({ success: true, imagePrompt: result })
    } catch {}
    // Fallback
    const { analyzeWithDeepSeek } = await import('./services/deepseek.js')
    const resp = await analyzeWithDeepSeek(`Generate a detailed image prompt for this LinkedIn post: "${(postContent||'').slice(0,300)}". JSON: {"prompt":"image description","style":"${style||'professional'}","colors":["c1","c2"]}`)
    const parsed = JSON.parse(resp.match(/\{[\s\S]*\}/)?.[0] || '{}')
    res.json({ success: true, imagePrompt: parsed })
  } catch (err) { res.status(500).json({ success: false, error: err.message }) }
})

// ── LinkedIn Browser Automation ───────────────────────────────────────────────
// Pre-download Chrome on startup (runs in background)
setTimeout(async () => {
  try {
    const { execSync } = await import('child_process')
    const { existsSync } = await import('fs')
    const cacheDir = '/app/chrome-data'
    // Check if chrome already exists
    try {
      const found = execSync(`find ${cacheDir} -name "chrome" -type f 2>/dev/null | head -1`, { encoding: 'utf8', timeout: 5000 }).trim()
      if (found) { console.log('[LinkedIn] Chrome already in persistent storage:', found); return }
    } catch {}
    console.log('[LinkedIn] Pre-downloading Chrome to persistent storage...')
    execSync(`npx puppeteer browsers install chrome`, {
      cwd: '/app/backend',
      env: { ...process.env, PUPPETEER_CACHE_DIR: cacheDir },
      timeout: 180000,
      stdio: 'inherit'
    })
    console.log('[LinkedIn] Chrome downloaded successfully')
  } catch (e) {
    console.log('[LinkedIn] Chrome pre-download skipped:', e.message?.slice(0, 100))
  }
}, 10000) // Start 10s after boot

// Add cookies + encrypted credentials columns
import('./config/database.js').then(({ pool }) => {
  pool.query('ALTER TABLE linkedin_profiles ADD COLUMN IF NOT EXISTS cookies TEXT').catch(() => {})
  pool.query('ALTER TABLE linkedin_profiles ADD COLUMN IF NOT EXISTS email_encrypted TEXT').catch(() => {})
  pool.query('ALTER TABLE linkedin_profiles ADD COLUMN IF NOT EXISTS pass_encrypted TEXT').catch(() => {})
})

app.post('/api/linkedin-profiles/:id/connect', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ success: false, error: 'Email y password requeridos' })

    const { pool } = await import('./config/database.js')
    const { encrypt } = await import('./services/linkedin/linkedin-browser-service.js')

    // Save encrypted credentials
    await pool.query('UPDATE linkedin_profiles SET email_encrypted = $1, pass_encrypted = $2 WHERE id = $3',
      [encrypt(email), encrypt(password), req.params.id])

    // Try login
    const { linkedinBrowser } = await import('./services/linkedin/linkedin-browser-service.js')
    const result = await linkedinBrowser.login(req.params.id, email, password)

    res.json({ success: result.success, message: result.message, needsVerification: result.needsVerification })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

app.get('/api/linkedin-profiles/:id/connection-status', async (req, res) => {
  try {
    const { linkedinBrowser } = await import('./services/linkedin/linkedin-browser-service.js')
    res.json({ success: true, ...linkedinBrowser.getStatus(req.params.id) })
  } catch (err) {
    res.json({ success: true, connected: false })
  }
})

app.post('/api/linkedin-profiles/:id/verify', async (req, res) => {
  try {
    const { code } = req.body
    if (!code) return res.status(400).json({ success: false, error: 'Codigo requerido' })

    const { linkedinBrowser } = await import('./services/linkedin/linkedin-browser-service.js')
    const result = await linkedinBrowser.submitVerification(req.params.id, code)
    res.json(result)
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

app.post('/api/linkedin-profiles/:id/disconnect', async (req, res) => {
  try {
    const { linkedinBrowser } = await import('./services/linkedin/linkedin-browser-service.js')
    await linkedinBrowser.disconnect(req.params.id)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// LinkedIn automation engine with live logs
const liAutoState = new Map() // profileId -> { running, config }
const liLogs = new Map() // profileId -> [{time, msg, type, category}]

function liLog(profileId, msg, type = 'info', category = 'system') {
  if (!liLogs.has(profileId)) liLogs.set(profileId, [])
  const logs = liLogs.get(profileId)
  logs.unshift({ time: new Date().toISOString(), msg, type, category })
  if (logs.length > 200) logs.pop()
  console.log(`[LinkedIn ${category}/${type}] ${msg}`)
}

app.get('/api/linkedin-profiles/:id/logs', (req, res) => {
  const allLogs = liLogs.get(req.params.id) || []
  const postLogs = allLogs.filter(l => l.category === 'post')
  const connectionLogs = allLogs.filter(l => l.category === 'connection')
  const systemLogs = allLogs.filter(l => l.category === 'system')
  res.json({ success: true, logs: allLogs, postLogs, connectionLogs, systemLogs, running: liAutoState.get(req.params.id)?.running || false })
})

app.post('/api/linkedin-profiles/:id/automation/start', async (req, res) => {
  const pid = req.params.id
  try {
    const { config } = req.body
    if (liAutoState.get(pid)?.running) return res.json({ success: false, error: 'Ya esta corriendo' })

    liAutoState.set(pid, { running: true, config: config || {}, startedAt: new Date().toISOString() })
    liLog(pid, 'Automatizacion iniciada', 'success')

    const { pool } = await import('./config/database.js')
    await pool.query('UPDATE linkedin_profiles SET stats = jsonb_set(COALESCE(stats,\'{}\'::jsonb), \'{autoConfig}\', $1::jsonb) WHERE id = $2',
      [JSON.stringify(config || {}), pid])

    res.json({ success: true, message: 'Automatizacion iniciada' })

    // Background automation loop
    ;(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms))
      const randomDelay = () => sleep(5000 + Math.random() * 10000)

      try {
        // Step 1: Ensure connected
        liLog(pid, 'Verificando conexion a LinkedIn...')
        const { linkedinBrowser } = await import('./services/linkedin/linkedin-browser-service.js')
        const connected = await linkedinBrowser.ensureConnected(pid)
        if (!connected) {
          liLog(pid, 'No se pudo conectar a LinkedIn. Conecta manualmente primero.', 'error')
          liAutoState.delete(pid)
          return
        }
        liLog(pid, 'Conectado a LinkedIn', 'success')

        const cfg = config || {}
        const topics = cfg.postTopics || ['IA para empresas']
        const profileRes = await pool.query('SELECT lp.*, a.name as avatar_name, a.role as avatar_role, a.company as avatar_company FROM linkedin_profiles lp LEFT JOIN avatars a ON a.id = lp.avatar_id WHERE lp.id = $1', [pid])
        const p = profileRes.rows[0]

        // Step 2: Generate and publish post
        if (!liAutoState.get(pid)?.running) return
        liLog(pid, 'Generando post con IA...', 'info', 'post')
        const topic = topics[Math.floor(Math.random() * topics.length)]
        try {
          const { analyzeWithDeepSeek } = await import('./services/deepseek.js')
          const postContent = await analyzeWithDeepSeek(
            `Eres ${p?.avatar_name || p?.name || 'profesional'} de ${p?.avatar_company || 'Adbize'}. Genera un post de LinkedIn NATURAL sobre: ${topic}. Menciona sutilmente como la IA puede beneficiar empresas. No seas vendedor. Max 150 palabras. Espanol argentino. Responde SOLO con un JSON valido sin comentarios: {"post":"texto del post aqui","hashtags":["tag1","tag2","tag3"]}`
          )
          let parsed = {}
          try { parsed = JSON.parse(postContent.match(/\{[\s\S]*\}/)?.[0] || '{}') } catch { liLog(pid, 'IA devolvio JSON invalido, reintentando...', 'error', 'post') }
          if (parsed.post) {
            liLog(pid, `Post generado: "${parsed.post.slice(0, 80)}..."`, 'info', 'post')

            // Generate image with Freepik
            let imageUrl = null
            try {
              liLog(pid, 'Generando imagen con Freepik Mystic...', 'info', 'post')
              const { freepikImageService } = await import('./services/linkedin/freepik-image-service.js')
              const imgResult = await freepikImageService.generateForPost(parsed.post)
              imageUrl = imgResult?.url || null
              if (imageUrl) liLog(pid, 'Imagen generada!', 'success', 'post')
            } catch (imgErr) { liLog(pid, `Imagen no disponible: ${imgErr.message?.slice(0, 60)}`, 'error', 'post') }

            const fullPost = parsed.post + '\n\n' + (parsed.hashtags || []).map(h => '#' + h).join(' ')
            const postResult = await linkedinBrowser.createPost(pid, fullPost, imageUrl)
            liLog(pid, postResult.success ? (imageUrl ? 'Post con imagen publicado!' : 'Post publicado!') : `Error: ${postResult.message}`, postResult.success ? 'success' : 'error', 'post')
          } else {
            liLog(pid, 'No se pudo generar post, continuando...', 'error', 'post')
          }
        } catch (e) { liLog(pid, `Error publicando: ${e.message?.slice(0, 100)}`, 'error', 'post') }

        await randomDelay()

        // Step 3: Search and connect with decision makers
        if (!liAutoState.get(pid)?.running) return
        const targetRoles = cfg.targetRoles || ['CEO', 'Gerente']
        const targetIndustries = cfg.targetIndustries || ['Tecnologia']
        const maxConnections = Math.min(cfg.dailyConnections || 10, 25)
        const searchQuery = `${targetRoles[Math.floor(Math.random() * targetRoles.length)]} ${targetIndustries[Math.floor(Math.random() * targetIndustries.length)]}`
        liLog(pid, `Buscando "${searchQuery}" para conectar (max ${maxConnections})...`, 'info', 'connection')

        try {
          const session = linkedinBrowser.sessions.get(pid)
          if (session?.page) {
            const { page } = session

            // Go to LinkedIn search
            const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(searchQuery)}&origin=GLOBAL_SEARCH_HEADER`
            liLog(pid, `Navegando a busqueda: ${searchQuery}`, 'info', 'connection')
            await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
            await sleep(3000 + Math.random() * 4000)

            // Find Connect buttons on the page
            let connected = 0
            for (let attempt = 0; attempt < 3 && connected < maxConnections; attempt++) {
              if (!liAutoState.get(pid)?.running) break

              // Scroll down slowly to load results
              for (let s = 0; s < 3; s++) {
                await page.evaluate(() => window.scrollBy(0, 400 + Math.random() * 600))
                await sleep(1000 + Math.random() * 1500)
              }
              await sleep(2000 + Math.random() * 2000)

              // Find Connect buttons and extract contact info (name, headline, company)
              const connectButtons = await page.evaluate(() => {
                const buttons = [...document.querySelectorAll('button')]
                const connectBtns = buttons.filter(b => {
                  const text = b.textContent?.trim().toLowerCase() || ''
                  const label = (b.getAttribute('aria-label') || '').toLowerCase()
                  return (text === 'connect' || text === 'conectar' ||
                          label.includes('connect') || label.includes('conectar') ||
                          label.includes('invite') || label.includes('invitar'))
                })
                return connectBtns.map((b) => {
                  const card = b.closest('li, [data-view-name], .entity-result__item, .reusable-search__result-container')
                  const nameEl = card?.querySelector('span[dir="ltr"] > span[aria-hidden="true"], .entity-result__title-text a span, a[href*="/in/"] span')
                  const headlineEl = card?.querySelector('.entity-result__primary-subtitle, .entity-result__summary, [class*="subtitle"]')
                  const locationEl = card?.querySelector('.entity-result__secondary-subtitle, [class*="secondary"]')
                  return {
                    index: buttons.indexOf(b),
                    name: nameEl?.textContent?.trim() || 'Persona',
                    headline: headlineEl?.textContent?.trim() || '',
                    location: locationEl?.textContent?.trim() || '',
                  }
                })
              })
              liLog(pid, `Encontrados ${connectButtons.length} botones de conexion en pagina ${attempt + 1}`, 'info', 'connection')

              const { analyzeWithDeepSeek } = await import('./services/deepseek.js')

              for (const { index, name, headline, location } of connectButtons) {
                if (!liAutoState.get(pid)?.running || connected >= maxConnections) break

                try {
                  liLog(pid, `Conexion ${connected + 1}/${maxConnections}: ${name} - ${headline}`, 'info', 'connection')

                  // Generate personalized AI note based on contact info
                  let aiNote = ''
                  try {
                    const senderName = p?.avatar_name || p?.name || 'profesional'
                    const senderCompany = p?.avatar_company || 'Adbize'
                    const aiResp = await analyzeWithDeepSeek(
                      `Eres ${senderName} de ${senderCompany}, experto en implementar IA en empresas.
Genera un mensaje de conexion de LinkedIn ULTRA PERSUASIVO y personalizado para esta persona:

Nombre: ${name}
Cargo/Info: ${headline}
${location ? `Ubicacion: ${location}` : ''}

REGLAS:
- Maximo 280 caracteres (limite de LinkedIn)
- Empieza con "Hola ${name.split(' ')[0]}!"
- Menciona algo especifico de su cargo/industria
- Da UN ejemplo concreto de como la IA puede ayudar en su rol (automatizar procesos, predecir ventas, chatbots para atencion, analisis de datos, etc)
- Ofrece una DEMO GRATIS para que vea el potencial de la IA aplicada a su negocio
- Termina invitando a agendar la demo o conversar
- Tono cercano, argentino, profesional pero no formal
- NO uses emojis
- NO pongas comillas

Responde SOLO con el mensaje, nada mas.`
                    )
                    aiNote = aiResp.trim().replace(/^["']|["']$/g, '').slice(0, 280)
                    liLog(pid, `Nota IA: "${aiNote.slice(0, 80)}..."`, 'info', 'connection')
                  } catch (aiErr) {
                    aiNote = `Hola ${name.split(' ')[0]}! Vi tu perfil y me parecio muy interesante. Estamos ayudando empresas a implementar IA para automatizar procesos y potenciar resultados. Te ofrezco una demo gratis para que veas el potencial. Conectamos?`
                    liLog(pid, `Nota IA fallo, usando fallback`, 'error', 'connection')
                  }

                  // Click the connect button by index
                  await page.evaluate(idx => {
                    const btns = document.querySelectorAll('button')
                    btns[idx]?.click()
                  }, index)
                  await sleep(2000 + Math.random() * 2000)

                  // Check for modal dialog - look for "Add a note" or "Send" button
                  const modalAction = await page.evaluate(() => {
                    const modal = document.querySelector('[role="dialog"], .artdeco-modal, .send-invite')
                    if (!modal) return 'no-modal'

                    const buttons = [...modal.querySelectorAll('button')]

                    // Look for "Add a note" button
                    const addNoteBtn = buttons.find(b => {
                      const t = b.textContent?.trim().toLowerCase() || ''
                      return t.includes('add a note') || t.includes('agregar nota') || t.includes('añadir nota')
                    })
                    if (addNoteBtn) {
                      addNoteBtn.click()
                      return 'adding-note'
                    }

                    // Look for "Send without a note" or direct "Send"
                    const sendBtn = buttons.find(b => {
                      const t = b.textContent?.trim().toLowerCase() || ''
                      return t.includes('send') || t.includes('enviar')
                    })
                    if (sendBtn) {
                      // Don't click send yet - we want to add a note
                      return 'send-available'
                    }

                    return 'unknown-modal'
                  })

                  if (modalAction === 'adding-note' || modalAction === 'send-available') {
                    await sleep(1000 + Math.random() * 1500)
                    // Type personalized AI note in textarea
                    const noteInput = await page.$('textarea#custom-message, textarea[name="message"], [role="dialog"] textarea')
                    if (noteInput) {
                      await noteInput.type(aiNote, { delay: 25 + Math.random() * 40 })
                      await sleep(800 + Math.random() * 1000)
                    }
                    // Click Send in modal
                    await page.evaluate(() => {
                      const modal = document.querySelector('[role="dialog"], .artdeco-modal, .send-invite')
                      if (!modal) return
                      const btns = [...modal.querySelectorAll('button')]
                      const sendBtn = btns.find(b => {
                        const t = b.textContent?.trim().toLowerCase() || ''
                        return t === 'send' || t === 'enviar' || t.includes('send invitation') || t.includes('enviar invitacion')
                      })
                      if (sendBtn) sendBtn.click()
                    })
                  } else if (modalAction === 'no-modal') {
                    liLog(pid, `No aparecio modal para ${name}`, 'error', 'connection')
                  }

                  await sleep(1000 + Math.random() * 1500)

                  // Dismiss any remaining dialog
                  await page.evaluate(() => {
                    const modal = document.querySelector('[role="dialog"], .artdeco-modal')
                    if (!modal) return
                    const dismiss = modal.querySelector('button[aria-label*="Dismiss"], button[aria-label*="Cerrar"], button[data-test-modal-close-btn]')
                    if (dismiss) dismiss.click()
                  })

                  connected++
                  liLog(pid, `Conexion enviada a ${name} con nota personalizada`, 'success', 'connection')
                  await sleep(8000 + Math.random() * 15000) // 8-23s between connections
                } catch (connErr) {
                  liLog(pid, `Error conectando: ${connErr.message?.slice(0, 60)}`, 'error', 'connection')
                  await sleep(3000)
                }
              }

              // Next page
              if (connected < maxConnections) {
                const nextClicked = await page.evaluate(() => {
                  const btns = [...document.querySelectorAll('button')]
                  const next = btns.find(b => {
                    const label = (b.getAttribute('aria-label') || '').toLowerCase()
                    const text = b.textContent?.trim().toLowerCase() || ''
                    return label.includes('next') || label.includes('siguiente') || text === 'next' || text === 'siguiente' || text === '→'
                  })
                  if (next && !next.disabled) { next.click(); return true }
                  return false
                })
                if (nextClicked) {
                  await sleep(4000 + Math.random() * 5000)
                } else break
              }
            }

            liLog(pid, `${connected} conexiones enviadas`, 'success', 'connection')
          }
        } catch (searchErr) {
          liLog(pid, `Error en busqueda: ${searchErr.message?.slice(0, 100)}`, 'error', 'connection')
        }

        liLog(pid, 'Ciclo de automatizacion completado', 'success')
      } catch (e) {
        liLog(pid, `Error: ${e.message}`, 'error')
      } finally {
        liAutoState.delete(pid)
        liLog(pid, 'Automatizacion finalizada')
      }
    })()
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

app.post('/api/linkedin-profiles/:id/automation/stop', async (req, res) => {
  liAutoState.delete(req.params.id)
  res.json({ success: true })
})

app.post('/api/linkedin-profiles/:id/post', async (req, res) => {
  try {
    const { text } = req.body
    const { linkedinBrowser } = await import('./services/linkedin/linkedin-browser-service.js')
    const result = await linkedinBrowser.createPost(req.params.id, text)
    res.json(result)
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// Update posts without images - delete and re-post with generated image
app.post('/api/linkedin-profiles/:id/fix-images', async (req, res) => {
  const pid = req.params.id
  try {
    const { linkedinBrowser } = await import('./services/linkedin/linkedin-browser-service.js')
    const { freepikImageService } = await import('./services/linkedin/freepik-image-service.js')

    liLog(pid, 'Buscando posts sin imagen para actualizar...', 'info', 'post')

    // Get session with browser page
    const session = linkedinBrowser.sessions?.get(pid)
    if (!session?.loggedIn || !session?.page) return res.json({ success: false, error: 'No conectado' })
    const { page } = session

    // Check if page is busy (navigating or has pending navigation)
    if (session._pageInUse) {
      liLog(pid, 'La página del navegador está ocupada, intentar más tarde', 'error', 'post')
      return res.json({ success: false, error: 'El navegador está ocupado con otra operación. Intentar más tarde.' })
    }

    // Navigate to profile activity page and scrape posts from the DOM
    let posts = []
    session._pageInUse = true
    try {
      // Wrap entire scraping in a timeout to avoid hanging forever
      const scrapeTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout: scraping took too long (60s)')), 60000))
      const scrapeWork = (async () => {
        liLog(pid, 'Navegando a página de actividad...', 'info', 'post')
        await page.goto('https://www.linkedin.com/in/me/recent-activity/all/', { waitUntil: 'domcontentloaded', timeout: 20000 })
        liLog(pid, 'Página cargada, esperando contenido...', 'info', 'post')
        await new Promise(r => setTimeout(r, 4000))

        // Scroll to load posts
        for (let i = 0; i < 3; i++) {
          await page.evaluate(() => window.scrollBy(0, 800))
          await new Promise(r => setTimeout(r, 1500))
        }

        liLog(pid, 'Extrayendo posts del DOM...', 'info', 'post')
        // Extract posts from DOM
        return await page.evaluate(() => {
          const items = document.querySelectorAll('.feed-shared-update-v2, [data-urn*="activity"], .profile-creator-shared-feed-update__container')
          return [...items].slice(0, 15).map(item => {
            const textEl = item.querySelector('.feed-shared-text, .break-words span[dir="ltr"], .update-components-text span[dir="ltr"]')
            const imgEl = item.querySelector('.feed-shared-image img, .update-components-image img, img[data-delayed-url]')
            const urnAttr = item.getAttribute('data-urn') || item.closest('[data-urn]')?.getAttribute('data-urn') || ''
            return {
              text: textEl?.textContent?.trim() || '',
              hasImage: !!imgEl,
              urn: urnAttr,
            }
          }).filter(p => p.text.length > 20)
        })
      })()

      posts = await Promise.race([scrapeWork, scrapeTimeout])
      liLog(pid, `Encontrados ${posts.length} posts, ${posts.filter(p => !p.hasImage).length} sin imagen`, 'success', 'post')
    } catch (e) {
      liLog(pid, `Error obteniendo posts: ${e.message?.slice(0, 80)}`, 'error', 'post')
      return res.json({ success: false, error: 'Error obteniendo posts: ' + e.message })
    } finally {
      session._pageInUse = false
    }

    if (!posts.filter(p => !p.hasImage).length) {
      liLog(pid, 'Todos los posts ya tienen imagen!', 'success', 'post')
      return res.json({ success: true, message: 'Todos los posts ya tienen imagen' })
    }

    res.json({ success: true, message: 'Procesando posts sin imagen en background...' })

    // Process in background
    ;(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms))
      let fixed = 0

      // Get auth for API calls
      const auth = await linkedinBrowser._getSessionAuth(pid)
      const csrfToken = auth?.csrfToken
      const cookieStr = auth?.cookieStr
      const axios = (await import('axios')).default

      for (const post of posts) {
        try {
          if (post.hasImage || !post.text) continue

          liLog(pid, `Post sin imagen: "${post.text.slice(0, 60)}..."`, 'info', 'post')

          // FIRST generate the image, THEN delete old post (don't delete if no replacement)
          await sleep(3000 + Math.random() * 3000)

          let imageUrl = null
          try {
            liLog(pid, 'Generando imagen con Freepik...', 'info', 'post')
            const imgResult = await freepikImageService.generateForPost(post.text)
            imageUrl = imgResult?.url || null
            if (imageUrl) liLog(pid, 'Imagen generada!', 'success', 'post')
          } catch (imgErr) {
            liLog(pid, `Error generando imagen: ${imgErr.message?.slice(0, 60)}`, 'error', 'post')
          }

          // Do NOT re-publish without image - that defeats the purpose
          if (!imageUrl) {
            liLog(pid, 'No se pudo generar imagen, saltando este post (no se borrará sin imagen nueva)', 'error', 'post')
            continue
          }

          // Only delete old post AFTER we have a replacement image ready
          if (post.urn && csrfToken) {
            try {
              await axios.delete(
                `https://www.linkedin.com/voyager/api/contentcreation/normShares/${encodeURIComponent(post.urn)}`,
                {
                  headers: { 'csrf-token': csrfToken, 'x-restli-protocol-version': '2.0.0', 'Cookie': cookieStr },
                  timeout: 10000,
                }
              )
              liLog(pid, 'Post viejo eliminado', 'info', 'post')
            } catch (delErr) {
              liLog(pid, `No se pudo eliminar post (${delErr.response?.status}), re-publicando como nuevo`, 'error', 'post')
            }
          }

          const result = await linkedinBrowser.createPost(pid, post.text, imageUrl, { requireImage: true })
          if (result.success) {
            fixed++
            liLog(pid, `Post re-publicado con imagen! (${fixed} arreglados)`, 'success', 'post')
          } else {
            liLog(pid, `Error re-publicando: ${result.message}`, 'error', 'post')
          }

          await sleep(10000 + Math.random() * 10000)
        } catch (e) {
          liLog(pid, `Error procesando post: ${e.message?.slice(0, 100)}`, 'error', 'post')
        }
      }

      liLog(pid, `Terminado: ${fixed} posts actualizados con imagen`, 'success', 'post')
    })()
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

app.post('/api/linkedin-profiles/:id/send-connection', async (req, res) => {
  try {
    const { targetUrl, note } = req.body
    const { linkedinBrowser } = await import('./services/linkedin/linkedin-browser-service.js')
    const result = await linkedinBrowser.sendConnection(req.params.id, targetUrl, note)
    res.json(result)
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

app.post('/api/linkedin-profiles/:id/send-message', async (req, res) => {
  try {
    const { targetUrl, message } = req.body
    const { linkedinBrowser } = await import('./services/linkedin/linkedin-browser-service.js')
    const result = await linkedinBrowser.sendMessage(req.params.id, targetUrl, message)
    res.json(result)
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// Generate image with Freepik AI
app.post('/api/linkedin-profiles/:id/generate-freepik-image', async (req, res) => {
  try {
    const { postContent, style } = req.body
    if (!postContent) return res.status(400).json({ success: false, error: 'postContent requerido' })
    const { freepikImageService } = await import('./services/linkedin/freepik-image-service.js')
    const result = await freepikImageService.generateForPost(postContent, style || 'digital-art')
    res.json({ success: true, image: result })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ── PDF Designer AI ──────────────────────────────────────────────────────────
app.post('/api/pdf-designer/generate', async (req, res) => {
  try {
    const { analyzeWithDeepSeek } = await import('./services/deepseek.js')
    const { prompt, template, clientName } = req.body

    const aiPrompt = `Genera el contenido para un PDF de ${template || 'propuesta comercial'} de Adbize para ${clientName || 'un cliente'}.

Contexto del usuario: ${prompt}

Adbize ofrece: apps web, mobile, chatbots IA, machine learning, deep learning, vision artificial, LLMs, automatizacion de procesos, scraping inteligente.
Precios: chatbot desde USD 500, app web USD 1500-5000, app mobile USD 2000-8000, automatizacion USD 800-3000, integral USD 5000-15000.
Pago por hito o mensual, bajo contrato de servicio.

Responde SOLO JSON:
{
  "title": "titulo del documento",
  "subtitle": "subtitulo",
  "intro": "parrafo introductorio personalizado (50 palabras)",
  "services": [{"name": "servicio", "price": "rango USD"}],
  "whyUs": "por que elegir Adbize (40 palabras)"
}`

    const response = await analyzeWithDeepSeek(aiPrompt)
    const parsed = JSON.parse(response.match(/\{[\s\S]*\}/)?.[0] || '{}')
    res.json({ success: true, pdfData: parsed })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

app.get('/api/dashboard/sales-metrics', async (req, res) => {
  try {
    const { pool } = await import('./config/database.js')

    // Today's contacted leads
    const today = await pool.query("SELECT count(*) FROM outreach_messages WHERE sent_at >= CURRENT_DATE AND status = 'SENT'")
    const yesterday = await pool.query("SELECT count(*) FROM outreach_messages WHERE sent_at >= CURRENT_DATE - 1 AND sent_at < CURRENT_DATE AND status = 'SENT'")

    // Response rate
    const totalSent = await pool.query("SELECT count(*) FROM outreach_messages WHERE status = 'SENT'")
    const totalReplied = await pool.query("SELECT count(*) FROM outreach_messages WHERE status = 'REPLIED'")

    // Active conversations
    const activeConvos = await pool.query("SELECT count(*) FROM leads WHERE status = 'EN_CONVERSACION'")

    // Won this month
    const wonMonth = await pool.query("SELECT count(*), COALESCE(sum(CAST(NULLIF(score, 0) AS numeric) * 100), 0) as value FROM leads WHERE UPPER(status) = 'GANADO' AND updated_at >= date_trunc('month', CURRENT_DATE)")

    // Daily contacts last 7 days
    const daily = await pool.query("SELECT DATE(sent_at) as day, count(*) FROM outreach_messages WHERE sent_at >= CURRENT_DATE - 7 AND status = 'SENT' GROUP BY DATE(sent_at) ORDER BY day")

    // Response by hour
    const byHour = await pool.query("SELECT EXTRACT(HOUR FROM sent_at) as hour, count(*) FROM outreach_messages WHERE status = 'REPLIED' AND sent_at IS NOT NULL GROUP BY hour ORDER BY hour")

    // Recent replies with text for sentiment
    const recentReplies = await pool.query(`
      SELECT m.id, m.body, m.subject, m.sent_at, l.id as lead_id, l.name as lead_name
      FROM outreach_messages m
      LEFT JOIN leads l ON l.id = m.lead_id
      WHERE m.status = 'REPLIED' AND m.channel = 'WHATSAPP'
      ORDER BY m.sent_at DESC LIMIT 15
    `)

    // Inactive leads (EN_CONVERSACION, no messages in 3+ days)
    const inactive = await pool.query(`
      SELECT l.id, l.name, l.phone, l.status,
        (SELECT max(sent_at) FROM outreach_messages WHERE lead_id = l.id) as last_activity,
        (SELECT body FROM outreach_messages WHERE lead_id = l.id ORDER BY sent_at DESC LIMIT 1) as last_message
      FROM leads l
      WHERE l.status = 'EN_CONVERSACION'
      AND (SELECT max(sent_at) FROM outreach_messages WHERE lead_id = l.id) < NOW() - INTERVAL '3 days'
      ORDER BY (SELECT max(sent_at) FROM outreach_messages WHERE lead_id = l.id) ASC
      LIMIT 10
    `)

    res.json({
      success: true,
      contactedToday: parseInt(today.rows[0].count),
      contactedYesterday: parseInt(yesterday.rows[0].count),
      totalSent: parseInt(totalSent.rows[0].count),
      totalReplied: parseInt(totalReplied.rows[0].count),
      responseRate: parseInt(totalSent.rows[0].count) > 0 ? Math.round((parseInt(totalReplied.rows[0].count) / parseInt(totalSent.rows[0].count)) * 100) : 0,
      activeConversations: parseInt(activeConvos.rows[0].count),
      wonThisMonth: parseInt(wonMonth.rows[0].count),
      wonValue: parseInt(wonMonth.rows[0].value || 0),
      dailyContacts: daily.rows.map(r => ({ day: r.day, count: parseInt(r.count) })),
      responseByHour: byHour.rows.map(r => ({ hour: parseInt(r.hour), count: parseInt(r.count) })),
      recentReplies: recentReplies.rows,
      inactiveLeads: inactive.rows,
    })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

app.post('/api/leads/:id/update-score', async (req, res) => {
  try {
    const { pool } = await import('./config/database.js')
    const { id } = req.params
    const sent = await pool.query("SELECT count(*) FROM outreach_messages WHERE lead_id = $1 AND status = 'SENT'", [id])
    const replied = await pool.query("SELECT count(*) FROM outreach_messages WHERE lead_id = $1 AND status = 'REPLIED'", [id])
    const s = parseInt(sent.rows[0].count)
    const r = parseInt(replied.rows[0].count)
    let scoreBoost = 0
    if (r > 0) scoreBoost = Math.min(30, r * 15)
    if (s > 0 && r === 0) scoreBoost = -10
    await pool.query("UPDATE leads SET score = LEAST(100, GREATEST(0, COALESCE(score, 50) + $1)) WHERE id = $2", [scoreBoost, id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' })
})

// Serve frontend static files in production with cache headers
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist')
app.use(express.static(frontendDist, {
  maxAge: '1y',
  etag: true,
  setHeaders: (res, filePath) => {
    // HTML files should not be cached aggressively
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache')
    }
  }
}))

// SPA fallback - serve index.html for non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(frontendDist, 'index.html'))
  }
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ message: 'Something went wrong!', error: err.message })
})

app.listen(PORT, async () => {
  console.log(`✅ Server running on port ${PORT}`)
  console.log(`📍 API available at http://localhost:${PORT}/api`)

  // Inicializar búsquedas programadas automáticas
  await initializeScheduledSearches()
  console.log('🤖 Sistema de automatización inicializado')

  // Inicializar tablas de scraping
  try {
    const { initScrapingTables } = await import('./services/scraping/scraper-service.js')
    await initScrapingTables()
    console.log('🔍 Tablas de scraping inicializadas')
  } catch (err) {
    console.error('⚠️ Error inicializando tablas de scraping:', err.message)
  }

  // Auto-start permanent scraping
  try {
    const { default: scraperService } = await import('./services/scraping/scraper-service.js');
    scraperService.startPermanentScraping(null);
    console.log('🔄 Scraping permanente iniciado');
  } catch (err) {
    console.error('⚠️ Error iniciando scraping permanente:', err.message);
  }

  // Auto-start detection scanning
  try {
    const OpportunityScannerService = (await import('./services/detection-scanner.js')).default;
    const scanner = OpportunityScannerService.getInstance();
    scanner.startAutoScan(60); // Every 60 minutes
    console.log('🔍 Detection auto-scan iniciado (cada 60min)');
  } catch (err) {
    console.error('⚠️ Error iniciando detection scanner:', err.message);
  }

  // Auto-start email inbox polling (check for replies every 2 min)
  try {
    const { default: emailInboxService } = await import('./services/outreach/email-inbox-service.js');
    emailInboxService.startPolling(2);
    console.log('📬 Email inbox polling iniciado (cada 2 min)');
  } catch (err) {
    console.error('⚠️ Error iniciando email inbox:', err.message);
  }

  // Auto-reconnect WhatsApp if session exists
  try {
    const { pool } = await import('./config/database.js');
    const authCheck = await pool.query("SELECT COUNT(*) FROM whatsapp_auth WHERE key = 'creds'");
    if (parseInt(authCheck.rows[0].count) > 0) {
      const { default: whatsappConnection } = await import('./services/outreach/whatsapp-connection-service.js');
      whatsappConnection.connect().catch(() => {});
      console.log('📱 WhatsApp auto-reconectando sesion existente');
    }
  } catch (err) {
    // Table might not exist yet, ignore
  }

  // Inicializar tablas de outreach
  try {
    const { emailOutreachService } = await import('./services/outreach/email-outreach-service.js');
    await emailOutreachService.initTables();
    console.log('📧 Tablas de outreach inicializadas');
  } catch (err) {
    console.error('⚠️ Error inicializando tablas de outreach:', err.message);
  }

  // Inicializar email config
  try {
    const { default: emailTemplateConfig } = await import('./services/outreach/email-template-config.js');
    await emailTemplateConfig.initTable();
    console.log('Email config inicializado');
  } catch (err) {
    console.error('Error inicializando email config:', err.message);
  }

  // Inicializar tablas de avatares
  try {
    const { avatarService } = await import('./services/outreach/avatar-service.js');
    await avatarService.initTables();
    console.log('🤖 Tablas de avatares inicializadas');
  } catch (err) {
    console.error('⚠️ Error inicializando tablas de avatares:', err.message);
  }
})
