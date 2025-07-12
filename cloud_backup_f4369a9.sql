

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


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






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


CREATE TYPE "public"."subscription_frequency" AS ENUM (
    'weekly',
    'monthly',
    'quarterly',
    'yearly'
);


ALTER TYPE "public"."subscription_frequency" OWNER TO "postgres";


CREATE TYPE "public"."subscription_plan_type" AS ENUM (
    'premium_shopping',
    'priority_shipping',
    'personal_shopper',
    'bulk_discount',
    'express_handling',
    'custom'
);


ALTER TYPE "public"."subscription_plan_type" OWNER TO "postgres";


CREATE TYPE "public"."subscription_status" AS ENUM (
    'approval_pending',
    'approved',
    'active',
    'suspended',
    'cancelled',
    'expired'
);


ALTER TYPE "public"."subscription_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_read_time"("content" "text") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  word_count INTEGER;
  words_per_minute INTEGER := 200;
BEGIN
  word_count := array_length(string_to_array(content, ' '), 1);
  RETURN GREATEST(1, CEIL(word_count::DECIMAL / words_per_minute));
END;
$$;


ALTER FUNCTION "public"."calculate_read_time"("content" "text") OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_confirmations"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    DELETE FROM pending_confirmations 
    WHERE expires_at < NOW();
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_confirmations"() OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."expire_old_payment_links"() RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE paypal_payment_links
    SET 
        status = 'expired',
        updated_at = NOW()
    WHERE 
        status = 'active' 
        AND expires_at IS NOT NULL 
        AND expires_at < NOW();
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$;


ALTER FUNCTION "public"."expire_old_payment_links"() OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."generate_invoice_number"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    new_invoice_number TEXT;
    exists_check BOOLEAN;
BEGIN
    LOOP
        -- Generate invoice number: INV-YYYY-NNNNNN
        new_invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' || 
                         LPAD((EXTRACT(EPOCH FROM NOW())::BIGINT % 1000000)::TEXT, 6, '0');
        
        -- Check if invoice number already exists
        SELECT EXISTS(SELECT 1 FROM paypal_invoices WHERE invoice_number = new_invoice_number) INTO exists_check;
        
        -- Exit loop if number is unique
        IF NOT exists_check THEN
            EXIT;
        END IF;
    END LOOP;
    
    RETURN new_invoice_number;
END;
$$;


ALTER FUNCTION "public"."generate_invoice_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_payment_link_code"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    code TEXT;
    exists_check BOOLEAN;
BEGIN
    LOOP
        -- Generate random 8-character code
        code := 'PAY' || UPPER(substring(md5(random()::text), 1, 8));
        
        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM paypal_payment_links WHERE link_code = code) INTO exists_check;
        
        -- Exit loop if code is unique
        IF NOT exists_check THEN
            EXIT;
        END IF;
    END LOOP;
    
    RETURN code;
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


CREATE OR REPLACE FUNCTION "public"."generate_slug"("title" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  slug TEXT;
BEGIN
  slug := lower(title);
  slug := regexp_replace(slug, '[^a-z0-9\s-]', '', 'g');
  slug := regexp_replace(slug, '[\s-]+', '-', 'g');
  slug := trim(both '-' from slug);
  RETURN slug;
END;
$$;


ALTER FUNCTION "public"."generate_slug"("title" "text") OWNER TO "postgres";


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
    "currency_code" "text",
    "destination_country" "text",
    "upi_id" "text",
    "upi_qr_string" "text",
    "payment_qr_url" "text",
    "instructions" "text"
);


ALTER TABLE "public"."bank_account_details" OWNER TO "postgres";


COMMENT ON COLUMN "public"."bank_account_details"."is_fallback" IS 'Indicates if this account should be used as fallback when no country-specific account is found. Only one fallback per currency allowed.';



COMMENT ON COLUMN "public"."bank_account_details"."currency_code" IS 'Currency code for the bank account (e.g., USD, INR, NPR). Used by email functions to filter bank accounts by currency.';



COMMENT ON COLUMN "public"."bank_account_details"."destination_country" IS 'Destination country this bank account is intended for (optional, for country-specific bank accounts)';



COMMENT ON COLUMN "public"."bank_account_details"."upi_id" IS 'UPI ID for digital payments (India)';



COMMENT ON COLUMN "public"."bank_account_details"."upi_qr_string" IS 'UPI QR code string for generating dynamic QR codes';



COMMENT ON COLUMN "public"."bank_account_details"."payment_qr_url" IS 'URL to static payment QR code image';



COMMENT ON COLUMN "public"."bank_account_details"."instructions" IS 'Additional payment instructions for customers';



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



CREATE OR REPLACE FUNCTION "public"."get_orders_with_payment_proofs"("status_filter" "text" DEFAULT NULL::"text", "limit_count" integer DEFAULT 50) RETURNS TABLE("order_id" "uuid", "order_display_id" "text", "final_total" numeric, "final_currency" "text", "payment_status" "text", "payment_method" "text", "customer_email" "text", "message_id" "uuid", "verification_status" "text", "admin_notes" "text", "verified_amount" numeric, "attachment_file_name" "text", "attachment_url" "text", "submitted_at" timestamp with time zone, "verified_at" timestamp with time zone)
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
    m.id as message_id,
    m.verification_status,
    m.admin_notes,
    m.verified_amount,
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


CREATE OR REPLACE FUNCTION "public"."get_subscription_analytics"("p_days" integer DEFAULT 30) RETURNS TABLE("total_subscriptions" bigint, "active_subscriptions" bigint, "cancelled_subscriptions" bigint, "trial_subscriptions" bigint, "monthly_revenue" numeric, "avg_subscription_value" numeric, "churn_rate" numeric, "new_subscriptions_period" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
  BEGIN
    RETURN QUERY
    SELECT
      COUNT(*) as total_subscriptions,
      COUNT(*) FILTER (WHERE status = 'active') as active_subscriptions,
      COUNT(*) FILTER (WHERE status = 'cancelled') as
  cancelled_subscriptions,
      COUNT(*) FILTER (WHERE trial_end_date > NOW()) as trial_subscriptions,
      COALESCE(SUM(amount) FILTER (WHERE status = 'active'), 0) as
  monthly_revenue,
      COALESCE(AVG(amount) FILTER (WHERE status = 'active'), 0) as
  avg_subscription_value,
      CASE
        WHEN COUNT(*) FILTER (WHERE status IN ('active', 'cancelled')) > 0
  THEN
          (COUNT(*) FILTER (WHERE status = 'cancelled')::DECIMAL /
           COUNT(*) FILTER (WHERE status IN ('active', 'cancelled'))) * 100
        ELSE 0
      END as churn_rate,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 day' *
  p_days) as new_subscriptions_period
    FROM paypal_subscriptions;
  END;
  $$;


ALTER FUNCTION "public"."get_subscription_analytics"("p_days" integer) OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."sync_invoice_payment_with_quote"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- When invoice is marked as paid, update the related quote
    IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
        UPDATE quotes
        SET 
            status = 'paid',
            payment_method = 'paypal_invoice',
            paid_at = NOW(),
            updated_at = NOW()
        WHERE id = NEW.quote_id;
        
        -- Add payment record
        INSERT INTO payment_records (quote_id, amount, payment_method, reference_number, notes, recorded_by)
        VALUES (
            NEW.quote_id,
            NEW.paid_amount,
            'PayPal Invoice',
            NEW.paypal_invoice_id,
            'Payment via PayPal Invoice #' || NEW.invoice_number,
            NEW.created_by
        );
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_invoice_payment_with_quote"() OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."update_blog_categories_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_blog_categories_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_blog_post_read_time"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.read_time := calculate_read_time(NEW.content);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_blog_post_read_time"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_blog_posts_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_blog_posts_updated_at"() OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."update_invoice_totals"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    invoice_id_to_update UUID;
    items_total DECIMAL(10,2);
BEGIN
    -- Get the invoice ID from the changed row
    invoice_id_to_update := COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    -- Calculate total from all items
    SELECT COALESCE(SUM(line_total), 0) INTO items_total
    FROM paypal_invoice_items
    WHERE invoice_id = invoice_id_to_update;
    
    -- Update the invoice amount (items total + tax + shipping - discount)
    UPDATE paypal_invoices
    SET 
        amount = items_total + COALESCE(tax_amount, 0) + COALESCE(shipping_amount, 0) - COALESCE(discount_amount, 0),
        updated_at = NOW()
    WHERE id = invoice_id_to_update;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."update_invoice_totals"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_invoices_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_invoices_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_payment_link_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Update current_uses when a payment is completed
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        UPDATE paypal_payment_links
        SET 
            current_uses = current_uses + 1,
            updated_at = NOW(),
            completed_at = CASE 
                WHEN current_uses + 1 >= max_uses THEN NOW()
                ELSE completed_at
            END,
            status = CASE 
                WHEN current_uses + 1 >= max_uses THEN 'completed'
                ELSE status
            END
        WHERE id = NEW.payment_link_id;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_payment_link_status"() OWNER TO "postgres";


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
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Calculate total paid from payment_records
  NEW.amount_paid := COALESCE((
    SELECT SUM(amount)
    FROM payment_records
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


CREATE OR REPLACE FUNCTION "public"."update_paypal_webhook_events_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_paypal_webhook_events_updated_at"() OWNER TO "postgres";


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



CREATE TABLE IF NOT EXISTS "public"."blog_authors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "bio" "text",
    "avatar_url" "text",
    "social_links" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."blog_authors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."blog_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(100) NOT NULL,
    "slug" character varying(100) NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."blog_categories" OWNER TO "postgres";


COMMENT ON TABLE "public"."blog_categories" IS 'Categories for organizing blog posts';



CREATE TABLE IF NOT EXISTS "public"."blog_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "parent_comment_id" "uuid",
    "content" "text" NOT NULL,
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "guest_name" character varying(100),
    "guest_email" character varying(255),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "blog_comments_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'spam'::character varying])::"text"[])))
);


ALTER TABLE "public"."blog_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."blog_post_categories" (
    "post_id" "uuid" NOT NULL,
    "category_id" "uuid" NOT NULL
);


