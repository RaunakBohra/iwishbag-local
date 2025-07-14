-- Create gateway_refunds table for tracking refunds across all payment gateways
CREATE TABLE IF NOT EXISTS public.gateway_refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Gateway identification
    gateway_refund_id TEXT NOT NULL, -- Refund ID from the gateway
    gateway_transaction_id TEXT, -- Original transaction ID
    gateway_code TEXT NOT NULL, -- 'payu', 'stripe', 'paypal', etc.
    
    -- Link to internal records
    payment_transaction_id UUID REFERENCES payment_transactions(id),
    quote_id UUID REFERENCES quotes(id),
    
    -- Refund amounts
    refund_amount DECIMAL(15,4) NOT NULL,
    original_amount DECIMAL(15,4),
    currency TEXT NOT NULL,
    
    -- Refund details
    refund_type TEXT CHECK (refund_type IN ('FULL', 'PARTIAL')),
    reason_code TEXT,
    reason_description TEXT,
    admin_notes TEXT,
    customer_note TEXT,
    
    -- Status tracking
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    gateway_status TEXT, -- Status from the gateway
    gateway_response JSONB, -- Full response from gateway
    
    -- Timestamps
    refund_date TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    
    -- Audit
    processed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX idx_gateway_refunds_quote ON gateway_refunds(quote_id);
CREATE INDEX idx_gateway_refunds_gateway ON gateway_refunds(gateway_code);
CREATE INDEX idx_gateway_refunds_status ON gateway_refunds(status);
CREATE INDEX idx_gateway_refunds_date ON gateway_refunds(refund_date);
CREATE INDEX idx_gateway_refunds_gateway_refund_id ON gateway_refunds(gateway_refund_id);

-- Enable RLS
ALTER TABLE gateway_refunds ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their refunds" ON gateway_refunds
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM quotes 
            WHERE quotes.id = gateway_refunds.quote_id 
            AND quotes.user_id = auth.uid()
        ) OR is_admin()
    );

CREATE POLICY "Admins can manage refunds" ON gateway_refunds
    FOR ALL
    USING (is_admin());

-- Grant permissions
GRANT SELECT ON gateway_refunds TO authenticated;
GRANT INSERT, UPDATE ON gateway_refunds TO authenticated;

-- Add update trigger
CREATE TRIGGER update_gateway_refunds_updated_at 
    BEFORE UPDATE ON gateway_refunds
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE gateway_refunds IS 'Tracks refunds across all payment gateways (PayU, Stripe, PayPal, etc.)';