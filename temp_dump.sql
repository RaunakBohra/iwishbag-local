

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



CREATE OR REPLACE FUNCTION "public"."ensure_user_profile"("_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Check if profile exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id) THEN
    -- Create profile
    INSERT INTO public.profiles (id, full_name, phone, country, preferred_display_currency, referral_code)
    VALUES (
      _user_id, 
      'User', 
      NULL,
      'US',
      'USD',
      'REF' || substr(md5(random()::text), 1, 8)
    );
    
    -- Create user role
    INSERT INTO public.user_roles (user_id, role, created_by)
    VALUES (_user_id, 'user', _user_id);
    
    -- Create notification preferences
    INSERT INTO public.notification_preferences (user_id)
    VALUES (_user_id);
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."ensure_user_profile"("_user_id" "uuid") OWNER TO "postgres";


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
    "instructions" "text"
);


ALTER TABLE "public"."bank_account_details" OWNER TO "postgres";


COMMENT ON COLUMN "public"."bank_account_details"."is_fallback" IS 'Indicates if this account should be used as fallback when no country-specific account is found. Only one fallback per currency allowed.';



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


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, country, preferred_display_currency)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'country',  -- Only set if explicitly provided
    new.raw_user_meta_data->>'currency'  -- Only set if explicitly provided
  );
  
  INSERT INTO public.user_roles (user_id, role, created_by)
  VALUES (new.id, 'user', new.id);
  
  INSERT INTO public.notification_preferences (user_id)
  VALUES (new.id);
  
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


CREATE OR REPLACE FUNCTION "public"."update_country_payment_preferences_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_country_payment_preferences_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_payment_links_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_payment_links_updated_at"() OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "table_name" "text" NOT NULL,
    "record_id" "text" NOT NULL,
    "action" "text" NOT NULL,
    "old_values" "jsonb",
    "new_values" "jsonb",
    "changed_by" "uuid",
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "audit_logs_action_check" CHECK (("action" = ANY (ARRAY['INSERT'::"text", 'UPDATE'::"text", 'DELETE'::"text"])))
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


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
    "rate_from_usd" numeric(10,6) NOT NULL,
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



CREATE TABLE IF NOT EXISTS "public"."customs_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "duty_percent" numeric(5,2) DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "customs_categories_duty_percent_check" CHECK (("duty_percent" >= (0)::numeric))
);


ALTER TABLE "public"."customs_categories" OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "public"."footer_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_name" "text",
    "company_description" "text",
    "primary_phone" "text",
    "secondary_phone" "text",
    "primary_email" "text",
    "support_email" "text",
    "primary_address" "text",
    "secondary_address" "text",
    "business_hours" "text",
    "social_twitter" "text",
    "social_facebook" "text",
    "social_instagram" "text",
    "social_linkedin" "text",
    "website_logo_url" "text",
    "hero_banner_url" "text",
    "hero_headline" "text",
    "hero_subheadline" "text",
    "hero_cta_text" "text",
    "hero_cta_link" "text",
    "how_it_works_steps" "jsonb",
    "value_props" "jsonb",
    "social_links" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "contact_email" "text",
    CONSTRAINT "footer_settings_primary_email_check" CHECK ((("primary_email" IS NULL) OR ("primary_email" ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::"text"))),
    CONSTRAINT "footer_settings_support_email_check" CHECK ((("support_email" IS NULL) OR ("support_email" ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::"text")))
);


ALTER TABLE "public"."footer_settings" OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "public"."membership_tiers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "monthly_price" numeric(10,2) DEFAULT 0,
    "annual_price" numeric(10,2) DEFAULT 0,
    "benefits" "jsonb" DEFAULT '{}'::"jsonb",
    "free_shipping_threshold" numeric(10,2),
    "service_fee_discount" numeric(5,2) DEFAULT 0,
    "priority_processing" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "membership_tiers_annual_price_check" CHECK (("annual_price" >= (0)::numeric)),
    CONSTRAINT "membership_tiers_monthly_price_check" CHECK (("monthly_price" >= (0)::numeric)),
    CONSTRAINT "membership_tiers_service_fee_discount_check" CHECK (("service_fee_discount" >= (0)::numeric))
);


ALTER TABLE "public"."membership_tiers" OWNER TO "postgres";


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



CREATE TABLE IF NOT EXISTS "public"."notification_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "email_order_updates" boolean DEFAULT true,
    "email_quote_updates" boolean DEFAULT true,
    "email_promotions" boolean DEFAULT true,
    "in_app_notifications" boolean DEFAULT true,
    "sms_order_updates" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notification_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "type" "text" DEFAULT 'info'::"text",
    "is_read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_tracking_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quote_id" "uuid",
    "tracking_number" "text",
    "carrier" "text",
    "event_type" "text" NOT NULL,
    "description" "text",
    "location" "text",
    "estimated_delivery" timestamp with time zone,
    "actual_timestamp" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."order_tracking_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_workflow_steps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "order_position" integer NOT NULL,
    "estimated_duration_hours" integer,
    "requires_admin_action" boolean DEFAULT false,
    "is_customer_visible" boolean DEFAULT true,
    "country_specific" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."order_workflow_steps" OWNER TO "postgres";


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
    CONSTRAINT "payment_gateways_fee_fixed_check" CHECK (("fee_fixed" >= (0)::numeric)),
    CONSTRAINT "payment_gateways_fee_percent_check" CHECK (("fee_percent" >= (0)::numeric))
);


