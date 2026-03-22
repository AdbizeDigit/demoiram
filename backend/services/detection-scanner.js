import { pool } from '../config/database.js'
import { analyzeWithDeepSeek } from './deepseek.js'
import axios from 'axios'
import * as cheerio from 'cheerio'

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15'
]

const RELEVANCE_KEYWORDS = [
  'desarrollo web', 'aplicacion movil', 'app movil', 'inteligencia artificial',
  'machine learning', 'llm', 'chatbot', 'automatizacion', 'transformacion digital',
  'software a medida', 'desarrollo de software', 'saas', 'plataforma digital',
  'api', 'microservicios', 'cloud', 'nube', 'devops', 'startup',
  'fintech', 'healthtech', 'edtech', 'proptech', 'licitacion tecnologia',
  'modernizacion', 'digitalizacion', 'ecommerce', 'comercio electronico',
  'deep learning', 'modelo predictivo', 'vision artificial', 'nlp',
  'procesamiento lenguaje natural', 'data science', 'ciencia de datos',
  'nearshoring tecnologia', 'outsourcing desarrollo', 'agente ia',
  'empresa tecnologia', 'inversion tecnologia', 'gobierno digital'
]

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

class OpportunityScannerService {
  constructor() {
    this.isScanning = false
    this.autoScanInterval = null
    this.lastScanAt = null
    this.scanCount = 0
  }

  static getInstance() {
    if (!OpportunityScannerService._instance) {
      OpportunityScannerService._instance = new OpportunityScannerService()
    }
    return OpportunityScannerService._instance
  }

  async runFullScan() {
    if (this.isScanning) {
      return { success: false, message: 'Ya hay un escaneo en progreso' }
    }

    this.isScanning = true
    let scanLogId = null

    try {
      // 1. Create scan log entry
      const logResult = await pool.query(
        `INSERT INTO detection_scan_logs (status) VALUES ('RUNNING') RETURNING id`
      )
      scanLogId = logResult.rows[0].id

      // 2. Get enabled sources
      const sourcesResult = await pool.query(
        'SELECT * FROM detection_sources WHERE enabled = true'
      )
      const sources = sourcesResult.rows

      let totalArticlesFound = 0
      let totalOpportunitiesCreated = 0

      // 3. For each source, fetch articles
      for (const source of sources) {
        try {
          let articles = []

          if (source.type === 'RSS') {
            articles = await this.fetchRSSArticles(source)
          } else if (source.type === 'DUCKDUCKGO') {
            articles = await this.fetchDuckDuckGoArticles(source)
          }

          // 4. Deduplicate by URL (INSERT ... ON CONFLICT DO NOTHING)
          let insertedCount = 0
          for (const article of articles) {
            try {
              const insertResult = await pool.query(
                `INSERT INTO news_articles (title, url, snippet, source_name, source_type, published_at)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (url) DO NOTHING
                 RETURNING id`,
                [
                  article.title?.substring(0, 500) || 'Sin título',
                  article.url,
                  article.snippet?.substring(0, 2000) || '',
                  source.name,
                  source.type,
                  article.publishedAt || null
                ]
              )
              if (insertResult.rows.length > 0) {
                insertedCount++
              }
            } catch (insertErr) {
              console.error(`Error inserting article: ${insertErr.message}`)
            }
          }

          totalArticlesFound += insertedCount

          // Update source stats
          await pool.query(
            `UPDATE detection_sources
             SET last_run_at = NOW(), last_run_articles = $1, last_run_error = NULL,
                 total_articles = total_articles + $1, updated_at = NOW()
             WHERE id = $2`,
            [insertedCount, source.id]
          )

          console.log(`📡 ${source.name}: ${insertedCount} nuevos artículos de ${articles.length} encontrados`)
        } catch (sourceErr) {
          console.error(`Error fetching from ${source.name}:`, sourceErr.message)
          await pool.query(
            `UPDATE detection_sources SET last_run_at = NOW(), last_run_error = $1, updated_at = NOW() WHERE id = $2`,
            [sourceErr.message, source.id]
          )
        }
      }

      // 5. Analyze unanalyzed articles with DeepSeek (max 20 per scan)
      const unanalyzedResult = await pool.query(
        `SELECT * FROM news_articles WHERE analyzed = false ORDER BY fetched_at DESC LIMIT 20`
      )

      for (const article of unanalyzedResult.rows) {
        try {
          const analysis = await this.analyzeArticle(article)

          await pool.query(
            `UPDATE news_articles
             SET analyzed = true, relevance_score = $1, opportunity_type = $2,
                 ai_summary = $3, company_mentioned = $4, location_mentioned = $5, priority = $6
             WHERE id = $7`,
            [
              analysis.relevanceScore,
              analysis.opportunityType,
              analysis.summary,
              analysis.companyMentioned,
              analysis.locationMentioned,
              analysis.priority,
              article.id
            ]
          )

          // 6. Create opportunities for articles with score >= 50
          if (analysis.relevant && analysis.relevanceScore >= 50) {
            const oppResult = await pool.query(
              `INSERT INTO detected_opportunities (title, summary, relevance_score, opportunity_type, priority, company_mentioned, location_mentioned)
               VALUES ($1, $2, $3, $4, $5, $6, $7)
               RETURNING id`,
              [
                article.title,
                analysis.summary,
                analysis.relevanceScore,
                analysis.opportunityType,
                analysis.priority,
                analysis.companyMentioned,
                analysis.locationMentioned
              ]
            )

            // Link article to opportunity
            await pool.query(
              'UPDATE news_articles SET opportunity_id = $1 WHERE id = $2',
              [oppResult.rows[0].id, article.id]
            )

            totalOpportunitiesCreated++
          }
        } catch (analysisErr) {
          console.error(`Error analyzing article ${article.id}:`, analysisErr.message)
          // Mark as analyzed to avoid retrying forever
          await pool.query(
            'UPDATE news_articles SET analyzed = true, ai_summary = $1 WHERE id = $2',
            [`Error en análisis: ${analysisErr.message}`, article.id]
          )
        }
      }

      // 7. Update scan log
      await pool.query(
        `UPDATE detection_scan_logs
         SET completed_at = NOW(), status = 'COMPLETED', sources_scanned = $1,
             articles_found = $2, opportunities_created = $3
         WHERE id = $4`,
        [sources.length, totalArticlesFound, totalOpportunitiesCreated, scanLogId]
      )

      this.lastScanAt = new Date()
      this.scanCount++
      this.isScanning = false

      return {
        success: true,
        sourcesScanned: sources.length,
        articlesFound: totalArticlesFound,
        opportunitiesCreated: totalOpportunitiesCreated,
        scanLogId
      }
    } catch (error) {
      console.error('Error in full scan:', error.message)
      this.isScanning = false

      if (scanLogId) {
        await pool.query(
          `UPDATE detection_scan_logs SET completed_at = NOW(), status = 'ERROR', error_message = $1 WHERE id = $2`,
          [error.message, scanLogId]
        ).catch(() => {})
      }

      return { success: false, message: error.message }
    }
  }

