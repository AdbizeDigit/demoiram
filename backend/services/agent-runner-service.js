import { pool } from '../config/database.js'
import { analyzeWithDeepSeek } from './deepseek.js'
import axios from 'axios'
import * as cheerio from 'cheerio'
import { EventEmitter } from 'events'

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/119.0.0.0 Safari/537.36',
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
      tools TEXT[] DEFAULT '{duckduckgo,scraping,email,whatsapp,enrichment,google_maps,linkedin,hunter,apollo}',
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
  // Add tools column if it doesn't exist (migration for existing tables)
  await pool.query(`
    ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS tools TEXT[] DEFAULT '{duckduckgo,scraping,email,whatsapp,enrichment,google_maps,linkedin,hunter,apollo}'
  `).catch(() => {})
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

// Google Maps categories for target types
const MAPS_QUERIES = {
  business_owners: ['empresas tecnologia', 'agencia marketing digital', 'consultora empresarial', 'startup incubadora'],
  celebrities: ['agencia talentos', 'productora eventos', 'agencia influencers'],
  politicians: ['gobierno municipal oficina', 'dependencia gobierno'],
  startups: ['coworking espacio', 'incubadora startups', 'hub tecnologia'],
  enterprises: ['corporativo oficinas', 'empresa manufactura', 'grupo empresarial'],
}

