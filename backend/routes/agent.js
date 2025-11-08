import express from 'express'
import OpenAI from 'openai'
import { protect } from '../middleware/auth.js'

const router = express.Router()

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null

router.post('/generate', protect, async (req, res) => {
  try {
    const { name, role, skills, personality } = req.body

    if (!name || !role || !skills) {
      return res.status(400).json({ error: 'Name, role, and skills are required' })
    }

    const personalityMap = {
      'professional': 'profesional y cortés',
      'friendly': 'amigable y cercano',
      'formal': 'formal y educado',
      'casual': 'casual y relajado',
      'technical': 'técnico y preciso'
    }

    const personalityDesc = personalityMap[personality] || personalityMap.professional

    // Generate system prompt
    const systemPrompt = `Eres ${name}, un agente de IA especializado en ${role}.

Tu personalidad es ${personalityDesc}.

Tus habilidades principales son:
${skills.map(skill => `- ${skill}`).join('\n')}

Tu objetivo es ayudar a los usuarios de manera eficiente utilizando tus habilidades especializadas. Siempre mantén tu personalidad ${personalityDesc} en todas tus interacciones.`

    // Generate example conversation
    const exampleConversation = [
      {
        role: 'user',
        content: `Hola, necesito ayuda con ${skills[0]}`
      },
      {
        role: 'assistant',
        content: `¡Hola! Soy ${name}, experto en ${role}. Estaré encantado de ayudarte con ${skills[0]}. ¿Podrías darme más detalles sobre lo que necesitas?`
      },
      {
        role: 'user',
        content: '¿Cuáles son tus capacidades?'
      },
      {
        role: 'assistant',
        content: `Puedo ayudarte con: ${skills.join(', ')}. Mi especialidad es ${role} y estoy aquí para asistirte de manera ${personalityDesc}.`
      }
    ]

    const agent = {
      name,
      role,
      skills,
      personality,
      systemPrompt,
      exampleConversation,
      createdAt: new Date().toISOString()
    }

    res.json({ agent })
  } catch (error) {
    console.error('Agent generation error:', error)
    res.status(500).json({ error: 'Error al generar agente', details: error.message })
  }
})

export default router
