-- ============================================================================
-- MESSAGING SYSTEM SCHEMA OPTIMIZATION
-- Enhances existing tables for consolidated messaging system
-- ============================================================================

-- Enhance messages table for better messaging capabilities
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS thread_type VARCHAR(50) DEFAULT 'general',
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS message_status VARCHAR(20) DEFAULT 'sent',
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add constraints for new columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'messages_thread_type_check'
  ) THEN
    ALTER TABLE public.messages 
    ADD CONSTRAINT messages_thread_type_check 
    CHECK (thread_type IN ('general', 'quote', 'support', 'payment_proof', 'internal'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'messages_priority_check'
  ) THEN
    ALTER TABLE public.messages 
    ADD CONSTRAINT messages_priority_check 
    CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'messages_status_check'
  ) THEN
    ALTER TABLE public.messages 
    ADD CONSTRAINT messages_status_check 
    CHECK (message_status IN ('sent', 'delivered', 'read', 'failed'));
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_quote_id_created_at ON public.messages(quote_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_thread_type ON public.messages(thread_type);
CREATE INDEX IF NOT EXISTS idx_messages_sender_recipient ON public.messages(sender_id, recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.messages(recipient_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_messages_priority ON public.messages(priority) WHERE priority IN ('high', 'urgent');

-- Enhance email_templates table for quote messaging
ALTER TABLE public.email_templates 
ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'general',
ADD COLUMN IF NOT EXISTS auto_send BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS trigger_conditions JSONB DEFAULT '{}'::jsonb;

-- Add constraint for template categories
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'email_templates_category_check'
  ) THEN
    ALTER TABLE public.email_templates 
    ADD CONSTRAINT email_templates_category_check 
    CHECK (category IN ('general', 'quote_messaging', 'status_updates', 'payment_proof', 'admin_notifications'));
  END IF;
END $$;

-- Create improved RLS policies for messages

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Admins can view all messages" ON public.messages;

-- Comprehensive message access policy
CREATE POLICY "message_access_policy" ON public.messages
  FOR ALL USING (
    -- User is sender or recipient
    (sender_id = auth.uid() OR recipient_id = auth.uid())
    OR
    -- Admin access to all messages
    (
      EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
      )
    )
    OR
    -- Moderator access to non-internal messages
    (
      is_internal = false AND
      EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role IN ('moderator', 'admin')
      )
    )
  );

-- Message creation policy
CREATE POLICY "message_create_policy" ON public.messages
  FOR INSERT WITH CHECK (
    -- User can send messages as themselves
    sender_id = auth.uid()
    OR
    -- Admin can send messages on behalf of others
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Message update policy (for read status, admin notes, etc.)
CREATE POLICY "message_update_policy" ON public.messages
  FOR UPDATE USING (
    -- Recipients can mark as read
    (recipient_id = auth.uid())
    OR
    -- Admins can update admin_notes, verification_status
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Enhanced email template policies for admin/moderator access
DROP POLICY IF EXISTS "email_templates_admin_access" ON public.email_templates;

CREATE POLICY "email_templates_management" ON public.email_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- Create function for message thread aggregation
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
    -- User access: sender or recipient of non-internal messages
    (NOT m.is_internal AND (m.sender_id = auth.uid() OR m.recipient_id = auth.uid()))
    OR
    -- Admin access: all messages
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR
    -- Moderator access: non-internal messages
    (NOT m.is_internal AND EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role IN ('moderator', 'admin')
    ))
  )
  ORDER BY m.created_at ASC;
END;
$$;

