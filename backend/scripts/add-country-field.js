import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function migrate() {
  // Add country to leads
  await pool.query('ALTER TABLE leads ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT \'Argentina\'');
  console.log('Added country column to leads');

  // Add country to scraping_zones
  await pool.query('ALTER TABLE scraping_zones ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT \'Argentina\'');
  console.log('Added country column to scraping_zones');

  // Update existing leads with country = Argentina (since all current zones are Argentine)
  const r1 = await pool.query("UPDATE leads SET country = 'Argentina' WHERE country IS NULL OR country = ''");
  console.log(`Updated ${r1.rowCount} leads with country = Argentina`);

  // Update existing zones with country = Argentina
  const r2 = await pool.query("UPDATE scraping_zones SET country = 'Argentina' WHERE country IS NULL OR country = ''");
  console.log(`Updated ${r2.rowCount} zones with country = Argentina`);

  await pool.end();
  console.log('Migration complete');
}

migrate();
