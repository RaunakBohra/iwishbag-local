// Test PayU Amount Fix
const testPayUAmountFix = async () => {
  console.log('🧪 Testing PayU Amount Fix...\n');

  const testData = {
    quoteIds: ['test-quote-1'],
    gateway: 'payu',
    success_url: 'https://iwishbag.com/success',
    cancel_url: 'https://iwishbag.com/cancel',
    amount: 1.00, // Test with exactly 1 USD
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

    if (result.success && result.formData) {
      console.log('\n✅ PayU Amount Fix Test Results:');
      console.log('- Original Amount (USD):', testData.amount);
      console.log('- Amount in INR:', result.amountInINR);
      console.log('- Amount in Paise:', result.amountInPaise);
      console.log('- PayU Form Amount:', result.formData.amount);
      console.log('- Exchange Rate:', result.exchangeRate);
      
      // Verify the amount format
      const expectedPaise = Math.round(result.amountInINR * 100);
      const actualPaise = parseInt(result.formData.amount);
      
      console.log('\n🔍 Amount Format Verification:');
      console.log('- Expected Paise:', expectedPaise);
      console.log('- Actual Paise:', actualPaise);
      console.log('- Format Correct:', expectedPaise === actualPaise ? '✅' : '❌');
      
      if (expectedPaise === actualPaise) {
        console.log('\n🎉 PayU Amount Fix SUCCESS!');
        console.log('The amount is now correctly formatted in paise for PayU.');
      } else {
        console.log('\n❌ PayU Amount Fix FAILED!');
        console.log('The amount format is still incorrect.');
      }
    } else {
      console.log('\n❌ Test failed:', result.error);
    }

  } catch (error) {
    console.log('\n❌ Test failed:', error.message);
  }
};

testPayUAmountFix(); 