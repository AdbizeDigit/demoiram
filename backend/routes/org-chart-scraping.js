import express from 'express'
import { protect } from '../middleware/auth.js'
import axios from 'axios'
import * as cheerio from 'cheerio'
import { pool } from '../config/database.js'
import { analyzeWithDeepSeek } from '../services/deepseek.js'

const router = express.Router()

// ==========================================
// 👥 EMPLOYEE & ORG CHART SCRAPING SYSTEM
// ==========================================

/**
 * 1. BUILD COMPANY ORG CHART
 * Construye el organigrama de una empresa
 */
router.post('/build-org-chart', protect, async (req, res) => {
  try {
    const { companyName, companyDomain } = req.body

    // Simular extracción de estructura organizacional
    // En producción: scraping de LinkedIn, Crunchbase, ZoomInfo
    const orgChart = {
      company: companyName,
      total_employees: Math.floor(Math.random() * 5000) + 100,
      departments: [
        {
          name: 'Executive Leadership',
          head_count: 5,
          leaders: [
            {
              name: 'John Smith',
              title: 'CEO & Co-Founder',
              linkedin: 'https://linkedin.com/in/johnsmith',
              tenure: '5 years',
              previous_companies: ['Google', 'Facebook'],
              education: ['Stanford MBA', 'MIT Computer Science'],
              email_pattern: 'john.smith@' + companyDomain,
              reporting_to: null,
              team_size: 500
            },
            {
              name: 'Sarah Johnson',
              title: 'CFO',
              linkedin: 'https://linkedin.com/in/sarahjohnson',
              tenure: '2 years',
              previous_companies: ['Goldman Sachs', 'McKinsey'],
              education: ['Harvard MBA'],
              email_pattern: 'sarah.johnson@' + companyDomain,
              reporting_to: 'John Smith',
              team_size: 45
            },
            {
              name: 'Michael Chen',
              title: 'CTO',
              linkedin: 'https://linkedin.com/in/michaelchen',
              tenure: '4 years',
              previous_companies: ['Amazon', 'Stripe'],
              education: ['Stanford CS PhD'],
              email_pattern: 'michael.chen@' + companyDomain,
              reporting_to: 'John Smith',
              team_size: 120
            }
          ]
        },
        {
          name: 'Engineering',
          head_count: 120,
          leaders: [
            {
              name: 'Alex Rodriguez',
              title: 'VP of Engineering',
              linkedin: 'https://linkedin.com/in/alexrodriguez',
              tenure: '3 years',
              previous_companies: ['Netflix', 'Airbnb'],
              education: ['UC Berkeley CS'],
              email_pattern: 'alex.rodriguez@' + companyDomain,
              reporting_to: 'Michael Chen',
              team_size: 120
            },
            {
              name: 'Emily Zhang',
              title: 'Director of Backend Engineering',
              linkedin: 'https://linkedin.com/in/emilyzhang',
              tenure: '2 years',
              previous_companies: ['Uber', 'Twitter'],
              education: ['Carnegie Mellon CS'],
              email_pattern: 'emily.zhang@' + companyDomain,
              reporting_to: 'Alex Rodriguez',
              team_size: 45
            }
          ]
        },
        {
          name: 'Sales',
          head_count: 80,
          leaders: [
            {
              name: 'David Martinez',
              title: 'VP of Sales',
              linkedin: 'https://linkedin.com/in/davidmartinez',
              tenure: '1 year',
              previous_companies: ['Salesforce', 'Oracle'],
              education: ['Northwestern MBA'],
              email_pattern: 'david.martinez@' + companyDomain,
              reporting_to: 'John Smith',
              team_size: 80,
              recent_hire: true
            },
            {
              name: 'Lisa Thompson',
              title: 'Director of Enterprise Sales',
              linkedin: 'https://linkedin.com/in/lisathompson',
              tenure: '6 months',
              previous_companies: ['HubSpot', 'Adobe'],
              education: ['USC Business'],
              email_pattern: 'lisa.thompson@' + companyDomain,
              reporting_to: 'David Martinez',
              team_size: 30,
              recent_hire: true
            }
          ]
        },
        {
          name: 'Marketing',
          head_count: 35,
          leaders: [
            {
              name: 'Jennifer Lee',
              title: 'CMO',
              linkedin: 'https://linkedin.com/in/jenniferlee',
              tenure: '8 months',
              previous_companies: ['Dropbox', 'Slack'],
              education: ['Columbia MBA'],
              email_pattern: 'jennifer.lee@' + companyDomain,
              reporting_to: 'John Smith',
              team_size: 35,
              recent_hire: true
            }
          ]
        },
        {
          name: 'Product',
          head_count: 50,
          leaders: [
            {
              name: 'Kevin Park',
              title: 'VP of Product',
              linkedin: 'https://linkedin.com/in/kevinpark',
              tenure: '3 years',
              previous_companies: ['LinkedIn', 'PayPal'],
              education: ['Stanford MS'],
              email_pattern: 'kevin.park@' + companyDomain,
              reporting_to: 'John Smith',
              team_size: 50
            }
          ]
        }
      ],
      recent_executive_hires: [
        {
          name: 'David Martinez',
          title: 'VP of Sales',
          hired_date: '1 year ago',
          significance: 'New sales leader - likely bringing new strategies'
        },
        {
          name: 'Jennifer Lee',
          title: 'CMO',
          hired_date: '8 months ago',
          significance: 'Marketing expansion - company investing in growth'
        },
        {
          name: 'Lisa Thompson',
          title: 'Director of Enterprise Sales',
          hired_date: '6 months ago',
          significance: 'Enterprise focus - targeting larger deals'
        }
      ],
      growth_signals: {
        hiring_velocity: 'High - 15% headcount growth last quarter',
        expanding_departments: ['Sales', 'Marketing', 'Engineering'],
        new_offices: ['New York', 'London'],
        leadership_changes: 3
      }
    }

    // Analizar org chart con IA para estrategia
    const prompt = `Analiza el siguiente organigrama de una empresa y genera una estrategia de account-based selling:

ORG CHART:
${JSON.stringify(orgChart, null, 2)}

Genera en JSON:
{
  "key_decision_makers": [
    {
      "name": "nombre",
      "title": "título",
      "influence_level": 1-10,
      "role_in_buying": "economic buyer/champion/influencer/user",
      "contact_priority": 1-10,
      "best_approach": "cómo contactar",
      "pain_points": ["pain points", "basados", "en", "su", "rol"],
      "value_proposition": "propuesta de valor específica para esta persona"
    }
  ],
  "org_health_signals": {
    "funding_likelihood": "high/medium/low",
    "expansion_mode": true/false,
    "challenges": ["desafíos", "organizacionales", "detectados"]
  },
  "multi_threading_strategy": {
    "champions_to_identify": ["roles", "que", "podrían", "ser", "champions"],
    "economic_buyers": ["roles", "con", "poder", "de", "compra"],
    "technical_evaluators": ["roles", "que", "evaluarán", "técnicamente"],
    "end_users": ["roles", "que", "usarán", "el", "producto"]
  },
  "account_penetration_plan": {
    "entry_point": "mejor punto de entrada",
    "escalation_path": ["ruta", "de", "escalación", "dentro", "de", "la", "org"],
    "consensus_building": "cómo construir consenso interno"
  },
  "timing_insights": "mejor momento para contactar basado en contrataciones recientes",
  "competitive_intel": "insights competitivos basados en experiencia previa del equipo"
}`

    let aiStrategy = null
    try {
      const aiResponse = await analyzeWithDeepSeek(prompt)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      aiStrategy = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch (e) {
      console.error('Error generating strategy:', e)
    }

    // Guardar org chart
    await pool.query(`
      INSERT INTO company_org_charts (
        user_id, company_name, company_domain, org_data,
        total_employees, ai_strategy, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `, [
      req.user.id,
      companyName,
      companyDomain,
      JSON.stringify(orgChart),
      orgChart.total_employees,
      JSON.stringify(aiStrategy)
    ])

    res.json({
      success: true,
      company: companyName,
      org_chart: orgChart,
      ai_strategy: aiStrategy,
      recommendation: 'Usa multi-threading: contacta a múltiples personas en diferentes niveles simultáneamente'
    })

  } catch (error) {
    console.error('Error building org chart:', error)
    res.status(500).json({
      success: false,
      message: 'Error construyendo organigrama',
      error: error.message
    })
  }
})

/**
 * 2. FIND DECISION MAKERS
 * Encuentra decision makers específicos por rol
 */
router.post('/find-decision-makers', protect, async (req, res) => {
  try {
    const { companyName, targetRoles = ['CTO', 'VP Engineering', 'Head of Data'] } = req.body

    const decisionMakers = targetRoles.map(role => ({
      company: companyName,
      target_role: role,
      identified_person: {
        name: `${role} at ${companyName}`,
        title: role,
        linkedin: `https://linkedin.com/in/${role.toLowerCase().replace(/\s+/g, '-')}`,
        email_likely: `${role.toLowerCase().replace(/\s+/g, '.')}@company.com`,
        phone: null,
        tenure: Math.floor(Math.random() * 5) + 1 + ' years',
        previous_roles: [
          { company: 'Previous Corp', title: 'Senior ' + role, duration: '3 years' },
          { company: 'Startup Inc', title: 'Manager', duration: '2 years' }
        ],
        education: ['Top University', 'Advanced Degree'],
        certifications: ['AWS Certified', 'Industry Certification'],
        publications: Math.floor(Math.random() * 5),
        speaking_engagements: Math.floor(Math.random() * 10),
        social_activity_level: 'High',
        interests: ['AI/ML', 'Cloud Architecture', 'Team Building'],
        likely_pain_points: [
          'Scaling technical infrastructure',
          'Hiring and retaining talent',
          'Managing technical debt',
          'Budget constraints'
        ]
      },
      contact_info: {
        linkedin_url: `https://linkedin.com/in/${role.toLowerCase().replace(/\s+/g, '-')}`,
        email_patterns: [
          `${role.split(' ').map(w => w[0].toLowerCase()).join('')}@company.com`,
          `${role.toLowerCase().replace(/\s+/g, '.')}@company.com`,
          `${role.split(' ')[0].toLowerCase()}@company.com`
        ],
        direct_phone: 'Not available',
        office_phone: '+1 (555) 123-4567',
        assistant_name: Math.random() > 0.5 ? 'Executive Assistant' : null
      },
      engagement_opportunities: [
        {
          type: 'LinkedIn connection',
          message_template: `Hi [Name], I noticed your work in [area]. Would love to connect and share insights about [relevant topic].`
        },
        {
          type: 'Email outreach',
          subject_line: `Quick idea for ${companyName}'s [pain point]`,
          preview: `Hi [Name], I saw that ${companyName} recently...`
        },
        {
          type: 'Event-based',
          trigger: 'Speaking at conference or posting about relevant topic'
        }
      ],
      buying_influence: {
        role_type: determineBuyingRole(role),
        budget_authority: hasbudgetAuthority(role),
        technical_evaluation: needsTechnicalEval(role),
        influence_score: Math.floor(Math.random() * 40) + 60
      }
    }))

    res.json({
      success: true,
      company: companyName,
      decision_makers: decisionMakers,
      total_identified: decisionMakers.length,
      recommendation: 'Contacta primero a personas con mayor influence_score y budget_authority'
    })

  } catch (error) {
    console.error('Error finding decision makers:', error)
    res.status(500).json({
      success: false,
      message: 'Error encontrando decision makers',
      error: error.message
    })
  }
})

/**
 * 3. TRACK EMPLOYEE CHANGES
 * Detecta cambios en empleados (nuevos, salidas, promociones)
 */
router.post('/track-employee-changes', protect, async (req, res) => {
  try {
    const { companyName, companyDomain } = req.body

    // Simular detección de cambios de empleados
    const employeeChanges = {
      company: companyName,
      tracking_period: 'Last 30 days',
      new_hires: [
        {
          name: 'Alex Johnson',
          title: 'VP of Sales',
          department: 'Sales',
          start_date: '2 weeks ago',
          previous_company: 'Salesforce',
          linkedin: 'https://linkedin.com/in/alexjohnson',
          significance: 'HIGH - New sales leader likely bringing new initiatives',
          opportunity: 'Perfect timing to introduce sales enablement tools',
          contact_window: '30-90 days (building initial strategy)'
        },
        {
          name: 'Maria Garcia',
          title: 'Head of Data Engineering',
          department: 'Engineering',
          start_date: '1 week ago',
          previous_company: 'Netflix',
          linkedin: 'https://linkedin.com/in/mariagarcia',
          significance: 'HIGH - New data leader will evaluate current stack',
          opportunity: 'Data infrastructure and analytics solutions',
          contact_window: '60-90 days (assessment phase)'
        },
        {
          name: 'Robert Kim',
          title: 'Product Marketing Manager',
          department: 'Marketing',
          start_date: '3 weeks ago',
          previous_company: 'Adobe',
          linkedin: 'https://linkedin.com/in/robertkim',
          significance: 'MEDIUM - Building product marketing function',
          opportunity: 'Marketing automation and analytics tools',
          contact_window: '30-60 days'
        }
      ],
      departures: [
        {
          name: 'Former CTO',
          title: 'CTO',
          department: 'Engineering',
          departure_date: '1 month ago',
          reason_likely: 'Unknown - moved to competitor',
          significance: 'HIGH - Leadership gap in technology',
          opportunity: 'Interim period = easier to change existing vendors',
          next_steps: 'Find who is acting CTO or new hire'
        }
      ],
      promotions: [
        {
          name: 'Jennifer Wu',
          previous_title: 'Senior Director of Engineering',
          new_title: 'VP of Engineering',
          promotion_date: '2 weeks ago',
          significance: 'MEDIUM - Expanded scope and budget',
          opportunity: 'Congratulate and offer solutions for new responsibilities',
          contact_angle: 'Help scale team and processes'
        }
      ],
      team_expansions: [
        {
          department: 'Sales',
          new_headcount: 15,
          period: 'Last quarter',
          significance: 'HIGH - Major sales expansion',
          opportunity: 'Sales enablement, CRM, automation tools'
        },
        {
          department: 'Engineering',
          new_headcount: 25,
          period: 'Last quarter',
          significance: 'HIGH - Product development acceleration',
          opportunity: 'Dev tools, infrastructure, collaboration software'
        }
      ],
      change_summary: {
        total_new_hires: 3,
        total_departures: 1,
        total_promotions: 1,
        net_headcount_change: '+39 employees',
        growth_rate: '12% quarter-over-quarter'
      }
    }

    // Analizar cambios con IA para oportunidades
    const prompt = `Analiza los siguientes cambios de empleados y genera una estrategia de outreach:

CAMBIOS DE EMPLEADOS:
${JSON.stringify(employeeChanges, null, 2)}

Genera en JSON:
{
  "highest_priority_contacts": [
    {
      "person": "nombre y título",
      "why": "por qué contactar ahora",
      "timing": "cuándo es el mejor momento",
      "approach": "mejor enfoque de contacto",
      "message_angle": "ángulo del mensaje"
    }
  ],
  "organizational_insights": {
    "strategic_direction": "hacia dónde va la empresa basado en contrataciones",
    "budget_availability": "estimación de presupuesto disponible",
    "pain_points": ["pain points", "revelados", "por", "contrataciones"],
    "expansion_areas": ["áreas", "de", "expansión"]
  },
  "timing_windows": [
    {
      "person": "nombre",
      "ideal_contact_date": "fecha estimada",
      "reason": "por qué ese timing"
    }
  ],
  "competitive_opportunities": ["oportunidades", "para", "desplazar", "competidores"]
}`

    let aiInsights = null
    try {
      const aiResponse = await analyzeWithDeepSeek(prompt)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      aiInsights = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch (e) {
      console.error('Error analyzing employee changes:', e)
    }

    // Guardar cambios
    await pool.query(`
      INSERT INTO employee_changes_tracking (
        user_id, company_name, company_domain, changes_data,
        new_hires_count, ai_insights, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `, [
      req.user.id,
      companyName,
      companyDomain,
      JSON.stringify(employeeChanges),
      employeeChanges.new_hires.length,
      JSON.stringify(aiInsights)
    ])

    res.json({
      success: true,
      company: companyName,
      employee_changes: employeeChanges,
      ai_insights: aiInsights,
      recommendation: 'Contacta a nuevos líderes en sus primeros 90 días - más abiertos a cambios'
    })

  } catch (error) {
    console.error('Error tracking employee changes:', error)
    res.status(500).json({
      success: false,
      message: 'Error rastreando cambios de empleados',
      error: error.message
    })
  }
})

/**
 * 4. MAP REPORTING STRUCTURE
 * Mapea la estructura de reporting para multi-threading
 */
router.post('/map-reporting-structure', protect, async (req, res) => {
  try {
    const { companyName, targetDepartment = 'Engineering' } = req.body

    const reportingStructure = {
      company: companyName,
      department: targetDepartment,
      hierarchy: {
        c_level: {
          title: 'CTO',
          name: 'Michael Chen',
          reports_to: 'CEO',
          team_size: 150,
          direct_reports: 3
        },
        vp_level: {
          title: 'VP of Engineering',
          name: 'Alex Rodriguez',
          reports_to: 'Michael Chen (CTO)',
          team_size: 120,
          direct_reports: 4
        },
        director_level: [
          {
            title: 'Director of Backend Engineering',
            name: 'Emily Zhang',
            reports_to: 'Alex Rodriguez (VP Engineering)',
            team_size: 45,
            direct_reports: 6
          },
          {
            title: 'Director of Frontend Engineering',
            name: 'Tom Wilson',
            reports_to: 'Alex Rodriguez (VP Engineering)',
            team_size: 35,
            direct_reports: 5
          },
          {
            title: 'Director of DevOps',
            name: 'Lisa Chen',
            reports_to: 'Alex Rodriguez (VP Engineering)',
            team_size: 25,
            direct_reports: 4
          }
        ],
        manager_level: [
          {
            title: 'Engineering Manager - Platform',
            name: 'John Davis',
            reports_to: 'Emily Zhang (Director Backend)',
            team_size: 12,
            direct_reports: 12
          },
          {
            title: 'Engineering Manager - API',
            name: 'Sarah Miller',
            reports_to: 'Emily Zhang (Director Backend)',
            team_size: 15,
            direct_reports: 15
          }
        ]
      },
      decision_flow: {
        budget_decisions: 'CTO → CFO → CEO',
        technical_decisions: 'Engineering Managers → Directors → VP → CTO',
        vendor_selection: 'VP Engineering + Director + End Users',
        procurement: 'Procurement Team + Legal + Finance'
      },
      multi_threading_map: {
        champion_targets: ['Engineering Managers', 'Directors'],
        economic_buyer: 'CTO or VP Engineering',
        technical_evaluators: ['Senior Engineers', 'Architects'],
        end_users: ['Individual Contributors'],
        influencers: ['Product Management', 'Security Team']
      }
    }

    // Generar estrategia de multi-threading
    const prompt = `Basándote en esta estructura de reporting, genera una estrategia de multi-threading para un enterprise sale:

ESTRUCTURA DE REPORTING:
${JSON.stringify(reportingStructure, null, 2)}

Genera en JSON:
{
  "multi_threading_strategy": {
    "phase_1_entry": {
      "target_personas": ["roles", "para", "contactar", "primero"],
      "approach": "cómo hacer el primer contacto",
      "goal": "qué lograr en esta fase"
    },
    "phase_2_expansion": {
      "target_personas": ["roles", "para", "expandir"],
      "approach": "cómo expandir dentro de la org",
      "goal": "construir consenso"
    },
    "phase_3_closing": {
      "target_personas": ["roles", "para", "cerrar"],
      "approach": "cómo escalar al economic buyer",
      "goal": "cerrar el deal"
    }
  },
  "influence_map": [
    {
      "persona": "rol",
      "influence_on_decision": 1-10,
      "best_message_angle": "ángulo del mensaje",
      "what_they_care_about": ["preocupaciones", "principales"]
    }
  ],
  "stakeholder_engagement_sequence": [
    {
      "week": 1,
      "contact": "quién",
      "action": "qué hacer",
      "goal": "objetivo"
    }
  ],
  "internal_champion_profile": "perfil ideal de champion en esta org"
}`

    let threadingStrategy = null
    try {
      const aiResponse = await analyzeWithDeepSeek(prompt)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      threadingStrategy = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch (e) {
      console.error('Error generating threading strategy:', e)
    }

    res.json({
      success: true,
      company: companyName,
      department: targetDepartment,
      reporting_structure: reportingStructure,
      multi_threading_strategy: threadingStrategy,
      recommendation: 'Nunca dependas de una sola persona - siempre multi-thread en enterprise deals'
    })

  } catch (error) {
    console.error('Error mapping reporting structure:', error)
    res.status(500).json({
      success: false,
      message: 'Error mapeando estructura de reporting',
      error: error.message
    })
  }
})

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function determineBuyingRole(title) {
  const economicBuyers = ['CEO', 'CFO', 'COO', 'CTO', 'CIO', 'VP']
  const champions = ['Director', 'Head of', 'Lead']
  const influencers = ['Manager', 'Principal', 'Staff']
  const users = ['Engineer', 'Analyst', 'Specialist']

  const titleLower = title.toLowerCase()

  if (economicBuyers.some(role => titleLower.includes(role.toLowerCase()))) {
    return 'Economic Buyer'
  } else if (champions.some(role => titleLower.includes(role.toLowerCase()))) {
    return 'Champion/Influencer'
  } else if (influencers.some(role => titleLower.includes(role.toLowerCase()))) {
    return 'Influencer'
  } else if (users.some(role => titleLower.includes(role.toLowerCase()))) {
    return 'End User'
  }

  return 'Unknown'
}

function hasbudgetAuthority(title) {
  const budgetRoles = ['CEO', 'CFO', 'COO', 'CTO', 'CIO', 'VP', 'Chief']
  return budgetRoles.some(role => title.toLowerCase().includes(role.toLowerCase()))
}

function needsTechnicalEval(title) {
  const techRoles = ['CTO', 'VP Engineering', 'Director', 'Architect', 'Principal Engineer']
  return techRoles.some(role => title.toLowerCase().includes(role.toLowerCase()))
}

// Crear tablas necesarias
const tables = [
  `CREATE TABLE IF NOT EXISTS company_org_charts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255),
    company_domain VARCHAR(255),
    org_data JSONB,
    total_employees INTEGER,
    ai_strategy JSONB,
    created_at TIMESTAMP DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS employee_changes_tracking (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255),
    company_domain VARCHAR(255),
    changes_data JSONB,
    new_hires_count INTEGER,
    ai_insights JSONB,
    created_at TIMESTAMP DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_org_chart_company ON company_org_charts(company_name)`,
  `CREATE INDEX IF NOT EXISTS idx_employee_changes_company ON employee_changes_tracking(company_name)`
]

tables.forEach(tableSQL => {
  pool.query(tableSQL).catch(err => console.error('Error creating table:', err))
})

export default router
