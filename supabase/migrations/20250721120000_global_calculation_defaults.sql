-- ============================================================================
-- GLOBAL CALCULATION DEFAULTS - Database Schema
-- Stores configurable defaults for handling charges, insurance, and shipping
-- ============================================================================

-- Create the main configuration table
CREATE TABLE IF NOT EXISTS global_calculation_defaults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT false,
  configuration jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by uuid REFERENCES profiles(id),
  updated_by uuid REFERENCES profiles(id)
);

-- Create fallback usage logs table for analytics
CREATE TABLE IF NOT EXISTS fallback_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid REFERENCES quotes(id),
  calculation_type text NOT NULL CHECK (calculation_type IN ('handling_charge', 'insurance', 'shipping', 'payment_gateway', 'taxes')),
  fallback_value_used numeric(12,2) NOT NULL,
  route_id uuid, -- Optional reference to shipping_routes
  route_origin text,
  route_destination text,
  reason text NOT NULL,
  timestamp timestamp with time zone DEFAULT now() NOT NULL,
  user_id uuid REFERENCES profiles(id)
);

-- Add indexes for performance
CREATE INDEX idx_global_calculation_defaults_active ON global_calculation_defaults(is_active) WHERE is_active = true;
CREATE INDEX idx_global_calculation_defaults_created_at ON global_calculation_defaults(created_at);
CREATE INDEX idx_fallback_usage_logs_quote_id ON fallback_usage_logs(quote_id);
CREATE INDEX idx_fallback_usage_logs_calculation_type ON fallback_usage_logs(calculation_type);
CREATE INDEX idx_fallback_usage_logs_timestamp ON fallback_usage_logs(timestamp);
CREATE INDEX idx_fallback_usage_logs_route ON fallback_usage_logs(route_origin, route_destination) WHERE route_origin IS NOT NULL AND route_destination IS NOT NULL;

-- JSONB indexes for configuration queries
CREATE INDEX idx_global_calculation_defaults_config_gin ON global_calculation_defaults USING gin(configuration);

-- Add constraint to ensure only one active configuration
-- Note: We'll manage this constraint in the application logic instead of DB constraint
-- to avoid migration issues with the insert statement below

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_global_calculation_defaults_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER global_calculation_defaults_updated_at
  BEFORE UPDATE ON global_calculation_defaults
  FOR EACH ROW EXECUTE FUNCTION update_global_calculation_defaults_updated_at();

-- Add RLS policies
ALTER TABLE global_calculation_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE fallback_usage_logs ENABLE ROW LEVEL SECURITY;

-- Admins can manage all calculation defaults
CREATE POLICY "Admins can manage calculation defaults" ON global_calculation_defaults
  USING (has_role(auth.uid(), 'admin'));

-- Authenticated users can read active defaults
CREATE POLICY "Users can read active defaults" ON global_calculation_defaults
  FOR SELECT USING (is_active = true);

-- Admins can view all fallback usage logs
CREATE POLICY "Admins can view fallback logs" ON fallback_usage_logs
  USING (has_role(auth.uid(), 'admin'));

-- Service role can log fallback usage
CREATE POLICY "Service can log fallback usage" ON fallback_usage_logs
  FOR INSERT WITH CHECK (true);

-- Grant permissions
GRANT ALL ON global_calculation_defaults TO authenticated;
GRANT ALL ON global_calculation_defaults TO service_role;
GRANT ALL ON fallback_usage_logs TO authenticated;
GRANT ALL ON fallback_usage_logs TO service_role;

-- Insert default configuration
INSERT INTO global_calculation_defaults (
  name,
  description,
  is_active,
  configuration,
  created_at,
  updated_at
) VALUES (
  'System Default Configuration',
  'Default calculation settings matching current hardcoded values in SmartCalculationEngine',
  true,
  '{
    "name": "System Default Configuration",
    "description": "Default calculation settings matching current hardcoded values",
    "is_active": true,
    "handling_charge": {
      "minimum_fee_usd": 5.0,
      "percentage_of_value": 2.0,
      "calculation_method": "max"
    },
    "insurance": {
      "default_coverage_percentage": 1.5,
      "minimum_fee_usd": 0,
      "customer_optional": true,
      "default_opted_in": false
    },
    "shipping": {
      "base_cost_usd": 25.0,
      "cost_per_kg_usd": 5.0,
      "default_weight_kg": 0.5,
      "weight_confidence_default": 0.5,
      "default_delivery_days": "7-14",
      "default_carrier_name": "Standard"
    },
    "payment_gateway": {
      "percentage_fee": 2.9,
      "fixed_fee_usd": 0.3
    },
    "taxes": {
      "default_sales_tax_percentage": 10.0,
      "default_vat_percentage": 0.0,
      "default_customs_percentage": 15.0
    },
    "fallback_behavior": {
      "use_fallbacks_when_route_missing": true,
      "show_fallback_warnings": true,
      "require_admin_approval_for_fallbacks": false
    }
  }'::jsonb,
  now(),
  now()
) ON CONFLICT DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE global_calculation_defaults IS 'Configurable system defaults for handling charges, insurance, shipping costs, and other calculation parameters';
COMMENT ON COLUMN global_calculation_defaults.configuration IS 'JSONB configuration containing all default values and settings';
COMMENT ON COLUMN global_calculation_defaults.is_active IS 'Only one configuration can be active at a time';

COMMENT ON TABLE fallback_usage_logs IS 'Analytics table tracking when fallback values are used instead of route-specific configurations';
COMMENT ON COLUMN fallback_usage_logs.calculation_type IS 'Type of calculation that used a fallback value';
COMMENT ON COLUMN fallback_usage_logs.reason IS 'Reason why fallback was used (e.g., "route_not_configured", "route_missing_handling_config")';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Global calculation defaults system created successfully';
  RAISE NOTICE '📊 Tables: global_calculation_defaults, fallback_usage_logs';
  RAISE NOTICE '🔧 Default configuration inserted with current hardcoded values';
  RAISE NOTICE '📈 Fallback usage analytics enabled';
  RAISE NOTICE '🔒 RLS policies configured for admin management';
END $$;