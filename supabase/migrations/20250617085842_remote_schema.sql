-- NOTE: The 'public.profiles' table is required for Supabase Auth and referenced by later migrations.
-- This table definition is included here to ensure migrations work on any fresh Postgres DB, not just Supabase-managed ones.
-- If Supabase Auth is enabled, this table may already exist, but this statement is safe and idempotent.

CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" uuid PRIMARY KEY,
    "updated_at" timestamp with time zone,
    "username" text,
    "full_name" text,
    "avatar_url" text,
    "website" text,
    "email" text,
    "preferred_display_currency" text DEFAULT 'USD',
    "referral_code" text,
    "total_orders" integer DEFAULT 0,
    "total_spent" numeric DEFAULT 0,
    "cod_enabled" boolean NOT NULL DEFAULT true,
    "created_at" timestamp with time zone DEFAULT now()
);

-- Create app_role type if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE "public"."app_role" AS ENUM ('admin', 'user');
    END IF;
END $$;

-- Create quote_priority type if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_type WHERE typname = 'quote_priority') THEN
        CREATE TYPE "public"."quote_priority" AS ENUM ('low', 'medium', 'high', 'urgent');
    END IF;
END $$;

-- Create order_id_seq sequence if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'order_id_seq') THEN
        CREATE SEQUENCE "public"."order_id_seq";
    END IF;
END $$;

-- Create quote_id_seq sequence if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'quote_id_seq') THEN
        CREATE SEQUENCE "public"."quote_id_seq";
    END IF;
END $$;

-- Check if profiles table exists before dropping trigger, policies, and constraints
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        drop trigger if exists "update_profiles_updated_at" on "public"."profiles";
        drop policy if exists "Admins can update any profile" on "public"."profiles";
        drop policy if exists "Admins can view all profiles" on "public"."profiles";
        drop policy if exists "Users can update their own profile" on "public"."profiles";
        alter table "public"."profiles" drop constraint if exists "profiles_email_key";
    END IF;
END $$;

-- Check if user_roles table exists before dropping policies and constraints
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles') THEN
        drop policy if exists "Admins can manage all roles" on "public"."user_roles";
        drop policy if exists "Admins can view all roles" on "public"."user_roles";
        alter table "public"."user_roles" drop constraint if exists "user_roles_role_check";
    END IF;
END $$;

-- Check if user_addresses table exists before dropping constraints
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_addresses') THEN
        alter table "public"."user_addresses" drop constraint if exists "user_addresses_user_id_fkey";
    END IF;
END $$;

drop function if exists "public"."update_updated_at_column"();

drop index if exists "public"."profiles_email_key";

CREATE TABLE IF NOT EXISTS "public"."admin_role_backup" (
    "user_id" uuid,
    "role" app_role,
    "full_name" text,
    "email" character varying(255),
    "backup_created_at" timestamp with time zone
);


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" uuid not null default gen_random_uuid(),
    "table_name" text not null,
    "record_id" uuid not null,
    "action" text not null,
    "old_values" jsonb,
    "new_values" jsonb,
    "changed_by" uuid,
    "changed_at" timestamp with time zone not null default now()
);


alter table "public"."audit_logs" enable row level security;

