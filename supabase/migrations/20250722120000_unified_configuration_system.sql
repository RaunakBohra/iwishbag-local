-- Migration: Unified Application Configuration System  
-- This migration creates a unified configuration system to replace fragmented settings
-- Consolidates: calculation_defaults, country_settings, system_settings, reply_templates

-- ============================================================================
-- Step 1: Create Unified Application Configuration Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS application_configuration (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Configuration category: 'country', 'calculation', 'system', 'template', 'gateway'
    category VARCHAR(30) NOT NULL CHECK (category IN ('country', 'calculation', 'system', 'template', 'gateway')),
    
    -- Configuration key (e.g., country code, setting name, template name)
    config_key VARCHAR(100) NOT NULL,
    
    -- Main configuration data (JSONB for flexibility)
    config_data JSONB NOT NULL DEFAULT '{}',
    /*
    config_data structure varies by category:
    
    For 'country':
    {
      "name": "United States",
      "currency": "USD",
      "symbol": "$",
      "rate_from_usd": 1.0,
      "minimum_payment_amount": 1.00,
      "customs_percent": 10.0,
      "vat_percent": 0.0,
      "payment_gateway_fixed_fee": 0.30,
      "payment_gateway_percent_fee": 2.9,
      "supported_gateways": ["stripe", "paypal"],
      "shipping_zones": ["domestic", "international"],
      "business_hours": {
        "timezone": "America/New_York", 
        "weekdays": "09:00-17:00",
        "weekend": false
      }
    }
    
    For 'calculation':
    {
      "default_handling_charge_percent": 5.0,
      "default_insurance_percent": 2.0,
      "default_customs_percentage": 10.0,
      "default_domestic_shipping": 5.0,
      "weight_estimation_multiplier": 1.2,
      "volume_weight_divisor": 5000,
      "min_declared_value": 1.0,
      "max_declared_value": 2500.0
    }
    
    For 'system':
    {
      "maintenance_mode": false,
      "max_quote_items": 50,
      "quote_expiry_days": 30,
      "auto_archive_days": 90,
      "rate_limit": {
        "quotes_per_hour": 10,
        "api_calls_per_minute": 60
      },
      "feature_flags": {
        "advanced_calculator": true,
        "ml_weight_prediction": false,
        "auto_assignment": true
      }
    }
    
    For 'template':
    {
      "name": "Welcome Email",
      "subject": "Welcome to iwishBag",
      "content": "Dear {{customer_name}}, welcome to our platform...",
      "template_type": "email|sms|push",
      "variables": ["customer_name", "quote_id", "total_amount"],
      "category": "welcome|quote|payment|shipping",
      "is_active": true,
      "usage_count": 0,
      "last_used": "timestamp"
    }
    
    For 'gateway':
    {
      "gateway_name": "stripe",
      "display_name": "Credit Card (Stripe)",
      "is_active": true,
      "supported_currencies": ["USD", "EUR", "GBP"],
      "supported_countries": ["US", "GB", "AU"],
      "api_config": {
        "public_key": "pk_...",
        "webhook_endpoint": "/webhook/stripe",
        "supported_payment_methods": ["card", "apple_pay", "google_pay"]
      },
      "fees": {
        "fixed_fee": 0.30,
        "percent_fee": 2.9,
        "international_fee": 1.5
      },
      "limits": {
        "min_amount": 0.50,
        "max_amount": 999999.99
      }
    }
    */
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}',
    
    -- Status and timing
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0, -- For ordering/precedence
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Ensure unique category+key combinations
    CONSTRAINT unique_category_key UNIQUE (category, config_key),
    
    -- Ensure config_data has required fields based on category
    CONSTRAINT valid_country_data CHECK (
        category != 'country' OR (
            config_data ? 'currency' AND
            config_data ? 'symbol' AND
            config_data ? 'rate_from_usd'
        )
    ),
    CONSTRAINT valid_calculation_data CHECK (
        category != 'calculation' OR (
            config_data ? 'default_handling_charge_percent'
        )
    ),
    CONSTRAINT valid_template_data CHECK (
        category != 'template' OR (
            config_data ? 'name' AND
            config_data ? 'content'
        )
    ),
    CONSTRAINT valid_gateway_data CHECK (
        category != 'gateway' OR (
            config_data ? 'gateway_name' AND
            config_data ? 'is_active'
        )
    )
);

-- ============================================================================
-- Step 2: Create Indexes for Performance
-- ============================================================================