ALTER TABLE "public"."payment_gateways" OWNER TO "postgres";


COMMENT ON COLUMN "public"."payment_gateways"."priority" IS 'Payment gateway priority (lower number = higher priority, 1 = highest)';



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
    "user_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "status" "text",
    "approval_status" "public"."quote_approval_status" DEFAULT 'pending'::"public"."quote_approval_status",
    "priority" "public"."quote_priority" DEFAULT 'normal'::"public"."quote_priority",
    "country_code" "text",
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
    CONSTRAINT "quotes_customs_and_ecs_check" CHECK (("customs_and_ecs" >= (0)::numeric)),
    CONSTRAINT "quotes_discount_check" CHECK (("discount" >= (0)::numeric)),
    CONSTRAINT "quotes_domestic_shipping_check" CHECK (("domestic_shipping" >= (0)::numeric)),
    CONSTRAINT "quotes_email_check" CHECK (("email" ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::"text")),
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
    CONSTRAINT "valid_quote_status" CHECK (("status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'approved'::"text", 'rejected'::"text", 'expired'::"text", 'calculated'::"text", 'payment_pending'::"text", 'partial_payment'::"text", 'processing'::"text", 'paid'::"text", 'ordered'::"text", 'shipped'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."quotes" OWNER TO "postgres";


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
    "updated_at" timestamp with time zone DEFAULT "now"()
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
    CONSTRAINT "valid_country" CHECK ((("country" IS NULL) OR ("country" ~ '^[A-Z]{2}$'::"text"))),
    CONSTRAINT "valid_currency" CHECK ((("preferred_display_currency" IS NULL) OR ("preferred_display_currency" = ANY (ARRAY['USD'::"text", 'EUR'::"text", 'GBP'::"text", 'CAD'::"text", 'AUD'::"text", 'JPY'::"text", 'SGD'::"text", 'AED'::"text", 'SAR'::"text", 'EGP'::"text", 'TRY'::"text", 'INR'::"text", 'NPR'::"text"]))))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


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



CREATE TABLE IF NOT EXISTS "public"."quote_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quote_id" "uuid" NOT NULL,
    "product_name" "text",
    "product_url" "text",
    "image_url" "text",
    "category" "text",
    "item_currency" "text" NOT NULL,
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


CREATE TABLE IF NOT EXISTS "public"."referral_rewards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "reward_type" "text" NOT NULL,
    "reward_value" numeric(10,2) NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text",
    "min_order_value" numeric(10,2) DEFAULT 0,
    "max_uses" integer,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "referral_rewards_reward_type_check" CHECK (("reward_type" = ANY (ARRAY['percentage'::"text", 'fixed'::"text"]))),
    CONSTRAINT "referral_rewards_reward_value_check" CHECK (("reward_value" > (0)::numeric))
);


ALTER TABLE "public"."referral_rewards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."referrals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "referral_code" "text" NOT NULL,
    "referrer_id" "uuid",
    "referee_id" "uuid",
    "referred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "reward_amount" numeric(10,2),
    "reward_currency" "text" DEFAULT 'USD'::"text",
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "referrals_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'completed'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."referrals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rejection_reasons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reason" "text" NOT NULL,
    "category" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."rejection_reasons" OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "public"."tracking_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "carrier" "text",
    "country_from" "text" NOT NULL,
    "country_to" "text" NOT NULL,
    "estimated_days" integer,
    "template_steps" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "tracking_templates_estimated_days_check" CHECK (("estimated_days" > 0))
);


ALTER TABLE "public"."tracking_templates" OWNER TO "postgres";


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
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_addresses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_memberships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "tier_id" "uuid",
    "stripe_subscription_id" "text",
    "status" "text",
    "current_period_start" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_memberships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."app_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_wishlist_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "product_url" "text" NOT NULL,
    "product_name" "text",
    "image_url" "text",
    "estimated_price" numeric(10,2),
    "currency" "text",
    "category" "text",
    "notes" "text",
    "is_favorite" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_wishlist_items" OWNER TO "postgres";


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


COMMENT ON TABLE "public"."webhook_logs" IS 'Logs for webhook processing attempts for monitoring and debugging';



COMMENT ON COLUMN "public"."webhook_logs"."request_id" IS 'Unique identifier for each webhook request';



COMMENT ON COLUMN "public"."webhook_logs"."webhook_type" IS 'Type of webhook (payu, stripe, etc.)';



COMMENT ON COLUMN "public"."webhook_logs"."status" IS 'Status of webhook processing (started, success, failed, warning)';



