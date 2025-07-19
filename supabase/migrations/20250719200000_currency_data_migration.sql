-- Currency Data Migration: Populate missing countries and currency data
-- This migration adds comprehensive country and currency data to support global operations

-- Note: Not disabling triggers to avoid permission issues in local development

-- Insert comprehensive country data with currency information
INSERT INTO country_settings (
    code, name, currency, rate_from_usd, 
    vat, minimum_payment_amount,
    payment_gateway_fixed_fee, payment_gateway_percent_fee
) VALUES 
-- Major markets
('US', 'United States', 'USD', 1.00, 0.00, 1.00, 0.30, 2.9),
('IN', 'India', 'INR', 83.00, 18.00, 50.00, 2.00, 2.5),
('NP', 'Nepal', 'NPR', 132.80, 13.00, 100.00, 5.00, 3.0),
('SG', 'Singapore', 'SGD', 1.35, 7.00, 2.00, 0.50, 3.4),

-- European Union
('GB', 'United Kingdom', 'GBP', 0.79, 20.00, 1.00, 0.20, 1.4),
('DE', 'Germany', 'EUR', 0.92, 19.00, 1.00, 0.25, 1.4),
('FR', 'France', 'EUR', 0.92, 20.00, 1.00, 0.25, 1.4),
('IT', 'Italy', 'EUR', 0.92, 22.00, 1.00, 0.25, 1.4),
('ES', 'Spain', 'EUR', 0.92, 21.00, 1.00, 0.25, 1.4),
('NL', 'Netherlands', 'EUR', 0.92, 21.00, 1.00, 0.25, 1.4),

-- Asia Pacific
('CN', 'China', 'CNY', 7.25, 13.00, 10.00, 1.00, 2.0),
('JP', 'Japan', 'JPY', 150.00, 10.00, 100.00, 30.00, 3.6),
('KR', 'South Korea', 'KRW', 1300.00, 10.00, 1000.00, 200.00, 2.8),
('AU', 'Australia', 'AUD', 1.50, 10.00, 2.00, 0.30, 1.75),
('MY', 'Malaysia', 'MYR', 4.60, 6.00, 5.00, 1.00, 2.6),
('TH', 'Thailand', 'THB', 36.00, 7.00, 30.00, 10.00, 3.65),
('ID', 'Indonesia', 'IDR', 15600.00, 10.00, 15000.00, 2200.00, 2.9),
('PH', 'Philippines', 'PHP', 56.00, 12.00, 50.00, 15.00, 3.5),
('VN', 'Vietnam', 'VND', 24000.00, 10.00, 25000.00, 5000.00, 3.0),

-- North America
('CA', 'Canada', 'CAD', 1.36, 13.00, 2.00, 0.30, 2.9),
('MX', 'Mexico', 'MXN', 18.00, 16.00, 20.00, 3.00, 3.6),

-- Middle East & Africa
('AE', 'United Arab Emirates', 'AED', 3.67, 5.00, 5.00, 1.00, 2.9),
('SA', 'Saudi Arabia', 'SAR', 3.75, 15.00, 5.00, 1.00, 2.9),
('ZA', 'South Africa', 'ZAR', 18.50, 15.00, 20.00, 2.00, 2.9),
('EG', 'Egypt', 'EGP', 31.00, 14.00, 30.00, 5.00, 2.9),

-- South America
('BR', 'Brazil', 'BRL', 5.20, 17.00, 5.00, 1.00, 3.99),
('AR', 'Argentina', 'ARS', 350.00, 21.00, 500.00, 50.00, 3.5),

-- Others
('CH', 'Switzerland', 'CHF', 0.88, 7.7, 1.00, 0.30, 1.9),
('NO', 'Norway', 'NOK', 10.80, 25.00, 10.00, 2.00, 1.9),
('SE', 'Sweden', 'SEK', 10.50, 25.00, 10.00, 1.80, 1.9),
('DK', 'Denmark', 'DKK', 6.90, 25.00, 7.00, 1.80, 1.9),
('NZ', 'New Zealand', 'NZD', 1.62, 15.00, 2.00, 0.30, 2.9),
('HK', 'Hong Kong', 'HKD', 7.80, 0.00, 8.00, 2.35, 3.4),
('TW', 'Taiwan', 'TWD', 32.00, 5.00, 30.00, 10.00, 2.75),
('BD', 'Bangladesh', 'BDT', 110.00, 15.00, 100.00, 25.00, 2.9),
('LK', 'Sri Lanka', 'LKR', 320.00, 12.00, 300.00, 50.00, 3.5),
('PK', 'Pakistan', 'PKR', 280.00, 17.00, 300.00, 50.00, 3.5)

ON CONFLICT (code) DO UPDATE SET
    currency = EXCLUDED.currency,
    rate_from_usd = EXCLUDED.rate_from_usd,
    vat = EXCLUDED.vat,
    minimum_payment_amount = EXCLUDED.minimum_payment_amount,
    payment_gateway_fixed_fee = EXCLUDED.payment_gateway_fixed_fee,
    payment_gateway_percent_fee = EXCLUDED.payment_gateway_percent_fee;

