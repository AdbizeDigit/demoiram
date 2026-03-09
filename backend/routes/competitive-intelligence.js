import express from 'express'
import { protect } from '../middleware/auth.js'
import axios from 'axios'
import * as cheerio from 'cheerio'
import { pool } from '../config/database.js'
import { analyzeWithDeepSeek } from '../services/deepseek.js'

const router = express.Router()

// ==========================================
// 🎯 COMPETITIVE INTELLIGENCE SYSTEM
// ==========================================

/**
 * 1. ANÁLISIS COMPETITIVO AUTOMÁTICO
 * Analiza competidores y genera estrategias
 */
router.post('/analyze-competitor', protect, async (req, res) => {
  try {
    const { competitorDomain, yourDomain } = req.body

    // Scrapear ambas páginas
    const [competitorData, yourData] = await Promise.all([
      scrapeCompetitorWebsite(competitorDomain),
      yourDomain ? scrapeCompetitorWebsite(yourDomain) : Promise.resolve(null)
    ])

    // Análisis comparativo con IA
    const prompt = `Realiza un análisis competitivo detallado comparando estas dos empresas:

TU EMPRESA:
${yourData ? JSON.stringify(yourData, null, 2) : 'No proporcionada'}

COMPETIDOR:
${JSON.stringify(competitorData, null, 2)}

Genera un análisis competitivo en JSON:
{
  "competitive_advantages": {
    "yours": ["ventajas", "tuyas"],
    "theirs": ["ventajas", "de", "ellos"]
  },
  "gaps_to_exploit": ["oportunidades", "donde", "puedes", "ganar"],
  "pricing_strategy": "análisis de pricing comparativo",
  "target_market_overlap": "porcentaje estimado de overlap",
  "differentiation_opportunities": ["formas", "de", "diferenciarte"],
  "weaknesses_to_attack": ["debilidades", "del", "competidor"],
  "recommended_positioning": "cómo posicionarte contra ellos",
  "sales_battle_cards": [
    {
      "objection": "objeción común del competidor",
      "response": "tu respuesta",
      "proof_points": ["puntos", "de", "prueba"]
    }
  ],
  "win_strategies": ["estrategias", "para", "ganar", "deals"]
}`

    let aiAnalysis = null
    try {
      const aiResponse = await analyzeWithDeepSeek(prompt)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      aiAnalysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: aiResponse }
    } catch (e) {
      console.error('Error parsing AI analysis:', e)
    }

    // Guardar análisis competitivo
    await pool.query(`
      INSERT INTO competitive_analysis (
        user_id, competitor_domain, your_domain,
        competitor_data, analysis_result, created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
    `, [
      req.user.id,
      competitorDomain,
      yourDomain,
      JSON.stringify(competitorData),
      JSON.stringify(aiAnalysis)
    ])

    res.json({
      success: true,
      competitor: competitorDomain,
      competitor_data: competitorData,
      your_data: yourData,
      competitive_analysis: aiAnalysis,
      recommendation: 'Usa las sales battle cards en tus conversaciones con prospectos'
    })

  } catch (error) {
    console.error('Error in competitive analysis:', error)
    res.status(500).json({
      success: false,
      message: 'Error en análisis competitivo',
      error: error.message
    })
  }
})

/**
 * 2. MONITOR DE PRECIOS DE COMPETIDORES
 * Rastrea cambios en precios de competidores
 */