COMMENT ON COLUMN "public"."webhook_logs"."user_agent" IS 'User agent from webhook request';



COMMENT ON COLUMN "public"."webhook_logs"."error_message" IS 'Error message if webhook processing failed';



ALTER TABLE ONLY "public"."quote_address_history" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."quote_address_history_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bank_account_details"
    ADD CONSTRAINT "bank_account_details_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."country_payment_preferences"
    ADD CONSTRAINT "country_payment_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."country_settings"
    ADD CONSTRAINT "country_settings_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."customs_categories"
    ADD CONSTRAINT "customs_categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."customs_categories"
    ADD CONSTRAINT "customs_categories_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."footer_settings"
    ADD CONSTRAINT "footer_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."manual_analysis_tasks"
    ADD CONSTRAINT "manual_analysis_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."membership_tiers"
    ADD CONSTRAINT "membership_tiers_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."membership_tiers"
    ADD CONSTRAINT "membership_tiers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_tracking_events"
    ADD CONSTRAINT "order_tracking_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_workflow_steps"
    ADD CONSTRAINT "order_workflow_steps_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."payment_links"
    ADD CONSTRAINT "payment_links_link_code_key" UNIQUE ("link_code");



ALTER TABLE ONLY "public"."payment_links"
    ADD CONSTRAINT "payment_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_records"
    ADD CONSTRAINT "payment_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_reminders"
    ADD CONSTRAINT "payment_reminders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_transactions"
    ADD CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_verification_logs"
    ADD CONSTRAINT "payment_verification_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_referral_code_key" UNIQUE ("referral_code");



ALTER TABLE ONLY "public"."quote_address_history"
    ADD CONSTRAINT "quote_address_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quote_items"
    ADD CONSTRAINT "quote_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quote_templates"
    ADD CONSTRAINT "quote_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_display_id_key" UNIQUE ("display_id");



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_order_display_id_key" UNIQUE ("order_display_id");



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."referral_rewards"
    ADD CONSTRAINT "referral_rewards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_referral_code_key" UNIQUE ("referral_code");



ALTER TABLE ONLY "public"."rejection_reasons"
    ADD CONSTRAINT "rejection_reasons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."status_transitions"
    ADD CONSTRAINT "status_transitions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_setting_key_key" UNIQUE ("setting_key");



ALTER TABLE ONLY "public"."tracking_templates"
    ADD CONSTRAINT "tracking_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."country_payment_preferences"
    ADD CONSTRAINT "unique_country_gateway" UNIQUE ("country_code", "gateway_code");



ALTER TABLE ONLY "public"."country_payment_preferences"
    ADD CONSTRAINT "unique_country_priority" UNIQUE ("country_code", "priority");



ALTER TABLE ONLY "public"."user_addresses"
    ADD CONSTRAINT "user_addresses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_memberships"
    ADD CONSTRAINT "user_memberships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_key" UNIQUE ("user_id", "role");



ALTER TABLE ONLY "public"."user_wishlist_items"
    ADD CONSTRAINT "user_wishlist_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."webhook_logs"
    ADD CONSTRAINT "webhook_logs_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_bank_account_details_destination_country" ON "public"."bank_account_details" USING "btree" ("destination_country");



CREATE INDEX "idx_bank_accounts_country" ON "public"."bank_account_details" USING "btree" ("country_code");



CREATE INDEX "idx_bank_accounts_fallback" ON "public"."bank_account_details" USING "btree" ("is_fallback");



CREATE INDEX "idx_country_payment_preferences_active" ON "public"."country_payment_preferences" USING "btree" ("is_active");



CREATE INDEX "idx_country_payment_preferences_country" ON "public"."country_payment_preferences" USING "btree" ("country_code");



CREATE INDEX "idx_country_payment_preferences_priority" ON "public"."country_payment_preferences" USING "btree" ("country_code", "priority");



CREATE INDEX "idx_country_settings_currency" ON "public"."country_settings" USING "btree" ("currency");



CREATE INDEX "idx_country_settings_minimum_payment" ON "public"."country_settings" USING "btree" ("minimum_payment_amount");



CREATE INDEX "idx_email_queue_status" ON "public"."email_queue" USING "btree" ("status", "created_at");



CREATE INDEX "idx_manual_analysis_tasks_quote_id" ON "public"."manual_analysis_tasks" USING "btree" ("quote_id");



CREATE INDEX "idx_manual_analysis_tasks_status" ON "public"."manual_analysis_tasks" USING "btree" ("status");



CREATE INDEX "idx_messages_created_at" ON "public"."messages" USING "btree" ("created_at");



CREATE INDEX "idx_messages_message_type" ON "public"."messages" USING "btree" ("message_type");



CREATE INDEX "idx_messages_payment_proof" ON "public"."messages" USING "btree" ("quote_id", "message_type") WHERE ("message_type" = 'payment_proof'::"text");



