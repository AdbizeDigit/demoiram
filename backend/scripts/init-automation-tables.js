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

async function initAutomationTables() {
  try {
    console.log('🚀 Iniciando creación de tablas de automatización...')

    // 1. Tabla de búsquedas programadas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scheduled_searches (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        location VARCHAR(255) NOT NULL,
        industry VARCHAR(255),
        min_employees INTEGER,
        max_employees INTEGER,
        schedule VARCHAR(50) NOT NULL,
        cron_expression VARCHAR(100) NOT NULL,
        min_lead_score INTEGER DEFAULT 70,
        enabled BOOLEAN DEFAULT true,
        notify_email VARCHAR(255),
        webhook_url TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `)
    console.log('✅ Tabla scheduled_searches creada')

    // 2. Tabla de ejecuciones de búsquedas programadas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scheduled_search_runs (
        id SERIAL PRIMARY KEY,
        scheduled_search_id INTEGER NOT NULL REFERENCES scheduled_searches(id) ON DELETE CASCADE,
        total_results INTEGER DEFAULT 0,
        qualified_leads INTEGER DEFAULT 0,
        run_date TIMESTAMP DEFAULT NOW(),
        error TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)
    console.log('✅ Tabla scheduled_search_runs creada')

    // 3. Tabla de seguimiento de leads
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lead_tracking (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        lead_id VARCHAR(255),
        lead_data JSONB NOT NULL,
        sequence_type VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP
      )
    `)
    console.log('✅ Tabla lead_tracking creada')

    // 4. Tabla de acciones de seguimiento
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tracking_actions (
        id SERIAL PRIMARY KEY,
        tracking_id INTEGER NOT NULL REFERENCES lead_tracking(id) ON DELETE CASCADE,
        action_type VARCHAR(50) NOT NULL,
        subject VARCHAR(255),
        scheduled_date TIMESTAMP NOT NULL,
        completed_date TIMESTAMP,
        status VARCHAR(50) DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)
    console.log('✅ Tabla tracking_actions creada')

    // 5. Tabla de emails generados
    await pool.query(`
      CREATE TABLE IF NOT EXISTS generated_emails (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        lead_data JSONB,
        email_type VARCHAR(50),
        subject VARCHAR(255),
        body TEXT,
        used BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)
    console.log('✅ Tabla generated_emails creada')

    // 6. Tabla de configuración de notificaciones
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notification_settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        channels JSONB NOT NULL,
        criteria JSONB,
        enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)
    console.log('✅ Tabla notification_settings creada')

    // 7. Tabla de webhooks
    await pool.query(`
      CREATE TABLE IF NOT EXISTS webhooks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        url TEXT NOT NULL,
        events JSONB NOT NULL,
        enabled BOOLEAN DEFAULT true,
        secret VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)
    console.log('✅ Tabla webhooks creada')

    // 8. Tabla de logs de webhooks
    await pool.query(`
      CREATE TABLE IF NOT EXISTS webhook_logs (
        id SERIAL PRIMARY KEY,
        webhook_id INTEGER NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
        event VARCHAR(100),
        status VARCHAR(50),
        error TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)
    console.log('✅ Tabla webhook_logs creada')

    // 9. Tabla de métricas en tiempo real
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lead_metrics (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        metric_date DATE DEFAULT CURRENT_DATE,
        total_leads INTEGER DEFAULT 0,
        hot_leads INTEGER DEFAULT 0,
        warm_leads INTEGER DEFAULT 0,
        cold_leads INTEGER DEFAULT 0,
        emails_sent INTEGER DEFAULT 0,
        emails_opened INTEGER DEFAULT 0,
        emails_replied INTEGER DEFAULT 0,
        meetings_scheduled INTEGER DEFAULT 0,
        deals_closed INTEGER DEFAULT 0,
        revenue DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, metric_date)
      )
    `)
    console.log('✅ Tabla lead_metrics creada')

    // 10. Tabla de campañas automáticas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS auto_campaigns (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'draft',
        target_criteria JSONB,
        email_templates JSONB,
        schedule JSONB,
        stats JSONB,
        enabled BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        started_at TIMESTAMP,
        completed_at TIMESTAMP
      )
    `)
    console.log('✅ Tabla auto_campaigns creada')

    // 11. Tabla de leads capturados
    await pool.query(`
      CREATE TABLE IF NOT EXISTS captured_leads (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        source_type VARCHAR(100),
        source_id VARCHAR(255),
        lead_data JSONB NOT NULL,
        lead_score INTEGER,
        lead_quality VARCHAR(50),
        status VARCHAR(50) DEFAULT 'new',
        assigned_to INTEGER REFERENCES users(id),
        last_contact_date TIMESTAMP,
        next_action_date TIMESTAMP,
        notes TEXT,
        tags JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `)
    console.log('✅ Tabla captured_leads creada')

    // 12. Tabla de interacciones con leads
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lead_interactions (
        id SERIAL PRIMARY KEY,
        lead_id INTEGER NOT NULL REFERENCES captured_leads(id) ON DELETE CASCADE,
        interaction_type VARCHAR(50) NOT NULL,
        channel VARCHAR(50),
        subject VARCHAR(255),
        content TEXT,
        outcome VARCHAR(100),
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)
    console.log('✅ Tabla lead_interactions creada')

    // 13. Tabla de templates de email
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        subject VARCHAR(500) NOT NULL,
        body TEXT NOT NULL,
        category VARCHAR(100) DEFAULT 'general',
        variables JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `)
    console.log('✅ Tabla email_templates creada')

    // 14. Tabla de análisis de IA
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_lead_analysis (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        lead_id INTEGER REFERENCES captured_leads(id) ON DELETE CASCADE,
        lead_data JSONB,
        analysis TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)
    console.log('✅ Tabla ai_lead_analysis creada')

    // 15. Tabla de jobs de re-enriquecimiento
    await pool.query(`
      CREATE TABLE IF NOT EXISTS auto_enrichment_jobs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        frequency VARCHAR(50) NOT NULL,
        criteria JSONB,
        enabled BOOLEAN DEFAULT true,
        last_run TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)
    console.log('✅ Tabla auto_enrichment_jobs creada')

    // Crear índices para optimización
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_scheduled_searches_user
      ON scheduled_searches(user_id);

      CREATE INDEX IF NOT EXISTS idx_scheduled_searches_enabled
      ON scheduled_searches(enabled);

      CREATE INDEX IF NOT EXISTS idx_tracking_actions_status
      ON tracking_actions(status, scheduled_date);

      CREATE INDEX IF NOT EXISTS idx_captured_leads_user
      ON captured_leads(user_id);

      CREATE INDEX IF NOT EXISTS idx_captured_leads_status
      ON captured_leads(status);

      CREATE INDEX IF NOT EXISTS idx_captured_leads_quality
      ON captured_leads(lead_quality);

      CREATE INDEX IF NOT EXISTS idx_lead_metrics_date
      ON lead_metrics(user_id, metric_date);

      CREATE INDEX IF NOT EXISTS idx_email_templates_user
      ON email_templates(user_id, category);

      CREATE INDEX IF NOT EXISTS idx_ai_analysis_lead
      ON ai_lead_analysis(lead_id);
    `)
    console.log('✅ Índices creados')

    console.log('✅ ¡Todas las tablas de automatización creadas exitosamente!')
  } catch (error) {
    console.error('❌ Error creando tablas de automatización:', error)
    throw error
  } finally {
    await pool.end()
  }
}

initAutomationTables()
