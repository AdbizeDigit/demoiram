import express from 'express'
import { protect } from '../middleware/auth.js'
import axios from 'axios'
import * as cheerio from 'cheerio'

const router = express.Router()

// Helper function para extraer datos de contacto de texto (mejorado)
function extractContactInfo(text, companyDomain = null) {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g
  const websiteRegex = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?)/g
  const linkedinRegex = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:company|in)\/([a-zA-Z0-9-]+)/g

  const emails = text.match(emailRegex) || []
  const phones = text.match(phoneRegex) || []
  const websites = text.match(websiteRegex) || []
  const linkedinMatches = text.match(linkedinRegex) || []

  // Filtrar emails no válidos (no-reply, info genéricos, etc.)
  const validEmails = emails.filter(email => {
    const lower = email.toLowerCase()
    return !lower.includes('noreply') &&
           !lower.includes('no-reply') &&
           !lower.includes('mailer-daemon') &&
           !lower.includes('postmaster')
  })

  // Priorizar emails del dominio de la empresa si se proporciona
  let sortedEmails = validEmails
  if (companyDomain) {
    sortedEmails = validEmails.sort((a, b) => {
      const aDomain = a.includes(companyDomain) ? 1 : 0
      const bDomain = b.includes(companyDomain) ? 1 : 0
      return bDomain - aDomain
    })
  }

  // Filtrar números de teléfono válidos (mínimo 7 dígitos)
  const validPhones = phones.filter(phone => {
    const digits = phone.replace(/\D/g, '')
    return digits.length >= 7 && digits.length <= 15
  })

  return {
    emails: [...new Set(sortedEmails)].slice(0, 5),
    phones: [...new Set(validPhones)].slice(0, 3),
    websites: [...new Set(websites)].slice(0, 3),
    linkedin: [...new Set(linkedinMatches)].slice(0, 2)
  }
}

// Generar emails corporativos probables basados en patrones comunes
function generateProbableEmails(firstName, lastName, companyDomain) {
  if (!firstName || !companyDomain) return []

  const first = firstName.toLowerCase().replace(/\s/g, '')
  const last = lastName ? lastName.toLowerCase().replace(/\s/g, '') : ''
  const domain = companyDomain.replace(/^www\./, '')

  const patterns = [
    `${first}@${domain}`,
    `${first}.${last}@${domain}`,
    `${first[0]}${last}@${domain}`,
    `${first}_${last}@${domain}`,
    `${first}-${last}@${domain}`,
    `${last}.${first}@${domain}`
  ]

  return patterns.filter(Boolean)
}

// Extraer información de decisores (títulos ejecutivos)
function extractDecisionMakers(text) {
  const executiveTitles = [
    'CEO', 'CTO', 'CIO', 'CFO', 'COO', 'CMO', 'CDO',
    'Founder', 'Co-Founder', 'President', 'VP', 'Director',
    'Head of', 'Chief', 'Manager', 'Lead'
  ]

  const decisionMakers = []
  const titleRegex = new RegExp(`(${executiveTitles.join('|')})`, 'gi')

  if (titleRegex.test(text)) {
    // Intentar extraer nombre + título
    const namePattern = /([A-Z][a-z]+ [A-Z][a-z]+),?\s*(CEO|CTO|CIO|CFO|COO|CMO|CDO|Founder|Co-Founder|President|VP|Director|Head of [A-Za-z]+)/gi
    const matches = text.matchAll(namePattern)

    for (const match of matches) {
      decisionMakers.push({
        name: match[1],
        title: match[2],
        isDecisionMaker: true
      })
    }
  }

  return decisionMakers
}

// 1. BÚSQUEDA DE POTENCIALES NEGOCIOS (Simulación de búsqueda en redes sociales)
router.post('/search-potential-clients', protect, async (req, res) => {
  try {
    const { service, location, limit = 10 } = req.body

    // Simular búsqueda de posts/personas buscando servicios
    const searchQueries = [
      `busco ${service} ${location}`,
      `necesito ${service} ${location}`,
      `contratar ${service} ${location}`,
      `recomendaciones ${service} ${location}`
    ]

    const results = []

    // Simulación de resultados (en producción usarías APIs de redes sociales)
    const mockPosts = [
      {
        platform: 'LinkedIn',
        author: 'María González',
        title: 'CEO en TechStart Solutions',
        content: `Buscamos urgente ${service} para nuestro proyecto de transformación digital. Empresa en crecimiento en ${location}.`,
        date: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        profile: 'https://linkedin.com/in/maria-gonzalez',
        contact: {
          email: 'maria.gonzalez@techstart.com',
          company: 'TechStart Solutions',
          position: 'CEO'
        }
      },
      {
        platform: 'Twitter',
        author: 'Carlos Ramírez',
        title: 'CTO en InnovateLabs',
        content: `Necesitamos contratar ${service} ASAP. Proyectos interesantes en ${location}. DM abiertos.`,
        date: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000),
        profile: 'https://twitter.com/carlos_ramirez',
        contact: {
          email: 'carlos@innovatelabs.io',
          company: 'InnovateLabs',
          position: 'CTO'
        }
      },
      {
        platform: 'Facebook',
        author: 'Ana Martínez',
        title: 'Founder en Digital Agency Pro',
        content: `Recomendaciones de ${service} en ${location}? Tengo varios clientes que lo necesitan urgente`,
        date: new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000),
        profile: 'https://facebook.com/ana.martinez',
        contact: {
          email: 'ana@digitalagencypro.com',
          company: 'Digital Agency Pro',
          position: 'Founder'
        }
      },
      {
        platform: 'LinkedIn',
        author: 'Roberto Silva',
        title: 'Product Manager en FinTech Solutions',
        content: `Buscando equipo de ${service} para proyecto estratégico en ${location}. Budget disponible.`,
        date: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000),
        profile: 'https://linkedin.com/in/roberto-silva',
        contact: {
          email: 'r.silva@fintechsol.com',
          company: 'FinTech Solutions',
          position: 'Product Manager'
        }
      },
      {
        platform: 'Instagram',
        author: 'Laura Fernández',
        title: 'Marketing Director en Growth Co',
        content: `Necesito recomendaciones urgentes de ${service} en ${location} para un cliente importante`,
        date: new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000),
        profile: 'https://instagram.com/laura_fernandez',
        contact: {
          email: 'laura.fernandez@growthco.com',
          company: 'Growth Co',
          position: 'Marketing Director'
        }
      }
    ]

    const selectedPosts = mockPosts.slice(0, Math.min(limit, mockPosts.length))

    for (const post of selectedPosts) {
      results.push({
        id: `post_${Math.random().toString(36).substr(2, 9)}`,
        type: 'social_post',
        platform: post.platform,
        author: post.author,
        authorTitle: post.title,
        content: post.content,
        publishedDate: post.date.toISOString(),
        profileUrl: post.profile,
        contact: post.contact,
        relevanceScore: Math.random() * 0.3 + 0.7, // 0.7-1.0
        urgency: post.content.toLowerCase().includes('urgente') || post.content.toLowerCase().includes('asap') ? 'high' : 'medium'
      })
    }

    res.json({
      success: true,
      query: { service, location },
      totalResults: results.length,
      results: results.sort((a, b) => b.relevanceScore - a.relevanceScore)
    })

  } catch (error) {
    console.error('Error en búsqueda de potenciales clientes:', error)
    res.status(500).json({
      success: false,
      error: 'Error al buscar potenciales clientes',
      message: error.message
    })
  }
})

