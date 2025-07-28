-- Storage Fee Automation System
-- This migration creates the automated storage fee calculation system

-- Create or replace the enhanced storage fee calculation function
CREATE OR REPLACE FUNCTION calculate_and_create_storage_fees()
RETURNS TABLE(
  processed_count INTEGER,
  new_fees_count INTEGER,
  total_fees_amount NUMERIC
) AS $$
DECLARE
  v_config JSONB;
  v_free_days INTEGER DEFAULT 30;
  v_daily_rate NUMERIC DEFAULT 1.00;
  v_late_threshold INTEGER DEFAULT 90;
  v_late_rate NUMERIC DEFAULT 2.00;
  v_processed INTEGER := 0;
  v_new_fees INTEGER := 0;
  v_total_amount NUMERIC := 0;
  v_package RECORD;
  v_start_date DATE;
  v_days_stored INTEGER;
  v_fee_type TEXT;
  v_daily_fee NUMERIC;
  v_total_fee NUMERIC;
  v_existing_fee_id UUID;
BEGIN
  -- Get configuration
  SELECT config_data INTO v_config
  FROM unified_configuration
  WHERE config_key = 'storage_fees'
    AND config_type = 'system';
  
  IF v_config IS NOT NULL THEN
    v_free_days := COALESCE((v_config->>'freeDays')::INTEGER, v_free_days);
    v_daily_rate := COALESCE((v_config->>'dailyRateUSD')::NUMERIC, v_daily_rate);
    v_late_threshold := COALESCE((v_config->>'lateFeeThresholdDays')::INTEGER, v_late_threshold);
    v_late_rate := COALESCE((v_config->>'lateFeeRateUSD')::NUMERIC, v_late_rate);
  END IF;

  -- Process packages that are past their free storage period
  FOR v_package IN
    SELECT 
      rp.id,
      rp.storage_fee_exempt_until,
      rp.received_date,
      ca.user_id
    FROM received_packages rp
    JOIN customer_addresses ca ON rp.customer_address_id = ca.id
    WHERE rp.status IN ('received', 'processing', 'ready_to_ship')
      AND rp.storage_fee_exempt_until < CURRENT_DATE
  LOOP
    v_processed := v_processed + 1;
    
    -- Calculate start date (day after free period ends)
    v_start_date := DATE(v_package.storage_fee_exempt_until) + INTERVAL '1 day';
    
    -- Calculate days stored
    v_days_stored := CURRENT_DATE - v_start_date + 1;
    
    -- Skip if no days to charge
    IF v_days_stored <= 0 THEN
      CONTINUE;
    END IF;
    
    -- Check if fee already exists for current period
    SELECT id INTO v_existing_fee_id
    FROM storage_fees
    WHERE package_id = v_package.id
      AND end_date = CURRENT_DATE
    LIMIT 1;
    
    IF v_existing_fee_id IS NOT NULL THEN
      CONTINUE;
    END IF;
    
    -- Determine fee type and rate
    IF v_days_stored > v_late_threshold THEN
      v_fee_type := 'late';
      v_daily_fee := v_late_rate;
    ELSE
      v_fee_type := 'storage';
      v_daily_fee := v_daily_rate;
    END IF;
    
    v_total_fee := v_days_stored * v_daily_fee;
    
    -- Create storage fee record
    INSERT INTO storage_fees (
      package_id,
      user_id,
      start_date,
      end_date,
      days_stored,
      daily_rate_usd,
      total_fee_usd,
      fee_type,
      notes
    ) VALUES (
      v_package.id,
      v_package.user_id,
      v_start_date,
      CURRENT_DATE,
      v_days_stored,
      v_daily_fee,
      v_total_fee,
      v_fee_type,
      CASE 
        WHEN v_fee_type = 'late' THEN 
          format('Late storage fee applied after %s days', v_late_threshold)
        ELSE 
          format('Standard storage fee after %s day free period', v_free_days)
      END
    );
    
    v_new_fees := v_new_fees + 1;
    v_total_amount := v_total_amount + v_total_fee;
  END LOOP;

  RETURN QUERY SELECT v_processed, v_new_fees, v_total_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get packages with storage fee warnings
