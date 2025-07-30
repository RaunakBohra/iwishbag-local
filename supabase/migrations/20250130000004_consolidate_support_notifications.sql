-- Consolidate Support and Notification Systems
-- This migration merges redundant tables while preserving all functionality

BEGIN;

-- =====================================================
-- PART 1: CONSOLIDATE SUPPORT SYSTEM
-- =====================================================

-- The current support system is already well-designed with:
-- 1. support_system - main table for tickets, rules, templates
-- 2. support_interactions - interactions/replies
-- 3. Views for easier access (tickets, ticket_replies_view, support_tickets_view)

-- No major changes needed, just ensure indexes are optimal
CREATE INDEX IF NOT EXISTS idx_support_system_ticket_created_status 
ON support_system(created_at DESC, (ticket_data->>'status')) 
WHERE system_type = 'ticket';

-- =====================================================
-- PART 2: CONSOLIDATE NOTIFICATION SYSTEM
-- =====================================================

-- Create unified notifications table (expanding existing one)
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
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS related_entity_type text,
ADD COLUMN IF NOT EXISTS related_entity_id uuid,
ADD COLUMN IF NOT EXISTS preferences_snapshot jsonb;

-- Add check constraint for notification types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (notification_type IN ('system', 'package', 'payment', 'order', 'support', 'marketing', 'alert'));

-- Add check constraint for channels
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_channel_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_channel_check 
CHECK (channel IN ('in_app', 'email', 'sms', 'push', 'whatsapp'));

-- Add check constraint for delivery status
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_delivery_status_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_delivery_status_check 
CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed', 'cancelled'));

-- Create indexes for the expanded notifications table
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_channel ON notifications(channel);
CREATE INDEX IF NOT EXISTS idx_notifications_delivery_status ON notifications(delivery_status);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON notifications(scheduled_for) 
WHERE scheduled_for IS NOT NULL AND delivery_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications(related_entity_type, related_entity_id);

-- Consolidate notification preferences into single table
CREATE TABLE IF NOT EXISTS notification_preferences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_id uuid,
    -- Preferences by type
    system_notifications jsonb DEFAULT '{"enabled": true, "channels": ["in_app", "email"]}',
    package_notifications jsonb DEFAULT '{"enabled": true, "channels": ["email", "sms"]}',
    payment_notifications jsonb DEFAULT '{"enabled": true, "channels": ["email"]}',
    order_notifications jsonb DEFAULT '{"enabled": true, "channels": ["email"]}',
    support_notifications jsonb DEFAULT '{"enabled": true, "channels": ["email"]}',
    marketing_notifications jsonb DEFAULT '{"enabled": false, "channels": []}',
    -- Global settings
    quiet_hours jsonb DEFAULT '{"enabled": false, "start": "22:00", "end": "08:00", "timezone": "UTC"}',
    language text DEFAULT 'en',
    -- Metadata
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT unique_user_preferences UNIQUE(user_id),
    CONSTRAINT unique_customer_preferences UNIQUE(customer_id),
    CONSTRAINT user_or_customer CHECK (
        (user_id IS NOT NULL AND customer_id IS NULL) OR 
        (user_id IS NULL AND customer_id IS NOT NULL)
    )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_customer ON notification_preferences(customer_id);

-- Migrate data from old tables to new structure
-- Migrate customer_notification_preferences
INSERT INTO notification_preferences (
    user_id,
    customer_id,
    system_notifications,
    package_notifications,
    payment_notifications,
    order_notifications,
    support_notifications,
    marketing_notifications,
    language,
    created_at,
    updated_at
)
SELECT 
    user_id,
    NULL as customer_id,
    jsonb_build_object(
        'enabled', COALESCE(email_notifications, true),
        'channels', CASE 
            WHEN email_notifications THEN ARRAY['in_app', 'email']
            ELSE ARRAY['in_app']
        END
    ),
    jsonb_build_object(
        'enabled', COALESCE(package_notifications, true),
        'channels', CASE 
            WHEN package_notifications AND sms_notifications THEN ARRAY['email', 'sms']
            WHEN package_notifications THEN ARRAY['email']
            ELSE ARRAY[]
        END
    ),
    jsonb_build_object('enabled', true, 'channels', ARRAY['email']),
    jsonb_build_object('enabled', COALESCE(order_notifications, true), 'channels', ARRAY['email']),
    jsonb_build_object('enabled', true, 'channels', ARRAY['email']),
    jsonb_build_object('enabled', COALESCE(marketing_notifications, false), 'channels', ARRAY[]),
    COALESCE(language, 'en'),
    created_at,
    updated_at
