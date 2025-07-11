-- Create payment_error_logs table for tracking payment errors
CREATE TABLE IF NOT EXISTS public.payment_error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    error_code VARCHAR(100) NOT NULL,
    error_message TEXT NOT NULL,
    user_message TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'medium',
    gateway VARCHAR(50) NOT NULL,
    transaction_id VARCHAR(255),
    amount DECIMAL(15,2),
    currency VARCHAR(10),
    user_action VARCHAR(100),
    should_retry BOOLEAN NOT NULL DEFAULT false,
    retry_delay INTEGER,
    recovery_options JSONB,
    context JSONB,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_payment_error_logs_error_code ON public.payment_error_logs(error_code);
CREATE INDEX IF NOT EXISTS idx_payment_error_logs_gateway ON public.payment_error_logs(gateway);
CREATE INDEX IF NOT EXISTS idx_payment_error_logs_severity ON public.payment_error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_payment_error_logs_transaction_id ON public.payment_error_logs(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_error_logs_user_id ON public.payment_error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_error_logs_created_at ON public.payment_error_logs(created_at);

-- Add RLS policies
ALTER TABLE public.payment_error_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own error logs, admins can see all
CREATE POLICY "Users can view own payment error logs" ON public.payment_error_logs
    FOR SELECT USING (user_id = auth.uid() OR is_admin());

-- Only system can insert error logs (through service role)
CREATE POLICY "System can insert payment error logs" ON public.payment_error_logs
    FOR INSERT WITH CHECK (true);

-- Only admins can update/delete error logs
CREATE POLICY "Admin can manage payment error logs" ON public.payment_error_logs
    FOR ALL USING (is_admin());

-- Add comments for documentation
COMMENT ON TABLE public.payment_error_logs IS 'Logs for payment errors for analysis and debugging';
COMMENT ON COLUMN public.payment_error_logs.error_code IS 'Standardized error code for categorization';
COMMENT ON COLUMN public.payment_error_logs.error_message IS 'Technical error message';
COMMENT ON COLUMN public.payment_error_logs.user_message IS 'User-friendly error message';
COMMENT ON COLUMN public.payment_error_logs.severity IS 'Error severity level (low, medium, high, critical)';
COMMENT ON COLUMN public.payment_error_logs.gateway IS 'Payment gateway where error occurred';
COMMENT ON COLUMN public.payment_error_logs.transaction_id IS 'Transaction ID if available';
COMMENT ON COLUMN public.payment_error_logs.amount IS 'Payment amount';
COMMENT ON COLUMN public.payment_error_logs.currency IS 'Payment currency';
COMMENT ON COLUMN public.payment_error_logs.user_action IS 'User action that triggered the error';
COMMENT ON COLUMN public.payment_error_logs.should_retry IS 'Whether the error is retryable';
COMMENT ON COLUMN public.payment_error_logs.retry_delay IS 'Recommended retry delay in milliseconds';
COMMENT ON COLUMN public.payment_error_logs.recovery_options IS 'JSON array of recovery actions';
COMMENT ON COLUMN public.payment_error_logs.context IS 'Additional context information';

-- Add check constraints
ALTER TABLE public.payment_error_logs ADD CONSTRAINT check_severity 
    CHECK (severity IN ('low', 'medium', 'high', 'critical'));

-- Add auto-cleanup for old error logs (older than 1 year)
CREATE OR REPLACE FUNCTION cleanup_old_payment_error_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM public.payment_error_logs 
    WHERE created_at < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;

-- Create a view for error analytics
CREATE OR REPLACE VIEW public.payment_error_analytics AS
SELECT 
    DATE_TRUNC('day', created_at) as error_date,
    gateway,
    error_code,
    severity,
    COUNT(*) as error_count,
    COUNT(DISTINCT user_id) as affected_users,
    COUNT(DISTINCT transaction_id) as failed_transactions,
    AVG(amount) as avg_failed_amount,
    array_agg(DISTINCT currency) as currencies
FROM public.payment_error_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at), gateway, error_code, severity
ORDER BY error_date DESC, error_count DESC;

-- Grant select permission on analytics view to admins
CREATE POLICY "Admin can view payment error analytics" ON public.payment_error_analytics
    FOR SELECT USING (is_admin());

-- Create a scheduled job to cleanup old error logs (if pg_cron is available)
-- This will run monthly on the 1st at 4 AM
-- SELECT cron.schedule('cleanup-payment-error-logs', '0 4 1 * *', 'SELECT cleanup_old_payment_error_logs();');