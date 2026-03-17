import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function fixUsersTable() {
  const columns = [
    'role VARCHAR(50) DEFAULT \'user\'',
    'chatbot_uses INTEGER DEFAULT 3',
    'custom_chatbot_uses INTEGER DEFAULT 3',
    'agent_generator_uses INTEGER DEFAULT 3',
    'document_analysis_uses INTEGER DEFAULT 3',
    'marketplace_uses INTEGER DEFAULT 3',
    'predictor_uses INTEGER DEFAULT 3',
    'sentiment_uses INTEGER DEFAULT 3',
    'transcription_uses INTEGER DEFAULT 3',
    'vision_uses INTEGER DEFAULT 3',
    'opportunity_detection_uses INTEGER DEFAULT 3',
  ];

  for (const col of columns) {
    const name = col.split(' ')[0];
    try {
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${col}`);
      console.log(`OK: ${name}`);
    } catch (e) {
      console.log(`SKIP: ${name} - ${e.message}`);
    }
  }

  const result = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position");
  console.log('\nAll columns:', result.rows.map(r => r.column_name).join(', '));

  await pool.end();
}

fixUsersTable();
