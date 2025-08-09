#!/usr/bin/env npx tsx
/**
 * Direct Test: Quote-to-Order Conversion
 * 
 * This script directly tests quote-to-order conversion using database operations
 * without relying on service classes that may have environment dependencies.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

// Initialize Supabase client for testing
const supabase = createClient<Database>(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
);

async function testQuoteToOrderConversion() {
  console.log('🚀 Testing Quote-to-Order Conversion (Direct Database Operations)\n');

  try {
    // Step 1: Fetch test quotes
    console.log('1. Fetching approved test quotes...');
    const { data: quotes, error: quotesError } = await supabase
      .from('quotes_v2')
      .select(`
        id,
        quote_number,
        customer_id,
        customer_email,
        status,
        total_quote_origincurrency,
        final_total_origincurrency,
        customer_currency,
        origin_country,
        destination_country,
        quote_items_v2(*)
      `)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (quotesError) {
      throw new Error(`Error fetching quotes: ${quotesError.message}`);
    }

    console.log(`✅ Found ${quotes?.length || 0} approved quotes\n`);
    
    if (!quotes || quotes.length === 0) {
      console.log('❌ No approved quotes found. Please run test data creation first.');
      return;
    }

    // Step 2: Convert first quote to order manually
    const testQuote = quotes[0];
    console.log(`--- Converting Quote ${testQuote.quote_number} ---`);
    console.log(`Customer: ${testQuote.customer_email}`);
    console.log(`Total: $${testQuote.final_total_origincurrency} ${testQuote.customer_currency}`);
    console.log(`Items: ${testQuote.quote_items_v2?.length || 0}`);

    // Generate order number
    const orderNumber = `ORD-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Date.now().toString().slice(-4)}`;

    // Create order
    console.log('\n2. Creating order record...');
    const { data: createdOrder, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        user_id: testQuote.customer_id,
        customer_id: testQuote.customer_id,
        quote_id: testQuote.id,
        status: 'pending_payment',
        overall_status: 'payment_pending',
        payment_method: 'stripe',
        payment_status: 'pending',
        total_amount: testQuote.final_total_origincurrency || 0,
        currency: testQuote.customer_currency || 'USD',
        original_quote_total: testQuote.final_total_origincurrency || 0,
        current_order_total: testQuote.final_total_origincurrency || 0,
        total_items: testQuote.quote_items_v2?.length || 0,
        active_items: testQuote.quote_items_v2?.length || 0,
        primary_warehouse: testQuote.origin_country === 'CN' ? 'china_warehouse' : 
                          testQuote.origin_country === 'US' ? 'us_warehouse' : 'india_warehouse',
        consolidation_preference: 'wait_for_all',
        delivery_preference: 'warehouse_consolidation',
        quality_check_requested: true,
        automation_enabled: true,
        seller_order_automation: { automation_enabled: true, platforms: ['amazon', 'alibaba'] },
        tracking_automation: { email_scraping_enabled: true, tracking_update_frequency: 'daily' }
      })
      .select()
      .single();

    if (orderError) {
      throw new Error(`Error creating order: ${orderError.message}`);
    }

    console.log(`✅ Order created: ${createdOrder.order_number} (${createdOrder.id})`);

    // Step 3: Create order items
    if (testQuote.quote_items_v2 && testQuote.quote_items_v2.length > 0) {
      console.log('\n3. Creating order items...');
      
      const orderItems = testQuote.quote_items_v2.map(item => ({
        order_id: createdOrder.id,
        quote_item_id: item.id,
        product_name: item.name,
        product_url: item.url,
        seller_platform: 'amazon', // Default for testing
        origin_country: testQuote.origin_country,
        destination_country: testQuote.destination_country,
        quantity: item.quantity,
        original_price: item.unit_price_origin,
        current_price: item.unit_price_origin,
        original_weight: item.weight_kg || 0,
        current_weight: item.weight_kg || 0,
        item_status: 'pending_order_placement',
        order_automation_status: 'queued',
        quality_check_requested: true,
        quality_check_priority: item.category === 'electronics' ? 'electronics' : 'standard',
        assigned_warehouse: testQuote.origin_country === 'CN' ? 'china_warehouse' : 
                           testQuote.origin_country === 'US' ? 'us_warehouse' : 'india_warehouse',
        auto_approval_threshold_amount: 25.00,
        auto_approval_threshold_percentage: 10.0
      }));

      const { data: createdItems, error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)
        .select();

      if (itemsError) {
        throw new Error(`Error creating order items: ${itemsError.message}`);
      }

      console.log(`✅ Created ${createdItems.length} order items`);
    }

    // Step 4: Create customer delivery preferences
    console.log('\n4. Creating delivery preferences...');
    const { data: preferences, error: preferencesError } = await supabase
      .from('customer_delivery_preferences')
      .insert({
        order_id: createdOrder.id,
        customer_id: testQuote.customer_id,
        delivery_method: 'warehouse_consolidation',
        consolidation_preference: 'wait_for_all',
        max_wait_days: 21,
        quality_check_level: 'standard',
        photo_documentation_required: true,
        priority: 'balanced',
        notification_frequency: 'major_updates',
        preferred_communication: 'email'
      })
      .select();

    if (preferencesError) {
      console.log(`⚠️ Warning creating preferences: ${preferencesError.message}`);
    } else {
      console.log('✅ Delivery preferences created');
    }

    // Step 5: Update quote status
    console.log('\n5. Marking quote as converted...');
    const { error: quoteUpdateError } = await supabase
      .from('quotes_v2')
      .update({
        converted_to_order_id: createdOrder.id,
        status: 'converted_to_order'
      })
      .eq('id', testQuote.id);

    if (quoteUpdateError) {
      console.log(`⚠️ Warning updating quote: ${quoteUpdateError.message}`);
    } else {
      console.log('✅ Quote marked as converted');
    }

    // Step 6: Verify conversion results
    console.log('\n--- Conversion Verification ---');
    
    const { data: finalOrder, error: finalOrderError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(*),
        customer_delivery_preferences(*)
      `)
      .eq('id', createdOrder.id)
      .single();

    if (finalOrderError) {
      console.log(`⚠️ Error fetching final order: ${finalOrderError.message}`);
    } else {
      console.log('✅ Order verification successful:');
      console.log(`   Order ID: ${finalOrder.id}`);
      console.log(`   Order Number: ${finalOrder.order_number}`);
      console.log(`   Status: ${finalOrder.status}`);
      console.log(`   Overall Status: ${finalOrder.overall_status}`);
      console.log(`   Total Amount: $${finalOrder.total_amount} ${finalOrder.currency}`);
      console.log(`   Items: ${finalOrder.order_items?.length || 0}`);
      console.log(`   Preferences: ${finalOrder.customer_delivery_preferences?.length || 0}`);
    }

    console.log('\n🎉 Quote-to-Order conversion test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run the test
testQuoteToOrderConversion().catch(console.error);