ALTER TABLE "public"."blog_post_categories" OWNER TO "postgres";


COMMENT ON TABLE "public"."blog_post_categories" IS 'Many-to-many relationship between posts and categories';



CREATE TABLE IF NOT EXISTS "public"."blog_post_views" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."blog_post_views" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."blog_posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" character varying(300) NOT NULL,
    "slug" character varying(300) NOT NULL,
    "excerpt" "text",
    "content" "text" NOT NULL,
    "featured_image" "text",
    "author_id" "uuid" NOT NULL,
    "status" character varying(20) DEFAULT 'draft'::character varying,
    "featured" boolean DEFAULT false,
    "read_time" integer,
    "meta_title" character varying(300),
    "meta_description" "text",
    "meta_keywords" "text"[],
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "blog_posts_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['draft'::character varying, 'published'::character varying, 'archived'::character varying])::"text"[])))
);


ALTER TABLE "public"."blog_posts" OWNER TO "postgres";


COMMENT ON TABLE "public"."blog_posts" IS 'Blog posts for iwishBag content marketing';



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
    "priority_thresholds" "jsonb" DEFAULT '{"low": 0, "normal": 500, "urgent": 2000}'::"jsonb",
    "minimum_payment_amount" numeric(10,2) DEFAULT 10,
    "decimal_places" integer DEFAULT 2,
    "thousand_separator" "text" DEFAULT ','::"text",
    "decimal_separator" "text" DEFAULT '.'::"text",
    "symbol_position" "text" DEFAULT 'before'::"text",
    "symbol_space" boolean DEFAULT false,
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


COMMENT ON COLUMN "public"."country_settings"."priority_thresholds" IS 'JSON object mapping priority levels (low, normal, urgent) to amount thresholds in the country''s main currency.';



COMMENT ON COLUMN "public"."country_settings"."minimum_payment_amount" IS 'Minimum amount required for payments in this currency';



COMMENT ON COLUMN "public"."country_settings"."decimal_places" IS 'Number of decimal places to display for this currency';



COMMENT ON COLUMN "public"."country_settings"."thousand_separator" IS 'Character used to separate thousands (e.g., comma in 1,000)';



COMMENT ON COLUMN "public"."country_settings"."decimal_separator" IS 'Character used for decimal point (e.g., period in 1.50)';



COMMENT ON COLUMN "public"."country_settings"."symbol_position" IS 'Whether currency symbol appears before or after the amount';



COMMENT ON COLUMN "public"."country_settings"."symbol_space" IS 'Whether to include space between currency symbol and amount';



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
    "verified_amount" numeric(10,2),
    "verified_by" "uuid",
    "verified_at" timestamp with time zone,
    CONSTRAINT "messages_verification_status_check" CHECK (("verification_status" = ANY (ARRAY['pending'::"text", 'verified'::"text", 'confirmed'::"text", 'rejected'::"text"]))),
    CONSTRAINT "valid_recipients" CHECK (("sender_id" <> "recipient_id"))
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


COMMENT ON COLUMN "public"."messages"."recipient_id" IS 'User ID of the recipient. NULL for broadcast/general messages from admin.';



COMMENT ON COLUMN "public"."messages"."message_type" IS 'Type of message: general, payment_proof, support, etc.';



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
    "description" "text",
    "priority" integer DEFAULT 999,
    CONSTRAINT "payment_gateways_fee_fixed_check" CHECK (("fee_fixed" >= (0)::numeric)),
    CONSTRAINT "payment_gateways_fee_percent_check" CHECK (("fee_percent" >= (0)::numeric))
);


ALTER TABLE "public"."payment_gateways" OWNER TO "postgres";


COMMENT ON TABLE "public"."payment_gateways" IS 'Payment gateway configurations - Stripe removed for fresh integration';



COMMENT ON COLUMN "public"."payment_gateways"."description" IS 'Description of the payment gateway for display purposes';



COMMENT ON COLUMN "public"."payment_gateways"."priority" IS 'Payment gateway priority (lower number = higher priority, 1 = highest)';



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



COMMENT ON CONSTRAINT "quotes_anonymous_check" ON "public"."quotes" IS 'Anonymous quotes must have user_id = NULL. Non-anonymous quotes must have user_id.';



COMMENT ON CONSTRAINT "quotes_email_check" ON "public"."quotes" IS 'Email is required for non-anonymous quotes, optional for anonymous quotes.';



COMMENT ON CONSTRAINT "valid_quote_status" ON "public"."quotes" IS 'Quotes can have quote statuses (pending to approved) and then transition to order statuses (payment_pending/processing to completed) after checkout';



CREATE OR REPLACE VIEW "public"."payment_proof_verification_summary" AS
 SELECT "m"."id" AS "message_id",
    "m"."quote_id",
    "m"."sender_id",
    "m"."verification_status",
    "m"."admin_notes",
    "m"."verified_amount",
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
    "auth_users"."email" AS "customer_email",
    "admin_auth"."email" AS "verified_by_email"
   FROM ((("public"."messages" "m"
     JOIN "public"."quotes" "q" ON (("m"."quote_id" = "q"."id")))
     LEFT JOIN "auth"."users" "auth_users" ON (("m"."sender_id" = "auth_users"."id")))
     LEFT JOIN "auth"."users" "admin_auth" ON (("m"."verified_by" = "admin_auth"."id")))
  WHERE ("m"."message_type" = 'payment_proof'::"text")
  ORDER BY "m"."created_at" DESC;


ALTER VIEW "public"."payment_proof_verification_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quote_id" "uuid",
    "amount" numeric(10,2) NOT NULL,
    "payment_method" "text",
    "reference_number" "text",
    "notes" "text",
    "recorded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."payment_records" OWNER TO "postgres";


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
    "paypal_order_id" "text",
    "paypal_capture_id" "text",
    "paypal_payer_id" "text",
    "paypal_payer_email" "text",
    "total_refunded" numeric(10,2) DEFAULT 0,
    "refund_count" integer DEFAULT 0,
    "is_fully_refunded" boolean DEFAULT false,
    "last_refund_at" timestamp with time zone
);


ALTER TABLE "public"."payment_transactions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."payment_transactions"."paypal_order_id" IS 'PayPal order ID for tracking payment lifecycle';



COMMENT ON COLUMN "public"."payment_transactions"."paypal_capture_id" IS 'PayPal capture ID for completed payments';



COMMENT ON COLUMN "public"."payment_transactions"."paypal_payer_id" IS 'PayPal payer ID for customer identification';



COMMENT ON COLUMN "public"."payment_transactions"."paypal_payer_email" IS 'PayPal payer email for customer communication';



CREATE TABLE IF NOT EXISTS "public"."paypal_invoice_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invoice_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "quantity" numeric(10,2) DEFAULT 1 NOT NULL,
    "unit_price" numeric(10,2) NOT NULL,
    "tax_rate" numeric(5,2) DEFAULT 0,
    "discount_amount" numeric(10,2) DEFAULT 0,
    "item_code" "text",
    "category" "text",
    "line_total" numeric(10,2) GENERATED ALWAYS AS ((("quantity" * "unit_price") - "discount_amount")) STORED,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."paypal_invoice_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."paypal_invoice_items" IS 'Line items for PayPal invoices with quantity, pricing, and tax details';



CREATE TABLE IF NOT EXISTS "public"."paypal_invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quote_id" "uuid" NOT NULL,
    "paypal_invoice_id" "text",
    "invoice_number" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "note" "text",
    "terms_and_conditions" "text",
    "amount" numeric(10,2) NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "tax_amount" numeric(10,2) DEFAULT 0,
    "shipping_amount" numeric(10,2) DEFAULT 0,
    "discount_amount" numeric(10,2) DEFAULT 0,
    "merchant_info" "jsonb",
    "billing_info" "jsonb",
    "shipping_info" "jsonb",
    "payment_due_date" "date",
    "minimum_amount_due" numeric(10,2),
    "allow_partial_payment" boolean DEFAULT false,
    "logo_url" "text",
    "template_id" "text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "payment_date" timestamp with time zone,
    "payment_method" "text",
    "paid_amount" numeric(10,2) DEFAULT 0,
    "sent_to_email" "text",
    "last_sent_date" timestamp with time zone,
    "view_count" integer DEFAULT 0,
    "last_viewed_date" timestamp with time zone,
    "paypal_response" "jsonb",
    "paypal_links" "jsonb",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sent_at" timestamp with time zone,
    "paid_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    CONSTRAINT "paypal_invoices_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'sent'::"text", 'scheduled'::"text", 'paid'::"text", 'marked_as_paid'::"text", 'cancelled'::"text", 'refunded'::"text", 'partially_refunded'::"text", 'marked_as_refunded'::"text"])))
);


ALTER TABLE "public"."paypal_invoices" OWNER TO "postgres";


COMMENT ON TABLE "public"."paypal_invoices" IS 'Professional invoices generated via PayPal for approved quotes';



