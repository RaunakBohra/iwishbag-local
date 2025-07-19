/**
 * Check if our trigger and functions exist
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

// Use service role for checking system tables
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkTrigger() {
  console.log('🔍 Checking Database Trigger and Functions...')
  
  try {
    // Check if our functions exist
    console.log('\n1. Checking if functions exist...')
    
    const { data: functions, error: funcError } = await supabase
      .rpc('sql', {
        query: `
          SELECT routine_name, routine_type 
          FROM information_schema.routines 
          WHERE routine_schema = 'public' 
          AND routine_name IN ('handle_new_user', 'ensure_user_profile_with_oauth', 'extract_oauth_user_info');
        `
      })

    if (funcError) {
      console.log('❌ Cannot query functions:', funcError.message)
    } else {
      console.log('✅ Functions found:', functions)
    }

    // Check if trigger exists on auth.users
    console.log('\n2. Checking if trigger exists on auth.users...')
    
    const { data: triggers, error: triggerError } = await supabase
      .rpc('sql', {
        query: `
          SELECT trigger_name, event_manipulation, event_object_table, action_statement
          FROM information_schema.triggers 
          WHERE event_object_schema = 'auth' 
          AND event_object_table = 'users' 
          AND trigger_name = 'on_auth_user_created';
        `
      })

    if (triggerError) {
      console.log('❌ Cannot query triggers:', triggerError.message)
    } else if (triggers && triggers.length > 0) {
      console.log('✅ Trigger found:', triggers[0])
    } else {
      console.log('❌ Trigger "on_auth_user_created" not found on auth.users table')
    }

    // Check if profiles table has the right structure
    console.log('\n3. Checking profiles table structure...')
    
    const { data: profileCols, error: colError } = await supabase
      .rpc('sql', {
        query: `
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'profiles'
          ORDER BY ordinal_position;
        `
      })

    if (colError) {
      console.log('❌ Cannot query profiles columns:', colError.message)
    } else {
      console.log('✅ Profiles table columns:', profileCols)
    }

  } catch (error) {
    console.error('❌ Check failed:', error.message)
  }
}

checkTrigger()