CREATE INDEX "idx_messages_quote_payment_proof" ON "public"."messages" USING "btree" ("quote_id", "message_type") WHERE ("message_type" = 'payment_proof'::"text");



CREATE INDEX "idx_messages_recipient_id" ON "public"."messages" USING "btree" ("recipient_id");



CREATE INDEX "idx_messages_sender_id" ON "public"."messages" USING "btree" ("sender_id");



CREATE INDEX "idx_notifications_is_read" ON "public"."notifications" USING "btree" ("is_read");



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_order_tracking_quote_id" ON "public"."order_tracking_events" USING "btree" ("quote_id");



CREATE INDEX "idx_order_tracking_tracking_number" ON "public"."order_tracking_events" USING "btree" ("tracking_number");



CREATE INDEX "idx_order_workflow_steps_position" ON "public"."order_workflow_steps" USING "btree" ("order_position");



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



CREATE INDEX "idx_payment_links_expires_at" ON "public"."payment_links" USING "btree" ("expires_at");



CREATE INDEX "idx_payment_links_gateway" ON "public"."payment_links" USING "btree" ("gateway");



CREATE INDEX "idx_payment_links_gateway_link_id" ON "public"."payment_links" USING "btree" ("gateway_link_id");



CREATE INDEX "idx_payment_links_link_code" ON "public"."payment_links" USING "btree" ("link_code");



CREATE INDEX "idx_payment_links_quote_id" ON "public"."payment_links" USING "btree" ("quote_id");



CREATE INDEX "idx_payment_links_status" ON "public"."payment_links" USING "btree" ("status");



CREATE INDEX "idx_payment_links_user_id" ON "public"."payment_links" USING "btree" ("user_id");



CREATE INDEX "idx_payment_records_created_at" ON "public"."payment_records" USING "btree" ("created_at");



CREATE INDEX "idx_payment_records_quote_id" ON "public"."payment_records" USING "btree" ("quote_id");



CREATE INDEX "idx_payment_transactions_quote_id" ON "public"."payment_transactions" USING "btree" ("quote_id");



CREATE INDEX "idx_payment_transactions_status" ON "public"."payment_transactions" USING "btree" ("status");



CREATE INDEX "idx_payment_transactions_user_id" ON "public"."payment_transactions" USING "btree" ("user_id");



CREATE INDEX "idx_payment_verification_logs_created_at" ON "public"."payment_verification_logs" USING "btree" ("created_at");



CREATE INDEX "idx_payment_verification_logs_gateway" ON "public"."payment_verification_logs" USING "btree" ("gateway");



CREATE INDEX "idx_payment_verification_logs_request_id" ON "public"."payment_verification_logs" USING "btree" ("request_id");



CREATE INDEX "idx_payment_verification_logs_success" ON "public"."payment_verification_logs" USING "btree" ("success");



CREATE INDEX "idx_payment_verification_logs_transaction_id" ON "public"."payment_verification_logs" USING "btree" ("transaction_id");



CREATE INDEX "idx_profiles_country" ON "public"."profiles" USING "btree" ("country");



CREATE INDEX "idx_profiles_referral_code" ON "public"."profiles" USING "btree" ("referral_code");



CREATE INDEX "idx_quote_address_history_changed_at" ON "public"."quote_address_history" USING "btree" ("changed_at");



CREATE INDEX "idx_quote_address_history_quote_id" ON "public"."quote_address_history" USING "btree" ("quote_id");



CREATE INDEX "idx_quote_items_quote_id" ON "public"."quote_items" USING "btree" ("quote_id");



CREATE INDEX "idx_quote_templates_name" ON "public"."quote_templates" USING "btree" ("template_name");



CREATE INDEX "idx_quotes_address_locked" ON "public"."quotes" USING "btree" ("address_locked");



CREATE INDEX "idx_quotes_approval_status" ON "public"."quotes" USING "btree" ("approval_status");



CREATE INDEX "idx_quotes_country_code" ON "public"."quotes" USING "btree" ("country_code");



CREATE INDEX "idx_quotes_created_at" ON "public"."quotes" USING "btree" ("created_at");



CREATE INDEX "idx_quotes_display_id" ON "public"."quotes" USING "btree" ("display_id");



CREATE INDEX "idx_quotes_email" ON "public"."quotes" USING "btree" ("email");



CREATE INDEX "idx_quotes_in_cart" ON "public"."quotes" USING "btree" ("in_cart");



CREATE INDEX "idx_quotes_payment_status" ON "public"."quotes" USING "btree" ("payment_status");



CREATE INDEX "idx_quotes_status" ON "public"."quotes" USING "btree" ("status");



CREATE INDEX "idx_quotes_user_id" ON "public"."quotes" USING "btree" ("user_id");



CREATE INDEX "idx_referrals_referee_id" ON "public"."referrals" USING "btree" ("referee_id");



CREATE INDEX "idx_referrals_referral_code" ON "public"."referrals" USING "btree" ("referral_code");



CREATE INDEX "idx_referrals_referrer_id" ON "public"."referrals" USING "btree" ("referrer_id");



