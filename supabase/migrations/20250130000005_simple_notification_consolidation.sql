-- Simple Notification System Consolidation
-- Focus on essential consolidation without complex migrations

BEGIN;

-- =====================================================
-- PART 1: ENHANCE NOTIFICATIONS TABLE
-- =====================================================

-- Add missing columns to notifications table
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS notification_type text DEFAULT 'system',
ADD COLUMN IF NOT EXISTS channel text DEFAULT 'in_app',
ADD COLUMN IF NOT EXISTS template_id text,
ADD COLUMN IF NOT EXISTS template_data jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS delivery_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
ADD COLUMN IF NOT EXISTS failed_at timestamptz,
ADD COLUMN IF NOT EXISTS failure_reason text,
ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS scheduled_for timestamptz,
ADD COLUMN IF NOT EXISTS related_entity_type text,
ADD COLUMN IF NOT EXISTS related_entity_id uuid,
ADD COLUMN IF NOT EXISTS preferences_snapshot jsonb;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_notification_type ON notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_channel ON notifications(channel);
CREATE INDEX IF NOT EXISTS idx_notifications_delivery_status ON notifications(delivery_status);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON notifications(scheduled_for) 
WHERE scheduled_for IS NOT NULL AND delivery_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications(related_entity_type, related_entity_id);

