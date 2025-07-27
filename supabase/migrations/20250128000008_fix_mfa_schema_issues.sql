-- Fix MFA schema issues

BEGIN;

-- Add missing success column to mfa_activity_log
ALTER TABLE mfa_activity_log 
ADD COLUMN IF NOT EXISTS success BOOLEAN DEFAULT true;

-- Fix get_mfa_status function with proper array handling
CREATE OR REPLACE FUNCTION get_mfa_status()
RETURNS jsonb AS $$
DECLARE
    v_user_id UUID;
    v_config RECORD;
    v_backup_count INTEGER;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'enabled', false,
            'error', 'Not authenticated'
        );
    END IF;
    
    SELECT 
        totp_enabled,
        totp_verified,
        backup_codes,
        created_at,
        updated_at
    INTO v_config
    FROM mfa_configurations
    WHERE user_id = v_user_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'enabled', false,
            'verified', false,
            'backupCodesRemaining', 0
        );
    END IF;
    
    -- Count backup codes safely
    v_backup_count := 0;
    IF v_config.backup_codes IS NOT NULL THEN
        v_backup_count := array_length(v_config.backup_codes, 1);
        IF v_backup_count IS NULL THEN
            v_backup_count := 0;
        END IF;
    END IF;
    
    RETURN jsonb_build_object(
        'enabled', COALESCE(v_config.totp_enabled, false),
        'verified', COALESCE(v_config.totp_verified, false),
        'backupCodesRemaining', v_backup_count,
        'createdAt', v_config.created_at,
        'updatedAt', v_config.updated_at
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update setup_mfa to remove success column reference
CREATE OR REPLACE FUNCTION setup_mfa()
RETURNS jsonb AS $$
DECLARE
    v_user_id UUID;
    v_user_email TEXT;
    v_secret TEXT;
    v_backup_codes TEXT[];
    v_existing BOOLEAN;
    v_qr_uri TEXT;
    i INTEGER;
    v_code TEXT;
    v_random_bytes BYTEA;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Not authenticated'
        );
    END IF;

    -- Get user email
    SELECT email INTO v_user_email
    FROM auth.users
    WHERE id = v_user_id;

    IF v_user_email IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User email not found'
        );
    END IF;

    -- Check if MFA already exists
    SELECT EXISTS(
        SELECT 1 FROM mfa_configurations
        WHERE user_id = v_user_id
    ) INTO v_existing;

    IF v_existing THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'MFA already configured'
        );
    END IF;

    -- Generate 20 random bytes for the secret
    v_random_bytes := gen_random_bytes(20);
    
    -- Encode as base32
    v_secret := encode_base32(v_random_bytes);
    
    -- Remove padding for TOTP (optional but cleaner)
    v_secret := rtrim(v_secret, '=');

    -- Generate backup codes manually (8 codes, 8 characters each)
    v_backup_codes := ARRAY[]::TEXT[];
    FOR i IN 1..8 LOOP
        v_code := UPPER(
            SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT), 1, 4) || 
            SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT), 1, 4)
        );
        v_backup_codes := array_append(v_backup_codes, v_code);
    END LOOP;

    -- Create QR URI
    v_qr_uri := 'otpauth://totp/iwishBag:' || v_user_email || '?secret=' || v_secret || '&issuer=iwishBag&algorithm=SHA1&digits=6&period=30';

    -- Insert configuration
    INSERT INTO mfa_configurations (
        user_id,
        totp_secret,
        backup_codes,
        totp_verified,
        totp_enabled
    ) VALUES (
        v_user_id,
        v_secret,
        v_backup_codes,
        false,
        false
    );

    -- Log activity (without success column for now)
    INSERT INTO mfa_activity_log (user_id, activity_type, ip_address)
    VALUES (v_user_id, 'setup_initiated', inet_client_addr());

    RETURN jsonb_build_object(
        'success', true,
        'secret', v_secret,
        'qr_uri', v_qr_uri,
        'backup_codes', v_backup_codes
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update verify_totp_setup to remove success column reference
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
        
        -- Log successful setup (without success column for now)
        INSERT INTO mfa_activity_log (user_id, activity_type, ip_address)
        VALUES (v_user_id, 'setup_completed', inet_client_addr());
        
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_mfa_status() TO authenticated;
GRANT EXECUTE ON FUNCTION setup_mfa() TO authenticated;
GRANT EXECUTE ON FUNCTION verify_totp_setup(TEXT) TO authenticated;

COMMIT;