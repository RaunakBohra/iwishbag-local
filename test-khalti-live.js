// Test Khalti with LIVE credentials
const testKhaltiLive = async () => {
  const liveSecretKey = 'live_secret_key_a5b92431df324d14bd826ae2b5b64ebd';
  const livePublicKey = 'live_public_key_496caf808f75472d97ab26d833784a8f';
  
  // Test payment initiation
  const paymentRequest = {
    return_url: 'http://localhost:8080/payment-success',
    website_url: 'http://localhost:8080',
    amount: 1000, // 10 NPR in paisa
    purchase_order_id: `LIVE_TEST_${Date.now()}`,
    purchase_order_name: 'Live Test Order',
    customer_info: {
      name: 'Test Customer',
      email: 'test@example.com',
      phone: '9801234567'
    }
  };

  try {
    console.log('🧪 Testing LIVE Khalti API...');
    console.log('🔑 Using LIVE credentials');
    console.log('📊 Request payload:', JSON.stringify(paymentRequest, null, 2));
    
    // Test against production URL
    console.log('\n🔗 Testing khalti.com (production)...');
    const prodUrl = 'https://khalti.com/api/v2/epayment/initiate/';
    
    const prodResponse = await fetch(prodUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${liveSecretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentRequest)
    });

    console.log('✅ Production Response Status:', prodResponse.status);
    console.log('📋 Production Response Headers:', Object.fromEntries(prodResponse.headers.entries()));
    
    const prodData = await prodResponse.text();
    console.log('📊 Production Response Body:', prodData);
    
    if (prodResponse.ok) {
      console.log('🎉 LIVE API worked!');
      const parsedData = JSON.parse(prodData);
      console.log('🔗 Payment URL:', parsedData.payment_url);
      console.log('🆔 PIDX:', parsedData.pidx);
      console.log('\n⚠️  WARNING: This is a LIVE payment URL! Do not complete the payment unless you intend to make a real transaction.');
    } else {
      console.log('❌ LIVE API failed');
      
      // Also try a.khalti.com with live keys
      console.log('\n🔗 Trying a.khalti.com with LIVE keys...');
      const aUrl = 'https://a.khalti.com/api/v2/epayment/initiate/';
      
      const aResponse = await fetch(aUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${liveSecretKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentRequest)
      });

      console.log('✅ A Response Status:', aResponse.status);
      const aData = await aResponse.text();
      console.log('📊 A Response Body:', aData);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Run the test
console.log('🚀 Starting LIVE Khalti API test...');
console.log('⚠️  WARNING: Using LIVE credentials - any successful payments will be real!\n');

testKhaltiLive().then(() => {
  console.log('\n✅ Test completed!');
}).catch(error => {
  console.error('\n❌ Test suite failed:', error);
});