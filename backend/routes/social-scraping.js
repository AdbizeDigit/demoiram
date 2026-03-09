import express from 'express'
import { protect } from '../middleware/auth.js'
import axios from 'axios'
import * as cheerio from 'cheerio'
import { pool } from '../config/database.js'
import { analyzeWithDeepSeek } from '../services/deepseek.js'

const router = express.Router()

// ==========================================
// 🔍 SOCIAL MEDIA SCRAPING SYSTEM
// ==========================================

/**
 * 1. LINKEDIN COMPANY SCRAPING
 * Extrae información de empresas desde LinkedIn
 */
router.post('/linkedin-company', protect, async (req, res) => {
  try {
    const { companyName, linkedinUrl } = req.body

    // Simular extracción de datos de LinkedIn
    // En producción usar LinkedIn API o scraping con Puppeteer
    const linkedinData = {
      company_name: companyName,
      linkedin_url: linkedinUrl,
      employee_count: Math.floor(Math.random() * 10000) + 100,
      followers: Math.floor(Math.random() * 50000) + 1000,
      industry: 'Technology',
      headquarters: 'San Francisco, CA',
      founded: 2015,
      specialties: ['SaaS', 'Cloud Computing', 'AI', 'Analytics'],
      company_type: 'Privately Held',
      recent_posts: [
        {
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          content: 'Excited to announce our Series B funding round!',
          engagement: { likes: 245, comments: 32, shares: 18 },
          topics: ['funding', 'growth']
        },
        {
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          content: "We're hiring! Looking for talented engineers to join our team.",
          engagement: { likes: 156, comments: 23, shares: 45 },
          topics: ['hiring', 'careers']
        },
        {
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          content: 'Proud to partner with Industry Leader Inc.',
          engagement: { likes: 320, comments: 41, shares: 67 },
          topics: ['partnership', 'announcement']
        }
      ],
      growth_rate: '+15% employees last 6 months',
      recent_hires: [
        { title: 'VP of Sales', department: 'Sales', hired_date: '2 weeks ago' },
        { title: 'Head of Product', department: 'Product', hired_date: '1 month ago' },
        { title: 'Chief Marketing Officer', department: 'Marketing', hired_date: '1 month ago' }
      ],
      job_openings: 24,
      funding_rounds: [
        { round: 'Series B', amount: '$25M', date: '2024-01', investors: ['Sequoia', 'a16z'] },
        { round: 'Series A', amount: '$10M', date: '2022-06', investors: ['Accel'] }
      ]
    }

    // Analizar con IA para extraer insights
    const prompt = `Analiza los siguientes datos de LinkedIn de una empresa y genera insights de venta:

DATOS DE LINKEDIN:
${JSON.stringify(linkedinData, null, 2)}

Genera en JSON:
{
  "buying_signals": [
    {
      "signal": "señal detectada",
      "strength": "strong/medium/weak",
      "reason": "por qué es importante",
      "action": "qué hacer al respecto"
    }
  ],
  "company_health": "growing/stable/declining",
  "expansion_signals": ["señales", "de", "expansión"],
  "key_decision_makers": ["títulos", "de", "personas", "clave", "recién", "contratadas"],
  "best_outreach_angle": "mejor enfoque para contacto",
  "timing_recommendation": "cuándo contactar y por qué",
  "conversation_starters": ["temas", "para", "iniciar", "conversación"],
  "estimated_budget": "estimación de presupuesto disponible",
  "pain_points_likely": ["pain points", "probables", "basados", "en", "contrataciones"]
}`

    let aiInsights = null
    try {
      const aiResponse = await analyzeWithDeepSeek(prompt)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      aiInsights = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch (e) {
      console.error('Error parsing AI insights:', e)
    }

    // Guardar en base de datos
    await pool.query(`
      INSERT INTO linkedin_company_data (
        user_id, company_name, linkedin_url, company_data,
        employee_count, job_openings, ai_insights, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `, [
      req.user.id,
      companyName,
      linkedinUrl,
      JSON.stringify(linkedinData),
      linkedinData.employee_count,
      linkedinData.job_openings,
      JSON.stringify(aiInsights)
    ])

    res.json({
      success: true,
      company: companyName,
      linkedin_data: linkedinData,
      ai_insights: aiInsights,
      recommendation: 'Contacta ahora - múltiples señales de crecimiento detectadas'
    })

  } catch (error) {
    console.error('Error scraping LinkedIn company:', error)
    res.status(500).json({
      success: false,
      message: 'Error extrayendo datos de LinkedIn',
      error: error.message
    })
  }
})

/**
 * 2. LINKEDIN PEOPLE SEARCH
 * Encuentra decision makers en LinkedIn
 */
router.post('/linkedin-people-search', protect, async (req, res) => {
  try {
    const { companyName, jobTitles = ['CEO', 'CTO', 'VP Sales', 'Head of'] } = req.body

    // Simular búsqueda de personas
    const people = jobTitles.map(title => ({
      name: `${title} at ${companyName}`,
      title: title,
      company: companyName,
      location: 'San Francisco Bay Area',
      linkedin_url: `https://linkedin.com/in/${title.toLowerCase().replace(/\s+/g, '-')}-example`,
      profile_picture: null,
      connections: Math.floor(Math.random() * 500) + 500,
      recent_activity: [
        { type: 'post', content: 'Shared an article about AI trends', date: '3 days ago' },
        { type: 'engagement', content: 'Liked a post about industry news', date: '1 week ago' }
      ],
      experience: [
        { company: companyName, title: title, duration: '2 years' },
        { company: 'Previous Corp', title: 'Senior Position', duration: '3 years' }
      ],
      education: ['Stanford University', 'MBA'],
      skills: ['Leadership', 'Strategy', 'Sales', 'Business Development'],
      mutual_connections: Math.floor(Math.random() * 20),
      contact_info_available: false,
      premium_user: true
    }))

    // Generar estrategia de outreach para cada persona
    const prompt = `Para cada una de estas personas, genera una estrategia de outreach personalizada:

PERSONAS ENCONTRADAS:
${JSON.stringify(people, null, 2)}

Genera en JSON:
{
  "outreach_strategies": [
    {
      "person": "nombre y título",
      "priority": 1-10,
      "best_approach": "LinkedIn message/email/intro",
      "personalization_hooks": ["hooks", "específicos", "basados", "en", "su", "perfil"],
      "message_template": "template de mensaje personalizado",
      "timing": "mejor momento para contactar",
      "common_ground": ["puntos", "en", "común", "para", "mencionar"]
    }
  ],
  "overall_strategy": "estrategia general para este account"
}`

    let outreachStrategies = null
    try {
      const aiResponse = await analyzeWithDeepSeek(prompt)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      outreachStrategies = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch (e) {
      console.error('Error generating outreach strategies:', e)
    }

    res.json({
      success: true,
      company: companyName,
      people_found: people.length,
      people: people,
      outreach_strategies: outreachStrategies,
      recommendation: 'Prioriza contactar a personas con mutual connections primero'
    })

  } catch (error) {
    console.error('Error searching LinkedIn people:', error)
    res.status(500).json({
      success: false,
      message: 'Error buscando personas en LinkedIn',
      error: error.message
    })
  }
})

/**
 * 3. TWITTER/X COMPANY MONITORING
 * Monitorea actividad de empresas en Twitter/X
 */
router.post('/twitter-monitor', protect, async (req, res) => {
  try {
    const { companyTwitterHandle } = req.body

    // Simular extracción de tweets
    const twitterData = {
      handle: companyTwitterHandle,
      followers: Math.floor(Math.random() * 50000) + 5000,
      following: Math.floor(Math.random() * 1000) + 100,
      total_tweets: Math.floor(Math.random() * 5000) + 500,
      verified: true,
      recent_tweets: [
        {
          date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          text: 'Excited to announce our new product feature! 🚀',
          engagement: { likes: 234, retweets: 45, replies: 23 },
          hashtags: ['#ProductLaunch', '#Innovation'],
          sentiment: 'positive',
          topics: ['product_launch']
        },
        {
          date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          text: "We're hiring! Join our amazing team. Apply now 👉",
          engagement: { likes: 156, retweets: 67, replies: 12 },
          hashtags: ['#Hiring', '#JobOpening'],
          sentiment: 'positive',
          topics: ['hiring']
        },
        {
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          text: 'Looking forward to the Tech Summit next week. See you there! 📍',
          engagement: { likes: 89, retweets: 12, replies: 8 },
          hashtags: ['#TechSummit2025'],
          sentiment: 'neutral',
          topics: ['event']
        }
      ],
      engagement_rate: 2.5,
      posting_frequency: '5-7 tweets/week',
      most_mentioned_topics: ['product', 'hiring', 'events', 'partnerships'],
      trending_content: 'Product announcements get highest engagement',
      competitor_mentions: [
        { competitor: '@CompetitorCo', sentiment: 'neutral', context: 'industry comparison' }
      ]
    }

    // Analizar con IA para detectar oportunidades
    const prompt = `Analiza la actividad de Twitter de esta empresa y detecta oportunidades de venta:

DATOS DE TWITTER:
${JSON.stringify(twitterData, null, 2)}

Genera en JSON:
{
  "buying_signals": [
    {
      "signal": "señal detectada",
      "evidence": "tweet o actividad específica",
      "urgency": "high/medium/low",
      "recommended_action": "qué hacer"
    }
  ],
  "engagement_opportunities": ["formas", "de", "engagement", "con", "sus", "tweets"],
  "conversation_starters": ["temas", "para", "iniciar", "DM"],
  "trending_interests": ["temas", "que", "les", "interesan", "ahora"],
  "best_contact_time": "mejor momento basado en actividad",
  "partnership_signals": ["señales", "de", "búsqueda", "de", "partners"],
  "content_strategy_insights": "insights sobre su estrategia de contenido"
}`

    let aiInsights = null
    try {
      const aiResponse = await analyzeWithDeepSeek(prompt)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      aiInsights = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch (e) {
      console.error('Error analyzing Twitter data:', e)
    }

    // Guardar en base de datos
    await pool.query(`
      INSERT INTO twitter_company_data (
        user_id, twitter_handle, twitter_data, ai_insights, created_at
      ) VALUES ($1, $2, $3, $4, NOW())
    `, [
      req.user.id,
      companyTwitterHandle,
      JSON.stringify(twitterData),
      JSON.stringify(aiInsights)
    ])

    res.json({
      success: true,
      twitter_handle: companyTwitterHandle,
      twitter_data: twitterData,
      ai_insights: aiInsights,
      recommendation: 'Engage con sus tweets sobre product launches para iniciar conversación'
    })

  } catch (error) {
    console.error('Error monitoring Twitter:', error)
    res.status(500).json({
      success: false,
      message: 'Error monitoreando Twitter',
      error: error.message
    })
  }
})

/**
 * 4. MULTI-SOCIAL AGGREGATION
 * Agrega datos de múltiples redes sociales
 */
router.post('/multi-social-aggregate', protect, async (req, res) => {
  try {
    const { companyName, socialProfiles } = req.body
    // socialProfiles = { linkedin: 'url', twitter: 'handle', facebook: 'page', instagram: 'handle' }

    const aggregatedData = {
      company: companyName,
      linkedin: null,
      twitter: null,
      facebook: null,
      instagram: null,
      total_social_reach: 0,
      engagement_score: 0,
      social_health: null
    }

    // Agregar datos de cada red social (simulado)
    if (socialProfiles.linkedin) {
      aggregatedData.linkedin = {
        followers: Math.floor(Math.random() * 50000) + 1000,
        employee_count: Math.floor(Math.random() * 10000) + 100,
        engagement_rate: (Math.random() * 5).toFixed(2) + '%'
      }
      aggregatedData.total_social_reach += aggregatedData.linkedin.followers
    }

    if (socialProfiles.twitter) {
      aggregatedData.twitter = {
        followers: Math.floor(Math.random() * 100000) + 5000,
        tweets_per_week: Math.floor(Math.random() * 20) + 5,
        engagement_rate: (Math.random() * 3).toFixed(2) + '%'
      }
      aggregatedData.total_social_reach += aggregatedData.twitter.followers
    }

    if (socialProfiles.facebook) {
      aggregatedData.facebook = {
        likes: Math.floor(Math.random() * 30000) + 2000,
        posts_per_week: Math.floor(Math.random() * 10) + 3,
        engagement_rate: (Math.random() * 4).toFixed(2) + '%'
      }
      aggregatedData.total_social_reach += aggregatedData.facebook.likes
    }

    if (socialProfiles.instagram) {
      aggregatedData.instagram = {
        followers: Math.floor(Math.random() * 80000) + 3000,
        posts_per_week: Math.floor(Math.random() * 15) + 5,
        engagement_rate: (Math.random() * 6).toFixed(2) + '%'
      }
      aggregatedData.total_social_reach += aggregatedData.instagram.followers
    }

    // Calcular engagement score general
    const engagementRates = []
    if (aggregatedData.linkedin) engagementRates.push(parseFloat(aggregatedData.linkedin.engagement_rate))
    if (aggregatedData.twitter) engagementRates.push(parseFloat(aggregatedData.twitter.engagement_rate))
    if (aggregatedData.facebook) engagementRates.push(parseFloat(aggregatedData.facebook.engagement_rate))
    if (aggregatedData.instagram) engagementRates.push(parseFloat(aggregatedData.instagram.engagement_rate))

    aggregatedData.engagement_score = (
      engagementRates.reduce((a, b) => a + b, 0) / engagementRates.length
    ).toFixed(2)

    // Determinar social health
    if (aggregatedData.total_social_reach > 100000) {
      aggregatedData.social_health = 'Strong'
    } else if (aggregatedData.total_social_reach > 50000) {
      aggregatedData.social_health = 'Growing'
    } else {
      aggregatedData.social_health = 'Building'
    }

    // Analizar con IA
    const prompt = `Analiza la presencia en redes sociales de esta empresa:

DATOS AGREGADOS:
${JSON.stringify(aggregatedData, null, 2)}

Genera en JSON:
{
  "social_media_maturity": "early/growing/mature/leader",
  "strongest_channel": "canal más fuerte",
  "weakest_channel": "canal más débil",
  "content_strategy_insights": "insights sobre estrategia de contenido",
  "audience_engagement_quality": "calidad del engagement",
  "marketing_budget_estimate": "estimación de presupuesto de marketing",
  "opportunities_for_your_product": ["oportunidades", "basadas", "en", "su", "presencia", "social"],
  "recommended_outreach_channel": "mejor canal para contacto",
  "talking_points": ["puntos", "de", "conversación", "basados", "en", "actividad", "social"]
}`

    let aiInsights = null
    try {
      const aiResponse = await analyzeWithDeepSeek(prompt)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      aiInsights = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch (e) {
      console.error('Error analyzing social data:', e)
    }

    res.json({
      success: true,
      company: companyName,
      aggregated_data: aggregatedData,
      ai_insights: aiInsights,
      recommendation: `Empresa tiene presencia social ${aggregatedData.social_health} - contactar vía ${aiInsights?.recommended_outreach_channel || 'LinkedIn'}`
    })

  } catch (error) {
    console.error('Error aggregating social data:', error)
    res.status(500).json({
      success: false,
      message: 'Error agregando datos sociales',
      error: error.message
    })
  }
})

/**
 * 5. SOCIAL LISTENING - MONITOR KEYWORDS
 * Monitorea menciones de keywords en redes sociales
 */
router.post('/social-listening', protect, async (req, res) => {
  try {
    const { keywords, timeRange = '7days' } = req.body

    // Simular búsqueda de menciones
    const mentions = keywords.map(keyword => ({
      keyword,
      total_mentions: Math.floor(Math.random() * 1000) + 100,
      sentiment_breakdown: {
        positive: Math.floor(Math.random() * 60) + 20,
        neutral: Math.floor(Math.random() * 30) + 10,
        negative: Math.floor(Math.random() * 20) + 5
      },
      top_sources: [
        { platform: 'Twitter', mentions: Math.floor(Math.random() * 500) },
        { platform: 'LinkedIn', mentions: Math.floor(Math.random() * 300) },
        { platform: 'Reddit', mentions: Math.floor(Math.random() * 200) }
      ],
      trending: Math.random() > 0.5,
      notable_mentions: [
        {
          author: 'Industry Influencer',
          platform: 'Twitter',
          text: `Just tried ${keyword} and it's amazing!`,
          engagement: { likes: 456, shares: 89 },
          sentiment: 'positive',
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
        },
        {
          author: 'Tech Blogger',
          platform: 'LinkedIn',
          text: `Comparing ${keyword} alternatives for our company`,
          engagement: { likes: 234, comments: 45 },
          sentiment: 'neutral',
          date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
        }
      ]
    }))

    // Encontrar leads potenciales en las menciones
    const potentialLeads = []
    mentions.forEach(mention => {
      mention.notable_mentions.forEach(note => {
        if (note.text.toLowerCase().includes('looking for') ||
            note.text.toLowerCase().includes('comparing') ||
            note.text.toLowerCase().includes('need')) {
          potentialLeads.push({
            author: note.author,
            platform: note.platform,
            text: note.text,
            keyword: mention.keyword,
            intent_signal: 'high',
            date: note.date
          })
        }
      })
    })

    res.json({
      success: true,
      keywords,
      time_range: timeRange,
      mentions_summary: mentions,
      potential_leads: potentialLeads,
      total_leads_found: potentialLeads.length,
      recommendation: `${potentialLeads.length} personas mostrando intención de compra - contactar inmediatamente`
    })

  } catch (error) {
    console.error('Error in social listening:', error)
    res.status(500).json({
      success: false,
      message: 'Error en social listening',
      error: error.message
    })
  }
})

// Crear tablas necesarias
const tables = [
  `CREATE TABLE IF NOT EXISTS linkedin_company_data (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255),
    linkedin_url TEXT,
    company_data JSONB,
    employee_count INTEGER,
    job_openings INTEGER,
    ai_insights JSONB,
    created_at TIMESTAMP DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS twitter_company_data (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    twitter_handle VARCHAR(255),
    twitter_data JSONB,
    ai_insights JSONB,
    created_at TIMESTAMP DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_linkedin_company ON linkedin_company_data(company_name)`,
  `CREATE INDEX IF NOT EXISTS idx_twitter_handle ON twitter_company_data(twitter_handle)`
]

tables.forEach(tableSQL => {
  pool.query(tableSQL).catch(err => console.error('Error creating table:', err))
})

export default router
