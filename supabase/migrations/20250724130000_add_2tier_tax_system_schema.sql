-- ============================================================================
-- 2-TIER TAX SYSTEM DATABASE SCHEMA
-- Adds support for dual calculation method and valuation method preferences
-- with comprehensive admin override tracking
-- ============================================================================

-- Start transaction
BEGIN;

-- 1. Add calculation method preferences to quotes table
DO $$
BEGIN
    -- Add calculation_method_preference column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quotes' AND column_name = 'calculation_method_preference'
    ) THEN
        ALTER TABLE quotes ADD COLUMN calculation_method_preference TEXT DEFAULT 'auto' 
        CHECK (calculation_method_preference IN ('auto', 'hsn_only', 'legacy_fallback', 'admin_choice'));
    END IF;

    -- Add valuation_method_preference column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quotes' AND column_name = 'valuation_method_preference'
    ) THEN
        ALTER TABLE quotes ADD COLUMN valuation_method_preference TEXT DEFAULT 'auto'
        CHECK (valuation_method_preference IN ('auto', 'actual_price', 'minimum_valuation', 'higher_of_both', 'per_item_choice'));
    END IF;
END $$;

-- 2. Create tax_calculation_audit_log table for transparency
CREATE TABLE IF NOT EXISTS tax_calculation_audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Reference to quote
    quote_id uuid REFERENCES quotes(id) ON DELETE CASCADE,
    
    -- Admin who made the change
    admin_id uuid REFERENCES profiles(id),
    
    -- Method selection details
    calculation_method TEXT NOT NULL CHECK (calculation_method IN ('auto', 'hsn_only', 'legacy_fallback', 'admin_choice')),
    valuation_method TEXT NOT NULL CHECK (valuation_method IN ('auto', 'actual_price', 'minimum_valuation', 'higher_of_both', 'per_item_choice')),
    
    -- Previous values (for audit trail)
    previous_calculation_method TEXT,
    previous_valuation_method TEXT,
    
    -- Change justification
    change_reason TEXT,
    change_details JSONB DEFAULT '{}'::jsonb,
    
    -- Per-item overrides (for per_item_choice mode)
    item_level_overrides JSONB DEFAULT '[]'::jsonb,
    
    -- Calculation results comparison
    calculation_comparison JSONB DEFAULT '{
        "hsn_result": null,
        "legacy_result": null,
        "selected_result": null,
        "variance_percentage": null
    }'::jsonb,
    
    -- Timestamps
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at timestamp with time zone -- For temporary overrides
);

-- 3. Create global_tax_method_preferences table for system-wide defaults
CREATE TABLE IF NOT EXISTS global_tax_method_preferences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Preference scope
    preference_scope TEXT NOT NULL CHECK (preference_scope IN ('system_default', 'country_specific', 'route_specific', 'admin_default')),
    scope_identifier TEXT, -- country code, route id, admin id, etc.
    
    -- Method preferences
    default_calculation_method TEXT NOT NULL DEFAULT 'auto' 
        CHECK (default_calculation_method IN ('auto', 'hsn_only', 'legacy_fallback')),
    default_valuation_method TEXT NOT NULL DEFAULT 'auto'
        CHECK (default_valuation_method IN ('auto', 'actual_price', 'minimum_valuation', 'higher_of_both')),
    
    -- Fallback configuration
    fallback_chain JSONB DEFAULT '[["hsn_only"], ["legacy_fallback"]]'::jsonb,
    
    -- Admin controls
    admin_id uuid REFERENCES profiles(id),
    is_active boolean DEFAULT true,
    
    -- Timestamps
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Unique constraint per scope
    UNIQUE(preference_scope, scope_identifier)
);

-- 4. Add enhanced operational_data structure to quotes (extend existing JSONB)
-- This will store per-quote admin overrides in the existing operational_data field
COMMENT ON COLUMN quotes.operational_data IS E'Enhanced operational data including:\n'
'- admin_overrides.tax_method_selection: { method: string, admin_id: uuid, timestamp: date, reason: string }\n'
'- admin_overrides.valuation_method_selection: { method: string, per_item_overrides: array, admin_id: uuid }\n'
'- tax_calculation_transparency: { method_used: string, fallback_reason: string, calculation_time: date }';

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_quotes_calculation_method ON quotes(calculation_method_preference);
CREATE INDEX IF NOT EXISTS idx_quotes_valuation_method ON quotes(valuation_method_preference);
CREATE INDEX IF NOT EXISTS idx_tax_audit_quote_id ON tax_calculation_audit_log(quote_id);
CREATE INDEX IF NOT EXISTS idx_tax_audit_admin_id ON tax_calculation_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_tax_audit_created_at ON tax_calculation_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_global_preferences_scope ON global_tax_method_preferences(preference_scope, scope_identifier);
CREATE INDEX IF NOT EXISTS idx_global_preferences_active ON global_tax_method_preferences(is_active);

-- 6. Create RLS policies for the new tables
ALTER TABLE tax_calculation_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_tax_method_preferences ENABLE ROW LEVEL SECURITY;

-- Tax calculation audit log policies (admin only)
DROP POLICY IF EXISTS "Admin access to tax audit log" ON tax_calculation_audit_log;
CREATE POLICY "Admin access to tax audit log" ON tax_calculation_audit_log
    FOR ALL USING (is_admin());

-- Global preferences policies (admin only)
DROP POLICY IF EXISTS "Admin access to global tax preferences" ON global_tax_method_preferences;
CREATE POLICY "Admin access to global tax preferences" ON global_tax_method_preferences
    FOR ALL USING (is_admin());

-- 7. Create helper functions for tax method selection

