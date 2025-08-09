-- Add unread functionality for admin ticket management
-- This migration adds fields and functions to track unread tickets

-- Add last_admin_read_at field to support_system table
ALTER TABLE support_system 
ADD COLUMN IF NOT EXISTS last_admin_read_at TIMESTAMPTZ DEFAULT NULL;

-- Add has_unread_replies field for quick filtering
ALTER TABLE support_system 
ADD COLUMN IF NOT EXISTS has_unread_replies BOOLEAN DEFAULT FALSE;

-- Function to mark ticket as read by admin
CREATE OR REPLACE FUNCTION mark_ticket_as_read(
  p_ticket_id UUID,
  p_admin_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Update the ticket's last read timestamp
  UPDATE support_system
  SET 
    last_admin_read_at = NOW(),
    has_unread_replies = FALSE,
    updated_at = NOW()
  WHERE id = p_ticket_id;
  
  -- Log the read action as an interaction (optional)
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
    gen_random_uuid(),
    p_ticket_id,
    p_admin_user_id,
    'note',
    jsonb_build_object('action', 'marked_as_read'),
    jsonb_build_object('read_timestamp', NOW()),
    TRUE,
    NOW()
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically mark tickets as having unread replies
CREATE OR REPLACE FUNCTION update_unread_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger for customer replies (non-admin users)
  IF NEW.interaction_type = 'reply' AND NEW.is_internal = FALSE THEN
    -- Check if this is a customer reply (user_id is not in admin/moderator roles)
    IF NOT EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = NEW.user_id 
      AND ur.role IN ('admin', 'moderator')
    ) THEN
      -- Mark ticket as having unread replies
      UPDATE support_system
      SET 
        has_unread_replies = TRUE,
        updated_at = NOW()
      WHERE id = NEW.support_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic unread status updates
DROP TRIGGER IF EXISTS trigger_update_unread_status ON support_interactions;
CREATE TRIGGER trigger_update_unread_status
  AFTER INSERT ON support_interactions
  FOR EACH ROW
  EXECUTE FUNCTION update_unread_status();

-- Grant permissions
GRANT EXECUTE ON FUNCTION mark_ticket_as_read(UUID, UUID) TO authenticated;

-- Update existing tickets to set initial unread status
-- (mark tickets with recent customer replies as unread)
UPDATE support_system 
SET has_unread_replies = TRUE
WHERE id IN (
  SELECT DISTINCT si.support_id
  FROM support_interactions si
  LEFT JOIN user_roles ur ON si.user_id = ur.user_id
  WHERE si.interaction_type = 'reply' 
  AND si.is_internal = FALSE
  AND si.created_at > NOW() - INTERVAL '7 days'  -- last 7 days
  AND (ur.role IS NULL OR ur.role NOT IN ('admin', 'moderator'))
);