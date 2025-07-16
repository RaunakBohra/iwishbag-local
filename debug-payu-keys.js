// Check PayU key configuration
console.log('PayU Key Analysis:');
console.log('================');

const merchantKey = 'u7Ui5I';
const saltKey = 'U39kJNfW';

console.log('Merchant Key:', merchantKey);
console.log('Merchant Key Length:', merchantKey.length);
console.log('Salt Key:', saltKey);
console.log('Salt Key Length:', saltKey.length);

// PayU test keys are typically longer
console.log('\nKey Analysis:');
console.log('- Merchant key seems very short (typical PayU keys are longer)');
console.log('- Salt key also seems short');
console.log('- These might be invalid test keys');

// Common PayU test credentials (publicly available)
console.log('\nCommon PayU Test Credentials:');
console.log('Merchant Key: rjQUPktU (test)');
console.log('Salt Key: e5iIg1jwi8UnzIZJJJP9hK43y9PNYvBKBSFMvVHrOHx (test)');

// Generate a test hash to see if current keys work
async function generateTestHash() {
    const testData = {
        key: merchantKey,
        txnid: 'TEST_12345',
        amount: '100.00',
        productinfo: 'Test Product',
        firstname: 'Test User',
        email: 'test@example.com',
        udf1: '', udf2: '', udf3: '', udf4: '', udf5: ''
    };
    
    // PayU hash format: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT
    const hashString = [
        testData.key,
        testData.txnid,
        testData.amount,
        testData.productinfo,
        testData.firstname,
        testData.email,
        testData.udf1,
        testData.udf2,
        testData.udf3,
        testData.udf4,
        testData.udf5,
        '', '', '', '', '', // 5 empty fields
        saltKey
    ].join('|');
    
    console.log('\nHash Generation Test:');
    console.log('Hash String:', hashString);
    
    // In browser environment, we'd use crypto.subtle.digest
    // Here we'll just show the string that would be hashed
    console.log('This string would be SHA-512 hashed');
    
    return hashString;
}

generateTestHash();