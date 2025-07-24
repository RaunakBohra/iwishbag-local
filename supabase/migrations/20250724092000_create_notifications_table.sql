-- =============================================
-- Notifications Table Migration
-- =============================================
-- Creates the notifications table for the iwishBag proactive notification system.
-- Includes RLS policies, indexes, and triggers for optimal performance.
-- Created: 2025-07-24
-- =============================================

-- Create notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  is_read BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  requires_action BOOLEAN DEFAULT false,
  allow_dismiss BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ
);

-- Create indexes for performance optimization
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_priority ON notifications(priority);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_expires_at ON notifications(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read, is_dismissed) WHERE is_read = false AND is_dismissed = false;
CREATE INDEX idx_notifications_user_unread_active ON notifications(user_id, created_at DESC) WHERE is_read = false AND is_dismissed = false;

-- GIN index for JSONB data column for efficient queries on notification data
CREATE INDEX idx_notifications_data_gin ON notifications USING gin(data);

-- Composite index for common query patterns
CREATE INDEX idx_notifications_user_type_status ON notifications(user_id, type, is_read, is_dismissed);

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own notifications
CREATE POLICY "Users can access own notifications" ON notifications
  FOR ALL USING (user_id = auth.uid());

-- RLS Policy: Admins can access all notifications (for support/debugging)
CREATE POLICY "Admins can access all notifications" ON notifications
  FOR ALL USING (is_admin());

-- Create trigger for updated_at column
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically clean up expired notifications
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS void AS $$
BEGIN
  -- Delete notifications that have expired more than 30 days ago
  DELETE FROM notifications 
  WHERE expires_at IS NOT NULL 
    AND expires_at < NOW() - INTERVAL '30 days';
  
  -- Log cleanup action (optional)
  RAISE NOTICE 'Cleaned up expired notifications older than 30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get unread notification count for a user
CREATE OR REPLACE FUNCTION get_unread_notification_count(target_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  unread_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO unread_count
  FROM notifications
  WHERE user_id = target_user_id
    AND is_read = false
    AND is_dismissed = false
    AND (expires_at IS NULL OR expires_at > NOW());
  
  RETURN COALESCE(unread_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read(target_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE notifications 
  SET 
    is_read = true,
    read_at = NOW(),
    updated_at = NOW()
  WHERE user_id = target_user_id
    AND is_read = false
  RETURNING COUNT(*)::INTEGER INTO updated_count;
  
  RETURN COALESCE(updated_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION cleanup_expired_notifications() TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_notification_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read(UUID) TO authenticated;

-- Create a scheduled job to clean up expired notifications (runs daily)
-- Note: This requires pg_cron extension, uncomment if available
-- SELECT cron.schedule('cleanup-notifications', '0 2 * * *', 'SELECT cleanup_expired_notifications();');

-- Add comments for documentation
COMMENT ON TABLE notifications IS 'Stores user notifications for the iwishBag proactive notification system';
COMMENT ON COLUMN notifications.id IS 'Unique identifier for the notification';
COMMENT ON COLUMN notifications.user_id IS 'Reference to the user who should receive this notification';
COMMENT ON COLUMN notifications.type IS 'Notification type from NotificationTypes.ts enum';
COMMENT ON COLUMN notifications.message IS 'Human-readable notification message';
COMMENT ON COLUMN notifications.data IS 'Additional context data in JSONB format (quote_id, order_id, etc.)';
COMMENT ON COLUMN notifications.priority IS 'Notification priority level (low, medium, high, urgent)';
COMMENT ON COLUMN notifications.is_read IS 'Whether the user has read this notification';
COMMENT ON COLUMN notifications.is_dismissed IS 'Whether the user has dismissed this notification';
COMMENT ON COLUMN notifications.requires_action IS 'Whether this notification requires user action';
COMMENT ON COLUMN notifications.allow_dismiss IS 'Whether the user can dismiss this notification';
COMMENT ON COLUMN notifications.expires_at IS 'When this notification expires (NULL = never expires)';
COMMENT ON COLUMN notifications.read_at IS 'Timestamp when the notification was marked as read';
COMMENT ON COLUMN notifications.dismissed_at IS 'Timestamp when the notification was dismissed';

-- Insert some sample notification types for testing
-- These will be cleaned up after testing
INSERT INTO notifications (user_id, type, message, data, priority, requires_action, allow_dismiss, expires_at)
SELECT 
  auth.uid(),
  'welcome_new_user',
  'Welcome to iwishBag! Start by creating your first quote request.',
  '{"action_url": "/quote", "action_label": "Request Quote"}',
  'low',
  false,
  true,
  NOW() + INTERVAL '7 days'
WHERE auth.uid() IS NOT NULL;

-- Performance analysis query (for development/debugging)
-- SELECT 
--   type,
--   priority,
--   COUNT(*) as count,
--   COUNT(*) FILTER (WHERE is_read = false) as unread_count,
--   AVG(EXTRACT(EPOCH FROM (COALESCE(read_at, NOW()) - created_at))/3600) as avg_hours_to_read
-- FROM notifications 
-- GROUP BY type, priority 
-- ORDER BY count DESC;

-- Success message
SELECT 'Notifications table created successfully with RLS policies and performance indexes!' as status;