#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testV2QuoteCreation() {
  console.log('🧪 Testing V2 Quote Creation\n');
  
  try {
    // Test creating a quote directly in quotes_v2
    const testData = {
      // Core fields
      destination_country: 'IN',
      origin_country: 'US',
      status: 'pending',
      customer_currency: 'USD',
      created_by: null,
      customer_id: null,
      
      // Customer information
      customer_name: 'Test Customer',
      customer_email: 'test@example.com',
      customer_phone: null,
      
      // Items
      items: [{
        id: crypto.randomUUID(),
        name: 'Test Product',
        quantity: 1,
        costprice_origin: 100,
        weight: 0.5,
        url: 'https://example.com/product',
        notes: 'Test notes'
      }],
      
      // Pricing
      total_quote_origincurrency: 100,
      total_quote_origincurrency: 100,
      
      // V2 specific fields
      validity_days: 7,
      customer_message: 'Test message',
      payment_terms: 'Test payment terms',
      
      // Store extra data in calculation_data
      calculation_data: {
        session_id: 'test-session',
        shipping_address: { country: 'IN' },
        preferences: { insurance: false }
      },
      
      // Metadata
      source: 'test_script',
      api_version: 'v2'
    };
    
    console.log('📝 Creating test quote with data:');
    console.log(JSON.stringify(testData, null, 2));
    
    const { data: quote, error } = await supabase
      .from('quotes_v2')
      .insert(testData)
      .select('*, share_token')
      .single();
    
    if (error) {
      console.error('❌ Error creating quote:', error);
      return;
    }
    
    console.log('\n✅ Quote created successfully!');
    console.log('Quote ID:', quote.id);
    console.log('Share Token:', quote.share_token);
    console.log('Expires At:', quote.expires_at);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
  
  process.exit(0);
}

testV2QuoteCreation().catch(console.error);