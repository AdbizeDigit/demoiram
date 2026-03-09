import express from 'express'
import { protect } from '../middleware/auth.js'
import { pool } from '../config/database.js'

const router = express.Router()

router.post('/intel', protect, async (req, res) => {
  try {
    const user = req.user

    if (!user || user.email !== 'contacto@adbize.com') {
      return res.status(403).json({ message: 'No autorizado para usar el módulo de scrapping inteligente' })
    }

    const { companyName, website, industry, focus } = req.body

    let domain = null
    if (website) {
      try {
        const url = new URL(website)
        domain = url.hostname.replace(/^www\./, '')
      } catch (e) {
        domain = null
      }
    }

    const companyBase = {
      name: companyName || 'Empresa objetivo',
      website: website || '',
      industry: industry || 'Sin especificar'
    }

    const painSignals = [
      {
        label: 'Ineficiencia operativa',
        severity: 'alta',
        description:
          'La empresa menciona retrasos, fricción entre sistemas y dependencia de procesos manuales en operaciones clave.'
      },
      {
        label: 'Coste elevado de adquisición de clientes',
        severity: 'media',
        description:
          'Señalan que el CAC ha aumentado y que necesitan mejorar la segmentación y personalización de campañas.'
      },
      {
        label: 'Necesidad explícita de automatización',
        severity: 'alta',
        description:
          'Buscan perfiles de automatización de procesos, data engineers y especialistas en IA para optimizar flujos internos.'
      }
    ]

    const techStack = {
      web: [
        'Stack típico: React/Next.js en frontend, Node.js o Java en backend',
        'Uso de CDN y servicios cloud para servir contenido a escala'
      ],
      data: [
        'Base de datos relacional (PostgreSQL / MySQL) combinada con data warehouse en la nube',
        'Uso de herramientas de BI (Looker, Power BI, Tableau) para reporting ejecutivo'
      ],
      ai: [
        'Integraciones puntuales con APIs de IA (traducción, visión, NLP básico)',
        'Interés en proyectos de machine learning aplicado a operaciones y revenue'
      ]
    }

    const contacts = [
      {
        name: 'Dirección de Tecnología (CTO / CIO)',
        role: 'Líder de transformación tecnológica',
        type: 'Decisor principal',
        confidence: 0.9,
        notes: 'Ownership sobre el roadmap de IA y automatización. Ideal para conversaciones de arquitectura y visión.'
      },
      {
        name: 'Head of Data / Analytics',
        role: 'Responsable de datos y analítica',
        type: 'Influenciador clave',
        confidence: 0.85,
        notes: 'Perfil muy sensible a problemas de calidad de datos, latencia y falta de automatización analítica.'
      },
      {
        name: 'Head of Operations / Supply Chain',
        role: 'Responsable de operaciones críticas',
        type: 'Sponsor de negocio',
        confidence: 0.82,
        notes: 'Sufre directamente las ineficiencias operativas, ideal para casos de uso con impacto en P&L.'
      }
    ]

    const buyEvents = [
      {
        type: 'Nuevo CTO/CIO',
        description:
          'Nombramiento reciente de un líder tecnológico con mandato explícito de modernización e innovación.',
        window: '0-90 días desde el anuncio',
        playbook:
          'Conectar la propuesta directamente con su agenda de primeros 100 días y quick wins de automatización.'
      },
      {
        type: 'Ronda de inversión reciente',
        description:
          'Compañía ha levantado capital para acelerar producto, crecimiento y eficiencia operativa.',
        window: '0-180 días desde el anuncio',
        playbook:
          'Enfocar el mensaje en cómo la IA acelera el uso eficiente del capital y reduce desperdicio operativo.'
      },
      {
        type: 'Adquisición o fusión',
        description:
          'Integración de sistemas, equipos y procesos tras una M&A.',
        window: '0-12 meses desde el anuncio',
        playbook:
          'Proponer IA para armonizar procesos, detectar riesgos y crear visibilidad centralizada en la nueva estructura.'
      }
    ]

    const leadScore = {
      score: 0.86,
      tier: 'Alta',
      reasons: [
        'Múltiples señales explícitas de ineficiencia operativa y necesidad de automatización',
        'Uso actual de datos y analytics sugiere madurez suficiente para desplegar IA aplicada',
        'Eventos corporativos recientes aumentan urgencia para ejecutar proyectos de alto impacto'
      ]
    }

    const emailSuggestions = {
      subject:
        'Idea para reducir ineficiencias operativas en {empresa} usando IA aplicada (sin reescribir todo tu stack)',
      opener:
        'He estado revisando las últimas noticias y roles que están contratando en {empresa}, y parece que están en un momento clave para ganar eficiencia operativa con IA aplicada, sin tener que rehacer todo lo que ya funciona.',
      angle:
        'Conectar un caso de uso concreto (por ejemplo, reducción de errores, predicción de demanda o automatización de reporting) con las señales de dolor detectadas, proponiendo un piloto acotado de 6-8 semanas con métricas claras de éxito.',
      followUpWindow: 'Secuencia de 3-4 emails en 21 días, con un follow up adicional a los 3 y 6 meses.'
    }

    const riskNotes = {
      compliance:
        'Limitarse a datos públicos y a emails corporativos. Respetar bajas, preferencias de contacto y normativa (GDPR/CCPA).',
      ipRotation:
        'Usar rotación de IPs, backoff exponencial y límites de frecuencia para evitar bloqueos y proteger la reputación técnica.',
      selectors:
        'Diseñar scrapers con selectores resilientes (CSS/XPath), tests automáticos y alertas cuando cambien las estructuras de las páginas.'
    }

    let companyRow
    try {
      const companyResult = await pool.query(
        `INSERT INTO scraping_companies (created_by_user_id, name, website, domain, industry)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (domain) DO UPDATE SET
           name = EXCLUDED.name,
           website = EXCLUDED.website,
           industry = EXCLUDED.industry,
           updated_at = NOW()
         RETURNING id, name, website, industry, domain`,
        [user.id, companyBase.name, companyBase.website, domain, companyBase.industry]
      )
      companyRow = companyResult.rows[0]
    } catch (dbError) {
      console.error('Error guardando empresa de scrapping:', dbError)
    }

    let runId = null
    try {
      const runResult = await pool.query(
        `INSERT INTO scraping_runs (
           user_id, company_id,
           input_company_name, input_website, input_industry,
           focus_pains, focus_tech, focus_contacts, focus_events,
           status, lead_score, lead_tier, raw_score
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'completed', $10, $11, $12)
         RETURNING id`,
        [
          user.id,
          companyRow ? companyRow.id : null,
          companyName || null,
          website || null,
          industry || null,
          !focus || focus.pains !== false,
          !focus || focus.tech !== false,
          !focus || focus.contacts !== false,
          !focus || focus.events !== false,
          leadScore.score,
          leadScore.tier,
          JSON.stringify(leadScore)
        ]
      )
      runId = runResult.rows[0]?.id || null
    } catch (dbError) {
      console.error('Error guardando ejecución de scrapping:', dbError)
    }

    if (runId && companyRow) {
      if (!focus || focus.pains !== false) {
        for (const ps of painSignals) {
          try {
            await pool.query(
              `INSERT INTO scraping_pain_signals (run_id, company_id, label, severity, source_type, description)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [runId, companyRow.id, ps.label, ps.severity, 'analysis', ps.description]
            )
          } catch (dbError) {
            console.error('Error guardando pain signal:', dbError)
          }
        }
      }

      if (!focus || focus.tech !== false) {
        const insertTech = async (category, items) => {
          for (const tech of items) {
            try {
              await pool.query(
                `INSERT INTO scraping_tech_signals (run_id, company_id, category, technology, confidence, source_type)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [runId, companyRow.id, category, tech, 0.8, 'analysis']
              )
            } catch (dbError) {
              console.error('Error guardando tech signal:', dbError)
            }
          }
        }

        await insertTech('web', techStack.web)
        await insertTech('data', techStack.data)
        await insertTech('ai', techStack.ai)
      }

      if (!focus || focus.contacts !== false) {
        for (const contact of contacts) {
          try {
            await pool.query(
              `INSERT INTO scraping_contacts (
                 run_id, company_id, full_name, role, type, seniority,
                 email, email_type, confidence, notes
               )
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
              [
                runId,
                companyRow.id,
                contact.name,
                contact.role,
                contact.type,
                null,
                null,
                'unknown',
                contact.confidence || 0.8,
                contact.notes || null
              ]
            )
          } catch (dbError) {
            console.error('Error guardando contacto de scrapping:', dbError)
          }
        }
      }

      if (!focus || focus.events !== false) {
        for (const ev of buyEvents) {
          try {
            await pool.query(
              `INSERT INTO scraping_buy_events (
                 run_id, company_id, event_type, description, window_text, playbook, confidence
               )
               VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [runId, companyRow.id, ev.type, ev.description, ev.window, ev.playbook, 0.8]
            )
          } catch (dbError) {
            console.error('Error guardando evento de compra:', dbError)
          }
        }
      }

      try {
        await pool.query(
          `INSERT INTO scraping_email_suggestions (
             run_id, company_id, subject, opener, angle, follow_up_window
           )
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            runId,
            companyRow.id,
            emailSuggestions.subject,
            emailSuggestions.opener,
            emailSuggestions.angle,
            emailSuggestions.followUpWindow
          ]
        )
      } catch (dbError) {
        console.error('Error guardando email suggestion:', dbError)
      }

      try {
        await pool.query(
          `INSERT INTO scraping_risk_notes (
             run_id, compliance_note, ip_rotation_note, selectors_note
           )
           VALUES ($1, $2, $3, $4)`,
          [
            runId,
            riskNotes.compliance,
            riskNotes.ipRotation,
            riskNotes.selectors
          ]
        )
      } catch (dbError) {
        console.error('Error guardando risk notes:', dbError)
      }
    }

    const company = companyRow || companyBase

    const payload = {
      runId,
      company,
      painSignals: focus && focus.pains === false ? [] : painSignals,
      techStack: focus && focus.tech === false ? {} : techStack,
      contacts: focus && focus.contacts === false ? [] : contacts,
      buyEvents: focus && focus.events === false ? [] : buyEvents,
      leadScore,
      emailSuggestions,
      riskNotes
    }

    res.json(payload)
  } catch (error) {
    console.error('Scraping intel error:', error)
    res.status(500).json({ message: 'Error al generar inteligencia de scrapping', error: error.message })
  }
})

export default router
