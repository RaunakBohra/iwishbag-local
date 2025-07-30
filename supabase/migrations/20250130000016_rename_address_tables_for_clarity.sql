-- Rename address tables for clarity
-- warehouse_suite_addresses → warehouse_suite_addresses (US warehouse virtual addresses)
-- delivery_addresses → delivery_addresses (customer delivery addresses)

-- ============================================================================
-- PHASE 1: Rename warehouse_suite_addresses to warehouse_suite_addresses
-- ============================================================================

-- Step 1: Drop dependent views if they exist
DROP VIEW IF EXISTS v_customer_all_addresses CASCADE;

-- Step 2: Rename the table
ALTER TABLE warehouse_suite_addresses RENAME TO warehouse_suite_addresses;

-- Step 3: Rename the primary key constraint
ALTER TABLE warehouse_suite_addresses 
  RENAME CONSTRAINT warehouse_suite_addresses_pkey TO warehouse_suite_addresses_pkey;

-- Step 4: Rename unique constraints
ALTER TABLE warehouse_suite_addresses 
  RENAME CONSTRAINT warehouse_suite_addresses_suite_number_key TO warehouse_suite_addresses_suite_number_key;

-- Step 5: Rename check constraints
ALTER TABLE warehouse_suite_addresses 
  RENAME CONSTRAINT warehouse_suite_addresses_address_type_check TO warehouse_suite_addresses_address_type_check;
ALTER TABLE warehouse_suite_addresses 
  RENAME CONSTRAINT warehouse_suite_addresses_status_check TO warehouse_suite_addresses_status_check;

-- Step 6: Rename indexes
ALTER INDEX idx_warehouse_suite_addresses_status RENAME TO idx_warehouse_suite_addresses_status;
ALTER INDEX idx_warehouse_suite_addresses_suite_number RENAME TO idx_warehouse_suite_addresses_suite_number;
ALTER INDEX idx_warehouse_suite_addresses_user_id RENAME TO idx_warehouse_suite_addresses_user_id;

-- Step 7: Update foreign key column names in related tables
ALTER TABLE received_packages 
  RENAME COLUMN warehouse_suite_address_id TO warehouse_suite_address_id;

-- Check if consolidation_groups exists before trying to rename column
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'consolidation_groups' 
    AND column_name = 'warehouse_suite_address_id'
  ) THEN
    ALTER TABLE consolidation_groups 
      RENAME COLUMN warehouse_suite_address_id TO warehouse_suite_address_id;
  END IF;
END $$;

-- Check if return_requests exists before trying to rename column
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'return_requests' 
    AND column_name = 'original_address_id'
  ) THEN
    ALTER TABLE return_requests 
      RENAME COLUMN original_address_id TO original_warehouse_suite_address_id;
  END IF;
END $$;

-- Step 8: Update foreign key constraints
ALTER TABLE received_packages 
  DROP CONSTRAINT IF EXISTS received_packages_warehouse_suite_address_id_fkey,
  ADD CONSTRAINT received_packages_warehouse_suite_address_id_fkey 
    FOREIGN KEY (warehouse_suite_address_id) REFERENCES warehouse_suite_addresses(id);

-- Update other foreign keys if they exist
DO $$ 
BEGIN
  -- consolidation_groups
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'consolidation_groups_warehouse_suite_address_id_fkey'
  ) THEN
    ALTER TABLE consolidation_groups 
      DROP CONSTRAINT consolidation_groups_warehouse_suite_address_id_fkey,
      ADD CONSTRAINT consolidation_groups_warehouse_suite_address_id_fkey 
        FOREIGN KEY (warehouse_suite_address_id) REFERENCES warehouse_suite_addresses(id);
  END IF;
  
  -- return_requests
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'return_requests_original_address_id_fkey'
  ) THEN
    ALTER TABLE return_requests 
      DROP CONSTRAINT return_requests_original_address_id_fkey,
      ADD CONSTRAINT return_requests_original_warehouse_suite_address_id_fkey 
        FOREIGN KEY (original_warehouse_suite_address_id) REFERENCES warehouse_suite_addresses(id);
  END IF;
END $$;

-- Step 9: Rename trigger
ALTER TRIGGER update_warehouse_suite_addresses_updated_at ON warehouse_suite_addresses 
  RENAME TO update_warehouse_suite_addresses_updated_at;

-- Step 10: Update RLS policies
DROP POLICY IF EXISTS "System can insert addresses" ON warehouse_suite_addresses;
DROP POLICY IF EXISTS "Users can update own addresses" ON warehouse_suite_addresses;
DROP POLICY IF EXISTS "Users can view own addresses" ON warehouse_suite_addresses;

CREATE POLICY "System can insert warehouse suite addresses" 
  ON warehouse_suite_addresses FOR INSERT 
  WITH CHECK (is_authenticated());

