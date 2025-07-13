-- Payment Reconciliation System
-- For matching bank statements and gateway reports with system records

-- 1. Payment Reconciliation Sessions
CREATE TABLE IF NOT EXISTS public.payment_reconciliation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reconciliation_date DATE NOT NULL,
    payment_method TEXT NOT NULL,
    gateway_code TEXT,
    
    -- Bank/Gateway statement details
    statement_reference TEXT,
    statement_start_date DATE,
    statement_end_date DATE,
    statement_opening_balance DECIMAL(15,4),
    statement_closing_balance DECIMAL(15,4),
    statement_total_credits DECIMAL(15,4),
    statement_total_debits DECIMAL(15,4),
    
    -- System calculated details
    system_opening_balance DECIMAL(15,4),
    system_closing_balance DECIMAL(15,4),
    system_total_credits DECIMAL(15,4),
    system_total_debits DECIMAL(15,4),
    
    -- Reconciliation results
    opening_difference DECIMAL(15,4) GENERATED ALWAYS AS 
        (COALESCE(statement_opening_balance, 0) - COALESCE(system_opening_balance, 0)) STORED,
    closing_difference DECIMAL(15,4) GENERATED ALWAYS AS 
        (COALESCE(statement_closing_balance, 0) - COALESCE(system_closing_balance, 0)) STORED,
    
    -- Status
    status TEXT DEFAULT 'in_progress' CHECK (status IN (
        'in_progress', 'completed', 'discrepancy_found', 'abandoned'
    )),
    
    -- Matched transactions summary
    matched_count INTEGER DEFAULT 0,
    unmatched_system_count INTEGER DEFAULT 0,
    unmatched_statement_count INTEGER DEFAULT 0,
    total_matched_amount DECIMAL(15,4) DEFAULT 0,
    
    -- File uploads
    statement_file_url TEXT,
    statement_file_name TEXT,
    
    -- Audit
    reconciled_by UUID REFERENCES auth.users(id) NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Reconciliation Items (Individual transaction matching)
CREATE TABLE IF NOT EXISTS public.reconciliation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reconciliation_id UUID REFERENCES payment_reconciliation(id) NOT NULL,
    
    -- System side
    payment_ledger_id UUID REFERENCES payment_ledger(id),
    system_date DATE,
    system_amount DECIMAL(15,4),
    system_reference TEXT,
    system_description TEXT,
    
    -- Statement side
    statement_date DATE,
    statement_amount DECIMAL(15,4),
    statement_reference TEXT,
    statement_description TEXT,
    
    -- Matching
    matched BOOLEAN DEFAULT false,
    match_type TEXT CHECK (match_type IN (
        'exact', 'manual', 'partial', 'suggested', 'unmatched'
    )),
    match_confidence DECIMAL(3,2), -- 0.00 to 1.00
    matched_at TIMESTAMPTZ,
    matched_by UUID REFERENCES auth.users(id),
    
    -- Discrepancy handling
    discrepancy_amount DECIMAL(15,4) GENERATED ALWAYS AS 
        (COALESCE(statement_amount, 0) - COALESCE(system_amount, 0)) STORED,
    discrepancy_reason TEXT,
    resolution_action TEXT CHECK (resolution_action IN (
        'accept_difference', 'create_adjustment', 'investigate', 
        'write_off', 'pending_transaction'
    )),
    resolution_notes TEXT,
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'matched', 'discrepancy', 'resolved', 'ignored'
    )),
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Bank Statement Import Log
CREATE TABLE IF NOT EXISTS public.bank_statement_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reconciliation_id UUID REFERENCES payment_reconciliation(id),
    
    -- Import details
    file_name TEXT NOT NULL,
    file_url TEXT,
    file_format TEXT CHECK (file_format IN (
        'csv', 'excel', 'pdf', 'mt940', 'ofx', 'qif', 'manual'
    )),
    
    -- Processing
    total_rows INTEGER,
    processed_rows INTEGER DEFAULT 0,
    successful_rows INTEGER DEFAULT 0,
    failed_rows INTEGER DEFAULT 0,
    
    -- Results
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'processing', 'completed', 'failed', 'partial'
    )),
    error_log JSONB DEFAULT '[]',
    
    -- Audit
    imported_by UUID REFERENCES auth.users(id) NOT NULL,
    imported_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. Reconciliation Rules (for auto-matching)
CREATE TABLE IF NOT EXISTS public.reconciliation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name TEXT NOT NULL,
    rule_type TEXT NOT NULL CHECK (rule_type IN (
        'exact_match', 'fuzzy_match', 'amount_range', 'date_range', 'regex'
    )),
    
    -- Conditions
    payment_method TEXT,
    gateway_code TEXT,
    match_field TEXT CHECK (match_field IN (
        'reference', 'amount', 'description', 'date', 'combined'
    )),
    match_pattern TEXT,
    amount_tolerance DECIMAL(15,4),
    date_tolerance_days INTEGER,
    
    -- Actions
    auto_match BOOLEAN DEFAULT false,
    confidence_threshold DECIMAL(3,2) DEFAULT 0.90,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 100,
    
    -- Stats
    times_used INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    
    -- Audit
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX idx_payment_reconciliation_date ON payment_reconciliation(reconciliation_date);
CREATE INDEX idx_payment_reconciliation_method ON payment_reconciliation(payment_method);
CREATE INDEX idx_payment_reconciliation_status ON payment_reconciliation(status);

