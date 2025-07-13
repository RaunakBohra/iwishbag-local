-- Comprehensive refund management system
-- Handles full refunds, partial refunds, and multi-gateway refund processing

-- 1. Refund Requests
CREATE TABLE IF NOT EXISTS public.refund_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID REFERENCES quotes(id) NOT NULL,
    payment_ledger_id UUID REFERENCES payment_ledger(id),
    
    -- Refund details
    refund_type TEXT NOT NULL CHECK (refund_type IN (
        'full', 'partial', 'credit_note', 'chargeback', 'overpayment'
    )),
    requested_amount DECIMAL(15,4) NOT NULL,
    approved_amount DECIMAL(15,4),
    currency TEXT NOT NULL,
    
    -- Reason and status
    reason_code TEXT NOT NULL CHECK (reason_code IN (
        'order_cancelled', 'price_adjustment', 'overpayment', 
        'customer_request', 'product_unavailable', 'quality_issue',
        'shipping_issue', 'duplicate_payment', 'other'
    )),
    reason_description TEXT NOT NULL,
    customer_notes TEXT,
    internal_notes TEXT,
    
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'approved', 'rejected', 'processing', 
        'completed', 'failed', 'cancelled', 'partially_completed'
    )),
    
    -- Processing details
    requested_by UUID REFERENCES auth.users(id) NOT NULL,
    requested_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    processed_by UUID REFERENCES auth.users(id),
    processed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Gateway processing
    refund_method TEXT CHECK (refund_method IN (
        'original_payment_method', 'bank_transfer', 'credit_note', 'store_credit'
    )),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Refund Items (for tracking multiple refunds per request)
CREATE TABLE IF NOT EXISTS public.refund_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    refund_request_id UUID REFERENCES refund_requests(id) NOT NULL,
    payment_ledger_id UUID REFERENCES payment_ledger(id) NOT NULL,
    
    -- Refund allocation
    allocated_amount DECIMAL(15,4) NOT NULL,
    currency TEXT NOT NULL,
    exchange_rate DECIMAL(15,6) DEFAULT 1,
    base_amount DECIMAL(15,4) NOT NULL,
    
    -- Gateway specific
    gateway_code TEXT,
    gateway_refund_id TEXT,
    gateway_response JSONB,
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'processing', 'completed', 'failed', 'cancelled'
    )),
    processed_at TIMESTAMPTZ,
    
    -- Linked records
    refund_payment_id UUID REFERENCES payment_ledger(id),
    financial_transaction_id UUID REFERENCES financial_transactions(id),
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Create indexes
CREATE INDEX idx_refund_requests_quote ON refund_requests(quote_id);
CREATE INDEX idx_refund_requests_status ON refund_requests(status);
CREATE INDEX idx_refund_requests_requested_at ON refund_requests(requested_at);

CREATE INDEX idx_refund_items_request ON refund_items(refund_request_id);
CREATE INDEX idx_refund_items_status ON refund_items(status);

-- 4. Update triggers
CREATE TRIGGER update_refund_requests_updated_at 
    BEFORE UPDATE ON refund_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_refund_items_updated_at 
    BEFORE UPDATE ON refund_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Function to create refund request with automatic allocation
