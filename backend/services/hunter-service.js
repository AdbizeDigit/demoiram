/**
 * Hunter-style Email Finder
 *
 * Finds emails associated with a domain/company.
 * - With HUNTER_API_KEY: uses Hunter.io API (25 free searches/month)
 * - Without key: scrapes website + common patterns + MX validation
 */

import axios from 'axios'
import * as cheerio from 'cheerio'
import dns from 'dns'
import { promisify } from 'util'

const resolveMx = promisify(dns.resolveMx)

const COMMON_PREFIXES = [
  'info', 'contact', 'contacto', 'hello', 'hola', 'ventas', 'sales',
  'admin', 'soporte', 'support', 'rh', 'hr', 'marketing', 'prensa',
  'press', 'media', 'director', 'gerencia', 'ceo', 'cto',
]

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
]

function randomUA() { return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)] }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

class HunterService {
  constructor() {
    this.apiKey = process.env.HUNTER_API_KEY || null
    this.cache = new Map() // domain -> results (in-memory cache)
  }

  /**
   * Find emails for a domain
   * @param {string} domain - e.g. "company.com"
   * @param {string} [fullName] - e.g. "Juan Perez" (optional, for specific person)
   * @returns {{ emails: Array<{email, type, confidence, source}>, domain, mx_valid }}
   */
  async findByDomain(domain, fullName = null) {
    if (!domain) return { emails: [], domain, mx_valid: false }

    // Clean domain
    domain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase()

    // Check cache
    const cacheKey = `${domain}:${fullName || ''}`
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey)

    let result

    if (this.apiKey) {
      result = await this._hunterApi(domain, fullName)
    } else {
      result = await this._scrapeEmails(domain, fullName)
    }

