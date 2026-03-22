/**
 * Apollo-style People & Company Search
 *
 * Finds decision-makers and company info for B2B outreach.
 * - With APOLLO_API_KEY: uses Apollo.io API (free tier: 10k records/month)
 * - Without key: scrapes public sources (DuckDuckGo, company websites, directories)
 */

import axios from 'axios'
import * as cheerio from 'cheerio'
import { analyzeWithDeepSeek } from './deepseek.js'

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
]

function randomUA() { return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)] }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

class ApolloService {
  constructor() {
    this.apiKey = process.env.APOLLO_API_KEY || null
    this.cache = new Map()
  }

  /**
   * Search for people by criteria
   * @param {Object} params
   * @param {string} [params.title] - Job title filter (CEO, CTO, Founder, etc)
   * @param {string} [params.company] - Company name
   * @param {string} [params.industry] - Industry/sector
   * @param {string} [params.location] - City/Country
   * @param {string} [params.keywords] - General keywords
   * @param {number} [params.limit] - Max results (default 10)
   * @returns {{ people: Array<{name, title, company, email, phone, linkedin, location}> }}
   */
  async searchPeople(params = {}) {
    const { title, company, industry, location, keywords, limit = 10 } = params

    const cacheKey = JSON.stringify(params)
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey)

    let result

    if (this.apiKey) {
      result = await this._apolloApiSearch(params)
    } else {
      result = await this._scrapePeople(params)
    }

