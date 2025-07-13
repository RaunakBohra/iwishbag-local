-- Clean up unused payment structures
-- The payment_records table was empty and causing confusion in triggers
-- All payment data now flows through payment_ledger table

-- Drop the unused payment_records table
DROP TABLE IF EXISTS payment_records CASCADE;

-- Verify that our payment system uses payment_ledger as single source of truth
-- (This is just a comment for documentation - the trigger is already updated)

-- Add a comment to the payment_ledger table to clarify its purpose
COMMENT ON TABLE payment_ledger IS 'Central payment tracking table. All payment amounts sync to quotes.amount_paid via triggers.';