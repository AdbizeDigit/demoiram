import axios from 'axios'

const API_KEY = process.env.FREEPIK_API_KEY || ''
const BASE_URL = 'https://api.freepik.com/v1'
const headers = { 'Content-Type': 'application/json', 'x-freepik-api-key': API_KEY, 'Accept': 'application/json' }

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

class FreepikImageService {

  // Generate image with Flux Dev (async with polling)
  async generateImage(prompt, options = {}) {
    if (!API_KEY) throw new Error('FREEPIK_API_KEY no configurada')

    // Start generation task
    const response = await axios.post(`${BASE_URL}/ai/text-to-image/flux-dev`, {
      prompt,
      image: { size: 'square' },
    }, { headers, timeout: 30000 })

    const taskId = response.data?.data?.task_id
    if (!taskId) throw new Error('No se inicio la generacion')

    console.log('[Freepik] Task started:', taskId)

    // Poll for result (max 60s)
    for (let i = 0; i < 30; i++) {
      await sleep(2000)
      try {
        const check = await axios.get(`${BASE_URL}/ai/text-to-image/flux-dev/${taskId}`, { headers, timeout: 10000 })
        const status = check.data?.data?.status
        const images = check.data?.data?.generated || []

        if (status === 'COMPLETED' && images.length > 0) {
          const img = images[0]
          console.log('[Freepik] Image ready!')
          return {
            url: img.url || (img.base64 ? `data:image/png;base64,${img.base64}` : null),
            base64: img.base64 || null,
          }
        }
        if (status === 'FAILED') throw new Error('Generacion fallida')
        console.log(`[Freepik] Polling... status: ${status}`)
      } catch (e) {
        if (e.message === 'Generacion fallida') throw e
      }
    }

    throw new Error('Timeout esperando imagen')
  }

  // Generate LinkedIn-optimized image for a post
  async generateForPost(postContent, style = 'digital-art') {
    const { analyzeWithDeepSeek } = await import('../deepseek.js')

    const resp = await analyzeWithDeepSeek(`
      Based on this LinkedIn post, create a short image prompt in English for AI image generation.
      The image should be professional, modern, suitable for a LinkedIn post about technology/AI/business.

      Post: ${postContent.slice(0, 300)}

      Respond ONLY with the image description, max 50 words. No JSON, just the prompt text.
    `)

    const prompt = resp.trim().replace(/['"]/g, '').slice(0, 200)
    console.log('[Freepik] Generating image with prompt:', prompt)

    return await this.generateImage(prompt)
  }
}

export const freepikImageService = new FreepikImageService()
export default freepikImageService
