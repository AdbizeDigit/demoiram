import express from 'express'
import { protect } from '../middleware/auth.js'
import axios from 'axios'
import * as cheerio from 'cheerio'
import { pool } from '../config/database.js'
import { analyzeWithDeepSeek } from '../services/deepseek.js'

const router = express.Router()

// ==========================================
// 🚀 SISTEMA DE SCRAPING AVANZADO CON IA
// ==========================================

/**
 * 1. SCRAPING INTELIGENTE CON IA
 * Usa IA para analizar páginas web y extraer información relevante automáticamente
 */
router.post('/intelligent-scrape', protect, async (req, res) => {
  try {
    const { url, targetInfo = 'company_info' } = req.body

    // Fetch página web
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    })

    const $ = cheerio.load(response.data)

    // Extraer texto visible
    const pageText = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 8000)

    // Usar IA para analizar y extraer información estructurada
    const prompt = `Analiza el siguiente texto de una página web y extrae información relevante sobre la empresa.

TEXTO DE LA PÁGINA:
${pageText}

Extrae y estructura la siguiente información en formato JSON:
{
  "company_name": "nombre de la empresa",
  "industry": "industria o sector",
  "description": "breve descripción (2-3 líneas)",
  "products_services": ["lista", "de", "productos/servicios"],
  "target_market": "mercado objetivo",
  "company_size": "tamaño estimado (startup/pequeña/mediana/grande/enterprise)",
  "technologies": ["tecnologías", "mencionadas"],
  "pain_points": ["problemas", "que", "resuelven"],
  "competitive_advantages": ["ventajas", "competitivas"],
  "recent_news": ["noticias", "recientes", "mencionadas"],
  "decision_makers": [{"name": "nombre", "title": "cargo"}],
  "contact_info": {
    "emails": ["emails"],
    "phones": ["teléfonos"],
    "address": "dirección física"
  },
  "social_proof": ["clientes", "mencionados", "o", "casos", "de", "éxito"],
  "funding_status": "información sobre financiación si se menciona",
  "hiring": true/false si están contratando,
  "expansion_signals": ["señales", "de", "expansión"]
}

Devuelve SOLO el JSON, sin explicaciones adicionales.`

    const aiAnalysis = await analyzeWithDeepSeek(prompt)

    let structuredData
    try {
      // Extraer JSON del análisis de IA
      const jsonMatch = aiAnalysis.match(/\{[\s\S]*\}/)
      structuredData = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
    } catch (e) {
      structuredData = { raw_analysis: aiAnalysis }
    }

    // Extraer también con métodos tradicionales como fallback
    const traditionalData = {
      url,
      title: $('title').text(),
      metaDescription: $('meta[name="description"]').attr('content') || '',
      h1: $('h1').first().text(),
      emails: extractEmails(pageText),
      phones: extractPhones(pageText),
      socialLinks: extractSocialLinks($),
      technologies: detectTechnologies($, response.data)
    }

    // Combinar datos de IA con extracción tradicional
    const enrichedData = {
      ...structuredData,
      traditional_extraction: traditionalData,
      scraped_at: new Date().toISOString(),
      source_url: url,
      scraping_method: 'ai_enhanced'
    }

    res.json({
      success: true,
      data: enrichedData,
      ai_powered: true
    })

  } catch (error) {
    console.error('Error in intelligent scraping:', error)
    res.status(500).json({
      success: false,
      message: 'Error en scraping inteligente',
      error: error.message
    })
  }
})

/**
 * 2. SCRAPING DE EVENTOS Y CONFERENCIAS
 * Encuentra eventos relevantes donde hay potenciales clientes
 */
