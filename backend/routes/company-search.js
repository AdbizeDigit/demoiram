import express from 'express'
import { protect } from '../middleware/auth.js'
import axios from 'axios'
import { pool } from '../config/database.js'

const router = express.Router()

// Mapeo de países a coordenadas centrales
const countryCoords = {
  'argentina': { lat: -38.4161, lng: -63.6167, name: 'Argentina' },
  'chile': { lat: -35.6751, lng: -71.5430, name: 'Chile' },
  'colombia': { lat: 4.5709, lng: -74.2973, name: 'Colombia' },
  'méxico': { lat: 23.6345, lng: -102.5528, name: 'México' },
  'mexico': { lat: 23.6345, lng: -102.5528, name: 'México' },
  'españa': { lat: 40.4637, lng: -3.7492, name: 'España' },
  'brasil': { lat: -14.2350, lng: -51.9253, name: 'Brasil' },
  'perú': { lat: -9.1900, lng: -75.0152, name: 'Perú' },
  'peru': { lat: -9.1900, lng: -75.0152, name: 'Perú' },
  'venezuela': { lat: 6.4238, lng: -66.5897, name: 'Venezuela' },
}

// Endpoint para buscar empresas por país
router.post('/search-companies', protect, async (req, res) => {
  try {
    const user = req.user

    if (!user || user.email !== 'contacto@adbize.com') {
      return res.status(403).json({ message: 'No autorizado' })
    }

    const { country, limit = 30 } = req.body

    if (!country) {
      return res.status(400).json({ error: 'País es requerido' })
    }

    const countryKey = country.toLowerCase().trim()
    const countryInfo = countryCoords[countryKey]

    if (!countryInfo) {
      return res.status(400).json({ error: 'País no soportado' })
    }

    // Consultar empresas ya guardadas en la BD
    const existingQuery = `
      SELECT id, company_name, website, email, phone, location, country, 
             latitude, longitude, industry, description, search_date
      FROM companies
      WHERE country = $1
      ORDER BY search_date DESC
      LIMIT $2
    `
    const existingResult = await pool.query(existingQuery, [countryInfo.name, limit])
    const existingCompanies = existingResult.rows

    // Si tenemos empresas guardadas, devolverlas
    if (existingCompanies.length > 0) {
      return res.json({
        source: 'database',
        country: countryInfo.name,
        companies: existingCompanies,
        count: existingCompanies.length,
        message: 'Empresas recuperadas de la base de datos'
      })
    }

    // Si no hay empresas guardadas, buscar en noticias y extraer empresas
    const newsApiKey = process.env.NEWS_API_KEY
    const allCompanies = []

    if (newsApiKey) {
      try {
        const url = 'https://newsapi.org/v2/everything'
        const params = {
          q: `empresas startups negocios ${countryInfo.name}`,
          language: 'es',
          pageSize: 50,
          sortBy: 'publishedAt',
          apiKey: newsApiKey
        }
        const resp = await axios.get(url, { params, timeout: 8000 })
        const articles = resp.data.articles || []

        // Extraer empresas de los artículos
        for (const article of articles) {
          // Generar datos de empresa basados en el artículo
          const company = {
            company_name: extractCompanyName(article.title),
            website: extractWebsite(article.url),
            email: generateEmail(extractCompanyName(article.title)),
            phone: generatePhone(countryInfo.name),
            location: countryInfo.name,
            country: countryInfo.name,
            latitude: countryInfo.lat + (Math.random() - 0.5) * 2, // Variación aleatoria
            longitude: countryInfo.lng + (Math.random() - 0.5) * 2,
            industry: extractIndustry(article.title + ' ' + (article.description || '')),
            description: article.description || article.title,
            source: article.source?.name || 'NewsAPI',
            article_url: article.url
          }

          // Guardar en BD
          const insertQuery = `
            INSERT INTO companies 
            (company_name, website, email, phone, location, country, latitude, longitude, industry, description, search_date)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
            RETURNING id, company_name, website, email, phone, location, country, latitude, longitude, industry, description, search_date
          `
          const insertResult = await pool.query(insertQuery, [
            company.company_name,
            company.website,
            company.email,
            company.phone,
            company.location,
            company.country,
            company.latitude,
            company.longitude,
            company.industry,
            company.description
          ])

          if (insertResult.rows.length > 0) {
            allCompanies.push(insertResult.rows[0])
          }
        }
      } catch (e) {
        console.error('Error buscando empresas:', e.message)
      }
    }

    res.json({
      source: 'search',
      country: countryInfo.name,
      companies: allCompanies,
      count: allCompanies.length,
      message: `Se encontraron ${allCompanies.length} empresas en ${countryInfo.name}`
    })
  } catch (err) {
    console.error('Error en search-companies:', err)
    res.status(500).json({ error: 'Error al buscar empresas' })
  }
})

// Funciones auxiliares para extraer información
function extractCompanyName(text) {
  // Extraer nombre de empresa del título
  const words = text.split(' ')
  return words.slice(0, 3).join(' ') || 'Empresa'
}

function extractWebsite(url) {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname
  } catch {
    return 'www.empresa.com'
  }
}

function generateEmail(companyName) {
  const domain = companyName.toLowerCase().replace(/\s+/g, '')
  return `info@${domain}.com`
}

function generatePhone(country) {
  const countryPhones = {
    'Argentina': '+54 11 XXXX-XXXX',
    'Chile': '+56 2 XXXX-XXXX',
    'Colombia': '+57 1 XXXX-XXXX',
    'México': '+52 55 XXXX-XXXX',
    'España': '+34 91 XXXX-XXXX',
    'Brasil': '+55 11 XXXX-XXXX',
    'Perú': '+51 1 XXXX-XXXX',
    'Venezuela': '+58 212 XXXX-XXXX'
  }
  return countryPhones[country] || '+XX XXX-XXXX'
}

function extractIndustry(text) {
  const industries = ['Tech', 'Fintech', 'E-commerce', 'SaaS', 'AI', 'Blockchain', 'Healthcare', 'Educación']
  for (const industry of industries) {
    if (text.toLowerCase().includes(industry.toLowerCase())) {
      return industry
    }
  }
  return 'Tecnología'
}

export default router
