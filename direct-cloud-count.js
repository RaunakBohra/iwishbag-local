#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const client = createClient(
  'https://grgvlrvywsfmnmkxrecd.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZ3ZscnZ5d3NmbW5ta3gyZWNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQxMTMxMiwiZXhwIjoyMDY1OTg3MzEyfQ.gRRd3vm7s4iwlGLfXejFOXIz9ulfaywP64OjOWmGqpQ'
);

async function getDirectCloudCounts() {
  console.log('🔍 Getting direct counts from cloud database...\n');
  
  try {
    // Try to get table count directly
    console.log('📊 Attempting to query information_schema.tables...');
    const { data: tablesData, error: tablesError } = await client
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (tablesError) {
      console.log('❌ Cannot access information_schema.tables:', tablesError.message);
    } else {
      console.log(`✅ Found ${tablesData?.length || 0} tables via information_schema`);
    }
    
    // Try to get function count directly
    console.log('\n📊 Attempting to query information_schema.routines...');
    const { data: functionsData, error: functionsError } = await client
      .from('information_schema.routines')
      .select('routine_name')
      .eq('routine_schema', 'public')
      .eq('routine_type', 'FUNCTION');
    
    if (functionsError) {
      console.log('❌ Cannot access information_schema.routines:', functionsError.message);
    } else {
      console.log(`✅ Found ${functionsData?.length || 0} functions via information_schema`);
    }
    
    // Try to get policies count
    console.log('\n📊 Attempting to query pg_policies...');
    const { data: policiesData, error: policiesError } = await client
      .from('pg_policies')
      .select('policyname')
      .eq('schemaname', 'public');
    
    if (policiesError) {
      console.log('❌ Cannot access pg_policies:', policiesError.message);
    } else {
      console.log(`✅ Found ${policiesData?.length || 0} policies via pg_policies`);
    }
    
  } catch (err) {
    console.error('Error getting counts:', err.message);
  }
  
  console.log('\n💡 The discrepancy might be due to:');
  console.log('   1. System tables vs user tables');
  console.log('   2. Different counting methods');
  console.log('   3. Access restrictions on system catalogs');
  console.log('   4. The user seeing different results from their interface');
}

getDirectCloudCounts().catch(console.error);