-- Migration: Consolidate Feature-Specific Tables
-- This migration consolidates remaining feature-specific tables into unified structures
-- Target: share_audit_log, webhook_logs, status_transitions, fallback_usage_logs -> unified_audit_log

-- ============================================================================
-- Step 1: Create Unified Audit Log Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS unified_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Entity information
    entity_type VARCHAR(50) NOT NULL, -- 'quote', 'ticket', 'user', 'system', 'payment', 'webhook'
    entity_id UUID, -- Can be NULL for system-wide events
    
    -- Action information
    action VARCHAR(100) NOT NULL, -- 'created', 'updated', 'deleted', 'status_changed', etc.
    action_category VARCHAR(50) NOT NULL, -- 'quote_management', 'support', 'payment', 'system', 'webhook'
    
    -- User and session information
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    
    -- Action details (JSONB for flexibility)
    action_data JSONB NOT NULL DEFAULT '{}',
    /*
    action_data structure varies by action_category:
    
    For 'quote_management':
    {
      "quote_id": "uuid",
      "old_status": "pending",
      "new_status": "approved", 
      "changes": {"field": "old_value -> new_value"},
      "reason": "Customer approved via email",
      "automatic": false
    }
    
    For 'support':
    {
      "ticket_id": "uuid",
      "interaction_type": "reply|status_change|assignment",
      "old_value": "previous_state",
      "new_value": "new_state",
      "message": "User message or system note"
    }
    
    For 'payment':
    {
      "transaction_id": "uuid",
      "payment_method": "stripe",
      "amount": 100.00,
      "currency": "USD",
      "status": "completed",
      "gateway_response": {}
    }
    
    For 'webhook':
    {
      "webhook_url": "https://example.com/webhook",
      "webhook_type": "payment|quote|support",
      "payload": {},
      "response_code": 200,
      "response_body": "OK",
      "retry_count": 0,
      "success": true
    }
    
    For 'system':
    {
      "component": "quote_calculator",
      "operation": "fallback_used",
      "fallback_type": "exchange_rate|shipping_cost",
      "original_value": 1.0,
      "fallback_value": 1.05,
      "reason": "API timeout"
    }
    
    For 'share':
    {
      "share_type": "quote|ticket",
      "share_method": "email|link|api",
      "recipient": "customer@example.com",
      "verification_required": true,
      "verification_token": "token123",
      "viewed": true,
      "view_duration": 300
    }
    */
    
    -- Metadata and tracking
    metadata JSONB DEFAULT '{}',
    severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),
    
    -- Timing
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Indexing helpers
    search_terms TSVECTOR, -- For full-text search
    
    -- Constraints
    CHECK (entity_type IS NOT NULL),
    CHECK (action IS NOT NULL),
    CHECK (action_category IS NOT NULL)
);

-- ============================================================================
-- Step 2: Create Indexes for Performance
-- ============================================================================

-- Primary indexes
CREATE INDEX IF NOT EXISTS idx_unified_audit_entity ON unified_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_unified_audit_user ON unified_audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_unified_audit_action ON unified_audit_log(action_category, action);
CREATE INDEX IF NOT EXISTS idx_unified_audit_created_at ON unified_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_unified_audit_severity ON unified_audit_log(severity, created_at DESC);

-- JSONB indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_unified_audit_action_data ON unified_audit_log USING gin (action_data);
CREATE INDEX IF NOT EXISTS idx_unified_audit_metadata ON unified_audit_log USING gin (metadata);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_unified_audit_entity_action ON unified_audit_log(entity_type, action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_unified_audit_user_entity ON unified_audit_log(user_id, entity_type, created_at DESC);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_unified_audit_search ON unified_audit_log USING gin (search_terms);

-- ============================================================================
-- Step 3: Create Helper Functions
-- ============================================================================

-- Function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
    p_entity_type VARCHAR,
    p_entity_id UUID,
    p_action VARCHAR,
    p_action_category VARCHAR,
    p_action_data JSONB DEFAULT '{}',
    p_user_id UUID DEFAULT NULL,
    p_session_id VARCHAR DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}',
    p_severity VARCHAR DEFAULT 'info'
)
RETURNS UUID AS $$
DECLARE
    audit_id UUID;
    search_text TEXT;
