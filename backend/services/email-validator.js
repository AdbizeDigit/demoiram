import axios from 'axios'
import dns from 'dns'
import { promisify } from 'util'

const resolveMx = promisify(dns.resolveMx)

/**
 * 📧 EMAIL VALIDATOR & VERIFIER
 * Sistema completo de validación y verificación de emails
 */

class EmailValidator {
  constructor() {
    this.disposableEmailDomains = new Set([
      'tempmail.com', 'guerrillamail.com', '10minutemail.com', 'throwaway.email',
      'mailinator.com', 'maildrop.cc', 'temp-mail.org', 'yopmail.com',
      'trashmail.com', 'getnada.com', 'fakeinbox.com', 'sharklasers.com'
    ])

    this.freeEmailProviders = new Set([
      'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
      'icloud.com', 'mail.com', 'protonmail.com', 'zoho.com', 'gmx.com'
    ])

    this.validationCache = new Map()
    this.cacheExpiry = 24 * 60 * 60 * 1000 // 24 horas
  }

  /**
   * 1. VALIDACIÓN DE SINTAXIS
   */
  validateSyntax(email) {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

    if (!emailRegex.test(email)) {
      return {
        valid: false,
        reason: 'Invalid syntax',
        score: 0
      }
    }

    const [localPart, domain] = email.split('@')

    // Validaciones adicionales
    if (localPart.length > 64) {
      return { valid: false, reason: 'Local part too long', score: 0 }
    }

    if (domain.length > 255) {
      return { valid: false, reason: 'Domain too long', score: 0 }
    }

    if (localPart.startsWith('.') || localPart.endsWith('.')) {
      return { valid: false, reason: 'Local part cannot start/end with dot', score: 0 }
    }

    if (localPart.includes('..')) {
      return { valid: false, reason: 'Consecutive dots not allowed', score: 0 }
    }

    return { valid: true, score: 25 }
  }

  /**
   * 2. VALIDACIÓN DE DOMINIO
   */
  async validateDomain(email) {
    const domain = email.split('@')[1]

    try {
      const mxRecords = await resolveMx(domain)

      if (!mxRecords || mxRecords.length === 0) {
        return {
          valid: false,
          reason: 'No MX records found',
          score: 0,
          mxRecords: []
        }
      }

      // Ordenar por prioridad
      mxRecords.sort((a, b) => a.priority - b.priority)

      return {
        valid: true,
        score: 25,
        mxRecords: mxRecords.map(r => r.exchange),
        primaryMx: mxRecords[0].exchange
      }
    } catch (error) {
      return {
        valid: false,
        reason: 'Domain does not exist or has no MX records',
        score: 0,
        error: error.message
      }
    }
  }

  /**
   * 3. DETECCIÓN DE EMAILS DESECHABLES
   */
  checkDisposable(email) {
    const domain = email.split('@')[1].toLowerCase()

    if (this.disposableEmailDomains.has(domain)) {
      return {
        isDisposable: true,
        score: -50,
        reason: 'Disposable email domain'
      }
    }

    return {
      isDisposable: false,
      score: 15
    }
  }

  /**
   * 4. DETECCIÓN DE EMAILS GRATUITOS vs CORPORATIVOS
   */
  checkEmailType(email) {
    const domain = email.split('@')[1].toLowerCase()

    if (this.freeEmailProviders.has(domain)) {
      return {
        type: 'free',
        isCorporate: false,
        score: 5,
        reason: 'Free email provider (personal use likely)'
      }
    }

    return {
      type: 'corporate',
      isCorporate: true,
      score: 25,
      reason: 'Corporate domain (business use likely)'
    }
  }

  /**
   * 5. DETECCIÓN DE PATRONES SOSPECHOSOS
   */
  checkSuspiciousPatterns(email) {
    const suspicious = []
    let score = 10

    const localPart = email.split('@')[0].toLowerCase()

    // Patrones sospechosos
    const suspiciousPatterns = [
      { pattern: /^(noreply|no-reply|donotreply)/i, reason: 'No-reply address', penalty: 30 },
      { pattern: /^(test|testing|demo)/i, reason: 'Test address', penalty: 20 },
      { pattern: /^(admin|administrator|webmaster|postmaster)/i, reason: 'Generic admin address', penalty: 15 },
      { pattern: /^(info|contact|support|sales|hello)/i, reason: 'Generic contact address', penalty: 10 },
      { pattern: /\d{5,}/i, reason: 'Too many consecutive numbers', penalty: 10 },
      { pattern: /^[a-z]{1,2}$/i, reason: 'Too short', penalty: 15 }
    ]

    suspiciousPatterns.forEach(({ pattern, reason, penalty }) => {
      if (pattern.test(localPart)) {
        suspicious.push(reason)
        score -= penalty
      }
    })

    return {
      suspicious: suspicious.length > 0,
      reasons: suspicious,
      score: Math.max(score, -30)
    }
  }