CREATE OR REPLACE VIEW "public"."paypal_invoices_with_quote_info" AS
SELECT
    NULL::"uuid" AS "id",
    NULL::"uuid" AS "quote_id",
    NULL::"text" AS "paypal_invoice_id",
    NULL::"text" AS "invoice_number",
    NULL::"text" AS "title",
    NULL::"text" AS "description",
    NULL::"text" AS "note",
    NULL::"text" AS "terms_and_conditions",
    NULL::numeric(10,2) AS "amount",
    NULL::"text" AS "currency",
    NULL::numeric(10,2) AS "tax_amount",
    NULL::numeric(10,2) AS "shipping_amount",
    NULL::numeric(10,2) AS "discount_amount",
    NULL::"jsonb" AS "merchant_info",
    NULL::"jsonb" AS "billing_info",
    NULL::"jsonb" AS "shipping_info",
    NULL::"date" AS "payment_due_date",
    NULL::numeric(10,2) AS "minimum_amount_due",
    NULL::boolean AS "allow_partial_payment",
    NULL::"text" AS "logo_url",
    NULL::"text" AS "template_id",
    NULL::"text" AS "status",
    NULL::timestamp with time zone AS "payment_date",
    NULL::"text" AS "payment_method",
    NULL::numeric(10,2) AS "paid_amount",
    NULL::"text" AS "sent_to_email",
    NULL::timestamp with time zone AS "last_sent_date",
    NULL::integer AS "view_count",
    NULL::timestamp with time zone AS "last_viewed_date",
    NULL::"jsonb" AS "paypal_response",
    NULL::"jsonb" AS "paypal_links",
    NULL::"uuid" AS "created_by",
    NULL::timestamp with time zone AS "created_at",
    NULL::timestamp with time zone AS "updated_at",
    NULL::timestamp with time zone AS "sent_at",
    NULL::timestamp with time zone AS "paid_at",
    NULL::timestamp with time zone AS "cancelled_at",
    NULL::"text" AS "quote_display_id",
    NULL::"text" AS "product_name",
    NULL::"uuid" AS "customer_id",
    NULL::"text" AS "customer_email",
    NULL::"text" AS "customer_name",
    NULL::"jsonb" AS "shipping_address",
    NULL::numeric AS "items_total",
    NULL::bigint AS "items_count";


ALTER VIEW "public"."paypal_invoices_with_quote_info" OWNER TO "postgres";


COMMENT ON VIEW "public"."paypal_invoices_with_quote_info" IS 'Comprehensive view of invoices with quote and customer information';



CREATE TABLE IF NOT EXISTS "public"."paypal_link_payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "payment_link_id" "uuid" NOT NULL,
    "payment_transaction_id" "uuid",
    "paypal_payment_id" "text",
    "amount_paid" numeric(10,2) NOT NULL,
    "currency" "text" NOT NULL,
    "payer_email" "text",
    "payer_name" "text",
    "payer_id" "text",
    "ip_address" "inet",
    "user_agent" "text",
    "referrer" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "paypal_status" "text",
    "paypal_response" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "failed_at" timestamp with time zone,
    CONSTRAINT "paypal_link_payments_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'completed'::"text", 'failed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."paypal_link_payments" OWNER TO "postgres";


COMMENT ON TABLE "public"."paypal_link_payments" IS 'Tracks payments made through PayPal payment links';



CREATE TABLE IF NOT EXISTS "public"."paypal_payment_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "link_code" "text" NOT NULL,
    "paypal_link_id" "text",
    "title" "text" NOT NULL,
    "description" "text",
    "amount" numeric(10,2) NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "quote_id" "uuid",
    "user_id" "uuid",
    "created_by" "uuid",
    "expires_at" timestamp with time zone,
    "max_uses" integer DEFAULT 1,
    "current_uses" integer DEFAULT 0,
    "allow_partial_payment" boolean DEFAULT false,
    "minimum_payment_amount" numeric(10,2),
    "payment_note" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "is_public" boolean DEFAULT false,
    "custom_redirect_url" "text",
    "webhook_url" "text",
    "metadata" "jsonb",
    "paypal_response" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    CONSTRAINT "paypal_payment_links_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'expired'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."paypal_payment_links" OWNER TO "postgres";


COMMENT ON TABLE "public"."paypal_payment_links" IS 'Shareable PayPal payment links for quotes and custom payments';



CREATE OR REPLACE VIEW "public"."paypal_payment_links_summary" AS
 SELECT "ppl"."id",
    "ppl"."link_code",
    "ppl"."title",
    "ppl"."amount",
    "ppl"."currency",
    "ppl"."status",
    "ppl"."current_uses",
    "ppl"."max_uses",
    "ppl"."created_at",
    "ppl"."expires_at",
    COALESCE("sum"("plp"."amount_paid"), (0)::numeric) AS "total_paid",
    "count"("plp"."id") AS "payment_count",
        CASE
            WHEN (("ppl"."expires_at" IS NOT NULL) AND ("ppl"."expires_at" < "now"())) THEN 'expired'::"text"
            WHEN ("ppl"."current_uses" >= "ppl"."max_uses") THEN 'completed'::"text"
            ELSE "ppl"."status"
        END AS "computed_status"
   FROM ("public"."paypal_payment_links" "ppl"
     LEFT JOIN "public"."paypal_link_payments" "plp" ON ((("ppl"."id" = "plp"."payment_link_id") AND ("plp"."status" = 'completed'::"text"))))
  GROUP BY "ppl"."id", "ppl"."link_code", "ppl"."title", "ppl"."amount", "ppl"."currency", "ppl"."status", "ppl"."current_uses", "ppl"."max_uses", "ppl"."created_at", "ppl"."expires_at";


ALTER VIEW "public"."paypal_payment_links_summary" OWNER TO "postgres";


COMMENT ON VIEW "public"."paypal_payment_links_summary" IS 'Summary view of payment links with payment totals';



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



CREATE TABLE IF NOT EXISTS "public"."paypal_subscription_payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subscription_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "paypal_payment_id" "text" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "status" "text" NOT NULL,
    "cycle_sequence" integer,
    "payment_time" timestamp with time zone,
    "paypal_response" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."paypal_subscription_payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."paypal_subscription_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "paypal_plan_id" "text" NOT NULL,
    "plan_name" "text" NOT NULL,
    "plan_description" "text",
    "plan_type" "public"."subscription_plan_type" NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "setup_fee" numeric(10,2) DEFAULT 0,
    "frequency" "public"."subscription_frequency" NOT NULL,
    "frequency_interval" integer DEFAULT 1,
    "cycles" integer,
    "features" "jsonb",
    "limits" "jsonb",
    "discount_percentage" numeric(5,2) DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "is_public" boolean DEFAULT true,
    "requires_approval" boolean DEFAULT false,
    "trial_days" integer DEFAULT 0,
    "trial_amount" numeric(10,2) DEFAULT 0,
    "paypal_product_id" "text",
    "paypal_links" "jsonb",
    "paypal_response" "jsonb",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."paypal_subscription_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."paypal_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "paypal_subscription_id" "text" NOT NULL,
    "paypal_subscriber_id" "text",
    "status" "public"."subscription_status" DEFAULT 'approval_pending'::"public"."subscription_status" NOT NULL,
    "start_date" timestamp with time zone,
    "next_billing_date" timestamp with time zone,
    "last_payment_date" timestamp with time zone,
    "end_date" timestamp with time zone,
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "setup_fee" numeric(10,2) DEFAULT 0,
    "total_cycles" integer,
    "completed_cycles" integer DEFAULT 0,
    "current_usage" "jsonb" DEFAULT '{}'::"jsonb",
    "usage_reset_date" timestamp with time zone,
    "trial_end_date" timestamp with time zone,
    "trial_amount" numeric(10,2) DEFAULT 0,
    "total_paid" numeric(10,2) DEFAULT 0,
    "failed_payments" integer DEFAULT 0,
    "last_payment_amount" numeric(10,2),
    "admin_notes" "text",
    "cancellation_reason" "text",
    "paypal_links" "jsonb",
    "paypal_response" "jsonb",
    "webhook_last_update" timestamp with time zone,
    "webhook_events_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."paypal_subscriptions" OWNER TO "postgres";


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
    "status" "text" DEFAULT 'pending'::"text"
);


ALTER TABLE "public"."paypal_webhook_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."paypal_webhook_events" IS 'PayPal webhook event tracking for payment processing and debugging';



CREATE TABLE IF NOT EXISTS "public"."pending_confirmations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "password_hash" "text" NOT NULL,
    "user_data" "jsonb" NOT NULL,
    "confirmation_token" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "confirmed_at" timestamp with time zone,
    CONSTRAINT "pending_confirmations_email_check" CHECK (("email" ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::"text"))
);


ALTER TABLE "public"."pending_confirmations" OWNER TO "postgres";


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
    "country" "text" NOT NULL,
    "country_code" "text",
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "phone" "text",
    "recipient_name" "text",
    "destination_country" character varying(2)
);


ALTER TABLE "public"."user_addresses" OWNER TO "postgres";


COMMENT ON COLUMN "public"."user_addresses"."phone" IS 'Phone number for this specific address';



COMMENT ON COLUMN "public"."user_addresses"."recipient_name" IS 'Full name of the person who should receive the package at this address';



COMMENT ON COLUMN "public"."user_addresses"."destination_country" IS 'Two-letter ISO country code for package delivery destination (e.g., IN for India, NP for Nepal)';



CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."app_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."user_subscription_summary" AS
 SELECT "s"."id",
    "s"."user_id",
    "s"."status",
    "s"."start_date",
    "s"."next_billing_date",
    "s"."amount",
    "s"."currency",
    "s"."completed_cycles",
    "s"."total_cycles",
    "s"."current_usage",
    "p"."plan_name",
    "p"."plan_type",
    "p"."features",
    "p"."limits",
    "p"."discount_percentage",
    "profiles"."full_name" AS "customer_name",
    "profiles"."email" AS "customer_email"
   FROM (("public"."paypal_subscriptions" "s"
     JOIN "public"."paypal_subscription_plans" "p" ON (("s"."plan_id" = "p"."id")))
     LEFT JOIN "public"."profiles" ON (("s"."user_id" = "profiles"."id")));


ALTER VIEW "public"."user_subscription_summary" OWNER TO "postgres";


