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
        role VARCHAR(50) DEFAULT 'user',

        -- Contadores de uso para cada servicio (límite: 3 usos cada uno)
        chatbot_uses INTEGER DEFAULT 3,
        agent_generator_uses INTEGER DEFAULT 3,
        document_analysis_uses INTEGER DEFAULT 3,
        opportunity_detection_uses INTEGER DEFAULT 3,
        predictor_uses INTEGER DEFAULT 3,
        sentiment_uses INTEGER DEFAULT 3,
        transcription_uses INTEGER DEFAULT 3,
        vision_uses INTEGER DEFAULT 3,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Tabla de empresas para scrapping
    await pool.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY,
        company_name VARCHAR(255) NOT NULL,
        website VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(20),
        location VARCHAR(255),
        country VARCHAR(100),
        latitude DECIMAL(10, 6),
        longitude DECIMAL(10, 6),
        industry VARCHAR(100),
        description TEXT,
        search_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(company_name, country)
      )
    `)

    // Tabla PAC 3.0: Prospectos rastreados
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pac_prospects (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER NOT NULL REFERENCES users(id),
        company_name VARCHAR(255) NOT NULL,
        website VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(20),
        location VARCHAR(255),
        country VARCHAR(100),
        latitude DECIMAL(10, 6),
        longitude DECIMAL(10, 6),
        industry VARCHAR(100),
        description TEXT,
        source VARCHAR(100),
        status VARCHAR(50) DEFAULT 'new',
        ai_score DECIMAL(3, 2),
        ai_analysis TEXT,
        contact_name VARCHAR(255),
        contact_role VARCHAR(255),
        contact_email VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Tabla PAC 3.0: Secuencias de email
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pac_email_sequences (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER NOT NULL REFERENCES users(id),
        prospect_id INTEGER NOT NULL REFERENCES pac_prospects(id),
        sequence_number INTEGER,
        email_subject VARCHAR(255),
        email_body TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        sent_at TIMESTAMP,
        response_status VARCHAR(50),
        response_text TEXT,
        response_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Tabla PAC 3.0: Análisis IA
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pac_ai_analysis (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER NOT NULL REFERENCES users(id),
        prospect_id INTEGER NOT NULL REFERENCES pac_prospects(id),
        analysis_type VARCHAR(100),
        classification VARCHAR(100),
        thesis_versions TEXT,
        key_contacts TEXT,
        email_suggestions TEXT,
        sentiment_score DECIMAL(3, 2),
        confidence_score DECIMAL(3, 2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Tabla PAC 3.0: Monitoreo en tiempo real
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pac_monitoring (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER NOT NULL REFERENCES users(id),
        event_type VARCHAR(100),
        event_description TEXT,
        status VARCHAR(50),
        prospect_id INTEGER REFERENCES pac_prospects(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    console.log('✅ Database tables initialized')
  } catch (error) {
    console.error(`❌ Error initializing database: ${error.message}`)
  }
}
