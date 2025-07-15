# Stripe Payment Verification Guide

## 1. Check Stripe Dashboard
Visit: https://dashboard.stripe.com/test/payments
- Look for the most recent payment
- The payment should show the PaymentIntent ID that starts with "pi_"
- Check the status (should be "Succeeded" if payment went through)

## 2. Check Supabase Database
Visit: https://supabase.com/dashboard/project/grgvlrvywsfmnmkxrecd/editor

Run these queries in the SQL editor:

### Check payment_transactions table:
```sql
SELECT * FROM payment_transactions 
WHERE gateway_code = 'stripe' 
ORDER BY created_at DESC 
LIMIT 5;
```

### Check payment_ledger table:
```sql
SELECT * FROM payment_ledger 
WHERE gateway = 'stripe' 
ORDER BY created_at DESC 
LIMIT 5;
```

### Check quotes with Stripe payments:
```sql
SELECT id, status, payment_status, payment_method, final_total, final_currency, updated_at
FROM quotes 
WHERE payment_method = 'stripe' 
ORDER BY updated_at DESC 
LIMIT 5;
```

## 3. Check Edge Function Logs
Visit: https://supabase.com/dashboard/project/grgvlrvywsfmnmkxrecd/functions
- Click on "create-payment" function
- Check the logs for recent activity
- Look for "Stripe PaymentIntent created" messages

## 4. What to Look For
- **PaymentIntent ID**: Should start with "pi_" followed by random characters
- **Status**: Should be "succeeded" in Stripe dashboard
- **Database Entry**: Should have a record in payment_transactions or payment_ledger
- **Quote Status**: The associated quote should be updated to "paid" status

## 5. Common Issues
If payment doesn't appear:
1. Check if you were in test mode (using test card numbers)
2. Verify the Stripe keys in payment_gateways table are correct
3. Check if there are any error logs in the Edge Functions
4. Make sure the payment verification webhook is configured

## 6. Test Card Numbers (for testing)
- Success: 4242 4242 4242 4242
- Requires authentication: 4000 0025 0000 3155
- Declined: 4000 0000 0000 9995