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

  // ─── Email tracking (aperturas via pixel invisible) ─────────────────────────
  await pool.query(`CREATE TABLE IF NOT EXISTS seller_email_opens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tracking_id UUID NOT NULL,
    message_id UUID,
    lead_id UUID,
    opened_at TIMESTAMP DEFAULT NOW(),
    user_agent TEXT,
    ip TEXT
  )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_email_opens_tracking ON seller_email_opens(tracking_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_email_opens_message ON seller_email_opens(message_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_email_opens_lead ON seller_email_opens(lead_id)`);
  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE outreach_messages ADD COLUMN IF NOT EXISTS tracking_id UUID;
    EXCEPTION WHEN undefined_table THEN NULL; END $$;
  `);

  // ─── Booking / agenda del vendedor ──────────────────────────────────────────
  await pool.query(`CREATE TABLE IF NOT EXISTS seller_booking_settings (
    seller_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    slug VARCHAR(64) UNIQUE,
    title TEXT DEFAULT 'Agendar reunión',
    description TEXT,
    duration_min INTEGER DEFAULT 30,
    buffer_min INTEGER DEFAULT 15,
    -- working hours por dia: { "1": [{"start":"09:00","end":"18:00"}], "2": [...], ... } (1=lun..7=dom)
    weekly_hours JSONB DEFAULT '{"1":[{"start":"09:00","end":"18:00"}],"2":[{"start":"09:00","end":"18:00"}],"3":[{"start":"09:00","end":"18:00"}],"4":[{"start":"09:00","end":"18:00"}],"5":[{"start":"09:00","end":"18:00"}]}'::jsonb,
    timezone VARCHAR(64) DEFAULT 'America/Argentina/Buenos_Aires',
    active BOOLEAN DEFAULT true,
    updated_at TIMESTAMP DEFAULT NOW()
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS seller_meetings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lead_id UUID,
    guest_name TEXT,
    guest_email TEXT,
    guest_phone TEXT,
    starts_at TIMESTAMP NOT NULL,
    ends_at TIMESTAMP NOT NULL,
    duration_min INTEGER,
    notes TEXT,
    status VARCHAR(30) DEFAULT 'CONFIRMED',
    created_at TIMESTAMP DEFAULT NOW()
  )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_meetings_seller ON seller_meetings(seller_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_meetings_starts ON seller_meetings(starts_at)`);

  // ─── Secuencias de follow-up multi-step ─────────────────────────────────────
  await pool.query(`CREATE TABLE IF NOT EXISTS seller_sequences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    seller_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    -- steps: [{ step:1, channel:'EMAIL', delay_days:0, subject:'...', body:'...' }, ...]
    steps JSONB DEFAULT '[]'::jsonb,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_sequences_seller ON seller_sequences(seller_id)`);

  await pool.query(`CREATE TABLE IF NOT EXISTS seller_sequence_runs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sequence_id UUID NOT NULL REFERENCES seller_sequences(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL,
    seller_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    current_step INTEGER DEFAULT 0,
    status VARCHAR(30) DEFAULT 'ACTIVE',
    next_run_at TIMESTAMP,
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    stopped_reason TEXT
  )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_seq_runs_active ON seller_sequence_runs(status, next_run_at)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_seq_runs_lead ON seller_sequence_runs(lead_id)`);

  // ─── Battlecards de competidores ───────────────────────────────────────────
  await pool.query(`CREATE TABLE IF NOT EXISTS seller_battlecards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    competitor_name VARCHAR(120) NOT NULL,
    aliases TEXT[],
    -- differentiators: [{ point: "...", proof: "..." }, ...]
    differentiators JSONB DEFAULT '[]'::jsonb,
    objection_responses JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_battlecards_active ON seller_battlecards(active)`);

  // ─── Alertas contextuales ──────────────────────────────────────────────────
  await pool.query(`CREATE TABLE IF NOT EXISTS seller_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lead_id UUID,
    type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) DEFAULT 'info',
    title TEXT NOT NULL,
    message TEXT,
    payload JSONB,
    read BOOLEAN DEFAULT false,
    dismissed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
  )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_alerts_seller_unread ON seller_alerts(seller_id, read, dismissed)`);

  // ─── Chat threads del asistente IA ─────────────────────────────────────────
  await pool.query(`CREATE TABLE IF NOT EXISTS seller_chat_threads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lead_id UUID,
    -- messages: [{ role: "user|assistant", content: "...", at: "..." }, ...]
    messages JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_chat_seller_lead ON seller_chat_threads(seller_id, lead_id)`);

  // ─── Propuestas generadas con IA ───────────────────────────────────────────
  await pool.query(`CREATE TABLE IF NOT EXISTS seller_proposals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    seller_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    lead_id UUID,
    title TEXT,
    body_html TEXT,
    body_md TEXT,
    pricing JSONB,
    status VARCHAR(30) DEFAULT 'DRAFT',
    sent_at TIMESTAMP,
    tracking_id UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_proposals_seller ON seller_proposals(seller_id)`);
  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE seller_proposals ADD COLUMN IF NOT EXISTS tracking_id UUID;
    EXCEPTION WHEN undefined_table THEN NULL; END $$;
  `);

  // ─── Knowledge base interna (casos, FAQs, scripts) ─────────────────────────
  await pool.query(`CREATE TABLE IF NOT EXISTS seller_knowledge_docs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    doc_type VARCHAR(40) DEFAULT 'general',
    tags TEXT[],
    sector VARCHAR(80),
    active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_kb_active ON seller_knowledge_docs(active)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_kb_sector ON seller_knowledge_docs(sector)`);

  // ─── Templates / snippets de mensaje ────────────────────────────────────────
  await pool.query(`CREATE TABLE IF NOT EXISTS seller_message_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    seller_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    shortcut VARCHAR(40),
    name TEXT,
    channel VARCHAR(20) DEFAULT 'EMAIL',
    subject TEXT,
    body TEXT NOT NULL,
    use_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_templates_seller ON seller_message_templates(seller_id)`);

  // ─── Tracking de aperturas de propuestas (similar al email pixel) ───────────
  await pool.query(`CREATE TABLE IF NOT EXISTS seller_proposal_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tracking_id UUID NOT NULL,
    proposal_id UUID,
    lead_id UUID,
    viewed_at TIMESTAMP DEFAULT NOW(),
    duration_seconds INTEGER,
    user_agent TEXT,
    ip TEXT
  )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_proposal_views_tracking ON seller_proposal_views(tracking_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_proposal_views_proposal ON seller_proposal_views(proposal_id)`);

  // ─── Log de reactivación de leads dormidos ──────────────────────────────────
  await pool.query(`CREATE TABLE IF NOT EXISTS seller_reengagement_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL,
    seller_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    generated_message TEXT,
    sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMP,
    response_received BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
  )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_reeng_lead ON seller_reengagement_log(lead_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_reeng_seller ON seller_reengagement_log(seller_id)`);

  console.log('✅ Tablas de vendedor inicializadas (con herramientas avanzadas + extras)');
  await pool.end();
}

init().catch(err => {
  console.error('❌ Error inicializando tablas de vendedor:', err);
  process.exit(1);
});
