import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const SUPABASE_URL = 'http://localhost:54321';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testAirwallexPayment() {
  console.log('🔐 Logging in...');
  
  // Sign in as test user
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'test@example.com',
    password: 'test123456'
  });
  
  if (authError) {
    console.error('Auth error:', authError);
    return;
  }
  
  const accessToken = authData.session?.access_token;
  console.log('✅ Logged in successfully');
  
  // Test payment data
  const testPaymentData = {
    quoteIds: ['dc7652e3-61bb-4eca-9bbb-08a2ee77f663'],
    gateway: 'airwallex',
    success_url: 'http://localhost:8081/payment/success',
    cancel_url: 'http://localhost:8081/payment/cancel',
    amount: 100.50,
    currency: 'USD',
    customerInfo: {
      name: 'Test Customer',
      email: 'test@example.com',
      phone: '+1234567890',
      address: {
        line1: '123 Test Street',
        city: 'Test City',
        state: 'CA',
        postal_code: '12345',
        country: 'US'
      }
    }
  };

  console.log('\n🚀 Testing Airwallex payment...');
  console.log('📋 Quote ID:', testPaymentData.quoteIds[0]);
  console.log('💰 Amount:', testPaymentData.amount, testPaymentData.currency);

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/create-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(testPaymentData)
    });

    console.log('\n📡 Response status:', response.status);
    
    const responseText = await response.text();
    
    try {
      const data = JSON.parse(responseText);
      console.log('\n📦 Response:', JSON.stringify(data, null, 2));
      
      if (data.paymentUrl) {
        console.log('\n✅ Success\! Payment URL:', data.paymentUrl);
        console.log('🔗 Client Secret:', data.clientSecret);
        console.log('🆔 Transaction ID:', data.transactionId);
      }
      
      if (data.error) {
        console.error('\n❌ Error:', data.error);
      }
    } catch (e) {
      console.log('\n📄 Raw response:', responseText);
    }
    
  } catch (error) {
    console.error('\n❌ Request failed:', error);
  }
  
  // Sign out
  await supabase.auth.signOut();
  console.log('\n👋 Logged out');
}

// Run the test
console.log('='.repeat(60));
console.log('Testing Airwallex Payment Integration with New Credentials');
console.log('='.repeat(60));
console.log('\n⚠️  Make sure your functions are running with:');
console.log('npx supabase functions serve create-payment --no-verify-jwt --env-file .env');
console.log('\nWatch the function logs for detailed debug info\!');
console.log('='.repeat(60));

testAirwallexPayment();
