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
      "SELECT id, name, email, phone, social_whatsapp, sector FROM leads WHERE UPPER(status) IN ('NEW', 'NUEVO') AND (email IS NOT NULL OR phone IS NOT NULL) AND sector NOT LIKE 'ai-agent:%' AND (source_url IS NULL OR source_url NOT LIKE 'referido:%') ORDER BY score DESC NULLS LAST, created_at DESC LIMIT 100"
    )
    autoPlayState.total = leads.length

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

      // 3s delay between contacts
      if (autoPlayState.running && i < leads.length - 1) {
        await new Promise(r => setTimeout(r, 3000))
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
