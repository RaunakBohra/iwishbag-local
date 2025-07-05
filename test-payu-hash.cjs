const crypto = require('crypto');

// Exact parameters from the latest function response
const merchantKey = 'u7Ui5I';
const salt = 'VIen2EwWiQbvsILF4Wt9p9Gh5ixOpSMe';
const txnid = 'PAYU_1751729450837'; // From the latest function response
const amount = '12.82';
const productinfo = 'Order for 02f5c1c7-dfa7-41fd-bcd4-69fc1dd47c10';
const firstname = 'Customer';
const email = 'customer@example.com';

// Generate hash string with exactly 11 pipes after email (no udf fields)
const hashString = [
  merchantKey,
  txnid,
  amount,
  productinfo,
  firstname,
  email,
  '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', // 11 pipes (no udf fields)
  salt
].join('|');

const hash = crypto.createHash('sha512').update(hashString).digest('hex');

console.log('=== PAYU HASH TEST (LATEST FUNCTION RESPONSE) ===');
console.log('Merchant Key:', merchantKey);
console.log('Salt:', salt);
console.log('TXN ID:', txnid);
console.log('Amount:', amount);
console.log('Product Info:', productinfo);
console.log('First Name:', firstname);
console.log('Email:', email);
console.log('Hash String:', hashString);
console.log('Generated Hash:', hash);
console.log('Function Hash:', '84b4a5035f7bace81f24103647908993ad5cfaa95fcdc4967c0aed448fb616fb20cfcb2d34ae2e8a779173351d90b73b9f32a850f76da6efc382bfcb284bb3e9');
console.log('Hashes Match:', hash === '84b4a5035f7bace81f24103647908993ad5cfaa95fcdc4967c0aed448fb616fb20cfcb2d34ae2e8a779173351d90b73b9f32a850f76da6efc382bfcb284bb3e9');

// Let me also test with the exact PayU example parameters
console.log('\n=== TESTING WITH PAYU EXAMPLE PARAMETERS ===');
const payuExampleString = 'u7Ui5I|PAYU_1751728511465|12.82|Order for 02f5c1c7-dfa7-41fd-bcd4-69fc1dd47c10|Customer|customer@example.com|||||||||||VIen2EwWiQbvsILF4Wt9p9Gh5ixOpSMe';
const payuExampleHash = crypto.createHash('sha512').update(payuExampleString).digest('hex');
console.log('PayU Example String:', payuExampleString);
console.log('PayU Example Hash:', payuExampleHash);
console.log('Expected Hash:', '8b226b9d976f375979a7a073f0f9a6548da77f21357244504ff25afba978a363a8a9e9e6efe0c97bcf336361ddecdef8c67b93b556d0ef07ba83a2e83b9236e0');
console.log('Example Hashes Match:', payuExampleHash === '8b226b9d976f375979a7a073f0f9a6548da77f21357244504ff25afba978a363a8a9e9e6efe0c97bcf336361ddecdef8c67b93b556d0ef07ba83a2e83b9236e0'); 