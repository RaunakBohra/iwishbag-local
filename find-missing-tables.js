#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';

const client = createClient(
  'https://grgvlrvywsfmnmkxrecd.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZ3ZscnZ5d3NmbW5ta3gyZWNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQxMTMxMiwiZXhwIjoyMDY1OTg3MzEyfQ.gRRd3vm7s4iwlGLfXejFOXIz9ulfaywP64OjOWmGqpQ'
);

async function findMissingTables() {
  // Get all local tables
  const localTables = execSync(`PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -t -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"`)
    .toString()
    .trim()
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && line !== '');
  
  console.log(`🔍 Found ${localTables.length} tables in local database`);
  console.log('🧪 Testing each table in cloud...\n');
  
  const missingTables = [];
  const presentTables = [];
  
  for (const table of localTables) {
    try {
      const { error } = await client.from(table).select('*').limit(1);
      if (error && error.message.includes('does not exist')) {
        missingTables.push(table);
        console.log(`❌ ${table}`);
      } else {
        presentTables.push(table);
        console.log(`✅ ${table}`);
      }
    } catch (err) {
      missingTables.push(table);
      console.log(`❌ ${table}`);
    }
  }
  
  console.log(`\n📊 RESULTS:`);
  console.log(`✅ Present in cloud: ${presentTables.length}`);
  console.log(`❌ Missing from cloud: ${missingTables.length}`);
  
  if (missingTables.length > 0) {
    console.log(`\n📋 MISSING TABLES:`);
    missingTables.forEach((table, i) => {
      console.log(`   ${i + 1}. ${table}`);
    });
  }
  
  return { missingTables, presentTables, localTables };
}

findMissingTables().catch(console.error);