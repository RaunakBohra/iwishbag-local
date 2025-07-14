# PayPal Authentication Error - Fix Required

## Problem Identified
The PayPal authentication is failing because the `client_secret_sandbox` was incorrectly set to the same value as `client_id_sandbox` in the database.

**Current values:**
- Client ID: `ARi806xV-dbFCS5E9OCYkapLEb-7V0P521rLUG9pYUk6kJ7Nm7exNudxamGEkQ1SXqUSzNgV3lEZyAXH`
- Client Secret: `ARi806xV-dbFCS5E9OCYkapLEb-7V0P521rLUG9pYUk6kJ7Nm7exNudxamGEkQ1SXqUSzNgV3lEZyAXH` ❌ (Same as Client ID!)

## How to Fix

### Step 1: Get Your PayPal Sandbox Credentials
1. Go to https://developer.paypal.com
2. Log in with your PayPal Developer account
3. Navigate to **Dashboard** → **My Apps & Credentials**
4. Click on **Sandbox** tab
5. Find your app (or create a new one if needed)
6. You'll see:
   - **Client ID**: Should match the one above
   - **Secret**: Click "Show" - this will be different (usually starts with `E` followed by random characters)

### Step 2: Update the Database
1. Go to Supabase SQL Editor: https://supabase.com/dashboard/project/grgvlrvywsfmnmkxrecd/sql
2. Run this query with your actual secret:

```sql
-- Replace YOUR_ACTUAL_SECRET with the secret from PayPal dashboard
UPDATE payment_gateways 
SET config = jsonb_set(
    config,
    '{client_secret_sandbox}',
    '"YOUR_ACTUAL_SECRET"'::jsonb
)
WHERE code = 'paypal';

-- Verify it was updated correctly
SELECT 
  config->>'client_id_sandbox' as client_id,
  config->>'client_secret_sandbox' as client_secret
FROM payment_gateways 
WHERE code = 'paypal';
```

### Step 3: Test Again
After updating the credentials, test the PayPal integration:
1. Go to `/test-payment`
2. Select PayPal as payment method
3. The authentication should now work

## Common PayPal Sandbox Credentials Format
- **Client ID**: Usually starts with `A` and is about 80 characters long
- **Secret**: Usually starts with `E` and is about 80 characters long
- They should NEVER be the same value

## If You Don't Have PayPal Developer Account
1. Sign up at https://developer.paypal.com
2. It's free and uses your regular PayPal account
3. Create a new sandbox app
4. Use those credentials in the database