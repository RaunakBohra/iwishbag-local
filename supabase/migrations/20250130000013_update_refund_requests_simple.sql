-- Update refund_requests table to use payment_transactions
-- Simplified version

BEGIN;

-- Add new column for payment_transaction_id
ALTER TABLE refund_requests 
ADD COLUMN IF NOT EXISTS payment_transaction_id uuid REFERENCES payment_transactions(id);

-- Migrate data - try to match by payment_ledger_id
UPDATE refund_requests rr
SET payment_transaction_id = pt.id
FROM payment_transactions pt
WHERE pt.id = rr.payment_ledger_id
AND rr.payment_transaction_id IS NULL;

-- For remaining records, match by quote_id
UPDATE refund_requests rr
SET payment_transaction_id = (
    SELECT pt.id 
    FROM payment_transactions pt
    WHERE pt.quote_id = rr.quote_id
    AND pt.status = 'completed'
    AND pt.amount > 0
    ORDER BY pt.created_at DESC
    LIMIT 1
)
WHERE rr.payment_transaction_id IS NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_refund_requests_payment_transaction 
ON refund_requests(payment_transaction_id);

CREATE INDEX IF NOT EXISTS idx_refund_requests_status_created 
ON refund_requests(status, created_at DESC);

-- Drop old constraint if exists
ALTER TABLE refund_requests 
DROP CONSTRAINT IF EXISTS refund_requests_payment_ledger_id_fkey;

-- Add comment
COMMENT ON COLUMN refund_requests.payment_transaction_id IS 'Reference to the original payment transaction being refunded';

-- Log migration status
DO $$
DECLARE
    v_total integer;
    v_migrated integer;
BEGIN
    SELECT COUNT(*) INTO v_total FROM refund_requests;
    SELECT COUNT(*) INTO v_migrated FROM refund_requests WHERE payment_transaction_id IS NOT NULL;
    
    RAISE NOTICE 'Refund requests migration:';
    RAISE NOTICE '- Total records: %', v_total;
    RAISE NOTICE '- Migrated: %', v_migrated;
    RAISE NOTICE '- Column payment_ledger_id can be dropped after verification';
END $$;

COMMIT;