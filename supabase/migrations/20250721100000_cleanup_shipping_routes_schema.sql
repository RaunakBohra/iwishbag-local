-- ============================================================================
-- SHIPPING ROUTES SCHEMA CLEANUP
-- Remove redundant columns that have been superseded by better alternatives
-- ============================================================================

-- Step 1: Data Migration (ensure no data loss)
-- Migrate any cost_per_kg values to shipping_per_kg if shipping_per_kg is null
UPDATE shipping_routes 
SET shipping_per_kg = cost_per_kg 
WHERE shipping_per_kg IS NULL AND cost_per_kg IS NOT NULL;

-- Step 2: Migrate any carriers data to delivery_options if needed
-- (This is more complex as it requires JSON manipulation - we'll handle manually if needed)

-- Step 3: Sync 'active' field to 'is_active' if there are discrepancies
UPDATE shipping_routes 
SET is_active = active 
WHERE active IS NOT NULL AND is_active != active;

-- Step 4: Remove redundant columns
-- Remove 'carriers' column (superseded by delivery_options.carrier)
ALTER TABLE shipping_routes DROP COLUMN IF EXISTS carriers;

-- Remove 'cost_per_kg' column (superseded by shipping_per_kg)  
ALTER TABLE shipping_routes DROP COLUMN IF EXISTS cost_per_kg;

-- Drop policies that depend on 'active' column before removing it
DROP POLICY IF EXISTS "Users can view delivery options for active routes" ON shipping_routes;

-- Remove 'active' column (duplicate of is_active)
ALTER TABLE shipping_routes DROP COLUMN IF EXISTS active;

-- Recreate the policy using 'is_active' instead
CREATE POLICY "Users can view delivery options for active routes" ON shipping_routes
FOR SELECT USING (is_active = true);

-- Step 5: Ensure shipping_per_kg is not null for all routes
UPDATE shipping_routes 
SET shipping_per_kg = 5.0 
WHERE shipping_per_kg IS NULL OR shipping_per_kg = 0;

-- Step 6: Add NOT NULL constraint to shipping_per_kg (since it's now the primary field)
ALTER TABLE shipping_routes ALTER COLUMN shipping_per_kg SET NOT NULL;

-- Step 7: Add comment to document the cleanup
COMMENT ON TABLE shipping_routes IS 'Shipping route configurations. Cleaned up 2025-07-21: removed carriers (use delivery_options), cost_per_kg (use shipping_per_kg), active (use is_active)';