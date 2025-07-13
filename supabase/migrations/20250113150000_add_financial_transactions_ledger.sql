-- Create comprehensive financial transaction ledger system
-- This implements double-entry bookkeeping for complete audit trail

-- 1. Chart of Accounts (for double-entry bookkeeping)
CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    account_type TEXT NOT NULL CHECK (account_type IN (
        'asset', 'liability', 'equity', 'revenue', 'expense'
    )),
    parent_code TEXT REFERENCES chart_of_accounts(code),
    is_active BOOLEAN DEFAULT true,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Financial Transactions (Double-Entry Ledger)
CREATE TABLE IF NOT EXISTS public.financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN (
        'payment', 'refund', 'adjustment', 'credit_note', 'debit_note', 
        'chargeback', 'fee', 'discount', 'write_off', 'exchange_adjustment'
    )),
    reference_type TEXT NOT NULL CHECK (reference_type IN (
        'quote', 'payment_transaction', 'refund', 'adjustment', 'fee'
    )),
    reference_id UUID NOT NULL,
    description TEXT NOT NULL,
    
    -- Double-entry fields
    debit_account TEXT NOT NULL REFERENCES chart_of_accounts(code),
    credit_account TEXT NOT NULL REFERENCES chart_of_accounts(code),
    amount DECIMAL(15,4) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL,
    exchange_rate DECIMAL(15,6) DEFAULT 1,
    base_amount DECIMAL(15,4) NOT NULL, -- Amount in base currency (USD)
    
    -- Status and verification
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'posted', 'void', 'reversed'
    )),
    posted_at TIMESTAMPTZ,
    reversed_by UUID REFERENCES financial_transactions(id),
    reversal_reason TEXT,
    
    -- Audit fields
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Insert default chart of accounts
INSERT INTO chart_of_accounts (code, name, account_type, parent_code, description) VALUES
-- Assets
('1000', 'Assets', 'asset', NULL, 'All company assets'),
('1100', 'Current Assets', 'asset', '1000', 'Short-term assets'),
('1110', 'Cash and Bank', 'asset', '1100', 'Cash and bank accounts'),
('1111', 'PayU Account', 'asset', '1110', 'PayU payment gateway balance'),
('1112', 'Stripe Account', 'asset', '1110', 'Stripe payment gateway balance'),
('1113', 'Bank Transfer Account', 'asset', '1110', 'Bank transfer receipts'),
('1114', 'eSewa Account', 'asset', '1110', 'eSewa payment gateway balance'),
('1120', 'Accounts Receivable', 'asset', '1100', 'Money owed by customers'),
('1130', 'Prepaid Expenses', 'asset', '1100', 'Expenses paid in advance'),

-- Liabilities
('2000', 'Liabilities', 'liability', NULL, 'All company liabilities'),
('2100', 'Current Liabilities', 'liability', '2000', 'Short-term liabilities'),
('2110', 'Customer Deposits', 'liability', '2100', 'Advance payments from customers'),
('2120', 'Accounts Payable', 'liability', '2100', 'Money owed to suppliers'),
('2130', 'Accrued Expenses', 'liability', '2100', 'Expenses incurred but not paid'),
('2140', 'Refunds Payable', 'liability', '2100', 'Pending refunds to customers'),

-- Equity
('3000', 'Equity', 'equity', NULL, 'Owner equity'),
('3100', 'Retained Earnings', 'equity', '3000', 'Accumulated profits'),

-- Revenue
('4000', 'Revenue', 'revenue', NULL, 'All revenue streams'),
('4100', 'Sales Revenue', 'revenue', '4000', 'Product sales revenue'),
('4200', 'Shipping Revenue', 'revenue', '4000', 'Shipping charges collected'),
('4300', 'Handling Fees', 'revenue', '4000', 'Handling fee revenue'),
('4400', 'Currency Exchange Gains', 'revenue', '4000', 'Gains from currency exchange'),

