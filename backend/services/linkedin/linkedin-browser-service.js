import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker'
import { EventEmitter } from 'events'
import crypto from 'crypto'
import { execSync } from 'child_process'
import fs from 'fs'

// Anti-detection plugins
puppeteer.use(StealthPlugin())
puppeteer.use(AdblockerPlugin({ blockTrackers: true }))

// Ensure Chrome is downloaded (persistent across deploys)
let chromePath = null
const CHROME_DIR = '/app/chrome-data'

async function ensureChrome() {
  if (chromePath && fs.existsSync(chromePath)) return chromePath

  // Check persistent storage first
  try {
    const result = execSync(`find ${CHROME_DIR} -name "chrome" -type f 2>/dev/null | head -1`, { encoding: 'utf8', timeout: 5000 }).trim()
    if (result && fs.existsSync(result)) {
      chromePath = result
      console.log('[LinkedIn] Chrome found in persistent storage:', result)
      return result
    }
  } catch {}

  // Check other locations
  const searchDirs = ['/app/.cache/puppeteer', '/tmp/puppeteer']
  for (const dir of searchDirs) {
    try {
      const result = execSync(`find ${dir} -name "chrome" -type f 2>/dev/null | head -1`, { encoding: 'utf8', timeout: 5000 }).trim()
      if (result && fs.existsSync(result)) { chromePath = result; return result }
    } catch {}
  }

  // Download to persistent storage
  console.log('[LinkedIn] Downloading Chrome to persistent storage...')
  try {
    fs.mkdirSync(CHROME_DIR, { recursive: true })
    execSync('npx puppeteer browsers install chrome', {
      cwd: '/app/backend',
      env: { ...process.env, PUPPETEER_CACHE_DIR: CHROME_DIR, PATH: process.env.PATH },
      timeout: 180000,
      stdio: 'pipe'
    })
    const result = execSync(`find ${CHROME_DIR} -name "chrome" -type f 2>/dev/null | head -1`, { encoding: 'utf8' }).trim()
    if (result) {
      chromePath = result
      console.log('[LinkedIn] Chrome downloaded to:', result)
      return result
    }
  } catch (e) {
    console.error('[LinkedIn] Chrome download error:', e.message)
  }

  return null
}

const ENCRYPT_KEY = process.env.ENCRYPT_KEY || 'adbize-linkedin-key-2026-secure'

