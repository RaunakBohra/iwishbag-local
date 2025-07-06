// Test PayU Frontend Integration
const testPayUFrontendIntegration = async () => {
  console.log('🧪 Testing PayU Frontend Integration...\n');

  // Simulate the frontend payment request
  const paymentRequest = {
    quoteIds: ['test-quote-1'],
    gateway: 'payu',
    success_url: 'https://iwishbag.com/success',
    cancel_url: 'https://iwishbag.com/cancel',
    amount: 1.00,
    currency: 'USD',
    customerInfo: {
      name: 'Test Customer',
      email: 'test@example.com',
      phone: '9999999999'
    }
  };

  try {
    console.log('📤 Simulating frontend payment request...');
    console.log('Request Data:', JSON.stringify(paymentRequest, null, 2));

    const response = await fetch('https://grgvlrvywsfmnmkxrecd.supabase.co/functions/v1/create-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZ3ZscnZ5d3NmbW5ta3hyZWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0MTEzMTIsImV4cCI6MjA2NTk4NzMxMn0.IAE4zqmnd3MF4JaMJ4sl8QLHbrcSgCSd5hfN4DVDGHw'
      },
      body: JSON.stringify(paymentRequest)
    });

    const result = await response.json();
    
    console.log('\n📥 Backend Response:');
    console.log('Status:', response.status);
    console.log('Success:', result.success);
    console.log('URL:', result.url);
    console.log('Has Form Data:', !!result.formData);
    
    if (result.success && result.formData) {
      console.log('\n✅ Backend is providing form data correctly');
      
      // Simulate frontend form submission
      console.log('\n🔧 Simulating frontend form submission...');
      
      // Create form data for submission
      const formData = new URLSearchParams();
      Object.keys(result.formData).forEach(key => {
        formData.append(key, result.formData[key]);
      });
      
      console.log('Form Action:', result.url);
      console.log('Form Method: POST');
      console.log('Form Data String:', formData.toString());
      
      // Check if all required parameters are present
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
      
      if (allParamsPresent) {
        console.log('\n🎉 Frontend Integration Test PASSED!');
        console.log('All required parameters are present and ready for form submission.');
        
        // Simulate the actual form submission that would happen in the browser
        console.log('\n📝 Simulating browser form submission...');
        console.log('This is what should happen in the browser:');
        console.log('1. Create form element');
        console.log('2. Set method="POST"');
        console.log('3. Set action="' + result.url + '"');
        console.log('4. Add hidden inputs for each parameter');
        console.log('5. Submit the form');
        
        // Show the exact HTML that would be generated
        console.log('\n📋 Generated HTML Form:');
        let htmlForm = `<form method="POST" action="${result.url}">`;
        Object.keys(result.formData).forEach(key => {
          htmlForm += `\n  <input type="hidden" name="${key}" value="${result.formData[key]}">`;
        });
        htmlForm += '\n</form>';
        console.log(htmlForm);
        
      } else {
        console.log('\n❌ Frontend Integration Test FAILED!');
        console.log('Some required parameters are missing.');
      }
      
    } else {
      console.log('\n❌ Backend is not providing form data');
      console.log('Response:', result);
    }

  } catch (error) {
    console.log('\n❌ Test failed:', error.message);
  }
};

testPayUFrontendIntegration(); 