// 2. BÚSQUEDA DE EMPRESAS EN DIRECTORIOS
router.post('/search-business-directories', protect, async (req, res) => {
  try {
    const { industry, location, limit = 15 } = req.body

    const results = []

    // Simulación de búsqueda en directorios (PagesJaunes, Yelp, Google Business, etc.)
    const mockBusinesses = [
      {
        name: 'Innovatech Solutions SL',
        industry: industry || 'Tecnología',
        description: 'Empresa líder en soluciones tecnológicas empresariales',
        address: `Av. Principal 123, ${location}`,
        phone: '+34 912 345 678',
        email: 'info@innovatech.es',
        website: 'www.innovatech.es',
        employeeCount: '50-100',
        yearFounded: 2015,
        source: 'Google Business'
      },
      {
        name: 'Digital Dynamics Corp',
        industry: industry || 'Marketing Digital',
        description: 'Agencia de marketing digital y transformación empresarial',
        address: `Calle Comercio 45, ${location}`,
        phone: '+34 913 456 789',
        email: 'contacto@digitaldynamics.com',
        website: 'www.digitaldynamics.com',
        employeeCount: '25-50',
        yearFounded: 2018,
        source: 'Páginas Amarillas'
      },
      {
        name: 'CloudFirst Technologies',
        industry: industry || 'Cloud Computing',
        description: 'Especialistas en migración cloud y DevOps',
        address: `Plaza Tech Park 7, ${location}`,
        phone: '+34 914 567 890',
        email: 'hello@cloudfirst.io',
        website: 'www.cloudfirst.io',
        employeeCount: '10-25',
        yearFounded: 2020,
        source: 'LinkedIn Company'
      },
      {
        name: 'AI Innovators Lab',
        industry: industry || 'Inteligencia Artificial',
        description: 'Desarrollo de soluciones de IA personalizadas',
        address: `Paseo Innovación 89, ${location}`,
        phone: '+34 915 678 901',
        email: 'info@aiinnovators.tech',
        website: 'www.aiinnovators.tech',
        employeeCount: '15-30',
        yearFounded: 2019,
        source: 'Crunchbase'
      },
      {
        name: 'E-Commerce Masters SA',
        industry: industry || 'E-commerce',
        description: 'Plataformas de comercio electrónico y marketplaces',
        address: `Calle Digital 34, ${location}`,
        phone: '+34 916 789 012',
        email: 'sales@ecommercemasters.com',
        website: 'www.ecommercemasters.com',
        employeeCount: '75-150',
        yearFounded: 2012,
        source: 'Bloomberg'
      }
    ]

    const selectedBusinesses = mockBusinesses.slice(0, Math.min(limit, mockBusinesses.length))

    for (const business of selectedBusinesses) {
      const contactInfo = extractContactInfo(`${business.email} ${business.phone} ${business.website}`)

      results.push({
        id: `biz_${Math.random().toString(36).substr(2, 9)}`,
        type: 'business_directory',
        name: business.name,
        industry: business.industry,
        description: business.description,
        location: business.address,
        contact: {
          email: business.email,
          phone: business.phone,
          website: business.website
        },
        metadata: {
          employees: business.employeeCount,
          founded: business.yearFounded,
          source: business.source
        },
        qualityScore: Math.random() * 0.2 + 0.8 // 0.8-1.0
      })
    }

    res.json({
      success: true,
      query: { industry, location },
      totalResults: results.length,
      results: results.sort((a, b) => b.qualityScore - a.qualityScore)
    })

  } catch (error) {
    console.error('Error en búsqueda de directorios:', error)
    res.status(500).json({
      success: false,
      error: 'Error al buscar en directorios empresariales',
      message: error.message
    })
  }
})

// 3. BÚSQUEDA EN NOTICIAS
router.post('/search-news', protect, async (req, res) => {
  try {
    const { keywords, industry, location, limit = 10 } = req.body

    const results = []

    // Simulación de búsqueda en noticias (en producción usarías NewsAPI, Google News API, etc.)
    const mockNews = [
      {
        title: `Startup tecnológica recibe inversión millonaria en ${location}`,
        source: 'TechCrunch',
        publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        url: 'https://techcrunch.com/article-123',
        description: 'TechVentures Inc ha cerrado una ronda Serie A de 5M€ para expandir su equipo de desarrollo',
        companies: [
          {
            name: 'TechVentures Inc',
            role: 'startup',
            context: 'Recibió inversión',
            contact: {
              email: 'invest@techventures.io',
              website: 'www.techventures.io'
            }
          }
        ]
      },
      {
        title: `Empresa líder en IA busca expandirse a ${location}`,
        source: 'El Economista',
        publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        url: 'https://eleconomista.es/article-456',
        description: 'AI Solutions Global planea abrir oficinas y contratar 50 desarrolladores en los próximos 6 meses',
        companies: [
          {
            name: 'AI Solutions Global',
            role: 'corporation',
            context: 'Expansión y contratación',
            contact: {
              email: 'expansion@aisolutions.global',
              website: 'www.aisolutions.global'
            }
          }
        ]
      },
      {
        title: `Nueva plataforma de e-commerce revoluciona el mercado en ${location}`,
        source: 'Forbes',
        publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        url: 'https://forbes.com/article-789',
        description: 'ShopFast lanza su plataforma después de 2 años de desarrollo',
        companies: [
          {
            name: 'ShopFast',
            role: 'startup',
            context: 'Lanzamiento de producto',
            contact: {
              email: 'press@shopfast.com',
              website: 'www.shopfast.com'
            }
          }
        ]
      },
      {
        title: `Transformación digital: Empresa tradicional adopta IA en ${location}`,
        source: 'Bloomberg',
        publishedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        url: 'https://bloomberg.com/article-321',
        description: 'RetailCorp anuncia su plan de digitalización con inversión de 3M€',
        companies: [
          {
            name: 'RetailCorp SA',
            role: 'enterprise',
            context: 'Transformación digital',
            contact: {
              email: 'digital@retailcorp.es',
              website: 'www.retailcorp.es'
            }
          }
        ]
      }
    ]

    const selectedNews = mockNews.slice(0, Math.min(limit, mockNews.length))

    for (const news of selectedNews) {
      for (const company of news.companies) {
        results.push({
          id: `news_${Math.random().toString(36).substr(2, 9)}`,
          type: 'news_mention',
          newsTitle: news.title,
          newsSource: news.source,
          newsUrl: news.url,
          publishedDate: news.publishedAt.toISOString(),
          newsDescription: news.description,
          company: {
            name: company.name,
            role: company.role,
            context: company.context,
            contact: company.contact
          },
          relevanceScore: Math.random() * 0.3 + 0.7,
          opportunity: company.context
        })
      }
    }

    res.json({
      success: true,
      query: { keywords, industry, location },
      totalResults: results.length,
      results: results.sort((a, b) => new Date(b.publishedDate) - new Date(a.publishedDate))
    })

  } catch (error) {
    console.error('Error en búsqueda de noticias:', error)
    res.status(500).json({
      success: false,
      error: 'Error al buscar en noticias',
      message: error.message
    })
  }
})

