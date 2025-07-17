

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."app_role" AS ENUM (
    'admin',
    'user',
    'moderator'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE TYPE "public"."quote_approval_status" AS ENUM (
    'pending',
    'approved',
    'rejected'
);


ALTER TYPE "public"."quote_approval_status" OWNER TO "postgres";


CREATE TYPE "public"."quote_priority" AS ENUM (
    'low',
    'normal',
    'high',
    'urgent'
);


ALTER TYPE "public"."quote_priority" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_credit_note"("p_credit_note_id" "uuid", "p_quote_id" "uuid", "p_amount" numeric DEFAULT NULL::numeric) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."apply_credit_note"("p_credit_note_id" "uuid", "p_quote_id" "uuid", "p_amount" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."approve_refund_request"("p_refund_request_id" "uuid", "p_approved_amount" numeric DEFAULT NULL::numeric, "p_notes" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."approve_refund_request"("p_refund_request_id" "uuid", "p_approved_amount" numeric, "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_match_transactions"("p_reconciliation_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."auto_match_transactions"("p_reconciliation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."before_address_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Ensure the user profile exists
  PERFORM ensure_user_profile_exists(NEW.user_id);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."before_address_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_authenticated_checkout_sessions"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete sessions that are expired and not completed
    DELETE FROM authenticated_checkout_sessions 
    WHERE expires_at < NOW() 
    AND status != 'completed';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_authenticated_checkout_sessions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_guest_sessions"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete sessions that are expired and not completed
    DELETE FROM guest_checkout_sessions 
    WHERE expires_at < NOW() 
    AND status != 'completed';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_guest_sessions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_oauth_tokens"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    UPDATE public.oauth_tokens 
    SET is_active = false 
    WHERE expires_at < now() AND is_active = true;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_oauth_tokens"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_payment_error_logs"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    DELETE FROM public.payment_error_logs 
    WHERE created_at < NOW() - INTERVAL '1 year';
END;
$$;


ALTER FUNCTION "public"."cleanup_old_payment_error_logs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_payment_health_logs"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    DELETE FROM public.payment_health_logs 
    WHERE created_at < NOW() - INTERVAL '6 months';
END;
$$;


ALTER FUNCTION "public"."cleanup_old_payment_health_logs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_payment_verification_logs"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    DELETE FROM public.payment_verification_logs 
    WHERE created_at < NOW() - INTERVAL '180 days';
END;
$$;


ALTER FUNCTION "public"."cleanup_old_payment_verification_logs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_webhook_logs"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    DELETE FROM public.webhook_logs 
    WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;


ALTER FUNCTION "public"."cleanup_old_webhook_logs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_reconciliation"("p_reconciliation_id" "uuid", "p_notes" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."complete_reconciliation"("p_reconciliation_id" "uuid", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."confirm_payment_from_proof"("p_quote_id" "uuid", "p_amount_paid" numeric, "p_payment_status" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_result JSONB;
  v_current_amount DECIMAL;
  v_final_total DECIMAL;
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can confirm payments';
  END IF;

  -- Get current quote details
  SELECT amount_paid, final_total 
  INTO v_current_amount, v_final_total
  FROM quotes 
  WHERE id = p_quote_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quote not found';
  END IF;

  -- Update the quote with payment information
  UPDATE quotes
  SET 
    amount_paid = p_amount_paid,
    payment_status = p_payment_status,
    paid_at = CASE 
      WHEN p_payment_status IN ('paid', 'overpaid') THEN NOW() 
      ELSE paid_at 
    END,
    updated_at = NOW()
  WHERE id = p_quote_id;

  -- Return success with details
  v_result := jsonb_build_object(
    'success', true,
    'quote_id', p_quote_id,
    'amount_paid', p_amount_paid,
    'payment_status', p_payment_status,
    'previous_amount', v_current_amount,
    'final_total', v_final_total
  );
  
  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."confirm_payment_from_proof"("p_quote_id" "uuid", "p_amount_paid" numeric, "p_payment_status" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."confirm_payment_from_proof"("p_quote_id" "uuid", "p_amount_paid" numeric, "p_payment_status" "text") IS 'Securely updates payment information for a quote when confirming payment from a payment proof. Only admins can execute this function.';



CREATE OR REPLACE FUNCTION "public"."create_credit_note"("p_customer_id" "uuid", "p_amount" numeric, "p_currency" "text", "p_reason" "text", "p_description" "text" DEFAULT NULL::"text", "p_quote_id" "uuid" DEFAULT NULL::"uuid", "p_refund_request_id" "uuid" DEFAULT NULL::"uuid", "p_valid_days" integer DEFAULT 365, "p_minimum_order_value" numeric DEFAULT NULL::numeric, "p_auto_approve" boolean DEFAULT false) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."create_credit_note"("p_customer_id" "uuid", "p_amount" numeric, "p_currency" "text", "p_reason" "text", "p_description" "text", "p_quote_id" "uuid", "p_refund_request_id" "uuid", "p_valid_days" integer, "p_minimum_order_value" numeric, "p_auto_approve" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_payment_ledger_entry_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$ BEGIN IF NEW.payment_method = 'paypal' AND NEW.status = 'completed' THEN IF NOT EXISTS (SELECT 1 FROM payment_ledger WHERE payment_transaction_id = NEW.id OR (quote_id = NEW.quote_id AND gateway_code = 'paypal' AND created_at >= NEW.created_at - INTERVAL '10 seconds')) THEN INSERT INTO payment_ledger (quote_id, payment_transaction_id, payment_type, amount, currency, payment_method, gateway_code, gateway_transaction_id, reference_number, status, payment_date, notes, created_by) VALUES (NEW.quote_id, NEW.id, 'customer_payment', NEW.amount, NEW.currency, 'paypal', 'paypal', COALESCE(NEW.paypal_capture_id, NEW.paypal_order_id, NEW.id::text), COALESCE(NEW.paypal_order_id, NEW.id::text), 'completed', NEW.created_at, 'PayPal payment (auto-created by trigger) - Order: ' || COALESCE(NEW.paypal_order_id, 'N/A'), NEW.user_id); END IF; END IF; RETURN NEW; END; $$;


ALTER FUNCTION "public"."create_payment_ledger_entry_trigger"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_payment_with_ledger_entry"("p_quote_id" "uuid", "p_amount" numeric, "p_currency" "text", "p_payment_method" "text", "p_payment_type" "text" DEFAULT 'customer_payment'::"text", "p_reference_number" "text" DEFAULT NULL::"text", "p_gateway_code" "text" DEFAULT NULL::"text", "p_gateway_transaction_id" "text" DEFAULT NULL::"text", "p_notes" "text" DEFAULT NULL::"text", "p_user_id" "uuid" DEFAULT NULL::"uuid", "p_message_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_payment_ledger_id UUID;
    v_financial_transaction_id UUID;
    v_quote RECORD;
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
    
    -- Create simplified financial transaction (no USD conversion)
    INSERT INTO financial_transactions (
        transaction_type,
        reference_type,
        reference_id,
        description,
        debit_account,
        credit_account,
        amount,
        currency,
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
        'posted',
        NOW(),
        v_user_id,
        v_user_id,
        NOW(),
        p_notes
    ) RETURNING id INTO v_financial_transaction_id;
    
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
        p_reference_number,
        'completed',
        v_financial_transaction_id,
        p_message_id,
        p_notes,
        v_user_id
    ) RETURNING id INTO v_payment_ledger_id;
    
    -- Create payment record for backward compatibility (no USD conversion)
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
        p_amount, -- Store in original currency
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
        'quote_payment_status', (SELECT payment_status FROM quotes WHERE id = p_quote_id)
    );
END;
$$;


ALTER FUNCTION "public"."create_payment_with_ledger_entry"("p_quote_id" "uuid", "p_amount" numeric, "p_currency" "text", "p_payment_method" "text", "p_payment_type" "text", "p_reference_number" "text", "p_gateway_code" "text", "p_gateway_transaction_id" "text", "p_notes" "text", "p_user_id" "uuid", "p_message_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_payment_with_ledger_entry"("p_quote_id" "uuid", "p_amount" numeric, "p_currency" "text", "p_payment_method" "text", "p_payment_type" "text", "p_reference_number" "text", "p_gateway_code" "text", "p_gateway_transaction_id" "text", "p_notes" "text", "p_user_id" "uuid", "p_message_id" "uuid") IS 'Simplified payment creation without USD conversion logic';



CREATE OR REPLACE FUNCTION "public"."create_refund_request"("p_quote_id" "uuid", "p_refund_type" "text", "p_amount" numeric, "p_currency" "text", "p_reason_code" "text", "p_reason_description" "text", "p_customer_notes" "text" DEFAULT NULL::"text", "p_internal_notes" "text" DEFAULT NULL::"text", "p_refund_method" "text" DEFAULT 'original_payment_method'::"text", "p_payment_ids" "uuid"[] DEFAULT NULL::"uuid"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."create_refund_request"("p_quote_id" "uuid", "p_refund_type" "text", "p_amount" numeric, "p_currency" "text", "p_reason_code" "text", "p_reason_description" "text", "p_customer_notes" "text", "p_internal_notes" "text", "p_refund_method" "text", "p_payment_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_user_profile"("_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Check if profile exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id) THEN
    -- Create profile with NULL country/currency to allow auto-set logic
    INSERT INTO public.profiles (id, full_name, phone, country, preferred_display_currency, referral_code)
    VALUES (
      _user_id, 
      'User', 
      NULL,
      NULL,  -- Let auto-set logic handle this
      NULL,  -- Let auto-set logic handle this
      'REF' || substr(md5(random()::text), 1, 8)
    );
    
    -- Create user role
    INSERT INTO public.user_roles (user_id, role, created_by)
    VALUES (_user_id, 'user', _user_id);
    
    -- Note: notification_preferences table was removed during cleanup
    -- No longer creating notification preferences for new users
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."ensure_user_profile"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_user_profile_exists"("_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Check if profile exists
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = _user_id) THEN
    -- Create a basic profile if it doesn't exist
    INSERT INTO profiles (id, created_at, updated_at)
    VALUES (_user_id, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
  END IF;
  
  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."ensure_user_profile_exists"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."expire_quotes"() RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  -- Update quotes that have expired
  UPDATE quotes 
  SET 
    status = 'expired',
    updated_at = NOW()
  WHERE 
    status = 'sent' 
    AND expires_at IS NOT NULL 
    AND expires_at <= NOW();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  -- Log the expiration
  INSERT INTO status_transitions_log (
    quote_id, 
    from_status, 
    to_status, 
    trigger, 
    metadata
  )
  SELECT 
    id, 
    'sent', 
    'expired', 
    'auto_expiration', 
    jsonb_build_object('expired_at', NOW(), 'sent_at', sent_at)
  FROM quotes 
  WHERE 
    status = 'expired' 
    AND updated_at >= NOW() - INTERVAL '1 minute';
  
  RETURN expired_count;
END;
$$;


ALTER FUNCTION "public"."expire_quotes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."force_update_payment"("p_quote_id" "uuid", "new_amount_paid" numeric, "new_payment_status" "text", "payment_method" "text" DEFAULT 'bank_transfer'::"text", "reference_number" "text" DEFAULT NULL::"text", "notes" "text" DEFAULT NULL::"text", "payment_currency" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  updated_quote RECORD;
  current_user_id UUID;
  payment_record_id UUID;
  existing_total DECIMAL;
  needed_amount DECIMAL;
  quote_currency TEXT;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  RAISE NOTICE 'Starting simple payment update - Quote: %, Amount: %', 
    p_quote_id, new_amount_paid;
  
  -- Get quote details
  SELECT * INTO updated_quote FROM quotes WHERE id = p_quote_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quote not found: %', p_quote_id;
  END IF;

  -- Use the quote's currency - no conversion needed
  quote_currency := updated_quote.final_currency;
  
  -- Calculate existing payment records total (in same currency)
  SELECT COALESCE(SUM(pr.amount), 0) INTO existing_total
  FROM payment_records pr 
  WHERE pr.quote_id = p_quote_id;
  
  RAISE NOTICE 'Existing payments: % %, New total needed: % %', 
    existing_total, quote_currency, new_amount_paid, quote_currency;
  
  -- Calculate how much we need to add (all in same currency)
  needed_amount := new_amount_paid - existing_total;
  
  RAISE NOTICE 'Amount to add: % %', needed_amount, quote_currency;
  
  -- If we need to add a positive amount, create a payment record
  IF needed_amount > 0 THEN
    INSERT INTO payment_records (
      quote_id,
      amount,
      payment_method,
      reference_number,
      notes,
      recorded_by
    ) VALUES (
      p_quote_id,
      needed_amount,  -- Store in original currency
      COALESCE(payment_method, 'bank_transfer'),
      COALESCE(reference_number, 'Manual verification'),
      COALESCE(notes, 'Payment verified from proof upload'),
      current_user_id
    ) RETURNING id INTO payment_record_id;
    
    RAISE NOTICE 'Created payment record: % for amount: % %', 
      payment_record_id, needed_amount, quote_currency;
    
  ELSIF needed_amount < 0 THEN
    -- Clear all records and create new one with exact amount
    DELETE FROM payment_records WHERE quote_id = p_quote_id;
    
    IF new_amount_paid > 0 THEN
      INSERT INTO payment_records (
        quote_id,
        amount,
        payment_method,
        reference_number,
        notes,
        recorded_by
      ) VALUES (
        p_quote_id,
        new_amount_paid,  -- Store exact amount in original currency
        COALESCE(payment_method, 'bank_transfer'),
        COALESCE(reference_number, 'Manual verification - adjusted'),
        COALESCE(notes, 'Payment amount adjusted during verification'),
        current_user_id
      ) RETURNING id INTO payment_record_id;
      
      RAISE NOTICE 'Recreated payment record: % for amount: % %', 
        payment_record_id, new_amount_paid, quote_currency;
    END IF;
    
  ELSE
    RAISE NOTICE 'No changes needed - amount unchanged';
  END IF;
  
  -- Trigger the quotes table update to recalculate amount_paid via trigger
  UPDATE quotes
  SET updated_at = NOW()
  WHERE id = p_quote_id;
  
  -- Get the updated record
  SELECT * INTO updated_quote FROM quotes WHERE id = p_quote_id;
  
  RAISE NOTICE 'Final amount_paid: % %, payment_status: %', 
    updated_quote.amount_paid, quote_currency, updated_quote.payment_status;
  
  -- Return success with currency info
  RETURN jsonb_build_object(
    'success', true,
    'quote_id', updated_quote.id,
    'amount_paid', updated_quote.amount_paid,
    'payment_status', updated_quote.payment_status,
    'payment_record_id', payment_record_id,
    'payment_amount', new_amount_paid,
    'payment_currency', quote_currency
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in force_update_payment: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$;


ALTER FUNCTION "public"."force_update_payment"("p_quote_id" "uuid", "new_amount_paid" numeric, "new_payment_status" "text", "payment_method" "text", "reference_number" "text", "notes" "text", "payment_currency" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."force_update_payment"("p_quote_id" "uuid", "new_amount_paid" numeric, "new_payment_status" "text", "payment_method" "text", "reference_number" "text", "notes" "text", "payment_currency" "text") IS 'Simplified payment update function that works purely in payment currency - no conversions';



CREATE OR REPLACE FUNCTION "public"."generate_credit_note_number"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_year TEXT;
    v_seq TEXT;
BEGIN
    v_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    v_seq := LPAD(nextval('credit_note_number_seq')::TEXT, 6, '0');
    RETURN 'CN-' || v_year || '-' || v_seq;
END;
$$;


ALTER FUNCTION "public"."generate_credit_note_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_display_id"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.display_id IS NULL THEN
    NEW.display_id := 'Q' || to_char(now(), 'YYYYMMDD') || '-' || substr(md5(random()::text), 1, 6);
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."generate_display_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_payment_link_code"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  -- Generate an 8-character code
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  
  -- Check if code already exists
  IF EXISTS (SELECT 1 FROM payment_links WHERE link_code = result) THEN
    -- Recursive call to generate a new code
    RETURN generate_payment_link_code();
  END IF;
  
  RETURN result;
END;
$$;


ALTER FUNCTION "public"."generate_payment_link_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_share_token"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN 'qt_' || substr(md5(random()::text), 1, 12);
END;
$$;


ALTER FUNCTION "public"."generate_share_token"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_active_payment_link_for_quote"("quote_uuid" "uuid") RETURNS TABLE("id" "uuid", "link_code" "text", "payment_url" "text", "api_version" "text", "status" "text", "expires_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pl.id,
        pl.link_code,
        pl.payment_url,
        pl.api_version,
        pl.status,
        pl.expires_at
    FROM public.payment_links pl
    WHERE pl.quote_id = quote_uuid 
      AND pl.status IN ('active', 'pending')
      AND pl.expires_at > now()
    ORDER BY pl.created_at DESC
    LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."get_active_payment_link_for_quote"("quote_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_all_user_emails"() RETURNS TABLE("user_id" "uuid", "email" "text", "full_name" "text", "source" "text")
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  -- Get all emails from auth.users
  SELECT 
    id as user_id,
    email,
    COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)) as full_name,
    'auth.users' as source
  FROM auth.users
  WHERE email IS NOT NULL
  
  UNION
  
  -- Get all emails from profiles
  SELECT 
    id as user_id,
    email,
    full_name,
    'profiles' as source
  FROM public.profiles
  WHERE email IS NOT NULL
  
  ORDER BY email;
$$;


ALTER FUNCTION "public"."get_all_user_emails"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_available_credit_notes"("p_customer_id" "uuid" DEFAULT NULL::"uuid", "p_min_amount" numeric DEFAULT NULL::numeric) RETURNS TABLE("credit_note_id" "uuid", "note_number" "text", "amount" numeric, "currency" "text", "amount_available" numeric, "reason" "text", "valid_until" "date", "minimum_order_value" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."get_available_credit_notes"("p_customer_id" "uuid", "p_min_amount" numeric) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."bank_account_details" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "account_name" "text" NOT NULL,
    "account_number" "text" NOT NULL,
    "bank_name" "text" NOT NULL,
    "branch_name" "text",
    "iban" "text",
    "swift_code" "text",
    "country_code" "text",
    "is_fallback" boolean DEFAULT false,
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb",
    "field_labels" "jsonb" DEFAULT '{}'::"jsonb",
    "display_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "destination_country" "text",
    "upi_id" "text",
    "upi_qr_string" "text",
    "payment_qr_url" "text",
    "instructions" "text",
    "currency_code" "text"
);


ALTER TABLE "public"."bank_account_details" OWNER TO "postgres";


COMMENT ON COLUMN "public"."bank_account_details"."is_fallback" IS 'Indicates if this account should be used as fallback when no country-specific account is found. Only one fallback per currency allowed.';



COMMENT ON COLUMN "public"."bank_account_details"."destination_country" IS 'Destination country this bank account is intended for (optional, for country-specific bank accounts)';



COMMENT ON COLUMN "public"."bank_account_details"."upi_id" IS 'UPI ID for digital payments (India)';



COMMENT ON COLUMN "public"."bank_account_details"."upi_qr_string" IS 'UPI QR code string for generating dynamic QR codes';



COMMENT ON COLUMN "public"."bank_account_details"."payment_qr_url" IS 'URL to static payment QR code image';



COMMENT ON COLUMN "public"."bank_account_details"."instructions" IS 'Additional payment instructions for customers';



COMMENT ON COLUMN "public"."bank_account_details"."currency_code" IS 'Currency code for the bank account (e.g., USD, INR, NPR). Used by email functions to filter bank accounts by currency.';



CREATE OR REPLACE FUNCTION "public"."get_bank_account_for_order"("p_country_code" "text", "p_destination_country" "text" DEFAULT NULL::"text") RETURNS SETOF "public"."bank_account_details"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- First try to find country-specific account
  IF p_destination_country IS NOT NULL THEN
    RETURN QUERY
    SELECT * FROM public.bank_account_details
    WHERE country_code = p_country_code
      AND destination_country = p_destination_country
      AND is_active = true
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- If found, return
    IF FOUND THEN
      RETURN;
    END IF;
  END IF;
  
  -- If no country-specific account, return fallback
  RETURN QUERY
  SELECT * FROM public.bank_account_details
  WHERE country_code = p_country_code
    AND is_fallback = true
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."get_bank_account_for_order"("p_country_code" "text", "p_destination_country" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_bank_details_for_email"("payment_currency" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    bank_record bank_account_details%ROWTYPE;
    formatted_details TEXT;
BEGIN
    -- Get the first active bank account for the specified currency
    SELECT * INTO bank_record
    FROM bank_account_details
    WHERE is_active = true 
    AND currency_code = payment_currency
    ORDER BY is_fallback ASC
    LIMIT 1;
    
    -- If no bank account found, return error message
    IF NOT FOUND THEN
        RETURN 'Bank details for ' || payment_currency || ' currency are currently unavailable. Please contact support for payment instructions.';
    END IF;
    
    -- Format bank details for HTML email
    formatted_details := 
        'Bank Name: ' || bank_record.bank_name || '<br>' ||
        'Account Name: ' || bank_record.account_name || '<br>' ||
        'Account Number: ' || bank_record.account_number || '<br>';
    
    -- Add SWIFT code if available
    IF bank_record.swift_code IS NOT NULL AND bank_record.swift_code != '' THEN
        formatted_details := formatted_details || 'SWIFT Code: ' || bank_record.swift_code || '<br>';
    END IF;
    
    -- Add currency
    IF bank_record.currency_code IS NOT NULL AND bank_record.currency_code != '' THEN
        formatted_details := formatted_details || 'Currency: ' || bank_record.currency_code;
    END IF;
    
    RETURN formatted_details;
END;
$$;


ALTER FUNCTION "public"."get_bank_details_for_email"("payment_currency" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_bank_details_for_email"("payment_currency" "text") IS 'Returns formatted bank account details for the specified currency, used in email templates for bank transfer payments';



CREATE OR REPLACE FUNCTION "public"."get_currency_conversion_metrics"("start_date" timestamp with time zone DEFAULT ("now"() - '30 days'::interval), "end_date" timestamp with time zone DEFAULT "now"()) RETURNS TABLE("currency_pair" "text", "conversion_count" bigint, "average_variance" numeric, "max_variance" numeric, "accuracy_score" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- This would be used to track how accurate our currency conversions are
    -- compared to actual payment gateway conversions
    RETURN QUERY
    WITH conversion_data AS (
        SELECT 
            CONCAT(q.final_currency, ' → ', pl.currency) as currency_pair,
            COUNT(*) as conversion_count,
            AVG(ABS((q.final_total * COALESCE(pl.exchange_rate, 1)) - pl.amount) / pl.amount * 100) as avg_variance,
            MAX(ABS((q.final_total * COALESCE(pl.exchange_rate, 1)) - pl.amount) / pl.amount * 100) as max_variance
        FROM quotes q
        JOIN payment_ledger pl ON q.id = pl.quote_id
        WHERE 
            pl.payment_date >= start_date
            AND pl.payment_date <= end_date
            AND pl.payment_type = 'customer_payment'
            AND pl.status = 'completed'
            AND q.final_currency != pl.currency
            AND pl.amount > 0
        GROUP BY q.final_currency, pl.currency
        HAVING COUNT(*) >= 3 -- Only include pairs with sufficient data
    )
    SELECT 
        cd.currency_pair,
        cd.conversion_count,
        cd.avg_variance as average_variance,
        cd.max_variance,
        GREATEST(0, 100 - cd.avg_variance) as accuracy_score
    FROM conversion_data cd
    ORDER BY cd.avg_variance DESC;
END;
$$;


ALTER FUNCTION "public"."get_currency_conversion_metrics"("start_date" timestamp with time zone, "end_date" timestamp with time zone) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_currency_conversion_metrics"("start_date" timestamp with time zone, "end_date" timestamp with time zone) IS 'Tracks accuracy of currency conversion estimates';



CREATE OR REPLACE FUNCTION "public"."get_currency_mismatches"("start_date" timestamp with time zone DEFAULT ("now"() - '30 days'::interval), "end_date" timestamp with time zone DEFAULT "now"()) RETURNS TABLE("quote_id" "uuid", "order_display_id" "text", "quote_currency" "text", "payment_currency" "text", "quote_amount" numeric, "payment_amount" numeric, "created_at" timestamp with time zone, "payment_method" "text", "gateway_transaction_id" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        q.id as quote_id,
        q.order_display_id,
        q.final_currency as quote_currency,
        pl.currency as payment_currency,
        q.final_total as quote_amount,
        pl.amount as payment_amount,
        pl.payment_date as created_at,
        pl.payment_method,
        pl.gateway_transaction_id
    FROM quotes q
    JOIN payment_ledger pl ON q.id = pl.quote_id
    WHERE 
        pl.payment_date >= start_date
        AND pl.payment_date <= end_date
        AND pl.payment_type = 'customer_payment'
        AND pl.status = 'completed'
        AND q.final_currency != pl.currency
    ORDER BY pl.payment_date DESC;
END;
$$;


ALTER FUNCTION "public"."get_currency_mismatches"("start_date" timestamp with time zone, "end_date" timestamp with time zone) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_currency_mismatches"("start_date" timestamp with time zone, "end_date" timestamp with time zone) IS 'Detects payments made in different currency than quote';



CREATE OR REPLACE FUNCTION "public"."get_currency_statistics"("start_date" timestamp with time zone DEFAULT ("now"() - '30 days'::interval), "end_date" timestamp with time zone DEFAULT "now"()) RETURNS TABLE("currency" "text", "total_payments" numeric, "total_refunds" numeric, "net_amount" numeric, "payment_count" bigint, "refund_count" bigint, "average_payment" numeric, "last_payment_date" timestamp with time zone, "unique_customers" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    WITH payment_stats AS (
        SELECT 
            pl.currency,
            SUM(CASE WHEN pl.payment_type = 'customer_payment' THEN pl.amount ELSE 0 END) as total_payments,
            SUM(CASE WHEN pl.payment_type IN ('refund', 'partial_refund') THEN pl.amount ELSE 0 END) as total_refunds,
            COUNT(CASE WHEN pl.payment_type = 'customer_payment' THEN 1 END) as payment_count,
            COUNT(CASE WHEN pl.payment_type IN ('refund', 'partial_refund') THEN 1 END) as refund_count,
            MAX(CASE WHEN pl.payment_type = 'customer_payment' THEN pl.payment_date END) as last_payment_date,
            COUNT(DISTINCT q.user_id) as unique_customers
        FROM payment_ledger pl
        JOIN quotes q ON pl.quote_id = q.id
        WHERE 
            pl.payment_date >= start_date
            AND pl.payment_date <= end_date
            AND pl.status = 'completed'
        GROUP BY pl.currency
    )
    SELECT 
        ps.currency,
        ps.total_payments,
        ps.total_refunds,
        (ps.total_payments - ps.total_refunds) as net_amount,
        ps.payment_count,
        ps.refund_count,
        CASE WHEN ps.payment_count > 0 THEN ps.total_payments / ps.payment_count ELSE 0 END as average_payment,
        ps.last_payment_date,
        ps.unique_customers
    FROM payment_stats ps
    ORDER BY (ps.total_payments - ps.total_refunds) DESC;
END;
$$;


ALTER FUNCTION "public"."get_currency_statistics"("start_date" timestamp with time zone, "end_date" timestamp with time zone) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_currency_statistics"("start_date" timestamp with time zone, "end_date" timestamp with time zone) IS 'Provides currency usage statistics for monitoring dashboard';



CREATE OR REPLACE FUNCTION "public"."get_exchange_rate_health"() RETURNS TABLE("currency" "text", "current_rate" numeric, "last_updated" timestamp with time zone, "is_stale" boolean, "is_fallback" boolean, "age_minutes" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cs.currency,
        cs.rate_from_usd as current_rate,
        cs.updated_at as last_updated,
        (cs.updated_at < NOW() - INTERVAL '1 hour') as is_stale,
        (cs.rate_from_usd = 1 AND cs.currency != 'USD') as is_fallback,
        EXTRACT(EPOCH FROM (NOW() - cs.updated_at)) / 60 as age_minutes
    FROM country_settings cs
    WHERE cs.rate_from_usd IS NOT NULL
    ORDER BY 
        (cs.updated_at < NOW() - INTERVAL '1 hour') DESC,
        cs.currency ASC;
END;
$$;


ALTER FUNCTION "public"."get_exchange_rate_health"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_exchange_rate_health"() IS 'Monitors exchange rate freshness and accuracy';



CREATE OR REPLACE FUNCTION "public"."get_orders_with_payment_proofs"("status_filter" "text" DEFAULT NULL::"text", "limit_count" integer DEFAULT 50) RETURNS TABLE("order_id" "uuid", "order_display_id" "text", "final_total" numeric, "final_currency" "text", "payment_status" "text", "payment_method" "text", "customer_email" "text", "customer_id" "uuid", "message_id" "uuid", "verification_status" "text", "admin_notes" "text", "amount_paid" numeric, "attachment_file_name" "text", "attachment_url" "text", "submitted_at" timestamp with time zone, "verified_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    q.id as order_id,
    q.order_display_id,
    q.final_total,
    q.final_currency,
    q.payment_status,
    q.payment_method,
    auth_users.email as customer_email,
    q.user_id as customer_id,
    m.id as message_id,
    m.verification_status,
    m.admin_notes,
    q.amount_paid,
    m.attachment_file_name,
    m.attachment_url,
    m.created_at as submitted_at,
    m.verified_at
  FROM quotes q
  JOIN messages m ON q.id = m.quote_id
  LEFT JOIN auth.users auth_users ON q.user_id = auth_users.id
  WHERE m.message_type = 'payment_proof'
    AND (status_filter IS NULL OR m.verification_status = status_filter)
  ORDER BY m.created_at DESC
  LIMIT limit_count;
END;
$$;


ALTER FUNCTION "public"."get_orders_with_payment_proofs"("status_filter" "text", "limit_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_payment_history"("p_quote_id" "uuid" DEFAULT NULL::"uuid", "p_customer_id" "uuid" DEFAULT NULL::"uuid", "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS TABLE("payment_id" "uuid", "quote_id" "uuid", "order_display_id" "text", "payment_date" timestamp with time zone, "payment_type" "text", "payment_method" "text", "gateway_name" "text", "amount" numeric, "currency" "text", "base_amount" numeric, "running_balance" numeric, "reference_number" "text", "status" "text", "notes" "text", "created_by_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."get_payment_history"("p_quote_id" "uuid", "p_customer_id" "uuid", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_payment_proof_stats"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total', COUNT(*),
    'pending', COUNT(*) FILTER (WHERE verification_status = 'pending'),
    'verified', COUNT(*) FILTER (WHERE verification_status = 'verified'),
    'confirmed', COUNT(*) FILTER (WHERE verification_status = 'confirmed'),
    'rejected', COUNT(*) FILTER (WHERE verification_status = 'rejected')
  ) INTO result
  FROM messages
  WHERE message_type = 'payment_proof';
  
  RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_payment_proof_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_shipping_cost"("p_origin_country" character varying, "p_destination_country" character varying, "p_weight" numeric, "p_price" numeric DEFAULT 0) RETURNS TABLE("cost" numeric, "method" "text", "delivery_days" "text", "carrier" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  route_record shipping_routes%ROWTYPE;
  weight_tier JSONB;
  tier_cost DECIMAL(10,2);
  base_cost DECIMAL(10,2);
  percentage_cost DECIMAL(10,2);
  final_cost DECIMAL(10,2);
BEGIN
  -- Try to get route-specific shipping cost
  SELECT * INTO route_record 
  FROM shipping_routes 
  WHERE origin_country = p_origin_country 
    AND destination_country = p_destination_country 
    AND is_active = true;
  
  IF FOUND THEN
    -- Use route-specific calculation
    base_cost := route_record.base_shipping_cost;
    
    -- Add weight-based cost
    base_cost := base_cost + (p_weight * route_record.cost_per_kg);
    
    -- Add percentage-based cost
    percentage_cost := (p_price * route_record.cost_percentage) / 100;
    
    -- Check weight tiers for additional adjustments
    FOR weight_tier IN SELECT * FROM jsonb_array_elements(route_record.weight_tiers)
    LOOP
      IF p_weight >= (weight_tier->>'min')::DECIMAL 
         AND (weight_tier->>'max' IS NULL OR p_weight <= (weight_tier->>'max')::DECIMAL) THEN
        tier_cost := (weight_tier->>'cost')::DECIMAL;
        base_cost := GREATEST(base_cost, tier_cost);
        EXIT;
      END IF;
    END LOOP;
    
    final_cost := base_cost + percentage_cost;
    
    -- Return with default carrier info
    RETURN QUERY SELECT 
      final_cost,
      'route-specific'::TEXT,
      '5-10'::TEXT,
      'DHL'::TEXT;
  ELSE
    -- Fallback to country settings (existing logic)
    -- This would need to be implemented based on your existing country_settings table
    RETURN QUERY SELECT 
      25.00::DECIMAL(10,2), -- Default fallback cost
      'default'::TEXT,
      '7-14'::TEXT,
      'Standard'::TEXT;
  END IF;
END;
$$;


ALTER FUNCTION "public"."get_shipping_cost"("p_origin_country" character varying, "p_destination_country" character varying, "p_weight" numeric, "p_price" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_suspicious_payment_amounts"("start_date" timestamp with time zone DEFAULT ("now"() - '30 days'::interval), "end_date" timestamp with time zone DEFAULT "now"(), "tolerance" numeric DEFAULT 0.01) RETURNS TABLE("quote_id" "uuid", "order_display_id" "text", "quote_amount" numeric, "quote_currency" "text", "payment_amount" numeric, "payment_currency" "text", "amount_difference" numeric, "created_at" timestamp with time zone, "suspicion_level" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        q.id as quote_id,
        q.order_display_id,
        q.final_total as quote_amount,
        q.final_currency as quote_currency,
        pl.amount as payment_amount,
        pl.currency as payment_currency,
        ABS(q.final_total - pl.amount) as amount_difference,
        pl.payment_date as created_at,
        CASE 
            WHEN ABS(q.final_total - pl.amount) < tolerance AND q.final_currency != pl.currency THEN 'HIGH'
            WHEN ABS(q.final_total - pl.amount) < (q.final_total * 0.05) AND q.final_currency != pl.currency THEN 'MEDIUM'
            ELSE 'LOW'
        END as suspicion_level
    FROM quotes q
    JOIN payment_ledger pl ON q.id = pl.quote_id
    WHERE 
        pl.payment_date >= start_date
        AND pl.payment_date <= end_date
        AND pl.payment_type = 'customer_payment'
        AND pl.status = 'completed'
        AND q.final_currency != pl.currency
        AND ABS(q.final_total - pl.amount) < GREATEST(q.final_total * 0.1, 100) -- Within 10% or 100 units
    ORDER BY 
        CASE 
            WHEN ABS(q.final_total - pl.amount) < tolerance THEN 1
            WHEN ABS(q.final_total - pl.amount) < (q.final_total * 0.05) THEN 2
            ELSE 3
        END,
        pl.payment_date DESC;
END;
$$;


ALTER FUNCTION "public"."get_suspicious_payment_amounts"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "tolerance" numeric) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_suspicious_payment_amounts"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "tolerance" numeric) IS 'Identifies potentially incorrectly recorded payment amounts';



CREATE OR REPLACE FUNCTION "public"."get_transaction_refund_eligibility"("transaction_id" "uuid") RETURNS TABLE("can_refund" boolean, "refundable_amount" numeric, "reason" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."get_transaction_refund_eligibility"("transaction_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_bank_accounts"("user_id" "uuid") RETURNS SETOF "public"."bank_account_details"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_country TEXT;
BEGIN
  -- Get user's country
  SELECT country INTO user_country FROM public.profiles WHERE id = user_id;
  
  -- Return bank accounts for user's country or fallback accounts
  RETURN QUERY
  SELECT * FROM public.bank_account_details
  WHERE is_active = true AND (
    country_code = user_country OR 
    (is_fallback = true AND NOT EXISTS (
      SELECT 1 FROM public.bank_account_details 
      WHERE country_code = user_country AND is_active = true
    ))
  )
  ORDER BY is_fallback ASC, display_order ASC;
END;
$$;


ALTER FUNCTION "public"."get_user_bank_accounts"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_default_address"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- If the new/updated address is being set as default
  IF NEW.is_default = TRUE THEN
    -- Set all other addresses for this user to not default
    UPDATE public.user_addresses 
    SET is_default = FALSE 
    WHERE user_id = NEW.user_id 
    AND id != NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_default_address"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Extract user data from signup metadata
  -- Support both 'name' and 'full_name' fields for compatibility
  INSERT INTO public.profiles (
    id, 
    full_name, 
    phone, 
    email,
    country, 
    preferred_display_currency
  )
  VALUES (
    new.id, 
    COALESCE(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      'User'
    ),
    new.raw_user_meta_data->>'phone',
    new.email,
    new.raw_user_meta_data->>'country',  -- Only set if explicitly provided
    new.raw_user_meta_data->>'currency'  -- Only set if explicitly provided
  );
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role, created_by)
  VALUES (new.id, 'user', new.id);
  
  -- Generate referral code
  UPDATE public.profiles 
  SET referral_code = 'REF' || substr(md5(random()::text), 1, 8)
  WHERE id = new.id;
  
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_any_role"("roles" "public"."app_role"[]) RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = ANY(roles)
  );
END;
$$;


ALTER FUNCTION "public"."has_any_role"("roles" "public"."app_role"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."has_any_role"("roles" "public"."app_role"[]) IS 'Check if the current user has any of the specified roles';



CREATE OR REPLACE FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles r
    WHERE r.user_id = has_role._user_id AND r.role = has_role._role
  );
END;
$$;


ALTER FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'::app_role
  );
END;
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_admin"() IS 'Check if the current user has admin role';



CREATE OR REPLACE FUNCTION "public"."is_authenticated"() RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$$;


ALTER FUNCTION "public"."is_authenticated"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_authenticated"() IS 'Check if there is an authenticated user';



CREATE OR REPLACE FUNCTION "public"."lock_address_after_payment"("quote_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.quotes 
  SET 
    address_locked = true,
    address_updated_at = NOW(),
    address_updated_by = user_id
  WHERE id = quote_uuid AND status IN ('paid', 'ordered', 'shipped', 'completed');
  
  RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."lock_address_after_payment"("quote_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_address_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Log the change in address history
  INSERT INTO public.quote_address_history (
    quote_id,
    old_address,
    new_address,
    changed_by,
    change_reason,
    change_type
  ) VALUES (
    NEW.id,
    CASE 
      WHEN TG_OP = 'UPDATE' THEN OLD.shipping_address
      ELSE NULL
    END,
    NEW.shipping_address,
    NEW.address_updated_by,
    'Address updated via ' || TG_OP,
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'create'
      WHEN TG_OP = 'UPDATE' AND NEW.address_locked AND NOT OLD.address_locked THEN 'lock'
      WHEN TG_OP = 'UPDATE' AND NOT NEW.address_locked AND OLD.address_locked THEN 'unlock'
      ELSE 'update'
    END
  );
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_address_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_quote_status_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Only log if status actually changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.status_transitions (
            quote_id,
            from_status,
            to_status,
            trigger,
            changed_by,
            changed_at
        ) VALUES (
            NEW.id,
            COALESCE(OLD.status, 'unknown'),
            NEW.status,
            'manual',
            auth.uid(),
            now()
        );
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_quote_status_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."post_financial_transaction"("p_transaction_id" "uuid", "p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."post_financial_transaction"("p_transaction_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_payment_webhook_atomic"("p_quote_ids" "text"[], "p_payment_status" "text", "p_payment_data" "jsonb", "p_guest_session_token" "text" DEFAULT NULL::"text", "p_guest_session_data" "jsonb" DEFAULT NULL::"jsonb", "p_create_order" boolean DEFAULT false) RETURNS TABLE("success" boolean, "payment_transaction_id" "uuid", "payment_ledger_entry_id" "uuid", "quotes_updated" boolean, "guest_session_updated" boolean, "order_id" "uuid", "error_message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_payment_tx_id UUID;
  v_order_id UUID;
  v_quotes_updated BOOLEAN := FALSE;
  v_guest_session_updated BOOLEAN := FALSE;
  v_user_id UUID;
  v_guest_session_id UUID;
  v_quote_record RECORD;
  v_existing_payment UUID;
  v_ledger_entry_id UUID;
  v_transaction_id TEXT;
  v_gateway_tx_id TEXT;
  v_amount DECIMAL(10,2);
  v_currency TEXT;
  v_customer_email TEXT;
  v_customer_name TEXT;
  v_customer_phone TEXT;
  v_payment_method TEXT;
  v_gateway_response JSONB;
BEGIN
  -- Start transaction (implicit with function)
  BEGIN
    -- Extract payment data from JSONB
    v_transaction_id := p_payment_data->>'transaction_id';
    v_gateway_tx_id := p_payment_data->>'gateway_transaction_id';
    v_amount := (p_payment_data->>'amount')::DECIMAL(10,2);
    v_currency := p_payment_data->>'currency';
    v_customer_email := p_payment_data->>'customer_email';
    v_customer_name := p_payment_data->>'customer_name';
    v_customer_phone := p_payment_data->>'customer_phone';
    v_payment_method := p_payment_data->>'payment_method';
    v_gateway_response := p_payment_data->'gateway_response';
    
    -- Validate required fields
    IF v_transaction_id IS NULL OR v_amount IS NULL OR v_currency IS NULL THEN
      RETURN QUERY SELECT 
        FALSE,
        NULL::UUID,
        NULL::UUID,
        FALSE,
        FALSE,
        NULL::UUID,
        'Missing required payment data fields'::TEXT;
      RETURN;
    END IF;
    
    -- Get user_id from first quote
    IF array_length(p_quote_ids, 1) > 0 THEN
      SELECT user_id INTO v_user_id
      FROM quotes
      WHERE id = p_quote_ids[1]::UUID;
    END IF;
    
    -- Check if payment transaction already exists (idempotency)
    SELECT id INTO v_existing_payment
    FROM payment_transactions
    WHERE transaction_id = v_transaction_id
       OR gateway_transaction_id = v_gateway_tx_id;
    
    -- Create or update payment transaction
    IF v_existing_payment IS NULL THEN
      -- Create new payment transaction
      INSERT INTO payment_transactions (
        user_id,
        transaction_id,
        gateway_transaction_id,
        amount,
        currency,
        status,
        payment_method,
        gateway_code,
        gateway_response,
        created_at,
        updated_at
      ) VALUES (
        v_user_id,
        v_transaction_id,
        v_gateway_tx_id,
        v_amount,
        v_currency,
        CASE 
          WHEN p_payment_status = 'success' THEN 'completed'
          WHEN p_payment_status = 'failed' THEN 'failed'
          ELSE 'pending'
        END,
        v_payment_method,
        v_payment_method,
        v_gateway_response,
        NOW(),
        NOW()
      ) RETURNING id INTO v_payment_tx_id;
    ELSE
      -- Update existing payment transaction
      UPDATE payment_transactions
      SET 
        status = CASE 
          WHEN p_payment_status = 'success' THEN 'completed'
          WHEN p_payment_status = 'failed' THEN 'failed'
          ELSE 'pending'
        END,
        gateway_response = COALESCE(gateway_response, '{}'::jsonb) || v_gateway_response,
        updated_at = NOW()
      WHERE id = v_existing_payment;
      
      v_payment_tx_id := v_existing_payment;
    END IF;
    
    -- Create payment ledger entry for audit trail
    IF v_payment_tx_id IS NOT NULL THEN
      INSERT INTO payment_ledger (
        quote_id,
        payment_transaction_id,
        payment_type,
        amount,
        currency,
        payment_method,
        gateway_code,
        gateway_transaction_id,
        reference_number,
        status,
        payment_date,
        base_amount,
        balance_before,
        balance_after,
        notes,
        created_by,
        gateway_response,
        created_at,
        updated_at
      ) VALUES (
        CASE WHEN array_length(p_quote_ids, 1) > 0 THEN p_quote_ids[1]::UUID ELSE NULL END,
        v_payment_tx_id,
        'customer_payment',
        v_amount,
        v_currency,
        v_payment_method,
        v_payment_method,
        v_gateway_tx_id,
        v_transaction_id,
        CASE 
          WHEN p_payment_status = 'success' THEN 'completed'
          WHEN p_payment_status = 'failed' THEN 'failed'
          ELSE 'pending'
        END,
        NOW(),
        v_amount,
        0.00, -- Balance tracking would need separate implementation
        CASE WHEN p_payment_status = 'success' THEN v_amount ELSE 0.00 END,
        'Payment webhook: ' || p_payment_status,
        v_user_id,
        jsonb_build_object(
          'webhook_processing', true,
          'payment_status', p_payment_status,
          'transaction_id', v_transaction_id,
          'gateway_transaction_id', v_gateway_tx_id,
          'customer_email', v_customer_email,
          'customer_name', v_customer_name,
          'processed_at', NOW()
        ) || COALESCE(v_gateway_response, '{}'::jsonb),
        NOW(),
        NOW()
      ) RETURNING id INTO v_ledger_entry_id;
    END IF;
    
    -- Handle guest session updates if token provided
    IF p_guest_session_token IS NOT NULL THEN
      -- Get guest session
      SELECT id INTO v_guest_session_id
      FROM guest_checkout_sessions
      WHERE session_token = p_guest_session_token
        AND status = 'active';
      
      IF v_guest_session_id IS NOT NULL THEN
        IF p_payment_status = 'success' THEN
          -- Update guest session to completed
          UPDATE guest_checkout_sessions
          SET 
            status = 'completed',
            updated_at = NOW()
          WHERE id = v_guest_session_id;
          
          -- Update quotes with guest details if session data provided
          IF p_guest_session_data IS NOT NULL THEN
            UPDATE quotes
            SET 
              customer_name = p_guest_session_data->>'guest_name',
              email = p_guest_session_data->>'guest_email',
              shipping_address = p_guest_session_data->'shipping_address',
              is_anonymous = TRUE,
              user_id = NULL,
              address_updated_at = NOW(),
              address_updated_by = NULL
            WHERE id = (p_guest_session_data->>'quote_id')::UUID;
          END IF;
          
          v_guest_session_updated := TRUE;
        ELSIF p_payment_status = 'failed' THEN
          -- Expire guest session but keep quote shareable
          UPDATE guest_checkout_sessions
          SET 
            status = 'expired',
            updated_at = NOW()
          WHERE id = v_guest_session_id;
          
          v_guest_session_updated := TRUE;
        END IF;
      END IF;
    END IF;
    
    -- Update quotes if not a failed guest payment
    IF array_length(p_quote_ids, 1) > 0 AND NOT (p_guest_session_token IS NOT NULL AND p_payment_status = 'failed') THEN
      -- Update quotes with payment details
      UPDATE quotes
      SET 
        status = CASE 
          WHEN p_payment_status = 'success' THEN 'paid'
          WHEN p_payment_status = 'failed' THEN 'failed'
          ELSE 'pending'
        END,
        payment_method = v_payment_method,
        payment_status = CASE 
          WHEN p_payment_status = 'success' THEN 'paid'
          WHEN p_payment_status = 'failed' THEN 'failed'
          ELSE 'pending'
        END,
        paid_at = CASE WHEN p_payment_status = 'success' THEN NOW() ELSE NULL END,
        in_cart = FALSE,
        payment_details = jsonb_build_object(
          'gateway', v_payment_method,
          'transaction_id', v_transaction_id,
          'gateway_transaction_id', v_gateway_tx_id,
          'status', p_payment_status,
          'amount', v_amount,
          'currency', v_currency,
          'customer_name', v_customer_name,
          'customer_email', v_customer_email,
          'customer_phone', v_customer_phone,
          'webhook_received_at', NOW()
        ),
        updated_at = NOW()
      WHERE id = ANY(p_quote_ids::UUID[]);
      
      v_quotes_updated := TRUE;
    END IF;
    
    -- Create order if payment successful and requested
    IF p_create_order AND p_payment_status = 'success' AND array_length(p_quote_ids, 1) > 0 THEN
      -- Generate order number
      INSERT INTO orders (
        order_number,
        user_id,
        quote_ids,
        total_amount,
        currency,
        status,
        payment_method,
        customer_email,
        customer_name,
        customer_phone,
        payment_transaction_id,
        created_at,
        updated_at
      ) VALUES (
        'ORD-' || extract(epoch from now())::text || '-' || substring(md5(random()::text), 1, 9),
        v_user_id,
        p_quote_ids,
        v_amount,
        v_currency,
        'confirmed',
        v_payment_method,
        v_customer_email,
        v_customer_name,
        v_customer_phone,
        v_payment_tx_id,
        NOW(),
        NOW()
      ) RETURNING id INTO v_order_id;
    END IF;
    
    -- Return success
    RETURN QUERY SELECT 
      TRUE,
      v_payment_tx_id,
      v_ledger_entry_id,
      v_quotes_updated,
      v_guest_session_updated,
      v_order_id,
      NULL::TEXT;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback will happen automatically
      RETURN QUERY SELECT 
        FALSE,
        NULL::UUID,
        NULL::UUID,
        FALSE,
        FALSE,
        NULL::UUID,
        SQLERRM::TEXT;
  END;
END;
$$;


ALTER FUNCTION "public"."process_payment_webhook_atomic"("p_quote_ids" "text"[], "p_payment_status" "text", "p_payment_data" "jsonb", "p_guest_session_token" "text", "p_guest_session_data" "jsonb", "p_create_order" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."process_payment_webhook_atomic"("p_quote_ids" "text"[], "p_payment_status" "text", "p_payment_data" "jsonb", "p_guest_session_token" "text", "p_guest_session_data" "jsonb", "p_create_order" boolean) IS 'Atomically processes payment webhook data including quotes update, guest session handling, payment transaction creation, payment ledger entries, and order creation. Ensures all operations succeed or fail together with comprehensive audit trail.';



CREATE OR REPLACE FUNCTION "public"."process_refund_atomic"("p_quote_id" "uuid", "p_refund_amount" numeric, "p_refund_data" "jsonb", "p_gateway_response" "jsonb", "p_processed_by" "uuid") RETURNS TABLE("success" boolean, "refund_id" "uuid", "payment_transaction_updated" boolean, "quote_updated" boolean, "ledger_entry_id" "uuid", "error_message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_refund_id UUID;
  v_ledger_entry_id UUID;
  v_payment_transaction_updated BOOLEAN := FALSE;
  v_quote_updated BOOLEAN := FALSE;
  v_payment_transaction_id UUID;
  v_original_transaction RECORD;
  v_quote_data RECORD;
  v_total_refunded DECIMAL(10,2);
  v_new_amount_paid DECIMAL(10,2);
  v_new_payment_status TEXT;
  v_gateway_refund_id TEXT;
  v_gateway_transaction_id TEXT;
  v_refund_type TEXT;
  v_reason_code TEXT;
  v_reason_description TEXT;
  v_admin_notes TEXT;
  v_customer_note TEXT;
  v_gateway_status TEXT;
  v_currency TEXT;
  v_original_amount DECIMAL(10,2);
BEGIN
  -- Start transaction (implicit with function)
  BEGIN
    -- Extract refund data from JSONB
    v_gateway_refund_id := p_refund_data->>'gateway_refund_id';
    v_gateway_transaction_id := p_refund_data->>'gateway_transaction_id';
    v_refund_type := p_refund_data->>'refund_type';
    v_reason_code := p_refund_data->>'reason_code';
    v_reason_description := p_refund_data->>'reason_description';
    v_admin_notes := p_refund_data->>'admin_notes';
    v_customer_note := p_refund_data->>'customer_note';
    v_gateway_status := p_refund_data->>'gateway_status';
    v_currency := p_refund_data->>'currency';
    v_original_amount := (p_refund_data->>'original_amount')::DECIMAL(10,2);
    
    -- Validate required fields
    IF p_quote_id IS NULL OR p_refund_amount IS NULL OR p_refund_amount <= 0 THEN
      RETURN QUERY SELECT 
        FALSE,
        NULL::UUID,
        FALSE,
        FALSE,
        NULL::UUID,
        'Invalid refund amount or missing quote ID'::TEXT;
      RETURN;
    END IF;
    
    -- Get the original payment transaction
    SELECT * INTO v_original_transaction
    FROM payment_transactions
    WHERE quote_id = p_quote_id
      AND payment_method = 'payu'
      AND status = 'completed'
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_original_transaction IS NULL THEN
      RETURN QUERY SELECT 
        FALSE,
        NULL::UUID,
        FALSE,
        FALSE,
        NULL::UUID,
        'No completed payment transaction found for quote'::TEXT;
      RETURN;
    END IF;
    
    v_payment_transaction_id := v_original_transaction.id;
    
    -- Check if refund amount is valid
    v_total_refunded := COALESCE(v_original_transaction.total_refunded, 0) + p_refund_amount;
    IF v_total_refunded > v_original_transaction.amount THEN
      RETURN QUERY SELECT 
        FALSE,
        NULL::UUID,
        FALSE,
        FALSE,
        NULL::UUID,
        'Refund amount exceeds original transaction amount'::TEXT;
      RETURN;
    END IF;
    
    -- Insert into gateway_refunds table
    INSERT INTO gateway_refunds (
      gateway_refund_id,
      gateway_transaction_id,
      gateway_code,
      payment_transaction_id,
      quote_id,
      refund_amount,
      original_amount,
      currency,
      refund_type,
      reason_code,
      reason_description,
      admin_notes,
      customer_note,
      status,
      gateway_status,
      gateway_response,
      refund_date,
      processed_by,
      created_at,
      updated_at
    ) VALUES (
      v_gateway_refund_id,
      v_gateway_transaction_id,
      'payu',
      v_payment_transaction_id,
      p_quote_id,
      p_refund_amount,
      COALESCE(v_original_amount, v_original_transaction.amount),
      COALESCE(v_currency, v_original_transaction.currency),
      COALESCE(v_refund_type, 'partial'),
      COALESCE(v_reason_code, 'CUSTOMER_REQUEST'),
      v_reason_description,
      v_admin_notes,
      v_customer_note,
      'processing',
      COALESCE(v_gateway_status, 'PENDING'),
      p_gateway_response,
      NOW(),
      p_processed_by,
      NOW(),
      NOW()
    ) RETURNING id INTO v_refund_id;
    
    -- Create payment ledger entry for the refund
    INSERT INTO payment_ledger (
      quote_id,
      payment_transaction_id,
      payment_type,
      amount,
      currency,
      payment_method,
      gateway_code,
      gateway_transaction_id,
      reference_number,
      status,
      payment_date,
      base_amount,
      balance_before,
      balance_after,
      notes,
      created_by,
      gateway_response,
      created_at,
      updated_at
    ) VALUES (
      p_quote_id,
      v_payment_transaction_id,
      'refund',
      -p_refund_amount, -- Negative for refunds
      COALESCE(v_currency, v_original_transaction.currency),
      'payu',
      'payu',
      v_gateway_transaction_id,
      v_gateway_refund_id,
      'processing',
      NOW(),
      -p_refund_amount,
      COALESCE(v_original_transaction.total_refunded, 0),
      v_total_refunded,
      'PayU Refund: ' || COALESCE(v_reason_description, 'Customer request'),
      p_processed_by,
      jsonb_build_object(
        'refund_processing', true,
        'refund_amount', p_refund_amount,
        'gateway_refund_id', v_gateway_refund_id,
        'gateway_transaction_id', v_gateway_transaction_id,
        'processed_at', NOW()
      ) || COALESCE(p_gateway_response, '{}'::jsonb),
      NOW(),
      NOW()
    ) RETURNING id INTO v_ledger_entry_id;
    
    -- Update the original payment transaction
    UPDATE payment_transactions
    SET 
      total_refunded = v_total_refunded,
      refund_count = COALESCE(refund_count, 0) + 1,
      is_fully_refunded = (v_total_refunded >= amount),
      updated_at = NOW()
    WHERE id = v_payment_transaction_id;
    
    v_payment_transaction_updated := TRUE;
    
    -- Get current quote data and update amount_paid
    SELECT amount_paid, final_total INTO v_quote_data
    FROM quotes
    WHERE id = p_quote_id;
    
    IF v_quote_data IS NOT NULL THEN
      -- Calculate new amount paid after refund
      v_new_amount_paid := COALESCE(v_quote_data.amount_paid, 0) - p_refund_amount;
      
      -- Determine new payment status
      v_new_payment_status := CASE
        WHEN v_new_amount_paid <= 0 THEN 'unpaid'
        WHEN v_new_amount_paid < v_quote_data.final_total THEN 'partial'
        ELSE 'paid'
      END;
      
      -- Update quote with new payment status
      UPDATE quotes
      SET 
        amount_paid = v_new_amount_paid,
        payment_status = v_new_payment_status,
        updated_at = NOW()
      WHERE id = p_quote_id;
      
      v_quote_updated := TRUE;
    END IF;
    
    -- Return success
    RETURN QUERY SELECT 
      TRUE,
      v_refund_id,
      v_payment_transaction_updated,
      v_quote_updated,
      v_ledger_entry_id,
      NULL::TEXT;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback will happen automatically
      RETURN QUERY SELECT 
        FALSE,
        NULL::UUID,
        FALSE,
        FALSE,
        NULL::UUID,
        SQLERRM::TEXT;
  END;
END;
$$;


ALTER FUNCTION "public"."process_refund_atomic"("p_quote_id" "uuid", "p_refund_amount" numeric, "p_refund_data" "jsonb", "p_gateway_response" "jsonb", "p_processed_by" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."process_refund_atomic"("p_quote_id" "uuid", "p_refund_amount" numeric, "p_refund_data" "jsonb", "p_gateway_response" "jsonb", "p_processed_by" "uuid") IS 'Atomically processes refund operations including gateway_refunds insertion, payment_ledger entry, payment_transactions update, and quotes adjustment. Ensures all operations succeed or fail together with comprehensive audit trail and financial consistency.';



CREATE OR REPLACE FUNCTION "public"."process_refund_item"("p_refund_item_id" "uuid", "p_gateway_refund_id" "text", "p_gateway_response" "jsonb" DEFAULT NULL::"jsonb", "p_status" "text" DEFAULT 'completed'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."process_refund_item"("p_refund_item_id" "uuid", "p_gateway_refund_id" "text", "p_gateway_response" "jsonb", "p_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_payment_with_ledger_and_triggers"("p_quote_id" "uuid", "p_amount" numeric, "p_currency" "text", "p_payment_method" "text", "p_transaction_reference" "text", "p_notes" "text" DEFAULT NULL::"text", "p_recorded_by" "uuid" DEFAULT NULL::"uuid", "p_payment_date" "date" DEFAULT CURRENT_DATE) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_quote RECORD;
  v_ledger_entry_id UUID;
  v_payment_id UUID;
  v_result JSONB;
BEGIN
  -- Get quote details
  SELECT * INTO v_quote FROM quotes WHERE id = p_quote_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quote not found: %', p_quote_id;
  END IF;

  -- Create payment ledger entry (only using columns that exist)
  INSERT INTO payment_ledger (
    quote_id,
    payment_type,
    amount,
    currency,
    payment_method,
    reference_number,
    notes,
    created_by,
    payment_date,
    status,
    gateway_code
  ) VALUES (
    p_quote_id,
    'customer_payment',
    p_amount,
    p_currency,
    p_payment_method,
    p_transaction_reference,
    p_notes,
    p_recorded_by,
    p_payment_date,
    'completed',
    CASE 
      WHEN p_payment_method = 'payu' THEN 'payu'
      WHEN p_payment_method = 'stripe' THEN 'stripe'
      WHEN p_payment_method = 'esewa' THEN 'esewa'
      WHEN p_payment_method = 'bank_transfer' THEN 'bank_transfer'
      ELSE NULL
    END
  ) RETURNING id INTO v_ledger_entry_id;

  -- Create payment transaction record (store transaction_reference in gateway_response)
  INSERT INTO payment_transactions (
    quote_id,
    user_id,
    amount,
    currency,
    status,
    payment_method,
    gateway_response,
    created_at
  ) VALUES (
    p_quote_id,
    v_quote.user_id,
    p_amount,
    p_currency,
    'completed',
    p_payment_method,
    jsonb_build_object(
      'manual_payment', true,
      'recorded_by', p_recorded_by,
      'notes', p_notes,
      'payment_date', p_payment_date,
      'transaction_reference', p_transaction_reference
    ),
    NOW()
  ) RETURNING id INTO v_payment_id;

  -- Force recalculation of payment status and amount_paid
  UPDATE quotes 
  SET updated_at = NOW()
  WHERE id = p_quote_id;

  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'ledger_entry_id', v_ledger_entry_id,
    'payment_id', v_payment_id,
    'message', 'Payment recorded successfully'
  );

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;


ALTER FUNCTION "public"."record_payment_with_ledger_and_triggers"("p_quote_id" "uuid", "p_amount" numeric, "p_currency" "text", "p_payment_method" "text", "p_transaction_reference" "text", "p_notes" "text", "p_recorded_by" "uuid", "p_payment_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."record_payment_with_ledger_and_triggers"("p_quote_id" "uuid", "p_amount" numeric, "p_currency" "text", "p_payment_method" "text", "p_transaction_reference" "text", "p_notes" "text", "p_recorded_by" "uuid", "p_payment_date" "date") IS 'Records manual payment with full ledger integration and triggers payment status recalculation';



CREATE OR REPLACE FUNCTION "public"."record_paypal_payment_to_ledger"("p_quote_id" "uuid", "p_transaction_id" "uuid", "p_amount" numeric, "p_currency" "text", "p_order_id" "text", "p_capture_id" "text" DEFAULT NULL::"text", "p_payer_email" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_ledger_id UUID;
    v_user_id UUID;
BEGIN
    -- Get the user who owns the quote
    SELECT user_id INTO v_user_id FROM quotes WHERE id = p_quote_id;
    
    -- Check if entry already exists
    SELECT id INTO v_ledger_id
    FROM payment_ledger
    WHERE quote_id = p_quote_id
      AND payment_transaction_id = p_transaction_id
      AND gateway_code = 'paypal';
      
    IF v_ledger_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', true, 'message', 'Entry exists', 'ledger_id', v_ledger_id);
    END IF;
    
    -- Insert payment ledger entry
    INSERT INTO payment_ledger (
        quote_id,
        payment_transaction_id,
        payment_type,
        amount,
        currency,
        payment_method,
        gateway_code,
        gateway_transaction_id,
        reference_number,
        status,
        payment_date,
        notes,
        created_by
    ) VALUES (
        p_quote_id,
        p_transaction_id,
        'customer_payment',
        p_amount,
        p_currency,
        'paypal',
        'paypal',
        COALESCE(p_capture_id, p_order_id),
        p_order_id,
        'completed',
        NOW(),
        'PayPal payment - Order: ' || p_order_id || 
        CASE WHEN p_capture_id IS NOT NULL THEN ', Capture: ' || p_capture_id ELSE '' END ||
        CASE WHEN p_payer_email IS NOT NULL THEN ', Payer: ' || p_payer_email ELSE '' END,
        COALESCE(v_user_id, auth.uid())
    ) RETURNING id INTO v_ledger_id;
    
    RETURN jsonb_build_object('success', true, 'message', 'Entry created', 'ledger_id', v_ledger_id);
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."record_paypal_payment_to_ledger"("p_quote_id" "uuid", "p_transaction_id" "uuid", "p_amount" numeric, "p_currency" "text", "p_order_id" "text", "p_capture_id" "text", "p_payer_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reverse_financial_transaction"("p_transaction_id" "uuid", "p_user_id" "uuid", "p_reason" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."reverse_financial_transaction"("p_transaction_id" "uuid", "p_user_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."send_welcome_email"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    confirmation_url TEXT;
    user_name TEXT;
    environment TEXT;
BEGIN
    -- Get environment (local vs production)
    environment := COALESCE(current_setting('app.environment', true), 'local');
    
    -- Extract user name
    user_name := COALESCE(
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'full_name',
        'User'
    );
    
    -- Only send email if user needs confirmation
    IF NEW.email_confirmed_at IS NULL THEN
        -- For local development, we'll handle this via the frontend
        -- For production, Supabase handles it via SMTP
        
        -- Log that we would send an email
        RAISE NOTICE 'Would send welcome email to: % (name: %, env: %)', NEW.email, user_name, environment;
        
        -- If this is local environment and we want to send via Resend
        -- We would trigger our custom email function here
        -- But for now, we'll let the frontend handle it
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."send_welcome_email"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_quote_expiration"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- When status changes to 'sent', set sent_at and expires_at
  IF NEW.status = 'sent' AND (OLD.status IS NULL OR OLD.status != 'sent') THEN
    NEW.sent_at = NOW();
    NEW.expires_at = NOW() + INTERVAL '5 days';
  END IF;
  
  -- When status changes from 'sent' to something else, clear expiration
  IF OLD.status = 'sent' AND NEW.status != 'sent' THEN
    NEW.sent_at = NULL;
    NEW.expires_at = NULL;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_quote_expiration"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_share_token"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.is_anonymous AND NEW.share_token IS NULL THEN
    NEW.share_token := generate_share_token();
  END IF;
  
  -- Set expiration date for anonymous quotes (7 days from creation)
  IF NEW.is_anonymous AND NEW.expires_at IS NULL THEN
    NEW.expires_at := now() + interval '7 days';
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_share_token"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."start_reconciliation_session"("p_payment_method" "text", "p_gateway_code" "text" DEFAULT NULL::"text", "p_statement_date" "date" DEFAULT CURRENT_DATE, "p_statement_start_date" "date" DEFAULT NULL::"date", "p_statement_end_date" "date" DEFAULT NULL::"date") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."start_reconciliation_session"("p_payment_method" "text", "p_gateway_code" "text", "p_statement_date" "date", "p_statement_start_date" "date", "p_statement_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_payment_record_to_ledger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    quote_info RECORD;
    creator_id UUID;
BEGIN
    -- Only process INSERT operations for now
    IF TG_OP = 'INSERT' THEN
        -- Get quote details
        SELECT * INTO quote_info FROM quotes WHERE id = NEW.quote_id;
        
        -- Handle NULL recorded_by (use first available admin or the recorded_by value)
        creator_id := COALESCE(NEW.recorded_by, (SELECT id FROM auth.users LIMIT 1));
        
        -- Create simplified payment_ledger entry in original currency only
        INSERT INTO payment_ledger (
            quote_id,
            payment_date,
            payment_type,
            payment_method,
            gateway_code,
            amount,              -- Store in original currency
            currency,            -- Original currency
            reference_number,
            status,
            notes,
            created_by
        ) VALUES (
            NEW.quote_id,
            COALESCE(NEW.created_at, NOW()),
            CASE 
                WHEN NEW.amount < 0 THEN 'refund'
                ELSE 'customer_payment'
            END,
            COALESCE(NEW.payment_method, 'bank_transfer'),
            CASE 
                WHEN NEW.payment_method = 'bank_transfer' THEN 'bank_transfer'
                WHEN NEW.payment_method ILIKE '%payu%' THEN 'payu'
                WHEN NEW.payment_method ILIKE '%stripe%' THEN 'stripe'
                ELSE 'manual'
            END,
            NEW.amount,          -- Original amount, no conversion
            quote_info.final_currency,    -- Original currency
            NEW.reference_number,
            COALESCE(NEW.status, 'completed'),
            NEW.notes,
            creator_id
        );
        
        RAISE NOTICE 'Auto-synced payment_record % to simplified payment_ledger in %', 
            NEW.id, quote_info.final_currency;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_payment_record_to_ledger"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."sync_payment_record_to_ledger"() IS 'Simplified sync function without USD conversion columns';



CREATE OR REPLACE FUNCTION "public"."sync_quote_payment_amounts"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  target_quote_id UUID;
  calculated_amount_paid NUMERIC;
  calculated_payment_status TEXT;
BEGIN
  -- Get the quote_id from the affected row
  target_quote_id := COALESCE(NEW.quote_id, OLD.quote_id);
  
  -- Calculate total amount paid from payment_ledger
  SELECT COALESCE(SUM(
    CASE 
      WHEN payment_type IN ('customer_payment', 'credit_applied') THEN amount
      WHEN payment_type LIKE '%refund%' OR payment_type = 'adjustment' THEN -ABS(amount)
      ELSE 0
    END
  ), 0)
  INTO calculated_amount_paid
  FROM payment_ledger 
  WHERE quote_id = target_quote_id;
  
  -- Determine payment status based on amounts
  SELECT 
    CASE
      WHEN calculated_amount_paid = 0 THEN 'unpaid'
      WHEN calculated_amount_paid >= q.final_total THEN 
        CASE 
          WHEN calculated_amount_paid > q.final_total THEN 'overpaid'
          ELSE 'paid'
        END
      WHEN calculated_amount_paid > 0 AND calculated_amount_paid < q.final_total THEN 'partial'
      ELSE 'unpaid'
    END
  INTO calculated_payment_status
  FROM quotes q
  WHERE q.id = target_quote_id;
  
  -- Update the quotes table with calculated values
  UPDATE quotes 
  SET 
    amount_paid = calculated_amount_paid,
    payment_status = calculated_payment_status,
    updated_at = NOW()
  WHERE id = target_quote_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."sync_quote_payment_amounts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_payment_update_direct"("quote_id" "uuid", "new_amount_paid" numeric, "new_payment_status" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  rows_affected INTEGER;
BEGIN
  -- Direct update with no authentication checks
  UPDATE quotes
  SET 
    amount_paid = new_amount_paid,
    payment_status = new_payment_status,
    updated_at = NOW()
  WHERE id = quote_id;
  
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'rows_affected', rows_affected,
    'quote_id', quote_id,
    'amount_set', new_amount_paid,
    'status_set', new_payment_status
  );
END;
$$;


ALTER FUNCTION "public"."test_payment_update_direct"("quote_id" "uuid", "new_amount_paid" numeric, "new_payment_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_paypal_webhook_events_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_paypal_webhook_events_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_update_payment_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Update the related quote's payment status
  UPDATE quotes
  SET updated_at = now()
  WHERE id = COALESCE(NEW.quote_id, OLD.quote_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."trigger_update_payment_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_authenticated_checkout_sessions_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_authenticated_checkout_sessions_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_country_payment_preferences_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_country_payment_preferences_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_guest_checkout_sessions_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_guest_checkout_sessions_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_payment_links_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_payment_links_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_payment_refund_totals"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."update_payment_refund_totals"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_payment_status"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Calculate total paid from payment_ledger (not payment_records)
  NEW.amount_paid := COALESCE((
    SELECT SUM(
      CASE 
        WHEN payment_type IN ('customer_payment', 'credit_applied') THEN amount
        WHEN payment_type LIKE '%refund%' OR payment_type = 'adjustment' THEN -ABS(amount)
        ELSE 0
      END
    )
    FROM payment_ledger
    WHERE quote_id = NEW.id
  ), 0);

  -- Determine payment status
  IF NEW.amount_paid = 0 THEN
    NEW.payment_status := 'unpaid';
  ELSIF NEW.amount_paid < NEW.final_total THEN
    NEW.payment_status := 'partial';
  ELSIF NEW.amount_paid = NEW.final_total THEN
    NEW.payment_status := 'paid';
  ELSE
    NEW.payment_status := 'overpaid';
    NEW.overpayment_amount := NEW.amount_paid - NEW.final_total;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_payment_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_paypal_refunds_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_paypal_refunds_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_quote_documents_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_quote_documents_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_route_customs_tiers_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_route_customs_tiers_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_delivery_options"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Check if delivery_options is a valid JSON array
  IF NEW.delivery_options IS NOT NULL AND jsonb_typeof(NEW.delivery_options) != 'array' THEN
    RAISE EXCEPTION 'delivery_options must be a JSON array';
  END IF;
  
  -- Validate each delivery option structure
  IF NEW.delivery_options IS NOT NULL THEN
    FOR i IN 0..jsonb_array_length(NEW.delivery_options) - 1 LOOP
      DECLARE
        option jsonb := NEW.delivery_options->i;
      BEGIN
        -- Check required fields
        IF NOT (option ? 'id' AND option ? 'name' AND option ? 'carrier' AND 
                option ? 'min_days' AND option ? 'max_days' AND option ? 'price' AND option ? 'active') THEN
          RAISE EXCEPTION 'Delivery option at index % is missing required fields (id, name, carrier, min_days, max_days, price, active)', i;
        END IF;
        
        -- Validate data types
        IF jsonb_typeof(option->'id') != 'string' OR 
           jsonb_typeof(option->'name') != 'string' OR 
           jsonb_typeof(option->'carrier') != 'string' OR
           jsonb_typeof(option->'min_days') != 'number' OR
           jsonb_typeof(option->'max_days') != 'number' OR
           jsonb_typeof(option->'price') != 'number' OR
           jsonb_typeof(option->'active') != 'boolean' THEN
          RAISE EXCEPTION 'Delivery option at index % has invalid data types', i;
        END IF;
        
        -- Validate business logic
        IF (option->>'min_days')::int < 1 OR (option->>'max_days')::int < 1 THEN
          RAISE EXCEPTION 'Delivery option at index % has invalid days (must be >= 1)', i;
        END IF;
        
        IF (option->>'min_days')::int > (option->>'max_days')::int THEN
          RAISE EXCEPTION 'Delivery option at index % has min_days > max_days', i;
        END IF;
        
        IF (option->>'price')::numeric < 0 THEN
          RAISE EXCEPTION 'Delivery option at index % has negative price', i;
        END IF;
      END;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_delivery_options"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."authenticated_checkout_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_token" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "quote_ids" "text"[] NOT NULL,
    "temporary_shipping_address" "jsonb",
    "payment_currency" "text" NOT NULL,
    "payment_method" "text" NOT NULL,
    "payment_amount" numeric(10,2) NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "authenticated_checkout_sessions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'completed'::"text", 'expired'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."authenticated_checkout_sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."authenticated_checkout_sessions" IS 'Temporary storage for authenticated user checkout data to prevent quote contamination before payment confirmation';



CREATE TABLE IF NOT EXISTS "public"."bank_statement_imports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reconciliation_id" "uuid",
    "file_name" "text" NOT NULL,
    "file_url" "text",
    "file_format" "text",
    "total_rows" integer,
    "processed_rows" integer DEFAULT 0,
    "successful_rows" integer DEFAULT 0,
    "failed_rows" integer DEFAULT 0,
    "status" "text" DEFAULT 'pending'::"text",
    "error_log" "jsonb" DEFAULT '[]'::"jsonb",
    "imported_by" "uuid" NOT NULL,
    "imported_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "bank_statement_imports_file_format_check" CHECK (("file_format" = ANY (ARRAY['csv'::"text", 'excel'::"text", 'pdf'::"text", 'mt940'::"text", 'ofx'::"text", 'qif'::"text", 'manual'::"text"]))),
    CONSTRAINT "bank_statement_imports_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text", 'partial'::"text"])))
);


ALTER TABLE "public"."bank_statement_imports" OWNER TO "postgres";


COMMENT ON TABLE "public"."bank_statement_imports" IS 'Log of bank statement file imports';



CREATE TABLE IF NOT EXISTS "public"."chart_of_accounts" (
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "account_type" "text" NOT NULL,
    "parent_code" "text",
    "is_active" boolean DEFAULT true,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chart_of_accounts_account_type_check" CHECK (("account_type" = ANY (ARRAY['asset'::"text", 'liability'::"text", 'equity'::"text", 'revenue'::"text", 'expense'::"text"])))
);


ALTER TABLE "public"."chart_of_accounts" OWNER TO "postgres";


COMMENT ON TABLE "public"."chart_of_accounts" IS 'Chart of accounts for double-entry bookkeeping system';



CREATE TABLE IF NOT EXISTS "public"."country_payment_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "country_code" "text" NOT NULL,
    "gateway_code" "text" NOT NULL,
    "priority" integer NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."country_payment_preferences" OWNER TO "postgres";


COMMENT ON TABLE "public"."country_payment_preferences" IS 'Country-specific payment gateway preferences and priorities';



CREATE TABLE IF NOT EXISTS "public"."country_settings" (
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "currency" "text" NOT NULL,
    "rate_from_usd" numeric(15,6) NOT NULL,
    "sales_tax" numeric(5,2) DEFAULT 0,
    "vat" numeric(5,2) DEFAULT 0,
    "min_shipping" numeric(10,2) DEFAULT 0,
    "additional_shipping" numeric(10,2) DEFAULT 0,
    "additional_weight" numeric(8,2) DEFAULT 0,
    "weight_unit" "text" DEFAULT 'kg'::"text",
    "volumetric_divisor" integer DEFAULT 5000,
    "payment_gateway_fixed_fee" numeric(10,2) DEFAULT 0,
    "payment_gateway_percent_fee" numeric(5,2) DEFAULT 0,
    "purchase_allowed" boolean DEFAULT true,
    "shipping_allowed" boolean DEFAULT true,
    "payment_gateway" "text" DEFAULT 'stripe'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "minimum_payment_amount" numeric(10,2) DEFAULT 10,
    "decimal_places" integer DEFAULT 2,
    "thousand_separator" "text" DEFAULT ','::"text",
    "decimal_separator" "text" DEFAULT '.'::"text",
    "symbol_position" "text" DEFAULT 'before'::"text",
    "symbol_space" boolean DEFAULT false,
    "priority_thresholds" "jsonb" DEFAULT '{"low": 0, "normal": 500, "urgent": 2000}'::"jsonb",
    "available_gateways" "text"[] DEFAULT ARRAY['bank_transfer'::"text"],
    "default_gateway" "text" DEFAULT 'bank_transfer'::"text",
    "gateway_config" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "country_settings_additional_shipping_check" CHECK (("additional_shipping" >= (0)::numeric)),
    CONSTRAINT "country_settings_additional_weight_check" CHECK (("additional_weight" >= (0)::numeric)),
    CONSTRAINT "country_settings_code_check" CHECK (("code" ~ '^[A-Z]{2}$'::"text")),
    CONSTRAINT "country_settings_decimal_places_check" CHECK ((("decimal_places" >= 0) AND ("decimal_places" <= 8))),
    CONSTRAINT "country_settings_decimal_separator_check" CHECK (("length"("decimal_separator") <= 3)),
    CONSTRAINT "country_settings_min_shipping_check" CHECK (("min_shipping" >= (0)::numeric)),
    CONSTRAINT "country_settings_minimum_payment_amount_check" CHECK (("minimum_payment_amount" >= (0)::numeric)),
    CONSTRAINT "country_settings_payment_gateway_fixed_fee_check" CHECK (("payment_gateway_fixed_fee" >= (0)::numeric)),
    CONSTRAINT "country_settings_payment_gateway_percent_fee_check" CHECK (("payment_gateway_percent_fee" >= (0)::numeric)),
    CONSTRAINT "country_settings_rate_from_usd_check" CHECK (("rate_from_usd" > (0)::numeric)),
    CONSTRAINT "country_settings_sales_tax_check" CHECK (("sales_tax" >= (0)::numeric)),
    CONSTRAINT "country_settings_symbol_position_check" CHECK (("symbol_position" = ANY (ARRAY['before'::"text", 'after'::"text"]))),
    CONSTRAINT "country_settings_thousand_separator_check" CHECK (("length"("thousand_separator") <= 3)),
    CONSTRAINT "country_settings_vat_check" CHECK (("vat" >= (0)::numeric)),
    CONSTRAINT "country_settings_volumetric_divisor_check" CHECK (("volumetric_divisor" > 0)),
    CONSTRAINT "country_settings_weight_unit_check" CHECK (("weight_unit" = ANY (ARRAY['kg'::"text", 'lbs'::"text"])))
);


ALTER TABLE "public"."country_settings" OWNER TO "postgres";


COMMENT ON COLUMN "public"."country_settings"."minimum_payment_amount" IS 'Minimum amount required for payments in this currency';



COMMENT ON COLUMN "public"."country_settings"."decimal_places" IS 'Number of decimal places to display for this currency';



COMMENT ON COLUMN "public"."country_settings"."thousand_separator" IS 'Character used to separate thousands (e.g., comma in 1,000)';



COMMENT ON COLUMN "public"."country_settings"."decimal_separator" IS 'Character used for decimal point (e.g., period in 1.50)';



COMMENT ON COLUMN "public"."country_settings"."symbol_position" IS 'Whether currency symbol appears before or after the amount';



COMMENT ON COLUMN "public"."country_settings"."symbol_space" IS 'Whether to include space between currency symbol and amount';



COMMENT ON COLUMN "public"."country_settings"."priority_thresholds" IS 'JSON object mapping priority levels (low, normal, urgent) to amount thresholds in the country''s main currency.';



CREATE TABLE IF NOT EXISTS "public"."credit_note_applications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "credit_note_id" "uuid" NOT NULL,
    "quote_id" "uuid" NOT NULL,
    "applied_amount" numeric(15,4) NOT NULL,
    "currency" "text" NOT NULL,
    "exchange_rate" numeric(15,6) DEFAULT 1,
    "base_amount" numeric(15,4) NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "payment_ledger_id" "uuid",
    "financial_transaction_id" "uuid",
    "reversed_by" "uuid",
    "reversal_reason" "text",
    "reversed_at" timestamp with time zone,
    "applied_by" "uuid" NOT NULL,
    "applied_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "credit_note_applications_applied_amount_check" CHECK (("applied_amount" > (0)::numeric)),
    CONSTRAINT "credit_note_applications_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'applied'::"text", 'reversed'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."credit_note_applications" OWNER TO "postgres";


COMMENT ON TABLE "public"."credit_note_applications" IS 'Track usage of credit notes on specific orders';



CREATE TABLE IF NOT EXISTS "public"."credit_note_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "credit_note_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "previous_status" "text",
    "new_status" "text",
    "amount_change" numeric(15,4),
    "description" "text",
    "performed_by" "uuid" NOT NULL,
    "performed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "credit_note_history_action_check" CHECK (("action" = ANY (ARRAY['created'::"text", 'approved'::"text", 'applied'::"text", 'partially_applied'::"text", 'reversed'::"text", 'extended'::"text", 'cancelled'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."credit_note_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."credit_note_history" IS 'Audit trail for all credit note actions';



CREATE SEQUENCE IF NOT EXISTS "public"."credit_note_number_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."credit_note_number_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."credit_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "note_number" "text" NOT NULL,
    "note_type" "text" NOT NULL,
    "quote_id" "uuid",
    "refund_request_id" "uuid",
    "customer_id" "uuid" NOT NULL,
    "amount" numeric(15,4) NOT NULL,
    "currency" "text" NOT NULL,
    "exchange_rate" numeric(15,6) DEFAULT 1,
    "base_amount" numeric(15,4) NOT NULL,
    "amount_used" numeric(15,4) DEFAULT 0,
    "amount_available" numeric(15,4) GENERATED ALWAYS AS (("amount" - "amount_used")) STORED,
    "reason" "text" NOT NULL,
    "description" "text",
    "valid_from" "date" DEFAULT CURRENT_DATE,
    "valid_until" "date",
    "minimum_order_value" numeric(15,4),
    "allowed_categories" "text"[],
    "allowed_countries" "text"[],
    "status" "text" DEFAULT 'active'::"text",
    "issued_by" "uuid" NOT NULL,
    "issued_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "cancelled_by" "uuid",
    "cancelled_at" timestamp with time zone,
    "cancellation_reason" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "internal_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "credit_notes_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "credit_notes_amount_used_check" CHECK (("amount_used" >= (0)::numeric)),
    CONSTRAINT "credit_notes_note_type_check" CHECK (("note_type" = ANY (ARRAY['credit'::"text", 'debit'::"text"]))),
    CONSTRAINT "credit_notes_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'active'::"text", 'partially_used'::"text", 'fully_used'::"text", 'expired'::"text", 'cancelled'::"text", 'on_hold'::"text"])))
);


ALTER TABLE "public"."credit_notes" OWNER TO "postgres";


COMMENT ON TABLE "public"."credit_notes" IS 'Store credits and adjustments that can be applied to future orders';



CREATE TABLE IF NOT EXISTS "public"."customs_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "duty_percent" numeric(5,2) DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."customs_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customs_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "priority" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "conditions" "jsonb" NOT NULL,
    "actions" "jsonb" NOT NULL,
    "advanced" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "origin_country" character varying(2),
    "destination_country" character varying(2)
);


ALTER TABLE "public"."customs_rules" OWNER TO "postgres";


COMMENT ON COLUMN "public"."customs_rules"."origin_country" IS 'Origin country for route-specific customs rules (e.g., IN for India→US route)';



COMMENT ON COLUMN "public"."customs_rules"."destination_country" IS 'Destination country for route-specific customs rules (e.g., US for India→US route)';



CREATE TABLE IF NOT EXISTS "public"."email_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recipient_email" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "html_content" "text" NOT NULL,
    "text_content" "text",
    "template_id" "text",
    "related_entity_type" "text",
    "related_entity_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text",
    "attempts" integer DEFAULT 0,
    "max_attempts" integer DEFAULT 3,
    "scheduled_for" timestamp with time zone DEFAULT "now"(),
    "last_attempt_at" timestamp with time zone,
    "sent_at" timestamp with time zone,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."email_queue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "setting_key" "text" NOT NULL,
    "setting_value" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."email_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "html_content" "text" NOT NULL,
    "template_type" "text" NOT NULL,
    "variables" "jsonb" DEFAULT '{}'::"jsonb",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."email_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."financial_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "transaction_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "transaction_type" "text" NOT NULL,
    "reference_type" "text" NOT NULL,
    "reference_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "debit_account" "text" NOT NULL,
    "credit_account" "text" NOT NULL,
    "amount" numeric(15,4) NOT NULL,
    "currency" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "posted_at" timestamp with time zone,
    "reversed_by" "uuid",
    "reversal_reason" "text",
    "created_by" "uuid" NOT NULL,
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "notes" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "financial_transactions_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "financial_transactions_reference_type_check" CHECK (("reference_type" = ANY (ARRAY['quote'::"text", 'payment_transaction'::"text", 'refund'::"text", 'adjustment'::"text", 'fee'::"text"]))),
    CONSTRAINT "financial_transactions_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'posted'::"text", 'void'::"text", 'reversed'::"text"]))),
    CONSTRAINT "financial_transactions_transaction_type_check" CHECK (("transaction_type" = ANY (ARRAY['payment'::"text", 'refund'::"text", 'adjustment'::"text", 'credit_note'::"text", 'debit_note'::"text", 'chargeback'::"text", 'fee'::"text", 'discount'::"text", 'write_off'::"text", 'exchange_adjustment'::"text"])))
);


ALTER TABLE "public"."financial_transactions" OWNER TO "postgres";


COMMENT ON TABLE "public"."financial_transactions" IS 'Double-entry bookkeeping ledger for all financial transactions';



CREATE TABLE IF NOT EXISTS "public"."gateway_refunds" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "gateway_refund_id" "text" NOT NULL,
    "gateway_transaction_id" "text",
    "gateway_code" "text" NOT NULL,
    "payment_transaction_id" "uuid",
    "quote_id" "uuid",
    "refund_amount" numeric(15,4) NOT NULL,
    "original_amount" numeric(15,4),
    "currency" "text" NOT NULL,
    "refund_type" "text",
    "reason_code" "text",
    "reason_description" "text",
    "admin_notes" "text",
    "customer_note" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "gateway_status" "text",
    "gateway_response" "jsonb",
    "refund_date" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "failed_at" timestamp with time zone,
    "processed_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "gateway_refunds_refund_type_check" CHECK (("refund_type" = ANY (ARRAY['FULL'::"text", 'PARTIAL'::"text"]))),
    CONSTRAINT "gateway_refunds_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."gateway_refunds" OWNER TO "postgres";


COMMENT ON TABLE "public"."gateway_refunds" IS 'Tracks refunds across all payment gateways (PayU, Stripe, PayPal, etc.)';



CREATE TABLE IF NOT EXISTS "public"."guest_checkout_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_token" "text" NOT NULL,
    "quote_id" "uuid" NOT NULL,
    "guest_name" "text" NOT NULL,
    "guest_email" "text" NOT NULL,
    "guest_phone" "text",
    "shipping_address" "jsonb" NOT NULL,
    "payment_currency" "text" NOT NULL,
    "payment_method" "text" NOT NULL,
    "payment_amount" numeric(10,2) NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "guest_checkout_sessions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'completed'::"text", 'expired'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."guest_checkout_sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."guest_checkout_sessions" IS 'Temporary storage for guest checkout data to prevent quote contamination before payment confirmation';



CREATE TABLE IF NOT EXISTS "public"."manual_analysis_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quote_id" "uuid",
    "assigned_to" "uuid",
    "status" "text" DEFAULT 'pending'::"text",
    "priority" "text" DEFAULT 'medium'::"text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."manual_analysis_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "recipient_id" "uuid",
    "subject" "text" NOT NULL,
    "content" "text" NOT NULL,
    "message_type" "text" DEFAULT 'general'::"text",
    "quote_id" "uuid",
    "reply_to_message_id" "uuid",
    "attachment_file_name" "text",
    "attachment_url" "text",
    "sender_email" "text",
    "sender_name" "text",
    "is_read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "verification_status" "text" DEFAULT 'pending'::"text",
    "admin_notes" "text",
    "verified_by" "uuid",
    "verified_at" timestamp with time zone,
    CONSTRAINT "messages_verification_status_check" CHECK (("verification_status" = ANY (ARRAY['pending'::"text", 'verified'::"text", 'confirmed'::"text", 'rejected'::"text"]))),
    CONSTRAINT "valid_recipients" CHECK (("sender_id" <> "recipient_id"))
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


COMMENT ON TABLE "public"."messages" IS 'Messages table - verified_amount column removed in favor of directly updating quotes.amount_paid for simpler payment tracking';



COMMENT ON COLUMN "public"."messages"."recipient_id" IS 'User ID of the recipient. NULL for broadcast/general messages from admin.';



COMMENT ON COLUMN "public"."messages"."message_type" IS 'Type of message: general, payment_proof, support, etc.';



CREATE TABLE IF NOT EXISTS "public"."oauth_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "gateway_code" "text" NOT NULL,
    "client_id" "text" NOT NULL,
    "access_token" "text" NOT NULL,
    "token_type" "text" DEFAULT 'Bearer'::"text",
    "expires_in" integer NOT NULL,
    "scope" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."oauth_tokens" OWNER TO "postgres";


COMMENT ON TABLE "public"."oauth_tokens" IS 'OAuth access tokens for payment gateway APIs';



CREATE TABLE IF NOT EXISTS "public"."payment_adjustments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quote_id" "uuid" NOT NULL,
    "adjustment_type" "text" NOT NULL,
    "adjustment_reason" "text" NOT NULL,
    "original_amount" numeric(15,4) NOT NULL,
    "adjusted_amount" numeric(15,4) NOT NULL,
    "adjustment_value" numeric(15,4) NOT NULL,
    "currency" "text" NOT NULL,
    "financial_transaction_id" "uuid",
    "payment_ledger_id" "uuid",
    "requested_by" "uuid" NOT NULL,
    "requested_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "status" "text" DEFAULT 'pending'::"text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "payment_adjustments_adjustment_type_check" CHECK (("adjustment_type" = ANY (ARRAY['price_change'::"text", 'discount'::"text", 'surcharge'::"text", 'tax_adjustment'::"text", 'currency_adjustment'::"text", 'rounding'::"text", 'write_off'::"text", 'correction'::"text"]))),
    CONSTRAINT "payment_adjustments_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'applied'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."payment_adjustments" OWNER TO "postgres";


COMMENT ON TABLE "public"."payment_adjustments" IS 'Track all payment adjustments and corrections';



CREATE TABLE IF NOT EXISTS "public"."payment_alert_thresholds" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "metric_name" character varying(100) NOT NULL,
    "warning_threshold" numeric(10,2) NOT NULL,
    "critical_threshold" numeric(10,2) NOT NULL,
    "comparison_operator" character varying(10) DEFAULT 'gt'::character varying NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."payment_alert_thresholds" OWNER TO "postgres";


COMMENT ON TABLE "public"."payment_alert_thresholds" IS 'Configurable thresholds for payment system alerts';



COMMENT ON COLUMN "public"."payment_alert_thresholds"."metric_name" IS 'Name of the metric to monitor';



COMMENT ON COLUMN "public"."payment_alert_thresholds"."warning_threshold" IS 'Value that triggers a warning alert';



COMMENT ON COLUMN "public"."payment_alert_thresholds"."critical_threshold" IS 'Value that triggers a critical alert';



COMMENT ON COLUMN "public"."payment_alert_thresholds"."comparison_operator" IS 'Comparison operator (gt, lt, eq, gte, lte)';



CREATE TABLE IF NOT EXISTS "public"."payment_error_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "error_code" character varying(100) NOT NULL,
    "error_message" "text" NOT NULL,
    "user_message" "text" NOT NULL,
    "severity" character varying(20) DEFAULT 'medium'::character varying NOT NULL,
    "gateway" character varying(50) NOT NULL,
    "transaction_id" character varying(255),
    "amount" numeric(15,2),
    "currency" character varying(10),
    "user_action" character varying(100),
    "should_retry" boolean DEFAULT false NOT NULL,
    "retry_delay" integer,
    "recovery_options" "jsonb",
    "context" "jsonb",
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "check_severity" CHECK ((("severity")::"text" = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'critical'::character varying])::"text"[])))
);


ALTER TABLE "public"."payment_error_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."payment_error_logs" IS 'Logs for payment errors for analysis and debugging';



COMMENT ON COLUMN "public"."payment_error_logs"."error_code" IS 'Standardized error code for categorization';



COMMENT ON COLUMN "public"."payment_error_logs"."error_message" IS 'Technical error message';



COMMENT ON COLUMN "public"."payment_error_logs"."user_message" IS 'User-friendly error message';



COMMENT ON COLUMN "public"."payment_error_logs"."severity" IS 'Error severity level (low, medium, high, critical)';



COMMENT ON COLUMN "public"."payment_error_logs"."gateway" IS 'Payment gateway where error occurred';



COMMENT ON COLUMN "public"."payment_error_logs"."transaction_id" IS 'Transaction ID if available';



COMMENT ON COLUMN "public"."payment_error_logs"."amount" IS 'Payment amount';



COMMENT ON COLUMN "public"."payment_error_logs"."currency" IS 'Payment currency';



COMMENT ON COLUMN "public"."payment_error_logs"."user_action" IS 'User action that triggered the error';



COMMENT ON COLUMN "public"."payment_error_logs"."should_retry" IS 'Whether the error is retryable';



COMMENT ON COLUMN "public"."payment_error_logs"."retry_delay" IS 'Recommended retry delay in milliseconds';



COMMENT ON COLUMN "public"."payment_error_logs"."recovery_options" IS 'JSON array of recovery actions';



COMMENT ON COLUMN "public"."payment_error_logs"."context" IS 'Additional context information';



CREATE OR REPLACE VIEW "public"."payment_error_analytics" AS
 SELECT "date_trunc"('day'::"text", "created_at") AS "error_date",
    "gateway",
    "error_code",
    "severity",
    "count"(*) AS "error_count",
    "count"(DISTINCT "user_id") AS "affected_users",
    "count"(DISTINCT "transaction_id") AS "failed_transactions",
    "avg"("amount") AS "avg_failed_amount",
    "array_agg"(DISTINCT "currency") AS "currencies"
   FROM "public"."payment_error_logs"
  WHERE ("created_at" >= ("now"() - '30 days'::interval))
  GROUP BY ("date_trunc"('day'::"text", "created_at")), "gateway", "error_code", "severity"
  ORDER BY ("date_trunc"('day'::"text", "created_at")) DESC, ("count"(*)) DESC;


ALTER VIEW "public"."payment_error_analytics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_gateways" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "code" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "supported_countries" "text"[] DEFAULT '{}'::"text"[],
    "supported_currencies" "text"[] DEFAULT '{}'::"text"[],
    "fee_percent" numeric(5,2) DEFAULT 0,
    "fee_fixed" numeric(10,2) DEFAULT 0,
    "config" "jsonb" DEFAULT '{}'::"jsonb",
    "test_mode" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "priority" integer DEFAULT 999,
    "description" "text",
    CONSTRAINT "payment_gateways_fee_fixed_check" CHECK (("fee_fixed" >= (0)::numeric)),
    CONSTRAINT "payment_gateways_fee_percent_check" CHECK (("fee_percent" >= (0)::numeric))
);


ALTER TABLE "public"."payment_gateways" OWNER TO "postgres";


COMMENT ON TABLE "public"."payment_gateways" IS 'Payment gateway configurations - Stripe removed for fresh integration';



COMMENT ON COLUMN "public"."payment_gateways"."priority" IS 'Priority order for gateway selection (lower numbers = higher priority)';



COMMENT ON COLUMN "public"."payment_gateways"."description" IS 'Description of the payment gateway for display purposes';



CREATE TABLE IF NOT EXISTS "public"."payment_health_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "overall_health" character varying(20) DEFAULT 'healthy'::character varying NOT NULL,
    "success_rate" numeric(5,2) DEFAULT 0 NOT NULL,
    "error_rate" numeric(5,2) DEFAULT 0 NOT NULL,
    "avg_processing_time" integer DEFAULT 0 NOT NULL,
    "alert_count" integer DEFAULT 0 NOT NULL,
    "metrics" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "check_error_rate" CHECK ((("error_rate" >= (0)::numeric) AND ("error_rate" <= (100)::numeric))),
    CONSTRAINT "check_overall_health" CHECK ((("overall_health")::"text" = ANY ((ARRAY['healthy'::character varying, 'warning'::character varying, 'critical'::character varying])::"text"[]))),
    CONSTRAINT "check_success_rate" CHECK ((("success_rate" >= (0)::numeric) AND ("success_rate" <= (100)::numeric)))
);


ALTER TABLE "public"."payment_health_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."payment_health_logs" IS 'Logs for payment system health monitoring and alerting';



COMMENT ON COLUMN "public"."payment_health_logs"."overall_health" IS 'Overall health status (healthy, warning, critical)';



COMMENT ON COLUMN "public"."payment_health_logs"."success_rate" IS 'Payment success rate percentage';



COMMENT ON COLUMN "public"."payment_health_logs"."error_rate" IS 'Payment error rate percentage';



COMMENT ON COLUMN "public"."payment_health_logs"."avg_processing_time" IS 'Average processing time in milliseconds';



COMMENT ON COLUMN "public"."payment_health_logs"."alert_count" IS 'Number of alerts generated';



COMMENT ON COLUMN "public"."payment_health_logs"."metrics" IS 'Complete health metrics JSON';



CREATE OR REPLACE VIEW "public"."payment_health_dashboard" AS
 SELECT "date_trunc"('hour'::"text", "created_at") AS "check_time",
    "overall_health",
    "avg"("success_rate") AS "avg_success_rate",
    "avg"("error_rate") AS "avg_error_rate",
    "avg"("avg_processing_time") AS "avg_processing_time",
    "sum"("alert_count") AS "total_alerts",
    "count"(*) AS "check_count"
   FROM "public"."payment_health_logs"
  WHERE ("created_at" >= ("now"() - '7 days'::interval))
  GROUP BY ("date_trunc"('hour'::"text", "created_at")), "overall_health"
  ORDER BY ("date_trunc"('hour'::"text", "created_at")) DESC;


ALTER VIEW "public"."payment_health_dashboard" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_ledger" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quote_id" "uuid" NOT NULL,
    "payment_transaction_id" "uuid",
    "payment_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "payment_type" "text" NOT NULL,
    "payment_method" "text" NOT NULL,
    "gateway_code" "text",
    "gateway_transaction_id" "text",
    "amount" numeric(15,4) NOT NULL,
    "currency" "text" NOT NULL,
    "reference_number" "text",
    "bank_reference" "text",
    "customer_reference" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "verified_by" "uuid",
    "verified_at" timestamp with time zone,
    "financial_transaction_id" "uuid",
    "parent_payment_id" "uuid",
    "payment_proof_message_id" "uuid",
    "gateway_response" "jsonb",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "notes" "text",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "payment_ledger_payment_type_check" CHECK (("payment_type" = ANY (ARRAY['customer_payment'::"text", 'refund'::"text", 'partial_refund'::"text", 'credit_applied'::"text", 'overpayment'::"text", 'underpayment_adjustment'::"text", 'write_off'::"text", 'chargeback'::"text"]))),
    CONSTRAINT "payment_ledger_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text", 'reversed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."payment_ledger" OWNER TO "postgres";


COMMENT ON TABLE "public"."payment_ledger" IS 'Central payment tracking table. All payment amounts sync to quotes.amount_paid via triggers.';



CREATE TABLE IF NOT EXISTS "public"."payment_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "link_code" "text" DEFAULT "public"."generate_payment_link_code"() NOT NULL,
    "title" "text" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "current_uses" integer DEFAULT 0,
    "max_uses" integer DEFAULT 1,
    "is_public" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone,
    "created_by" "uuid",
    "user_id" "uuid",
    "quote_id" "uuid",
    "gateway_response" "jsonb",
    "gateway" "text" DEFAULT 'paypal'::"text",
    "gateway_link_id" "text",
    "payment_url" "text",
    "gateway_request" "jsonb",
    "original_amount" numeric(10,2),
    "original_currency" "text",
    "customer_email" "text",
    "customer_name" "text",
    "customer_phone" "text",
    "api_version" "text" DEFAULT 'v1_legacy'::"text",
    CONSTRAINT "payment_links_gateway_check" CHECK (("gateway" = ANY (ARRAY['paypal'::"text", 'payu'::"text", 'stripe'::"text", 'esewa'::"text", 'khalti'::"text", 'fonepay'::"text", 'airwallex'::"text"]))),
    CONSTRAINT "payment_links_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'expired'::"text", 'completed'::"text", 'used'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."payment_links" OWNER TO "postgres";


COMMENT ON TABLE "public"."payment_links" IS 'Multi-gateway payment links for quotes and custom payments';



COMMENT ON COLUMN "public"."payment_links"."gateway_response" IS 'Response data received from the payment gateway';



COMMENT ON COLUMN "public"."payment_links"."gateway" IS 'Payment gateway identifier (paypal, payu, stripe, etc.)';



COMMENT ON COLUMN "public"."payment_links"."gateway_link_id" IS 'Gateway-specific payment link ID';



COMMENT ON COLUMN "public"."payment_links"."payment_url" IS 'The actual payment URL to redirect users to';



COMMENT ON COLUMN "public"."payment_links"."gateway_request" IS 'Request data sent to the payment gateway';



COMMENT ON COLUMN "public"."payment_links"."original_amount" IS 'Original amount in the source currency before conversion';



COMMENT ON COLUMN "public"."payment_links"."original_currency" IS 'Original currency code before conversion';



COMMENT ON COLUMN "public"."payment_links"."api_version" IS 'PayU API version used: v1_legacy (create_invoice) or v2_rest (payment-links)';



CREATE OR REPLACE VIEW "public"."payment_links_summary" AS
 SELECT "id",
    "gateway",
    "link_code",
    "title",
    "amount",
    "currency",
    "status",
    "current_uses",
    "max_uses",
    "created_at",
    "expires_at",
        CASE
            WHEN (("expires_at" IS NOT NULL) AND ("expires_at" < "now"())) THEN 'expired'::"text"
            WHEN ("current_uses" >= "max_uses") THEN 'exhausted'::"text"
            ELSE "status"
        END AS "effective_status",
    "created_by",
    "user_id",
    "quote_id"
   FROM "public"."payment_links";


ALTER VIEW "public"."payment_links_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quotes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "display_id" "text",
    "user_id" "uuid",
    "email" "text",
    "status" "text",
    "approval_status" "public"."quote_approval_status" DEFAULT 'pending'::"public"."quote_approval_status",
    "priority" "public"."quote_priority" DEFAULT 'normal'::"public"."quote_priority",
    "destination_country" "text",
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "items_currency" "text",
    "product_name" "text",
    "product_url" "text",
    "image_url" "text",
    "options" "text",
    "quantity" integer DEFAULT 1,
    "item_price" numeric(10,2),
    "item_weight" numeric(8,2),
    "sub_total" numeric(10,2) DEFAULT 0,
    "domestic_shipping" numeric(10,2) DEFAULT 0,
    "international_shipping" numeric(10,2) DEFAULT 0,
    "merchant_shipping_price" numeric(10,2) DEFAULT 0,
    "sales_tax_price" numeric(10,2) DEFAULT 0,
    "vat" numeric(10,2) DEFAULT 0,
    "customs_and_ecs" numeric(10,2) DEFAULT 0,
    "handling_charge" numeric(10,2) DEFAULT 0,
    "insurance_amount" numeric(10,2) DEFAULT 0,
    "payment_gateway_fee" numeric(10,2) DEFAULT 0,
    "discount" numeric(10,2) DEFAULT 0,
    "final_total" numeric(10,2) DEFAULT 0,
    "final_total_local" numeric(10,2) DEFAULT 0,
    "final_currency" "text" DEFAULT 'USD'::"text",
    "exchange_rate" numeric(10,6) DEFAULT 1,
    "in_cart" boolean DEFAULT false,
    "payment_method" "text",
    "shipping_carrier" "text",
    "tracking_number" "text",
    "current_location" "text",
    "estimated_delivery_date" "date",
    "customs_category_name" "text",
    "rejection_reason_id" "uuid",
    "rejection_details" "text",
    "internal_notes" "text",
    "order_display_id" "text",
    "shipping_address" "jsonb",
    "address_locked" boolean DEFAULT false,
    "address_updated_at" timestamp with time zone,
    "address_updated_by" "uuid",
    "payment_reminder_sent_at" timestamp with time zone,
    "payment_reminder_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "approved_at" timestamp with time zone,
    "rejected_at" timestamp with time zone,
    "paid_at" timestamp with time zone,
    "shipped_at" timestamp with time zone,
    "last_tracking_update" timestamp with time zone,
    "amount_paid" numeric(10,2) DEFAULT 0,
    "payment_status" "text" DEFAULT 'unpaid'::"text",
    "overpayment_amount" numeric(10,2) DEFAULT 0,
    "admin_notes" "text",
    "priority_auto" boolean DEFAULT true,
    "origin_country" "text",
    "shipping_method" "text" DEFAULT 'country_settings'::"text",
    "shipping_route_id" integer,
    "shipping_delivery_days" "text",
    "breakdown" "jsonb",
    "customs_percentage" numeric(5,2),
    "enabled_delivery_options" "jsonb" DEFAULT '[]'::"jsonb",
    "is_anonymous" boolean DEFAULT false,
    "social_handle" "text",
    "quote_source" "text" DEFAULT 'website'::"text",
    "share_token" "text",
    "expires_at" timestamp with time zone,
    "customer_name" "text",
    "customer_phone" "text",
    "sent_at" timestamp with time zone,
    "calculated_at" timestamp with time zone,
    "ordered_at" timestamp with time zone,
    "delivered_at" timestamp with time zone,
    "customer_notes" "text",
    "calculation_metadata" "jsonb",
    "payment_details" "jsonb",
    CONSTRAINT "quotes_anonymous_check" CHECK (((("is_anonymous" = true) AND ("user_id" IS NULL)) OR (("is_anonymous" = false) AND ("user_id" IS NOT NULL)))),
    CONSTRAINT "quotes_currency_not_null" CHECK (("currency" IS NOT NULL)),
    CONSTRAINT "quotes_customs_and_ecs_check" CHECK (("customs_and_ecs" >= (0)::numeric)),
    CONSTRAINT "quotes_discount_check" CHECK (("discount" >= (0)::numeric)),
    CONSTRAINT "quotes_domestic_shipping_check" CHECK (("domestic_shipping" >= (0)::numeric)),
    CONSTRAINT "quotes_email_check" CHECK (((("is_anonymous" = false) AND ("email" IS NOT NULL) AND ("email" <> ''::"text")) OR ("is_anonymous" = true))),
    CONSTRAINT "quotes_exchange_rate_check" CHECK (("exchange_rate" > (0)::numeric)),
    CONSTRAINT "quotes_final_total_check" CHECK (("final_total" >= (0)::numeric)),
    CONSTRAINT "quotes_final_total_local_check" CHECK (("final_total_local" >= (0)::numeric)),
    CONSTRAINT "quotes_handling_charge_check" CHECK (("handling_charge" >= (0)::numeric)),
    CONSTRAINT "quotes_insurance_amount_check" CHECK (("insurance_amount" >= (0)::numeric)),
    CONSTRAINT "quotes_international_shipping_check" CHECK (("international_shipping" >= (0)::numeric)),
    CONSTRAINT "quotes_item_price_check" CHECK (("item_price" >= (0)::numeric)),
    CONSTRAINT "quotes_item_weight_check" CHECK (("item_weight" >= (0)::numeric)),
    CONSTRAINT "quotes_merchant_shipping_price_check" CHECK (("merchant_shipping_price" >= (0)::numeric)),
    CONSTRAINT "quotes_payment_gateway_fee_check" CHECK (("payment_gateway_fee" >= (0)::numeric)),
    CONSTRAINT "quotes_quantity_check" CHECK (("quantity" > 0)),
    CONSTRAINT "quotes_sales_tax_price_check" CHECK (("sales_tax_price" >= (0)::numeric)),
    CONSTRAINT "quotes_sub_total_check" CHECK (("sub_total" >= (0)::numeric)),
    CONSTRAINT "quotes_vat_check" CHECK (("vat" >= (0)::numeric)),
    CONSTRAINT "valid_payment_status" CHECK (("payment_status" = ANY (ARRAY['unpaid'::"text", 'partial'::"text", 'paid'::"text", 'overpaid'::"text"]))),
    CONSTRAINT "valid_quote_status" CHECK (("status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'approved'::"text", 'rejected'::"text", 'expired'::"text", 'calculated'::"text", 'payment_pending'::"text", 'processing'::"text", 'paid'::"text", 'ordered'::"text", 'shipped'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."quotes" OWNER TO "postgres";


COMMENT ON COLUMN "public"."quotes"."user_id" IS 'User ID for registered users. NULL for anonymous/admin-created quotes.';



COMMENT ON COLUMN "public"."quotes"."email" IS 'Email address. Optional for anonymous quotes.';



COMMENT ON COLUMN "public"."quotes"."destination_country" IS 'The country where the package will be shipped to (customer location)';



COMMENT ON COLUMN "public"."quotes"."currency" IS 'Purchase country currency - used for all internal calculations (e.g., USD for US purchases)';



COMMENT ON COLUMN "public"."quotes"."final_currency" IS 'Customer display currency - used only for final display to customer (e.g., NPR for Nepali customers)';



COMMENT ON COLUMN "public"."quotes"."shipping_carrier" IS 'Shipping carrier used (e.g., DHL, FedEx, USPS)';



COMMENT ON COLUMN "public"."quotes"."approved_at" IS 'Timestamp when the customer approved the quote';



COMMENT ON COLUMN "public"."quotes"."paid_at" IS 'Timestamp when payment was received';



COMMENT ON COLUMN "public"."quotes"."shipped_at" IS 'Timestamp when the order was shipped';



COMMENT ON COLUMN "public"."quotes"."priority_auto" IS 'True if priority is auto-assigned based on thresholds, false if manually set.';



COMMENT ON COLUMN "public"."quotes"."origin_country" IS 'The country where the product is being purchased from (merchant location, e.g., US for Amazon.com)';



COMMENT ON COLUMN "public"."quotes"."shipping_method" IS 'Method used for shipping calculation: route-specific or country_settings';



COMMENT ON COLUMN "public"."quotes"."shipping_route_id" IS 'Reference to shipping_routes table if route-specific method was used';



COMMENT ON COLUMN "public"."quotes"."shipping_delivery_days" IS 'Expected delivery timeframe (e.g., 3-5 days, 5-10 days)';



COMMENT ON COLUMN "public"."quotes"."customs_percentage" IS 'Customs duty percentage for this quote (overrides category default)';



COMMENT ON COLUMN "public"."quotes"."enabled_delivery_options" IS 'Array of delivery option IDs that are enabled for this specific quote. If empty, all options from shipping route are available.';



COMMENT ON COLUMN "public"."quotes"."is_anonymous" IS 'True for quotes without user association (guest/admin-created).';



COMMENT ON COLUMN "public"."quotes"."social_handle" IS 'Social media handle (e.g., @username) for tracking quotes from social media';



COMMENT ON COLUMN "public"."quotes"."quote_source" IS 'Source of the quote: website, facebook, instagram, whatsapp, etc.';



COMMENT ON COLUMN "public"."quotes"."share_token" IS 'Unique token for sharing anonymous quotes';



COMMENT ON COLUMN "public"."quotes"."expires_at" IS 'Timestamp when quote expires (5 days after sent)';



COMMENT ON COLUMN "public"."quotes"."customer_name" IS 'Customer name for anonymous quotes';



COMMENT ON COLUMN "public"."quotes"."customer_phone" IS 'Customer phone for anonymous quotes';



COMMENT ON COLUMN "public"."quotes"."sent_at" IS 'Timestamp when quote was sent to customer';



COMMENT ON COLUMN "public"."quotes"."calculated_at" IS 'Timestamp when the quote was calculated with final pricing';



COMMENT ON COLUMN "public"."quotes"."ordered_at" IS 'Timestamp when the order was placed with the merchant';



COMMENT ON COLUMN "public"."quotes"."delivered_at" IS 'Timestamp when the order was delivered to the customer';



COMMENT ON COLUMN "public"."quotes"."customer_notes" IS 'Notes provided by the customer during quote request (visible to both customer and admin)';



COMMENT ON COLUMN "public"."quotes"."calculation_metadata" IS 'Stores metadata about quote calculations including performance metrics, timestamps, and calculation parameters';



COMMENT ON CONSTRAINT "quotes_anonymous_check" ON "public"."quotes" IS 'Anonymous quotes must have user_id = NULL. Non-anonymous quotes must have user_id.';



COMMENT ON CONSTRAINT "quotes_email_check" ON "public"."quotes" IS 'Email is required for non-anonymous quotes, optional for anonymous quotes.';



COMMENT ON CONSTRAINT "valid_quote_status" ON "public"."quotes" IS 'Quotes can have quote statuses (pending to approved) and then transition to order statuses (payment_pending/processing to completed) after checkout';



CREATE OR REPLACE VIEW "public"."payment_proof_verification_summary" AS
 SELECT "m"."id" AS "message_id",
    "m"."quote_id",
    "m"."sender_id",
    "m"."verification_status",
    "m"."admin_notes",
    "m"."verified_by",
    "m"."verified_at",
    "m"."attachment_file_name",
    "m"."attachment_url",
    "m"."created_at" AS "submitted_at",
    "q"."order_display_id",
    "q"."final_total",
    "q"."final_currency",
    "q"."payment_status",
    "q"."payment_method",
    "q"."amount_paid",
    "auth_users"."email" AS "customer_email",
    "admin_auth"."email" AS "verified_by_email"
   FROM ((("public"."messages" "m"
     JOIN "public"."quotes" "q" ON (("m"."quote_id" = "q"."id")))
     LEFT JOIN "auth"."users" "auth_users" ON (("m"."sender_id" = "auth_users"."id")))
     LEFT JOIN "auth"."users" "admin_auth" ON (("m"."verified_by" = "admin_auth"."id")))
  WHERE ("m"."message_type" = 'payment_proof'::"text")
  ORDER BY "m"."created_at" DESC;


ALTER VIEW "public"."payment_proof_verification_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_reconciliation" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reconciliation_date" "date" NOT NULL,
    "payment_method" "text" NOT NULL,
    "gateway_code" "text",
    "statement_reference" "text",
    "statement_start_date" "date",
    "statement_end_date" "date",
    "statement_opening_balance" numeric(15,4),
    "statement_closing_balance" numeric(15,4),
    "statement_total_credits" numeric(15,4),
    "statement_total_debits" numeric(15,4),
    "system_opening_balance" numeric(15,4),
    "system_closing_balance" numeric(15,4),
    "system_total_credits" numeric(15,4),
    "system_total_debits" numeric(15,4),
    "opening_difference" numeric(15,4) GENERATED ALWAYS AS ((COALESCE("statement_opening_balance", (0)::numeric) - COALESCE("system_opening_balance", (0)::numeric))) STORED,
    "closing_difference" numeric(15,4) GENERATED ALWAYS AS ((COALESCE("statement_closing_balance", (0)::numeric) - COALESCE("system_closing_balance", (0)::numeric))) STORED,
    "status" "text" DEFAULT 'in_progress'::"text",
    "matched_count" integer DEFAULT 0,
    "unmatched_system_count" integer DEFAULT 0,
    "unmatched_statement_count" integer DEFAULT 0,
    "total_matched_amount" numeric(15,4) DEFAULT 0,
    "statement_file_url" "text",
    "statement_file_name" "text",
    "reconciled_by" "uuid" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "notes" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "payment_reconciliation_status_check" CHECK (("status" = ANY (ARRAY['in_progress'::"text", 'completed'::"text", 'discrepancy_found'::"text", 'abandoned'::"text"])))
);


ALTER TABLE "public"."payment_reconciliation" OWNER TO "postgres";


COMMENT ON TABLE "public"."payment_reconciliation" IS 'Payment reconciliation sessions for matching bank/gateway statements';



CREATE TABLE IF NOT EXISTS "public"."payment_reminders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quote_id" "uuid",
    "reminder_type" "text" NOT NULL,
    "sent_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "payment_reminders_reminder_type_check" CHECK (("reminder_type" = ANY (ARRAY['bank_transfer_pending'::"text", 'cod_confirmation'::"text"])))
);


ALTER TABLE "public"."payment_reminders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "quote_id" "uuid",
    "amount" numeric(10,2) NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text",
    "status" "text" DEFAULT 'pending'::"text",
    "payment_method" "text",
    "gateway_response" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "total_refunded" numeric(10,2) DEFAULT 0,
    "refund_count" integer DEFAULT 0,
    "is_fully_refunded" boolean DEFAULT false,
    "last_refund_at" timestamp with time zone,
    "paypal_order_id" "text",
    "paypal_capture_id" "text",
    "paypal_payer_id" "text",
    "paypal_payer_email" "text"
);


ALTER TABLE "public"."payment_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_verification_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" character varying(255) NOT NULL,
    "transaction_id" character varying(255) NOT NULL,
    "gateway" character varying(50) NOT NULL,
    "success" boolean DEFAULT false NOT NULL,
    "error_message" "text",
    "gateway_response" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."payment_verification_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."payment_verification_logs" IS 'Logs for payment verification attempts for audit and debugging';



COMMENT ON COLUMN "public"."payment_verification_logs"."request_id" IS 'Unique identifier for each verification request';



COMMENT ON COLUMN "public"."payment_verification_logs"."transaction_id" IS 'Payment transaction ID being verified';



COMMENT ON COLUMN "public"."payment_verification_logs"."gateway" IS 'Payment gateway used (payu, stripe, etc.)';



COMMENT ON COLUMN "public"."payment_verification_logs"."success" IS 'Whether verification was successful';



COMMENT ON COLUMN "public"."payment_verification_logs"."error_message" IS 'Error message if verification failed';



COMMENT ON COLUMN "public"."payment_verification_logs"."gateway_response" IS 'Raw response from payment gateway';



CREATE TABLE IF NOT EXISTS "public"."paypal_refund_reasons" (
    "code" "text" NOT NULL,
    "description" "text" NOT NULL,
    "customer_friendly_description" "text",
    "is_active" boolean DEFAULT true,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."paypal_refund_reasons" OWNER TO "postgres";


COMMENT ON TABLE "public"."paypal_refund_reasons" IS 'Lookup table for standardized refund reason codes';



CREATE TABLE IF NOT EXISTS "public"."paypal_refunds" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "refund_id" "text" NOT NULL,
    "original_transaction_id" "text" NOT NULL,
    "payment_transaction_id" "uuid",
    "quote_id" "uuid",
    "user_id" "uuid",
    "refund_amount" numeric(10,2) NOT NULL,
    "original_amount" numeric(10,2) NOT NULL,
    "currency" "text" NOT NULL,
    "refund_type" "text" DEFAULT 'FULL'::"text" NOT NULL,
    "reason_code" "text",
    "reason_description" "text",
    "admin_notes" "text",
    "customer_note" "text",
    "status" "text" DEFAULT 'PENDING'::"text" NOT NULL,
    "paypal_status" "text",
    "processed_by" "uuid",
    "paypal_response" "jsonb",
    "error_details" "jsonb",
    "refund_date" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "paypal_refunds_refund_type_check" CHECK (("refund_type" = ANY (ARRAY['FULL'::"text", 'PARTIAL'::"text"]))),
    CONSTRAINT "paypal_refunds_status_check" CHECK (("status" = ANY (ARRAY['PENDING'::"text", 'COMPLETED'::"text", 'FAILED'::"text", 'CANCELLED'::"text"])))
);


ALTER TABLE "public"."paypal_refunds" OWNER TO "postgres";


COMMENT ON TABLE "public"."paypal_refunds" IS 'Tracks all PayPal refund transactions with full audit trail';



CREATE OR REPLACE VIEW "public"."paypal_refund_summary" AS
 SELECT "date_trunc"('day'::"text", "created_at") AS "refund_date",
    "count"(*) AS "refund_count",
    "sum"("refund_amount") AS "total_refunded",
    "avg"("refund_amount") AS "avg_refund_amount",
    "count"(
        CASE
            WHEN ("refund_type" = 'FULL'::"text") THEN 1
            ELSE NULL::integer
        END) AS "full_refunds",
    "count"(
        CASE
            WHEN ("refund_type" = 'PARTIAL'::"text") THEN 1
            ELSE NULL::integer
        END) AS "partial_refunds",
    "count"(
        CASE
            WHEN ("status" = 'COMPLETED'::"text") THEN 1
            ELSE NULL::integer
        END) AS "completed_refunds",
    "count"(
        CASE
            WHEN ("status" = 'FAILED'::"text") THEN 1
            ELSE NULL::integer
        END) AS "failed_refunds"
   FROM "public"."paypal_refunds"
  WHERE ("created_at" >= (CURRENT_DATE - '30 days'::interval))
  GROUP BY ("date_trunc"('day'::"text", "created_at"))
  ORDER BY ("date_trunc"('day'::"text", "created_at")) DESC;


ALTER VIEW "public"."paypal_refund_summary" OWNER TO "postgres";


COMMENT ON VIEW "public"."paypal_refund_summary" IS 'Daily summary of refund activity for analytics';



CREATE TABLE IF NOT EXISTS "public"."paypal_webhook_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "text" NOT NULL,
    "event_type" "text" NOT NULL,
    "resource_type" "text",
    "resource_id" "text",
    "summary" "text",
    "payload" "jsonb" NOT NULL,
    "verification_status" "text" DEFAULT 'pending'::"text",
    "processed_at" timestamp with time zone,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."paypal_webhook_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "phone" "text",
    "country" "text",
    "preferred_display_currency" "text",
    "avatar_url" "text",
    "cod_enabled" boolean DEFAULT false,
    "internal_notes" "text",
    "referral_code" "text",
    "total_orders" integer DEFAULT 0,
    "total_spent" numeric(10,2) DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "email" "text",
    "preferred_payment_gateway" "text",
    CONSTRAINT "profiles_email_check" CHECK (("email" ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::"text")),
    CONSTRAINT "valid_country" CHECK ((("country" IS NULL) OR ("country" ~ '^[A-Z]{2}$'::"text")))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."preferred_display_currency" IS 'User preferred display currency - now accepts any currency code from country_settings table instead of hardcoded list';



CREATE TABLE IF NOT EXISTS "public"."quote_address_history" (
    "id" integer NOT NULL,
    "quote_id" "uuid" NOT NULL,
    "old_address" "jsonb",
    "new_address" "jsonb" NOT NULL,
    "changed_by" "uuid",
    "changed_at" timestamp with time zone DEFAULT "now"(),
    "change_reason" "text",
    "change_type" "text" DEFAULT 'update'::"text",
    CONSTRAINT "quote_address_history_change_type_check" CHECK (("change_type" = ANY (ARRAY['create'::"text", 'update'::"text", 'lock'::"text", 'unlock'::"text"])))
);


ALTER TABLE "public"."quote_address_history" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."quote_address_history_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."quote_address_history_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."quote_address_history_id_seq" OWNED BY "public"."quote_address_history"."id";



CREATE TABLE IF NOT EXISTS "public"."quote_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quote_id" "uuid" NOT NULL,
    "document_type" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_url" "text" NOT NULL,
    "file_size" bigint NOT NULL,
    "uploaded_by" "uuid" NOT NULL,
    "uploaded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_customer_visible" boolean DEFAULT true NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "quote_documents_document_type_check" CHECK (("document_type" = ANY (ARRAY['invoice'::"text", 'receipt'::"text", 'shipping_label'::"text", 'customs_form'::"text", 'insurance_doc'::"text", 'other'::"text"]))),
    CONSTRAINT "quote_documents_file_size_check" CHECK (("file_size" > 0))
);


ALTER TABLE "public"."quote_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quote_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quote_id" "uuid" NOT NULL,
    "product_name" "text",
    "product_url" "text",
    "image_url" "text",
    "category" "text",
    "item_price" numeric(10,2),
    "item_weight" numeric(8,2),
    "quantity" integer DEFAULT 1,
    "options" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "quote_items_item_price_check" CHECK (("item_price" >= (0)::numeric)),
    CONSTRAINT "quote_items_item_weight_check" CHECK (("item_weight" >= (0)::numeric)),
    CONSTRAINT "quote_items_quantity_check" CHECK (("quantity" > 0))
);


ALTER TABLE "public"."quote_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quote_statuses" (
    "id" integer NOT NULL,
    "value" "text" NOT NULL,
    "label" "text" NOT NULL,
    "color" "text",
    "icon" "text",
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."quote_statuses" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."quote_statuses_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."quote_statuses_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."quote_statuses_id_seq" OWNED BY "public"."quote_statuses"."id";



CREATE TABLE IF NOT EXISTS "public"."quote_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_name" "text" NOT NULL,
    "product_name" "text",
    "product_url" "text",
    "image_url" "text",
    "item_price" numeric(10,2),
    "item_weight" numeric(8,2),
    "quantity" integer DEFAULT 1,
    "options" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."quote_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reconciliation_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reconciliation_id" "uuid" NOT NULL,
    "payment_ledger_id" "uuid",
    "system_date" "date",
    "system_amount" numeric(15,4),
    "system_reference" "text",
    "system_description" "text",
    "statement_date" "date",
    "statement_amount" numeric(15,4),
    "statement_reference" "text",
    "statement_description" "text",
    "matched" boolean DEFAULT false,
    "match_type" "text",
    "match_confidence" numeric(3,2),
    "matched_at" timestamp with time zone,
    "matched_by" "uuid",
    "discrepancy_amount" numeric(15,4) GENERATED ALWAYS AS ((COALESCE("statement_amount", (0)::numeric) - COALESCE("system_amount", (0)::numeric))) STORED,
    "discrepancy_reason" "text",
    "resolution_action" "text",
    "resolution_notes" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "reconciliation_items_match_type_check" CHECK (("match_type" = ANY (ARRAY['exact'::"text", 'manual'::"text", 'partial'::"text", 'suggested'::"text", 'unmatched'::"text"]))),
    CONSTRAINT "reconciliation_items_resolution_action_check" CHECK (("resolution_action" = ANY (ARRAY['accept_difference'::"text", 'create_adjustment'::"text", 'investigate'::"text", 'write_off'::"text", 'pending_transaction'::"text"]))),
    CONSTRAINT "reconciliation_items_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'matched'::"text", 'discrepancy'::"text", 'resolved'::"text", 'ignored'::"text"])))
);


ALTER TABLE "public"."reconciliation_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."reconciliation_items" IS 'Individual transaction matching within reconciliation sessions';



CREATE TABLE IF NOT EXISTS "public"."reconciliation_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rule_name" "text" NOT NULL,
    "rule_type" "text" NOT NULL,
    "payment_method" "text",
    "gateway_code" "text",
    "match_field" "text",
    "match_pattern" "text",
    "amount_tolerance" numeric(15,4),
    "date_tolerance_days" integer,
    "auto_match" boolean DEFAULT false,
    "confidence_threshold" numeric(3,2) DEFAULT 0.90,
    "is_active" boolean DEFAULT true,
    "priority" integer DEFAULT 100,
    "times_used" integer DEFAULT 0,
    "success_count" integer DEFAULT 0,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "reconciliation_rules_match_field_check" CHECK (("match_field" = ANY (ARRAY['reference'::"text", 'amount'::"text", 'description'::"text", 'date'::"text", 'combined'::"text"]))),
    CONSTRAINT "reconciliation_rules_rule_type_check" CHECK (("rule_type" = ANY (ARRAY['exact_match'::"text", 'fuzzy_match'::"text", 'amount_range'::"text", 'date_range'::"text", 'regex'::"text"])))
);


ALTER TABLE "public"."reconciliation_rules" OWNER TO "postgres";


COMMENT ON TABLE "public"."reconciliation_rules" IS 'Configurable rules for automatic transaction matching';



CREATE TABLE IF NOT EXISTS "public"."refund_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "refund_request_id" "uuid" NOT NULL,
    "payment_ledger_id" "uuid" NOT NULL,
    "allocated_amount" numeric(15,4) NOT NULL,
    "currency" "text" NOT NULL,
    "exchange_rate" numeric(15,6) DEFAULT 1,
    "base_amount" numeric(15,4) NOT NULL,
    "gateway_code" "text",
    "gateway_refund_id" "text",
    "gateway_response" "jsonb",
    "status" "text" DEFAULT 'pending'::"text",
    "processed_at" timestamp with time zone,
    "refund_payment_id" "uuid",
    "financial_transaction_id" "uuid",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "refund_items_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."refund_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."refund_items" IS 'Individual refund allocations across multiple payments';



CREATE TABLE IF NOT EXISTS "public"."refund_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quote_id" "uuid" NOT NULL,
    "payment_ledger_id" "uuid",
    "refund_type" "text" NOT NULL,
    "requested_amount" numeric(15,4) NOT NULL,
    "approved_amount" numeric(15,4),
    "currency" "text" NOT NULL,
    "reason_code" "text" NOT NULL,
    "reason_description" "text" NOT NULL,
    "customer_notes" "text",
    "internal_notes" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "requested_by" "uuid" NOT NULL,
    "requested_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "processed_by" "uuid",
    "processed_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "refund_method" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "refund_requests_reason_code_check" CHECK (("reason_code" = ANY (ARRAY['order_cancelled'::"text", 'price_adjustment'::"text", 'overpayment'::"text", 'customer_request'::"text", 'product_unavailable'::"text", 'quality_issue'::"text", 'shipping_issue'::"text", 'duplicate_payment'::"text", 'other'::"text"]))),
    CONSTRAINT "refund_requests_refund_method_check" CHECK (("refund_method" = ANY (ARRAY['original_payment_method'::"text", 'bank_transfer'::"text", 'credit_note'::"text", 'store_credit'::"text"]))),
    CONSTRAINT "refund_requests_refund_type_check" CHECK (("refund_type" = ANY (ARRAY['full'::"text", 'partial'::"text", 'credit_note'::"text", 'chargeback'::"text", 'overpayment'::"text"]))),
    CONSTRAINT "refund_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text", 'cancelled'::"text", 'partially_completed'::"text"])))
);


ALTER TABLE "public"."refund_requests" OWNER TO "postgres";


COMMENT ON TABLE "public"."refund_requests" IS 'Tracks all refund requests with approval workflow';



CREATE TABLE IF NOT EXISTS "public"."rejection_reasons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reason" "text" NOT NULL,
    "category" "text" DEFAULT 'general'::"text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."rejection_reasons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."route_customs_tiers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "origin_country" "text" NOT NULL,
    "destination_country" "text" NOT NULL,
    "rule_name" "text" NOT NULL,
    "price_min" numeric(10,2),
    "price_max" numeric(10,2),
    "weight_min" numeric(8,3),
    "weight_max" numeric(8,3),
    "logic_type" "text" NOT NULL,
    "customs_percentage" numeric(5,2) NOT NULL,
    "vat_percentage" numeric(5,2) NOT NULL,
    "priority_order" integer DEFAULT 1 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "route_customs_tiers_logic_type_check" CHECK (("logic_type" = ANY (ARRAY['AND'::"text", 'OR'::"text"])))
);


ALTER TABLE "public"."route_customs_tiers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shipping_routes" (
    "id" integer NOT NULL,
    "origin_country" character varying(3) NOT NULL,
    "destination_country" character varying(3) NOT NULL,
    "base_shipping_cost" numeric(10,2) NOT NULL,
    "cost_per_kg" numeric(10,2) NOT NULL,
    "cost_percentage" numeric(5,2) DEFAULT 0,
    "weight_tiers" "jsonb" DEFAULT '[{"max": 1, "min": 0, "cost": 15.00}, {"max": 3, "min": 1, "cost": 25.00}, {"max": 5, "min": 3, "cost": 35.00}, {"max": null, "min": 5, "cost": 45.00}]'::"jsonb",
    "carriers" "jsonb" DEFAULT '[{"days": "3-5", "name": "DHL", "cost_multiplier": 1.0}, {"days": "5-7", "name": "FedEx", "cost_multiplier": 0.9}, {"days": "7-14", "name": "USPS", "cost_multiplier": 0.7}]'::"jsonb",
    "max_weight" numeric(8,2),
    "restricted_items" "text"[],
    "requires_documentation" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "weight_unit" "text" DEFAULT 'kg'::"text" NOT NULL,
    "delivery_options" "jsonb" DEFAULT '[]'::"jsonb",
    "processing_days" integer DEFAULT 2,
    "active" boolean DEFAULT true,
    "customs_clearance_days" integer DEFAULT 3,
    "shipping_per_kg" numeric(10,2) DEFAULT 0.00,
    "exchange_rate" numeric(10,6) DEFAULT 1.0,
    CONSTRAINT "shipping_routes_exchange_rate_check" CHECK (("exchange_rate" > (0)::numeric)),
    CONSTRAINT "shipping_routes_weight_unit_check" CHECK (("weight_unit" = ANY (ARRAY['kg'::"text", 'lb'::"text"])))
);


ALTER TABLE "public"."shipping_routes" OWNER TO "postgres";


COMMENT ON COLUMN "public"."shipping_routes"."weight_unit" IS 'Weight unit for this shipping route (kg or lb)';



COMMENT ON COLUMN "public"."shipping_routes"."delivery_options" IS 'JSON array of delivery options with structure: [{"id": "string", "name": "string", "carrier": "string", "min_days": number, "max_days": number, "price": number, "active": boolean}]';



COMMENT ON COLUMN "public"."shipping_routes"."processing_days" IS 'Number of business days for order processing before shipping';



COMMENT ON COLUMN "public"."shipping_routes"."active" IS 'Whether the shipping route is active and available for quoting';



COMMENT ON COLUMN "public"."shipping_routes"."customs_clearance_days" IS 'Number of business days for customs clearance processing';



COMMENT ON COLUMN "public"."shipping_routes"."shipping_per_kg" IS 'Additional shipping cost per kg of weight (multiplied by item weight and added to base cost)';



COMMENT ON COLUMN "public"."shipping_routes"."exchange_rate" IS 'Exchange rate from origin country currency to destination country currency (e.g., USD to INR rate for US->IN route)';



CREATE SEQUENCE IF NOT EXISTS "public"."shipping_routes_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."shipping_routes_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."shipping_routes_id_seq" OWNED BY "public"."shipping_routes"."id";



CREATE TABLE IF NOT EXISTS "public"."status_transitions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quote_id" "uuid" NOT NULL,
    "from_status" "text" NOT NULL,
    "to_status" "text" NOT NULL,
    "trigger" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "changed_by" "uuid",
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "status_transitions_trigger_check" CHECK (("trigger" = ANY (ARRAY['payment_received'::"text", 'quote_sent'::"text", 'order_shipped'::"text", 'quote_expired'::"text", 'manual'::"text", 'auto_calculation'::"text"])))
);


ALTER TABLE "public"."status_transitions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "setting_key" "text" NOT NULL,
    "setting_value" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."system_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_addresses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "address_line1" "text" NOT NULL,
    "address_line2" "text",
    "city" "text" NOT NULL,
    "state_province_region" "text" NOT NULL,
    "postal_code" "text" NOT NULL,
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "phone" "text",
    "recipient_name" "text",
    "country" character varying(2),
    "destination_country" "text",
    "save_to_profile" "text"
);


ALTER TABLE "public"."user_addresses" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_addresses" IS 'User shipping addresses - simplified to use only destination_country field for country information';



COMMENT ON COLUMN "public"."user_addresses"."phone" IS 'Phone number for this specific address';



COMMENT ON COLUMN "public"."user_addresses"."recipient_name" IS 'Full name of the person who should receive the package at this address';



COMMENT ON COLUMN "public"."user_addresses"."country" IS 'Two-letter ISO country code for package delivery destination (e.g., IN for India, NP for Nepal)';



CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."app_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."webhook_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" character varying(255) NOT NULL,
    "webhook_type" character varying(50) NOT NULL,
    "status" character varying(50) NOT NULL,
    "user_agent" "text",
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."webhook_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."webhook_logs" IS 'Logs all webhook requests for debugging and monitoring';



COMMENT ON COLUMN "public"."webhook_logs"."request_id" IS 'Unique identifier for each webhook request';



COMMENT ON COLUMN "public"."webhook_logs"."webhook_type" IS 'Type of webhook (payu, stripe, etc.)';



COMMENT ON COLUMN "public"."webhook_logs"."status" IS 'Status of webhook processing (started, success, failed, warning)';



COMMENT ON COLUMN "public"."webhook_logs"."user_agent" IS 'User agent from webhook request';



COMMENT ON COLUMN "public"."webhook_logs"."error_message" IS 'Error message if webhook processing failed';



ALTER TABLE ONLY "public"."quote_address_history" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."quote_address_history_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."quote_statuses" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."quote_statuses_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."shipping_routes" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."shipping_routes_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."authenticated_checkout_sessions"
    ADD CONSTRAINT "authenticated_checkout_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."authenticated_checkout_sessions"
    ADD CONSTRAINT "authenticated_checkout_sessions_session_token_key" UNIQUE ("session_token");



ALTER TABLE ONLY "public"."bank_account_details"
    ADD CONSTRAINT "bank_account_details_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bank_statement_imports"
    ADD CONSTRAINT "bank_statement_imports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chart_of_accounts"
    ADD CONSTRAINT "chart_of_accounts_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."country_payment_preferences"
    ADD CONSTRAINT "country_payment_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."country_settings"
    ADD CONSTRAINT "country_settings_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."credit_note_applications"
    ADD CONSTRAINT "credit_note_applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."credit_note_history"
    ADD CONSTRAINT "credit_note_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."credit_notes"
    ADD CONSTRAINT "credit_notes_note_number_key" UNIQUE ("note_number");



ALTER TABLE ONLY "public"."credit_notes"
    ADD CONSTRAINT "credit_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customs_categories"
    ADD CONSTRAINT "customs_categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."customs_categories"
    ADD CONSTRAINT "customs_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customs_rules"
    ADD CONSTRAINT "customs_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_queue"
    ADD CONSTRAINT "email_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_settings"
    ADD CONSTRAINT "email_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_settings"
    ADD CONSTRAINT "email_settings_setting_key_key" UNIQUE ("setting_key");



ALTER TABLE ONLY "public"."email_templates"
    ADD CONSTRAINT "email_templates_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."email_templates"
    ADD CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."financial_transactions"
    ADD CONSTRAINT "financial_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gateway_refunds"
    ADD CONSTRAINT "gateway_refunds_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guest_checkout_sessions"
    ADD CONSTRAINT "guest_checkout_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guest_checkout_sessions"
    ADD CONSTRAINT "guest_checkout_sessions_session_token_key" UNIQUE ("session_token");



ALTER TABLE ONLY "public"."manual_analysis_tasks"
    ADD CONSTRAINT "manual_analysis_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."oauth_tokens"
    ADD CONSTRAINT "oauth_tokens_gateway_code_client_id_scope_is_active_key" UNIQUE ("gateway_code", "client_id", "scope", "is_active") DEFERRABLE INITIALLY DEFERRED;



ALTER TABLE ONLY "public"."oauth_tokens"
    ADD CONSTRAINT "oauth_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_adjustments"
    ADD CONSTRAINT "payment_adjustments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_alert_thresholds"
    ADD CONSTRAINT "payment_alert_thresholds_metric_name_key" UNIQUE ("metric_name");



ALTER TABLE ONLY "public"."payment_alert_thresholds"
    ADD CONSTRAINT "payment_alert_thresholds_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_error_logs"
    ADD CONSTRAINT "payment_error_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_gateways"
    ADD CONSTRAINT "payment_gateways_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."payment_gateways"
    ADD CONSTRAINT "payment_gateways_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_health_logs"
    ADD CONSTRAINT "payment_health_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_ledger"
    ADD CONSTRAINT "payment_ledger_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_links"
    ADD CONSTRAINT "payment_links_link_code_key" UNIQUE ("link_code");



ALTER TABLE ONLY "public"."payment_links"
    ADD CONSTRAINT "payment_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_reconciliation"
    ADD CONSTRAINT "payment_reconciliation_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_reminders"
    ADD CONSTRAINT "payment_reminders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_transactions"
    ADD CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_verification_logs"
    ADD CONSTRAINT "payment_verification_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."paypal_refund_reasons"
    ADD CONSTRAINT "paypal_refund_reasons_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."paypal_refunds"
    ADD CONSTRAINT "paypal_refunds_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."paypal_refunds"
    ADD CONSTRAINT "paypal_refunds_refund_id_key" UNIQUE ("refund_id");



ALTER TABLE ONLY "public"."paypal_webhook_events"
    ADD CONSTRAINT "paypal_webhook_events_event_id_key" UNIQUE ("event_id");



ALTER TABLE ONLY "public"."paypal_webhook_events"
    ADD CONSTRAINT "paypal_webhook_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_referral_code_key" UNIQUE ("referral_code");



ALTER TABLE ONLY "public"."quote_address_history"
    ADD CONSTRAINT "quote_address_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quote_documents"
    ADD CONSTRAINT "quote_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quote_items"
    ADD CONSTRAINT "quote_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quote_statuses"
    ADD CONSTRAINT "quote_statuses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quote_statuses"
    ADD CONSTRAINT "quote_statuses_value_key" UNIQUE ("value");



ALTER TABLE ONLY "public"."quote_templates"
    ADD CONSTRAINT "quote_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_display_id_key" UNIQUE ("display_id");



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_order_display_id_key" UNIQUE ("order_display_id");



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_share_token_key" UNIQUE ("share_token");



ALTER TABLE ONLY "public"."reconciliation_items"
    ADD CONSTRAINT "reconciliation_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reconciliation_rules"
    ADD CONSTRAINT "reconciliation_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."refund_items"
    ADD CONSTRAINT "refund_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."refund_requests"
    ADD CONSTRAINT "refund_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rejection_reasons"
    ADD CONSTRAINT "rejection_reasons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."route_customs_tiers"
    ADD CONSTRAINT "route_customs_tiers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shipping_routes"
    ADD CONSTRAINT "shipping_routes_origin_country_destination_country_key" UNIQUE ("origin_country", "destination_country");



ALTER TABLE ONLY "public"."shipping_routes"
    ADD CONSTRAINT "shipping_routes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."status_transitions"
    ADD CONSTRAINT "status_transitions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_setting_key_key" UNIQUE ("setting_key");



ALTER TABLE ONLY "public"."country_payment_preferences"
    ADD CONSTRAINT "unique_country_gateway" UNIQUE ("country_code", "gateway_code");



ALTER TABLE ONLY "public"."country_payment_preferences"
    ADD CONSTRAINT "unique_country_priority" UNIQUE ("country_code", "priority");



ALTER TABLE ONLY "public"."user_addresses"
    ADD CONSTRAINT "user_addresses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_key" UNIQUE ("user_id", "role");



ALTER TABLE ONLY "public"."webhook_logs"
    ADD CONSTRAINT "webhook_logs_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_authenticated_checkout_sessions_expires_at" ON "public"."authenticated_checkout_sessions" USING "btree" ("expires_at");



CREATE INDEX "idx_authenticated_checkout_sessions_quote_ids" ON "public"."authenticated_checkout_sessions" USING "gin" ("quote_ids");



CREATE INDEX "idx_authenticated_checkout_sessions_status" ON "public"."authenticated_checkout_sessions" USING "btree" ("status");



CREATE INDEX "idx_authenticated_checkout_sessions_token" ON "public"."authenticated_checkout_sessions" USING "btree" ("session_token");



CREATE INDEX "idx_authenticated_checkout_sessions_user_id" ON "public"."authenticated_checkout_sessions" USING "btree" ("user_id");



CREATE INDEX "idx_bank_account_details_country_currency" ON "public"."bank_account_details" USING "btree" ("country_code", "currency_code");



CREATE INDEX "idx_bank_account_details_currency_code" ON "public"."bank_account_details" USING "btree" ("currency_code");



CREATE INDEX "idx_bank_account_details_destination_country" ON "public"."bank_account_details" USING "btree" ("destination_country");



CREATE INDEX "idx_bank_accounts_country" ON "public"."bank_account_details" USING "btree" ("country_code");



CREATE INDEX "idx_bank_accounts_fallback" ON "public"."bank_account_details" USING "btree" ("is_fallback");



CREATE INDEX "idx_bank_statement_imports_reconciliation" ON "public"."bank_statement_imports" USING "btree" ("reconciliation_id");



CREATE INDEX "idx_country_payment_preferences_active" ON "public"."country_payment_preferences" USING "btree" ("is_active");



CREATE INDEX "idx_country_payment_preferences_country" ON "public"."country_payment_preferences" USING "btree" ("country_code");



CREATE INDEX "idx_country_payment_preferences_priority" ON "public"."country_payment_preferences" USING "btree" ("country_code", "priority");



CREATE INDEX "idx_country_settings_currency" ON "public"."country_settings" USING "btree" ("currency");



CREATE INDEX "idx_country_settings_minimum_payment" ON "public"."country_settings" USING "btree" ("minimum_payment_amount");



CREATE INDEX "idx_credit_note_applications_note" ON "public"."credit_note_applications" USING "btree" ("credit_note_id");



CREATE INDEX "idx_credit_note_applications_quote" ON "public"."credit_note_applications" USING "btree" ("quote_id");



CREATE INDEX "idx_credit_note_applications_status" ON "public"."credit_note_applications" USING "btree" ("status");



CREATE INDEX "idx_credit_note_history_action" ON "public"."credit_note_history" USING "btree" ("action");



CREATE INDEX "idx_credit_note_history_note" ON "public"."credit_note_history" USING "btree" ("credit_note_id");



CREATE INDEX "idx_credit_notes_customer" ON "public"."credit_notes" USING "btree" ("customer_id");



CREATE INDEX "idx_credit_notes_quote" ON "public"."credit_notes" USING "btree" ("quote_id");



CREATE INDEX "idx_credit_notes_status" ON "public"."credit_notes" USING "btree" ("status");



CREATE INDEX "idx_credit_notes_valid_dates" ON "public"."credit_notes" USING "btree" ("valid_from", "valid_until");



CREATE INDEX "idx_customs_rules_priority" ON "public"."customs_rules" USING "btree" ("priority");



CREATE INDEX "idx_customs_rules_route" ON "public"."customs_rules" USING "btree" ("origin_country", "destination_country", "is_active", "priority");



CREATE INDEX "idx_email_queue_status" ON "public"."email_queue" USING "btree" ("status", "created_at");



CREATE INDEX "idx_financial_transactions_accounts" ON "public"."financial_transactions" USING "btree" ("debit_account", "credit_account");



CREATE INDEX "idx_financial_transactions_date" ON "public"."financial_transactions" USING "btree" ("transaction_date");



CREATE INDEX "idx_financial_transactions_reference" ON "public"."financial_transactions" USING "btree" ("reference_type", "reference_id");



CREATE INDEX "idx_financial_transactions_status" ON "public"."financial_transactions" USING "btree" ("status");



CREATE INDEX "idx_gateway_refunds_date" ON "public"."gateway_refunds" USING "btree" ("refund_date");



CREATE INDEX "idx_gateway_refunds_gateway" ON "public"."gateway_refunds" USING "btree" ("gateway_code");



CREATE INDEX "idx_gateway_refunds_gateway_refund_id" ON "public"."gateway_refunds" USING "btree" ("gateway_refund_id");



CREATE INDEX "idx_gateway_refunds_quote" ON "public"."gateway_refunds" USING "btree" ("quote_id");



CREATE INDEX "idx_gateway_refunds_status" ON "public"."gateway_refunds" USING "btree" ("status");



CREATE INDEX "idx_guest_checkout_sessions_expires_at" ON "public"."guest_checkout_sessions" USING "btree" ("expires_at");



CREATE INDEX "idx_guest_checkout_sessions_quote_id" ON "public"."guest_checkout_sessions" USING "btree" ("quote_id");



CREATE INDEX "idx_guest_checkout_sessions_status" ON "public"."guest_checkout_sessions" USING "btree" ("status");



CREATE INDEX "idx_guest_checkout_sessions_token" ON "public"."guest_checkout_sessions" USING "btree" ("session_token");



CREATE INDEX "idx_manual_analysis_tasks_quote_id" ON "public"."manual_analysis_tasks" USING "btree" ("quote_id");



CREATE INDEX "idx_manual_analysis_tasks_status" ON "public"."manual_analysis_tasks" USING "btree" ("status");



CREATE INDEX "idx_messages_created_at" ON "public"."messages" USING "btree" ("created_at");



CREATE INDEX "idx_messages_message_type" ON "public"."messages" USING "btree" ("message_type");



CREATE INDEX "idx_messages_payment_proof" ON "public"."messages" USING "btree" ("quote_id", "message_type") WHERE ("message_type" = 'payment_proof'::"text");



CREATE INDEX "idx_messages_quote_payment_proof" ON "public"."messages" USING "btree" ("quote_id", "message_type") WHERE ("message_type" = 'payment_proof'::"text");



CREATE INDEX "idx_messages_recipient_id" ON "public"."messages" USING "btree" ("recipient_id");



CREATE INDEX "idx_messages_sender_id" ON "public"."messages" USING "btree" ("sender_id");



CREATE INDEX "idx_oauth_tokens_expiry" ON "public"."oauth_tokens" USING "btree" ("expires_at") WHERE ("is_active" = true);



CREATE INDEX "idx_oauth_tokens_lookup" ON "public"."oauth_tokens" USING "btree" ("gateway_code", "client_id", "scope", "is_active");



CREATE INDEX "idx_payment_adjustments_quote" ON "public"."payment_adjustments" USING "btree" ("quote_id");



CREATE INDEX "idx_payment_adjustments_status" ON "public"."payment_adjustments" USING "btree" ("status");



CREATE INDEX "idx_payment_error_logs_created_at" ON "public"."payment_error_logs" USING "btree" ("created_at");



CREATE INDEX "idx_payment_error_logs_error_code" ON "public"."payment_error_logs" USING "btree" ("error_code");



CREATE INDEX "idx_payment_error_logs_gateway" ON "public"."payment_error_logs" USING "btree" ("gateway");



CREATE INDEX "idx_payment_error_logs_severity" ON "public"."payment_error_logs" USING "btree" ("severity");



CREATE INDEX "idx_payment_error_logs_transaction_id" ON "public"."payment_error_logs" USING "btree" ("transaction_id");



CREATE INDEX "idx_payment_error_logs_user_id" ON "public"."payment_error_logs" USING "btree" ("user_id");



CREATE INDEX "idx_payment_gateways_priority" ON "public"."payment_gateways" USING "btree" ("priority");



CREATE INDEX "idx_payment_health_logs_alert_count" ON "public"."payment_health_logs" USING "btree" ("alert_count");



CREATE INDEX "idx_payment_health_logs_created_at" ON "public"."payment_health_logs" USING "btree" ("created_at");



CREATE INDEX "idx_payment_health_logs_overall_health" ON "public"."payment_health_logs" USING "btree" ("overall_health");



CREATE INDEX "idx_payment_health_logs_success_rate" ON "public"."payment_health_logs" USING "btree" ("success_rate");



CREATE INDEX "idx_payment_ledger_date" ON "public"."payment_ledger" USING "btree" ("payment_date");



CREATE INDEX "idx_payment_ledger_gateway" ON "public"."payment_ledger" USING "btree" ("gateway_code");



CREATE INDEX "idx_payment_ledger_method" ON "public"."payment_ledger" USING "btree" ("payment_method");



CREATE INDEX "idx_payment_ledger_quote" ON "public"."payment_ledger" USING "btree" ("quote_id");



CREATE INDEX "idx_payment_ledger_status" ON "public"."payment_ledger" USING "btree" ("status");



CREATE INDEX "idx_payment_links_api_version" ON "public"."payment_links" USING "btree" ("api_version");



CREATE INDEX "idx_payment_links_created_at" ON "public"."payment_links" USING "btree" ("created_at");



CREATE INDEX "idx_payment_links_customer_email" ON "public"."payment_links" USING "btree" ("customer_email");



CREATE INDEX "idx_payment_links_expires_at" ON "public"."payment_links" USING "btree" ("expires_at");



CREATE INDEX "idx_payment_links_gateway" ON "public"."payment_links" USING "btree" ("gateway");



CREATE INDEX "idx_payment_links_gateway_link_id" ON "public"."payment_links" USING "btree" ("gateway_link_id");



CREATE INDEX "idx_payment_links_gateway_status" ON "public"."payment_links" USING "btree" ("gateway", "status");



CREATE INDEX "idx_payment_links_link_code" ON "public"."payment_links" USING "btree" ("link_code");



CREATE INDEX "idx_payment_links_quote_id" ON "public"."payment_links" USING "btree" ("quote_id");



CREATE INDEX "idx_payment_links_status" ON "public"."payment_links" USING "btree" ("status");



CREATE INDEX "idx_payment_links_user_id" ON "public"."payment_links" USING "btree" ("user_id");



CREATE INDEX "idx_payment_reconciliation_date" ON "public"."payment_reconciliation" USING "btree" ("reconciliation_date");



CREATE INDEX "idx_payment_reconciliation_method" ON "public"."payment_reconciliation" USING "btree" ("payment_method");



CREATE INDEX "idx_payment_reconciliation_status" ON "public"."payment_reconciliation" USING "btree" ("status");



CREATE INDEX "idx_payment_transactions_paypal_capture" ON "public"."payment_transactions" USING "btree" ("paypal_capture_id") WHERE ("paypal_capture_id" IS NOT NULL);



CREATE INDEX "idx_payment_transactions_paypal_order" ON "public"."payment_transactions" USING "btree" ("paypal_order_id") WHERE ("paypal_order_id" IS NOT NULL);



CREATE INDEX "idx_payment_transactions_quote_id" ON "public"."payment_transactions" USING "btree" ("quote_id");



CREATE INDEX "idx_payment_transactions_status" ON "public"."payment_transactions" USING "btree" ("status");



CREATE INDEX "idx_payment_transactions_user_id" ON "public"."payment_transactions" USING "btree" ("user_id");



CREATE INDEX "idx_payment_verification_logs_created_at" ON "public"."payment_verification_logs" USING "btree" ("created_at");



CREATE INDEX "idx_payment_verification_logs_gateway" ON "public"."payment_verification_logs" USING "btree" ("gateway");



CREATE INDEX "idx_payment_verification_logs_request_id" ON "public"."payment_verification_logs" USING "btree" ("request_id");



CREATE INDEX "idx_payment_verification_logs_success" ON "public"."payment_verification_logs" USING "btree" ("success");



CREATE INDEX "idx_payment_verification_logs_transaction_id" ON "public"."payment_verification_logs" USING "btree" ("transaction_id");



CREATE INDEX "idx_paypal_refunds_created" ON "public"."paypal_refunds" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_paypal_refunds_original_transaction" ON "public"."paypal_refunds" USING "btree" ("original_transaction_id");



CREATE INDEX "idx_paypal_refunds_payment_transaction" ON "public"."paypal_refunds" USING "btree" ("payment_transaction_id");



CREATE INDEX "idx_paypal_refunds_quote" ON "public"."paypal_refunds" USING "btree" ("quote_id");



CREATE INDEX "idx_paypal_refunds_refund_id" ON "public"."paypal_refunds" USING "btree" ("refund_id");



CREATE INDEX "idx_paypal_refunds_status" ON "public"."paypal_refunds" USING "btree" ("status");



CREATE INDEX "idx_paypal_refunds_user" ON "public"."paypal_refunds" USING "btree" ("user_id");



CREATE INDEX "idx_paypal_webhook_events_created" ON "public"."paypal_webhook_events" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_paypal_webhook_events_event_id" ON "public"."paypal_webhook_events" USING "btree" ("event_id");



CREATE INDEX "idx_paypal_webhook_events_resource" ON "public"."paypal_webhook_events" USING "btree" ("resource_type", "resource_id");



CREATE INDEX "idx_profiles_country" ON "public"."profiles" USING "btree" ("country");



CREATE INDEX "idx_profiles_email" ON "public"."profiles" USING "btree" ("email");



CREATE INDEX "idx_profiles_referral_code" ON "public"."profiles" USING "btree" ("referral_code");



CREATE INDEX "idx_quote_address_history_changed_at" ON "public"."quote_address_history" USING "btree" ("changed_at");



CREATE INDEX "idx_quote_address_history_quote_id" ON "public"."quote_address_history" USING "btree" ("quote_id");



CREATE INDEX "idx_quote_documents_document_type" ON "public"."quote_documents" USING "btree" ("document_type");



CREATE INDEX "idx_quote_documents_quote_id" ON "public"."quote_documents" USING "btree" ("quote_id");



CREATE INDEX "idx_quote_documents_uploaded_at" ON "public"."quote_documents" USING "btree" ("uploaded_at" DESC);



CREATE INDEX "idx_quote_documents_uploaded_by" ON "public"."quote_documents" USING "btree" ("uploaded_by");



CREATE INDEX "idx_quote_items_quote_id" ON "public"."quote_items" USING "btree" ("quote_id");



CREATE INDEX "idx_quote_templates_name" ON "public"."quote_templates" USING "btree" ("template_name");



CREATE INDEX "idx_quotes_address_locked" ON "public"."quotes" USING "btree" ("address_locked");



CREATE INDEX "idx_quotes_approval_status" ON "public"."quotes" USING "btree" ("approval_status");



CREATE INDEX "idx_quotes_calculation_metadata" ON "public"."quotes" USING "gin" ("calculation_metadata");



CREATE INDEX "idx_quotes_country_code" ON "public"."quotes" USING "btree" ("destination_country");



CREATE INDEX "idx_quotes_created_at" ON "public"."quotes" USING "btree" ("created_at");



CREATE INDEX "idx_quotes_customer_notes" ON "public"."quotes" USING "btree" ("customer_notes");



CREATE INDEX "idx_quotes_display_id" ON "public"."quotes" USING "btree" ("display_id");



CREATE INDEX "idx_quotes_email" ON "public"."quotes" USING "btree" ("email");



CREATE INDEX "idx_quotes_expires_at" ON "public"."quotes" USING "btree" ("expires_at");



CREATE INDEX "idx_quotes_in_cart" ON "public"."quotes" USING "btree" ("in_cart");



CREATE INDEX "idx_quotes_is_anonymous" ON "public"."quotes" USING "btree" ("is_anonymous");



CREATE INDEX "idx_quotes_origin_country" ON "public"."quotes" USING "btree" ("origin_country");



CREATE INDEX "idx_quotes_paid_at" ON "public"."quotes" USING "btree" ("paid_at");



CREATE INDEX "idx_quotes_payment_status" ON "public"."quotes" USING "btree" ("payment_status");



CREATE INDEX "idx_quotes_quote_source" ON "public"."quotes" USING "btree" ("quote_source");



CREATE INDEX "idx_quotes_sent_at" ON "public"."quotes" USING "btree" ("sent_at");



CREATE INDEX "idx_quotes_share_token" ON "public"."quotes" USING "btree" ("share_token");



CREATE INDEX "idx_quotes_shipped_at" ON "public"."quotes" USING "btree" ("shipped_at");



CREATE INDEX "idx_quotes_shipping_carrier" ON "public"."quotes" USING "btree" ("shipping_carrier");



CREATE INDEX "idx_quotes_shipping_delivery_days" ON "public"."quotes" USING "btree" ("shipping_delivery_days");



CREATE INDEX "idx_quotes_shipping_method" ON "public"."quotes" USING "btree" ("shipping_method");



CREATE INDEX "idx_quotes_shipping_route_id" ON "public"."quotes" USING "btree" ("shipping_route_id");



CREATE INDEX "idx_quotes_status" ON "public"."quotes" USING "btree" ("status");



CREATE INDEX "idx_quotes_status_created" ON "public"."quotes" USING "btree" ("status", "created_at");



CREATE INDEX "idx_quotes_status_expires_at" ON "public"."quotes" USING "btree" ("status", "expires_at");



CREATE INDEX "idx_quotes_user_id" ON "public"."quotes" USING "btree" ("user_id");



CREATE INDEX "idx_reconciliation_items_matched" ON "public"."reconciliation_items" USING "btree" ("matched");



CREATE INDEX "idx_reconciliation_items_payment" ON "public"."reconciliation_items" USING "btree" ("payment_ledger_id");



CREATE INDEX "idx_reconciliation_items_reconciliation" ON "public"."reconciliation_items" USING "btree" ("reconciliation_id");



CREATE INDEX "idx_reconciliation_items_status" ON "public"."reconciliation_items" USING "btree" ("status");



CREATE INDEX "idx_reconciliation_rules_active" ON "public"."reconciliation_rules" USING "btree" ("is_active");



CREATE INDEX "idx_refund_items_request" ON "public"."refund_items" USING "btree" ("refund_request_id");



CREATE INDEX "idx_refund_items_status" ON "public"."refund_items" USING "btree" ("status");



CREATE INDEX "idx_refund_requests_quote" ON "public"."refund_requests" USING "btree" ("quote_id");



CREATE INDEX "idx_refund_requests_requested_at" ON "public"."refund_requests" USING "btree" ("requested_at");



CREATE INDEX "idx_refund_requests_status" ON "public"."refund_requests" USING "btree" ("status");



CREATE INDEX "idx_rejection_reasons_category" ON "public"."rejection_reasons" USING "btree" ("category");



CREATE INDEX "idx_rejection_reasons_is_active" ON "public"."rejection_reasons" USING "btree" ("is_active");



CREATE INDEX "idx_route_customs_tiers_price" ON "public"."route_customs_tiers" USING "btree" ("origin_country", "destination_country", "price_min", "price_max");



CREATE INDEX "idx_route_customs_tiers_priority" ON "public"."route_customs_tiers" USING "btree" ("origin_country", "destination_country", "priority_order");



CREATE INDEX "idx_route_customs_tiers_route" ON "public"."route_customs_tiers" USING "btree" ("origin_country", "destination_country");



CREATE INDEX "idx_route_customs_tiers_weight" ON "public"."route_customs_tiers" USING "btree" ("origin_country", "destination_country", "weight_min", "weight_max");



CREATE INDEX "idx_shipping_routes_active" ON "public"."shipping_routes" USING "btree" ("is_active");



CREATE INDEX "idx_shipping_routes_destination" ON "public"."shipping_routes" USING "btree" ("destination_country");



CREATE INDEX "idx_shipping_routes_origin" ON "public"."shipping_routes" USING "btree" ("origin_country");



CREATE INDEX "idx_shipping_routes_shipping_per_kg" ON "public"."shipping_routes" USING "btree" ("shipping_per_kg");



CREATE INDEX "idx_status_transitions_changed_at" ON "public"."status_transitions" USING "btree" ("changed_at");



CREATE INDEX "idx_status_transitions_quote_id" ON "public"."status_transitions" USING "btree" ("quote_id");



CREATE INDEX "idx_status_transitions_trigger" ON "public"."status_transitions" USING "btree" ("trigger");



CREATE INDEX "idx_user_addresses_destination_country" ON "public"."user_addresses" USING "btree" ("country");



CREATE INDEX "idx_user_addresses_user_id" ON "public"."user_addresses" USING "btree" ("user_id");



CREATE INDEX "idx_user_roles_user_id" ON "public"."user_roles" USING "btree" ("user_id");



CREATE INDEX "idx_webhook_logs_created_at" ON "public"."webhook_logs" USING "btree" ("created_at");



CREATE INDEX "idx_webhook_logs_request_id" ON "public"."webhook_logs" USING "btree" ("request_id");



CREATE INDEX "idx_webhook_logs_status" ON "public"."webhook_logs" USING "btree" ("status");



CREATE INDEX "idx_webhook_logs_webhook_type" ON "public"."webhook_logs" USING "btree" ("webhook_type");



CREATE OR REPLACE TRIGGER "create_payment_ledger_entry_on_payment" AFTER INSERT OR UPDATE ON "public"."payment_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."create_payment_ledger_entry_trigger"();



CREATE OR REPLACE TRIGGER "ensure_profile_before_address" BEFORE INSERT ON "public"."user_addresses" FOR EACH ROW EXECUTE FUNCTION "public"."before_address_insert"();



CREATE OR REPLACE TRIGGER "generate_quote_display_id" BEFORE INSERT ON "public"."quotes" FOR EACH ROW EXECUTE FUNCTION "public"."generate_display_id"();



CREATE OR REPLACE TRIGGER "set_share_token_trigger" BEFORE INSERT ON "public"."quotes" FOR EACH ROW EXECUTE FUNCTION "public"."set_share_token"();



CREATE OR REPLACE TRIGGER "sync_payment_amounts_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."payment_ledger" FOR EACH ROW EXECUTE FUNCTION "public"."sync_quote_payment_amounts"();



CREATE OR REPLACE TRIGGER "trigger_country_payment_preferences_updated_at" BEFORE UPDATE ON "public"."country_payment_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_country_payment_preferences_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_handle_default_address_insert" BEFORE INSERT ON "public"."user_addresses" FOR EACH ROW EXECUTE FUNCTION "public"."handle_default_address"();



CREATE OR REPLACE TRIGGER "trigger_handle_default_address_update" BEFORE UPDATE ON "public"."user_addresses" FOR EACH ROW EXECUTE FUNCTION "public"."handle_default_address"();



CREATE OR REPLACE TRIGGER "trigger_log_address_change_insert" AFTER INSERT ON "public"."quotes" FOR EACH ROW WHEN (("new"."shipping_address" IS NOT NULL)) EXECUTE FUNCTION "public"."log_address_change"();



CREATE OR REPLACE TRIGGER "trigger_log_address_change_update" AFTER UPDATE ON "public"."quotes" FOR EACH ROW WHEN ((("old"."shipping_address" IS DISTINCT FROM "new"."shipping_address") OR ("old"."address_locked" IS DISTINCT FROM "new"."address_locked"))) EXECUTE FUNCTION "public"."log_address_change"();



CREATE OR REPLACE TRIGGER "trigger_log_quote_status_change" AFTER UPDATE ON "public"."quotes" FOR EACH ROW EXECUTE FUNCTION "public"."log_quote_status_change"();



CREATE OR REPLACE TRIGGER "trigger_paypal_refunds_updated_at" BEFORE UPDATE ON "public"."paypal_refunds" FOR EACH ROW EXECUTE FUNCTION "public"."update_paypal_refunds_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_paypal_webhook_events_updated_at" BEFORE UPDATE ON "public"."paypal_webhook_events" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_paypal_webhook_events_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_set_quote_expiration" BEFORE UPDATE ON "public"."quotes" FOR EACH ROW EXECUTE FUNCTION "public"."set_quote_expiration"();



CREATE OR REPLACE TRIGGER "trigger_update_authenticated_checkout_sessions_updated_at" BEFORE UPDATE ON "public"."authenticated_checkout_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."update_authenticated_checkout_sessions_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_guest_checkout_sessions_updated_at" BEFORE UPDATE ON "public"."guest_checkout_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."update_guest_checkout_sessions_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_payment_refund_totals" AFTER INSERT OR UPDATE OF "status", "refund_amount", "completed_at" ON "public"."paypal_refunds" FOR EACH ROW EXECUTE FUNCTION "public"."update_payment_refund_totals"();



CREATE OR REPLACE TRIGGER "trigger_update_quote_documents_updated_at" BEFORE UPDATE ON "public"."quote_documents" FOR EACH ROW EXECUTE FUNCTION "public"."update_quote_documents_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_route_customs_tiers_updated_at" BEFORE UPDATE ON "public"."route_customs_tiers" FOR EACH ROW EXECUTE FUNCTION "public"."update_route_customs_tiers_updated_at"();



CREATE OR REPLACE TRIGGER "update_chart_of_accounts_updated_at" BEFORE UPDATE ON "public"."chart_of_accounts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_credit_notes_updated_at" BEFORE UPDATE ON "public"."credit_notes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_financial_transactions_updated_at" BEFORE UPDATE ON "public"."financial_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_gateway_refunds_updated_at" BEFORE UPDATE ON "public"."gateway_refunds" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_payment_adjustments_updated_at" BEFORE UPDATE ON "public"."payment_adjustments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_payment_ledger_updated_at" BEFORE UPDATE ON "public"."payment_ledger" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_payment_links_updated_at_trigger" BEFORE UPDATE ON "public"."payment_links" FOR EACH ROW EXECUTE FUNCTION "public"."update_payment_links_updated_at"();



CREATE OR REPLACE TRIGGER "update_payment_reconciliation_updated_at" BEFORE UPDATE ON "public"."payment_reconciliation" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_payment_status_on_quote" BEFORE UPDATE ON "public"."quotes" FOR EACH ROW EXECUTE FUNCTION "public"."update_payment_status"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_quotes_updated_at" BEFORE UPDATE ON "public"."quotes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_reconciliation_items_updated_at" BEFORE UPDATE ON "public"."reconciliation_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_refund_items_updated_at" BEFORE UPDATE ON "public"."refund_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_refund_requests_updated_at" BEFORE UPDATE ON "public"."refund_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "validate_delivery_options_trigger" BEFORE INSERT OR UPDATE ON "public"."shipping_routes" FOR EACH ROW EXECUTE FUNCTION "public"."validate_delivery_options"();



ALTER TABLE ONLY "public"."authenticated_checkout_sessions"
    ADD CONSTRAINT "authenticated_checkout_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bank_account_details"
    ADD CONSTRAINT "bank_account_details_country_code_fkey" FOREIGN KEY ("country_code") REFERENCES "public"."country_settings"("code");



ALTER TABLE ONLY "public"."bank_statement_imports"
    ADD CONSTRAINT "bank_statement_imports_imported_by_fkey" FOREIGN KEY ("imported_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."bank_statement_imports"
    ADD CONSTRAINT "bank_statement_imports_reconciliation_id_fkey" FOREIGN KEY ("reconciliation_id") REFERENCES "public"."payment_reconciliation"("id");



ALTER TABLE ONLY "public"."chart_of_accounts"
    ADD CONSTRAINT "chart_of_accounts_parent_code_fkey" FOREIGN KEY ("parent_code") REFERENCES "public"."chart_of_accounts"("code");



ALTER TABLE ONLY "public"."credit_note_applications"
    ADD CONSTRAINT "credit_note_applications_applied_by_fkey" FOREIGN KEY ("applied_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."credit_note_applications"
    ADD CONSTRAINT "credit_note_applications_credit_note_id_fkey" FOREIGN KEY ("credit_note_id") REFERENCES "public"."credit_notes"("id");



ALTER TABLE ONLY "public"."credit_note_applications"
    ADD CONSTRAINT "credit_note_applications_financial_transaction_id_fkey" FOREIGN KEY ("financial_transaction_id") REFERENCES "public"."financial_transactions"("id");



ALTER TABLE ONLY "public"."credit_note_applications"
    ADD CONSTRAINT "credit_note_applications_payment_ledger_id_fkey" FOREIGN KEY ("payment_ledger_id") REFERENCES "public"."payment_ledger"("id");



ALTER TABLE ONLY "public"."credit_note_applications"
    ADD CONSTRAINT "credit_note_applications_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id");



ALTER TABLE ONLY "public"."credit_note_applications"
    ADD CONSTRAINT "credit_note_applications_reversed_by_fkey" FOREIGN KEY ("reversed_by") REFERENCES "public"."credit_note_applications"("id");



ALTER TABLE ONLY "public"."credit_note_history"
    ADD CONSTRAINT "credit_note_history_credit_note_id_fkey" FOREIGN KEY ("credit_note_id") REFERENCES "public"."credit_notes"("id");



ALTER TABLE ONLY "public"."credit_note_history"
    ADD CONSTRAINT "credit_note_history_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."credit_notes"
    ADD CONSTRAINT "credit_notes_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."credit_notes"
    ADD CONSTRAINT "credit_notes_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."credit_notes"
    ADD CONSTRAINT "credit_notes_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."credit_notes"
    ADD CONSTRAINT "credit_notes_issued_by_fkey" FOREIGN KEY ("issued_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."credit_notes"
    ADD CONSTRAINT "credit_notes_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id");



ALTER TABLE ONLY "public"."credit_notes"
    ADD CONSTRAINT "credit_notes_refund_request_id_fkey" FOREIGN KEY ("refund_request_id") REFERENCES "public"."refund_requests"("id");



ALTER TABLE ONLY "public"."financial_transactions"
    ADD CONSTRAINT "financial_transactions_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."financial_transactions"
    ADD CONSTRAINT "financial_transactions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."financial_transactions"
    ADD CONSTRAINT "financial_transactions_credit_account_fkey" FOREIGN KEY ("credit_account") REFERENCES "public"."chart_of_accounts"("code");



ALTER TABLE ONLY "public"."financial_transactions"
    ADD CONSTRAINT "financial_transactions_debit_account_fkey" FOREIGN KEY ("debit_account") REFERENCES "public"."chart_of_accounts"("code");



ALTER TABLE ONLY "public"."financial_transactions"
    ADD CONSTRAINT "financial_transactions_reversed_by_fkey" FOREIGN KEY ("reversed_by") REFERENCES "public"."financial_transactions"("id");



ALTER TABLE ONLY "public"."country_payment_preferences"
    ADD CONSTRAINT "fk_country_payment_preferences_country" FOREIGN KEY ("country_code") REFERENCES "public"."country_settings"("code") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."country_payment_preferences"
    ADD CONSTRAINT "fk_country_payment_preferences_gateway" FOREIGN KEY ("gateway_code") REFERENCES "public"."payment_gateways"("code") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gateway_refunds"
    ADD CONSTRAINT "gateway_refunds_payment_transaction_id_fkey" FOREIGN KEY ("payment_transaction_id") REFERENCES "public"."payment_transactions"("id");



ALTER TABLE ONLY "public"."gateway_refunds"
    ADD CONSTRAINT "gateway_refunds_processed_by_fkey" FOREIGN KEY ("processed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."gateway_refunds"
    ADD CONSTRAINT "gateway_refunds_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id");



ALTER TABLE ONLY "public"."guest_checkout_sessions"
    ADD CONSTRAINT "guest_checkout_sessions_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."manual_analysis_tasks"
    ADD CONSTRAINT "manual_analysis_tasks_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."manual_analysis_tasks"
    ADD CONSTRAINT "manual_analysis_tasks_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_reply_to_message_id_fkey" FOREIGN KEY ("reply_to_message_id") REFERENCES "public"."messages"("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."oauth_tokens"
    ADD CONSTRAINT "oauth_tokens_gateway_code_fkey" FOREIGN KEY ("gateway_code") REFERENCES "public"."payment_gateways"("code") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_adjustments"
    ADD CONSTRAINT "payment_adjustments_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."payment_adjustments"
    ADD CONSTRAINT "payment_adjustments_financial_transaction_id_fkey" FOREIGN KEY ("financial_transaction_id") REFERENCES "public"."financial_transactions"("id");



ALTER TABLE ONLY "public"."payment_adjustments"
    ADD CONSTRAINT "payment_adjustments_payment_ledger_id_fkey" FOREIGN KEY ("payment_ledger_id") REFERENCES "public"."payment_ledger"("id");



ALTER TABLE ONLY "public"."payment_adjustments"
    ADD CONSTRAINT "payment_adjustments_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id");



ALTER TABLE ONLY "public"."payment_adjustments"
    ADD CONSTRAINT "payment_adjustments_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."payment_error_logs"
    ADD CONSTRAINT "payment_error_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."payment_ledger"
    ADD CONSTRAINT "payment_ledger_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."payment_ledger"
    ADD CONSTRAINT "payment_ledger_financial_transaction_id_fkey" FOREIGN KEY ("financial_transaction_id") REFERENCES "public"."financial_transactions"("id");



ALTER TABLE ONLY "public"."payment_ledger"
    ADD CONSTRAINT "payment_ledger_parent_payment_id_fkey" FOREIGN KEY ("parent_payment_id") REFERENCES "public"."payment_ledger"("id");



ALTER TABLE ONLY "public"."payment_ledger"
    ADD CONSTRAINT "payment_ledger_payment_proof_message_id_fkey" FOREIGN KEY ("payment_proof_message_id") REFERENCES "public"."messages"("id");



ALTER TABLE ONLY "public"."payment_ledger"
    ADD CONSTRAINT "payment_ledger_payment_transaction_id_fkey" FOREIGN KEY ("payment_transaction_id") REFERENCES "public"."payment_transactions"("id");



ALTER TABLE ONLY "public"."payment_ledger"
    ADD CONSTRAINT "payment_ledger_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id");



ALTER TABLE ONLY "public"."payment_ledger"
    ADD CONSTRAINT "payment_ledger_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."payment_links"
    ADD CONSTRAINT "payment_links_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."payment_links"
    ADD CONSTRAINT "payment_links_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id");



ALTER TABLE ONLY "public"."payment_links"
    ADD CONSTRAINT "payment_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."payment_reconciliation"
    ADD CONSTRAINT "payment_reconciliation_reconciled_by_fkey" FOREIGN KEY ("reconciled_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."payment_reminders"
    ADD CONSTRAINT "payment_reminders_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_transactions"
    ADD CONSTRAINT "payment_transactions_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_transactions"
    ADD CONSTRAINT "payment_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."paypal_refunds"
    ADD CONSTRAINT "paypal_refunds_payment_transaction_id_fkey" FOREIGN KEY ("payment_transaction_id") REFERENCES "public"."payment_transactions"("id");



ALTER TABLE ONLY "public"."paypal_refunds"
    ADD CONSTRAINT "paypal_refunds_processed_by_fkey" FOREIGN KEY ("processed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."paypal_refunds"
    ADD CONSTRAINT "paypal_refunds_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id");



ALTER TABLE ONLY "public"."paypal_refunds"
    ADD CONSTRAINT "paypal_refunds_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quote_address_history"
    ADD CONSTRAINT "quote_address_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."quote_address_history"
    ADD CONSTRAINT "quote_address_history_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quote_documents"
    ADD CONSTRAINT "quote_documents_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quote_documents"
    ADD CONSTRAINT "quote_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quote_items"
    ADD CONSTRAINT "quote_items_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_country_code_fkey" FOREIGN KEY ("destination_country") REFERENCES "public"."country_settings"("code");



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_shipping_route_id_fkey" FOREIGN KEY ("shipping_route_id") REFERENCES "public"."shipping_routes"("id");



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reconciliation_items"
    ADD CONSTRAINT "reconciliation_items_matched_by_fkey" FOREIGN KEY ("matched_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."reconciliation_items"
    ADD CONSTRAINT "reconciliation_items_payment_ledger_id_fkey" FOREIGN KEY ("payment_ledger_id") REFERENCES "public"."payment_ledger"("id");



ALTER TABLE ONLY "public"."reconciliation_items"
    ADD CONSTRAINT "reconciliation_items_reconciliation_id_fkey" FOREIGN KEY ("reconciliation_id") REFERENCES "public"."payment_reconciliation"("id");



ALTER TABLE ONLY "public"."reconciliation_rules"
    ADD CONSTRAINT "reconciliation_rules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."refund_items"
    ADD CONSTRAINT "refund_items_financial_transaction_id_fkey" FOREIGN KEY ("financial_transaction_id") REFERENCES "public"."financial_transactions"("id");



ALTER TABLE ONLY "public"."refund_items"
    ADD CONSTRAINT "refund_items_payment_ledger_id_fkey" FOREIGN KEY ("payment_ledger_id") REFERENCES "public"."payment_ledger"("id");



ALTER TABLE ONLY "public"."refund_items"
    ADD CONSTRAINT "refund_items_refund_payment_id_fkey" FOREIGN KEY ("refund_payment_id") REFERENCES "public"."payment_ledger"("id");



ALTER TABLE ONLY "public"."refund_items"
    ADD CONSTRAINT "refund_items_refund_request_id_fkey" FOREIGN KEY ("refund_request_id") REFERENCES "public"."refund_requests"("id");



ALTER TABLE ONLY "public"."refund_requests"
    ADD CONSTRAINT "refund_requests_payment_ledger_id_fkey" FOREIGN KEY ("payment_ledger_id") REFERENCES "public"."payment_ledger"("id");



ALTER TABLE ONLY "public"."refund_requests"
    ADD CONSTRAINT "refund_requests_processed_by_fkey" FOREIGN KEY ("processed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."refund_requests"
    ADD CONSTRAINT "refund_requests_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id");



ALTER TABLE ONLY "public"."refund_requests"
    ADD CONSTRAINT "refund_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."refund_requests"
    ADD CONSTRAINT "refund_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."status_transitions"
    ADD CONSTRAINT "status_transitions_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."status_transitions"
    ADD CONSTRAINT "status_transitions_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_addresses"
    ADD CONSTRAINT "user_addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admin can insert email settings" ON "public"."email_settings" FOR INSERT WITH CHECK ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "Admin can manage alert thresholds" ON "public"."payment_alert_thresholds" USING ("public"."is_admin"());



CREATE POLICY "Admin can manage customs rules" ON "public"."customs_rules" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admin can manage customs tiers" ON "public"."route_customs_tiers" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admin can manage payment error logs" ON "public"."payment_error_logs" USING ("public"."is_admin"());



CREATE POLICY "Admin can manage route customs tiers" ON "public"."route_customs_tiers" USING ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "Admin can manage shipping routes" ON "public"."shipping_routes" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admin can read email settings" ON "public"."email_settings" FOR SELECT USING ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "Admin can update email settings" ON "public"."email_settings" FOR UPDATE USING ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "Admin can view all emails" ON "public"."email_queue" FOR SELECT USING (("auth"."uid"() IN ( SELECT "user_roles"."user_id"
   FROM "public"."user_roles"
  WHERE ("user_roles"."role" = 'admin'::"public"."app_role"))));



CREATE POLICY "Admin only access to payment health logs" ON "public"."payment_health_logs" USING ("public"."is_admin"());



CREATE POLICY "Admin only access to payment verification logs" ON "public"."payment_verification_logs" USING ("public"."is_admin"());



CREATE POLICY "Admin only access to webhook logs" ON "public"."webhook_logs" USING ("public"."is_admin"());



CREATE POLICY "Admin users can view PayPal webhook events" ON "public"."paypal_webhook_events" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can create quotes" ON "public"."quotes" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can delete quote documents" ON "public"."quote_documents" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can insert quote documents" ON "public"."quote_documents" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can insert quotes" ON "public"."quotes" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can manage all roles" ON "public"."user_roles" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can manage bank imports" ON "public"."bank_statement_imports" USING ("public"."is_admin"());



CREATE POLICY "Admins can manage credit notes" ON "public"."credit_notes" USING ("public"."is_admin"());



CREATE POLICY "Admins can manage delivery options" ON "public"."shipping_routes" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can manage financial transactions" ON "public"."financial_transactions" USING ("public"."is_admin"());



CREATE POLICY "Admins can manage payment adjustments" ON "public"."payment_adjustments" USING ("public"."is_admin"());



CREATE POLICY "Admins can manage payment ledger" ON "public"."payment_ledger" USING ("public"."is_admin"());



CREATE POLICY "Admins can manage payment links" ON "public"."payment_links" USING ("public"."is_admin"());



CREATE POLICY "Admins can manage reconciliation" ON "public"."payment_reconciliation" USING ("public"."is_admin"());



CREATE POLICY "Admins can manage reconciliation items" ON "public"."reconciliation_items" USING ("public"."is_admin"());



CREATE POLICY "Admins can manage refund items" ON "public"."refund_items" USING ("public"."is_admin"());



CREATE POLICY "Admins can manage refund reasons" ON "public"."paypal_refund_reasons" TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can manage refund requests" ON "public"."refund_requests" USING ("public"."is_admin"());



CREATE POLICY "Admins can manage refunds" ON "public"."gateway_refunds" USING ("public"."is_admin"());



CREATE POLICY "Admins can manage refunds" ON "public"."paypal_refunds" TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can manage rejection reasons" ON "public"."rejection_reasons" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['admin'::"public"."app_role", 'moderator'::"public"."app_role"]))))));



CREATE POLICY "Admins can modify all profiles" ON "public"."profiles" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can read all profiles" ON "public"."profiles" FOR SELECT USING (("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR ("auth"."uid"() = "id")));



CREATE POLICY "Admins can update all quotes" ON "public"."quotes" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can update quote documents" ON "public"."quote_documents" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can update verification status" ON "public"."messages" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can view all quote documents" ON "public"."quote_documents" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can view all quotes" ON "public"."quotes" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can view all refunds" ON "public"."paypal_refunds" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can view webhook logs" ON "public"."webhook_logs" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "Admins have full access" ON "public"."bank_account_details" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins have full access" ON "public"."country_settings" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins have full access" ON "public"."email_settings" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins have full access" ON "public"."email_templates" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins have full access" ON "public"."manual_analysis_tasks" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins have full access" ON "public"."messages" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins have full access" ON "public"."payment_reminders" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins have full access" ON "public"."payment_transactions" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins have full access" ON "public"."quote_address_history" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins have full access" ON "public"."quote_items" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins have full access" ON "public"."quote_templates" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins have full access" ON "public"."quotes" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins have full access" ON "public"."status_transitions" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins have full access" ON "public"."system_settings" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins have full access" ON "public"."user_addresses" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Allow status updates on shared quotes" ON "public"."quotes" FOR UPDATE USING ((("share_token" IS NOT NULL) AND (("expires_at" IS NULL) OR ("expires_at" > "now"())))) WITH CHECK (("share_token" IS NOT NULL));



CREATE POLICY "Anyone can create guest sessions" ON "public"."guest_checkout_sessions" FOR INSERT WITH CHECK (true);



CREATE POLICY "Anyone can read refund reasons" ON "public"."paypal_refund_reasons" FOR SELECT TO "authenticated" USING (("is_active" = true));



CREATE POLICY "Anyone can update own session" ON "public"."guest_checkout_sessions" FOR UPDATE USING (true);



CREATE POLICY "Anyone can view anonymous quotes by token" ON "public"."quotes" FOR SELECT USING ((("is_anonymous" = true) AND ("share_token" IS NOT NULL) AND (("expires_at" IS NULL) OR ("expires_at" > "now"()))));



CREATE POLICY "Anyone can view own session by token" ON "public"."guest_checkout_sessions" FOR SELECT USING (true);



CREATE POLICY "Anyone can view quote items for shared quotes" ON "public"."quote_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."quotes" "q"
  WHERE (("q"."id" = "quote_items"."quote_id") AND ("q"."share_token" IS NOT NULL) AND (("q"."expires_at" IS NULL) OR ("q"."expires_at" > "now"()))))));



