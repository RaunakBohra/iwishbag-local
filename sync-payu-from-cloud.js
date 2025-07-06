// Script to sync PayU configuration from cloud to local
import { createClient } from '@supabase/supabase-js';

// Cloud Supabase client (production)
const cloudSupabaseUrl = 'https://grgvlrvywsfmnmkxrecd.supabase.co';
const cloudSupabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZ3ZscnZ5d3NmbW5ta3hyZWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0MTEzMTIsImV4cCI6MjA2NTk4NzMxMn0.IAE4zqmnd3MF4JaMJ4sl8QLHbrcSgCSd5hfN4DVDGHw';

// Local Supabase client
const localSupabaseUrl = 'http://localhost:54321';
const localSupabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const cloudSupabase = createClient(cloudSupabaseUrl, cloudSupabaseKey);
const localSupabase = createClient(localSupabaseUrl, localSupabaseKey);

async function syncPayUFromCloud() {
  console.log('🔄 Syncing PayU configuration from cloud to local...');
  
  try {
    // 1. Get PayU configuration from cloud
    console.log('📥 Fetching PayU config from cloud...');
    const { data: cloudConfig, error: cloudError } = await cloudSupabase
      .from('payment_gateways')
      .select('*')
      .eq('code', 'payu')
      .single();

    if (cloudError) {
      console.error('❌ Error fetching cloud config:', cloudError);
      return;
    }

    console.log('✅ Cloud PayU configuration:');
    console.log('Name:', cloudConfig.name);
    console.log('Code:', cloudConfig.code);
    console.log('Active:', cloudConfig.is_active);
    console.log('Test Mode:', cloudConfig.test_mode);
    console.log('Config:', cloudConfig.config);

    // 2. Update local database with cloud configuration
    console.log('\n📤 Updating local database...');
    const { data: updateData, error: updateError } = await localSupabase
      .from('payment_gateways')
      .update({
        config: cloudConfig.config,
        test_mode: cloudConfig.test_mode,
        updated_at: new Date().toISOString()
      })
      .eq('code', 'payu')
      .select();

    if (updateError) {
      console.error('❌ Error updating local config:', updateError);
      return;
    }

    console.log('✅ Local database updated successfully!');

    // 3. Verify the sync
    console.log('\n🔍 Verifying local configuration...');
    const { data: verifyData, error: verifyError } = await localSupabase
      .from('payment_gateways')
      .select('*')
      .eq('code', 'payu')
      .single();

    if (verifyError) {
      console.error('❌ Error verifying config:', verifyError);
      return;
    }

    console.log('✅ Local PayU configuration:');
    console.log('Name:', verifyData.name);
    console.log('Code:', verifyData.code);
    console.log('Active:', verifyData.is_active);
    console.log('Test Mode:', verifyData.test_mode);
    console.log('Config:', verifyData.config);

    // 4. Check if it's production or test
    if (verifyData.test_mode) {
      console.log('\n🧪 PayU is configured for TEST mode');
      console.log('Payment URL: https://test.payu.in/_payment');
    } else {
      console.log('\n🚀 PayU is configured for PRODUCTION mode');
      console.log('Payment URL: https://secure.payu.in/_payment');
    }

    console.log('\n🎉 PayU configuration synced successfully!');
    console.log('Your local environment now matches the cloud configuration.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

syncPayUFromCloud(); 