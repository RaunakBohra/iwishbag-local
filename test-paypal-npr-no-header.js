// Test PayPal function with NPR currency - no auth header at all
const testPayPalNoHeader = async () => {
  console.log('🧪 Testing PayPal NPR currency conversion (no auth header)...');
  
  const testPayload = {
    quoteIds: ['test-quote-123'],
    amount: 13300, // 13,300 NPR (approximately $100 USD)
    currency: 'NPR',
    success_url: 'https://iwishbag.com/success',
    cancel_url: 'https://iwishbag.com/cancel',
    customerInfo: {
      name: 'Test Customer Nepal',
      email: 'test@example.com'
    }
  };

  try {
    const response = await fetch('https://grgvlrvywsfmnmkxrecd.supabase.co/functions/v1/test-paypal-direct', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // No authorization or apikey headers
      },
      body: JSON.stringify(testPayload)
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('Response body:', responseText);

    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log('✅ PayPal function working with NPR currency!');
      console.log('Order ID:', data.order_id);
      console.log('Approval URL:', data.url);
      console.log('Currency conversion:', {
        original: `${data.originalAmount} ${data.originalCurrency}`,
        paypal: `${data.paypalAmount} ${data.paypalCurrency}`,
        exchangeRate: data.exchangeRate,
        converted: data.currencyConverted
      });
    } else {
      console.log('❌ PayPal function still failing');
      try {
        const errorData = JSON.parse(responseText);
        console.log('Error details:', errorData);
      } catch (e) {
        console.log('Raw error response:', responseText);
      }
    }

  } catch (error) {
    console.error('❌ Network or request error:', error);
  }
};

testPayPalNoHeader();