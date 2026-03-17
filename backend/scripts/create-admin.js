import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function createAdmin() {
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user'");

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('Admin2025!', salt);

  const res = await pool.query(
    `INSERT INTO users (name, email, password, role)
     VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (email) DO UPDATE SET role = 'admin', password = $3
     RETURNING id, name, email, role`,
    ['Admin Adbize', 'admin@adbize.com', hashedPassword]
  );

  console.log('Usuario admin creado:', res.rows[0]);
  await pool.end();
}

createAdmin();
