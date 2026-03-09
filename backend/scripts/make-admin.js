import { pool } from '../config/database.js'
import dotenv from 'dotenv'

dotenv.config()

async function makeAdmin(email) {
  try {
    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE email = $2 RETURNING id, name, email, role',
      ['admin', email.toLowerCase()]
    )

    if (result.rows.length === 0) {
      console.log(`❌ Usuario con email ${email} no encontrado`)
      process.exit(1)
    }

    const user = result.rows[0]
    console.log(`✅ Usuario convertido a admin:`)
    console.log(`   ID: ${user.id}`)
    console.log(`   Nombre: ${user.name}`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Rol: ${user.role}`)
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

const email = process.argv[2]
if (!email) {
  console.log('Uso: node make-admin.js <email>')
  console.log('Ejemplo: node make-admin.js admin@example.com')
  process.exit(1)
}

makeAdmin(email)
