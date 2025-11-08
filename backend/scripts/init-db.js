import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function initDatabase() {
  console.log('🔄 Initializing database...\n');

  try {
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,

        -- Contadores de uso para cada servicio (límite: 3 usos cada uno)
        chatbot_uses INTEGER DEFAULT 3,
        agent_generator_uses INTEGER DEFAULT 3,
        document_analysis_uses INTEGER DEFAULT 3,
        marketplace_uses INTEGER DEFAULT 3,
        predictor_uses INTEGER DEFAULT 3,
        sentiment_uses INTEGER DEFAULT 3,
        transcription_uses INTEGER DEFAULT 3,
        vision_uses INTEGER DEFAULT 3,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Users table created/verified');

    // Create custom_chatbots table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS custom_chatbots (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        system_prompt TEXT NOT NULL,
        temperature DECIMAL(2,1) DEFAULT 0.7,
        max_tokens INTEGER DEFAULT 500,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Custom chatbots table created/verified');

    // Verify tables exist
    const tablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);

    console.log('\n📊 Database tables:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    console.log('\n✨ Database initialization complete!');

  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

initDatabase();