-- Primary indexes
CREATE INDEX IF NOT EXISTS idx_app_config_category ON application_configuration(category);
CREATE INDEX IF NOT EXISTS idx_app_config_key ON application_configuration(config_key);
CREATE INDEX IF NOT EXISTS idx_app_config_active ON application_configuration(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_app_config_priority ON application_configuration(category, priority DESC);

-- JSONB indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_app_config_country_currency ON application_configuration 
USING gin ((config_data->'currency')) WHERE category = 'country';

CREATE INDEX IF NOT EXISTS idx_app_config_gateway_active ON application_configuration 
USING gin ((config_data->'is_active')) WHERE category = 'gateway';

CREATE INDEX IF NOT EXISTS idx_app_config_template_type ON application_configuration 
USING gin ((config_data->'template_type')) WHERE category = 'template';

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_app_config_category_active_priority ON application_configuration(category, is_active, priority DESC);

-- ============================================================================
-- Step 3: Create Helper Functions
-- ============================================================================

-- Function to get configuration by category and key
CREATE OR REPLACE FUNCTION get_app_config(
    p_category VARCHAR,
    p_config_key VARCHAR DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    IF p_config_key IS NOT NULL THEN
        -- Get specific config
        SELECT config_data INTO result
        FROM application_configuration
        WHERE category = p_category 
          AND config_key = p_config_key
          AND is_active = true;
        
        RETURN COALESCE(result, '{}'::jsonb);
    ELSE
        -- Get all configs for category
        SELECT jsonb_object_agg(config_key, config_data) INTO result
        FROM application_configuration
        WHERE category = p_category 
          AND is_active = true
        ORDER BY priority DESC, config_key;
        
        RETURN COALESCE(result, '{}'::jsonb);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to set configuration
CREATE OR REPLACE FUNCTION set_app_config(
    p_category VARCHAR,
    p_config_key VARCHAR,
    p_config_data JSONB,
    p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    config_id UUID;
BEGIN
    INSERT INTO application_configuration (
        category,
        config_key,
        config_data,
        metadata
    ) VALUES (
        p_category,
        p_config_key,
        p_config_data,
        COALESCE(p_metadata, '{}'::jsonb)
    )
    ON CONFLICT (category, config_key) DO UPDATE SET
        config_data = EXCLUDED.config_data,
        metadata = COALESCE(EXCLUDED.metadata, application_configuration.metadata),
        updated_at = now()
    RETURNING id INTO config_id;
    
    RETURN config_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get country configuration (most common use case)
CREATE OR REPLACE FUNCTION get_country_config(p_country_code VARCHAR)
RETURNS JSONB AS $$
BEGIN
    RETURN get_app_config('country', p_country_code);
END;
$$ LANGUAGE plpgsql;

-- Function to get calculation defaults
CREATE OR REPLACE FUNCTION get_calculation_defaults()
RETURNS JSONB AS $$
BEGIN
    RETURN get_app_config('calculation', 'defaults');
END;
$$ LANGUAGE plpgsql;

-- Function to get active payment gateways for a country
CREATE OR REPLACE FUNCTION get_active_gateways(p_country_code VARCHAR DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'gateway', config_key,
            'config', config_data
        ) ORDER BY priority DESC
    ) INTO result
    FROM application_configuration
    WHERE category = 'gateway'
      AND is_active = true
      AND (config_data->>'is_active')::boolean = true
      AND (p_country_code IS NULL OR 
           config_data->'supported_countries' ? p_country_code);
    
    RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Function to get templates by type
CREATE OR REPLACE FUNCTION get_templates(p_template_type VARCHAR DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'key', config_key,
            'template', config_data
        ) ORDER BY priority DESC
    ) INTO result
    FROM application_configuration
    WHERE category = 'template'
      AND is_active = true
      AND (config_data->>'is_active')::boolean = true
      AND (p_template_type IS NULL OR 
           config_data->>'template_type' = p_template_type);
    
    RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Step 4: Create RLS Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE application_configuration ENABLE ROW LEVEL SECURITY;

-- Create RLS policies with conditional logic
DO $$
BEGIN
    -- Public read access for certain categories
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'application_configuration' 
        AND policyname = 'Public read access for system configs'
    ) THEN
        CREATE POLICY "Public read access for system configs" ON application_configuration
            FOR SELECT USING (
                category IN ('country', 'calculation') OR
                (category = 'system' AND config_key IN ('feature_flags', 'rate_limit'))
            );
    END IF;

    -- Admin full access
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'application_configuration' 
        AND policyname = 'Admins have full access'
    ) THEN
        CREATE POLICY "Admins have full access" ON application_configuration
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM user_roles 
                    WHERE user_id = auth.uid() AND role = 'admin'
                )
            );
    END IF;

    -- Authenticated users can read active templates and gateways
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'application_configuration' 
        AND policyname = 'Authenticated users can read templates and gateways'
    ) THEN
        CREATE POLICY "Authenticated users can read templates and gateways" ON application_configuration
            FOR SELECT USING (
                auth.role() = 'authenticated' AND
                category IN ('template', 'gateway') AND
                is_active = true
            );
    END IF;

    -- Service role has full access
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'application_configuration' 
        AND policyname = 'Service role full access'
    ) THEN
        CREATE POLICY "Service role full access" ON application_configuration
            FOR ALL USING (auth.role() = 'service_role');
    END IF;
