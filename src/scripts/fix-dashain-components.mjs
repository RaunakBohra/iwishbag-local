import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixDashainComponents() {
  console.log('🔧 Fixing DASHAIN2025 Component Configuration\n');
  
  // 1. Find the DASHAIN2025 discount type
  const { data: discountCode } = await supabase
    .from('discount_codes')
    .select('*, discount_type:discount_types(*)')
    .eq('code', 'DASHAIN2025')
    .single();
    
  if (!discountCode) {
    console.log('❌ DASHAIN2025 not found');
    return;
  }
  
  console.log('1️⃣ Current DASHAIN2025 configuration:');
  console.log('   Discount Type ID:', discountCode.discount_type_id);
  console.log('   Current Components:', discountCode.discount_type?.applicable_components);
  
  // 2. Check what components have country-specific rules
  const { data: countryRule } = await supabase
    .from('country_discount_rules')
    .select('*')
    .eq('discount_type_id', discountCode.discount_type_id)
    .eq('country_code', 'NP')
    .single();
    
  if (countryRule) {
    console.log('   Country Rule Components:', Object.keys(countryRule.component_discounts));
    
    // 3. Update the discount type to include all components that have country rules
    const requiredComponents = Object.keys(countryRule.component_discounts);
    
    console.log('\n2️⃣ Updating discount_type applicable_components...');
    console.log('   Setting components to:', requiredComponents);
    
    const { error: updateError } = await supabase
      .from('discount_types')
      .update({
        applicable_components: requiredComponents
      })
      .eq('id', discountCode.discount_type_id);
      
    if (updateError) {
      console.error('❌ Update failed:', updateError);
      return;
    }
    
    // 4. Verify the update
    console.log('\n3️⃣ Verifying update...');
    const { data: updatedType } = await supabase
      .from('discount_types')
      .select('*')
      .eq('id', discountCode.discount_type_id)
      .single();
      
    console.log('   Updated Components:', updatedType.applicable_components);
    
    if (JSON.stringify(updatedType.applicable_components.sort()) === JSON.stringify(requiredComponents.sort())) {
      console.log('   ✅ SUCCESS: Components updated correctly!');
    } else {
      console.log('   ❌ MISMATCH: Update may not have worked');
    }
    
    // 5. Test the component logic
    console.log('\n4️⃣ Testing component discount logic...');
    
    // Simulate DiscountService.getDiscountComponents
    function getDiscountComponents(discount) {
      if (discount.applies_to === 'all_fees') {
        return ['customs', 'handling', 'taxes', 'delivery'];
      }
      return [discount.applies_to];
    }
    
    // Create mock discount objects for each component
    const mockDiscounts = requiredComponents.map(component => ({
      discount_source: 'country',
      discount_type: 'percentage',
      discount_value: countryRule.component_discounts[component],
      applies_to: component,
      is_stackable: true,
      description: `NP special: ${countryRule.component_discounts[component]}% off ${component}`
    }));
    
    console.log('   Mock discounts created:');
    mockDiscounts.forEach(d => {
      const components = getDiscountComponents(d);
      console.log(`     ${d.description} → affects: [${components.join(', ')}]`);
    });
    
    // 6. Final verification query
    console.log('\n5️⃣ Final database verification...');
    const { data: finalCheck } = await supabase
      .from('discount_codes')
      .select(`
        code,
        discount_type:discount_types(
          name, 
          applicable_components,
          conditions
        ),
        campaign:discount_campaigns(name, is_active)
      `)
      .eq('code', 'DASHAIN2025')
      .single();
      
    console.log('   Final Configuration:');
    console.log('   Code:', finalCheck.code);
    console.log('   Components:', finalCheck.discount_type?.applicable_components);
    console.log('   Campaign Active:', finalCheck.campaign?.is_active);
    
    console.log('\n✅ DASHAIN2025 COMPONENT FIX COMPLETE!');
    console.log('\nNow test at: http://localhost:8083/v2/quote-calculator');
    console.log('Expected behavior:');
    console.log('- Shipping: 20% discount + 10% base = ~28% total');
    console.log('- Customs: 10% discount');
    console.log('- Handling: 15% discount');
    console.log('- Delivery: NO discount (should remain original price)');
    console.log('- Taxes: NO discount (should remain original price)');
  } else {
    console.log('   ❌ No country rule found for Nepal');
  }
}

fixDashainComponents().catch(console.error);