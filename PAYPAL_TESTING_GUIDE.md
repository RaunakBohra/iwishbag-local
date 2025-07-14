# PayPal Integration Testing Guide

## 🧪 Testing Checklist

### 1. **Verify Database Setup** ✅
First, check that everything was properly configured in the database.

#### Run these queries in Supabase SQL Editor:
```sql
-- Check PayPal gateway is active
SELECT * FROM payment_gateways WHERE code = 'paypal';

-- Check country configurations
SELECT code, name, default_gateway, available_gateways 
FROM country_settings 
WHERE available_gateways @> ARRAY['paypal'];

-- Check if profile column exists
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'preferred_payment_gateway';
```

### 2. **Configure PayPal Credentials** 🔑

#### In Supabase Dashboard:
1. Go to Table Editor → `payment_gateways`
2. Find the PayPal row
3. Edit the `config` JSON field and add your PayPal sandbox credentials:
```json
{
  "environment": "sandbox",
  "client_id_sandbox": "YOUR_PAYPAL_SANDBOX_CLIENT_ID",
  "client_secret_sandbox": "YOUR_PAYPAL_SANDBOX_CLIENT_SECRET",
  "client_id_live": "",
  "client_secret_live": "",
  "webhook_id": "",
  "supported_funding_sources": ["paypal", "card", "venmo", "applepay", "googlepay"],
  "supported_payment_methods": ["paypal", "card"],
  "merchant_account_id": "",
  "partner_attribution_id": "iwishBag_Cart_SPB"
}
```

#### Get PayPal Sandbox Credentials:
1. Go to https://developer.paypal.com/
2. Log in → Dashboard → Sandbox → Accounts
3. Create a sandbox business account if needed
4. Go to Apps & Credentials → Sandbox
5. Create an app or use existing one
6. Copy the Client ID and Secret

### 3. **Test Payment Gateway Selection** 🌍

#### Test different country scenarios:

**A. US Customer (PayPal Primary)**
1. Update your profile country to 'US'
2. Go to checkout
3. Verify PayPal appears as the default/recommended payment method

**B. India Customer (PayU Primary, PayPal Secondary)**
1. Update your profile country to 'IN'
2. Go to checkout
3. Verify PayU appears first, PayPal as an option

**C. Nepal Customer (PayPal Primary)**
1. Update your profile country to 'NP'
2. Go to checkout
3. Verify PayPal appears as the default

### 4. **Test User Preference** 👤

1. Go to your Profile page
2. Look for "Preferred Payment Method" dropdown
3. Select PayPal as your preference
4. Save profile
5. Go to checkout - PayPal should be pre-selected regardless of country

### 5. **Test PayPal Payment Flow** 💳

#### Complete Payment Test:
1. Add items to cart
2. Proceed to checkout
3. Select PayPal as payment method
4. Click "Pay Now" or "Complete Order"
5. You should be redirected to PayPal sandbox
6. Log in with sandbox buyer account:
   - Email: `sb-buyer@personal.example.com` (or create your own)
   - Password: (from your sandbox account)
7. Complete the payment
8. Verify redirect back to your success page

### 6. **Test Edge Cases** 🔍

#### A. Currency Support
- Test with different currencies (USD, EUR, INR, etc.)
- Verify PayPal only shows for supported currencies

#### B. Minimum Amount
- Test with very small amounts
- Verify proper error handling

#### C. Guest Checkout
- Log out and try checkout as guest
- Select a country that supports PayPal
- Verify PayPal appears in payment options

### 7. **Monitor & Debug** 🐛

#### Check Browser Console:
```javascript
// In checkout page, open console and check:
// Look for payment gateway logs
console.log('Payment methods loading...');
```

#### Check Network Tab:
1. Open Developer Tools → Network
2. Look for requests to:
   - `payment_gateways` (fetching available gateways)
   - `create-paypal-payment` (when PayPal is selected)

#### Check Supabase Logs:
1. Go to Supabase Dashboard → Functions
2. Check logs for `create-paypal-payment` function
3. Look for any errors or success messages

### 8. **Common Issues & Solutions** ❌

#### PayPal not showing up:
- Check if PayPal is in `available_gateways` for your country
- Verify PayPal supports your currency
- Check browser console for errors
- Ensure PayPal gateway is active in database

#### Redirect fails:
- Check success_url and cancel_url are properly set
- Verify URLs are absolute (include https://)
- Check for CORS issues

#### Payment creation fails:
- Verify PayPal credentials are correct
- Check if using sandbox credentials for test mode
- Look at function logs for specific errors

### 9. **Test Webhooks** (Optional) 🔔

1. Set up PayPal webhook endpoint
2. Configure webhook URL in PayPal dashboard
3. Test payment completion events
4. Verify order status updates

### 10. **Production Checklist** 🚀

Before going live:
- [ ] Add production PayPal credentials
- [ ] Set `test_mode: false` in payment_gateways
- [ ] Test with real PayPal account (small amount)
- [ ] Verify success/cancel URLs point to production
- [ ] Set up production webhooks
- [ ] Test refund process

## 📊 Quick Test Scenarios

### Scenario 1: US Customer PayPal Test
```bash
1. Profile country: US
2. Currency: USD
3. Amount: $50+
4. Expected: PayPal is default
5. Complete payment in sandbox
```

### Scenario 2: India Customer Multi-Gateway
```bash
1. Profile country: IN
2. Currency: INR
3. Amount: ₹500+
4. Expected: PayU default, PayPal available
5. Select PayPal manually
6. Complete payment
```

### Scenario 3: Customer Preference Override
```bash
1. Set preferred gateway to PayPal in profile
2. Any country/currency
3. Expected: PayPal pre-selected
4. Verify it overrides country default
```

## 🎯 Success Criteria

✅ PayPal appears for supported countries/currencies
✅ Country-specific defaults work correctly
✅ User preferences override country defaults
✅ Payment redirects to PayPal successfully
✅ Return from PayPal works properly
✅ Order status updates after payment

## 📝 Test Results Template

```
Date: ___________
Tester: _________

[ ] Database setup verified
[ ] PayPal credentials configured
[ ] US customer test passed
[ ] India customer test passed
[ ] Nepal customer test passed
[ ] User preference test passed
[ ] Payment flow completed
[ ] Return URL works
[ ] Order status updated

Notes:
_________________
_________________
```