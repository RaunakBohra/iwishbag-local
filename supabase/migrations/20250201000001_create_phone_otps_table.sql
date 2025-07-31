-- Create phone_otps table for SMS OTP verification
CREATE TABLE IF NOT EXISTS phone_otps (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    phone text NOT NULL,
    otp_hash text NOT NULL, -- Base64 encoded OTP (in production, use proper hashing)
    created_at timestamptz DEFAULT now() NOT NULL,
    expires_at timestamptz NOT NULL,
    used_at timestamptz,
    type text DEFAULT 'otp' -- 'otp', 'phone_change', 'signup', 'login'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_phone_otps_phone ON phone_otps (phone);
CREATE INDEX IF NOT EXISTS idx_phone_otps_expires_at ON phone_otps (expires_at);
CREATE INDEX IF NOT EXISTS idx_phone_otps_used_at ON phone_otps (used_at);

-- Enable RLS
ALTER TABLE phone_otps ENABLE ROW LEVEL SECURITY;

-- RLS Policies (restrict access to service role only)
CREATE POLICY "Service role can manage phone_otps" ON phone_otps
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add comment
COMMENT ON TABLE phone_otps IS 'Stores SMS OTP codes for phone verification with multi-provider support (Sparrow SMS, MSG91, Twilio)';
COMMENT ON COLUMN phone_otps.otp_hash IS 'Base64 encoded OTP code (should use proper hashing in production)';
COMMENT ON COLUMN phone_otps.type IS 'Type of OTP: otp, phone_change, signup, login';

-- Create function to cleanup expired OTPs (run this periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_phone_otps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM phone_otps 
    WHERE expires_at < now() - interval '1 hour'; -- Keep for 1 hour after expiry for logging
    
    RAISE LOG 'Cleaned up expired phone OTPs';
END;
$$;