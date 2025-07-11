-- Create payment_health_logs table for tracking payment system health
CREATE TABLE IF NOT EXISTS public.payment_health_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    overall_health VARCHAR(20) NOT NULL DEFAULT 'healthy',
    success_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    error_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    avg_processing_time INTEGER NOT NULL DEFAULT 0,
    alert_count INTEGER NOT NULL DEFAULT 0,
    metrics JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_payment_health_logs_overall_health ON public.payment_health_logs(overall_health);
CREATE INDEX IF NOT EXISTS idx_payment_health_logs_success_rate ON public.payment_health_logs(success_rate);
CREATE INDEX IF NOT EXISTS idx_payment_health_logs_created_at ON public.payment_health_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_payment_health_logs_alert_count ON public.payment_health_logs(alert_count);

-- Add RLS policies
ALTER TABLE public.payment_health_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can access payment health logs
CREATE POLICY "Admin only access to payment health logs" ON public.payment_health_logs
    FOR ALL USING (is_admin());

-- Add comments for documentation
COMMENT ON TABLE public.payment_health_logs IS 'Logs for payment system health monitoring and alerting';
COMMENT ON COLUMN public.payment_health_logs.overall_health IS 'Overall health status (healthy, warning, critical)';
COMMENT ON COLUMN public.payment_health_logs.success_rate IS 'Payment success rate percentage';
COMMENT ON COLUMN public.payment_health_logs.error_rate IS 'Payment error rate percentage';
COMMENT ON COLUMN public.payment_health_logs.avg_processing_time IS 'Average processing time in milliseconds';
COMMENT ON COLUMN public.payment_health_logs.alert_count IS 'Number of alerts generated';
COMMENT ON COLUMN public.payment_health_logs.metrics IS 'Complete health metrics JSON';

-- Add check constraints
ALTER TABLE public.payment_health_logs ADD CONSTRAINT check_overall_health 
    CHECK (overall_health IN ('healthy', 'warning', 'critical'));

ALTER TABLE public.payment_health_logs ADD CONSTRAINT check_success_rate 
    CHECK (success_rate >= 0 AND success_rate <= 100);

ALTER TABLE public.payment_health_logs ADD CONSTRAINT check_error_rate 
    CHECK (error_rate >= 0 AND error_rate <= 100);

-- Add auto-cleanup for old health logs (older than 6 months)
CREATE OR REPLACE FUNCTION cleanup_old_payment_health_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM public.payment_health_logs 
    WHERE created_at < NOW() - INTERVAL '6 months';
END;
$$ LANGUAGE plpgsql;

-- Create a view for health dashboard
CREATE OR REPLACE VIEW public.payment_health_dashboard AS
SELECT 
    DATE_TRUNC('hour', created_at) as check_time,
    overall_health,
    AVG(success_rate) as avg_success_rate,
    AVG(error_rate) as avg_error_rate,
    AVG(avg_processing_time) as avg_processing_time,
    SUM(alert_count) as total_alerts,
    COUNT(*) as check_count
FROM public.payment_health_logs
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', created_at), overall_health
ORDER BY check_time DESC;

-- Grant select permission on dashboard view to admins
-- CREATE POLICY "Admin can view payment health dashboard" ON public.payment_health_dashboard
--     FOR SELECT USING (is_admin());

-- Create alert thresholds table
CREATE TABLE IF NOT EXISTS public.payment_alert_thresholds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name VARCHAR(100) NOT NULL UNIQUE,
    warning_threshold DECIMAL(10,2) NOT NULL,
    critical_threshold DECIMAL(10,2) NOT NULL,
    comparison_operator VARCHAR(10) NOT NULL DEFAULT 'gt',
    enabled BOOLEAN NOT NULL DEFAULT true,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS for alert thresholds
ALTER TABLE public.payment_alert_thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage alert thresholds" ON public.payment_alert_thresholds
    FOR ALL USING (is_admin());

-- Insert default alert thresholds
INSERT INTO public.payment_alert_thresholds (metric_name, warning_threshold, critical_threshold, comparison_operator, description) VALUES
('success_rate', 95.0, 90.0, 'lt', 'Payment success rate percentage - alert when below threshold'),
('error_rate', 5.0, 10.0, 'gt', 'Payment error rate percentage - alert when above threshold'),
('avg_processing_time', 5000, 10000, 'gt', 'Average processing time in ms - alert when above threshold'),
('gateway_failure_rate', 2.0, 5.0, 'gt', 'Gateway failure rate percentage - alert when above threshold')
ON CONFLICT (metric_name) DO NOTHING;

-- Add comments for alert thresholds
COMMENT ON TABLE public.payment_alert_thresholds IS 'Configurable thresholds for payment system alerts';
COMMENT ON COLUMN public.payment_alert_thresholds.metric_name IS 'Name of the metric to monitor';
COMMENT ON COLUMN public.payment_alert_thresholds.warning_threshold IS 'Value that triggers a warning alert';
COMMENT ON COLUMN public.payment_alert_thresholds.critical_threshold IS 'Value that triggers a critical alert';
COMMENT ON COLUMN public.payment_alert_thresholds.comparison_operator IS 'Comparison operator (gt, lt, eq, gte, lte)';

-- Create a scheduled job to run health checks (if pg_cron is available)
-- This will run every 15 minutes
-- SELECT cron.schedule('payment-health-monitor', '*/15 * * * *', 'SELECT http_request(''POST'', ''https://your-domain.com/supabase/functions/payment-health-monitor'', ''{"Content-Type": "application/json"}'', '''');');