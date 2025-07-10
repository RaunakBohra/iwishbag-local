-- Create guest checkout sessions table to prevent quote contamination
-- for guest users until payment is confirmed

CREATE TABLE IF NOT EXISTS guest_checkout_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_token TEXT UNIQUE NOT NULL,
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    guest_name TEXT NOT NULL,
    guest_email TEXT NOT NULL,
    guest_phone TEXT,
    shipping_address JSONB NOT NULL,
    payment_currency TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    payment_amount DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'failed')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_guest_checkout_sessions_token ON guest_checkout_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_guest_checkout_sessions_quote_id ON guest_checkout_sessions(quote_id);
CREATE INDEX IF NOT EXISTS idx_guest_checkout_sessions_status ON guest_checkout_sessions(status);
CREATE INDEX IF NOT EXISTS idx_guest_checkout_sessions_expires_at ON guest_checkout_sessions(expires_at);

-- Add RLS policies
ALTER TABLE guest_checkout_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can create a guest session (for anonymous users)
CREATE POLICY "Anyone can create guest sessions" ON guest_checkout_sessions
    FOR INSERT 
    WITH CHECK (true);

-- Policy: Anyone can view their own session using the session token
CREATE POLICY "Anyone can view own session by token" ON guest_checkout_sessions
    FOR SELECT 
    USING (true); -- We'll filter by session_token in application logic

-- Policy: Anyone can update their own session using the session token
CREATE POLICY "Anyone can update own session" ON guest_checkout_sessions
    FOR UPDATE 
    USING (true); -- We'll filter by session_token in application logic

-- Policy: Service role can do everything (for cleanup, webhooks, etc.)
CREATE POLICY "Service role full access" ON guest_checkout_sessions
    FOR ALL
    USING (auth.role() = 'service_role');

-- Create function to cleanup expired guest checkout sessions
CREATE OR REPLACE FUNCTION cleanup_expired_guest_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete sessions that are expired and not completed
    DELETE FROM guest_checkout_sessions 
    WHERE expires_at < NOW() 
    AND status != 'completed';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION cleanup_expired_guest_sessions() TO authenticated;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_guest_checkout_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_guest_checkout_sessions_updated_at
    BEFORE UPDATE ON guest_checkout_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_guest_checkout_sessions_updated_at();

-- Add comment to table
COMMENT ON TABLE guest_checkout_sessions IS 'Temporary storage for guest checkout data to prevent quote contamination before payment confirmation';