import axios from 'axios'

/**
 * 🔒 PROXY ROTATION MANAGER
 * Sistema inteligente de rotación de proxies para evitar rate limits y blocks
 */

class ProxyManager {
  constructor() {
    this.proxies = []
    this.currentIndex = 0
    this.proxyStats = new Map()
    this.blacklist = new Set()
    this.requestCount = new Map()
    this.lastRequestTime = new Map()
  }

  /**
   * Agrega un proxy a la lista
   */
  addProxy(proxy) {
    if (!this.blacklist.has(proxy)) {
      this.proxies.push(proxy)
      this.proxyStats.set(proxy, {
        successCount: 0,
        failureCount: 0,
        avgResponseTime: 0,
        lastUsed: null,
        blocked: false
      })
    }
  }

  /**
   * Agrega múltiples proxies
   */
  addProxies(proxies) {
    proxies.forEach(proxy => this.addProxy(proxy))
  }

  /**
   * Obtiene el mejor proxy disponible basado en estadísticas
   */
  getBestProxy() {
    if (this.proxies.length === 0) {
      return null
    }

    // Filtrar proxies no bloqueados
    const availableProxies = this.proxies.filter(proxy => {
      const stats = this.proxyStats.get(proxy)
      return !stats.blocked && !this.blacklist.has(proxy)
    })

    if (availableProxies.length === 0) {
      // Reset blocks si todos están bloqueados
      this.proxies.forEach(proxy => {
        const stats = this.proxyStats.get(proxy)
        stats.blocked = false
      })
      return this.proxies[0]
    }

    // Seleccionar proxy con mejor success rate y menos uso reciente
    const bestProxy = availableProxies.sort((a, b) => {
      const statsA = this.proxyStats.get(a)
      const statsB = this.proxyStats.get(b)

      const successRateA = statsA.successCount / (statsA.successCount + statsA.failureCount + 1)
      const successRateB = statsB.successCount / (statsB.successCount + statsB.failureCount + 1)

      // Penalizar proxies usados recientemente
      const timePenaltyA = statsA.lastUsed ? (Date.now() - statsA.lastUsed) / 1000 : 10000
      const timePenaltyB = statsB.lastUsed ? (Date.now() - statsB.lastUsed) / 1000 : 10000

      const scoreA = successRateA * (timePenaltyA / 60)
      const scoreB = successRateB * (timePenaltyB / 60)

      return scoreB - scoreA
    })[0]

    return bestProxy
  }

  /**
   * Registra una solicitud exitosa
   */
  recordSuccess(proxy, responseTime) {
    const stats = this.proxyStats.get(proxy)
    if (stats) {
      stats.successCount++
      stats.avgResponseTime = (stats.avgResponseTime * (stats.successCount - 1) + responseTime) / stats.successCount
      stats.lastUsed = Date.now()
    }
  }

  /**
   * Registra una solicitud fallida
   */
  recordFailure(proxy, errorCode) {
    const stats = this.proxyStats.get(proxy)
    if (stats) {
      stats.failureCount++
      stats.lastUsed = Date.now()

      // Si es 429 (rate limit) o 403 (blocked), marcar como bloqueado temporalmente
      if (errorCode === 429 || errorCode === 403) {
        stats.blocked = true
        // Desbloquear después de 5 minutos
        setTimeout(() => {
          stats.blocked = false
        }, 5 * 60 * 1000)
      }

      // Si falla mucho, agregar a blacklist
      const failureRate = stats.failureCount / (stats.successCount + stats.failureCount)
      if (failureRate > 0.7 && stats.successCount + stats.failureCount > 10) {
        this.blacklist.add(proxy)
      }
    }
  }

  /**
   * Obtiene estadísticas de todos los proxies
   */
  getStats() {
    return Array.from(this.proxyStats.entries()).map(([proxy, stats]) => ({
      proxy,
      ...stats,
      successRate: stats.successCount / (stats.successCount + stats.failureCount + 1),
      isBlacklisted: this.blacklist.has(proxy)
    }))
  }

  /**
   * Reset de estadísticas
   */
  resetStats() {
    this.proxyStats.clear()
    this.blacklist.clear()
    this.proxies.forEach(proxy => {
      this.proxyStats.set(proxy, {
        successCount: 0,
        failureCount: 0,
        avgResponseTime: 0,
        lastUsed: null,
        blocked: false
      })
    })
  }
}

// Singleton instance
const proxyManager = new ProxyManager()

// Configurar proxies por defecto (en producción, cargar desde config)
const defaultProxies = [
  // Agregar proxies reales aquí
  // 'http://proxy1.example.com:8080',
  // 'http://proxy2.example.com:8080',
]

if (defaultProxies.length > 0) {
  proxyManager.addProxies(defaultProxies)
}

/**
 * 🔄 RATE LIMITER
 * Controla la velocidad de requests para evitar rate limits
 */
class RateLimiter {
  constructor() {
    this.requestQueues = new Map()
    this.domainLimits = new Map()
  }

  /**
   * Configura límite para un dominio
   */
  setLimit(domain, requestsPerMinute) {
    this.domainLimits.set(domain, {
      limit: requestsPerMinute,
      interval: 60000 / requestsPerMinute,
      queue: [],
      processing: false
    })
  }

  /**
   * Ejecuta una solicitud con rate limiting
   */
  async executeRequest(domain, requestFn) {
    if (!this.domainLimits.has(domain)) {
      // Sin límite configurado, ejecutar inmediatamente
      return await requestFn()
    }

    const limitConfig = this.domainLimits.get(domain)

    return new Promise((resolve, reject) => {
      limitConfig.queue.push({ requestFn, resolve, reject })
      this.processQueue(domain)
    })
  }

