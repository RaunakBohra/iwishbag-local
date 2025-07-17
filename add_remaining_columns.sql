-- Add missing columns to payment_gateways table
ALTER TABLE payment_gateways ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE payment_gateways ADD COLUMN IF NOT EXISTS supported_countries TEXT[];
ALTER TABLE payment_gateways ADD COLUMN IF NOT EXISTS supported_currencies TEXT[];
ALTER TABLE payment_gateways ADD COLUMN IF NOT EXISTS fee_percent DECIMAL(5,2) DEFAULT 0.00;
ALTER TABLE payment_gateways ADD COLUMN IF NOT EXISTS fee_fixed DECIMAL(10,2) DEFAULT 0.00;

-- Add missing columns to country_settings table
ALTER TABLE country_settings ADD COLUMN IF NOT EXISTS sales_tax DECIMAL(5,2) DEFAULT 0.00;
ALTER TABLE country_settings ADD COLUMN IF NOT EXISTS vat DECIMAL(5,2) DEFAULT 0.00;
ALTER TABLE country_settings ADD COLUMN IF NOT EXISTS min_shipping DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE country_settings ADD COLUMN IF NOT EXISTS additional_shipping DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE country_settings ADD COLUMN IF NOT EXISTS additional_weight DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE country_settings ADD COLUMN IF NOT EXISTS weight_unit VARCHAR(10) DEFAULT 'kg';
ALTER TABLE country_settings ADD COLUMN IF NOT EXISTS volumetric_divisor INTEGER DEFAULT 5000;
ALTER TABLE country_settings ADD COLUMN IF NOT EXISTS payment_gateway_fixed_fee DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE country_settings ADD COLUMN IF NOT EXISTS payment_gateway_percent_fee DECIMAL(5,2) DEFAULT 0.00;
ALTER TABLE country_settings ADD COLUMN IF NOT EXISTS purchase_allowed BOOLEAN DEFAULT TRUE;
ALTER TABLE country_settings ADD COLUMN IF NOT EXISTS shipping_allowed BOOLEAN DEFAULT TRUE;
ALTER TABLE country_settings ADD COLUMN IF NOT EXISTS payment_gateway VARCHAR(50);
ALTER TABLE country_settings ADD COLUMN IF NOT EXISTS available_gateways TEXT[];
ALTER TABLE country_settings ADD COLUMN IF NOT EXISTS default_gateway VARCHAR(50);
ALTER TABLE country_settings ADD COLUMN IF NOT EXISTS gateway_config JSONB DEFAULT '{}';

-- Add missing columns to bank_account_details table
ALTER TABLE bank_account_details ADD COLUMN IF NOT EXISTS destination_country VARCHAR(2);
ALTER TABLE bank_account_details ADD COLUMN IF NOT EXISTS upi_id VARCHAR(100);
ALTER TABLE bank_account_details ADD COLUMN IF NOT EXISTS upi_qr_string TEXT;
ALTER TABLE bank_account_details ADD COLUMN IF NOT EXISTS payment_qr_url TEXT;
ALTER TABLE bank_account_details ADD COLUMN IF NOT EXISTS instructions TEXT;
ALTER TABLE bank_account_details ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3);