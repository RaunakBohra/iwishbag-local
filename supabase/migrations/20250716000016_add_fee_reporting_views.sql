-- Create comprehensive fee reporting views and functions
-- Provides visibility into payment gateway fees for financial reporting

-- View: Daily fee summary by gateway
CREATE OR REPLACE VIEW daily_gateway_fees AS
SELECT 
  DATE(created_at) as transaction_date,
  payment_method as gateway,
  currency,
  COUNT(*) as transaction_count,
  SUM(amount) as gross_volume,
  SUM(gateway_fee_amount) as total_fees,
  SUM(net_amount) as net_revenue,
  AVG(fee_percentage) as avg_fee_percentage,
  MIN(fee_percentage) as min_fee_percentage,
  MAX(fee_percentage) as max_fee_percentage
FROM payment_transactions
WHERE status = 'completed'
  AND gateway_fee_amount IS NOT NULL
GROUP BY DATE(created_at), payment_method, currency
ORDER BY transaction_date DESC, gateway;

-- View: Monthly fee summary with trends
CREATE OR REPLACE VIEW monthly_fee_summary AS
WITH monthly_data AS (
  SELECT 
    DATE_TRUNC('month', created_at) as month,
    payment_method as gateway,
    currency,
    COUNT(*) as transaction_count,
    SUM(amount) as gross_volume,
    SUM(gateway_fee_amount) as total_fees,
    SUM(net_amount) as net_revenue,
    AVG(fee_percentage) as avg_fee_percentage
  FROM payment_transactions
  WHERE status = 'completed'
    AND gateway_fee_amount IS NOT NULL
  GROUP BY DATE_TRUNC('month', created_at), payment_method, currency
),
previous_month AS (
  SELECT 
    month + INTERVAL '1 month' as next_month,
    gateway,
    currency,
    gross_volume as prev_gross_volume,
    total_fees as prev_total_fees
  FROM monthly_data
)
SELECT 
  m.month,
  m.gateway,
  m.currency,
  m.transaction_count,
  m.gross_volume,
  m.total_fees,
  m.net_revenue,
  m.avg_fee_percentage,
  -- Month-over-month growth
  CASE 
    WHEN p.prev_gross_volume > 0 THEN 
      ROUND(((m.gross_volume - p.prev_gross_volume) / p.prev_gross_volume * 100)::NUMERIC, 2)
    ELSE NULL 
  END as volume_growth_percent,
  CASE 
    WHEN p.prev_total_fees > 0 THEN 
      ROUND(((m.total_fees - p.prev_total_fees) / p.prev_total_fees * 100)::NUMERIC, 2)
    ELSE NULL 
  END as fee_growth_percent
FROM monthly_data m
LEFT JOIN previous_month p 
  ON m.month = p.next_month 
  AND m.gateway = p.gateway 
  AND m.currency = p.currency
ORDER BY m.month DESC, m.gateway;

-- View: Fee breakdown by country
CREATE OR REPLACE VIEW country_fee_analysis AS
SELECT 
  q.destination_country as country,
  pt.payment_method as gateway,
  pt.currency,
  COUNT(pt.id) as transaction_count,
  SUM(pt.amount) as gross_volume,
  SUM(pt.gateway_fee_amount) as total_fees,
  AVG(pt.fee_percentage) as avg_fee_percentage,
  SUM(pt.net_amount) as net_revenue
FROM payment_transactions pt
JOIN quotes q ON pt.quote_id = q.id
WHERE pt.status = 'completed'
  AND pt.gateway_fee_amount IS NOT NULL
GROUP BY q.destination_country, pt.payment_method, pt.currency
ORDER BY total_fees DESC;

-- View: High-fee transactions (for review)
CREATE OR REPLACE VIEW high_fee_transactions AS
SELECT 
  pt.id,
  pt.created_at,
  pt.transaction_id,
  pt.payment_method,
  pt.amount,
  pt.currency,
  pt.gateway_fee_amount,
  pt.fee_percentage,
  pt.net_amount,
  q.display_id as quote_display_id,
  q.destination_country
