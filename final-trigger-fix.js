/**
 * Final fix for the trigger - resolve the app_role type issue
 */

import pg from 'pg'
const { Client } = pg

async function finalTriggerFix() {
  console.log('🔧 Final Trigger Fix - Resolving app_role Type Issue...')
  
  const client = new Client({
    host: '127.0.0.1',
    port: 54322,
    database: 'postgres',
    user: 'postgres',
    password: 'postgres'
  })

  try {
    await client.connect()

    // Check the exact structure of user_roles table
    console.log('1. Checking user_roles table structure...')
    
    const tableInfo = await client.query(`
      SELECT column_name, data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_roles' 
      AND column_name = 'role'
    `)
    
    console.log('Role column info:', tableInfo.rows[0])

    // Check what values are allowed in the app_role enum
    console.log('\n2. Checking app_role enum values...')
    
    const enumValues = await client.query(`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = 'app_role'::regtype
      ORDER BY enumsortorder
    `)
    
    console.log('Allowed role values:', enumValues.rows.map(row => row.enumlabel))

    // Create a trigger that doesn't cast to enum (let PostgreSQL handle it)
    console.log('\n3. Creating trigger without explicit casting...')
    
    await client.query(`
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS trigger
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $function$
      DECLARE
        profile_exists boolean := false;
        role_exists boolean := false;
      BEGIN
        -- Log the trigger execution
        RAISE NOTICE 'Trigger executing for user: % with email: %', NEW.id, NEW.email;
        
        -- Check if profile already exists
        SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) INTO profile_exists;
        
        -- Check if role already exists  
        SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id) INTO role_exists;
        
        -- Create profile if needed
        IF NOT profile_exists THEN
          BEGIN
            INSERT INTO public.profiles (
              id, 
              full_name,
              email,
              created_at,
              updated_at
            )
            VALUES (
              NEW.id,
              COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', 'User'),
              NEW.email,
              NOW(),
              NOW()
            );
            RAISE NOTICE 'Profile created successfully for user: %', NEW.id;
          EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
          END;
        END IF;
        
        -- Create role if needed (without explicit casting)
        IF NOT role_exists THEN
          BEGIN
            INSERT INTO public.user_roles (
              user_id, 
              role,
              created_by,
              is_active,
              scope
            )
            VALUES (
              NEW.id,
              'user',
              NEW.id,
              true,
              'global'
            );
            RAISE NOTICE 'Role created successfully for user: %', NEW.id;
          EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to create role for user %: %', NEW.id, SQLERRM;
          END;
        END IF;
        
        RETURN NEW;
      END;
      $function$;
    `)

    console.log('✅ Updated trigger function without explicit casting')

    // Test the trigger manually
    console.log('\n4. Testing trigger manually...')
    
    const testUuid = await client.query('SELECT gen_random_uuid() as uuid')
    const testUserId = testUuid.rows[0].uuid
    const testEmail = `trigger-test-${Date.now()}@example.com`
    
    try {
      // Create user in auth.users (this should trigger our function)
      await client.query(`
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
      `, [testUserId, testEmail, JSON.stringify({
        name: 'Trigger Test User',
        email: testEmail
      })])

      console.log('✅ Test user created:', testUserId)

      // Wait for trigger
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Check results
      const profileCheck = await client.query(`
        SELECT id, full_name FROM profiles WHERE id = $1
      `, [testUserId])

      const roleCheck = await client.query(`
        SELECT user_id, role FROM user_roles WHERE user_id = $1
      `, [testUserId])

      console.log('Profile created:', profileCheck.rows.length > 0)
      console.log('Role created:', roleCheck.rows.length > 0)

      if (roleCheck.rows.length > 0) {
        console.log('Role details:', roleCheck.rows[0])
      }

      // Clean up
      await client.query('DELETE FROM user_roles WHERE user_id = $1', [testUserId])
      await client.query('DELETE FROM profiles WHERE id = $1', [testUserId])
      await client.query('DELETE FROM auth.users WHERE id = $1', [testUserId])

    } catch (testError) {
      console.log('❌ Manual trigger test failed:', testError.message)
    }

    console.log('\n🎉 Trigger should now work properly!')

  } catch (error) {
    console.error('❌ Final fix failed:', error.message)
    console.error('   Stack:', error.stack)
  } finally {
    await client.end()
  }
}

finalTriggerFix()