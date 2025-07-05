// Script to fix PayU configuration using service role
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://localhost:54321';
// Use service role key to bypass RLS
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixPayUWithServiceRole() {
  console.log('🔧 Fixing PayU configuration using service role...');
  
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
    
    // Update the configuration using service role
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

fixPayUWithServiceRole(); 