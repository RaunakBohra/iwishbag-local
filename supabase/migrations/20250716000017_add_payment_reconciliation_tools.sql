-- Payment reconciliation tools for identifying discrepancies
-- Helps detect mismatches between expected and actual amounts, and between gateway reports and ledger

-- Table to store reconciliation results
CREATE TABLE IF NOT EXISTS payment_reconciliation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reconciliation_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'manual'
  gateway_code TEXT,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  total_transactions INTEGER,
  discrepancy_count INTEGER,
  total_discrepancy_amount NUMERIC(10,2),
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  resolved_count INTEGER DEFAULT 0,
  notes TEXT
);

-- Function to detect payment amount discrepancies
CREATE OR REPLACE FUNCTION detect_payment_discrepancies(
  p_start_date TIMESTAMP DEFAULT NOW() - INTERVAL '7 days',
  p_end_date TIMESTAMP DEFAULT NOW(),
  p_threshold_percent NUMERIC DEFAULT 0.01 -- 0.01% threshold
)
RETURNS TABLE (
  transaction_id UUID,
  quote_id UUID,
  payment_method TEXT,
  transaction_date TIMESTAMP,
  expected_amount NUMERIC,
  actual_amount NUMERIC,
  discrepancy_amount NUMERIC,
  discrepancy_percent NUMERIC,
  discrepancy_type TEXT,
  quote_display_id TEXT,
  gateway_transaction_id TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH payment_comparison AS (
    SELECT 
      pt.id,
      pt.quote_id,
      pt.payment_method,
      pt.created_at,
      q.final_total as quote_amount,
      pt.amount as payment_amount,
      pt.gateway_transaction_id,
      q.display_id,
      -- Check various discrepancy types
      CASE 
        WHEN pt.amount != q.final_total THEN 'amount_mismatch'
        WHEN pt.net_amount IS NULL OR pt.net_amount = 0 THEN 'missing_net_amount'
        WHEN pt.gateway_fee_amount IS NULL AND pt.status = 'completed' THEN 'missing_fee_data'
        WHEN pt.amount < pt.gateway_fee_amount THEN 'fee_exceeds_amount'
        ELSE NULL
      END as discrepancy_type
    FROM payment_transactions pt
    JOIN quotes q ON pt.quote_id = q.id
    WHERE pt.created_at BETWEEN p_start_date AND p_end_date
      AND pt.status IN ('completed', 'processing')
  )
  SELECT 
    pc.id as transaction_id,
    pc.quote_id,
    pc.payment_method,
    pc.created_at as transaction_date,
    pc.quote_amount as expected_amount,
    pc.payment_amount as actual_amount,
    ABS(pc.payment_amount - pc.quote_amount) as discrepancy_amount,
    CASE 
      WHEN pc.quote_amount > 0 
      THEN ABS((pc.payment_amount - pc.quote_amount) / pc.quote_amount * 100)
      ELSE 0 
    END as discrepancy_percent,
    pc.discrepancy_type,
    pc.display_id as quote_display_id,
    pc.gateway_transaction_id
  FROM payment_comparison pc
  WHERE pc.discrepancy_type IS NOT NULL
    OR ABS(pc.payment_amount - pc.quote_amount) > (pc.quote_amount * p_threshold_percent / 100)
  ORDER BY discrepancy_amount DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to reconcile ledger entries
CREATE OR REPLACE FUNCTION reconcile_payment_ledger(
  p_start_date DATE DEFAULT CURRENT_DATE - 7,
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  payment_transaction_id UUID,
  issue_type TEXT,
  expected_value NUMERIC,
  actual_value NUMERIC,
  discrepancy NUMERIC,
  details TEXT
) AS $$
BEGIN
  RETURN QUERY
  -- Check 1: Payment transactions without ledger entries
  SELECT 
    pt.id,
    'missing_ledger_entry'::TEXT,
    pt.amount,
    0::NUMERIC,
    pt.amount,
    'Payment transaction has no corresponding ledger entry'::TEXT
  FROM payment_transactions pt
  LEFT JOIN payment_ledger pl 
    ON pt.id = pl.payment_transaction_id 
    AND pl.payment_type = 'customer_payment'
  WHERE pt.created_at::DATE BETWEEN p_start_date AND p_end_date
    AND pt.status = 'completed'
    AND pl.id IS NULL
  
  UNION ALL
  
  -- Check 2: Gateway fees not recorded in ledger
  SELECT 
    pt.id,
    'missing_fee_ledger_entry'::TEXT,
    pt.gateway_fee_amount,
    0::NUMERIC,
    pt.gateway_fee_amount,
    'Gateway fee not recorded in payment ledger'::TEXT
  FROM payment_transactions pt
  LEFT JOIN payment_ledger pl 
    ON pt.id = pl.payment_transaction_id 
    AND pl.payment_type = 'gateway_fee'
  WHERE pt.created_at::DATE BETWEEN p_start_date AND p_end_date
    AND pt.status = 'completed'
    AND pt.gateway_fee_amount > 0
    AND pl.id IS NULL
  
  UNION ALL
  
  -- Check 3: Ledger amount mismatches
  SELECT 
    pt.id,
    'ledger_amount_mismatch'::TEXT,
    pt.amount,
    ABS(pl.amount),
    ABS(pt.amount - ABS(pl.amount)),
    'Payment amount differs from ledger amount'::TEXT
  FROM payment_transactions pt
  JOIN payment_ledger pl 
    ON pt.id = pl.payment_transaction_id 
    AND pl.payment_type = 'customer_payment'
  WHERE pt.created_at::DATE BETWEEN p_start_date AND p_end_date
    AND pt.status = 'completed'
    AND ABS(pt.amount - ABS(pl.amount)) > 0.01
  
  UNION ALL
  
  -- Check 4: Quote payment status vs actual payments
  SELECT 
    pt.id,
    'quote_payment_status_mismatch'::TEXT,
    q.final_total,
    q.amount_paid,
    ABS(q.final_total - q.amount_paid),
    CASE 
      WHEN q.payment_status = 'paid' AND q.amount_paid < q.final_total 
        THEN 'Quote marked as paid but amount_paid < final_total'
      WHEN q.payment_status = 'unpaid' AND q.amount_paid > 0 
        THEN 'Quote marked as unpaid but has payments'
      ELSE 'Payment status inconsistency'
    END::TEXT
  FROM payment_transactions pt
  JOIN quotes q ON pt.quote_id = q.id
  WHERE pt.created_at::DATE BETWEEN p_start_date AND p_end_date
    AND pt.status = 'completed'
    AND (
      (q.payment_status = 'paid' AND q.amount_paid < q.final_total) OR
      (q.payment_status = 'unpaid' AND q.amount_paid > 0)
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to validate fee calculations
CREATE OR REPLACE FUNCTION validate_fee_calculations(
  p_gateway_code TEXT DEFAULT NULL,
  p_sample_size INTEGER DEFAULT 100
)
RETURNS TABLE (
  transaction_id UUID,
  payment_method TEXT,
  amount NUMERIC,
  currency TEXT,
  recorded_fee NUMERIC,
  calculated_fee NUMERIC,
  fee_difference NUMERIC,
  difference_percent NUMERIC,
  validation_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH recent_transactions AS (
    SELECT 
      pt.id,
      pt.payment_method,
      pt.amount,
      pt.currency,
      pt.gateway_fee_amount,
      pt.quote_id
    FROM payment_transactions pt
    WHERE pt.status = 'completed'
      AND pt.gateway_fee_amount IS NOT NULL
      AND (p_gateway_code IS NULL OR pt.payment_method = p_gateway_code)
    ORDER BY pt.created_at DESC
    LIMIT p_sample_size
  ),
  calculated_fees AS (
    SELECT 
      rt.*,
      cf.fee_amount as calc_fee,
      q.destination_country
    FROM recent_transactions rt
    LEFT JOIN quotes q ON rt.quote_id = q.id
    CROSS JOIN LATERAL calculate_gateway_fee(
      rt.payment_method,
      rt.amount,
      rt.currency,
      q.destination_country
    ) cf
  )
  SELECT 
    cf.id as transaction_id,
    cf.payment_method,
    cf.amount,
    cf.currency,
    cf.gateway_fee_amount as recorded_fee,
    cf.calc_fee as calculated_fee,
    ABS(cf.gateway_fee_amount - cf.calc_fee) as fee_difference,
    CASE 
      WHEN cf.gateway_fee_amount > 0 
      THEN ABS((cf.gateway_fee_amount - cf.calc_fee) / cf.gateway_fee_amount * 100)
      ELSE 0 
    END as difference_percent,
    CASE 
      WHEN ABS(cf.gateway_fee_amount - cf.calc_fee) < 0.01 THEN 'exact_match'
      WHEN ABS(cf.gateway_fee_amount - cf.calc_fee) < 1.00 THEN 'acceptable_variance'
      WHEN cf.gateway_fee_amount > cf.calc_fee THEN 'overcharged'
      WHEN cf.gateway_fee_amount < cf.calc_fee THEN 'undercharged'
      ELSE 'review_required'
    END as validation_status
  FROM calculated_fees cf
  WHERE ABS(cf.gateway_fee_amount - cf.calc_fee) > 0.01
  ORDER BY fee_difference DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to perform comprehensive reconciliation
CREATE OR REPLACE FUNCTION perform_payment_reconciliation(
  p_reconciliation_type TEXT DEFAULT 'daily',
  p_gateway_code TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
  v_start_date TIMESTAMP;
  v_end_date TIMESTAMP;
  v_discrepancy_count INTEGER := 0;
  v_total_transactions INTEGER := 0;
  v_total_discrepancy_amount NUMERIC := 0;
  v_details JSONB;
BEGIN
  -- Determine date range based on reconciliation type
  CASE p_reconciliation_type
    WHEN 'daily' THEN
      v_start_date := CURRENT_DATE - INTERVAL '1 day';
      v_end_date := CURRENT_DATE;
    WHEN 'weekly' THEN
      v_start_date := CURRENT_DATE - INTERVAL '7 days';
      v_end_date := CURRENT_DATE;
    WHEN 'monthly' THEN
      v_start_date := DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month');
      v_end_date := DATE_TRUNC('month', CURRENT_DATE);
    ELSE
      v_start_date := CURRENT_DATE - INTERVAL '1 day';
      v_end_date := CURRENT_DATE;
  END CASE;
  
  -- Count total transactions
  SELECT COUNT(*) INTO v_total_transactions
  FROM payment_transactions
  WHERE created_at BETWEEN v_start_date AND v_end_date
    AND (p_gateway_code IS NULL OR payment_method = p_gateway_code);
  
  -- Get discrepancy summary
  WITH discrepancies AS (
    SELECT * FROM detect_payment_discrepancies(v_start_date, v_end_date)
  )
  SELECT 
    COUNT(*),
    COALESCE(SUM(discrepancy_amount), 0)
  INTO v_discrepancy_count, v_total_discrepancy_amount
  FROM discrepancies;
  
  -- Build detailed results
  v_details := jsonb_build_object(
    'payment_discrepancies', (
      SELECT jsonb_agg(row_to_json(d))
      FROM detect_payment_discrepancies(v_start_date, v_end_date) d
    ),
    'ledger_issues', (
      SELECT jsonb_agg(row_to_json(l))
      FROM reconcile_payment_ledger(v_start_date::DATE, v_end_date::DATE) l
    ),
    'fee_validations', (
      SELECT jsonb_agg(row_to_json(f))
      FROM validate_fee_calculations(p_gateway_code, 50) f
    )
  );
  
  -- Create reconciliation log entry
  INSERT INTO payment_reconciliation_logs (
    reconciliation_type,
    gateway_code,
    start_date,
    end_date,
    total_transactions,
    discrepancy_count,
    total_discrepancy_amount,
    status,
    details,
    created_by
  ) VALUES (
    p_reconciliation_type,
    p_gateway_code,
    v_start_date,
    v_end_date,
    v_total_transactions,
    v_discrepancy_count,
    v_total_discrepancy_amount,
    'completed',
    v_details,
    auth.uid()
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- View for recent reconciliation issues
CREATE OR REPLACE VIEW recent_reconciliation_issues AS
WITH latest_logs AS (
  SELECT *
  FROM payment_reconciliation_logs
  WHERE created_at > NOW() - INTERVAL '30 days'
    AND status = 'completed'
  ORDER BY created_at DESC
  LIMIT 10
)
SELECT 
  l.id,
  l.reconciliation_date,
  l.reconciliation_type,
  l.gateway_code,
  l.discrepancy_count,
  l.total_discrepancy_amount,
  l.total_transactions,
  ROUND((l.discrepancy_count::NUMERIC / NULLIF(l.total_transactions, 0) * 100), 2) as error_rate_percent,
  l.created_at,
  l.resolved_count,
  l.discrepancy_count - l.resolved_count as pending_resolution
FROM latest_logs l
WHERE l.discrepancy_count > 0
ORDER BY l.created_at DESC;

-- Helper function to mark discrepancies as resolved
CREATE OR REPLACE FUNCTION resolve_payment_discrepancy(
  p_transaction_id UUID,
  p_resolution_notes TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_log_id UUID;
BEGIN
  -- Find the most recent log containing this transaction
  SELECT id INTO v_log_id
  FROM payment_reconciliation_logs
  WHERE status = 'completed'
    AND details->'payment_discrepancies' @> jsonb_build_array(
      jsonb_build_object('transaction_id', p_transaction_id::TEXT)
    )
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_log_id IS NOT NULL THEN
    -- Update resolved count
    UPDATE payment_reconciliation_logs
    SET 
      resolved_count = resolved_count + 1,
      notes = COALESCE(notes || E'\n', '') || 
              'Resolved ' || p_transaction_id::TEXT || ': ' || p_resolution_notes
    WHERE id = v_log_id;
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT ON payment_reconciliation_logs TO authenticated;
GRANT SELECT ON recent_reconciliation_issues TO authenticated;

GRANT EXECUTE ON FUNCTION detect_payment_discrepancies TO authenticated;
GRANT EXECUTE ON FUNCTION reconcile_payment_ledger TO authenticated;
GRANT EXECUTE ON FUNCTION validate_fee_calculations TO authenticated;
GRANT EXECUTE ON FUNCTION perform_payment_reconciliation TO authenticated;
GRANT EXECUTE ON FUNCTION resolve_payment_discrepancy TO authenticated;

-- Add indexes for performance
CREATE INDEX idx_payment_reconciliation_logs_date 
ON payment_reconciliation_logs(reconciliation_date DESC, status);

CREATE INDEX idx_payment_reconciliation_logs_gateway 
ON payment_reconciliation_logs(gateway_code, created_at DESC)
WHERE gateway_code IS NOT NULL;

-- Add comments
COMMENT ON TABLE payment_reconciliation_logs IS 'Audit trail of payment reconciliation runs with detailed discrepancy information';
COMMENT ON FUNCTION detect_payment_discrepancies IS 'Identifies payment amount mismatches between quotes and actual payments';
COMMENT ON FUNCTION reconcile_payment_ledger IS 'Validates consistency between payment_transactions and payment_ledger tables';
COMMENT ON FUNCTION validate_fee_calculations IS 'Compares recorded gateway fees against calculated fees to detect discrepancies';
COMMENT ON FUNCTION perform_payment_reconciliation IS 'Runs comprehensive payment reconciliation and logs results';
COMMENT ON VIEW recent_reconciliation_issues IS 'Summary of recent reconciliation runs with unresolved discrepancies';