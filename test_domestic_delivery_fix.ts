// Test script to verify domestic delivery currency fix
import { simplifiedQuoteCalculator } from './src/services/SimplifiedQuoteCalculator';

async function testDomesticDeliveryFix() {
  console.log('🧪 Testing domestic delivery currency fix...\n');
  
  // Test India delivery (INR → Customer Currency)
  const indiaQuote = await simplifiedQuoteCalculator.calculate({
    items: [
      {
        name: 'Test Product',
        quantity: 1,
        costprice_origin: 100,
        weight_kg: 1.0
      }
    ],
    origin_currency: 'USD',
    origin_country: 'US',
    destination_country: 'IN',
    destination_pincode: '110001', // Valid Delhi pincode
    delhivery_service_type: 'standard',
    customer_id: 'test-customer',
    shipping_method: 'standard'
  });

  console.log('🇮🇳 India Test Results:');
  console.log(`Domestic Delivery: ${indiaQuote.calculation_steps.domestic_delivery}`);
  console.log('Domestic Delivery Details:', indiaQuote.calculation_steps.domestic_delivery_details);
  console.log(`Customer Currency: ${indiaQuote.inputs.origin_currency} → Customer Display`);
  console.log('Applied Exchange Rate:', indiaQuote.applied_rates.exchange_rate);
  
  console.log('\n---\n');
  
  // Test Nepal delivery (NPR → Customer Currency)
  const nepalQuote = await simplifiedQuoteCalculator.calculate({
    items: [
      {
        name: 'Test Product',
        quantity: 1,
        costprice_origin: 100,
        weight_kg: 1.0
      }
    ],
    origin_currency: 'USD',
    origin_country: 'US', 
    destination_country: 'NP',
    destination_address: {
      city: 'Kathmandu',
      district: 'Kathmandu'
    },
    ncm_service_type: 'pickup',
    customer_id: 'test-customer',
    shipping_method: 'standard'
  });

  console.log('🇳🇵 Nepal Test Results:');
  console.log(`Domestic Delivery: ${nepalQuote.calculation_steps.domestic_delivery}`);
  console.log('Domestic Delivery Details:', nepalQuote.calculation_steps.domestic_delivery_details);
  console.log(`Customer Currency: ${nepalQuote.inputs.origin_currency} → Customer Display`);
  console.log('Applied Exchange Rate:', nepalQuote.applied_rates.exchange_rate);
  
  console.log('\n✅ Test completed!');
  
  // Verify the fix
  console.log('\n🔍 Verification:');
  console.log('1. Both calculations should show domestic_delivery_details object');
  console.log('2. India should show INR → Customer Currency conversion');
  console.log('3. Nepal should show NPR → Customer Currency conversion');
  console.log('4. All amounts should be in customer currency for consistent display');
}

testDomesticDeliveryFix().catch(console.error);