# Enable Multiple Payment Methods - Checklist

## ✅ 1. Frontend Updated
- Changed from `CardElement` to `PaymentElement` in StripePaymentForm.tsx
- This now supports all payment methods automatically

## ⚠️ 2. Enable Payment Methods in Stripe Dashboard

**Go to**: https://dashboard.stripe.com/test/settings/payment_methods

**Enable these payment methods:**

### Essential Methods
- [x] **Card payments** (Already enabled by default)
- [ ] **Link** - Stripe's 1-click checkout
- [ ] **Apple Pay** - For iOS users
- [ ] **Google Pay** - For Android users

### Regional Methods (Based on your customers)
- [ ] **UPI** - For India (if available)
- [ ] **Netbanking** - For India
- [ ] **Wallets** - Regional wallets
- [ ] **Bank debits** - ACH for US, SEPA for EU
- [ ] **Buy now, pay later** - Klarna, Affirm, etc.

## 3. Test Your Integration

After enabling payment methods:

1. **Refresh your checkout page**
2. **You should now see tabs** for different payment methods:
   - Card
   - Bank debit (if enabled)
   - Digital wallets (if enabled)
   - Other local methods

## 4. Payment Methods Show Based On:

1. **Currency**: Some methods only work with specific currencies
2. **Amount**: Some methods have minimum/maximum amounts
3. **Customer location**: Detected automatically by Stripe
4. **Device**: Apple Pay only shows on Safari/iOS

## 5. Common Issues & Solutions

**Still only seeing cards?**
1. Clear browser cache and cookies
2. Try incognito/private mode
3. Check browser console for errors
4. Verify payment methods are enabled in Stripe dashboard

**Payment methods not showing?**
- Some methods require domain verification (for live mode)
- Some methods need additional setup (bank accounts, etc.)
- Check if the currency/amount is supported

## 6. Test Payment Methods

### Test Cards
- Success: `4242 4242 4242 4242`
- 3D Secure: `4000 0025 0000 3155`

### Test Bank Account (US)
- Routing: `110000000`
- Account: `000123456789`

### Test UPI (India)
- VPA: `success@stripeupi`

## Next Steps

1. Enable payment methods in Stripe Dashboard
2. Test the checkout with different amounts/currencies
3. Verify webhook is recording all payment types correctly