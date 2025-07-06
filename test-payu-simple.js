// Simple PayU Integration Test
const testPayUIntegration = async () => {
  console.log('🧪 Testing PayU Integration (Simple Test)...\n');

  const testData = {
    quoteIds: ['test-quote-1'],
    gateway: 'payu',
    success_url: 'https://your-site.com/success',
    cancel_url: 'https://your-site.com/cancel',
    amount: 12.82,
    currency: 'USD',
    customerInfo: {
      name: 'Test Customer',
      email: 'test@example.com',
      phone: '9999999999'
    }
  };

  try {
    console.log('📤 Sending test payment request...');
    console.log('Request Data:', JSON.stringify(testData, null, 2));

    const response = await fetch('https://grgvlrvywsfmnmkxrecd.supabase.co/functions/v1/create-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZ3ZscnZ5d3NmbW5ta3hyZWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0MTEzMTIsImV4cCI6MjA2NTk4NzMxMn0.IAE4zqmnd3MF4JaMJ4sl8QLHbrcSgCSd5hfN4DVDGHw'
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
      console.log('💰 Amount in INR:', result.amountInINR);
      console.log('💱 Exchange Rate:', result.exchangeRate);
      
      if (result.formData) {
        console.log('\n📋 PayU Form Data:');
        console.log('- Merchant Key:', result.formData.key);
        console.log('- Transaction ID:', result.formData.txnid);
        console.log('- Amount:', result.formData.amount);
        console.log('- Product Info:', result.formData.productinfo);
        console.log('- Customer Name:', result.formData.firstname);
        console.log('- Customer Email:', result.formData.email);
        console.log('- Hash:', result.formData.hash.substring(0, 20) + '...');
      }
    } else {
      console.log('\n❌ PayU Integration Test FAILED!');
      console.log('Error:', result.error);
      if (result.details) {
        console.log('Details:', result.details);
      }
    }

  } catch (error) {
    console.log('\n❌ PayU Integration Test FAILED!');
    console.log('Error:', error.message);
  }
};

// Run the test
testPayUIntegration(); 