CREATE POLICY "Anyone can view shared quotes" ON "public"."quotes" FOR SELECT USING ((("share_token" IS NOT NULL) AND (("expires_at" IS NULL) OR ("expires_at" > "now"()))));



CREATE POLICY "Authenticated users can read customs tiers" ON "public"."route_customs_tiers" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Country payment preferences are manageable by admins" ON "public"."country_payment_preferences" USING ("public"."is_admin"());



CREATE POLICY "Country payment preferences are viewable by everyone" ON "public"."country_payment_preferences" FOR SELECT USING (true);



CREATE POLICY "Customers can upload documents to their quotes" ON "public"."quote_documents" FOR INSERT WITH CHECK ((("quote_id" IN ( SELECT "quotes"."id"
   FROM "public"."quotes"
  WHERE ("quotes"."user_id" = "auth"."uid"()))) AND ("uploaded_by" = "auth"."uid"())));



CREATE POLICY "Customers can view their visible quote documents" ON "public"."quote_documents" FOR SELECT USING ((("is_customer_visible" = true) AND ("quote_id" IN ( SELECT "quotes"."id"
   FROM "public"."quotes"
  WHERE ("quotes"."user_id" = "auth"."uid"())))));



CREATE POLICY "Enable admin full access to bank_account_details" ON "public"."bank_account_details" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Enable admin full access to customs_categories" ON "public"."customs_categories" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Enable admin full access to email_templates" ON "public"."email_templates" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Enable admin full access to payment_gateways" ON "public"."payment_gateways" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Enable admin full access to quote_templates" ON "public"."quote_templates" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Enable admin full access to system_settings" ON "public"."system_settings" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Enable admin full access to user_roles" ON "public"."user_roles" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Everyone can view active rejection reasons" ON "public"."rejection_reasons" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Public can read active shipping routes" ON "public"."shipping_routes" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Public read access" ON "public"."country_settings" FOR SELECT USING (true);



