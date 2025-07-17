// Test PayPal OAuth to see if credentials are working
const testPayPalAuth = async () => {
  const clientId = 'ARi806xV-dbFCS5E9OCYkapLEb-7V0P521rLUG9pYUk6kJ7Nm7exNudxamGEkQ1SXqUSzNgV3lEZyAXH';
  const clientSecret = 'EDn63sc7pr715BvR2X2VvgKsBYy09iTafm9AOnxcbNLztd3YJrc2X-0DiTk4uYyxBh7fcYq3nn8lKyKl';
  const paypalApiUrl = 'https://api-m.sandbox.paypal.com';

  try {
    // Create base64 encoded credentials
    const credentials = `${clientId}:${clientSecret}`;
    const encodedCredentials = Buffer.from(credentials).toString('base64');
    
    console.log('Testing PayPal OAuth...');
    console.log('API URL:', paypalApiUrl);
    console.log('Client ID:', clientId);
    console.log('Encoded credentials (first 30 chars):', encodedCredentials.substring(0, 30) + '...');

    const authResponse = await fetch(`${paypalApiUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${encodedCredentials}`,
      },
      body: 'grant_type=client_credentials',
    });

    const responseText = await authResponse.text();
    console.log('Auth response status:', authResponse.status);
    console.log('Auth response text:', responseText);

    if (!authResponse.ok) {
      console.error('❌ PayPal OAuth failed');
      return;
    }

    const authData = JSON.parse(responseText);
    console.log('✅ PayPal OAuth successful');
    console.log('Access token (first 30 chars):', authData.access_token.substring(0, 30) + '...');
    console.log('Token type:', authData.token_type);
    console.log('Expires in:', authData.expires_in);
    
    // Test order creation
    console.log('\n🔄 Testing order creation...');
    const orderData = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: 'USD',
            value: '100.00',
          },
          description: 'Test Order',
        },
      ],
      application_context: {
        return_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
        brand_name: 'iwishBag',
        landing_page: 'LOGIN',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
      },
    };

    const orderResponse = await fetch(`${paypalApiUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.access_token}`,
      },
      body: JSON.stringify(orderData),
    });

    const orderResponseText = await orderResponse.text();
    console.log('Order response status:', orderResponse.status);
    console.log('Order response text:', orderResponseText);

    if (!orderResponse.ok) {
      console.error('❌ PayPal order creation failed');
      return;
    }

    const orderResult = JSON.parse(orderResponseText);
    console.log('✅ PayPal order creation successful');
    console.log('Order ID:', orderResult.id);
    console.log('Order status:', orderResult.status);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

testPayPalAuth();