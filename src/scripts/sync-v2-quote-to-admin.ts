#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function syncV2QuoteToAdmin(quoteId: string) {
  console.log('🔄 Syncing V2 Quote to Admin Panel\n');
  
  // Check quotes_v2
  const { data: v2Quote, error: v2Error } = await supabase
    .from('quotes_v2')
    .select('*')
    .eq('id', quoteId)
    .single();
    
  if (v2Error || !v2Quote) {
    console.error('❌ Quote not found in quotes_v2:', v2Error);
    return;
  }
  
  console.log('✅ Found quote in quotes_v2:');
  console.log('  Status:', v2Quote.status);
  console.log('  Customer:', v2Quote.customer_email);
  console.log('  Share Token:', v2Quote.share_token);
  console.log('  Total USD:', v2Quote.total_quote_origincurrency);
  
  // Check if already exists in regular quotes table
  const { data: existingQuote, error: checkError } = await supabase
    .from('quotes')
    .select('id')
    .eq('id', quoteId)
    .single();
    
  if (existingQuote) {
    console.log('\n✅ Quote already exists in admin table');
    console.log(`\n🔗 Admin URL: http://localhost:8082/admin/quotes/${quoteId}`);
    return;
  }
  
  console.log('\n📝 Creating quote in admin table...');
  
  // Create entry in quotes table for admin access
  // The quotes table stores customer info in customer_data JSONB
  const { data: created, error: createError } = await supabase
    .from('quotes')
    .insert({
      id: v2Quote.id,
      destination_country: v2Quote.destination_country,
      origin_country: v2Quote.origin_country,
      status: v2Quote.status,
      currency: v2Quote.customer_currency || 'USD',
      items: v2Quote.items || [],
      costprice_total_quote_origincurrency: v2Quote.total_quote_origincurrency || 0,
      final_total_origincurrency: v2Quote.total_quote_origincurrency || 0,
      customer_data: {
        info: {
          email: v2Quote.customer_email,
          name: v2Quote.customer_name,
          phone: v2Quote.customer_phone
        },
        // Store V2 specific data
        v2_share_token: v2Quote.share_token,
        v2_validity_days: v2Quote.validity_days,
        v2_customer_message: v2Quote.customer_message,
        v2_payment_terms: v2Quote.payment_terms,
        v2_expires_at: v2Quote.expires_at
      },
      // Store calculation data if present
      calculation_data: v2Quote.calculation_data || {},
      created_at: v2Quote.created_at,
      updated_at: v2Quote.updated_at
    })
    .select()
    .single();
    
  if (createError) {
    console.error('❌ Error creating quote in admin table:', createError);
    return;
  }
  
  console.log('✅ Successfully created quote in admin table');
  console.log(`\n🔗 Admin URL: http://localhost:8082/admin/quotes/${quoteId}`);
  console.log('\nYou can now:');
  console.log('1. View and calculate the quote in the admin panel');
  console.log('2. Send the quote email after calculation');
  console.log('3. Customer will be able to view it at: http://localhost:8082/quote/view/' + v2Quote.share_token);
}

// Get quote ID from command line or use the one provided
const quoteId = process.argv[2] || 'ad179ca1-0f3e-4e5d-a0eb-9d80b0b26345';
syncV2QuoteToAdmin(quoteId).catch(console.error);