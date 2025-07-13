-- Enhanced payment ledger system for tracking all payment movements
-- This complements the financial_transactions table with payment-specific details

-- 1. Payment Ledger (Enhanced payment tracking)
CREATE TABLE IF NOT EXISTS public.payment_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID REFERENCES quotes(id) NOT NULL,
    payment_transaction_id UUID REFERENCES payment_transactions(id),
    
    -- Payment details
    payment_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    payment_type TEXT NOT NULL CHECK (payment_type IN (
        'customer_payment', 'refund', 'partial_refund', 'credit_applied',
        'overpayment', 'underpayment_adjustment', 'write_off', 'chargeback'
    )),
    payment_method TEXT NOT NULL,
    gateway_code TEXT,
    gateway_transaction_id TEXT,
    
    -- Amounts
    amount DECIMAL(15,4) NOT NULL,
    currency TEXT NOT NULL,
    exchange_rate DECIMAL(15,6) DEFAULT 1,
    base_amount DECIMAL(15,4) NOT NULL, -- USD equivalent
    
    -- Running balance
    balance_before DECIMAL(15,4) NOT NULL DEFAULT 0,
    balance_after DECIMAL(15,4) NOT NULL DEFAULT 0,
    
    -- Reference numbers
    reference_number TEXT,
    bank_reference TEXT,
    customer_reference TEXT,
    
    -- Status tracking
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'processing', 'completed', 'failed', 'reversed', 'cancelled'
    )),
    verified_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMPTZ,
    
    -- Linked transactions
    financial_transaction_id UUID REFERENCES financial_transactions(id),
    parent_payment_id UUID REFERENCES payment_ledger(id), -- For refunds/adjustments
    payment_proof_message_id UUID REFERENCES messages(id), -- Link to payment proof
    
    -- Metadata
    gateway_response JSONB,
    metadata JSONB DEFAULT '{}',
    notes TEXT,
    
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Payment Records (Keep existing table but enhance it)
-- Add new columns to existing payment_records table if they don't exist
ALTER TABLE payment_records 
ADD COLUMN IF NOT EXISTS payment_ledger_id UUID REFERENCES payment_ledger(id),
ADD COLUMN IF NOT EXISTS gateway_code TEXT,
ADD COLUMN IF NOT EXISTS gateway_transaction_id TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed',
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 3. Payment Adjustments
CREATE TABLE IF NOT EXISTS public.payment_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID REFERENCES quotes(id) NOT NULL,
    
    -- Adjustment details
    adjustment_type TEXT NOT NULL CHECK (adjustment_type IN (
        'price_change', 'discount', 'surcharge', 'tax_adjustment',
        'currency_adjustment', 'rounding', 'write_off', 'correction'
    )),
    adjustment_reason TEXT NOT NULL,
    
    -- Amounts
    original_amount DECIMAL(15,4) NOT NULL,
    adjusted_amount DECIMAL(15,4) NOT NULL,
    adjustment_value DECIMAL(15,4) NOT NULL,
    currency TEXT NOT NULL,
    
    -- Linked transactions
    financial_transaction_id UUID REFERENCES financial_transactions(id),
    payment_ledger_id UUID REFERENCES payment_ledger(id),
    
    -- Approval workflow
    requested_by UUID REFERENCES auth.users(id) NOT NULL,
    requested_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'approved', 'rejected', 'applied', 'cancelled'
    )),
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX idx_payment_ledger_quote ON payment_ledger(quote_id);
CREATE INDEX idx_payment_ledger_date ON payment_ledger(payment_date);
CREATE INDEX idx_payment_ledger_status ON payment_ledger(status);
CREATE INDEX idx_payment_ledger_method ON payment_ledger(payment_method);
CREATE INDEX idx_payment_ledger_gateway ON payment_ledger(gateway_code);

CREATE INDEX idx_payment_adjustments_quote ON payment_adjustments(quote_id);
CREATE INDEX idx_payment_adjustments_status ON payment_adjustments(status);

