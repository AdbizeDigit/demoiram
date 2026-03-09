import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

class DeepSeekService {
  constructor() {
    this.baseURL = 'https://api.deepseek.com/v1'
  }

  getApiKey() {
    return process.env.DEEPSEEK_API_KEY
  }

  async chat({ messages, temperature = 0.7, maxTokens = 500, model = 'deepseek-chat' }) {
    const apiKey = this.getApiKey()

    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY no está configurada en el archivo .env')
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: model,
          messages: messages,
          temperature: temperature,
          max_tokens: maxTokens,
          stream: false
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          }
        }
      )

      return {
        content: response.data.choices[0].message.content,
        usage: response.data.usage,
        model: response.data.model
      }
    } catch (error) {
      console.error('Error al llamar a DeepSeek API:', error.response?.data || error.message)

      if (error.response?.status === 401) {
        throw new Error('API Key de DeepSeek inválida')
      } else if (error.response?.status === 429) {
        throw new Error('Límite de solicitudes excedido. Intenta de nuevo más tarde.')
      } else if (error.response?.data?.error?.message) {
        throw new Error(error.response.data.error.message)
      } else {
        throw new Error('Error al comunicarse con DeepSeek API')
      }
    }
  }

  async chatWithCustomBot({ systemPrompt, userMessage, history = [], temperature = 0.7, maxTokens = 500 }) {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: userMessage }
    ]

    return await this.chat({ messages, temperature, maxTokens })
  }
}

export default new DeepSeekService()