BEGIN
    -- Build search terms from action data
    search_text := p_action || ' ' || p_action_category || ' ' || COALESCE(p_action_data::text, '');
    
    INSERT INTO unified_audit_log (
        entity_type,
        entity_id,
        action,
        action_category,
        user_id,
        session_id,
        ip_address,
        user_agent,
        action_data,
        metadata,
        severity,
        search_terms
    ) VALUES (
        p_entity_type,
        p_entity_id,
        p_action,
        p_action_category,
        COALESCE(p_user_id, auth.uid()),
        p_session_id,
        p_ip_address,
        p_user_agent,
        p_action_data,
        p_metadata,
        p_severity,
        to_tsvector('english', search_text)
    ) RETURNING id INTO audit_id;
    
    RETURN audit_id;
END;
$$ LANGUAGE plpgsql;

-- Function to log quote status changes
CREATE OR REPLACE FUNCTION log_quote_status_change(
    p_quote_id UUID,
    p_old_status VARCHAR,
    p_new_status VARCHAR,
    p_reason TEXT DEFAULT NULL,
    p_automatic BOOLEAN DEFAULT FALSE
)
RETURNS UUID AS $$
BEGIN
    RETURN log_audit_event(
        'quote',
        p_quote_id,
        'status_changed',
        'quote_management',
        jsonb_build_object(
            'old_status', p_old_status,
            'new_status', p_new_status,
            'reason', p_reason,
            'automatic', p_automatic,
            'timestamp', now()
        ),
        null, -- Will use auth.uid()
        null, -- session_id
        null, -- ip_address
        null, -- user_agent  
        jsonb_build_object(
            'quote_id', p_quote_id,
            'change_type', 'status'
        ),
        'info'
    );
END;
$$ LANGUAGE plpgsql;

-- Function to log webhook events
CREATE OR REPLACE FUNCTION log_webhook_event(
    p_webhook_url TEXT,
    p_webhook_type VARCHAR,
    p_payload JSONB,
    p_response_code INTEGER,
    p_response_body TEXT,
    p_retry_count INTEGER DEFAULT 0,
    p_success BOOLEAN DEFAULT TRUE
)
RETURNS UUID AS $$
BEGIN
    RETURN log_audit_event(
        'webhook',
        NULL, -- No specific entity
        CASE WHEN p_success THEN 'webhook_success' ELSE 'webhook_failed' END,
        'webhook',
        jsonb_build_object(
            'webhook_url', p_webhook_url,
            'webhook_type', p_webhook_type,
            'payload', p_payload,
            'response_code', p_response_code,
            'response_body', LEFT(p_response_body, 1000), -- Limit response body size
            'retry_count', p_retry_count,
            'success', p_success
        ),
        null, -- System user
        null,
        null,
        null,
        jsonb_build_object(
            'webhook_type', p_webhook_type,
            'response_code', p_response_code
        ),
        CASE WHEN p_success THEN 'info' ELSE 'error' END
    );
END;
$$ LANGUAGE plpgsql;