router.post('/scrape-events', protect, async (req, res) => {
  try {
    const { industry, location, dateRange = 'upcoming' } = req.body

    // Fuentes de eventos
    const eventSources = [
      {
        name: 'Eventbrite',
        url: `https://www.eventbrite.com/d/${location}/${industry}--events/`,
        selector: '.search-event-card-wrapper'
      },
      {
        name: 'Meetup',
        url: `https://www.meetup.com/find/?keywords=${industry}&location=${location}`,
        selector: '.event-listing'
      }
    ]

    const events = []

    // Simular extracción de eventos (en producción usar APIs reales o scraping)
    const mockEvents = [
      {
        name: `${industry} Summit 2025`,
        date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        location: location,
        attendees: 500,
        type: 'conference',
        url: 'https://example.com/event1',
        speakers: [
          { name: 'Juan Pérez', company: 'TechCorp', title: 'CEO' },
          { name: 'María López', company: 'InnovateCo', title: 'CTO' }
        ],
        sponsors: ['CompanyA', 'CompanyB', 'CompanyC'],
        topics: ['AI', 'Digital Transformation', 'Cloud Computing'],
        ticketPrice: 299,
        description: `Leading conference about ${industry} with 500+ attendees`,
        networking_opportunities: true
      },
      {
        name: `${industry} Networking Meetup`,
        date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        location: location,
        attendees: 100,
        type: 'networking',
        url: 'https://example.com/event2',
        organizer: { name: 'Roberto Silva', company: 'Local ${industry} Group' },
        topics: ['Networking', 'Business Development'],
        ticketPrice: 0,
        description: `Monthly networking event for ${industry} professionals`,
        networking_opportunities: true
      },
      {
        name: `${industry} Workshop: Advanced Techniques`,
        date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        location: location,
        attendees: 50,
        type: 'workshop',
        url: 'https://example.com/event3',
        instructor: { name: 'Ana Martínez', company: 'Expert ${industry} Consulting' },
        topics: ['Hands-on Training', 'Best Practices'],
        ticketPrice: 199,
        description: `Intensive workshop for ${industry} professionals`,
        networking_opportunities: true
      }
    ]

    // Analizar cada evento para extraer leads potenciales
    for (const event of mockEvents) {
      const eventData = {
        ...event,
        lead_opportunities: {
          attendees_count: event.attendees,
          decision_makers: event.speakers || [],
          sponsor_companies: event.sponsors || [],
          networking_potential: event.networking_opportunities,
          relevance_score: calculateEventRelevance(event, industry)
        },
        outreach_strategy: generateEventOutreachStrategy(event)
      }

      events.push(eventData)
    }

    // Guardar eventos en base de datos
    for (const event of events) {
      await pool.query(`
        INSERT INTO scraped_events (
          user_id, event_name, event_date, location, event_type,
          attendees_count, event_url, event_data, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        ON CONFLICT (event_url) DO NOTHING
      `, [
        req.user.id,
        event.name,
        event.date,
        event.location,
        event.type,
        event.attendees,
        event.url,
        JSON.stringify(event)
      ])
    }

    res.json({
      success: true,
      events,
      total: events.length,
      recommendation: 'Contacta a speakers y sponsors antes del evento para maximizar oportunidades'
    })

  } catch (error) {
    console.error('Error scraping events:', error)
    res.status(500).json({
      success: false,
      message: 'Error extrayendo eventos',
      error: error.message
    })
  }
})

/**
 * 3. DETECTOR DE CAMBIOS EN EMPRESAS
 * Monitorea cambios importantes en empresas objetivo (funding, hiring, expansión)
 */
