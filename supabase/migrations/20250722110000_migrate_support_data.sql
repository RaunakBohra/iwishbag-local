-- Migration: Migrate Support System Data to Unified Structure
-- This migration moves data from fragmented tables to the unified support system

-- ============================================================================
-- Step 1: Migrate Support Tickets
-- ============================================================================

-- Migrate existing support tickets to unified support_system table (only if source table exists)
INSERT INTO support_system (
    id,
    user_id,
    quote_id,
    system_type,
    ticket_data,
    sla_data,
    created_at,
    updated_at,
    is_active
)
SELECT 
    id,
    user_id,
    quote_id,
    'ticket'::VARCHAR(20) as system_type,
    -- Build ticket_data JSONB
    jsonb_build_object(
        'subject', COALESCE(subject, ''),
        'description', COALESCE(description, ''),
        'status', COALESCE(status, 'open'),
        'priority', COALESCE(priority, 'medium'),
        'category', COALESCE(category, 'general'),
        'assigned_to', assigned_to,
        'metadata', jsonb_build_object(
            'created_at', created_at,
            'source', 'migration',
            'first_response_at', CASE 
                WHEN status IN ('in_progress', 'resolved', 'closed') THEN updated_at
                ELSE NULL 
            END,
            'last_status_change', updated_at
        )
    ) as ticket_data,
    -- Build SLA data based on priority and current status
    jsonb_build_object(
        'response_sla', jsonb_build_object(
            'target_minutes', CASE priority
                WHEN 'urgent' THEN 30
                WHEN 'high' THEN 120
                WHEN 'medium' THEN 480
                ELSE 1440
            END,
            'first_response_at', CASE 
                WHEN status IN ('in_progress', 'resolved', 'closed') THEN updated_at
                ELSE NULL 
            END,
            'is_breached', CASE 
                WHEN status IN ('in_progress', 'resolved', 'closed') THEN 
                    EXTRACT(EPOCH FROM (updated_at - created_at))/60 > CASE priority
                        WHEN 'urgent' THEN 30
                        WHEN 'high' THEN 120
                        WHEN 'medium' THEN 480
                        ELSE 1440
                    END
                ELSE 
                    EXTRACT(EPOCH FROM (now() - created_at))/60 > CASE priority
                        WHEN 'urgent' THEN 30
                        WHEN 'high' THEN 120
                        WHEN 'medium' THEN 480
                        ELSE 1440
                    END
            END,
            'breach_duration', CASE 
                WHEN status IN ('in_progress', 'resolved', 'closed') THEN 
                    GREATEST(0, EXTRACT(EPOCH FROM (updated_at - created_at))/60 - CASE priority
                        WHEN 'urgent' THEN 30
                        WHEN 'high' THEN 120
                        WHEN 'medium' THEN 480
                        ELSE 1440
                    END)
                ELSE 
                    GREATEST(0, EXTRACT(EPOCH FROM (now() - created_at))/60 - CASE priority
                        WHEN 'urgent' THEN 30
                        WHEN 'high' THEN 120
                        WHEN 'medium' THEN 480
                        ELSE 1440
                    END)
            END
        ),
        'resolution_sla', jsonb_build_object(
            'target_hours', CASE priority
                WHEN 'urgent' THEN 4
                WHEN 'high' THEN 24
                WHEN 'medium' THEN 72
                ELSE 168
            END,
            'resolved_at', CASE 
                WHEN status IN ('resolved', 'closed') THEN updated_at
                ELSE NULL 
            END,
            'is_breached', CASE 
                WHEN status IN ('resolved', 'closed') THEN 
                    EXTRACT(EPOCH FROM (updated_at - created_at))/3600 > CASE priority
                        WHEN 'urgent' THEN 4
                        WHEN 'high' THEN 24
                        WHEN 'medium' THEN 72
                        ELSE 168
                    END
                ELSE 
                    EXTRACT(EPOCH FROM (now() - created_at))/3600 > CASE priority
                        WHEN 'urgent' THEN 4
                        WHEN 'high' THEN 24
                        WHEN 'medium' THEN 72
                        ELSE 168
                    END
            END,
            'breach_duration', CASE 
                WHEN status IN ('resolved', 'closed') THEN 
                    GREATEST(0, EXTRACT(EPOCH FROM (updated_at - created_at))/3600 - CASE priority
                        WHEN 'urgent' THEN 4
                        WHEN 'high' THEN 24
                        WHEN 'medium' THEN 72
                        ELSE 168
                    END)
                ELSE 
                    GREATEST(0, EXTRACT(EPOCH FROM (now() - created_at))/3600 - CASE priority
                        WHEN 'urgent' THEN 4
                        WHEN 'high' THEN 24
                        WHEN 'medium' THEN 72
                        ELSE 168
                    END)
            END
        )
    ) as sla_data,
    created_at,
    updated_at,
    true as is_active