function encrypt(text) {
  const key = crypto.scryptSync(ENCRYPT_KEY, 'salt', 32)
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

function decrypt(text) {
  const key = crypto.scryptSync(ENCRYPT_KEY, 'salt', 32)
  const [ivHex, encrypted] = text.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

// Human-like delays
function sleep(min, max) {
  const ms = min + Math.random() * ((max || min * 2) - min)
  return new Promise(r => setTimeout(r, ms))
}

async function humanType(page, selector, text) {
  await page.click(selector)
  await sleep(300, 800)
  for (const char of text) {
    await page.keyboard.type(char, { delay: 50 + Math.random() * 150 })
    if (Math.random() < 0.05) await sleep(500, 1500) // occasional pause
  }
}

async function humanScroll(page) {
  const scrolls = 2 + Math.floor(Math.random() * 4)
  for (let i = 0; i < scrolls; i++) {
    await page.evaluate(() => window.scrollBy(0, 200 + Math.random() * 400))
    await sleep(800, 2000)
  }
}

async function randomMouseMove(page) {
  const x = 100 + Math.floor(Math.random() * 800)
  const y = 100 + Math.floor(Math.random() * 500)
  await page.mouse.move(x, y, { steps: 10 + Math.floor(Math.random() * 20) })
}

class LinkedInBrowserService extends EventEmitter {
  constructor() {
    super()
    this.sessions = new Map() // profileId -> { browser, page, cookies, loggedIn }
  }

  // Launch browser with anti-detection
  async _launchBrowser() {
    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--window-size=1366,768',
      '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    ]

    // Use proxy if configured
    const proxy = process.env.LINKEDIN_PROXY
    if (proxy) args.push(`--proxy-server=${proxy}`)

    const execPath = await ensureChrome()

    const launchOptions = {
      headless: 'new',
      args,
      defaultViewport: { width: 1366, height: 768 },
    }
    if (execPath) launchOptions.executablePath = execPath
    if (process.env.CHROMIUM_PATH) launchOptions.executablePath = process.env.CHROMIUM_PATH

    const browser = await puppeteer.launch(launchOptions)

    return browser
  }

  // Login to LinkedIn
  async login(profileId, email, password) {
    this.emit('status', { profileId, status: 'connecting' })

    try {
      const browser = await this._launchBrowser()
      const page = await browser.newPage()

      // Set extra headers to look more human
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
      })

      // Check if we have saved cookies
      const { pool } = await import('../../config/database.js')
      const cookieRes = await pool.query('SELECT cookies FROM linkedin_profiles WHERE id = $1', [profileId])
      const savedCookies = cookieRes.rows[0]?.cookies

      if (savedCookies) {
        try {
          const cookies = JSON.parse(decrypt(savedCookies))
          await page.setCookie(...cookies)
          await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded', timeout: 30000 })
          await sleep(3000, 5000)

          const feedUrl = page.url()
          const isLogged = feedUrl.includes('/feed') && !feedUrl.includes('/login')

          if (isLogged) {
            this.sessions.set(profileId, { browser, page, loggedIn: true })
            this.emit('status', { profileId, status: 'connected' })
            console.log('[LinkedIn] Session restored from cookies')
            return { success: true, message: 'Session restored from cookies' }
          }
          console.log('[LinkedIn] Cookies expired, redirected to:', feedUrl)
        } catch (e) {
          console.log('[LinkedIn] Cookie restore failed:', e.message)
        }
      }

      // Fresh login
      await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded', timeout: 30000 })
      await sleep(3000, 5000)

      // Check if already logged in
      const currentUrl = page.url()
      if (currentUrl.includes('/feed') || currentUrl.includes('/mynetwork') || currentUrl.includes('/messaging')) {
        console.log('[LinkedIn] Already logged in! URL:', currentUrl)
        const cookies = await page.cookies()
        const { pool: p2 } = await import('../../config/database.js')
        await p2.query('UPDATE linkedin_profiles SET cookies = $1 WHERE id = $2', [encrypt(JSON.stringify(cookies)), profileId])
        this.sessions.set(profileId, { browser, page, loggedIn: true })
        this.emit('status', { profileId, status: 'connected' })
        return { success: true, message: 'Ya estabas conectado a LinkedIn!' }
      }

      await randomMouseMove(page)

      // Debug: save info about what LinkedIn shows
      try {
        const ss = await page.screenshot({ encoding: 'base64' })
        const { pool: dbPool } = await import('../../config/database.js')
        await dbPool.query('UPDATE linkedin_profiles SET stats = jsonb_set(COALESCE(stats,\'{}\'::jsonb), \'{lastScreenshot}\', $1::jsonb) WHERE id = $2', [JSON.stringify(ss.slice(0, 500)), profileId])
        console.log('[LinkedIn] Login page URL:', page.url())
        console.log('[LinkedIn] Login page title:', await page.title())
        const html = await page.content()
        console.log('[LinkedIn] Has #username:', html.includes('username'))
        console.log('[LinkedIn] Has session_key:', html.includes('session_key'))
        console.log('[LinkedIn] Input count:', (html.match(/<input/g) || []).length)
        console.log('[LinkedIn] HTML snippet:', html.slice(0, 500))
      } catch {}

      // Wait for page to fully load and try to find inputs
      await sleep(3000, 5000)

      // Find email input - try multiple selectors
      const emailSelectors = ['#username', 'input[name="session_key"]', 'input[autocomplete="username"]', 'input[id*="username"]', 'input[id*="email"]', 'input[type="text"]', 'input[type="email"]']
      let emailInput = null
      for (const sel of emailSelectors) {
        emailInput = await page.$(sel)
        if (emailInput) { console.log('[LinkedIn] Found email input with:', sel); break }
      }
      if (!emailInput) {
        // Try waiting for any input to appear
        try {
          await page.waitForSelector('input', { timeout: 10000 })
          emailInput = await page.$('input')
          console.log('[LinkedIn] Found generic input after wait')
        } catch {}
      }
      if (!emailInput) {
        const url = page.url()
        const title = await page.title().catch(() => '')
        await browser.close()
        return { success: false, message: `No se encontro el campo de email. URL: ${url.slice(0, 80)}, Title: ${title.slice(0, 50)}` }
      }
      await emailInput.click()
      await sleep(300, 800)
      for (const char of email) {
        await page.keyboard.type(char, { delay: 50 + Math.random() * 150 })
      }
      await sleep(500, 1500)
      await randomMouseMove(page)

      // Find password input
      const passSelectors = ['#password', 'input[name="session_password"]', 'input[autocomplete="current-password"]', 'input[type="password"]']
      let passInput = null
      for (const sel of passSelectors) {
        passInput = await page.$(sel)
        if (passInput) break
      }
      if (!passInput) {
        await browser.close()
        return { success: false, message: 'No se encontro el campo de password.' }
      }
      await passInput.click()
      await sleep(300, 800)
      for (const char of password) {
        await page.keyboard.type(char, { delay: 50 + Math.random() * 150 })
      }
      await sleep(800, 2000)

      // Click sign in - try multiple selectors
      const submitSelectors = ['[data-litms-control-urn="login-submit"]', 'button[type="submit"]', '.login__form_action_container button', 'form button']
      for (const sel of submitSelectors) {
        const btn = await page.$(sel)
        if (btn) { await btn.click(); break }
      }
      await sleep(5000, 10000)

      // Check for verification challenge
      const url = page.url()
      if (url.includes('checkpoint') || url.includes('challenge')) {
        this.sessions.set(profileId, { browser, page, loggedIn: false, needsVerification: true })
        this.emit('status', { profileId, status: 'verification_needed' })
        return { success: false, message: 'LinkedIn requiere verificacion. Revisa tu email/telefono.', needsVerification: true }
      }

      // Check if logged in
      await page.waitForSelector('.global-nav', { timeout: 15000 }).catch(() => {})
      const isLogged = await page.evaluate(() => !!document.querySelector('.global-nav'))

      if (!isLogged) {
        await browser.close()
        return { success: false, message: 'Login failed. Verifica credenciales.' }
      }

      // Save cookies encrypted
      const cookies = await page.cookies()
      await pool.query('UPDATE linkedin_profiles SET cookies = $1 WHERE id = $2', [encrypt(JSON.stringify(cookies)), profileId])

      this.sessions.set(profileId, { browser, page, loggedIn: true })
      this.emit('status', { profileId, status: 'connected' })
      console.log(`[LinkedIn] Logged in for profile ${profileId}`)

      return { success: true, message: 'Conectado a LinkedIn' }
    } catch (err) {
      this.emit('status', { profileId, status: 'error', error: err.message })
      console.error('[LinkedIn] Login error:', err.message)
      return { success: false, message: err.message }
    }
  }

  // Create a post
  async createPost(profileId, text, imageUrl = null) {
    const session = this.sessions.get(profileId)
    if (!session?.loggedIn) return { success: false, message: 'No conectado' }

    try {
      const { page } = session
      await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded', timeout: 30000 })
      await sleep(5000, 8000)
      await humanScroll(page)

      // Click "Start a post" - try multiple selectors
      const startPostSelectors = [
        '.share-box-feed-entry__trigger',
        'button.artdeco-button--muted',
        '[data-control-name="share.share_box"]',
        'div.share-box-feed-entry__top-bar',
      ]
      let clicked = false
      for (const sel of startPostSelectors) {
        try { await page.click(sel); clicked = true; break } catch {}
      }
      // Fallback: find by text content
      if (!clicked) {
        try {
          await page.evaluate(() => {
            const btns = [...document.querySelectorAll('button, div[role="button"]')]
            const trigger = btns.find(b => b.textContent.includes('Empezar') || b.textContent.includes('Start') || b.textContent.includes('publicación') || b.textContent.includes('post'))
            if (trigger) trigger.click()
          })
          clicked = true
        } catch {}
      }
      if (!clicked) return { success: false, message: 'No se encontro boton para crear post' }

      await sleep(3000, 5000)

      // Type post content in the editor
      const editorSelectors = ['.ql-editor', '[role="textbox"]', '[contenteditable="true"]', '.editor-content']
      let editor = null
      for (const sel of editorSelectors) {
        editor = await page.$(sel)
        if (editor) break
      }
      if (!editor) return { success: false, message: 'No se encontro editor de texto' }

      await editor.click()
      await sleep(500, 1000)

      // Type with human-like speed
      for (const line of text.split('\n')) {
        for (const char of line) {
          await page.keyboard.type(char, { delay: 20 + Math.random() * 60 })
        }
        await page.keyboard.press('Enter')
        await sleep(100, 300)
      }

      await sleep(2000, 4000)

      // Click Post/Publicar button
      const postBtnSelectors = [
        '.share-actions__primary-action',
        'button.share-actions__primary-action',
        '[data-control-name="share.post"]',
      ]
      let posted = false
      for (const sel of postBtnSelectors) {
        try { await page.click(sel); posted = true; break } catch {}
      }
      if (!posted) {
        // Find by text
        await page.evaluate(() => {
          const btns = [...document.querySelectorAll('button')]
          const postBtn = btns.find(b => b.textContent.trim() === 'Post' || b.textContent.trim() === 'Publicar')
          if (postBtn) postBtn.click()
        })
      }
      await sleep(5000, 10000)

      // Save cookies after action
      const cookies = await page.cookies()
      const { pool } = await import('../../config/database.js')
      await pool.query('UPDATE linkedin_profiles SET cookies = $1 WHERE id = $2', [encrypt(JSON.stringify(cookies)), profileId])

      console.log(`[LinkedIn] Post created for profile ${profileId}`)
      return { success: true, message: 'Post publicado' }
    } catch (err) {
      console.error('[LinkedIn] Post error:', err.message)
      return { success: false, message: err.message }
    }
  }

  // Send connection request
  async sendConnection(profileId, targetProfileUrl, note = '') {
    const session = this.sessions.get(profileId)
    if (!session?.loggedIn) return { success: false, message: 'No conectado' }

    try {
      const { page } = session
      await page.goto(targetProfileUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await sleep(3000, 7000)
      await humanScroll(page)
      await randomMouseMove(page)

      // Click Connect button
      const connectBtn = await page.$('button[aria-label*="Connect"], button[aria-label*="Conectar"]')
      if (!connectBtn) return { success: false, message: 'Boton Connect no encontrado' }

      await connectBtn.click()
      await sleep(2000, 4000)

      // Add note if provided
      if (note) {
        const addNoteBtn = await page.$('button[aria-label*="Add a note"], button[aria-label*="nota"]')
        if (addNoteBtn) {
          await addNoteBtn.click()
          await sleep(1000, 2000)
          const noteInput = await page.$('#custom-message, textarea[name="message"]')
          if (noteInput) {
            await humanType(page, '#custom-message, textarea[name="message"]', note)
            await sleep(1000, 2000)
          }
        }
      }

      // Send
      const sendBtn = await page.$('button[aria-label*="Send"], button[aria-label*="Enviar"]')
      if (sendBtn) await sendBtn.click()
      await sleep(3000, 6000)

      console.log(`[LinkedIn] Connection sent from ${profileId} to ${targetProfileUrl}`)
      return { success: true, message: 'Conexion enviada' }
    } catch (err) {
      return { success: false, message: err.message }
    }
  }

  // Send DM
  async sendMessage(profileId, targetProfileUrl, message) {
    const session = this.sessions.get(profileId)
    if (!session?.loggedIn) return { success: false, message: 'No conectado' }

    try {
      const { page } = session
      await page.goto(targetProfileUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await sleep(3000, 6000)

      // Click Message button
      const msgBtn = await page.$('button[aria-label*="Message"], button[aria-label*="Mensaje"]')
      if (!msgBtn) return { success: false, message: 'Boton Message no encontrado (no es conexion?)' }

      await msgBtn.click()
      await sleep(2000, 4000)

      // Type message
      const msgInput = await page.waitForSelector('.msg-form__contenteditable, [role="textbox"]', { timeout: 10000 })
      await msgInput.click()
      await sleep(500, 1000)

      for (const char of message) {
        await page.keyboard.type(char, { delay: 40 + Math.random() * 100 })
        if (Math.random() < 0.03) await sleep(500, 1500)
      }

      await sleep(1000, 3000)

      // Send
      const sendBtn = await page.$('.msg-form__send-button, button[type="submit"]')
      if (sendBtn) await sendBtn.click()
      await sleep(3000, 5000)

      console.log(`[LinkedIn] Message sent from ${profileId}`)
      return { success: true, message: 'Mensaje enviado' }
    } catch (err) {
      return { success: false, message: err.message }
    }
  }

  // Get connection status
  // Submit verification code
  async submitVerification(profileId, code) {
    const session = this.sessions.get(profileId)
    if (!session?.page) return { success: false, message: 'No hay sesion activa' }

    try {
      const { page } = session
      await sleep(1000, 2000)

      // Try different verification input selectors
      const selectors = [
        'input[name="pin"]',
        'input#input__email_verification_pin',
        'input#input__phone_verification_pin',
        'input[type="text"]',
        'input[id*="verification"]',
        'input[id*="pin"]',
        'input[name="verificationCode"]',
      ]

      let typed = false
      for (const sel of selectors) {
        const input = await page.$(sel)
        if (input) {
          await input.click()
          await sleep(300, 600)
          await input.type(code, { delay: 80 + Math.random() * 50 })
          typed = true
          break
        }
      }

      if (!typed) {
        // Fallback: type in whatever focused input
        await page.keyboard.type(code, { delay: 80 + Math.random() * 50 })
      }

      await sleep(1000, 2000)

      // Click submit button
      const submitSelectors = [
        'button[type="submit"]',
        'button#two-step-submit-button',
        'button[data-litms-control-urn*="submit"]',
        'form button',
      ]
      for (const sel of submitSelectors) {
        const btn = await page.$(sel)
        if (btn) { await btn.click(); break }
      }

      await sleep(5000, 10000)

      // Check if we're now on the feed
      const url = page.url()
      const isLogged = url.includes('/feed') || await page.evaluate(() => !!document.querySelector('.global-nav')).catch(() => false)

      if (isLogged) {
        // Save cookies
        const cookies = await page.cookies()
        const { pool } = await import('../../config/database.js')
        await pool.query('UPDATE linkedin_profiles SET cookies = $1 WHERE id = $2', [encrypt(JSON.stringify(cookies)), profileId])

        session.loggedIn = true
        session.needsVerification = false
        this.emit('status', { profileId, status: 'connected' })
        console.log(`[LinkedIn] Verification successful for ${profileId}`)
        return { success: true, message: 'Verificacion exitosa. Conectado a LinkedIn.' }
      }

      return { success: false, message: 'Codigo incorrecto o expiro. Intenta de nuevo.' }
    } catch (err) {
      console.error('[LinkedIn] Verification error:', err.message)
      return { success: false, message: err.message }
    }
  }

  // Auto-reconnect from saved cookies
  async ensureConnected(profileId) {
    const session = this.sessions.get(profileId)
    if (session?.loggedIn && session?.page) {
      try { await session.page.evaluate(() => true); return true } catch {}
      try { await session.browser?.close() } catch {}
      this.sessions.delete(profileId)
    }
    try {
      const { pool } = await import('../../config/database.js')
      const res = await pool.query('SELECT cookies, email_encrypted, pass_encrypted FROM linkedin_profiles WHERE id = $1', [profileId])
      const row = res.rows[0]
      if (row?.email_encrypted) {
        const result = await this.login(profileId, decrypt(row.email_encrypted), decrypt(row.pass_encrypted))
        return result.success
      }
    } catch (e) { console.error('[LinkedIn] ensureConnected error:', e.message) }
    return false
  }

  getStatus(profileId) {
    const session = this.sessions.get(profileId)
    return {
      connected: session?.loggedIn || false,
      needsVerification: session?.needsVerification || false,
    }
  }

  // Disconnect
  async disconnect(profileId) {
    const session = this.sessions.get(profileId)
    if (session?.browser) {
      await session.browser.close().catch(() => {})
    }
    this.sessions.delete(profileId)
    this.emit('status', { profileId, status: 'disconnected' })
  }
}

export const linkedinBrowser = new LinkedInBrowserService()
export default linkedinBrowser
export { encrypt, decrypt }
