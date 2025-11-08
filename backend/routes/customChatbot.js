import express from 'express'
import { protect } from '../middleware/auth.js'
import CustomChatbot from '../models/CustomChatbot.js'
import deepseekService from '../services/deepseek.js'

const router = express.Router()

const MAX_CHATBOTS_PER_USER = 3

// Crear un chatbot personalizado
router.post('/create', protect, async (req, res) => {
  try {
    const { name, description, systemPrompt, temperature, maxTokens, personality, tone } = req.body

    if (!name || !systemPrompt) {
      return res.status(400).json({ error: 'El nombre y el prompt del sistema son requeridos' })
    }

    // Verificar el límite de chatbots por usuario
    const chatbotCount = await CustomChatbot.countByUserId(req.user.id)
    if (chatbotCount >= MAX_CHATBOTS_PER_USER) {
      return res.status(400).json({
        error: `Has alcanzado el límite máximo de ${MAX_CHATBOTS_PER_USER} chatbots personalizados`,
        limit: MAX_CHATBOTS_PER_USER,
        current: chatbotCount
      })
    }

    // Crear el chatbot
    const chatbot = await CustomChatbot.create({
      userId: req.user.id,
      name,
      description,
      systemPrompt,
      temperature,
      maxTokens,
      personality,
      tone
    })

    res.status(201).json({
      message: 'Chatbot creado exitosamente',
      chatbot,
      remaining: MAX_CHATBOTS_PER_USER - chatbotCount - 1
    })
  } catch (error) {
    console.error('Error al crear chatbot:', error)
    res.status(500).json({ error: 'Error al crear el chatbot', details: error.message })
  }
})

// Listar todos los chatbots del usuario
router.get('/list', protect, async (req, res) => {
  try {
    const chatbots = await CustomChatbot.findByUserId(req.user.id)
    const count = chatbots.length

    res.json({
      chatbots,
      count,
      limit: MAX_CHATBOTS_PER_USER,
      remaining: MAX_CHATBOTS_PER_USER - count
    })
  } catch (error) {
    console.error('Error al listar chatbots:', error)
    res.status(500).json({ error: 'Error al obtener los chatbots', details: error.message })
  }
})

// Obtener un chatbot específico
router.get('/:id', protect, async (req, res) => {
  try {
    const chatbot = await CustomChatbot.findById(req.params.id, req.user.id)

    if (!chatbot) {
      return res.status(404).json({ error: 'Chatbot no encontrado' })
    }

    res.json({ chatbot })
  } catch (error) {
    console.error('Error al obtener chatbot:', error)
    res.status(500).json({ error: 'Error al obtener el chatbot', details: error.message })
  }
})

// Chatear con un chatbot personalizado
router.post('/:id/chat', protect, async (req, res) => {
  try {
    const { message, history = [] } = req.body

    if (!message) {
      return res.status(400).json({ error: 'El mensaje es requerido' })
    }

    // Obtener el chatbot
    const chatbot = await CustomChatbot.findById(req.params.id, req.user.id)

    if (!chatbot) {
      return res.status(404).json({ error: 'Chatbot no encontrado' })
    }

    // Llamar a DeepSeek con la configuración del chatbot
    const response = await deepseekService.chatWithCustomBot({
      systemPrompt: chatbot.system_prompt,
      userMessage: message,
      history,
      temperature: parseFloat(chatbot.temperature),
      maxTokens: chatbot.max_tokens
    })

    res.json({
      response: response.content,
      usage: response.usage,
      chatbot: {
        id: chatbot.id,
        name: chatbot.name
      }
    })
  } catch (error) {
    console.error('Error en el chat:', error)
    res.status(500).json({ error: 'Error al procesar el mensaje', details: error.message })
  }
})

// Actualizar un chatbot
router.put('/:id', protect, async (req, res) => {
  try {
    const { name, description, systemPrompt, temperature, maxTokens, personality, tone } = req.body

    const chatbot = await CustomChatbot.update(req.params.id, req.user.id, {
      name,
      description,
      systemPrompt,
      temperature,
      maxTokens,
      personality,
      tone
    })

    if (!chatbot) {
      return res.status(404).json({ error: 'Chatbot no encontrado' })
    }

    res.json({
      message: 'Chatbot actualizado exitosamente',
      chatbot
    })
  } catch (error) {
    console.error('Error al actualizar chatbot:', error)
    res.status(500).json({ error: 'Error al actualizar el chatbot', details: error.message })
  }
})

// Eliminar un chatbot
router.delete('/:id', protect, async (req, res) => {
  try {
    const chatbot = await CustomChatbot.delete(req.params.id, req.user.id)

    if (!chatbot) {
      return res.status(404).json({ error: 'Chatbot no encontrado' })
    }

    res.json({
      message: 'Chatbot eliminado exitosamente',
      id: chatbot.id
    })
  } catch (error) {
    console.error('Error al eliminar chatbot:', error)
    res.status(500).json({ error: 'Error al eliminar el chatbot', details: error.message })
  }
})

export default router
