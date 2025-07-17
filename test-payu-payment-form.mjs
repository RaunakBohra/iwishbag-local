#!/usr/bin/env node

// Test PayU payment form data generation
const SUPABASE_URL = 'https://grgvlrvywsfmnmkxrecd.supabase.co';
const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZ3Zscnb5d3NmbW5ta3hyZWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjgzMjgzMTMsImV4cCI6MjA0MzkwNDMxM30.yCgHJQN3Y4rrXJUJZTqFojl8N3lcFXp2xsz84MQO2qU';

async function testPayUPaymentForm() {
  console.log('🧪 Testing PayU payment form data generation...\n');

  // Test payment data
  const testData = {
    quoteIds: ['b6b97b98-744e-4ae5-91dd-0edfe4d02f6c'], // A real quote ID from your DB
    email: 'test@example.com',
    userId: 'test-user-123',
    customerName: 'Test Customer',
    customerPhone: '9999999999',
    success_url: 'https://whyteclub.com/payment/success',
    failure_url: 'https://whyteclub.com/payment/failure',
    amount: 2069.46, // USD amount from the quote
    currency: 'USD',
    destination_country: 'IN',
  };

  try {
    console.log('📤 Sending payment request...');
    console.log('Request data:', JSON.stringify(testData, null, 2));

    const response = await fetch(`${SUPABASE_URL}/functions/v1/create-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'x-supabase-gateway': 'payu',
      },
      body: JSON.stringify(testData),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Error:', response.status, result);
      return;
    }

    console.log('\n✅ Payment response received:');
    console.log('Success:', result.success);
    console.log('URL:', result.url);
    console.log('Method:', result.method);
    console.log('Transaction ID:', result.transactionId);
    console.log('Amount in INR:', result.amountInINR);
    console.log('Exchange Rate:', result.exchangeRate);

    if (result.formData) {
      console.log('\n📝 Form Data:');
      console.log('Total fields:', Object.keys(result.formData).length);

      // Check required fields
      const requiredFields = [
        'key',
        'txnid',
        'amount',
        'productinfo',
        'firstname',
        'email',
        'phone',
        'surl',
        'furl',
        'hash',
      ];
      const missingFields = requiredFields.filter((field) => !result.formData[field]);

      if (missingFields.length > 0) {
        console.error('❌ Missing required fields:', missingFields);
      } else {
        console.log('✅ All required fields present');
      }

      // Display form data (hide sensitive hash)
      console.log('\nForm fields:');
      Object.entries(result.formData).forEach(([key, value]) => {
        if (key === 'hash') {
          console.log(`  ${key}: ${value.substring(0, 10)}... (${value.length} chars)`);
        } else {
          console.log(`  ${key}: ${value}`);
        }
      });

      // Create a test HTML form to verify
      console.log('\n📋 Test HTML form generated at: test-payu-form-generated.html');

      const htmlForm = `<!DOCTYPE html>
<html>
<head>
    <title>PayU Test Form</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .info { background: #e3f2fd; padding: 15px; margin-bottom: 20px; }
        form { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .field { margin: 10px 0; }
        button { background: #4CAF50; color: white; padding: 10px 20px; border: none; cursor: pointer; }
    </style>
</head>
<body>
    <h1>PayU Payment Test Form</h1>
    <div class="info">
        <p>This form contains the exact data that would be sent to PayU.</p>
        <p>Transaction ID: ${result.transactionId}</p>
        <p>Amount: ₹${result.amountInINR} (${result.currency} ${testData.amount})</p>
    </div>
    
    <form method="POST" action="${result.url}">
        ${Object.entries(result.formData)
          .map(
            ([key, value]) =>
              `<div class="field">
            <label>${key}:</label>
            <input type="${key === 'hash' ? 'password' : 'text'}" name="${key}" value="${value}" readonly />
          </div>`,
          )
          .join('\n        ')}
        <button type="submit">Submit to PayU (Test Mode)</button>
    </form>
</body>
</html>`;

      const fs = await import('fs');
      await fs.promises.writeFile('test-payu-form-generated.html', htmlForm);
    } else {
      console.error('❌ No form data in response!');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testPayUPaymentForm();
