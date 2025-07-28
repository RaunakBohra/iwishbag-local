-- ============================================================================
-- PACKAGE FORWARDING SYSTEM INTEGRATION ENHANCEMENT
-- Migration: 20250128000015
-- Purpose: Integrate package forwarding system with main iwishBag ecosystem
-- 
-- INTEGRATION IMPROVEMENTS:
-- 1. Connect storage fees to main quotes system
-- 2. Add package forwarding quote types to main quotes table
-- 3. Enhance customer address integration with profiles
-- 4. Add automated workflow triggers
-- 5. Integrate with main payment and tracking systems
-- ============================================================================

-- Add quote_id to storage_fees table for payment integration
ALTER TABLE storage_fees ADD COLUMN IF NOT EXISTS quote_id uuid;
ALTER TABLE storage_fees ADD CONSTRAINT storage_fees_quote_id_fkey 
  FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE SET NULL;

-- Add package forwarding fields to main quotes table
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS forwarding_type text;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS package_ids uuid[];
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS consolidation_group_id uuid;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS storage_fees_included boolean DEFAULT false;

-- Add constraints for package forwarding quote types
ALTER TABLE quotes ADD CONSTRAINT quotes_forwarding_type_check 
  CHECK (forwarding_type IS NULL OR forwarding_type = ANY (ARRAY[
    'individual_package'::text, 
    'consolidation'::text, 
    'storage_fees'::text
  ]));

-- Add foreign key constraint for consolidation groups
ALTER TABLE quotes ADD CONSTRAINT quotes_consolidation_group_id_fkey
  FOREIGN KEY (consolidation_group_id) REFERENCES consolidation_groups(id) ON DELETE SET NULL;

-- Add individual package quote connection
ALTER TABLE received_packages ADD COLUMN IF NOT EXISTS quote_id uuid;
ALTER TABLE received_packages ADD CONSTRAINT received_packages_quote_id_fkey
  FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE SET NULL;

-- Enhance customer_addresses with main profile integration
ALTER TABLE customer_addresses ADD COLUMN IF NOT EXISTS profile_id uuid;
ALTER TABLE customer_addresses ADD CONSTRAINT customer_addresses_profile_id_fkey
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Add package forwarding specific operational data fields
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS forwarding_data jsonb DEFAULT '{}'::jsonb;

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_storage_fees_quote_id ON storage_fees(quote_id);
CREATE INDEX IF NOT EXISTS idx_quotes_forwarding_type ON quotes(forwarding_type);
CREATE INDEX IF NOT EXISTS idx_quotes_consolidation_group_id ON quotes(consolidation_group_id);
CREATE INDEX IF NOT EXISTS idx_quotes_package_ids ON quotes USING gin(package_ids);
CREATE INDEX IF NOT EXISTS idx_received_packages_quote_id ON received_packages(quote_id);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_profile_id ON customer_addresses(profile_id);

-- ============================================================================
-- PACKAGE FORWARDING WORKFLOW FUNCTIONS
-- ============================================================================

