#!/usr/bin/env node

/**
 * Compare Local vs Cloud Database Tables
 * Shows exactly what's missing
 */

import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';

const CLOUD_SUPABASE_URL = 'https://grgvlrvywsfmnmkxrecd.supabase.co';
const CLOUD_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZ3ZscnZ5d3NmbW5ta3gyZWNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQxMTMxMiwiZXhwIjoyMDY1OTg3MzEyfQ.gRRd3vm7s4iwlGLfXejFOXIz9ulfaywP64OjOWmGqpQ';

async function getCloudTables() {
  console.log('🔍 Getting cloud database tables from cloud database...');
  const cloudSupabase = createClient(CLOUD_SUPABASE_URL, CLOUD_SERVICE_KEY);
  
  try {
    // Query the system tables directly to get all public schema tables
    const { data, error } = await cloudSupabase.rpc('get_table_names');
    
    if (error) {
      console.log('⚠️  RPC failed, using fallback method...');
      // Fallback: Get local tables and test each one
      const localTables = getLocalTables();
      const cloudTables = [];
      
      console.log('🧪 Testing each table individually...');
      for (const table of localTables) {
        try {
          const { error } = await cloudSupabase.from(table).select('*').limit(1);
          if (!error || !error.message.includes('does not exist')) {
            cloudTables.push(table);
            process.stdout.write('✅');
          } else {
            process.stdout.write('❌');
          }
        } catch (err) {
          process.stdout.write('❌');
        }
      }
      console.log('\n');
      return cloudTables;
    }
    
    return data || [];
  } catch (err) {
    console.error('Error getting cloud tables:', err);
    return [];
  }
}

function getLocalTables() {
  console.log('🔍 Getting local database tables...');
  const result = execSync(`PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -t -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"`)
    .toString()
    .trim()
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && line !== '');
    
  return result;
}

async function main() {
  console.log('🚀 Comparing local vs cloud database tables...\n');
  
  const localTables = getLocalTables();
  const cloudTables = await getCloudTables();
  
  console.log(`📊 LOCAL DATABASE: ${localTables.length} tables`);
  console.log(`☁️ CLOUD DATABASE: ${cloudTables.length} tables\n`);
  
  // Find missing tables
  const missingTables = localTables.filter(table => !cloudTables.includes(table));
  
  console.log(`❌ MISSING IN CLOUD: ${missingTables.length} tables`);
  if (missingTables.length > 0) {
    console.log('Missing tables:');
    missingTables.forEach((table, index) => {
      console.log(`   ${index + 1}. ${table}`);
    });
  }
  
  console.log(`\n✅ PRESENT IN CLOUD: ${cloudTables.length} tables`);
  cloudTables.forEach((table, index) => {
    console.log(`   ${index + 1}. ${table}`);
  });
  
  console.log(`\n🎯 COMPLETION STATUS: ${Math.round((cloudTables.length / localTables.length) * 100)}% complete`);
  
  if (missingTables.length > 0) {
    console.log('\n🔧 YOU\'RE RIGHT! I need to push the remaining tables to complete the job! 😅');
  } else {
    console.log('\n🎉 All tables are present in cloud database!');
  }
}

main().catch(console.error);