  /**
   * 6. VERIFICACIÓN CON API EXTERNA (Hunter.io, ZeroBounce, etc.)
   */
  async verifyWithExternalAPI(email) {
    // Placeholder para integración con APIs externas
    // En producción, usar Hunter.io, ZeroBounce, NeverBounce, etc.

    const hunterApiKey = process.env.HUNTER_API_KEY

    if (!hunterApiKey) {
      return {
        verified: false,
        reason: 'External API not configured',
        score: 0,
        source: 'none'
      }
    }

    try {
      const response = await axios.get(`https://api.hunter.io/v2/email-verifier`, {
        params: {
          email,
          api_key: hunterApiKey
        },
        timeout: 10000
      })

      const data = response.data.data

      let score = 0
      if (data.status === 'valid') score = 30
      else if (data.status === 'accept_all') score = 15
      else if (data.status === 'webmail') score = 10
      else if (data.status === 'disposable') score = -40
      else if (data.status === 'invalid') score = -50

      return {
        verified: true,
        status: data.status,
        score,
        confidence: data.score,
        source: 'hunter.io',
        details: {
          smtp_check: data.smtp_check,
          smtp_server: data.smtp_server,
          accept_all: data.accept_all,
          block: data.block,
          disposable: data.disposable,
          webmail: data.webmail
        }
      }
    } catch (error) {
      console.error('Error verifying with Hunter.io:', error.message)
      return {
        verified: false,
        reason: 'API error',
        score: 0,
        error: error.message
      }
    }
  }

  /**
   * 7. VALIDACIÓN COMPLETA CON SCORE
   */
  async validateComplete(email) {
    // Check cache
    const cached = this.validationCache.get(email)
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.result
    }

    email = email.trim().toLowerCase()

    // Ejecutar todas las validaciones en paralelo
    const [
      syntaxResult,
      domainResult,
      disposableResult,
      typeResult,
      patternsResult,
      externalResult
    ] = await Promise.all([
      Promise.resolve(this.validateSyntax(email)),
      this.validateDomain(email),
      Promise.resolve(this.checkDisposable(email)),
      Promise.resolve(this.checkEmailType(email)),
      Promise.resolve(this.checkSuspiciousPatterns(email)),
      this.verifyWithExternalAPI(email)
    ])

    // Calcular score total
    let totalScore = 0
    totalScore += syntaxResult.score || 0
    totalScore += domainResult.score || 0
    totalScore += disposableResult.score || 0
    totalScore += typeResult.score || 0
    totalScore += patternsResult.score || 0
    totalScore += externalResult.score || 0

    // Normalizar score a 0-100
    totalScore = Math.max(0, Math.min(100, totalScore))

    // Determinar calidad
    let quality = 'unknown'
    if (totalScore >= 80) quality = 'excellent'
    else if (totalScore >= 60) quality = 'good'
    else if (totalScore >= 40) quality = 'fair'
    else if (totalScore >= 20) quality = 'poor'
    else quality = 'invalid'

    // Determinar si es deliverable
    const isDeliverable = syntaxResult.valid &&
      domainResult.valid &&
      !disposableResult.isDisposable &&
      totalScore >= 40

    const result = {
      email,
      isValid: syntaxResult.valid && domainResult.valid,
      isDeliverable,
      isCorporate: typeResult.isCorporate,
      isDisposable: disposableResult.isDisposable,
      quality,
      score: totalScore,
      checks: {
        syntax: syntaxResult,
        domain: domainResult,
        disposable: disposableResult,
        type: typeResult,
        patterns: patternsResult,
        external: externalResult
      },
      recommendation: this.getRecommendation(totalScore, typeResult.isCorporate, disposableResult.isDisposable),
      timestamp: Date.now()
    }

    // Cache result
    this.validationCache.set(email, {
      result,
      timestamp: Date.now()
    })