-- =====================================================
-- PART 2: CREATE UNIFIED PREFERENCES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_preferences_unified (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    -- Global preferences
    all_notifications_enabled boolean DEFAULT true,
    email_enabled boolean DEFAULT true,
    sms_enabled boolean DEFAULT true,
    push_enabled boolean DEFAULT true,
    in_app_enabled boolean DEFAULT true,
    -- Category preferences (JSONB for flexibility)
    preferences jsonb DEFAULT '{
        "package": {"enabled": true, "channels": ["email", "sms", "in_app"]},
        "payment": {"enabled": true, "channels": ["email", "in_app"]},
        "order": {"enabled": true, "channels": ["email", "in_app"]},
        "support": {"enabled": true, "channels": ["email", "in_app"]},
        "marketing": {"enabled": false, "channels": []},
        "system": {"enabled": true, "channels": ["in_app"]}
    }'::jsonb,
    -- Quiet hours
    quiet_hours_enabled boolean DEFAULT false,
    quiet_hours_start time DEFAULT '22:00',
    quiet_hours_end time DEFAULT '08:00',
    timezone text DEFAULT 'UTC',
    -- Other settings
    language text DEFAULT 'en',
    frequency text DEFAULT 'immediate',
    -- Metadata
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT unique_user_preferences UNIQUE(user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notification_preferences_unified_user ON notification_preferences_unified(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_unified_enabled ON notification_preferences_unified(all_notifications_enabled);

-- =====================================================
-- PART 3: CREATE NOTIFICATION TEMPLATES
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    category text NOT NULL,
    channel text NOT NULL,
    subject text,
    content text NOT NULL,
    variables jsonb DEFAULT '[]',
    metadata jsonb DEFAULT '{}',
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notification_templates_category ON notification_templates(category);
CREATE INDEX IF NOT EXISTS idx_notification_templates_channel ON notification_templates(channel);
CREATE INDEX IF NOT EXISTS idx_notification_templates_active ON notification_templates(is_active);

-- =====================================================
-- PART 4: CREATE RLS POLICIES
-- =====================================================

ALTER TABLE notification_preferences_unified ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

-- Notification preferences policies
CREATE POLICY "Users can view own preferences" ON notification_preferences_unified
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own preferences" ON notification_preferences_unified
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert own preferences" ON notification_preferences_unified
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all preferences" ON notification_preferences_unified
    FOR ALL USING (is_admin());

-- Notification templates policies
CREATE POLICY "Everyone can view active templates" ON notification_templates
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage templates" ON notification_templates
    FOR ALL USING (is_admin());

-- =====================================================
-- PART 5: CREATE HELPER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_notification_settings(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_settings jsonb;
BEGIN
    SELECT jsonb_build_object(
        'all_notifications_enabled', all_notifications_enabled,
        'email_enabled', email_enabled,
        'sms_enabled', sms_enabled,
        'push_enabled', push_enabled,
        'in_app_enabled', in_app_enabled,
        'preferences', preferences,
        'quiet_hours', jsonb_build_object(
            'enabled', quiet_hours_enabled,
            'start', quiet_hours_start::text,
            'end', quiet_hours_end::text,
            'timezone', timezone
        ),
        'language', language,
        'frequency', frequency
    )
    INTO v_settings
    FROM notification_preferences_unified
    WHERE user_id = p_user_id;
    
    -- Return defaults if no preferences exist
    IF v_settings IS NULL THEN
        RETURN jsonb_build_object(
            'all_notifications_enabled', true,
            'email_enabled', true,
            'sms_enabled', true,
            'push_enabled', true,
            'in_app_enabled', true,
            'preferences', jsonb_build_object(
                'package', jsonb_build_object('enabled', true, 'channels', ARRAY['email', 'sms', 'in_app']),
                'payment', jsonb_build_object('enabled', true, 'channels', ARRAY['email', 'in_app']),
                'order', jsonb_build_object('enabled', true, 'channels', ARRAY['email', 'in_app']),
                'support', jsonb_build_object('enabled', true, 'channels', ARRAY['email', 'in_app']),
                'marketing', jsonb_build_object('enabled', false, 'channels', ARRAY[]::text[]),
                'system', jsonb_build_object('enabled', true, 'channels', ARRAY['in_app'])
            ),
            'quiet_hours', jsonb_build_object('enabled', false),
            'language', 'en',
            'frequency', 'immediate'
        );
    END IF;
    
    RETURN v_settings;
END;
$$;

-- Function to check if notification should be sent
CREATE OR REPLACE FUNCTION should_send_notification(
    p_user_id uuid,
    p_notification_type text,
    p_channel text,
    p_check_quiet_hours boolean DEFAULT true
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_settings jsonb;
    v_category_prefs jsonb;
    v_current_time time;
    v_quiet_start time;
    v_quiet_end time;
BEGIN
    -- Get user settings
    v_settings := get_user_notification_settings(p_user_id);
    
    -- Check if all notifications are disabled
    IF NOT (v_settings->>'all_notifications_enabled')::boolean THEN
        RETURN false;
    END IF;
    
    -- Check channel-specific settings
    CASE p_channel
        WHEN 'email' THEN
            IF NOT (v_settings->>'email_enabled')::boolean THEN RETURN false; END IF;
        WHEN 'sms' THEN
            IF NOT (v_settings->>'sms_enabled')::boolean THEN RETURN false; END IF;
        WHEN 'push' THEN
            IF NOT (v_settings->>'push_enabled')::boolean THEN RETURN false; END IF;
        WHEN 'in_app' THEN
            IF NOT (v_settings->>'in_app_enabled')::boolean THEN RETURN false; END IF;
    END CASE;
    
    -- Check category preferences
    v_category_prefs := v_settings->'preferences'->p_notification_type;
    IF v_category_prefs IS NOT NULL THEN
        IF NOT (v_category_prefs->>'enabled')::boolean THEN
            RETURN false;
        END IF;
        
        -- Check if channel is allowed for this category
        IF NOT (v_category_prefs->'channels' ? p_channel) THEN
            RETURN false;
        END IF;
    END IF;
    
    -- Check quiet hours if requested
    IF p_check_quiet_hours AND (v_settings->'quiet_hours'->>'enabled')::boolean THEN
        v_current_time := (now() AT TIME ZONE (v_settings->'quiet_hours'->>'timezone'))::time;
        v_quiet_start := (v_settings->'quiet_hours'->>'start')::time;
        v_quiet_end := (v_settings->'quiet_hours'->>'end')::time;
        
        -- Handle overnight quiet hours
        IF v_quiet_start > v_quiet_end THEN
            IF v_current_time >= v_quiet_start OR v_current_time < v_quiet_end THEN
                RETURN false;
            END IF;
        ELSE
            IF v_current_time >= v_quiet_start AND v_current_time < v_quiet_end THEN
                RETURN false;
            END IF;
        END IF;
    END IF;
    
    RETURN true;
END;
$$;

-- =====================================================
-- PART 6: CREATE MIGRATION HELPER
-- =====================================================

-- Simple data migration for existing preferences
DO $$
BEGIN
    -- Migrate from customer_notification_preferences (if it has per-type rows)
    INSERT INTO notification_preferences_unified (user_id, preferences, created_at, updated_at)
    SELECT 
        user_id,
        jsonb_object_agg(
            CASE notification_type
                WHEN 'package_received' THEN 'package'
                WHEN 'package_ready_to_ship' THEN 'package'
                WHEN 'package_shipped' THEN 'package'
                WHEN 'storage_fee_due' THEN 'payment'
                WHEN 'storage_fee_waived' THEN 'payment'
                WHEN 'consolidation_ready' THEN 'package'
                WHEN 'general_updates' THEN 'system'
                ELSE 'system'
            END,
            jsonb_build_object(
                'enabled', bool_and(enabled),
                'channels', array_agg(DISTINCT channel)
            )
        ),
        MIN(created_at),
        MAX(updated_at)
    FROM customer_notification_preferences
    GROUP BY user_id
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Update frequency if available
    UPDATE notification_preferences_unified npu
    SET frequency = cnp.frequency
    FROM (
        SELECT DISTINCT user_id, frequency 
        FROM customer_notification_preferences
        WHERE frequency IS NOT NULL
    ) cnp
    WHERE npu.user_id = cnp.user_id;
    
EXCEPTION WHEN OTHERS THEN
    -- If migration fails, just log it
    RAISE NOTICE 'Migration from old preferences table failed: %', SQLERRM;
END $$;

-- =====================================================
-- PART 7: CREATE VIEWS FOR COMPATIBILITY
-- =====================================================

CREATE OR REPLACE VIEW user_notification_settings AS
SELECT 
    u.id as user_id,
    u.email,
    COALESCE(npu.all_notifications_enabled, true) as notifications_enabled,
    COALESCE(npu.email_enabled, true) as email_enabled,
    COALESCE(npu.sms_enabled, true) as sms_enabled,
    COALESCE(npu.preferences, '{}'::jsonb) as preferences,
    COALESCE(npu.language, 'en') as language,
    npu.created_at,
    npu.updated_at
FROM auth.users u
LEFT JOIN notification_preferences_unified npu ON npu.user_id = u.id;

-- =====================================================
-- CLEANUP NOTES
-- =====================================================
-- Tables that can be dropped after verification:
-- 1. customer_notification_preferences
-- 2. customer_notification_profiles  
-- 3. customer_package_notifications
-- 4. package_notifications
-- 5. payment_alert_thresholds

COMMENT ON TABLE notification_preferences_unified IS 'Unified notification preferences for all users';
COMMENT ON TABLE notification_templates IS 'Reusable templates for notifications';
COMMENT ON FUNCTION get_user_notification_settings IS 'Get complete notification settings for a user';
COMMENT ON FUNCTION should_send_notification IS 'Check if a notification should be sent based on user preferences';

COMMIT;