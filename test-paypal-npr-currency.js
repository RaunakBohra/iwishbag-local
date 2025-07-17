// Test PayPal function with NPR currency (should now work with currency conversion)
const testPayPalNPR = async () => {
  console.log('🧪 Testing PayPal function with NPR currency...');
  
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
    const response = await fetch('https://grgvlrvywsfmnmkxrecd.supabase.co/functions/v1/create-paypal-checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZ3ZscnZ5d3NmbW5ta3hyZWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUzMzc1ODQsImV4cCI6MjA1MDkxMzU4NH0.rNJt7K6lEr49s7mONy8_kBDz62j8wuT3h9lWIb4PQ7g',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZ3ZscnZ5d3NmbW5ta3hyZWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUzMzc1ODQsImV4cCI6MjA1MDkxMzU4NH0.rNJt7K6lEr49s7mONy8_kBDz62j8wuT3h9lWIb4PQ7g'
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

testPayPalNPR();