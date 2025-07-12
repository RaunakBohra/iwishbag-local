-- Add PayPal Refund Management System
-- This migration adds comprehensive refund tracking and management capabilities

-- Create PayPal refunds table
CREATE TABLE IF NOT EXISTS paypal_refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    refund_id TEXT UNIQUE NOT NULL, -- PayPal refund ID
    original_transaction_id TEXT NOT NULL, -- Original PayPal transaction/capture ID
    payment_transaction_id UUID REFERENCES payment_transactions(id), -- Link to our payment record
    quote_id UUID REFERENCES quotes(id), -- Link to the original quote
    user_id UUID REFERENCES profiles(id), -- Customer who gets the refund
    
    -- Refund details
    refund_amount DECIMAL(10,2) NOT NULL,
    original_amount DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL,
    refund_type TEXT NOT NULL DEFAULT 'FULL' CHECK (refund_type IN ('FULL', 'PARTIAL')),
    
    -- Refund reason and notes
    reason_code TEXT, -- PayPal reason code
    reason_description TEXT, -- Admin description
    admin_notes TEXT, -- Internal notes
    customer_note TEXT, -- Note shown to customer
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED')),
    paypal_status TEXT, -- PayPal's status
    
    -- Admin who processed the refund
    processed_by UUID REFERENCES profiles(id),
    
    -- PayPal response data
    paypal_response JSONB,
    error_details JSONB,
    
    -- Timestamps
    refund_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_paypal_refunds_refund_id ON paypal_refunds(refund_id);
CREATE INDEX IF NOT EXISTS idx_paypal_refunds_original_transaction ON paypal_refunds(original_transaction_id);
CREATE INDEX IF NOT EXISTS idx_paypal_refunds_payment_transaction ON paypal_refunds(payment_transaction_id);
CREATE INDEX IF NOT EXISTS idx_paypal_refunds_quote ON paypal_refunds(quote_id);
CREATE INDEX IF NOT EXISTS idx_paypal_refunds_user ON paypal_refunds(user_id);
CREATE INDEX IF NOT EXISTS idx_paypal_refunds_status ON paypal_refunds(status);
CREATE INDEX IF NOT EXISTS idx_paypal_refunds_created ON paypal_refunds(created_at DESC);

-- Add refund tracking to payment_transactions table
ALTER TABLE payment_transactions 
ADD COLUMN IF NOT EXISTS total_refunded DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS refund_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_fully_refunded BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_refund_at TIMESTAMPTZ;

