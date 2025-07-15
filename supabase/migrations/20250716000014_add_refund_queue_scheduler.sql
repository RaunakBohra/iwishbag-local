-- Create a function to be called by pg_cron for processing refund queue
CREATE OR REPLACE FUNCTION schedule_refund_queue_processing()
RETURNS void AS $$
DECLARE
  v_result RECORD;
  v_processed_count INTEGER := 0;
  v_error_count INTEGER := 0;
BEGIN
  -- Log start of processing
  RAISE NOTICE 'Starting scheduled refund queue processing at %', NOW();
  
  -- Process high priority refunds first
  FOR v_result IN 
    SELECT * FROM process_refund_retry_queue(5, NULL) -- Process 5 high priority items
    WHERE queue_id IN (
      SELECT id FROM refund_retry_queue 
      WHERE priority = 'high' 
      AND status = 'pending'
      AND next_retry_at <= NOW()
      LIMIT 5
    )
  LOOP
    IF v_result.status = 'completed' THEN
      v_processed_count := v_processed_count + 1;
    ELSE
      v_error_count := v_error_count + 1;
    END IF;
  END LOOP;
  
  -- Process normal priority refunds
  FOR v_result IN 
    SELECT * FROM process_refund_retry_queue(10, NULL) -- Process 10 normal priority items
  LOOP
    IF v_result.status = 'completed' THEN
      v_processed_count := v_processed_count + 1;
    ELSE
      v_error_count := v_error_count + 1;
    END IF;
  END LOOP;
  
  -- Log completion
  RAISE NOTICE 'Refund queue processing completed. Processed: %, Errors: %', 
    v_processed_count, v_error_count;
    
  -- Clean up old completed entries (older than 30 days)
  DELETE FROM refund_retry_queue
  WHERE status = 'completed'
    AND completed_at < NOW() - INTERVAL '30 days';
    
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in scheduled refund processing: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create an HTTP trigger function for external scheduling (e.g., from Vercel Cron)
CREATE OR REPLACE FUNCTION http_trigger_refund_queue_processing(
  p_auth_token TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  processed_count INTEGER,
  error_count INTEGER
) AS $$
DECLARE
  v_expected_token TEXT;
  v_stats RECORD;
BEGIN
  -- Check authorization if token is required
  v_expected_token := current_setting('app.refund_queue_token', TRUE);
  
  IF v_expected_token IS NOT NULL AND v_expected_token != '' THEN
    IF p_auth_token IS NULL OR p_auth_token != v_expected_token THEN
      RETURN QUERY SELECT 
        FALSE,
        'Unauthorized'::TEXT,
        0::INTEGER,
        0::INTEGER;
      RETURN;
    END IF;
  END IF;
  
  -- Process the queue
  PERFORM schedule_refund_queue_processing();
  
  -- Get stats for the last hour
  SELECT * INTO v_stats
  FROM get_refund_retry_stats(NULL, 1);
  
  RETURN QUERY SELECT 
    TRUE,
    'Refund queue processed successfully'::TEXT,
    v_stats.completed_count::INTEGER,
    v_stats.failed_count::INTEGER;
    
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT 
      FALSE,
      SQLERRM::TEXT,
      0::INTEGER,
      0::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a view for monitoring refund queue health
CREATE OR REPLACE VIEW refund_queue_health AS
SELECT 
  gateway_code,
  status,
  priority,
  COUNT(*) as count,
  MIN(created_at) as oldest_entry,
  MAX(created_at) as newest_entry,
  AVG(retry_count) as avg_retry_count,
  MAX(retry_count) as max_retry_count,
  SUM(refund_amount) as total_amount,
  COUNT(*) FILTER (WHERE next_retry_at <= NOW()) as due_for_retry
FROM refund_retry_queue
WHERE status != 'completed'
GROUP BY gateway_code, status, priority;

-- Create indexes for efficient queue processing
CREATE INDEX IF NOT EXISTS idx_refund_retry_queue_processing 
ON refund_retry_queue (status, next_retry_at, priority)
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_refund_retry_queue_cleanup
ON refund_retry_queue (status, completed_at)
WHERE status = 'completed';

-- Example: Set up pg_cron job (requires pg_cron extension)
-- This would be run by a superuser after migration:
-- SELECT cron.schedule('process-refund-queue', '*/5 * * * *', 'SELECT schedule_refund_queue_processing();');

-- Grant permissions
GRANT EXECUTE ON FUNCTION schedule_refund_queue_processing TO service_role;
GRANT EXECUTE ON FUNCTION http_trigger_refund_queue_processing TO authenticated;
GRANT SELECT ON refund_queue_health TO authenticated;

-- Add comments
COMMENT ON FUNCTION schedule_refund_queue_processing IS 'Processes pending refunds from the retry queue - intended for scheduled execution';
COMMENT ON FUNCTION http_trigger_refund_queue_processing IS 'HTTP-accessible function to trigger refund queue processing with optional auth token';
COMMENT ON VIEW refund_queue_health IS 'Monitoring view for refund queue health and statistics';