// 4. BÚSQUEDA GOOGLE Y ENRIQUECIMIENTO DE DATOS
router.post('/search-google-enrich', protect, async (req, res) => {
  try {
    const { companyName, additionalInfo, limit = 5 } = req.body

    // Simulación de búsqueda Google y enriquecimiento
    const enrichedData = {
      companyName,
      found: true,
      confidence: 0.92,
      sources: [],
      contact: {
        emails: [],
        phones: [],
        socialMedia: {},
        addresses: []
      },
      metadata: {}
    }

    // Simular resultados de diferentes fuentes
    const mockSources = [
      {
        type: 'official_website',
        url: `www.${companyName.toLowerCase().replace(/\s/g, '')}.com`,
        title: `${companyName} - Official Website`,
        snippet: `Contacto: info@${companyName.toLowerCase().replace(/\s/g, '')}.com | Tel: +34 900 123 456`,
        foundData: {
          emails: [`info@${companyName.toLowerCase().replace(/\s/g, '')}.com`, `sales@${companyName.toLowerCase().replace(/\s/g, '')}.com`],
          phones: ['+34 900 123 456'],
          address: 'Calle Principal 100, Madrid'
        }
      },
      {
        type: 'linkedin',
        url: `linkedin.com/company/${companyName.toLowerCase().replace(/\s/g, '-')}`,
        title: `${companyName} | LinkedIn`,
        snippet: `${companyName} · 100-500 empleados · Tecnología`,
        foundData: {
          employees: '100-500',
          industry: 'Technology',
          founded: '2015'
        }
      },
      {
        type: 'crunchbase',
        url: `crunchbase.com/organization/${companyName.toLowerCase().replace(/\s/g, '-')}`,
        title: `${companyName} - Crunchbase`,
        snippet: `Founded 2015 · Total Funding: $5M`,
        foundData: {
          funding: '$5M',
          investors: ['Venture Capital A', 'Angel Investor B']
        }
      },
      {
        type: 'social_media',
        platforms: {
          twitter: `twitter.com/${companyName.toLowerCase().replace(/\s/g, '')}`,
          facebook: `facebook.com/${companyName.toLowerCase().replace(/\s/g, '')}`,
          instagram: `instagram.com/${companyName.toLowerCase().replace(/\s/g, '')}`
        }
      }
    ]

    enrichedData.sources = mockSources

    // Agregar datos encontrados
    mockSources.forEach(source => {
      if (source.foundData) {
        if (source.foundData.emails) {
          enrichedData.contact.emails.push(...source.foundData.emails)
        }
        if (source.foundData.phones) {
          enrichedData.contact.phones.push(...source.foundData.phones)
        }
        if (source.foundData.address) {
          enrichedData.contact.addresses.push(source.foundData.address)
        }
        if (source.foundData.employees) {
          enrichedData.metadata.employees = source.foundData.employees
        }
        if (source.foundData.industry) {
          enrichedData.metadata.industry = source.foundData.industry
        }
        if (source.foundData.founded) {
          enrichedData.metadata.founded = source.foundData.founded
        }
        if (source.foundData.funding) {
          enrichedData.metadata.funding = source.foundData.funding
        }
      }
      if (source.platforms) {
        enrichedData.contact.socialMedia = source.platforms
      }
    })

    // Eliminar duplicados
    enrichedData.contact.emails = [...new Set(enrichedData.contact.emails)]
    enrichedData.contact.phones = [...new Set(enrichedData.contact.phones)]
    enrichedData.contact.addresses = [...new Set(enrichedData.contact.addresses)]

    res.json({
      success: true,
      query: companyName,
      data: enrichedData
    })

  } catch (error) {
    console.error('Error en búsqueda Google:', error)
    res.status(500).json({
      success: false,
      error: 'Error al enriquecer datos de empresa',
      message: error.message
    })
  }
})

