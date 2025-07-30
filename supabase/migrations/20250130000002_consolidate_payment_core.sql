-- Migration: Consolidate Core Payment Tables
-- Description: Simplified migration focusing on merging payment_ledger into payment_transactions

BEGIN;

-- Step 1: Backup existing data
CREATE TABLE IF NOT EXISTS payment_transactions_backup_v2 AS 
SELECT * FROM payment_transactions;

CREATE TABLE IF NOT EXISTS payment_ledger_backup_v2 AS 
SELECT * FROM payment_ledger;

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

-- Step 3: Migrate data from payment_ledger into payment_transactions
-- First, let's check what data we have
DO $$
DECLARE
    ledger_count INTEGER;
    transactions_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO ledger_count FROM payment_ledger;
    SELECT COUNT(*) INTO transactions_count FROM payment_transactions;
    
    RAISE NOTICE 'Payment ledger records: %', ledger_count;
    RAISE NOTICE 'Payment transactions records: %', transactions_count;
    
    -- Only proceed if there's data to migrate
    IF ledger_count > 0 THEN
        -- Migrate payment_ledger records that don't exist in payment_transactions
        INSERT INTO payment_transactions (
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
            WHERE pt.quote_id = pl.quote_id 
            AND pt.amount = pl.amount::numeric(10,2)
            AND pt.created_at = pl.created_at
        );
        
        GET DIAGNOSTICS ledger_count = ROW_COUNT;
        RAISE NOTICE 'Migrated % records from payment_ledger', ledger_count;
    END IF;
END $$;

-- Step 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_type 
ON payment_transactions(payment_type) WHERE payment_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_transactions_gateway_code 
ON payment_transactions(gateway_code) WHERE gateway_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_transactions_reference_number 
ON payment_transactions(reference_number) WHERE reference_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_transactions_verified_at 
ON payment_transactions(verified_at) WHERE verified_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_transactions_gateway_transaction_id
ON payment_transactions(gateway_transaction_id) WHERE gateway_transaction_id IS NOT NULL;

-- Step 5: Create a view for backward compatibility
CREATE OR REPLACE VIEW payment_ledger_compat AS
SELECT 
    id,
    quote_id,
    payment_transaction_id,
    created_at as payment_date,
    payment_type,
    payment_method,
    gateway_code,
    gateway_transaction_id,
    amount,
    currency,
    reference_number,
    bank_reference,
    customer_reference,
    status,
    verified_by,
    verified_at,
    NULL::uuid as financial_transaction_id,
    parent_payment_id,
    payment_proof_message_id,
    gateway_response,
    metadata,
    notes,
    created_by,
    created_at,
    updated_at
FROM payment_transactions
WHERE payment_type IS NOT NULL 
   OR gateway_code IS NOT NULL 
   OR reference_number IS NOT NULL;

-- Step 6: Update any views that reference payment_ledger
-- First check if they exist
DO $$
BEGIN
    -- Drop and recreate payment_links_summary if it references payment_ledger
    IF EXISTS (
        SELECT 1 
        FROM information_schema.views 
        WHERE table_name = 'payment_links_summary'
    ) THEN
        DROP VIEW IF EXISTS payment_links_summary CASCADE;
        
        CREATE VIEW payment_links_summary AS
        SELECT 
            pl.id,
            pl.quote_id,
            pl.amount,
            pl.currency,
            pl.status as link_status,
            pl.expires_at,
            pl.created_at,
            pt.status as payment_status,
            pt.payment_method,
            pt.gateway_transaction_id,
            q.user_id,
            q.customer_data
        FROM payment_links pl
        LEFT JOIN payment_transactions pt ON pt.quote_id = pl.quote_id
        LEFT JOIN quotes q ON q.id = pl.quote_id;
    END IF;
END $$;

-- Step 7: Create migration status entry
CREATE TABLE IF NOT EXISTS schema_migrations (
    id serial PRIMARY KEY,
    migration_name text NOT NULL UNIQUE,
    executed_at timestamp with time zone DEFAULT now(),
    execution_time interval,
    status text DEFAULT 'completed'
);

INSERT INTO schema_migrations (migration_name, status) 
VALUES ('consolidate_payment_core_20250130', 'completed')
ON CONFLICT (migration_name) DO NOTHING;

-- Step 8: Add helpful comments
COMMENT ON TABLE payment_transactions IS 'Consolidated payment transactions table - now includes all payment_ledger fields';
COMMENT ON COLUMN payment_transactions.payment_type IS 'Type of payment (from payment_ledger)';
COMMENT ON COLUMN payment_transactions.gateway_code IS 'Payment gateway code (from payment_ledger)';
COMMENT ON COLUMN payment_transactions.reference_number IS 'External reference number (from payment_ledger)';
COMMENT ON COLUMN payment_transactions.bank_reference IS 'Bank transaction reference (from payment_ledger)';
COMMENT ON VIEW payment_ledger_compat IS 'Compatibility view for legacy code expecting payment_ledger table';

-- Step 9: Summary
DO $$
DECLARE
    pt_count INTEGER;
    pl_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO pt_count FROM payment_transactions;
    SELECT COUNT(*) INTO pl_count FROM payment_ledger;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Migration Summary:';
    RAISE NOTICE '- Payment transactions total: %', pt_count;
    RAISE NOTICE '- Payment ledger records: %', pl_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Test payment flows';
    RAISE NOTICE '2. Update application code to use payment_transactions';
    RAISE NOTICE '3. After verification, run: DROP TABLE payment_ledger CASCADE;';
END $$;

COMMIT;

-- Rollback script (save separately)
/*
BEGIN;
-- Restore original payment_transactions
DROP TABLE IF EXISTS payment_transactions CASCADE;
CREATE TABLE payment_transactions AS SELECT * FROM payment_transactions_backup_v2;

-- Restore payment_ledger
DROP TABLE IF EXISTS payment_ledger CASCADE;
CREATE TABLE payment_ledger AS SELECT * FROM payment_ledger_backup_v2;

-- Drop compatibility view
DROP VIEW IF EXISTS payment_ledger_compat;

-- Re-create original indexes and constraints as needed
COMMIT;
*/