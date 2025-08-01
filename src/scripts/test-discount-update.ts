import { supabase } from '../integrations/supabase/client';

async function testDiscountUpdate() {
  console.log('🔍 Testing Discount Component Update\n');
  
  // First, let's check the current Dashain2025 campaign
  console.log('1️⃣ Checking current Dashain2025 campaign...');
  const { data: campaign, error: campaignError } = await supabase
    .from('discount_campaigns')
    .select(`
      *,
      discount_type:discount_types(*)
    `)
    .eq('name', 'Dashain2025')
    .single();
    
  if (campaignError) {
    console.error('Error fetching campaign:', campaignError);
    return;
  }
  
  console.log('Campaign ID:', campaign.id);
  console.log('Discount Type ID:', campaign.discount_type_id);
  console.log('Current applicable_components:', campaign.discount_type?.applicable_components);
  console.log('Current conditions:', campaign.discount_type?.conditions);
  
  // Test updating the discount type with shipping and customs components
  console.log('\n2️⃣ Testing update with shipping and customs components...');
  
  const { error: updateError } = await supabase
    .from('discount_types')
    .update({
      applicable_components: ['shipping', 'customs', 'handling'],
      conditions: {
        min_order: 50,
        max_discount: null,
        applicable_to: ['shipping', 'customs', 'handling'],
        stacking_allowed: true,
        description: 'Dashain special - discounts on shipping, customs, and handling'
      }
    })
    .eq('id', campaign.discount_type_id);
    
  if (updateError) {
    console.error('Error updating discount type:', updateError);
    return;
  }
  
  console.log('✅ Update successful!');
  
  // Verify the update
  console.log('\n3️⃣ Verifying the update...');
  const { data: updatedType, error: verifyError } = await supabase
    .from('discount_types')
    .select('*')
    .eq('id', campaign.discount_type_id)
    .single();
    
  if (verifyError) {
    console.error('Error verifying update:', verifyError);
    return;
  }
  
  console.log('Updated applicable_components:', updatedType.applicable_components);
  console.log('Updated conditions:', updatedType.conditions);
  
  // Check if country-specific rules exist for Nepal
  console.log('\n4️⃣ Checking country-specific rules for Nepal...');
  const { data: countryRule, error: countryError } = await supabase
    .from('country_discount_rules')
    .select('*')
    .eq('discount_type_id', campaign.discount_type_id)
    .eq('country_code', 'NP')
    .single();
    
  if (countryError && countryError.code !== 'PGRST116') {
    console.error('Error fetching country rule:', countryError);
  } else if (countryRule) {
    console.log('Country rule exists:', countryRule);
    console.log('Component discounts:', countryRule.component_discounts);
  } else {
    console.log('No country-specific rule found. Creating one...');
    
    // Create country-specific rule
    const { error: createError } = await supabase
      .from('country_discount_rules')
      .insert({
        discount_type_id: campaign.discount_type_id,
        country_code: 'NP',
        component_discounts: {
          customs: 10,
          shipping: 20,
          handling: 15
        },
        min_order_amount: 50
      });
      
    if (createError) {
      console.error('Error creating country rule:', createError);
    } else {
      console.log('✅ Country-specific rule created!');
    }
  }
  
  // Test discount calculation with the updated components
  console.log('\n5️⃣ Testing discount calculation...');
  const testQuote = {
    items: [{ quantity: 5, unit_price_usd: 50, weight_kg: 0.3 }],
    origin_country: 'US',
    destination_country: 'NP',
    destination_state: 'urban',
    shipping_method: 'standard' as const,
    payment_gateway: 'stripe' as const,
    apply_component_discounts: true,
    customer_id: 'test-customer',
    discount_codes: ['DASHAIN2025']
  };
  
  console.log('Test quote:', testQuote);
  console.log('Items total: $250');
  
  // Import and use the calculator
  const { SimplifiedQuoteCalculator } = await import('../services/SimplifiedQuoteCalculator');
  const calculator = new SimplifiedQuoteCalculator();
  
  try {
    const result = await calculator.calculate(testQuote);
    
    console.log('\n📊 Calculation Results:');
    console.log('Items Subtotal:', result.calculation_steps.items_subtotal);
    console.log('Shipping Cost:', result.calculation_steps.shipping_cost);
    console.log('Customs Duty:', result.calculation_steps.customs_duty);
    console.log('Handling Fee:', result.calculation_steps.handling_fee);
    
    if (result.calculation_steps.component_discounts) {
      console.log('\n💰 Component Discounts Applied:');
      Object.entries(result.calculation_steps.component_discounts).forEach(([component, details]) => {
        console.log(`\n${component.toUpperCase()}:`);
        console.log(`  Original: $${details.original}`);
        console.log(`  Discount: $${details.discount}`);
        console.log(`  Final: $${details.final}`);
      });
    } else {
      console.log('\n⚠️  No component discounts were applied!');
    }
    
    console.log('\nTotal Savings:', result.calculation_steps.total_savings);
  } catch (calcError) {
    console.error('Error calculating quote:', calcError);
  }
}

// Run the test
testDiscountUpdate().catch(console.error);