-- Migration: Simplify Payment Structure
-- Description: Add missing fields to payment_transactions to support all payment tracking needs

BEGIN;

-- Step 1: Add ledger-related columns to payment_transactions
ALTER TABLE payment_transactions 
ADD COLUMN IF NOT EXISTS payment_type text,
ADD COLUMN IF NOT EXISTS gateway_code text,
ADD COLUMN IF NOT EXISTS gateway_transaction_id text,
ADD COLUMN IF NOT EXISTS reference_number text,
ADD COLUMN IF NOT EXISTS bank_reference text,
ADD COLUMN IF NOT EXISTS customer_reference text,
ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS verified_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS parent_payment_id uuid REFERENCES payment_transactions(id),
ADD COLUMN IF NOT EXISTS payment_proof_message_id uuid,
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Step 2: Add financial tracking columns
ALTER TABLE payment_transactions
ADD COLUMN IF NOT EXISTS transaction_type text,
ADD COLUMN IF NOT EXISTS debit_account text,
ADD COLUMN IF NOT EXISTS credit_account text,
ADD COLUMN IF NOT EXISTS posted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS reversed_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS reversal_reason text,
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone;

-- Step 3: Create consolidated checkout_sessions table
CREATE TABLE IF NOT EXISTS checkout_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_token text UNIQUE NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    quote_ids text[] NOT NULL,
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

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_type 
ON payment_transactions(payment_type) WHERE payment_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_transactions_gateway_code 
ON payment_transactions(gateway_code) WHERE gateway_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_transactions_reference_number 
ON payment_transactions(reference_number) WHERE reference_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_transactions_gateway_transaction_id
ON payment_transactions(gateway_transaction_id) WHERE gateway_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_checkout_sessions_is_guest 
ON checkout_sessions(is_guest);

CREATE INDEX IF NOT EXISTS idx_checkout_sessions_session_token 
ON checkout_sessions(session_token);

CREATE INDEX IF NOT EXISTS idx_checkout_sessions_expires_at 
ON checkout_sessions(expires_at);

-- Step 5: Add RLS policies for checkout_sessions
ALTER TABLE checkout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own checkout sessions" ON checkout_sessions
    FOR SELECT USING (
        auth.uid() = user_id 
        OR is_guest = true
        OR is_admin()
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
    FOR ALL USING (is_admin());

-- Step 6: Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_checkout_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_checkout_sessions_updated_at ON checkout_sessions;
CREATE TRIGGER update_checkout_sessions_updated_at
    BEFORE UPDATE ON checkout_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_checkout_sessions_updated_at();

-- Step 7: Add comments
COMMENT ON TABLE payment_transactions IS 'Unified payment tracking with ledger and financial capabilities';
COMMENT ON TABLE checkout_sessions IS 'Unified checkout sessions for authenticated and guest users';
COMMENT ON COLUMN payment_transactions.payment_type IS 'Type of payment transaction';
COMMENT ON COLUMN payment_transactions.gateway_code IS 'Payment gateway identifier';
COMMENT ON COLUMN payment_transactions.verified_by IS 'Admin who verified this payment';
COMMENT ON COLUMN payment_transactions.verified_at IS 'When payment was verified';
COMMENT ON COLUMN checkout_sessions.is_guest IS 'True for guest checkouts';

-- Step 8: Summary of changes
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Payment Structure Simplification Complete:';
    RAISE NOTICE '- Added ledger fields to payment_transactions';
    RAISE NOTICE '- Added financial tracking fields to payment_transactions';
    RAISE NOTICE '- Created unified checkout_sessions table';
    RAISE NOTICE '- Created necessary indexes and RLS policies';
    RAISE NOTICE '';
    RAISE NOTICE 'Benefits:';
    RAISE NOTICE '- No need for separate payment_ledger table';
    RAISE NOTICE '- No need for separate financial_transactions table';
    RAISE NOTICE '- Single checkout_sessions table for all checkouts';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Update application code to use enhanced payment_transactions';
    RAISE NOTICE '2. Migrate data from old tables if they contain data';
    RAISE NOTICE '3. Drop old tables after verification';
END $$;

COMMIT;