// Test PayPal checkout function
const testPayPalCheckout = async () => {
  const testPayload = {
    quoteIds: ["test-quote-123"],
    amount: 100.00,
    currency: "USD",
    success_url: "https://iwishbag.com/success",
    cancel_url: "https://iwishbag.com/cancel",
    customerInfo: {
      name: "Test Customer",
      email: "test@example.com",
      phone: "+1234567890"
    }
  };

  try {
    const response = await fetch('https://grgvlrvywsfmnmkxrecd.supabase.co/functions/v1/create-paypal-checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
      },
      body: JSON.stringify(testPayload)
    });

    const responseText = await response.text();
    console.log('Response status:', response.status);
    console.log('Response text:', responseText);
    
    if (!response.ok) {
      console.error('Error response:', responseText);
      return;
    }

    const data = JSON.parse(responseText);
    console.log('Success:', data);
    
  } catch (error) {
    console.error('Request failed:', error);
  }
};

testPayPalCheckout();