END $$;

-- ============================================================================
-- Step 5: Create Views for Backward Compatibility
-- ============================================================================

-- View to mimic old country_settings table
CREATE VIEW country_settings_view AS
SELECT 
    (config_data->>'currency')::varchar as code,
    config_key as country_code,
    config_data->>'name' as name,
    config_data->>'currency' as currency,
    config_data->>'symbol' as symbol,
    (config_data->>'rate_from_usd')::decimal as rate_from_usd,
    (config_data->>'minimum_payment_amount')::decimal as minimum_payment_amount,
    (config_data->>'customs_percent')::decimal as customs_percent,
    (config_data->>'vat_percent')::decimal as vat_percent,
    (config_data->>'payment_gateway_fixed_fee')::decimal as payment_gateway_fixed_fee,
    (config_data->>'payment_gateway_percent_fee')::decimal as payment_gateway_percent_fee,
    is_active,
    updated_at
FROM application_configuration
WHERE category = 'country';

-- View to mimic old calculation_defaults table  
CREATE VIEW calculation_defaults_view AS
SELECT 
    (config_data->>'default_handling_charge_percent')::decimal as default_handling_charge_percent,
    (config_data->>'default_insurance_percent')::decimal as default_insurance_percent,
    (config_data->>'default_customs_percentage')::decimal as default_customs_percentage,
    (config_data->>'default_domestic_shipping')::decimal as default_domestic_shipping,
    (config_data->>'weight_estimation_multiplier')::decimal as weight_estimation_multiplier,
    (config_data->>'volume_weight_divisor')::decimal as volume_weight_divisor,
    updated_at
FROM application_configuration
WHERE category = 'calculation' AND config_key = 'defaults';

-- ============================================================================
-- Step 6: Create Triggers for Data Integrity
-- ============================================================================

-- Trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_app_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_application_configuration_updated_at
    BEFORE UPDATE ON application_configuration
    FOR EACH ROW
    EXECUTE FUNCTION update_app_config_updated_at();

-- Trigger to increment template usage count
CREATE OR REPLACE FUNCTION increment_template_usage()
RETURNS TRIGGER AS $$
BEGIN
    -- This would be called when a template is used
    -- For now, it's just a placeholder
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Step 7: Add Comments for Documentation
-- ============================================================================

COMMENT ON TABLE application_configuration IS 'Unified configuration system for all application settings';
COMMENT ON COLUMN application_configuration.category IS 'Configuration category: country, calculation, system, template, gateway';
COMMENT ON COLUMN application_configuration.config_key IS 'Unique key within category (country code, setting name, etc.)';
COMMENT ON COLUMN application_configuration.config_data IS 'Main configuration data - structure varies by category';
COMMENT ON COLUMN application_configuration.metadata IS 'Additional metadata and tracking information';
COMMENT ON COLUMN application_configuration.priority IS 'Priority/order for configurations (higher = first)';

-- Function comments
COMMENT ON FUNCTION get_app_config(VARCHAR, VARCHAR) IS 'Get configuration by category and optional key';
COMMENT ON FUNCTION set_app_config(VARCHAR, VARCHAR, JSONB, JSONB) IS 'Set or update configuration';
COMMENT ON FUNCTION get_country_config(VARCHAR) IS 'Get country-specific configuration';
COMMENT ON FUNCTION get_calculation_defaults() IS 'Get calculation default values';
COMMENT ON FUNCTION get_active_gateways(VARCHAR) IS 'Get active payment gateways for country';
COMMENT ON FUNCTION get_templates(VARCHAR) IS 'Get templates by type';