-- Function to log system fallback usage
CREATE OR REPLACE FUNCTION log_system_fallback(
    p_component VARCHAR,
    p_operation VARCHAR,
    p_fallback_type VARCHAR,
    p_original_value JSONB,
    p_fallback_value JSONB,
    p_reason TEXT
)
RETURNS UUID AS $$
BEGIN
    RETURN log_audit_event(
        'system',
        NULL,
        'fallback_used',
        'system',
        jsonb_build_object(
            'component', p_component,
            'operation', p_operation,
            'fallback_type', p_fallback_type,
            'original_value', p_original_value,
            'fallback_value', p_fallback_value,
            'reason', p_reason,
            'timestamp', now()
        ),
        null,
        null,
        null,
        null,
        jsonb_build_object(
            'component', p_component,
            'fallback_type', p_fallback_type
        ),
        'warning'
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Step 4: Migrate Existing Audit Data
-- ============================================================================

-- Migrate share_audit_log to unified_audit_log
INSERT INTO unified_audit_log (
    entity_type,
    entity_id,
    action,
    action_category,
    user_id,
    ip_address,
    user_agent,
    action_data,
    metadata,
    severity,
    created_at,
    search_terms
)
SELECT 
    'quote' as entity_type,
    quote_id as entity_id,
    action,
    'share' as action_category,
    user_id,
    ip_address,
    user_agent,
    jsonb_build_object(
        'share_action', action,
        'details', COALESCE(details, '{}'),
        'original_table', 'share_audit_log'
    ) as action_data,
    jsonb_build_object(
        'migrated_from', 'share_audit_log',
        'original_id', id,
        'migration_date', now()
    ) as metadata,
    CASE 
        WHEN action LIKE '%failed%' OR action LIKE '%error%' THEN 'error'
        WHEN action LIKE '%breach%' OR action LIKE '%violation%' THEN 'warning'
        ELSE 'info'
    END as severity,
    created_at,
    to_tsvector('english', action || ' ' || COALESCE(details::text, '')) as search_terms
FROM share_audit_log
WHERE EXISTS (SELECT 1 FROM share_audit_log);

-- Migrate webhook_logs to unified_audit_log (if exists)
INSERT INTO unified_audit_log (
    entity_type,
    entity_id,
    action,
    action_category,
    action_data,
    metadata,
    severity,
    created_at,
    search_terms
)
SELECT 
    'webhook' as entity_type,
    NULL as entity_id, -- Webhook logs are system-wide
    CASE 
        WHEN response_code BETWEEN 200 AND 299 THEN 'webhook_success'
        ELSE 'webhook_failed'
    END as action,
    'webhook' as action_category,
    jsonb_build_object(
        'webhook_url', webhook_url,
        'method', COALESCE(method, 'POST'),
        'payload_size', COALESCE(payload_size, 0),
        'response_code', response_code,
        'response_time_ms', response_time_ms,
        'retry_count', COALESCE(retry_count, 0),
        'error_message', error_message
    ) as action_data,
    jsonb_build_object(
        'migrated_from', 'webhook_logs',
        'original_id', id,
        'migration_date', now()
    ) as metadata,
    CASE 
        WHEN response_code BETWEEN 200 AND 299 THEN 'info'
        WHEN response_code BETWEEN 400 AND 499 THEN 'warning'
        ELSE 'error'
    END as severity,
    created_at,
    to_tsvector('english', webhook_url || ' ' || COALESCE(error_message, '')) as search_terms
FROM webhook_logs
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'webhook_logs');

-- Migrate status_transitions to unified_audit_log (if exists)
INSERT INTO unified_audit_log (
    entity_type,
    entity_id,
    action,
    action_category,
    user_id,
    action_data,
    metadata,
    severity,
    created_at,
    search_terms
)
SELECT 
    entity_type,
    entity_id,
    'status_changed' as action,
    CASE 
        WHEN entity_type = 'quote' THEN 'quote_management'
        WHEN entity_type = 'ticket' THEN 'support'
        ELSE 'system'
    END as action_category,
    user_id,
    jsonb_build_object(
        'old_status', old_status,
        'new_status', new_status,
        'reason', reason,
        'automatic', COALESCE(automatic, false),
        'duration_seconds', duration_seconds
    ) as action_data,
    jsonb_build_object(
        'migrated_from', 'status_transitions',
        'original_id', id,
        'migration_date', now()
    ) as metadata,
    'info' as severity,
    created_at,
    to_tsvector('english', old_status || ' ' || new_status || ' ' || COALESCE(reason, '')) as search_terms
