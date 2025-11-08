import pkg from 'pg'
const { Pool } = pkg

// Configuración del pool de conexiones PostgreSQL
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
})

export const connectDB = async () => {
  try {
    const client = await pool.connect()
    const result = await client.query('SELECT NOW()')
    console.log(`✅ PostgreSQL Connected: ${result.rows[0].now}`)
    client.release()

    // Inicializar la base de datos
    await initializeDatabase()
  } catch (error) {
    console.error(`❌ Error connecting to PostgreSQL: ${error.message}`)
    console.log('⚠️  Continuando sin conexión a base de datos (modo desarrollo)')
  }
}

// Función para inicializar la base de datos
export const initializeDatabase = async () => {
  try {
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
    `)

    console.log('✅ Database tables initialized')
  } catch (error) {
    console.error(`❌ Error initializing database: ${error.message}`)
  }
}
