#!/usr/bin/env node

/**
 * Simple Exchange Rate Copy Script
 * Just copies the essential exchange rate data
 */

import { createClient } from '@supabase/supabase-js';

const LOCAL_SUPABASE_URL = 'http://127.0.0.1:54321';
const LOCAL_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const CLOUD_SUPABASE_URL = 'https://grgvlrvywsfmnmkxrecd.supabase.co';
const CLOUD_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZ3ZscnZ5d3NmbW5ta3hyZWNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQxMTMxMiwiZXhwIjoyMDY1OTg3MzEyfQ.gRRd3vm7s4iwlGLfXejFOXIz9ulfaywP64OjOWmGqpQ';

async function main() {
  console.log('🚀 Starting simple exchange rate copy...\n');
  
  const localSupabase = createClient(LOCAL_SUPABASE_URL, LOCAL_SERVICE_KEY);
  const cloudSupabase = createClient(CLOUD_SUPABASE_URL, CLOUD_SERVICE_KEY);
  
  try {
    // Get just the essential columns from local
    console.log('📤 Getting exchange rate data from local...');
    const { data: localData, error: fetchError } = await localSupabase
      .from('country_settings')
      .select('code, name, currency, rate_from_usd, flag_emoji')
      .not('rate_from_usd', 'is', null);
      
    if (fetchError) {
      console.error('❌ Error fetching local data:', fetchError.message);
      return;
    }
    
    console.log(`📋 Found ${localData.length} countries with exchange rates`);
    
    // Clear cloud table
    console.log('🗑️ Clearing cloud country_settings...');
    await cloudSupabase.from('country_settings').delete().neq('code', '');
    
    // Insert essential data only
    console.log('📥 Inserting exchange rate data to cloud...');
    const { error: insertError } = await cloudSupabase
      .from('country_settings')
      .insert(localData);
      
    if (insertError) {
      console.error('❌ Error inserting to cloud:', insertError.message);
      return;
    }
    
    // Verify
    console.log('🔍 Verifying cloud data...');
    const { data: cloudData, count } = await cloudSupabase
      .from('country_settings')
      .select('*', { count: 'exact' });
      
    console.log(`✅ Cloud database now has ${count} countries`);
    
    // Show sample rates
    const { data: sampleRates } = await cloudSupabase
      .from('country_settings')
      .select('code, currency, rate_from_usd')
      .not('rate_from_usd', 'is', null)
      .order('code')
      .limit(8);
      
    console.log('\n📊 Sample exchange rates in cloud:');
    sampleRates.forEach(rate => {
      console.log(`   ${rate.code} (${rate.currency}): ${rate.rate_from_usd}`);
    });
    
    console.log('\n🎉 Exchange rate data successfully copied to cloud!');
    console.log('\n📋 Next steps:');
    console.log('1. ✅ Essential country data with exchange rates copied');
    console.log('2. 🔄 Update D1 cache with cloud data');
    console.log('3. 🧪 Test cloud exchange rate functionality');
    
  } catch (error) {
    console.error('💥 Copy failed:', error.message);
  }
}

main().catch(console.error);