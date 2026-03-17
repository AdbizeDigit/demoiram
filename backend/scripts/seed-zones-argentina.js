import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

const zones = [
  ['Microcentro', 'Buenos Aires', 'CABA'],
  ['Puerto Madero', 'Buenos Aires', 'CABA'],
  ['Palermo', 'Buenos Aires', 'CABA'],
  ['Belgrano', 'Buenos Aires', 'CABA'],
  ['Recoleta', 'Buenos Aires', 'CABA'],
  ['Retiro', 'Buenos Aires', 'CABA'],
  ['Caballito', 'Buenos Aires', 'CABA'],
  ['Vicente Lopez', 'GBA Norte', 'Buenos Aires'],
  ['San Isidro', 'GBA Norte', 'Buenos Aires'],
  ['Tigre', 'GBA Norte', 'Buenos Aires'],
  ['Pilar', 'GBA Norte', 'Buenos Aires'],
  ['Avellaneda', 'GBA Sur', 'Buenos Aires'],
  ['Quilmes', 'GBA Sur', 'Buenos Aires'],
  ['La Plata', 'La Plata', 'Buenos Aires'],
  ['Centro', 'Cordoba', 'Cordoba'],
  ['Nueva Cordoba', 'Cordoba', 'Cordoba'],
  ['Centro', 'Rosario', 'Santa Fe'],
  ['Centro', 'Mendoza', 'Mendoza'],
  ['Centro', 'Tucuman', 'Tucuman'],
  ['Centro', 'Mar del Plata', 'Buenos Aires'],
  ['Centro', 'Salta', 'Salta'],
  ['Centro', 'Neuquen', 'Neuquen'],
  ['Centro', 'Bahia Blanca', 'Buenos Aires'],
  ['Centro', 'San Juan', 'San Juan'],
  ['Centro', 'Santa Fe', 'Santa Fe'],
];

async function run() {
  for (const [name, city, state] of zones) {
    await pool.query(
      'INSERT INTO scraping_zones (name, city, state) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [name, city, state]
    );
  }
  const r = await pool.query('SELECT COUNT(*) FROM scraping_zones');
  console.log(r.rows[0].count + ' zonas de Argentina creadas');
  await pool.end();
}

run();
