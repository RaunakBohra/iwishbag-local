-- ============================================================================
-- IWISHBAG COMPLETE DATABASE SCHEMA - BASELINE MIGRATION
-- Generated: 2025-07-28
-- Purpose: Complete working database state as single migration file
-- 
-- This replaces all previous individual migration files and represents
-- the current working state of the iwishBag platform database.
-- 
-- INCLUDES:
-- - All tables, indexes, constraints  
-- - All functions, triggers, procedures
-- - All RLS policies and security settings
-- - All seed data (countries, HSN codes, configurations)
-- - Complete package forwarding system
-- - MFA and authentication system
-- - Quote calculation and tax system
-- - ML weight estimation tables
-- - Comprehensive audit and logging
-- ============================================================================

-- Set required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "ltree";
--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

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

--
-- Name: _realtime; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA _realtime;


ALTER SCHEMA _realtime OWNER TO postgres;

--
-- Name: pg_net; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_net; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_net IS 'Async HTTP';


--
-- Name: pgbouncer; Type: SCHEMA; Schema: -; Owner: pgbouncer
--

CREATE SCHEMA pgbouncer;


ALTER SCHEMA pgbouncer OWNER TO pgbouncer;

--
-- Name: supabase_migrations; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA supabase_migrations;


ALTER SCHEMA supabase_migrations OWNER TO postgres;

--
-- Name: pg_graphql; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_graphql WITH SCHEMA graphql;


--
-- Name: EXTENSION pg_graphql; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_graphql IS 'pg_graphql: GraphQL support';


--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: supabase_vault; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;


--
-- Name: EXTENSION supabase_vault; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION supabase_vault IS 'Supabase Vault Extension';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: app_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'user',
    'moderator'
);


ALTER TYPE public.app_role OWNER TO postgres;

--
-- Name: quote_approval_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.quote_approval_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);


ALTER TYPE public.quote_approval_status OWNER TO postgres;

--
-- Name: quote_priority; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.quote_priority AS ENUM (
    'low',
    'normal',
    'high',
    'urgent'
);


ALTER TYPE public.quote_priority OWNER TO postgres;

--
-- Name: get_auth(text); Type: FUNCTION; Schema: pgbouncer; Owner: supabase_admin
--

CREATE FUNCTION pgbouncer.get_auth(p_usename text) RETURNS TABLE(username text, password text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $_$
begin
    raise debug 'PgBouncer auth request: %', p_usename;

    return query
    select 
        rolname::text, 
        case when rolvaliduntil < now() 
            then null 
            else rolpassword::text 
        end 
    from pg_authid 
    where rolname=$1 and rolcanlogin;
end;
$_$;


ALTER FUNCTION pgbouncer.get_auth(p_usename text) OWNER TO supabase_admin;

--
-- Name: add_support_interaction(uuid, uuid, character varying, jsonb, boolean); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.add_support_interaction(p_support_id uuid, p_user_id uuid, p_interaction_type character varying, p_content jsonb, p_is_internal boolean DEFAULT false) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    interaction_id UUID;
BEGIN
    INSERT INTO support_interactions (
        support_id,
        user_id,
        interaction_type,
        content,
        is_internal,
        metadata
    ) VALUES (
        p_support_id,
        p_user_id,
        p_interaction_type,
        p_content,
        p_is_internal,
        jsonb_build_object(
            'timestamp', now()
        )
    ) RETURNING id INTO interaction_id;
    
    -- Update the support system's updated_at timestamp
    UPDATE support_system 
    SET updated_at = now() 
    WHERE id = p_support_id;
    
    RETURN interaction_id;
END;
$$;


ALTER FUNCTION public.add_support_interaction(p_support_id uuid, p_user_id uuid, p_interaction_type character varying, p_content jsonb, p_is_internal boolean) OWNER TO postgres;

--
-- Name: analyze_tax_method_performance(text, text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.analyze_tax_method_performance(p_origin_country text, p_destination_country text, p_time_range_days integer DEFAULT 30) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  result JSONB;
  total_quotes INTEGER;
  method_stats JSONB;
BEGIN
  -- Initialize result structure
  result := '{}'::JSONB;
  
  -- Get total quotes for the route in time range
  SELECT COUNT(*)
  INTO total_quotes
  FROM quotes
  WHERE origin_country = p_origin_country
    AND destination_country = p_destination_country
    AND created_at >= NOW() - INTERVAL '1 day' * p_time_range_days;
  
  result := jsonb_set(result, '{total_quotes}', to_jsonb(total_quotes));
  
  -- Analyze each calculation method
  WITH method_analysis AS (
    SELECT 
      COALESCE(calculation_method_preference, 'auto') as method,
      COUNT(*) as usage_count,
      AVG(CASE WHEN status IN ('approved', 'paid', 'ordered', 'shipped', 'completed') THEN 1.0 ELSE 0.0 END) as success_rate,
      AVG(CASE WHEN status = 'approved' THEN 1.0 ELSE 0.0 END) as approval_rate,
      AVG(CASE 
        WHEN operational_data ? 'admin_overrides' 
        THEN jsonb_array_length(operational_data->'admin_overrides') 
        ELSE 0 
      END) as avg_overrides,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY final_total) as median_total,
      STDDEV(final_total) as cost_variance
    FROM quotes
    WHERE origin_country = p_origin_country
      AND destination_country = p_destination_country
      AND created_at >= NOW() - INTERVAL '1 day' * p_time_range_days
    GROUP BY COALESCE(calculation_method_preference, 'auto')
  )
  SELECT jsonb_object_agg(
    method,
    jsonb_build_object(
      'usage_count', usage_count,
      'success_rate', ROUND(success_rate::NUMERIC, 3),
      'approval_rate', ROUND(approval_rate::NUMERIC, 3),
      'override_rate', ROUND((avg_overrides / GREATEST(usage_count, 1))::NUMERIC, 3),
      'accuracy', ROUND((success_rate * 0.7 + approval_rate * 0.3)::NUMERIC, 3),
      'cost_diff', ROUND(((median_total - (SELECT AVG(final_total) FROM quotes WHERE origin_country = p_origin_country AND destination_country = p_destination_country AND created_at >= NOW() - INTERVAL '1 day' * p_time_range_days)) / GREATEST((SELECT AVG(final_total) FROM quotes WHERE origin_country = p_origin_country AND destination_country = p_destination_country AND created_at >= NOW() - INTERVAL '1 day' * p_time_range_days), 1) * 100)::NUMERIC, 2)
    )
  )
  INTO method_stats
  FROM method_analysis;
  
  -- Add method stats to result
  result := result || COALESCE(method_stats, '{}'::JSONB);
  
  -- Calculate overall metrics
  WITH overall_metrics AS (
    SELECT 
      AVG(CASE WHEN status IN ('approved', 'paid', 'ordered', 'shipped', 'completed') THEN 1.0 ELSE 0.0 END) as average_accuracy,
      jsonb_object_agg(
        COALESCE(calculation_method_preference, 'auto'),
        COUNT(*)
      ) as method_distribution,
      SUM(CASE 
        WHEN calculation_method_preference = 'hsn_only' AND final_total < (SELECT AVG(final_total) FROM quotes WHERE origin_country = p_origin_country AND destination_country = p_destination_country AND created_at >= NOW() - INTERVAL '1 day' * p_time_range_days)
        THEN (SELECT AVG(final_total) FROM quotes WHERE origin_country = p_origin_country AND destination_country = p_destination_country AND created_at >= NOW() - INTERVAL '1 day' * p_time_range_days) - final_total
        ELSE 0
      END) as cost_savings_potential
    FROM quotes
    WHERE origin_country = p_origin_country
      AND destination_country = p_destination_country
      AND created_at >= NOW() - INTERVAL '1 day' * p_time_range_days
  )
  SELECT 
    jsonb_set(
      jsonb_set(
        jsonb_set(result, '{average_accuracy}', to_jsonb(ROUND(average_accuracy::NUMERIC, 3))),
        '{method_distribution}', method_distribution
      ),
      '{cost_savings_potential}', to_jsonb(ROUND(cost_savings_potential::NUMERIC, 2))
    )
  INTO result
  FROM overall_metrics;
  
  RETURN COALESCE(result, '{}'::JSONB);
  
EXCEPTION
  WHEN OTHERS THEN
    -- Return empty result on error
    RETURN jsonb_build_object(
      'error', SQLERRM,
      'total_quotes', 0,
      'average_accuracy', 0,
      'method_distribution', '{}',
      'cost_savings_potential', 0
    );
END;
$$;


ALTER FUNCTION public.analyze_tax_method_performance(p_origin_country text, p_destination_country text, p_time_range_days integer) OWNER TO postgres;

--
-- Name: FUNCTION analyze_tax_method_performance(p_origin_country text, p_destination_country text, p_time_range_days integer); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.analyze_tax_method_performance(p_origin_country text, p_destination_country text, p_time_range_days integer) IS 'Analyzes historical performance of tax calculation methods for route optimization';


--
-- Name: apply_credit_note(uuid, uuid, numeric); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.apply_credit_note(p_credit_note_id uuid, p_quote_id uuid, p_amount numeric DEFAULT NULL::numeric) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION public.apply_credit_note(p_credit_note_id uuid, p_quote_id uuid, p_amount numeric) OWNER TO postgres;

--
-- Name: approve_refund_request(uuid, numeric, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.approve_refund_request(p_refund_request_id uuid, p_approved_amount numeric DEFAULT NULL::numeric, p_notes text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION public.approve_refund_request(p_refund_request_id uuid, p_approved_amount numeric, p_notes text) OWNER TO postgres;

--
-- Name: auto_match_transactions(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.auto_match_transactions(p_reconciliation_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION public.auto_match_transactions(p_reconciliation_id uuid) OWNER TO postgres;

--
-- Name: before_address_insert(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.before_address_insert() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Ensure the user profile exists
  PERFORM ensure_user_profile_exists(NEW.user_id);
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.before_address_insert() OWNER TO postgres;

--
-- Name: bulk_update_tax_methods(text[], text, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.bulk_update_tax_methods(p_quote_ids text[], p_admin_id text, p_calculation_method text, p_change_reason text DEFAULT 'Bulk update via admin panel'::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  updated_count INTEGER := 0;
  failed_count INTEGER := 0;
  quote_id TEXT;
  result JSONB;
BEGIN
  -- Validate admin permissions
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id::TEXT = p_admin_id AND role = 'admin'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient permissions - admin role required',
      'updated', 0,
      'failed', array_length(p_quote_ids, 1)
    );
  END IF;
  
  -- Process each quote
  FOREACH quote_id IN ARRAY p_quote_ids
  LOOP
    BEGIN
      -- Update the quote
      UPDATE quotes 
      SET 
        calculation_method_preference = p_calculation_method,
        updated_at = NOW()
      WHERE id = quote_id::UUID;
      
      -- Log the change
      INSERT INTO admin_activity_log (
        admin_id,
        action_type,
        target_type,
        target_id,
        action_details,
        created_at
      ) VALUES (
        p_admin_id::UUID,
        'bulk_tax_method_update',
        'quote',
        quote_id::UUID,
        jsonb_build_object(
          'calculation_method', p_calculation_method,
          'change_reason', p_change_reason,
          'bulk_operation', true,
          'total_quotes', array_length(p_quote_ids, 1)
        ),
        NOW()
      );
      
      updated_count := updated_count + 1;
      
    EXCEPTION
      WHEN OTHERS THEN
        failed_count := failed_count + 1;
        -- Log the failure
        INSERT INTO admin_activity_log (
          admin_id,
          action_type,
          target_type,
          target_id,
          action_details,
          created_at
        ) VALUES (
          p_admin_id::UUID,
          'bulk_tax_method_update_failed',
          'quote',
          quote_id::UUID,
          jsonb_build_object(
            'error', SQLERRM,
            'calculation_method', p_calculation_method,
            'bulk_operation', true
          ),
          NOW()
        );
    END;
  END LOOP;
  
  -- Return summary
  result := jsonb_build_object(
    'success', failed_count = 0,
    'updated', updated_count,
    'failed', failed_count,
    'total_processed', array_length(p_quote_ids, 1),
    'method_applied', p_calculation_method,
    'timestamp', NOW()
  );
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'updated', updated_count,
      'failed', failed_count + (array_length(p_quote_ids, 1) - updated_count - failed_count)
    );
END;
$$;


ALTER FUNCTION public.bulk_update_tax_methods(p_quote_ids text[], p_admin_id text, p_calculation_method text, p_change_reason text) OWNER TO postgres;

--
-- Name: FUNCTION bulk_update_tax_methods(p_quote_ids text[], p_admin_id text, p_calculation_method text, p_change_reason text); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.bulk_update_tax_methods(p_quote_ids text[], p_admin_id text, p_calculation_method text, p_change_reason text) IS 'Updates calculation method for multiple quotes with admin audit logging';


--
-- Name: calculate_storage_fees(uuid, date); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.calculate_storage_fees(package_id uuid, end_date date DEFAULT CURRENT_DATE) RETURNS numeric
    LANGUAGE plpgsql
    AS $$
DECLARE
  pkg RECORD;
  storage_start DATE;
  days_chargeable INTEGER;
  daily_rate DECIMAL := 1.00;
BEGIN
  SELECT * INTO pkg FROM received_packages WHERE id = package_id;
  
  IF pkg IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Storage is free for first 30 days
  storage_start := DATE(pkg.storage_fee_exempt_until);
  
  IF end_date <= storage_start THEN
    RETURN 0;
  END IF;
  
  days_chargeable := end_date - storage_start;
  RETURN days_chargeable * daily_rate;
END;
$$;


ALTER FUNCTION public.calculate_storage_fees(package_id uuid, end_date date) OWNER TO postgres;

--
-- Name: cleanup_expired_authenticated_checkout_sessions(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cleanup_expired_authenticated_checkout_sessions() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION public.cleanup_expired_authenticated_checkout_sessions() OWNER TO postgres;

--
-- Name: cleanup_expired_guest_sessions(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cleanup_expired_guest_sessions() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION public.cleanup_expired_guest_sessions() OWNER TO postgres;

--
-- Name: cleanup_expired_mfa_sessions(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cleanup_expired_mfa_sessions() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    DELETE FROM mfa_sessions
    WHERE expires_at < NOW();
END;
$$;


ALTER FUNCTION public.cleanup_expired_mfa_sessions() OWNER TO postgres;

--
-- Name: cleanup_expired_notifications(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cleanup_expired_notifications() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Delete notifications that have expired more than 30 days ago
  DELETE FROM notifications 
  WHERE expires_at IS NOT NULL 
    AND expires_at < NOW() - INTERVAL '30 days';
  
  -- Log cleanup action (optional)
  RAISE NOTICE 'Cleaned up expired notifications older than 30 days';
END;
$$;


ALTER FUNCTION public.cleanup_expired_notifications() OWNER TO postgres;

--
-- Name: cleanup_expired_oauth_tokens(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cleanup_expired_oauth_tokens() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    UPDATE public.oauth_tokens 
    SET is_active = false 
    WHERE expires_at < now() AND is_active = true;
END;
$$;


ALTER FUNCTION public.cleanup_expired_oauth_tokens() OWNER TO postgres;

--
-- Name: cleanup_old_activity_data(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cleanup_old_activity_data() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Delete activity data older than 6 months
  DELETE FROM user_activity_analytics 
  WHERE created_at < NOW() - INTERVAL '6 months';
  
  -- Log cleanup action
  RAISE NOTICE 'Cleaned up activity data older than 6 months';
END;
$$;


ALTER FUNCTION public.cleanup_old_activity_data() OWNER TO postgres;

--
-- Name: cleanup_old_payment_error_logs(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cleanup_old_payment_error_logs() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    DELETE FROM public.payment_error_logs 
    WHERE created_at < NOW() - INTERVAL '1 year';
END;
$$;


ALTER FUNCTION public.cleanup_old_payment_error_logs() OWNER TO postgres;

--
-- Name: cleanup_old_payment_health_logs(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cleanup_old_payment_health_logs() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    DELETE FROM public.payment_health_logs 
    WHERE created_at < NOW() - INTERVAL '6 months';
END;
$$;


ALTER FUNCTION public.cleanup_old_payment_health_logs() OWNER TO postgres;

--
-- Name: cleanup_old_payment_verification_logs(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cleanup_old_payment_verification_logs() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    DELETE FROM public.payment_verification_logs 
    WHERE created_at < NOW() - INTERVAL '180 days';
END;
$$;


ALTER FUNCTION public.cleanup_old_payment_verification_logs() OWNER TO postgres;

--
-- Name: cleanup_old_webhook_logs(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cleanup_old_webhook_logs() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    DELETE FROM public.webhook_logs 
    WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;


ALTER FUNCTION public.cleanup_old_webhook_logs() OWNER TO postgres;

--
-- Name: complete_reconciliation(uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.complete_reconciliation(p_reconciliation_id uuid, p_notes text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION public.complete_reconciliation(p_reconciliation_id uuid, p_notes text) OWNER TO postgres;

--
-- Name: confirm_backup_codes_saved(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.confirm_backup_codes_saved() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Not authenticated'
        );
    END IF;
    
    -- Check if user has MFA configured
    IF NOT EXISTS (
        SELECT 1 FROM mfa_configurations 
        WHERE user_id = v_user_id AND totp_enabled = true
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'MFA not configured'
        );
    END IF;
    
    -- Log that backup codes were acknowledged
    INSERT INTO mfa_activity_log (user_id, activity_type, ip_address, success)
    VALUES (v_user_id, 'backup_codes_acknowledged', inet_client_addr(), true);
    
    -- You could also update a field in mfa_configurations if needed
    UPDATE mfa_configurations
    SET updated_at = CURRENT_TIMESTAMP
    WHERE user_id = v_user_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Backup codes acknowledged'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;


ALTER FUNCTION public.confirm_backup_codes_saved() OWNER TO postgres;

--
-- Name: confirm_payment_from_proof(uuid, numeric, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.confirm_payment_from_proof(p_quote_id uuid, p_amount_paid numeric, p_payment_status text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION public.confirm_payment_from_proof(p_quote_id uuid, p_amount_paid numeric, p_payment_status text) OWNER TO postgres;

--
-- Name: FUNCTION confirm_payment_from_proof(p_quote_id uuid, p_amount_paid numeric, p_payment_status text); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.confirm_payment_from_proof(p_quote_id uuid, p_amount_paid numeric, p_payment_status text) IS 'Securely updates payment information for a quote when confirming payment from a payment proof. Only admins can execute this function.';


--
-- Name: convert_minimum_valuation_usd_to_origin(numeric, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.convert_minimum_valuation_usd_to_origin(usd_amount numeric, origin_country text) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
    exchange_rate numeric;
    origin_currency text;
    converted_amount numeric;
    result jsonb;
BEGIN
    -- Get currency for origin country
    SELECT currency INTO origin_currency
    FROM country_settings
    WHERE code = origin_country;
    
    -- If no currency found, default to USD
    IF origin_currency IS NULL THEN
        origin_currency := 'USD';
        exchange_rate := 1.0;
        converted_amount := usd_amount;
    ELSE
        -- Get exchange rate from country_settings
        SELECT rate_from_usd INTO exchange_rate
        FROM country_settings
        WHERE code = origin_country;
        
        -- Calculate converted amount (round up for customs)
        converted_amount := CEIL(usd_amount * COALESCE(exchange_rate, 1.0));
    END IF;
    
    -- Return conversion details
    result := jsonb_build_object(
        'usd_amount', usd_amount,
        'origin_currency', origin_currency,
        'exchange_rate', COALESCE(exchange_rate, 1.0),
        'converted_amount', converted_amount,
        'conversion_timestamp', NOW()
    );
    
    RETURN result;
END;
$$;


ALTER FUNCTION public.convert_minimum_valuation_usd_to_origin(usd_amount numeric, origin_country text) OWNER TO postgres;

--
-- Name: create_credit_note(uuid, numeric, text, text, text, uuid, uuid, integer, numeric, boolean); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_credit_note(p_customer_id uuid, p_amount numeric, p_currency text, p_reason text, p_description text DEFAULT NULL::text, p_quote_id uuid DEFAULT NULL::uuid, p_refund_request_id uuid DEFAULT NULL::uuid, p_valid_days integer DEFAULT 365, p_minimum_order_value numeric DEFAULT NULL::numeric, p_auto_approve boolean DEFAULT false) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION public.create_credit_note(p_customer_id uuid, p_amount numeric, p_currency text, p_reason text, p_description text, p_quote_id uuid, p_refund_request_id uuid, p_valid_days integer, p_minimum_order_value numeric, p_auto_approve boolean) OWNER TO postgres;

--
-- Name: create_mfa_session_after_setup(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_mfa_session_after_setup() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_user_id UUID;
    v_session_token TEXT;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Not authenticated'
        );
    END IF;
    
    -- Check if user has MFA enabled
    IF NOT EXISTS (
        SELECT 1 FROM mfa_configurations 
        WHERE user_id = v_user_id AND totp_enabled = true AND totp_verified = true
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'MFA not configured or verified'
        );
    END IF;
    
    -- Generate session token
    v_session_token := encode(gen_random_bytes(32), 'hex');
    
    -- Create MFA session
    INSERT INTO mfa_sessions (
        user_id,
        session_token,
        ip_address,
        user_agent,
        expires_at
    ) VALUES (
        v_user_id,
        v_session_token,
        inet_client_addr(),
        current_setting('request.headers', true)::json->>'user-agent',
        NOW() + INTERVAL '24 hours' -- Longer session for development
    );
    
    -- Log activity
    INSERT INTO mfa_activity_log (user_id, activity_type, ip_address, success)
    VALUES (v_user_id, 'session_created_after_setup', inet_client_addr(), true);
    
    RETURN jsonb_build_object(
        'success', true,
        'sessionToken', v_session_token,
        'expiresAt', NOW() + INTERVAL '24 hours'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;


ALTER FUNCTION public.create_mfa_session_after_setup() OWNER TO postgres;

--
-- Name: create_payment_ledger_entry_trigger(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_payment_ledger_entry_trigger() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$ BEGIN IF NEW.payment_method = 'paypal' AND NEW.status = 'completed' THEN IF NOT EXISTS (SELECT 1 FROM payment_ledger WHERE payment_transaction_id = NEW.id OR (quote_id = NEW.quote_id AND gateway_code = 'paypal' AND created_at >= NEW.created_at - INTERVAL '10 seconds')) THEN INSERT INTO payment_ledger (quote_id, payment_transaction_id, payment_type, amount, currency, payment_method, gateway_code, gateway_transaction_id, reference_number, status, payment_date, notes, created_by) VALUES (NEW.quote_id, NEW.id, 'customer_payment', NEW.amount, NEW.currency, 'paypal', 'paypal', COALESCE(NEW.paypal_capture_id, NEW.paypal_order_id, NEW.id::text), COALESCE(NEW.paypal_order_id, NEW.id::text), 'completed', NEW.created_at, 'PayPal payment (auto-created by trigger) - Order: ' || COALESCE(NEW.paypal_order_id, 'N/A'), NEW.user_id); END IF; END IF; RETURN NEW; END; $$;


ALTER FUNCTION public.create_payment_ledger_entry_trigger() OWNER TO postgres;

--
-- Name: create_payment_with_ledger_entry(uuid, numeric, text, text, text, text, text, text, text, uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_payment_with_ledger_entry(p_quote_id uuid, p_amount numeric, p_currency text, p_payment_method text, p_payment_type text DEFAULT 'customer_payment'::text, p_reference_number text DEFAULT NULL::text, p_gateway_code text DEFAULT NULL::text, p_gateway_transaction_id text DEFAULT NULL::text, p_notes text DEFAULT NULL::text, p_user_id uuid DEFAULT NULL::uuid, p_message_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION public.create_payment_with_ledger_entry(p_quote_id uuid, p_amount numeric, p_currency text, p_payment_method text, p_payment_type text, p_reference_number text, p_gateway_code text, p_gateway_transaction_id text, p_notes text, p_user_id uuid, p_message_id uuid) OWNER TO postgres;

--
-- Name: FUNCTION create_payment_with_ledger_entry(p_quote_id uuid, p_amount numeric, p_currency text, p_payment_method text, p_payment_type text, p_reference_number text, p_gateway_code text, p_gateway_transaction_id text, p_notes text, p_user_id uuid, p_message_id uuid); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.create_payment_with_ledger_entry(p_quote_id uuid, p_amount numeric, p_currency text, p_payment_method text, p_payment_type text, p_reference_number text, p_gateway_code text, p_gateway_transaction_id text, p_notes text, p_user_id uuid, p_message_id uuid) IS 'Simplified payment creation without USD conversion logic';


--
-- Name: create_refund_request(uuid, text, numeric, text, text, text, text, text, text, uuid[]); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_refund_request(p_quote_id uuid, p_refund_type text, p_amount numeric, p_currency text, p_reason_code text, p_reason_description text, p_customer_notes text DEFAULT NULL::text, p_internal_notes text DEFAULT NULL::text, p_refund_method text DEFAULT 'original_payment_method'::text, p_payment_ids uuid[] DEFAULT NULL::uuid[]) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION public.create_refund_request(p_quote_id uuid, p_refund_type text, p_amount numeric, p_currency text, p_reason_code text, p_reason_description text, p_customer_notes text, p_internal_notes text, p_refund_method text, p_payment_ids uuid[]) OWNER TO postgres;

--
-- Name: disable_mfa(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.disable_mfa() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Not authenticated'
        );
    END IF;
    
    -- Update MFA configuration
    UPDATE mfa_configurations
    SET 
        totp_enabled = false,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = v_user_id;
    
    -- Log the activity
    INSERT INTO mfa_activity_log (user_id, activity_type, ip_address)
    VALUES (v_user_id, 'disabled', inet_client_addr());
    
    RETURN jsonb_build_object(
        'success', true
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;


ALTER FUNCTION public.disable_mfa() OWNER TO postgres;

--
-- Name: encode_base32(bytea); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.encode_base32(data bytea) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    alphabet text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    result text := '';
    input_bits bigint := 0;
    bits_count integer := 0;
    i integer;
    byte_val integer;
    chunk integer;
BEGIN
    -- Convert bytea to bigint for processing
    FOR i IN 0..length(data)-1 LOOP
        byte_val := get_byte(data, i);
        input_bits := (input_bits << 8) | byte_val;
        bits_count := bits_count + 8;
        
        -- Extract 5-bit chunks
        WHILE bits_count >= 5 LOOP
            chunk := (input_bits >> (bits_count - 5)) & 31;
            result := result || substring(alphabet, chunk + 1, 1);
            bits_count := bits_count - 5;
        END LOOP;
    END LOOP;
    
    -- Handle remaining bits
    IF bits_count > 0 THEN
        chunk := (input_bits << (5 - bits_count)) & 31;
        result := result || substring(alphabet, chunk + 1, 1);
    END IF;
    
    -- Add padding
    WHILE length(result) % 8 != 0 LOOP
        result := result || '=';
    END LOOP;
    
    RETURN result;
END;
$$;


ALTER FUNCTION public.encode_base32(data bytea) OWNER TO postgres;

--
-- Name: ensure_user_profile(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.ensure_user_profile(_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Check if profile exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id) THEN
    -- Create profile with default values
    INSERT INTO public.profiles (
      id, 
      full_name, 
      phone, 
      country, 
      preferred_display_currency, 
      referral_code
    )
    VALUES (
      _user_id,
      'User',
      NULL,
      NULL,
      NULL,
      'REF' || substr(md5(random()::text), 1, 8)
    );

    -- Create default user role (using text)
    INSERT INTO public.user_roles (user_id, role, created_by, is_active)
    VALUES (_user_id, 'user'::text, _user_id, true)
    ON CONFLICT (user_id, role) DO NOTHING;

    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;


ALTER FUNCTION public.ensure_user_profile(_user_id uuid) OWNER TO postgres;

--
-- Name: ensure_user_profile_exists(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.ensure_user_profile_exists(_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION public.ensure_user_profile_exists(_user_id uuid) OWNER TO postgres;

--
-- Name: ensure_user_profile_with_oauth(uuid, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.ensure_user_profile_with_oauth(_user_id uuid, _user_metadata jsonb DEFAULT NULL::jsonb) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  oauth_info jsonb;
  full_name_value text;
  phone_value text;
  avatar_url_value text;
BEGIN
  -- Check if profile exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id) THEN
    
    -- Extract OAuth information if provided
    IF _user_metadata IS NOT NULL THEN
      oauth_info = public.extract_oauth_user_info(_user_metadata);
      full_name_value = COALESCE(oauth_info->>'full_name', 'User');
      phone_value = oauth_info->>'phone';
      avatar_url_value = oauth_info->>'avatar_url';
    ELSE
      full_name_value = 'User';
      phone_value = NULL;
      avatar_url_value = NULL;
    END IF;

    -- Create profile with OAuth data or defaults
    INSERT INTO public.profiles (
      id, 
      full_name, 
      phone, 
      avatar_url,
      country, 
      preferred_display_currency, 
      referral_code
    )
    VALUES (
      _user_id,
      full_name_value,
      phone_value,
      avatar_url_value,
      NULL,
      NULL,
      'REF' || substr(md5(random()::text), 1, 8)
    );

    -- Create default user role (using text)
    INSERT INTO public.user_roles (user_id, role, created_by, is_active)
    VALUES (_user_id, 'user'::text, _user_id, true)
    ON CONFLICT (user_id, role) DO NOTHING;

    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;


ALTER FUNCTION public.ensure_user_profile_with_oauth(_user_id uuid, _user_metadata jsonb) OWNER TO postgres;

--
-- Name: FUNCTION ensure_user_profile_with_oauth(_user_id uuid, _user_metadata jsonb); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.ensure_user_profile_with_oauth(_user_id uuid, _user_metadata jsonb) IS 'Creates user profile with comprehensive OAuth data and auto-detects country from address information';


--
-- Name: expire_quotes(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.expire_quotes() RETURNS integer
    LANGUAGE plpgsql
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


ALTER FUNCTION public.expire_quotes() OWNER TO postgres;

--
-- Name: extract_oauth_phone_to_auth_users(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.extract_oauth_phone_to_auth_users() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  extracted_phone text;
  provider text;
BEGIN
  -- Get the OAuth provider
  provider := NEW.raw_app_meta_data->>'provider';
  
  -- Only extract phone from Google OAuth (not Facebook)
  IF provider = 'google' THEN
    extracted_phone := COALESCE(
      NEW.raw_user_meta_data->>'phone_number',        -- Google OAuth primary
      NEW.raw_user_meta_data->>'phone',               -- Google OAuth alternative
      NEW.raw_user_meta_data->'phoneNumbers'->0->>'value'  -- Google People API format
    );

    -- Clean phone number (remove spaces, special chars)
    IF extracted_phone IS NOT NULL THEN
      extracted_phone := regexp_replace(extracted_phone, '[^\d\+]', '', 'g');
    END IF;

    -- Only update if we found a phone number and it's not already set
    IF extracted_phone IS NOT NULL AND extracted_phone != '' AND NEW.phone IS NULL THEN
      -- Update the phone field in the same record
      NEW.phone := extracted_phone;
      
      -- Log the extraction for debugging
      RAISE NOTICE 'Google OAuth phone extracted for user %: %', NEW.id, extracted_phone;
    END IF;
  ELSIF provider = 'facebook' THEN
    -- Log that Facebook user will need to provide phone later
    RAISE NOTICE 'Facebook OAuth user % - phone will be collected later', NEW.id;
  END IF;

  -- Still allow manual signup phone from user_metadata
  IF provider IS NULL AND NEW.phone IS NULL THEN
    extracted_phone := COALESCE(
      NEW.user_metadata->>'phone',                -- Manual signup phone
      NEW.user_metadata->>'phone_number'          -- Alternative format
    );
    
    IF extracted_phone IS NOT NULL AND extracted_phone != '' THEN
      NEW.phone := extracted_phone;
      RAISE NOTICE 'Manual signup phone extracted for user %: %', NEW.id, extracted_phone;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION public.extract_oauth_phone_to_auth_users() OWNER TO postgres;

--
-- Name: extract_oauth_user_info(jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.extract_oauth_user_info(user_metadata jsonb) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
  result jsonb := '{}';
BEGIN
  -- Extract name from various OAuth providers
  IF user_metadata ? 'full_name' THEN
    result = result || jsonb_build_object('full_name', user_metadata->>'full_name');
  ELSIF user_metadata ? 'name' THEN
    result = result || jsonb_build_object('full_name', user_metadata->>'name');
  ELSIF user_metadata ? 'given_name' AND user_metadata ? 'family_name' THEN
    result = result || jsonb_build_object('full_name', 
      (user_metadata->>'given_name') || ' ' || (user_metadata->>'family_name'));
  END IF;

  -- Extract individual name components
  IF user_metadata ? 'given_name' THEN
    result = result || jsonb_build_object('given_name', user_metadata->>'given_name');
  END IF;
  
  IF user_metadata ? 'family_name' THEN
    result = result || jsonb_build_object('family_name', user_metadata->>'family_name');
  END IF;

  -- Extract avatar URL if available
  IF user_metadata ? 'avatar_url' THEN
    result = result || jsonb_build_object('avatar_url', user_metadata->>'avatar_url');
  ELSIF user_metadata ? 'picture' THEN
    result = result || jsonb_build_object('avatar_url', user_metadata->>'picture');
  END IF;

  -- Extract phone numbers (multiple formats)
  IF user_metadata ? 'phone_number' THEN
    result = result || jsonb_build_object('phone', user_metadata->>'phone_number');
  ELSIF user_metadata ? 'phone' THEN
    result = result || jsonb_build_object('phone', user_metadata->>'phone');
  END IF;

  -- Extract addresses (Google provides addresses array)
  IF user_metadata ? 'addresses' THEN
    result = result || jsonb_build_object('addresses', user_metadata->'addresses');
  END IF;

  -- Extract birthday information
  IF user_metadata ? 'birthday' THEN
    result = result || jsonb_build_object('birthday', user_metadata->>'birthday');
  END IF;

  -- Extract gender
  IF user_metadata ? 'gender' THEN
    result = result || jsonb_build_object('gender', user_metadata->>'gender');
  END IF;

  -- Extract locale/language preference
  IF user_metadata ? 'locale' THEN
    result = result || jsonb_build_object('locale', user_metadata->>'locale');
  END IF;

  -- Extract organization/work information
  IF user_metadata ? 'organizations' THEN
    result = result || jsonb_build_object('organizations', user_metadata->'organizations');
  END IF;

  -- Extract work/company info (if provided as separate fields)
  IF user_metadata ? 'company' THEN
    result = result || jsonb_build_object('company', user_metadata->>'company');
  END IF;

  IF user_metadata ? 'job_title' THEN
    result = result || jsonb_build_object('job_title', user_metadata->>'job_title');
  END IF;

  RETURN result;
END;
$$;


ALTER FUNCTION public.extract_oauth_user_info(user_metadata jsonb) OWNER TO postgres;

--
-- Name: FUNCTION extract_oauth_user_info(user_metadata jsonb); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.extract_oauth_user_info(user_metadata jsonb) IS 'Extracts comprehensive user information from OAuth providers including phone, addresses, birthday, gender, organization';


--
-- Name: force_update_payment(uuid, numeric, text, text, text, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.force_update_payment(p_quote_id uuid, new_amount_paid numeric, new_payment_status text, payment_method text DEFAULT 'bank_transfer'::text, reference_number text DEFAULT NULL::text, notes text DEFAULT NULL::text, payment_currency text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


ALTER FUNCTION public.force_update_payment(p_quote_id uuid, new_amount_paid numeric, new_payment_status text, payment_method text, reference_number text, notes text, payment_currency text) OWNER TO postgres;

--
-- Name: FUNCTION force_update_payment(p_quote_id uuid, new_amount_paid numeric, new_payment_status text, payment_method text, reference_number text, notes text, payment_currency text); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.force_update_payment(p_quote_id uuid, new_amount_paid numeric, new_payment_status text, payment_method text, reference_number text, notes text, payment_currency text) IS 'Simplified payment update function that works purely in payment currency - no conversions';


--
-- Name: generate_backup_codes(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generate_backup_codes(p_count integer DEFAULT 10) RETURNS text[]
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_codes TEXT[] := '{}';
    v_code TEXT;
    i INTEGER;
BEGIN
    FOR i IN 1..p_count LOOP
        -- Generate 8-character alphanumeric code
        v_code := upper(
            substring(
                md5(random()::text || clock_timestamp()::text)::text 
                from 1 for 8
            )
        );
        v_codes := array_append(v_codes, v_code);
    END LOOP;
    
    RETURN v_codes;
END;
$$;


ALTER FUNCTION public.generate_backup_codes(p_count integer) OWNER TO postgres;

--
-- Name: generate_credit_note_number(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generate_credit_note_number() RETURNS text
    LANGUAGE plpgsql
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


ALTER FUNCTION public.generate_credit_note_number() OWNER TO postgres;

--
-- Name: generate_display_id(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generate_display_id() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.display_id IS NULL THEN
    NEW.display_id := 'Q' || to_char(now(), 'YYYYMMDD') || '-' || substr(md5(random()::text), 1, 6);
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.generate_display_id() OWNER TO postgres;

--
-- Name: generate_iwish_tracking_id(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generate_iwish_tracking_id() RETURNS text
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Generate format: IWB{YEAR}{SEQUENCE} → IWB20251001
  RETURN 'IWB' || EXTRACT(YEAR FROM NOW()) || LPAD(nextval('iwish_tracking_sequence')::TEXT, 4, '0');
END;
$$;


ALTER FUNCTION public.generate_iwish_tracking_id() OWNER TO postgres;

--
-- Name: FUNCTION generate_iwish_tracking_id(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.generate_iwish_tracking_id() IS 'Generates iwishBag tracking IDs in format IWB{YEAR}{SEQUENCE}';


--
-- Name: generate_payment_link_code(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generate_payment_link_code() RETURNS text
    LANGUAGE plpgsql
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


ALTER FUNCTION public.generate_payment_link_code() OWNER TO postgres;

--
-- Name: generate_share_token(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generate_share_token() RETURNS text
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN 'qt_' || substr(md5(random()::text), 1, 12);
END;
$$;


ALTER FUNCTION public.generate_share_token() OWNER TO postgres;

--
-- Name: generate_suite_number(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generate_suite_number() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT nextval('suite_number_seq') INTO next_num;
  RETURN 'IWB' || LPAD(next_num::TEXT, 5, '0');
END;
$$;


ALTER FUNCTION public.generate_suite_number() OWNER TO postgres;

--
-- Name: generate_verification_token(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generate_verification_token() RETURNS text
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'base64');
END;
$$;


ALTER FUNCTION public.generate_verification_token() OWNER TO postgres;

--
-- Name: get_active_payment_link_for_quote(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_active_payment_link_for_quote(quote_uuid uuid) RETURNS TABLE(id uuid, link_code text, payment_url text, api_version text, status text, expires_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION public.get_active_payment_link_for_quote(quote_uuid uuid) OWNER TO postgres;

--
-- Name: get_all_user_emails(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_all_user_emails() RETURNS TABLE(user_id uuid, email text, full_name text, source text)
    LANGUAGE sql SECURITY DEFINER
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


ALTER FUNCTION public.get_all_user_emails() OWNER TO postgres;

--
-- Name: get_available_credit_notes(uuid, numeric); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_available_credit_notes(p_customer_id uuid DEFAULT NULL::uuid, p_min_amount numeric DEFAULT NULL::numeric) RETURNS TABLE(credit_note_id uuid, note_number text, amount numeric, currency text, amount_available numeric, reason text, valid_until date, minimum_order_value numeric)
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION public.get_available_credit_notes(p_customer_id uuid, p_min_amount numeric) OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: bank_account_details; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bank_account_details (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_name text NOT NULL,
    account_number text NOT NULL,
    bank_name text NOT NULL,
    branch_name text,
    iban text,
    swift_code text,
    country_code text,
    is_fallback boolean DEFAULT false,
    custom_fields jsonb DEFAULT '{}'::jsonb,
    field_labels jsonb DEFAULT '{}'::jsonb,
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    destination_country text,
    upi_id text,
    upi_qr_string text,
    payment_qr_url text,
    instructions text,
    currency_code text
);


ALTER TABLE public.bank_account_details OWNER TO postgres;

--
-- Name: COLUMN bank_account_details.is_fallback; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.bank_account_details.is_fallback IS 'Indicates if this account should be used as fallback when no country-specific account is found. Only one fallback per currency allowed.';


--
-- Name: COLUMN bank_account_details.destination_country; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.bank_account_details.destination_country IS 'Destination country this bank account is intended for (optional, for country-specific bank accounts)';


--
-- Name: COLUMN bank_account_details.upi_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.bank_account_details.upi_id IS 'UPI ID for digital payments (India)';


--
-- Name: COLUMN bank_account_details.upi_qr_string; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.bank_account_details.upi_qr_string IS 'UPI QR code string for generating dynamic QR codes';


--
-- Name: COLUMN bank_account_details.payment_qr_url; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.bank_account_details.payment_qr_url IS 'URL to static payment QR code image';


--
-- Name: COLUMN bank_account_details.instructions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.bank_account_details.instructions IS 'Additional payment instructions for customers';


--
-- Name: COLUMN bank_account_details.currency_code; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.bank_account_details.currency_code IS 'Currency code for the bank account (e.g., USD, INR, NPR). Used by email functions to filter bank accounts by currency.';


--
-- Name: get_bank_account_for_order(text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_bank_account_for_order(p_country_code text, p_destination_country text DEFAULT NULL::text) RETURNS SETOF public.bank_account_details
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION public.get_bank_account_for_order(p_country_code text, p_destination_country text) OWNER TO postgres;

--
-- Name: get_bank_details_for_email(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_bank_details_for_email(payment_currency text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION public.get_bank_details_for_email(payment_currency text) OWNER TO postgres;

--
-- Name: FUNCTION get_bank_details_for_email(payment_currency text); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_bank_details_for_email(payment_currency text) IS 'Returns formatted bank account details for the specified currency, used in email templates for bank transfer payments';


--
-- Name: get_currency_conversion_metrics(timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_currency_conversion_metrics(start_date timestamp with time zone DEFAULT (now() - '30 days'::interval), end_date timestamp with time zone DEFAULT now()) RETURNS TABLE(currency_pair text, conversion_count bigint, average_variance numeric, max_variance numeric, accuracy_score numeric)
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION public.get_currency_conversion_metrics(start_date timestamp with time zone, end_date timestamp with time zone) OWNER TO postgres;

--
-- Name: FUNCTION get_currency_conversion_metrics(start_date timestamp with time zone, end_date timestamp with time zone); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_currency_conversion_metrics(start_date timestamp with time zone, end_date timestamp with time zone) IS 'Tracks accuracy of currency conversion estimates';


--
-- Name: get_currency_mismatches(timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_currency_mismatches(start_date timestamp with time zone DEFAULT (now() - '30 days'::interval), end_date timestamp with time zone DEFAULT now()) RETURNS TABLE(quote_id uuid, order_display_id text, quote_currency text, payment_currency text, quote_amount numeric, payment_amount numeric, created_at timestamp with time zone, payment_method text, gateway_transaction_id text)
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION public.get_currency_mismatches(start_date timestamp with time zone, end_date timestamp with time zone) OWNER TO postgres;

--
-- Name: FUNCTION get_currency_mismatches(start_date timestamp with time zone, end_date timestamp with time zone); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_currency_mismatches(start_date timestamp with time zone, end_date timestamp with time zone) IS 'Detects payments made in different currency than quote';


--
-- Name: get_currency_statistics(timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_currency_statistics(start_date timestamp with time zone DEFAULT (now() - '30 days'::interval), end_date timestamp with time zone DEFAULT now()) RETURNS TABLE(currency text, total_payments numeric, total_refunds numeric, net_amount numeric, payment_count bigint, refund_count bigint, average_payment numeric, last_payment_date timestamp with time zone, unique_customers bigint)
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION public.get_currency_statistics(start_date timestamp with time zone, end_date timestamp with time zone) OWNER TO postgres;

--
-- Name: FUNCTION get_currency_statistics(start_date timestamp with time zone, end_date timestamp with time zone); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_currency_statistics(start_date timestamp with time zone, end_date timestamp with time zone) IS 'Provides currency usage statistics for monitoring dashboard';


--
-- Name: get_effective_tax_method(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_effective_tax_method(quote_id_param uuid) RETURNS TABLE(calculation_method text, valuation_method text, source text, confidence numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    quote_record quotes%ROWTYPE;
    global_prefs global_tax_method_preferences%ROWTYPE;
BEGIN
    -- Get quote details
    SELECT * INTO quote_record FROM quotes WHERE id = quote_id_param;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'legacy_fallback'::text, 'auto'::text, 'not_found'::text, 0.0::numeric;
        RETURN;
    END IF;
    
    -- Check for per-quote preferences first
    IF quote_record.calculation_method_preference != 'auto' THEN
        RETURN QUERY SELECT 
            quote_record.calculation_method_preference,
            quote_record.valuation_method_preference,
            'quote_specific'::text,
            1.0::numeric;
        RETURN;
    END IF;
    
    -- Check for country-specific preferences
    SELECT * INTO global_prefs 
    FROM global_tax_method_preferences 
    WHERE preference_scope = 'country_specific' 
      AND scope_identifier = quote_record.destination_country 
      AND is_active = true
    ORDER BY updated_at DESC 
    LIMIT 1;
    
    IF FOUND THEN
        RETURN QUERY SELECT 
            global_prefs.default_calculation_method,
            global_prefs.default_valuation_method,
            'country_specific'::text,
            0.8::numeric;
        RETURN;
    END IF;
    
    -- Fall back to system default
    SELECT * INTO global_prefs 
    FROM global_tax_method_preferences 
    WHERE preference_scope = 'system_default' 
      AND is_active = true
    ORDER BY updated_at DESC 
    LIMIT 1;
    
    IF FOUND THEN
        RETURN QUERY SELECT 
            global_prefs.default_calculation_method,
            global_prefs.default_valuation_method,
            'system_default'::text,
            0.6::numeric;
        RETURN;
    END IF;
    
    -- Ultimate fallback
    RETURN QUERY SELECT 'auto'::text, 'auto'::text, 'hardcoded_fallback'::text, 0.4::numeric;
END;
$$;


ALTER FUNCTION public.get_effective_tax_method(quote_id_param uuid) OWNER TO postgres;

--
-- Name: get_exchange_rate_health(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_exchange_rate_health() RETURNS TABLE(currency text, current_rate numeric, last_updated timestamp with time zone, is_stale boolean, is_fallback boolean, age_minutes bigint)
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION public.get_exchange_rate_health() OWNER TO postgres;

--
-- Name: FUNCTION get_exchange_rate_health(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_exchange_rate_health() IS 'Monitors exchange rate freshness and accuracy';


--
-- Name: get_hsn_with_currency_conversion(text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_hsn_with_currency_conversion(hsn_code_param text, origin_country_param text DEFAULT 'US'::text) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
    hsn_record record;
    conversion_data jsonb;
    result jsonb;
BEGIN
    -- Get HSN record
    SELECT * INTO hsn_record
    FROM hsn_master
    WHERE hsn_code = hsn_code_param
    AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'error', 'HSN code not found',
            'hsn_code', hsn_code_param
        );
    END IF;
    
    -- Convert minimum valuation if required
    IF hsn_record.minimum_valuation_usd IS NOT NULL AND hsn_record.requires_currency_conversion THEN
        conversion_data := convert_minimum_valuation_usd_to_origin(
            hsn_record.minimum_valuation_usd,
            origin_country_param
        );
    ELSE
        conversion_data := jsonb_build_object(
            'no_conversion_required', true
        );
    END IF;
    
    -- Build result
    result := jsonb_build_object(
        'hsn_code', hsn_record.hsn_code,
        'description', hsn_record.description,
        'category', hsn_record.category,
        'subcategory', hsn_record.subcategory,
        'keywords', hsn_record.keywords,
        'minimum_valuation_usd', hsn_record.minimum_valuation_usd,
        'requires_currency_conversion', hsn_record.requires_currency_conversion,
        'weight_data', hsn_record.weight_data,
        'tax_data', hsn_record.tax_data,
        'classification_data', hsn_record.classification_data,
        'currency_conversion', conversion_data
    );
    
    RETURN result;
END;
$$;


ALTER FUNCTION public.get_hsn_with_currency_conversion(hsn_code_param text, origin_country_param text) OWNER TO postgres;

--
-- Name: get_mfa_status(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_mfa_status() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_user_id UUID;
    v_enabled BOOLEAN;
    v_verified BOOLEAN;
    v_backup_count INTEGER;
    v_created_at TIMESTAMPTZ;
    v_updated_at TIMESTAMPTZ;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    -- Return not authenticated if no user
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'enabled', false,
            'verified', false,
            'backupCodesRemaining', 0,
            'error', 'Not authenticated'
        );
    END IF;
    
    -- Try to get MFA configuration
    SELECT 
        COALESCE(totp_enabled, false),
        COALESCE(totp_verified, false),
        CASE 
            WHEN backup_codes IS NULL THEN 0
            WHEN array_length(backup_codes, 1) IS NULL THEN 0
            ELSE array_length(backup_codes, 1)
        END,
        created_at,
        updated_at
    INTO 
        v_enabled,
        v_verified,
        v_backup_count,
        v_created_at,
        v_updated_at
    FROM mfa_configurations
    WHERE user_id = v_user_id;
    
    -- If no configuration found, return defaults
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'enabled', false,
            'verified', false,
            'backupCodesRemaining', 0,
            'exists', false
        );
    END IF;
    
    -- Return the status
    RETURN jsonb_build_object(
        'enabled', v_enabled,
        'verified', v_verified,
        'backupCodesRemaining', v_backup_count,
        'exists', true,
        'createdAt', v_created_at,
        'updatedAt', v_updated_at
    );
    
EXCEPTION
    WHEN OTHERS THEN
        -- Return error state
        RETURN jsonb_build_object(
            'enabled', false,
            'verified', false,
            'backupCodesRemaining', 0,
            'error', SQLERRM
        );
END;
$$;


ALTER FUNCTION public.get_mfa_status() OWNER TO postgres;

--
-- Name: get_optimal_storage_location(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_optimal_storage_location(suite_number text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
  zone TEXT;
  location_code TEXT;
BEGIN
  -- Determine zone based on suite number
  IF SUBSTRING(suite_number FROM 4)::INTEGER < 20000 THEN
    zone := 'A';
  ELSIF SUBSTRING(suite_number FROM 4)::INTEGER < 30000 THEN
    zone := 'B';
  ELSE
    zone := 'C';
  END IF;
  
  -- Find available location in preferred zone
  SELECT wl.location_code INTO location_code
  FROM warehouse_locations wl
  WHERE wl.zone = get_optimal_storage_location.zone
    AND wl.is_active = true
    AND wl.current_packages < wl.max_packages
  ORDER BY wl.current_packages ASC
  LIMIT 1;
  
  -- If no space in preferred zone, find any available location
  IF location_code IS NULL THEN
    SELECT wl.location_code INTO location_code
    FROM warehouse_locations wl
    WHERE wl.is_active = true
      AND wl.current_packages < wl.max_packages
    ORDER BY wl.current_packages ASC
    LIMIT 1;
  END IF;
  
  RETURN COALESCE(location_code, 'TEMP001');
END;
$$;


ALTER FUNCTION public.get_optimal_storage_location(suite_number text) OWNER TO postgres;

--
-- Name: get_orders_with_payment_proofs(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_orders_with_payment_proofs(status_filter text DEFAULT NULL::text, limit_count integer DEFAULT 50) RETURNS TABLE(order_id uuid, order_display_id text, final_total numeric, final_currency text, payment_status text, payment_method text, customer_email text, customer_id uuid, message_id uuid, verification_status text, admin_notes text, amount_paid numeric, attachment_file_name text, attachment_url text, submitted_at timestamp with time zone, verified_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION public.get_orders_with_payment_proofs(status_filter text, limit_count integer) OWNER TO postgres;

--
-- Name: get_payment_history(uuid, uuid, date, date); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_payment_history(p_quote_id uuid DEFAULT NULL::uuid, p_customer_id uuid DEFAULT NULL::uuid, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date) RETURNS TABLE(payment_id uuid, quote_id uuid, order_display_id text, payment_date timestamp with time zone, payment_type text, payment_method text, gateway_name text, amount numeric, currency text, base_amount numeric, running_balance numeric, reference_number text, status text, notes text, created_by_name text)
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION public.get_payment_history(p_quote_id uuid, p_customer_id uuid, p_start_date date, p_end_date date) OWNER TO postgres;

--
-- Name: get_payment_proof_stats(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_payment_proof_stats() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION public.get_payment_proof_stats() OWNER TO postgres;

--
-- Name: get_popular_posts(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_popular_posts(limit_count integer DEFAULT 5) RETURNS TABLE(id uuid, title character varying, slug character varying, excerpt text, featured_image_url text, published_at timestamp with time zone, reading_time_minutes integer, category_name character varying, views_count integer)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bp.id,
    bp.title,
    bp.slug,
    bp.excerpt,
    bp.featured_image_url,
    bp.published_at,
    bp.reading_time_minutes,
    bc.name as category_name,
    bp.views_count
  FROM blog_posts bp
  JOIN blog_categories bc ON bp.category_id = bc.id
  WHERE bp.status = 'published'
  ORDER BY bp.views_count DESC, bp.published_at DESC
  LIMIT limit_count;
END;
$$;


ALTER FUNCTION public.get_popular_posts(limit_count integer) OWNER TO postgres;

--
-- Name: quotes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quotes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    display_id text,
    user_id uuid,
    status text DEFAULT 'pending'::text NOT NULL,
    origin_country text DEFAULT 'US'::text NOT NULL,
    destination_country text NOT NULL,
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    costprice_total_usd numeric(12,2) DEFAULT 0 NOT NULL,
    final_total_usd numeric(12,2) DEFAULT 0 NOT NULL,
    calculation_data jsonb DEFAULT '{}'::jsonb,
    customer_data jsonb DEFAULT '{}'::jsonb,
    operational_data jsonb DEFAULT '{}'::jsonb,
    currency text DEFAULT 'USD'::text NOT NULL,
    in_cart boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    smart_suggestions jsonb DEFAULT '[]'::jsonb,
    weight_confidence numeric DEFAULT 0.0,
    optimization_score numeric DEFAULT 0.0,
    expires_at timestamp with time zone,
    share_token text,
    is_anonymous boolean DEFAULT false,
    internal_notes text,
    admin_notes text,
    quote_source text DEFAULT 'website'::text,
    iwish_tracking_id character varying(20),
    tracking_status character varying(30) DEFAULT 'pending'::character varying,
    estimated_delivery_date date,
    shipping_carrier character varying(100),
    tracking_number character varying(100),
    email_verified boolean DEFAULT false,
    verification_token character varying(255),
    verification_sent_at timestamp with time zone,
    verification_expires_at timestamp with time zone,
    first_viewed_at timestamp with time zone,
    last_viewed_at timestamp with time zone,
    total_view_duration integer DEFAULT 0,
    view_count integer DEFAULT 0,
    calculation_method_preference text DEFAULT 'auto'::text,
    valuation_method_preference text DEFAULT 'auto'::text,
    CONSTRAINT quotes_calculation_method_preference_check CHECK ((calculation_method_preference = ANY (ARRAY['auto'::text, 'hsn_only'::text, 'legacy_fallback'::text, 'admin_choice'::text]))),
    CONSTRAINT quotes_costprice_total_check CHECK ((costprice_total_usd >= (0)::numeric)),
    CONSTRAINT quotes_unified_costprice_total_check CHECK ((costprice_total_usd >= (0)::numeric)),
    CONSTRAINT quotes_unified_final_total_check CHECK ((final_total_usd >= (0)::numeric)),
    CONSTRAINT quotes_unified_items_not_empty CHECK ((jsonb_array_length(items) > 0)),
    CONSTRAINT quotes_unified_optimization_score_check CHECK (((optimization_score >= (0)::numeric) AND (optimization_score <= (100)::numeric))),
    CONSTRAINT quotes_unified_valid_status CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'approved'::text, 'rejected'::text, 'expired'::text, 'calculated'::text, 'payment_pending'::text, 'processing'::text, 'paid'::text, 'ordered'::text, 'shipped'::text, 'completed'::text, 'cancelled'::text]))),
    CONSTRAINT quotes_unified_weight_confidence_check CHECK (((weight_confidence >= (0)::numeric) AND (weight_confidence <= (1)::numeric))),
    CONSTRAINT quotes_valuation_method_preference_check CHECK ((valuation_method_preference = ANY (ARRAY['auto'::text, 'actual_price'::text, 'minimum_valuation'::text, 'higher_of_both'::text, 'per_item_choice'::text])))
);


ALTER TABLE public.quotes OWNER TO postgres;

--
-- Name: TABLE quotes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.quotes IS 'Unified quotes table with JSONB structure. Email stored in customer_data.info.email, shipping address in customer_data.shipping_address';


--
-- Name: COLUMN quotes.items; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.quotes.items IS 'JSONB array of quote items. Fields: costprice_origin (cost in origin currency), weight (in kg), etc.';


--
-- Name: COLUMN quotes.costprice_total_usd; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.quotes.costprice_total_usd IS 'Total cost price in USD equivalent (converted from origin currency)';


--
-- Name: COLUMN quotes.calculation_data; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.quotes.calculation_data IS 'All financial calculations, exchange rates, and smart optimizations';


--
-- Name: COLUMN quotes.customer_data; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.quotes.customer_data IS 'Customer information and shipping address for anonymous quotes';


--
-- Name: COLUMN quotes.operational_data; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.quotes.operational_data IS 'Enhanced operational data including:
- admin_overrides.tax_method_selection: { method: string, admin_id: uuid, timestamp: date, reason: string }
- admin_overrides.valuation_method_selection: { method: string, per_item_overrides: array, admin_id: uuid }
- tax_calculation_transparency: { method_used: string, fallback_reason: string, calculation_time: date }';


--
-- Name: COLUMN quotes.smart_suggestions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.quotes.smart_suggestions IS 'AI-powered suggestions for optimization and improvements';


--
-- Name: COLUMN quotes.iwish_tracking_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.quotes.iwish_tracking_id IS 'iwishBag internal tracking ID (format: IWB20251001)';


--
-- Name: COLUMN quotes.tracking_status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.quotes.tracking_status IS 'Current tracking status (pending, preparing, shipped, delivered, exception)';


--
-- Name: COLUMN quotes.estimated_delivery_date; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.quotes.estimated_delivery_date IS 'Expected delivery date set by admin';


--
-- Name: COLUMN quotes.shipping_carrier; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.quotes.shipping_carrier IS 'Shipping carrier name (e.g., DHL, FedEx, UPS)';


--
-- Name: COLUMN quotes.tracking_number; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.quotes.tracking_number IS 'External carrier tracking number';


--
-- Name: COLUMN quotes.email_verified; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.quotes.email_verified IS 'Whether the customer email has been verified for this quote';


--
-- Name: COLUMN quotes.verification_token; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.quotes.verification_token IS 'Token used for email verification';


--
-- Name: COLUMN quotes.total_view_duration; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.quotes.total_view_duration IS 'Total time customer spent viewing quote (in seconds)';


--
-- Name: COLUMN quotes.view_count; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.quotes.view_count IS 'Number of times the quote was viewed';


--
-- Name: get_quote_items(public.quotes); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_quote_items(quote_row public.quotes) RETURNS TABLE(id text, name text, quantity integer, price_usd numeric, weight_kg numeric, weight_confidence numeric)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (item->>'id')::text,
    (item->>'name')::text,
    (item->>'quantity')::integer,
    (item->>'price_usd')::numeric,
    (item->>'weight_kg')::numeric,
    (item->'smart_data'->>'weight_confidence')::numeric
  FROM jsonb_array_elements(quote_row.items) AS item;
END;
$$;


ALTER FUNCTION public.get_quote_items(quote_row public.quotes) OWNER TO postgres;

--
-- Name: get_quote_message_thread(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_quote_message_thread(p_quote_id uuid) RETURNS TABLE(id uuid, sender_id uuid, sender_name text, sender_email text, content text, message_type text, thread_type character varying, priority character varying, attachment_url text, attachment_file_name text, is_read boolean, read_at timestamp with time zone, created_at timestamp with time zone, verification_status text, admin_notes text, is_internal boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.sender_id,
    m.sender_name,
    m.sender_email,
    m.content,
    m.message_type,
    m.thread_type,
    m.priority,
    m.attachment_url,
    m.attachment_file_name,
    m.is_read,
    m.read_at,
    m.created_at,
    m.verification_status,
    m.admin_notes,
    m.is_internal
  FROM public.messages m
  WHERE m.quote_id = p_quote_id
  AND (
    -- User access: sender or recipient of non-internal messages
    (NOT m.is_internal AND (m.sender_id = auth.uid() OR m.recipient_id = auth.uid()))
    OR
    -- Admin access: all messages
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR
    -- Moderator access: non-internal messages
    (NOT m.is_internal AND EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role IN ('moderator', 'admin')
    ))
  )
  ORDER BY m.created_at ASC;
END;
$$;


ALTER FUNCTION public.get_quote_message_thread(p_quote_id uuid) OWNER TO postgres;

--
-- Name: FUNCTION get_quote_message_thread(p_quote_id uuid); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_quote_message_thread(p_quote_id uuid) IS 'Retrieves all messages for a specific quote with proper access control based on user roles';


--
-- Name: get_related_posts(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_related_posts(post_slug text, limit_count integer DEFAULT 3) RETURNS TABLE(id uuid, title character varying, slug character varying, excerpt text, featured_image_url text, published_at timestamp with time zone, reading_time_minutes integer, category_name character varying, views_count integer)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bp.id,
    bp.title,
    bp.slug,
    bp.excerpt,
    bp.featured_image_url,
    bp.published_at,
    bp.reading_time_minutes,
    COALESCE(bc.name, 'Uncategorized'::VARCHAR(100)) as category_name,
    COALESCE(bp.views_count, 0) as views_count
  FROM blog_posts bp
  LEFT JOIN blog_categories bc ON bp.category_id = bc.id
  WHERE bp.status = 'published'
    AND bp.slug != post_slug
  ORDER BY bp.published_at DESC
  LIMIT limit_count;
END;
$$;


ALTER FUNCTION public.get_related_posts(post_slug text, limit_count integer) OWNER TO postgres;

--
-- Name: get_shipping_cost(character varying, character varying, numeric, numeric); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_shipping_cost(p_origin_country character varying, p_destination_country character varying, p_weight numeric, p_price numeric DEFAULT 0) RETURNS TABLE(cost numeric, method text, delivery_days text, carrier text)
    LANGUAGE plpgsql
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


ALTER FUNCTION public.get_shipping_cost(p_origin_country character varying, p_destination_country character varying, p_weight numeric, p_price numeric) OWNER TO postgres;

--
-- Name: get_shipping_options(public.quotes); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_shipping_options(quote_row public.quotes) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN quote_row.operational_data->'shipping'->'available_options';
END;
$$;


ALTER FUNCTION public.get_shipping_options(quote_row public.quotes) OWNER TO postgres;

--
-- Name: get_suspicious_payment_amounts(timestamp with time zone, timestamp with time zone, numeric); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_suspicious_payment_amounts(start_date timestamp with time zone DEFAULT (now() - '30 days'::interval), end_date timestamp with time zone DEFAULT now(), tolerance numeric DEFAULT 0.01) RETURNS TABLE(quote_id uuid, order_display_id text, quote_amount numeric, quote_currency text, payment_amount numeric, payment_currency text, amount_difference numeric, created_at timestamp with time zone, suspicion_level text)
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION public.get_suspicious_payment_amounts(start_date timestamp with time zone, end_date timestamp with time zone, tolerance numeric) OWNER TO postgres;

--
-- Name: FUNCTION get_suspicious_payment_amounts(start_date timestamp with time zone, end_date timestamp with time zone, tolerance numeric); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_suspicious_payment_amounts(start_date timestamp with time zone, end_date timestamp with time zone, tolerance numeric) IS 'Identifies potentially incorrectly recorded payment amounts';


--
-- Name: get_tax_method_recommendations(text, text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_tax_method_recommendations(p_origin_country text, p_destination_country text, p_analysis_days integer DEFAULT 30) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  result JSONB;
  hsn_availability BOOLEAN;
  route_data_quality NUMERIC;
  recommended_method TEXT;
  confidence_score NUMERIC;
BEGIN
  -- Check HSN data availability
  SELECT EXISTS(
    SELECT 1 FROM hsn_master 
    WHERE is_active = true 
    LIMIT 1
  ) INTO hsn_availability;
  
  -- Check route data quality
  SELECT COALESCE(
    (SELECT 
      CASE 
        WHEN customs_percent IS NOT NULL AND vat_percent IS NOT NULL THEN 1.0
        WHEN customs_percent IS NOT NULL OR vat_percent IS NOT NULL THEN 0.7
        ELSE 0.4
      END
    FROM shipping_routes 
    WHERE origin_country = p_origin_country 
      AND destination_country = p_destination_country 
      AND is_active = true
    LIMIT 1),
    (SELECT 
      CASE 
        WHEN customs_percent IS NOT NULL AND vat_percent IS NOT NULL THEN 0.8
        WHEN customs_percent IS NOT NULL OR vat_percent IS NOT NULL THEN 0.5
        ELSE 0.3
      END
    FROM country_settings 
    WHERE code = p_destination_country 
      AND is_supported = true
    LIMIT 1),
    0.2
  ) INTO route_data_quality;
  
  -- Determine recommended method based on data availability and performance
  IF hsn_availability AND route_data_quality > 0.8 THEN
    recommended_method := 'auto';
    confidence_score := 0.95;
  ELSIF hsn_availability THEN
    recommended_method := 'hsn_only';
    confidence_score := 0.85;
  ELSIF route_data_quality > 0.6 THEN
    recommended_method := 'legacy_fallback';
    confidence_score := route_data_quality;
  ELSE
    recommended_method := 'admin_choice';
    confidence_score := 0.7;
  END IF;
  
  -- Build comprehensive recommendation
  result := jsonb_build_object(
    'recommended_method', recommended_method,
    'confidence_score', ROUND(confidence_score::NUMERIC, 3),
    'hsn_availability', hsn_availability,
    'route_data_quality', ROUND(route_data_quality::NUMERIC, 3),
    'analysis_period_days', p_analysis_days,
    'generated_at', NOW(),
    'route', p_origin_country || ' → ' || p_destination_country,
    'recommendations', jsonb_build_array(
      CASE 
        WHEN recommended_method = 'auto' THEN 
          'Use Auto method for best balance of accuracy and reliability'
        WHEN recommended_method = 'hsn_only' THEN 
          'HSN per-item calculation available - use for maximum accuracy'
        WHEN recommended_method = 'legacy_fallback' THEN 
          'Route data available - legacy calculation recommended'
        ELSE 
          'Limited data available - manual admin selection required'
      END,
      CASE 
        WHEN hsn_availability AND route_data_quality < 0.6 THEN
          'Consider configuring shipping routes for better fallback options'
        WHEN NOT hsn_availability THEN
          'Consider adding HSN codes to items for per-item accuracy'
        ELSE
          'Data configuration looks good for this route'
      END
    )
  );
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'error', SQLERRM,
      'recommended_method', 'admin_choice',
      'confidence_score', 0.5,
      'generated_at', NOW()
    );
END;
$$;


ALTER FUNCTION public.get_tax_method_recommendations(p_origin_country text, p_destination_country text, p_analysis_days integer) OWNER TO postgres;

--
-- Name: FUNCTION get_tax_method_recommendations(p_origin_country text, p_destination_country text, p_analysis_days integer); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_tax_method_recommendations(p_origin_country text, p_destination_country text, p_analysis_days integer) IS 'Provides intelligent recommendations for tax calculation method selection';


--
-- Name: get_timeline(public.quotes); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_timeline(quote_row public.quotes) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN quote_row.operational_data->'timeline';
END;
$$;


ALTER FUNCTION public.get_timeline(quote_row public.quotes) OWNER TO postgres;

--
-- Name: get_transaction_refund_eligibility(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_transaction_refund_eligibility(transaction_id uuid) RETURNS TABLE(can_refund boolean, refundable_amount numeric, reason text)
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION public.get_transaction_refund_eligibility(transaction_id uuid) OWNER TO postgres;

--
-- Name: get_unread_message_count(uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_unread_message_count(p_quote_id uuid DEFAULT NULL::uuid, p_user_id uuid DEFAULT NULL::uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_user_id UUID := COALESCE(p_user_id, auth.uid());
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM public.messages m
  WHERE 
    (p_quote_id IS NULL OR m.quote_id = p_quote_id)
    AND m.recipient_id = v_user_id
    AND m.is_read = false
    AND NOT m.is_internal; -- Don't count internal admin messages
  
  RETURN COALESCE(v_count, 0);
END;
$$;


ALTER FUNCTION public.get_unread_message_count(p_quote_id uuid, p_user_id uuid) OWNER TO postgres;

--
-- Name: FUNCTION get_unread_message_count(p_quote_id uuid, p_user_id uuid); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_unread_message_count(p_quote_id uuid, p_user_id uuid) IS 'Returns count of unread messages for a user, optionally filtered by quote';


--
-- Name: get_unread_notification_count(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_unread_notification_count(target_user_id uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  unread_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO unread_count
  FROM notifications
  WHERE user_id = target_user_id
    AND is_read = false
    AND is_dismissed = false
    AND (expires_at IS NULL OR expires_at > NOW());
  
  RETURN COALESCE(unread_count, 0);
END;
$$;


ALTER FUNCTION public.get_unread_notification_count(target_user_id uuid) OWNER TO postgres;

--
-- Name: get_user_activity_summary(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_user_activity_summary(target_user_id uuid) RETURNS TABLE(activity_type text, activity_count bigint, latest_activity timestamp with time zone, common_data jsonb)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ua.activity_type::TEXT,
    COUNT(*)::BIGINT as activity_count,
    MAX(ua.created_at) as latest_activity,
    jsonb_object_agg(
      key, 
      COUNT(*)
    ) FILTER (WHERE key IS NOT NULL) as common_data
  FROM user_activity_analytics ua,
       LATERAL jsonb_each_text(ua.activity_data) AS kv(key, value)
  WHERE ua.user_id = target_user_id
    AND ua.created_at > NOW() - INTERVAL '3 months'
  GROUP BY ua.activity_type;
END;
$$;


ALTER FUNCTION public.get_user_activity_summary(target_user_id uuid) OWNER TO postgres;

--
-- Name: get_user_bank_accounts(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_user_bank_accounts(user_id uuid) RETURNS SETOF public.bank_account_details
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION public.get_user_bank_accounts(user_id uuid) OWNER TO postgres;

--
-- Name: get_user_permissions_new(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_user_permissions_new(user_uuid uuid) RETURNS TABLE(permission text)
    LANGUAGE sql SECURITY DEFINER
    AS $$
  SELECT 
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = user_uuid AND role = 'admin'
      ) THEN 'admin'
      WHEN EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = user_uuid AND role = 'moderator'
      ) THEN 'moderator'
      ELSE 'user'
    END as permission;
$$;


ALTER FUNCTION public.get_user_permissions_new(user_uuid uuid) OWNER TO postgres;

--
-- Name: get_user_roles_new(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_user_roles_new(user_uuid uuid) RETURNS TABLE(role text, granted_at timestamp with time zone, granted_by uuid)
    LANGUAGE sql SECURITY DEFINER
    AS $$
  SELECT 
    ur.role,
    ur.created_at as granted_at,
    ur.granted_by
  FROM user_roles ur
  WHERE ur.user_id = user_uuid
  ORDER BY ur.created_at DESC;
$$;


ALTER FUNCTION public.get_user_roles_new(user_uuid uuid) OWNER TO postgres;

--
-- Name: handle_default_address(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_default_address() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION public.handle_default_address() OWNER TO postgres;

--
-- Name: handle_mfa_failure(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_mfa_failure(p_user_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_failed_attempts INTEGER;
BEGIN
    -- Increment failed attempts
    UPDATE mfa_configurations
    SET failed_attempts = failed_attempts + 1
    WHERE user_id = p_user_id
    RETURNING failed_attempts INTO v_failed_attempts;
    
    -- Lock account after 5 failed attempts
    IF v_failed_attempts >= 5 THEN
        UPDATE mfa_configurations
        SET locked_until = NOW() + INTERVAL '15 minutes'
        WHERE user_id = p_user_id;
        
        -- Log security event
        INSERT INTO mfa_activity_log (
            user_id,
            activity_type,
            ip_address,
            metadata
        ) VALUES (
            p_user_id,
            'locked_security',
            inet_client_addr(),
            json_build_object('failed_attempts', v_failed_attempts)
        );
    END IF;
END;
$$;


ALTER FUNCTION public.handle_mfa_failure(p_user_id uuid) OWNER TO postgres;

--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Call ensure_user_profile with OAuth metadata if available
  -- Use raw_user_meta_data instead of user_metadata
  PERFORM public.ensure_user_profile_with_oauth(NEW.id, NEW.raw_user_meta_data);
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

--
-- Name: has_any_role(public.app_role[]); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.has_any_role(roles public.app_role[]) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = ANY(roles)
  );
END;
$$;


ALTER FUNCTION public.has_any_role(roles public.app_role[]) OWNER TO postgres;

--
-- Name: FUNCTION has_any_role(roles public.app_role[]); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.has_any_role(roles public.app_role[]) IS 'Check if the current user has any of the specified roles';


--
-- Name: has_role(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.has_role(role_name text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role::text = role_name
    AND (is_active IS NULL OR is_active = true)
  );
END;
$$;


ALTER FUNCTION public.has_role(role_name text) OWNER TO postgres;

--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id 
    AND role::text = _role::text
    AND (is_active IS NULL OR is_active = true)
  );
END;
$$;


ALTER FUNCTION public.has_role(_user_id uuid, _role public.app_role) OWNER TO postgres;

--
-- Name: increment_post_views(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.increment_post_views(post_slug text) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE public.blog_posts SET views_count = views_count + 1 WHERE slug = post_slug AND status = 'published';
END;
$$;


ALTER FUNCTION public.increment_post_views(post_slug text) OWNER TO postgres;

--
-- Name: initiate_quote_email_verification(uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.initiate_quote_email_verification(p_quote_id uuid, p_email text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
    verification_token TEXT;
BEGIN
    -- Generate new verification token
    SELECT generate_verification_token() INTO verification_token;
    
    -- Update quote with verification details
    UPDATE quotes 
    SET 
        verification_token = verification_token,
        verification_sent_at = now(),
        verification_expires_at = now() + INTERVAL '24 hours',
        email_verified = false,
        customer_email = p_email
    WHERE id = p_quote_id;
    
    -- Log the action
    PERFORM log_share_action(
        p_quote_id,
        auth.uid(),
        'email_verification_sent',
        NULL,
        NULL,
        jsonb_build_object('email', p_email)
    );
    
    RETURN verification_token;
END;
$$;


ALTER FUNCTION public.initiate_quote_email_verification(p_quote_id uuid, p_email text) OWNER TO postgres;

--
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role::text = 'admin'
    AND (is_active IS NULL OR is_active = true)
  );
END;
$$;


ALTER FUNCTION public.is_admin() OWNER TO postgres;

--
-- Name: FUNCTION is_admin(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.is_admin() IS 'Check if the current user has admin role';


--
-- Name: is_authenticated(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_authenticated() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$$;


ALTER FUNCTION public.is_authenticated() OWNER TO postgres;

--
-- Name: FUNCTION is_authenticated(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.is_authenticated() IS 'Check if there is an authenticated user';


--
-- Name: lock_address_after_payment(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.lock_address_after_payment(quote_uuid uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION public.lock_address_after_payment(quote_uuid uuid) OWNER TO postgres;

--
-- Name: log_address_change(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.log_address_change() RETURNS trigger
    LANGUAGE plpgsql
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


ALTER FUNCTION public.log_address_change() OWNER TO postgres;

--
-- Name: log_quote_status_change(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.log_quote_status_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION public.log_quote_status_change() OWNER TO postgres;

--
-- Name: log_share_action(uuid, uuid, character varying, inet, text, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.log_share_action(p_quote_id uuid, p_user_id uuid, p_action character varying, p_ip_address inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text, p_details jsonb DEFAULT NULL::jsonb) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO share_audit_log (
        quote_id,
        user_id,
        action,
        ip_address,
        user_agent,
        details
    )
    VALUES (
        p_quote_id,
        p_user_id,
        p_action,
        p_ip_address,
        p_user_agent,
        p_details
    )
    RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$;


ALTER FUNCTION public.log_share_action(p_quote_id uuid, p_user_id uuid, p_action character varying, p_ip_address inet, p_user_agent text, p_details jsonb) OWNER TO postgres;

--
-- Name: log_tax_method_change(uuid, uuid, text, text, text, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.log_tax_method_change(p_quote_id uuid, p_admin_id uuid, p_calculation_method text, p_valuation_method text, p_change_reason text DEFAULT NULL::text, p_change_details jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    log_id uuid;
    current_calc_method text;
    current_val_method text;
BEGIN
    -- Get current methods
    SELECT calculation_method_preference, valuation_method_preference 
    INTO current_calc_method, current_val_method
    FROM quotes WHERE id = p_quote_id;
    
    -- Insert audit log
    INSERT INTO tax_calculation_audit_log (
        quote_id,
        admin_id,
        calculation_method,
        valuation_method,
        previous_calculation_method,
        previous_valuation_method,
        change_reason,
        change_details
    ) VALUES (
        p_quote_id,
        p_admin_id,
        p_calculation_method,
        p_valuation_method,
        current_calc_method,
        current_val_method,
        p_change_reason,
        p_change_details
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$;


ALTER FUNCTION public.log_tax_method_change(p_quote_id uuid, p_admin_id uuid, p_calculation_method text, p_valuation_method text, p_change_reason text, p_change_details jsonb) OWNER TO postgres;

--
-- Name: mark_all_notifications_read(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.mark_all_notifications_read(target_user_id uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE notifications 
  SET 
    is_read = true,
    read_at = NOW(),
    updated_at = NOW()
  WHERE user_id = target_user_id
    AND is_read = false
  RETURNING COUNT(*)::INTEGER INTO updated_count;
  
  RETURN COALESCE(updated_count, 0);
END;
$$;


ALTER FUNCTION public.mark_all_notifications_read(target_user_id uuid) OWNER TO postgres;

--
-- Name: mark_messages_as_read(uuid[]); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.mark_messages_as_read(p_message_ids uuid[]) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  UPDATE public.messages 
  SET 
    is_read = true,
    read_at = NOW(),
    updated_at = NOW()
  WHERE 
    id = ANY(p_message_ids)
    AND recipient_id = auth.uid()
    AND is_read = false;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RETURN v_updated_count;
END;
$$;


ALTER FUNCTION public.mark_messages_as_read(p_message_ids uuid[]) OWNER TO postgres;

--
-- Name: FUNCTION mark_messages_as_read(p_message_ids uuid[]); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.mark_messages_as_read(p_message_ids uuid[]) IS 'Marks specified messages as read for the current user, returns count of updated messages';


--
-- Name: post_financial_transaction(uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.post_financial_transaction(p_transaction_id uuid, p_user_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION public.post_financial_transaction(p_transaction_id uuid, p_user_id uuid) OWNER TO postgres;

--
-- Name: process_payment_webhook_atomic(text[], text, jsonb, text, jsonb, boolean); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.process_payment_webhook_atomic(p_quote_ids text[], p_payment_status text, p_payment_data jsonb, p_guest_session_token text DEFAULT NULL::text, p_guest_session_data jsonb DEFAULT NULL::jsonb, p_create_order boolean DEFAULT false) RETURNS TABLE(success boolean, payment_transaction_id uuid, payment_ledger_entry_id uuid, quotes_updated boolean, guest_session_updated boolean, order_id uuid, error_message text)
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION public.process_payment_webhook_atomic(p_quote_ids text[], p_payment_status text, p_payment_data jsonb, p_guest_session_token text, p_guest_session_data jsonb, p_create_order boolean) OWNER TO postgres;

--
-- Name: FUNCTION process_payment_webhook_atomic(p_quote_ids text[], p_payment_status text, p_payment_data jsonb, p_guest_session_token text, p_guest_session_data jsonb, p_create_order boolean); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.process_payment_webhook_atomic(p_quote_ids text[], p_payment_status text, p_payment_data jsonb, p_guest_session_token text, p_guest_session_data jsonb, p_create_order boolean) IS 'Atomically processes payment webhook data including quotes update, guest session handling, payment transaction creation, payment ledger entries, and order creation. Ensures all operations succeed or fail together with comprehensive audit trail.';


--
-- Name: process_refund_atomic(uuid, numeric, jsonb, jsonb, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.process_refund_atomic(p_quote_id uuid, p_refund_amount numeric, p_refund_data jsonb, p_gateway_response jsonb, p_processed_by uuid) RETURNS TABLE(success boolean, refund_id uuid, payment_transaction_updated boolean, quote_updated boolean, ledger_entry_id uuid, error_message text)
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION public.process_refund_atomic(p_quote_id uuid, p_refund_amount numeric, p_refund_data jsonb, p_gateway_response jsonb, p_processed_by uuid) OWNER TO postgres;

--
-- Name: FUNCTION process_refund_atomic(p_quote_id uuid, p_refund_amount numeric, p_refund_data jsonb, p_gateway_response jsonb, p_processed_by uuid); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.process_refund_atomic(p_quote_id uuid, p_refund_amount numeric, p_refund_data jsonb, p_gateway_response jsonb, p_processed_by uuid) IS 'Atomically processes refund operations including gateway_refunds insertion, payment_ledger entry, payment_transactions update, and quotes adjustment. Ensures all operations succeed or fail together with comprehensive audit trail and financial consistency.';


--
-- Name: process_refund_item(uuid, text, jsonb, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.process_refund_item(p_refund_item_id uuid, p_gateway_refund_id text, p_gateway_response jsonb DEFAULT NULL::jsonb, p_status text DEFAULT 'completed'::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION public.process_refund_item(p_refund_item_id uuid, p_gateway_refund_id text, p_gateway_response jsonb, p_status text) OWNER TO postgres;

--
-- Name: profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    full_name text,
    country text,
    preferred_display_currency text,
    avatar_url text,
    cod_enabled boolean DEFAULT false,
    internal_notes text,
    referral_code text,
    total_orders integer DEFAULT 0,
    total_spent numeric(10,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    email text,
    preferred_payment_gateway text,
    CONSTRAINT profiles_email_check CHECK ((email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text)),
    CONSTRAINT valid_country CHECK (((country IS NULL) OR (country ~ '^[A-Z]{2}$'::text)))
);


ALTER TABLE public.profiles OWNER TO postgres;

--
-- Name: TABLE profiles; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.profiles IS 'User profiles table - phone numbers are stored in auth.users.phone, not here';


--
-- Name: COLUMN profiles.preferred_display_currency; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.profiles.preferred_display_currency IS 'User preferred display currency - now accepts any currency code from country_settings table instead of hardcoded list';


--
-- Name: profiles_quotes(public.profiles); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.profiles_quotes(public.profiles) RETURNS SETOF public.quotes
    LANGUAGE sql STABLE
    AS $_$
  SELECT * FROM quotes WHERE user_id = $1.id;
$_$;


ALTER FUNCTION public.profiles_quotes(public.profiles) OWNER TO postgres;

--
-- Name: FUNCTION profiles_quotes(public.profiles); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.profiles_quotes(public.profiles) IS '@fieldName quotes';


--
-- Name: quotes_profile(public.quotes); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.quotes_profile(public.quotes) RETURNS SETOF public.profiles
    LANGUAGE sql STABLE
    AS $_$
  SELECT * FROM profiles WHERE id = $1.user_id;
$_$;


ALTER FUNCTION public.quotes_profile(public.quotes) OWNER TO postgres;

--
-- Name: FUNCTION quotes_profile(public.quotes); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.quotes_profile(public.quotes) IS '@fieldName profile';


--
-- Name: record_payment_with_ledger_and_triggers(uuid, numeric, text, text, text, text, uuid, date); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.record_payment_with_ledger_and_triggers(p_quote_id uuid, p_amount numeric, p_currency text, p_payment_method text, p_transaction_reference text, p_notes text DEFAULT NULL::text, p_recorded_by uuid DEFAULT NULL::uuid, p_payment_date date DEFAULT CURRENT_DATE) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION public.record_payment_with_ledger_and_triggers(p_quote_id uuid, p_amount numeric, p_currency text, p_payment_method text, p_transaction_reference text, p_notes text, p_recorded_by uuid, p_payment_date date) OWNER TO postgres;

--
-- Name: FUNCTION record_payment_with_ledger_and_triggers(p_quote_id uuid, p_amount numeric, p_currency text, p_payment_method text, p_transaction_reference text, p_notes text, p_recorded_by uuid, p_payment_date date); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.record_payment_with_ledger_and_triggers(p_quote_id uuid, p_amount numeric, p_currency text, p_payment_method text, p_transaction_reference text, p_notes text, p_recorded_by uuid, p_payment_date date) IS 'Records manual payment with full ledger integration and triggers payment status recalculation';


--
-- Name: record_paypal_payment_to_ledger(uuid, uuid, numeric, text, text, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.record_paypal_payment_to_ledger(p_quote_id uuid, p_transaction_id uuid, p_amount numeric, p_currency text, p_order_id text, p_capture_id text DEFAULT NULL::text, p_payer_email text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION public.record_paypal_payment_to_ledger(p_quote_id uuid, p_transaction_id uuid, p_amount numeric, p_currency text, p_order_id text, p_capture_id text, p_payer_email text) OWNER TO postgres;

--
-- Name: refresh_hsn_search_cache(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.refresh_hsn_search_cache() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY hsn_search_optimized;
END;
$$;


ALTER FUNCTION public.refresh_hsn_search_cache() OWNER TO postgres;

--
-- Name: regenerate_backup_codes(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.regenerate_backup_codes() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_user_id UUID;
    v_backup_codes TEXT[];
    v_code TEXT;
    i INTEGER;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Not authenticated'
        );
    END IF;
    
    -- Check if user has MFA enabled
    IF NOT EXISTS (
        SELECT 1 FROM mfa_configurations 
        WHERE user_id = v_user_id AND totp_enabled = true
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'MFA not enabled'
        );
    END IF;
    
    -- Generate new backup codes
    v_backup_codes := ARRAY[]::TEXT[];
    FOR i IN 1..8 LOOP
        v_code := UPPER(
            SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT), 1, 4) || 
            SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT), 1, 4)
        );
        v_backup_codes := array_append(v_backup_codes, v_code);
    END LOOP;
    
    -- Update backup codes
    UPDATE mfa_configurations
    SET 
        backup_codes = v_backup_codes,
        backup_codes_generated_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = v_user_id;
    
    -- Log the activity
    INSERT INTO mfa_activity_log (user_id, activity_type, ip_address)
    VALUES (v_user_id, 'backup_codes_regenerated', inet_client_addr());
    
    RETURN jsonb_build_object(
        'success', true,
        'backupCodes', v_backup_codes
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;


ALTER FUNCTION public.regenerate_backup_codes() OWNER TO postgres;

--
-- Name: requires_mfa(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.requires_mfa(p_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_user_role TEXT;
    v_mfa_enabled BOOLEAN;
BEGIN
    -- Get user role
    SELECT role INTO v_user_role
    FROM user_roles
    WHERE user_id = p_user_id
    AND is_active = true
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Admins and moderators require MFA
    IF v_user_role IN ('admin', 'moderator') THEN
        -- Check if MFA is set up and enabled
        SELECT totp_enabled INTO v_mfa_enabled
        FROM mfa_configurations
        WHERE user_id = p_user_id;
        
        -- If no MFA config exists, they need to set it up
        RETURN COALESCE(v_mfa_enabled, true);
    END IF;
    
    RETURN false;
END;
$$;


ALTER FUNCTION public.requires_mfa(p_user_id uuid) OWNER TO postgres;

--
-- Name: reverse_financial_transaction(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.reverse_financial_transaction(p_transaction_id uuid, p_user_id uuid, p_reason text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION public.reverse_financial_transaction(p_transaction_id uuid, p_user_id uuid, p_reason text) OWNER TO postgres;

--
-- Name: rollback_tax_standardization_20250128(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.rollback_tax_standardization_20250128() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    RAISE NOTICE 'ROLLING BACK TAX STANDARDIZATION MIGRATION...';
    
    -- Remove constraints
    ALTER TABLE country_settings DROP CONSTRAINT IF EXISTS check_vat_percentage_range;
    ALTER TABLE country_settings DROP CONSTRAINT IF EXISTS check_sales_tax_percentage_range;
    
    -- Restore from backup
    UPDATE country_settings 
    SET vat = backup.vat,
        sales_tax = backup.sales_tax
    FROM tax_backup_20250128 backup
    WHERE country_settings.code = backup.code;
    
    RAISE NOTICE 'ROLLBACK COMPLETED - Tax values restored to original decimal format';
END;
$$;


ALTER FUNCTION public.rollback_tax_standardization_20250128() OWNER TO postgres;

--
-- Name: send_welcome_email(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.send_welcome_email() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION public.send_welcome_email() OWNER TO postgres;

--
-- Name: set_quote_expiration(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_quote_expiration() RETURNS trigger
    LANGUAGE plpgsql
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


ALTER FUNCTION public.set_quote_expiration() OWNER TO postgres;

--
-- Name: set_share_token(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_share_token() RETURNS trigger
    LANGUAGE plpgsql
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


ALTER FUNCTION public.set_share_token() OWNER TO postgres;

--
-- Name: setup_mfa(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.setup_mfa() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_user_id UUID;
    v_user_email TEXT;
    v_secret TEXT;
    v_backup_codes TEXT[];
    v_existing BOOLEAN;
    v_qr_uri TEXT;
    i INTEGER;
    v_code TEXT;
    v_random_bytes BYTEA;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Not authenticated'
        );
    END IF;

    -- Get user email
    SELECT email INTO v_user_email
    FROM auth.users
    WHERE id = v_user_id;

    IF v_user_email IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User email not found'
        );
    END IF;

    -- Check if MFA already exists
    SELECT EXISTS(
        SELECT 1 FROM mfa_configurations
        WHERE user_id = v_user_id
    ) INTO v_existing;

    IF v_existing THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'MFA already configured'
        );
    END IF;

    -- Generate 20 random bytes for the secret
    v_random_bytes := gen_random_bytes(20);
    
    -- Encode as base32
    v_secret := encode_base32(v_random_bytes);
    
    -- Remove padding for TOTP (optional but cleaner)
    v_secret := rtrim(v_secret, '=');

    -- Generate backup codes manually (8 codes, 8 characters each)
    v_backup_codes := ARRAY[]::TEXT[];
    FOR i IN 1..8 LOOP
        v_code := UPPER(
            SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT), 1, 4) || 
            SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT), 1, 4)
        );
        v_backup_codes := array_append(v_backup_codes, v_code);
    END LOOP;

    -- Create QR URI
    v_qr_uri := 'otpauth://totp/iwishBag:' || v_user_email || '?secret=' || v_secret || '&issuer=iwishBag&algorithm=SHA1&digits=6&period=30';

    -- Insert configuration
    INSERT INTO mfa_configurations (
        user_id,
        totp_secret,
        backup_codes,
        totp_verified,
        totp_enabled
    ) VALUES (
        v_user_id,
        v_secret,
        v_backup_codes,
        false,
        false
    );

    -- Log activity
    INSERT INTO mfa_activity_log (user_id, activity_type, ip_address, success)
    VALUES (v_user_id, 'setup_initiated', inet_client_addr(), true);

    RETURN jsonb_build_object(
        'success', true,
        'secret', v_secret,
        'qr_uri', v_qr_uri,
        'backup_codes', v_backup_codes
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;


ALTER FUNCTION public.setup_mfa() OWNER TO postgres;

--
-- Name: start_reconciliation_session(text, text, date, date, date); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.start_reconciliation_session(p_payment_method text, p_gateway_code text DEFAULT NULL::text, p_statement_date date DEFAULT CURRENT_DATE, p_statement_start_date date DEFAULT NULL::date, p_statement_end_date date DEFAULT NULL::date) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION public.start_reconciliation_session(p_payment_method text, p_gateway_code text, p_statement_date date, p_statement_start_date date, p_statement_end_date date) OWNER TO postgres;

--
-- Name: sync_payment_record_to_ledger(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sync_payment_record_to_ledger() RETURNS trigger
    LANGUAGE plpgsql
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


ALTER FUNCTION public.sync_payment_record_to_ledger() OWNER TO postgres;

--
-- Name: FUNCTION sync_payment_record_to_ledger(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.sync_payment_record_to_ledger() IS 'Simplified sync function without USD conversion columns';


--
-- Name: sync_quote_payment_amounts(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sync_quote_payment_amounts() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION public.sync_quote_payment_amounts() OWNER TO postgres;

--
-- Name: test_payment_update_direct(uuid, numeric, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.test_payment_update_direct(quote_id uuid, new_amount_paid numeric, new_payment_status text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


ALTER FUNCTION public.test_payment_update_direct(quote_id uuid, new_amount_paid numeric, new_payment_status text) OWNER TO postgres;

--
-- Name: trigger_paypal_webhook_events_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_paypal_webhook_events_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.trigger_paypal_webhook_events_updated_at() OWNER TO postgres;

--
-- Name: trigger_tax_method_audit(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_tax_method_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Only log if tax method preferences actually changed
    IF (OLD.calculation_method_preference IS DISTINCT FROM NEW.calculation_method_preference) 
    OR (OLD.valuation_method_preference IS DISTINCT FROM NEW.valuation_method_preference) THEN
        
        INSERT INTO tax_calculation_audit_log (
            quote_id,
            calculation_method,
            valuation_method,
            previous_calculation_method,
            previous_valuation_method,
            change_reason,
            change_details
        ) VALUES (
            NEW.id,
            NEW.calculation_method_preference,
            NEW.valuation_method_preference,
            OLD.calculation_method_preference,
            OLD.valuation_method_preference,
            'automatic_update',
            jsonb_build_object(
                'trigger', 'quote_update',
                'timestamp', now(),
                'auto_logged', true
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.trigger_tax_method_audit() OWNER TO postgres;

--
-- Name: trigger_update_payment_status(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_update_payment_status() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Update the related quote's payment status
  UPDATE quotes
  SET updated_at = now()
  WHERE id = COALESCE(NEW.quote_id, OLD.quote_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION public.trigger_update_payment_status() OWNER TO postgres;

--
-- Name: update_authenticated_checkout_sessions_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_authenticated_checkout_sessions_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_authenticated_checkout_sessions_updated_at() OWNER TO postgres;

--
-- Name: update_category_weights(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_category_weights() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Update category statistics when a new product weight is added/updated
  INSERT INTO ml_category_weights (category, min_weight, max_weight, avg_weight, sample_count)
  VALUES (
    COALESCE(NEW.category, 'general'),
    NEW.weight_kg,
    NEW.weight_kg,
    NEW.weight_kg,
    1
  )
  ON CONFLICT (category) DO UPDATE SET
    min_weight = LEAST(ml_category_weights.min_weight, NEW.weight_kg),
    max_weight = GREATEST(ml_category_weights.max_weight, NEW.weight_kg),
    avg_weight = (ml_category_weights.avg_weight * ml_category_weights.sample_count + NEW.weight_kg) / (ml_category_weights.sample_count + 1),
    sample_count = ml_category_weights.sample_count + 1,
    last_updated = now();
    
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_category_weights() OWNER TO postgres;

--
-- Name: update_country_payment_preferences_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_country_payment_preferences_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_country_payment_preferences_updated_at() OWNER TO postgres;

--
-- Name: update_guest_checkout_sessions_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_guest_checkout_sessions_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_guest_checkout_sessions_updated_at() OWNER TO postgres;

--
-- Name: update_location_capacity(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_location_capacity(location_code text, capacity_change integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE warehouse_locations 
  SET current_packages = current_packages + capacity_change,
      updated_at = NOW()
  WHERE location_code = update_location_capacity.location_code;
END;
$$;


ALTER FUNCTION public.update_location_capacity(location_code text, capacity_change integer) OWNER TO postgres;

--
-- Name: update_payment_links_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_payment_links_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_payment_links_updated_at() OWNER TO postgres;

--
-- Name: update_payment_refund_totals(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_payment_refund_totals() RETURNS trigger
    LANGUAGE plpgsql
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


ALTER FUNCTION public.update_payment_refund_totals() OWNER TO postgres;

--
-- Name: update_payment_status(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_payment_status() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION public.update_payment_status() OWNER TO postgres;

--
-- Name: update_paypal_refunds_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_paypal_refunds_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_paypal_refunds_updated_at() OWNER TO postgres;

--
-- Name: update_quote_documents_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_quote_documents_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_quote_documents_updated_at() OWNER TO postgres;

--
-- Name: update_quote_view_tracking(uuid, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_quote_view_tracking(p_quote_id uuid, p_duration_seconds integer DEFAULT 0) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE quotes 
    SET 
        first_viewed_at = COALESCE(first_viewed_at, now()),
        last_viewed_at = now(),
        view_count = view_count + 1,
        total_view_duration = total_view_duration + p_duration_seconds
    WHERE id = p_quote_id;
END;
$$;


ALTER FUNCTION public.update_quote_view_tracking(p_quote_id uuid, p_duration_seconds integer) OWNER TO postgres;

--
-- Name: update_quotes_unified_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_quotes_unified_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_quotes_unified_updated_at() OWNER TO postgres;

--
-- Name: update_route_customs_tiers_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_route_customs_tiers_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_route_customs_tiers_updated_at() OWNER TO postgres;

--
-- Name: update_support_ticket_status(uuid, character varying, uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_support_ticket_status(p_support_id uuid, p_new_status character varying, p_user_id uuid, p_reason text DEFAULT NULL::text) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
    old_status VARCHAR;
    success BOOLEAN DEFAULT false;
BEGIN
    -- Get current status
    SELECT ticket_data->>'status' INTO old_status
    FROM support_system 
    WHERE id = p_support_id AND system_type = 'ticket';
    
    -- Update the ticket status
    UPDATE support_system 
    SET 
        ticket_data = jsonb_set(
            jsonb_set(ticket_data, '{status}', to_jsonb(p_new_status)),
            '{metadata,last_status_change}', to_jsonb(now())
        ),
        updated_at = now()
    WHERE id = p_support_id AND system_type = 'ticket';
    
    IF FOUND THEN
        success := true;
    END IF;
    
    -- Log the status change
    IF success AND old_status != p_new_status THEN
        PERFORM add_support_interaction(
            p_support_id,
            p_user_id,
            'status_change',
            jsonb_build_object(
                'from_status', old_status,
                'to_status', p_new_status,
                'reason', COALESCE(p_reason, 'Status updated'),
                'automatic', false
            ),
            false
        );
    END IF;
    
    RETURN success;
END;
$$;


ALTER FUNCTION public.update_support_ticket_status(p_support_id uuid, p_new_status character varying, p_user_id uuid, p_reason text) OWNER TO postgres;

--
-- Name: update_support_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_support_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_support_updated_at() OWNER TO postgres;

--
-- Name: update_tag_usage_count(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_tag_usage_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.blog_tags SET usage_count = usage_count + 1 WHERE id = NEW.tag_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.blog_tags SET usage_count = usage_count - 1 WHERE id = OLD.tag_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION public.update_tag_usage_count() OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

--
-- Name: validate_delivery_options(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validate_delivery_options() RETURNS trigger
    LANGUAGE plpgsql
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


ALTER FUNCTION public.validate_delivery_options() OWNER TO postgres;

--
-- Name: validate_quotes_unified(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validate_quotes_unified() RETURNS TABLE(quote_id uuid, issue text, severity text)
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Check for quotes without items
  RETURN QUERY
  SELECT id, 'No items found', 'ERROR'
  FROM quotes_unified 
  WHERE jsonb_array_length(items) = 0;
  
  -- Check for invalid totals
  RETURN QUERY
  SELECT id, 'Invalid financial totals', 'WARNING'
  FROM quotes_unified 
  WHERE costprice_total_usd < 0 OR final_total_usd < 0;
  
  -- Check for missing customer data for non-anonymous quotes
  RETURN QUERY
  SELECT id, 'Missing customer data for non-anonymous quote', 'WARNING'
  FROM quotes_unified 
  WHERE NOT is_anonymous 
  AND user_id IS NULL 
  AND (customer_data->'info'->>'email') IS NULL;
END;
$$;


ALTER FUNCTION public.validate_quotes_unified() OWNER TO postgres;

--
-- Name: verify_mfa_login(text, boolean); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.verify_mfa_login(p_code text, p_is_backup_code boolean DEFAULT false) RETURNS TABLE(verified boolean, session_token text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_user_id UUID;
    v_verified BOOLEAN := false;
    v_session_token TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    IF p_is_backup_code THEN
        -- Verify backup code (implement this)
        v_verified := false; -- Placeholder
    ELSE
        -- Verify TOTP code
        v_verified := verify_totp_code(v_user_id, p_code);
    END IF;
    
    IF v_verified THEN
        -- Generate session token
        v_session_token := encode(gen_random_bytes(32), 'hex');
        
        -- Create MFA session
        INSERT INTO mfa_sessions (
            user_id,
            session_token,
            ip_address,
            user_agent
        ) VALUES (
            v_user_id,
            v_session_token,
            inet_client_addr(),
            current_setting('request.headers', true)::json->>'user-agent'
        );
        
        -- Log success
        INSERT INTO mfa_activity_log (
            user_id,
            activity_type,
            ip_address
        ) VALUES (
            v_user_id,
            'login_success',
            inet_client_addr()
        );
    ELSE
        -- Handle failure
        PERFORM handle_mfa_failure(v_user_id);
        
        -- Log failure
        INSERT INTO mfa_activity_log (
            user_id,
            activity_type,
            ip_address
        ) VALUES (
            v_user_id,
            'login_failed',
            inet_client_addr()
        );
    END IF;
    
    RETURN QUERY
    SELECT v_verified, v_session_token;
END;
$$;


ALTER FUNCTION public.verify_mfa_login(p_code text, p_is_backup_code boolean) OWNER TO postgres;

--
-- Name: verify_mfa_setup(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.verify_mfa_setup(p_code text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_user_id UUID;
    v_verified BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    -- Verify the code
    v_verified := verify_totp_code(v_user_id, p_code);
    
    IF v_verified THEN
        -- Enable MFA
        UPDATE mfa_configurations
        SET 
            totp_verified = true,
            totp_enabled = true,
            verified_at = NOW()
        WHERE user_id = v_user_id;
        
        -- Log activity
        INSERT INTO mfa_activity_log (
            user_id,
            activity_type,
            ip_address
        ) VALUES (
            v_user_id,
            'setup_completed',
            inet_client_addr()
        );
    END IF;
    
    RETURN v_verified;
END;
$$;


ALTER FUNCTION public.verify_mfa_setup(p_code text) OWNER TO postgres;

--
-- Name: verify_quote_email(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.verify_quote_email(p_verification_token text) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    quote_id UUID;
BEGIN
    -- Find and verify the token
    UPDATE quotes 
    SET 
        email_verified = true,
        verification_token = NULL,
        verification_sent_at = NULL,
        verification_expires_at = NULL
    WHERE 
        verification_token = p_verification_token
        AND verification_expires_at > now()
        AND email_verified = false
    RETURNING id INTO quote_id;
    
    -- Log successful verification
    IF quote_id IS NOT NULL THEN
        PERFORM log_share_action(
            quote_id,
            auth.uid(),
            'email_verified',
            NULL,
            NULL,
            jsonb_build_object('token', p_verification_token)
        );
    END IF;
    
    RETURN quote_id;
END;
$$;


ALTER FUNCTION public.verify_quote_email(p_verification_token text) OWNER TO postgres;

--
-- Name: verify_totp_code(uuid, text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.verify_totp_code(p_user_id uuid, p_code text, p_window integer DEFAULT 1) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    -- For development, always return true for 6-digit codes
    RETURN verify_totp_code_dev(p_user_id, p_code, p_window);
END;
$$;


ALTER FUNCTION public.verify_totp_code(p_user_id uuid, p_code text, p_window integer) OWNER TO postgres;

--
-- Name: verify_totp_code_dev(uuid, text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.verify_totp_code_dev(p_user_id uuid, p_code text, p_window integer DEFAULT 1) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $_$
BEGIN
    -- In development, accept any 6-digit code
    RETURN (LENGTH(p_code) = 6 AND p_code ~ '^[0-9]+$');
END;
$_$;


ALTER FUNCTION public.verify_totp_code_dev(p_user_id uuid, p_code text, p_window integer) OWNER TO postgres;

--
-- Name: verify_totp_setup(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.verify_totp_setup(p_code text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $_$
DECLARE
    v_user_id UUID;
    v_valid BOOLEAN := false;
    v_is_dev BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'verified', false,
            'error', 'Not authenticated'
        );
    END IF;
    
    -- Check if user has pending MFA setup
    IF NOT EXISTS (
        SELECT 1 FROM mfa_configurations 
        WHERE user_id = v_user_id AND totp_verified = false
    ) THEN
        RETURN jsonb_build_object(
            'verified', false,
            'error', 'No pending MFA setup found'
        );
    END IF;
    
    -- For local development, always consider it development mode
    -- Check multiple conditions to ensure we catch development environment
    v_is_dev := true; -- Force development mode for now
    
    -- In development, accept any 6-digit code or the test code '123456'
    IF v_is_dev THEN
        IF (LENGTH(p_code) = 6 AND p_code ~ '^[0-9]+$') OR p_code = '123456' THEN
            v_valid := true;
        END IF;
    END IF;
    
    IF v_valid THEN
        -- Mark MFA as verified and enabled
        UPDATE mfa_configurations
        SET 
            totp_verified = true,
            totp_enabled = true,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = v_user_id;
        
        -- Log successful setup
        INSERT INTO mfa_activity_log (user_id, activity_type, ip_address, success)
        VALUES (v_user_id, 'setup_completed', inet_client_addr(), true);
        
        RETURN jsonb_build_object(
            'verified', true,
            'success', true
        );
    ELSE
        RETURN jsonb_build_object(
            'verified', false,
            'success', false,
            'error', 'Invalid verification code'
        );
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'verified', false,
            'success', false,
            'error', SQLERRM
        );
END;
$_$;


ALTER FUNCTION public.verify_totp_setup(p_code text) OWNER TO postgres;

--
-- Name: extensions; Type: TABLE; Schema: _realtime; Owner: supabase_admin
--

CREATE TABLE _realtime.extensions (
    id uuid NOT NULL,
    type text,
    settings jsonb,
    tenant_external_id text,
    inserted_at timestamp(0) without time zone NOT NULL,
    updated_at timestamp(0) without time zone NOT NULL
);


ALTER TABLE _realtime.extensions OWNER TO supabase_admin;

--
-- Name: schema_migrations; Type: TABLE; Schema: _realtime; Owner: supabase_admin
--

CREATE TABLE _realtime.schema_migrations (
    version bigint NOT NULL,
    inserted_at timestamp(0) without time zone
);


ALTER TABLE _realtime.schema_migrations OWNER TO supabase_admin;

--
-- Name: tenants; Type: TABLE; Schema: _realtime; Owner: supabase_admin
--

CREATE TABLE _realtime.tenants (
    id uuid NOT NULL,
    name text,
    external_id text,
    jwt_secret text,
    max_concurrent_users integer DEFAULT 200 NOT NULL,
    inserted_at timestamp(0) without time zone NOT NULL,
    updated_at timestamp(0) without time zone NOT NULL,
    max_events_per_second integer DEFAULT 100 NOT NULL,
    postgres_cdc_default text DEFAULT 'postgres_cdc_rls'::text,
    max_bytes_per_second integer DEFAULT 100000 NOT NULL,
    max_channels_per_client integer DEFAULT 100 NOT NULL,
    max_joins_per_second integer DEFAULT 500 NOT NULL,
    suspend boolean DEFAULT false,
    jwt_jwks jsonb,
    notify_private_alpha boolean DEFAULT false,
    private_only boolean DEFAULT false NOT NULL,
    migrations_ran integer DEFAULT 0,
    broadcast_adapter character varying(255) DEFAULT 'phoenix'::character varying
);


ALTER TABLE _realtime.tenants OWNER TO supabase_admin;

--
-- Name: admin_overrides; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_overrides (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    override_type text NOT NULL,
    scope text NOT NULL,
    scope_identifier text,
    override_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    admin_id uuid,
    justification text,
    expires_at timestamp with time zone,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT admin_overrides_override_type_check CHECK ((override_type = ANY (ARRAY['tax_rate'::text, 'hsn_code'::text, 'weight'::text, 'minimum_valuation'::text, 'exemption'::text]))),
    CONSTRAINT admin_overrides_scope_check CHECK ((scope = ANY (ARRAY['route'::text, 'category'::text, 'product'::text, 'global'::text])))
);


ALTER TABLE public.admin_overrides OWNER TO postgres;

--
-- Name: authenticated_checkout_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.authenticated_checkout_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_token text NOT NULL,
    user_id uuid NOT NULL,
    quote_ids text[] NOT NULL,
    temporary_shipping_address jsonb,
    payment_currency text NOT NULL,
    payment_method text NOT NULL,
    payment_amount numeric(10,2) NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT authenticated_checkout_sessions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'expired'::text, 'failed'::text])))
);


ALTER TABLE public.authenticated_checkout_sessions OWNER TO postgres;

--
-- Name: TABLE authenticated_checkout_sessions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.authenticated_checkout_sessions IS 'Temporary storage for authenticated user checkout data to prevent quote contamination before payment confirmation';


--
-- Name: bank_statement_imports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bank_statement_imports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reconciliation_id uuid,
    file_name text NOT NULL,
    file_url text,
    file_format text,
    total_rows integer,
    processed_rows integer DEFAULT 0,
    successful_rows integer DEFAULT 0,
    failed_rows integer DEFAULT 0,
    status text DEFAULT 'pending'::text,
    error_log jsonb DEFAULT '[]'::jsonb,
    imported_by uuid NOT NULL,
    imported_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT bank_statement_imports_file_format_check CHECK ((file_format = ANY (ARRAY['csv'::text, 'excel'::text, 'pdf'::text, 'mt940'::text, 'ofx'::text, 'qif'::text, 'manual'::text]))),
    CONSTRAINT bank_statement_imports_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text, 'partial'::text])))
);


ALTER TABLE public.bank_statement_imports OWNER TO postgres;

--
-- Name: TABLE bank_statement_imports; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.bank_statement_imports IS 'Log of bank statement file imports';


--
-- Name: blog_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.blog_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    description text,
    color character varying(7) DEFAULT '#0088cc'::character varying,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.blog_categories OWNER TO postgres;

--
-- Name: blog_comments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.blog_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_id uuid,
    user_id uuid,
    author_name character varying(100),
    author_email character varying(255),
    content text NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    parent_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT blog_comments_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('approved'::character varying)::text, ('rejected'::character varying)::text, ('spam'::character varying)::text])))
);


ALTER TABLE public.blog_comments OWNER TO postgres;

--
-- Name: blog_post_tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.blog_post_tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_id uuid NOT NULL,
    tag_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.blog_post_tags OWNER TO postgres;

--
-- Name: blog_posts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.blog_posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    excerpt text,
    content text NOT NULL,
    featured_image_url text,
    status character varying(20) DEFAULT 'draft'::character varying,
    featured boolean DEFAULT false,
    reading_time_minutes integer DEFAULT 0,
    category_id uuid NOT NULL,
    author_id uuid NOT NULL,
    meta_title character varying(60),
    meta_description character varying(160),
    og_title character varying(60),
    og_description character varying(160),
    og_image text,
    twitter_title character varying(60),
    twitter_description character varying(160),
    twitter_image text,
    focus_keyword character varying(255),
    canonical_url text,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    views_count integer DEFAULT 0,
    CONSTRAINT blog_posts_status_check CHECK (((status)::text = ANY (ARRAY[('draft'::character varying)::text, ('published'::character varying)::text, ('archived'::character varying)::text])))
);


ALTER TABLE public.blog_posts OWNER TO postgres;

--
-- Name: blog_tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.blog_tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.blog_tags OWNER TO postgres;

--
-- Name: chart_of_accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chart_of_accounts (
    code text NOT NULL,
    name text NOT NULL,
    account_type text NOT NULL,
    parent_code text,
    is_active boolean DEFAULT true,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chart_of_accounts_account_type_check CHECK ((account_type = ANY (ARRAY['asset'::text, 'liability'::text, 'equity'::text, 'revenue'::text, 'expense'::text])))
);


ALTER TABLE public.chart_of_accounts OWNER TO postgres;

--
-- Name: TABLE chart_of_accounts; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.chart_of_accounts IS 'Chart of accounts for double-entry bookkeeping system';


--
-- Name: consolidation_groups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.consolidation_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    group_name text,
    package_count integer DEFAULT 0,
    original_package_ids uuid[] DEFAULT '{}'::uuid[],
    consolidated_weight_kg numeric(10,3),
    consolidated_dimensions jsonb,
    consolidated_photos jsonb DEFAULT '[]'::jsonb,
    consolidation_fee_usd numeric(10,2) DEFAULT 0,
    storage_fees_usd numeric(10,2) DEFAULT 0,
    service_fee_usd numeric(10,2) DEFAULT 0,
    status text DEFAULT 'pending'::text,
    consolidated_by_staff_id uuid,
    consolidation_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    quote_id uuid,
    CONSTRAINT consolidation_groups_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'consolidated'::text, 'shipped'::text, 'delivered'::text])))
);


ALTER TABLE public.consolidation_groups OWNER TO postgres;

--
-- Name: country_payment_preferences; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.country_payment_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    country_code text NOT NULL,
    gateway_code text NOT NULL,
    priority integer NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.country_payment_preferences OWNER TO postgres;

--
-- Name: TABLE country_payment_preferences; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.country_payment_preferences IS 'Country-specific payment gateway preferences and priorities';


--
-- Name: country_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.country_settings (
    code text NOT NULL,
    name text NOT NULL,
    currency text NOT NULL,
    rate_from_usd numeric(15,6) NOT NULL,
    sales_tax numeric(5,2) DEFAULT 0,
    vat numeric(5,2) DEFAULT 0,
    min_shipping numeric(10,2) DEFAULT 0,
    additional_shipping numeric(10,2) DEFAULT 0,
    additional_weight numeric(8,2) DEFAULT 0,
    weight_unit text DEFAULT 'kg'::text,
    volumetric_divisor integer DEFAULT 5000,
    payment_gateway_fixed_fee numeric(10,2) DEFAULT 0,
    payment_gateway_percent_fee numeric(5,2) DEFAULT 0,
    purchase_allowed boolean DEFAULT true,
    shipping_allowed boolean DEFAULT true,
    payment_gateway text DEFAULT 'stripe'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    minimum_payment_amount numeric(10,2) DEFAULT 10,
    decimal_places integer DEFAULT 2,
    thousand_separator text DEFAULT ','::text,
    decimal_separator text DEFAULT '.'::text,
    symbol_position text DEFAULT 'before'::text,
    symbol_space boolean DEFAULT false,
    priority_thresholds jsonb DEFAULT '{"low": 0, "normal": 500, "urgent": 2000}'::jsonb,
    available_gateways text[] DEFAULT ARRAY['bank_transfer'::text],
    default_gateway text DEFAULT 'bank_transfer'::text,
    gateway_config jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT check_sales_tax_percentage_range CHECK (((sales_tax >= (0)::numeric) AND (sales_tax <= (100)::numeric))),
    CONSTRAINT check_vat_percentage_range CHECK (((vat >= (0)::numeric) AND (vat <= (100)::numeric))),
    CONSTRAINT country_settings_additional_shipping_check CHECK ((additional_shipping >= (0)::numeric)),
    CONSTRAINT country_settings_additional_weight_check CHECK ((additional_weight >= (0)::numeric)),
    CONSTRAINT country_settings_code_check CHECK ((code ~ '^[A-Z]{2}$'::text)),
    CONSTRAINT country_settings_decimal_places_check CHECK (((decimal_places >= 0) AND (decimal_places <= 8))),
    CONSTRAINT country_settings_decimal_separator_check CHECK ((length(decimal_separator) <= 3)),
    CONSTRAINT country_settings_min_shipping_check CHECK ((min_shipping >= (0)::numeric)),
    CONSTRAINT country_settings_minimum_payment_amount_check CHECK ((minimum_payment_amount >= (0)::numeric)),
    CONSTRAINT country_settings_payment_gateway_fixed_fee_check CHECK ((payment_gateway_fixed_fee >= (0)::numeric)),
    CONSTRAINT country_settings_payment_gateway_percent_fee_check CHECK ((payment_gateway_percent_fee >= (0)::numeric)),
    CONSTRAINT country_settings_rate_from_usd_check CHECK ((rate_from_usd > (0)::numeric)),
    CONSTRAINT country_settings_sales_tax_check CHECK ((sales_tax >= (0)::numeric)),
    CONSTRAINT country_settings_symbol_position_check CHECK ((symbol_position = ANY (ARRAY['before'::text, 'after'::text]))),
    CONSTRAINT country_settings_thousand_separator_check CHECK ((length(thousand_separator) <= 3)),
    CONSTRAINT country_settings_vat_check CHECK ((vat >= (0)::numeric)),
    CONSTRAINT country_settings_volumetric_divisor_check CHECK ((volumetric_divisor > 0)),
    CONSTRAINT country_settings_weight_unit_check CHECK ((weight_unit = ANY (ARRAY['kg'::text, 'lbs'::text])))
);


ALTER TABLE public.country_settings OWNER TO postgres;

--
-- Name: TABLE country_settings; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.country_settings IS 'Country configurations for currency, exchange rates, and payment processing. Exchange rates should be updated regularly.';


--
-- Name: COLUMN country_settings.sales_tax; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.country_settings.sales_tax IS 'Sales tax percentage (0-100 range, e.g., 8 = 8%)';


--
-- Name: COLUMN country_settings.vat; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.country_settings.vat IS 'VAT/GST percentage (0-100 range, e.g., 13 = 13%)';


--
-- Name: COLUMN country_settings.minimum_payment_amount; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.country_settings.minimum_payment_amount IS 'Minimum amount required for payments in this currency';


--
-- Name: COLUMN country_settings.decimal_places; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.country_settings.decimal_places IS 'Number of decimal places to display for this currency';


--
-- Name: COLUMN country_settings.thousand_separator; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.country_settings.thousand_separator IS 'Character used to separate thousands (e.g., comma in 1,000)';


--
-- Name: COLUMN country_settings.decimal_separator; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.country_settings.decimal_separator IS 'Character used for decimal point (e.g., period in 1.50)';


--
-- Name: COLUMN country_settings.symbol_position; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.country_settings.symbol_position IS 'Whether currency symbol appears before or after the amount';


--
-- Name: COLUMN country_settings.symbol_space; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.country_settings.symbol_space IS 'Whether to include space between currency symbol and amount';


--
-- Name: COLUMN country_settings.priority_thresholds; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.country_settings.priority_thresholds IS 'JSON object mapping priority levels (low, normal, urgent) to amount thresholds in the country''s main currency.';


--
-- Name: credit_note_applications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.credit_note_applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    credit_note_id uuid NOT NULL,
    quote_id uuid NOT NULL,
    applied_amount numeric(15,4) NOT NULL,
    currency text NOT NULL,
    exchange_rate numeric(15,6) DEFAULT 1,
    base_amount numeric(15,4) NOT NULL,
    status text DEFAULT 'pending'::text,
    payment_ledger_id uuid,
    financial_transaction_id uuid,
    reversed_by uuid,
    reversal_reason text,
    reversed_at timestamp with time zone,
    applied_by uuid NOT NULL,
    applied_at timestamp with time zone DEFAULT now() NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT credit_note_applications_applied_amount_check CHECK ((applied_amount > (0)::numeric)),
    CONSTRAINT credit_note_applications_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'applied'::text, 'reversed'::text, 'expired'::text])))
);


ALTER TABLE public.credit_note_applications OWNER TO postgres;

--
-- Name: TABLE credit_note_applications; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.credit_note_applications IS 'Track usage of credit notes on specific orders';


--
-- Name: credit_note_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.credit_note_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    credit_note_id uuid NOT NULL,
    action text NOT NULL,
    previous_status text,
    new_status text,
    amount_change numeric(15,4),
    description text,
    performed_by uuid NOT NULL,
    performed_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT credit_note_history_action_check CHECK ((action = ANY (ARRAY['created'::text, 'approved'::text, 'applied'::text, 'partially_applied'::text, 'reversed'::text, 'extended'::text, 'cancelled'::text, 'expired'::text])))
);


ALTER TABLE public.credit_note_history OWNER TO postgres;

--
-- Name: TABLE credit_note_history; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.credit_note_history IS 'Audit trail for all credit note actions';


--
-- Name: credit_note_number_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.credit_note_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.credit_note_number_seq OWNER TO postgres;

--
-- Name: credit_notes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.credit_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    note_number text NOT NULL,
    note_type text NOT NULL,
    quote_id uuid,
    refund_request_id uuid,
    customer_id uuid NOT NULL,
    amount numeric(15,4) NOT NULL,
    currency text NOT NULL,
    exchange_rate numeric(15,6) DEFAULT 1,
    base_amount numeric(15,4) NOT NULL,
    amount_used numeric(15,4) DEFAULT 0,
    amount_available numeric(15,4) GENERATED ALWAYS AS ((amount - amount_used)) STORED,
    reason text NOT NULL,
    description text,
    valid_from date DEFAULT CURRENT_DATE,
    valid_until date,
    minimum_order_value numeric(15,4),
    allowed_categories text[],
    allowed_countries text[],
    status text DEFAULT 'active'::text,
    issued_by uuid NOT NULL,
    issued_at timestamp with time zone DEFAULT now() NOT NULL,
    approved_by uuid,
    approved_at timestamp with time zone,
    cancelled_by uuid,
    cancelled_at timestamp with time zone,
    cancellation_reason text,
    metadata jsonb DEFAULT '{}'::jsonb,
    internal_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT credit_notes_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT credit_notes_amount_used_check CHECK ((amount_used >= (0)::numeric)),
    CONSTRAINT credit_notes_note_type_check CHECK ((note_type = ANY (ARRAY['credit'::text, 'debit'::text]))),
    CONSTRAINT credit_notes_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'partially_used'::text, 'fully_used'::text, 'expired'::text, 'cancelled'::text, 'on_hold'::text])))
);


ALTER TABLE public.credit_notes OWNER TO postgres;

--
-- Name: TABLE credit_notes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.credit_notes IS 'Store credits and adjustments that can be applied to future orders';


--
-- Name: customer_addresses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customer_addresses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    suite_number text NOT NULL,
    full_address text NOT NULL,
    address_type text DEFAULT 'standard'::text,
    assigned_date timestamp with time zone DEFAULT now(),
    status text DEFAULT 'active'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT customer_addresses_address_type_check CHECK ((address_type = ANY (ARRAY['standard'::text, 'premium'::text]))),
    CONSTRAINT customer_addresses_status_check CHECK ((status = ANY (ARRAY['active'::text, 'suspended'::text, 'closed'::text])))
);


ALTER TABLE public.customer_addresses OWNER TO postgres;

--
-- Name: customs_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customs_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    duty_percent numeric(5,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.customs_categories OWNER TO postgres;

--
-- Name: customs_rules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customs_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    priority integer DEFAULT 0,
    is_active boolean DEFAULT true,
    conditions jsonb NOT NULL,
    actions jsonb NOT NULL,
    advanced jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    origin_country character varying(2),
    destination_country character varying(2)
);


ALTER TABLE public.customs_rules OWNER TO postgres;

--
-- Name: COLUMN customs_rules.origin_country; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.customs_rules.origin_country IS 'Origin country for route-specific customs rules (e.g., IN for India→US route)';


--
-- Name: COLUMN customs_rules.destination_country; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.customs_rules.destination_country IS 'Destination country for route-specific customs rules (e.g., US for India→US route)';


--
-- Name: email_queue; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.email_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recipient_email text NOT NULL,
    subject text NOT NULL,
    html_content text NOT NULL,
    text_content text,
    template_id text,
    related_entity_type text,
    related_entity_id uuid,
    status text DEFAULT 'pending'::text,
    attempts integer DEFAULT 0,
    max_attempts integer DEFAULT 3,
    scheduled_for timestamp with time zone DEFAULT now(),
    last_attempt_at timestamp with time zone,
    sent_at timestamp with time zone,
    error_message text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.email_queue OWNER TO postgres;

--
-- Name: email_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.email_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    setting_key text NOT NULL,
    setting_value text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.email_settings OWNER TO postgres;

--
-- Name: email_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.email_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    subject text NOT NULL,
    html_content text NOT NULL,
    template_type text NOT NULL,
    variables jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    category character varying(50) DEFAULT 'general'::character varying,
    auto_send boolean DEFAULT false,
    trigger_conditions jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT email_templates_category_check CHECK (((category)::text = ANY ((ARRAY['general'::character varying, 'quote_messaging'::character varying, 'status_updates'::character varying, 'payment_proof'::character varying, 'admin_notifications'::character varying])::text[])))
);


ALTER TABLE public.email_templates OWNER TO postgres;

--
-- Name: financial_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.financial_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transaction_date timestamp with time zone DEFAULT now() NOT NULL,
    transaction_type text NOT NULL,
    reference_type text NOT NULL,
    reference_id uuid NOT NULL,
    description text NOT NULL,
    debit_account text NOT NULL,
    credit_account text NOT NULL,
    amount numeric(15,4) NOT NULL,
    currency text NOT NULL,
    status text DEFAULT 'pending'::text,
    posted_at timestamp with time zone,
    reversed_by uuid,
    reversal_reason text,
    created_by uuid NOT NULL,
    approved_by uuid,
    approved_at timestamp with time zone,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT financial_transactions_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT financial_transactions_reference_type_check CHECK ((reference_type = ANY (ARRAY['quote'::text, 'payment_transaction'::text, 'refund'::text, 'adjustment'::text, 'fee'::text]))),
    CONSTRAINT financial_transactions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'posted'::text, 'void'::text, 'reversed'::text]))),
    CONSTRAINT financial_transactions_transaction_type_check CHECK ((transaction_type = ANY (ARRAY['payment'::text, 'refund'::text, 'adjustment'::text, 'credit_note'::text, 'debit_note'::text, 'chargeback'::text, 'fee'::text, 'discount'::text, 'write_off'::text, 'exchange_adjustment'::text])))
);


ALTER TABLE public.financial_transactions OWNER TO postgres;

--
-- Name: TABLE financial_transactions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.financial_transactions IS 'Double-entry bookkeeping ledger for all financial transactions';


--
-- Name: gateway_refunds; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.gateway_refunds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    gateway_refund_id text NOT NULL,
    gateway_transaction_id text,
    gateway_code text NOT NULL,
    payment_transaction_id uuid,
    quote_id uuid,
    refund_amount numeric(15,4) NOT NULL,
    original_amount numeric(15,4),
    currency text NOT NULL,
    refund_type text,
    reason_code text,
    reason_description text,
    admin_notes text,
    customer_note text,
    status text DEFAULT 'pending'::text,
    gateway_status text,
    gateway_response jsonb,
    refund_date timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    failed_at timestamp with time zone,
    processed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT gateway_refunds_refund_type_check CHECK ((refund_type = ANY (ARRAY['FULL'::text, 'PARTIAL'::text]))),
    CONSTRAINT gateway_refunds_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text, 'cancelled'::text])))
);


ALTER TABLE public.gateway_refunds OWNER TO postgres;

--
-- Name: TABLE gateway_refunds; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.gateway_refunds IS 'Tracks refunds across all payment gateways (PayU, Stripe, PayPal, etc.)';


--
-- Name: global_tax_method_preferences; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.global_tax_method_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    preference_scope text NOT NULL,
    scope_identifier text,
    default_calculation_method text DEFAULT 'auto'::text NOT NULL,
    default_valuation_method text DEFAULT 'auto'::text NOT NULL,
    fallback_chain jsonb DEFAULT '[["hsn_only"], ["legacy_fallback"]]'::jsonb,
    admin_id uuid,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT global_tax_method_preferences_default_calculation_method_check CHECK ((default_calculation_method = ANY (ARRAY['auto'::text, 'hsn_only'::text, 'legacy_fallback'::text]))),
    CONSTRAINT global_tax_method_preferences_default_valuation_method_check CHECK ((default_valuation_method = ANY (ARRAY['auto'::text, 'actual_price'::text, 'minimum_valuation'::text, 'higher_of_both'::text]))),
    CONSTRAINT global_tax_method_preferences_preference_scope_check CHECK ((preference_scope = ANY (ARRAY['system_default'::text, 'country_specific'::text, 'route_specific'::text, 'admin_default'::text])))
);


ALTER TABLE public.global_tax_method_preferences OWNER TO postgres;

--
-- Name: guest_checkout_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.guest_checkout_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_token text NOT NULL,
    quote_id uuid NOT NULL,
    guest_name text NOT NULL,
    guest_email text NOT NULL,
    guest_phone text,
    shipping_address jsonb NOT NULL,
    payment_currency text NOT NULL,
    payment_method text NOT NULL,
    payment_amount numeric(10,2) NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT guest_checkout_sessions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'expired'::text, 'failed'::text])))
);


ALTER TABLE public.guest_checkout_sessions OWNER TO postgres;

--
-- Name: TABLE guest_checkout_sessions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.guest_checkout_sessions IS 'Temporary storage for guest checkout data to prevent quote contamination before payment confirmation';


--
-- Name: hsn_master; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.hsn_master (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hsn_code text NOT NULL,
    description text NOT NULL,
    category text NOT NULL,
    subcategory text,
    keywords text[] DEFAULT '{}'::text[],
    minimum_valuation_usd numeric(10,2),
    requires_currency_conversion boolean DEFAULT true,
    weight_data jsonb DEFAULT '{"typical_weights": {"per_unit": {"max": 0, "min": 0, "average": 0}, "packaging": {"additional_weight": 0}}}'::jsonb,
    tax_data jsonb DEFAULT '{"typical_rates": {"gst": {"standard": 0}, "vat": {"common": 0}, "customs": {"max": 0, "min": 0, "common": 0}}}'::jsonb,
    classification_data jsonb DEFAULT '{"visual_metadata": {"icon": "", "color": "", "display_name": "", "common_brands": [], "search_priority": 3, "typical_price_range": {"max": 0, "min": 0, "currency": "USD"}}, "auto_classification": {"keywords": [], "confidence": 0.0}}'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


ALTER TABLE public.hsn_master OWNER TO postgres;

--
-- Name: hsn_search_optimized; Type: MATERIALIZED VIEW; Schema: public; Owner: postgres
--

CREATE MATERIALIZED VIEW public.hsn_search_optimized AS
 SELECT hsn_code,
    description,
    category,
    subcategory,
    keywords,
    ((classification_data -> 'visual_metadata'::text) ->> 'icon'::text) AS icon,
    ((classification_data -> 'visual_metadata'::text) ->> 'color'::text) AS color,
    ((classification_data -> 'visual_metadata'::text) ->> 'display_name'::text) AS display_name,
    ((classification_data -> 'visual_metadata'::text) ->> 'search_priority'::text) AS search_priority,
    ((classification_data -> 'visual_metadata'::text) ->> 'common_brands'::text) AS common_brands,
    tax_data,
    weight_data,
    minimum_valuation_usd,
    requires_currency_conversion,
    array_to_string(keywords, ' '::text) AS keywords_text,
    to_tsvector('english'::regconfig, ((description || ' '::text) || array_to_string(keywords, ' '::text))) AS search_vector
   FROM public.hsn_master
  WHERE (is_active = true)
  ORDER BY
        CASE
            WHEN (((classification_data -> 'visual_metadata'::text) ->> 'search_priority'::text) IS NOT NULL) THEN (((classification_data -> 'visual_metadata'::text) ->> 'search_priority'::text))::integer
            ELSE 3
        END, category, hsn_code
  WITH NO DATA;


ALTER MATERIALIZED VIEW public.hsn_search_optimized OWNER TO postgres;

--
-- Name: iwish_tracking_sequence; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.iwish_tracking_sequence
    START WITH 1001
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.iwish_tracking_sequence OWNER TO postgres;

--
-- Name: SEQUENCE iwish_tracking_sequence; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON SEQUENCE public.iwish_tracking_sequence IS 'Sequential numbering for iwishBag tracking IDs starting at 1001';


--
-- Name: manual_analysis_tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.manual_analysis_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_id uuid,
    assigned_to uuid,
    status text DEFAULT 'pending'::text,
    priority text DEFAULT 'medium'::text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.manual_analysis_tasks OWNER TO postgres;

--
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sender_id uuid NOT NULL,
    recipient_id uuid,
    subject text NOT NULL,
    content text NOT NULL,
    message_type text DEFAULT 'general'::text,
    quote_id uuid,
    reply_to_message_id uuid,
    attachment_file_name text,
    attachment_url text,
    sender_email text,
    sender_name text,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    verification_status text DEFAULT 'pending'::text,
    admin_notes text,
    verified_by uuid,
    verified_at timestamp with time zone,
    thread_type character varying(50) DEFAULT 'general'::character varying,
    priority character varying(20) DEFAULT 'normal'::character varying,
    is_internal boolean DEFAULT false,
    message_status character varying(20) DEFAULT 'sent'::character varying,
    read_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT messages_priority_check CHECK (((priority)::text = ANY ((ARRAY['low'::character varying, 'normal'::character varying, 'high'::character varying, 'urgent'::character varying])::text[]))),
    CONSTRAINT messages_status_check CHECK (((message_status)::text = ANY ((ARRAY['sent'::character varying, 'delivered'::character varying, 'read'::character varying, 'failed'::character varying])::text[]))),
    CONSTRAINT messages_thread_type_check CHECK (((thread_type)::text = ANY ((ARRAY['general'::character varying, 'quote'::character varying, 'support'::character varying, 'payment_proof'::character varying, 'internal'::character varying])::text[]))),
    CONSTRAINT messages_verification_status_check CHECK ((verification_status = ANY (ARRAY['pending'::text, 'verified'::text, 'confirmed'::text, 'rejected'::text]))),
    CONSTRAINT valid_recipients CHECK ((sender_id <> recipient_id))
);


ALTER TABLE public.messages OWNER TO postgres;

--
-- Name: TABLE messages; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.messages IS 'Enhanced messaging table supporting quote-specific conversations, payment proofs, internal admin notes, and comprehensive messaging features';


--
-- Name: COLUMN messages.recipient_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.messages.recipient_id IS 'User ID of the recipient. NULL for broadcast/general messages from admin.';


--
-- Name: COLUMN messages.message_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.messages.message_type IS 'Type of message: general, payment_proof, support, etc.';


--
-- Name: mfa_activity_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mfa_activity_log (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    activity_type text NOT NULL,
    ip_address inet,
    user_agent text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    success boolean DEFAULT true,
    CONSTRAINT mfa_activity_log_activity_type_check CHECK ((activity_type = ANY (ARRAY['setup_initiated'::text, 'setup_completed'::text, 'login_success'::text, 'login_failed'::text, 'backup_code_used'::text, 'disabled'::text, 'reset_requested'::text, 'locked_security'::text])))
);


ALTER TABLE public.mfa_activity_log OWNER TO postgres;

--
-- Name: mfa_activity_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.mfa_activity_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mfa_activity_log_id_seq OWNER TO postgres;

--
-- Name: mfa_activity_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.mfa_activity_log_id_seq OWNED BY public.mfa_activity_log.id;


--
-- Name: mfa_configurations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mfa_configurations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    totp_secret text NOT NULL,
    totp_verified boolean DEFAULT false,
    totp_enabled boolean DEFAULT false,
    backup_codes text,
    backup_codes_used integer[] DEFAULT '{}'::integer[],
    last_used_at timestamp with time zone,
    last_used_ip inet,
    failed_attempts integer DEFAULT 0,
    locked_until timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    verified_at timestamp with time zone,
    backup_codes_generated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.mfa_configurations OWNER TO postgres;

--
-- Name: mfa_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mfa_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    session_token text NOT NULL,
    verified_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:30:00'::interval) NOT NULL,
    ip_address inet,
    user_agent text,
    CONSTRAINT valid_session CHECK ((expires_at > now()))
);


ALTER TABLE public.mfa_sessions OWNER TO postgres;

--
-- Name: ml_category_weights; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ml_category_weights (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category text NOT NULL,
    min_weight numeric(8,3) NOT NULL,
    max_weight numeric(8,3) NOT NULL,
    avg_weight numeric(8,3) NOT NULL,
    sample_count integer DEFAULT 0,
    last_updated timestamp with time zone DEFAULT now(),
    CONSTRAINT valid_category_weights CHECK (((min_weight <= avg_weight) AND (avg_weight <= max_weight)))
);


ALTER TABLE public.ml_category_weights OWNER TO postgres;

--
-- Name: TABLE ml_category_weights; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.ml_category_weights IS 'Stores category-based weight statistics for ML estimator';


--
-- Name: ml_product_weights; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ml_product_weights (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_name text NOT NULL,
    normalized_name text NOT NULL,
    weight_kg numeric(8,3) NOT NULL,
    confidence numeric(3,2) NOT NULL,
    category text,
    brand text,
    learned_from_url text,
    training_count integer DEFAULT 1,
    accuracy_score numeric(3,2),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    CONSTRAINT ml_product_weights_confidence_check CHECK (((confidence >= (0)::numeric) AND (confidence <= (1)::numeric))),
    CONSTRAINT valid_weight CHECK (((weight_kg > (0)::numeric) AND (weight_kg <= (100)::numeric)))
);


ALTER TABLE public.ml_product_weights OWNER TO postgres;

--
-- Name: TABLE ml_product_weights; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.ml_product_weights IS 'Stores learned product weights for ML weight estimator';


--
-- Name: COLUMN ml_product_weights.normalized_name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.ml_product_weights.normalized_name IS 'Lowercase, trimmed product name for consistent matching';


--
-- Name: COLUMN ml_product_weights.training_count; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.ml_product_weights.training_count IS 'Number of times this product weight has been confirmed/updated';


--
-- Name: COLUMN ml_product_weights.accuracy_score; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.ml_product_weights.accuracy_score IS 'Average accuracy score from training sessions';


--
-- Name: ml_training_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ml_training_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_name text NOT NULL,
    estimated_weight numeric(8,3) NOT NULL,
    actual_weight numeric(8,3) NOT NULL,
    confidence numeric(3,2) NOT NULL,
    accuracy numeric(3,2) NOT NULL,
    url text,
    category text,
    brand text,
    user_confirmed boolean DEFAULT false,
    trained_at timestamp with time zone DEFAULT now(),
    trained_by uuid
);


ALTER TABLE public.ml_training_history OWNER TO postgres;

--
-- Name: TABLE ml_training_history; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.ml_training_history IS 'Tracks ML training sessions and accuracy metrics';


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type character varying(50) NOT NULL,
    message text NOT NULL,
    data jsonb DEFAULT '{}'::jsonb,
    priority character varying(20) DEFAULT 'medium'::character varying NOT NULL,
    is_read boolean DEFAULT false,
    is_dismissed boolean DEFAULT false,
    requires_action boolean DEFAULT false,
    allow_dismiss boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    read_at timestamp with time zone,
    dismissed_at timestamp with time zone,
    CONSTRAINT notifications_priority_check CHECK (((priority)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'urgent'::character varying])::text[])))
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: TABLE notifications; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.notifications IS 'Stores user notifications for the iwishBag proactive notification system';


--
-- Name: COLUMN notifications.id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.notifications.id IS 'Unique identifier for the notification';


--
-- Name: COLUMN notifications.user_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.notifications.user_id IS 'Reference to the user who should receive this notification';


--
-- Name: COLUMN notifications.type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.notifications.type IS 'Notification type from NotificationTypes.ts enum';


--
-- Name: COLUMN notifications.message; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.notifications.message IS 'Human-readable notification message';


--
-- Name: COLUMN notifications.data; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.notifications.data IS 'Additional context data in JSONB format (quote_id, order_id, etc.)';


--
-- Name: COLUMN notifications.priority; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.notifications.priority IS 'Notification priority level (low, medium, high, urgent)';


--
-- Name: COLUMN notifications.is_read; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.notifications.is_read IS 'Whether the user has read this notification';


--
-- Name: COLUMN notifications.is_dismissed; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.notifications.is_dismissed IS 'Whether the user has dismissed this notification';


--
-- Name: COLUMN notifications.requires_action; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.notifications.requires_action IS 'Whether this notification requires user action';


--
-- Name: COLUMN notifications.allow_dismiss; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.notifications.allow_dismiss IS 'Whether the user can dismiss this notification';


--
-- Name: COLUMN notifications.expires_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.notifications.expires_at IS 'When this notification expires (NULL = never expires)';


--
-- Name: COLUMN notifications.read_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.notifications.read_at IS 'Timestamp when the notification was marked as read';


--
-- Name: COLUMN notifications.dismissed_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.notifications.dismissed_at IS 'Timestamp when the notification was dismissed';


--
-- Name: oauth_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.oauth_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    gateway_code text NOT NULL,
    client_id text NOT NULL,
    access_token text NOT NULL,
    token_type text DEFAULT 'Bearer'::text,
    expires_in integer NOT NULL,
    scope text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    is_active boolean DEFAULT true
);


ALTER TABLE public.oauth_tokens OWNER TO postgres;

--
-- Name: TABLE oauth_tokens; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.oauth_tokens IS 'OAuth access tokens for payment gateway APIs';


--
-- Name: package_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.package_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    package_id uuid,
    consolidation_group_id uuid,
    event_type text NOT NULL,
    event_description text,
    event_data jsonb DEFAULT '{}'::jsonb,
    staff_id uuid,
    staff_notes text,
    from_location text,
    to_location text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.package_events OWNER TO postgres;

--
-- Name: package_notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.package_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    package_id uuid,
    notification_type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    data jsonb DEFAULT '{}'::jsonb,
    sent_at timestamp with time zone,
    delivery_method text[] DEFAULT '{}'::text[],
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT package_notifications_notification_type_check CHECK ((notification_type = ANY (ARRAY['package_received'::text, 'photo_ready'::text, 'storage_warning'::text, 'consolidation_ready'::text, 'shipped'::text, 'delivered'::text])))
);


ALTER TABLE public.package_notifications OWNER TO postgres;

--
-- Name: package_photos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.package_photos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    package_id uuid,
    consolidation_group_id uuid,
    photo_url text NOT NULL,
    photo_type text NOT NULL,
    caption text,
    file_size_bytes bigint,
    dimensions jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT package_photos_photo_type_check CHECK ((photo_type = ANY (ARRAY['package_front'::text, 'package_back'::text, 'package_label'::text, 'contents'::text, 'consolidation_before'::text, 'consolidation_after'::text])))
);


ALTER TABLE public.package_photos OWNER TO postgres;

--
-- Name: payment_adjustments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_adjustments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_id uuid NOT NULL,
    adjustment_type text NOT NULL,
    adjustment_reason text NOT NULL,
    original_amount numeric(15,4) NOT NULL,
    adjusted_amount numeric(15,4) NOT NULL,
    adjustment_value numeric(15,4) NOT NULL,
    currency text NOT NULL,
    financial_transaction_id uuid,
    payment_ledger_id uuid,
    requested_by uuid NOT NULL,
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    approved_by uuid,
    approved_at timestamp with time zone,
    status text DEFAULT 'pending'::text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT payment_adjustments_adjustment_type_check CHECK ((adjustment_type = ANY (ARRAY['price_change'::text, 'discount'::text, 'surcharge'::text, 'tax_adjustment'::text, 'currency_adjustment'::text, 'rounding'::text, 'write_off'::text, 'correction'::text]))),
    CONSTRAINT payment_adjustments_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'applied'::text, 'cancelled'::text])))
);


ALTER TABLE public.payment_adjustments OWNER TO postgres;

--
-- Name: TABLE payment_adjustments; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.payment_adjustments IS 'Track all payment adjustments and corrections';


--
-- Name: payment_alert_thresholds; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_alert_thresholds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metric_name character varying(100) NOT NULL,
    warning_threshold numeric(10,2) NOT NULL,
    critical_threshold numeric(10,2) NOT NULL,
    comparison_operator character varying(10) DEFAULT 'gt'::character varying NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.payment_alert_thresholds OWNER TO postgres;

--
-- Name: TABLE payment_alert_thresholds; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.payment_alert_thresholds IS 'Configurable thresholds for payment system alerts';


--
-- Name: COLUMN payment_alert_thresholds.metric_name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.payment_alert_thresholds.metric_name IS 'Name of the metric to monitor';


--
-- Name: COLUMN payment_alert_thresholds.warning_threshold; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.payment_alert_thresholds.warning_threshold IS 'Value that triggers a warning alert';


--
-- Name: COLUMN payment_alert_thresholds.critical_threshold; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.payment_alert_thresholds.critical_threshold IS 'Value that triggers a critical alert';


--
-- Name: COLUMN payment_alert_thresholds.comparison_operator; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.payment_alert_thresholds.comparison_operator IS 'Comparison operator (gt, lt, eq, gte, lte)';


--
-- Name: payment_error_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_error_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    error_code character varying(100) NOT NULL,
    error_message text NOT NULL,
    user_message text NOT NULL,
    severity character varying(20) DEFAULT 'medium'::character varying NOT NULL,
    gateway character varying(50) NOT NULL,
    transaction_id character varying(255),
    amount numeric(15,2),
    currency character varying(10),
    user_action character varying(100),
    should_retry boolean DEFAULT false NOT NULL,
    retry_delay integer,
    recovery_options jsonb,
    context jsonb,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT check_severity CHECK (((severity)::text = ANY (ARRAY[('low'::character varying)::text, ('medium'::character varying)::text, ('high'::character varying)::text, ('critical'::character varying)::text])))
);


ALTER TABLE public.payment_error_logs OWNER TO postgres;

--
-- Name: TABLE payment_error_logs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.payment_error_logs IS 'Logs for payment errors for analysis and debugging';


--
-- Name: COLUMN payment_error_logs.error_code; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.payment_error_logs.error_code IS 'Standardized error code for categorization';


--
-- Name: COLUMN payment_error_logs.error_message; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.payment_error_logs.error_message IS 'Technical error message';


--
-- Name: COLUMN payment_error_logs.user_message; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.payment_error_logs.user_message IS 'User-friendly error message';


--
-- Name: COLUMN payment_error_logs.severity; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.payment_error_logs.severity IS 'Error severity level (low, medium, high, critical)';


--
-- Name: COLUMN payment_error_logs.gateway; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.payment_error_logs.gateway IS 'Payment gateway where error occurred';


--
-- Name: COLUMN payment_error_logs.transaction_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.payment_error_logs.transaction_id IS 'Transaction ID if available';


--
-- Name: COLUMN payment_error_logs.amount; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.payment_error_logs.amount IS 'Payment amount';


--
-- Name: COLUMN payment_error_logs.currency; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.payment_error_logs.currency IS 'Payment currency';


--
-- Name: COLUMN payment_error_logs.user_action; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.payment_error_logs.user_action IS 'User action that triggered the error';


--
-- Name: COLUMN payment_error_logs.should_retry; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.payment_error_logs.should_retry IS 'Whether the error is retryable';


--
-- Name: COLUMN payment_error_logs.retry_delay; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.payment_error_logs.retry_delay IS 'Recommended retry delay in milliseconds';


--
-- Name: COLUMN payment_error_logs.recovery_options; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.payment_error_logs.recovery_options IS 'JSON array of recovery actions';


--
-- Name: COLUMN payment_error_logs.context; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.payment_error_logs.context IS 'Additional context information';


--
-- Name: payment_error_analytics; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.payment_error_analytics AS
 SELECT date_trunc('day'::text, created_at) AS error_date,
    gateway,
    error_code,
    severity,
    count(*) AS error_count,
    count(DISTINCT user_id) AS affected_users,
    count(DISTINCT transaction_id) AS failed_transactions,
    avg(amount) AS avg_failed_amount,
    array_agg(DISTINCT currency) AS currencies
   FROM public.payment_error_logs
  WHERE (created_at >= (now() - '30 days'::interval))
  GROUP BY (date_trunc('day'::text, created_at)), gateway, error_code, severity
  ORDER BY (date_trunc('day'::text, created_at)) DESC, (count(*)) DESC;


ALTER VIEW public.payment_error_analytics OWNER TO postgres;

--
-- Name: payment_gateways; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_gateways (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    is_active boolean DEFAULT true,
    supported_countries text[] DEFAULT '{}'::text[],
    supported_currencies text[] DEFAULT '{}'::text[],
    fee_percent numeric(5,2) DEFAULT 0,
    fee_fixed numeric(10,2) DEFAULT 0,
    config jsonb DEFAULT '{}'::jsonb,
    test_mode boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    priority integer DEFAULT 999,
    description text,
    CONSTRAINT payment_gateways_fee_fixed_check CHECK ((fee_fixed >= (0)::numeric)),
    CONSTRAINT payment_gateways_fee_percent_check CHECK ((fee_percent >= (0)::numeric))
);


ALTER TABLE public.payment_gateways OWNER TO postgres;

--
-- Name: TABLE payment_gateways; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.payment_gateways IS 'Payment gateway configurations - Stripe removed for fresh integration';


--
-- Name: COLUMN payment_gateways.priority; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.payment_gateways.priority IS 'Priority order for gateway selection (lower numbers = higher priority)';


--
-- Name: COLUMN payment_gateways.description; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.payment_gateways.description IS 'Description of the payment gateway for display purposes';


--
-- Name: payment_health_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_health_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    overall_health character varying(20) DEFAULT 'healthy'::character varying NOT NULL,
    success_rate numeric(5,2) DEFAULT 0 NOT NULL,
    error_rate numeric(5,2) DEFAULT 0 NOT NULL,
    avg_processing_time integer DEFAULT 0 NOT NULL,
    alert_count integer DEFAULT 0 NOT NULL,
    metrics jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT check_error_rate CHECK (((error_rate >= (0)::numeric) AND (error_rate <= (100)::numeric))),
    CONSTRAINT check_overall_health CHECK (((overall_health)::text = ANY (ARRAY[('healthy'::character varying)::text, ('warning'::character varying)::text, ('critical'::character varying)::text]))),
    CONSTRAINT check_success_rate CHECK (((success_rate >= (0)::numeric) AND (success_rate <= (100)::numeric)))
);


ALTER TABLE public.payment_health_logs OWNER TO postgres;

--
-- Name: TABLE payment_health_logs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.payment_health_logs IS 'Logs for payment system health monitoring and alerting';


--
-- Name: COLUMN payment_health_logs.overall_health; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.payment_health_logs.overall_health IS 'Overall health status (healthy, warning, critical)';


--
-- Name: COLUMN payment_health_logs.success_rate; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.payment_health_logs.success_rate IS 'Payment success rate percentage';


--
-- Name: COLUMN payment_health_logs.error_rate; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.payment_health_logs.error_rate IS 'Payment error rate percentage';


--
-- Name: COLUMN payment_health_logs.avg_processing_time; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.payment_health_logs.avg_processing_time IS 'Average processing time in milliseconds';


--
-- Name: COLUMN payment_health_logs.alert_count; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.payment_health_logs.alert_count IS 'Number of alerts generated';


--
-- Name: COLUMN payment_health_logs.metrics; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.payment_health_logs.metrics IS 'Complete health metrics JSON';


--
-- Name: payment_health_dashboard; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.payment_health_dashboard AS
 SELECT date_trunc('hour'::text, created_at) AS check_time,
    overall_health,
    avg(success_rate) AS avg_success_rate,
    avg(error_rate) AS avg_error_rate,
    avg(avg_processing_time) AS avg_processing_time,
    sum(alert_count) AS total_alerts,
    count(*) AS check_count
   FROM public.payment_health_logs
  WHERE (created_at >= (now() - '7 days'::interval))
  GROUP BY (date_trunc('hour'::text, created_at)), overall_health
  ORDER BY (date_trunc('hour'::text, created_at)) DESC;


ALTER VIEW public.payment_health_dashboard OWNER TO postgres;

--
-- Name: payment_ledger; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_ledger (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_id uuid NOT NULL,
    payment_transaction_id uuid,
    payment_date timestamp with time zone DEFAULT now() NOT NULL,
    payment_type text NOT NULL,
    payment_method text NOT NULL,
    gateway_code text,
    gateway_transaction_id text,
    amount numeric(15,4) NOT NULL,
    currency text NOT NULL,
    reference_number text,
    bank_reference text,
    customer_reference text,
    status text DEFAULT 'pending'::text,
    verified_by uuid,
    verified_at timestamp with time zone,
    financial_transaction_id uuid,
    parent_payment_id uuid,
    payment_proof_message_id uuid,
    gateway_response jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    notes text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT payment_ledger_payment_type_check CHECK ((payment_type = ANY (ARRAY['customer_payment'::text, 'refund'::text, 'partial_refund'::text, 'credit_applied'::text, 'overpayment'::text, 'underpayment_adjustment'::text, 'write_off'::text, 'chargeback'::text]))),
    CONSTRAINT payment_ledger_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text, 'reversed'::text, 'cancelled'::text])))
);


ALTER TABLE public.payment_ledger OWNER TO postgres;

--
-- Name: TABLE payment_ledger; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.payment_ledger IS 'Central payment tracking table. All payment amounts sync to quotes.amount_paid via triggers.';


--
-- Name: payment_links; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    link_code text DEFAULT public.generate_payment_link_code() NOT NULL,
    title text NOT NULL,
    amount numeric(10,2) NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    current_uses integer DEFAULT 0,
    max_uses integer DEFAULT 1,
    is_public boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    created_by uuid,
    user_id uuid,
    quote_id uuid,
    gateway_response jsonb,
    gateway text DEFAULT 'paypal'::text,
    gateway_link_id text,
    payment_url text,
    gateway_request jsonb,
    original_amount numeric(10,2),
    original_currency text,
    customer_email text,
    customer_name text,
    customer_phone text,
    api_version text DEFAULT 'v1_legacy'::text,
    CONSTRAINT payment_links_gateway_check CHECK ((gateway = ANY (ARRAY['paypal'::text, 'payu'::text, 'stripe'::text, 'esewa'::text, 'khalti'::text, 'fonepay'::text, 'airwallex'::text]))),
    CONSTRAINT payment_links_status_check CHECK ((status = ANY (ARRAY['active'::text, 'expired'::text, 'completed'::text, 'used'::text, 'cancelled'::text])))
);


ALTER TABLE public.payment_links OWNER TO postgres;

--
-- Name: TABLE payment_links; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.payment_links IS 'Multi-gateway payment links for quotes and custom payments';


--
-- Name: COLUMN payment_links.gateway_response; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.payment_links.gateway_response IS 'Response data received from the payment gateway';


--
-- Name: COLUMN payment_links.gateway; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.payment_links.gateway IS 'Payment gateway identifier (paypal, payu, stripe, etc.)';


--
-- Name: COLUMN payment_links.gateway_link_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.payment_links.gateway_link_id IS 'Gateway-specific payment link ID';


--
-- Name: COLUMN payment_links.payment_url; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.payment_links.payment_url IS 'The actual payment URL to redirect users to';


--
-- Name: COLUMN payment_links.gateway_request; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.payment_links.gateway_request IS 'Request data sent to the payment gateway';


--
-- Name: COLUMN payment_links.original_amount; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.payment_links.original_amount IS 'Original amount in the source currency before conversion';


--
-- Name: COLUMN payment_links.original_currency; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.payment_links.original_currency IS 'Original currency code before conversion';


--
-- Name: COLUMN payment_links.api_version; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.payment_links.api_version IS 'PayU API version used: v1_legacy (create_invoice) or v2_rest (payment-links)';


--
-- Name: payment_links_summary; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.payment_links_summary AS
 SELECT id,
    gateway,
    link_code,
    title,
    amount,
    currency,
    status,
    current_uses,
    max_uses,
    created_at,
    expires_at,
        CASE
            WHEN ((expires_at IS NOT NULL) AND (expires_at < now())) THEN 'expired'::text
            WHEN (current_uses >= max_uses) THEN 'exhausted'::text
            ELSE status
        END AS effective_status,
    created_by,
    user_id,
    quote_id
   FROM public.payment_links;


ALTER VIEW public.payment_links_summary OWNER TO postgres;

--
-- Name: payment_reconciliation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_reconciliation (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reconciliation_date date NOT NULL,
    payment_method text NOT NULL,
    gateway_code text,
    statement_reference text,
    statement_start_date date,
    statement_end_date date,
    statement_opening_balance numeric(15,4),
    statement_closing_balance numeric(15,4),
    statement_total_credits numeric(15,4),
    statement_total_debits numeric(15,4),
    system_opening_balance numeric(15,4),
    system_closing_balance numeric(15,4),
    system_total_credits numeric(15,4),
    system_total_debits numeric(15,4),
    opening_difference numeric(15,4) GENERATED ALWAYS AS ((COALESCE(statement_opening_balance, (0)::numeric) - COALESCE(system_opening_balance, (0)::numeric))) STORED,
    closing_difference numeric(15,4) GENERATED ALWAYS AS ((COALESCE(statement_closing_balance, (0)::numeric) - COALESCE(system_closing_balance, (0)::numeric))) STORED,
    status text DEFAULT 'in_progress'::text,
    matched_count integer DEFAULT 0,
    unmatched_system_count integer DEFAULT 0,
    unmatched_statement_count integer DEFAULT 0,
    total_matched_amount numeric(15,4) DEFAULT 0,
    statement_file_url text,
    statement_file_name text,
    reconciled_by uuid NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT payment_reconciliation_status_check CHECK ((status = ANY (ARRAY['in_progress'::text, 'completed'::text, 'discrepancy_found'::text, 'abandoned'::text])))
);


ALTER TABLE public.payment_reconciliation OWNER TO postgres;

--
-- Name: TABLE payment_reconciliation; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.payment_reconciliation IS 'Payment reconciliation sessions for matching bank/gateway statements';


--
-- Name: payment_reminders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_reminders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_id uuid,
    reminder_type text NOT NULL,
    sent_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT payment_reminders_reminder_type_check CHECK ((reminder_type = ANY (ARRAY['bank_transfer_pending'::text, 'cod_confirmation'::text])))
);


ALTER TABLE public.payment_reminders OWNER TO postgres;

--
-- Name: payment_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    quote_id uuid,
    amount numeric(10,2) NOT NULL,
    currency text DEFAULT 'USD'::text,
    status text DEFAULT 'pending'::text,
    payment_method text,
    gateway_response jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    total_refunded numeric(10,2) DEFAULT 0,
    refund_count integer DEFAULT 0,
    is_fully_refunded boolean DEFAULT false,
    last_refund_at timestamp with time zone,
    paypal_order_id text,
    paypal_capture_id text,
    paypal_payer_id text,
    paypal_payer_email text
);


ALTER TABLE public.payment_transactions OWNER TO postgres;

--
-- Name: payment_verification_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_verification_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id character varying(255) NOT NULL,
    transaction_id character varying(255) NOT NULL,
    gateway character varying(50) NOT NULL,
    success boolean DEFAULT false NOT NULL,
    error_message text,
    gateway_response jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.payment_verification_logs OWNER TO postgres;

--
-- Name: TABLE payment_verification_logs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.payment_verification_logs IS 'Logs for payment verification attempts for audit and debugging';


--
-- Name: COLUMN payment_verification_logs.request_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.payment_verification_logs.request_id IS 'Unique identifier for each verification request';


--
-- Name: COLUMN payment_verification_logs.transaction_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.payment_verification_logs.transaction_id IS 'Payment transaction ID being verified';


--
-- Name: COLUMN payment_verification_logs.gateway; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.payment_verification_logs.gateway IS 'Payment gateway used (payu, stripe, etc.)';


--
-- Name: COLUMN payment_verification_logs.success; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.payment_verification_logs.success IS 'Whether verification was successful';


--
-- Name: COLUMN payment_verification_logs.error_message; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.payment_verification_logs.error_message IS 'Error message if verification failed';


--
-- Name: COLUMN payment_verification_logs.gateway_response; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.payment_verification_logs.gateway_response IS 'Raw response from payment gateway';


--
-- Name: paypal_refund_reasons; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.paypal_refund_reasons (
    code text NOT NULL,
    description text NOT NULL,
    customer_friendly_description text,
    is_active boolean DEFAULT true,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.paypal_refund_reasons OWNER TO postgres;

--
-- Name: TABLE paypal_refund_reasons; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.paypal_refund_reasons IS 'Lookup table for standardized refund reason codes';


--
-- Name: paypal_refunds; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.paypal_refunds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    refund_id text NOT NULL,
    original_transaction_id text NOT NULL,
    payment_transaction_id uuid,
    quote_id uuid,
    user_id uuid,
    refund_amount numeric(10,2) NOT NULL,
    original_amount numeric(10,2) NOT NULL,
    currency text NOT NULL,
    refund_type text DEFAULT 'FULL'::text NOT NULL,
    reason_code text,
    reason_description text,
    admin_notes text,
    customer_note text,
    status text DEFAULT 'PENDING'::text NOT NULL,
    paypal_status text,
    processed_by uuid,
    paypal_response jsonb,
    error_details jsonb,
    refund_date timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT paypal_refunds_refund_type_check CHECK ((refund_type = ANY (ARRAY['FULL'::text, 'PARTIAL'::text]))),
    CONSTRAINT paypal_refunds_status_check CHECK ((status = ANY (ARRAY['PENDING'::text, 'COMPLETED'::text, 'FAILED'::text, 'CANCELLED'::text])))
);


ALTER TABLE public.paypal_refunds OWNER TO postgres;

--
-- Name: TABLE paypal_refunds; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.paypal_refunds IS 'Tracks all PayPal refund transactions with full audit trail';


--
-- Name: paypal_refund_summary; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.paypal_refund_summary AS
 SELECT date_trunc('day'::text, created_at) AS refund_date,
    count(*) AS refund_count,
    sum(refund_amount) AS total_refunded,
    avg(refund_amount) AS avg_refund_amount,
    count(
        CASE
            WHEN (refund_type = 'FULL'::text) THEN 1
            ELSE NULL::integer
        END) AS full_refunds,
    count(
        CASE
            WHEN (refund_type = 'PARTIAL'::text) THEN 1
            ELSE NULL::integer
        END) AS partial_refunds,
    count(
        CASE
            WHEN (status = 'COMPLETED'::text) THEN 1
            ELSE NULL::integer
        END) AS completed_refunds,
    count(
        CASE
            WHEN (status = 'FAILED'::text) THEN 1
            ELSE NULL::integer
        END) AS failed_refunds
   FROM public.paypal_refunds
  WHERE (created_at >= (CURRENT_DATE - '30 days'::interval))
  GROUP BY (date_trunc('day'::text, created_at))
  ORDER BY (date_trunc('day'::text, created_at)) DESC;


ALTER VIEW public.paypal_refund_summary OWNER TO postgres;

--
-- Name: VIEW paypal_refund_summary; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.paypal_refund_summary IS 'Daily summary of refund activity for analytics';


--
-- Name: paypal_webhook_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.paypal_webhook_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id text NOT NULL,
    event_type text NOT NULL,
    resource_type text,
    resource_id text,
    summary text,
    payload jsonb NOT NULL,
    verification_status text DEFAULT 'pending'::text,
    processed_at timestamp with time zone,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.paypal_webhook_events OWNER TO postgres;

--
-- Name: profiles_with_phone; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.profiles_with_phone AS
 SELECT p.id,
    p.full_name,
    p.country,
    p.preferred_display_currency,
    p.avatar_url,
    p.cod_enabled,
    p.internal_notes,
    p.referral_code,
    p.total_orders,
    p.total_spent,
    p.created_at,
    p.updated_at,
    p.email,
    p.preferred_payment_gateway,
    au.phone
   FROM (public.profiles p
     LEFT JOIN auth.users au ON ((p.id = au.id)));


ALTER VIEW public.profiles_with_phone OWNER TO postgres;

--
-- Name: quote_address_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quote_address_history (
    id integer NOT NULL,
    quote_id uuid NOT NULL,
    old_address jsonb,
    new_address jsonb NOT NULL,
    changed_by uuid,
    changed_at timestamp with time zone DEFAULT now(),
    change_reason text,
    change_type text DEFAULT 'update'::text,
    CONSTRAINT quote_address_history_change_type_check CHECK ((change_type = ANY (ARRAY['create'::text, 'update'::text, 'lock'::text, 'unlock'::text])))
);


ALTER TABLE public.quote_address_history OWNER TO postgres;

--
-- Name: quote_address_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.quote_address_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.quote_address_history_id_seq OWNER TO postgres;

--
-- Name: quote_address_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.quote_address_history_id_seq OWNED BY public.quote_address_history.id;


--
-- Name: quote_documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quote_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_id uuid NOT NULL,
    document_type text NOT NULL,
    file_name text NOT NULL,
    file_url text NOT NULL,
    file_size bigint NOT NULL,
    uploaded_by uuid NOT NULL,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL,
    is_customer_visible boolean DEFAULT true NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT quote_documents_document_type_check CHECK ((document_type = ANY (ARRAY['invoice'::text, 'receipt'::text, 'shipping_label'::text, 'customs_form'::text, 'insurance_doc'::text, 'other'::text]))),
    CONSTRAINT quote_documents_file_size_check CHECK ((file_size > 0))
);


ALTER TABLE public.quote_documents OWNER TO postgres;

--
-- Name: quote_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quote_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_id uuid NOT NULL,
    product_name text,
    product_url text,
    image_url text,
    category text,
    item_price numeric(10,2),
    item_weight numeric(8,2),
    quantity integer DEFAULT 1,
    options text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT quote_items_item_price_check CHECK ((item_price >= (0)::numeric)),
    CONSTRAINT quote_items_item_weight_check CHECK ((item_weight >= (0)::numeric)),
    CONSTRAINT quote_items_quantity_check CHECK ((quantity > 0))
);


ALTER TABLE public.quote_items OWNER TO postgres;

--
-- Name: quote_statuses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quote_statuses (
    id integer NOT NULL,
    value text NOT NULL,
    label text NOT NULL,
    color text,
    icon text,
    is_active boolean DEFAULT true
);


ALTER TABLE public.quote_statuses OWNER TO postgres;

--
-- Name: quote_statuses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.quote_statuses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.quote_statuses_id_seq OWNER TO postgres;

--
-- Name: quote_statuses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.quote_statuses_id_seq OWNED BY public.quote_statuses.id;


--
-- Name: quote_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quote_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_name text NOT NULL,
    product_name text,
    product_url text,
    image_url text,
    item_price numeric(10,2),
    item_weight numeric(8,2),
    quantity integer DEFAULT 1,
    options text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.quote_templates OWNER TO postgres;

--
-- Name: received_packages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.received_packages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_address_id uuid NOT NULL,
    tracking_number text,
    carrier text,
    sender_name text,
    sender_store text,
    sender_address jsonb,
    received_date timestamp with time zone DEFAULT now(),
    weight_kg numeric(10,3) NOT NULL,
    dimensions jsonb NOT NULL,
    dimensional_weight_kg numeric(10,3),
    declared_value_usd numeric(10,2),
    package_description text,
    contents_list jsonb DEFAULT '[]'::jsonb,
    photos jsonb DEFAULT '[]'::jsonb,
    condition_notes text,
    status text DEFAULT 'received'::text,
    storage_location text,
    storage_start_date timestamp with time zone DEFAULT now(),
    storage_fee_exempt_until timestamp with time zone DEFAULT (now() + '30 days'::interval),
    consolidation_group_id uuid,
    received_by_staff_id uuid,
    last_scanned_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT received_packages_carrier_check CHECK ((carrier = ANY (ARRAY['ups'::text, 'fedex'::text, 'usps'::text, 'dhl'::text, 'amazon'::text, 'other'::text]))),
    CONSTRAINT received_packages_status_check CHECK ((status = ANY (ARRAY['received'::text, 'processing'::text, 'ready_to_ship'::text, 'consolidated'::text, 'shipped'::text, 'delivered'::text, 'issue'::text])))
);


ALTER TABLE public.received_packages OWNER TO postgres;

--
-- Name: reconciliation_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reconciliation_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reconciliation_id uuid NOT NULL,
    payment_ledger_id uuid,
    system_date date,
    system_amount numeric(15,4),
    system_reference text,
    system_description text,
    statement_date date,
    statement_amount numeric(15,4),
    statement_reference text,
    statement_description text,
    matched boolean DEFAULT false,
    match_type text,
    match_confidence numeric(3,2),
    matched_at timestamp with time zone,
    matched_by uuid,
    discrepancy_amount numeric(15,4) GENERATED ALWAYS AS ((COALESCE(statement_amount, (0)::numeric) - COALESCE(system_amount, (0)::numeric))) STORED,
    discrepancy_reason text,
    resolution_action text,
    resolution_notes text,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reconciliation_items_match_type_check CHECK ((match_type = ANY (ARRAY['exact'::text, 'manual'::text, 'partial'::text, 'suggested'::text, 'unmatched'::text]))),
    CONSTRAINT reconciliation_items_resolution_action_check CHECK ((resolution_action = ANY (ARRAY['accept_difference'::text, 'create_adjustment'::text, 'investigate'::text, 'write_off'::text, 'pending_transaction'::text]))),
    CONSTRAINT reconciliation_items_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'matched'::text, 'discrepancy'::text, 'resolved'::text, 'ignored'::text])))
);


ALTER TABLE public.reconciliation_items OWNER TO postgres;

--
-- Name: TABLE reconciliation_items; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.reconciliation_items IS 'Individual transaction matching within reconciliation sessions';


--
-- Name: reconciliation_rules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reconciliation_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rule_name text NOT NULL,
    rule_type text NOT NULL,
    payment_method text,
    gateway_code text,
    match_field text,
    match_pattern text,
    amount_tolerance numeric(15,4),
    date_tolerance_days integer,
    auto_match boolean DEFAULT false,
    confidence_threshold numeric(3,2) DEFAULT 0.90,
    is_active boolean DEFAULT true,
    priority integer DEFAULT 100,
    times_used integer DEFAULT 0,
    success_count integer DEFAULT 0,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reconciliation_rules_match_field_check CHECK ((match_field = ANY (ARRAY['reference'::text, 'amount'::text, 'description'::text, 'date'::text, 'combined'::text]))),
    CONSTRAINT reconciliation_rules_rule_type_check CHECK ((rule_type = ANY (ARRAY['exact_match'::text, 'fuzzy_match'::text, 'amount_range'::text, 'date_range'::text, 'regex'::text])))
);


ALTER TABLE public.reconciliation_rules OWNER TO postgres;

--
-- Name: TABLE reconciliation_rules; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.reconciliation_rules IS 'Configurable rules for automatic transaction matching';


--
-- Name: refund_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.refund_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    refund_request_id uuid NOT NULL,
    payment_ledger_id uuid NOT NULL,
    allocated_amount numeric(15,4) NOT NULL,
    currency text NOT NULL,
    exchange_rate numeric(15,6) DEFAULT 1,
    base_amount numeric(15,4) NOT NULL,
    gateway_code text,
    gateway_refund_id text,
    gateway_response jsonb,
    status text DEFAULT 'pending'::text,
    processed_at timestamp with time zone,
    refund_payment_id uuid,
    financial_transaction_id uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT refund_items_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text, 'cancelled'::text])))
);


ALTER TABLE public.refund_items OWNER TO postgres;

--
-- Name: TABLE refund_items; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.refund_items IS 'Individual refund allocations across multiple payments';


--
-- Name: refund_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.refund_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_id uuid NOT NULL,
    payment_ledger_id uuid,
    refund_type text NOT NULL,
    requested_amount numeric(15,4) NOT NULL,
    approved_amount numeric(15,4),
    currency text NOT NULL,
    reason_code text NOT NULL,
    reason_description text NOT NULL,
    customer_notes text,
    internal_notes text,
    status text DEFAULT 'pending'::text,
    requested_by uuid NOT NULL,
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    processed_by uuid,
    processed_at timestamp with time zone,
    completed_at timestamp with time zone,
    refund_method text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT refund_requests_reason_code_check CHECK ((reason_code = ANY (ARRAY['order_cancelled'::text, 'price_adjustment'::text, 'overpayment'::text, 'customer_request'::text, 'product_unavailable'::text, 'quality_issue'::text, 'shipping_issue'::text, 'duplicate_payment'::text, 'other'::text]))),
    CONSTRAINT refund_requests_refund_method_check CHECK ((refund_method = ANY (ARRAY['original_payment_method'::text, 'bank_transfer'::text, 'credit_note'::text, 'store_credit'::text]))),
    CONSTRAINT refund_requests_refund_type_check CHECK ((refund_type = ANY (ARRAY['full'::text, 'partial'::text, 'credit_note'::text, 'chargeback'::text, 'overpayment'::text]))),
    CONSTRAINT refund_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'processing'::text, 'completed'::text, 'failed'::text, 'cancelled'::text, 'partially_completed'::text])))
);


ALTER TABLE public.refund_requests OWNER TO postgres;

--
-- Name: TABLE refund_requests; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.refund_requests IS 'Tracks all refund requests with approval workflow';


--
-- Name: rejection_reasons; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rejection_reasons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reason text NOT NULL,
    category text DEFAULT 'general'::text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.rejection_reasons OWNER TO postgres;

--
-- Name: route_customs_tiers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.route_customs_tiers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    origin_country text NOT NULL,
    destination_country text NOT NULL,
    rule_name text NOT NULL,
    price_min numeric(10,2),
    price_max numeric(10,2),
    weight_min numeric(8,3),
    weight_max numeric(8,3),
    logic_type text NOT NULL,
    customs_percentage numeric(5,2) NOT NULL,
    vat_percentage numeric(5,2) NOT NULL,
    priority_order integer DEFAULT 1 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    sales_tax_percentage numeric(5,2) DEFAULT 0,
    CONSTRAINT check_sales_tax_percentage CHECK (((sales_tax_percentage >= (0)::numeric) AND (sales_tax_percentage <= (100)::numeric))),
    CONSTRAINT route_customs_tiers_logic_type_check CHECK ((logic_type = ANY (ARRAY['AND'::text, 'OR'::text])))
);


ALTER TABLE public.route_customs_tiers OWNER TO postgres;

--
-- Name: COLUMN route_customs_tiers.sales_tax_percentage; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.route_customs_tiers.sales_tax_percentage IS 'Sales tax percentage for origin country (e.g., US state tax). Only applies to specific routes like US->NP where origin country charges sales tax on international shipments.';


--
-- Name: share_audit_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.share_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_id uuid,
    user_id uuid,
    action character varying(50) NOT NULL,
    ip_address inet,
    user_agent text,
    details jsonb,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.share_audit_log OWNER TO postgres;

--
-- Name: TABLE share_audit_log; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.share_audit_log IS 'Tracks all actions related to quote sharing for security and analytics';


--
-- Name: shipping_routes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shipping_routes (
    id integer NOT NULL,
    origin_country character varying(3) NOT NULL,
    destination_country character varying(3) NOT NULL,
    base_shipping_cost numeric(10,2) NOT NULL,
    cost_per_kg numeric(10,2) NOT NULL,
    cost_percentage numeric(5,2) DEFAULT 0,
    weight_tiers jsonb DEFAULT '[{"max": 1, "min": 0, "cost": 15.00}, {"max": 3, "min": 1, "cost": 25.00}, {"max": 5, "min": 3, "cost": 35.00}, {"max": null, "min": 5, "cost": 45.00}]'::jsonb,
    carriers jsonb DEFAULT '[{"days": "3-5", "name": "DHL", "cost_multiplier": 1.0}, {"days": "5-7", "name": "FedEx", "cost_multiplier": 0.9}, {"days": "7-14", "name": "USPS", "cost_multiplier": 0.7}]'::jsonb,
    max_weight numeric(8,2),
    restricted_items text[],
    requires_documentation boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    weight_unit text DEFAULT 'kg'::text NOT NULL,
    delivery_options jsonb DEFAULT '[]'::jsonb,
    processing_days integer DEFAULT 2,
    active boolean DEFAULT true,
    customs_clearance_days integer DEFAULT 3,
    shipping_per_kg numeric(10,2) DEFAULT 0.00,
    exchange_rate numeric(10,6) DEFAULT 1.0,
    tax_configuration jsonb DEFAULT '{"minimum_valuation": {"rounding_method": "up", "apply_conversion": true}, "currency_conversion": {"enabled": true, "fallback_rate": 1.0, "cache_duration_minutes": 60}}'::jsonb,
    weight_configuration jsonb DEFAULT '{"weight_validation": {"flag_unusual_weights": true, "max_reasonable_weight": 50.0, "min_reasonable_weight": 0.01}, "dimensional_weight": {"divisor": 5000, "enabled": true}, "auto_weight_detection": true}'::jsonb,
    api_configuration jsonb DEFAULT '{"hsn_lookup": {"enabled": true, "cache_duration": 86400, "primary_source": "local_database", "fallback_source": "local_database"}}'::jsonb,
    customs_percentage numeric(5,2) DEFAULT NULL::numeric,
    vat_percentage numeric(5,2) DEFAULT NULL::numeric,
    CONSTRAINT shipping_routes_exchange_rate_check CHECK ((exchange_rate > (0)::numeric)),
    CONSTRAINT shipping_routes_weight_unit_check CHECK ((weight_unit = ANY (ARRAY['kg'::text, 'lb'::text])))
);


ALTER TABLE public.shipping_routes OWNER TO postgres;

--
-- Name: COLUMN shipping_routes.weight_unit; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.shipping_routes.weight_unit IS 'Weight unit for this shipping route (kg or lb)';


--
-- Name: COLUMN shipping_routes.delivery_options; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.shipping_routes.delivery_options IS 'JSON array of delivery options with structure: [{"id": "string", "name": "string", "carrier": "string", "min_days": number, "max_days": number, "price": number, "active": boolean}]';


--
-- Name: COLUMN shipping_routes.processing_days; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.shipping_routes.processing_days IS 'Number of business days for order processing before shipping';


--
-- Name: COLUMN shipping_routes.active; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.shipping_routes.active IS 'Whether the shipping route is active and available for quoting';


--
-- Name: COLUMN shipping_routes.customs_clearance_days; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.shipping_routes.customs_clearance_days IS 'Number of business days for customs clearance processing';


--
-- Name: COLUMN shipping_routes.shipping_per_kg; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.shipping_routes.shipping_per_kg IS 'Additional shipping cost per kg of weight (multiplied by item weight and added to base cost)';


--
-- Name: COLUMN shipping_routes.exchange_rate; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.shipping_routes.exchange_rate IS 'Exchange rate from origin country currency to destination country currency (e.g., USD to INR rate for US->IN route)';


--
-- Name: shipping_routes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.shipping_routes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.shipping_routes_id_seq OWNER TO postgres;

--
-- Name: shipping_routes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.shipping_routes_id_seq OWNED BY public.shipping_routes.id;


--
-- Name: status_transitions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.status_transitions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_id uuid NOT NULL,
    from_status text NOT NULL,
    to_status text NOT NULL,
    trigger text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    changed_by uuid,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT status_transitions_trigger_check CHECK ((trigger = ANY (ARRAY['payment_received'::text, 'quote_sent'::text, 'order_shipped'::text, 'quote_expired'::text, 'manual'::text, 'auto_calculation'::text])))
);


ALTER TABLE public.status_transitions OWNER TO postgres;

--
-- Name: storage_fees; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.storage_fees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    package_id uuid,
    user_id uuid NOT NULL,
    start_date date NOT NULL,
    end_date date,
    days_stored integer,
    daily_rate_usd numeric(5,2) DEFAULT 1.00,
    total_fee_usd numeric(10,2),
    is_paid boolean DEFAULT false,
    payment_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.storage_fees OWNER TO postgres;

--
-- Name: suite_number_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.suite_number_seq
    START WITH 10000
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.suite_number_seq OWNER TO postgres;

--
-- Name: support_interactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.support_interactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    support_id uuid,
    user_id uuid,
    interaction_type character varying(20) NOT NULL,
    content jsonb DEFAULT '{}'::jsonb NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    is_internal boolean DEFAULT false,
    CONSTRAINT support_interactions_interaction_type_check CHECK (((interaction_type)::text = ANY ((ARRAY['reply'::character varying, 'status_change'::character varying, 'assignment'::character varying, 'escalation'::character varying, 'note'::character varying])::text[]))),
    CONSTRAINT valid_assignment_content CHECK ((((interaction_type)::text <> 'assignment'::text) OR (content ? 'to_user'::text))),
    CONSTRAINT valid_reply_content CHECK ((((interaction_type)::text <> 'reply'::text) OR (content ? 'message'::text))),
    CONSTRAINT valid_status_change_content CHECK ((((interaction_type)::text <> 'status_change'::text) OR ((content ? 'from_status'::text) AND (content ? 'to_status'::text))))
);


ALTER TABLE public.support_interactions OWNER TO postgres;

--
-- Name: TABLE support_interactions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.support_interactions IS 'All interactions and communications related to support records';


--
-- Name: COLUMN support_interactions.interaction_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.support_interactions.interaction_type IS 'Type of interaction: reply, status_change, assignment, escalation, note';


--
-- Name: COLUMN support_interactions.content; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.support_interactions.content IS 'Interaction content structure varies by type';


--
-- Name: COLUMN support_interactions.is_internal; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.support_interactions.is_internal IS 'Whether this interaction is visible to customers';


--
-- Name: support_system; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.support_system (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    quote_id uuid,
    system_type character varying(20) NOT NULL,
    ticket_data jsonb DEFAULT '{}'::jsonb,
    assignment_data jsonb DEFAULT '{}'::jsonb,
    sla_data jsonb DEFAULT '{}'::jsonb,
    notification_prefs jsonb DEFAULT '{}'::jsonb,
    template_data jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT support_system_system_type_check CHECK (((system_type)::text = ANY ((ARRAY['ticket'::character varying, 'rule'::character varying, 'template'::character varying, 'preference'::character varying])::text[]))),
    CONSTRAINT valid_assignment_data CHECK ((((system_type)::text <> 'rule'::text) OR ((assignment_data ? 'rule_name'::text) AND (assignment_data ? 'conditions'::text)))),
    CONSTRAINT valid_template_data CHECK ((((system_type)::text <> 'template'::text) OR ((template_data ? 'name'::text) AND (template_data ? 'content'::text)))),
    CONSTRAINT valid_ticket_data CHECK ((((system_type)::text <> 'ticket'::text) OR ((ticket_data ? 'subject'::text) AND (ticket_data ? 'description'::text) AND (ticket_data ? 'status'::text))))
);


ALTER TABLE public.support_system OWNER TO postgres;

--
-- Name: TABLE support_system; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.support_system IS 'Unified support system consolidating tickets, rules, templates, and preferences';


--
-- Name: COLUMN support_system.system_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.support_system.system_type IS 'Type of support record: ticket, rule, template, preference';


--
-- Name: COLUMN support_system.ticket_data; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.support_system.ticket_data IS 'Main ticket information including status, priority, category, and metadata';


--
-- Name: COLUMN support_system.assignment_data; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.support_system.assignment_data IS 'Auto-assignment rules and conditions';


--
-- Name: COLUMN support_system.sla_data; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.support_system.sla_data IS 'SLA tracking information including response and resolution times';


--
-- Name: COLUMN support_system.notification_prefs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.support_system.notification_prefs IS 'User notification preferences and settings';


--
-- Name: COLUMN support_system.template_data; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.support_system.template_data IS 'Reply templates and their configurations';


--
-- Name: support_tickets_view; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.support_tickets_view AS
 SELECT id,
    user_id,
    quote_id,
    (ticket_data ->> 'subject'::text) AS subject,
    (ticket_data ->> 'description'::text) AS description,
    (ticket_data ->> 'status'::text) AS status,
    (ticket_data ->> 'priority'::text) AS priority,
    (ticket_data ->> 'category'::text) AS category,
    ((ticket_data ->> 'assigned_to'::text))::uuid AS assigned_to,
    created_at,
    updated_at,
    is_active
   FROM public.support_system
  WHERE ((system_type)::text = 'ticket'::text);


ALTER VIEW public.support_tickets_view OWNER TO postgres;

--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    setting_key text NOT NULL,
    setting_value text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.system_settings OWNER TO postgres;

--
-- Name: tax_backup_20250128; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tax_backup_20250128 (
    code text,
    vat numeric(5,2),
    sales_tax numeric(5,2),
    backup_timestamp text
);


ALTER TABLE public.tax_backup_20250128 OWNER TO postgres;

--
-- Name: tax_calculation_audit_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tax_calculation_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_id uuid,
    admin_id uuid,
    calculation_method text NOT NULL,
    valuation_method text NOT NULL,
    previous_calculation_method text,
    previous_valuation_method text,
    change_reason text,
    change_details jsonb DEFAULT '{}'::jsonb,
    item_level_overrides jsonb DEFAULT '[]'::jsonb,
    calculation_comparison jsonb DEFAULT '{"hsn_result": null, "legacy_result": null, "selected_result": null, "variance_percentage": null}'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at timestamp with time zone,
    CONSTRAINT tax_calculation_audit_log_calculation_method_check CHECK ((calculation_method = ANY (ARRAY['auto'::text, 'hsn_only'::text, 'legacy_fallback'::text, 'admin_choice'::text]))),
    CONSTRAINT tax_calculation_audit_log_valuation_method_check CHECK ((valuation_method = ANY (ARRAY['auto'::text, 'actual_price'::text, 'minimum_valuation'::text, 'higher_of_both'::text, 'per_item_choice'::text])))
);


ALTER TABLE public.tax_calculation_audit_log OWNER TO postgres;

--
-- Name: ticket_replies_view; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.ticket_replies_view AS
 SELECT id,
    support_id AS ticket_id,
    user_id,
    (content ->> 'message'::text) AS message,
    is_internal,
    created_at
   FROM public.support_interactions si
  WHERE ((interaction_type)::text = 'reply'::text);


ALTER VIEW public.ticket_replies_view OWNER TO postgres;

--
-- Name: tickets; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.tickets AS
 SELECT id,
    user_id,
    quote_id,
    subject,
    description,
    status,
    priority,
    category,
    assigned_to,
    created_at,
    updated_at,
    is_active
   FROM public.support_tickets_view;


ALTER VIEW public.tickets OWNER TO postgres;

--
-- Name: unified_configuration; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.unified_configuration (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    config_type text NOT NULL,
    config_key text NOT NULL,
    config_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    version integer DEFAULT 1,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


ALTER TABLE public.unified_configuration OWNER TO postgres;

--
-- Name: user_activity_analytics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_activity_analytics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    activity_type character varying(100) NOT NULL,
    activity_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    session_id character varying(255) NOT NULL,
    user_agent text,
    referrer text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.user_activity_analytics OWNER TO postgres;

--
-- Name: TABLE user_activity_analytics; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.user_activity_analytics IS 'Stores user activity data for behavioral analysis and intelligent recommendations';


--
-- Name: COLUMN user_activity_analytics.id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_activity_analytics.id IS 'Unique identifier for the activity record';


--
-- Name: COLUMN user_activity_analytics.user_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_activity_analytics.user_id IS 'Reference to the user who performed this activity';


--
-- Name: COLUMN user_activity_analytics.activity_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_activity_analytics.activity_type IS 'Type of activity (e.g., product:view, quote:create, etc.)';


--
-- Name: COLUMN user_activity_analytics.activity_data; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_activity_analytics.activity_data IS 'Flexible JSONB data containing activity-specific information';


--
-- Name: COLUMN user_activity_analytics.session_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_activity_analytics.session_id IS 'Browser session identifier for grouping related activities';


--
-- Name: COLUMN user_activity_analytics.user_agent; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_activity_analytics.user_agent IS 'Browser user agent string';


--
-- Name: COLUMN user_activity_analytics.referrer; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_activity_analytics.referrer IS 'Page referrer information';


--
-- Name: COLUMN user_activity_analytics.created_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_activity_analytics.created_at IS 'Timestamp when the activity occurred';


--
-- Name: COLUMN user_activity_analytics.updated_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_activity_analytics.updated_at IS 'Timestamp when the record was last updated';


--
-- Name: user_addresses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_addresses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    address_line1 text NOT NULL,
    address_line2 text,
    city text NOT NULL,
    state_province_region text NOT NULL,
    postal_code text NOT NULL,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    phone text,
    recipient_name text,
    country character varying(2),
    destination_country text,
    save_to_profile text
);


ALTER TABLE public.user_addresses OWNER TO postgres;

--
-- Name: TABLE user_addresses; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.user_addresses IS 'User shipping addresses - simplified to use only destination_country field for country information';


--
-- Name: COLUMN user_addresses.phone; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_addresses.phone IS 'Phone number for this specific address';


--
-- Name: COLUMN user_addresses.recipient_name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_addresses.recipient_name IS 'Full name of the person who should receive the package at this address';


--
-- Name: COLUMN user_addresses.country; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_addresses.country IS 'Two-letter ISO country code for package delivery destination (e.g., IN for India, NP for Nepal)';


--
-- Name: user_oauth_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_oauth_data (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    provider text NOT NULL,
    oauth_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);


ALTER TABLE public.user_oauth_data OWNER TO postgres;

--
-- Name: TABLE user_oauth_data; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.user_oauth_data IS 'Stores extended OAuth provider data including addresses, birthday, gender, organization info';


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role text DEFAULT 'user'::text NOT NULL,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    granted_by uuid,
    CONSTRAINT user_roles_role_check CHECK ((role = ANY (ARRAY['user'::text, 'moderator'::text, 'admin'::text])))
);


ALTER TABLE public.user_roles OWNER TO postgres;

--
-- Name: warehouse_locations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.warehouse_locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    location_code text NOT NULL,
    zone text NOT NULL,
    shelf_number integer,
    slot_number integer,
    max_packages integer DEFAULT 5,
    current_packages integer DEFAULT 0,
    max_weight_kg numeric(8,2) DEFAULT 50.0,
    max_dimensions jsonb,
    is_active boolean DEFAULT true,
    maintenance_notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.warehouse_locations OWNER TO postgres;

--
-- Name: warehouse_tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.warehouse_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_type text NOT NULL,
    priority text DEFAULT 'normal'::text,
    description text NOT NULL,
    instructions text,
    package_ids uuid[] DEFAULT '{}'::uuid[],
    consolidation_group_id uuid,
    assigned_to uuid,
    due_date timestamp with time zone,
    status text DEFAULT 'pending'::text,
    completed_at timestamp with time zone,
    completion_notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT warehouse_tasks_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text]))),
    CONSTRAINT warehouse_tasks_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text]))),
    CONSTRAINT warehouse_tasks_task_type_check CHECK ((task_type = ANY (ARRAY['receiving'::text, 'consolidation'::text, 'shipping'::text, 'audit'::text])))
);


ALTER TABLE public.warehouse_tasks OWNER TO postgres;

--
-- Name: webhook_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.webhook_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id character varying(255) NOT NULL,
    webhook_type character varying(50) NOT NULL,
    status character varying(50) NOT NULL,
    user_agent text,
    error_message text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.webhook_logs OWNER TO postgres;

--
-- Name: TABLE webhook_logs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.webhook_logs IS 'Logs all webhook requests for debugging and monitoring';


--
-- Name: COLUMN webhook_logs.request_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.webhook_logs.request_id IS 'Unique identifier for each webhook request';


--
-- Name: COLUMN webhook_logs.webhook_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.webhook_logs.webhook_type IS 'Type of webhook (payu, stripe, etc.)';


--
-- Name: COLUMN webhook_logs.status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.webhook_logs.status IS 'Status of webhook processing (started, success, failed, warning)';


--
-- Name: COLUMN webhook_logs.user_agent; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.webhook_logs.user_agent IS 'User agent from webhook request';


--
-- Name: COLUMN webhook_logs.error_message; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.webhook_logs.error_message IS 'Error message if webhook processing failed';


--
-- Name: schema_migrations; Type: TABLE; Schema: supabase_migrations; Owner: postgres
--

CREATE TABLE supabase_migrations.schema_migrations (
    version text NOT NULL,
    statements text[],
    name text
);


ALTER TABLE supabase_migrations.schema_migrations OWNER TO postgres;

--
-- Name: mfa_activity_log id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mfa_activity_log ALTER COLUMN id SET DEFAULT nextval('public.mfa_activity_log_id_seq'::regclass);


--
-- Name: quote_address_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quote_address_history ALTER COLUMN id SET DEFAULT nextval('public.quote_address_history_id_seq'::regclass);


--
-- Name: quote_statuses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quote_statuses ALTER COLUMN id SET DEFAULT nextval('public.quote_statuses_id_seq'::regclass);


--
-- Name: shipping_routes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipping_routes ALTER COLUMN id SET DEFAULT nextval('public.shipping_routes_id_seq'::regclass);


--
-- Data for Name: extensions; Type: TABLE DATA; Schema: _realtime; Owner: supabase_admin
--

COPY _realtime.extensions (id, type, settings, tenant_external_id, inserted_at, updated_at) FROM stdin;
f6f93636-59c5-48ac-84ce-ec2ed1cae0cb	postgres_cdc_rls	{"region": "us-east-1", "db_host": "gFg4SLRrRkK3h8cFp2K/+13SXjiu0pA5JDhUPid27ww=", "db_name": "sWBpZNdjggEPTQVlI52Zfw==", "db_port": "+enMDFi1J/3IrrquHHwUmA==", "db_user": "uxbEq/zz8DXVD53TOI1zmw==", "slot_name": "supabase_realtime_replication_slot", "db_password": "sWBpZNdjggEPTQVlI52Zfw==", "publication": "supabase_realtime", "ssl_enforced": false, "poll_interval_ms": 100, "poll_max_changes": 100, "poll_max_record_bytes": 1048576}	realtime-dev	2025-07-27 19:27:25	2025-07-27 19:27:25
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: _realtime; Owner: supabase_admin
--

COPY _realtime.schema_migrations (version, inserted_at) FROM stdin;
20210706140551	2025-07-27 19:26:33
20220329161857	2025-07-27 19:26:33
20220410212326	2025-07-27 19:26:33
20220506102948	2025-07-27 19:26:33
20220527210857	2025-07-27 19:26:33
20220815211129	2025-07-27 19:26:33
20220815215024	2025-07-27 19:26:33
20220818141501	2025-07-27 19:26:33
20221018173709	2025-07-27 19:26:33
20221102172703	2025-07-27 19:26:33
20221223010058	2025-07-27 19:26:33
20230110180046	2025-07-27 19:26:33
20230810220907	2025-07-27 19:26:33
20230810220924	2025-07-27 19:26:33
20231024094642	2025-07-27 19:26:33
20240306114423	2025-07-27 19:26:33
20240418082835	2025-07-27 19:26:33
20240625211759	2025-07-27 19:26:33
20240704172020	2025-07-27 19:26:33
20240902173232	2025-07-27 19:26:33
20241106103258	2025-07-27 19:26:33
20250424203323	2025-07-27 19:26:33
20250613072131	2025-07-27 19:26:33
\.


--
-- Data for Name: tenants; Type: TABLE DATA; Schema: _realtime; Owner: supabase_admin
--

COPY _realtime.tenants (id, name, external_id, jwt_secret, max_concurrent_users, inserted_at, updated_at, max_events_per_second, postgres_cdc_default, max_bytes_per_second, max_channels_per_client, max_joins_per_second, suspend, jwt_jwks, notify_private_alpha, private_only, migrations_ran, broadcast_adapter) FROM stdin;
e2dc0069-2f8a-47da-8061-8aa0fd2f4919	realtime-dev	realtime-dev	iNjicxc4+llvc9wovDvqymwfnj9teWMlyOIbJ8Fh6j2WNU8CIJ2ZgjR6MUIKqSmeDmvpsKLsZ9jgXJmQPpwL8w==	200	2025-07-27 19:27:25	2025-07-27 19:27:26	100	postgres_cdc_rls	100000	100	100	f	{"keys": [{"k": "c3VwZXItc2VjcmV0LWp3dC10b2tlbi13aXRoLWF0LWxlYXN0LTMyLWNoYXJhY3RlcnMtbG9uZw", "kty": "oct"}]}	f	f	62	phoenix
\.


--
-- Data for Name: admin_overrides; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admin_overrides (id, override_type, scope, scope_identifier, override_data, admin_id, justification, expires_at, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: authenticated_checkout_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.authenticated_checkout_sessions (id, session_token, user_id, quote_ids, temporary_shipping_address, payment_currency, payment_method, payment_amount, status, expires_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: bank_account_details; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bank_account_details (id, account_name, account_number, bank_name, branch_name, iban, swift_code, country_code, is_fallback, custom_fields, field_labels, display_order, is_active, created_at, updated_at, destination_country, upi_id, upi_qr_string, payment_qr_url, instructions, currency_code) FROM stdin;
\.


--
-- Data for Name: bank_statement_imports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bank_statement_imports (id, reconciliation_id, file_name, file_url, file_format, total_rows, processed_rows, successful_rows, failed_rows, status, error_log, imported_by, imported_at, completed_at, created_at) FROM stdin;
\.


--
-- Data for Name: blog_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.blog_categories (id, name, slug, description, color, display_order, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: blog_comments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.blog_comments (id, post_id, user_id, author_name, author_email, content, status, parent_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: blog_post_tags; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.blog_post_tags (id, post_id, tag_id, created_at) FROM stdin;
\.


--
-- Data for Name: blog_posts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.blog_posts (id, title, slug, excerpt, content, featured_image_url, status, featured, reading_time_minutes, category_id, author_id, meta_title, meta_description, og_title, og_description, og_image, twitter_title, twitter_description, twitter_image, focus_keyword, canonical_url, published_at, created_at, updated_at, views_count) FROM stdin;
\.


--
-- Data for Name: blog_tags; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.blog_tags (id, name, slug, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: chart_of_accounts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.chart_of_accounts (code, name, account_type, parent_code, is_active, description, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: consolidation_groups; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.consolidation_groups (id, user_id, group_name, package_count, original_package_ids, consolidated_weight_kg, consolidated_dimensions, consolidated_photos, consolidation_fee_usd, storage_fees_usd, service_fee_usd, status, consolidated_by_staff_id, consolidation_date, created_at, updated_at, quote_id) FROM stdin;
\.


--
-- Data for Name: country_payment_preferences; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.country_payment_preferences (id, country_code, gateway_code, priority, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: country_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.country_settings (code, name, currency, rate_from_usd, sales_tax, vat, min_shipping, additional_shipping, additional_weight, weight_unit, volumetric_divisor, payment_gateway_fixed_fee, payment_gateway_percent_fee, purchase_allowed, shipping_allowed, payment_gateway, created_at, updated_at, minimum_payment_amount, decimal_places, thousand_separator, decimal_separator, symbol_position, symbol_space, priority_thresholds, available_gateways, default_gateway, gateway_config) FROM stdin;
CA	Canada	CAD	1.350000	0.00	0.00	0.00	0.00	0.00	kg	5000	0.00	0.00	t	t	stripe	2025-07-28 01:52:35.430981+00	2025-07-28 01:52:35.430981+00	5.00	2	,	.	before	f	{"low": 0, "normal": 500, "urgent": 2000}	{bank_transfer}	bank_transfer	{}
MX	Mexico	MXN	17.500000	0.00	0.00	0.00	0.00	0.00	kg	5000	0.00	0.00	t	t	stripe	2025-07-28 01:52:35.430981+00	2025-07-28 01:52:35.430981+00	50.00	2	,	.	before	f	{"low": 0, "normal": 500, "urgent": 2000}	{bank_transfer}	bank_transfer	{}
DE	Germany	EUR	0.920000	0.00	0.00	0.00	0.00	0.00	kg	5000	0.00	0.00	t	t	stripe	2025-07-28 01:52:35.430981+00	2025-07-28 01:52:35.430981+00	5.00	2	,	.	before	f	{"low": 0, "normal": 500, "urgent": 2000}	{bank_transfer}	bank_transfer	{}
FR	France	EUR	0.920000	0.00	0.00	0.00	0.00	0.00	kg	5000	0.00	0.00	t	t	stripe	2025-07-28 01:52:35.430981+00	2025-07-28 01:52:35.430981+00	5.00	2	,	.	before	f	{"low": 0, "normal": 500, "urgent": 2000}	{bank_transfer}	bank_transfer	{}
IT	Italy	EUR	0.920000	0.00	0.00	0.00	0.00	0.00	kg	5000	0.00	0.00	t	t	stripe	2025-07-28 01:52:35.430981+00	2025-07-28 01:52:35.430981+00	5.00	2	,	.	before	f	{"low": 0, "normal": 500, "urgent": 2000}	{bank_transfer}	bank_transfer	{}
ES	Spain	EUR	0.920000	0.00	0.00	0.00	0.00	0.00	kg	5000	0.00	0.00	t	t	stripe	2025-07-28 01:52:35.430981+00	2025-07-28 01:52:35.430981+00	5.00	2	,	.	before	f	{"low": 0, "normal": 500, "urgent": 2000}	{bank_transfer}	bank_transfer	{}
NL	Netherlands	EUR	0.920000	0.00	0.00	0.00	0.00	0.00	kg	5000	0.00	0.00	t	t	stripe	2025-07-28 01:52:35.430981+00	2025-07-28 01:52:35.430981+00	5.00	2	,	.	before	f	{"low": 0, "normal": 500, "urgent": 2000}	{bank_transfer}	bank_transfer	{}
SE	Sweden	SEK	10.850000	0.00	0.00	0.00	0.00	0.00	kg	5000	0.00	0.00	t	t	stripe	2025-07-28 01:52:35.430981+00	2025-07-28 01:52:35.430981+00	50.00	2	,	.	before	f	{"low": 0, "normal": 500, "urgent": 2000}	{bank_transfer}	bank_transfer	{}
NO	Norway	NOK	11.200000	0.00	0.00	0.00	0.00	0.00	kg	5000	0.00	0.00	t	t	stripe	2025-07-28 01:52:35.430981+00	2025-07-28 01:52:35.430981+00	50.00	2	,	.	before	f	{"low": 0, "normal": 500, "urgent": 2000}	{bank_transfer}	bank_transfer	{}
DK	Denmark	DKK	6.850000	0.00	0.00	0.00	0.00	0.00	kg	5000	0.00	0.00	t	t	stripe	2025-07-28 01:52:35.430981+00	2025-07-28 01:52:35.430981+00	35.00	2	,	.	before	f	{"low": 0, "normal": 500, "urgent": 2000}	{bank_transfer}	bank_transfer	{}
CH	Switzerland	CHF	0.890000	0.00	0.00	0.00	0.00	0.00	kg	5000	0.00	0.00	t	t	stripe	2025-07-28 01:52:35.430981+00	2025-07-28 01:52:35.430981+00	5.00	2	,	.	before	f	{"low": 0, "normal": 500, "urgent": 2000}	{bank_transfer}	bank_transfer	{}
SG	Singapore	SGD	1.350000	0.00	0.00	0.00	0.00	0.00	kg	5000	0.00	0.00	t	t	stripe	2025-07-28 01:52:35.430981+00	2025-07-28 01:52:35.430981+00	7.00	2	,	.	before	f	{"low": 0, "normal": 500, "urgent": 2000}	{bank_transfer}	bank_transfer	{}
HK	Hong Kong	HKD	7.850000	0.00	0.00	0.00	0.00	0.00	kg	5000	0.00	0.00	t	t	stripe	2025-07-28 01:52:35.430981+00	2025-07-28 01:52:35.430981+00	40.00	2	,	.	before	f	{"low": 0, "normal": 500, "urgent": 2000}	{bank_transfer}	bank_transfer	{}
MY	Malaysia	MYR	4.650000	0.00	0.00	0.00	0.00	0.00	kg	5000	0.00	0.00	t	t	stripe	2025-07-28 01:52:35.430981+00	2025-07-28 01:52:35.430981+00	20.00	2	,	.	before	f	{"low": 0, "normal": 500, "urgent": 2000}	{bank_transfer}	bank_transfer	{}
TH	Thailand	THB	36.000000	0.00	0.00	0.00	0.00	0.00	kg	5000	0.00	0.00	t	t	stripe	2025-07-28 01:52:35.430981+00	2025-07-28 01:52:35.430981+00	150.00	2	,	.	before	f	{"low": 0, "normal": 500, "urgent": 2000}	{bank_transfer}	bank_transfer	{}
KR	South Korea	KRW	1320.000000	0.00	0.00	0.00	0.00	0.00	kg	5000	0.00	0.00	t	t	stripe	2025-07-28 01:52:35.430981+00	2025-07-28 01:52:35.430981+00	6000.00	2	,	.	before	f	{"low": 0, "normal": 500, "urgent": 2000}	{bank_transfer}	bank_transfer	{}
TW	Taiwan	TWD	31.500000	0.00	0.00	0.00	0.00	0.00	kg	5000	0.00	0.00	t	t	stripe	2025-07-28 01:52:35.430981+00	2025-07-28 01:52:35.430981+00	150.00	2	,	.	before	f	{"low": 0, "normal": 500, "urgent": 2000}	{bank_transfer}	bank_transfer	{}
AE	United Arab Emirates	AED	3.670000	0.00	0.00	0.00	0.00	0.00	kg	5000	0.00	0.00	t	t	stripe	2025-07-28 01:52:35.430981+00	2025-07-28 01:52:35.430981+00	18.00	2	,	.	before	f	{"low": 0, "normal": 500, "urgent": 2000}	{bank_transfer}	bank_transfer	{}
SA	Saudi Arabia	SAR	3.750000	0.00	0.00	0.00	0.00	0.00	kg	5000	0.00	0.00	t	t	stripe	2025-07-28 01:52:35.430981+00	2025-07-28 01:52:35.430981+00	19.00	2	,	.	before	f	{"low": 0, "normal": 500, "urgent": 2000}	{bank_transfer}	bank_transfer	{}
ZA	South Africa	ZAR	18.850000	0.00	0.00	0.00	0.00	0.00	kg	5000	0.00	0.00	t	t	stripe	2025-07-28 01:52:35.430981+00	2025-07-28 01:52:35.430981+00	90.00	2	,	.	before	f	{"low": 0, "normal": 500, "urgent": 2000}	{bank_transfer}	bank_transfer	{}
BR	Brazil	BRL	5.150000	0.00	0.00	0.00	0.00	0.00	kg	5000	0.00	0.00	t	t	stripe	2025-07-28 01:52:35.430981+00	2025-07-28 01:52:35.430981+00	25.00	2	,	.	before	f	{"low": 0, "normal": 500, "urgent": 2000}	{bank_transfer}	bank_transfer	{}
AR	Argentina	ARS	350.000000	0.00	0.00	0.00	0.00	0.00	kg	5000	0.00	0.00	t	t	stripe	2025-07-28 01:52:35.430981+00	2025-07-28 01:52:35.430981+00	1750.00	2	,	.	before	f	{"low": 0, "normal": 500, "urgent": 2000}	{bank_transfer}	bank_transfer	{}
CL	Chile	CLP	950.000000	0.00	0.00	0.00	0.00	0.00	kg	5000	0.00	0.00	t	t	stripe	2025-07-28 01:52:35.430981+00	2025-07-28 01:52:35.430981+00	4500.00	2	,	.	before	f	{"low": 0, "normal": 500, "urgent": 2000}	{bank_transfer}	bank_transfer	{}
NZ	New Zealand	NZD	1.650000	0.00	0.00	0.00	0.00	0.00	kg	5000	0.00	0.00	t	t	stripe	2025-07-28 01:52:35.430981+00	2025-07-28 01:52:35.430981+00	8.00	2	,	.	before	f	{"low": 0, "normal": 500, "urgent": 2000}	{bank_transfer}	bank_transfer	{}
RU	Russia	RUB	92.000000	0.00	0.00	0.00	0.00	0.00	kg	5000	0.00	0.00	t	t	stripe	2025-07-28 01:52:35.430981+00	2025-07-28 01:52:35.430981+00	450.00	2	,	.	before	f	{"low": 0, "normal": 500, "urgent": 2000}	{bank_transfer}	bank_transfer	{}
CN	China	CNY	7.250000	0.00	10.00	1500.00	0.00	200.00	kg	5000	0.00	2.90	t	t	stripe	2025-07-28 01:51:44.286904+00	2025-07-28 01:51:44.286904+00	35.00	2	,	.	before	f	{"low": 0, "normal": 75000, "urgent": 300000}	{bank_transfer}	bank_transfer	{}
IN	India	INR	83.150000	0.00	18.00	500.00	0.00	100.00	kg	5000	0.00	2.50	t	t	payu	2025-07-28 01:51:44.286904+00	2025-07-28 01:51:44.286904+00	415.00	2	,	.	before	f	{"low": 0, "normal": 41500, "urgent": 166000}	{bank_transfer}	bank_transfer	{}
NP	Nepal	NPR	133.200000	0.00	13.00	1000.00	0.00	200.00	kg	5000	0.00	1.50	t	t	esewa	2025-07-28 01:51:44.286904+00	2025-07-28 01:51:44.286904+00	665.00	2	,	.	before	f	{"low": 0, "normal": 66500, "urgent": 266000}	{bank_transfer}	bank_transfer	{}
US	United States	USD	1.000000	8.00	0.00	10.00	0.00	2.00	lbs	5000	0.00	2.90	t	t	stripe	2025-07-28 01:51:44.286904+00	2025-07-28 01:51:44.286904+00	10.00	2	,	.	before	f	{"low": 0, "normal": 500, "urgent": 2000}	{bank_transfer}	bank_transfer	{}
\.


--
-- Data for Name: credit_note_applications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.credit_note_applications (id, credit_note_id, quote_id, applied_amount, currency, exchange_rate, base_amount, status, payment_ledger_id, financial_transaction_id, reversed_by, reversal_reason, reversed_at, applied_by, applied_at, notes, created_at) FROM stdin;
\.


--
-- Data for Name: credit_note_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.credit_note_history (id, credit_note_id, action, previous_status, new_status, amount_change, description, performed_by, performed_at, metadata) FROM stdin;
\.


--
-- Data for Name: credit_notes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.credit_notes (id, note_number, note_type, quote_id, refund_request_id, customer_id, amount, currency, exchange_rate, base_amount, amount_used, reason, description, valid_from, valid_until, minimum_order_value, allowed_categories, allowed_countries, status, issued_by, issued_at, approved_by, approved_at, cancelled_by, cancelled_at, cancellation_reason, metadata, internal_notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: customer_addresses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.customer_addresses (id, user_id, suite_number, full_address, address_type, assigned_date, status, created_at, updated_at) FROM stdin;
3e171258-4034-45d1-95e7-63c025a374c1	65382938-763f-4e70-81c2-b8913d198b0c	IWB10002	iwishBag Forwarding - IWB10002\niwishBag Forwarding\n1234 Warehouse Street\nNew York, NY 10001\nUnited States\nSuite: IWB10002	standard	2025-07-28 04:05:19.759492+00	active	2025-07-28 04:05:19.759492+00	2025-07-28 04:05:19.759492+00
\.


--
-- Data for Name: customs_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.customs_categories (id, name, duty_percent, created_at, updated_at) FROM stdin;
fe7d4458-4788-402f-9dc7-6b7bf1d586e9	Electronics	5.00	2025-07-28 01:38:47.686675+00	2025-07-28 01:38:47.686675+00
3889c82c-0846-40be-b62f-4bd3ce65c0ed	Clothing	10.00	2025-07-28 01:38:47.686675+00	2025-07-28 01:38:47.686675+00
59394aac-aadd-48c1-a239-d3c87353dfdc	Cosmetics	15.00	2025-07-28 01:38:47.686675+00	2025-07-28 01:38:47.686675+00
97b89a58-881a-4e12-8ad8-7e487f7cadd2	Accessories	20.00	2025-07-28 01:38:47.686675+00	2025-07-28 01:38:47.686675+00
\.


--
-- Data for Name: customs_rules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.customs_rules (id, name, priority, is_active, conditions, actions, advanced, created_at, updated_at, origin_country, destination_country) FROM stdin;
\.


--
-- Data for Name: email_queue; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.email_queue (id, recipient_email, subject, html_content, text_content, template_id, related_entity_type, related_entity_id, status, attempts, max_attempts, scheduled_for, last_attempt_at, sent_at, error_message, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: email_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.email_settings (id, setting_key, setting_value, description, created_at, updated_at) FROM stdin;
b7124afe-4004-4855-8cb9-c10ca5ff9424	email_sending_enabled	true	Global toggle for enabling/disabling all email sending	2025-07-28 01:38:47.66263+00	2025-07-28 01:38:47.66263+00
608ff35e-3733-4fb2-856a-5c0afde3237e	cart_abandonment_enabled	true	Toggle for cart abandonment emails specifically	2025-07-28 01:38:47.66263+00	2025-07-28 01:38:47.66263+00
902b92e9-de7f-46f5-8d9e-c1f57eb6298c	quote_notifications_enabled	true	Toggle for quote notification emails	2025-07-28 01:38:47.66263+00	2025-07-28 01:38:47.66263+00
7174060c-f22f-4f41-b21a-576a8a21b848	order_notifications_enabled	true	Toggle for order notification emails	2025-07-28 01:38:47.66263+00	2025-07-28 01:38:47.66263+00
404a23cc-ea14-4f43-8af6-9a349649a46d	status_notifications_enabled	true	Toggle for status change notification emails	2025-07-28 01:38:47.66263+00	2025-07-28 01:38:47.66263+00
\.


--
-- Data for Name: email_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.email_templates (id, name, subject, html_content, template_type, variables, is_active, created_at, updated_at, category, auto_send, trigger_conditions) FROM stdin;
72d0cfbb-0f5d-4c6a-9396-07a445688232	quote_confirmation	Your Quote Request Confirmation	Dear {{customer_name}},<br><br>Thank you for your quote request for {{product_name}}.<br><br>We will review your request and get back to you within 24 hours.<br><br>Quote ID: {{quote_id}}<br>Estimated Total: {{estimated_total}}<br><br>Best regards,<br>iWishBag Team	quote_notification	{"quote_id": "string", "product_name": "string", "customer_name": "string", "estimated_total": "string"}	t	2025-07-28 01:51:18.919533+00	2025-07-28 01:51:18.919533+00	general	f	{}
07912c76-4c18-4be9-aff0-e250bc050c48	order_confirmation	Order Confirmation - {{order_id}}	Dear {{customer_name}},<br><br>Your order has been confirmed!<br><br>Order ID: {{order_id}}<br>Total Amount: {{total_amount}}<br>Payment Method: {{payment_method}}<br><br>We will keep you updated on your order status.<br><br>Best regards,<br>iWishBag Team	order_notification	{"order_id": "string", "total_amount": "string", "customer_name": "string", "payment_method": "string"}	t	2025-07-28 01:51:18.919533+00	2025-07-28 01:51:18.919533+00	general	f	{}
b14c919c-31f2-4e70-b457-3fb70a87d39f	cart_abandonment_recovery	Complete Your Purchase - Your Cart is Waiting!	Hi there!<br><br>We noticed you left some items in your cart. Don't let them get away!<br><br>Your cart contains {product_name} worth {cart_value}.<br><br>Complete your purchase now and enjoy your items!<br><br>Best regards,<br>The Team	cart_abandonment	{"cart_value": "string", "product_name": "string"}	t	2025-07-28 01:51:18.919533+00	2025-07-28 01:51:18.919533+00	general	f	{}
dc9be22d-a0d9-4bda-8e16-7915055704ac	cart_abandonment_discount	Special Offer - 10% Off Your Abandoned Cart!	Hi there!<br><br>We noticed you left some items in your cart. As a special offer, we're giving you 10% off!<br><br>Your cart contains {product_name} worth {cart_value}.<br>With your discount: {discounted_value}<br><br>Use code: ABANDON10<br><br>Complete your purchase now!<br><br>Best regards,<br>The Team	cart_abandonment	{"cart_value": "string", "product_name": "string", "discounted_value": "string"}	t	2025-07-28 01:51:18.919533+00	2025-07-28 01:51:18.919533+00	general	f	{}
25087856-1739-4a76-bddb-30c3ab172869	bank_transfer_pending	Bank Transfer Instructions - Order {{order_id}}	Dear {{customer_name}},<br><br>Thank you for your order! Please complete the bank transfer to process your order.<br><br><strong>Order Details:</strong><br>Order ID: {{order_id}}<br>Total Amount: {{total_amount}} {{currency}}<br><br><strong>Bank Details:</strong><br>{{bank_details}}<br><br><strong>Important:</strong><br>• Please use your Order ID ({{order_id}}) as the payment reference<br>• Send payment confirmation to {{support_email}}<br>• Your order will be processed within 24 hours of payment confirmation<br><br>If you have any questions, please contact us.<br><br>Best regards,<br>iWishBag Team	payment_notification	{"currency": "string", "order_id": "string", "bank_details": "string", "total_amount": "string", "customer_name": "string", "support_email": "string"}	t	2025-07-28 01:51:18.919533+00	2025-07-28 01:51:18.919533+00	general	f	{}
8ce21f81-19c0-4f42-b794-a307c086d179	cod_order_confirmed	Cash on Delivery Order Confirmed - {{order_id}}	Dear {{customer_name}},<br><br>Your Cash on Delivery order has been confirmed!<br><br><strong>Order Details:</strong><br>Order ID: {{order_id}}<br>Total Amount: {{total_amount}} {{currency}}<br>Delivery Address: {{delivery_address}}<br><br><strong>What happens next:</strong><br>• We will process your order within 24 hours<br>• You will receive tracking information once shipped<br>• Payment will be collected upon delivery<br>• Please keep {{total_amount}} {{currency}} ready in cash<br><br>Thank you for choosing iWishBag!<br><br>Best regards,<br>iWishBag Team	order_notification	{"currency": "string", "order_id": "string", "total_amount": "string", "customer_name": "string", "delivery_address": "string"}	t	2025-07-28 01:51:18.919533+00	2025-07-28 01:51:18.919533+00	general	f	{}
5820f7f5-d9c6-4b4d-a0b6-772e85f00c7a	payment_received	Payment Received - Order {{order_id}}	Dear {{customer_name}},<br><br>Great news! We have received your payment.<br><br><strong>Payment Details:</strong><br>Order ID: {{order_id}}<br>Amount Paid: {{amount_paid}} {{currency}}<br>Payment Method: {{payment_method}}<br>Status: {{payment_status}}<br><br>Your order is now being processed and you will receive shipping information soon.<br><br>Thank you for your payment!<br><br>Best regards,<br>iWishBag Team	payment_notification	{"currency": "string", "order_id": "string", "amount_paid": "string", "customer_name": "string", "payment_method": "string", "payment_status": "string"}	t	2025-07-28 01:51:18.919533+00	2025-07-28 01:51:18.919533+00	general	f	{}
461334ba-3661-4ae6-abc0-0fd23f910f74	partial_payment_received	Partial Payment Received - Order {{order_id}}	Dear {{customer_name}},<br><br>We have received a partial payment for your order.<br><br><strong>Payment Details:</strong><br>Order ID: {{order_id}}<br>Total Amount: {{total_amount}} {{currency}}<br>Amount Paid: {{amount_paid}} {{currency}}<br>Remaining Balance: {{remaining_amount}} {{currency}}<br><br><strong>Next Steps:</strong><br>Please pay the remaining balance of {{remaining_amount}} {{currency}} to process your order.<br><br>{{bank_details}}<br><br>If you have any questions about this payment, please contact us.<br><br>Best regards,<br>iWishBag Team	payment_notification	{"currency": "string", "order_id": "string", "amount_paid": "string", "bank_details": "string", "total_amount": "string", "customer_name": "string", "remaining_amount": "string"}	t	2025-07-28 01:51:18.919533+00	2025-07-28 01:51:18.919533+00	general	f	{}
c93f5c02-f898-476c-b969-71088eadc33d	overpayment_received	Overpayment Received - Order {{order_id}}	Dear {{customer_name}},<br><br>We have received your payment. However, the amount paid exceeds your order total.<br><br><strong>Payment Details:</strong><br>Order ID: {{order_id}}<br>Order Total: {{total_amount}} {{currency}}<br>Amount Paid: {{amount_paid}} {{currency}}<br>Excess Amount: {{excess_amount}} {{currency}}<br><br><strong>Refund Options:</strong><br>• We can refund the excess amount to your original payment method<br>• Keep as credit for future orders<br>• Apply to another pending order<br><br>Please reply to this email with your preference or contact our support team.<br><br>Best regards,<br>iWishBag Team	payment_notification	{"currency": "string", "order_id": "string", "amount_paid": "string", "total_amount": "string", "customer_name": "string", "excess_amount": "string"}	t	2025-07-28 01:51:18.919533+00	2025-07-28 01:51:18.919533+00	general	f	{}
01bf05a6-2e82-4d42-bd95-5b5b369b3f4b	payment_reminder_1	Payment Reminder - Order {{order_id}}	Dear {{customer_name}},<br><br>This is a friendly reminder that we are still waiting for your payment.<br><br><strong>Order Details:</strong><br>Order ID: {{order_id}}<br>Total Amount: {{total_amount}} {{currency}}<br>Days Pending: 3 days<br><br>{{bank_details}}<br><br>Please complete your payment soon to avoid order cancellation.<br><br>If you have already made the payment, please send us the confirmation.<br><br>Best regards,<br>iWishBag Team	payment_reminder	{"currency": "string", "order_id": "string", "bank_details": "string", "total_amount": "string", "customer_name": "string"}	t	2025-07-28 01:51:18.919533+00	2025-07-28 01:51:18.919533+00	general	f	{}
901a6686-6cc4-4845-afe0-1de58e599cff	payment_reminder_2	Second Payment Reminder - Order {{order_id}}	Dear {{customer_name}},<br><br>We haven't received your payment yet. Your order has been pending for 7 days.<br><br><strong>Order Details:</strong><br>Order ID: {{order_id}}<br>Total Amount: {{total_amount}} {{currency}}<br><br><strong>⚠️ Important:</strong> Your order will be cancelled in 7 days if payment is not received.<br><br>{{bank_details}}<br><br>Please complete your payment as soon as possible.<br><br>Need help? Contact us at {{support_email}}<br><br>Best regards,<br>iWishBag Team	payment_reminder	{"currency": "string", "order_id": "string", "bank_details": "string", "total_amount": "string", "customer_name": "string", "support_email": "string"}	t	2025-07-28 01:51:18.919533+00	2025-07-28 01:51:18.919533+00	general	f	{}
9a7430fe-59ac-4672-bbe4-f967ae91dcc6	payment_reminder_final	Final Payment Reminder - Order {{order_id}}	Dear {{customer_name}},<br><br><strong>⚠️ FINAL NOTICE: Your order will be cancelled tomorrow if payment is not received.</strong><br><br>Order ID: {{order_id}}<br>Total Amount: {{total_amount}} {{currency}}<br>Days Pending: 14 days<br><br>This is your final reminder. Please make the payment today to keep your order active.<br><br>{{bank_details}}<br><br>After tomorrow, you will need to place a new order.<br><br>If you no longer wish to proceed with this order, please let us know.<br><br>Best regards,<br>iWishBag Team	payment_reminder	{"currency": "string", "order_id": "string", "bank_details": "string", "total_amount": "string", "customer_name": "string"}	t	2025-07-28 01:51:18.919533+00	2025-07-28 01:51:18.919533+00	general	f	{}
1fce0639-068d-4901-ab10-03f21f2c6c66	Quote Discussion New Message	New message about your quote #{{quote_id}}	<h2>New Message Received</h2>\n     <p>Hello {{customer_name}},</p>\n     <p>You have received a new message regarding your quote #{{quote_id}}.</p>\n     <div style="background: #f5f5f5; padding: 15px; margin: 20px 0; border-left: 4px solid #0066cc;">\n       <strong>From:</strong> {{sender_name}}<br>\n       <strong>Message:</strong><br>\n       {{message_content}}\n     </div>\n     <p><a href="{{quote_url}}" style="background: #0066cc; color: white; padding: 10px 20px; text-decoration: none;">View Quote & Reply</a></p>\n     <p>Best regards,<br>iwishBag Team</p>	quote_messaging	{"quote_id": "text", "quote_url": "text", "sender_name": "text", "customer_name": "text", "message_content": "text"}	t	2025-07-28 02:09:24.091173+00	2025-07-28 02:09:24.091173+00	quote_messaging	t	{}
9dc8eed0-c7ec-452a-b8ac-f8f35743127f	Admin Quote Message Notification	New customer message for quote #{{quote_id}}	<h2>Customer Message Received</h2>\n     <p>A customer has sent a message regarding quote #{{quote_id}}.</p>\n     <div style="background: #f5f5f5; padding: 15px; margin: 20px 0; border-left: 4px solid #ff6600;">\n       <strong>Customer:</strong> {{customer_name}} ({{customer_email}})<br>\n       <strong>Quote:</strong> #{{quote_id}}<br>\n       <strong>Message:</strong><br>\n       {{message_content}}\n     </div>\n     <p><a href="{{admin_quote_url}}" style="background: #ff6600; color: white; padding: 10px 20px; text-decoration: none;">View in Admin Panel</a></p>	admin_notifications	{"quote_id": "text", "customer_name": "text", "customer_email": "text", "admin_quote_url": "text", "message_content": "text"}	t	2025-07-28 02:09:24.091173+00	2025-07-28 02:09:24.091173+00	admin_notifications	t	{}
2085103d-9a37-4214-98ef-5f0f2b3b95ca	Payment Proof Submitted	Payment proof submitted for quote #{{quote_id}}	<h2>Payment Proof Submitted</h2>\n     <p>A customer has submitted payment proof for quote #{{quote_id}}.</p>\n     <div style="background: #f0f8f0; padding: 15px; margin: 20px 0; border-left: 4px solid #28a745;">\n       <strong>Customer:</strong> {{customer_name}} ({{customer_email}})<br>\n       <strong>Quote:</strong> #{{quote_id}}<br>\n       <strong>Attachment:</strong> {{attachment_name}}<br>\n       <strong>Message:</strong><br>\n       {{message_content}}\n     </div>\n     <p><a href="{{admin_quote_url}}" style="background: #28a745; color: white; padding: 10px 20px; text-decoration: none;">Review & Verify</a></p>	admin_notifications	{"quote_id": "text", "customer_name": "text", "customer_email": "text", "admin_quote_url": "text", "attachment_name": "text", "message_content": "text"}	t	2025-07-28 02:09:24.091173+00	2025-07-28 02:09:24.091173+00	admin_notifications	t	{}
\.


--
-- Data for Name: financial_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.financial_transactions (id, transaction_date, transaction_type, reference_type, reference_id, description, debit_account, credit_account, amount, currency, status, posted_at, reversed_by, reversal_reason, created_by, approved_by, approved_at, notes, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: gateway_refunds; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.gateway_refunds (id, gateway_refund_id, gateway_transaction_id, gateway_code, payment_transaction_id, quote_id, refund_amount, original_amount, currency, refund_type, reason_code, reason_description, admin_notes, customer_note, status, gateway_status, gateway_response, refund_date, completed_at, failed_at, processed_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: global_tax_method_preferences; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.global_tax_method_preferences (id, preference_scope, scope_identifier, default_calculation_method, default_valuation_method, fallback_chain, admin_id, is_active, created_at, updated_at) FROM stdin;
5fcb3621-e76b-465f-b31d-f45c8ba2a11b	system_default	\N	auto	auto	[["hsn_only"], ["legacy_fallback"]]	\N	t	2025-07-28 03:46:03.378683+00	2025-07-28 03:46:03.378683+00
\.


--
-- Data for Name: guest_checkout_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.guest_checkout_sessions (id, session_token, quote_id, guest_name, guest_email, guest_phone, shipping_address, payment_currency, payment_method, payment_amount, status, expires_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: hsn_master; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.hsn_master (id, hsn_code, description, category, subcategory, keywords, minimum_valuation_usd, requires_currency_conversion, weight_data, tax_data, classification_data, is_active, created_at, updated_at) FROM stdin;
658d3d53-0bd1-4e03-bcbc-3cc48ff65787	3303	Perfumes and fragrances	beauty	fragrances	{perfume,cologne,fragrance,"eau de toilette","eau de parfum","body spray"}	25.00	t	{"packaging": {"additional_weight": 0.03}, "typical_weights": {"per_unit": {"max": 0.200, "min": 0.050, "average": 0.100}}}	{"typical_rates": {"gst": {"standard": 18}, "vat": {"common": 13}, "customs": {"max": 30, "min": 20, "common": 25}}}	{"auto_classification": {"keywords": ["perfume", "cologne", "fragrance", "eau de"], "confidence": 0.95}}	t	2025-07-28 03:49:25.508844+00	2025-07-28 03:49:41.663755+00
dd53a31f-4c78-4b9b-b610-2eca7e9f85ee	3401	Skincare and personal care products	beauty	skincare	{skincare,moisturizer,cleanser,serum,sunscreen,"face wash",toner}	10.00	t	{"packaging": {"additional_weight": 0.02}, "typical_weights": {"per_unit": {"max": 0.300, "min": 0.030, "average": 0.120}}}	{"typical_rates": {"gst": {"standard": 18}, "vat": {"common": 13}, "customs": {"max": 20, "min": 10, "common": 15}}}	{"auto_classification": {"keywords": ["skincare", "moisturizer", "cleanser", "serum"], "confidence": 0.88}}	t	2025-07-28 03:49:25.508844+00	2025-07-28 03:49:41.663755+00
f2c2142f-d295-4038-9cf9-6525f1dd481e	9506	Sports equipment and gear	sports	equipment	{sports,fitness,gym,exercise,weights,dumbbells,"yoga mat"}	20.00	t	{"packaging": {"additional_weight": 0.10}, "typical_weights": {"per_unit": {"max": 10.000, "min": 0.200, "average": 2.000}}}	{"typical_rates": {"gst": {"standard": 18}, "vat": {"common": 13}, "customs": {"max": 18, "min": 12, "common": 15}}}	{"auto_classification": {"keywords": ["sports", "fitness", "gym", "exercise"], "confidence": 0.85}}	t	2025-07-28 03:49:25.508844+00	2025-07-28 03:49:41.663755+00
c3dc1b0a-2a08-43c0-bf47-5231bfd5a825	6112	Athletic and sportswear	sports	athletic_wear	{sportswear,athletic,tracksuit,"sports bra",leggings,"gym wear"}	12.00	t	{"packaging": {"additional_weight": 0.03}, "typical_weights": {"per_unit": {"max": 0.500, "min": 0.100, "average": 0.250}}}	{"typical_rates": {"gst": {"standard": 12}, "vat": {"common": 13}, "customs": {"max": 16, "min": 12, "common": 14}}}	{"auto_classification": {"keywords": ["sportswear", "athletic", "tracksuit", "gym wear"], "confidence": 0.85}}	t	2025-07-28 03:49:25.508844+00	2025-07-28 03:49:41.663755+00
18703217-bce7-4181-91d0-578865bd8d53	6404	Rubber and plastic footwear	footwear	casual_shoes	{sneakers,"running shoes","sports shoes","casual shoes",sandals,"flip flops"}	20.00	t	{"packaging": {"additional_weight": 0.05}, "typical_weights": {"per_unit": {"max": 1.000, "min": 0.200, "average": 0.600}}}	{"typical_rates": {"gst": {"standard": 18}, "vat": {"common": 13}, "customs": {"max": 20, "min": 15, "common": 18}}}	{"auto_classification": {"keywords": ["sneakers", "running shoes", "sports shoes", "sandals"], "confidence": 0.90}}	t	2025-07-28 03:49:25.508844+00	2025-07-28 03:49:41.663755+00
6adea487-f8ff-4ccf-8290-8db8a3d8b9c6	3924	Baby care products	baby_kids	baby_care	{baby,diaper,bottle,pacifier,"baby care",feeding,stroller}	10.00	t	{"packaging": {"additional_weight": 0.05}, "typical_weights": {"per_unit": {"max": 5.000, "min": 0.050, "average": 0.500}}}	{"typical_rates": {"gst": {"standard": 12}, "vat": {"common": 13}, "customs": {"max": 15, "min": 10, "common": 12}}}	{"auto_classification": {"keywords": ["baby", "diaper", "bottle", "pacifier"], "confidence": 0.95}}	t	2025-07-28 03:49:25.508844+00	2025-07-28 03:49:41.663755+00
244b7886-650e-442d-872c-6d9a0d7f7b00	4202	Bags and luggage	bags	luggage	{bag,backpack,handbag,suitcase,luggage,purse,wallet}	15.00	t	{"packaging": {"additional_weight": 0.05}, "typical_weights": {"per_unit": {"max": 3.000, "min": 0.200, "average": 1.000}}}	{"typical_rates": {"gst": {"standard": 18}, "vat": {"common": 13}, "customs": {"max": 20, "min": 15, "common": 18}}}	{"auto_classification": {"keywords": ["bag", "backpack", "handbag", "suitcase"], "confidence": 0.90}}	t	2025-07-28 03:49:25.508844+00	2025-07-28 03:49:41.663755+00
d04fc9b0-30b4-4f8b-b008-64cac3ae5763	8205	Hand tools and hardware	tools	hand_tools	{tools,hammer,screwdriver,wrench,pliers,hardware,drill}	15.00	t	{"packaging": {"additional_weight": 0.05}, "typical_weights": {"per_unit": {"max": 2.000, "min": 0.100, "average": 0.500}}}	{"typical_rates": {"gst": {"standard": 18}, "vat": {"common": 13}, "customs": {"max": 15, "min": 10, "common": 12}}}	{"auto_classification": {"keywords": ["tools", "hammer", "screwdriver", "wrench"], "confidence": 0.90}}	t	2025-07-28 03:49:25.508844+00	2025-07-28 03:49:41.663755+00
37e7c607-5921-4aba-a16a-bd0fb95d3ca6	9207	Musical instruments	music	instruments	{music,guitar,piano,keyboard,violin,drums,instrument}	50.00	t	{"packaging": {"additional_weight": 0.20}, "typical_weights": {"per_unit": {"max": 20.000, "min": 0.500, "average": 3.000}}}	{"typical_rates": {"gst": {"standard": 18}, "vat": {"common": 13}, "customs": {"max": 15, "min": 10, "common": 12}}}	{"auto_classification": {"keywords": ["music", "guitar", "piano", "keyboard"], "confidence": 0.95}}	t	2025-07-28 03:49:25.508844+00	2025-07-28 03:49:41.663755+00
7c0716eb-d986-43bd-81aa-443259e8a49c	851712	Smartphones and Mobile Phones	electronics	communications	{smartphone,mobile,"cell phone",iphone,android,phone}	100.00	t	{"typical_weights": {"per_unit": {"max": 0.3, "min": 0.1, "average": 0.2}, "packaging": {"additional_weight": 0.05}}}	{"typical_rates": {"gst": {"standard": 18}, "customs": {"common": 20}}}	{"visual_metadata": {"icon": "📱", "display_name": "Smartphones"}, "auto_classification": {"enabled": true, "confidence": 0.95}}	t	2025-07-28 03:49:41.670041+00	2025-07-28 03:49:41.670041+00
f52963c7-49ae-4942-9ad0-c97ce8592389	847130	Laptops and Portable Computers	electronics	computers	{laptop,notebook,macbook,chromebook,ultrabook}	300.00	t	{"typical_weights": {"per_unit": {"max": 3.0, "min": 1.0, "average": 2.0}, "packaging": {"additional_weight": 0.3}}}	{"typical_rates": {"gst": {"standard": 18}, "customs": {"common": 18}}}	{"visual_metadata": {"icon": "💻", "display_name": "Laptops"}, "auto_classification": {"enabled": true, "confidence": 0.9}}	t	2025-07-28 03:49:41.670041+00	2025-07-28 03:49:41.670041+00
580e7569-6e7a-4285-a310-7ba824a54abc	852851	Computer Monitors and Displays	electronics	computers	{monitor,display,screen,LED,LCD,OLED}	150.00	t	{"typical_weights": {"per_unit": {"max": 10.0, "min": 3.0, "average": 5.0}, "packaging": {"additional_weight": 0.5}}}	{"typical_rates": {"gst": {"standard": 18}, "customs": {"common": 15}}}	{"visual_metadata": {"icon": "🖥️", "display_name": "Monitors"}, "auto_classification": {"enabled": true, "confidence": 0.9}}	t	2025-07-28 03:49:41.670041+00	2025-07-28 03:49:41.670041+00
ef25dc44-d233-4bb3-aed4-0d09c7e71fd7	851810	Headphones and Earphones	electronics	audio	{headphone,earphone,airpods,earbuds,headset}	20.00	t	{"typical_weights": {"per_unit": {"max": 0.5, "min": 0.05, "average": 0.2}, "packaging": {"additional_weight": 0.05}}}	{"typical_rates": {"gst": {"standard": 18}, "customs": {"common": 20}}}	{"visual_metadata": {"icon": "🎧", "display_name": "Headphones"}, "auto_classification": {"enabled": true, "confidence": 0.9}}	t	2025-07-28 03:49:41.670041+00	2025-07-28 03:49:41.670041+00
1af7206a-15a7-45e4-a195-74fbcfc79567	610910	T-shirts and Casual Shirts	clothing	tops	{tshirt,t-shirt,shirt,top,"casual wear"}	10.00	t	{"typical_weights": {"per_unit": {"max": 0.3, "min": 0.1, "average": 0.2}, "packaging": {"additional_weight": 0.02}}}	{"typical_rates": {"gst": {"standard": 12}, "customs": {"common": 20}}}	{"visual_metadata": {"icon": "👕", "display_name": "T-shirts"}, "auto_classification": {"enabled": true, "confidence": 0.85}}	t	2025-07-28 03:49:41.670041+00	2025-07-28 03:49:41.670041+00
75033207-f0c6-420e-83c3-85d39c4f40b0	620342	Men's Jeans and Trousers	clothing	bottoms	{jeans,denim,trousers,pants,bottoms}	20.00	t	{"typical_weights": {"per_unit": {"max": 0.8, "min": 0.3, "average": 0.5}, "packaging": {"additional_weight": 0.05}}}	{"typical_rates": {"gst": {"standard": 12}, "customs": {"common": 20}}}	{"visual_metadata": {"icon": "👖", "display_name": "Jeans"}, "auto_classification": {"enabled": true, "confidence": 0.85}}	t	2025-07-28 03:49:41.670041+00	2025-07-28 03:49:41.670041+00
bb99725f-a8ed-45e4-8efe-d51a40ef84e6	640299	Sports Shoes and Sneakers	footwear	athletic	{sneakers,"sports shoes","running shoes","athletic footwear"}	30.00	t	{"typical_weights": {"per_unit": {"max": 1.5, "min": 0.5, "average": 1.0}, "packaging": {"additional_weight": 0.2}}}	{"typical_rates": {"gst": {"standard": 18}, "customs": {"common": 25}}}	{"visual_metadata": {"icon": "👟", "display_name": "Sneakers"}, "auto_classification": {"enabled": true, "confidence": 0.85}}	t	2025-07-28 03:49:41.670041+00	2025-07-28 03:49:41.670041+00
c514656a-e8ce-4429-95e2-ee5c69c5691d	420222	Handbags and Purses	accessories	bags	{handbag,purse,"shoulder bag",tote,clutch}	50.00	t	{"typical_weights": {"per_unit": {"max": 1.5, "min": 0.3, "average": 0.8}, "packaging": {"additional_weight": 0.1}}}	{"typical_rates": {"gst": {"standard": 18}, "customs": {"common": 20}}}	{"visual_metadata": {"icon": "👜", "display_name": "Handbags"}, "auto_classification": {"enabled": true, "confidence": 0.85}}	t	2025-07-28 03:49:41.670041+00	2025-07-28 03:49:41.670041+00
03f5dd50-a0e3-459c-a679-c6c683d82583	691110	Dinnerware and Tableware	home	kitchen	{plates,bowls,cups,dinnerware,tableware}	30.00	t	{"typical_weights": {"per_unit": {"max": 5.0, "min": 0.5, "average": 2.0}, "packaging": {"additional_weight": 0.3}}}	{"typical_rates": {"gst": {"standard": 18}, "customs": {"common": 20}}}	{"visual_metadata": {"icon": "🍽️", "display_name": "Dinnerware"}, "auto_classification": {"enabled": true, "confidence": 0.8}}	t	2025-07-28 03:49:41.670041+00	2025-07-28 03:49:41.670041+00
7119e747-aa17-4966-9f80-ba8356ee6f84	732393	Kitchen Utensils and Tools	home	kitchen	{utensils,knife,spoon,fork,"kitchen tools"}	15.00	t	{"typical_weights": {"per_unit": {"max": 2.0, "min": 0.1, "average": 0.5}, "packaging": {"additional_weight": 0.1}}}	{"typical_rates": {"gst": {"standard": 18}, "customs": {"common": 20}}}	{"visual_metadata": {"icon": "🍴", "display_name": "Utensils"}, "auto_classification": {"enabled": true, "confidence": 0.8}}	t	2025-07-28 03:49:41.670041+00	2025-07-28 03:49:41.670041+00
a5283c56-bda8-4a6e-bcfd-997da5e4bbab	940350	Bedroom Furniture	furniture	bedroom	{bed,wardrobe,dresser,nightstand,bedroom}	500.00	t	{"typical_weights": {"per_unit": {"max": 150.0, "min": 20.0, "average": 70.0}, "packaging": {"additional_weight": 5.0}}}	{"typical_rates": {"gst": {"standard": 18}, "customs": {"common": 25}}}	{"visual_metadata": {"icon": "🛏️", "display_name": "Bedroom Furniture"}, "auto_classification": {"enabled": true, "confidence": 0.8}}	t	2025-07-28 03:49:41.670041+00	2025-07-28 03:49:41.670041+00
5ca78e6d-4a82-46ee-a639-ee45b0ac0e45	330499	Makeup and Cosmetics	beauty	makeup	{makeup,cosmetics,foundation,lipstick,mascara}	20.00	t	{"typical_weights": {"per_unit": {"max": 0.3, "min": 0.02, "average": 0.1}, "packaging": {"additional_weight": 0.02}}}	{"typical_rates": {"gst": {"standard": 28}, "customs": {"common": 20}}}	{"visual_metadata": {"icon": "💄", "display_name": "Makeup"}, "auto_classification": {"enabled": true, "confidence": 0.85}}	t	2025-07-28 03:49:41.670041+00	2025-07-28 03:49:41.670041+00
96131a41-652f-480a-bfc7-08a32762c307	330510	Hair Care Products	beauty	hair care	{shampoo,conditioner,"hair oil","hair serum","hair care"}	15.00	t	{"typical_weights": {"per_unit": {"max": 1.0, "min": 0.2, "average": 0.5}, "packaging": {"additional_weight": 0.05}}}	{"typical_rates": {"gst": {"standard": 18}, "customs": {"common": 20}}}	{"visual_metadata": {"icon": "🧴", "display_name": "Hair Care"}, "auto_classification": {"enabled": true, "confidence": 0.85}}	t	2025-07-28 03:49:41.670041+00	2025-07-28 03:49:41.670041+00
d22e2211-0062-4d08-8879-e7db420d7f7a	300490	Medicines and Pharmaceuticals	health	medicine	{medicine,pharmaceutical,drug,tablet,capsule}	50.00	t	{"typical_weights": {"per_unit": {"max": 0.5, "min": 0.05, "average": 0.2}, "packaging": {"additional_weight": 0.05}}}	{"typical_rates": {"gst": {"standard": 12}, "customs": {"common": 10}}}	{"visual_metadata": {"icon": "💊", "display_name": "Medicines"}, "auto_classification": {"enabled": true, "confidence": 0.9}}	t	2025-07-28 03:49:41.670041+00	2025-07-28 03:49:41.670041+00
6914a6b8-877c-422d-b72e-b50d484a067d	950691	Gym and Fitness Equipment	sports	fitness	{dumbbell,weights,"gym equipment",fitness,exercise}	50.00	t	{"typical_weights": {"per_unit": {"max": 50.0, "min": 1.0, "average": 10.0}, "packaging": {"additional_weight": 0.5}}}	{"typical_rates": {"gst": {"standard": 18}, "customs": {"common": 20}}}	{"visual_metadata": {"icon": "🏋️", "display_name": "Fitness Equipment"}, "auto_classification": {"enabled": true, "confidence": 0.85}}	t	2025-07-28 03:49:41.670041+00	2025-07-28 03:49:41.670041+00
1d10cef7-29c1-4aab-8560-8252cc156174	950632	Golf Equipment	sports	golf	{golf,clubs,"golf balls","golf bag",putter}	100.00	t	{"typical_weights": {"per_unit": {"max": 15.0, "min": 0.5, "average": 5.0}, "packaging": {"additional_weight": 0.5}}}	{"typical_rates": {"gst": {"standard": 28}, "customs": {"common": 20}}}	{"visual_metadata": {"icon": "⛳", "display_name": "Golf Equipment"}, "auto_classification": {"enabled": true, "confidence": 0.85}}	t	2025-07-28 03:49:41.670041+00	2025-07-28 03:49:41.670041+00
9543c9dc-09db-4c71-9394-5b82e94976e3	950341	Baby Toys and Games	toys	baby	{"baby toys","infant toys",rattles,teethers,"baby games"}	10.00	t	{"typical_weights": {"per_unit": {"max": 0.5, "min": 0.05, "average": 0.2}, "packaging": {"additional_weight": 0.05}}}	{"typical_rates": {"gst": {"standard": 12}, "customs": {"common": 20}}}	{"visual_metadata": {"icon": "🍼", "display_name": "Baby Toys"}, "auto_classification": {"enabled": true, "confidence": 0.85}}	t	2025-07-28 03:49:41.670041+00	2025-07-28 03:49:41.670041+00
c3bdd79c-9cf7-4afb-957b-659fb6251ea5	611120	Baby Clothing	clothing	baby	{"baby clothes","infant wear",onesie,romper,"baby dress"}	15.00	t	{"typical_weights": {"per_unit": {"max": 0.2, "min": 0.05, "average": 0.1}, "packaging": {"additional_weight": 0.02}}}	{"typical_rates": {"gst": {"standard": 5}, "customs": {"common": 20}}}	{"visual_metadata": {"icon": "👶", "display_name": "Baby Clothes"}, "auto_classification": {"enabled": true, "confidence": 0.85}}	t	2025-07-28 03:49:41.670041+00	2025-07-28 03:49:41.670041+00
b90fb706-06ab-449a-8bc5-0c3828ccd5a1	870899	Car Parts and Accessories	automotive	parts	{"car parts","auto parts","spare parts","car accessories"}	50.00	t	{"typical_weights": {"per_unit": {"max": 20.0, "min": 0.5, "average": 5.0}, "packaging": {"additional_weight": 0.5}}}	{"typical_rates": {"gst": {"standard": 28}, "customs": {"common": 15}}}	{"visual_metadata": {"icon": "🚗", "display_name": "Car Parts"}, "auto_classification": {"enabled": true, "confidence": 0.8}}	t	2025-07-28 03:49:41.670041+00	2025-07-28 03:49:41.670041+00
a7320d38-7a2d-4a08-85dd-cb9aacb712f0	401110	Car and Bike Tires	automotive	tires	{tires,tyres,"car tires","bike tires",wheels}	100.00	t	{"typical_weights": {"per_unit": {"max": 25.0, "min": 5.0, "average": 10.0}, "packaging": {"additional_weight": 0.5}}}	{"typical_rates": {"gst": {"standard": 28}, "customs": {"common": 20}}}	{"visual_metadata": {"icon": "🛞", "display_name": "Tires"}, "auto_classification": {"enabled": true, "confidence": 0.85}}	t	2025-07-28 03:49:41.670041+00	2025-07-28 03:49:41.670041+00
d74f9b16-99e1-4643-979a-3abffd0c8bdf	090111	Coffee Beans and Products	food	beverages	{coffee,"coffee beans",espresso,arabica,robusta}	20.00	t	{"typical_weights": {"per_unit": {"max": 2.0, "min": 0.25, "average": 0.5}, "packaging": {"additional_weight": 0.05}}}	{"typical_rates": {"gst": {"standard": 18}, "customs": {"common": 100}}}	{"visual_metadata": {"icon": "☕", "display_name": "Coffee"}, "auto_classification": {"enabled": true, "confidence": 0.9}}	t	2025-07-28 03:49:41.670041+00	2025-07-28 03:49:41.670041+00
64b1411d-a0ea-4316-b609-88b49fb038ed	170490	Chocolates and Confectionery	food	sweets	{chocolate,candy,sweets,confectionery,cocoa}	10.00	t	{"typical_weights": {"per_unit": {"max": 1.0, "min": 0.05, "average": 0.3}, "packaging": {"additional_weight": 0.05}}}	{"typical_rates": {"gst": {"standard": 28}, "customs": {"common": 30}}}	{"visual_metadata": {"icon": "🍫", "display_name": "Chocolates"}, "auto_classification": {"enabled": true, "confidence": 0.9}}	t	2025-07-28 03:49:41.670041+00	2025-07-28 03:49:41.670041+00
2295af76-162a-4484-a068-4fdc002aa165	330410	Beauty and makeup products	beauty	cosmetics	{makeup,lipstick,foundation,eyeshadow,mascara,concealer,blush}	15.00	t	{"packaging": {"additional_weight": 0.02}, "typical_weights": {"per_unit": {"max": 0.100, "min": 0.010, "average": 0.040}}}	{"typical_rates": {"gst": {"standard": 18}, "vat": {"common": 13}, "customs": {"max": 25, "min": 15, "common": 20}}}	{"auto_classification": {"keywords": ["makeup", "lipstick", "foundation", "cosmetics"], "confidence": 0.90}}	t	2025-07-28 03:49:25.508844+00	2025-07-28 03:49:36.062545+00
98fbe172-2640-4105-8913-8fbfff446c5b	851770	Mobile Phone Accessories (Cases, Chargers, Cables)	electronics	accessories	{"phone case",charger,cable,"power bank","screen protector","phone accessories"}	5.00	t	{"typical_weights": {"per_unit": {"max": 0.5, "min": 0.02, "average": 0.1}, "packaging": {"additional_weight": 0.02}}}	{"typical_rates": {"gst": {"standard": 18}, "vat": {"common": 20}, "customs": {"common": 20}, "sales_tax": {"local": 2.5, "state": 6.5}, "import_duty": {"standard": 10}}}	{"visual_metadata": {"icon": "🔌", "display_name": "Phone Accessories"}, "auto_classification": {"enabled": true, "confidence": 0.9}}	t	2025-07-28 03:49:31.205156+00	2025-07-28 03:49:31.205156+00
a0141a93-5fb9-4f2d-8b21-6ddac433cc49	847150	Desktop Computers and Workstations	electronics	computers	{desktop,pc,computer,workstation,cpu,tower}	400.00	t	{"typical_weights": {"per_unit": {"max": 15.0, "min": 5.0, "average": 8.0}, "packaging": {"additional_weight": 1.0}}}	{"typical_rates": {"gst": {"standard": 18}, "vat": {"common": 21}, "customs": {"common": 18}, "sales_tax": {"local": 2.0, "state": 7.25}, "import_duty": {"standard": 0}}}	{"visual_metadata": {"icon": "🖥️", "display_name": "Desktop Computers"}, "auto_classification": {"enabled": true, "confidence": 0.95}}	t	2025-07-28 03:49:31.205156+00	2025-07-28 03:49:31.205156+00
235bf1a9-0984-485f-89d4-cfbb035bc71a	852352	Memory Cards and USB Flash Drives	electronics	storage	{"memory card","sd card",usb,"flash drive",pendrive,storage}	10.00	t	{"typical_weights": {"per_unit": {"max": 0.05, "min": 0.01, "average": 0.02}, "packaging": {"additional_weight": 0.01}}}	{"typical_rates": {"gst": {"standard": 18}, "vat": {"common": 20}, "customs": {"common": 15}, "sales_tax": {"local": 2.0, "state": 6.0}, "import_duty": {"standard": 0}}}	{"visual_metadata": {"icon": "💾", "display_name": "Storage Devices"}, "auto_classification": {"enabled": true, "confidence": 0.9}}	t	2025-07-28 03:49:31.205156+00	2025-07-28 03:49:31.205156+00
3d611604-a2ae-4c1b-96b3-cb1996591b91	850110	Electric Motors and Generators	electronics	industrial	{motor,generator,"electric motor","ac motor","dc motor"}	100.00	t	{"typical_weights": {"per_unit": {"max": 50.0, "min": 1.0, "average": 10.0}, "packaging": {"additional_weight": 0.5}}}	{"typical_rates": {"gst": {"standard": 18}, "vat": {"common": 20}, "customs": {"common": 7.5}, "sales_tax": {"local": 1.5, "state": 6.5}, "import_duty": {"standard": 10}}}	{"visual_metadata": {"icon": "⚡", "display_name": "Electric Motors"}, "auto_classification": {"enabled": true, "confidence": 0.85}}	t	2025-07-28 03:49:31.205156+00	2025-07-28 03:49:31.205156+00
b9019936-f41c-4554-8a8c-780c35a055c7	620520	Men's Shirts (Formal and Casual)	clothing	tops	{shirt,"formal shirt","dress shirt","casual shirt","mens shirt"}	15.00	t	{"typical_weights": {"per_unit": {"max": 0.35, "min": 0.15, "average": 0.25}, "packaging": {"additional_weight": 0.03}}}	{"typical_rates": {"gst": {"standard": 12}, "vat": {"common": 20}, "customs": {"common": 20}, "sales_tax": {"local": 1.0, "state": 7.0}, "import_duty": {"standard": 16}}}	{"visual_metadata": {"icon": "👔", "display_name": "Men's Shirts"}, "auto_classification": {"enabled": true, "confidence": 0.9}}	t	2025-07-28 03:49:31.205156+00	2025-07-28 03:49:31.205156+00
a21ec6c4-b7fa-464e-9f71-a425eb3d9dd6	620462	Women's Dresses and Gowns	clothing	dresses	{dress,gown,"womens dress","party dress","casual dress","formal dress"}	25.00	t	{"typical_weights": {"per_unit": {"max": 0.8, "min": 0.2, "average": 0.4}, "packaging": {"additional_weight": 0.05}}}	{"typical_rates": {"gst": {"standard": 12}, "vat": {"common": 20}, "customs": {"common": 20}, "sales_tax": {"local": 1.0, "state": 7.0}, "import_duty": {"standard": 16}}}	{"visual_metadata": {"icon": "👗", "display_name": "Women's Dresses"}, "auto_classification": {"enabled": true, "confidence": 0.9}}	t	2025-07-28 03:49:31.205156+00	2025-07-28 03:49:31.205156+00
9e5aec49-ea16-41ad-bebe-a1d469f1581b	611030	Sweaters and Pullovers	clothing	knitwear	{sweater,pullover,jumper,knitwear,cardigan,hoodie}	20.00	t	{"typical_weights": {"per_unit": {"max": 0.8, "min": 0.3, "average": 0.5}, "packaging": {"additional_weight": 0.05}}}	{"typical_rates": {"gst": {"standard": 12}, "vat": {"common": 20}, "customs": {"common": 20}, "sales_tax": {"local": 1.5, "state": 6.5}, "import_duty": {"standard": 16}}}	{"visual_metadata": {"icon": "🧥", "display_name": "Sweaters"}, "auto_classification": {"enabled": true, "confidence": 0.85}}	t	2025-07-28 03:49:31.205156+00	2025-07-28 03:49:31.205156+00
492e5bed-f116-4038-ad95-a95577eed297	420212	Backpacks and Rucksacks	accessories	bags	{backpack,rucksack,"school bag","laptop bag","travel bag"}	25.00	t	{"typical_weights": {"per_unit": {"max": 2.0, "min": 0.5, "average": 1.0}, "packaging": {"additional_weight": 0.1}}}	{"typical_rates": {"gst": {"standard": 18}, "vat": {"common": 20}, "customs": {"common": 20}, "sales_tax": {"local": 2.0, "state": 7.0}, "import_duty": {"standard": 10}}}	{"visual_metadata": {"icon": "🎒", "display_name": "Backpacks"}, "auto_classification": {"enabled": true, "confidence": 0.9}}	t	2025-07-28 03:49:31.205156+00	2025-07-28 03:49:31.205156+00
1e7fa514-10bd-4527-b0c4-475396b979fd	711319	Gold Jewelry	jewelry	precious	{"gold jewelry","gold chain","gold ring","gold necklace","gold bracelet"}	200.00	t	{"typical_weights": {"per_unit": {"max": 0.1, "min": 0.002, "average": 0.02}, "packaging": {"additional_weight": 0.05}}}	{"typical_rates": {"gst": {"standard": 3}, "vat": {"common": 0}, "customs": {"common": 10}, "sales_tax": {"local": 0, "state": 0}, "import_duty": {"standard": 10}}}	{"visual_metadata": {"icon": "💍", "display_name": "Gold Jewelry"}, "auto_classification": {"enabled": true, "confidence": 0.95}}	t	2025-07-28 03:49:31.205156+00	2025-07-28 03:49:31.205156+00
1cd2c68d-689d-4e45-834b-74bada0c84b3	711790	Imitation Jewelry	jewelry	fashion	{"artificial jewelry","fashion jewelry","costume jewelry","imitation jewelry"}	10.00	t	{"typical_weights": {"per_unit": {"max": 0.2, "min": 0.02, "average": 0.08}, "packaging": {"additional_weight": 0.02}}}	{"typical_rates": {"gst": {"standard": 28}, "vat": {"common": 20}, "customs": {"common": 20}, "sales_tax": {"local": 2.5, "state": 7.5}, "import_duty": {"standard": 15}}}	{"visual_metadata": {"icon": "💎", "display_name": "Fashion Jewelry"}, "auto_classification": {"enabled": true, "confidence": 0.85}}	t	2025-07-28 03:49:31.205156+00	2025-07-28 03:49:31.205156+00
3f2a2518-2fae-4bc2-a3df-9da9e2f864e2	910211	Wrist Watches	accessories	watches	{watch,"wrist watch",smartwatch,timepiece,chronograph}	50.00	t	{"typical_weights": {"per_unit": {"max": 0.3, "min": 0.05, "average": 0.15}, "packaging": {"additional_weight": 0.1}}}	{"typical_rates": {"gst": {"standard": 28}, "vat": {"common": 21}, "customs": {"common": 20}, "sales_tax": {"local": 2.0, "state": 8.0}, "import_duty": {"standard": 10}}}	{"visual_metadata": {"icon": "⌚", "display_name": "Watches"}, "auto_classification": {"enabled": true, "confidence": 0.9}}	t	2025-07-28 03:49:31.205156+00	2025-07-28 03:49:31.205156+00
1d7d684a-b496-4773-a87c-f57ce778d965	841810	Refrigerators and Freezers	appliances	kitchen	{refrigerator,fridge,freezer,"deep freezer","mini fridge"}	200.00	t	{"typical_weights": {"per_unit": {"max": 150.0, "min": 30.0, "average": 60.0}, "packaging": {"additional_weight": 5.0}}}	{"typical_rates": {"gst": {"standard": 28}, "vat": {"common": 20}, "customs": {"common": 20}, "sales_tax": {"local": 2.0, "state": 7.5}, "import_duty": {"standard": 20}}}	{"visual_metadata": {"icon": "🧊", "display_name": "Refrigerators"}, "auto_classification": {"enabled": true, "confidence": 0.95}}	t	2025-07-28 03:49:31.205156+00	2025-07-28 03:49:31.205156+00
46333592-ab71-43fa-962c-fff66fe96a11	850940	Food Processors and Blenders	appliances	kitchen	{blender,mixer,"food processor",juicer,grinder}	30.00	t	{"typical_weights": {"per_unit": {"max": 5.0, "min": 1.0, "average": 2.5}, "packaging": {"additional_weight": 0.3}}}	{"typical_rates": {"gst": {"standard": 18}, "vat": {"common": 20}, "customs": {"common": 20}, "sales_tax": {"local": 2.0, "state": 6.5}, "import_duty": {"standard": 10}}}	{"visual_metadata": {"icon": "🥤", "display_name": "Kitchen Appliances"}, "auto_classification": {"enabled": true, "confidence": 0.9}}	t	2025-07-28 03:49:31.205156+00	2025-07-28 03:49:31.205156+00
93962e43-deb4-427e-99f2-cf75610c0cae	841451	Electric Fans	appliances	cooling	{fan,"ceiling fan","table fan","pedestal fan","exhaust fan"}	25.00	t	{"typical_weights": {"per_unit": {"max": 8.0, "min": 2.0, "average": 4.0}, "packaging": {"additional_weight": 0.5}}}	{"typical_rates": {"gst": {"standard": 18}, "vat": {"common": 20}, "customs": {"common": 20}, "sales_tax": {"local": 1.5, "state": 6.0}, "import_duty": {"standard": 10}}}	{"visual_metadata": {"icon": "🌀", "display_name": "Fans"}, "auto_classification": {"enabled": true, "confidence": 0.85}}	t	2025-07-28 03:49:31.205156+00	2025-07-28 03:49:31.205156+00
5af0e665-d9f0-4ce4-a7bb-57f1dfc3415c	950390	Educational Toys and Puzzles	toys	educational	{puzzle,"educational toy","building blocks",lego,"stem toys"}	15.00	t	{"typical_weights": {"per_unit": {"max": 2.0, "min": 0.1, "average": 0.5}, "packaging": {"additional_weight": 0.1}}}	{"typical_rates": {"gst": {"standard": 12}, "vat": {"common": 20}, "customs": {"common": 20}, "sales_tax": {"local": 1.5, "state": 6.5}, "import_duty": {"standard": 10}}}	{"visual_metadata": {"icon": "🧩", "display_name": "Educational Toys"}, "auto_classification": {"enabled": true, "confidence": 0.85}}	t	2025-07-28 03:49:31.205156+00	2025-07-28 03:49:31.205156+00
479ca741-6049-479d-8369-eef201706d4d	950450	Video Game Consoles and Games	electronics	gaming	{playstation,xbox,nintendo,"gaming console","video games"}	100.00	t	{"typical_weights": {"per_unit": {"max": 5.0, "min": 0.1, "average": 2.0}, "packaging": {"additional_weight": 0.3}}}	{"typical_rates": {"gst": {"standard": 28}, "vat": {"common": 21}, "customs": {"common": 20}, "sales_tax": {"local": 2.5, "state": 7.5}, "import_duty": {"standard": 10}}}	{"visual_metadata": {"icon": "🎮", "display_name": "Gaming"}, "auto_classification": {"enabled": true, "confidence": 0.95}}	t	2025-07-28 03:49:31.205156+00	2025-07-28 03:49:31.205156+00
ad3028a0-155e-4eb9-bebb-36084edff716	490199	Books and Printed Materials	books	literature	{book,novel,textbook,magazine,"printed book",paperback}	10.00	t	{"typical_weights": {"per_unit": {"max": 2.0, "min": 0.1, "average": 0.5}, "packaging": {"additional_weight": 0.05}}}	{"typical_rates": {"gst": {"standard": 0}, "vat": {"common": 0}, "customs": {"common": 0}, "sales_tax": {"local": 0, "state": 0}, "import_duty": {"standard": 0}}}	{"visual_metadata": {"icon": "📚", "display_name": "Books"}, "auto_classification": {"enabled": true, "confidence": 0.95}}	t	2025-07-28 03:49:31.205156+00	2025-07-28 03:49:31.205156+00
d14dbfb0-513a-42ac-807f-86a08a94a2b4	960839	Pens and Writing Instruments	stationery	writing	{pen,pencil,marker,highlighter,"writing instruments"}	5.00	t	{"typical_weights": {"per_unit": {"max": 0.05, "min": 0.01, "average": 0.02}, "packaging": {"additional_weight": 0.01}}}	{"typical_rates": {"gst": {"standard": 18}, "vat": {"common": 20}, "customs": {"common": 20}, "sales_tax": {"local": 1.5, "state": 6.5}, "import_duty": {"standard": 10}}}	{"visual_metadata": {"icon": "✏️", "display_name": "Writing Instruments"}, "auto_classification": {"enabled": true, "confidence": 0.9}}	t	2025-07-28 03:49:31.205156+00	2025-07-28 03:49:31.205156+00
a2331cb5-52b9-43dd-aeac-70bd4854b7ed	340111	Soap and Bath Products	beauty	personal care	{soap,"body wash","shower gel","bath products","bathing bar"}	5.00	t	{"typical_weights": {"per_unit": {"max": 0.5, "min": 0.05, "average": 0.15}, "packaging": {"additional_weight": 0.02}}}	{"typical_rates": {"gst": {"standard": 18}, "vat": {"common": 20}, "customs": {"common": 20}, "sales_tax": {"local": 1.0, "state": 6.0}, "import_duty": {"standard": 20}}}	{"visual_metadata": {"icon": "🧼", "display_name": "Bath Products"}, "auto_classification": {"enabled": true, "confidence": 0.9}}	t	2025-07-28 03:49:31.205156+00	2025-07-28 03:49:31.205156+00
c406b5e4-1159-48fc-918e-9eb25af66f6d	330720	Deodorants and Antiperspirants	beauty	personal care	{deodorant,antiperspirant,"body spray",perfume,fragrance}	10.00	t	{"typical_weights": {"per_unit": {"max": 0.3, "min": 0.1, "average": 0.2}, "packaging": {"additional_weight": 0.02}}}	{"typical_rates": {"gst": {"standard": 18}, "vat": {"common": 20}, "customs": {"common": 20}, "sales_tax": {"local": 1.5, "state": 6.5}, "import_duty": {"standard": 20}}}	{"visual_metadata": {"icon": "🌸", "display_name": "Deodorants"}, "auto_classification": {"enabled": true, "confidence": 0.9}}	t	2025-07-28 03:49:31.205156+00	2025-07-28 03:49:31.205156+00
f322f377-5528-4ab4-b7a6-214b3d4c8e7e	820559	Hand Tools and Tool Sets	tools	hand tools	{hammer,screwdriver,pliers,wrench,"tool set","hand tools"}	20.00	t	{"typical_weights": {"per_unit": {"max": 5.0, "min": 0.1, "average": 1.0}, "packaging": {"additional_weight": 0.2}}}	{"typical_rates": {"gst": {"standard": 18}, "vat": {"common": 20}, "customs": {"common": 15}, "sales_tax": {"local": 1.5, "state": 6.5}, "import_duty": {"standard": 10}}}	{"visual_metadata": {"icon": "🔧", "display_name": "Hand Tools"}, "auto_classification": {"enabled": true, "confidence": 0.85}}	t	2025-07-28 03:49:31.205156+00	2025-07-28 03:49:31.205156+00
b637f4fc-d036-487a-9f4e-b519fd3d5b76	846729	Power Tools (Drills, Sanders, etc)	tools	power tools	{drill,"power drill",sander,grinder,"power tools","electric tools"}	50.00	t	{"typical_weights": {"per_unit": {"max": 5.0, "min": 0.5, "average": 2.0}, "packaging": {"additional_weight": 0.3}}}	{"typical_rates": {"gst": {"standard": 18}, "vat": {"common": 20}, "customs": {"common": 10}, "sales_tax": {"local": 2.0, "state": 6.5}, "import_duty": {"standard": 7.5}}}	{"visual_metadata": {"icon": "🔨", "display_name": "Power Tools"}, "auto_classification": {"enabled": true, "confidence": 0.9}}	t	2025-07-28 03:49:31.205156+00	2025-07-28 03:49:31.205156+00
8c329d6c-c887-4cc1-aa90-4a9010cf616f	847330	Computer Parts and Components	electronics	computer parts	{ram,"graphics card",motherboard,processor,"computer parts","pc components"}	50.00	t	{"typical_weights": {"per_unit": {"max": 2.0, "min": 0.05, "average": 0.5}, "packaging": {"additional_weight": 0.1}}}	{"typical_rates": {"gst": {"standard": 18}, "vat": {"common": 21}, "customs": {"common": 0}, "sales_tax": {"local": 2.0, "state": 6.5}, "import_duty": {"standard": 0}}}	{"visual_metadata": {"icon": "🖲️", "display_name": "PC Components"}, "auto_classification": {"enabled": true, "confidence": 0.95}}	t	2025-07-28 03:49:31.205156+00	2025-07-28 03:49:31.205156+00
d8767a4d-04db-48e6-a61b-ebfe65d6c6b9	847989	Office Equipment and Accessories	office	equipment	{printer,scanner,shredder,laminator,"office equipment"}	100.00	t	{"typical_weights": {"per_unit": {"max": 20.0, "min": 2.0, "average": 8.0}, "packaging": {"additional_weight": 0.5}}}	{"typical_rates": {"gst": {"standard": 18}, "vat": {"common": 20}, "customs": {"common": 15}, "sales_tax": {"local": 2.0, "state": 6.5}, "import_duty": {"standard": 7.5}}}	{"visual_metadata": {"icon": "🖨️", "display_name": "Office Equipment"}, "auto_classification": {"enabled": true, "confidence": 0.85}}	t	2025-07-28 03:49:31.205156+00	2025-07-28 03:49:31.205156+00
3dede76d-ddc5-40a2-93c5-cedfa14db255	920710	Keyboards and Digital Pianos	music	instruments	{keyboard,piano,"digital piano",synthesizer,"musical keyboard"}	100.00	t	{"typical_weights": {"per_unit": {"max": 30.0, "min": 5.0, "average": 12.0}, "packaging": {"additional_weight": 1.0}}}	{"typical_rates": {"gst": {"standard": 28}, "vat": {"common": 21}, "customs": {"common": 15}, "sales_tax": {"local": 2.0, "state": 7.0}, "import_duty": {"standard": 10}}}	{"visual_metadata": {"icon": "🎹", "display_name": "Keyboards"}, "auto_classification": {"enabled": true, "confidence": 0.9}}	t	2025-07-28 03:49:31.205156+00	2025-07-28 03:49:31.205156+00
74f0bb59-410b-4b9b-8a35-7ebddd5777d1	920600	Drums and Percussion Instruments	music	instruments	{drums,"drum set",percussion,tabla,djembe,cymbals}	150.00	t	{"typical_weights": {"per_unit": {"max": 50.0, "min": 2.0, "average": 15.0}, "packaging": {"additional_weight": 2.0}}}	{"typical_rates": {"gst": {"standard": 28}, "vat": {"common": 21}, "customs": {"common": 15}, "sales_tax": {"local": 2.0, "state": 7.0}, "import_duty": {"standard": 10}}}	{"visual_metadata": {"icon": "🥁", "display_name": "Drums"}, "auto_classification": {"enabled": true, "confidence": 0.85}}	t	2025-07-28 03:49:31.205156+00	2025-07-28 03:49:31.205156+00
f6d9363e-10c9-4d31-af31-1cca5f838d78	230910	Pet Food (Dog and Cat)	pet supplies	food	{"dog food","cat food","pet food",kibble,"pet treats"}	20.00	t	{"typical_weights": {"per_unit": {"max": 20.0, "min": 0.5, "average": 5.0}, "packaging": {"additional_weight": 0.1}}}	{"typical_rates": {"gst": {"standard": 18}, "vat": {"common": 20}, "customs": {"common": 30}, "sales_tax": {"local": 1.0, "state": 6.0}, "import_duty": {"standard": 30}}}	{"visual_metadata": {"icon": "🐕", "display_name": "Pet Food"}, "auto_classification": {"enabled": true, "confidence": 0.9}}	t	2025-07-28 03:49:31.205156+00	2025-07-28 03:49:31.205156+00
7887c6bb-f2ff-42e8-834c-b527cde511cc	420100	Pet Accessories and Supplies	pet supplies	accessories	{"pet toys",collar,leash,"pet bed","pet accessories","pet supplies"}	15.00	t	{"typical_weights": {"per_unit": {"max": 5.0, "min": 0.05, "average": 0.5}, "packaging": {"additional_weight": 0.1}}}	{"typical_rates": {"gst": {"standard": 18}, "vat": {"common": 20}, "customs": {"common": 20}, "sales_tax": {"local": 1.5, "state": 6.5}, "import_duty": {"standard": 10}}}	{"visual_metadata": {"icon": "🐾", "display_name": "Pet Accessories"}, "auto_classification": {"enabled": true, "confidence": 0.85}}	t	2025-07-28 03:49:31.205156+00	2025-07-28 03:49:31.205156+00
a83eb085-234c-4e20-a9a2-a8a15f33f618	630533	Camping Tents and Shelters	outdoor	camping	{tent,"camping tent",shelter,canopy,"outdoor tent"}	50.00	t	{"typical_weights": {"per_unit": {"max": 10.0, "min": 2.0, "average": 4.0}, "packaging": {"additional_weight": 0.3}}}	{"typical_rates": {"gst": {"standard": 18}, "vat": {"common": 20}, "customs": {"common": 20}, "sales_tax": {"local": 2.0, "state": 6.5}, "import_duty": {"standard": 10}}}	{"visual_metadata": {"icon": "⛺", "display_name": "Camping Tents"}, "auto_classification": {"enabled": true, "confidence": 0.85}}	t	2025-07-28 03:49:31.205156+00	2025-07-28 03:49:31.205156+00
07e24de6-243e-44c6-813c-7d99c11f9d7c	940490	Sleeping Bags and Camping Bedding	outdoor	camping	{"sleeping bag","camping mat","air mattress","camping bedding"}	30.00	t	{"typical_weights": {"per_unit": {"max": 3.0, "min": 0.5, "average": 1.5}, "packaging": {"additional_weight": 0.2}}}	{"typical_rates": {"gst": {"standard": 18}, "vat": {"common": 20}, "customs": {"common": 20}, "sales_tax": {"local": 1.5, "state": 6.5}, "import_duty": {"standard": 10}}}	{"visual_metadata": {"icon": "🛌", "display_name": "Sleeping Bags"}, "auto_classification": {"enabled": true, "confidence": 0.85}}	t	2025-07-28 03:49:31.205156+00	2025-07-28 03:49:31.205156+00
503e9a8f-bc52-4370-876a-13733853d89f	900410	Sunglasses	accessories	eyewear	{sunglasses,shades,"uv protection","polarized sunglasses"}	20.00	t	{"typical_weights": {"per_unit": {"max": 0.1, "min": 0.02, "average": 0.05}, "packaging": {"additional_weight": 0.05}}}	{"typical_rates": {"gst": {"standard": 18}, "vat": {"common": 20}, "customs": {"common": 20}, "sales_tax": {"local": 2.0, "state": 7.0}, "import_duty": {"standard": 10}}}	{"visual_metadata": {"icon": "🕶️", "display_name": "Sunglasses"}, "auto_classification": {"enabled": true, "confidence": 0.9}}	t	2025-07-28 03:49:31.205156+00	2025-07-28 03:49:31.205156+00
07230edc-47df-41de-ba8b-33911842fc37	900490	Prescription Glasses and Frames	accessories	eyewear	{glasses,spectacles,eyeglasses,frames,"prescription glasses"}	30.00	t	{"typical_weights": {"per_unit": {"max": 0.1, "min": 0.02, "average": 0.04}, "packaging": {"additional_weight": 0.05}}}	{"typical_rates": {"gst": {"standard": 12}, "vat": {"common": 10}, "customs": {"common": 10}, "sales_tax": {"local": 1.0, "state": 5.0}, "import_duty": {"standard": 5}}}	{"visual_metadata": {"icon": "👓", "display_name": "Eyeglasses"}, "auto_classification": {"enabled": true, "confidence": 0.9}}	t	2025-07-28 03:49:31.205156+00	2025-07-28 03:49:31.205156+00
61c3cc7c-fe65-4ec3-bdc8-71ea1c77a59d	640340	Leather footwear	footwear	shoes	{shoes,boots,"leather shoes","dress shoes","formal shoes",heels}	25.00	t	{"packaging": {"additional_weight": 0.05}, "typical_weights": {"per_unit": {"max": 1.500, "min": 0.300, "average": 0.800}}}	{"typical_rates": {"gst": {"standard": 18}, "vat": {"common": 13}, "customs": {"max": 25, "min": 15, "common": 20}}}	{"auto_classification": {"keywords": ["shoes", "boots", "footwear", "heels"], "confidence": 0.90}}	t	2025-07-28 03:49:25.508844+00	2025-07-28 03:49:36.062545+00
ac3c8ccb-df02-465b-8d16-c55d3814cb12	950300	Toys and games	baby_kids	toys	{toys,games,puzzle,doll,"action figure","board game",lego}	8.00	t	{"packaging": {"additional_weight": 0.05}, "typical_weights": {"per_unit": {"max": 2.000, "min": 0.050, "average": 0.300}}}	{"typical_rates": {"gst": {"standard": 12}, "vat": {"common": 13}, "customs": {"max": 15, "min": 10, "common": 12}}}	{"auto_classification": {"keywords": ["toys", "games", "puzzle", "doll"], "confidence": 0.90}}	t	2025-07-28 03:49:25.508844+00	2025-07-28 03:49:36.062545+00
e6a50ccc-0802-4fed-9f99-bd2975e8362f	870829	Auto parts and accessories	automotive	parts	{auto,car,automotive,parts,accessories,"car parts",vehicle}	20.00	t	{"packaging": {"additional_weight": 0.10}, "typical_weights": {"per_unit": {"max": 10.000, "min": 0.100, "average": 1.500}}}	{"typical_rates": {"gst": {"standard": 18}, "vat": {"common": 13}, "customs": {"max": 18, "min": 12, "common": 15}}}	{"auto_classification": {"keywords": ["auto", "car", "automotive", "parts"], "confidence": 0.85}}	t	2025-07-28 03:49:25.508844+00	2025-07-28 03:49:36.062545+00
abef5399-a522-4fbf-8879-b3d61016a47e	210690	Health supplements	health	supplements	{supplements,vitamins,protein,health,nutrition,whey,creatine}	15.00	t	{"packaging": {"additional_weight": 0.05}, "typical_weights": {"per_unit": {"max": 2.000, "min": 0.100, "average": 0.500}}}	{"typical_rates": {"gst": {"standard": 12}, "vat": {"common": 13}, "customs": {"max": 20, "min": 10, "common": 15}}}	{"auto_classification": {"keywords": ["supplements", "vitamins", "protein", "health"], "confidence": 0.88}}	t	2025-07-28 03:49:25.508844+00	2025-07-28 03:49:36.062545+00
2fee52f1-6b18-4271-9ce6-286f432311de	2101	Coffee and tea products	food	beverages	{coffee,tea,beverage,"instant coffee","green tea","black tea"}	8.00	t	{"packaging": {"additional_weight": 0.03}, "typical_weights": {"per_unit": {"max": 1.000, "min": 0.100, "average": 0.300}}}	{"typical_rates": {"gst": {"standard": 12}, "vat": {"common": 13}, "customs": {"max": 15, "min": 5, "common": 10}}}	{"auto_classification": {"keywords": ["coffee", "tea", "beverage", "instant"], "confidence": 0.90}}	t	2025-07-28 03:49:25.508844+00	2025-07-28 03:49:41.663755+00
ed483539-b81b-4d83-8f6b-a5aa7cd7f76d	9102	Watches and timepieces	accessories	watches	{watch,timepiece,smartwatch,"fitness tracker",clock,wristwatch}	30.00	t	{"packaging": {"additional_weight": 0.02}, "typical_weights": {"per_unit": {"max": 0.300, "min": 0.050, "average": 0.150}}}	{"typical_rates": {"gst": {"standard": 18}, "vat": {"common": 13}, "customs": {"max": 25, "min": 15, "common": 20}}}	{"auto_classification": {"keywords": ["watch", "smartwatch", "fitness tracker", "timepiece"], "confidence": 0.95}}	t	2025-07-28 03:49:25.508844+00	2025-07-28 03:49:41.663755+00
\.


--
-- Data for Name: manual_analysis_tasks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.manual_analysis_tasks (id, quote_id, assigned_to, status, priority, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.messages (id, sender_id, recipient_id, subject, content, message_type, quote_id, reply_to_message_id, attachment_file_name, attachment_url, sender_email, sender_name, is_read, created_at, updated_at, verification_status, admin_notes, verified_by, verified_at, thread_type, priority, is_internal, message_status, read_at, metadata) FROM stdin;
\.


--
-- Data for Name: mfa_activity_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mfa_activity_log (id, user_id, activity_type, ip_address, user_agent, metadata, created_at, success) FROM stdin;
9	65382938-763f-4e70-81c2-b8913d198b0c	setup_initiated	172.18.0.9	\N	{}	2025-07-28 03:36:56.323554+00	t
10	65382938-763f-4e70-81c2-b8913d198b0c	setup_completed	172.18.0.9	\N	{}	2025-07-28 03:37:00.22106+00	t
\.


--
-- Data for Name: mfa_configurations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mfa_configurations (id, user_id, totp_secret, totp_verified, totp_enabled, backup_codes, backup_codes_used, last_used_at, last_used_ip, failed_attempts, locked_until, created_at, updated_at, verified_at, backup_codes_generated_at) FROM stdin;
\.


--
-- Data for Name: mfa_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mfa_sessions (id, user_id, session_token, verified_at, expires_at, ip_address, user_agent) FROM stdin;
\.


--
-- Data for Name: ml_category_weights; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ml_category_weights (id, category, min_weight, max_weight, avg_weight, sample_count, last_updated) FROM stdin;
0a1c478c-3a8a-47f8-9d07-800f10aadd37	electronics	0.050	5.000	1.000	0	2025-07-28 03:48:17.017545+00
41fa8045-b16e-4531-a3c0-05490de952ce	clothing	0.100	2.000	0.500	0	2025-07-28 03:48:17.017545+00
35e6c9e8-be2a-4c33-9eb3-be5c9fac600c	books	0.100	1.000	0.300	0	2025-07-28 03:48:17.017545+00
b46890d3-1e0f-4da2-b22a-8a7a862fa155	beauty	0.010	0.500	0.100	0	2025-07-28 03:48:17.017545+00
b18df5d9-3e51-4032-b2e6-c0af96cb828a	toys	0.050	3.000	0.800	0	2025-07-28 03:48:17.017545+00
ad0fa51f-3116-4225-99d2-363a2bf6b4b7	home	0.100	10.000	2.000	0	2025-07-28 03:48:17.017545+00
7117d25b-ca8a-41ba-a0c5-d18e31664196	sports	0.100	20.000	2.500	0	2025-07-28 03:48:17.017545+00
76b0d31c-2a8c-4336-8675-3534cbbb454d	jewelry	0.005	0.200	0.050	0	2025-07-28 03:48:17.017545+00
30c5276d-b6f0-4441-87df-9392b7b80ec8	food	0.100	5.000	1.000	0	2025-07-28 03:48:17.017545+00
9839f401-3408-4e48-92ba-0e7b54ba49f2	general	0.050	5.000	0.500	0	2025-07-28 03:48:17.017545+00
\.


--
-- Data for Name: ml_product_weights; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ml_product_weights (id, product_name, normalized_name, weight_kg, confidence, category, brand, learned_from_url, training_count, accuracy_score, created_at, updated_at, created_by) FROM stdin;
\.


--
-- Data for Name: ml_training_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ml_training_history (id, product_name, estimated_weight, actual_weight, confidence, accuracy, url, category, brand, user_confirmed, trained_at, trained_by) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, user_id, type, message, data, priority, is_read, is_dismissed, requires_action, allow_dismiss, created_at, updated_at, expires_at, read_at, dismissed_at) FROM stdin;
9a2d08d8-526c-458d-9a9f-874c55c4a7f4	65382938-763f-4e70-81c2-b8913d198b0c	welcome_new_user	Welcome to iwishBag! Start by creating your first quote request to shop globally.	{"title": "Welcome to iwishBag!", "subtitle": "Your global shopping journey starts here", "action_url": "/quote", "action_label": "Request Quote"}	low	f	f	f	t	2025-07-28 02:04:05.93955+00	2025-07-28 02:04:05.93955+00	2025-08-04 02:04:05.811+00	\N	\N
4fdd345f-4117-405d-9625-a1cf9abc5668	65382938-763f-4e70-81c2-b8913d198b0c	welcome_new_user	Welcome to iwishBag! Start by creating your first quote request to shop globally.	{"title": "Welcome to iwishBag!", "subtitle": "Your global shopping journey starts here", "action_url": "/quote", "action_label": "Request Quote"}	low	f	f	f	t	2025-07-28 02:04:05.943944+00	2025-07-28 02:04:05.943944+00	2025-08-04 02:04:05.811+00	\N	\N
6560d628-1867-4732-b2e3-657cbcec1edd	65382938-763f-4e70-81c2-b8913d198b0c	feature_announcement	New Feature: Track your orders in real-time with our enhanced tracking system!	{"title": "New Tracking Feature", "subtitle": "Enhanced order tracking now available", "action_url": "/dashboard/orders", "action_label": "View Orders"}	low	f	f	f	t	2025-07-28 02:04:05.984243+00	2025-07-28 02:04:05.984243+00	2025-08-11 02:04:05.976+00	\N	\N
d93fa620-50ea-4837-816f-6251390fb3fa	65382938-763f-4e70-81c2-b8913d198b0c	feature_announcement	New Feature: Track your orders in real-time with our enhanced tracking system!	{"title": "New Tracking Feature", "subtitle": "Enhanced order tracking now available", "action_url": "/dashboard/orders", "action_label": "View Orders"}	low	f	f	f	t	2025-07-28 02:04:05.988942+00	2025-07-28 02:04:05.988942+00	2025-08-11 02:04:05.979+00	\N	\N
0483faa3-1787-4d2b-9522-e29579118bbe	65382938-763f-4e70-81c2-b8913d198b0c	quote_pending_review	You have 1 quote under review. We'll send you an updated quote within 24-48 hours.	{"title": "Quotes Under Review", "quote_id": "90f27902-f357-4071-802b-ae7cb96d8b8f", "action_url": "/dashboard/quotes", "action_label": "View Quotes"}	medium	f	f	f	t	2025-07-28 02:18:54.252764+00	2025-07-28 02:18:54.252764+00	2025-07-30 02:18:54.235+00	\N	\N
\.


--
-- Data for Name: oauth_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.oauth_tokens (id, gateway_code, client_id, access_token, token_type, expires_in, scope, created_at, expires_at, is_active) FROM stdin;
\.


--
-- Data for Name: package_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.package_events (id, package_id, consolidation_group_id, event_type, event_description, event_data, staff_id, staff_notes, from_location, to_location, created_at) FROM stdin;
\.


--
-- Data for Name: package_notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.package_notifications (id, user_id, package_id, notification_type, title, message, data, sent_at, delivery_method, is_read, created_at) FROM stdin;
\.


--
-- Data for Name: package_photos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.package_photos (id, package_id, consolidation_group_id, photo_url, photo_type, caption, file_size_bytes, dimensions, created_at) FROM stdin;
\.


--
-- Data for Name: payment_adjustments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_adjustments (id, quote_id, adjustment_type, adjustment_reason, original_amount, adjusted_amount, adjustment_value, currency, financial_transaction_id, payment_ledger_id, requested_by, requested_at, approved_by, approved_at, status, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: payment_alert_thresholds; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_alert_thresholds (id, metric_name, warning_threshold, critical_threshold, comparison_operator, enabled, description, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: payment_error_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_error_logs (id, error_code, error_message, user_message, severity, gateway, transaction_id, amount, currency, user_action, should_retry, retry_delay, recovery_options, context, user_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: payment_gateways; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_gateways (id, name, code, is_active, supported_countries, supported_currencies, fee_percent, fee_fixed, config, test_mode, created_at, updated_at, priority, description) FROM stdin;
dd886017-e752-4207-9573-4fa00ac1ef85	Stripe	stripe	t	{US,CA,GB,AU,DE,FR,IT,ES,NL,SG,JP,IN}	{USD,EUR,GBP,CAD,AUD,JPY,SGD,AED,SAR,EGP,TRY}	2.90	0.30	{"environment": "test", "test_secret_key": "sk_test_placeholder", "test_publishable_key": "pk_test_placeholder"}	t	2025-07-28 01:52:20.605238+00	2025-07-28 01:52:20.605238+00	999	International payment gateway supporting cards and multiple currencies
8d7e17d0-de4f-4b2c-9b7b-b7668d644993	PayU	payu	t	{IN}	{INR}	2.50	0.00	{"salt_key": "test_payu_salt", "environment": "test", "merchant_key": "test_payu_key"}	t	2025-07-28 01:52:20.605238+00	2025-07-28 01:52:20.605238+00	999	Leading payment gateway in India supporting cards, UPI, net banking, and wallets
be102778-c68f-4478-bc23-2e78488d81c2	eSewa	esewa	t	{NP}	{NPR}	1.50	0.00	{"secret_key": "test_esewa_secret", "environment": "test", "merchant_id": "test_esewa_merchant"}	t	2025-07-28 01:52:20.605238+00	2025-07-28 01:52:20.605238+00	999	Nepal's most popular digital wallet and payment service
3033c146-963d-41d7-bdaf-d142161c901a	Khalti	khalti	t	{NP}	{NPR}	2.00	0.00	{"public_key": "test_khalti_public", "secret_key": "test_khalti_secret", "environment": "test"}	t	2025-07-28 01:52:20.605238+00	2025-07-28 01:52:20.605238+00	999	Nepal's digital wallet service
dbff4fde-b2ab-4e05-9c7e-cea8b1d33c2d	Fonepay	fonepay	t	{NP}	{NPR}	1.50	0.00	{"password": "test_pass", "username": "test_user", "environment": "test", "merchant_code": "test_fonepay_merchant"}	t	2025-07-28 01:52:20.605238+00	2025-07-28 01:52:20.605238+00	999	Nepal's mobile payment network
b21c18a0-a2dc-400d-a6c1-da8aab50f73a	Airwallex	airwallex	t	{US,CA,GB,AU,DE,FR,IT,ES,NL,SG,JP,HK,CN}	{USD,EUR,GBP,CAD,AUD,JPY,SGD,AED,SAR,EGP,TRY}	1.80	0.30	{"api_key": "test_airwallex_key", "client_id": "test_airwallex_client", "environment": "demo"}	t	2025-07-28 01:52:20.605238+00	2025-07-28 01:52:20.605238+00	999	Global payments infrastructure for modern businesses
6cb91f2c-923e-46f8-bb2d-5e3ab5a48ee7	PayPal	paypal	t	{US,CA,GB,AU,DE,FR,IT,ES,NL,SG,JP,IN}	{USD,CAD,GBP,AUD,EUR,SGD,JPY,INR}	3.40	30.00	{"client_id": "test_paypal_client", "environment": "sandbox", "client_secret": "test_paypal_secret"}	t	2025-07-28 01:52:20.605238+00	2025-07-28 01:52:20.605238+00	999	Global payment platform supporting multiple countries and currencies
9d52419f-93b1-4085-8e34-21f67d323db1	Razorpay	razorpay	t	{IN}	{INR}	2.00	0.00	{"key_id": "test_razorpay_key", "key_secret": "test_razorpay_secret", "environment": "test"}	t	2025-07-28 01:52:20.605238+00	2025-07-28 01:52:20.605238+00	999	Complete payments solution for Indian businesses
26629425-6396-41bb-ab20-edbaeb3b1f1b	Bank Transfer	bank_transfer	t	{US,CA,GB,AU,IN,NP,SG,JP,MY,TH,PH,ID,VN,KR}	{USD,CAD,GBP,AUD,INR,NPR,SGD,JPY,MYR,THB,PHP,IDR,VND,KRW}	0.00	0.00	{"processing_time": "1-3 business days", "requires_manual_verification": true}	f	2025-07-28 01:52:20.605238+00	2025-07-28 01:52:20.605238+00	999	Direct bank transfer with manual verification
1694408b-5122-4232-959f-908b6aa42043	Cash on Delivery	cod	t	{IN,NP,MY,TH,PH,ID,VN}	{INR,NPR,MYR,THB,PHP,IDR,VND}	0.00	50.00	{"max_amount_inr": 50000, "max_amount_npr": 80000, "verification_required": true}	f	2025-07-28 01:52:20.605238+00	2025-07-28 01:52:20.605238+00	999	Pay with cash upon delivery
d6ab62bf-c0e5-46f3-b756-0ab0c4fdcf82	UPI	upi	t	{IN}	{INR}	0.00	0.00	{"vpa": "test@upi", "environment": "test"}	t	2025-07-28 01:52:20.605238+00	2025-07-28 01:52:20.605238+00	999	Unified Payments Interface for instant bank transfers
efd44d6e-6a10-4cf0-b62c-6a05688dd4b1	Paytm	paytm	t	{IN}	{INR}	1.99	0.00	{"environment": "test", "merchant_id": "test_paytm_merchant", "merchant_key": "test_paytm_key"}	t	2025-07-28 01:52:20.605238+00	2025-07-28 01:52:20.605238+00	999	Leading mobile payments and financial services
bcdb2d46-7945-4ee2-8627-d37ade3293b1	GrabPay	grabpay	t	{SG,MY,TH,PH,VN,ID}	{SGD,MYR,THB,PHP,VND,IDR}	1.50	0.00	{"partner_id": "test_grab_partner", "environment": "test", "partner_key": "test_grab_key"}	t	2025-07-28 01:52:20.605238+00	2025-07-28 01:52:20.605238+00	999	Southeast Asia's leading mobile wallet
deec95e8-2bd6-4453-a00f-768fb679e43b	Alipay	alipay	t	{CN,HK,SG,MY,TH,PH,ID,IN}	{CNY,HKD,SGD,MYR,THB,PHP,IDR,INR}	1.80	0.00	{"partner_id": "test_alipay_partner", "environment": "test", "private_key": "test_alipay_key"}	t	2025-07-28 01:52:20.605238+00	2025-07-28 01:52:20.605238+00	999	China's leading mobile and online payment platform
\.


--
-- Data for Name: payment_health_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_health_logs (id, overall_health, success_rate, error_rate, avg_processing_time, alert_count, metrics, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: payment_ledger; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_ledger (id, quote_id, payment_transaction_id, payment_date, payment_type, payment_method, gateway_code, gateway_transaction_id, amount, currency, reference_number, bank_reference, customer_reference, status, verified_by, verified_at, financial_transaction_id, parent_payment_id, payment_proof_message_id, gateway_response, metadata, notes, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: payment_links; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_links (id, link_code, title, amount, currency, status, current_uses, max_uses, is_public, created_at, updated_at, expires_at, created_by, user_id, quote_id, gateway_response, gateway, gateway_link_id, payment_url, gateway_request, original_amount, original_currency, customer_email, customer_name, customer_phone, api_version) FROM stdin;
\.


--
-- Data for Name: payment_reconciliation; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_reconciliation (id, reconciliation_date, payment_method, gateway_code, statement_reference, statement_start_date, statement_end_date, statement_opening_balance, statement_closing_balance, statement_total_credits, statement_total_debits, system_opening_balance, system_closing_balance, system_total_credits, system_total_debits, status, matched_count, unmatched_system_count, unmatched_statement_count, total_matched_amount, statement_file_url, statement_file_name, reconciled_by, started_at, completed_at, notes, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: payment_reminders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_reminders (id, quote_id, reminder_type, sent_at, created_at) FROM stdin;
\.


--
-- Data for Name: payment_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_transactions (id, user_id, quote_id, amount, currency, status, payment_method, gateway_response, created_at, updated_at, total_refunded, refund_count, is_fully_refunded, last_refund_at, paypal_order_id, paypal_capture_id, paypal_payer_id, paypal_payer_email) FROM stdin;
\.


--
-- Data for Name: payment_verification_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_verification_logs (id, request_id, transaction_id, gateway, success, error_message, gateway_response, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: paypal_refund_reasons; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.paypal_refund_reasons (code, description, customer_friendly_description, is_active, display_order, created_at) FROM stdin;
\.


--
-- Data for Name: paypal_refunds; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.paypal_refunds (id, refund_id, original_transaction_id, payment_transaction_id, quote_id, user_id, refund_amount, original_amount, currency, refund_type, reason_code, reason_description, admin_notes, customer_note, status, paypal_status, processed_by, paypal_response, error_details, refund_date, completed_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: paypal_webhook_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.paypal_webhook_events (id, event_id, event_type, resource_type, resource_id, summary, payload, verification_status, processed_at, error_message, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.profiles (id, full_name, country, preferred_display_currency, avatar_url, cod_enabled, internal_notes, referral_code, total_orders, total_spent, created_at, updated_at, email, preferred_payment_gateway) FROM stdin;
f0805d37-af44-47ab-84c5-595a086687cc	User	\N	\N	\N	f	\N	REF3bcfb75d	0	0.00	2025-07-28 01:30:11.351114+00	2025-07-28 01:30:11.351114+00	\N	\N
e8f8a42f-012b-4811-8339-838593d84e95	User	\N	\N	\N	f	\N	REF0d37db85	0	0.00	2025-07-28 01:30:11.351114+00	2025-07-28 01:30:11.351114+00	\N	\N
3086af30-6e93-4b55-bd74-c901b519116c	User	\N	\N	\N	f	\N	REF9689fb5b	0	0.00	2025-07-28 01:30:11.351114+00	2025-07-28 01:30:11.351114+00	\N	\N
65382938-763f-4e70-81c2-b8913d198b0c	Raunak Bohra  	NP	NPR	\N	f	\N	REFd2dedd13	0	0.00	2025-07-28 01:30:11.351114+00	2025-07-28 01:54:03.663528+00	rnkbohra@gmail.com	\N
\.


--
-- Data for Name: quote_address_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.quote_address_history (id, quote_id, old_address, new_address, changed_by, changed_at, change_reason, change_type) FROM stdin;
\.


--
-- Data for Name: quote_documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.quote_documents (id, quote_id, document_type, file_name, file_url, file_size, uploaded_by, uploaded_at, is_customer_visible, description, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: quote_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.quote_items (id, quote_id, product_name, product_url, image_url, category, item_price, item_weight, quantity, options, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: quote_statuses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.quote_statuses (id, value, label, color, icon, is_active) FROM stdin;
\.


--
-- Data for Name: quote_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.quote_templates (id, template_name, product_name, product_url, image_url, item_price, item_weight, quantity, options, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: quotes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.quotes (id, display_id, user_id, status, origin_country, destination_country, items, costprice_total_usd, final_total_usd, calculation_data, customer_data, operational_data, currency, in_cart, created_at, updated_at, smart_suggestions, weight_confidence, optimization_score, expires_at, share_token, is_anonymous, internal_notes, admin_notes, quote_source, iwish_tracking_id, tracking_status, estimated_delivery_date, shipping_carrier, tracking_number, email_verified, verification_token, verification_sent_at, verification_expires_at, first_viewed_at, last_viewed_at, total_view_duration, view_count, calculation_method_preference, valuation_method_preference) FROM stdin;
90f27902-f357-4071-802b-ae7cb96d8b8f	\N	65382938-763f-4e70-81c2-b8913d198b0c	pending	IN	NP	[{"id": "cbc90199-25e0-487b-9843-e876f740ceeb", "url": "http://localhost:8082/quote", "name": "iphone", "image": "", "weight": 20, "category": "music", "hsn_code": "920710", "quantity": 1, "smart_data": {"weight_source": "manual", "price_confidence": 0.9, "category_detected": "music", "weight_confidence": 0.8, "optimization_hints": [], "weight_suggestions": {"hsn_max": 24, "hsn_min": 16, "ml_weight": 20, "hsn_weight": 20, "hsn_packaging": 2, "ml_confidence": 0.6, "hsn_confidence": 0.8, "category_weight_range": {"max": 10, "min": 0.1, "typical": 1}}, "customs_suggestions": ["HSN 920710 classification"]}, "tax_method": "country", "actual_price": 1000, "customer_notes": "", "costprice_origin": 1000, "valuation_method": "actual_price", "minimum_valuation_usd": 100}, {"id": "item-1753677874675", "url": "", "name": "New Product", "image": "", "weight": 0.1, "category": "clothing", "hsn_code": "610910", "quantity": 1, "smart_data": {"weight_source": "manual", "price_confidence": 0.9, "category_detected": "clothing", "weight_confidence": 0.8, "optimization_hints": [], "weight_suggestions": {"hsn_max": 0.12, "hsn_min": 0.1, "ml_weight": 0.1, "hsn_weight": 0.1, "hsn_packaging": 0.05, "ml_confidence": 0.6, "hsn_confidence": 0.8, "category_weight_range": {"max": 10, "min": 0.1, "typical": 1}}, "customs_suggestions": ["HSN 610910 classification"]}, "tax_method": "hsn", "actual_price": 1000, "customer_notes": "", "costprice_origin": 1000, "valuation_method": "actual_price", "minimum_valuation_usd": 10}]	1000.00	1000.00	{"method": "manual", "breakdown": {"fees": 118.1705, "taxes": 0, "customs": 300, "discount": 0, "handling": 45, "shipping": 1429.5, "insurance": 30, "items_total": 2000, "purchase_tax": 260, "destination_tax": 543.747165}, "exchange_rate": {"rate": 1.6, "source": "currency_service", "confidence": 0.95}, "hsn_calculation": {"method": "per_item_hsn", "total_items": 2, "total_hsn_customs": 350, "calculation_timestamp": "2025-07-28T05:13:23.991Z", "total_hsn_local_taxes": 241.5, "recalculated_items_total": 2000, "currency_conversions_applied": 2, "items_with_minimum_valuation": 0}, "item_breakdowns": [{"customs": 150, "item_id": "cbc90199-25e0-487b-9843-e876f740ceeb", "hsn_code": "920710", "item_name": "iphone", "sales_tax": 0, "total_taxes": 391.5, "customs_value": 1150, "destination_tax": 241.5, "valuation_method": "original_price", "minimum_valuation_applied": true}, {"customs": 200, "item_id": "item-1753677874675", "hsn_code": "610910", "item_name": "New Product", "sales_tax": 0, "total_taxes": 200, "customs_value": 1200, "destination_tax": 0, "valuation_method": "original_price", "minimum_valuation_applied": true}], "tax_calculation": {"method": "manual", "customs_rate": 15, "sales_tax_rate": 0, "valuation_method": "product_value", "customs_percentage": 15, "destination_tax_rate": 13}, "valuation_method": "product_value", "domestic_shipping": 0, "valuation_applied": {"method": "product_value", "calculation_type": "async", "basis_explanation": "Customs calculated on actual product value", "adjustment_applied": false, "hsn_calculation_used": true, "original_items_total": 2000, "customs_calculation_base": 2000}, "has_minimum_valuation": false, "international_shipping": 0}	{"info": {"email": "rnkbohra@gmail.com"}, "sessionId": "a09e10ed-6c13-4106-a0ec-72b92e019a39", "preferences": {"insurance_opted_in": true}, "shipping_address": {"email": "rnkbohra@gmail.com", "country": "NP", "fullName": "Raunak Bohra", "destination_country": "NP"}}	{}	INR	f	2025-07-28 01:59:48.376625+00	2025-07-28 05:13:24.025329+00	[]	0.0	0.0	\N	\N	f			website	\N	pending	\N	\N	\N	f	\N	\N	\N	\N	\N	0	0	auto	auto
\.


--
-- Data for Name: received_packages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.received_packages (id, customer_address_id, tracking_number, carrier, sender_name, sender_store, sender_address, received_date, weight_kg, dimensions, dimensional_weight_kg, declared_value_usd, package_description, contents_list, photos, condition_notes, status, storage_location, storage_start_date, storage_fee_exempt_until, consolidation_group_id, received_by_staff_id, last_scanned_at, created_at, updated_at) FROM stdin;
bff06823-b4c0-40c1-9876-a8a5728711bc	3e171258-4034-45d1-95e7-63c025a374c1	123	ups	Raunak 	amazon	\N	2025-07-28 04:06:42.00431+00	1.000	{"unit": "cm", "width": 1, "height": 0, "length": 1}	0.000	1100.00	\N	[]	[]	\N	received	1	2025-07-28 04:06:42.00431+00	2025-08-27 04:06:42.00431+00	\N	65382938-763f-4e70-81c2-b8913d198b0c	2025-07-28 04:06:42.00431+00	2025-07-28 04:06:42.00431+00	2025-07-28 04:06:42.00431+00
\.


--
-- Data for Name: reconciliation_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reconciliation_items (id, reconciliation_id, payment_ledger_id, system_date, system_amount, system_reference, system_description, statement_date, statement_amount, statement_reference, statement_description, matched, match_type, match_confidence, matched_at, matched_by, discrepancy_reason, resolution_action, resolution_notes, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: reconciliation_rules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reconciliation_rules (id, rule_name, rule_type, payment_method, gateway_code, match_field, match_pattern, amount_tolerance, date_tolerance_days, auto_match, confidence_threshold, is_active, priority, times_used, success_count, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: refund_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.refund_items (id, refund_request_id, payment_ledger_id, allocated_amount, currency, exchange_rate, base_amount, gateway_code, gateway_refund_id, gateway_response, status, processed_at, refund_payment_id, financial_transaction_id, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: refund_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.refund_requests (id, quote_id, payment_ledger_id, refund_type, requested_amount, approved_amount, currency, reason_code, reason_description, customer_notes, internal_notes, status, requested_by, requested_at, reviewed_by, reviewed_at, processed_by, processed_at, completed_at, refund_method, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: rejection_reasons; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rejection_reasons (id, reason, category, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: route_customs_tiers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.route_customs_tiers (id, origin_country, destination_country, rule_name, price_min, price_max, weight_min, weight_max, logic_type, customs_percentage, vat_percentage, priority_order, is_active, description, created_at, updated_at, sales_tax_percentage) FROM stdin;
f878a25c-1f9e-46df-b4c4-a49531bcc86d	IN	NP	All	\N	\N	\N	\N	AND	10.00	13.00	1	t		2025-07-28 04:31:57.31697+00	2025-07-28 04:31:57.31697+00	13.00
\.


--
-- Data for Name: share_audit_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.share_audit_log (id, quote_id, user_id, action, ip_address, user_agent, details, created_at) FROM stdin;
\.


--
-- Data for Name: shipping_routes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.shipping_routes (id, origin_country, destination_country, base_shipping_cost, cost_per_kg, cost_percentage, weight_tiers, carriers, max_weight, restricted_items, requires_documentation, is_active, created_at, updated_at, weight_unit, delivery_options, processing_days, active, customs_clearance_days, shipping_per_kg, exchange_rate, tax_configuration, weight_configuration, api_configuration, customs_percentage, vat_percentage) FROM stdin;
5	US	IN	12.00	11.00	2.50	[{"max": 1, "min": 0, "cost": 15.00}, {"max": 3, "min": 1, "cost": 25.00}, {"max": 5, "min": 3, "cost": 35.00}, {"max": null, "min": 5, "cost": 45.00}]	[{"days": "7-10", "name": "DHL", "cost_multiplier": 5.0}]	\N	\N	f	t	2025-07-28 01:51:18.931192	2025-07-28 01:51:18.931192	kg	[]	2	t	3	0.00	1.000000	{"minimum_valuation": {"rounding_method": "up", "apply_conversion": true}, "currency_conversion": {"enabled": true, "fallback_rate": 1.0, "cache_duration_minutes": 60}}	{"weight_validation": {"flag_unusual_weights": true, "max_reasonable_weight": 50.0, "min_reasonable_weight": 0.01}, "dimensional_weight": {"divisor": 5000, "enabled": true}, "auto_weight_detection": true}	{"hsn_lookup": {"enabled": true, "cache_duration": 86400, "primary_source": "local_database", "fallback_source": "local_database"}}	\N	\N
6	US	NP	12.00	11.00	2.50	[{"max": 1, "min": 0, "cost": 15.00}, {"max": 3, "min": 1, "cost": 25.00}, {"max": 5, "min": 3, "cost": 35.00}, {"max": null, "min": 5, "cost": 45.00}]	[{"days": "10-14", "name": "GSH", "cost_multiplier": 5.0}, {"days": "10-14", "name": "GExpress", "cost_multiplier": 5.0}]	\N	\N	f	t	2025-07-28 01:51:18.931192	2025-07-28 01:51:18.931192	kg	[]	2	t	3	0.00	1.000000	{"minimum_valuation": {"rounding_method": "up", "apply_conversion": true}, "currency_conversion": {"enabled": true, "fallback_rate": 1.0, "cache_duration_minutes": 60}}	{"weight_validation": {"flag_unusual_weights": true, "max_reasonable_weight": 50.0, "min_reasonable_weight": 0.01}, "dimensional_weight": {"divisor": 5000, "enabled": true}, "auto_weight_detection": true}	{"hsn_lookup": {"enabled": true, "cache_duration": 86400, "primary_source": "local_database", "fallback_source": "local_database"}}	\N	\N
7	IN	NP	450.00	400.00	2.50	[{"max": 1, "min": 0, "cost": 15}, {"max": 3, "min": 1, "cost": 25}, {"max": 5, "min": 3, "cost": 35}, {"max": null, "min": 5, "cost": 45}]	[{"days": "8-12", "name": "Chain Express", "cost_multiplier": 5.0}]	\N	{}	f	t	2025-07-28 01:51:18.931192	2025-07-28 01:51:18.931192	kg	[{"id": "option_1753675161844", "name": "New Option", "price": 25, "active": true, "carrier": "DHL", "max_days": 10, "min_days": 5, "handling_charge": {"max_fee": 50, "min_fee": 3, "base_fee": 5, "percentage_of_value": 2}, "insurance_options": {"min_fee": 2, "available": true, "max_coverage": 5000, "default_enabled": false, "coverage_percentage": 1.5, "customer_description": "Protect your package against loss, damage, or theft during shipping"}, "volumetric_divisor": 5000}]	2	t	3	0.00	1.600000	{"minimum_valuation": {"rounding_method": "up", "apply_conversion": true}, "currency_conversion": {"enabled": true, "fallback_rate": 1.0, "cache_duration_minutes": 60}}	{"weight_validation": {"flag_unusual_weights": true, "max_reasonable_weight": 50.0, "min_reasonable_weight": 0.01}, "dimensional_weight": {"divisor": 5000, "enabled": true}, "auto_weight_detection": true}	{"hsn_lookup": {"enabled": true, "cache_duration": 86400, "primary_source": "local_database", "fallback_source": "local_database"}}	\N	\N
\.


--
-- Data for Name: status_transitions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.status_transitions (id, quote_id, from_status, to_status, trigger, metadata, changed_by, changed_at) FROM stdin;
\.


--
-- Data for Name: storage_fees; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.storage_fees (id, package_id, user_id, start_date, end_date, days_stored, daily_rate_usd, total_fee_usd, is_paid, payment_date, created_at) FROM stdin;
\.


--
-- Data for Name: support_interactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.support_interactions (id, support_id, user_id, interaction_type, content, metadata, created_at, is_internal) FROM stdin;
\.


--
-- Data for Name: support_system; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.support_system (id, user_id, quote_id, system_type, ticket_data, assignment_data, sla_data, notification_prefs, template_data, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.system_settings (id, setting_key, setting_value, description, created_at, updated_at) FROM stdin;
00267b4d-05a2-4cde-95bc-5ed6c447d780	site_name	iWishBag	Website name	2025-07-28 01:51:18.922545+00	2025-07-28 01:51:18.922545+00
b185dd85-9ea3-4f5b-af3a-8dcde043cd56	site_description	Shop internationally and get anything delivered to your doorstep	Website description	2025-07-28 01:51:18.922545+00	2025-07-28 01:51:18.922545+00
d2c7bd12-965b-43d1-a221-064c727cc37c	default_currency	USD	Default currency for the platform	2025-07-28 01:51:18.922545+00	2025-07-28 01:51:18.922545+00
d3c33441-05cf-49cc-8bf5-c60e1e93ab0d	support_email	info@iwishbag.com	Customer support email	2025-07-28 01:51:18.922545+00	2025-07-28 01:51:18.922545+00
95fd6c98-a6b5-4e4d-b286-e5324ec161e1	max_quote_amount	1000000	Maximum quote amount in USD	2025-07-28 01:51:18.922545+00	2025-07-28 01:51:18.922545+00
daf96c1e-2a29-4e12-8a49-cbd63cff06f5	auto_approval_limit	100	Auto-approval limit for quotes in USD	2025-07-28 01:51:18.922545+00	2025-07-28 01:51:18.922545+00
731bc12a-8a9d-43a6-a1ba-245c224adea8	exchange_rate_markup_percentage	2.5	Exchange rate markup percentage applied to all currency conversions	2025-07-28 01:51:18.922545+00	2025-07-28 01:51:18.922545+00
83208a4e-4950-4678-9f17-e895b7d4b08d	auto_exchange_rate_enabled	true	Enable automatic exchange rate updates	2025-07-28 01:51:18.922545+00	2025-07-28 01:51:18.922545+00
c2f0a4dd-ce40-47d2-8190-a704b73b6846	exchange_rate_update_interval_hours	24	Interval in hours for automatic exchange rate updates	2025-07-28 01:51:18.922545+00	2025-07-28 01:51:18.922545+00
e4107087-f92b-4fdc-8811-2e006fdb066d	wishlist_enabled	true	Enable wishlist feature for users	2025-07-28 01:51:18.922545+00	2025-07-28 01:51:18.922545+00
fb1923bd-3a9d-4dff-b383-c21b3f6d36c7	email_notifications_enabled	true	Enable system-wide email notifications	2025-07-28 01:51:18.922545+00	2025-07-28 01:51:18.922545+00
7c948559-d37c-472d-bd82-216974921ff0	payment_reminder_intervals	[3, 7, 14]	Days after order to send payment reminders	2025-07-28 01:51:18.922545+00	2025-07-28 01:51:18.922545+00
e38adb45-6a01-4313-b7db-9c11468e493f	partial_payment_allowed	true	Whether to accept partial payments	2025-07-28 01:51:18.922545+00	2025-07-28 01:51:18.922545+00
961a6be0-6570-41ef-92fc-1c579568cfe6	overpayment_handling	refund	How to handle overpayments: refund, credit, or manual	2025-07-28 01:51:18.922545+00	2025-07-28 01:51:18.922545+00
2e98a929-a4a4-4326-aa37-6778b0ff7a19	bank_transfer_timeout_days	15	Days before cancelling unpaid bank transfer orders	2025-07-28 01:51:18.922545+00	2025-07-28 01:51:18.922545+00
ac89ff24-ebbb-4e5b-8429-f9fa01b1563a	cod_available_countries	["IN", "NP"]	Countries where COD is available	2025-07-28 01:51:18.922545+00	2025-07-28 01:51:18.922545+00
9d83e693-a790-4060-8b69-d86d3b39ffc1	default_payment_instructions	{"bank_transfer": "Please use your Order ID as the payment reference. Send payment confirmation to info@iwishbag.com", "cod": "Please keep the exact amount ready in cash. Our delivery partner will collect the payment upon delivery."}	Default payment instructions by method	2025-07-28 01:51:18.922545+00	2025-07-28 01:51:18.922545+00
a09b10a6-62c3-4f76-9394-c7ce4d18f45e	order_statuses	[\n  {\n    "id": "partial_payment",\n    "name": "partial_payment",\n    "label": "Partial Payment",\n    "description": "Partial payment received",\n    "color": "warning",\n    "icon": "AlertTriangle",\n    "isActive": true,\n    "order": 2,\n    "allowedTransitions": ["paid", "cancelled"],\n    "isTerminal": false,\n    "category": "order",\n    "triggersEmail": false,\n    "requiresAction": true,\n    "showsInQuotesList": false,\n    "showsInOrdersList": true,\n    "canBePaid": false\n  },\n  {\n    "id": "processing",\n    "name": "processing",\n    "label": "Processing",\n    "description": "Order is being processed (Cash on Delivery)",\n    "color": "default",\n    "icon": "Package",\n    "isActive": true,\n    "order": 3,\n    "allowedTransitions": ["ordered", "shipped", "cancelled"],\n    "isTerminal": false,\n    "category": "order",\n    "triggersEmail": true,\n    "emailTemplate": "cod_order_confirmed",\n    "requiresAction": false,\n    "showsInQuotesList": false,\n    "showsInOrdersList": true,\n    "canBePaid": false\n  },\n  {\n    "id": "paid",\n    "name": "paid",\n    "label": "Paid",\n    "description": "Payment has been received",\n    "color": "default",\n    "icon": "DollarSign",\n    "isActive": true,\n    "order": 4,\n    "allowedTransitions": ["ordered", "cancelled"],\n    "isTerminal": false,\n    "category": "order",\n    "triggersEmail": true,\n    "emailTemplate": "payment_received",\n    "requiresAction": true,\n    "showsInQuotesList": false,\n    "showsInOrdersList": true,\n    "canBePaid": false\n  },\n  {\n    "id": "ordered",\n    "name": "ordered",\n    "label": "Ordered",\n    "description": "Order has been placed with merchant",\n    "color": "default",\n    "icon": "ShoppingCart",\n    "isActive": true,\n    "order": 5,\n    "allowedTransitions": ["shipped", "cancelled"],\n    "isTerminal": false,\n    "category": "order",\n    "triggersEmail": true,\n    "emailTemplate": "order_placed",\n    "requiresAction": false,\n    "showsInQuotesList": false,\n    "showsInOrdersList": true,\n    "canBePaid": false\n  },\n  {\n    "id": "shipped",\n    "name": "shipped",\n    "label": "Shipped",\n    "description": "Order has been shipped",\n    "color": "secondary",\n    "icon": "Truck",\n    "isActive": true,\n    "order": 6,\n    "allowedTransitions": ["completed", "cancelled"],\n    "isTerminal": false,\n    "category": "order",\n    "triggersEmail": true,\n    "emailTemplate": "order_shipped",\n    "requiresAction": false,\n    "showsInQuotesList": false,\n    "showsInOrdersList": true,\n    "canBePaid": false\n  },\n  {\n    "id": "completed",\n    "name": "completed",\n    "label": "Completed",\n    "description": "Order has been delivered",\n    "color": "outline",\n    "icon": "CheckCircle",\n    "isActive": true,\n    "order": 7,\n    "allowedTransitions": [],\n    "isTerminal": true,\n    "category": "order",\n    "triggersEmail": true,\n    "emailTemplate": "order_completed",\n    "requiresAction": false,\n    "showsInQuotesList": false,\n    "showsInOrdersList": true,\n    "canBePaid": false\n  },\n  {\n    "id": "cancelled",\n    "name": "cancelled",\n    "label": "Cancelled",\n    "description": "Quote or order has been cancelled",\n    "color": "destructive",\n    "icon": "XCircle",\n    "isActive": true,\n    "order": 8,\n    "allowedTransitions": [],\n    "isTerminal": true,\n    "category": "order",\n    "triggersEmail": true,\n    "emailTemplate": "order_cancelled",\n    "requiresAction": false,\n    "showsInQuotesList": true,\n    "showsInOrdersList": true,\n    "canBePaid": false\n  },\n  {\n    "id": "payment_pending",\n    "name": "payment_pending",\n    "label": "Awaiting Payment",\n    "description": "Order placed, awaiting payment verification",\n    "color": "outline",\n    "icon": "Clock",\n    "isActive": true,\n    "order": 1,\n    "allowedTransitions": ["paid", "ordered", "cancelled"],\n    "isTerminal": false,\n    "category": "order",\n    "triggersEmail": true,\n    "emailTemplate": "payment_instructions",\n    "requiresAction": false,\n    "showsInQuotesList": false,\n    "showsInOrdersList": true,\n    "canBePaid": false,\n    "allowEdit": false,\n    "allowApproval": false,\n    "allowRejection": false,\n    "allowCartActions": false,\n    "allowCancellation": true,\n    "allowRenewal": false,\n    "allowShipping": false,\n    "allowAddressEdit": true,\n    "showInCustomerView": true,\n    "showInAdminView": true,\n    "showExpiration": false,\n    "isSuccessful": false,\n    "countsAsOrder": true,\n    "progressPercentage": 70,\n    "customerMessage": "Order placed - Please complete payment",\n    "customerActionText": "Pay Now",\n    "cssClass": "status-payment-pending",\n    "badgeVariant": "outline"\n  }\n]	Order status configuration	2025-07-28 01:51:18.922545+00	2025-07-28 01:51:18.922545+00
d00cdd61-0944-49c0-a98b-304731c48b87	quote_statuses	[\n  {\n    "id": "pending",\n    "icon": "Clock",\n    "name": "pending",\n    "color": "secondary",\n    "label": "Pending",\n    "order": 1,\n    "category": "quote",\n    "isActive": true,\n    "isTerminal": false,\n    "description": "Quote request is awaiting review",\n    "allowedTransitions": ["sent", "rejected"]\n  },\n  {\n    "id": "sent",\n    "icon": "FileText",\n    "name": "sent",\n    "color": "outline",\n    "label": "Sent",\n    "order": 2,\n    "category": "quote",\n    "isActive": true,\n    "isTerminal": false,\n    "description": "Quote has been sent to customer",\n    "autoExpireHours": 168,\n    "allowedTransitions": ["approved", "rejected", "expired"]\n  },\n  {\n    "id": "approved",\n    "icon": "CheckCircle",\n    "name": "approved",\n    "color": "default",\n    "label": "Approved",\n    "order": 3,\n    "category": "quote",\n    "isActive": true,\n    "isTerminal": false,\n    "description": "Customer has approved the quote",\n    "allowedTransitions": ["rejected"]\n  },\n  {\n    "id": "rejected",\n    "icon": "XCircle",\n    "name": "rejected",\n    "color": "destructive",\n    "label": "Rejected",\n    "order": 4,\n    "category": "quote",\n    "isActive": true,\n    "isTerminal": true,\n    "description": "Quote has been rejected",\n    "allowedTransitions": ["approved"]\n  },\n  {\n    "id": "expired",\n    "icon": "AlertTriangle",\n    "name": "expired",\n    "color": "destructive",\n    "label": "Expired",\n    "order": 5,\n    "category": "quote",\n    "isActive": true,\n    "isTerminal": true,\n    "description": "Quote has expired",\n    "allowedTransitions": ["approved"]\n  },\n  {\n    "id": "calculated",\n    "icon": "Calculator",\n    "name": "calculated",\n    "color": "secondary",\n    "label": "Calculated",\n    "order": 6,\n    "category": "quote",\n    "isActive": true,\n    "isTerminal": false,\n    "description": "Quote has been calculated and is ready for review",\n    "allowedTransitions": ["sent", "approved", "rejected"]\n  }\n]	Quote status configuration	2025-07-28 01:51:18.922545+00	2025-07-28 01:51:18.922545+00
\.


--
-- Data for Name: tax_backup_20250128; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tax_backup_20250128 (code, vat, sales_tax, backup_timestamp) FROM stdin;
US	0.00	0.08	backup_2025_07_28_05_09_24
CN	0.10	0.00	backup_2025_07_28_05_09_24
IN	0.18	0.00	backup_2025_07_28_05_09_24
NP	0.13	0.00	backup_2025_07_28_05_09_24
\.


--
-- Data for Name: tax_calculation_audit_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tax_calculation_audit_log (id, quote_id, admin_id, calculation_method, valuation_method, previous_calculation_method, previous_valuation_method, change_reason, change_details, item_level_overrides, calculation_comparison, created_at, expires_at) FROM stdin;
\.


--
-- Data for Name: unified_configuration; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.unified_configuration (id, config_type, config_key, config_data, version, is_active, created_at, updated_at) FROM stdin;
c6794f0f-3bba-4763-bd98-246ce5fd7cc8	validation	hsn_code_min_length	{"value": 6}	1	t	2025-07-28 03:49:41.672039+00	2025-07-28 03:49:41.672039+00
d600f0b0-c4aa-49a6-8803-955cc1e131c1	validation	hsn_code_max_length	{"value": 8}	1	t	2025-07-28 03:49:41.672039+00	2025-07-28 03:49:41.672039+00
82ddbe85-3e30-4ec0-ae1f-8675dbdaf06b	country	IN	{"name": "India", "currency": "INR", "tax_system": "GST", "api_endpoints": {"gst_lookup": "https://api.gst.gov.in/taxpayerapi/search/hsnsac"}, "customs_rates": {"bags": 18, "food": 10, "books": 0, "music": 12, "tools": 12, "beauty": 20, "health": 15, "sports": 15, "clothing": 12, "footwear": 20, "baby_kids": 12, "automotive": 15, "accessories": 18, "electronics": 20, "home_garden": 15}, "default_gst_rate": 18, "minimum_valuations": {"rounding_method": "up", "applies_currency_conversion": true}}	1	t	2025-07-28 03:56:28.431927+00	2025-07-28 03:56:28.431927+00
1bf3365a-d149-46d3-95e6-e35653ac21cb	country	NP	{"name": "Nepal", "currency": "NPR", "tax_system": "VAT", "customs_rates": {"bags": 15, "food": 8, "books": 0, "music": 10, "tools": 10, "beauty": 18, "health": 12, "sports": 12, "clothing": 12, "footwear": 18, "baby_kids": 10, "automotive": 12, "accessories": 15, "electronics": 15, "home_garden": 12}, "default_vat_rate": 13, "minimum_valuations": {"clothing": {"value": 10, "currency": "USD"}, "accessories": {"value": 25, "currency": "USD"}, "electronics": {"value": 50, "currency": "USD"}, "applies_currency_conversion": true}, "currency_conversion": {"source": "country_settings.rate_from_usd", "enabled": true}}	1	t	2025-07-28 03:56:28.431927+00	2025-07-28 03:56:28.431927+00
401e8e2c-7b0b-41ba-ba6a-77b76892fa50	country	US	{"name": "United States", "currency": "USD", "tax_system": "SALES_TAX", "api_endpoints": {"taxjar": "https://api.taxjar.com/v2"}, "state_variations": true, "category_overrides": {"books": 0.0, "clothing": 6.0, "electronics": 5.0}, "minimum_valuations": {"applies_currency_conversion": false}, "default_sales_tax_rate": 8.88}	1	t	2025-07-28 03:56:28.431927+00	2025-07-28 03:56:28.431927+00
b1dbe624-dc09-41c5-8cd9-1bdaee974811	country	GB	{"name": "United Kingdom", "currency": "GBP", "tax_system": "VAT", "default_vat_rate": 20, "category_overrides": {"food": 0, "books": 0, "children_clothing": 0}, "minimum_valuations": {"applies_currency_conversion": true}}	1	t	2025-07-28 03:56:28.431927+00	2025-07-28 03:56:28.431927+00
1974adcc-5ff5-4518-a4af-c010f914c211	country	CA	{"name": "Canada", "currency": "CAD", "tax_system": "GST_PST", "federal_gst_rate": 5, "minimum_valuations": {"applies_currency_conversion": true}, "province_variations": true}	1	t	2025-07-28 03:56:28.431927+00	2025-07-28 03:56:28.431927+00
34534e22-3fca-484d-b742-0c5cf1c3e9b8	country	CN	{"name": "China", "currency": "CNY", "tax_system": "VAT", "default_vat_rate": 13, "category_overrides": {"food": 9, "clothing": 16, "electronics": 16}, "minimum_valuations": {"applies_currency_conversion": true}}	1	t	2025-07-28 03:56:28.431927+00	2025-07-28 03:56:28.431927+00
999a50d7-c3fc-43e4-96d0-ddd472b90df2	hsn_settings	global	{"code_max_length": 8, "code_min_length": 4, "cache_ttl_seconds": 3600, "fallback_to_general": true, "supported_categories": ["electronics", "clothing", "beauty", "sports", "footwear", "baby_kids", "bags", "tools", "automotive", "music", "health", "food", "accessories", "home_garden", "books", "general"], "ml_confidence_threshold": 0.85, "auto_classification_enabled": true}	1	t	2025-07-28 03:56:28.435107+00	2025-07-28 03:56:28.435107+00
8c0ac0d7-d266-4e1f-8ba5-ce9937426430	tax_settings	global	{"audit_log_enabled": true, "enable_2tier_method": true, "calculation_timeout_ms": 5000, "enable_admin_overrides": true, "default_valuation_method": "auto", "enable_per_item_overrides": true, "default_calculation_method": "auto"}	1	t	2025-07-28 03:56:28.435107+00	2025-07-28 03:56:28.435107+00
\.


--
-- Data for Name: user_activity_analytics; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_activity_analytics (id, user_id, activity_type, activity_data, session_id, user_agent, referrer, created_at, updated_at) FROM stdin;
4eaea37c-0e1f-4da6-b783-0736c7999962	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/admin/quotes", "referrer": "http://localhost:8082/dashboard", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:12:47.701Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 637, "session_duration": 752360}	fa9ffdbf-4d36-4aca-9560-adfb118c3ab2	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/dashboard	2025-07-28 02:12:47.742595+00	2025-07-28 02:12:47.742595+00
9befa920-de7c-4a8b-9dd9-fd6f84c1fe10	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:12:47.725Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3273214}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:12:47.756424+00	2025-07-28 02:12:47.756424+00
f8d5327d-4ab0-44c3-9cec-66919372c20a	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/admin/quotes", "referrer": "http://localhost:8082/dashboard", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:14:53.315Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 637, "session_duration": 877974}	fa9ffdbf-4d36-4aca-9560-adfb118c3ab2	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/dashboard	2025-07-28 02:14:53.363834+00	2025-07-28 02:14:53.363834+00
98cba464-054c-4f15-94fc-29b2b88e7864	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:14:53.342Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3398831}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:14:53.371411+00	2025-07-28 02:14:53.371411+00
567b53d7-b989-4d9f-9bb1-5d5dd7abd40f	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:18:09.692Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3595181}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:18:09.716142+00	2025-07-28 02:18:09.716142+00
79b6f347-bd44-499b-b791-de5d472841ca	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:18:09.702Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3595191}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:18:09.715959+00	2025-07-28 02:18:09.715959+00
ce4b1cb6-9345-436b-901a-3397e275850e	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_leave", "page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:18:10.852Z", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 637, "session_duration": 3596341}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:18:10.855514+00	2025-07-28 02:18:10.855514+00
bea9dca4-aa6d-4d0d-a93a-965fa70e00a1	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:18:11.315Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 637, "session_duration": 3596804}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:18:11.375794+00	2025-07-28 02:18:11.375794+00
59ea7dcf-7ac3-4da1-91e3-8a04fa3de02f	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:18:11.470Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3596959}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:18:11.506526+00	2025-07-28 02:18:11.506526+00
624cad89-94eb-4225-a821-e2165c93bd6f	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:18:11.501Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3596990}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:18:11.522254+00	2025-07-28 02:18:11.522254+00
c978a0f1-32bd-48ef-aed8-ff9b271ac5b4	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:18:11.516Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3597005}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:18:11.536613+00	2025-07-28 02:18:11.536613+00
3b691ba3-10cc-41b6-9d9c-bf3df9a07820	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:18:47.054Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3632543}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:18:47.058731+00	2025-07-28 02:18:47.058731+00
4d299c40-11d9-4349-a22e-de0ad9ea33a4	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:18:11.520Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3597009}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:18:11.538423+00	2025-07-28 02:18:11.538423+00
3ee8ed94-64a5-4a50-b6dc-e4c0e607965d	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:18:11.525Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3597014}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:18:11.537935+00	2025-07-28 02:18:11.537935+00
dbbf0a2f-cded-4513-9fa9-3005f68f89fe	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:18:25.702Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3611191}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:18:25.709375+00	2025-07-28 02:18:25.709375+00
15b4dcef-6eb3-46a7-8337-ec695a384000	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:18:47.046Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3632535}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:18:47.058181+00	2025-07-28 02:18:47.058181+00
3d9a95ca-79f0-4893-a6da-d8cdc4c82a03	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:18:11.530Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3597019}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:18:11.54028+00	2025-07-28 02:18:11.54028+00
31d70ae8-c44b-4a24-b710-92707b06fc74	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:18:18.588Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3604077}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:18:18.600382+00	2025-07-28 02:18:18.600382+00
201f6abf-0b0b-4691-9c3f-41fc3d4ecc1b	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:18:32.817Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3618306}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:18:32.827633+00	2025-07-28 02:18:32.827633+00
3b117b27-fa6f-4344-843e-51bc56e28a8e	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:18:39.922Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3625411}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:18:39.944929+00	2025-07-28 02:18:39.944929+00
44b81174-56db-4577-a666-d281c5d17eda	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:18:11.534Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3597023}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:18:11.544208+00	2025-07-28 02:18:11.544208+00
2e9cb20f-2145-46e3-9d58-36c1ddade40e	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:18:32.808Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3618297}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:18:32.828754+00	2025-07-28 02:18:32.828754+00
7a17e859-c542-4be3-8f27-4293aff52806	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:18:39.935Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3625424}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:18:39.947269+00	2025-07-28 02:18:39.947269+00
0974fe39-7a75-4824-b951-d7fe91a834a9	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:18:18.583Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3604072}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:18:18.600302+00	2025-07-28 02:18:18.600302+00
4e2caa2a-8d0e-4d53-88c5-e6a4ddacbe3a	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:18:25.696Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3611185}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:18:25.709319+00	2025-07-28 02:18:25.709319+00
e06964ef-5938-43a9-b298-91c7e5b3f264	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:18:54.190Z", "has_orders": false, "has_quotes": true, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3639679}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:18:54.198898+00	2025-07-28 02:18:54.198898+00
ebf5d15a-02cb-483b-9a47-48f4d14e3142	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:19:33.370Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 637, "session_duration": 3678859}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:19:33.428681+00	2025-07-28 02:19:33.428681+00
97c0b863-5faa-4c14-8894-f7da45365eea	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:19:33.510Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3678999}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:19:33.542345+00	2025-07-28 02:19:33.542345+00
3b210b3e-d88f-4f05-a95b-caeb456cd643	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:19:33.529Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3679018}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:19:33.543134+00	2025-07-28 02:19:33.543134+00
9f526fff-8f47-4bd8-842f-c422d74080a3	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:19:33.553Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3679042}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:19:33.566354+00	2025-07-28 02:19:33.566354+00
0d591692-f748-439f-9f2b-af76bc96954a	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:19:33.550Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3679039}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:19:33.56585+00	2025-07-28 02:19:33.56585+00
9c93ecf0-17e2-4761-a3d5-a11c9d127096	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:19:33.557Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3679046}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:19:33.566871+00	2025-07-28 02:19:33.566871+00
2c8b7bad-00c2-423e-8844-513a551216d0	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:19:33.563Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3679052}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:19:33.567736+00	2025-07-28 02:19:33.567736+00
d9f1f2df-2eb9-4e2d-9a58-b310a1f879a8	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:19:33.565Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3679054}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:19:33.569694+00	2025-07-28 02:19:33.569694+00
fd5561f0-4902-4784-872f-00a5fd73b1ee	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:19:54.944Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3700433}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:19:54.96021+00	2025-07-28 02:19:54.96021+00
d1a77bd1-d89e-4651-9627-508cde8294b9	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:20:19.418Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3724907}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:20:19.509285+00	2025-07-28 02:20:19.509285+00
711b1dbc-7558-42f6-99ae-9b5cefd33d80	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:19:40.635Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3686124}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:19:40.657416+00	2025-07-28 02:19:40.657416+00
2c7c0272-7c1b-4496-9b60-8f77ff4189e4	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:19:47.766Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3693255}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:19:47.801982+00	2025-07-28 02:19:47.801982+00
773d69d1-fff4-4807-82a8-3d9ffe6ea656	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:19:40.640Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3686129}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:19:40.659413+00	2025-07-28 02:19:40.659413+00
2c0fec82-f22d-462e-9508-129e226e3902	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:20:02.060Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3707549}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:20:02.090995+00	2025-07-28 02:20:02.090995+00
dcd9ddc7-3af8-44c2-8cda-42cdfeb14898	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:20:09.201Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3714690}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:20:09.213473+00	2025-07-28 02:20:09.213473+00
6c104d9f-cedd-41d2-b14b-a07a2e58e497	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:20:16.491Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3721980}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:20:16.494585+00	2025-07-28 02:20:16.494585+00
53e9f6f3-bffa-47ad-8c96-2d5481b41476	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:19:47.785Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3693274}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:19:47.802031+00	2025-07-28 02:19:47.802031+00
e0f9cf84-f002-44f8-804d-4843af3b53f7	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:20:09.195Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3714684}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:20:09.213678+00	2025-07-28 02:20:09.213678+00
efb6333d-ce3c-4b55-8039-cc14408b12db	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:20:19.486Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3724975}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:20:19.498194+00	2025-07-28 02:20:19.498194+00
406ca8e6-221b-44aa-88f1-d7d77d1a5df4	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:20:19.493Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3724982}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:20:19.509464+00	2025-07-28 02:20:19.509464+00
01fad8d7-8ae2-4ae2-8ac2-446ece558da2	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:19:54.937Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3700426}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:19:54.963874+00	2025-07-28 02:19:54.963874+00
0ef0db16-37f7-44d9-903d-d95a48416ddc	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:20:02.074Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3707563}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:20:02.090373+00	2025-07-28 02:20:02.090373+00
72b8c5b5-9032-4c50-b44a-0c3dce547d44	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:20:15.912Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3721401}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:20:15.924024+00	2025-07-28 02:20:15.924024+00
06de6c3b-fa76-4cf6-bd9e-813ca4882526	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:20:19.492Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3724981}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:20:19.498005+00	2025-07-28 02:20:19.498005+00
4e73d5e1-572d-41e0-981c-38ee92e6c661	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_leave", "page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:20:19.835Z", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 637, "session_duration": 3725324}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:20:19.842703+00	2025-07-28 02:20:19.842703+00
25d26710-4368-4a4d-911d-0ba3098050a3	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:20:20.209Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 637, "session_duration": 3725698}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:20:20.248574+00	2025-07-28 02:20:20.248574+00
aa69caa6-4c00-4ddd-b2bb-b772e828101c	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:20:20.376Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3725865}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:20:20.389227+00	2025-07-28 02:20:20.389227+00
bbeaeaaf-a66f-405c-a1a4-6c0f8569c505	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:20:20.386Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3725875}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:20:20.390298+00	2025-07-28 02:20:20.390298+00
28f1b7cd-865e-4f7b-a242-55e7172de6c5	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:20:20.381Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3725870}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:20:20.389768+00	2025-07-28 02:20:20.389768+00
0b797704-bab9-4bb6-b245-9b44735aaaab	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:20:20.347Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3725836}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:20:20.394693+00	2025-07-28 02:20:20.394693+00
9a098514-667d-459f-8513-8bf0f12b83da	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:20:20.387Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3725876}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:20:20.396408+00	2025-07-28 02:20:20.396408+00
cb0b894e-a14d-4b32-a762-249674eaeb9d	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:20:20.399Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3725888}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:20:20.402241+00	2025-07-28 02:20:20.402241+00
d0ae44ac-3589-4d52-818e-62f8118637af	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:20:41.924Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3747413}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:20:41.945824+00	2025-07-28 02:20:41.945824+00
b414fdba-fe33-4d64-b521-c78d515ba822	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:20:41.919Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 637, "session_duration": 3747408}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:20:41.953108+00	2025-07-28 02:20:41.953108+00
0c7bb000-88f3-40cf-8ef1-cf6595eb9fc4	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:20:49.070Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3754559}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:20:49.084879+00	2025-07-28 02:20:49.084879+00
40387fe9-7d82-4d2b-9317-66b84ca79d64	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:20:49.065Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3754554}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:20:49.08509+00	2025-07-28 02:20:49.08509+00
f8ce70db-f2f0-4d13-80c2-d09ee9dee1ef	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:20:56.165Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3761654}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:20:56.17682+00	2025-07-28 02:20:56.17682+00
219b709f-a4eb-44b7-8dad-86f0b27c80b4	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:20:56.171Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3761660}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:20:56.177617+00	2025-07-28 02:20:56.177617+00
7cfe308d-48d4-43f4-8bc5-633eb82212c5	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:21:03.301Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3768790}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:21:03.32436+00	2025-07-28 02:21:03.32436+00
54f4aad2-a71f-4e48-a573-8bdf206d4057	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:21:03.311Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3768800}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:21:03.326654+00	2025-07-28 02:21:03.326654+00
085f5f4f-ffb6-4a9a-a8f5-5eb0675548c8	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:21:10.424Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3775913}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:21:10.433679+00	2025-07-28 02:21:10.433679+00
7e832970-d64a-41bc-b770-a8d27dc7dd8c	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:21:10.417Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3775906}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:21:10.434788+00	2025-07-28 02:21:10.434788+00
f325b7c7-8588-4e2c-9299-7c87056f24e7	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:21:31.777Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3797266}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:21:31.797719+00	2025-07-28 02:21:31.797719+00
0e8a0af5-eb51-490d-a200-8442632061d9	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:21:53.148Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3818637}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:21:53.161697+00	2025-07-28 02:21:53.161697+00
23a4a001-a586-4520-9d20-116019d6bbf2	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:22:00.269Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3825758}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:22:00.276127+00	2025-07-28 02:22:00.276127+00
4641dc01-2336-4f1e-b255-d21c8feb4eb0	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:22:07.378Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3832867}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:22:07.386423+00	2025-07-28 02:22:07.386423+00
0757252e-3012-4b83-84f9-bb94dc31b634	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:22:21.609Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3847098}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:22:21.616618+00	2025-07-28 02:22:21.616618+00
c7a83c66-1d87-4707-8bdb-4ed894bfdc79	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:22:28.738Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3854227}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:22:28.749868+00	2025-07-28 02:22:28.749868+00
e570d031-abec-4e3b-b7c6-d5695b3fa972	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:22:42.948Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3868437}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:22:42.959655+00	2025-07-28 02:22:42.959655+00
bb0cb775-c6d0-4751-baf0-b0cbe391bab1	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_leave", "page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:23:00.403Z", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 637, "session_duration": 3885892}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:23:00.412681+00	2025-07-28 02:23:00.412681+00
92d3ea8d-73b3-43b0-9926-b4ac4b6841e5	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:21:17.533Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3783022}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:21:17.542653+00	2025-07-28 02:21:17.542653+00
09120473-77ef-4df1-9f21-a7b381cc597c	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:21:17.537Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3783026}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:21:17.543259+00	2025-07-28 02:21:17.543259+00
dd6f4233-110f-44c3-bb49-f36ff899e8f3	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:21:24.670Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3790159}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:21:24.680744+00	2025-07-28 02:21:24.680744+00
6adc22ec-a983-44cd-9f44-9eb411c9ef81	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:21:38.907Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3804396}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:21:38.920503+00	2025-07-28 02:21:38.920503+00
9eab1a5c-af66-4bfa-a9d5-1440b3578b52	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:22:00.263Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3825752}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:22:00.276619+00	2025-07-28 02:22:00.276619+00
5856be44-0bc2-45e6-ada8-4567f4384695	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:22:14.490Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3839979}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:22:14.50149+00	2025-07-28 02:22:14.50149+00
43d1292b-4628-482f-b0f5-2591f8e08b7f	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:22:35.840Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3861329}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:22:35.852623+00	2025-07-28 02:22:35.852623+00
efc7dbd4-28ac-4ad6-b141-594a78d2b07f	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:22:50.057Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3875546}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:22:50.075701+00	2025-07-28 02:22:50.075701+00
6b09b665-f04e-414d-8d04-6f2bacec1199	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:23:08.028Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3893517}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:23:08.048393+00	2025-07-28 02:23:08.048393+00
06f4c66c-5d95-4759-a630-6d08cce7ca0d	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:23:22.228Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3907717}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:23:22.270734+00	2025-07-28 02:23:22.270734+00
742830d5-8af3-49a6-b6e3-ab08f08d2fad	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:21:24.663Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3790152}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:21:24.680119+00	2025-07-28 02:21:24.680119+00
1e608422-862c-4c2f-9d29-601cc2b1d40f	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:21:46.036Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3811525}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:21:46.045962+00	2025-07-28 02:21:46.045962+00
3ef5e2da-592b-4db6-84bf-238727d7e563	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:21:53.153Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3818642}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:21:53.161497+00	2025-07-28 02:21:53.161497+00
e050f92d-9e97-4d70-8731-aaeeb3e4fc24	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:22:28.731Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3854220}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:22:28.748589+00	2025-07-28 02:22:28.748589+00
3badff5f-585b-4705-b215-10171f76af20	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:22:35.845Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3861334}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:22:35.852173+00	2025-07-28 02:22:35.852173+00
181113d4-582d-48c5-a1bd-5c085f0423aa	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:22:42.953Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3868442}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:22:42.959794+00	2025-07-28 02:22:42.959794+00
e4314a7f-362f-403a-9379-e48e340a0a90	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:22:57.188Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3882677}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:22:57.196767+00	2025-07-28 02:22:57.196767+00
3b615d01-3c26-4232-a7a5-faf92eaecb4d	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:23:00.917Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3886406}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:23:00.928471+00	2025-07-28 02:23:00.928471+00
7dfc8583-ad2d-447e-9af8-c4bee574ecf2	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:23:00.956Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3886445}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:23:00.964035+00	2025-07-28 02:23:00.964035+00
d81907d5-3465-410a-aea5-fd9c250908b8	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:23:08.032Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3893521}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:23:08.050225+00	2025-07-28 02:23:08.050225+00
7309e1fb-9a56-4648-b020-fec40aa5950f	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:21:31.785Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3797274}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:21:31.797956+00	2025-07-28 02:21:31.797956+00
7d925302-3309-4525-94d2-07959087726f	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:21:38.902Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3804391}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:21:38.920881+00	2025-07-28 02:21:38.920881+00
6c0dece3-7c85-45c7-a630-bc09363de6e0	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:21:46.030Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3811519}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:21:46.045973+00	2025-07-28 02:21:46.045973+00
ca54dba9-639a-4cc2-bbc3-fe365d2e146a	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:22:07.373Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3832862}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:22:07.386348+00	2025-07-28 02:22:07.386348+00
4d5ba07c-4b4a-4125-ab26-165732b2ea95	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:22:14.484Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3839973}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:22:14.499884+00	2025-07-28 02:22:14.499884+00
496deb59-bdcc-4248-97cc-f5be729b0495	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:22:21.604Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3847093}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:22:21.615509+00	2025-07-28 02:22:21.615509+00
9548330f-0704-4163-bbf9-b844707624a1	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:22:50.064Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3875553}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:22:50.076279+00	2025-07-28 02:22:50.076279+00
b439fd0b-82ef-4e69-b96f-5fc377380a77	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:22:57.181Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3882670}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:22:57.195885+00	2025-07-28 02:22:57.195885+00
af126c1b-4aa6-49ab-8336-5b3b3bf9ac32	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:23:00.780Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 637, "session_duration": 3886269}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:23:00.815692+00	2025-07-28 02:23:00.815692+00
d6e86db1-5155-4e9c-8f11-9e02b1398276	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:23:15.150Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3900639}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:23:15.164846+00	2025-07-28 02:23:15.164846+00
d23bf5cc-fa73-4ee6-b97a-97ae77a7f88c	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:23:00.917Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3886406}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:23:00.919489+00	2025-07-28 02:23:00.919489+00
275e86bc-b2c6-4181-9afc-8e90371df748	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:23:22.255Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3907744}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:23:22.269993+00	2025-07-28 02:23:22.269993+00
bab630aa-c991-475f-9ac1-fcb79e0c8c99	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:23:00.955Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3886444}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:23:00.956782+00	2025-07-28 02:23:00.956782+00
72ce7c23-17b8-4ea2-bb31-7af5f8f504d5	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:23:00.960Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3886449}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:23:00.964195+00	2025-07-28 02:23:00.964195+00
6dedca7a-a935-4608-8d51-c0c76deb6652	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:23:29.366Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3914855}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:23:29.376476+00	2025-07-28 02:23:29.376476+00
c9bc2aec-e21b-4512-8ff2-acbb344ccd85	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:23:15.143Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3900632}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:23:15.164512+00	2025-07-28 02:23:15.164512+00
0a44cfd2-a722-45ad-8e20-2a4a3ddf2dfe	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:23:29.359Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3914848}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:23:29.376093+00	2025-07-28 02:23:29.376093+00
8ebff2a4-22f2-4182-ad93-7270e498e426	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:23:36.468Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3921957}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:23:36.485894+00	2025-07-28 02:23:36.485894+00
24fe7827-d57f-40bb-9098-4eafd64e0415	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:23:36.475Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3921964}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:23:36.486099+00	2025-07-28 02:23:36.486099+00
4d796243-4156-47ae-9a75-8034576d1477	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:23:43.573Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3929062}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:23:43.59711+00	2025-07-28 02:23:43.59711+00
12fcd1f8-d39b-43d3-9de8-971ae0686fec	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:23:43.567Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3929056}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:23:43.596574+00	2025-07-28 02:23:43.596574+00
2d759815-c826-4c18-b589-8e8e17ef8979	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:23:50.678Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3936167}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:23:50.699443+00	2025-07-28 02:23:50.699443+00
c62ed405-3ec4-49a9-a808-461daac31120	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:23:50.687Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3936176}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:23:50.701184+00	2025-07-28 02:23:50.701184+00
92aa69fe-2753-4bae-bb82-2f05769cbe82	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:23:57.767Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3943256}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:23:57.77316+00	2025-07-28 02:23:57.77316+00
f1c4a0f2-7f58-4fb1-8941-2735ff659f6b	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:23:57.764Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3943253}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:23:57.773154+00	2025-07-28 02:23:57.773154+00
089c0d49-62c3-4ffa-a290-97d2f81e984b	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:24:04.852Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3950341}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:24:04.880012+00	2025-07-28 02:24:04.880012+00
f406496d-bb7a-450f-95bd-545cc5d1252d	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:24:04.858Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3950347}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:24:04.87977+00	2025-07-28 02:24:04.87977+00
f51c4be7-3779-48b5-bc2f-2b3541929d40	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:24:11.951Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3957440}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:24:11.967358+00	2025-07-28 02:24:11.967358+00
3d9872bf-89aa-48f7-9bb6-0c6b55502ec5	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:24:11.957Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3957446}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:24:11.967488+00	2025-07-28 02:24:11.967488+00
18c8ed5b-9b4d-4e62-9134-b6bae8a20e8f	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:24:19.049Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3964538}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:24:19.059954+00	2025-07-28 02:24:19.059954+00
fe66582e-634e-48c2-a1ec-b551a2b97142	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:24:19.043Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3964532}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:24:19.059694+00	2025-07-28 02:24:19.059694+00
69500526-648a-4ae9-ad99-1284d4fed835	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:24:26.150Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3971639}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:24:26.159689+00	2025-07-28 02:24:26.159689+00
ad2aabc9-93a1-4178-88f4-383df2c1aafe	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:24:33.264Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3978753}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:24:33.29045+00	2025-07-28 02:24:33.29045+00
1e02ab95-1328-4fcf-8a76-0132309a74e3	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:24:26.144Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3971633}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:24:26.160504+00	2025-07-28 02:24:26.160504+00
4435a5bc-ad2a-49ca-9a8f-c197f28fddd5	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:24:33.254Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3978743}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:24:33.290071+00	2025-07-28 02:24:33.290071+00
45302002-ab0f-44b7-833f-c1b354c455a8	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:24:40.383Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3985872}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:24:40.403966+00	2025-07-28 02:24:40.403966+00
2d3c2b9d-57de-4d4b-aa3a-4bb46446b108	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:24:40.396Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3985885}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:24:40.406152+00	2025-07-28 02:24:40.406152+00
882aa44b-919d-4ba4-b1af-ab4d4c396bc4	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:24:47.510Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3992999}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:24:47.542531+00	2025-07-28 02:24:47.542531+00
de037031-8f83-43d1-befc-a1b4fcd85621	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:24:47.516Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 3993005}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:24:47.529479+00	2025-07-28 02:24:47.529479+00
1a552c33-6843-45b5-a9bc-bac08a4891eb	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:24:54.608Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 4000097}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:24:54.617451+00	2025-07-28 02:24:54.617451+00
807b05ce-8fee-4d1c-a191-e2c26e6bff30	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:24:54.601Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 4000090}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:24:54.617699+00	2025-07-28 02:24:54.617699+00
b0ad96fe-5869-4bcb-922d-b1652c508bae	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:25:01.700Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 4007189}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:25:01.730606+00	2025-07-28 02:25:01.730606+00
1e210f4d-9f4a-4bbe-9c9c-e667fce03082	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:25:01.705Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 4007194}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:25:01.73057+00	2025-07-28 02:25:01.73057+00
4d8c155f-642e-4f48-b806-6c3a1c9b0f15	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:25:08.831Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 4014320}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:25:08.848498+00	2025-07-28 02:25:08.848498+00
ccf75e0e-7667-45b9-827f-625ce8a0b1df	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:25:08.837Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 4014326}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:25:08.848514+00	2025-07-28 02:25:08.848514+00
12484ae2-ef85-4710-b8b8-08412a6965d3	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:25:15.103Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 4020592}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:25:15.112488+00	2025-07-28 02:25:15.112488+00
141a5a4d-a6f9-4c53-8229-bda4d9f6d313	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:25:15.110Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 4020599}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:25:15.112773+00	2025-07-28 02:25:15.112773+00
b712cc7e-3c54-48f0-97fc-9db4138986a9	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:25:29.376Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 4034865}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:25:29.389074+00	2025-07-28 02:25:29.389074+00
0ac03195-2422-4bc9-89c3-d88934dd2fba	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:25:36.543Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 4042032}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:25:36.557891+00	2025-07-28 02:25:36.557891+00
0c2f79c1-4cf4-4ac6-98b2-5ae32c1c5c2b	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:25:50.762Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 4056251}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:25:50.771851+00	2025-07-28 02:25:50.771851+00
a87ebac2-d6da-4905-8081-6733173b5484	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:25:57.904Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 4063393}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:25:57.944161+00	2025-07-28 02:25:57.944161+00
623ee728-ea0c-44c3-ac34-b699b2543eaf	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:26:05.036Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 4070525}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:26:05.050409+00	2025-07-28 02:26:05.050409+00
ea2a77c4-0267-49f8-8731-84d17ee79571	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:26:12.128Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 4077617}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:26:12.154437+00	2025-07-28 02:26:12.154437+00
c08c9702-c576-4c6d-9dce-2223b2760a7f	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:25:14.928Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 637, "session_duration": 4020417}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:25:14.967072+00	2025-07-28 02:25:14.967072+00
442e8911-106e-485a-8a32-ed043f6e79f8	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:25:15.063Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 4020552}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:25:15.071932+00	2025-07-28 02:25:15.071932+00
51f4ba61-bd5d-41ef-ad31-afa52869ee70	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:25:15.103Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 4020592}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:25:15.104284+00	2025-07-28 02:25:15.104284+00
dac2419c-0df2-4177-939d-558480e16a74	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:25:22.222Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 4027711}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:25:22.233278+00	2025-07-28 02:25:22.233278+00
284f4667-825e-4625-8a4b-3928d586944f	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:25:22.214Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 4027703}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:25:22.251768+00	2025-07-28 02:25:22.251768+00
9cf6d53f-f12b-4936-845c-a0151f2712c8	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:25:29.369Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 4034858}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:25:29.389225+00	2025-07-28 02:25:29.389225+00
ba83eb91-36af-4d66-975b-7dbbf124ad4b	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:25:36.513Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 4042002}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:25:36.556652+00	2025-07-28 02:25:36.556652+00
13ac32f6-69bb-44b8-96ce-4f1d9ef775db	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:25:43.647Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 4049136}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:25:43.668751+00	2025-07-28 02:25:43.668751+00
a18492dc-dcc3-4f08-bd3b-70878c2bf4ed	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:25:43.656Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 4049145}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:25:43.670847+00	2025-07-28 02:25:43.670847+00
19514d41-798c-404f-9f2c-3d1e5de4349a	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:25:50.756Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 4056245}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:25:50.772373+00	2025-07-28 02:25:50.772373+00
a0fc1575-0c64-4438-a447-e25785f444c9	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:25:57.897Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 4063386}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:25:57.941904+00	2025-07-28 02:25:57.941904+00
f60f644d-4fe4-490f-8e1d-4abbeb425a0e	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:26:05.029Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 4070518}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:26:05.049876+00	2025-07-28 02:26:05.049876+00
568a9f2f-0fc9-4952-833d-bce0af230afd	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:26:19.272Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 4084761}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:26:19.284325+00	2025-07-28 02:26:19.284325+00
62540d78-0172-4074-8c67-2597853189dd	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:26:12.144Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 4077633}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:26:12.157137+00	2025-07-28 02:26:12.157137+00
74eff049-5b09-487c-a7e8-16eac2d49e7a	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:26:26.384Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 4091873}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:26:26.398328+00	2025-07-28 02:26:26.398328+00
5d4dfb39-67ec-4774-a27a-7aa4cbe55e11	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:26:33.499Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 4098988}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:26:33.513484+00	2025-07-28 02:26:33.513484+00
2a64728c-38ed-44a1-9867-048dc191eb32	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:26:19.276Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 4084766}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:26:19.284862+00	2025-07-28 02:26:19.284862+00
d8fe2811-9bb6-4b59-9d01-ec0611562d08	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:26:33.505Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 4098994}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:26:33.51397+00	2025-07-28 02:26:33.51397+00
e1261f96-7d56-4b19-95bd-244e0e0bff45	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:26:26.389Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 4091878}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:26:26.39841+00	2025-07-28 02:26:26.39841+00
6d888506-c859-44d3-9008-d8f3d519b7bc	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:26:36.625Z", "has_orders": false, "has_quotes": true, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 4102114}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:26:36.631481+00	2025-07-28 02:26:36.631481+00
9ca54d67-7098-4ea1-9ff5-540ef7263252	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_leave", "page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:26:52.606Z", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 637, "session_duration": 4118095}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:26:52.612495+00	2025-07-28 02:26:52.612495+00
aa4fbc55-4591-4f6c-b188-a9d9475ac4a0	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:26:53.056Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 637, "session_duration": 4118545}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:26:53.091237+00	2025-07-28 02:26:53.091237+00
98595a2e-5cd2-46f1-8db6-bda4899cd23d	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:26:53.189Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 4118678}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:26:53.275923+00	2025-07-28 02:26:53.275923+00
20182b65-6482-424e-a719-66e6ca922e6d	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:26:53.211Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 4118700}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:26:53.284532+00	2025-07-28 02:26:53.284532+00
49914f72-3710-4960-8849-e77cca06a599	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:26:53.335Z", "has_orders": false, "has_quotes": true, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 4118824}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:26:53.337587+00	2025-07-28 02:26:53.337587+00
b7f24c4e-8496-426e-9823-5e220535a88d	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:26:53.402Z", "has_orders": false, "has_quotes": true, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 4118891}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:26:53.41483+00	2025-07-28 02:26:53.41483+00
1c1def4e-5ece-45bd-9fe7-25545b9c7590	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:26:53.371Z", "has_orders": false, "has_quotes": true, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 4118860}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:26:53.415507+00	2025-07-28 02:26:53.415507+00
7e6d4cc6-d380-440f-90c7-03bbd5468888	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:26:53.294Z", "has_orders": false, "has_quotes": false, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 4118783}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:26:53.41234+00	2025-07-28 02:26:53.41234+00
aca0b5ca-fad4-4a1d-be65-973ebe4ba40b	65382938-763f-4e70-81c2-b8913d198b0c	dashboard:view	{"page_url": "http://localhost:8082/dashboard", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T02:26:53.364Z", "has_orders": false, "has_quotes": true, "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "has_tickets": false, "is_new_user": true, "viewport_width": 1869, "viewport_height": 637, "session_duration": 4118853}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 02:26:53.415574+00	2025-07-28 02:26:53.415574+00
1d4a9823-eb97-402f-8172-859d5648649a	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_leave", "page_url": "http://localhost:8082/dashboard/quotes/90f27902-f357-4071-802b-ae7cb96d8b8f", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T03:03:33.588Z", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 637, "session_duration": 6319077}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 03:03:33.601503+00	2025-07-28 03:03:33.601503+00
669998b0-3c4d-4e12-bfb8-64366a516b43	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/dashboard/quotes/90f27902-f357-4071-802b-ae7cb96d8b8f", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T03:03:34.032Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 637, "session_duration": 6319521}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 03:03:34.100903+00	2025-07-28 03:03:34.100903+00
44abe01d-9bbc-403b-8531-5d5a30f16368	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_leave", "page_url": "http://localhost:8082/admin", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T03:08:04.060Z", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 637, "session_duration": 6589549}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 03:08:04.064149+00	2025-07-28 03:08:04.064149+00
9c86a785-ed10-4e82-937a-6e204addecad	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/admin", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T03:08:04.550Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 637, "session_duration": 6590039}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 03:08:04.572601+00	2025-07-28 03:08:04.572601+00
1acf9f9f-1a0c-4d6d-a326-d054d0293557	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/admin", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T03:19:14.131Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 637, "session_duration": 7259620}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 03:19:14.175271+00	2025-07-28 03:19:14.175271+00
8df8c097-8da6-4a59-a230-59f17d6da9c0	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/admin", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T03:20:20.472Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 637, "session_duration": 7325962}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 03:20:20.501456+00	2025-07-28 03:20:20.501456+00
48ee1ea7-f0de-41f0-b167-4891b57a7c81	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/admin", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T03:22:58.854Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 637, "session_duration": 7484343}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 03:22:58.892382+00	2025-07-28 03:22:58.892382+00
02ed0778-d875-4bfa-8307-2985f5133f67	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/admin", "referrer": "http://localhost:8082/quote", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T03:23:07.967Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 637, "session_duration": 7493456}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/quote	2025-07-28 03:23:07.993446+00	2025-07-28 03:23:07.993446+00
6152b3b7-9587-410c-9b94-8ffdc3c6254d	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/admin", "referrer": "", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T03:23:08.912Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 637, "session_duration": 7494401}	4c02d31d-4e49-45b9-b57a-93bd5a0a3197	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36		2025-07-28 03:23:08.933334+00	2025-07-28 03:23:08.933334+00
720a8d22-72b4-455c-8e01-8e501cf35c8c	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/admin", "referrer": "", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T03:23:23.731Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 1058, "session_duration": 0}	b87ac5b3-d75e-436b-93b9-351198e044ab	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36		2025-07-28 03:23:23.934989+00	2025-07-28 03:23:23.934989+00
b683ba6b-316f-40f4-860b-48b3ff93aaff	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/admin", "referrer": "", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T03:28:44.488Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 637, "session_duration": 320757}	b87ac5b3-d75e-436b-93b9-351198e044ab	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36		2025-07-28 03:28:44.514276+00	2025-07-28 03:28:44.514276+00
4e82ba34-8244-4675-b857-9fe3db63ee51	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/admin", "referrer": "http://localhost:8082/admin", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T03:28:49.864Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 637, "session_duration": 326133}	b87ac5b3-d75e-436b-93b9-351198e044ab	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/admin	2025-07-28 03:28:49.885121+00	2025-07-28 03:28:49.885121+00
76a5e208-8b9d-4680-ae78-6f6da541e398	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/admin", "referrer": "http://localhost:8082/admin", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T03:32:26.706Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 637, "session_duration": 542975}	b87ac5b3-d75e-436b-93b9-351198e044ab	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/admin	2025-07-28 03:32:26.779958+00	2025-07-28 03:32:26.779958+00
d7d16f71-5eea-4c2b-8ed9-3ba364f68667	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_leave", "page_url": "http://localhost:8082/admin", "referrer": "http://localhost:8082/admin", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T03:32:53.040Z", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 637, "session_duration": 569309}	b87ac5b3-d75e-436b-93b9-351198e044ab	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/admin	2025-07-28 03:32:53.044354+00	2025-07-28 03:32:53.044354+00
66ecc759-0d16-484f-8ba6-606f79b983f4	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/admin", "referrer": "http://localhost:8082/admin", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T03:32:53.357Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 637, "session_duration": 569626}	b87ac5b3-d75e-436b-93b9-351198e044ab	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/admin	2025-07-28 03:32:53.387344+00	2025-07-28 03:32:53.387344+00
dcfd7961-22ac-4467-83d9-b534eff8c57c	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/admin", "referrer": "http://localhost:8082/admin", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T03:32:56.837Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 637, "session_duration": 573106}	b87ac5b3-d75e-436b-93b9-351198e044ab	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/admin	2025-07-28 03:32:56.857304+00	2025-07-28 03:32:56.857304+00
8f420681-120d-4f49-b235-bf6985fbaad6	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/admin", "referrer": "http://localhost:8082/admin", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T03:36:35.305Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 637, "session_duration": 791574}	b87ac5b3-d75e-436b-93b9-351198e044ab	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/admin	2025-07-28 03:36:35.352998+00	2025-07-28 03:36:35.352998+00
da79de53-d0bb-4585-bc09-149d17433fcb	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/admin", "referrer": "http://localhost:8082/admin", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T03:37:01.473Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 637, "session_duration": 817742}	b87ac5b3-d75e-436b-93b9-351198e044ab	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/admin	2025-07-28 03:37:01.49801+00	2025-07-28 03:37:01.49801+00
6b028c5c-4b74-4bc2-922a-40d2a3ac0221	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/admin", "referrer": "http://localhost:8082/admin", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T03:38:47.723Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 637, "session_duration": 923992}	b87ac5b3-d75e-436b-93b9-351198e044ab	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/admin	2025-07-28 03:38:47.755887+00	2025-07-28 03:38:47.755887+00
5aecfeab-18c0-4a33-a10c-b96092ffabd3	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_leave", "page_url": "http://localhost:8082/admin/quotes", "referrer": "http://localhost:8082/admin", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T03:41:29.150Z", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 1058, "session_duration": 1085419}	b87ac5b3-d75e-436b-93b9-351198e044ab	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/admin	2025-07-28 03:41:29.155416+00	2025-07-28 03:41:29.155416+00
7f46bba9-a05e-4be7-9aa2-573291f3073a	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/admin/quotes", "referrer": "http://localhost:8082/admin", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T03:41:29.526Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 1058, "session_duration": 1085795}	b87ac5b3-d75e-436b-93b9-351198e044ab	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/admin	2025-07-28 03:41:29.544353+00	2025-07-28 03:41:29.544353+00
7b89a8e3-3cd5-4fd5-910d-0a134897d029	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/admin/quotes", "referrer": "http://localhost:8082/admin", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T03:42:50.061Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 637, "session_duration": 1166330}	b87ac5b3-d75e-436b-93b9-351198e044ab	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/admin	2025-07-28 03:42:50.082752+00	2025-07-28 03:42:50.082752+00
4092c6af-6634-4fb8-8359-143e62367f43	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/admin/quotes", "referrer": "http://localhost:8082/admin", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T03:44:15.762Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 637, "session_duration": 1252031}	b87ac5b3-d75e-436b-93b9-351198e044ab	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/admin	2025-07-28 03:44:15.786938+00	2025-07-28 03:44:15.786938+00
8b43c17f-8660-49d0-aa73-199c73006d3f	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/admin/quotes", "referrer": "http://localhost:8082/admin", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T03:44:32.125Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 637, "session_duration": 1268394}	b87ac5b3-d75e-436b-93b9-351198e044ab	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/admin	2025-07-28 03:44:32.129553+00	2025-07-28 03:44:32.129553+00
17328f12-80f7-4c25-9a52-c9690614c12d	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_leave", "page_url": "http://localhost:8082/admin/quotes", "referrer": "http://localhost:8082/admin", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T03:44:33.188Z", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 637, "session_duration": 1269457}	b87ac5b3-d75e-436b-93b9-351198e044ab	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/admin	2025-07-28 03:44:33.193316+00	2025-07-28 03:44:33.193316+00
369633ec-b1cc-4935-a553-dec71b7f9564	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/admin/quotes", "referrer": "http://localhost:8082/admin", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T03:44:33.514Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 637, "session_duration": 1269783}	b87ac5b3-d75e-436b-93b9-351198e044ab	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/admin	2025-07-28 03:44:33.535386+00	2025-07-28 03:44:33.535386+00
e9fe3a37-7788-4006-83ea-2681a77bda5a	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/admin/quotes/90f27902-f357-4071-802b-ae7cb96d8b8f", "referrer": "http://localhost:8082/admin", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T03:47:35.230Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 637, "session_duration": 1451499}	b87ac5b3-d75e-436b-93b9-351198e044ab	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/admin	2025-07-28 03:47:35.255509+00	2025-07-28 03:47:35.255509+00
6c5186b4-0513-4575-aac7-812706d3d377	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/admin/quotes/90f27902-f357-4071-802b-ae7cb96d8b8f", "referrer": "http://localhost:8082/admin", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T03:47:48.094Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 637, "session_duration": 1464363}	b87ac5b3-d75e-436b-93b9-351198e044ab	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/admin	2025-07-28 03:47:48.116665+00	2025-07-28 03:47:48.116665+00
532d4621-0045-45fd-a447-f51515e84fce	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/admin/quotes/90f27902-f357-4071-802b-ae7cb96d8b8f", "referrer": "http://localhost:8082/admin", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T03:48:34.243Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 637, "session_duration": 1510512}	b87ac5b3-d75e-436b-93b9-351198e044ab	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/admin	2025-07-28 03:48:34.266644+00	2025-07-28 03:48:34.266644+00
3aa90915-e551-4402-b45f-5ea608af4a32	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/admin/shipping-routes", "referrer": "http://localhost:8082/admin/quotes/90f27902-f357-4071-802b-ae7cb96d8b8f", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T03:50:23.650Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 1058, "session_duration": 0}	fc290002-f6f1-4856-800d-3d163a69a80b	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/admin/quotes/90f27902-f357-4071-802b-ae7cb96d8b8f	2025-07-28 03:50:23.854457+00	2025-07-28 03:50:23.854457+00
4a04b8bd-199c-42a0-9836-863487657016	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/admin/shipping-routes", "referrer": "http://localhost:8082/admin/quotes/90f27902-f357-4071-802b-ae7cb96d8b8f", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T03:50:38.636Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 1058, "session_duration": 14986}	fc290002-f6f1-4856-800d-3d163a69a80b	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/admin/quotes/90f27902-f357-4071-802b-ae7cb96d8b8f	2025-07-28 03:50:38.648855+00	2025-07-28 03:50:38.648855+00
1f165638-8a54-48fe-9d31-63608bbb0129	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/admin/warehouse", "referrer": "http://localhost:8082/admin/quotes/90f27902-f357-4071-802b-ae7cb96d8b8f", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T03:53:29.814Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 637, "session_duration": 0}	a0598c74-2275-4bda-98d1-d9e948947176	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/admin/quotes/90f27902-f357-4071-802b-ae7cb96d8b8f	2025-07-28 03:53:30.062219+00	2025-07-28 03:53:30.062219+00
05dbb4d0-0844-45d4-be99-e6a37e958879	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_leave", "page_url": "http://localhost:8082/admin/quotes/90f27902-f357-4071-802b-ae7cb96d8b8f", "referrer": "http://localhost:8082/admin", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T03:54:44.806Z", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 637, "session_duration": 1881075}	b87ac5b3-d75e-436b-93b9-351198e044ab	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/admin	2025-07-28 03:54:44.811589+00	2025-07-28 03:54:44.811589+00
84d04942-89ec-4f9b-95ce-e68329a0ee07	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/admin/quotes/90f27902-f357-4071-802b-ae7cb96d8b8f", "referrer": "http://localhost:8082/admin", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T03:54:45.214Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 637, "session_duration": 1881483}	b87ac5b3-d75e-436b-93b9-351198e044ab	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/admin	2025-07-28 03:54:45.270596+00	2025-07-28 03:54:45.270596+00
d4ce2c36-530c-462e-8a0a-9abd7819898a	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/admin/quotes/90f27902-f357-4071-802b-ae7cb96d8b8f", "referrer": "http://localhost:8082/admin", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T03:56:58.309Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 637, "session_duration": 2014578}	b87ac5b3-d75e-436b-93b9-351198e044ab	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/admin	2025-07-28 03:56:58.360055+00	2025-07-28 03:56:58.360055+00
d1a27a1b-e877-4fcd-b608-d261d0fe88c8	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/admin/quotes/90f27902-f357-4071-802b-ae7cb96d8b8f", "referrer": "http://localhost:8082/admin", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T03:57:23.989Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 637, "session_duration": 2040258}	b87ac5b3-d75e-436b-93b9-351198e044ab	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/admin	2025-07-28 03:57:24.012265+00	2025-07-28 03:57:24.012265+00
acc08cec-0c6a-4437-b71f-95f80b1b09be	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/admin/warehouse", "referrer": "http://localhost:8082/admin/quotes/90f27902-f357-4071-802b-ae7cb96d8b8f", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T03:57:41.072Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 1058, "session_duration": 251258}	a0598c74-2275-4bda-98d1-d9e948947176	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/admin/quotes/90f27902-f357-4071-802b-ae7cb96d8b8f	2025-07-28 03:57:41.086984+00	2025-07-28 03:57:41.086984+00
49578ac8-cb74-4014-98cd-3c74e1e8c11a	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/admin/warehouse", "referrer": "http://localhost:8082/admin/warehouse", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T04:02:55.505Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 637, "session_duration": 565691}	a0598c74-2275-4bda-98d1-d9e948947176	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/admin/warehouse	2025-07-28 04:02:55.622786+00	2025-07-28 04:02:55.622786+00
a0ebefb2-e930-4eb8-83c7-3f0ab0e8a088	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/admin/shipping-routes", "referrer": "http://localhost:8082/admin/shipping-routes", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T04:02:55.956Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 1058, "session_duration": 2372225}	b87ac5b3-d75e-436b-93b9-351198e044ab	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/admin/shipping-routes	2025-07-28 04:02:55.987581+00	2025-07-28 04:02:55.987581+00
b4863f29-1114-4b34-ace5-7f973ee48195	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/dashboard/package-forwarding", "referrer": "http://localhost:8082/admin/warehouse", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T04:03:58.471Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 637, "session_duration": 0}	3fd89cd6-0ef5-408f-b703-b78585281411	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/admin/warehouse	2025-07-28 04:03:58.731201+00	2025-07-28 04:03:58.731201+00
2a76980c-c904-44ad-ba56-1d2df9b2d5c5	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_leave", "page_url": "http://localhost:8082/admin/warehouse", "referrer": "http://localhost:8082/admin/warehouse", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T04:06:57.230Z", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 1058, "session_duration": 807416}	a0598c74-2275-4bda-98d1-d9e948947176	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/admin/warehouse	2025-07-28 04:06:57.237469+00	2025-07-28 04:06:57.237469+00
5542ad77-a7cf-4d4c-83e2-dde7b133acf2	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/admin/warehouse", "referrer": "http://localhost:8082/admin/warehouse", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T04:06:57.546Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 1058, "session_duration": 807732}	a0598c74-2275-4bda-98d1-d9e948947176	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/admin/warehouse	2025-07-28 04:06:57.569472+00	2025-07-28 04:06:57.569472+00
81d05ffd-e65f-4b4e-b788-8c5c7e002722	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_leave", "page_url": "http://localhost:8082/admin/warehouse", "referrer": "http://localhost:8082/admin/warehouse", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T04:12:21.645Z", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 1058, "session_duration": 1131831}	a0598c74-2275-4bda-98d1-d9e948947176	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/admin/warehouse	2025-07-28 04:12:21.692236+00	2025-07-28 04:12:21.692236+00
d76e6a2a-5828-467f-9ee2-9d0f06d060ec	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_leave", "page_url": "http://localhost:8082/admin/shipping-routes", "referrer": "http://localhost:8082/admin/shipping-routes", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T04:12:21.655Z", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 1058, "session_duration": 2937924}	b87ac5b3-d75e-436b-93b9-351198e044ab	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/admin/shipping-routes	2025-07-28 04:12:21.692232+00	2025-07-28 04:12:21.692232+00
759141df-1820-4456-9e29-acb2ceac429d	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_leave", "page_url": "http://localhost:8082/dashboard/package-forwarding", "referrer": "http://localhost:8082/admin/warehouse", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T04:12:21.639Z", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 637, "session_duration": 503168}	3fd89cd6-0ef5-408f-b703-b78585281411	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/admin/warehouse	2025-07-28 04:12:21.69233+00	2025-07-28 04:12:21.69233+00
0213b7db-e3c2-45c9-ae72-ffb8d81f671e	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/admin/warehouse", "referrer": "http://localhost:8082/admin/warehouse", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T04:12:23.480Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 1058, "session_duration": 1133666}	a0598c74-2275-4bda-98d1-d9e948947176	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/admin/warehouse	2025-07-28 04:12:23.861084+00	2025-07-28 04:12:23.861084+00
b3b30233-07b9-43ab-9906-130f07795cdd	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/admin/shipping-routes", "referrer": "http://localhost:8082/admin/shipping-routes", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T04:12:23.942Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 1058, "session_duration": 2940211}	b87ac5b3-d75e-436b-93b9-351198e044ab	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/admin/shipping-routes	2025-07-28 04:12:26.115756+00	2025-07-28 04:12:26.115756+00
e6fc6f92-5492-4ea0-b265-f7b39aeba25d	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/dashboard/package-forwarding", "referrer": "http://localhost:8082/dashboard/package-forwarding", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T04:12:25.727Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 637, "session_duration": 507256}	3fd89cd6-0ef5-408f-b703-b78585281411	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/dashboard/package-forwarding	2025-07-28 04:12:26.151935+00	2025-07-28 04:12:26.151935+00
754990fe-9582-4ecc-ade2-80f87393e972	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/admin/warehouse", "referrer": "http://localhost:8082/admin/warehouse", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T04:25:04.122Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 1058, "session_duration": 1894308}	a0598c74-2275-4bda-98d1-d9e948947176	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/admin/warehouse	2025-07-28 04:25:04.239679+00	2025-07-28 04:25:04.239679+00
75716b64-df0a-4e94-b219-f3e7a790ef33	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/dashboard/package-forwarding", "referrer": "http://localhost:8082/dashboard/package-forwarding", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T04:25:04.139Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 637, "session_duration": 1265668}	3fd89cd6-0ef5-408f-b703-b78585281411	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/dashboard/package-forwarding	2025-07-28 04:25:04.248784+00	2025-07-28 04:25:04.248784+00
9a78f0f7-33e3-4cff-8f8d-bddc63f2c493	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/admin/shipping-routes", "referrer": "http://localhost:8082/admin/shipping-routes", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T04:25:04.176Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 1058, "session_duration": 3700445}	b87ac5b3-d75e-436b-93b9-351198e044ab	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/admin/shipping-routes	2025-07-28 04:25:04.262847+00	2025-07-28 04:25:04.262847+00
5faa056d-6bf4-46d5-bed6-ac3a00af3c81	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_leave", "page_url": "http://localhost:8082/admin/warehouse", "referrer": "http://localhost:8082/admin/warehouse", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T04:28:01.132Z", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 1058, "session_duration": 2071318}	a0598c74-2275-4bda-98d1-d9e948947176	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/admin/warehouse	2025-07-28 04:28:01.136097+00	2025-07-28 04:28:01.136097+00
e52f9e8f-f898-43b0-995a-8042603ede93	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/admin/warehouse", "referrer": "http://localhost:8082/admin/warehouse", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T04:28:01.508Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 1058, "session_duration": 2071694}	a0598c74-2275-4bda-98d1-d9e948947176	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/admin/warehouse	2025-07-28 04:28:01.534264+00	2025-07-28 04:28:01.534264+00
c803d6c1-4c42-4487-8d29-e180bc8bedbc	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_leave", "page_url": "http://localhost:8082/admin/quotes/90f27902-f357-4071-802b-ae7cb96d8b8f", "referrer": "http://localhost:8082/admin/warehouse", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T04:31:59.805Z", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 1058, "session_duration": 2309991}	a0598c74-2275-4bda-98d1-d9e948947176	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/admin/warehouse	2025-07-28 04:31:59.808352+00	2025-07-28 04:31:59.808352+00
4823a258-5915-4690-8ace-8b444a1039c9	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/admin/quotes/90f27902-f357-4071-802b-ae7cb96d8b8f", "referrer": "http://localhost:8082/admin/warehouse", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T04:32:00.156Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 1058, "session_duration": 2310342}	a0598c74-2275-4bda-98d1-d9e948947176	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/admin/warehouse	2025-07-28 04:32:00.17593+00	2025-07-28 04:32:00.17593+00
60fd8598-5c24-427c-9424-5f1b5531892d	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/quote", "referrer": "http://localhost:8082/admin/quotes/90f27902-f357-4071-802b-ae7cb96d8b8f", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T04:32:51.652Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 1058, "session_duration": 2361838}	a0598c74-2275-4bda-98d1-d9e948947176	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/admin/quotes/90f27902-f357-4071-802b-ae7cb96d8b8f	2025-07-28 04:32:51.730872+00	2025-07-28 04:32:51.730872+00
a06238a4-24a5-4fad-9075-61a9349fc374	65382938-763f-4e70-81c2-b8913d198b0c	quote:create_start	{"step": "product_info", "page_url": "http://localhost:8082/quote", "referrer": "http://localhost:8082/admin/quotes/90f27902-f357-4071-802b-ae7cb96d8b8f", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T04:32:51.753Z", "user_type": "registered", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 1058, "session_duration": 2361939}	a0598c74-2275-4bda-98d1-d9e948947176	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/admin/quotes/90f27902-f357-4071-802b-ae7cb96d8b8f	2025-07-28 04:32:51.763325+00	2025-07-28 04:32:51.763325+00
721f761f-ef23-4856-a13c-78300d23c5e8	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_leave", "page_url": "http://localhost:8082/admin/quotes/90f27902-f357-4071-802b-ae7cb96d8b8f", "referrer": "http://localhost:8082/admin/warehouse", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T04:33:10.091Z", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 1058, "session_duration": 2380277}	a0598c74-2275-4bda-98d1-d9e948947176	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/admin/warehouse	2025-07-28 04:33:10.094946+00	2025-07-28 04:33:10.094946+00
07111960-4824-48b5-80ea-14dda84906e9	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/admin/quotes/90f27902-f357-4071-802b-ae7cb96d8b8f", "referrer": "http://localhost:8082/admin/warehouse", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T04:33:10.347Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 1058, "session_duration": 2380533}	a0598c74-2275-4bda-98d1-d9e948947176	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/admin/warehouse	2025-07-28 04:33:10.363166+00	2025-07-28 04:33:10.363166+00
1489b72e-2fa6-48c7-8bd9-da7aab939804	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_leave", "page_url": "http://localhost:8082/admin/quotes/90f27902-f357-4071-802b-ae7cb96d8b8f", "referrer": "http://localhost:8082/admin/warehouse", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T04:34:01.118Z", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 1058, "session_duration": 2431304}	a0598c74-2275-4bda-98d1-d9e948947176	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/admin/warehouse	2025-07-28 04:34:01.12295+00	2025-07-28 04:34:01.12295+00
8ff8df8e-99ce-4861-b88a-d04f2014b748	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/admin/quotes/90f27902-f357-4071-802b-ae7cb96d8b8f", "referrer": "http://localhost:8082/admin/warehouse", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T04:34:01.383Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 1058, "session_duration": 2431569}	a0598c74-2275-4bda-98d1-d9e948947176	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/admin/warehouse	2025-07-28 04:34:01.414007+00	2025-07-28 04:34:01.414007+00
dc206965-4e77-4745-8301-b300a7a37c45	65382938-763f-4e70-81c2-b8913d198b0c	page:view	{"action": "page_enter", "page_url": "http://localhost:8082/admin/quotes/90f27902-f357-4071-802b-ae7cb96d8b8f", "referrer": "http://localhost:8082/admin/warehouse", "timezone": "Asia/Katmandu", "timestamp": "2025-07-28T04:34:21.819Z", "page_title": "iWishBag Shop Internationally", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36", "viewport_width": 1869, "viewport_height": 1058, "session_duration": 2452005}	a0598c74-2275-4bda-98d1-d9e948947176	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	http://localhost:8082/admin/warehouse	2025-07-28 04:34:21.838677+00	2025-07-28 04:34:21.838677+00
\.


--
-- Data for Name: user_addresses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_addresses (id, user_id, address_line1, address_line2, city, state_province_region, postal_code, is_default, created_at, updated_at, phone, recipient_name, country, destination_country, save_to_profile) FROM stdin;
\.


--
-- Data for Name: user_oauth_data; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_oauth_data (id, user_id, provider, oauth_data, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_roles (id, user_id, role, is_active, created_by, created_at, updated_at, granted_by) FROM stdin;
98cbc975-2336-4b86-b519-d97c6297bae0	f0805d37-af44-47ab-84c5-595a086687cc	user	t	f0805d37-af44-47ab-84c5-595a086687cc	2025-07-28 01:30:11.351114+00	2025-07-28 01:30:11.351114+00	\N
7dbb1d6a-836c-4d71-8f00-65199e1b365f	e8f8a42f-012b-4811-8339-838593d84e95	user	t	e8f8a42f-012b-4811-8339-838593d84e95	2025-07-28 01:30:11.351114+00	2025-07-28 01:30:11.351114+00	\N
e9d48d20-f3d8-4725-90cb-98506b0804c3	3086af30-6e93-4b55-bd74-c901b519116c	user	t	3086af30-6e93-4b55-bd74-c901b519116c	2025-07-28 01:30:11.351114+00	2025-07-28 01:30:11.351114+00	\N
763f7705-b4db-487d-bb97-77072545c3cc	65382938-763f-4e70-81c2-b8913d198b0c	admin	t	65382938-763f-4e70-81c2-b8913d198b0c	2025-07-28 01:30:11.351114+00	2025-07-28 01:32:34.644156+00	\N
\.


--
-- Data for Name: warehouse_locations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.warehouse_locations (id, location_code, zone, shelf_number, slot_number, max_packages, current_packages, max_weight_kg, max_dimensions, is_active, maintenance_notes, created_at, updated_at) FROM stdin;
279d3d64-eded-4fbd-a5a0-461acab545ed	A01	A	1	1	5	0	50.00	\N	t	\N	2025-07-27 19:26:44.269123+00	2025-07-27 19:26:44.269123+00
f88041d8-460d-4808-a1e9-802bcfff0177	A02	A	1	2	5	0	50.00	\N	t	\N	2025-07-27 19:26:44.269123+00	2025-07-27 19:26:44.269123+00
75b0203c-3eca-4196-9c9a-af9f6a349a60	A03	A	1	3	5	0	50.00	\N	t	\N	2025-07-27 19:26:44.269123+00	2025-07-27 19:26:44.269123+00
ec94b775-0fb5-482e-88f3-0b5bd675d7f1	A04	A	1	4	5	0	50.00	\N	t	\N	2025-07-27 19:26:44.269123+00	2025-07-27 19:26:44.269123+00
fedc1eda-8748-483a-a791-adbaff2a984b	A05	A	1	5	5	0	50.00	\N	t	\N	2025-07-27 19:26:44.269123+00	2025-07-27 19:26:44.269123+00
6054264f-608e-4591-8957-ac70876ada1c	A06	A	2	1	5	0	50.00	\N	t	\N	2025-07-27 19:26:44.269123+00	2025-07-27 19:26:44.269123+00
d0d533ef-a932-42ee-95f4-b8e507d89eec	A07	A	2	2	5	0	50.00	\N	t	\N	2025-07-27 19:26:44.269123+00	2025-07-27 19:26:44.269123+00
1304ed9f-f980-4099-83a1-f0ef3414e729	A08	A	2	3	5	0	50.00	\N	t	\N	2025-07-27 19:26:44.269123+00	2025-07-27 19:26:44.269123+00
166fadbb-3889-4663-b19d-2d03c5bf44d8	A09	A	2	4	5	0	50.00	\N	t	\N	2025-07-27 19:26:44.269123+00	2025-07-27 19:26:44.269123+00
224e61e2-851f-450e-aedd-bcbbb6c06446	A10	A	2	5	5	0	50.00	\N	t	\N	2025-07-27 19:26:44.269123+00	2025-07-27 19:26:44.269123+00
14080561-7885-4794-85a6-2590c97c3220	B01	B	3	1	5	0	50.00	\N	t	\N	2025-07-27 19:26:44.269123+00	2025-07-27 19:26:44.269123+00
3d36efbf-6e2f-4506-b66d-0316f4f53a91	B02	B	3	2	5	0	50.00	\N	t	\N	2025-07-27 19:26:44.269123+00	2025-07-27 19:26:44.269123+00
72b38d73-0a81-47ef-bf18-e8393b5b24d9	B03	B	3	3	5	0	50.00	\N	t	\N	2025-07-27 19:26:44.269123+00	2025-07-27 19:26:44.269123+00
142fb433-3329-4262-8c17-2456080b703e	B04	B	3	4	5	0	50.00	\N	t	\N	2025-07-27 19:26:44.269123+00	2025-07-27 19:26:44.269123+00
6d591f69-aca3-4748-80fd-7d93f9b818b5	B05	B	3	5	5	0	50.00	\N	t	\N	2025-07-27 19:26:44.269123+00	2025-07-27 19:26:44.269123+00
4195aa28-493d-4769-acd7-01e0a2a898d4	B06	B	4	1	5	0	50.00	\N	t	\N	2025-07-27 19:26:44.269123+00	2025-07-27 19:26:44.269123+00
5b8c8e0d-86ac-4e94-bfdb-ec901bb507ca	B07	B	4	2	5	0	50.00	\N	t	\N	2025-07-27 19:26:44.269123+00	2025-07-27 19:26:44.269123+00
9230f102-4f7f-4e60-a748-91809cdf9684	B08	B	4	3	5	0	50.00	\N	t	\N	2025-07-27 19:26:44.269123+00	2025-07-27 19:26:44.269123+00
f0d3aa6f-fb82-4746-b0d4-2a743dbcfbfd	B09	B	4	4	5	0	50.00	\N	t	\N	2025-07-27 19:26:44.269123+00	2025-07-27 19:26:44.269123+00
4838cfd9-1a63-4c58-bbfc-1c0fc68ccdf4	B10	B	4	5	5	0	50.00	\N	t	\N	2025-07-27 19:26:44.269123+00	2025-07-27 19:26:44.269123+00
23e79b38-fdc7-4d90-a0c5-2f28b86a7c60	C01	C	5	1	5	0	50.00	\N	t	\N	2025-07-27 19:26:44.269123+00	2025-07-27 19:26:44.269123+00
898c5b57-fb77-4fe5-b83b-42a6a841de48	C02	C	5	2	5	0	50.00	\N	t	\N	2025-07-27 19:26:44.269123+00	2025-07-27 19:26:44.269123+00
80d9bd00-b098-4e14-aaa5-e09d460453bd	C03	C	5	3	5	0	50.00	\N	t	\N	2025-07-27 19:26:44.269123+00	2025-07-27 19:26:44.269123+00
6a2ae2f0-7331-4382-8c2c-b36797d9b4f5	C04	C	5	4	5	0	50.00	\N	t	\N	2025-07-27 19:26:44.269123+00	2025-07-27 19:26:44.269123+00
e6e32a87-a3ac-4cc2-97a4-a1df14d21615	C05	C	5	5	5	0	50.00	\N	t	\N	2025-07-27 19:26:44.269123+00	2025-07-27 19:26:44.269123+00
ce2098b9-797b-4a9c-9c2c-707b9c5968d2	C06	C	6	1	5	0	50.00	\N	t	\N	2025-07-27 19:26:44.269123+00	2025-07-27 19:26:44.269123+00
8c7f7f9f-c142-47df-bbcc-c584eb554947	C07	C	6	2	5	0	50.00	\N	t	\N	2025-07-27 19:26:44.269123+00	2025-07-27 19:26:44.269123+00
a623c85b-14a4-4b03-a156-bbd941cc05c4	C08	C	6	3	5	0	50.00	\N	t	\N	2025-07-27 19:26:44.269123+00	2025-07-27 19:26:44.269123+00
f9f080a0-ed3d-491c-8d79-79cfc3b31a2c	C09	C	6	4	5	0	50.00	\N	t	\N	2025-07-27 19:26:44.269123+00	2025-07-27 19:26:44.269123+00
c2d1d85c-3550-48f0-bc6c-8d231baeafa4	C10	C	6	5	5	0	50.00	\N	t	\N	2025-07-27 19:26:44.269123+00	2025-07-27 19:26:44.269123+00
a3629c29-e9b0-48f2-bd66-3be088b4d3a1	TEMP001	T	0	0	10	0	100.00	\N	t	\N	2025-07-27 19:26:44.269123+00	2025-07-27 19:26:44.269123+00
9637bfa2-b0ea-4955-b7bc-284d52546f0f	TEMP002	T	0	0	10	0	100.00	\N	t	\N	2025-07-27 19:26:44.269123+00	2025-07-27 19:26:44.269123+00
\.


--
-- Data for Name: warehouse_tasks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.warehouse_tasks (id, task_type, priority, description, instructions, package_ids, consolidation_group_id, assigned_to, due_date, status, completed_at, completion_notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: webhook_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.webhook_logs (id, request_id, webhook_type, status, user_agent, error_message, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: supabase_migrations; Owner: postgres
--

COPY supabase_migrations.schema_migrations (version, statements, name) FROM stdin;
\.


--
-- Name: credit_note_number_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.credit_note_number_seq', 1, false);


--
-- Name: iwish_tracking_sequence; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.iwish_tracking_sequence', 1003, true);


--
-- Name: mfa_activity_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.mfa_activity_log_id_seq', 11, true);


--
-- Name: quote_address_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.quote_address_history_id_seq', 1, false);


--
-- Name: quote_statuses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.quote_statuses_id_seq', 1, false);


--
-- Name: shipping_routes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.shipping_routes_id_seq', 7, true);


--
-- Name: suite_number_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.suite_number_seq', 10002, true);


--
-- Name: extensions extensions_pkey; Type: CONSTRAINT; Schema: _realtime; Owner: supabase_admin
--

ALTER TABLE ONLY _realtime.extensions
    ADD CONSTRAINT extensions_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: _realtime; Owner: supabase_admin
--

ALTER TABLE ONLY _realtime.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: _realtime; Owner: supabase_admin
--

ALTER TABLE ONLY _realtime.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: admin_overrides admin_overrides_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_overrides
    ADD CONSTRAINT admin_overrides_pkey PRIMARY KEY (id);


--
-- Name: authenticated_checkout_sessions authenticated_checkout_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.authenticated_checkout_sessions
    ADD CONSTRAINT authenticated_checkout_sessions_pkey PRIMARY KEY (id);


--
-- Name: authenticated_checkout_sessions authenticated_checkout_sessions_session_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.authenticated_checkout_sessions
    ADD CONSTRAINT authenticated_checkout_sessions_session_token_key UNIQUE (session_token);


--
-- Name: bank_account_details bank_account_details_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_account_details
    ADD CONSTRAINT bank_account_details_pkey PRIMARY KEY (id);


--
-- Name: bank_statement_imports bank_statement_imports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_statement_imports
    ADD CONSTRAINT bank_statement_imports_pkey PRIMARY KEY (id);


--
-- Name: blog_categories blog_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blog_categories
    ADD CONSTRAINT blog_categories_pkey PRIMARY KEY (id);


--
-- Name: blog_categories blog_categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blog_categories
    ADD CONSTRAINT blog_categories_slug_key UNIQUE (slug);


--
-- Name: blog_comments blog_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blog_comments
    ADD CONSTRAINT blog_comments_pkey PRIMARY KEY (id);


--
-- Name: blog_post_tags blog_post_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blog_post_tags
    ADD CONSTRAINT blog_post_tags_pkey PRIMARY KEY (id);


--
-- Name: blog_post_tags blog_post_tags_post_id_tag_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blog_post_tags
    ADD CONSTRAINT blog_post_tags_post_id_tag_id_key UNIQUE (post_id, tag_id);


--
-- Name: blog_posts blog_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_pkey PRIMARY KEY (id);


--
-- Name: blog_posts blog_posts_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_slug_key UNIQUE (slug);


--
-- Name: blog_tags blog_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blog_tags
    ADD CONSTRAINT blog_tags_pkey PRIMARY KEY (id);


--
-- Name: blog_tags blog_tags_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blog_tags
    ADD CONSTRAINT blog_tags_slug_key UNIQUE (slug);


--
-- Name: chart_of_accounts chart_of_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chart_of_accounts
    ADD CONSTRAINT chart_of_accounts_pkey PRIMARY KEY (code);


--
-- Name: consolidation_groups consolidation_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consolidation_groups
    ADD CONSTRAINT consolidation_groups_pkey PRIMARY KEY (id);


--
-- Name: country_payment_preferences country_payment_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.country_payment_preferences
    ADD CONSTRAINT country_payment_preferences_pkey PRIMARY KEY (id);


--
-- Name: country_settings country_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.country_settings
    ADD CONSTRAINT country_settings_pkey PRIMARY KEY (code);


--
-- Name: credit_note_applications credit_note_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.credit_note_applications
    ADD CONSTRAINT credit_note_applications_pkey PRIMARY KEY (id);


--
-- Name: credit_note_history credit_note_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.credit_note_history
    ADD CONSTRAINT credit_note_history_pkey PRIMARY KEY (id);


--
-- Name: credit_notes credit_notes_note_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.credit_notes
    ADD CONSTRAINT credit_notes_note_number_key UNIQUE (note_number);


--
-- Name: credit_notes credit_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.credit_notes
    ADD CONSTRAINT credit_notes_pkey PRIMARY KEY (id);


--
-- Name: customer_addresses customer_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_addresses
    ADD CONSTRAINT customer_addresses_pkey PRIMARY KEY (id);


--
-- Name: customer_addresses customer_addresses_suite_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_addresses
    ADD CONSTRAINT customer_addresses_suite_number_key UNIQUE (suite_number);


--
-- Name: customs_categories customs_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customs_categories
    ADD CONSTRAINT customs_categories_name_key UNIQUE (name);


--
-- Name: customs_categories customs_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customs_categories
    ADD CONSTRAINT customs_categories_pkey PRIMARY KEY (id);


--
-- Name: customs_rules customs_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customs_rules
    ADD CONSTRAINT customs_rules_pkey PRIMARY KEY (id);


--
-- Name: email_queue email_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_queue
    ADD CONSTRAINT email_queue_pkey PRIMARY KEY (id);


--
-- Name: email_settings email_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_settings
    ADD CONSTRAINT email_settings_pkey PRIMARY KEY (id);


--
-- Name: email_settings email_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_settings
    ADD CONSTRAINT email_settings_setting_key_key UNIQUE (setting_key);


--
-- Name: email_templates email_templates_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_name_key UNIQUE (name);


--
-- Name: email_templates email_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_pkey PRIMARY KEY (id);


--
-- Name: financial_transactions financial_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.financial_transactions
    ADD CONSTRAINT financial_transactions_pkey PRIMARY KEY (id);


--
-- Name: gateway_refunds gateway_refunds_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gateway_refunds
    ADD CONSTRAINT gateway_refunds_pkey PRIMARY KEY (id);


--
-- Name: global_tax_method_preferences global_tax_method_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.global_tax_method_preferences
    ADD CONSTRAINT global_tax_method_preferences_pkey PRIMARY KEY (id);


--
-- Name: global_tax_method_preferences global_tax_method_preferences_preference_scope_scope_identi_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.global_tax_method_preferences
    ADD CONSTRAINT global_tax_method_preferences_preference_scope_scope_identi_key UNIQUE (preference_scope, scope_identifier);


--
-- Name: guest_checkout_sessions guest_checkout_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.guest_checkout_sessions
    ADD CONSTRAINT guest_checkout_sessions_pkey PRIMARY KEY (id);


--
-- Name: guest_checkout_sessions guest_checkout_sessions_session_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.guest_checkout_sessions
    ADD CONSTRAINT guest_checkout_sessions_session_token_key UNIQUE (session_token);


--
-- Name: hsn_master hsn_master_hsn_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hsn_master
    ADD CONSTRAINT hsn_master_hsn_code_key UNIQUE (hsn_code);


--
-- Name: hsn_master hsn_master_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hsn_master
    ADD CONSTRAINT hsn_master_pkey PRIMARY KEY (id);


--
-- Name: manual_analysis_tasks manual_analysis_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.manual_analysis_tasks
    ADD CONSTRAINT manual_analysis_tasks_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: mfa_activity_log mfa_activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mfa_activity_log
    ADD CONSTRAINT mfa_activity_log_pkey PRIMARY KEY (id);


--
-- Name: mfa_configurations mfa_configurations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mfa_configurations
    ADD CONSTRAINT mfa_configurations_pkey PRIMARY KEY (id);


--
-- Name: mfa_configurations mfa_configurations_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mfa_configurations
    ADD CONSTRAINT mfa_configurations_user_id_key UNIQUE (user_id);


--
-- Name: mfa_sessions mfa_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mfa_sessions
    ADD CONSTRAINT mfa_sessions_pkey PRIMARY KEY (id);


--
-- Name: mfa_sessions mfa_sessions_session_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mfa_sessions
    ADD CONSTRAINT mfa_sessions_session_token_key UNIQUE (session_token);


--
-- Name: ml_category_weights ml_category_weights_category_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ml_category_weights
    ADD CONSTRAINT ml_category_weights_category_key UNIQUE (category);


--
-- Name: ml_category_weights ml_category_weights_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ml_category_weights
    ADD CONSTRAINT ml_category_weights_pkey PRIMARY KEY (id);


--
-- Name: ml_product_weights ml_product_weights_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ml_product_weights
    ADD CONSTRAINT ml_product_weights_pkey PRIMARY KEY (id);


--
-- Name: ml_training_history ml_training_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ml_training_history
    ADD CONSTRAINT ml_training_history_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: oauth_tokens oauth_tokens_gateway_code_client_id_scope_is_active_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.oauth_tokens
    ADD CONSTRAINT oauth_tokens_gateway_code_client_id_scope_is_active_key UNIQUE (gateway_code, client_id, scope, is_active) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: oauth_tokens oauth_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.oauth_tokens
    ADD CONSTRAINT oauth_tokens_pkey PRIMARY KEY (id);


--
-- Name: package_events package_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.package_events
    ADD CONSTRAINT package_events_pkey PRIMARY KEY (id);


--
-- Name: package_notifications package_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.package_notifications
    ADD CONSTRAINT package_notifications_pkey PRIMARY KEY (id);


--
-- Name: package_photos package_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.package_photos
    ADD CONSTRAINT package_photos_pkey PRIMARY KEY (id);


--
-- Name: payment_adjustments payment_adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_adjustments
    ADD CONSTRAINT payment_adjustments_pkey PRIMARY KEY (id);


--
-- Name: payment_alert_thresholds payment_alert_thresholds_metric_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_alert_thresholds
    ADD CONSTRAINT payment_alert_thresholds_metric_name_key UNIQUE (metric_name);


--
-- Name: payment_alert_thresholds payment_alert_thresholds_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_alert_thresholds
    ADD CONSTRAINT payment_alert_thresholds_pkey PRIMARY KEY (id);


--
-- Name: payment_error_logs payment_error_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_error_logs
    ADD CONSTRAINT payment_error_logs_pkey PRIMARY KEY (id);


--
-- Name: payment_gateways payment_gateways_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_gateways
    ADD CONSTRAINT payment_gateways_code_key UNIQUE (code);


--
-- Name: payment_gateways payment_gateways_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_gateways
    ADD CONSTRAINT payment_gateways_pkey PRIMARY KEY (id);


--
-- Name: payment_health_logs payment_health_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_health_logs
    ADD CONSTRAINT payment_health_logs_pkey PRIMARY KEY (id);


--
-- Name: payment_ledger payment_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_ledger
    ADD CONSTRAINT payment_ledger_pkey PRIMARY KEY (id);


--
-- Name: payment_links payment_links_link_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_links
    ADD CONSTRAINT payment_links_link_code_key UNIQUE (link_code);


--
-- Name: payment_links payment_links_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_links
    ADD CONSTRAINT payment_links_pkey PRIMARY KEY (id);


--
-- Name: payment_reconciliation payment_reconciliation_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_reconciliation
    ADD CONSTRAINT payment_reconciliation_pkey PRIMARY KEY (id);


--
-- Name: payment_reminders payment_reminders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_reminders
    ADD CONSTRAINT payment_reminders_pkey PRIMARY KEY (id);


--
-- Name: payment_transactions payment_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_pkey PRIMARY KEY (id);


--
-- Name: payment_verification_logs payment_verification_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_verification_logs
    ADD CONSTRAINT payment_verification_logs_pkey PRIMARY KEY (id);


--
-- Name: paypal_refund_reasons paypal_refund_reasons_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paypal_refund_reasons
    ADD CONSTRAINT paypal_refund_reasons_pkey PRIMARY KEY (code);


--
-- Name: paypal_refunds paypal_refunds_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paypal_refunds
    ADD CONSTRAINT paypal_refunds_pkey PRIMARY KEY (id);


--
-- Name: paypal_refunds paypal_refunds_refund_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paypal_refunds
    ADD CONSTRAINT paypal_refunds_refund_id_key UNIQUE (refund_id);


--
-- Name: paypal_webhook_events paypal_webhook_events_event_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paypal_webhook_events
    ADD CONSTRAINT paypal_webhook_events_event_id_key UNIQUE (event_id);


--
-- Name: paypal_webhook_events paypal_webhook_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paypal_webhook_events
    ADD CONSTRAINT paypal_webhook_events_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_referral_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_referral_code_key UNIQUE (referral_code);


--
-- Name: quote_address_history quote_address_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quote_address_history
    ADD CONSTRAINT quote_address_history_pkey PRIMARY KEY (id);


--
-- Name: quote_documents quote_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quote_documents
    ADD CONSTRAINT quote_documents_pkey PRIMARY KEY (id);


--
-- Name: quote_items quote_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quote_items
    ADD CONSTRAINT quote_items_pkey PRIMARY KEY (id);


--
-- Name: quote_statuses quote_statuses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quote_statuses
    ADD CONSTRAINT quote_statuses_pkey PRIMARY KEY (id);


--
-- Name: quote_statuses quote_statuses_value_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quote_statuses
    ADD CONSTRAINT quote_statuses_value_key UNIQUE (value);


--
-- Name: quote_templates quote_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quote_templates
    ADD CONSTRAINT quote_templates_pkey PRIMARY KEY (id);


--
-- Name: quotes quotes_iwish_tracking_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_iwish_tracking_id_key UNIQUE (iwish_tracking_id);


--
-- Name: quotes quotes_unified_display_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_unified_display_id_key UNIQUE (display_id);


--
-- Name: quotes quotes_unified_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_unified_pkey PRIMARY KEY (id);


--
-- Name: received_packages received_packages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.received_packages
    ADD CONSTRAINT received_packages_pkey PRIMARY KEY (id);


--
-- Name: reconciliation_items reconciliation_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reconciliation_items
    ADD CONSTRAINT reconciliation_items_pkey PRIMARY KEY (id);


--
-- Name: reconciliation_rules reconciliation_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reconciliation_rules
    ADD CONSTRAINT reconciliation_rules_pkey PRIMARY KEY (id);


--
-- Name: refund_items refund_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refund_items
    ADD CONSTRAINT refund_items_pkey PRIMARY KEY (id);


--
-- Name: refund_requests refund_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refund_requests
    ADD CONSTRAINT refund_requests_pkey PRIMARY KEY (id);


--
-- Name: rejection_reasons rejection_reasons_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rejection_reasons
    ADD CONSTRAINT rejection_reasons_pkey PRIMARY KEY (id);


--
-- Name: route_customs_tiers route_customs_tiers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.route_customs_tiers
    ADD CONSTRAINT route_customs_tiers_pkey PRIMARY KEY (id);


--
-- Name: share_audit_log share_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.share_audit_log
    ADD CONSTRAINT share_audit_log_pkey PRIMARY KEY (id);


--
-- Name: shipping_routes shipping_routes_origin_country_destination_country_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipping_routes
    ADD CONSTRAINT shipping_routes_origin_country_destination_country_key UNIQUE (origin_country, destination_country);


--
-- Name: shipping_routes shipping_routes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipping_routes
    ADD CONSTRAINT shipping_routes_pkey PRIMARY KEY (id);


--
-- Name: status_transitions status_transitions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.status_transitions
    ADD CONSTRAINT status_transitions_pkey PRIMARY KEY (id);


--
-- Name: storage_fees storage_fees_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage_fees
    ADD CONSTRAINT storage_fees_pkey PRIMARY KEY (id);


--
-- Name: support_interactions support_interactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_interactions
    ADD CONSTRAINT support_interactions_pkey PRIMARY KEY (id);


--
-- Name: support_system support_system_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_system
    ADD CONSTRAINT support_system_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_setting_key_key UNIQUE (setting_key);


--
-- Name: tax_calculation_audit_log tax_calculation_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tax_calculation_audit_log
    ADD CONSTRAINT tax_calculation_audit_log_pkey PRIMARY KEY (id);


--
-- Name: unified_configuration unified_configuration_config_type_config_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.unified_configuration
    ADD CONSTRAINT unified_configuration_config_type_config_key_key UNIQUE (config_type, config_key);


--
-- Name: unified_configuration unified_configuration_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.unified_configuration
    ADD CONSTRAINT unified_configuration_pkey PRIMARY KEY (id);


--
-- Name: country_payment_preferences unique_country_gateway; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.country_payment_preferences
    ADD CONSTRAINT unique_country_gateway UNIQUE (country_code, gateway_code);


--
-- Name: country_payment_preferences unique_country_priority; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.country_payment_preferences
    ADD CONSTRAINT unique_country_priority UNIQUE (country_code, priority);


--
-- Name: ml_product_weights unique_normalized_name; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ml_product_weights
    ADD CONSTRAINT unique_normalized_name UNIQUE (normalized_name);


--
-- Name: user_activity_analytics user_activity_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_activity_analytics
    ADD CONSTRAINT user_activity_analytics_pkey PRIMARY KEY (id);


--
-- Name: user_addresses user_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_addresses
    ADD CONSTRAINT user_addresses_pkey PRIMARY KEY (id);


--
-- Name: user_oauth_data user_oauth_data_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_oauth_data
    ADD CONSTRAINT user_oauth_data_pkey PRIMARY KEY (id);


--
-- Name: user_oauth_data user_oauth_data_user_id_provider_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_oauth_data
    ADD CONSTRAINT user_oauth_data_user_id_provider_key UNIQUE (user_id, provider);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: warehouse_locations warehouse_locations_location_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouse_locations
    ADD CONSTRAINT warehouse_locations_location_code_key UNIQUE (location_code);


--
-- Name: warehouse_locations warehouse_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouse_locations
    ADD CONSTRAINT warehouse_locations_pkey PRIMARY KEY (id);


--
-- Name: warehouse_tasks warehouse_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouse_tasks
    ADD CONSTRAINT warehouse_tasks_pkey PRIMARY KEY (id);


--
-- Name: webhook_logs webhook_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.webhook_logs
    ADD CONSTRAINT webhook_logs_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: supabase_migrations; Owner: postgres
--

ALTER TABLE ONLY supabase_migrations.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: extensions_tenant_external_id_index; Type: INDEX; Schema: _realtime; Owner: supabase_admin
--

CREATE INDEX extensions_tenant_external_id_index ON _realtime.extensions USING btree (tenant_external_id);


--
-- Name: extensions_tenant_external_id_type_index; Type: INDEX; Schema: _realtime; Owner: supabase_admin
--

CREATE UNIQUE INDEX extensions_tenant_external_id_type_index ON _realtime.extensions USING btree (tenant_external_id, type);


--
-- Name: tenants_external_id_index; Type: INDEX; Schema: _realtime; Owner: supabase_admin
--

CREATE UNIQUE INDEX tenants_external_id_index ON _realtime.tenants USING btree (external_id);


--
-- Name: idx_admin_overrides_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admin_overrides_active ON public.admin_overrides USING btree (is_active);


--
-- Name: idx_admin_overrides_expires; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admin_overrides_expires ON public.admin_overrides USING btree (expires_at);


--
-- Name: idx_admin_overrides_scope; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admin_overrides_scope ON public.admin_overrides USING btree (scope, scope_identifier);


--
-- Name: idx_admin_overrides_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admin_overrides_type ON public.admin_overrides USING btree (override_type);


--
-- Name: idx_authenticated_checkout_sessions_expires_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_authenticated_checkout_sessions_expires_at ON public.authenticated_checkout_sessions USING btree (expires_at);


--
-- Name: idx_authenticated_checkout_sessions_quote_ids; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_authenticated_checkout_sessions_quote_ids ON public.authenticated_checkout_sessions USING gin (quote_ids);


--
-- Name: idx_authenticated_checkout_sessions_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_authenticated_checkout_sessions_status ON public.authenticated_checkout_sessions USING btree (status);


--
-- Name: idx_authenticated_checkout_sessions_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_authenticated_checkout_sessions_token ON public.authenticated_checkout_sessions USING btree (session_token);


--
-- Name: idx_authenticated_checkout_sessions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_authenticated_checkout_sessions_user_id ON public.authenticated_checkout_sessions USING btree (user_id);


--
-- Name: idx_bank_account_details_country_currency; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bank_account_details_country_currency ON public.bank_account_details USING btree (country_code, currency_code);


--
-- Name: idx_bank_account_details_currency_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bank_account_details_currency_code ON public.bank_account_details USING btree (currency_code);


--
-- Name: idx_bank_account_details_destination_country; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bank_account_details_destination_country ON public.bank_account_details USING btree (destination_country);


--
-- Name: idx_bank_accounts_country; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bank_accounts_country ON public.bank_account_details USING btree (country_code);


--
-- Name: idx_bank_accounts_fallback; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bank_accounts_fallback ON public.bank_account_details USING btree (is_fallback);


--
-- Name: idx_bank_statement_imports_reconciliation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bank_statement_imports_reconciliation ON public.bank_statement_imports USING btree (reconciliation_id);


--
-- Name: idx_blog_categories_slug; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_blog_categories_slug ON public.blog_categories USING btree (slug);


--
-- Name: idx_blog_comments_parent_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_blog_comments_parent_id ON public.blog_comments USING btree (parent_id);


--
-- Name: idx_blog_comments_post_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_blog_comments_post_id ON public.blog_comments USING btree (post_id);


--
-- Name: idx_blog_comments_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_blog_comments_status ON public.blog_comments USING btree (status);


--
-- Name: idx_blog_posts_author; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_blog_posts_author ON public.blog_posts USING btree (author_id);


--
-- Name: idx_blog_posts_author_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_blog_posts_author_id ON public.blog_posts USING btree (author_id);


--
-- Name: idx_blog_posts_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_blog_posts_category ON public.blog_posts USING btree (category_id);


--
-- Name: idx_blog_posts_category_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_blog_posts_category_id ON public.blog_posts USING btree (category_id);


--
-- Name: idx_blog_posts_featured; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_blog_posts_featured ON public.blog_posts USING btree (featured);


--
-- Name: idx_blog_posts_published_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_blog_posts_published_at ON public.blog_posts USING btree (published_at);


--
-- Name: idx_blog_posts_slug; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_blog_posts_slug ON public.blog_posts USING btree (slug);


--
-- Name: idx_blog_posts_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_blog_posts_status ON public.blog_posts USING btree (status);


--
-- Name: idx_blog_tags_slug; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_blog_tags_slug ON public.blog_tags USING btree (slug);


--
-- Name: idx_consolidation_groups_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_consolidation_groups_status ON public.consolidation_groups USING btree (status);


--
-- Name: idx_consolidation_groups_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_consolidation_groups_user ON public.consolidation_groups USING btree (user_id);


--
-- Name: idx_country_payment_preferences_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_country_payment_preferences_active ON public.country_payment_preferences USING btree (is_active);


--
-- Name: idx_country_payment_preferences_country; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_country_payment_preferences_country ON public.country_payment_preferences USING btree (country_code);


--
-- Name: idx_country_payment_preferences_priority; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_country_payment_preferences_priority ON public.country_payment_preferences USING btree (country_code, priority);


--
-- Name: idx_country_settings_currency; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_country_settings_currency ON public.country_settings USING btree (currency);


--
-- Name: idx_country_settings_minimum_payment; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_country_settings_minimum_payment ON public.country_settings USING btree (minimum_payment_amount);


--
-- Name: idx_credit_note_applications_note; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_credit_note_applications_note ON public.credit_note_applications USING btree (credit_note_id);


--
-- Name: idx_credit_note_applications_quote; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_credit_note_applications_quote ON public.credit_note_applications USING btree (quote_id);


--
-- Name: idx_credit_note_applications_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_credit_note_applications_status ON public.credit_note_applications USING btree (status);


--
-- Name: idx_credit_note_history_action; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_credit_note_history_action ON public.credit_note_history USING btree (action);


--
-- Name: idx_credit_note_history_note; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_credit_note_history_note ON public.credit_note_history USING btree (credit_note_id);


--
-- Name: idx_credit_notes_customer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_credit_notes_customer ON public.credit_notes USING btree (customer_id);


--
-- Name: idx_credit_notes_quote; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_credit_notes_quote ON public.credit_notes USING btree (quote_id);


--
-- Name: idx_credit_notes_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_credit_notes_status ON public.credit_notes USING btree (status);


--
-- Name: idx_credit_notes_valid_dates; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_credit_notes_valid_dates ON public.credit_notes USING btree (valid_from, valid_until);


--
-- Name: idx_customer_addresses_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customer_addresses_status ON public.customer_addresses USING btree (status);


--
-- Name: idx_customer_addresses_suite_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customer_addresses_suite_number ON public.customer_addresses USING btree (suite_number);


--
-- Name: idx_customer_addresses_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customer_addresses_user_id ON public.customer_addresses USING btree (user_id);


--
-- Name: idx_customs_rules_priority; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customs_rules_priority ON public.customs_rules USING btree (priority);


--
-- Name: idx_customs_rules_route; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customs_rules_route ON public.customs_rules USING btree (origin_country, destination_country, is_active, priority);


--
-- Name: idx_email_queue_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_email_queue_status ON public.email_queue USING btree (status, created_at);


--
-- Name: idx_financial_transactions_accounts; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_financial_transactions_accounts ON public.financial_transactions USING btree (debit_account, credit_account);


--
-- Name: idx_financial_transactions_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_financial_transactions_date ON public.financial_transactions USING btree (transaction_date);


--
-- Name: idx_financial_transactions_reference; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_financial_transactions_reference ON public.financial_transactions USING btree (reference_type, reference_id);


--
-- Name: idx_financial_transactions_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_financial_transactions_status ON public.financial_transactions USING btree (status);


--
-- Name: idx_gateway_refunds_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gateway_refunds_date ON public.gateway_refunds USING btree (refund_date);


--
-- Name: idx_gateway_refunds_gateway; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gateway_refunds_gateway ON public.gateway_refunds USING btree (gateway_code);


--
-- Name: idx_gateway_refunds_gateway_refund_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gateway_refunds_gateway_refund_id ON public.gateway_refunds USING btree (gateway_refund_id);


--
-- Name: idx_gateway_refunds_quote; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gateway_refunds_quote ON public.gateway_refunds USING btree (quote_id);


--
-- Name: idx_gateway_refunds_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gateway_refunds_status ON public.gateway_refunds USING btree (status);


--
-- Name: idx_global_preferences_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_global_preferences_active ON public.global_tax_method_preferences USING btree (is_active);


--
-- Name: idx_global_preferences_scope; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_global_preferences_scope ON public.global_tax_method_preferences USING btree (preference_scope, scope_identifier);


--
-- Name: idx_guest_checkout_sessions_expires_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_guest_checkout_sessions_expires_at ON public.guest_checkout_sessions USING btree (expires_at);


--
-- Name: idx_guest_checkout_sessions_quote_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_guest_checkout_sessions_quote_id ON public.guest_checkout_sessions USING btree (quote_id);


--
-- Name: idx_guest_checkout_sessions_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_guest_checkout_sessions_status ON public.guest_checkout_sessions USING btree (status);


--
-- Name: idx_guest_checkout_sessions_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_guest_checkout_sessions_token ON public.guest_checkout_sessions USING btree (session_token);


--
-- Name: idx_hsn_master_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_hsn_master_active ON public.hsn_master USING btree (is_active);


--
-- Name: idx_hsn_master_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_hsn_master_category ON public.hsn_master USING btree (category);


--
-- Name: idx_hsn_master_category_subcategory; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_hsn_master_category_subcategory ON public.hsn_master USING btree (category, subcategory);


--
-- Name: idx_hsn_master_classification_data_gin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_hsn_master_classification_data_gin ON public.hsn_master USING gin (classification_data);


--
-- Name: idx_hsn_master_description_text; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_hsn_master_description_text ON public.hsn_master USING gin (to_tsvector('english'::regconfig, description));


--
-- Name: idx_hsn_master_hsn_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_hsn_master_hsn_code ON public.hsn_master USING btree (hsn_code);


--
-- Name: idx_hsn_master_keywords_gin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_hsn_master_keywords_gin ON public.hsn_master USING gin (keywords);


--
-- Name: idx_hsn_master_tax_data_gin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_hsn_master_tax_data_gin ON public.hsn_master USING gin (tax_data);


--
-- Name: idx_hsn_master_weight_data_gin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_hsn_master_weight_data_gin ON public.hsn_master USING gin (weight_data);


--
-- Name: idx_hsn_search_optimized_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_hsn_search_optimized_category ON public.hsn_search_optimized USING btree (category);


--
-- Name: idx_hsn_search_optimized_hsn_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_hsn_search_optimized_hsn_code ON public.hsn_search_optimized USING btree (hsn_code);


--
-- Name: idx_hsn_search_optimized_keywords_gin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_hsn_search_optimized_keywords_gin ON public.hsn_search_optimized USING gin (keywords);


--
-- Name: idx_hsn_search_optimized_search_priority; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_hsn_search_optimized_search_priority ON public.hsn_search_optimized USING btree (search_priority);


--
-- Name: idx_hsn_search_optimized_search_vector; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_hsn_search_optimized_search_vector ON public.hsn_search_optimized USING gin (search_vector);


--
-- Name: idx_manual_analysis_tasks_quote_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_manual_analysis_tasks_quote_id ON public.manual_analysis_tasks USING btree (quote_id);


--
-- Name: idx_manual_analysis_tasks_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_manual_analysis_tasks_status ON public.manual_analysis_tasks USING btree (status);


--
-- Name: idx_messages_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_created_at ON public.messages USING btree (created_at);


--
-- Name: idx_messages_message_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_message_type ON public.messages USING btree (message_type);


--
-- Name: idx_messages_payment_proof; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_payment_proof ON public.messages USING btree (quote_id, message_type) WHERE (message_type = 'payment_proof'::text);


--
-- Name: idx_messages_priority; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_priority ON public.messages USING btree (priority) WHERE ((priority)::text = ANY ((ARRAY['high'::character varying, 'urgent'::character varying])::text[]));


--
-- Name: idx_messages_quote_id_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_quote_id_created_at ON public.messages USING btree (quote_id, created_at DESC);


--
-- Name: idx_messages_quote_payment_proof; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_quote_payment_proof ON public.messages USING btree (quote_id, message_type) WHERE (message_type = 'payment_proof'::text);


--
-- Name: idx_messages_recipient_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_recipient_id ON public.messages USING btree (recipient_id);


--
-- Name: idx_messages_sender_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_sender_id ON public.messages USING btree (sender_id);


--
-- Name: idx_messages_sender_recipient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_sender_recipient ON public.messages USING btree (sender_id, recipient_id);


--
-- Name: idx_messages_thread_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_thread_type ON public.messages USING btree (thread_type);


--
-- Name: idx_messages_unread; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_unread ON public.messages USING btree (recipient_id, is_read) WHERE (is_read = false);


--
-- Name: idx_mfa_activity_log_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mfa_activity_log_created_at ON public.mfa_activity_log USING btree (created_at);


--
-- Name: idx_mfa_activity_log_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mfa_activity_log_user_id ON public.mfa_activity_log USING btree (user_id);


--
-- Name: idx_mfa_configurations_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mfa_configurations_user_id ON public.mfa_configurations USING btree (user_id);


--
-- Name: idx_mfa_sessions_expires; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mfa_sessions_expires ON public.mfa_sessions USING btree (expires_at);


--
-- Name: idx_mfa_sessions_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mfa_sessions_token ON public.mfa_sessions USING btree (session_token);


--
-- Name: idx_ml_category_weights_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ml_category_weights_category ON public.ml_category_weights USING btree (category);


--
-- Name: idx_ml_product_weights_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ml_product_weights_category ON public.ml_product_weights USING btree (category);


--
-- Name: idx_ml_product_weights_confidence; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ml_product_weights_confidence ON public.ml_product_weights USING btree (confidence DESC);


--
-- Name: idx_ml_product_weights_normalized_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ml_product_weights_normalized_name ON public.ml_product_weights USING btree (normalized_name);


--
-- Name: idx_ml_training_history_accuracy; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ml_training_history_accuracy ON public.ml_training_history USING btree (accuracy DESC);


--
-- Name: idx_ml_training_history_product; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ml_training_history_product ON public.ml_training_history USING btree (product_name);


--
-- Name: idx_ml_training_history_trained_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ml_training_history_trained_at ON public.ml_training_history USING btree (trained_at DESC);


--
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);


--
-- Name: idx_notifications_data_gin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_data_gin ON public.notifications USING gin (data);


--
-- Name: idx_notifications_expires_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_expires_at ON public.notifications USING btree (expires_at) WHERE (expires_at IS NOT NULL);


--
-- Name: idx_notifications_priority; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_priority ON public.notifications USING btree (priority);


--
-- Name: idx_notifications_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_type ON public.notifications USING btree (type);


--
-- Name: idx_notifications_unread; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_unread ON public.notifications USING btree (user_id, is_read, is_dismissed) WHERE ((is_read = false) AND (is_dismissed = false));


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_notifications_user_type_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_user_type_status ON public.notifications USING btree (user_id, type, is_read, is_dismissed);


--
-- Name: idx_notifications_user_unread_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_user_unread_active ON public.notifications USING btree (user_id, created_at DESC) WHERE ((is_read = false) AND (is_dismissed = false));


--
-- Name: idx_oauth_tokens_expiry; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_oauth_tokens_expiry ON public.oauth_tokens USING btree (expires_at) WHERE (is_active = true);


--
-- Name: idx_oauth_tokens_lookup; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_oauth_tokens_lookup ON public.oauth_tokens USING btree (gateway_code, client_id, scope, is_active);


--
-- Name: idx_package_events_consolidation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_package_events_consolidation ON public.package_events USING btree (consolidation_group_id);


--
-- Name: idx_package_events_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_package_events_created_at ON public.package_events USING btree (created_at);


--
-- Name: idx_package_events_package; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_package_events_package ON public.package_events USING btree (package_id);


--
-- Name: idx_package_events_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_package_events_type ON public.package_events USING btree (event_type);


--
-- Name: idx_package_notifications_is_read; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_package_notifications_is_read ON public.package_notifications USING btree (is_read);


--
-- Name: idx_package_notifications_package; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_package_notifications_package ON public.package_notifications USING btree (package_id);


--
-- Name: idx_package_notifications_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_package_notifications_type ON public.package_notifications USING btree (notification_type);


--
-- Name: idx_package_notifications_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_package_notifications_user ON public.package_notifications USING btree (user_id);


--
-- Name: idx_payment_adjustments_quote; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_adjustments_quote ON public.payment_adjustments USING btree (quote_id);


--
-- Name: idx_payment_adjustments_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_adjustments_status ON public.payment_adjustments USING btree (status);


--
-- Name: idx_payment_error_logs_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_error_logs_created_at ON public.payment_error_logs USING btree (created_at);


--
-- Name: idx_payment_error_logs_error_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_error_logs_error_code ON public.payment_error_logs USING btree (error_code);


--
-- Name: idx_payment_error_logs_gateway; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_error_logs_gateway ON public.payment_error_logs USING btree (gateway);


--
-- Name: idx_payment_error_logs_severity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_error_logs_severity ON public.payment_error_logs USING btree (severity);


--
-- Name: idx_payment_error_logs_transaction_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_error_logs_transaction_id ON public.payment_error_logs USING btree (transaction_id);


--
-- Name: idx_payment_error_logs_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_error_logs_user_id ON public.payment_error_logs USING btree (user_id);


--
-- Name: idx_payment_gateways_priority; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_gateways_priority ON public.payment_gateways USING btree (priority);


--
-- Name: idx_payment_health_logs_alert_count; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_health_logs_alert_count ON public.payment_health_logs USING btree (alert_count);


--
-- Name: idx_payment_health_logs_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_health_logs_created_at ON public.payment_health_logs USING btree (created_at);


--
-- Name: idx_payment_health_logs_overall_health; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_health_logs_overall_health ON public.payment_health_logs USING btree (overall_health);


--
-- Name: idx_payment_health_logs_success_rate; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_health_logs_success_rate ON public.payment_health_logs USING btree (success_rate);


--
-- Name: idx_payment_ledger_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_ledger_date ON public.payment_ledger USING btree (payment_date);


--
-- Name: idx_payment_ledger_gateway; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_ledger_gateway ON public.payment_ledger USING btree (gateway_code);


--
-- Name: idx_payment_ledger_method; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_ledger_method ON public.payment_ledger USING btree (payment_method);


--
-- Name: idx_payment_ledger_quote; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_ledger_quote ON public.payment_ledger USING btree (quote_id);


--
-- Name: idx_payment_ledger_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_ledger_status ON public.payment_ledger USING btree (status);


--
-- Name: idx_payment_links_api_version; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_links_api_version ON public.payment_links USING btree (api_version);


--
-- Name: idx_payment_links_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_links_created_at ON public.payment_links USING btree (created_at);


--
-- Name: idx_payment_links_customer_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_links_customer_email ON public.payment_links USING btree (customer_email);


--
-- Name: idx_payment_links_expires_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_links_expires_at ON public.payment_links USING btree (expires_at);


--
-- Name: idx_payment_links_gateway; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_links_gateway ON public.payment_links USING btree (gateway);


--
-- Name: idx_payment_links_gateway_link_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_links_gateway_link_id ON public.payment_links USING btree (gateway_link_id);


--
-- Name: idx_payment_links_gateway_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_links_gateway_status ON public.payment_links USING btree (gateway, status);


--
-- Name: idx_payment_links_link_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_links_link_code ON public.payment_links USING btree (link_code);


--
-- Name: idx_payment_links_quote_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_links_quote_id ON public.payment_links USING btree (quote_id);


--
-- Name: idx_payment_links_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_links_status ON public.payment_links USING btree (status);


--
-- Name: idx_payment_links_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_links_user_id ON public.payment_links USING btree (user_id);


--
-- Name: idx_payment_reconciliation_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_reconciliation_date ON public.payment_reconciliation USING btree (reconciliation_date);


--
-- Name: idx_payment_reconciliation_method; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_reconciliation_method ON public.payment_reconciliation USING btree (payment_method);


--
-- Name: idx_payment_reconciliation_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_reconciliation_status ON public.payment_reconciliation USING btree (status);


--
-- Name: idx_payment_transactions_paypal_capture; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_transactions_paypal_capture ON public.payment_transactions USING btree (paypal_capture_id) WHERE (paypal_capture_id IS NOT NULL);


--
-- Name: idx_payment_transactions_paypal_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_transactions_paypal_order ON public.payment_transactions USING btree (paypal_order_id) WHERE (paypal_order_id IS NOT NULL);


--
-- Name: idx_payment_transactions_quote_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_transactions_quote_id ON public.payment_transactions USING btree (quote_id);


--
-- Name: idx_payment_transactions_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_transactions_status ON public.payment_transactions USING btree (status);


--
-- Name: idx_payment_transactions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_transactions_user_id ON public.payment_transactions USING btree (user_id);


--
-- Name: idx_payment_verification_logs_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_verification_logs_created_at ON public.payment_verification_logs USING btree (created_at);


--
-- Name: idx_payment_verification_logs_gateway; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_verification_logs_gateway ON public.payment_verification_logs USING btree (gateway);


--
-- Name: idx_payment_verification_logs_request_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_verification_logs_request_id ON public.payment_verification_logs USING btree (request_id);


--
-- Name: idx_payment_verification_logs_success; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_verification_logs_success ON public.payment_verification_logs USING btree (success);


--
-- Name: idx_payment_verification_logs_transaction_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_verification_logs_transaction_id ON public.payment_verification_logs USING btree (transaction_id);


--
-- Name: idx_paypal_refunds_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_paypal_refunds_created ON public.paypal_refunds USING btree (created_at DESC);


--
-- Name: idx_paypal_refunds_original_transaction; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_paypal_refunds_original_transaction ON public.paypal_refunds USING btree (original_transaction_id);


--
-- Name: idx_paypal_refunds_payment_transaction; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_paypal_refunds_payment_transaction ON public.paypal_refunds USING btree (payment_transaction_id);


--
-- Name: idx_paypal_refunds_quote; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_paypal_refunds_quote ON public.paypal_refunds USING btree (quote_id);


--
-- Name: idx_paypal_refunds_refund_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_paypal_refunds_refund_id ON public.paypal_refunds USING btree (refund_id);


--
-- Name: idx_paypal_refunds_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_paypal_refunds_status ON public.paypal_refunds USING btree (status);


--
-- Name: idx_paypal_refunds_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_paypal_refunds_user ON public.paypal_refunds USING btree (user_id);


--
-- Name: idx_paypal_webhook_events_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_paypal_webhook_events_created ON public.paypal_webhook_events USING btree (created_at DESC);


--
-- Name: idx_paypal_webhook_events_event_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_paypal_webhook_events_event_id ON public.paypal_webhook_events USING btree (event_id);


--
-- Name: idx_paypal_webhook_events_resource; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_paypal_webhook_events_resource ON public.paypal_webhook_events USING btree (resource_type, resource_id);


--
-- Name: idx_profiles_country; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_profiles_country ON public.profiles USING btree (country);


--
-- Name: idx_profiles_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_profiles_email ON public.profiles USING btree (email);


--
-- Name: idx_profiles_referral_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_profiles_referral_code ON public.profiles USING btree (referral_code);


--
-- Name: idx_quote_address_history_changed_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quote_address_history_changed_at ON public.quote_address_history USING btree (changed_at);


--
-- Name: idx_quote_address_history_quote_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quote_address_history_quote_id ON public.quote_address_history USING btree (quote_id);


--
-- Name: idx_quote_documents_document_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quote_documents_document_type ON public.quote_documents USING btree (document_type);


--
-- Name: idx_quote_documents_quote_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quote_documents_quote_id ON public.quote_documents USING btree (quote_id);


--
-- Name: idx_quote_documents_uploaded_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quote_documents_uploaded_at ON public.quote_documents USING btree (uploaded_at DESC);


--
-- Name: idx_quote_documents_uploaded_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quote_documents_uploaded_by ON public.quote_documents USING btree (uploaded_by);


--
-- Name: idx_quote_items_quote_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quote_items_quote_id ON public.quote_items USING btree (quote_id);


--
-- Name: idx_quote_templates_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quote_templates_name ON public.quote_templates USING btree (template_name);


--
-- Name: idx_quotes_calculation_method; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quotes_calculation_method ON public.quotes USING btree (calculation_method_preference);


--
-- Name: idx_quotes_email_verified; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quotes_email_verified ON public.quotes USING btree (email_verified) WHERE (email_verified = false);


--
-- Name: idx_quotes_iwish_tracking_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quotes_iwish_tracking_id ON public.quotes USING btree (iwish_tracking_id);


--
-- Name: idx_quotes_shipping_carrier; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quotes_shipping_carrier ON public.quotes USING btree (shipping_carrier);


--
-- Name: idx_quotes_tracking_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quotes_tracking_number ON public.quotes USING btree (tracking_number);


--
-- Name: idx_quotes_tracking_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quotes_tracking_status ON public.quotes USING btree (tracking_status);


--
-- Name: idx_quotes_unified_calculation_data_gin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quotes_unified_calculation_data_gin ON public.quotes USING gin (calculation_data);


--
-- Name: idx_quotes_unified_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quotes_unified_created_at ON public.quotes USING btree (created_at);


--
-- Name: idx_quotes_unified_destination_country; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quotes_unified_destination_country ON public.quotes USING btree (destination_country);


--
-- Name: idx_quotes_unified_display_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quotes_unified_display_id ON public.quotes USING btree (display_id);


--
-- Name: idx_quotes_unified_items_gin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quotes_unified_items_gin ON public.quotes USING gin (items);


--
-- Name: idx_quotes_unified_operational_data_gin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quotes_unified_operational_data_gin ON public.quotes USING gin (operational_data);


--
-- Name: idx_quotes_unified_share_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quotes_unified_share_token ON public.quotes USING btree (share_token) WHERE (share_token IS NOT NULL);


--
-- Name: idx_quotes_unified_smart_suggestions_gin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quotes_unified_smart_suggestions_gin ON public.quotes USING gin (smart_suggestions);


--
-- Name: idx_quotes_unified_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quotes_unified_status ON public.quotes USING btree (status);


--
-- Name: idx_quotes_unified_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quotes_unified_user_id ON public.quotes USING btree (user_id);


--
-- Name: idx_quotes_valuation_method; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quotes_valuation_method ON public.quotes USING btree (valuation_method_preference);


--
-- Name: idx_quotes_verification_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quotes_verification_token ON public.quotes USING btree (verification_token) WHERE (verification_token IS NOT NULL);


--
-- Name: idx_received_packages_consolidation_group; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_received_packages_consolidation_group ON public.received_packages USING btree (consolidation_group_id);


--
-- Name: idx_received_packages_customer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_received_packages_customer ON public.received_packages USING btree (customer_address_id);


--
-- Name: idx_received_packages_received_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_received_packages_received_date ON public.received_packages USING btree (received_date);


--
-- Name: idx_received_packages_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_received_packages_status ON public.received_packages USING btree (status);


--
-- Name: idx_received_packages_storage_location; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_received_packages_storage_location ON public.received_packages USING btree (storage_location);


--
-- Name: idx_reconciliation_items_matched; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reconciliation_items_matched ON public.reconciliation_items USING btree (matched);


--
-- Name: idx_reconciliation_items_payment; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reconciliation_items_payment ON public.reconciliation_items USING btree (payment_ledger_id);


--
-- Name: idx_reconciliation_items_reconciliation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reconciliation_items_reconciliation ON public.reconciliation_items USING btree (reconciliation_id);


--
-- Name: idx_reconciliation_items_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reconciliation_items_status ON public.reconciliation_items USING btree (status);


--
-- Name: idx_reconciliation_rules_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reconciliation_rules_active ON public.reconciliation_rules USING btree (is_active);


--
-- Name: idx_refund_items_request; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_refund_items_request ON public.refund_items USING btree (refund_request_id);


--
-- Name: idx_refund_items_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_refund_items_status ON public.refund_items USING btree (status);


--
-- Name: idx_refund_requests_quote; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_refund_requests_quote ON public.refund_requests USING btree (quote_id);


--
-- Name: idx_refund_requests_requested_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_refund_requests_requested_at ON public.refund_requests USING btree (requested_at);


--
-- Name: idx_refund_requests_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_refund_requests_status ON public.refund_requests USING btree (status);


--
-- Name: idx_rejection_reasons_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rejection_reasons_category ON public.rejection_reasons USING btree (category);


--
-- Name: idx_rejection_reasons_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rejection_reasons_is_active ON public.rejection_reasons USING btree (is_active);


--
-- Name: idx_route_customs_tiers_price; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_route_customs_tiers_price ON public.route_customs_tiers USING btree (origin_country, destination_country, price_min, price_max);


--
-- Name: idx_route_customs_tiers_priority; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_route_customs_tiers_priority ON public.route_customs_tiers USING btree (origin_country, destination_country, priority_order);


--
-- Name: idx_route_customs_tiers_route; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_route_customs_tiers_route ON public.route_customs_tiers USING btree (origin_country, destination_country);


--
-- Name: idx_route_customs_tiers_weight; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_route_customs_tiers_weight ON public.route_customs_tiers USING btree (origin_country, destination_country, weight_min, weight_max);


--
-- Name: idx_share_audit_log_action; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_share_audit_log_action ON public.share_audit_log USING btree (action);


--
-- Name: idx_share_audit_log_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_share_audit_log_created_at ON public.share_audit_log USING btree (created_at);


--
-- Name: idx_share_audit_log_quote_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_share_audit_log_quote_id ON public.share_audit_log USING btree (quote_id);


--
-- Name: idx_shipping_routes_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_shipping_routes_active ON public.shipping_routes USING btree (is_active);


--
-- Name: idx_shipping_routes_api_config_gin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_shipping_routes_api_config_gin ON public.shipping_routes USING gin (api_configuration);


--
-- Name: idx_shipping_routes_destination; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_shipping_routes_destination ON public.shipping_routes USING btree (destination_country);


--
-- Name: idx_shipping_routes_origin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_shipping_routes_origin ON public.shipping_routes USING btree (origin_country);


--
-- Name: idx_shipping_routes_shipping_per_kg; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_shipping_routes_shipping_per_kg ON public.shipping_routes USING btree (shipping_per_kg);


--
-- Name: idx_shipping_routes_tax_config_gin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_shipping_routes_tax_config_gin ON public.shipping_routes USING gin (tax_configuration);


--
-- Name: idx_shipping_routes_weight_config_gin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_shipping_routes_weight_config_gin ON public.shipping_routes USING gin (weight_configuration);


--
-- Name: idx_status_transitions_changed_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_status_transitions_changed_at ON public.status_transitions USING btree (changed_at);


--
-- Name: idx_status_transitions_quote_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_status_transitions_quote_id ON public.status_transitions USING btree (quote_id);


--
-- Name: idx_status_transitions_trigger; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_status_transitions_trigger ON public.status_transitions USING btree (trigger);


--
-- Name: idx_storage_fees_is_paid; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_storage_fees_is_paid ON public.storage_fees USING btree (is_paid);


--
-- Name: idx_storage_fees_package; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_storage_fees_package ON public.storage_fees USING btree (package_id);


--
-- Name: idx_storage_fees_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_storage_fees_user ON public.storage_fees USING btree (user_id);


--
-- Name: idx_support_interactions_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_support_interactions_created_at ON public.support_interactions USING btree (created_at);


--
-- Name: idx_support_interactions_internal; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_support_interactions_internal ON public.support_interactions USING btree (is_internal);


--
-- Name: idx_support_interactions_support_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_support_interactions_support_id ON public.support_interactions USING btree (support_id);


--
-- Name: idx_support_interactions_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_support_interactions_type ON public.support_interactions USING btree (interaction_type);


--
-- Name: idx_support_interactions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_support_interactions_user_id ON public.support_interactions USING btree (user_id);


--
-- Name: idx_support_system_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_support_system_active ON public.support_system USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_support_system_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_support_system_created_at ON public.support_system USING btree (created_at);


--
-- Name: idx_support_system_quote_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_support_system_quote_id ON public.support_system USING btree (quote_id) WHERE (quote_id IS NOT NULL);


--
-- Name: idx_support_system_ticket_assigned_to; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_support_system_ticket_assigned_to ON public.support_system USING gin (((ticket_data -> 'assigned_to'::text))) WHERE ((system_type)::text = 'ticket'::text);


--
-- Name: idx_support_system_ticket_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_support_system_ticket_category ON public.support_system USING gin (((ticket_data -> 'category'::text))) WHERE ((system_type)::text = 'ticket'::text);


--
-- Name: idx_support_system_ticket_priority; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_support_system_ticket_priority ON public.support_system USING gin (((ticket_data -> 'priority'::text))) WHERE ((system_type)::text = 'ticket'::text);


--
-- Name: idx_support_system_ticket_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_support_system_ticket_status ON public.support_system USING gin (((ticket_data -> 'status'::text))) WHERE ((system_type)::text = 'ticket'::text);


--
-- Name: idx_support_system_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_support_system_type ON public.support_system USING btree (system_type);


--
-- Name: idx_support_system_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_support_system_user_id ON public.support_system USING btree (user_id);


--
-- Name: idx_tax_audit_admin_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tax_audit_admin_id ON public.tax_calculation_audit_log USING btree (admin_id);


--
-- Name: idx_tax_audit_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tax_audit_created_at ON public.tax_calculation_audit_log USING btree (created_at);


--
-- Name: idx_tax_audit_quote_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tax_audit_quote_id ON public.tax_calculation_audit_log USING btree (quote_id);


--
-- Name: idx_unified_config_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_unified_config_active ON public.unified_configuration USING btree (is_active);


--
-- Name: idx_unified_config_data_gin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_unified_config_data_gin ON public.unified_configuration USING gin (config_data);


--
-- Name: idx_unified_config_type_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_unified_config_type_key ON public.unified_configuration USING btree (config_type, config_key);


--
-- Name: idx_user_activity_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_activity_created_at ON public.user_activity_analytics USING btree (created_at DESC);


--
-- Name: idx_user_activity_data_gin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_activity_data_gin ON public.user_activity_analytics USING gin (activity_data);


--
-- Name: idx_user_activity_product_price; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_activity_product_price ON public.user_activity_analytics USING btree ((((activity_data ->> 'product_price'::text))::numeric));


--
-- Name: idx_user_activity_quote_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_activity_quote_id ON public.user_activity_analytics USING btree (((activity_data ->> 'quote_id'::text)));


--
-- Name: idx_user_activity_session_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_activity_session_id ON public.user_activity_analytics USING btree (session_id);


--
-- Name: idx_user_activity_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_activity_type ON public.user_activity_analytics USING btree (activity_type);


--
-- Name: idx_user_activity_user_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_activity_user_created ON public.user_activity_analytics USING btree (user_id, created_at DESC);


--
-- Name: idx_user_activity_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_activity_user_id ON public.user_activity_analytics USING btree (user_id);


--
-- Name: idx_user_activity_user_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_activity_user_type ON public.user_activity_analytics USING btree (user_id, activity_type, created_at DESC);


--
-- Name: idx_user_addresses_destination_country; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_addresses_destination_country ON public.user_addresses USING btree (country);


--
-- Name: idx_user_addresses_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_addresses_user_id ON public.user_addresses USING btree (user_id);


--
-- Name: idx_user_roles_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_roles_is_active ON public.user_roles USING btree (is_active);


--
-- Name: idx_user_roles_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_roles_role ON public.user_roles USING btree (role);


--
-- Name: idx_user_roles_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_roles_user_id ON public.user_roles USING btree (user_id);


--
-- Name: idx_warehouse_tasks_assigned_to; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_warehouse_tasks_assigned_to ON public.warehouse_tasks USING btree (assigned_to);


--
-- Name: idx_warehouse_tasks_due_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_warehouse_tasks_due_date ON public.warehouse_tasks USING btree (due_date);


--
-- Name: idx_warehouse_tasks_priority; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_warehouse_tasks_priority ON public.warehouse_tasks USING btree (priority);


--
-- Name: idx_warehouse_tasks_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_warehouse_tasks_status ON public.warehouse_tasks USING btree (status);


--
-- Name: idx_webhook_logs_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_webhook_logs_created_at ON public.webhook_logs USING btree (created_at);


--
-- Name: idx_webhook_logs_request_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_webhook_logs_request_id ON public.webhook_logs USING btree (request_id);


--
-- Name: idx_webhook_logs_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_webhook_logs_status ON public.webhook_logs USING btree (status);


--
-- Name: idx_webhook_logs_webhook_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_webhook_logs_webhook_type ON public.webhook_logs USING btree (webhook_type);


--
-- Name: blog_categories blog_categories_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER blog_categories_updated_at_trigger BEFORE UPDATE ON public.blog_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: blog_posts blog_posts_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER blog_posts_updated_at_trigger BEFORE UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: blog_tags blog_tags_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER blog_tags_updated_at_trigger BEFORE UPDATE ON public.blog_tags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: payment_transactions create_payment_ledger_entry_on_payment; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER create_payment_ledger_entry_on_payment AFTER INSERT OR UPDATE ON public.payment_transactions FOR EACH ROW EXECUTE FUNCTION public.create_payment_ledger_entry_trigger();


--
-- Name: user_addresses ensure_profile_before_address; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER ensure_profile_before_address BEFORE INSERT ON public.user_addresses FOR EACH ROW EXECUTE FUNCTION public.before_address_insert();


--
-- Name: quotes quotes_unified_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER quotes_unified_updated_at BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.update_quotes_unified_updated_at();


--
-- Name: payment_ledger sync_payment_amounts_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER sync_payment_amounts_trigger AFTER INSERT OR DELETE OR UPDATE ON public.payment_ledger FOR EACH ROW EXECUTE FUNCTION public.sync_quote_payment_amounts();


--
-- Name: quotes tax_method_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER tax_method_audit_trigger AFTER UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.trigger_tax_method_audit();


--
-- Name: country_payment_preferences trigger_country_payment_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_country_payment_preferences_updated_at BEFORE UPDATE ON public.country_payment_preferences FOR EACH ROW EXECUTE FUNCTION public.update_country_payment_preferences_updated_at();


--
-- Name: user_addresses trigger_handle_default_address_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_handle_default_address_insert BEFORE INSERT ON public.user_addresses FOR EACH ROW EXECUTE FUNCTION public.handle_default_address();


--
-- Name: user_addresses trigger_handle_default_address_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_handle_default_address_update BEFORE UPDATE ON public.user_addresses FOR EACH ROW EXECUTE FUNCTION public.handle_default_address();


--
-- Name: ml_product_weights trigger_ml_product_weights_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_ml_product_weights_updated_at BEFORE UPDATE ON public.ml_product_weights FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: paypal_refunds trigger_paypal_refunds_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_paypal_refunds_updated_at BEFORE UPDATE ON public.paypal_refunds FOR EACH ROW EXECUTE FUNCTION public.update_paypal_refunds_updated_at();


--
-- Name: paypal_webhook_events trigger_paypal_webhook_events_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_paypal_webhook_events_updated_at BEFORE UPDATE ON public.paypal_webhook_events FOR EACH ROW EXECUTE FUNCTION public.trigger_paypal_webhook_events_updated_at();


--
-- Name: authenticated_checkout_sessions trigger_update_authenticated_checkout_sessions_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_authenticated_checkout_sessions_updated_at BEFORE UPDATE ON public.authenticated_checkout_sessions FOR EACH ROW EXECUTE FUNCTION public.update_authenticated_checkout_sessions_updated_at();


--
-- Name: ml_product_weights trigger_update_category_weights; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_category_weights AFTER INSERT OR UPDATE ON public.ml_product_weights FOR EACH ROW EXECUTE FUNCTION public.update_category_weights();


--
-- Name: guest_checkout_sessions trigger_update_guest_checkout_sessions_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_guest_checkout_sessions_updated_at BEFORE UPDATE ON public.guest_checkout_sessions FOR EACH ROW EXECUTE FUNCTION public.update_guest_checkout_sessions_updated_at();


--
-- Name: paypal_refunds trigger_update_payment_refund_totals; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_payment_refund_totals AFTER INSERT OR UPDATE OF status, refund_amount, completed_at ON public.paypal_refunds FOR EACH ROW EXECUTE FUNCTION public.update_payment_refund_totals();


--
-- Name: quote_documents trigger_update_quote_documents_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_quote_documents_updated_at BEFORE UPDATE ON public.quote_documents FOR EACH ROW EXECUTE FUNCTION public.update_quote_documents_updated_at();


--
-- Name: route_customs_tiers trigger_update_route_customs_tiers_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_route_customs_tiers_updated_at BEFORE UPDATE ON public.route_customs_tiers FOR EACH ROW EXECUTE FUNCTION public.update_route_customs_tiers_updated_at();


--
-- Name: admin_overrides update_admin_overrides_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_admin_overrides_updated_at BEFORE UPDATE ON public.admin_overrides FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: blog_categories update_blog_categories_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_blog_categories_updated_at BEFORE UPDATE ON public.blog_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: blog_comments update_blog_comments_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_blog_comments_updated_at BEFORE UPDATE ON public.blog_comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: blog_posts update_blog_posts_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: blog_tags update_blog_tags_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_blog_tags_updated_at BEFORE UPDATE ON public.blog_tags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: chart_of_accounts update_chart_of_accounts_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_chart_of_accounts_updated_at BEFORE UPDATE ON public.chart_of_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: consolidation_groups update_consolidation_groups_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_consolidation_groups_updated_at BEFORE UPDATE ON public.consolidation_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: credit_notes update_credit_notes_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_credit_notes_updated_at BEFORE UPDATE ON public.credit_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: customer_addresses update_customer_addresses_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_customer_addresses_updated_at BEFORE UPDATE ON public.customer_addresses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: financial_transactions update_financial_transactions_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_financial_transactions_updated_at BEFORE UPDATE ON public.financial_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: gateway_refunds update_gateway_refunds_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_gateway_refunds_updated_at BEFORE UPDATE ON public.gateway_refunds FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: hsn_master update_hsn_master_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_hsn_master_updated_at BEFORE UPDATE ON public.hsn_master FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: mfa_configurations update_mfa_configurations_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_mfa_configurations_updated_at BEFORE UPDATE ON public.mfa_configurations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: notifications update_notifications_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: payment_adjustments update_payment_adjustments_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_payment_adjustments_updated_at BEFORE UPDATE ON public.payment_adjustments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: payment_ledger update_payment_ledger_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_payment_ledger_updated_at BEFORE UPDATE ON public.payment_ledger FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: payment_links update_payment_links_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_payment_links_updated_at_trigger BEFORE UPDATE ON public.payment_links FOR EACH ROW EXECUTE FUNCTION public.update_payment_links_updated_at();


--
-- Name: payment_reconciliation update_payment_reconciliation_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_payment_reconciliation_updated_at BEFORE UPDATE ON public.payment_reconciliation FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: received_packages update_received_packages_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_received_packages_updated_at BEFORE UPDATE ON public.received_packages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: reconciliation_items update_reconciliation_items_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_reconciliation_items_updated_at BEFORE UPDATE ON public.reconciliation_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: refund_items update_refund_items_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_refund_items_updated_at BEFORE UPDATE ON public.refund_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: refund_requests update_refund_requests_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_refund_requests_updated_at BEFORE UPDATE ON public.refund_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: storage_fees update_storage_fees_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_storage_fees_updated_at BEFORE UPDATE ON public.storage_fees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: support_system update_support_system_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_support_system_updated_at BEFORE UPDATE ON public.support_system FOR EACH ROW EXECUTE FUNCTION public.update_support_updated_at();


--
-- Name: blog_post_tags update_tag_usage_count_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_tag_usage_count_trigger AFTER INSERT OR DELETE ON public.blog_post_tags FOR EACH ROW EXECUTE FUNCTION public.update_tag_usage_count();


--
-- Name: unified_configuration update_unified_configuration_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_unified_configuration_updated_at BEFORE UPDATE ON public.unified_configuration FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_activity_analytics update_user_activity_analytics_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_user_activity_analytics_updated_at BEFORE UPDATE ON public.user_activity_analytics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: warehouse_locations update_warehouse_locations_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_warehouse_locations_updated_at BEFORE UPDATE ON public.warehouse_locations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: warehouse_tasks update_warehouse_tasks_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_warehouse_tasks_updated_at BEFORE UPDATE ON public.warehouse_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: shipping_routes validate_delivery_options_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER validate_delivery_options_trigger BEFORE INSERT OR UPDATE ON public.shipping_routes FOR EACH ROW EXECUTE FUNCTION public.validate_delivery_options();


--
-- Name: extensions extensions_tenant_external_id_fkey; Type: FK CONSTRAINT; Schema: _realtime; Owner: supabase_admin
--

ALTER TABLE ONLY _realtime.extensions
    ADD CONSTRAINT extensions_tenant_external_id_fkey FOREIGN KEY (tenant_external_id) REFERENCES _realtime.tenants(external_id) ON DELETE CASCADE;


--
-- Name: authenticated_checkout_sessions authenticated_checkout_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.authenticated_checkout_sessions
    ADD CONSTRAINT authenticated_checkout_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: bank_account_details bank_account_details_country_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_account_details
    ADD CONSTRAINT bank_account_details_country_code_fkey FOREIGN KEY (country_code) REFERENCES public.country_settings(code);


--
-- Name: bank_statement_imports bank_statement_imports_imported_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_statement_imports
    ADD CONSTRAINT bank_statement_imports_imported_by_fkey FOREIGN KEY (imported_by) REFERENCES auth.users(id);


--
-- Name: bank_statement_imports bank_statement_imports_reconciliation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_statement_imports
    ADD CONSTRAINT bank_statement_imports_reconciliation_id_fkey FOREIGN KEY (reconciliation_id) REFERENCES public.payment_reconciliation(id);


--
-- Name: blog_comments blog_comments_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blog_comments
    ADD CONSTRAINT blog_comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.blog_comments(id);


--
-- Name: blog_comments blog_comments_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blog_comments
    ADD CONSTRAINT blog_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.blog_posts(id) ON DELETE CASCADE;


--
-- Name: blog_comments blog_comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blog_comments
    ADD CONSTRAINT blog_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: blog_post_tags blog_post_tags_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blog_post_tags
    ADD CONSTRAINT blog_post_tags_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.blog_posts(id) ON DELETE CASCADE;


--
-- Name: blog_post_tags blog_post_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blog_post_tags
    ADD CONSTRAINT blog_post_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.blog_tags(id) ON DELETE CASCADE;


--
-- Name: blog_posts blog_posts_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: blog_posts blog_posts_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.blog_categories(id) ON DELETE CASCADE;


--
-- Name: chart_of_accounts chart_of_accounts_parent_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chart_of_accounts
    ADD CONSTRAINT chart_of_accounts_parent_code_fkey FOREIGN KEY (parent_code) REFERENCES public.chart_of_accounts(code);


--
-- Name: consolidation_groups consolidation_groups_consolidated_by_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consolidation_groups
    ADD CONSTRAINT consolidation_groups_consolidated_by_staff_id_fkey FOREIGN KEY (consolidated_by_staff_id) REFERENCES auth.users(id);


--
-- Name: consolidation_groups consolidation_groups_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consolidation_groups
    ADD CONSTRAINT consolidation_groups_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id);


--
-- Name: consolidation_groups consolidation_groups_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consolidation_groups
    ADD CONSTRAINT consolidation_groups_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: credit_note_applications credit_note_applications_applied_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.credit_note_applications
    ADD CONSTRAINT credit_note_applications_applied_by_fkey FOREIGN KEY (applied_by) REFERENCES auth.users(id);


--
-- Name: credit_note_applications credit_note_applications_credit_note_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.credit_note_applications
    ADD CONSTRAINT credit_note_applications_credit_note_id_fkey FOREIGN KEY (credit_note_id) REFERENCES public.credit_notes(id);


--
-- Name: credit_note_applications credit_note_applications_financial_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.credit_note_applications
    ADD CONSTRAINT credit_note_applications_financial_transaction_id_fkey FOREIGN KEY (financial_transaction_id) REFERENCES public.financial_transactions(id);


--
-- Name: credit_note_applications credit_note_applications_payment_ledger_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.credit_note_applications
    ADD CONSTRAINT credit_note_applications_payment_ledger_id_fkey FOREIGN KEY (payment_ledger_id) REFERENCES public.payment_ledger(id);


--
-- Name: credit_note_applications credit_note_applications_reversed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.credit_note_applications
    ADD CONSTRAINT credit_note_applications_reversed_by_fkey FOREIGN KEY (reversed_by) REFERENCES public.credit_note_applications(id);


--
-- Name: credit_note_history credit_note_history_credit_note_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.credit_note_history
    ADD CONSTRAINT credit_note_history_credit_note_id_fkey FOREIGN KEY (credit_note_id) REFERENCES public.credit_notes(id);


--
-- Name: credit_note_history credit_note_history_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.credit_note_history
    ADD CONSTRAINT credit_note_history_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES auth.users(id);


--
-- Name: credit_notes credit_notes_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.credit_notes
    ADD CONSTRAINT credit_notes_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id);


--
-- Name: credit_notes credit_notes_cancelled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.credit_notes
    ADD CONSTRAINT credit_notes_cancelled_by_fkey FOREIGN KEY (cancelled_by) REFERENCES auth.users(id);


--
-- Name: credit_notes credit_notes_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.credit_notes
    ADD CONSTRAINT credit_notes_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES auth.users(id);


--
-- Name: credit_notes credit_notes_issued_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.credit_notes
    ADD CONSTRAINT credit_notes_issued_by_fkey FOREIGN KEY (issued_by) REFERENCES auth.users(id);


--
-- Name: credit_notes credit_notes_refund_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.credit_notes
    ADD CONSTRAINT credit_notes_refund_request_id_fkey FOREIGN KEY (refund_request_id) REFERENCES public.refund_requests(id);


--
-- Name: customer_addresses customer_addresses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_addresses
    ADD CONSTRAINT customer_addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: financial_transactions financial_transactions_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.financial_transactions
    ADD CONSTRAINT financial_transactions_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id);


--
-- Name: financial_transactions financial_transactions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.financial_transactions
    ADD CONSTRAINT financial_transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: financial_transactions financial_transactions_credit_account_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.financial_transactions
    ADD CONSTRAINT financial_transactions_credit_account_fkey FOREIGN KEY (credit_account) REFERENCES public.chart_of_accounts(code);


--
-- Name: financial_transactions financial_transactions_debit_account_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.financial_transactions
    ADD CONSTRAINT financial_transactions_debit_account_fkey FOREIGN KEY (debit_account) REFERENCES public.chart_of_accounts(code);


--
-- Name: financial_transactions financial_transactions_reversed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.financial_transactions
    ADD CONSTRAINT financial_transactions_reversed_by_fkey FOREIGN KEY (reversed_by) REFERENCES public.financial_transactions(id);


--
-- Name: country_payment_preferences fk_country_payment_preferences_country; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.country_payment_preferences
    ADD CONSTRAINT fk_country_payment_preferences_country FOREIGN KEY (country_code) REFERENCES public.country_settings(code) ON DELETE CASCADE;


--
-- Name: country_payment_preferences fk_country_payment_preferences_gateway; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.country_payment_preferences
    ADD CONSTRAINT fk_country_payment_preferences_gateway FOREIGN KEY (gateway_code) REFERENCES public.payment_gateways(code) ON DELETE CASCADE;


--
-- Name: gateway_refunds gateway_refunds_payment_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gateway_refunds
    ADD CONSTRAINT gateway_refunds_payment_transaction_id_fkey FOREIGN KEY (payment_transaction_id) REFERENCES public.payment_transactions(id);


--
-- Name: gateway_refunds gateway_refunds_processed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gateway_refunds
    ADD CONSTRAINT gateway_refunds_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES auth.users(id);


--
-- Name: global_tax_method_preferences global_tax_method_preferences_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.global_tax_method_preferences
    ADD CONSTRAINT global_tax_method_preferences_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.profiles(id);


--
-- Name: manual_analysis_tasks manual_analysis_tasks_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.manual_analysis_tasks
    ADD CONSTRAINT manual_analysis_tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: messages messages_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: messages messages_reply_to_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_reply_to_message_id_fkey FOREIGN KEY (reply_to_message_id) REFERENCES public.messages(id);


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: messages messages_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.profiles(id);


--
-- Name: mfa_activity_log mfa_activity_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mfa_activity_log
    ADD CONSTRAINT mfa_activity_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mfa_configurations mfa_configurations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mfa_configurations
    ADD CONSTRAINT mfa_configurations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mfa_sessions mfa_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mfa_sessions
    ADD CONSTRAINT mfa_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: ml_product_weights ml_product_weights_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ml_product_weights
    ADD CONSTRAINT ml_product_weights_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: ml_training_history ml_training_history_trained_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ml_training_history
    ADD CONSTRAINT ml_training_history_trained_by_fkey FOREIGN KEY (trained_by) REFERENCES public.profiles(id);


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_tokens oauth_tokens_gateway_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.oauth_tokens
    ADD CONSTRAINT oauth_tokens_gateway_code_fkey FOREIGN KEY (gateway_code) REFERENCES public.payment_gateways(code) ON DELETE CASCADE;


--
-- Name: package_events package_events_consolidation_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.package_events
    ADD CONSTRAINT package_events_consolidation_group_id_fkey FOREIGN KEY (consolidation_group_id) REFERENCES public.consolidation_groups(id) ON DELETE CASCADE;


--
-- Name: package_events package_events_package_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.package_events
    ADD CONSTRAINT package_events_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.received_packages(id) ON DELETE CASCADE;


--
-- Name: package_events package_events_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.package_events
    ADD CONSTRAINT package_events_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES auth.users(id);


--
-- Name: package_notifications package_notifications_package_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.package_notifications
    ADD CONSTRAINT package_notifications_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.received_packages(id) ON DELETE CASCADE;


--
-- Name: package_notifications package_notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.package_notifications
    ADD CONSTRAINT package_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: package_photos package_photos_consolidation_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.package_photos
    ADD CONSTRAINT package_photos_consolidation_group_id_fkey FOREIGN KEY (consolidation_group_id) REFERENCES public.consolidation_groups(id) ON DELETE CASCADE;


--
-- Name: package_photos package_photos_package_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.package_photos
    ADD CONSTRAINT package_photos_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.received_packages(id) ON DELETE CASCADE;


--
-- Name: payment_adjustments payment_adjustments_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_adjustments
    ADD CONSTRAINT payment_adjustments_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id);


--
-- Name: payment_adjustments payment_adjustments_financial_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_adjustments
    ADD CONSTRAINT payment_adjustments_financial_transaction_id_fkey FOREIGN KEY (financial_transaction_id) REFERENCES public.financial_transactions(id);


--
-- Name: payment_adjustments payment_adjustments_payment_ledger_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_adjustments
    ADD CONSTRAINT payment_adjustments_payment_ledger_id_fkey FOREIGN KEY (payment_ledger_id) REFERENCES public.payment_ledger(id);


--
-- Name: payment_adjustments payment_adjustments_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_adjustments
    ADD CONSTRAINT payment_adjustments_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES auth.users(id);


--
-- Name: payment_error_logs payment_error_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_error_logs
    ADD CONSTRAINT payment_error_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: payment_ledger payment_ledger_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_ledger
    ADD CONSTRAINT payment_ledger_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: payment_ledger payment_ledger_financial_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_ledger
    ADD CONSTRAINT payment_ledger_financial_transaction_id_fkey FOREIGN KEY (financial_transaction_id) REFERENCES public.financial_transactions(id);


--
-- Name: payment_ledger payment_ledger_parent_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_ledger
    ADD CONSTRAINT payment_ledger_parent_payment_id_fkey FOREIGN KEY (parent_payment_id) REFERENCES public.payment_ledger(id);


--
-- Name: payment_ledger payment_ledger_payment_proof_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_ledger
    ADD CONSTRAINT payment_ledger_payment_proof_message_id_fkey FOREIGN KEY (payment_proof_message_id) REFERENCES public.messages(id);


--
-- Name: payment_ledger payment_ledger_payment_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_ledger
    ADD CONSTRAINT payment_ledger_payment_transaction_id_fkey FOREIGN KEY (payment_transaction_id) REFERENCES public.payment_transactions(id);


--
-- Name: payment_ledger payment_ledger_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_ledger
    ADD CONSTRAINT payment_ledger_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES auth.users(id);


--
-- Name: payment_links payment_links_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_links
    ADD CONSTRAINT payment_links_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: payment_links payment_links_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_links
    ADD CONSTRAINT payment_links_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);


--
-- Name: payment_reconciliation payment_reconciliation_reconciled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_reconciliation
    ADD CONSTRAINT payment_reconciliation_reconciled_by_fkey FOREIGN KEY (reconciled_by) REFERENCES auth.users(id);


--
-- Name: payment_transactions payment_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: paypal_refunds paypal_refunds_payment_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paypal_refunds
    ADD CONSTRAINT paypal_refunds_payment_transaction_id_fkey FOREIGN KEY (payment_transaction_id) REFERENCES public.payment_transactions(id);


--
-- Name: paypal_refunds paypal_refunds_processed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paypal_refunds
    ADD CONSTRAINT paypal_refunds_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.profiles(id);


--
-- Name: paypal_refunds paypal_refunds_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paypal_refunds
    ADD CONSTRAINT paypal_refunds_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: quote_address_history quote_address_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quote_address_history
    ADD CONSTRAINT quote_address_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.profiles(id);


--
-- Name: quote_documents quote_documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quote_documents
    ADD CONSTRAINT quote_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: quotes quotes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: received_packages received_packages_customer_address_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.received_packages
    ADD CONSTRAINT received_packages_customer_address_id_fkey FOREIGN KEY (customer_address_id) REFERENCES public.customer_addresses(id);


--
-- Name: received_packages received_packages_received_by_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.received_packages
    ADD CONSTRAINT received_packages_received_by_staff_id_fkey FOREIGN KEY (received_by_staff_id) REFERENCES auth.users(id);


--
-- Name: reconciliation_items reconciliation_items_matched_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reconciliation_items
    ADD CONSTRAINT reconciliation_items_matched_by_fkey FOREIGN KEY (matched_by) REFERENCES auth.users(id);


--
-- Name: reconciliation_items reconciliation_items_payment_ledger_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reconciliation_items
    ADD CONSTRAINT reconciliation_items_payment_ledger_id_fkey FOREIGN KEY (payment_ledger_id) REFERENCES public.payment_ledger(id);


--
-- Name: reconciliation_items reconciliation_items_reconciliation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reconciliation_items
    ADD CONSTRAINT reconciliation_items_reconciliation_id_fkey FOREIGN KEY (reconciliation_id) REFERENCES public.payment_reconciliation(id);


--
-- Name: reconciliation_rules reconciliation_rules_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reconciliation_rules
    ADD CONSTRAINT reconciliation_rules_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: refund_items refund_items_financial_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refund_items
    ADD CONSTRAINT refund_items_financial_transaction_id_fkey FOREIGN KEY (financial_transaction_id) REFERENCES public.financial_transactions(id);


--
-- Name: refund_items refund_items_payment_ledger_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refund_items
    ADD CONSTRAINT refund_items_payment_ledger_id_fkey FOREIGN KEY (payment_ledger_id) REFERENCES public.payment_ledger(id);


--
-- Name: refund_items refund_items_refund_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refund_items
    ADD CONSTRAINT refund_items_refund_payment_id_fkey FOREIGN KEY (refund_payment_id) REFERENCES public.payment_ledger(id);


--
-- Name: refund_items refund_items_refund_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refund_items
    ADD CONSTRAINT refund_items_refund_request_id_fkey FOREIGN KEY (refund_request_id) REFERENCES public.refund_requests(id);


--
-- Name: refund_requests refund_requests_payment_ledger_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refund_requests
    ADD CONSTRAINT refund_requests_payment_ledger_id_fkey FOREIGN KEY (payment_ledger_id) REFERENCES public.payment_ledger(id);


--
-- Name: refund_requests refund_requests_processed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refund_requests
    ADD CONSTRAINT refund_requests_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES auth.users(id);


--
-- Name: refund_requests refund_requests_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refund_requests
    ADD CONSTRAINT refund_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES auth.users(id);


--
-- Name: refund_requests refund_requests_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refund_requests
    ADD CONSTRAINT refund_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id);


--
-- Name: share_audit_log share_audit_log_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.share_audit_log
    ADD CONSTRAINT share_audit_log_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE CASCADE;


--
-- Name: share_audit_log share_audit_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.share_audit_log
    ADD CONSTRAINT share_audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: status_transitions status_transitions_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.status_transitions
    ADD CONSTRAINT status_transitions_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES auth.users(id);


--
-- Name: storage_fees storage_fees_package_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage_fees
    ADD CONSTRAINT storage_fees_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.received_packages(id) ON DELETE CASCADE;


--
-- Name: storage_fees storage_fees_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage_fees
    ADD CONSTRAINT storage_fees_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: support_interactions support_interactions_support_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_interactions
    ADD CONSTRAINT support_interactions_support_id_fkey FOREIGN KEY (support_id) REFERENCES public.support_system(id) ON DELETE CASCADE;


--
-- Name: support_interactions support_interactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_interactions
    ADD CONSTRAINT support_interactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: support_system support_system_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_system
    ADD CONSTRAINT support_system_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE SET NULL;


--
-- Name: support_system support_system_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_system
    ADD CONSTRAINT support_system_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: tax_calculation_audit_log tax_calculation_audit_log_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tax_calculation_audit_log
    ADD CONSTRAINT tax_calculation_audit_log_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.profiles(id);


--
-- Name: tax_calculation_audit_log tax_calculation_audit_log_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tax_calculation_audit_log
    ADD CONSTRAINT tax_calculation_audit_log_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE CASCADE;


--
-- Name: user_activity_analytics user_activity_analytics_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_activity_analytics
    ADD CONSTRAINT user_activity_analytics_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_addresses user_addresses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_addresses
    ADD CONSTRAINT user_addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: user_oauth_data user_oauth_data_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_oauth_data
    ADD CONSTRAINT user_oauth_data_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: user_roles user_roles_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES auth.users(id);


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: warehouse_tasks warehouse_tasks_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouse_tasks
    ADD CONSTRAINT warehouse_tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id);


--
-- Name: warehouse_tasks warehouse_tasks_consolidation_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouse_tasks
    ADD CONSTRAINT warehouse_tasks_consolidation_group_id_fkey FOREIGN KEY (consolidation_group_id) REFERENCES public.consolidation_groups(id);


--
-- Name: global_tax_method_preferences Admin access to global tax preferences; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admin access to global tax preferences" ON public.global_tax_method_preferences USING (public.is_admin());


--
-- Name: tax_calculation_audit_log Admin access to tax audit log; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admin access to tax audit log" ON public.tax_calculation_audit_log USING (public.is_admin());


--
-- Name: email_settings Admin can insert email settings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admin can insert email settings" ON public.email_settings FOR INSERT WITH CHECK (((auth.jwt() ->> 'role'::text) = 'admin'::text));


--
-- Name: payment_alert_thresholds Admin can manage alert thresholds; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admin can manage alert thresholds" ON public.payment_alert_thresholds USING (public.is_admin());


--
-- Name: customs_rules Admin can manage customs rules; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admin can manage customs rules" ON public.customs_rules USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: route_customs_tiers Admin can manage customs tiers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admin can manage customs tiers" ON public.route_customs_tiers USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: payment_error_logs Admin can manage payment error logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admin can manage payment error logs" ON public.payment_error_logs USING (public.is_admin());


--
-- Name: route_customs_tiers Admin can manage route customs tiers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admin can manage route customs tiers" ON public.route_customs_tiers USING (((auth.jwt() ->> 'role'::text) = 'admin'::text));


--
-- Name: shipping_routes Admin can manage shipping routes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admin can manage shipping routes" ON public.shipping_routes USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: email_settings Admin can read email settings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admin can read email settings" ON public.email_settings FOR SELECT USING (((auth.jwt() ->> 'role'::text) = 'admin'::text));


--
-- Name: email_settings Admin can update email settings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admin can update email settings" ON public.email_settings FOR UPDATE USING (((auth.jwt() ->> 'role'::text) = 'admin'::text));


--
-- Name: payment_health_logs Admin only access to payment health logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admin only access to payment health logs" ON public.payment_health_logs USING (public.is_admin());


--
-- Name: payment_verification_logs Admin only access to payment verification logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admin only access to payment verification logs" ON public.payment_verification_logs USING (public.is_admin());


--
-- Name: webhook_logs Admin only access to webhook logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admin only access to webhook logs" ON public.webhook_logs USING (public.is_admin());


--
-- Name: paypal_webhook_events Admin users can view PayPal webhook events; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admin users can view PayPal webhook events" ON public.paypal_webhook_events FOR SELECT TO authenticated USING (public.is_admin());


--
-- Name: user_activity_analytics Admins can access all activity data; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can access all activity data" ON public.user_activity_analytics USING (public.is_admin());


--
-- Name: notifications Admins can access all notifications; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can access all notifications" ON public.notifications USING (public.is_admin());


--
-- Name: support_interactions Admins can create any support interactions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can create any support interactions" ON public.support_interactions FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::text)))));


--
-- Name: support_system Admins can create any support records; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can create any support records" ON public.support_system FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::text)))));


--
-- Name: user_roles Admins can manage all roles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage all roles" ON public.user_roles USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: bank_statement_imports Admins can manage bank imports; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage bank imports" ON public.bank_statement_imports USING (public.is_admin());


--
-- Name: credit_notes Admins can manage credit notes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage credit notes" ON public.credit_notes USING (public.is_admin());


--
-- Name: financial_transactions Admins can manage financial transactions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage financial transactions" ON public.financial_transactions USING (public.is_admin());


--
-- Name: payment_adjustments Admins can manage payment adjustments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage payment adjustments" ON public.payment_adjustments USING (public.is_admin());


--
-- Name: payment_ledger Admins can manage payment ledger; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage payment ledger" ON public.payment_ledger USING (public.is_admin());


--
-- Name: payment_links Admins can manage payment links; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage payment links" ON public.payment_links USING (public.is_admin());


--
-- Name: payment_reconciliation Admins can manage reconciliation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage reconciliation" ON public.payment_reconciliation USING (public.is_admin());


--
-- Name: reconciliation_items Admins can manage reconciliation items; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage reconciliation items" ON public.reconciliation_items USING (public.is_admin());


--
-- Name: refund_items Admins can manage refund items; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage refund items" ON public.refund_items USING (public.is_admin());


--
-- Name: paypal_refund_reasons Admins can manage refund reasons; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage refund reasons" ON public.paypal_refund_reasons TO authenticated USING (public.is_admin());


--
-- Name: refund_requests Admins can manage refund requests; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage refund requests" ON public.refund_requests USING (public.is_admin());


--
-- Name: gateway_refunds Admins can manage refunds; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage refunds" ON public.gateway_refunds USING (public.is_admin());


--
-- Name: paypal_refunds Admins can manage refunds; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage refunds" ON public.paypal_refunds TO authenticated USING (public.is_admin());


--
-- Name: warehouse_locations Admins can manage warehouse locations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage warehouse locations" ON public.warehouse_locations USING (public.is_admin());


--
-- Name: warehouse_tasks Admins can manage warehouse tasks; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage warehouse tasks" ON public.warehouse_tasks USING (public.is_admin());


--
-- Name: profiles Admins can modify all profiles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can modify all profiles" ON public.profiles USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Admins can read all profiles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can read all profiles" ON public.profiles FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (auth.uid() = id)));


--
-- Name: support_system Admins can update any support records; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can update any support records" ON public.support_system FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::text)))));


--
-- Name: share_audit_log Admins can view all audit logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can view all audit logs" ON public.share_audit_log FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::text)))));


--
-- Name: package_events Admins can view all package events; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can view all package events" ON public.package_events FOR SELECT USING (public.is_admin());


--
-- Name: paypal_refunds Admins can view all refunds; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can view all refunds" ON public.paypal_refunds FOR SELECT TO authenticated USING (public.is_admin());


--
-- Name: support_interactions Admins can view all support interactions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can view all support interactions" ON public.support_interactions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::text)))));


--
-- Name: support_system Admins can view all support records; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can view all support records" ON public.support_system FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::text)))));


--
-- Name: webhook_logs Admins can view webhook logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can view webhook logs" ON public.webhook_logs FOR SELECT USING (public.is_admin());


--
-- Name: bank_account_details Admins have full access; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins have full access" ON public.bank_account_details USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: country_settings Admins have full access; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins have full access" ON public.country_settings USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: email_settings Admins have full access; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins have full access" ON public.email_settings USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: email_templates Admins have full access; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins have full access" ON public.email_templates USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: manual_analysis_tasks Admins have full access; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins have full access" ON public.manual_analysis_tasks USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: messages Admins have full access; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins have full access" ON public.messages USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: payment_reminders Admins have full access; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins have full access" ON public.payment_reminders USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: payment_transactions Admins have full access; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins have full access" ON public.payment_transactions USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: quote_address_history Admins have full access; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins have full access" ON public.quote_address_history USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: quote_items Admins have full access; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins have full access" ON public.quote_items USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: quote_templates Admins have full access; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins have full access" ON public.quote_templates USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: quotes Admins have full access; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins have full access" ON public.quotes USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: status_transitions Admins have full access; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins have full access" ON public.status_transitions USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: system_settings Admins have full access; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins have full access" ON public.system_settings USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_addresses Admins have full access; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins have full access" ON public.user_addresses USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ml_category_weights Allow admins to manage ML category weights; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow admins to manage ML category weights" ON public.ml_category_weights USING (public.is_admin());


--
-- Name: ml_product_weights Allow admins to manage ML product weights; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow admins to manage ML product weights" ON public.ml_product_weights USING (public.is_admin());


--
-- Name: ml_training_history Allow authenticated users to add training data; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated users to add training data" ON public.ml_training_history FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: ml_category_weights Allow read access to ML category weights; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow read access to ML category weights" ON public.ml_category_weights FOR SELECT USING (true);


--
-- Name: ml_product_weights Allow read access to ML product weights; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow read access to ML product weights" ON public.ml_product_weights FOR SELECT USING (true);


--
-- Name: ml_training_history Allow users to view their training history; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow users to view their training history" ON public.ml_training_history FOR SELECT USING (((trained_by = auth.uid()) OR public.is_admin()));


--
-- Name: guest_checkout_sessions Anyone can create guest sessions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can create guest sessions" ON public.guest_checkout_sessions FOR INSERT WITH CHECK (true);


--
-- Name: paypal_refund_reasons Anyone can read refund reasons; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can read refund reasons" ON public.paypal_refund_reasons FOR SELECT TO authenticated USING ((is_active = true));


--
-- Name: guest_checkout_sessions Anyone can update own session; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can update own session" ON public.guest_checkout_sessions FOR UPDATE USING (true);


--
-- Name: guest_checkout_sessions Anyone can view own session by token; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can view own session by token" ON public.guest_checkout_sessions FOR SELECT USING (true);


--
-- Name: quotes Anyone can view shared quotes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can view shared quotes" ON public.quotes FOR SELECT USING (((share_token IS NOT NULL) AND ((expires_at IS NULL) OR (expires_at > now()))));


--
-- Name: share_audit_log Authenticated users can insert audit logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can insert audit logs" ON public.share_audit_log FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: route_customs_tiers Authenticated users can read customs tiers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can read customs tiers" ON public.route_customs_tiers FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: country_payment_preferences Country payment preferences are manageable by admins; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Country payment preferences are manageable by admins" ON public.country_payment_preferences USING (public.is_admin());


--
-- Name: country_payment_preferences Country payment preferences are viewable by everyone; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Country payment preferences are viewable by everyone" ON public.country_payment_preferences FOR SELECT USING (true);


--
-- Name: bank_account_details Enable admin full access to bank_account_details; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable admin full access to bank_account_details" ON public.bank_account_details USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: email_templates Enable admin full access to email_templates; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable admin full access to email_templates" ON public.email_templates USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: payment_gateways Enable admin full access to payment_gateways; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable admin full access to payment_gateways" ON public.payment_gateways USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: quote_templates Enable admin full access to quote_templates; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable admin full access to quote_templates" ON public.quote_templates USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: system_settings Enable admin full access to system_settings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable admin full access to system_settings" ON public.system_settings USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Enable admin full access to user_roles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable admin full access to user_roles" ON public.user_roles USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: rejection_reasons Everyone can view active rejection reasons; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Everyone can view active rejection reasons" ON public.rejection_reasons FOR SELECT USING ((is_active = true));


--
-- Name: shipping_routes Public can read active shipping routes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Public can read active shipping routes" ON public.shipping_routes FOR SELECT USING ((is_active = true));


--
-- Name: country_settings Public read access; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Public read access" ON public.country_settings FOR SELECT USING (true);


--
-- Name: customs_categories Public read access; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Public read access" ON public.customs_categories FOR SELECT USING (true);


--
-- Name: payment_gateways Public read access; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Public read access" ON public.payment_gateways FOR SELECT USING (true);


--
-- Name: authenticated_checkout_sessions Service role can access all checkout sessions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role can access all checkout sessions" ON public.authenticated_checkout_sessions USING ((auth.role() = 'service_role'::text));


--
-- Name: oauth_tokens Service role can manage OAuth tokens; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role can manage OAuth tokens" ON public.oauth_tokens USING ((auth.role() = 'service_role'::text));


--
-- Name: paypal_webhook_events Service role can manage PayPal webhook events; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role can manage PayPal webhook events" ON public.paypal_webhook_events TO service_role USING (true);


--
-- Name: paypal_refunds Service role can manage refunds; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role can manage refunds" ON public.paypal_refunds TO service_role USING (true);


--
-- Name: webhook_logs Service role can manage webhook logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role can manage webhook logs" ON public.webhook_logs USING ((auth.role() = 'service_role'::text));


--
-- Name: guest_checkout_sessions Service role full access; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role full access" ON public.guest_checkout_sessions USING ((auth.role() = 'service_role'::text));


--
-- Name: payment_links Service role has full access to payment links; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role has full access to payment links" ON public.payment_links USING (((auth.jwt() ->> 'role'::text) = 'service_role'::text));


--
-- Name: received_packages Staff can delete packages; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Staff can delete packages" ON public.received_packages FOR DELETE USING (public.is_admin());


--
-- Name: received_packages Staff can insert packages; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Staff can insert packages" ON public.received_packages FOR INSERT WITH CHECK (public.is_authenticated());


--
-- Name: received_packages Staff can update packages; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Staff can update packages" ON public.received_packages FOR UPDATE USING (public.is_admin());


--
-- Name: mfa_configurations System can insert MFA data; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "System can insert MFA data" ON public.mfa_configurations FOR INSERT WITH CHECK (true);


--
-- Name: user_oauth_data System can insert OAuth data; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "System can insert OAuth data" ON public.user_oauth_data FOR INSERT WITH CHECK (true);


--
-- Name: mfa_activity_log System can insert activity logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "System can insert activity logs" ON public.mfa_activity_log FOR INSERT WITH CHECK (true);


--
-- Name: customer_addresses System can insert addresses; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "System can insert addresses" ON public.customer_addresses FOR INSERT WITH CHECK (public.is_authenticated());


--
-- Name: payment_error_logs System can insert payment error logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "System can insert payment error logs" ON public.payment_error_logs FOR INSERT WITH CHECK (true);


--
-- Name: mfa_sessions System can insert sessions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "System can insert sessions" ON public.mfa_sessions FOR INSERT WITH CHECK (true);


--
-- Name: email_queue System can manage emails; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "System can manage emails" ON public.email_queue USING (true);


--
-- Name: user_oauth_data System can update OAuth data; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "System can update OAuth data" ON public.user_oauth_data FOR UPDATE USING (true);


--
-- Name: user_activity_analytics Users can access own activity data; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can access own activity data" ON public.user_activity_analytics USING ((user_id = auth.uid()));


--
-- Name: authenticated_checkout_sessions Users can access own checkout sessions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can access own checkout sessions" ON public.authenticated_checkout_sessions USING ((auth.uid() = user_id));


--
-- Name: notifications Users can access own notifications; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can access own notifications" ON public.notifications USING ((user_id = auth.uid()));


--
-- Name: credit_note_applications Users can apply their credit notes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can apply their credit notes" ON public.credit_note_applications FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.credit_notes
  WHERE ((credit_notes.id = credit_note_applications.credit_note_id) AND (credit_notes.customer_id = auth.uid())))));


--
-- Name: support_interactions Users can create interactions for their support records; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can create interactions for their support records" ON public.support_interactions FOR INSERT WITH CHECK (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.support_system
  WHERE ((support_system.id = support_interactions.support_id) AND (support_system.user_id = auth.uid()))))));


--
-- Name: support_system Users can create their own support records; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can create their own support records" ON public.support_system FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: payment_transactions Users can insert their own transactions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert their own transactions" ON public.payment_transactions FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: user_addresses Users can manage own addresses; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage own addresses" ON public.user_addresses USING ((auth.uid() = user_id));


--
-- Name: messages Users can manage own messages; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage own messages" ON public.messages USING (((auth.uid() = sender_id) OR (auth.uid() = recipient_id)));


--
-- Name: profiles Users can manage own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage own profile" ON public.profiles USING ((auth.uid() = id));


--
-- Name: quotes Users can manage own quotes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage own quotes" ON public.quotes USING (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: mfa_configurations Users can update own MFA config; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own MFA config" ON public.mfa_configurations FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: customer_addresses Users can update own addresses; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own addresses" ON public.customer_addresses FOR UPDATE USING (((auth.uid() = user_id) OR public.is_admin()));


--
-- Name: consolidation_groups Users can update own consolidation groups; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own consolidation groups" ON public.consolidation_groups FOR UPDATE USING (((auth.uid() = user_id) OR public.is_admin()));


--
-- Name: package_notifications Users can update own notifications; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own notifications" ON public.package_notifications FOR UPDATE USING (((auth.uid() = user_id) OR public.is_admin()));


--
-- Name: support_system Users can update their own support records; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own support records" ON public.support_system FOR UPDATE USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: payment_links Users can use public payment links; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can use public payment links" ON public.payment_links FOR UPDATE USING ((is_public = true)) WITH CHECK ((is_public = true));


--
-- Name: bank_account_details Users can view bank accounts for their country; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view bank accounts for their country" ON public.bank_account_details FOR SELECT USING (((is_active = true) AND ((country_code = ( SELECT profiles.country
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) OR (is_fallback = true))));


--
-- Name: shipping_routes Users can view delivery options for active routes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view delivery options for active routes" ON public.shipping_routes FOR SELECT USING (((active = true) AND (delivery_options IS NOT NULL) AND (jsonb_array_length(delivery_options) > 0)));


--
-- Name: financial_transactions Users can view financial transactions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view financial transactions" ON public.financial_transactions FOR SELECT USING (((auth.uid() = created_by) OR public.is_admin()));


--
-- Name: support_interactions Users can view interactions for their support records; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view interactions for their support records" ON public.support_interactions FOR SELECT USING (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.support_system
  WHERE ((support_system.id = support_interactions.support_id) AND (support_system.user_id = auth.uid()))))));


--
-- Name: mfa_activity_log Users can view own MFA activity; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own MFA activity" ON public.mfa_activity_log FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: mfa_configurations Users can view own MFA config; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own MFA config" ON public.mfa_configurations FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: mfa_sessions Users can view own MFA sessions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own MFA sessions" ON public.mfa_sessions FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: user_oauth_data Users can view own OAuth data; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own OAuth data" ON public.user_oauth_data FOR SELECT USING (((auth.uid() = user_id) OR public.is_admin()));


--
-- Name: customer_addresses Users can view own addresses; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own addresses" ON public.customer_addresses FOR SELECT USING (((auth.uid() = user_id) OR public.is_admin()));


--
-- Name: share_audit_log Users can view own audit logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own audit logs" ON public.share_audit_log FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: consolidation_groups Users can view own consolidation groups; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own consolidation groups" ON public.consolidation_groups FOR SELECT USING (((auth.uid() = user_id) OR public.is_admin()));


--
-- Name: package_notifications Users can view own notifications; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own notifications" ON public.package_notifications FOR SELECT USING (((auth.uid() = user_id) OR public.is_admin()));


--
-- Name: package_photos Users can view own package photos; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own package photos" ON public.package_photos FOR SELECT USING (((EXISTS ( SELECT 1
   FROM (public.received_packages rp
     JOIN public.customer_addresses ca ON ((ca.id = rp.customer_address_id)))
  WHERE ((rp.id = package_photos.package_id) AND (ca.user_id = auth.uid())))) OR public.is_admin()));


--
-- Name: received_packages Users can view own packages; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own packages" ON public.received_packages FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.customer_addresses ca
  WHERE ((ca.id = received_packages.customer_address_id) AND (ca.user_id = auth.uid())))) OR public.is_admin()));


--
-- Name: payment_error_logs Users can view own payment error logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own payment error logs" ON public.payment_error_logs FOR SELECT USING (((user_id = auth.uid()) OR public.is_admin()));


--
-- Name: paypal_refunds Users can view own refunds; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own refunds" ON public.paypal_refunds FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: user_roles Users can view own roles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: storage_fees Users can view own storage fees; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own storage fees" ON public.storage_fees FOR SELECT USING (((auth.uid() = user_id) OR public.is_admin()));


--
-- Name: route_customs_tiers Users can view route customs tiers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view route customs tiers" ON public.route_customs_tiers FOR SELECT USING (((auth.jwt() ->> 'role'::text) = 'admin'::text));


--
-- Name: credit_note_applications Users can view their credit note applications; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their credit note applications" ON public.credit_note_applications FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.credit_notes
  WHERE ((credit_notes.id = credit_note_applications.credit_note_id) AND ((credit_notes.customer_id = auth.uid()) OR public.is_admin())))));


--
-- Name: credit_notes Users can view their credit notes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their credit notes" ON public.credit_notes FOR SELECT USING (((customer_id = auth.uid()) OR public.is_admin()));


--
-- Name: support_system Users can view their own support records; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their own support records" ON public.support_system FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: payment_transactions Users can view their own transactions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their own transactions" ON public.payment_transactions FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: credit_note_history View credit note history; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "View credit note history" ON public.credit_note_history FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.credit_notes
  WHERE ((credit_notes.id = credit_note_history.credit_note_id) AND ((credit_notes.customer_id = auth.uid()) OR public.is_admin())))));


--
-- Name: reconciliation_rules View reconciliation rules; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "View reconciliation rules" ON public.reconciliation_rules FOR SELECT USING (public.is_admin());


--
-- Name: authenticated_checkout_sessions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.authenticated_checkout_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: bank_account_details; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.bank_account_details ENABLE ROW LEVEL SECURITY;

--
-- Name: bank_statement_imports; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.bank_statement_imports ENABLE ROW LEVEL SECURITY;

--
-- Name: blog_categories; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: blog_categories blog_categories_delete_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY blog_categories_delete_policy ON public.blog_categories FOR DELETE USING (public.is_admin());


--
-- Name: blog_categories blog_categories_insert_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY blog_categories_insert_policy ON public.blog_categories FOR INSERT WITH CHECK (public.is_admin());


--
-- Name: blog_categories blog_categories_select_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY blog_categories_select_policy ON public.blog_categories FOR SELECT USING (true);


--
-- Name: blog_categories blog_categories_update_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY blog_categories_update_policy ON public.blog_categories FOR UPDATE USING (public.is_admin());


--
-- Name: blog_comments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.blog_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: blog_post_tags; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.blog_post_tags ENABLE ROW LEVEL SECURITY;

--
-- Name: blog_post_tags blog_post_tags_delete_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY blog_post_tags_delete_policy ON public.blog_post_tags FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.blog_posts
  WHERE ((blog_posts.id = blog_post_tags.post_id) AND ((blog_posts.author_id = auth.uid()) OR public.is_admin())))));


--
-- Name: blog_post_tags blog_post_tags_insert_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY blog_post_tags_insert_policy ON public.blog_post_tags FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.blog_posts
  WHERE ((blog_posts.id = blog_post_tags.post_id) AND ((blog_posts.author_id = auth.uid()) OR public.is_admin())))));


--
-- Name: blog_post_tags blog_post_tags_select_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY blog_post_tags_select_policy ON public.blog_post_tags FOR SELECT USING (true);


--
-- Name: blog_post_tags blog_post_tags_update_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY blog_post_tags_update_policy ON public.blog_post_tags FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.blog_posts
  WHERE ((blog_posts.id = blog_post_tags.post_id) AND ((blog_posts.author_id = auth.uid()) OR public.is_admin())))));


--
-- Name: blog_posts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

--
-- Name: blog_posts blog_posts_delete_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY blog_posts_delete_policy ON public.blog_posts FOR DELETE USING (((author_id = auth.uid()) OR public.is_admin()));


--
-- Name: blog_posts blog_posts_insert_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY blog_posts_insert_policy ON public.blog_posts FOR INSERT WITH CHECK (((author_id = auth.uid()) OR public.is_admin()));


--
-- Name: blog_posts blog_posts_select_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY blog_posts_select_policy ON public.blog_posts FOR SELECT USING ((((status)::text = 'published'::text) OR (author_id = auth.uid()) OR public.is_admin()));


--
-- Name: blog_posts blog_posts_update_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY blog_posts_update_policy ON public.blog_posts FOR UPDATE USING (((author_id = auth.uid()) OR public.is_admin()));


--
-- Name: blog_tags; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.blog_tags ENABLE ROW LEVEL SECURITY;

--
-- Name: blog_tags blog_tags_delete_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY blog_tags_delete_policy ON public.blog_tags FOR DELETE USING (public.is_admin());


--
-- Name: blog_tags blog_tags_insert_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY blog_tags_insert_policy ON public.blog_tags FOR INSERT WITH CHECK (public.is_admin());


--
-- Name: blog_tags blog_tags_select_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY blog_tags_select_policy ON public.blog_tags FOR SELECT USING (true);


--
-- Name: blog_tags blog_tags_update_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY blog_tags_update_policy ON public.blog_tags FOR UPDATE USING (public.is_admin());


--
-- Name: consolidation_groups; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.consolidation_groups ENABLE ROW LEVEL SECURITY;

--
-- Name: country_payment_preferences; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.country_payment_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: country_settings; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.country_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: credit_note_applications; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.credit_note_applications ENABLE ROW LEVEL SECURITY;

--
-- Name: credit_note_history; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.credit_note_history ENABLE ROW LEVEL SECURITY;

--
-- Name: credit_notes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_addresses; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;

--
-- Name: customs_categories; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.customs_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: customs_rules; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.customs_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: email_queue; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

--
-- Name: email_settings; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: email_templates; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: email_templates email_templates_management; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY email_templates_management ON public.email_templates USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::text, 'moderator'::text]))))));


--
-- Name: financial_transactions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: gateway_refunds; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.gateway_refunds ENABLE ROW LEVEL SECURITY;

--
-- Name: global_tax_method_preferences; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.global_tax_method_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: guest_checkout_sessions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.guest_checkout_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: messages message_access_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY message_access_policy ON public.messages USING (((sender_id = auth.uid()) OR (recipient_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::text)))) OR ((is_internal = false) AND (EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['moderator'::text, 'admin'::text]))))))));


--
-- Name: messages message_create_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY message_create_policy ON public.messages FOR INSERT WITH CHECK (((sender_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::text))))));


--
-- Name: messages message_update_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY message_update_policy ON public.messages FOR UPDATE USING (((recipient_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::text))))));


--
-- Name: messages; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_activity_log; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.mfa_activity_log ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_configurations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.mfa_configurations ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_sessions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.mfa_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: ml_category_weights; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.ml_category_weights ENABLE ROW LEVEL SECURITY;

--
-- Name: ml_product_weights; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.ml_product_weights ENABLE ROW LEVEL SECURITY;

--
-- Name: ml_training_history; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.ml_training_history ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: oauth_tokens; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.oauth_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: package_events; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.package_events ENABLE ROW LEVEL SECURITY;

--
-- Name: package_notifications; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.package_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: package_photos; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.package_photos ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_adjustments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.payment_adjustments ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_alert_thresholds; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.payment_alert_thresholds ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_error_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.payment_error_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_gateways; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_health_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.payment_health_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_ledger; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.payment_ledger ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_reconciliation; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.payment_reconciliation ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_verification_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.payment_verification_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: paypal_refund_reasons; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.paypal_refund_reasons ENABLE ROW LEVEL SECURITY;

--
-- Name: paypal_refunds; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.paypal_refunds ENABLE ROW LEVEL SECURITY;

--
-- Name: paypal_webhook_events; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.paypal_webhook_events ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: quote_documents; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.quote_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: quote_items; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;

--
-- Name: quote_statuses; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.quote_statuses ENABLE ROW LEVEL SECURITY;

--
-- Name: quote_templates; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.quote_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: quotes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

--
-- Name: received_packages; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.received_packages ENABLE ROW LEVEL SECURITY;

--
-- Name: reconciliation_items; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.reconciliation_items ENABLE ROW LEVEL SECURITY;

--
-- Name: reconciliation_rules; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.reconciliation_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: refund_items; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.refund_items ENABLE ROW LEVEL SECURITY;

--
-- Name: refund_requests; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: rejection_reasons; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.rejection_reasons ENABLE ROW LEVEL SECURITY;

--
-- Name: route_customs_tiers; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.route_customs_tiers ENABLE ROW LEVEL SECURITY;

--
-- Name: share_audit_log; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.share_audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: shipping_routes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.shipping_routes ENABLE ROW LEVEL SECURITY;

--
-- Name: storage_fees; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.storage_fees ENABLE ROW LEVEL SECURITY;

--
-- Name: support_interactions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.support_interactions ENABLE ROW LEVEL SECURITY;

--
-- Name: support_system; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.support_system ENABLE ROW LEVEL SECURITY;

--
-- Name: system_settings; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: tax_calculation_audit_log; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.tax_calculation_audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: user_activity_analytics; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_activity_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: user_addresses; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

--
-- Name: user_oauth_data; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_oauth_data ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: warehouse_locations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.warehouse_locations ENABLE ROW LEVEL SECURITY;

--
-- Name: warehouse_tasks; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.warehouse_tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: webhook_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: supabase_realtime; Type: PUBLICATION; Schema: -; Owner: postgres
--

CREATE PUBLICATION supabase_realtime WITH (publish = 'insert, update, delete, truncate');


ALTER PUBLICATION supabase_realtime OWNER TO postgres;

--
-- Name: supabase_realtime_messages_publication; Type: PUBLICATION; Schema: -; Owner: supabase_admin
--

CREATE PUBLICATION supabase_realtime_messages_publication WITH (publish = 'insert, update, delete, truncate');


ALTER PUBLICATION supabase_realtime_messages_publication OWNER TO supabase_admin;

--
-- Name: SCHEMA net; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA net TO supabase_functions_admin;
GRANT USAGE ON SCHEMA net TO postgres;
GRANT USAGE ON SCHEMA net TO anon;
GRANT USAGE ON SCHEMA net TO authenticated;
GRANT USAGE ON SCHEMA net TO service_role;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION armor(bytea); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.armor(bytea) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.armor(bytea) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION armor(bytea, text[], text[]); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.armor(bytea, text[], text[]) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.armor(bytea, text[], text[]) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION crypt(text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.crypt(text, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.crypt(text, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION dearmor(text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.dearmor(text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.dearmor(text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION decrypt(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.decrypt(bytea, bytea, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.decrypt(bytea, bytea, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION decrypt_iv(bytea, bytea, bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION digest(bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.digest(bytea, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.digest(bytea, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION digest(text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.digest(text, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.digest(text, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION encrypt(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.encrypt(bytea, bytea, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.encrypt(bytea, bytea, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION encrypt_iv(bytea, bytea, bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION gen_random_bytes(integer); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gen_random_bytes(integer) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.gen_random_bytes(integer) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION gen_random_uuid(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gen_random_uuid() TO dashboard_user;
GRANT ALL ON FUNCTION extensions.gen_random_uuid() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION gen_salt(text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gen_salt(text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.gen_salt(text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION gen_salt(text, integer); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gen_salt(text, integer) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.gen_salt(text, integer) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION hmac(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.hmac(bytea, bytea, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.hmac(bytea, bytea, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION hmac(text, text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.hmac(text, text, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.hmac(text, text, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_armor_headers(text, OUT key text, OUT value text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_key_id(bytea); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_key_id(bytea) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_key_id(bytea) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea, text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea, text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_pub_encrypt(text, bytea); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_pub_encrypt(text, bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_pub_encrypt_bytea(bytea, bytea); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_pub_encrypt_bytea(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_sym_decrypt(bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_sym_decrypt(bytea, text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_sym_decrypt_bytea(bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_sym_decrypt_bytea(bytea, text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_sym_encrypt(text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_sym_encrypt(text, text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_sym_encrypt_bytea(bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_sym_encrypt_bytea(bytea, text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION uuid_generate_v1(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.uuid_generate_v1() TO dashboard_user;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION uuid_generate_v1mc(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.uuid_generate_v1mc() TO dashboard_user;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1mc() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION uuid_generate_v3(namespace uuid, name text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.uuid_generate_v3(namespace uuid, name text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.uuid_generate_v3(namespace uuid, name text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION uuid_generate_v4(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.uuid_generate_v4() TO dashboard_user;
GRANT ALL ON FUNCTION extensions.uuid_generate_v4() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION uuid_generate_v5(namespace uuid, name text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.uuid_generate_v5(namespace uuid, name text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.uuid_generate_v5(namespace uuid, name text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION uuid_nil(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.uuid_nil() TO dashboard_user;
GRANT ALL ON FUNCTION extensions.uuid_nil() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION uuid_ns_dns(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.uuid_ns_dns() TO dashboard_user;
GRANT ALL ON FUNCTION extensions.uuid_ns_dns() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION uuid_ns_oid(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.uuid_ns_oid() TO dashboard_user;
GRANT ALL ON FUNCTION extensions.uuid_ns_oid() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION uuid_ns_url(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.uuid_ns_url() TO dashboard_user;
GRANT ALL ON FUNCTION extensions.uuid_ns_url() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION uuid_ns_x500(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.uuid_ns_x500() TO dashboard_user;
GRANT ALL ON FUNCTION extensions.uuid_ns_x500() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION graphql("operationName" text, query text, variables jsonb, extensions jsonb); Type: ACL; Schema: graphql_public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO postgres;
GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO anon;
GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO authenticated;
GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO service_role;


--
-- Name: FUNCTION http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer); Type: ACL; Schema: net; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
GRANT ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin;
GRANT ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO postgres;
GRANT ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO anon;
GRANT ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO authenticated;
GRANT ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO service_role;


--
-- Name: FUNCTION http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer); Type: ACL; Schema: net; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
GRANT ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin;
GRANT ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO postgres;
GRANT ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO anon;
GRANT ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO authenticated;
GRANT ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO service_role;


--
-- Name: FUNCTION get_auth(p_usename text); Type: ACL; Schema: pgbouncer; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION pgbouncer.get_auth(p_usename text) FROM PUBLIC;
GRANT ALL ON FUNCTION pgbouncer.get_auth(p_usename text) TO pgbouncer;
GRANT ALL ON FUNCTION pgbouncer.get_auth(p_usename text) TO postgres;


--
-- Name: FUNCTION add_support_interaction(p_support_id uuid, p_user_id uuid, p_interaction_type character varying, p_content jsonb, p_is_internal boolean); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.add_support_interaction(p_support_id uuid, p_user_id uuid, p_interaction_type character varying, p_content jsonb, p_is_internal boolean) TO anon;
GRANT ALL ON FUNCTION public.add_support_interaction(p_support_id uuid, p_user_id uuid, p_interaction_type character varying, p_content jsonb, p_is_internal boolean) TO authenticated;
GRANT ALL ON FUNCTION public.add_support_interaction(p_support_id uuid, p_user_id uuid, p_interaction_type character varying, p_content jsonb, p_is_internal boolean) TO service_role;


--
-- Name: FUNCTION analyze_tax_method_performance(p_origin_country text, p_destination_country text, p_time_range_days integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.analyze_tax_method_performance(p_origin_country text, p_destination_country text, p_time_range_days integer) TO anon;
GRANT ALL ON FUNCTION public.analyze_tax_method_performance(p_origin_country text, p_destination_country text, p_time_range_days integer) TO authenticated;
GRANT ALL ON FUNCTION public.analyze_tax_method_performance(p_origin_country text, p_destination_country text, p_time_range_days integer) TO service_role;


--
-- Name: FUNCTION apply_credit_note(p_credit_note_id uuid, p_quote_id uuid, p_amount numeric); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.apply_credit_note(p_credit_note_id uuid, p_quote_id uuid, p_amount numeric) TO anon;
GRANT ALL ON FUNCTION public.apply_credit_note(p_credit_note_id uuid, p_quote_id uuid, p_amount numeric) TO authenticated;
GRANT ALL ON FUNCTION public.apply_credit_note(p_credit_note_id uuid, p_quote_id uuid, p_amount numeric) TO service_role;


--
-- Name: FUNCTION approve_refund_request(p_refund_request_id uuid, p_approved_amount numeric, p_notes text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.approve_refund_request(p_refund_request_id uuid, p_approved_amount numeric, p_notes text) TO anon;
GRANT ALL ON FUNCTION public.approve_refund_request(p_refund_request_id uuid, p_approved_amount numeric, p_notes text) TO authenticated;
GRANT ALL ON FUNCTION public.approve_refund_request(p_refund_request_id uuid, p_approved_amount numeric, p_notes text) TO service_role;


--
-- Name: FUNCTION auto_match_transactions(p_reconciliation_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.auto_match_transactions(p_reconciliation_id uuid) TO anon;
GRANT ALL ON FUNCTION public.auto_match_transactions(p_reconciliation_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.auto_match_transactions(p_reconciliation_id uuid) TO service_role;


--
-- Name: FUNCTION before_address_insert(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.before_address_insert() TO anon;
GRANT ALL ON FUNCTION public.before_address_insert() TO authenticated;
GRANT ALL ON FUNCTION public.before_address_insert() TO service_role;


--
-- Name: FUNCTION bulk_update_tax_methods(p_quote_ids text[], p_admin_id text, p_calculation_method text, p_change_reason text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.bulk_update_tax_methods(p_quote_ids text[], p_admin_id text, p_calculation_method text, p_change_reason text) TO anon;
GRANT ALL ON FUNCTION public.bulk_update_tax_methods(p_quote_ids text[], p_admin_id text, p_calculation_method text, p_change_reason text) TO authenticated;
GRANT ALL ON FUNCTION public.bulk_update_tax_methods(p_quote_ids text[], p_admin_id text, p_calculation_method text, p_change_reason text) TO service_role;


--
-- Name: FUNCTION calculate_storage_fees(package_id uuid, end_date date); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.calculate_storage_fees(package_id uuid, end_date date) TO anon;
GRANT ALL ON FUNCTION public.calculate_storage_fees(package_id uuid, end_date date) TO authenticated;
GRANT ALL ON FUNCTION public.calculate_storage_fees(package_id uuid, end_date date) TO service_role;


--
-- Name: FUNCTION cleanup_expired_authenticated_checkout_sessions(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.cleanup_expired_authenticated_checkout_sessions() TO anon;
GRANT ALL ON FUNCTION public.cleanup_expired_authenticated_checkout_sessions() TO authenticated;
GRANT ALL ON FUNCTION public.cleanup_expired_authenticated_checkout_sessions() TO service_role;


--
-- Name: FUNCTION cleanup_expired_guest_sessions(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.cleanup_expired_guest_sessions() TO anon;
GRANT ALL ON FUNCTION public.cleanup_expired_guest_sessions() TO authenticated;
GRANT ALL ON FUNCTION public.cleanup_expired_guest_sessions() TO service_role;


--
-- Name: FUNCTION cleanup_expired_mfa_sessions(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.cleanup_expired_mfa_sessions() TO anon;
GRANT ALL ON FUNCTION public.cleanup_expired_mfa_sessions() TO authenticated;
GRANT ALL ON FUNCTION public.cleanup_expired_mfa_sessions() TO service_role;


--
-- Name: FUNCTION cleanup_expired_notifications(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.cleanup_expired_notifications() TO anon;
GRANT ALL ON FUNCTION public.cleanup_expired_notifications() TO authenticated;
GRANT ALL ON FUNCTION public.cleanup_expired_notifications() TO service_role;


--
-- Name: FUNCTION cleanup_expired_oauth_tokens(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.cleanup_expired_oauth_tokens() TO anon;
GRANT ALL ON FUNCTION public.cleanup_expired_oauth_tokens() TO authenticated;
GRANT ALL ON FUNCTION public.cleanup_expired_oauth_tokens() TO service_role;


--
-- Name: FUNCTION cleanup_old_activity_data(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.cleanup_old_activity_data() TO anon;
GRANT ALL ON FUNCTION public.cleanup_old_activity_data() TO authenticated;
GRANT ALL ON FUNCTION public.cleanup_old_activity_data() TO service_role;


--
-- Name: FUNCTION cleanup_old_payment_error_logs(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.cleanup_old_payment_error_logs() TO anon;
GRANT ALL ON FUNCTION public.cleanup_old_payment_error_logs() TO authenticated;
GRANT ALL ON FUNCTION public.cleanup_old_payment_error_logs() TO service_role;


--
-- Name: FUNCTION cleanup_old_payment_health_logs(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.cleanup_old_payment_health_logs() TO anon;
GRANT ALL ON FUNCTION public.cleanup_old_payment_health_logs() TO authenticated;
GRANT ALL ON FUNCTION public.cleanup_old_payment_health_logs() TO service_role;


--
-- Name: FUNCTION cleanup_old_payment_verification_logs(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.cleanup_old_payment_verification_logs() TO anon;
GRANT ALL ON FUNCTION public.cleanup_old_payment_verification_logs() TO authenticated;
GRANT ALL ON FUNCTION public.cleanup_old_payment_verification_logs() TO service_role;


--
-- Name: FUNCTION cleanup_old_webhook_logs(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.cleanup_old_webhook_logs() TO anon;
GRANT ALL ON FUNCTION public.cleanup_old_webhook_logs() TO authenticated;
GRANT ALL ON FUNCTION public.cleanup_old_webhook_logs() TO service_role;


--
-- Name: FUNCTION complete_reconciliation(p_reconciliation_id uuid, p_notes text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.complete_reconciliation(p_reconciliation_id uuid, p_notes text) TO anon;
GRANT ALL ON FUNCTION public.complete_reconciliation(p_reconciliation_id uuid, p_notes text) TO authenticated;
GRANT ALL ON FUNCTION public.complete_reconciliation(p_reconciliation_id uuid, p_notes text) TO service_role;


--
-- Name: FUNCTION confirm_backup_codes_saved(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.confirm_backup_codes_saved() TO anon;
GRANT ALL ON FUNCTION public.confirm_backup_codes_saved() TO authenticated;
GRANT ALL ON FUNCTION public.confirm_backup_codes_saved() TO service_role;


--
-- Name: FUNCTION confirm_payment_from_proof(p_quote_id uuid, p_amount_paid numeric, p_payment_status text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.confirm_payment_from_proof(p_quote_id uuid, p_amount_paid numeric, p_payment_status text) TO anon;
GRANT ALL ON FUNCTION public.confirm_payment_from_proof(p_quote_id uuid, p_amount_paid numeric, p_payment_status text) TO authenticated;
GRANT ALL ON FUNCTION public.confirm_payment_from_proof(p_quote_id uuid, p_amount_paid numeric, p_payment_status text) TO service_role;


--
-- Name: FUNCTION convert_minimum_valuation_usd_to_origin(usd_amount numeric, origin_country text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.convert_minimum_valuation_usd_to_origin(usd_amount numeric, origin_country text) TO anon;
GRANT ALL ON FUNCTION public.convert_minimum_valuation_usd_to_origin(usd_amount numeric, origin_country text) TO authenticated;
GRANT ALL ON FUNCTION public.convert_minimum_valuation_usd_to_origin(usd_amount numeric, origin_country text) TO service_role;


--
-- Name: FUNCTION create_credit_note(p_customer_id uuid, p_amount numeric, p_currency text, p_reason text, p_description text, p_quote_id uuid, p_refund_request_id uuid, p_valid_days integer, p_minimum_order_value numeric, p_auto_approve boolean); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.create_credit_note(p_customer_id uuid, p_amount numeric, p_currency text, p_reason text, p_description text, p_quote_id uuid, p_refund_request_id uuid, p_valid_days integer, p_minimum_order_value numeric, p_auto_approve boolean) TO anon;
GRANT ALL ON FUNCTION public.create_credit_note(p_customer_id uuid, p_amount numeric, p_currency text, p_reason text, p_description text, p_quote_id uuid, p_refund_request_id uuid, p_valid_days integer, p_minimum_order_value numeric, p_auto_approve boolean) TO authenticated;
GRANT ALL ON FUNCTION public.create_credit_note(p_customer_id uuid, p_amount numeric, p_currency text, p_reason text, p_description text, p_quote_id uuid, p_refund_request_id uuid, p_valid_days integer, p_minimum_order_value numeric, p_auto_approve boolean) TO service_role;


--
-- Name: FUNCTION create_mfa_session_after_setup(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.create_mfa_session_after_setup() TO anon;
GRANT ALL ON FUNCTION public.create_mfa_session_after_setup() TO authenticated;
GRANT ALL ON FUNCTION public.create_mfa_session_after_setup() TO service_role;


--
-- Name: FUNCTION create_payment_ledger_entry_trigger(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.create_payment_ledger_entry_trigger() TO anon;
GRANT ALL ON FUNCTION public.create_payment_ledger_entry_trigger() TO authenticated;
GRANT ALL ON FUNCTION public.create_payment_ledger_entry_trigger() TO service_role;


--
-- Name: FUNCTION create_payment_with_ledger_entry(p_quote_id uuid, p_amount numeric, p_currency text, p_payment_method text, p_payment_type text, p_reference_number text, p_gateway_code text, p_gateway_transaction_id text, p_notes text, p_user_id uuid, p_message_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.create_payment_with_ledger_entry(p_quote_id uuid, p_amount numeric, p_currency text, p_payment_method text, p_payment_type text, p_reference_number text, p_gateway_code text, p_gateway_transaction_id text, p_notes text, p_user_id uuid, p_message_id uuid) TO anon;
GRANT ALL ON FUNCTION public.create_payment_with_ledger_entry(p_quote_id uuid, p_amount numeric, p_currency text, p_payment_method text, p_payment_type text, p_reference_number text, p_gateway_code text, p_gateway_transaction_id text, p_notes text, p_user_id uuid, p_message_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.create_payment_with_ledger_entry(p_quote_id uuid, p_amount numeric, p_currency text, p_payment_method text, p_payment_type text, p_reference_number text, p_gateway_code text, p_gateway_transaction_id text, p_notes text, p_user_id uuid, p_message_id uuid) TO service_role;


--
-- Name: FUNCTION create_refund_request(p_quote_id uuid, p_refund_type text, p_amount numeric, p_currency text, p_reason_code text, p_reason_description text, p_customer_notes text, p_internal_notes text, p_refund_method text, p_payment_ids uuid[]); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.create_refund_request(p_quote_id uuid, p_refund_type text, p_amount numeric, p_currency text, p_reason_code text, p_reason_description text, p_customer_notes text, p_internal_notes text, p_refund_method text, p_payment_ids uuid[]) TO anon;
GRANT ALL ON FUNCTION public.create_refund_request(p_quote_id uuid, p_refund_type text, p_amount numeric, p_currency text, p_reason_code text, p_reason_description text, p_customer_notes text, p_internal_notes text, p_refund_method text, p_payment_ids uuid[]) TO authenticated;
GRANT ALL ON FUNCTION public.create_refund_request(p_quote_id uuid, p_refund_type text, p_amount numeric, p_currency text, p_reason_code text, p_reason_description text, p_customer_notes text, p_internal_notes text, p_refund_method text, p_payment_ids uuid[]) TO service_role;


--
-- Name: FUNCTION disable_mfa(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.disable_mfa() TO anon;
GRANT ALL ON FUNCTION public.disable_mfa() TO authenticated;
GRANT ALL ON FUNCTION public.disable_mfa() TO service_role;


--
-- Name: FUNCTION encode_base32(data bytea); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.encode_base32(data bytea) TO anon;
GRANT ALL ON FUNCTION public.encode_base32(data bytea) TO authenticated;
GRANT ALL ON FUNCTION public.encode_base32(data bytea) TO service_role;


--
-- Name: FUNCTION ensure_user_profile(_user_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.ensure_user_profile(_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.ensure_user_profile(_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.ensure_user_profile(_user_id uuid) TO service_role;


--
-- Name: FUNCTION ensure_user_profile_exists(_user_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.ensure_user_profile_exists(_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.ensure_user_profile_exists(_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.ensure_user_profile_exists(_user_id uuid) TO service_role;


--
-- Name: FUNCTION ensure_user_profile_with_oauth(_user_id uuid, _user_metadata jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.ensure_user_profile_with_oauth(_user_id uuid, _user_metadata jsonb) TO anon;
GRANT ALL ON FUNCTION public.ensure_user_profile_with_oauth(_user_id uuid, _user_metadata jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.ensure_user_profile_with_oauth(_user_id uuid, _user_metadata jsonb) TO service_role;


--
-- Name: FUNCTION expire_quotes(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.expire_quotes() TO anon;
GRANT ALL ON FUNCTION public.expire_quotes() TO authenticated;
GRANT ALL ON FUNCTION public.expire_quotes() TO service_role;


--
-- Name: FUNCTION extract_oauth_phone_to_auth_users(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.extract_oauth_phone_to_auth_users() TO anon;
GRANT ALL ON FUNCTION public.extract_oauth_phone_to_auth_users() TO authenticated;
GRANT ALL ON FUNCTION public.extract_oauth_phone_to_auth_users() TO service_role;


--
-- Name: FUNCTION extract_oauth_user_info(user_metadata jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.extract_oauth_user_info(user_metadata jsonb) TO anon;
GRANT ALL ON FUNCTION public.extract_oauth_user_info(user_metadata jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.extract_oauth_user_info(user_metadata jsonb) TO service_role;


--
-- Name: FUNCTION force_update_payment(p_quote_id uuid, new_amount_paid numeric, new_payment_status text, payment_method text, reference_number text, notes text, payment_currency text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.force_update_payment(p_quote_id uuid, new_amount_paid numeric, new_payment_status text, payment_method text, reference_number text, notes text, payment_currency text) TO anon;
GRANT ALL ON FUNCTION public.force_update_payment(p_quote_id uuid, new_amount_paid numeric, new_payment_status text, payment_method text, reference_number text, notes text, payment_currency text) TO authenticated;
GRANT ALL ON FUNCTION public.force_update_payment(p_quote_id uuid, new_amount_paid numeric, new_payment_status text, payment_method text, reference_number text, notes text, payment_currency text) TO service_role;


--
-- Name: FUNCTION generate_backup_codes(p_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.generate_backup_codes(p_count integer) TO anon;
GRANT ALL ON FUNCTION public.generate_backup_codes(p_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.generate_backup_codes(p_count integer) TO service_role;


--
-- Name: FUNCTION generate_credit_note_number(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.generate_credit_note_number() TO anon;
GRANT ALL ON FUNCTION public.generate_credit_note_number() TO authenticated;
GRANT ALL ON FUNCTION public.generate_credit_note_number() TO service_role;


--
-- Name: FUNCTION generate_display_id(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.generate_display_id() TO anon;
GRANT ALL ON FUNCTION public.generate_display_id() TO authenticated;
GRANT ALL ON FUNCTION public.generate_display_id() TO service_role;


--
-- Name: FUNCTION generate_iwish_tracking_id(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.generate_iwish_tracking_id() TO anon;
GRANT ALL ON FUNCTION public.generate_iwish_tracking_id() TO authenticated;
GRANT ALL ON FUNCTION public.generate_iwish_tracking_id() TO service_role;


--
-- Name: FUNCTION generate_payment_link_code(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.generate_payment_link_code() TO anon;
GRANT ALL ON FUNCTION public.generate_payment_link_code() TO authenticated;
GRANT ALL ON FUNCTION public.generate_payment_link_code() TO service_role;


--
-- Name: FUNCTION generate_share_token(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.generate_share_token() TO anon;
GRANT ALL ON FUNCTION public.generate_share_token() TO authenticated;
GRANT ALL ON FUNCTION public.generate_share_token() TO service_role;


--
-- Name: FUNCTION generate_suite_number(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.generate_suite_number() TO anon;
GRANT ALL ON FUNCTION public.generate_suite_number() TO authenticated;
GRANT ALL ON FUNCTION public.generate_suite_number() TO service_role;


--
-- Name: FUNCTION generate_verification_token(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.generate_verification_token() TO anon;
GRANT ALL ON FUNCTION public.generate_verification_token() TO authenticated;
GRANT ALL ON FUNCTION public.generate_verification_token() TO service_role;


--
-- Name: FUNCTION get_active_payment_link_for_quote(quote_uuid uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_active_payment_link_for_quote(quote_uuid uuid) TO anon;
GRANT ALL ON FUNCTION public.get_active_payment_link_for_quote(quote_uuid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_active_payment_link_for_quote(quote_uuid uuid) TO service_role;


--
-- Name: FUNCTION get_all_user_emails(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_all_user_emails() TO anon;
GRANT ALL ON FUNCTION public.get_all_user_emails() TO authenticated;
GRANT ALL ON FUNCTION public.get_all_user_emails() TO service_role;


--
-- Name: FUNCTION get_available_credit_notes(p_customer_id uuid, p_min_amount numeric); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_available_credit_notes(p_customer_id uuid, p_min_amount numeric) TO anon;
GRANT ALL ON FUNCTION public.get_available_credit_notes(p_customer_id uuid, p_min_amount numeric) TO authenticated;
GRANT ALL ON FUNCTION public.get_available_credit_notes(p_customer_id uuid, p_min_amount numeric) TO service_role;


--
-- Name: TABLE bank_account_details; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.bank_account_details TO anon;
GRANT ALL ON TABLE public.bank_account_details TO authenticated;
GRANT ALL ON TABLE public.bank_account_details TO service_role;


--
-- Name: FUNCTION get_bank_account_for_order(p_country_code text, p_destination_country text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_bank_account_for_order(p_country_code text, p_destination_country text) TO anon;
GRANT ALL ON FUNCTION public.get_bank_account_for_order(p_country_code text, p_destination_country text) TO authenticated;
GRANT ALL ON FUNCTION public.get_bank_account_for_order(p_country_code text, p_destination_country text) TO service_role;


--
-- Name: FUNCTION get_bank_details_for_email(payment_currency text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_bank_details_for_email(payment_currency text) TO anon;
GRANT ALL ON FUNCTION public.get_bank_details_for_email(payment_currency text) TO authenticated;
GRANT ALL ON FUNCTION public.get_bank_details_for_email(payment_currency text) TO service_role;


--
-- Name: FUNCTION get_currency_conversion_metrics(start_date timestamp with time zone, end_date timestamp with time zone); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_currency_conversion_metrics(start_date timestamp with time zone, end_date timestamp with time zone) TO anon;
GRANT ALL ON FUNCTION public.get_currency_conversion_metrics(start_date timestamp with time zone, end_date timestamp with time zone) TO authenticated;
GRANT ALL ON FUNCTION public.get_currency_conversion_metrics(start_date timestamp with time zone, end_date timestamp with time zone) TO service_role;


--
-- Name: FUNCTION get_currency_mismatches(start_date timestamp with time zone, end_date timestamp with time zone); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_currency_mismatches(start_date timestamp with time zone, end_date timestamp with time zone) TO anon;
GRANT ALL ON FUNCTION public.get_currency_mismatches(start_date timestamp with time zone, end_date timestamp with time zone) TO authenticated;
GRANT ALL ON FUNCTION public.get_currency_mismatches(start_date timestamp with time zone, end_date timestamp with time zone) TO service_role;


--
-- Name: FUNCTION get_currency_statistics(start_date timestamp with time zone, end_date timestamp with time zone); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_currency_statistics(start_date timestamp with time zone, end_date timestamp with time zone) TO anon;
GRANT ALL ON FUNCTION public.get_currency_statistics(start_date timestamp with time zone, end_date timestamp with time zone) TO authenticated;
GRANT ALL ON FUNCTION public.get_currency_statistics(start_date timestamp with time zone, end_date timestamp with time zone) TO service_role;


--
-- Name: FUNCTION get_effective_tax_method(quote_id_param uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_effective_tax_method(quote_id_param uuid) TO anon;
GRANT ALL ON FUNCTION public.get_effective_tax_method(quote_id_param uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_effective_tax_method(quote_id_param uuid) TO service_role;


--
-- Name: FUNCTION get_exchange_rate_health(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_exchange_rate_health() TO anon;
GRANT ALL ON FUNCTION public.get_exchange_rate_health() TO authenticated;
GRANT ALL ON FUNCTION public.get_exchange_rate_health() TO service_role;


--
-- Name: FUNCTION get_hsn_with_currency_conversion(hsn_code_param text, origin_country_param text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_hsn_with_currency_conversion(hsn_code_param text, origin_country_param text) TO anon;
GRANT ALL ON FUNCTION public.get_hsn_with_currency_conversion(hsn_code_param text, origin_country_param text) TO authenticated;
GRANT ALL ON FUNCTION public.get_hsn_with_currency_conversion(hsn_code_param text, origin_country_param text) TO service_role;


--
-- Name: FUNCTION get_mfa_status(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_mfa_status() TO anon;
GRANT ALL ON FUNCTION public.get_mfa_status() TO authenticated;
GRANT ALL ON FUNCTION public.get_mfa_status() TO service_role;


--
-- Name: FUNCTION get_optimal_storage_location(suite_number text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_optimal_storage_location(suite_number text) TO anon;
GRANT ALL ON FUNCTION public.get_optimal_storage_location(suite_number text) TO authenticated;
GRANT ALL ON FUNCTION public.get_optimal_storage_location(suite_number text) TO service_role;


--
-- Name: FUNCTION get_orders_with_payment_proofs(status_filter text, limit_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_orders_with_payment_proofs(status_filter text, limit_count integer) TO anon;
GRANT ALL ON FUNCTION public.get_orders_with_payment_proofs(status_filter text, limit_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.get_orders_with_payment_proofs(status_filter text, limit_count integer) TO service_role;


--
-- Name: FUNCTION get_payment_history(p_quote_id uuid, p_customer_id uuid, p_start_date date, p_end_date date); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_payment_history(p_quote_id uuid, p_customer_id uuid, p_start_date date, p_end_date date) TO anon;
GRANT ALL ON FUNCTION public.get_payment_history(p_quote_id uuid, p_customer_id uuid, p_start_date date, p_end_date date) TO authenticated;
GRANT ALL ON FUNCTION public.get_payment_history(p_quote_id uuid, p_customer_id uuid, p_start_date date, p_end_date date) TO service_role;


--
-- Name: FUNCTION get_payment_proof_stats(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_payment_proof_stats() TO anon;
GRANT ALL ON FUNCTION public.get_payment_proof_stats() TO authenticated;
GRANT ALL ON FUNCTION public.get_payment_proof_stats() TO service_role;


--
-- Name: FUNCTION get_popular_posts(limit_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_popular_posts(limit_count integer) TO anon;
GRANT ALL ON FUNCTION public.get_popular_posts(limit_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.get_popular_posts(limit_count integer) TO service_role;


--
-- Name: TABLE quotes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.quotes TO anon;
GRANT ALL ON TABLE public.quotes TO authenticated;
GRANT ALL ON TABLE public.quotes TO service_role;


--
-- Name: FUNCTION get_quote_items(quote_row public.quotes); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_quote_items(quote_row public.quotes) TO anon;
GRANT ALL ON FUNCTION public.get_quote_items(quote_row public.quotes) TO authenticated;
GRANT ALL ON FUNCTION public.get_quote_items(quote_row public.quotes) TO service_role;


--
-- Name: FUNCTION get_quote_message_thread(p_quote_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_quote_message_thread(p_quote_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_quote_message_thread(p_quote_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_quote_message_thread(p_quote_id uuid) TO service_role;


--
-- Name: FUNCTION get_related_posts(post_slug text, limit_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_related_posts(post_slug text, limit_count integer) TO anon;
GRANT ALL ON FUNCTION public.get_related_posts(post_slug text, limit_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.get_related_posts(post_slug text, limit_count integer) TO service_role;


--
-- Name: FUNCTION get_shipping_cost(p_origin_country character varying, p_destination_country character varying, p_weight numeric, p_price numeric); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_shipping_cost(p_origin_country character varying, p_destination_country character varying, p_weight numeric, p_price numeric) TO anon;
GRANT ALL ON FUNCTION public.get_shipping_cost(p_origin_country character varying, p_destination_country character varying, p_weight numeric, p_price numeric) TO authenticated;
GRANT ALL ON FUNCTION public.get_shipping_cost(p_origin_country character varying, p_destination_country character varying, p_weight numeric, p_price numeric) TO service_role;


--
-- Name: FUNCTION get_shipping_options(quote_row public.quotes); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_shipping_options(quote_row public.quotes) TO anon;
GRANT ALL ON FUNCTION public.get_shipping_options(quote_row public.quotes) TO authenticated;
GRANT ALL ON FUNCTION public.get_shipping_options(quote_row public.quotes) TO service_role;


--
-- Name: FUNCTION get_suspicious_payment_amounts(start_date timestamp with time zone, end_date timestamp with time zone, tolerance numeric); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_suspicious_payment_amounts(start_date timestamp with time zone, end_date timestamp with time zone, tolerance numeric) TO anon;
GRANT ALL ON FUNCTION public.get_suspicious_payment_amounts(start_date timestamp with time zone, end_date timestamp with time zone, tolerance numeric) TO authenticated;
GRANT ALL ON FUNCTION public.get_suspicious_payment_amounts(start_date timestamp with time zone, end_date timestamp with time zone, tolerance numeric) TO service_role;


--
-- Name: FUNCTION get_tax_method_recommendations(p_origin_country text, p_destination_country text, p_analysis_days integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_tax_method_recommendations(p_origin_country text, p_destination_country text, p_analysis_days integer) TO anon;
GRANT ALL ON FUNCTION public.get_tax_method_recommendations(p_origin_country text, p_destination_country text, p_analysis_days integer) TO authenticated;
GRANT ALL ON FUNCTION public.get_tax_method_recommendations(p_origin_country text, p_destination_country text, p_analysis_days integer) TO service_role;


--
-- Name: FUNCTION get_timeline(quote_row public.quotes); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_timeline(quote_row public.quotes) TO anon;
GRANT ALL ON FUNCTION public.get_timeline(quote_row public.quotes) TO authenticated;
GRANT ALL ON FUNCTION public.get_timeline(quote_row public.quotes) TO service_role;


--
-- Name: FUNCTION get_transaction_refund_eligibility(transaction_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_transaction_refund_eligibility(transaction_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_transaction_refund_eligibility(transaction_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_transaction_refund_eligibility(transaction_id uuid) TO service_role;


--
-- Name: FUNCTION get_unread_message_count(p_quote_id uuid, p_user_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_unread_message_count(p_quote_id uuid, p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_unread_message_count(p_quote_id uuid, p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_unread_message_count(p_quote_id uuid, p_user_id uuid) TO service_role;


--
-- Name: FUNCTION get_unread_notification_count(target_user_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_unread_notification_count(target_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_unread_notification_count(target_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_unread_notification_count(target_user_id uuid) TO service_role;


--
-- Name: FUNCTION get_user_activity_summary(target_user_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_user_activity_summary(target_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_user_activity_summary(target_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_user_activity_summary(target_user_id uuid) TO service_role;


--
-- Name: FUNCTION get_user_bank_accounts(user_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_user_bank_accounts(user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_user_bank_accounts(user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_user_bank_accounts(user_id uuid) TO service_role;


--
-- Name: FUNCTION get_user_permissions_new(user_uuid uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_user_permissions_new(user_uuid uuid) TO anon;
GRANT ALL ON FUNCTION public.get_user_permissions_new(user_uuid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_user_permissions_new(user_uuid uuid) TO service_role;


--
-- Name: FUNCTION get_user_roles_new(user_uuid uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_user_roles_new(user_uuid uuid) TO anon;
GRANT ALL ON FUNCTION public.get_user_roles_new(user_uuid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_user_roles_new(user_uuid uuid) TO service_role;


--
-- Name: FUNCTION handle_default_address(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.handle_default_address() TO anon;
GRANT ALL ON FUNCTION public.handle_default_address() TO authenticated;
GRANT ALL ON FUNCTION public.handle_default_address() TO service_role;


--
-- Name: FUNCTION handle_mfa_failure(p_user_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.handle_mfa_failure(p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.handle_mfa_failure(p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.handle_mfa_failure(p_user_id uuid) TO service_role;


--
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.handle_new_user() TO anon;
GRANT ALL ON FUNCTION public.handle_new_user() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;
GRANT ALL ON FUNCTION public.handle_new_user() TO supabase_auth_admin;


--
-- Name: FUNCTION has_any_role(roles public.app_role[]); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.has_any_role(roles public.app_role[]) TO anon;
GRANT ALL ON FUNCTION public.has_any_role(roles public.app_role[]) TO authenticated;
GRANT ALL ON FUNCTION public.has_any_role(roles public.app_role[]) TO service_role;


--
-- Name: FUNCTION has_role(role_name text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.has_role(role_name text) TO anon;
GRANT ALL ON FUNCTION public.has_role(role_name text) TO authenticated;
GRANT ALL ON FUNCTION public.has_role(role_name text) TO service_role;


--
-- Name: FUNCTION has_role(_user_id uuid, _role public.app_role); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO anon;
GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO authenticated;
GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO service_role;


--
-- Name: FUNCTION increment_post_views(post_slug text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.increment_post_views(post_slug text) TO anon;
GRANT ALL ON FUNCTION public.increment_post_views(post_slug text) TO authenticated;
GRANT ALL ON FUNCTION public.increment_post_views(post_slug text) TO service_role;


--
-- Name: FUNCTION initiate_quote_email_verification(p_quote_id uuid, p_email text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.initiate_quote_email_verification(p_quote_id uuid, p_email text) TO anon;
GRANT ALL ON FUNCTION public.initiate_quote_email_verification(p_quote_id uuid, p_email text) TO authenticated;
GRANT ALL ON FUNCTION public.initiate_quote_email_verification(p_quote_id uuid, p_email text) TO service_role;


--
-- Name: FUNCTION is_admin(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.is_admin() TO anon;
GRANT ALL ON FUNCTION public.is_admin() TO authenticated;
GRANT ALL ON FUNCTION public.is_admin() TO service_role;


--
-- Name: FUNCTION is_authenticated(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.is_authenticated() TO anon;
GRANT ALL ON FUNCTION public.is_authenticated() TO authenticated;
GRANT ALL ON FUNCTION public.is_authenticated() TO service_role;


--
-- Name: FUNCTION lock_address_after_payment(quote_uuid uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.lock_address_after_payment(quote_uuid uuid) TO anon;
GRANT ALL ON FUNCTION public.lock_address_after_payment(quote_uuid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.lock_address_after_payment(quote_uuid uuid) TO service_role;


--
-- Name: FUNCTION log_address_change(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.log_address_change() TO anon;
GRANT ALL ON FUNCTION public.log_address_change() TO authenticated;
GRANT ALL ON FUNCTION public.log_address_change() TO service_role;


--
-- Name: FUNCTION log_quote_status_change(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.log_quote_status_change() TO anon;
GRANT ALL ON FUNCTION public.log_quote_status_change() TO authenticated;
GRANT ALL ON FUNCTION public.log_quote_status_change() TO service_role;


--
-- Name: FUNCTION log_share_action(p_quote_id uuid, p_user_id uuid, p_action character varying, p_ip_address inet, p_user_agent text, p_details jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.log_share_action(p_quote_id uuid, p_user_id uuid, p_action character varying, p_ip_address inet, p_user_agent text, p_details jsonb) TO anon;
GRANT ALL ON FUNCTION public.log_share_action(p_quote_id uuid, p_user_id uuid, p_action character varying, p_ip_address inet, p_user_agent text, p_details jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.log_share_action(p_quote_id uuid, p_user_id uuid, p_action character varying, p_ip_address inet, p_user_agent text, p_details jsonb) TO service_role;


--
-- Name: FUNCTION log_tax_method_change(p_quote_id uuid, p_admin_id uuid, p_calculation_method text, p_valuation_method text, p_change_reason text, p_change_details jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.log_tax_method_change(p_quote_id uuid, p_admin_id uuid, p_calculation_method text, p_valuation_method text, p_change_reason text, p_change_details jsonb) TO anon;
GRANT ALL ON FUNCTION public.log_tax_method_change(p_quote_id uuid, p_admin_id uuid, p_calculation_method text, p_valuation_method text, p_change_reason text, p_change_details jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.log_tax_method_change(p_quote_id uuid, p_admin_id uuid, p_calculation_method text, p_valuation_method text, p_change_reason text, p_change_details jsonb) TO service_role;


--
-- Name: FUNCTION mark_all_notifications_read(target_user_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.mark_all_notifications_read(target_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.mark_all_notifications_read(target_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.mark_all_notifications_read(target_user_id uuid) TO service_role;


--
-- Name: FUNCTION mark_messages_as_read(p_message_ids uuid[]); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.mark_messages_as_read(p_message_ids uuid[]) TO anon;
GRANT ALL ON FUNCTION public.mark_messages_as_read(p_message_ids uuid[]) TO authenticated;
GRANT ALL ON FUNCTION public.mark_messages_as_read(p_message_ids uuid[]) TO service_role;


--
-- Name: FUNCTION post_financial_transaction(p_transaction_id uuid, p_user_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.post_financial_transaction(p_transaction_id uuid, p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.post_financial_transaction(p_transaction_id uuid, p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.post_financial_transaction(p_transaction_id uuid, p_user_id uuid) TO service_role;


--
-- Name: FUNCTION process_payment_webhook_atomic(p_quote_ids text[], p_payment_status text, p_payment_data jsonb, p_guest_session_token text, p_guest_session_data jsonb, p_create_order boolean); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.process_payment_webhook_atomic(p_quote_ids text[], p_payment_status text, p_payment_data jsonb, p_guest_session_token text, p_guest_session_data jsonb, p_create_order boolean) TO anon;
GRANT ALL ON FUNCTION public.process_payment_webhook_atomic(p_quote_ids text[], p_payment_status text, p_payment_data jsonb, p_guest_session_token text, p_guest_session_data jsonb, p_create_order boolean) TO authenticated;
GRANT ALL ON FUNCTION public.process_payment_webhook_atomic(p_quote_ids text[], p_payment_status text, p_payment_data jsonb, p_guest_session_token text, p_guest_session_data jsonb, p_create_order boolean) TO service_role;


--
-- Name: FUNCTION process_refund_atomic(p_quote_id uuid, p_refund_amount numeric, p_refund_data jsonb, p_gateway_response jsonb, p_processed_by uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.process_refund_atomic(p_quote_id uuid, p_refund_amount numeric, p_refund_data jsonb, p_gateway_response jsonb, p_processed_by uuid) TO anon;
GRANT ALL ON FUNCTION public.process_refund_atomic(p_quote_id uuid, p_refund_amount numeric, p_refund_data jsonb, p_gateway_response jsonb, p_processed_by uuid) TO authenticated;
GRANT ALL ON FUNCTION public.process_refund_atomic(p_quote_id uuid, p_refund_amount numeric, p_refund_data jsonb, p_gateway_response jsonb, p_processed_by uuid) TO service_role;


--
-- Name: FUNCTION process_refund_item(p_refund_item_id uuid, p_gateway_refund_id text, p_gateway_response jsonb, p_status text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.process_refund_item(p_refund_item_id uuid, p_gateway_refund_id text, p_gateway_response jsonb, p_status text) TO anon;
GRANT ALL ON FUNCTION public.process_refund_item(p_refund_item_id uuid, p_gateway_refund_id text, p_gateway_response jsonb, p_status text) TO authenticated;
GRANT ALL ON FUNCTION public.process_refund_item(p_refund_item_id uuid, p_gateway_refund_id text, p_gateway_response jsonb, p_status text) TO service_role;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;


--
-- Name: FUNCTION profiles_quotes(public.profiles); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.profiles_quotes(public.profiles) TO anon;
GRANT ALL ON FUNCTION public.profiles_quotes(public.profiles) TO authenticated;
GRANT ALL ON FUNCTION public.profiles_quotes(public.profiles) TO service_role;


--
-- Name: FUNCTION quotes_profile(public.quotes); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.quotes_profile(public.quotes) TO anon;
GRANT ALL ON FUNCTION public.quotes_profile(public.quotes) TO authenticated;
GRANT ALL ON FUNCTION public.quotes_profile(public.quotes) TO service_role;


--
-- Name: FUNCTION record_payment_with_ledger_and_triggers(p_quote_id uuid, p_amount numeric, p_currency text, p_payment_method text, p_transaction_reference text, p_notes text, p_recorded_by uuid, p_payment_date date); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.record_payment_with_ledger_and_triggers(p_quote_id uuid, p_amount numeric, p_currency text, p_payment_method text, p_transaction_reference text, p_notes text, p_recorded_by uuid, p_payment_date date) TO anon;
GRANT ALL ON FUNCTION public.record_payment_with_ledger_and_triggers(p_quote_id uuid, p_amount numeric, p_currency text, p_payment_method text, p_transaction_reference text, p_notes text, p_recorded_by uuid, p_payment_date date) TO authenticated;
GRANT ALL ON FUNCTION public.record_payment_with_ledger_and_triggers(p_quote_id uuid, p_amount numeric, p_currency text, p_payment_method text, p_transaction_reference text, p_notes text, p_recorded_by uuid, p_payment_date date) TO service_role;


--
-- Name: FUNCTION record_paypal_payment_to_ledger(p_quote_id uuid, p_transaction_id uuid, p_amount numeric, p_currency text, p_order_id text, p_capture_id text, p_payer_email text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.record_paypal_payment_to_ledger(p_quote_id uuid, p_transaction_id uuid, p_amount numeric, p_currency text, p_order_id text, p_capture_id text, p_payer_email text) TO anon;
GRANT ALL ON FUNCTION public.record_paypal_payment_to_ledger(p_quote_id uuid, p_transaction_id uuid, p_amount numeric, p_currency text, p_order_id text, p_capture_id text, p_payer_email text) TO authenticated;
GRANT ALL ON FUNCTION public.record_paypal_payment_to_ledger(p_quote_id uuid, p_transaction_id uuid, p_amount numeric, p_currency text, p_order_id text, p_capture_id text, p_payer_email text) TO service_role;


--
-- Name: FUNCTION refresh_hsn_search_cache(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.refresh_hsn_search_cache() TO anon;
GRANT ALL ON FUNCTION public.refresh_hsn_search_cache() TO authenticated;
GRANT ALL ON FUNCTION public.refresh_hsn_search_cache() TO service_role;


--
-- Name: FUNCTION regenerate_backup_codes(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.regenerate_backup_codes() TO anon;
GRANT ALL ON FUNCTION public.regenerate_backup_codes() TO authenticated;
GRANT ALL ON FUNCTION public.regenerate_backup_codes() TO service_role;


--
-- Name: FUNCTION requires_mfa(p_user_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.requires_mfa(p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.requires_mfa(p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.requires_mfa(p_user_id uuid) TO service_role;


--
-- Name: FUNCTION reverse_financial_transaction(p_transaction_id uuid, p_user_id uuid, p_reason text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.reverse_financial_transaction(p_transaction_id uuid, p_user_id uuid, p_reason text) TO anon;
GRANT ALL ON FUNCTION public.reverse_financial_transaction(p_transaction_id uuid, p_user_id uuid, p_reason text) TO authenticated;
GRANT ALL ON FUNCTION public.reverse_financial_transaction(p_transaction_id uuid, p_user_id uuid, p_reason text) TO service_role;


--
-- Name: FUNCTION rollback_tax_standardization_20250128(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.rollback_tax_standardization_20250128() TO anon;
GRANT ALL ON FUNCTION public.rollback_tax_standardization_20250128() TO authenticated;
GRANT ALL ON FUNCTION public.rollback_tax_standardization_20250128() TO service_role;


--
-- Name: FUNCTION send_welcome_email(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.send_welcome_email() TO anon;
GRANT ALL ON FUNCTION public.send_welcome_email() TO authenticated;
GRANT ALL ON FUNCTION public.send_welcome_email() TO service_role;
GRANT ALL ON FUNCTION public.send_welcome_email() TO supabase_auth_admin;


--
-- Name: FUNCTION set_quote_expiration(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.set_quote_expiration() TO anon;
GRANT ALL ON FUNCTION public.set_quote_expiration() TO authenticated;
GRANT ALL ON FUNCTION public.set_quote_expiration() TO service_role;


--
-- Name: FUNCTION set_share_token(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.set_share_token() TO anon;
GRANT ALL ON FUNCTION public.set_share_token() TO authenticated;
GRANT ALL ON FUNCTION public.set_share_token() TO service_role;


--
-- Name: FUNCTION setup_mfa(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.setup_mfa() TO anon;
GRANT ALL ON FUNCTION public.setup_mfa() TO authenticated;
GRANT ALL ON FUNCTION public.setup_mfa() TO service_role;


--
-- Name: FUNCTION start_reconciliation_session(p_payment_method text, p_gateway_code text, p_statement_date date, p_statement_start_date date, p_statement_end_date date); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.start_reconciliation_session(p_payment_method text, p_gateway_code text, p_statement_date date, p_statement_start_date date, p_statement_end_date date) TO anon;
GRANT ALL ON FUNCTION public.start_reconciliation_session(p_payment_method text, p_gateway_code text, p_statement_date date, p_statement_start_date date, p_statement_end_date date) TO authenticated;
GRANT ALL ON FUNCTION public.start_reconciliation_session(p_payment_method text, p_gateway_code text, p_statement_date date, p_statement_start_date date, p_statement_end_date date) TO service_role;


--
-- Name: FUNCTION sync_payment_record_to_ledger(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.sync_payment_record_to_ledger() TO anon;
GRANT ALL ON FUNCTION public.sync_payment_record_to_ledger() TO authenticated;
GRANT ALL ON FUNCTION public.sync_payment_record_to_ledger() TO service_role;


--
-- Name: FUNCTION sync_quote_payment_amounts(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.sync_quote_payment_amounts() TO anon;
GRANT ALL ON FUNCTION public.sync_quote_payment_amounts() TO authenticated;
GRANT ALL ON FUNCTION public.sync_quote_payment_amounts() TO service_role;


--
-- Name: FUNCTION test_payment_update_direct(quote_id uuid, new_amount_paid numeric, new_payment_status text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.test_payment_update_direct(quote_id uuid, new_amount_paid numeric, new_payment_status text) TO anon;
GRANT ALL ON FUNCTION public.test_payment_update_direct(quote_id uuid, new_amount_paid numeric, new_payment_status text) TO authenticated;
GRANT ALL ON FUNCTION public.test_payment_update_direct(quote_id uuid, new_amount_paid numeric, new_payment_status text) TO service_role;


--
-- Name: FUNCTION trigger_paypal_webhook_events_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.trigger_paypal_webhook_events_updated_at() TO anon;
GRANT ALL ON FUNCTION public.trigger_paypal_webhook_events_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.trigger_paypal_webhook_events_updated_at() TO service_role;


--
-- Name: FUNCTION trigger_tax_method_audit(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.trigger_tax_method_audit() TO anon;
GRANT ALL ON FUNCTION public.trigger_tax_method_audit() TO authenticated;
GRANT ALL ON FUNCTION public.trigger_tax_method_audit() TO service_role;


--
-- Name: FUNCTION trigger_update_payment_status(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.trigger_update_payment_status() TO anon;
GRANT ALL ON FUNCTION public.trigger_update_payment_status() TO authenticated;
GRANT ALL ON FUNCTION public.trigger_update_payment_status() TO service_role;


--
-- Name: FUNCTION update_authenticated_checkout_sessions_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_authenticated_checkout_sessions_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_authenticated_checkout_sessions_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_authenticated_checkout_sessions_updated_at() TO service_role;


--
-- Name: FUNCTION update_category_weights(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_category_weights() TO anon;
GRANT ALL ON FUNCTION public.update_category_weights() TO authenticated;
GRANT ALL ON FUNCTION public.update_category_weights() TO service_role;


--
-- Name: FUNCTION update_country_payment_preferences_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_country_payment_preferences_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_country_payment_preferences_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_country_payment_preferences_updated_at() TO service_role;


--
-- Name: FUNCTION update_guest_checkout_sessions_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_guest_checkout_sessions_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_guest_checkout_sessions_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_guest_checkout_sessions_updated_at() TO service_role;


--
-- Name: FUNCTION update_location_capacity(location_code text, capacity_change integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_location_capacity(location_code text, capacity_change integer) TO anon;
GRANT ALL ON FUNCTION public.update_location_capacity(location_code text, capacity_change integer) TO authenticated;
GRANT ALL ON FUNCTION public.update_location_capacity(location_code text, capacity_change integer) TO service_role;


--
-- Name: FUNCTION update_payment_links_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_payment_links_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_payment_links_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_payment_links_updated_at() TO service_role;


--
-- Name: FUNCTION update_payment_refund_totals(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_payment_refund_totals() TO anon;
GRANT ALL ON FUNCTION public.update_payment_refund_totals() TO authenticated;
GRANT ALL ON FUNCTION public.update_payment_refund_totals() TO service_role;


--
-- Name: FUNCTION update_payment_status(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_payment_status() TO anon;
GRANT ALL ON FUNCTION public.update_payment_status() TO authenticated;
GRANT ALL ON FUNCTION public.update_payment_status() TO service_role;


--
-- Name: FUNCTION update_paypal_refunds_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_paypal_refunds_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_paypal_refunds_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_paypal_refunds_updated_at() TO service_role;


--
-- Name: FUNCTION update_quote_documents_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_quote_documents_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_quote_documents_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_quote_documents_updated_at() TO service_role;


--
-- Name: FUNCTION update_quote_view_tracking(p_quote_id uuid, p_duration_seconds integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_quote_view_tracking(p_quote_id uuid, p_duration_seconds integer) TO anon;
GRANT ALL ON FUNCTION public.update_quote_view_tracking(p_quote_id uuid, p_duration_seconds integer) TO authenticated;
GRANT ALL ON FUNCTION public.update_quote_view_tracking(p_quote_id uuid, p_duration_seconds integer) TO service_role;


--
-- Name: FUNCTION update_quotes_unified_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_quotes_unified_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_quotes_unified_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_quotes_unified_updated_at() TO service_role;


--
-- Name: FUNCTION update_route_customs_tiers_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_route_customs_tiers_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_route_customs_tiers_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_route_customs_tiers_updated_at() TO service_role;


--
-- Name: FUNCTION update_support_ticket_status(p_support_id uuid, p_new_status character varying, p_user_id uuid, p_reason text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_support_ticket_status(p_support_id uuid, p_new_status character varying, p_user_id uuid, p_reason text) TO anon;
GRANT ALL ON FUNCTION public.update_support_ticket_status(p_support_id uuid, p_new_status character varying, p_user_id uuid, p_reason text) TO authenticated;
GRANT ALL ON FUNCTION public.update_support_ticket_status(p_support_id uuid, p_new_status character varying, p_user_id uuid, p_reason text) TO service_role;


--
-- Name: FUNCTION update_support_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_support_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_support_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_support_updated_at() TO service_role;


--
-- Name: FUNCTION update_tag_usage_count(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_tag_usage_count() TO anon;
GRANT ALL ON FUNCTION public.update_tag_usage_count() TO authenticated;
GRANT ALL ON FUNCTION public.update_tag_usage_count() TO service_role;


--
-- Name: FUNCTION update_updated_at_column(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_updated_at_column() TO anon;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO service_role;


--
-- Name: FUNCTION validate_delivery_options(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.validate_delivery_options() TO anon;
GRANT ALL ON FUNCTION public.validate_delivery_options() TO authenticated;
GRANT ALL ON FUNCTION public.validate_delivery_options() TO service_role;


--
-- Name: FUNCTION validate_quotes_unified(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.validate_quotes_unified() TO anon;
GRANT ALL ON FUNCTION public.validate_quotes_unified() TO authenticated;
GRANT ALL ON FUNCTION public.validate_quotes_unified() TO service_role;


--
-- Name: FUNCTION verify_mfa_login(p_code text, p_is_backup_code boolean); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.verify_mfa_login(p_code text, p_is_backup_code boolean) TO anon;
GRANT ALL ON FUNCTION public.verify_mfa_login(p_code text, p_is_backup_code boolean) TO authenticated;
GRANT ALL ON FUNCTION public.verify_mfa_login(p_code text, p_is_backup_code boolean) TO service_role;


--
-- Name: FUNCTION verify_mfa_setup(p_code text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.verify_mfa_setup(p_code text) TO anon;
GRANT ALL ON FUNCTION public.verify_mfa_setup(p_code text) TO authenticated;
GRANT ALL ON FUNCTION public.verify_mfa_setup(p_code text) TO service_role;


--
-- Name: FUNCTION verify_quote_email(p_verification_token text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.verify_quote_email(p_verification_token text) TO anon;
GRANT ALL ON FUNCTION public.verify_quote_email(p_verification_token text) TO authenticated;
GRANT ALL ON FUNCTION public.verify_quote_email(p_verification_token text) TO service_role;


--
-- Name: FUNCTION verify_totp_code(p_user_id uuid, p_code text, p_window integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.verify_totp_code(p_user_id uuid, p_code text, p_window integer) TO anon;
GRANT ALL ON FUNCTION public.verify_totp_code(p_user_id uuid, p_code text, p_window integer) TO authenticated;
GRANT ALL ON FUNCTION public.verify_totp_code(p_user_id uuid, p_code text, p_window integer) TO service_role;


--
-- Name: FUNCTION verify_totp_code_dev(p_user_id uuid, p_code text, p_window integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.verify_totp_code_dev(p_user_id uuid, p_code text, p_window integer) TO anon;
GRANT ALL ON FUNCTION public.verify_totp_code_dev(p_user_id uuid, p_code text, p_window integer) TO authenticated;
GRANT ALL ON FUNCTION public.verify_totp_code_dev(p_user_id uuid, p_code text, p_window integer) TO service_role;


--
-- Name: FUNCTION verify_totp_setup(p_code text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.verify_totp_setup(p_code text) TO anon;
GRANT ALL ON FUNCTION public.verify_totp_setup(p_code text) TO authenticated;
GRANT ALL ON FUNCTION public.verify_totp_setup(p_code text) TO service_role;


--
-- Name: FUNCTION _crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea, nonce bytea); Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT ALL ON FUNCTION vault._crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea, nonce bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION vault._crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea, nonce bytea) TO service_role;


--
-- Name: FUNCTION create_secret(new_secret text, new_name text, new_description text, new_key_id uuid); Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT ALL ON FUNCTION vault.create_secret(new_secret text, new_name text, new_description text, new_key_id uuid) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION vault.create_secret(new_secret text, new_name text, new_description text, new_key_id uuid) TO service_role;


--
-- Name: FUNCTION update_secret(secret_id uuid, new_secret text, new_name text, new_description text, new_key_id uuid); Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT ALL ON FUNCTION vault.update_secret(secret_id uuid, new_secret text, new_name text, new_description text, new_key_id uuid) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION vault.update_secret(secret_id uuid, new_secret text, new_name text, new_description text, new_key_id uuid) TO service_role;


--
-- Name: TABLE pg_stat_statements; Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON TABLE extensions.pg_stat_statements TO postgres WITH GRANT OPTION;


--
-- Name: TABLE pg_stat_statements_info; Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON TABLE extensions.pg_stat_statements_info TO postgres WITH GRANT OPTION;


--
-- Name: TABLE admin_overrides; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.admin_overrides TO anon;
GRANT ALL ON TABLE public.admin_overrides TO authenticated;
GRANT ALL ON TABLE public.admin_overrides TO service_role;


--
-- Name: TABLE authenticated_checkout_sessions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.authenticated_checkout_sessions TO anon;
GRANT ALL ON TABLE public.authenticated_checkout_sessions TO authenticated;
GRANT ALL ON TABLE public.authenticated_checkout_sessions TO service_role;


--
-- Name: TABLE bank_statement_imports; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.bank_statement_imports TO anon;
GRANT ALL ON TABLE public.bank_statement_imports TO authenticated;
GRANT ALL ON TABLE public.bank_statement_imports TO service_role;


--
-- Name: TABLE blog_categories; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.blog_categories TO anon;
GRANT ALL ON TABLE public.blog_categories TO authenticated;
GRANT ALL ON TABLE public.blog_categories TO service_role;


--
-- Name: TABLE blog_comments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.blog_comments TO anon;
GRANT ALL ON TABLE public.blog_comments TO authenticated;
GRANT ALL ON TABLE public.blog_comments TO service_role;


--
-- Name: TABLE blog_post_tags; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.blog_post_tags TO anon;
GRANT ALL ON TABLE public.blog_post_tags TO authenticated;
GRANT ALL ON TABLE public.blog_post_tags TO service_role;


--
-- Name: TABLE blog_posts; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.blog_posts TO anon;
GRANT ALL ON TABLE public.blog_posts TO authenticated;
GRANT ALL ON TABLE public.blog_posts TO service_role;


--
-- Name: TABLE blog_tags; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.blog_tags TO anon;
GRANT ALL ON TABLE public.blog_tags TO authenticated;
GRANT ALL ON TABLE public.blog_tags TO service_role;


--
-- Name: TABLE chart_of_accounts; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.chart_of_accounts TO anon;
GRANT ALL ON TABLE public.chart_of_accounts TO authenticated;
GRANT ALL ON TABLE public.chart_of_accounts TO service_role;


--
-- Name: TABLE consolidation_groups; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.consolidation_groups TO anon;
GRANT ALL ON TABLE public.consolidation_groups TO authenticated;
GRANT ALL ON TABLE public.consolidation_groups TO service_role;


--
-- Name: TABLE country_payment_preferences; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.country_payment_preferences TO anon;
GRANT ALL ON TABLE public.country_payment_preferences TO authenticated;
GRANT ALL ON TABLE public.country_payment_preferences TO service_role;


--
-- Name: TABLE country_settings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.country_settings TO anon;
GRANT ALL ON TABLE public.country_settings TO authenticated;
GRANT ALL ON TABLE public.country_settings TO service_role;


--
-- Name: TABLE credit_note_applications; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.credit_note_applications TO anon;
GRANT ALL ON TABLE public.credit_note_applications TO authenticated;
GRANT ALL ON TABLE public.credit_note_applications TO service_role;


--
-- Name: TABLE credit_note_history; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.credit_note_history TO anon;
GRANT ALL ON TABLE public.credit_note_history TO authenticated;
GRANT ALL ON TABLE public.credit_note_history TO service_role;


--
-- Name: SEQUENCE credit_note_number_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.credit_note_number_seq TO anon;
GRANT ALL ON SEQUENCE public.credit_note_number_seq TO authenticated;
GRANT ALL ON SEQUENCE public.credit_note_number_seq TO service_role;


--
-- Name: TABLE credit_notes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.credit_notes TO anon;
GRANT ALL ON TABLE public.credit_notes TO authenticated;
GRANT ALL ON TABLE public.credit_notes TO service_role;


--
-- Name: TABLE customer_addresses; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.customer_addresses TO anon;
GRANT ALL ON TABLE public.customer_addresses TO authenticated;
GRANT ALL ON TABLE public.customer_addresses TO service_role;


--
-- Name: TABLE customs_categories; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.customs_categories TO anon;
GRANT ALL ON TABLE public.customs_categories TO authenticated;
GRANT ALL ON TABLE public.customs_categories TO service_role;


--
-- Name: TABLE customs_rules; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.customs_rules TO anon;
GRANT ALL ON TABLE public.customs_rules TO authenticated;
GRANT ALL ON TABLE public.customs_rules TO service_role;


--
-- Name: TABLE email_queue; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.email_queue TO anon;
GRANT ALL ON TABLE public.email_queue TO authenticated;
GRANT ALL ON TABLE public.email_queue TO service_role;


--
-- Name: TABLE email_settings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.email_settings TO anon;
GRANT ALL ON TABLE public.email_settings TO authenticated;
GRANT ALL ON TABLE public.email_settings TO service_role;


--
-- Name: TABLE email_templates; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.email_templates TO anon;
GRANT ALL ON TABLE public.email_templates TO authenticated;
GRANT ALL ON TABLE public.email_templates TO service_role;


--
-- Name: TABLE financial_transactions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.financial_transactions TO anon;
GRANT ALL ON TABLE public.financial_transactions TO authenticated;
GRANT ALL ON TABLE public.financial_transactions TO service_role;


--
-- Name: TABLE gateway_refunds; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.gateway_refunds TO anon;
GRANT ALL ON TABLE public.gateway_refunds TO authenticated;
GRANT ALL ON TABLE public.gateway_refunds TO service_role;


--
-- Name: TABLE global_tax_method_preferences; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.global_tax_method_preferences TO anon;
GRANT ALL ON TABLE public.global_tax_method_preferences TO authenticated;
GRANT ALL ON TABLE public.global_tax_method_preferences TO service_role;


--
-- Name: TABLE guest_checkout_sessions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.guest_checkout_sessions TO anon;
GRANT ALL ON TABLE public.guest_checkout_sessions TO authenticated;
GRANT ALL ON TABLE public.guest_checkout_sessions TO service_role;


--
-- Name: TABLE hsn_master; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.hsn_master TO anon;
GRANT ALL ON TABLE public.hsn_master TO authenticated;
GRANT ALL ON TABLE public.hsn_master TO service_role;


--
-- Name: TABLE hsn_search_optimized; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.hsn_search_optimized TO anon;
GRANT ALL ON TABLE public.hsn_search_optimized TO authenticated;
GRANT ALL ON TABLE public.hsn_search_optimized TO service_role;


--
-- Name: SEQUENCE iwish_tracking_sequence; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.iwish_tracking_sequence TO anon;
GRANT ALL ON SEQUENCE public.iwish_tracking_sequence TO authenticated;
GRANT ALL ON SEQUENCE public.iwish_tracking_sequence TO service_role;


--
-- Name: TABLE manual_analysis_tasks; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.manual_analysis_tasks TO anon;
GRANT ALL ON TABLE public.manual_analysis_tasks TO authenticated;
GRANT ALL ON TABLE public.manual_analysis_tasks TO service_role;


--
-- Name: TABLE messages; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.messages TO anon;
GRANT ALL ON TABLE public.messages TO authenticated;
GRANT ALL ON TABLE public.messages TO service_role;


--
-- Name: TABLE mfa_activity_log; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.mfa_activity_log TO anon;
GRANT ALL ON TABLE public.mfa_activity_log TO authenticated;
GRANT ALL ON TABLE public.mfa_activity_log TO service_role;


--
-- Name: SEQUENCE mfa_activity_log_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.mfa_activity_log_id_seq TO anon;
GRANT ALL ON SEQUENCE public.mfa_activity_log_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.mfa_activity_log_id_seq TO service_role;


--
-- Name: TABLE mfa_configurations; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.mfa_configurations TO anon;
GRANT ALL ON TABLE public.mfa_configurations TO authenticated;
GRANT ALL ON TABLE public.mfa_configurations TO service_role;


--
-- Name: TABLE mfa_sessions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.mfa_sessions TO anon;
GRANT ALL ON TABLE public.mfa_sessions TO authenticated;
GRANT ALL ON TABLE public.mfa_sessions TO service_role;


--
-- Name: TABLE ml_category_weights; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ml_category_weights TO anon;
GRANT ALL ON TABLE public.ml_category_weights TO authenticated;
GRANT ALL ON TABLE public.ml_category_weights TO service_role;


--
-- Name: TABLE ml_product_weights; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ml_product_weights TO anon;
GRANT ALL ON TABLE public.ml_product_weights TO authenticated;
GRANT ALL ON TABLE public.ml_product_weights TO service_role;


--
-- Name: TABLE ml_training_history; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ml_training_history TO anon;
GRANT ALL ON TABLE public.ml_training_history TO authenticated;
GRANT ALL ON TABLE public.ml_training_history TO service_role;


--
-- Name: TABLE notifications; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.notifications TO anon;
GRANT ALL ON TABLE public.notifications TO authenticated;
GRANT ALL ON TABLE public.notifications TO service_role;


--
-- Name: TABLE oauth_tokens; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.oauth_tokens TO anon;
GRANT ALL ON TABLE public.oauth_tokens TO authenticated;
GRANT ALL ON TABLE public.oauth_tokens TO service_role;


--
-- Name: TABLE package_events; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.package_events TO anon;
GRANT ALL ON TABLE public.package_events TO authenticated;
GRANT ALL ON TABLE public.package_events TO service_role;


--
-- Name: TABLE package_notifications; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.package_notifications TO anon;
GRANT ALL ON TABLE public.package_notifications TO authenticated;
GRANT ALL ON TABLE public.package_notifications TO service_role;


--
-- Name: TABLE package_photos; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.package_photos TO anon;
GRANT ALL ON TABLE public.package_photos TO authenticated;
GRANT ALL ON TABLE public.package_photos TO service_role;


--
-- Name: TABLE payment_adjustments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.payment_adjustments TO anon;
GRANT ALL ON TABLE public.payment_adjustments TO authenticated;
GRANT ALL ON TABLE public.payment_adjustments TO service_role;


--
-- Name: TABLE payment_alert_thresholds; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.payment_alert_thresholds TO anon;
GRANT ALL ON TABLE public.payment_alert_thresholds TO authenticated;
GRANT ALL ON TABLE public.payment_alert_thresholds TO service_role;


--
-- Name: TABLE payment_error_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.payment_error_logs TO anon;
GRANT ALL ON TABLE public.payment_error_logs TO authenticated;
GRANT ALL ON TABLE public.payment_error_logs TO service_role;


--
-- Name: TABLE payment_error_analytics; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.payment_error_analytics TO anon;
GRANT ALL ON TABLE public.payment_error_analytics TO authenticated;
GRANT ALL ON TABLE public.payment_error_analytics TO service_role;


--
-- Name: TABLE payment_gateways; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.payment_gateways TO anon;
GRANT ALL ON TABLE public.payment_gateways TO authenticated;
GRANT ALL ON TABLE public.payment_gateways TO service_role;


--
-- Name: TABLE payment_health_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.payment_health_logs TO anon;
GRANT ALL ON TABLE public.payment_health_logs TO authenticated;
GRANT ALL ON TABLE public.payment_health_logs TO service_role;


--
-- Name: TABLE payment_health_dashboard; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.payment_health_dashboard TO anon;
GRANT ALL ON TABLE public.payment_health_dashboard TO authenticated;
GRANT ALL ON TABLE public.payment_health_dashboard TO service_role;


--
-- Name: TABLE payment_ledger; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.payment_ledger TO anon;
GRANT ALL ON TABLE public.payment_ledger TO authenticated;
GRANT ALL ON TABLE public.payment_ledger TO service_role;


--
-- Name: TABLE payment_links; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.payment_links TO anon;
GRANT ALL ON TABLE public.payment_links TO authenticated;
GRANT ALL ON TABLE public.payment_links TO service_role;


--
-- Name: TABLE payment_links_summary; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.payment_links_summary TO anon;
GRANT ALL ON TABLE public.payment_links_summary TO authenticated;
GRANT ALL ON TABLE public.payment_links_summary TO service_role;


--
-- Name: TABLE payment_reconciliation; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.payment_reconciliation TO anon;
GRANT ALL ON TABLE public.payment_reconciliation TO authenticated;
GRANT ALL ON TABLE public.payment_reconciliation TO service_role;


--
-- Name: TABLE payment_reminders; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.payment_reminders TO anon;
GRANT ALL ON TABLE public.payment_reminders TO authenticated;
GRANT ALL ON TABLE public.payment_reminders TO service_role;


--
-- Name: TABLE payment_transactions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.payment_transactions TO anon;
GRANT ALL ON TABLE public.payment_transactions TO authenticated;
GRANT ALL ON TABLE public.payment_transactions TO service_role;


--
-- Name: TABLE payment_verification_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.payment_verification_logs TO anon;
GRANT ALL ON TABLE public.payment_verification_logs TO authenticated;
GRANT ALL ON TABLE public.payment_verification_logs TO service_role;


--
-- Name: TABLE paypal_refund_reasons; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.paypal_refund_reasons TO anon;
GRANT ALL ON TABLE public.paypal_refund_reasons TO authenticated;
GRANT ALL ON TABLE public.paypal_refund_reasons TO service_role;


--
-- Name: TABLE paypal_refunds; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.paypal_refunds TO anon;
GRANT ALL ON TABLE public.paypal_refunds TO authenticated;
GRANT ALL ON TABLE public.paypal_refunds TO service_role;


--
-- Name: TABLE paypal_refund_summary; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.paypal_refund_summary TO anon;
GRANT ALL ON TABLE public.paypal_refund_summary TO authenticated;
GRANT ALL ON TABLE public.paypal_refund_summary TO service_role;


--
-- Name: TABLE paypal_webhook_events; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.paypal_webhook_events TO anon;
GRANT ALL ON TABLE public.paypal_webhook_events TO authenticated;
GRANT ALL ON TABLE public.paypal_webhook_events TO service_role;


--
-- Name: TABLE profiles_with_phone; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.profiles_with_phone TO anon;
GRANT ALL ON TABLE public.profiles_with_phone TO authenticated;
GRANT ALL ON TABLE public.profiles_with_phone TO service_role;


--
-- Name: TABLE quote_address_history; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.quote_address_history TO anon;
GRANT ALL ON TABLE public.quote_address_history TO authenticated;
GRANT ALL ON TABLE public.quote_address_history TO service_role;


--
-- Name: SEQUENCE quote_address_history_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.quote_address_history_id_seq TO anon;
GRANT ALL ON SEQUENCE public.quote_address_history_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.quote_address_history_id_seq TO service_role;


--
-- Name: TABLE quote_documents; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.quote_documents TO anon;
GRANT ALL ON TABLE public.quote_documents TO authenticated;
GRANT ALL ON TABLE public.quote_documents TO service_role;


--
-- Name: TABLE quote_items; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.quote_items TO anon;
GRANT ALL ON TABLE public.quote_items TO authenticated;
GRANT ALL ON TABLE public.quote_items TO service_role;


--
-- Name: TABLE quote_statuses; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.quote_statuses TO anon;
GRANT ALL ON TABLE public.quote_statuses TO authenticated;
GRANT ALL ON TABLE public.quote_statuses TO service_role;


--
-- Name: SEQUENCE quote_statuses_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.quote_statuses_id_seq TO anon;
GRANT ALL ON SEQUENCE public.quote_statuses_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.quote_statuses_id_seq TO service_role;


--
-- Name: TABLE quote_templates; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.quote_templates TO anon;
GRANT ALL ON TABLE public.quote_templates TO authenticated;
GRANT ALL ON TABLE public.quote_templates TO service_role;


--
-- Name: TABLE received_packages; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.received_packages TO anon;
GRANT ALL ON TABLE public.received_packages TO authenticated;
GRANT ALL ON TABLE public.received_packages TO service_role;


--
-- Name: TABLE reconciliation_items; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.reconciliation_items TO anon;
GRANT ALL ON TABLE public.reconciliation_items TO authenticated;
GRANT ALL ON TABLE public.reconciliation_items TO service_role;


--
-- Name: TABLE reconciliation_rules; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.reconciliation_rules TO anon;
GRANT ALL ON TABLE public.reconciliation_rules TO authenticated;
GRANT ALL ON TABLE public.reconciliation_rules TO service_role;


--
-- Name: TABLE refund_items; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.refund_items TO anon;
GRANT ALL ON TABLE public.refund_items TO authenticated;
GRANT ALL ON TABLE public.refund_items TO service_role;


--
-- Name: TABLE refund_requests; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.refund_requests TO anon;
GRANT ALL ON TABLE public.refund_requests TO authenticated;
GRANT ALL ON TABLE public.refund_requests TO service_role;


--
-- Name: TABLE rejection_reasons; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.rejection_reasons TO anon;
GRANT ALL ON TABLE public.rejection_reasons TO authenticated;
GRANT ALL ON TABLE public.rejection_reasons TO service_role;


--
-- Name: TABLE route_customs_tiers; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.route_customs_tiers TO anon;
GRANT ALL ON TABLE public.route_customs_tiers TO authenticated;
GRANT ALL ON TABLE public.route_customs_tiers TO service_role;


--
-- Name: TABLE share_audit_log; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.share_audit_log TO anon;
GRANT ALL ON TABLE public.share_audit_log TO authenticated;
GRANT ALL ON TABLE public.share_audit_log TO service_role;


--
-- Name: TABLE shipping_routes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.shipping_routes TO anon;
GRANT ALL ON TABLE public.shipping_routes TO authenticated;
GRANT ALL ON TABLE public.shipping_routes TO service_role;


--
-- Name: SEQUENCE shipping_routes_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.shipping_routes_id_seq TO anon;
GRANT ALL ON SEQUENCE public.shipping_routes_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.shipping_routes_id_seq TO service_role;


--
-- Name: TABLE status_transitions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.status_transitions TO anon;
GRANT ALL ON TABLE public.status_transitions TO authenticated;
GRANT ALL ON TABLE public.status_transitions TO service_role;


--
-- Name: TABLE storage_fees; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.storage_fees TO anon;
GRANT ALL ON TABLE public.storage_fees TO authenticated;
GRANT ALL ON TABLE public.storage_fees TO service_role;


--
-- Name: SEQUENCE suite_number_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.suite_number_seq TO anon;
GRANT ALL ON SEQUENCE public.suite_number_seq TO authenticated;
GRANT ALL ON SEQUENCE public.suite_number_seq TO service_role;


--
-- Name: TABLE support_interactions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.support_interactions TO anon;
GRANT ALL ON TABLE public.support_interactions TO authenticated;
GRANT ALL ON TABLE public.support_interactions TO service_role;


--
-- Name: TABLE support_system; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.support_system TO anon;
GRANT ALL ON TABLE public.support_system TO authenticated;
GRANT ALL ON TABLE public.support_system TO service_role;


--
-- Name: TABLE support_tickets_view; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.support_tickets_view TO anon;
GRANT ALL ON TABLE public.support_tickets_view TO authenticated;
GRANT ALL ON TABLE public.support_tickets_view TO service_role;


--
-- Name: TABLE system_settings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.system_settings TO anon;
GRANT ALL ON TABLE public.system_settings TO authenticated;
GRANT ALL ON TABLE public.system_settings TO service_role;


--
-- Name: TABLE tax_backup_20250128; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.tax_backup_20250128 TO anon;
GRANT ALL ON TABLE public.tax_backup_20250128 TO authenticated;
GRANT ALL ON TABLE public.tax_backup_20250128 TO service_role;


--
-- Name: TABLE tax_calculation_audit_log; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.tax_calculation_audit_log TO anon;
GRANT ALL ON TABLE public.tax_calculation_audit_log TO authenticated;
GRANT ALL ON TABLE public.tax_calculation_audit_log TO service_role;


--
-- Name: TABLE ticket_replies_view; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ticket_replies_view TO anon;
GRANT ALL ON TABLE public.ticket_replies_view TO authenticated;
GRANT ALL ON TABLE public.ticket_replies_view TO service_role;


--
-- Name: TABLE tickets; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.tickets TO anon;
GRANT ALL ON TABLE public.tickets TO authenticated;
GRANT ALL ON TABLE public.tickets TO service_role;


--
-- Name: TABLE unified_configuration; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.unified_configuration TO anon;
GRANT ALL ON TABLE public.unified_configuration TO authenticated;
GRANT ALL ON TABLE public.unified_configuration TO service_role;


--
-- Name: TABLE user_activity_analytics; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_activity_analytics TO anon;
GRANT ALL ON TABLE public.user_activity_analytics TO authenticated;
GRANT ALL ON TABLE public.user_activity_analytics TO service_role;


--
-- Name: TABLE user_addresses; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_addresses TO anon;
GRANT ALL ON TABLE public.user_addresses TO authenticated;
GRANT ALL ON TABLE public.user_addresses TO service_role;


--
-- Name: TABLE user_oauth_data; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_oauth_data TO anon;
GRANT ALL ON TABLE public.user_oauth_data TO authenticated;
GRANT ALL ON TABLE public.user_oauth_data TO service_role;


--
-- Name: TABLE user_roles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_roles TO anon;
GRANT ALL ON TABLE public.user_roles TO authenticated;
GRANT ALL ON TABLE public.user_roles TO service_role;


--
-- Name: TABLE warehouse_locations; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.warehouse_locations TO anon;
GRANT ALL ON TABLE public.warehouse_locations TO authenticated;
GRANT ALL ON TABLE public.warehouse_locations TO service_role;


--
-- Name: TABLE warehouse_tasks; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.warehouse_tasks TO anon;
GRANT ALL ON TABLE public.warehouse_tasks TO authenticated;
GRANT ALL ON TABLE public.warehouse_tasks TO service_role;


--
-- Name: TABLE webhook_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.webhook_logs TO anon;
GRANT ALL ON TABLE public.webhook_logs TO authenticated;
GRANT ALL ON TABLE public.webhook_logs TO service_role;


--
-- Name: TABLE secrets; Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT SELECT,REFERENCES,DELETE,TRUNCATE ON TABLE vault.secrets TO postgres WITH GRANT OPTION;
GRANT SELECT,DELETE ON TABLE vault.secrets TO service_role;


--
-- Name: TABLE decrypted_secrets; Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT SELECT,REFERENCES,DELETE,TRUNCATE ON TABLE vault.decrypted_secrets TO postgres WITH GRANT OPTION;
GRANT SELECT,DELETE ON TABLE vault.decrypted_secrets TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: issue_graphql_placeholder; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_graphql_placeholder ON sql_drop
         WHEN TAG IN ('DROP EXTENSION')
   EXECUTE FUNCTION extensions.set_graphql_placeholder();


ALTER EVENT TRIGGER issue_graphql_placeholder OWNER TO supabase_admin;

--
-- Name: issue_pg_cron_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_cron_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_cron_access();


ALTER EVENT TRIGGER issue_pg_cron_access OWNER TO supabase_admin;

--
-- Name: issue_pg_graphql_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_graphql_access ON ddl_command_end
         WHEN TAG IN ('CREATE FUNCTION')
   EXECUTE FUNCTION extensions.grant_pg_graphql_access();


ALTER EVENT TRIGGER issue_pg_graphql_access OWNER TO supabase_admin;

--
-- Name: issue_pg_net_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_net_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_net_access();


ALTER EVENT TRIGGER issue_pg_net_access OWNER TO supabase_admin;

--
-- Name: pgrst_ddl_watch; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER pgrst_ddl_watch ON ddl_command_end
   EXECUTE FUNCTION extensions.pgrst_ddl_watch();


ALTER EVENT TRIGGER pgrst_ddl_watch OWNER TO supabase_admin;

--
-- Name: pgrst_drop_watch; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER pgrst_drop_watch ON sql_drop
   EXECUTE FUNCTION extensions.pgrst_drop_watch();


ALTER EVENT TRIGGER pgrst_drop_watch OWNER TO supabase_admin;

--
-- Name: hsn_search_optimized; Type: MATERIALIZED VIEW DATA; Schema: public; Owner: postgres
--

REFRESH MATERIALIZED VIEW public.hsn_search_optimized;


--
-- PostgreSQL database dump complete
--

