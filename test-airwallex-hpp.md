# Testing Airwallex Hosted Payment Page Integration

## What was changed:

1. **Backend (airwallex-api.ts)**:
   - Updated to return `airwallexData` object instead of a direct URL
   - Removed the hardcoded checkout URL construction
   - Returns data needed for Airwallex SDK's `redirectToCheckout` method

2. **Frontend (Checkout.tsx)**:
   - Added Airwallex SDK type declarations
   - Updated to dynamically load Airwallex SDK when needed
   - Uses SDK's `redirectToCheckout` method instead of direct URL redirect
   - Passes proper parameters including country code from shipping address

3. **Edge Function (create-payment/index.ts)**:
   - Updated PaymentResponse interface to include airwallexData
   - Passes through the airwallexData from the API module

## How to test:

1. Make sure Airwallex credentials are configured in the database (API key, Client ID)
2. Try to checkout with Airwallex payment method
3. The page should now:
   - Load the Airwallex SDK
   - Initialize it with the correct environment (demo/prod)
   - Call redirectToCheckout with the payment intent details
   - Redirect to the actual Airwallex hosted payment page

## Expected behavior:

Instead of showing an empty page, you should now see the full Airwallex payment form with:
- Payment method selection
- Card input fields
- Billing address form
- Pay button

## Troubleshooting:

If it still doesn't work, check:
1. Browser console for any SDK loading errors
2. Network tab to see if the SDK is loaded from https://static.airwallex.com/components/sdk/v1/index.js
3. Console logs for the redirectToCheckout parameters

## SDK Documentation:

The integration now follows Airwallex's official SDK approach as documented at:
https://github.com/airwallex/airwallex-payment-demo/blob/master/docs/hpp.md