// Sistema de scoring avanzado para leads
function calculateLeadScore(result, location) {
  let score = 0
  const factors = []

  // 1. INTENCIÓN DE COMPRA (0-35 puntos)
  let intentScore = 0
  if (result.type === 'potential_client') {
    intentScore = 25
    factors.push({ factor: 'Potencial cliente activo', points: 25 })

    if (result.urgency === 'high') {
      intentScore += 10
      factors.push({ factor: 'Alta urgencia', points: 10 })
    }

    // Palabras clave de intención
    const intentKeywords = ['busco', 'necesito', 'contratar', 'urgente', 'asap', 'presupuesto', 'budget']
    const content = (result.content || '').toLowerCase()
    const hasIntent = intentKeywords.some(kw => content.includes(kw))
    if (hasIntent) {
      intentScore += 5
      factors.push({ factor: 'Palabras clave de intención', points: 5 })
    }
  } else if (result.type === 'news_mention') {
    // Eventos que indican intención de inversión/expansión
    const buyingSignals = ['inversión', 'ronda', 'expansión', 'contratación', 'apertura', 'lanzamiento']
    const context = (result.context || '').toLowerCase()
    if (buyingSignals.some(sig => context.includes(sig))) {
      intentScore = 20
      factors.push({ factor: 'Señales de compra en noticias', points: 20 })
    } else {
      intentScore = 10
      factors.push({ factor: 'Mención en noticias', points: 10 })
    }
  } else if (result.type === 'business_directory') {
    intentScore = 5
    factors.push({ factor: 'Empresa en directorio', points: 5 })
  } else if (result.type === 'google_enriched') {
    intentScore = 15
    factors.push({ factor: 'Datos enriquecidos', points: 15 })
  }
  score += intentScore

  // 2. RECENCIA (0-20 puntos)
  let recencyScore = 0
  if (result.publishedDate) {
    const daysOld = (Date.now() - new Date(result.publishedDate)) / (1000 * 60 * 60 * 24)
    if (daysOld < 3) {
      recencyScore = 20
      factors.push({ factor: 'Muy reciente (<3 días)', points: 20 })
    } else if (daysOld < 7) {
      recencyScore = 15
      factors.push({ factor: 'Reciente (<7 días)', points: 15 })
    } else if (daysOld < 14) {
      recencyScore = 10
      factors.push({ factor: 'Reciente (<14 días)', points: 10 })
    } else if (daysOld < 30) {
      recencyScore = 5
      factors.push({ factor: 'Último mes', points: 5 })
    }
  }
  score += recencyScore

  // 3. COMPLETITUD DE DATOS DE CONTACTO (0-25 puntos)
  let contactScore = 0
  if (result.email) {
    contactScore += 10
    factors.push({ factor: 'Email disponible', points: 10 })
  }
  if (result.phone) {
    contactScore += 8
    factors.push({ factor: 'Teléfono disponible', points: 8 })
  }
  if (result.website) {
    contactScore += 4
    factors.push({ factor: 'Website disponible', points: 4 })
  }
  if (result.linkedin) {
    contactScore += 3
    factors.push({ factor: 'LinkedIn disponible', points: 3 })
  }
  score += Math.min(25, contactScore)

  // 4. CALIDAD DE INFORMACIÓN (0-15 puntos)
  let qualityScore = 0
  if (result.description || result.content) {
    qualityScore += 5
    factors.push({ factor: 'Descripción completa', points: 5 })
  }
  if (result.industry) {
    qualityScore += 3
    factors.push({ factor: 'Industria identificada', points: 3 })
  }
  if (result.employees) {
    qualityScore += 3
    factors.push({ factor: 'Tamaño de empresa conocido', points: 3 })
  }
  if (result.founded) {
    qualityScore += 2
    factors.push({ factor: 'Año de fundación', points: 2 })
  }
  if (result.lat && result.lng) {
    qualityScore += 2
    factors.push({ factor: 'Ubicación exacta', points: 2 })
  }
  score += qualityScore

  // 5. FIT DE MERCADO (0-10 puntos)
  let fitScore = 0
  // Sectores de alto valor para IA/automatización
  const highValueIndustries = ['tech', 'saas', 'fintech', 'e-commerce', 'inteligencia artificial', 'ai', 'software']
  const industry = (result.industry || '').toLowerCase()
  if (highValueIndustries.some(ind => industry.includes(ind))) {
    fitScore = 10
    factors.push({ factor: 'Industria de alto valor', points: 10 })
  } else if (industry) {
    fitScore = 5
    factors.push({ factor: 'Industria identificada', points: 5 })
  }
  score += fitScore

  // 6. SEÑALES DE PRESUPUESTO (0-10 puntos)
  let budgetScore = 0
  if (result.employees) {
    const empRange = result.employees.split('-').map(n => parseInt(n))
    const avgEmployees = empRange.length === 2 ? (empRange[0] + empRange[1]) / 2 : 0

    if (avgEmployees >= 100) {
      budgetScore = 10
      factors.push({ factor: 'Empresa grande (100+ empleados)', points: 10 })
    } else if (avgEmployees >= 50) {
      budgetScore = 7
      factors.push({ factor: 'Empresa mediana (50-100)', points: 7 })
    } else if (avgEmployees >= 25) {
      budgetScore = 5
      factors.push({ factor: 'Empresa pequeña (25-50)', points: 5 })
    }
  }

  // Indicadores de financiación
  const fundingIndicators = ['inversión', 'ronda', 'funding', 'million', 'millones', 'capital']
  const text = ((result.context || '') + ' ' + (result.content || '') + ' ' + (result.description || '')).toLowerCase()
  if (fundingIndicators.some(ind => text.includes(ind))) {
    budgetScore += 5
    factors.push({ factor: 'Señales de financiación', points: 5 })
  }
  score += Math.min(10, budgetScore)

  // Normalizar a 0-100 (pero el máximo real es ~115, así que ajustamos)
  const finalScore = Math.min(100, Math.max(0, Math.round(score * (100 / 115))))

  return {
    score: finalScore,
    factors: factors,
    breakdown: {
      intent: intentScore,
      recency: recencyScore,
      contact: Math.min(25, contactScore),
      quality: qualityScore,
      fit: fitScore,
      budget: Math.min(10, budgetScore)
    }
  }
}

// Detectar señales de compra
function detectBuyingSignals(result) {
  const signals = []
  const text = ((result.context || '') + ' ' + (result.content || '') + ' ' + (result.description || '') + ' ' + (result.newsTitle || '')).toLowerCase()

  // Señales de expansión
  if (text.includes('expansión') || text.includes('expansion') || text.includes('apertura') || text.includes('nueva oficina')) {
    signals.push({
      type: 'expansion',
      signal: 'Expansión de negocio',
      description: 'La empresa está expandiendo operaciones',
      urgency: 'high',
      action: 'Ofrecer soluciones de automatización para escalar operaciones'
    })
  }

  // Señales de financiación
  if (text.includes('ronda') || text.includes('inversión') || text.includes('funding') || text.includes('capital')) {
    signals.push({
      type: 'funding',
      signal: 'Financiación reciente',
      description: 'La empresa ha recibido o busca inversión',
      urgency: 'high',
      action: 'Proponer inversión en tecnología para maximizar el uso del capital'
    })
  }

  // Señales de contratación
  if (text.includes('contratación') || text.includes('hiring') || text.includes('busca') || text.includes('necesita')) {
    signals.push({
      type: 'hiring',
      signal: 'Proceso de contratación activo',
      description: 'La empresa está buscando talento',
      urgency: 'medium',
      action: 'Ofrecer automatización para reducir carga de trabajo y necesidades de contratación'
    })
  }

  // Señales de lanzamiento
  if (text.includes('lanza') || text.includes('lanzamiento') || text.includes('launch') || text.includes('nuevo producto')) {
    signals.push({
      type: 'product_launch',
      signal: 'Lanzamiento de producto',
      description: 'La empresa está lanzando nuevos productos/servicios',
      urgency: 'medium',
      action: 'Proponer IA para optimizar operaciones del nuevo producto'
    })
  }

  // Señales de transformación digital
  if (text.includes('transformación digital') || text.includes('digital transformation') || text.includes('automatización') || text.includes('automation')) {
    signals.push({
      type: 'digital_transformation',
      signal: 'Transformación digital en curso',
      description: 'La empresa está digitalizando operaciones',
      urgency: 'high',
      action: 'Alinearse con iniciativas de transformación digital en marcha'
    })
  }

  // Señales de nuevos líderes
  if (text.includes('nuevo ceo') || text.includes('nuevo cto') || text.includes('new ceo') || text.includes('new cto')) {
    signals.push({
      type: 'leadership_change',
      signal: 'Cambio de liderazgo',
      description: 'Nuevos ejecutivos en posiciones clave',
      urgency: 'high',
      action: 'Contactar en primeros 90 días del nuevo líder (ventana de quick wins)'
    })
  }

  return signals
}

