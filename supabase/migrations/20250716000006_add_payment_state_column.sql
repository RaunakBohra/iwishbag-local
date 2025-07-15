-- Add payment_state column to track external API coordination lifecycle
-- This column helps track the state of payment creation to handle external API coordination risks

-- Add the payment_state column to payment_transactions table
ALTER TABLE payment_transactions ADD COLUMN payment_state TEXT DEFAULT 'pending';

-- Add index for efficient querying by payment_state
CREATE INDEX idx_payment_transactions_payment_state ON payment_transactions(payment_state);

-- Add index for compound queries on status and payment_state
CREATE INDEX idx_payment_transactions_status_payment_state ON payment_transactions(status, payment_state);

-- Add comment explaining the column purpose
COMMENT ON COLUMN payment_transactions.payment_state IS 'Tracks payment creation lifecycle: pending → external_created → db_recorded → completed/failed/orphaned. Used for external API coordination risk mitigation.';

-- Update existing records to have a proper state (assuming they are completed if they exist)
UPDATE payment_transactions 
SET payment_state = CASE 
    WHEN status = 'completed' THEN 'completed'
    WHEN status = 'failed' THEN 'failed'
    WHEN status = 'pending' THEN 'pending'
    ELSE 'pending'
END
WHERE payment_state = 'pending';

-- Add constraint to ensure valid payment_state values
ALTER TABLE payment_transactions 
ADD CONSTRAINT chk_payment_state 
CHECK (payment_state IN ('pending', 'external_created', 'db_recorded', 'completed', 'failed', 'orphaned'));