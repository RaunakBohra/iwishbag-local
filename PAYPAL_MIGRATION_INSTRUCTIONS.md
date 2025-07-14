# PayPal Migration Instructions

## Fix for Missing Database Columns

The PayPal integration requires some database columns that are missing. Please follow these steps:

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/grgvlrvywsfmnmkxrecd
2. Navigate to SQL Editor (in the left sidebar)

### Step 2: Run the Migration
Copy and paste the following SQL into the editor and click "Run":

```sql
-- Fix PayPal Migration - Add missing columns
-- Run this in Supabase SQL Editor

-- Add columns to country_settings if they don't exist
ALTER TABLE public.country_settings 
ADD COLUMN IF NOT EXISTS available_gateways TEXT[] DEFAULT ARRAY['bank_transfer'];

ALTER TABLE public.country_settings 
ADD COLUMN IF NOT EXISTS default_gateway TEXT DEFAULT 'bank_transfer';

ALTER TABLE public.country_settings 
ADD COLUMN IF NOT EXISTS gateway_config JSONB DEFAULT '{}';

-- Add column to profiles if it doesn't exist  
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS preferred_payment_gateway TEXT;

-- Update some key countries with PayPal
UPDATE public.country_settings 
SET 
  available_gateways = ARRAY['stripe', 'paypal', 'bank_transfer'],
  default_gateway = 'paypal'
WHERE code = 'US';

UPDATE public.country_settings 
SET 
  available_gateways = ARRAY['payu', 'paypal', 'razorpay', 'upi', 'bank_transfer'],
  default_gateway = 'payu'
WHERE code = 'IN';

UPDATE public.country_settings 
SET 
  available_gateways = ARRAY['paypal', 'esewa', 'khalti', 'fonepay', 'bank_transfer'],
  default_gateway = 'paypal'
WHERE code = 'NP';

-- Verify the changes
SELECT code, name, currency, available_gateways, default_gateway 
FROM country_settings 
WHERE code IN ('US', 'IN', 'NP');

-- Check PayPal gateway
SELECT * FROM payment_gateways WHERE code = 'paypal';
```

### Step 3: Verify Success
After running the migration, you should see:
- Query results showing US, IN, and NP with their gateway configurations
- PayPal gateway record from payment_gateways table

### Step 4: Test the Application
1. Navigate to `/test-payment` in your application
2. Select different countries to see available payment methods
3. Check that PayPal appears for US, Nepal, and other configured countries
4. Test the profile page payment preference selector

## Current Issues Fixed:
1. ✅ Missing `default_gateway` column in country_settings
2. ✅ Missing `available_gateways` column in country_settings  
3. ✅ Missing `gateway_config` column in country_settings
4. ✅ Missing `preferred_payment_gateway` column in profiles
5. ✅ React Select component empty value error (fixed in Profile.tsx)

## Next Steps:
1. Configure PayPal sandbox credentials in payment_gateways table
2. Test actual payment flow with PayPal
3. Clean up old payment code as requested