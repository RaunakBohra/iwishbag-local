-- Migration: Unified Support System
-- This migration creates a unified support system to replace the fragmented approach
-- Consolidates: support_tickets, auto_assignment_rules, sla_breaches, ticket_notification_preferences, reply_templates

-- ============================================================================
-- Step 1: Create Unified Support System Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS support_system (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
    
    -- System Type: 'ticket', 'rule', 'template', 'preference'
    system_type VARCHAR(20) NOT NULL CHECK (system_type IN ('ticket', 'rule', 'template', 'preference')),
    
    -- Main ticket data (for type = 'ticket')
    ticket_data JSONB DEFAULT '{}',
    /*
    ticket_data structure:
    {
      "subject": "string",
      "description": "string", 
      "status": "open|in_progress|resolved|closed",
      "priority": "low|medium|high|urgent",
      "category": "general|payment|shipping|refund|product|customs",
      "assigned_to": "uuid",
      "metadata": {
        "first_response_at": "timestamp",
        "resolution_time": number,
        "customer_satisfaction": number
      }
    }
    */
    
    -- Auto-assignment rules (for type = 'rule')
    assignment_data JSONB DEFAULT '{}',
    /*
    assignment_data structure:
    {
      "rule_name": "string",
      "conditions": {
        "category": ["general", "payment"],
        "priority": ["high", "urgent"],
        "keywords": ["refund", "payment"],
        "business_hours_only": boolean
      },
      "assignment": {
        "assignee_id": "uuid",
        "team": "string"
      },
      "is_active": boolean
    }
    */
    
    -- SLA tracking and breach data (for type = 'ticket')
    sla_data JSONB DEFAULT '{}',
    /*
    sla_data structure:
    {
      "response_sla": {
        "target_minutes": number,
        "first_response_at": "timestamp",
        "is_breached": boolean,
        "breach_duration": number
      },
      "resolution_sla": {
        "target_hours": number,
        "resolved_at": "timestamp", 
        "is_breached": boolean,
        "breach_duration": number
      },
      "escalation": {
        "escalated_at": "timestamp",
        "escalated_to": "uuid",
        "reason": "string"
      }
    }
    */
    
    -- Notification preferences (for type = 'preference')
    notification_prefs JSONB DEFAULT '{}',
    /*
    notification_prefs structure:
    {
      "email_notifications": boolean,
      "sms_notifications": boolean,
      "in_app_notifications": boolean,
      "notification_frequency": "immediate|hourly|daily",
      "categories": ["general", "payment", "shipping"],
      "escalation_notifications": boolean
    }
    */
    
    -- Template data (for type = 'template')
    template_data JSONB DEFAULT '{}',
    /*
    template_data structure:
    {
      "name": "string",
      "subject": "string",
      "content": "string",
      "category": "string",
      "variables": ["customer_name", "order_id"],
      "is_active": boolean,
      "usage_count": number
    }
    */
    
    -- Common fields
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Ensure proper data structure based on type
    CONSTRAINT valid_ticket_data CHECK (
        system_type != 'ticket' OR (
            ticket_data ? 'subject' AND 
            ticket_data ? 'description' AND
            ticket_data ? 'status'
        )
    ),
    CONSTRAINT valid_assignment_data CHECK (
        system_type != 'rule' OR (
            assignment_data ? 'rule_name' AND
            assignment_data ? 'conditions'
        )
    ),
    CONSTRAINT valid_template_data CHECK (
        system_type != 'template' OR (
            template_data ? 'name' AND
            template_data ? 'content'
        )
    )
);

-- ============================================================================
-- Step 2: Create Unified Support Interactions Table 
-- ============================================================================
CREATE TABLE IF NOT EXISTS support_interactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    support_id UUID REFERENCES support_system(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Interaction Type: 'reply', 'status_change', 'assignment', 'escalation', 'note'
    interaction_type VARCHAR(20) NOT NULL CHECK (interaction_type IN ('reply', 'status_change', 'assignment', 'escalation', 'note')),
    
    -- Unified content structure
    content JSONB NOT NULL DEFAULT '{}',
    /*
    content structure varies by type:
    
    For 'reply':
    {
      "message": "string",
      "attachments": [{"name": "string", "url": "string", "size": number}],
      "is_internal": boolean,
      "reply_to": "uuid"
    }
    
    For 'status_change':
    {
      "from_status": "string",
      "to_status": "string", 
      "reason": "string",
      "automatic": boolean
    }
    
    For 'assignment':
    {
      "from_user": "uuid",
      "to_user": "uuid",
      "reason": "string",
      "automatic": boolean
    }
    
    For 'escalation':
    {
      "escalated_to": "uuid",
      "reason": "string",
      "urgency_level": "string"
    }
    
    For 'note':
    {
      "note": "string",
      "internal": boolean,
      "tags": ["string"]
    }
    */
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    is_internal BOOLEAN DEFAULT false,
    
    -- Ensure content has required fields based on type
    CONSTRAINT valid_reply_content CHECK (
        interaction_type != 'reply' OR content ? 'message'
    ),
    CONSTRAINT valid_status_change_content CHECK (
        interaction_type != 'status_change' OR (
            content ? 'from_status' AND content ? 'to_status'
        )
    ),
    CONSTRAINT valid_assignment_content CHECK (
        interaction_type != 'assignment' OR content ? 'to_user'
    )
);

