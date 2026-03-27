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

      // Set headers - use English to get consistent selectors
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
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

      // Fill fields and submit using evaluate (avoids "not clickable" errors)
      await sleep(3000, 5000)

      console.log('[LinkedIn] Filling login form...')

      // Focus and type email using keyboard (most human-like)
      await page.evaluate(() => {
        const el = document.querySelector('#username') || document.querySelector('input[name="session_key"]') || document.querySelector('input[type="email"]')
        if (el) { el.value = ''; el.focus() }
      })
      await sleep(500, 1000)
      await page.keyboard.type(email, { delay: 40 + Math.random() * 60 })
      await sleep(500, 1000)

      // Tab to password and type
      await page.keyboard.press('Tab')
      await sleep(300, 600)
      await page.keyboard.type(password, { delay: 40 + Math.random() * 60 })
      await sleep(800, 1500)

      // Press Enter to submit (most reliable)
      console.log('[LinkedIn] Pressing Enter to submit...')
      await page.keyboard.press('Enter')
      await sleep(8000, 12000)

      // Check URL after login
      const postLoginUrl = page.url()
      console.log('[LinkedIn] Post-login URL:', postLoginUrl)

      if (postLoginUrl.includes('checkpoint') || postLoginUrl.includes('challenge')) {
        this.sessions.set(profileId, { browser, page, loggedIn: false, needsVerification: true })
        this.emit('status', { profileId, status: 'verification_needed' })
        return { success: false, message: 'LinkedIn requiere verificacion. Revisa tu email/telefono.', needsVerification: true }
      }

      // Check if logged in by URL (most reliable)
      const isLogged = postLoginUrl.includes('/feed') || postLoginUrl.includes('/mynetwork') || postLoginUrl.includes('/messaging') || postLoginUrl.includes('/in/')

      if (!isLogged) {
        // Wait a bit more and check again
        await sleep(5000, 8000)
        const retryUrl = page.url()
        console.log('[LinkedIn] Retry URL:', retryUrl)
        if (!retryUrl.includes('/feed') && !retryUrl.includes('/mynetwork') && !retryUrl.includes('checkpoint')) {
          await browser.close()
          return { success: false, message: `Login failed. URL: ${retryUrl.slice(0, 60)}` }
        }
        if (retryUrl.includes('checkpoint') || retryUrl.includes('challenge')) {
          this.sessions.set(profileId, { browser, page, loggedIn: false, needsVerification: true })
          return { success: false, message: 'LinkedIn requiere verificacion.', needsVerification: true }
        }
      }

      // Save cookies encrypted
      const freshCookies = await page.cookies()
      await pool.query('UPDATE linkedin_profiles SET cookies = $1 WHERE id = $2', [encrypt(JSON.stringify(freshCookies)), profileId])

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

  // Helper: get cookies and CSRF from browser session
  async _getSessionAuth(profileId) {
    const session = this.sessions.get(profileId)
    if (!session?.loggedIn) return null
    const { page } = session
    const cookies = await page.cookies()
    const csrfToken = cookies.find(c => c.name === 'JSESSIONID')?.value?.replace(/"/g, '')
    const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ')
    return { page, csrfToken, cookieStr, cookies }
  }

  // Upload image to LinkedIn using Node.js (not page.evaluate - avoids size limits)
  async _uploadImageToLinkedIn(imageUrl, csrfToken, cookieStr) {
    const axios = (await import('axios')).default

    // Step 1: Download image
    let imgBuffer
    if (imageUrl.startsWith('data:')) {
      const b64part = imageUrl.split(',')[1]
      imgBuffer = Buffer.from(b64part, 'base64')
    } else {
      const imgResponse = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 30000 })
      imgBuffer = Buffer.from(imgResponse.data)
    }
    console.log(`[LinkedIn] Image downloaded: ${Math.round(imgBuffer.length / 1024)}KB`)

    // Step 2: Register upload with LinkedIn
    const regRes = await axios.post(
      'https://www.linkedin.com/voyager/api/voyagerMediaUploadMetadata?action=upload',
      { fileSize: imgBuffer.length, filename: 'post-image.png', mediaUploadType: 'IMAGE_SHARING' },
      {
        headers: {
          'Content-Type': 'application/json',
          'csrf-token': csrfToken,
          'x-restli-protocol-version': '2.0.0',
          'Cookie': cookieStr,
        },
        timeout: 15000,
      }
    )
    console.log('[LinkedIn] Register response:', JSON.stringify(regRes.data).slice(0, 300))

    const uploadUrl = regRes.data?.data?.value?.singleUploadUrl
    const urn = regRes.data?.data?.value?.urn
    if (!uploadUrl) throw new Error('No uploadUrl: ' + JSON.stringify(regRes.data).slice(0, 300))

    // Step 3: Upload the actual image bytes
    const upRes = await axios.put(uploadUrl, imgBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cookie': cookieStr,
      },
      timeout: 30000,
      maxBodyLength: 50 * 1024 * 1024,
    })
    console.log(`[LinkedIn] Image uploaded! Status: ${upRes.status}, URN: ${urn}`)
    return urn
  }

  // Create a post
  async createPost(profileId, text, imageUrl = null, { requireImage = false } = {}) {
    const auth = await this._getSessionAuth(profileId)
    if (!auth) return { success: false, message: 'No conectado' }

    try {
      const { page, csrfToken, cookieStr } = auth
      if (!csrfToken) return { success: false, message: 'No CSRF token found' }

      // Upload image if provided (via Node.js directly - no page.evaluate size limits)
      let mediaUrn = null
      if (imageUrl) {
        console.log('[LinkedIn] Uploading image to LinkedIn...')
        try {
          mediaUrn = await this._uploadImageToLinkedIn(imageUrl, csrfToken, cookieStr)
        } catch (e) {
          console.log('[LinkedIn] Image upload FAILED:', e.message?.slice(0, 300))
          if (requireImage) {
            return { success: false, message: 'Image upload failed: ' + (e.message?.slice(0, 100) || 'unknown error') }
          }
          console.log('[LinkedIn] Will post without image')
        }
      }

      // Create post via Voyager API (from Node.js)
      console.log('[LinkedIn] Posting via API' + (mediaUrn ? ' WITH IMAGE...' : ' (text only)...'))
      const axios = (await import('axios')).default
      const postBody = {
        visibleToConnectionsOnly: false,
        externalAudienceProviders: [],
        commentaryV2: { text: text, attributes: [] },
        origin: 'FEED',
        allowedCommentersScope: 'ALL',
        postState: 'PUBLISHED',
      }
      if (mediaUrn) {
        postBody.mediaCategory = 'IMAGE'
        postBody.media = [{ category: 'IMAGE', mediaUrn, tapTargets: [] }]
      }

      let apiSuccess = false
      try {
        const postRes = await axios.post(
          'https://www.linkedin.com/voyager/api/contentcreation/normShares',
          postBody,
          {
            headers: {
              'Content-Type': 'application/json',
              'csrf-token': csrfToken,
              'x-restli-protocol-version': '2.0.0',
              'Cookie': cookieStr,
            },
            timeout: 15000,
          }
        )
        console.log('[LinkedIn] Post published via API! Status:', postRes.status)
        apiSuccess = true
      } catch (apiErr) {
        const status = apiErr.response?.status
        console.log('[LinkedIn] API post failed:', status, apiErr.message?.slice(0, 100))

        // If 401/403, session expired - don't try UI fallback
        if (status === 401 || status === 403) {
          return { success: false, message: `Sesion expirada (${status}). Reconecta LinkedIn.` }
        }

        console.log('[LinkedIn] Trying UI fallback...')
        const session = this.sessions?.get(profileId)
        if (session) session._pageInUse = true
        try {
          await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded', timeout: 30000 })
          await sleep(8000, 12000)

          // Check if actually logged in
          const url = page.url()
          if (url.includes('/login') || url.includes('/authwall')) {
            return { success: false, message: 'No logueado en LinkedIn. Reconecta.' }
          }

          await page.evaluate(() => {
            const trigger = document.querySelector('.share-box-feed-entry__trigger, [class*="share-box"]')
            if (trigger) trigger.click()
          })
          await sleep(3000, 5000)

          const editor = await page.$('.ql-editor, [role="textbox"], [contenteditable="true"]')
          if (editor) {
            await editor.click()
            await sleep(500)
            await page.keyboard.type(text, { delay: 15 })
            await sleep(2000)
            await page.evaluate(() => {
              const btn = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Post' || b.textContent.trim() === 'Publicar')
              if (btn) btn.click()
            })
            apiSuccess = true
          } else {
            return { success: false, message: 'No se encontro el editor de post en LinkedIn' }
          }
        } catch (uiErr) {
          return { success: false, message: 'UI fallback fallo: ' + uiErr.message?.slice(0, 80) }
        } finally {
          if (session) session._pageInUse = false
        }
      }

      if (!apiSuccess) {
        return { success: false, message: 'No se pudo publicar el post' }
      }

      await sleep(3000, 5000)

      // Save cookies after action
      const updatedCookies = await page.cookies()
      const { pool } = await import('../../config/database.js')
      await pool.query('UPDATE linkedin_profiles SET cookies = $1 WHERE id = $2', [encrypt(JSON.stringify(updatedCookies)), profileId])

      console.log(`[LinkedIn] Post created for profile ${profileId}`)
      return { success: true, message: mediaUrn ? 'Post con imagen publicado' : 'Post publicado (sin imagen)' }
    } catch (err) {
      console.error('[LinkedIn] Post error:', err.message)
      return { success: false, message: err.message }
    }
  }

  // Get recent posts from profile (to find posts without images)
  async getRecentPosts(profileId) {
    const auth = await this._getSessionAuth(profileId)
    if (!auth) return []

    try {
      const axios = (await import('axios')).default
      const { csrfToken, cookieStr } = auth

      // Get profile URN first
      const meRes = await axios.get('https://www.linkedin.com/voyager/api/me', {
        headers: { 'csrf-token': csrfToken, 'x-restli-protocol-version': '2.0.0', 'Cookie': cookieStr },
        timeout: 10000,
      })
      const memberUrn = meRes.data?.miniProfile?.entityUrn || meRes.data?.entityUrn
      console.log('[LinkedIn] Profile URN:', memberUrn)

      // Get recent activity/posts
      const feedRes = await axios.get(
        `https://www.linkedin.com/voyager/api/feed/dash/feedUpdates?moduleKey=member-shares:last-shared&count=20&q=memberShareFeed&memberUrn=${encodeURIComponent(memberUrn)}`,
        {
          headers: { 'csrf-token': csrfToken, 'x-restli-protocol-version': '2.0.0', 'Cookie': cookieStr },
          timeout: 15000,
        }
      )

      const posts = (feedRes.data?.elements || []).map(el => {
        const content = el?.content?.['com.linkedin.voyager.feed.render.UpdateV2Content']
        const text = content?.commentary?.text?.text || el?.commentary?.text?.text || ''
        const hasImage = !!(content?.images?.length || el?.content?.images?.length)
        const urn = el?.updateUrn || el?.urn || ''
        return { urn, text, hasImage }
      })

      console.log(`[LinkedIn] Found ${posts.length} recent posts, ${posts.filter(p => !p.hasImage).length} without images`)
      return posts
    } catch (e) {
      console.log('[LinkedIn] Error fetching posts:', e.message?.slice(0, 200))
      return []
    }
  }

  // Send connection request
  async sendConnection(profileId, targetProfileUrl, note = '') {
    const session = this.sessions.get(profileId)
    if (!session?.loggedIn) return { success: false, message: 'No conectado' }
    if (session._pageInUse) return { success: false, message: 'Navegador ocupado, intentar más tarde' }

    session._pageInUse = true
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
    } finally {
      session._pageInUse = false
    }
  }

  // Send DM
  async sendMessage(profileId, targetProfileUrl, message) {
    const session = this.sessions.get(profileId)
    if (!session?.loggedIn) return { success: false, message: 'No conectado' }
    if (session._pageInUse) return { success: false, message: 'Navegador ocupado, intentar más tarde' }

    session._pageInUse = true
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
    } finally {
      session._pageInUse = false
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
