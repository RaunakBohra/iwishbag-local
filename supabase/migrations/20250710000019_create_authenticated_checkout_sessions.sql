-- Create authenticated checkout sessions table to prevent quote contamination
-- for authenticated users until payment is confirmed

CREATE TABLE IF NOT EXISTS authenticated_checkout_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_token TEXT UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    quote_ids TEXT[] NOT NULL, -- Array of quote IDs in this checkout
    temporary_shipping_address JSONB, -- Temporary address data before payment
    payment_currency TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    payment_amount DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'failed')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_authenticated_checkout_sessions_token ON authenticated_checkout_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_authenticated_checkout_sessions_user_id ON authenticated_checkout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_authenticated_checkout_sessions_status ON authenticated_checkout_sessions(status);
CREATE INDEX IF NOT EXISTS idx_authenticated_checkout_sessions_expires_at ON authenticated_checkout_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_authenticated_checkout_sessions_quote_ids ON authenticated_checkout_sessions USING GIN (quote_ids);

-- Add RLS policies
ALTER TABLE authenticated_checkout_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own sessions
CREATE POLICY "Users can access own checkout sessions" ON authenticated_checkout_sessions
    FOR ALL 
    USING (auth.uid() = user_id);

-- Policy: Service role can access all sessions (for cleanup, webhooks, etc.)
CREATE POLICY "Service role can access all checkout sessions" ON authenticated_checkout_sessions
    FOR ALL
    USING (auth.role() = 'service_role');

-- Create function to cleanup expired authenticated checkout sessions
CREATE OR REPLACE FUNCTION cleanup_expired_authenticated_checkout_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete sessions that are expired and not completed
    DELETE FROM authenticated_checkout_sessions 
    WHERE expires_at < NOW() 
    AND status != 'completed';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION cleanup_expired_authenticated_checkout_sessions() TO authenticated;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_authenticated_checkout_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_authenticated_checkout_sessions_updated_at
    BEFORE UPDATE ON authenticated_checkout_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_authenticated_checkout_sessions_updated_at();

-- Add comment to table
COMMENT ON TABLE authenticated_checkout_sessions IS 'Temporary storage for authenticated user checkout data to prevent quote contamination before payment confirmation';