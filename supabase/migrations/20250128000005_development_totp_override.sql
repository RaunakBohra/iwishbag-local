-- Development override for TOTP verification to make it work in local development

BEGIN;

-- Create a development-friendly verify_totp_code function
CREATE OR REPLACE FUNCTION verify_totp_code(p_code TEXT, p_is_backup BOOLEAN DEFAULT false)
RETURNS jsonb AS $$
DECLARE
    v_user_id UUID;
    v_secret TEXT;
    v_backup_codes TEXT[];
    v_valid BOOLEAN := false;
    v_session_token TEXT;
    v_code_index INTEGER;
    v_is_dev BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'verified', false,
            'error', 'Not authenticated'
        );
    END IF;
    
    -- Check if we're in development mode (local Supabase)
    v_is_dev := (SELECT current_setting('server_version_num')::int < 140000 OR 
                  CURRENT_DATABASE() LIKE '%local%' OR 
                  inet_server_addr() = '127.0.0.1'::inet);
    
    -- Get user's MFA configuration
    SELECT totp_secret, backup_codes 
    INTO v_secret, v_backup_codes
    FROM mfa_configurations
    WHERE user_id = v_user_id AND totp_enabled = true;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'verified', false,
            'error', 'MFA not enabled for this user'
        );
    END IF;
    
    IF p_is_backup THEN
        -- Verify backup code
        FOR v_code_index IN 1..array_length(v_backup_codes, 1) LOOP
            IF v_backup_codes[v_code_index] = UPPER(p_code) THEN
                v_valid := true;
                
                -- Remove used backup code
                v_backup_codes := array_remove(v_backup_codes, v_backup_codes[v_code_index]);
                
                UPDATE mfa_configurations
                SET backup_codes = v_backup_codes,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = v_user_id;
                
                -- Log backup code usage
                INSERT INTO mfa_activity_log (user_id, activity_type, ip_address, success)
                VALUES (v_user_id, 'backup_code_used', inet_client_addr(), true);
                
                EXIT;
            END IF;
        END LOOP;
    ELSE
        -- TOTP verification
        IF v_is_dev THEN
            -- Development mode: Accept any 6-digit code
            IF LENGTH(p_code) = 6 AND p_code ~ '^[0-9]+$' THEN
                v_valid := true;
            END IF;
        ELSE
            -- Production mode: Would call Edge Function here
            -- For now, reject with helpful message
            RETURN jsonb_build_object(
                'verified', false,
                'error', 'Production TOTP verification requires Edge Function'
            );
        END IF;
        
        -- Log TOTP verification attempt
        INSERT INTO mfa_activity_log (user_id, activity_type, ip_address, success)
        VALUES (v_user_id, 'totp_verification', inet_client_addr(), v_valid);
    END IF;
    
    IF v_valid THEN
        -- Generate session token
        v_session_token := encode(digest(v_user_id::TEXT || CURRENT_TIMESTAMP::TEXT || random()::TEXT, 'sha256'), 'hex');
        
        -- Create MFA session
        INSERT INTO mfa_sessions (user_id, session_token, expires_at)
        VALUES (v_user_id, v_session_token, CURRENT_TIMESTAMP + INTERVAL '24 hours');
        
        RETURN jsonb_build_object(
            'verified', true,
            'sessionToken', v_session_token
        );
    ELSE
        -- Log failed attempt
        INSERT INTO mfa_activity_log (user_id, activity_type, ip_address, success)
        VALUES (v_user_id, CASE WHEN p_is_backup THEN 'backup_code_failed' ELSE 'totp_failed' END, inet_client_addr(), false);
        
        RETURN jsonb_build_object(
            'verified', false,
            'error', 'Invalid code'
        );
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'verified', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create development-friendly verify_totp_setup function
CREATE OR REPLACE FUNCTION verify_totp_setup(p_code TEXT)
RETURNS jsonb AS $$
DECLARE
    v_user_id UUID;
    v_valid BOOLEAN := false;
    v_is_dev BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'verified', false,
            'error', 'Not authenticated'
        );
    END IF;
    
    -- Check if user has pending MFA setup
    IF NOT EXISTS (
        SELECT 1 FROM mfa_configurations 
        WHERE user_id = v_user_id AND totp_verified = false
    ) THEN
        RETURN jsonb_build_object(
            'verified', false,
            'error', 'No pending MFA setup found'
        );
    END IF;
    
    -- Check if we're in development mode
    v_is_dev := (SELECT current_setting('server_version_num')::int < 140000 OR 
                  CURRENT_DATABASE() LIKE '%local%' OR 
                  inet_server_addr() = '127.0.0.1'::inet);
    
    IF v_is_dev THEN
        -- Development mode: Accept any 6-digit code
        IF LENGTH(p_code) = 6 AND p_code ~ '^[0-9]+$' THEN
            v_valid := true;
        END IF;
    ELSE
        -- Production mode: Would use proper TOTP verification
        RETURN jsonb_build_object(
            'verified', false,
            'error', 'Production TOTP verification requires Edge Function'
        );
    END IF;
    
    IF v_valid THEN
        -- Mark MFA as verified and enabled
        UPDATE mfa_configurations
        SET 
            totp_verified = true,
            totp_enabled = true,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = v_user_id;
        
        -- Log successful setup
        INSERT INTO mfa_activity_log (user_id, activity_type, ip_address, success)
        VALUES (v_user_id, 'setup_completed', inet_client_addr(), true);
        
        RETURN jsonb_build_object(
            'verified', true
        );
    ELSE
        RETURN jsonb_build_object(
            'verified', false,
            'error', 'Invalid verification code'
        );
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'verified', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION verify_totp_code(TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_totp_setup(TEXT) TO authenticated;

COMMIT;