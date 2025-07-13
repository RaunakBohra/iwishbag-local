-- Credit Notes and Debit Notes System
-- For managing store credits, adjustments, and future order applications

-- 1. Credit Notes table
CREATE TABLE IF NOT EXISTS public.credit_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_number TEXT UNIQUE NOT NULL,
    note_type TEXT NOT NULL CHECK (note_type IN ('credit', 'debit')),
    
    -- Reference
    quote_id UUID REFERENCES quotes(id),
    refund_request_id UUID REFERENCES refund_requests(id),
    customer_id UUID REFERENCES auth.users(id) NOT NULL,
    
    -- Amounts
    amount DECIMAL(15,4) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL,
    exchange_rate DECIMAL(15,6) DEFAULT 1,
    base_amount DECIMAL(15,4) NOT NULL,
    
    -- Usage tracking
    amount_used DECIMAL(15,4) DEFAULT 0 CHECK (amount_used >= 0),
    amount_available DECIMAL(15,4) GENERATED ALWAYS AS (amount - amount_used) STORED,
    
    -- Details
    reason TEXT NOT NULL,
    description TEXT,
    valid_from DATE DEFAULT CURRENT_DATE,
    valid_until DATE,
    
    -- Restrictions
    minimum_order_value DECIMAL(15,4),
    allowed_categories TEXT[],
    allowed_countries TEXT[],
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN (
        'draft', 'active', 'partially_used', 'fully_used', 
        'expired', 'cancelled', 'on_hold'
    )),
    
    -- Audit
    issued_by UUID REFERENCES auth.users(id) NOT NULL,
    issued_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES auth.users(id),
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    internal_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Credit Note Applications
CREATE TABLE IF NOT EXISTS public.credit_note_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_note_id UUID REFERENCES credit_notes(id) NOT NULL,
    quote_id UUID REFERENCES quotes(id) NOT NULL,
    
    -- Application details
    applied_amount DECIMAL(15,4) NOT NULL CHECK (applied_amount > 0),
    currency TEXT NOT NULL,
    exchange_rate DECIMAL(15,6) DEFAULT 1,
    base_amount DECIMAL(15,4) NOT NULL,
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'applied', 'reversed', 'expired'
    )),
    
    -- Linked payment
    payment_ledger_id UUID REFERENCES payment_ledger(id),
    financial_transaction_id UUID REFERENCES financial_transactions(id),
    
    -- Reversal tracking
    reversed_by UUID REFERENCES credit_note_applications(id),
    reversal_reason TEXT,
    reversed_at TIMESTAMPTZ,
    
    -- Audit
    applied_by UUID REFERENCES auth.users(id) NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Credit Note History (for audit trail)
CREATE TABLE IF NOT EXISTS public.credit_note_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_note_id UUID REFERENCES credit_notes(id) NOT NULL,
    action TEXT NOT NULL CHECK (action IN (
        'created', 'approved', 'applied', 'partially_applied',
        'reversed', 'extended', 'cancelled', 'expired'
    )),
    previous_status TEXT,
    new_status TEXT,
    amount_change DECIMAL(15,4),
    description TEXT,
    performed_by UUID REFERENCES auth.users(id) NOT NULL,
    performed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    metadata JSONB DEFAULT '{}'
);

-- Create indexes
CREATE INDEX idx_credit_notes_customer ON credit_notes(customer_id);
CREATE INDEX idx_credit_notes_status ON credit_notes(status);
CREATE INDEX idx_credit_notes_valid_dates ON credit_notes(valid_from, valid_until);
CREATE INDEX idx_credit_notes_quote ON credit_notes(quote_id);

CREATE INDEX idx_credit_note_applications_note ON credit_note_applications(credit_note_id);
CREATE INDEX idx_credit_note_applications_quote ON credit_note_applications(quote_id);
CREATE INDEX idx_credit_note_applications_status ON credit_note_applications(status);

CREATE INDEX idx_credit_note_history_note ON credit_note_history(credit_note_id);
CREATE INDEX idx_credit_note_history_action ON credit_note_history(action);

-- Update triggers
CREATE TRIGGER update_credit_notes_updated_at 
    BEFORE UPDATE ON credit_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Generate credit note number
CREATE SEQUENCE IF NOT EXISTS credit_note_number_seq;

CREATE OR REPLACE FUNCTION generate_credit_note_number()
RETURNS TEXT AS $$
DECLARE
    v_year TEXT;
    v_seq TEXT;
BEGIN
    v_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    v_seq := LPAD(nextval('credit_note_number_seq')::TEXT, 6, '0');
    RETURN 'CN-' || v_year || '-' || v_seq;
END;
$$ LANGUAGE plpgsql;

