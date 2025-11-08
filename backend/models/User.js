import bcrypt from 'bcryptjs'
import { pool } from '../config/database.js'

export const User = {
  // Crear un nuevo usuario
  async create({ name, email, password }) {
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    const result = await pool.query(
      `INSERT INTO users (name, email, password)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, chatbot_uses, agent_generator_uses,
                 document_analysis_uses, marketplace_uses, predictor_uses,
                 sentiment_uses, transcription_uses, vision_uses, created_at`,
      [name, email.toLowerCase(), hashedPassword]
    )

    return result.rows[0]
  },

  // Buscar usuario por email
  async findByEmail(email) {
    const result = await pool.query(
      `SELECT * FROM users WHERE email = $1`,
      [email.toLowerCase()]
    )
    return result.rows[0]
  },

  // Buscar usuario por ID
  async findById(id) {
    const result = await pool.query(
      `SELECT id, name, email, chatbot_uses, agent_generator_uses,
              document_analysis_uses, marketplace_uses, predictor_uses,
              sentiment_uses, transcription_uses, vision_uses, created_at
       FROM users WHERE id = $1`,
      [id]
    )
    return result.rows[0]
  },

  // Comparar contraseña
  async comparePassword(candidatePassword, hashedPassword) {
    return await bcrypt.compare(candidatePassword, hashedPassword)
  },

  // Decrementar uso de un servicio
  async decrementServiceUse(userId, serviceName) {
    const columnName = `${serviceName}_uses`
    const result = await pool.query(
      `UPDATE users
       SET ${columnName} = ${columnName} - 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND ${columnName} > 0
       RETURNING ${columnName}`,
      [userId]
    )
    return result.rows[0]
  },

  // Obtener usos restantes de todos los servicios
  async getServiceUsage(userId) {
    const result = await pool.query(
      `SELECT chatbot_uses, agent_generator_uses, document_analysis_uses,
              marketplace_uses, predictor_uses, sentiment_uses,
              transcription_uses, vision_uses
       FROM users WHERE id = $1`,
      [userId]
    )
    return result.rows[0]
  },

  // Verificar si el usuario puede usar un servicio
  async canUseService(userId, serviceName) {
    const columnName = `${serviceName}_uses`
    const result = await pool.query(
      `SELECT ${columnName} FROM users WHERE id = $1`,
      [userId]
    )
    return result.rows[0] && result.rows[0][columnName] > 0
  }
}

export default User
