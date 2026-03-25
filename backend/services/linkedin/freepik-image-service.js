import axios from 'axios'

const API_KEY = process.env.FREEPIK_API_KEY || ''
const BASE_URL = 'https://api.freepik.com/v1'

class FreepikImageService {

  // Generate image from text prompt
  async generateImage(prompt, options = {}) {
    if (!API_KEY) throw new Error('FREEPIK_API_KEY no configurada')

    const { width = 1024, height = 1024, style = 'photo' } = options

    const response = await axios.post(`${BASE_URL}/ai/text-to-image/flux-dev`, {
      prompt,
      negative_prompt: 'blurry, bad quality, text, watermark, logo, ugly, deformed',
      image: { size: `${width}x${height}` },
      styling: { style },
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-freepik-api-key': API_KEY,
        'Accept': 'application/json',
      },
      timeout: 60000,
    })

    const images = response.data?.data || []
    if (images.length > 0) {
      return {
        url: images[0].base64 ? `data:image/png;base64,${images[0].base64}` : images[0].url,
        base64: images[0].base64 || null,
      }
    }

    throw new Error('No se genero imagen')
  }

  // Generate LinkedIn-optimized image for a post
  async generateForPost(postContent, style = 'digital-art') {
    const { analyzeWithDeepSeek } = await import('../deepseek.js')

    // Use AI to create an optimal image prompt from the post
    const resp = await analyzeWithDeepSeek(`
      Based on this LinkedIn post, create a short image prompt in English for AI image generation.
      The image should be professional, modern, suitable for a LinkedIn post about technology/AI/business.

      Post: ${postContent.slice(0, 300)}

      Respond ONLY with the image description, max 50 words. No JSON, just the prompt text.
    `)

    const prompt = resp.trim().replace(/['"]/g, '').slice(0, 200)
    console.log('[Freepik] Generating image with prompt:', prompt)

    return await this.generateImage(prompt, { width: 1024, height: 1024, style })
  }
}

export const freepikImageService = new FreepikImageService()
export default freepikImageService
