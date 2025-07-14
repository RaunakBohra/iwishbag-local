# PayPal Integration Setup Guide

## Current Status
The PayPal integration code is complete and follows the same pattern as PayU:
- ✅ Checkout integration (`create-paypal-checkout`)
- ✅ Payment capture (`capture-paypal-payment`)
- ✅ Webhook handler (`paypal-webhook-handler`)
- ✅ Success page (`PaypalSuccess.tsx`)
- ✅ No separate order creation (quotes with status 'paid' ARE the orders)

## What You Need to Do

### 1. Create PayPal Developer Account
1. Go to https://developer.paypal.com/
2. Sign up or log in with your PayPal account
3. Navigate to the Dashboard

### 2. Create Sandbox App
1. In the PayPal Developer Dashboard, go to "Apps & Credentials"
2. Click "Create App"
3. Choose:
   - App Name: `iwishBag Sandbox`
   - App Type: `Merchant`
   - Sandbox Business Account: Create new or select existing
4. Click "Create App"

### 3. Get Sandbox Credentials
After creating the app, you'll see:
- **Client ID**: Something like `AXj5...`
- **Client Secret**: Click "Show" to reveal

### 4. Configure in Supabase Dashboard
1. Go to your Supabase Dashboard
2. Navigate to the SQL Editor
3. Run this query to add PayPal configuration:

```sql
-- Check if PayPal gateway exists
SELECT * FROM payment_gateways WHERE code = 'paypal';

-- If it doesn't exist, insert it:
INSERT INTO payment_gateways (code, name, test_mode, is_active, config)
VALUES (
  'paypal',
  'PayPal',
  true,  -- Start in test mode
  true,  -- Enable it
  jsonb_build_object(
    'client_id_sandbox', 'YOUR_SANDBOX_CLIENT_ID_HERE',
    'client_secret_sandbox', 'YOUR_SANDBOX_CLIENT_SECRET_HERE',
    'client_id_live', '',  -- Add later when ready for production
    'client_secret_live', ''  -- Add later when ready for production
  )
)
ON CONFLICT (code) 
DO UPDATE SET 
  config = jsonb_build_object(
    'client_id_sandbox', 'YOUR_SANDBOX_CLIENT_ID_HERE',
    'client_secret_sandbox', 'YOUR_SANDBOX_CLIENT_SECRET_HERE',
    'client_id_live', payment_gateways.config->'client_id_live',
    'client_secret_live', payment_gateways.config->'client_secret_live'
  ),
  test_mode = true,
  is_active = true;
```

Replace `YOUR_SANDBOX_CLIENT_ID_HERE` and `YOUR_SANDBOX_CLIENT_SECRET_HERE` with your actual credentials.

### 5. Test the Integration

#### Test Checkout Flow:
1. Add items to cart
2. Go to checkout
3. Select PayPal as payment method
4. Click "Place Order"
5. You'll be redirected to PayPal sandbox
6. Use sandbox test accounts to complete payment

#### Create Test Accounts:
1. In PayPal Developer Dashboard, go to "Sandbox" → "Accounts"
2. You'll see pre-created personal and business accounts
3. Use the personal account to test payments
4. Default password is usually shown when you click "View/Edit"

### 6. Monitor Webhook Events
1. In PayPal Developer Dashboard, go to your app
2. Click on "Webhooks"
3. Add webhook URL: `https://grgvlrvywsfmnmkxrecd.supabase.co/functions/v1/paypal-webhook-handler`
4. Subscribe to these events:
   - `CHECKOUT.ORDER.APPROVED`
   - `CHECKOUT.ORDER.COMPLETED`
   - `PAYMENT.CAPTURE.COMPLETED`

### 7. Common Issues & Solutions

**Issue**: "Failed to authenticate with PayPal"
- **Solution**: Check that credentials are correctly entered in the database
- Ensure you're using sandbox credentials for test mode

**Issue**: Payment approved but not captured
- **Solution**: This is normal - the success page captures the payment
- Check browser console for errors

**Issue**: Can't see PayPal option in checkout
- **Solution**: Ensure the gateway is active in the database
- Check that the destination country supports PayPal

### 8. Going Live (Production)
When ready for production:
1. Get production credentials from PayPal
2. Update the database with production credentials
3. Set `test_mode = false` in the payment_gateways table
4. Update webhook URLs to use production endpoints

## Testing Checklist
- [ ] PayPal gateway configured in database
- [ ] Can select PayPal in checkout
- [ ] Redirects to PayPal sandbox correctly
- [ ] Payment completes successfully
- [ ] Quote status updates to 'paid'
- [ ] Payment transaction record created
- [ ] Success page shows correct details
- [ ] Email notifications sent (if configured)

## Need Help?
- Check Supabase function logs: `supabase functions list` then `supabase functions logs <function-name>`
- Check browser console for errors
- Verify webhook delivery in PayPal dashboard