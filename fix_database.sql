-- IMMEDIATE FIX FOR YOUR DATABASE
-- Run this in your Supabase SQL Editor

-- 1. Create app_role enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE app_role AS ENUM ('admin', 'user');
  END IF;
END $$;

-- 2. Create user_roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL DEFAULT 'user',
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, role)
);

-- 3. Create has_role function
CREATE OR REPLACE FUNCTION has_role(user_id uuid, role_name app_role)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = has_role.user_id 
    AND user_roles.role = role_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 5. Create basic policies for user_roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

-- 6. Fix profiles table policies (simple approach)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 7. Fix payment_gateways policies
DROP POLICY IF EXISTS "Authenticated users can read payment gateways" ON public.payment_gateways;
CREATE POLICY "Authenticated users can read payment gateways" ON public.payment_gateways
    FOR SELECT TO authenticated USING (true);

-- 8. Fix country_settings policies
DROP POLICY IF EXISTS "Authenticated users can read country settings" ON public.country_settings;
CREATE POLICY "Authenticated users can read country settings" ON public.country_settings
    FOR SELECT TO authenticated USING (true);

-- 9. Create trigger for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, phone, country, preferred_display_currency)
    VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'phone', 'US', 'USD');
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'user');
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 11. Insert payment gateways if they don't exist
INSERT INTO public.payment_gateways (name, code, supported_countries, supported_currencies, fee_percent, fee_fixed, config, test_mode)
VALUES
('Stripe', 'stripe', ARRAY['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'PL', 'SG', 'AE', 'SA', 'EG', 'TR', 'JP'], ARRAY['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'SGD', 'AED', 'SAR', 'EGP', 'TRY'], 2.9, 0.30, '{"publishable_key": "", "secret_key": ""}', true),
('PayU', 'payu', ARRAY['IN'], ARRAY['INR'], 2.5, 0, '{"merchant_key": "", "salt_key": "", "merchant_id": ""}', true),
('eSewa', 'esewa', ARRAY['NP'], ARRAY['NPR'], 1.5, 0, '{"merchant_id": "", "merchant_key": ""}', true),
('Khalti', 'khalti', ARRAY['NP'], ARRAY['NPR'], 1.5, 0, '{"public_key": "", "secret_key": ""}', true),
('Fonepay', 'fonepay', ARRAY['NP'], ARRAY['NPR'], 1.5, 0, '{"merchant_id": "", "merchant_key": ""}', true),
('Airwallex', 'airwallex', ARRAY['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'PL', 'SG', 'AE', 'SA', 'EG', 'TR', 'JP'], ARRAY['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'SGD', 'AED', 'SAR', 'EGP', 'TRY'], 1.8, 0.30, '{"api_key": "", "client_id": ""}', true)
ON CONFLICT (code) DO NOTHING;

-- 12. Insert country settings if they don't exist
INSERT INTO public.country_settings (code, name, currency, rate_from_usd, sales_tax, vat, min_shipping, additional_shipping, additional_weight, weight_unit, volumetric_divisor, payment_gateway_fixed_fee, payment_gateway_percent_fee, purchase_allowed, shipping_allowed, payment_gateway)
VALUES
('US', 'United States', 'USD', 1, 0, 0, 10, 0, 2, 'lbs', 5000, 0, 2.9, true, true, 'stripe'),
('IN', 'India', 'INR', 83, 0, 0, 500, 0, 100, 'kg', 5000, 0, 2.5, true, true, 'payu'),
('NP', 'Nepal', 'NPR', 133, 0, 0, 1000, 0, 200, 'kg', 5000, 0, 1.5, true, true, 'esewa'),
('JP', 'Japan', 'JPY', 155, 0, 0, 1500, 0, 200, 'kg', 5000, 0, 2.9, true, true, 'stripe'),
('GB', 'United Kingdom', 'GBP', 0.79, 0, 0, 8, 0, 2, 'lbs', 5000, 0, 2.9, true, true, 'stripe'),
('CA', 'Canada', 'CAD', 1.36, 0, 0, 12, 0, 2, 'lbs', 5000, 0, 2.9, true, true, 'stripe'),
('AU', 'Australia', 'AUD', 1.52, 0, 0, 15, 0, 2, 'lbs', 5000, 0, 2.9, true, true, 'stripe')
ON CONFLICT (code) DO NOTHING;

-- 13. Make yourself an admin (replace 'your-user-id' with your actual user ID)
-- To find your user ID, run: SELECT id FROM auth.users WHERE email = 'your-email@example.com';
-- Then uncomment and run this line:
-- INSERT INTO public.user_roles (user_id, role) VALUES ('your-user-id-here', 'admin') ON CONFLICT DO NOTHING; 