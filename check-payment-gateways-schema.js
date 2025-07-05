// Check payment_gateways table schema
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://localhost:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPaymentGatewaysSchema() {
  console.log('🔍 Checking payment_gateways table schema...');
  
  try {
    // Get all payment gateways to see the structure
    const { data: gateways, error: gatewaysError } = await supabase
      .from('payment_gateways')
      .select('*');

    if (gatewaysError) {
      console.error('❌ Error fetching payment gateways:', gatewaysError);
      return;
    }

    console.log('✅ Payment gateways found:', gateways.length);
    
    // Show the structure of the first gateway
    if (gateways.length > 0) {
      console.log('\n📋 First gateway structure:');
      console.log('ID:', gateways[0].id);
      console.log('Name:', gateways[0].name);
      console.log('Code:', gateways[0].code);
      console.log('Active:', gateways[0].is_active);
      console.log('Test Mode:', gateways[0].test_mode);
      console.log('Config type:', typeof gateways[0].config);
      console.log('Config:', JSON.stringify(gateways[0].config, null, 2));
    }

    // Try to insert a new test record
    console.log('\n🧪 Testing insert...');
    const { data: insertData, error: insertError } = await supabase
      .from('payment_gateways')
      .insert({
        name: 'Test Gateway',
        code: 'test_gateway',
        is_active: false,
        test_mode: true,
        supported_countries: ['US'],
        supported_currencies: ['USD'],
        config: { test: 'value' }
      })
      .select();

    if (insertError) {
      console.error('❌ Error inserting test record:', insertError);
    } else {
      console.log('✅ Test insert successful');
      console.log('Inserted:', insertData);
      
      // Clean up the test record
      const { error: deleteError } = await supabase
        .from('payment_gateways')
        .delete()
        .eq('code', 'test_gateway');
      
      if (deleteError) {
        console.error('❌ Error deleting test record:', deleteError);
      } else {
        console.log('✅ Test record cleaned up');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkPaymentGatewaysSchema(); 