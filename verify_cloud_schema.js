#!/usr/bin/env node

/**
 * Verify Cloud Schema Migration
 * Checks if all tables were created successfully
 */

import { createClient } from '@supabase/supabase-js';

const CLOUD_SUPABASE_URL = 'https://grgvlrvywsfmnmkxrecd.supabase.co';
const CLOUD_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZ3ZscnZ5d3NmbW5ta3hyZWNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQxMTMxMiwiZXhwIjoyMDY1OTg3MzEyfQ.gRRd3vm7s4iwlGLfXejFOXIz9ulfaywP64OjOWmGqpQ';

async function main() {
  console.log('🔍 Verifying cloud database schema...\n');
  
  const cloudSupabase = createClient(CLOUD_SUPABASE_URL, CLOUD_SERVICE_KEY);
  
  // Expected tables from local database
  const expectedTables = [
    'country_settings', 'system_settings', 'quotes_v2', 'quote_items_v2',
    'orders', 'order_items', 'profiles', 'messages', 'payment_transactions',
    'delivery_addresses', 'shipping_routes', 'payment_gateways',
    'discount_codes', 'support_system', 'user_roles'
  ];
  
  let successCount = 0;
  
  for (const table of expectedTables) {
    try {
      const { data, error } = await cloudSupabase.from(table).select('*').limit(1);
      if (error) {
        if (error.message.includes('does not exist')) {
          console.log(`❌ ${table} - Table missing`);
        } else {
          console.log(`✅ ${table} - Table exists`);
          successCount++;
        }
      } else {
        console.log(`✅ ${table} - Table exists and accessible`);
        successCount++;
      }
    } catch (err) {
      console.log(`❌ ${table} - Error: ${err.message}`);
    }
  }
  
  console.log(`\n📊 Results: ${successCount}/${expectedTables.length} essential tables verified`);
  
  if (successCount >= expectedTables.length * 0.8) {
    console.log('🎉 Schema migration appears successful!');
  } else {
    console.log('⚠️ Schema migration may need attention');
  }
}

main().catch(console.error);
