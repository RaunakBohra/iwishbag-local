// Test PayU Form Submission
const testPayUFormSubmission = async () => {
  console.log('🧪 Testing PayU Form Submission...\n');

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
      console.log('\n✅ PayU Form Submission Test Results:');
      
      // Check all required PayU parameters
      const requiredParams = [
        'key', 'txnid', 'amount', 'productinfo', 
        'firstname', 'email', 'phone', 'surl', 'furl', 'hash'
      ];
      
      console.log('\n🔍 Required Parameters Check:');
      let allParamsPresent = true;
      
      requiredParams.forEach(param => {
        const isPresent = result.formData[param] !== undefined && result.formData[param] !== '';
        console.log(`- ${param}: ${isPresent ? '✅' : '❌'} (${result.formData[param] || 'missing'})`);
        if (!isPresent) allParamsPresent = false;
      });
      
      console.log(`\n📋 All required parameters present: ${allParamsPresent ? '✅' : '❌'}`);
      
      if (allParamsPresent) {
        console.log('\n🎉 PayU Form Submission Test PASSED!');
        console.log('All required parameters are present and the form should submit correctly.');
        
        // Simulate form submission (for testing purposes)
        console.log('\n📝 Simulating form submission...');
        console.log('Form Action:', result.url);
        console.log('Form Method: POST');
        console.log('Form Data:', result.formData);
        
        // Create a test form submission
        const formData = new URLSearchParams();
        Object.keys(result.formData).forEach(key => {
          formData.append(key, result.formData[key]);
        });
        
        console.log('\n📤 Form Data for Submission:');
        console.log(formData.toString());
        
      } else {
        console.log('\n❌ PayU Form Submission Test FAILED!');
        console.log('Some required parameters are missing.');
      }
      
    } else {
      console.log('\n❌ Test failed:', result.error);
    }

  } catch (error) {
    console.log('\n❌ Test failed:', error.message);
  }
};

testPayUFormSubmission(); 