FROM status_transitions
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'status_transitions');

-- Migrate fallback_usage_logs to unified_audit_log (if exists)
INSERT INTO unified_audit_log (
    entity_type,
    entity_id,
    action,
    action_category,
    action_data,
    metadata,
    severity,
    created_at,
    search_terms
)
SELECT 
    'system' as entity_type,
    NULL as entity_id,
    'fallback_used' as action,
    'system' as action_category,
    jsonb_build_object(
        'component', component,
        'operation', operation,
        'fallback_type', fallback_type,
        'original_value', original_value,
        'fallback_value', fallback_value,
        'reason', reason,
        'success', COALESCE(success, true)
    ) as action_data,
    jsonb_build_object(
        'migrated_from', 'fallback_usage_logs',
        'original_id', id,
        'migration_date', now()
    ) as metadata,
    CASE 
        WHEN success = false THEN 'error'
        WHEN reason LIKE '%timeout%' OR reason LIKE '%failed%' THEN 'warning'
        ELSE 'info'
    END as severity,
    created_at,
    to_tsvector('english', component || ' ' || operation || ' ' || fallback_type || ' ' || COALESCE(reason, '')) as search_terms
FROM fallback_usage_logs  
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fallback_usage_logs');

-- ============================================================================
-- Step 5: Move Quote Share Enhancement Data to Quotes Table (If Columns Exist)
-- ============================================================================

-- Check if quote enhancement columns exist and move data to JSONB if they do
DO $$
DECLARE
    has_email_verified BOOLEAN := FALSE;
    has_verification_token BOOLEAN := FALSE;
    has_viewed_at BOOLEAN := FALSE;
    has_view_duration BOOLEAN := FALSE;
BEGIN
    -- Check if enhancement columns exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quotes' AND column_name = 'email_verified'
    ) INTO has_email_verified;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quotes' AND column_name = 'verification_token'
    ) INTO has_verification_token;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quotes' AND column_name = 'first_viewed_at'
    ) INTO has_viewed_at;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quotes' AND column_name = 'total_view_duration'
    ) INTO has_view_duration;

    -- If enhancement columns exist, migrate the data to JSONB
    IF has_email_verified OR has_verification_token OR has_viewed_at OR has_view_duration THEN
        RAISE NOTICE 'Found quote enhancement columns, migrating to operational_data JSONB...';
        
        -- Update quotes table with share enhancement data (only if columns exist)
        UPDATE quotes 
        SET operational_data = COALESCE(operational_data, '{}'::jsonb) || jsonb_build_object(
            'sharing', jsonb_build_object(
                'email_verified', CASE WHEN has_email_verified THEN email_verified ELSE NULL END,
                'verification_token', CASE WHEN has_verification_token THEN verification_token ELSE NULL END,
                'verification_sent_at', CASE WHEN has_verification_token THEN verification_sent_at ELSE NULL END,
                'verification_expires_at', CASE WHEN has_verification_token THEN verification_expires_at ELSE NULL END,
                'first_viewed_at', CASE WHEN has_viewed_at THEN first_viewed_at ELSE NULL END,
                'last_viewed_at', CASE WHEN has_viewed_at THEN last_viewed_at ELSE NULL END,
                'total_view_duration', CASE WHEN has_view_duration THEN COALESCE(total_view_duration, 0) ELSE 0 END,
                'view_count', CASE WHEN has_view_duration THEN COALESCE(view_count, 0) ELSE 0 END
            )
        )
        WHERE (has_email_verified AND email_verified IS NOT NULL) 
           OR (has_verification_token AND verification_token IS NOT NULL)
           OR (has_viewed_at AND first_viewed_at IS NOT NULL)
           OR (has_view_duration AND total_view_duration IS NOT NULL);
           
        RAISE NOTICE 'Quote enhancement data migrated to JSONB format';
    ELSE
        RAISE NOTICE 'No quote enhancement columns found, skipping migration';
    END IF;
