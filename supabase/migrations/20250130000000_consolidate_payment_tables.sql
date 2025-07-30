-- Migration: Consolidate Payment Tables
-- Description: Merges payment_ledger and financial_transactions into payment_transactions
-- to reduce redundancy and simplify the payment system

BEGIN;

-- Step 1: Backup existing data
CREATE TABLE IF NOT EXISTS payment_transactions_backup AS 
SELECT * FROM payment_transactions;

CREATE TABLE IF NOT EXISTS payment_ledger_backup AS 
SELECT * FROM payment_ledger;

CREATE TABLE IF NOT EXISTS financial_transactions_backup AS 
SELECT * FROM financial_transactions;

-- Step 2: Add missing columns to payment_transactions from payment_ledger
ALTER TABLE payment_transactions 
ADD COLUMN IF NOT EXISTS payment_type text,
ADD COLUMN IF NOT EXISTS gateway_code text,
ADD COLUMN IF NOT EXISTS gateway_transaction_id text,
ADD COLUMN IF NOT EXISTS reference_number text,
ADD COLUMN IF NOT EXISTS bank_reference text,
ADD COLUMN IF NOT EXISTS customer_reference text,
ADD COLUMN IF NOT EXISTS verified_by uuid,
ADD COLUMN IF NOT EXISTS verified_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS parent_payment_id uuid,
ADD COLUMN IF NOT EXISTS payment_proof_message_id uuid,
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS created_by uuid;

-- Step 3: Add missing columns from financial_transactions (for accounting needs)
ALTER TABLE payment_transactions
ADD COLUMN IF NOT EXISTS transaction_type text,
ADD COLUMN IF NOT EXISTS debit_account text,
ADD COLUMN IF NOT EXISTS credit_account text,
ADD COLUMN IF NOT EXISTS posted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS reversed_by uuid,
ADD COLUMN IF NOT EXISTS reversal_reason text,
ADD COLUMN IF NOT EXISTS approved_by uuid,
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone;

-- Step 4: Migrate data from payment_ledger into payment_transactions
-- Only migrate records that don't already exist
INSERT INTO payment_transactions (
    id,
    user_id,
    quote_id,
    amount,
    currency,
    status,
    payment_method,
    gateway_response,
    created_at,
    updated_at,
    payment_type,
    gateway_code,
    gateway_transaction_id,
    reference_number,
    bank_reference,
    customer_reference,
    verified_by,
    verified_at,
    parent_payment_id,
    payment_proof_message_id,
    metadata,
    notes,
    created_by
)
SELECT 
    pl.id,
    q.user_id,
    pl.quote_id,
    pl.amount::numeric(10,2),
    pl.currency,
    pl.status,
    pl.payment_method,
    pl.gateway_response,
    pl.created_at,
    pl.updated_at,
    pl.payment_type,
    pl.gateway_code,
    pl.gateway_transaction_id,
    pl.reference_number,
    pl.bank_reference,
    pl.customer_reference,
    pl.verified_by,
    pl.verified_at,
    pl.parent_payment_id,
    pl.payment_proof_message_id,
    pl.metadata,
    pl.notes,
    pl.created_by
FROM payment_ledger pl
LEFT JOIN quotes q ON q.id = pl.quote_id
WHERE NOT EXISTS (
    SELECT 1 FROM payment_transactions pt 
    WHERE pt.id = pl.id OR pt.gateway_transaction_id = pl.gateway_transaction_id
);

-- Step 5: Update financial transaction references
-- Add accounting info to relevant payment transactions
UPDATE payment_transactions pt
SET 
    transaction_type = ft.transaction_type,
    debit_account = ft.debit_account,
    credit_account = ft.credit_account,
    posted_at = ft.posted_at,
    approved_by = ft.approved_by,
    approved_at = ft.approved_at
FROM financial_transactions ft
WHERE ft.reference_type = 'payment' 
AND ft.reference_id = pt.id;

-- Step 6: Consolidate checkout sessions into a single table
-- First, alter authenticated_checkout_sessions to add guest fields
ALTER TABLE authenticated_checkout_sessions
ADD COLUMN IF NOT EXISTS is_guest boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS guest_email text,
ADD COLUMN IF NOT EXISTS guest_phone text,
ADD COLUMN IF NOT EXISTS guest_name text;

-- Rename to generic checkout_sessions
ALTER TABLE authenticated_checkout_sessions RENAME TO checkout_sessions;

-- Migrate guest checkout data
INSERT INTO checkout_sessions (
    id,
    created_at,
    updated_at,
    user_id,
    quote_id,
    payment_intent_id,
    status,
    amount,
    currency,
    metadata,
    is_guest,
    guest_email,
    guest_phone,
    guest_name
)
SELECT 
    id,
    created_at,
    updated_at,
    NULL as user_id,
    quote_id,
    payment_intent_id,
    status,
    amount,
    currency,
    metadata,
    true as is_guest,
    guest_email,
    guest_phone,
    guest_name
FROM guest_checkout_sessions
ON CONFLICT (id) DO NOTHING;

-- Step 7: Consolidate refund tables
-- Add gateway_type column to gateway_refunds
ALTER TABLE gateway_refunds
ADD COLUMN IF NOT EXISTS gateway_type text;

-- Update existing PayPal refunds
UPDATE gateway_refunds
SET gateway_type = 'paypal'
WHERE id IN (SELECT gateway_refund_id FROM paypal_refunds);