FROM customer_notification_preferences
ON CONFLICT (user_id) DO NOTHING;

-- Migrate customer_notification_profiles
INSERT INTO notification_preferences (
    user_id,
    customer_id,
    system_notifications,
    package_notifications,
    payment_notifications,
    order_notifications,
    quiet_hours,
    created_at,
    updated_at
)
SELECT 
    cnp.user_id,
    cnp.customer_id,
    jsonb_build_object('enabled', true, 'channels', ARRAY['in_app', 'email']),
    jsonb_build_object(
        'enabled', COALESCE(cnp.active, true),
        'channels', ARRAY['email', 'sms']
    ),
    jsonb_build_object('enabled', true, 'channels', ARRAY['email']),
    jsonb_build_object('enabled', true, 'channels', ARRAY['email']),
    CASE 
        WHEN cnp.preferences->>'quiet_hours_enabled' = 'true' THEN
            jsonb_build_object(
                'enabled', true,
                'start', COALESCE(cnp.preferences->>'quiet_hours_start', '22:00'),
                'end', COALESCE(cnp.preferences->>'quiet_hours_end', '08:00'),
                'timezone', COALESCE(cnp.preferences->>'timezone', 'UTC')
            )
        ELSE
            jsonb_build_object('enabled', false)
    END,
    cnp.created_at,
    cnp.updated_at
FROM customer_notification_profiles cnp
WHERE NOT EXISTS (
    SELECT 1 FROM notification_preferences np 
    WHERE np.user_id = cnp.user_id OR np.customer_id = cnp.customer_id
);

-- Migrate package notifications to unified notifications table
INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    notification_type,
    channel,
    related_entity_type,
    related_entity_id,
    delivery_status,
    created_at,
    read_at
)
SELECT 
    pn.user_id,
    COALESCE(pn.title, 'Package Update'),
    COALESCE(pn.message, pn.notification_text),
    COALESCE(pn.notification_type, 'package_update'),
    'package',
    'in_app',
    'package',
    pn.package_id,
    CASE 
        WHEN pn.sent_at IS NOT NULL THEN 'delivered'
        ELSE 'pending'
    END,
    pn.created_at,
    pn.read_at
FROM package_notifications pn
WHERE NOT EXISTS (
    SELECT 1 FROM notifications n 
    WHERE n.related_entity_type = 'package' 
    AND n.related_entity_id = pn.package_id
    AND n.created_at = pn.created_at
);

-- Migrate customer package notifications
INSERT INTO notifications (
    user_id,
    title,
    message,
    notification_type,
    channel,
    related_entity_type,
    related_entity_id,
    template_data,
    delivery_status,
    delivered_at,
    created_at
)
SELECT 
    cpn.user_id,
    'Package ' || cpn.status,
    cpn.message,
    'package',
    cpn.channel,
    'package',
    cpn.package_id::uuid,
    jsonb_build_object(
        'tracking_id', cpn.tracking_id,
        'status', cpn.status,
        'template_used', cpn.template_id
    ),
    CASE 
        WHEN cpn.sent_at IS NOT NULL THEN 'delivered'
        ELSE 'pending'
    END,
    cpn.sent_at,
    cpn.created_at
FROM customer_package_notifications cpn
WHERE NOT EXISTS (
    SELECT 1 FROM notifications n 
    WHERE n.related_entity_type = 'package' 
    AND n.related_entity_id = cpn.package_id::uuid
    AND n.channel = cpn.channel
    AND n.created_at = cpn.created_at
);

