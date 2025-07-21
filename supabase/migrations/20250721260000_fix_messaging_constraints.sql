-- ============================================================================
-- FIX MESSAGING SYSTEM CONSTRAINTS
-- Resolves database constraint issues and adds helper functions
-- ============================================================================

-- Create function to get admin emails from auth.users table
CREATE OR REPLACE FUNCTION public.get_admin_emails(admin_user_ids UUID[])
RETURNS TEXT[]
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  email_list TEXT[];
BEGIN
  -- Get emails from auth.users table for the provided user IDs
  SELECT ARRAY_AGG(au.email)
  INTO email_list
  FROM auth.users au
  WHERE au.id = ANY(admin_user_ids)
  AND au.email IS NOT NULL
  AND au.email_confirmed_at IS NOT NULL; -- Only confirmed emails
  
  -- Return the list of emails, fallback to empty array if none found
  RETURN COALESCE(email_list, ARRAY[]::TEXT[]);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_admin_emails(UUID[]) TO authenticated;

-- Update the messages table constraint to allow null recipients
-- (This allows messages to be sent to "all admins" when recipient_id is null)
ALTER TABLE public.messages 
DROP CONSTRAINT IF EXISTS valid_recipients;

-- Add a more flexible constraint
ALTER TABLE public.messages 
ADD CONSTRAINT valid_recipients_flexible 
CHECK (
  (sender_id IS NOT NULL) AND 
  (recipient_id IS NULL OR sender_id <> recipient_id)
);

-- Update the message access RLS policy to handle null recipients correctly
DROP POLICY IF EXISTS "message_access_policy" ON public.messages;

CREATE POLICY "message_access_policy" ON public.messages
  FOR ALL USING (
    -- User is sender
    (sender_id = auth.uid())
    OR
    -- User is specific recipient
    (recipient_id = auth.uid())
    OR
    -- Message has no specific recipient (general admin message) and user is admin
    (recipient_id IS NULL AND EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    ))
    OR
    -- Admin access to all messages
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Update the get_quote_message_thread function to handle null recipients
CREATE OR REPLACE FUNCTION public.get_quote_message_thread(p_quote_id UUID)
RETURNS TABLE (
  id UUID,
  sender_id UUID,
  sender_name TEXT,
  sender_email TEXT,
  content TEXT,
  message_type TEXT,
  thread_type VARCHAR,
  priority VARCHAR,
  attachment_url TEXT,
  attachment_file_name TEXT,
  is_read BOOLEAN,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  verification_status TEXT,
  admin_notes TEXT,
  is_internal BOOLEAN
) 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.sender_id,
    m.sender_name,
    m.sender_email,
    m.content,
    m.message_type,
    m.thread_type,
    m.priority,
    m.attachment_url,
    m.attachment_file_name,
    m.is_read,
    m.read_at,
    m.created_at,
    m.verification_status,
    m.admin_notes,
    m.is_internal
  FROM public.messages m
  WHERE m.quote_id = p_quote_id
  AND (
    -- User access: sender, recipient, or admin
    (NOT m.is_internal AND (
      m.sender_id = auth.uid() 
      OR m.recipient_id = auth.uid()
      OR (m.recipient_id IS NULL AND EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
      ))
    ))
    OR
    -- Admin access: all messages including internal
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  ORDER BY m.created_at ASC;
END;
$$;

-- Update the get_unread_message_count function to handle null recipients
CREATE OR REPLACE FUNCTION public.get_unread_message_count(p_quote_id UUID DEFAULT NULL, p_user_id UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := COALESCE(p_user_id, auth.uid());
  v_count INTEGER;
  v_is_admin BOOLEAN;
BEGIN
  -- Check if user is admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = v_user_id AND role = 'admin'
  ) INTO v_is_admin;

  SELECT COUNT(*)::INTEGER INTO v_count
  FROM public.messages m
  WHERE 
    (p_quote_id IS NULL OR m.quote_id = p_quote_id)
    AND m.is_read = false
    AND NOT m.is_internal -- Don't count internal admin messages
    AND (
      -- Messages specifically to this user
      m.recipient_id = v_user_id
      OR
      -- General messages (null recipient) visible to admins
      (m.recipient_id IS NULL AND v_is_admin)
    );
  
  RETURN COALESCE(v_count, 0);
END;
$$;

-- Add helpful comments
COMMENT ON FUNCTION public.get_admin_emails IS 'Retrieves email addresses for admin users from auth.users table';
COMMENT ON CONSTRAINT valid_recipients_flexible ON public.messages IS 'Allows messages with null recipient (general admin messages) while preventing self-messaging';

-- Create index for better performance on null recipient queries
CREATE INDEX IF NOT EXISTS idx_messages_null_recipient ON public.messages(quote_id, created_at) 
WHERE recipient_id IS NULL;

COMMENT ON INDEX idx_messages_null_recipient IS 'Optimizes queries for general admin messages (null recipient)';