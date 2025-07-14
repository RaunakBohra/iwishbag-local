// Debug script to test PayU hash generation formulas
import crypto from 'crypto';

// Test PayU configuration
const config = {
  merchant_key: "TEST_MERCHANT_KEY",
  salt_key: "TEST_SALT_KEY"
};

// Test parameters
const command = 'cancel_refund_transaction';
const mihpayid = 'test12345';
const originalTxnId = 'original123';
const refundRequestId = `REF-${Date.now()}`;
const amount = '100.00';

console.log('\n=== PayU Hash Generation Debug ===');
console.log('Command:', command);
console.log('PayU ID (mihpayid):', mihpayid);
console.log('Original Transaction ID:', originalTxnId);
console.log('Refund Request ID:', refundRequestId);
console.log('Amount:', amount);

// Function to generate hash
function generatePayUHash(data) {
  const hash = crypto.createHash('sha512').update(data).digest('hex');
  return hash;
}

console.log('\n=== Testing Different Hash Formulas ===');

// Formula 1: Simple 4-parameter format (like other PayU APIs)
const formula1 = `${config.merchant_key}|${command}|${mihpayid}|${config.salt_key}`;
const hash1 = generatePayUHash(formula1);
console.log('\n1. Simple 4-parameter:');
console.log('   Formula:', formula1);
console.log('   Hash:', hash1);

// Formula 2: With token (refund request ID)
const formula2 = `${config.merchant_key}|${command}|${mihpayid}|${refundRequestId}|${config.salt_key}`;
const hash2 = generatePayUHash(formula2);
console.log('\n2. With token (5-parameter):');
console.log('   Formula:', formula2);
console.log('   Hash:', hash2);

// Formula 3: With amount (current implementation)
const formula3 = `${config.merchant_key}|${command}|${mihpayid}|${refundRequestId}|${amount}|${config.salt_key}`;
const hash3 = generatePayUHash(formula3);
console.log('\n3. With amount (6-parameter):');
console.log('   Formula:', formula3);
console.log('   Hash:', hash3);

// Formula 4: With original txnid
const formula4 = `${config.merchant_key}|${command}|${mihpayid}|${originalTxnId}|${config.salt_key}`;
const hash4 = generatePayUHash(formula4);
console.log('\n4. With original txnid (5-parameter):');
console.log('   Formula:', formula4);
console.log('   Hash:', hash4);

// Formula 5: Typical get_transaction_details format
const formula5 = `${config.merchant_key}|${command}|${mihpayid}|${config.salt_key}`;
const hash5 = generatePayUHash(formula5);
console.log('\n5. get_transaction_details format:');
console.log('   Formula:', formula5);
console.log('   Hash:', hash5);

// Formula 6: Alternative order with amount first
const formula6 = `${config.merchant_key}|${command}|${amount}|${mihpayid}|${config.salt_key}`;
const hash6 = generatePayUHash(formula6);
console.log('\n6. Amount first:');
console.log('   Formula:', formula6);
console.log('   Hash:', hash6);

console.log('\n=== Summary ===');
console.log('Based on other PayU implementations in the codebase, the most likely formulas are:');
console.log('- Formula 1 (simple 4-parameter): Matches create_invoice pattern');
console.log('- Formula 5 (get_transaction_details): Matches verification pattern');
console.log('\nWe should test these against the actual PayU API to see which one works.');