  /**
   * Procesa la cola de solicitudes
   */
  async processQueue(domain) {
    const limitConfig = this.domainLimits.get(domain)

    if (limitConfig.processing || limitConfig.queue.length === 0) {
      return
    }

    limitConfig.processing = true

    while (limitConfig.queue.length > 0) {
      const { requestFn, resolve, reject } = limitConfig.queue.shift()

      try {
        const result = await requestFn()
        resolve(result)
      } catch (error) {
        reject(error)
      }

      // Esperar antes del siguiente request
      if (limitConfig.queue.length > 0) {
        await new Promise(r => setTimeout(r, limitConfig.interval))
      }
    }

    limitConfig.processing = false
  }

  /**
   * Obtiene estadísticas de rate limiting
   */
  getStats() {
    return Array.from(this.domainLimits.entries()).map(([domain, config]) => ({
      domain,
      requestsPerMinute: config.limit,
      queueLength: config.queue.length,
      processing: config.processing
    }))
  }
}

const rateLimiter = new RateLimiter()

// Configurar límites por defecto
rateLimiter.setLimit('linkedin.com', 10) // 10 requests/min
rateLimiter.setLimit('g2.com', 20)
rateLimiter.setLimit('twitter.com', 15)
rateLimiter.setLimit('default', 30)

/**
 * 🌐 SMART FETCH
 * Wrapper inteligente para axios que usa proxy rotation y rate limiting
 */
async function smartFetch(url, options = {}) {
  const urlObj = new URL(url)
  const domain = urlObj.hostname

  const requestFn = async () => {
    const proxy = proxyManager.getBestProxy()
    const startTime = Date.now()

    const axiosConfig = {
      ...options,
      url,
      timeout: options.timeout || 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ...options.headers
      }
    }

    // Agregar proxy si está disponible
    if (proxy) {
      const proxyUrl = new URL(proxy)
      axiosConfig.proxy = {
        host: proxyUrl.hostname,
        port: parseInt(proxyUrl.port),
        protocol: proxyUrl.protocol.replace(':', '')
      }
    }

    try {
      const response = await axios(axiosConfig)
      const responseTime = Date.now() - startTime

      if (proxy) {
        proxyManager.recordSuccess(proxy, responseTime)
      }

      return response
    } catch (error) {
      if (proxy && error.response) {
        proxyManager.recordFailure(proxy, error.response.status)
      }

      // Retry con otro proxy si es un error de red o rate limit
      if (error.code === 'ECONNREFUSED' || error.response?.status === 429) {
        const newProxy = proxyManager.getBestProxy()
        if (newProxy && newProxy !== proxy) {
          // Retry una vez con nuevo proxy
          const retryConfig = { ...axiosConfig }
          const retryProxyUrl = new URL(newProxy)
          retryConfig.proxy = {
            host: retryProxyUrl.hostname,
            port: parseInt(retryProxyUrl.port),
            protocol: retryProxyUrl.protocol.replace(':', '')
          }

          try {
            const retryResponse = await axios(retryConfig)
            proxyManager.recordSuccess(newProxy, Date.now() - startTime)
            return retryResponse
          } catch (retryError) {
            proxyManager.recordFailure(newProxy, retryError.response?.status)
            throw retryError
          }
        }
      }

      throw error
    }
  }

  // Ejecutar con rate limiting
  return await rateLimiter.executeRequest(domain, requestFn)
}

/**
 * 📊 REQUEST ANALYTICS
 * Tracking de requests para análisis y optimización
 */
class RequestAnalytics {
  constructor() {
    this.requests = []
    this.maxHistory = 1000
  }

  recordRequest(url, duration, success, statusCode, proxy) {
    this.requests.push({
      url,
      duration,
      success,
      statusCode,
      proxy,
      timestamp: Date.now()
    })

    // Mantener solo últimos 1000 requests
    if (this.requests.length > this.maxHistory) {
      this.requests.shift()
    }
  }

  getStats() {
    const total = this.requests.length
    const successful = this.requests.filter(r => r.success).length
    const failed = total - successful

    const avgDuration = this.requests.reduce((sum, r) => sum + r.duration, 0) / total

    const domainStats = {}
    this.requests.forEach(r => {
      const domain = new URL(r.url).hostname
      if (!domainStats[domain]) {
        domainStats[domain] = { total: 0, success: 0, avgDuration: 0 }
      }
      domainStats[domain].total++
      if (r.success) domainStats[domain].success++
      domainStats[domain].avgDuration += r.duration
    })

    Object.keys(domainStats).forEach(domain => {
      domainStats[domain].avgDuration /= domainStats[domain].total
      domainStats[domain].successRate = domainStats[domain].success / domainStats[domain].total
    })

    return {
      total,
      successful,
      failed,
      successRate: successful / total,
      avgDuration,
      domainStats,
      lastHour: this.requests.filter(r => Date.now() - r.timestamp < 3600000).length
    }
  }
}

const requestAnalytics = new RequestAnalytics()

// Wrapper final que incluye analytics
async function trackedSmartFetch(url, options = {}) {
  const startTime = Date.now()
  let success = false
  let statusCode = null
  let proxy = null

  try {
    const response = await smartFetch(url, options)
    success = true
    statusCode = response.status
    proxy = proxyManager.getBestProxy()
    requestAnalytics.recordRequest(url, Date.now() - startTime, success, statusCode, proxy)
    return response
  } catch (error) {
    statusCode = error.response?.status || 0
    requestAnalytics.recordRequest(url, Date.now() - startTime, success, statusCode, proxy)
    throw error
  }
}

export {
  proxyManager,
  rateLimiter,
  smartFetch,
  trackedSmartFetch,
  requestAnalytics
}
