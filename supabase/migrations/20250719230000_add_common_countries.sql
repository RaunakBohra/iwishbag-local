-- Add Common Countries Migration
-- This migration adds commonly used countries to country_settings table to fix foreign key constraints

-- Insert common countries that users might select
INSERT INTO country_settings (code, name, currency, rate_from_usd, minimum_payment_amount) VALUES
  -- North America
  ('CA', 'Canada', 'CAD', 1.35, 5.00),
  ('MX', 'Mexico', 'MXN', 17.50, 50.00),
  
  -- Europe
  ('DE', 'Germany', 'EUR', 0.92, 5.00),
  ('FR', 'France', 'EUR', 0.92, 5.00),
  ('IT', 'Italy', 'EUR', 0.92, 5.00),
  ('ES', 'Spain', 'EUR', 0.92, 5.00),
  ('NL', 'Netherlands', 'EUR', 0.92, 5.00),
  ('SE', 'Sweden', 'SEK', 10.85, 50.00),
  ('NO', 'Norway', 'NOK', 11.20, 50.00),
  ('DK', 'Denmark', 'DKK', 6.85, 35.00),
  ('CH', 'Switzerland', 'CHF', 0.89, 5.00),
  
  -- Asia Pacific
  ('CN', 'China', 'CNY', 7.25, 35.00),
  ('SG', 'Singapore', 'SGD', 1.35, 7.00),
  ('HK', 'Hong Kong', 'HKD', 7.85, 40.00),
  ('MY', 'Malaysia', 'MYR', 4.65, 20.00),
  ('TH', 'Thailand', 'THB', 36.00, 150.00),
  ('KR', 'South Korea', 'KRW', 1320.00, 6000.00),
  ('TW', 'Taiwan', 'TWD', 31.50, 150.00),
  
  -- Middle East & Africa
  ('AE', 'United Arab Emirates', 'AED', 3.67, 18.00),
  ('SA', 'Saudi Arabia', 'SAR', 3.75, 19.00),
  ('ZA', 'South Africa', 'ZAR', 18.85, 90.00),
  
  -- South America
  ('BR', 'Brazil', 'BRL', 5.15, 25.00),
  ('AR', 'Argentina', 'ARS', 350.00, 1750.00),
  ('CL', 'Chile', 'CLP', 950.00, 4500.00),
  
  -- Other
  ('NZ', 'New Zealand', 'NZD', 1.65, 8.00),
  ('RU', 'Russia', 'RUB', 92.00, 450.00)
  
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  currency = EXCLUDED.currency,
  rate_from_usd = EXCLUDED.rate_from_usd,
  minimum_payment_amount = EXCLUDED.minimum_payment_amount;

-- Also update existing countries with better exchange rates if needed
UPDATE country_settings SET 
  rate_from_usd = 83.15,
  minimum_payment_amount = 415.00
WHERE code = 'IN';

UPDATE country_settings SET 
  rate_from_usd = 133.20,
  minimum_payment_amount = 665.00
WHERE code = 'NP';

-- Add a helpful comment
COMMENT ON TABLE country_settings IS 'Country configurations for currency, exchange rates, and payment processing. Exchange rates should be updated regularly.';