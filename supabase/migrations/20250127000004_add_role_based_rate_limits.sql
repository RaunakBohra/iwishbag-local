-- Migration: Add Role-Based Rate Limiting
-- Purpose: Different rate limits for admins vs customers
-- Date: 2025-01-27
-- Business Need: Admins need higher limits for operational tasks

BEGIN;

-- Add role-based multipliers to rate limit rules
ALTER TABLE rate_limit_rules 
ADD COLUMN IF NOT EXISTS admin_multiplier INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS moderator_multiplier INTEGER DEFAULT 5;

-- Update multipliers for different functions
UPDATE rate_limit_rules SET
    admin_multiplier = CASE
        -- Admins can create many payment links for customers
        WHEN function_name = 'create_payment' THEN 50
        -- Admins need to manage many users
        WHEN function_name = 'update_user_roles' THEN 20
        WHEN function_name = 'get_all_users_with_roles' THEN 20
        -- Admins generate many tracking IDs
        WHEN function_name = 'generate_iwish_tracking_id' THEN 30
        -- Default higher multiplier
        ELSE 10
    END,
    moderator_multiplier = CASE
        -- Moderators also create payment links
        WHEN function_name = 'create_payment' THEN 20
        -- Moderators manage quotes
        WHEN function_name = 'generate_iwish_tracking_id' THEN 15
        -- Default multiplier
        ELSE 5
    END;

-- Create function to get effective rate limit based on user role
CREATE OR REPLACE FUNCTION get_effective_rate_limit(
    p_function_name TEXT,
    p_user_id UUID DEFAULT NULL
)
RETURNS TABLE(
    base_limit_per_minute INTEGER,
    base_limit_per_hour INTEGER,
    base_limit_per_day INTEGER,
    effective_limit_per_minute INTEGER,
    effective_limit_per_hour INTEGER,
    effective_limit_per_day INTEGER,
    multiplier INTEGER,
    user_role TEXT
) AS $$
DECLARE
    v_rule rate_limit_rules;
    v_multiplier INTEGER DEFAULT 1;
    v_user_role TEXT DEFAULT 'user';
BEGIN
    -- Get base rule
    SELECT * INTO v_rule
    FROM rate_limit_rules
    WHERE function_name = p_function_name
    AND is_active = true;
    
    -- Determine user role and multiplier
    IF p_user_id IS NOT NULL THEN
        -- Check if admin
        IF EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = p_user_id 
            AND role = 'admin' 
            AND is_active = true
        ) THEN
            v_multiplier := v_rule.admin_multiplier;
            v_user_role := 'admin';
        -- Check if moderator
        ELSIF EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = p_user_id 
            AND role = 'moderator' 
            AND is_active = true
        ) THEN
            v_multiplier := v_rule.moderator_multiplier;
            v_user_role := 'moderator';
        END IF;
    END IF;
    
    RETURN QUERY
    SELECT 
        v_rule.max_requests_per_minute as base_limit_per_minute,
        v_rule.max_requests_per_hour as base_limit_per_hour,
        v_rule.max_requests_per_day as base_limit_per_day,
        v_rule.max_requests_per_minute * v_multiplier as effective_limit_per_minute,
        v_rule.max_requests_per_hour * v_multiplier as effective_limit_per_hour,
        v_rule.max_requests_per_day * v_multiplier as effective_limit_per_day,
        v_multiplier as multiplier,
        v_user_role as user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the check_rate_limit function to use role-based limits
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_function_name TEXT,
    p_user_id UUID DEFAULT NULL,
    p_ip_address INET DEFAULT NULL
)
RETURNS TABLE(
    is_limited BOOLEAN,
    remaining_requests INTEGER,
    reset_at TIMESTAMPTZ,
    limit_type TEXT
) AS $$
DECLARE
    v_rule rate_limit_rules;
    v_effective_limits RECORD;
    v_current_minute_count INTEGER;
    v_current_hour_count INTEGER;
    v_current_day_count INTEGER;
    v_is_blocked BOOLEAN;