// ── Agent Runner ──────────────────────────────────────────────────────────────
class AgentRunnerService extends EventEmitter {
  constructor() {
    super()
    this.runningAgents = new Map()
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

    const toolsList = (agent.tools || []).join(', ') || 'todas'
    await logActivity(agentId, 'started',
      `Agente "${agent.name}" iniciado. Objetivo: ${agent.target_type}. Herramientas: ${toolsList}`,
      null, null, { tools: agent.tools })

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

  // ══════════════════════════════════════════════════════════════════════════════
  // MAIN AGENT LOOP
  // ══════════════════════════════════════════════════════════════════════════════
  async _runAgentLoop(agent, control) {
    const agentId = agent.id
    const tools = agent.tools || ['duckduckgo', 'scraping', 'email', 'whatsapp', 'enrichment', 'google_maps', 'linkedin']

    try {
      // 1. Get avatar
      let avatar = null
      if (agent.avatar_id) {
        const avRes = await pool.query('SELECT * FROM avatars WHERE id = $1', [agent.avatar_id])
        avatar = avRes.rows[0] || null
      }

      // 2. Build search queries
      const customKeywords = agent.search_keywords?.filter(k => k.trim()) || []
      const baseQueries = TARGET_QUERIES[agent.target_type] || TARGET_QUERIES.business_owners
      const queries = customKeywords.length > 0
        ? customKeywords.map(k => `${k} Mexico contacto email`)
        : baseQueries

      let totalFound = 0
      const allContacts = []

      // ── PHASE 1: DISCOVERY ──────────────────────────────────────────────────
      await logActivity(agentId, 'phase', '📡 FASE 1: Descubrimiento — buscando targets en multiples fuentes...', null, null)

      // 1A. DuckDuckGo search
      if (tools.includes('duckduckgo') && !control.abort) {
        await logActivity(agentId, 'tool_active', '🔍 Herramienta: DuckDuckGo Search activa', null, null)

        for (const query of queries) {
          if (control.abort || totalFound >= agent.max_contacts_per_run) break
          await logActivity(agentId, 'searching', `Buscando: "${query}"`, null, null)
          const results = await this._searchDuckDuckGo(query)
          await logActivity(agentId, 'search_results', `${results.length} resultados de DuckDuckGo`, null, null)

          for (const r of results.slice(0, 4)) {
            if (control.abort || totalFound >= agent.max_contacts_per_run) break
            const contact = await this._extractContactInfo(r, agentId)
            if (contact && (contact.email || contact.phone)) {
              allContacts.push(contact)
              totalFound++
              await logActivity(agentId, 'found_target',
                `✅ Target: ${contact.name || 'N/A'} — ${contact.company || 'N/A'} (${contact.email || contact.phone})`,
                contact.name, contact.company,
                { email: contact.email, phone: contact.phone, source: 'duckduckgo' })
            }
            await sleep(2000)
          }
          await sleep(2500)
        }
      }

      // 1B. Google Maps search
      if (tools.includes('google_maps') && !control.abort && totalFound < agent.max_contacts_per_run) {
        await logActivity(agentId, 'tool_active', '🗺️ Herramienta: Google Maps Scraping activa', null, null)
        const mapQueries = MAPS_QUERIES[agent.target_type] || MAPS_QUERIES.business_owners
        const cities = ['Ciudad de Mexico', 'Monterrey', 'Guadalajara', 'Puebla', 'Queretaro']
        const city = cities[Math.floor(Math.random() * cities.length)]

        for (const mq of mapQueries.slice(0, 2)) {
          if (control.abort || totalFound >= agent.max_contacts_per_run) break
          const query = `${mq} ${city} Mexico`
          await logActivity(agentId, 'searching', `Google Maps: "${query}"`, null, null)
          const mapResults = await this._searchGoogleMaps(query)
          await logActivity(agentId, 'search_results', `${mapResults.length} negocios encontrados en Google Maps`, null, null)

          for (const mr of mapResults.slice(0, 3)) {
            if (control.abort || totalFound >= agent.max_contacts_per_run) break
            if (mr.email || mr.phone) {
              allContacts.push(mr)
              totalFound++
              await logActivity(agentId, 'found_target',
                `✅ Negocio: ${mr.company || mr.name} — ${mr.address || city} (${mr.phone || mr.email})`,
                mr.name, mr.company,
                { ...mr, source: 'google_maps' })
            }
          }
          await sleep(3000)
        }
      }

      // 1C. LinkedIn public profile search
      if (tools.includes('linkedin') && !control.abort && totalFound < agent.max_contacts_per_run) {
        await logActivity(agentId, 'tool_active', '💼 Herramienta: LinkedIn Discovery activa', null, null)
        const liQueries = customKeywords.length > 0
          ? customKeywords.slice(0, 2).map(k => `site:linkedin.com/in ${k}`)
          : [`site:linkedin.com/in CEO ${agent.target_type === 'startups' ? 'startup' : 'empresa'} Mexico tecnologia`]

        for (const lq of liQueries) {
          if (control.abort || totalFound >= agent.max_contacts_per_run) break
          await logActivity(agentId, 'searching', `LinkedIn: "${lq}"`, null, null)
          const liResults = await this._searchDuckDuckGo(lq)

          for (const lr of liResults.slice(0, 3)) {
            if (control.abort || totalFound >= agent.max_contacts_per_run) break
            if (!lr.url.includes('linkedin.com')) continue
            const liProfile = await this._scrapeLinkedInPublic(lr, agentId)
            if (liProfile) {
              allContacts.push(liProfile)
              totalFound++
              await logActivity(agentId, 'found_target',
                `✅ LinkedIn: ${liProfile.name || 'N/A'} — ${liProfile.headline || ''} (${liProfile.company || 'N/A'})`,
                liProfile.name, liProfile.company,
                { ...liProfile, source: 'linkedin' })
            }
            await sleep(3000)
          }
          await sleep(2000)
        }
      }

      // 1D. Apollo People Search
      if (tools.includes('apollo') && !control.abort && totalFound < agent.max_contacts_per_run) {
        await logActivity(agentId, 'tool_active', '🚀 Herramienta: Apollo People Search activa', null, null)

        const titleMap = {
          business_owners: 'CEO',
          celebrities: 'Influencer',
          politicians: 'Director Gobierno',
          startups: 'Founder',
          enterprises: 'CTO',
        }
        const searchTitle = titleMap[agent.target_type] || 'CEO'
        const searchIndustry = customKeywords[0] || 'tecnologia'

        await logActivity(agentId, 'searching', `Apollo: buscando ${searchTitle} en ${searchIndustry}`, null, null)

        try {
          const { apolloService } = await import('./apollo-service.js')
          const apolloResult = await apolloService.searchPeople({
            title: searchTitle,
            industry: searchIndustry,
            location: 'Mexico',
            keywords: customKeywords.join(' ') || undefined,
            limit: Math.min(5, agent.max_contacts_per_run - totalFound),
          })

          await logActivity(agentId, 'search_results', `${apolloResult.people?.length || 0} personas encontradas via Apollo`, null, null)

          for (const p of (apolloResult.people || [])) {
            if (control.abort || totalFound >= agent.max_contacts_per_run) break
            if (p.email || p.phone || p.linkedin) {
              allContacts.push({
                name: p.name,
                company: p.company,
                email: p.email,
                phone: p.phone,
                linkedin: p.linkedin,
                website: p.website,
                role: p.title,
                location: p.location,
              })
              totalFound++
              await logActivity(agentId, 'found_target',
                `✅ Apollo: ${p.name || 'N/A'} — ${p.title || ''} @ ${p.company || 'N/A'}`,
                p.name, p.company, { ...p, source: 'apollo' })
            }
          }
        } catch (err) {
          await logActivity(agentId, 'warning', `Apollo error: ${err.message}`, null, null)
        }
      }

      if (allContacts.length === 0) {
        await logActivity(agentId, 'warning', '⚠️ No se encontraron contactos en ninguna fuente. Intenta con otros keywords.', null, null)
      }

      // ── PHASE 2: ENRICHMENT & VALIDATION ────────────────────────────────────
      if (allContacts.length > 0 && !control.abort) {
        await logActivity(agentId, 'phase', `🔬 FASE 2: Enriquecimiento — procesando ${allContacts.length} contactos...`, null, null)
      }

      const processedLeads = []

      for (const contact of allContacts) {
        if (control.abort) break

        // Save as lead
        const leadId = await this._saveAsLead(contact, agentId)
        if (!leadId) continue

        // Hunter: find email by domain if we don't have one
        if (!contact.email && contact.website && tools.includes('hunter')) {
          await logActivity(agentId, 'hunter_search',
            `🎯 Hunter: buscando email en ${contact.website} para ${contact.name || contact.company}...`,
            contact.name, contact.company)
          try {
            const { hunterService } = await import('./hunter-service.js')
            const domain = contact.website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
            const hunterResult = await hunterService.findByDomain(domain, contact.name)

            if (hunterResult.emails?.length > 0) {
              const bestEmail = hunterResult.emails[0]
              contact.email = bestEmail.email
              await pool.query('UPDATE leads SET email = $1 WHERE id = $2 AND email IS NULL', [bestEmail.email, leadId])
              await logActivity(agentId, 'hunter_found',
                `🎯 Hunter encontro email: ${bestEmail.email} (confianza: ${bestEmail.confidence}%)`,
                contact.name, contact.company,
                { email: bestEmail.email, confidence: bestEmail.confidence, source: bestEmail.source })
            } else {
              await logActivity(agentId, 'hunter_empty',
                `Hunter: sin emails para ${domain}`, contact.name, contact.company)
            }
          } catch (err) {
            await logActivity(agentId, 'warning', `Hunter error: ${err.message}`, contact.name, contact.company)
          }
        }

        // Enrichment
        if (tools.includes('enrichment')) {
          await logActivity(agentId, 'enriching',
            `Enriqueciendo datos de ${contact.name || contact.company}...`,
            contact.name, contact.company)
          const enriched = await this._enrichLead(leadId, agentId)
          if (enriched) {
            // Update contact with enriched data
            if (enriched.email && !contact.email) contact.email = enriched.email
            if (enriched.phone && !contact.phone) contact.phone = enriched.phone
            if (enriched.social_linkedin) contact.linkedin = enriched.social_linkedin
            await logActivity(agentId, 'enriched',
              `Datos enriquecidos: ${enriched.fieldsFound?.join(', ') || 'completado'}`,
              contact.name, contact.company,
              { fieldsFound: enriched.fieldsFound })
          }
        }

        // Email validation
        if (contact.email && tools.includes('email')) {
          const valid = await this._validateEmail(contact.email)
          if (!valid) {
            await logActivity(agentId, 'email_invalid',
              `❌ Email invalido: ${contact.email} — se descarta para envio`,
              contact.name, contact.company)
            contact.email = null
          } else {
            await logActivity(agentId, 'email_valid',
              `✓ Email valido: ${contact.email}`,
              contact.name, contact.company)
          }
        }

        // WhatsApp check
        if (contact.phone && tools.includes('whatsapp')) {
          const hasWA = await this._checkWhatsApp(contact.phone)
          contact.hasWhatsApp = hasWA
          if (hasWA) {
            await logActivity(agentId, 'whatsapp_found',
              `✓ WhatsApp confirmado: ${contact.phone}`,
              contact.name, contact.company)
          }
        }

        // ML Scoring
        const score = await this._scoreLead(contact)
        if (score) {
          await pool.query('UPDATE leads SET score = $1 WHERE id = $2', [score.score, leadId])
          await logActivity(agentId, 'scored',
            `Score: ${score.score}/100 (${score.quality}) — ${contact.name || contact.company}`,
            contact.name, contact.company,
            { score: score.score, quality: score.quality })
        }

        await pool.query(
          'UPDATE ai_agents SET contacts_found = contacts_found + 1, updated_at = NOW() WHERE id = $1',
          [agentId])

        processedLeads.push({ ...contact, leadId, score })
        await sleep(1500)
      }

      // ── PHASE 3: OUTREACH ───────────────────────────────────────────────────
      if (processedLeads.length > 0 && !control.abort) {
        await logActivity(agentId, 'phase',
          `📨 FASE 3: Outreach — contactando ${processedLeads.length} leads...`, null, null)
      }

      for (const lead of processedLeads) {
        if (control.abort) break

        // Generate personalized message
        await logActivity(agentId, 'generating_message',
          `Generando mensaje para ${lead.name || lead.company}...`,
          lead.name, lead.company)

        const outreach = await this._generateOutreach(agentId, agent, avatar, lead)
        if (!outreach) continue

        // Send Email
        if (lead.email && tools.includes('email')) {
          const sent = await this._sendEmail(lead.email, outreach.subject, outreach.htmlBody, agentId, lead)
          if (sent) {
            await pool.query(
              `INSERT INTO outreach_messages (lead_id, channel, step, subject, body, ai_generated, status, sent_at)
               VALUES ($1, 'EMAIL', 1, $2, $3, true, 'SENT', NOW())`,
              [lead.leadId, outreach.subject, outreach.message])
            await logActivity(agentId, 'email_sent',
              `📧 Email ENVIADO a ${lead.email}: "${outreach.subject}"`,
              lead.name, lead.company,
              { email: lead.email, subject: outreach.subject })
          }
        }

        // Send WhatsApp
        if (lead.phone && lead.hasWhatsApp && tools.includes('whatsapp')) {
          const waSent = await this._sendWhatsApp(lead.phone, outreach.whatsappMsg, agentId, lead)
          if (waSent) {
            await pool.query(
              `INSERT INTO outreach_messages (lead_id, channel, step, subject, body, ai_generated, status, sent_at)
               VALUES ($1, 'WHATSAPP', 1, 'WhatsApp Outreach', $2, true, 'SENT', NOW())`,
              [lead.leadId, outreach.whatsappMsg])
            await logActivity(agentId, 'whatsapp_sent',
              `💬 WhatsApp ENVIADO a ${lead.phone}`,
              lead.name, lead.company,
              { phone: lead.phone })
          }
        } else if (lead.phone && !lead.hasWhatsApp && tools.includes('whatsapp')) {
          // Queue for manual send
          await pool.query(
            `INSERT INTO outreach_messages (lead_id, channel, step, subject, body, ai_generated, status)
             VALUES ($1, 'WHATSAPP', 1, 'WhatsApp Outreach', $2, true, 'PENDING')`,
            [lead.leadId, outreach.whatsappMsg])
          await logActivity(agentId, 'whatsapp_queued',
            `WhatsApp en cola (sin verificar WA): ${lead.phone}`,
            lead.name, lead.company)
        }

        await pool.query(
          'UPDATE ai_agents SET messages_sent = messages_sent + 1, updated_at = NOW() WHERE id = $1',
          [agentId])

        await sleep(5000) // Delay between contacts to avoid spam
      }

      // ── PHASE 4: SUMMARY ───────────────────────────────────────────────────
      if (!control.abort) {
        const stats = {
          totalFound: allContacts.length,
          enriched: processedLeads.length,
          emailsSent: processedLeads.filter(l => l.email).length,
          whatsappSent: processedLeads.filter(l => l.hasWhatsApp).length,
        }
        await pool.query("UPDATE ai_agents SET status = 'completed', updated_at = NOW() WHERE id = $1", [agentId])
        await logActivity(agentId, 'completed',
          `🏁 Mision completada. ${stats.totalFound} encontrados, ${stats.enriched} enriquecidos, ${stats.emailsSent} emails enviados, ${stats.whatsappSent} WhatsApp enviados.`,
          null, null, stats)
      }
    } catch (err) {
      console.error(`[Agent ${agentId}] Error:`, err.message)
      await pool.query("UPDATE ai_agents SET status = 'error', updated_at = NOW() WHERE id = $1", [agentId])
      await logActivity(agentId, 'error', `Error: ${err.message}`, null, null)
    } finally {
      this.runningAgents.delete(agentId)
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // TOOL: DuckDuckGo Search
  // ══════════════════════════════════════════════════════════════════════════════
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
      console.error(`[Agent DDG] Error: ${err.message}`)
    }
    return articles
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // TOOL: Google Maps Scraping (free via DuckDuckGo maps link)
  // ══════════════════════════════════════════════════════════════════════════════
  async _searchGoogleMaps(query) {
    const businesses = []
    try {
      // Use DuckDuckGo to search for businesses (safer than scraping Google directly)
      const searchQuery = `${query} telefono email contacto`
      const results = await this._searchDuckDuckGo(searchQuery)

      for (const r of results.slice(0, 5)) {
        try {
          const resp = await axios.get(r.url, {
            headers: { 'User-Agent': randomUA() },
            timeout: 8000,
            maxContentLength: 500000,
          })
          const $ = cheerio.load(resp.data)
          const pageText = $('body').text()

          const emailMatch = pageText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g)
          const phoneMatch = pageText.match(/(?:\+?52\s?)?(?:\(?\d{2,3}\)?\s?)?\d{3,4}[\s.-]?\d{4}/g)
          const email = emailMatch?.filter(e => !e.includes('example.com') && !e.includes('sentry') && !e.includes('.png'))[0] || null
          const phone = phoneMatch?.[0]?.replace(/\s/g, '') || null

          if (email || phone) {
            const company = $('meta[property="og:site_name"]').attr('content') || $('title').text().split('|')[0].split('-')[0].trim().slice(0, 100)
            businesses.push({
              name: null,
              company: company || r.title.slice(0, 80),
              email,
              phone,
              website: r.url,
              address: null,
            })
          }
          await sleep(1500)
        } catch {}
      }
    } catch (err) {
      console.error(`[Agent Maps] Error: ${err.message}`)
    }
    return businesses
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // TOOL: LinkedIn Public Profile Scraping
  // ══════════════════════════════════════════════════════════════════════════════
  async _scrapeLinkedInPublic(searchResult, agentId) {
    try {
      // Extract info from DuckDuckGo snippet (LinkedIn blocks scrapers)
      const { title, snippet, url } = searchResult

      // Parse name and headline from title like "Juan Pérez - CEO at TechCo | LinkedIn"
      const titleParts = title.replace(/\s*[\|–-]\s*LinkedIn.*$/i, '').trim()
      const nameParts = titleParts.split(/\s*[-–]\s*/)
      const name = nameParts[0]?.trim() || null
      const headline = nameParts[1]?.trim() || null

      // Use AI to extract structured data from snippet
      const aiResp = await analyzeWithDeepSeek(
        `Extrae datos de este perfil de LinkedIn. Responde SOLO JSON valido:
{"name":"nombre","company":"empresa actual","role":"cargo","location":"ubicacion","headline":"titulo profesional"}

Titulo: ${title}
Snippet: ${snippet?.slice(0, 500) || 'N/A'}`
      )

      const parsed = JSON.parse(aiResp.match(/\{[\s\S]*\}/)?.[0] || '{}')

      // Try to find email by searching company website
      let email = null
      if (parsed.company) {
        const emailSearch = await this._searchDuckDuckGo(`"${parsed.company}" contacto email site:${parsed.company?.toLowerCase().replace(/\s/g, '')}.com`)
        for (const es of emailSearch.slice(0, 2)) {
          try {
            const resp = await axios.get(es.url, { headers: { 'User-Agent': randomUA() }, timeout: 6000, maxContentLength: 300000 })
            const emailMatch = resp.data.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g)
            email = emailMatch?.filter(e => !e.includes('example') && !e.includes('.png'))[0] || null
            if (email) break
          } catch {}
          await sleep(1000)
        }
      }

      return {
        name: parsed.name || name,
        company: parsed.company || null,
        headline: parsed.headline || headline,
        role: parsed.role || null,
        email,
        phone: null,
        website: url,
        linkedin: url,
        location: parsed.location || null,
      }
    } catch (err) {
      console.error(`[Agent LinkedIn] Error: ${err.message}`)
      return null
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // TOOL: Page Scraping (extract contact info)
  // ══════════════════════════════════════════════════════════════════════════════
  async _extractContactInfo(result, agentId) {
    try {
      const info = { name: null, company: null, email: null, phone: null, website: result.url }

      const resp = await axios.get(result.url, {
        headers: { 'User-Agent': randomUA() },
        timeout: 8000,
        maxContentLength: 500000,
        maxRedirects: 3,
      })

      const $ = cheerio.load(resp.data)
      const pageText = $('body').text()

      // Extract emails
      const emailMatch = pageText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g)
      if (emailMatch) {
        const filtered = emailMatch.filter(e =>
          !e.includes('example.com') && !e.includes('sentry.io') &&
          !e.includes('wixpress') && !e.includes('wordpress') &&
          !e.includes('github.com') && !e.includes('.png') && !e.includes('.jpg')
        )
        info.email = filtered[0] || null
      }

      // Extract phones (Mexico + Argentina + general LATAM)
      const phoneMatch = pageText.match(/(?:\+?(?:52|54|55|57)\s?)?(?:\(?\d{2,3}\)?\s?)?\d{3,4}[\s.-]?\d{4}/g)
      if (phoneMatch) {
        info.phone = phoneMatch[0]?.replace(/\s/g, '') || null
      }

      // Extract social links
      const links = []
      $('a[href]').each((_, el) => { links.push($(el).attr('href')) })
      info.linkedin = links.find(l => l?.includes('linkedin.com/')) || null
      info.instagram = links.find(l => l?.includes('instagram.com/')) || null
      info.facebook = links.find(l => l?.includes('facebook.com/')) || null

      // Company name
      const metaTitle = $('meta[property="og:site_name"]').attr('content') || $('title').text()
      info.company = metaTitle?.split('|')[0]?.split('-')[0]?.trim().slice(0, 100) || result.title.split('|')[0].trim().slice(0, 100)

      // AI extraction for person name
      if (result.snippet) {
        try {
          const aiResp = await analyzeWithDeepSeek(
            `Del siguiente texto, extrae el nombre de la persona (CEO, director, fundador) y la empresa. Responde SOLO JSON: {"name":"nombre o null","company":"empresa o null"}\n\nTexto: ${result.title} - ${result.snippet.slice(0, 300)}`
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

  // ══════════════════════════════════════════════════════════════════════════════
  // TOOL: Lead Enrichment (uses existing service)
  // ══════════════════════════════════════════════════════════════════════════════
  async _enrichLead(leadId, agentId) {
    try {
      const { enrichmentService } = await import('./scraping/enrichment-service.js')
      const result = await enrichmentService.enrichLead(leadId)
      return result
    } catch (err) {
      console.error(`[Agent Enrich] Error: ${err.message}`)
      return null
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // TOOL: Email Validation
  // ══════════════════════════════════════════════════════════════════════════════
  async _validateEmail(email) {
    try {
      const { emailValidator } = await import('./email-validator.js')
      const result = await emailValidator.validateComplete(email)
      return result?.valid !== false && result?.syntax !== false
    } catch {
      return true // If validation fails, assume valid
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // TOOL: WhatsApp Check & Send
  // ══════════════════════════════════════════════════════════════════════════════
  async _checkWhatsApp(phone) {
    try {
      const { default: whatsappConnection } = await import('./outreach/whatsapp-connection-service.js')
      if (whatsappConnection.connectionStatus !== 'connected') return false
      const result = await whatsappConnection.checkWhatsApp(phone)
      return !!result
    } catch {
      return false
    }
  }

  async _sendWhatsApp(phone, message, agentId, contact) {
    try {
      const { default: whatsappConnection } = await import('./outreach/whatsapp-connection-service.js')
      if (whatsappConnection.connectionStatus !== 'connected') {
        await logActivity(agentId, 'whatsapp_skip', 'WhatsApp no conectado — mensaje en cola', contact.name, contact.company)
        return false
      }
      await whatsappConnection.sendMessage(phone, message)
      return true
    } catch (err) {
      await logActivity(agentId, 'whatsapp_error', `Error enviando WA: ${err.message}`, contact.name, contact.company)
      return false
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // TOOL: Email Send (uses existing Brevo/SMTP service)
  // ══════════════════════════════════════════════════════════════════════════════
  async _sendEmail(to, subject, htmlBody, agentId, contact) {
    try {
      const { emailOutreachService } = await import('./outreach/email-outreach-service.js')
      await emailOutreachService.sendEmail(to, subject, htmlBody)
      return true
    } catch (err) {
      await logActivity(agentId, 'email_error', `Error enviando email: ${err.message}`, contact.name, contact.company)
      return false
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // TOOL: ML Lead Scoring
  // ══════════════════════════════════════════════════════════════════════════════
  async _scoreLead(contact) {
    try {
      const { mlLeadScorer } = await import('./ml-lead-scoring.js')
      const result = mlLeadScorer.calculatePredictiveScore({
        industry: 'technology',
        location: contact.location || 'Mexico',
        contact_title: contact.role || contact.headline || '',
        website_visits: contact.website ? 1 : 0,
      })
      return result
    } catch {
      return null
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // TOOL: Save Lead to DB
  // ══════════════════════════════════════════════════════════════════════════════
  async _saveAsLead(contactInfo, agentId) {
    try {
      if (contactInfo.email) {
        const existing = await pool.query('SELECT id FROM leads WHERE email = $1', [contactInfo.email])
        if (existing.rows.length) return existing.rows[0].id
      }

      const res = await pool.query(
        `INSERT INTO leads (name, email, phone, website, sector, source_url, status, score,
         social_linkedin, social_instagram, social_facebook)
         VALUES ($1, $2, $3, $4, 'ai-agent-discovery', $5, 'new', 50, $6, $7, $8)
         RETURNING id`,
        [
          contactInfo.name || contactInfo.company || 'Target Descubierto',
          contactInfo.email,
          contactInfo.phone,
          contactInfo.website,
          contactInfo.website,
          contactInfo.linkedin || null,
          contactInfo.instagram || null,
          contactInfo.facebook || null,
        ]
      )
      return res.rows[0]?.id
    } catch (err) {
      console.error('[Agent] Error saving lead:', err.message)
      return null
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // Generate Outreach (AI message + email HTML + WhatsApp text)
  // ══════════════════════════════════════════════════════════════════════════════
  async _generateOutreach(agentId, agent, avatar, contact) {
    try {
      const avatarName = avatar?.name || 'Adbize'
      const avatarRole = avatar?.role || 'Business Development'
      const avatarPhone = avatar?.phone || ''
      const avatarEmail = avatar?.email || 'contacto@adbize.com'

      const prompt = `Eres ${avatarName}, ${avatarRole} en Adbize, empresa de desarrollo de software e IA en Mexico.
Genera contenido de outreach personalizado para:

Nombre: ${contact.name || 'Estimado/a'}
Empresa: ${contact.company || 'su empresa'}
Cargo: ${contact.role || contact.headline || 'N/A'}
Website: ${contact.website || 'N/A'}
LinkedIn: ${contact.linkedin || 'N/A'}

Servicios de Adbize: desarrollo web, apps moviles, inteligencia artificial, machine learning, chatbots con LLM, automatizacion, ecommerce.

${agent.strategy ? `Estrategia especifica: ${agent.strategy}` : ''}

Genera en JSON VALIDO:
{
  "subject": "asunto de email (max 8 palabras)",
  "message": "email profesional corto (max 150 palabras, mencionar algo especifico de su empresa)",
  "whatsapp": "mensaje WhatsApp corto y directo (max 60 palabras)"
}

Responde SOLO el JSON.`

      const resp = await analyzeWithDeepSeek(prompt)
      const parsed = JSON.parse(resp.match(/\{[\s\S]*\}/)?.[0] || '{}')

      const htmlBody = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <p style="font-size:15px;color:#333;line-height:1.6;">${(parsed.message || '').replace(/\n/g, '<br>')}</p>
  <div style="margin-top:20px;padding-top:15px;border-top:1px solid #eee;">
    <p style="font-size:13px;color:#666;margin:0;">
      <strong>${avatarName}</strong><br>
      ${avatarRole} — Adbize<br>
      ${avatarEmail}${avatarPhone ? `<br>${avatarPhone}` : ''}
    </p>
  </div>
</div>`

      return {
        subject: parsed.subject || `Propuesta de Adbize para ${contact.company || 'su empresa'}`,
        message: parsed.message || '',
        htmlBody,
        whatsappMsg: parsed.whatsapp || parsed.message?.slice(0, 300) || '',
      }
    } catch (err) {
      await logActivity(agentId, 'error', `Error generando outreach: ${err.message}`, contact.name, contact.company)
      return null
    }
  }
}

export default AgentRunnerService
