-- ============================================================================
-- ALL MISSING TABLES MIGRATION - COMPLETE JOB
-- Adding the remaining 65 tables to cloud database
-- ============================================================================

-- Extensions (if not already present)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "ltree";

CREATE TABLE IF NOT EXISTS public.abuse_responses (
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

CREATE TABLE IF NOT EXISTS public.active_blocks (
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

CREATE TABLE IF NOT EXISTS public.blog_post_tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_id uuid NOT NULL,
    tag_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.blog_posts (
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

CREATE TABLE IF NOT EXISTS public.blog_tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cart_recovery_analytics (
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

CREATE TABLE IF NOT EXISTS public.cart_recovery_attempts (
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

CREATE TABLE IF NOT EXISTS public.checkout_sessions (
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

CREATE TABLE IF NOT EXISTS public.continental_pricing (
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

CREATE TABLE IF NOT EXISTS public.country_configs (
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

CREATE TABLE IF NOT EXISTS public.country_discount_rules (
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

CREATE TABLE IF NOT EXISTS public.country_payment_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    country_code text NOT NULL,
    gateway_code text NOT NULL,
    priority integer NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.country_pricing_overrides (
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

CREATE TABLE IF NOT EXISTS public.customer_delivery_preferences (
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

CREATE TABLE IF NOT EXISTS public.customer_discount_usage (
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

CREATE TABLE IF NOT EXISTS public.customer_preferences (
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

CREATE TABLE IF NOT EXISTS public.customer_satisfaction_surveys (
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

CREATE TABLE IF NOT EXISTS public.customs_valuation_overrides (
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

CREATE TABLE IF NOT EXISTS public.delivery_orders (
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

CREATE TABLE IF NOT EXISTS public.delivery_provider_configs (
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

CREATE TABLE IF NOT EXISTS public.delivery_webhooks (
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

CREATE TABLE IF NOT EXISTS public.discount_application_log (
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

CREATE TABLE IF NOT EXISTS public.discount_settings (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    setting_key text NOT NULL,
    setting_value jsonb NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.discount_stacking_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    is_active boolean DEFAULT true,
    priority integer DEFAULT 0,
    max_discounts integer DEFAULT 1,
    allowed_combinations jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.discount_tiers (
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

CREATE TABLE IF NOT EXISTS public.discount_types (
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

CREATE TABLE IF NOT EXISTS public.email_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    setting_key text NOT NULL,
    setting_value text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.error_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    error_message text NOT NULL,
    error_details text,
    context jsonb,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gateway_refunds (
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

CREATE TABLE IF NOT EXISTS public.item_revisions (
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

CREATE TABLE IF NOT EXISTS public.manual_analysis_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_id uuid,
    assigned_to uuid,
    status text DEFAULT 'pending'::text,
    priority text DEFAULT 'medium'::text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.market_countries (
    market_id uuid NOT NULL,
    country_code text NOT NULL,
    is_primary_in_market boolean DEFAULT false,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.membership_plans (
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

CREATE TABLE IF NOT EXISTS public.order_exceptions (
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

CREATE TABLE IF NOT EXISTS public.order_shipments (
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

CREATE TABLE IF NOT EXISTS public.order_status_history (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    order_id uuid,
    previous_status text,
    new_status text NOT NULL,
    changed_by uuid,
    change_reason text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payment_adjustments (
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

CREATE TABLE IF NOT EXISTS public.payment_health_logs (
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

CREATE TABLE IF NOT EXISTS public.payment_method_discounts (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    payment_method text NOT NULL,
    discount_percentage numeric(5,2) NOT NULL,
    is_stackable boolean DEFAULT true,
    conditions jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.payment_reminders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_id uuid,
    reminder_type text NOT NULL,
    sent_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT payment_reminders_reminder_type_check CHECK ((reminder_type = ANY (ARRAY['bank_transfer_pending'::text, 'cod_confirmation'::text])))
);

CREATE TABLE IF NOT EXISTS public.payment_verification_logs (
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

CREATE TABLE IF NOT EXISTS public.paypal_refund_reasons (
    code text NOT NULL,
    description text NOT NULL,
    customer_friendly_description text,
    is_active boolean DEFAULT true,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.paypal_webhook_events (
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

CREATE TABLE IF NOT EXISTS public.pickup_time_slots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slot_name character varying(100) NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pricing_change_approvals (
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

CREATE TABLE IF NOT EXISTS public.pricing_change_log (
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

CREATE TABLE IF NOT EXISTS public.product_classifications (
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

CREATE TABLE IF NOT EXISTS public.quote_address_history (
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

CREATE TABLE IF NOT EXISTS public.quote_documents (
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

CREATE TABLE IF NOT EXISTS public.quote_items (
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
CREATE TABLE IF NOT EXISTS public.quote_items_v2 (
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

CREATE TABLE IF NOT EXISTS public.quote_statuses (
    id integer NOT NULL,
    value text NOT NULL,
    label text NOT NULL,
    color text,
    icon text,
    is_active boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.quote_templates (
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

CREATE TABLE IF NOT EXISTS public.reconciliation_items (
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

CREATE TABLE IF NOT EXISTS public.reconciliation_rules (
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

CREATE TABLE IF NOT EXISTS public.refund_items (
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

CREATE TABLE IF NOT EXISTS public.regional_pricing (
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

CREATE TABLE IF NOT EXISTS public.rejection_reasons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reason text NOT NULL,
    category text DEFAULT 'general'::text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.route_customs_tiers (
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

CREATE TABLE IF NOT EXISTS public.share_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_id uuid,
    user_id uuid,
    action character varying(50) NOT NULL,
    ip_address inet,
    user_agent text,
    details jsonb,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shipment_items (
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

CREATE TABLE IF NOT EXISTS public.sla_configurations (
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

CREATE TABLE IF NOT EXISTS public.sla_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    priority text NOT NULL,
    response_time_hours integer DEFAULT 24 NOT NULL,
    resolution_time_hours integer DEFAULT 72 NOT NULL,
    business_hours_only boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT sla_policies_priority_check CHECK ((priority = ANY (ARRAY['urgent'::text, 'high'::text, 'medium'::text, 'low'::text])))
);

CREATE TABLE IF NOT EXISTS public.status_transitions (
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

CREATE TABLE IF NOT EXISTS public.support_assignment_rules (
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

CREATE TABLE IF NOT EXISTS public.support_interactions (
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