CREATE INDEX "idx_rejection_reasons_active" ON "public"."rejection_reasons" USING "btree" ("is_active");



CREATE INDEX "idx_status_transitions_changed_at" ON "public"."status_transitions" USING "btree" ("changed_at");



CREATE INDEX "idx_status_transitions_quote_id" ON "public"."status_transitions" USING "btree" ("quote_id");



CREATE INDEX "idx_status_transitions_trigger" ON "public"."status_transitions" USING "btree" ("trigger");



CREATE INDEX "idx_user_addresses_user_id" ON "public"."user_addresses" USING "btree" ("user_id");



CREATE INDEX "idx_user_memberships_user_id" ON "public"."user_memberships" USING "btree" ("user_id");



CREATE INDEX "idx_user_roles_user_id" ON "public"."user_roles" USING "btree" ("user_id");



CREATE INDEX "idx_user_wishlist_items_user_id" ON "public"."user_wishlist_items" USING "btree" ("user_id");



CREATE INDEX "idx_webhook_logs_created_at" ON "public"."webhook_logs" USING "btree" ("created_at");



CREATE INDEX "idx_webhook_logs_request_id" ON "public"."webhook_logs" USING "btree" ("request_id");



CREATE INDEX "idx_webhook_logs_status" ON "public"."webhook_logs" USING "btree" ("status");



CREATE INDEX "idx_webhook_logs_webhook_type" ON "public"."webhook_logs" USING "btree" ("webhook_type");



CREATE OR REPLACE TRIGGER "generate_quote_display_id" BEFORE INSERT ON "public"."quotes" FOR EACH ROW EXECUTE FUNCTION "public"."generate_display_id"();



CREATE OR REPLACE TRIGGER "trigger_country_payment_preferences_updated_at" BEFORE UPDATE ON "public"."country_payment_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_country_payment_preferences_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_log_address_change_insert" AFTER INSERT ON "public"."quotes" FOR EACH ROW WHEN (("new"."shipping_address" IS NOT NULL)) EXECUTE FUNCTION "public"."log_address_change"();



CREATE OR REPLACE TRIGGER "trigger_log_address_change_update" AFTER UPDATE ON "public"."quotes" FOR EACH ROW WHEN ((("old"."shipping_address" IS DISTINCT FROM "new"."shipping_address") OR ("old"."address_locked" IS DISTINCT FROM "new"."address_locked"))) EXECUTE FUNCTION "public"."log_address_change"();



CREATE OR REPLACE TRIGGER "trigger_log_quote_status_change" AFTER UPDATE ON "public"."quotes" FOR EACH ROW EXECUTE FUNCTION "public"."log_quote_status_change"();



CREATE OR REPLACE TRIGGER "update_payment_links_updated_at_trigger" BEFORE UPDATE ON "public"."payment_links" FOR EACH ROW EXECUTE FUNCTION "public"."update_payment_links_updated_at"();



CREATE OR REPLACE TRIGGER "update_payment_status_on_payment_record" AFTER INSERT OR DELETE OR UPDATE ON "public"."payment_records" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_update_payment_status"();



CREATE OR REPLACE TRIGGER "update_payment_status_on_quote" BEFORE UPDATE OF "amount_paid" ON "public"."quotes" FOR EACH ROW EXECUTE FUNCTION "public"."update_payment_status"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_quotes_updated_at" BEFORE UPDATE ON "public"."quotes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."bank_account_details"
    ADD CONSTRAINT "bank_account_details_country_code_fkey" FOREIGN KEY ("country_code") REFERENCES "public"."country_settings"("code");



ALTER TABLE ONLY "public"."country_payment_preferences"
    ADD CONSTRAINT "fk_country_payment_preferences_country" FOREIGN KEY ("country_code") REFERENCES "public"."country_settings"("code") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."country_payment_preferences"
    ADD CONSTRAINT "fk_country_payment_preferences_gateway" FOREIGN KEY ("gateway_code") REFERENCES "public"."payment_gateways"("code") ON DELETE CASCADE;



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



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_error_logs"
    ADD CONSTRAINT "payment_error_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."payment_links"
    ADD CONSTRAINT "payment_links_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."payment_links"
    ADD CONSTRAINT "payment_links_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id");



