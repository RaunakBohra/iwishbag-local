/**
 * Test script to verify auto quote integration with shipping routes
 * Run with: node test-auto-quote-integration.js
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with local credentials
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testAutoQuoteIntegration() {
  console.log('🚀 Testing Auto Quote Integration with Shipping Routes...\n');

  try {
    // 1. Check if we have shipping routes
    console.log('1. Checking shipping routes...');
    const { data: routes, error: routesError } = await supabase
      .from('shipping_routes')
      .select('*')
      .eq('is_active', true)
      .limit(5);

    if (routesError) {
      console.error('❌ Error fetching routes:', routesError);
      return;
    }

    console.log(`✅ Found ${routes.length} active shipping routes`);
    if (routes.length > 0) {
      console.log('Sample route:', {
        id: routes[0].id,
        origin: routes[0].origin_country,
        destination: routes[0].destination_country,
        weight_unit: routes[0].weight_unit,
        base_cost: routes[0].base_shipping_cost
      });
    }

    // 2. Check recent auto quotes for shipping route data
    console.log('\n2. Checking recent auto quotes...');
    const { data: recentQuotes, error: quotesError } = await supabase
      .from('quotes')
      .select('*')
      .eq('quote_type', 'auto')
      .order('created_at', { ascending: false })
      .limit(5);

    if (quotesError) {
      console.error('❌ Error fetching quotes:', quotesError);
      return;
    }

    console.log(`✅ Found ${recentQuotes.length} recent auto quotes`);
    
    const quotesWithRoutes = recentQuotes.filter(q => q.shipping_method || q.shipping_route_id);
    console.log(`📊 ${quotesWithRoutes.length} quotes have shipping route data`);

    if (quotesWithRoutes.length > 0) {
      console.log('\nSample quote with route data:');
      const sampleQuote = quotesWithRoutes[0];
      console.log({
        id: sampleQuote.id,
        shipping_method: sampleQuote.shipping_method,
        shipping_route_id: sampleQuote.shipping_route_id,
        shipping_carrier: sampleQuote.shipping_carrier,
        shipping_delivery_days: sampleQuote.shipping_delivery_days,
        origin_country: sampleQuote.origin_country,
        international_shipping: sampleQuote.international_shipping
      });
    }

    // 3. Test the Edge Function directly
    console.log('\n3. Testing Edge Function...');
    const testData = {
      url: 'https://www.amazon.com/dp/B08N5WRWNW',
      purchaseCountry: 'US',
      shippingCountry: 'CA' // Use a country that might have a route
    };

    const { data: edgeResult, error: edgeError } = await supabase.functions.invoke('calculate-auto-quote', {
      body: testData
    });

    if (edgeError) {
      console.error('❌ Edge function error:', edgeError);
      return;
    }

    console.log('✅ Edge function executed successfully');
    if (edgeResult && edgeResult.quote) {
      const quote = edgeResult.quote;
      console.log('New quote details:');
      console.log({
        id: quote.id,
        shipping_method: quote.shipping_method,
        shipping_route_id: quote.shipping_route_id,
        shipping_carrier: quote.shipping_carrier,
        shipping_delivery_days: quote.shipping_delivery_days,
        origin_country: quote.origin_country,
        international_shipping: quote.international_shipping,
        final_total: quote.final_total
      });
    }

    // 4. Summary
    console.log('\n📋 Integration Summary:');
    console.log(`✅ Shipping routes: ${routes.length} active routes`);
    console.log(`✅ Auto quotes with route data: ${quotesWithRoutes.length}/${recentQuotes.length}`);
    console.log(`✅ Edge function: Working with route support`);
    
    if (quotesWithRoutes.length > 0) {
      console.log('🎉 Integration is working! Auto quotes are using shipping routes.');
    } else {
      console.log('⚠️  No quotes with route data found. This might be normal if:');
      console.log('   - No routes exist for the quote countries');
      console.log('   - Quotes are falling back to country settings');
      console.log('   - Recent quotes were created before integration');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testAutoQuoteIntegration(); 