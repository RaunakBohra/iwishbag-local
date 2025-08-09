-- Add quote review request system
-- This migration adds support for customers to request quote reviews with detailed feedback

-- First, add the under_review status to the quotes constraint
ALTER TABLE quotes_v2 DROP CONSTRAINT IF EXISTS quotes_unified_valid_status;

ALTER TABLE quotes_v2 ADD CONSTRAINT quotes_unified_valid_status 
CHECK (status IN (
  'draft', 'calculated', 'pending', 'sent', 'approved', 'rejected', 'expired', 
  'under_review', 'paid', 'ordered', 'shipped', 'completed', 'cancelled'
));

-- Add review request related columns
ALTER TABLE quotes_v2 
ADD COLUMN IF NOT EXISTS review_request_data JSONB,
ADD COLUMN IF NOT EXISTS review_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS review_completed_at TIMESTAMPTZ;

-- Create index for efficient querying of under_review quotes
CREATE INDEX IF NOT EXISTS idx_quotes_v2_under_review 
ON quotes_v2(status) WHERE status = 'under_review';

CREATE INDEX IF NOT EXISTS idx_quotes_v2_review_requested_at 
ON quotes_v2(review_requested_at) WHERE review_requested_at IS NOT NULL;

-- Add comment explaining the review_request_data JSONB structure
COMMENT ON COLUMN quotes_v2.review_request_data IS 'Customer review request data structure:
{
  "category": "pricing|items|shipping|timeline|other",
  "urgency": "low|medium|high", 
  "description": "Customer description of what needs to change",
  "specific_items": ["item-uuid-1", "item-uuid-2"],
  "expected_changes": "What outcome customer expects",
  "budget_constraint": 150.00,
  "customer_id": "customer-uuid",
  "submitted_at": "2025-08-09T12:00:00Z",
  "ip_address": "192.168.1.1"
}';

