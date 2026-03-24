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

// Ensure Chrome is downloaded
let chromePath = null
async function ensureChrome() {
  if (chromePath && fs.existsSync(chromePath)) return chromePath

  // Check common locations
  const paths = [
    '/app/.cache/puppeteer/chrome/linux-146.0.7680.153/chrome-linux64/chrome',
    '/app/backend/.cache/puppeteer/chrome/linux-146.0.7680.153/chrome-linux64/chrome',
    '/tmp/puppeteer/chrome/linux-146.0.7680.153/chrome-linux64/chrome',
  ]
  for (const p of paths) {
    if (fs.existsSync(p)) { chromePath = p; return p }
  }

  // Download Chrome to /tmp (writable in runtime)
  console.log('[LinkedIn] Downloading Chrome...')
  try {
    const cacheDir = '/tmp/puppeteer'
    process.env.PUPPETEER_CACHE_DIR = cacheDir
    execSync('npx puppeteer browsers install chrome', {
      cwd: '/app/backend',
      env: { ...process.env, PUPPETEER_CACHE_DIR: cacheDir, PATH: process.env.PATH },
      timeout: 120000,
      stdio: 'pipe'
    })
    // Find the downloaded chrome
    const result = execSync(`find ${cacheDir} -name "chrome" -type f 2>/dev/null | head -1`, { encoding: 'utf8' }).trim()
    if (result) { chromePath = result; return result }
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
          await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'networkidle2', timeout: 30000 })
          await sleep(2000, 4000)

          // Check if session is still valid
          const isLogged = await page.evaluate(() => {
            return !!document.querySelector('.global-nav') || !!document.querySelector('[data-control-name]')
          })

          if (isLogged) {
            this.sessions.set(profileId, { browser, page, loggedIn: true })
            this.emit('status', { profileId, status: 'connected' })
            console.log(`[LinkedIn] Session restored for profile ${profileId}`)
            return { success: true, message: 'Session restored from cookies' }
          }
        } catch (e) {
          console.log('[LinkedIn] Saved cookies expired, logging in fresh')
        }
      }

      // Fresh login
      await page.goto('https://www.linkedin.com/login', { waitUntil: 'networkidle2', timeout: 30000 })
      await sleep(2000, 5000)
      await randomMouseMove(page)

      // Type email
      await humanType(page, '#username', email)
      await sleep(500, 1500)
      await randomMouseMove(page)

      // Type password
      await humanType(page, '#password', password)
      await sleep(800, 2000)

      // Click sign in
      await page.click('[data-litms-control-urn="login-submit"]')
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
      await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'networkidle2' })
      await sleep(3000, 6000)
      await humanScroll(page)

      // Click "Start a post"
      await page.click('.share-box-feed-entry__trigger, [data-control-name="share.share_box"]')
      await sleep(2000, 4000)

      // Type post content
      const editor = await page.waitForSelector('.ql-editor, [role="textbox"]', { timeout: 10000 })
      await editor.click()
      await sleep(500, 1000)

      // Type with human-like speed
      for (const line of text.split('\n')) {
        for (const char of line) {
          await page.keyboard.type(char, { delay: 30 + Math.random() * 80 })
        }
        await page.keyboard.press('Enter')
        await sleep(200, 500)
      }

      await sleep(2000, 4000)

      // Click Post button
      await page.click('.share-actions__primary-action, [data-control-name="share.post"]')
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
      await page.goto(targetProfileUrl, { waitUntil: 'networkidle2' })
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
      await page.goto(targetProfileUrl, { waitUntil: 'networkidle2' })
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
