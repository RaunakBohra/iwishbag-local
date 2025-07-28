-- Enhanced Address Management Migration
-- Adds indexes, constraints, and RLS policies for better address management

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON user_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_addresses_is_default ON user_addresses(is_default);
CREATE INDEX IF NOT EXISTS idx_user_addresses_country ON user_addresses(destination_country);

-- Add constraint to ensure only one default address per user
CREATE OR REPLACE FUNCTION ensure_single_default_address()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting this address as default
  IF NEW.is_default = true THEN
    -- Unset default on all other addresses for this user
    UPDATE user_addresses
    SET is_default = false
    WHERE user_id = NEW.user_id
    AND id != NEW.id
    AND is_default = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for default address management
DROP TRIGGER IF EXISTS manage_default_address ON user_addresses;
CREATE TRIGGER manage_default_address
  BEFORE INSERT OR UPDATE OF is_default ON user_addresses
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION ensure_single_default_address();

-- Add missing columns if they don't exist
DO $$ 
BEGIN
  -- Add address_label column for naming addresses
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'user_addresses' 
                AND column_name = 'address_label') THEN
    ALTER TABLE user_addresses ADD COLUMN address_label TEXT;
    COMMENT ON COLUMN user_addresses.address_label IS 'User-friendly label for the address (e.g., Home, Office)';
  END IF;

  -- Add address_type column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'user_addresses' 
                AND column_name = 'address_type') THEN
    ALTER TABLE user_addresses ADD COLUMN address_type TEXT DEFAULT 'shipping';
    ALTER TABLE user_addresses ADD CONSTRAINT user_addresses_type_check 
      CHECK (address_type IN ('shipping', 'billing', 'both'));
    COMMENT ON COLUMN user_addresses.address_type IS 'Type of address: shipping, billing, or both';
  END IF;

  -- Add company_name column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'user_addresses' 
                AND column_name = 'company_name') THEN
    ALTER TABLE user_addresses ADD COLUMN company_name TEXT;
    COMMENT ON COLUMN user_addresses.company_name IS 'Company or organization name for business addresses';
  END IF;

  -- Add validated_at column for address validation tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'user_addresses' 
                AND column_name = 'validated_at') THEN
    ALTER TABLE user_addresses ADD COLUMN validated_at TIMESTAMPTZ;
    COMMENT ON COLUMN user_addresses.validated_at IS 'Timestamp when address was last validated';
  END IF;

  -- Add validation_status column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'user_addresses' 
                AND column_name = 'validation_status') THEN
    ALTER TABLE user_addresses ADD COLUMN validation_status TEXT DEFAULT 'unvalidated';
    ALTER TABLE user_addresses ADD CONSTRAINT user_addresses_validation_check 
      CHECK (validation_status IN ('unvalidated', 'valid', 'warning', 'invalid'));
    COMMENT ON COLUMN user_addresses.validation_status IS 'Status of address validation';
  END IF;
END $$;

-- Create view for formatted addresses
CREATE OR REPLACE VIEW user_addresses_formatted AS
SELECT 
  ua.*,
  ua.recipient_name || E'\n' ||
  ua.address_line1 || 
  CASE 
    WHEN ua.address_line2 IS NOT NULL AND ua.address_line2 != '' 
    THEN E'\n' || ua.address_line2 
    ELSE '' 
  END || E'\n' ||
  ua.city || ', ' || 
  ua.state_province_region || ' ' || 
  ua.postal_code || E'\n' ||
  COALESCE(cs.name, ua.destination_country) AS formatted_address,
  cs.name AS country_name,
  cs.currency AS country_currency
FROM user_addresses ua
LEFT JOIN country_settings cs ON cs.code = ua.destination_country;

-- Grant permissions on the view
GRANT SELECT ON user_addresses_formatted TO authenticated;

-- Update RLS policies for better security
DROP POLICY IF EXISTS "Users can view own addresses" ON user_addresses;
CREATE POLICY "Users can view own addresses" ON user_addresses
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own addresses" ON user_addresses;
CREATE POLICY "Users can insert own addresses" ON user_addresses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own addresses" ON user_addresses;
CREATE POLICY "Users can update own addresses" ON user_addresses
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own addresses" ON user_addresses;
CREATE POLICY "Users can delete own addresses" ON user_addresses
  FOR DELETE USING (auth.uid() = user_id);

-- Function to get user's default address
CREATE OR REPLACE FUNCTION get_user_default_address(p_user_id UUID)
RETURNS user_addresses AS $$
DECLARE
  v_address user_addresses;
BEGIN
  -- First try to get the default address
  SELECT * INTO v_address
  FROM user_addresses
  WHERE user_id = p_user_id
  AND is_default = true
  LIMIT 1;
  
  -- If no default, get the most recent address
  IF v_address IS NULL THEN
    SELECT * INTO v_address
    FROM user_addresses
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;
  
  RETURN v_address;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate address format
CREATE OR REPLACE FUNCTION validate_address_format()
RETURNS TRIGGER AS $$
BEGIN
  -- Trim all text fields
  NEW.recipient_name = TRIM(NEW.recipient_name);
  NEW.address_line1 = TRIM(NEW.address_line1);
  NEW.address_line2 = NULLIF(TRIM(NEW.address_line2), '');
  NEW.city = TRIM(NEW.city);
  NEW.state_province_region = TRIM(NEW.state_province_region);
  NEW.postal_code = TRIM(NEW.postal_code);
  NEW.phone = TRIM(NEW.phone);
  NEW.company_name = NULLIF(TRIM(NEW.company_name), '');
  NEW.address_label = NULLIF(TRIM(NEW.address_label), '');
  
  -- Basic validation
  IF LENGTH(NEW.recipient_name) < 2 THEN
    RAISE EXCEPTION 'Recipient name must be at least 2 characters';
  END IF;
  
  IF LENGTH(NEW.address_line1) < 5 THEN
    RAISE EXCEPTION 'Address must be at least 5 characters';
  END IF;
  
  IF LENGTH(NEW.city) < 2 THEN
    RAISE EXCEPTION 'City must be at least 2 characters';
  END IF;
  
  IF LENGTH(NEW.postal_code) < 3 THEN
    RAISE EXCEPTION 'Postal code must be at least 3 characters';
  END IF;
  
  -- Set updated_at
  NEW.updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for address validation
DROP TRIGGER IF EXISTS validate_address_before_save ON user_addresses;
CREATE TRIGGER validate_address_before_save
  BEFORE INSERT OR UPDATE ON user_addresses
  FOR EACH ROW
  EXECUTE FUNCTION validate_address_format();

-- Add helpful comments
COMMENT ON TABLE user_addresses IS 'User shipping and billing addresses with validation support';
COMMENT ON FUNCTION get_user_default_address IS 'Get user default address or most recent if no default';
COMMENT ON FUNCTION validate_address_format IS 'Validate and clean address data before saving';