// Test different JSON structures for PayU config
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = 'http://localhost:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixPayUJSON() {
  console.log('🔧 Testing different JSON structures for PayU config...');
  
  // Get values from environment variables
  const merchantId = process.env.PAYU_MERCHANT_ID;
  const merchantKey = process.env.PAYU_MERCHANT_KEY;
  const saltKey = process.env.PAYU_SALT_KEY;
  const paymentUrl = process.env.PAYU_PAYMENT_URL;
  
  console.log('Environment variables:');
  console.log('PAYU_MERCHANT_ID:', merchantId);
  console.log('PAYU_MERCHANT_KEY:', merchantKey);
  console.log('PAYU_SALT_KEY:', saltKey);
  console.log('PAYU_PAYMENT_URL:', paymentUrl);
  
  if (!merchantId || !merchantKey || !saltKey) {
    console.error('❌ Missing required PayU environment variables!');
    return;
  }
  
  try {
    // Test 1: Simple object
    console.log('\n🧪 Test 1: Simple object');
    const config1 = {
      merchant_id: merchantId,
      merchant_key: merchantKey,
      salt_key: saltKey,
      payment_url: paymentUrl || 'https://test.payu.in/_payment'
    };
    
    const { data: data1, error: error1 } = await supabase
      .from('payment_gateways')
      .update({
        config: config1,
        updated_at: new Date().toISOString()
      })
      .eq('code', 'payu')
      .select();

    if (error1) {
      console.error('❌ Error with simple object:', error1);
    } else {
      console.log('✅ Simple object update successful');
      console.log('Result:', data1);
    }

    // Test 2: JSON string
    console.log('\n🧪 Test 2: JSON string');
    const config2 = JSON.stringify({
      merchant_id: merchantId,
      merchant_key: merchantKey,
      salt_key: saltKey,
      payment_url: paymentUrl || 'https://test.payu.in/_payment'
    });
    
    const { data: data2, error: error2 } = await supabase
      .from('payment_gateways')
      .update({
        config: config2,
        updated_at: new Date().toISOString()
      })
      .eq('code', 'payu')
      .select();

    if (error2) {
      console.error('❌ Error with JSON string:', error2);
    } else {
      console.log('✅ JSON string update successful');
      console.log('Result:', data2);
    }

    // Test 3: Using jsonb_build_object equivalent
    console.log('\n🧪 Test 3: Manual object construction');
    const config3 = {
      merchant_id: merchantId,
      merchant_key: merchantKey,
      salt_key: saltKey,
      payment_url: paymentUrl || 'https://test.payu.in/_payment'
    };
    
    const { data: data3, error: error3 } = await supabase
      .from('payment_gateways')
      .update({
        config: config3,
        updated_at: new Date().toISOString()
      })
      .eq('code', 'payu')
      .select();

    if (error3) {
      console.error('❌ Error with manual object:', error3);
    } else {
      console.log('✅ Manual object update successful');
      console.log('Result:', data3);
    }
    
    // Verify final state
    console.log('\n🔍 Final verification:');
    const { data: verifyData, error: verifyError } = await supabase
      .from('payment_gateways')
      .select('*')
      .eq('code', 'payu')
      .single();

    if (verifyError) {
      console.error('❌ Error verifying config:', verifyError);
      return;
    }

    console.log('Final config:', JSON.stringify(verifyData.config, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixPayUJSON(); 