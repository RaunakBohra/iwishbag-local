// Simple script to update PayU configuration
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = 'http://localhost:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixPayU() {
  console.log('🔧 Fixing PayU configuration...');
  
  const config = {
    merchant_id: process.env.PAYU_MERCHANT_ID || 'gtKFFx',
    merchant_key: process.env.PAYU_MERCHANT_KEY || 'eCwWELxi',
    salt_key: process.env.PAYU_SALT_KEY || '4R38IvwiV57FwVpsgOvTXBdLE4tHUXFW',
    payment_url: process.env.PAYU_PAYMENT_URL || 'https://test.payu.in/_payment'
  };
  
  console.log('Using config:', config);
  
  try {
    const { data, error } = await supabase
      .from('payment_gateways')
      .update({
        config: config,
        test_mode: true
      })
      .eq('code', 'payu')
      .select();

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log('✅ Updated successfully!');
    console.log('Result:', data);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixPayU(); 