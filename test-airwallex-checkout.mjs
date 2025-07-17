import fetch from 'node-fetch';

async function testAirwallexCheckout() {
  const authUrl = 'https://api-demo.airwallex.com/api/v1/authentication/login';
  const clientId = 'lVBya_cyR-WAtIqzMo4cZQ';
  const apiKey =
    '1e02891ba7ab2c772f945bf20e9adcbb99173eb500f75bd414aa5bf85130e007a7959f8ba8e664bccf829f701926c0c5';

  console.log('Getting access token...');

  try {
    const authResponse = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'x-client-id': clientId,
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    const authData = await authResponse.json();

    if (authResponse.ok && authData.token) {
      console.log('✅ Got token');

      // Try checkout session endpoint
      console.log('\nCreating checkout session...');
      const response = await fetch('https://api-demo.airwallex.com/api/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + authData.token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: 100.5,
          currency: 'USD',
          mode: 'payment',
          success_url: 'https://example.com/success',
          cancel_url: 'https://example.com/cancel',
          customer: {
            email: 'test@example.com',
            first_name: 'Test',
            last_name: 'Customer',
          },
        }),
      });

      console.log('Response status:', response.status);
      const responseData = await response.text();
      console.log('Response:', responseData);

      // Also try to list available endpoints
      console.log('\nTrying to get API info...');
      const infoResponse = await fetch('https://api-demo.airwallex.com/api/v1', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + authData.token,
        },
      });

      console.log('API info status:', infoResponse.status);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testAirwallexCheckout();
