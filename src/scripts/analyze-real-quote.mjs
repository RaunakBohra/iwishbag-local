import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function analyzeRealQuote() {
  console.log('🔍 Analyzing Real Quote: ed891ef2-436a-44b4-87dd-eeea31f3eadc\n');
  
  // 1. Fetch the quote
  const { data: quote, error: quoteError } = await supabase
    .from('quotes_v2')
    .select('*')
    .eq('id', 'ed891ef2-436a-44b4-87dd-eeea31f3eadc')
    .single();
    
  if (quoteError || !quote) {
    console.error('❌ Quote not found:', quoteError);
    return;
  }
  
  console.log('1️⃣ Quote Basic Info:');
  console.log('   ID:', quote.id);
  console.log('   Customer ID:', quote.customer_id);
  console.log('   Destination:', quote.destination_country);
  console.log('   Status:', quote.status);
  console.log('   Total USD:', quote.total_usd);
  console.log('   Has Discount Codes:', quote.discount_codes?.length || 0);
  if (quote.discount_codes) {
    console.log('   Discount Codes:', quote.discount_codes);
  }
  
  // 2. Analyze the calculation_data
  if (quote.calculation_data) {
    console.log('\n2️⃣ Calculation Breakdown:');
    const calc = quote.calculation_data;
    
    console.log('   Items Subtotal:', calc.items_subtotal);
    console.log('   Shipping Cost:', calc.shipping_cost);
    console.log('   Discounted Shipping:', calc.discounted_shipping_cost);
    console.log('   Customs Duty:', calc.customs_duty);
    console.log('   Discounted Customs:', calc.discounted_customs_duty);
    console.log('   Handling Fee:', calc.handling_fee);
    console.log('   Discounted Handling:', calc.discounted_handling_fee);
    console.log('   Delivery:', calc.domestic_delivery);
    console.log('   Discounted Delivery:', calc.discounted_delivery);
    console.log('   Taxes:', calc.local_tax_amount);
    console.log('   Discounted Taxes:', calc.discounted_tax_amount);
    console.log('   Total Savings:', calc.total_savings);
    
    // Check component discounts
    if (calc.component_discounts) {
      console.log('\n💰 Component Discounts Applied:');
      Object.entries(calc.component_discounts).forEach(([component, details]) => {
        console.log(`   ${component.toUpperCase()}:`);
        console.log(`     Original: $${details.original}`);
        console.log(`     Discount: $${details.discount}`);
        console.log(`     Final: $${details.final}`);
        if (details.applied_discounts) {
          details.applied_discounts.forEach(d => {
            console.log(`     - ${d.description}: $${d.amount}`);
          });
        }
      });
    } else {
      console.log('\n⚠️  NO COMPONENT DISCOUNTS FOUND!');
      console.log('   This suggests the component discount logic is not working');
    }
    
    // Check for any order-level discounts
    if (calc.order_discount_amount > 0) {
      console.log('\n📋 Order-Level Discount:');
      console.log('   Order Discount Amount:', calc.order_discount_amount);
      console.log('   This might be incorrectly applied to total instead of components');
    }
  }
  
  // 3. Check if discount codes are valid and what they should apply to
  if (quote.discount_codes && quote.discount_codes.length > 0) {
    console.log('\n3️⃣ Discount Code Analysis:');
    
    for (const code of quote.discount_codes) {
      const { data: discountCode } = await supabase
        .from('discount_codes')
        .select(`
          *,
          discount_type:discount_types(*)
        `)
        .eq('code', code.toUpperCase())
        .single();
        
      if (discountCode) {
        console.log(`   Code: ${code}`);
        console.log(`   Type: ${discountCode.discount_type?.type}`);
        console.log(`   Value: ${discountCode.discount_type?.value}%`);
        console.log(`   Applicable Components: ${discountCode.discount_type?.applicable_components}`);
        console.log(`   Conditions: ${JSON.stringify(discountCode.discount_type?.conditions)}`);
        
        // Check country-specific rules
        const { data: countryRules } = await supabase
          .from('country_discount_rules')
          .select('*')
          .eq('discount_type_id', discountCode.discount_type_id)
          .eq('country_code', quote.destination_country);
          
        if (countryRules && countryRules.length > 0) {
          console.log(`   Country Rules (${quote.destination_country}):`, countryRules[0].component_discounts);
        }
      }
    }
  }
  
  // 4. Diagnose the issue
  console.log('\n4️⃣ Issue Diagnosis:');
  
  if (!quote.calculation_data?.component_discounts) {
    console.log('❌ ISSUE FOUND: No component_discounts in calculation_data');
    console.log('   This means the SimplifiedQuoteCalculator is not applying component discounts');
    console.log('   Possible causes:');
    console.log('   1. apply_component_discounts flag not set to true');
    console.log('   2. DiscountService.getComponentDiscounts not finding discounts');
    console.log('   3. Component discount application logic not working');
  }
  
  if (quote.calculation_data?.order_discount_amount > 0 && !quote.calculation_data?.component_discounts) {
    console.log('❌ ISSUE CONFIRMED: Discount applied to order total instead of components');
    console.log('   The discount is being treated as an order-level discount');
    console.log('   This bypasses the component-specific discount logic');
  }
  
  // 5. Test what the calculation should look like
  console.log('\n5️⃣ Expected Calculation (if working correctly):');
  
  if (quote.discount_codes?.includes('DASHAIN2025') && quote.destination_country === 'NP') {
    const items = quote.calculation_data?.items_subtotal || 0;
    const shipping = quote.calculation_data?.shipping_cost || 0;
    const customs = quote.calculation_data?.customs_duty || 0;
    const handling = quote.calculation_data?.handling_fee || 0;
    
    console.log('   Expected DASHAIN2025 discounts for Nepal:');
    console.log(`   Shipping: $${shipping} → $${(shipping * 0.8).toFixed(2)} (20% off)`);
    console.log(`   Customs: $${customs} → $${(customs * 0.9).toFixed(2)} (10% off)`);
    console.log(`   Handling: $${handling} → $${(handling * 0.85).toFixed(2)} (15% off)`);
    
    const expectedSavings = (shipping * 0.2) + (customs * 0.1) + (handling * 0.15);
    console.log(`   Expected Total Savings: $${expectedSavings.toFixed(2)}`);
    console.log(`   Actual Total Savings: $${quote.calculation_data?.total_savings || 0}`);
  }
  
  console.log('\n🔧 RECOMMENDATION:');
  console.log('The quote calculation is using old discount logic that applies to total instead of components.');
  console.log('Need to investigate why apply_component_discounts is not working in the real calculator.');
}

analyzeRealQuote().catch(console.error);