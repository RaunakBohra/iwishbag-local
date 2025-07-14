-- Fix existing PayU payment entries in payment_ledger
-- Update entries that have transaction_type but need payment_type

-- First, add payment_type column if it doesn't exist
ALTER TABLE payment_ledger 
ADD COLUMN IF NOT EXISTS payment_type TEXT;

-- Copy transaction_type to payment_type where payment_type is null
UPDATE payment_ledger 
SET payment_type = transaction_type 
WHERE payment_type IS NULL AND transaction_type IS NOT NULL;

-- Add gateway_code column if it doesn't exist
ALTER TABLE payment_ledger 
ADD COLUMN IF NOT EXISTS gateway_code TEXT;

-- Update gateway_code for PayU payments
UPDATE payment_ledger 
SET gateway_code = 'payu' 
WHERE payment_method = 'payu' AND gateway_code IS NULL;

-- Add gateway_transaction_id column if it doesn't exist
ALTER TABLE payment_ledger 
ADD COLUMN IF NOT EXISTS gateway_transaction_id TEXT;

-- Ensure all PayU payments are properly marked
UPDATE payment_ledger 
SET 
  payment_method = 'payu',
  gateway_code = 'payu'
WHERE 
  (notes LIKE '%PayU%' OR reference_number LIKE 'PAYU%') 
  AND payment_method IS NULL;