FROM support_tickets
WHERE EXISTS (SELECT 1 FROM support_tickets)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Step 2: Migrate Ticket Replies to Support Interactions
-- ============================================================================

-- Migrate ticket replies to support_interactions table
INSERT INTO support_interactions (
    id,
    support_id,
    user_id,
    interaction_type,
    content,
    created_at,
    is_internal,
    metadata
)
SELECT 
    tr.id,
    tr.ticket_id as support_id,
    tr.user_id,
    'reply'::VARCHAR(20) as interaction_type,
    jsonb_build_object(
        'message', COALESCE(tr.message, ''),
        'attachments', '[]'::jsonb,
        'is_internal', COALESCE(tr.is_internal, false),
        'source', 'migration'
    ) as content,
    tr.created_at,
    COALESCE(tr.is_internal, false) as is_internal,
    jsonb_build_object(
        'migrated_from', 'ticket_replies',
        'original_id', tr.id
    ) as metadata
FROM ticket_replies tr
WHERE EXISTS (SELECT 1 FROM ticket_replies)
  AND EXISTS (SELECT 1 FROM support_system WHERE id = tr.ticket_id AND system_type = 'ticket')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Step 3: Migrate Auto Assignment Rules  
-- ============================================================================

-- Migrate auto assignment rules to support_system table
INSERT INTO support_system (
    user_id,
    system_type,
    assignment_data,
    created_at,
    updated_at,
    is_active
)
SELECT 
    -- Use system user for rules (first admin user or create a system user)
    (SELECT user_id FROM user_roles WHERE role = 'admin' LIMIT 1),
    'rule'::VARCHAR(20) as system_type,
    jsonb_build_object(
        'rule_name', COALESCE(rule_name, 'Migrated Rule'),
        'conditions', jsonb_build_object(
            'category', CASE 
                WHEN category IS NOT NULL THEN jsonb_build_array(category)
                ELSE '[]'::jsonb 
            END,
            'priority', CASE 
                WHEN priority IS NOT NULL THEN jsonb_build_array(priority)
                ELSE '[]'::jsonb 
            END,
            'keywords', COALESCE(
                CASE 
                    WHEN keywords IS NOT NULL THEN 
                        jsonb_build_array(keywords)
                    ELSE '[]'::jsonb 
                END, '[]'::jsonb
            ),
            'business_hours_only', COALESCE(business_hours_only, false)
        ),
        'assignment', jsonb_build_object(
            'assignee_id', assignee_id,
            'team', team
        ),
        'is_active', COALESCE(is_active, true)
    ) as assignment_data,
    COALESCE(created_at, now()) as created_at,
    COALESCE(updated_at, now()) as updated_at,
    COALESCE(is_active, true) as is_active
FROM auto_assignment_rules
WHERE EXISTS (SELECT 1 FROM auto_assignment_rules)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Step 4: Migrate Reply Templates
-- ============================================================================

-- Migrate reply templates to support_system table
INSERT INTO support_system (
    user_id,
    system_type,
    template_data,
    created_at,
    updated_at,
    is_active
)
SELECT 
    -- Use system user for templates (first admin user)
    (SELECT user_id FROM user_roles WHERE role = 'admin' LIMIT 1),
    'template'::VARCHAR(20) as system_type,
    jsonb_build_object(
        'name', COALESCE(name, 'Migrated Template'),
        'subject', subject,
        'content', COALESCE(content, ''),
        'category', COALESCE(category, 'general'),
        'variables', COALESCE(
            CASE 
                WHEN variables IS NOT NULL THEN variables::jsonb
                ELSE '[]'::jsonb
            END, '[]'::jsonb
        ),
        'is_active', COALESCE(is_active, true),
        'usage_count', COALESCE(usage_count, 0)
    ) as template_data,
    COALESCE(created_at, now()) as created_at,
    COALESCE(updated_at, now()) as updated_at,
    COALESCE(is_active, true) as is_active
