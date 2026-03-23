import { pool } from '../config/database.js'
import { analyzeWithDeepSeek } from './deepseek.js'
import axios from 'axios'
import * as cheerio from 'cheerio'
import { EventEmitter } from 'events'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function initAgentTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_agents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL, avatar_id UUID, target_type VARCHAR(50) NOT NULL,
      country VARCHAR(50) DEFAULT 'Mexico', search_keywords TEXT[] DEFAULT '{}',
      strategy TEXT DEFAULT '', status VARCHAR(20) DEFAULT 'idle',
      channels TEXT[] DEFAULT '{email,whatsapp}',
      tools TEXT[] DEFAULT '{wikipedia,ai_network,scraping,email,whatsapp,enrichment,hunter,apollo}',
      max_contacts_per_run INT DEFAULT 10, contacts_found INT DEFAULT 0,
      messages_sent INT DEFAULT 0, responses_received INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS agent_activity_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
      action VARCHAR(50) NOT NULL, detail TEXT,
      target_name VARCHAR(200), target_company VARCHAR(200),
      metadata JSONB DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS agent_network_maps (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
      root_name VARCHAR(200) NOT NULL, root_role VARCHAR(200),
      network JSONB DEFAULT '{}', country VARCHAR(50),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `)
  await pool.query(`ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS country VARCHAR(50) DEFAULT 'Mexico'`).catch(() => {})
  await pool.query(`ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS tools TEXT[] DEFAULT '{}'`).catch(() => {})
}

async function log(agentId, action, detail, name, company, meta = {}) {
  await pool.query(
    `INSERT INTO agent_activity_logs (agent_id, action, detail, target_name, target_company, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [agentId, action, detail, name || null, company || null, JSON.stringify(meta)]
  )
}

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
    if (this.runningAgents.has(agentId)) return { success: false, message: 'Ya corriendo' }
    const res = await pool.query('SELECT * FROM ai_agents WHERE id = $1', [agentId])
    if (!res.rows.length) return { success: false, message: 'No encontrado' }
    const agent = res.rows[0]
    const ctrl = { abort: false }
    this.runningAgents.set(agentId, ctrl)
    await pool.query("UPDATE ai_agents SET status = 'running', updated_at = NOW() WHERE id = $1", [agentId])
    await log(agentId, 'started', `Agente "${agent.name}" iniciado — busqueda indefinida en ${agent.country || 'Mexico'}`, null, null)
    this._run(agent, ctrl).catch(err => console.error(`[Agent ${agentId}] Fatal:`, err.message))
    return { success: true }
  }

  async stopAgent(agentId) {
    const ctrl = this.runningAgents.get(agentId)
    if (!ctrl) return { success: false, message: 'No corriendo' }
    ctrl.abort = true
    this.runningAgents.delete(agentId)
    await pool.query("UPDATE ai_agents SET status = 'idle', updated_at = NOW() WHERE id = $1", [agentId])
    await log(agentId, 'stopped', 'Agente detenido', null, null)
    return { success: true }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MAIN LOOP — runs indefinitely until stopped
  // ══════════════════════════════════════════════════════════════════════════
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

      let cycle = 0
      const processedNames = new Set()

      // ── INDEFINITE LOOP ─────────────────────────────────────────────────
      while (!ctrl.abort) {
        cycle++
        await log(id, 'phase', `🔄 CICLO ${cycle} — Buscando nuevos targets en ${country}...`, null, null)

        // ── FASE 1: DESCUBRIMIENTO ────────────────────────────────────────
        const exclude = processedNames.size > 0 ? Array.from(processedNames).slice(-30) : []
        const prompt = this._buildTargetPrompt(agent.target_type, country, keywords, exclude)
        const resp = await analyzeWithDeepSeek(prompt)

        let targets = []
        try { targets = JSON.parse(resp.match(/\[[\s\S]*\]/)?.[0] || '[]') } catch {}

        // Filter already processed
        targets = targets.filter(t => t.name && !processedNames.has(t.name))

        if (targets.length === 0) {
          await log(id, 'warning', `Ciclo ${cycle}: No hay nuevos targets. Ampliando busqueda...`, null, null)
          // Try broader search
          const broader = await analyzeWithDeepSeek(
            `Lista 15 personas DIFERENTES relacionadas con ${agent.target_type === 'politicians' ? 'la politica, gobierno, partidos politicos, funcionarios publicos, asesores politicos, directores de campana, secretarios' : agent.target_type === 'celebrities' ? 'el entretenimiento, influencers, deportistas, artistas, marcas personales' : 'negocios, empresas, tecnologia, startups, corporativos'} de ${country} que NO esten en esta lista: ${exclude.slice(0, 20).join(', ')}. JSON: [{"name":"nombre","role":"cargo","org":"org"}]`
          )
          try { targets = JSON.parse(broader.match(/\[[\s\S]*\]/)?.[0] || '[]').filter(t => t.name && !processedNames.has(t.name)) } catch {}
        }

        if (targets.length === 0 && cycle > 1) {
          await log(id, 'waiting', 'Sin nuevos targets. Esperando 60s antes de reintentar...', null, null)
          await sleep(60000)
          continue
        }

        await log(id, 'search_results', `${targets.length} nuevos targets encontrados en ciclo ${cycle}`, null, null)

        // Wikipedia verify
        for (const t of targets.slice(0, 8)) {
          if (ctrl.abort) break
          const wiki = await this._searchWikipedia(t.name, country)
          if (wiki) { t.bio = wiki.extract?.slice(0, 300); t.wikipedia = wiki.url }
          await log(id, 'found_target', `${wiki ? '✅' : '📌'} ${t.name} — ${t.role || ''}`, t.name, t.org)
          processedNames.add(t.name)
          await sleep(800)
        }

        // ── FASE 2: MAPEO PROFUNDO DE RED ─────────────────────────────────
        if (ctrl.abort) break
        await log(id, 'phase', `🕸️ FASE 2: Mapeo profundo — explorando redes de ${targets.length} targets...`, null, null)

        const allContacts = []

        for (const target of targets.slice(0, 8)) {
          if (ctrl.abort) break

          // Deep exploration: target → contacts → sub-contacts
          const deep = await this._exploreDeep(id, target, country, ctrl, processedNames)
          allContacts.push({ ...target, parent: null, depth: 0 })
          allContacts.push(...deep)
          await sleep(2000)
        }

        await log(id, 'search_results', `Red total: ${allContacts.length} personas (${targets.length} targets + ${allContacts.length - targets.length} del entorno)`, null, null)

        // ── FASE 3: BUSCAR CONTACTO ───────────────────────────────────────
        if (ctrl.abort) break
        await log(id, 'phase', `🔍 FASE 3: Buscando contacto de ${allContacts.length} personas...`, null, null)

        const leads = []
        for (const c of allContacts) {
          if (ctrl.abort) break
          const info = await this._findContactInfo(c, country, id)
          const leadId = await this._saveAsLead({ ...c, ...info }, id)
          if (!leadId) continue

          if (!info.email && info.website) {
            try {
              const { hunterService } = await import('./hunter-service.js')
              const domain = info.website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
              const hr = await hunterService.findByDomain(domain, c.name)
              if (hr.emails?.[0]) { info.email = hr.emails[0].email; await pool.query('UPDATE leads SET email=$1 WHERE id=$2 AND email IS NULL', [info.email, leadId]) }
            } catch {}
          }

          const s = [info.email ? `📧${info.email}` : null, info.phone ? `📱${info.phone}` : null, info.linkedin ? '💼LI' : null].filter(Boolean).join(' | ')
          await log(id, s ? 'found_target' : 'no_contact', s ? `✅ ${c.name}: ${s}` : `⚠️ ${c.name}: sin contacto`, c.name, c.org, info)
          await pool.query('UPDATE ai_agents SET contacts_found = contacts_found + 1, updated_at = NOW() WHERE id = $1', [id])
          leads.push({ ...c, ...info, leadId })
          await sleep(1500)
        }

        // ── FASE 4: OUTREACH ──────────────────────────────────────────────
        const contactable = leads.filter(l => l.email || l.hasWhatsApp)
        if (contactable.length > 0 && !ctrl.abort) {
          await log(id, 'phase', `📨 FASE 4: Contactando ${contactable.length} personas...`, null, null)

          for (const lead of contactable) {
            if (ctrl.abort) break
            const out = await this._generateMessage(agent, avatar, lead, country)
            if (!out) continue

            if (lead.email) {
              try {
                const { emailOutreachService } = await import('./outreach/email-outreach-service.js')
                await emailOutreachService.sendEmail(lead.email, out.subject, out.html)
                await pool.query(`INSERT INTO outreach_messages (lead_id,channel,step,subject,body,ai_generated,status,sent_at) VALUES($1,'EMAIL',1,$2,$3,true,'SENT',NOW())`, [lead.leadId, out.subject, out.message])
                await log(id, 'email_sent', `📧 Email ENVIADO a ${lead.email}`, lead.name, lead.org)
              } catch (e) { await log(id, 'email_error', `Error email: ${e.message}`, lead.name, lead.org) }
            }

            if (lead.hasWhatsApp && lead.phone) {
              try {
                const { default: wa } = await import('./outreach/whatsapp-connection-service.js')
                if (wa.connectionStatus === 'connected') {
                  await wa.sendMessage(lead.phone, out.whatsapp)
                  await pool.query(`INSERT INTO outreach_messages (lead_id,channel,step,subject,body,ai_generated,status,sent_at) VALUES($1,'WHATSAPP',1,'WA',$2,true,'SENT',NOW())`, [lead.leadId, out.whatsapp])
                  await log(id, 'whatsapp_sent', `💬 WhatsApp ENVIADO a ${lead.phone}`, lead.name, lead.org)
                }
              } catch (e) { await log(id, 'whatsapp_error', `Error WA: ${e.message}`, lead.name, lead.org) }
            }

            await pool.query('UPDATE ai_agents SET messages_sent = messages_sent + 1, updated_at = NOW() WHERE id = $1', [id])
            await sleep(5000)
          }
        }

        // Cycle complete
        await log(id, 'cycle_complete', `✅ Ciclo ${cycle} completado: ${allContacts.length} personas, ${contactable.length} contactados. Siguiente ciclo en 30s...`, null, null)
        await sleep(30000) // Cooldown between cycles
      }

      // Stopped by user
      await pool.query("UPDATE ai_agents SET status = 'idle', updated_at = NOW() WHERE id = $1", [id])
    } catch (err) {
      console.error(`[Agent ${id}] Error:`, err.message)
      await pool.query("UPDATE ai_agents SET status = 'error', updated_at = NOW() WHERE id = $1", [id])
      await log(id, 'error', `Error: ${err.message}`, null, null)
    } finally {
      this.runningAgents.delete(id)
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DEEP NETWORK EXPLORATION — recursive: contacts → sub-contacts
  // ══════════════════════════════════════════════════════════════════════════
  async _exploreDeep(agentId, person, country, ctrl, visited, depth = 1, maxDepth = 2) {
    if (depth > maxDepth || ctrl.abort || visited.has(person.name)) return []
    visited.add(person.name)

    const indent = '  '.repeat(depth)
    await log(agentId, 'tool_active', `${indent}🔍 Nivel ${depth}: Explorando red de ${person.name}...`, person.name, person.org)

    const prompt = `Para ${person.name} (${person.role || ''}, ${person.org || ''}) de ${country}, lista su equipo cercano y contactos clave REALES (asesores, secretarios, directores, socios, aliados, colaboradores).
${depth === 1 ? 'Max 8 personas.' : 'Max 5 personas.'}
JSON array: [{"name":"nombre real","role":"cargo","relationship":"relacion con ${person.name}","org":"organizacion"}]
Solo personas REALES. No inventes.`

    try {
      const resp = await analyzeWithDeepSeek(prompt)
      const contacts = JSON.parse(resp.match(/\[[\s\S]*\]/)?.[0] || '[]')
        .filter(c => c.name && !visited.has(c.name))

      // Save network map
      await pool.query(
        `INSERT INTO agent_network_maps (agent_id, root_name, root_role, network, country) VALUES ($1,$2,$3,$4,$5)`,
        [agentId, person.name, person.role, JSON.stringify({ target: person, contacts, depth }), country]
      )

      await log(agentId, 'network_mapped',
        `${indent}🕸️ ${person.name}: ${contacts.length} contactos — ${contacts.map(c => c.name).join(', ')}`,
        person.name, person.org)

      const result = []
      for (const c of contacts) {
        if (ctrl.abort) break
        visited.add(c.name)
        result.push({ ...c, parent: person.name, depth })

        // Recurse deeper
        if (depth < maxDepth) {
          const sub = await this._exploreDeep(agentId, c, country, ctrl, visited, depth + 1, maxDepth)
          result.push(...sub)
        }
        await sleep(1500)
      }
      return result
    } catch (err) {
      await log(agentId, 'warning', `Error explorando ${person.name}: ${err.message}`, person.name, person.org)
      return []
    }
  }

  // ── Build target prompt ───────────────────────────────────────────────────
  _buildTargetPrompt(type, country, keywords, exclude = []) {
    const kw = keywords.length > 0 ? `\nEnfoque: ${keywords.join(', ')}` : ''
    const excl = exclude.length > 0 ? `\nNO incluyas a: ${exclude.join(', ')}` : ''

    const prompts = {
      politicians: `Lista 12 politicos REALES y ACTUALES de ${country} (gobernadores, senadores, diputados, alcaldes, secretarios, funcionarios, asesores politicos, directores de campana). Distintos partidos y niveles.${kw}${excl}`,
      celebrities: `Lista 12 celebridades/influencers/figuras publicas REALES de ${country} con negocios o marcas.${kw}${excl}`,
      business_owners: `Lista 12 empresarios/dueños REALES de ${country} (CEOs, fundadores).${kw}${excl}`,
      startups: `Lista 12 fundadores de startups REALES de ${country}.${kw}${excl}`,
      enterprises: `Lista 12 directivos de grandes empresas REALES de ${country} (CEO, CTO, CIO).${kw}${excl}`,
    }

    return `${prompts[type] || prompts.business_owners}\nResponde SOLO JSON: [{"name":"nombre","role":"cargo","org":"organizacion"}]`
  }

  // ── Wikipedia ─────────────────────────────────────────────────────────────
  async _searchWikipedia(name, country) {
    try {
      const url = `https://es.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name + ' ' + country)}&format=json&srlimit=3`
      const r = await axios.get(url, { timeout: 8000 })
      const results = r.data?.query?.search || []
      if (!results.length) {
        const en = await axios.get(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name)}&format=json&srlimit=3`, { timeout: 8000 })
        const enR = en.data?.query?.search || []
        if (!enR.length) return null
        const t = enR[0].title
        const ext = await axios.get(`https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(t)}&prop=extracts&exintro&explaintext&format=json`, { timeout: 8000 })
        const p = Object.values(ext.data?.query?.pages || {})[0]
        return p?.extract ? { extract: p.extract, url: `https://en.wikipedia.org/wiki/${encodeURIComponent(t)}` } : null
      }
      const t = results[0].title
      const ext = await axios.get(`https://es.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(t)}&prop=extracts&exintro&explaintext&format=json`, { timeout: 8000 })
      const p = Object.values(ext.data?.query?.pages || {})[0]
      return p?.extract ? { extract: p.extract, url: `https://es.wikipedia.org/wiki/${encodeURIComponent(t)}` } : null
    } catch { return null }
  }

  // ── Find contact info ─────────────────────────────────────────────────────
  async _findContactInfo(contact, country) {
    const info = { email: null, phone: null, linkedin: null, website: null, twitter: null }
    try {
      const results = await this._searchDDGLite(`${contact.name} ${contact.org || ''} ${country} contacto`)
      for (const r of results.slice(0, 5)) {
        if (r.url.includes('linkedin.com/in')) info.linkedin = r.url
        if (r.url.includes('twitter.com/') || r.url.includes('x.com/')) info.twitter = r.url
        if (!info.website && !r.url.includes('wikipedia') && !r.url.includes('linkedin') && !r.url.includes('twitter') && !r.url.includes('facebook')) info.website = r.url
      }
    } catch {}

    if (!info.linkedin) {
      try {
        const li = await this._searchDDGLite(`site:linkedin.com/in "${contact.name}" ${country}`)
        const f = li.find(r => r.url.includes('linkedin.com/in'))
        if (f) info.linkedin = f.url
      } catch {}
    }

    if (info.website) {
      try {
        const resp = await axios.get(info.website, { headers: { 'User-Agent': UA }, timeout: 8000, maxContentLength: 500000 })
        const $ = cheerio.load(resp.data); const text = $('body').text()
        const emails = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []
        info.email = emails.filter(e => !e.includes('example') && !e.includes('.png') && !e.includes('sentry'))[0] || null
        const phones = text.match(/(?:\+?(?:52|54|55|57|1)\s?)?(?:\(?\d{2,3}\)?\s?)?\d{3,4}[\s.-]?\d{4}/g) || []
        info.phone = phones[0]?.replace(/\s/g, '') || null
        $('a[href]').each((_, el) => {
          const h = $(el).attr('href') || ''
          if (!info.linkedin && h.includes('linkedin.com/in')) info.linkedin = h
        })
      } catch {}
    }

    if (!info.email && !info.phone) {
      try {
        const ai = await analyzeWithDeepSeek(`Contacto PUBLICO de ${contact.name} (${contact.role || ''}, ${contact.org || ''}, ${country}). JSON: {"email":"o null","phone":"o null","linkedin":"o null","twitter":"o null","website":"o null"} Solo datos REALES.`)
        const p = JSON.parse(ai.match(/\{[\s\S]*\}/)?.[0] || '{}')
        if (p.email && p.email !== 'null') info.email = p.email
        if (p.phone && p.phone !== 'null') info.phone = p.phone
        if (p.linkedin && p.linkedin !== 'null' && !info.linkedin) info.linkedin = p.linkedin
        if (p.website && p.website !== 'null' && !info.website) info.website = p.website
      } catch {}
    }
    return info
  }

  async _searchDDGLite(query) {
    const articles = []
    try {
      const resp = await axios.post('https://lite.duckduckgo.com/lite/', `q=${encodeURIComponent(query)}`, {
        headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 12000,
      })
      const $ = cheerio.load(resp.data)
      $('a.result-link').each((i, el) => {
        const link = $(el).attr('href') || ''; const title = $(el).text().trim()
        if (title && link?.startsWith('http') && !link.includes('duckduckgo.com')) articles.push({ title, url: link, snippet: '' })
      })
      if (!articles.length) {
        $('a[href^="http"]').each((i, el) => {
          const h = $(el).attr('href') || ''; const t = $(el).text().trim()
          if (t.length > 10 && !h.includes('duckduckgo') && articles.length < 15) articles.push({ title: t, url: h, snippet: '' })
        })
      }
    } catch {}
    return articles
  }

  async _saveAsLead(c, agentId) {
    try {
      if (c.email) { const ex = await pool.query('SELECT id FROM leads WHERE email=$1', [c.email]); if (ex.rows.length) return ex.rows[0].id }
      const r = await pool.query(
        `INSERT INTO leads (name,email,phone,website,sector,source_url,status,score,social_linkedin) VALUES($1,$2,$3,$4,$5,$6,'new',50,$7) RETURNING id`,
        [c.name || 'Target', c.email, c.phone, c.website, `ai-agent:${c.role || 'discovery'}`, c.wikipedia || c.website, c.linkedin]
      )
      return r.rows[0]?.id
    } catch { return null }
  }

  async _generateMessage(agent, avatar, lead, country) {
    try {
      const from = avatar?.name || 'Adbize'; const role = avatar?.role || 'Business Development'
      const r = await analyzeWithDeepSeek(`Eres ${from}, ${role} en Adbize (software, IA, apps). Outreach para ${lead.name} (${lead.role||''}, ${lead.org||''}, ${country}). ${agent.strategy||''} JSON: {"subject":"max 8 palabras","message":"max 120 palabras","whatsapp":"max 50 palabras"}`)
      const p = JSON.parse(r.match(/\{[\s\S]*\}/)?.[0] || '{}')
      return { subject: p.subject || 'Propuesta Adbize', message: p.message || '', html: `<div style="font-family:Arial;padding:20px;"><p style="font-size:15px;color:#333;line-height:1.6;">${(p.message||'').replace(/\n/g,'<br>')}</p><p style="font-size:13px;color:#666;margin-top:20px;border-top:1px solid #eee;padding-top:15px;"><strong>${from}</strong><br>${role} — Adbize</p></div>`, whatsapp: p.whatsapp || '' }
    } catch { return null }
  }
}

export default AgentRunnerService
