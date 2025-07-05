// Script to update PayU configuration with test credentials
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://localhost:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updatePayUConfig() {
  console.log('🔧 Updating PayU configuration...');
  
  try {
    // Update PayU configuration with test credentials
    const { data, error } = await supabase
      .from('payment_gateways')
      .update({
        config: {
          merchant_id: 'gtKFFx',
          merchant_key: 'eCwWELxi',
          salt_key: '4R38IvwiV57FwVpsgOvTXBdLE4tHUXFW'
        },
        test_mode: true
      })
      .eq('code', 'payu')
      .select();

    if (error) {
      console.error('❌ Error updating PayU config:', error);
      return;
    }

    console.log('✅ PayU configuration updated successfully!');
    console.log('Updated config:', data[0]);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

updatePayUConfig(); 