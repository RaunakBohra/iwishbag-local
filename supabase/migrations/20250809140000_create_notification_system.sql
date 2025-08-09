-- Migration: Create notification logging system for payment reminders

BEGIN;

-- Create notification_logs table to track sent reminders
CREATE TABLE IF NOT EXISTS public.notification_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    quote_id UUID REFERENCES public.quotes_v2(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL, -- 'early_reminder', 'daily_reminder', 'final_reminder', 'payment_confirmed', etc.
    recipient_email TEXT,
    recipient_phone TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    content TEXT, -- Subject line or main message
    delivery_status TEXT DEFAULT 'sent', -- 'sent', 'delivered', 'failed', 'bounced'
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_logs_order_id ON public.notification_logs (order_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_quote_id ON public.notification_logs (quote_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON public.notification_logs (notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON public.notification_logs (sent_at);
CREATE INDEX IF NOT EXISTS idx_notification_logs_recipient_email ON public.notification_logs (recipient_email);

-- Add composite index for checking existing notifications
CREATE INDEX IF NOT EXISTS idx_notification_logs_order_type 
ON public.notification_logs (order_id, notification_type);

-- Enable RLS
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins can see all notifications
CREATE POLICY "Admins can manage all notification logs" ON public.notification_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
            AND is_active = true
        )
    );

-- Users can see their own notifications
CREATE POLICY "Users can view their own notification logs" ON public.notification_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE orders.id = notification_logs.order_id 
            AND orders.customer_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.quotes_v2 
            WHERE quotes_v2.id = notification_logs.quote_id 
            AND quotes_v2.customer_id = auth.uid()
        )
    );

-- Create function to update updated_at automatically
CREATE OR REPLACE FUNCTION public.update_notification_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for updated_at
CREATE TRIGGER update_notification_logs_updated_at_trigger
    BEFORE UPDATE ON public.notification_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_notification_logs_updated_at();

-- Create helper function to check if notification was already sent
CREATE OR REPLACE FUNCTION public.notification_already_sent(
    p_order_id UUID,
    p_notification_type TEXT,
    p_hours_window INTEGER DEFAULT 24
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.notification_logs
        WHERE order_id = p_order_id
        AND notification_type = p_notification_type
        AND sent_at > NOW() - (p_hours_window || ' hours')::INTERVAL
        AND delivery_status != 'failed'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to log notifications
CREATE OR REPLACE FUNCTION public.log_notification(
    p_notification_type TEXT,
    p_order_id UUID DEFAULT NULL,
    p_quote_id UUID DEFAULT NULL,
    p_recipient_email TEXT DEFAULT NULL,
    p_recipient_phone TEXT DEFAULT NULL,
    p_content TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO public.notification_logs (
        order_id,
        quote_id,
        notification_type,
        recipient_email,
        recipient_phone,
        content,
        metadata
    ) VALUES (
        p_order_id,
        p_quote_id,
        p_notification_type,
        p_recipient_email,
        p_recipient_phone,
        p_content,
        p_metadata
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.notification_logs TO authenticated;
GRANT EXECUTE ON FUNCTION public.notification_already_sent TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_notification TO authenticated;

COMMIT;