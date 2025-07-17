// Test script to create an Airwallex payment
import fetch from 'node-fetch';

async function testAirwallexPayment() {
  const SUPABASE_URL = 'http://localhost:54321';
  const SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

  // Use the quote we just created
  const testPaymentData = {
    quoteIds: ['7e3c424e-5cf2-4b73-bc25-82db1afe2675'], // Using the quote ID we just created
    gateway: 'airwallex',
    success_url: 'http://localhost:8081/payment/success',
    cancel_url: 'http://localhost:8081/payment/cancel',
    amount: 100.5,
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
        country: 'US',
      },
    },
  };

  console.log('🚀 Testing Airwallex payment with data:', JSON.stringify(testPaymentData, null, 2));

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/create-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(testPaymentData),
    });

    const responseText = await response.text();
    console.log('\n📡 Response status:', response.status);
    console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));

    try {
      const data = JSON.parse(responseText);
      console.log('\n✅ Response data:', JSON.stringify(data, null, 2));

      if (data.paymentUrl) {
        console.log('\n🔗 Payment URL:', data.paymentUrl);
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
}

// Run the test
console.log('='.repeat(60));
console.log('Testing Airwallex Payment Integration');
console.log('='.repeat(60));
testAirwallexPayment();