router.post('/monitor-competitor-pricing', protect, async (req, res) => {
  try {
    const { competitorDomain, pricingPagePath = '/pricing' } = req.body

    const url = `https://${competitorDomain}${pricingPagePath}`

    const response = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 10000
    })

    const $ = cheerio.load(response.data)

    // Extraer precios usando múltiples métodos
    const prices = []

    // Método 1: Buscar elementos con símbolos de moneda
    $('*').each((i, elem) => {
      const text = $(elem).text()
      const priceMatches = text.match(/[$€£¥]\s*\d+(?:[.,]\d{2})?(?:\s*\/\s*\w+)?/g)
      if (priceMatches) {
        priceMatches.forEach(price => {
          prices.push({
            price: price.trim(),
            context: text.substring(0, 200),
            html: $(elem).html()?.substring(0, 200)
          })
        })
      }
    })

    // Método 2: Usar IA para extraer información de pricing
    const pageText = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 8000)

    const prompt = `Extrae toda la información de precios de la siguiente página de pricing:

${pageText}

Devuelve en JSON:
{
  "pricing_plans": [
    {
      "name": "nombre del plan",
      "price": "precio",
      "billing_period": "monthly/yearly/one-time",
      "features": ["feature1", "feature2"],
      "target_audience": "a quién va dirigido"
    }
  ],
  "has_free_trial": true/false,
  "trial_duration": "duración si existe",
  "money_back_guarantee": "información de garantía",
  "discounts": ["descuentos", "mencionados"],
  "add_ons": ["add-ons", "disponibles"],
  "enterprise_pricing": "información de pricing enterprise"
}`

    let pricingAnalysis = null
    try {
      const aiResponse = await analyzeWithDeepSeek(prompt)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      pricingAnalysis = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch (e) {
      console.error('Error parsing pricing analysis:', e)
    }

    // Comparar con precios anteriores
    const previousPricing = await pool.query(
      `SELECT pricing_data FROM competitor_pricing
       WHERE competitor_domain = $1 AND user_id = $2
       ORDER BY created_at DESC LIMIT 1`,
      [competitorDomain, req.user.id]
    )

    let priceChanges = []
    if (previousPricing.rows.length > 0) {
      priceChanges = detectPriceChanges(
        previousPricing.rows[0].pricing_data,
        pricingAnalysis
      )
    }

    // Guardar nuevo snapshot de precios
    await pool.query(`
      INSERT INTO competitor_pricing (
        user_id, competitor_domain, pricing_data,
        scraped_prices, price_changes, created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
    `, [
      req.user.id,
      competitorDomain,
      JSON.stringify(pricingAnalysis),
      JSON.stringify(prices),
      JSON.stringify(priceChanges)
    ])

    res.json({
      success: true,
      competitor: competitorDomain,
      pricing_analysis: pricingAnalysis,
      raw_prices: prices.slice(0, 10),
      price_changes: priceChanges,
      alert: priceChanges.length > 0 ? 'PRECIOS CAMBIADOS - Revisa tu estrategia' : null
    })

  } catch (error) {
    console.error('Error monitoring competitor pricing:', error)
    res.status(500).json({
      success: false,
      message: 'Error monitoreando precios',
      error: error.message
    })
  }
})

/**
 * 3. ANÁLISIS DE REVIEWS DE COMPETIDORES
 * Scrape y analiza reviews para encontrar pain points
 */