-- Create function to get unread message count for quotes
CREATE OR REPLACE FUNCTION public.get_unread_message_count(p_quote_id UUID DEFAULT NULL, p_user_id UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := COALESCE(p_user_id, auth.uid());
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM public.messages m
  WHERE 
    (p_quote_id IS NULL OR m.quote_id = p_quote_id)
    AND m.recipient_id = v_user_id
    AND m.is_read = false
    AND NOT m.is_internal; -- Don't count internal admin messages
  
  RETURN COALESCE(v_count, 0);
END;
$$;

-- Create function to mark messages as read
CREATE OR REPLACE FUNCTION public.mark_messages_as_read(p_message_ids UUID[])
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  UPDATE public.messages 
  SET 
    is_read = true,
    read_at = NOW(),
    updated_at = NOW()
  WHERE 
    id = ANY(p_message_ids)
    AND recipient_id = auth.uid()
    AND is_read = false;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RETURN v_updated_count;
END;
$$;

-- Insert default email templates for quote messaging
INSERT INTO public.email_templates (name, subject, html_content, template_type, category, auto_send, variables) 
VALUES 
  (
    'Quote Discussion New Message',
    'New message about your quote #{{quote_id}}',
    '<h2>New Message Received</h2>
     <p>Hello {{customer_name}},</p>
     <p>You have received a new message regarding your quote #{{quote_id}}.</p>
     <div style="background: #f5f5f5; padding: 15px; margin: 20px 0; border-left: 4px solid #0066cc;">
       <strong>From:</strong> {{sender_name}}<br>
       <strong>Message:</strong><br>
       {{message_content}}
     </div>
     <p><a href="{{quote_url}}" style="background: #0066cc; color: white; padding: 10px 20px; text-decoration: none;">View Quote & Reply</a></p>
     <p>Best regards,<br>iwishBag Team</p>',
    'quote_messaging',
    'quote_messaging',
    true,
    '{"quote_id": "text", "customer_name": "text", "sender_name": "text", "message_content": "text", "quote_url": "text"}'::jsonb
  ),
  (
    'Admin Quote Message Notification',
    'New customer message for quote #{{quote_id}}',
    '<h2>Customer Message Received</h2>
     <p>A customer has sent a message regarding quote #{{quote_id}}.</p>
     <div style="background: #f5f5f5; padding: 15px; margin: 20px 0; border-left: 4px solid #ff6600;">
       <strong>Customer:</strong> {{customer_name}} ({{customer_email}})<br>
       <strong>Quote:</strong> #{{quote_id}}<br>
       <strong>Message:</strong><br>
       {{message_content}}
     </div>
     <p><a href="{{admin_quote_url}}" style="background: #ff6600; color: white; padding: 10px 20px; text-decoration: none;">View in Admin Panel</a></p>',
    'admin_notifications',
    'admin_notifications',
    true,
    '{"quote_id": "text", "customer_name": "text", "customer_email": "text", "message_content": "text", "admin_quote_url": "text"}'::jsonb
  ),
  (
    'Payment Proof Submitted',
    'Payment proof submitted for quote #{{quote_id}}',
    '<h2>Payment Proof Submitted</h2>
     <p>A customer has submitted payment proof for quote #{{quote_id}}.</p>
     <div style="background: #f0f8f0; padding: 15px; margin: 20px 0; border-left: 4px solid #28a745;">
       <strong>Customer:</strong> {{customer_name}} ({{customer_email}})<br>
       <strong>Quote:</strong> #{{quote_id}}<br>
       <strong>Attachment:</strong> {{attachment_name}}<br>
       <strong>Message:</strong><br>
       {{message_content}}
     </div>
     <p><a href="{{admin_quote_url}}" style="background: #28a745; color: white; padding: 10px 20px; text-decoration: none;">Review & Verify</a></p>',
    'admin_notifications',
    'admin_notifications',
    true,
    '{"quote_id": "text", "customer_name": "text", "customer_email": "text", "message_content": "text", "attachment_name": "text", "admin_quote_url": "text"}'::jsonb
  )
ON CONFLICT (name) DO NOTHING;

-- Add comment to document the messaging enhancement
COMMENT ON TABLE public.messages IS 'Enhanced messaging table supporting quote-specific conversations, payment proofs, internal admin notes, and comprehensive messaging features';

COMMENT ON FUNCTION public.get_quote_message_thread IS 'Retrieves all messages for a specific quote with proper access control based on user roles';

COMMENT ON FUNCTION public.get_unread_message_count IS 'Returns count of unread messages for a user, optionally filtered by quote';

COMMENT ON FUNCTION public.mark_messages_as_read IS 'Marks specified messages as read for the current user, returns count of updated messages';