FROM reply_templates
WHERE EXISTS (SELECT 1 FROM reply_templates)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Step 5: Migrate Ticket Notification Preferences
-- ============================================================================

-- Create default notification preferences for existing users
INSERT INTO support_system (
    user_id,
    system_type,
    notification_prefs,
    created_at,
    updated_at,
    is_active
)
SELECT DISTINCT
    tnp.user_id,
    'preference'::VARCHAR(20) as system_type,
    jsonb_build_object(
        'email_notifications', COALESCE(tnp.email_notifications, true),
        'sms_notifications', COALESCE(tnp.sms_notifications, false),
        'in_app_notifications', COALESCE(tnp.in_app_notifications, true),
        'notification_frequency', COALESCE(tnp.notification_frequency, 'immediate'),
        'categories', COALESCE(
            CASE 
                WHEN tnp.categories IS NOT NULL THEN tnp.categories::jsonb
                ELSE '["general", "payment", "shipping", "refund", "product", "customs"]'::jsonb
            END, 
            '["general", "payment", "shipping", "refund", "product", "customs"]'::jsonb
        ),
        'escalation_notifications', COALESCE(tnp.escalation_notifications, true)
    ) as notification_prefs,
    COALESCE(tnp.created_at, now()) as created_at,
    COALESCE(tnp.updated_at, now()) as updated_at,
    true as is_active
FROM ticket_notification_preferences tnp
WHERE EXISTS (SELECT 1 FROM ticket_notification_preferences)
ON CONFLICT DO NOTHING;

-- Create default notification preferences for users without explicit preferences
INSERT INTO support_system (
    user_id,
    system_type,
    notification_prefs,
    created_at,
    updated_at,
    is_active
)
SELECT DISTINCT
    st.user_id,
    'preference'::VARCHAR(20) as system_type,
    jsonb_build_object(
        'email_notifications', true,
        'sms_notifications', false,
        'in_app_notifications', true,
        'notification_frequency', 'immediate',
        'categories', '["general", "payment", "shipping", "refund", "product", "customs"]'::jsonb,
        'escalation_notifications', true
    ) as notification_prefs,
    now() as created_at,
    now() as updated_at,
    true as is_active
FROM support_tickets st
WHERE NOT EXISTS (
    SELECT 1 FROM support_system ss 
    WHERE ss.user_id = st.user_id AND ss.system_type = 'preference'
)
AND EXISTS (SELECT 1 FROM support_tickets)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Step 6: Migrate SLA Breach Records (if exists)
-- ============================================================================

-- Create escalation interactions for existing SLA breaches
INSERT INTO support_interactions (
    support_id,
    user_id,
    interaction_type,
    content,
    created_at,
    is_internal,
    metadata
)
SELECT 
    sb.ticket_id as support_id,
    (SELECT user_id FROM user_roles WHERE role = 'admin' LIMIT 1) as user_id,
    'escalation'::VARCHAR(20) as interaction_type,
    jsonb_build_object(
        'breach_type', COALESCE(sb.breach_type, 'unknown'),
        'breach_duration', COALESCE(sb.breach_duration, 0),
        'severity', CASE 
            WHEN sb.breach_duration > 240 THEN 'high'
            WHEN sb.breach_duration > 60 THEN 'medium'
            ELSE 'low'
        END,
        'auto_generated', true,
        'resolved', COALESCE(sb.resolved, false),
        'resolution_time', sb.resolution_time
    ) as content,
    COALESCE(sb.created_at, now()) as created_at,
    true as is_internal,
    jsonb_build_object(
        'migrated_from', 'sla_breaches',
        'original_id', sb.id
    ) as metadata