router.post('/detect-company-changes', protect, async (req, res) => {
  try {
    const { companyDomain } = req.body

    // Obtener datos históricos de la empresa
    const historicalData = await pool.query(
      'SELECT * FROM company_snapshots WHERE company_domain = $1 ORDER BY created_at DESC LIMIT 1',
      [companyDomain]
    )

    // Scrapear datos actuales de la empresa
    const currentData = await scrapeCompanyWebsite(companyDomain)

    let changes = []

    if (historicalData.rows.length > 0) {
      const previous = historicalData.rows[0].company_data
      changes = detectChanges(previous, currentData)
    }

    // Guardar snapshot actual
    await pool.query(`
      INSERT INTO company_snapshots (
        user_id, company_domain, company_data, created_at
      ) VALUES ($1, $2, $3, NOW())
    `, [req.user.id, companyDomain, JSON.stringify(currentData)])

    // Analizar cambios con IA para determinar oportunidades
    let aiInsights = null
    if (changes.length > 0) {
      const prompt = `Analiza los siguientes cambios detectados en una empresa y determina si representan oportunidades de venta:

CAMBIOS DETECTADOS:
${JSON.stringify(changes, null, 2)}

DATOS ACTUALES DE LA EMPRESA:
${JSON.stringify(currentData, null, 2)}

Responde en JSON:
{
  "opportunity_score": 0-100,
  "opportunity_type": "expansion/funding/hiring/product_launch/other",
  "recommended_action": "acción específica recomendada",
  "talking_points": ["puntos", "clave", "para", "conversación"],
  "urgency": "low/medium/high",
  "decision_makers_to_contact": ["títulos", "o", "nombres"],
  "email_subject_suggestions": ["sugerencias", "de", "asunto"]
}`

      const aiResponse = await analyzeWithDeepSeek(prompt)
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
        aiInsights = jsonMatch ? JSON.parse(jsonMatch[0]) : null
      } catch (e) {
        console.error('Error parsing AI insights:', e)
      }
    }

    res.json({
      success: true,
      company: companyDomain,
      changes_detected: changes.length,
      changes,
      current_data: currentData,
      ai_insights: aiInsights,
      recommendation: changes.length > 0 ? 'Contactar empresa ASAP - cambios detectados' : 'Monitorear para cambios futuros'
    })

  } catch (error) {
    console.error('Error detecting company changes:', error)
    res.status(500).json({
      success: false,
      message: 'Error detectando cambios',
      error: error.message
    })
  }
})

/**
 * 4. SCRAPING MULTI-IDIOMA CON TRADUCCIÓN AUTOMÁTICA
 */
router.post('/multilingual-scrape', protect, async (req, res) => {
  try {
    const { url, targetLanguages = ['es', 'en', 'pt', 'fr'] } = req.body

    const response = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 10000
    })

    const $ = cheerio.load(response.data)
    const pageText = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 5000)

    // Detectar idioma original
    const detectedLanguage = detectLanguage(pageText)

    // Extraer información y traducir a múltiples idiomas
    const multilingualData = {}

    for (const lang of targetLanguages) {
      if (lang === detectedLanguage) {
        multilingualData[lang] = {
          title: $('title').text(),
          description: $('meta[name="description"]').attr('content') || '',
          main_content: pageText.substring(0, 1000)
        }
      } else {
        // Usar IA para traducir contenido clave
        const translationPrompt = `Translate the following business information to ${lang}. Return ONLY the JSON without any additional text:

{
  "title": "${$('title').text()}",
  "description": "${$('meta[name="description"]').attr('content') || ''}",
  "main_content": "${pageText.substring(0, 500)}"
}

Response in JSON format with translated content.`

        try {
          const translated = await analyzeWithDeepSeek(translationPrompt)
          const jsonMatch = translated.match(/\{[\s\S]*\}/)
          multilingualData[lang] = jsonMatch ? JSON.parse(jsonMatch[0]) : null
        } catch (e) {
          multilingualData[lang] = { error: 'Translation failed' }
        }
      }
    }

    res.json({
      success: true,
      original_language: detectedLanguage,
      url,
      multilingual_content: multilingualData,
      languages_available: targetLanguages
    })

  } catch (error) {
    console.error('Error in multilingual scraping:', error)
    res.status(500).json({
      success: false,
      message: 'Error en scraping multiidioma',
      error: error.message
    })
  }
})

/**
 * 5. SCRAPING DE TECNOLOGÍAS Y STACK TÉCNICO
 * Identifica las tecnologías que usa una empresa
 */
