-- Drop unnecessary USD conversion columns from payment tables
-- These columns are no longer needed since we eliminated currency conversion logic

-- Drop columns from payment_ledger table
ALTER TABLE payment_ledger 
DROP COLUMN IF EXISTS exchange_rate,
DROP COLUMN IF EXISTS base_amount,
DROP COLUMN IF EXISTS balance_before,
DROP COLUMN IF EXISTS balance_after;

-- Drop columns from financial_transactions table  
ALTER TABLE financial_transactions
DROP COLUMN IF EXISTS exchange_rate,
DROP COLUMN IF EXISTS base_amount;

-- Update the simplified sync trigger function to work without these columns
CREATE OR REPLACE FUNCTION sync_payment_record_to_ledger()
RETURNS TRIGGER AS $$
DECLARE
    quote_info RECORD;
    creator_id UUID;
BEGIN
    -- Only process INSERT operations for now
    IF TG_OP = 'INSERT' THEN
        -- Get quote details
        SELECT * INTO quote_info FROM quotes WHERE id = NEW.quote_id;
        
        -- Handle NULL recorded_by (use first available admin or the recorded_by value)
        creator_id := COALESCE(NEW.recorded_by, (SELECT id FROM auth.users LIMIT 1));
        
        -- Create simplified payment_ledger entry in original currency only
        INSERT INTO payment_ledger (
            quote_id,
            payment_date,
            payment_type,
            payment_method,
            gateway_code,
            amount,              -- Store in original currency
            currency,            -- Original currency
            reference_number,
            status,
            notes,
            created_by
        ) VALUES (
            NEW.quote_id,
            COALESCE(NEW.created_at, NOW()),
            CASE 
                WHEN NEW.amount < 0 THEN 'refund'
                ELSE 'customer_payment'
            END,
            COALESCE(NEW.payment_method, 'bank_transfer'),
            CASE 
                WHEN NEW.payment_method = 'bank_transfer' THEN 'bank_transfer'
                WHEN NEW.payment_method ILIKE '%payu%' THEN 'payu'
                WHEN NEW.payment_method ILIKE '%stripe%' THEN 'stripe'
                ELSE 'manual'
            END,
            NEW.amount,          -- Original amount, no conversion
            quote_info.final_currency,    -- Original currency
            NEW.reference_number,
            COALESCE(NEW.status, 'completed'),
            NEW.notes,
            creator_id
        );
        
        RAISE NOTICE 'Auto-synced payment_record % to simplified payment_ledger in %', 
            NEW.id, quote_info.final_currency;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update the create_payment_with_ledger_entry function to work without USD columns
CREATE OR REPLACE FUNCTION create_payment_with_ledger_entry(
    p_quote_id UUID,
    p_amount DECIMAL,
    p_currency TEXT,
    p_payment_method TEXT,
    p_payment_type TEXT DEFAULT 'customer_payment',
    p_reference_number TEXT DEFAULT NULL,
    p_gateway_code TEXT DEFAULT NULL,
    p_gateway_transaction_id TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_message_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_payment_ledger_id UUID;
    v_financial_transaction_id UUID;
    v_quote RECORD;
    v_debit_account TEXT;
    v_credit_account TEXT;
    v_user_id UUID;
BEGIN
    -- Get user ID
    v_user_id := COALESCE(p_user_id, auth.uid());
    
    -- Get quote details
    SELECT * INTO v_quote FROM quotes WHERE id = p_quote_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Quote not found');
    END IF;
    
    -- Determine accounts for double-entry
    IF p_payment_type = 'customer_payment' THEN
        -- Debit: Payment Gateway Account, Credit: Accounts Receivable
        v_debit_account := CASE 
            WHEN p_gateway_code = 'payu' THEN '1111'
            WHEN p_gateway_code = 'stripe' THEN '1112'
            WHEN p_gateway_code = 'esewa' THEN '1114'
            ELSE '1113' -- Bank Transfer
        END;
        v_credit_account := '1120'; -- Accounts Receivable
    ELSIF p_payment_type IN ('refund', 'partial_refund') THEN
        -- Debit: Refunds Expense, Credit: Payment Gateway Account
        v_debit_account := '5200'; -- Refunds and Returns
        v_credit_account := CASE 
            WHEN p_gateway_code = 'payu' THEN '1111'
            WHEN p_gateway_code = 'stripe' THEN '1112'
            WHEN p_gateway_code = 'esewa' THEN '1114'
            ELSE '1113' -- Bank Transfer
        END;
    ELSE
        -- Default accounts
        v_debit_account := '1120';
        v_credit_account := '4100';
    END IF;
    
    -- Create simplified financial transaction (no USD conversion)
    INSERT INTO financial_transactions (
        transaction_type,
        reference_type,
        reference_id,
        description,
        debit_account,
        credit_account,
        amount,
        currency,
        status,
        posted_at,
        created_by,
        approved_by,
        approved_at,
        notes
    ) VALUES (
        CASE 
            WHEN p_payment_type IN ('refund', 'partial_refund') THEN 'refund'
            ELSE 'payment'
        END,
        'quote',
        p_quote_id,
        p_payment_type || ' - Order #' || v_quote.order_display_id,
        v_debit_account,
        v_credit_account,
        p_amount,
        p_currency,
        'posted',
        NOW(),
        v_user_id,
        v_user_id,
        NOW(),
        p_notes
    ) RETURNING id INTO v_financial_transaction_id;
    
    -- Create simplified payment ledger entry
    INSERT INTO payment_ledger (
        quote_id,
        payment_date,
        payment_type,
        payment_method,
        gateway_code,
        gateway_transaction_id,
        amount,
        currency,
        reference_number,
        status,
        financial_transaction_id,
        payment_proof_message_id,
        notes,
        created_by
    ) VALUES (
        p_quote_id,
        NOW(),
        p_payment_type,
        p_payment_method,
        p_gateway_code,
        p_gateway_transaction_id,
        p_amount,
        p_currency,
        p_reference_number,
        'completed',
        v_financial_transaction_id,
        p_message_id,
        p_notes,
        v_user_id
    ) RETURNING id INTO v_payment_ledger_id;
    
    -- Create payment record for backward compatibility (no USD conversion)
    INSERT INTO payment_records (
        quote_id,
        amount,
        payment_method,
        reference_number,
        notes,
        recorded_by,
        payment_ledger_id,
        gateway_code,
        gateway_transaction_id,
        status
    ) VALUES (
        p_quote_id,
        p_amount, -- Store in original currency
        p_payment_method,
        p_reference_number,
        p_notes,
        v_user_id,
        v_payment_ledger_id,
        p_gateway_code,
        p_gateway_transaction_id,
        'completed'
    );
    
    -- The trigger on payment_records will automatically update quote payment status
    
    RETURN jsonb_build_object(
        'success', true,
        'payment_ledger_id', v_payment_ledger_id,
        'financial_transaction_id', v_financial_transaction_id,
        'quote_payment_status', (SELECT payment_status FROM quotes WHERE id = p_quote_id)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION sync_payment_record_to_ledger TO authenticated;
GRANT EXECUTE ON FUNCTION create_payment_with_ledger_entry TO authenticated;

-- Add comments
COMMENT ON FUNCTION sync_payment_record_to_ledger IS 'Simplified sync function without USD conversion columns';
COMMENT ON FUNCTION create_payment_with_ledger_entry IS 'Simplified payment creation without USD conversion logic';