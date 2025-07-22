-- Migration: Add Missing Support Functions
-- This migration adds the missing support functions that should have been created

-- ============================================================================
-- Function to create support ticket
-- ============================================================================
CREATE OR REPLACE FUNCTION create_support_ticket(
    p_user_id UUID,
    p_quote_id UUID DEFAULT NULL,
    p_subject TEXT,
    p_description TEXT,
    p_priority VARCHAR DEFAULT 'medium',
    p_category VARCHAR DEFAULT 'general'
)
RETURNS UUID AS $$
DECLARE
    ticket_id UUID;
BEGIN
    INSERT INTO support_system (
        user_id,
        quote_id,
        system_type,
        ticket_data,
        sla_data
    ) VALUES (
        p_user_id,
        p_quote_id,
        'ticket',
        jsonb_build_object(
            'subject', p_subject,
            'description', p_description,
            'status', 'open',
            'priority', p_priority,
            'category', p_category,
            'metadata', jsonb_build_object(
                'created_at', now(),
                'source', 'api'
            )
        ),
        jsonb_build_object(
            'response_sla', jsonb_build_object(
                'target_minutes', CASE p_priority
                    WHEN 'urgent' THEN 30
                    WHEN 'high' THEN 120
                    WHEN 'medium' THEN 480
                    ELSE 1440
                END,
                'is_breached', false
            ),
            'resolution_sla', jsonb_build_object(
                'target_hours', CASE p_priority
                    WHEN 'urgent' THEN 4
                    WHEN 'high' THEN 24
                    WHEN 'medium' THEN 72
                    ELSE 168
                END,
                'is_breached', false
            )
        )
    ) RETURNING id INTO ticket_id;
    
    RETURN ticket_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Function to update support ticket status
-- ============================================================================
CREATE OR REPLACE FUNCTION update_support_ticket_status(
    p_support_id UUID,
    p_new_status VARCHAR,
    p_user_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    old_status VARCHAR;
    success BOOLEAN DEFAULT false;
BEGIN
    -- Get current status
    SELECT ticket_data->>'status' INTO old_status
    FROM support_system 
    WHERE id = p_support_id AND system_type = 'ticket';
    
    -- Update the ticket status
    UPDATE support_system 
    SET 
        ticket_data = jsonb_set(
            jsonb_set(ticket_data, '{status}', to_jsonb(p_new_status)),
            '{metadata,last_status_change}', to_jsonb(now())
        ),
        updated_at = now()
    WHERE id = p_support_id AND system_type = 'ticket';
    
    GET DIAGNOSTICS success = FOUND;
    
    -- Log the status change if successful and status actually changed
    IF success AND old_status != p_new_status THEN
        PERFORM add_support_interaction(
            p_support_id,
            p_user_id,
            'status_change',
            jsonb_build_object(
                'from_status', old_status,
                'to_status', p_new_status,
                'reason', COALESCE(p_reason, 'Status updated'),
                'automatic', false
            ),
            false
        );
    END IF;
    
    RETURN success;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Additional Configuration Functions
-- ============================================================================

-- Function to get country configuration
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
-- Comments for Documentation
-- ============================================================================

COMMENT ON FUNCTION create_support_ticket IS 'Creates a new support ticket with automatic SLA setup';
COMMENT ON FUNCTION update_support_ticket_status IS 'Updates support ticket status with automatic interaction logging';
COMMENT ON FUNCTION get_country_config IS 'Gets country-specific configuration';
COMMENT ON FUNCTION get_calculation_defaults IS 'Gets calculation default values';
COMMENT ON FUNCTION get_active_gateways IS 'Gets active payment gateways for country';
COMMENT ON FUNCTION get_templates IS 'Gets templates by type';