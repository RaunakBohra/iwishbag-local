-- Create payment gateway fee configuration table
CREATE TABLE payment_gateway_fee_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_code TEXT NOT NULL,
  country_code TEXT,
  fee_type TEXT NOT NULL CHECK (fee_type IN ('percentage', 'fixed', 'tiered')),
  fee_percentage NUMERIC(5,3),
  fixed_fee_amount NUMERIC(10,2),
  currency TEXT,
  tier_config JSONB,
  effective_from TIMESTAMP NOT NULL DEFAULT NOW(),
  effective_to TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Ensure unique active configuration per gateway/country combination
  CONSTRAINT unique_active_fee_config UNIQUE (gateway_code, country_code, is_active) 
    WHERE is_active = TRUE AND effective_to IS NULL
);

-- Add indexes for efficient lookups
CREATE INDEX idx_gateway_fee_config_lookup 
ON payment_gateway_fee_config(gateway_code, country_code, is_active) 
WHERE is_active = TRUE;

CREATE INDEX idx_gateway_fee_config_effective_dates 
ON payment_gateway_fee_config(effective_from, effective_to);

-- Add comments
COMMENT ON TABLE payment_gateway_fee_config IS 'Stores fee structures for different payment gateways by country';
COMMENT ON COLUMN payment_gateway_fee_config.fee_type IS 'Type of fee structure: percentage, fixed, or tiered';
COMMENT ON COLUMN payment_gateway_fee_config.tier_config IS 'JSON configuration for tiered fee structures';
COMMENT ON COLUMN payment_gateway_fee_config.effective_from IS 'Start date for this fee configuration';
COMMENT ON COLUMN payment_gateway_fee_config.effective_to IS 'End date for this fee configuration (NULL for current)';

-- Insert default fee configurations for PayU and PayPal
INSERT INTO payment_gateway_fee_config (
  gateway_code, 
  country_code, 
  fee_type, 
  fee_percentage, 
  fixed_fee_amount, 
  currency,
  effective_from
) VALUES 
  -- PayU India standard fees (2% for domestic cards)
  ('payu', 'IN', 'percentage', 2.0, 0, 'INR', NOW()),
  
  -- PayPal US standard fees (2.9% + $0.30)
  ('paypal', 'US', 'percentage', 2.9, 0.30, 'USD', NOW()),
  
  -- PayPal international fees (4.4% + fixed fee)
  ('paypal', NULL, 'percentage', 4.4, 0.30, 'USD', NOW()),
  
  -- PayU generic fees (2.5% average)
  ('payu', NULL, 'percentage', 2.5, 0, 'USD', NOW());

-- Create audit trigger for fee config changes
CREATE OR REPLACE FUNCTION trigger_update_payment_gateway_fee_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payment_gateway_fee_config_updated_at
BEFORE UPDATE ON payment_gateway_fee_config
FOR EACH ROW
EXECUTE FUNCTION trigger_update_payment_gateway_fee_config_updated_at();

-- Grant permissions
GRANT SELECT ON payment_gateway_fee_config TO authenticated;
GRANT ALL ON payment_gateway_fee_config TO service_role;