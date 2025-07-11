-- Add currency configuration fields to country_settings table
-- This migration adds fields needed to fully centralize currency management

-- Add minimum payment amount for each currency
ALTER TABLE country_settings 
ADD COLUMN IF NOT EXISTS minimum_payment_amount NUMERIC(10,2) DEFAULT 10 CHECK (minimum_payment_amount >= 0);

-- Add currency formatting configuration
ALTER TABLE country_settings 
ADD COLUMN IF NOT EXISTS decimal_places INTEGER DEFAULT 2 CHECK (decimal_places >= 0 AND decimal_places <= 8);

-- Add thousand separator (e.g., "," for 1,000 or "." for 1.000)
ALTER TABLE country_settings 
ADD COLUMN IF NOT EXISTS thousand_separator TEXT DEFAULT ',' CHECK (length(thousand_separator) <= 3);

-- Add decimal separator (e.g., "." for 1.50 or "," for 1,50)
ALTER TABLE country_settings 
ADD COLUMN IF NOT EXISTS decimal_separator TEXT DEFAULT '.' CHECK (length(decimal_separator) <= 3);

-- Add currency symbol position (before or after the amount)
ALTER TABLE country_settings 
ADD COLUMN IF NOT EXISTS symbol_position TEXT DEFAULT 'before' CHECK (symbol_position IN ('before', 'after'));

-- Add space between symbol and amount
ALTER TABLE country_settings 
ADD COLUMN IF NOT EXISTS symbol_space BOOLEAN DEFAULT false;

-- Update existing records with appropriate defaults based on common currency conventions
UPDATE country_settings SET
  minimum_payment_amount = CASE 
    WHEN currency = 'USD' THEN 10
    WHEN currency = 'EUR' THEN 10
    WHEN currency = 'GBP' THEN 8
    WHEN currency = 'INR' THEN 750
    WHEN currency = 'NPR' THEN 1200
    WHEN currency = 'AUD' THEN 15
    WHEN currency = 'CAD' THEN 15
    WHEN currency = 'JPY' THEN 1100
    WHEN currency = 'CNY' THEN 70
    WHEN currency = 'KRW' THEN 12000
    ELSE 10
  END,
  decimal_places = CASE 
    WHEN currency IN ('JPY', 'KRW') THEN 0  -- Japanese Yen and Korean Won don't use decimals
    ELSE 2
  END,
  thousand_separator = CASE 
    WHEN code IN ('DE', 'FR', 'IT', 'ES', 'NL', 'BE') THEN '.'  -- European countries often use . for thousands
    ELSE ','
  END,
  decimal_separator = CASE 
    WHEN code IN ('DE', 'FR', 'IT', 'ES', 'NL', 'BE') THEN ','  -- European countries often use , for decimals
    ELSE '.'
  END,
  symbol_position = CASE 
    WHEN currency = 'EUR' AND code IN ('DE', 'FR', 'IT', 'ES', 'NL', 'BE') THEN 'after'  -- EUR often comes after in Europe
    ELSE 'before'
  END,
  symbol_space = CASE 
    WHEN currency = 'EUR' AND code IN ('DE', 'FR', 'IT', 'ES', 'NL', 'BE') THEN true  -- EUR often has space in Europe
    ELSE false
  END
WHERE minimum_payment_amount IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN country_settings.minimum_payment_amount IS 'Minimum amount required for payments in this currency';
COMMENT ON COLUMN country_settings.decimal_places IS 'Number of decimal places to display for this currency';
COMMENT ON COLUMN country_settings.thousand_separator IS 'Character used to separate thousands (e.g., comma in 1,000)';
COMMENT ON COLUMN country_settings.decimal_separator IS 'Character used for decimal point (e.g., period in 1.50)';
COMMENT ON COLUMN country_settings.symbol_position IS 'Whether currency symbol appears before or after the amount';
COMMENT ON COLUMN country_settings.symbol_space IS 'Whether to include space between currency symbol and amount';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_country_settings_currency ON country_settings(currency);
CREATE INDEX IF NOT EXISTS idx_country_settings_minimum_payment ON country_settings(minimum_payment_amount);