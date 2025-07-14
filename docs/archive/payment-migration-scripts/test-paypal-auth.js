import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://grgvlrvywsfmnmkxrecd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZ3ZscnZ5d3NmbW5ta3hyZWNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQxMTMxMiwiZXhwIjoyMDY1OTg3MzEyfQ.gRRd3vm7s4iwlGLfXejFOXIz9ulfaywP64OjOWmGqpQ'
);

async function testPayPalAuth() {
  // Get PayPal config
  const { data: paypalGateway, error } = await supabase
    .from('payment_gateways')
    .select('config, test_mode')
    .eq('code', 'paypal')
    .single();
    
  if (error || !paypalGateway) {
    console.error('Error fetching PayPal config:', error);
    return;
  }
  
  const config = paypalGateway.config || {};
  const testMode = paypalGateway.test_mode;
  
  const clientId = testMode ? config.client_id_sandbox : config.client_id_live;
  const clientSecret = testMode ? config.client_secret_sandbox : config.client_secret_live;
  const paypalApiUrl = testMode 
    ? 'https://api-m.sandbox.paypal.com' 
    : 'https://api-m.paypal.com';
    
  console.log('Using PayPal API URL:', paypalApiUrl);
  console.log('Client ID:', clientId);
  console.log('Has Client Secret:', !!clientSecret);
  
  // Test OAuth
  try {
    console.log('\nTesting PayPal OAuth...');
    const authString = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    console.log('Auth string (first 20 chars):', authString.substring(0, 20) + '...');
    
    const response = await fetch(`${paypalApiUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${authString}`
      },
      body: 'grant_type=client_credentials'
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('Response body:', responseText);
    
    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log('\n✅ OAuth Success!');
      console.log('Access token (first 20 chars):', data.access_token.substring(0, 20) + '...');
      console.log('Token type:', data.token_type);
      console.log('Expires in:', data.expires_in, 'seconds');
    } else {
      console.error('\n❌ OAuth Failed!');
    }
  } catch (error) {
    console.error('Error during OAuth:', error);
  }
}

testPayPalAuth();