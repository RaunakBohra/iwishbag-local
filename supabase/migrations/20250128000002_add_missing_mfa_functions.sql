-- Add missing MFA functions

BEGIN;

-- Function to disable MFA for a user
CREATE OR REPLACE FUNCTION disable_mfa()
RETURNS jsonb AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Not authenticated'
        );
    END IF;
    
    -- Update MFA configuration
    UPDATE mfa_configurations
    SET 
        totp_enabled = false,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = v_user_id;
    
    -- Log the activity
    INSERT INTO mfa_activity_log (user_id, activity_type, ip_address)
    VALUES (v_user_id, 'disabled', inet_client_addr());
    
    RETURN jsonb_build_object(
        'success', true
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to regenerate backup codes
CREATE OR REPLACE FUNCTION regenerate_backup_codes()
RETURNS jsonb AS $$
DECLARE
    v_user_id UUID;
    v_backup_codes TEXT[];
    v_code TEXT;
    i INTEGER;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Not authenticated'
        );
    END IF;
    
    -- Check if user has MFA enabled
    IF NOT EXISTS (
        SELECT 1 FROM mfa_configurations 
        WHERE user_id = v_user_id AND totp_enabled = true
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'MFA not enabled'
        );
    END IF;
    
    -- Generate new backup codes
    v_backup_codes := ARRAY[]::TEXT[];
    FOR i IN 1..8 LOOP
        v_code := UPPER(
            SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT), 1, 4) || 
            SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT), 1, 4)
        );
        v_backup_codes := array_append(v_backup_codes, v_code);
    END LOOP;
    
    -- Update backup codes
    UPDATE mfa_configurations
    SET 
        backup_codes = v_backup_codes,
        backup_codes_generated_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = v_user_id;
    
    -- Log the activity
    INSERT INTO mfa_activity_log (user_id, activity_type, ip_address)
    VALUES (v_user_id, 'backup_codes_regenerated', inet_client_addr());
    
    RETURN jsonb_build_object(
        'success', true,
        'backupCodes', v_backup_codes
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get MFA status for the current user
CREATE OR REPLACE FUNCTION get_mfa_status()
RETURNS jsonb AS $$
DECLARE
    v_user_id UUID;
    v_config RECORD;
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
        CASE 
            WHEN backup_codes IS NULL THEN 0
            ELSE array_length(backup_codes, 1)
        END as backup_codes_count,
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
    
    RETURN jsonb_build_object(
        'enabled', v_config.totp_enabled,
        'verified', v_config.totp_verified,
        'backupCodesRemaining', v_config.backup_codes_count,
        'createdAt', v_config.created_at,
        'updatedAt', v_config.updated_at
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION disable_mfa() TO authenticated;
GRANT EXECUTE ON FUNCTION regenerate_backup_codes() TO authenticated;
GRANT EXECUTE ON FUNCTION get_mfa_status() TO authenticated;

COMMIT;