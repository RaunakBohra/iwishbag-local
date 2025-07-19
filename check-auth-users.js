/**
 * Check auth.users table structure
 */

import pg from 'pg'
const { Client } = pg

async function checkAuthUsers() {
  console.log('🔍 Checking auth.users table structure...')
  
  const client = new Client({
    host: '127.0.0.1',
    port: 54322,
    database: 'postgres',
    user: 'postgres',
    password: 'postgres'
  })

  try {
    await client.connect()

    // Check auth.users table structure
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'auth' 
      AND table_name = 'users'
      ORDER BY ordinal_position;
    `)
    
    console.log('auth.users columns:')
    result.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`)
    })

    // Check if any users exist
    const userCount = await client.query('SELECT COUNT(*) as count FROM auth.users')
    console.log(`\nTotal users in auth.users: ${userCount.rows[0].count}`)

    // Check existing users structure
    if (parseInt(userCount.rows[0].count) > 0) {
      const sampleUser = await client.query('SELECT * FROM auth.users LIMIT 1')
      console.log('\nSample user structure:')
      console.log(Object.keys(sampleUser.rows[0]))
    }

  } catch (error) {
    console.error('❌ Check failed:', error.message)
  } finally {
    await client.end()
  }
}

checkAuthUsers()