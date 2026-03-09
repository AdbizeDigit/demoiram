import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function addCustomChatbotColumn() {
  console.log('🔄 Adding custom_chatbot_uses column...\n');

  try {
    // Check if column exists
    const checkColumn = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name = 'custom_chatbot_uses'
    `);

    if (checkColumn.rows.length > 0) {
      console.log('✅ Column custom_chatbot_uses already exists');
    } else {
      // Add the column
      await pool.query(`
        ALTER TABLE users
        ADD COLUMN custom_chatbot_uses INTEGER DEFAULT 3
      `);
      console.log('✅ Column custom_chatbot_uses added successfully');
    }

    // Check if personality and tone columns exist in custom_chatbots
    const checkPersonality = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'custom_chatbots'
      AND column_name = 'personality'
    `);

    if (checkPersonality.rows.length === 0) {
      await pool.query(`
        ALTER TABLE custom_chatbots
        ADD COLUMN personality VARCHAR(100),
        ADD COLUMN tone VARCHAR(100)
      `);
      console.log('✅ Columns personality and tone added to custom_chatbots');
    } else {
      console.log('✅ Columns personality and tone already exist in custom_chatbots');
    }

    // Verify the changes
    const result = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name LIKE '%chatbot%'
      ORDER BY column_name
    `);

    console.log('\n📊 Chatbot-related columns in users table:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type}) DEFAULT ${row.column_default || 'NULL'}`);
    });

    console.log('\n✨ Migration complete!');

  } catch (error) {
    console.error('❌ Error during migration:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

addCustomChatbotColumn();
