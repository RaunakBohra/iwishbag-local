import fetch from 'node-fetch';

async function discoverAirwallexAPI() {
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

      // Check if payment intents is meant for listing only
      console.log('\nListing existing payment intents...');
      const listResponse = await fetch(
        'https://api-demo.airwallex.com/api/v1/pa/payment_intents?page_size=5',
        {
          method: 'GET',
          headers: {
            Authorization: 'Bearer ' + authData.token,
          },
        },
      );

      console.log('List response status:', listResponse.status);
      const listData = await listResponse.json();
      console.log('Payment intents:', JSON.stringify(listData, null, 2));

      // Try the v2 API
      console.log('\nTrying v2 API...');
      const v2Response = await fetch('https://api-demo.airwallex.com/api/v2/pa/payment_intents', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + authData.token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: 10050,
          currency: 'USD',
        }),
      });

      console.log('V2 response status:', v2Response.status);

      // Try payment sessions endpoint
      console.log('\nTrying payment sessions...');
      const sessionResponse = await fetch(
        'https://api-demo.airwallex.com/api/v1/pa/payment_sessions',
        {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + authData.token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: 10050,
            currency: 'USD',
          }),
        },
      );

      console.log('Session response status:', sessionResponse.status);
      const sessionData = await sessionResponse.text();
      console.log('Session response:', sessionData);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

discoverAirwallexAPI();