    return result
  }

  /**
   * 8. VALIDACIÓN EN BATCH
   */
  async validateBatch(emails) {
    const results = await Promise.all(
      emails.map(email => this.validateComplete(email))
    )

    const summary = {
      total: results.length,
      valid: results.filter(r => r.isValid).length,
      deliverable: results.filter(r => r.isDeliverable).length,
      corporate: results.filter(r => r.isCorporate).length,
      disposable: results.filter(r => r.isDisposable).length,
      excellent: results.filter(r => r.quality === 'excellent').length,
      good: results.filter(r => r.quality === 'good').length,
      fair: results.filter(r => r.quality === 'fair').length,
      poor: results.filter(r => r.quality === 'poor').length,
      invalid: results.filter(r => r.quality === 'invalid').length
    }

    return {
      results,
      summary
    }
  }

  /**
   * Genera recomendación basada en validación
   */
  getRecommendation(score, isCorporate, isDisposable) {
    if (isDisposable) {
      return {
        action: 'reject',
        priority: 'do_not_contact',
        reason: 'Disposable email - likely not a real prospect'
      }
    }

    if (score >= 80 && isCorporate) {
      return {
        action: 'accept',
        priority: 'high',
        reason: 'Excellent quality corporate email - high-value prospect'
      }
    }

    if (score >= 60 && isCorporate) {
      return {
        action: 'accept',
        priority: 'medium',
        reason: 'Good quality corporate email - valid prospect'
      }
    }

    if (score >= 40) {
      return {
        action: 'review',
        priority: 'low',
        reason: 'Acceptable quality but may need verification'
      }
    }

    return {
      action: 'reject',
      priority: 'very_low',
      reason: 'Poor quality email - likely invalid or risky'
    }
  }

  /**
   * Limpiar cache
   */
  clearCache() {
    this.validationCache.clear()
  }

  /**
   * Obtener estadísticas de cache
   */
  getCacheStats() {
    return {
      size: this.validationCache.size,
      entries: Array.from(this.validationCache.keys())
    }
  }
}

/**
 * 📊 EMAIL LIST CLEANER
 * Limpia y enriquece listas de emails
 */
class EmailListCleaner {
  constructor() {
    this.validator = new EmailValidator()
  }

  /**
   * Limpia una lista de emails
   */
  async cleanList(emails, options = {}) {
    const {
      removeInvalid = true,
      removeDisposable = true,
      removeFreeEmails = false,
      minScore = 40
    } = options

    const validationResults = await this.validator.validateBatch(emails)

    let cleanedEmails = validationResults.results

    if (removeInvalid) {
      cleanedEmails = cleanedEmails.filter(r => r.isValid)
    }

    if (removeDisposable) {
      cleanedEmails = cleanedEmails.filter(r => !r.isDisposable)
    }

    if (removeFreeEmails) {
      cleanedEmails = cleanedEmails.filter(r => r.isCorporate)
    }

    if (minScore) {
      cleanedEmails = cleanedEmails.filter(r => r.score >= minScore)
    }

    return {
      original: validationResults.results,
      cleaned: cleanedEmails,
      removed: validationResults.results.filter(r => !cleanedEmails.includes(r)),
      stats: {
        originalCount: emails.length,
        cleanedCount: cleanedEmails.length,
        removedCount: emails.length - cleanedEmails.length,
        removalRate: ((emails.length - cleanedEmails.length) / emails.length * 100).toFixed(2) + '%'
      }
    }
  }

  /**
   * Deduplica emails
   */
  deduplicateEmails(emails) {
    const uniqueEmails = [...new Set(emails.map(e => e.toLowerCase().trim()))]

    return {
      original: emails,
      deduplicated: uniqueEmails,
      duplicatesRemoved: emails.length - uniqueEmails.length
    }
  }

  /**
   * Normaliza emails
   */
  normalizeEmails(emails) {
    return emails.map(email => {
      email = email.trim().toLowerCase()

      // Remove Gmail dots (john.doe@gmail.com = johndoe@gmail.com)
      const [localPart, domain] = email.split('@')
      if (domain === 'gmail.com') {
        const normalizedLocal = localPart.replace(/\./g, '').split('+')[0]
        return `${normalizedLocal}@${domain}`
      }

      // Remove plus addressing
      const cleanLocal = localPart.split('+')[0]
      return `${cleanLocal}@${domain}`
    })
  }
}

// Singleton instances
const emailValidator = new EmailValidator()
const emailListCleaner = new EmailListCleaner()

export {
  emailValidator,
  emailListCleaner,
  EmailValidator,
  EmailListCleaner
}
