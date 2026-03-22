import { pool } from '../config/database.js'
import { analyzeWithDeepSeek } from './deepseek.js'
import axios from 'axios'
import * as cheerio from 'cheerio'
import { EventEmitter } from 'events'

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
]

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }
function randomUA() { return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)] }

// ── Table Init ────────────────────────────────────────────────────────────────
async function initAgentTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_agents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      avatar_id UUID,
      target_type VARCHAR(50) NOT NULL,
      search_keywords TEXT[] DEFAULT '{}',
      strategy TEXT DEFAULT '',
      status VARCHAR(20) DEFAULT 'idle',
      channels TEXT[] DEFAULT '{email,whatsapp}',
      max_contacts_per_run INT DEFAULT 10,
      contacts_found INT DEFAULT 0,
      messages_sent INT DEFAULT 0,
      responses_received INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS agent_activity_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
      action VARCHAR(50) NOT NULL,
      detail TEXT,
      target_name VARCHAR(200),
      target_company VARCHAR(200),
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `)
}

// ── Log Helper ────────────────────────────────────────────────────────────────
async function logActivity(agentId, action, detail, targetName, targetCompany, metadata = {}) {
  await pool.query(
    `INSERT INTO agent_activity_logs (agent_id, action, detail, target_name, target_company, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [agentId, action, detail, targetName || null, targetCompany || null, JSON.stringify(metadata)]
  )
}

// ── Target Search Queries ─────────────────────────────────────────────────────
const TARGET_QUERIES = {
  business_owners: [
    'CEO empresa tecnologia Mexico necesita software 2026',
    'director general startup Mexico buscando desarrollador app',
    'fundador empresa Mexico transformacion digital',
    'dueño empresa PYME Mexico necesita pagina web app',
    'empresario Mexico busca automatizar procesos con IA',
  ],
  celebrities: [
    'celebridad influencer Mexico lanza marca necesita app',
    'famoso mexicano nuevo negocio digital plataforma',
    'influencer latinoamerica busca desarrollar aplicacion',
    'artista mexicano proyecto digital ecommerce',
  ],
  politicians: [
    'gobierno Mexico licitacion plataforma digital 2026',
    'municipio Mexico modernizacion sistemas tecnologia',
    'secretaria Mexico proyecto digitalizacion gobierno',
    'gobierno estatal Mexico app servicios ciudadanos',
  ],
  startups: [
    'startup Mexico ronda inversion busca equipo desarrollo',
    'startup latinoamerica necesita CTO desarrollador',
    'emprendedor Mexico idea app busca desarrollador',
    'aceleradora Mexico startups tecnologia nuevas',
  ],
  enterprises: [
    'empresa grande Mexico modernizar ERP sistemas',
    'corporativo Mexico migrar nube cloud',
    'empresa mexicana busca proveedor software IA',
    'multinacional Mexico outsourcing desarrollo nearshoring',
  ],
}

// ── Agent Runner ──────────────────────────────────────────────────────────────
class AgentRunnerService extends EventEmitter {
  constructor() {
    super()
    this.runningAgents = new Map() // agentId -> { abort: bool }
    this.initialized = false
  }

  static getInstance() {
    if (!AgentRunnerService._instance) {
      AgentRunnerService._instance = new AgentRunnerService()
    }
    return AgentRunnerService._instance
  }

  async init() {
    if (this.initialized) return
    await initAgentTables()
    this.initialized = true
  }

  async startAgent(agentId) {
    await this.init()
    if (this.runningAgents.has(agentId)) {
      return { success: false, message: 'Agente ya esta corriendo' }
    }

    const agentRes = await pool.query('SELECT * FROM ai_agents WHERE id = $1', [agentId])
    if (!agentRes.rows.length) return { success: false, message: 'Agente no encontrado' }

    const agent = agentRes.rows[0]
    const control = { abort: false }
    this.runningAgents.set(agentId, control)

    await pool.query("UPDATE ai_agents SET status = 'running', updated_at = NOW() WHERE id = $1", [agentId])
    await logActivity(agentId, 'started', `Agente "${agent.name}" iniciado. Objetivo: ${agent.target_type}`, null, null)

    // Run in background
    this._runAgentLoop(agent, control).catch(err => {
      console.error(`[Agent ${agentId}] Fatal error:`, err.message)
    })

    return { success: true, message: 'Agente iniciado' }
  }

