# PayU Payment Gateway Integration - Complete Technical Guide

## Table of Contents
1. [Overview](#overview)
2. [PayU Integration Architecture](#payu-integration-architecture)
3. [Step-by-Step Implementation](#step-by-step-implementation)
4. [Common Issues and Solutions](#common-issues-and-solutions)
5. [Testing and Debugging](#testing-and-debugging)
6. [Production Deployment](#production-deployment)
7. [Troubleshooting Guide](#troubleshooting-guide)

---

## Overview

This document provides a complete technical guide for implementing PayU payment gateway integration in the iwishBag e-commerce platform. PayU is used primarily for payments in India and Nepal, handling INR transactions.

### Key Components
- **Frontend**: React checkout form with direct form submission
- **Backend**: Supabase Edge Functions for payment processing
- **Database**: PostgreSQL with payment configuration storage
- **Hash Generation**: SHA-512 for payment security

---

## PayU Integration Architecture

### 1. **System Flow**
```
Customer Checkout → Frontend Payment Form → Hash Generation → PayU Redirect → PayU Processing → Webhook/Callback → Order Completion
```

### 2. **Key Files and Components**
```
Frontend:
├── src/pages/Checkout.tsx              # Main checkout page with PayU form
├── src/hooks/usePaymentGateways.ts     # Payment gateway configuration
├── src/types/payment.ts                # Payment type definitions

Backend:
├── supabase/functions/create-payment/index.ts    # Payment creation endpoint
├── supabase/functions/stripe-webhook/index.ts    # Webhook handling (PayU uses same)

Database:
├── payment_gateways table             # PayU configuration storage
├── quotes table                       # Order/quote management
├── country_settings table             # Exchange rates and country config
```

### 3. **PayU Configuration Structure**
```sql
-- payment_gateways table structure
{
  "code": "payu",
  "name": "PayU",
  "config": {
    "merchant_key": "u7Ui5I",
    "merchant_id": "8725115", 
    "salt_key": "VIen2EwWiQbvsILF4Wt9p9Gh5ixOpSMe",
    "environment": "test"
  },
  "test_mode": true
}
```

---

## Step-by-Step Implementation

### Step 1: Database Configuration

#### 1.1 Insert PayU Gateway Configuration
```sql
-- Insert PayU gateway configuration
INSERT INTO payment_gateways (code, name, config, test_mode, enabled) 
VALUES (
  'payu',
  'PayU',
  '{
    "merchant_key": "u7Ui5I",
    "merchant_id": "8725115",
    "salt_key": "VIen2EwWiQbvsILF4Wt9p9Gh5ixOpSMe",
    "environment": "test"
  }',
  true,
  true
);
```

#### 1.2 Verify Database Schema
```sql
-- Verify payment_gateways table exists
SELECT * FROM payment_gateways WHERE code = 'payu';

-- Check quotes table has required fields
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'quotes' AND column_name IN ('payment_method', 'payment_status');
```

### Step 2: Backend Edge Function Implementation

#### 2.1 PayU Hash Generation (Critical)
```typescript
// File: supabase/functions/create-payment/index.ts
async function generatePayUHash({
  merchantKey,
  salt,
  txnid,
  amount,
  productinfo,
  firstname,
  email,
  udf1 = '',
  udf2 = '',
  udf3 = '',
  udf4 = '',
  udf5 = ''
}: {
  merchantKey: string,
  salt: string,
  txnid: string,
  amount: string,
  productinfo: string,
  firstname: string,
  email: string,
  udf1?: string,
  udf2?: string,
  udf3?: string,
  udf4?: string,
  udf5?: string
}): Promise<{v1: string, v2: string}> {
  // PayU hash formula: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT
  const hashString = [
    merchantKey,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    udf1, udf2, udf3, udf4, udf5, // 5 UDF fields
    '', '', '', '', '', // 5 empty pipes (CRITICAL!)
    salt
  ].join('|');
  
  console.log('PayU hash generation for transaction:', txnid);
  
  const encoder = new TextEncoder();
  const data = encoder.encode(hashString);
  const hashBuffer = await crypto.subtle.digest('SHA-512', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return {
    v1: hashHex,
    v2: hashHex // Can implement reversed salt logic if needed
  };
}
```

#### 2.2 PayU Payment Creation Logic
```typescript
// File: supabase/functions/create-payment/index.ts
case 'payu':
  try {
    // Fetch PayU config from database
    const { data: payuGateway, error: payuGatewayError } = await supabaseAdmin
      .from('payment_gateways')
      .select('config, test_mode')
      .eq('code', 'payu')
      .single();

    if (payuGatewayError || !payuGateway) {
      throw new Error('PayU gateway config missing');
    }

    const config = payuGateway.config || {};
    const testMode = payuGateway.test_mode;
    const payuConfig = {
      merchant_key: config.merchant_key,
      salt_key: config.salt_key,
      payment_url: testMode ? 'https://test.payu.in/_payment' : 'https://secure.payu.in/_payment'
    };

    // Convert amount to INR if needed
    const { data: indiaSettings } = await supabaseAdmin
      .from('country_settings')
      .select('rate_from_usd')
      .eq('code', 'IN')
      .single();

    const exchangeRate = indiaSettings.rate_from_usd;
    const amountInINR = totalCurrency === 'INR' ? totalAmount : totalAmount * exchangeRate;

    // Generate transaction ID
    const txnid = `PAYU_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create PayU form data
    const payuRequest = {
      key: payuConfig.merchant_key,
      txnid: txnid,
      amount: amountInINR.toFixed(2),
      productinfo: `Order: ${productNames} (${quoteIds.join(',')})`,
      firstname: customerName,
      email: customerEmail,
      phone: customerPhone,
      surl: `${baseUrl}/payment-success?gateway=payu`,
      furl: `${baseUrl}/payment-failure?gateway=payu`,
      hash: await generatePayUHash({
        merchantKey: payuConfig.merchant_key,
        salt: payuConfig.salt_key,
        txnid,
        amount: amountInINR.toFixed(2),
        productinfo: `Order: ${productNames} (${quoteIds.join(',')})`,
        firstname: customerName,
        email: customerEmail
      }).v1,
      udf1: '',
      udf2: '',
      udf3: '',
      udf4: '',
      udf5: ''
    };

    return {
      success: true,
      url: payuConfig.payment_url,
      method: 'POST',
      formData: payuRequest,
      transactionId: txnid,
      amountInINR: amountInINR,
      exchangeRate: totalCurrency === 'INR' ? 1 : exchangeRate
    };
  } catch (error) {
    console.error('PayU payment creation failed:', error);
    throw error;
  }
```

### Step 3: Frontend Implementation

#### 3.1 PayU Form Submission (Direct Approach)
```typescript
// File: src/pages/Checkout.tsx
if (paymentMethod === 'payu') {
  // Direct PayU form submission (bypasses Edge Function for reliability)
  console.log('🔧 PayU: Direct form submission approach');
  
  const payuConfig = {
    merchant_key: 'u7Ui5I',
    merchant_id: '8725115',
    salt_key: 'VIen2EwWiQbvsILF4Wt9p9Gh5ixOpSMe',
    environment: 'test'
  };
  
  const txnid = 'PAYU_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  const productinfo = 'iWishBag Order (' + txnid + ')';
  
  // Create form data exactly like test page
  const formData = {
    key: payuConfig.merchant_key,
    txnid: txnid,
    amount: totalAmount.toFixed(2),
    productinfo: productinfo,
    firstname: isGuestCheckout ? (guestContact.fullName || 'Test Customer') : (userProfile?.full_name || 'Test Customer'),
    email: isGuestCheckout ? guestContact.email || 'test@example.com' : (user?.email || 'test@example.com'),
    phone: addressFormData.phone || '9999999999',
    surl: window.location.origin + '/payment-success?gateway=payu',
    furl: window.location.origin + '/payment-failure?gateway=payu',
    udf1: '',
    udf2: '',
    udf3: '',
    udf4: '',
    udf5: ''
  };

  // Generate hash exactly like test page
  const generatePayUHash = async (data: any) => {
    const hashString = [
      data.key,
      data.txnid,
      data.amount,
      data.productinfo,
      data.firstname,
      data.email,
      data.udf1 || '',
      data.udf2 || '',
      data.udf3 || '',
      data.udf4 || '',
      data.udf5 || '',
      '', '', '', '', '', // 5 empty fields (CRITICAL!)
      payuConfig.salt_key
    ].join('|');
    
    const encoder = new TextEncoder();
    const data_encoded = encoder.encode(hashString);
    const hashBuffer = await crypto.subtle.digest('SHA-512', data_encoded);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
  };

  // Generate hash and validate
  const hash = await generatePayUHash(formData);
  formData.hash = hash;

  // Create and submit form
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = 'https://test.payu.in/_payment';
  form.target = '_self';
  form.style.display = 'none';

  // Add all form fields
  Object.entries(formData).forEach(([key, value]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = value;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
}
```

#### 3.2 Payment Gateway Configuration Hook
```typescript
// File: src/hooks/usePaymentGateways.ts
export const usePaymentGateways = () => {
  const { data: gateways, isLoading, error } = useQuery({
    queryKey: ['payment-gateways'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_gateways')
        .select('*')
        .eq('enabled', true)
        .order('display_order');
      
      if (error) throw error;
      return data || [];
    }
  });

  const getGatewayConfig = (code: string) => {
    return gateways?.find(g => g.code === code);
  };

  return {
    gateways: gateways || [],
    isLoading,
    error,
    getGatewayConfig
  };
};
```

### Step 4: Success/Failure Handling

#### 4.1 Success Page Implementation
```typescript
// File: src/pages/payment-success.tsx
const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  useEffect(() => {
    const gateway = searchParams.get('gateway');
    
    if (gateway === 'payu') {
      // PayU returns transaction details in URL parameters
      const payuTxnId = searchParams.get('txnid');
      const payuStatus = searchParams.get('status');
      const payuAmount = searchParams.get('amount');
      
      if (payuStatus === 'success') {
        // Update order status to paid
        updateOrderStatus(payuTxnId, 'paid');
        toast.success('Payment successful!');
      } else {
        navigate('/payment-failure?gateway=payu');
      }
    }
  }, [searchParams]);

  return (
    <div className="payment-success-container">
      <h1>Payment Successful!</h1>
      <p>Your order has been confirmed.</p>
    </div>
  );
};
```

---

## Common Issues and Solutions

### Issue 1: "Mandatory parameter missing" Error

**Cause**: PayU not receiving form parameters or hash mismatch

**Solutions**:
1. **Check Salt Key**: Ensure database has correct salt key
2. **Verify Hash Generation**: Must include 5 empty pipes after UDF fields
3. **Form Submission**: Use `_self` target, not `_blank`
4. **Field Validation**: Ensure all required fields are present

```sql
-- Fix salt key in database
UPDATE payment_gateways 
SET config = jsonb_set(config, '{salt_key}', '"VIen2EwWiQbvsILF4Wt9p9Gh5ixOpSMe"')
WHERE code = 'payu';
```

### Issue 2: "Invalid amount" Error

**Cause**: Amount formatting or currency conversion issues

**Solutions**:
1. **Amount Format**: Use `amount.toFixed(2)` for 2 decimal places
2. **Currency**: PayU expects INR amounts, convert if needed
3. **Minimum Amount**: Ensure amount >= 1 INR

```typescript
// Correct amount formatting
const amountInINR = totalCurrency === 'INR' ? totalAmount : totalAmount * exchangeRate;
const formattedAmount = amountInINR.toFixed(2);
```

### Issue 3: Hash Generation Mismatch

**Cause**: Incorrect hash string format or salt key

**Hash String Format** (CRITICAL):
```
key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT
```

**Key Points**:
- Exactly 5 UDF fields
- Exactly 5 empty pipes after UDF fields
- Salt key must match database exactly
- Use SHA-512 algorithm

### Issue 4: Form Submission Blocked

**Cause**: Browser popup blockers or timing issues

**Solutions**:
1. **Target**: Use `form.target = '_self'` not `_blank`
2. **Timing**: Submit form immediately, no setTimeout
3. **Popup Blockers**: Direct form submission bypasses blocks

---

## Testing and Debugging

### 1. **Test Credentials**
```javascript
const PAYU_TEST_CONFIG = {
  merchant_key: 'u7Ui5I',
  merchant_id: '8725115',
  salt_key: 'VIen2EwWiQbvsILF4Wt9p9Gh5ixOpSMe',
  environment: 'test'
};
```

### 2. **Test Cards**
```
Success: 5123456789012346
Failure: 5123456789012353
```

### 3. **Debug Logging**
```typescript
// Enable debug logging
console.log('PayU Debug Info:', {
  merchant_key: formData.key,
  txnid: formData.txnid,
  amount: formData.amount,
  hash: formData.hash.substring(0, 10) + '...',
  hashString: hashString,
  formFieldCount: Object.keys(formData).length
});
```

### 4. **Test Page Creation**
Create a standalone test page to verify integration:

```html
<!DOCTYPE html>
<html>
<head>
    <title>PayU Integration Test</title>
</head>
<body>
    <button onclick="testPayU()">Test PayU Payment</button>
    <script>
        async function testPayU() {
            const config = {
                merchant_key: 'u7Ui5I',
                salt_key: 'VIen2EwWiQbvsILF4Wt9p9Gh5ixOpSMe'
            };
            
            const txnid = 'TEST_' + Date.now();
            const formData = {
                key: config.merchant_key,
                txnid: txnid,
                amount: '100.00',
                productinfo: 'Test Product',
                firstname: 'Test User',
                email: 'test@example.com',
                phone: '9999999999',
                surl: 'https://example.com/success',
                furl: 'https://example.com/failure',
                udf1: '', udf2: '', udf3: '', udf4: '', udf5: ''
            };
            
            // Generate hash
            const hashString = [
                formData.key, formData.txnid, formData.amount, formData.productinfo,
                formData.firstname, formData.email, formData.udf1, formData.udf2,
                formData.udf3, formData.udf4, formData.udf5,
                '', '', '', '', '', config.salt_key
            ].join('|');
            
            const encoder = new TextEncoder();
            const data = encoder.encode(hashString);
            const hashBuffer = await crypto.subtle.digest('SHA-512', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            
            formData.hash = hash;
            
            // Create and submit form
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = 'https://test.payu.in/_payment';
            form.target = '_self';
            form.style.display = 'none';
            
            Object.entries(formData).forEach(([key, value]) => {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = key;
                input.value = value;
                form.appendChild(input);
            });
            
            document.body.appendChild(form);
            form.submit();
        }
    </script>
</body>
</html>
```

---

## Production Deployment

### 1. **Environment Configuration**
```sql
-- Update for production
UPDATE payment_gateways 
SET config = jsonb_set(
  jsonb_set(config, '{merchant_key}', '"PROD_MERCHANT_KEY"'),
  '{salt_key}', '"PROD_SALT_KEY"'
),
test_mode = false
WHERE code = 'payu';
```

### 2. **Production URLs**
```typescript
const payuConfig = {
  payment_url: testMode ? 'https://test.payu.in/_payment' : 'https://secure.payu.in/_payment',
  success_url: 'https://whyteclub.com/payment-success?gateway=payu',
  failure_url: 'https://whyteclub.com/payment-failure?gateway=payu'
};
```

### 3. **Security Considerations**
- Never expose salt key in frontend logs
- Use environment variables for sensitive data
- Implement proper error handling
- Add rate limiting for payment requests

---

## Troubleshooting Guide

### Quick Diagnosis Checklist

1. **Database Configuration**
   - [ ] PayU gateway exists in `payment_gateways` table
   - [ ] Salt key matches working credentials
   - [ ] Gateway is enabled

2. **Hash Generation**
   - [ ] Hash string includes 5 empty pipes
   - [ ] Salt key is correct
   - [ ] SHA-512 algorithm used
   - [ ] All required fields present

3. **Form Submission**
   - [ ] Form target is `_self`
   - [ ] All form fields are strings
   - [ ] No timeout delays
   - [ ] Correct PayU URL

4. **Edge Function**
   - [ ] Functions deployed with latest code
   - [ ] Database connection working
   - [ ] Error logging enabled

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Mandatory parameter missing" | Hash mismatch or missing fields | Check salt key and hash generation |
| "Invalid amount" | Amount formatting issue | Use `.toFixed(2)` formatting |
| "Merchant does not exist" | Wrong merchant key | Verify credentials in database |
| "Hash mismatch" | Salt key or hash algorithm wrong | Check hash generation logic |

### Emergency Fallback

If PayU integration fails completely, implement fallback:

```typescript
// Emergency fallback to manual payment
if (paymentMethod === 'payu' && payuIntegrationDown) {
  // Fallback to bank transfer or COD
  toast.warning('PayU temporarily unavailable. Please use bank transfer.');
  setPaymentMethod('bank_transfer');
}
```

---

## Conclusion

This documentation provides a complete guide for PayU integration. The key to success is:

1. **Correct Database Configuration**: Ensure salt key matches exactly
2. **Proper Hash Generation**: Include 5 empty pipes in hash string
3. **Direct Form Submission**: Use `_self` target for reliability
4. **Thorough Testing**: Test with standalone pages before integration
5. **Proper Error Handling**: Implement fallbacks and logging

When issues arise, follow the troubleshooting guide and check the common issues section. The direct form submission approach has proven most reliable for PayU integration.

---

**Last Updated**: July 16, 2025  
**Author**: Claude AI Assistant  
**Version**: 1.0