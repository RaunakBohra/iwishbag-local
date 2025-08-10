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

-- CREATE SCHEMA pgbouncer; -- System schema, skipping

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
    
    -- Use HSN-based calculation as the default (recommended approach)
    -- This aligns with the current HSN system implementation
    RETURN QUERY SELECT 'hsn_only'::text, 'auto'::text, 'system_default'::text, 0.8::numeric;
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
    SELECT 1 WHERE false;
  
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
-- Name: handle_default_address(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_default_address() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- If the new/updated address is being set as default
  IF NEW.is_default = TRUE THEN
    -- Set all other addresses for this user to not default
    UPDATE public.delivery_addresses 
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
-- Name: FUNCTION has_any_role(roles public.app_role[]); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.has_any_role(roles public.app_role[]) IS 'Check if the current user has any of the specified roles';

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
-- Name: warehouse_suite_addresses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.warehouse_suite_addresses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    suite_number text NOT NULL,
    full_address text NOT NULL,
    address_type text DEFAULT 'standard'::text,
    assigned_date timestamp with time zone DEFAULT now(),
    status text DEFAULT 'active'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT warehouse_suite_addresses_address_type_check CHECK ((address_type = ANY (ARRAY['standard'::text, 'premium'::text]))),
    CONSTRAINT warehouse_suite_addresses_status_check CHECK ((status = ANY (ARRAY['active'::text, 'suspended'::text, 'closed'::text])))
);

ALTER TABLE public.warehouse_suite_addresses OWNER TO postgres;

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

--

--

--

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
-- Name: TABLE delivery_addresses; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.delivery_addresses TO anon;
GRANT ALL ON TABLE public.delivery_addresses TO authenticated;
GRANT ALL ON TABLE public.delivery_addresses TO service_role;

--
-- Name: TABLE user_oauth_data; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_oauth_data TO anon;
GRANT ALL ON TABLE public.user_oauth_data TO authenticated;
GRANT ALL ON TABLE public.user_oauth_data TO service_role;

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