-- Migrate PayPal-specific data into gateway_refunds metadata
UPDATE gateway_refunds gr
SET 
    metadata = jsonb_build_object(
        'paypal_refund_id', pr.paypal_refund_id,
        'paypal_refund_status', pr.paypal_refund_status,
        'paypal_seller_payable_breakdown', pr.paypal_seller_payable_breakdown,
        'paypal_response', pr.paypal_response,
        'reason_code', pr.reason_code
    ) || COALESCE(gr.metadata, '{}'::jsonb)
FROM paypal_refunds pr
WHERE pr.gateway_refund_id = gr.id;

-- Step 8: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_type 
ON payment_transactions(payment_type);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_gateway_code 
ON payment_transactions(gateway_code);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_reference_number 
ON payment_transactions(reference_number);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_verified_at 
ON payment_transactions(verified_at);

CREATE INDEX IF NOT EXISTS idx_checkout_sessions_is_guest 
ON checkout_sessions(is_guest);

CREATE INDEX IF NOT EXISTS idx_gateway_refunds_gateway_type 
ON gateway_refunds(gateway_type);

-- Step 9: Update views that reference old tables
-- Drop views that will be recreated
DROP VIEW IF EXISTS payment_error_analytics CASCADE;
DROP VIEW IF EXISTS payment_health_dashboard CASCADE;
DROP VIEW IF EXISTS payment_links_summary CASCADE;
DROP VIEW IF EXISTS paypal_refund_summary CASCADE;

-- Recreate payment_error_analytics view using consolidated table
CREATE VIEW payment_error_analytics AS
SELECT 
    date_trunc('hour', created_at) as error_hour,
    payment_method,
    gateway_code,
    COUNT(*) as error_count,
    COUNT(DISTINCT user_id) as affected_users,
    COUNT(DISTINCT quote_id) as affected_quotes,
    jsonb_agg(DISTINCT gateway_response->>'error_code') as error_codes
FROM payment_transactions
WHERE status IN ('failed', 'error')
GROUP BY error_hour, payment_method, gateway_code;

-- Recreate payment_health_dashboard view
CREATE VIEW payment_health_dashboard AS
SELECT 
    date_trunc('day', created_at) as day,
    COUNT(*) as total_transactions,
    COUNT(*) FILTER (WHERE status = 'completed') as successful,
    COUNT(*) FILTER (WHERE status IN ('failed', 'error')) as failed,
    SUM(amount) FILTER (WHERE status = 'completed') as total_revenue,
    AVG(amount) as average_transaction,
    COUNT(DISTINCT user_id) as unique_customers,
    COUNT(DISTINCT payment_method) as payment_methods_used
FROM payment_transactions
GROUP BY day
ORDER BY day DESC;

-- Step 10: Add RLS policies for new structure
ALTER TABLE checkout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own checkout sessions" ON checkout_sessions
    FOR SELECT USING (
        auth.uid() = user_id 
        OR (is_guest = true AND metadata->>'session_id' = current_setting('app.session_id', true))
        OR has_role(auth.uid(), 'admin'::app_role)
    );

CREATE POLICY "Users can create checkout sessions" ON checkout_sessions
    FOR INSERT WITH CHECK (
        auth.uid() = user_id 
        OR is_guest = true
    );

CREATE POLICY "Admins have full access to checkout sessions" ON checkout_sessions
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Step 11: Create migration status table for tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
    id serial PRIMARY KEY,
    migration_name text NOT NULL UNIQUE,
    executed_at timestamp with time zone DEFAULT now(),
    execution_time interval,
    status text DEFAULT 'completed'
);

INSERT INTO schema_migrations (migration_name, status) 
VALUES ('consolidate_payment_tables_20250130', 'completed');

-- Step 12: Drop old tables (commented out for safety - run manually after verification)
-- DROP TABLE IF EXISTS payment_ledger CASCADE;
-- DROP TABLE IF EXISTS financial_transactions CASCADE;
-- DROP TABLE IF EXISTS guest_checkout_sessions CASCADE;
-- DROP TABLE IF EXISTS paypal_refunds CASCADE;
-- DROP TABLE IF EXISTS paypal_refund_reasons CASCADE;

-- Add comments for documentation
COMMENT ON TABLE payment_transactions IS 'Consolidated payment transactions table combining payment_transactions, payment_ledger, and financial_transactions';
COMMENT ON TABLE checkout_sessions IS 'Unified checkout sessions for both authenticated and guest users';
COMMENT ON COLUMN checkout_sessions.is_guest IS 'True for guest checkouts, false for authenticated users';
COMMENT ON COLUMN payment_transactions.transaction_type IS 'Type of financial transaction (payment, refund, adjustment)';
COMMENT ON COLUMN payment_transactions.gateway_type IS 'Payment gateway used (stripe, paypal, payu, etc.)';

COMMIT;

-- Rollback script (save separately)
/*
-- To rollback this migration:
BEGIN;

-- Restore from backups
DROP TABLE IF EXISTS payment_transactions CASCADE;
CREATE TABLE payment_transactions AS SELECT * FROM payment_transactions_backup;

DROP TABLE IF EXISTS checkout_sessions CASCADE;
ALTER TABLE checkout_sessions RENAME TO authenticated_checkout_sessions;

-- Restore original tables from backups
CREATE TABLE payment_ledger AS SELECT * FROM payment_ledger_backup;
CREATE TABLE financial_transactions AS SELECT * FROM financial_transactions_backup;

-- Re-create indexes and constraints as needed

COMMIT;
*/