CREATE POLICY "Public read access" ON "public"."customs_categories" FOR SELECT USING (true);



CREATE POLICY "Public read access" ON "public"."payment_gateways" FOR SELECT USING (true);



CREATE POLICY "Service role can access all checkout sessions" ON "public"."authenticated_checkout_sessions" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can manage OAuth tokens" ON "public"."oauth_tokens" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can manage PayPal webhook events" ON "public"."paypal_webhook_events" TO "service_role" USING (true);



CREATE POLICY "Service role can manage refunds" ON "public"."paypal_refunds" TO "service_role" USING (true);



CREATE POLICY "Service role can manage webhook logs" ON "public"."webhook_logs" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access" ON "public"."guest_checkout_sessions" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role has full access to payment links" ON "public"."payment_links" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "System can insert payment error logs" ON "public"."payment_error_logs" FOR INSERT WITH CHECK (true);



CREATE POLICY "System can manage emails" ON "public"."email_queue" USING (true);



CREATE POLICY "Users can access own checkout sessions" ON "public"."authenticated_checkout_sessions" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can apply their credit notes" ON "public"."credit_note_applications" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."credit_notes"
  WHERE (("credit_notes"."id" = "credit_note_applications"."credit_note_id") AND ("credit_notes"."customer_id" = "auth"."uid"())))));



