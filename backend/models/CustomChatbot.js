import { pool } from '../config/database.js'

export const CustomChatbot = {
  // Crear una nueva tabla de chatbots si no existe
  async initTable() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS custom_chatbots (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        system_prompt TEXT NOT NULL,
        temperature DECIMAL(2, 1) DEFAULT 0.7,
        max_tokens INTEGER DEFAULT 500,
        personality VARCHAR(100),
        tone VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_custom_chatbots_user_id ON custom_chatbots(user_id);
    `)
  },

  // Crear un nuevo chatbot personalizado
  async create({ userId, name, description, systemPrompt, temperature, maxTokens, personality, tone }) {
    const result = await pool.query(
      `INSERT INTO custom_chatbots (user_id, name, description, system_prompt, temperature, max_tokens, personality, tone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, user_id, name, description, system_prompt, temperature, max_tokens, personality, tone, created_at, updated_at`,
      [userId, name, description, systemPrompt, temperature || 0.7, maxTokens || 500, personality, tone]
    )
    return result.rows[0]
  },

  // Obtener todos los chatbots de un usuario
  async findByUserId(userId) {
    const result = await pool.query(
      `SELECT id, user_id, name, description, system_prompt, temperature, max_tokens, personality, tone, created_at, updated_at
       FROM custom_chatbots
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    )
    return result.rows
  },

  // Contar los chatbots de un usuario
  async countByUserId(userId) {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM custom_chatbots WHERE user_id = $1`,
      [userId]
    )
    return parseInt(result.rows[0].count)
  },

  // Obtener un chatbot por ID
  async findById(id, userId) {
    const result = await pool.query(
      `SELECT id, user_id, name, description, system_prompt, temperature, max_tokens, personality, tone, created_at, updated_at
       FROM custom_chatbots
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    )
    return result.rows[0]
  },

  // Actualizar un chatbot
  async update(id, userId, updates) {
    const { name, description, systemPrompt, temperature, maxTokens, personality, tone } = updates

    const result = await pool.query(
      `UPDATE custom_chatbots
       SET name = COALESCE($3, name),
           description = COALESCE($4, description),
           system_prompt = COALESCE($5, system_prompt),
           temperature = COALESCE($6, temperature),
           max_tokens = COALESCE($7, max_tokens),
           personality = COALESCE($8, personality),
           tone = COALESCE($9, tone),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2
       RETURNING id, user_id, name, description, system_prompt, temperature, max_tokens, personality, tone, created_at, updated_at`,
      [id, userId, name, description, systemPrompt, temperature, maxTokens, personality, tone]
    )
    return result.rows[0]
  },

  // Eliminar un chatbot
  async delete(id, userId) {
    const result = await pool.query(
      `DELETE FROM custom_chatbots
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [id, userId]
    )
    return result.rows[0]
  }
}

export default CustomChatbot
