import fetch from 'node-fetch';

async function testAirwallexAuth() {
  const authUrl = 'https://api-demo.airwallex.com/api/v1/authentication/login';
  const clientId = 'lVBya_cyR-WAtIqzMo4cZQ';
  const apiKey = '1e02891ba7ab2c772f945bf20e9adcbb99173eb500f75bd414aa5bf85130e007a7959f8ba8e664bccf829f701926c0c5';
  
  console.log('Testing Airwallex authentication...');
  
  try {
    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'x-client-id': clientId,
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response status:', response.status);
    const data = await response.json();
    
    if (response.ok && data.token) {
      console.log('✅ Authentication successful\!');
      console.log('Token expires at:', data.expires_at);
      
      // Test payment intent creation with the token - try different endpoints
      console.log('\nTesting payment intent creation...');
      
      // Try 1: Standard REST endpoint
      let paymentResponse = await fetch('https://api-demo.airwallex.com/api/v1/pa/payment_intents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${data.token}`,
          'Content-Type': 'application/json',
          'x-api-version': '2024-06-14'
        },
        body: JSON.stringify({
          request_id: `test_${Date.now()}`,
          amount: 10050,
          currency: 'USD',
          merchant_order_id: `order_${Date.now()}`,
          return_url: 'https://example.com/return'
        })
      });
      
      console.log('Method 1 - /payment_intents status:', paymentResponse.status);
      let paymentData = await paymentResponse.text();
      console.log('Method 1 response:', paymentData);
      
      // Try 2: With /create suffix
      console.log('\nTrying /create endpoint...');
      paymentResponse = await fetch('https://api-demo.airwallex.com/api/v1/pa/payment_intents/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${data.token}`,
          'Content-Type': 'application/json',
          'x-api-version': '2024-06-14'
        },
        body: JSON.stringify({
          request_id: `test_${Date.now()}`,
          amount: 10050,
          currency: 'USD',
          merchant_order_id: `order_${Date.now()}`,
          return_url: 'https://example.com/return'
        })
      });
      
      console.log('Method 2 - /create status:', paymentResponse.status);
      paymentData = await paymentResponse.text();
      console.log('Method 2 response:', paymentData);
    } else {
      console.error('Authentication failed:', data);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testAirwallexAuth();