  async fetchRSSArticles(source) {
    const articles = []
    const config = typeof source.config === 'string' ? JSON.parse(source.config) : source.config
    const feedUrl = config.url

    if (!feedUrl) {
      console.warn(`No URL configured for source: ${source.name}`)
      return articles
    }

    try {
      const response = await axios.get(feedUrl, {
        headers: { 'User-Agent': getRandomUserAgent() },
        timeout: 15000,
        maxRedirects: 5
      })

      const $ = cheerio.load(response.data, { xmlMode: true })

      // Try RSS 2.0 format
      $('item').each((i, item) => {
        const title = $(item).find('title').first().text().trim()
        const link = $(item).find('link').first().text().trim()
        const description = $(item).find('description').first().text().trim()
        const pubDate = $(item).find('pubDate').first().text().trim()

        if (title && link) {
          articles.push({
            title,
            url: link,
            snippet: description ? cheerio.load(description).text().substring(0, 2000) : '',
            publishedAt: pubDate ? new Date(pubDate) : null
          })
        }
      })

      // Try Atom format if no items found
      if (articles.length === 0) {
        $('entry').each((i, entry) => {
          const title = $(entry).find('title').first().text().trim()
          const link = $(entry).find('link').attr('href') || $(entry).find('link').first().text().trim()
          const summary = $(entry).find('summary').first().text().trim() || $(entry).find('content').first().text().trim()
          const published = $(entry).find('published').first().text().trim() || $(entry).find('updated').first().text().trim()

          if (title && link) {
            articles.push({
              title,
              url: link,
              snippet: summary ? cheerio.load(summary).text().substring(0, 2000) : '',
              publishedAt: published ? new Date(published) : null
            })
          }
        })
      }
    } catch (error) {
      console.error(`Error fetching RSS from ${source.name}:`, error.message)
      throw error
    }

    return articles
  }

