import fetch from 'node-fetch';

async function testAirwallexGet() {
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

      // Try GET on payment_intents endpoint
      console.log('\nTrying GET on payment_intents...');
      const getResponse = await fetch('https://api-demo.airwallex.com/api/v1/pa/payment_intents', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authData.token}`,
        },
      });

      console.log('GET response status:', getResponse.status);
      const getData = await getResponse.text();
      console.log('GET response:', getData);

      // Try different endpoint variations
      console.log('\nTrying /api/v1/payment_intents (without /pa)...');
      const altResponse = await fetch('https://api-demo.airwallex.com/api/v1/payment_intents', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authData.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: 10050,
          currency: 'USD',
          description: 'Test payment',
        }),
      });

      console.log('Alternative endpoint response status:', altResponse.status);
      const altData = await altResponse.text();
      console.log('Alternative endpoint response:', altData);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testAirwallexGet();
