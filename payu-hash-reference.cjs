// payu-hash-reference.js
const crypto = require('crypto');

const merchantKey = 'u7Ui5I';
const salt = 'VIen2EwWiQbvsILF4Wt9p9Gh5ixOpSMe';

const txnid = 'PAYU_1751728052904';
const amount = '12.82';
const productinfo = 'Order for 02f5c1c7-dfa7-41fd-bcd4-69fc1dd47c10';
const firstname = 'Customer';
const email = 'customer@example.com';

const hashString = [
  merchantKey,
  txnid,
  amount,
  productinfo,
  firstname,
  email,
  '', '', '', '', '', // udf1-udf5
  '', '', '', '',     // udf6-udf10
  salt
].join('|');

const hash = crypto.createHash('sha512').update(hashString).digest('hex');

console.log('Hash String:', hashString);
console.log('Hash:', hash); 