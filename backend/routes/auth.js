import express from 'express'
import User from '../models/User.js'
import { generateToken, protect } from '../middleware/auth.js'

const router = express.Router()

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body

    // Validación básica
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Todos los campos son requeridos' })
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' })
    }

    // Check if user exists
    const userExists = await User.findByEmail(email)
    if (userExists) {
      return res.status(400).json({ message: 'El usuario ya existe' })
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password
    })

    if (user) {
      res.status(201).json({
        _id: user.id,
        name: user.name,
        email: user.email,
        token: generateToken(user.id),
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          serviceUsage: {
            chatbot: user.chatbot_uses,
            agentGenerator: user.agent_generator_uses,
            documentAnalysis: user.document_analysis_uses,
            marketplace: user.marketplace_uses,
            predictor: user.predictor_uses,
            sentiment: user.sentiment_uses,
            transcription: user.transcription_uses,
            vision: user.vision_uses
          }
        }
      })
    } else {
      res.status(400).json({ message: 'Datos de usuario inválidos' })
    }
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ message: 'Error al registrar usuario', error: error.message })
  }
})

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    // Validación básica
    if (!email || !password) {
      return res.status(400).json({ message: 'Email y contraseña son requeridos' })
    }

    // Find user
    const user = await User.findByEmail(email)

    if (user && (await User.comparePassword(password, user.password))) {
      res.json({
        _id: user.id,
        name: user.name,
        email: user.email,
        token: generateToken(user.id),
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          serviceUsage: {
            chatbot: user.chatbot_uses,
            agentGenerator: user.agent_generator_uses,
            documentAnalysis: user.document_analysis_uses,
            marketplace: user.marketplace_uses,
            predictor: user.predictor_uses,
            sentiment: user.sentiment_uses,
            transcription: user.transcription_uses,
            vision: user.vision_uses
          }
        }
      })
    } else {
      res.status(401).json({ message: 'Email o contraseña incorrectos' })
    }
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ message: 'Error al iniciar sesión', error: error.message })
  }
})

// Get current user info
router.get('/me', protect, async (req, res) => {
  try {
    const usage = await User.getServiceUsage(req.user.id)

    res.json({
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        serviceUsage: {
          chatbot: usage.chatbot_uses,
          agentGenerator: usage.agent_generator_uses,
          documentAnalysis: usage.document_analysis_uses,
          marketplace: usage.marketplace_uses,
          predictor: usage.predictor_uses,
          sentiment: usage.sentiment_uses,
          transcription: usage.transcription_uses,
          vision: usage.vision_uses
        }
      }
    })
  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({ message: 'Error al obtener datos del usuario' })
  }
})

export default router