router.post('/detect-tech-stack', protect, async (req, res) => {
  try {
    const { url } = req.body

    const response = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 10000
    })

    const $ = cheerio.load(response.data)
    const htmlContent = response.data

    const techStack = {
      frontend: [],
      backend: [],
      analytics: [],
      marketing: [],
      infrastructure: [],
      payment: [],
      cms: [],
      ecommerce: []
    }

    // Detectar tecnologías frontend
    if (htmlContent.includes('react')) techStack.frontend.push('React')
    if (htmlContent.includes('vue')) techStack.frontend.push('Vue.js')
    if (htmlContent.includes('angular')) techStack.frontend.push('Angular')
    if (htmlContent.includes('next/')) techStack.frontend.push('Next.js')
    if (htmlContent.includes('nuxt')) techStack.frontend.push('Nuxt.js')
    if ($('script[src*="jquery"]').length > 0) techStack.frontend.push('jQuery')
    if ($('script[src*="bootstrap"]').length > 0) techStack.frontend.push('Bootstrap')
    if ($('link[href*="tailwind"]').length > 0) techStack.frontend.push('Tailwind CSS')

    // Detectar analytics
    if (htmlContent.includes('google-analytics') || htmlContent.includes('gtag')) {
      techStack.analytics.push('Google Analytics')
    }
    if (htmlContent.includes('hotjar')) techStack.analytics.push('Hotjar')
    if (htmlContent.includes('mixpanel')) techStack.analytics.push('Mixpanel')
    if (htmlContent.includes('segment')) techStack.analytics.push('Segment')

    // Detectar marketing tools
    if (htmlContent.includes('hubspot')) techStack.marketing.push('HubSpot')
    if (htmlContent.includes('intercom')) techStack.marketing.push('Intercom')
    if (htmlContent.includes('drift')) techStack.marketing.push('Drift')
    if (htmlContent.includes('mailchimp')) techStack.marketing.push('Mailchimp')

    // Detectar infraestructura
    if (response.headers['server']) {
      techStack.infrastructure.push(`Server: ${response.headers['server']}`)
    }
    if (response.headers['x-powered-by']) {
      techStack.infrastructure.push(response.headers['x-powered-by'])
    }
    if (htmlContent.includes('cloudflare')) techStack.infrastructure.push('Cloudflare')
    if (htmlContent.includes('amazonaws')) techStack.infrastructure.push('AWS')
    if (htmlContent.includes('vercel')) techStack.infrastructure.push('Vercel')

    // Detectar payment gateways
    if (htmlContent.includes('stripe')) techStack.payment.push('Stripe')
    if (htmlContent.includes('paypal')) techStack.payment.push('PayPal')
    if (htmlContent.includes('square')) techStack.payment.push('Square')

    // Detectar CMS
    if (htmlContent.includes('wordpress') || htmlContent.includes('wp-content')) {
      techStack.cms.push('WordPress')
    }
    if (htmlContent.includes('shopify')) techStack.cms.push('Shopify')
    if (htmlContent.includes('wix')) techStack.cms.push('Wix')
    if (htmlContent.includes('contentful')) techStack.cms.push('Contentful')

    // Generar insights con IA
    const prompt = `Basándote en el siguiente stack tecnológico detectado, genera insights de venta:

STACK TECNOLÓGICO:
${JSON.stringify(techStack, null, 2)}

Responde en JSON:
{
  "tech_maturity": "startup/growing/mature/enterprise",
  "pain_points": ["problemas", "técnicos", "probables"],
  "sales_opportunities": ["oportunidades", "específicas"],
  "recommended_pitch": "pitch personalizado basado en su tech stack",
  "budget_estimate": "estimación de presupuesto tecnológico",
  "decision_makers_to_target": ["CTO", "VP Engineering", etc]
}`

    let aiInsights = null
    try {
      const aiResponse = await analyzeWithDeepSeek(prompt)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      aiInsights = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch (e) {
      console.error('Error parsing AI insights:', e)
    }

    res.json({
      success: true,
      url,
      tech_stack: techStack,
      total_technologies: Object.values(techStack).flat().length,
      ai_insights: aiInsights,
      scraped_at: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error detecting tech stack:', error)
    res.status(500).json({
      success: false,
      message: 'Error detectando tecnologías',
      error: error.message
    })
  }
})

/**
 * 6. ENRIQUECIMIENTO AUTOMÁTICO DE LEADS
 * Toma un lead básico y lo enriquece con múltiples fuentes
 */
router.post('/enrich-lead', protect, async (req, res) => {
  try {
    const { companyName, companyDomain, location } = req.body

    const enrichedData = {
      basic_info: { companyName, companyDomain, location },
      website_data: null,
      tech_stack: null,
      social_media: null,
      news_mentions: null,
      job_postings: null,
      company_size_estimate: null,
      funding_info: null,
      enrichment_score: 0
    }

    let enrichmentScore = 0

    // 1. Scrapear website si hay dominio
    if (companyDomain) {
      try {
        const websiteResponse = await axios.get(`https://${companyDomain}`, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          timeout: 10000
        })
        const $ = cheerio.load(websiteResponse.data)

        enrichedData.website_data = {
          title: $('title').text(),
          description: $('meta[name="description"]').attr('content'),
          has_blog: $('a[href*="blog"]').length > 0,
          has_careers: $('a[href*="career"], a[href*="jobs"]').length > 0,
          contact_page: $('a[href*="contact"]').length > 0
        }
        enrichmentScore += 20
      } catch (e) {
        console.log('Could not scrape website:', e.message)
      }
    }

    // 2. Buscar en redes sociales
    enrichedData.social_media = await findSocialMediaProfiles(companyName)
    if (enrichedData.social_media.linkedin) enrichmentScore += 15
    if (enrichedData.social_media.twitter) enrichmentScore += 10

    // 3. Buscar noticias recientes
    enrichedData.news_mentions = await searchCompanyNews(companyName, location)
    enrichmentScore += Math.min(enrichedData.news_mentions.length * 5, 20)

    // 4. Buscar ofertas de trabajo (señal de crecimiento)
    enrichedData.job_postings = await searchJobPostings(companyName)
    if (enrichedData.job_postings.count > 0) {
      enrichmentScore += 15
      enrichedData.company_size_estimate = estimateCompanySize(enrichedData.job_postings.count)
    }

    // 5. Usar IA para análisis final y recomendaciones
    const prompt = `Analiza los siguientes datos enriquecidos de una empresa y genera recomendaciones de outreach:

DATOS ENRIQUECIDOS:
${JSON.stringify(enrichedData, null, 2)}

Genera en JSON:
{
  "lead_quality": "HOT/WARM/COLD",
  "contact_priority": 1-10,
  "recommended_approach": "estrategia específica",
  "key_talking_points": ["puntos", "clave"],
  "best_contact_time": "timing recomendado",
  "personalization_tips": ["tips", "específicos"],
  "estimated_deal_size": "estimación"
}`

    let aiRecommendations = null
    try {
      const aiResponse = await analyzeWithDeepSeek(prompt)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      aiRecommendations = jsonMatch ? JSON.parse(jsonMatch[0]) : null
      enrichmentScore += 20
    } catch (e) {
      console.error('Error in AI analysis:', e)
    }

    enrichedData.enrichment_score = enrichmentScore
    enrichedData.ai_recommendations = aiRecommendations

    // Guardar en base de datos
    await pool.query(`
      INSERT INTO enriched_leads (
        user_id, company_name, company_domain, enriched_data,
        enrichment_score, created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
    `, [req.user.id, companyName, companyDomain, JSON.stringify(enrichedData), enrichmentScore])

    res.json({
      success: true,
      enriched_data: enrichedData,
      enrichment_score: enrichmentScore,
      quality_level: enrichmentScore >= 70 ? 'HIGH' : enrichmentScore >= 40 ? 'MEDIUM' : 'LOW'
    })

  } catch (error) {
    console.error('Error enriching lead:', error)
    res.status(500).json({
      success: false,
      message: 'Error enriqueciendo lead',
      error: error.message
    })
  }
})

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function extractEmails(text) {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
  const emails = text.match(emailRegex) || []
  return [...new Set(emails)].filter(email =>
    !email.toLowerCase().includes('noreply') &&
    !email.toLowerCase().includes('example')
  ).slice(0, 5)
}

