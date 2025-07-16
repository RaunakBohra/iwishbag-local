// Test script to verify Khalti payment integration
const testKhaltiPayment = async () => {
  const testPaymentRequest = {
    quoteIds: ['test-quote-123'],
    gateway: 'khalti',
    success_url: 'http://localhost:8080/payment-success',
    cancel_url: 'http://localhost:8080/payment-failure',
    amount: 100, // NPR 100
    currency: 'NPR',
    customerInfo: {
      name: 'Test Customer',
      email: 'test@example.com',
      phone: '9801234567'
    },
    metadata: {
      test: true
    }
  };

  try {
    console.log('🧪 Testing Khalti payment creation...');
    
    const response = await fetch('http://127.0.0.1:54321/functions/v1/create-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'}`
      },
      body: JSON.stringify(testPaymentRequest)
    });

    const result = await response.json();
    
    console.log('✅ Response Status:', response.status);
    console.log('📊 Response Data:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('🎉 Khalti payment creation successful!');
      console.log('🔗 Payment URL:', result.url);
      console.log('🆔 Transaction ID:', result.transactionId);
    } else {
      console.log('❌ Khalti payment creation failed:', result.error);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Test webhook verification
const testKhaltiWebhook = async () => {
  const testPidx = 'test-pidx-123';
  
  try {
    console.log('🧪 Testing Khalti webhook verification...');
    
    const response = await fetch('http://127.0.0.1:54321/functions/v1/khalti-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'}`
      },
      body: JSON.stringify({ pidx: testPidx })
    });

    const result = await response.json();
    
    console.log('✅ Webhook Response Status:', response.status);
    console.log('📊 Webhook Response Data:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Webhook test failed:', error);
  }
};

// Run tests
console.log('🚀 Starting Khalti Integration Tests...\n');

testKhaltiPayment().then(() => {
  console.log('\n' + '='.repeat(50) + '\n');
  return testKhaltiWebhook();
}).then(() => {
  console.log('\n✅ All tests completed!');
}).catch(error => {
  console.error('\n❌ Test suite failed:', error);
});