CREATE OR REPLACE FUNCTION create_refund_request(
    p_quote_id UUID,
    p_refund_type TEXT,
    p_amount DECIMAL,
    p_currency TEXT,
    p_reason_code TEXT,
    p_reason_description TEXT,
    p_customer_notes TEXT DEFAULT NULL,
    p_internal_notes TEXT DEFAULT NULL,
    p_refund_method TEXT DEFAULT 'original_payment_method',
    p_payment_ids UUID[] DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_refund_request_id UUID;
    v_quote RECORD;
    v_total_paid DECIMAL;
    v_user_id UUID;
    v_allocated_total DECIMAL := 0;
    v_remaining_amount DECIMAL;
    v_payment RECORD;
BEGIN
    -- Get user ID
    v_user_id := auth.uid();
    
    -- Get quote details
    SELECT * INTO v_quote FROM quotes WHERE id = p_quote_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Quote not found');
    END IF;
    
    -- Calculate total paid
    SELECT COALESCE(SUM(
        CASE 
            WHEN payment_type = 'customer_payment' THEN base_amount
            WHEN payment_type IN ('refund', 'partial_refund') THEN -base_amount
            ELSE 0
        END
    ), 0) INTO v_total_paid
    FROM payment_ledger
    WHERE quote_id = p_quote_id AND status = 'completed';
    
    -- Validate refund amount
    IF p_amount > v_total_paid THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Refund amount exceeds total paid amount'
        );
    END IF;
    
    -- Create refund request
    INSERT INTO refund_requests (
        quote_id,
        refund_type,
        requested_amount,
        currency,
        reason_code,
        reason_description,
        customer_notes,
        internal_notes,
        refund_method,
        requested_by,
        requested_at,
        status
    ) VALUES (
        p_quote_id,
        p_refund_type,
        p_amount,
        p_currency,
        p_reason_code,
        p_reason_description,
        p_customer_notes,
        p_internal_notes,
        p_refund_method,
        v_user_id,
        NOW(),
        'pending'
    ) RETURNING id INTO v_refund_request_id;
    
    -- Auto-allocate refund to payments
    v_remaining_amount := p_amount;
    
    -- If specific payment IDs provided, use those
    IF p_payment_ids IS NOT NULL AND array_length(p_payment_ids, 1) > 0 THEN
        FOR v_payment IN 
            SELECT * FROM payment_ledger 
            WHERE id = ANY(p_payment_ids) 
            AND quote_id = p_quote_id
            AND payment_type = 'customer_payment'
            AND status = 'completed'
            ORDER BY payment_date DESC
        LOOP
            DECLARE
                v_allocation DECIMAL;
                v_exchange_rate DECIMAL;
            BEGIN
                -- Calculate allocation for this payment
                v_allocation := LEAST(v_remaining_amount, v_payment.amount);
                
                -- Get exchange rate
                SELECT rate_from_usd INTO v_exchange_rate
                FROM country_settings
                WHERE currency = p_currency;
                
                IF v_exchange_rate IS NULL THEN
                    v_exchange_rate := 1;
                END IF;
                
                -- Create refund item
                INSERT INTO refund_items (
                    refund_request_id,
                    payment_ledger_id,
                    allocated_amount,
                    currency,
                    exchange_rate,
                    base_amount,
                    gateway_code,
                    status
                ) VALUES (
                    v_refund_request_id,
                    v_payment.id,
                    v_allocation,
                    p_currency,
                    v_exchange_rate,
                    v_allocation / v_exchange_rate,
                    v_payment.gateway_code,
                    'pending'
                );
                
                v_allocated_total := v_allocated_total + v_allocation;
                v_remaining_amount := v_remaining_amount - v_allocation;
                
                EXIT WHEN v_remaining_amount <= 0;
            END;
        END LOOP;
    ELSE
        -- Auto-allocate to most recent payments first (LIFO)
        FOR v_payment IN 
            SELECT * FROM payment_ledger 
            WHERE quote_id = p_quote_id
            AND payment_type = 'customer_payment'
            AND status = 'completed'
            ORDER BY payment_date DESC
        LOOP
            DECLARE
                v_allocation DECIMAL;
                v_exchange_rate DECIMAL;
            BEGIN
                -- Calculate allocation for this payment
                v_allocation := LEAST(v_remaining_amount, v_payment.amount);
                
                -- Get exchange rate
                SELECT rate_from_usd INTO v_exchange_rate
                FROM country_settings
                WHERE currency = p_currency;
                
                IF v_exchange_rate IS NULL THEN
                    v_exchange_rate := 1;
                END IF;
                
                -- Create refund item
                INSERT INTO refund_items (
                    refund_request_id,
                    payment_ledger_id,
                    allocated_amount,
                    currency,
                    exchange_rate,
                    base_amount,
                    gateway_code,
                    status
                ) VALUES (
                    v_refund_request_id,
                    v_payment.id,
                    v_allocation,
                    p_currency,
                    v_exchange_rate,
                    v_allocation / v_exchange_rate,
                    v_payment.gateway_code,
                    'pending'
                );
                
                v_allocated_total := v_allocated_total + v_allocation;
                v_remaining_amount := v_remaining_amount - v_allocation;
                
                EXIT WHEN v_remaining_amount <= 0;
            END;
        END LOOP;
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'refund_request_id', v_refund_request_id,
        'allocated_amount', v_allocated_total,
        'refund_items_count', (
            SELECT COUNT(*) FROM refund_items 
            WHERE refund_request_id = v_refund_request_id
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function to approve refund request
CREATE OR REPLACE FUNCTION approve_refund_request(
    p_refund_request_id UUID,
    p_approved_amount DECIMAL DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_request RECORD;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    -- Get request details
    SELECT * INTO v_request 
    FROM refund_requests 
    WHERE id = p_refund_request_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Refund request not found or not pending'
        );
    END IF;
    
    -- Update request
    UPDATE refund_requests
    SET 
        status = 'approved',
        approved_amount = COALESCE(p_approved_amount, requested_amount),
        reviewed_by = v_user_id,
        reviewed_at = NOW(),
        internal_notes = COALESCE(internal_notes || E'\n' || p_notes, internal_notes)
    WHERE id = p_refund_request_id;
    
    -- Update refund items status
    UPDATE refund_items
    SET status = 'processing'
    WHERE refund_request_id = p_refund_request_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'refund_request_id', p_refund_request_id,
        'approved_amount', COALESCE(p_approved_amount, v_request.requested_amount)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Function to process refund item
CREATE OR REPLACE FUNCTION process_refund_item(
    p_refund_item_id UUID,
    p_gateway_refund_id TEXT,
    p_gateway_response JSONB DEFAULT NULL,
    p_status TEXT DEFAULT 'completed'
)
RETURNS JSONB AS $$
DECLARE
    v_item RECORD;
    v_request RECORD;
    v_payment_ledger_id UUID;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    -- Get refund item details
    SELECT ri.*, rr.quote_id, rr.refund_method
    INTO v_item
    FROM refund_items ri
    JOIN refund_requests rr ON ri.refund_request_id = rr.id
    WHERE ri.id = p_refund_item_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Refund item not found');
    END IF;
    
    -- Create payment ledger entry for refund
    SELECT * FROM create_payment_with_ledger_entry(
        p_quote_id := v_item.quote_id,
        p_amount := v_item.allocated_amount,
        p_currency := v_item.currency,
        p_payment_method := v_item.refund_method,
        p_payment_type := 'refund',
        p_reference_number := p_gateway_refund_id,
        p_gateway_code := v_item.gateway_code,
        p_gateway_transaction_id := p_gateway_refund_id,
        p_notes := 'Refund for request: ' || v_item.refund_request_id,
        p_user_id := v_user_id
    ) INTO v_payment_ledger_id;
    
    -- Update refund item
    UPDATE refund_items
    SET 
        status = p_status,
        gateway_refund_id = p_gateway_refund_id,
        gateway_response = p_gateway_response,
        processed_at = NOW(),
        refund_payment_id = (v_payment_ledger_id->>'payment_ledger_id')::UUID,
        financial_transaction_id = (v_payment_ledger_id->>'financial_transaction_id')::UUID
    WHERE id = p_refund_item_id;
    
    -- Check if all items are processed
    IF NOT EXISTS (
        SELECT 1 FROM refund_items 
        WHERE refund_request_id = v_item.refund_request_id 
        AND status NOT IN ('completed', 'failed', 'cancelled')
    ) THEN
        -- Update refund request status
        UPDATE refund_requests
        SET 
            status = CASE 
                WHEN EXISTS (
                    SELECT 1 FROM refund_items 
                    WHERE refund_request_id = v_item.refund_request_id 
                    AND status = 'failed'
                ) THEN 'partially_completed'
                ELSE 'completed'
            END,
            processed_by = v_user_id,
            processed_at = NOW(),
            completed_at = NOW()
        WHERE id = v_item.refund_request_id;
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'refund_item_id', p_refund_item_id,
        'payment_ledger_id', (v_payment_ledger_id->>'payment_ledger_id')::UUID
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON refund_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE ON refund_items TO authenticated;
GRANT EXECUTE ON FUNCTION create_refund_request TO authenticated;
GRANT EXECUTE ON FUNCTION approve_refund_request TO authenticated;
GRANT EXECUTE ON FUNCTION process_refund_item TO authenticated;

-- Enable RLS
ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE refund_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their refund requests" ON refund_requests
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM quotes 
            WHERE quotes.id = refund_requests.quote_id 
            AND (quotes.user_id = auth.uid() OR is_admin())
        )
    );

CREATE POLICY "Users can create refund requests" ON refund_requests
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM quotes 
            WHERE quotes.id = quote_id 
            AND quotes.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage refund requests" ON refund_requests
    FOR ALL
    USING (is_admin());

CREATE POLICY "Users can view refund items" ON refund_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM refund_requests rr
            JOIN quotes q ON rr.quote_id = q.id
            WHERE rr.id = refund_items.refund_request_id
            AND (q.user_id = auth.uid() OR is_admin())
        )
    );

CREATE POLICY "Admins can manage refund items" ON refund_items
    FOR ALL
    USING (is_admin());

-- Comments
COMMENT ON TABLE refund_requests IS 'Tracks all refund requests with approval workflow';
COMMENT ON TABLE refund_items IS 'Individual refund allocations across multiple payments';