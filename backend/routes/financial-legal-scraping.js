import express from 'express'
import { protect } from '../middleware/auth.js'
import axios from 'axios'
import * as cheerio from 'cheerio'
import { pool } from '../config/database.js'
import { analyzeWithDeepSeek } from '../services/deepseek.js'

const router = express.Router()

// ==========================================
// 💰 FINANCIAL & LEGAL DOCUMENT SCRAPING
// ==========================================

/**
 * 1. SCRAPE FINANCIAL DATA
 * Extrae datos financieros de fuentes públicas
 */
router.post('/financial-data', protect, async (req, res) => {
  try {
    const { companyName, ticker } = req.body

    // Simular extracción de datos financieros
    // En producción: usar APIs de SEC, Yahoo Finance, Bloomberg, etc.
    const financialData = {
      company: companyName,
      ticker: ticker,
      data_source: 'SEC Filings / Public Records',
      last_updated: new Date().toISOString(),

      financial_metrics: {
        revenue: {
          current_year: '$125M',
          previous_year: '$95M',
          growth_rate: '+31.6%',
          quarterly_trend: [
            { quarter: 'Q1 2024', revenue: '$28M', growth: '+25%' },
            { quarter: 'Q2 2024', revenue: '$30M', growth: '+28%' },
            { quarter: 'Q3 2024', revenue: '$32M', growth: '+33%' },
            { quarter: 'Q4 2024', revenue: '$35M', growth: '+35%' }
          ]
        },

        profitability: {
          gross_margin: '72%',
          operating_margin: '15%',
          net_margin: '8%',
          trend: 'Improving',
          burn_rate: '$2M/month',
          runway: '18 months'
        },

        cash_position: {
          cash_on_hand: '$45M',
          total_assets: '$180M',
          total_liabilities: '$90M',
          debt_to_equity: '0.5',
          current_ratio: '2.1'
        },

        valuation: {
          last_valuation: '$500M',
          valuation_date: '2024-01',
          revenue_multiple: '4x',
          employee_headcount: 450,
          revenue_per_employee: '$277K'
        },

        funding_history: [
          {
            round: 'Series C',
            amount: '$50M',
            date: '2024-01',
            lead_investor: 'Sequoia Capital',
            valuation: '$500M',
            use_of_funds: 'Product development, market expansion, hiring'
          },
          {
            round: 'Series B',
            amount: '$25M',
            date: '2022-06',
            lead_investor: 'Accel Partners',
            valuation: '$200M',
            use_of_funds: 'Sales & marketing, engineering'
          },
          {
            round: 'Series A',
            amount: '$10M',
            date: '2020-09',
            lead_investor: 'Andreessen Horowitz',
            valuation: '$50M',
            use_of_funds: 'Product development, initial team'
          }
        ],

        total_funding_raised: '$85M',
        investors: [
          'Sequoia Capital',
          'Accel Partners',
          'Andreessen Horowitz',
          'Y Combinator',
          'Various Angels'
        ]
      },

      financial_health_indicators: {
        growth_trajectory: 'Strong - 30%+ YoY',
        profitability_status: 'Path to profitability',
        cash_runway: 'Healthy - 18+ months',
        funding_risk: 'Low - recently funded',
        expansion_capacity: 'High'
      },

      spending_patterns: {
        rd_spend: '$40M/year (32% of revenue)',
        sales_marketing_spend: '$45M/year (36% of revenue)',
        gna_spend: '$20M/year (16% of revenue)',
        hiring_budget: 'Increasing - 100+ planned hires'
      }
    }

    // Analizar datos financieros con IA para oportunidades
    const prompt = `Analiza los siguientes datos financieros de una empresa y genera insights de venta:

DATOS FINANCIEROS:
${JSON.stringify(financialData, null, 2)}

Genera en JSON:
{
  "financial_health_score": 1-100,
  "buying_power": "high/medium/low",
  "budget_availability": {
    "estimated_tech_budget": "estimación",
    "budget_timing": "cuándo esperan tener presupuesto",
    "budget_approval_process": "proceso estimado"
  },
  "growth_signals": [
    {
      "signal": "señal detectada",
      "implication": "qué significa para ventas",
      "opportunity": "oportunidad específica"
    }
  ],
  "pain_points_from_financials": ["pain points", "revelados", "por", "los", "números"],
  "deal_size_estimate": {
    "min": "mínimo estimado",
    "max": "máximo estimado",
    "justification": "por qué este rango"
  },
  "timing_recommendation": "mejor momento para contactar basado en ciclo financiero",
  "value_proposition_angle": "ángulo de propuesta de valor basado en situación financiera",
  "risk_factors": ["factores", "de", "riesgo", "para", "el", "deal"],
  "competitive_positioning": "cómo posicionarte basado en su situación financiera"
}`

    let aiInsights = null
    try {
      const aiResponse = await analyzeWithDeepSeek(prompt)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      aiInsights = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch (e) {
      console.error('Error analyzing financial data:', e)
    }

    // Guardar datos financieros
    await pool.query(`
      INSERT INTO company_financial_data (
        user_id, company_name, ticker, financial_data,
        revenue, funding_raised, ai_insights, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `, [
      req.user.id,
      companyName,
      ticker,
      JSON.stringify(financialData),
      financialData.financial_metrics.revenue.current_year,
      financialData.financial_metrics.total_funding_raised,
      JSON.stringify(aiInsights)
    ])

    res.json({
      success: true,
      company: companyName,
      financial_data: financialData,
      ai_insights: aiInsights,
      recommendation: 'Empresa bien financiada con crecimiento fuerte - alta probabilidad de compra'
    })

  } catch (error) {
    console.error('Error scraping financial data:', error)
    res.status(500).json({
      success: false,
      message: 'Error extrayendo datos financieros',
      error: error.message
    })
  }
})

/**
 * 2. MONITOR SEC FILINGS (10-K, 10-Q, 8-K)
 * Monitorea documentos de la SEC para empresas públicas
 */
router.post('/sec-filings', protect, async (req, res) => {
  try {
    const { companyName, ticker } = req.body

    // Simular extracción de SEC filings
    const secFilings = {
      company: companyName,
      ticker: ticker,
      recent_filings: [
        {
          type: '10-K',
          filing_date: '2024-02-28',
          period: 'FY 2023',
          document_url: 'https://sec.gov/...',
          key_sections: {
            risk_factors: [
              'Dependence on key customers',
              'Competition from established players',
              'Regulatory changes in industry',
              'Cybersecurity threats',
              'Talent acquisition and retention'
            ],
            business_overview: 'Company provides SaaS solutions for enterprise customers...',
            md_and_a: {
              revenue_drivers: ['New customer acquisition', 'Expansion revenue', 'Product adoption'],
              challenges: ['Sales cycle length', 'Customer concentration', 'Market competition'],
              future_outlook: 'Positive - expanding into new verticals'
            },
            legal_proceedings: [
              {
                case: 'Patent dispute with CompetitorX',
                status: 'Ongoing',
                potential_impact: 'Material'
              }
            ]
          }
        },
        {
          type: '10-Q',
          filing_date: '2024-11-10',
          period: 'Q3 2024',
          document_url: 'https://sec.gov/...',
          highlights: [
            'Revenue up 28% YoY',
            'Added 50 new enterprise customers',
            'Expanded international presence',
            'Launched two new product features'
          ]
        },
        {
          type: '8-K',
          filing_date: '2024-09-15',
          event: 'Material Agreement',
          description: 'Entered into strategic partnership with Industry Leader Inc.',
          significance: 'HIGH - New distribution channel'
        }
      ],
      extracted_insights: {
        strategic_priorities: [
          'International expansion',
          'Enterprise customer acquisition',
          'Product innovation',
          'Strategic partnerships'
        ],
        pain_points_mentioned: [
          'Need to reduce customer acquisition costs',
          'Improving sales efficiency',
          'Scaling customer success',
          'Automating manual processes'
        ],
        technology_investments: [
          'AI and machine learning capabilities',
          'Cloud infrastructure modernization',
          'Data analytics platform',
          'Security enhancements'
        ],
        upcoming_initiatives: [
          'Launch new product line in Q1 2025',
          'Open new office in Europe',
          'Hire 100+ employees across departments'
        ]
      }
    }

    // Analizar SEC filings con IA
    const prompt = `Analiza estos SEC filings y extrae oportunidades de venta:

SEC FILINGS:
${JSON.stringify(secFilings, null, 2)}

Genera en JSON:
{
  "strategic_opportunities": [
    {
      "opportunity": "oportunidad específica",
      "evidence": "qué documento/sección lo menciona",
      "timing": "cuándo actuar",
      "approach": "cómo abordar"
    }
  ],
  "pain_points_analysis": [
    {
      "pain_point": "pain point detectado",
      "severity": "high/medium/low",
      "your_solution": "cómo tu producto lo resuelve",
      "value_quantification": "valor estimado"
    }
  ],
  "competitive_intel": {
    "competitors_mentioned": ["competidores", "mencionados"],
    "competitive_threats": ["amenazas", "que", "mencionan"],
    "differentiation_opportunities": ["formas", "de", "diferenciarte"]
  },
  "regulatory_considerations": ["consideraciones", "regulatorias", "a", "mencionar"],
  "conversation_starters": ["temas", "específicos", "extraídos", "de", "filings"],
  "executive_talking_points": ["puntos", "que", "importan", "a", "executives"]
}`

    let aiInsights = null
    try {
      const aiResponse = await analyzeWithDeepSeek(prompt)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      aiInsights = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch (e) {
      console.error('Error analyzing SEC filings:', e)
    }

    res.json({
      success: true,
      company: companyName,
      sec_filings: secFilings,
      ai_insights: aiInsights,
      recommendation: 'Usa pain points mencionados en MD&A para personalizar tu pitch'
    })

  } catch (error) {
    console.error('Error scraping SEC filings:', error)
    res.status(500).json({
      success: false,
      message: 'Error extrayendo SEC filings',
      error: error.message
    })
  }
})

/**
 * 3. SCRAPE PATENT DATA
 * Extrae información de patentes para entender innovación
 */
router.post('/patent-data', protect, async (req, res) => {
  try {
    const { companyName } = req.body

    // Simular extracción de datos de patentes
    // En producción: usar USPTO API, Google Patents, etc.
    const patentData = {
      company: companyName,
      total_patents: 45,
      patents_last_year: 12,
      pending_applications: 8,

      recent_patents: [
        {
          patent_number: 'US11234567B2',
          title: 'Machine Learning System for Predictive Analytics',
          filing_date: '2022-03-15',
          grant_date: '2024-01-20',
          inventors: ['John Smith', 'Jane Doe', 'Bob Johnson'],
          category: 'Artificial Intelligence',
          description: 'A system and method for using machine learning to predict customer behavior...',
          claims: 15,
          citations: 23,
          technology_area: 'AI/ML',
          competitive_significance: 'HIGH - Core technology patent'
        },
        {
          patent_number: 'US11234568B2',
          title: 'Distributed Data Processing Architecture',
          filing_date: '2021-11-10',
          grant_date: '2023-09-05',
          inventors: ['Alice Chen', 'Carlos Rodriguez'],
          category: 'Cloud Computing',
          description: 'An improved architecture for processing large-scale data...',
          claims: 20,
          citations: 18,
          technology_area: 'Cloud Infrastructure',
          competitive_significance: 'MEDIUM - Infrastructure improvement'
        },
        {
          patent_number: 'US20240012345A1',
          title: 'Real-time Fraud Detection System',
          filing_date: '2023-06-20',
          status: 'Pending',
          inventors: ['Michael Lee', 'Sarah Park'],
          category: 'Security',
          description: 'A novel approach to detecting fraudulent activities in real-time...',
          technology_area: 'Cybersecurity',
          competitive_significance: 'HIGH - New product area'
        }
      ],

      patent_trends: {
        technology_focus_areas: [
          { area: 'Artificial Intelligence', count: 18 },
          { area: 'Cloud Computing', count: 12 },
          { area: 'Cybersecurity', count: 8 },
          { area: 'Data Analytics', count: 7 }
        ],
        innovation_velocity: 'High - 12 patents filed last year',
        r_and_d_activity: 'Very Active',
        competitive_moat: 'Building strong IP portfolio'
      },

      competitive_analysis: {
        vs_competitor_a: {
          their_patents: 45,
          competitor_patents: 78,
          gap: 'Competitor has more patents but in different areas'
        },
        patent_quality_score: 7.5, // 0-10
        forward_citations: 156, // How many times their patents are cited
        strategic_value: 'HIGH - Patents in high-growth areas'
      },

      key_inventors: [
        {
          name: 'John Smith',
          title: 'Chief Scientist',
          patents_count: 12,
          expertise: 'Machine Learning, AI',
          linkedin: 'https://linkedin.com/in/johnsmith'
        },
        {
          name: 'Jane Doe',
          title: 'VP of Research',
          patents_count: 9,
          expertise: 'Data Science, Analytics',
          linkedin: 'https://linkedin.com/in/janedoe'
        }
      ]
    }

    // Analizar datos de patentes con IA
    const prompt = `Analiza los siguientes datos de patentes y genera insights de venta:

DATOS DE PATENTES:
${JSON.stringify(patentData, null, 2)}

Genera en JSON:
{
  "innovation_profile": {
    "innovation_level": "high/medium/low",
    "focus_areas": ["áreas", "de", "enfoque", "tecnológico"],
    "competitive_positioning": "posicionamiento competitivo"
  },
  "sales_opportunities": [
    {
      "opportunity": "oportunidad específica",
      "based_on_patent": "patente que lo revela",
      "approach": "cómo abordar",
      "value_proposition": "propuesta de valor"
    }
  ],
  "conversation_intelligence": {
    "technical_talking_points": ["puntos", "técnicos", "para", "discutir"],
    "key_people_to_contact": ["inventores", "o", "líderes", "clave"],
    "technology_gaps": ["gaps", "tecnológicos", "que", "puedes", "llenar"]
  },
  "future_direction": "hacia dónde va la empresa técnicamente",
  "partnership_opportunities": ["oportunidades", "de", "partnership", "basadas", "en", "IP"],
  "budget_implications": "qué dicen las patentes sobre presupuesto de I+D"
}`

    let aiInsights = null
    try {
      const aiResponse = await analyzeWithDeepSeek(prompt)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      aiInsights = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch (e) {
      console.error('Error analyzing patent data:', e)
    }

    // Guardar datos de patentes
    await pool.query(`
      INSERT INTO company_patent_data (
        user_id, company_name, patent_data,
        total_patents, ai_insights, created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
    `, [
      req.user.id,
      companyName,
      JSON.stringify(patentData),
      patentData.total_patents,
      JSON.stringify(aiInsights)
    ])

    res.json({
      success: true,
      company: companyName,
      patent_data: patentData,
      ai_insights: aiInsights,
      recommendation: 'Alta actividad de I+D indica presupuesto y disposición para nuevas tecnologías'
    })

  } catch (error) {
    console.error('Error scraping patent data:', error)
    res.status(500).json({
      success: false,
      message: 'Error extrayendo datos de patentes',
      error: error.message
    })
  }
})

/**
 * 4. LEGAL PROCEEDINGS & COMPLIANCE
 * Monitorea procedimientos legales y compliance
 */
router.post('/legal-proceedings', protect, async (req, res) => {
  try {
    const { companyName } = req.body

    // Simular extracción de procedimientos legales
    const legalData = {
      company: companyName,
      active_litigation: [
        {
          case_name: 'Company vs CompetitorX - Patent Infringement',
          court: 'District Court Northern California',
          filing_date: '2023-05-15',
          status: 'Active',
          type: 'Patent Litigation',
          potential_impact: 'Material - seeking $10M damages',
          implications_for_sales: 'May affect product roadmap, discuss IP security'
        },
        {
          case_name: 'Customer ABC vs Company - Breach of Contract',
          court: 'State Court New York',
          filing_date: '2024-01-10',
          status: 'Settlement discussions',
          type: 'Commercial Dispute',
          potential_impact: 'Low - likely to settle',
          implications_for_sales: 'Shows importance of clear contracts'
        }
      ],

      regulatory_compliance: {
        certifications: [
          { name: 'SOC 2 Type II', status: 'Certified', valid_until: '2025-06-30' },
          { name: 'ISO 27001', status: 'Certified', valid_until: '2025-03-15' },
          { name: 'GDPR Compliant', status: 'Compliant', last_audit: '2024-01-20' },
          { name: 'HIPAA', status: 'Compliant', last_audit: '2023-11-10' }
        ],
        pending_certifications: [
          { name: 'FedRAMP', expected: '2025-Q2', significance: 'Government sales opportunity' }
        ],
        compliance_gaps: [
          'PCI DSS - In progress',
          'ISO 9001 - Planned for 2025'
        ]
      },

      regulatory_filings: [
        {
          agency: 'FTC',
          type: 'Data Privacy Notice',
          filing_date: '2024-02-01',
          status: 'Approved'
        },
        {
          agency: 'SEC',
          type: 'Material Event Disclosure',
          filing_date: '2024-01-15',
          event: 'Executive change'
        }
      ],

      risk_assessment: {
        legal_risk_score: 'Medium',
        compliance_maturity: 'High',
        regulatory_burden: 'Increasing',
        recommendations: [
          'Company is investing in compliance - good sign for enterprise readiness',
          'Pending FedRAMP means government sales push',
          'Patent litigation shows active IP protection'
        ]
      }
    }

    // Analizar datos legales con IA
    const prompt = `Analiza los siguientes datos legales y de compliance:

DATOS LEGALES:
${JSON.stringify(legalData, null, 2)}

Genera en JSON:
{
  "enterprise_readiness_score": 1-10,
  "sales_implications": [
    {
      "finding": "hallazgo específico",
      "implication": "qué significa",
      "how_to_use": "cómo usar en ventas"
    }
  ],
  "compliance_talking_points": ["puntos", "para", "mencionar", "en", "conversaciones"],
  "risk_factors_to_address": ["riesgos", "que", "el", "prospecto", "debe", "conocer"],
  "competitive_advantages": ["ventajas", "basadas", "en", "compliance"],
  "certification_timing": {
    "certifications_suggest": "qué sugieren las certificaciones sobre timing de compra",
    "best_contact_window": "mejor ventana para contacto"
  },
  "buyer_personas_alignment": ["qué buyers se preocupan por estos temas"]
}`

    let aiInsights = null
    try {
      const aiResponse = await analyzeWithDeepSeek(prompt)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      aiInsights = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch (e) {
      console.error('Error analyzing legal data:', e)
    }

    res.json({
      success: true,
      company: companyName,
      legal_data: legalData,
      ai_insights: aiInsights,
      recommendation: 'Menciona tus propias certificaciones si están al mismo nivel o superiores'
    })

  } catch (error) {
    console.error('Error scraping legal data:', error)
    res.status(500).json({
      success: false,
      message: 'Error extrayendo datos legales',
      error: error.message
    })
  }
})

// Crear tablas necesarias
const tables = [
  `CREATE TABLE IF NOT EXISTS company_financial_data (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255),
    ticker VARCHAR(20),
    financial_data JSONB,
    revenue VARCHAR(50),
    funding_raised VARCHAR(50),
    ai_insights JSONB,
    created_at TIMESTAMP DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS company_patent_data (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255),
    patent_data JSONB,
    total_patents INTEGER,
    ai_insights JSONB,
    created_at TIMESTAMP DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_financial_company ON company_financial_data(company_name)`,
  `CREATE INDEX IF NOT EXISTS idx_patent_company ON company_patent_data(company_name)`
]

tables.forEach(tableSQL => {
  pool.query(tableSQL).catch(err => console.error('Error creating table:', err))
})

export default router