-- Note: Triggers were not disabled, so no need to re-enable

-- Update any existing quotes with missing destination_currency
UPDATE quotes 
SET destination_currency = COALESCE(
    (SELECT currency FROM country_settings WHERE code = quotes.destination_country),
    'USD'
)
WHERE destination_currency IS NULL OR destination_currency = '';

-- Update any existing quotes with missing final_total_local
UPDATE quotes 
SET final_total_local = COALESCE(final_total_usd * exchange_rate, final_total_usd)
WHERE final_total_local IS NULL AND final_total_usd IS NOT NULL;

-- Set exchange_rate_source for existing quotes
UPDATE quotes 
SET exchange_rate_source = CASE 
    WHEN exchange_rate = 1.0 THEN 'system_default'
    WHEN exchange_rate IS NOT NULL THEN 'legacy_rate'
    ELSE 'system_default'
END
WHERE exchange_rate_source IS NULL;

-- Set exchange_rate_method for existing quotes
UPDATE quotes 
SET exchange_rate_method = CASE 
    WHEN exchange_rate = 1.0 THEN 'fallback'
    WHEN exchange_rate IS NOT NULL THEN 'legacy'
    ELSE 'fallback'
END
WHERE exchange_rate_method IS NULL;

-- Insert sample exchange rates into cache for testing
INSERT INTO exchange_rate_cache (from_currency, to_currency, rate, source, method, expires_at) VALUES
('USD', 'INR', 83.00, 'system', 'fallback', NOW() + INTERVAL '1 day'),
('USD', 'NPR', 132.80, 'system', 'fallback', NOW() + INTERVAL '1 day'),
('USD', 'SGD', 1.35, 'system', 'fallback', NOW() + INTERVAL '1 day'),
('USD', 'EUR', 0.92, 'system', 'fallback', NOW() + INTERVAL '1 day'),
('USD', 'GBP', 0.79, 'system', 'fallback', NOW() + INTERVAL '1 day'),
('INR', 'NPR', 1.60, 'system', 'direct', NOW() + INTERVAL '1 day'),
('NPR', 'INR', 0.625, 'system', 'direct', NOW() + INTERVAL '1 day')
ON CONFLICT (from_currency, to_currency, source) DO UPDATE SET
    rate = EXCLUDED.rate,
    expires_at = EXCLUDED.expires_at;

-- Update system settings with currency configuration using existing schema
INSERT INTO system_settings (setting_key, setting_value, description) VALUES 
(
    'currency_system', 
    '{
        "base_currency": "USD",
        "supported_currencies": ["USD", "INR", "NPR", "SGD", "EUR", "GBP", "CNY", "JPY"],
        "auto_update_rates": true,
        "cache_duration_minutes": 15,
        "fallback_enabled": true
    }', 
    'Currency system configuration'
),
(
    'payment_gateways', 
    '{
        "payu": {"currencies": ["INR"], "countries": ["IN"]},
        "khalti": {"currencies": ["NPR"], "countries": ["NP"]},
        "esewa": {"currencies": ["NPR"], "countries": ["NP"]},
        "fonepay": {"currencies": ["NPR"], "countries": ["NP"]},
        "stripe": {"currencies": ["USD", "EUR", "GBP", "SGD"], "countries": ["US", "GB", "SG", "AU", "CA"]},
        "paypal": {"currencies": ["USD", "EUR", "GBP"], "countries": ["US", "GB", "CA", "AU"]}
    }', 
    'Payment gateway currency and country support'
)
ON CONFLICT (setting_key) DO UPDATE SET
    setting_value = EXCLUDED.setting_value,
    updated_at = NOW();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quotes_destination_currency ON quotes(destination_currency);
CREATE INDEX IF NOT EXISTS idx_quotes_final_total_usd ON quotes(final_total_usd);
CREATE INDEX IF NOT EXISTS idx_country_settings_currency ON country_settings(currency);

-- Add validation constraints
ALTER TABLE quotes ADD CONSTRAINT quotes_destination_currency_check 
    CHECK (destination_currency ~ '^[A-Z]{3}$') NOT VALID;

ALTER TABLE quotes ADD CONSTRAINT quotes_final_total_usd_positive 
    CHECK (final_total_usd >= 0) NOT VALID;

ALTER TABLE quotes ADD CONSTRAINT quotes_final_total_local_positive 
    CHECK (final_total_local >= 0) NOT VALID;

-- Validate constraints
ALTER TABLE quotes VALIDATE CONSTRAINT quotes_destination_currency_check;
ALTER TABLE quotes VALIDATE CONSTRAINT quotes_final_total_usd_positive;
ALTER TABLE quotes VALIDATE CONSTRAINT quotes_final_total_local_positive;