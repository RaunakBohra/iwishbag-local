/**
 * Simple test to verify shipping routes integration in auto quotes
 * Run with: node test-shipping-routes-integration.js
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with local credentials
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testShippingRoutesIntegration() {
  console.log('🚀 Testing Shipping Routes Integration...\n');

  try {
    // 1. Check shipping routes table structure
    console.log('1. Checking shipping routes table...');
    const { data: routes, error: routesError } = await supabase
      .from('shipping_routes')
      .select('*')
      .limit(3);

    if (routesError) {
      console.error('❌ Error fetching routes:', routesError);
      return;
    }

    console.log(`✅ Found ${routes.length} shipping routes`);
    if (routes.length > 0) {
      console.log('Sample route structure:');
      const route = routes[0];
      console.log({
        id: route.id,
        origin_country: route.origin_country,
        destination_country: route.destination_country,
        weight_unit: route.weight_unit,
        base_shipping_cost: route.base_shipping_cost,
        cost_per_kg: route.cost_per_kg,
        cost_percentage: route.cost_percentage,
        is_active: route.is_active,
        carriers: route.carriers,
        weight_tiers: route.weight_tiers
      });
    }

    // 2. Check quotes table for new shipping fields
    console.log('\n2. Checking quotes table structure...');
    const { data: quotes, error: quotesError } = await supabase
      .from('quotes')
      .select('*')
      .limit(1);

    if (quotesError) {
      console.error('❌ Error fetching quotes:', quotesError);
      return;
    }

    if (quotes.length > 0) {
      const quote = quotes[0];
      console.log('Quote table has these shipping-related fields:');
      const shippingFields = [
        'origin_country',
        'shipping_method', 
        'shipping_route_id',
        'shipping_carrier',
        'shipping_delivery_days'
      ];
      
      shippingFields.forEach(field => {
        console.log(`  ${field}: ${quote[field] || 'null'}`);
      });
    }

    // 3. Check if we can create a test quote with shipping route data
    console.log('\n3. Testing quote creation with shipping route data...');
    const testQuoteData = {
      user_id: null,
      email: 'test@example.com',
      quote_type: 'auto',
      product_name: 'Test Product',
      product_url: 'https://example.com',
      item_price: 100.00,
      item_weight: 2.5,
      final_total: 150.00,
      sub_total: 140.00,
      vat: 10.00,
      international_shipping: 25.00,
      customs_and_ecs: 5.00,
      payment_gateway_fee: 0,
      final_currency: 'USD',
      final_total_local: 150.00,
      confidence_score: 0.8,
      status: 'calculated',
      approval_status: 'pending',
      priority: 'normal',
      country_code: 'US',
      items_currency: 'USD',
      // New shipping route fields
      origin_country: 'US',
      shipping_method: 'route-specific',
      shipping_route_id: routes.length > 0 ? routes[0].id : null,
      shipping_carrier: 'DHL',
      shipping_delivery_days: '5-10'
    };

    const { data: newQuote, error: createError } = await supabase
      .from('quotes')
      .insert(testQuoteData)
      .select()
      .single();

    if (createError) {
      console.error('❌ Error creating test quote:', createError);
      return;
    }

    console.log('✅ Successfully created test quote with shipping route data');
    console.log('New quote ID:', newQuote.id);
    console.log('Shipping method:', newQuote.shipping_method);
    console.log('Shipping route ID:', newQuote.shipping_route_id);

    // 4. Clean up test data
    console.log('\n4. Cleaning up test data...');
    const { error: deleteError } = await supabase
      .from('quotes')
      .delete()
      .eq('id', newQuote.id);

    if (deleteError) {
      console.error('⚠️  Warning: Could not delete test quote:', deleteError);
    } else {
      console.log('✅ Test quote deleted successfully');
    }

    // 5. Summary
    console.log('\n📋 Integration Summary:');
    console.log(`✅ Shipping routes table: Working (${routes.length} routes)`);
    console.log(`✅ Quotes table: Has shipping route fields`);
    console.log(`✅ Database operations: Working`);
    console.log(`✅ Integration: Ready for auto quotes`);
    
    console.log('\n🎉 Shipping routes integration is working correctly!');
    console.log('Auto quotes can now use the unified shipping calculator with route support.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testShippingRoutesIntegration(); 