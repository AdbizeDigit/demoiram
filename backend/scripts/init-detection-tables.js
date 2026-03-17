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

async function initDetectionTables() {
  console.log('🔄 Initializing detection engine tables...\n');

  try {
    // Create detection_sources table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS detection_sources (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        type VARCHAR(50) NOT NULL,
        config JSONB DEFAULT '{}',
        enabled BOOLEAN DEFAULT true,
        last_run_at TIMESTAMP,
        last_run_articles INTEGER DEFAULT 0,
        last_run_error TEXT,
        total_articles INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ detection_sources table created/verified');

    // Create news_articles table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS news_articles (
        id SERIAL PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        url TEXT UNIQUE NOT NULL,
        snippet TEXT,
        content TEXT,
        source_name VARCHAR(255),
        source_type VARCHAR(50),
        published_at TIMESTAMP,
        fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        analyzed BOOLEAN DEFAULT false,
        relevance_score INTEGER,
        opportunity_type VARCHAR(100),
        ai_summary TEXT,
        company_mentioned VARCHAR(255),
        location_mentioned VARCHAR(255),
        priority VARCHAR(20),
        opportunity_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ news_articles table created/verified');

    // Create detected_opportunities table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS detected_opportunities (
        id SERIAL PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        summary TEXT,
        relevance_score INTEGER DEFAULT 0,
        opportunity_type VARCHAR(100),
        priority VARCHAR(20) DEFAULT 'MEDIA',
        status VARCHAR(50) DEFAULT 'NEW',
        company_mentioned VARCHAR(255),
        location_mentioned VARCHAR(255),
        estimated_value DECIMAL,
        contact_info TEXT,
        admin_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ detected_opportunities table created/verified');

    // Create detection_scan_logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS detection_scan_logs (
        id SERIAL PRIMARY KEY,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        status VARCHAR(50) DEFAULT 'RUNNING',
        sources_scanned INTEGER DEFAULT 0,
        articles_found INTEGER DEFAULT 0,
        opportunities_created INTEGER DEFAULT 0,
        error_message TEXT
      )
    `);
    console.log('✅ detection_scan_logs table created/verified');

    // Seed default sources
    const defaultSources = [
      {
        name: 'El Financiero RSS',
        type: 'RSS',
        config: JSON.stringify({ url: 'https://www.elfinanciero.com.mx/arc/outboundfeeds/rss/' })
      },
      {
        name: 'Expansión RSS',
        type: 'RSS',
        config: JSON.stringify({ url: 'https://expansion.mx/rss' })
      },
      {
        name: 'El Economista RSS',
        type: 'RSS',
        config: JSON.stringify({ url: 'https://www.eleconomista.com.mx/rss/empresas.xml' })
      },
      {
        name: 'DuckDuckGo Search',
        type: 'DUCKDUCKGO',
        config: JSON.stringify({
          keywords: [
            'licitacion mobiliario oficina mexico',
            'nearshoring mexico oficinas nuevas',
            'expansion corporativa mexico'
          ]
        })
      }
    ];

    for (const source of defaultSources) {
      await pool.query(
        `INSERT INTO detection_sources (name, type, config)
         VALUES ($1, $2, $3)
         ON CONFLICT (name) DO NOTHING`,
        [source.name, source.type, source.config]
      );
    }
    console.log('✅ Default sources seeded');

    // Verify tables exist
    const tablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('detection_sources', 'news_articles', 'detected_opportunities', 'detection_scan_logs')
    `);

    console.log('\n📊 Detection tables:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    // Show seeded sources
    const sourcesResult = await pool.query('SELECT name, type, enabled FROM detection_sources');
    console.log('\n📡 Detection sources:');
    sourcesResult.rows.forEach(row => {
      console.log(`  - ${row.name} (${row.type}) ${row.enabled ? '✅' : '❌'}`);
    });

    console.log('\n✨ Detection engine tables initialization complete!');

  } catch (error) {
    console.error('❌ Error initializing detection tables:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

initDetectionTables();
