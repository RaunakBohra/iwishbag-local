-- ============================================================================
-- CREATE MISSING SUPPORT TICKET RPC FUNCTIONS
-- Fixes 404 error when creating support tickets
-- ============================================================================

-- Create support_system table if it doesn't exist
CREATE TABLE IF NOT EXISTS support_system (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
    system_type TEXT NOT NULL CHECK (system_type IN ('ticket', 'rule', 'template', 'preference')),
    ticket_data JSONB,
    assignment_data JSONB,
    sla_data JSONB,
    notification_prefs JSONB,
    template_data JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create support_interactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS support_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    support_id UUID NOT NULL REFERENCES support_system(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL CHECK (interaction_type IN ('reply', 'status_change', 'assignment', 'escalation', 'note')),
    content JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    is_internal BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE support_system ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_interactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support_system
CREATE POLICY "Users can view their own tickets" ON support_system
    FOR SELECT USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can create their own tickets" ON support_system
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all tickets" ON support_system
    FOR ALL USING (is_admin());

-- RLS Policies for support_interactions
CREATE POLICY "Users can view their ticket interactions" ON support_interactions
    FOR SELECT USING (
        auth.uid() = user_id OR 
        is_admin() OR 
        EXISTS (
            SELECT 1 FROM support_system 
            WHERE support_system.id = support_interactions.support_id 
            AND support_system.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create interactions on their tickets" ON support_interactions
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR
        is_admin() OR
        EXISTS (
            SELECT 1 FROM support_system 
            WHERE support_system.id = support_interactions.support_id 
            AND support_system.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage all interactions" ON support_interactions
    FOR ALL USING (is_admin());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_support_system_user_id ON support_system(user_id);
CREATE INDEX IF NOT EXISTS idx_support_system_type ON support_system(system_type);
CREATE INDEX IF NOT EXISTS idx_support_system_created_at ON support_system(created_at);
CREATE INDEX IF NOT EXISTS idx_support_interactions_support_id ON support_interactions(support_id);
CREATE INDEX IF NOT EXISTS idx_support_interactions_created_at ON support_interactions(created_at);

-- ============================================================================
-- CREATE SUPPORT TICKET RPC FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION create_support_ticket(
    p_user_id UUID,
    p_quote_id UUID DEFAULT NULL,
    p_subject TEXT,
    p_description TEXT,
    p_priority TEXT DEFAULT 'medium',
    p_category TEXT DEFAULT 'general'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_ticket_id UUID;
    v_ticket_data JSONB;
    v_sla_data JSONB;
BEGIN
    -- Validate input parameters
    IF p_user_id IS NULL OR p_subject IS NULL OR p_description IS NULL THEN
        RAISE EXCEPTION 'Required parameters cannot be null';
    END IF;

    -- Validate priority
    IF p_priority NOT IN ('low', 'medium', 'high', 'urgent') THEN
        p_priority := 'medium';
    END IF;

    -- Validate category
    IF p_category NOT IN ('general', 'payment', 'shipping', 'refund', 'product', 'customs') THEN
        p_category := 'general';
    END IF;

    -- Generate ticket ID
    v_ticket_id := gen_random_uuid();

    -- Build ticket data
    v_ticket_data := jsonb_build_object(
        'subject', p_subject,
        'description', p_description,
        'status', 'open',
        'priority', p_priority,
        'category', p_category,
        'assigned_to', NULL,
        'metadata', jsonb_build_object(
            'created_at', NOW(),
            'source', 'web'
        )
    );

    -- Build SLA data based on priority
    v_sla_data := jsonb_build_object(
        'response_sla', jsonb_build_object(
            'target_minutes', CASE p_priority
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
            'target_hours', CASE p_priority
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

    -- Log ticket creation as initial interaction
    INSERT INTO support_interactions (
        support_id,
        user_id,
        interaction_type,
        content,
        metadata,
        is_internal,
        created_at
    ) VALUES (
        v_ticket_id,
        p_user_id,
        'note',
        jsonb_build_object(
            'message', 'Ticket created',
            'subject', p_subject,
            'description', p_description
        ),
        jsonb_build_object(
            'auto_generated', true,
            'priority', p_priority,
            'category', p_category
        ),
        true,
        NOW()
    );

    RETURN v_ticket_id;
END;
$$;

-- ============================================================================
-- UPDATE SUPPORT TICKET STATUS RPC FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION update_support_ticket_status(
    p_support_id UUID,
    p_new_status TEXT,
    p_user_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_ticket_data JSONB;
    v_updated_ticket_data JSONB;
BEGIN
    -- Validate status
    IF p_new_status NOT IN ('open', 'in_progress', 'pending', 'resolved', 'closed') THEN
        RAISE EXCEPTION 'Invalid status: %', p_new_status;
    END IF;

    -- Get current ticket data
    SELECT ticket_data INTO v_current_ticket_data
    FROM support_system
    WHERE id = p_support_id AND system_type = 'ticket';

    IF v_current_ticket_data IS NULL THEN
        RAISE EXCEPTION 'Ticket not found: %', p_support_id;
    END IF;

    -- Update ticket data with new status
    v_updated_ticket_data := jsonb_set(
        v_current_ticket_data,
        '{status}',
        to_jsonb(p_new_status)
    );

    -- Add status change metadata
    v_updated_ticket_data := jsonb_set(
        v_updated_ticket_data,
        '{metadata,last_status_change}',
        to_jsonb(NOW())
    );

    -- Update the ticket
    UPDATE support_system
    SET 
        ticket_data = v_updated_ticket_data,
        updated_at = NOW()
    WHERE id = p_support_id;

    -- Log status change interaction
    INSERT INTO support_interactions (
        support_id,
        user_id,
        interaction_type,
        content,
        metadata,
        is_internal,
        created_at
    ) VALUES (
        p_support_id,
        p_user_id,
        'status_change',
        jsonb_build_object(
            'old_status', v_current_ticket_data->>'status',
            'new_status', p_new_status,
            'reason', COALESCE(p_reason, 'Status updated')
        ),
        jsonb_build_object(
            'auto_generated', false,
            'changed_by', p_user_id
        ),
        true,
        NOW()
    );

    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to update ticket status: %', SQLERRM;
END;
$$;

-- ============================================================================
-- ADD SUPPORT INTERACTION RPC FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION add_support_interaction(
    p_support_id UUID,
    p_user_id UUID,
    p_interaction_type TEXT,
    p_content JSONB,
    p_is_internal BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_interaction_id UUID;
BEGIN
    -- Validate interaction type
    IF p_interaction_type NOT IN ('reply', 'status_change', 'assignment', 'escalation', 'note') THEN
        RAISE EXCEPTION 'Invalid interaction type: %', p_interaction_type;
    END IF;

    -- Generate interaction ID
    v_interaction_id := gen_random_uuid();

    -- Insert the interaction
    INSERT INTO support_interactions (
        id,
        support_id,
        user_id,
        interaction_type,
        content,
        metadata,
        is_internal,
        created_at
    ) VALUES (
        v_interaction_id,
        p_support_id,
        p_user_id,
        p_interaction_type,
        p_content,
        jsonb_build_object(
            'created_by', p_user_id,
            'timestamp', NOW()
        ),
        p_is_internal,
        NOW()
    );

    -- Update ticket's updated_at timestamp
    UPDATE support_system
    SET updated_at = NOW()
    WHERE id = p_support_id;

    RETURN v_interaction_id;
END;
$$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION create_support_ticket TO authenticated;
GRANT EXECUTE ON FUNCTION update_support_ticket_status TO authenticated;
GRANT EXECUTE ON FUNCTION add_support_interaction TO authenticated;

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE ON support_system TO authenticated;
GRANT SELECT, INSERT, UPDATE ON support_interactions TO authenticated;

-- Create updated_at trigger for support_system
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_support_system_updated_at ON support_system;
CREATE TRIGGER update_support_system_updated_at
    BEFORE UPDATE ON support_system
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON FUNCTION create_support_ticket IS 'Creates a new support ticket with proper SLA tracking';
COMMENT ON FUNCTION update_support_ticket_status IS 'Updates support ticket status with validation and logging';
COMMENT ON FUNCTION add_support_interaction IS 'Adds an interaction (reply, note, etc.) to a support ticket';