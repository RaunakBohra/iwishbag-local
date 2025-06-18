-- Create footer_settings table for home page settings
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'footer_settings') THEN
        CREATE TABLE public.footer_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text,
  company_description text,
  primary_phone text,
  secondary_phone text,
  primary_email text,
  support_email text,
  primary_address text,
  secondary_address text,
  business_hours text,
  social_twitter text,
  social_facebook text,
  social_instagram text,
  social_linkedin text,
  website_logo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

        -- Insert a default row only if table is empty
        IF NOT EXISTS (SELECT 1 FROM public.footer_settings) THEN
INSERT INTO public.footer_settings (company_name, created_at, updated_at)
            VALUES ('Your Company', now(), now());
        END IF;
    END IF;
END $$; 