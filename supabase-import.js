#!/usr/bin/env node

/**
 * Import data using Supabase client with working connection
 */

import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';

const LOCAL_SUPABASE_URL = 'http://127.0.0.1:54321';
const LOCAL_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const CLOUD_SUPABASE_URL = 'https://grgvlrvywsfmnmkxrecd.supabase.co';
const CLOUD_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZ3ZscnZ5d3NmbW5ta3hyZWNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQxMTMxMiwiZXhwIjoyMDY1OTg3MzEyfQ.gRRd3vm7s4iwlGLfXejFOXIz9ulfaywP64OjOWmGqpQ';

async function main() {
  console.log('🚀 Using alternative approach: SQL execution via edge functions...\n');
  
  try {
    // First, let's try to execute a simple CREATE TABLE via the cloud edge function
    console.log('📋 Testing if we can execute SQL via cloud edge functions...');
    
    const cloudSupabase = createClient(CLOUD_SUPABASE_URL, CLOUD_SERVICE_KEY);
    
    // Try to create a test table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS test_import (
        id SERIAL PRIMARY KEY,
        message TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;
    
    // Since direct SQL execution might not work, let's try an alternative:
    // Use the update-exchange-rates function we deployed to populate the database
    console.log('📞 Calling cloud exchange rate update function...');
    
    const { data, error } = await cloudSupabase.functions.invoke('update-exchange-rates', {
      body: { action: 'force_update' }
    });
    
    if (error) {
      console.log(`⚠️ Function call error: ${error.message}`);
    } else {
      console.log(`📊 Function response:`, data);
    }
    
    // Alternative: Try to copy essential data table by table using Supabase client
    console.log('\n🔄 Attempting table-by-table data sync...');
    
    const localSupabase = createClient(LOCAL_SUPABASE_URL, LOCAL_SERVICE_KEY);
    
    // Get country_settings data from local
    const { data: countryData, error: countryError } = await localSupabase
      .from('country_settings')
      .select('*')
      .limit(5); // Test with just 5 records first
    
    if (countryError) {
      console.log(`❌ Local data fetch error: ${countryError.message}`);
      return;
    }
    
    console.log(`📋 Retrieved ${countryData.length} test countries from local`);
    
    // Try to insert into cloud (this will fail if table doesn't exist)
    const { error: insertError } = await cloudSupabase
      .from('country_settings')
      .insert(countryData);
    
    if (insertError) {
      console.log(`❌ Cloud insert error: ${insertError.message}`);
      
      if (insertError.message.includes('does not exist')) {
        console.log('\n💡 The cloud database is empty. We need to:');
        console.log('1. Apply database schema first');
        console.log('2. Then copy the data');
        
        // Let's try using supabase db push
        console.log('\n🔄 Attempting to push schema using Supabase CLI...');
        try {
          // This might work if the connection issue is resolved
          const result = execSync('echo "y" | supabase db push --linked', { 
            encoding: 'utf8',
            stdio: 'pipe'
          });
          console.log('✅ Schema push successful!');
          console.log(result);
        } catch (pushError) {
          console.log('❌ Schema push failed:', pushError.message);
        }
      }
    } else {
      console.log('✅ Successfully inserted test data into cloud!');
    }
    
  } catch (error) {
    console.error('💥 Import failed:', error.message);
  }
}

main().catch(console.error);