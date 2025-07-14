-- Ensure payment_ledger table exists with basic structure
-- This is a simplified version to ensure basic functionality

-- Create payment_ledger table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.payment_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID REFERENCES quotes(id) NOT NULL,
    
    -- Basic payment details
    payment_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    payment_type TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    
    -- Amount and currency
    amount DECIMAL(15,4) NOT NULL,
    currency TEXT NOT NULL,
    
    -- Status and references
    status TEXT DEFAULT 'pending',
    reference_number TEXT,
    
    -- Notes and metadata
    notes TEXT,
    
    -- Tracking
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_payment_ledger_quote ON payment_ledger(quote_id);
CREATE INDEX IF NOT EXISTS idx_payment_ledger_date ON payment_ledger(payment_date);
CREATE INDEX IF NOT EXISTS idx_payment_ledger_status ON payment_ledger(status);

-- Enable RLS
ALTER TABLE payment_ledger ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$ 
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view payment ledger" ON payment_ledger;
    DROP POLICY IF EXISTS "Admins can manage payment ledger" ON payment_ledger;
    
    -- Create new policies
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
END $$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON payment_ledger TO authenticated;

-- Add update trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payment_ledger_updated_at 
    BEFORE UPDATE ON payment_ledger
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE payment_ledger IS 'Central payment tracking table. All payment amounts sync to quotes.amount_paid via triggers.';