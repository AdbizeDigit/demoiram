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
})

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