CREATE OR REPLACE FUNCTION get_packages_approaching_fees(
  p_warning_days INTEGER DEFAULT 7
)
RETURNS TABLE(
  package_id UUID,
  tracking_number TEXT,
  sender_name TEXT,
  user_id UUID,
  days_until_fees INTEGER,
  days_in_storage INTEGER,
  estimated_daily_fee NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rp.id AS package_id,
    rp.tracking_number,
    rp.sender_name,
    ca.user_id,
    (DATE(rp.storage_fee_exempt_until) - CURRENT_DATE)::INTEGER AS days_until_fees,
    (CURRENT_DATE - DATE(rp.received_date))::INTEGER AS days_in_storage,
    COALESCE(
      (SELECT daily_rate_usd FROM unified_configuration 
       WHERE config_key = 'storage_fees' 
       LIMIT 1)->>'dailyRateUSD'::NUMERIC,
      1.00
    ) AS estimated_daily_fee
  FROM received_packages rp
  JOIN customer_addresses ca ON rp.customer_address_id = ca.id
  WHERE rp.status IN ('received', 'processing', 'ready_to_ship')
    AND rp.storage_fee_exempt_until >= CURRENT_DATE
    AND rp.storage_fee_exempt_until <= CURRENT_DATE + INTERVAL '1 day' * p_warning_days
  ORDER BY rp.storage_fee_exempt_until ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to waive storage fees
CREATE OR REPLACE FUNCTION waive_storage_fees(
  p_package_id UUID,
  p_reason TEXT,
  p_admin_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_waived_count INTEGER;
BEGIN
  UPDATE storage_fees
  SET 
    is_paid = true,
    payment_date = NOW(),
    notes = COALESCE(notes || E'\n', '') || format('Waived by admin %s: %s', p_admin_id, p_reason)
  WHERE package_id = p_package_id
    AND is_paid = false;
  
  GET DIAGNOSTICS v_waived_count = ROW_COUNT;
  
  RETURN v_waived_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to extend storage fee exemption
CREATE OR REPLACE FUNCTION extend_storage_exemption(
  p_package_id UUID,
  p_additional_days INTEGER,
  p_reason TEXT,
  p_admin_id UUID
)
RETURNS DATE AS $$
DECLARE
  v_new_exempt_date DATE;
BEGIN
  UPDATE received_packages
  SET 
    storage_fee_exempt_until = storage_fee_exempt_until + INTERVAL '1 day' * p_additional_days
  WHERE id = p_package_id
  RETURNING DATE(storage_fee_exempt_until) INTO v_new_exempt_date;
  
  -- Log the extension (simplified without admin_activity_logs dependency)
  -- TODO: Add proper activity logging when admin_activity_logs table is available
  
  RETURN v_new_exempt_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for storage fee dashboard
CREATE OR REPLACE VIEW storage_fee_summary AS
SELECT 
  sf.user_id,
  COUNT(DISTINCT sf.package_id) AS package_count,
  SUM(CASE WHEN sf.is_paid THEN sf.total_fee_usd ELSE 0 END) AS paid_fees,
  SUM(CASE WHEN NOT sf.is_paid THEN sf.total_fee_usd ELSE 0 END) AS unpaid_fees,
  MAX(sf.created_at) AS last_fee_date,
  AVG(sf.days_stored) AS avg_days_stored
FROM storage_fees sf
GROUP BY sf.user_id;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_received_packages_fee_exempt 
ON received_packages(storage_fee_exempt_until) 
WHERE status IN ('received', 'processing', 'ready_to_ship');

CREATE INDEX IF NOT EXISTS idx_storage_fees_unpaid_by_package 
ON storage_fees(package_id) 
WHERE is_paid = false;

-- Grant permissions
GRANT SELECT ON storage_fee_summary TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_and_create_storage_fees() TO service_role;
GRANT EXECUTE ON FUNCTION get_packages_approaching_fees(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION waive_storage_fees(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION extend_storage_exemption(UUID, INTEGER, TEXT, UUID) TO authenticated;

-- Add RLS policies for new functions
CREATE POLICY "Service role can execute storage fee calculations"
ON storage_fees
FOR ALL
TO service_role
USING (true);

-- Create a scheduled job comment (actual scheduling done via external cron or Supabase Edge Functions)
COMMENT ON FUNCTION calculate_and_create_storage_fees() IS 
'Run this function daily at midnight UTC to calculate storage fees. 
Can be scheduled via pg_cron: 
SELECT cron.schedule(
  ''calculate-storage-fees'',
  ''0 0 * * *'',
  $$SELECT calculate_and_create_storage_fees();$$
);';