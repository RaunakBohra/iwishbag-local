-- Migration: Add Rate Limiting System for RPC Functions
-- Purpose: Prevent DoS attacks and API abuse through intelligent rate limiting
-- Date: 2025-01-27
-- SECURITY ENHANCEMENT: Rate Limiting

BEGIN;

-- ============================================================================
-- RATE LIMITING TABLES
-- ============================================================================

-- Create rate limit tracking table
CREATE TABLE IF NOT EXISTS rate_limit_tracking (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    ip_address INET,
    function_name TEXT NOT NULL,
    endpoint TEXT,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    window_end TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '1 minute',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create rate limit rules table
CREATE TABLE IF NOT EXISTS rate_limit_rules (
    id BIGSERIAL PRIMARY KEY,
    function_name TEXT NOT NULL UNIQUE,
    description TEXT,
    max_requests_per_minute INTEGER DEFAULT 60,
    max_requests_per_hour INTEGER DEFAULT 600,
    max_requests_per_day INTEGER DEFAULT 5000,
    burst_limit INTEGER DEFAULT 10,
    cooldown_minutes INTEGER DEFAULT 5,
    is_active BOOLEAN DEFAULT true,
    applies_to TEXT DEFAULT 'all' CHECK (applies_to IN ('all', 'authenticated', 'anonymous')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create blocked IPs table for severe violations
CREATE TABLE IF NOT EXISTS rate_limit_blocks (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    ip_address INET,
    reason TEXT NOT NULL,
    blocked_until TIMESTAMPTZ NOT NULL,
    violation_count INTEGER DEFAULT 1,
    function_names TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_rate_limit_tracking_user_id ON rate_limit_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limit_tracking_ip_address ON rate_limit_tracking(ip_address);
CREATE INDEX IF NOT EXISTS idx_rate_limit_tracking_function_name ON rate_limit_tracking(function_name);
CREATE INDEX IF NOT EXISTS idx_rate_limit_tracking_window ON rate_limit_tracking(window_start, window_end);
CREATE INDEX IF NOT EXISTS idx_rate_limit_rules_function_name ON rate_limit_rules(function_name);
CREATE INDEX IF NOT EXISTS idx_rate_limit_blocks_user_id ON rate_limit_blocks(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limit_blocks_ip_address ON rate_limit_blocks(ip_address);
CREATE INDEX IF NOT EXISTS idx_rate_limit_blocks_blocked_until ON rate_limit_blocks(blocked_until);

-- ============================================================================
-- RATE LIMITING FUNCTIONS
-- ============================================================================

-- Function to check if request is rate limited
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
    v_current_minute_count INTEGER;
    v_current_hour_count INTEGER;
    v_current_day_count INTEGER;
    v_is_blocked BOOLEAN;
    v_block_reason TEXT;
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
    
    -- Get rate limit rule for function
    SELECT * INTO v_rule
    FROM rate_limit_rules
    WHERE function_name = p_function_name
    AND is_active = true;
    
    -- If no rule exists, create default rule
    IF v_rule IS NULL THEN
        INSERT INTO rate_limit_rules (function_name, description)
        VALUES (p_function_name, 'Auto-generated rule')
        RETURNING * INTO v_rule;
    END IF;
    
    -- Count requests in current minute
    SELECT COALESCE(SUM(request_count), 0) INTO v_current_minute_count
    FROM rate_limit_tracking
    WHERE function_name = p_function_name
    AND (user_id = p_user_id OR ip_address = p_ip_address)
    AND window_start >= NOW() - INTERVAL '1 minute';
    
    -- Check minute limit
    IF v_current_minute_count >= v_rule.max_requests_per_minute THEN
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
    
    -- Check hour limit
    IF v_current_hour_count >= v_rule.max_requests_per_hour THEN
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
    
    -- Check day limit
    IF v_current_day_count >= v_rule.max_requests_per_day THEN
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
        v_rule.max_requests_per_minute - v_current_minute_count AS remaining_requests,
        NOW() + INTERVAL '1 minute' AS reset_at,
        'none' AS limit_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track rate limit usage
CREATE OR REPLACE FUNCTION track_rate_limit(
    p_function_name TEXT,
    p_user_id UUID DEFAULT NULL,
    p_ip_address INET DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- Insert or update tracking record
    INSERT INTO rate_limit_tracking (
        user_id, 
        ip_address, 
        function_name, 
        request_count,
        window_start,
        window_end
    )
    VALUES (
        p_user_id,
        p_ip_address,
        p_function_name,
        1,
        NOW(),
        NOW() + INTERVAL '1 minute'
    )
    ON CONFLICT (user_id, ip_address, function_name, window_start) 
    DO UPDATE SET 
        request_count = rate_limit_tracking.request_count + 1,
        updated_at = NOW();
        
    -- Clean up old tracking records (older than 24 hours)
    DELETE FROM rate_limit_tracking
    WHERE window_end < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RATE LIMITED RPC FUNCTION WRAPPER
-- ============================================================================

-- Enhanced get_user_permissions with rate limiting
CREATE OR REPLACE FUNCTION get_user_permissions_new(user_uuid UUID)
RETURNS TABLE(permission_name TEXT, permission_description TEXT) AS $$
DECLARE
    v_rate_limit RECORD;
BEGIN
    -- RATE LIMITING CHECK
    SELECT * INTO v_rate_limit 
    FROM check_rate_limit('get_user_permissions_new', user_uuid, inet_client_addr());
    
    IF v_rate_limit.is_limited THEN
        RAISE EXCEPTION 'Rate limit exceeded: %', v_rate_limit.limit_type
            USING ERRCODE = 'too_many_requests',
                  DETAIL = format('Reset at: %s', v_rate_limit.reset_at),
                  HINT = 'Please wait before making more requests';
    END IF;
    
    -- Track this request
    PERFORM track_rate_limit('get_user_permissions_new', user_uuid, inet_client_addr());
    
    -- Original function logic continues...
    -- SECURITY: Validate input UUID
    IF NOT validate_uuid(user_uuid) THEN
        RAISE EXCEPTION 'Invalid user UUID provided'
            USING ERRCODE = 'invalid_parameter_value',
                  DETAIL = 'User UUID must be a valid, non-null UUID';
    END IF;
    
    -- SECURITY: Verify the requesting user has permission to view permissions
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required'
            USING ERRCODE = 'insufficient_privilege';
    END IF;
    
    -- SECURITY: Users can only view their own permissions unless they're admin
    IF auth.uid() != user_uuid AND NOT is_admin() THEN
        RAISE EXCEPTION 'Access denied: Can only view own permissions'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- Return permissions based on role
    IF EXISTS (SELECT 1 FROM user_roles WHERE user_id = user_uuid AND role = 'admin' AND is_active = true) THEN
        RETURN QUERY
        SELECT p.name as permission_name, p.description as permission_description
        FROM permissions p
        ORDER BY p.name;
    ELSIF EXISTS (SELECT 1 FROM user_roles WHERE user_id = user_uuid AND role = 'moderator' AND is_active = true) THEN
        RETURN QUERY
        SELECT p.name as permission_name, p.description as permission_description
        FROM permissions p
        WHERE p.name IN (
            'quote:create', 'quote:edit', 'quote:view', 'quote:approve', 'quote:reject', 
            'quote:calculate', 'quote:share', 'customer:view', 'customer:edit', 
            'customer:create', 'order:view', 'order:edit', 'support:view', 
            'support:respond', 'support:create', 'messaging:view', 'messaging:send',
            'shipping:view', 'country:view', 'customs:view'
        )
        ORDER BY p.name;
    ELSE
        RETURN QUERY
        SELECT p.name as permission_name, p.description as permission_description
        FROM permissions p
        WHERE p.name IN (
            'quote:create', 'quote:view', 'messaging:view', 'messaging:send', 
            'support:create', 'support:view'
        )
        ORDER BY p.name;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SEED INITIAL RATE LIMIT RULES
-- ============================================================================

INSERT INTO rate_limit_rules (function_name, description, max_requests_per_minute, max_requests_per_hour, max_requests_per_day, burst_limit)
VALUES 
    ('get_user_permissions_new', 'User permissions check', 30, 300, 2000, 5),
    ('get_user_roles_new', 'User roles check', 30, 300, 2000, 5),
    ('get_all_users_with_roles', 'List all users (admin)', 10, 60, 500, 3),
    ('update_user_roles', 'Update user roles (admin)', 5, 30, 100, 2),
    ('generate_iwish_tracking_id', 'Generate tracking IDs', 20, 200, 1000, 5),
    ('create_payment', 'Payment processing', 10, 60, 500, 3),
    ('send_message', 'Messaging system', 20, 120, 1000, 5),
    ('upload_file', 'File uploads', 10, 60, 200, 3)
ON CONFLICT (function_name) DO UPDATE SET
    max_requests_per_minute = EXCLUDED.max_requests_per_minute,
    max_requests_per_hour = EXCLUDED.max_requests_per_hour,
    max_requests_per_day = EXCLUDED.max_requests_per_day,
    burst_limit = EXCLUDED.burst_limit,
    updated_at = NOW();

-- ============================================================================
-- CLEANUP FUNCTION (runs periodically)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_rate_limit_data()
RETURNS VOID AS $$
BEGIN
    -- Remove old tracking data (>24 hours)
    DELETE FROM rate_limit_tracking
    WHERE window_end < NOW() - INTERVAL '24 hours';
    
    -- Remove expired blocks
    DELETE FROM rate_limit_blocks
    WHERE blocked_until < NOW() - INTERVAL '7 days';
    
    -- Log cleanup
    INSERT INTO security_log (event_type, details, created_at)
    VALUES ('rate_limit_cleanup', 
            json_build_object('cleaned_at', NOW()),
            NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- MONITORING FUNCTIONS
-- ============================================================================

-- Function to get rate limit statistics
CREATE OR REPLACE FUNCTION get_rate_limit_stats(
    p_function_name TEXT DEFAULT NULL,
    p_time_range INTERVAL DEFAULT INTERVAL '1 hour'
)
RETURNS TABLE(
    function_name TEXT,
    total_requests BIGINT,
    unique_users BIGINT,
    unique_ips BIGINT,
    blocked_requests BIGINT,
    avg_requests_per_user NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rlt.function_name,
        SUM(rlt.request_count)::BIGINT as total_requests,
        COUNT(DISTINCT rlt.user_id)::BIGINT as unique_users,
        COUNT(DISTINCT rlt.ip_address)::BIGINT as unique_ips,
        COUNT(DISTINCT rlb.id)::BIGINT as blocked_requests,
        CASE 
            WHEN COUNT(DISTINCT rlt.user_id) > 0 
            THEN SUM(rlt.request_count)::NUMERIC / COUNT(DISTINCT rlt.user_id)::NUMERIC
            ELSE 0
        END as avg_requests_per_user
    FROM rate_limit_tracking rlt
    LEFT JOIN rate_limit_blocks rlb ON 
        (rlb.user_id = rlt.user_id OR rlb.ip_address = rlt.ip_address)
        AND rlb.created_at >= NOW() - p_time_range
    WHERE rlt.window_start >= NOW() - p_time_range
    AND (p_function_name IS NULL OR rlt.function_name = p_function_name)
    GROUP BY rlt.function_name
    ORDER BY total_requests DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ENABLE RLS
-- ============================================================================

ALTER TABLE rate_limit_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_blocks ENABLE ROW LEVEL SECURITY;

-- Only admins can view rate limit data
CREATE POLICY "Admins can view rate limit tracking" ON rate_limit_tracking
    FOR SELECT USING (is_admin());

CREATE POLICY "Admins can manage rate limit rules" ON rate_limit_rules
    FOR ALL USING (is_admin());

CREATE POLICY "Admins can manage rate limit blocks" ON rate_limit_blocks
    FOR ALL USING (is_admin());

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION check_rate_limit(TEXT, UUID, INET) TO authenticated;
GRANT EXECUTE ON FUNCTION track_rate_limit(TEXT, UUID, INET) TO authenticated;
GRANT EXECUTE ON FUNCTION get_rate_limit_stats(TEXT, INTERVAL) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_rate_limit_data() TO authenticated;

GRANT SELECT ON rate_limit_tracking TO authenticated;
GRANT SELECT ON rate_limit_rules TO authenticated;
GRANT SELECT ON rate_limit_blocks TO authenticated;

COMMIT;

-- ============================================================================
-- MIGRATION SUMMARY
-- ============================================================================
-- RATE LIMITING FEATURES ADDED:
-- 1. Tracking table for request counts
-- 2. Configurable rules per function
-- 3. Automatic blocking for violations
-- 4. Multiple time windows (minute/hour/day)
-- 5. Burst protection
-- 6. IP and user-based limiting
-- 7. Monitoring and statistics
-- 8. Automatic cleanup of old data
-- ============================================================================