CREATE POLICY "Users can create refund requests" ON "public"."refund_requests" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."quotes"
  WHERE (("quotes"."id" = "refund_requests"."quote_id") AND ("quotes"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert payment ledger for own quotes" ON "public"."payment_ledger" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."quotes"
  WHERE (("quotes"."id" = "payment_ledger"."quote_id") AND ("quotes"."user_id" = "auth"."uid"())))) AND (("created_by" = "auth"."uid"()) OR ("created_by" IS NULL))));



CREATE POLICY "Users can insert their own quotes" ON "public"."quotes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own transactions" ON "public"."payment_transactions" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can manage own addresses" ON "public"."user_addresses" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own messages" ON "public"."messages" USING ((("auth"."uid"() = "sender_id") OR ("auth"."uid"() = "recipient_id")));



CREATE POLICY "Users can manage own profile" ON "public"."profiles" USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can manage own quote items" ON "public"."quote_items" USING ((EXISTS ( SELECT 1
   FROM "public"."quotes" "q"
  WHERE (("q"."id" = "quote_items"."quote_id") AND ("q"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can manage own quotes" ON "public"."quotes" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own quotes" ON "public"."quotes" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can use public payment links" ON "public"."payment_links" FOR UPDATE USING (("is_public" = true)) WITH CHECK (("is_public" = true));



CREATE POLICY "Users can view bank accounts for their country" ON "public"."bank_account_details" FOR SELECT USING ((("is_active" = true) AND (("country_code" = ( SELECT "profiles"."country"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))) OR ("is_fallback" = true))));



CREATE POLICY "Users can view delivery options for active routes" ON "public"."shipping_routes" FOR SELECT USING ((("active" = true) AND ("delivery_options" IS NOT NULL) AND ("jsonb_array_length"("delivery_options") > 0)));



CREATE POLICY "Users can view financial transactions" ON "public"."financial_transactions" FOR SELECT USING ((("auth"."uid"() = "created_by") OR "public"."is_admin"()));



CREATE POLICY "Users can view own payment error logs" ON "public"."payment_error_logs" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "Users can view own refunds" ON "public"."paypal_refunds" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view own roles" ON "public"."user_roles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view payment adjustments" ON "public"."payment_adjustments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."quotes"
  WHERE (("quotes"."id" = "payment_adjustments"."quote_id") AND (("quotes"."user_id" = "auth"."uid"()) OR "public"."is_admin"())))));