-- ============================================================================
-- Step 3: Create Indexes for Performance
-- ============================================================================

-- Support System Indexes
CREATE INDEX IF NOT EXISTS idx_support_system_user_id ON support_system(user_id);
CREATE INDEX IF NOT EXISTS idx_support_system_quote_id ON support_system(quote_id) WHERE quote_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_support_system_type ON support_system(system_type);
CREATE INDEX IF NOT EXISTS idx_support_system_active ON support_system(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_support_system_created_at ON support_system(created_at);

-- JSONB Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_support_system_ticket_status ON support_system USING gin ((ticket_data->'status')) WHERE system_type = 'ticket';
CREATE INDEX IF NOT EXISTS idx_support_system_ticket_priority ON support_system USING gin ((ticket_data->'priority')) WHERE system_type = 'ticket';
CREATE INDEX IF NOT EXISTS idx_support_system_ticket_category ON support_system USING gin ((ticket_data->'category')) WHERE system_type = 'ticket';
CREATE INDEX IF NOT EXISTS idx_support_system_ticket_assigned_to ON support_system USING gin ((ticket_data->'assigned_to')) WHERE system_type = 'ticket';

-- Support Interactions Indexes  
CREATE INDEX IF NOT EXISTS idx_support_interactions_support_id ON support_interactions(support_id);
CREATE INDEX IF NOT EXISTS idx_support_interactions_user_id ON support_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_support_interactions_type ON support_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_support_interactions_created_at ON support_interactions(created_at);
CREATE INDEX IF NOT EXISTS idx_support_interactions_internal ON support_interactions(is_internal);

-- ============================================================================
-- Step 4: Create Helper Functions
-- ============================================================================

-- Function to create a new support ticket
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

-- Function to add interaction to support ticket
CREATE OR REPLACE FUNCTION add_support_interaction(
    p_support_id UUID,
    p_user_id UUID,
    p_interaction_type VARCHAR,
    p_content JSONB,
    p_is_internal BOOLEAN DEFAULT false
)
RETURNS UUID AS $$
DECLARE
    interaction_id UUID;
BEGIN
    INSERT INTO support_interactions (
        support_id,
        user_id,
        interaction_type,
        content,
        is_internal,
        metadata
    ) VALUES (
        p_support_id,
        p_user_id,
        p_interaction_type,
        p_content,
        p_is_internal,
        jsonb_build_object(
            'timestamp', now(),
            'user_agent', current_setting('request.headers', true)::json->>'user-agent'
        )
    ) RETURNING id INTO interaction_id;
    
    -- Update the support system's updated_at timestamp
    UPDATE support_system 
    SET updated_at = now() 
    WHERE id = p_support_id;
    
    RETURN interaction_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update ticket status with automatic interaction logging
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
    
    -- Log the status change
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
-- Step 5: Create RLS Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE support_system ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_interactions ENABLE ROW LEVEL SECURITY;

-- Support System Policies (with conditional creation)
DO $$
BEGIN
    -- Create policies only if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'support_system' 
        AND policyname = 'Users can view their own support records'
    ) THEN
        CREATE POLICY "Users can view their own support records" ON support_system
            FOR SELECT USING (user_id = auth.uid());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'support_system' 
        AND policyname = 'Admins can view all support records'
    ) THEN
        CREATE POLICY "Admins can view all support records" ON support_system  
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM user_roles 
                    WHERE user_id = auth.uid() AND role = 'admin'
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'support_system' 
        AND policyname = 'Users can create their own support records'
    ) THEN
        CREATE POLICY "Users can create their own support records" ON support_system
            FOR INSERT WITH CHECK (user_id = auth.uid());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'support_system' 
        AND policyname = 'Admins can create any support records'
    ) THEN
        CREATE POLICY "Admins can create any support records" ON support_system
            FOR INSERT WITH CHECK (
                EXISTS (
                    SELECT 1 FROM user_roles 
                    WHERE user_id = auth.uid() AND role = 'admin'
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'support_system' 
        AND policyname = 'Users can update their own support records'
    ) THEN
        CREATE POLICY "Users can update their own support records" ON support_system
            FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'support_system' 
        AND policyname = 'Admins can update any support records'
    ) THEN
        CREATE POLICY "Admins can update any support records" ON support_system
            FOR UPDATE USING (
                EXISTS (
                    SELECT 1 FROM user_roles 
                    WHERE user_id = auth.uid() AND role = 'admin'
                )
            ) WITH CHECK (
                EXISTS (
                    SELECT 1 FROM user_roles 
                    WHERE user_id = auth.uid() AND role = 'admin'
                )
            );
    END IF;

    -- Support Interactions Policies
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'support_interactions' 
        AND policyname = 'Users can view interactions for their support records'
    ) THEN
        CREATE POLICY "Users can view interactions for their support records" ON support_interactions
            FOR SELECT USING (
                user_id = auth.uid() OR 
                EXISTS (
                    SELECT 1 FROM support_system 
                    WHERE id = support_interactions.support_id 
                    AND user_id = auth.uid()
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'support_interactions' 
        AND policyname = 'Admins can view all support interactions'
    ) THEN
        CREATE POLICY "Admins can view all support interactions" ON support_interactions
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM user_roles 
                    WHERE user_id = auth.uid() AND role = 'admin'
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'support_interactions' 
        AND policyname = 'Users can create interactions for their support records'
    ) THEN
        CREATE POLICY "Users can create interactions for their support records" ON support_interactions
            FOR INSERT WITH CHECK (
                user_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM support_system 
                    WHERE id = support_interactions.support_id 
                    AND user_id = auth.uid()
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'support_interactions' 
        AND policyname = 'Admins can create any support interactions'
    ) THEN
        CREATE POLICY "Admins can create any support interactions" ON support_interactions
            FOR INSERT WITH CHECK (
                EXISTS (
                    SELECT 1 FROM user_roles 
                    WHERE user_id = auth.uid() AND role = 'admin'
                )
            );
    END IF;
