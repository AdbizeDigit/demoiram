import express from 'express'
import { protect, checkServiceLimit } from '../middleware/auth.js'

const router = express.Router()

// Mock data for demo
const mockBuyers = [
  { name: 'Tech Solutions Inc.', description: 'Empresa de tecnología buscando software de gestión', location: 'Ciudad de México', budget: '$3000 - $8000', matchScore: 95 },
  { name: 'Innovate Corp', description: 'Startup tecnológica en búsqueda de herramientas de automatización', location: 'Guadalajara', budget: '$2000 - $5000', matchScore: 88 },
  { name: 'Digital Ventures', description: 'Agencia digital necesita plataforma de análisis', location: 'Monterrey', budget: '$4000 - $10000', matchScore: 82 },
  { name: 'Global Systems', description: 'Empresa internacional requiere soluciones empresariales', location: 'Querétaro', budget: '$5000 - $15000', matchScore: 76 }
]

const mockSellers = [
  { name: 'DevPro Solutions', description: 'Desarrolladores especializados en software empresarial', location: 'Ciudad de México', budget: '$2500 - $7000', matchScore: 92 },
  { name: 'AI Innovations', description: 'Expertos en inteligencia artificial y machine learning', location: 'Guadalajara', budget: '$3000 - $9000', matchScore: 89 },
  { name: 'Cloud Masters', description: 'Servicios de cloud computing y arquitectura', location: 'Monterrey', budget: '$4000 - $12000', matchScore: 85 },
  { name: 'Data Analytics Pro', description: 'Análisis de datos y business intelligence', location: 'Puebla', budget: '$2000 - $6000', matchScore: 78 }
]

router.post('/search', protect, checkServiceLimit('marketplace'), async (req, res) => {
  try {
    const { type, product, budget, location } = req.body

    if (!product) {
      return res.status(400).json({ error: 'Product is required' })
    }

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Filter and sort results based on search criteria
    let results = type === 'buyers' ? [...mockBuyers] : [...mockSellers]

    // Apply filters
    if (location) {
      results = results.filter(r =>
        r.location.toLowerCase().includes(location.toLowerCase())
      )
    }

    if (budget) {
      // Simple budget matching (in a real app, this would be more sophisticated)
      results = results.filter(r => r.budget)
    }

    // Sort by match score
    results.sort((a, b) => b.matchScore - a.matchScore)

    res.json({
      results,
      total: results.length,
      type,
      query: product,
      remainingUses: req.remainingUses
    })
  } catch (error) {
    console.error('Marketplace search error:', error)
    res.status(500).json({ error: 'Error al buscar en marketplace', details: error.message })
  }
})

export default router
