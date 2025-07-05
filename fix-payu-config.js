// Script to fix PayU configuration
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://localhost:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixPayUConfig() {
  console.log('🔧 Fixing PayU configuration...');
  
  try {
    // First, let's check the current configuration
    const { data: currentData, error: fetchError } = await supabase
      .from('payment_gateways')
      .select('*')
      .eq('code', 'payu')
      .single();

    if (fetchError) {
      console.error('❌ Error fetching current config:', fetchError);
      return;
    }

    console.log('Current config:', currentData.config);

    // Update PayU configuration with test credentials
    const { data, error } = await supabase
      .from('payment_gateways')
      .update({
        config: {
          merchant_id: 'gtKFFx',
          merchant_key: 'eCwWELxi',
          salt_key: '4R38IvwiV57FwVpsgOvTXBdLE4tHUXFW'
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
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixPayUConfig(); 