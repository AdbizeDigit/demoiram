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
app.use('/api/outreach', outreachRoutes)

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

  // Inicializar tablas de outreach
  try {
    const { emailOutreachService } = await import('./services/outreach/email-outreach-service.js');
    await emailOutreachService.initTables();
    console.log('📧 Tablas de outreach inicializadas');
  } catch (err) {
    console.error('⚠️ Error inicializando tablas de outreach:', err.message);
  }
})