// 5. BÚSQUEDA AUTOMÁTICA UNIFICADA (Todas las fuentes en paralelo)
router.post('/auto-search', protect, async (req, res) => {
  try {
    const { location, limit = 30, industry, minEmployees, maxEmployees } = req.body

    if (!location) {
      return res.status(400).json({
        success: false,
        error: 'La ubicación es requerida'
      })
    }

    // Coordenadas aproximadas para países/ciudades comunes
    const locationCoords = {
      'españa': { lat: 40.4637, lng: -3.7492, zoom: 6 },
      'madrid': { lat: 40.4168, lng: -3.7038, zoom: 10 },
      'barcelona': { lat: 41.3874, lng: 2.1686, zoom: 10 },
      'valencia': { lat: 39.4699, lng: -0.3763, zoom: 10 },
      'sevilla': { lat: 37.3886, lng: -5.9823, zoom: 10 },
      'bilbao': { lat: 43.2627, lng: -2.9253, zoom: 10 },
      'argentina': { lat: -38.4161, lng: -63.6167, zoom: 5 },
      'buenos aires': { lat: -34.6037, lng: -58.3816, zoom: 10 },
      'córdoba': { lat: -31.4201, lng: -64.1888, zoom: 10 },
      'chile': { lat: -35.6751, lng: -71.5430, zoom: 5 },
      'santiago': { lat: -33.4489, lng: -70.6693, zoom: 10 },
      'valparaíso': { lat: -33.0472, lng: -71.6127, zoom: 10 },
      'colombia': { lat: 4.5709, lng: -74.2973, zoom: 5 },
      'bogotá': { lat: 4.7110, lng: -74.0721, zoom: 10 },
      'medellín': { lat: 6.2442, lng: -75.5812, zoom: 10 },
      'méxico': { lat: 23.6345, lng: -102.5528, zoom: 5 },
      'ciudad de méxico': { lat: 19.4326, lng: -99.1332, zoom: 10 },
      'guadalajara': { lat: 20.6597, lng: -103.3496, zoom: 10 },
      'monterrey': { lat: 25.6866, lng: -100.3161, zoom: 10 },
      'perú': { lat: -9.1900, lng: -75.0152, zoom: 5 },
      'lima': { lat: -12.0464, lng: -77.0428, zoom: 10 },
      'cusco': { lat: -13.5319, lng: -71.9675, zoom: 10 },
      'brasil': { lat: -14.2350, lng: -51.9253, zoom: 4 },
      'são paulo': { lat: -23.5505, lng: -46.6333, zoom: 10 },
      'rio de janeiro': { lat: -22.9068, lng: -43.1729, zoom: 10 },
      'venezuela': { lat: 6.4238, lng: -66.5897, zoom: 5 },
      'caracas': { lat: 10.4806, lng: -66.9036, zoom: 10 }
    }

    const normalizedLocation = location.toLowerCase().trim()
    const mapCenter = locationCoords[normalizedLocation] || { lat: 40.4637, lng: -3.7492, zoom: 6 }

    // Ejecutar todas las búsquedas en paralelo
    const allResults = []
    let totalProcessed = 0

    // Nombres y empresas variados
    const names = ['María González', 'Carlos Ramírez', 'Ana Martínez', 'Roberto Silva', 'Laura Fernández', 'Diego Torres', 'Carmen López', 'Miguel Ángel Ruiz', 'Patricia Sánchez', 'Javier Moreno']
    const positions = ['CEO', 'CTO', 'Founder', 'Product Manager', 'Tech Lead', 'VP Engineering', 'Director de Innovación', 'Head of Digital']
    const companyPrefixes = ['Tech', 'Digital', 'Smart', 'Innovation', 'Cloud', 'Data', 'AI', 'Cyber', 'Quantum', 'Future']
    const companySuffixes = ['Solutions', 'Labs', 'Corp', 'Group', 'Ventures', 'Systems', 'Technologies', 'Dynamics', 'Hub', 'Studio']

    // 1. Potenciales negocios (más variados y realistas)
    const potentialServices = ['desarrollo web', 'desarrollo mobile', 'inteligencia artificial', 'automatización', 'data analytics', 'cloud migration']
    const platforms = ['LinkedIn', 'Twitter', 'Facebook', 'Instagram']
    const contents = [
      `Buscamos urgente {service} para nuestro proyecto de transformación digital en {location}. Budget aprobado, inicio inmediato.`,
      `Necesitamos contratar equipo de {service} ASAP en {location}. Proyecto estratégico de 6 meses. DM abiertos.`,
      `Recomendaciones de freelancers/agencias de {service} en {location}? Tengo varios clientes interesados.`,
      `Estamos escalando y necesitamos expertos en {service} para unirse a nuestro equipo en {location}. Excelente paquete de compensación.`,
      `Proyecto interesante de {service} en {location}. Si conoces a alguien disponible, por favor comparte!`
    ]

    for (let i = 0; i < 5; i++) {
      const service = potentialServices[Math.floor(Math.random() * potentialServices.length)]
      const name = names[Math.floor(Math.random() * names.length)]
      const position = positions[Math.floor(Math.random() * positions.length)]
      const company = `${companyPrefixes[Math.floor(Math.random() * companyPrefixes.length)]} ${companySuffixes[Math.floor(Math.random() * companySuffixes.length)]}`
      const platform = platforms[Math.floor(Math.random() * platforms.length)]
      const content = contents[Math.floor(Math.random() * contents.length)]
        .replace('{service}', service)
        .replace('{location}', location)

      allResults.push({
        id: `pc_${Math.random().toString(36).substr(2, 9)}`,
        type: 'potential_client',
        source: platform,
        author: name,
        title: `${position} en ${company}`,
        content: content,
        email: `${name.toLowerCase().split(' ')[0]}.${name.toLowerCase().split(' ')[1]}@${company.toLowerCase().replace(/\s/g, '')}.com`,
        phone: `+34 9${Math.floor(Math.random() * 90000000 + 10000000)}`,
        company: company,
        location: location,
        lat: mapCenter.lat + (Math.random() - 0.5) * 0.8,
        lng: mapCenter.lng + (Math.random() - 0.5) * 0.8,
        urgency: Math.random() > 0.6 ? 'high' : 'medium',
        publishedDate: new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000).toISOString()
      })
      totalProcessed++
    }

    // 2. Empresas de directorios (mejorado)
    const industries = ['Tecnología', 'Marketing Digital', 'E-commerce', 'Inteligencia Artificial', 'Cloud Computing', 'Fintech', 'Desarrollo Software', 'Consultoría IT']
    const businessNames = ['Innovatech', 'Digital', 'Cloud', 'AI', 'Smart', 'Tech', 'Quantum', 'Nexus', 'Prime', 'Elite']
    const businessTypes = ['Solutions', 'Dynamics', 'Technologies', 'Innovators', 'Masters', 'Partners', 'Systems', 'Global', 'Ventures', 'Labs']
    const legalForms = ['SL', 'SA', 'Corp', 'Inc', 'Lab', 'Group', 'Ltd']
    const streets = ['Av. Tecnológica', 'Calle Innovación', 'Plaza Digital', 'Paseo Empresarial', 'Polígono Industrial', 'Parque Tecnológico', 'Av. Principal', 'Calle del Comercio']
    const sources = ['Google Business', 'LinkedIn', 'Páginas Amarillas', 'Crunchbase', 'Bloomberg', 'InfoEmpresas']
    const descriptions = [
      'Líder en soluciones de {industry} con más de {years} años de experiencia',
      'Empresa especializada en {industry} y transformación digital empresarial',
      'Proveedor de servicios premium de {industry} para empresas Fortune 500',
      'Innovadores en {industry} con presencia en toda Europa',
      'Expertos en {industry} ayudando a empresas a escalar digitalmente'
    ]

    for (let i = 0; i < 8; i++) {
      const industry = industries[Math.floor(Math.random() * industries.length)]
      const name = `${businessNames[Math.floor(Math.random() * businessNames.length)]} ${businessTypes[Math.floor(Math.random() * businessTypes.length)]} ${legalForms[Math.floor(Math.random() * legalForms.length)]}`
      const founded = 2010 + Math.floor(Math.random() * 14)
      const description = descriptions[Math.floor(Math.random() * descriptions.length)]
        .replace('{industry}', industry.toLowerCase())
        .replace('{years}', new Date().getFullYear() - founded)

      const domain = name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')

      allResults.push({
        id: `biz_${Math.random().toString(36).substr(2, 9)}`,
        type: 'business_directory',
        name: name,
        industry: industry,
        description: description,
        email: `info@${domain}.com`,
        phone: `+34 9${Math.floor(Math.random() * 90000000 + 10000000)}`,
        website: `www.${domain}.com`,
        address: `${streets[Math.floor(Math.random() * streets.length)]} ${Math.floor(Math.random() * 200) + 1}, ${location}`,
        location: location,
        lat: mapCenter.lat + (Math.random() - 0.5) * 0.8,
        lng: mapCenter.lng + (Math.random() - 0.5) * 0.8,
        employees: `${[10, 25, 50, 100, 200][Math.floor(Math.random() * 5)]}-${[50, 100, 150, 250, 500][Math.floor(Math.random() * 5)]}`,
        founded: founded,
        source: sources[Math.floor(Math.random() * sources.length)]
      })
      totalProcessed++
    }

    // 3. Noticias (mejorado con más variedad)
    const newsSources = ['TechCrunch', 'Forbes', 'El Economista', 'Bloomberg', 'Expansión', 'CincoDías', 'TechEurope', 'VentureBeat']
    const newsTemplates = [
      '{company} recibe ronda de inversión Serie {round} de {amount}M€ en {location}',
      '{company} anuncia expansión y apertura de nuevas oficinas en {location}',
      '{company} lanza innovadora plataforma de {tech} en {location}',
      '{company} lidera transformación digital en sector {sector} desde {location}',
      '{company} adquiere competidor y refuerza presencia en {location}',
      'Startup {company} alcanza valoración de {amount}M€ tras exitoso crecimiento en {location}'
    ]
    const contexts = ['Recibió inversión Serie A', 'Recibió inversión Serie B', 'Expansión internacional', 'Lanzamiento de producto', 'Transformación digital', 'Adquisición estratégica', 'IPO próximo', 'Nuevo CEO']
    const companyRoles = ['startup', 'scaleup', 'corporation', 'enterprise', 'unicorn']
    const techAreas = ['inteligencia artificial', 'blockchain', 'cloud computing', 'IoT', 'big data', 'cybersecurity']
    const sectors = ['retail', 'fintech', 'healthtech', 'edtech', 'logística', 'e-commerce']

    for (let i = 0; i < 6; i++) {
      const company = `${companyPrefixes[Math.floor(Math.random() * companyPrefixes.length)]}${companySuffixes[Math.floor(Math.random() * companySuffixes.length)]}`
      const newsSource = newsSources[Math.floor(Math.random() * newsSources.length)]
      const newsTemplate = newsTemplates[Math.floor(Math.random() * newsTemplates.length)]
      const context = contexts[Math.floor(Math.random() * contexts.length)]
      const amount = [2, 5, 10, 15, 25, 50][Math.floor(Math.random() * 6)]
      const round = ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)]

      const newsTitle = newsTemplate
        .replace('{company}', company)
        .replace('{round}', round)
        .replace('{amount}', amount)
        .replace('{location}', location)
        .replace('{tech}', techAreas[Math.floor(Math.random() * techAreas.length)])
        .replace('{sector}', sectors[Math.floor(Math.random() * sectors.length)])

      const domain = company.toLowerCase().replace(/\s+/g, '')

      allResults.push({
        id: `news_${Math.random().toString(36).substr(2, 9)}`,
        type: 'news_mention',
        newsTitle: newsTitle,
        newsSource: newsSource,
        newsUrl: `https://${newsSource.toLowerCase().replace(/\s/g, '')}.com/article-${Math.floor(Math.random() * 10000)}`,
        publishedDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        company: company,
        companyRole: companyRoles[Math.floor(Math.random() * companyRoles.length)],
        context: context,
        email: `press@${domain}.com`,
        website: `www.${domain}.com`,
        location: location,
        lat: mapCenter.lat + (Math.random() - 0.5) * 0.8,
        lng: mapCenter.lng + (Math.random() - 0.5) * 0.8
      })
      totalProcessed++
    }

    // 4. Búsquedas Google enriquecidas (más datos)
    const topCompanies = allResults
      .filter(r => r.type === 'business_directory')
      .slice(0, 4)

    for (const company of topCompanies) {
      const enriched = {
        id: `enrich_${Math.random().toString(36).substr(2, 9)}`,
        type: 'google_enriched',
        name: company.name,
        email: company.email,
        phone: company.phone,
        website: company.website,
        address: company.address,
        location: company.address,
        lat: company.lat,
        lng: company.lng,
        linkedin: `linkedin.com/company/${company.name.toLowerCase().replace(/\s/g, '-').replace(/[^a-z0-9-]/g, '')}`,
        twitter: `twitter.com/${company.name.toLowerCase().replace(/\s/g, '').replace(/[^a-z0-9]/g, '')}`,
        employees: company.employees,
        industry: company.industry,
        founded: company.founded,
        description: company.description,
        sources: ['Website Oficial', 'LinkedIn', 'Crunchbase', 'Google Business', 'Bloomberg']
      }
      allResults.push(enriched)
      totalProcessed++
    }

    // Aplicar filtros avanzados
    let filteredResults = allResults

    // Filtro por industria
    if (industry) {
      filteredResults = filteredResults.filter(r =>
        !r.industry || r.industry.toLowerCase().includes(industry.toLowerCase())
      )
    }

    // Filtro por número de empleados
    if (minEmployees || maxEmployees) {
      filteredResults = filteredResults.filter(r => {
        if (!r.employees) return true // Incluir si no tiene info de empleados

        const employeeRange = r.employees.split('-').map(n => parseInt(n))
        const avgEmployees = (employeeRange[0] + employeeRange[1]) / 2

        if (minEmployees && avgEmployees < minEmployees) return false
        if (maxEmployees && avgEmployees > maxEmployees) return false

        return true
      })
    }

    // Calcular score de calidad para cada resultado con sistema avanzado
    filteredResults.forEach(result => {
      const scoreData = calculateLeadScore(result, location)
      result.leadScore = scoreData.score
      result.scoreFactors = scoreData.factors
      result.scoreBreakdown = scoreData.breakdown

      // Detectar señales de compra
      result.buyingSignals = detectBuyingSignals(result)

      // Extraer decisores si hay información
      const text = (result.content || '') + ' ' + (result.description || '') + ' ' + (result.title || '')
      result.decisionMakers = extractDecisionMakers(text)

      // Generar emails probables si tenemos nombre y dominio
      if (result.website && result.author) {
        const names = result.author.split(' ')
        result.probableEmails = generateProbableEmails(names[0], names[1], result.website)
      }

      // Categorizar el score
      if (result.leadScore >= 85) {
        result.leadQuality = 'hot'
        result.priority = 'P0 - Contactar inmediatamente'
      } else if (result.leadScore >= 70) {
        result.leadQuality = 'warm'
        result.priority = 'P1 - Contactar esta semana'
      } else if (result.leadScore >= 50) {
        result.leadQuality = 'cold'
        result.priority = 'P2 - Seguimiento de rutina'
      } else {
        result.leadQuality = 'low'
        result.priority = 'P3 - Nutrición a largo plazo'
      }
    })

    // Ordenar por score de calidad (mayor a menor)
    filteredResults.sort((a, b) => {
      // Primero por score
      if (b.leadScore !== a.leadScore) {
        return b.leadScore - a.leadScore
      }

      // Si tienen el mismo score, ordenar por fecha
      if (a.publishedDate && b.publishedDate) {
        return new Date(b.publishedDate) - new Date(a.publishedDate)
      }

      return 0
    })

    // Limitar resultados
    const limitedResults = filteredResults.slice(0, limit)

    // Calcular distribución de calidad
    const qualityDistribution = {
      hot: filteredResults.filter(r => r.leadQuality === 'hot').length,
      warm: filteredResults.filter(r => r.leadQuality === 'warm').length,
      cold: filteredResults.filter(r => r.leadQuality === 'cold').length,
      low: filteredResults.filter(r => r.leadQuality === 'low').length
    }

    res.json({
      success: true,
      location,
      mapCenter,
      totalResults: limitedResults.length,
      totalBeforeFilter: allResults.length,
      sourcesProcessed: {
        potentialClients: allResults.filter(r => r.type === 'potential_client').length,
        businessDirectories: allResults.filter(r => r.type === 'business_directory').length,
        news: allResults.filter(r => r.type === 'news_mention').length,
        enriched: allResults.filter(r => r.type === 'google_enriched').length
      },
      qualityDistribution,
      averageScore: filteredResults.length > 0
        ? Math.round(filteredResults.reduce((sum, r) => sum + r.leadScore, 0) / filteredResults.length)
        : 0,
      results: limitedResults
    })

  } catch (error) {
    console.error('Error en búsqueda automática:', error)
    res.status(500).json({
      success: false,
      error: 'Error al realizar la búsqueda automática',
      message: error.message
    })
  }
})