-- Create function to handle review request submission
CREATE OR REPLACE FUNCTION request_quote_review(
  p_quote_id UUID,
  p_category TEXT,
  p_description TEXT,
  p_urgency TEXT DEFAULT 'medium',
  p_specific_items TEXT[] DEFAULT NULL,
  p_expected_changes TEXT DEFAULT NULL,
  p_budget_constraint DECIMAL DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quote quotes_v2%ROWTYPE;
  v_user_id UUID;
  v_review_data JSONB;
  v_result JSONB;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Validate user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Get and validate quote
  SELECT * INTO v_quote FROM quotes_v2 WHERE id = p_quote_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quote not found';
  END IF;
  
  -- Validate user owns the quote or has admin access
  IF v_quote.customer_id != v_user_id AND NOT is_admin() THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;
  
  -- Validate quote status allows review request
  IF v_quote.status NOT IN ('sent', 'approved', 'rejected', 'expired') THEN
    RAISE EXCEPTION 'Quote status % does not allow review requests', v_quote.status;
  END IF;
  
  -- Validate inputs
  IF p_category NOT IN ('pricing', 'items', 'shipping', 'timeline', 'other') THEN
    RAISE EXCEPTION 'Invalid category: %', p_category;
  END IF;
  
  IF p_urgency NOT IN ('low', 'medium', 'high') THEN
    RAISE EXCEPTION 'Invalid urgency: %', p_urgency;
  END IF;
  
  IF LENGTH(TRIM(p_description)) < 10 THEN
    RAISE EXCEPTION 'Description must be at least 10 characters';
  END IF;
  
  -- Build review request data
  v_review_data := jsonb_build_object(
    'category', p_category,
    'urgency', p_urgency,
    'description', TRIM(p_description),
    'expected_changes', TRIM(p_expected_changes),
    'budget_constraint', p_budget_constraint,
    'customer_id', v_user_id,
    'submitted_at', NOW(),
    'ip_address', COALESCE(current_setting('request.headers', true)::json->>'cf-connecting-ip', 
                           current_setting('request.headers', true)::json->>'x-forwarded-for',
                           '127.0.0.1')
  );
  
  -- Add specific items if provided
  IF p_specific_items IS NOT NULL AND array_length(p_specific_items, 1) > 0 THEN
    v_review_data := v_review_data || jsonb_build_object('specific_items', to_jsonb(p_specific_items));
  END IF;
  
  -- Update quote with review request
  UPDATE quotes_v2 SET
    status = 'under_review',
    review_request_data = v_review_data,
    review_requested_at = NOW(),
    updated_at = NOW()
  WHERE id = p_quote_id;
  
  -- Create support ticket for admin tracking
  INSERT INTO support_system (
    user_id,
    quote_id,
    system_type,
    ticket_data
  ) VALUES (
    v_user_id,
    p_quote_id,
    'quote_review_request',
    jsonb_build_object(
      'subject', 'Quote Review Request - #' || COALESCE(v_quote.quote_number, v_quote.id::text),
      'description', p_description,
      'category', p_category,
      'urgency', p_urgency,
      'priority', CASE p_urgency WHEN 'high' THEN 'high' WHEN 'medium' THEN 'medium' ELSE 'low' END,
      'status', 'open',
      'review_request', true,
      'expected_changes', p_expected_changes,
      'budget_constraint', p_budget_constraint
    )
  );
  
  -- Return success with quote data
  v_result := jsonb_build_object(
    'success', true,
    'message', 'Review request submitted successfully',
    'quote_id', p_quote_id,
    'status', 'under_review',
    'review_requested_at', NOW(),
    'estimated_response_time', '24-48 hours'
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return failure
    INSERT INTO error_logs (
      user_id, 
      error_message, 
      error_details, 
      context
    ) VALUES (
      v_user_id,
      SQLERRM,
      SQLSTATE,
      jsonb_build_object(
        'function', 'request_quote_review',
        'quote_id', p_quote_id,
        'category', p_category,
        'urgency', p_urgency
      )
    );
    
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Failed to submit review request'
    );
END;
$$;

-- Create function to complete review request (admin only)
CREATE OR REPLACE FUNCTION complete_quote_review(
  p_quote_id UUID,
  p_new_status TEXT DEFAULT 'sent',
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quote quotes_v2%ROWTYPE;
  v_user_id UUID;
  v_result JSONB;
BEGIN
  -- Get current user and validate admin access
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL OR NOT is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  -- Get quote
  SELECT * INTO v_quote FROM quotes_v2 WHERE id = p_quote_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quote not found';
  END IF;
  
  IF v_quote.status != 'under_review' THEN
    RAISE EXCEPTION 'Quote is not under review';
  END IF;
  
  -- Validate new status
  IF p_new_status NOT IN ('sent', 'rejected', 'expired') THEN
    RAISE EXCEPTION 'Invalid completion status: %', p_new_status;
  END IF;
  
  -- Update quote
  UPDATE quotes_v2 SET
    status = p_new_status,
    review_completed_at = NOW(),
    admin_notes = CASE 
      WHEN p_admin_notes IS NOT NULL THEN 
        COALESCE(admin_notes, '') || E'\n\n[Review Completed ' || NOW()::date || ']: ' || p_admin_notes
      ELSE admin_notes
    END,
    updated_at = NOW()
  WHERE id = p_quote_id;
  
  -- Close related support tickets
  UPDATE support_system SET
    ticket_data = ticket_data || jsonb_build_object(
      'status', 'resolved',
      'resolved_at', NOW(),
      'resolved_by', v_user_id,
      'resolution_notes', p_admin_notes
    )
  WHERE quote_id = p_quote_id 
    AND system_type = 'quote_review_request'
    AND ticket_data->>'status' = 'open';
  
  v_result := jsonb_build_object(
    'success', true,
    'message', 'Review completed successfully',
    'quote_id', p_quote_id,
    'new_status', p_new_status,
    'completed_at', NOW()
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Failed to complete review'
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION request_quote_review TO authenticated;
GRANT EXECUTE ON FUNCTION complete_quote_review TO authenticated;

-- Add RLS policy for review request data visibility
CREATE POLICY "Users can view their own quote review requests"
ON quotes_v2 FOR SELECT
USING (
  auth.uid() = customer_id 
  OR is_admin()
  OR (review_request_data->>'customer_id')::uuid = auth.uid()
);

-- Create view for admin review queue (easier querying)
CREATE OR REPLACE VIEW admin_review_queue AS
SELECT 
  q.id,
  q.quote_number,
  q.customer_id,
  q.customer_email,
  q.customer_name,
  q.status,
  q.review_request_data,
  q.review_requested_at,
  q.review_completed_at,
  q.total_quote_origincurrency,
  q.customer_currency,
  q.created_at,
  q.updated_at,
  -- Extract key review data for easy filtering/sorting
  q.review_request_data->>'category' as review_category,
  q.review_request_data->>'urgency' as review_urgency,
  q.review_request_data->>'description' as review_description,
  -- Calculate review age in hours
  EXTRACT(EPOCH FROM (NOW() - q.review_requested_at))/3600 as review_age_hours,
  -- Urgency priority for sorting
  CASE q.review_request_data->>'urgency'
    WHEN 'high' THEN 1
    WHEN 'medium' THEN 2  
    WHEN 'low' THEN 3
    ELSE 4
  END as urgency_priority
FROM quotes_v2 q
WHERE q.status = 'under_review'
ORDER BY urgency_priority ASC, q.review_requested_at ASC;

-- Grant access to admin view
GRANT SELECT ON admin_review_queue TO authenticated;

-- Add comment for the migration
COMMENT ON TABLE quotes_v2 IS 'Enhanced with quote review request system allowing customers to request changes with detailed feedback';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Quote review request system installed successfully';
  RAISE NOTICE 'New status: under_review';
  RAISE NOTICE 'Functions: request_quote_review(), complete_quote_review()';
  RAISE NOTICE 'View: admin_review_queue';
END $$;