-- Function to get effective tax method for a quote
CREATE OR REPLACE FUNCTION get_effective_tax_method(quote_id_param uuid)
RETURNS TABLE(
    calculation_method text,
    valuation_method text,
    source text,
    confidence numeric
) AS $$
DECLARE
    quote_record quotes%ROWTYPE;
    global_prefs global_tax_method_preferences%ROWTYPE;
BEGIN
    -- Get quote details
    SELECT * INTO quote_record FROM quotes WHERE id = quote_id_param;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'legacy_fallback'::text, 'auto'::text, 'not_found'::text, 0.0::numeric;
        RETURN;
    END IF;
    
    -- Check for per-quote preferences first
    IF quote_record.calculation_method_preference != 'auto' THEN
        RETURN QUERY SELECT 
            quote_record.calculation_method_preference,
            quote_record.valuation_method_preference,
            'quote_specific'::text,
            1.0::numeric;
        RETURN;
    END IF;
    
    -- Check for country-specific preferences
    SELECT * INTO global_prefs 
    FROM global_tax_method_preferences 
    WHERE preference_scope = 'country_specific' 
      AND scope_identifier = quote_record.destination_country 
      AND is_active = true
    ORDER BY updated_at DESC 
    LIMIT 1;
    
    IF FOUND THEN
        RETURN QUERY SELECT 
            global_prefs.default_calculation_method,
            global_prefs.default_valuation_method,
            'country_specific'::text,
            0.8::numeric;
        RETURN;
    END IF;
    
    -- Fall back to system default
    SELECT * INTO global_prefs 
    FROM global_tax_method_preferences 
    WHERE preference_scope = 'system_default' 
      AND is_active = true
    ORDER BY updated_at DESC 
    LIMIT 1;
    
    IF FOUND THEN
        RETURN QUERY SELECT 
            global_prefs.default_calculation_method,
            global_prefs.default_valuation_method,
            'system_default'::text,
            0.6::numeric;
        RETURN;
    END IF;
    
    -- Ultimate fallback
    RETURN QUERY SELECT 'auto'::text, 'auto'::text, 'hardcoded_fallback'::text, 0.4::numeric;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log tax method changes
CREATE OR REPLACE FUNCTION log_tax_method_change(
    p_quote_id uuid,
    p_admin_id uuid,
    p_calculation_method text,
    p_valuation_method text,
    p_change_reason text DEFAULT NULL,
    p_change_details jsonb DEFAULT '{}'::jsonb
) RETURNS uuid AS $$
DECLARE
    log_id uuid;
    current_calc_method text;
    current_val_method text;
BEGIN
    -- Get current methods
    SELECT calculation_method_preference, valuation_method_preference 
    INTO current_calc_method, current_val_method
    FROM quotes WHERE id = p_quote_id;
    
    -- Insert audit log
    INSERT INTO tax_calculation_audit_log (
        quote_id,
        admin_id,
        calculation_method,
        valuation_method,
        previous_calculation_method,
        previous_valuation_method,
        change_reason,
        change_details
    ) VALUES (
        p_quote_id,
        p_admin_id,
        p_calculation_method,
        p_valuation_method,
        current_calc_method,
        current_val_method,
        p_change_reason,
        p_change_details
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Insert default system preferences
INSERT INTO global_tax_method_preferences (
    preference_scope,
    scope_identifier,
    default_calculation_method,
    default_valuation_method,
    fallback_chain,
    admin_id
) VALUES (
    'system_default',
    NULL,
    'auto',
    'auto',
    '[["hsn_only"], ["legacy_fallback"]]'::jsonb,
    NULL
) ON CONFLICT (preference_scope, scope_identifier) DO NOTHING;

-- 9. Create trigger for automatic audit logging
CREATE OR REPLACE FUNCTION trigger_tax_method_audit()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if tax method preferences actually changed
    IF (OLD.calculation_method_preference IS DISTINCT FROM NEW.calculation_method_preference) 
    OR (OLD.valuation_method_preference IS DISTINCT FROM NEW.valuation_method_preference) THEN
        
        INSERT INTO tax_calculation_audit_log (
            quote_id,
            calculation_method,
            valuation_method,
            previous_calculation_method,
            previous_valuation_method,
            change_reason,
            change_details
        ) VALUES (
            NEW.id,
            NEW.calculation_method_preference,
            NEW.valuation_method_preference,
            OLD.calculation_method_preference,
            OLD.valuation_method_preference,
            'automatic_update',
            jsonb_build_object(
                'trigger', 'quote_update',
                'timestamp', now(),
                'auto_logged', true
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS tax_method_audit_trigger ON quotes;
CREATE TRIGGER tax_method_audit_trigger
    AFTER UPDATE ON quotes
    FOR EACH ROW
    EXECUTE FUNCTION trigger_tax_method_audit();

-- Commit transaction
COMMIT;

-- Report results
DO $$
DECLARE
    quotes_count INTEGER;
    audit_table_exists BOOLEAN;
    global_prefs_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO quotes_count FROM quotes;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'tax_calculation_audit_log'
    ) INTO audit_table_exists;
    
    SELECT COUNT(*) INTO global_prefs_count FROM global_tax_method_preferences;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '2-TIER TAX SYSTEM SCHEMA SETUP COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Enhanced % quotes with tax method preferences', quotes_count;
    RAISE NOTICE 'Tax audit log table created: %', CASE WHEN audit_table_exists THEN 'YES' ELSE 'NO' END;
    RAISE NOTICE 'Global preferences configured: %', global_prefs_count;
    RAISE NOTICE 'Helper functions created for method selection';
    RAISE NOTICE 'RLS policies and triggers activated';
    RAISE NOTICE '========================================';
END $$;