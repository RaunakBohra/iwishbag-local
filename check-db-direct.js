/**
 * Check database directly using pg client
 */

import pg from 'pg';
const { Client } = pg;

async function checkDatabase() {
  console.log('🔍 Checking Database Directly...');

  const client = new Client({
    host: '127.0.0.1',
    port: 54322,
    database: 'postgres',
    user: 'postgres',
    password: 'postgres',
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Check if our functions exist
    console.log('\n1. Checking if functions exist...');
    const funcResult = await client.query(`
      SELECT routine_name, routine_type 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name IN ('handle_new_user', 'ensure_user_profile_with_oauth', 'extract_oauth_user_info');
    `);

    console.log('Functions found:', funcResult.rows);

    // Check if trigger exists
    console.log('\n2. Checking if trigger exists...');
    const triggerResult = await client.query(`
      SELECT trigger_name, event_manipulation, event_object_table, action_statement
      FROM information_schema.triggers 
      WHERE event_object_schema = 'auth' 
      AND event_object_table = 'users' 
      AND trigger_name = 'on_auth_user_created';
    `);

    if (triggerResult.rows.length > 0) {
      console.log('✅ Trigger found:', triggerResult.rows[0]);
    } else {
      console.log('❌ Trigger "on_auth_user_created" not found');
    }

    // Check profiles table
    console.log('\n3. Checking profiles table...');
    const profileResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'profiles'
      ORDER BY ordinal_position;
    `);

    console.log('Profile columns:', profileResult.rows);

    // Check if we can call the function manually
    console.log('\n4. Testing function call...');
    try {
      const testUserId = '12345678-1234-1234-1234-123456789abc';
      const testResult = await client.query(
        `
        SELECT public.extract_oauth_user_info($1) as result;
      `,
        [
          JSON.stringify({
            name: 'Test User',
            picture: 'https://example.com/avatar.jpg',
          }),
        ],
      );

      console.log('✅ Function call successful:', testResult.rows[0]);
    } catch (funcError) {
      console.log('❌ Function call failed:', funcError.message);
    }
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
  } finally {
    await client.end();
  }
}

checkDatabase();
