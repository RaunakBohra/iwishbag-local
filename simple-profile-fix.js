/**
 * Create a much simpler profile creation function to isolate the issue
 */

import pg from 'pg'
const { Client } = pg

async function simpleProfileFix() {
  console.log('🔧 Creating Simple Profile Creation Function...')
  
  const client = new Client({
    host: '127.0.0.1',
    port: 54322,
    database: 'postgres',
    user: 'postgres',
    password: 'postgres'
  })

  try {
    await client.connect()

    // Create a super simple version that just creates a basic profile
    console.log('1. Creating simple profile function...')
    
    await client.query(`
      CREATE OR REPLACE FUNCTION public.ensure_user_profile_simple(_user_id uuid)
      RETURNS boolean
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $function$
      BEGIN
        -- Check if profile exists
        IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id) THEN
          
          -- Create minimal profile
          INSERT INTO public.profiles (
            id, 
            full_name,
            created_at,
            updated_at
          )
          VALUES (
            _user_id,
            'New User',
            NOW(),
            NOW()
          );

          RETURN TRUE;
        END IF;

        RETURN FALSE;
      END;
      $function$;
    `)

    console.log('✅ Simple profile function created')

    // Create simple role function
    console.log('2. Creating simple role function...')
    
    await client.query(`
      CREATE OR REPLACE FUNCTION public.ensure_user_role_simple(_user_id uuid)
      RETURNS boolean
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $function$
      BEGIN
        -- Check if role exists
        IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id) THEN
          
          -- Create basic user role
          INSERT INTO public.user_roles (
            user_id, 
            role,
            created_by,
            is_active
          )
          VALUES (
            _user_id,
            'user',
            _user_id,
            true
          );

          RETURN TRUE;
        END IF;

        RETURN FALSE;
      END;
      $function$;
    `)

    console.log('✅ Simple role function created')

    // Update trigger to use simple functions
    console.log('3. Updating trigger to use simple functions...')
    
    await client.query(`
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS trigger
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $function$
      BEGIN
        -- Create basic profile
        PERFORM public.ensure_user_profile_simple(NEW.id);
        
        -- Create basic role
        PERFORM public.ensure_user_role_simple(NEW.id);
        
        RETURN NEW;
      END;
      $function$;
    `)

    console.log('✅ Trigger updated to use simple functions')

    console.log('\n🎉 Simple profile creation ready!')
    console.log('Now test user signup again - it should work with minimal data.')

  } catch (error) {
    console.error('❌ Simple fix failed:', error.message)
    console.error('   Stack:', error.stack)
  } finally {
    await client.end()
  }
}

simpleProfileFix()