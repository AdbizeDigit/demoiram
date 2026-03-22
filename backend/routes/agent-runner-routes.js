import { Router } from 'express'
import { pool } from '../config/database.js'
import AgentRunnerService from '../services/agent-runner-service.js'
import { analyzeWithDeepSeek } from '../services/deepseek.js'

const router = Router()
const runner = AgentRunnerService.getInstance()

// Init tables on first load
runner.init().catch(err => console.error('[AgentRunner] Init error:', err.message))

// ── CRUD ──────────────────────────────────────────────────────────────────────

// GET / - List all agents
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, av.name as avatar_name, av.photo_url as avatar_photo, av.role as avatar_role
      FROM ai_agents a
      LEFT JOIN avatars av ON a.avatar_id = av.id
      ORDER BY a.created_at DESC
    `)
    res.json({ success: true, agents: result.rows })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// GET /:id - Get single agent
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, av.name as avatar_name, av.photo_url as avatar_photo, av.role as avatar_role
      FROM ai_agents a
      LEFT JOIN avatars av ON a.avatar_id = av.id
      WHERE a.id = $1
    `, [req.params.id])
    if (!result.rows.length) return res.status(404).json({ success: false, error: 'Agente no encontrado' })
    res.json({ success: true, agent: result.rows[0] })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// POST / - Create agent
router.post('/', async (req, res) => {
  try {
    const { name, avatar_id, target_type, search_keywords, strategy, channels, max_contacts_per_run } = req.body
    if (!name || !target_type) {
      return res.status(400).json({ success: false, error: 'name y target_type son requeridos' })
    }
    const result = await pool.query(
      `INSERT INTO ai_agents (name, avatar_id, target_type, search_keywords, strategy, channels, max_contacts_per_run)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        name,
        avatar_id || null,
        target_type,
        search_keywords || [],
        strategy || '',
        channels || ['email', 'whatsapp'],
        max_contacts_per_run || 10,
      ]
    )
    res.json({ success: true, agent: result.rows[0] })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// PUT /:id - Update agent
router.put('/:id', async (req, res) => {
  try {
    const { name, avatar_id, target_type, search_keywords, strategy, channels, max_contacts_per_run } = req.body
    const result = await pool.query(
      `UPDATE ai_agents SET
        name = COALESCE($1, name),
        avatar_id = $2,
        target_type = COALESCE($3, target_type),
        search_keywords = COALESCE($4, search_keywords),
        strategy = COALESCE($5, strategy),
        channels = COALESCE($6, channels),
        max_contacts_per_run = COALESCE($7, max_contacts_per_run),
        updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [name, avatar_id || null, target_type, search_keywords, strategy, channels, max_contacts_per_run, req.params.id]
    )
    if (!result.rows.length) return res.status(404).json({ success: false, error: 'No encontrado' })
    res.json({ success: true, agent: result.rows[0] })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// DELETE /:id - Delete agent
router.delete('/:id', async (req, res) => {
  try {
    // Stop if running
    runner.stopAgent(req.params.id).catch(() => {})
    await pool.query('DELETE FROM ai_agents WHERE id = $1', [req.params.id])
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ── Controls ──────────────────────────────────────────────────────────────────

// POST /:id/start - Start agent
router.post('/:id/start', async (req, res) => {
  try {
    const result = await runner.startAgent(req.params.id)
    res.json(result)
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// POST /:id/stop - Stop agent
router.post('/:id/stop', async (req, res) => {
  try {
    const result = await runner.stopAgent(req.params.id)
    res.json(result)
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ── Activity Logs ─────────────────────────────────────────────────────────────

// GET /:id/activity - Get activity logs (with polling support)
router.get('/:id/activity', async (req, res) => {
  try {
    const { since, limit } = req.query
    let query = 'SELECT * FROM agent_activity_logs WHERE agent_id = $1'
    const params = [req.params.id]

    if (since) {
      query += ' AND created_at > $2'
      params.push(since)
    }

    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1)
    params.push(parseInt(limit) || 50)

    const result = await pool.query(query, params)
    res.json({ success: true, logs: result.rows })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// GET /avatars/list - Get available avatars for assignment
router.get('/avatars/list', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, role, photo_url FROM avatars WHERE is_active = true ORDER BY name')
    res.json({ success: true, avatars: result.rows })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// POST /ai-autocomplete - AI fills agent form from natural language description
router.post('/ai-autocomplete', async (req, res) => {
  try {
    const { prompt, current_form } = req.body
    if (!prompt) return res.status(400).json({ success: false, error: 'prompt requerido' })

    // Get available avatars for context
    let avatarsList = []
    try {
      const avRes = await pool.query('SELECT id, name, role FROM avatars WHERE is_active = true ORDER BY name')
      avatarsList = avRes.rows
    } catch {}

    const avatarsContext = avatarsList.length > 0
      ? `Avatares disponibles (usa el id exacto):\n${avatarsList.map(a => `- id: "${a.id}" → ${a.name} (${a.role})`).join('\n')}`
      : 'No hay avatares disponibles, deja avatar_id vacio.'

    const systemPrompt = `Eres un asistente que configura agentes autonomos de venta para Adbize, empresa de desarrollo de software e IA en Mexico.

Servicios de Adbize: desarrollo web, apps moviles, IA/Machine Learning, chatbots con LLM, automatizacion, ecommerce, SaaS.

El usuario te describe lo que quiere y tu completas el formulario del agente.

${avatarsContext}

Tipos de objetivo validos: business_owners, celebrities, politicians, startups, enterprises

Formulario actual: ${JSON.stringify(current_form || {})}

Responde SOLO con JSON valido (sin markdown, sin backticks):
{
  "name": "nombre del agente",
  "avatar_id": "id del avatar o vacio",
  "target_type": "uno de los tipos validos",
  "search_keywords": "keyword1, keyword2, keyword3",
  "strategy": "descripcion de la estrategia",
  "max_contacts_per_run": numero,
  "ai_message": "mensaje corto explicando lo que configuraste"
}`

    const response = await analyzeWithDeepSeek(
      `${systemPrompt}\n\nEl usuario dice: "${prompt}"`
    )

    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return res.json({ success: true, ai_message: response, form: {} })
    }

    const parsed = JSON.parse(jsonMatch[0])
    res.json({ success: true, ...parsed, form: parsed })
  } catch (error) {
    console.error('[AI Autocomplete] Error:', error.message)
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
