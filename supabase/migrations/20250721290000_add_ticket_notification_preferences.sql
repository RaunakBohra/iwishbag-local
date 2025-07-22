-- ============================================================================
-- TICKET NOTIFICATION PREFERENCES
-- Allows users to control which ticket notification emails they receive
-- ============================================================================

-- Add notification preferences columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ticket_notifications JSONB DEFAULT '{
  "ticket_created": true,
  "ticket_status_update": true,
  "ticket_reply": true,
  "ticket_closed": true
}'::jsonb;

-- Create index for notification preferences queries
CREATE INDEX IF NOT EXISTS idx_profiles_ticket_notifications ON profiles USING GIN (ticket_notifications);

-- Create helper function to check if user wants specific notification type
CREATE OR REPLACE FUNCTION user_wants_notification(user_id UUID, notification_type TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(
    (SELECT ticket_notifications ->> notification_type FROM profiles WHERE id = user_id)::boolean,
    true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to update user notification preferences
CREATE OR REPLACE FUNCTION update_notification_preferences(
  user_id UUID,
  preferences JSONB
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE profiles 
  SET ticket_notifications = preferences,
      updated_at = NOW()
  WHERE id = user_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add admin notification preferences (admins get all notifications by default)
DO $$ 
BEGIN
  -- Update existing admin users to have full notification preferences
  UPDATE profiles 
  SET ticket_notifications = '{
    "admin_new_ticket": true,
    "admin_new_reply": true,
    "ticket_created": true,
    "ticket_status_update": true,
    "ticket_reply": true,
    "ticket_closed": true
  }'::jsonb
  WHERE id IN (
    SELECT user_id FROM user_roles WHERE role = 'admin'
  );
END $$;

-- Add comment
COMMENT ON COLUMN profiles.ticket_notifications IS 'User preferences for ticket email notifications';
COMMENT ON FUNCTION user_wants_notification IS 'Check if user wants to receive specific notification type';
COMMENT ON FUNCTION update_notification_preferences IS 'Update user notification preferences';