-- Function to create credit note
CREATE OR REPLACE FUNCTION create_credit_note(
    p_customer_id UUID,
    p_amount DECIMAL,
    p_currency TEXT,
    p_reason TEXT,
    p_description TEXT DEFAULT NULL,
    p_quote_id UUID DEFAULT NULL,
    p_refund_request_id UUID DEFAULT NULL,
    p_valid_days INTEGER DEFAULT 365,
    p_minimum_order_value DECIMAL DEFAULT NULL,
    p_auto_approve BOOLEAN DEFAULT false
)
RETURNS JSONB AS $$
DECLARE
    v_credit_note_id UUID;
    v_note_number TEXT;
    v_exchange_rate DECIMAL;
    v_base_amount DECIMAL;
    v_user_id UUID;
    v_financial_transaction_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    -- Generate note number
    v_note_number := generate_credit_note_number();
    
    -- Get exchange rate
    SELECT rate_from_usd INTO v_exchange_rate
    FROM country_settings
    WHERE currency = p_currency;
    
    IF v_exchange_rate IS NULL THEN
        v_exchange_rate := 1;
    END IF;
    
    v_base_amount := p_amount / v_exchange_rate;
    
    -- Create credit note
    INSERT INTO credit_notes (
        note_number,
        note_type,
        quote_id,
        refund_request_id,
        customer_id,
        amount,
        currency,
        exchange_rate,
        base_amount,
        reason,
        description,
        valid_from,
        valid_until,
        minimum_order_value,
        status,
        issued_by,
        issued_at,
        approved_by,
        approved_at
    ) VALUES (
        v_note_number,
        'credit',
        p_quote_id,
        p_refund_request_id,
        p_customer_id,
        p_amount,
        p_currency,
        v_exchange_rate,
        v_base_amount,
        p_reason,
        p_description,
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '1 day' * p_valid_days,
        p_minimum_order_value,
        CASE WHEN p_auto_approve THEN 'active' ELSE 'draft' END,
        v_user_id,
        NOW(),
        CASE WHEN p_auto_approve THEN v_user_id ELSE NULL END,
        CASE WHEN p_auto_approve THEN NOW() ELSE NULL END
    ) RETURNING id INTO v_credit_note_id;
    
    -- Create financial transaction if approved
    IF p_auto_approve THEN
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
            approved_at
        ) VALUES (
            'credit_note',
            'quote',
            COALESCE(p_quote_id, v_credit_note_id),
            'Credit Note: ' || v_note_number || ' - ' || p_reason,
            '5200', -- Refunds and Returns (expense)
            '2110', -- Customer Deposits (liability)
            p_amount,
            p_currency,
            v_exchange_rate,
            v_base_amount,
            'posted',
            NOW(),
            v_user_id,
            v_user_id,
            NOW()
        ) RETURNING id INTO v_financial_transaction_id;
    END IF;
    
    -- Add to history
    INSERT INTO credit_note_history (
        credit_note_id,
        action,
        new_status,
        description,
        performed_by,
        metadata
    ) VALUES (
        v_credit_note_id,
        'created',
        CASE WHEN p_auto_approve THEN 'active' ELSE 'draft' END,
        'Credit note created' || CASE WHEN p_auto_approve THEN ' and auto-approved' ELSE '' END,
        v_user_id,
        jsonb_build_object(
            'amount', p_amount,
            'currency', p_currency,
            'reason', p_reason
        )
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'credit_note_id', v_credit_note_id,
        'note_number', v_note_number,
        'status', CASE WHEN p_auto_approve THEN 'active' ELSE 'draft' END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to apply credit note to order
CREATE OR REPLACE FUNCTION apply_credit_note(
    p_credit_note_id UUID,
    p_quote_id UUID,
    p_amount DECIMAL DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_credit_note RECORD;
    v_quote RECORD;
    v_application_amount DECIMAL;
    v_application_id UUID;
    v_payment_result JSONB;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    -- Get credit note details
    SELECT * INTO v_credit_note
    FROM credit_notes
    WHERE id = p_credit_note_id 
    AND status = 'active'
    AND (valid_until IS NULL OR valid_until >= CURRENT_DATE);
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Credit note not found, not active, or expired'
        );
    END IF;
    
    -- Check customer ownership
    IF v_credit_note.customer_id != v_user_id AND NOT is_admin() THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Unauthorized to use this credit note'
        );
    END IF;
    
    -- Get quote details
    SELECT * INTO v_quote FROM quotes WHERE id = p_quote_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Quote not found'
        );
    END IF;
    
    -- Calculate application amount
    DECLARE
        v_quote_balance DECIMAL;
    BEGIN
        v_quote_balance := v_quote.final_total - COALESCE(v_quote.amount_paid, 0);
        v_application_amount := LEAST(
            COALESCE(p_amount, v_credit_note.amount_available),
            v_credit_note.amount_available,
            v_quote_balance
        );
    END;
    
    IF v_application_amount <= 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No amount to apply'
        );
    END IF;
    
    -- Check minimum order value
    IF v_credit_note.minimum_order_value IS NOT NULL 
       AND v_quote.final_total < v_credit_note.minimum_order_value THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Order value below minimum required for this credit note'
        );
    END IF;
    
    -- Create application record
    INSERT INTO credit_note_applications (
        credit_note_id,
        quote_id,
        applied_amount,
        currency,
        exchange_rate,
        base_amount,
        status,
        applied_by
    ) VALUES (
        p_credit_note_id,
        p_quote_id,
        v_application_amount,
        v_credit_note.currency,
        v_credit_note.exchange_rate,
        v_application_amount / v_credit_note.exchange_rate,
        'applied',
        v_user_id
    ) RETURNING id INTO v_application_id;
    
    -- Create payment ledger entry
    SELECT * FROM create_payment_with_ledger_entry(
        p_quote_id := p_quote_id,
        p_amount := v_application_amount,
        p_currency := v_credit_note.currency,
        p_payment_method := 'credit_note',
        p_payment_type := 'credit_applied',
        p_reference_number := v_credit_note.note_number,
        p_notes := 'Credit note applied: ' || v_credit_note.note_number,
        p_user_id := v_user_id
    ) INTO v_payment_result;
    
    -- Update credit note usage
    UPDATE credit_notes
    SET 
        amount_used = amount_used + v_application_amount,
        status = CASE 
            WHEN amount_used + v_application_amount >= amount THEN 'fully_used'
            ELSE 'partially_used'
        END
    WHERE id = p_credit_note_id;
    
    -- Update application with payment info
    UPDATE credit_note_applications
    SET 
        payment_ledger_id = (v_payment_result->>'payment_ledger_id')::UUID,
        financial_transaction_id = (v_payment_result->>'financial_transaction_id')::UUID
    WHERE id = v_application_id;
    
    -- Add to history
    INSERT INTO credit_note_history (
        credit_note_id,
        action,
        previous_status,
        new_status,
        amount_change,
        description,
        performed_by,
        metadata
    ) VALUES (
        p_credit_note_id,
        'applied',
        v_credit_note.status,
        CASE 
            WHEN v_credit_note.amount_used + v_application_amount >= v_credit_note.amount 
            THEN 'fully_used'
            ELSE 'partially_used'
        END,
        v_application_amount,
        'Applied to order #' || v_quote.order_display_id,
        v_user_id,
        jsonb_build_object(
            'quote_id', p_quote_id,
            'application_id', v_application_id,
            'amount_applied', v_application_amount
        )
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'application_id', v_application_id,
        'amount_applied', v_application_amount,
        'remaining_credit', v_credit_note.amount_available - v_application_amount,
        'payment_ledger_id', (v_payment_result->>'payment_ledger_id')::UUID
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get available credit notes for a customer
CREATE OR REPLACE FUNCTION get_available_credit_notes(
    p_customer_id UUID DEFAULT NULL,
    p_min_amount DECIMAL DEFAULT NULL
)
RETURNS TABLE (
    credit_note_id UUID,
    note_number TEXT,
    amount DECIMAL,
    currency TEXT,
    amount_available DECIMAL,
    reason TEXT,
    valid_until DATE,
    minimum_order_value DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cn.id,
        cn.note_number,
        cn.amount,
        cn.currency,
        cn.amount_available,
        cn.reason,
        cn.valid_until,
        cn.minimum_order_value
    FROM credit_notes cn
    WHERE cn.customer_id = COALESCE(p_customer_id, auth.uid())
    AND cn.status = 'active'
    AND cn.amount_available > 0
    AND (cn.valid_until IS NULL OR cn.valid_until >= CURRENT_DATE)
    AND (p_min_amount IS NULL OR cn.amount_available >= p_min_amount)
    ORDER BY cn.valid_until ASC NULLS LAST, cn.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON credit_notes TO authenticated;
GRANT SELECT, INSERT ON credit_note_applications TO authenticated;
GRANT SELECT, INSERT ON credit_note_history TO authenticated;
GRANT EXECUTE ON FUNCTION create_credit_note TO authenticated;
GRANT EXECUTE ON FUNCTION apply_credit_note TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_credit_notes TO authenticated;

-- Enable RLS
ALTER TABLE credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_note_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_note_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their credit notes" ON credit_notes
    FOR SELECT
    USING (customer_id = auth.uid() OR is_admin());

CREATE POLICY "Admins can manage credit notes" ON credit_notes
    FOR ALL
    USING (is_admin());

CREATE POLICY "Users can view their credit note applications" ON credit_note_applications
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM credit_notes 
            WHERE credit_notes.id = credit_note_applications.credit_note_id 
            AND (credit_notes.customer_id = auth.uid() OR is_admin())
        )
    );

CREATE POLICY "Users can apply their credit notes" ON credit_note_applications
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM credit_notes 
            WHERE credit_notes.id = credit_note_id 
            AND credit_notes.customer_id = auth.uid()
        )
    );

CREATE POLICY "View credit note history" ON credit_note_history
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM credit_notes 
            WHERE credit_notes.id = credit_note_history.credit_note_id 
            AND (credit_notes.customer_id = auth.uid() OR is_admin())
        )
    );

-- Comments
COMMENT ON TABLE credit_notes IS 'Store credits and adjustments that can be applied to future orders';
COMMENT ON TABLE credit_note_applications IS 'Track usage of credit notes on specific orders';
COMMENT ON TABLE credit_note_history IS 'Audit trail for all credit note actions';