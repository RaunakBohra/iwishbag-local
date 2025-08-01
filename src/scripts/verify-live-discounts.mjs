import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyLiveDiscounts() {
  console.log('🔍 VERIFYING LIVE DISCOUNT SYSTEM IN DATABASE\n');
  
  // 1. Check if discount codes exist and are active
  console.log('1️⃣ Checking discount codes...');
  const { data: discountCodes } = await supabase
    .from('discount_codes')
    .select(`
      code, 
      is_active, 
      usage_count, 
      usage_limit,
      discount_type:discount_types(
        name, 
        type, 
        value, 
        applicable_components, 
        is_active
      )
    `)
    .eq('is_active', true);
  
  if (discountCodes && discountCodes.length > 0) {
    console.log('✅ Active discount codes found:');
    discountCodes.forEach(code => {
      console.log(`   Code: ${code.code}`);
      console.log(`   Type: ${code.discount_type?.type} (${code.discount_type?.value}%)`);
      console.log(`   Components: ${code.discount_type?.applicable_components?.join(', ')}`);
      console.log(`   Usage: ${code.usage_count}/${code.usage_limit || '∞'}`);
      console.log(`   Active: ${code.discount_type?.is_active}`);
      console.log('   ---');
    });
  } else {
    console.log('❌ No active discount codes found');
  }
  
  // 2. Check country-specific discount rules
  console.log('\n2️⃣ Checking country-specific rules...');
  const { data: countryRules } = await supabase
    .from('country_discount_rules')
    .select(`
      country_code,
      component_discounts,
      min_order_amount,
      discount_type:discount_types(name, is_active)
    `);
    
  if (countryRules && countryRules.length > 0) {
    console.log('✅ Country-specific rules found:');
    countryRules.forEach(rule => {
      console.log(`   Country: ${rule.country_code}`);
      console.log(`   Discount Type: ${rule.discount_type?.name} (Active: ${rule.discount_type?.is_active})`);
      console.log(`   Components: ${JSON.stringify(rule.component_discounts)}`);
      console.log(`   Min Order: $${rule.min_order_amount || 'None'}`);
      console.log('   ---');
    });
  } else {
    console.log('❌ No country-specific rules found');
  }
  
  // 3. Check if any quotes actually have discount codes applied
  console.log('\n3️⃣ Checking quotes with discount codes...');
  const { data: quotesWithDiscounts } = await supabase
    .from('quotes_v2')
    .select('id, customer_email, discount_codes, total_usd, calculation_data')
    .not('discount_codes', 'is', null)
    .limit(5);
    
  if (quotesWithDiscounts && quotesWithDiscounts.length > 0) {
    console.log('✅ Quotes with discount codes found:');
    quotesWithDiscounts.forEach(quote => {
      console.log(`   Quote ID: ${quote.id}`);
      console.log(`   Customer: ${quote.customer_email}`);
      console.log(`   Codes: ${quote.discount_codes?.join(', ')}`);
      console.log(`   Total: $${quote.total_usd}`);
      
      // Check if component discounts are in calculation_data
      const hasComponentDiscounts = quote.calculation_data?.calculation_steps?.component_discounts;
      console.log(`   Has Component Discounts: ${!!hasComponentDiscounts}`);
      
      if (hasComponentDiscounts) {
        const components = Object.keys(hasComponentDiscounts);
        console.log(`   Discounted Components: ${components.join(', ')}`);
        
        components.forEach(component => {
          const discount = hasComponentDiscounts[component];
          console.log(`     ${component}: $${discount.original} → $${discount.final} (saved $${discount.discount})`);
        });
      }
      console.log('   ---');
    });
  } else {
    console.log('❌ No quotes with discount codes found');
  }
  
  // 4. Test a real discount calculation
  console.log('\n4️⃣ Testing live discount calculation...');
  
  // Try to validate DASHAIN2025 code
  const testCustomerEmail = 'component-test@example.com';
  
  try {
    // Use the DiscountService validation (simulated)
    const { data: dashainCode } = await supabase
      .from('discount_codes')
      .select(`
        *,
        discount_type:discount_types(*),
        campaign:discount_campaigns(*)
      `)
      .eq('code', 'DASHAIN2025')
      .single();
      
    if (dashainCode) {
      console.log('✅ DASHAIN2025 validation:');
      console.log(`   Valid: ${dashainCode.is_active}`);
      console.log(`   Applicable Components: ${dashainCode.discount_type?.applicable_components?.join(', ')}`);
      
      // Check if it would work for Nepal
      const { data: nepalRule } = await supabase
        .from('country_discount_rules')
        .select('*')
        .eq('discount_type_id', dashainCode.discount_type_id)
        .eq('country_code', 'NP')
        .single();
        
      if (nepalRule) {
        console.log(`   Nepal Rule: ${JSON.stringify(nepalRule.component_discounts)}`);
        console.log(`   Min Order: $${nepalRule.min_order_amount || 0}`);
        
        // Test order values
        const testOrder = { total: 250, country: 'NP' };
        const meetsMinimum = testOrder.total >= (nepalRule.min_order_amount || 0);
        console.log(`   Test Order ($${testOrder.total}) Qualifies: ${meetsMinimum}`);
      } else {
        console.log('   ❌ No Nepal-specific rule found');
      }
    } else {
      console.log('   ❌ DASHAIN2025 code not found');
    }
  } catch (error) {
    console.error('   ❌ Error testing discount:', error.message);
  }
  
  // 5. Check the actual test quote I created
  console.log('\n5️⃣ Checking test quote 6a89db1c-7bdc-4f4a-8fd4-673b4d548faa...');
  const { data: testQuote } = await supabase
    .from('quotes_v2')
    .select('*')
    .eq('id', '6a89db1c-7bdc-4f4a-8fd4-673b4d548faa')
    .single();
    
  if (testQuote) {
    console.log('✅ Test quote found:');
    console.log(`   Customer ID: ${testQuote.customer_id}`);
    console.log(`   Customer Email: ${testQuote.customer_email}`);
    console.log(`   Discount Codes: ${testQuote.discount_codes?.join(', ') || 'None'}`);
    console.log(`   Total USD: $${testQuote.total_usd}`);
    console.log(`   Destination: ${testQuote.destination_country}`);
    
    const calcData = testQuote.calculation_data?.calculation_steps;
    if (calcData) {
      console.log(`   Total Savings: $${calcData.total_savings || 0}`);
      console.log(`   Has Component Discounts: ${!!calcData.component_discounts}`);
      
      if (calcData.component_discounts) {
        Object.entries(calcData.component_discounts).forEach(([component, details]) => {
          console.log(`   ${component.toUpperCase()}: $${details.original} → $${details.final} (${details.discount} saved)`);
        });
      }
    }
  } else {
    console.log('❌ Test quote not found');
  }
  
  console.log('\n🎯 FINAL ASSESSMENT:');
  console.log('The component discount system will work if:');
  console.log('1. ✅ Discount codes exist and are active');
  console.log('2. ✅ Country rules exist with component breakdowns');
  console.log('3. ✅ V2 QuoteCalculator passes apply_component_discounts=true');
  console.log('4. ✅ Customer ID is provided (not null)');
  console.log('5. ✅ Discount codes array is passed');
  console.log('\nTo test properly: Create a new quote with customer email, add DASHAIN2025 code, destination Nepal');
}

verifyLiveDiscounts().catch(console.error);