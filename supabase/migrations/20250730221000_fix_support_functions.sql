-- Fix support ticket function creation
-- Create the function with proper parameter defaults

CREATE OR REPLACE FUNCTION create_support_ticket(
    p_user_id UUID,
    p_quote_id UUID,
    p_subject TEXT,
    p_description TEXT,
    p_priority TEXT,
    p_category TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_ticket_id UUID;
    v_ticket_data JSONB;
    v_sla_data JSONB;
    v_priority TEXT := COALESCE(p_priority, 'medium');
    v_category TEXT := COALESCE(p_category, 'general');
BEGIN
    -- Validate input parameters
    IF p_user_id IS NULL OR p_subject IS NULL OR p_description IS NULL THEN
        RAISE EXCEPTION 'Required parameters cannot be null';
    END IF;

    -- Validate priority
    IF v_priority NOT IN ('low', 'medium', 'high', 'urgent') THEN
        v_priority := 'medium';
    END IF;

    -- Validate category
    IF v_category NOT IN ('general', 'payment', 'shipping', 'refund', 'product', 'customs') THEN
        v_category := 'general';
    END IF;

    -- Generate ticket ID
    v_ticket_id := gen_random_uuid();

    -- Build ticket data
    v_ticket_data := jsonb_build_object(
        'subject', p_subject,
        'description', p_description,
        'status', 'open',
        'priority', v_priority,
        'category', v_category,
        'assigned_to', NULL,
        'metadata', jsonb_build_object(
            'created_at', NOW(),
            'source', 'web'
        )
    );

    -- Build SLA data based on priority
    v_sla_data := jsonb_build_object(
        'response_sla', jsonb_build_object(
            'target_minutes', CASE v_priority
                WHEN 'urgent' THEN 30
                WHEN 'high' THEN 120
                WHEN 'medium' THEN 240
                ELSE 480
            END,
            'first_response_at', NULL,
            'is_breached', false,
            'breach_duration', NULL
        ),
        'resolution_sla', jsonb_build_object(
            'target_hours', CASE v_priority
                WHEN 'urgent' THEN 2
                WHEN 'high' THEN 8
                WHEN 'medium' THEN 24
                ELSE 48
            END,
            'resolved_at', NULL,
            'is_breached', false,
            'breach_duration', NULL
        )
    );

    -- Insert the support ticket
    INSERT INTO support_system (
        id,
        user_id,
        quote_id,
        system_type,
        ticket_data,
        sla_data,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        v_ticket_id,
        p_user_id,
        p_quote_id,
        'ticket',
        v_ticket_data,
        v_sla_data,
        true,
        NOW(),
        NOW()
    );

    RETURN v_ticket_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_support_ticket TO authenticated;