-- Function to automatically create quote when package is ready to ship
CREATE OR REPLACE FUNCTION create_package_forwarding_quote(
  p_package_id uuid,
  p_destination_country text,
  p_customer_data jsonb DEFAULT '{}'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quote_id uuid;
  v_package_data jsonb;
  v_customer_address_id uuid;
  v_user_id uuid;
  v_quote_items jsonb;
BEGIN
  -- Get package data
  SELECT 
    jsonb_build_object(
      'id', id,
      'weight_kg', weight_kg,
      'dimensions', dimensions,
      'declared_value_usd', declared_value_usd,
      'package_description', package_description,
      'sender_store', sender_store
    ),
    customer_address_id
  INTO v_package_data, v_customer_address_id
  FROM received_packages 
  WHERE id = p_package_id;

  -- Get user_id from customer address
  SELECT user_id INTO v_user_id
  FROM customer_addresses 
  WHERE id = v_customer_address_id;

  -- Build quote items from package data
  v_quote_items := jsonb_build_array(
    jsonb_build_object(
      'id', v_package_data->>'id',
      'name', v_package_data->>'package_description',
      'quantity', 1,
      'costprice_origin', (v_package_data->>'declared_value_usd')::numeric,
      'weight', (v_package_data->>'weight_kg')::numeric,
      'smart_data', jsonb_build_object(
        'weight_confidence', 0.9,
        'price_confidence', 0.8,
        'optimization_hints', jsonb_build_array('Package forwarding item')
      )
    )
  );

  -- Create the quote
  INSERT INTO quotes (
    user_id,
    status,
    origin_country,
    destination_country,
    items,
    costprice_total_usd,
    final_total_usd,
    customer_data,
    forwarding_type,
    package_ids,
    forwarding_data,
    quote_source
  ) VALUES (
    v_user_id,
    'pending',
    'US', -- Package forwarding always from US warehouse
    p_destination_country,
    v_quote_items,
    (v_package_data->>'declared_value_usd')::numeric,
    0, -- Will be calculated by SmartCalculationEngine
    p_customer_data,
    'individual_package',
    ARRAY[p_package_id],
    jsonb_build_object(
      'package_data', v_package_data,
      'warehouse_location', 'US_MAIN'
    ),
    'package_forwarding'
  ) RETURNING id INTO v_quote_id;

  -- Link package to quote
  UPDATE received_packages 
  SET quote_id = v_quote_id
  WHERE id = p_package_id;

  RETURN v_quote_id;
END;
$$;

-- Function to create consolidation quote
CREATE OR REPLACE FUNCTION create_consolidation_quote(
  p_consolidation_group_id uuid,
  p_destination_country text,
  p_customer_data jsonb DEFAULT '{}'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quote_id uuid;
  v_group_data record;
  v_package_ids uuid[];
  v_quote_items jsonb;
  v_total_declared_value numeric;
BEGIN
  -- Get consolidation group data
  SELECT 
    user_id,
    group_name,
    package_count,
    original_package_ids,
    consolidated_weight_kg,
    consolidation_fee_usd,
    storage_fees_usd,
    service_fee_usd
  INTO v_group_data
  FROM consolidation_groups 
  WHERE id = p_consolidation_group_id;

  -- Get total declared value from packages
  SELECT 
    COALESCE(SUM(declared_value_usd), 0),
    array_agg(id)
  INTO v_total_declared_value, v_package_ids
  FROM received_packages 
  WHERE consolidation_group_id = p_consolidation_group_id;

  -- Build consolidated quote item
  v_quote_items := jsonb_build_array(
    jsonb_build_object(
      'id', p_consolidation_group_id::text,
      'name', COALESCE(v_group_data.group_name, 'Consolidated Package'),
      'quantity', 1,
      'costprice_origin', v_total_declared_value,
      'weight', v_group_data.consolidated_weight_kg,
      'smart_data', jsonb_build_object(
        'weight_confidence', 0.95,
        'price_confidence', 0.9,
        'optimization_hints', jsonb_build_array(
          'Consolidated shipment',
          format('Contains %s packages', v_group_data.package_count)
        )
      )
    )
  );

  -- Create the quote
  INSERT INTO quotes (
    user_id,
    status,
    origin_country,
    destination_country,
    items,
    costprice_total_usd,
    final_total_usd,
    customer_data,
    forwarding_type,
    package_ids,
    consolidation_group_id,
    forwarding_data,
    quote_source
  ) VALUES (
    v_group_data.user_id,
    'pending',
    'US',
    p_destination_country,
    v_quote_items,
    v_total_declared_value,
    0, -- Will be calculated by SmartCalculationEngine
    p_customer_data,
    'consolidation',
    v_package_ids,
    p_consolidation_group_id,
    jsonb_build_object(
      'consolidation_fee_usd', v_group_data.consolidation_fee_usd,
      'storage_fees_usd', v_group_data.storage_fees_usd,
      'service_fee_usd', v_group_data.service_fee_usd,
      'package_count', v_group_data.package_count
    ),
    'package_forwarding'
  ) RETURNING id INTO v_quote_id;

  -- Link consolidation group to quote
  UPDATE consolidation_groups 
  SET quote_id = v_quote_id
  WHERE id = p_consolidation_group_id;

  RETURN v_quote_id;
END;
$$;

-- Function to add storage fees to existing quote
CREATE OR REPLACE FUNCTION add_storage_fees_to_quote(
  p_user_id uuid,
  p_quote_id uuid
) RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_storage_fees numeric;
BEGIN
  -- Calculate total unpaid storage fees for user
  SELECT COALESCE(SUM(total_fee_usd), 0)
  INTO v_total_storage_fees
  FROM storage_fees 
  WHERE user_id = p_user_id 
    AND is_paid = false
    AND quote_id IS NULL;

  -- Link storage fees to quote
  UPDATE storage_fees 
  SET quote_id = p_quote_id
  WHERE user_id = p_user_id 
    AND is_paid = false
    AND quote_id IS NULL;

  -- Mark quote as including storage fees
  UPDATE quotes
  SET storage_fees_included = true,
      forwarding_data = COALESCE(forwarding_data, '{}'::jsonb) || 
                       jsonb_build_object('storage_fees_usd', v_total_storage_fees)
  WHERE id = p_quote_id;

  RETURN v_total_storage_fees;
END;
$$;

-- ============================================================================
-- AUTOMATED WORKFLOW TRIGGERS
-- ============================================================================

-- Trigger to sync customer address profile_id when user_id changes
CREATE OR REPLACE FUNCTION sync_customer_address_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update profile_id to match user_id (assuming profiles.id = auth.users.id)
  NEW.profile_id := NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_customer_address_profile_trigger ON customer_addresses;
CREATE TRIGGER sync_customer_address_profile_trigger
  BEFORE INSERT OR UPDATE OF user_id ON customer_addresses
  FOR EACH ROW
  EXECUTE FUNCTION sync_customer_address_profile();

-- Trigger to automatically mark storage fees as paid when quote is paid
CREATE OR REPLACE FUNCTION mark_storage_fees_paid_on_quote_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If quote status changed to 'paid' and it includes storage fees
  IF NEW.status = 'paid' AND OLD.status != 'paid' AND NEW.storage_fees_included THEN
    UPDATE storage_fees 
    SET is_paid = true,
        payment_date = now()
    WHERE quote_id = NEW.id
      AND is_paid = false;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS mark_storage_fees_paid_trigger ON quotes;
CREATE TRIGGER mark_storage_fees_paid_trigger
  AFTER UPDATE OF status ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION mark_storage_fees_paid_on_quote_payment();

-- ============================================================================
-- RLS POLICIES UPDATE
-- ============================================================================

-- Update RLS policies to include new foreign key relationships
DROP POLICY IF EXISTS "Users can view package forwarding quotes" ON quotes;
CREATE POLICY "Users can view package forwarding quotes" ON quotes
  FOR SELECT USING (
    auth.uid() = user_id OR 
    is_admin() OR
    EXISTS (
      SELECT 1 FROM customer_addresses ca 
      WHERE ca.user_id = auth.uid() 
        AND (
          quotes.package_ids && ARRAY(
            SELECT rp.id FROM received_packages rp 
            WHERE rp.customer_address_id = ca.id
          )
          OR quotes.consolidation_group_id IN (
            SELECT cg.id FROM consolidation_groups cg 
            WHERE cg.user_id = auth.uid()
          )
        )
    )
  );

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions for new functions
GRANT EXECUTE ON FUNCTION create_package_forwarding_quote(uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION create_consolidation_quote(uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION add_storage_fees_to_quote(uuid, uuid) TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log migration completion
INSERT INTO supabase_migrations (version, name, created_at) 
VALUES ('20250128000015', 'package_forwarding_integration_enhancement', now())
ON CONFLICT (version) DO NOTHING;

COMMENT ON MIGRATION '20250128000015' IS 
'Package Forwarding System Integration Enhancement - Connects package forwarding with main iwishBag ecosystem including quotes, payments, and customer management';