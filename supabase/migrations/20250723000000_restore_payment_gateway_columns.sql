-- ============================================================================
-- Migration: Add back payment gateway fee columns to country_settings
-- Date: 2025-07-23
-- Purpose: Fix schema mismatch where columns were removed but code still references them
-- Note: This is a temporary fix - long term should use unified configuration system
-- ============================================================================

-- Add back the payment gateway fee columns that were removed
ALTER TABLE country_settings ADD COLUMN IF NOT EXISTS payment_gateway_fixed_fee NUMERIC DEFAULT 0;
ALTER TABLE country_settings ADD COLUMN IF NOT EXISTS payment_gateway_percent_fee NUMERIC DEFAULT 0;
ALTER TABLE country_settings ADD COLUMN IF NOT EXISTS minimum_payment_amount NUMERIC DEFAULT 1;

-- Add back the constraints that were removed
ALTER TABLE country_settings ADD CONSTRAINT IF NOT EXISTS country_settings_payment_gateway_fixed_fee_check CHECK (payment_gateway_fixed_fee >= 0);
ALTER TABLE country_settings ADD CONSTRAINT IF NOT EXISTS country_settings_payment_gateway_percent_fee_check CHECK (payment_gateway_percent_fee >= 0);
ALTER TABLE country_settings ADD CONSTRAINT IF NOT EXISTS country_settings_minimum_payment_amount_check CHECK (minimum_payment_amount >= 0);

-- Set default values for existing countries that don't have these values
UPDATE country_settings 
SET 
  payment_gateway_fixed_fee = COALESCE(payment_gateway_fixed_fee, 0.30),
  payment_gateway_percent_fee = COALESCE(payment_gateway_percent_fee, 2.9),
  minimum_payment_amount = COALESCE(minimum_payment_amount, 1.0)
WHERE payment_gateway_fixed_fee IS NULL 
   OR payment_gateway_percent_fee IS NULL 
   OR minimum_payment_amount IS NULL;

-- Log the changes
SELECT 'Payment gateway fee columns restored to country_settings table' as migration_status;