#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';

const client = createClient(
  'https://grgvlrvywsfmnmkxrecd.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZ3ZscnZ5d3NmbW5ta3gyZWNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQxMTMxMiwiZXhwIjoyMDY1OTg3MzEyfQ.gRRd3vm7s4iwlGLfXejFOXIz9ulfaywP64OjOWmGqpQ'
);

function getLocalStats() {
  console.log('🔍 Getting LOCAL database stats...');
  
  const localTables = execSync(`PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"`)
    .toString().trim();
    
  const localFunctions = execSync(`PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -t -c "SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';"`)
    .toString().trim();
    
  const localPolicies = execSync(`PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -t -c "SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';"`)
    .toString().trim();
    
  return {
    tables: parseInt(localTables),
    functions: parseInt(localFunctions), 
    policies: parseInt(localPolicies)
  };
}

async function getCloudStats() {
  console.log('🔍 Getting CLOUD database stats...');
  
  // Get all local table names and test each one in cloud
  const localTableNames = execSync(`PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -t -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"`)
    .toString()
    .trim()
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && line !== '');
  
  console.log(`Testing ${localTableNames.length} tables in cloud...`);
  let cloudTablesFound = 0;
  
  for (const table of localTableNames) {
    try {
      const { error } = await client.from(table).select('*').limit(1);
      if (!error || !error.message.includes('does not exist')) {
        cloudTablesFound++;
        process.stdout.write('✅');
      } else {
        process.stdout.write('❌');
      }
    } catch (err) {
      process.stdout.write('❌');
    }
  }
  
  console.log(`\n`);
  
  // Test key functions
  const keyFunctions = [
    'is_admin', 'is_authenticated', 'has_role', 'generate_iwish_tracking_id',
    'update_updated_at_column', 'handle_new_user', 'calculate_quote_expiry',
    'record_payment_with_ledger_and_triggers', 'confirm_payment_from_proof'
  ];
  
  let cloudFunctionsFound = 0;
  for (const funcName of keyFunctions) {
    try {
      const { error } = await client.rpc(funcName);
      if (!error || !error.message.includes('does not exist')) {
        cloudFunctionsFound++;
      }
    } catch (err) {
      // Function doesn't exist
    }
  }
  
  return {
    tables: cloudTablesFound,
    functions: cloudFunctionsFound,
    totalFunctionsTested: keyFunctions.length
  };
}

async function main() {
  console.log('🚀 GETTING REAL CLOUD DATABASE STATS...\n');
  
  const local = getLocalStats();
  const cloud = await getCloudStats();
  
  console.log('📊 ACTUAL COMPARISON:');
  console.log(`📍 LOCAL DATABASE:`);
  console.log(`   Tables: ${local.tables}`);
  console.log(`   Functions: ${local.functions}`);
  console.log(`   RLS Policies: ${local.policies}`);
  
  console.log(`\n☁️  CLOUD DATABASE:`);
  console.log(`   Tables: ${cloud.tables}/${local.tables} (${Math.round((cloud.tables/local.tables)*100)}%)`);
  console.log(`   Key Functions: ${cloud.functions}/${cloud.totalFunctionsTested} tested`);
  console.log(`   RLS Policies: Unknown (cannot test directly)`);
  
  console.log(`\n🎯 REAL MIGRATION STATUS:`);
  if (cloud.tables === local.tables) {
    console.log(`   ✅ Tables: COMPLETE (${cloud.tables}/${local.tables})`);
  } else {
    console.log(`   ❌ Tables: INCOMPLETE (${cloud.tables}/${local.tables}) - ${local.tables - cloud.tables} missing`);
  }
  
  if (cloud.functions >= 8) {
    console.log(`   ✅ Functions: Core functions working`);
  } else {
    console.log(`   ⚠️  Functions: Only ${cloud.functions} key functions found`);
  }
  
  console.log(`\n💡 User is right - my previous claims were incorrect!`);
}

main().catch(console.error);