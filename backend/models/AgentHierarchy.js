import { pool } from '../config/database.js'

class AgentHierarchy {
  // Create a new agent hierarchy session
  static async createSession(userId, organizationName, description) {
    const result = await pool.query(
      `INSERT INTO agent_hierarchies (user_id, organization_name, description, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING *`,
      [userId, organizationName, description]
    )
    return result.rows[0]
  }

  // Get all sessions for a user
  static async findByUserId(userId) {
    const result = await pool.query(
      `SELECT * FROM agent_hierarchies
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    )
    return result.rows
  }

  // Get a specific session
  static async findById(id, userId) {
    const result = await pool.query(
      `SELECT * FROM agent_hierarchies
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    )
    return result.rows[0]
  }

  // Update session
  static async update(id, userId, data) {
    const { organizationName, description, hierarchy, status } = data

    const result = await pool.query(
      `UPDATE agent_hierarchies
       SET organization_name = COALESCE($3, organization_name),
           description = COALESCE($4, description),
           hierarchy = COALESCE($5, hierarchy),
           status = COALESCE($6, status),
           updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId, organizationName, description, hierarchy, status]
    )
    return result.rows[0]
  }

  // Delete session
  static async delete(id, userId) {
    const result = await pool.query(
      `DELETE FROM agent_hierarchies
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId]
    )
    return result.rows[0]
  }

  // Save conversation message
  static async saveMessage(hierarchyId, role, content) {
    const result = await pool.query(
      `INSERT INTO agent_messages (hierarchy_id, role, content, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING *`,
      [hierarchyId, role, content]
    )
    return result.rows[0]
  }

  // Get conversation history
  static async getMessages(hierarchyId) {
    const result = await pool.query(
      `SELECT * FROM agent_messages
       WHERE hierarchy_id = $1
       ORDER BY created_at ASC`,
      [hierarchyId]
    )
    return result.rows
  }
}

export default AgentHierarchy
