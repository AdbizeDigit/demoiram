import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function reset() {
  // Reset leads
  const r1 = await pool.query('DELETE FROM leads');
  console.log(`Leads eliminados: ${r1.rowCount}`);

  // Reset scraping jobs
  const r2 = await pool.query('DELETE FROM scraping_jobs');
  console.log(`Jobs eliminados: ${r2.rowCount}`);

  // Reset zones to PENDING
  const r3 = await pool.query("UPDATE scraping_zones SET status = 'PENDING', total_leads = 0");
  console.log(`Zonas reseteadas: ${r3.rowCount}`);

  // Reset detection data
  const r4 = await pool.query('DELETE FROM detected_opportunities');
  console.log(`Oportunidades eliminadas: ${r4.rowCount}`);

  const r5 = await pool.query('DELETE FROM news_articles');
  console.log(`Articulos eliminados: ${r5.rowCount}`);

  const r6 = await pool.query('DELETE FROM detection_scan_logs');
  console.log(`Scan logs eliminados: ${r6.rowCount}`);

  // Reset sources stats
  await pool.query("UPDATE detection_sources SET last_run_at = NULL, last_run_articles = 0, last_run_error = NULL, total_articles = 0");
  console.log('Fuentes reseteadas');

  console.log('\nTodo limpio. Listo para escanear de nuevo.');
  await pool.end();
}

reset();