END $$;

-- ============================================================================
-- Step 6: Create Views for Backward Compatibility
-- ============================================================================

-- View to mimic the old support_tickets table structure
CREATE VIEW support_tickets_view AS
SELECT 
    id,
    user_id,
    quote_id,
    ticket_data->>'subject' as subject,
    ticket_data->>'description' as description,
    ticket_data->>'status' as status,
    ticket_data->>'priority' as priority,
    ticket_data->>'category' as category,
    (ticket_data->>'assigned_to')::uuid as assigned_to,
    created_at,
    updated_at,
    is_active
FROM support_system 
WHERE system_type = 'ticket';

-- View to mimic the old ticket_replies table structure  
CREATE VIEW ticket_replies_view AS
SELECT 
    si.id,
    si.support_id as ticket_id,
    si.user_id,
    si.content->>'message' as message,
    si.is_internal,
    si.created_at
FROM support_interactions si
WHERE si.interaction_type = 'reply';

-- ============================================================================
-- Step 7: Create Triggers for Data Integrity
-- ============================================================================

-- Trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_support_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_support_system_updated_at
    BEFORE UPDATE ON support_system
    FOR EACH ROW
    EXECUTE FUNCTION update_support_updated_at();

-- ============================================================================
-- Step 8: Add Comments for Documentation
-- ============================================================================

COMMENT ON TABLE support_system IS 'Unified support system consolidating tickets, rules, templates, and preferences';
COMMENT ON TABLE support_interactions IS 'All interactions and communications related to support records';

COMMENT ON COLUMN support_system.system_type IS 'Type of support record: ticket, rule, template, preference';
COMMENT ON COLUMN support_system.ticket_data IS 'Main ticket information including status, priority, category, and metadata';
COMMENT ON COLUMN support_system.assignment_data IS 'Auto-assignment rules and conditions';
COMMENT ON COLUMN support_system.sla_data IS 'SLA tracking information including response and resolution times';
COMMENT ON COLUMN support_system.notification_prefs IS 'User notification preferences and settings';
COMMENT ON COLUMN support_system.template_data IS 'Reply templates and their configurations';

COMMENT ON COLUMN support_interactions.interaction_type IS 'Type of interaction: reply, status_change, assignment, escalation, note';
COMMENT ON COLUMN support_interactions.content IS 'Interaction content structure varies by type';
COMMENT ON COLUMN support_interactions.is_internal IS 'Whether this interaction is visible to customers';