-- Fix footer_settings table schema to match application expectations
-- Add missing columns that the application is trying to access

ALTER TABLE public.footer_settings 
ADD COLUMN IF NOT EXISTS company_description TEXT,
ADD COLUMN IF NOT EXISTS primary_phone TEXT,
ADD COLUMN IF NOT EXISTS secondary_phone TEXT,
ADD COLUMN IF NOT EXISTS primary_email TEXT,
ADD COLUMN IF NOT EXISTS support_email TEXT,
ADD COLUMN IF NOT EXISTS primary_address TEXT,
ADD COLUMN IF NOT EXISTS secondary_address TEXT,
ADD COLUMN IF NOT EXISTS business_hours TEXT,
ADD COLUMN IF NOT EXISTS social_twitter TEXT,
ADD COLUMN IF NOT EXISTS social_facebook TEXT,
ADD COLUMN IF NOT EXISTS social_instagram TEXT,
ADD COLUMN IF NOT EXISTS social_linkedin TEXT,
ADD COLUMN IF NOT EXISTS website_logo_url TEXT,
ADD COLUMN IF NOT EXISTS hero_banner_url TEXT,
ADD COLUMN IF NOT EXISTS hero_headline TEXT,
ADD COLUMN IF NOT EXISTS hero_subheadline TEXT,
ADD COLUMN IF NOT EXISTS hero_cta_text TEXT,
ADD COLUMN IF NOT EXISTS hero_cta_link TEXT,
ADD COLUMN IF NOT EXISTS how_it_works_steps JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS value_props JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS contact_email TEXT;

-- Ensure correct column types for JSONB fields
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='footer_settings' AND column_name='how_it_works_steps' AND data_type='text'
  ) THEN
    EXECUTE 'ALTER TABLE public.footer_settings ALTER COLUMN how_it_works_steps TYPE jsonb USING how_it_works_steps::jsonb';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='footer_settings' AND column_name='value_props' AND data_type='text'
  ) THEN
    EXECUTE 'ALTER TABLE public.footer_settings ALTER COLUMN value_props TYPE jsonb USING value_props::jsonb';
  END IF;
END $$;

-- Add email validation constraints
ALTER TABLE public.footer_settings 
DROP CONSTRAINT IF EXISTS footer_settings_primary_email_check,
DROP CONSTRAINT IF EXISTS footer_settings_support_email_check;

ALTER TABLE public.footer_settings 
ADD CONSTRAINT footer_settings_primary_email_check 
CHECK (primary_email IS NULL OR primary_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
ADD CONSTRAINT footer_settings_support_email_check 
CHECK (support_email IS NULL OR support_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Update existing data to populate new columns with default values
-- Handle the case where old columns might not exist
UPDATE public.footer_settings 
SET
    company_description = COALESCE(company_description, 'A comprehensive description of the company'),
    primary_phone = COALESCE(primary_phone, '+1-555-0123'),
    secondary_phone = COALESCE(secondary_phone, '+1-555-0456'),
    primary_email = COALESCE(primary_email, 'contact@globalwishlisthub.com'),
    support_email = COALESCE(support_email, 'support@globalwishlisthub.com'),
    primary_address = COALESCE(primary_address, '123 Main Street, Suite 100, City, State 12345'),
    secondary_address = COALESCE(secondary_address, 'Secondary address line'),
    business_hours = COALESCE(business_hours, 'Monday - Friday: 9:00 AM - 6:00 PM'),
    social_twitter = COALESCE(social_twitter, 'https://twitter.com/globalwishlisthub'),
    social_facebook = COALESCE(social_facebook, 'https://facebook.com/globalwishlisthub'),
    social_instagram = COALESCE(social_instagram, 'https://instagram.com/globalwishlisthub'),
    social_linkedin = COALESCE(social_linkedin, 'https://linkedin.com/company/globalwishlisthub'),
    website_logo_url = COALESCE(website_logo_url, '/logo.png'),
    hero_banner_url = COALESCE(hero_banner_url, '/hero-banner.jpg'),
    hero_headline = COALESCE(hero_headline, 'Shop Globally, Ship Locally'),
    hero_subheadline = COALESCE(hero_subheadline, 'Access products from around the world with our seamless shipping service'),
    hero_cta_text = COALESCE(hero_cta_text, 'Start Shopping'),
    hero_cta_link = COALESCE(hero_cta_link, '/signup'),
    how_it_works_steps = COALESCE(how_it_works_steps, '[]'::jsonb),
    value_props = COALESCE(value_props, '[]'::jsonb),
    contact_email = COALESCE(contact_email, primary_email)
WHERE id IS NOT NULL;

-- Insert default record if none exists
INSERT INTO public.footer_settings (
    company_name, company_description, primary_phone, secondary_phone,
    primary_email, support_email, primary_address, secondary_address,
    business_hours, social_twitter, social_facebook, social_instagram,
    social_linkedin, website_logo_url, hero_banner_url, hero_headline,
    hero_subheadline, hero_cta_text, hero_cta_link, how_it_works_steps, value_props
)
SELECT 
    'Global Wishlist Hub', 'Your trusted partner for international shopping and shipping',
    '+1-555-0123', '+1-555-0456', 'contact@globalwishlisthub.com', 'support@globalwishlisthub.com',
    '123 Main Street, Suite 100, City, State 12345', 'Secondary address line',
    'Monday - Friday: 9:00 AM - 6:00 PM', 'https://twitter.com/globalwishlisthub',
    'https://facebook.com/globalwishlisthub', 'https://instagram.com/globalwishlisthub',
    'https://linkedin.com/company/globalwishlisthub', '/logo.png', '/hero-banner.jpg',
    'Shop Globally, Ship Locally', 'Access products from around the world with our seamless shipping service',
    'Start Shopping', '/signup', '[]'::jsonb, '[]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.footer_settings LIMIT 1); 