ALTER TABLE ONLY "public"."quote_address_history" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."quote_address_history_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."quote_statuses" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."quote_statuses_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."shipping_routes" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."shipping_routes_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."authenticated_checkout_sessions"
    ADD CONSTRAINT "authenticated_checkout_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."authenticated_checkout_sessions"
    ADD CONSTRAINT "authenticated_checkout_sessions_session_token_key" UNIQUE ("session_token");



ALTER TABLE ONLY "public"."bank_account_details"
    ADD CONSTRAINT "bank_account_details_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blog_authors"
    ADD CONSTRAINT "blog_authors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blog_authors"
    ADD CONSTRAINT "blog_authors_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."blog_categories"
    ADD CONSTRAINT "blog_categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."blog_categories"
    ADD CONSTRAINT "blog_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blog_categories"
    ADD CONSTRAINT "blog_categories_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."blog_comments"
    ADD CONSTRAINT "blog_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blog_post_categories"
    ADD CONSTRAINT "blog_post_categories_pkey" PRIMARY KEY ("post_id", "category_id");



ALTER TABLE ONLY "public"."blog_post_views"
    ADD CONSTRAINT "blog_post_views_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blog_posts"
    ADD CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blog_posts"
    ADD CONSTRAINT "blog_posts_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."country_payment_preferences"
    ADD CONSTRAINT "country_payment_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."country_settings"
    ADD CONSTRAINT "country_settings_pkey" PRIMARY KEY ("code");



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



ALTER TABLE ONLY "public"."guest_checkout_sessions"
    ADD CONSTRAINT "guest_checkout_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guest_checkout_sessions"
    ADD CONSTRAINT "guest_checkout_sessions_session_token_key" UNIQUE ("session_token");



ALTER TABLE ONLY "public"."manual_analysis_tasks"
    ADD CONSTRAINT "manual_analysis_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_gateways"
    ADD CONSTRAINT "payment_gateways_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."payment_gateways"
    ADD CONSTRAINT "payment_gateways_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_records"
    ADD CONSTRAINT "payment_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_reminders"
    ADD CONSTRAINT "payment_reminders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_transactions"
    ADD CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."paypal_invoice_items"
    ADD CONSTRAINT "paypal_invoice_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."paypal_invoices"
    ADD CONSTRAINT "paypal_invoices_invoice_number_key" UNIQUE ("invoice_number");



ALTER TABLE ONLY "public"."paypal_invoices"
    ADD CONSTRAINT "paypal_invoices_paypal_invoice_id_key" UNIQUE ("paypal_invoice_id");



ALTER TABLE ONLY "public"."paypal_invoices"
    ADD CONSTRAINT "paypal_invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."paypal_link_payments"
    ADD CONSTRAINT "paypal_link_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."paypal_payment_links"
    ADD CONSTRAINT "paypal_payment_links_link_code_key" UNIQUE ("link_code");



ALTER TABLE ONLY "public"."paypal_payment_links"
    ADD CONSTRAINT "paypal_payment_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."paypal_refund_reasons"
    ADD CONSTRAINT "paypal_refund_reasons_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."paypal_refunds"
    ADD CONSTRAINT "paypal_refunds_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."paypal_refunds"
    ADD CONSTRAINT "paypal_refunds_refund_id_key" UNIQUE ("refund_id");



ALTER TABLE ONLY "public"."paypal_subscription_payments"
    ADD CONSTRAINT "paypal_subscription_payments_paypal_payment_id_key" UNIQUE ("paypal_payment_id");



ALTER TABLE ONLY "public"."paypal_subscription_payments"
    ADD CONSTRAINT "paypal_subscription_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."paypal_subscription_plans"
    ADD CONSTRAINT "paypal_subscription_plans_paypal_plan_id_key" UNIQUE ("paypal_plan_id");



ALTER TABLE ONLY "public"."paypal_subscription_plans"
    ADD CONSTRAINT "paypal_subscription_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."paypal_subscriptions"
    ADD CONSTRAINT "paypal_subscriptions_paypal_subscription_id_key" UNIQUE ("paypal_subscription_id");



ALTER TABLE ONLY "public"."paypal_subscriptions"
    ADD CONSTRAINT "paypal_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."paypal_webhook_events"
    ADD CONSTRAINT "paypal_webhook_events_event_id_key" UNIQUE ("event_id");



ALTER TABLE ONLY "public"."paypal_webhook_events"
    ADD CONSTRAINT "paypal_webhook_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pending_confirmations"
    ADD CONSTRAINT "pending_confirmations_confirmation_token_key" UNIQUE ("confirmation_token");



ALTER TABLE ONLY "public"."pending_confirmations"
    ADD CONSTRAINT "pending_confirmations_pkey" PRIMARY KEY ("id");



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



CREATE INDEX "idx_authenticated_checkout_sessions_expires_at" ON "public"."authenticated_checkout_sessions" USING "btree" ("expires_at");



CREATE INDEX "idx_authenticated_checkout_sessions_quote_ids" ON "public"."authenticated_checkout_sessions" USING "gin" ("quote_ids");



CREATE INDEX "idx_authenticated_checkout_sessions_status" ON "public"."authenticated_checkout_sessions" USING "btree" ("status");



CREATE INDEX "idx_authenticated_checkout_sessions_token" ON "public"."authenticated_checkout_sessions" USING "btree" ("session_token");



CREATE INDEX "idx_authenticated_checkout_sessions_user_id" ON "public"."authenticated_checkout_sessions" USING "btree" ("user_id");



CREATE INDEX "idx_bank_account_details_country_currency" ON "public"."bank_account_details" USING "btree" ("country_code", "currency_code");



CREATE INDEX "idx_bank_account_details_currency_code" ON "public"."bank_account_details" USING "btree" ("currency_code");



CREATE INDEX "idx_bank_account_details_currency_destination" ON "public"."bank_account_details" USING "btree" ("currency_code", "destination_country");



CREATE INDEX "idx_bank_account_details_destination_country" ON "public"."bank_account_details" USING "btree" ("destination_country");



CREATE INDEX "idx_bank_accounts_country" ON "public"."bank_account_details" USING "btree" ("country_code");



CREATE INDEX "idx_bank_accounts_fallback" ON "public"."bank_account_details" USING "btree" ("is_fallback");



CREATE INDEX "idx_blog_categories_slug" ON "public"."blog_categories" USING "btree" ("slug");



CREATE INDEX "idx_blog_comments_post" ON "public"."blog_comments" USING "btree" ("post_id");



CREATE INDEX "idx_blog_comments_status" ON "public"."blog_comments" USING "btree" ("status");



CREATE INDEX "idx_blog_post_views_post" ON "public"."blog_post_views" USING "btree" ("post_id");



CREATE INDEX "idx_blog_posts_author" ON "public"."blog_posts" USING "btree" ("author_id");



CREATE INDEX "idx_blog_posts_featured" ON "public"."blog_posts" USING "btree" ("featured") WHERE ("featured" = true);



CREATE INDEX "idx_blog_posts_published_at" ON "public"."blog_posts" USING "btree" ("published_at" DESC);



CREATE INDEX "idx_blog_posts_search" ON "public"."blog_posts" USING "gin" ("to_tsvector"('"english"'::"regconfig", (((((COALESCE("title", ''::character varying))::"text" || ' '::"text") || COALESCE("excerpt", ''::"text")) || ' '::"text") || COALESCE("content", ''::"text"))));



CREATE INDEX "idx_blog_posts_slug" ON "public"."blog_posts" USING "btree" ("slug");



CREATE INDEX "idx_blog_posts_status" ON "public"."blog_posts" USING "btree" ("status");



CREATE INDEX "idx_country_payment_preferences_active" ON "public"."country_payment_preferences" USING "btree" ("is_active");



CREATE INDEX "idx_country_payment_preferences_country" ON "public"."country_payment_preferences" USING "btree" ("country_code");



CREATE INDEX "idx_country_payment_preferences_priority" ON "public"."country_payment_preferences" USING "btree" ("country_code", "priority");



CREATE INDEX "idx_country_settings_currency" ON "public"."country_settings" USING "btree" ("currency");



CREATE INDEX "idx_country_settings_minimum_payment" ON "public"."country_settings" USING "btree" ("minimum_payment_amount");



CREATE INDEX "idx_customs_rules_priority" ON "public"."customs_rules" USING "btree" ("priority");



CREATE INDEX "idx_customs_rules_route" ON "public"."customs_rules" USING "btree" ("origin_country", "destination_country", "is_active", "priority");



CREATE INDEX "idx_email_queue_status" ON "public"."email_queue" USING "btree" ("status", "created_at");



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



CREATE INDEX "idx_payment_gateways_name_active" ON "public"."payment_gateways" USING "btree" ("name", "is_active");



CREATE INDEX "idx_payment_gateways_priority" ON "public"."payment_gateways" USING "btree" ("priority");



CREATE INDEX "idx_payment_records_created_at" ON "public"."payment_records" USING "btree" ("created_at");



CREATE INDEX "idx_payment_records_quote_id" ON "public"."payment_records" USING "btree" ("quote_id");



CREATE INDEX "idx_payment_transactions_paypal_capture" ON "public"."payment_transactions" USING "btree" ("paypal_capture_id") WHERE ("paypal_capture_id" IS NOT NULL);



CREATE INDEX "idx_payment_transactions_paypal_capture_id" ON "public"."payment_transactions" USING "btree" ("paypal_capture_id");



CREATE INDEX "idx_payment_transactions_paypal_order" ON "public"."payment_transactions" USING "btree" ("paypal_order_id") WHERE ("paypal_order_id" IS NOT NULL);



CREATE INDEX "idx_payment_transactions_paypal_order_id" ON "public"."payment_transactions" USING "btree" ("paypal_order_id");



CREATE INDEX "idx_payment_transactions_quote_id" ON "public"."payment_transactions" USING "btree" ("quote_id");



CREATE INDEX "idx_payment_transactions_status" ON "public"."payment_transactions" USING "btree" ("status");