END $$;

-- ============================================================================
-- Step 6: Create RLS Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE unified_audit_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies with conditional logic
DO $$
BEGIN
    -- Admins can view all audit logs
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'unified_audit_log' 
        AND policyname = 'Admins can view all audit logs'
    ) THEN
        CREATE POLICY "Admins can view all audit logs" ON unified_audit_log
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM user_roles 
                    WHERE user_id = auth.uid() AND role = 'admin'
                )
            );
    END IF;

    -- Users can view their own audit logs
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'unified_audit_log' 
        AND policyname = 'Users can view own audit logs'
    ) THEN
        CREATE POLICY "Users can view own audit logs" ON unified_audit_log
            FOR SELECT USING (user_id = auth.uid());
    END IF;

    -- Users can view audit logs for their entities
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'unified_audit_log' 
        AND policyname = 'Users can view audit logs for their entities'
    ) THEN
        CREATE POLICY "Users can view audit logs for their entities" ON unified_audit_log
            FOR SELECT USING (
                (entity_type = 'quote' AND EXISTS (
                    SELECT 1 FROM quotes WHERE id = entity_id AND user_id = auth.uid()
                )) OR
                (entity_type = 'ticket' AND EXISTS (
                    SELECT 1 FROM support_system WHERE id = entity_id AND user_id = auth.uid() AND system_type = 'ticket'
                ))
            );
    END IF;

    -- System can insert audit logs
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'unified_audit_log' 
        AND policyname = 'System can insert audit logs'
    ) THEN
        CREATE POLICY "System can insert audit logs" ON unified_audit_log
            FOR INSERT WITH CHECK (true); -- All inserts allowed for audit logging
    END IF;
END $$;

-- ============================================================================
-- Step 7: Create Views for Backward Compatibility
-- ============================================================================

-- View for quote-related audit events
CREATE VIEW quote_audit_view AS
SELECT 
    id,
    entity_id as quote_id,
    user_id,
    action,
    action_data->>'old_status' as old_status,
    action_data->>'new_status' as new_status,
    action_data->>'reason' as reason,
    (action_data->>'automatic')::boolean as automatic,
    created_at
FROM unified_audit_log
WHERE entity_type = 'quote' AND action_category = 'quote_management';

-- View for webhook events
CREATE VIEW webhook_events_view AS
SELECT 
    id,
    action_data->>'webhook_url' as webhook_url,
    action_data->>'webhook_type' as webhook_type,
    (action_data->>'response_code')::integer as response_code,
    action_data->>'response_body' as response_body,
    (action_data->>'retry_count')::integer as retry_count,
    (action_data->>'success')::boolean as success,
    created_at
FROM unified_audit_log
WHERE entity_type = 'webhook' AND action_category = 'webhook';

-- ============================================================================
-- Step 8: Update Triggers to Use Unified Audit Log
-- ============================================================================

