// Test PayPal function without authentication
const testPayPalNoAuth = async () => {
  console.log('🧪 Testing PayPal function WITHOUT authentication...');
  
  const testPayload = {
    quoteIds: ['test-quote-123'],
    amount: 100,
    currency: 'USD',
    success_url: 'https://iwishbag.com/success',
    cancel_url: 'https://iwishbag.com/cancel',
    customerInfo: {
      name: 'Test Customer',
      email: 'test@example.com'
    }
  };

  try {
    const response = await fetch('https://grgvlrvywsfmnmkxrecd.supabase.co/functions/v1/test-paypal-direct', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // No authorization header for this test
      },
      body: JSON.stringify(testPayload)
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('Response body:', responseText);

    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log('✅ PayPal function working correctly');
      console.log('Order ID:', data.order_id);
      console.log('Approval URL:', data.url);
    } else {
      console.log('❌ PayPal function returned error');
    }

  } catch (error) {
    console.error('❌ Network or request error:', error);
  }
};

testPayPalNoAuth();