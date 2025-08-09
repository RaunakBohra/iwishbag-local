-- Cleanup Complex Review Request System Migration
-- This migration removes the complex review request system we just built
-- and prepares for the unified messaging system using existing support infrastructure

-- 1. DROP the entire review request system
DROP TABLE IF EXISTS quote_review_requests CASCADE;
DROP FUNCTION IF EXISTS request_quote_review_v2 CASCADE;
DROP FUNCTION IF EXISTS resolve_quote_review_request CASCADE; 
DROP FUNCTION IF EXISTS get_quote_review_history CASCADE;
DROP FUNCTION IF EXISTS get_review_request_stats CASCADE;
DROP FUNCTION IF EXISTS get_next_review_request_number CASCADE;
DROP VIEW IF EXISTS pending_review_requests CASCADE;

-- 2. CLEAN UP old review fields in quotes_v2
ALTER TABLE quotes_v2 DROP COLUMN IF EXISTS review_request_data;
ALTER TABLE quotes_v2 DROP COLUMN IF EXISTS review_requested_at;
ALTER TABLE quotes_v2 DROP COLUMN IF EXISTS review_completed_at;

-- 3. REMOVE under_review status (will be handled via support system)
ALTER TABLE quotes_v2 DROP CONSTRAINT IF EXISTS quotes_unified_valid_status;
ALTER TABLE quotes_v2 ADD CONSTRAINT quotes_unified_valid_status 
CHECK (status IN (
  'draft', 'calculated', 'pending', 'sent', 'approved', 'rejected', 'expired',
  'paid', 'ordered', 'shipped', 'completed', 'cancelled'
));

-- 4. Update any quotes that were in under_review status back to previous status
-- Since we just created test data, let's reset to 'sent' status
UPDATE quotes_v2 SET status = 'sent' WHERE status = 'under_review';

-- 5. EXTEND support system for quote discussions
-- Add quote_discussion as a valid system_type
ALTER TABLE support_system DROP CONSTRAINT IF EXISTS support_system_system_type_check;
ALTER TABLE support_system ADD CONSTRAINT support_system_system_type_check 
CHECK (system_type IN ('ticket', 'rule', 'template', 'preference', 'quote_discussion'));

-- 6. EXTEND support_interactions for quote modifications
-- Add quote_modification as a valid interaction_type
ALTER TABLE support_interactions DROP CONSTRAINT IF EXISTS support_interactions_interaction_type_check;
ALTER TABLE support_interactions ADD CONSTRAINT support_interactions_interaction_type_check
CHECK (interaction_type IN ('reply', 'status_change', 'assignment', 'escalation', 'note', 'quote_modification'));

-- 7. Add validation for quote_modification content
ALTER TABLE support_interactions ADD CONSTRAINT IF NOT EXISTS valid_quote_modification_content 
CHECK (
  interaction_type != 'quote_modification' OR 
  (content ? 'message' AND content ? 'quote_changes')
);

-- 8. Create helper function to create quote discussions
CREATE OR REPLACE FUNCTION create_quote_discussion(
  p_customer_id UUID,
  p_quote_id UUID,
  p_message TEXT,
  p_category TEXT DEFAULT 'other'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_support_id UUID;
  v_quote quotes_v2%ROWTYPE;
  v_subject TEXT;
BEGIN
  -- Validate user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Validate customer owns the quote or is admin
  IF auth.uid() != p_customer_id AND NOT is_admin() THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;
  
  -- Get quote details for context
  SELECT * INTO v_quote FROM quotes_v2 WHERE id = p_quote_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quote not found';
  END IF;
  
  -- Create subject
  v_subject := 'Discussion about Quote #' || COALESCE(v_quote.quote_number, v_quote.id::text);
  
  -- Create support ticket for quote discussion
  INSERT INTO support_system (
    user_id,
    quote_id,
    system_type,
    ticket_data
  ) VALUES (
    p_customer_id,
    p_quote_id,
    'quote_discussion',
    jsonb_build_object(
      'subject', v_subject,
      'description', p_message,
      'status', 'open',
      'priority', 'medium',
      'category', p_category,
      'quote_context', jsonb_build_object(
        'quote_number', COALESCE(v_quote.quote_number, v_quote.id::text),
        'total_amount', v_quote.total_quote_origincurrency,
        'status', v_quote.status,
        'customer_email', v_quote.customer_email
      )
    )
  ) RETURNING id INTO v_support_id;
  
  -- Add the initial message as interaction
  INSERT INTO support_interactions (
    support_id,
    user_id,
    interaction_type,
    content
  ) VALUES (
    v_support_id,
    p_customer_id,
    'reply',
    jsonb_build_object('message', p_message)
  );
  
  RETURN v_support_id;
END;
$$;

-- 9. Create function to auto-categorize messages based on keywords
CREATE OR REPLACE FUNCTION categorize_message(p_message TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Convert to lowercase for case-insensitive matching
  p_message := LOWER(p_message);
  
  -- Check for pricing keywords
  IF p_message ~ '.*(price|cost|expensive|cheap|discount|reduce|money|budget|afford).*' THEN
    RETURN 'pricing';
  END IF;
  
  -- Check for items keywords  
  IF p_message ~ '.*(remove|add|change|item|product|replace|color|size|quantity).*' THEN
    RETURN 'items';
  END IF;
  
  -- Check for shipping keywords
  IF p_message ~ '.*(delivery|shipping|fast|slow|courier|dispatch|track|arrive).*' THEN
    RETURN 'shipping';
  END IF;
  
  -- Check for timeline keywords
  IF p_message ~ '.*(urgent|asap|deadline|when|time|rush|quick|delay).*' THEN
    RETURN 'timeline';
  END IF;
  
  -- Default category
  RETURN 'other';
END;
$$;

-- 10. Grant permissions
GRANT EXECUTE ON FUNCTION create_quote_discussion(UUID, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION categorize_message(TEXT) TO authenticated;

-- 11. Create index for efficient quote discussion queries
CREATE INDEX IF NOT EXISTS idx_support_system_quote_discussions 
ON support_system(quote_id, system_type) 
WHERE system_type = 'quote_discussion';

-- Comments
COMMENT ON FUNCTION create_quote_discussion IS 'Creates a quote discussion in the support system - replaces complex review request system';
COMMENT ON FUNCTION categorize_message IS 'Auto-categorizes messages based on keywords for better routing';

-- Log the cleanup
INSERT INTO error_logs (
  error_type,
  error_message,
  context_data
) VALUES (
  'system_migration',
  'Cleaned up complex review request system, moved to unified messaging',
  jsonb_build_object(
    'migration', '20250809130000_cleanup_review_request_system',
    'action', 'removed_complex_system',
    'replaced_with', 'unified_support_messaging'
  )
);