-- ============================================================================
-- COMPLETE DATABASE MIGRATION - EVERYTHING MISSING
-- This migration includes ALL functions, types, and RLS policies
-- ============================================================================

-- STEP 1: Create missing types
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


-- STEP 2: Create all missing functions  
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
    SET search_path TO 'public'
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
--
CREATE FUNCTION public.create_quote_discussion(p_customer_id uuid, p_quote_id uuid, p_message text, p_category text DEFAULT 'other'::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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
--
CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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
--
CREATE FUNCTION public.request_quote_review(p_quote_id uuid, p_category text, p_description text, p_urgency text DEFAULT 'medium'::text, p_specific_items text[] DEFAULT NULL::text[], p_expected_changes text DEFAULT NULL::text, p_budget_constraint numeric DEFAULT NULL::numeric) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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




-- STEP 3: Enable RLS on all tables
 ALTER TABLE public.abuse_attempts ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.abuse_patterns ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.abuse_responses ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.active_blocks ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.addon_services ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.bank_account_details ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.blog_post_tags ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.blog_tags ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.cart_abandonment_events ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.cart_recovery_analytics ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.cart_recovery_attempts ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.checkout_sessions ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.consolidation_groups ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.continental_pricing ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.country_configs ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.country_discount_rules ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.country_payment_preferences ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.country_pricing_overrides ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.country_settings ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.customer_delivery_preferences ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.customer_discount_usage ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.customer_memberships ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.customer_preferences ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.customer_satisfaction_surveys ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.customs_rules ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.customs_valuation_overrides ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.delivery_addresses ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.delivery_provider_configs ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.delivery_webhooks ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.discount_application_log ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.discount_campaigns ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.discount_settings ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.discount_stacking_rules ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.discount_tiers ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.discount_types ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.email_messages ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.escalation_rules ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.gateway_refunds ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.item_revisions ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.manual_analysis_tasks ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.market_countries ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.ncm_configurations ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.order_exceptions ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.order_shipments ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.package_events ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.payment_adjustments ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.payment_health_logs ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.payment_method_discounts ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.payment_reminders ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.payment_verification_logs ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.paypal_refund_reasons ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.paypal_webhook_events ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.phone_otps ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.pickup_time_slots ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.pricing_calculation_cache ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.pricing_change_approvals ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.pricing_change_log ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.product_classifications ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.quote_address_history ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.quote_documents ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.quote_items_v2 ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.quote_templates ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.quotes_v2 ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.reconciliation_items ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.reconciliation_rules ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.refund_items ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.regional_pricing ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.rejection_reasons ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.route_customs_tiers ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.seller_order_automation ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.share_audit_log ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.shipment_items ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.shipment_tracking_events ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.shipping_routes ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.sms_messages ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.status_transitions ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.support_assignment_rules ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.support_interactions ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.support_system ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;


-- STEP 4: Create RLS policies (first 50 to avoid size limits)
 CREATE POLICY "Admin can insert abuse attempts" ON public.abuse_attempts FOR INSERT TO public WITH CHECK (is_admin());
 CREATE POLICY "Admin can update abuse attempts" ON public.abuse_attempts FOR UPDATE TO public USING (is_admin());
 CREATE POLICY "Admin can view all abuse attempts" ON public.abuse_attempts FOR SELECT TO public USING (is_admin());
 CREATE POLICY "Admin can manage abuse patterns" ON public.abuse_patterns FOR ALL TO public USING (is_admin());
 CREATE POLICY "Admin can view abuse patterns" ON public.abuse_patterns FOR SELECT TO public USING (is_admin());
 CREATE POLICY "Admin can insert abuse responses" ON public.abuse_responses FOR INSERT TO public WITH CHECK (is_admin());
 CREATE POLICY "Admin can view all abuse responses" ON public.abuse_responses FOR SELECT TO public USING (is_admin());
 CREATE POLICY "Admin can manage active blocks" ON public.active_blocks FOR ALL TO public USING (is_admin());
 CREATE POLICY "Admin can view all active blocks" ON public.active_blocks FOR SELECT TO public USING (is_admin());
 CREATE POLICY "Admin full access on addon_services" ON public.addon_services FOR ALL TO public USING (is_admin());
 CREATE POLICY "Authenticated read access on addon_services" ON public.addon_services FOR SELECT TO public USING (((is_active = true) AND (auth.uid() IS NOT NULL)));
 CREATE POLICY "Public read access on addon_services" ON public.addon_services FOR SELECT TO public USING ((is_active = true));
 CREATE POLICY "Admins have full access" ON public.bank_account_details FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
 CREATE POLICY "Enable admin full access to bank_account_details" ON public.bank_account_details FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
 CREATE POLICY "Users can view bank accounts for their country" ON public.bank_account_details FOR SELECT TO public USING (((is_active = true) AND ((country_code = ( SELECT profiles.country                                                                                                                       +
 CREATE POLICY "blog_categories_delete_policy" ON public.blog_categories FOR DELETE TO public USING (is_admin());
 CREATE POLICY "blog_categories_insert_policy" ON public.blog_categories FOR INSERT TO public WITH CHECK (is_admin());
 CREATE POLICY "blog_categories_select_policy" ON public.blog_categories FOR SELECT TO public USING (true);
 CREATE POLICY "blog_categories_update_policy" ON public.blog_categories FOR UPDATE TO public USING (is_admin());
 CREATE POLICY "blog_post_tags_delete_policy" ON public.blog_post_tags FOR DELETE TO public USING ((EXISTS ( SELECT 1                                                                                                                                                                                               +
 CREATE POLICY "blog_post_tags_insert_policy" ON public.blog_post_tags FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1                                                                                                                                                                                          +
 CREATE POLICY "blog_post_tags_select_policy" ON public.blog_post_tags FOR SELECT TO public USING (true);
 CREATE POLICY "blog_post_tags_update_policy" ON public.blog_post_tags FOR UPDATE TO public USING ((EXISTS ( SELECT 1                                                                                                                                                                                               +
 CREATE POLICY "blog_posts_delete_policy" ON public.blog_posts FOR DELETE TO public USING (((author_id = auth.uid()) OR is_admin()));
 CREATE POLICY "blog_posts_insert_policy" ON public.blog_posts FOR INSERT TO public WITH CHECK (((author_id = auth.uid()) OR is_admin()));
 CREATE POLICY "blog_posts_select_policy" ON public.blog_posts FOR SELECT TO public USING ((((status)::text = 'published'::text) OR (author_id = auth.uid()) OR is_admin()));
 CREATE POLICY "blog_posts_update_policy" ON public.blog_posts FOR UPDATE TO public USING (((author_id = auth.uid()) OR is_admin()));
 CREATE POLICY "blog_tags_delete_policy" ON public.blog_tags FOR DELETE TO public USING (is_admin());
 CREATE POLICY "blog_tags_insert_policy" ON public.blog_tags FOR INSERT TO public WITH CHECK (is_admin());
 CREATE POLICY "blog_tags_select_policy" ON public.blog_tags FOR SELECT TO public USING (true);
 CREATE POLICY "blog_tags_update_policy" ON public.blog_tags FOR UPDATE TO public USING (is_admin());
 CREATE POLICY "Admins can view all abandonment events" ON public.cart_abandonment_events FOR ALL TO public USING (is_admin());
 CREATE POLICY "Users can view own abandonment events" ON public.cart_abandonment_events FOR SELECT TO public USING ((auth.uid() = user_id));
 CREATE POLICY "Admins can view recovery analytics" ON public.cart_recovery_analytics FOR ALL TO public USING (is_admin());
 CREATE POLICY "Admins can view all recovery attempts" ON public.cart_recovery_attempts FOR ALL TO public USING (is_admin());
 CREATE POLICY "Users can view own recovery attempts" ON public.cart_recovery_attempts FOR SELECT TO public USING ((auth.uid() IN ( SELECT cart_abandonment_events.user_id                                                                                                                                          +
 CREATE POLICY "Admins have full access to checkout sessions" ON public.checkout_sessions FOR ALL TO public USING (is_admin());
 CREATE POLICY "Users can create checkout sessions" ON public.checkout_sessions FOR INSERT TO public WITH CHECK (((auth.uid() = user_id) OR (is_guest = true)));
 CREATE POLICY "Users can update own checkout sessions" ON public.checkout_sessions FOR UPDATE TO public USING (((auth.uid() = user_id) OR ((is_guest = true) AND (session_token = current_setting('app.session_token'::text, true)))));
 CREATE POLICY "Users can view own checkout sessions" ON public.checkout_sessions FOR SELECT TO public USING (((auth.uid() = user_id) OR (is_guest = true) OR is_admin()));
 CREATE POLICY "Admins can delete any consolidation groups" ON public.consolidation_groups FOR DELETE TO public USING (is_admin());
 CREATE POLICY "Admins can insert consolidation groups" ON public.consolidation_groups FOR INSERT TO public WITH CHECK (is_admin());
 CREATE POLICY "Users can create own consolidation groups" ON public.consolidation_groups FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
 CREATE POLICY "Users can delete own pending consolidation groups" ON public.consolidation_groups FOR DELETE TO public USING (((auth.uid() = user_id) AND (status = 'pending'::text)));
 CREATE POLICY "Users can update own consolidation groups" ON public.consolidation_groups FOR UPDATE TO public USING (((auth.uid() = user_id) OR is_admin()));
 CREATE POLICY "Users can view own consolidation groups" ON public.consolidation_groups FOR SELECT TO public USING (((auth.uid() = user_id) OR is_admin()));
 CREATE POLICY "Admin full access on continental_pricing" ON public.continental_pricing FOR ALL TO public USING (is_admin());
 CREATE POLICY "Authenticated read access on continental_pricing" ON public.continental_pricing FOR SELECT TO public USING (((is_active = true) AND (auth.uid() IS NOT NULL)));
 CREATE POLICY "Public read access on continental_pricing" ON public.continental_pricing FOR SELECT TO public USING ((is_active = true));
 CREATE POLICY "Country configs readable by authenticated users" ON public.country_configs FOR SELECT TO authenticated USING (true);


-- STEP 5: Ensure critical functions exist
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION has_role(user_id uuid, role_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = $1 
    AND user_roles.role = role_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create app_role type if missing
DO $$ 
BEGIN
  CREATE TYPE app_role AS ENUM ('user', 'moderator', 'admin', 'super_admin');
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