-- Expenses
('5000', 'Expenses', 'expense', NULL, 'All company expenses'),
('5100', 'Payment Gateway Fees', 'expense', '5000', 'Fees charged by payment gateways'),
('5200', 'Refunds and Returns', 'expense', '5000', 'Product refunds and returns'),
('5300', 'Bad Debt Expense', 'expense', '5000', 'Uncollectible customer accounts'),
('5400', 'Currency Exchange Loss', 'expense', '5000', 'Losses from currency exchange'),
('5500', 'Write-offs', 'expense', '5000', 'Written off amounts'),
('5600', 'Discounts Given', 'expense', '5000', 'Discounts provided to customers')
ON CONFLICT (code) DO NOTHING;

-- Create indexes for performance
CREATE INDEX idx_financial_transactions_date ON financial_transactions(transaction_date);
CREATE INDEX idx_financial_transactions_reference ON financial_transactions(reference_type, reference_id);
CREATE INDEX idx_financial_transactions_status ON financial_transactions(status);
CREATE INDEX idx_financial_transactions_accounts ON financial_transactions(debit_account, credit_account);

-- Create triggers for automatic updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_financial_transactions_updated_at 
    BEFORE UPDATE ON financial_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chart_of_accounts_updated_at 
    BEFORE UPDATE ON chart_of_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to post financial transactions
CREATE OR REPLACE FUNCTION post_financial_transaction(
    p_transaction_id UUID,
    p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_transaction RECORD;
BEGIN
    -- Get transaction details
    SELECT * INTO v_transaction
    FROM financial_transactions
    WHERE id = p_transaction_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Transaction not found or already posted'
        );
    END IF;
    
    -- Update transaction status
    UPDATE financial_transactions
    SET 
        status = 'posted',
        posted_at = NOW(),
        approved_by = p_user_id,
        approved_at = NOW()
    WHERE id = p_transaction_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'transaction_id', p_transaction_id,
        'posted_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to reverse a transaction
CREATE OR REPLACE FUNCTION reverse_financial_transaction(
    p_transaction_id UUID,
    p_user_id UUID,
    p_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_transaction RECORD;
    v_reversal_id UUID;
BEGIN
    -- Get original transaction
    SELECT * INTO v_transaction
    FROM financial_transactions
    WHERE id = p_transaction_id AND status = 'posted';
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Transaction not found or not posted'
        );
    END IF;
    
    -- Create reversal transaction (swap debit and credit)
    INSERT INTO financial_transactions (
        transaction_date,
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
        NOW(),
        v_transaction.transaction_type,
        v_transaction.reference_type,
        v_transaction.reference_id,
        'Reversal: ' || v_transaction.description,
        v_transaction.credit_account, -- Swap accounts
        v_transaction.debit_account,  -- Swap accounts
        v_transaction.amount,
        v_transaction.currency,
        v_transaction.exchange_rate,
        v_transaction.base_amount,
        'posted',
        NOW(),
        p_user_id,
        p_user_id,
        NOW(),
        'Reversal reason: ' || p_reason
    ) RETURNING id INTO v_reversal_id;
    
    -- Update original transaction
    UPDATE financial_transactions
    SET 
        status = 'reversed',
        reversed_by = v_reversal_id,
        reversal_reason = p_reason
    WHERE id = p_transaction_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'original_transaction_id', p_transaction_id,
        'reversal_transaction_id', v_reversal_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT ON chart_of_accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON financial_transactions TO authenticated;
GRANT EXECUTE ON FUNCTION post_financial_transaction TO authenticated;
GRANT EXECUTE ON FUNCTION reverse_financial_transaction TO authenticated;

-- Enable RLS
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view financial transactions" ON financial_transactions
    FOR SELECT
    USING (auth.uid() = created_by OR is_admin());

CREATE POLICY "Admins can manage financial transactions" ON financial_transactions
    FOR ALL
    USING (is_admin());

-- Add comments
COMMENT ON TABLE financial_transactions IS 'Double-entry bookkeeping ledger for all financial transactions';
COMMENT ON TABLE chart_of_accounts IS 'Chart of accounts for double-entry bookkeeping system';