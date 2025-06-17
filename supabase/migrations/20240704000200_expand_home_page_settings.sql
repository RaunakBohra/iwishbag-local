-- Add flexible homepage fields to footer_settings
ALTER TABLE public.footer_settings
  ADD COLUMN IF NOT EXISTS hero_banner_url text,
  ADD COLUMN IF NOT EXISTS hero_headline text,
  ADD COLUMN IF NOT EXISTS hero_subheadline text,
  ADD COLUMN IF NOT EXISTS hero_cta_text text,
  ADD COLUMN IF NOT EXISTS hero_cta_link text,
  ADD COLUMN IF NOT EXISTS how_it_works_steps jsonb,
  ADD COLUMN IF NOT EXISTS value_props jsonb; 