-- Create trigger function for quote status changes
CREATE OR REPLACE FUNCTION trigger_log_quote_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if status actually changed
    IF OLD.ticket_data->>'status' != NEW.ticket_data->>'status' THEN
        PERFORM log_quote_status_change(
            NEW.id,
            OLD.ticket_data->>'status',
            NEW.ticket_data->>'status',
            'Status updated via application',
            false
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to support_system table for ticket status changes
CREATE TRIGGER trigger_support_status_audit
    AFTER UPDATE ON support_system
    FOR EACH ROW
    WHEN (OLD.ticket_data->>'status' IS DISTINCT FROM NEW.ticket_data->>'status')
    EXECUTE FUNCTION trigger_log_quote_status_change();

-- ============================================================================
-- Step 9: Migration Statistics and Cleanup Prep
-- ============================================================================

-- Create migration statistics
CREATE TEMP TABLE consolidation_stats AS
WITH audit_stats AS (
    SELECT 
        action_category,
        COUNT(*) as event_count,
        MIN(created_at) as earliest_event,
        MAX(created_at) as latest_event
    FROM unified_audit_log
    GROUP BY action_category
),
table_stats AS (
    SELECT 'share_audit_log' as table_name, COUNT(*) as original_count
    FROM share_audit_log
    WHERE EXISTS (SELECT 1 FROM share_audit_log)
    
    UNION ALL
    
    SELECT 'webhook_logs', COUNT(*)
    FROM webhook_logs
    WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'webhook_logs')
    
    UNION ALL
    
    SELECT 'status_transitions', COUNT(*)
    FROM status_transitions
    WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'status_transitions')
    
    UNION ALL
    
    SELECT 'fallback_usage_logs', COUNT(*)
    FROM fallback_usage_logs
    WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fallback_usage_logs')
)
SELECT 
    'CONSOLIDATION_SUMMARY' as summary_type,
    (SELECT COUNT(*) FROM unified_audit_log) as total_unified_events,
    (SELECT SUM(original_count) FROM table_stats) as total_original_events,
    (SELECT COUNT(DISTINCT action_category) FROM audit_stats) as categories_consolidated;

-- Log consolidation results
DO $$
DECLARE
    stat_record RECORD;
    total_unified INTEGER;
    total_original INTEGER;
BEGIN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'FEATURE TABLE CONSOLIDATION RESULTS';
    RAISE NOTICE '============================================================================';
    
    SELECT total_unified_events, total_original_events 
    INTO total_unified, total_original
    FROM consolidation_stats;
    
    RAISE NOTICE 'Total events consolidated into unified_audit_log: %', COALESCE(total_unified, 0);
    RAISE NOTICE 'Total events from original tables: %', COALESCE(total_original, 0);
    
    -- Show breakdown by category
    FOR stat_record IN 
        SELECT action_category, event_count 
        FROM (
            SELECT action_category, COUNT(*) as event_count
            FROM unified_audit_log 
            GROUP BY action_category
        ) t
        ORDER BY event_count DESC
    LOOP
        RAISE NOTICE '  % events: %', stat_record.action_category, stat_record.event_count;
    END LOOP;
    
    RAISE NOTICE '============================================================================';
    
    -- Verify data integrity
    IF COALESCE(total_unified, 0) >= COALESCE(total_original, 0) THEN
        RAISE NOTICE '✅ Data consolidation completed successfully';
    ELSE
        RAISE NOTICE '⚠️  Data consolidation may have issues - check migration logs';
    END IF;
END $$;

-- Clean up
DROP TABLE IF EXISTS consolidation_stats;

-- ============================================================================
-- Step 10: Add Comments for Documentation
-- ============================================================================

COMMENT ON TABLE unified_audit_log IS 'Unified audit log consolidating share_audit_log, webhook_logs, status_transitions, fallback_usage_logs';
COMMENT ON COLUMN unified_audit_log.entity_type IS 'Type of entity: quote, ticket, user, system, webhook';
COMMENT ON COLUMN unified_audit_log.action_category IS 'Category of action: quote_management, support, payment, system, webhook, share';
COMMENT ON COLUMN unified_audit_log.action_data IS 'Detailed action data - structure varies by category';
COMMENT ON COLUMN unified_audit_log.search_terms IS 'Full-text search terms for efficient querying';

COMMENT ON FUNCTION log_audit_event IS 'General purpose audit logging function';
COMMENT ON FUNCTION log_quote_status_change IS 'Specialized function for logging quote status changes';
COMMENT ON FUNCTION log_webhook_event IS 'Specialized function for logging webhook events';
COMMENT ON FUNCTION log_system_fallback IS 'Specialized function for logging system fallback usage';