function extractPhones(text) {
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g
  const phones = text.match(phoneRegex) || []
  return [...new Set(phones)].filter(phone => {
    const digits = phone.replace(/\D/g, '')
    return digits.length >= 7 && digits.length <= 15
  }).slice(0, 3)
}

function extractSocialLinks($) {
  return {
    linkedin: $('a[href*="linkedin.com"]').attr('href') || null,
    twitter: $('a[href*="twitter.com"], a[href*="x.com"]').attr('href') || null,
    facebook: $('a[href*="facebook.com"]').attr('href') || null,
    instagram: $('a[href*="instagram.com"]').attr('href') || null,
    youtube: $('a[href*="youtube.com"]').attr('href') || null
  }
}

function detectTechnologies($, html) {
  const technologies = []

  // Meta generators
  const generator = $('meta[name="generator"]').attr('content')
  if (generator) technologies.push(generator)

  // Common frameworks
  if (html.includes('wp-content')) technologies.push('WordPress')
  if (html.includes('shopify')) technologies.push('Shopify')
  if (html.includes('react')) technologies.push('React')
  if (html.includes('vue')) technologies.push('Vue.js')
  if (html.includes('angular')) technologies.push('Angular')

  return technologies
}

function detectLanguage(text) {
  // Simple language detection based on common words
  const spanishWords = ['el', 'la', 'de', 'que', 'y', 'a', 'en', 'es', 'para', 'con']
  const englishWords = ['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'it']
  const portugueseWords = ['o', 'a', 'de', 'que', 'e', 'do', 'da', 'em', 'um', 'para']

  const lowerText = text.toLowerCase()

  let esCount = spanishWords.filter(w => lowerText.includes(` ${w} `)).length
  let enCount = englishWords.filter(w => lowerText.includes(` ${w} `)).length
  let ptCount = portugueseWords.filter(w => lowerText.includes(` ${w} `)).length

  if (esCount > enCount && esCount > ptCount) return 'es'
  if (ptCount > enCount && ptCount > esCount) return 'pt'
  return 'en'
}

function calculateEventRelevance(event, targetIndustry) {
  let score = 50 // base score

  if (event.attendees > 200) score += 20
  else if (event.attendees > 100) score += 10

  if (event.type === 'conference') score += 15
  else if (event.type === 'networking') score += 10

  if (event.networking_opportunities) score += 10

  if (event.speakers && event.speakers.length > 3) score += 5

  return Math.min(score, 100)
}

function generateEventOutreachStrategy(event) {
  const strategies = []

  if (event.speakers && event.speakers.length > 0) {
    strategies.push({
      target: 'speakers',
      approach: 'Contactar speakers antes del evento, ofrecer reunión durante el evento',
      timing: '2-3 semanas antes del evento'
    })
  }

  if (event.sponsors && event.sponsors.length > 0) {
    strategies.push({
      target: 'sponsors',
      approach: 'Contactar empresas patrocinadoras, pueden necesitar servicios relacionados',
      timing: '1 mes antes del evento'
    })
  }

  strategies.push({
    target: 'attendees',
    approach: 'Asistir al evento, networking directo, follow-up post-evento',
    timing: 'Durante y después del evento'
  })

  return strategies
}

async function scrapeCompanyWebsite(domain) {
  try {
    const response = await axios.get(`https://${domain}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 10000
    })

    const $ = cheerio.load(response.data)

    return {
      title: $('title').text(),
      description: $('meta[name="description"]').attr('content') || '',
      h1_count: $('h1').length,
      has_blog: $('a[href*="blog"]').length > 0,
      has_careers: $('a[href*="career"], a[href*="jobs"]').length > 0,
      team_page: $('a[href*="team"], a[href*="about"]').length > 0,
      product_count: $('a[href*="product"], .product').length,
      social_links: extractSocialLinks($),
      contact_forms: $('form[action*="contact"], form[id*="contact"]').length,
      last_updated: new Date().toISOString()
    }
  } catch (error) {
    console.error('Error scraping company website:', error.message)
    return { error: error.message }
  }
}

function detectChanges(previousData, currentData) {
  const changes = []

  // Detectar nuevos jobs
  if (currentData.has_careers && !previousData.has_careers) {
    changes.push({
      type: 'new_careers_page',
      importance: 'high',
      description: 'La empresa ahora tiene página de careers - señal de crecimiento'
    })
  }

  // Detectar nuevo blog
  if (currentData.has_blog && !previousData.has_blog) {
    changes.push({
      type: 'new_blog',
      importance: 'medium',
      description: 'Nuevo blog creado - posible cambio en estrategia de marketing'
    })
  }

  // Detectar más productos
  if (currentData.product_count > previousData.product_count) {
    changes.push({
      type: 'new_products',
      importance: 'high',
      description: `Nuevos productos detectados (${currentData.product_count - previousData.product_count})`,
      opportunity: 'Ofrecer servicios relacionados al nuevo producto'
    })
  }

  // Detectar cambio en título (rebrand, nueva dirección)
  if (currentData.title !== previousData.title) {
    changes.push({
      type: 'title_change',
      importance: 'medium',
      description: 'Cambio en título de la página - posible rebrand',
      old_title: previousData.title,
      new_title: currentData.title
    })
  }

  return changes
}

async function findSocialMediaProfiles(companyName) {
  // Simulación - en producción usar APIs de redes sociales o scraping real
  return {
    linkedin: `https://linkedin.com/company/${companyName.toLowerCase().replace(/\s+/g, '-')}`,
    twitter: `https://twitter.com/${companyName.toLowerCase().replace(/\s+/g, '')}`,
    facebook: null,
    instagram: null
  }
}

async function searchCompanyNews(companyName, location) {
  // Simulación - en producción usar News API
  return [
    {
      title: `${companyName} raises $10M in Series A funding`,
      source: 'TechCrunch',
      date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      url: 'https://example.com/news1',
      sentiment: 'positive',
      relevance: 'high'
    },
    {
      title: `${companyName} expands to new market in ${location}`,
      source: 'Business Insider',
      date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      url: 'https://example.com/news2',
      sentiment: 'positive',
      relevance: 'high'
    }
  ]
}

async function searchJobPostings(companyName) {
  // Simulación - en producción usar LinkedIn Jobs API o Indeed API
  return {
    count: Math.floor(Math.random() * 20) + 5,
    recent_postings: [
      { title: 'Senior Software Engineer', department: 'Engineering', posted_days_ago: 5 },
      { title: 'Product Manager', department: 'Product', posted_days_ago: 10 },
      { title: 'Sales Representative', department: 'Sales', posted_days_ago: 3 }
    ]
  }
}

function estimateCompanySize(jobPostingsCount) {
  if (jobPostingsCount > 50) return 'Large (500+ employees)'
  if (jobPostingsCount > 20) return 'Medium (100-500 employees)'
  if (jobPostingsCount > 5) return 'Small (20-100 employees)'
  return 'Startup (<20 employees)'
}

// Crear tabla para eventos si no existe
pool.query(`
  CREATE TABLE IF NOT EXISTS scraped_events (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    event_name VARCHAR(500),
    event_date TIMESTAMP,
    location VARCHAR(255),
    event_type VARCHAR(100),
    attendees_count INTEGER,
    event_url TEXT UNIQUE,
    event_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
  )
`).catch(err => console.error('Error creating scraped_events table:', err))

// Crear tabla para snapshots de empresas
pool.query(`
  CREATE TABLE IF NOT EXISTS company_snapshots (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    company_domain VARCHAR(255),
    company_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
  )
`).catch(err => console.error('Error creating company_snapshots table:', err))

// Crear tabla para leads enriquecidos
pool.query(`
  CREATE TABLE IF NOT EXISTS enriched_leads (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255),
    company_domain VARCHAR(255),
    enriched_data JSONB,
    enrichment_score INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
  )
`).catch(err => console.error('Error creating enriched_leads table:', err))

export default router
