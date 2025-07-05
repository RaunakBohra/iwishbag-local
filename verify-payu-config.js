// Script to verify PayU configuration
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://localhost:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyPayUConfig() {
  console.log('🔍 Verifying PayU configuration...');
  
  try {
    // Get PayU configuration
    const { data, error } = await supabase
      .from('payment_gateways')
      .select('*')
      .eq('code', 'payu')
      .single();

    if (error) {
      console.error('❌ Error fetching PayU config:', error);
      return;
    }

    console.log('✅ PayU configuration:');
    console.log('Name:', data.name);
    console.log('Code:', data.code);
    console.log('Active:', data.is_active);
    console.log('Test Mode:', data.test_mode);
    console.log('Supported Countries:', data.supported_countries);
    console.log('Supported Currencies:', data.supported_currencies);
    console.log('Config:', data.config);
    
    // Check if configuration is complete
    const hasMerchantId = !!data.config?.merchant_id;
    const hasMerchantKey = !!data.config?.merchant_key;
    const hasSaltKey = !!data.config?.salt_key;
    
    console.log('\n🔧 Configuration Check:');
    console.log('Merchant ID:', hasMerchantId ? '✅ Present' : '❌ Missing');
    console.log('Merchant Key:', hasMerchantKey ? '✅ Present' : '❌ Missing');
    console.log('Salt Key:', hasSaltKey ? '✅ Present' : '❌ Missing');
    
    if (hasMerchantId && hasMerchantKey && hasSaltKey) {
      console.log('\n🎉 PayU configuration is complete and ready to use!');
    } else {
      console.log('\n⚠️ PayU configuration is incomplete. Please check the configuration.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

verifyPayUConfig(); 