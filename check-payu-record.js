// Check PayU record in database
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://localhost:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPayURecord() {
  console.log('🔍 Checking PayU record in database...');
  
  try {
    // Check if PayU record exists
    const { data, error } = await supabase
      .from('payment_gateways')
      .select('*')
      .eq('code', 'payu')
      .single();

    if (error) {
      console.error('❌ Error fetching PayU record:', error);
      return;
    }

    console.log('✅ PayU record found:');
    console.log('ID:', data.id);
    console.log('Name:', data.name);
    console.log('Code:', data.code);
    console.log('Active:', data.is_active);
    console.log('Test Mode:', data.test_mode);
    console.log('Supported Countries:', data.supported_countries);
    console.log('Supported Currencies:', data.supported_currencies);
    console.log('Config:', JSON.stringify(data.config, null, 2));
    console.log('Created At:', data.created_at);
    console.log('Updated At:', data.updated_at);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkPayURecord(); 