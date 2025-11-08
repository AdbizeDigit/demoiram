import express from 'express'
import OpenAI from 'openai'
import { protect } from '../middleware/auth.js'

const router = express.Router()

// Initialize OpenAI (or mock for demo)
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null

router.post('/', protect, async (req, res) => {
  try {
    const { message, history } = req.body

    if (!message) {
      return res.status(400).json({ error: 'Message is required' })
    }

    // If OpenAI is configured, use it
    if (openai) {
      const messages = [
        { role: 'system', content: 'Eres un asistente virtual inteligente y útil. Responde de manera clara y concisa.' },
        ...history.slice(-10).map(msg => ({ role: msg.role, content: msg.content })),
        { role: 'user', content: message }
      ]

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages,
        max_tokens: 500,
        temperature: 0.7
      })

      res.json({ response: completion.choices[0].message.content })
    } else {
      // Mock response for demo
      const responses = [
        'Entiendo tu pregunta. Basándome en la información disponible, puedo decirte que...',
        'Esa es una excelente pregunta. Déjame ayudarte con eso.',
        'Por supuesto, puedo asistirte con eso. Aquí está mi respuesta:',
        'Gracias por tu consulta. Te proporciono la siguiente información:'
      ]

      const randomResponse = responses[Math.floor(Math.random() * responses.length)]
      const mockResponse = `${randomResponse}\n\nRespuesta simulada a: "${message}"\n\nEste es un demo del chatbot. Para usar IA real, configura OPENAI_API_KEY en el archivo .env`

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000))

      res.json({ response: mockResponse })
    }
  } catch (error) {
    console.error('Chatbot error:', error)
    res.status(500).json({ error: 'Error al procesar el mensaje', details: error.message })
  }
})

export default router