-- Create notification templates table (extracted from support_system)
CREATE TABLE IF NOT EXISTS notification_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    type text NOT NULL,
    channel text NOT NULL,
    subject text,
    content text NOT NULL,
    variables jsonb DEFAULT '[]',
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users(id),
    CONSTRAINT valid_template_type CHECK (type IN ('system', 'package', 'payment', 'order', 'support', 'marketing')),
    CONSTRAINT valid_template_channel CHECK (channel IN ('email', 'sms', 'push', 'whatsapp'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notification_templates_type ON notification_templates(type);
CREATE INDEX IF NOT EXISTS idx_notification_templates_channel ON notification_templates(channel);
CREATE INDEX IF NOT EXISTS idx_notification_templates_active ON notification_templates(is_active);

-- Migrate templates from support_system
INSERT INTO notification_templates (
    name,
    type,
    channel,
    subject,
    content,
    variables,
    is_active,
    created_at,
    updated_at,
    created_by
)
SELECT 
    template_data->>'name',
    CASE 
        WHEN template_data->>'category' = 'support' THEN 'support'
        WHEN template_data->>'category' = 'package' THEN 'package'
        ELSE 'system'
    END,
    COALESCE(template_data->>'channel', 'email'),
    template_data->>'subject',
    template_data->>'content',
    COALESCE(template_data->'variables', '[]'::jsonb),
    COALESCE((template_data->>'is_active')::boolean, true),
    created_at,
    updated_at,
    user_id
FROM support_system
WHERE system_type = 'template'
AND template_data->>'name' IS NOT NULL
AND template_data->>'content' IS NOT NULL
ON CONFLICT (name) DO NOTHING;

-- Create RLS policies for new tables
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

-- Notification preferences policies
CREATE POLICY "Users can view own preferences" ON notification_preferences
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own preferences" ON notification_preferences
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert own preferences" ON notification_preferences
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all preferences" ON notification_preferences
    FOR ALL USING (is_admin());

-- Notification templates policies
CREATE POLICY "Everyone can view active templates" ON notification_templates
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage templates" ON notification_templates
    FOR ALL USING (is_admin());

-- Create helper functions
CREATE OR REPLACE FUNCTION get_user_notification_preferences(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_preferences jsonb;
BEGIN
    SELECT row_to_json(np.*)::jsonb
    INTO v_preferences
    FROM notification_preferences np
    WHERE np.user_id = p_user_id;
    
    -- Return default preferences if none exist
    IF v_preferences IS NULL THEN
        RETURN jsonb_build_object(
            'system_notifications', jsonb_build_object('enabled', true, 'channels', ARRAY['in_app', 'email']),
            'package_notifications', jsonb_build_object('enabled', true, 'channels', ARRAY['email', 'sms']),
            'payment_notifications', jsonb_build_object('enabled', true, 'channels', ARRAY['email']),
            'order_notifications', jsonb_build_object('enabled', true, 'channels', ARRAY['email']),
            'support_notifications', jsonb_build_object('enabled', true, 'channels', ARRAY['email']),
            'marketing_notifications', jsonb_build_object('enabled', false, 'channels', ARRAY[]),
            'quiet_hours', jsonb_build_object('enabled', false),
            'language', 'en'
        );
    END IF;
    
    RETURN v_preferences;
END;
$$;

-- Create views for backward compatibility
CREATE OR REPLACE VIEW customer_notifications_view AS
SELECT 
    n.id,
    n.user_id,
    n.title,
    n.message,
    n.type,
    n.notification_type,
    n.channel,
    n.related_entity_type,
    n.related_entity_id,
    n.delivery_status,
    n.delivered_at,
    n.read_at,
    n.created_at,
    np.system_notifications,
    np.package_notifications,
    np.payment_notifications,
    np.order_notifications,
    np.language
FROM notifications n
LEFT JOIN notification_preferences np ON np.user_id = n.user_id;

-- Update triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at 
    BEFORE UPDATE ON notification_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_templates_updated_at ON notification_templates;
CREATE TRIGGER update_notification_templates_updated_at 
    BEFORE UPDATE ON notification_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE notification_preferences IS 'Unified notification preferences for users and customers';
COMMENT ON TABLE notification_templates IS 'Reusable templates for various notification types';
COMMENT ON TABLE notifications IS 'Consolidated notifications table for all notification types and channels';

-- =====================================================
-- CLEANUP: Mark old tables for deletion (DO NOT DROP YET)
-- =====================================================
-- Tables to be dropped after verification:
-- 1. customer_notification_preferences
-- 2. customer_notification_profiles
-- 3. customer_package_notifications
-- 4. package_notifications
-- 5. messages (if not used for chat/support)
-- 6. payment_alert_thresholds (migrate to notification_preferences if needed)

-- Add migration notes
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'migration_notes') THEN
        CREATE TABLE migration_notes (
            id serial PRIMARY KEY,
            migration_name text NOT NULL,
            notes text,
            created_at timestamptz DEFAULT now()
        );
    END IF;
    
    INSERT INTO migration_notes (migration_name, notes) VALUES 
    ('consolidate_support_notifications', 
     'Consolidated notification system into unified tables. Old tables preserved for rollback: customer_notification_preferences, customer_notification_profiles, customer_package_notifications, package_notifications. Can be dropped after verification.');
END $$;

COMMIT;