import fetch from 'node-fetch';

async function testAirwallexCreate() {
  const authUrl = 'https://api-demo.airwallex.com/api/v1/authentication/login';
  const clientId = 'lVBya_cyR-WAtIqzMo4cZQ';
  const apiKey = '1e02891ba7ab2c772f945bf20e9adcbb99173eb500f75bd414aa5bf85130e007a7959f8ba8e664bccf829f701926c0c5';
  
  console.log('Getting access token...');
  
  try {
    const authResponse = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'x-client-id': clientId,
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    const authData = await authResponse.json();
    
    if (authResponse.ok && authData.token) {
      console.log('✅ Got token');
      
      // Try the correct endpoint - payment intents create should be POST
      console.log('\nCreating payment intent with correct request...');
      const response = await fetch('https://api-demo.airwallex.com/api/v1/pa/payment_intents', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + authData.token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: 10050,
          currency: 'USD',
          request_id: 'test_' + Date.now(),
          merchant_order_id: 'order_' + Date.now()
        })
      });
      
      console.log('Response status:', response.status);
      const responseData = await response.text();
      console.log('Response:', responseData);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testAirwallexCreate();
