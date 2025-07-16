-- Migration: Create core tables that were missing
-- This ensures all critical tables exist on database reset

-- Note: This migration creates only the tables that were manually added
-- The main schema should come from Supabase initialization or cloud dump

-- Create payment_documents table if it doesn't exist
CREATE TABLE IF NOT EXISTS payment_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    document_url TEXT NOT NULL,
    document_type TEXT NOT NULL DEFAULT 'payment_proof',
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    verified_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    amount DECIMAL(10,2),
    currency TEXT DEFAULT 'USD',
    payment_method TEXT,
    transaction_reference TEXT,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for payment_documents
CREATE INDEX IF NOT EXISTS idx_payment_documents_quote_id ON payment_documents(quote_id);
CREATE INDEX IF NOT EXISTS idx_payment_documents_user_id ON payment_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_documents_verified ON payment_documents(verified);

-- Add RLS policies for payment_documents
ALTER TABLE payment_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payment documents" ON payment_documents
    FOR SELECT USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Admins can manage all payment documents" ON payment_documents
    FOR ALL USING (is_admin());

-- Add trigger for updated_at
CREATE TRIGGER update_payment_documents_updated_at 
    BEFORE UPDATE ON payment_documents 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create missing columns that were added manually
ALTER TABLE user_addresses ADD COLUMN IF NOT EXISTS nickname TEXT;

-- Create missing payment processing functions
CREATE OR REPLACE FUNCTION process_stripe_payment_success(
    p_quote_id UUID,
    p_payment_intent_id TEXT,
    p_amount DECIMAL(10,2),
    p_currency TEXT DEFAULT 'USD'
) RETURNS void AS $$
BEGIN
    UPDATE quotes 
    SET 
        status = 'paid',
        updated_at = NOW()
    WHERE id = p_quote_id;
    
    INSERT INTO payment_transactions (
        quote_id,
        payment_intent_id,
        amount,
        currency,
        status,
        payment_method,
        created_at
    ) VALUES (
        p_quote_id,
        p_payment_intent_id,
        p_amount,
        p_currency,
        'completed',
        'stripe',
        NOW()
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION process_paypal_payment_atomic(
    p_quote_id UUID,
    p_paypal_order_id TEXT,
    p_amount DECIMAL(10,2),
    p_currency TEXT DEFAULT 'USD'
) RETURNS void AS $$
BEGIN
    UPDATE quotes 
    SET 
        status = 'paid',
        updated_at = NOW()
    WHERE id = p_quote_id;
    
    INSERT INTO payment_transactions (
        quote_id,
        paypal_order_id,
        amount,
        currency,
        status,
        payment_method,
        created_at
    ) VALUES (
        p_quote_id,
        p_paypal_order_id,
        p_amount,
        p_currency,
        'completed',
        'paypal',
        NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- Note: For a complete database setup from scratch, you should:
-- 1. Run supabase db reset (creates base schema)
-- 2. These migrations will add missing pieces
-- 3. seed.sql will populate the data