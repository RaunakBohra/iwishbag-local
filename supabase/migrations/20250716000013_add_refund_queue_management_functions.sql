-- Create function to queue a refund for processing
CREATE OR REPLACE FUNCTION queue_refund_retry(
  p_payment_transaction_id UUID,
  p_quote_id UUID,
  p_gateway_code TEXT,
  p_refund_amount DECIMAL(10,2),
  p_currency TEXT,
  p_refund_data JSONB,
  p_created_by UUID DEFAULT NULL,
  p_priority TEXT DEFAULT 'normal',
  p_max_retries INTEGER DEFAULT 3
) RETURNS TABLE (
  success BOOLEAN,
  queue_id UUID,
  error_message TEXT
) AS $$
DECLARE
  v_queue_id UUID;
  v_payment_tx RECORD;
BEGIN
  BEGIN
    -- Validate payment transaction exists
    SELECT * INTO v_payment_tx
    FROM payment_transactions
    WHERE id = p_payment_transaction_id;
    
    IF v_payment_tx IS NULL THEN
      RETURN QUERY SELECT 
        FALSE,
        NULL::UUID,
        'Payment transaction not found'::TEXT;
      RETURN;
    END IF;
    
    -- Check if refund amount is valid
    IF p_refund_amount > v_payment_tx.amount THEN
      RETURN QUERY SELECT 
        FALSE,
        NULL::UUID,
        'Refund amount exceeds transaction amount'::TEXT;
      RETURN;
    END IF;
    
    -- Check if already queued
    SELECT id INTO v_queue_id
    FROM refund_retry_queue
    WHERE payment_transaction_id = p_payment_transaction_id
      AND status IN ('pending', 'processing')
      AND refund_amount = p_refund_amount;
    
    IF v_queue_id IS NOT NULL THEN
      RETURN QUERY SELECT 
        FALSE,
        v_queue_id,
        'Refund already queued for processing'::TEXT;
      RETURN;
    END IF;
    
    -- Insert into queue
    INSERT INTO refund_retry_queue (
      payment_transaction_id,
      quote_id,
      gateway_code,
      refund_amount,
      currency,
      refund_data,
      created_by,
      priority,
      max_retries,
      next_retry_at
    ) VALUES (
      p_payment_transaction_id,
      p_quote_id,
      p_gateway_code,
      p_refund_amount,
      p_currency,
      p_refund_data,
      p_created_by,
      p_priority,
      p_max_retries,
      NOW() -- Process immediately on first attempt
    ) RETURNING id INTO v_queue_id;
    
    RETURN QUERY SELECT 
      TRUE,
      v_queue_id,
      NULL::TEXT;
      
  EXCEPTION
    WHEN OTHERS THEN
      RETURN QUERY SELECT 
        FALSE,
        NULL::UUID,
        SQLERRM::TEXT;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to process pending refunds from the queue
CREATE OR REPLACE FUNCTION process_refund_retry_queue(
  p_batch_size INTEGER DEFAULT 10,
  p_gateway_code TEXT DEFAULT NULL
) RETURNS TABLE (
  queue_id UUID,
  status TEXT,
  error_message TEXT
) AS $$
DECLARE
  v_queue_record RECORD;
  v_process_result BOOLEAN;
  v_error_message TEXT;
BEGIN
  -- Get pending refunds that are due for processing
  FOR v_queue_record IN 
    SELECT * 
    FROM refund_retry_queue
    WHERE status = 'pending'
      AND next_retry_at <= NOW()
      AND retry_count < max_retries
      AND (p_gateway_code IS NULL OR gateway_code = p_gateway_code)
    ORDER BY 
      CASE priority 
        WHEN 'high' THEN 1 
        WHEN 'normal' THEN 2 
        WHEN 'low' THEN 3 
      END,
      next_retry_at ASC
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED -- Prevent concurrent processing
  LOOP
    -- Mark as processing
    UPDATE refund_retry_queue
    SET 
      status = 'processing',
      last_attempt_at = NOW()
    WHERE id = v_queue_record.id;
    
    -- Process based on gateway
    v_process_result := FALSE;
    v_error_message := NULL;
    
    BEGIN
      -- Gateway-specific processing would happen here
      -- For now, we'll just simulate processing
      IF v_queue_record.gateway_code = 'payu' THEN
        -- Call PayU refund processing
        -- This would integrate with the actual refund function
        v_process_result := TRUE; -- Placeholder
      ELSIF v_queue_record.gateway_code = 'paypal' THEN
        -- Call PayPal refund processing
        -- This would integrate with the actual refund function
        v_process_result := TRUE; -- Placeholder
      ELSE
        v_error_message := 'Unsupported gateway: ' || v_queue_record.gateway_code;
      END IF;
      
    EXCEPTION
      WHEN OTHERS THEN
        v_process_result := FALSE;
        v_error_message := SQLERRM;
    END;
    
    -- Update queue status based on result
    IF v_process_result THEN
      -- Success
      UPDATE refund_retry_queue
      SET 
        status = 'completed',
        completed_at = NOW(),
        updated_at = NOW()
      WHERE id = v_queue_record.id;
      
      RETURN QUERY SELECT 
        v_queue_record.id,
        'completed'::TEXT,
        NULL::TEXT;
    ELSE
      -- Failure - update retry info
      UPDATE refund_retry_queue
      SET 
        status = CASE 
          WHEN retry_count + 1 >= max_retries THEN 'manual_review'
          ELSE 'pending'
        END,
        retry_count = retry_count + 1,
        last_error = v_error_message,
        error_history = error_history || jsonb_build_object(
          'attempt', retry_count + 1,
          'timestamp', NOW(),
          'error', v_error_message
        ),
        next_retry_at = CASE 
          WHEN retry_count + 1 < max_retries THEN calculate_next_retry_time(retry_count + 1)
          ELSE NULL
        END,
        updated_at = NOW()
      WHERE id = v_queue_record.id;
      
      RETURN QUERY SELECT 
        v_queue_record.id,
        CASE 
          WHEN v_queue_record.retry_count + 1 >= v_queue_record.max_retries THEN 'manual_review'
          ELSE 'retry_scheduled'
        END::TEXT,
        v_error_message;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update refund retry status
