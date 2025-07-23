-- ============================================================================
-- FIX SHIPPING ROUTE DELIVERY OPTIONS
-- Add missing delivery options to IN→NP and NP→IN routes to fix quote calculation
-- Root Cause: SmartCalculationEngine requires delivery_options to be configured
-- ============================================================================

-- Fix IN→NP route (primary issue)
UPDATE shipping_routes 
SET delivery_options = '[
  {
    "id": "dhl_premium", 
    "name": "DHL Premium", 
    "carrier": "DHL", 
    "min_days": 3, 
    "max_days": 5, 
    "price": 0, 
    "active": true,
    "description": "Fast premium shipping with tracking"
  },
  {
    "id": "fedex_standard", 
    "name": "FedEx Standard", 
    "carrier": "FedEx", 
    "min_days": 7, 
    "max_days": 12, 
    "price": 25, 
    "active": true,
    "description": "Reliable standard shipping"
  },
  {
    "id": "economy_postal", 
    "name": "Economy Postal", 
    "carrier": "Postal Service", 
    "min_days": 14, 
    "max_days": 21, 
    "price": 15, 
    "active": true,
    "description": "Budget-friendly shipping option"
  }
]'::jsonb
WHERE origin_country = 'IN' AND destination_country = 'NP' AND is_active = true;

-- Fix NP→IN route (for completeness)
UPDATE shipping_routes 
SET delivery_options = '[
  {
    "id": "dhl_premium", 
    "name": "DHL Premium", 
    "carrier": "DHL", 
    "min_days": 3, 
    "max_days": 5, 
    "price": 0, 
    "active": true,
    "description": "Fast premium shipping with tracking"
  },
  {
    "id": "fedex_standard", 
    "name": "FedEx Standard", 
    "carrier": "FedEx", 
    "min_days": 7, 
    "max_days": 12, 
    "price": 30, 
    "active": true,
    "description": "Reliable standard shipping"
  },
  {
    "id": "economy_postal", 
    "name": "Economy Postal", 
    "carrier": "Postal Service", 
    "min_days": 14, 
    "max_days": 21, 
    "price": 20, 
    "active": true,
    "description": "Budget-friendly shipping option"
  }
]'::jsonb
WHERE origin_country = 'NP' AND destination_country = 'IN' AND is_active = true;

-- Add other major routes that might have the same issue
-- US→IN route
UPDATE shipping_routes 
SET delivery_options = '[
  {
    "id": "dhl_express", 
    "name": "DHL Express", 
    "carrier": "DHL", 
    "min_days": 2, 
    "max_days": 4, 
    "price": 0, 
    "active": true,
    "description": "Express international shipping"
  },
  {
    "id": "fedex_international", 
    "name": "FedEx International", 
    "carrier": "FedEx", 
    "min_days": 5, 
    "max_days": 10, 
    "price": 40, 
    "active": true,
    "description": "Reliable international shipping"
  },
  {
    "id": "usps_priority", 
    "name": "USPS Priority", 
    "carrier": "USPS", 
    "min_days": 10, 
    "max_days": 15, 
    "price": 25, 
    "active": true,
    "description": "Priority international mail"
  }
]'::jsonb
WHERE origin_country = 'US' AND destination_country = 'IN' AND is_active = true AND (delivery_options IS NULL OR delivery_options = '[]'::jsonb);

-- US→NP route
UPDATE shipping_routes 
SET delivery_options = '[
  {
    "id": "dhl_express", 
    "name": "DHL Express", 
    "carrier": "DHL", 
    "min_days": 3, 
    "max_days": 5, 
    "price": 0, 
    "active": true,
    "description": "Express international shipping"
  },
  {
    "id": "fedex_international", 
    "name": "FedEx International", 
    "carrier": "FedEx", 
    "min_days": 7, 
    "max_days": 14, 
    "price": 50, 
    "active": true,
    "description": "Reliable international shipping"
  },
  {
    "id": "usps_priority", 
    "name": "USPS Priority", 
    "carrier": "USPS", 
    "min_days": 12, 
    "max_days": 18, 
    "price": 35, 
    "active": true,
    "description": "Priority international mail"
  }
]'::jsonb
WHERE origin_country = 'US' AND destination_country = 'NP' AND is_active = true AND (delivery_options IS NULL OR delivery_options = '[]'::jsonb);

-- Add constraint to prevent future empty delivery_options (optional safeguard)
ALTER TABLE shipping_routes 
ADD CONSTRAINT delivery_options_not_empty 
CHECK (
  NOT is_active OR 
  (delivery_options IS NOT NULL AND jsonb_array_length(delivery_options) > 0)
);

-- Add comment to document the fix
COMMENT ON CONSTRAINT delivery_options_not_empty ON shipping_routes IS 
'Ensures active shipping routes have at least one delivery option configured. This prevents SmartCalculationEngine from skipping routes with empty delivery_options arrays.';

-- Log the number of routes updated
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count 
  FROM shipping_routes 
  WHERE is_active = true AND delivery_options IS NOT NULL AND jsonb_array_length(delivery_options) > 0;
  
  RAISE NOTICE 'Migration completed: % active shipping routes now have delivery options configured', updated_count;
END $$;