CREATE INDEX idx_reconciliation_items_reconciliation ON reconciliation_items(reconciliation_id);
CREATE INDEX idx_reconciliation_items_payment ON reconciliation_items(payment_ledger_id);
CREATE INDEX idx_reconciliation_items_matched ON reconciliation_items(matched);
CREATE INDEX idx_reconciliation_items_status ON reconciliation_items(status);

CREATE INDEX idx_bank_statement_imports_reconciliation ON bank_statement_imports(reconciliation_id);
CREATE INDEX idx_reconciliation_rules_active ON reconciliation_rules(is_active);

-- Update triggers
CREATE TRIGGER update_payment_reconciliation_updated_at 
    BEFORE UPDATE ON payment_reconciliation
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reconciliation_items_updated_at 
    BEFORE UPDATE ON reconciliation_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to start reconciliation session
CREATE OR REPLACE FUNCTION start_reconciliation_session(
    p_payment_method TEXT,
    p_gateway_code TEXT DEFAULT NULL,
    p_statement_date DATE DEFAULT CURRENT_DATE,
    p_statement_start_date DATE DEFAULT NULL,
    p_statement_end_date DATE DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_reconciliation_id UUID;
    v_user_id UUID;
    v_system_balance RECORD;
BEGIN
    v_user_id := auth.uid();
    
    -- Calculate system balances for the period
    SELECT 
        COALESCE(SUM(CASE WHEN payment_type = 'customer_payment' THEN base_amount ELSE 0 END), 0) as total_credits,
        COALESCE(SUM(CASE WHEN payment_type IN ('refund', 'partial_refund') THEN base_amount ELSE 0 END), 0) as total_debits
    INTO v_system_balance
    FROM payment_ledger
    WHERE payment_method = p_payment_method
    AND (p_gateway_code IS NULL OR gateway_code = p_gateway_code)
    AND status = 'completed'
    AND (p_statement_start_date IS NULL OR payment_date >= p_statement_start_date)
    AND (p_statement_end_date IS NULL OR payment_date <= p_statement_end_date + INTERVAL '1 day');
    
    -- Create reconciliation session
    INSERT INTO payment_reconciliation (
        reconciliation_date,
        payment_method,
        gateway_code,
        statement_start_date,
        statement_end_date,
        system_total_credits,
        system_total_debits,
        system_closing_balance,
        reconciled_by,
        status
    ) VALUES (
        p_statement_date,
        p_payment_method,
        p_gateway_code,
        p_statement_start_date,
        p_statement_end_date,
        v_system_balance.total_credits,
        v_system_balance.total_debits,
        v_system_balance.total_credits - v_system_balance.total_debits,
        v_user_id,
        'in_progress'
    ) RETURNING id INTO v_reconciliation_id;
    
    -- Pre-populate system transactions
    INSERT INTO reconciliation_items (
        reconciliation_id,
        payment_ledger_id,
        system_date,
        system_amount,
        system_reference,
        system_description,
        match_type,
        status
    )
    SELECT 
        v_reconciliation_id,
        pl.id,
        pl.payment_date::DATE,
        pl.base_amount,
        COALESCE(pl.reference_number, pl.gateway_transaction_id, pl.id::TEXT),
        pl.payment_type || ' - ' || COALESCE(pl.notes, ''),
        'unmatched',
        'pending'
    FROM payment_ledger pl
    WHERE pl.payment_method = p_payment_method
    AND (p_gateway_code IS NULL OR pl.gateway_code = p_gateway_code)
    AND pl.status = 'completed'
    AND (p_statement_start_date IS NULL OR pl.payment_date >= p_statement_start_date)
    AND (p_statement_end_date IS NULL OR pl.payment_date <= p_statement_end_date + INTERVAL '1 day');
    
    RETURN jsonb_build_object(
        'success', true,
        'reconciliation_id', v_reconciliation_id,
        'system_transactions_count', (
            SELECT COUNT(*) FROM reconciliation_items 
            WHERE reconciliation_id = v_reconciliation_id
        ),
        'system_total_credits', v_system_balance.total_credits,
        'system_total_debits', v_system_balance.total_debits
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-match transactions
CREATE OR REPLACE FUNCTION auto_match_transactions(
    p_reconciliation_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_matched_count INTEGER := 0;
    v_item RECORD;
    v_match RECORD;
BEGIN
    -- Try exact matches first (amount and reference)
    FOR v_item IN 
        SELECT * FROM reconciliation_items 
        WHERE reconciliation_id = p_reconciliation_id 
        AND matched = false 
        AND statement_amount IS NOT NULL
    LOOP
        -- Look for exact match
        SELECT ri.* INTO v_match
        FROM reconciliation_items ri
        WHERE ri.reconciliation_id = p_reconciliation_id
        AND ri.matched = false
        AND ri.payment_ledger_id IS NOT NULL
        AND ri.system_amount = v_item.statement_amount
        AND (
            ri.system_reference = v_item.statement_reference
            OR ri.system_date = v_item.statement_date
        )
        LIMIT 1;
        
        IF FOUND THEN
            -- Mark both as matched
            UPDATE reconciliation_items
            SET 
                matched = true,
                match_type = 'exact',
                match_confidence = 1.00,
                matched_at = NOW(),
                status = 'matched'
            WHERE id IN (v_item.id, v_match.id);
            
            v_matched_count := v_matched_count + 1;
        END IF;
    END LOOP;
    
    -- Update reconciliation summary
    UPDATE payment_reconciliation
    SET 
        matched_count = (
            SELECT COUNT(*) FROM reconciliation_items 
            WHERE reconciliation_id = p_reconciliation_id 
            AND matched = true
        ),
        unmatched_system_count = (
            SELECT COUNT(*) FROM reconciliation_items 
            WHERE reconciliation_id = p_reconciliation_id 
            AND payment_ledger_id IS NOT NULL
            AND matched = false
        ),
        unmatched_statement_count = (
            SELECT COUNT(*) FROM reconciliation_items 
            WHERE reconciliation_id = p_reconciliation_id 
            AND payment_ledger_id IS NULL
            AND matched = false
        ),
        total_matched_amount = (
            SELECT COALESCE(SUM(system_amount), 0) 
            FROM reconciliation_items 
            WHERE reconciliation_id = p_reconciliation_id 
            AND matched = true
        )
    WHERE id = p_reconciliation_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'matched_count', v_matched_count,
        'remaining_unmatched', (
            SELECT COUNT(*) FROM reconciliation_items 
            WHERE reconciliation_id = p_reconciliation_id 
            AND matched = false
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to complete reconciliation
CREATE OR REPLACE FUNCTION complete_reconciliation(
    p_reconciliation_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_reconciliation RECORD;
    v_unmatched_count INTEGER;
BEGIN
    -- Get reconciliation details
    SELECT * INTO v_reconciliation
    FROM payment_reconciliation
    WHERE id = p_reconciliation_id AND status = 'in_progress';
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Reconciliation not found or already completed'
        );
    END IF;
    
    -- Count unmatched items
    SELECT COUNT(*) INTO v_unmatched_count
    FROM reconciliation_items
    WHERE reconciliation_id = p_reconciliation_id
    AND matched = false;
    
    -- Update reconciliation status
    UPDATE payment_reconciliation
    SET 
        status = CASE 
            WHEN v_unmatched_count = 0 
                AND ABS(COALESCE(closing_difference, 0)) < 0.01 
            THEN 'completed'
            ELSE 'discrepancy_found'
        END,
        completed_at = NOW(),
        notes = COALESCE(notes || E'\n' || p_notes, p_notes)
    WHERE id = p_reconciliation_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'status', CASE 
            WHEN v_unmatched_count = 0 
                AND ABS(COALESCE(v_reconciliation.closing_difference, 0)) < 0.01 
            THEN 'completed'
            ELSE 'discrepancy_found'
        END,
        'unmatched_count', v_unmatched_count,
        'closing_difference', v_reconciliation.closing_difference
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON payment_reconciliation TO authenticated;
GRANT SELECT, INSERT, UPDATE ON reconciliation_items TO authenticated;
GRANT SELECT, INSERT ON bank_statement_imports TO authenticated;
GRANT SELECT ON reconciliation_rules TO authenticated;
GRANT EXECUTE ON FUNCTION start_reconciliation_session TO authenticated;
GRANT EXECUTE ON FUNCTION auto_match_transactions TO authenticated;
GRANT EXECUTE ON FUNCTION complete_reconciliation TO authenticated;

-- Enable RLS
ALTER TABLE payment_reconciliation ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_statement_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage reconciliation" ON payment_reconciliation
    FOR ALL
    USING (is_admin());

CREATE POLICY "Admins can manage reconciliation items" ON reconciliation_items
    FOR ALL
    USING (is_admin());

CREATE POLICY "Admins can manage bank imports" ON bank_statement_imports
    FOR ALL
    USING (is_admin());

CREATE POLICY "View reconciliation rules" ON reconciliation_rules
    FOR SELECT
    USING (is_admin());

-- Comments
COMMENT ON TABLE payment_reconciliation IS 'Payment reconciliation sessions for matching bank/gateway statements';
COMMENT ON TABLE reconciliation_items IS 'Individual transaction matching within reconciliation sessions';
COMMENT ON TABLE bank_statement_imports IS 'Log of bank statement file imports';
COMMENT ON TABLE reconciliation_rules IS 'Configurable rules for automatic transaction matching';