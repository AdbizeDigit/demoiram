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

async function addOpportunityDetectionColumn() {
  console.log('>> Adding opportunity_detection_uses column...\n')

  try {
    // Check if column exists
    const checkColumn = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name='users' AND column_name='opportunity_detection_uses'
    `)

    if (checkColumn.rows.length > 0) {
      console.log('>> Column opportunity_detection_uses already exists')
    } else {
      // Add the column
      await pool.query(`
        ALTER TABLE users
        ADD COLUMN opportunity_detection_uses INTEGER DEFAULT 3
      `)
      console.log('>> Column opportunity_detection_uses added successfully')
    }

    // Also rename marketplace_uses if it exists
    const checkMarketplace = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name='users' AND column_name='marketplace_uses'
    `)

    if (checkMarketplace.rows.length > 0) {
      console.log('>> Found marketplace_uses column, will keep it for backward compatibility')
    }

    console.log('\n>> Migration completed successfully!')

  } catch (error) {
    console.error('>> Error during migration:', error.message)
    console.error(error.stack)
  } finally {
    await pool.end()
  }
}

addOpportunityDetectionColumn()
