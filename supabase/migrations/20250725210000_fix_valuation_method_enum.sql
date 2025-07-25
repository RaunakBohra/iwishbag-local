-- Fix valuation_method_preference enum to use 'product_value' instead of 'actual_price'
-- This aligns the database schema with the TypeScript enums and form validation

BEGIN;

-- Drop the existing CHECK constraint
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_valuation_method_preference_check;

-- Add the updated CHECK constraint with correct enum values
ALTER TABLE quotes ADD CONSTRAINT quotes_valuation_method_preference_check 
    CHECK (valuation_method_preference IN ('auto', 'product_value', 'minimum_valuation', 'higher_of_both', 'per_item_choice'));

-- Update any existing 'actual_price' values to 'product_value' (if any exist)
UPDATE quotes 
SET valuation_method_preference = 'product_value' 
WHERE valuation_method_preference = 'actual_price';

COMMIT;

-- Verify the constraint is working
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'quotes_valuation_method_preference_check';