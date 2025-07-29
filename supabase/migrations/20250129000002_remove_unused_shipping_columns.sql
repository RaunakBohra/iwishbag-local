-- Migration: Remove unused shipping_routes columns
-- This removes only the columns that are confirmed unused by the user

-- SAFE REMOVALS (5 columns):
-- 1. vat_percentage - User confirmed can be removed
-- 2. customs_percentage - User confirmed can be removed  
-- 3. carriers - JSONB field marked as deprecated in code comments
-- 4. max_weight - No code references to shipping_routes.max_weight
-- 5. restricted_items - No code references
-- 6. requires_documentation - No code references

-- KEEPING these columns as they are still needed:
-- - cost_per_kg: Used as fallback in SmartCalculationEngine
-- - shipping_per_kg: Currently stores 300.00 for IN→NP route 
-- - weight_unit: User confirmed this is needed
-- - active: Need to verify RLS policies first
-- - tax_configuration, weight_configuration, api_configuration: Keeping for now

BEGIN;

-- Drop the unused columns
ALTER TABLE shipping_routes DROP COLUMN IF EXISTS vat_percentage;
ALTER TABLE shipping_routes DROP COLUMN IF EXISTS customs_percentage;
ALTER TABLE shipping_routes DROP COLUMN IF EXISTS carriers;
ALTER TABLE shipping_routes DROP COLUMN IF EXISTS max_weight;
ALTER TABLE shipping_routes DROP COLUMN IF EXISTS restricted_items;
ALTER TABLE shipping_routes DROP COLUMN IF EXISTS requires_documentation;

-- Add a comment to document what was removed
COMMENT ON TABLE shipping_routes IS 'Shipping routes table - cleaned up unused columns: vat_percentage, customs_percentage, carriers, max_weight, restricted_items, requires_documentation';

COMMIT;