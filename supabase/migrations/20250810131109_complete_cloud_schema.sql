-- ============================================================================
-- IWISHBAG COMPLETE SCHEMA MIGRATION FOR CLOUD
-- Generated from local database - All tables, functions, triggers
-- ============================================================================

-- Set required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "ltree";

--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.5 (Debian 17.5-1.pgdg120+1)

SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- CREATE SCHEMA public; -- Already exists


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'Updated all tables with updated_at triggers to have updated_at columns';


--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'user',
    'moderator'
);


--
-- Name: quote_approval_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.quote_approval_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);


--
-- Name: quote_priority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.quote_priority AS ENUM (
    'low',
    'normal',
    'high',
    'urgent'
);


--
-- Name: add_storage_fees_to_quote(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.add_storage_fees_to_quote(p_user_id uuid, p_quote_id uuid) RETURNS numeric
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_total_storage_fees numeric;
BEGIN
  -- Calculate total unpaid storage fees for user
  SELECT COALESCE(SUM(total_fee_usd), 0)
  INTO v_total_storage_fees
  FROM storage_fees 
  WHERE user_id = p_user_id 
    AND is_paid = false
    AND quote_id IS NULL;

  -- Link storage fees to quote
  UPDATE storage_fees 
  SET quote_id = p_quote_id
  WHERE user_id = p_user_id 
    AND is_paid = false
    AND quote_id IS NULL;

  -- Mark quote as including storage fees
  UPDATE quotes
  SET storage_fees_included = true,
      forwarding_data = COALESCE(forwarding_data, '{}'::jsonb) || 
                       jsonb_build_object('storage_fees_usd', v_total_storage_fees)
  WHERE id = p_quote_id;

  RETURN v_total_storage_fees;
END;
$$;


--
-- Name: add_support_interaction(uuid, uuid, text, jsonb, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.add_support_interaction(p_support_id uuid, p_user_id uuid, p_interaction_type text, p_content jsonb, p_is_internal boolean DEFAULT false) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_interaction_id UUID;
BEGIN
    -- Validate interaction type
    IF p_interaction_type NOT IN ('reply', 'status_change', 'assignment', 'escalation', 'note') THEN
        RAISE EXCEPTION 'Invalid interaction type: %', p_interaction_type;
    END IF;

    -- Generate interaction ID
    v_interaction_id := gen_random_uuid();

    -- Insert the interaction
    INSERT INTO support_interactions (
        id,
        support_id,
        user_id,
        interaction_type,
        content,
        metadata,
        is_internal,
        created_at
    ) VALUES (
        v_interaction_id,
        p_support_id,
        p_user_id,
        p_interaction_type,
        p_content,
        jsonb_build_object(
            'created_by', p_user_id,
            'timestamp', NOW()
        ),
        p_is_internal,
        NOW()
    );

    -- Update ticket's updated_at timestamp
    UPDATE support_system
    SET updated_at = NOW()
    WHERE id = p_support_id;

    RETURN v_interaction_id;
END;
$$;


--
-- Name: analyze_tax_method_performance(text, text, integer); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: FUNCTION analyze_tax_method_performance(p_origin_country text, p_destination_country text, p_time_range_days integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.analyze_tax_method_performance(p_origin_country text, p_destination_country text, p_time_range_days integer) IS 'Analyzes historical performance of tax calculation methods for route optimization';


--
-- Name: apply_abuse_block(text, text, text, text, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.apply_abuse_block(p_target_type text, p_target_value text, p_block_type text, p_reason text, p_duration_minutes integer DEFAULT NULL::integer, p_applied_by text DEFAULT 'system'::text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  expires_at_val TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calculate expiration time if duration provided
  IF p_duration_minutes IS NOT NULL THEN
    expires_at_val := NOW() + (p_duration_minutes || ' minutes')::INTERVAL;
  END IF;
  
  -- Insert or update the block
  INSERT INTO active_blocks (
    target_type, 
    target_value, 
    block_type, 
    reason, 
    expires_at, 
    applied_by
  ) VALUES (
    p_target_type,
    p_target_value,
    p_block_type,
    p_reason,
    expires_at_val,
    p_applied_by
  )
  ON CONFLICT (target_type, target_value, block_type) 
  DO UPDATE SET
    reason = EXCLUDED.reason,
    expires_at = EXCLUDED.expires_at,
    applied_by = EXCLUDED.applied_by,
    created_at = NOW();
    
  RETURN TRUE;
END;
$$;


--
-- Name: apply_discount_to_quote(uuid, text[], uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.apply_discount_to_quote(p_quote_id uuid, p_discount_codes text[], p_customer_id uuid DEFAULT NULL::uuid) RETURNS TABLE(success boolean, message text, recalculated_quote jsonb, applied_discounts jsonb[], total_savings numeric, new_total numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_quote RECORD;
  v_customer_id UUID;
  v_discount_record RECORD;
  v_applied_discounts JSONB[] := ARRAY[]::JSONB[];
  v_total_savings NUMERIC := 0;
  v_calculation_input JSONB;
  v_recalculated_result JSONB;
  v_new_total NUMERIC;
  v_usage_id UUID;
  v_discount_amount NUMERIC;
  v_component_breakdown JSONB := '{}';
  v_applicable_component TEXT := 'total'; -- Default to total
  v_updated_calculation_data JSONB;
BEGIN
  -- Get quote details
  SELECT * INTO v_quote
  FROM quotes_v2
  WHERE id = p_quote_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Quote not found', NULL::JSONB, NULL::JSONB[], 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;
  
  -- Use provided customer_id or get from quote
  v_customer_id := COALESCE(p_customer_id, v_quote.customer_id);
  
  IF v_customer_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Customer ID required', NULL::JSONB, NULL::JSONB[], 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;
  
  -- Validate discount codes and get applicable discounts
  FOR v_discount_record IN 
    SELECT * FROM calculate_applicable_discounts(
      v_customer_id,
      COALESCE((v_quote.calculation_data->>'total_customer_currency')::NUMERIC, v_quote.total_usd),
      COALESCE((v_quote.calculation_data->'calculation_steps'->>'handling_fee')::NUMERIC, 0),
      'card', -- Default payment method
      v_quote.destination_country
    )
    WHERE discount_code = ANY(p_discount_codes)
  LOOP
    -- Determine applicable component based on discount type or default to 'total'
    v_applicable_component := CASE 
      WHEN v_discount_record.discount_type = 'shipping' THEN 'shipping'
      WHEN v_discount_record.discount_type = 'customs' THEN 'customs' 
      WHEN v_discount_record.discount_type = 'handling' THEN 'handling'
      ELSE 'total'
    END;
    
    -- Track this discount usage
    INSERT INTO customer_discount_usage (
      customer_id,
      discount_code_id,
      quote_id,
      order_id,
      campaign_id,
      discount_amount,
      original_amount,
      currency,
      components_discounted,
      component_breakdown,
      used_at,
      created_at
    ) VALUES (
      v_customer_id,
      (SELECT id FROM discount_codes WHERE code = v_discount_record.discount_code LIMIT 1),
      p_quote_id,
      NULL, -- Will be updated when order is created
      NULL, -- Campaign ID - could be added later if needed
      v_discount_record.discount_amount,
      v_discount_record.applicable_amount,
      COALESCE(v_quote.customer_currency, 'USD'),
      ARRAY[v_applicable_component],
      jsonb_build_object(v_applicable_component, v_discount_record.discount_amount),
      NOW(),
      NOW()
    )
    ON CONFLICT (customer_id, quote_id, discount_code_id) DO UPDATE SET
      discount_amount = EXCLUDED.discount_amount,
      original_amount = EXCLUDED.original_amount,
      used_at = NOW()
    RETURNING id INTO v_usage_id;
    
    -- Build applied discounts array
    v_applied_discounts := v_applied_discounts || jsonb_build_object(
      'code', v_discount_record.discount_code,
      'name', v_discount_record.discount_code, -- Can be enhanced with proper names
      'type', v_discount_record.discount_type,
      'amount', v_discount_record.discount_amount,
      'applicable_to', v_applicable_component,
      'usage_id', v_usage_id
    );
    
    v_total_savings := v_total_savings + v_discount_record.discount_amount;
  END LOOP;
  
  IF array_length(v_applied_discounts, 1) = 0 THEN
    RETURN QUERY SELECT FALSE, 'No valid discount codes found', NULL::JSONB, NULL::JSONB[], 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;
  
  -- Calculate new total (simplified - in real implementation, you'd call the calculator)
  v_new_total := GREATEST(
    COALESCE((v_quote.calculation_data->>'total_customer_currency')::NUMERIC, v_quote.total_usd) - v_total_savings,
    0
  );
  
  -- Build updated calculation data with all discount information
  v_updated_calculation_data := COALESCE(v_quote.calculation_data, '{}');
  v_updated_calculation_data := jsonb_set(v_updated_calculation_data, '{applied_discounts}', to_jsonb(v_applied_discounts));
  v_updated_calculation_data := jsonb_set(v_updated_calculation_data, '{total_savings}', to_jsonb(v_total_savings));
  v_updated_calculation_data := jsonb_set(v_updated_calculation_data, '{discounted_total}', to_jsonb(v_new_total));
  
  -- Update quote with applied discounts (single assignment to calculation_data)
  UPDATE quotes_v2 
  SET 
    calculation_data = v_updated_calculation_data,
    total_customer_currency = v_new_total,
    updated_at = NOW()
  WHERE id = p_quote_id;
  
  -- Build return result
  v_recalculated_result := v_updated_calculation_data;
  
  RETURN QUERY SELECT 
    TRUE, 
    format('%s discount(s) applied successfully', array_length(v_applied_discounts, 1)), 
    v_recalculated_result,
    v_applied_discounts,
    v_total_savings,
    v_new_total;
END;
$$;


--
-- Name: FUNCTION apply_discount_to_quote(p_quote_id uuid, p_discount_codes text[], p_customer_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.apply_discount_to_quote(p_quote_id uuid, p_discount_codes text[], p_customer_id uuid) IS 'Applies discount codes to a quote, recalculates totals, and tracks usage for analytics - WORKING VERSION';


--
-- Name: apply_market_settings(text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.apply_market_settings(p_market_code text, p_settings jsonb) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_market_id UUID;
    v_updated_count INTEGER := 0;
BEGIN
    -- Get market ID
    SELECT id INTO v_market_id
    FROM public.markets
    WHERE code = p_market_code;
    
    IF v_market_id IS NULL THEN
        RAISE EXCEPTION 'Market with code % not found', p_market_code;
    END IF;
    
    -- Update market settings
    UPDATE public.markets
    SET 
        settings = p_settings,
        updated_at = now()
    WHERE id = v_market_id;
    
    -- Apply settings to all countries in the market
    v_updated_count := public.bulk_update_countries_by_market(v_market_id, p_settings);
    
    RETURN v_updated_count;
END;
$$;


--
-- Name: approve_refund_request(uuid, numeric, text); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: auto_match_transactions(uuid); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: before_address_insert(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: bulk_update_countries_by_market(uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.bulk_update_countries_by_market(p_market_id uuid, p_updates jsonb) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_updated_count INTEGER := 0;
BEGIN
    -- Update all countries in the specified market
    UPDATE public.country_settings cs
    SET 
        sales_tax = COALESCE((p_updates->>'sales_tax')::NUMERIC, cs.sales_tax),
        vat = COALESCE((p_updates->>'vat')::NUMERIC, cs.vat),
        min_shipping = COALESCE((p_updates->>'min_shipping')::NUMERIC, cs.min_shipping),
        additional_shipping = COALESCE((p_updates->>'additional_shipping')::NUMERIC, cs.additional_shipping),
        payment_gateway = COALESCE(p_updates->>'payment_gateway', cs.payment_gateway),
        available_gateways = COALESCE(
            ARRAY(SELECT jsonb_array_elements_text(p_updates->'available_gateways')),
            cs.available_gateways
        ),
        purchase_allowed = COALESCE((p_updates->>'purchase_allowed')::BOOLEAN, cs.purchase_allowed),
        shipping_allowed = COALESCE((p_updates->>'shipping_allowed')::BOOLEAN, cs.shipping_allowed),
        is_active = COALESCE((p_updates->>'is_active')::BOOLEAN, cs.is_active),
        updated_at = now()
    FROM public.market_countries mc
    WHERE mc.country_code = cs.code
    AND mc.market_id = p_market_id;
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RETURN v_updated_count;
END;
$$;


--
-- Name: bulk_update_discount_status(uuid[], boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.bulk_update_discount_status(discount_ids uuid[], new_status boolean) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_updated_count integer;
BEGIN
  UPDATE discount_codes
  SET 
    is_active = new_status,
    updated_at = NOW()
  WHERE id = ANY(discount_ids);
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  -- Also update related campaigns if all codes are deactivated
  IF new_status = false THEN
    UPDATE discount_campaigns
    SET 
      is_active = false,
      updated_at = NOW()
    WHERE id IN (
      SELECT DISTINCT campaign_id 
      FROM discount_codes 
      WHERE id = ANY(discount_ids) AND campaign_id IS NOT NULL
    )
    AND NOT EXISTS (
      SELECT 1 
      FROM discount_codes dc 
      WHERE dc.campaign_id = discount_campaigns.id 
        AND dc.is_active = true
        AND dc.id != ANY(discount_ids)
    );
  END IF;
  
  RETURN v_updated_count;
END;
$$;


--
-- Name: FUNCTION bulk_update_discount_status(discount_ids uuid[], new_status boolean); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.bulk_update_discount_status(discount_ids uuid[], new_status boolean) IS 'Updates the active status of multiple discount codes at once';


--
-- Name: bulk_update_tax_methods(text[], text, text, text); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: FUNCTION bulk_update_tax_methods(p_quote_ids text[], p_admin_id text, p_calculation_method text, p_change_reason text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.bulk_update_tax_methods(p_quote_ids text[], p_admin_id text, p_calculation_method text, p_change_reason text) IS 'Updates calculation method for multiple quotes with admin audit logging';


--
-- Name: calculate_applicable_discounts(uuid, numeric, numeric, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_applicable_discounts(p_customer_id uuid, p_quote_total numeric, p_handling_fee numeric, p_payment_method text, p_country_code text) RETURNS TABLE(discount_id uuid, discount_code text, discount_type text, value numeric, applicable_amount numeric, discount_amount numeric, priority integer)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    -- Return applicable discounts based on actual schema
    RETURN QUERY
    SELECT 
        dc.id as discount_id,
        dc.code as discount_code,
        dt.type as discount_type,
        dt.value,
        CASE 
            WHEN dt.type = 'percentage' THEN p_quote_total
            WHEN dt.type = 'fixed_amount' THEN LEAST(dt.value, p_quote_total)
            WHEN dt.type = 'handling_fee' THEN p_handling_fee
            ELSE 0
        END as applicable_amount,
        CASE 
            WHEN dt.type = 'percentage' THEN (p_quote_total * dt.value / 100)
            WHEN dt.type = 'fixed_amount' THEN LEAST(dt.value, p_quote_total)
            WHEN dt.type = 'handling_fee' THEN LEAST(dt.value, p_handling_fee)
            ELSE 0
        END as discount_amount,
        dt.priority
    FROM discount_codes dc
    JOIN discount_types dt ON dc.discount_type_id = dt.id
    LEFT JOIN country_discount_rules cdr ON dt.id = cdr.discount_type_id
    WHERE dc.is_active = true
    AND dt.is_active = true
    AND dc.valid_from <= CURRENT_TIMESTAMP
    AND (dc.valid_until IS NULL OR dc.valid_until >= CURRENT_TIMESTAMP)
    AND (dc.usage_limit IS NULL OR dc.usage_count < dc.usage_limit)
    AND (
        -- Check country rules if they exist
        cdr.country_code IS NULL 
        OR cdr.country_code = p_country_code
        OR NOT EXISTS (SELECT 1 FROM country_discount_rules WHERE discount_type_id = dt.id)
    )
    AND (
        -- Check conditions from discount_types.conditions
        dt.conditions IS NULL 
        OR dt.conditions = '{}'::jsonb
        OR (
            (dt.conditions->>'min_order_amount')::numeric IS NULL 
            OR p_quote_total >= (dt.conditions->>'min_order_amount')::numeric
        )
        AND (
            (dt.conditions->>'max_order_amount')::numeric IS NULL 
            OR p_quote_total <= (dt.conditions->>'max_order_amount')::numeric
        )
        AND (
            (dt.conditions->>'payment_methods') IS NULL
            OR p_payment_method = ANY(ARRAY(SELECT jsonb_array_elements_text(dt.conditions->'payment_methods')))
        )
    )
    ORDER BY dt.priority ASC, dt.value DESC;
END;
$$;


--
-- Name: FUNCTION calculate_applicable_discounts(p_customer_id uuid, p_quote_total numeric, p_handling_fee numeric, p_payment_method text, p_country_code text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.calculate_applicable_discounts(p_customer_id uuid, p_quote_total numeric, p_handling_fee numeric, p_payment_method text, p_country_code text) IS 'Calculates applicable discounts for a quote based on customer, quote total, handling fee, payment method, and country. 
Used by DiscountService to determine which discounts can be applied to a quote.';


--
-- Name: calculate_membership_discount(uuid, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_membership_discount(p_customer_id uuid, p_amount numeric) RETURNS TABLE(has_discount boolean, discount_percentage integer, discount_amount numeric, membership_name text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  WITH active_membership AS (
    SELECT 
      mp.discount_percentage,
      mp.name
    FROM customer_memberships cm
    JOIN membership_plans mp ON mp.id = cm.membership_tier_id
    WHERE cm.customer_id = p_customer_id
      AND cm.status = 'active'
      AND (cm.expires_at IS NULL OR cm.expires_at > NOW())
      AND mp.is_active = true
    ORDER BY mp.discount_percentage DESC
    LIMIT 1
  )
  SELECT 
    CASE WHEN am.discount_percentage IS NOT NULL THEN true ELSE false END as has_discount,
    COALESCE(am.discount_percentage, 0) as discount_percentage,
    COALESCE(p_amount * am.discount_percentage / 100, 0) as discount_amount,
    am.name as membership_name
  FROM (SELECT 1) dummy
  LEFT JOIN active_membership am ON true;
END;
$$;


--
-- Name: calculate_origin_totals_from_items(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_origin_totals_from_items(quote_items jsonb) RETURNS TABLE(items_total numeric)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(
      SUM(
        (COALESCE(item->>'unit_price_origin', item->>'costprice_origin', '0'))::DECIMAL(10,2) * 
        (COALESCE(item->>'quantity', '1'))::INTEGER
      ), 
      0
    ) as items_total
  FROM jsonb_array_elements(quote_items) AS item;
END;
$$;


--
-- Name: calculate_quote_expiry(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_quote_expiry() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Set expiry date based on validity_days
  IF NEW.validity_days IS NOT NULL AND NEW.expires_at IS NULL THEN
    NEW.expires_at := NEW.created_at + (NEW.validity_days || ' days')::INTERVAL;
  END IF;
  
  -- Generate share token if not set
  IF NEW.share_token IS NULL THEN
    NEW.share_token := generate_quote_share_token();
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: calculate_storage_fees(uuid, date); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: calculate_storage_fees(uuid, uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_storage_fees(p_customer_id uuid, p_package_id uuid, p_storage_days integer) RETURNS TABLE(base_fee numeric, discount_percentage numeric, final_fee numeric, free_days_used integer)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $_$
DECLARE
  v_membership RECORD;
  v_base_daily_fee DECIMAL := 0.50; -- $0.50 per day base fee
  v_free_days INTEGER := 0;
  v_discount_pct DECIMAL := 0;
BEGIN
  -- Check membership benefits
  SELECT * FROM check_customer_membership(p_customer_id) INTO v_membership;
  
  IF v_membership.has_membership THEN
    v_free_days := COALESCE((v_membership.warehouse_benefits->>'free_storage_days')::INTEGER, 0);
    v_discount_pct := COALESCE((v_membership.warehouse_benefits->>'discount_percentage_after_free')::DECIMAL, 0);
  END IF;

  -- Calculate fees
  RETURN QUERY
  SELECT 
    (GREATEST(p_storage_days - v_free_days, 0) * v_base_daily_fee) as base_fee,
    v_discount_pct as discount_percentage,
    (GREATEST(p_storage_days - v_free_days, 0) * v_base_daily_fee * (1 - v_discount_pct/100)) as final_fee,
    LEAST(p_storage_days, v_free_days) as free_days_used;
END;
$_$;


--
-- Name: calculate_ticket_sla_metrics(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_ticket_sla_metrics(p_ticket_id uuid) RETURNS TABLE(ticket_id uuid, first_response_time_minutes integer, total_response_time_minutes integer, resolution_time_minutes integer, sla_status text, response_sla_met boolean, resolution_sla_met boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  ticket_record RECORD;
  sla_config RECORD;
  first_reply_time TIMESTAMPTZ;
  resolution_time TIMESTAMPTZ;
BEGIN
  -- Get ticket details
  SELECT * INTO ticket_record
  FROM support_system s
  WHERE s.id = p_ticket_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Get SLA configuration for this priority
  SELECT * INTO sla_config
  FROM sla_configurations
  WHERE priority = ticket_record.priority;
  
  -- Get first admin response time
  SELECT MIN(created_at) INTO first_reply_time
  FROM support_interactions si
  JOIN user_roles ur ON si.user_id = ur.user_id
  WHERE si.support_id = p_ticket_id
  AND si.interaction_type = 'reply'
  AND ur.role IN ('admin', 'moderator');
  
  -- Get resolution time (when ticket was marked as resolved/closed)
  SELECT created_at INTO resolution_time
  FROM support_interactions
  WHERE support_id = p_ticket_id
  AND interaction_type = 'status_change'
  AND content->>'new_status' IN ('resolved', 'closed')
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no status change found, use updated_at if ticket is resolved/closed
  IF resolution_time IS NULL AND ticket_record.status IN ('resolved', 'closed') THEN
    resolution_time = ticket_record.updated_at;
  END IF;
  
  -- Calculate metrics
  RETURN QUERY SELECT
    p_ticket_id,
    CASE 
      WHEN first_reply_time IS NOT NULL THEN 
        EXTRACT(EPOCH FROM (first_reply_time - ticket_record.created_at)) / 60
      ELSE NULL 
    END::INTEGER,
    CASE 
      WHEN first_reply_time IS NOT NULL THEN 
        EXTRACT(EPOCH FROM (COALESCE(resolution_time, NOW()) - ticket_record.created_at)) / 60
      ELSE NULL 
    END::INTEGER,
    CASE 
      WHEN resolution_time IS NOT NULL THEN 
        EXTRACT(EPOCH FROM (resolution_time - ticket_record.created_at)) / 60
      ELSE NULL 
    END::INTEGER,
    CASE
      WHEN ticket_record.status IN ('resolved', 'closed') THEN 'completed'
      WHEN first_reply_time IS NULL AND 
           EXTRACT(EPOCH FROM (NOW() - ticket_record.created_at)) / 60 > sla_config.first_response_target_minutes THEN 'overdue'
      WHEN first_reply_time IS NULL AND 
           EXTRACT(EPOCH FROM (NOW() - ticket_record.created_at)) / 60 > (sla_config.first_response_target_minutes * 0.8) THEN 'approaching_deadline'
      ELSE 'on_track'
    END,
    CASE 
      WHEN first_reply_time IS NOT NULL THEN
        EXTRACT(EPOCH FROM (first_reply_time - ticket_record.created_at)) / 60 <= sla_config.first_response_target_minutes
      ELSE FALSE
    END,
    CASE 
      WHEN resolution_time IS NOT NULL THEN
        EXTRACT(EPOCH FROM (resolution_time - ticket_record.created_at)) / 60 <= sla_config.resolution_target_minutes
      ELSE FALSE
    END;
END;
$$;


--
-- Name: categorize_message(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.categorize_message(p_message text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
BEGIN
  -- Convert to lowercase for case-insensitive matching
  p_message := LOWER(p_message);
  
  -- Check for pricing keywords
  IF p_message ~ '.*(price|cost|expensive|cheap|discount|reduce|money|budget|afford).*' THEN
    RETURN 'pricing';
  END IF;
  
  -- Check for items keywords  
  IF p_message ~ '.*(remove|add|change|item|product|replace|color|size|quantity).*' THEN
    RETURN 'items';
  END IF;
  
  -- Check for shipping keywords
  IF p_message ~ '.*(delivery|shipping|fast|slow|courier|dispatch|track|arrive).*' THEN
    RETURN 'shipping';
  END IF;
  
  -- Check for timeline keywords
  IF p_message ~ '.*(urgent|asap|deadline|when|time|rush|quick|delay).*' THEN
    RETURN 'timeline';
  END IF;
  
  -- Default category
  RETURN 'other';
END;
$$;


--
-- Name: FUNCTION categorize_message(p_message text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.categorize_message(p_message text) IS 'Auto-categorizes messages based on keywords for better routing';


--
-- Name: check_customer_membership(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_customer_membership(p_customer_id uuid) RETURNS TABLE(has_membership boolean, membership_tier_id uuid, membership_tier_name text, discount_percentage integer, benefits jsonb)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_membership RECORD;
BEGIN
  -- Get the active membership for the customer
  SELECT 
    mp.id as tier_id,
    mp.name as tier_name,
    mp.discount_percentage,
    mp.benefits
  INTO v_membership
  FROM customer_memberships cm
  JOIN membership_plans mp ON mp.id = cm.membership_tier_id
  WHERE cm.customer_id = p_customer_id 
    AND cm.status = 'active'
    AND (cm.expires_at IS NULL OR cm.expires_at > CURRENT_TIMESTAMP)
    AND mp.is_active = true
  ORDER BY mp.discount_percentage DESC
  LIMIT 1;

  IF v_membership.tier_id IS NOT NULL THEN
    RETURN QUERY SELECT 
      true,
      v_membership.tier_id,
      v_membership.tier_name,
      v_membership.discount_percentage,
      v_membership.benefits;
  ELSE
    RETURN QUERY SELECT 
      false,
      NULL::UUID,
      NULL::TEXT,
      0,
      '{}'::JSONB;
  END IF;
END;
$$;


--
-- Name: check_expired_quotes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_expired_quotes() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE quotes_v2
  SET status = 'expired'
  WHERE expires_at IS NOT NULL
    AND expires_at < NOW()
    AND status IN ('sent', 'viewed')
    AND converted_to_order_id IS NULL;
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  RETURN expired_count;
END;
$$;


--
-- Name: cleanup_expired_authenticated_checkout_sessions(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: cleanup_expired_blocks(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_blocks() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM active_blocks 
  WHERE expires_at IS NOT NULL AND expires_at <= NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


--
-- Name: cleanup_expired_guest_sessions(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: cleanup_expired_phone_otps(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_phone_otps() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    DELETE FROM phone_otps 
    WHERE expires_at < now() - interval '1 hour'; -- Keep for 1 hour after expiry for logging
    
    RAISE LOG 'Cleaned up expired phone OTPs';
END;
$$;


--
-- Name: cleanup_expired_pricing_cache(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_pricing_cache() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM pricing_calculation_cache 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$;


--
-- Name: cleanup_old_payment_error_logs(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_payment_error_logs() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    DELETE FROM public.payment_error_logs 
    WHERE created_at < NOW() - INTERVAL '1 year';
END;
$$;


--
-- Name: cleanup_old_payment_health_logs(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_payment_health_logs() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    DELETE FROM public.payment_health_logs 
    WHERE created_at < NOW() - INTERVAL '6 months';
END;
$$;


--
-- Name: cleanup_old_payment_verification_logs(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_payment_verification_logs() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    DELETE FROM public.payment_verification_logs 
    WHERE created_at < NOW() - INTERVAL '180 days';
END;
$$;


--
-- Name: complete_quote_review(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.complete_quote_review(p_quote_id uuid, p_new_status text DEFAULT 'sent'::text, p_admin_notes text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_quote quotes_v2%ROWTYPE;
  v_user_id UUID;
  v_result JSONB;
BEGIN
  -- Get current user and validate admin access
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL OR NOT is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  -- Get quote
  SELECT * INTO v_quote FROM quotes_v2 WHERE id = p_quote_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quote not found';
  END IF;
  
  IF v_quote.status != 'under_review' THEN
    RAISE EXCEPTION 'Quote is not under review';
  END IF;
  
  -- Validate new status
  IF p_new_status NOT IN ('sent', 'rejected', 'expired') THEN
    RAISE EXCEPTION 'Invalid completion status: %', p_new_status;
  END IF;
  
  -- Update quote
  UPDATE quotes_v2 SET
    status = p_new_status,
    review_completed_at = NOW(),
    admin_notes = CASE 
      WHEN p_admin_notes IS NOT NULL THEN 
        COALESCE(admin_notes, '') || E'\n\n[Review Completed ' || NOW()::date || ']: ' || p_admin_notes
      ELSE admin_notes
    END,
    updated_at = NOW()
  WHERE id = p_quote_id;
  
  -- Close related support tickets
  UPDATE support_system SET
    ticket_data = ticket_data || jsonb_build_object(
      'status', 'resolved',
      'resolved_at', NOW(),
      'resolved_by', v_user_id,
      'resolution_notes', p_admin_notes
    )
  WHERE quote_id = p_quote_id 
    AND system_type = 'quote_review_request'
    AND ticket_data->>'status' = 'open';
  
  v_result := jsonb_build_object(
    'success', true,
    'message', 'Review completed successfully',
    'quote_id', p_quote_id,
    'new_status', p_new_status,
    'completed_at', NOW()
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Failed to complete review'
    );
END;
$$;


--
-- Name: complete_reconciliation(uuid, text); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: complete_supplier_pickup(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.complete_supplier_pickup(p_return_id uuid, p_notes text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Update package return
  UPDATE package_returns
  SET 
    status = 'received',
    received_at = NOW(),
    pickup_completed_at = NOW(),
    admin_notes = COALESCE(admin_notes || E'\n', '') || 
                  'Pickup completed at ' || NOW()::TEXT || 
                  COALESCE('. Notes: ' || p_notes, ''),
    updated_at = NOW()
  WHERE id = p_return_id
  AND return_method = 'supplier_pickup';
  
  -- Update pickup request
  UPDATE supplier_pickup_requests
  SET 
    status = 'completed',
    completed_by = auth.uid(),
    completed_at = NOW(),
    updated_at = NOW()
  WHERE package_return_id = p_return_id
  AND status IN ('scheduled', 'confirmed', 'in_progress');
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'Pickup marked as completed'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', SQLERRM
    );
END;
$$;


--
-- Name: confirm_backup_codes_saved(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: confirm_payment_from_proof(uuid, numeric, text); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: FUNCTION confirm_payment_from_proof(p_quote_id uuid, p_amount_paid numeric, p_payment_status text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.confirm_payment_from_proof(p_quote_id uuid, p_amount_paid numeric, p_payment_status text) IS 'Securely updates payment information for a quote when confirming payment from a payment proof. Only admins can execute this function.';


--
-- Name: convert_minimum_valuation_usd_to_origin(numeric, text); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: copy_country_settings(text, text, text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.copy_country_settings(p_from_country text, p_to_country text, p_fields text[] DEFAULT NULL::text[]) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_from_record public.country_settings%ROWTYPE;
BEGIN
    -- Get source country settings
    SELECT * INTO v_from_record 
    FROM public.country_settings 
    WHERE code = p_from_country;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Source country % not found', p_from_country;
    END IF;
    
    -- If no specific fields specified, copy common settings
    IF p_fields IS NULL THEN
        p_fields := ARRAY[
            'sales_tax', 'vat', 'min_shipping', 'additional_shipping',
            'weight_unit', 'volumetric_divisor', 'payment_gateway_fixed_fee',
            'payment_gateway_percent_fee', 'payment_gateway', 'available_gateways',
            'decimal_places', 'thousand_separator', 'decimal_separator',
            'symbol_position', 'symbol_space', 'date_format'
        ];
    END IF;
    
    -- Update target country with selected fields
    UPDATE public.country_settings
    SET
        sales_tax = CASE WHEN 'sales_tax' = ANY(p_fields) THEN v_from_record.sales_tax ELSE sales_tax END,
        vat = CASE WHEN 'vat' = ANY(p_fields) THEN v_from_record.vat ELSE vat END,
        min_shipping = CASE WHEN 'min_shipping' = ANY(p_fields) THEN v_from_record.min_shipping ELSE min_shipping END,
        additional_shipping = CASE WHEN 'additional_shipping' = ANY(p_fields) THEN v_from_record.additional_shipping ELSE additional_shipping END,
        weight_unit = CASE WHEN 'weight_unit' = ANY(p_fields) THEN v_from_record.weight_unit ELSE weight_unit END,
        volumetric_divisor = CASE WHEN 'volumetric_divisor' = ANY(p_fields) THEN v_from_record.volumetric_divisor ELSE volumetric_divisor END,
        payment_gateway_fixed_fee = CASE WHEN 'payment_gateway_fixed_fee' = ANY(p_fields) THEN v_from_record.payment_gateway_fixed_fee ELSE payment_gateway_fixed_fee END,
        payment_gateway_percent_fee = CASE WHEN 'payment_gateway_percent_fee' = ANY(p_fields) THEN v_from_record.payment_gateway_percent_fee ELSE payment_gateway_percent_fee END,
        payment_gateway = CASE WHEN 'payment_gateway' = ANY(p_fields) THEN v_from_record.payment_gateway ELSE payment_gateway END,
        available_gateways = CASE WHEN 'available_gateways' = ANY(p_fields) THEN v_from_record.available_gateways ELSE available_gateways END,
        decimal_places = CASE WHEN 'decimal_places' = ANY(p_fields) THEN v_from_record.decimal_places ELSE decimal_places END,
        thousand_separator = CASE WHEN 'thousand_separator' = ANY(p_fields) THEN v_from_record.thousand_separator ELSE thousand_separator END,
        decimal_separator = CASE WHEN 'decimal_separator' = ANY(p_fields) THEN v_from_record.decimal_separator ELSE decimal_separator END,
        symbol_position = CASE WHEN 'symbol_position' = ANY(p_fields) THEN v_from_record.symbol_position ELSE symbol_position END,
        symbol_space = CASE WHEN 'symbol_space' = ANY(p_fields) THEN v_from_record.symbol_space ELSE symbol_space END,
        date_format = CASE WHEN 'date_format' = ANY(p_fields) THEN v_from_record.date_format ELSE date_format END,
        updated_at = now()
    WHERE code = p_to_country;
    
    RETURN FOUND;
END;
$$;


--
-- Name: create_consolidation_quote(uuid, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_consolidation_quote(p_consolidation_group_id uuid, p_destination_country text, p_customer_data jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_quote_id uuid;
  v_group_data record;
  v_package_ids uuid[];
  v_quote_items jsonb;
  v_total_declared_value numeric;
BEGIN
  -- Get consolidation group data
  SELECT 
    user_id,
    group_name,
    package_count,
    original_package_ids,
    consolidated_weight_kg,
    consolidation_fee_usd,
    storage_fees_usd,
    service_fee_usd
  INTO v_group_data
  FROM consolidation_groups 
  WHERE id = p_consolidation_group_id;

  -- Get total declared value from packages
  SELECT 
    COALESCE(SUM(declared_value_usd), 0),
    array_agg(id)
  INTO v_total_declared_value, v_package_ids
  FROM received_packages 
  WHERE consolidation_group_id = p_consolidation_group_id;

  -- Build consolidated quote item
  v_quote_items := jsonb_build_array(
    jsonb_build_object(
      'id', p_consolidation_group_id::text,
      'name', COALESCE(v_group_data.group_name, 'Consolidated Package'),
      'quantity', 1,
      'costprice_origin', v_total_declared_value,
      'weight', v_group_data.consolidated_weight_kg,
      'smart_data', jsonb_build_object(
        'weight_confidence', 0.95,
        'price_confidence', 0.9,
        'optimization_hints', jsonb_build_array(
          'Consolidated shipment',
          format('Contains %s packages', v_group_data.package_count)
        )
      )
    )
  );

  -- Create the quote
  INSERT INTO quotes (
    user_id,
    status,
    origin_country,
    destination_country,
    items,
    costprice_total_usd,
    final_total_usd,
    customer_data,
    forwarding_type,
    package_ids,
    consolidation_group_id,
    forwarding_data,
    quote_source
  ) VALUES (
    v_group_data.user_id,
    'pending',
    'US',
    p_destination_country,
    v_quote_items,
    v_total_declared_value,
    0, -- Will be calculated by SmartCalculationEngine
    p_customer_data,
    'consolidation',
    v_package_ids,
    p_consolidation_group_id,
    jsonb_build_object(
      'consolidation_fee_usd', v_group_data.consolidation_fee_usd,
      'storage_fees_usd', v_group_data.storage_fees_usd,
      'service_fee_usd', v_group_data.service_fee_usd,
      'package_count', v_group_data.package_count
    ),
    'package_forwarding'
  ) RETURNING id INTO v_quote_id;

  -- Link consolidation group to quote
  UPDATE consolidation_groups 
  SET quote_id = v_quote_id
  WHERE id = p_consolidation_group_id;

  RETURN v_quote_id;
END;
$$;


--
-- Name: create_credit_note(uuid, numeric, text, text, text, uuid, uuid, integer, numeric, boolean); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: create_package_forwarding_quote(uuid, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_package_forwarding_quote(p_package_id uuid, p_destination_country text, p_customer_data jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_quote_id uuid;
  v_package_data jsonb;
  v_customer_address_id uuid;
  v_user_id uuid;
  v_quote_items jsonb;
BEGIN
  -- Get package data
  SELECT 
    jsonb_build_object(
      'id', id,
      'weight_kg', weight_kg,
      'dimensions', dimensions,
      'declared_value_usd', declared_value_usd,
      'package_description', package_description,
      'sender_store', sender_store
    ),
    customer_address_id
  INTO v_package_data, v_customer_address_id
  FROM received_packages 
  WHERE id = p_package_id;

  -- Get user_id from customer address
  SELECT user_id INTO v_user_id
  FROM customer_addresses 
  WHERE id = v_customer_address_id;

  -- Build quote items from package data
  v_quote_items := jsonb_build_array(
    jsonb_build_object(
      'id', v_package_data->>'id',
      'name', v_package_data->>'package_description',
      'quantity', 1,
      'costprice_origin', (v_package_data->>'declared_value_usd')::numeric,
      'weight', (v_package_data->>'weight_kg')::numeric,
      'smart_data', jsonb_build_object(
        'weight_confidence', 0.9,
        'price_confidence', 0.8,
        'optimization_hints', jsonb_build_array('Package forwarding item')
      )
    )
  );

  -- Create the quote
  INSERT INTO quotes (
    user_id,
    status,
    origin_country,
    destination_country,
    items,
    costprice_total_usd,
    final_total_usd,
    customer_data,
    forwarding_type,
    package_ids,
    forwarding_data,
    quote_source
  ) VALUES (
    v_user_id,
    'pending',
    'US', -- Package forwarding always from US warehouse
    p_destination_country,
    v_quote_items,
    (v_package_data->>'declared_value_usd')::numeric,
    0, -- Will be calculated by SmartCalculationEngine
    p_customer_data,
    'individual_package',
    ARRAY[p_package_id],
    jsonb_build_object(
      'package_data', v_package_data,
      'warehouse_location', 'US_MAIN'
    ),
    'package_forwarding'
  ) RETURNING id INTO v_quote_id;

  -- Link package to quote
  UPDATE received_packages 
  SET quote_id = v_quote_id
  WHERE id = p_package_id;

  RETURN v_quote_id;
END;
$$;


--
-- Name: create_payment_ledger_entry_trigger(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_payment_ledger_entry_trigger() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$ BEGIN IF NEW.payment_method = 'paypal' AND NEW.status = 'completed' THEN IF NOT EXISTS (SELECT 1 FROM payment_ledger WHERE payment_transaction_id = NEW.id OR (quote_id = NEW.quote_id AND gateway_code = 'paypal' AND created_at >= NEW.created_at - INTERVAL '10 seconds')) THEN INSERT INTO payment_ledger (quote_id, payment_transaction_id, payment_type, amount, currency, payment_method, gateway_code, gateway_transaction_id, reference_number, status, payment_date, notes, created_by) VALUES (NEW.quote_id, NEW.id, 'customer_payment', NEW.amount, NEW.currency, 'paypal', 'paypal', COALESCE(NEW.paypal_capture_id, NEW.paypal_order_id, NEW.id::text), COALESCE(NEW.paypal_order_id, NEW.id::text), 'completed', NEW.created_at, 'PayPal payment (auto-created by trigger) - Order: ' || COALESCE(NEW.paypal_order_id, 'N/A'), NEW.user_id); END IF; END IF; RETURN NEW; END; $$;


--
-- Name: create_payment_with_ledger_entry(uuid, numeric, text, text, text, text, text, text, text, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_payment_with_ledger_entry(p_quote_id uuid, p_amount numeric, p_currency text, p_payment_method text, p_payment_type text DEFAULT 'customer_payment'::text, p_reference_number text DEFAULT NULL::text, p_gateway_code text DEFAULT NULL::text, p_gateway_transaction_id text DEFAULT NULL::text, p_notes text DEFAULT NULL::text, p_user_id uuid DEFAULT NULL::uuid, p_message_id uuid DEFAULT NULL::uuid) RETURNS jsonb
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


--
-- Name: FUNCTION create_payment_with_ledger_entry(p_quote_id uuid, p_amount numeric, p_currency text, p_payment_method text, p_payment_type text, p_reference_number text, p_gateway_code text, p_gateway_transaction_id text, p_notes text, p_user_id uuid, p_message_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.create_payment_with_ledger_entry(p_quote_id uuid, p_amount numeric, p_currency text, p_payment_method text, p_payment_type text, p_reference_number text, p_gateway_code text, p_gateway_transaction_id text, p_notes text, p_user_id uuid, p_message_id uuid) IS 'Simplified payment creation without USD conversion logic';


--
-- Name: create_quote_discussion(uuid, uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_quote_discussion(p_customer_id uuid, p_quote_id uuid, p_message text, p_category text DEFAULT 'other'::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_support_id UUID;
  v_quote quotes_v2%ROWTYPE;
  v_subject TEXT;
BEGIN
  -- Validate user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Validate customer owns the quote or is admin
  IF auth.uid() <> p_customer_id AND NOT is_admin() THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;
  
  -- Get quote details for context
  SELECT * INTO v_quote FROM quotes_v2 WHERE id = p_quote_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quote not found';
  END IF;
  
  -- Create subject
  v_subject := 'Discussion about Quote #' || COALESCE(v_quote.quote_number, v_quote.id::text);
  
  -- Create support ticket for quote discussion
  INSERT INTO support_system (
    user_id,
    quote_id,
    system_type,
    ticket_data
  ) VALUES (
    p_customer_id,
    p_quote_id,
    'quote_discussion',
    jsonb_build_object(
      'subject', v_subject,
      'description', p_message,
      'status', 'open',
      'priority', 'medium',
      'category', p_category,
      'quote_context', jsonb_build_object(
        'quote_number', COALESCE(v_quote.quote_number, v_quote.id::text),
        'total_amount', v_quote.total_quote_origincurrency,
        'status', v_quote.status,
        'customer_email', v_quote.customer_email
      )
    )
  ) RETURNING id INTO v_support_id;
  
  -- Add the initial message as interaction
  INSERT INTO support_interactions (
    support_id,
    user_id,
    interaction_type,
    content
  ) VALUES (
    v_support_id,
    p_customer_id,
    'reply',
    jsonb_build_object('message', p_message)
  );
  
  RETURN v_support_id;
END;
$$;


--
-- Name: FUNCTION create_quote_discussion(p_customer_id uuid, p_quote_id uuid, p_message text, p_category text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.create_quote_discussion(p_customer_id uuid, p_quote_id uuid, p_message text, p_category text) IS 'Creates a quote discussion in the support system - replaces complex review request system';


--
-- Name: create_quote_revision(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_quote_revision(p_original_quote_id uuid, p_revision_reason text) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
  new_quote_id UUID;
  original_data RECORD;
  new_version INT;
BEGIN
  -- Get original quote data using parameter name
  SELECT * INTO original_data FROM quotes_v2 WHERE id = p_original_quote_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Original quote not found';
  END IF;
  
  -- Calculate new version number
  SELECT COALESCE(MAX(version), 0) + 1 INTO new_version
  FROM quotes_v2
  WHERE parent_quote_id = p_original_quote_id OR id = p_original_quote_id;
  
  -- Create new revision with all required fields from quotes_v2 table
  INSERT INTO quotes_v2 (
    customer_id,
    customer_email,
    customer_name,
    customer_phone,
    status,
    origin_country,
    destination_country,
    items,
    shipping_method,
    insurance_required,
    calculation_data,
    total_usd,
    total_customer_currency,
    customer_currency,
    admin_notes,
    customer_notes,
    version,
    parent_quote_id,
    revision_reason,
    validity_days,
    payment_terms,
    customer_message
  ) VALUES (
    original_data.customer_id,
    original_data.customer_email,
    original_data.customer_name,
    original_data.customer_phone,
    'draft', -- New revisions start as draft
    original_data.origin_country,
    original_data.destination_country,
    original_data.items,
    original_data.shipping_method,
    original_data.insurance_required,
    original_data.calculation_data,
    original_data.total_usd,
    original_data.total_customer_currency,
    original_data.customer_currency,
    original_data.admin_notes,
    original_data.customer_notes,
    new_version,
    p_original_quote_id,
    p_revision_reason,
    original_data.validity_days,
    original_data.payment_terms,
    original_data.customer_message
  ) RETURNING id INTO new_quote_id;
  
  RETURN new_quote_id;
END;
$$;


--
-- Name: create_refund_request(uuid, text, numeric, text, text, text, text, text, text, uuid[]); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: create_support_ticket(uuid, uuid, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_support_ticket(p_user_id uuid, p_quote_id uuid, p_subject text, p_description text, p_priority text, p_category text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_ticket_id UUID;
    v_ticket_data JSONB;
    v_sla_data JSONB;
    v_priority TEXT := COALESCE(p_priority, 'medium');
    v_category TEXT := COALESCE(p_category, 'general');
BEGIN
    -- Validate input parameters
    IF p_user_id IS NULL OR p_subject IS NULL OR p_description IS NULL THEN
        RAISE EXCEPTION 'Required parameters cannot be null';
    END IF;

    -- Validate priority
    IF v_priority NOT IN ('low', 'medium', 'high', 'urgent') THEN
        v_priority := 'medium';
    END IF;

    -- Validate category
    IF v_category NOT IN ('general', 'payment', 'shipping', 'refund', 'product', 'customs') THEN
        v_category := 'general';
    END IF;

    -- Generate ticket ID
    v_ticket_id := gen_random_uuid();

    -- Build ticket data
    v_ticket_data := jsonb_build_object(
        'subject', p_subject,
        'description', p_description,
        'status', 'open',
        'priority', v_priority,
        'category', v_category,
        'assigned_to', NULL,
        'metadata', jsonb_build_object(
            'created_at', NOW(),
            'source', 'web'
        )
    );

    -- Build SLA data based on priority
    v_sla_data := jsonb_build_object(
        'response_sla', jsonb_build_object(
            'target_minutes', CASE v_priority
                WHEN 'urgent' THEN 30
                WHEN 'high' THEN 120
                WHEN 'medium' THEN 240
                ELSE 480
            END,
            'first_response_at', NULL,
            'is_breached', false,
            'breach_duration', NULL
        ),
        'resolution_sla', jsonb_build_object(
            'target_hours', CASE v_priority
                WHEN 'urgent' THEN 2
                WHEN 'high' THEN 8
                WHEN 'medium' THEN 24
                ELSE 48
            END,
            'resolved_at', NULL,
            'is_breached', false,
            'breach_duration', NULL
        )
    );

    -- Insert the support ticket
    INSERT INTO support_system (
        id,
        user_id,
        quote_id,
        system_type,
        ticket_data,
        sla_data,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        v_ticket_id,
        p_user_id,
        p_quote_id,
        'ticket',
        v_ticket_data,
        v_sla_data,
        true,
        NOW(),
        NOW()
    );

    RETURN v_ticket_id;
END;
$$;


--
-- Name: daily_quote_maintenance(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.daily_quote_maintenance() RETURNS json
    LANGUAGE plpgsql
    AS $$
DECLARE
  expired_count INTEGER;
  reminder_candidates INTEGER;
  result JSON;
BEGIN
  -- Check expired quotes
  expired_count := check_expired_quotes();
  
  -- Count quotes needing reminders
  SELECT COUNT(*) INTO reminder_candidates
  FROM get_quotes_needing_reminders();
  
  -- Build result
  result := json_build_object(
    'timestamp', NOW(),
    'expired_quotes_marked', expired_count,
    'quotes_needing_reminders', reminder_candidates
  );
  
  RETURN result;
END;
$$;


--
-- Name: FUNCTION daily_quote_maintenance(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.daily_quote_maintenance() IS 'Run daily at 9 AM UTC via pg_cron:
SELECT cron.schedule(
  ''daily-quote-maintenance'',
  ''0 9 * * *'',
  $$SELECT daily_quote_maintenance();$$
);';


--
-- Name: detect_cart_abandonment(uuid, text, jsonb, numeric, text, text, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.detect_cart_abandonment(p_user_id uuid DEFAULT NULL::uuid, p_session_id text DEFAULT NULL::text, p_cart_items jsonb DEFAULT '[]'::jsonb, p_cart_value numeric DEFAULT 0, p_currency text DEFAULT 'USD'::text, p_stage text DEFAULT 'cart'::text, p_user_email text DEFAULT NULL::text, p_context jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_abandonment_id UUID;
  v_existing_id UUID;
BEGIN
  -- Check if there's already a recent abandonment event for this user/session
  SELECT id INTO v_existing_id
  FROM cart_abandonment_events
  WHERE (
    (p_user_id IS NOT NULL AND user_id = p_user_id) OR
    (p_session_id IS NOT NULL AND session_id = p_session_id)
  )
  AND abandoned_at > NOW() - INTERVAL '1 hour'
  AND is_recovered = FALSE
  ORDER BY abandoned_at DESC
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- Update existing abandonment event
    UPDATE cart_abandonment_events
    SET 
      cart_items = p_cart_items,
      cart_value = p_cart_value,
      currency = p_currency,
      abandonment_stage = p_stage,
      last_activity_at = NOW(),
      updated_at = NOW()
    WHERE id = v_existing_id;
    
    RETURN v_existing_id;
  ELSE
    -- Create new abandonment event
    INSERT INTO cart_abandonment_events (
      user_id,
      session_id,
      cart_items,
      cart_value,
      currency,
      abandonment_stage,
      user_email,
      page_url,
      user_agent,
      country
    ) VALUES (
      p_user_id,
      COALESCE(p_session_id, gen_random_uuid()::text),
      p_cart_items,
      p_cart_value,
      p_currency,
      p_stage,
      p_user_email,
      p_context->>'page_url',
      p_context->>'user_agent',
      p_context->>'country'
    )
    RETURNING id INTO v_abandonment_id;
    
    RETURN v_abandonment_id;
  END IF;
END;
$$;


--
-- Name: encode_base32(bytea); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: ensure_phone_e164_format(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ensure_phone_e164_format() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Only process if phone is being set
  IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
    -- Remove all spaces from phone
    NEW.phone := REPLACE(NEW.phone, ' ', '');
    
    -- If phone doesn't start with +, try to add it intelligently
    IF NOT NEW.phone LIKE '+%' THEN
      -- Log warning for monitoring
      RAISE WARNING 'Phone number % for user % does not start with +, attempting to fix', NEW.phone, NEW.email;
      
      -- Try to detect country and add + prefix
      IF LENGTH(NEW.phone) >= 10 THEN
        NEW.phone := '+' || NEW.phone;
      END IF;
    END IF;
    
    -- Final validation - ensure it starts with +
    IF NOT NEW.phone LIKE '+%' THEN
      RAISE EXCEPTION 'Phone number must be in E.164 format with + prefix. Got: %', NEW.phone;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: ensure_profile_exists(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ensure_profile_exists(user_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  profile_id UUID;
BEGIN
  -- Check if profile exists
  SELECT id INTO profile_id FROM profiles WHERE id = user_id;
  
  -- If not, create it
  IF profile_id IS NULL THEN
    INSERT INTO profiles (id, created_at, updated_at)
    VALUES (user_id, NOW(), NOW())
    RETURNING id INTO profile_id;
  END IF;
  
  RETURN profile_id;
END;
$$;


--
-- Name: ensure_single_default_address(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ensure_single_default_address() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- If setting this address as default
  IF NEW.is_default = true THEN
    -- Unset default on all other addresses for this user
    UPDATE delivery_addresses
    SET is_default = false
    WHERE user_id = NEW.user_id
    AND id != NEW.id
    AND is_default = true;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: ensure_user_profile(uuid); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: ensure_user_profile_exists(uuid); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: ensure_user_profile_with_oauth(uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: FUNCTION ensure_user_profile_with_oauth(_user_id uuid, _user_metadata jsonb); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.ensure_user_profile_with_oauth(_user_id uuid, _user_metadata jsonb) IS 'Creates user profile with comprehensive OAuth data and auto-detects country from address information';


--
-- Name: estimate_product_weight(text, character varying, character varying, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.estimate_product_weight(product_query text, target_country character varying, category_hint character varying DEFAULT NULL::character varying, price_usd numeric DEFAULT NULL::numeric) RETURNS TABLE(estimated_weight_kg numeric, confidence_score numeric, estimation_method text, classification_used character varying)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    best_match RECORD;
    category_avg DECIMAL(8,3);
    default_weights JSONB;
BEGIN
    -- Default weights by category
    default_weights := '{
        "Electronics": 0.5,
        "Clothing": 0.3,
        "Toys": 0.4,
        "Books": 0.2,
        "Home": 1.0,
        "Sports": 0.8,
        "Beauty": 0.2,
        "Food": 0.5
    }'::JSONB;

    -- Try to find exact product match first
    SELECT INTO best_match
        pc.typical_weight_kg,
        pc.weight_variance_factor,
        pc.classification_code,
        pc.confidence_score
    FROM product_classifications pc
    WHERE pc.country_code = target_country
    AND pc.is_active = true
    AND pc.typical_weight_kg IS NOT NULL
    AND (
        pc.product_name ILIKE '%' || product_query || '%' OR
        product_query = ANY(pc.search_keywords) OR
        to_tsvector('english', pc.product_name || ' ' || COALESCE(pc.description, '')) 
        @@ plainto_tsquery('english', product_query)
    )
    ORDER BY 
        CASE WHEN pc.product_name ILIKE '%' || product_query || '%' THEN 1 ELSE 2 END,
        pc.confidence_score DESC,
        pc.usage_frequency DESC
    LIMIT 1;

    -- If found exact match, use it
    IF best_match.typical_weight_kg IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            (best_match.typical_weight_kg * COALESCE(best_match.weight_variance_factor, 1.0))::DECIMAL(8,3),
            LEAST(best_match.confidence_score * 0.9, 0.95)::DECIMAL(3,2),
            'Product-specific estimation'::TEXT,
            best_match.classification_code::VARCHAR(20);
        RETURN;
    END IF;

    -- Try category-based estimation
    IF category_hint IS NOT NULL THEN
        SELECT INTO category_avg
            AVG(pc.typical_weight_kg)
        FROM product_classifications pc
        WHERE pc.country_code = target_country
        AND pc.category = category_hint
        AND pc.is_active = true
        AND pc.typical_weight_kg IS NOT NULL;

        IF category_avg IS NOT NULL THEN
            RETURN QUERY
            SELECT 
                category_avg::DECIMAL(8,3),
                0.7::DECIMAL(3,2),
                ('Category-based estimation for ' || category_hint)::TEXT,
                NULL::VARCHAR(20);
            RETURN;
        END IF;
    END IF;

    -- Use default weight based on category or generic default
    RETURN QUERY
    SELECT 
        COALESCE(
            (default_weights->category_hint)::TEXT::DECIMAL(8,3),
            0.5::DECIMAL(8,3)
        ),
        0.5::DECIMAL(3,2),
        'Default weight estimation'::TEXT,
        NULL::VARCHAR(20);
END;
$$;


--
-- Name: expire_quotes(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: extend_storage_exemption(uuid, integer, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.extend_storage_exemption(p_package_id uuid, p_additional_days integer, p_reason text, p_admin_id uuid) RETURNS date
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_new_exempt_date DATE;
BEGIN
  UPDATE received_packages
  SET 
    storage_fee_exempt_until = storage_fee_exempt_until + INTERVAL '1 day' * p_additional_days
  WHERE id = p_package_id
  RETURNING DATE(storage_fee_exempt_until) INTO v_new_exempt_date;
  
  -- Log the extension (simplified without admin_activity_logs dependency)
  -- TODO: Add proper activity logging when admin_activity_logs table is available
  
  RETURN v_new_exempt_date;
END;
$$;


--
-- Name: FUNCTION extend_storage_exemption(p_package_id uuid, p_additional_days integer, p_reason text, p_admin_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.extend_storage_exemption(p_package_id uuid, p_additional_days integer, p_reason text, p_admin_id uuid) IS 'Fixed RPC access - function now properly exposed to authenticated role to resolve 404 errors';


--
-- Name: extract_oauth_user_info(jsonb); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: FUNCTION extract_oauth_user_info(user_metadata jsonb); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.extract_oauth_user_info(user_metadata jsonb) IS 'Extracts comprehensive user information from OAuth providers including phone, addresses, birthday, gender, organization';


--
-- Name: fix_missing_default_addresses(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fix_missing_default_addresses() RETURNS TABLE(user_id uuid, address_id uuid, success boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  user_record RECORD;
  first_address_record RECORD;
BEGIN
  -- Loop through users without default addresses
  FOR user_record IN 
    SELECT * FROM get_users_without_default_address()
  LOOP
    -- Get their first (oldest) address
    SELECT id INTO first_address_record
    FROM delivery_addresses
    WHERE delivery_addresses.user_id = user_record.user_id
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF first_address_record.id IS NOT NULL THEN
      -- Set it as default
      UPDATE delivery_addresses
      SET is_default = true
      WHERE id = first_address_record.id;
      
      -- Return success record
      user_id := user_record.user_id;
      address_id := first_address_record.id;
      success := true;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;


--
-- Name: FUNCTION fix_missing_default_addresses(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fix_missing_default_addresses() IS 'Fixes users who have addresses but no default address by setting their first address as default';


--
-- Name: force_update_payment(uuid, numeric, text, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.force_update_payment(p_quote_id uuid, new_amount_paid numeric, new_payment_status text, payment_method text DEFAULT 'bank_transfer'::text, reference_number text DEFAULT NULL::text, notes text DEFAULT NULL::text, payment_currency text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: FUNCTION force_update_payment(p_quote_id uuid, new_amount_paid numeric, new_payment_status text, payment_method text, reference_number text, notes text, payment_currency text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.force_update_payment(p_quote_id uuid, new_amount_paid numeric, new_payment_status text, payment_method text, reference_number text, notes text, payment_currency text) IS 'Simplified payment update function that works purely in payment currency - no conversions';


--
-- Name: generate_backup_codes(integer); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: generate_display_id(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: generate_iwish_tracking_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_iwish_tracking_id() RETURNS text
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Generate format: IWB{YEAR}{SEQUENCE} → IWB20251001
  RETURN 'IWB' || EXTRACT(YEAR FROM NOW()) || LPAD(nextval('iwish_tracking_sequence')::TEXT, 4, '0');
END;
$$;


--
-- Name: FUNCTION generate_iwish_tracking_id(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.generate_iwish_tracking_id() IS 'Generates iwishBag tracking IDs in format IWB{YEAR}{SEQUENCE}';


--
-- Name: generate_payment_link_code(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: generate_quote_number_v2(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_quote_number_v2() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
  new_number TEXT;
  year_prefix TEXT;
  sequence_num INTEGER;
BEGIN
  year_prefix := 'Q' || TO_CHAR(NOW(), 'YY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(quote_number FROM 4) AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM quotes_v2
  WHERE quote_number LIKE year_prefix || '%';
  
  new_number := year_prefix || LPAD(sequence_num::TEXT, 5, '0');
  
  RETURN new_number;
END;
$$;


--
-- Name: generate_quote_share_token(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_quote_share_token() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
  token TEXT;
  exists_count INT;
BEGIN
  LOOP
    -- Generate a secure random token (12 characters)
    token := encode(gen_random_bytes(9), 'base64');
    -- Remove special characters for URL safety
    token := regexp_replace(token, '[/+=]', '', 'g');
    token := substring(token, 1, 12);
    
    -- Check if token already exists
    SELECT COUNT(*) INTO exists_count FROM quotes_v2 WHERE share_token = token;
    
    -- Exit loop if token is unique
    EXIT WHEN exists_count = 0;
  END LOOP;
  
  RETURN token;
END;
$$;


--
-- Name: generate_share_token(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_share_token() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..16 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;


--
-- Name: generate_suite_number(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: generate_verification_token(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_verification_token() RETURNS text
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'base64');
END;
$$;


--
-- Name: get_abuse_statistics(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_abuse_statistics(p_timeframe text DEFAULT 'day'::text) RETURNS TABLE(total_attempts bigint, blocked_attempts bigint, active_blocks bigint, prevention_rate numeric, top_abuse_types jsonb, geographic_distribution jsonb, hourly_trend jsonb)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  time_filter TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Set time filter based on timeframe
  CASE p_timeframe
    WHEN 'hour' THEN time_filter := NOW() - INTERVAL '1 hour';
    WHEN 'week' THEN time_filter := NOW() - INTERVAL '1 week';
    ELSE time_filter := NOW() - INTERVAL '1 day';
  END CASE;
  
  -- Get basic statistics
  SELECT 
    COUNT(*)::BIGINT,
    COUNT(CASE WHEN response_action != 'log_only' THEN 1 END)::BIGINT
  INTO total_attempts, blocked_attempts
  FROM abuse_attempts 
  WHERE detected_at >= time_filter;
  
  -- Get active blocks count
  SELECT COUNT(*)::BIGINT INTO active_blocks
  FROM active_blocks 
  WHERE expires_at IS NULL OR expires_at > NOW();
  
  -- Calculate prevention rate
  IF total_attempts > 0 THEN
    prevention_rate := (blocked_attempts::NUMERIC / total_attempts::NUMERIC) * 100;
  ELSE
    prevention_rate := 0;
  END IF;
  
  -- Get top abuse types
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'type', abuse_type,
        'count', count
      )
      ORDER BY count DESC
    ), '[]'::jsonb
  ) INTO top_abuse_types
  FROM (
    SELECT abuse_type, COUNT(*) as count
    FROM abuse_attempts 
    WHERE detected_at >= time_filter
    GROUP BY abuse_type
    ORDER BY count DESC
    LIMIT 10
  ) top_types;
  
  -- Get geographic distribution (simplified - using first 3 octets of IP)
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'country', COALESCE(country, 'Unknown'),
        'count', count
      )
      ORDER BY count DESC
    ), '[]'::jsonb
  ) INTO geographic_distribution
  FROM (
    SELECT 
      CASE 
        WHEN ip_address IS NULL THEN 'Unknown'
        WHEN host(ip_address) LIKE '192.168.%' OR host(ip_address) LIKE '10.%' OR host(ip_address) LIKE '172.%' THEN 'Private'
        ELSE 'Public'
      END as country,
      COUNT(*) as count
    FROM abuse_attempts 
    WHERE detected_at >= time_filter
    GROUP BY 1
    ORDER BY count DESC
    LIMIT 10
  ) geo_data;
  
  -- Get hourly trend (last 24 hours)
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'hour', hour_label,
        'attempts', attempts,
        'blocked', blocked
      )
      ORDER BY hour_start
    ), '[]'::jsonb
  ) INTO hourly_trend
  FROM (
    SELECT 
      date_trunc('hour', generate_series(
        NOW() - INTERVAL '23 hours', 
        NOW(), 
        '1 hour'::interval
      )) as hour_start,
      to_char(date_trunc('hour', generate_series(
        NOW() - INTERVAL '23 hours', 
        NOW(), 
        '1 hour'::interval
      )), 'HH24:MI') as hour_label,
      COALESCE(attempts, 0) as attempts,
      COALESCE(blocked, 0) as blocked
    FROM generate_series(
      NOW() - INTERVAL '23 hours', 
      NOW(), 
      '1 hour'::interval
    ) gs
    LEFT JOIN (
      SELECT 
        date_trunc('hour', detected_at) as hour,
        COUNT(*) as attempts,
        COUNT(CASE WHEN response_action != 'log_only' THEN 1 END) as blocked
      FROM abuse_attempts
      WHERE detected_at >= NOW() - INTERVAL '24 hours'
      GROUP BY date_trunc('hour', detected_at)
    ) stats ON date_trunc('hour', gs) = stats.hour
    ORDER BY hour_start
  ) trend_data;
  
  RETURN NEXT;
END;
$$;


--
-- Name: get_active_payment_link_for_quote(uuid); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: get_admin_activity_summary(timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_admin_activity_summary(p_start_date timestamp with time zone DEFAULT (now() - '7 days'::interval), p_end_date timestamp with time zone DEFAULT now()) RETURNS TABLE(action text, count bigint, recent_timestamp timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.action,
    COUNT(*)::BIGINT,
    MAX(al.created_at) as recent_timestamp
  FROM audit_logs al
  WHERE al.created_at BETWEEN p_start_date AND p_end_date
  GROUP BY al.action
  ORDER BY COUNT(*) DESC;
END;
$$;


--
-- Name: get_admin_users_for_assignment(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_admin_users_for_assignment() RETURNS TABLE(user_id uuid, full_name text, email text, role text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Check if user is admin/moderator first
  IF NOT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'moderator')
    AND ur.is_active = true
  ) THEN
    RAISE EXCEPTION 'Access denied: Only admin/moderator users can access this function';
  END IF;

  -- Return admin and moderator users
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.full_name,
    COALESCE(p.email, au.email) as email,
    ur.role
  FROM profiles p
  JOIN auth.users au ON au.id = p.id
  JOIN user_roles ur ON ur.user_id = p.id
  WHERE ur.role IN ('admin', 'moderator')
    AND ur.is_active = true
    AND au.email_confirmed_at IS NOT NULL
  ORDER BY ur.role DESC, p.full_name;
END;
$$;


--
-- Name: get_all_user_emails(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: get_automatic_country_discounts(text, numeric, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_automatic_country_discounts(p_customer_country text, p_order_total numeric DEFAULT 0, p_customer_id uuid DEFAULT NULL::uuid) RETURNS TABLE(rule_id uuid, discount_type_id uuid, country_code text, component_discounts jsonb, description text, priority integer, conditions_met boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cdr.id,
    cdr.discount_type_id,
    cdr.country_code,
    cdr.component_discounts,
    cdr.description,
    cdr.priority,
    CASE 
      WHEN cdr.min_order_amount IS NULL OR p_order_total >= cdr.min_order_amount THEN true
      ELSE false
    END as conditions_met
  FROM country_discount_rules cdr
  JOIN discount_types dt ON cdr.discount_type_id = dt.id
  WHERE cdr.country_code = p_customer_country
    AND cdr.auto_apply = true
    AND cdr.requires_code = false
    AND dt.is_active = true
  ORDER BY cdr.priority DESC, cdr.created_at DESC;
END;
$$;


--
-- Name: FUNCTION get_automatic_country_discounts(p_customer_country text, p_order_total numeric, p_customer_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_automatic_country_discounts(p_customer_country text, p_order_total numeric, p_customer_id uuid) IS 'Returns automatic discount rules applicable for a country and order total';


--
-- Name: get_available_credit_notes(uuid, numeric); Type: FUNCTION; Schema: public; Owner: -
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


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: bank_account_details; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: COLUMN bank_account_details.is_fallback; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bank_account_details.is_fallback IS 'Indicates if this account should be used as fallback when no country-specific account is found. Only one fallback per currency allowed.';


--
-- Name: COLUMN bank_account_details.destination_country; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bank_account_details.destination_country IS 'Destination country this bank account is intended for (optional, for country-specific bank accounts)';


--
-- Name: COLUMN bank_account_details.upi_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bank_account_details.upi_id IS 'UPI ID for digital payments (India)';


--
-- Name: COLUMN bank_account_details.upi_qr_string; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bank_account_details.upi_qr_string IS 'UPI QR code string for generating dynamic QR codes';


--
-- Name: COLUMN bank_account_details.payment_qr_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bank_account_details.payment_qr_url IS 'URL to static payment QR code image';


--
-- Name: COLUMN bank_account_details.instructions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bank_account_details.instructions IS 'Additional payment instructions for customers';


--
-- Name: COLUMN bank_account_details.currency_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bank_account_details.currency_code IS 'Currency code for the bank account (e.g., USD, INR, NPR). Used by email functions to filter bank accounts by currency.';


--
-- Name: get_bank_account_for_order(text, text); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: get_bank_details_for_email(text); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: FUNCTION get_bank_details_for_email(payment_currency text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_bank_details_for_email(payment_currency text) IS 'Returns formatted bank account details for the specified currency, used in email templates for bank transfer payments';


--
-- Name: get_category_intelligence_stats(character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_category_intelligence_stats(target_country character varying) RETURNS TABLE(category character varying, classification_count integer, avg_customs_rate numeric, avg_weight_kg numeric, avg_confidence numeric, most_used_classification character varying, total_usage integer)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pc.category,
        COUNT(*)::INTEGER as classification_count,
        ROUND(AVG(COALESCE(pc.customs_rate, cc.default_customs_rate)), 2) as avg_customs_rate,
        ROUND(AVG(pc.typical_weight_kg), 3) as avg_weight_kg,
        ROUND(AVG(pc.confidence_score), 2) as avg_confidence,
        (
            SELECT pc2.classification_code 
            FROM product_classifications pc2 
            WHERE pc2.category = pc.category 
            AND pc2.country_code = target_country
            AND pc2.is_active = true
            ORDER BY pc2.usage_frequency DESC 
            LIMIT 1
        ) as most_used_classification,
        SUM(pc.usage_frequency)::INTEGER as total_usage
    FROM product_classifications pc
    JOIN country_configs cc ON pc.country_code = cc.country_code
    WHERE pc.country_code = target_country
    AND pc.is_active = true
    GROUP BY pc.category
    ORDER BY total_usage DESC, avg_confidence DESC;
END;
$$;


--
-- Name: get_component_discounts(uuid, numeric, text, boolean, integer, text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_component_discounts(p_customer_id uuid, p_order_total numeric, p_country_code text, p_is_first_order boolean DEFAULT false, p_item_count integer DEFAULT 1, p_discount_codes text[] DEFAULT ARRAY[]::text[]) RETURNS TABLE(discount_type_id uuid, discount_name text, discount_code text, discount_value numeric, applicable_components text[], component_specific_values jsonb, source text)
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Return all applicable discounts with their component breakdowns
  -- Implementation would check all conditions and return matching discounts
  -- This is a placeholder for the actual logic
  RETURN QUERY
  SELECT 
    dt.id,
    dt.name,
    dt.code,
    dt.value,
    dt.applicable_components,
    cdr.component_discounts,
    'auto'::TEXT as source
  FROM discount_types dt
  LEFT JOIN country_discount_rules cdr ON cdr.discount_type_id = dt.id AND cdr.country_code = p_country_code
  WHERE dt.is_active = true
    AND (dt.conditions->>'min_order' IS NULL OR (dt.conditions->>'min_order')::decimal <= p_order_total)
    AND (
      -- Check various conditions
      (dt.conditions->>'first_time_only' IS NULL OR (dt.conditions->>'first_time_only')::boolean = p_is_first_order)
      AND (dt.conditions->>'min_items' IS NULL OR (dt.conditions->>'min_items')::integer <= p_item_count)
    );
END;
$$;


--
-- Name: markets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.markets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    description text,
    is_primary boolean DEFAULT false,
    is_active boolean DEFAULT true,
    display_order integer DEFAULT 0,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE markets; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.markets IS 'Market groupings for countries, similar to Shopify Markets feature';


--
-- Name: COLUMN markets.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.markets.name IS 'Display name of the market (e.g., North America, Europe)';


--
-- Name: COLUMN markets.code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.markets.code IS 'Unique code for the market (e.g., NA, EU, APAC)';


--
-- Name: COLUMN markets.is_primary; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.markets.is_primary IS 'Primary market for the store, only one allowed';


--
-- Name: COLUMN markets.settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.markets.settings IS 'Market-specific settings that can override country defaults';


--
-- Name: get_country_market(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_country_market(p_country_code text) RETURNS public.markets
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_market public.markets;
BEGIN
    SELECT m.* INTO v_market
    FROM public.markets m
    INNER JOIN public.market_countries mc ON m.id = mc.market_id
    WHERE mc.country_code = p_country_code
    AND m.is_active = true
    LIMIT 1;
    
    RETURN v_market;
END;
$$;


--
-- Name: get_currency_conversion_metrics(timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: FUNCTION get_currency_conversion_metrics(start_date timestamp with time zone, end_date timestamp with time zone); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_currency_conversion_metrics(start_date timestamp with time zone, end_date timestamp with time zone) IS 'Tracks accuracy of currency conversion estimates';


--
-- Name: get_currency_mismatches(timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: FUNCTION get_currency_mismatches(start_date timestamp with time zone, end_date timestamp with time zone); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_currency_mismatches(start_date timestamp with time zone, end_date timestamp with time zone) IS 'Detects payments made in different currency than quote';


--
-- Name: get_currency_statistics(timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: FUNCTION get_currency_statistics(start_date timestamp with time zone, end_date timestamp with time zone); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_currency_statistics(start_date timestamp with time zone, end_date timestamp with time zone) IS 'Provides currency usage statistics for monitoring dashboard';


--
-- Name: get_customer_discount_history(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_customer_discount_history(p_customer_id uuid, p_limit integer DEFAULT 10) RETURNS TABLE(discount_id uuid, discount_code text, campaign_name text, discount_amount numeric, original_amount numeric, currency text, components_discounted text[], used_at timestamp with time zone, quote_id uuid, order_id uuid)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cdu.id as discount_id,
    dc.code as discount_code,
    dcamp.name as campaign_name,
    cdu.discount_amount,
    cdu.original_amount,
    cdu.currency,
    cdu.components_discounted,
    cdu.used_at,
    cdu.quote_id,
    cdu.order_id
  FROM customer_discount_usage cdu
  LEFT JOIN discount_codes dc ON cdu.discount_code_id = dc.id
  LEFT JOIN discount_campaigns dcamp ON cdu.campaign_id = dcamp.id
  WHERE cdu.customer_id = p_customer_id
  ORDER BY cdu.used_at DESC
  LIMIT p_limit;
END;
$$;


--
-- Name: FUNCTION get_customer_discount_history(p_customer_id uuid, p_limit integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_customer_discount_history(p_customer_id uuid, p_limit integer) IS 'Returns discount usage history for a specific customer';


--
-- Name: get_customer_membership(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_customer_membership(p_customer_id uuid) RETURNS TABLE(membership_id uuid, tier_id uuid, tier_name text, tier_slug text, discount_percentage integer, benefits jsonb, status text, expires_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cm.id as membership_id,
    mp.id as tier_id,
    mp.name as tier_name,
    mp.slug as tier_slug,
    mp.discount_percentage,
    mp.benefits,
    cm.status,
    cm.expires_at
  FROM customer_memberships cm
  JOIN membership_plans mp ON mp.id = cm.membership_tier_id
  WHERE cm.customer_id = p_customer_id 
    AND cm.status = 'active'
    AND (cm.expires_at IS NULL OR cm.expires_at > CURRENT_TIMESTAMP)
    AND mp.is_active = true
  ORDER BY mp.discount_percentage DESC
  LIMIT 1;
END;
$$;


--
-- Name: get_discount_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_discount_stats() RETURNS TABLE(total_codes integer, active_codes integer, total_usage integer, total_savings numeric, top_codes jsonb, usage_by_country jsonb)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Get basic stats
  SELECT 
    COUNT(*)::INTEGER,
    COUNT(CASE WHEN is_active THEN 1 END)::INTEGER
  INTO total_codes, active_codes
  FROM discount_codes;
  
  -- Get usage stats from application log
  SELECT 
    COUNT(*)::INTEGER,
    COALESCE(SUM(discount_amount), 0)
  INTO total_usage, total_savings
  FROM discount_application_log
  WHERE application_type <> 'validation';
  
  -- Get top codes by joining with discount_codes table
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'code', dc.code,
        'usage', top.usage_count
      )
    ), '[]'::jsonb
  ) INTO top_codes
  FROM (
    SELECT 
      dal.discount_code_id,
      COUNT(*) as usage_count
    FROM discount_application_log dal
    WHERE dal.discount_code_id IS NOT NULL
    GROUP BY dal.discount_code_id
    ORDER BY COUNT(*) DESC
    LIMIT 5
  ) top
  LEFT JOIN discount_codes dc ON top.discount_code_id = dc.id;
  
  -- Get usage by country
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'country', customer_country,
        'usage', usage_count
      )
    ), '[]'::jsonb
  ) INTO usage_by_country
  FROM (
    SELECT 
      customer_country,
      COUNT(*) as usage_count
    FROM discount_application_log
    WHERE customer_country IS NOT NULL
    GROUP BY customer_country
    ORDER BY COUNT(*) DESC
    LIMIT 10
  ) countries;
  
  RETURN NEXT;
END;
$$;


--
-- Name: get_discount_type_tiers_with_analytics(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_discount_type_tiers_with_analytics(discount_type_id uuid) RETURNS TABLE(id uuid, min_order_value numeric, max_order_value numeric, discount_value numeric, applicable_components text[], description text, priority integer, usage_count integer, total_savings numeric, avg_order_value numeric, last_used_at timestamp with time zone, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dt.id,
    dt.min_order_value,
    dt.max_order_value,
    dt.discount_value,
    dt.applicable_components,
    dt.description,
    dt.priority,
    COALESCE(dt.usage_count, 0) as usage_count,
    COALESCE(dt.total_savings, 0) as total_savings,
    dt.avg_order_value,
    dt.last_used_at,
    dt.created_at
  FROM discount_tiers dt
  WHERE dt.discount_type_id = get_discount_type_tiers_with_analytics.discount_type_id
  ORDER BY dt.priority DESC, dt.min_order_value ASC;
END;
$$;


--
-- Name: get_discount_usage_analytics(timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_discount_usage_analytics(start_date timestamp with time zone DEFAULT (now() - '30 days'::interval), end_date timestamp with time zone DEFAULT now()) RETURNS TABLE(usage_date date, total_uses bigint, total_discount_amount numeric, unique_customers bigint, top_discount_code text, components_breakdown jsonb)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(cdu.used_at) as usage_date,
    COUNT(*)::bigint as total_uses,
    SUM(cdu.discount_amount)::numeric as total_discount_amount,
    COUNT(DISTINCT cdu.customer_id)::bigint as unique_customers,
    (
      SELECT dc.code
      FROM discount_codes dc
      JOIN customer_discount_usage cdu2 ON cdu2.discount_code_id = dc.id
      WHERE DATE(cdu2.used_at) = DATE(cdu.used_at)
      GROUP BY dc.code
      ORDER BY COUNT(*) DESC
      LIMIT 1
    ) as top_discount_code,
    jsonb_object_agg(
      component,
      SUM((cdu.component_breakdown->component)::numeric)
    ) FILTER (WHERE cdu.component_breakdown IS NOT NULL) as components_breakdown
  FROM customer_discount_usage cdu
  CROSS JOIN LATERAL jsonb_object_keys(cdu.component_breakdown) as component
  WHERE cdu.used_at >= start_date 
    AND cdu.used_at <= end_date
  GROUP BY DATE(cdu.used_at)
  ORDER BY DATE(cdu.used_at) DESC;
END;
$$;


--
-- Name: FUNCTION get_discount_usage_analytics(start_date timestamp with time zone, end_date timestamp with time zone); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_discount_usage_analytics(start_date timestamp with time zone, end_date timestamp with time zone) IS 'Returns daily discount usage analytics for a given date range';


--
-- Name: get_domestic_delivery_config(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_domestic_delivery_config(country_code text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  config JSONB;
BEGIN
  SELECT jsonb_build_object(
    'provider', COALESCE(domestic_delivery_provider, 'generic'),
    'currency', cs.currency, -- Use country's main currency (INR, NPR, USD, etc.)
    'urban_rate', COALESCE(domestic_urban_rate, 10.00),
    'rural_rate', COALESCE(domestic_rural_rate, 20.00),
    'api_enabled', COALESCE(domestic_api_enabled, false),
    'fallback_enabled', COALESCE(domestic_fallback_enabled, true),
    'country_code', cs.code,
    'country_name', cs.name
  )
  INTO config
  FROM country_settings cs
  WHERE cs.code = get_domestic_delivery_config.country_code;
  
  -- Return default config if country not found
  IF config IS NULL THEN
    config := jsonb_build_object(
      'provider', 'generic',
      'currency', 'USD',
      'urban_rate', 10.00,
      'rural_rate', 20.00,
      'api_enabled', false,
      'fallback_enabled', true,
      'country_code', get_domestic_delivery_config.country_code,
      'country_name', 'Unknown'
    );
  END IF;
  
  RETURN config;
END;
$$;


--
-- Name: get_effective_tax_method(uuid); Type: FUNCTION; Schema: public; Owner: -
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
        RETURN QUERY SELECT 'manual'::text, 'auto'::text, 'not_found'::text, 0.0::numeric;
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
    
    -- Use manual calculation as the default (simplified approach)
    -- This allows users to set customs rates manually or use route-based calculations
    RETURN QUERY SELECT 'manual'::text, 'auto'::text, 'system_default'::text, 0.8::numeric;
END;
$$;


--
-- Name: get_exchange_rate_health(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: FUNCTION get_exchange_rate_health(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_exchange_rate_health() IS 'Monitors exchange rate freshness and accuracy';


--
-- Name: get_insurance_estimate(uuid, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_insurance_estimate(p_quote_id uuid, p_coverage_amount numeric DEFAULT NULL::numeric) RETURNS TABLE(available boolean, fee_estimate numeric, coverage_amount numeric, percentage_rate numeric, min_fee numeric, max_fee numeric, currency text, benefits jsonb)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_quote RECORD;
  v_insurance_config JSONB;
  v_coverage NUMERIC;
  v_fee NUMERIC;
BEGIN
  -- Get quote details
  SELECT * INTO v_quote
  FROM quotes_v2
  WHERE id = p_quote_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, NULL::NUMERIC, 'USD', NULL::JSONB;
    RETURN;
  END IF;
  
  -- Get insurance configuration from route calculations
  v_insurance_config := COALESCE(v_quote.calculation_data->'route_calculations'->'insurance', '{}');
  
  -- Use provided coverage or quote total
  v_coverage := COALESCE(p_coverage_amount, v_quote.total_usd, 0);
  
  -- Calculate fee estimate
  v_fee := GREATEST(
    v_coverage * COALESCE((v_insurance_config->>'percentage')::NUMERIC, 1.5) / 100,
    COALESCE((v_insurance_config->>'min_fee')::NUMERIC, 2)
  );
  
  -- Apply max fee cap if specified
  IF v_insurance_config->>'max_fee' IS NOT NULL THEN
    v_fee := LEAST(v_fee, (v_insurance_config->>'max_fee')::NUMERIC);
  END IF;
  
  -- Return insurance estimate details
  RETURN QUERY SELECT 
    COALESCE((v_insurance_config->>'available')::BOOLEAN, TRUE),
    v_fee,
    v_coverage,
    COALESCE((v_insurance_config->>'percentage')::NUMERIC, 1.5),
    COALESCE((v_insurance_config->>'min_fee')::NUMERIC, 2),
    (v_insurance_config->>'max_fee')::NUMERIC,
    COALESCE(v_quote.customer_currency, 'USD'),
    jsonb_build_object(
      'lost_or_stolen', TRUE,
      'damage_in_transit', TRUE,
      'customs_confiscation', TRUE,
      'carrier_errors', TRUE,
      'full_refund_or_replacement', TRUE
    );
END;
$$;


--
-- Name: FUNCTION get_insurance_estimate(p_quote_id uuid, p_coverage_amount numeric); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_insurance_estimate(p_quote_id uuid, p_coverage_amount numeric) IS 'Provides insurance fee estimates and coverage details';


--
-- Name: get_market_countries(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_market_countries(p_market_id uuid) RETURNS TABLE(country_code text, country_name text, currency text, is_primary_in_market boolean, display_order integer)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cs.code,
        cs.name,
        cs.currency,
        mc.is_primary_in_market,
        mc.display_order
    FROM public.country_settings cs
    INNER JOIN public.market_countries mc ON cs.code = mc.country_code
    WHERE mc.market_id = p_market_id
    ORDER BY mc.display_order, cs.name;
END;
$$;


--
-- Name: get_membership_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_membership_stats() RETURNS TABLE(total_members bigint, active_members bigint, expired_members bigint, revenue_this_month numeric, churn_rate numeric, average_lifetime_value numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  WITH member_stats AS (
    SELECT 
      COUNT(*)::BIGINT as total_members,
      COUNT(CASE WHEN status = 'active' AND expires_at > NOW() THEN 1 END)::BIGINT as active_members,
      COUNT(CASE WHEN status = 'expired' OR expires_at < NOW() THEN 1 END)::BIGINT as expired_members
    FROM customer_memberships
  ),
  revenue_stats AS (
    SELECT 
      COALESCE(SUM(
        CASE 
          WHEN cm.created_at >= date_trunc('month', CURRENT_DATE) 
          THEN COALESCE((mp.pricing->>'USD')::NUMERIC, 0)
          ELSE 0 
        END
      ), 0) as revenue_this_month
    FROM customer_memberships cm
    JOIN membership_plans mp ON cm.plan_id = mp.id
  ),
  churn_stats AS (
    SELECT 
      CASE 
        WHEN COUNT(CASE WHEN status = 'active' THEN 1 END) > 0
        THEN (COUNT(CASE WHEN status = 'cancelled' AND updated_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END)::NUMERIC / 
              COUNT(CASE WHEN status = 'active' THEN 1 END)::NUMERIC * 100)
        ELSE 0
      END as churn_rate
    FROM customer_memberships
  ),
  lifetime_stats AS (
    SELECT 
      CASE 
        WHEN COUNT(*) > 0
        THEN AVG(COALESCE((mp.pricing->>'USD')::NUMERIC, 0))
        ELSE 0
      END as average_lifetime_value
    FROM customer_memberships cm
    JOIN membership_plans mp ON cm.plan_id = mp.id
  )
  SELECT 
    ms.total_members,
    ms.active_members,
    ms.expired_members,
    rs.revenue_this_month,
    cs.churn_rate,
    ls.average_lifetime_value
  FROM member_stats ms, revenue_stats rs, churn_stats cs, lifetime_stats ls;
END;
$$;


--
-- Name: get_minimum_valuation(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_minimum_valuation(p_classification_code text, p_country_code text) RETURNS TABLE(minimum_valuation_usd numeric, valuation_method character varying)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pc.minimum_valuation_usd,
    pc.valuation_method
  FROM product_classifications pc
  WHERE pc.classification_code = p_classification_code
    AND pc.country_code = p_country_code
    AND pc.is_active = true
  LIMIT 1;
END;
$$;


--
-- Name: get_optimal_storage_location(text); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: customer_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    profile_id uuid,
    default_consolidation_preference text DEFAULT 'ask'::text,
    notification_preferences jsonb DEFAULT jsonb_build_object('package_received', true, 'consolidation_ready', true, 'quote_available', true, 'storage_fees_due', true),
    shipping_preferences jsonb DEFAULT jsonb_build_object('speed_priority', 'medium', 'cost_priority', 'high', 'insurance_required', false),
    other_preferences jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT customer_preferences_default_consolidation_preference_check CHECK ((default_consolidation_preference = ANY (ARRAY['individual'::text, 'consolidate_always'::text, 'ask'::text])))
);


--
-- Name: TABLE customer_preferences; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.customer_preferences IS 'Customer preferences for package forwarding and other services';


--
-- Name: get_or_create_customer_preferences(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_or_create_customer_preferences(p_user_id uuid) RETURNS public.customer_preferences
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_preferences customer_preferences;
  v_profile_id uuid;
BEGIN
  -- Try to get existing preferences
  SELECT * INTO v_preferences
  FROM customer_preferences
  WHERE user_id = p_user_id;
  
  -- If not found, create with defaults
  IF NOT FOUND THEN
    -- Get profile_id if exists
    SELECT id INTO v_profile_id
    FROM profiles
    WHERE id = p_user_id;
    
    INSERT INTO customer_preferences (user_id, profile_id)
    VALUES (p_user_id, v_profile_id)
    RETURNING * INTO v_preferences;
  END IF;
  
  RETURN v_preferences;
END;
$$;


--
-- Name: FUNCTION get_or_create_customer_preferences(p_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_or_create_customer_preferences(p_user_id uuid) IS 'Get existing preferences or create with defaults';


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
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
    tags text,
    phone text,
    phone_verified boolean DEFAULT false,
    CONSTRAINT profiles_email_check CHECK (((email IS NULL) OR (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text))),
    CONSTRAINT valid_country CHECK (((country IS NULL) OR (country ~ '^[A-Z]{2}$'::text)))
);


--
-- Name: TABLE profiles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.profiles IS 'User profiles table - phone numbers are stored in auth.users.phone, not here';


--
-- Name: COLUMN profiles.preferred_display_currency; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.preferred_display_currency IS 'User preferred display currency - now accepts any currency code from country_settings table instead of hardcoded list';


--
-- Name: COLUMN profiles.tags; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.tags IS 'Customer tags - covered by existing RLS policies on profiles table';


--
-- Name: get_or_create_profile_by_phone(text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_or_create_profile_by_phone(phone_number text, user_id uuid DEFAULT NULL::uuid) RETURNS public.profiles
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  profile_record profiles;
BEGIN
  -- Try to find existing profile with this phone
  SELECT * INTO profile_record
  FROM profiles
  WHERE phone = phone_number
  LIMIT 1;
  
  -- If found, return it
  IF FOUND THEN
    RETURN profile_record;
  END IF;
  
  -- If not found and user_id provided, create new profile
  IF user_id IS NOT NULL THEN
    INSERT INTO profiles (id, phone, phone_verified)
    VALUES (user_id, phone_number, true)
    RETURNING * INTO profile_record;
    
    RETURN profile_record;
  END IF;
  
  -- No profile found and no user_id provided
  RETURN NULL;
END;
$$;


--
-- Name: get_orders_with_payment_proofs(text, integer); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: get_payment_history(uuid, uuid, date, date); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: get_payment_proof_stats(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: get_payment_stats_summary(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_payment_stats_summary() RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
    SELECT jsonb_build_object(
        'total_today', COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE),
        'total_week', COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'),
        'success_rate_today', 
            CASE 
                WHEN COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) > 0
                THEN ROUND(
                    COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE AND status = 'completed')::numeric * 100 / 
                    COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE), 
                    2
                )
                ELSE 0 
            END,
        'total_volume_today', 
            COALESCE(SUM(amount) FILTER (WHERE DATE(created_at) = CURRENT_DATE AND status = 'completed'), 0)
    )
    FROM payment_transactions;
$$;


--
-- Name: FUNCTION get_payment_stats_summary(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_payment_stats_summary() IS 'Get summary payment statistics for dashboard';


--
-- Name: get_popular_posts(integer); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: get_pricing_audit_stats(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_pricing_audit_stats(p_days_back integer DEFAULT 30) RETURNS TABLE(total_changes integer, changes_by_method jsonb, changes_by_type jsonb, most_active_users jsonb, most_changed_services jsonb)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::integer 
         FROM pricing_change_log 
         WHERE created_at >= now() - (p_days_back || ' days')::interval
        ) as total_changes,
        
        (SELECT jsonb_object_agg(change_method, count)
         FROM (
             SELECT change_method, COUNT(*) as count
             FROM pricing_change_log
             WHERE created_at >= now() - (p_days_back || ' days')::interval
             GROUP BY change_method
         ) method_stats
        ) as changes_by_method,
        
        (SELECT jsonb_object_agg(change_type, count)
         FROM (
             SELECT change_type, COUNT(*) as count
             FROM pricing_change_log
             WHERE created_at >= now() - (p_days_back || ' days')::interval
             GROUP BY change_type
         ) type_stats
        ) as changes_by_type,
        
        (SELECT jsonb_object_agg(user_email, change_count)
         FROM (
             SELECT COALESCE(au.email, 'System') as user_email, COUNT(*) as change_count
             FROM pricing_change_log pcl2
             LEFT JOIN auth.users au ON pcl2.changed_by = au.id
             WHERE pcl2.created_at >= now() - (p_days_back || ' days')::interval
             GROUP BY au.email
             ORDER BY change_count DESC
             LIMIT 5
         ) user_stats
        ) as most_active_users,
         
        (SELECT jsonb_object_agg(service_name, change_count)
         FROM (
             SELECT COALESCE(ads.service_name, 'Unknown Service') as service_name, COUNT(*) as change_count
             FROM pricing_change_log pcl3
             LEFT JOIN addon_services ads ON pcl3.service_id = ads.id
             WHERE pcl3.created_at >= now() - (p_days_back || ' days')::interval
             GROUP BY ads.service_name
             ORDER BY change_count DESC
             LIMIT 5
         ) service_stats
        ) as most_changed_services;
END;
$$;


--
-- Name: FUNCTION get_pricing_audit_stats(p_days_back integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_pricing_audit_stats(p_days_back integer) IS 'Generate audit statistics and analytics for reporting';


--
-- Name: get_pricing_change_history(uuid, text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_pricing_change_history(p_service_id uuid DEFAULT NULL::uuid, p_identifier text DEFAULT NULL::text, p_days_back integer DEFAULT 30, p_limit integer DEFAULT 100) RETURNS TABLE(id uuid, service_name text, change_type text, identifier text, identifier_name text, old_rate numeric, new_rate numeric, change_reason text, change_method text, user_email text, affected_countries integer, created_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pcl.id,
        COALESCE(ads.service_name, 'Unknown Service')::text,
        pcl.change_type,
        pcl.identifier,
        COALESCE(pcl.identifier_name, '')::text,
        pcl.old_rate,
        pcl.new_rate,
        pcl.change_reason,
        pcl.change_method,
        COALESCE(au.email, 'System')::text as user_email,
        pcl.affected_countries,
        pcl.created_at
    FROM pricing_change_log pcl
    LEFT JOIN addon_services ads ON pcl.service_id = ads.id
    LEFT JOIN auth.users au ON pcl.changed_by = au.id
    WHERE 
        (p_service_id IS NULL OR pcl.service_id = p_service_id)
        AND (p_identifier IS NULL OR pcl.identifier = p_identifier)
        AND pcl.created_at >= now() - (p_days_back || ' days')::interval
    ORDER BY pcl.created_at DESC
    LIMIT p_limit;
END;
$$;


--
-- Name: get_product_suggestions(text, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_product_suggestions(p_category text, p_country_code text, p_limit integer DEFAULT 10) RETURNS TABLE(id uuid, product_name text, classification_code text, customs_rate numeric, typical_weight_kg numeric, confidence_score numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pc.id,
        pc.product_name::TEXT,
        (pc.country_data->p_country_code->>'classification_code')::TEXT,
        (pc.country_data->p_country_code->>'customs_rate')::DECIMAL,
        pc.typical_weight_kg,
        pc.confidence_score
    FROM product_classifications pc
    WHERE pc.product_category = p_category
      AND pc.country_data ? p_country_code
      AND pc.is_verified = true
    ORDER BY pc.suggestion_priority ASC, pc.usage_count DESC
    LIMIT p_limit;
END;
$$;


--
-- Name: get_product_suggestions_v2(text, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_product_suggestions_v2(p_category text, p_country_code text, p_limit integer DEFAULT 10) RETURNS TABLE(id uuid, product_name text, classification_code text, customs_rate numeric, typical_weight_kg numeric, confidence_score numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pc.id,
        pc.product_name::TEXT,
        COALESCE(
            (pc.country_data->p_country_code->>'classification_code')::TEXT,
            pc.classification_code::TEXT
        ) as classification_code,
        COALESCE(
            (pc.country_data->p_country_code->>'customs_rate')::DECIMAL,
            pc.customs_rate
        ) as customs_rate,
        pc.typical_weight_kg,
        pc.confidence_score
    FROM product_classifications pc
    WHERE (pc.product_category = p_category OR pc.category = p_category)
      AND (pc.country_data ? p_country_code OR pc.country_code = p_country_code)
      AND COALESCE(pc.is_verified, pc.last_verified_at IS NOT NULL, false) = true
      AND COALESCE(pc.is_active, true) = true
    ORDER BY 
        COALESCE(pc.suggestion_priority, 100) ASC, 
        COALESCE(pc.usage_count, pc.usage_frequency, 0) DESC
    LIMIT p_limit;
END;
$$;


--
-- Name: get_quote_message_thread(uuid); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: FUNCTION get_quote_message_thread(p_quote_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_quote_message_thread(p_quote_id uuid) IS 'Retrieves all messages for a specific quote with proper access control based on user roles';


--
-- Name: get_quote_options_state(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_quote_options_state(quote_id_param uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  quote_record quotes_v2%ROWTYPE;
  shipping_options JSONB;
  options_state JSONB;
BEGIN
  -- Get quote details
  SELECT * INTO quote_record
  FROM quotes_v2
  WHERE id = quote_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quote not found: %', quote_id_param;
  END IF;
  
  -- Get available shipping options for this route
  SELECT delivery_options INTO shipping_options
  FROM shipping_routes
  WHERE origin_country = quote_record.origin_country
    AND destination_country = quote_record.destination_country
    AND is_active = true;
  
  IF shipping_options IS NULL THEN
    shipping_options := '[]'::jsonb;
  END IF;
  
  -- Build complete options state
  options_state := jsonb_build_object(
    'shipping', jsonb_build_object(
      'selected_option_id', quote_record.selected_shipping_option_id,
      'selected_method', quote_record.shipping_method,
      'available_options', shipping_options,
      'cost', COALESCE((quote_record.calculation_data->'breakdown'->>'shipping')::decimal, 0),
      'cost_currency', COALESCE(quote_record.customer_currency, 'USD')
    ),
    'insurance', jsonb_build_object(
      'enabled', COALESCE(quote_record.insurance_required, false),
      'available', true,
      'cost', COALESCE((quote_record.calculation_data->'breakdown'->>'insurance')::decimal, 0),
      'cost_currency', COALESCE(quote_record.customer_currency, 'USD'),
      'coverage_amount', COALESCE(quote_record.insurance_coverage_amount, quote_record.total_usd, 0),
      'rate_percentage', COALESCE(quote_record.insurance_rate_percentage, 1.5)
    ),
    'discounts', jsonb_build_object(
      'applied_codes', COALESCE(quote_record.applied_discount_codes, '[]'::jsonb),
      'discount_amounts', COALESCE(quote_record.discount_amounts, '{}'::jsonb),
      'total_discount', COALESCE((quote_record.calculation_data->'breakdown'->>'discount')::decimal, 0),
      'discount_currency', COALESCE(quote_record.customer_currency, 'USD')
    ),
    'totals', jsonb_build_object(
      'base_total', COALESCE(quote_record.total_usd, 0),
      'adjusted_total', COALESCE(quote_record.total_customer_currency, quote_record.total_usd, 0),
      'currency', COALESCE(quote_record.customer_currency, 'USD'),
      'savings', COALESCE((quote_record.calculation_data->>'total_savings')::decimal, 0)
    ),
    'metadata', jsonb_build_object(
      'last_updated_by', quote_record.options_last_updated_by,
      'last_updated_at', quote_record.options_last_updated_at,
      'quote_id', quote_record.id,
      'quote_status', quote_record.status
    )
  );
  
  RETURN options_state;
END;
$$;


--
-- Name: get_quotes_needing_reminders(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_quotes_needing_reminders() RETURNS TABLE(id uuid, customer_email text, customer_name text, quote_number text, reminder_count integer, last_reminder_at timestamp with time zone, created_at timestamp with time zone, share_token text)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    q.id,
    q.customer_email,
    q.customer_name,
    q.quote_number,
    q.reminder_count,
    q.last_reminder_at,
    q.created_at,
    q.share_token
  FROM quotes_v2 q
  WHERE q.status = 'sent'
    AND q.reminder_count < 3
    AND q.created_at < NOW() - INTERVAL '2 days'
    AND (
      q.last_reminder_at IS NULL 
      OR q.last_reminder_at < NOW() - INTERVAL '3 days'
    )
    AND q.converted_to_order_id IS NULL
    AND q.expires_at > NOW() -- Don't send reminders for expired quotes
  ORDER BY q.created_at ASC
  LIMIT 50; -- Process in batches
END;
$$;


--
-- Name: get_related_posts(text, integer); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: get_shipping_cost(character varying, character varying, numeric, numeric); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: get_sla_dashboard_metrics(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_sla_dashboard_metrics() RETURNS TABLE(total_tickets integer, tickets_on_track integer, tickets_approaching_deadline integer, tickets_overdue integer, avg_first_response_minutes numeric, avg_resolution_minutes numeric, response_sla_compliance_rate numeric, resolution_sla_compliance_rate numeric, customer_satisfaction_avg numeric, customer_satisfaction_count integer)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Total tickets in last 30 days
    (SELECT COUNT(*)::INTEGER FROM support_system WHERE system_type = 'ticket' AND created_at >= NOW() - INTERVAL '30 days'),
    
    -- Tickets on track (assuming 75% are on track for demo)
    (SELECT (COUNT(*) * 0.75)::INTEGER FROM support_system WHERE system_type = 'ticket' AND created_at >= NOW() - INTERVAL '30 days'),
    
    -- Tickets approaching deadline (15%)
    (SELECT (COUNT(*) * 0.15)::INTEGER FROM support_system WHERE system_type = 'ticket' AND created_at >= NOW() - INTERVAL '30 days'),
    
    -- Overdue tickets (10%)
    (SELECT (COUNT(*) * 0.10)::INTEGER FROM support_system WHERE system_type = 'ticket' AND created_at >= NOW() - INTERVAL '30 days'),
    
    -- Average first response time in minutes (from our tracking fields)
    (SELECT AVG(first_response_time_minutes)::NUMERIC FROM support_system WHERE system_type = 'ticket' AND first_response_time_minutes IS NOT NULL),
    
    -- Average resolution time in minutes
    (SELECT AVG(resolution_time_minutes)::NUMERIC FROM support_system WHERE system_type = 'ticket' AND resolution_time_minutes IS NOT NULL),
    
    -- Response SLA compliance rate (assuming 85% for demo)
    85.0::NUMERIC,
    
    -- Resolution SLA compliance rate (assuming 78% for demo)
    78.0::NUMERIC,
    
    -- Customer satisfaction average
    (SELECT AVG(rating)::NUMERIC FROM customer_satisfaction_surveys WHERE created_at >= NOW() - INTERVAL '30 days'),
    
    -- Customer satisfaction count
    (SELECT COUNT(*)::INTEGER FROM customer_satisfaction_surveys WHERE created_at >= NOW() - INTERVAL '30 days');
END;
$$;


--
-- Name: get_sla_summary(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_sla_summary() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  result JSON;
  total_tickets INTEGER;
  avg_response_hours NUMERIC;
  avg_resolution_hours NUMERIC;
BEGIN
  -- Get total tickets
  SELECT COUNT(*) INTO total_tickets
  FROM support_system
  WHERE ticket_data->>'status' NOT IN ('spam', 'deleted');
  
  -- Calculate average response time (time to first reply)
  SELECT COALESCE(AVG(
    EXTRACT(EPOCH FROM (
      (SELECT MIN(si.created_at) 
       FROM support_interactions si 
       WHERE si.support_system_id = s.id 
       AND si.interaction_type = 'reply'
       AND si.is_from_admin = true
      ) - s.created_at
    )) / 3600.0
  ), 0) INTO avg_response_hours
  FROM support_system s
  WHERE ticket_data->>'status' NOT IN ('spam', 'deleted');
  
  -- Calculate average resolution time for resolved tickets
  SELECT COALESCE(AVG(
    EXTRACT(EPOCH FROM (s.updated_at - s.created_at)) / 3600.0
  ), 0) INTO avg_resolution_hours
  FROM support_system s
  WHERE ticket_data->>'status' IN ('resolved', 'closed');
  
  -- Build result JSON
  result := json_build_object(
    'total_tickets', total_tickets,
    'response_sla_met', COALESCE((
      SELECT COUNT(*)
      FROM support_system s
      WHERE EXISTS (
        SELECT 1 FROM support_interactions si 
        WHERE si.support_system_id = s.id 
        AND si.is_from_admin = true
        AND si.created_at <= s.created_at + INTERVAL '24 hours'
      )
      AND ticket_data->>'status' NOT IN ('spam', 'deleted')
    ), 0),
    'response_sla_breached', COALESCE((
      SELECT COUNT(*)
      FROM support_system s
      WHERE NOT EXISTS (
        SELECT 1 FROM support_interactions si 
        WHERE si.support_system_id = s.id 
        AND si.is_from_admin = true
        AND si.created_at <= s.created_at + INTERVAL '24 hours'
      )
      AND ticket_data->>'status' NOT IN ('spam', 'deleted', 'resolved', 'closed')
      AND s.created_at < NOW() - INTERVAL '24 hours'
    ), 0),
    'resolution_sla_met', COALESCE((
      SELECT COUNT(*)
      FROM support_system s
      WHERE ticket_data->>'status' IN ('resolved', 'closed')
      AND s.updated_at <= s.created_at + INTERVAL '72 hours'
    ), 0),
    'resolution_sla_breached', COALESCE((
      SELECT COUNT(*)
      FROM support_system s
      WHERE ticket_data->>'status' NOT IN ('resolved', 'closed', 'spam', 'deleted')
      AND s.created_at < NOW() - INTERVAL '72 hours'
    ), 0),
    'avg_response_time_hours', ROUND(avg_response_hours, 2),
    'avg_resolution_time_hours', ROUND(avg_resolution_hours, 2)
  );
  
  RETURN result;
END;
$$;


--
-- Name: get_smart_product_suggestions(text, character varying, character varying, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_smart_product_suggestions(product_query text, target_country character varying, category_filter character varying DEFAULT NULL::character varying, result_limit integer DEFAULT 10) RETURNS TABLE(classification_code character varying, product_name character varying, category character varying, customs_rate numeric, typical_weight_kg numeric, confidence_score numeric, match_reason text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    base_confidence DECIMAL(3,2) := 0.5;
BEGIN
    RETURN QUERY
    WITH ranked_suggestions AS (
        SELECT 
            pc.classification_code,
            pc.product_name,
            pc.category,
            COALESCE(pc.customs_rate, cc.default_customs_rate) as customs_rate,
            pc.typical_weight_kg,
            pc.confidence_score,
            CASE 
                WHEN pc.classification_code = UPPER(product_query) THEN 'Exact classification code match'
                WHEN product_query = ANY(pc.search_keywords) THEN 'Keyword match'
                WHEN pc.product_name ILIKE '%' || product_query || '%' THEN 'Product name match'
                WHEN pc.category ILIKE '%' || product_query || '%' THEN 'Category match'
                ELSE 'Full-text search match'
            END as match_reason,
            CASE 
                WHEN pc.classification_code = UPPER(product_query) THEN 1.0
                WHEN product_query = ANY(pc.search_keywords) THEN 0.9
                WHEN pc.product_name ILIKE '%' || product_query || '%' THEN 0.8
                WHEN pc.category ILIKE '%' || product_query || '%' THEN 0.7
                ELSE 0.6
            END as match_score
        FROM product_classifications pc
        JOIN country_configs cc ON pc.country_code = cc.country_code
        WHERE pc.country_code = target_country
        AND pc.is_active = true
        AND (category_filter IS NULL OR pc.category = category_filter)
        AND (
            pc.classification_code = UPPER(product_query) OR
            product_query = ANY(pc.search_keywords) OR
            pc.product_name ILIKE '%' || product_query || '%' OR
            pc.category ILIKE '%' || product_query || '%' OR
            pc.description ILIKE '%' || product_query || '%' OR
            to_tsvector('english', 
                COALESCE(pc.product_name, '') || ' ' || 
                COALESCE(pc.category, '') || ' ' || 
                COALESCE(pc.description, '')
            ) @@ plainto_tsquery('english', product_query)
        )
    )
    SELECT 
        rs.classification_code,
        rs.product_name,
        rs.category,
        rs.customs_rate,
        rs.typical_weight_kg,
        LEAST(rs.confidence_score * rs.match_score, 1.0) as final_confidence,
        rs.match_reason
    FROM ranked_suggestions rs
    ORDER BY 
        rs.match_score DESC,
        rs.confidence_score DESC,
        rs.typical_weight_kg DESC NULLS LAST
    LIMIT result_limit;
END;
$$;


--
-- Name: get_smart_system_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_smart_system_stats() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    result JSON;
    country_stats JSON;
BEGIN
    -- Get country statistics
    SELECT json_build_object(
        'total_countries', (SELECT COUNT(*) FROM country_configs),
        'countries_with_data', (SELECT COUNT(DISTINCT country_code) FROM product_classifications WHERE is_active = true),
        'total_classifications', (SELECT COUNT(*) FROM product_classifications WHERE is_active = true),
        'by_country', (
            SELECT json_object_agg(country_code, classification_count)
            FROM (
                SELECT 
                    country_code,
                    COUNT(*) as classification_count
                FROM product_classifications 
                WHERE is_active = true
                GROUP BY country_code
            ) country_data
        )
    ) INTO result;
    
    RETURN result;
END;
$$;


--
-- Name: get_sms_statistics(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_sms_statistics() RETURNS TABLE(total_sent bigint, total_received bigint, total_failed bigint, sent_today bigint, received_today bigint, credits_used_today bigint, provider_stats jsonb)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(*) FILTER (WHERE direction = 'sent' AND status IN ('sent', 'delivered')) as total_sent,
      COUNT(*) FILTER (WHERE direction = 'received') as total_received,
      COUNT(*) FILTER (WHERE status = 'failed') as total_failed,
      COUNT(*) FILTER (WHERE direction = 'sent' AND status IN ('sent', 'delivered') AND created_at >= CURRENT_DATE) as sent_today,
      COUNT(*) FILTER (WHERE direction = 'received' AND created_at >= CURRENT_DATE) as received_today,
      COALESCE(SUM(credits_used) FILTER (WHERE created_at >= CURRENT_DATE), 0) as credits_used_today
    FROM sms_messages
  ),
  provider_counts AS (
    SELECT jsonb_object_agg(provider, cnt) as provider_stats
    FROM (
      SELECT provider, COUNT(*) as cnt
      FROM sms_messages
      WHERE provider IS NOT NULL
      GROUP BY provider
    ) t
  )
  SELECT 
    stats.total_sent,
    stats.total_received,
    stats.total_failed,
    stats.sent_today,
    stats.received_today,
    stats.credits_used_today,
    COALESCE(provider_counts.provider_stats, '{}'::jsonb) as provider_stats
  FROM stats, provider_counts;
END;
$$;


--
-- Name: get_suspicious_payment_amounts(timestamp with time zone, timestamp with time zone, numeric); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: FUNCTION get_suspicious_payment_amounts(start_date timestamp with time zone, end_date timestamp with time zone, tolerance numeric); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_suspicious_payment_amounts(start_date timestamp with time zone, end_date timestamp with time zone, tolerance numeric) IS 'Identifies potentially incorrectly recorded payment amounts';


--
-- Name: get_tax_method_recommendations(text, text, integer); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: FUNCTION get_tax_method_recommendations(p_origin_country text, p_destination_country text, p_analysis_days integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_tax_method_recommendations(p_origin_country text, p_destination_country text, p_analysis_days integer) IS 'Provides intelligent recommendations for tax calculation method selection';


--
-- Name: get_tier_analytics(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_tier_analytics(tier_id uuid) RETURNS TABLE(usage_count integer, total_savings numeric, avg_order_value numeric, avg_discount_per_use numeric, last_used_at timestamp with time zone, effectiveness_score numeric)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dt.usage_count,
    dt.total_savings,
    dt.avg_order_value,
    CASE 
      WHEN dt.usage_count > 0 THEN dt.total_savings / dt.usage_count
      ELSE 0
    END as avg_discount_per_use,
    dt.last_used_at,
    CASE 
      WHEN dt.usage_count > 0 AND dt.avg_order_value > 0 THEN 
        LEAST(100, (dt.total_savings / (dt.avg_order_value * dt.usage_count)) * 100)
      ELSE 0
    END as effectiveness_score
  FROM discount_tiers dt
  WHERE dt.id = tier_id;
END;
$$;


--
-- Name: get_transaction_refund_eligibility(uuid); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: get_unread_message_count(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: FUNCTION get_unread_message_count(p_quote_id uuid, p_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_unread_message_count(p_quote_id uuid, p_user_id uuid) IS 'Returns count of unread messages for a user, optionally filtered by quote';


--
-- Name: get_user_bank_accounts(uuid); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: delivery_addresses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_addresses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    address_line1 text NOT NULL,
    address_line2 text,
    city text NOT NULL,
    state_province_region text NOT NULL,
    postal_code text,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    phone text,
    recipient_name text,
    destination_country text DEFAULT 'US'::text NOT NULL,
    save_to_profile text,
    address_label text,
    address_type text DEFAULT 'shipping'::text,
    company_name text,
    validated_at timestamp with time zone,
    validation_status text DEFAULT 'unvalidated'::text,
    tax_id text,
    delivery_instructions text,
    CONSTRAINT destination_country_iso_code CHECK ((length(destination_country) = 2)),
    CONSTRAINT user_addresses_type_check CHECK ((address_type = ANY (ARRAY['shipping'::text, 'billing'::text, 'both'::text]))),
    CONSTRAINT user_addresses_validation_check CHECK ((validation_status = ANY (ARRAY['unvalidated'::text, 'valid'::text, 'warning'::text, 'invalid'::text])))
);


--
-- Name: TABLE delivery_addresses; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.delivery_addresses IS 'Customer delivery addresses for final shipment. Customers can have multiple addresses and set a default.';


--
-- Name: COLUMN delivery_addresses.postal_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.delivery_addresses.postal_code IS 'Postal code - optional for some countries like Nepal, required for others like US/India';


--
-- Name: COLUMN delivery_addresses.phone; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.delivery_addresses.phone IS 'Phone number for this specific address';


--
-- Name: COLUMN delivery_addresses.recipient_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.delivery_addresses.recipient_name IS 'Full name of the person who should receive the package at this address';


--
-- Name: COLUMN delivery_addresses.destination_country; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.delivery_addresses.destination_country IS 'ISO 3166-1 alpha-2 country code';


--
-- Name: COLUMN delivery_addresses.address_label; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.delivery_addresses.address_label IS 'User-friendly label for the address (e.g., Home, Office)';


--
-- Name: COLUMN delivery_addresses.address_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.delivery_addresses.address_type IS 'Type of address: shipping, billing, or both';


--
-- Name: COLUMN delivery_addresses.company_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.delivery_addresses.company_name IS 'Company or organization name for business deliveries';


--
-- Name: COLUMN delivery_addresses.validated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.delivery_addresses.validated_at IS 'Timestamp when address was last validated';


--
-- Name: COLUMN delivery_addresses.validation_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.delivery_addresses.validation_status IS 'Status of address validation';


--
-- Name: COLUMN delivery_addresses.tax_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.delivery_addresses.tax_id IS 'Tax ID, VAT number, or other customs identifier';


--
-- Name: COLUMN delivery_addresses.delivery_instructions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.delivery_addresses.delivery_instructions IS 'Special delivery instructions (max 500 chars)';


--
-- Name: get_user_default_address(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_default_address(p_user_id uuid) RETURNS public.delivery_addresses
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
  result delivery_addresses;
BEGIN
  SELECT * INTO result
  FROM delivery_addresses
  WHERE user_id = p_user_id 
  AND is_default = TRUE
  LIMIT 1;

  RETURN result;
END;
$$;


--
-- Name: FUNCTION get_user_default_address(p_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_user_default_address(p_user_id uuid) IS 'Get user default address or most recent if no default';


--
-- Name: get_user_phone(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_phone(user_uuid uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Return the phone number for the requested user
  -- Note: This function should be used carefully and only by admin functions
  RETURN (
    SELECT phone 
    FROM auth.users 
    WHERE id = user_uuid
  );
END;
$$;


--
-- Name: get_users_without_default_address(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_users_without_default_address() RETURNS TABLE(user_id uuid, address_count bigint)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    da.user_id,
    COUNT(*) as address_count
  FROM delivery_addresses da
  WHERE da.user_id NOT IN (
    SELECT DISTINCT da2.user_id 
    FROM delivery_addresses da2 
    WHERE da2.is_default = true
  )
  GROUP BY da.user_id
  ORDER BY address_count DESC;
END;
$$;


--
-- Name: FUNCTION get_users_without_default_address(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_users_without_default_address() IS 'Helper function for default address enhancement - identifies users who need a default address set';


--
-- Name: handle_default_address(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_default_address() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- If this is the first address for the user, make it default
  IF TG_OP = 'INSERT' THEN
    -- Check if user has any other addresses
    IF NOT EXISTS (
      SELECT 1 FROM delivery_addresses 
      WHERE user_id = NEW.user_id AND id != NEW.id
    ) THEN
      NEW.is_default = TRUE;
    END IF;
  END IF;

  -- If setting as default, unset others
  IF NEW.is_default = TRUE THEN
    UPDATE delivery_addresses 
    SET is_default = FALSE 
    WHERE user_id = NEW.user_id 
    AND id != NEW.id;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: handle_mfa_failure(uuid); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    referral_code
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email,
    'REF' || substr(md5(random()::text), 1, 8)
  )
  ON CONFLICT (id) DO NOTHING;

  -- Assign default user role
  INSERT INTO public.user_roles (
    user_id,
    role,
    is_active,
    created_by,
    granted_by
  )
  VALUES (
    NEW.id,
    'user',
    true,
    NEW.id,
    NEW.id
  )
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;


--
-- Name: handle_new_user_safe(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user_safe() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Only create profile if it doesn't exist
  INSERT INTO public.profiles (id, email, created_at, updated_at)
  VALUES (NEW.id, NEW.email, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;
  
  -- Only create user role if it doesn't exist
  INSERT INTO public.user_roles (user_id, role, created_by, scope)
  VALUES (NEW.id, 'user', NEW.id, 'global')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the signup
    RAISE WARNING 'Error in handle_new_user_safe: %', SQLERRM;
    RETURN NEW;
END;
$$;


--
-- Name: handle_user_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_user_update() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- If user metadata has changed and includes avatar URL
  IF (NEW.raw_user_meta_data IS DISTINCT FROM OLD.raw_user_meta_data) 
    AND (NEW.raw_user_meta_data ? 'avatar_url' OR NEW.raw_user_meta_data ? 'picture') THEN
    
    -- Update the profile with new OAuth data
    UPDATE public.profiles
    SET 
      avatar_url = COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'picture',
        avatar_url
      ),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION handle_user_update(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.handle_user_update() IS 'Handles updates to auth.users including OAuth metadata changes';


--
-- Name: has_any_role(public.app_role[]); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: FUNCTION has_any_role(roles public.app_role[]); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.has_any_role(roles public.app_role[]) IS 'Check if the current user has any of the specified roles';


--
-- Name: has_role(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(role_name text) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = role_name 
    AND is_active = true
  );
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: increment_classification_usage(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_classification_usage(classification_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    UPDATE product_classifications 
    SET 
        usage_frequency = usage_frequency + 1,
        updated_at = NOW()
    WHERE id = classification_id
    AND is_active = true;
END;
$$;


--
-- Name: increment_discount_usage(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_discount_usage(p_discount_code_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  UPDATE discount_codes
  SET usage_count = usage_count + 1
  WHERE id = p_discount_code_id;
END;
$$;


--
-- Name: FUNCTION increment_discount_usage(p_discount_code_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.increment_discount_usage(p_discount_code_id uuid) IS 'Increments the usage count for a discount code';


--
-- Name: increment_post_views(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_post_views(post_slug text) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE public.blog_posts SET views_count = views_count + 1 WHERE slug = post_slug AND status = 'published';
END;
$$;


--
-- Name: increment_quote_version(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_quote_version() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.parent_quote_id IS NOT NULL THEN
    -- Get parent version and increment
    SELECT COALESCE(MAX(version), 0) + 1 INTO NEW.version
    FROM quotes_v2
    WHERE id = NEW.parent_quote_id OR parent_quote_id = NEW.parent_quote_id;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: initiate_quote_email_verification(uuid, text); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin' 
    AND is_active = true
  );
END;
$$;


--
-- Name: FUNCTION is_admin(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.is_admin() IS 'Simplified admin check - returns true for all authenticated users';


--
-- Name: is_authenticated(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_authenticated() RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$$;


--
-- Name: FUNCTION is_authenticated(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.is_authenticated() IS 'Check if there is an authenticated user';


--
-- Name: is_eligible_for_first_time_discount(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_eligible_for_first_time_discount(p_customer_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_order_count integer;
  v_has_used_first_time boolean;
BEGIN
  -- Check if customer has any completed orders
  SELECT COUNT(*)
  INTO v_order_count
  FROM orders
  WHERE customer_id = p_customer_id
    AND status = 'completed';
  
  IF v_order_count > 0 THEN
    RETURN false;
  END IF;
  
  -- Check if customer has already used a first-time discount
  SELECT EXISTS(
    SELECT 1
    FROM customer_discount_usage cdu
    JOIN discount_types dt ON cdu.discount_code_id IN (
      SELECT id FROM discount_codes WHERE discount_type_id = dt.id
    )
    WHERE cdu.customer_id = p_customer_id
      AND dt.type = 'first_time'
  ) INTO v_has_used_first_time;
  
  RETURN NOT v_has_used_first_time;
END;
$$;


--
-- Name: FUNCTION is_eligible_for_first_time_discount(p_customer_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.is_eligible_for_first_time_discount(p_customer_id uuid) IS 'Checks if a customer is eligible for first-time customer discount';


--
-- Name: is_quote_expired(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_quote_expired(quote_id uuid) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
  expiry TIMESTAMPTZ;
BEGIN
  SELECT expires_at INTO expiry FROM quotes_v2 WHERE id = quote_id;
  
  IF expiry IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN expiry < NOW();
END;
$$;


--
-- Name: is_target_blocked(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_target_blocked(p_target_type text, p_target_value text) RETURNS TABLE(is_blocked boolean, block_type text, reason text, expires_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TRUE as is_blocked,
    ab.block_type,
    ab.reason,
    ab.expires_at
  FROM active_blocks ab
  WHERE ab.target_type = p_target_type 
    AND ab.target_value = p_target_value
    AND (ab.expires_at IS NULL OR ab.expires_at > NOW())
  LIMIT 1;
  
  -- If no active block found, return false
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMP WITH TIME ZONE;
  END IF;
END;
$$;


--
-- Name: lock_address_after_payment(uuid); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: log_address_change(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: log_notification(text, uuid, uuid, text, text, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_notification(p_notification_type text, p_order_id uuid DEFAULT NULL::uuid, p_quote_id uuid DEFAULT NULL::uuid, p_recipient_email text DEFAULT NULL::text, p_recipient_phone text DEFAULT NULL::text, p_content text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO public.notification_logs (
        order_id,
        quote_id,
        notification_type,
        recipient_email,
        recipient_phone,
        content,
        metadata
    ) VALUES (
        p_order_id,
        p_quote_id,
        p_notification_type,
        p_recipient_email,
        p_recipient_phone,
        p_content,
        p_metadata
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$;


--
-- Name: log_pricing_change(uuid, text, text, text, numeric, numeric, numeric, numeric, numeric, numeric, text, text, integer, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_pricing_change(p_service_id uuid, p_change_type text, p_identifier text, p_identifier_name text, p_old_rate numeric, p_new_rate numeric, p_old_min_amount numeric DEFAULT NULL::numeric, p_new_min_amount numeric DEFAULT NULL::numeric, p_old_max_amount numeric DEFAULT NULL::numeric, p_new_max_amount numeric DEFAULT NULL::numeric, p_change_reason text DEFAULT 'Manual update'::text, p_change_method text DEFAULT 'manual'::text, p_affected_countries integer DEFAULT 1, p_batch_id uuid DEFAULT NULL::uuid, p_session_id text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    log_id uuid;
BEGIN
    INSERT INTO pricing_change_log (
        service_id,
        change_type,
        identifier,
        identifier_name,
        old_rate,
        new_rate,
        old_min_amount,
        new_min_amount,
        old_max_amount,
        new_max_amount,
        changed_by,
        change_reason,
        change_method,
        affected_countries,
        batch_id,
        session_id,
        ip_address,
        user_agent
    ) VALUES (
        p_service_id,
        p_change_type,
        p_identifier,
        p_identifier_name,
        p_old_rate,
        p_new_rate,
        p_old_min_amount,
        p_new_min_amount,
        p_old_max_amount,
        p_new_max_amount,
        auth.uid(),
        p_change_reason,
        p_change_method,
        p_affected_countries,
        p_batch_id,
        p_session_id,
        current_setting('request.headers', true)::json->>'x-forwarded-for',
        current_setting('request.headers', true)::json->>'user-agent'
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$;


--
-- Name: FUNCTION log_pricing_change(p_service_id uuid, p_change_type text, p_identifier text, p_identifier_name text, p_old_rate numeric, p_new_rate numeric, p_old_min_amount numeric, p_new_min_amount numeric, p_old_max_amount numeric, p_new_max_amount numeric, p_change_reason text, p_change_method text, p_affected_countries integer, p_batch_id uuid, p_session_id text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.log_pricing_change(p_service_id uuid, p_change_type text, p_identifier text, p_identifier_name text, p_old_rate numeric, p_new_rate numeric, p_old_min_amount numeric, p_new_min_amount numeric, p_old_max_amount numeric, p_new_max_amount numeric, p_change_reason text, p_change_method text, p_affected_countries integer, p_batch_id uuid, p_session_id text) IS 'Core function to log pricing changes with full context and metadata';


--
-- Name: log_quote_status_change(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: log_share_action(uuid, uuid, character varying, inet, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: mark_cart_recovered(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mark_cart_recovered(p_abandonment_id uuid, p_recovery_method text DEFAULT 'organic'::text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  UPDATE cart_abandonment_events
  SET 
    is_recovered = TRUE,
    recovered_at = NOW(),
    recovery_method = p_recovery_method,
    updated_at = NOW()
  WHERE id = p_abandonment_id
  AND is_recovered = FALSE;
  
  RETURN FOUND;
END;
$$;


--
-- Name: mark_messages_as_read(uuid[]); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: FUNCTION mark_messages_as_read(p_message_ids uuid[]); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.mark_messages_as_read(p_message_ids uuid[]) IS 'Marks specified messages as read for the current user, returns count of updated messages';


--
-- Name: mark_storage_fees_paid_on_quote_payment(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mark_storage_fees_paid_on_quote_payment() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- If quote status changed to 'paid' and it includes storage fees
  IF NEW.status = 'paid' AND OLD.status != 'paid' AND NEW.storage_fees_included THEN
    UPDATE storage_fees 
    SET is_paid = true,
        payment_date = now()
    WHERE quote_id = NEW.id
      AND is_paid = false;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: mark_ticket_as_read(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mark_ticket_as_read(p_ticket_id uuid, p_admin_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Update the ticket's last read timestamp
  UPDATE support_system
  SET 
    last_admin_read_at = NOW(),
    has_unread_replies = FALSE,
    updated_at = NOW()
  WHERE id = p_ticket_id;
  
  -- Log the read action as an interaction (optional)
  INSERT INTO support_interactions (
    id,
    support_id,
    user_id,
    interaction_type,
    content,
    metadata,
    is_internal,
    created_at
  ) VALUES (
    gen_random_uuid(),
    p_ticket_id,
    p_admin_user_id,
    'note',
    jsonb_build_object('action', 'marked_as_read'),
    jsonb_build_object('read_timestamp', NOW()),
    TRUE,
    NOW()
  );
  
  RETURN TRUE;
END;
$$;


--
-- Name: notification_already_sent(uuid, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notification_already_sent(p_order_id uuid, p_notification_type text, p_hours_window integer DEFAULT 24) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.notification_logs
        WHERE order_id = p_order_id
        AND notification_type = p_notification_type
        AND sent_at > NOW() - (p_hours_window || ' hours')::INTERVAL
        AND delivery_status != 'failed'
    );
END;
$$;


--
-- Name: post_financial_transaction(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: process_campaign_triggers(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_campaign_triggers() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_trigger RECORD;
  v_customer RECORD;
BEGIN
  FOR v_trigger IN 
    SELECT ct.*, dc.* 
    FROM campaign_triggers ct
    JOIN discount_campaigns dc ON ct.campaign_id = dc.id
    WHERE ct.is_active = true AND dc.is_active = true
  LOOP
    CASE v_trigger.trigger_type
      WHEN 'birthday' THEN
        -- Find customers with upcoming birthdays
        FOR v_customer IN 
          SELECT id, email FROM profiles
          WHERE EXTRACT(MONTH FROM date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE)
            AND EXTRACT(DAY FROM date_of_birth) BETWEEN 
              EXTRACT(DAY FROM CURRENT_DATE) AND 
              EXTRACT(DAY FROM CURRENT_DATE) + COALESCE((v_trigger.conditions->>'days_before_birthday')::INTEGER, 7)
        LOOP
          -- Create personalized discount code or notification
          -- This would integrate with your notification system
          NULL; -- Placeholder for notification logic
        END LOOP;
        
      WHEN 'dormant_user' THEN
        -- Handled by segment updates
        NULL;
        
      -- Add more trigger types as needed
    END CASE;
  END LOOP;
END;
$$;


--
-- Name: process_payment_webhook_atomic(text[], text, jsonb, text, jsonb, boolean); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: FUNCTION process_payment_webhook_atomic(p_quote_ids text[], p_payment_status text, p_payment_data jsonb, p_guest_session_token text, p_guest_session_data jsonb, p_create_order boolean); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.process_payment_webhook_atomic(p_quote_ids text[], p_payment_status text, p_payment_data jsonb, p_guest_session_token text, p_guest_session_data jsonb, p_create_order boolean) IS 'Atomically processes payment webhook data including quotes update, guest session handling, payment transaction creation, payment ledger entries, and order creation. Ensures all operations succeed or fail together with comprehensive audit trail.';


--
-- Name: process_refund_atomic(uuid, numeric, jsonb, jsonb, uuid); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: FUNCTION process_refund_atomic(p_quote_id uuid, p_refund_amount numeric, p_refund_data jsonb, p_gateway_response jsonb, p_processed_by uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.process_refund_atomic(p_quote_id uuid, p_refund_amount numeric, p_refund_data jsonb, p_gateway_response jsonb, p_processed_by uuid) IS 'Atomically processes refund operations including gateway_refunds insertion, payment_ledger entry, payment_transactions update, and quotes adjustment. Ensures all operations succeed or fail together with comprehensive audit trail and financial consistency.';


--
-- Name: process_refund_item(uuid, text, jsonb, text); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: record_payment_with_ledger_and_triggers(uuid, numeric, text, text, text, text, uuid, date); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: FUNCTION record_payment_with_ledger_and_triggers(p_quote_id uuid, p_amount numeric, p_currency text, p_payment_method text, p_transaction_reference text, p_notes text, p_recorded_by uuid, p_payment_date date); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.record_payment_with_ledger_and_triggers(p_quote_id uuid, p_amount numeric, p_currency text, p_payment_method text, p_transaction_reference text, p_notes text, p_recorded_by uuid, p_payment_date date) IS 'Records manual payment with full ledger integration and triggers payment status recalculation';


--
-- Name: record_paypal_payment_to_ledger(uuid, uuid, numeric, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: record_quote_view(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_quote_view(p_share_token text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_quote_id UUID;
BEGIN
  -- Update viewed_at timestamp
  UPDATE quotes_v2
  SET viewed_at = NOW()
  WHERE share_token = p_share_token
  AND viewed_at IS NULL
  RETURNING id INTO v_quote_id;
  
  IF v_quote_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'quote_id', v_quote_id,
      'viewed_at', NOW()
    );
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Quote not found or already viewed'
    );
  END IF;
END;
$$;


--
-- Name: refresh_discount_statistics(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_discount_statistics() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    -- Refresh statistics for all discount-related tables
    ANALYZE country_discount_rules;
    ANALYZE discount_codes;
    ANALYZE discount_types;
    ANALYZE discount_campaigns;
    ANALYZE customer_discount_usage;
    ANALYZE discount_application_log;
    
    RAISE NOTICE 'Discount system statistics refreshed successfully';
END;
$$;


--
-- Name: regenerate_backup_codes(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: remove_abuse_block(text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.remove_abuse_block(p_target_type text, p_target_value text, p_block_type text DEFAULT NULL::text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  IF p_block_type IS NOT NULL THEN
    DELETE FROM active_blocks
    WHERE target_type = p_target_type 
      AND target_value = p_target_value
      AND block_type = p_block_type;
  ELSE
    DELETE FROM active_blocks
    WHERE target_type = p_target_type 
      AND target_value = p_target_value;
  END IF;
  
  RETURN TRUE;
END;
$$;


--
-- Name: remove_discount_from_quote(uuid, text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.remove_discount_from_quote(p_quote_id uuid, p_discount_codes text[] DEFAULT NULL::text[]) RETURNS TABLE(success boolean, message text, recalculated_quote jsonb, original_total numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_quote RECORD;
  v_original_total NUMERIC;
  v_usage_record RECORD;
BEGIN
  -- Get quote details
  SELECT * INTO v_quote
  FROM quotes_v2
  WHERE id = p_quote_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Quote not found', NULL::JSONB, 0::NUMERIC;
    RETURN;
  END IF;
  
  -- Get original total before discounts
  v_original_total := COALESCE(
    (v_quote.calculation_data->>'total_usd')::NUMERIC,
    v_quote.total_usd
  );
  
  -- Remove discount usage records
  IF p_discount_codes IS NOT NULL THEN
    -- Remove specific discount codes
    DELETE FROM customer_discount_usage 
    WHERE quote_id = p_quote_id 
      AND discount_code_id IN (
        SELECT id FROM discount_codes WHERE code = ANY(p_discount_codes)
      );
  ELSE
    -- Remove all discounts from this quote
    DELETE FROM customer_discount_usage 
    WHERE quote_id = p_quote_id;
  END IF;
  
  -- Update quote to remove discount data
  UPDATE quotes_v2 
  SET 
    calculation_data = calculation_data - 'applied_discounts' - 'total_savings' - 'discounted_total',
    total_customer_currency = v_original_total,
    updated_at = NOW()
  WHERE id = p_quote_id;
  
  -- Return updated quote
  SELECT calculation_data INTO v_quote FROM quotes_v2 WHERE id = p_quote_id;
  
  RETURN QUERY SELECT 
    TRUE, 
    'Discount(s) removed successfully', 
    v_quote.calculation_data,
    v_original_total;
END;
$$;


--
-- Name: FUNCTION remove_discount_from_quote(p_quote_id uuid, p_discount_codes text[]); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.remove_discount_from_quote(p_quote_id uuid, p_discount_codes text[]) IS 'Removes discount codes from a quote and restores original totals';


--
-- Name: request_quote_review(uuid, text, text, text, text[], text, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.request_quote_review(p_quote_id uuid, p_category text, p_description text, p_urgency text DEFAULT 'medium'::text, p_specific_items text[] DEFAULT NULL::text[], p_expected_changes text DEFAULT NULL::text, p_budget_constraint numeric DEFAULT NULL::numeric) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_quote quotes_v2%ROWTYPE;
  v_user_id UUID;
  v_user_email TEXT;
  v_review_data JSONB;
  v_result JSONB;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Validate user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Get user email
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  
  -- Get and validate quote
  SELECT * INTO v_quote FROM quotes_v2 WHERE id = p_quote_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quote not found';
  END IF;
  
  -- Authorization: check customer_id (clean and secure)
  IF v_quote.customer_id <> v_user_id AND NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied - quote belongs to different customer';
  END IF;
  
  -- Validate quote status allows review request
  IF v_quote.status NOT IN ('sent', 'approved', 'rejected', 'expired') THEN
    RAISE EXCEPTION 'Quote status does not allow review requests. Only sent, approved, rejected, or expired quotes can be reviewed.';
  END IF;
  
  -- Validate inputs
  IF p_category NOT IN ('pricing', 'items', 'shipping', 'timeline', 'other') THEN
    RAISE EXCEPTION 'Invalid category';
  END IF;
  
  IF p_urgency NOT IN ('low', 'medium', 'high') THEN
    RAISE EXCEPTION 'Invalid urgency level';
  END IF;
  
  IF LENGTH(TRIM(p_description)) < 10 THEN
    RAISE EXCEPTION 'Description must be at least 10 characters';
  END IF;
  
  -- Build review request data
  v_review_data := jsonb_build_object(
    'category', p_category,
    'urgency', p_urgency,
    'description', TRIM(p_description),
    'expected_changes', TRIM(p_expected_changes),
    'budget_constraint', p_budget_constraint,
    'customer_id', v_user_id,
    'customer_email', v_user_email,
    'submitted_at', NOW(),
    'ip_address', '127.0.0.1'
  );
  
  -- Add specific items if provided
  IF p_specific_items IS NOT NULL AND array_length(p_specific_items, 1) > 0 THEN
    v_review_data := v_review_data || jsonb_build_object('specific_items', to_jsonb(p_specific_items));
  END IF;
  
  -- Update quote with review request
  UPDATE quotes_v2 SET
    status = 'under_review',
    review_request_data = v_review_data,
    review_requested_at = NOW(),
    updated_at = NOW()
  WHERE id = p_quote_id;
  
  -- Return success
  v_result := jsonb_build_object(
    'success', true,
    'message', 'Review request submitted successfully',
    'quote_id', p_quote_id,
    'status', 'under_review',
    'review_requested_at', NOW(),
    'estimated_response_time', '24-48 hours'
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return failure
    INSERT INTO error_logs (
      user_id, 
      error_message, 
      error_details, 
      context
    ) VALUES (
      v_user_id,
      SQLERRM,
      SQLSTATE,
      jsonb_build_object(
        'function', 'request_quote_review',
        'quote_id', p_quote_id,
        'category', p_category,
        'urgency', p_urgency
      )
    );
    
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Failed to submit review request'
    );
END;
$$;


--
-- Name: requires_mfa(uuid); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: reverse_financial_transaction(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: rollback_tax_standardization_20250128(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: schedule_recovery_attempt(uuid, text, integer, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.schedule_recovery_attempt(p_abandonment_id uuid, p_attempt_type text, p_sequence_number integer DEFAULT 1, p_template_id text DEFAULT NULL::text, p_incentive text DEFAULT 'none'::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_attempt_id UUID;
BEGIN
  INSERT INTO cart_recovery_attempts (
    abandonment_event_id,
    attempt_type,
    sequence_number,
    template_id,
    incentive_offered
  ) VALUES (
    p_abandonment_id,
    p_attempt_type,
    p_sequence_number,
    p_template_id,
    p_incentive
  )
  RETURNING id INTO v_attempt_id;
  
  RETURN v_attempt_id;
END;
$$;


--
-- Name: schedule_supplier_pickup(uuid, date, character varying, jsonb, character varying, character varying, character varying, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.schedule_supplier_pickup(p_return_id uuid, p_pickup_date date, p_pickup_time_slot character varying, p_pickup_address jsonb, p_contact_name character varying, p_contact_phone character varying, p_supplier_name character varying DEFAULT NULL::character varying, p_instructions text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_confirmation_number VARCHAR;
  v_pickup_request_id UUID;
BEGIN
  -- Generate confirmation number
  v_confirmation_number := 'SPU-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' || 
                          LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
  
  -- Update package return
  UPDATE package_returns
  SET 
    return_method = 'supplier_pickup',
    pickup_scheduled = TRUE,
    pickup_date = p_pickup_date,
    pickup_time_slot = p_pickup_time_slot,
    pickup_address = p_pickup_address,
    pickup_contact_name = p_contact_name,
    pickup_contact_phone = p_contact_phone,
    pickup_instructions = p_instructions,
    pickup_confirmation_number = v_confirmation_number,
    status = CASE 
      WHEN status = 'approved' THEN 'pickup_scheduled'
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = p_return_id;
  
  -- Create pickup request record
  INSERT INTO supplier_pickup_requests (
    package_return_id,
    supplier_name,
    pickup_date,
    pickup_time_slot,
    pickup_address,
    contact_name,
    contact_phone,
    special_instructions,
    confirmation_number,
    scheduled_by
  ) VALUES (
    p_return_id,
    p_supplier_name,
    p_pickup_date,
    p_pickup_time_slot,
    p_pickup_address,
    p_contact_name,
    p_contact_phone,
    p_instructions,
    v_confirmation_number,
    auth.uid()
  ) RETURNING id INTO v_pickup_request_id;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'confirmation_number', v_confirmation_number,
    'pickup_request_id', v_pickup_request_id
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', SQLERRM
    );
END;
$$;


--
-- Name: search_product_classifications(text, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_product_classifications(p_search_text text, p_country_code text DEFAULT NULL::text, p_limit integer DEFAULT 20) RETURNS TABLE(id uuid, product_name text, product_category text, classification_code text, rank real)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pc.id,
        pc.product_name::TEXT,
        pc.product_category::TEXT,
        CASE 
            WHEN p_country_code IS NOT NULL AND pc.country_data ? p_country_code 
            THEN (pc.country_data->p_country_code->>'classification_code')::TEXT
            ELSE NULL
        END,
        ts_rank(pc.search_vector, plainto_tsquery('english', p_search_text)) as rank
    FROM product_classifications pc
    WHERE pc.search_vector @@ plainto_tsquery('english', p_search_text)
       OR pc.product_name ILIKE '%' || p_search_text || '%'
       OR pc.product_category ILIKE '%' || p_search_text || '%'
    ORDER BY rank DESC, pc.usage_count DESC
    LIMIT p_limit;
END;
$$;


--
-- Name: search_product_classifications_fts(text, character varying, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_product_classifications_fts(search_query text, target_country character varying, result_limit integer DEFAULT 5) RETURNS TABLE(id uuid, classification_code character varying, country_code character varying, product_name character varying, category character varying, subcategory character varying, description text, country_data jsonb, typical_weight_kg numeric, weight_variance_factor numeric, typical_dimensions jsonb, volume_category character varying, customs_rate numeric, valuation_method character varying, minimum_valuation_usd numeric, confidence_score numeric, usage_frequency integer, search_keywords text[], tags character varying[], created_at timestamp with time zone, updated_at timestamp with time zone, created_by uuid, is_active boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pc.id,
        pc.classification_code,
        pc.country_code,
        pc.product_name,
        pc.category,
        pc.subcategory,
        pc.description,
        pc.country_data,
        pc.typical_weight_kg,
        pc.weight_variance_factor,
        pc.typical_dimensions,
        pc.volume_category,
        pc.customs_rate,
        pc.valuation_method,
        pc.minimum_valuation_usd,
        pc.confidence_score,
        pc.usage_frequency,
        pc.search_keywords,
        pc.tags,
        pc.created_at,
        pc.updated_at,
        pc.created_by,
        pc.is_active
    FROM product_classifications pc
    WHERE pc.country_code = target_country
    AND pc.is_active = true
    AND to_tsvector('english', 
        COALESCE(pc.product_name, '') || ' ' || 
        COALESCE(pc.category, '') || ' ' || 
        COALESCE(pc.subcategory, '') || ' ' || 
        COALESCE(pc.description, '')
    ) @@ plainto_tsquery('english', search_query)
    ORDER BY 
        ts_rank(
            to_tsvector('english', 
                COALESCE(pc.product_name, '') || ' ' || 
                COALESCE(pc.category, '') || ' ' || 
                COALESCE(pc.subcategory, '') || ' ' || 
                COALESCE(pc.description, '')
            ),
            plainto_tsquery('english', search_query)
        ) DESC,
        pc.confidence_score DESC,
        pc.usage_frequency DESC
    LIMIT result_limit;
END;
$$;


--
-- Name: search_product_classifications_v2(text, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_product_classifications_v2(p_search_text text, p_country_code text DEFAULT NULL::text, p_limit integer DEFAULT 20) RETURNS TABLE(id uuid, product_name text, product_category text, classification_code text, rank real)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pc.id,
        pc.product_name::TEXT,
        COALESCE(pc.product_category, pc.category)::TEXT,
        CASE 
            WHEN p_country_code IS NOT NULL AND pc.country_data ? p_country_code 
            THEN (pc.country_data->p_country_code->>'classification_code')::TEXT
            WHEN p_country_code IS NOT NULL AND pc.country_code = p_country_code
            THEN pc.classification_code::TEXT
            ELSE COALESCE(pc.classification_code, '')::TEXT
        END,
        COALESCE(
            ts_rank(pc.search_vector, plainto_tsquery('english', p_search_text)),
            ts_rank(to_tsvector('english', pc.product_name || ' ' || COALESCE(pc.category, '')), plainto_tsquery('english', p_search_text))
        ) as rank
    FROM product_classifications pc
    WHERE (
        pc.search_vector @@ plainto_tsquery('english', p_search_text) OR
        to_tsvector('english', pc.product_name || ' ' || COALESCE(pc.category, '')) @@ plainto_tsquery('english', p_search_text) OR
        pc.product_name ILIKE '%' || p_search_text || '%' OR
        COALESCE(pc.product_category, pc.category) ILIKE '%' || p_search_text || '%'
    )
    AND COALESCE(pc.is_active, true) = true
    ORDER BY rank DESC, COALESCE(pc.usage_count, pc.usage_frequency, 0) DESC
    LIMIT p_limit;
END;
$$;


--
-- Name: select_delivery_provider(text, text, numeric, boolean, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.select_delivery_provider(p_from_country text, p_to_country text, p_weight numeric, p_requires_cod boolean DEFAULT false, p_preferred_provider text DEFAULT NULL::text) RETURNS TABLE(provider_code text, provider_name text, priority integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dpc.code,
    dpc.name,
    dpc.priority
  FROM delivery_provider_configs dpc
  WHERE 
    dpc.is_active = true
    AND dpc.settings->>'enabled' = 'true'
    AND p_to_country = ANY(dpc.supported_countries)
    AND (NOT p_requires_cod OR dpc.capabilities->>'cashOnDelivery' = 'true')
    AND (p_preferred_provider IS NULL OR dpc.code = p_preferred_provider)
  ORDER BY 
    CASE WHEN dpc.code = p_preferred_provider THEN 0 ELSE 1 END,
    dpc.priority,
    dpc.name;
END;
$$;


--
-- Name: send_quote_reminder(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.send_quote_reminder(quote_id uuid) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE quotes_v2
  SET 
    reminder_count = COALESCE(reminder_count, 0) + 1,
    last_reminder_at = NOW()
  WHERE id = quote_id
  AND status IN ('sent', 'viewed')
  AND NOT is_quote_expired(id);
  
  RETURN FOUND;
END;
$$;


--
-- Name: send_welcome_email(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: set_quote_expiration(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: set_share_token(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: start_reconciliation_session(text, text, date, date, date); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: sync_customer_address_profile(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_customer_address_profile() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Ensure profile exists first
  NEW.profile_id := ensure_profile_exists(NEW.user_id);
  RETURN NEW;
END;
$$;


--
-- Name: sync_delivery_status_to_quote(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_delivery_status_to_quote() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Map delivery status to quote status
  UPDATE quotes
  SET status = CASE NEW.status
    WHEN 'delivered' THEN 'delivered'
    WHEN 'in_transit' THEN 'in_transit'
    WHEN 'out_for_delivery' THEN 'in_transit'
    WHEN 'picked_up' THEN 'shipped'
    WHEN 'pickup_scheduled' THEN 'preparing'
    WHEN 'returned' THEN 'returned'
    WHEN 'cancelled' THEN 'cancelled'
    WHEN 'failed' THEN 'failed'
    ELSE quotes.status
  END,
  delivery_actual_date = CASE 
    WHEN NEW.status = 'delivered' THEN NEW.actual_delivery::DATE
    ELSE delivery_actual_date
  END,
  updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.quote_id;
  
  RETURN NEW;
END;
$$;


--
-- Name: sync_oauth_avatars_to_profiles(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_oauth_avatars_to_profiles() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  user_record RECORD;
  avatar_url_value TEXT;
BEGIN
  -- Loop through all users with OAuth metadata
  FOR user_record IN 
    SELECT 
      id,
      raw_user_meta_data,
      COALESCE(
        raw_user_meta_data->>'avatar_url',
        raw_user_meta_data->>'picture'
      ) as oauth_avatar_url
    FROM auth.users
    WHERE raw_user_meta_data IS NOT NULL
      AND (raw_user_meta_data ? 'avatar_url' OR raw_user_meta_data ? 'picture')
  LOOP
    -- Update the profile with the OAuth avatar URL if not already set
    UPDATE public.profiles
    SET 
      avatar_url = COALESCE(avatar_url, user_record.oauth_avatar_url),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = user_record.id
      AND (avatar_url IS NULL OR avatar_url = '');
  END LOOP;
END;
$$;


--
-- Name: FUNCTION sync_oauth_avatars_to_profiles(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.sync_oauth_avatars_to_profiles() IS 'Syncs OAuth avatar URLs from auth.users metadata to profiles table';


--
-- Name: sync_oauth_profile_data(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_oauth_profile_data() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Only process if user has OAuth metadata
  IF NEW.raw_user_meta_data IS NOT NULL THEN
    -- Extract profile data from OAuth metadata
    DECLARE
      oauth_name TEXT;
      oauth_avatar TEXT;
    BEGIN
      -- Get name (try multiple possible fields)
      oauth_name := COALESCE(
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'full_name',
        CASE 
          WHEN NEW.raw_user_meta_data->>'given_name' IS NOT NULL AND NEW.raw_user_meta_data->>'family_name' IS NOT NULL
          THEN (NEW.raw_user_meta_data->>'given_name') || ' ' || (NEW.raw_user_meta_data->>'family_name')
          ELSE NULL
        END,
        NULL
      );
      
      -- Get avatar URL (try multiple possible fields)
      oauth_avatar := COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'picture',
        NEW.raw_user_meta_data->>'profile_picture',
        NULL
      );
      
      -- Update or insert profile data
      INSERT INTO public.profiles (
        id,
        full_name,
        avatar_url,
        email,
        created_at,
        updated_at
      )
      VALUES (
        NEW.id,
        oauth_name,
        oauth_avatar,
        NEW.email,
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE
      SET 
        -- Only update if the OAuth data is not null and profile field is null
        full_name = CASE 
          WHEN profiles.full_name IS NULL AND oauth_name IS NOT NULL 
          THEN oauth_name 
          ELSE profiles.full_name 
        END,
        avatar_url = CASE 
          WHEN profiles.avatar_url IS NULL AND oauth_avatar IS NOT NULL 
          THEN oauth_avatar 
          ELSE profiles.avatar_url 
        END,
        updated_at = NOW();
    END;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: sync_payment_record_to_ledger(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: FUNCTION sync_payment_record_to_ledger(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.sync_payment_record_to_ledger() IS 'Simplified sync function without USD conversion columns';


--
-- Name: sync_quote_payment_amounts(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: test_payment_update_direct(uuid, numeric, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.test_payment_update_direct(quote_id uuid, new_amount_paid numeric, new_payment_status text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: test_storage_fee_access(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.test_storage_fee_access() RETURNS TABLE(can_read_fees boolean, can_call_extend boolean, can_call_waive boolean, current_user_role text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) > 0 FROM storage_fees LIMIT 1) as can_read_fees,
    (SELECT 1 FROM extend_storage_exemption(
      'ffffffff-ffff-ffff-ffff-ffffffffffff'::UUID, 
      0, 
      'test', 
      auth.uid()
    ) LIMIT 1) IS NULL as can_call_extend,
    (SELECT 1 FROM waive_storage_fees(
      'ffffffff-ffff-ffff-ffff-ffffffffffff'::UUID,
      'test',
      auth.uid()
    ) LIMIT 1) IS NULL as can_call_waive,
    COALESCE(auth.jwt() ->> 'role', 'none') as current_user_role;
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT false, false, false, 'error';
END;
$$;


--
-- Name: track_order_status_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.track_order_status_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Only track if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_status_history (
      order_id,
      previous_status,
      new_status,
      changed_by,
      change_reason
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid(), -- Current authenticated user
      CASE 
        WHEN NEW.admin_notes IS DISTINCT FROM OLD.admin_notes 
        THEN NEW.admin_notes 
        ELSE NULL 
      END
    );
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: track_quote_status_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.track_quote_status_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Track when quote is sent
  IF NEW.status = 'sent' AND OLD.status != 'sent' THEN
    NEW.sent_at := NOW();
  END IF;
  
  -- Track when quote is approved
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    NEW.approved_at := NOW();
  END IF;
  
  -- Mark as expired if past expiry date
  IF NEW.expires_at IS NOT NULL AND NEW.expires_at < NOW() AND NEW.status NOT IN ('approved', 'rejected', 'converted') THEN
    NEW.status := 'expired';
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: track_quote_view(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.track_quote_view(quote_id uuid, token text DEFAULT NULL::text) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
  quote_exists BOOLEAN;
BEGIN
  -- Check if quote exists and token matches (if provided)
  SELECT EXISTS(
    SELECT 1 FROM quotes_v2 
    WHERE id = quote_id 
    AND (token IS NULL OR share_token = token)
  ) INTO quote_exists;
  
  IF NOT quote_exists THEN
    RETURN false;
  END IF;
  
  -- Update viewed_at timestamp
  UPDATE quotes_v2 
  SET viewed_at = NOW() 
  WHERE id = quote_id 
  AND (viewed_at IS NULL OR viewed_at < NOW() - INTERVAL '1 minute');
  
  RETURN true;
END;
$$;


--
-- Name: trigger_auto_assignment(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_auto_assignment() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_matched_rule RECORD;
    v_assigned_user_id UUID;
    v_ticket_data JSONB := NEW.ticket_data;
    v_priority TEXT := v_ticket_data->>'priority';
    v_category TEXT := v_ticket_data->>'category';
BEGIN
    -- Only process ticket insertions that don't already have an assigned_to
    IF NEW.system_type = 'ticket' AND (v_ticket_data->>'assigned_to' IS NULL OR v_ticket_data->>'assigned_to' = '') THEN
        
        -- Find the highest priority matching rule
        SELECT * INTO v_matched_rule
        FROM support_assignment_rules 
        WHERE is_active = true
          AND (
            -- Check priority criteria
            (criteria->>'priority' IS NULL OR 
             criteria->'priority' @> to_jsonb(v_priority))
            AND
            -- Check category criteria  
            (criteria->>'category' IS NULL OR 
             criteria->'category' @> to_jsonb(v_category))
          )
        ORDER BY priority DESC
        LIMIT 1;
        
        -- If we found a matching rule and it has eligible users
        IF v_matched_rule.id IS NOT NULL AND array_length(v_matched_rule.eligible_user_ids, 1) > 0 THEN
            
            -- For now, just pick the first eligible user (round robin/least assigned logic would be more complex)
            v_assigned_user_id := v_matched_rule.eligible_user_ids[1];
            
            -- Update the ticket_data with assignment
            NEW.ticket_data := jsonb_set(
                NEW.ticket_data,
                '{assigned_to}',
                to_jsonb(v_assigned_user_id::TEXT)
            );
            
            -- Update assignment count for the rule
            UPDATE support_assignment_rules 
            SET 
                assignment_count = assignment_count + 1,
                last_assigned_user_id = v_assigned_user_id,
                updated_at = NOW()
            WHERE id = v_matched_rule.id;
            
            -- Log the auto-assignment
            RAISE NOTICE 'Auto-assigned ticket % to user % using rule %', 
                NEW.id, v_assigned_user_id, v_matched_rule.name;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: FUNCTION trigger_auto_assignment(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.trigger_auto_assignment() IS 'Automatically assigns tickets to users based on assignment rules';


--
-- Name: trigger_log_country_pricing_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_log_country_pricing_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Only log if the rate actually changed
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.rate != NEW.rate) THEN
        PERFORM log_pricing_change(
            NEW.service_id,
            'country',
            NEW.country_code,
            (SELECT name FROM country_settings WHERE code = NEW.country_code),
            CASE WHEN TG_OP = 'UPDATE' THEN OLD.rate ELSE NULL END,
            NEW.rate,
            CASE WHEN TG_OP = 'UPDATE' THEN OLD.min_amount ELSE NULL END,
            NEW.min_amount,
            CASE WHEN TG_OP = 'UPDATE' THEN OLD.max_amount ELSE NULL END,
            NEW.max_amount,
            COALESCE(NEW.reason, 'Automatic trigger'),
            'manual'
        );
    END IF;
    
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;


--
-- Name: trigger_paypal_webhook_events_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_paypal_webhook_events_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: trigger_update_payment_status(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: trigger_update_quote_options_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_update_quote_options_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Only update timestamp if option-related fields changed
  IF (OLD.selected_shipping_option_id IS DISTINCT FROM NEW.selected_shipping_option_id) OR
     (OLD.shipping_method IS DISTINCT FROM NEW.shipping_method) OR
     (OLD.insurance_required IS DISTINCT FROM NEW.insurance_required) OR
     (OLD.applied_discount_codes IS DISTINCT FROM NEW.applied_discount_codes) OR
     (OLD.discount_amounts IS DISTINCT FROM NEW.discount_amounts) THEN
    
    NEW.options_last_updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: update_authenticated_checkout_sessions_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_authenticated_checkout_sessions_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_checkout_sessions_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_checkout_sessions_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


--
-- Name: update_country_payment_preferences_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_country_payment_preferences_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


--
-- Name: update_customer_satisfaction_surveys_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_customer_satisfaction_surveys_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_customer_segments(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_customer_segments() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_segment RECORD;
  v_customer RECORD;
BEGIN
  -- Clear expired assignments
  DELETE FROM customer_segment_assignments
  WHERE expires_at < CURRENT_TIMESTAMP;

  -- Process each segment
  FOR v_segment IN SELECT * FROM user_segments WHERE is_active = true
  LOOP
    -- Find customers matching segment conditions
    FOR v_customer IN 
      SELECT DISTINCT p.id
      FROM profiles p
      LEFT JOIN orders o ON o.customer_id = p.id
      LEFT JOIN customer_memberships cm ON cm.customer_id = p.id AND cm.status = 'active'
      WHERE 
        -- Check various conditions based on segment rules
        CASE 
          WHEN v_segment.conditions->>'days_since_last_order' IS NOT NULL THEN
            (SELECT MAX(created_at) FROM orders WHERE customer_id = p.id) < 
            CURRENT_TIMESTAMP - ((v_segment.conditions->>'days_since_last_order')::INTEGER || ' days')::INTERVAL
          ELSE true
        END
        AND CASE 
          WHEN v_segment.conditions->'total_orders'->>'min' IS NOT NULL THEN
            (SELECT COUNT(*) FROM orders WHERE customer_id = p.id) >= 
            (v_segment.conditions->'total_orders'->>'min')::INTEGER
          ELSE true
        END
        AND CASE 
          WHEN v_segment.conditions->'membership' IS NOT NULL THEN
            cm.plan_id IN (
              SELECT id FROM membership_plans 
              WHERE slug = ANY(ARRAY(SELECT jsonb_array_elements_text(v_segment.conditions->'membership')))
            )
          ELSE true
        END
    LOOP
      -- Assign to segment
      INSERT INTO customer_segment_assignments (customer_id, segment_id)
      VALUES (v_customer.id, v_segment.id)
      ON CONFLICT (customer_id, segment_id) DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$;


--
-- Name: update_guest_checkout_sessions_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_guest_checkout_sessions_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_location_capacity(text, integer); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: update_membership_expiry(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_membership_expiry() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.status = 'active' AND OLD.status != 'active' THEN
    NEW.expires_at := NEW.started_at + (
      SELECT duration_days * INTERVAL '1 day' 
      FROM membership_plans 
      WHERE id = NEW.plan_id
    );
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: update_notification_logs_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_notification_logs_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_order_item_counters(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_order_item_counters() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  order_record orders%ROWTYPE;
BEGIN
  -- Get current order record
  SELECT * INTO order_record FROM orders WHERE id = COALESCE(NEW.order_id, OLD.order_id);
  
  -- Recalculate all counters
  UPDATE orders SET
    active_items = (SELECT COUNT(*) FROM order_items WHERE order_id = order_record.id AND item_status IN ('seller_order_placed', 'quality_check_passed', 'shipped')),
    cancelled_items = (SELECT COUNT(*) FROM order_items WHERE order_id = order_record.id AND item_status = 'cancelled'),
    refunded_items = (SELECT COUNT(*) FROM order_items WHERE order_id = order_record.id AND item_status = 'refunded'),
    revision_pending_items = (SELECT COUNT(*) FROM order_items WHERE order_id = order_record.id AND item_status = 'revision_pending'),
    shipped_items = (SELECT COUNT(*) FROM order_items WHERE order_id = order_record.id AND item_status = 'shipped'),
    delivered_items = (SELECT COUNT(*) FROM order_items WHERE order_id = order_record.id AND item_status = 'delivered')
  WHERE id = order_record.id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: update_payment_links_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_payment_links_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_payment_refund_totals(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: update_payment_status(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: update_paypal_refunds_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_paypal_refunds_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_product_classifications_search_vector(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_product_classifications_search_vector() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.search_vector := to_tsvector('english', 
        COALESCE(NEW.product_name, '') || ' ' ||
        COALESCE(NEW.product_category, '') || ' ' ||
        COALESCE(NEW.product_subcategory, '') || ' ' ||
        COALESCE(array_to_string(NEW.search_keywords, ' '), '')
    );
    RETURN NEW;
END;
$$;


--
-- Name: update_product_classifications_search_vector_new(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_product_classifications_search_vector_new() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.search_vector := to_tsvector('english', 
        COALESCE(NEW.product_name, '') || ' ' ||
        COALESCE(NEW.product_category, '') || ' ' ||
        COALESCE(NEW.product_subcategory, '') || ' ' ||
        COALESCE(NEW.description, '') || ' ' ||
        COALESCE(array_to_string(NEW.search_keywords, ' '), '')
    );
    RETURN NEW;
END;
$$;


--
-- Name: update_quote_documents_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_quote_documents_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


--
-- Name: update_quote_has_documents(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_quote_has_documents() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE quotes_v2 
    SET has_documents = TRUE 
    WHERE id = NEW.quote_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE quotes_v2 
    SET has_documents = (
      SELECT COUNT(*) > 0 
      FROM quote_documents 
      WHERE quote_id = OLD.quote_id
    ) 
    WHERE id = OLD.quote_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


--
-- Name: update_quote_insurance(uuid, boolean, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_quote_insurance(p_quote_id uuid, p_insurance_enabled boolean, p_customer_id uuid DEFAULT NULL::uuid) RETURNS TABLE(success boolean, message text, recalculated_quote jsonb, insurance_fee numeric, new_total numeric, insurance_details jsonb)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_quote RECORD;
  v_customer_id UUID;
  v_route_calculations JSONB;
  v_insurance_config JSONB;
  v_insurance_fee NUMERIC := 0;
  v_original_total NUMERIC;
  v_new_total NUMERIC;
  v_updated_calculation_data JSONB;
  v_insurance_details JSONB;
  v_coverage_amount NUMERIC;
BEGIN
  -- Get quote details
  SELECT * INTO v_quote
  FROM quotes_v2
  WHERE id = p_quote_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Quote not found', NULL::JSONB, 0::NUMERIC, 0::NUMERIC, NULL::JSONB;
    RETURN;
  END IF;
  
  -- Use provided customer_id or get from quote
  v_customer_id := COALESCE(p_customer_id, v_quote.customer_id);
  
  -- Get route calculations and insurance configuration
  v_route_calculations := COALESCE(v_quote.calculation_data->'route_calculations', '{}');
  v_insurance_config := COALESCE(v_route_calculations->'insurance', '{}');
  
  -- Get original total (before any insurance changes)
  v_original_total := COALESCE((v_quote.calculation_data->>'total_customer_currency')::NUMERIC, v_quote.total_usd);
  
  -- Calculate insurance fee if enabled
  IF p_insurance_enabled THEN
    -- Get coverage amount (total value of items)
    v_coverage_amount := COALESCE(v_quote.total_usd, 0);
    
    -- Calculate insurance fee using route configuration or fallback values
    v_insurance_fee := GREATEST(
      v_coverage_amount * COALESCE((v_insurance_config->>'percentage')::NUMERIC, 1.5) / 100,
      COALESCE((v_insurance_config->>'min_fee')::NUMERIC, 2)
    );
    
    -- Cap at max fee if specified
    IF v_insurance_config->>'max_fee' IS NOT NULL THEN
      v_insurance_fee := LEAST(v_insurance_fee, (v_insurance_config->>'max_fee')::NUMERIC);
    END IF;
    
    -- Build insurance details
    v_insurance_details := jsonb_build_object(
      'enabled', TRUE,
      'coverage_amount', v_coverage_amount,
      'fee_amount', v_insurance_fee,
      'percentage_rate', COALESCE((v_insurance_config->>'percentage')::NUMERIC, 1.5),
      'min_fee', COALESCE((v_insurance_config->>'min_fee')::NUMERIC, 2),
      'max_fee', v_insurance_config->>'max_fee',
      'currency', COALESCE(v_quote.customer_currency, 'USD')
    );
  ELSE
    -- Insurance disabled
    v_insurance_fee := 0;
    v_insurance_details := jsonb_build_object(
      'enabled', FALSE,
      'coverage_amount', 0,
      'fee_amount', 0,
      'currency', COALESCE(v_quote.customer_currency, 'USD')
    );
  END IF;
  
  -- Calculate new total
  -- Remove any existing insurance fee from current total and add new one
  v_new_total := v_original_total;
  
  -- If there was an existing insurance fee, subtract it
  IF (v_quote.calculation_data->'calculation_steps'->>'insurance_amount')::NUMERIC IS NOT NULL THEN
    v_new_total := v_new_total - (v_quote.calculation_data->'calculation_steps'->>'insurance_amount')::NUMERIC;
  END IF;
  
  -- Add new insurance fee
  v_new_total := v_new_total + v_insurance_fee;
  
  -- Update calculation data with new insurance information
  v_updated_calculation_data := COALESCE(v_quote.calculation_data, '{}');
  
  -- Update insurance in calculation steps
  v_updated_calculation_data := jsonb_set(
    v_updated_calculation_data, 
    '{calculation_steps,insurance_amount}', 
    to_jsonb(v_insurance_fee)
  );
  
  -- Update route calculations insurance config
  v_updated_calculation_data := jsonb_set(
    v_updated_calculation_data, 
    '{route_calculations,insurance}', 
    v_insurance_config || jsonb_build_object('current_fee', v_insurance_fee, 'enabled', p_insurance_enabled)
  );
  
  -- Update total with insurance changes
  v_updated_calculation_data := jsonb_set(
    v_updated_calculation_data, 
    '{total_customer_currency}', 
    to_jsonb(v_new_total)
  );
  
  -- Add insurance update metadata
  v_updated_calculation_data := jsonb_set(
    v_updated_calculation_data, 
    '{insurance_last_updated}', 
    to_jsonb(EXTRACT(EPOCH FROM NOW()))
  );
  
  -- Update quote in database
  UPDATE quotes_v2 
  SET 
    insurance_required = p_insurance_enabled,
    calculation_data = v_updated_calculation_data,
    total_customer_currency = v_new_total,
    updated_at = NOW()
  WHERE id = p_quote_id;
  
  RETURN QUERY SELECT 
    TRUE, 
    CASE 
      WHEN p_insurance_enabled THEN format('Insurance enabled - Fee: %s', v_insurance_fee)
      ELSE 'Insurance disabled'
    END, 
    v_updated_calculation_data,
    v_insurance_fee,
    v_new_total,
    v_insurance_details;
END;
$$;


--
-- Name: FUNCTION update_quote_insurance(p_quote_id uuid, p_insurance_enabled boolean, p_customer_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.update_quote_insurance(p_quote_id uuid, p_insurance_enabled boolean, p_customer_id uuid) IS 'Updates quote insurance status, recalculates fees and totals - WORKING VERSION';


--
-- Name: update_quote_options(uuid, text, text, boolean, jsonb, jsonb, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_quote_options(quote_id_param uuid, shipping_option_id_param text DEFAULT NULL::text, shipping_method_param text DEFAULT NULL::text, insurance_enabled_param boolean DEFAULT NULL::boolean, discount_codes_param jsonb DEFAULT NULL::jsonb, discount_amounts_param jsonb DEFAULT NULL::jsonb, updated_by_param text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  updated_quote quotes_v2%ROWTYPE;
  options_state JSONB;
BEGIN
  -- Update quote with new option values
  UPDATE quotes_v2
  SET 
    selected_shipping_option_id = COALESCE(shipping_option_id_param, selected_shipping_option_id),
    shipping_method = COALESCE(shipping_method_param, shipping_method),
    insurance_required = COALESCE(insurance_enabled_param, insurance_required),
    applied_discount_codes = COALESCE(discount_codes_param, applied_discount_codes),
    discount_amounts = COALESCE(discount_amounts_param, discount_amounts),
    options_last_updated_by = COALESCE(updated_by_param, options_last_updated_by),
    options_last_updated_at = NOW(),
    updated_at = NOW()
  WHERE id = quote_id_param
  RETURNING * INTO updated_quote;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quote not found: %', quote_id_param;
  END IF;
  
  -- Get updated options state
  SELECT get_quote_options_state(quote_id_param) INTO options_state;
  
  -- Return success with updated state
  RETURN jsonb_build_object(
    'success', true,
    'quote_id', quote_id_param,
    'options_state', options_state,
    'updated_at', updated_quote.options_last_updated_at
  );
END;
$$;


--
-- Name: update_quote_view_tracking(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: update_quotes_unified_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_quotes_unified_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_route_customs_tiers_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_route_customs_tiers_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_sla_breach_flags(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_sla_breach_flags() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  breach_count INTEGER := 0;
BEGIN
  -- This is a simplified version since we don't have breach flags in current schema
  -- Just return count of potentially breached tickets
  SELECT COUNT(*) INTO breach_count
  FROM support_system
  WHERE ticket_data->>'status' NOT IN ('resolved', 'closed', 'spam', 'deleted')
  AND created_at < NOW() - INTERVAL '24 hours';
  
  RETURN breach_count;
END;
$$;


--
-- Name: update_sla_on_interaction(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_sla_on_interaction() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  is_first_admin_response BOOLEAN := FALSE;
BEGIN
  -- Check if this is the first admin response
  IF NEW.interaction_type = 'reply' THEN
    SELECT NOT EXISTS (
      SELECT 1 FROM support_interactions si
      JOIN user_roles ur ON si.user_id = ur.user_id
      WHERE si.support_id = NEW.support_id
      AND si.interaction_type = 'reply'
      AND ur.role IN ('admin', 'moderator')
      AND si.id != NEW.id
    ) INTO is_first_admin_response
    FROM user_roles ur2
    WHERE ur2.user_id = NEW.user_id AND ur2.role IN ('admin', 'moderator');
    
    -- Update first_response_at if this is the first admin response
    IF is_first_admin_response THEN
      UPDATE support_system
      SET first_response_at = NEW.created_at
      WHERE id = NEW.support_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: update_storage_fees_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_storage_fees_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_support_ticket_status(uuid, text, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_support_ticket_status(p_support_id uuid, p_new_status text, p_user_id uuid, p_reason text DEFAULT NULL::text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_current_ticket_data JSONB;
    v_updated_ticket_data JSONB;
BEGIN
    -- Validate status
    IF p_new_status NOT IN ('open', 'in_progress', 'pending', 'resolved', 'closed') THEN
        RAISE EXCEPTION 'Invalid status: %', p_new_status;
    END IF;

    -- Get current ticket data
    SELECT ticket_data INTO v_current_ticket_data
    FROM support_system
    WHERE id = p_support_id AND system_type = 'ticket';

    IF v_current_ticket_data IS NULL THEN
        RAISE EXCEPTION 'Ticket not found: %', p_support_id;
    END IF;

    -- Update ticket data with new status
    v_updated_ticket_data := jsonb_set(
        v_current_ticket_data,
        '{status}',
        to_jsonb(p_new_status)
    );

    -- Add status change metadata
    v_updated_ticket_data := jsonb_set(
        v_updated_ticket_data,
        '{metadata,last_status_change}',
        to_jsonb(NOW())
    );

    -- Update the ticket
    UPDATE support_system
    SET 
        ticket_data = v_updated_ticket_data,
        updated_at = NOW()
    WHERE id = p_support_id;

    -- Log status change interaction with correct field names for constraint
    INSERT INTO support_interactions (
        support_id,
        user_id,
        interaction_type,
        content,
        metadata,
        is_internal,
        created_at
    ) VALUES (
        p_support_id,
        p_user_id,
        'status_change',
        jsonb_build_object(
            'from_status', v_current_ticket_data->>'status',
            'to_status', p_new_status,
            'reason', COALESCE(p_reason, 'Status updated')
        ),
        jsonb_build_object(
            'auto_generated', false,
            'changed_by', p_user_id
        ),
        true,
        NOW()
    );

    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to update ticket status: %', SQLERRM;
END;
$$;


--
-- Name: update_support_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_support_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


--
-- Name: update_tag_usage_count(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: update_ticket_sla_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_ticket_sla_status() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  sla_metrics RECORD;
BEGIN
  -- Calculate current SLA metrics for this ticket
  SELECT * INTO sla_metrics
  FROM calculate_ticket_sla_metrics(NEW.id)
  LIMIT 1;
  
  -- Update the ticket with calculated SLA data
  UPDATE support_system
  SET 
    first_response_time_minutes = sla_metrics.first_response_time_minutes,
    resolution_time_minutes = sla_metrics.resolution_time_minutes,
    sla_status = sla_metrics.sla_status,
    updated_at = NOW()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;


--
-- Name: update_tier_usage_analytics(uuid, numeric, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_tier_usage_analytics(tier_id uuid, order_value numeric, discount_amount numeric) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE discount_tiers 
  SET 
    usage_count = COALESCE(usage_count, 0) + 1,
    total_savings = COALESCE(total_savings, 0) + discount_amount,
    avg_order_value = (
      CASE 
        WHEN usage_count = 0 THEN order_value
        ELSE (COALESCE(avg_order_value, 0) * COALESCE(usage_count, 0) + order_value) / (COALESCE(usage_count, 0) + 1)
      END
    ),
    last_used_at = NOW()
  WHERE id = tier_id;
END;
$$;


--
-- Name: update_unread_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_unread_status() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Only trigger for customer replies (non-admin users)
  IF NEW.interaction_type = 'reply' AND NEW.is_internal = FALSE THEN
    -- Check if this is a customer reply (user_id is not in admin/moderator roles)
    IF NOT EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = NEW.user_id 
      AND ur.role IN ('admin', 'moderator')
    ) THEN
      -- Mark ticket as having unread replies
      UPDATE support_system
      SET 
        has_unread_replies = TRUE,
        updated_at = NOW()
      WHERE id = NEW.support_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: validate_address_format(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_address_format() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Trim all text fields
  NEW.recipient_name = TRIM(NEW.recipient_name);
  NEW.address_line1 = TRIM(NEW.address_line1);
  NEW.address_line2 = NULLIF(TRIM(NEW.address_line2), '');
  NEW.city = TRIM(NEW.city);
  NEW.state_province_region = TRIM(NEW.state_province_region);
  NEW.postal_code = TRIM(NEW.postal_code);
  NEW.phone = TRIM(NEW.phone);
  NEW.company_name = NULLIF(TRIM(NEW.company_name), '');
  NEW.address_label = NULLIF(TRIM(NEW.address_label), '');
  
  -- Basic validation
  IF LENGTH(NEW.recipient_name) < 2 THEN
    RAISE EXCEPTION 'Recipient name must be at least 2 characters';
  END IF;
  
  IF LENGTH(NEW.address_line1) < 5 THEN
    RAISE EXCEPTION 'Address must be at least 5 characters';
  END IF;
  
  IF LENGTH(NEW.city) < 2 THEN
    RAISE EXCEPTION 'City must be at least 2 characters';
  END IF;
  
  IF LENGTH(NEW.postal_code) < 3 THEN
    RAISE EXCEPTION 'Postal code must be at least 3 characters';
  END IF;
  
  -- Set updated_at
  NEW.updated_at = NOW();
  
  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION validate_address_format(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.validate_address_format() IS 'Validate and clean address data before saving';


--
-- Name: validate_country_discount_code(text, text, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_country_discount_code(p_discount_code text, p_customer_country text, p_order_total numeric DEFAULT 0) RETURNS TABLE(is_valid boolean, discount_code_id uuid, discount_type_id uuid, country_rule_id uuid, error_message text, discount_details jsonb)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_code_record RECORD;
  v_country_rule RECORD;
BEGIN
  -- Check if discount code exists and is active
  SELECT dc.*, dt.* INTO v_code_record
  FROM discount_codes dc
  JOIN discount_types dt ON dc.discount_type_id = dt.id
  WHERE dc.code = UPPER(p_discount_code)
    AND dc.is_active = true
    AND dt.is_active = true
    AND (dc.valid_from IS NULL OR dc.valid_from <= NOW())
    AND (dc.valid_until IS NULL OR dc.valid_until >= NOW());
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, NULL::UUID, 'Invalid or expired discount code', NULL::JSONB;
    RETURN;
  END IF;
  
  -- Check if there's a country rule for this discount type and country
  SELECT cdr.* INTO v_country_rule
  FROM country_discount_rules cdr
  WHERE cdr.discount_type_id = v_code_record.discount_type_id
    AND cdr.country_code = p_customer_country
    AND cdr.requires_code = true
    AND (cdr.min_order_amount IS NULL OR p_order_total >= cdr.min_order_amount);
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, v_code_record.id, v_code_record.discount_type_id, NULL::UUID, 
      FORMAT('This discount code is not valid for %s or minimum order requirements not met', p_customer_country), 
      NULL::JSONB;
    RETURN;
  END IF;
  
  -- Valid! Return success with details
  RETURN QUERY SELECT 
    true,
    v_code_record.id,
    v_code_record.discount_type_id,
    v_country_rule.id,
    NULL::TEXT,
    jsonb_build_object(
      'component_discounts', v_country_rule.component_discounts,
      'description', v_country_rule.description,
      'max_discount', v_code_record.conditions->>'max_discount',
      'priority', v_country_rule.priority
    );
END;
$$;


--
-- Name: FUNCTION validate_country_discount_code(p_discount_code text, p_customer_country text, p_order_total numeric); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.validate_country_discount_code(p_discount_code text, p_customer_country text, p_order_total numeric) IS 'Validates if a discount code is eligible for the given country and order';


--
-- Name: validate_delivery_options(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: validate_discount_stacking(text[], uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_discount_stacking(discount_codes text[], customer_id uuid DEFAULT NULL::uuid) RETURNS TABLE(is_valid boolean, error_message text, total_discount_percentage numeric, stacked_count integer, allowed_combination boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_stacking_rules record;
  v_discount_types text[];
  v_total_percentage numeric := 0;
  v_stack_count integer := 0;
  v_is_valid boolean := true;
  v_error_message text := NULL;
  v_allowed boolean := true;
BEGIN
  -- Get active stacking rules
  SELECT * INTO v_stacking_rules
  FROM discount_stacking_rules
  WHERE is_active = true
  LIMIT 1;
  
  -- If no stacking rules, allow all combinations
  IF v_stacking_rules IS NULL THEN
    RETURN QUERY SELECT true, NULL::text, 0::numeric, array_length(discount_codes, 1), true;
    RETURN;
  END IF;
  
  -- Get discount types and calculate total percentage
  SELECT 
    array_agg(DISTINCT dt.type),
    SUM(dt.value)
  INTO v_discount_types, v_total_percentage
  FROM discount_codes dc
  JOIN discount_types dt ON dc.discount_type_id = dt.id
  WHERE dc.code = ANY(discount_codes)
    AND dc.is_active = true;
  
  v_stack_count := array_length(discount_codes, 1);
  
  -- Check stack count limit
  IF v_stack_count > v_stacking_rules.max_stack_count THEN
    v_is_valid := false;
    v_error_message := format('Cannot stack more than %s discounts', v_stacking_rules.max_stack_count);
  END IF;
  
  -- Check total discount percentage limit
  IF v_total_percentage > v_stacking_rules.max_total_discount_percentage THEN
    v_is_valid := false;
    v_error_message := format('Total discount cannot exceed %s%%', v_stacking_rules.max_total_discount_percentage);
  END IF;
  
  -- Check allowed combinations
  IF v_stacking_rules.allowed_combinations IS NOT NULL THEN
    v_allowed := v_discount_types <@ v_stacking_rules.allowed_combinations;
    IF NOT v_allowed THEN
      v_is_valid := false;
      v_error_message := 'This combination of discount types is not allowed';
    END IF;
  END IF;
  
  RETURN QUERY SELECT v_is_valid, v_error_message, v_total_percentage, v_stack_count, v_allowed;
END;
$$;


--
-- Name: FUNCTION validate_discount_stacking(discount_codes text[], customer_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.validate_discount_stacking(discount_codes text[], customer_id uuid) IS 'Validates if a combination of discount codes can be stacked according to system rules';


--
-- Name: validate_quotes_unified(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: verify_mfa_login(text, boolean); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: verify_mfa_setup(text); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: verify_quote_email(text); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: verify_totp_code(uuid, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verify_totp_code(p_user_id uuid, p_code text, p_window integer DEFAULT 1) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    -- For development, always return true for 6-digit codes
    RETURN verify_totp_code_dev(p_user_id, p_code, p_window);
END;
$$;


--
-- Name: verify_totp_code_dev(uuid, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verify_totp_code_dev(p_user_id uuid, p_code text, p_window integer DEFAULT 1) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $_$
BEGIN
    -- In development, accept any 6-digit code
    RETURN (LENGTH(p_code) = 6 AND p_code ~ '^[0-9]+$');
END;
$_$;


--
-- Name: verify_totp_setup(text); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: verify_usd_to_origin_migration(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verify_usd_to_origin_migration() RETURNS TABLE(table_name text, total_quotes integer, quotes_with_usd_fields integer, quotes_with_origin_fields integer, migration_success boolean)
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Check quotes table
  RETURN QUERY
  SELECT 
    'quotes'::TEXT,
    COUNT(*)::INTEGER as total_quotes,
    COUNT(CASE WHEN EXISTS (
      SELECT 1 FROM jsonb_array_elements(items) AS item 
      WHERE item ? 'unit_price_usd'
    ) THEN 1 END)::INTEGER as quotes_with_usd_fields,
    COUNT(CASE WHEN EXISTS (
      SELECT 1 FROM jsonb_array_elements(items) AS item 
      WHERE item ? 'unit_price_origin'
    ) THEN 1 END)::INTEGER as quotes_with_origin_fields,
    COUNT(CASE WHEN EXISTS (
      SELECT 1 FROM jsonb_array_elements(items) AS item 
      WHERE item ? 'unit_price_usd'
    ) THEN 1 END) = 0 as migration_success
  FROM quotes;
  
  -- Check quotes_v2 table if it exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotes_v2') THEN
    RETURN QUERY
    SELECT 
      'quotes_v2'::TEXT,
      COUNT(*)::INTEGER as total_quotes,
      COUNT(CASE WHEN EXISTS (
        SELECT 1 FROM jsonb_array_elements(items) AS item 
        WHERE item ? 'unit_price_usd'
      ) THEN 1 END)::INTEGER as quotes_with_usd_fields,
      COUNT(CASE WHEN EXISTS (
        SELECT 1 FROM jsonb_array_elements(items) AS item 
        WHERE item ? 'unit_price_origin'
      ) THEN 1 END)::INTEGER as quotes_with_origin_fields,
      COUNT(CASE WHEN EXISTS (
        SELECT 1 FROM jsonb_array_elements(items) AS item 
        WHERE item ? 'unit_price_usd'
      ) THEN 1 END) = 0 as migration_success
    FROM quotes_v2;
  END IF;

END;
$$;


--
-- Name: waive_storage_fees(uuid, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.waive_storage_fees(p_package_id uuid, p_reason text, p_admin_id uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_waived_count INTEGER;
BEGIN
  UPDATE storage_fees
  SET 
    is_paid = true,
    payment_date = NOW(),
    notes = COALESCE(notes || E'\n', '') || format('Waived by admin %s: %s', p_admin_id, p_reason)
  WHERE package_id = p_package_id
    AND is_paid = false;
  
  GET DIAGNOSTICS v_waived_count = ROW_COUNT;
  
  RETURN v_waived_count;
END;
$$;


--
-- Name: abuse_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.abuse_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id text NOT NULL,
    customer_id uuid,
    ip_address inet,
    user_agent text,
    abuse_type text NOT NULL,
    severity text NOT NULL,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    detected_at timestamp with time zone DEFAULT now(),
    response_action text NOT NULL,
    block_duration integer,
    resolved boolean DEFAULT false,
    resolved_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT abuse_attempts_abuse_type_check CHECK ((abuse_type = ANY (ARRAY['rapid_attempts'::text, 'invalid_codes_spam'::text, 'account_farming'::text, 'bot_detected'::text, 'geographic_fraud'::text, 'code_sharing'::text]))),
    CONSTRAINT abuse_attempts_response_action_check CHECK ((response_action = ANY (ARRAY['log_only'::text, 'rate_limit'::text, 'captcha_required'::text, 'temporary_block'::text, 'permanent_block'::text]))),
    CONSTRAINT abuse_attempts_severity_check CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])))
);


--
-- Name: TABLE abuse_attempts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.abuse_attempts IS 'Tracks all discount abuse attempts detected by the system';


--
-- Name: abuse_patterns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.abuse_patterns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pattern_type text NOT NULL,
    threshold integer NOT NULL,
    time_window_minutes integer NOT NULL,
    response_action text NOT NULL,
    enabled boolean DEFAULT true,
    description text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE abuse_patterns; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.abuse_patterns IS 'Configuration for abuse detection patterns and thresholds';


--
-- Name: abuse_responses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.abuse_responses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    abuse_attempt_id uuid,
    action_type text NOT NULL,
    duration_minutes integer,
    escalation_level text NOT NULL,
    automated boolean DEFAULT true,
    applied_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    reason text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT abuse_responses_action_type_check CHECK ((action_type = ANY (ARRAY['log_only'::text, 'rate_limit'::text, 'captcha_required'::text, 'temporary_block'::text, 'permanent_block'::text, 'ip_block'::text]))),
    CONSTRAINT abuse_responses_escalation_level_check CHECK ((escalation_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])))
);


--
-- Name: TABLE abuse_responses; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.abuse_responses IS 'Logs automated responses to abuse attempts';


--
-- Name: active_blocks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.active_blocks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    target_type text NOT NULL,
    target_value text NOT NULL,
    block_type text NOT NULL,
    reason text NOT NULL,
    applied_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    applied_by text DEFAULT 'system'::text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT active_blocks_block_type_check CHECK ((block_type = ANY (ARRAY['rate_limit'::text, 'captcha_required'::text, 'temporary_block'::text, 'permanent_block'::text]))),
    CONSTRAINT active_blocks_target_type_check CHECK ((target_type = ANY (ARRAY['session'::text, 'ip'::text, 'customer'::text])))
);


--
-- Name: TABLE active_blocks; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.active_blocks IS 'Maintains currently active blocks (sessions, IPs, customers)';


--
-- Name: quotes_v2; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quotes_v2 (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid,
    customer_email text NOT NULL,
    customer_name text,
    customer_phone text,
    quote_number text,
    status text DEFAULT 'draft'::text NOT NULL,
    created_by uuid,
    origin_country character(2) NOT NULL,
    destination_country character(2) NOT NULL,
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    shipping_method text,
    insurance_required boolean DEFAULT true,
    calculation_data jsonb,
    customer_currency character(3) DEFAULT 'USD'::bpchar,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    calculated_at timestamp with time zone,
    approved_at timestamp with time zone,
    admin_notes text,
    customer_notes text,
    validity_days integer DEFAULT 7,
    expires_at timestamp with time zone,
    sent_at timestamp with time zone,
    viewed_at timestamp with time zone,
    reminder_count integer DEFAULT 0,
    last_reminder_at timestamp with time zone,
    share_token text,
    customer_message text,
    email_sent boolean DEFAULT false,
    sms_sent boolean DEFAULT false,
    whatsapp_sent boolean DEFAULT false,
    preferred_contact text DEFAULT 'email'::text,
    version integer DEFAULT 1,
    parent_quote_id uuid,
    revision_reason text,
    changes_summary text,
    payment_terms text DEFAULT 'Full payment on order'::text,
    approval_required boolean DEFAULT false,
    approved_by uuid,
    max_discount_percentage numeric(5,2) DEFAULT 20.00,
    minimum_order_value numeric(10,2),
    converted_to_order_id uuid,
    original_quote_id uuid,
    external_reference text,
    source text DEFAULT 'calculator_v2'::text,
    ip_address inet,
    user_agent text,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    is_latest_version boolean DEFAULT true,
    approval_required_above numeric(10,2),
    max_discount_allowed numeric(5,2),
    api_version text,
    has_documents boolean DEFAULT false,
    discount_codes text[],
    applied_discounts jsonb,
    delivery_address_id uuid,
    selected_shipping_option_id text,
    applied_discount_codes jsonb DEFAULT '[]'::jsonb,
    discount_amounts jsonb DEFAULT '{}'::jsonb,
    options_last_updated_by text,
    options_last_updated_at timestamp with time zone,
    insurance_coverage_amount numeric(12,2) DEFAULT 0,
    insurance_rate_percentage numeric(5,2) DEFAULT 1.5,
    total_origin_currency numeric(10,2),
    costprice_total_origin numeric(10,2),
    final_total_origin numeric(10,2),
    in_cart boolean DEFAULT false,
    total_quote_origincurrency numeric(10,2),
    final_total_origincurrency numeric(10,2),
    CONSTRAINT check_costprice_total_origin_positive CHECK (((costprice_total_origin IS NULL) OR (costprice_total_origin >= (0)::numeric))),
    CONSTRAINT check_final_total_origin_positive CHECK (((final_total_origin IS NULL) OR (final_total_origin >= (0)::numeric))),
    CONSTRAINT check_final_total_origincurrency_positive CHECK (((final_total_origincurrency IS NULL) OR (final_total_origincurrency >= (0)::numeric))),
    CONSTRAINT check_total_origin_currency_positive CHECK (((total_origin_currency IS NULL) OR (total_origin_currency >= (0)::numeric))),
    CONSTRAINT check_total_quote_origincurrency_positive CHECK (((total_quote_origincurrency IS NULL) OR (total_quote_origincurrency >= (0)::numeric))),
    CONSTRAINT quotes_unified_valid_status CHECK ((status = ANY (ARRAY['draft'::text, 'calculated'::text, 'pending'::text, 'sent'::text, 'approved'::text, 'rejected'::text, 'expired'::text, 'paid'::text, 'ordered'::text, 'shipped'::text, 'completed'::text, 'cancelled'::text])))
);


--
-- Name: TABLE quotes_v2; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.quotes_v2 IS 'Enhanced with quote review request system allowing customers to request changes with detailed feedback';


--
-- Name: COLUMN quotes_v2.customer_currency; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.quotes_v2.customer_currency IS 'DEPRECATED: Use user profile preferred_display_currency instead. This field is kept for reference only. Applications should convert from total_quote_origincurrency to user''s preferred currency in real-time using CurrencyService.';


--
-- Name: COLUMN quotes_v2.validity_days; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.quotes_v2.validity_days IS 'Number of days the quote is valid for';


--
-- Name: COLUMN quotes_v2.expires_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.quotes_v2.expires_at IS 'Calculated expiry date based on validity_days';


--
-- Name: COLUMN quotes_v2.share_token; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.quotes_v2.share_token IS 'Unique token for public quote sharing';


--
-- Name: COLUMN quotes_v2.version; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.quotes_v2.version IS 'Quote version number for tracking revisions';


--
-- Name: COLUMN quotes_v2.parent_quote_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.quotes_v2.parent_quote_id IS 'Reference to original quote if this is a revision';


--
-- Name: COLUMN quotes_v2.discount_codes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.quotes_v2.discount_codes IS 'Array of discount codes applied to this quote';


--
-- Name: COLUMN quotes_v2.applied_discounts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.quotes_v2.applied_discounts IS 'Detailed information about applied discounts including amounts and components';


--
-- Name: COLUMN quotes_v2.delivery_address_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.quotes_v2.delivery_address_id IS 'References the delivery address selected by the customer during quote creation';


--
-- Name: COLUMN quotes_v2.selected_shipping_option_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.quotes_v2.selected_shipping_option_id IS 'ID of selected shipping option from delivery_options';


--
-- Name: COLUMN quotes_v2.applied_discount_codes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.quotes_v2.applied_discount_codes IS 'Array of applied discount codes ["FIRST10", "SAVE15"]';


--
-- Name: COLUMN quotes_v2.discount_amounts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.quotes_v2.discount_amounts IS 'Discount amounts by code {"FIRST10": 25.50, "SAVE15": 45.00}';


--
-- Name: COLUMN quotes_v2.options_last_updated_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.quotes_v2.options_last_updated_by IS 'User ID who last updated quote options';


--
-- Name: COLUMN quotes_v2.options_last_updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.quotes_v2.options_last_updated_at IS 'Timestamp of last option update';


--
-- Name: COLUMN quotes_v2.insurance_coverage_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.quotes_v2.insurance_coverage_amount IS 'Total coverage amount for insurance';


--
-- Name: COLUMN quotes_v2.insurance_rate_percentage; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.quotes_v2.insurance_rate_percentage IS 'Insurance rate percentage (1.5 = 1.5%)';


--
-- Name: COLUMN quotes_v2.total_quote_origincurrency; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.quotes_v2.total_quote_origincurrency IS 'Total quote amount in origin country currency (e.g., INR for IN origin, USD for US origin)';


--
-- Name: COLUMN quotes_v2.final_total_origincurrency; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.quotes_v2.final_total_origincurrency IS 'Final total amount after adjustments in origin country currency';


--
-- Name: active_quotes; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.active_quotes AS
 SELECT id,
    customer_id,
    customer_email,
    customer_name,
    customer_phone,
    quote_number,
    status,
    created_by,
    origin_country,
    destination_country,
    items,
    shipping_method,
    insurance_required,
    calculation_data,
    total_quote_origincurrency,
    customer_currency,
    created_at,
    updated_at,
    calculated_at,
    approved_at,
    admin_notes,
    customer_notes,
    validity_days,
    expires_at,
    sent_at,
    viewed_at,
    reminder_count,
    last_reminder_at,
    share_token,
    customer_message,
    email_sent,
    sms_sent,
    whatsapp_sent,
    preferred_contact,
    version,
    parent_quote_id,
    revision_reason,
    changes_summary,
    payment_terms,
    approval_required,
    approved_by,
    max_discount_percentage,
    minimum_order_value,
    converted_to_order_id,
    original_quote_id,
    external_reference,
    source,
    ip_address,
    user_agent,
    utm_source,
    utm_medium,
    utm_campaign,
    is_latest_version,
    approval_required_above,
    max_discount_allowed,
    api_version,
    (NOT public.is_quote_expired(id)) AS is_active,
        CASE
            WHEN (expires_at IS NULL) THEN NULL::interval
            ELSE (expires_at - now())
        END AS time_remaining
   FROM public.quotes_v2 q
  WHERE (is_latest_version = true);


--
-- Name: VIEW active_quotes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.active_quotes IS 'Active quotes with simplified currency (origin only) - updated 2025-08-08';


--
-- Name: addon_services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.addon_services (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    service_key text NOT NULL,
    service_name text NOT NULL,
    service_description text,
    service_category text DEFAULT 'protection'::text NOT NULL,
    pricing_type text DEFAULT 'percentage'::text NOT NULL,
    default_rate numeric(10,4) DEFAULT 0 NOT NULL,
    min_amount numeric(10,2) DEFAULT 0,
    max_amount numeric(10,2),
    is_active boolean DEFAULT true NOT NULL,
    is_default_enabled boolean DEFAULT false,
    requires_order_value boolean DEFAULT true,
    supported_order_types text[] DEFAULT ARRAY['quote'::text, 'order'::text],
    display_order integer DEFAULT 0,
    icon_name text,
    badge_text text,
    business_rules jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE addon_services; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.addon_services IS 'Master table for add-on services - 5 core services: package protection, express processing, priority support, gift wrapping, photo documentation';


--
-- Name: admin_overrides; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: blog_categories; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: blog_comments; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: blog_post_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blog_post_tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_id uuid NOT NULL,
    tag_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: blog_posts; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: blog_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blog_tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: cart_abandonment_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cart_abandonment_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    session_id text NOT NULL,
    cart_items jsonb NOT NULL,
    cart_value numeric(10,2) NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    abandonment_stage text NOT NULL,
    user_email text,
    user_phone text,
    page_url text,
    user_agent text,
    referrer text,
    country text,
    abandoned_at timestamp with time zone DEFAULT now() NOT NULL,
    last_activity_at timestamp with time zone DEFAULT now() NOT NULL,
    is_recovered boolean DEFAULT false,
    recovered_at timestamp with time zone,
    recovery_method text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT cart_abandonment_events_abandonment_stage_check CHECK ((abandonment_stage = ANY (ARRAY['cart'::text, 'checkout'::text, 'payment'::text])))
);


--
-- Name: cart_recovery_analytics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cart_recovery_analytics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    date date NOT NULL,
    total_abandonments integer DEFAULT 0,
    cart_stage_abandonments integer DEFAULT 0,
    checkout_stage_abandonments integer DEFAULT 0,
    payment_stage_abandonments integer DEFAULT 0,
    total_recovery_attempts integer DEFAULT 0,
    email_attempts integer DEFAULT 0,
    notification_attempts integer DEFAULT 0,
    total_recoveries integer DEFAULT 0,
    email_recoveries integer DEFAULT 0,
    notification_recoveries integer DEFAULT 0,
    organic_recoveries integer DEFAULT 0,
    abandoned_value numeric(12,2) DEFAULT 0,
    recovered_value numeric(12,2) DEFAULT 0,
    recovery_rate numeric(5,2) DEFAULT 0,
    country text,
    user_type text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT cart_recovery_analytics_user_type_check CHECK ((user_type = ANY (ARRAY['new'::text, 'returning'::text, 'guest'::text])))
);


--
-- Name: cart_recovery_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cart_recovery_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    abandonment_event_id uuid,
    attempt_type text NOT NULL,
    sequence_number integer DEFAULT 1 NOT NULL,
    subject_line text,
    template_id text,
    incentive_offered text,
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    delivered_at timestamp with time zone,
    opened_at timestamp with time zone,
    clicked_at timestamp with time zone,
    user_returned boolean DEFAULT false,
    returned_at timestamp with time zone,
    conversion_achieved boolean DEFAULT false,
    converted_at timestamp with time zone,
    variant_group text DEFAULT 'control'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT cart_recovery_attempts_attempt_type_check CHECK ((attempt_type = ANY (ARRAY['email'::text, 'push_notification'::text, 'sms'::text])))
);


--
-- Name: checkout_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.checkout_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_token text NOT NULL,
    user_id uuid,
    quote_ids text[] NOT NULL,
    temporary_shipping_address jsonb,
    payment_currency text NOT NULL,
    payment_method text NOT NULL,
    payment_amount numeric(10,2) NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    is_guest boolean DEFAULT false,
    guest_email text,
    guest_phone text,
    guest_name text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE checkout_sessions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.checkout_sessions IS 'Unified checkout sessions for authenticated and guest users';


--
-- Name: COLUMN checkout_sessions.is_guest; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.checkout_sessions.is_guest IS 'True for guest checkouts';


--
-- Name: consolidation_groups; Type: TABLE; Schema: public; Owner: -
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
    shipping_carrier text,
    shipping_tracking_number text,
    shipped_date timestamp with time zone,
    delivered_date timestamp with time zone,
    CONSTRAINT consolidation_groups_shipping_carrier_check CHECK ((shipping_carrier = ANY (ARRAY['ups'::text, 'fedex'::text, 'usps'::text, 'dhl'::text, 'other'::text]))),
    CONSTRAINT consolidation_groups_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'consolidated'::text, 'shipped'::text, 'delivered'::text])))
);


--
-- Name: COLUMN consolidation_groups.shipping_carrier; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.consolidation_groups.shipping_carrier IS 'Carrier used for final shipment (ups, fedex, usps, dhl, other)';


--
-- Name: COLUMN consolidation_groups.shipping_tracking_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.consolidation_groups.shipping_tracking_number IS 'Tracking number for the consolidated package shipment';


--
-- Name: COLUMN consolidation_groups.shipped_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.consolidation_groups.shipped_date IS 'Date when the consolidated package was shipped';


--
-- Name: COLUMN consolidation_groups.delivered_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.consolidation_groups.delivered_date IS 'Date when the consolidated package was delivered to customer';


--
-- Name: continental_pricing; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.continental_pricing (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    service_id uuid NOT NULL,
    continent text NOT NULL,
    rate numeric(10,4) NOT NULL,
    min_amount numeric(10,2) DEFAULT 0,
    max_amount numeric(10,2),
    currency_code text DEFAULT 'USD'::text,
    notes text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT check_continent_name CHECK ((continent = ANY (ARRAY['Africa'::text, 'Antarctica'::text, 'Asia'::text, 'Europe'::text, 'North America'::text, 'Oceania'::text, 'South America'::text])))
);


--
-- Name: TABLE continental_pricing; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.continental_pricing IS 'Continental-level pricing for 6 continents with market-based rates';


--
-- Name: country_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.country_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    country_code character varying(2) NOT NULL,
    country_name character varying(100) NOT NULL,
    classification_system character varying(20) NOT NULL,
    classification_digits integer DEFAULT 4 NOT NULL,
    default_customs_rate numeric(5,2) DEFAULT 10.00 NOT NULL,
    default_local_tax_rate numeric(5,2) DEFAULT 15.00 NOT NULL,
    local_tax_name character varying(50) DEFAULT 'VAT'::character varying NOT NULL,
    enable_weight_estimation boolean DEFAULT true,
    enable_category_suggestions boolean DEFAULT true,
    enable_customs_valuation_override boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    CONSTRAINT valid_classification_system CHECK (((classification_system)::text = ANY ((ARRAY['HSN'::character varying, 'HS'::character varying, 'HTS'::character varying])::text[]))),
    CONSTRAINT valid_digits CHECK (((classification_digits >= 4) AND (classification_digits <= 12))),
    CONSTRAINT valid_rates CHECK (((default_customs_rate >= (0)::numeric) AND (default_local_tax_rate >= (0)::numeric)))
);


--
-- Name: country_discount_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.country_discount_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    discount_type_id uuid,
    country_code text NOT NULL,
    component_discounts jsonb DEFAULT '{}'::jsonb,
    min_order_amount numeric(10,2),
    max_uses_per_customer integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    requires_code boolean DEFAULT false,
    auto_apply boolean DEFAULT true,
    description text,
    priority integer DEFAULT 100,
    discount_conditions jsonb DEFAULT '{}'::jsonb
);


--
-- Name: COLUMN country_discount_rules.requires_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.country_discount_rules.requires_code IS 'If true, discount only applies when matching code is used';


--
-- Name: COLUMN country_discount_rules.auto_apply; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.country_discount_rules.auto_apply IS 'If true, discount applies automatically for eligible customers';


--
-- Name: COLUMN country_discount_rules.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.country_discount_rules.description IS 'Human-readable description of the discount rule';


--
-- Name: COLUMN country_discount_rules.priority; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.country_discount_rules.priority IS 'Priority for discount application (higher = applied first)';


--
-- Name: COLUMN country_discount_rules.discount_conditions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.country_discount_rules.discount_conditions IS 'Additional conditions like min_items, customer_type, etc.';


--
-- Name: country_payment_preferences; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: TABLE country_payment_preferences; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.country_payment_preferences IS 'Country-specific payment gateway preferences and priorities';


--
-- Name: country_pricing_overrides; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.country_pricing_overrides (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    service_id uuid NOT NULL,
    country_code text NOT NULL,
    rate numeric(10,4) NOT NULL,
    min_amount numeric(10,2) DEFAULT 0,
    max_amount numeric(10,2),
    currency_code text DEFAULT 'USD'::text,
    reason text,
    notes text,
    is_active boolean DEFAULT true NOT NULL,
    effective_from timestamp with time zone DEFAULT now(),
    effective_until timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT check_country_code_format CHECK ((country_code ~ '^[A-Z]{2}$'::text))
);


--
-- Name: TABLE country_pricing_overrides; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.country_pricing_overrides IS 'Country-specific pricing overrides for strategic markets (US, IN, JP, etc.)';


--
-- Name: country_settings; Type: TABLE; Schema: public; Owner: -
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
    is_active boolean DEFAULT true,
    auto_tax_calculation boolean DEFAULT false,
    display_name text,
    phone_code text,
    flag_emoji text,
    continent text,
    popular_payment_methods text[] DEFAULT ARRAY[]::text[],
    timezone text,
    date_format text DEFAULT 'MM/DD/YYYY'::text,
    address_format jsonb DEFAULT '{}'::jsonb,
    postal_code_regex text,
    postal_code_example text,
    languages text[] DEFAULT ARRAY[]::text[],
    default_language text DEFAULT 'en'::text,
    domestic_delivery_provider text,
    domestic_urban_rate numeric(10,2),
    domestic_rural_rate numeric(10,2),
    domestic_api_enabled boolean DEFAULT true,
    domestic_fallback_enabled boolean DEFAULT true,
    CONSTRAINT check_continent CHECK ((continent = ANY (ARRAY['Africa'::text, 'Antarctica'::text, 'Asia'::text, 'Europe'::text, 'North America'::text, 'Oceania'::text, 'South America'::text]))),
    CONSTRAINT check_date_format CHECK ((date_format = ANY (ARRAY['MM/DD/YYYY'::text, 'DD/MM/YYYY'::text, 'YYYY-MM-DD'::text, 'DD.MM.YYYY'::text, 'DD-MM-YYYY'::text]))),
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


--
-- Name: TABLE country_settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.country_settings IS 'Country configurations for currency, exchange rates, and payment processing. Exchange rates should be updated regularly.';


--
-- Name: COLUMN country_settings.sales_tax; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.country_settings.sales_tax IS 'Sales tax percentage (0-100 range, e.g., 8 = 8%)';


--
-- Name: COLUMN country_settings.vat; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.country_settings.vat IS 'VAT/GST percentage (0-100 range, e.g., 13 = 13%)';


--
-- Name: COLUMN country_settings.minimum_payment_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.country_settings.minimum_payment_amount IS 'Minimum amount required for payments in this currency';


--
-- Name: COLUMN country_settings.decimal_places; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.country_settings.decimal_places IS 'Number of decimal places to display for this currency';


--
-- Name: COLUMN country_settings.thousand_separator; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.country_settings.thousand_separator IS 'Character used to separate thousands (e.g., comma in 1,000)';


--
-- Name: COLUMN country_settings.decimal_separator; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.country_settings.decimal_separator IS 'Character used for decimal point (e.g., period in 1.50)';


--
-- Name: COLUMN country_settings.symbol_position; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.country_settings.symbol_position IS 'Whether currency symbol appears before or after the amount';


--
-- Name: COLUMN country_settings.symbol_space; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.country_settings.symbol_space IS 'Whether to include space between currency symbol and amount';


--
-- Name: COLUMN country_settings.priority_thresholds; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.country_settings.priority_thresholds IS 'JSON object mapping priority levels (low, normal, urgent) to amount thresholds in the country''s main currency.';


--
-- Name: COLUMN country_settings.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.country_settings.is_active IS 'Whether this country is currently active for operations';


--
-- Name: COLUMN country_settings.auto_tax_calculation; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.country_settings.auto_tax_calculation IS 'Whether to automatically calculate taxes for this country';


--
-- Name: COLUMN country_settings.display_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.country_settings.display_name IS 'Localized display name for the country';


--
-- Name: COLUMN country_settings.phone_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.country_settings.phone_code IS 'International dialing code (e.g., +1 for US)';


--
-- Name: COLUMN country_settings.flag_emoji; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.country_settings.flag_emoji IS 'Country flag emoji for UI display';


--
-- Name: COLUMN country_settings.continent; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.country_settings.continent IS 'Continent for geographical grouping';


--
-- Name: COLUMN country_settings.popular_payment_methods; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.country_settings.popular_payment_methods IS 'Array of commonly used payment methods in this country';


--
-- Name: COLUMN country_settings.timezone; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.country_settings.timezone IS 'Primary timezone of the country';


--
-- Name: COLUMN country_settings.date_format; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.country_settings.date_format IS 'Preferred date format for this country';


--
-- Name: COLUMN country_settings.address_format; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.country_settings.address_format IS 'JSON structure defining address format requirements';


--
-- Name: COLUMN country_settings.postal_code_regex; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.country_settings.postal_code_regex IS 'Regular expression for validating postal codes';


--
-- Name: COLUMN country_settings.postal_code_example; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.country_settings.postal_code_example IS 'Example postal code for user guidance';


--
-- Name: COLUMN country_settings.languages; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.country_settings.languages IS 'Array of languages commonly used in this country';


--
-- Name: COLUMN country_settings.default_language; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.country_settings.default_language IS 'Default language code for this country';


--
-- Name: COLUMN country_settings.domestic_delivery_provider; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.country_settings.domestic_delivery_provider IS 'Provider name (delhivery, ncm, etc.) - uses country currency automatically';


--
-- Name: COLUMN country_settings.domestic_urban_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.country_settings.domestic_urban_rate IS 'Urban delivery rate in local currency';


--
-- Name: COLUMN country_settings.domestic_rural_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.country_settings.domestic_rural_rate IS 'Rural delivery rate in local currency';


--
-- Name: COLUMN country_settings.domestic_api_enabled; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.country_settings.domestic_api_enabled IS 'Whether to use provider API';


--
-- Name: COLUMN country_settings.domestic_fallback_enabled; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.country_settings.domestic_fallback_enabled IS 'Whether fallback rates are available';


--
-- Name: credit_note_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.credit_note_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_delivery_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_delivery_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid,
    customer_id uuid,
    delivery_method text NOT NULL,
    delivery_reason text,
    consolidation_preference text,
    max_wait_days integer DEFAULT 14,
    quality_check_level text DEFAULT 'standard'::text,
    photo_documentation_required boolean DEFAULT false,
    functionality_test_required boolean DEFAULT false,
    priority text DEFAULT 'balanced'::text,
    notification_frequency text DEFAULT 'major_updates'::text,
    preferred_communication text DEFAULT 'email'::text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT customer_delivery_preferences_consolidation_preference_check CHECK ((consolidation_preference = ANY (ARRAY['ship_as_ready'::text, 'wait_for_all'::text, 'partial_groups'::text]))),
    CONSTRAINT customer_delivery_preferences_delivery_method_check CHECK ((delivery_method = ANY (ARRAY['direct_delivery'::text, 'warehouse_consolidation'::text]))),
    CONSTRAINT customer_delivery_preferences_max_wait_days_check CHECK (((max_wait_days > 0) AND (max_wait_days <= 30))),
    CONSTRAINT customer_delivery_preferences_notification_frequency_check CHECK ((notification_frequency = ANY (ARRAY['all_updates'::text, 'major_updates'::text, 'minimal'::text]))),
    CONSTRAINT customer_delivery_preferences_preferred_communication_check CHECK ((preferred_communication = ANY (ARRAY['email'::text, 'sms'::text, 'both'::text]))),
    CONSTRAINT customer_delivery_preferences_priority_check CHECK ((priority = ANY (ARRAY['fastest'::text, 'cheapest'::text, 'balanced'::text, 'quality_first'::text]))),
    CONSTRAINT customer_delivery_preferences_quality_check_level_check CHECK ((quality_check_level = ANY (ARRAY['minimal'::text, 'standard'::text, 'thorough'::text])))
);


--
-- Name: customer_discount_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_discount_usage (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    discount_code_id uuid NOT NULL,
    quote_id uuid,
    used_at timestamp with time zone DEFAULT now(),
    discount_amount numeric(10,2),
    component_breakdown jsonb DEFAULT '{}'::jsonb,
    components_discounted text[] DEFAULT ARRAY['total'::text],
    updated_at timestamp with time zone DEFAULT now(),
    order_id uuid,
    campaign_id uuid,
    original_amount numeric(10,2) DEFAULT 0,
    currency text DEFAULT 'USD'::text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: COLUMN customer_discount_usage.component_breakdown; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_discount_usage.component_breakdown IS 'Breakdown of discount amounts by component: {"shipping": 10.50, "customs": 25.00, "handling": 5.00}';


--
-- Name: COLUMN customer_discount_usage.components_discounted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_discount_usage.components_discounted IS 'Array of components that received discounts';


--
-- Name: COLUMN customer_discount_usage.order_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_discount_usage.order_id IS 'Reference to future order when quote becomes an order (nullable during quote stage)';


--
-- Name: COLUMN customer_discount_usage.campaign_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_discount_usage.campaign_id IS 'Reference to discount campaign (if applicable)';


--
-- Name: COLUMN customer_discount_usage.original_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_discount_usage.original_amount IS 'Original amount before discount was applied';


--
-- Name: COLUMN customer_discount_usage.currency; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_discount_usage.currency IS 'Currency code for the discount amounts';


--
-- Name: COLUMN customer_discount_usage.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_discount_usage.created_at IS 'When the discount usage record was created';


--
-- Name: customer_memberships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_memberships (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    customer_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    started_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    auto_renew boolean DEFAULT true,
    payment_method text,
    last_payment_id text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT customer_memberships_status_check CHECK ((status = ANY (ARRAY['active'::text, 'cancelled'::text, 'expired'::text, 'paused'::text])))
);


--
-- Name: customer_satisfaction_surveys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_satisfaction_surveys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    rating integer NOT NULL,
    feedback text,
    experience_rating integer NOT NULL,
    response_time_rating integer NOT NULL,
    resolution_rating integer NOT NULL,
    would_recommend boolean DEFAULT false NOT NULL,
    additional_comments text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT customer_satisfaction_surveys_experience_rating_check CHECK (((experience_rating >= 1) AND (experience_rating <= 5))),
    CONSTRAINT customer_satisfaction_surveys_rating_check CHECK (((rating >= 1) AND (rating <= 5))),
    CONSTRAINT customer_satisfaction_surveys_resolution_rating_check CHECK (((resolution_rating >= 1) AND (resolution_rating <= 5))),
    CONSTRAINT customer_satisfaction_surveys_response_time_rating_check CHECK (((response_time_rating >= 1) AND (response_time_rating <= 5)))
);


--
-- Name: customs_rules; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: COLUMN customs_rules.origin_country; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customs_rules.origin_country IS 'Origin country for route-specific customs rules (e.g., IN for India→US route)';


--
-- Name: COLUMN customs_rules.destination_country; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customs_rules.destination_country IS 'Destination country for route-specific customs rules (e.g., US for India→US route)';


--
-- Name: customs_valuation_overrides; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customs_valuation_overrides (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_id uuid,
    order_id uuid,
    product_classification_id uuid,
    original_method character varying(20) NOT NULL,
    override_method character varying(20) NOT NULL,
    original_value_usd numeric(10,2) NOT NULL,
    override_value_usd numeric(10,2) NOT NULL,
    override_reason text NOT NULL,
    justification_documents jsonb,
    approved_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid NOT NULL,
    product_name character varying(255),
    classification_code character varying(20),
    country_code character varying(2),
    product_price_usd numeric(10,2),
    minimum_valuation_usd numeric(10,2),
    chosen_valuation_usd numeric(10,2),
    valuation_method character varying(20),
    is_automatic boolean DEFAULT false,
    customs_rate_used numeric(5,2),
    customs_duty_saved_usd numeric(10,2),
    CONSTRAINT different_methods CHECK (((original_method)::text <> (override_method)::text)),
    CONSTRAINT positive_values CHECK (((original_value_usd > (0)::numeric) AND (override_value_usd > (0)::numeric))),
    CONSTRAINT quote_or_order_required CHECK (((quote_id IS NOT NULL) OR (order_id IS NOT NULL))),
    CONSTRAINT valid_valuation_methods CHECK ((((original_method)::text = ANY ((ARRAY['product_price'::character varying, 'minimum_valuation'::character varying])::text[])) AND ((override_method)::text = ANY ((ARRAY['product_price'::character varying, 'minimum_valuation'::character varying])::text[]))))
);


--
-- Name: delivery_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_id uuid NOT NULL,
    provider_code text NOT NULL,
    provider_order_id text,
    tracking_number text,
    status text DEFAULT 'pending'::text NOT NULL,
    events jsonb DEFAULT '[]'::jsonb,
    from_address jsonb NOT NULL,
    to_address jsonb NOT NULL,
    shipment_data jsonb NOT NULL,
    provider_response jsonb,
    estimated_delivery timestamp with time zone,
    actual_delivery timestamp with time zone,
    proof jsonb,
    delivery_charge numeric(10,2),
    cod_amount numeric(10,2),
    insurance_amount numeric(10,2),
    total_charge numeric(10,2),
    currency text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: delivery_provider_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_provider_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    provider_type text NOT NULL,
    credentials jsonb DEFAULT '{}'::jsonb NOT NULL,
    settings jsonb DEFAULT '{"baseUrl": null, "enabled": true, "testMode": false, "webhookSecret": null, "rateMultiplier": 1.0}'::jsonb NOT NULL,
    supported_countries text[] DEFAULT '{}'::text[] NOT NULL,
    capabilities jsonb DEFAULT '{"webhooks": false, "insurance": false, "multiPiece": false, "reversePickup": false, "cashOnDelivery": false, "labelGeneration": false, "proofOfDelivery": false, "pickupScheduling": false, "realTimeTracking": false}'::jsonb NOT NULL,
    country_overrides jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    priority integer DEFAULT 100,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: delivery_webhooks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_webhooks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_code text NOT NULL,
    webhook_id text,
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    processed boolean DEFAULT false,
    error text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    processed_at timestamp with time zone
);


--
-- Name: discount_application_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.discount_application_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_id uuid,
    delivery_order_id uuid,
    discount_code_id uuid,
    discount_type_id uuid,
    country_rule_id uuid,
    application_type text DEFAULT 'manual'::text,
    customer_id uuid,
    customer_country text,
    discount_amount numeric(10,2),
    original_amount numeric(10,2),
    component_breakdown jsonb DEFAULT '{}'::jsonb,
    conditions_met jsonb DEFAULT '{}'::jsonb,
    applied_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT discount_application_log_application_type_check CHECK ((application_type = ANY (ARRAY['automatic'::text, 'manual'::text, 'code'::text, 'campaign'::text])))
);


--
-- Name: COLUMN discount_application_log.metadata; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.discount_application_log.metadata IS 'Additional JSON metadata for discount application (discount_code, discount_name, etc.)';


--
-- Name: discount_campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.discount_campaigns (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    description text,
    discount_type_id uuid,
    campaign_type text,
    start_date timestamp with time zone NOT NULL,
    end_date timestamp with time zone,
    usage_limit integer,
    usage_count integer DEFAULT 0,
    target_segments jsonb DEFAULT '[]'::jsonb,
    target_audience jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    auto_apply boolean DEFAULT false,
    priority integer DEFAULT 0,
    trigger_rules jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT discount_campaigns_campaign_type_check CHECK ((campaign_type = ANY (ARRAY['manual'::text, 'time_based'::text, 'user_triggered'::text, 'seasonal'::text])))
);


--
-- Name: discount_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.discount_codes (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    code text NOT NULL,
    campaign_id uuid,
    discount_type_id uuid,
    usage_limit integer,
    usage_count integer DEFAULT 0,
    usage_per_customer integer DEFAULT 1,
    valid_from timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    valid_until timestamp with time zone,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    priority integer DEFAULT 0,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: discount_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.discount_settings (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    setting_key text NOT NULL,
    setting_value jsonb NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: discount_stacking_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.discount_stacking_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    is_active boolean DEFAULT true,
    priority integer DEFAULT 0,
    max_discounts integer DEFAULT 1,
    allowed_combinations jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: discount_tiers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.discount_tiers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    discount_type_id uuid,
    min_order_value numeric(10,2) NOT NULL,
    max_order_value numeric(10,2),
    discount_value numeric(10,2) NOT NULL,
    applicable_components text[] DEFAULT ARRAY['total'::text],
    created_at timestamp with time zone DEFAULT now(),
    description text,
    usage_count integer DEFAULT 0,
    total_savings numeric(12,2) DEFAULT 0.00,
    avg_order_value numeric(10,2) DEFAULT 0.00,
    last_used_at timestamp with time zone,
    priority integer DEFAULT 100,
    CONSTRAINT valid_range CHECK (((max_order_value IS NULL) OR (max_order_value > min_order_value)))
);


--
-- Name: TABLE discount_tiers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.discount_tiers IS 'Volume discount tiers with analytics tracking for performance monitoring and optimization';


--
-- Name: COLUMN discount_tiers.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.discount_tiers.description IS 'Admin description/notes for the tier';


--
-- Name: COLUMN discount_tiers.usage_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.discount_tiers.usage_count IS 'Number of times this tier has been applied';


--
-- Name: COLUMN discount_tiers.total_savings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.discount_tiers.total_savings IS 'Total amount saved by customers using this tier';


--
-- Name: COLUMN discount_tiers.avg_order_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.discount_tiers.avg_order_value IS 'Average order value for orders using this tier';


--
-- Name: COLUMN discount_tiers.priority; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.discount_tiers.priority IS 'Priority for tier matching (higher values = higher priority)';


--
-- Name: discount_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.discount_types (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    type text NOT NULL,
    value numeric(10,2) NOT NULL,
    conditions jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    applicable_components text[] DEFAULT ARRAY['total'::text],
    tier_rules jsonb,
    priority integer DEFAULT 100,
    CONSTRAINT discount_types_type_check CHECK ((type = ANY (ARRAY['percentage'::text, 'fixed_amount'::text, 'shipping'::text, 'handling_fee'::text])))
);


--
-- Name: email_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message_id text NOT NULL,
    direction text NOT NULL,
    from_address text NOT NULL,
    to_addresses text[] NOT NULL,
    cc_addresses text[],
    subject text NOT NULL,
    text_body text,
    html_body text,
    raw_email text,
    s3_key text NOT NULL,
    s3_bucket text DEFAULT 'iwishbag-emails'::text NOT NULL,
    size_bytes integer,
    has_attachments boolean DEFAULT false,
    attachment_count integer DEFAULT 0,
    status text DEFAULT 'unread'::text NOT NULL,
    processed_at timestamp with time zone,
    user_id uuid,
    customer_email text,
    quote_id uuid,
    order_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    sent_at timestamp with time zone,
    received_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT email_messages_direction_check CHECK ((direction = ANY (ARRAY['sent'::text, 'received'::text]))),
    CONSTRAINT email_messages_status_check CHECK ((status = ANY (ARRAY['unread'::text, 'read'::text, 'replied'::text, 'archived'::text])))
);


--
-- Name: TABLE email_messages; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.email_messages IS 'Unified table for all email messages (sent and received) with S3 references';


--
-- Name: email_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    setting_key text NOT NULL,
    setting_value text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: error_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.error_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    error_message text NOT NULL,
    error_details text,
    context jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: escalation_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.escalation_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    violation_count integer NOT NULL,
    time_window_hours integer NOT NULL,
    response_action text NOT NULL,
    duration_minutes integer NOT NULL,
    description text NOT NULL,
    priority integer DEFAULT 0,
    enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE escalation_rules; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.escalation_rules IS 'Defines escalation matrix based on violation history';


--
-- Name: gateway_refunds; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: TABLE gateway_refunds; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.gateway_refunds IS 'Tracks refunds across all payment gateways (PayU, Stripe, PayPal, etc.)';


--
-- Name: item_revisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_revisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_item_id uuid,
    revision_number integer DEFAULT 1,
    change_type text NOT NULL,
    change_reason text,
    original_price numeric(10,2),
    new_price numeric(10,2),
    price_change_amount numeric(10,2) GENERATED ALWAYS AS ((new_price - original_price)) STORED,
    price_change_percentage numeric(5,2) GENERATED ALWAYS AS (
CASE
    WHEN (original_price > (0)::numeric) THEN (((new_price - original_price) / original_price) * (100)::numeric)
    ELSE (0)::numeric
END) STORED,
    original_weight numeric(10,3),
    new_weight numeric(10,3),
    weight_change_amount numeric(10,3) GENERATED ALWAYS AS ((new_weight - original_weight)) STORED,
    weight_change_percentage numeric(5,2) GENERATED ALWAYS AS (
CASE
    WHEN (original_weight > (0)::numeric) THEN (((new_weight - original_weight) / original_weight) * (100)::numeric)
    ELSE (0)::numeric
END) STORED,
    total_cost_impact numeric(10,2) DEFAULT 0 NOT NULL,
    shipping_cost_impact numeric(10,2) DEFAULT 0,
    customs_duty_impact numeric(10,2) DEFAULT 0,
    auto_approval_eligible boolean DEFAULT false,
    auto_approved boolean DEFAULT false,
    auto_approval_reason text,
    customer_approval_status text DEFAULT 'pending'::text,
    customer_approval_deadline timestamp with time zone DEFAULT (now() + '48:00:00'::interval),
    customer_response_notes text,
    customer_responded_at timestamp with time zone,
    admin_notes text,
    admin_user_id uuid,
    requires_management_approval boolean DEFAULT false,
    management_approved boolean DEFAULT false,
    recalculation_used_quote_data jsonb,
    recalculation_result jsonb,
    customer_notified boolean DEFAULT false,
    notification_sent_at timestamp with time zone,
    reminder_count integer DEFAULT 0,
    last_reminder_sent timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    approved_at timestamp with time zone,
    rejected_at timestamp with time zone,
    CONSTRAINT item_revisions_change_type_check CHECK ((change_type = ANY (ARRAY['price_increase'::text, 'price_decrease'::text, 'weight_increase'::text, 'weight_decrease'::text, 'both_increase'::text, 'both_decrease'::text, 'mixed_changes'::text, 'cancellation'::text, 'specification_change'::text]))),
    CONSTRAINT item_revisions_customer_approval_status_check CHECK ((customer_approval_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'expired'::text, 'auto_approved'::text])))
);


--
-- Name: iwish_tracking_sequence; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.iwish_tracking_sequence
    START WITH 1001
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: SEQUENCE iwish_tracking_sequence; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON SEQUENCE public.iwish_tracking_sequence IS 'Sequential numbering for iwishBag tracking IDs starting at 1001';


--
-- Name: manual_analysis_tasks; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: market_countries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.market_countries (
    market_id uuid NOT NULL,
    country_code text NOT NULL,
    is_primary_in_market boolean DEFAULT false,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE market_countries; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.market_countries IS 'Junction table linking markets to countries';


--
-- Name: COLUMN market_countries.is_primary_in_market; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.market_countries.is_primary_in_market IS 'Primary country within this market';


--
-- Name: market_country_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.market_country_summary AS
 SELECT m.id AS market_id,
    m.name AS market_name,
    m.code AS market_code,
    m.is_primary AS is_primary_market,
    count(mc.country_code) AS country_count,
    count(
        CASE
            WHEN cs.is_active THEN 1
            ELSE NULL::integer
        END) AS active_country_count,
    string_agg(
        CASE
            WHEN mc.is_primary_in_market THEN (cs.name || ' (Primary)'::text)
            ELSE NULL::text
        END, ', '::text) AS primary_country
   FROM ((public.markets m
     LEFT JOIN public.market_countries mc ON ((m.id = mc.market_id)))
     LEFT JOIN public.country_settings cs ON ((mc.country_code = cs.code)))
  GROUP BY m.id, m.name, m.code, m.is_primary;


--
-- Name: membership_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.membership_plans (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    benefits jsonb DEFAULT '[]'::jsonb NOT NULL,
    pricing jsonb DEFAULT '{}'::jsonb NOT NULL,
    duration_days integer DEFAULT 365 NOT NULL,
    warehouse_benefits jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
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
    order_id uuid,
    CONSTRAINT messages_priority_check CHECK (((priority)::text = ANY (ARRAY[('low'::character varying)::text, ('normal'::character varying)::text, ('high'::character varying)::text, ('urgent'::character varying)::text]))),
    CONSTRAINT messages_status_check CHECK (((message_status)::text = ANY (ARRAY[('sent'::character varying)::text, ('delivered'::character varying)::text, ('read'::character varying)::text, ('failed'::character varying)::text]))),
    CONSTRAINT messages_thread_type_check CHECK (((thread_type)::text = ANY (ARRAY[('general'::character varying)::text, ('quote'::character varying)::text, ('support'::character varying)::text, ('payment_proof'::character varying)::text, ('internal'::character varying)::text]))),
    CONSTRAINT messages_verification_status_check CHECK ((verification_status = ANY (ARRAY['pending'::text, 'verified'::text, 'confirmed'::text, 'rejected'::text]))),
    CONSTRAINT valid_recipients CHECK ((sender_id <> recipient_id))
);


--
-- Name: TABLE messages; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.messages IS 'Enhanced messaging table supporting quote-specific conversations, payment proofs, internal admin notes, and comprehensive messaging features';


--
-- Name: COLUMN messages.recipient_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.messages.recipient_id IS 'User ID of the recipient. NULL for broadcast/general messages from admin.';


--
-- Name: COLUMN messages.message_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.messages.message_type IS 'Type of message: general, payment_proof, support, etc.';


--
-- Name: notification_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid,
    quote_id uuid,
    notification_type text NOT NULL,
    recipient_email text,
    recipient_phone text,
    sent_at timestamp with time zone DEFAULT now(),
    content text,
    delivery_status text DEFAULT 'sent'::text,
    error_message text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: order_exceptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_exceptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_item_id uuid,
    shipment_id uuid,
    exception_type text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    severity text DEFAULT 'medium'::text,
    photos jsonb DEFAULT '[]'::jsonb,
    supporting_documents jsonb DEFAULT '[]'::jsonb,
    detected_by text,
    detected_at timestamp with time zone DEFAULT now(),
    reported_by uuid,
    available_resolutions jsonb DEFAULT '[]'::jsonb NOT NULL,
    recommended_resolution text,
    customer_choice text,
    customer_choice_reason text,
    customer_response_deadline timestamp with time zone DEFAULT (now() + '48:00:00'::interval),
    alternative_sellers_found jsonb DEFAULT '[]'::jsonb,
    alternative_selected boolean DEFAULT false,
    alternative_price_difference numeric(10,2),
    resolution_status text DEFAULT 'pending'::text,
    resolution_method text,
    resolution_amount numeric(10,2),
    resolution_notes text,
    resolved_at timestamp with time zone,
    resolved_by uuid,
    customer_satisfaction_rating integer,
    customer_feedback text,
    requires_admin_approval boolean DEFAULT false,
    admin_approved boolean DEFAULT false,
    admin_approval_notes text,
    approved_by uuid,
    approved_at timestamp with time zone,
    cost_to_business numeric(10,2) DEFAULT 0,
    impact_category text,
    prevention_notes text,
    process_improvement_required boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT order_exceptions_customer_satisfaction_rating_check CHECK (((customer_satisfaction_rating >= 1) AND (customer_satisfaction_rating <= 5))),
    CONSTRAINT order_exceptions_detected_by_check CHECK ((detected_by = ANY (ARRAY['automation'::text, 'quality_check'::text, 'customer_report'::text, 'admin_review'::text, 'seller_notification'::text]))),
    CONSTRAINT order_exceptions_exception_type_check CHECK ((exception_type = ANY (ARRAY['seller_cancelled'::text, 'seller_out_of_stock'::text, 'wrong_item_sent'::text, 'damaged_in_transit'::text, 'quality_check_failed'::text, 'customs_issue'::text, 'delivery_failed'::text, 'price_variance'::text, 'weight_variance'::text, 'customer_complaint'::text, 'automation_failed'::text]))),
    CONSTRAINT order_exceptions_impact_category_check CHECK ((impact_category = ANY (ARRAY['no_cost'::text, 'low_cost'::text, 'medium_cost'::text, 'high_cost'::text]))),
    CONSTRAINT order_exceptions_resolution_status_check CHECK ((resolution_status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'resolved'::text, 'escalated'::text, 'closed'::text]))),
    CONSTRAINT order_exceptions_severity_check CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])))
);


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    order_id uuid,
    quote_id uuid,
    quantity integer DEFAULT 1 NOT NULL,
    unit_price numeric(12,2) DEFAULT 0 NOT NULL,
    total_price numeric(12,2) GENERATED ALWAYS AS (((quantity)::numeric * unit_price)) STORED,
    currency text DEFAULT 'USD'::text NOT NULL,
    item_data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    quote_item_id uuid,
    product_name text,
    product_url text,
    seller_platform text,
    seller_account_type text,
    origin_country character(2),
    destination_country character(2),
    original_price numeric(10,2),
    current_price numeric(10,2),
    original_weight numeric(10,3),
    current_weight numeric(10,3),
    actual_weight numeric(10,3),
    item_status text DEFAULT 'pending_order_placement'::text,
    seller_order_id text,
    seller_order_date timestamp with time zone,
    seller_tracking_id text,
    brightdata_session_id text,
    order_automation_status text DEFAULT 'pending'::text,
    automation_error_log jsonb DEFAULT '[]'::jsonb,
    automation_retry_count integer DEFAULT 0,
    auto_approval_threshold_amount numeric(10,2) DEFAULT 25.00,
    auto_approval_threshold_percentage numeric(5,2) DEFAULT 5.00,
    requires_customer_approval boolean DEFAULT false,
    variance_auto_approved boolean DEFAULT false,
    price_variance numeric(10,2) DEFAULT 0,
    weight_variance numeric(10,3) DEFAULT 0,
    total_variance numeric(10,2) DEFAULT 0,
    quality_check_requested boolean DEFAULT true,
    quality_check_priority text DEFAULT 'standard'::text,
    quality_check_status text DEFAULT 'pending'::text,
    quality_notes text,
    quality_photos jsonb DEFAULT '[]'::jsonb,
    quality_inspector_id uuid,
    quality_checked_at timestamp with time zone,
    assigned_warehouse text,
    warehouse_arrival_date timestamp with time zone,
    warehouse_dispatch_date timestamp with time zone,
    consolidation_group_id text,
    refund_amount numeric(10,2) DEFAULT 0,
    cancellation_reason text,
    refund_processed_at timestamp with time zone,
    customer_notified_of_issues boolean DEFAULT false,
    last_customer_notification timestamp with time zone,
    CONSTRAINT order_items_assigned_warehouse_check CHECK ((assigned_warehouse = ANY (ARRAY['india_warehouse'::text, 'china_warehouse'::text, 'us_warehouse'::text, 'myus_3pl'::text, 'other_3pl'::text]))),
    CONSTRAINT order_items_item_status_check CHECK ((item_status = ANY (ARRAY['pending_order_placement'::text, 'seller_order_placed'::text, 'revision_pending'::text, 'revision_approved'::text, 'revision_rejected'::text, 'quality_check_pending'::text, 'quality_check_passed'::text, 'quality_check_failed'::text, 'shipped'::text, 'delivered'::text, 'cancelled'::text, 'refunded'::text, 'returned'::text, 'exchanged'::text]))),
    CONSTRAINT order_items_order_automation_status_check CHECK ((order_automation_status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'failed'::text, 'manual_required'::text]))),
    CONSTRAINT order_items_quality_check_priority_check CHECK ((quality_check_priority = ANY (ARRAY['minimal'::text, 'standard'::text, 'thorough'::text, 'electronics'::text]))),
    CONSTRAINT order_items_quality_check_status_check CHECK ((quality_check_status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'passed'::text, 'failed'::text, 'skipped'::text]))),
    CONSTRAINT order_items_quantity_check CHECK ((quantity > 0)),
    CONSTRAINT order_items_seller_account_type_check CHECK ((seller_account_type = ANY (ARRAY['personal'::text, 'business'::text]))),
    CONSTRAINT order_items_seller_platform_check CHECK ((seller_platform = ANY (ARRAY['amazon'::text, 'flipkart'::text, 'ebay'::text, 'b&h'::text, 'other'::text])))
);


--
-- Name: TABLE order_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.order_items IS 'Individual items within each order, linked to quotes_v2';


--
-- Name: order_shipments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_shipments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid,
    shipment_number text NOT NULL,
    origin_warehouse text NOT NULL,
    warehouse_location jsonb,
    consolidation_group text,
    shipment_type text NOT NULL,
    third_party_service text,
    third_party_account_id text,
    third_party_tracking_id text,
    seller_platform text,
    seller_name text,
    seller_order_id text,
    seller_tracking_id text,
    international_tracking_id text,
    local_delivery_tracking_id text,
    current_status text DEFAULT 'seller_preparing'::text,
    current_location text,
    current_tier text DEFAULT 'seller'::text,
    shipping_carrier text,
    service_type text,
    estimated_weight_kg numeric(10,3),
    actual_weight_kg numeric(10,3),
    dimensional_weight_kg numeric(10,3),
    billable_weight_kg numeric(10,3),
    weight_variance_approved boolean DEFAULT false,
    length_cm numeric(8,2),
    width_cm numeric(8,2),
    height_cm numeric(8,2),
    quality_check_status text DEFAULT 'pending'::text,
    quality_check_date timestamp with time zone,
    quality_notes text,
    quality_photos jsonb DEFAULT '[]'::jsonb,
    inspector_id uuid,
    customer_delivery_preference text,
    estimated_delivery_date timestamp with time zone,
    customer_max_wait_date timestamp with time zone,
    delivery_instructions text,
    seller_ship_date timestamp with time zone,
    warehouse_arrival_date timestamp with time zone,
    quality_check_completed_date timestamp with time zone,
    warehouse_dispatch_date timestamp with time zone,
    customs_entry_date timestamp with time zone,
    customs_clearance_date timestamp with time zone,
    local_facility_date timestamp with time zone,
    out_for_delivery_date timestamp with time zone,
    delivery_attempted_date timestamp with time zone,
    customer_delivery_date timestamp with time zone,
    estimated_shipping_cost numeric(10,2),
    actual_shipping_cost numeric(10,2),
    customs_duty numeric(10,2),
    additional_fees numeric(10,2),
    insurance_cost numeric(10,2),
    exception_status text,
    exception_notes text,
    escalation_required boolean DEFAULT false,
    escalated_at timestamp with time zone,
    escalated_to uuid,
    customer_notified boolean DEFAULT false,
    last_notification_sent timestamp with time zone,
    notification_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT order_shipments_current_status_check CHECK ((current_status = ANY (ARRAY['seller_preparing'::text, 'seller_shipped'::text, 'in_transit_to_warehouse'::text, 'arrived_at_warehouse'::text, 'quality_check_pending'::text, 'quality_check_passed'::text, 'quality_check_failed'::text, 'consolidation_pending'::text, 'ready_for_dispatch'::text, 'dispatched_internationally'::text, 'in_transit_international'::text, 'at_customs'::text, 'customs_cleared'::text, 'customs_hold'::text, 'local_facility'::text, 'out_for_delivery'::text, 'delivery_attempted'::text, 'delivered'::text, 'returned_to_sender'::text, 'exception'::text, 'cancelled'::text]))),
    CONSTRAINT order_shipments_current_tier_check CHECK ((current_tier = ANY (ARRAY['seller'::text, 'international'::text, 'local'::text]))),
    CONSTRAINT order_shipments_exception_status_check CHECK ((exception_status = ANY (ARRAY['customs_hold'::text, 'damaged_in_transit'::text, 'delivery_failed'::text, 'address_issue'::text, 'customer_not_available'::text]))),
    CONSTRAINT order_shipments_origin_warehouse_check CHECK ((origin_warehouse = ANY (ARRAY['india_warehouse'::text, 'china_warehouse'::text, 'us_warehouse'::text, 'myus_3pl'::text, 'other_3pl'::text]))),
    CONSTRAINT order_shipments_quality_check_status_check CHECK ((quality_check_status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'passed'::text, 'failed'::text, 'damaged'::text, 'skipped'::text]))),
    CONSTRAINT order_shipments_seller_platform_check CHECK ((seller_platform = ANY (ARRAY['amazon'::text, 'flipkart'::text, 'ebay'::text, 'b&h'::text, 'other'::text]))),
    CONSTRAINT order_shipments_service_type_check CHECK ((service_type = ANY (ARRAY['standard'::text, 'express'::text, 'economy'::text, 'priority'::text]))),
    CONSTRAINT order_shipments_shipment_type_check CHECK ((shipment_type = ANY (ARRAY['direct_delivery'::text, 'warehouse_consolidation'::text, 'partial_shipment'::text, 'replacement_shipment'::text]))),
    CONSTRAINT order_shipments_third_party_service_check CHECK ((third_party_service = ANY (ARRAY['myus'::text, 'shipito'::text, 'borderlinx'::text, 'other'::text]))),
    CONSTRAINT valid_costs CHECK ((((estimated_shipping_cost IS NULL) OR (estimated_shipping_cost >= (0)::numeric)) AND ((actual_shipping_cost IS NULL) OR (actual_shipping_cost >= (0)::numeric)) AND ((customs_duty IS NULL) OR (customs_duty >= (0)::numeric)))),
    CONSTRAINT valid_weights CHECK ((((estimated_weight_kg IS NULL) OR (estimated_weight_kg >= (0)::numeric)) AND ((actual_weight_kg IS NULL) OR (actual_weight_kg >= (0)::numeric)) AND ((dimensional_weight_kg IS NULL) OR (dimensional_weight_kg >= (0)::numeric)) AND ((billable_weight_kg IS NULL) OR (billable_weight_kg >= (0)::numeric))))
);


--
-- Name: order_status_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_status_history (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    order_id uuid,
    previous_status text,
    new_status text NOT NULL,
    changed_by uuid,
    change_reason text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE order_status_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.order_status_history IS 'Tracks all status changes for orders with timestamps';


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    order_number text NOT NULL,
    user_id uuid,
    status text DEFAULT 'pending_payment'::text NOT NULL,
    tracking_id text,
    total_amount numeric(12,2) DEFAULT 0 NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    payment_method text,
    payment_status text DEFAULT 'pending'::text,
    amount_paid numeric(12,2) DEFAULT 0,
    delivery_address jsonb,
    delivery_method text,
    estimated_delivery_date timestamp with time zone,
    actual_delivery_date timestamp with time zone,
    order_data jsonb DEFAULT '{}'::jsonb,
    admin_notes text,
    customer_notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    shipped_at timestamp with time zone,
    delivered_at timestamp with time zone,
    quote_id uuid,
    customer_id uuid,
    overall_status text,
    primary_warehouse text,
    consolidation_preference text DEFAULT 'wait_for_all'::text,
    max_consolidation_wait_days integer DEFAULT 14,
    delivery_preference text DEFAULT 'warehouse_consolidation'::text,
    quality_check_requested boolean DEFAULT true,
    photo_documentation_required boolean DEFAULT false,
    original_quote_total numeric(12,2),
    current_order_total numeric(12,2),
    variance_amount numeric(12,2) DEFAULT 0,
    currency_fluctuation_amount numeric(12,2) DEFAULT 0,
    total_refunded numeric(12,2) DEFAULT 0,
    total_items integer DEFAULT 0,
    active_items integer DEFAULT 0,
    cancelled_items integer DEFAULT 0,
    refunded_items integer DEFAULT 0,
    revision_pending_items integer DEFAULT 0,
    shipped_items integer DEFAULT 0,
    delivered_items integer DEFAULT 0,
    seller_order_automation jsonb DEFAULT '{}'::jsonb,
    tracking_automation jsonb DEFAULT '{}'::jsonb,
    automation_enabled boolean DEFAULT true,
    original_quote_data jsonb,
    payment_verification_date timestamp with time zone,
    payment_completed_at timestamp with time zone,
    first_shipment_date timestamp with time zone,
    last_delivery_date timestamp with time zone,
    CONSTRAINT orders_consolidation_preference_check CHECK ((consolidation_preference = ANY (ARRAY['ship_as_ready'::text, 'wait_for_all'::text, 'partial_groups'::text]))),
    CONSTRAINT orders_delivery_preference_check CHECK ((delivery_preference = ANY (ARRAY['direct_delivery'::text, 'warehouse_consolidation'::text]))),
    CONSTRAINT orders_payment_method_check CHECK ((payment_method = ANY (ARRAY['cod'::text, 'bank_transfer'::text, 'stripe'::text, 'paypal'::text, 'payu'::text, 'esewa'::text, 'khalti'::text, 'fonepay'::text]))),
    CONSTRAINT orders_payment_status_check CHECK ((payment_status = ANY (ARRAY['pending'::text, 'processing'::text, 'verified'::text, 'completed'::text, 'cod_pending'::text, 'failed'::text, 'refunded'::text, 'partial'::text]))),
    CONSTRAINT orders_primary_warehouse_check CHECK ((primary_warehouse = ANY (ARRAY['india_warehouse'::text, 'china_warehouse'::text, 'us_warehouse'::text, 'myus_3pl'::text, 'other_3pl'::text]))),
    CONSTRAINT orders_status_check CHECK ((status = ANY (ARRAY['pending_payment'::text, 'payment_pending'::text, 'confirmed'::text, 'processing'::text, 'shipped'::text, 'delivered'::text, 'completed'::text, 'cancelled'::text, 'refunded'::text]))),
    CONSTRAINT valid_amount CHECK ((total_amount >= (0)::numeric)),
    CONSTRAINT valid_paid_amount CHECK (((amount_paid >= (0)::numeric) AND (amount_paid <= total_amount)))
);


--
-- Name: TABLE orders; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.orders IS 'Main orders table containing order information and status';


--
-- Name: orders_with_details; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.orders_with_details AS
SELECT
    NULL::uuid AS id,
    NULL::text AS order_number,
    NULL::uuid AS user_id,
    NULL::text AS status,
    NULL::text AS tracking_id,
    NULL::numeric(12,2) AS total_amount,
    NULL::text AS currency,
    NULL::text AS payment_method,
    NULL::text AS payment_status,
    NULL::numeric(12,2) AS amount_paid,
    NULL::jsonb AS delivery_address,
    NULL::text AS delivery_method,
    NULL::timestamp with time zone AS estimated_delivery_date,
    NULL::timestamp with time zone AS actual_delivery_date,
    NULL::jsonb AS order_data,
    NULL::text AS admin_notes,
    NULL::text AS customer_notes,
    NULL::timestamp with time zone AS created_at,
    NULL::timestamp with time zone AS updated_at,
    NULL::timestamp with time zone AS shipped_at,
    NULL::timestamp with time zone AS delivered_at,
    NULL::bigint AS item_count,
    NULL::numeric AS calculated_total,
    NULL::character varying(255) AS customer_email,
    NULL::text AS customer_name,
    NULL::text AS customer_phone;


--
-- Name: VIEW orders_with_details; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.orders_with_details IS 'Comprehensive view of orders with calculated totals and customer details';


--
-- Name: package_events; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: payment_adjustments; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: TABLE payment_adjustments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.payment_adjustments IS 'Track all payment adjustments and corrections';


--
-- Name: payment_gateways; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: TABLE payment_gateways; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.payment_gateways IS 'Payment gateway configurations - Stripe removed for fresh integration';


--
-- Name: COLUMN payment_gateways.priority; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payment_gateways.priority IS 'Priority order for gateway selection (lower numbers = higher priority)';


--
-- Name: COLUMN payment_gateways.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payment_gateways.description IS 'Description of the payment gateway for display purposes';


--
-- Name: payment_health_logs; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: TABLE payment_health_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.payment_health_logs IS 'Logs for payment system health monitoring and alerting';


--
-- Name: COLUMN payment_health_logs.overall_health; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payment_health_logs.overall_health IS 'Overall health status (healthy, warning, critical)';


--
-- Name: COLUMN payment_health_logs.success_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payment_health_logs.success_rate IS 'Payment success rate percentage';


--
-- Name: COLUMN payment_health_logs.error_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payment_health_logs.error_rate IS 'Payment error rate percentage';


--
-- Name: COLUMN payment_health_logs.avg_processing_time; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payment_health_logs.avg_processing_time IS 'Average processing time in milliseconds';


--
-- Name: COLUMN payment_health_logs.alert_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payment_health_logs.alert_count IS 'Number of alerts generated';


--
-- Name: COLUMN payment_health_logs.metrics; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payment_health_logs.metrics IS 'Complete health metrics JSON';


--
-- Name: payment_health_dashboard; Type: VIEW; Schema: public; Owner: -
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


--
-- Name: payment_method_discounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_method_discounts (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    payment_method text NOT NULL,
    discount_percentage numeric(5,2) NOT NULL,
    is_stackable boolean DEFAULT true,
    conditions jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: payment_reminders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_reminders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_id uuid,
    reminder_type text NOT NULL,
    sent_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT payment_reminders_reminder_type_check CHECK ((reminder_type = ANY (ARRAY['bank_transfer_pending'::text, 'cod_confirmation'::text])))
);


--
-- Name: payment_transactions; Type: TABLE; Schema: public; Owner: -
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
    paypal_payer_email text,
    payment_type text,
    gateway_code text,
    gateway_transaction_id text,
    reference_number text,
    bank_reference text,
    customer_reference text,
    verified_by uuid,
    verified_at timestamp with time zone,
    parent_payment_id uuid,
    payment_proof_message_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    notes text,
    created_by uuid,
    transaction_type text,
    debit_account text,
    credit_account text,
    posted_at timestamp with time zone,
    reversed_by uuid,
    reversal_reason text,
    approved_by uuid,
    approved_at timestamp with time zone
);


--
-- Name: TABLE payment_transactions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.payment_transactions IS 'Unified payment tracking with ledger and financial capabilities';


--
-- Name: COLUMN payment_transactions.payment_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payment_transactions.payment_type IS 'Type of payment transaction';


--
-- Name: COLUMN payment_transactions.gateway_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payment_transactions.gateway_code IS 'Payment gateway identifier';


--
-- Name: COLUMN payment_transactions.verified_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payment_transactions.verified_by IS 'Admin who verified this payment';


--
-- Name: COLUMN payment_transactions.verified_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payment_transactions.verified_at IS 'When payment was verified';


--
-- Name: payment_verification_logs; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: TABLE payment_verification_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.payment_verification_logs IS 'Logs for payment verification attempts for audit and debugging';


--
-- Name: COLUMN payment_verification_logs.request_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payment_verification_logs.request_id IS 'Unique identifier for each verification request';


--
-- Name: COLUMN payment_verification_logs.transaction_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payment_verification_logs.transaction_id IS 'Payment transaction ID being verified';


--
-- Name: COLUMN payment_verification_logs.gateway; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payment_verification_logs.gateway IS 'Payment gateway used (payu, stripe, etc.)';


--
-- Name: COLUMN payment_verification_logs.success; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payment_verification_logs.success IS 'Whether verification was successful';


--
-- Name: COLUMN payment_verification_logs.error_message; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payment_verification_logs.error_message IS 'Error message if verification failed';


--
-- Name: COLUMN payment_verification_logs.gateway_response; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payment_verification_logs.gateway_response IS 'Raw response from payment gateway';


--
-- Name: paypal_refund_reasons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.paypal_refund_reasons (
    code text NOT NULL,
    description text NOT NULL,
    customer_friendly_description text,
    is_active boolean DEFAULT true,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE paypal_refund_reasons; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.paypal_refund_reasons IS 'Lookup table for standardized refund reason codes';


--
-- Name: paypal_webhook_events; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: phone_otps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.phone_otps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    phone text NOT NULL,
    otp_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    type text DEFAULT 'otp'::text
);


--
-- Name: TABLE phone_otps; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.phone_otps IS 'Stores SMS OTP codes for phone verification with multi-provider support (Sparrow SMS, MSG91, Twilio)';


--
-- Name: COLUMN phone_otps.otp_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.phone_otps.otp_hash IS 'Base64 encoded OTP code (should use proper hashing in production)';


--
-- Name: COLUMN phone_otps.type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.phone_otps.type IS 'Type of OTP: otp, phone_change, signup, login';


--
-- Name: pickup_time_slots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pickup_time_slots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slot_name character varying(100) NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: pricing_calculation_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pricing_calculation_cache (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    service_id uuid NOT NULL,
    country_code text NOT NULL,
    order_value numeric(10,2) NOT NULL,
    applicable_rate numeric(10,4) NOT NULL,
    calculated_amount numeric(10,2) NOT NULL,
    min_amount numeric(10,2) DEFAULT 0,
    max_amount numeric(10,2),
    pricing_tier text NOT NULL,
    source_id uuid,
    calculation_metadata jsonb DEFAULT '{}'::jsonb,
    expires_at timestamp with time zone DEFAULT (now() + '01:00:00'::interval) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: pricing_change_approvals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pricing_change_approvals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    change_log_id uuid,
    status text DEFAULT 'pending'::text NOT NULL,
    approved_by uuid,
    approval_reason text,
    approval_threshold_met boolean DEFAULT false,
    requires_approval boolean DEFAULT false,
    impact_level text,
    estimated_revenue_impact numeric(12,2),
    submitted_at timestamp with time zone DEFAULT now(),
    approved_at timestamp with time zone,
    CONSTRAINT pricing_change_approvals_impact_level_check CHECK ((impact_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))),
    CONSTRAINT pricing_change_approvals_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'auto_approved'::text])))
);


--
-- Name: TABLE pricing_change_approvals; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.pricing_change_approvals IS 'Approval workflow for pricing changes requiring authorization';


--
-- Name: pricing_change_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pricing_change_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service_id uuid,
    change_type text NOT NULL,
    identifier text NOT NULL,
    identifier_name text,
    old_rate numeric(10,6),
    new_rate numeric(10,6) NOT NULL,
    old_min_amount numeric(10,2),
    new_min_amount numeric(10,2),
    old_max_amount numeric(10,2),
    new_max_amount numeric(10,2),
    changed_by uuid,
    change_reason text NOT NULL,
    change_method text DEFAULT 'manual'::text NOT NULL,
    affected_countries integer DEFAULT 1,
    batch_id uuid,
    session_id text,
    ip_address text,
    user_agent text,
    effective_from timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT pricing_change_log_change_method_check CHECK ((change_method = ANY (ARRAY['manual'::text, 'bulk'::text, 'csv_import'::text, 'api'::text, 'scheduled'::text]))),
    CONSTRAINT pricing_change_log_change_type_check CHECK ((change_type = ANY (ARRAY['country'::text, 'regional'::text, 'continental'::text, 'global'::text, 'bulk'::text])))
);


--
-- Name: TABLE pricing_change_log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.pricing_change_log IS 'Comprehensive audit log for all pricing changes across the system';


--
-- Name: regional_pricing; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.regional_pricing (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    service_id uuid NOT NULL,
    region_key text NOT NULL,
    region_name text NOT NULL,
    region_description text,
    country_codes text[] NOT NULL,
    rate numeric(10,4) NOT NULL,
    min_amount numeric(10,2) DEFAULT 0,
    max_amount numeric(10,2),
    currency_code text DEFAULT 'USD'::text,
    notes text,
    is_active boolean DEFAULT true NOT NULL,
    priority integer DEFAULT 100,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE regional_pricing; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.regional_pricing IS 'Custom regional groupings for more granular pricing control (South Asia, East Asia, etc.)';


--
-- Name: pricing_hierarchy_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.pricing_hierarchy_view AS
 SELECT s.service_key,
    s.service_name,
    s.service_category,
    s.pricing_type,
    s.default_rate,
    cp.continent,
    cp.rate AS continental_rate,
    rp.region_key,
    rp.region_name,
    rp.country_codes AS regional_countries,
    rp.rate AS regional_rate,
    rp.priority AS regional_priority,
    co.country_code,
    co.rate AS country_rate,
    co.reason AS country_reason,
    COALESCE(co.is_active, rp.is_active, cp.is_active, s.is_active) AS is_active
   FROM (((public.addon_services s
     LEFT JOIN public.continental_pricing cp ON ((s.id = cp.service_id)))
     LEFT JOIN public.regional_pricing rp ON ((s.id = rp.service_id)))
     LEFT JOIN public.country_pricing_overrides co ON ((s.id = co.service_id)))
  WHERE (s.is_active = true)
  ORDER BY s.display_order, s.service_key;


--
-- Name: pricing_summary_admin; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.pricing_summary_admin AS
SELECT
    NULL::text AS service_key,
    NULL::text AS service_name,
    NULL::numeric(10,4) AS default_rate,
    NULL::bigint AS continental_rules,
    NULL::bigint AS regional_rules,
    NULL::bigint AS country_overrides,
    NULL::numeric AS min_rate,
    NULL::numeric AS max_rate,
    NULL::boolean AS is_active,
    NULL::timestamp with time zone AS created_at;


--
-- Name: product_classifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_classifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    classification_code character varying(20) NOT NULL,
    country_code character varying(2) NOT NULL,
    product_name character varying(200) NOT NULL,
    category character varying(100) NOT NULL,
    subcategory character varying(100),
    description text,
    country_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    typical_weight_kg numeric(8,3),
    weight_variance_factor numeric(4,2) DEFAULT 1.0,
    typical_dimensions jsonb,
    volume_category character varying(20),
    customs_rate numeric(5,2),
    valuation_method character varying(20) DEFAULT 'product_price'::character varying,
    minimum_valuation_usd numeric(10,2),
    confidence_score numeric(3,2) DEFAULT 0.8,
    usage_frequency integer DEFAULT 0,
    last_verified_at timestamp with time zone,
    search_keywords text[],
    tags character varying(50)[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    is_active boolean DEFAULT true,
    CONSTRAINT valid_confidence CHECK (((confidence_score >= 0.0) AND (confidence_score <= 1.0))),
    CONSTRAINT valid_valuation_method CHECK (((valuation_method)::text = ANY ((ARRAY['product_price'::character varying, 'minimum_valuation'::character varying])::text[]))),
    CONSTRAINT valid_volume_category CHECK (((volume_category)::text = ANY ((ARRAY['compact'::character varying, 'standard'::character varying, 'bulky'::character varying, 'oversized'::character varying])::text[]))),
    CONSTRAINT valid_weight CHECK (((typical_weight_kg IS NULL) OR (typical_weight_kg > (0)::numeric)))
);


--
-- Name: quote_address_history; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: quote_address_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.quote_address_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: quote_address_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.quote_address_history_id_seq OWNED BY public.quote_address_history.id;


--
-- Name: quote_documents; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: quote_items; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: quote_items_v2; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quote_items_v2 (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_id uuid,
    name text NOT NULL,
    url text,
    quantity integer DEFAULT 1 NOT NULL,
    unit_price_origin numeric(10,2) NOT NULL,
    weight_kg numeric(10,3),
    category text,
    total_weight_kg numeric(10,3) GENERATED ALWAYS AS (((quantity)::numeric * COALESCE(weight_kg, (0)::numeric))) STORED,
    notes text,
    image_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    subtotal_origin numeric(10,2) GENERATED ALWAYS AS (((quantity)::numeric * unit_price_origin)) STORED
);


--
-- Name: quote_options_analytics; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.quote_options_analytics AS
 SELECT id,
    customer_id,
    customer_email,
    status,
    origin_country,
    destination_country,
    total_quote_origincurrency,
    customer_currency,
    created_at,
    approved_at,
    applied_discounts,
    selected_shipping_option_id,
    insurance_required,
    options_last_updated_at,
    options_last_updated_by
   FROM public.quotes_v2
  WHERE (status = ANY (ARRAY['sent'::text, 'approved'::text, 'paid'::text]));


--
-- Name: VIEW quote_options_analytics; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.quote_options_analytics IS 'Quote analytics with simplified currency (origin only) - updated 2025-08-08';


--
-- Name: quote_statuses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quote_statuses (
    id integer NOT NULL,
    value text NOT NULL,
    label text NOT NULL,
    color text,
    icon text,
    is_active boolean DEFAULT true
);


--
-- Name: quote_statuses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.quote_statuses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: quote_statuses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.quote_statuses_id_seq OWNED BY public.quote_statuses.id;


--
-- Name: quote_templates; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: quotes_with_legacy_fields; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.quotes_with_legacy_fields AS
 SELECT id,
    customer_id,
    customer_email,
    status,
    origin_country,
    destination_country,
    total_quote_origincurrency,
    customer_currency,
    created_at,
    updated_at
   FROM public.quotes_v2;


--
-- Name: VIEW quotes_with_legacy_fields; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.quotes_with_legacy_fields IS 'Legacy compatibility view with simplified currency (origin only) - updated 2025-08-08';


--
-- Name: reconciliation_items; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: TABLE reconciliation_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.reconciliation_items IS 'Individual transaction matching within reconciliation sessions';


--
-- Name: reconciliation_rules; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: TABLE reconciliation_rules; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.reconciliation_rules IS 'Configurable rules for automatic transaction matching';


--
-- Name: refund_items; Type: TABLE; Schema: public; Owner: -
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
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT refund_items_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text, 'cancelled'::text])))
);


--
-- Name: TABLE refund_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.refund_items IS 'Individual refund allocations across multiple payments';


--
-- Name: refund_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refund_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_id uuid NOT NULL,
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
    payment_transaction_id uuid,
    CONSTRAINT refund_requests_reason_code_check CHECK ((reason_code = ANY (ARRAY['order_cancelled'::text, 'price_adjustment'::text, 'overpayment'::text, 'customer_request'::text, 'product_unavailable'::text, 'quality_issue'::text, 'shipping_issue'::text, 'duplicate_payment'::text, 'other'::text]))),
    CONSTRAINT refund_requests_refund_method_check CHECK ((refund_method = ANY (ARRAY['original_payment_method'::text, 'bank_transfer'::text, 'credit_note'::text, 'store_credit'::text]))),
    CONSTRAINT refund_requests_refund_type_check CHECK ((refund_type = ANY (ARRAY['full'::text, 'partial'::text, 'credit_note'::text, 'chargeback'::text, 'overpayment'::text]))),
    CONSTRAINT refund_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'processing'::text, 'completed'::text, 'failed'::text, 'cancelled'::text, 'partially_completed'::text])))
);


--
-- Name: TABLE refund_requests; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.refund_requests IS 'Tracks all refund requests with approval workflow';


--
-- Name: COLUMN refund_requests.payment_transaction_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.refund_requests.payment_transaction_id IS 'Reference to the original payment transaction being refunded';


--
-- Name: rejection_reasons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rejection_reasons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reason text NOT NULL,
    category text DEFAULT 'general'::text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: route_customs_tiers; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: COLUMN route_customs_tiers.sales_tax_percentage; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.route_customs_tiers.sales_tax_percentage IS 'Sales tax percentage for origin country (e.g., US state tax). Only applies to specific routes like US->NP where origin country charges sales tax on international shipments.';


--
-- Name: seller_order_automation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seller_order_automation (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_item_id uuid,
    automation_type text NOT NULL,
    brightdata_session_id text,
    automation_status text DEFAULT 'queued'::text,
    seller_platform text NOT NULL,
    seller_account_type text,
    automation_config jsonb DEFAULT '{}'::jsonb,
    success boolean DEFAULT false,
    error_message text,
    scraped_data jsonb DEFAULT '{}'::jsonb,
    api_response jsonb DEFAULT '{}'::jsonb,
    retry_count integer DEFAULT 0,
    max_retries integer DEFAULT 3,
    next_retry_at timestamp with time zone,
    retry_delay_minutes integer DEFAULT 30,
    execution_time_seconds integer,
    data_quality_score numeric(3,2),
    created_at timestamp with time zone DEFAULT now(),
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    requires_manual_review boolean DEFAULT false,
    manual_review_notes text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    CONSTRAINT seller_order_automation_automation_status_check CHECK ((automation_status = ANY (ARRAY['queued'::text, 'running'::text, 'completed'::text, 'failed'::text, 'retry'::text, 'manual_required'::text]))),
    CONSTRAINT seller_order_automation_automation_type_check CHECK ((automation_type = ANY (ARRAY['order_placement'::text, 'tracking_scrape'::text, 'status_check'::text, 'inventory_check'::text])))
);


--
-- Name: share_audit_log; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: TABLE share_audit_log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.share_audit_log IS 'Tracks all actions related to quote sharing for security and analytics';


--
-- Name: shipment_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipment_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shipment_id uuid,
    order_item_id uuid,
    quantity_in_shipment integer DEFAULT 1 NOT NULL,
    received_condition text DEFAULT 'good'::text,
    quality_notes text,
    condition_photos jsonb DEFAULT '[]'::jsonb,
    item_weight_in_shipment numeric(10,3),
    item_value_in_shipment numeric(10,2),
    customs_declared_value numeric(10,2),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT shipment_items_quantity_in_shipment_check CHECK ((quantity_in_shipment > 0)),
    CONSTRAINT shipment_items_received_condition_check CHECK ((received_condition = ANY (ARRAY['good'::text, 'damaged'::text, 'missing'::text, 'defective'::text, 'wrong_item'::text])))
);


--
-- Name: shipment_tracking_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipment_tracking_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shipment_id uuid,
    tracking_tier text NOT NULL,
    event_type text NOT NULL,
    event_status text NOT NULL,
    location text,
    description text NOT NULL,
    external_tracking_id text,
    carrier text,
    country_code character(2),
    city text,
    postal_code text,
    event_timestamp timestamp with time zone DEFAULT now(),
    system_generated boolean DEFAULT false,
    admin_user_id uuid,
    webhook_data jsonb DEFAULT '{}'::jsonb,
    api_response jsonb DEFAULT '{}'::jsonb,
    data_source text,
    customer_visible boolean DEFAULT true,
    notification_sent boolean DEFAULT false,
    notification_sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT shipment_tracking_events_data_source_check CHECK ((data_source = ANY (ARRAY['manual'::text, 'webhook'::text, 'api_scrape'::text, 'email_parse'::text, 'brightdata'::text]))),
    CONSTRAINT shipment_tracking_events_event_status_check CHECK ((event_status = ANY (ARRAY['info'::text, 'warning'::text, 'error'::text, 'success'::text, 'pending'::text]))),
    CONSTRAINT shipment_tracking_events_event_type_check CHECK ((event_type = ANY (ARRAY['order_placed'::text, 'shipped'::text, 'in_transit'::text, 'arrived'::text, 'departed'::text, 'customs'::text, 'cleared'::text, 'delivered'::text, 'attempted'::text, 'exception'::text, 'returned'::text, 'cancelled'::text]))),
    CONSTRAINT shipment_tracking_events_tracking_tier_check CHECK ((tracking_tier = ANY (ARRAY['seller'::text, 'international'::text, 'local'::text])))
);


--
-- Name: shipping_routes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipping_routes (
    id integer NOT NULL,
    origin_country character varying(3) NOT NULL,
    destination_country character varying(3) NOT NULL,
    base_shipping_cost numeric(10,2) NOT NULL,
    cost_per_kg numeric(10,2) NOT NULL,
    cost_percentage numeric(5,2) DEFAULT 0,
    weight_tiers jsonb DEFAULT '[{"max": 1, "min": 0, "cost": 15.00}, {"max": 3, "min": 1, "cost": 25.00}, {"max": 5, "min": 3, "cost": 35.00}, {"max": null, "min": 5, "cost": 45.00}]'::jsonb,
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
    CONSTRAINT shipping_routes_exchange_rate_check CHECK ((exchange_rate > (0)::numeric)),
    CONSTRAINT shipping_routes_weight_unit_check CHECK ((weight_unit = ANY (ARRAY['kg'::text, 'lb'::text])))
);


--
-- Name: TABLE shipping_routes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.shipping_routes IS 'Shipping routes table - cleaned up unused columns: vat_percentage, customs_percentage, carriers, max_weight, restricted_items, requires_documentation';


--
-- Name: COLUMN shipping_routes.weight_unit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.shipping_routes.weight_unit IS 'Weight unit for this shipping route (kg or lb)';


--
-- Name: COLUMN shipping_routes.delivery_options; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.shipping_routes.delivery_options IS 'JSON array of delivery options with structure: [{"id": "string", "name": "string", "carrier": "string", "min_days": number, "max_days": number, "price": number, "active": boolean}]';


--
-- Name: COLUMN shipping_routes.processing_days; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.shipping_routes.processing_days IS 'Number of business days for order processing before shipping';


--
-- Name: COLUMN shipping_routes.active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.shipping_routes.active IS 'Whether the shipping route is active and available for quoting';


--
-- Name: COLUMN shipping_routes.customs_clearance_days; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.shipping_routes.customs_clearance_days IS 'Number of business days for customs clearance processing';


--
-- Name: COLUMN shipping_routes.shipping_per_kg; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.shipping_routes.shipping_per_kg IS 'Additional shipping cost per kg of weight (multiplied by item weight and added to base cost)';


--
-- Name: COLUMN shipping_routes.exchange_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.shipping_routes.exchange_rate IS 'Exchange rate from origin country currency to destination country currency (e.g., USD to INR rate for US->IN route)';


--
-- Name: shipping_routes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.shipping_routes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: shipping_routes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.shipping_routes_id_seq OWNED BY public.shipping_routes.id;


--
-- Name: sla_configurations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sla_configurations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    priority character varying(10) NOT NULL,
    first_response_target_minutes integer NOT NULL,
    resolution_target_minutes integer NOT NULL,
    escalation_threshold_minutes integer,
    business_hours_only boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT sla_configurations_priority_check CHECK (((priority)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'urgent'::character varying])::text[])))
);


--
-- Name: sla_policies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sla_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    priority text NOT NULL,
    response_time_hours integer DEFAULT 24 NOT NULL,
    resolution_time_hours integer DEFAULT 72 NOT NULL,
    business_hours_only boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT sla_policies_priority_check CHECK ((priority = ANY (ARRAY['urgent'::text, 'high'::text, 'medium'::text, 'low'::text])))
);


--
-- Name: smart_product_intelligence_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.smart_product_intelligence_summary AS
 SELECT cc.country_code,
    cc.country_name,
    cc.classification_system,
    count(pc.id) AS total_classifications,
    count(
        CASE
            WHEN pc.is_active THEN 1
            ELSE NULL::integer
        END) AS active_classifications,
    avg(pc.confidence_score) AS avg_confidence,
    count(DISTINCT pc.category) AS categories_count
   FROM (public.country_configs cc
     LEFT JOIN public.product_classifications pc ON (((cc.country_code)::text = (pc.country_code)::text)))
  GROUP BY cc.country_code, cc.country_name, cc.classification_system
  ORDER BY cc.country_code;


--
-- Name: sms_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sms_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message_id text,
    direction text NOT NULL,
    from_phone text NOT NULL,
    to_phone text NOT NULL,
    message text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    provider text,
    country_code text,
    cost numeric(10,4),
    credits_used integer,
    sent_at timestamp with time zone,
    delivered_at timestamp with time zone,
    failed_at timestamp with time zone,
    error_message text,
    metadata jsonb DEFAULT '{}'::jsonb,
    user_id uuid,
    customer_phone text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT sms_messages_direction_check CHECK ((direction = ANY (ARRAY['sent'::text, 'received'::text]))),
    CONSTRAINT sms_messages_provider_check CHECK ((provider = ANY (ARRAY['sparrow'::text, 'msg91'::text, 'twilio'::text]))),
    CONSTRAINT sms_messages_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'delivered'::text, 'failed'::text, 'received'::text])))
);


--
-- Name: status_transitions; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: suite_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.suite_number_seq
    START WITH 10000
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: support_assignment_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_assignment_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    assignment_method text NOT NULL,
    criteria jsonb DEFAULT '{}'::jsonb NOT NULL,
    eligible_user_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    priority integer DEFAULT 1 NOT NULL,
    assignment_count integer DEFAULT 0 NOT NULL,
    last_assigned_user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT support_assignment_rules_assignment_method_check CHECK ((assignment_method = ANY (ARRAY['round_robin'::text, 'least_assigned'::text, 'random'::text])))
);


--
-- Name: support_interactions; Type: TABLE; Schema: public; Owner: -
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
    CONSTRAINT support_interactions_interaction_type_check CHECK (((interaction_type)::text = ANY ((ARRAY['reply'::character varying, 'status_change'::character varying, 'assignment'::character varying, 'escalation'::character varying, 'note'::character varying, 'quote_modification'::character varying])::text[]))),
    CONSTRAINT valid_assignment_content CHECK ((((interaction_type)::text <> 'assignment'::text) OR (content ? 'to_user'::text))),
    CONSTRAINT valid_quote_modification_content CHECK ((((interaction_type)::text <> 'quote_modification'::text) OR ((content ? 'message'::text) AND (content ? 'quote_changes'::text)))),
    CONSTRAINT valid_reply_content CHECK ((((interaction_type)::text <> 'reply'::text) OR (content ? 'message'::text))),
    CONSTRAINT valid_status_change_content CHECK ((((interaction_type)::text <> 'status_change'::text) OR ((content ? 'from_status'::text) AND (content ? 'to_status'::text))))
);


--
-- Name: TABLE support_interactions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.support_interactions IS 'All interactions and communications related to support records';


--
-- Name: COLUMN support_interactions.interaction_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.support_interactions.interaction_type IS 'Type of interaction: reply, status_change, assignment, escalation, note';


--
-- Name: COLUMN support_interactions.content; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.support_interactions.content IS 'Interaction content structure varies by type';


--
-- Name: COLUMN support_interactions.is_internal; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.support_interactions.is_internal IS 'Whether this interaction is visible to customers';


--
-- Name: support_system; Type: TABLE; Schema: public; Owner: -
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
    last_admin_read_at timestamp with time zone,
    has_unread_replies boolean DEFAULT false,
    first_response_at timestamp with time zone,
    resolution_time_minutes integer,
    first_response_time_minutes integer,
    sla_status character varying(20) DEFAULT 'on_track'::character varying,
    sla_breach_count integer DEFAULT 0,
    response_sla_target_minutes integer DEFAULT 240,
    resolution_sla_target_minutes integer DEFAULT 2880,
    CONSTRAINT support_system_sla_status_check CHECK (((sla_status)::text = ANY ((ARRAY['on_track'::character varying, 'approaching_deadline'::character varying, 'overdue'::character varying])::text[]))),
    CONSTRAINT support_system_system_type_check CHECK (((system_type)::text = ANY ((ARRAY['ticket'::character varying, 'rule'::character varying, 'template'::character varying, 'preference'::character varying, 'quote_discussion'::character varying])::text[]))),
    CONSTRAINT valid_assignment_data CHECK ((((system_type)::text <> 'rule'::text) OR ((assignment_data ? 'rule_name'::text) AND (assignment_data ? 'conditions'::text)))),
    CONSTRAINT valid_template_data CHECK ((((system_type)::text <> 'template'::text) OR ((template_data ? 'name'::text) AND (template_data ? 'content'::text)))),
    CONSTRAINT valid_ticket_data CHECK ((((system_type)::text <> 'ticket'::text) OR ((ticket_data ? 'subject'::text) AND (ticket_data ? 'description'::text) AND (ticket_data ? 'status'::text))))
);


--
-- Name: TABLE support_system; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.support_system IS 'Unified support system consolidating tickets, rules, templates, and preferences';


--
-- Name: COLUMN support_system.system_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.support_system.system_type IS 'Type of support record: ticket, rule, template, preference';


--
-- Name: COLUMN support_system.ticket_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.support_system.ticket_data IS 'Main ticket information including status, priority, category, and metadata';


--
-- Name: COLUMN support_system.assignment_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.support_system.assignment_data IS 'Auto-assignment rules and conditions';


--
-- Name: COLUMN support_system.sla_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.support_system.sla_data IS 'SLA tracking information including response and resolution times';


--
-- Name: COLUMN support_system.notification_prefs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.support_system.notification_prefs IS 'User notification preferences and settings';


--
-- Name: COLUMN support_system.template_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.support_system.template_data IS 'Reply templates and their configurations';


--
-- Name: support_tickets_view; Type: VIEW; Schema: public; Owner: -
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


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    setting_key text NOT NULL,
    setting_value text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ticket_replies_view; Type: VIEW; Schema: public; Owner: -
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


--
-- Name: tickets; Type: VIEW; Schema: public; Owner: -
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


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: TABLE user_roles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_roles IS 'User role assignments with CASCADE deletion support to allow user account deletion';


--
-- Name: webhook_logs; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: TABLE webhook_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.webhook_logs IS 'Logs all webhook requests for debugging and monitoring';


--
-- Name: COLUMN webhook_logs.request_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.webhook_logs.request_id IS 'Unique identifier for each webhook request';


--
-- Name: COLUMN webhook_logs.webhook_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.webhook_logs.webhook_type IS 'Type of webhook (payu, stripe, etc.)';


--
-- Name: COLUMN webhook_logs.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.webhook_logs.status IS 'Status of webhook processing (started, success, failed, warning)';


--
-- Name: COLUMN webhook_logs.user_agent; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.webhook_logs.user_agent IS 'User agent from webhook request';


--
-- Name: COLUMN webhook_logs.error_message; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.webhook_logs.error_message IS 'Error message if webhook processing failed';


--
-- Name: quote_address_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_address_history ALTER COLUMN id SET DEFAULT nextval('public.quote_address_history_id_seq'::regclass);


--
-- Name: quote_statuses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_statuses ALTER COLUMN id SET DEFAULT nextval('public.quote_statuses_id_seq'::regclass);


--
-- Name: shipping_routes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_routes ALTER COLUMN id SET DEFAULT nextval('public.shipping_routes_id_seq'::regclass);


--
-- Name: abuse_attempts abuse_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.abuse_attempts
    ADD CONSTRAINT abuse_attempts_pkey PRIMARY KEY (id);


--
-- Name: abuse_patterns abuse_patterns_pattern_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.abuse_patterns
    ADD CONSTRAINT abuse_patterns_pattern_type_key UNIQUE (pattern_type);


--
-- Name: abuse_patterns abuse_patterns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.abuse_patterns
    ADD CONSTRAINT abuse_patterns_pkey PRIMARY KEY (id);


--
-- Name: abuse_responses abuse_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.abuse_responses
    ADD CONSTRAINT abuse_responses_pkey PRIMARY KEY (id);


--
-- Name: active_blocks active_blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.active_blocks
    ADD CONSTRAINT active_blocks_pkey PRIMARY KEY (id);


--
-- Name: active_blocks active_blocks_target_type_target_value_block_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.active_blocks
    ADD CONSTRAINT active_blocks_target_type_target_value_block_type_key UNIQUE (target_type, target_value, block_type);


--
-- Name: addon_services addon_services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addon_services
    ADD CONSTRAINT addon_services_pkey PRIMARY KEY (id);


--
-- Name: addon_services addon_services_service_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addon_services
    ADD CONSTRAINT addon_services_service_key_key UNIQUE (service_key);


--
-- Name: admin_overrides admin_overrides_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_overrides
    ADD CONSTRAINT admin_overrides_pkey PRIMARY KEY (id);


--
-- Name: bank_account_details bank_account_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_account_details
    ADD CONSTRAINT bank_account_details_pkey PRIMARY KEY (id);


--
-- Name: blog_categories blog_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_categories
    ADD CONSTRAINT blog_categories_pkey PRIMARY KEY (id);


--
-- Name: blog_categories blog_categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_categories
    ADD CONSTRAINT blog_categories_slug_key UNIQUE (slug);


--
-- Name: blog_comments blog_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_comments
    ADD CONSTRAINT blog_comments_pkey PRIMARY KEY (id);


--
-- Name: blog_post_tags blog_post_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_post_tags
    ADD CONSTRAINT blog_post_tags_pkey PRIMARY KEY (id);


--
-- Name: blog_post_tags blog_post_tags_post_id_tag_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_post_tags
    ADD CONSTRAINT blog_post_tags_post_id_tag_id_key UNIQUE (post_id, tag_id);


--
-- Name: blog_posts blog_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_pkey PRIMARY KEY (id);


--
-- Name: blog_posts blog_posts_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_slug_key UNIQUE (slug);


--
-- Name: blog_tags blog_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_tags
    ADD CONSTRAINT blog_tags_pkey PRIMARY KEY (id);


--
-- Name: blog_tags blog_tags_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_tags
    ADD CONSTRAINT blog_tags_slug_key UNIQUE (slug);


--
-- Name: cart_abandonment_events cart_abandonment_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_abandonment_events
    ADD CONSTRAINT cart_abandonment_events_pkey PRIMARY KEY (id);


--
-- Name: cart_recovery_analytics cart_recovery_analytics_date_country_user_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_recovery_analytics
    ADD CONSTRAINT cart_recovery_analytics_date_country_user_type_key UNIQUE (date, country, user_type);


--
-- Name: cart_recovery_analytics cart_recovery_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_recovery_analytics
    ADD CONSTRAINT cart_recovery_analytics_pkey PRIMARY KEY (id);


--
-- Name: cart_recovery_attempts cart_recovery_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_recovery_attempts
    ADD CONSTRAINT cart_recovery_attempts_pkey PRIMARY KEY (id);


--
-- Name: checkout_sessions checkout_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkout_sessions
    ADD CONSTRAINT checkout_sessions_pkey PRIMARY KEY (id);


--
-- Name: checkout_sessions checkout_sessions_session_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkout_sessions
    ADD CONSTRAINT checkout_sessions_session_token_key UNIQUE (session_token);


--
-- Name: consolidation_groups consolidation_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consolidation_groups
    ADD CONSTRAINT consolidation_groups_pkey PRIMARY KEY (id);


--
-- Name: continental_pricing continental_pricing_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.continental_pricing
    ADD CONSTRAINT continental_pricing_pkey PRIMARY KEY (id);


--
-- Name: continental_pricing continental_pricing_service_id_continent_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.continental_pricing
    ADD CONSTRAINT continental_pricing_service_id_continent_key UNIQUE (service_id, continent);


--
-- Name: country_configs country_configs_country_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.country_configs
    ADD CONSTRAINT country_configs_country_code_key UNIQUE (country_code);


--
-- Name: country_configs country_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.country_configs
    ADD CONSTRAINT country_configs_pkey PRIMARY KEY (id);


--
-- Name: country_discount_rules country_discount_rules_discount_type_id_country_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.country_discount_rules
    ADD CONSTRAINT country_discount_rules_discount_type_id_country_code_key UNIQUE (discount_type_id, country_code);


--
-- Name: country_discount_rules country_discount_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.country_discount_rules
    ADD CONSTRAINT country_discount_rules_pkey PRIMARY KEY (id);


--
-- Name: country_payment_preferences country_payment_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.country_payment_preferences
    ADD CONSTRAINT country_payment_preferences_pkey PRIMARY KEY (id);


--
-- Name: country_pricing_overrides country_pricing_overrides_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.country_pricing_overrides
    ADD CONSTRAINT country_pricing_overrides_pkey PRIMARY KEY (id);


--
-- Name: country_pricing_overrides country_pricing_overrides_service_id_country_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.country_pricing_overrides
    ADD CONSTRAINT country_pricing_overrides_service_id_country_code_key UNIQUE (service_id, country_code);


--
-- Name: country_settings country_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.country_settings
    ADD CONSTRAINT country_settings_pkey PRIMARY KEY (code);


--
-- Name: customer_delivery_preferences customer_delivery_preferences_order_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_delivery_preferences
    ADD CONSTRAINT customer_delivery_preferences_order_id_key UNIQUE (order_id);


--
-- Name: customer_delivery_preferences customer_delivery_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_delivery_preferences
    ADD CONSTRAINT customer_delivery_preferences_pkey PRIMARY KEY (id);


--
-- Name: customer_discount_usage customer_discount_usage_customer_quote_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_discount_usage
    ADD CONSTRAINT customer_discount_usage_customer_quote_code_unique UNIQUE (customer_id, quote_id, discount_code_id);


--
-- Name: customer_discount_usage customer_discount_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_discount_usage
    ADD CONSTRAINT customer_discount_usage_pkey PRIMARY KEY (id);


--
-- Name: customer_memberships customer_memberships_customer_id_plan_id_status_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_memberships
    ADD CONSTRAINT customer_memberships_customer_id_plan_id_status_key UNIQUE (customer_id, plan_id, status);


--
-- Name: customer_memberships customer_memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_memberships
    ADD CONSTRAINT customer_memberships_pkey PRIMARY KEY (id);


--
-- Name: customer_preferences customer_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_preferences
    ADD CONSTRAINT customer_preferences_pkey PRIMARY KEY (id);


--
-- Name: customer_satisfaction_surveys customer_satisfaction_surveys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_satisfaction_surveys
    ADD CONSTRAINT customer_satisfaction_surveys_pkey PRIMARY KEY (id);


--
-- Name: customs_rules customs_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customs_rules
    ADD CONSTRAINT customs_rules_pkey PRIMARY KEY (id);


--
-- Name: customs_valuation_overrides customs_valuation_overrides_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customs_valuation_overrides
    ADD CONSTRAINT customs_valuation_overrides_pkey PRIMARY KEY (id);


--
-- Name: delivery_addresses delivery_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_addresses
    ADD CONSTRAINT delivery_addresses_pkey PRIMARY KEY (id);


--
-- Name: delivery_orders delivery_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_orders
    ADD CONSTRAINT delivery_orders_pkey PRIMARY KEY (id);


--
-- Name: delivery_provider_configs delivery_provider_configs_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_provider_configs
    ADD CONSTRAINT delivery_provider_configs_code_key UNIQUE (code);


--
-- Name: delivery_provider_configs delivery_provider_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_provider_configs
    ADD CONSTRAINT delivery_provider_configs_pkey PRIMARY KEY (id);


--
-- Name: delivery_webhooks delivery_webhooks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_webhooks
    ADD CONSTRAINT delivery_webhooks_pkey PRIMARY KEY (id);


--
-- Name: discount_application_log discount_application_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discount_application_log
    ADD CONSTRAINT discount_application_log_pkey PRIMARY KEY (id);


--
-- Name: discount_campaigns discount_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discount_campaigns
    ADD CONSTRAINT discount_campaigns_pkey PRIMARY KEY (id);


--
-- Name: discount_codes discount_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discount_codes
    ADD CONSTRAINT discount_codes_code_key UNIQUE (code);


--
-- Name: discount_codes discount_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discount_codes
    ADD CONSTRAINT discount_codes_pkey PRIMARY KEY (id);


--
-- Name: discount_settings discount_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discount_settings
    ADD CONSTRAINT discount_settings_pkey PRIMARY KEY (id);


--
-- Name: discount_settings discount_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discount_settings
    ADD CONSTRAINT discount_settings_setting_key_key UNIQUE (setting_key);


--
-- Name: discount_stacking_rules discount_stacking_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discount_stacking_rules
    ADD CONSTRAINT discount_stacking_rules_pkey PRIMARY KEY (id);


--
-- Name: discount_tiers discount_tiers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discount_tiers
    ADD CONSTRAINT discount_tiers_pkey PRIMARY KEY (id);


--
-- Name: discount_types discount_types_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discount_types
    ADD CONSTRAINT discount_types_code_key UNIQUE (code);


--
-- Name: discount_types discount_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discount_types
    ADD CONSTRAINT discount_types_pkey PRIMARY KEY (id);


--
-- Name: email_messages email_messages_message_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_messages
    ADD CONSTRAINT email_messages_message_id_key UNIQUE (message_id);


--
-- Name: email_messages email_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_messages
    ADD CONSTRAINT email_messages_pkey PRIMARY KEY (id);


--
-- Name: email_settings email_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_settings
    ADD CONSTRAINT email_settings_pkey PRIMARY KEY (id);


--
-- Name: email_settings email_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_settings
    ADD CONSTRAINT email_settings_setting_key_key UNIQUE (setting_key);


--
-- Name: error_logs error_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.error_logs
    ADD CONSTRAINT error_logs_pkey PRIMARY KEY (id);


--
-- Name: escalation_rules escalation_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.escalation_rules
    ADD CONSTRAINT escalation_rules_pkey PRIMARY KEY (id);


--
-- Name: gateway_refunds gateway_refunds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gateway_refunds
    ADD CONSTRAINT gateway_refunds_pkey PRIMARY KEY (id);


--
-- Name: item_revisions item_revisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_revisions
    ADD CONSTRAINT item_revisions_pkey PRIMARY KEY (id);


--
-- Name: manual_analysis_tasks manual_analysis_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manual_analysis_tasks
    ADD CONSTRAINT manual_analysis_tasks_pkey PRIMARY KEY (id);


--
-- Name: market_countries market_countries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_countries
    ADD CONSTRAINT market_countries_pkey PRIMARY KEY (market_id, country_code);


--
-- Name: markets markets_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.markets
    ADD CONSTRAINT markets_code_key UNIQUE (code);


--
-- Name: markets markets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.markets
    ADD CONSTRAINT markets_pkey PRIMARY KEY (id);


--
-- Name: membership_plans membership_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.membership_plans
    ADD CONSTRAINT membership_plans_pkey PRIMARY KEY (id);


--
-- Name: membership_plans membership_plans_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.membership_plans
    ADD CONSTRAINT membership_plans_slug_key UNIQUE (slug);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: notification_logs notification_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_logs
    ADD CONSTRAINT notification_logs_pkey PRIMARY KEY (id);


--
-- Name: order_exceptions order_exceptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_exceptions
    ADD CONSTRAINT order_exceptions_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: order_shipments order_shipments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_shipments
    ADD CONSTRAINT order_shipments_pkey PRIMARY KEY (id);


--
-- Name: order_shipments order_shipments_shipment_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_shipments
    ADD CONSTRAINT order_shipments_shipment_number_key UNIQUE (shipment_number);


--
-- Name: order_status_history order_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: orders orders_tracking_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_tracking_id_key UNIQUE (tracking_id);


--
-- Name: package_events package_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.package_events
    ADD CONSTRAINT package_events_pkey PRIMARY KEY (id);


--
-- Name: payment_adjustments payment_adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_adjustments
    ADD CONSTRAINT payment_adjustments_pkey PRIMARY KEY (id);


--
-- Name: payment_gateways payment_gateways_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_gateways
    ADD CONSTRAINT payment_gateways_code_key UNIQUE (code);


--
-- Name: payment_gateways payment_gateways_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_gateways
    ADD CONSTRAINT payment_gateways_pkey PRIMARY KEY (id);


--
-- Name: payment_health_logs payment_health_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_health_logs
    ADD CONSTRAINT payment_health_logs_pkey PRIMARY KEY (id);


--
-- Name: payment_method_discounts payment_method_discounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_method_discounts
    ADD CONSTRAINT payment_method_discounts_pkey PRIMARY KEY (id);


--
-- Name: payment_reminders payment_reminders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_reminders
    ADD CONSTRAINT payment_reminders_pkey PRIMARY KEY (id);


--
-- Name: payment_transactions payment_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_pkey PRIMARY KEY (id);


--
-- Name: payment_verification_logs payment_verification_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_verification_logs
    ADD CONSTRAINT payment_verification_logs_pkey PRIMARY KEY (id);


--
-- Name: paypal_refund_reasons paypal_refund_reasons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paypal_refund_reasons
    ADD CONSTRAINT paypal_refund_reasons_pkey PRIMARY KEY (code);


--
-- Name: paypal_webhook_events paypal_webhook_events_event_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paypal_webhook_events
    ADD CONSTRAINT paypal_webhook_events_event_id_key UNIQUE (event_id);


--
-- Name: paypal_webhook_events paypal_webhook_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paypal_webhook_events
    ADD CONSTRAINT paypal_webhook_events_pkey PRIMARY KEY (id);


--
-- Name: phone_otps phone_otps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phone_otps
    ADD CONSTRAINT phone_otps_pkey PRIMARY KEY (id);


--
-- Name: pickup_time_slots pickup_time_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pickup_time_slots
    ADD CONSTRAINT pickup_time_slots_pkey PRIMARY KEY (id);


--
-- Name: pricing_calculation_cache pricing_calculation_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_calculation_cache
    ADD CONSTRAINT pricing_calculation_cache_pkey PRIMARY KEY (id);


--
-- Name: pricing_calculation_cache pricing_calculation_cache_service_id_country_code_order_val_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_calculation_cache
    ADD CONSTRAINT pricing_calculation_cache_service_id_country_code_order_val_key UNIQUE (service_id, country_code, order_value);


--
-- Name: pricing_change_approvals pricing_change_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_change_approvals
    ADD CONSTRAINT pricing_change_approvals_pkey PRIMARY KEY (id);


--
-- Name: pricing_change_log pricing_change_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_change_log
    ADD CONSTRAINT pricing_change_log_pkey PRIMARY KEY (id);


--
-- Name: product_classifications product_classifications_classification_code_country_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_classifications
    ADD CONSTRAINT product_classifications_classification_code_country_code_key UNIQUE (classification_code, country_code);


--
-- Name: product_classifications product_classifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_classifications
    ADD CONSTRAINT product_classifications_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_referral_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_referral_code_key UNIQUE (referral_code);


--
-- Name: quote_address_history quote_address_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_address_history
    ADD CONSTRAINT quote_address_history_pkey PRIMARY KEY (id);


--
-- Name: quote_documents quote_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_documents
    ADD CONSTRAINT quote_documents_pkey PRIMARY KEY (id);


--
-- Name: quote_items quote_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_items
    ADD CONSTRAINT quote_items_pkey PRIMARY KEY (id);


--
-- Name: quote_items_v2 quote_items_v2_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_items_v2
    ADD CONSTRAINT quote_items_v2_pkey PRIMARY KEY (id);


--
-- Name: quote_statuses quote_statuses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_statuses
    ADD CONSTRAINT quote_statuses_pkey PRIMARY KEY (id);


--
-- Name: quote_statuses quote_statuses_value_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_statuses
    ADD CONSTRAINT quote_statuses_value_key UNIQUE (value);


--
-- Name: quote_templates quote_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_templates
    ADD CONSTRAINT quote_templates_pkey PRIMARY KEY (id);


--
-- Name: quotes_v2 quotes_v2_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes_v2
    ADD CONSTRAINT quotes_v2_pkey PRIMARY KEY (id);


--
-- Name: quotes_v2 quotes_v2_quote_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes_v2
    ADD CONSTRAINT quotes_v2_quote_number_key UNIQUE (quote_number);


--
-- Name: quotes_v2 quotes_v2_share_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes_v2
    ADD CONSTRAINT quotes_v2_share_token_key UNIQUE (share_token);


--
-- Name: reconciliation_items reconciliation_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_items
    ADD CONSTRAINT reconciliation_items_pkey PRIMARY KEY (id);


--
-- Name: reconciliation_rules reconciliation_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_rules
    ADD CONSTRAINT reconciliation_rules_pkey PRIMARY KEY (id);


--
-- Name: refund_items refund_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund_items
    ADD CONSTRAINT refund_items_pkey PRIMARY KEY (id);


--
-- Name: refund_requests refund_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund_requests
    ADD CONSTRAINT refund_requests_pkey PRIMARY KEY (id);


--
-- Name: regional_pricing regional_pricing_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regional_pricing
    ADD CONSTRAINT regional_pricing_pkey PRIMARY KEY (id);


--
-- Name: regional_pricing regional_pricing_service_id_region_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regional_pricing
    ADD CONSTRAINT regional_pricing_service_id_region_key_key UNIQUE (service_id, region_key);


--
-- Name: rejection_reasons rejection_reasons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rejection_reasons
    ADD CONSTRAINT rejection_reasons_pkey PRIMARY KEY (id);


--
-- Name: route_customs_tiers route_customs_tiers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.route_customs_tiers
    ADD CONSTRAINT route_customs_tiers_pkey PRIMARY KEY (id);


--
-- Name: seller_order_automation seller_order_automation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_order_automation
    ADD CONSTRAINT seller_order_automation_pkey PRIMARY KEY (id);


--
-- Name: share_audit_log share_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.share_audit_log
    ADD CONSTRAINT share_audit_log_pkey PRIMARY KEY (id);


--
-- Name: shipment_items shipment_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipment_items
    ADD CONSTRAINT shipment_items_pkey PRIMARY KEY (id);


--
-- Name: shipment_items shipment_items_shipment_id_order_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipment_items
    ADD CONSTRAINT shipment_items_shipment_id_order_item_id_key UNIQUE (shipment_id, order_item_id);


--
-- Name: shipment_tracking_events shipment_tracking_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipment_tracking_events
    ADD CONSTRAINT shipment_tracking_events_pkey PRIMARY KEY (id);


--
-- Name: shipping_routes shipping_routes_origin_country_destination_country_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_routes
    ADD CONSTRAINT shipping_routes_origin_country_destination_country_key UNIQUE (origin_country, destination_country);


--
-- Name: shipping_routes shipping_routes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_routes
    ADD CONSTRAINT shipping_routes_pkey PRIMARY KEY (id);


--
-- Name: sla_configurations sla_configurations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sla_configurations
    ADD CONSTRAINT sla_configurations_pkey PRIMARY KEY (id);


--
-- Name: sla_configurations sla_configurations_priority_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sla_configurations
    ADD CONSTRAINT sla_configurations_priority_key UNIQUE (priority);


--
-- Name: sla_policies sla_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sla_policies
    ADD CONSTRAINT sla_policies_pkey PRIMARY KEY (id);


--
-- Name: sla_policies sla_policies_priority_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sla_policies
    ADD CONSTRAINT sla_policies_priority_key UNIQUE (priority);


--
-- Name: sms_messages sms_messages_message_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sms_messages
    ADD CONSTRAINT sms_messages_message_id_key UNIQUE (message_id);


--
-- Name: sms_messages sms_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sms_messages
    ADD CONSTRAINT sms_messages_pkey PRIMARY KEY (id);


--
-- Name: status_transitions status_transitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.status_transitions
    ADD CONSTRAINT status_transitions_pkey PRIMARY KEY (id);


--
-- Name: support_assignment_rules support_assignment_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_assignment_rules
    ADD CONSTRAINT support_assignment_rules_pkey PRIMARY KEY (id);


--
-- Name: support_interactions support_interactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_interactions
    ADD CONSTRAINT support_interactions_pkey PRIMARY KEY (id);


--
-- Name: support_system support_system_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_system
    ADD CONSTRAINT support_system_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_setting_key_key UNIQUE (setting_key);


--
-- Name: country_payment_preferences unique_country_gateway; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.country_payment_preferences
    ADD CONSTRAINT unique_country_gateway UNIQUE (country_code, gateway_code);


--
-- Name: country_payment_preferences unique_country_priority; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.country_payment_preferences
    ADD CONSTRAINT unique_country_priority UNIQUE (country_code, priority);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: webhook_logs webhook_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_logs
    ADD CONSTRAINT webhook_logs_pkey PRIMARY KEY (id);


--
-- Name: idx_abuse_attempts_customer_detected; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_abuse_attempts_customer_detected ON public.abuse_attempts USING btree (customer_id, detected_at DESC);


--
-- Name: idx_abuse_attempts_detected_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_abuse_attempts_detected_at ON public.abuse_attempts USING btree (detected_at DESC);


--
-- Name: idx_abuse_attempts_ip_detected; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_abuse_attempts_ip_detected ON public.abuse_attempts USING btree (ip_address, detected_at DESC);


--
-- Name: idx_abuse_attempts_session_detected; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_abuse_attempts_session_detected ON public.abuse_attempts USING btree (session_id, detected_at DESC);


--
-- Name: idx_abuse_attempts_type_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_abuse_attempts_type_severity ON public.abuse_attempts USING btree (abuse_type, severity);


--
-- Name: idx_abuse_responses_applied_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_abuse_responses_applied_at ON public.abuse_responses USING btree (applied_at DESC);


--
-- Name: idx_abuse_responses_attempt_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_abuse_responses_attempt_id ON public.abuse_responses USING btree (abuse_attempt_id);


--
-- Name: idx_active_blocks_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_active_blocks_expires_at ON public.active_blocks USING btree (expires_at) WHERE (expires_at IS NOT NULL);


--
-- Name: idx_active_blocks_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_active_blocks_target ON public.active_blocks USING btree (target_type, target_value);


--
-- Name: idx_addon_services_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_addon_services_active ON public.addon_services USING btree (is_active);


--
-- Name: idx_addon_services_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_addon_services_category ON public.addon_services USING btree (service_category);


--
-- Name: idx_addon_services_display_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_addon_services_display_order ON public.addon_services USING btree (display_order);


--
-- Name: idx_admin_overrides_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_overrides_active ON public.admin_overrides USING btree (is_active);


--
-- Name: idx_admin_overrides_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_overrides_expires ON public.admin_overrides USING btree (expires_at);


--
-- Name: idx_admin_overrides_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_overrides_scope ON public.admin_overrides USING btree (scope, scope_identifier);


--
-- Name: idx_admin_overrides_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_overrides_type ON public.admin_overrides USING btree (override_type);


--
-- Name: idx_automation_retry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_automation_retry ON public.seller_order_automation USING btree (next_retry_at) WHERE (next_retry_at IS NOT NULL);


--
-- Name: idx_automation_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_automation_status ON public.seller_order_automation USING btree (automation_status);


--
-- Name: idx_automation_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_automation_type ON public.seller_order_automation USING btree (automation_type);


--
-- Name: idx_bank_account_details_country_currency; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bank_account_details_country_currency ON public.bank_account_details USING btree (country_code, currency_code);


--
-- Name: idx_bank_account_details_currency_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bank_account_details_currency_code ON public.bank_account_details USING btree (currency_code);


--
-- Name: idx_bank_account_details_destination_country; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bank_account_details_destination_country ON public.bank_account_details USING btree (destination_country);


--
-- Name: idx_bank_accounts_country; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bank_accounts_country ON public.bank_account_details USING btree (country_code);


--
-- Name: idx_bank_accounts_fallback; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bank_accounts_fallback ON public.bank_account_details USING btree (is_fallback);


--
-- Name: idx_blog_categories_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blog_categories_slug ON public.blog_categories USING btree (slug);


--
-- Name: idx_blog_comments_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blog_comments_parent_id ON public.blog_comments USING btree (parent_id);


--
-- Name: idx_blog_comments_post_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blog_comments_post_id ON public.blog_comments USING btree (post_id);


--
-- Name: idx_blog_comments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blog_comments_status ON public.blog_comments USING btree (status);


--
-- Name: idx_blog_posts_author; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blog_posts_author ON public.blog_posts USING btree (author_id);


--
-- Name: idx_blog_posts_author_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blog_posts_author_id ON public.blog_posts USING btree (author_id);


--
-- Name: idx_blog_posts_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blog_posts_category ON public.blog_posts USING btree (category_id);


--
-- Name: idx_blog_posts_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blog_posts_category_id ON public.blog_posts USING btree (category_id);


--
-- Name: idx_blog_posts_featured; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blog_posts_featured ON public.blog_posts USING btree (featured);


--
-- Name: idx_blog_posts_published_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blog_posts_published_at ON public.blog_posts USING btree (published_at);


--
-- Name: idx_blog_posts_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blog_posts_slug ON public.blog_posts USING btree (slug);


--
-- Name: idx_blog_posts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blog_posts_status ON public.blog_posts USING btree (status);


--
-- Name: idx_blog_tags_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blog_tags_slug ON public.blog_tags USING btree (slug);


--
-- Name: idx_campaigns_auto_apply_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaigns_auto_apply_active ON public.discount_campaigns USING btree (auto_apply, is_active, start_date, end_date) WHERE (is_active = true);


--
-- Name: idx_cart_abandonment_abandoned_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cart_abandonment_abandoned_at ON public.cart_abandonment_events USING btree (abandoned_at);


--
-- Name: idx_cart_abandonment_is_recovered; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cart_abandonment_is_recovered ON public.cart_abandonment_events USING btree (is_recovered);


--
-- Name: idx_cart_abandonment_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cart_abandonment_session_id ON public.cart_abandonment_events USING btree (session_id);


--
-- Name: idx_cart_abandonment_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cart_abandonment_user_id ON public.cart_abandonment_events USING btree (user_id);


--
-- Name: idx_cart_recovery_analytics_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cart_recovery_analytics_date ON public.cart_recovery_analytics USING btree (date);


--
-- Name: idx_cart_recovery_attempts_abandonment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cart_recovery_attempts_abandonment_id ON public.cart_recovery_attempts USING btree (abandonment_event_id);


--
-- Name: idx_checkout_sessions_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_checkout_sessions_expires_at ON public.checkout_sessions USING btree (expires_at);


--
-- Name: idx_checkout_sessions_is_guest; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_checkout_sessions_is_guest ON public.checkout_sessions USING btree (is_guest);


--
-- Name: idx_checkout_sessions_session_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_checkout_sessions_session_token ON public.checkout_sessions USING btree (session_token);


--
-- Name: idx_consolidation_groups_shipped_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consolidation_groups_shipped_date ON public.consolidation_groups USING btree (shipped_date) WHERE (shipped_date IS NOT NULL);


--
-- Name: idx_consolidation_groups_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consolidation_groups_status ON public.consolidation_groups USING btree (status);


--
-- Name: idx_consolidation_groups_tracking; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consolidation_groups_tracking ON public.consolidation_groups USING btree (shipping_tracking_number) WHERE (shipping_tracking_number IS NOT NULL);


--
-- Name: idx_consolidation_groups_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consolidation_groups_user ON public.consolidation_groups USING btree (user_id);


--
-- Name: idx_continental_pricing_continent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_continental_pricing_continent ON public.continental_pricing USING btree (continent);


--
-- Name: idx_continental_pricing_service_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_continental_pricing_service_active ON public.continental_pricing USING btree (service_id, is_active);


--
-- Name: idx_country_configs_country_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_country_configs_country_code ON public.country_configs USING btree (country_code);


--
-- Name: idx_country_discount_rules_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_country_discount_rules_lookup ON public.country_discount_rules USING btree (country_code, discount_type_id);


--
-- Name: idx_country_payment_preferences_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_country_payment_preferences_active ON public.country_payment_preferences USING btree (is_active);


--
-- Name: idx_country_payment_preferences_country; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_country_payment_preferences_country ON public.country_payment_preferences USING btree (country_code);


--
-- Name: idx_country_payment_preferences_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_country_payment_preferences_priority ON public.country_payment_preferences USING btree (country_code, priority);


--
-- Name: idx_country_pricing_country; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_country_pricing_country ON public.country_pricing_overrides USING btree (country_code);


--
-- Name: idx_country_pricing_effective; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_country_pricing_effective ON public.country_pricing_overrides USING btree (effective_from, effective_until);


--
-- Name: idx_country_pricing_service_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_country_pricing_service_active ON public.country_pricing_overrides USING btree (service_id, is_active);


--
-- Name: idx_country_rules_auto_apply; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_country_rules_auto_apply ON public.country_discount_rules USING btree (country_code, auto_apply, requires_code) WHERE (auto_apply = true);


--
-- Name: idx_country_rules_priority_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_country_rules_priority_order ON public.country_discount_rules USING btree (country_code, priority DESC, min_order_amount);


--
-- Name: INDEX idx_country_rules_priority_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_country_rules_priority_order IS 'Optimizes country-specific discount rule lookups with ordering';


--
-- Name: idx_country_settings_continent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_country_settings_continent ON public.country_settings USING btree (continent);


--
-- Name: idx_country_settings_currency; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_country_settings_currency ON public.country_settings USING btree (currency);


--
-- Name: idx_country_settings_domestic_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_country_settings_domestic_provider ON public.country_settings USING btree (code, domestic_delivery_provider);


--
-- Name: idx_country_settings_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_country_settings_is_active ON public.country_settings USING btree (is_active);


--
-- Name: idx_country_settings_minimum_payment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_country_settings_minimum_payment ON public.country_settings USING btree (minimum_payment_amount);


--
-- Name: idx_customer_discount_usage_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_discount_usage_campaign ON public.customer_discount_usage USING btree (campaign_id) WHERE (campaign_id IS NOT NULL);


--
-- Name: idx_customer_discount_usage_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_discount_usage_code ON public.customer_discount_usage USING btree (discount_code_id);


--
-- Name: idx_customer_discount_usage_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_discount_usage_customer ON public.customer_discount_usage USING btree (customer_id);


--
-- Name: idx_customer_discount_usage_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_discount_usage_lookup ON public.customer_discount_usage USING btree (customer_id, discount_code_id, used_at DESC);


--
-- Name: INDEX idx_customer_discount_usage_lookup; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_customer_discount_usage_lookup IS 'Optimizes customer usage limit checks';


--
-- Name: idx_customer_discount_usage_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_discount_usage_order ON public.customer_discount_usage USING btree (order_id) WHERE (order_id IS NOT NULL);


--
-- Name: idx_customer_discount_usage_quote; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_discount_usage_quote ON public.customer_discount_usage USING btree (quote_id);


--
-- Name: idx_customer_memberships_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_memberships_customer ON public.customer_memberships USING btree (customer_id);


--
-- Name: idx_customer_memberships_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_memberships_expires ON public.customer_memberships USING btree (expires_at);


--
-- Name: idx_customer_memberships_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_memberships_status ON public.customer_memberships USING btree (status);


--
-- Name: idx_customer_preferences_profile_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_preferences_profile_id ON public.customer_preferences USING btree (profile_id);


--
-- Name: idx_customer_preferences_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_preferences_user_id ON public.customer_preferences USING btree (user_id);


--
-- Name: idx_customer_satisfaction_surveys_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_satisfaction_surveys_created_at ON public.customer_satisfaction_surveys USING btree (created_at);


--
-- Name: idx_customer_satisfaction_surveys_ticket_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_satisfaction_surveys_ticket_id ON public.customer_satisfaction_surveys USING btree (ticket_id);


--
-- Name: idx_customs_overrides_classification_final; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customs_overrides_classification_final ON public.customs_valuation_overrides USING btree (classification_code);


--
-- Name: idx_customs_overrides_country_final; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customs_overrides_country_final ON public.customs_valuation_overrides USING btree (country_code);


--
-- Name: idx_customs_rules_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customs_rules_priority ON public.customs_rules USING btree (priority);


--
-- Name: idx_customs_rules_route; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customs_rules_route ON public.customs_rules USING btree (origin_country, destination_country, is_active, priority);


--
-- Name: idx_customs_valuation_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customs_valuation_created_at ON public.customs_valuation_overrides USING btree (created_at);


--
-- Name: idx_customs_valuation_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customs_valuation_order_id ON public.customs_valuation_overrides USING btree (order_id);


--
-- Name: idx_customs_valuation_quote_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customs_valuation_quote_id ON public.customs_valuation_overrides USING btree (quote_id);


--
-- Name: idx_delivery_addresses_company_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_delivery_addresses_company_name ON public.delivery_addresses USING btree (company_name) WHERE (company_name IS NOT NULL);


--
-- Name: idx_delivery_addresses_is_default; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_delivery_addresses_is_default ON public.delivery_addresses USING btree (is_default);


--
-- Name: idx_delivery_addresses_user_default; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_delivery_addresses_user_default ON public.delivery_addresses USING btree (user_id, is_default) WHERE (is_default = true);


--
-- Name: idx_delivery_addresses_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_delivery_addresses_user_id ON public.delivery_addresses USING btree (user_id);


--
-- Name: idx_delivery_orders_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_delivery_orders_provider ON public.delivery_orders USING btree (provider_code, provider_order_id);


--
-- Name: idx_delivery_orders_quote_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_delivery_orders_quote_id ON public.delivery_orders USING btree (quote_id);


--
-- Name: idx_delivery_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_delivery_orders_status ON public.delivery_orders USING btree (status);


--
-- Name: idx_delivery_orders_tracking; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_delivery_orders_tracking ON public.delivery_orders USING btree (tracking_number);


--
-- Name: idx_delivery_webhooks_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_delivery_webhooks_provider ON public.delivery_webhooks USING btree (provider_code, processed);


--
-- Name: idx_discount_campaigns_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discount_campaigns_active ON public.discount_campaigns USING btree (is_active, start_date, end_date);


--
-- Name: idx_discount_campaigns_date_range; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discount_campaigns_date_range ON public.discount_campaigns USING btree (start_date, end_date, is_active) WHERE (is_active = true);


--
-- Name: INDEX idx_discount_campaigns_date_range; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_discount_campaigns_date_range IS 'Optimizes active campaign queries with date filtering';


--
-- Name: idx_discount_campaigns_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discount_campaigns_dates ON public.discount_campaigns USING btree (start_date, end_date);


--
-- Name: idx_discount_campaigns_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discount_campaigns_type ON public.discount_campaigns USING btree (campaign_type);


--
-- Name: idx_discount_codes_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discount_codes_code ON public.discount_codes USING btree (code);


--
-- Name: idx_discount_codes_code_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discount_codes_code_active ON public.discount_codes USING btree (code, is_active, valid_from, valid_until) WHERE (is_active = true);


--
-- Name: INDEX idx_discount_codes_code_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_discount_codes_code_active IS 'Optimizes discount code validation queries';


--
-- Name: idx_discount_log_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discount_log_customer ON public.discount_application_log USING btree (customer_id, applied_at DESC);


--
-- Name: idx_discount_log_metadata; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discount_log_metadata ON public.discount_application_log USING gin (metadata);


--
-- Name: idx_discount_log_quote; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discount_log_quote ON public.discount_application_log USING btree (quote_id);


--
-- Name: idx_discount_log_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discount_log_type ON public.discount_application_log USING btree (application_type, applied_at DESC);


--
-- Name: idx_discount_stacking_rules_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discount_stacking_rules_priority ON public.discount_stacking_rules USING btree (is_active, priority DESC) WHERE (is_active = true);


--
-- Name: idx_discount_tiers_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discount_tiers_lookup ON public.discount_tiers USING btree (discount_type_id, min_order_value);


--
-- Name: idx_discount_tiers_order_value; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discount_tiers_order_value ON public.discount_tiers USING btree (min_order_value, max_order_value, discount_value DESC);


--
-- Name: idx_discount_tiers_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discount_tiers_priority ON public.discount_tiers USING btree (discount_type_id, priority DESC, min_order_value);


--
-- Name: idx_discount_types_active_conditions; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discount_types_active_conditions ON public.discount_types USING btree (is_active, type) WHERE (is_active = true);


--
-- Name: idx_discount_types_components; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discount_types_components ON public.discount_types USING gin (applicable_components);


--
-- Name: idx_discount_usage_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discount_usage_customer ON public.customer_discount_usage USING btree (customer_id);


--
-- Name: idx_email_messages_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_messages_created_at ON public.email_messages USING btree (created_at DESC);


--
-- Name: idx_email_messages_customer_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_messages_customer_email ON public.email_messages USING btree (customer_email);


--
-- Name: idx_email_messages_direction; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_messages_direction ON public.email_messages USING btree (direction);


--
-- Name: idx_email_messages_from; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_messages_from ON public.email_messages USING btree (from_address);


--
-- Name: idx_email_messages_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_messages_status ON public.email_messages USING btree (status);


--
-- Name: idx_email_messages_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_messages_subject ON public.email_messages USING btree (subject);


--
-- Name: idx_email_messages_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_messages_to ON public.email_messages USING gin (to_addresses);


--
-- Name: idx_email_messages_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_messages_user_id ON public.email_messages USING btree (user_id);


--
-- Name: idx_error_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_error_logs_created_at ON public.error_logs USING btree (created_at);


--
-- Name: idx_error_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_error_logs_user_id ON public.error_logs USING btree (user_id);


--
-- Name: idx_exceptions_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exceptions_pending ON public.order_exceptions USING btree (customer_response_deadline) WHERE (resolution_status = 'pending'::text);


--
-- Name: idx_exceptions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exceptions_status ON public.order_exceptions USING btree (resolution_status);


--
-- Name: idx_exceptions_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exceptions_type ON public.order_exceptions USING btree (exception_type);


--
-- Name: idx_gateway_refunds_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gateway_refunds_date ON public.gateway_refunds USING btree (refund_date);


--
-- Name: idx_gateway_refunds_gateway; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gateway_refunds_gateway ON public.gateway_refunds USING btree (gateway_code);


--
-- Name: idx_gateway_refunds_gateway_refund_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gateway_refunds_gateway_refund_id ON public.gateway_refunds USING btree (gateway_refund_id);


--
-- Name: idx_gateway_refunds_quote; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gateway_refunds_quote ON public.gateway_refunds USING btree (quote_id);


--
-- Name: idx_gateway_refunds_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gateway_refunds_status ON public.gateway_refunds USING btree (status);


--
-- Name: idx_manual_analysis_tasks_quote_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_manual_analysis_tasks_quote_id ON public.manual_analysis_tasks USING btree (quote_id);


--
-- Name: idx_manual_analysis_tasks_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_manual_analysis_tasks_status ON public.manual_analysis_tasks USING btree (status);


--
-- Name: idx_messages_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_created_at ON public.messages USING btree (created_at);


--
-- Name: idx_messages_message_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_message_type ON public.messages USING btree (message_type);


--
-- Name: idx_messages_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_order_id ON public.messages USING btree (order_id);


--
-- Name: idx_messages_order_payment_proof; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_order_payment_proof ON public.messages USING btree (order_id, message_type) WHERE (message_type = 'payment_proof'::text);


--
-- Name: idx_messages_payment_proof; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_payment_proof ON public.messages USING btree (quote_id, message_type) WHERE (message_type = 'payment_proof'::text);


--
-- Name: idx_messages_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_priority ON public.messages USING btree (priority) WHERE ((priority)::text = ANY (ARRAY[('high'::character varying)::text, ('urgent'::character varying)::text]));


--
-- Name: idx_messages_quote_id_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_quote_id_created_at ON public.messages USING btree (quote_id, created_at DESC);


--
-- Name: idx_messages_quote_payment_proof; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_quote_payment_proof ON public.messages USING btree (quote_id, message_type) WHERE (message_type = 'payment_proof'::text);


--
-- Name: idx_messages_recipient_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_recipient_id ON public.messages USING btree (recipient_id);


--
-- Name: idx_messages_sender_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_sender_id ON public.messages USING btree (sender_id);


--
-- Name: idx_messages_sender_recipient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_sender_recipient ON public.messages USING btree (sender_id, recipient_id);


--
-- Name: idx_messages_thread_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_thread_type ON public.messages USING btree (thread_type);


--
-- Name: idx_messages_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_unread ON public.messages USING btree (recipient_id, is_read) WHERE (is_read = false);


--
-- Name: idx_notification_logs_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_logs_order_id ON public.notification_logs USING btree (order_id);


--
-- Name: idx_notification_logs_order_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_logs_order_type ON public.notification_logs USING btree (order_id, notification_type);


--
-- Name: idx_notification_logs_quote_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_logs_quote_id ON public.notification_logs USING btree (quote_id);


--
-- Name: idx_notification_logs_recipient_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_logs_recipient_email ON public.notification_logs USING btree (recipient_email);


--
-- Name: idx_notification_logs_sent_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_logs_sent_at ON public.notification_logs USING btree (sent_at);


--
-- Name: idx_notification_logs_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_logs_type ON public.notification_logs USING btree (notification_type);


--
-- Name: idx_one_primary_country_per_market; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_one_primary_country_per_market ON public.market_countries USING btree (market_id, is_primary_in_market) WHERE (is_primary_in_market = true);


--
-- Name: idx_only_one_primary_market; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_only_one_primary_market ON public.markets USING btree (is_primary) WHERE (is_primary = true);


--
-- Name: idx_order_items_assigned_warehouse; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_assigned_warehouse ON public.order_items USING btree (assigned_warehouse);


--
-- Name: idx_order_items_automation_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_automation_status ON public.order_items USING btree (order_automation_status);


--
-- Name: idx_order_items_item_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_item_status ON public.order_items USING btree (item_status);


--
-- Name: idx_order_items_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_order_id ON public.order_items USING btree (order_id);


--
-- Name: idx_order_items_quote_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_quote_id ON public.order_items USING btree (quote_id) WHERE (quote_id IS NOT NULL);


--
-- Name: idx_order_items_quote_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_quote_item_id ON public.order_items USING btree (quote_item_id);


--
-- Name: idx_order_items_revision_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_revision_pending ON public.order_items USING btree (requires_customer_approval) WHERE (requires_customer_approval = true);


--
-- Name: idx_order_items_seller_platform; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_seller_platform ON public.order_items USING btree (seller_platform);


--
-- Name: idx_order_status_history_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_status_history_created_at ON public.order_status_history USING btree (created_at);


--
-- Name: idx_order_status_history_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_status_history_order_id ON public.order_status_history USING btree (order_id);


--
-- Name: idx_orders_admin_dashboard; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_admin_dashboard ON public.orders USING btree (overall_status, payment_status, created_at DESC);


--
-- Name: INDEX idx_orders_admin_dashboard; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_orders_admin_dashboard IS 'Optimizes order management dashboard queries';


--
-- Name: idx_orders_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_created_at ON public.orders USING btree (created_at);


--
-- Name: idx_orders_customer_history; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_customer_history ON public.orders USING btree (customer_id, created_at DESC) WHERE (customer_id IS NOT NULL);


--
-- Name: INDEX idx_orders_customer_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_orders_customer_history IS 'Optimizes customer order history page';


--
-- Name: idx_orders_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_customer_id ON public.orders USING btree (customer_id);


--
-- Name: idx_orders_delivery_schedule; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_delivery_schedule ON public.orders USING btree (estimated_delivery_date, overall_status) WHERE (estimated_delivery_date IS NOT NULL);


--
-- Name: idx_orders_order_data_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_order_data_gin ON public.orders USING gin (order_data);


--
-- Name: idx_orders_order_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_order_number ON public.orders USING btree (order_number);


--
-- Name: idx_orders_overall_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_overall_status ON public.orders USING btree (overall_status);


--
-- Name: idx_orders_payment_processing; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_payment_processing ON public.orders USING btree (payment_status, payment_completed_at DESC) WHERE (payment_status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text]));


--
-- Name: idx_orders_payment_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_payment_status ON public.orders USING btree (payment_status);


--
-- Name: idx_orders_pending_payments; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_pending_payments ON public.orders USING btree (created_at DESC, total_amount DESC) WHERE ((payment_status = 'pending'::text) AND (overall_status <> 'cancelled'::text));


--
-- Name: idx_orders_primary_warehouse; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_primary_warehouse ON public.orders USING btree (primary_warehouse);


--
-- Name: idx_orders_quote_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_quote_id ON public.orders USING btree (quote_id);


--
-- Name: idx_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_status ON public.orders USING btree (status);


--
-- Name: idx_orders_text_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_text_search ON public.orders USING gin (to_tsvector('english'::regconfig, ((COALESCE(order_number, ''::text) || ' '::text) || COALESCE(customer_notes, ''::text))));


--
-- Name: idx_orders_tracking_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_tracking_id ON public.orders USING btree (tracking_id) WHERE (tracking_id IS NOT NULL);


--
-- Name: idx_orders_tracking_system; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_tracking_system ON public.orders USING btree (tracking_id, overall_status) WHERE (tracking_id IS NOT NULL);


--
-- Name: idx_orders_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_user_id ON public.orders USING btree (user_id);


--
-- Name: idx_orders_warehouse_operations; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_warehouse_operations ON public.orders USING btree (primary_warehouse, overall_status, created_at DESC) WHERE (primary_warehouse IS NOT NULL);


--
-- Name: idx_package_events_consolidation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_package_events_consolidation ON public.package_events USING btree (consolidation_group_id);


--
-- Name: idx_package_events_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_package_events_created_at ON public.package_events USING btree (created_at);


--
-- Name: idx_package_events_package; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_package_events_package ON public.package_events USING btree (package_id);


--
-- Name: idx_package_events_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_package_events_type ON public.package_events USING btree (event_type);


--
-- Name: idx_payment_adjustments_quote; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_adjustments_quote ON public.payment_adjustments USING btree (quote_id);


--
-- Name: idx_payment_adjustments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_adjustments_status ON public.payment_adjustments USING btree (status);


--
-- Name: idx_payment_gateways_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_gateways_priority ON public.payment_gateways USING btree (priority);


--
-- Name: idx_payment_health_logs_alert_count; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_health_logs_alert_count ON public.payment_health_logs USING btree (alert_count);


--
-- Name: idx_payment_health_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_health_logs_created_at ON public.payment_health_logs USING btree (created_at);


--
-- Name: idx_payment_health_logs_overall_health; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_health_logs_overall_health ON public.payment_health_logs USING btree (overall_health);


--
-- Name: idx_payment_health_logs_success_rate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_health_logs_success_rate ON public.payment_health_logs USING btree (success_rate);


--
-- Name: idx_payment_method_discounts_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_method_discounts_active ON public.payment_method_discounts USING btree (payment_method, discount_percentage) WHERE (is_active = true);


--
-- Name: idx_payment_transactions_gateway_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_transactions_gateway_code ON public.payment_transactions USING btree (gateway_code) WHERE (gateway_code IS NOT NULL);


--
-- Name: idx_payment_transactions_gateway_transaction_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_transactions_gateway_transaction_id ON public.payment_transactions USING btree (gateway_transaction_id) WHERE (gateway_transaction_id IS NOT NULL);


--
-- Name: idx_payment_transactions_payment_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_transactions_payment_type ON public.payment_transactions USING btree (payment_type) WHERE (payment_type IS NOT NULL);


--
-- Name: idx_payment_transactions_paypal_capture; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_transactions_paypal_capture ON public.payment_transactions USING btree (paypal_capture_id) WHERE (paypal_capture_id IS NOT NULL);


--
-- Name: idx_payment_transactions_paypal_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_transactions_paypal_order ON public.payment_transactions USING btree (paypal_order_id) WHERE (paypal_order_id IS NOT NULL);


--
-- Name: idx_payment_transactions_quote_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_transactions_quote_id ON public.payment_transactions USING btree (quote_id);


--
-- Name: idx_payment_transactions_reference_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_transactions_reference_number ON public.payment_transactions USING btree (reference_number) WHERE (reference_number IS NOT NULL);


--
-- Name: idx_payment_transactions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_transactions_status ON public.payment_transactions USING btree (status);


--
-- Name: idx_payment_transactions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_transactions_user_id ON public.payment_transactions USING btree (user_id);


--
-- Name: idx_payment_verification_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_verification_logs_created_at ON public.payment_verification_logs USING btree (created_at);


--
-- Name: idx_payment_verification_logs_gateway; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_verification_logs_gateway ON public.payment_verification_logs USING btree (gateway);


--
-- Name: idx_payment_verification_logs_request_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_verification_logs_request_id ON public.payment_verification_logs USING btree (request_id);


--
-- Name: idx_payment_verification_logs_success; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_verification_logs_success ON public.payment_verification_logs USING btree (success);


--
-- Name: idx_payment_verification_logs_transaction_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_verification_logs_transaction_id ON public.payment_verification_logs USING btree (transaction_id);


--
-- Name: idx_paypal_webhook_events_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_paypal_webhook_events_created ON public.paypal_webhook_events USING btree (created_at DESC);


--
-- Name: idx_paypal_webhook_events_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_paypal_webhook_events_event_id ON public.paypal_webhook_events USING btree (event_id);


--
-- Name: idx_paypal_webhook_events_resource; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_paypal_webhook_events_resource ON public.paypal_webhook_events USING btree (resource_type, resource_id);


--
-- Name: idx_phone_otps_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_phone_otps_expires_at ON public.phone_otps USING btree (expires_at);


--
-- Name: idx_phone_otps_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_phone_otps_phone ON public.phone_otps USING btree (phone);


--
-- Name: idx_phone_otps_used_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_phone_otps_used_at ON public.phone_otps USING btree (used_at);


--
-- Name: idx_pricing_approvals_change_log; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pricing_approvals_change_log ON public.pricing_change_approvals USING btree (change_log_id);


--
-- Name: idx_pricing_approvals_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pricing_approvals_status ON public.pricing_change_approvals USING btree (status);


--
-- Name: idx_pricing_cache_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pricing_cache_expires ON public.pricing_calculation_cache USING btree (expires_at);


--
-- Name: idx_pricing_cache_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pricing_cache_lookup ON public.pricing_calculation_cache USING btree (service_id, country_code, order_value);


--
-- Name: idx_pricing_change_log_batch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pricing_change_log_batch_id ON public.pricing_change_log USING btree (batch_id) WHERE (batch_id IS NOT NULL);


--
-- Name: idx_pricing_change_log_change_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pricing_change_log_change_type ON public.pricing_change_log USING btree (change_type);


--
-- Name: idx_pricing_change_log_changed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pricing_change_log_changed_by ON public.pricing_change_log USING btree (changed_by);


--
-- Name: idx_pricing_change_log_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pricing_change_log_created_at ON public.pricing_change_log USING btree (created_at DESC);


--
-- Name: idx_pricing_change_log_identifier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pricing_change_log_identifier ON public.pricing_change_log USING btree (identifier);


--
-- Name: idx_pricing_change_log_service_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pricing_change_log_service_id ON public.pricing_change_log USING btree (service_id);


--
-- Name: idx_pricing_change_log_service_type_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pricing_change_log_service_type_date ON public.pricing_change_log USING btree (service_id, change_type, created_at DESC);


--
-- Name: idx_pricing_change_log_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pricing_change_log_user_date ON public.pricing_change_log USING btree (changed_by, created_at DESC);


--
-- Name: idx_product_classifications_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_classifications_active ON public.product_classifications USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_product_classifications_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_classifications_category ON public.product_classifications USING btree (category);


--
-- Name: idx_product_classifications_classification_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_classifications_classification_code ON public.product_classifications USING btree (classification_code);


--
-- Name: idx_product_classifications_country_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_classifications_country_code ON public.product_classifications USING btree (country_code);


--
-- Name: idx_product_classifications_country_data; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_classifications_country_data ON public.product_classifications USING gin (country_data);


--
-- Name: idx_product_classifications_fts; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_classifications_fts ON public.product_classifications USING gin (to_tsvector('english'::regconfig, (((((((COALESCE(product_name, ''::character varying))::text || ' '::text) || (COALESCE(category, ''::character varying))::text) || ' '::text) || (COALESCE(subcategory, ''::character varying))::text) || ' '::text) || COALESCE(description, ''::text))));


--
-- Name: idx_product_classifications_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_classifications_search ON public.product_classifications USING gin (search_keywords);


--
-- Name: idx_product_classifications_tags; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_classifications_tags ON public.product_classifications USING gin (tags);


--
-- Name: idx_profiles_country; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_country ON public.profiles USING btree (country);


--
-- Name: idx_profiles_country_analytics; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_country_analytics ON public.profiles USING btree (country, created_at DESC) WHERE (country IS NOT NULL);


--
-- Name: INDEX idx_profiles_country_analytics; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_profiles_country_analytics IS 'Optimizes user analytics and country-based reporting';


--
-- Name: idx_profiles_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_email ON public.profiles USING btree (email);


--
-- Name: idx_profiles_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_phone ON public.profiles USING btree (phone);


--
-- Name: idx_profiles_referral_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_referral_code ON public.profiles USING btree (referral_code);


--
-- Name: idx_profiles_search_optimization; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_search_optimization ON public.profiles USING btree (full_name, email) WHERE ((full_name IS NOT NULL) OR (email IS NOT NULL));


--
-- Name: idx_profiles_tags; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_tags ON public.profiles USING gin (to_tsvector('english'::regconfig, COALESCE(tags, ''::text)));


--
-- Name: idx_quote_address_history_changed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quote_address_history_changed_at ON public.quote_address_history USING btree (changed_at);


--
-- Name: idx_quote_address_history_quote_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quote_address_history_quote_id ON public.quote_address_history USING btree (quote_id);


--
-- Name: idx_quote_documents_document_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quote_documents_document_type ON public.quote_documents USING btree (document_type);


--
-- Name: idx_quote_documents_quote_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quote_documents_quote_id ON public.quote_documents USING btree (quote_id);


--
-- Name: idx_quote_documents_uploaded_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quote_documents_uploaded_at ON public.quote_documents USING btree (uploaded_at DESC);


--
-- Name: idx_quote_documents_uploaded_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quote_documents_uploaded_by ON public.quote_documents USING btree (uploaded_by);


--
-- Name: idx_quote_items_quote_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quote_items_quote_id ON public.quote_items USING btree (quote_id);


--
-- Name: idx_quote_items_v2_quote_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quote_items_v2_quote_id ON public.quote_items_v2 USING btree (quote_id);


--
-- Name: idx_quote_templates_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quote_templates_name ON public.quote_templates USING btree (template_name);


--
-- Name: idx_quotes_v2_active_only; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_v2_active_only ON public.quotes_v2 USING btree (created_at DESC, updated_at DESC) WHERE (status <> ALL (ARRAY['expired'::text, 'rejected'::text, 'archived'::text]));


--
-- Name: idx_quotes_v2_calculation_data_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_v2_calculation_data_gin ON public.quotes_v2 USING gin (calculation_data);


--
-- Name: idx_quotes_v2_converted_to_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_v2_converted_to_order_id ON public.quotes_v2 USING btree (converted_to_order_id);


--
-- Name: idx_quotes_v2_costprice_total_origin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_v2_costprice_total_origin ON public.quotes_v2 USING btree (costprice_total_origin);


--
-- Name: idx_quotes_v2_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_v2_created_at ON public.quotes_v2 USING btree (created_at DESC);


--
-- Name: idx_quotes_v2_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_v2_customer_id ON public.quotes_v2 USING btree (customer_id);


--
-- Name: idx_quotes_v2_customer_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_v2_customer_search ON public.quotes_v2 USING btree (customer_name, customer_email) WHERE ((customer_name IS NOT NULL) OR (customer_email IS NOT NULL));


--
-- Name: idx_quotes_v2_delivery_address_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_v2_delivery_address_id ON public.quotes_v2 USING btree (delivery_address_id);


--
-- Name: idx_quotes_v2_discount_codes; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_v2_discount_codes ON public.quotes_v2 USING gin (discount_codes);


--
-- Name: idx_quotes_v2_expiration; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_v2_expiration ON public.quotes_v2 USING btree (expires_at) WHERE ((expires_at IS NOT NULL) AND (status <> ALL (ARRAY['expired'::text, 'rejected'::text])));


--
-- Name: idx_quotes_v2_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_v2_expires_at ON public.quotes_v2 USING btree (expires_at);


--
-- Name: idx_quotes_v2_expiry_check; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_v2_expiry_check ON public.quotes_v2 USING btree (expires_at, status) WHERE ((expires_at IS NOT NULL) AND (status = ANY (ARRAY['sent'::text, 'viewed'::text])));


--
-- Name: idx_quotes_v2_final_total_origin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_v2_final_total_origin ON public.quotes_v2 USING btree (final_total_origin);


--
-- Name: idx_quotes_v2_final_total_origincurrency; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_v2_final_total_origincurrency ON public.quotes_v2 USING btree (final_total_origincurrency);


--
-- Name: idx_quotes_v2_financial_queries; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_v2_financial_queries ON public.quotes_v2 USING btree (status, final_total_origin, total_origin_currency, created_at DESC) WHERE (status = ANY (ARRAY['sent'::text, 'approved'::text, 'paid'::text]));


--
-- Name: INDEX idx_quotes_v2_financial_queries; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_quotes_v2_financial_queries IS 'Optimizes financial reporting and analytics queries';


--
-- Name: idx_quotes_v2_in_cart; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_v2_in_cart ON public.quotes_v2 USING btree (created_by, created_at DESC) WHERE (in_cart = true);


--
-- Name: idx_quotes_v2_options_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_v2_options_updated ON public.quotes_v2 USING btree (options_last_updated_at DESC, options_last_updated_by) WHERE (options_last_updated_at IS NOT NULL);


--
-- Name: idx_quotes_v2_parent_quote_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_v2_parent_quote_id ON public.quotes_v2 USING btree (parent_quote_id);


--
-- Name: idx_quotes_v2_quote_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_v2_quote_number ON public.quotes_v2 USING btree (quote_number);


--
-- Name: idx_quotes_v2_reminder_check; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_v2_reminder_check ON public.quotes_v2 USING btree (status, reminder_count, created_at, last_reminder_at) WHERE ((status = 'sent'::text) AND (converted_to_order_id IS NULL));


--
-- Name: idx_quotes_v2_route_analysis; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_v2_route_analysis ON public.quotes_v2 USING btree (origin_country, destination_country, created_at DESC);


--
-- Name: idx_quotes_v2_share_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_v2_share_token ON public.quotes_v2 USING btree (share_token);


--
-- Name: idx_quotes_v2_shipping_option; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_v2_shipping_option ON public.quotes_v2 USING btree (selected_shipping_option_id) WHERE (selected_shipping_option_id IS NOT NULL);


--
-- Name: idx_quotes_v2_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_v2_status ON public.quotes_v2 USING btree (status);


--
-- Name: idx_quotes_v2_status_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_v2_status_created_at ON public.quotes_v2 USING btree (status, created_at DESC);


--
-- Name: INDEX idx_quotes_v2_status_created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_quotes_v2_status_created_at IS 'Optimizes admin dashboard queries filtering quotes by status and date';


--
-- Name: idx_quotes_v2_status_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_v2_status_expires ON public.quotes_v2 USING btree (status, expires_at);


--
-- Name: idx_quotes_v2_text_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_v2_text_search ON public.quotes_v2 USING gin (to_tsvector('english'::regconfig, ((COALESCE(customer_name, ''::text) || ' '::text) || COALESCE(customer_email, ''::text))));


--
-- Name: idx_quotes_v2_total_origin_currency; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_v2_total_origin_currency ON public.quotes_v2 USING btree (total_origin_currency);


--
-- Name: idx_quotes_v2_total_quote_origincurrency; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_v2_total_quote_origincurrency ON public.quotes_v2 USING btree (total_quote_origincurrency);


--
-- Name: idx_quotes_v2_under_review; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_v2_under_review ON public.quotes_v2 USING btree (status) WHERE (status = 'under_review'::text);


--
-- Name: idx_quotes_v2_user_status_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_v2_user_status_created_at ON public.quotes_v2 USING btree (created_by, status, created_at DESC);


--
-- Name: INDEX idx_quotes_v2_user_status_created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_quotes_v2_user_status_created_at IS 'Optimizes customer dashboard showing user quotes by status';


--
-- Name: idx_reconciliation_items_matched; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reconciliation_items_matched ON public.reconciliation_items USING btree (matched);


--
-- Name: idx_reconciliation_items_payment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reconciliation_items_payment ON public.reconciliation_items USING btree (payment_ledger_id);


--
-- Name: idx_reconciliation_items_reconciliation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reconciliation_items_reconciliation ON public.reconciliation_items USING btree (reconciliation_id);


--
-- Name: idx_reconciliation_items_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reconciliation_items_status ON public.reconciliation_items USING btree (status);


--
-- Name: idx_reconciliation_rules_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reconciliation_rules_active ON public.reconciliation_rules USING btree (is_active);


--
-- Name: idx_refund_items_request; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refund_items_request ON public.refund_items USING btree (refund_request_id);


--
-- Name: idx_refund_items_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refund_items_status ON public.refund_items USING btree (status);


--
-- Name: idx_refund_requests_payment_transaction; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refund_requests_payment_transaction ON public.refund_requests USING btree (payment_transaction_id);


--
-- Name: idx_refund_requests_quote; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refund_requests_quote ON public.refund_requests USING btree (quote_id);


--
-- Name: idx_refund_requests_requested_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refund_requests_requested_at ON public.refund_requests USING btree (requested_at);


--
-- Name: idx_refund_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refund_requests_status ON public.refund_requests USING btree (status);


--
-- Name: idx_refund_requests_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refund_requests_status_created ON public.refund_requests USING btree (status, created_at DESC);


--
-- Name: idx_regional_pricing_countries; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_regional_pricing_countries ON public.regional_pricing USING gin (country_codes);


--
-- Name: idx_regional_pricing_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_regional_pricing_priority ON public.regional_pricing USING btree (priority DESC);


--
-- Name: idx_regional_pricing_service_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_regional_pricing_service_active ON public.regional_pricing USING btree (service_id, is_active);


--
-- Name: idx_rejection_reasons_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rejection_reasons_category ON public.rejection_reasons USING btree (category);


--
-- Name: idx_rejection_reasons_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rejection_reasons_is_active ON public.rejection_reasons USING btree (is_active);


--
-- Name: idx_revisions_approval_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_revisions_approval_status ON public.item_revisions USING btree (customer_approval_status);


--
-- Name: idx_revisions_deadline; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_revisions_deadline ON public.item_revisions USING btree (customer_approval_deadline) WHERE (customer_approval_status = 'pending'::text);


--
-- Name: idx_revisions_order_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_revisions_order_item ON public.item_revisions USING btree (order_item_id);


--
-- Name: idx_route_customs_tiers_price; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_route_customs_tiers_price ON public.route_customs_tiers USING btree (origin_country, destination_country, price_min, price_max);


--
-- Name: idx_route_customs_tiers_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_route_customs_tiers_priority ON public.route_customs_tiers USING btree (origin_country, destination_country, priority_order);


--
-- Name: idx_route_customs_tiers_route; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_route_customs_tiers_route ON public.route_customs_tiers USING btree (origin_country, destination_country);


--
-- Name: idx_route_customs_tiers_weight; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_route_customs_tiers_weight ON public.route_customs_tiers USING btree (origin_country, destination_country, weight_min, weight_max);


--
-- Name: idx_share_audit_log_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_share_audit_log_action ON public.share_audit_log USING btree (action);


--
-- Name: idx_share_audit_log_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_share_audit_log_created_at ON public.share_audit_log USING btree (created_at);


--
-- Name: idx_share_audit_log_quote_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_share_audit_log_quote_id ON public.share_audit_log USING btree (quote_id);


--
-- Name: idx_shipments_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipments_order_id ON public.order_shipments USING btree (order_id);


--
-- Name: idx_shipments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipments_status ON public.order_shipments USING btree (current_status);


--
-- Name: idx_shipments_tracking_international; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipments_tracking_international ON public.order_shipments USING btree (international_tracking_id);


--
-- Name: idx_shipments_tracking_local; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipments_tracking_local ON public.order_shipments USING btree (local_delivery_tracking_id);


--
-- Name: idx_shipments_warehouse; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipments_warehouse ON public.order_shipments USING btree (origin_warehouse);


--
-- Name: idx_shipping_routes_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipping_routes_active ON public.shipping_routes USING btree (is_active);


--
-- Name: idx_shipping_routes_api_config_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipping_routes_api_config_gin ON public.shipping_routes USING gin (api_configuration);


--
-- Name: idx_shipping_routes_destination; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipping_routes_destination ON public.shipping_routes USING btree (destination_country);


--
-- Name: idx_shipping_routes_origin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipping_routes_origin ON public.shipping_routes USING btree (origin_country);


--
-- Name: idx_shipping_routes_shipping_per_kg; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipping_routes_shipping_per_kg ON public.shipping_routes USING btree (shipping_per_kg);


--
-- Name: idx_shipping_routes_tax_config_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipping_routes_tax_config_gin ON public.shipping_routes USING gin (tax_configuration);


--
-- Name: idx_shipping_routes_weight_config_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipping_routes_weight_config_gin ON public.shipping_routes USING gin (weight_configuration);


--
-- Name: idx_sms_messages_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sms_messages_created_at ON public.sms_messages USING btree (created_at DESC);


--
-- Name: idx_sms_messages_customer_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sms_messages_customer_phone ON public.sms_messages USING btree (customer_phone);


--
-- Name: idx_sms_messages_direction; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sms_messages_direction ON public.sms_messages USING btree (direction);


--
-- Name: idx_sms_messages_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sms_messages_provider ON public.sms_messages USING btree (provider);


--
-- Name: idx_sms_messages_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sms_messages_status ON public.sms_messages USING btree (status);


--
-- Name: idx_sms_messages_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sms_messages_user_id ON public.sms_messages USING btree (user_id);


--
-- Name: idx_status_transitions_changed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_status_transitions_changed_at ON public.status_transitions USING btree (changed_at);


--
-- Name: idx_status_transitions_quote_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_status_transitions_quote_id ON public.status_transitions USING btree (quote_id);


--
-- Name: idx_status_transitions_trigger; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_status_transitions_trigger ON public.status_transitions USING btree (trigger);


--
-- Name: idx_support_assignment_rules_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_assignment_rules_active ON public.support_assignment_rules USING btree (is_active);


--
-- Name: idx_support_assignment_rules_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_assignment_rules_priority ON public.support_assignment_rules USING btree (priority DESC);


--
-- Name: idx_support_interactions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_interactions_created_at ON public.support_interactions USING btree (created_at);


--
-- Name: idx_support_interactions_internal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_interactions_internal ON public.support_interactions USING btree (is_internal);


--
-- Name: idx_support_interactions_support_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_interactions_support_id ON public.support_interactions USING btree (support_id);


--
-- Name: idx_support_interactions_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_interactions_type ON public.support_interactions USING btree (interaction_type);


--
-- Name: idx_support_interactions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_interactions_user_id ON public.support_interactions USING btree (user_id);


--
-- Name: idx_support_system_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_system_active ON public.support_system USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_support_system_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_system_created_at ON public.support_system USING btree (created_at);


--
-- Name: idx_support_system_first_response_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_system_first_response_at ON public.support_system USING btree (first_response_at);


--
-- Name: idx_support_system_quote_discussions; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_system_quote_discussions ON public.support_system USING btree (quote_id, system_type) WHERE ((system_type)::text = 'quote_discussion'::text);


--
-- Name: idx_support_system_quote_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_system_quote_id ON public.support_system USING btree (quote_id) WHERE (quote_id IS NOT NULL);


--
-- Name: idx_support_system_sla_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_system_sla_status ON public.support_system USING btree (sla_status);


--
-- Name: idx_support_system_ticket_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_system_ticket_assigned_to ON public.support_system USING gin (((ticket_data -> 'assigned_to'::text))) WHERE ((system_type)::text = 'ticket'::text);


--
-- Name: idx_support_system_ticket_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_system_ticket_category ON public.support_system USING gin (((ticket_data -> 'category'::text))) WHERE ((system_type)::text = 'ticket'::text);


--
-- Name: idx_support_system_ticket_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_system_ticket_priority ON public.support_system USING gin (((ticket_data -> 'priority'::text))) WHERE ((system_type)::text = 'ticket'::text);


--
-- Name: idx_support_system_ticket_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_system_ticket_status ON public.support_system USING gin (((ticket_data -> 'status'::text))) WHERE ((system_type)::text = 'ticket'::text);


--
-- Name: idx_support_system_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_system_type ON public.support_system USING btree (system_type);


--
-- Name: idx_support_system_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_system_user_id ON public.support_system USING btree (user_id);


--
-- Name: idx_system_settings_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_settings_lookup ON public.system_settings USING btree (setting_key, updated_at DESC);


--
-- Name: idx_tracking_events_shipment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tracking_events_shipment ON public.shipment_tracking_events USING btree (shipment_id);


--
-- Name: idx_tracking_events_tier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tracking_events_tier ON public.shipment_tracking_events USING btree (tracking_tier);


--
-- Name: idx_tracking_events_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tracking_events_timestamp ON public.shipment_tracking_events USING btree (event_timestamp DESC);


--
-- Name: idx_user_addresses_country; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_addresses_country ON public.delivery_addresses USING btree (destination_country);


--
-- Name: idx_user_roles_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_roles_is_active ON public.user_roles USING btree (is_active);


--
-- Name: idx_user_roles_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_roles_role ON public.user_roles USING btree (role);


--
-- Name: idx_user_roles_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_roles_user_id ON public.user_roles USING btree (user_id);


--
-- Name: idx_webhook_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_logs_created_at ON public.webhook_logs USING btree (created_at);


--
-- Name: idx_webhook_logs_request_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_logs_request_id ON public.webhook_logs USING btree (request_id);


--
-- Name: idx_webhook_logs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_logs_status ON public.webhook_logs USING btree (status);


--
-- Name: idx_webhook_logs_webhook_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_logs_webhook_type ON public.webhook_logs USING btree (webhook_type);


--
-- Name: orders_with_details _RETURN; Type: RULE; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW public.orders_with_details AS
 SELECT o.id,
    o.order_number,
    o.user_id,
    o.status,
    o.tracking_id,
    o.total_amount,
    o.currency,
    o.payment_method,
    o.payment_status,
    o.amount_paid,
    o.delivery_address,
    o.delivery_method,
    o.estimated_delivery_date,
    o.actual_delivery_date,
    o.order_data,
    o.admin_notes,
    o.customer_notes,
    o.created_at,
    o.updated_at,
    o.shipped_at,
    o.delivered_at,
    count(oi.id) AS item_count,
    COALESCE(sum(oi.total_price), (0)::numeric) AS calculated_total,
    u.email AS customer_email,
    p.full_name AS customer_name,
    p.phone AS customer_phone
   FROM (((public.orders o
     LEFT JOIN public.order_items oi ON ((o.id = oi.order_id)))
     LEFT JOIN auth.users u ON ((o.user_id = u.id)))
     LEFT JOIN public.profiles p ON ((o.user_id = p.id)))
  GROUP BY o.id, u.email, p.full_name, p.phone;


--
-- Name: pricing_summary_admin _RETURN; Type: RULE; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW public.pricing_summary_admin AS
 SELECT s.service_key,
    s.service_name,
    s.default_rate,
    count(DISTINCT cp.continent) AS continental_rules,
    count(DISTINCT rp.region_key) AS regional_rules,
    count(DISTINCT co.country_code) AS country_overrides,
    min(COALESCE(co.rate, rp.rate, cp.rate)) AS min_rate,
    max(COALESCE(co.rate, rp.rate, cp.rate)) AS max_rate,
    s.is_active,
    s.created_at
   FROM (((public.addon_services s
     LEFT JOIN public.continental_pricing cp ON (((s.id = cp.service_id) AND (cp.is_active = true))))
     LEFT JOIN public.regional_pricing rp ON (((s.id = rp.service_id) AND (rp.is_active = true))))
     LEFT JOIN public.country_pricing_overrides co ON (((s.id = co.service_id) AND (co.is_active = true))))
  WHERE (s.is_active = true)
  GROUP BY s.id, s.service_key, s.service_name, s.default_rate, s.is_active, s.created_at
  ORDER BY s.display_order;


--
-- Name: support_system auto_assign_tickets; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER auto_assign_tickets BEFORE INSERT ON public.support_system FOR EACH ROW EXECUTE FUNCTION public.trigger_auto_assignment();


--
-- Name: blog_categories blog_categories_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER blog_categories_updated_at_trigger BEFORE UPDATE ON public.blog_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: blog_posts blog_posts_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER blog_posts_updated_at_trigger BEFORE UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: blog_tags blog_tags_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER blog_tags_updated_at_trigger BEFORE UPDATE ON public.blog_tags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: payment_transactions create_payment_ledger_entry_on_payment; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER create_payment_ledger_entry_on_payment AFTER INSERT OR UPDATE ON public.payment_transactions FOR EACH ROW EXECUTE FUNCTION public.create_payment_ledger_entry_trigger();


--
-- Name: delivery_addresses ensure_profile_before_delivery_address; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER ensure_profile_before_delivery_address BEFORE INSERT ON public.delivery_addresses FOR EACH ROW EXECUTE FUNCTION public.before_address_insert();


--
-- Name: delivery_addresses manage_default_address; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER manage_default_address BEFORE INSERT OR UPDATE OF is_default ON public.delivery_addresses FOR EACH ROW WHEN ((new.is_default = true)) EXECUTE FUNCTION public.ensure_single_default_address();


--
-- Name: quotes_v2 manage_quote_versions; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER manage_quote_versions BEFORE INSERT ON public.quotes_v2 FOR EACH ROW EXECUTE FUNCTION public.increment_quote_version();


--
-- Name: customer_memberships membership_expiry_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER membership_expiry_trigger BEFORE INSERT OR UPDATE ON public.customer_memberships FOR EACH ROW EXECUTE FUNCTION public.update_membership_expiry();


--
-- Name: quotes_v2 set_quote_expiry; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_quote_expiry BEFORE INSERT OR UPDATE ON public.quotes_v2 FOR EACH ROW EXECUTE FUNCTION public.calculate_quote_expiry();


--
-- Name: delivery_orders sync_delivery_status_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sync_delivery_status_trigger AFTER INSERT OR UPDATE OF status ON public.delivery_orders FOR EACH ROW EXECUTE FUNCTION public.sync_delivery_status_to_quote();


--
-- Name: orders track_order_status_changes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER track_order_status_changes AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.track_order_status_change();


--
-- Name: quotes_v2 track_status_changes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER track_status_changes BEFORE UPDATE ON public.quotes_v2 FOR EACH ROW EXECUTE FUNCTION public.track_quote_status_change();


--
-- Name: country_payment_preferences trigger_country_payment_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_country_payment_preferences_updated_at BEFORE UPDATE ON public.country_payment_preferences FOR EACH ROW EXECUTE FUNCTION public.update_country_payment_preferences_updated_at();


--
-- Name: country_pricing_overrides trigger_country_pricing_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_country_pricing_audit AFTER INSERT OR UPDATE ON public.country_pricing_overrides FOR EACH ROW EXECUTE FUNCTION public.trigger_log_country_pricing_change();


--
-- Name: delivery_addresses trigger_handle_default_delivery_address_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_handle_default_delivery_address_insert BEFORE INSERT ON public.delivery_addresses FOR EACH ROW EXECUTE FUNCTION public.handle_default_address();


--
-- Name: delivery_addresses trigger_handle_default_delivery_address_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_handle_default_delivery_address_update BEFORE UPDATE ON public.delivery_addresses FOR EACH ROW EXECUTE FUNCTION public.handle_default_address();


--
-- Name: paypal_webhook_events trigger_paypal_webhook_events_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_paypal_webhook_events_updated_at BEFORE UPDATE ON public.paypal_webhook_events FOR EACH ROW EXECUTE FUNCTION public.trigger_paypal_webhook_events_updated_at();


--
-- Name: quotes_v2 trigger_quote_options_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_quote_options_timestamp BEFORE UPDATE ON public.quotes_v2 FOR EACH ROW EXECUTE FUNCTION public.trigger_update_quote_options_timestamp();


--
-- Name: customer_satisfaction_surveys trigger_update_customer_satisfaction_surveys_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_customer_satisfaction_surveys_updated_at BEFORE UPDATE ON public.customer_satisfaction_surveys FOR EACH ROW EXECUTE FUNCTION public.update_customer_satisfaction_surveys_updated_at();


--
-- Name: quote_documents trigger_update_quote_documents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_quote_documents_updated_at BEFORE UPDATE ON public.quote_documents FOR EACH ROW EXECUTE FUNCTION public.update_quote_documents_updated_at();


--
-- Name: quote_documents trigger_update_quote_has_documents; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_quote_has_documents AFTER INSERT OR DELETE ON public.quote_documents FOR EACH ROW EXECUTE FUNCTION public.update_quote_has_documents();


--
-- Name: route_customs_tiers trigger_update_route_customs_tiers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_route_customs_tiers_updated_at BEFORE UPDATE ON public.route_customs_tiers FOR EACH ROW EXECUTE FUNCTION public.update_route_customs_tiers_updated_at();


--
-- Name: support_interactions trigger_update_sla_on_interaction; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_sla_on_interaction AFTER INSERT ON public.support_interactions FOR EACH ROW EXECUTE FUNCTION public.update_sla_on_interaction();


--
-- Name: support_interactions trigger_update_unread_status; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_unread_status AFTER INSERT ON public.support_interactions FOR EACH ROW EXECUTE FUNCTION public.update_unread_status();


--
-- Name: abuse_attempts update_abuse_attempts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_abuse_attempts_updated_at BEFORE UPDATE ON public.abuse_attempts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: abuse_patterns update_abuse_patterns_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_abuse_patterns_updated_at BEFORE UPDATE ON public.abuse_patterns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: addon_services update_addon_services_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_addon_services_updated_at BEFORE UPDATE ON public.addon_services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: admin_overrides update_admin_overrides_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_admin_overrides_updated_at BEFORE UPDATE ON public.admin_overrides FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: blog_categories update_blog_categories_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_blog_categories_updated_at BEFORE UPDATE ON public.blog_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: blog_comments update_blog_comments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_blog_comments_updated_at BEFORE UPDATE ON public.blog_comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: blog_posts update_blog_posts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: blog_tags update_blog_tags_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_blog_tags_updated_at BEFORE UPDATE ON public.blog_tags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: cart_abandonment_events update_cart_abandonment_events_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_cart_abandonment_events_updated_at BEFORE UPDATE ON public.cart_abandonment_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: cart_recovery_analytics update_cart_recovery_analytics_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_cart_recovery_analytics_updated_at BEFORE UPDATE ON public.cart_recovery_analytics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: cart_recovery_attempts update_cart_recovery_attempts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_cart_recovery_attempts_updated_at BEFORE UPDATE ON public.cart_recovery_attempts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: checkout_sessions update_checkout_sessions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_checkout_sessions_updated_at BEFORE UPDATE ON public.checkout_sessions FOR EACH ROW EXECUTE FUNCTION public.update_checkout_sessions_updated_at();


--
-- Name: consolidation_groups update_consolidation_groups_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_consolidation_groups_updated_at BEFORE UPDATE ON public.consolidation_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: continental_pricing update_continental_pricing_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_continental_pricing_updated_at BEFORE UPDATE ON public.continental_pricing FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: country_configs update_country_configs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_country_configs_updated_at BEFORE UPDATE ON public.country_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: country_pricing_overrides update_country_pricing_overrides_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_country_pricing_overrides_updated_at BEFORE UPDATE ON public.country_pricing_overrides FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: customer_discount_usage update_customer_discount_usage_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_customer_discount_usage_updated_at BEFORE UPDATE ON public.customer_discount_usage FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: customer_memberships update_customer_memberships_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_customer_memberships_updated_at BEFORE UPDATE ON public.customer_memberships FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: customer_preferences update_customer_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_customer_preferences_updated_at BEFORE UPDATE ON public.customer_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: delivery_orders update_delivery_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_delivery_orders_updated_at BEFORE UPDATE ON public.delivery_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: delivery_provider_configs update_delivery_provider_configs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_delivery_provider_configs_updated_at BEFORE UPDATE ON public.delivery_provider_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: discount_campaigns update_discount_campaigns_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_discount_campaigns_updated_at BEFORE UPDATE ON public.discount_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: discount_codes update_discount_codes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_discount_codes_updated_at BEFORE UPDATE ON public.discount_codes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: email_messages update_email_messages_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_email_messages_updated_at BEFORE UPDATE ON public.email_messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: escalation_rules update_escalation_rules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_escalation_rules_updated_at BEFORE UPDATE ON public.escalation_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: order_exceptions update_exceptions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_exceptions_updated_at BEFORE UPDATE ON public.order_exceptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: gateway_refunds update_gateway_refunds_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_gateway_refunds_updated_at BEFORE UPDATE ON public.gateway_refunds FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: markets update_markets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_markets_updated_at BEFORE UPDATE ON public.markets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: membership_plans update_membership_plans_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_membership_plans_updated_at BEFORE UPDATE ON public.membership_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: notification_logs update_notification_logs_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_notification_logs_updated_at_trigger BEFORE UPDATE ON public.notification_logs FOR EACH ROW EXECUTE FUNCTION public.update_notification_logs_updated_at();


--
-- Name: order_items update_order_counters; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_order_counters AFTER INSERT OR DELETE OR UPDATE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.update_order_item_counters();


--
-- Name: order_items update_order_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_order_items_updated_at BEFORE UPDATE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: orders update_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: payment_adjustments update_payment_adjustments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_payment_adjustments_updated_at BEFORE UPDATE ON public.payment_adjustments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: product_classifications update_product_classifications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_product_classifications_updated_at BEFORE UPDATE ON public.product_classifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: quote_items_v2 update_quote_items_v2_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_quote_items_v2_updated_at BEFORE UPDATE ON public.quote_items_v2 FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: quotes_v2 update_quotes_v2_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_quotes_v2_updated_at BEFORE UPDATE ON public.quotes_v2 FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: reconciliation_items update_reconciliation_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_reconciliation_items_updated_at BEFORE UPDATE ON public.reconciliation_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: refund_items update_refund_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_refund_items_updated_at BEFORE UPDATE ON public.refund_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: refund_requests update_refund_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_refund_requests_updated_at BEFORE UPDATE ON public.refund_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: regional_pricing update_regional_pricing_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_regional_pricing_updated_at BEFORE UPDATE ON public.regional_pricing FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: order_shipments update_shipments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_shipments_updated_at BEFORE UPDATE ON public.order_shipments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sms_messages update_sms_messages_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_sms_messages_updated_at BEFORE UPDATE ON public.sms_messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: support_assignment_rules update_support_assignment_rules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_support_assignment_rules_updated_at BEFORE UPDATE ON public.support_assignment_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: support_system update_support_system_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_support_system_updated_at BEFORE UPDATE ON public.support_system FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: blog_post_tags update_tag_usage_count_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tag_usage_count_trigger AFTER INSERT OR DELETE ON public.blog_post_tags FOR EACH ROW EXECUTE FUNCTION public.update_tag_usage_count();


--
-- Name: user_roles update_user_roles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: delivery_addresses validate_address_before_save; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER validate_address_before_save BEFORE INSERT OR UPDATE ON public.delivery_addresses FOR EACH ROW EXECUTE FUNCTION public.validate_address_format();


--
-- Name: shipping_routes validate_delivery_options_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER validate_delivery_options_trigger BEFORE INSERT OR UPDATE ON public.shipping_routes FOR EACH ROW EXECUTE FUNCTION public.validate_delivery_options();


--
-- Name: abuse_attempts abuse_attempts_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.abuse_attempts
    ADD CONSTRAINT abuse_attempts_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES auth.users(id);


--
-- Name: abuse_responses abuse_responses_abuse_attempt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.abuse_responses
    ADD CONSTRAINT abuse_responses_abuse_attempt_id_fkey FOREIGN KEY (abuse_attempt_id) REFERENCES public.abuse_attempts(id);


--
-- Name: bank_account_details bank_account_details_country_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_account_details
    ADD CONSTRAINT bank_account_details_country_code_fkey FOREIGN KEY (country_code) REFERENCES public.country_settings(code);


--
-- Name: blog_comments blog_comments_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_comments
    ADD CONSTRAINT blog_comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.blog_comments(id);


--
-- Name: blog_comments blog_comments_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_comments
    ADD CONSTRAINT blog_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.blog_posts(id) ON DELETE CASCADE;


--
-- Name: blog_comments blog_comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_comments
    ADD CONSTRAINT blog_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: blog_post_tags blog_post_tags_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_post_tags
    ADD CONSTRAINT blog_post_tags_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.blog_posts(id) ON DELETE CASCADE;


--
-- Name: blog_post_tags blog_post_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_post_tags
    ADD CONSTRAINT blog_post_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.blog_tags(id) ON DELETE CASCADE;


--
-- Name: blog_posts blog_posts_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: blog_posts blog_posts_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.blog_categories(id) ON DELETE CASCADE;


--
-- Name: cart_abandonment_events cart_abandonment_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_abandonment_events
    ADD CONSTRAINT cart_abandonment_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: cart_recovery_attempts cart_recovery_attempts_abandonment_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_recovery_attempts
    ADD CONSTRAINT cart_recovery_attempts_abandonment_event_id_fkey FOREIGN KEY (abandonment_event_id) REFERENCES public.cart_abandonment_events(id) ON DELETE CASCADE;


--
-- Name: checkout_sessions checkout_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkout_sessions
    ADD CONSTRAINT checkout_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: consolidation_groups consolidation_groups_consolidated_by_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consolidation_groups
    ADD CONSTRAINT consolidation_groups_consolidated_by_staff_id_fkey FOREIGN KEY (consolidated_by_staff_id) REFERENCES auth.users(id);


--
-- Name: consolidation_groups consolidation_groups_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consolidation_groups
    ADD CONSTRAINT consolidation_groups_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes_v2(id);


--
-- Name: consolidation_groups consolidation_groups_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consolidation_groups
    ADD CONSTRAINT consolidation_groups_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: continental_pricing continental_pricing_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.continental_pricing
    ADD CONSTRAINT continental_pricing_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.addon_services(id) ON DELETE CASCADE;


--
-- Name: country_configs country_configs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.country_configs
    ADD CONSTRAINT country_configs_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: country_discount_rules country_discount_rules_discount_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.country_discount_rules
    ADD CONSTRAINT country_discount_rules_discount_type_id_fkey FOREIGN KEY (discount_type_id) REFERENCES public.discount_types(id) ON DELETE CASCADE;


--
-- Name: country_pricing_overrides country_pricing_overrides_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.country_pricing_overrides
    ADD CONSTRAINT country_pricing_overrides_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.addon_services(id) ON DELETE CASCADE;


--
-- Name: customer_delivery_preferences customer_delivery_preferences_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_delivery_preferences
    ADD CONSTRAINT customer_delivery_preferences_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: customer_delivery_preferences customer_delivery_preferences_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_delivery_preferences
    ADD CONSTRAINT customer_delivery_preferences_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: customer_discount_usage customer_discount_usage_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_discount_usage
    ADD CONSTRAINT customer_discount_usage_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: customer_discount_usage customer_discount_usage_discount_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_discount_usage
    ADD CONSTRAINT customer_discount_usage_discount_code_id_fkey FOREIGN KEY (discount_code_id) REFERENCES public.discount_codes(id) ON DELETE CASCADE;


--
-- Name: customer_memberships customer_memberships_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_memberships
    ADD CONSTRAINT customer_memberships_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: customer_memberships customer_memberships_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_memberships
    ADD CONSTRAINT customer_memberships_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.membership_plans(id);


--
-- Name: customer_preferences customer_preferences_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_preferences
    ADD CONSTRAINT customer_preferences_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: customer_preferences customer_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_preferences
    ADD CONSTRAINT customer_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: customs_valuation_overrides customs_valuation_overrides_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customs_valuation_overrides
    ADD CONSTRAINT customs_valuation_overrides_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id);


--
-- Name: customs_valuation_overrides customs_valuation_overrides_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customs_valuation_overrides
    ADD CONSTRAINT customs_valuation_overrides_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: customs_valuation_overrides customs_valuation_overrides_product_classification_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customs_valuation_overrides
    ADD CONSTRAINT customs_valuation_overrides_product_classification_id_fkey FOREIGN KEY (product_classification_id) REFERENCES public.product_classifications(id);


--
-- Name: delivery_orders delivery_orders_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_orders
    ADD CONSTRAINT delivery_orders_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes_v2(id) ON DELETE CASCADE;


--
-- Name: discount_application_log discount_application_log_country_rule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discount_application_log
    ADD CONSTRAINT discount_application_log_country_rule_id_fkey FOREIGN KEY (country_rule_id) REFERENCES public.country_discount_rules(id) ON DELETE SET NULL;


--
-- Name: discount_application_log discount_application_log_delivery_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discount_application_log
    ADD CONSTRAINT discount_application_log_delivery_order_id_fkey FOREIGN KEY (delivery_order_id) REFERENCES public.delivery_orders(id) ON DELETE SET NULL;


--
-- Name: discount_application_log discount_application_log_discount_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discount_application_log
    ADD CONSTRAINT discount_application_log_discount_code_id_fkey FOREIGN KEY (discount_code_id) REFERENCES public.discount_codes(id) ON DELETE SET NULL;


--
-- Name: discount_application_log discount_application_log_discount_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discount_application_log
    ADD CONSTRAINT discount_application_log_discount_type_id_fkey FOREIGN KEY (discount_type_id) REFERENCES public.discount_types(id) ON DELETE CASCADE;


--
-- Name: discount_application_log discount_application_log_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discount_application_log
    ADD CONSTRAINT discount_application_log_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes_v2(id) ON DELETE SET NULL;


--
-- Name: discount_campaigns discount_campaigns_discount_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discount_campaigns
    ADD CONSTRAINT discount_campaigns_discount_type_id_fkey FOREIGN KEY (discount_type_id) REFERENCES public.discount_types(id);


--
-- Name: discount_codes discount_codes_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discount_codes
    ADD CONSTRAINT discount_codes_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.discount_campaigns(id);


--
-- Name: discount_codes discount_codes_discount_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discount_codes
    ADD CONSTRAINT discount_codes_discount_type_id_fkey FOREIGN KEY (discount_type_id) REFERENCES public.discount_types(id);


--
-- Name: discount_tiers discount_tiers_discount_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discount_tiers
    ADD CONSTRAINT discount_tiers_discount_type_id_fkey FOREIGN KEY (discount_type_id) REFERENCES public.discount_types(id) ON DELETE CASCADE;


--
-- Name: email_messages email_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_messages
    ADD CONSTRAINT email_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: error_logs error_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.error_logs
    ADD CONSTRAINT error_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: country_payment_preferences fk_country_payment_preferences_country; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.country_payment_preferences
    ADD CONSTRAINT fk_country_payment_preferences_country FOREIGN KEY (country_code) REFERENCES public.country_settings(code) ON DELETE CASCADE;


--
-- Name: country_payment_preferences fk_country_payment_preferences_gateway; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.country_payment_preferences
    ADD CONSTRAINT fk_country_payment_preferences_gateway FOREIGN KEY (gateway_code) REFERENCES public.payment_gateways(code) ON DELETE CASCADE;


--
-- Name: customer_satisfaction_surveys fk_customer_satisfaction_surveys_ticket_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_satisfaction_surveys
    ADD CONSTRAINT fk_customer_satisfaction_surveys_ticket_id FOREIGN KEY (ticket_id) REFERENCES public.support_system(id) ON DELETE CASCADE;


--
-- Name: gateway_refunds gateway_refunds_payment_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gateway_refunds
    ADD CONSTRAINT gateway_refunds_payment_transaction_id_fkey FOREIGN KEY (payment_transaction_id) REFERENCES public.payment_transactions(id);


--
-- Name: gateway_refunds gateway_refunds_processed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gateway_refunds
    ADD CONSTRAINT gateway_refunds_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES auth.users(id);


--
-- Name: item_revisions item_revisions_admin_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_revisions
    ADD CONSTRAINT item_revisions_admin_user_id_fkey FOREIGN KEY (admin_user_id) REFERENCES auth.users(id);


--
-- Name: item_revisions item_revisions_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_revisions
    ADD CONSTRAINT item_revisions_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.order_items(id) ON DELETE CASCADE;


--
-- Name: manual_analysis_tasks manual_analysis_tasks_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manual_analysis_tasks
    ADD CONSTRAINT manual_analysis_tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: market_countries market_countries_country_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_countries
    ADD CONSTRAINT market_countries_country_code_fkey FOREIGN KEY (country_code) REFERENCES public.country_settings(code) ON DELETE CASCADE;


--
-- Name: market_countries market_countries_market_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_countries
    ADD CONSTRAINT market_countries_market_id_fkey FOREIGN KEY (market_id) REFERENCES public.markets(id) ON DELETE CASCADE;


--
-- Name: messages messages_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: messages messages_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: messages messages_reply_to_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_reply_to_message_id_fkey FOREIGN KEY (reply_to_message_id) REFERENCES public.messages(id);


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: messages messages_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.profiles(id);


--
-- Name: notification_logs notification_logs_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_logs
    ADD CONSTRAINT notification_logs_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: notification_logs notification_logs_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_logs
    ADD CONSTRAINT notification_logs_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes_v2(id) ON DELETE CASCADE;


--
-- Name: order_exceptions order_exceptions_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_exceptions
    ADD CONSTRAINT order_exceptions_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id);


--
-- Name: order_exceptions order_exceptions_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_exceptions
    ADD CONSTRAINT order_exceptions_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.order_items(id) ON DELETE CASCADE;


--
-- Name: order_exceptions order_exceptions_reported_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_exceptions
    ADD CONSTRAINT order_exceptions_reported_by_fkey FOREIGN KEY (reported_by) REFERENCES auth.users(id);


--
-- Name: order_exceptions order_exceptions_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_exceptions
    ADD CONSTRAINT order_exceptions_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES auth.users(id);


--
-- Name: order_exceptions order_exceptions_shipment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_exceptions
    ADD CONSTRAINT order_exceptions_shipment_id_fkey FOREIGN KEY (shipment_id) REFERENCES public.order_shipments(id) ON DELETE SET NULL;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_quality_inspector_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_quality_inspector_id_fkey FOREIGN KEY (quality_inspector_id) REFERENCES auth.users(id);


--
-- Name: order_items order_items_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes_v2(id) ON DELETE SET NULL;


--
-- Name: order_items order_items_quote_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_quote_item_id_fkey FOREIGN KEY (quote_item_id) REFERENCES public.quote_items_v2(id) ON DELETE SET NULL;


--
-- Name: order_shipments order_shipments_escalated_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_shipments
    ADD CONSTRAINT order_shipments_escalated_to_fkey FOREIGN KEY (escalated_to) REFERENCES auth.users(id);


--
-- Name: order_shipments order_shipments_inspector_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_shipments
    ADD CONSTRAINT order_shipments_inspector_id_fkey FOREIGN KEY (inspector_id) REFERENCES auth.users(id);


--
-- Name: order_shipments order_shipments_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_shipments
    ADD CONSTRAINT order_shipments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_status_history order_status_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: order_status_history order_status_history_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: orders orders_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: orders orders_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes_v2(id) ON DELETE SET NULL;


--
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: package_events package_events_consolidation_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.package_events
    ADD CONSTRAINT package_events_consolidation_group_id_fkey FOREIGN KEY (consolidation_group_id) REFERENCES public.consolidation_groups(id) ON DELETE CASCADE;


--
-- Name: package_events package_events_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.package_events
    ADD CONSTRAINT package_events_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES auth.users(id);


--
-- Name: payment_adjustments payment_adjustments_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_adjustments
    ADD CONSTRAINT payment_adjustments_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id);


--
-- Name: payment_adjustments payment_adjustments_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_adjustments
    ADD CONSTRAINT payment_adjustments_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES auth.users(id);


--
-- Name: payment_transactions payment_transactions_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id);


--
-- Name: payment_transactions payment_transactions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: payment_transactions payment_transactions_parent_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_parent_payment_id_fkey FOREIGN KEY (parent_payment_id) REFERENCES public.payment_transactions(id);


--
-- Name: payment_transactions payment_transactions_reversed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_reversed_by_fkey FOREIGN KEY (reversed_by) REFERENCES auth.users(id);


--
-- Name: payment_transactions payment_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: payment_transactions payment_transactions_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES auth.users(id);


--
-- Name: pricing_calculation_cache pricing_calculation_cache_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_calculation_cache
    ADD CONSTRAINT pricing_calculation_cache_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.addon_services(id) ON DELETE CASCADE;


--
-- Name: pricing_change_approvals pricing_change_approvals_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_change_approvals
    ADD CONSTRAINT pricing_change_approvals_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: pricing_change_approvals pricing_change_approvals_change_log_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_change_approvals
    ADD CONSTRAINT pricing_change_approvals_change_log_id_fkey FOREIGN KEY (change_log_id) REFERENCES public.pricing_change_log(id) ON DELETE CASCADE;


--
-- Name: pricing_change_log pricing_change_log_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_change_log
    ADD CONSTRAINT pricing_change_log_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: pricing_change_log pricing_change_log_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_change_log
    ADD CONSTRAINT pricing_change_log_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.addon_services(id) ON DELETE CASCADE;


--
-- Name: product_classifications product_classifications_country_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_classifications
    ADD CONSTRAINT product_classifications_country_code_fkey FOREIGN KEY (country_code) REFERENCES public.country_configs(country_code);


--
-- Name: product_classifications product_classifications_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_classifications
    ADD CONSTRAINT product_classifications_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: quote_address_history quote_address_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_address_history
    ADD CONSTRAINT quote_address_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.profiles(id);


--
-- Name: quote_documents quote_documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_documents
    ADD CONSTRAINT quote_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: quote_items_v2 quote_items_v2_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_items_v2
    ADD CONSTRAINT quote_items_v2_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes_v2(id) ON DELETE CASCADE;


--
-- Name: quotes_v2 quotes_v2_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes_v2
    ADD CONSTRAINT quotes_v2_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id);


--
-- Name: quotes_v2 quotes_v2_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes_v2
    ADD CONSTRAINT quotes_v2_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: quotes_v2 quotes_v2_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes_v2
    ADD CONSTRAINT quotes_v2_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.profiles(id);


--
-- Name: quotes_v2 quotes_v2_delivery_address_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes_v2
    ADD CONSTRAINT quotes_v2_delivery_address_id_fkey FOREIGN KEY (delivery_address_id) REFERENCES public.delivery_addresses(id);


--
-- Name: quotes_v2 quotes_v2_parent_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes_v2
    ADD CONSTRAINT quotes_v2_parent_quote_id_fkey FOREIGN KEY (parent_quote_id) REFERENCES public.quotes_v2(id);


--
-- Name: reconciliation_items reconciliation_items_matched_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_items
    ADD CONSTRAINT reconciliation_items_matched_by_fkey FOREIGN KEY (matched_by) REFERENCES auth.users(id);


--
-- Name: reconciliation_rules reconciliation_rules_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_rules
    ADD CONSTRAINT reconciliation_rules_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: refund_items refund_items_refund_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund_items
    ADD CONSTRAINT refund_items_refund_request_id_fkey FOREIGN KEY (refund_request_id) REFERENCES public.refund_requests(id);


--
-- Name: refund_requests refund_requests_payment_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund_requests
    ADD CONSTRAINT refund_requests_payment_transaction_id_fkey FOREIGN KEY (payment_transaction_id) REFERENCES public.payment_transactions(id);


--
-- Name: refund_requests refund_requests_processed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund_requests
    ADD CONSTRAINT refund_requests_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES auth.users(id);


--
-- Name: refund_requests refund_requests_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund_requests
    ADD CONSTRAINT refund_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES auth.users(id);


--
-- Name: refund_requests refund_requests_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund_requests
    ADD CONSTRAINT refund_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id);


--
-- Name: regional_pricing regional_pricing_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regional_pricing
    ADD CONSTRAINT regional_pricing_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.addon_services(id) ON DELETE CASCADE;


--
-- Name: seller_order_automation seller_order_automation_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_order_automation
    ADD CONSTRAINT seller_order_automation_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.order_items(id) ON DELETE CASCADE;


--
-- Name: seller_order_automation seller_order_automation_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_order_automation
    ADD CONSTRAINT seller_order_automation_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id);


--
-- Name: share_audit_log share_audit_log_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.share_audit_log
    ADD CONSTRAINT share_audit_log_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes_v2(id) ON DELETE CASCADE;


--
-- Name: share_audit_log share_audit_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.share_audit_log
    ADD CONSTRAINT share_audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: shipment_items shipment_items_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipment_items
    ADD CONSTRAINT shipment_items_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.order_items(id) ON DELETE CASCADE;


--
-- Name: shipment_items shipment_items_shipment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipment_items
    ADD CONSTRAINT shipment_items_shipment_id_fkey FOREIGN KEY (shipment_id) REFERENCES public.order_shipments(id) ON DELETE CASCADE;


--
-- Name: shipment_tracking_events shipment_tracking_events_admin_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipment_tracking_events
    ADD CONSTRAINT shipment_tracking_events_admin_user_id_fkey FOREIGN KEY (admin_user_id) REFERENCES auth.users(id);


--
-- Name: shipment_tracking_events shipment_tracking_events_shipment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipment_tracking_events
    ADD CONSTRAINT shipment_tracking_events_shipment_id_fkey FOREIGN KEY (shipment_id) REFERENCES public.order_shipments(id) ON DELETE CASCADE;


--
-- Name: sms_messages sms_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sms_messages
    ADD CONSTRAINT sms_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: status_transitions status_transitions_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.status_transitions
    ADD CONSTRAINT status_transitions_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES auth.users(id);


--
-- Name: support_interactions support_interactions_support_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_interactions
    ADD CONSTRAINT support_interactions_support_id_fkey FOREIGN KEY (support_id) REFERENCES public.support_system(id) ON DELETE CASCADE;


--
-- Name: support_interactions support_interactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_interactions
    ADD CONSTRAINT support_interactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: support_system support_system_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_system
    ADD CONSTRAINT support_system_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes_v2(id) ON DELETE SET NULL;


--
-- Name: support_system support_system_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_system
    ADD CONSTRAINT support_system_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: delivery_addresses user_addresses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_addresses
    ADD CONSTRAINT user_addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: user_roles user_roles_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: sms_messages Admin can insert SMS messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can insert SMS messages" ON public.sms_messages FOR INSERT WITH CHECK (public.is_admin());


--
-- Name: abuse_attempts Admin can insert abuse attempts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can insert abuse attempts" ON public.abuse_attempts FOR INSERT WITH CHECK (public.is_admin());


--
-- Name: abuse_responses Admin can insert abuse responses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can insert abuse responses" ON public.abuse_responses FOR INSERT WITH CHECK (public.is_admin());


--
-- Name: email_settings Admin can insert email settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can insert email settings" ON public.email_settings FOR INSERT WITH CHECK (((auth.jwt() ->> 'role'::text) = 'admin'::text));


--
-- Name: abuse_patterns Admin can manage abuse patterns; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage abuse patterns" ON public.abuse_patterns USING (public.is_admin());


--
-- Name: active_blocks Admin can manage active blocks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage active blocks" ON public.active_blocks USING (public.is_admin());


--
-- Name: country_discount_rules Admin can manage country discount rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage country discount rules" ON public.country_discount_rules USING (public.is_admin());


--
-- Name: customs_rules Admin can manage customs rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage customs rules" ON public.customs_rules USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: route_customs_tiers Admin can manage customs tiers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage customs tiers" ON public.route_customs_tiers USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: discount_tiers Admin can manage discount tiers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage discount tiers" ON public.discount_tiers USING (public.is_admin());


--
-- Name: escalation_rules Admin can manage escalation rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage escalation rules" ON public.escalation_rules USING (public.is_admin());


--
-- Name: route_customs_tiers Admin can manage route customs tiers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage route customs tiers" ON public.route_customs_tiers USING (((auth.jwt() ->> 'role'::text) = 'admin'::text));


--
-- Name: shipping_routes Admin can manage shipping routes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage shipping routes" ON public.shipping_routes USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: email_settings Admin can read email settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can read email settings" ON public.email_settings FOR SELECT USING (((auth.jwt() ->> 'role'::text) = 'admin'::text));


--
-- Name: sms_messages Admin can update SMS messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can update SMS messages" ON public.sms_messages FOR UPDATE USING (public.is_admin());


--
-- Name: abuse_attempts Admin can update abuse attempts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can update abuse attempts" ON public.abuse_attempts FOR UPDATE USING (public.is_admin());


--
-- Name: email_settings Admin can update email settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can update email settings" ON public.email_settings FOR UPDATE USING (((auth.jwt() ->> 'role'::text) = 'admin'::text));


--
-- Name: abuse_patterns Admin can view abuse patterns; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can view abuse patterns" ON public.abuse_patterns FOR SELECT USING (public.is_admin());


--
-- Name: sms_messages Admin can view all SMS messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can view all SMS messages" ON public.sms_messages FOR SELECT USING (public.is_admin());


--
-- Name: abuse_attempts Admin can view all abuse attempts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can view all abuse attempts" ON public.abuse_attempts FOR SELECT USING (public.is_admin());


--
-- Name: abuse_responses Admin can view all abuse responses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can view all abuse responses" ON public.abuse_responses FOR SELECT USING (public.is_admin());


--
-- Name: active_blocks Admin can view all active blocks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can view all active blocks" ON public.active_blocks FOR SELECT USING (public.is_admin());


--
-- Name: escalation_rules Admin can view escalation rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can view escalation rules" ON public.escalation_rules FOR SELECT USING (public.is_admin());


--
-- Name: addon_services Admin full access on addon_services; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin full access on addon_services" ON public.addon_services USING (public.is_admin());


--
-- Name: continental_pricing Admin full access on continental_pricing; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin full access on continental_pricing" ON public.continental_pricing USING (public.is_admin());


--
-- Name: country_pricing_overrides Admin full access on country_pricing_overrides; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin full access on country_pricing_overrides" ON public.country_pricing_overrides USING (public.is_admin());


--
-- Name: pricing_calculation_cache Admin full access on pricing_calculation_cache; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin full access on pricing_calculation_cache" ON public.pricing_calculation_cache USING (public.is_admin());


--
-- Name: regional_pricing Admin full access on regional_pricing; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin full access on regional_pricing" ON public.regional_pricing USING (public.is_admin());


--
-- Name: discount_settings Admin full access to discount settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin full access to discount settings" ON public.discount_settings TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: quote_items_v2 Admin full access to quote_items_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin full access to quote_items_v2" ON public.quote_items_v2 TO authenticated USING (public.is_admin());


--
-- Name: quotes_v2 Admin full access to quotes_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin full access to quotes_v2" ON public.quotes_v2 TO authenticated USING (public.is_admin());


--
-- Name: payment_health_logs Admin only access to payment health logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin only access to payment health logs" ON public.payment_health_logs USING (public.is_admin());


--
-- Name: payment_verification_logs Admin only access to payment verification logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin only access to payment verification logs" ON public.payment_verification_logs USING (public.is_admin());


--
-- Name: webhook_logs Admin only access to webhook logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin only access to webhook logs" ON public.webhook_logs USING (public.is_admin());


--
-- Name: email_messages Admin users can manage emails; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin users can manage emails" ON public.email_messages USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: paypal_webhook_events Admin users can view PayPal webhook events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin users can view PayPal webhook events" ON public.paypal_webhook_events FOR SELECT TO authenticated USING (public.is_admin());


--
-- Name: email_messages Admin users can view all emails; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin users can view all emails" ON public.email_messages FOR SELECT USING (public.is_admin());


--
-- Name: consolidation_groups Admins can delete any consolidation groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete any consolidation groups" ON public.consolidation_groups FOR DELETE USING (public.is_admin());


--
-- Name: user_roles Admins can delete roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING (((EXISTS ( SELECT 1
   FROM public.user_roles user_roles_1
  WHERE ((user_roles_1.user_id = auth.uid()) AND (user_roles_1.role = 'admin'::text) AND (user_roles_1.is_active = true)))) AND (NOT ((user_id = auth.uid()) AND (role = 'admin'::text)))));


--
-- Name: consolidation_groups Admins can insert consolidation groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert consolidation groups" ON public.consolidation_groups FOR INSERT WITH CHECK (public.is_admin());


--
-- Name: pricing_change_log Admins can insert pricing change logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert pricing change logs" ON public.pricing_change_log FOR INSERT WITH CHECK (public.is_admin());


--
-- Name: user_roles Admins can insert roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_roles user_roles_1
  WHERE ((user_roles_1.user_id = auth.uid()) AND (user_roles_1.role = 'admin'::text) AND (user_roles_1.is_active = true)))));


--
-- Name: customs_valuation_overrides Admins can manage all customs overrides; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all customs overrides" ON public.customs_valuation_overrides TO authenticated USING (public.is_admin());


--
-- Name: customer_delivery_preferences Admins can manage all delivery preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all delivery preferences" ON public.customer_delivery_preferences TO authenticated USING (public.is_admin());


--
-- Name: order_exceptions Admins can manage all exceptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all exceptions" ON public.order_exceptions TO authenticated USING (public.is_admin());


--
-- Name: support_interactions Admins can manage all interactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all interactions" ON public.support_interactions USING (public.is_admin());


--
-- Name: customer_memberships Admins can manage all memberships; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all memberships" ON public.customer_memberships USING (public.is_admin());


--
-- Name: notification_logs Admins can manage all notification logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all notification logs" ON public.notification_logs USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::text) AND (user_roles.is_active = true)))));


--
-- Name: order_status_history Admins can manage all order history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all order history" ON public.order_status_history TO authenticated USING (public.is_admin());


--
-- Name: order_items Admins can manage all order items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all order items" ON public.order_items TO authenticated USING (public.is_admin());


--
-- Name: orders Admins can manage all orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all orders" ON public.orders TO authenticated USING (public.is_admin());


--
-- Name: customer_preferences Admins can manage all preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all preferences" ON public.customer_preferences USING (public.is_admin());


--
-- Name: item_revisions Admins can manage all revisions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all revisions" ON public.item_revisions TO authenticated USING (public.is_admin());


--
-- Name: shipment_items Admins can manage all shipment items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all shipment items" ON public.shipment_items TO authenticated USING (public.is_admin());


--
-- Name: order_shipments Admins can manage all shipments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all shipments" ON public.order_shipments TO authenticated USING (public.is_admin());


--
-- Name: support_system Admins can manage all tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all tickets" ON public.support_system USING (public.is_admin());


--
-- Name: shipment_tracking_events Admins can manage all tracking events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all tracking events" ON public.shipment_tracking_events TO authenticated USING (public.is_admin());


--
-- Name: pricing_change_approvals Admins can manage approvals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage approvals" ON public.pricing_change_approvals USING (public.is_admin());


--
-- Name: seller_order_automation Admins can manage automation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage automation" ON public.seller_order_automation TO authenticated USING (public.is_admin());


--
-- Name: discount_campaigns Admins can manage campaigns; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage campaigns" ON public.discount_campaigns USING (public.is_admin());


--
-- Name: discount_codes Admins can manage discount codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage discount codes" ON public.discount_codes USING (public.is_admin());


--
-- Name: discount_types Admins can manage discount types; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage discount types" ON public.discount_types USING (public.is_admin());


--
-- Name: membership_plans Admins can manage membership plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage membership plans" ON public.membership_plans USING (public.is_admin());


--
-- Name: payment_adjustments Admins can manage payment adjustments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage payment adjustments" ON public.payment_adjustments USING (public.is_admin());


--
-- Name: payment_method_discounts Admins can manage payment discounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage payment discounts" ON public.payment_method_discounts USING (public.is_admin());


--
-- Name: reconciliation_items Admins can manage reconciliation items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage reconciliation items" ON public.reconciliation_items USING (public.is_admin());


--
-- Name: refund_items Admins can manage refund items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage refund items" ON public.refund_items USING (public.is_admin());


--
-- Name: paypal_refund_reasons Admins can manage refund reasons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage refund reasons" ON public.paypal_refund_reasons TO authenticated USING (public.is_admin());


--
-- Name: refund_requests Admins can manage refund requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage refund requests" ON public.refund_requests USING (public.is_admin());


--
-- Name: gateway_refunds Admins can manage refunds; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage refunds" ON public.gateway_refunds USING (public.is_admin());


--
-- Name: discount_stacking_rules Admins can manage stacking rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage stacking rules" ON public.discount_stacking_rules USING (public.is_admin());


--
-- Name: customer_discount_usage Admins can manage usage history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage usage history" ON public.customer_discount_usage USING (public.is_admin());


--
-- Name: profiles Admins can modify all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can modify all profiles" ON public.profiles USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Admins can read all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can read all profiles" ON public.profiles FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (auth.uid() = id)));


--
-- Name: user_roles Admins can update roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.user_roles user_roles_1
  WHERE ((user_roles_1.user_id = auth.uid()) AND (user_roles_1.role = 'admin'::text) AND (user_roles_1.is_active = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_roles user_roles_1
  WHERE ((user_roles_1.user_id = auth.uid()) AND (user_roles_1.role = 'admin'::text) AND (user_roles_1.is_active = true)))));


--
-- Name: cart_abandonment_events Admins can view all abandonment events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all abandonment events" ON public.cart_abandonment_events USING (public.is_admin());


--
-- Name: discount_application_log Admins can view all discount logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all discount logs" ON public.discount_application_log FOR SELECT USING (public.is_admin());


--
-- Name: package_events Admins can view all package events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all package events" ON public.package_events FOR SELECT USING (public.is_admin());


--
-- Name: pricing_change_log Admins can view all pricing change logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all pricing change logs" ON public.pricing_change_log FOR SELECT USING (public.is_admin());


--
-- Name: cart_recovery_attempts Admins can view all recovery attempts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all recovery attempts" ON public.cart_recovery_attempts USING (public.is_admin());


--
-- Name: user_roles Admins can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_roles user_roles_1
  WHERE ((user_roles_1.user_id = auth.uid()) AND (user_roles_1.role = 'admin'::text) AND (user_roles_1.is_active = true)))));


--
-- Name: customer_satisfaction_surveys Admins can view all satisfaction surveys; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all satisfaction surveys" ON public.customer_satisfaction_surveys FOR SELECT USING (public.is_admin());


--
-- Name: cart_recovery_analytics Admins can view recovery analytics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view recovery analytics" ON public.cart_recovery_analytics USING (public.is_admin());


--
-- Name: webhook_logs Admins can view webhook logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view webhook logs" ON public.webhook_logs FOR SELECT USING (public.is_admin());


--
-- Name: bank_account_details Admins have full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins have full access" ON public.bank_account_details USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: country_settings Admins have full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins have full access" ON public.country_settings USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: email_settings Admins have full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins have full access" ON public.email_settings USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: manual_analysis_tasks Admins have full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins have full access" ON public.manual_analysis_tasks USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: messages Admins have full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins have full access" ON public.messages USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: payment_reminders Admins have full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins have full access" ON public.payment_reminders USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: payment_transactions Admins have full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins have full access" ON public.payment_transactions USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: quote_address_history Admins have full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins have full access" ON public.quote_address_history USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: quote_items Admins have full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins have full access" ON public.quote_items USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: quote_templates Admins have full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins have full access" ON public.quote_templates USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: status_transitions Admins have full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins have full access" ON public.status_transitions USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: system_settings Admins have full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins have full access" ON public.system_settings USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: checkout_sessions Admins have full access to checkout sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins have full access to checkout sessions" ON public.checkout_sessions USING (public.is_admin());


--
-- Name: delivery_addresses Admins have full access to delivery addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins have full access to delivery addresses" ON public.delivery_addresses USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: market_countries Admins have full access to market_countries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins have full access to market_countries" ON public.market_countries USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: markets Admins have full access to markets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins have full access to markets" ON public.markets USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: shipping_routes Allow anonymous read access to shipping routes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow anonymous read access to shipping routes" ON public.shipping_routes FOR SELECT TO anon USING (true);


--
-- Name: support_assignment_rules Allow authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users" ON public.support_assignment_rules TO authenticated USING (true) WITH CHECK (true);


--
-- Name: shipping_routes Allow read access to shipping routes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow read access to shipping routes" ON public.shipping_routes FOR SELECT TO authenticated USING (true);


--
-- Name: paypal_refund_reasons Anyone can read refund reasons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read refund reasons" ON public.paypal_refund_reasons FOR SELECT TO authenticated USING ((is_active = true));


--
-- Name: system_settings Anyone can read system settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read system settings" ON public.system_settings FOR SELECT USING (true);


--
-- Name: discount_codes Anyone can validate discount codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can validate discount codes" ON public.discount_codes FOR SELECT USING (true);


--
-- Name: discount_types Anyone can view active discount types; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active discount types" ON public.discount_types FOR SELECT USING (((is_active = true) OR public.is_admin()));


--
-- Name: membership_plans Anyone can view active membership plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active membership plans" ON public.membership_plans FOR SELECT USING ((is_active = true));


--
-- Name: payment_method_discounts Anyone can view payment discounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view payment discounts" ON public.payment_method_discounts FOR SELECT USING (((is_active = true) OR public.is_admin()));


--
-- Name: pickup_time_slots Anyone can view pickup time slots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view pickup time slots" ON public.pickup_time_slots FOR SELECT TO authenticated USING (true);


--
-- Name: addon_services Authenticated read access on addon_services; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated read access on addon_services" ON public.addon_services FOR SELECT USING (((is_active = true) AND (auth.uid() IS NOT NULL)));


--
-- Name: continental_pricing Authenticated read access on continental_pricing; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated read access on continental_pricing" ON public.continental_pricing FOR SELECT USING (((is_active = true) AND (auth.uid() IS NOT NULL)));


--
-- Name: country_pricing_overrides Authenticated read access on country_pricing_overrides; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated read access on country_pricing_overrides" ON public.country_pricing_overrides FOR SELECT USING (((is_active = true) AND ((effective_from IS NULL) OR (effective_from <= now())) AND ((effective_until IS NULL) OR (effective_until > now())) AND (auth.uid() IS NOT NULL)));


--
-- Name: pricing_calculation_cache Authenticated read access on pricing_calculation_cache; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated read access on pricing_calculation_cache" ON public.pricing_calculation_cache FOR SELECT USING (((expires_at > now()) AND (auth.uid() IS NOT NULL)));


--
-- Name: regional_pricing Authenticated read access on regional_pricing; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated read access on regional_pricing" ON public.regional_pricing FOR SELECT USING (((is_active = true) AND (auth.uid() IS NOT NULL)));


--
-- Name: share_audit_log Authenticated users can insert audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert audit logs" ON public.share_audit_log FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: route_customs_tiers Authenticated users can read customs tiers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can read customs tiers" ON public.route_customs_tiers FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: system_settings Authenticated users can upsert settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can upsert settings" ON public.system_settings TO authenticated USING (true) WITH CHECK (true);


--
-- Name: country_configs Country configs readable by authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Country configs readable by authenticated users" ON public.country_configs FOR SELECT TO authenticated USING (true);


--
-- Name: country_configs Country configs writable by admins only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Country configs writable by admins only" ON public.country_configs TO authenticated USING (public.is_admin());


--
-- Name: country_payment_preferences Country payment preferences are manageable by admins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Country payment preferences are manageable by admins" ON public.country_payment_preferences USING (public.is_admin());


--
-- Name: country_payment_preferences Country payment preferences are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Country payment preferences are viewable by everyone" ON public.country_payment_preferences FOR SELECT USING (true);


--
-- Name: quotes_v2 Customers can update own quotes_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers can update own quotes_v2" ON public.quotes_v2 FOR UPDATE TO authenticated USING (((customer_id = auth.uid()) OR (customer_email = (auth.jwt() ->> 'email'::text)))) WITH CHECK (((customer_id = auth.uid()) OR (customer_email = (auth.jwt() ->> 'email'::text))));


--
-- Name: quote_items_v2 Customers can view own quote_items_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers can view own quote_items_v2" ON public.quote_items_v2 FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.quotes_v2
  WHERE ((quotes_v2.id = quote_items_v2.quote_id) AND (quotes_v2.customer_id = auth.uid())))));


--
-- Name: quotes_v2 Customers can view own quotes_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers can view own quotes_v2" ON public.quotes_v2 FOR SELECT TO authenticated USING ((customer_id = auth.uid()));


--
-- Name: quotes_v2 Customers can view quotes by email; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers can view quotes by email" ON public.quotes_v2 FOR SELECT TO authenticated USING ((customer_email = (auth.jwt() ->> 'email'::text)));


--
-- Name: bank_account_details Enable admin full access to bank_account_details; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable admin full access to bank_account_details" ON public.bank_account_details USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: payment_gateways Enable admin full access to payment_gateways; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable admin full access to payment_gateways" ON public.payment_gateways USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: quote_templates Enable admin full access to quote_templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable admin full access to quote_templates" ON public.quote_templates USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: system_settings Enable admin full access to system_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable admin full access to system_settings" ON public.system_settings USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: rejection_reasons Everyone can view active rejection reasons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view active rejection reasons" ON public.rejection_reasons FOR SELECT USING ((is_active = true));


--
-- Name: delivery_webhooks Only admins can access webhooks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can access webhooks" ON public.delivery_webhooks TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: delivery_provider_configs Only admins can manage provider configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can manage provider configs" ON public.delivery_provider_configs TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: product_classifications Product classifications readable by authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Product classifications readable by authenticated users" ON public.product_classifications FOR SELECT TO authenticated USING (((is_active = true) OR public.is_admin()));


--
-- Name: product_classifications Product classifications writable by admins only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Product classifications writable by admins only" ON public.product_classifications TO authenticated USING (public.is_admin());


--
-- Name: shipping_routes Public can read active shipping routes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can read active shipping routes" ON public.shipping_routes FOR SELECT USING ((is_active = true));


--
-- Name: country_discount_rules Public can view active discount rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view active discount rules" ON public.country_discount_rules FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.discount_types dt
  WHERE ((dt.id = country_discount_rules.discount_type_id) AND (dt.is_active = true)))));


--
-- Name: discount_tiers Public can view discount tiers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view discount tiers" ON public.discount_tiers FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.discount_types dt
  WHERE ((dt.id = discount_tiers.discount_type_id) AND (dt.is_active = true)))));


--
-- Name: quotes_v2 Public can view quotes via share token; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view quotes via share token" ON public.quotes_v2 FOR SELECT TO anon USING ((share_token IS NOT NULL));


--
-- Name: country_settings Public read access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read access" ON public.country_settings FOR SELECT USING (true);


--
-- Name: payment_gateways Public read access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read access" ON public.payment_gateways FOR SELECT USING (true);


--
-- Name: addon_services Public read access on addon_services; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read access on addon_services" ON public.addon_services FOR SELECT USING ((is_active = true));


--
-- Name: continental_pricing Public read access on continental_pricing; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read access on continental_pricing" ON public.continental_pricing FOR SELECT USING ((is_active = true));


--
-- Name: country_pricing_overrides Public read access on country_pricing_overrides; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read access on country_pricing_overrides" ON public.country_pricing_overrides FOR SELECT USING (((is_active = true) AND ((effective_from IS NULL) OR (effective_from <= now())) AND ((effective_until IS NULL) OR (effective_until > now()))));


--
-- Name: pricing_calculation_cache Public read access on pricing_calculation_cache; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read access on pricing_calculation_cache" ON public.pricing_calculation_cache FOR SELECT USING ((expires_at > now()));


--
-- Name: regional_pricing Public read access on regional_pricing; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read access on regional_pricing" ON public.regional_pricing FOR SELECT USING ((is_active = true));


--
-- Name: markets Public read access to active markets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read access to active markets" ON public.markets FOR SELECT USING ((is_active = true));


--
-- Name: market_countries Public read access to market_countries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read access to market_countries" ON public.market_countries FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.markets m
  WHERE ((m.id = market_countries.market_id) AND (m.is_active = true)))));


--
-- Name: quotes_v2 Quotes can be viewed with share token; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Quotes can be viewed with share token" ON public.quotes_v2 FOR SELECT USING (((auth.uid() = created_by) OR (auth.uid() = customer_id) OR (share_token = ((current_setting('request.headers'::text, true))::json ->> 'x-share-token'::text)) OR public.is_admin()));


--
-- Name: paypal_webhook_events Service role can manage PayPal webhook events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage PayPal webhook events" ON public.paypal_webhook_events TO service_role USING (true);


--
-- Name: customer_discount_usage Service role can manage discount usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage discount usage" ON public.customer_discount_usage USING (((auth.jwt() ->> 'role'::text) = 'service_role'::text));


--
-- Name: phone_otps Service role can manage phone_otps; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage phone_otps" ON public.phone_otps TO service_role USING (true) WITH CHECK (true);


--
-- Name: webhook_logs Service role can manage webhook logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage webhook logs" ON public.webhook_logs USING ((auth.role() = 'service_role'::text));


--
-- Name: sms_messages Service role has full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role has full access" ON public.sms_messages USING ((auth.role() = 'service_role'::text)) WITH CHECK ((auth.role() = 'service_role'::text));


--
-- Name: email_messages Service role has full access to emails; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role has full access to emails" ON public.email_messages USING ((auth.role() = 'service_role'::text)) WITH CHECK ((auth.role() = 'service_role'::text));


--
-- Name: discount_application_log System can insert discount logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert discount logs" ON public.discount_application_log FOR INSERT WITH CHECK (true);


--
-- Name: order_status_history System can insert status history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert status history" ON public.order_status_history FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: customer_discount_usage System can record discount usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can record discount usage" ON public.customer_discount_usage FOR INSERT WITH CHECK (true);


--
-- Name: checkout_sessions Users can create checkout sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create checkout sessions" ON public.checkout_sessions FOR INSERT WITH CHECK (((auth.uid() = user_id) OR (is_guest = true)));


--
-- Name: customs_valuation_overrides Users can create customs overrides; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create customs overrides" ON public.customs_valuation_overrides FOR INSERT TO authenticated WITH CHECK ((created_by = auth.uid()));


--
-- Name: support_interactions Users can create interactions for their support records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create interactions for their support records" ON public.support_interactions FOR INSERT WITH CHECK (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.support_system
  WHERE ((support_system.id = support_interactions.support_id) AND (support_system.user_id = auth.uid()))))));


--
-- Name: support_interactions Users can create interactions on their tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create interactions on their tickets" ON public.support_interactions FOR INSERT WITH CHECK (((auth.uid() = user_id) OR public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.support_system
  WHERE ((support_system.id = support_interactions.support_id) AND (support_system.user_id = auth.uid()))))));


--
-- Name: consolidation_groups Users can create own consolidation groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own consolidation groups" ON public.consolidation_groups FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: POLICY "Users can create own consolidation groups" ON consolidation_groups; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY "Users can create own consolidation groups" ON public.consolidation_groups IS 'Allows users to create consolidation groups for their own packages';


--
-- Name: customer_satisfaction_surveys Users can create satisfaction surveys for their own tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create satisfaction surveys for their own tickets" ON public.customer_satisfaction_surveys FOR INSERT WITH CHECK ((ticket_id IN ( SELECT support_system.id
   FROM public.support_system
  WHERE (support_system.user_id = auth.uid()))));


--
-- Name: support_system Users can create their own support records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own support records" ON public.support_system FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: support_system Users can create their own tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own tickets" ON public.support_system FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: delivery_addresses Users can delete own addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own addresses" ON public.delivery_addresses FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: consolidation_groups Users can delete own pending consolidation groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own pending consolidation groups" ON public.consolidation_groups FOR DELETE USING (((auth.uid() = user_id) AND (status = 'pending'::text)));


--
-- Name: quote_documents Users can delete their own quote documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own quote documents" ON public.quote_documents FOR DELETE USING (((auth.role() = 'authenticated'::text) AND ((uploaded_by = auth.uid()) OR public.is_admin())));


--
-- Name: delivery_addresses Users can insert own addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own addresses" ON public.delivery_addresses FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: customer_preferences Users can insert own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own preferences" ON public.customer_preferences FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: quote_documents Users can insert quote documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert quote documents" ON public.quote_documents FOR INSERT WITH CHECK (((auth.role() = 'authenticated'::text) AND ((uploaded_by = auth.uid()) OR public.is_admin())));


--
-- Name: orders Users can insert their own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own orders" ON public.orders FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: payment_transactions Users can insert their own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own transactions" ON public.payment_transactions FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: delivery_addresses Users can manage own delivery addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own delivery addresses" ON public.delivery_addresses USING ((auth.uid() = user_id));


--
-- Name: messages Users can manage own messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own messages" ON public.messages USING (((auth.uid() = sender_id) OR (auth.uid() = recipient_id)));


--
-- Name: profiles Users can manage own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own profile" ON public.profiles USING ((auth.uid() = id));


--
-- Name: customer_delivery_preferences Users can manage their delivery preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their delivery preferences" ON public.customer_delivery_preferences TO authenticated USING ((customer_id = auth.uid()));


--
-- Name: order_items Users can manage their order items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their order items" ON public.order_items TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = order_items.order_id) AND (orders.user_id = auth.uid())))));


--
-- Name: customs_valuation_overrides Users can read their own customs overrides; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read their own customs overrides" ON public.customs_valuation_overrides FOR SELECT TO authenticated USING (((created_by = auth.uid()) OR public.is_admin()));


--
-- Name: item_revisions Users can respond to their revisions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can respond to their revisions" ON public.item_revisions FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.order_items oi
     JOIN public.orders o ON ((oi.order_id = o.id)))
  WHERE ((oi.id = item_revisions.order_item_id) AND (o.customer_id = auth.uid())))));


--
-- Name: delivery_addresses Users can update own addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own addresses" ON public.delivery_addresses FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: checkout_sessions Users can update own checkout sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own checkout sessions" ON public.checkout_sessions FOR UPDATE USING (((auth.uid() = user_id) OR ((is_guest = true) AND (session_token = current_setting('app.session_token'::text, true)))));


--
-- Name: consolidation_groups Users can update own consolidation groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own consolidation groups" ON public.consolidation_groups FOR UPDATE USING (((auth.uid() = user_id) OR public.is_admin()));


--
-- Name: customer_memberships Users can update own membership settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own membership settings" ON public.customer_memberships FOR UPDATE USING ((auth.uid() = customer_id)) WITH CHECK ((auth.uid() = customer_id));


--
-- Name: customer_preferences Users can update own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own preferences" ON public.customer_preferences FOR UPDATE USING (((auth.uid() = user_id) OR public.is_admin()));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: order_exceptions Users can update their exception responses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their exception responses" ON public.order_exceptions FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.order_items oi
     JOIN public.orders o ON ((oi.order_id = o.id)))
  WHERE ((oi.id = order_exceptions.order_item_id) AND (o.customer_id = auth.uid())))));


--
-- Name: orders Users can update their own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own orders" ON public.orders FOR UPDATE TO authenticated USING ((user_id = auth.uid()));


--
-- Name: quote_documents Users can update their own quote documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own quote documents" ON public.quote_documents FOR UPDATE USING (((auth.role() = 'authenticated'::text) AND ((uploaded_by = auth.uid()) OR public.is_admin()))) WITH CHECK (((auth.role() = 'authenticated'::text) AND ((uploaded_by = auth.uid()) OR public.is_admin())));


--
-- Name: support_system Users can update their own support records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own support records" ON public.support_system FOR UPDATE USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: bank_account_details Users can view bank accounts for their country; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view bank accounts for their country" ON public.bank_account_details FOR SELECT USING (((is_active = true) AND ((country_code = ( SELECT profiles.country
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) OR (is_fallback = true))));


--
-- Name: shipping_routes Users can view delivery options for active routes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view delivery options for active routes" ON public.shipping_routes FOR SELECT USING (((active = true) AND (delivery_options IS NOT NULL) AND (jsonb_array_length(delivery_options) > 0)));


--
-- Name: support_interactions Users can view interactions for their support records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view interactions for their support records" ON public.support_interactions FOR SELECT USING (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.support_system
  WHERE ((support_system.id = support_interactions.support_id) AND (support_system.user_id = auth.uid()))))));


--
-- Name: cart_abandonment_events Users can view own abandonment events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own abandonment events" ON public.cart_abandonment_events FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: delivery_addresses Users can view own addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own addresses" ON public.delivery_addresses FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: share_audit_log Users can view own audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own audit logs" ON public.share_audit_log FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: checkout_sessions Users can view own checkout sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own checkout sessions" ON public.checkout_sessions FOR SELECT USING (((auth.uid() = user_id) OR (is_guest = true) OR public.is_admin()));


--
-- Name: consolidation_groups Users can view own consolidation groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own consolidation groups" ON public.consolidation_groups FOR SELECT USING (((auth.uid() = user_id) OR public.is_admin()));


--
-- Name: customer_discount_usage Users can view own discount usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own discount usage" ON public.customer_discount_usage FOR SELECT USING (((auth.uid() = customer_id) OR public.is_admin()));


--
-- Name: customer_memberships Users can view own memberships; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own memberships" ON public.customer_memberships FOR SELECT USING (((auth.uid() = customer_id) OR public.is_admin()));


--
-- Name: customer_preferences Users can view own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own preferences" ON public.customer_preferences FOR SELECT USING (((auth.uid() = user_id) OR public.is_admin()));


--
-- Name: pricing_change_log Users can view own pricing changes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own pricing changes" ON public.pricing_change_log FOR SELECT USING ((changed_by = auth.uid()));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: cart_recovery_attempts Users can view own recovery attempts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own recovery attempts" ON public.cart_recovery_attempts FOR SELECT USING ((auth.uid() IN ( SELECT cart_abandonment_events.user_id
   FROM public.cart_abandonment_events
  WHERE (cart_abandonment_events.id = cart_recovery_attempts.abandonment_event_id))));


--
-- Name: quote_documents Users can view quote documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view quote documents" ON public.quote_documents FOR SELECT USING (((auth.role() = 'authenticated'::text) AND ((uploaded_by = auth.uid()) OR public.is_admin() OR ((is_customer_visible = true) AND (EXISTS ( SELECT 1
   FROM public.quotes_v2 q
  WHERE ((q.id = quote_documents.quote_id) AND ((q.customer_email = ( SELECT profiles.email
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))) OR public.is_admin()))))))));


--
-- Name: route_customs_tiers Users can view route customs tiers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view route customs tiers" ON public.route_customs_tiers FOR SELECT USING (((auth.jwt() ->> 'role'::text) = 'admin'::text));


--
-- Name: email_messages Users can view their emails; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their emails" ON public.email_messages FOR SELECT USING (((auth.uid() = user_id) OR (auth.email() = customer_email) OR (auth.email() = ANY (to_addresses))));


--
-- Name: order_exceptions Users can view their exceptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their exceptions" ON public.order_exceptions FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.order_items oi
     JOIN public.orders o ON ((oi.order_id = o.id)))
  WHERE ((oi.id = order_exceptions.order_item_id) AND (o.customer_id = auth.uid())))));


--
-- Name: order_status_history Users can view their order history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their order history" ON public.order_status_history FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = order_status_history.order_id) AND (orders.user_id = auth.uid())))));


--
-- Name: order_items Users can view their order items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their order items" ON public.order_items FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = order_items.order_id) AND (orders.user_id = auth.uid())))));


--
-- Name: discount_application_log Users can view their own discount logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own discount logs" ON public.discount_application_log FOR SELECT USING ((customer_id = auth.uid()));


--
-- Name: customer_discount_usage Users can view their own discount usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own discount usage" ON public.customer_discount_usage FOR SELECT USING ((auth.uid() = customer_id));


--
-- Name: notification_logs Users can view their own notification logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own notification logs" ON public.notification_logs FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = notification_logs.order_id) AND (orders.customer_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.quotes_v2
  WHERE ((quotes_v2.id = notification_logs.quote_id) AND (quotes_v2.customer_id = auth.uid()))))));


--
-- Name: orders Users can view their own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: customer_satisfaction_surveys Users can view their own satisfaction surveys; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own satisfaction surveys" ON public.customer_satisfaction_surveys FOR SELECT USING ((ticket_id IN ( SELECT support_system.id
   FROM public.support_system
  WHERE (support_system.user_id = auth.uid()))));


--
-- Name: support_system Users can view their own support records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own support records" ON public.support_system FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: support_system Users can view their own tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own tickets" ON public.support_system FOR SELECT USING (((auth.uid() = user_id) OR public.is_admin()));


--
-- Name: payment_transactions Users can view their own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own transactions" ON public.payment_transactions FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: item_revisions Users can view their revisions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their revisions" ON public.item_revisions FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.order_items oi
     JOIN public.orders o ON ((oi.order_id = o.id)))
  WHERE ((oi.id = item_revisions.order_item_id) AND (o.customer_id = auth.uid())))));


--
-- Name: shipment_items Users can view their shipment items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their shipment items" ON public.shipment_items FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.order_shipments s
     JOIN public.orders o ON ((s.order_id = o.id)))
  WHERE ((s.id = shipment_items.shipment_id) AND (o.customer_id = auth.uid())))));


--
-- Name: order_shipments Users can view their shipments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their shipments" ON public.order_shipments FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = order_shipments.order_id) AND (orders.customer_id = auth.uid())))));


--
-- Name: support_interactions Users can view their ticket interactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their ticket interactions" ON public.support_interactions FOR SELECT USING (((auth.uid() = user_id) OR public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.support_system
  WHERE ((support_system.id = support_interactions.support_id) AND (support_system.user_id = auth.uid()))))));


--
-- Name: shipment_tracking_events Users can view their tracking events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their tracking events" ON public.shipment_tracking_events FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.order_shipments s
     JOIN public.orders o ON ((s.order_id = o.id)))
  WHERE ((s.id = shipment_tracking_events.shipment_id) AND (o.customer_id = auth.uid())))));


--
-- Name: discount_campaigns View active discount campaigns; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "View active discount campaigns" ON public.discount_campaigns FOR SELECT USING ((((is_active = true) AND (CURRENT_TIMESTAMP >= start_date) AND ((end_date IS NULL) OR (CURRENT_TIMESTAMP <= end_date))) OR public.is_admin()));


--
-- Name: reconciliation_rules View reconciliation rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "View reconciliation rules" ON public.reconciliation_rules FOR SELECT USING (public.is_admin());


--
-- Name: abuse_attempts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.abuse_attempts ENABLE ROW LEVEL SECURITY;

--
-- Name: abuse_patterns; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.abuse_patterns ENABLE ROW LEVEL SECURITY;

--
-- Name: abuse_responses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.abuse_responses ENABLE ROW LEVEL SECURITY;

--
-- Name: active_blocks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.active_blocks ENABLE ROW LEVEL SECURITY;

--
-- Name: addon_services; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.addon_services ENABLE ROW LEVEL SECURITY;

--
-- Name: bank_account_details; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bank_account_details ENABLE ROW LEVEL SECURITY;

--
-- Name: blog_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: blog_categories blog_categories_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY blog_categories_delete_policy ON public.blog_categories FOR DELETE USING (public.is_admin());


--
-- Name: blog_categories blog_categories_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY blog_categories_insert_policy ON public.blog_categories FOR INSERT WITH CHECK (public.is_admin());


--
-- Name: blog_categories blog_categories_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY blog_categories_select_policy ON public.blog_categories FOR SELECT USING (true);


--
-- Name: blog_categories blog_categories_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY blog_categories_update_policy ON public.blog_categories FOR UPDATE USING (public.is_admin());


--
-- Name: blog_comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.blog_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: blog_post_tags; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.blog_post_tags ENABLE ROW LEVEL SECURITY;

--
-- Name: blog_post_tags blog_post_tags_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY blog_post_tags_delete_policy ON public.blog_post_tags FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.blog_posts
  WHERE ((blog_posts.id = blog_post_tags.post_id) AND ((blog_posts.author_id = auth.uid()) OR public.is_admin())))));


--
-- Name: blog_post_tags blog_post_tags_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY blog_post_tags_insert_policy ON public.blog_post_tags FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.blog_posts
  WHERE ((blog_posts.id = blog_post_tags.post_id) AND ((blog_posts.author_id = auth.uid()) OR public.is_admin())))));


--
-- Name: blog_post_tags blog_post_tags_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY blog_post_tags_select_policy ON public.blog_post_tags FOR SELECT USING (true);


--
-- Name: blog_post_tags blog_post_tags_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY blog_post_tags_update_policy ON public.blog_post_tags FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.blog_posts
  WHERE ((blog_posts.id = blog_post_tags.post_id) AND ((blog_posts.author_id = auth.uid()) OR public.is_admin())))));


--
-- Name: blog_posts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

--
-- Name: blog_posts blog_posts_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY blog_posts_delete_policy ON public.blog_posts FOR DELETE USING (((author_id = auth.uid()) OR public.is_admin()));


--
-- Name: blog_posts blog_posts_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY blog_posts_insert_policy ON public.blog_posts FOR INSERT WITH CHECK (((author_id = auth.uid()) OR public.is_admin()));


--
-- Name: blog_posts blog_posts_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY blog_posts_select_policy ON public.blog_posts FOR SELECT USING ((((status)::text = 'published'::text) OR (author_id = auth.uid()) OR public.is_admin()));


--
-- Name: blog_posts blog_posts_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY blog_posts_update_policy ON public.blog_posts FOR UPDATE USING (((author_id = auth.uid()) OR public.is_admin()));


--
-- Name: blog_tags; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.blog_tags ENABLE ROW LEVEL SECURITY;

--
-- Name: blog_tags blog_tags_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY blog_tags_delete_policy ON public.blog_tags FOR DELETE USING (public.is_admin());


--
-- Name: blog_tags blog_tags_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY blog_tags_insert_policy ON public.blog_tags FOR INSERT WITH CHECK (public.is_admin());


--
-- Name: blog_tags blog_tags_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY blog_tags_select_policy ON public.blog_tags FOR SELECT USING (true);


--
-- Name: blog_tags blog_tags_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY blog_tags_update_policy ON public.blog_tags FOR UPDATE USING (public.is_admin());


--
-- Name: cart_abandonment_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cart_abandonment_events ENABLE ROW LEVEL SECURITY;

--
-- Name: cart_recovery_analytics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cart_recovery_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: cart_recovery_attempts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cart_recovery_attempts ENABLE ROW LEVEL SECURITY;

--
-- Name: checkout_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.checkout_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: consolidation_groups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.consolidation_groups ENABLE ROW LEVEL SECURITY;

--
-- Name: continental_pricing; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.continental_pricing ENABLE ROW LEVEL SECURITY;

--
-- Name: country_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.country_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: country_discount_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.country_discount_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: country_payment_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.country_payment_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: country_pricing_overrides; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.country_pricing_overrides ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_delivery_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_delivery_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_discount_usage; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_discount_usage ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_memberships; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_memberships ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_satisfaction_surveys; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_satisfaction_surveys ENABLE ROW LEVEL SECURITY;

--
-- Name: customs_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customs_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: customs_valuation_overrides; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customs_valuation_overrides ENABLE ROW LEVEL SECURITY;

--
-- Name: delivery_addresses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.delivery_addresses ENABLE ROW LEVEL SECURITY;

--
-- Name: delivery_orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.delivery_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: delivery_provider_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.delivery_provider_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: delivery_webhooks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.delivery_webhooks ENABLE ROW LEVEL SECURITY;

--
-- Name: discount_application_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.discount_application_log ENABLE ROW LEVEL SECURITY;

--
-- Name: discount_campaigns; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.discount_campaigns ENABLE ROW LEVEL SECURITY;

--
-- Name: discount_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: discount_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.discount_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: discount_stacking_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.discount_stacking_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: discount_tiers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.discount_tiers ENABLE ROW LEVEL SECURITY;

--
-- Name: discount_types; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.discount_types ENABLE ROW LEVEL SECURITY;

--
-- Name: email_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: email_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: escalation_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.escalation_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: gateway_refunds; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gateway_refunds ENABLE ROW LEVEL SECURITY;

--
-- Name: item_revisions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.item_revisions ENABLE ROW LEVEL SECURITY;

--
-- Name: market_countries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.market_countries ENABLE ROW LEVEL SECURITY;

--
-- Name: markets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;

--
-- Name: membership_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: order_exceptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_exceptions ENABLE ROW LEVEL SECURITY;

--
-- Name: order_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

--
-- Name: order_shipments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_shipments ENABLE ROW LEVEL SECURITY;

--
-- Name: order_status_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

--
-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

--
-- Name: package_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.package_events ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_adjustments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_adjustments ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_gateways; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_health_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_health_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_method_discounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_method_discounts ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_verification_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_verification_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: paypal_refund_reasons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.paypal_refund_reasons ENABLE ROW LEVEL SECURITY;

--
-- Name: paypal_webhook_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.paypal_webhook_events ENABLE ROW LEVEL SECURITY;

--
-- Name: phone_otps; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.phone_otps ENABLE ROW LEVEL SECURITY;

--
-- Name: pickup_time_slots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pickup_time_slots ENABLE ROW LEVEL SECURITY;

--
-- Name: pricing_calculation_cache; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pricing_calculation_cache ENABLE ROW LEVEL SECURITY;

--
-- Name: pricing_change_approvals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pricing_change_approvals ENABLE ROW LEVEL SECURITY;

--
-- Name: pricing_change_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pricing_change_log ENABLE ROW LEVEL SECURITY;

--
-- Name: product_classifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_classifications ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: quote_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quote_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: quote_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;

--
-- Name: quote_items_v2; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quote_items_v2 ENABLE ROW LEVEL SECURITY;

--
-- Name: quote_statuses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quote_statuses ENABLE ROW LEVEL SECURITY;

--
-- Name: quote_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quote_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: quotes_v2; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quotes_v2 ENABLE ROW LEVEL SECURITY;

--
-- Name: reconciliation_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reconciliation_items ENABLE ROW LEVEL SECURITY;

--
-- Name: reconciliation_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reconciliation_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: refund_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.refund_items ENABLE ROW LEVEL SECURITY;

--
-- Name: refund_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: regional_pricing; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.regional_pricing ENABLE ROW LEVEL SECURITY;

--
-- Name: rejection_reasons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rejection_reasons ENABLE ROW LEVEL SECURITY;

--
-- Name: route_customs_tiers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.route_customs_tiers ENABLE ROW LEVEL SECURITY;

--
-- Name: seller_order_automation; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.seller_order_automation ENABLE ROW LEVEL SECURITY;

--
-- Name: share_audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.share_audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: shipment_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shipment_items ENABLE ROW LEVEL SECURITY;

--
-- Name: shipment_tracking_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shipment_tracking_events ENABLE ROW LEVEL SECURITY;

--
-- Name: shipping_routes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shipping_routes ENABLE ROW LEVEL SECURITY;

--
-- Name: sms_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sms_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: support_assignment_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.support_assignment_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: support_interactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.support_interactions ENABLE ROW LEVEL SECURITY;

--
-- Name: support_system; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.support_system ENABLE ROW LEVEL SECURITY;

--
-- Name: system_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: webhook_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

