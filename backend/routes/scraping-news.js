import express from 'express'
import { protect } from '../middleware/auth.js'
import axios from 'axios'

const router = express.Router()

// Normalizar URL removiendo parámetros
const normalizeUrl = (url) => {
  try {
    return url.split('?')[0]
  } catch (e) {
    return url
  }
}

// Mapeo de países a códigos ISO
const countryMap = {
  'argentina': 'ar',
  'ar': 'ar',
  'chile': 'cl',
  'cl': 'cl',
  'colombia': 'co',
  'co': 'co',
  'méxico': 'mx',
  'mexico': 'mx',
  'mx': 'mx',
  'españa': 'es',
  'es': 'es',
  'brasil': 'br',
  'br': 'br',
  'perú': 'pe',
  'peru': 'pe',
  'pe': 'pe',
  'venezuela': 've',
  've': 've',
  'ecuador': 'ec',
  'ec': 'ec',
  'bolivia': 'bo',
  'bo': 'bo',
  'paraguay': 'py',
  'py': 'py',
  'uruguay': 'uy',
  'uy': 'uy'
}

// Endpoint para buscar noticias y potenciales clientes
router.post('/news-search', protect, async (req, res) => {
  try {
    const user = req.user

    if (!user || user.email !== 'contacto@adbize.com') {
      return res.status(403).json({ message: 'No autorizado para usar búsqueda de noticias' })
    }

    const { query, location, languages = ['es'], countries = ['ar'], limit = 30 } = req.body

    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'query es requerido' })
    }

    // Si se proporciona ubicación, usarla para determinar el país
    let searchCountries = countries
    if (location) {
      const countryKey = location.toLowerCase().trim()
      const countryCode = countryMap[countryKey]
      if (countryCode) {
        searchCountries = [countryCode]
      }
    }

    const newsApiKey = process.env.NEWS_API_KEY
    const gnewsKey = process.env.GNEWS_API_KEY
    const newsdataKey = process.env.NEWSDATA_API_KEY

    const allArticles = []
    const sourcesMeta = {
      newsapi: { count: 0, error: null },
      gnews: { count: 0, error: null },
      newsdata: { count: 0, error: null }
    }

    // --- NewsAPI.org ---
    if (newsApiKey) {
      try {
        const url = 'https://newsapi.org/v2/everything'
        const params = {
          q: query,
          language: languages[0] || 'es',
          pageSize: Math.min(limit, 50),
          sortBy: 'publishedAt',
          apiKey: newsApiKey
        }
        const resp = await axios.get(url, { params, timeout: 8000 })
        const articles = resp.data.articles || []

        for (const art of articles) {
          allArticles.push({
            source: art.source?.name || 'NewsAPI',
            title: art.title,
            url: normalizeUrl(art.url),
            published_at: art.publishedAt,
            description: art.description,
            content_preview: (art.content || '').substring(0, 400),
            image: art.urlToImage,
            api: 'newsapi'
          })
        }
        sourcesMeta.newsapi.count = articles.length
      } catch (e) {
        sourcesMeta.newsapi.error = e.message
        console.error('NewsAPI error:', e.message)
      }
    }

    // --- GNews.io ---
    if (gnewsKey) {
      try {
        const url = 'https://gnews.io/api/v4/search'
        const params = {
          q: query,
          lang: languages[0] || 'en',
          country: countries[0] || 'us',
          max: Math.min(limit, 20),
          apikey: gnewsKey
        }
        const resp = await axios.get(url, { params, timeout: 8000 })
        const articles = resp.data.articles || []

        for (const art of articles) {
          allArticles.push({
            source: art.source?.name || 'GNews',
            title: art.title,
            url: normalizeUrl(art.url),
            published_at: art.publishedAt,
            description: art.description,
            content_preview: (art.content || '').substring(0, 400),
            image: art.image,
            api: 'gnews'
          })
        }
        sourcesMeta.gnews.count = articles.length
      } catch (e) {
        sourcesMeta.gnews.error = e.message
        console.error('GNews error:', e.message)
      }
    }

    // --- Newsdata.io ---
    if (newsdataKey) {
      try {
        const url = 'https://newsdata.io/api/1/news'
        const params = {
          apikey: newsdataKey,
          q: query,
          language: languages[0] || 'en',
          country: countries[0] || 'us',
          page: 1
        }
        const resp = await axios.get(url, { params, timeout: 8000 })
        const articles = resp.data.results || []

        for (const art of articles) {
          allArticles.push({
            source: art.source_id || 'Newsdata',
            title: art.title,
            url: normalizeUrl(art.link),
            published_at: art.pubDate,
            description: art.description,
            content_preview: (art.content || '').substring(0, 400),
            image: art.image_url,
            api: 'newsdata'
          })
        }
        sourcesMeta.newsdata.count = articles.length
      } catch (e) {
        sourcesMeta.newsdata.error = e.message
        console.error('Newsdata error:', e.message)
      }
    }

    // Deduplicar por URL
    const seenUrls = new Set()
    const deduped = []
    for (const art of allArticles) {
      const url = art.url
      if (!url || seenUrls.has(url)) continue
      seenUrls.add(url)
      deduped.push(art)
    }

    // Limitar resultado total
    const results = deduped.slice(0, limit)

    // Extraer empresas mencionadas (palabras clave)
    const extractCompanies = (articles) => {
      const companies = new Map()
      const keywords = ['Series B', 'Series A', 'funding', 'investment', 'acquired', 'partnership', 'launch', 'AI', 'automation', 'cloud', 'data']

      for (const art of articles) {
        const text = `${art.title} ${art.description}`.toLowerCase()
        for (const keyword of keywords) {
          if (text.includes(keyword.toLowerCase())) {
            if (!companies.has(keyword)) {
              companies.set(keyword, { keyword, count: 0, articles: [] })
            }
            const entry = companies.get(keyword)
            entry.count += 1
            if (entry.articles.length < 3) {
              entry.articles.push({
                title: art.title,
                url: art.url,
                source: art.source
              })
            }
          }
        }
      }

      return Array.from(companies.values()).sort((a, b) => b.count - a.count).slice(0, 10)
    }

    const topKeywords = extractCompanies(results)

    return res.json({
      status: 'success',
      query,
      articles: results,
      total: results.length,
      sources: sourcesMeta,
      topKeywords,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('News search error:', error)
    return res.status(500).json({ error: error.message })
  }
})

export default router