CREATE POLICY "Users can view payment ledger" ON "public"."payment_ledger" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."quotes"
  WHERE (("quotes"."id" = "payment_ledger"."quote_id") AND (("quotes"."user_id" = "auth"."uid"()) OR "public"."is_admin"())))));



CREATE POLICY "Users can view refund items" ON "public"."refund_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."refund_requests" "rr"
     JOIN "public"."quotes" "q" ON (("rr"."quote_id" = "q"."id")))
  WHERE (("rr"."id" = "refund_items"."refund_request_id") AND (("q"."user_id" = "auth"."uid"()) OR "public"."is_admin"())))));



CREATE POLICY "Users can view route customs tiers" ON "public"."route_customs_tiers" FOR SELECT USING ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "Users can view their credit note applications" ON "public"."credit_note_applications" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."credit_notes"
  WHERE (("credit_notes"."id" = "credit_note_applications"."credit_note_id") AND (("credit_notes"."customer_id" = "auth"."uid"()) OR "public"."is_admin"())))));



CREATE POLICY "Users can view their credit notes" ON "public"."credit_notes" FOR SELECT USING ((("customer_id" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "Users can view their own payment links via function" ON "public"."payment_links" FOR SELECT USING (("quote_id" IN ( SELECT "quotes"."id"
   FROM "public"."quotes"
  WHERE (("quotes"."user_id" = "auth"."uid"()) OR "public"."is_admin"()))));



CREATE POLICY "Users can view their own quote address history" ON "public"."quote_address_history" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."quotes" "q"
  WHERE (("q"."id" = "quote_address_history"."quote_id") AND ("q"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own quote status transitions" ON "public"."status_transitions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."quotes" "q"
  WHERE (("q"."id" = "status_transitions"."quote_id") AND ("q"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own quotes" ON "public"."quotes" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own transactions" ON "public"."payment_transactions" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their payment links" ON "public"."payment_links" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("quote_id" IN ( SELECT "quotes"."id"
   FROM "public"."quotes"
  WHERE ("quotes"."user_id" = "auth"."uid"()))) OR ("is_public" = true)));



CREATE POLICY "Users can view their refund requests" ON "public"."refund_requests" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."quotes"
  WHERE (("quotes"."id" = "refund_requests"."quote_id") AND (("quotes"."user_id" = "auth"."uid"()) OR "public"."is_admin"())))));



