import fetch from 'node-fetch';

async function testAirwallexHeaders() {
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

      // Try OPTIONS request to see allowed methods
      console.log('\nChecking allowed methods with OPTIONS...');
      const optionsResponse = await fetch(
        'https://api-demo.airwallex.com/api/v1/pa/payment_intents',
        {
          method: 'OPTIONS',
          headers: {
            Authorization: 'Bearer ' + authData.token,
            Origin: 'https://example.com',
          },
        },
      );

      console.log('OPTIONS response status:', optionsResponse.status);
      console.log(
        'Access-Control-Allow-Methods:',
        optionsResponse.headers.get('access-control-allow-methods'),
      );
      console.log('Allow:', optionsResponse.headers.get('allow'));

      // Try with different headers
      console.log('\nTrying POST with minimal headers...');
      const minimalResponse = await fetch(
        'https://api-demo.airwallex.com/api/v1/pa/payment_intents',
        {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + authData.token,
            'Content-Type': 'application/json',
          },
          body: '{}',
        },
      );

      console.log('Minimal POST status:', minimalResponse.status);
      const minimalData = await minimalResponse.text();
      console.log('Response:', minimalData);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testAirwallexHeaders();
