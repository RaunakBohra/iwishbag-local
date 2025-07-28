-- Customer Notification Preferences System
-- Creates tables and functions for managing customer notification preferences

-- Customer notification profiles table
CREATE TABLE IF NOT EXISTS customer_notification_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email_notifications_enabled BOOLEAN DEFAULT true,
    sms_notifications_enabled BOOLEAN DEFAULT false,
    push_notifications_enabled BOOLEAN DEFAULT true,
    marketing_emails_enabled BOOLEAN DEFAULT false,
    phone_number TEXT,
    preferred_language TEXT DEFAULT 'en' CHECK (preferred_language IN ('en', 'es', 'fr', 'hi', 'ne')),
    timezone TEXT DEFAULT 'America/New_York',
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Customer notification preferences table
CREATE TABLE IF NOT EXISTS customer_notification_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL CHECK (notification_type IN (
        'package_received',
        'package_ready_to_ship', 
        'package_shipped',
        'storage_fee_due',
        'storage_fee_waived',
        'consolidation_ready',
        'general_updates'
    )),
    channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'in_app', 'push')),
    enabled BOOLEAN DEFAULT true,
    frequency TEXT DEFAULT 'immediate' CHECK (frequency IN ('immediate', 'daily', 'weekly')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, notification_type, channel)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_customer_notification_profiles_user_id ON customer_notification_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_notification_preferences_user_id ON customer_notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_notification_preferences_type ON customer_notification_preferences(notification_type);
CREATE INDEX IF NOT EXISTS idx_customer_notification_preferences_channel ON customer_notification_preferences(channel);
CREATE INDEX IF NOT EXISTS idx_customer_notification_preferences_enabled ON customer_notification_preferences(enabled);

-- Add updated_at triggers
CREATE TRIGGER update_customer_notification_profiles_updated_at
    BEFORE UPDATE ON customer_notification_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_notification_preferences_updated_at
    BEFORE UPDATE ON customer_notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE customer_notification_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view and update their own notification preferences
CREATE POLICY "Users can view own notification profile" ON customer_notification_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notification profile" ON customer_notification_profiles
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own notification preferences" ON customer_notification_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own notification preferences" ON customer_notification_preferences
    FOR ALL USING (auth.uid() = user_id);

-- Admin policies
CREATE POLICY "Admins can view all notification profiles" ON customer_notification_profiles
    FOR SELECT USING (is_admin());

CREATE POLICY "Admins can update all notification profiles" ON customer_notification_profiles
    FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can view all notification preferences" ON customer_notification_preferences
    FOR SELECT USING (is_admin());

CREATE POLICY "Admins can update all notification preferences" ON customer_notification_preferences
    FOR UPDATE USING (is_admin());

-- Function to get notification statistics for admin dashboard
CREATE OR REPLACE FUNCTION get_notification_statistics()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_customers', (
            SELECT COUNT(*) FROM auth.users 
            WHERE email_confirmed_at IS NOT NULL
        ),
        'email_enabled', (
            SELECT COUNT(*) FROM customer_notification_profiles 
            WHERE email_notifications_enabled = true
        ),
        'sms_enabled', (
            SELECT COUNT(*) FROM customer_notification_profiles 
            WHERE sms_notifications_enabled = true
        ),
        'push_enabled', (
            SELECT COUNT(*) FROM customer_notification_profiles 
            WHERE push_notifications_enabled = true
        ),
        'fully_subscribed', (
            SELECT COUNT(*) FROM customer_notification_profiles 
            WHERE email_notifications_enabled = true 
                AND sms_notifications_enabled = true 
                AND push_notifications_enabled = true
        ),
        'unsubscribed', (
            SELECT COUNT(*) FROM customer_notification_profiles 
            WHERE email_notifications_enabled = false 
                AND sms_notifications_enabled = false 
                AND push_notifications_enabled = false
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a customer should receive a notification
CREATE OR REPLACE FUNCTION should_send_notification(
    p_user_id UUID,
    p_notification_type TEXT,
    p_channel TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    preference_enabled BOOLEAN := true;
    profile_enabled BOOLEAN := true;
BEGIN
    -- Check specific preference
    SELECT enabled INTO preference_enabled
    FROM customer_notification_preferences
    WHERE user_id = p_user_id 
        AND notification_type = p_notification_type 
        AND channel = p_channel;
    
    -- If no specific preference, default to enabled
    IF preference_enabled IS NULL THEN
        preference_enabled := true;
    END IF;
    
    -- Check channel-level setting in profile
    IF p_channel = 'email' THEN
        SELECT email_notifications_enabled INTO profile_enabled
        FROM customer_notification_profiles
        WHERE user_id = p_user_id;
    ELSIF p_channel = 'sms' THEN
        SELECT sms_notifications_enabled INTO profile_enabled
        FROM customer_notification_profiles
        WHERE user_id = p_user_id;
    ELSIF p_channel = 'push' THEN
        SELECT push_notifications_enabled INTO profile_enabled
        FROM customer_notification_profiles
        WHERE user_id = p_user_id;
    END IF;
    
    -- If no profile, default to enabled
    IF profile_enabled IS NULL THEN
        profile_enabled := true;
    END IF;
    
    RETURN preference_enabled AND profile_enabled;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create default notification preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Create default profile
    INSERT INTO customer_notification_profiles (
        user_id,
        email_notifications_enabled,
        sms_notifications_enabled,
        push_notifications_enabled,
        marketing_emails_enabled,
        preferred_language,
        timezone
    ) VALUES (
        p_user_id,
        true,
        false,
        true,
        false,
        'en',
        'America/New_York'
    ) ON CONFLICT (user_id) DO NOTHING;
    
    -- Create default preferences
    INSERT INTO customer_notification_preferences (user_id, notification_type, channel, enabled, frequency) VALUES
        -- Package notifications
        (p_user_id, 'package_received', 'email', true, 'immediate'),
        (p_user_id, 'package_received', 'in_app', true, 'immediate'),
        (p_user_id, 'package_ready_to_ship', 'email', true, 'immediate'),
        (p_user_id, 'package_ready_to_ship', 'in_app', true, 'immediate'),
        (p_user_id, 'package_shipped', 'email', true, 'immediate'),
        (p_user_id, 'package_shipped', 'sms', false, 'immediate'),
        (p_user_id, 'package_shipped', 'in_app', true, 'immediate'),
        
        -- Storage fee notifications
        (p_user_id, 'storage_fee_due', 'email', true, 'daily'),
        (p_user_id, 'storage_fee_due', 'in_app', true, 'immediate'),
        (p_user_id, 'storage_fee_waived', 'email', true, 'immediate'),
        (p_user_id, 'storage_fee_waived', 'in_app', true, 'immediate'),
        
        -- Consolidation notifications
        (p_user_id, 'consolidation_ready', 'email', true, 'immediate'),
        (p_user_id, 'consolidation_ready', 'in_app', true, 'immediate'),
        
        -- General updates
        (p_user_id, 'general_updates', 'email', false, 'weekly'),
        (p_user_id, 'general_updates', 'in_app', true, 'immediate')
    ON CONFLICT (user_id, notification_type, channel) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create default preferences for new users
CREATE OR REPLACE FUNCTION handle_new_user_notification_setup()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create preferences for users with confirmed emails
    IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
        PERFORM create_default_notification_preferences(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users for new user setup
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user_notification_setup();