// 6. ENRIQUECIMIENTO CON APIs EXTERNAS (Hunter.io, Clearbit, Apollo)
router.post('/enrich-lead', protect, async (req, res) => {
  try {
    const { companyDomain, companyName, personName, personTitle } = req.body

    if (!companyDomain && !companyName) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere el dominio o nombre de la empresa'
      })
    }

    const enrichedData = {
      company: {},
      contacts: [],
      socialMedia: {},
      technologies: [],
      enrichmentSources: []
    }

    // 1. Hunter.io - Para encontrar emails corporativos
    // Nota: Requiere API key de Hunter.io (HUNTER_API_KEY en .env)
    const hunterApiKey = process.env.HUNTER_API_KEY
    if (hunterApiKey && companyDomain) {
      try {
        const hunterUrl = `https://api.hunter.io/v2/domain-search?domain=${companyDomain}&api_key=${hunterApiKey}`
        const hunterResp = await axios.get(hunterUrl, { timeout: 5000 })

        if (hunterResp.data && hunterResp.data.data) {
          const emails = hunterResp.data.data.emails || []
          enrichedData.contacts = emails.map(e => ({
            firstName: e.first_name,
            lastName: e.last_name,
            email: e.value,
            position: e.position,
            department: e.department,
            confidence: e.confidence,
            source: 'Hunter.io',
            verified: e.verification?.status === 'valid'
          }))
          enrichedData.enrichmentSources.push('Hunter.io')
        }
      } catch (err) {
        console.error('Hunter.io error:', err.message)
      }
    }

    // 2. Clearbit - Para información de empresa
    // Nota: Requiere API key de Clearbit (CLEARBIT_API_KEY en .env)
    const clearbitApiKey = process.env.CLEARBIT_API_KEY
    if (clearbitApiKey && companyDomain) {
      try {
        const clearbitUrl = `https://company.clearbit.com/v2/companies/find?domain=${companyDomain}`
        const clearbitResp = await axios.get(clearbitUrl, {
          headers: { 'Authorization': `Bearer ${clearbitApiKey}` },
          timeout: 5000
        })

        if (clearbitResp.data) {
          const data = clearbitResp.data
          enrichedData.company = {
            name: data.name,
            domain: data.domain,
            description: data.description,
            industry: data.category?.industry,
            sector: data.category?.sector,
            employees: data.metrics?.employees,
            employeeRange: data.metrics?.employeesRange,
            founded: data.foundedYear,
            location: data.location,
            revenue: data.metrics?.estimatedAnnualRevenue,
            funding: data.metrics?.raised,
            techStack: data.tech || [],
            tags: data.tags || []
          }

          if (data.facebook) enrichedData.socialMedia.facebook = data.facebook.handle
          if (data.twitter) enrichedData.socialMedia.twitter = data.twitter.handle
          if (data.linkedin) enrichedData.socialMedia.linkedin = data.linkedin.handle

          enrichedData.enrichmentSources.push('Clearbit')
        }
      } catch (err) {
        console.error('Clearbit error:', err.message)
      }
    }

    // 3. Simulación de enriquecimiento si no hay API keys
    if (enrichedData.enrichmentSources.length === 0) {
      // Datos simulados para demostración
      enrichedData.company = {
        name: companyName || 'Empresa Demo',
        domain: companyDomain || 'empresa.com',
        description: 'Empresa líder en su sector con enfoque en innovación y tecnología',
        industry: 'Technology',
        sector: 'Software',
        employees: 150,
        employeeRange: '100-250',
        founded: 2015,
        location: 'Madrid, España',
        revenue: '5M-10M',
        techStack: ['React', 'Node.js', 'PostgreSQL', 'AWS', 'Docker']
      }

      enrichedData.contacts = [
        {
          firstName: 'Carlos',
          lastName: 'Rodríguez',
          email: `carlos.rodriguez@${companyDomain || 'empresa.com'}`,
          position: 'CEO',
          department: 'Executive',
          confidence: 95,
          source: 'Demo Data',
          verified: true
        },
        {
          firstName: 'Ana',
          lastName: 'Martínez',
          email: `ana.martinez@${companyDomain || 'empresa.com'}`,
          position: 'CTO',
          department: 'Technology',
          confidence: 92,
          source: 'Demo Data',
          verified: true
        },
        {
          firstName: 'Miguel',
          lastName: 'López',
          email: `miguel.lopez@${companyDomain || 'empresa.com'}`,
          position: 'Head of Sales',
          department: 'Sales',
          confidence: 88,
          source: 'Demo Data',
          verified: false
        }
      ]

      enrichedData.socialMedia = {
        linkedin: `linkedin.com/company/${companyName?.toLowerCase().replace(/\s/g, '-') || 'empresa'}`,
        twitter: `twitter.com/${companyName?.toLowerCase().replace(/\s/g, '') || 'empresa'}`,
        facebook: `facebook.com/${companyName?.toLowerCase().replace(/\s/g, '') || 'empresa'}`
      }

      enrichedData.enrichmentSources.push('Demo Data')
    }

    // Calcular score de enriquecimiento
    let enrichmentScore = 0
    if (enrichedData.company.name) enrichmentScore += 10
    if (enrichedData.company.employees) enrichmentScore += 15
    if (enrichedData.company.revenue) enrichmentScore += 15
    if (enrichedData.company.techStack?.length > 0) enrichmentScore += 10
    if (enrichedData.contacts.length > 0) enrichmentScore += 20
    if (enrichedData.contacts.filter(c => c.verified).length > 0) enrichmentScore += 15
    if (Object.keys(enrichedData.socialMedia).length > 0) enrichmentScore += 15

    enrichedData.enrichmentScore = Math.min(100, enrichmentScore)
    enrichedData.completeness = enrichmentScore >= 80 ? 'excellent' :
                                 enrichmentScore >= 60 ? 'good' :
                                 enrichmentScore >= 40 ? 'fair' : 'poor'

    res.json({
      success: true,
      data: enrichedData
    })

  } catch (error) {
    console.error('Error en enriquecimiento:', error)
    res.status(500).json({
      success: false,
      error: 'Error al enriquecer datos del lead',
      message: error.message
    })
  }
})

