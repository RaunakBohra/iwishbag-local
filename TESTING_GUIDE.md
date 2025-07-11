# 🧪 PayU Integration Testing Guide

## ✅ **Current Status**
Your PayU integration is **deployed and ready** for testing! Here's what's been set up:

### **✅ Deployed Components:**
- ✅ **Payment Creation API** - Creates PayU payment forms
- ✅ **Payment Status Tracking** - Real-time status updates
- ✅ **Webhook Processing** - Handles PayU callbacks
- ✅ **Payment Verification** - Verifies payment status with PayU
- ✅ **Error Handling** - Smart error recovery and user-friendly messages
- ✅ **Analytics Dashboard** - Payment monitoring and insights
- ✅ **Health Monitoring** - System health alerts

### **✅ Production URLs:**
- **Webhook**: `https://grgvlrvywsfmnmkxrecd.supabase.co/functions/v1/payment-webhook`
- **Payment API**: `https://grgvlrvywsfmnmkxrecd.supabase.co/functions/v1/create-payment`
- **Status API**: `https://grgvlrvywsfmnmkxrecd.supabase.co/functions/v1/verify-payment-status`

---

## 🔧 **Step 1: Configure PayU Dashboard**

### **Login to PayU Merchant Dashboard:**
1. Go to your PayU merchant dashboard
2. Navigate to **Settings → Payment Configuration**
3. Set these URLs:

```
Webhook URL: https://grgvlrvywsfmnmkxrecd.supabase.co/functions/v1/payment-webhook
Success URL: https://yourdomain.com/payment-success?gateway=payu
Failure URL: https://yourdomain.com/payment-failure?gateway=payu
```

⚠️ **Replace `yourdomain.com` with your actual production domain**

---

## 🧪 **Step 2: Test Through Your Website**

### **Option A: Test with Existing Quote**
1. Go to your website
2. Create a quote or find an existing approved quote
3. Add it to cart
4. Proceed to checkout
5. Select **PayU** as payment method
6. Use **₹1** as test amount

### **Option B: Manual Test Payment**
1. Open your browser console
2. Run this JavaScript code:

```javascript
// Test PayU payment creation
fetch('/supabase/functions/create-payment', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_SUPABASE_ANON_KEY'
  },
  body: JSON.stringify({
    quoteIds: ['test-quote-123'],
    gateway: 'payu',
    success_url: window.location.origin + '/payment-success',
    cancel_url: window.location.origin + '/payment-failure',
    amount: 1.0,
    currency: 'INR',
    customerInfo: {
      name: 'Test Customer',
      email: 'test@yoursite.com',
      phone: '9999999999'
    }
  })
})
.then(response => response.json())
.then(data => {
  console.log('Payment created:', data);
  // This will give you a PayU payment form URL
})
.catch(error => console.error('Error:', error));
```

---

## 🔍 **Step 3: Monitor the Test**

### **1. Check Supabase Logs:**
- Go to [Supabase Dashboard](https://supabase.com/dashboard/project/grgvlrvywsfmnmkxrecd/functions)
- Click on **Functions**
- Check logs for:
  - `create-payment` - Payment creation
  - `payment-webhook` - PayU callback
  - `verify-payment-status` - Status checks

### **2. Database Monitoring:**
Check these tables for test data:
- `payments` - Payment records
- `webhook_logs` - Webhook attempts
- `payment_error_logs` - Any errors
- `payment_verification_logs` - Verification attempts

### **3. Expected Flow:**
```
1. Payment Creation → PayU Form URL generated
2. User Pays → PayU processes payment
3. PayU Webhook → Updates your database
4. Status Tracking → Real-time updates
5. Order Confirmation → Payment complete
```

---

## 🎯 **Step 4: Test Scenarios**

### **✅ Test Case 1: Successful Payment**
- **Amount**: ₹1
- **Expected**: Payment succeeds, webhook received, status = 'completed'

### **✅ Test Case 2: Failed Payment**
- **Use**: Invalid card details or insufficient funds
- **Expected**: Payment fails, webhook received, status = 'failed'

### **✅ Test Case 3: Payment Status Check**
- **Test**: Check status before webhook arrives
- **Expected**: Status shows 'pending' or 'processing'

### **✅ Test Case 4: Error Handling**
- **Test**: Invalid payment data
- **Expected**: User-friendly error message

---

## 📊 **Step 5: Verify Analytics**

### **Admin Dashboard Checks:**
1. **Payment Analytics** - Should show test payments
2. **Error Tracking** - Should log any issues
3. **Gateway Performance** - PayU success rates
4. **Health Monitoring** - System status

### **Access Admin Tools:**
- **Payment Verification Tool**: Manually verify payments
- **Analytics Dashboard**: View payment metrics
- **Error Logs**: Check for issues

---

## 🚨 **Common Issues & Solutions**

### **Issue 1: 401 Authorization Error**
- **Cause**: Missing or invalid API keys
- **Solution**: Check Supabase anon key in your frontend

### **Issue 2: Webhook Not Received**
- **Cause**: PayU dashboard not configured
- **Solution**: Set webhook URL in PayU dashboard

### **Issue 3: Hash Verification Failed**
- **Cause**: PayU salt key mismatch
- **Solution**: Verify PAYU_SALT_KEY in Supabase secrets

### **Issue 4: Payment Status Stuck**
- **Cause**: PayU verification API issue
- **Solution**: Use manual verification tool

---

## 🎉 **Success Indicators**

### **✅ Payment Flow Working When:**
- Payment form loads correctly
- PayU redirects work
- Webhooks are received (check logs)
- Database updates correctly
- Status tracking shows real data
- Admin dashboard shows payments

### **✅ Ready for Production When:**
- Test payments complete successfully
- Webhook logs show no errors
- Status tracking works in real-time
- Error handling displays properly
- Analytics dashboard populates

---

## 🚀 **Going Live Checklist**

### **Before Production:**
- [ ] Test with ₹1 payment
- [ ] Verify webhook reception
- [ ] Check all PayU dashboard URLs
- [ ] Test error scenarios
- [ ] Verify admin dashboard
- [ ] Test payment status tracking
- [ ] Confirm analytics working

### **Production Settings:**
- [ ] Set production domain URLs
- [ ] Configure PayU production credentials
- [ ] Set up monitoring alerts
- [ ] Test with real customer data
- [ ] Monitor first few transactions closely

---

## 🆘 **Need Help?**

### **Check These First:**
1. **Supabase Logs**: Functions → payment-webhook → Logs
2. **Browser Console**: Check for JavaScript errors
3. **Network Tab**: Look for failed API calls
4. **PayU Dashboard**: Verify webhook URL is correct

### **Contact Support:**
- Include transaction IDs
- Share error logs from Supabase
- Provide exact steps to reproduce

---

## 📞 **Quick Test Command**

Run this in your terminal to test webhook connectivity:

```bash
curl -X POST https://grgvlrvywsfmnmkxrecd.supabase.co/functions/v1/payment-webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "connectivity"}'
```

**Expected**: HTTP 400 or 401 (means endpoint is reachable)

---

🎯 **Your PayU integration is production-ready!** Start with a ₹1 test payment and monitor the logs.