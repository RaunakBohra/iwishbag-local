#!/usr/bin/env npx tsx
/**
 * Test Script: Quote-to-Order Conversion Workflow
 * 
 * This script tests the QuoteToOrderConversionService with real test data
 * to validate the complete quote-to-order conversion workflow.
 */

import { createClient } from '@supabase/supabase-js';
import QuoteToOrderConversionService from '../services/QuoteToOrderConversionService';
import type { Database } from '../types/database';

// Initialize Supabase client
const supabase = createClient<Database>(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
  {
    global: {
      headers: {
        // Admin bypass for testing
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
      }
    }
  }
);

// Initialize conversion service - we'll create our own since the service uses internal client
const conversionService = new QuoteToOrderConversionService();

async function testQuoteToOrderConversion() {
  console.log('🚀 Testing Quote-to-Order Conversion Workflow\n');

  try {
    // Step 1: Fetch available approved quotes
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
      .order('created_at', { ascending: false })
      .limit(3);

    if (quotesError) {
      throw new Error(`Error fetching quotes: ${quotesError.message}`);
    }

    console.log(`✅ Found ${quotes?.length || 0} approved quotes\n`);
    
    if (!quotes || quotes.length === 0) {
      console.log('❌ No approved quotes found. Please run test data creation first.');
      return;
    }

    // Step 2: Test quote-to-order conversion for each quote
    for (const quote of quotes) {
      console.log(`--- Testing Quote ${quote.quote_number} ---`);
      console.log(`Customer: ${quote.customer_email}`);
      console.log(`Origin: ${quote.origin_country} → Destination: ${quote.destination_country}`);
      console.log(`Total: $${quote.final_total_origincurrency} ${quote.customer_currency}`);
      console.log(`Items: ${quote.quote_items_v2?.length || 0}`);

      try {
        // Define conversion options based on quote characteristics
        const conversionOptions = {
          payment_method: quote.final_total_origincurrency && quote.final_total_origincurrency > 1000 
            ? 'bank_transfer' : 'stripe',
          consolidation_preference: quote.quote_items_v2 && quote.quote_items_v2.length > 2 
            ? 'wait_for_all' : 'ship_immediately',
          delivery_preference: quote.destination_country === 'US' 
            ? 'express_shipping' : 'warehouse_consolidation',
          quality_check_requested: true,
          automation_enabled: true,
          warehouse_assignment: quote.origin_country === 'CN' 
            ? 'china_warehouse' 
            : quote.origin_country === 'US' ? 'us_warehouse' : 'india_warehouse'
        };

        console.log('🔄 Converting quote to order...');
        
        // Perform the conversion
        const conversionResult = await conversionService.convertQuoteToOrder(
          quote.id,
          conversionOptions
        );

        if (conversionResult.success && conversionResult.order) {
          console.log('✅ Quote converted successfully!');
          console.log(`   Order ID: ${conversionResult.order.id}`);
          console.log(`   Order Number: ${conversionResult.order.order_number}`);
          console.log(`   Status: ${conversionResult.order.status}`);
          console.log(`   Overall Status: ${conversionResult.order.overall_status}`);
          console.log(`   Primary Warehouse: ${conversionResult.order.primary_warehouse}`);
          console.log(`   Total Items: ${conversionResult.order.total_items}`);
          
          // Validate order items were created
          const { data: orderItems } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', conversionResult.order.id);

          console.log(`   Order Items Created: ${orderItems?.length || 0}`);

          // Check customer delivery preferences
          const { data: preferences } = await supabase
            .from('customer_delivery_preferences')
            .select('*')
            .eq('order_id', conversionResult.order.id);

          console.log(`   Delivery Preferences Created: ${preferences?.length || 0}`);

          // Validate quote was marked as converted
          const { data: updatedQuote } = await supabase
            .from('quotes_v2')
            .select('converted_to_order_id')
            .eq('id', quote.id)
            .single();

          if (updatedQuote?.converted_to_order_id === conversionResult.order.id) {
            console.log('   ✅ Quote properly linked to order');
          } else {
            console.log('   ⚠️ Quote not properly linked to order');
          }

        } else {
          console.log('❌ Conversion failed:');
          console.log(`   Error: ${conversionResult.error?.message || 'Unknown error'}`);
          console.log(`   Details:`, conversionResult.error?.details);
        }

      } catch (error) {
        console.log('❌ Conversion error:');
        console.log('   Error:', error instanceof Error ? error.message : String(error));
      }

      console.log(''); // Add spacing between quotes
    }

    // Step 3: Validate overall conversion results
    console.log('--- Conversion Summary ---');
    
    const { data: totalOrders } = await supabase
      .from('orders')
      .select('id, status, overall_status')
      .order('created_at', { ascending: false });

    const { data: totalOrderItems } = await supabase
      .from('order_items')
      .select('id, item_status');

    const { data: convertedQuotes } = await supabase
      .from('quotes_v2')
      .select('id')
      .not('converted_to_order_id', 'is', null);

    console.log(`📊 Total Orders Created: ${totalOrders?.length || 0}`);
    console.log(`📦 Total Order Items: ${totalOrderItems?.length || 0}`);
    console.log(`🔗 Quotes Converted: ${convertedQuotes?.length || 0}`);

    if (totalOrders && totalOrders.length > 0) {
      const statusCounts = totalOrders.reduce((acc, order) => {
        acc[order.overall_status || 'unknown'] = (acc[order.overall_status || 'unknown'] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log('📈 Order Status Distribution:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`   ${status}: ${count}`);
      });
    }

    console.log('\n🎉 Quote-to-Order conversion testing completed!');

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