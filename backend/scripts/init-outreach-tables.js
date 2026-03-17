import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function init() {
  await pool.query(`CREATE TABLE IF NOT EXISTS outreach_campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'DRAFT',
    channel VARCHAR(50) DEFAULT 'EMAIL',
    total_leads INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    opened_count INTEGER DEFAULT 0,
    replied_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS outreach_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID,
    campaign_id UUID,
    channel VARCHAR(50),
    step INTEGER DEFAULT 1,
    subject TEXT,
    body TEXT,
    ai_generated BOOLEAN DEFAULT true,
    status VARCHAR(50) DEFAULT 'PENDING',
    sent_at TIMESTAMP,
    opened_at TIMESTAMP,
    replied_at TIMESTAMP,
    error_message TEXT,
    scheduled_for TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS outreach_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255),
    channel VARCHAR(50),
    step_type VARCHAR(50),
    sector VARCHAR(100),
    subject_template TEXT,
    body_template TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )`);

  // Add ai_report column to leads if missing
  await pool.query('ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_report TEXT');
  await pool.query('ALTER TABLE leads ADD COLUMN IF NOT EXISTS report_generated_at TIMESTAMP');

  console.log('Outreach tables + lead report columns created');
  await pool.end();
}

init();
