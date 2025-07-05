# 🏦 PayU Integration Guide

## 📋 Overview

This guide covers the complete integration of PayU payment gateway into your iwishBag application. PayU is specifically configured for Indian customers and processes payments in INR (Indian Rupees).

## 🎯 Features

- ✅ **Currency Conversion**: Automatic USD to INR conversion using exchange rates
- ✅ **Hash Verification**: Secure payment processing with SHA-512 hash verification
- ✅ **Webhook Handling**: Real-time payment status updates
- ✅ **User Data Integration**: Customer information from profiles and quotes
- ✅ **Status Tracking**: Real-time payment status tracking
- ✅ **Error Handling**: Comprehensive error handling and logging

## 🔧 Setup Instructions

### 1. Environment Variables

Add these to your `.env` file:

```bash
# PayU Configuration
PAYU_MERCHANT_KEY=your_merchant_key
PAYU_SALT_KEY=your_salt_key
PAYU_MERCHANT_ID=your_merchant_id
PAYU_PAYMENT_URL=https://test.payu.in/_payment

# For Production
PAYU_PAYMENT_URL=https://secure.payu.in/_payment
```

### 2. Database Configuration

Update the payment gateways table:

```sql
UPDATE payment_gateways 
SET 
  config = jsonb_build_object(
    'merchant_id', 'your_merchant_id',
    'merchant_key', 'your_merchant_key', 
    'salt_key', 'your_salt_key',
    'payment_url', 'https://test.payu.in/_payment'
  ),
  test_mode = true,
  updated_at = NOW()
WHERE code = 'payu';
```

### 3. Deploy Functions

Deploy the payment functions:

```bash
supabase functions deploy create-payment
supabase functions deploy payment-webhook
```

## 🧪 Testing

### Test Credentials

**Credit/Debit Cards:**
```
Card Number: 4111 1111 1111 1111
Expiry: Any future date (e.g., 12/25)
CVV: Any 3 digits (e.g., 123)
```

**Net Banking:**
```
Username: payu
Password: payu
OTP: 123456
```

**UPI:**
```
UPI ID: test@payu
```

### Test Payment Flow

1. **Set User Profile to India:**
   ```javascript
   // Update user profile for testing
   await supabase
     .from('profiles')
     .update({
       country: 'IN',
       preferred_display_currency: 'INR'
     })
     .eq('id', user.id);
   ```

2. **Create Test Payment:**
   ```javascript
   const paymentRequest = {
     quoteIds: ['test-quote-id'],
     gateway: 'payu',
     success_url: 'https://your-site.com/success',
     cancel_url: 'https://your-site.com/cancel',
     amount: 12.82,
     currency: 'USD',
     customerInfo: {
       name: 'Test Customer',
       email: 'test@example.com',
       phone: '9999999999'
     }
   };
   ```

## 🔄 Payment Flow

### 1. Payment Initiation

```typescript
// Frontend payment creation
const { createPayment } = usePaymentGateways();

const handlePayUPayment = async () => {
  const result = await createPayment({
    quoteIds: selectedQuoteIds,
    gateway: 'payu',
    success_url: `${window.location.origin}/success`,
    cancel_url: `${window.location.origin}/cancel`,
    amount: totalAmount,
    currency: 'USD',
    customerInfo: {
      name: userProfile?.full_name,
      email: userProfile?.email,
      phone: userProfile?.phone
    }
  });

  if (result.success) {
    // Redirect to PayU
    window.location.href = result.url;
  }
};
```

### 2. Currency Conversion

The system automatically converts USD amounts to INR:

```typescript
// Backend conversion logic
const exchangeRate = indiaSettings.rate_from_usd || 83.0;
const amountInINR = totalAmount * exchangeRate;
```

### 3. Hash Generation

PayU requires SHA-512 hash verification:

```typescript
// Hash format: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT
const hashString = [
  merchantKey,
  txnid,
  amount,
  productinfo,
  firstname,
  email,
  '', '', '', '', '', // 5 UDF fields (empty)
  '', '', '', '', '', // 5 empty pipes
  salt
].join('|');
```

### 4. Webhook Processing

PayU sends payment status updates via webhooks:

```typescript
// Webhook verification
const isValidHash = await verifyPayUHash(webhookData, salt);

if (isValidHash) {
  // Update quote status
  await updateQuoteStatus(quoteIds, webhookData.status);
  
  // Create payment record
  await createPaymentRecord(webhookData);
  
  // Create order if successful
  if (webhookData.status === 'success') {
    await createOrder(quoteIds, webhookData);
  }
}
```

## 📊 Status Tracking

### Payment Statuses

- **pending**: Payment initiated
- **processing**: PayU processing payment
- **success**: Payment completed successfully
- **failed**: Payment failed
- **cancelled**: Payment cancelled by user

### Status Tracker Component

```typescript
<PayUStatusTracker
  transactionId={transactionId}
  amount={amount}
  amountInINR={amountInINR}
  exchangeRate={exchangeRate}
  onStatusChange={(status) => console.log('Status:', status)}
  onComplete={(success) => {
    if (success) {
      navigate('/orders');
    }
  }}
/>
```

## 🛠️ Error Handling

### Common Errors

1. **"PayU configuration missing"**
   - Check environment variables are set
   - Verify database configuration

2. **"Invalid hash"**
   - Verify salt key is correct
   - Check hash generation format

3. **"Exchange rate not found"**
   - Ensure India country settings exist
   - Check rate_from_usd value

### Debug Tools

Use the PaymentDebug component:

```typescript
import { PaymentDebug } from '@/components/debug/PaymentDebug';

// Add to your page for debugging
<PaymentDebug />
```

## 🔒 Security

### Hash Verification

- All PayU requests include SHA-512 hash verification
- Webhook signatures are verified before processing
- Sensitive data is logged securely

### Data Protection

- Customer data is encrypted in transit
- Payment details are stored securely
- Access logs are maintained for audit

## 📱 Mobile Support

PayU supports multiple payment methods:

- **Credit/Debit Cards**: Visa, MasterCard, RuPay
- **UPI**: Unified Payments Interface
- **Net Banking**: All major Indian banks
- **Wallets**: Paytm, PhonePe, Google Pay
- **EMI**: Equated Monthly Installments

## 🚀 Production Checklist

- [ ] Update to production PayU credentials
- [ ] Configure production webhook URL
- [ ] Test with real payment methods
- [ ] Verify webhook security
- [ ] Set up monitoring and alerts
- [ ] Configure error notifications
- [ ] Test currency conversion accuracy
- [ ] Verify order creation flow

## 📞 Support

For PayU integration issues:

1. Check the debug logs in Supabase Functions
2. Verify webhook delivery in PayU dashboard
3. Test with PayU's test credentials
4. Contact PayU support for gateway issues

## 🔄 Updates

### Recent Changes

- ✅ Fixed hash calculation format (5 UDF fields + 5 pipes)
- ✅ Added currency conversion (USD to INR)
- ✅ Enhanced customer data integration
- ✅ Improved webhook processing
- ✅ Added comprehensive status tracking

### Future Enhancements

- [ ] Add PayU QR code support
- [ ] Implement payment retry logic
- [ ] Add payment analytics
- [ ] Support for PayU EMI options
- [ ] Enhanced mobile payment flow 