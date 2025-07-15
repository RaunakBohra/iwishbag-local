# Enable Multiple Payment Methods in Stripe

## Why Only Card Payments Are Showing

Your Stripe integration currently only shows card payments because:

1. **Frontend Issue**: You're using `CardElement` instead of `PaymentElement`
2. **Stripe Dashboard Settings**: Payment methods need to be enabled in your Stripe account

## Step 1: Enable Payment Methods in Stripe Dashboard

1. Go to https://dashboard.stripe.com/test/settings/payment_methods
2. Enable these payment methods based on your target markets:

### For Global Customers
- **Cards** ✅ (Already enabled)
- **Apple Pay** - Mobile payments for iOS users
- **Google Pay** - Mobile payments for Android users
- **Link** - Stripe's 1-click checkout

### For US Customers
- **ACH Direct Debit** - Bank transfers
- **US Bank Account** - Bank account payments

### For European Customers  
- **SEPA Direct Debit** - European bank transfers
- **iDEAL** - Netherlands
- **Bancontact** - Belgium
- **Giropay** - Germany
- **Sofort** - Germany, Austria, Switzerland

### For Asian Customers
- **Alipay** - China
- **WeChat Pay** - China
- **GrabPay** - Southeast Asia
- **Konbini** - Japan convenience stores
- **FPX** - Malaysia

### For India/Nepal (Your Primary Markets)
- **UPI** - Unified Payments Interface (India)
- **Netbanking** - Indian bank transfers
- **Wallets** - Paytm, etc.

## Step 2: Update Your Frontend Code

Replace `StripePaymentForm.tsx` with the new `StripePaymentFormV2.tsx` that uses `PaymentElement`:

```typescript
// In Checkout.tsx or wherever you use Stripe
import { StripePaymentFormV2 } from '@/components/payment/StripePaymentFormV2';

// Use it like this:
<StripePaymentFormV2
  client_secret={paymentData.client_secret}
  amount={totalAmount}
  currency={currency}
  onSuccess={handlePaymentSuccess}
  onError={handlePaymentError}
  returnUrl={`${window.location.origin}/checkout/success`}
/>
```

## Step 3: Update Backend (Optional Enhancements)

Your backend already supports multiple payment methods with `automatic_payment_methods: { enabled: true }`. 

To restrict payment methods by country, you can modify `create-payment/index.ts`:

```typescript
// Example: Restrict payment methods based on destination
const paymentMethodTypes = [];

// Add payment methods based on destination
if (totalCurrency === 'INR') {
  paymentMethodTypes.push('card', 'upi', 'netbanking');
} else if (totalCurrency === 'USD') {
  paymentMethodTypes.push('card', 'us_bank_account', 'link');
} else {
  // Default to automatic
}

const paymentIntent = await stripe.paymentIntents.create({
  amount: amountInSmallestUnit,
  currency: totalCurrency.toLowerCase(),
  metadata: paymentMetadata,
  description: `Payment for quotes: ${quoteIds.join(', ')}`,
  receipt_email: customerEmail || undefined,
  automatic_payment_methods: {
    enabled: true,
    // Optionally restrict to specific payment method types
    // allow_redirects: 'always', // Allow redirect-based payment methods
  },
  // Or manually specify payment methods:
  // payment_method_types: paymentMethodTypes,
});
```

## Step 4: Test Different Payment Methods

### Test Cards
- **Success**: 4242 4242 4242 4242
- **3D Secure**: 4000 0025 0000 3155
- **Declined**: 4000 0000 0000 9995

### Test Bank Accounts (US)
- **Success**: Routing: 110000000, Account: 000123456789
- **Failure**: Routing: 110000000, Account: 000111111113

### Test UPI (India)
- **Success**: success@stripeupi
- **Failure**: failure@stripeupi

## Benefits of PaymentElement

1. **Automatic Updates**: New payment methods appear automatically
2. **Smart Ordering**: Shows most relevant payment methods first
3. **Mobile Optimized**: Better experience on mobile devices
4. **Localized**: Shows payment methods based on customer location
5. **Saved Payment Methods**: Customers can save cards for future use

## Important Notes

1. **Live Mode**: Some payment methods require additional verification in live mode
2. **Currency Support**: Not all payment methods support all currencies
3. **Settlement Times**: Bank transfers take longer than cards
4. **Fees**: Different payment methods have different fee structures

## Dashboard Verification

After enabling payment methods:
1. Create a test payment
2. You should see tabs for different payment methods
3. The UI adapts based on customer's location and currency