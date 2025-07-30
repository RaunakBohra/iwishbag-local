-- Update refund_requests table to use payment_transactions instead of payment_ledger
-- This migration updates the foreign key reference and adds helpful indexes

BEGIN;

-- =====================================================
-- PART 1: ADD NEW COLUMN
-- =====================================================

-- Add new column for payment_transaction_id
ALTER TABLE refund_requests 
ADD COLUMN IF NOT EXISTS payment_transaction_id uuid REFERENCES payment_transactions(id);

-- =====================================================
-- PART 2: MIGRATE DATA
-- =====================================================

-- Update existing records to link to payment_transactions
-- First, try to match by payment_ledger_id if it exists in payment_transactions
UPDATE refund_requests rr
SET payment_transaction_id = pt.id
FROM payment_transactions pt
WHERE pt.id = rr.payment_ledger_id
AND rr.payment_transaction_id IS NULL;

-- For any remaining records, try to match by quote_id and amount
UPDATE refund_requests rr
SET payment_transaction_id = (
    SELECT pt.id 
    FROM payment_transactions pt
    WHERE pt.quote_id = rr.quote_id
    AND pt.status = 'completed'
    AND pt.amount > 0  -- Original payment, not refund
    ORDER BY pt.created_at DESC
    LIMIT 1
)
WHERE rr.payment_transaction_id IS NULL
AND rr.payment_ledger_id IS NOT NULL;

-- =====================================================
-- PART 3: UPDATE CONSTRAINTS AND INDEXES
-- =====================================================

-- Create index on new column
CREATE INDEX IF NOT EXISTS idx_refund_requests_payment_transaction 
ON refund_requests(payment_transaction_id);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_refund_requests_status_created 
ON refund_requests(status, created_at DESC);

-- =====================================================
-- PART 4: UPDATE FOREIGN KEY CONSTRAINT
-- =====================================================

-- Drop old foreign key constraint if it exists
ALTER TABLE refund_requests 
DROP CONSTRAINT IF EXISTS refund_requests_payment_ledger_id_fkey;

-- =====================================================
-- PART 5: CREATE HELPER VIEW
-- =====================================================

-- Create view for refund requests with payment details
CREATE OR REPLACE VIEW refund_requests_with_payment AS
SELECT 
    rr.*,
    pt.amount as original_payment_amount,
    pt.currency as payment_currency,
    pt.payment_method,
    pt.gateway_code,
    pt.gateway_transaction_id,
    pt.status as payment_status,
    pt.created_at as payment_date,
    q.display_id as quote_display_id,
    q.product_name,
    q.customer_email,
    u.email as requested_by_email,
    u.raw_user_meta_data->>'full_name' as requested_by_name,
    r.email as reviewed_by_email,
    r.raw_user_meta_data->>'full_name' as reviewed_by_name
FROM refund_requests rr
LEFT JOIN payment_transactions pt ON pt.id = rr.payment_transaction_id
LEFT JOIN quotes q ON q.id = rr.quote_id
LEFT JOIN auth.users u ON u.id = rr.requested_by
LEFT JOIN auth.users r ON r.id = rr.reviewed_by;

-- =====================================================
-- PART 6: CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to get refund summary for a quote
CREATE OR REPLACE FUNCTION get_quote_refund_summary(p_quote_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_summary jsonb;
BEGIN
    WITH refund_data AS (
        SELECT 
            COUNT(*) as total_requests,
            COUNT(*) FILTER (WHERE status = 'approved') as approved_requests,
            COUNT(*) FILTER (WHERE status = 'completed') as completed_refunds,
            COUNT(*) FILTER (WHERE status = 'pending') as pending_requests,
            SUM(requested_amount) as total_requested,
            SUM(approved_amount) as total_approved,
            SUM(
                CASE 
                    WHEN status = 'completed' THEN approved_amount 
                    ELSE 0 
                END
            ) as total_refunded
        FROM refund_requests
        WHERE quote_id = p_quote_id
    )
    SELECT jsonb_build_object(
        'quote_id', p_quote_id,
        'total_requests', total_requests,
        'approved_requests', approved_requests,
        'completed_refunds', completed_refunds,
        'pending_requests', pending_requests,
        'total_requested', COALESCE(total_requested, 0),
        'total_approved', COALESCE(total_approved, 0),
        'total_refunded', COALESCE(total_refunded, 0),
        'has_pending', pending_requests > 0
    )
    INTO v_summary
    FROM refund_data;
    
    RETURN v_summary;
END;
$$;

-- Function to check if a payment transaction has refunds
CREATE OR REPLACE FUNCTION payment_has_refunds(p_payment_transaction_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM refund_requests 
        WHERE payment_transaction_id = p_payment_transaction_id
        AND status IN ('approved', 'completed')
    );
$$;

-- =====================================================
-- PART 7: UPDATE RLS POLICIES
-- =====================================================

-- Ensure RLS is enabled
ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate
DROP POLICY IF EXISTS "Users can view own refund requests" ON refund_requests;
DROP POLICY IF EXISTS "Admins can manage all refund requests" ON refund_requests;

-- Create updated policies
CREATE POLICY "Users can view own refund requests" ON refund_requests
    FOR SELECT
    USING (
        requested_by = auth.uid() 
        OR 
        quote_id IN (SELECT id FROM quotes WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can create refund requests for own quotes" ON refund_requests
    FOR INSERT
    WITH CHECK (
        requested_by = auth.uid() 
        AND 
        quote_id IN (SELECT id FROM quotes WHERE user_id = auth.uid())
    );

CREATE POLICY "Admins can manage all refund requests" ON refund_requests
    FOR ALL
    USING (is_admin());

-- =====================================================
-- PART 8: ADD COMMENTS
-- =====================================================

COMMENT ON COLUMN refund_requests.payment_transaction_id IS 'Reference to the original payment transaction being refunded';
COMMENT ON COLUMN refund_requests.payment_ledger_id IS 'DEPRECATED: Use payment_transaction_id instead. Will be removed after migration.';
COMMENT ON VIEW refund_requests_with_payment IS 'Refund requests with payment and user details joined';
COMMENT ON FUNCTION get_quote_refund_summary IS 'Get refund statistics for a specific quote';
COMMENT ON FUNCTION payment_has_refunds IS 'Check if a payment transaction has any approved or completed refunds';

-- =====================================================
-- PART 9: MIGRATION NOTES
-- =====================================================

DO $$
BEGIN
    -- Log migration status
    RAISE NOTICE 'Refund requests migration completed:';
    RAISE NOTICE '- Added payment_transaction_id column';
    RAISE NOTICE '- Migrated existing data from payment_ledger_id';
    RAISE NOTICE '- Created helper view and functions';
    RAISE NOTICE '- Updated RLS policies';
    RAISE NOTICE '';
    RAISE NOTICE 'TODO: After verification, drop payment_ledger_id column';
END $$;

COMMIT;