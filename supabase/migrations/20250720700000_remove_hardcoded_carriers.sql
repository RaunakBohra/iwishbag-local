-- ============================================================================
-- REMOVE HARDCODED CARRIERS - Clean up DHL/FEDEX defaults
-- Use only custom routes defined by admin
-- ============================================================================

-- Remove default hardcoded carriers from schema
ALTER TABLE shipping_routes ALTER COLUMN carriers SET DEFAULT '[]'::jsonb;

-- Clear existing hardcoded carriers from all routes (optional - uncomment if you want to clear all)
-- UPDATE shipping_routes SET carriers = '[]'::jsonb 
-- WHERE carriers::text LIKE '%DHL%' OR carriers::text LIKE '%FedEx%' OR carriers::text LIKE '%USPS%';

-- Update only routes that are using the exact default hardcoded pattern
UPDATE shipping_routes 
SET carriers = '[]'::jsonb
WHERE carriers = '[{"days": "3-5", "name": "DHL", "cost_multiplier": 1.0}, {"days": "5-7", "name": "FedEx", "cost_multiplier": 0.9}, {"days": "7-14", "name": "USPS", "cost_multiplier": 0.7}]'::jsonb;

-- Remove hardcoded delivery options that reference DHL/FedEx
UPDATE shipping_routes 
SET delivery_options = '[]'::jsonb
WHERE delivery_options::text LIKE '%DHL%' OR delivery_options::text LIKE '%FedEx%';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Hardcoded carriers cleaned up successfully';
  RAISE NOTICE '📋 Check your custom Chile → India route in admin panel';
  RAISE NOTICE '🚢 Only your custom delivery options will now appear';
  RAISE NOTICE '⚠️ Make sure to configure custom carriers for Chile → India route';
END $$;