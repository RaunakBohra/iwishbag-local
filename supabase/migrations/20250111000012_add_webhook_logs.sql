-- Create webhook_logs table for monitoring webhook attempts
CREATE TABLE IF NOT EXISTS public.webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id VARCHAR(255) NOT NULL,
    webhook_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    user_agent TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_webhook_logs_request_id ON public.webhook_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_type ON public.webhook_logs(webhook_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON public.webhook_logs(status);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON public.webhook_logs(created_at);

-- Add RLS policies
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can access webhook logs
CREATE POLICY "Admin only access to webhook logs" ON public.webhook_logs
    FOR ALL USING (is_admin());

-- Add comments for documentation
COMMENT ON TABLE public.webhook_logs IS 'Logs for webhook processing attempts for monitoring and debugging';
COMMENT ON COLUMN public.webhook_logs.request_id IS 'Unique identifier for each webhook request';
COMMENT ON COLUMN public.webhook_logs.webhook_type IS 'Type of webhook (payu, stripe, etc.)';
COMMENT ON COLUMN public.webhook_logs.status IS 'Status of webhook processing (started, success, failed, warning)';
COMMENT ON COLUMN public.webhook_logs.user_agent IS 'User agent from webhook request';
COMMENT ON COLUMN public.webhook_logs.error_message IS 'Error message if webhook processing failed';

-- Add auto-cleanup for old logs (older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM public.webhook_logs 
    WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to cleanup old logs (if pg_cron is available)
-- This will run daily at 2 AM
-- SELECT cron.schedule('cleanup-webhook-logs', '0 2 * * *', 'SELECT cleanup_old_webhook_logs();');