CREATE TABLE IF NOT EXISTS "public"."bank_account_details" (
    "id" uuid not null default gen_random_uuid(),
    "account_name" text not null,
    "account_number" text not null,
    "bank_name" text not null,
    "branch_name" text,
    "swift_code" text,
    "iban" text,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."bank_account_details" enable row level security;

CREATE TABLE IF NOT EXISTS "public"."country_settings" (
    "code" text not null,
    "name" text not null,
    "currency" text not null,
    "rate_from_usd" numeric not null,
    "sales_tax" numeric not null default 0,
    "vat" numeric not null default 0,
    "min_shipping" numeric not null,
    "additional_shipping" numeric not null default 0,
    "additional_weight" numeric not null,
    "weight_unit" text not null,
    "volumetric_divisor" numeric not null,
    "payment_gateway_fixed_fee" numeric not null default 0,
    "payment_gateway_percent_fee" numeric not null default 0,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "purchase_allowed" boolean not null default true,
    "shipping_allowed" boolean not null default true,
    "payment_gateway" text not null default 'stripe'::text
);


alter table "public"."country_settings" enable row level security;

CREATE TABLE IF NOT EXISTS "public"."customs_categories" (
    "name" text not null,
    "duty_percent" numeric not null default 0,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."customs_categories" enable row level security;

CREATE TABLE IF NOT EXISTS "public"."email_templates" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "subject" text not null,
    "template_type" text not null,
    "html_content" text not null,
    "variables" jsonb,
    "is_active" boolean default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."email_templates" enable row level security;

CREATE TABLE IF NOT EXISTS "public"."footer_settings" (
    "id" uuid not null default gen_random_uuid(),
    "company_name" text,
    "company_description" text,
    "primary_phone" text,
    "secondary_phone" text,
    "primary_email" text,
    "support_email" text,
    "primary_address" text,
    "secondary_address" text,
    "business_hours" text,
    "social_twitter" text,
    "social_facebook" text,
    "social_instagram" text,
    "social_linkedin" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "website_logo_url" text
);


CREATE TABLE IF NOT EXISTS "public"."membership_tiers" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "monthly_price" numeric not null default 0,
    "annual_price" numeric not null default 0,
    "benefits" jsonb,
    "service_fee_discount" numeric default 0,
    "priority_processing" boolean default false,
    "free_shipping_threshold" numeric,
    "is_active" boolean default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."membership_tiers" enable row level security;

CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" uuid not null default gen_random_uuid(),
    "sender_id" uuid not null,
    "recipient_id" uuid,
    "subject" text not null,
    "content" text not null,
    "is_read" boolean not null default false,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "quote_id" uuid,
    "sender_name" text,
    "sender_email" text,
    "message_type" text default 'general'::text,
    "reply_to_message_id" uuid,
    "attachment_url" text,
    "attachment_file_name" text
);


alter table "public"."messages" enable row level security;

CREATE TABLE IF NOT EXISTS "public"."notification_preferences" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "email_quote_updates" boolean default true,
    "email_order_updates" boolean default true,
    "email_promotions" boolean default true,
    "sms_order_updates" boolean default false,
    "in_app_notifications" boolean default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."notification_preferences" enable row level security;

CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "title" text not null,
    "message" text not null,
    "type" text not null default 'info'::text,
    "is_read" boolean not null default false,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."notifications" enable row level security;

CREATE TABLE IF NOT EXISTS "public"."order_tracking_events" (
    "id" uuid not null default gen_random_uuid(),
    "quote_id" uuid,
    "event_type" text not null,
    "location" text,
    "description" text,
    "carrier" text,
    "tracking_number" text,
    "estimated_delivery" date,
    "actual_timestamp" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."order_tracking_events" enable row level security;

CREATE TABLE IF NOT EXISTS "public"."order_workflow_steps" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "order_position" integer not null,
    "is_customer_visible" boolean default true,
    "estimated_duration_hours" integer,
    "requires_admin_action" boolean default false,
    "country_specific" text[],
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."order_workflow_steps" enable row level security;

CREATE TABLE IF NOT EXISTS "public"."quote_items" (
    "id" uuid not null default gen_random_uuid(),
    "quote_id" uuid not null,
    "product_url" text,
    "product_name" text,
    "quantity" integer not null default 1,
    "options" text,
    "image_url" text,
    "item_price" numeric,
    "item_weight" numeric,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "item_currency" text not null default 'USD'::text
);


alter table "public"."quote_items" enable row level security;

CREATE TABLE IF NOT EXISTS "public"."quote_templates" (
    "id" uuid not null default gen_random_uuid(),
    "template_name" text not null,
    "product_name" text,
    "product_url" text,
    "image_url" text,
    "item_price" numeric,
    "item_weight" numeric,
    "quantity" integer not null default 1,
    "options" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."quote_templates" enable row level security;

CREATE TABLE IF NOT EXISTS "public"."quotes" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "email" text not null,
    "product_url" text,
    "product_name" text,
    "quantity" integer,
    "options" text,
    "status" text not null default 'pending'::text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "item_price" numeric,
    "item_weight" numeric,
    "sales_tax_price" numeric,
    "merchant_shipping_price" numeric,
    "domestic_shipping" numeric,
    "handling_charge" numeric,
    "discount" numeric,
    "insurance_amount" numeric,
    "final_total" numeric,
    "sub_total" numeric,
    "vat" numeric,
    "international_shipping" numeric,
    "customs_and_ecs" numeric,
    "payment_gateway_fee" numeric,
    "country_code" text,
    "customs_category_name" text,
    "image_url" text,
    "approval_status" text default 'pending'::text,
    "approved_at" timestamp with time zone,
    "rejected_at" timestamp with time zone,
    "final_currency" text,
    "final_total_local" numeric,
    "internal_notes" text,
    "priority" quote_priority,
    "display_id" text,
    "rejection_reason_id" uuid,
    "rejection_details" text,
    "payment_method" text,
    "order_display_id" text,
    "shipping_carrier" text,
    "tracking_number" text,
    "shipped_at" timestamp with time zone,
    "paid_at" timestamp with time zone,
    "in_cart" boolean not null default true,
    "items_currency" text default 'USD'::text,
    "estimated_delivery_date" date,
    "current_location" text,
    "last_tracking_update" timestamp with time zone
);


alter table "public"."quotes" enable row level security;

CREATE TABLE IF NOT EXISTS "public"."referral_rewards" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "reward_type" text not null,
    "reward_value" numeric not null,
    "currency" text default 'USD'::text,
    "min_order_value" numeric default 0,
    "max_uses" integer,
    "is_active" boolean default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."referral_rewards" enable row level security;

CREATE TABLE IF NOT EXISTS "public"."referrals" (
    "id" uuid not null default gen_random_uuid(),
    "referrer_id" uuid,
    "referee_id" uuid,
    "referral_code" text not null,
    "status" text default 'pending'::text,
    "referred_at" timestamp with time zone not null default now(),
    "completed_at" timestamp with time zone,
    "reward_amount" numeric default 0,
    "reward_currency" text default 'USD'::text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."referrals" enable row level security;

CREATE TABLE IF NOT EXISTS "public"."rejection_reasons" (
    "id" uuid not null default gen_random_uuid(),
    "category" text not null,
    "reason" text not null,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."rejection_reasons" enable row level security;

CREATE TABLE IF NOT EXISTS "public"."system_settings" (
    "id" uuid not null default gen_random_uuid(),
    "setting_key" text not null,
    "setting_value" text not null default 'false'::text,
    "description" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."system_settings" enable row level security;

CREATE TABLE IF NOT EXISTS "public"."tracking_templates" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "country_from" text not null,
    "country_to" text not null,
    "carrier" text,
    "template_steps" jsonb not null,
    "estimated_days" integer,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


CREATE TABLE IF NOT EXISTS "public"."user_memberships" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "tier_id" uuid,
    "stripe_subscription_id" text,
    "status" text default 'active'::text,
    "current_period_start" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."user_memberships" enable row level security;

CREATE TABLE IF NOT EXISTS "public"."user_wishlist_items" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "product_url" text not null,
    "product_name" text,
    "estimated_price" numeric,
    "currency" text default 'USD'::text,
    "image_url" text,
    "notes" text,
    "category" text,
    "is_favorite" boolean default false,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."user_wishlist_items" enable row level security;

-- Check if profiles table exists before dropping column
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        ALTER TABLE "public"."profiles" DROP COLUMN IF EXISTS "email";
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "avatar_url" text;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "preferred_display_currency" text default 'USD'::text;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "referral_code" text;
        ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "total_orders" integer default 0;
        ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "total_spent" numeric default 0;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "cod_enabled" boolean not null default true;
        ALTER TABLE "public"."profiles" ALTER COLUMN "cod_enabled" SET DEFAULT true;
        ALTER TABLE "public"."profiles" ALTER COLUMN "cod_enabled" SET NOT NULL;
        ALTER TABLE "public"."profiles" ALTER COLUMN "created_at" SET DEFAULT now();
        ALTER TABLE "public"."profiles" ALTER COLUMN "updated_at" SET DEFAULT now();
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_addresses') THEN
        ALTER TABLE "public"."user_addresses" ADD COLUMN IF NOT EXISTS "country_code" text;
        ALTER TABLE "public"."user_addresses" ADD COLUMN IF NOT EXISTS "state_province_region" text not null;
        ALTER TABLE "public"."user_addresses" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone not null default now();
        ALTER TABLE "public"."user_addresses" ALTER COLUMN "created_at" SET DEFAULT now();
        ALTER TABLE "public"."user_addresses" ALTER COLUMN "is_default" SET NOT NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles') THEN
        ALTER TABLE "public"."user_roles" DROP COLUMN IF EXISTS "created_at";
        ALTER TABLE "public"."user_roles" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
        ALTER TABLE "public"."user_roles" ALTER COLUMN "role" SET DATA TYPE app_role USING "role"::app_role;
        ALTER TABLE "public"."user_roles" ALTER COLUMN "user_id" SET NOT NULL;
    END IF;
END $$;

-- Create indexes with existence checks
DO $$
BEGIN
    -- Create primary key indexes
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'audit_logs' AND indexname = 'audit_logs_pkey') THEN
        CREATE UNIQUE INDEX audit_logs_pkey ON public.audit_logs USING btree (id);
    END IF;

    IF NOT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'bank_account_details' AND indexname = 'bank_account_details_pkey') THEN
        CREATE UNIQUE INDEX bank_account_details_pkey ON public.bank_account_details USING btree (id);
    END IF;

    IF NOT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'country_settings' AND indexname = 'country_settings_pkey') THEN
        CREATE UNIQUE INDEX country_settings_pkey ON public.country_settings USING btree (code);
    END IF;

    IF NOT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'customs_categories' AND indexname = 'customs_categories_pkey') THEN
        CREATE UNIQUE INDEX customs_categories_pkey ON public.customs_categories USING btree (name);
    END IF;

    IF NOT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'email_templates' AND indexname = 'email_templates_pkey') THEN
        CREATE UNIQUE INDEX email_templates_pkey ON public.email_templates USING btree (id);
    END IF;

    IF NOT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'footer_settings' AND indexname = 'footer_settings_pkey') THEN
        CREATE UNIQUE INDEX footer_settings_pkey ON public.footer_settings USING btree (id);
    END IF;

    -- Create other indexes
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'audit_logs' AND indexname = 'idx_audit_logs_table_record') THEN
        CREATE INDEX idx_audit_logs_table_record ON public.audit_logs USING btree (table_name, record_id);
    END IF;

    IF NOT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'order_tracking_events' AND indexname = 'idx_order_tracking_events_created_at') THEN
        CREATE INDEX idx_order_tracking_events_created_at ON public.order_tracking_events USING btree (created_at);
    END IF;

    IF NOT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'order_tracking_events' AND indexname = 'idx_order_tracking_events_quote_id') THEN
        CREATE INDEX idx_order_tracking_events_quote_id ON public.order_tracking_events USING btree (quote_id);
    END IF;

    IF NOT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'quotes' AND indexname = 'idx_quotes_approval_status') THEN
        CREATE INDEX idx_quotes_approval_status ON public.quotes USING btree (approval_status);
    END IF;

    IF NOT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'referrals' AND indexname = 'idx_referrals_referee_id') THEN
        CREATE INDEX idx_referrals_referee_id ON public.referrals USING btree (referee_id);
    END IF;

    IF NOT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'referrals' AND indexname = 'idx_referrals_referrer_id') THEN
        CREATE INDEX idx_referrals_referrer_id ON public.referrals USING btree (referrer_id);
    END IF;

    IF NOT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'user_memberships' AND indexname = 'idx_user_memberships_user_id') THEN
        CREATE INDEX idx_user_memberships_user_id ON public.user_memberships USING btree (user_id);
    END IF;

    IF NOT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'user_wishlist_items' AND indexname = 'idx_user_wishlist_items_user_id') THEN
        CREATE INDEX idx_user_wishlist_items_user_id ON public.user_wishlist_items USING btree (user_id);
    END IF;

    -- Create remaining primary key indexes
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'membership_tiers' AND indexname = 'membership_tiers_pkey') THEN
        CREATE UNIQUE INDEX membership_tiers_pkey ON public.membership_tiers USING btree (id);
    END IF;

    IF NOT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'messages' AND indexname = 'messages_pkey') THEN
        CREATE UNIQUE INDEX messages_pkey ON public.messages USING btree (id);
    END IF;

    IF NOT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'notification_preferences' AND indexname = 'notification_preferences_pkey') THEN
        CREATE UNIQUE INDEX notification_preferences_pkey ON public.notification_preferences USING btree (id);
    END IF;

    IF NOT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'notifications' AND indexname = 'notifications_pkey') THEN
        CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id);
    END IF;

    IF NOT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'order_tracking_events' AND indexname = 'order_tracking_events_pkey') THEN
        CREATE UNIQUE INDEX order_tracking_events_pkey ON public.order_tracking_events USING btree (id);
    END IF;

    IF NOT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'order_workflow_steps' AND indexname = 'order_workflow_steps_pkey') THEN
        CREATE UNIQUE INDEX order_workflow_steps_pkey ON public.order_workflow_steps USING btree (id);
    END IF;

    IF NOT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'profiles' AND indexname = 'profiles_referral_code_key') THEN
        CREATE UNIQUE INDEX profiles_referral_code_key ON public.profiles USING btree (referral_code);
    END IF;

    IF NOT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'quote_items' AND indexname = 'quote_items_pkey') THEN
        CREATE UNIQUE INDEX quote_items_pkey ON public.quote_items USING btree (id);
    END IF;

    IF NOT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'quote_templates' AND indexname = 'quote_templates_pkey') THEN
        CREATE UNIQUE INDEX quote_templates_pkey ON public.quote_templates USING btree (id);
    END IF;

    IF NOT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'quotes' AND indexname = 'quotes_display_id_key') THEN
        CREATE UNIQUE INDEX quotes_display_id_key ON public.quotes USING btree (display_id);
    END IF;

    IF NOT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'quotes' AND indexname = 'quotes_order_display_id_key') THEN
        CREATE UNIQUE INDEX quotes_order_display_id_key ON public.quotes USING btree (order_display_id);
    END IF;

    IF NOT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'quotes' AND indexname = 'quotes_pkey') THEN
        CREATE UNIQUE INDEX quotes_pkey ON public.quotes USING btree (id);
    END IF;

    IF NOT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'referral_rewards' AND indexname = 'referral_rewards_pkey') THEN
        CREATE UNIQUE INDEX referral_rewards_pkey ON public.referral_rewards USING btree (id);
    END IF;

    IF NOT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'referrals' AND indexname = 'referrals_pkey') THEN
        CREATE UNIQUE INDEX referrals_pkey ON public.referrals USING btree (id);
    END IF;

    IF NOT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'referrals' AND indexname = 'referrals_referral_code_key') THEN
        CREATE UNIQUE INDEX referrals_referral_code_key ON public.referrals USING btree (referral_code);
    END IF;

    IF NOT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'rejection_reasons' AND indexname = 'rejection_reasons_pkey') THEN
        CREATE UNIQUE INDEX rejection_reasons_pkey ON public.rejection_reasons USING btree (id);
    END IF;

    IF NOT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'system_settings' AND indexname = 'system_settings_pkey') THEN
        CREATE UNIQUE INDEX system_settings_pkey ON public.system_settings USING btree (id);
    END IF;

    IF NOT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'system_settings' AND indexname = 'system_settings_setting_key_key') THEN
        CREATE UNIQUE INDEX system_settings_setting_key_key ON public.system_settings USING btree (setting_key);
    END IF;

    IF NOT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'tracking_templates' AND indexname = 'tracking_templates_pkey') THEN
        CREATE UNIQUE INDEX tracking_templates_pkey ON public.tracking_templates USING btree (id);
    END IF;

    IF NOT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'user_memberships' AND indexname = 'user_memberships_pkey') THEN
        CREATE UNIQUE INDEX user_memberships_pkey ON public.user_memberships USING btree (id);
    END IF;

    IF NOT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'user_wishlist_items' AND indexname = 'user_wishlist_items_pkey') THEN
        CREATE UNIQUE INDEX user_wishlist_items_pkey ON public.user_wishlist_items USING btree (id);
    END IF;
END $$;

grant delete on table "public"."admin_role_backup" to "anon";