  async stopAgent(agentId) {
    const control = this.runningAgents.get(agentId)
    if (!control) return { success: false, message: 'Agente no esta corriendo' }

    control.abort = true
    this.runningAgents.delete(agentId)
    await pool.query("UPDATE ai_agents SET status = 'idle', updated_at = NOW() WHERE id = $1", [agentId])
    await logActivity(agentId, 'stopped', 'Agente detenido por el usuario', null, null)
    return { success: true }
  }

  async _runAgentLoop(agent, control) {
    const agentId = agent.id
    try {
      // 1. Get avatar info if assigned
      let avatar = null
      if (agent.avatar_id) {
        const avRes = await pool.query('SELECT * FROM avatars WHERE id = $1', [agent.avatar_id])
        avatar = avRes.rows[0] || null
      }

      // 2. Determine search queries
      const customKeywords = agent.search_keywords?.filter(k => k.trim()) || []
      const baseQueries = TARGET_QUERIES[agent.target_type] || TARGET_QUERIES.business_owners
      const queries = customKeywords.length > 0
        ? customKeywords.map(k => `${k} Mexico contacto email`)
        : baseQueries

      await logActivity(agentId, 'searching', `Buscando targets con ${queries.length} queries...`, null, null, { queries })

      let totalFound = 0

      for (const query of queries) {
        if (control.abort) break

        await logActivity(agentId, 'searching', `Buscando: "${query}"`, null, null)

        // 3. Search DuckDuckGo
        const results = await this._searchDuckDuckGo(query)
        await logActivity(agentId, 'search_results', `${results.length} resultados encontrados para "${query.slice(0, 50)}"`, null, null)

        for (const result of results.slice(0, 3)) {
          if (control.abort || totalFound >= agent.max_contacts_per_run) break

          // 4. Extract contact info from each result
          await logActivity(agentId, 'analyzing', `Analizando: ${result.title.slice(0, 80)}`, null, null, { url: result.url })

          const contactInfo = await this._extractContactInfo(result)
          if (!contactInfo || (!contactInfo.email && !contactInfo.phone)) {
            await logActivity(agentId, 'no_contact', `Sin datos de contacto en: ${result.title.slice(0, 60)}`, contactInfo?.name, contactInfo?.company)
            continue
          }

          totalFound++

          await logActivity(agentId, 'found_target',
            `Contacto encontrado: ${contactInfo.name || 'Desconocido'} - ${contactInfo.company || result.title.slice(0, 40)}`,
            contactInfo.name, contactInfo.company,
            { email: contactInfo.email, phone: contactInfo.phone, website: contactInfo.website }
          )

          // 5. Save as lead
          const leadId = await this._saveAsLead(contactInfo, agentId)

          // 6. Generate and "send" outreach
          if (leadId) {
            await this._generateOutreach(agentId, agent, avatar, contactInfo, leadId, control)
          }

          await pool.query(
            'UPDATE ai_agents SET contacts_found = contacts_found + 1, updated_at = NOW() WHERE id = $1',
            [agentId]
          )

          await sleep(3000) // Throttle between contacts
        }

        await sleep(2000) // Throttle between queries
      }

      // Done
      if (!control.abort) {
        await pool.query("UPDATE ai_agents SET status = 'completed', updated_at = NOW() WHERE id = $1", [agentId])
        await logActivity(agentId, 'completed', `Mision completada. ${totalFound} contactos procesados.`, null, null, { totalFound })
      }
    } catch (err) {
      console.error(`[Agent ${agentId}] Error:`, err.message)
      await pool.query("UPDATE ai_agents SET status = 'error', updated_at = NOW() WHERE id = $1", [agentId])
      await logActivity(agentId, 'error', `Error: ${err.message}`, null, null)
    } finally {
      this.runningAgents.delete(agentId)
    }
  }

