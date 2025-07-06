// Debug PayU Amount Formatting Issue
const testPayUAmountDebug = async () => {
  console.log('🔍 Debugging PayU Amount Formatting...\n');

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
      console.log('\n🔍 PayU Form Data Analysis:');
      console.log('- Amount:', result.formData.amount);
      console.log('- Amount Type:', typeof result.formData.amount);
      console.log('- Amount Length:', result.formData.amount.length);
      console.log('- Amount as Number:', parseFloat(result.formData.amount));
      console.log('- Amount as Integer:', parseInt(result.formData.amount));
      console.log('- Amount * 100:', parseFloat(result.formData.amount) * 100);
      
      // Test different amount formats
      const amount = parseFloat(result.formData.amount);
      console.log('\n🧪 Testing Different Amount Formats:');
      console.log('1. Current format:', result.formData.amount);
      console.log('2. Integer format:', Math.round(amount));
      console.log('3. Paise format (amount * 100):', Math.round(amount * 100));
      console.log('4. No decimal format:', amount.toFixed(0));
      console.log('5. One decimal format:', amount.toFixed(1));
      console.log('6. Two decimal format:', amount.toFixed(2));
    } else {
      console.log('\n❌ Test failed:', result.error);
    }

  } catch (error) {
    console.log('\n❌ Test failed:', error.message);
  }
};

testPayUAmountDebug(); 