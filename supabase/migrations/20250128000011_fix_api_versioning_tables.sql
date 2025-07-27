-- Fix API versioning functions to use correct table names

BEGIN;

-- Update get_quotes_versioned to use correct table structure
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
               p.full_name as customer_name,
               au.email as customer_email
        FROM quotes q
        LEFT JOIN profiles p ON q.user_id = p.id
        LEFT JOIN auth.users au ON q.user_id = au.id
        WHERE (
            -- Admin can see all quotes
            EXISTS(SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin' AND is_active = true)
            OR
            -- Users can see their own quotes
            q.user_id = auth.uid()
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
                'user_id', v_quotes.user_id,
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
                'user_id', v_quotes.user_id,
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

-- Update get_customers_versioned to use profiles table
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
    
    -- Get customers from profiles and auth.users
    FOR v_customers IN 
        SELECT p.*, au.email
        FROM profiles p
        JOIN auth.users au ON p.id = au.id
        ORDER BY p.created_at DESC
        LIMIT p_limit OFFSET p_offset
    LOOP
        -- Transform data based on API version
        IF p_api_version = 'v0.9' THEN
            -- Legacy v0.9 format
            v_customer_array := v_customer_array || jsonb_build_object(
                'id', v_customers.id,
                'full_name', v_customers.full_name,
                'contact_number', v_customers.phone,
                'email_address', v_customers.email,
                'created_at', v_customers.created_at
            );
        ELSE -- v1 and v1.1
            -- Current format
            v_customer_array := v_customer_array || jsonb_build_object(
                'id', v_customers.id,
                'full_name', v_customers.full_name,
                'phone', v_customers.phone,
                'email', v_customers.email,
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

COMMIT;