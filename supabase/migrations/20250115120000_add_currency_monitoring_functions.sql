-- Currency monitoring functions for admin dashboard

-- Function to detect currency mismatches between quotes and payments
CREATE OR REPLACE FUNCTION get_currency_mismatches(
    start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
    end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
    quote_id UUID,
    order_display_id TEXT,
    quote_currency TEXT,
    payment_currency TEXT,
    quote_amount DECIMAL,
    payment_amount DECIMAL,
    created_at TIMESTAMPTZ,
    payment_method TEXT,
    gateway_transaction_id TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        q.id as quote_id,
        q.order_display_id,
        q.final_currency as quote_currency,
        pl.currency as payment_currency,
        q.final_total as quote_amount,
        pl.amount as payment_amount,
        pl.payment_date as created_at,
        pl.payment_method,
        pl.gateway_transaction_id
    FROM quotes q
    JOIN payment_ledger pl ON q.id = pl.quote_id
    WHERE 
        pl.payment_date >= start_date
        AND pl.payment_date <= end_date
        AND pl.payment_type = 'customer_payment'
        AND pl.status = 'completed'
        AND q.final_currency != pl.currency
    ORDER BY pl.payment_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get currency statistics for monitoring dashboard
CREATE OR REPLACE FUNCTION get_currency_statistics(
    start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
    end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
    currency TEXT,
    total_payments DECIMAL,
    total_refunds DECIMAL,
    net_amount DECIMAL,
    payment_count BIGINT,
    refund_count BIGINT,
    average_payment DECIMAL,
    last_payment_date TIMESTAMPTZ,
    unique_customers BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH payment_stats AS (
        SELECT 
            pl.currency,
            SUM(CASE WHEN pl.payment_type = 'customer_payment' THEN pl.amount ELSE 0 END) as total_payments,
            SUM(CASE WHEN pl.payment_type IN ('refund', 'partial_refund') THEN pl.amount ELSE 0 END) as total_refunds,
            COUNT(CASE WHEN pl.payment_type = 'customer_payment' THEN 1 END) as payment_count,
            COUNT(CASE WHEN pl.payment_type IN ('refund', 'partial_refund') THEN 1 END) as refund_count,
            MAX(CASE WHEN pl.payment_type = 'customer_payment' THEN pl.payment_date END) as last_payment_date,
            COUNT(DISTINCT q.user_id) as unique_customers
        FROM payment_ledger pl
        JOIN quotes q ON pl.quote_id = q.id
        WHERE 
            pl.payment_date >= start_date
            AND pl.payment_date <= end_date
            AND pl.status = 'completed'
        GROUP BY pl.currency
    )
    SELECT 
        ps.currency,
        ps.total_payments,
        ps.total_refunds,
        (ps.total_payments - ps.total_refunds) as net_amount,
        ps.payment_count,
        ps.refund_count,
        CASE WHEN ps.payment_count > 0 THEN ps.total_payments / ps.payment_count ELSE 0 END as average_payment,
        ps.last_payment_date,
        ps.unique_customers
    FROM payment_stats ps
    ORDER BY (ps.total_payments - ps.total_refunds) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to detect suspicious payment amounts (same number, different currency)
CREATE OR REPLACE FUNCTION get_suspicious_payment_amounts(
    start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
    end_date TIMESTAMPTZ DEFAULT NOW(),
    tolerance DECIMAL DEFAULT 0.01
)
RETURNS TABLE (
    quote_id UUID,
    order_display_id TEXT,
    quote_amount DECIMAL,
    quote_currency TEXT,
    payment_amount DECIMAL,
    payment_currency TEXT,
    amount_difference DECIMAL,
    created_at TIMESTAMPTZ,
    suspicion_level TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        q.id as quote_id,
        q.order_display_id,
        q.final_total as quote_amount,
        q.final_currency as quote_currency,
        pl.amount as payment_amount,
        pl.currency as payment_currency,
        ABS(q.final_total - pl.amount) as amount_difference,
        pl.payment_date as created_at,
        CASE 
            WHEN ABS(q.final_total - pl.amount) < tolerance AND q.final_currency != pl.currency THEN 'HIGH'
            WHEN ABS(q.final_total - pl.amount) < (q.final_total * 0.05) AND q.final_currency != pl.currency THEN 'MEDIUM'
            ELSE 'LOW'
        END as suspicion_level
    FROM quotes q
    JOIN payment_ledger pl ON q.id = pl.quote_id
    WHERE 
        pl.payment_date >= start_date
        AND pl.payment_date <= end_date
        AND pl.payment_type = 'customer_payment'
        AND pl.status = 'completed'
        AND q.final_currency != pl.currency
        AND ABS(q.final_total - pl.amount) < GREATEST(q.final_total * 0.1, 100) -- Within 10% or 100 units
    ORDER BY 
        CASE 
            WHEN ABS(q.final_total - pl.amount) < tolerance THEN 1
            WHEN ABS(q.final_total - pl.amount) < (q.final_total * 0.05) THEN 2
            ELSE 3
        END,
        pl.payment_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get exchange rate health status
CREATE OR REPLACE FUNCTION get_exchange_rate_health()
RETURNS TABLE (
    currency TEXT,
    current_rate DECIMAL,
    last_updated TIMESTAMPTZ,
    is_stale BOOLEAN,
    is_fallback BOOLEAN,
    age_minutes BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cs.currency,
        cs.rate_from_usd as current_rate,
        cs.updated_at as last_updated,
        (cs.updated_at < NOW() - INTERVAL '1 hour') as is_stale,
        (cs.rate_from_usd = 1 AND cs.currency != 'USD') as is_fallback,
        EXTRACT(EPOCH FROM (NOW() - cs.updated_at)) / 60 as age_minutes
    FROM country_settings cs
    WHERE cs.rate_from_usd IS NOT NULL
    ORDER BY 
        (cs.updated_at < NOW() - INTERVAL '1 hour') DESC,
        cs.currency ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get currency conversion accuracy metrics
CREATE OR REPLACE FUNCTION get_currency_conversion_metrics(
    start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
    end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
    currency_pair TEXT,
    conversion_count BIGINT,
    average_variance DECIMAL,
    max_variance DECIMAL,
    accuracy_score DECIMAL
) AS $$
BEGIN
    -- This would be used to track how accurate our currency conversions are
    -- compared to actual payment gateway conversions
    RETURN QUERY
    WITH conversion_data AS (
        SELECT 
            CONCAT(q.final_currency, ' → ', pl.currency) as currency_pair,
            COUNT(*) as conversion_count,
            AVG(ABS((q.final_total * COALESCE(pl.exchange_rate, 1)) - pl.amount) / pl.amount * 100) as avg_variance,
            MAX(ABS((q.final_total * COALESCE(pl.exchange_rate, 1)) - pl.amount) / pl.amount * 100) as max_variance
        FROM quotes q
        JOIN payment_ledger pl ON q.id = pl.quote_id
        WHERE 
            pl.payment_date >= start_date
            AND pl.payment_date <= end_date
            AND pl.payment_type = 'customer_payment'
            AND pl.status = 'completed'
            AND q.final_currency != pl.currency
            AND pl.amount > 0
        GROUP BY q.final_currency, pl.currency
        HAVING COUNT(*) >= 3 -- Only include pairs with sufficient data
    )
    SELECT 
        cd.currency_pair,
        cd.conversion_count,
        cd.avg_variance as average_variance,
        cd.max_variance,
        GREATEST(0, 100 - cd.avg_variance) as accuracy_score
    FROM conversion_data cd
    ORDER BY cd.avg_variance DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_currency_mismatches TO authenticated;
GRANT EXECUTE ON FUNCTION get_currency_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION get_suspicious_payment_amounts TO authenticated;
GRANT EXECUTE ON FUNCTION get_exchange_rate_health TO authenticated;
GRANT EXECUTE ON FUNCTION get_currency_conversion_metrics TO authenticated;

-- Comments
COMMENT ON FUNCTION get_currency_mismatches IS 'Detects payments made in different currency than quote';
COMMENT ON FUNCTION get_currency_statistics IS 'Provides currency usage statistics for monitoring dashboard';
COMMENT ON FUNCTION get_suspicious_payment_amounts IS 'Identifies potentially incorrectly recorded payment amounts';
COMMENT ON FUNCTION get_exchange_rate_health IS 'Monitors exchange rate freshness and accuracy';
COMMENT ON FUNCTION get_currency_conversion_metrics IS 'Tracks accuracy of currency conversion estimates';