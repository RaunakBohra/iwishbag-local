-- Create payment_verification_logs table for tracking verification attempts
CREATE TABLE IF NOT EXISTS public.payment_verification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id VARCHAR(255) NOT NULL,
    transaction_id VARCHAR(255) NOT NULL,
    gateway VARCHAR(50) NOT NULL,
    success BOOLEAN NOT NULL DEFAULT false,
    error_message TEXT,
    gateway_response JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_payment_verification_logs_request_id ON public.payment_verification_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_payment_verification_logs_transaction_id ON public.payment_verification_logs(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_verification_logs_gateway ON public.payment_verification_logs(gateway);
CREATE INDEX IF NOT EXISTS idx_payment_verification_logs_success ON public.payment_verification_logs(success);
CREATE INDEX IF NOT EXISTS idx_payment_verification_logs_created_at ON public.payment_verification_logs(created_at);

-- Add RLS policies
ALTER TABLE public.payment_verification_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can access payment verification logs
CREATE POLICY "Admin only access to payment verification logs" ON public.payment_verification_logs
    FOR ALL USING (is_admin());

-- Add comments for documentation
COMMENT ON TABLE public.payment_verification_logs IS 'Logs for payment verification attempts for audit and debugging';
COMMENT ON COLUMN public.payment_verification_logs.request_id IS 'Unique identifier for each verification request';
COMMENT ON COLUMN public.payment_verification_logs.transaction_id IS 'Payment transaction ID being verified';
COMMENT ON COLUMN public.payment_verification_logs.gateway IS 'Payment gateway used (payu, stripe, etc.)';
COMMENT ON COLUMN public.payment_verification_logs.success IS 'Whether verification was successful';
COMMENT ON COLUMN public.payment_verification_logs.error_message IS 'Error message if verification failed';
COMMENT ON COLUMN public.payment_verification_logs.gateway_response IS 'Raw response from payment gateway';

-- Add auto-cleanup for old logs (older than 180 days)
CREATE OR REPLACE FUNCTION cleanup_old_payment_verification_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM public.payment_verification_logs 
    WHERE created_at < NOW() - INTERVAL '180 days';
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to cleanup old logs (if pg_cron is available)
-- This will run weekly on Sunday at 3 AM
-- SELECT cron.schedule('cleanup-payment-verification-logs', '0 3 * * 0', 'SELECT cleanup_old_payment_verification_logs();');