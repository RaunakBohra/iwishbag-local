-- ============================================================================
-- ENHANCE USER HSN REQUESTS FOR AI SUGGESTIONS
-- ============================================================================

-- Add AI-related fields to user_hsn_requests table
ALTER TABLE user_hsn_requests ADD COLUMN IF NOT EXISTS ai_suggestion JSONB DEFAULT '{
  "confidence": 0,
  "source": null,
  "reasoning": null,
  "suggested_by": "user"
}'::jsonb;

ALTER TABLE user_hsn_requests ADD COLUMN IF NOT EXISTS ai_extraction_data JSONB DEFAULT '{
  "product_data": {},
  "extraction_method": null,
  "extraction_confidence": 0
}'::jsonb;

-- Create index for AI suggestions
CREATE INDEX IF NOT EXISTS idx_user_hsn_requests_ai_confidence 
ON user_hsn_requests USING GIN ((ai_suggestion->>'confidence'));

-- Function to create AI-suggested HSN request
CREATE OR REPLACE FUNCTION create_ai_hsn_suggestion(
  p_user_id UUID,
  p_product_name TEXT,
  p_product_url TEXT,
  p_hsn_code VARCHAR(8),
  p_description TEXT,
  p_category VARCHAR(255),
  p_subcategory VARCHAR(255) DEFAULT NULL,
  p_keywords TEXT[] DEFAULT '{}',
  p_ai_confidence DECIMAL(3,2) DEFAULT 0.8,
  p_ai_reasoning TEXT DEFAULT NULL,
  p_extraction_data JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request_id UUID;
  v_existing_count INTEGER;
BEGIN
  -- Check if this HSN code already exists in hsn_master
  SELECT COUNT(*) INTO v_existing_count 
  FROM hsn_master 
  WHERE hsn_code = p_hsn_code AND is_active = true;
  
  IF v_existing_count > 0 THEN
    RAISE EXCEPTION 'HSN code % already exists in master data', p_hsn_code;
  END IF;
  
  -- Check if there's already a pending request for this HSN code by this user
  SELECT COUNT(*) INTO v_existing_count 
  FROM user_hsn_requests 
  WHERE user_id = p_user_id AND hsn_code = p_hsn_code AND status = 'pending';
  
  IF v_existing_count > 0 THEN
    RAISE EXCEPTION 'Pending request for HSN code % already exists', p_hsn_code;
  END IF;

  -- Insert new AI-suggested HSN request
  INSERT INTO user_hsn_requests (
    user_id,
    hsn_code,
    description,
    category,
    subcategory,
    keywords,
    product_name,
    product_url,
    ai_suggestion,
    ai_extraction_data,
    status
  ) VALUES (
    p_user_id,
    p_hsn_code,
    p_description,
    p_category,
    p_subcategory,
    p_keywords,
    p_product_name,
    p_product_url,
    jsonb_build_object(
      'confidence', p_ai_confidence,
      'source', 'ai_extraction',
      'reasoning', p_ai_reasoning,
      'suggested_by', 'ai'
    ),
    jsonb_build_object(
      'product_data', p_extraction_data,
      'extraction_method', 'ai_enhanced',
      'extraction_confidence', p_ai_confidence
    ),
    'pending'
  ) RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

-- Function to get AI HSN suggestions for admin review
CREATE OR REPLACE FUNCTION get_ai_hsn_suggestions(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  hsn_code VARCHAR(8),
  description TEXT,
  category VARCHAR(255),
  product_name TEXT,
  ai_confidence DECIMAL(3,2),
  ai_reasoning TEXT,
  created_at TIMESTAMPTZ,
  user_email TEXT
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    uhr.id,
    uhr.hsn_code,
    uhr.description,
    uhr.category,
    uhr.product_name,
    (uhr.ai_suggestion->>'confidence')::DECIMAL(3,2) as ai_confidence,
    uhr.ai_suggestion->>'reasoning' as ai_reasoning,
    uhr.created_at,
    au.email as user_email
  FROM user_hsn_requests uhr
  LEFT JOIN auth.users au ON uhr.user_id = au.id
  WHERE uhr.status = 'pending' 
    AND uhr.ai_suggestion->>'suggested_by' = 'ai'
  ORDER BY (uhr.ai_suggestion->>'confidence')::DECIMAL(3,2) DESC, uhr.created_at DESC
  LIMIT limit_count;
$$;

-- Function to get high-confidence AI suggestions for auto-approval
CREATE OR REPLACE FUNCTION get_high_confidence_ai_suggestions(min_confidence DECIMAL(3,2) DEFAULT 0.95)
RETURNS TABLE (
  id UUID,
  hsn_code VARCHAR(8),
  description TEXT,
  category VARCHAR(255),
  ai_confidence DECIMAL(3,2)
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    uhr.id,
    uhr.hsn_code,
    uhr.description,
    uhr.category,
    (uhr.ai_suggestion->>'confidence')::DECIMAL(3,2) as ai_confidence
  FROM user_hsn_requests uhr
  WHERE uhr.status = 'pending' 
    AND uhr.ai_suggestion->>'suggested_by' = 'ai'
    AND (uhr.ai_suggestion->>'confidence')::DECIMAL(3,2) >= min_confidence
  ORDER BY (uhr.ai_suggestion->>'confidence')::DECIMAL(3,2) DESC, uhr.created_at ASC;
$$;

-- Function for auto-approving high-confidence AI suggestions
CREATE OR REPLACE FUNCTION auto_approve_high_confidence_ai_suggestions(
  min_confidence DECIMAL(3,2) DEFAULT 0.98,
  max_auto_approvals INTEGER DEFAULT 5
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_suggestion RECORD;
  v_approved_count INTEGER := 0;
BEGIN
  -- Only allow admins to run auto-approval
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can auto-approve AI suggestions';
  END IF;

  -- Loop through high-confidence suggestions
  FOR v_suggestion IN 
    SELECT id FROM get_high_confidence_ai_suggestions(min_confidence)
    LIMIT max_auto_approvals
  LOOP
    -- Approve the suggestion
    PERFORM approve_hsn_request(v_suggestion.id);
    v_approved_count := v_approved_count + 1;
  END LOOP;

  RETURN v_approved_count;
END;
$$;

-- Function to update existing request with AI suggestion
CREATE OR REPLACE FUNCTION update_request_with_ai_suggestion(
  p_request_id UUID,
  p_ai_confidence DECIMAL(3,2),
  p_ai_reasoning TEXT,
  p_extraction_data JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_hsn_requests 
  SET 
    ai_suggestion = jsonb_build_object(
      'confidence', p_ai_confidence,
      'source', 'ai_enhancement',
      'reasoning', p_ai_reasoning,
      'suggested_by', 'ai'
    ),
    ai_extraction_data = jsonb_build_object(
      'product_data', p_extraction_data,
      'extraction_method', 'ai_enhanced',
      'extraction_confidence', p_ai_confidence
    )
  WHERE id = p_request_id AND status = 'pending';

  RETURN FOUND;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_ai_hsn_suggestion(UUID, TEXT, TEXT, VARCHAR(8), TEXT, VARCHAR(255), VARCHAR(255), TEXT[], DECIMAL(3,2), TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_ai_hsn_suggestions(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_high_confidence_ai_suggestions(DECIMAL(3,2)) TO authenticated;
GRANT EXECUTE ON FUNCTION auto_approve_high_confidence_ai_suggestions(DECIMAL(3,2), INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION update_request_with_ai_suggestion(UUID, DECIMAL(3,2), TEXT, JSONB) TO authenticated;

-- Update the existing approve_hsn_request function to handle AI suggestions
CREATE OR REPLACE FUNCTION approve_hsn_request(request_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request user_hsn_requests%ROWTYPE;
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can approve HSN requests';
  END IF;

  -- Get the request
  SELECT * INTO v_request FROM user_hsn_requests WHERE id = request_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'HSN request not found or already processed';
  END IF;

  -- Insert into hsn_master with enhanced data structure
  INSERT INTO hsn_master (
    hsn_code, description, category, subcategory, keywords,
    weight_data, tax_data, minimum_valuation_usd, 
    requires_currency_conversion, is_active
  ) VALUES (
    v_request.hsn_code, 
    v_request.description, 
    v_request.category, 
    v_request.subcategory, 
    v_request.keywords, 
    COALESCE(v_request.weight_data, '{
      "typical_weights": {
        "per_unit": {"min": null, "max": null, "average": null},
        "packaging": {"additional_weight": null}
      }
    }'::jsonb),
    COALESCE(v_request.tax_data, '{
      "typical_rates": {
        "customs": {"common": 0},
        "gst": {"standard": 0},
        "vat": {"common": 0}
      }
    }'::jsonb),
    v_request.minimum_valuation_usd, 
    v_request.requires_currency_conversion, 
    true
  ) ON CONFLICT (hsn_code) DO UPDATE SET
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    subcategory = EXCLUDED.subcategory,
    keywords = EXCLUDED.keywords,
    weight_data = EXCLUDED.weight_data,
    tax_data = EXCLUDED.tax_data,
    minimum_valuation_usd = EXCLUDED.minimum_valuation_usd,
    requires_currency_conversion = EXCLUDED.requires_currency_conversion,
    is_active = true,
    updated_at = NOW();

  -- Update request status
  UPDATE user_hsn_requests 
  SET 
    status = 'approved',
    approved_by = auth.uid(),
    approved_at = NOW()
  WHERE id = request_id;

  -- Refresh HSN search cache if the function exists
  BEGIN
    PERFORM refresh_hsn_search_cache();
  EXCEPTION WHEN undefined_function THEN
    -- Function doesn't exist, continue anyway
    NULL;
  END;

  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Failed to approve HSN request: %', SQLERRM;
END;
$$;