CREATE POLICY "Users can view their refunds" ON "public"."gateway_refunds" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."quotes"
  WHERE (("quotes"."id" = "gateway_refunds"."quote_id") AND ("quotes"."user_id" = "auth"."uid"())))) OR "public"."is_admin"()));



CREATE POLICY "View credit note history" ON "public"."credit_note_history" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."credit_notes"
  WHERE (("credit_notes"."id" = "credit_note_history"."credit_note_id") AND (("credit_notes"."customer_id" = "auth"."uid"()) OR "public"."is_admin"())))));



CREATE POLICY "View reconciliation rules" ON "public"."reconciliation_rules" FOR SELECT USING ("public"."is_admin"());



ALTER TABLE "public"."authenticated_checkout_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bank_account_details" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bank_statement_imports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."country_payment_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."country_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."credit_note_applications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."credit_note_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."credit_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customs_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customs_rules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_queue" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."financial_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gateway_refunds" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."guest_checkout_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."oauth_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_adjustments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_alert_thresholds" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_error_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_gateways" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_health_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_ledger" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_reconciliation" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_verification_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."paypal_refund_reasons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."paypal_refunds" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."paypal_webhook_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quote_documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quote_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quote_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quotes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reconciliation_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reconciliation_rules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."refund_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."refund_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rejection_reasons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."route_customs_tiers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shipping_routes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."system_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_addresses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."webhook_logs" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."apply_credit_note"("p_credit_note_id" "uuid", "p_quote_id" "uuid", "p_amount" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."apply_credit_note"("p_credit_note_id" "uuid", "p_quote_id" "uuid", "p_amount" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_credit_note"("p_credit_note_id" "uuid", "p_quote_id" "uuid", "p_amount" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."approve_refund_request"("p_refund_request_id" "uuid", "p_approved_amount" numeric, "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."approve_refund_request"("p_refund_request_id" "uuid", "p_approved_amount" numeric, "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_refund_request"("p_refund_request_id" "uuid", "p_approved_amount" numeric, "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_match_transactions"("p_reconciliation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."auto_match_transactions"("p_reconciliation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_match_transactions"("p_reconciliation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."before_address_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."before_address_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."before_address_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_authenticated_checkout_sessions"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_authenticated_checkout_sessions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_authenticated_checkout_sessions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_guest_sessions"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_guest_sessions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_guest_sessions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_oauth_tokens"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_oauth_tokens"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_oauth_tokens"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_payment_error_logs"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_payment_error_logs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_payment_error_logs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_payment_health_logs"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_payment_health_logs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_payment_health_logs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_payment_verification_logs"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_payment_verification_logs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_payment_verification_logs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_webhook_logs"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_webhook_logs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_webhook_logs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."complete_reconciliation"("p_reconciliation_id" "uuid", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."complete_reconciliation"("p_reconciliation_id" "uuid", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_reconciliation"("p_reconciliation_id" "uuid", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."confirm_payment_from_proof"("p_quote_id" "uuid", "p_amount_paid" numeric, "p_payment_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."confirm_payment_from_proof"("p_quote_id" "uuid", "p_amount_paid" numeric, "p_payment_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."confirm_payment_from_proof"("p_quote_id" "uuid", "p_amount_paid" numeric, "p_payment_status" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_credit_note"("p_customer_id" "uuid", "p_amount" numeric, "p_currency" "text", "p_reason" "text", "p_description" "text", "p_quote_id" "uuid", "p_refund_request_id" "uuid", "p_valid_days" integer, "p_minimum_order_value" numeric, "p_auto_approve" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."create_credit_note"("p_customer_id" "uuid", "p_amount" numeric, "p_currency" "text", "p_reason" "text", "p_description" "text", "p_quote_id" "uuid", "p_refund_request_id" "uuid", "p_valid_days" integer, "p_minimum_order_value" numeric, "p_auto_approve" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_credit_note"("p_customer_id" "uuid", "p_amount" numeric, "p_currency" "text", "p_reason" "text", "p_description" "text", "p_quote_id" "uuid", "p_refund_request_id" "uuid", "p_valid_days" integer, "p_minimum_order_value" numeric, "p_auto_approve" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_payment_ledger_entry_trigger"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_payment_ledger_entry_trigger"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_payment_ledger_entry_trigger"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_payment_with_ledger_entry"("p_quote_id" "uuid", "p_amount" numeric, "p_currency" "text", "p_payment_method" "text", "p_payment_type" "text", "p_reference_number" "text", "p_gateway_code" "text", "p_gateway_transaction_id" "text", "p_notes" "text", "p_user_id" "uuid", "p_message_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_payment_with_ledger_entry"("p_quote_id" "uuid", "p_amount" numeric, "p_currency" "text", "p_payment_method" "text", "p_payment_type" "text", "p_reference_number" "text", "p_gateway_code" "text", "p_gateway_transaction_id" "text", "p_notes" "text", "p_user_id" "uuid", "p_message_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_payment_with_ledger_entry"("p_quote_id" "uuid", "p_amount" numeric, "p_currency" "text", "p_payment_method" "text", "p_payment_type" "text", "p_reference_number" "text", "p_gateway_code" "text", "p_gateway_transaction_id" "text", "p_notes" "text", "p_user_id" "uuid", "p_message_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_refund_request"("p_quote_id" "uuid", "p_refund_type" "text", "p_amount" numeric, "p_currency" "text", "p_reason_code" "text", "p_reason_description" "text", "p_customer_notes" "text", "p_internal_notes" "text", "p_refund_method" "text", "p_payment_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."create_refund_request"("p_quote_id" "uuid", "p_refund_type" "text", "p_amount" numeric, "p_currency" "text", "p_reason_code" "text", "p_reason_description" "text", "p_customer_notes" "text", "p_internal_notes" "text", "p_refund_method" "text", "p_payment_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_refund_request"("p_quote_id" "uuid", "p_refund_type" "text", "p_amount" numeric, "p_currency" "text", "p_reason_code" "text", "p_reason_description" "text", "p_customer_notes" "text", "p_internal_notes" "text", "p_refund_method" "text", "p_payment_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_user_profile"("_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_user_profile"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_user_profile"("_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_user_profile_exists"("_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_user_profile_exists"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_user_profile_exists"("_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."expire_quotes"() TO "anon";
GRANT ALL ON FUNCTION "public"."expire_quotes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."expire_quotes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."force_update_payment"("p_quote_id" "uuid", "new_amount_paid" numeric, "new_payment_status" "text", "payment_method" "text", "reference_number" "text", "notes" "text", "payment_currency" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."force_update_payment"("p_quote_id" "uuid", "new_amount_paid" numeric, "new_payment_status" "text", "payment_method" "text", "reference_number" "text", "notes" "text", "payment_currency" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."force_update_payment"("p_quote_id" "uuid", "new_amount_paid" numeric, "new_payment_status" "text", "payment_method" "text", "reference_number" "text", "notes" "text", "payment_currency" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_credit_note_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_credit_note_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_credit_note_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_display_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_display_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_display_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_payment_link_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_payment_link_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_payment_link_code"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_share_token"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_share_token"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_share_token"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_active_payment_link_for_quote"("quote_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_active_payment_link_for_quote"("quote_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_active_payment_link_for_quote"("quote_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_all_user_emails"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_all_user_emails"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_all_user_emails"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_available_credit_notes"("p_customer_id" "uuid", "p_min_amount" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."get_available_credit_notes"("p_customer_id" "uuid", "p_min_amount" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_available_credit_notes"("p_customer_id" "uuid", "p_min_amount" numeric) TO "service_role";



GRANT ALL ON TABLE "public"."bank_account_details" TO "anon";
GRANT ALL ON TABLE "public"."bank_account_details" TO "authenticated";
GRANT ALL ON TABLE "public"."bank_account_details" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_bank_account_for_order"("p_country_code" "text", "p_destination_country" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_bank_account_for_order"("p_country_code" "text", "p_destination_country" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_bank_account_for_order"("p_country_code" "text", "p_destination_country" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_bank_details_for_email"("payment_currency" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_bank_details_for_email"("payment_currency" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_bank_details_for_email"("payment_currency" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_currency_conversion_metrics"("start_date" timestamp with time zone, "end_date" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_currency_conversion_metrics"("start_date" timestamp with time zone, "end_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_currency_conversion_metrics"("start_date" timestamp with time zone, "end_date" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_currency_mismatches"("start_date" timestamp with time zone, "end_date" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_currency_mismatches"("start_date" timestamp with time zone, "end_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_currency_mismatches"("start_date" timestamp with time zone, "end_date" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_currency_statistics"("start_date" timestamp with time zone, "end_date" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_currency_statistics"("start_date" timestamp with time zone, "end_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_currency_statistics"("start_date" timestamp with time zone, "end_date" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_exchange_rate_health"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_exchange_rate_health"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_exchange_rate_health"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_orders_with_payment_proofs"("status_filter" "text", "limit_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_orders_with_payment_proofs"("status_filter" "text", "limit_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_orders_with_payment_proofs"("status_filter" "text", "limit_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_payment_history"("p_quote_id" "uuid", "p_customer_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_payment_history"("p_quote_id" "uuid", "p_customer_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_payment_history"("p_quote_id" "uuid", "p_customer_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_payment_proof_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_payment_proof_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_payment_proof_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_shipping_cost"("p_origin_country" character varying, "p_destination_country" character varying, "p_weight" numeric, "p_price" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."get_shipping_cost"("p_origin_country" character varying, "p_destination_country" character varying, "p_weight" numeric, "p_price" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_shipping_cost"("p_origin_country" character varying, "p_destination_country" character varying, "p_weight" numeric, "p_price" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_suspicious_payment_amounts"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "tolerance" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."get_suspicious_payment_amounts"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "tolerance" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_suspicious_payment_amounts"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "tolerance" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_transaction_refund_eligibility"("transaction_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_transaction_refund_eligibility"("transaction_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_transaction_refund_eligibility"("transaction_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_bank_accounts"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_bank_accounts"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_bank_accounts"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_default_address"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_default_address"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_default_address"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."has_any_role"("roles" "public"."app_role"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."has_any_role"("roles" "public"."app_role"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_any_role"("roles" "public"."app_role"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "anon";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_authenticated"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_authenticated"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_authenticated"() TO "service_role";



GRANT ALL ON FUNCTION "public"."lock_address_after_payment"("quote_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."lock_address_after_payment"("quote_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."lock_address_after_payment"("quote_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_address_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_address_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_address_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_quote_status_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_quote_status_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_quote_status_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."post_financial_transaction"("p_transaction_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."post_financial_transaction"("p_transaction_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."post_financial_transaction"("p_transaction_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."process_payment_webhook_atomic"("p_quote_ids" "text"[], "p_payment_status" "text", "p_payment_data" "jsonb", "p_guest_session_token" "text", "p_guest_session_data" "jsonb", "p_create_order" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."process_payment_webhook_atomic"("p_quote_ids" "text"[], "p_payment_status" "text", "p_payment_data" "jsonb", "p_guest_session_token" "text", "p_guest_session_data" "jsonb", "p_create_order" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_payment_webhook_atomic"("p_quote_ids" "text"[], "p_payment_status" "text", "p_payment_data" "jsonb", "p_guest_session_token" "text", "p_guest_session_data" "jsonb", "p_create_order" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."process_refund_atomic"("p_quote_id" "uuid", "p_refund_amount" numeric, "p_refund_data" "jsonb", "p_gateway_response" "jsonb", "p_processed_by" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."process_refund_atomic"("p_quote_id" "uuid", "p_refund_amount" numeric, "p_refund_data" "jsonb", "p_gateway_response" "jsonb", "p_processed_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_refund_atomic"("p_quote_id" "uuid", "p_refund_amount" numeric, "p_refund_data" "jsonb", "p_gateway_response" "jsonb", "p_processed_by" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."process_refund_item"("p_refund_item_id" "uuid", "p_gateway_refund_id" "text", "p_gateway_response" "jsonb", "p_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."process_refund_item"("p_refund_item_id" "uuid", "p_gateway_refund_id" "text", "p_gateway_response" "jsonb", "p_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_refund_item"("p_refund_item_id" "uuid", "p_gateway_refund_id" "text", "p_gateway_response" "jsonb", "p_status" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."record_payment_with_ledger_and_triggers"("p_quote_id" "uuid", "p_amount" numeric, "p_currency" "text", "p_payment_method" "text", "p_transaction_reference" "text", "p_notes" "text", "p_recorded_by" "uuid", "p_payment_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."record_payment_with_ledger_and_triggers"("p_quote_id" "uuid", "p_amount" numeric, "p_currency" "text", "p_payment_method" "text", "p_transaction_reference" "text", "p_notes" "text", "p_recorded_by" "uuid", "p_payment_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_payment_with_ledger_and_triggers"("p_quote_id" "uuid", "p_amount" numeric, "p_currency" "text", "p_payment_method" "text", "p_transaction_reference" "text", "p_notes" "text", "p_recorded_by" "uuid", "p_payment_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."record_paypal_payment_to_ledger"("p_quote_id" "uuid", "p_transaction_id" "uuid", "p_amount" numeric, "p_currency" "text", "p_order_id" "text", "p_capture_id" "text", "p_payer_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."record_paypal_payment_to_ledger"("p_quote_id" "uuid", "p_transaction_id" "uuid", "p_amount" numeric, "p_currency" "text", "p_order_id" "text", "p_capture_id" "text", "p_payer_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_paypal_payment_to_ledger"("p_quote_id" "uuid", "p_transaction_id" "uuid", "p_amount" numeric, "p_currency" "text", "p_order_id" "text", "p_capture_id" "text", "p_payer_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."reverse_financial_transaction"("p_transaction_id" "uuid", "p_user_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."reverse_financial_transaction"("p_transaction_id" "uuid", "p_user_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reverse_financial_transaction"("p_transaction_id" "uuid", "p_user_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."send_welcome_email"() TO "anon";
GRANT ALL ON FUNCTION "public"."send_welcome_email"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."send_welcome_email"() TO "service_role";
GRANT ALL ON FUNCTION "public"."send_welcome_email"() TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."set_quote_expiration"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_quote_expiration"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_quote_expiration"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_share_token"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_share_token"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_share_token"() TO "service_role";



GRANT ALL ON FUNCTION "public"."start_reconciliation_session"("p_payment_method" "text", "p_gateway_code" "text", "p_statement_date" "date", "p_statement_start_date" "date", "p_statement_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."start_reconciliation_session"("p_payment_method" "text", "p_gateway_code" "text", "p_statement_date" "date", "p_statement_start_date" "date", "p_statement_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."start_reconciliation_session"("p_payment_method" "text", "p_gateway_code" "text", "p_statement_date" "date", "p_statement_start_date" "date", "p_statement_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_payment_record_to_ledger"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_payment_record_to_ledger"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_payment_record_to_ledger"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_quote_payment_amounts"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_quote_payment_amounts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_quote_payment_amounts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."test_payment_update_direct"("quote_id" "uuid", "new_amount_paid" numeric, "new_payment_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."test_payment_update_direct"("quote_id" "uuid", "new_amount_paid" numeric, "new_payment_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_payment_update_direct"("quote_id" "uuid", "new_amount_paid" numeric, "new_payment_status" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_paypal_webhook_events_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_paypal_webhook_events_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_paypal_webhook_events_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_update_payment_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_update_payment_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_update_payment_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_authenticated_checkout_sessions_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_authenticated_checkout_sessions_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_authenticated_checkout_sessions_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_country_payment_preferences_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_country_payment_preferences_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_country_payment_preferences_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_guest_checkout_sessions_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_guest_checkout_sessions_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_guest_checkout_sessions_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_payment_links_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_payment_links_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_payment_links_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_payment_refund_totals"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_payment_refund_totals"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_payment_refund_totals"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_payment_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_payment_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_payment_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_paypal_refunds_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_paypal_refunds_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_paypal_refunds_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_quote_documents_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_quote_documents_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_quote_documents_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_route_customs_tiers_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_route_customs_tiers_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_route_customs_tiers_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_delivery_options"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_delivery_options"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_delivery_options"() TO "service_role";



GRANT ALL ON TABLE "public"."authenticated_checkout_sessions" TO "anon";
GRANT ALL ON TABLE "public"."authenticated_checkout_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."authenticated_checkout_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."bank_statement_imports" TO "anon";
GRANT ALL ON TABLE "public"."bank_statement_imports" TO "authenticated";
GRANT ALL ON TABLE "public"."bank_statement_imports" TO "service_role";



GRANT ALL ON TABLE "public"."chart_of_accounts" TO "anon";
GRANT ALL ON TABLE "public"."chart_of_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."chart_of_accounts" TO "service_role";



GRANT ALL ON TABLE "public"."country_payment_preferences" TO "anon";
GRANT ALL ON TABLE "public"."country_payment_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."country_payment_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."country_settings" TO "anon";
GRANT ALL ON TABLE "public"."country_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."country_settings" TO "service_role";



GRANT ALL ON TABLE "public"."credit_note_applications" TO "anon";
GRANT ALL ON TABLE "public"."credit_note_applications" TO "authenticated";
GRANT ALL ON TABLE "public"."credit_note_applications" TO "service_role";



GRANT ALL ON TABLE "public"."credit_note_history" TO "anon";
GRANT ALL ON TABLE "public"."credit_note_history" TO "authenticated";
GRANT ALL ON TABLE "public"."credit_note_history" TO "service_role";



GRANT ALL ON SEQUENCE "public"."credit_note_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."credit_note_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."credit_note_number_seq" TO "service_role";



GRANT ALL ON TABLE "public"."credit_notes" TO "anon";
GRANT ALL ON TABLE "public"."credit_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."credit_notes" TO "service_role";



GRANT ALL ON TABLE "public"."customs_categories" TO "anon";
GRANT ALL ON TABLE "public"."customs_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."customs_categories" TO "service_role";



GRANT ALL ON TABLE "public"."customs_rules" TO "anon";
GRANT ALL ON TABLE "public"."customs_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."customs_rules" TO "service_role";



GRANT ALL ON TABLE "public"."email_queue" TO "anon";
GRANT ALL ON TABLE "public"."email_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."email_queue" TO "service_role";



GRANT ALL ON TABLE "public"."email_settings" TO "anon";
GRANT ALL ON TABLE "public"."email_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."email_settings" TO "service_role";



GRANT ALL ON TABLE "public"."email_templates" TO "anon";
GRANT ALL ON TABLE "public"."email_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."email_templates" TO "service_role";



GRANT ALL ON TABLE "public"."financial_transactions" TO "anon";
GRANT ALL ON TABLE "public"."financial_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."financial_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."gateway_refunds" TO "anon";
GRANT ALL ON TABLE "public"."gateway_refunds" TO "authenticated";
GRANT ALL ON TABLE "public"."gateway_refunds" TO "service_role";



GRANT ALL ON TABLE "public"."guest_checkout_sessions" TO "anon";
GRANT ALL ON TABLE "public"."guest_checkout_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."guest_checkout_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."manual_analysis_tasks" TO "anon";
GRANT ALL ON TABLE "public"."manual_analysis_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."manual_analysis_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."oauth_tokens" TO "anon";
GRANT ALL ON TABLE "public"."oauth_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."oauth_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."payment_adjustments" TO "anon";
GRANT ALL ON TABLE "public"."payment_adjustments" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_adjustments" TO "service_role";



GRANT ALL ON TABLE "public"."payment_alert_thresholds" TO "anon";
GRANT ALL ON TABLE "public"."payment_alert_thresholds" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_alert_thresholds" TO "service_role";



GRANT ALL ON TABLE "public"."payment_error_logs" TO "anon";
GRANT ALL ON TABLE "public"."payment_error_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_error_logs" TO "service_role";



GRANT ALL ON TABLE "public"."payment_error_analytics" TO "anon";
GRANT ALL ON TABLE "public"."payment_error_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_error_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."payment_gateways" TO "anon";
GRANT ALL ON TABLE "public"."payment_gateways" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_gateways" TO "service_role";



GRANT ALL ON TABLE "public"."payment_health_logs" TO "anon";
GRANT ALL ON TABLE "public"."payment_health_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_health_logs" TO "service_role";



GRANT ALL ON TABLE "public"."payment_health_dashboard" TO "anon";
GRANT ALL ON TABLE "public"."payment_health_dashboard" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_health_dashboard" TO "service_role";



GRANT ALL ON TABLE "public"."payment_ledger" TO "anon";
GRANT ALL ON TABLE "public"."payment_ledger" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_ledger" TO "service_role";



GRANT ALL ON TABLE "public"."payment_links" TO "anon";
GRANT ALL ON TABLE "public"."payment_links" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_links" TO "service_role";



GRANT ALL ON TABLE "public"."payment_links_summary" TO "anon";
GRANT ALL ON TABLE "public"."payment_links_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_links_summary" TO "service_role";



GRANT ALL ON TABLE "public"."quotes" TO "anon";
GRANT ALL ON TABLE "public"."quotes" TO "authenticated";
GRANT ALL ON TABLE "public"."quotes" TO "service_role";



GRANT ALL ON TABLE "public"."payment_proof_verification_summary" TO "anon";
GRANT ALL ON TABLE "public"."payment_proof_verification_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_proof_verification_summary" TO "service_role";



GRANT ALL ON TABLE "public"."payment_reconciliation" TO "anon";
GRANT ALL ON TABLE "public"."payment_reconciliation" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_reconciliation" TO "service_role";



GRANT ALL ON TABLE "public"."payment_reminders" TO "anon";
GRANT ALL ON TABLE "public"."payment_reminders" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_reminders" TO "service_role";



GRANT ALL ON TABLE "public"."payment_transactions" TO "anon";
GRANT ALL ON TABLE "public"."payment_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."payment_verification_logs" TO "anon";
GRANT ALL ON TABLE "public"."payment_verification_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_verification_logs" TO "service_role";



GRANT ALL ON TABLE "public"."paypal_refund_reasons" TO "anon";
GRANT ALL ON TABLE "public"."paypal_refund_reasons" TO "authenticated";
GRANT ALL ON TABLE "public"."paypal_refund_reasons" TO "service_role";



GRANT ALL ON TABLE "public"."paypal_refunds" TO "anon";
GRANT ALL ON TABLE "public"."paypal_refunds" TO "authenticated";
GRANT ALL ON TABLE "public"."paypal_refunds" TO "service_role";



GRANT ALL ON TABLE "public"."paypal_refund_summary" TO "anon";
GRANT ALL ON TABLE "public"."paypal_refund_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."paypal_refund_summary" TO "service_role";



GRANT ALL ON TABLE "public"."paypal_webhook_events" TO "anon";
GRANT ALL ON TABLE "public"."paypal_webhook_events" TO "authenticated";
GRANT ALL ON TABLE "public"."paypal_webhook_events" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."quote_address_history" TO "anon";
GRANT ALL ON TABLE "public"."quote_address_history" TO "authenticated";
GRANT ALL ON TABLE "public"."quote_address_history" TO "service_role";



GRANT ALL ON SEQUENCE "public"."quote_address_history_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."quote_address_history_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."quote_address_history_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."quote_documents" TO "anon";
GRANT ALL ON TABLE "public"."quote_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."quote_documents" TO "service_role";



GRANT ALL ON TABLE "public"."quote_items" TO "anon";
GRANT ALL ON TABLE "public"."quote_items" TO "authenticated";
GRANT ALL ON TABLE "public"."quote_items" TO "service_role";



GRANT ALL ON TABLE "public"."quote_statuses" TO "anon";
GRANT ALL ON TABLE "public"."quote_statuses" TO "authenticated";
GRANT ALL ON TABLE "public"."quote_statuses" TO "service_role";



GRANT ALL ON SEQUENCE "public"."quote_statuses_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."quote_statuses_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."quote_statuses_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."quote_templates" TO "anon";
GRANT ALL ON TABLE "public"."quote_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."quote_templates" TO "service_role";



GRANT ALL ON TABLE "public"."reconciliation_items" TO "anon";
GRANT ALL ON TABLE "public"."reconciliation_items" TO "authenticated";
GRANT ALL ON TABLE "public"."reconciliation_items" TO "service_role";



GRANT ALL ON TABLE "public"."reconciliation_rules" TO "anon";
GRANT ALL ON TABLE "public"."reconciliation_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."reconciliation_rules" TO "service_role";



GRANT ALL ON TABLE "public"."refund_items" TO "anon";
GRANT ALL ON TABLE "public"."refund_items" TO "authenticated";
GRANT ALL ON TABLE "public"."refund_items" TO "service_role";



GRANT ALL ON TABLE "public"."refund_requests" TO "anon";
GRANT ALL ON TABLE "public"."refund_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."refund_requests" TO "service_role";



GRANT ALL ON TABLE "public"."rejection_reasons" TO "anon";
GRANT ALL ON TABLE "public"."rejection_reasons" TO "authenticated";
GRANT ALL ON TABLE "public"."rejection_reasons" TO "service_role";



GRANT ALL ON TABLE "public"."route_customs_tiers" TO "anon";
GRANT ALL ON TABLE "public"."route_customs_tiers" TO "authenticated";
GRANT ALL ON TABLE "public"."route_customs_tiers" TO "service_role";



GRANT ALL ON TABLE "public"."shipping_routes" TO "anon";
GRANT ALL ON TABLE "public"."shipping_routes" TO "authenticated";
GRANT ALL ON TABLE "public"."shipping_routes" TO "service_role";



GRANT ALL ON SEQUENCE "public"."shipping_routes_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."shipping_routes_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."shipping_routes_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."status_transitions" TO "anon";
GRANT ALL ON TABLE "public"."status_transitions" TO "authenticated";
GRANT ALL ON TABLE "public"."status_transitions" TO "service_role";



GRANT ALL ON TABLE "public"."system_settings" TO "anon";
GRANT ALL ON TABLE "public"."system_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."system_settings" TO "service_role";



GRANT ALL ON TABLE "public"."user_addresses" TO "anon";
GRANT ALL ON TABLE "public"."user_addresses" TO "authenticated";
GRANT ALL ON TABLE "public"."user_addresses" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."webhook_logs" TO "anon";
GRANT ALL ON TABLE "public"."webhook_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."webhook_logs" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






RESET ALL;
