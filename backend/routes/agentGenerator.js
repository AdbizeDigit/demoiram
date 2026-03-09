import express from 'express'
import { protect } from '../middleware/auth.js'
import AgentHierarchy from '../models/AgentHierarchy.js'
import deepseekService from '../services/deepseek.js'

const router = express.Router()

// System prompt for the executive agent
const EXECUTIVE_AGENT_PROMPT = `Eres un Agente Ejecutivo experto en diseño organizacional y creación de jerarquías empresariales.

Tu misión es diseñar la estructura completa de una organización haciendo EXACTAMENTE 5 PREGUNTAS.

PROCESO ESTRICTO (Solo 5 preguntas):
1. PREGUNTA 1: ¿Qué tipo de organización es? (tecnológica, restaurante, consultoría, etc.)
2. PREGUNTA 2: ¿Cuáles son los objetivos principales del negocio?
3. PREGUNTA 3: ¿Qué áreas o departamentos principales necesita?
4. PREGUNTA 4: ¿Cuántas personas trabajarán aproximadamente y en qué áreas?
5. PREGUNTA 5: ¿Hay alguna característica especial o necesidad específica de la organización?

IMPORTANTE:
- Haz UNA pregunta a la vez, numérala claramente (Pregunta 1/5, Pregunta 2/5, etc.)
- Sé conversacional y amigable
- Usa emojis moderadamente
- DESPUÉS DE LA 5TA RESPUESTA, genera INMEDIATAMENTE la jerarquía completa en formato JSON
- NO hagas más de 5 preguntas
- La jerarquía debe tener esta estructura:
{
  "organization": "Nombre",
  "type": "Tipo",
  "departments": [
    {
      "name": "Departamento",
      "description": "Descripción clara del departamento",
      "roles": [
        {
          "title": "Cargo/Posición",
          "responsibilities": ["Responsabilidad 1", "Responsabilidad 2", "Responsabilidad 3"]
        }
      ],
      "subdepartments": []
    }
  ]
}

Después de la pregunta 5, genera una jerarquía completa y profesional con al menos 3-5 departamentos, cada uno con 2-3 roles bien definidos.`

// Create a new agent session
router.post('/create', protect, async (req, res) => {
  try {
    const { organizationName, description } = req.body

    if (!organizationName) {
      return res.status(400).json({ error: 'El nombre de la organización es requerido' })
    }

    const session = await AgentHierarchy.createSession(
      req.user.id,
      organizationName,
      description || ''
    )

    // Save initial greeting message
    const greeting = `¡Hola! 👋 Soy tu Agente Ejecutivo. Veo que quieres crear la estructura para "${organizationName}".

Voy a ayudarte a diseñar una jerarquía organizacional completa y profesional con solo 5 preguntas.

**Pregunta 1/5:** ¿Qué tipo de organización es? (Por ejemplo: empresa tecnológica, restaurante, consultoría, ONG, etc.)`

    await AgentHierarchy.saveMessage(session.id, 'assistant', greeting)

    res.status(201).json({
      session,
      message: greeting
    })
  } catch (error) {
    console.error('Error creating agent session:', error)
    res.status(500).json({ error: 'Error al crear la sesión', details: error.message })
  }
})

// Chat with the executive agent
router.post('/:id/chat', protect, async (req, res) => {
  try {
    const { message } = req.body

    if (!message) {
      return res.status(400).json({ error: 'El mensaje es requerido' })
    }

    const session = await AgentHierarchy.findById(req.params.id, req.user.id)

    if (!session) {
      return res.status(404).json({ error: 'Sesión no encontrada' })
    }

    // Save user message
    await AgentHierarchy.saveMessage(session.id, 'user', message)

    // Get conversation history
    const history = await AgentHierarchy.getMessages(session.id)

    // Prepare messages for DeepSeek
    const messages = [
      { role: 'system', content: EXECUTIVE_AGENT_PROMPT },
      ...history.slice(-10).map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }))
    ]

    // Call DeepSeek
    const response = await deepseekService.chat({
      messages,
      temperature: 0.7,
      maxTokens: 800
    })

    const agentResponse = response.content

    // Save agent response
    await AgentHierarchy.saveMessage(session.id, 'assistant', agentResponse)

    // Check if response contains JSON hierarchy
    let hierarchy = null
    const jsonMatch = agentResponse.match(/\{[\s\S]*"organization"[\s\S]*\}/)
    if (jsonMatch) {
      try {
        hierarchy = JSON.parse(jsonMatch[0])
        await AgentHierarchy.update(session.id, req.user.id, {
          hierarchy,
          status: 'completed'
        })
      } catch (e) {
        console.log('No valid JSON hierarchy found in response')
      }
    }

    res.json({
      response: agentResponse,
      hierarchy,
      session: await AgentHierarchy.findById(session.id, req.user.id)
    })
  } catch (error) {
    console.error('Error in agent chat:', error)
    res.status(500).json({ error: 'Error al procesar el mensaje', details: error.message })
  }
})

// Get all sessions
router.get('/sessions', protect, async (req, res) => {
  try {
    const sessions = await AgentHierarchy.findByUserId(req.user.id)
    res.json({ sessions })
  } catch (error) {
    console.error('Error getting sessions:', error)
    res.status(500).json({ error: 'Error al obtener sesiones', details: error.message })
  }
})

// Get specific session with messages
router.get('/sessions/:id', protect, async (req, res) => {
  try {
    const session = await AgentHierarchy.findById(req.params.id, req.user.id)

    if (!session) {
      return res.status(404).json({ error: 'Sesión no encontrada' })
    }

    const messages = await AgentHierarchy.getMessages(session.id)

    res.json({
      session,
      messages
    })
  } catch (error) {
    console.error('Error getting session:', error)
    res.status(500).json({ error: 'Error al obtener la sesión', details: error.message })
  }
})

// Delete session
router.delete('/sessions/:id', protect, async (req, res) => {
  try {
    const session = await AgentHierarchy.delete(req.params.id, req.user.id)

    if (!session) {
      return res.status(404).json({ error: 'Sesión no encontrada' })
    }

    res.json({ message: 'Sesión eliminada exitosamente' })
  } catch (error) {
    console.error('Error deleting session:', error)
    res.status(500).json({ error: 'Error al eliminar la sesión', details: error.message })
  }
})

export default router
