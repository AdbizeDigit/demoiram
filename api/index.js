import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from '../backend/routes/auth.js'
import chatbotRoutes from '../backend/routes/chatbot.js'
import customChatbotRoutes from '../backend/routes/customChatbot.js'
import agentRoutes from '../backend/routes/agent.js'
import marketplaceRoutes from '../backend/routes/marketplace.js'
import pythonApiRoutes from '../backend/routes/python-api.js'
import { connectDB } from '../backend/config/database.js'
import CustomChatbot from '../backend/models/CustomChatbot.js'

dotenv.config()

const app = express()

// Middleware
app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// Connect to database
connectDB()

// Initialize custom chatbots table
CustomChatbot.initTable().catch(err => console.error('Error initializing custom_chatbots table:', err))

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/chatbot', chatbotRoutes)
app.use('/api/custom-chatbot', customChatbotRoutes)
app.use('/api/agent', agentRoutes)
app.use('/api/marketplace', marketplaceRoutes)
app.use('/python-api', pythonApiRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ message: 'Something went wrong!', error: err.message })
})

// Export the Express app as a serverless function
export default app
