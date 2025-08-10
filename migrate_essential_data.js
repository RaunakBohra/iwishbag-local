#!/usr/bin/env node

/**
 * Essential Data Migration Script
 * Copies critical data after schema is applied
 */

import { createClient } from '@supabase/supabase-js';

const LOCAL_SUPABASE_URL = 'http://127.0.0.1:54321';
const LOCAL_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const CLOUD_SUPABASE_URL = 'https://grgvlrvywsfmnmkxrecd.supabase.co';
const CLOUD_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZ3ZscnZ5d3NmbW5ta3hyZWNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQxMTMxMiwiZXhwIjoyMDY1OTg3MzEyfQ.gRRd3vm7s4iwlGLfXejFOXIz9ulfaywP64OjOWmGqpQ';

async function copyTable(tableName, localSupabase, cloudSupabase) {
  console.log(`📄 Copying ${tableName}...`);
  
  try {
    const { data: localData, error: fetchError } = await localSupabase
      .from(tableName)
      .select('*');
      
    if (fetchError) {
      console.log(`   ❌ Error: ${fetchError.message}`);
      return false;
    }
    
    if (!localData || localData.length === 0) {
      console.log(`   ⏭️ No data to copy`);
      return true;
    }
    
    console.log(`   📋 Found ${localData.length} records`);
    
    // Clear existing data
    await cloudSupabase.from(tableName).delete().neq('id', '');
    
    // Insert in batches of 50
    const batchSize = 50;
    let successCount = 0;
    
    for (let i = 0; i < localData.length; i += batchSize) {
      const batch = localData.slice(i, i + batchSize);
      const { error } = await cloudSupabase.from(tableName).insert(batch);
      
      if (!error) {
        successCount += batch.length;
      } else {
        console.log(`   ⚠️ Batch error: ${error.message}`);
      }
    }
    
    console.log(`   ✅ ${successCount}/${localData.length} records copied`);
    return true;
    
  } catch (error) {
    console.log(`   💥 Failed: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting essential data migration...\n');
  
  const localSupabase = createClient(LOCAL_SUPABASE_URL, LOCAL_SERVICE_KEY);
  const cloudSupabase = createClient(CLOUD_SUPABASE_URL, CLOUD_SERVICE_KEY);
  
  // Essential tables in dependency order
  const tables = [
    'country_settings',
    'system_settings',
    'email_templates',
    'delivery_providers'
  ];
  
  let successCount = 0;
  for (const table of tables) {
    if (await copyTable(table, localSupabase, cloudSupabase)) {
      successCount++;
    }
    console.log('');
  }
  
  console.log(`🎯 Results: ${successCount}/${tables.length} tables copied`);
  
  if (successCount > 0) {
    console.log('🎉 Essential data migration completed!');
  }
}

main().catch(console.error);
