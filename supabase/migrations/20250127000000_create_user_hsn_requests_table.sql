-- ============================================================================
-- USER HSN REQUESTS TABLE - Store user-submitted HSN codes pending approval
-- ============================================================================

-- Create table for user HSN requests
CREATE TABLE IF NOT EXISTS user_hsn_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- HSN Details (matching hsn_master structure)
  hsn_code VARCHAR(8) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(255) NOT NULL,
  subcategory VARCHAR(255),
  keywords TEXT[] DEFAULT '{}',
  
  -- Weight Information
  weight_data JSONB DEFAULT '{
    "typical_weights": {
      "per_unit": {"min": null, "max": null, "average": null},
      "packaging": {"additional_weight": null}
    }
  }'::jsonb,
  
  -- Tax Information
  tax_data JSONB DEFAULT '{
    "typical_rates": {
      "customs": {"common": 0},
      "gst": {"standard": 0},
      "vat": {"common": 0}
    }
  }'::jsonb,
  
  -- Additional Information
  minimum_valuation_usd DECIMAL(10,2),
  requires_currency_conversion BOOLEAN DEFAULT false,
  
  -- Request Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  
  -- Audit Fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  
  -- Product context (helpful for admin review)
  product_name TEXT,
  product_url TEXT,
  
  -- Prevent duplicate pending requests
  CONSTRAINT unique_pending_hsn_per_user UNIQUE (user_id, hsn_code)
);

-- Create indexes for performance
CREATE INDEX idx_user_hsn_requests_user_id ON user_hsn_requests(user_id);
CREATE INDEX idx_user_hsn_requests_status ON user_hsn_requests(status);
CREATE INDEX idx_user_hsn_requests_created_at ON user_hsn_requests(created_at DESC);
CREATE INDEX idx_user_hsn_requests_hsn_code ON user_hsn_requests(hsn_code);

-- Enable Row Level Security
ALTER TABLE user_hsn_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own requests
CREATE POLICY "Users can view own HSN requests" ON user_hsn_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create HSN requests
CREATE POLICY "Users can create HSN requests" ON user_hsn_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending requests
CREATE POLICY "Users can update own pending HSN requests" ON user_hsn_requests
  FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Admins can view all requests
CREATE POLICY "Admins can view all HSN requests" ON user_hsn_requests
  FOR SELECT
  USING (is_admin());

-- Admins can update any request (for approval/rejection)
CREATE POLICY "Admins can update HSN requests" ON user_hsn_requests
  FOR UPDATE
  USING (is_admin());

-- Function to approve HSN request and copy to hsn_master
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

  -- Insert into hsn_master
  INSERT INTO hsn_master (
    hsn_code, description, category, subcategory, keywords,
    weight_data, tax_data, minimum_valuation_usd, 
    requires_currency_conversion, is_active
  ) VALUES (
    v_request.hsn_code, v_request.description, v_request.category, 
    v_request.subcategory, v_request.keywords, v_request.weight_data, 
    v_request.tax_data, v_request.minimum_valuation_usd, 
    v_request.requires_currency_conversion, true
  );

  -- Update request status
  UPDATE user_hsn_requests 
  SET 
    status = 'approved',
    approved_by = auth.uid(),
    approved_at = NOW()
  WHERE id = request_id;

  -- Refresh HSN search cache
  PERFORM refresh_hsn_search_cache();

  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Failed to approve HSN request: %', SQLERRM;
END;
$$;

-- Function to reject HSN request
CREATE OR REPLACE FUNCTION reject_hsn_request(request_id UUID, reason TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can reject HSN requests';
  END IF;

  -- Update request status
  UPDATE user_hsn_requests 
  SET 
    status = 'rejected',
    rejection_reason = reason,
    approved_by = auth.uid(),
    approved_at = NOW()
  WHERE id = request_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'HSN request not found or already processed';
  END IF;

  RETURN true;
END;
$$;

-- Function to get pending HSN requests count (for admin dashboard)
CREATE OR REPLACE FUNCTION get_pending_hsn_requests_count()
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::INTEGER 
  FROM user_hsn_requests 
  WHERE status = 'pending';
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION approve_hsn_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_hsn_request(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_hsn_requests_count() TO authenticated;