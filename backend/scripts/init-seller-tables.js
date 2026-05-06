import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function init() {
  // Llamadas registradas por el vendedor (telefónicas)
  await pool.query(`CREATE TABLE IF NOT EXISTS seller_calls (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID,
    seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    duration_seconds INTEGER DEFAULT 0,
    outcome VARCHAR(50),
    notes TEXT,
    next_action TEXT,
    next_action_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
  )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_seller_calls_seller ON seller_calls(seller_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_seller_calls_lead ON seller_calls(lead_id)`);

  // Investigación LinkedIn cacheada por lead
  await pool.query(`CREATE TABLE IF NOT EXISTS seller_linkedin_research (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL,
    seller_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    profile_url TEXT,
    headline TEXT,
    summary TEXT,
    contacts_found JSONB DEFAULT '[]'::jsonb,
    ai_summary TEXT,
    ai_talking_points TEXT,
    raw_data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_linkedin_research_lead ON seller_linkedin_research(lead_id)`);

  // Sugerencias IA generadas para el vendedor (recomendaciones, follow-ups)
  await pool.query(`CREATE TABLE IF NOT EXISTS seller_ai_suggestions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lead_id UUID,
    type VARCHAR(50) NOT NULL,
    title TEXT,
    body TEXT,
    payload JSONB,
    used BOOLEAN DEFAULT false,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
  )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_ai_suggestions_seller ON seller_ai_suggestions(seller_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_ai_suggestions_lead ON seller_ai_suggestions(lead_id)`);

  // Métricas del vendedor (snapshot diario opcional - se puede calcular on the fly también)
  await pool.query(`CREATE TABLE IF NOT EXISTS seller_daily_metrics (
    id SERIAL PRIMARY KEY,
    seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,
    contacted INTEGER DEFAULT 0,
    replied INTEGER DEFAULT 0,
    calls INTEGER DEFAULT 0,
    won INTEGER DEFAULT 0,
    lost INTEGER DEFAULT 0,
    pipeline_value NUMERIC DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(seller_id, metric_date)
  )`);

  // Aseguro la columna assigned_seller_id en leads (sin asignación rígida; los vendedores ven todo,
  // pero pueden auto-asignarse para ownership y tracking de comisión)
  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_seller_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    EXCEPTION WHEN undefined_table THEN NULL; END $$;
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_leads_assigned_seller ON leads(assigned_seller_id)`);

  // Asegurar que la columna role exista y tenga 'user' por defecto
  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
    EXCEPTION WHEN undefined_table THEN NULL; END $$;
  `);

  // Tracking de quién envió cada mensaje (vendedor) — permite filtrar por vendedor
  // en las pantallas de outreach
  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE outreach_messages ADD COLUMN IF NOT EXISTS sent_by_seller_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    EXCEPTION WHEN undefined_table THEN NULL; END $$;
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_outreach_messages_seller ON outreach_messages(sent_by_seller_id)`);

  // Ownership de perfiles LinkedIn — cada vendedor administra solo los suyos
  // (envuelvo todo en un DO $$ porque la tabla puede no existir en algunos entornos)
  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE linkedin_profiles ADD COLUMN IF NOT EXISTS owner_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS idx_linkedin_profiles_owner ON linkedin_profiles(owner_user_id);
    EXCEPTION WHEN undefined_table THEN NULL; END $$;
  `);

  console.log('✅ Tablas de vendedor inicializadas');
  await pool.end();
}

init().catch(err => {
  console.error('❌ Error inicializando tablas de vendedor:', err);
  process.exit(1);
});
