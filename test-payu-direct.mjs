#!/usr/bin/env node

// Direct test of PayU payment creation using service role key
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://grgvlrvywsfmnmkxrecd.supabase.co';
const SUPABASE_SERVICE_ROLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZ3Zscnb5d3NmbW5ta3hyZWNkIiwicm9sZSI6InNlcnZpY2Ukcm9sZSIsImlhdCI6MTcyODMyODMxMywiZXhwIjoyMDQzOTA0MzEzfQ.iZ1JLTDKY5w3xKe5S37GUJY7AxcQURv-9B0TFfyG-3g';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

async function testPayUDirect() {
  console.log('🧪 Testing PayU payment directly with service role...\n');

  try {
    // First, get a real quote to test with
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', 'b6b97b98-744e-4ae5-91dd-0edfe4d02f6c')
      .single();

    if (quoteError || !quote) {
      console.error('❌ Quote not found:', quoteError);
      return;
    }

    console.log('📋 Quote details:');
    console.log('- ID:', quote.id);
    console.log('- Display ID:', quote.display_id);
    console.log('- Total:', quote.final_total, 'USD');
    console.log('- Destination:', quote.destination_country);
    console.log('- Status:', quote.status);

    // Prepare payment request
    const paymentRequest = {
      quoteIds: [quote.id],
      email: 'test@example.com',
      userId: quote.user_id || '123e4567-e89b-12d3-a456-426614174000',
      customerName: 'Test Customer',
      customerPhone: '9999999999',
      success_url: 'https://whyteclub.com/payment/success',
      failure_url: 'https://whyteclub.com/payment/failure',
      amount: quote.final_total,
      currency: 'USD',
      destination_country: quote.destination_country || 'IN',
      gateway: 'payu'
    };

    console.log('\n📤 Calling create-payment edge function...');
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/create-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE}`,
        'x-supabase-gateway': 'payu'
      },
      body: JSON.stringify(paymentRequest)
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('❌ Error:', response.status, result);
      return;
    }

    console.log('\n✅ Payment response received:');
    console.log('- Success:', result.success);
    console.log('- URL:', result.url);
    console.log('- Method:', result.method);
    console.log('- Transaction ID:', result.transactionId);
    console.log('- Amount in INR:', result.amountInINR);
    console.log('- Exchange Rate:', result.exchangeRate);
    
    if (result.formData) {
      console.log('\n📝 Form Data Present: YES');
      console.log('- Total fields:', Object.keys(result.formData).length);
      
      // Check required fields
      const requiredFields = ['key', 'txnid', 'amount', 'productinfo', 'firstname', 'email', 'phone', 'surl', 'furl', 'hash'];
      const presentFields = Object.keys(result.formData);
      const missingFields = requiredFields.filter(field => !presentFields.includes(field));
      
      if (missingFields.length > 0) {
        console.error('❌ Missing required fields:', missingFields);
      } else {
        console.log('✅ All required fields present');
      }
      
      // Display form data summary
      console.log('\nForm field summary:');
      Object.entries(result.formData).forEach(([key, value]) => {
        if (key === 'hash') {
          console.log(`  ${key}: ${value.substring(0, 10)}... (${value.length} chars)`);
        } else if (key === 'surl' || key === 'furl') {
          console.log(`  ${key}: ${value}`);
        } else {
          console.log(`  ${key}: ${value}`);
        }
      });
      
      // Test form submission HTML
      console.log('\n📋 Creating test HTML form...');
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>PayU Direct Test</title>
  <script>
    window.onload = function() {
      // Auto-submit the form after 3 seconds
      setTimeout(() => {
        console.log('Submitting form...');
        document.getElementById('payuForm').submit();
      }, 3000);
    };
  </script>
</head>
<body>
  <h1>PayU Payment Test</h1>
  <p>Form will auto-submit in 3 seconds...</p>
  <form id="payuForm" method="POST" action="${result.url}">
    ${Object.entries(result.formData).map(([key, value]) => 
      `<input type="hidden" name="${key}" value="${value}" />`
    ).join('\n    ')}
    <button type="submit">Submit Now</button>
  </form>
</body>
</html>`;
      
      const fs = await import('fs');
      await fs.promises.writeFile('test-payu-direct.html', htmlContent);
      console.log('✅ Test HTML saved to: test-payu-direct.html');
      
    } else {
      console.error('\n❌ No form data in response!');
      console.log('Full response:', JSON.stringify(result, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testPayUDirect();