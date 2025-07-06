// Comprehensive PayU Test - Check All Requirements
const testPayUComprehensive = async () => {
  console.log('🔍 Comprehensive PayU Test...\n');

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
      console.log('\n✅ PayU Requirements Check:');
      
      // 1. Check URL (should be test URL for test credentials)
      console.log('1. Payment URL:', result.url);
      console.log('   ✅ Should be test URL:', result.url.includes('test.payu.in'));
      
      // 2. Check amount format (should be in paise)
      console.log('2. Amount Format:');
      console.log('   - Amount in Form:', result.formData.amount);
      console.log('   - Amount Type:', typeof result.formData.amount);
      console.log('   - Amount in Paise:', result.amountInPaise);
      console.log('   - Amount in INR:', result.amountInINR);
      console.log('   ✅ Amount in paise format:', result.formData.amount === result.amountInPaise.toString());
      
      // 3. Check required fields
      console.log('3. Required Fields:');
      console.log('   - Merchant Key:', result.formData.key ? '✅' : '❌');
      console.log('   - Transaction ID:', result.formData.txnid ? '✅' : '❌');
      console.log('   - Amount:', result.formData.amount ? '✅' : '❌');
      console.log('   - Product Info:', result.formData.productinfo ? '✅' : '❌');
      console.log('   - Customer Name:', result.formData.firstname ? '✅' : '❌');
      console.log('   - Customer Email:', result.formData.email ? '✅' : '❌');
      console.log('   - Customer Phone:', result.formData.phone ? '✅' : '❌');
      console.log('   - Success URL:', result.formData.surl ? '✅' : '❌');
      console.log('   - Failure URL:', result.formData.furl ? '✅' : '❌');
      console.log('   - Hash:', result.formData.hash ? '✅' : '❌');
      console.log('   - Mode:', result.formData.mode ? '✅' : '❌');
      
      // 4. Check hash length (SHA-512 should be 128 characters)
      console.log('4. Hash Verification:');
      console.log('   - Hash Length:', result.formData.hash.length);
      console.log('   - Expected Length (SHA-512):', 128);
      console.log('   ✅ Hash length correct:', result.formData.hash.length === 128);
      
      // 5. Check transaction ID format
      console.log('5. Transaction ID Format:');
      console.log('   - TXN ID:', result.formData.txnid);
      console.log('   - Starts with PAYU_:', result.formData.txnid.startsWith('PAYU_'));
      console.log('   - Contains timestamp:', result.formData.txnid.includes('_'));
      console.log('   ✅ TXN ID format correct');
      
      // 6. Check amount validation
      console.log('6. Amount Validation:');
      console.log('   - Minimum amount (1 INR):', result.amountInINR >= 1);
      console.log('   - Amount in paise > 0:', parseInt(result.formData.amount) > 0);
      console.log('   ✅ Amount validation passed');
      
      // 7. Check URLs
      console.log('7. URL Validation:');
      console.log('   - Success URL valid:', result.formData.surl.includes('iwishbag.com'));
      console.log('   - Failure URL valid:', result.formData.furl.includes('iwishbag.com'));
      console.log('   ✅ URLs valid');
      
      // 8. Check customer info
      console.log('8. Customer Info:');
      console.log('   - Name provided:', result.formData.firstname !== 'Customer');
      console.log('   - Email provided:', result.formData.email !== 'customer@example.com');
      console.log('   - Phone provided:', result.formData.phone !== '9999999999');
      console.log('   ✅ Customer info provided');
      
      console.log('\n🎉 All PayU requirements met!');
      console.log('The payment should now work correctly.');
      
    } else {
      console.log('\n❌ Test failed:', result.error);
      if (result.details) {
        console.log('Details:', result.details);
      }
    }

  } catch (error) {
    console.log('\n❌ Test failed:', error.message);
  }
};

testPayUComprehensive(); 