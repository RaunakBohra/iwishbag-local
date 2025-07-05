// Check PayU policies and permissions
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://localhost:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPayUPolicies() {
  console.log('🔍 Checking PayU policies and permissions...');
  
  try {
    // Check current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('Current user:', user?.email);
    
    // Check if we can read the PayU record
    const { data: readData, error: readError } = await supabase
      .from('payment_gateways')
      .select('*')
      .eq('code', 'payu')
      .single();

    if (readError) {
      console.error('❌ Error reading PayU record:', readError);
    } else {
      console.log('✅ Can read PayU record');
    }

    // Try to update with a simple change first
    const { data: updateData, error: updateError } = await supabase
      .from('payment_gateways')
      .update({
        updated_at: new Date().toISOString()
      })
      .eq('code', 'payu')
      .select();

    if (updateError) {
      console.error('❌ Error updating PayU record:', updateError);
    } else {
      console.log('✅ Can update PayU record');
    }

    // Check if we can update the config field specifically
    const { data: configData, error: configError } = await supabase
      .from('payment_gateways')
      .update({
        config: { test: 'value' }
      })
      .eq('code', 'payu')
      .select();

    if (configError) {
      console.error('❌ Error updating config field:', configError);
    } else {
      console.log('✅ Can update config field');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkPayUPolicies(); 