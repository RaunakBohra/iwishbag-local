// Script to update PayU configuration from test to production credentials
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://localhost:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updatePayUToProduction() {
  console.log('🔧 Updating PayU configuration to PRODUCTION...');
  
  // PRODUCTION PayU credentials - Replace these with your actual production credentials
  const productionConfig = {
    merchant_id: process.env.PAYU_MERCHANT_ID || 'YOUR_PRODUCTION_MERCHANT_ID',
    merchant_key: process.env.PAYU_MERCHANT_KEY || 'YOUR_PRODUCTION_MERCHANT_KEY',
    salt_key: process.env.PAYU_SALT_KEY || 'YOUR_PRODUCTION_SALT_KEY',
    payment_url: 'https://secure.payu.in/_payment' // Production URL
  };
  
  console.log('Production config:', productionConfig);
  
  // Check if we have all required credentials
  if (!productionConfig.merchant_id || productionConfig.merchant_id === 'YOUR_PRODUCTION_MERCHANT_ID') {
    console.error('❌ Missing PayU production credentials!');
    console.log('Please set the following environment variables:');
    console.log('- PAYU_MERCHANT_ID');
    console.log('- PAYU_MERCHANT_KEY');
    console.log('- PAYU_SALT_KEY');
    console.log('');
    console.log('Or update the productionConfig object in this script with your actual credentials.');
    return;
  }
  
  try {
    // Update PayU configuration to production
    const { data, error } = await supabase
      .from('payment_gateways')
      .update({
        config: productionConfig,
        test_mode: false, // Set to false for production
        updated_at: new Date().toISOString()
      })
      .eq('code', 'payu')
      .select();

    if (error) {
      console.error('❌ Error updating PayU config:', error);
      return;
    }

    console.log('✅ PayU configuration updated to PRODUCTION successfully!');
    console.log('Updated config:', data[0]?.config);
    
    // Verify the update
    const { data: verifyData, error: verifyError } = await supabase
      .from('payment_gateways')
      .select('*')
      .eq('code', 'payu')
      .single();

    if (verifyError) {
      console.error('❌ Error verifying config:', verifyError);
      return;
    }

    console.log('\n🔍 Verification:');
    console.log('Merchant ID:', verifyData.config?.merchant_id);
    console.log('Merchant Key:', verifyData.config?.merchant_key);
    console.log('Salt Key:', verifyData.config?.salt_key);
    console.log('Payment URL:', verifyData.config?.payment_url);
    console.log('Test Mode:', verifyData.test_mode);
    
    if (verifyData.config?.merchant_id && verifyData.config?.merchant_key && verifyData.config?.salt_key) {
      console.log('\n🎉 PayU configuration is now set to PRODUCTION!');
      console.log('⚠️  IMPORTANT: Make sure to deploy this to your production environment.');
    } else {
      console.log('\n⚠️ PayU configuration is still incomplete.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

updatePayUToProduction(); 