router.post('/analyze-competitor-reviews', protect, async (req, res) => {
  try {
    const { competitorName, sources = ['g2', 'capterra', 'trustpilot'] } = req.body

    const reviews = {
      g2: await scrapeG2Reviews(competitorName),
      capterra: await scrapeCapterraReviews(competitorName),
      trustpilot: await scrapeTrustpilotReviews(competitorName),
      total_reviews: 0,
      average_rating: 0,
      sentiment_breakdown: { positive: 0, neutral: 0, negative: 0 }
    }

    // Calcular totales
    const allReviews = [
      ...reviews.g2,
      ...reviews.capterra,
      ...reviews.trustpilot
    ]

    reviews.total_reviews = allReviews.length

    if (allReviews.length > 0) {
      reviews.average_rating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length

      // Análisis de sentimiento básico
      allReviews.forEach(review => {
        if (review.rating >= 4) reviews.sentiment_breakdown.positive++
        else if (review.rating >= 3) reviews.sentiment_breakdown.neutral++
        else reviews.sentiment_breakdown.negative++
      })
    }

    // Usar IA para análisis profundo de reviews
    const reviewTexts = allReviews.map(r => r.text).join('\n---\n')

    const prompt = `Analiza las siguientes reviews de clientes sobre un competidor:

REVIEWS:
${reviewTexts.substring(0, 10000)}

Extrae insights valiosos en JSON:
{
  "common_complaints": [
    {
      "issue": "problema común",
      "frequency": "high/medium/low",
      "severity": "critical/moderate/minor",
      "your_opportunity": "cómo puedes usar esto a tu favor"
    }
  ],
  "common_praises": ["cosas", "que", "hacen", "bien"],
  "feature_gaps": ["features", "que", "clientes", "piden", "pero", "no", "tienen"],
  "support_issues": ["problemas", "de", "soporte", "mencionados"],
  "pricing_complaints": ["quejas", "sobre", "precio"],
  "ideal_customer_profile": "tipo de cliente que les va mejor",
  "churn_signals": ["señales", "de", "por", "qué", "clientes", "se", "van"],
  "competitive_advantages_to_highlight": [
    {
      "their_weakness": "su debilidad",
      "your_strength": "tu fortaleza en ese aspecto",
      "pitch": "cómo pitchear esto"
    }
  ]
}`

    let aiInsights = null
    try {
      const aiResponse = await analyzeWithDeepSeek(prompt)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      aiInsights = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch (e) {
      console.error('Error parsing review insights:', e)
    }

    // Guardar análisis de reviews
    await pool.query(`
      INSERT INTO competitor_reviews_analysis (
        user_id, competitor_name, reviews_data,
        ai_insights, total_reviews, average_rating, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `, [
      req.user.id,
      competitorName,
      JSON.stringify(allReviews),
      JSON.stringify(aiInsights),
      reviews.total_reviews,
      reviews.average_rating
    ])

    res.json({
      success: true,
      competitor: competitorName,
      reviews_summary: {
        total: reviews.total_reviews,
        average_rating: reviews.average_rating.toFixed(2),
        sentiment: reviews.sentiment_breakdown
      },
      ai_insights: aiInsights,
      sample_reviews: allReviews.slice(0, 5),
      actionable_recommendation: 'Usa los common_complaints en tu pitch para destacar tus ventajas'
    })

  } catch (error) {
    console.error('Error analyzing competitor reviews:', error)
    res.status(500).json({
      success: false,
      message: 'Error analizando reviews',
      error: error.message
    })
  }
})

/**
 * 4. SCRAPING DE CASOS DE ÉXITO Y CLIENTES
 * Identifica clientes de competidores para targeting
 */
router.post('/scrape-competitor-customers', protect, async (req, res) => {
  try {
    const { competitorDomain } = req.body

    const customersData = {
      case_studies: [],
      client_logos: [],
      testimonials: [],
      partnerships: []
    }

    // Scrapear página de casos de éxito
    const caseStudiesUrls = [
      `https://${competitorDomain}/case-studies`,
      `https://${competitorDomain}/customers`,
      `https://${competitorDomain}/success-stories`,
      `https://${competitorDomain}/testimonials`
    ]

    for (const url of caseStudiesUrls) {
      try {
        const response = await axios.get(url, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          timeout: 10000
        })

        const $ = cheerio.load(response.data)

        // Extraer logos de clientes
        $('img[alt*="logo"], img[alt*="client"], img[alt*="customer"]').each((i, elem) => {
          const alt = $(elem).attr('alt')
          const src = $(elem).attr('src')
          if (alt && src) {
            customersData.client_logos.push({
              company: alt.replace(/logo|client|customer/gi, '').trim(),
              logo_url: src,
              source_page: url
            })
          }
        })

        // Extraer testimonios
        $('[class*="testimonial"], [class*="review"], [class*="quote"]').each((i, elem) => {
          const text = $(elem).text().trim()
          if (text.length > 50 && text.length < 500) {
            customersData.testimonials.push({
              text,
              source_page: url
            })
          }
        })

      } catch (e) {
        console.log(`Could not scrape ${url}:`, e.message)
      }
    }

    // Usar IA para extraer nombres de empresas de los testimonios
    if (customersData.testimonials.length > 0) {
      const testimonialsText = customersData.testimonials
        .map(t => t.text)
        .join('\n---\n')

      const prompt = `De los siguientes testimonios, extrae los nombres de las empresas/clientes mencionados:

${testimonialsText}

Devuelve en JSON:
{
  "companies": [
    {
      "name": "nombre empresa",
      "industry": "industria estimada",
      "company_size": "tamaño estimado"
    }
  ]
}`

      try {
        const aiResponse = await analyzeWithDeepSeek(prompt)
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
        const extractedCompanies = jsonMatch ? JSON.parse(jsonMatch[0]) : { companies: [] }
        customersData.case_studies = extractedCompanies.companies || []
      } catch (e) {
        console.error('Error extracting companies:', e)
      }
    }

    // Generar estrategia de targeting
    const targetingStrategy = await generateTargetingStrategy(customersData)

    res.json({
      success: true,
      competitor: competitorDomain,
      customers_data: customersData,
      total_identified: customersData.client_logos.length + customersData.case_studies.length,
      targeting_strategy: targetingStrategy,
      recommendation: 'Contacta a estos clientes con un pitch de "migration" o "alternative solution"'
    })

  } catch (error) {
    console.error('Error scraping competitor customers:', error)
    res.status(500).json({
      success: false,
      message: 'Error extrayendo clientes de competidor',
      error: error.message
    })
  }
})

/**
 * 5. ANÁLISIS DE CONTENIDO Y SEO DEL COMPETIDOR
 * Identifica oportunidades de contenido y SEO
 */
