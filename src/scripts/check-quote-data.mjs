import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkQuoteData() {
  console.log('🔍 Deep Dive: Quote Data Structure\n');
  
  // Fetch the quote with all fields
  const { data: quote, error } = await supabase
    .from('quotes_v2')
    .select('*')
    .eq('id', 'ed891ef2-436a-44b4-87dd-eeea31f3eadc')
    .single();
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('📋 Complete Quote Data:');
  console.log('ID:', quote.id);
  console.log('Customer ID:', quote.customer_id);
  console.log('Customer Email:', quote.customer_email);
  console.log('Status:', quote.status);
  console.log('Total USD:', quote.total_usd);
  console.log('Currency:', quote.currency);
  console.log('Destination:', quote.destination_country);
  console.log('Created:', quote.created_at);
  console.log('Updated:', quote.updated_at);
  
  console.log('\n📦 Items Data:');
  if (quote.items && Array.isArray(quote.items)) {
    quote.items.forEach((item, index) => {
      console.log(`Item ${index + 1}:`, JSON.stringify(item, null, 2));
    });
  } else {
    console.log('No items found or items is not an array');
  }
  
  console.log('\n🧮 Calculation Data:');
  if (quote.calculation_data) {
    console.log('Full calculation_data:', JSON.stringify(quote.calculation_data, null, 2));
  } else {
    console.log('No calculation_data found');
  }
  
  console.log('\n🎫 Discount Information:');
  console.log('Discount Codes:', quote.discount_codes);
  console.log('Applied Discounts:', quote.applied_discounts);
  
  console.log('\n📋 Other Relevant Fields:');
  console.log('Notes:', quote.notes);
  console.log('Admin Notes:', quote.admin_notes);
  console.log('Shipping Method:', quote.shipping_method);
  console.log('Payment Gateway:', quote.payment_gateway);
  
  // Check if this quote was created with V1 or V2 calculator
  if (quote.calculation_data) {
    const hasV2Fields = quote.calculation_data.calculation_version === 'v2' || 
                       quote.calculation_data.component_discounts !== undefined ||
                       quote.calculation_data.discounted_shipping_cost !== undefined;
    
    console.log('\n🔍 Calculator Version Detection:');
    console.log('Has V2 Fields:', hasV2Fields);
    console.log('Calculation Version:', quote.calculation_data.calculation_version || 'Unknown');
    
    if (!hasV2Fields) {
      console.log('❌ This quote appears to use the OLD calculator structure');
      console.log('   It needs to be recalculated with V2 to show component discounts');
    }
  }
  
  // Check if there are any test quotes with DASHAIN2025
  console.log('\n🔍 Checking for quotes with DASHAIN2025...');
  const { data: dashainQuotes } = await supabase
    .from('quotes_v2')
    .select('id, total_usd, discount_codes, calculation_data')
    .contains('discount_codes', ['DASHAIN2025'])
    .limit(5);
    
  if (dashainQuotes && dashainQuotes.length > 0) {
    console.log('Found quotes with DASHAIN2025:');
    dashainQuotes.forEach(q => {
      console.log(`   Quote ${q.id}:`);
      console.log(`     Total: $${q.total_usd}`);
      console.log(`     Has component_discounts: ${!!q.calculation_data?.component_discounts}`);
    });
  } else {
    console.log('No quotes found with DASHAIN2025 code');
  }
}

checkQuoteData().catch(console.error);