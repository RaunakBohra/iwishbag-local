#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const client = createClient(
  'https://grgvlrvywsfmnmkxrecd.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZ3ZscnZ5d3NmbW5ta3gyZWNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQxMTMxMiwiZXhwIjoyMDY1OTg3MzEyfQ.gRRd3vm7s4iwlGLfXejFOXIz9ulfaywP64OjOWmGqpQ'
);

async function checkFunctions() {
  try {
    // Test key functions that the system depends on
    const testFunctions = [
      'is_admin', 'is_authenticated', 'has_role', 'generate_iwish_tracking_id',
      'update_updated_at_column', 'handle_new_user', 'calculate_quote_expiry',
      'get_user_default_address', 'record_payment_with_ledger_and_triggers',
      'confirm_payment_from_proof', 'get_orders_with_payment_proofs'
    ];
    
    console.log('🔍 Testing key functions in cloud database...\n');
    let foundCount = 0;
    
    for (const funcName of testFunctions) {
      try {
        const { data, error } = await client.rpc(funcName);
        if (!error || !error.message.includes('does not exist')) {
          console.log('✅ ' + funcName);
          foundCount++;
        } else {
          console.log('❌ ' + funcName + ' - ' + error.message);
        }
      } catch (err) {
        console.log('❌ ' + funcName + ' - ' + err.message);
      }
    }
    
    console.log(`\n🎯 Found ${foundCount}/${testFunctions.length} key functions`);
    
    if (foundCount < testFunctions.length) {
      console.log('\n⚠️  Some functions may be missing. Let me check function definitions...');
      
      // Try to get all function names
      const { data: functionData, error: funcError } = await client
        .from('information_schema.routines')
        .select('routine_name')
        .eq('routine_schema', 'public')
        .eq('routine_type', 'FUNCTION');
        
      if (!funcError && functionData) {
        console.log(`\n📊 Total functions in cloud: ${functionData.length}`);
      }
    }
    
  } catch (err) {
    console.error('❌ Error checking functions:', err.message);
  }
}

checkFunctions();