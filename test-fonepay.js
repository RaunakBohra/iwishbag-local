// Test script to verify Fonepay payment integration
const testFonepayPayment = async () => {
  const testPaymentRequest = {
    quoteIds: ['2c51b248-475f-41e1-8450-4f02831752a1'], // Using a real quote ID
    gateway: 'fonepay',
    success_url: 'http://localhost:8081/payment-success', // Updated to correct port
    cancel_url: 'http://localhost:8081/payment-failure',
    amount: 100, // NPR 100
    currency: 'NPR',
    customerInfo: {
      name: 'Test Customer',
      email: 'iwbtracking@gmail.com',
      phone: '9801234567',
    },
    metadata: {
      test: true,
      guest_session_token: `test-session-${Date.now()}`, // Dynamic session token
    },
  };

  try {
    console.log('🧪 Testing Fonepay payment creation...');
    console.log('📊 Payment request:', JSON.stringify(testPaymentRequest, null, 2));

    const response = await fetch('http://127.0.0.1:54321/functions/v1/create-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0`,
      },
      body: JSON.stringify(testPaymentRequest),
    });

    const result = await response.json();

    console.log('✅ Response Status:', response.status);
    console.log('📊 Response Data:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('🎉 Fonepay payment creation successful!');
      console.log('🔗 Payment URL:', result.url);
      console.log('🆔 Transaction ID (PRN):', result.transactionId);
      console.log('\n📱 To test payment:');
      console.log('1. Open the payment URL in a browser');
      console.log('2. You should see Fonepay payment page with QR code');
      console.log('3. Scan QR code with Fonepay mobile app');
      console.log('4. Complete payment in the app');
      console.log('5. Check callback handling at /api/fonepay-callback');
    } else {
      console.log('❌ Fonepay payment creation failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Test hash generation
const testFonepayHash = async () => {
  console.log('\n🔐 Testing Fonepay hash generation...');

  const secretKey = 'fonepay'; // Test secret key from documentation
  const params = {
    PID: 'fonepay123', // Test merchant code from documentation
    MD: 'P',
    PRN: `TEST_${Date.now()}`,
    AMT: '100.00',
    CRN: 'NPR',
    DT: new Date().toLocaleDateString('en-US'),
    R1: 'Test Order',
    R2: 'Test Customer',
    RU: 'http://localhost:8081/api/fonepay-callback',
  };

  const hashString = [
    params.PID,
    params.MD,
    params.PRN,
    params.AMT,
    params.CRN,
    params.DT,
    params.R1,
    params.R2,
    params.RU,
  ].join(',');

  console.log('Hash string:', hashString);

  // Generate HMAC-SHA512 hash using Node.js crypto
  const { createHmac } = await import('crypto');
  const hash = createHmac('sha512', secretKey).update(hashString).digest('hex');

  console.log('Generated hash:', hash);
  console.log('\n✅ Hash generation successful!');
};

// Test callback verification
const testFonepayCallback = async () => {
  console.log('\n🔍 Testing Fonepay callback verification...');

  // Simulate Fonepay callback parameters
  const callbackParams = {
    PRN: 'FP_1234567890_abc123',
    PID: 'fonepay123', // Updated to use test merchant code
    PS: 'true',
    RC: '00',
    UID: 'FONEPAY-12345',
    BC: 'NICA',
    INI: '9801234567',
    P_AMT: '100.00',
    R_AMT: '100.00',
    DV: 'sample_hash_here',
  };

  const queryString = new URLSearchParams(callbackParams).toString();
  const callbackUrl = `http://127.0.0.1:54321/functions/v1/fonepay-callback?${queryString}`;

  console.log('Callback URL:', callbackUrl);
  console.log('Callback params:', callbackParams);

  try {
    const response = await fetch(callbackUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'}`,
      },
    });

    console.log('✅ Callback Response Status:', response.status);
    console.log('📋 Callback Response Headers:', Object.fromEntries(response.headers.entries()));

    if (response.status === 302) {
      console.log('🔄 Redirect Location:', response.headers.get('Location'));
      console.log('✅ Callback handling successful!');
    }
  } catch (error) {
    console.error('❌ Callback test failed:', error);
  }
};

// Run tests
console.log('🚀 Starting Fonepay Integration Tests...\n');

testFonepayPayment()
  .then(() => {
    return testFonepayHash();
  })
  .then(() => {
    return testFonepayCallback();
  })
  .then(() => {
    console.log('\n✅ All tests completed!');
  })
  .catch((error) => {
    console.error('\n❌ Test suite failed:', error);
  });