-- Create refund reason codes lookup table
CREATE TABLE IF NOT EXISTS paypal_refund_reasons (
    code TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    customer_friendly_description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Insert common refund reasons
INSERT INTO paypal_refund_reasons (code, description, customer_friendly_description, display_order) VALUES
('DUPLICATE', 'Duplicate transaction', 'This appears to be a duplicate payment', 1),
('FRAUDULENT', 'Fraudulent transaction', 'Transaction was marked as fraudulent', 2),
('SUBSCRIPTION_CANCELED', 'Subscription canceled', 'Your subscription has been canceled', 3),
('PRODUCT_UNSATISFACTORY', 'Product unsatisfactory', 'Product did not meet expectations', 4),
('PRODUCT_NOT_RECEIVED', 'Product not received', 'Product was not received', 5),
('PRODUCT_UNACCEPTABLE', 'Product unacceptable', 'Product was not as described', 6),
('REFUND_REQUESTED', 'Customer requested refund', 'Refund requested by customer', 7),
('ORDER_CANCELED', 'Order canceled', 'Order was canceled', 8),
('MERCHANT_ERROR', 'Merchant error', 'Error on our end - sorry for the inconvenience', 9),
('CUSTOMER_SERVICE', 'Customer service gesture', 'Refund as a customer service gesture', 10),
('OTHER', 'Other reason', 'Other reason', 99)
ON CONFLICT (code) DO UPDATE SET
    description = EXCLUDED.description,
    customer_friendly_description = EXCLUDED.customer_friendly_description,
    display_order = EXCLUDED.display_order;

-- Create function to update payment transaction refund totals
CREATE OR REPLACE FUNCTION update_payment_refund_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the payment_transactions table with refund totals
    UPDATE payment_transactions
    SET 
        total_refunded = COALESCE((
            SELECT SUM(refund_amount)
            FROM paypal_refunds
            WHERE payment_transaction_id = NEW.payment_transaction_id
            AND status = 'COMPLETED'
        ), 0),
        refund_count = COALESCE((
            SELECT COUNT(*)
            FROM paypal_refunds
            WHERE payment_transaction_id = NEW.payment_transaction_id
            AND status = 'COMPLETED'
        ), 0),
        last_refund_at = CASE 
            WHEN NEW.status = 'COMPLETED' THEN NEW.completed_at 
            ELSE last_refund_at 
        END,
        updated_at = NOW()
    WHERE id = NEW.payment_transaction_id;
    
    -- Update is_fully_refunded flag
    UPDATE payment_transactions
    SET is_fully_refunded = (total_refunded >= amount)
    WHERE id = NEW.payment_transaction_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update refund totals
DROP TRIGGER IF EXISTS trigger_update_payment_refund_totals ON paypal_refunds;
CREATE TRIGGER trigger_update_payment_refund_totals
    AFTER INSERT OR UPDATE OF status, refund_amount, completed_at ON paypal_refunds
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_refund_totals();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_paypal_refunds_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_paypal_refunds_updated_at ON paypal_refunds;
CREATE TRIGGER trigger_paypal_refunds_updated_at
    BEFORE UPDATE ON paypal_refunds
    FOR EACH ROW
    EXECUTE FUNCTION update_paypal_refunds_updated_at();

-- RLS Policies for paypal_refunds
ALTER TABLE paypal_refunds ENABLE ROW LEVEL SECURITY;

-- Users can view their own refunds
CREATE POLICY "Users can view own refunds"
    ON paypal_refunds FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Admins can view all refunds
CREATE POLICY "Admins can view all refunds"
    ON paypal_refunds FOR SELECT
    TO authenticated
    USING (is_admin());

-- Admins can manage all refunds
CREATE POLICY "Admins can manage refunds"
    ON paypal_refunds FOR ALL
    TO authenticated
    USING (is_admin());

-- Service role can manage all refunds (for webhooks)
CREATE POLICY "Service role can manage refunds"
    ON paypal_refunds FOR ALL
    TO service_role
    USING (true);

-- RLS Policies for paypal_refund_reasons
ALTER TABLE paypal_refund_reasons ENABLE ROW LEVEL SECURITY;

-- Everyone can read refund reasons
CREATE POLICY "Anyone can read refund reasons"
    ON paypal_refund_reasons FOR SELECT
    TO authenticated
    USING (is_active = true);

-- Only admins can manage refund reasons
CREATE POLICY "Admins can manage refund reasons"
    ON paypal_refund_reasons FOR ALL
    TO authenticated
    USING (is_admin());

-- Grant permissions
GRANT SELECT ON paypal_refunds TO authenticated;
GRANT ALL ON paypal_refunds TO service_role;
GRANT SELECT ON paypal_refund_reasons TO authenticated;
GRANT ALL ON paypal_refund_reasons TO service_role;

-- Create helpful views for refund analytics
CREATE OR REPLACE VIEW paypal_refund_summary AS
SELECT 
    DATE_TRUNC('day', created_at) as refund_date,
    COUNT(*) as refund_count,
    SUM(refund_amount) as total_refunded,
    AVG(refund_amount) as avg_refund_amount,
    COUNT(CASE WHEN refund_type = 'FULL' THEN 1 END) as full_refunds,
    COUNT(CASE WHEN refund_type = 'PARTIAL' THEN 1 END) as partial_refunds,
    COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_refunds,
    COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed_refunds
FROM paypal_refunds
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY refund_date DESC;

-- Grant access to view
GRANT SELECT ON paypal_refund_summary TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE paypal_refunds IS 'Tracks all PayPal refund transactions with full audit trail';
COMMENT ON TABLE paypal_refund_reasons IS 'Lookup table for standardized refund reason codes';
COMMENT ON VIEW paypal_refund_summary IS 'Daily summary of refund activity for analytics';

-- Create sample query functions for common refund operations
CREATE OR REPLACE FUNCTION get_transaction_refund_eligibility(transaction_id UUID)
RETURNS TABLE (
    can_refund BOOLEAN,
    refundable_amount DECIMAL,
    reason TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN pt.status != 'completed' THEN FALSE
            WHEN pt.is_fully_refunded THEN FALSE
            WHEN pt.created_at < NOW() - INTERVAL '180 days' THEN FALSE
            ELSE TRUE
        END as can_refund,
        GREATEST(0, pt.amount - COALESCE(pt.total_refunded, 0)) as refundable_amount,
        CASE 
            WHEN pt.status != 'completed' THEN 'Transaction not completed'
            WHEN pt.is_fully_refunded THEN 'Transaction already fully refunded'
            WHEN pt.created_at < NOW() - INTERVAL '180 days' THEN 'Transaction too old (>180 days)'
            ELSE 'Eligible for refund'
        END as reason
    FROM payment_transactions pt
    WHERE pt.id = transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on function
GRANT EXECUTE ON FUNCTION get_transaction_refund_eligibility(UUID) TO authenticated;