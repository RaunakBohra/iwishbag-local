-- Create refund retry queue table for robust refund processing
CREATE TABLE refund_retry_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_transaction_id UUID REFERENCES payment_transactions(id),
  quote_id UUID REFERENCES quotes(id),
  gateway_code TEXT NOT NULL,
  refund_amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL,
  refund_data JSONB NOT NULL,
  
  -- Retry management fields
  status TEXT NOT NULL DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at TIMESTAMP DEFAULT NOW(),
  last_attempt_at TIMESTAMP,
  
  -- Error tracking fields
  last_error TEXT,
  error_history JSONB DEFAULT '[]'::jsonb,
  
  -- Success tracking fields
  gateway_refund_id TEXT,
  refund_id UUID REFERENCES gateway_refunds(id),
  completed_at TIMESTAMP,
  
  -- Metadata fields
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('high', 'normal', 'low')),
  created_by UUID REFERENCES auth.users(id),
  processed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT chk_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'manual_review')),
  CONSTRAINT chk_retry_count CHECK (retry_count >= 0),
  CONSTRAINT chk_refund_amount CHECK (refund_amount > 0)
);

-- Create indexes for efficient queue processing
CREATE INDEX idx_refund_retry_pending 
ON refund_retry_queue(status, next_retry_at) 
WHERE status IN ('pending', 'processing');

CREATE INDEX idx_refund_retry_payment_tx 
ON refund_retry_queue(payment_transaction_id);

CREATE INDEX idx_refund_retry_quote 
ON refund_retry_queue(quote_id);

CREATE INDEX idx_refund_retry_gateway 
ON refund_retry_queue(gateway_code, status);

CREATE INDEX idx_refund_retry_created_by 
ON refund_retry_queue(created_by);

-- Create composite index for queue processing queries
CREATE INDEX idx_refund_retry_queue_processing 
ON refund_retry_queue(status, priority DESC, next_retry_at ASC) 
WHERE status = 'pending' AND next_retry_at <= NOW();

-- Add comments for documentation
COMMENT ON TABLE refund_retry_queue IS 'Queue for managing refund retries with exponential backoff and failure handling';
COMMENT ON COLUMN refund_retry_queue.status IS 'Current status: pending (waiting), processing (in progress), completed (success), failed (max retries reached), manual_review (requires human intervention)';
COMMENT ON COLUMN refund_retry_queue.retry_count IS 'Number of retry attempts made';
COMMENT ON COLUMN refund_retry_queue.max_retries IS 'Maximum number of retries allowed before marking for manual review';
COMMENT ON COLUMN refund_retry_queue.next_retry_at IS 'Timestamp for next retry attempt (implements exponential backoff)';
COMMENT ON COLUMN refund_retry_queue.error_history IS 'JSON array of all error attempts with timestamps and details';
COMMENT ON COLUMN refund_retry_queue.priority IS 'Processing priority: high priority items are processed first';
COMMENT ON COLUMN refund_retry_queue.refund_data IS 'Complete refund request data including reason, notes, and gateway-specific fields';

-- Create function to calculate next retry time with exponential backoff
CREATE OR REPLACE FUNCTION calculate_next_retry_time(
  p_retry_count INTEGER,
  p_base_delay_seconds INTEGER DEFAULT 60
) RETURNS TIMESTAMP AS $$
DECLARE
  v_delay_seconds INTEGER;
BEGIN
  -- Exponential backoff: 1min, 5min, 15min, 1hr, 2hr...
  CASE p_retry_count
    WHEN 0 THEN v_delay_seconds := p_base_delay_seconds;           -- 1 minute
    WHEN 1 THEN v_delay_seconds := p_base_delay_seconds * 5;       -- 5 minutes
    WHEN 2 THEN v_delay_seconds := p_base_delay_seconds * 15;      -- 15 minutes
    WHEN 3 THEN v_delay_seconds := p_base_delay_seconds * 60;      -- 1 hour
    ELSE v_delay_seconds := p_base_delay_seconds * 120;            -- 2 hours (max)
  END CASE;
  
  -- Add some jitter (±10%) to prevent thundering herd
  v_delay_seconds := v_delay_seconds + (RANDOM() * v_delay_seconds * 0.2 - v_delay_seconds * 0.1)::INTEGER;
  
  RETURN NOW() + (v_delay_seconds || ' seconds')::INTERVAL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION trigger_update_refund_retry_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_refund_retry_queue_updated_at
BEFORE UPDATE ON refund_retry_queue
FOR EACH ROW
EXECUTE FUNCTION trigger_update_refund_retry_queue_updated_at();

-- Grant permissions
GRANT SELECT ON refund_retry_queue TO authenticated;
GRANT ALL ON refund_retry_queue TO service_role;

-- Grant execute on helper function
GRANT EXECUTE ON FUNCTION calculate_next_retry_time TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_next_retry_time TO service_role;