  async fetchDuckDuckGoArticles(source) {
    const articles = []
    const config = typeof source.config === 'string' ? JSON.parse(source.config) : source.config
    const keywords = config.keywords || [
      'licitacion desarrollo software mexico 2026',
      'empresa necesita app movil desarrollo web mexico',
      'inteligencia artificial machine learning empresas mexico',
      'transformacion digital automatizacion empresas latinoamerica',
      'chatbot IA empresa atencion cliente mexico',
      'nearshoring desarrollo software mexico',
      'startup busca desarrollo aplicacion movil',
      'gobierno digital licitacion plataforma tecnologia mexico',
      'ecommerce plataforma digital desarrollo mexico',
      'deep learning vision artificial proyecto mexico'
    ]

    for (const keyword of keywords) {
      try {
        const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(keyword)}`

        const response = await axios.get(searchUrl, {
          headers: {
            'User-Agent': getRandomUserAgent(),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'es-MX,es;q=0.9,en;q=0.5'
          },
          timeout: 15000
        })

        const $ = cheerio.load(response.data)

        $('.result').each((i, result) => {
          const titleEl = $(result).find('.result__title a')
          const title = titleEl.text().trim()
          let link = titleEl.attr('href') || ''
          const snippet = $(result).find('.result__snippet').text().trim()

          // DuckDuckGo wraps URLs in redirects, extract actual URL
          if (link.includes('uddg=')) {
            try {
              const urlParam = new URL(link, 'https://duckduckgo.com').searchParams.get('uddg')
              if (urlParam) link = urlParam
            } catch (e) {
              // Keep original link
            }
          }

          if (title && link && link.startsWith('http')) {
            articles.push({
              title,
              url: link,
              snippet: snippet.substring(0, 2000),
              publishedAt: null
            })
          }
        })

        // Delay between searches to avoid rate limiting
        await sleep(2000)
      } catch (error) {
        console.error(`Error searching DuckDuckGo for "${keyword}":`, error.message)
      }
    }

    return articles
  }

  async analyzeArticle(article) {
    const textToAnalyze = `Título: ${article.title}\n\nDescripción: ${article.snippet || 'No disponible'}`

    try {
      const systemPrompt = `Eres un analista de inteligencia comercial para Adbize, una empresa de desarrollo de software y tecnología en México. Adbize ofrece estos servicios:
- Desarrollo de aplicaciones web (React, Node.js, full-stack)
- Desarrollo de aplicaciones móviles (iOS, Android, React Native)
- Inteligencia Artificial y Machine Learning (modelos predictivos, visión artificial, NLP)
- Chatbots personalizados con IA/LLM
- Automatización de procesos con IA
- Plataformas SaaS y ecommerce
- Ciencia de datos y analytics
- Agentes de IA y soluciones con LLMs

Analiza el siguiente artículo y determina si representa una OPORTUNIDAD DE VENTA de servicios tecnológicos para Adbize.

Criterios de puntuación:
- 90-100: Oportunidad directa (licitación de software, empresa buscando desarrollador de apps/IA)
- 70-89: Oportunidad clara (empresa en transformación digital, startup necesitando plataforma)
- 50-69: Señal interesante (empresa creciendo que podría necesitar tecnología, nearshoring tech)
- 30-49: Remotamente relevante (noticias generales del sector tech)
- 0-29: No relevante para servicios de tecnología

Responde SOLO con JSON válido, sin markdown ni texto adicional:
{"relevant":bool,"relevanceScore":int,"opportunityType":"APP_WEB|APP_MOVIL|IA_ML|CHATBOT_LLM|AUTOMATIZACION|ECOMMERCE|LICITACION_TECH|NEARSHORING_TECH|TRANSFORMACION_DIGITAL|OTRO","priority":"ALTA|MEDIA|BAJA","summary":"resumen breve de la oportunidad para Adbize","companyMentioned":"nombre de empresa o null","locationMentioned":"ubicación o null"}`

      const prompt = `${systemPrompt}\n\nArtículo a analizar:\n${textToAnalyze}`
      const response = await analyzeWithDeepSeek(prompt)

      // Parse JSON response
      let analysis
      try {
        // Try to extract JSON from response (in case there's extra text)
        const jsonMatch = response.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0])
        } else {
          throw new Error('No JSON found in response')
        }
      } catch (parseErr) {
        console.warn('Could not parse DeepSeek response, falling back to keyword scoring')
        return this.keywordBasedScoring(article)
      }

      return {
        relevant: analysis.relevant || false,
        relevanceScore: Math.min(100, Math.max(0, analysis.relevanceScore || 0)),
        opportunityType: analysis.opportunityType || 'OTRO',
        priority: analysis.priority || 'BAJA',
        summary: analysis.summary || '',
        companyMentioned: analysis.companyMentioned || null,
        locationMentioned: analysis.locationMentioned || null
      }
    } catch (error) {
      console.warn(`DeepSeek analysis failed for article ${article.id}, using keyword fallback:`, error.message)
      return this.keywordBasedScoring(article)
    }
  }

  keywordBasedScoring(article) {
    const text = `${article.title} ${article.snippet || ''}`.toLowerCase()
    let score = 0
    const matchedKeywords = []

    for (const keyword of RELEVANCE_KEYWORDS) {
      if (text.includes(keyword)) {
        score += 8
        matchedKeywords.push(keyword)
      }
    }

    // High-value keyword bonuses
    if (text.includes('licitacion') || text.includes('licitación')) score += 20
    if (text.includes('desarrollo de software') || text.includes('desarrollo software')) score += 18
    if (text.includes('inteligencia artificial') || text.includes('machine learning')) score += 18
    if (text.includes('app movil') || text.includes('aplicacion movil') || text.includes('aplicación móvil')) score += 15
    if (text.includes('chatbot') || text.includes('llm') || text.includes('agente ia')) score += 15
    if (text.includes('desarrollo web') || text.includes('plataforma digital')) score += 12
    if (text.includes('automatizacion') || text.includes('automatización')) score += 12
    if (text.includes('nearshoring') && (text.includes('software') || text.includes('tecnolog'))) score += 15
    if (text.includes('ecommerce') || text.includes('comercio electrónico')) score += 10
    if (text.includes('transformacion digital') || text.includes('transformación digital')) score += 12

    score = Math.min(100, score)

    let priority = 'BAJA'
    if (score >= 70) priority = 'ALTA'
    else if (score >= 50) priority = 'MEDIA'

    let opportunityType = 'OTRO'
    if (text.includes('licitacion') || text.includes('licitación')) opportunityType = 'LICITACION_TECH'
    else if (text.includes('app movil') || text.includes('aplicacion movil') || text.includes('mobile')) opportunityType = 'APP_MOVIL'
    else if (text.includes('desarrollo web') || text.includes('plataforma') || text.includes('saas')) opportunityType = 'APP_WEB'
    else if (text.includes('inteligencia artificial') || text.includes('machine learning') || text.includes('deep learning')) opportunityType = 'IA_ML'
    else if (text.includes('chatbot') || text.includes('llm') || text.includes('agente ia')) opportunityType = 'CHATBOT_LLM'
    else if (text.includes('automatizacion') || text.includes('automatización')) opportunityType = 'AUTOMATIZACION'
    else if (text.includes('ecommerce') || text.includes('comercio electr')) opportunityType = 'ECOMMERCE'
    else if (text.includes('nearshoring')) opportunityType = 'NEARSHORING_TECH'
    else if (text.includes('transformacion digital') || text.includes('digitalizacion')) opportunityType = 'TRANSFORMACION_DIGITAL'

    return {
      relevant: score >= 50,
      relevanceScore: score,
      opportunityType,
      priority,
      summary: `Análisis por keywords: ${matchedKeywords.join(', ') || 'sin coincidencias relevantes'}`,
      companyMentioned: null,
      locationMentioned: null
    }
  }

  startAutoScan(intervalMinutes = 60) {
    if (this.autoScanInterval) {
      return { success: false, message: 'Auto-scan ya está activo' }
    }

    this.autoScanInterval = setInterval(() => {
      console.log('🔄 Auto-scan triggered')
      this.runFullScan().catch(err => console.error('Auto-scan error:', err.message))
    }, intervalMinutes * 60 * 1000)

    console.log(`🤖 Auto-scan iniciado cada ${intervalMinutes} minutos`)
    return { success: true, intervalMinutes }
  }

  stopAutoScan() {
    if (!this.autoScanInterval) {
      return { success: false, message: 'Auto-scan no está activo' }
    }

    clearInterval(this.autoScanInterval)
    this.autoScanInterval = null
    console.log('🛑 Auto-scan detenido')
    return { success: true }
  }

  getScanStatus() {
    return {
      isScanning: this.isScanning,
      autoScanActive: !!this.autoScanInterval,
      lastScanAt: this.lastScanAt,
      totalScansRun: this.scanCount
    }
  }
}

export default OpportunityScannerService