FROM payment_transactions pt
LEFT JOIN quotes q ON pt.quote_id = q.id
WHERE pt.status = 'completed'
  AND pt.fee_percentage > 5.0 -- Transactions with > 5% fees
ORDER BY pt.fee_percentage DESC;

-- Function: Get fee statistics for a date range
CREATE OR REPLACE FUNCTION get_fee_statistics(
  p_start_date DATE,
  p_end_date DATE,
  p_gateway TEXT DEFAULT NULL
)
RETURNS TABLE (
  gateway TEXT,
  currency TEXT,
  transaction_count BIGINT,
  gross_volume NUMERIC,
  total_fees NUMERIC,
  net_revenue NUMERIC,
  avg_fee_amount NUMERIC,
  avg_fee_percentage NUMERIC,
  max_fee_percentage NUMERIC,
  total_refunded NUMERIC,
  refund_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pt.payment_method as gateway,
    pt.currency,
    COUNT(DISTINCT pt.id)::BIGINT as transaction_count,
    SUM(pt.amount) as gross_volume,
    SUM(pt.gateway_fee_amount) as total_fees,
    SUM(pt.net_amount) as net_revenue,
    AVG(pt.gateway_fee_amount) as avg_fee_amount,
    AVG(pt.fee_percentage) as avg_fee_percentage,
    MAX(pt.fee_percentage) as max_fee_percentage,
    SUM(pt.total_refunded) as total_refunded,
    SUM(pt.refund_count)::BIGINT as refund_count
  FROM payment_transactions pt
  WHERE pt.created_at::DATE BETWEEN p_start_date AND p_end_date
    AND pt.status = 'completed'
    AND (p_gateway IS NULL OR pt.payment_method = p_gateway)
  GROUP BY pt.payment_method, pt.currency
  ORDER BY total_fees DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Compare fee rates across gateways
CREATE OR REPLACE FUNCTION compare_gateway_fees(
  p_amount NUMERIC,
  p_currency TEXT
)
RETURNS TABLE (
  gateway_code TEXT,
  calculated_fee NUMERIC,
  net_amount NUMERIC,
  fee_percentage NUMERIC,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pg.code as gateway_code,
    cf.fee_amount as calculated_fee,
    cf.net_amount,
    cf.fee_percentage,
    pg.is_active
  FROM payment_gateways pg
  CROSS JOIN LATERAL calculate_gateway_fee(
    pg.code,
    p_amount,
    p_currency
  ) cf
  WHERE pg.code IN ('payu', 'paypal', 'stripe', 'razorpay')
  ORDER BY cf.fee_amount ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Get revenue report with fee analysis
CREATE OR REPLACE FUNCTION get_revenue_report(
  p_period TEXT DEFAULT 'month', -- 'day', 'week', 'month', 'quarter', 'year'
  p_periods_back INTEGER DEFAULT 12
)
RETURNS TABLE (
  period_start DATE,
  period_label TEXT,
  total_transactions BIGINT,
  gross_revenue NUMERIC,
  total_fees NUMERIC,
  net_revenue NUMERIC,
  avg_transaction_size NUMERIC,
  effective_fee_rate NUMERIC,
  refund_amount NUMERIC,
  net_after_refunds NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH period_data AS (
    SELECT 
      DATE_TRUNC(p_period, pt.created_at)::DATE as period_start,
      COUNT(*) as transaction_count,
      SUM(pt.amount) as gross_amount,
      SUM(pt.gateway_fee_amount) as fee_amount,
      SUM(pt.net_amount) as net_amount,
      SUM(pt.total_refunded) as refunded_amount
    FROM payment_transactions pt
    WHERE pt.status = 'completed'
      AND pt.created_at >= DATE_TRUNC(p_period, CURRENT_DATE - (p_periods_back || ' ' || p_period)::INTERVAL)
    GROUP BY DATE_TRUNC(p_period, pt.created_at)
  )
  SELECT 
    pd.period_start,
    TO_CHAR(pd.period_start, 
      CASE p_period
        WHEN 'day' THEN 'DD Mon YYYY'
        WHEN 'week' THEN '"Week" W, YYYY'
        WHEN 'month' THEN 'Mon YYYY'
        WHEN 'quarter' THEN '"Q"Q YYYY'
        WHEN 'year' THEN 'YYYY'
      END
    ) as period_label,
    pd.transaction_count,
    pd.gross_amount,
    pd.fee_amount,
    pd.net_amount,
    CASE 
      WHEN pd.transaction_count > 0 
      THEN ROUND(pd.gross_amount / pd.transaction_count, 2)
      ELSE 0 
    END as avg_transaction_size,
    CASE 
      WHEN pd.gross_amount > 0 
      THEN ROUND((pd.fee_amount / pd.gross_amount * 100)::NUMERIC, 3)
      ELSE 0 
    END as effective_fee_rate,
    pd.refunded_amount,
    pd.net_amount - COALESCE(pd.refunded_amount, 0) as net_after_refunds
  FROM period_data pd
  ORDER BY pd.period_start DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Materialized view for performance: Gateway fee benchmarks
CREATE MATERIALIZED VIEW IF NOT EXISTS gateway_fee_benchmarks AS
SELECT 
  payment_method as gateway,
  currency,
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as transaction_count,
  percentile_cont(0.25) WITHIN GROUP (ORDER BY fee_percentage) as fee_p25,
  percentile_cont(0.50) WITHIN GROUP (ORDER BY fee_percentage) as fee_p50,
  percentile_cont(0.75) WITHIN GROUP (ORDER BY fee_percentage) as fee_p75,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY fee_percentage) as fee_p95,
  AVG(fee_percentage) as fee_avg,
  STDDEV(fee_percentage) as fee_stddev
FROM payment_transactions
WHERE status = 'completed'
  AND gateway_fee_amount > 0
  AND fee_percentage IS NOT NULL
GROUP BY payment_method, currency, DATE_TRUNC('month', created_at);

-- Create index on materialized view
CREATE INDEX idx_gateway_fee_benchmarks_lookup 
ON gateway_fee_benchmarks(gateway, currency, month DESC);

-- Grant permissions
GRANT SELECT ON daily_gateway_fees TO authenticated;
GRANT SELECT ON monthly_fee_summary TO authenticated;
GRANT SELECT ON country_fee_analysis TO authenticated;
GRANT SELECT ON high_fee_transactions TO authenticated;
GRANT SELECT ON gateway_fee_benchmarks TO authenticated;

GRANT EXECUTE ON FUNCTION get_fee_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION compare_gateway_fees TO authenticated;
GRANT EXECUTE ON FUNCTION get_revenue_report TO authenticated;

-- Add comments
COMMENT ON VIEW daily_gateway_fees IS 'Daily summary of payment gateway fees by gateway and currency';
COMMENT ON VIEW monthly_fee_summary IS 'Monthly fee analysis with month-over-month growth trends';
COMMENT ON VIEW country_fee_analysis IS 'Fee breakdown by destination country and gateway';
COMMENT ON VIEW high_fee_transactions IS 'Transactions with unusually high fee percentages for review';
COMMENT ON MATERIALIZED VIEW gateway_fee_benchmarks IS 'Statistical benchmarks for gateway fees by percentile';

COMMENT ON FUNCTION get_fee_statistics IS 'Get detailed fee statistics for a date range, optionally filtered by gateway';
COMMENT ON FUNCTION compare_gateway_fees IS 'Compare fee calculations across different payment gateways for a given amount';
COMMENT ON FUNCTION get_revenue_report IS 'Generate revenue report with fee analysis for specified time periods';