router.post('/analyze-competitor-content', protect, async (req, res) => {
  try {
    const { competitorDomain } = req.body

    const contentAnalysis = {
      blog_posts: [],
      keywords_targeted: [],
      content_gaps: [],
      top_pages: [],
      backlink_profile: {}
    }

    // Scrapear blog
    const blogUrls = [
      `https://${competitorDomain}/blog`,
      `https://${competitorDomain}/insights`,
      `https://${competitorDomain}/resources`
    ]

    for (const blogUrl of blogUrls) {
      try {
        const response = await axios.get(blogUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          timeout: 10000
        })

        const $ = cheerio.load(response.data)

        // Extraer artículos del blog
        $('article, [class*="post"], [class*="blog"]').each((i, elem) => {
          const title = $(elem).find('h1, h2, h3, [class*="title"]').first().text().trim()
          const excerpt = $(elem).find('p, [class*="excerpt"]').first().text().trim()
          const link = $(elem).find('a').first().attr('href')

          if (title && title.length > 10) {
            contentAnalysis.blog_posts.push({
              title,
              excerpt: excerpt.substring(0, 200),
              url: link?.startsWith('http') ? link : `https://${competitorDomain}${link}`,
              discovered_date: new Date().toISOString()
            })
          }
        })

      } catch (e) {
        console.log(`Could not scrape ${blogUrl}:`, e.message)
      }
    }

    // Analizar con IA para encontrar content gaps
    if (contentAnalysis.blog_posts.length > 0) {
      const blogTitles = contentAnalysis.blog_posts
        .map(p => p.title)
        .slice(0, 50)
        .join('\n')

      const prompt = `Analiza los siguientes títulos de blog de un competidor y sugiere oportunidades de contenido:

TÍTULOS DE BLOG DEL COMPETIDOR:
${blogTitles}

Genera en JSON:
{
  "content_themes": ["temas", "principales", "que", "cubren"],
  "keywords_they_target": ["keywords", "que", "parecen", "targetear"],
  "content_gaps": [
    {
      "topic": "tema que NO están cubriendo",
      "opportunity": "por qué es una oportunidad",
      "suggested_title": "título sugerido para tu contenido"
    }
  ],
  "content_improvement_opportunities": [
    {
      "their_topic": "su tema",
      "weakness": "qué les falta",
      "how_to_do_better": "cómo hacerlo mejor"
    }
  ],
  "content_frequency": "estimación de frecuencia de publicación",
  "content_quality_score": 1-10
}`

      try {
        const aiResponse = await analyzeWithDeepSeek(prompt)
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
        const contentInsights = jsonMatch ? JSON.parse(jsonMatch[0]) : {}

        contentAnalysis.keywords_targeted = contentInsights.keywords_they_target || []
        contentAnalysis.content_gaps = contentInsights.content_gaps || []
        contentAnalysis.content_insights = contentInsights
      } catch (e) {
        console.error('Error analyzing content:', e)
      }
    }

    // Guardar análisis de contenido
    await pool.query(`
      INSERT INTO competitor_content_analysis (
        user_id, competitor_domain, content_data,
        blog_posts_count, created_at
      ) VALUES ($1, $2, $3, $4, NOW())
    `, [
      req.user.id,
      competitorDomain,
      JSON.stringify(contentAnalysis),
      contentAnalysis.blog_posts.length
    ])

    res.json({
      success: true,
      competitor: competitorDomain,
      content_analysis: contentAnalysis,
      blog_posts_found: contentAnalysis.blog_posts.length,
      actionable_insights: contentAnalysis.content_gaps,
      recommendation: 'Crea contenido sobre los content gaps para rankear mejor'
    })

  } catch (error) {
    console.error('Error analyzing competitor content:', error)
    res.status(500).json({
      success: false,
      message: 'Error analizando contenido del competidor',
      error: error.message
    })
  }
})

// ==========================================
// HELPER FUNCTIONS
// ==========================================

