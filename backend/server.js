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
  return day >= 1 && day <= 5 && hour >= 8 && hour <= 19
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
      autoPlayState.current = 'Esperando horario laboral (8-19hs)...'
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
      const { waManager } = await import('./services/outreach/whatsapp-connection-service.js')
      const mainStatus = waManager.getStatus('main')
      // Add main account as first if not in DB
      const hasMain = rows.some(r => r.name === 'Principal' || r.name?.startsWith('Principal'))
      if (hasMain) {
        // Merge live status into existing Principal row
        const mainRow = rows.find(r => r.name === 'Principal' || r.name?.startsWith('Principal'))
        if (mainRow) {
          mainRow.isMain = true
          mainRow.status = mainStatus.status || mainRow.status
          mainRow.phone = mainStatus.phone || mainRow.phone
        }
      } else {
        rows.unshift({ id: 'main', name: 'Principal (Baileys)', phone: mainStatus.phone || 'Sin conectar', status: mainStatus.status, daily_limit: 30, messages_today: 0, messages_total: 0, is_active: true, isMain: true })
      }
      // Merge live connection status for secondary accounts
      for (const row of rows) {
        if (row.id !== 'main' && !row.isMain) {
          const accStatus = waManager.getStatus(row.id)
          if (accStatus.status === 'connected') {
            row.status = 'connected'
            row.phone = accStatus.phone || row.phone
          }
        }
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
    if (req.params.id === 'main') {
      // Main account is virtual - store settings in a config row or just acknowledge
      // Upsert into whatsapp_accounts with a known 'main' name
      const existing = await pool.query("SELECT id FROM whatsapp_accounts WHERE name = 'Principal' OR name LIKE 'Principal%' LIMIT 1")
      if (existing.rows[0]) {
        await pool.query('UPDATE whatsapp_accounts SET name=$1, daily_limit=$2, is_active=$3 WHERE id=$4',
          [name || 'Principal', daily_limit || 30, is_active !== false, existing.rows[0].id])
      } else {
        await pool.query('INSERT INTO whatsapp_accounts (name, daily_limit, is_active) VALUES ($1, $2, $3)',
          [name || 'Principal', daily_limit || 30, is_active !== false])
      }
      return res.json({ success: true })
    }
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

// Email daily stats
app.get('/api/email-daily-stats', async (req, res) => {
  try {
    const { pool } = await import('./config/database.js')
    const today = await pool.query(
      "SELECT COUNT(*) as sent_today FROM outreach_messages WHERE channel = 'EMAIL' AND status = 'SENT' AND sent_at >= CURRENT_DATE"
    )
    const total = await pool.query(
      "SELECT COUNT(*) as sent_total FROM outreach_messages WHERE channel = 'EMAIL' AND status = 'SENT'"
    )
    // Check if Brevo/SMTP is configured
    const hasBrevo = !!process.env.BREVO_API_KEY
    const hasSmtp = !!process.env.SMTP_HOST
    res.json({
      success: true,
      sent_today: parseInt(today.rows[0]?.sent_today || 0),
      sent_total: parseInt(total.rows[0]?.sent_total || 0),
      configured: hasBrevo || hasSmtp,
      provider: hasBrevo ? 'Brevo' : hasSmtp ? 'SMTP' : 'No configurado'
    })
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
        // Skip if ANY automation (prospecting/engagement) is running for this profile
        const autoState = liAutoState.get(post.profile_id)
        if (autoState?.running) {
          console.log(`[Scheduler] Automation active for ${post.profile_name}, postponing post`)
          continue
        }
        // Also check if any other profile has automation running (shared browser)
        let anyRunning = false
        for (const [, state] of liAutoState) { if (state?.running) { anyRunning = true; break } }
        if (anyRunning) {
          console.log(`[Scheduler] Another automation is active, postponing post for ${post.profile_name}`)
          continue
        }

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

        // Verify existing image URL is still valid (Freepik URLs expire)
        let imageUrl = post.image_url
        if (imageUrl && !imageUrl.startsWith('data:')) {
          try {
            const axios = (await import('axios')).default
            const headCheck = await axios.head(imageUrl, { timeout: 10000 })
            if (headCheck.status !== 200) throw new Error(`Status ${headCheck.status}`)
            liLog(post.profile_id, 'URL de imagen verificada OK', 'info', 'post')
          } catch (e) {
            liLog(post.profile_id, `URL de imagen expirada/inválida (${e.message?.slice(0, 40)}), regenerando...`, 'error', 'post')
            imageUrl = null
            await pool.query('UPDATE scheduled_posts SET image_url = NULL WHERE id = $1', [post.id])
          }
        }

        // Generate image if not set or expired (retry up to 2 times per cycle)
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
          // If image upload to LinkedIn failed, clear image_url so next retry regenerates a fresh one
          // (Freepik URLs expire, so retrying with same URL would keep failing)
          const newRetry = retryCount + 1
          if (newRetry >= MAX_IMAGE_RETRIES) {
            await pool.query("UPDATE scheduled_posts SET status = 'failed', error = $1 WHERE id = $2", [result.message, post.id])
            liLog(post.profile_id, `Error publicando después de ${MAX_IMAGE_RETRIES} intentos: ${result.message}`, 'error', 'post')
          } else {
            liLog(post.profile_id, `Error publicando: ${result.message}, limpiando imagen y reintentando ciclo ${newRetry}...`, 'error', 'post')
            await pool.query("UPDATE scheduled_posts SET status = 'pending', image_url = NULL, error = $1 WHERE id = $2",
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

// Content pillars and styles for calendar generation
const CALENDAR_PILLARS = {
  ia_tech: {
    name: 'IA y Tecnologia',
    topics: [
      'como la IA generativa esta cambiando el marketing digital',
      'automatizacion de procesos repetitivos: por donde empezar',
      'herramientas de IA que tu empresa puede usar hoy mismo',
      'chatbots con IA vs chatbots tradicionales: diferencias clave',
      'analisis de datos con IA para tomar mejores decisiones',
      'vision artificial aplicada a negocios reales',
      'IA para atencion al cliente: resultados concretos',
      'machine learning aplicado a prediccion de ventas',
      'como elegir la herramienta de IA correcta para tu negocio',
    ]
  },
  filosofia: {
    name: 'Filosofia y reflexion',
    topics: [
      'la IA no reemplaza personas, las potencia',
      'etica en la inteligencia artificial empresarial',
      'el futuro del trabajo: humanos + maquinas',
      'por que la creatividad humana sigue siendo insustituible',
      'la paradoja de la eficiencia: mas tecnologia, mas necesidad de humanidad',
      'automatizar no es deshumanizar, es liberar potencial',
      'como la tecnologia cambia nuestra forma de tomar decisiones',
      'el verdadero costo de no innovar',
      'la diferencia entre adoptar tecnologia y transformarse digitalmente',
    ]
  },
  persuasion: {
    name: 'Persuasion y ventas',
    topics: [
      'psicologia de ventas: por que la gente compra',
      'copywriting para LinkedIn que genera conversiones',
      'como generar confianza en redes sociales en segundos',
      'el arte de vender sin parecer vendedor',
      'growth hacking con contenido organico en LinkedIn',
      'storytelling que convierte lectores en clientes',
      'las 3 objeciones mas comunes y como responderlas',
      'como escribir un hook que atrape en la primera linea',
      'por que el contenido de valor vende mas que la publicidad directa',
    ]
  },
  casos: {
    name: 'Casos y resultados',
    topics: [
      'como ayudamos a un cliente a triplicar sus leads con IA',
      'caso real: automatizamos la atencion al cliente de una PyME',
      'resultados de implementar chatbots inteligentes en ventas B2B',
      'de 0 a 50 leads semanales con estrategia digital e IA',
      'transformacion digital en una empresa tradicional: paso a paso',
      'un cliente esceptico que se convirtio en evangelista de la IA',
      'por que nuestros clientes repiten: la clave del servicio personalizado',
      'el antes y despues de una empresa que implemento IA en su proceso de ventas',
      'leccion aprendida: lo que no te cuentan de implementar IA',
    ]
  }
}

const CALENDAR_STYLES = [
  'storytelling personal',
  'opinion polemica constructiva',
  'tip practico accionable',
  'pregunta abierta que genera debate',
  'caso de exito con datos',
  'tutorial paso a paso',
  'reflexion profunda',
  'lista de consejos',
  'mito vs realidad',
  'leccion aprendida de un error',
]

// Generate scheduled posts with AI (configurable calendar)
app.post('/api/linkedin-profiles/:id/generate-week', async (req, res) => {
  try {
    const { pool } = await import('./config/database.js')

    // Ensure table exists with new columns
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
        pillar VARCHAR(50),
        style VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await pool.query('ALTER TABLE scheduled_posts ADD COLUMN IF NOT EXISTS pillar VARCHAR(50)').catch(() => {})
    await pool.query('ALTER TABLE scheduled_posts ADD COLUMN IF NOT EXISTS style VARCHAR(50)').catch(() => {})

    const { rows } = await pool.query(`
      SELECT lp.*, a.name as avatar_name, a.role as avatar_role, a.company as avatar_company, a.specialties as avatar_specialties
      FROM linkedin_profiles lp LEFT JOIN avatars a ON a.id = lp.avatar_id WHERE lp.id = $1`, [req.params.id])
    if (!rows.length) return res.status(404).json({ success: false, error: 'Profile not found' })
    const p = rows[0]

    // Parse config from request body
    const {
      mode = 'manual',
      days: selectedDays = [1, 2, 3, 4, 5], // 0=Dom, 1=Lun...6=Sab
      postsPerDay = 1,
      hours: preferredHours = [9, 14],
      pillars: selectedPillars = ['ia_tech', 'filosofia', 'persuasion', 'casos'],
    } = req.body || {}

    const { analyzeWithDeepSeek } = await import('./services/deepseek.js')
    const today = new Date()
    console.log(`[Calendar] Generating for ${p.name} mode=${mode} days=${selectedDays} ppd=${postsPerDay}`)

    // Build schedule slots
    const slots = []
    const activePillars = selectedPillars.filter(pid => CALENDAR_PILLARS[pid])
    if (!activePillars.length) activePillars.push('ia_tech', 'filosofia', 'persuasion', 'casos')
    const cappedPostsPerDay = Math.min(Math.max(postsPerDay || 1, 1), 3)
    const validHours = preferredHours?.length ? preferredHours : [9, 14]

    // Shuffle helper
    const shuffle = arr => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }

    if (mode === 'ai') {
      // AI mode: pick 5-10 days from next 14, vary posts per day, optimal hours
      const optimalHours = [8, 9, 10, 12, 14, 17]
      const daysToPost = 5 + Math.floor(Math.random() * 4) // 5-8 days
      const candidateDays = []
      for (let i = 0; i < 14; i++) {
        const d = new Date(today)
        d.setDate(d.getDate() + i)
        if (d.getDay() !== 0) candidateDays.push(d) // skip Sundays
      }
      const pickedDays = shuffle(candidateDays).slice(0, daysToPost).sort((a, b) => a - b)

      for (const day of pickedDays) {
        const dayPostCount = Math.random() > 0.6 ? 2 : 1
        const dayHours = shuffle(optimalHours).slice(0, dayPostCount).sort((a, b) => a - b)
        for (const hour of dayHours) {
          slots.push({ date: new Date(day), hour, minute: Math.floor(Math.random() * 30) })
        }
      }
    } else {
      // Manual mode: use user's config
      for (let i = 0; i < 14; i++) {
        const d = new Date(today)
        d.setDate(d.getDate() + i)
        if (!selectedDays.includes(d.getDay())) continue
        const dayHours = shuffle(validHours).slice(0, cappedPostsPerDay).sort((a, b) => a - b)
        for (const hour of dayHours) {
          slots.push({ date: new Date(d), hour, minute: Math.floor(Math.random() * 30) })
        }
      }
    }

    // Assign pillars (round-robin shuffled) and styles to each slot
    const shuffledPillars = shuffle(activePillars)
    const shuffledStyles = shuffle(CALENDAR_STYLES)
    const usedTopics = new Set()
    for (let i = 0; i < slots.length; i++) {
      const pillarId = shuffledPillars[i % shuffledPillars.length]
      const pillar = CALENDAR_PILLARS[pillarId]
      const availableTopics = pillar.topics.filter(t => !usedTopics.has(t))
      const topic = availableTopics.length ? availableTopics[Math.floor(Math.random() * availableTopics.length)] : pillar.topics[Math.floor(Math.random() * pillar.topics.length)]
      usedTopics.add(topic)
      slots[i].pillar = pillarId
      slots[i].pillarName = pillar.name
      slots[i].topic = topic
      slots[i].style = shuffledStyles[i % shuffledStyles.length]
    }

    // Generate posts
    const scheduled = []
    for (const slot of slots) {
      const scheduledDate = new Date(slot.date)
      scheduledDate.setHours(slot.hour, slot.minute, 0, 0)
      const dayName = scheduledDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })

      const includeCTA = slot.pillar === 'casos' || slot.pillar === 'persuasion'
      let postText = '', hashtags = []
      try {
        const resp = await analyzeWithDeepSeek(`
Sos ${p.avatar_name || p.name}, ${p.avatar_role || 'experto en IA y ventas digitales'} en ${p.avatar_company || 'Adbize'}.
Adbize es una agencia de publicidad digital que usa IA para generar resultados reales para sus clientes.

Genera UN post de LinkedIn estilo "${slot.style}" sobre: ${slot.topic}.
PILAR DE CONTENIDO: ${slot.pillarName}

REGLAS CRITICAS:
- Maximo 150 palabras, español argentino natural
- NO seas generico ni corporativo. Se especifico y autentico.
- Usa saltos de linea entre parrafos para legibilidad
- Varia la estructura: a veces empieza con historia, a veces dato, a veces afirmacion fuerte
- NO empieces con "Che", "Sabias que" ni preguntas retoricas siempre
${includeCTA ? '- Incluí un call-to-action sutil relacionado con Adbize al final' : '- NO menciones Adbize directamente, solo compartí conocimiento de valor'}
- Hashtags SIN el simbolo #, solo la palabra. Maximo 4 hashtags relevantes.
- Cada post debe sentirse unico y diferente.
- Responde SOLO JSON: {"post":"texto","hashtags":["Tag1","Tag2","Tag3"]}`)
        const parsed = JSON.parse(resp.match(/\{[\s\S]*\}/)?.[0] || '{}')
        if (parsed.post) { postText = parsed.post; hashtags = parsed.hashtags || [] }
      } catch (aiErr) {
        console.log(`[Calendar] AI failed for ${dayName}, fallback:`, aiErr.message?.slice(0, 80))
      }

      if (!postText) {
        const fallbacks = {
          ia_tech: `La inteligencia artificial ya no es el futuro, es el presente.\n\nCada dia mas empresas estan automatizando procesos que antes llevaban horas. No se trata de reemplazar al equipo, sino de darle superpoderes.\n\nLa clave esta en empezar chico: elegir UN proceso repetitivo y automatizarlo. Los resultados hablan solos.`,
          filosofia: `Hay algo que la IA nunca va a poder replicar: tu criterio.\n\nLa tecnologia es una herramienta increible, pero el juicio humano, la empatia y la creatividad siguen siendo irremplazables.\n\nEl verdadero desafio no es aprender a usar IA. Es aprender a pensar mejor junto con ella.`,
          persuasion: `El mejor vendedor no vende. Educa, resuelve y acompaña.\n\nCuando tu contenido le resuelve un problema real a alguien, la venta se da naturalmente. No necesitas empujar.\n\nEl truco esta en entender que necesita tu audiencia y darselo antes de que lo pidan.`,
          casos: `La semana pasada un cliente nos dijo: "En 2 meses conseguimos mas leads que en todo el año pasado".\n\nNo fue magia. Fue estrategia + IA + ejecucion consistente.\n\nEn Adbize ayudamos a empresas a lograr resultados asi. Si queres saber como, hablemos.`,
        }
        postText = fallbacks[slot.pillar] || fallbacks.ia_tech
        hashtags = ['InteligenciaArtificial', 'TransformacionDigital', 'Innovacion']
      }

      const cleanHashtags = hashtags.map(h => h.replace(/^#/, ''))
      const fullText = postText + '\n\n' + cleanHashtags.map(h => '#' + h).join(' ')
      const { rows: inserted } = await pool.query(
        'INSERT INTO scheduled_posts (profile_id, text, hashtags, scheduled_at, pillar, style) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
        [req.params.id, fullText, JSON.stringify(cleanHashtags), scheduledDate.toISOString(), slot.pillar, slot.style]
      )
      scheduled.push(inserted[0])
      console.log(`[Calendar] Scheduled ${dayName} ${slot.hour}:${String(slot.minute).padStart(2,'0')} [${slot.pillar}] ${slot.style}`)
    }

    console.log('[Calendar] Scheduled', scheduled.length, 'posts')
    res.json({ success: true, posts: scheduled })

    // Pre-generate images in background
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
  const connectionLogs = allLogs.filter(l => l.category === 'connection' || l.category === 'engagement')
  const engagementLogs = allLogs.filter(l => l.category === 'engagement')
  const systemLogs = allLogs.filter(l => l.category === 'system')
  res.json({ success: true, logs: allLogs, postLogs, connectionLogs, engagementLogs, systemLogs, running: liAutoState.get(req.params.id)?.running || false })
})

// Engagement-only endpoint (likes + comments, no connections)
app.post('/api/linkedin-profiles/:id/engagement/start', async (req, res) => {
  const pid = req.params.id
  try {
    const { config } = req.body
    if (liAutoState.get(pid)?.running) return res.json({ success: false, error: 'Ya esta corriendo' })
    liAutoState.set(pid, { running: true, config: config || {}, mode: 'engagement', startedAt: new Date().toISOString() })
    liLog(pid, 'Engagement iniciado (solo likes y comentarios)', 'success', 'engagement')
    res.json({ success: true, message: 'Engagement iniciado' })

    ;(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms))
      try {
        liLog(pid, 'Verificando conexion a LinkedIn...', 'info', 'engagement')
        const { linkedinBrowser } = await import('./services/linkedin/linkedin-browser-service.js')
        const connected = await linkedinBrowser.ensureConnected(pid)
        if (!connected) {
          liLog(pid, 'No se pudo conectar a LinkedIn.', 'error', 'engagement')
          liAutoState.delete(pid)
          return
        }
        liLog(pid, 'Conectado a LinkedIn', 'success', 'engagement')

        const cfg = config || {}
        const { pool } = await import('./config/database.js')
        const profileRes = await pool.query('SELECT lp.*, a.name as avatar_name, a.role as avatar_role, a.company as avatar_company FROM linkedin_profiles lp LEFT JOIN avatars a ON a.id = lp.avatar_id WHERE lp.id = $1', [pid])
        const p = profileRes.rows[0]
        const maxLikes = Math.min(cfg.maxLikes || 15, 25)
        const maxComments = Math.min(cfg.maxComments || 5, 12)

        const session = linkedinBrowser.sessions.get(pid)
        if (!session?.page) { liAutoState.delete(pid); return }
        const engPage = session.page
        const { analyzeWithDeepSeek: engAI } = await import('./services/deepseek.js')
        const senderName = p?.avatar_name || p?.name || 'profesional'
        const senderRole = p?.avatar_role || 'experto en IA y publicidad digital'
        const senderCompany = p?.avatar_company || 'Adbize'

        liLog(pid, `Navegando al feed (max ${maxLikes} likes, ${maxComments} comentarios)...`, 'info', 'engagement')
        await engPage.goto('https://www.linkedin.com/feed/', { waitUntil: 'networkidle0', timeout: 30000 }).catch(async () => {
          await engPage.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {})
        })
        try {
          await engPage.waitForFunction(
            () => document.querySelectorAll('[data-urn]').length > 0 || document.querySelectorAll('.feed-shared-update-v2').length > 0,
            { timeout: 15000 }
          )
        } catch {}
        await sleep(3000 + Math.random() * 2000)

        // Debug: log feed state
        const feedDebug = await engPage.evaluate(() => {
          const url = location.href
          const allBtns = document.querySelectorAll('button')
          const likeBtns = [...allBtns].filter(b => {
            const label = (b.getAttribute('aria-label') || '').toLowerCase()
            return label.includes('like') || label.includes('gusta') || label.includes('react')
          })
          const commentBtns = [...allBtns].filter(b => {
            const label = (b.getAttribute('aria-label') || '').toLowerCase()
            return label.includes('comment') || label.includes('comentar')
          })
          // Try multiple selectors for posts
          const s1 = document.querySelectorAll('[data-urn]').length
          const s2 = document.querySelectorAll('.feed-shared-update-v2').length
          const s3 = document.querySelectorAll('[data-id]').length
          const s4 = document.querySelectorAll('div[data-urn*="activity"]').length
          const s5 = document.querySelectorAll('.occludable-update').length
          const s6 = document.querySelectorAll('[class*="feed"]').length
          // Try to find post containers by looking for like buttons and walking up
          const postContainers = likeBtns.slice(0, 3).map(btn => {
            let el = btn.parentElement
            for (let i = 0; i < 15 && el; i++) {
              if (el.getAttribute('data-urn') || el.getAttribute('data-id') || el.classList?.toString()?.includes('update')) return {
                tag: el.tagName, classes: el.className?.toString()?.slice(0, 80), urn: el.getAttribute('data-urn') || el.getAttribute('data-id') || ''
              }
              el = el.parentElement
            }
            return null
          }).filter(Boolean)
          return { url: url.split('?')[0], likeBtns: likeBtns.length, commentBtns: commentBtns.length, s1, s2, s3, s4, s5, s6, postContainers, totalBtns: allBtns.length }
        })
        liLog(pid, `Feed: ${feedDebug.url} likes:${feedDebug.likeBtns} comments:${feedDebug.commentBtns} [urn:${feedDebug.s1} shared:${feedDebug.s2} id:${feedDebug.s3} activity:${feedDebug.s4} occludable:${feedDebug.s5} feed:${feedDebug.s6}]`, 'info', 'engagement')
        if (feedDebug.postContainers.length > 0) {
          liLog(pid, `Post containers: ${feedDebug.postContainers.map(c => `${c.tag}[${c.urn?.slice(0,30) || c.classes?.slice(0,40)}]`).join(', ')}`, 'info', 'engagement')
        }

        let totalLikes = 0
        let totalComments = 0
        const processedPosts = new Set()

        for (let scroll = 0; scroll < 10 && liAutoState.get(pid)?.running && (totalLikes < maxLikes || totalComments < maxComments); scroll++) {
          // Find posts using multiple strategies
          const posts = await engPage.evaluate(() => {
            const results = []
            const seen = new Set()

            // Strategy 1: Find like buttons and walk up to find post container
            const allBtns = [...document.querySelectorAll('button')]
            const likeBtns = allBtns.filter(b => {
              const label = (b.getAttribute('aria-label') || '').toLowerCase()
              return label.includes('like') || label.includes('gusta') || label.includes('react')
            })

            for (const likeBtn of likeBtns) {
              // Walk up to find post container
              let postEl = likeBtn.parentElement
              for (let i = 0; i < 15 && postEl; i++) {
                const urn = postEl.getAttribute('data-urn') || postEl.getAttribute('data-id') || ''
                const classes = postEl.className?.toString() || ''
                if (urn || classes.includes('update') || classes.includes('occludable') || classes.includes('feed-shared')) {
                  if (!seen.has(postEl)) {
                    seen.add(postEl)
                    const id = urn || `post-${results.length}`
                    // Find text content
                    const textEl = postEl.querySelector('.feed-shared-text, .break-words, [dir="ltr"], .update-components-text')
                    const postText = (textEl?.innerText?.trim() || '').slice(0, 500)
                    // Find author
                    const authorEl = postEl.querySelector('.feed-shared-actor__name, .update-components-actor__name, a[href*="/in/"] span, [class*="actor"] span')
                    const author = authorEl?.innerText?.trim()?.replace(/\s+/g, ' ') || ''
                    // Find comment button near the like button
                    const commentBtn = postEl.querySelector('button[aria-label*="Comment"], button[aria-label*="comentar"], button[aria-label*="Comentar"]')
                    const alreadyLiked = likeBtn.getAttribute('aria-pressed') === 'true'

                    if (postText.length >= 20) {
                      results.push({
                        urn: id,
                        postText,
                        author: author.slice(0, 60),
                        headline: '',
                        alreadyLiked,
                        hasLikeBtn: true,
                        hasCommentBtn: !!commentBtn,
                      })
                    }
                  }
                  break
                }
                postEl = postEl.parentElement
              }
            }
            return results
          })

          if (scroll === 0 || posts.length > 0) {
            liLog(pid, `Scroll ${scroll + 1}: ${posts.length} posts encontrados (${posts.filter(p => !p.alreadyLiked).length} sin like)`, 'info', 'engagement')
          }

          for (const post of posts) {
            if (!liAutoState.get(pid)?.running) break
            if (processedPosts.has(post.urn)) continue
            processedPosts.add(post.urn)

            if (totalLikes < maxLikes && !post.alreadyLiked && post.hasLikeBtn) {
              try {
                const liked = await engPage.evaluate((urn) => {
                  // Try to find the specific post by urn/id first
                  let postEl = document.querySelector(`[data-urn="${urn}"], [data-id="${urn}"]`)
                  // Fallback: find by post text matching
                  if (!postEl) {
                    const allEls = [...document.querySelectorAll('[data-urn], [data-id], .occludable-update, [class*="feed-shared-update"]')]
                    postEl = allEls.find(el => el.innerText?.includes(urn.slice(0, 40)))
                  }
                  if (!postEl) return false
                  const likeBtn = postEl.querySelector('button[aria-label*="Like"], button[aria-label*="gusta"], button[aria-label*="React"]')
                  if (likeBtn && likeBtn.getAttribute('aria-pressed') !== 'true') { likeBtn.click(); return true }
                  return false
                }, post.urn)
                if (liked) {
                  totalLikes++
                  liLog(pid, `Like #${totalLikes}: ${post.author || 'post'} - "${post.postText.slice(0, 60)}..."`, 'success', 'engagement')
                  await sleep(3000 + Math.random() * 5000)
                }
              } catch {}
            }

            if (totalComments < maxComments && post.hasCommentBtn && post.postText.length > 80 && Math.random() < 0.3) {
              try {
                const comment = (await engAI(
                  `Sos ${senderName}, ${senderRole} en ${senderCompany}.
Escribi un comentario breve y genuino en este post de LinkedIn.

POST de ${post.author}${post.headline ? ` (${post.headline})` : ''}:
"${post.postText.slice(0, 400)}"

REGLAS:
- Max 150 caracteres, relevante al contenido
- NO vendas nada, NO menciones tu empresa
- Se natural, como un profesional interesado
- Español argentino, max 1 emoji
- NO uses "Excelente post!" o frases genericas
Responde UNICAMENTE con el comentario.`
                )).trim().replace(/^["']|["']$/g, '').slice(0, 200)
                if (comment.length < 10) continue

                const commentOpened = await engPage.evaluate((urn) => {
                  const postEl = document.querySelector(`[data-urn="${urn}"], [data-id="${urn}"]`)
                  if (!postEl) return false
                  const btn = postEl.querySelector('button[aria-label*="Comment"], button[aria-label*="comentar"]')
                  if (btn) { btn.click(); return true }
                  return false
                }, post.urn)

                if (commentOpened) {
                  await sleep(2000 + Math.random() * 1500)
                  const commentInput = await engPage.$('.ql-editor[contenteditable="true"], [role="textbox"][contenteditable="true"]')
                  if (commentInput) {
                    await commentInput.click()
                    await sleep(500)
                    await commentInput.type(comment, { delay: 25 + Math.random() * 40 })
                    await sleep(1000 + Math.random() * 1000)
                    const submitted = await engPage.evaluate(() => {
                      const btn = [...document.querySelectorAll('button.comments-comment-box__submit-button, button[type="submit"]')]
                        .find(b => { const t = (b.innerText?.trim() || '').toLowerCase(); return t.includes('post') || t.includes('publicar') || t.includes('comentar') })
                      if (btn && !btn.disabled) { btn.click(); return true }
                      return false
                    })
                    if (submitted) {
                      totalComments++
                      liLog(pid, `Comentario #${totalComments} en post de ${post.author}: "${comment.slice(0, 60)}..."`, 'success', 'engagement')
                      await sleep(15000 + Math.random() * 15000)
                    }
                  }
                }
              } catch (e) { liLog(pid, `Error comentando: ${e.message?.slice(0, 60)}`, 'error', 'engagement') }
            }
          }

          await engPage.evaluate(() => window.scrollBy(0, 800 + Math.random() * 600))
          await sleep(2000 + Math.random() * 3000)
        }

        liLog(pid, `Engagement completado: ${totalLikes} likes, ${totalComments} comentarios`, 'success', 'engagement')
      } catch (e) {
        liLog(pid, `Error: ${e.message?.slice(0, 100)}`, 'error', 'engagement')
      } finally {
        liAutoState.delete(pid)
        liLog(pid, 'Engagement finalizado', 'info', 'engagement')
      }
    })()
  } catch (err) { res.status(500).json({ success: false, error: err.message }) }
})

app.post('/api/linkedin-profiles/:id/automation/start', async (req, res) => {
  const pid = req.params.id
  try {
    const { config } = req.body
    if (liAutoState.get(pid)?.running) return res.json({ success: false, error: 'Ya esta corriendo' })

    const mode = req.body.mode || 'full' // 'prospecting' = only connections, 'full' = posts + connections
    liAutoState.set(pid, { running: true, config: config || {}, mode, startedAt: new Date().toISOString() })
    liLog(pid, mode === 'prospecting' ? 'Prospeccion iniciada (solo conexiones)' : 'Automatizacion iniciada (posts + conexiones)', 'success')

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
        const defaultTopics = [
          'como la IA esta transformando la atencion al cliente',
          'automatizacion de procesos repetitivos con IA',
          'chatbots inteligentes para ventas',
          'analisis de datos con IA para tomar mejores decisiones',
          'IA generativa aplicada al marketing digital',
          'el futuro del trabajo con inteligencia artificial',
          'liderazgo y gestion de equipos en la era digital',
          'estrategias de publicidad digital para PyMEs',
          'como medir el ROI de tus campanas digitales',
          'tendencias de marketing que estan cambiando el juego',
        ]
        const topics = cfg.postTopics?.length ? cfg.postTopics : defaultTopics
        const styles = ['storytelling', 'opinion controversial', 'tip practico', 'pregunta abierta', 'caso de exito', 'reflexion personal', 'dato curioso']
        const profileRes = await pool.query('SELECT lp.*, a.name as avatar_name, a.role as avatar_role, a.company as avatar_company FROM linkedin_profiles lp LEFT JOIN avatars a ON a.id = lp.avatar_id WHERE lp.id = $1', [pid])
        const p = profileRes.rows[0]

        // Step 2: Generate and publish post (only in 'full' mode, skipped in 'prospecting' mode)
        if (mode !== 'prospecting') {
          if (!liAutoState.get(pid)?.running) return
          liLog(pid, 'Generando post con IA...', 'info', 'post')
          const topic = topics[Math.floor(Math.random() * topics.length)]
          const style = styles[Math.floor(Math.random() * styles.length)]
          try {
            const { analyzeWithDeepSeek } = await import('./services/deepseek.js')
            const postContent = await analyzeWithDeepSeek(
              `Sos ${p?.avatar_name || p?.name || 'profesional'}, ${p?.avatar_role || 'Sales Representative'} en ${p?.avatar_company || 'Adbize'}.
Genera UN post de LinkedIn estilo "${style}" sobre: ${topic}.
REGLAS:
- Maximo 150 palabras, español argentino natural
- NO seas vendedor ni corporativo
- Usa saltos de linea entre parrafos para que sea legible
- Varia el tono: a veces serio, a veces informal, a veces con humor
- NO empieces siempre con "Che" ni con preguntas
- Los hashtags SIN el simbolo #, solo la palabra (ej: "InteligenciaArtificial" no "#InteligenciaArtificial")
- Responde SOLO JSON sin comentarios: {"post":"texto del post","hashtags":["Tag1","Tag2","Tag3"]}`
            )
            let parsed = {}
            try { parsed = JSON.parse(postContent.match(/\{[\s\S]*\}/)?.[0] || '{}') } catch { liLog(pid, 'IA devolvio JSON invalido', 'error', 'post') }
            if (parsed.post) {
              liLog(pid, `Post generado (${style}): "${parsed.post.slice(0, 80)}..."`, 'info', 'post')
              let imageUrl = null
              const { freepikImageService } = await import('./services/linkedin/freepik-image-service.js')
              for (let imgAttempt = 1; imgAttempt <= 2; imgAttempt++) {
                try {
                  liLog(pid, `Generando imagen (intento ${imgAttempt}/2)...`, 'info', 'post')
                  const imgResult = await freepikImageService.generateForPost(parsed.post)
                  imageUrl = imgResult?.url || null
                  if (imageUrl) { liLog(pid, 'Imagen generada!', 'success', 'post'); break }
                } catch (imgErr) {
                  liLog(pid, `Imagen intento ${imgAttempt} fallo: ${imgErr.message?.slice(0, 60)}`, 'error', 'post')
                  if (imgAttempt < 2) await sleep(20000)
                }
              }
              const cleanHashtags = (parsed.hashtags || []).map(h => h.replace(/^#/, ''))
              const fullPost = parsed.post + '\n\n' + cleanHashtags.map(h => '#' + h).join(' ')
              if (imageUrl) {
                const postResult = await linkedinBrowser.createPost(pid, fullPost, imageUrl, { requireImage: true })
                liLog(pid, postResult.success ? 'Post publicado!' : `Error: ${postResult.message}`, postResult.success ? 'success' : 'error', 'post')
              } else {
                liLog(pid, 'No se pudo generar imagen, post no publicado', 'error', 'post')
              }
            }
          } catch (e) { liLog(pid, `Error publicando: ${e.message?.slice(0, 100)}`, 'error', 'post') }
          await randomDelay()
        } else {
          await sleep(2000 + Math.random() * 3000)
        }

        // Step 2.5: Feed engagement (likes + comments) — runs in all modes
        if (!liAutoState.get(pid)?.running) return
        const engagementEnabled = cfg.engagementEnabled !== false // enabled by default
        const maxLikes = Math.min(cfg.maxLikes || 15, 25)
        const maxComments = Math.min(cfg.maxComments || 5, 12)
        if (engagementEnabled && (maxLikes > 0 || maxComments > 0)) {
          liLog(pid, `Iniciando engagement en feed (max ${maxLikes} likes, ${maxComments} comentarios)...`, 'info', 'engagement')
          try {
            const session = linkedinBrowser.sessions.get(pid)
            if (session?.page) {
              const engPage = session.page
              const { analyzeWithDeepSeek: engAI } = await import('./services/deepseek.js')
              const senderName = p?.avatar_name || p?.name || 'profesional'
              const senderRole = p?.avatar_role || 'experto en IA y publicidad digital'
              const senderCompany = p?.avatar_company || 'Adbize'

              // Navigate to LinkedIn feed
              await engPage.goto('https://www.linkedin.com/feed/', { waitUntil: 'networkidle0', timeout: 30000 }).catch(async () => {
                await engPage.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {})
              })
              try {
                await engPage.waitForFunction(
                  () => document.querySelectorAll('[data-urn]').length > 0 || document.querySelectorAll('.feed-shared-update-v2').length > 0,
                  { timeout: 15000 }
                )
              } catch {}
              await sleep(3000 + Math.random() * 2000)

              let totalLikes = 0
              let totalComments = 0
              const processedPosts = new Set()

              // Scroll and engage with posts
              for (let scroll = 0; scroll < 8 && (totalLikes < maxLikes || totalComments < maxComments); scroll++) {
                if (!liAutoState.get(pid)?.running) break

                // Extract posts from current viewport
                const posts = await engPage.evaluate(() => {
                  const postEls = document.querySelectorAll('[data-urn], .feed-shared-update-v2, [data-id]')
                  const results = []
                  for (const post of postEls) {
                    const urn = post.getAttribute('data-urn') || post.getAttribute('data-id') || ''
                    if (!urn || urn.includes('SPONSORED')) continue
                    const textEl = post.querySelector('.feed-shared-text, .break-words, [dir="ltr"]')
                    const postText = (textEl?.innerText?.trim() || '').slice(0, 500)
                    if (!postText || postText.length < 30) continue
                    const authorEl = post.querySelector('.feed-shared-actor__name, .update-components-actor__name, a[href*="/in/"] span')
                    const author = authorEl?.innerText?.trim() || ''
                    const headlineEl = post.querySelector('.feed-shared-actor__description, .update-components-actor__description')
                    const headline = headlineEl?.innerText?.trim()?.slice(0, 100) || ''
                    // Check if already liked
                    const likeBtn = post.querySelector('button[aria-label*="Like"], button[aria-label*="gusta"], button[aria-label*="React"]')
                    const alreadyLiked = likeBtn?.getAttribute('aria-pressed') === 'true' || likeBtn?.classList?.contains('react-button--active')
                    // Check comment count
                    const commentBtn = post.querySelector('button[aria-label*="Comment"], button[aria-label*="comentar"], button[aria-label*="Comentar"]')
                    results.push({
                      urn,
                      postText,
                      author,
                      headline,
                      alreadyLiked,
                      hasLikeBtn: !!likeBtn,
                      hasCommentBtn: !!commentBtn,
                    })
                  }
                  return results
                })

                for (const post of posts) {
                  if (!liAutoState.get(pid)?.running) break
                  if (processedPosts.has(post.urn)) continue
                  processedPosts.add(post.urn)

                  // Like the post (if not already liked)
                  if (totalLikes < maxLikes && !post.alreadyLiked && post.hasLikeBtn) {
                    try {
                      const liked = await engPage.evaluate((urn) => {
                        const postEl = document.querySelector(`[data-urn="${urn}"], [data-id="${urn}"]`)
                        if (!postEl) return false
                        const likeBtn = postEl.querySelector('button[aria-label*="Like"], button[aria-label*="gusta"], button[aria-label*="React"]')
                        if (likeBtn && likeBtn.getAttribute('aria-pressed') !== 'true') {
                          likeBtn.click()
                          return true
                        }
                        return false
                      }, post.urn)
                      if (liked) {
                        totalLikes++
                        liLog(pid, `Like #${totalLikes}: ${post.author || 'post'} - "${post.postText.slice(0, 60)}..."`, 'success', 'engagement')
                        await sleep(3000 + Math.random() * 5000) // 3-8s between likes
                      }
                    } catch {}
                  }

                  // Comment on select posts (less frequent, more impactful)
                  if (totalComments < maxComments && post.hasCommentBtn && post.postText.length > 80) {
                    // Only comment on ~30% of posts we see (more selective)
                    if (Math.random() > 0.3) continue

                    try {
                      // Generate relevant comment with AI
                      const commentResp = await engAI(
                        `Sos ${senderName}, ${senderRole} en ${senderCompany}.
Necesitas escribir un comentario breve y genuino en un post de LinkedIn.

POST de ${post.author}${post.headline ? ` (${post.headline})` : ''}:
"${post.postText.slice(0, 400)}"

REGLAS:
- Maximo 150 caracteres
- Tiene que ser un comentario RELEVANTE al contenido del post
- NO vendas nada, NO menciones tu empresa
- Se natural, como un profesional que genuinamente le intereso el tema
- Puede ser: un insight, una pregunta, compartir experiencia, o simplemente valorar el contenido
- Español argentino natural, sin emojis excesivos (maximo 1)
- NO uses frases genericas como "Excelente post!" o "Muy interesante!"

Responde UNICAMENTE con el comentario.`
                      )
                      const comment = commentResp.trim().replace(/^["']|["']$/g, '').slice(0, 200)
                      if (comment.length < 10) continue

                      // Click comment button
                      const commentOpened = await engPage.evaluate((urn) => {
                        const postEl = document.querySelector(`[data-urn="${urn}"], [data-id="${urn}"]`)
                        if (!postEl) return false
                        const commentBtn = postEl.querySelector('button[aria-label*="Comment"], button[aria-label*="comentar"], button[aria-label*="Comentar"]')
                        if (commentBtn) { commentBtn.click(); return true }
                        return false
                      }, post.urn)

                      if (commentOpened) {
                        await sleep(2000 + Math.random() * 1500)
                        // Find comment textarea/editor
                        const commentInput = await engPage.$('.ql-editor[contenteditable="true"], [role="textbox"][contenteditable="true"], .comments-comment-box__form textarea')
                        if (commentInput) {
                          await commentInput.click()
                          await sleep(500)
                          await commentInput.type(comment, { delay: 25 + Math.random() * 40 })
                          await sleep(1000 + Math.random() * 1000)
                          // Click post/submit button for the comment
                          const submitted = await engPage.evaluate(() => {
                            const submitBtns = [...document.querySelectorAll('button.comments-comment-box__submit-button, button[type="submit"]')]
                            const postBtn = submitBtns.find(b => {
                              const t = (b.innerText?.trim() || b.getAttribute('aria-label') || '').toLowerCase()
                              return t.includes('post') || t.includes('publicar') || t.includes('comentar') || t.includes('submit')
                            })
                            if (postBtn && !postBtn.disabled) { postBtn.click(); return true }
                            return false
                          })
                          if (submitted) {
                            totalComments++
                            liLog(pid, `Comentario #${totalComments} en post de ${post.author}: "${comment.slice(0, 60)}..."`, 'success', 'engagement')
                            await sleep(15000 + Math.random() * 15000) // 15-30s between comments
                          }
                        }
                      }
                    } catch (commentErr) {
                      liLog(pid, `Error comentando: ${commentErr.message?.slice(0, 60)}`, 'error', 'engagement')
                    }
                  }
                }

                // Scroll down to load more posts
                await engPage.evaluate(() => window.scrollBy(0, 800 + Math.random() * 600))
                await sleep(2000 + Math.random() * 3000)
              }

              liLog(pid, `Engagement completado: ${totalLikes} likes, ${totalComments} comentarios`, 'success', 'engagement')
            }
          } catch (engErr) {
            liLog(pid, `Error en engagement: ${engErr.message?.slice(0, 100)}`, 'error', 'engagement')
          }
          await sleep(5000 + Math.random() * 5000)
        }

        // Step 3: Search and connect with decision makers
        if (!liAutoState.get(pid)?.running) return
        const targetRoles = cfg.targetRoles || ['CEO', 'Gerente']
        const targetIndustries = cfg.targetIndustries || ['Tecnologia']
        const targetLocations = cfg.targetLocations || []
        const targetKeywords = cfg.targetKeywords || []
        const targetSeniority = cfg.targetSeniority || ['owner', 'director', 'manager']
        const searchStrategy = cfg.searchStrategy || 'combined'
        const maxConnections = Math.min(cfg.dailyConnections || 10, 25)

        // Build multiple search queries for variety
        const buildSearchQueries = () => {
          const queries = []
          if (searchStrategy === 'keywords' && targetKeywords.length) {
            // Direct keyword searches
            for (const kw of targetKeywords.slice(0, 3)) {
              queries.push(kw)
            }
          } else if (searchStrategy === 'roles') {
            // Role-only searches
            for (let i = 0; i < Math.min(3, targetRoles.length); i++) {
              const role = targetRoles[Math.floor(Math.random() * targetRoles.length)]
              queries.push(role)
            }
          } else {
            // Combined: role + industry + optional keyword
            for (let i = 0; i < 3; i++) {
              const role = targetRoles[Math.floor(Math.random() * targetRoles.length)]
              const industry = targetIndustries[Math.floor(Math.random() * targetIndustries.length)]
              const kw = targetKeywords.length ? ' ' + targetKeywords[Math.floor(Math.random() * targetKeywords.length)] : ''
              queries.push(`${role} ${industry}${kw}`)
            }
          }
          return [...new Set(queries)] // deduplicate
        }

        const searchQueries = buildSearchQueries()
        liLog(pid, `Busquedas planificadas: ${searchQueries.map(q => `"${q}"`).join(', ')} (max ${maxConnections})`, 'info', 'connection')

        try {
          const session = linkedinBrowser.sessions.get(pid)
          if (session?.page) {
            const { page } = session

            // Build search URL with advanced filters
            const buildSearchUrl = (query) => {
              let url = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(query)}&network=%5B%22S%22%2C%22O%22%5D&origin=FACETED_SEARCH`
              // Add location if specified
              if (targetLocations.length) {
                url += `&geoUrn=${encodeURIComponent(JSON.stringify(targetLocations))}`
              }
              return url
            }

            const searchUrl = buildSearchUrl(searchQueries[0])
            liLog(pid, `Navegando a busqueda: ${searchQueries[0]}`, 'info', 'connection')
            await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
            await sleep(5000 + Math.random() * 3000) // Wait longer for results to render

            // Wait for profile links to appear (indicates results loaded)
            try {
              await page.waitForSelector('a[href*="/in/"]', { timeout: 10000 })
              liLog(pid, 'Resultados de busqueda detectados', 'info', 'connection')
            } catch { liLog(pid, 'No se detectaron resultados de busqueda en 10s', 'error', 'connection') }

            // Find Connect buttons on the page
            let connected = 0
            let currentSearchUrl = searchUrl
            for (let attempt = 0; attempt < 3 && connected < maxConnections; attempt++) {
              if (!liAutoState.get(pid)?.running) break

              // Scroll down slowly to load all results
              for (let s = 0; s < 5; s++) {
                await page.evaluate(() => window.scrollBy(0, 300 + Math.random() * 400))
                await sleep(800 + Math.random() * 1200)
              }
              await sleep(2000 + Math.random() * 2000)

              // Detect cards and buttons - LinkedIn uses obfuscated classes, so we use profile links
              const { connectButtons: foundButtons, debug: cardDebug } = await page.evaluate(() => {
                const profileLinks = [...document.querySelectorAll('a[href*="/in/"]')]
                const seenCards = new Set()
                const results = []
                const allBtns = [...document.querySelectorAll('button')]
                const debugInfo = { profileLinks: profileLinks.length, cards: 0, cardButtonSamples: [] }

                for (const link of profileLinks) {
                  const profileUrl = link.href || ''
                  if (!profileUrl || seenCards.has(profileUrl)) continue
                  seenCards.add(profileUrl)

                  // Walk up to find card container for extra info
                  let card = link.closest('li') || link.parentElement?.closest('li')
                  if (!card) {
                    let el = link.parentElement
                    for (let i = 0; i < 15 && el; i++) {
                      const btns = el.querySelectorAll('button')
                      if (btns.length > 0 && btns.length <= 8) {
                        card = el
                        break
                      }
                      el = el.parentElement
                    }
                  }
                  // If still no card, use a nearby ancestor that contains only this profile link
                  if (!card) {
                    let el = link.parentElement
                    for (let i = 0; i < 6 && el; i++) {
                      const linksInside = el.querySelectorAll('a[href*="/in/"]')
                      if (linksInside.length === 1 && el.innerText && el.innerText.length > 30) {
                        card = el
                        break
                      }
                      if (linksInside.length > 1) break // went too far up
                      el = el.parentElement
                    }
                  }
                  debugInfo.cards++

                  // Extract person info from card or link
                  let name = 'Persona'
                  let headline = ''
                  let location = ''
                  let company = ''
                  let summary = ''

                  if (card) {
                    const cardBtns = [...card.querySelectorAll('button')]
                    if (debugInfo.cardButtonSamples.length < 3) {
                      debugInfo.cardButtonSamples.push(cardBtns.map(b => ({
                        text: b.textContent?.trim().slice(0, 40),
                        label: (b.getAttribute('aria-label') || '').slice(0, 60),
                        svg: b.querySelector('svg') ? 'has-svg' : '',
                      })))
                    }

                    const cardText = card.innerText || ''
                    const lines = cardText.split('\n').map(l => l.trim()).filter(l => l.length > 0 && l.length < 200)
                    const nameEl = card.querySelector('a[href*="/in/"] span, a[href*="/in/"]')
                    name = nameEl?.textContent?.trim()?.replace(/\s+/g, ' ') || lines[0] || 'Persona'
                    const nameIdx = lines.findIndex(l => l.includes(name?.split(' ')[0]))
                    headline = lines[nameIdx + 1] || lines[1] || ''
                    location = lines[nameIdx + 2] || lines[2] || ''
                    const companyMatch = headline.match(/(?:en|at|@|\|)\s*(.+?)(?:\s*\||$)/i)
                    company = companyMatch?.[1]?.trim() || ''
                    summary = (lines.slice(nameIdx + 3, nameIdx + 5).join(' ')).slice(0, 200)
                  } else {
                    // Fallback: extract name from link text
                    name = link.textContent?.trim()?.replace(/\s+/g, ' ') || 'Persona'
                    // Try aria-label for more info
                    const label = link.getAttribute('aria-label') || ''
                    if (label) name = label.replace(/['']/g, "'").split(',')[0].trim() || name
                  }

                  results.push({
                    profileUrl,
                    name: name.slice(0, 80),
                    headline: headline.slice(0, 150),
                    location: location.slice(0, 80),
                    company,
                    summary,
                  })
                }
                return { connectButtons: results, debug: debugInfo }
              })

              // Log debug info
              liLog(pid, `Cards: ${cardDebug.cards} de ${cardDebug.profileLinks} links, botones conectar: ${foundButtons.length}`, 'info', 'connection')
              if (cardDebug.cardButtonSamples.length > 0 && foundButtons.length === 0) {
                const sample = cardDebug.cardButtonSamples[0]?.map(b => `"${b.text}" [${b.label}] ${b.svg}`).join(', ')
                liLog(pid, `Botones en card 1: ${(sample || 'ninguno').slice(0, 300)}`, 'info', 'connection')
              }
              const connectButtons = foundButtons
              liLog(pid, `Encontrados ${connectButtons.length} perfiles para conectar en pagina ${attempt + 1}`, 'info', 'connection')

              const { analyzeWithDeepSeek } = await import('./services/deepseek.js')

              // Message strategies that rotate for variety
              const MESSAGE_STRATEGIES = [
                { id: 'valor', name: 'Valor directo', instruction: 'Comparti un insight o dato relevante a su industria/rol que demuestre tu expertise. NO vendas nada. Solo aporta valor y pedí conectar para seguir compartiendo.' },
                { id: 'pregunta', name: 'Pregunta consultiva', instruction: 'Hace una pregunta inteligente sobre un desafio comun en su rol/industria. Mostra curiosidad genuina. NO ofrezcas solucion todavia, solo genera conversacion.' },
                { id: 'contenido', name: 'Compartir contenido', instruction: 'Menciona que publicas contenido sobre IA/tecnologia aplicada a negocios y que te parecio que le podria interesar. Invita a conectar para que vea tus posts.' },
                { id: 'soft_cta', name: 'Soft CTA', instruction: 'Menciona brevemente que en Adbize ayudan empresas con IA/publicidad digital. No seas agresivo. Solo decí que te encantaria charlar si le interesa el tema.' },
              ]

              const FALLBACK_MESSAGES = {
                valor: (firstName) => `Hola ${firstName}! Lei que el 73% de las empresas que implementan IA ven resultados en menos de 3 meses. Me encantaria conectar y compartir mas sobre esto.`,
                pregunta: (firstName) => `Hola ${firstName}! Cual es el proceso mas repetitivo en tu dia a dia? Estoy investigando como la IA esta cambiando la forma de trabajar en diferentes industrias.`,
                contenido: (firstName) => `Hola ${firstName}! Publico contenido sobre IA aplicada a negocios y me parecio que por tu perfil te podria interesar. Conectamos?`,
                soft_cta: (firstName) => `Hola ${firstName}! Vi tu perfil y me resulto muy interesante. En Adbize trabajamos con IA aplicada a empresas. Si te copa el tema, me encantaria charlar.`,
              }

              let strategyIndex = 0

              for (const { profileUrl, name: searchName, headline: searchHeadline, location, company, summary } of connectButtons) {
                if (!liAutoState.get(pid)?.running || connected >= maxConnections) break

                try {
                  liLog(pid, `Conexion ${connected + 1}/${maxConnections}: ${searchName} - ${searchHeadline}${company ? ` (${company})` : ''}`, 'info', 'connection')

                  // Pick strategy (rotate)
                  const strategy = MESSAGE_STRATEGIES[strategyIndex % MESSAGE_STRATEGIES.length]
                  strategyIndex++

                  // Role detection and AI note generation happen after visiting the profile page

                  // Visit profile — use networkidle0 to wait for full JS rendering
                  liLog(pid, `Visitando perfil: ${profileUrl.split('?')[0]}`, 'info', 'connection')
                  const expectedSlug = profileUrl.match(/\/in\/([^/?]+)/)?.[1] || ''
                  // Navigate with networkidle0 (waits until no network requests for 500ms)
                  await page.goto(profileUrl, { waitUntil: 'networkidle0', timeout: 30000 }).catch(async () => {
                    // Retry with domcontentloaded on timeout
                    await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {})
                  })
                  // Wait for h1 with actual text content (LinkedIn renders it via JS)
                  try {
                    await page.waitForFunction(
                      () => { const h1 = document.querySelector('h1'); return h1 && h1.innerText.trim().length > 0 },
                      { timeout: 15000 }
                    )
                  } catch {
                    // Fallback: wait a bit more
                    await sleep(5000)
                  }
                  await sleep(1000 + Math.random() * 1000)

                  // Verify URL and log
                  const currentUrl = await page.url()
                  const debugH1 = await page.evaluate(() => document.querySelector('h1')?.innerText?.trim()?.slice(0, 50) || 'no-h1')
                  liLog(pid, `Nav: ${decodeURIComponent(currentUrl.split('?')[0].split('/in/')[1] || '?')} h1="${debugH1}"`, 'info', 'connection')

                  if (expectedSlug && !decodeURIComponent(currentUrl).includes(decodeURIComponent(expectedSlug))) {
                    liLog(pid, `URL no coincide: esperaba ${decodeURIComponent(expectedSlug)}`, 'error', 'connection')
                    continue
                  }

                  // Extract name/headline from the profile page
                  const profilePageInfo = await page.evaluate(() => {
                    const h1 = document.querySelector('h1')
                    const profileName = h1?.innerText?.trim() || ''
                    const headlineEl = document.querySelector('.text-body-medium, [data-generated-suggestion-target]')
                    const profileHeadline = headlineEl?.innerText?.trim() || ''
                    return { profileName, profileHeadline }
                  })
                  // Update name/headline if we got better data from the profile page
                  const actualName = profilePageInfo.profileName || searchName
                  const actualHeadline = profilePageInfo.profileHeadline || searchHeadline
                  liLog(pid, `Perfil: ${actualName} - ${actualHeadline.slice(0, 80)}`, 'info', 'connection')

                  // Re-evaluate role context with actual headline
                  const actualHeadlineLower = actualHeadline.toLowerCase()
                  const actualIsCLevel = /\b(ceo|cto|cfo|coo|cmo|founder|cofound|dueñ|president|socio|partner)\b/.test(actualHeadlineLower)
                  const actualIsSales = /\b(ventas|sales|comercial|business dev|account)\b/.test(actualHeadlineLower)
                  const actualIsMarketing = /\b(marketing|growth|digital|contenido|brand|comunicacion)\b/.test(actualHeadlineLower)
                  const actualIsTech = /\b(developer|engineer|tech|sistemas|software|data|devops|it)\b/.test(actualHeadlineLower)
                  let actualRoleContext = 'profesional'
                  if (actualIsCLevel) actualRoleContext = 'tomador de decisiones de alto nivel que valora su tiempo'
                  else if (actualIsSales) actualRoleContext = 'profesional de ventas que entiende el valor de las herramientas'
                  else if (actualIsMarketing) actualRoleContext = 'profesional de marketing que busca resultados medibles'
                  else if (actualIsTech) actualRoleContext = 'profesional tecnico que aprecia soluciones concretas'

                  const actualToneGuide = actualIsCLevel
                    ? 'Tono ejecutivo: directo, respetuoso, sin rodeos. Habla de resultados y ROI. Nada de "che".'
                    : actualIsTech ? 'Tono tecnico: preciso, sin buzzwords vacios. Menciona algo concreto.'
                    : 'Tono cercano y argentino, profesional pero humano.'

                  // Generate AI note with actual profile data
                  let aiNote = ''
                  try {
                    const senderName = p?.avatar_name || p?.name || 'profesional'
                    const senderRole = p?.avatar_role || 'experto en IA y publicidad digital'
                    const senderCompany = p?.avatar_company || 'Adbize'
                    const aiResp = await analyzeWithDeepSeek(
                      `CONTEXTO: Sos ${senderName}, ${senderRole} en ${senderCompany}.
Adbize es una agencia argentina de publicidad digital que usa IA para automatizar marketing, generar leads y escalar ventas.

PERSONA OBJETIVO:
- Nombre: ${actualName}
- Cargo/Headline: ${actualHeadline}
${company ? `- Empresa: ${company}` : ''}
${location ? `- Ubicacion: ${location}` : ''}
${summary ? `- Info adicional: ${summary}` : ''}
- Perfil: ${actualRoleContext}

ESTRATEGIA: ${strategy.name} - ${strategy.instruction}

PERSUASION: Especificidad (menciona cargo/empresa), reciprocidad (ofrece valor), prueba social, curiosidad.
${actualIsCLevel ? 'C-Level: habla de revenue, eficiencia, ventaja competitiva.' : ''}
${actualIsSales ? 'Ventas: habla de generar leads o cerrar mas rapido.' : ''}
${actualIsMarketing ? 'Marketing: habla de automatizar campañas o mejorar ROI.' : ''}

FORMATO: Max 280 chars. Empieza con "Hola ${actualName.split(' ')[0]}!". ${actualToneGuide} NO emojis. NO comillas. 100% humano. JAMAS "vi tu perfil y me parecio interesante".

Responde UNICAMENTE con el mensaje.`
                    )
                    aiNote = aiResp.trim().replace(/^["']|["']$/g, '').slice(0, 280)
                    liLog(pid, `Nota IA [${strategy.id}]: "${aiNote.slice(0, 100)}..."`, 'info', 'connection')
                  } catch (aiErr) {
                    const firstName = actualName.split(' ')[0]
                    aiNote = FALLBACK_MESSAGES[strategy.id]?.(firstName) || FALLBACK_MESSAGES.contenido(firstName)
                    liLog(pid, `Nota IA fallo, fallback [${strategy.id}]`, 'error', 'connection')
                  }

                  // Find and click Connect button using evaluateHandle (returns live DOM reference)
                  let connectClicked = false
                  const connectHandle = await page.evaluateHandle(() => {
                    const getBtnText = (b) => {
                      const t = (b.innerText?.trim() || b.textContent?.trim() || '').toLowerCase()
                      const label = (b.getAttribute('aria-label') || '').toLowerCase()
                      return `${t} ${label}`
                    }
                    // Look for Connect button in the main profile actions area first
                    const actionBtns = [...document.querySelectorAll('main button, .pv-top-card button, section button')]
                    const connectBtn = actionBtns.find(b => {
                      const combined = getBtnText(b)
                      return (combined.includes('connect') || combined.includes('conectar')) &&
                             !combined.includes('disconnect') && !combined.includes('desconectar')
                    })
                    if (connectBtn) return connectBtn
                    // Fallback: search all buttons
                    const allBtns = [...document.querySelectorAll('button')]
                    return allBtns.find(b => {
                      const combined = getBtnText(b)
                      return (combined.includes('connect') || combined.includes('conectar')) &&
                             !combined.includes('disconnect') && !combined.includes('desconectar')
                    }) || null
                  })

                  if (connectHandle && connectHandle.asElement()) {
                    await connectHandle.asElement().click()
                    connectClicked = true
                    liLog(pid, `Click en boton Connect`, 'info', 'connection')
                  } else {
                    // Try "More" dropdown → Connect
                    const moreHandle = await page.evaluateHandle(() => {
                      const allBtns = [...document.querySelectorAll('main button, .pv-top-card button, button')]
                      return allBtns.find(b => {
                        const t = (b.innerText?.trim() || '').toLowerCase()
                        const label = (b.getAttribute('aria-label') || '').toLowerCase()
                        return t === 'more' || t === 'más' || t === 'mas' ||
                               label.includes('more action') || label.includes('más acciones')
                      }) || null
                    })
                    if (moreHandle && moreHandle.asElement()) {
                      await moreHandle.asElement().click()
                      await sleep(1500 + Math.random() * 1000)
                      const dropdownItems = await page.$$('[role="menuitem"], [role="option"], li button, li a, .artdeco-dropdown__item')
                      for (const item of dropdownItems) {
                        const text = await item.evaluate(el => (el.innerText?.trim() || '').toLowerCase() + ' ' + (el.getAttribute('aria-label') || '').toLowerCase())
                        if ((text.includes('connect') || text.includes('conectar')) && !text.includes('disconnect')) {
                          await item.click()
                          connectClicked = true
                          liLog(pid, `Click en Connect desde dropdown More`, 'info', 'connection')
                          break
                        }
                      }
                    }
                  }

                  if (!connectClicked) {
                    const debugBtns = await page.evaluate(() => {
                      return [...document.querySelectorAll('main button, .pv-top-card button')].slice(0, 8)
                        .map(b => (b.innerText?.trim() || b.getAttribute('aria-label') || '?').slice(0, 30)).join(' | ')
                    })
                    liLog(pid, `No se encontro boton conectar en perfil de ${actualName}: ${debugBtns}`, 'error', 'connection')
                    await page.goto(currentSearchUrl, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {})
                    await sleep(3000 + Math.random() * 2000)
                    continue
                  }

                  // Handle connect modal: deterministic approach
                  await sleep(3000 + Math.random() * 2000)
                  let noteSent = false

                  // Step 1: Check modal state - search broadly in entire page for modal elements
                  const modalState = await page.evaluate(() => {
                    // Find modal using multiple strategies
                    const modalSelectors = '[role="dialog"], .artdeco-modal, [class*="send-invite"], [class*="artdeco-modal"], [data-test-modal]'
                    const dialog = document.querySelector(modalSelectors)
                    // Also check for any overlay/modal by looking for visible overlays
                    const overlay = document.querySelector('.artdeco-modal-overlay, [class*="modal-overlay"], [class*="overlay--visible"]')
                    const modalRoot = dialog || (overlay ? overlay.querySelector('[role="document"], [role="dialog"], div > div') : null)

                    if (!modalRoot && !dialog && !overlay) return { hasModal: false }

                    // Search for buttons ANYWHERE on the page that are in a modal context
                    const searchRoot = modalRoot || dialog || overlay || document
                    const allBtns = [...searchRoot.querySelectorAll('button, [role="button"], a[role="button"]')]
                    // Also get ALL visible buttons on page as fallback
                    const pageBtns = [...document.querySelectorAll('button, [role="button"]')]
                      .filter(b => b.offsetWidth > 0 && b.offsetHeight > 0)

                    const buttons = [...new Set([...allBtns, ...pageBtns])].map(b => {
                      const t = (b.innerText?.trim() || '').toLowerCase()
                      const label = (b.getAttribute('aria-label') || '').toLowerCase()
                      return { text: t.slice(0, 60), ariaLabel: label.slice(0, 60) }
                    }).filter(b => b.text || b.ariaLabel)

                    const hasTextarea = !!(document.querySelector('[role="dialog"] textarea, .artdeco-modal textarea, textarea[name*="message"], textarea[id*="message"]'))
                    const fullText = (searchRoot.innerText || document.querySelector('[role="dialog"]')?.innerText || '').toLowerCase()
                    const isVerification = fullText.includes('email') && (fullText.includes('verify') || fullText.includes('verificar'))
                    const isHowKnow = fullText.includes('how do you know') || fullText.includes('como conoces')

                    // Debug: get modal HTML structure
                    const modalHtml = (dialog || overlay || document.querySelector('[role="dialog"]'))?.innerHTML?.slice(0, 500) || 'no-modal-html'

                    return { hasModal: true, hasTextarea, buttons, isVerification, isHowKnow, textPreview: fullText.slice(0, 300), modalHtml }
                  })

                  const btnSummary = modalState.buttons?.slice(0, 10).map(b => b.text || b.ariaLabel).join(' | ') || 'none'
                  liLog(pid, `Modal: ${modalState.hasModal ? 'SI' : 'NO'}, textarea: ${modalState.hasTextarea}, btns(${modalState.buttons?.length || 0}): ${btnSummary}`, 'info', 'connection')
                  if (modalState.hasModal) {
                    liLog(pid, `Modal text: ${(modalState.textPreview || '').slice(0, 150)}`, 'info', 'connection')
                  }

                  if (!modalState.hasModal) {
                    liLog(pid, `No aparecio modal para ${actualName}, esperando mas...`, 'info', 'connection')
                    await sleep(3000)
                    const retryModal = await page.$('[role="dialog"], .artdeco-modal, [class*="artdeco-modal"]')
                    if (!retryModal) {
                      liLog(pid, `Sin modal despues de espera extra`, 'info', 'connection')
                      continue
                    }
                  }

                  if (modalState.isVerification || modalState.isHowKnow) {
                    liLog(pid, `Modal de verificacion/how_know para ${actualName}, saltando`, 'info', 'connection')
                    await page.keyboard.press('Escape').catch(() => {})
                    await sleep(1000)
                    await page.goto(currentSearchUrl, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {})
                    try { await page.waitForSelector('a[href*="/in/"]', { timeout: 10000 }) } catch {}
                    await sleep(2000 + Math.random() * 2000)
                    continue
                  }

                  // Step 2: Try to click "Add a note" button - search entire page, not just modal
                  const addNoteTexts = ['add a note', 'agregar nota', 'add note', 'añadir nota', 'personalizar']
                  if (!modalState.hasTextarea) {
                    const addNoteResult = await page.evaluate((texts) => {
                      // Search ALL visible buttons on the page
                      const allBtns = [...document.querySelectorAll('button, [role="button"], a')]
                        .filter(b => b.offsetWidth > 0 && b.offsetHeight > 0)
                      for (const btn of allBtns) {
                        const btnText = (btn.innerText?.trim() || '').toLowerCase()
                        const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase()
                        const combined = btnText + ' ' + ariaLabel
                        if (texts.some(t => combined.includes(t))) {
                          btn.click()
                          return { clicked: true, text: btnText }
                        }
                      }
                      // Debug: list all button texts
                      const debug = allBtns.slice(0, 15).map(b => (b.innerText?.trim() || '').slice(0, 30)).join(' | ')
                      return { clicked: false, debug }
                    }, addNoteTexts)

                    if (addNoteResult.clicked) {
                      liLog(pid, `Click en "Add a note" (${addNoteResult.text})`, 'info', 'connection')
                      await sleep(2000 + Math.random() * 1000)
                    } else {
                      liLog(pid, `No "Add a note" btn. Visibles: ${addNoteResult.debug}`, 'info', 'connection')
                    }
                  }

                  // Step 3: Find and fill textarea - search broadly
                  let textarea = await page.$('[role="dialog"] textarea, .artdeco-modal textarea')
                  if (!textarea) textarea = await page.$('textarea[name*="message"], textarea[id*="invite"], textarea[id*="note"]')
                  if (!textarea) {
                    await sleep(1500)
                    textarea = await page.$('textarea')
                  }
                  if (textarea && aiNote) {
                    await textarea.click({ clickCount: 3 })
                    await sleep(300)
                    await textarea.type(aiNote, { delay: 20 + Math.random() * 35 })
                    await sleep(800 + Math.random() * 500)
                    liLog(pid, `Nota escrita: "${aiNote.slice(0, 80)}..."`, 'info', 'connection')
                  } else {
                    liLog(pid, `No textarea encontrado en pagina`, 'info', 'connection')
                  }

                  // Step 4: Click Send button - search entire page
                  const sendTexts = ['send', 'enviar']
                  const skipTexts = ['without', 'sin nota', 'sin un']
                  const sendClicked = await page.evaluate((sendT, skipT) => {
                    const allBtns = [...document.querySelectorAll('button, [role="button"]')]
                      .filter(b => b.offsetWidth > 0 && b.offsetHeight > 0)
                    // First try: "Send" NOT "Send without a note" — prefer buttons inside dialog
                    const dialogBtns = [...document.querySelectorAll('[role="dialog"] button, .artdeco-modal button, [class*="artdeco-modal"] button')]
                      .filter(b => b.offsetWidth > 0)
                    const searchOrder = [...dialogBtns, ...allBtns]
                    const seen = new Set()
                    for (const btn of searchOrder) {
                      if (seen.has(btn)) continue
                      seen.add(btn)
                      const t = (btn.innerText?.trim() || '').toLowerCase()
                      const label = (btn.getAttribute('aria-label') || '').toLowerCase()
                      const combined = t + ' ' + label
                      if (sendT.some(s => combined.includes(s)) && !skipT.some(s => combined.includes(s))) {
                        btn.click()
                        return 'send'
                      }
                    }
                    // Fallback: any send button
                    for (const btn of searchOrder) {
                      const t = (btn.innerText?.trim() || '').toLowerCase()
                      const label = (btn.getAttribute('aria-label') || '').toLowerCase()
                      if (sendT.some(s => t.includes(s) || label.includes(s))) {
                        btn.click()
                        return 'send_fallback'
                      }
                    }
                    return null
                  }, sendTexts, skipTexts)

                  if (sendClicked) {
                    await sleep(2000 + Math.random() * 1000)
                    connected++
                    const withNote = textarea ? 'con nota personalizada' : 'sin nota'
                    liLog(pid, `Conexion enviada a ${actualName} ${withNote}!`, 'success', 'connection')
                    noteSent = true
                  } else {
                    liLog(pid, `No se encontro boton Send para ${actualName}`, 'error', 'connection')
                  }

                  if (!noteSent) {
                    liLog(pid, `No se pudo enviar conexion a ${actualName}`, 'error', 'connection')
                    await page.keyboard.press('Escape').catch(() => {})
                  }

                  // Go back to search results
                  await page.goto(currentSearchUrl, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {})
                  try { await page.waitForSelector('a[href*="/in/"]', { timeout: 10000 }) } catch {}
                  await sleep(2000 + Math.random() * 3000)
                } catch (connErr) {
                  liLog(pid, `Error conectando: ${connErr.message?.slice(0, 80)}`, 'error', 'connection')
                  await page.goto(currentSearchUrl, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {})
                  try { await page.waitForSelector('a[href*="/in/"]', { timeout: 10000 }) } catch {}
                  await sleep(3000)
                }
              }

              // Next page or rotate to next search query
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
                  // Update currentSearchUrl to reflect the new page
                  currentSearchUrl = await page.url()
                } else if (attempt + 1 < 3 && searchQueries[attempt + 1]) {
                  // No more pages, try next search query
                  const nextQuery = searchQueries[attempt + 1]
                  liLog(pid, `Cambiando busqueda a: "${nextQuery}"`, 'info', 'connection')
                  currentSearchUrl = buildSearchUrl(nextQuery)
                  await page.goto(currentSearchUrl, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {})
                  await sleep(3000 + Math.random() * 4000)
                } else break
              }
            }

            liLog(pid, `${connected} conexiones enviadas en total`, 'success', 'connection')
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

          // FIRST publish the new post WITH image, THEN delete old post (only if new one succeeded)
          const result = await linkedinBrowser.createPost(pid, post.text, imageUrl, { requireImage: true })
          if (result.success) {
            // New post with image published successfully - NOW safe to delete old one
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
                liLog(pid, `No se pudo eliminar post viejo (${delErr.response?.status}), post nuevo ya publicado con imagen`, 'error', 'post')
              }
            }
            fixed++
            liLog(pid, `Post re-publicado con imagen! (${fixed} arreglados)`, 'success', 'post')
          } else {
            liLog(pid, `Error re-publicando con imagen: ${result.message}, NO se borra el post original`, 'error', 'post')
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