CREATE INDEX "idx_payment_transactions_user_id" ON "public"."payment_transactions" USING "btree" ("user_id");



CREATE INDEX "idx_paypal_invoice_items_invoice" ON "public"."paypal_invoice_items" USING "btree" ("invoice_id");



CREATE INDEX "idx_paypal_invoice_items_name" ON "public"."paypal_invoice_items" USING "btree" ("name");



CREATE INDEX "idx_paypal_invoices_created_at" ON "public"."paypal_invoices" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_paypal_invoices_created_by" ON "public"."paypal_invoices" USING "btree" ("created_by");



CREATE INDEX "idx_paypal_invoices_invoice_number" ON "public"."paypal_invoices" USING "btree" ("invoice_number");



CREATE INDEX "idx_paypal_invoices_payment_due" ON "public"."paypal_invoices" USING "btree" ("payment_due_date");



CREATE INDEX "idx_paypal_invoices_paypal_id" ON "public"."paypal_invoices" USING "btree" ("paypal_invoice_id");



CREATE INDEX "idx_paypal_invoices_quote" ON "public"."paypal_invoices" USING "btree" ("quote_id");



CREATE INDEX "idx_paypal_invoices_status" ON "public"."paypal_invoices" USING "btree" ("status");



CREATE INDEX "idx_paypal_link_payments_created" ON "public"."paypal_link_payments" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_paypal_link_payments_link" ON "public"."paypal_link_payments" USING "btree" ("payment_link_id");



CREATE INDEX "idx_paypal_link_payments_status" ON "public"."paypal_link_payments" USING "btree" ("status");



CREATE INDEX "idx_paypal_link_payments_transaction" ON "public"."paypal_link_payments" USING "btree" ("payment_transaction_id");



CREATE INDEX "idx_paypal_payment_links_code" ON "public"."paypal_payment_links" USING "btree" ("link_code");



CREATE INDEX "idx_paypal_payment_links_created" ON "public"."paypal_payment_links" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_paypal_payment_links_created_by" ON "public"."paypal_payment_links" USING "btree" ("created_by");



CREATE INDEX "idx_paypal_payment_links_expires" ON "public"."paypal_payment_links" USING "btree" ("expires_at");



CREATE INDEX "idx_paypal_payment_links_quote" ON "public"."paypal_payment_links" USING "btree" ("quote_id");



CREATE INDEX "idx_paypal_payment_links_status" ON "public"."paypal_payment_links" USING "btree" ("status");



CREATE INDEX "idx_paypal_payment_links_user" ON "public"."paypal_payment_links" USING "btree" ("user_id");



CREATE INDEX "idx_paypal_refunds_created" ON "public"."paypal_refunds" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_paypal_refunds_original_transaction" ON "public"."paypal_refunds" USING "btree" ("original_transaction_id");



CREATE INDEX "idx_paypal_refunds_payment_transaction" ON "public"."paypal_refunds" USING "btree" ("payment_transaction_id");



CREATE INDEX "idx_paypal_refunds_quote" ON "public"."paypal_refunds" USING "btree" ("quote_id");



CREATE INDEX "idx_paypal_refunds_refund_id" ON "public"."paypal_refunds" USING "btree" ("refund_id");



CREATE INDEX "idx_paypal_refunds_status" ON "public"."paypal_refunds" USING "btree" ("status");



CREATE INDEX "idx_paypal_refunds_user" ON "public"."paypal_refunds" USING "btree" ("user_id");



CREATE INDEX "idx_paypal_webhook_events_created" ON "public"."paypal_webhook_events" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_paypal_webhook_events_created_at" ON "public"."paypal_webhook_events" USING "btree" ("created_at");



CREATE INDEX "idx_paypal_webhook_events_event_id" ON "public"."paypal_webhook_events" USING "btree" ("event_id");



CREATE INDEX "idx_paypal_webhook_events_event_type" ON "public"."paypal_webhook_events" USING "btree" ("event_type");



CREATE INDEX "idx_paypal_webhook_events_resource" ON "public"."paypal_webhook_events" USING "btree" ("resource_type", "resource_id");



CREATE INDEX "idx_paypal_webhook_events_resource_id" ON "public"."paypal_webhook_events" USING "btree" ("resource_id");



CREATE INDEX "idx_paypal_webhook_events_status" ON "public"."paypal_webhook_events" USING "btree" ("status");



CREATE INDEX "idx_pending_confirmations_email" ON "public"."pending_confirmations" USING "btree" ("email");



CREATE INDEX "idx_pending_confirmations_expires_at" ON "public"."pending_confirmations" USING "btree" ("expires_at");



CREATE INDEX "idx_pending_confirmations_token" ON "public"."pending_confirmations" USING "btree" ("confirmation_token");



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



CREATE INDEX "idx_user_addresses_destination_country" ON "public"."user_addresses" USING "btree" ("destination_country");



CREATE INDEX "idx_user_addresses_user_id" ON "public"."user_addresses" USING "btree" ("user_id");



CREATE INDEX "idx_user_roles_user_id" ON "public"."user_roles" USING "btree" ("user_id");



CREATE OR REPLACE VIEW "public"."paypal_invoices_with_quote_info" AS
 SELECT "pi"."id",
    "pi"."quote_id",
    "pi"."paypal_invoice_id",
    "pi"."invoice_number",
    "pi"."title",
    "pi"."description",
    "pi"."note",
    "pi"."terms_and_conditions",
    "pi"."amount",
    "pi"."currency",
    "pi"."tax_amount",
    "pi"."shipping_amount",
    "pi"."discount_amount",
    "pi"."merchant_info",
    "pi"."billing_info",
    "pi"."shipping_info",
    "pi"."payment_due_date",
    "pi"."minimum_amount_due",
    "pi"."allow_partial_payment",
    "pi"."logo_url",
    "pi"."template_id",
    "pi"."status",
    "pi"."payment_date",
    "pi"."payment_method",
    "pi"."paid_amount",
    "pi"."sent_to_email",
    "pi"."last_sent_date",
    "pi"."view_count",
    "pi"."last_viewed_date",
    "pi"."paypal_response",
    "pi"."paypal_links",
    "pi"."created_by",
    "pi"."created_at",
    "pi"."updated_at",
    "pi"."sent_at",
    "pi"."paid_at",
    "pi"."cancelled_at",
    "q"."display_id" AS "quote_display_id",
    "q"."product_name",
    "q"."user_id" AS "customer_id",
    "q"."email" AS "customer_email",
    "p"."full_name" AS "customer_name",
    "q"."shipping_address",
    COALESCE("sum"("pii"."line_total"), (0)::numeric) AS "items_total",
    "count"("pii"."id") AS "items_count"
   FROM ((("public"."paypal_invoices" "pi"
     LEFT JOIN "public"."quotes" "q" ON (("pi"."quote_id" = "q"."id")))
     LEFT JOIN "public"."profiles" "p" ON (("q"."user_id" = "p"."id")))
     LEFT JOIN "public"."paypal_invoice_items" "pii" ON (("pi"."id" = "pii"."invoice_id")))
  GROUP BY "pi"."id", "q"."display_id", "q"."product_name", "q"."user_id", "q"."email", "p"."full_name", "q"."shipping_address";



CREATE OR REPLACE TRIGGER "calculate_blog_post_read_time" BEFORE INSERT OR UPDATE OF "content" ON "public"."blog_posts" FOR EACH ROW EXECUTE FUNCTION "public"."update_blog_post_read_time"();



CREATE OR REPLACE TRIGGER "generate_quote_display_id" BEFORE INSERT ON "public"."quotes" FOR EACH ROW EXECUTE FUNCTION "public"."generate_display_id"();



CREATE OR REPLACE TRIGGER "set_share_token_trigger" BEFORE INSERT ON "public"."quotes" FOR EACH ROW EXECUTE FUNCTION "public"."set_share_token"();



CREATE OR REPLACE TRIGGER "trigger_blog_categories_updated_at" BEFORE UPDATE ON "public"."blog_categories" FOR EACH ROW EXECUTE FUNCTION "public"."update_blog_categories_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_blog_posts_updated_at" BEFORE UPDATE ON "public"."blog_posts" FOR EACH ROW EXECUTE FUNCTION "public"."update_blog_posts_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_country_payment_preferences_updated_at" BEFORE UPDATE ON "public"."country_payment_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_country_payment_preferences_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_handle_default_address_insert" BEFORE INSERT ON "public"."user_addresses" FOR EACH ROW EXECUTE FUNCTION "public"."handle_default_address"();



CREATE OR REPLACE TRIGGER "trigger_handle_default_address_update" BEFORE UPDATE ON "public"."user_addresses" FOR EACH ROW EXECUTE FUNCTION "public"."handle_default_address"();



CREATE OR REPLACE TRIGGER "trigger_invoices_updated_at" BEFORE UPDATE ON "public"."paypal_invoices" FOR EACH ROW EXECUTE FUNCTION "public"."update_invoices_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_log_address_change_insert" AFTER INSERT ON "public"."quotes" FOR EACH ROW WHEN (("new"."shipping_address" IS NOT NULL)) EXECUTE FUNCTION "public"."log_address_change"();



CREATE OR REPLACE TRIGGER "trigger_log_address_change_update" AFTER UPDATE ON "public"."quotes" FOR EACH ROW WHEN ((("old"."shipping_address" IS DISTINCT FROM "new"."shipping_address") OR ("old"."address_locked" IS DISTINCT FROM "new"."address_locked"))) EXECUTE FUNCTION "public"."log_address_change"();



CREATE OR REPLACE TRIGGER "trigger_log_quote_status_change" AFTER UPDATE ON "public"."quotes" FOR EACH ROW EXECUTE FUNCTION "public"."log_quote_status_change"();



