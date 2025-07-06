// Detailed PayU Amount Debug Test
const testPayUAmountDebugDetailed = async () => {
  console.log('🔍 Detailed PayU Amount Debug Test...\n');

  // Test with the exact amount from your cart
  const testData = {
    quoteIds: ['test-quote-1'],
    gateway: 'payu',
    success_url: 'https://iwishbag.com/success',
    cancel_url: 'https://iwishbag.com/cancel',
    amount: 124.51, // This should give us ~10334.33 INR (124.51 * 83)
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
      console.log('\n🔍 DETAILED ANALYSIS:');
      console.log('1. INPUT VALUES:');
      console.log('   - Original Amount (USD):', testData.amount);
      console.log('   - Exchange Rate:', result.exchangeRate);
      
      console.log('\n2. CONVERSION CALCULATIONS:');
      console.log('   - USD to INR:', testData.amount, '*', result.exchangeRate, '=', testData.amount * result.exchangeRate);
      console.log('   - Amount in INR:', result.amountInINR);
      console.log('   - Amount in Paise:', result.amountInPaise);
      
      console.log('\n3. PAYU FORM DATA:');
      console.log('   - Amount sent to PayU:', result.formData.amount);
      console.log('   - Amount type:', typeof result.formData.amount);
      
      console.log('\n4. VERIFICATION:');
      const expectedINR = testData.amount * result.exchangeRate;
      const expectedPaise = Math.round(expectedINR * 100);
      const actualPaise = parseInt(result.formData.amount);
      
      console.log('   - Expected INR:', expectedINR);
      console.log('   - Expected Paise:', expectedPaise);
      console.log('   - Actual Paise:', actualPaise);
      console.log('   - Conversion Correct:', expectedPaise === actualPaise ? '✅' : '❌');
      
      console.log('\n5. DISPLAY ANALYSIS:');
      console.log('   - What PayU should show (₹):', (actualPaise / 100).toFixed(2));
      console.log('   - What PayU actually shows:', result.formData.amount);
      
      // Test different amount formats
      console.log('\n6. ALTERNATIVE FORMATS TEST:');
      const amountInINR = result.amountInINR;
      console.log('   - Format 1 (paise):', Math.round(amountInINR * 100));
      console.log('   - Format 2 (rupees with 2 decimals):', (amountInINR * 100).toFixed(0));
      console.log('   - Format 3 (rupees as integer):', Math.floor(amountInINR * 100));
      console.log('   - Format 4 (rupees as string):', (amountInINR * 100).toString());
      
      console.log('\n7. CONCLUSION:');
      if (expectedPaise === actualPaise) {
        console.log('   ✅ Our conversion is CORRECT');
        console.log('   ❌ PayU display issue (shows paise instead of rupees)');
      } else {
        console.log('   ❌ Our conversion is INCORRECT');
        console.log('   🔧 Need to fix our code');
      }
      
    } else {
      console.log('\n❌ Test failed:', result.error);
    }

  } catch (error) {
    console.log('\n❌ Test failed:', error.message);
  }
};

testPayUAmountDebugDetailed(); 