-- Update trigger for payment_ledger
CREATE TRIGGER update_payment_ledger_updated_at 
    BEFORE UPDATE ON payment_ledger
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_adjustments_updated_at 
    BEFORE UPDATE ON payment_adjustments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to create payment ledger entry with financial transaction
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
    v_balance_before DECIMAL;
    v_balance_after DECIMAL;
    v_exchange_rate DECIMAL;
    v_base_amount DECIMAL;
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
    
    -- Get exchange rate
    SELECT rate_from_usd INTO v_exchange_rate
    FROM country_settings
    WHERE currency = p_currency;
    
    IF v_exchange_rate IS NULL THEN
        v_exchange_rate := 1;
    END IF;
    
    -- Calculate base amount (USD)
    v_base_amount := p_amount / v_exchange_rate;
    
    -- Calculate balance before
    SELECT COALESCE(SUM(
        CASE 
            WHEN payment_type IN ('customer_payment', 'credit_applied') THEN base_amount
            WHEN payment_type IN ('refund', 'partial_refund', 'chargeback') THEN -base_amount
            ELSE 0
        END
    ), 0) INTO v_balance_before
    FROM payment_ledger
    WHERE quote_id = p_quote_id AND status = 'completed';
    
    -- Calculate balance after
    IF p_payment_type IN ('customer_payment', 'credit_applied') THEN
        v_balance_after := v_balance_before + v_base_amount;
    ELSIF p_payment_type IN ('refund', 'partial_refund', 'chargeback') THEN
        v_balance_after := v_balance_before - v_base_amount;
    ELSE
        v_balance_after := v_balance_before;
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
    
    -- Create financial transaction
    INSERT INTO financial_transactions (
        transaction_type,
        reference_type,
        reference_id,
        description,
        debit_account,
        credit_account,
        amount,
        currency,
        exchange_rate,
        base_amount,
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
        v_exchange_rate,
        v_base_amount,
        'posted',
        NOW(),
        v_user_id,
        v_user_id,
        NOW(),
        p_notes
    ) RETURNING id INTO v_financial_transaction_id;
    
    -- Create payment ledger entry
    INSERT INTO payment_ledger (
        quote_id,
        payment_date,
        payment_type,
        payment_method,
        gateway_code,
        gateway_transaction_id,
        amount,
        currency,
        exchange_rate,
        base_amount,
        balance_before,
        balance_after,
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
        v_exchange_rate,
        v_base_amount,
        v_balance_before,
        v_balance_after,
        p_reference_number,
        'completed',
        v_financial_transaction_id,
        p_message_id,
        p_notes,
        v_user_id
    ) RETURNING id INTO v_payment_ledger_id;
    
    -- Create payment record for backward compatibility
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
        v_base_amount, -- Store in USD for consistency
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
        'balance_after', v_balance_after,
        'quote_payment_status', (SELECT payment_status FROM quotes WHERE id = p_quote_id)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get payment history with running balance
CREATE OR REPLACE FUNCTION get_payment_history(
    p_quote_id UUID DEFAULT NULL,
    p_customer_id UUID DEFAULT NULL,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    payment_id UUID,
    quote_id UUID,
    order_display_id TEXT,
    payment_date TIMESTAMPTZ,
    payment_type TEXT,
    payment_method TEXT,
    gateway_name TEXT,
    amount DECIMAL,
    currency TEXT,
    base_amount DECIMAL,
    running_balance DECIMAL,
    reference_number TEXT,
    status TEXT,
    notes TEXT,
    created_by_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pl.id as payment_id,
        pl.quote_id,
        q.order_display_id,
        pl.payment_date,
        pl.payment_type,
        pl.payment_method,
        COALESCE(
            CASE 
                WHEN pl.gateway_code = 'payu' THEN 'PayU'
                WHEN pl.gateway_code = 'stripe' THEN 'Stripe'
                WHEN pl.gateway_code = 'esewa' THEN 'eSewa'
                WHEN pl.payment_method = 'bank_transfer' THEN 'Bank Transfer'
                ELSE UPPER(pl.gateway_code)
            END,
            'Manual'
        ) as gateway_name,
        pl.amount,
        pl.currency,
        pl.base_amount,
        pl.balance_after as running_balance,
        pl.reference_number,
        pl.status,
        pl.notes,
        COALESCE(p.full_name, p.email) as created_by_name
    FROM payment_ledger pl
    JOIN quotes q ON pl.quote_id = q.id
    LEFT JOIN profiles p ON pl.created_by = p.id
    WHERE 
        (p_quote_id IS NULL OR pl.quote_id = p_quote_id)
        AND (p_customer_id IS NULL OR q.user_id = p_customer_id)
        AND (p_start_date IS NULL OR pl.payment_date >= p_start_date::TIMESTAMPTZ)
        AND (p_end_date IS NULL OR pl.payment_date <= (p_end_date + INTERVAL '1 day')::TIMESTAMPTZ)
    ORDER BY pl.payment_date DESC, pl.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON payment_ledger TO authenticated;
GRANT SELECT, INSERT, UPDATE ON payment_adjustments TO authenticated;
GRANT EXECUTE ON FUNCTION create_payment_with_ledger_entry TO authenticated;
GRANT EXECUTE ON FUNCTION get_payment_history TO authenticated;

-- Enable RLS
ALTER TABLE payment_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_adjustments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view payment ledger" ON payment_ledger
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM quotes 
            WHERE quotes.id = payment_ledger.quote_id 
            AND (quotes.user_id = auth.uid() OR is_admin())
        )
    );

CREATE POLICY "Admins can manage payment ledger" ON payment_ledger
    FOR ALL
    USING (is_admin());

CREATE POLICY "Users can view payment adjustments" ON payment_adjustments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM quotes 
            WHERE quotes.id = payment_adjustments.quote_id 
            AND (quotes.user_id = auth.uid() OR is_admin())
        )
    );

CREATE POLICY "Admins can manage payment adjustments" ON payment_adjustments
    FOR ALL
    USING (is_admin());

-- Comments
COMMENT ON TABLE payment_ledger IS 'Comprehensive payment tracking with running balances and gateway details';
COMMENT ON TABLE payment_adjustments IS 'Track all payment adjustments and corrections';