    this.cache.set(cacheKey, result)
    return result
  }

  /**
   * Verify if an email is deliverable
   */
  async verifyEmail(email) {
    if (!email) return { valid: false, reason: 'empty' }

    if (this.apiKey) {
      return this._hunterVerify(email)
    }
    return this._basicVerify(email)
  }

  // ── Hunter.io API (free tier: 25 searches/month) ─────────────────────────
  async _hunterApi(domain, fullName) {
    try {
      if (fullName) {
        // Email finder - find specific person's email
        const [firstName, ...lastParts] = fullName.split(' ')
        const lastName = lastParts.join(' ')
        const resp = await axios.get('https://api.hunter.io/v2/email-finder', {
          params: {
            domain,
            first_name: firstName,
            last_name: lastName,
            api_key: this.apiKey,
          },
          timeout: 10000,
        })

        const d = resp.data?.data
        if (d?.email) {
          return {
            emails: [{ email: d.email, type: 'personal', confidence: d.score || 80, source: 'hunter.io' }],
            domain,
            mx_valid: true,
            person: { firstName: d.first_name, lastName: d.last_name, position: d.position },
          }
        }
      }

      // Domain search - find all emails on domain
      const resp = await axios.get('https://api.hunter.io/v2/domain-search', {
        params: { domain, api_key: this.apiKey, limit: 10 },
        timeout: 10000,
      })

      const data = resp.data?.data
      const emails = (data?.emails || []).map(e => ({
        email: e.value,
        type: e.type || 'generic',
        confidence: e.confidence || 50,
        source: 'hunter.io',
        firstName: e.first_name,
        lastName: e.last_name,
        position: e.position,
      }))

      return {
        emails,
        domain,
        mx_valid: true,
        pattern: data?.pattern || null,
        organization: data?.organization || null,
      }
    } catch (err) {
      console.error(`[Hunter API] Error: ${err.message}`)
      // Fallback to scraping
      return this._scrapeEmails(domain, fullName)
    }
  }

  async _hunterVerify(email) {
    try {
      const resp = await axios.get('https://api.hunter.io/v2/email-verifier', {
        params: { email, api_key: this.apiKey },
        timeout: 10000,
      })
      const d = resp.data?.data
      return {
        valid: d?.result === 'deliverable',
        status: d?.result,
        score: d?.score,
        source: 'hunter.io',
      }
    } catch {
      return this._basicVerify(email)
    }
  }

  // ── Free scraping fallback ────────────────────────────────────────────────
  async _scrapeEmails(domain, fullName) {
    const emails = []
    let mxValid = false

    // 1. Check MX records
    try {
      const mx = await resolveMx(domain)
      mxValid = mx && mx.length > 0
    } catch {
      // Domain might not have MX records
    }

    // 2. Scrape the website for emails
    const urlsToCheck = [
      `https://${domain}`,
      `https://${domain}/contacto`,
      `https://${domain}/contact`,
      `https://${domain}/about`,
      `https://${domain}/nosotros`,
      `https://www.${domain}`,
    ]

    const foundEmails = new Set()

    for (const url of urlsToCheck) {
      try {
        const resp = await axios.get(url, {
          headers: { 'User-Agent': randomUA() },
          timeout: 8000,
          maxContentLength: 500000,
          maxRedirects: 3,
          validateStatus: s => s < 400,
        })

        const $ = cheerio.load(resp.data)
        const pageText = $('body').text() + ' ' + $('a[href^="mailto:"]').map((_, el) => $(el).attr('href')).get().join(' ')

        // Extract emails from page
        const matches = pageText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []
        for (const email of matches) {
          const clean = email.toLowerCase()
          if (
            clean.endsWith(`@${domain}`) || clean.endsWith(`@www.${domain}`) ||
            // Accept any email found on the domain's website
            (!clean.includes('example.com') && !clean.includes('sentry') &&
             !clean.includes('.png') && !clean.includes('.jpg') &&
             !clean.includes('wixpress') && !clean.includes('wordpress'))
          ) {
            foundEmails.add(clean)
          }
        }

        // Also extract from mailto: links
        $('a[href^="mailto:"]').each((_, el) => {
          const href = $(el).attr('href')?.replace('mailto:', '').split('?')[0]?.trim().toLowerCase()
          if (href && href.includes('@')) foundEmails.add(href)
        })
      } catch {}
      await sleep(1000)
    }

    // 3. Search DuckDuckGo for emails
    try {
      const searchUrl = `https://html.duckduckgo.com/html/?q="${domain}" email contacto`
      const resp = await axios.get(searchUrl, {
        headers: { 'User-Agent': randomUA(), 'Accept-Language': 'es-MX,es;q=0.9' },
        timeout: 10000,
      })
      const $ = cheerio.load(resp.data)
      const searchText = $('body').text()
      const searchEmails = searchText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []
      for (const e of searchEmails) {
        if (e.toLowerCase().includes(domain.split('.')[0])) foundEmails.add(e.toLowerCase())
      }
    } catch {}

    // 4. Generate pattern-based guesses if we have a name
    if (fullName && mxValid) {
      const parts = fullName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\s+/)
      const first = parts[0]
      const last = parts[parts.length - 1]

      if (first && last) {
        const patterns = [
          `${first}@${domain}`,
          `${first}.${last}@${domain}`,
          `${first}${last}@${domain}`,
          `${first[0]}${last}@${domain}`,
          `${first}_${last}@${domain}`,
          `${last}@${domain}`,
        ]
        for (const p of patterns) {
          foundEmails.add(p)
        }
      }
    }

    // 5. Try common prefixes
    if (mxValid && foundEmails.size < 3) {
      for (const prefix of COMMON_PREFIXES.slice(0, 5)) {
        foundEmails.add(`${prefix}@${domain}`)
      }
    }

    // Convert to result format
    for (const email of foundEmails) {
      const isOnDomain = email.endsWith(`@${domain}`)
      emails.push({
        email,
        type: COMMON_PREFIXES.some(p => email.startsWith(p + '@')) ? 'generic' : 'personal',
        confidence: isOnDomain ? 70 : 40,
        source: 'scraping',
      })
    }

    // Sort by confidence
    emails.sort((a, b) => b.confidence - a.confidence)

    return {
      emails: emails.slice(0, 10),
      domain,
      mx_valid: mxValid,
    }
  }

  // ── Basic email verification (no API needed) ─────────────────────────────
  async _basicVerify(email) {
    if (!email || !email.includes('@')) return { valid: false, reason: 'invalid_format' }

    const domain = email.split('@')[1]

    // Check syntax
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!emailRegex.test(email)) return { valid: false, reason: 'invalid_syntax' }

    // Check MX records
    try {
      const mx = await resolveMx(domain)
      if (!mx || mx.length === 0) return { valid: false, reason: 'no_mx_records' }
    } catch {
      return { valid: false, reason: 'domain_not_found' }
    }

    // Check disposable email providers
    const disposable = ['mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwaway.email', 'yopmail.com']
    if (disposable.includes(domain)) return { valid: false, reason: 'disposable' }

    return { valid: true, reason: 'mx_valid', source: 'basic_check' }
  }
}

export const hunterService = new HunterService()
export default hunterService
