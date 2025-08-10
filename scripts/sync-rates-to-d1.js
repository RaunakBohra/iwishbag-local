#!/usr/bin/env node

/**
 * Sync Fresh Exchange Rates to D1 Edge API
 * 
 * This script fetches fresh exchange rates from our local database
 * and syncs them to the Cloudflare D1 database behind the Edge API.
 * 
 * Usage: node scripts/sync-rates-to-d1.js
 */

import { createClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = 'http://127.0.0.1:54321'; // Local Supabase
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const D1_API_URL = 'https://iwishbag-edge-api.rnkbohra.workers.dev/api/sync';
const SYNC_API_KEY = '78420fca737891955965e6a5f1b119fa2922b8257cb84d218aaa8c755ee62029'; // Secure API key

async function main() {
  console.log('🚀 Starting D1 Exchange Rate Sync...\n');
  
  try {
    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Step 1: Fetch fresh country settings from local database
    console.log('📊 Fetching fresh country settings from local database...');
    const { data: countries, error: dbError } = await supabase
      .from('country_settings')
      .select('code, name, currency, rate_from_usd, updated_at')
      .not('rate_from_usd', 'is', null)
      .order('code');
    
    if (dbError) {
      throw new Error(`Database query failed: ${dbError.message}`);
    }
    
    console.log(`✅ Loaded ${countries.length} countries with fresh rates:`);
    
    // Display the fresh rates we're about to sync
    countries.forEach(country => {
      const age = Math.round((Date.now() - new Date(country.updated_at).getTime()) / (1000 * 60 * 60));
      console.log(`   ${country.code} (${country.currency}): ${country.rate_from_usd}/USD (${age}h old)`);
    });
    
    // Step 2: Transform data for D1 format
    console.log('\n🔄 Preparing data for D1 sync...');
    
    // Format countries for D1 country_settings_cache table
    // Map currency codes to common symbols
    const currencySymbols = {
      'USD': '$',
      'INR': '₹',
      'NPR': 'रू',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥',
      'CNY': '¥',
      'AUD': 'A$',
      'CAD': 'C$'
    };
    
    const countryData = countries.map(country => ({
      code: country.code,
      name: country.name,
      currency: country.currency,
      symbol: currencySymbols[country.currency] || '$',
      exchange_rate: country.rate_from_usd,
      updated_at: Math.floor(new Date(country.updated_at).getTime() / 1000) // Unix timestamp
    }));
    
    console.log(`📝 Formatted ${countryData.length} country records for D1`);
    
    // Step 3: Sync to D1 via API
    console.log('\n🌐 Syncing to D1 Edge API...');
    console.log(`🔗 D1 API URL: ${D1_API_URL}`);
    
    // Sync each country individually (D1 updateCountrySettings expects single country)
    let successCount = 0;
    let errorCount = 0;
    
    for (const country of countryData) {
      try {
        const response = await fetch(D1_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': SYNC_API_KEY
          },
          body: JSON.stringify({
            type: 'country',
            country: country
          })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const result = await response.json();
        if (result.success) {
          console.log(`   ✅ ${country.code}: Synced ${country.currency} = ${country.exchange_rate}/USD`);
          successCount++;
        } else {
          console.log(`   ❌ ${country.code}: Failed to sync`);
          errorCount++;
        }
        
        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.log(`   ❌ ${country.code}: Error - ${error.message}`);
        errorCount++;
      }
    }
    
    // Step 4: Verify sync worked
    console.log(`\n📈 Sync Results:`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${errorCount}`);
    console.log(`   📊 Total: ${countryData.length}`);
    
    if (successCount > 0) {
      console.log('\n🔍 Verifying D1 data...');
      
      // Test a few key rates
      const testPairs = [
        { from: 'USD', to: 'INR', expected: countries.find(c => c.code === 'IN')?.rate_from_usd },
        { from: 'USD', to: 'NPR', expected: countries.find(c => c.code === 'NP')?.rate_from_usd },
      ];
      
      for (const { from, to, expected } of testPairs) {
        if (!expected) continue;
        
        try {
          const testUrl = `https://iwishbag-edge-api.rnkbohra.workers.dev/api/countries`;
          const response = await fetch(testUrl);
          const data = await response.json();
          
          const country = data.countries?.find(c => c.currency === to);
          if (country) {
            const actual = country.exchange_rate;
            const match = Math.abs(actual - expected) < 0.01;
            console.log(`   ${from}→${to}: ${match ? '✅' : '❌'} Expected ${expected}, Got ${actual}`);
          }
        } catch (error) {
          console.log(`   ${from}→${to}: ❌ Verification failed - ${error.message}`);
        }
      }
    }
    
    console.log('\n🎉 D1 Exchange Rate Sync Complete!');
    
    if (successCount === countryData.length) {
      console.log('✅ All rates synced successfully. Quote calculator should work now.');
    } else {
      console.log(`⚠️  ${errorCount} rates failed to sync. Some exchange rates may still be stale.`);
    }
    
  } catch (error) {
    console.error('\n💥 Sync failed:', error.message);
    console.error('❌ Quote calculator will continue to show exchange rate errors.');
    process.exit(1);
  }
}

// Run the sync
main().catch(console.error);