// 7. VALIDACIÓN DE EMAIL (Verificar si el email existe)
router.post('/validate-email', protect, async (req, res) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email es requerido'
      })
    }

    // Validación básica de formato
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.json({
        success: true,
        email: email,
        valid: false,
        reason: 'Formato de email inválido',
        confidence: 0
      })
    }

    // Si tienes API de validación (como Hunter.io Verifier, ZeroBounce, etc.)
    const hunterApiKey = process.env.HUNTER_API_KEY
    if (hunterApiKey) {
      try {
        const verifyUrl = `https://api.hunter.io/v2/email-verifier?email=${email}&api_key=${hunterApiKey}`
        const verifyResp = await axios.get(verifyUrl, { timeout: 5000 })

        if (verifyResp.data && verifyResp.data.data) {
          const data = verifyResp.data.data
          return res.json({
            success: true,
            email: email,
            valid: data.status === 'valid',
            status: data.status,
            score: data.score,
            confidence: data.score,
            reason: data.result,
            source: 'Hunter.io'
          })
        }
      } catch (err) {
        console.error('Hunter validation error:', err.message)
      }
    }

    // Validación simulada si no hay API
    const domain = email.split('@')[1]
    const commonDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com']
    const isCommon = commonDomains.includes(domain)

    // Simular validación
    const isValid = Math.random() > 0.2 // 80% válidos en demo
    const confidence = isValid ? Math.floor(Math.random() * 30) + 70 : Math.floor(Math.random() * 50)

    res.json({
      success: true,
      email: email,
      valid: isValid,
      status: isValid ? 'valid' : 'invalid',
      confidence: confidence,
      reason: isValid ? 'Email validado correctamente' : 'Email no encontrado o inválido',
      isPersonal: isCommon,
      source: 'Demo Validation'
    })

  } catch (error) {
    console.error('Error en validación:', error)
    res.status(500).json({
      success: false,
      error: 'Error al validar email',
      message: error.message
    })
  }
})

export default router