ALTER TABLE ONLY "public"."payment_links"
    ADD CONSTRAINT "payment_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



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



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quote_address_history"
    ADD CONSTRAINT "quote_address_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."quote_address_history"
    ADD CONSTRAINT "quote_address_history_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quote_items"
    ADD CONSTRAINT "quote_items_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_address_updated_by_fkey" FOREIGN KEY ("address_updated_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_country_code_fkey" FOREIGN KEY ("country_code") REFERENCES "public"."country_settings"("code");



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_customs_category_name_fkey" FOREIGN KEY ("customs_category_name") REFERENCES "public"."customs_categories"("name");



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_rejection_reason_id_fkey" FOREIGN KEY ("rejection_reason_id") REFERENCES "public"."rejection_reasons"("id");



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_referee_id_fkey" FOREIGN KEY ("referee_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."status_transitions"
    ADD CONSTRAINT "status_transitions_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."status_transitions"
    ADD CONSTRAINT "status_transitions_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_addresses"
    ADD CONSTRAINT "user_addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_memberships"
    ADD CONSTRAINT "user_memberships_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "public"."membership_tiers"("id");



ALTER TABLE ONLY "public"."user_memberships"
    ADD CONSTRAINT "user_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_wishlist_items"
    ADD CONSTRAINT "user_wishlist_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Admin can create payment records" ON "public"."payment_records" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admin can manage alert thresholds" ON "public"."payment_alert_thresholds" USING ("public"."is_admin"());



CREATE POLICY "Admin can manage payment error logs" ON "public"."payment_error_logs" USING ("public"."is_admin"());



CREATE POLICY "Admin can view all emails" ON "public"."email_queue" FOR SELECT USING (("auth"."uid"() IN ( SELECT "user_roles"."user_id"
   FROM "public"."user_roles"
  WHERE ("user_roles"."role" = 'admin'::"public"."app_role"))));



CREATE POLICY "Admin can view all payment records" ON "public"."payment_records" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admin only access to payment health logs" ON "public"."payment_health_logs" USING ("public"."is_admin"());



CREATE POLICY "Admin only access to payment verification logs" ON "public"."payment_verification_logs" USING ("public"."is_admin"());



CREATE POLICY "Admin only access to webhook logs" ON "public"."webhook_logs" USING ("public"."is_admin"());



CREATE POLICY "Admins can manage all roles" ON "public"."user_roles" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can manage payment links" ON "public"."payment_links" USING ("public"."is_admin"());



CREATE POLICY "Admins can manage rejection reasons" ON "public"."rejection_reasons" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['admin'::"public"."app_role", 'moderator'::"public"."app_role"]))))));



CREATE POLICY "Admins can update verification status" ON "public"."messages" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins have full access" ON "public"."bank_account_details" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins have full access" ON "public"."country_settings" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins have full access" ON "public"."email_settings" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins have full access" ON "public"."email_templates" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins have full access" ON "public"."manual_analysis_tasks" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins have full access" ON "public"."messages" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins have full access" ON "public"."notification_preferences" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins have full access" ON "public"."notifications" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins have full access" ON "public"."order_tracking_events" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins have full access" ON "public"."order_workflow_steps" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins have full access" ON "public"."payment_reminders" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins have full access" ON "public"."payment_transactions" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins have full access" ON "public"."profiles" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins have full access" ON "public"."quote_address_history" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins have full access" ON "public"."quote_items" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins have full access" ON "public"."quote_templates" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins have full access" ON "public"."quotes" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins have full access" ON "public"."referrals" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins have full access" ON "public"."rejection_reasons" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins have full access" ON "public"."status_transitions" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins have full access" ON "public"."system_settings" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins have full access" ON "public"."user_addresses" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins have full access" ON "public"."user_memberships" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins have full access" ON "public"."user_wishlist_items" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Country payment preferences are manageable by admins" ON "public"."country_payment_preferences" USING ("public"."is_admin"());



CREATE POLICY "Country payment preferences are viewable by everyone" ON "public"."country_payment_preferences" FOR SELECT USING (true);



CREATE POLICY "Customers can view own payment records" ON "public"."payment_records" FOR SELECT TO "authenticated" USING (("quote_id" IN ( SELECT "quotes"."id"
   FROM "public"."quotes"
  WHERE ("quotes"."user_id" = "auth"."uid"()))));



CREATE POLICY "Everyone can view active rejection reasons" ON "public"."rejection_reasons" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Public read access" ON "public"."country_settings" FOR SELECT USING (true);



CREATE POLICY "Public read access" ON "public"."customs_categories" FOR SELECT USING (true);



CREATE POLICY "Public read access" ON "public"."footer_settings" FOR SELECT USING (true);



CREATE POLICY "Public read access" ON "public"."membership_tiers" FOR SELECT USING (true);



CREATE POLICY "Public read access" ON "public"."payment_gateways" FOR SELECT USING (true);



CREATE POLICY "Public read access" ON "public"."referral_rewards" FOR SELECT USING (true);



CREATE POLICY "Public read access" ON "public"."rejection_reasons" FOR SELECT USING (true);



CREATE POLICY "Public read access" ON "public"."tracking_templates" FOR SELECT USING (true);



CREATE POLICY "Public read access for rejection reasons" ON "public"."rejection_reasons" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Service role has full access to payment links" ON "public"."payment_links" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "System can insert payment error logs" ON "public"."payment_error_logs" FOR INSERT WITH CHECK (true);



CREATE POLICY "System can manage emails" ON "public"."email_queue" USING (true);



