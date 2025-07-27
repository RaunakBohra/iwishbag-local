-- Fix base32 encoding issue in setup_mfa function

BEGIN;

-- Create a base32 encoding function
CREATE OR REPLACE FUNCTION encode_base32(data bytea)
RETURNS text AS $$
DECLARE
    alphabet text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    result text := '';
    input_bits bigint := 0;
    bits_count integer := 0;
    i integer;
    byte_val integer;
    chunk integer;
BEGIN
    -- Convert bytea to bigint for processing
    FOR i IN 0..length(data)-1 LOOP
        byte_val := get_byte(data, i);
        input_bits := (input_bits << 8) | byte_val;
        bits_count := bits_count + 8;
        
        -- Extract 5-bit chunks
        WHILE bits_count >= 5 LOOP
            chunk := (input_bits >> (bits_count - 5)) & 31;
            result := result || substring(alphabet, chunk + 1, 1);
            bits_count := bits_count - 5;
        END LOOP;
    END LOOP;
    
    -- Handle remaining bits
    IF bits_count > 0 THEN
        chunk := (input_bits << (5 - bits_count)) & 31;
        result := result || substring(alphabet, chunk + 1, 1);
    END IF;
    
    -- Add padding
    WHILE length(result) % 8 != 0 LOOP
        result := result || '=';
    END LOOP;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update setup_mfa function with proper base32 encoding
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

    -- Log activity
    INSERT INTO mfa_activity_log (user_id, activity_type, ip_address, success)
    VALUES (v_user_id, 'setup_initiated', inet_client_addr(), true);

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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION encode_base32(bytea) TO authenticated;
GRANT EXECUTE ON FUNCTION setup_mfa() TO authenticated;

COMMIT;