CREATE OR REPLACE TRIGGER "trigger_payment_links_updated_at" BEFORE UPDATE ON "public"."paypal_payment_links" FOR EACH ROW EXECUTE FUNCTION "public"."update_payment_links_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_paypal_refunds_updated_at" BEFORE UPDATE ON "public"."paypal_refunds" FOR EACH ROW EXECUTE FUNCTION "public"."update_paypal_refunds_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_paypal_webhook_events_updated_at" BEFORE UPDATE ON "public"."paypal_webhook_events" FOR EACH ROW EXECUTE FUNCTION "public"."update_paypal_webhook_events_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_set_quote_expiration" BEFORE UPDATE ON "public"."quotes" FOR EACH ROW EXECUTE FUNCTION "public"."set_quote_expiration"();



CREATE OR REPLACE TRIGGER "trigger_sync_invoice_payment" AFTER UPDATE OF "status", "paid_amount" ON "public"."paypal_invoices" FOR EACH ROW EXECUTE FUNCTION "public"."sync_invoice_payment_with_quote"();



CREATE OR REPLACE TRIGGER "trigger_update_authenticated_checkout_sessions_updated_at" BEFORE UPDATE ON "public"."authenticated_checkout_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."update_authenticated_checkout_sessions_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_guest_checkout_sessions_updated_at" BEFORE UPDATE ON "public"."guest_checkout_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."update_guest_checkout_sessions_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_invoice_totals" AFTER INSERT OR DELETE OR UPDATE ON "public"."paypal_invoice_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_invoice_totals"();



CREATE OR REPLACE TRIGGER "trigger_update_payment_link_status" AFTER INSERT OR UPDATE OF "status" ON "public"."paypal_link_payments" FOR EACH ROW EXECUTE FUNCTION "public"."update_payment_link_status"();



CREATE OR REPLACE TRIGGER "trigger_update_payment_refund_totals" AFTER INSERT OR UPDATE OF "status", "refund_amount", "completed_at" ON "public"."paypal_refunds" FOR EACH ROW EXECUTE FUNCTION "public"."update_payment_refund_totals"();



CREATE OR REPLACE TRIGGER "trigger_update_quote_documents_updated_at" BEFORE UPDATE ON "public"."quote_documents" FOR EACH ROW EXECUTE FUNCTION "public"."update_quote_documents_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_route_customs_tiers_updated_at" BEFORE UPDATE ON "public"."route_customs_tiers" FOR EACH ROW EXECUTE FUNCTION "public"."update_route_customs_tiers_updated_at"();



CREATE OR REPLACE TRIGGER "update_blog_authors_updated_at" BEFORE UPDATE ON "public"."blog_authors" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_blog_categories_updated_at" BEFORE UPDATE ON "public"."blog_categories" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_blog_comments_updated_at" BEFORE UPDATE ON "public"."blog_comments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_blog_posts_updated_at" BEFORE UPDATE ON "public"."blog_posts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_payment_status_on_payment_record" AFTER INSERT OR DELETE OR UPDATE ON "public"."payment_records" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_update_payment_status"();



CREATE OR REPLACE TRIGGER "update_payment_status_on_quote" BEFORE UPDATE OF "amount_paid" ON "public"."quotes" FOR EACH ROW EXECUTE FUNCTION "public"."update_payment_status"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_quotes_updated_at" BEFORE UPDATE ON "public"."quotes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "validate_delivery_options_trigger" BEFORE INSERT OR UPDATE ON "public"."shipping_routes" FOR EACH ROW EXECUTE FUNCTION "public"."validate_delivery_options"();



ALTER TABLE ONLY "public"."authenticated_checkout_sessions"
    ADD CONSTRAINT "authenticated_checkout_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bank_account_details"
    ADD CONSTRAINT "bank_account_details_country_code_fkey" FOREIGN KEY ("country_code") REFERENCES "public"."country_settings"("code");



ALTER TABLE ONLY "public"."blog_authors"
    ADD CONSTRAINT "blog_authors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."blog_comments"
    ADD CONSTRAINT "blog_comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."blog_comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."blog_comments"
    ADD CONSTRAINT "blog_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."blog_posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."blog_comments"
    ADD CONSTRAINT "blog_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."blog_post_categories"
    ADD CONSTRAINT "blog_post_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."blog_categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."blog_post_categories"
    ADD CONSTRAINT "blog_post_categories_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."blog_posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."blog_post_views"
    ADD CONSTRAINT "blog_post_views_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."blog_posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."blog_post_views"
    ADD CONSTRAINT "blog_post_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."blog_posts"
    ADD CONSTRAINT "blog_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."blog_authors"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."country_payment_preferences"
    ADD CONSTRAINT "fk_country_payment_preferences_country" FOREIGN KEY ("country_code") REFERENCES "public"."country_settings"("code") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."country_payment_preferences"
    ADD CONSTRAINT "fk_country_payment_preferences_gateway" FOREIGN KEY ("gateway_code") REFERENCES "public"."payment_gateways"("code") ON DELETE CASCADE;



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



ALTER TABLE ONLY "public"."payment_records"
    ADD CONSTRAINT "payment_records_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_records"
    ADD CONSTRAINT "payment_records_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."payment_reminders"
    ADD CONSTRAINT "payment_reminders_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_transactions"
    ADD CONSTRAINT "payment_transactions_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_transactions"
    ADD CONSTRAINT "payment_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."paypal_invoice_items"
    ADD CONSTRAINT "paypal_invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."paypal_invoices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."paypal_invoices"
    ADD CONSTRAINT "paypal_invoices_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."paypal_invoices"
    ADD CONSTRAINT "paypal_invoices_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."paypal_link_payments"
    ADD CONSTRAINT "paypal_link_payments_payment_link_id_fkey" FOREIGN KEY ("payment_link_id") REFERENCES "public"."paypal_payment_links"("id");



ALTER TABLE ONLY "public"."paypal_link_payments"
    ADD CONSTRAINT "paypal_link_payments_payment_transaction_id_fkey" FOREIGN KEY ("payment_transaction_id") REFERENCES "public"."payment_transactions"("id");



ALTER TABLE ONLY "public"."paypal_payment_links"
    ADD CONSTRAINT "paypal_payment_links_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."paypal_payment_links"
    ADD CONSTRAINT "paypal_payment_links_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id");



ALTER TABLE ONLY "public"."paypal_payment_links"
    ADD CONSTRAINT "paypal_payment_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."paypal_refunds"
    ADD CONSTRAINT "paypal_refunds_payment_transaction_id_fkey" FOREIGN KEY ("payment_transaction_id") REFERENCES "public"."payment_transactions"("id");



ALTER TABLE ONLY "public"."paypal_refunds"
    ADD CONSTRAINT "paypal_refunds_processed_by_fkey" FOREIGN KEY ("processed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."paypal_refunds"
    ADD CONSTRAINT "paypal_refunds_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id");



ALTER TABLE ONLY "public"."paypal_refunds"
    ADD CONSTRAINT "paypal_refunds_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."paypal_subscription_payments"
    ADD CONSTRAINT "paypal_subscription_payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."paypal_subscriptions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."paypal_subscription_payments"
    ADD CONSTRAINT "paypal_subscription_payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."paypal_subscription_plans"
    ADD CONSTRAINT "paypal_subscription_plans_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."paypal_subscriptions"
    ADD CONSTRAINT "paypal_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."paypal_subscription_plans"("id");



ALTER TABLE ONLY "public"."paypal_subscriptions"
    ADD CONSTRAINT "paypal_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



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



CREATE POLICY "Admin can access all subscription plans" ON "public"."paypal_subscription_plans" USING ("public"."is_admin"());



CREATE POLICY "Admin can access all subscriptions" ON "public"."paypal_subscriptions" USING ("public"."is_admin"());



CREATE POLICY "Admin can create payment records" ON "public"."payment_records" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admin can insert email settings" ON "public"."email_settings" FOR INSERT WITH CHECK ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "Admin can manage PayPal webhook events" ON "public"."paypal_webhook_events" USING ("public"."is_admin"());



CREATE POLICY "Admin can manage customs rules" ON "public"."customs_rules" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admin can manage customs tiers" ON "public"."route_customs_tiers" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admin can manage route customs tiers" ON "public"."route_customs_tiers" USING ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "Admin can manage shipping routes" ON "public"."shipping_routes" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admin can read email settings" ON "public"."email_settings" FOR SELECT USING ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "Admin can update email settings" ON "public"."email_settings" FOR UPDATE USING ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "Admin can view all emails" ON "public"."email_queue" FOR SELECT USING (("auth"."uid"() IN ( SELECT "user_roles"."user_id"
   FROM "public"."user_roles"
  WHERE ("user_roles"."role" = 'admin'::"public"."app_role"))));



CREATE POLICY "Admin can view all payment records" ON "public"."payment_records" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admin users can view PayPal webhook events" ON "public"."paypal_webhook_events" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can create invoices" ON "public"."paypal_invoices" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can create payment links" ON "public"."paypal_payment_links" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



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



CREATE POLICY "Admins can manage all comments" ON "public"."blog_comments" USING ("public"."is_admin"());



CREATE POLICY "Admins can manage all invoice items" ON "public"."paypal_invoice_items" TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can manage all invoices" ON "public"."paypal_invoices" TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can manage all payment links" ON "public"."paypal_payment_links" TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can manage all roles" ON "public"."user_roles" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can manage blog authors" ON "public"."blog_authors" USING ("public"."is_admin"());



CREATE POLICY "Admins can manage blog categories" ON "public"."blog_categories" USING ("public"."is_admin"());



CREATE POLICY "Admins can manage blog post categories" ON "public"."blog_post_categories" USING ("public"."is_admin"());



CREATE POLICY "Admins can manage blog posts" ON "public"."blog_posts" USING ("public"."is_admin"());



