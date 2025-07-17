// Simple Fonepay test without authentication
import { createHmac } from 'crypto';

const testFonepayDirect = async () => {
  console.log('🧪 Testing Fonepay direct API call...');
  
  // Test parameters
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
  
  console.log('🔐 Generated hash:', hash);
  
  // Build URL
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    queryParams.append(key, value);
  });
  queryParams.append('DV', hash);
  
  const fonepayUrl = `https://dev-clientapi.fonepay.com/api/merchantRequest?${queryParams.toString()}`;
  
  console.log('🔗 Payment URL:', fonepayUrl);
  
  try {
    const response = await fetch(fonepayUrl, { method: 'GET' });
    const result = await response.text();
    
    console.log('✅ Response Status:', response.status);
    console.log('📊 Response:', result);
    
    if (result.includes('Invalid Merchant Code')) {
      console.log('❌ Merchant code still invalid');
    } else if (result.includes('Data Validation Failed')) {
      console.log('⚠️  Data validation failed (expected with test hash)');
    } else if (response.status === 200 || result.includes('success')) {
      console.log('🎉 Fonepay API accepts the request!');
    } else {
      console.log('ℹ️  Response indicates merchant code is valid');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

// Run the test
console.log('🚀 Starting Simple Fonepay Test...\n');
testFonepayDirect().then(() => {
  console.log('\n✅ Test completed!');
}).catch(error => {
  console.error('\n❌ Test failed:', error);
});