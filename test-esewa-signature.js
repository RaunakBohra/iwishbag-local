// Test eSewa signature generation locally
import crypto from 'crypto';

// Test data
const testData = {
  total_amount: "100.00",
  transaction_uuid: "ESW_1234567890_test",
  product_code: "EPAYTEST"
};

const secretKey = "8gBm/:&EnhH.1/q(";

// Generate signature
const signatureString = `${testData.total_amount},${testData.transaction_uuid},${testData.product_code}`;
console.log('Signature string:', signatureString);

// Method 1: Using Node.js crypto
const hmac = crypto.createHmac('sha256', secretKey);
hmac.update(signatureString);
const signature1 = hmac.digest('base64');
console.log('Method 1 (Node crypto):', signature1);

// Method 2: Manual HMAC construction
const key = Buffer.from(secretKey, 'utf8');
const message = Buffer.from(signatureString, 'utf8');
const hmac2 = crypto.createHmac('sha256', key);
hmac2.update(message);
const signature2 = hmac2.digest('base64');
console.log('Method 2 (Buffer):', signature2);

// Check if they match
console.log('Signatures match:', signature1 === signature2);

// Test with different secret key format (without parenthesis)
const secretKey2 = "8gBm/:&EnhH.1/q";
const hmac3 = crypto.createHmac('sha256', secretKey2);
hmac3.update(signatureString);
const signature3 = hmac3.digest('base64');
console.log('\nWith secret key without parenthesis:', signature3);

// Expected signature format based on eSewa docs
console.log('\nExpected format pattern: Base64 string ending with =');
console.log('Signature 1 ends with =?', signature1.endsWith('='));
console.log('Signature 1 length:', signature1.length);