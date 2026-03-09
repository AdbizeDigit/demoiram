import pkg from 'pg'
const { Pool } = pkg
import dotenv from 'dotenv'

dotenv.config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
})

async function initAgentTables() {
  console.log('>> Creating agent hierarchy tables...\n')

  try {
    // Create agent_hierarchies table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS agent_hierarchies (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        organization_name VARCHAR(255) NOT NULL,
        description TEXT,
        hierarchy JSONB DEFAULT '{}',
        status VARCHAR(50) DEFAULT 'in_progress',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `)
    console.log('>> Table agent_hierarchies created')

    // Create agent_messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS agent_messages (
        id SERIAL PRIMARY KEY,
        hierarchy_id INTEGER REFERENCES agent_hierarchies(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)
    console.log('>> Table agent_messages created')

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_hierarchies_user_id ON agent_hierarchies(user_id)
    `)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_hierarchy_id ON agent_messages(hierarchy_id)
    `)
    console.log('>> Indexes created')

    console.log('\n>> Agent tables initialized successfully!')

  } catch (error) {
    console.error('>> Error creating agent tables:', error.message)
    console.error(error.stack)
  } finally {
    await pool.end()
  }
}

initAgentTables()
