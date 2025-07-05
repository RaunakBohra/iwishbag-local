# 🧪 PayU Integration Testing Guide

## 🎯 **Overview**

This guide will help you test the PayU integration thoroughly to ensure everything works correctly before going live.

## 📋 **Prerequisites**

### **Environment Variables**
Make sure these are set in your `.env` file:
```bash
# PayU Test Credentials
PAYU_MERCHANT_KEY=gtKFFx
PAYU_SALT_KEY=eCwWELxi
PAYU_MERCHANT_ID=500238
PAYU_PAYMENT_URL=https://test.payu.in/_payment
SITE_URL=https://your-site.com
```

### **Deployed Functions**
Ensure the `create-payment` function is deployed:
```bash
supabase functions deploy create-payment
```

## 🧪 **Testing Steps**

### **1. Test PayU Hash Generation**

The PayU integration uses SHA-512 hash generation. Test this locally:

```javascript
// Test hash generation
const crypto = require('crypto');

function generatePayUHash(salt, txnid, amount, productinfo, firstname, email) {
  const hashString = `${salt}|${txnid}|${amount}|${productinfo}|${firstname}|${email}`;
  return crypto.createHash('sha512').update(hashString).digest('hex');
}

// Test with sample data
const testHash = generatePayUHash(
  'eCwWELxi', // salt
  'PAYU_1234567890', // txnid
  '1000', // amount
  'Test Product', // productinfo
  'Test User', // firstname
  'test@example.com' // email
);

console.log('Generated Hash:', testHash);
```

### **2. Test Payment Request**

Create a test payment request:

```javascript
const testPaymentRequest = {
  quoteIds: ['test-quote-1'],
  gateway: 'payu',
  success_url: 'https://your-site.com/success',
  cancel_url: 'https://your-site.com/cancel',
  amount: 1000,
  currency: 'INR'
};

// Send to your create-payment function
fetch('https://your-project.supabase.co/functions/v1/create-payment', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-anon-key'
  },
  body: JSON.stringify(testPaymentRequest)
});
```

### **3. Test PayU Payment Flow**

#### **Step 1: Initiate Payment**
1. Go to your checkout page
2. Select PayU as payment method
3. Click "Pay Now"
4. Verify you're redirected to PayU test page

#### **Step 2: Complete Test Payment**
Use these test credentials on PayU:

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

### **4. Test Payment Status Tracking**

1. **Start a payment** through your checkout
2. **Monitor the PaymentStatusTracker** component
3. **Verify real-time updates** are working
4. **Check completion handling** (success/failure)

## 🔍 **Testing Checklist**

### **✅ Functionality Tests**

- [ ] **Hash Generation**: PayU hash is generated correctly
- [ ] **Payment Initiation**: Payment request creates PayU URL
- [ ] **Redirect Flow**: User is redirected to PayU correctly
- [ ] **Payment Completion**: Success/failure redirects work
- [ ] **Status Tracking**: PaymentStatusTracker shows progress
- [ ] **Error Handling**: Invalid requests show proper errors

### **✅ Integration Tests**

- [ ] **Environment Variables**: All PayU config is loaded
- [ ] **Database Integration**: Payment records are created
- [ ] **Webhook Handling**: Payment status updates are processed
- [ ] **Quote Updates**: Quote status changes on payment
- [ ] **Order Creation**: Orders are created on successful payment

### **✅ User Experience Tests**

- [ ] **Payment Method Selection**: PayU appears for Indian users
- [ ] **Loading States**: Proper loading indicators
- [ ] **Error Messages**: Clear error messages for failures
- [ ] **Success Flow**: Smooth transition to orders page
- [ ] **Mobile Experience**: Works on mobile devices

## 🐛 **Common Issues & Solutions**

### **Issue 1: "PayU configuration missing"**
**Solution**: Check environment variables are set correctly
```bash
# Verify in your .env file
PAYU_MERCHANT_KEY=gtKFFx
PAYU_SALT_KEY=eCwWELxi
```

### **Issue 2: "Invalid hash" error**
**Solution**: Verify hash generation logic
```javascript
// Check parameter order matches PayU docs
const hashString = `${salt}|${txnid}|${amount}|${productinfo}|${firstname}|${email}`;
```

### **Issue 3: Payment not redirecting**
**Solution**: Check PayU URL construction
```javascript
// Verify URL is correct
const payuUrl = `${payuConfig.payment_url}?${new URLSearchParams(payuRequest)}`;
```

### **Issue 4: Payment status not updating**
**Solution**: Check webhook configuration
- Verify webhook URL is accessible
- Check webhook signature verification
- Ensure webhook processing logic

## 📊 **Monitoring & Analytics**

### **Check Payment Analytics Dashboard**
1. Go to admin dashboard
2. Navigate to Payment Analytics
3. Verify PayU transactions appear
4. Check success rates and revenue

### **Monitor Function Logs**
```bash
# Check function logs
supabase functions logs create-payment
```

### **Test Payment Recovery**
1. Start a payment but don't complete it
2. Wait for 1 hour
3. Check if recovery email is sent
4. Verify recovery link works

## 🚀 **Production Readiness**

### **Before Going Live**

1. **Replace Test Credentials**
   ```bash
   # Change to production credentials
   PAYU_MERCHANT_KEY=your_production_key
   PAYU_SALT_KEY=your_production_salt
   PAYU_PAYMENT_URL=https://secure.payu.in/_payment
   ```

2. **Update Webhook URLs**
   - Change webhook URLs to production URLs
   - Test webhook signature verification

3. **Final Testing**
   - Test with real payment methods
   - Verify all payment flows work
   - Check error handling

### **Go-Live Checklist**

- [ ] Production credentials configured
- [ ] Webhooks updated to production URLs
- [ ] Payment analytics monitoring enabled
- [ ] Error tracking configured
- [ ] Support team trained on PayU issues
- [ ] Documentation updated for production

## 📞 **Support Resources**

### **PayU Support**
- **Documentation**: [PayU Developer Docs](https://docs.payu.in/)
- **Test Environment**: [PayU Test Dashboard](https://test.payu.in/)
- **Support**: PayU merchant support

### **Your System**
- **Function Logs**: `supabase functions logs create-payment`
- **Analytics**: Payment Analytics Dashboard
- **Error Tracking**: Check browser console and network logs

---

**Status**: ✅ **Ready for Testing**

Your PayU integration is now ready for comprehensive testing. Follow this guide to ensure everything works correctly before going live! 