CREATE POLICY "Users can update own warehouse suite addresses" 
  ON warehouse_suite_addresses FOR UPDATE 
  USING ((auth.uid() = user_id) OR is_admin());

CREATE POLICY "Users can view own warehouse suite addresses" 
  ON warehouse_suite_addresses FOR SELECT 
  USING ((auth.uid() = user_id) OR is_admin());

-- ============================================================================
-- PHASE 2: Rename delivery_addresses to delivery_addresses
-- ============================================================================

-- Step 1: Rename the table
ALTER TABLE delivery_addresses RENAME TO delivery_addresses;

-- Step 2: Rename the primary key constraint
ALTER TABLE delivery_addresses 
  RENAME CONSTRAINT delivery_addresses_pkey TO delivery_addresses_pkey;

-- Step 3: Rename indexes (if they exist)
DO $$ 
BEGIN
  -- Rename any indexes that might exist
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_delivery_addresses_user_id') THEN
    ALTER INDEX idx_delivery_addresses_user_id RENAME TO idx_delivery_addresses_user_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_delivery_addresses_is_default') THEN
    ALTER INDEX idx_delivery_addresses_is_default RENAME TO idx_delivery_addresses_is_default;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_delivery_addresses_destination_country') THEN
    ALTER INDEX idx_delivery_addresses_destination_country RENAME TO idx_delivery_addresses_destination_country;
  END IF;
END $$;

-- Step 4: Rename triggers
ALTER TRIGGER ensure_profile_before_address ON delivery_addresses 
  RENAME TO ensure_profile_before_delivery_address;
  
ALTER TRIGGER trigger_handle_default_address_insert ON delivery_addresses 
  RENAME TO trigger_handle_default_delivery_address_insert;
  
ALTER TRIGGER trigger_handle_default_address_update ON delivery_addresses 
  RENAME TO trigger_handle_default_delivery_address_update;

-- Step 5: Update RLS policies
DROP POLICY IF EXISTS "Admins have full access" ON delivery_addresses;
DROP POLICY IF EXISTS "Users can manage own addresses" ON delivery_addresses;

CREATE POLICY "Admins have full access to delivery addresses" 
  ON delivery_addresses 
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can manage own delivery addresses" 
  ON delivery_addresses 
  USING (auth.uid() = user_id);

-- ============================================================================
-- PHASE 3: Add table comments for documentation
-- ============================================================================

COMMENT ON TABLE warehouse_suite_addresses IS 
  'Virtual US warehouse addresses assigned to customers for package forwarding. Each customer gets a unique suite number.';

COMMENT ON TABLE delivery_addresses IS 
  'Customer delivery addresses for final shipment. Customers can have multiple addresses and set a default.';

-- Update column comments
COMMENT ON COLUMN warehouse_suite_addresses.suite_number IS 
  'Unique identifier for the customer''s virtual warehouse suite (e.g., IWB10001)';
  
COMMENT ON COLUMN warehouse_suite_addresses.full_address IS 
  'Complete formatted US warehouse address including suite number';
  
COMMENT ON COLUMN delivery_addresses.recipient_name IS 
  'Full name of the person who should receive the package at this delivery address';
  
COMMENT ON COLUMN delivery_addresses.destination_country IS 
  'Two-letter ISO country code for final delivery destination (e.g., IN for India, NP for Nepal)';

-- ============================================================================
-- PHASE 4: Create helpful views
-- ============================================================================

-- Create a view that shows all addresses for admin purposes
CREATE OR REPLACE VIEW v_customer_all_addresses AS
SELECT 
  'warehouse' as address_type,
  w.id,
  w.user_id,
  w.suite_number as identifier,
  w.full_address as address,
  'US' as country,
  w.status,
  w.created_at,
  w.updated_at
FROM warehouse_suite_addresses w
UNION ALL
SELECT 
  'delivery' as address_type,
  d.id,
  d.user_id,
  d.recipient_name as identifier,
  CONCAT_WS(', ', d.street_address, d.city, d.state, d.postal_code) as address,
  d.destination_country as country,
  CASE WHEN d.is_default THEN 'default' ELSE 'active' END as status,
  d.created_at,
  d.updated_at
FROM delivery_addresses d;

-- Grant permissions on the view
GRANT SELECT ON v_customer_all_addresses TO authenticated;

-- Add RLS policy for the view
CREATE POLICY "Users can view own address summary" 
  ON v_customer_all_addresses FOR SELECT 
  USING ((auth.uid() IN (SELECT user_id FROM warehouse_suite_addresses WHERE user_id = auth.uid()))
      OR (auth.uid() IN (SELECT user_id FROM delivery_addresses WHERE user_id = auth.uid()))
      OR is_admin());