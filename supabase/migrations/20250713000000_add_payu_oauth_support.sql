-- Add OAuth 2.0 support for PayU Payment Links API
-- This migration adds necessary columns and updates for the new PayU REST API integration

-- Add priority column to payment_gateways if not exists
ALTER TABLE public.payment_gateways 
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 1;

-- Add comment to document the priority column
COMMENT ON COLUMN public.payment_gateways.priority IS 'Priority order for gateway selection (lower numbers = higher priority)';

-- Update PayU gateway configuration to include OAuth 2.0 credentials
-- This will be done via seed data or admin interface, but we document the expected config structure

-- Expected config structure for PayU gateway:
-- {
--   "merchant_key": "your_merchant_key",
--   "salt_key": "your_salt_key", 
--   "client_id": "your_oauth_client_id",
--   "client_secret": "your_oauth_client_secret",
--   "merchant_id": "your_merchant_id",
--   "webhook_url": "https://yoursite.com/api/payu-webhook",
--   "success_url": "https://yoursite.com/payment-success",
--   "failure_url": "https://yoursite.com/payment-failure"
-- }

-- Update payment_links table to support new API version tracking
ALTER TABLE public.payment_links 
ADD COLUMN IF NOT EXISTS api_version TEXT DEFAULT 'v1_legacy';

-- Add comment to document the api_version column
COMMENT ON COLUMN public.payment_links.api_version IS 'PayU API version used: v1_legacy (create_invoice) or v2_rest (payment-links)';

-- Create index for better performance on api_version queries
CREATE INDEX IF NOT EXISTS idx_payment_links_api_version ON public.payment_links(api_version);

-- Create index for better performance on gateway and status queries
CREATE INDEX IF NOT EXISTS idx_payment_links_gateway_status ON public.payment_links(gateway, status);

-- Update existing PayU payment links to mark them as legacy
UPDATE public.payment_links 
SET api_version = 'v1_legacy' 
WHERE gateway = 'payu' AND api_version IS NULL;

-- Add OAuth token storage table for better token management (optional but recommended)
CREATE TABLE IF NOT EXISTS public.oauth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gateway_code TEXT NOT NULL REFERENCES public.payment_gateways(code) ON DELETE CASCADE,
    client_id TEXT NOT NULL,
    access_token TEXT NOT NULL,
    token_type TEXT DEFAULT 'Bearer',
    expires_in INTEGER NOT NULL,
    scope TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Ensure one active token per gateway/client_id/scope combination
    UNIQUE(gateway_code, client_id, scope, is_active) DEFERRABLE INITIALLY DEFERRED
);

-- Add comment to document the oauth_tokens table
COMMENT ON TABLE public.oauth_tokens IS 'OAuth access tokens for payment gateway APIs';

-- Create index for token lookup performance
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_lookup ON public.oauth_tokens(gateway_code, client_id, scope, is_active);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_expiry ON public.oauth_tokens(expires_at) WHERE is_active = true;

-- Add RLS policies for oauth_tokens table
ALTER TABLE public.oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Only allow service role to access OAuth tokens (for security)
DROP POLICY IF EXISTS "Service role can manage OAuth tokens" ON public.oauth_tokens;
CREATE POLICY "Service role can manage OAuth tokens" ON public.oauth_tokens
    FOR ALL USING (auth.role() = 'service_role');

-- Function to automatically mark expired tokens as inactive
CREATE OR REPLACE FUNCTION public.cleanup_expired_oauth_tokens()
RETURNS void AS $$
BEGIN
    UPDATE public.oauth_tokens 
    SET is_active = false 
    WHERE expires_at < now() AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add enhanced payment links search capabilities
CREATE INDEX IF NOT EXISTS idx_payment_links_customer_email ON public.payment_links(customer_email);
CREATE INDEX IF NOT EXISTS idx_payment_links_quote_id ON public.payment_links(quote_id);
CREATE INDEX IF NOT EXISTS idx_payment_links_created_at ON public.payment_links(created_at);

-- Add function to get active payment link for quote
CREATE OR REPLACE FUNCTION public.get_active_payment_link_for_quote(quote_uuid UUID)
RETURNS TABLE (
    id UUID,
    link_code TEXT,
    payment_url TEXT,
    api_version TEXT,
    status TEXT,
    expires_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pl.id,
        pl.link_code,
        pl.payment_url,
        pl.api_version,
        pl.status,
        pl.expires_at
    FROM public.payment_links pl
    WHERE pl.quote_id = quote_uuid 
      AND pl.status IN ('active', 'pending')
      AND pl.expires_at > now()
    ORDER BY pl.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policy for the new function
CREATE POLICY "Users can view their own payment links via function" ON public.payment_links
    FOR SELECT USING (
        quote_id IN (
            SELECT id FROM public.quotes 
            WHERE user_id = auth.uid() OR is_admin()
        )
    );

-- Add webhook logging table for better debugging
CREATE TABLE IF NOT EXISTS public.webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gateway_code TEXT NOT NULL,
    webhook_type TEXT NOT NULL,
    request_headers JSONB,
    request_body JSONB,
    response_status INTEGER,
    response_body JSONB,
    processed_at TIMESTAMPTZ DEFAULT now(),
    quote_id UUID,
    payment_link_id UUID,
    transaction_id TEXT,
    error_message TEXT,
    
    -- Index for performance
    CONSTRAINT fk_webhook_quote_id FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE SET NULL,
    CONSTRAINT fk_webhook_payment_link_id FOREIGN KEY (payment_link_id) REFERENCES public.payment_links(id) ON DELETE SET NULL
);

-- Add comment to document the webhook_logs table
COMMENT ON TABLE public.webhook_logs IS 'Logs all webhook requests for debugging and monitoring';

-- Create indexes for webhook logs
CREATE INDEX IF NOT EXISTS idx_webhook_logs_gateway_type ON public.webhook_logs(gateway_code, webhook_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_processed_at ON public.webhook_logs(processed_at);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_quote_id ON public.webhook_logs(quote_id) WHERE quote_id IS NOT NULL;

-- Add RLS for webhook logs (admin only)
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view webhook logs" ON public.webhook_logs
    FOR SELECT USING (is_admin());

CREATE POLICY "Service role can manage webhook logs" ON public.webhook_logs
    FOR ALL USING (auth.role() = 'service_role');

-- Update the payment_gateways table seed data will be done separately
-- This just ensures the structure is ready for the OAuth credentials