CREATE POLICY "Admins can manage delivery options" ON "public"."shipping_routes" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can manage refund reasons" ON "public"."paypal_refund_reasons" TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can manage refunds" ON "public"."paypal_refunds" TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can manage rejection reasons" ON "public"."rejection_reasons" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['admin'::"public"."app_role", 'moderator'::"public"."app_role"]))))));



CREATE POLICY "Admins can modify all profiles" ON "public"."profiles" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can read all profiles" ON "public"."profiles" FOR SELECT USING (("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR ("auth"."uid"() = "id")));



CREATE POLICY "Admins can read blog post views" ON "public"."blog_post_views" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "Admins can update all quotes" ON "public"."quotes" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can update quote documents" ON "public"."quote_documents" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can update verification status" ON "public"."messages" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can view all link payments" ON "public"."paypal_link_payments" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can view all quote documents" ON "public"."quote_documents" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can view all quotes" ON "public"."quotes" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can view all refunds" ON "public"."paypal_refunds" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



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



CREATE POLICY "Allow delete pending confirmations" ON "public"."pending_confirmations" FOR DELETE USING (true);



CREATE POLICY "Allow insert pending confirmations" ON "public"."pending_confirmations" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow select pending confirmations with token" ON "public"."pending_confirmations" FOR SELECT USING (true);



CREATE POLICY "Allow status updates on shared quotes" ON "public"."quotes" FOR UPDATE USING ((("share_token" IS NOT NULL) AND (("expires_at" IS NULL) OR ("expires_at" > "now"())))) WITH CHECK (("share_token" IS NOT NULL));



CREATE POLICY "Allow update pending confirmations" ON "public"."pending_confirmations" FOR UPDATE USING (true);



CREATE POLICY "Anyone can create blog post views" ON "public"."blog_post_views" FOR INSERT WITH CHECK (true);



CREATE POLICY "Anyone can create guest sessions" ON "public"."guest_checkout_sessions" FOR INSERT WITH CHECK (true);



CREATE POLICY "Anyone can read approved comments" ON "public"."blog_comments" FOR SELECT USING (((("status")::"text" = 'approved'::"text") OR "public"."is_admin"()));



CREATE POLICY "Anyone can read blog authors" ON "public"."blog_authors" FOR SELECT USING (true);



CREATE POLICY "Anyone can read blog categories" ON "public"."blog_categories" FOR SELECT USING (true);



CREATE POLICY "Anyone can read blog post categories" ON "public"."blog_post_categories" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."blog_posts"
  WHERE (("blog_posts"."id" = "blog_post_categories"."post_id") AND ((("blog_posts"."status")::"text" = 'published'::"text") OR "public"."is_admin"())))));



CREATE POLICY "Anyone can read published blog posts" ON "public"."blog_posts" FOR SELECT USING (((("status")::"text" = 'published'::"text") OR "public"."is_admin"()));



CREATE POLICY "Anyone can read refund reasons" ON "public"."paypal_refund_reasons" FOR SELECT TO "authenticated" USING (("is_active" = true));



CREATE POLICY "Anyone can update own session" ON "public"."guest_checkout_sessions" FOR UPDATE USING (true);



CREATE POLICY "Anyone can view anonymous quotes by token" ON "public"."quotes" FOR SELECT USING ((("is_anonymous" = true) AND ("share_token" IS NOT NULL) AND (("expires_at" IS NULL) OR ("expires_at" > "now"()))));



CREATE POLICY "Anyone can view own session by token" ON "public"."guest_checkout_sessions" FOR SELECT USING (true);



CREATE POLICY "Anyone can view quote items for shared quotes" ON "public"."quote_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."quotes" "q"
  WHERE (("q"."id" = "quote_items"."quote_id") AND ("q"."share_token" IS NOT NULL) AND (("q"."expires_at" IS NULL) OR ("q"."expires_at" > "now"()))))));



CREATE POLICY "Anyone can view shared quotes" ON "public"."quotes" FOR SELECT USING ((("share_token" IS NOT NULL) AND (("expires_at" IS NULL) OR ("expires_at" > "now"()))));



CREATE POLICY "Authenticated users can create comments" ON "public"."blog_comments" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Authenticated users can read customs tiers" ON "public"."route_customs_tiers" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authors can update own posts" ON "public"."blog_posts" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."blog_authors"
  WHERE (("blog_authors"."id" = "blog_posts"."author_id") AND ("blog_authors"."user_id" = "auth"."uid"())))));



CREATE POLICY "Country payment preferences are manageable by admins" ON "public"."country_payment_preferences" USING ("public"."is_admin"());



CREATE POLICY "Country payment preferences are viewable by everyone" ON "public"."country_payment_preferences" FOR SELECT USING (true);



CREATE POLICY "Customers can upload documents to their quotes" ON "public"."quote_documents" FOR INSERT WITH CHECK ((("quote_id" IN ( SELECT "quotes"."id"
   FROM "public"."quotes"
  WHERE ("quotes"."user_id" = "auth"."uid"()))) AND ("uploaded_by" = "auth"."uid"())));



CREATE POLICY "Customers can view own payment records" ON "public"."payment_records" FOR SELECT TO "authenticated" USING (("quote_id" IN ( SELECT "quotes"."id"
   FROM "public"."quotes"
  WHERE ("quotes"."user_id" = "auth"."uid"()))));



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



CREATE POLICY "Public can read blog author profiles" ON "public"."profiles" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."blog_authors"
  WHERE ("blog_authors"."user_id" = "profiles"."id"))));



CREATE POLICY "Public payment links viewable by all" ON "public"."paypal_payment_links" FOR SELECT TO "authenticated", "anon" USING ((("is_public" = true) AND ("status" = 'active'::"text")));



CREATE POLICY "Public read access" ON "public"."country_settings" FOR SELECT USING (true);



CREATE POLICY "Public read access" ON "public"."customs_categories" FOR SELECT USING (true);



CREATE POLICY "Public read access" ON "public"."payment_gateways" FOR SELECT USING (true);



CREATE POLICY "Service role can access all checkout sessions" ON "public"."authenticated_checkout_sessions" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can manage PayPal webhook events" ON "public"."paypal_webhook_events" TO "service_role" USING (true);



CREATE POLICY "Service role can manage link payments" ON "public"."paypal_link_payments" TO "service_role" USING (true);



CREATE POLICY "Service role can manage refunds" ON "public"."paypal_refunds" TO "service_role" USING (true);



CREATE POLICY "Service role full access" ON "public"."guest_checkout_sessions" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "System can manage emails" ON "public"."email_queue" USING (true);



CREATE POLICY "Users can access own checkout sessions" ON "public"."authenticated_checkout_sessions" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can access own subscriptions" ON "public"."paypal_subscriptions" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can delete own comments" ON "public"."blog_comments" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own quotes" ON "public"."quotes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own transactions" ON "public"."payment_transactions" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can manage own addresses" ON "public"."user_addresses" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own messages" ON "public"."messages" USING ((("auth"."uid"() = "sender_id") OR ("auth"."uid"() = "recipient_id")));



