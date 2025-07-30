-- Migration: Consolidate Payment Tables (Fixed)
-- Description: Merges payment_ledger and financial_transactions into payment_transactions
-- Handles the actual table structures in the database

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
)
ON CONFLICT (id) DO NOTHING;

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

-- Step 6: Handle checkout sessions differently since they have different structure
-- Create a unified checkout_sessions table
CREATE TABLE IF NOT EXISTS checkout_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_token text UNIQUE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    quote_ids text[],
    temporary_shipping_address jsonb,
    payment_currency text NOT NULL,
    payment_method text NOT NULL,
    payment_amount numeric(10,2) NOT NULL,
    status text NOT NULL DEFAULT 'active',
    expires_at timestamp with time zone NOT NULL,
    is_guest boolean DEFAULT false,
    guest_email text,
    guest_phone text,
    guest_name text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Migrate authenticated sessions
INSERT INTO checkout_sessions (
    id,
    session_token,
    user_id,
    quote_ids,
    temporary_shipping_address,
    payment_currency,
    payment_method,
    payment_amount,
    status,
    expires_at,
    is_guest,
    created_at,
    updated_at
)
SELECT 
    id,
    session_token,
    user_id,
    quote_ids,
    temporary_shipping_address,
    payment_currency,
    payment_method,
    payment_amount,
    status,
    expires_at,
    false as is_guest,
    created_at,
    updated_at
FROM authenticated_checkout_sessions
ON CONFLICT (id) DO NOTHING;

-- Migrate guest sessions (if table exists)
INSERT INTO checkout_sessions (
    id,
    session_token,
    user_id,
    quote_ids,
    temporary_shipping_address,
    payment_currency,
    payment_method,
    payment_amount,
    status,
    expires_at,
    is_guest,
    guest_email,
    guest_phone,
    guest_name,
    created_at,
    updated_at
)
SELECT 
    g.id,
    g.session_token,
    NULL as user_id,
    ARRAY[g.quote_id]::text[],
    g.shipping_address,
    g.payment_currency,
    g.payment_method,
    g.payment_amount,
    g.status,
    g.expires_at,
    true as is_guest,
    g.guest_email,
    g.guest_phone,
    g.guest_name,
    g.created_at,
    g.updated_at
FROM guest_checkout_sessions g
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'guest_checkout_sessions')
ON CONFLICT (id) DO NOTHING;

-- Step 7: Handle refunds consolidation
-- Check if paypal_refunds exists and has data
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'paypal_refunds') THEN
        -- Add gateway_type column to gateway_refunds
        ALTER TABLE gateway_refunds ADD COLUMN IF NOT EXISTS gateway_type text;
        
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
    END IF;
END $$;

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

CREATE INDEX IF NOT EXISTS idx_checkout_sessions_session_token 
ON checkout_sessions(session_token);

CREATE INDEX IF NOT EXISTS idx_checkout_sessions_expires_at 
ON checkout_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_gateway_refunds_gateway_type 
ON gateway_refunds(gateway_type) 
WHERE gateway_type IS NOT NULL;

-- Step 9: Add RLS policies for new checkout_sessions table
ALTER TABLE checkout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own checkout sessions" ON checkout_sessions
    FOR SELECT USING (
        auth.uid() = user_id 
        OR (is_guest = true AND session_token = current_setting('app.session_token', true))
        OR has_role(auth.uid(), 'admin'::app_role)
    );

CREATE POLICY "Users can create checkout sessions" ON checkout_sessions
    FOR INSERT WITH CHECK (
        auth.uid() = user_id 
        OR is_guest = true
    );

CREATE POLICY "Users can update own checkout sessions" ON checkout_sessions
    FOR UPDATE USING (
        auth.uid() = user_id 
        OR (is_guest = true AND session_token = current_setting('app.session_token', true))
    );

CREATE POLICY "Admins have full access to checkout sessions" ON checkout_sessions
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Step 10: Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_checkout_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_checkout_sessions_updated_at
    BEFORE UPDATE ON checkout_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_checkout_sessions_updated_at();

-- Step 11: Create migration status entry
CREATE TABLE IF NOT EXISTS schema_migrations (
    id serial PRIMARY KEY,
    migration_name text NOT NULL UNIQUE,
    executed_at timestamp with time zone DEFAULT now(),
    execution_time interval,
    status text DEFAULT 'completed'
);

INSERT INTO schema_migrations (migration_name, status) 
VALUES ('consolidate_payment_tables_20250130', 'completed')
ON CONFLICT (migration_name) DO NOTHING;

-- Step 12: Add helpful comments
COMMENT ON TABLE payment_transactions IS 'Consolidated payment transactions table combining payment_transactions, payment_ledger, and financial_transactions';
COMMENT ON TABLE checkout_sessions IS 'Unified checkout sessions for both authenticated and guest users';
COMMENT ON COLUMN checkout_sessions.is_guest IS 'True for guest checkouts, false for authenticated users';
COMMENT ON COLUMN payment_transactions.transaction_type IS 'Type of financial transaction (payment, refund, adjustment)';
COMMENT ON COLUMN gateway_refunds.gateway_type IS 'Payment gateway used (stripe, paypal, payu, etc.)';

-- Step 13: Create views to maintain backward compatibility (temporary)
CREATE OR REPLACE VIEW authenticated_checkout_sessions_compat AS
SELECT 
    id,
    session_token,
    user_id,
    quote_ids,
    temporary_shipping_address,
    payment_currency,
    payment_method,
    payment_amount,
    status,
    expires_at,
    created_at,
    updated_at
FROM checkout_sessions
WHERE is_guest = false;

CREATE OR REPLACE VIEW guest_checkout_sessions_compat AS
SELECT 
    id,
    session_token,
    quote_ids[1] as quote_id,
    temporary_shipping_address as shipping_address,
    payment_currency,
    payment_method,
    payment_amount,
    status,
    expires_at,
    guest_email,
    guest_phone,
    guest_name,
    created_at,
    updated_at
FROM checkout_sessions
WHERE is_guest = true;

COMMIT;

-- Note: After verifying everything works, run these commands to clean up:
-- DROP TABLE authenticated_checkout_sessions CASCADE;
-- DROP TABLE guest_checkout_sessions CASCADE;
-- DROP TABLE payment_ledger CASCADE;
-- DROP TABLE financial_transactions CASCADE;
-- DROP TABLE paypal_refunds CASCADE;
-- DROP VIEW authenticated_checkout_sessions_compat;
-- DROP VIEW guest_checkout_sessions_compat;