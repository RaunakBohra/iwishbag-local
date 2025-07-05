// Script to fix PayU configuration as admin user
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://localhost:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixPayUAsAdmin() {
  console.log('🔧 Fixing PayU configuration as admin...');
  
  // Get environment variables
  const merchantId = process.env.PAYU_MERCHANT_ID || '8725115';
  const merchantKey = process.env.PAYU_MERCHANT_KEY || 'u7Ui5I';
  const saltKey = process.env.PAYU_SALT_KEY || 'VIen2EwWiQbvsILF4Wt9p9Gh5ixOpSMe';
  const paymentUrl = process.env.PAYU_PAYMENT_URL || 'https://test.payu.in/_payment';
  
  console.log('Environment variables:');
  console.log('PAYU_MERCHANT_ID:', merchantId);
  console.log('PAYU_MERCHANT_KEY:', merchantKey);
  console.log('PAYU_SALT_KEY:', saltKey);
  console.log('PAYU_PAYMENT_URL:', paymentUrl);
  
  try {
    // First, try to sign in as admin
    const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'admin@example.com',
      password: 'admin123'
    });

    if (signInError) {
      console.log('❌ Could not sign in as admin, trying as anonymous user...');
    } else {
      console.log('✅ Signed in as admin user:', user?.email);
    }

    // Check current config
    const { data: currentData, error: fetchError } = await supabase
      .from('payment_gateways')
      .select('*')
      .eq('code', 'payu')
      .single();

    if (fetchError) {
      console.error('❌ Error fetching current config:', fetchError);
      return;
    }

    console.log('Current config before update:', currentData.config);
    
    // Try to update the configuration
    const { data, error } = await supabase
      .from('payment_gateways')
      .update({
        config: {
          merchant_id: merchantId,
          merchant_key: merchantKey,
          salt_key: saltKey,
          payment_url: paymentUrl
        },
        test_mode: true,
        updated_at: new Date().toISOString()
      })
      .eq('code', 'payu')
      .select();

    if (error) {
      console.error('❌ Error updating PayU config:', error);
      return;
    }

    console.log('✅ PayU configuration updated successfully!');
    console.log('Updated data:', data);
    
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
    console.log('Full config:', JSON.stringify(verifyData.config, null, 2));
    
    if (verifyData.config?.merchant_id && verifyData.config?.merchant_key && verifyData.config?.salt_key) {
      console.log('\n🎉 PayU configuration is complete and ready to use!');
    } else {
      console.log('\n⚠️ PayU configuration is still incomplete.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixPayUAsAdmin(); 