// Test eSewa v2 signature generation
import crypto from 'crypto';

// Test data from demo
const testData = {
    total_amount: "100",
    transaction_uuid: "250117-123456",
    product_code: "EPAYTEST",
    secret_key: "8gBm/:&EnhH.1/q"
};

console.log('🧪 Testing eSewa v2 signature generation...');

// Create signature string (same format as demo)
const signatureString = `total_amount=${testData.total_amount},transaction_uuid=${testData.transaction_uuid},product_code=${testData.product_code}`;
console.log('📝 Signature string:', signatureString);

// Generate HMAC-SHA256 signature
const signature = crypto
    .createHmac('sha256', testData.secret_key)
    .update(signatureString)
    .digest('base64');

console.log('🔐 Generated signature:', signature);

// Test with demo values
const demoSignatureString = `total_amount=100,transaction_uuid=11-200-1111,product_code=EPAYTEST`;
const demoSignature = crypto
    .createHmac('sha256', testData.secret_key)
    .update(demoSignatureString)
    .digest('base64');

// Test with trailing comma (as seen in demo HTML)
const demoSignatureStringWithComma = `total_amount=100,transaction_uuid=11-200-1111,product_code=EPAYTEST,`;
const demoSignatureWithComma = crypto
    .createHmac('sha256', testData.secret_key)
    .update(demoSignatureStringWithComma)
    .digest('base64');

console.log('');
console.log('🎯 Demo test:');
console.log('📝 Demo signature string:', demoSignatureString);
console.log('🔐 Demo signature:', demoSignature);
console.log('');
console.log('🎯 Demo test (with trailing comma):');
console.log('📝 Demo signature string:', demoSignatureStringWithComma);
console.log('🔐 Demo signature:', demoSignatureWithComma);
console.log('');

// Expected signature from demo HTML file
const expectedSignature = "4Ov7pCI1zIOdwtV2BRMUNjz1upIlT/COTxfLhWvVurE=";
console.log('✅ Expected signature:', expectedSignature);
console.log('🎯 Match (no comma):', demoSignature === expectedSignature ? 'YES' : 'NO');
console.log('🎯 Match (with comma):', demoSignatureWithComma === expectedSignature ? 'YES' : 'NO');

if (demoSignature === expectedSignature) {
    console.log('✅ Signature generation is working correctly!');
} else if (demoSignatureWithComma === expectedSignature) {
    console.log('✅ Signature generation is working correctly (with trailing comma)!');
} else {
    console.log('❌ Signature generation mismatch');
    console.log('💭 Check if secret key or format is incorrect');
}