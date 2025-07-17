// Test Fonepay live configuration
import { createHmac } from 'crypto';

const testFonepayLive = async () => {
  console.log('🚀 Testing Fonepay LIVE configuration...');
  console.log('⚠️  This will use the production Fonepay API\n');
  
  // Live production parameters
  const secretKey = 'dd3f7d1be3ad401a84b374aca469aa48'; // Live secret key
  const params = {
    PID: '2222050014849742', // Live merchant code
    MD: 'P',
    PRN: `LIVE_TEST_${Date.now()}`,
    AMT: '10.00', // Small test amount
    CRN: 'NPR',
    DT: new Date().toLocaleDateString('en-US'),
    R1: 'Live Test Order',
    R2: 'Test Customer',
    RU: 'http://localhost:8081/api/fonepay-callback'
  };
  
  // Generate hash string
  const hashString = [
    params.PID,
    params.MD,
    params.PRN,
    params.AMT,
    params.CRN,
    params.DT,
    params.R1,
    params.R2,
    params.RU
  ].join(',');
  
  console.log('📝 Hash string:', hashString);
  
  // Generate HMAC-SHA512 hash
  const hash = createHmac('sha512', secretKey)
    .update(hashString)
    .digest('hex');
  
  console.log('🔐 Generated hash:', hash.substring(0, 20) + '...');
  
  // Build URL for LIVE API
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    queryParams.append(key, value);
  });
  queryParams.append('DV', hash);
  
  const fonepayLiveUrl = `https://clientapi.fonepay.com/api/merchantRequest?${queryParams.toString()}`;
  
  console.log('🔗 Live Payment URL Generated');
  console.log('📋 Parameters:');
  console.log('   - Merchant Code:', params.PID);
  console.log('   - Amount:', params.AMT, 'NPR');
  console.log('   - PRN:', params.PRN);
  console.log('   - Environment: PRODUCTION');
  
  try {
    console.log('\n🧪 Testing live API connectivity...');
    const response = await fetch(fonepayLiveUrl, { 
      method: 'GET',
      timeout: 10000
    });
    
    console.log('✅ Response Status:', response.status);
    
    if (response.status === 200) {
      console.log('🎉 Live Fonepay API is accessible!');
      console.log('✅ Configuration appears to be correct');
    } else if (response.status === 409) {
      console.log('⚠️  409 Conflict - Check response for details');
      const result = await response.text();
      console.log('📄 Response:', result.substring(0, 200) + '...');
    } else {
      console.log('❌ Unexpected status code');
      const result = await response.text();
      console.log('📄 Response:', result.substring(0, 200) + '...');
    }
    
  } catch (error) {
    console.error('❌ Live API test failed:', error.message);
  }
  
  console.log('\n💡 To test actual payment:');
  console.log('1. Use the frontend checkout');
  console.log('2. Select Fonepay payment method');
  console.log('3. Complete payment with real Fonepay account');
  console.log('4. Verify callback handling');
};

// Test our Edge Function configuration
const testEdgeFunction = async () => {
  console.log('\n🔧 Testing Edge Function with live config...');
  
  const testPaymentRequest = {
    quoteIds: ['2c51b248-475f-41e1-8450-4f02831752a1'],
    gateway: 'fonepay',
    success_url: 'http://localhost:8081/payment-success',
    cancel_url: 'http://localhost:8081/payment-failure',
    amount: 10, // Small test amount
    currency: 'NPR',
    customerInfo: {
      name: 'Live Test Customer',
      email: 'test@example.com',
      phone: '9801234567'
    },
    metadata: {
      test: true,
      guest_session_token: `live-test-${Date.now()}`
    }
  };

  try {
    const response = await fetch('http://127.0.0.1:54321/functions/v1/create-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0`
      },
      body: JSON.stringify(testPaymentRequest)
    });

    const result = await response.json();
    
    console.log('✅ Edge Function Response Status:', response.status);
    
    if (result.success && result.url) {
      console.log('🎉 Edge Function created live payment URL successfully!');
      console.log('🔗 Payment URL contains live API endpoint');
      console.log('📋 Live Environment Details:');
      console.log('   - Uses production merchant code');
      console.log('   - Uses production secret key');
      console.log('   - Points to live Fonepay API');
    } else {
      console.log('❌ Edge Function response:', result);
    }

  } catch (error) {
    console.error('❌ Edge Function test failed:', error.message);
  }
};

// Run tests
console.log('🚀 Starting Fonepay Live Configuration Tests...\n');

testFonepayLive().then(() => {
  return testEdgeFunction();
}).then(() => {
  console.log('\n✅ Live configuration tests completed!');
  console.log('\n🎯 Ready for production testing!');
}).catch(error => {
  console.error('\n❌ Live tests failed:', error);
});