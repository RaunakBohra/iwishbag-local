-- Migration: Add Quote Share Enhancement Features
-- This migration adds email verification, audit logging, and behavior tracking for quote sharing

-- Step 1: Add email verification fields to quotes table
ALTER TABLE quotes 
ADD COLUMN email_verified BOOLEAN DEFAULT false,
ADD COLUMN verification_token VARCHAR(255),
ADD COLUMN verification_sent_at TIMESTAMPTZ,
ADD COLUMN verification_expires_at TIMESTAMPTZ;

-- Step 2: Add customer behavior tracking fields
ALTER TABLE quotes
ADD COLUMN first_viewed_at TIMESTAMPTZ,
ADD COLUMN last_viewed_at TIMESTAMPTZ,
ADD COLUMN total_view_duration INTEGER DEFAULT 0, -- in seconds
ADD COLUMN view_count INTEGER DEFAULT 0;

-- Step 3: Create share audit log table for security tracking
CREATE TABLE share_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL, -- 'share_generated', 'link_accessed', 'quote_approved', 'quote_rejected', 'email_verified'
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Step 4: Add indexes for performance
CREATE INDEX idx_share_audit_log_quote_id ON share_audit_log(quote_id);
CREATE INDEX idx_share_audit_log_action ON share_audit_log(action);
CREATE INDEX idx_share_audit_log_created_at ON share_audit_log(created_at);
CREATE INDEX idx_quotes_verification_token ON quotes(verification_token) WHERE verification_token IS NOT NULL;
CREATE INDEX idx_quotes_email_verified ON quotes(email_verified) WHERE email_verified = false;

-- Step 5: Create function to generate verification token
CREATE OR REPLACE FUNCTION generate_verification_token()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'base64');
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create function to log share actions
CREATE OR REPLACE FUNCTION log_share_action(
    p_quote_id UUID,
    p_user_id UUID,
    p_action VARCHAR(50),
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO share_audit_log (
        quote_id,
        user_id,
        action,
        ip_address,
        user_agent,
        details
    )
    VALUES (
        p_quote_id,
        p_user_id,
        p_action,
        p_ip_address,
        p_user_agent,
        p_details
    )
    RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create RLS policies for share_audit_log table
ALTER TABLE share_audit_log ENABLE ROW LEVEL SECURITY;

-- Admin users can view all audit logs
CREATE POLICY "Admins can view all audit logs" ON share_audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Users can view their own audit logs
CREATE POLICY "Users can view own audit logs" ON share_audit_log
    FOR SELECT USING (user_id = auth.uid());

-- Only authenticated users can insert audit logs (via function)
CREATE POLICY "Authenticated users can insert audit logs" ON share_audit_log
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Step 8: Create function to update quote view tracking
CREATE OR REPLACE FUNCTION update_quote_view_tracking(
    p_quote_id UUID,
    p_duration_seconds INTEGER DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
    UPDATE quotes 
    SET 
        first_viewed_at = COALESCE(first_viewed_at, now()),
        last_viewed_at = now(),
        view_count = view_count + 1,
        total_view_duration = total_view_duration + p_duration_seconds
    WHERE id = p_quote_id;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Create function to initiate email verification
CREATE OR REPLACE FUNCTION initiate_quote_email_verification(
    p_quote_id UUID,
    p_email TEXT
)
RETURNS TEXT AS $$
DECLARE
    verification_token TEXT;
BEGIN
    -- Generate new verification token
    SELECT generate_verification_token() INTO verification_token;
    
    -- Update quote with verification details
    UPDATE quotes 
    SET 
        verification_token = verification_token,
        verification_sent_at = now(),
        verification_expires_at = now() + INTERVAL '24 hours',
        email_verified = false,
        customer_email = p_email
    WHERE id = p_quote_id;
    
    -- Log the action
    PERFORM log_share_action(
        p_quote_id,
        auth.uid(),
        'email_verification_sent',
        NULL,
        NULL,
        jsonb_build_object('email', p_email)
    );
    
    RETURN verification_token;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Create function to verify email token
CREATE OR REPLACE FUNCTION verify_quote_email(
    p_verification_token TEXT
)
RETURNS UUID AS $$
DECLARE
    quote_id UUID;
BEGIN
    -- Find and verify the token
    UPDATE quotes 
    SET 
        email_verified = true,
        verification_token = NULL,
        verification_sent_at = NULL,
        verification_expires_at = NULL
    WHERE 
        verification_token = p_verification_token
        AND verification_expires_at > now()
        AND email_verified = false
    RETURNING id INTO quote_id;
    
    -- Log successful verification
    IF quote_id IS NOT NULL THEN
        PERFORM log_share_action(
            quote_id,
            auth.uid(),
            'email_verified',
            NULL,
            NULL,
            jsonb_build_object('token', p_verification_token)
        );
    END IF;
    
    RETURN quote_id;
END;
$$ LANGUAGE plpgsql;

-- Step 11: Add comment for documentation
COMMENT ON TABLE share_audit_log IS 'Tracks all actions related to quote sharing for security and analytics';
COMMENT ON COLUMN quotes.email_verified IS 'Whether the customer email has been verified for this quote';
COMMENT ON COLUMN quotes.verification_token IS 'Token used for email verification';
COMMENT ON COLUMN quotes.total_view_duration IS 'Total time customer spent viewing quote (in seconds)';
COMMENT ON COLUMN quotes.view_count IS 'Number of times the quote was viewed';