CREATE POLICY "Users can insert their own transactions" ON "public"."payment_transactions" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can manage own addresses" ON "public"."user_addresses" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own memberships" ON "public"."user_memberships" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own messages" ON "public"."messages" USING ((("auth"."uid"() = "sender_id") OR ("auth"."uid"() = "recipient_id")));



CREATE POLICY "Users can manage own notification preferences" ON "public"."notification_preferences" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own notifications" ON "public"."notifications" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own profile" ON "public"."profiles" USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can manage own quote items" ON "public"."quote_items" USING ((EXISTS ( SELECT 1
   FROM "public"."quotes" "q"
  WHERE (("q"."id" = "quote_items"."quote_id") AND ("q"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can manage own quotes" ON "public"."quotes" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own referrals" ON "public"."referrals" USING ((("auth"."uid"() = "referrer_id") OR ("auth"."uid"() = "referee_id")));



CREATE POLICY "Users can manage own wishlist items" ON "public"."user_wishlist_items" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can use public payment links" ON "public"."payment_links" FOR UPDATE USING (("is_public" = true)) WITH CHECK (("is_public" = true));



CREATE POLICY "Users can view bank accounts for their country" ON "public"."bank_account_details" FOR SELECT USING ((("is_active" = true) AND (("country_code" = ( SELECT "profiles"."country"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))) OR ("is_fallback" = true))));



CREATE POLICY "Users can view own payment error logs" ON "public"."payment_error_logs" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "Users can view own roles" ON "public"."user_roles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own quote address history" ON "public"."quote_address_history" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."quotes" "q"
  WHERE (("q"."id" = "quote_address_history"."quote_id") AND ("q"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own quote status transitions" ON "public"."status_transitions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."quotes" "q"
  WHERE (("q"."id" = "status_transitions"."quote_id") AND ("q"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own transactions" ON "public"."payment_transactions" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their payment links" ON "public"."payment_links" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("quote_id" IN ( SELECT "quotes"."id"
   FROM "public"."quotes"
  WHERE ("quotes"."user_id" = "auth"."uid"()))) OR ("is_public" = true)));



ALTER TABLE "public"."bank_account_details" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."country_payment_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."country_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customs_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_queue" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."footer_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."membership_tiers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_tracking_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_workflow_steps" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_alert_thresholds" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_error_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_gateways" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_health_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_records" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_verification_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quote_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quote_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quotes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."referral_rewards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."referrals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rejection_reasons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."system_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tracking_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_addresses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_memberships" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_wishlist_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."webhook_logs" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



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



GRANT ALL ON FUNCTION "public"."confirm_payment_from_proof"("p_quote_id" "uuid", "p_amount_paid" numeric, "p_payment_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."confirm_payment_from_proof"("p_quote_id" "uuid", "p_amount_paid" numeric, "p_payment_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."confirm_payment_from_proof"("p_quote_id" "uuid", "p_amount_paid" numeric, "p_payment_status" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_user_profile"("_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_user_profile"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_user_profile"("_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_display_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_display_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_display_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_payment_link_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_payment_link_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_payment_link_code"() TO "service_role";



GRANT ALL ON TABLE "public"."bank_account_details" TO "anon";
GRANT ALL ON TABLE "public"."bank_account_details" TO "authenticated";
GRANT ALL ON TABLE "public"."bank_account_details" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_bank_account_for_order"("p_country_code" "text", "p_destination_country" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_bank_account_for_order"("p_country_code" "text", "p_destination_country" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_bank_account_for_order"("p_country_code" "text", "p_destination_country" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_orders_with_payment_proofs"("status_filter" "text", "limit_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_orders_with_payment_proofs"("status_filter" "text", "limit_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_orders_with_payment_proofs"("status_filter" "text", "limit_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_payment_proof_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_payment_proof_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_payment_proof_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_bank_accounts"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_bank_accounts"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_bank_accounts"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



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



GRANT ALL ON FUNCTION "public"."record_payment_with_ledger_and_triggers"("p_quote_id" "uuid", "p_amount" numeric, "p_currency" "text", "p_payment_method" "text", "p_transaction_reference" "text", "p_notes" "text", "p_recorded_by" "uuid", "p_payment_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."record_payment_with_ledger_and_triggers"("p_quote_id" "uuid", "p_amount" numeric, "p_currency" "text", "p_payment_method" "text", "p_transaction_reference" "text", "p_notes" "text", "p_recorded_by" "uuid", "p_payment_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_payment_with_ledger_and_triggers"("p_quote_id" "uuid", "p_amount" numeric, "p_currency" "text", "p_payment_method" "text", "p_transaction_reference" "text", "p_notes" "text", "p_recorded_by" "uuid", "p_payment_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_update_payment_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_update_payment_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_update_payment_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_country_payment_preferences_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_country_payment_preferences_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_country_payment_preferences_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_payment_links_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_payment_links_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_payment_links_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_payment_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_payment_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_payment_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."country_payment_preferences" TO "anon";
GRANT ALL ON TABLE "public"."country_payment_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."country_payment_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."country_settings" TO "anon";
GRANT ALL ON TABLE "public"."country_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."country_settings" TO "service_role";



GRANT ALL ON TABLE "public"."customs_categories" TO "anon";
GRANT ALL ON TABLE "public"."customs_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."customs_categories" TO "service_role";



GRANT ALL ON TABLE "public"."email_queue" TO "anon";
GRANT ALL ON TABLE "public"."email_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."email_queue" TO "service_role";



GRANT ALL ON TABLE "public"."email_settings" TO "anon";
GRANT ALL ON TABLE "public"."email_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."email_settings" TO "service_role";



GRANT ALL ON TABLE "public"."email_templates" TO "anon";
GRANT ALL ON TABLE "public"."email_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."email_templates" TO "service_role";



GRANT ALL ON TABLE "public"."footer_settings" TO "anon";
GRANT ALL ON TABLE "public"."footer_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."footer_settings" TO "service_role";



GRANT ALL ON TABLE "public"."manual_analysis_tasks" TO "anon";
GRANT ALL ON TABLE "public"."manual_analysis_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."manual_analysis_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."membership_tiers" TO "anon";
GRANT ALL ON TABLE "public"."membership_tiers" TO "authenticated";
GRANT ALL ON TABLE "public"."membership_tiers" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."notification_preferences" TO "anon";
GRANT ALL ON TABLE "public"."notification_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."order_tracking_events" TO "anon";
GRANT ALL ON TABLE "public"."order_tracking_events" TO "authenticated";
GRANT ALL ON TABLE "public"."order_tracking_events" TO "service_role";



GRANT ALL ON TABLE "public"."order_workflow_steps" TO "anon";
GRANT ALL ON TABLE "public"."order_workflow_steps" TO "authenticated";
GRANT ALL ON TABLE "public"."order_workflow_steps" TO "service_role";



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



GRANT ALL ON TABLE "public"."payment_records" TO "anon";
GRANT ALL ON TABLE "public"."payment_records" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_records" TO "service_role";



GRANT ALL ON TABLE "public"."payment_reminders" TO "anon";
GRANT ALL ON TABLE "public"."payment_reminders" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_reminders" TO "service_role";



GRANT ALL ON TABLE "public"."payment_transactions" TO "anon";
GRANT ALL ON TABLE "public"."payment_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."payment_verification_logs" TO "anon";
GRANT ALL ON TABLE "public"."payment_verification_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_verification_logs" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."quote_address_history" TO "anon";
GRANT ALL ON TABLE "public"."quote_address_history" TO "authenticated";
GRANT ALL ON TABLE "public"."quote_address_history" TO "service_role";



GRANT ALL ON SEQUENCE "public"."quote_address_history_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."quote_address_history_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."quote_address_history_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."quote_items" TO "anon";
GRANT ALL ON TABLE "public"."quote_items" TO "authenticated";
GRANT ALL ON TABLE "public"."quote_items" TO "service_role";



GRANT ALL ON TABLE "public"."quote_templates" TO "anon";
GRANT ALL ON TABLE "public"."quote_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."quote_templates" TO "service_role";



GRANT ALL ON TABLE "public"."referral_rewards" TO "anon";
GRANT ALL ON TABLE "public"."referral_rewards" TO "authenticated";
GRANT ALL ON TABLE "public"."referral_rewards" TO "service_role";



GRANT ALL ON TABLE "public"."referrals" TO "anon";
GRANT ALL ON TABLE "public"."referrals" TO "authenticated";
GRANT ALL ON TABLE "public"."referrals" TO "service_role";



GRANT ALL ON TABLE "public"."rejection_reasons" TO "anon";
GRANT ALL ON TABLE "public"."rejection_reasons" TO "authenticated";
GRANT ALL ON TABLE "public"."rejection_reasons" TO "service_role";



GRANT ALL ON TABLE "public"."status_transitions" TO "anon";
GRANT ALL ON TABLE "public"."status_transitions" TO "authenticated";
GRANT ALL ON TABLE "public"."status_transitions" TO "service_role";



GRANT ALL ON TABLE "public"."system_settings" TO "anon";
GRANT ALL ON TABLE "public"."system_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."system_settings" TO "service_role";



GRANT ALL ON TABLE "public"."tracking_templates" TO "anon";
GRANT ALL ON TABLE "public"."tracking_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."tracking_templates" TO "service_role";



GRANT ALL ON TABLE "public"."user_addresses" TO "anon";
GRANT ALL ON TABLE "public"."user_addresses" TO "authenticated";
GRANT ALL ON TABLE "public"."user_addresses" TO "service_role";



GRANT ALL ON TABLE "public"."user_memberships" TO "anon";
GRANT ALL ON TABLE "public"."user_memberships" TO "authenticated";
GRANT ALL ON TABLE "public"."user_memberships" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."user_wishlist_items" TO "anon";
GRANT ALL ON TABLE "public"."user_wishlist_items" TO "authenticated";
GRANT ALL ON TABLE "public"."user_wishlist_items" TO "service_role";



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
