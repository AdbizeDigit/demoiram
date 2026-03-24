import { GoogleGenerativeAI } from '@google/generative-ai'

const GEMINI_KEY = process.env.GEMINI_API_KEY || ''

class GeminiImageService {
  constructor() {
    this.genAI = GEMINI_KEY ? new GoogleGenerativeAI(GEMINI_KEY) : null
  }

  // Generate image description for a LinkedIn post (to use with image generation)
  async generateImagePrompt(postContent, style = 'professional') {
    if (!this.genAI) throw new Error('GEMINI_API_KEY no configurada')

    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const result = await model.generateContent(`
      Based on this LinkedIn post, generate a detailed image prompt for an AI image generator.
      The image should be professional, suitable for LinkedIn, and visually compelling.
      Style: ${style}

      Post: ${postContent.slice(0, 500)}

      Respond ONLY with JSON: {"prompt":"detailed image description in English","style":"${style}","colors":["color1","color2"]}
    `)

    const text = result.response.text()
    const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}')
    return parsed
  }

  // Generate text content with Gemini (alternative to DeepSeek)
  async generateContent(prompt) {
    if (!this.genAI) throw new Error('GEMINI_API_KEY no configurada')

    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const result = await model.generateContent(prompt)
    return result.response.text()
  }

  // Generate LinkedIn profile optimization suggestions
  async optimizeProfile(profileData) {
    if (!this.genAI) throw new Error('GEMINI_API_KEY no configurada')

    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const result = await model.generateContent(`
      Analiza este perfil de LinkedIn y genera sugerencias de optimizacion en espanol.

      Nombre: ${profileData.name}
      Headline: ${profileData.headline || 'Sin headline'}
      Rol: ${profileData.role || ''}
      Empresa: ${profileData.company || ''}

      Genera:
      1. Un headline optimizado para SEO de LinkedIn (max 120 chars)
      2. Un "Acerca de" / About section (max 200 palabras, con keywords)
      3. 5 keywords recomendadas para el perfil
      4. Sugerencia de contenido semanal

      Responde SOLO JSON:
      {
        "headline": "headline optimizado",
        "about": "seccion acerca de",
        "keywords": ["kw1","kw2","kw3","kw4","kw5"],
        "contentSuggestion": "sugerencia de contenido"
      }
    `)

    const text = result.response.text()
    return JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}')
  }
}

export const geminiImageService = new GeminiImageService()
export default geminiImageService