BEGIN
    -- Check if user/IP is blocked
    SELECT EXISTS(
        SELECT 1 FROM rate_limit_blocks
        WHERE (user_id = p_user_id OR ip_address = p_ip_address)
        AND blocked_until > NOW()
    ) INTO v_is_blocked;
    
    IF v_is_blocked THEN
        RETURN QUERY
        SELECT 
            true AS is_limited,
            0 AS remaining_requests,
            blocked_until AS reset_at,
            'blocked' AS limit_type
        FROM rate_limit_blocks
        WHERE (user_id = p_user_id OR ip_address = p_ip_address)
        AND blocked_until > NOW()
        ORDER BY blocked_until DESC
        LIMIT 1;
        RETURN;
    END IF;
    
    -- Get effective limits based on user role
    SELECT * INTO v_effective_limits
    FROM get_effective_rate_limit(p_function_name, p_user_id);
    
    -- If no rule exists, allow request
    IF v_effective_limits IS NULL THEN
        RETURN QUERY
        SELECT 
            false AS is_limited,
            1000 AS remaining_requests,
            NOW() + INTERVAL '1 minute' AS reset_at,
            'none' AS limit_type;
        RETURN;
    END IF;
    
    -- Count requests in current minute
    SELECT COALESCE(SUM(request_count), 0) INTO v_current_minute_count
    FROM rate_limit_tracking
    WHERE function_name = p_function_name
    AND (user_id = p_user_id OR ip_address = p_ip_address)
    AND window_start >= NOW() - INTERVAL '1 minute';
    
    -- Check minute limit (using effective limit)
    IF v_current_minute_count >= v_effective_limits.effective_limit_per_minute THEN
        RETURN QUERY
        SELECT 
            true AS is_limited,
            0 AS remaining_requests,
            NOW() + INTERVAL '1 minute' AS reset_at,
            'minute' AS limit_type;
        RETURN;
    END IF;
    
    -- Count requests in current hour
    SELECT COALESCE(SUM(request_count), 0) INTO v_current_hour_count
    FROM rate_limit_tracking
    WHERE function_name = p_function_name
    AND (user_id = p_user_id OR ip_address = p_ip_address)
    AND window_start >= NOW() - INTERVAL '1 hour';
    
    -- Check hour limit (using effective limit)
    IF v_current_hour_count >= v_effective_limits.effective_limit_per_hour THEN
        RETURN QUERY
        SELECT 
            true AS is_limited,
            0 AS remaining_requests,
            NOW() + INTERVAL '1 hour' AS reset_at,
            'hour' AS limit_type;
        RETURN;
    END IF;
    
    -- Count requests in current day
    SELECT COALESCE(SUM(request_count), 0) INTO v_current_day_count
    FROM rate_limit_tracking
    WHERE function_name = p_function_name
    AND (user_id = p_user_id OR ip_address = p_ip_address)
    AND window_start >= NOW() - INTERVAL '1 day';
    
    -- Check day limit (using effective limit)
    IF v_current_day_count >= v_effective_limits.effective_limit_per_day THEN
        RETURN QUERY
        SELECT 
            true AS is_limited,
            0 AS remaining_requests,
            NOW() + INTERVAL '1 day' AS reset_at,
            'day' AS limit_type;
        RETURN;
    END IF;
    
    -- Not rate limited
    RETURN QUERY
    SELECT 
        false AS is_limited,
        v_effective_limits.effective_limit_per_minute - v_current_minute_count AS remaining_requests,
        NOW() + INTERVAL '1 minute' AS reset_at,
        'none' AS limit_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_effective_rate_limit(TEXT, UUID) TO authenticated;

-- Show current effective limits for different roles
SELECT 
    'create_payment' as function_name,
    'Customer' as role,
    5 as per_minute,
    30 as per_hour,
    100 as per_day
UNION ALL
SELECT 
    'create_payment',
    'Admin',
    5 * 50, -- 250/minute
    30 * 50, -- 1,500/hour
    100 * 50 -- 5,000/day
UNION ALL
SELECT 
    'create_payment',
    'Moderator',
    5 * 20, -- 100/minute
    30 * 20, -- 600/hour
    100 * 20; -- 2,000/day

COMMIT;

-- ============================================================================
-- SUMMARY: Role-Based Rate Limits
-- ============================================================================
-- Customers: 100 payment links/day (normal e-commerce use)
-- Moderators: 2,000 payment links/day (can handle many customers)
-- Admins: 5,000 payment links/day (full operational capacity)
-- 
-- This allows your business to scale while protecting against abuse
-- ============================================================================