-- Add API versioning support to RPC functions

BEGIN;

-- Create API version tracking table
CREATE TABLE IF NOT EXISTS api_usage_analytics (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    api_version TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    user_agent TEXT,
    ip_address INET,
    response_time_ms INTEGER,
    status_code INTEGER,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for analytics
CREATE INDEX IF NOT EXISTS idx_api_usage_analytics_created_at ON api_usage_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_analytics_user_id ON api_usage_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_analytics_version ON api_usage_analytics(api_version);
CREATE INDEX IF NOT EXISTS idx_api_usage_analytics_endpoint ON api_usage_analytics(endpoint);

-- Function to log API usage
CREATE OR REPLACE FUNCTION log_api_usage(
    p_api_version TEXT DEFAULT 'v1',
    p_endpoint TEXT DEFAULT '',
    p_user_agent TEXT DEFAULT NULL,
    p_response_time_ms INTEGER DEFAULT NULL,
    p_status_code INTEGER DEFAULT 200,
    p_error_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO api_usage_analytics (
        user_id,
        api_version,
        endpoint,
        user_agent,
        ip_address,
        response_time_ms,
        status_code,
        error_message
    ) VALUES (
        auth.uid(),
        p_api_version,
        p_endpoint,
        p_user_agent,
        inet_client_addr(),
        p_response_time_ms,
        p_status_code,
        p_error_message
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Version-aware quote fetching function
CREATE OR REPLACE FUNCTION get_quotes_versioned(
    p_api_version TEXT DEFAULT 'v1',
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_quotes RECORD;
    v_quote_array JSONB := '[]'::JSONB;
    v_start_time TIMESTAMP := CLOCK_TIMESTAMP();
    v_response_time_ms INTEGER;
BEGIN
    -- Log API usage
    PERFORM log_api_usage(p_api_version, 'get_quotes_versioned');
    
    -- Version validation
    IF p_api_version NOT IN ('v0.9', 'v1', 'v1.1') THEN
        RAISE EXCEPTION 'Unsupported API version: %', p_api_version;
    END IF;
    
    -- Get quotes based on user permissions
    FOR v_quotes IN 
        SELECT q.*, 
               c.name as customer_name,
               c.email as customer_email
        FROM quotes q
        LEFT JOIN customer_profiles c ON q.customer_profile_id = c.id
        WHERE (
            -- Admin can see all quotes
            EXISTS(SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin' AND is_active = true)
            OR
            -- Users can see their own quotes
            q.customer_profile_id IN (
                SELECT id FROM customer_profiles WHERE user_id = auth.uid()
            )
        )
        ORDER BY q.created_at DESC
        LIMIT p_limit OFFSET p_offset
    LOOP
        -- Transform data based on API version
        IF p_api_version = 'v0.9' THEN
            -- Legacy v0.9 format
            v_quote_array := v_quote_array || jsonb_build_object(
                'id', v_quotes.id,
                'quote_number', v_quotes.quote_number,
                'total_cost', COALESCE(v_quotes.total_amount, 0),
                'shipping_cost', COALESCE(v_quotes.shipping_fee, 0),
                'status', v_quotes.status,
                'customer_name', v_quotes.customer_name,
                'customer_email', v_quotes.customer_email,
                'created_at', v_quotes.created_at,
                'updated_at', v_quotes.updated_at
            );
        ELSIF p_api_version = 'v1' THEN
            -- Current v1 format
            v_quote_array := v_quote_array || jsonb_build_object(
                'id', v_quotes.id,
                'quote_number', v_quotes.quote_number,
                'total_amount', v_quotes.total_amount,
                'shipping_fee', v_quotes.shipping_fee,
                'tax_amount', v_quotes.tax_amount,
                'status', v_quotes.status,
                'customer_profile_id', v_quotes.customer_profile_id,
                'customer_data', v_quotes.customer_data,
                'items', v_quotes.items,
                'created_at', v_quotes.created_at,
                'updated_at', v_quotes.updated_at
            );
        ELSE -- v1.1
            -- Enhanced v1.1 format with additional fields
            v_quote_array := v_quote_array || jsonb_build_object(
                'id', v_quotes.id,
                'quote_number', v_quotes.quote_number,
                'total_amount', v_quotes.total_amount,
                'shipping_fee', v_quotes.shipping_fee,
                'tax_amount', v_quotes.tax_amount,
                'status', v_quotes.status,
                'customer_profile_id', v_quotes.customer_profile_id,
                'customer_data', v_quotes.customer_data,
                'calculation_data', v_quotes.calculation_data,
                'items', v_quotes.items,
                'tracking_id', v_quotes.tracking_id,
                'created_at', v_quotes.created_at,
                'updated_at', v_quotes.updated_at,
                'expires_at', v_quotes.expires_at
            );
        END IF;
    END LOOP;
    
    -- Calculate response time
    v_response_time_ms := EXTRACT(EPOCH FROM (CLOCK_TIMESTAMP() - v_start_time)) * 1000;
    
    -- Build response with version info
    v_result := jsonb_build_object(
        'data', v_quote_array,
        'version', p_api_version,
        'count', jsonb_array_length(v_quote_array),
        'limit', p_limit,
        'offset', p_offset,
        'response_time_ms', v_response_time_ms
    );
    
    -- Add deprecation warning for old versions
    IF p_api_version = 'v0.9' THEN
        v_result := v_result || jsonb_build_object(
            'deprecated', true,
            'deprecation_message', 'API version v0.9 is deprecated. Please upgrade to v1.1. Support ends on 2025-06-30.',
            'sunset_date', '2025-12-31'
        );
    END IF;
    
    -- Log successful response time
    PERFORM log_api_usage(p_api_version, 'get_quotes_versioned', NULL, v_response_time_ms, 200);
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log error
        PERFORM log_api_usage(p_api_version, 'get_quotes_versioned', NULL, NULL, 500, SQLERRM);
        RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Version-aware customer fetching function
CREATE OR REPLACE FUNCTION get_customers_versioned(
    p_api_version TEXT DEFAULT 'v1',
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_customers RECORD;
    v_customer_array JSONB := '[]'::JSONB;
    v_start_time TIMESTAMP := CLOCK_TIMESTAMP();
    v_response_time_ms INTEGER;
BEGIN
    -- Log API usage
    PERFORM log_api_usage(p_api_version, 'get_customers_versioned');
    
    -- Version validation
    IF p_api_version NOT IN ('v0.9', 'v1', 'v1.1') THEN
        RAISE EXCEPTION 'Unsupported API version: %', p_api_version;
    END IF;
    
    -- Admin only function
    IF NOT EXISTS(SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin' AND is_active = true) THEN
        RAISE EXCEPTION 'Admin access required';
    END IF;
    
    -- Get customers
    FOR v_customers IN 
        SELECT * FROM customer_profiles
        ORDER BY created_at DESC
        LIMIT p_limit OFFSET p_offset
    LOOP
        -- Transform data based on API version
        IF p_api_version = 'v0.9' THEN
            -- Legacy v0.9 format
            v_customer_array := v_customer_array || jsonb_build_object(
                'id', v_customers.id,
                'full_name', v_customers.name,
                'contact_number', v_customers.phone,
                'email_address', v_customers.email,
                'created_at', v_customers.created_at
            );
        ELSE -- v1 and v1.1
            -- Current format
            v_customer_array := v_customer_array || jsonb_build_object(
                'id', v_customers.id,
                'name', v_customers.name,
                'phone', v_customers.phone,
                'email', v_customers.email,
                'user_id', v_customers.user_id,
                'created_at', v_customers.created_at,
                'updated_at', v_customers.updated_at
            );
        END IF;
    END LOOP;
    
    -- Calculate response time
    v_response_time_ms := EXTRACT(EPOCH FROM (CLOCK_TIMESTAMP() - v_start_time)) * 1000;
    
    -- Build response
    v_result := jsonb_build_object(
        'data', v_customer_array,
        'version', p_api_version,
        'count', jsonb_array_length(v_customer_array),
        'limit', p_limit,
        'offset', p_offset,
        'response_time_ms', v_response_time_ms
    );
    
    -- Add deprecation warning for old versions
    IF p_api_version = 'v0.9' THEN
        v_result := v_result || jsonb_build_object(
            'deprecated', true,
            'deprecation_message', 'API version v0.9 is deprecated. Customer data structure has been updated. Please upgrade to v1.1.',
            'sunset_date', '2025-12-31'
        );
    END IF;
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        PERFORM log_api_usage(p_api_version, 'get_customers_versioned', NULL, NULL, 500, SQLERRM);
        RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get API usage analytics (admin only)
CREATE OR REPLACE FUNCTION get_api_analytics(
    p_days INTEGER DEFAULT 30
)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_version_stats JSONB;
    v_endpoint_stats JSONB;
    v_error_stats JSONB;
BEGIN
    -- Admin only
    IF NOT EXISTS(SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin' AND is_active = true) THEN
        RAISE EXCEPTION 'Admin access required';
    END IF;
    
    -- Version usage statistics
    SELECT jsonb_agg(
        jsonb_build_object(
            'version', api_version,
            'total_calls', total_calls,
            'avg_response_time', avg_response_time,
            'error_rate', error_rate
        )
    ) INTO v_version_stats
    FROM (
        SELECT 
            api_version,
            COUNT(*) as total_calls,
            ROUND(AVG(response_time_ms)) as avg_response_time,
            ROUND((COUNT(*) FILTER (WHERE status_code >= 400) * 100.0 / COUNT(*)), 2) as error_rate
        FROM api_usage_analytics
        WHERE created_at >= NOW() - INTERVAL '%s days' % p_days
        GROUP BY api_version
        ORDER BY total_calls DESC
    ) stats;
    
    -- Endpoint usage statistics
    SELECT jsonb_agg(
        jsonb_build_object(
            'endpoint', endpoint,
            'total_calls', total_calls,
            'avg_response_time', avg_response_time
        )
    ) INTO v_endpoint_stats
    FROM (
        SELECT 
            endpoint,
            COUNT(*) as total_calls,
            ROUND(AVG(response_time_ms)) as avg_response_time
        FROM api_usage_analytics
        WHERE created_at >= NOW() - INTERVAL '%s days' % p_days
        GROUP BY endpoint
        ORDER BY total_calls DESC
        LIMIT 10
    ) stats;
    
    -- Error statistics
    SELECT jsonb_agg(
        jsonb_build_object(
            'error', error_message,
            'count', error_count,
            'last_seen', last_seen
        )
    ) INTO v_error_stats
    FROM (
        SELECT 
            error_message,
            COUNT(*) as error_count,
            MAX(created_at) as last_seen
        FROM api_usage_analytics
        WHERE created_at >= NOW() - INTERVAL '%s days' % p_days
        AND status_code >= 400
        AND error_message IS NOT NULL
        GROUP BY error_message
        ORDER BY error_count DESC
        LIMIT 10
    ) stats;
    
    v_result := jsonb_build_object(
        'period_days', p_days,
        'version_usage', COALESCE(v_version_stats, '[]'::jsonb),
        'endpoint_usage', COALESCE(v_endpoint_stats, '[]'::jsonb),
        'error_summary', COALESCE(v_error_stats, '[]'::jsonb),
        'generated_at', NOW()
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION log_api_usage(TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_quotes_versioned(TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_customers_versioned(TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_api_analytics(INTEGER) TO authenticated;

-- RLS policies for api_usage_analytics
ALTER TABLE api_usage_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all API analytics" ON api_usage_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() AND role = 'admin' AND is_active = true
        )
    );

CREATE POLICY "System can insert API analytics" ON api_usage_analytics
    FOR INSERT WITH CHECK (true);

COMMIT;