async function scrapeCompetitorWebsite(domain) {
  try {
    const response = await axios.get(`https://${domain}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 10000
    })

    const $ = cheerio.load(response.data)

    return {
      domain,
      title: $('title').text(),
      description: $('meta[name="description"]').attr('content') || '',
      value_proposition: $('h1').first().text(),
      main_cta: $('button, a[class*="cta"], a[class*="button"]').first().text(),
      has_pricing_page: $('a[href*="pricing"]').length > 0,
      has_demo: $('a[href*="demo"], a[href*="trial"]').length > 0,
      social_proof_count: $('[class*="testimonial"], [class*="review"]').length,
      blog_presence: $('a[href*="blog"]').length > 0,
      tech_stack: detectBasicTech($, response.data),
      scraped_at: new Date().toISOString()
    }
  } catch (error) {
    return { domain, error: error.message, scraped_at: new Date().toISOString() }
  }
}

function detectBasicTech($, html) {
  const tech = []

  if (html.includes('shopify')) tech.push('Shopify')
  if (html.includes('wordpress') || html.includes('wp-content')) tech.push('WordPress')
  if (html.includes('react')) tech.push('React')
  if (html.includes('google-analytics')) tech.push('Google Analytics')
  if ($('script[src*="intercom"]').length > 0) tech.push('Intercom')
  if ($('script[src*="hubspot"]').length > 0) tech.push('HubSpot')

  return tech
}

function detectPriceChanges(oldPricing, newPricing) {
  const changes = []

  if (!oldPricing || !newPricing || !newPricing.pricing_plans) return changes

  // Comparar planes
  const oldPlans = oldPricing.pricing_plans || []
  const newPlans = newPricing.pricing_plans || []

  oldPlans.forEach(oldPlan => {
    const newPlan = newPlans.find(p => p.name === oldPlan.name)

    if (newPlan && newPlan.price !== oldPlan.price) {
      changes.push({
        plan: oldPlan.name,
        type: 'price_change',
        old_price: oldPlan.price,
        new_price: newPlan.price,
        detected_at: new Date().toISOString()
      })
    }
  })

  // Detectar nuevos planes
  newPlans.forEach(newPlan => {
    const existed = oldPlans.some(p => p.name === newPlan.name)
    if (!existed) {
      changes.push({
        plan: newPlan.name,
        type: 'new_plan',
        price: newPlan.price,
        detected_at: new Date().toISOString()
      })
    }
  })

  return changes
}

async function scrapeG2Reviews(productName) {
  // Simulación - en producción usar G2 API o scraping real
  return [
    {
      rating: 4,
      text: 'Great product but expensive. Customer support could be better.',
      author: 'Tech Manager',
      date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      source: 'G2'
    },
    {
      rating: 5,
      text: 'Love the features, very intuitive interface.',
      author: 'Product Manager',
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      source: 'G2'
    },
    {
      rating: 2,
      text: 'Buggy software, lots of issues. Switching to competitor.',
      author: 'CTO',
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      source: 'G2'
    }
  ]
}

async function scrapeCapterraReviews(productName) {
  // Simulación
  return [
    {
      rating: 3.5,
      text: 'Good for small businesses but lacks enterprise features.',
      author: 'Small Business Owner',
      date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      source: 'Capterra'
    }
  ]
}

async function scrapeTrustpilotReviews(productName) {
  // Simulación
  return [
    {
      rating: 4.5,
      text: 'Excellent customer service, product works well.',
      author: 'Enterprise User',
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      source: 'Trustpilot'
    }
  ]
}

async function generateTargetingStrategy(customersData) {
  const totalCustomers = customersData.client_logos.length + customersData.case_studies.length

  return {
    total_prospects_identified: totalCustomers,
    approach: 'Competitor Displacement',
    tactics: [
      {
        tactic: 'Direct Outreach',
        description: 'Contactar a clientes del competidor con pitch de migration',
        template: 'Veo que usas [Competitor]. Muchos de nuestros clientes migraron de allí y ahora ahorran un 30%...'
      },
      {
        tactic: 'Comparison Content',
        description: 'Crear contenido de "[Your Product] vs [Competitor]"',
        distribution: 'SEO, ads targeting competitor keywords'
      },
      {
        tactic: 'LinkedIn Targeting',
        description: 'Targetear empleados de estas empresas en LinkedIn Ads',
        targeting_params: 'Company names, job titles (CTO, VP Engineering)'
      }
    ],
    priority_targets: customersData.case_studies.slice(0, 10)
  }
}

// Crear tablas necesarias
const tables = [
  `CREATE TABLE IF NOT EXISTS competitive_analysis (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    competitor_domain VARCHAR(255),
    your_domain VARCHAR(255),
    competitor_data JSONB,
    analysis_result JSONB,
    created_at TIMESTAMP DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS competitor_pricing (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    competitor_domain VARCHAR(255),
    pricing_data JSONB,
    scraped_prices JSONB,
    price_changes JSONB,
    created_at TIMESTAMP DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS competitor_reviews_analysis (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    competitor_name VARCHAR(255),
    reviews_data JSONB,
    ai_insights JSONB,
    total_reviews INTEGER,
    average_rating DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS competitor_content_analysis (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    competitor_domain VARCHAR(255),
    content_data JSONB,
    blog_posts_count INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
  )`
]

tables.forEach(tableSQL => {
  pool.query(tableSQL).catch(err => console.error('Error creating table:', err))
})

export default router