  async _searchDuckDuckGo(query) {
    const articles = []
    try {
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
      const resp = await axios.get(url, {
        headers: { 'User-Agent': randomUA(), 'Accept-Language': 'es-MX,es;q=0.9' },
        timeout: 15000,
      })
      const $ = cheerio.load(resp.data)
      $('.result').each((i, el) => {
        const titleEl = $(el).find('.result__title a')
        const title = titleEl.text().trim()
        let link = titleEl.attr('href') || ''
        const snippet = $(el).find('.result__snippet').text().trim()
        if (link.includes('uddg=')) {
          try { link = new URL(link, 'https://duckduckgo.com').searchParams.get('uddg') || link } catch {}
        }
        if (title && link?.startsWith('http')) {
          articles.push({ title, url: link, snippet })
        }
      })
    } catch (err) {
      console.error(`[Agent Search] Error: ${err.message}`)
    }
    return articles
  }

  async _extractContactInfo(result) {
    try {
      // First try to extract from snippet
      const info = { name: null, company: null, email: null, phone: null, website: result.url }

      // Try to scrape the page for contact info
      const resp = await axios.get(result.url, {
        headers: { 'User-Agent': randomUA() },
        timeout: 8000,
        maxContentLength: 500000,
        maxRedirects: 3,
      })

      const $ = cheerio.load(resp.data)

      // Extract emails
      const pageText = $('body').text()
      const emailMatch = pageText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g)
      if (emailMatch) {
        // Filter out common non-personal emails
        const filtered = emailMatch.filter(e =>
          !e.includes('example.com') && !e.includes('sentry.io') &&
          !e.includes('wixpress') && !e.includes('wordpress') &&
          !e.includes('github.com') && !e.includes('.png') && !e.includes('.jpg')
        )
        info.email = filtered[0] || null
      }

      // Extract phone numbers (Mexico format)
      const phoneMatch = pageText.match(/(?:\+?52\s?)?(?:\(?\d{2,3}\)?\s?)?\d{3,4}[\s.-]?\d{4}/g)
      if (phoneMatch) {
        info.phone = phoneMatch[0]?.replace(/\s/g, '') || null
      }

      // Try to get company/person name from title or meta
      const metaTitle = $('meta[property="og:site_name"]').attr('content') || $('title').text()
      info.company = metaTitle?.split('|')[0]?.split('-')[0]?.trim().slice(0, 100) || result.title.split('|')[0].split('-')[0].trim().slice(0, 100)

      // Use AI to extract person name from snippet
      if (result.snippet) {
        try {
          const aiResp = await analyzeWithDeepSeek(
            `Del siguiente texto, extrae el nombre de la persona mencionada (CEO, director, fundador, etc) y la empresa. Responde SOLO JSON: {"name":"nombre o null","company":"empresa o null"}\n\nTexto: ${result.title} - ${result.snippet.slice(0, 300)}`
          )
          const parsed = JSON.parse(aiResp.match(/\{[\s\S]*\}/)?.[0] || '{}')
          if (parsed.name) info.name = parsed.name
          if (parsed.company) info.company = parsed.company
        } catch {}
      }

      return info
    } catch {
      return null
    }
  }

  async _saveAsLead(contactInfo, agentId) {
    try {
      // Check if lead already exists
      if (contactInfo.email) {
        const existing = await pool.query('SELECT id FROM leads WHERE email = $1', [contactInfo.email])
        if (existing.rows.length) return existing.rows[0].id
      }

      const res = await pool.query(
        `INSERT INTO leads (name, email, phone, website, sector, source_url, status, score)
         VALUES ($1, $2, $3, $4, 'ai-agent-discovery', $5, 'new', 50)
         RETURNING id`,
        [
          contactInfo.name || contactInfo.company || 'Target Descubierto',
          contactInfo.email,
          contactInfo.phone,
          contactInfo.website,
          contactInfo.website,
        ]
      )
      return res.rows[0]?.id
    } catch (err) {
      console.error('[Agent] Error saving lead:', err.message)
      return null
    }
  }

  async _generateOutreach(agentId, agent, avatar, contactInfo, leadId, control) {
    if (control.abort) return

    const avatarName = avatar?.name || 'Adbize'
    const avatarRole = avatar?.role || 'Business Development'

    await logActivity(agentId, 'generating_message',
      `Generando mensaje personalizado para ${contactInfo.name || contactInfo.company}...`,
      contactInfo.name, contactInfo.company
    )

    try {
      const prompt = `Eres ${avatarName}, ${avatarRole} en Adbize, empresa de desarrollo de software e IA en Mexico.
Genera un mensaje corto y personalizado (max 100 palabras) para contactar a esta persona/empresa:

Nombre: ${contactInfo.name || 'Estimado/a'}
Empresa: ${contactInfo.company || 'su empresa'}
Website: ${contactInfo.website || 'N/A'}

Servicios de Adbize: desarrollo web, apps moviles, inteligencia artificial, machine learning, chatbots con LLM, automatizacion, ecommerce.

El mensaje debe:
- Ser profesional pero cercano
- Mencionar algo especifico de su empresa/sector
- Proponer como Adbize puede ayudarlos
- Terminar con una pregunta abierta
- Ser en español argentino natural

Responde SOLO el mensaje, sin comillas ni formato extra.`

      const message = await analyzeWithDeepSeek(prompt)

      await logActivity(agentId, 'message_ready',
        `Mensaje generado para ${contactInfo.name || contactInfo.company}: "${message.slice(0, 120)}..."`,
        contactInfo.name, contactInfo.company,
        { message, email: contactInfo.email, phone: contactInfo.phone }
      )

      // Save outreach message
      if (contactInfo.email) {
        const subjectPrompt = `Genera un subject de email corto (max 8 palabras) profesional para este mensaje de outreach a ${contactInfo.company || 'una empresa'}. Responde SOLO el subject sin comillas.`
        const subject = await analyzeWithDeepSeek(subjectPrompt)

        await pool.query(
          `INSERT INTO outreach_messages (lead_id, channel, step, subject, body, ai_generated, status, scheduled_for)
           VALUES ($1, 'EMAIL', 1, $2, $3, true, 'PENDING', NOW() + interval '5 minutes')`,
          [leadId, subject.trim().slice(0, 200), message]
        )

        await logActivity(agentId, 'email_queued',
          `Email en cola para ${contactInfo.email}: "${subject.trim().slice(0, 60)}"`,
          contactInfo.name, contactInfo.company,
          { email: contactInfo.email, subject: subject.trim() }
        )
      }

      if (contactInfo.phone) {
        await pool.query(
          `INSERT INTO outreach_messages (lead_id, channel, step, subject, body, ai_generated, status)
           VALUES ($1, 'WHATSAPP', 1, 'WhatsApp Outreach', $2, true, 'PENDING')`,
          [leadId, message.slice(0, 500)]
        )

        await logActivity(agentId, 'whatsapp_queued',
          `WhatsApp en cola para ${contactInfo.phone}`,
          contactInfo.name, contactInfo.company,
          { phone: contactInfo.phone }
        )
      }

      await pool.query(
        'UPDATE ai_agents SET messages_sent = messages_sent + 1, updated_at = NOW() WHERE id = $1',
        [agentId]
      )

    } catch (err) {
      await logActivity(agentId, 'error', `Error generando mensaje: ${err.message}`, contactInfo.name, contactInfo.company)
    }
  }
}

export default AgentRunnerService
