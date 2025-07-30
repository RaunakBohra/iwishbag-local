-- Remove accounting tables (chart_of_accounts and financial_transactions)
-- These were part of a double-entry bookkeeping system that was never implemented

-- First, drop columns that reference financial_transactions
ALTER TABLE public.credit_note_applications 
  DROP COLUMN IF EXISTS financial_transaction_id;

ALTER TABLE public.payment_adjustments 
  DROP COLUMN IF EXISTS financial_transaction_id;

ALTER TABLE public.payment_ledger 
  DROP COLUMN IF EXISTS financial_transaction_id;

ALTER TABLE public.refund_items 
  DROP COLUMN IF EXISTS financial_transaction_id;

-- Update the functions that use financial_transaction_id
-- create_payment_with_ledger_entry function
CREATE OR REPLACE FUNCTION public.create_payment_with_ledger_entry(
  p_quote_id uuid, 
  p_amount numeric, 
  p_currency text, 
  p_payment_method text, 
  p_payment_type text DEFAULT 'customer_payment'::text, 
  p_reference_number text DEFAULT NULL::text, 
  p_gateway_code text DEFAULT NULL::text, 
  p_gateway_transaction_id text DEFAULT NULL::text, 
  p_notes text DEFAULT NULL::text, 
  p_user_id uuid DEFAULT NULL::uuid, 
  p_message_id uuid DEFAULT NULL::uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_payment_ledger_id UUID;
    v_quote RECORD;
    v_user_id UUID;
BEGIN
    -- Use provided user_id or current user
    v_user_id := COALESCE(p_user_id, auth.uid());
    
    -- Get quote details
    SELECT * INTO v_quote FROM quotes WHERE id = p_quote_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Quote not found: %', p_quote_id;
    END IF;
    
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
        p_message_id,
        p_notes,
        v_user_id
    ) RETURNING id INTO v_payment_ledger_id;
    
    -- The trigger on payment_records will automatically update quote payment status
    
    RETURN jsonb_build_object(
        'success', true,
        'payment_ledger_id', v_payment_ledger_id,
        'quote_payment_status', (SELECT payment_status FROM quotes WHERE id = p_quote_id)
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Payment creation failed: %', SQLERRM;
END;
$$;

-- Drop the financial_transactions table
DROP TABLE IF EXISTS public.financial_transactions CASCADE;

-- Drop the chart_of_accounts table
DROP TABLE IF EXISTS public.chart_of_accounts CASCADE;

-- Remove any RLS policies if they exist
DROP POLICY IF EXISTS "Admin users can manage chart of accounts" ON public.chart_of_accounts;
DROP POLICY IF EXISTS "Users can view chart of accounts" ON public.chart_of_accounts;
DROP POLICY IF EXISTS "Admin users can manage financial transactions" ON public.financial_transactions;
DROP POLICY IF EXISTS "Users can view their financial transactions" ON public.financial_transactions;