    this.cache.set(cacheKey, result)
    return result
  }

  /**
   * Search for companies
   * @param {Object} params
   * @param {string} [params.name] - Company name
   * @param {string} [params.industry] - Industry/sector
   * @param {string} [params.location] - City/Country
   * @param {string} [params.size] - Employee range (1-10, 11-50, 51-200, etc)
   * @param {number} [params.limit]
   */
  async searchCompanies(params = {}) {
    if (this.apiKey) {
      return this._apolloApiCompanies(params)
    }
    return this._scrapeCompanies(params)
  }

  /**
   * Enrich a person — get more info from name + company
   */
  async enrichPerson(name, company, domain = null) {
    if (this.apiKey) {
      return this._apolloEnrich(name, company, domain)
    }
    return this._scrapeEnrichPerson(name, company, domain)
  }

  // ── Apollo.io API (free tier) ─────────────────────────────────────────────

  async _apolloApiSearch({ title, company, industry, location, keywords, limit = 10 }) {
    try {
      const body = {
        page: 1,
        per_page: Math.min(limit, 25),
      }

      if (title) body.person_titles = [title]
      if (company) body.q_organization_name = company
      if (industry) body.person_seniorities = ['owner', 'founder', 'c_suite', 'director']
      if (location) body.person_locations = [location]
      if (keywords) body.q_keywords = keywords

      const resp = await axios.post('https://api.apollo.io/v1/mixed_people/search', body, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'X-Api-Key': this.apiKey,
        },
        timeout: 15000,
      })

      const people = (resp.data?.people || []).map(p => ({
        name: p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim(),
        title: p.title || p.headline || '',
        company: p.organization?.name || '',
        email: p.email || null,
        phone: p.phone_numbers?.[0]?.sanitized_number || null,
        linkedin: p.linkedin_url || null,
        location: p.city ? `${p.city}, ${p.state || p.country || ''}` : null,
        website: p.organization?.website_url || null,
        industry: p.organization?.industry || null,
        companySize: p.organization?.estimated_num_employees || null,
        source: 'apollo.io',
      }))

      return { people, total: resp.data?.pagination?.total_entries || people.length }
    } catch (err) {
      console.error(`[Apollo API] Error: ${err.response?.data?.message || err.message}`)
      return this._scrapePeople({ title, company, industry, location, keywords, limit })
    }
  }

  async _apolloApiCompanies({ name, industry, location, size, limit = 10 }) {
    try {
      const body = {
        page: 1,
        per_page: Math.min(limit, 25),
      }

      if (name) body.q_organization_name = name
      if (industry) body.organization_industry_tag_ids = [industry]
      if (location) body.organization_locations = [location]
      if (size) body.organization_num_employees_ranges = [size]

      const resp = await axios.post('https://api.apollo.io/v1/mixed_companies/search', body, {
        headers: { 'Content-Type': 'application/json', 'X-Api-Key': this.apiKey },
        timeout: 15000,
      })

      const companies = (resp.data?.organizations || []).map(o => ({
        name: o.name,
        website: o.website_url,
        industry: o.industry,
        size: o.estimated_num_employees,
        location: o.city ? `${o.city}, ${o.state || o.country || ''}` : null,
        linkedin: o.linkedin_url,
        phone: o.phone || null,
        description: o.short_description || '',
        source: 'apollo.io',
      }))

      return { companies, total: resp.data?.pagination?.total_entries || companies.length }
    } catch (err) {
      console.error(`[Apollo Companies] Error: ${err.message}`)
      return this._scrapeCompanies({ name, industry, location, size, limit })
    }
  }

  async _apolloEnrich(name, company, domain) {
    try {
      const [firstName, ...lastParts] = (name || '').split(' ')
      const lastName = lastParts.join(' ')

      const resp = await axios.post('https://api.apollo.io/v1/people/match', {
        first_name: firstName,
        last_name: lastName,
        organization_name: company,
        domain: domain,
      }, {
        headers: { 'Content-Type': 'application/json', 'X-Api-Key': this.apiKey },
        timeout: 10000,
      })

      const p = resp.data?.person
      if (!p) return null

      return {
        name: p.name || name,
        title: p.title,
        email: p.email,
        phone: p.phone_numbers?.[0]?.sanitized_number || null,
        linkedin: p.linkedin_url,
        company: p.organization?.name || company,
        website: p.organization?.website_url,
        source: 'apollo.io',
      }
    } catch {
      return this._scrapeEnrichPerson(name, company, domain)
    }
  }

  // ── Free scraping fallback ────────────────────────────────────────────────

  async _scrapePeople({ title, company, industry, location, keywords, limit = 10 }) {
    const people = []

    // Build search queries
    const queries = []
    if (company) {
      queries.push(`"${company}" ${title || 'CEO director fundador'} ${location || 'Mexico'} contacto`)
    }
    if (keywords) {
      queries.push(`${keywords} ${title || 'CEO'} ${location || 'Mexico'} email contacto`)
    }
    if (industry) {
      queries.push(`${title || 'CEO'} ${industry} ${location || 'Mexico'} empresa`)
    }
    if (queries.length === 0) {
      queries.push(`${title || 'CEO empresa'} ${location || 'Mexico'} tecnologia contacto email`)
    }

    for (const query of queries.slice(0, 3)) {
      if (people.length >= limit) break

      try {
        // Search DuckDuckGo
        const resp = await axios.get(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
          headers: { 'User-Agent': randomUA(), 'Accept-Language': 'es-MX,es;q=0.9' },
          timeout: 12000,
        })

        const $ = cheerio.load(resp.data)
        const results = []
        $('.result').each((i, el) => {
          const titleEl = $(el).find('.result__title a')
          const t = titleEl.text().trim()
          let link = titleEl.attr('href') || ''
          const snippet = $(el).find('.result__snippet').text().trim()
          if (link.includes('uddg=')) {
            try { link = new URL(link, 'https://duckduckgo.com').searchParams.get('uddg') || link } catch {}
          }
          if (t && link?.startsWith('http')) results.push({ title: t, url: link, snippet })
        })

        // Use AI to extract people from search results
        if (results.length > 0) {
          const context = results.slice(0, 6).map(r => `${r.title} — ${r.snippet}`).join('\n')

          try {
            const aiResp = await analyzeWithDeepSeek(
              `De los siguientes resultados de busqueda, extrae personas con cargos de liderazgo (CEO, CTO, Director, Fundador, etc).
Responde SOLO un JSON array valido:
[{"name":"nombre","title":"cargo","company":"empresa","location":"ubicacion o null"}]

Si no hay personas claras, responde [].

Resultados:
${context.slice(0, 2000)}`
            )

            const parsed = JSON.parse(aiResp.match(/\[[\s\S]*\]/)?.[0] || '[]')
            for (const p of parsed) {
              if (people.length >= limit) break
              if (p.name && p.name !== 'null') {
                people.push({
                  name: p.name,
                  title: p.title || '',
                  company: p.company || '',
                  email: null,
                  phone: null,
                  linkedin: null,
                  location: p.location || location || null,
                  source: 'scraping',
                })
              }
            }
          } catch {}
        }

        // Also try to scrape result pages for contact info
        for (const r of results.slice(0, 3)) {
          if (people.length >= limit) break
          try {
            const pageResp = await axios.get(r.url, {
              headers: { 'User-Agent': randomUA() },
              timeout: 6000,
              maxContentLength: 300000,
            })
            const page$ = cheerio.load(pageResp.data)
            const pageText = page$('body').text()

            const emails = pageText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []
            const phones = pageText.match(/(?:\+?(?:52|54)\s?)?(?:\(?\d{2,3}\)?\s?)?\d{3,4}[\s.-]?\d{4}/g) || []

            const goodEmail = emails.filter(e =>
              !e.includes('example') && !e.includes('sentry') && !e.includes('.png') && !e.includes('wordpress')
            )[0] || null

            const goodPhone = phones[0]?.replace(/\s/g, '') || null

            if (goodEmail || goodPhone) {
              // Check if we already have an entry for this source
              const existing = people.find(p => !p.email && !p.phone)
              if (existing) {
                existing.email = goodEmail
                existing.phone = goodPhone
                existing.website = r.url
              } else {
                const companyName = page$('meta[property="og:site_name"]').attr('content') ||
                  page$('title').text().split('|')[0].split('-')[0].trim().slice(0, 80)
                people.push({
                  name: null,
                  title: null,
                  company: companyName || r.title.slice(0, 80),
                  email: goodEmail,
                  phone: goodPhone,
                  linkedin: null,
                  location: location || null,
                  website: r.url,
                  source: 'scraping',
                })
              }
            }
          } catch {}
          await sleep(1500)
        }
      } catch (err) {
        console.error(`[Apollo Scrape] Search error: ${err.message}`)
      }
      await sleep(2000)
    }

    return { people: people.slice(0, limit), total: people.length }
  }

  async _scrapeCompanies({ name, industry, location, size, limit = 10 }) {
    const companies = []

    const query = `${name || ''} ${industry || 'tecnologia'} empresa ${location || 'Mexico'} sitio web`.trim()

    try {
      const resp = await axios.get(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
        headers: { 'User-Agent': randomUA(), 'Accept-Language': 'es-MX,es;q=0.9' },
        timeout: 12000,
      })

      const $ = cheerio.load(resp.data)
      const results = []
      $('.result').each((i, el) => {
        const titleEl = $(el).find('.result__title a')
        const t = titleEl.text().trim()
        let link = titleEl.attr('href') || ''
        const snippet = $(el).find('.result__snippet').text().trim()
        if (link.includes('uddg=')) {
          try { link = new URL(link, 'https://duckduckgo.com').searchParams.get('uddg') || link } catch {}
        }
        if (t && link?.startsWith('http')) results.push({ title: t, url: link, snippet })
      })

      const context = results.slice(0, 8).map(r => `${r.title} — ${r.snippet} (${r.url})`).join('\n')

      const aiResp = await analyzeWithDeepSeek(
        `De estos resultados, extrae empresas reales con su informacion.
Responde SOLO JSON array:
[{"name":"nombre empresa","website":"url","industry":"sector","location":"ubicacion","description":"descripcion corta"}]

Resultados:
${context.slice(0, 2000)}`
      )

      const parsed = JSON.parse(aiResp.match(/\[[\s\S]*\]/)?.[0] || '[]')
      for (const c of parsed.slice(0, limit)) {
        if (c.name && c.name !== 'null') {
          companies.push({
            ...c,
            source: 'scraping',
          })
        }
      }
    } catch (err) {
      console.error(`[Apollo Companies Scrape] Error: ${err.message}`)
    }

    return { companies, total: companies.length }
  }

  async _scrapeEnrichPerson(name, company, domain) {
    if (!name && !company) return null

    try {
      const query = `"${name || ''}" "${company || ''}" ${domain || ''} email contacto linkedin`.trim()

      const resp = await axios.get(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
        headers: { 'User-Agent': randomUA() },
        timeout: 10000,
      })

      const $ = cheerio.load(resp.data)
      const allText = $('body').text()

      const emails = allText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []
      const linkedin = allText.match(/linkedin\.com\/in\/[a-zA-Z0-9-]+/)?.[0] || null

      const goodEmail = emails.filter(e =>
        !e.includes('example') && !e.includes('sentry') && !e.includes('.png')
      )[0] || null

      return {
        name,
        company,
        email: goodEmail,
        linkedin: linkedin ? `https://${linkedin}` : null,
        source: 'scraping',
      }
    } catch {
      return null
    }
  }
}

export const apolloService = new ApolloService()
export default apolloService
