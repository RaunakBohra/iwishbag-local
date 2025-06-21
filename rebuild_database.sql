-- =================================================================
-- MASTER DATABASE REBUILD SCRIPT
-- =================================================================
-- This script is idempotent and can be run safely on a new project.
-- It sets up the entire database schema, roles, RLS, and seeds essential data.

-- Part 1: Core Types and Tables
-- =================================================================

-- Create custom types (enums) for clean data validation
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'user');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quote_status') THEN
        CREATE TYPE public.quote_status AS ENUM ('pending', 'approved', 'rejected', 'ordered');
    END IF;
END $$;

-- Create the user_roles table to manage permissions
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create the profiles table for user-specific data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  country TEXT DEFAULT 'US',
  preferred_display_currency TEXT DEFAULT 'USD',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create country_settings for shipping/purchase rules
CREATE TABLE IF NOT EXISTS public.country_settings (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    currency TEXT NOT NULL,
    rate_from_usd NUMERIC NOT NULL,
    purchase_allowed BOOLEAN DEFAULT TRUE,
    shipping_allowed BOOLEAN DEFAULT TRUE,
    payment_gateway TEXT DEFAULT 'stripe'
);

-- Create payment_gateways for payment options
CREATE TABLE IF NOT EXISTS public.payment_gateways (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    supported_countries TEXT[] DEFAULT '{}',
    supported_currencies TEXT[] DEFAULT '{}'
);

-- Create quotes table
CREATE TABLE IF NOT EXISTS public.quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status public.quote_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now()
    -- Add other quote fields here
);

-- Part 2: Functions and Triggers for Automation
-- =================================================================

-- Function to check a user's role (portable and secure)
CREATE OR REPLACE FUNCTION public.has_role(user_id UUID, role_name app_role)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles r
    WHERE r.user_id = has_role.user_id AND r.role = role_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically create a profile and role for new sign-ups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create a profile
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.phone);
  
  -- Assign the default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user');
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute the handle_new_user function when a new user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Part 3: Row Level Security (RLS) Policies
-- =================================================================

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.country_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;

-- Clear out any old policies before creating new ones
DROP POLICY IF EXISTS "Allow all users to read" ON public.country_settings;
DROP POLICY IF EXISTS "Allow all users to read" ON public.payment_gateways;
DROP POLICY IF EXISTS "Users can manage their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can do anything" ON public.profiles;
DROP POLICY IF EXISTS "Users can manage their own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Admins can do anything" ON public.quotes;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

-- Policies for country_settings and payment_gateways (publicly readable)
CREATE POLICY "Allow all users to read" ON public.country_settings FOR SELECT USING (true);
CREATE POLICY "Allow all users to read" ON public.payment_gateways FOR SELECT USING (true);

-- Policies for profiles
CREATE POLICY "Users can manage their own profile" ON public.profiles
  FOR ALL USING (auth.uid() = id);
CREATE POLICY "Admins can do anything" ON public.profiles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Policies for quotes
CREATE POLICY "Users can manage their own quotes" ON public.quotes
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can do anything" ON public.quotes
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Part 4: Seed Essential Data
-- =================================================================

-- Insert default payment gateways
INSERT INTO public.payment_gateways (name, code, supported_countries, supported_currencies)
VALUES
('Stripe', 'stripe', ARRAY['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'PL', 'SG', 'AE', 'SA', 'EG', 'TR', 'JP'], ARRAY['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'SGD', 'AED', 'SAR', 'EGP', 'TRY']),
('PayU', 'payu', ARRAY['IN'], ARRAY['INR']),
('eSewa', 'esewa', ARRAY['NP'], ARRAY['NPR']),
('Khalti', 'khalti', ARRAY['NP'], ARRAY['NPR']),
('Fonepay', 'fonepay', ARRAY['NP'], ARRAY['NPR']),
('Airwallex', 'airwallex', ARRAY['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'PL', 'SG', 'AE', 'SA', 'EG', 'TR', 'JP'], ARRAY['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'SGD', 'AED', 'SAR', 'EGP', 'TRY'])
ON CONFLICT (code) DO NOTHING;

-- Insert default country settings
INSERT INTO public.country_settings (code, name, currency, rate_from_usd, purchase_allowed, shipping_allowed, payment_gateway)
VALUES
('US', 'United States', 'USD', 1, true, true, 'stripe'),
('IN', 'India', 'INR', 83, true, true, 'payu'),
('NP', 'Nepal', 'NPR', 133, true, true, 'esewa'),
('JP', 'Japan', 'JPY', 155, true, true, 'stripe'),
('GB', 'United Kingdom', 'GBP', 0.79, true, true, 'stripe'),
('CA', 'Canada', 'CAD', 1.36, true, true, 'stripe'),
('AU', 'Australia', 'AUD', 1.52, true, true, 'stripe')
ON CONFLICT (code) DO NOTHING;

-- =================================================================
-- SCRIPT COMPLETE
-- =================================================================
-- Next step: Use your app to sign up a new user (or use your existing user).
-- Then, find your user_id and run the script in the next step to grant admin rights.
-- ================================================================= 