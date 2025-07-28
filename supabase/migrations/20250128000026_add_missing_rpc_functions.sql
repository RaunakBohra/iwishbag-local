-- Add missing RPC functions for membership and discount system

-- Function to get discount statistics
CREATE OR REPLACE FUNCTION get_discount_stats()
RETURNS TABLE (
  total_campaigns BIGINT,
  active_campaigns BIGINT,
  total_codes_generated BIGINT,
  codes_used BIGINT,
  total_discount_amount NUMERIC,
  average_discount_percentage NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT dc.id)::BIGINT as total_campaigns,
    COUNT(DISTINCT CASE WHEN dc.is_active THEN dc.id END)::BIGINT as active_campaigns,
    COUNT(DISTINCT dco.id)::BIGINT as total_codes_generated,
    COUNT(DISTINCT cdu.id)::BIGINT as codes_used,
    COALESCE(SUM(cdu.discount_amount), 0) as total_discount_amount,
    COALESCE(AVG(
      CASE 
        WHEN dt.type = 'percentage' THEN dt.value
        ELSE NULL
      END
    ), 0) as average_discount_percentage
  FROM discount_campaigns dc
  LEFT JOIN discount_types dt ON dc.discount_type_id = dt.id
  LEFT JOIN discount_codes dco ON dco.campaign_id = dc.id
  LEFT JOIN customer_discount_usage cdu ON cdu.discount_id = dco.id;
END;
$$;

-- Function to get membership statistics
CREATE OR REPLACE FUNCTION get_membership_stats()
RETURNS TABLE (
  total_members BIGINT,
  active_members BIGINT,
  expired_members BIGINT,
  revenue_this_month NUMERIC,
  churn_rate NUMERIC,
  average_lifetime_value NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH member_stats AS (
    SELECT 
      COUNT(*)::BIGINT as total_members,
      COUNT(CASE WHEN status = 'active' AND expires_at > NOW() THEN 1 END)::BIGINT as active_members,
      COUNT(CASE WHEN status = 'expired' OR expires_at < NOW() THEN 1 END)::BIGINT as expired_members
    FROM customer_memberships
  ),
  revenue_stats AS (
    SELECT 
      COALESCE(SUM(
        CASE 
          WHEN cm.created_at >= date_trunc('month', CURRENT_DATE) 
          THEN COALESCE((mp.pricing->>'USD')::NUMERIC, 0)
          ELSE 0 
        END
      ), 0) as revenue_this_month
    FROM customer_memberships cm
    JOIN membership_plans mp ON cm.plan_id = mp.id
  ),
  churn_stats AS (
    SELECT 
      CASE 
        WHEN COUNT(CASE WHEN status = 'active' THEN 1 END) > 0
        THEN (COUNT(CASE WHEN status = 'cancelled' AND updated_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END)::NUMERIC / 
              COUNT(CASE WHEN status = 'active' THEN 1 END)::NUMERIC * 100)
        ELSE 0
      END as churn_rate
    FROM customer_memberships
  ),
  lifetime_stats AS (
    SELECT 
      CASE 
        WHEN COUNT(*) > 0
        THEN AVG(COALESCE((mp.pricing->>'USD')::NUMERIC, 0))
        ELSE 0
      END as average_lifetime_value
    FROM customer_memberships cm
    JOIN membership_plans mp ON cm.plan_id = mp.id
  )
  SELECT 
    ms.total_members,
    ms.active_members,
    ms.expired_members,
    rs.revenue_this_month,
    cs.churn_rate,
    ls.average_lifetime_value
  FROM member_stats ms, revenue_stats rs, churn_stats cs, lifetime_stats ls;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_discount_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_membership_stats() TO authenticated;

-- Fix the customer_memberships table if needed
-- Add missing columns if they don't exist
DO $$ 
BEGIN
  -- Check if customer column exists in profiles
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'full_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN full_name TEXT;
  END IF;
END $$;