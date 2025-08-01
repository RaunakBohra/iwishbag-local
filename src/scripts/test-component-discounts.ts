import { simplifiedQuoteCalculator } from '../services/SimplifiedQuoteCalculator';

async function testComponentDiscounts() {
  const calculator = simplifiedQuoteCalculator;
  
  console.log('🧪 Testing Component-Based Discounts\n');
  
  // Test 1: Large order with customs waiver
  console.log('Test 1: $1200 order to Nepal (should get customs waiver)');
  const result1 = await calculator.calculate({
    items: [
      { quantity: 10, unit_price_usd: 120, weight_kg: 0.5 }
    ],
    origin_country: 'US',
    destination_country: 'NP',
    destination_state: 'urban',
    shipping_method: 'standard',
    payment_gateway: 'stripe',
    apply_component_discounts: true,
    customer_id: 'test-customer-1',
    is_first_order: false
  });
  
  console.log('Items Total:', result1.calculation_steps.items_subtotal);
  console.log('Customs Duty (Original):', result1.calculation_steps.customs_duty);
  console.log('Customs Discount:', result1.calculation_steps.customs_discount_amount);
  console.log('Customs Duty (Final):', result1.calculation_steps.discounted_customs_duty);
  console.log('Total Savings:', result1.calculation_steps.total_savings);
  
  if (result1.calculation_steps.component_discounts?.customs) {
    console.log('\nCustoms Discount Details:');
    const customsDiscount = result1.calculation_steps.component_discounts.customs;
    customsDiscount.applied_discounts.forEach(d => {
      console.log(`  - ${d.description}: $${d.amount}`);
    });
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Test 2: First-time customer with $600 order (handling fee waiver + first-time discount)
  console.log('Test 2: $600 first-time customer order (should get handling fee waiver)');
  const result2 = await calculator.calculate({
    items: [
      { quantity: 3, unit_price_usd: 200, weight_kg: 1.0 }
    ],
    origin_country: 'US',
    destination_country: 'IN',
    destination_state: 'urban',
    shipping_method: 'standard',
    payment_gateway: 'stripe',
    apply_component_discounts: true,
    customer_id: 'test-customer-2',
    is_first_order: true
  });
  
  console.log('Items Total:', result2.calculation_steps.items_subtotal);
  console.log('Handling Fee (Original):', result2.calculation_steps.handling_fee);
  console.log('Handling Discount:', result2.calculation_steps.handling_discount_amount);
  console.log('Handling Fee (Final):', result2.calculation_steps.discounted_handling_fee);
  
  if (result2.calculation_steps.component_discounts?.handling) {
    console.log('\nHandling Discount Details:');
    const handlingDiscount = result2.calculation_steps.component_discounts.handling;
    handlingDiscount.applied_discounts.forEach(d => {
      console.log(`  - ${d.description}: $${d.amount}`);
    });
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Test 3: Nepal order with country-specific discounts (if Dashain campaign is active)
  console.log('Test 3: Nepal order with country-specific discounts');
  const result3 = await calculator.calculate({
    items: [
      { quantity: 5, unit_price_usd: 50, weight_kg: 0.3 }
    ],
    origin_country: 'US',
    destination_country: 'NP',
    destination_state: 'urban',
    shipping_method: 'standard',
    payment_gateway: 'stripe',
    apply_component_discounts: true,
    customer_id: 'test-customer-3',
    discount_codes: ['DASHAIN2025']
  });
  
  console.log('Items Total:', result3.calculation_steps.items_subtotal);
  console.log('\nComponent Discounts Applied:');
  
  if (result3.calculation_steps.component_discounts) {
    Object.entries(result3.calculation_steps.component_discounts).forEach(([component, details]) => {
      console.log(`\n${component.toUpperCase()}:`);
      console.log(`  Original: $${details.original}`);
      console.log(`  Discount: $${details.discount}`);
      console.log(`  Final: $${details.final}`);
    });
  }
  
  console.log('\nTotal Savings:', result3.calculation_steps.total_savings);
}

// Run the test
testComponentDiscounts().catch(console.error);