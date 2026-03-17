import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from 'bcryptjs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function createAdmin() {
  try {
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user'");

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('Admin2025!', salt);

    const res = await pool.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, 'admin')
       ON CONFLICT (email) DO UPDATE SET role = 'admin', password = $3
       RETURNING id, name, email, role`,
      ['Admin Adbize', 'admin@adbize.com', hash]
    );
    console.log('Admin created:', JSON.stringify(res.rows[0]));

    const res2 = await pool.query(
      "UPDATE users SET role = 'admin' WHERE email = 'contacto@adbize.com' RETURNING id, name, email, role"
    );
    if (res2.rows.length > 0) {
      console.log('Also admin:', JSON.stringify(res2.rows[0]));
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

createAdmin();