CREATE OR REPLACE FUNCTION update_refund_retry_status(
  p_queue_id UUID,
  p_status TEXT,
  p_gateway_refund_id TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_processed_by UUID DEFAULT NULL
) RETURNS TABLE (
  success BOOLEAN,
  updated_status TEXT,
  error_message TEXT
) AS $$
DECLARE
  v_current_record RECORD;
  v_new_status TEXT;
BEGIN
  -- Get current record
  SELECT * INTO v_current_record
  FROM refund_retry_queue
  WHERE id = p_queue_id
  FOR UPDATE;
  
  IF v_current_record IS NULL THEN
    RETURN QUERY SELECT 
      FALSE,
      NULL::TEXT,
      'Queue entry not found'::TEXT;
    RETURN;
  END IF;
  
  -- Validate status transition
  v_new_status := p_status;
  
  -- Prevent invalid transitions
  IF v_current_record.status = 'completed' AND p_status != 'completed' THEN
    RETURN QUERY SELECT 
      FALSE,
      v_current_record.status,
      'Cannot change status of completed refund'::TEXT;
    RETURN;
  END IF;
  
  -- Update based on status
  CASE p_status
    WHEN 'completed' THEN
      UPDATE refund_retry_queue
      SET 
        status = 'completed',
        gateway_refund_id = COALESCE(p_gateway_refund_id, gateway_refund_id),
        completed_at = NOW(),
        processed_by = p_processed_by,
        updated_at = NOW()
      WHERE id = p_queue_id;
      
    WHEN 'failed' THEN
      UPDATE refund_retry_queue
      SET 
        status = CASE 
          WHEN retry_count >= max_retries THEN 'manual_review'
          ELSE 'pending'
        END,
        retry_count = retry_count + 1,
        last_error = p_error_message,
        error_history = error_history || jsonb_build_object(
          'attempt', retry_count + 1,
          'timestamp', NOW(),
          'error', p_error_message
        ),
        next_retry_at = CASE 
          WHEN retry_count + 1 < max_retries THEN calculate_next_retry_time(retry_count + 1)
          ELSE NULL
        END,
        processed_by = p_processed_by,
        updated_at = NOW()
      WHERE id = p_queue_id;
      
      -- Get updated status
      SELECT status INTO v_new_status
      FROM refund_retry_queue
      WHERE id = p_queue_id;
      
    WHEN 'manual_review' THEN
      UPDATE refund_retry_queue
      SET 
        status = 'manual_review',
        last_error = COALESCE(p_error_message, last_error),
        notes = COALESCE(notes || E'\n' || p_error_message, p_error_message),
        processed_by = p_processed_by,
        updated_at = NOW()
      WHERE id = p_queue_id;
      
    ELSE
      RETURN QUERY SELECT 
        FALSE,
        v_current_record.status,
        'Invalid status: ' || p_status::TEXT;
      RETURN;
  END CASE;
  
  RETURN QUERY SELECT 
    TRUE,
    v_new_status,
    NULL::TEXT;
    
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT 
      FALSE,
      NULL::TEXT,
      SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get retry queue statistics
CREATE OR REPLACE FUNCTION get_refund_retry_stats(
  p_gateway_code TEXT DEFAULT NULL,
  p_days_back INTEGER DEFAULT 7
) RETURNS TABLE (
  total_queued BIGINT,
  pending_count BIGINT,
  processing_count BIGINT,
  completed_count BIGINT,
  failed_count BIGINT,
  manual_review_count BIGINT,
  avg_retry_count NUMERIC,
  total_refund_amount NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_queued,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT as pending_count,
    COUNT(*) FILTER (WHERE status = 'processing')::BIGINT as processing_count,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as completed_count,
    COUNT(*) FILTER (WHERE status = 'failed')::BIGINT as failed_count,
    COUNT(*) FILTER (WHERE status = 'manual_review')::BIGINT as manual_review_count,
    AVG(retry_count)::NUMERIC as avg_retry_count,
    SUM(refund_amount)::NUMERIC as total_refund_amount
  FROM refund_retry_queue
  WHERE (p_gateway_code IS NULL OR gateway_code = p_gateway_code)
    AND created_at >= NOW() - (p_days_back || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant permissions
GRANT EXECUTE ON FUNCTION queue_refund_retry TO authenticated;
GRANT EXECUTE ON FUNCTION queue_refund_retry TO service_role;
GRANT EXECUTE ON FUNCTION process_refund_retry_queue TO service_role;
GRANT EXECUTE ON FUNCTION update_refund_retry_status TO authenticated;
GRANT EXECUTE ON FUNCTION update_refund_retry_status TO service_role;
GRANT EXECUTE ON FUNCTION get_refund_retry_stats TO authenticated;

-- Add comments
COMMENT ON FUNCTION queue_refund_retry IS 'Adds a refund to the retry queue for robust processing';
COMMENT ON FUNCTION process_refund_retry_queue IS 'Processes pending refunds from the queue with retry logic';
COMMENT ON FUNCTION update_refund_retry_status IS 'Updates the status of a refund retry queue entry';
COMMENT ON FUNCTION get_refund_retry_stats IS 'Returns statistics about refund retry queue performance';