CREATE POLICY "Users can manage own profile" ON "public"."profiles" USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can manage own quote items" ON "public"."quote_items" USING ((EXISTS ( SELECT 1
   FROM "public"."quotes" "q"
  WHERE (("q"."id" = "quote_items"."quote_id") AND ("q"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can manage own quotes" ON "public"."quotes" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own author profile" ON "public"."blog_authors" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own comments" ON "public"."blog_comments" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own quotes" ON "public"."quotes" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view bank accounts for their country" ON "public"."bank_account_details" FOR SELECT USING ((("is_active" = true) AND (("country_code" = ( SELECT "profiles"."country"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))) OR ("is_fallback" = true))));



CREATE POLICY "Users can view delivery options for active routes" ON "public"."shipping_routes" FOR SELECT USING ((("active" = true) AND ("delivery_options" IS NOT NULL) AND ("jsonb_array_length"("delivery_options") > 0)));



CREATE POLICY "Users can view own invoice items" ON "public"."paypal_invoice_items" FOR SELECT TO "authenticated" USING (("invoice_id" IN ( SELECT "paypal_invoices"."id"
   FROM "public"."paypal_invoices"
  WHERE ("paypal_invoices"."quote_id" IN ( SELECT "quotes"."id"
           FROM "public"."quotes"
          WHERE ("quotes"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view own payment links" ON "public"."paypal_payment_links" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR ("created_by" = "auth"."uid"())));



CREATE POLICY "Users can view own quote invoices" ON "public"."paypal_invoices" FOR SELECT TO "authenticated" USING (("quote_id" IN ( SELECT "quotes"."id"
   FROM "public"."quotes"
  WHERE ("quotes"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view own refunds" ON "public"."paypal_refunds" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view own roles" ON "public"."user_roles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view payments for their links" ON "public"."paypal_link_payments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."paypal_payment_links" "ppl"
  WHERE (("ppl"."id" = "paypal_link_payments"."payment_link_id") AND (("ppl"."user_id" = "auth"."uid"()) OR ("ppl"."created_by" = "auth"."uid"()))))));



CREATE POLICY "Users can view public subscription plans" ON "public"."paypal_subscription_plans" FOR SELECT USING ((("is_public" = true) AND ("is_active" = true)));



CREATE POLICY "Users can view route customs tiers" ON "public"."route_customs_tiers" FOR SELECT USING ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "Users can view their own quote address history" ON "public"."quote_address_history" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."quotes" "q"
  WHERE (("q"."id" = "quote_address_history"."quote_id") AND ("q"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own quote status transitions" ON "public"."status_transitions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."quotes" "q"
  WHERE (("q"."id" = "status_transitions"."quote_id") AND ("q"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own quotes" ON "public"."quotes" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own transactions" ON "public"."payment_transactions" FOR SELECT USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."authenticated_checkout_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bank_account_details" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."blog_authors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."blog_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."blog_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."blog_post_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."blog_post_views" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."blog_posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."country_payment_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."country_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customs_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customs_rules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_queue" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."guest_checkout_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_gateways" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_records" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."paypal_invoice_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."paypal_invoices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."paypal_link_payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."paypal_payment_links" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."paypal_refund_reasons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."paypal_refunds" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."paypal_subscription_payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."paypal_subscription_plans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."paypal_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."paypal_webhook_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pending_confirmations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quote_documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quote_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quote_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quotes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rejection_reasons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."route_customs_tiers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shipping_routes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."system_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_addresses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."calculate_read_time"("content" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_read_time"("content" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_read_time"("content" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_authenticated_checkout_sessions"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_authenticated_checkout_sessions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_authenticated_checkout_sessions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_confirmations"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_confirmations"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_confirmations"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_guest_sessions"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_guest_sessions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_guest_sessions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_user_profile"("_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_user_profile"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_user_profile"("_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."expire_old_payment_links"() TO "anon";
GRANT ALL ON FUNCTION "public"."expire_old_payment_links"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."expire_old_payment_links"() TO "service_role";



GRANT ALL ON FUNCTION "public"."expire_quotes"() TO "anon";
GRANT ALL ON FUNCTION "public"."expire_quotes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."expire_quotes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_display_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_display_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_display_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_invoice_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_invoice_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_invoice_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_payment_link_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_payment_link_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_payment_link_code"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_share_token"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_share_token"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_share_token"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_slug"("title" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_slug"("title" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_slug"("title" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_all_user_emails"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_all_user_emails"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_all_user_emails"() TO "service_role";



GRANT ALL ON TABLE "public"."bank_account_details" TO "anon";
GRANT ALL ON TABLE "public"."bank_account_details" TO "authenticated";
GRANT ALL ON TABLE "public"."bank_account_details" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_bank_account_for_order"("p_country_code" "text", "p_destination_country" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_bank_account_for_order"("p_country_code" "text", "p_destination_country" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_bank_account_for_order"("p_country_code" "text", "p_destination_country" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_bank_details_for_email"("payment_currency" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_bank_details_for_email"("payment_currency" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_bank_details_for_email"("payment_currency" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_orders_with_payment_proofs"("status_filter" "text", "limit_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_orders_with_payment_proofs"("status_filter" "text", "limit_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_orders_with_payment_proofs"("status_filter" "text", "limit_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_payment_proof_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_payment_proof_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_payment_proof_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_shipping_cost"("p_origin_country" character varying, "p_destination_country" character varying, "p_weight" numeric, "p_price" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."get_shipping_cost"("p_origin_country" character varying, "p_destination_country" character varying, "p_weight" numeric, "p_price" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_shipping_cost"("p_origin_country" character varying, "p_destination_country" character varying, "p_weight" numeric, "p_price" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_subscription_analytics"("p_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_subscription_analytics"("p_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_subscription_analytics"("p_days" integer) TO "service_role";



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



GRANT ALL ON FUNCTION "public"."sync_invoice_payment_with_quote"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_invoice_payment_with_quote"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_invoice_payment_with_quote"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_update_payment_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_update_payment_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_update_payment_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_authenticated_checkout_sessions_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_authenticated_checkout_sessions_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_authenticated_checkout_sessions_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_blog_categories_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_blog_categories_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_blog_categories_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_blog_post_read_time"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_blog_post_read_time"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_blog_post_read_time"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_blog_posts_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_blog_posts_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_blog_posts_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_country_payment_preferences_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_country_payment_preferences_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_country_payment_preferences_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_guest_checkout_sessions_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_guest_checkout_sessions_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_guest_checkout_sessions_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_invoice_totals"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_invoice_totals"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_invoice_totals"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_invoices_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_invoices_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_invoices_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_payment_link_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_payment_link_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_payment_link_status"() TO "service_role";



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



GRANT ALL ON FUNCTION "public"."update_paypal_webhook_events_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_paypal_webhook_events_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_paypal_webhook_events_updated_at"() TO "service_role";



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



GRANT ALL ON TABLE "public"."blog_authors" TO "anon";
GRANT ALL ON TABLE "public"."blog_authors" TO "authenticated";
GRANT ALL ON TABLE "public"."blog_authors" TO "service_role";



GRANT ALL ON TABLE "public"."blog_categories" TO "anon";
GRANT ALL ON TABLE "public"."blog_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."blog_categories" TO "service_role";



GRANT ALL ON TABLE "public"."blog_comments" TO "anon";
GRANT ALL ON TABLE "public"."blog_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."blog_comments" TO "service_role";



GRANT ALL ON TABLE "public"."blog_post_categories" TO "anon";
GRANT ALL ON TABLE "public"."blog_post_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."blog_post_categories" TO "service_role";



GRANT ALL ON TABLE "public"."blog_post_views" TO "anon";
GRANT ALL ON TABLE "public"."blog_post_views" TO "authenticated";
GRANT ALL ON TABLE "public"."blog_post_views" TO "service_role";



GRANT ALL ON TABLE "public"."blog_posts" TO "anon";
GRANT ALL ON TABLE "public"."blog_posts" TO "authenticated";
GRANT ALL ON TABLE "public"."blog_posts" TO "service_role";



GRANT ALL ON TABLE "public"."country_payment_preferences" TO "anon";
GRANT ALL ON TABLE "public"."country_payment_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."country_payment_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."country_settings" TO "anon";
GRANT ALL ON TABLE "public"."country_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."country_settings" TO "service_role";



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



GRANT ALL ON TABLE "public"."guest_checkout_sessions" TO "anon";
GRANT ALL ON TABLE "public"."guest_checkout_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."guest_checkout_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."manual_analysis_tasks" TO "anon";
GRANT ALL ON TABLE "public"."manual_analysis_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."manual_analysis_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."payment_gateways" TO "anon";
GRANT ALL ON TABLE "public"."payment_gateways" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_gateways" TO "service_role";



GRANT ALL ON TABLE "public"."quotes" TO "anon";
GRANT ALL ON TABLE "public"."quotes" TO "authenticated";
GRANT ALL ON TABLE "public"."quotes" TO "service_role";



GRANT ALL ON TABLE "public"."payment_proof_verification_summary" TO "anon";
GRANT ALL ON TABLE "public"."payment_proof_verification_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_proof_verification_summary" TO "service_role";



GRANT ALL ON TABLE "public"."payment_records" TO "anon";
GRANT ALL ON TABLE "public"."payment_records" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_records" TO "service_role";



GRANT ALL ON TABLE "public"."payment_reminders" TO "anon";
GRANT ALL ON TABLE "public"."payment_reminders" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_reminders" TO "service_role";



GRANT ALL ON TABLE "public"."payment_transactions" TO "anon";
GRANT ALL ON TABLE "public"."payment_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."paypal_invoice_items" TO "anon";
GRANT ALL ON TABLE "public"."paypal_invoice_items" TO "authenticated";
GRANT ALL ON TABLE "public"."paypal_invoice_items" TO "service_role";



GRANT ALL ON TABLE "public"."paypal_invoices" TO "anon";
GRANT ALL ON TABLE "public"."paypal_invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."paypal_invoices" TO "service_role";



GRANT ALL ON TABLE "public"."paypal_invoices_with_quote_info" TO "anon";
GRANT ALL ON TABLE "public"."paypal_invoices_with_quote_info" TO "authenticated";
GRANT ALL ON TABLE "public"."paypal_invoices_with_quote_info" TO "service_role";



GRANT ALL ON TABLE "public"."paypal_link_payments" TO "anon";
GRANT ALL ON TABLE "public"."paypal_link_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."paypal_link_payments" TO "service_role";



GRANT ALL ON TABLE "public"."paypal_payment_links" TO "anon";
GRANT ALL ON TABLE "public"."paypal_payment_links" TO "authenticated";
GRANT ALL ON TABLE "public"."paypal_payment_links" TO "service_role";



GRANT ALL ON TABLE "public"."paypal_payment_links_summary" TO "anon";
GRANT ALL ON TABLE "public"."paypal_payment_links_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."paypal_payment_links_summary" TO "service_role";



GRANT ALL ON TABLE "public"."paypal_refund_reasons" TO "anon";
GRANT ALL ON TABLE "public"."paypal_refund_reasons" TO "authenticated";
GRANT ALL ON TABLE "public"."paypal_refund_reasons" TO "service_role";



GRANT ALL ON TABLE "public"."paypal_refunds" TO "anon";
GRANT ALL ON TABLE "public"."paypal_refunds" TO "authenticated";
GRANT ALL ON TABLE "public"."paypal_refunds" TO "service_role";



GRANT ALL ON TABLE "public"."paypal_refund_summary" TO "anon";
GRANT ALL ON TABLE "public"."paypal_refund_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."paypal_refund_summary" TO "service_role";



GRANT ALL ON TABLE "public"."paypal_subscription_payments" TO "anon";
GRANT ALL ON TABLE "public"."paypal_subscription_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."paypal_subscription_payments" TO "service_role";



GRANT ALL ON TABLE "public"."paypal_subscription_plans" TO "anon";
GRANT ALL ON TABLE "public"."paypal_subscription_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."paypal_subscription_plans" TO "service_role";



GRANT ALL ON TABLE "public"."paypal_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."paypal_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."paypal_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."paypal_webhook_events" TO "anon";
GRANT ALL ON TABLE "public"."paypal_webhook_events" TO "authenticated";
GRANT ALL ON TABLE "public"."paypal_webhook_events" TO "service_role";



GRANT ALL ON TABLE "public"."pending_confirmations" TO "anon";
GRANT ALL ON TABLE "public"."pending_confirmations" TO "authenticated";
GRANT ALL ON TABLE "public"."pending_confirmations" TO "service_role";



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



GRANT ALL ON TABLE "public"."user_subscription_summary" TO "anon";
GRANT ALL ON TABLE "public"."user_subscription_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."user_subscription_summary" TO "service_role";









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
