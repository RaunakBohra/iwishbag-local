/**
 * Bypass Supabase client and test user creation directly
 */

import pg from 'pg'
const { Client } = pg

async function bypassSupabaseTest() {
  console.log('🧪 Testing User Creation by Bypassing Supabase Client...')
  
  const client = new Client({
    host: '127.0.0.1',
    port: 54322,
    database: 'postgres',
    user: 'postgres',
    password: 'postgres'
  })

  try {
    await client.connect()

    // Test 1: Disable the trigger temporarily and test user creation
    console.log('\n1. Temporarily disabling trigger...')
    
    await client.query('DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users')
    console.log('✅ Trigger disabled')

    // Test 2: Try creating a user directly in auth.users
    console.log('\n2. Creating user directly in auth.users...')
    
    const testUserId = 'a1b2c3d4-e5f6-7890-1234-' + Date.now().toString().slice(-12)
    const testEmail = `bypass-test-${Date.now()}@example.com`
    
    const userResult = await client.query(`
      INSERT INTO auth.users (
        id, 
        email, 
        raw_user_meta_data,
        email_confirmed_at,
        created_at,
        updated_at,
        aud,
        role,
        is_sso_user,
        is_anonymous
      ) VALUES ($1, $2, $3, NOW(), NOW(), NOW(), 'authenticated', 'authenticated', false, false)
      RETURNING id, email;
    `, [testUserId, testEmail, JSON.stringify({
      name: 'Bypass Test User',
      email: testEmail
    })])

    console.log('✅ User created directly:', userResult.rows[0])

    // Test 3: Manually create profile and role
    console.log('\n3. Manually creating profile and role...')
    
    try {
      // Create profile
      await client.query(`
        INSERT INTO profiles (id, full_name, created_at, updated_at)
        VALUES ($1, $2, NOW(), NOW())
      `, [testUserId, 'Bypass Test User'])
      
      console.log('✅ Profile created manually')

      // Create role
      await client.query(`
        INSERT INTO user_roles (user_id, role, created_by, is_active)
        VALUES ($1, $2, $1, true)
      `, [testUserId, 'user'])
      
      console.log('✅ Role created manually')

    } catch (manualError) {
      console.log('❌ Manual creation failed:', manualError.message)
    }

    // Test 4: Re-enable trigger with working version
    console.log('\n4. Re-enabling trigger...')
    
    await client.query(`
      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    `)
    
    console.log('✅ Trigger re-enabled')

    // Test 5: Test trigger with new user
    console.log('\n5. Testing trigger with new user...')
    
    const newTestId = 'b2c3d4e5-f6a7-8901-2345-' + Date.now().toString().slice(-12)
    const newTestEmail = `trigger-test-${Date.now()}@example.com`
    
    try {
      const newUserResult = await client.query(`
        INSERT INTO auth.users (
          id, 
          email, 
          raw_user_meta_data,
          email_confirmed_at,
          created_at,
          updated_at,
          aud,
          role,
          is_sso_user,
          is_anonymous
        ) VALUES ($1, $2, $3, NOW(), NOW(), NOW(), 'authenticated', 'authenticated', false, false)
        RETURNING id, email;
      `, [newTestId, newTestEmail, JSON.stringify({
        name: 'Trigger Test User',
        email: newTestEmail
      })])

      console.log('✅ User with trigger created:', newUserResult.rows[0])

      // Wait for trigger
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Check if profile was created by trigger
      const profileCheck = await client.query(`
        SELECT id, full_name FROM profiles WHERE id = $1
      `, [newTestId])

      if (profileCheck.rows.length > 0) {
        console.log('✅ Profile created by trigger:', profileCheck.rows[0])
      } else {
        console.log('❌ Profile not created by trigger')
      }

      // Check if role was created by trigger
      const roleCheck = await client.query(`
        SELECT user_id, role FROM user_roles WHERE user_id = $1
      `, [newTestId])

      if (roleCheck.rows.length > 0) {
        console.log('✅ Role created by trigger:', roleCheck.rows[0])
      } else {
        console.log('❌ Role not created by trigger')
      }

    } catch (triggerError) {
      console.log('❌ Trigger test failed:', triggerError.message)
    }

    // Clean up test data
    console.log('\n6. Cleaning up test data...')
    await client.query('DELETE FROM user_roles WHERE user_id IN ($1, $2)', [testUserId, newTestId])
    await client.query('DELETE FROM profiles WHERE id IN ($1, $2)', [testUserId, newTestId])
    await client.query('DELETE FROM auth.users WHERE id IN ($1, $2)', [testUserId, newTestId])
    console.log('✅ Test data cleaned up')

    console.log('\n💡 Summary:')
    console.log('If the trigger test succeeded, the database setup is working.')
    console.log('The issue with Supabase signup might be in the Supabase Auth configuration.')

  } catch (error) {
    console.error('❌ Bypass test failed:', error.message)
    console.error('   Stack:', error.stack)
  } finally {
    await client.end()
  }
}

bypassSupabaseTest()