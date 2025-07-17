// Direct Khalti API test script
const testKhaltiDirect = async () => {
  const testSecretKey = 'test_secret_key_283050de1a8c412684889fde576bb65c';
  const testPublicKey = 'test_public_key_bc76e6b77d8140de9ca3dcd7555d1dfa';

  // Test payment initiation
  const paymentRequest = {
    return_url: 'http://localhost:8080/payment-success',
    website_url: 'http://localhost:8080',
    amount: 1000, // 10 NPR in paisa
    purchase_order_id: `TEST_${Date.now()}`,
    purchase_order_name: 'Test Order',
    customer_info: {
      name: 'Test Customer',
      email: 'test@example.com',
      phone: '9801234567',
    },
  };

  try {
    console.log('🧪 Testing direct Khalti API...');
    console.log('📊 Request payload:', JSON.stringify(paymentRequest, null, 2));

    // Try dev.khalti.com first
    console.log('\n🔗 Trying dev.khalti.com...');
    const devUrl = 'https://dev.khalti.com/api/v2/epayment/initiate/';

    const devResponse = await fetch(devUrl, {
      method: 'POST',
      headers: {
        Authorization: `Key ${testSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentRequest),
    });

    console.log('✅ Dev Response Status:', devResponse.status);
    console.log('📋 Dev Response Headers:', Object.fromEntries(devResponse.headers.entries()));

    const devData = await devResponse.text();
    console.log('📊 Dev Response Body:', devData);

    if (devResponse.ok) {
      console.log('🎉 Dev API worked!');
      const parsedData = JSON.parse(devData);
      console.log('🔗 Payment URL:', parsedData.payment_url);
      console.log('🆔 PIDX:', parsedData.pidx);
    } else {
      console.log('❌ Dev API failed, trying a.khalti.com...');

      // Try a.khalti.com
      const aUrl = 'https://a.khalti.com/api/v2/epayment/initiate/';

      const aResponse = await fetch(aUrl, {
        method: 'POST',
        headers: {
          Authorization: `Key ${testSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentRequest),
      });

      console.log('\n✅ A Response Status:', aResponse.status);
      console.log('📋 A Response Headers:', Object.fromEntries(aResponse.headers.entries()));

      const aData = await aResponse.text();
      console.log('📊 A Response Body:', aData);

      if (aResponse.ok) {
        console.log('🎉 A API worked!');
        const parsedData = JSON.parse(aData);
        console.log('🔗 Payment URL:', parsedData.payment_url);
        console.log('🆔 PIDX:', parsedData.pidx);
      }
    }

    // Test with different auth header formats
    console.log('\n🔧 Testing different auth header formats...');

    const authFormats = [
      { format: `Key ${testSecretKey}`, name: 'Key format' },
      { format: `Bearer ${testSecretKey}`, name: 'Bearer format' },
      { format: testSecretKey, name: 'Direct key' },
    ];

    for (const auth of authFormats) {
      console.log(`\n🧪 Testing ${auth.name}...`);
      const response = await fetch(devUrl, {
        method: 'POST',
        headers: {
          Authorization: auth.format,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentRequest),
      });

      console.log(`${auth.name} Status:`, response.status);
      if (response.ok) {
        console.log(`✅ ${auth.name} works!`);
        break;
      }
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Run the test
console.log('🚀 Starting direct Khalti API test...\n');
testKhaltiDirect()
  .then(() => {
    console.log('\n✅ Test completed!');
  })
  .catch((error) => {
    console.error('\n❌ Test suite failed:', error);
  });
