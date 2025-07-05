// Test PayU Integration
const testPayUIntegration = async () => {
  console.log('🧪 Testing PayU Integration...\n');

  const testData = {
    quoteIds: ['test-quote-1', 'test-quote-2'],
    gateway: 'payu',
    success_url: 'https://your-site.com/success',
    cancel_url: 'https://your-site.com/cancel',
    amount: 1000,
    currency: 'INR'
  };

  try {
    console.log('📤 Sending test payment request...');
    console.log('Request Data:', JSON.stringify(testData, null, 2));

    const response = await fetch('https://grgvlrvywsfmnmkxrecd.supabase.co/functions/v1/create-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.SUPABASE_ANON_KEY
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    
    console.log('\n📥 Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n✅ PayU Integration Test PASSED!');
      console.log('🔗 Payment URL:', result.url);
      console.log('🆔 Transaction ID:', result.transactionId);
    } else {
      console.log('\n❌ PayU Integration Test FAILED!');
      console.log('Error:', result.error);
    }

  } catch (error) {
    console.log('\n❌ PayU Integration Test FAILED!');
    console.log('Error:', error.message);
  }
};

// Run the test
testPayUIntegration(); 