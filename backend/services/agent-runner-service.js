import { pool } from '../config/database.js'
import deepseekService, { analyzeWithDeepSeek } from './deepseek.js'
import axios from 'axios'
import * as cheerio from 'cheerio'
import { EventEmitter } from 'events'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// ── Table Init ────────────────────────────────────────────────────────────────
async function initAgentTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_agents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      avatar_id UUID,
      target_type VARCHAR(50) NOT NULL,
      country VARCHAR(50) DEFAULT 'Mexico',
      search_keywords TEXT[] DEFAULT '{}',
      strategy TEXT DEFAULT '',
      status VARCHAR(20) DEFAULT 'idle',
      channels TEXT[] DEFAULT '{email,whatsapp}',
      tools TEXT[] DEFAULT '{wikipedia,ai_network,scraping,email,whatsapp,enrichment,hunter,apollo}',
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
    CREATE TABLE IF NOT EXISTS agent_network_maps (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
      root_name VARCHAR(200) NOT NULL,
      root_role VARCHAR(200),
      network JSONB DEFAULT '{}',
      country VARCHAR(50),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `)
  await pool.query(`ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS country VARCHAR(50) DEFAULT 'Mexico'`).catch(() => {})
  await pool.query(`ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS tools TEXT[] DEFAULT '{wikipedia,ai_network,scraping,email,whatsapp,enrichment,hunter,apollo}'`).catch(() => {})
}

async function log(agentId, action, detail, name, company, meta = {}) {
  await pool.query(
    `INSERT INTO agent_activity_logs (agent_id, action, detail, target_name, target_company, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [agentId, action, detail, name || null, company || null, JSON.stringify(meta)]
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// AGENT RUNNER
// ══════════════════════════════════════════════════════════════════════════════
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
    if (this.runningAgents.has(agentId)) return { success: false, message: 'Agente ya corriendo' }

    const res = await pool.query('SELECT * FROM ai_agents WHERE id = $1', [agentId])
    if (!res.rows.length) return { success: false, message: 'Agente no encontrado' }

    const agent = res.rows[0]
    const ctrl = { abort: false }
    this.runningAgents.set(agentId, ctrl)

    await pool.query("UPDATE ai_agents SET status = 'running', updated_at = NOW() WHERE id = $1", [agentId])
    await log(agentId, 'started', `Agente "${agent.name}" iniciado. Pais: ${agent.country || 'Mexico'}. Objetivo: ${agent.target_type}`, null, null)

    this._run(agent, ctrl).catch(err => {
      console.error(`[Agent ${agentId}] Fatal:`, err.message)
    })
    return { success: true }
  }

  async stopAgent(agentId) {
    const ctrl = this.runningAgents.get(agentId)
    if (!ctrl) return { success: false, message: 'No esta corriendo' }
    ctrl.abort = true
    this.runningAgents.delete(agentId)
    await pool.query("UPDATE ai_agents SET status = 'idle', updated_at = NOW() WHERE id = $1", [agentId])
    await log(agentId, 'stopped', 'Agente detenido', null, null)
    return { success: true }
  }

  // ── MAIN LOOP ─────────────────────────────────────────────────────────────
  async _run(agent, ctrl) {
    const id = agent.id
    const country = agent.country || 'Mexico'
    const keywords = (agent.search_keywords || []).filter(k => k.trim())

    try {
      let avatar = null
      if (agent.avatar_id) {
        const av = await pool.query('SELECT * FROM avatars WHERE id = $1', [agent.avatar_id])
        avatar = av.rows[0] || null
      }

      // ═══════════════════════════════════════════════════════════════════════
      // FASE 1: DESCUBRIMIENTO — Encontrar personas clave
      // ═══════════════════════════════════════════════════════════════════════
      await log(id, 'phase', `📡 FASE 1: Descubrimiento en ${country} — buscando ${agent.target_type}...`, null, null)

      // 1A. Usar IA para generar lista de targets reales
      await log(id, 'tool_active', '🧠 Herramienta: DeepSeek IA — generando lista de targets reales...', null, null)

      const targetPrompt = this._buildTargetPrompt(agent.target_type, country, keywords)
      const targetResp = await analyzeWithDeepSeek(targetPrompt)
      let targets = []

      try {
        targets = JSON.parse(targetResp.match(/\[[\s\S]*\]/)?.[0] || '[]')
      } catch {
        await log(id, 'warning', 'Error parseando targets de IA, reintentando...', null, null)
        // Retry with simpler prompt
        const retry = await analyzeWithDeepSeek(
          `Lista 10 ${agent.target_type === 'politicians' ? 'politicos' : agent.target_type === 'celebrities' ? 'celebridades/influencers' : agent.target_type === 'startups' ? 'fundadores de startups' : agent.target_type === 'enterprises' ? 'CEOs de grandes empresas' : 'empresarios'} reales y actuales de ${country}. JSON array: [{"name":"nombre","role":"cargo","org":"organizacion"}]`
        )
        try { targets = JSON.parse(retry.match(/\[[\s\S]*\]/)?.[0] || '[]') } catch {}
      }

      await log(id, 'search_results', `IA genero ${targets.length} targets de ${country}`, null, null,
        { targets: targets.map(t => t.name) })

      if (targets.length === 0) {
        await log(id, 'error', 'No se pudieron generar targets. Verifica los keywords.', null, null)
        await pool.query("UPDATE ai_agents SET status = 'error', updated_at = NOW() WHERE id = $1", [id])
        return
      }

      // 1B. Para cada target, Wikipedia para verificar y enriquecer
      const verifiedTargets = []

      for (const target of targets.slice(0, agent.max_contacts_per_run)) {
        if (ctrl.abort) break

        await log(id, 'analyzing', `Verificando: ${target.name} — ${target.role || target.org || ''}`, target.name, target.org)

        // Wikipedia verification
        const wikiData = await this._searchWikipedia(target.name, country)
        if (wikiData) {
          target.verified = true
          target.bio = wikiData.extract?.slice(0, 300)
          target.wikipedia = wikiData.url
          await log(id, 'found_target', `✅ Verificado en Wikipedia: ${target.name}`, target.name, target.org,
            { wikipedia: wikiData.url, bio: target.bio })
        } else {
          target.verified = false
          await log(id, 'found_target', `📌 Target (sin Wikipedia): ${target.name} — ${target.role}`, target.name, target.org)
        }

        verifiedTargets.push(target)
        await sleep(1000)
      }

      // ═══════════════════════════════════════════════════════════════════════
      // FASE 2: MAPEO DE RED — Para cada target, mapear su entorno
      // ═══════════════════════════════════════════════════════════════════════
      if (ctrl.abort) return
      await log(id, 'phase', `🕸️ FASE 2: Mapeo de Red — analizando entorno de ${verifiedTargets.length} targets...`, null, null)

      const allContacts = [] // {name, role, org, email, phone, linkedin, parent}

      for (const target of verifiedTargets) {
        if (ctrl.abort) break

        await log(id, 'tool_active', `🗺️ Mapeando red de ${target.name}...`, target.name, target.org)

        // Use AI to generate network map
        const networkPrompt = `Eres un experto en inteligencia de negocios. Para la siguiente persona real de ${country}, genera un MAPA de su red de contactos cercanos (equipo, asesores, aliados, secretarios, directores, socios, etc).

Persona: ${target.name}
Cargo: ${target.role || 'N/A'}
Organizacion: ${target.org || 'N/A'}
${target.bio ? `Bio: ${target.bio}` : ''}

Genera SOLO un JSON array con personas REALES de su entorno cercano (max 8):
[{"name":"nombre real","role":"cargo","relationship":"relacion con ${target.name}","org":"organizacion"}]

IMPORTANTE: Solo personas reales verificables. No inventes.`

        try {
          const networkResp = await analyzeWithDeepSeek(networkPrompt)
          const network = JSON.parse(networkResp.match(/\[[\s\S]*\]/)?.[0] || '[]')

          // Save network map to DB
          await pool.query(
            `INSERT INTO agent_network_maps (agent_id, root_name, root_role, network, country)
             VALUES ($1, $2, $3, $4, $5)`,
            [id, target.name, target.role, JSON.stringify({ target, contacts: network }), country]
          )

          await log(id, 'network_mapped',
            `🕸️ Red de ${target.name}: ${network.length} contactos — ${network.map(n => n.name).join(', ')}`,
            target.name, target.org,
            { network: network.map(n => ({ name: n.name, role: n.role })) })

          // Add target + network to contacts list
          allContacts.push({ ...target, parent: null })
          for (const n of network) {
            allContacts.push({ ...n, parent: target.name })
          }
        } catch (err) {
          await log(id, 'warning', `Error mapeando red de ${target.name}: ${err.message}`, target.name, target.org)
          allContacts.push({ ...target, parent: null })
        }

        await sleep(2000)
      }

      await log(id, 'search_results',
        `Total contactos en red: ${allContacts.length} (${verifiedTargets.length} targets + ${allContacts.length - verifiedTargets.length} del entorno)`,
        null, null)

      // ═══════════════════════════════════════════════════════════════════════
      // FASE 3: BUSCAR CONTACTO — email, WhatsApp, LinkedIn de cada uno
      // ═══════════════════════════════════════════════════════════════════════
      if (ctrl.abort) return
      await log(id, 'phase', `🔍 FASE 3: Buscando contacto de ${allContacts.length} personas...`, null, null)

      const processedLeads = []

      for (const contact of allContacts) {
        if (ctrl.abort) break

        await log(id, 'searching', `Buscando contacto de ${contact.name}...`, contact.name, contact.org)

        // Search for contact info using multiple methods
        const info = await this._findContactInfo(contact, country, id)

        // Save as lead
        const leadId = await this._saveAsLead({ ...contact, ...info }, id)
        if (!leadId) continue

        // Enrich with Hunter if we have a website but no email
        if (!info.email && info.website) {
          try {
            const { hunterService } = await import('./hunter-service.js')
            const domain = info.website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
            const hunterResult = await hunterService.findByDomain(domain, contact.name)
            if (hunterResult.emails?.[0]) {
              info.email = hunterResult.emails[0].email
              await pool.query('UPDATE leads SET email = $1 WHERE id = $2 AND email IS NULL', [info.email, leadId])
              await log(id, 'hunter_found', `🎯 Hunter: ${info.email}`, contact.name, contact.org)
            }
          } catch {}
        }

        // Validate email
        if (info.email) {
          try {
            const { emailValidator } = await import('./email-validator.js')
            const valid = await emailValidator.validateComplete(info.email)
            if (valid?.valid === false) {
              await log(id, 'email_invalid', `❌ Email invalido: ${info.email}`, contact.name, contact.org)
              info.email = null
            }
          } catch {}
        }

        // Check WhatsApp
        if (info.phone) {
          try {
            const { default: wa } = await import('./outreach/whatsapp-connection-service.js')
            if (wa.connectionStatus === 'connected') {
              const hasWA = await wa.checkWhatsApp(info.phone).catch(() => false)
              info.hasWhatsApp = !!hasWA
              if (hasWA) await log(id, 'whatsapp_found', `✓ WhatsApp: ${info.phone}`, contact.name, contact.org)
            }
          } catch {}
        }

        const summary = [
          info.email ? `📧${info.email}` : null,
          info.phone ? `📱${info.phone}` : null,
          info.linkedin ? '💼LinkedIn' : null,
        ].filter(Boolean).join(' | ')

        await log(id, summary ? 'found_target' : 'no_contact',
          summary ? `✅ ${contact.name}: ${summary}` : `⚠️ ${contact.name}: sin datos de contacto`,
          contact.name, contact.org, info)

        await pool.query('UPDATE ai_agents SET contacts_found = contacts_found + 1, updated_at = NOW() WHERE id = $1', [id])
        processedLeads.push({ ...contact, ...info, leadId })
        await sleep(1500)
      }

      // ═══════════════════════════════════════════════════════════════════════
      // FASE 4: OUTREACH — contactar uno por uno
      // ═══════════════════════════════════════════════════════════════════════
      const contactable = processedLeads.filter(l => l.email || l.hasWhatsApp)
      if (contactable.length > 0 && !ctrl.abort) {
        await log(id, 'phase', `📨 FASE 4: Contactando ${contactable.length} de ${processedLeads.length} personas...`, null, null)
      }

      for (const lead of contactable) {
        if (ctrl.abort) break

        await log(id, 'generating_message', `Generando mensaje para ${lead.name}...`, lead.name, lead.org)

        const outreach = await this._generateMessage(agent, avatar, lead, country)
        if (!outreach) continue

        // Send Email
        if (lead.email) {
          try {
            const { emailOutreachService } = await import('./outreach/email-outreach-service.js')
            await emailOutreachService.sendEmail(lead.email, outreach.subject, outreach.html)
            await pool.query(
              `INSERT INTO outreach_messages (lead_id, channel, step, subject, body, ai_generated, status, sent_at)
               VALUES ($1, 'EMAIL', 1, $2, $3, true, 'SENT', NOW())`,
              [lead.leadId, outreach.subject, outreach.message])
            await log(id, 'email_sent', `📧 Email ENVIADO a ${lead.email}`, lead.name, lead.org)
          } catch (err) {
            await log(id, 'email_error', `Error email: ${err.message}`, lead.name, lead.org)
          }
        }

        // Send WhatsApp
        if (lead.hasWhatsApp && lead.phone) {
          try {
            const { default: wa } = await import('./outreach/whatsapp-connection-service.js')
            if (wa.connectionStatus === 'connected') {
              await wa.sendMessage(lead.phone, outreach.whatsapp)
              await pool.query(
                `INSERT INTO outreach_messages (lead_id, channel, step, subject, body, ai_generated, status, sent_at)
                 VALUES ($1, 'WHATSAPP', 1, 'WhatsApp', $2, true, 'SENT', NOW())`,
                [lead.leadId, outreach.whatsapp])
              await log(id, 'whatsapp_sent', `💬 WhatsApp ENVIADO a ${lead.phone}`, lead.name, lead.org)
            }
          } catch (err) {
            await log(id, 'whatsapp_error', `Error WA: ${err.message}`, lead.name, lead.org)
          }
        }

        await pool.query('UPDATE ai_agents SET messages_sent = messages_sent + 1, updated_at = NOW() WHERE id = $1', [id])
        await sleep(5000) // Anti-spam delay
      }

      // ═══════════════════════════════════════════════════════════════════════
      // RESUMEN
      // ═══════════════════════════════════════════════════════════════════════
      if (!ctrl.abort) {
        const stats = {
          targets: verifiedTargets.length,
          networkTotal: allContacts.length,
          withContact: processedLeads.filter(l => l.email || l.phone).length,
          emailsSent: contactable.filter(l => l.email).length,
          whatsappSent: contactable.filter(l => l.hasWhatsApp).length,
        }
        await pool.query("UPDATE ai_agents SET status = 'completed', updated_at = NOW() WHERE id = $1", [id])
        await log(id, 'completed',
          `🏁 Mision completada en ${country}. ${stats.targets} targets, ${stats.networkTotal} en red, ${stats.withContact} con contacto, ${stats.emailsSent} emails, ${stats.whatsappSent} WhatsApp.`,
          null, null, stats)
      }
    } catch (err) {
      console.error(`[Agent ${id}] Error:`, err.message)
      await pool.query("UPDATE ai_agents SET status = 'error', updated_at = NOW() WHERE id = $1", [id])
      await log(id, 'error', `Error fatal: ${err.message}`, null, null)
    } finally {
      this.runningAgents.delete(id)
    }
  }

  // ── Build target prompt per type ──────────────────────────────────────────
  _buildTargetPrompt(type, country, keywords) {
    const kw = keywords.length > 0 ? `\nEnfoque especifico: ${keywords.join(', ')}` : ''

    const prompts = {
      politicians: `Lista 12 politicos REALES y ACTUALES de ${country} (gobernadores, senadores, diputados, alcaldes, secretarios de estado, funcionarios). Incluye personas de distintos partidos y niveles de gobierno.${kw}`,
      celebrities: `Lista 12 celebridades, influencers y figuras publicas REALES y ACTUALES de ${country} que tengan negocios o marcas propias (artistas, youtubers, deportistas, conductores).${kw}`,
      business_owners: `Lista 12 empresarios y dueños de empresas REALES y ACTUALES de ${country} (CEOs, fundadores, directores generales de empresas medianas y grandes).${kw}`,
      startups: `Lista 12 fundadores de startups REALES y ACTUALES de ${country} (founders, CTOs de startups tecnologicas activas).${kw}`,
      enterprises: `Lista 12 directivos de grandes empresas/corporativos REALES y ACTUALES de ${country} (CEOs, CTOs, CIOs de empresas Fortune 500, multinacionales).${kw}`,
    }

    return `${prompts[type] || prompts.business_owners}

IMPORTANTE: Solo personas REALES que existan. No inventes.

Responde SOLO JSON array valido:
[{"name":"nombre completo real","role":"cargo actual","org":"organizacion/empresa/partido"}]`
  }

  // ── Wikipedia Search ──────────────────────────────────────────────────────
  async _searchWikipedia(name, country) {
    try {
      // Search Wikipedia in Spanish
      const searchUrl = `https://es.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name + ' ' + country)}&format=json&srlimit=3`
      const searchResp = await axios.get(searchUrl, { timeout: 8000 })
      const results = searchResp.data?.query?.search || []

      if (results.length === 0) {
        // Try English Wikipedia
        const enUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name)}&format=json&srlimit=3`
        const enResp = await axios.get(enUrl, { timeout: 8000 })
        const enResults = enResp.data?.query?.search || []
        if (enResults.length === 0) return null

        const title = enResults[0].title
        const extResp = await axios.get(`https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=extracts&exintro&explaintext&format=json`, { timeout: 8000 })
        const pages = extResp.data?.query?.pages || {}
        const page = Object.values(pages)[0]
        return page?.extract ? { extract: page.extract, url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}` } : null
      }

      const title = results[0].title
      const extResp = await axios.get(`https://es.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=extracts&exintro&explaintext&format=json`, { timeout: 8000 })
      const pages = extResp.data?.query?.pages || {}
      const page = Object.values(pages)[0]
      return page?.extract ? { extract: page.extract, url: `https://es.wikipedia.org/wiki/${encodeURIComponent(title)}` } : null
    } catch {
      return null
    }
  }

  // ── Find contact info ─────────────────────────────────────────────────────
  async _findContactInfo(contact, country, agentId) {
    const info = { email: null, phone: null, linkedin: null, website: null, twitter: null }

    // 1. Use DDG Lite to find their website/LinkedIn
    try {
      const query = `${contact.name} ${contact.org || ''} ${country} contacto`
      const results = await this._searchDDGLite(query)

      for (const r of results.slice(0, 5)) {
        if (r.url.includes('linkedin.com/in')) info.linkedin = r.url
        if (r.url.includes('twitter.com/') || r.url.includes('x.com/')) info.twitter = r.url
        if (!info.website && !r.url.includes('wikipedia') && !r.url.includes('linkedin') &&
            !r.url.includes('twitter') && !r.url.includes('facebook') && !r.url.includes('youtube')) {
          info.website = r.url
        }
      }
    } catch {}

    // 2. If no LinkedIn, search specifically
    if (!info.linkedin) {
      try {
        const liResults = await this._searchDDGLite(`site:linkedin.com/in "${contact.name}" ${country}`)
        const li = liResults.find(r => r.url.includes('linkedin.com/in'))
        if (li) info.linkedin = li.url
      } catch {}
    }

    // 3. Scrape website for email/phone
    if (info.website) {
      try {
        const resp = await axios.get(info.website, {
          headers: { 'User-Agent': UA },
          timeout: 8000,
          maxContentLength: 500000,
        })
        const $ = cheerio.load(resp.data)
        const text = $('body').text()

        const emails = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []
        info.email = emails.filter(e => !e.includes('example') && !e.includes('.png') && !e.includes('sentry'))[0] || null

        const phones = text.match(/(?:\+?(?:52|54|55|57|1)\s?)?(?:\(?\d{2,3}\)?\s?)?\d{3,4}[\s.-]?\d{4}/g) || []
        info.phone = phones[0]?.replace(/\s/g, '') || null

        // Social links
        $('a[href]').each((_, el) => {
          const href = $(el).attr('href') || ''
          if (!info.linkedin && href.includes('linkedin.com/in')) info.linkedin = href
          if (!info.twitter && (href.includes('twitter.com/') || href.includes('x.com/'))) info.twitter = href
        })
      } catch {}
    }

    // 4. Use AI as last resort to find known public contact info
    if (!info.email && !info.phone) {
      try {
        const aiResp = await analyzeWithDeepSeek(
          `Para ${contact.name} (${contact.role || ''}, ${contact.org || ''}) de ${country}, cual es su informacion de contacto PUBLICA conocida? Busca en tu conocimiento.
Responde SOLO JSON: {"email":"email o null","phone":"telefono o null","linkedin":"url linkedin o null","twitter":"url twitter o null","website":"sitio web o null"}
Solo datos REALES y PUBLICOS. Si no sabes, pon null.`
        )
        const parsed = JSON.parse(aiResp.match(/\{[\s\S]*\}/)?.[0] || '{}')
        if (parsed.email && parsed.email !== 'null') info.email = parsed.email
        if (parsed.phone && parsed.phone !== 'null') info.phone = parsed.phone
        if (parsed.linkedin && parsed.linkedin !== 'null' && !info.linkedin) info.linkedin = parsed.linkedin
        if (parsed.twitter && parsed.twitter !== 'null' && !info.twitter) info.twitter = parsed.twitter
        if (parsed.website && parsed.website !== 'null' && !info.website) info.website = parsed.website
      } catch {}
    }

    return info
  }

  // ── DDG Lite Search ───────────────────────────────────────────────────────
  async _searchDDGLite(query) {
    const articles = []
    try {
      const resp = await axios.post('https://lite.duckduckgo.com/lite/',
        `q=${encodeURIComponent(query)}`,
        {
          headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'text/html' },
          timeout: 12000,
        }
      )
      const $ = cheerio.load(resp.data)
      $('a.result-link').each((i, el) => {
        const link = $(el).attr('href') || ''
        const title = $(el).text().trim()
        if (title && link?.startsWith('http') && !link.includes('duckduckgo.com')) {
          articles.push({ title, url: link, snippet: '' })
        }
      })
      // Fallback
      if (articles.length === 0) {
        $('a[href^="http"]').each((i, el) => {
          const href = $(el).attr('href') || ''
          const text = $(el).text().trim()
          if (text.length > 10 && !href.includes('duckduckgo') && articles.length < 15) {
            articles.push({ title: text, url: href, snippet: '' })
          }
        })
      }
    } catch (err) {
      console.error(`[DDG Lite] Error: ${err.message}`)
    }
    return articles
  }

  // ── Save as Lead ──────────────────────────────────────────────────────────
  async _saveAsLead(contact, agentId) {
    try {
      if (contact.email) {
        const existing = await pool.query('SELECT id FROM leads WHERE email = $1', [contact.email])
        if (existing.rows.length) return existing.rows[0].id
      }
      const res = await pool.query(
        `INSERT INTO leads (name, email, phone, website, sector, source_url, status, score, social_linkedin)
         VALUES ($1, $2, $3, $4, $5, $6, 'new', 50, $7) RETURNING id`,
        [
          contact.name || 'Target',
          contact.email || null,
          contact.phone || null,
          contact.website || null,
          `ai-agent:${contact.role || 'discovery'}`,
          contact.wikipedia || contact.website || null,
          contact.linkedin || null,
        ]
      )
      return res.rows[0]?.id
    } catch (err) {
      console.error('[Agent] Save lead error:', err.message)
      return null
    }
  }

  // ── Generate outreach message ─────────────────────────────────────────────
  async _generateMessage(agent, avatar, lead, country) {
    try {
      const from = avatar?.name || 'Adbize'
      const role = avatar?.role || 'Business Development'

      const resp = await analyzeWithDeepSeek(
        `Eres ${from}, ${role} en Adbize (desarrollo de software, IA, apps, automatizacion).
Genera outreach para:

Persona: ${lead.name}
Cargo: ${lead.role || 'N/A'}
Org: ${lead.org || 'N/A'}
Pais: ${country}
${agent.strategy ? `Estrategia: ${agent.strategy}` : ''}

JSON valido:
{"subject":"asunto email (max 8 palabras)","message":"email profesional (max 120 palabras)","whatsapp":"mensaje WhatsApp directo (max 50 palabras)"}`)

      const parsed = JSON.parse(resp.match(/\{[\s\S]*\}/)?.[0] || '{}')

      const html = `<div style="font-family:Arial;max-width:600px;padding:20px;">
<p style="font-size:15px;color:#333;line-height:1.6;">${(parsed.message || '').replace(/\n/g, '<br>')}</p>
<div style="margin-top:20px;padding-top:15px;border-top:1px solid #eee;">
<p style="font-size:13px;color:#666;"><strong>${from}</strong><br>${role} — Adbize<br>${avatar?.email || 'contacto@adbize.com'}</p>
</div></div>`

      return {
        subject: parsed.subject || `Propuesta para ${lead.org || lead.name}`,
        message: parsed.message || '',
        html,
        whatsapp: parsed.whatsapp || parsed.message?.slice(0, 250) || '',
      }
    } catch {
      return null
    }
  }
}

export default AgentRunnerService
