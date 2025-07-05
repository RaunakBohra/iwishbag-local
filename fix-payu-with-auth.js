// Fix PayU configuration with authentication
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = 'http://localhost:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixPayUWithAuth() {
  console.log('🔧 Fixing PayU configuration with authentication...');
  
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
    // First, try to sign in as an admin user
    console.log('\n🔐 Attempting to authenticate...');
    const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@example.com',
      password: 'admin123'
    });

    if (authError) {
      console.log('❌ Auth error:', authError.message);
      console.log('Trying to create admin user...');
      
      // Try to create an admin user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: 'admin@example.com',
        password: 'admin123'
      });

      if (signUpError) {
        console.error('❌ Error creating admin user:', signUpError);
        return;
      }

      console.log('✅ Admin user created');
    } else {
      console.log('✅ Authenticated as:', user?.email);
    }

    // Now try to update the PayU configuration
    console.log('\n🔧 Updating PayU configuration...');
    const config = {
      merchant_id: merchantId,
      merchant_key: merchantKey,
      salt_key: saltKey,
      payment_url: paymentUrl || 'https://test.payu.in/_payment'
    };
    
    console.log('Config object:', config);
    
    const { data, error } = await supabase
      .from('payment_gateways')
      .update({
        config: config,
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

fixPayUWithAuth(); 