FROM sla_breaches sb
WHERE EXISTS (SELECT 1 FROM sla_breaches)
  AND EXISTS (SELECT 1 FROM support_system WHERE id = sb.ticket_id AND system_type = 'ticket')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Step 7: Update Statistics and Verification
-- ============================================================================

-- Create a temporary table to track migration stats
CREATE TEMP TABLE migration_stats AS
SELECT 
    'support_tickets' as table_name,
    COUNT(*) as original_count,
    (SELECT COUNT(*) FROM support_system WHERE system_type = 'ticket') as migrated_count
FROM support_tickets
WHERE EXISTS (SELECT 1 FROM support_tickets)
UNION ALL
SELECT 
    'ticket_replies' as table_name,
    COUNT(*) as original_count,
    (SELECT COUNT(*) FROM support_interactions WHERE interaction_type = 'reply') as migrated_count
FROM ticket_replies  
WHERE EXISTS (SELECT 1 FROM ticket_replies)
UNION ALL
SELECT 
    'auto_assignment_rules' as table_name,
    COUNT(*) as original_count,
    (SELECT COUNT(*) FROM support_system WHERE system_type = 'rule') as migrated_count
FROM auto_assignment_rules
WHERE EXISTS (SELECT 1 FROM auto_assignment_rules)
UNION ALL
SELECT 
    'reply_templates' as table_name,
    COUNT(*) as original_count,
    (SELECT COUNT(*) FROM support_system WHERE system_type = 'template') as migrated_count
FROM reply_templates
WHERE EXISTS (SELECT 1 FROM reply_templates)
UNION ALL
SELECT 
    'ticket_notification_preferences' as table_name,
    COUNT(*) as original_count,
    (SELECT COUNT(*) FROM support_system WHERE system_type = 'preference') as migrated_count
FROM ticket_notification_preferences
WHERE EXISTS (SELECT 1 FROM ticket_notification_preferences);

-- Log migration results
DO $$
DECLARE
    stat_record RECORD;
    total_original INTEGER := 0;
    total_migrated INTEGER := 0;
BEGIN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'SUPPORT SYSTEM MIGRATION RESULTS';
    RAISE NOTICE '============================================================================';
    
    FOR stat_record IN SELECT * FROM migration_stats LOOP
        RAISE NOTICE '% - Original: %, Migrated: %', 
            stat_record.table_name, 
            stat_record.original_count, 
            stat_record.migrated_count;
        
        total_original := total_original + stat_record.original_count;
        total_migrated := total_migrated + stat_record.migrated_count;
    END LOOP;
    
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'TOTAL - Original: %, Migrated: %', total_original, total_migrated;
    RAISE NOTICE '============================================================================';
    
    -- Verify key data integrity
    IF EXISTS (SELECT 1 FROM support_system WHERE system_type = 'ticket') THEN
        RAISE NOTICE '✅ Tickets migrated successfully';
    ELSE
        RAISE NOTICE '⚠️  No tickets found in unified system';
    END IF;
    
    IF EXISTS (SELECT 1 FROM support_interactions WHERE interaction_type = 'reply') THEN
        RAISE NOTICE '✅ Replies migrated successfully';
    ELSE
        RAISE NOTICE '⚠️  No replies found in unified system';
    END IF;
END $$;

-- Clean up
DROP TABLE IF EXISTS migration_stats;

-- ============================================================================
-- Step 8: Create Indexes for Migrated Data Performance
-- ============================================================================

-- Additional indexes for better query performance with migrated data
CREATE INDEX IF NOT EXISTS idx_support_system_user_type ON support_system(user_id, system_type);
CREATE INDEX IF NOT EXISTS idx_support_interactions_support_type ON support_interactions(support_id, interaction_type);

-- Index for SLA breach queries
CREATE INDEX IF NOT EXISTS idx_support_system_sla_breached ON support_system 
USING gin ((sla_data->'response_sla'->'is_breached'), (sla_data->'resolution_sla'->'is_breached')) 
WHERE system_type = 'ticket';

-- ============================================================================
-- Step 9: Add Comments for Migration Documentation
-- ============================================================================

COMMENT ON MIGRATION IS 'Migrates fragmented support system data to unified structure. Preserves all existing data while consolidating into support_system and support_interactions tables.';