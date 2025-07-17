// Test eSewa v2 integration - Compare with demo
const testParams = {
  amount: '100',
  tax_amount: '0',
  total_amount: '100',
  transaction_uuid: '11-200-1111',
  product_code: 'EPAYTEST',
  product_service_charge: '0',
  product_delivery_charge: '0',
  success_url: 'https://esewa.com.np',
  failure_url: 'https://google.com',
  signed_field_names: 'total_amount,transaction_uuid,product_code,',
  signature: '4Ov7pCI1zIOdwtV2BRMUNjz1upIlT/COTxfLhWvVurE=',
};

console.log('=== eSewa v2 Test Parameters ===');
console.log('URL: https://rc-epay.esewa.com.np/api/epay/main/v2/form');
console.log('Method: POST');
console.log('Parameters:', testParams);

// Test signature generation
import crypto from 'crypto';
const message = `total_amount=${testParams.total_amount},transaction_uuid=${testParams.transaction_uuid},product_code=${testParams.product_code}`;
const secret = '8gBm/:&EnhH.1/q'; // Test secret from demo

console.log('\n=== Signature Test ===');
console.log('Message:', message);
console.log('Secret:', secret);

const signature = crypto.createHmac('sha256', secret).update(message).digest('base64');

console.log('Generated Signature:', signature);
console.log('Expected Signature:', testParams.signature);
console.log('Match:', signature === testParams.signature);

// Test form submission
console.log('\n=== Form HTML ===');
const form = `
<form action="https://rc-epay.esewa.com.np/api/epay/main/v2/form" method="POST">
  <input type="hidden" name="amount" value="${testParams.amount}">
  <input type="hidden" name="tax_amount" value="${testParams.tax_amount}">
  <input type="hidden" name="total_amount" value="${testParams.total_amount}">
  <input type="hidden" name="transaction_uuid" value="${testParams.transaction_uuid}">
  <input type="hidden" name="product_code" value="${testParams.product_code}">
  <input type="hidden" name="product_service_charge" value="${testParams.product_service_charge}">
  <input type="hidden" name="product_delivery_charge" value="${testParams.product_delivery_charge}">
  <input type="hidden" name="success_url" value="${testParams.success_url}">
  <input type="hidden" name="failure_url" value="${testParams.failure_url}">
  <input type="hidden" name="signed_field_names" value="${testParams.signed_field_names}">
  <input type="hidden" name="signature" value="${signature}">
  <input type="submit" value="Pay with eSewa">
</form>
`;

console.log(form);
