create type "public"."app_role" as enum ('admin', 'user');

create type "public"."quote_priority" as enum ('low', 'medium', 'high', 'urgent');

create sequence "public"."order_id_seq";

create sequence "public"."quote_id_seq";

drop trigger if exists "update_profiles_updated_at" on "public"."profiles";

drop policy "Admins can insert profiles" on "public"."profiles";

drop policy "Admins can update any profile" on "public"."profiles";

drop policy "Admins can manage all roles" on "public"."user_roles";

drop policy "Admins can view all roles" on "public"."user_roles";

drop policy "Admins can delete profiles" on "public"."profiles";

drop policy "Admins can view all profiles" on "public"."profiles";

drop policy "Users can update their own profile" on "public"."profiles";

drop policy "Users can update their own addresses" on "public"."user_addresses";

alter table "public"."profiles" drop constraint "profiles_email_key";

alter table "public"."user_roles" drop constraint "user_roles_role_check";

alter table "public"."user_addresses" drop constraint "user_addresses_user_id_fkey";

drop function if exists "public"."update_updated_at_column"();

drop index if exists "public"."profiles_email_key";

create table "public"."admin_role_backup" (
    "user_id" uuid,
    "role" app_role,
    "full_name" text,
    "email" character varying(255),
    "backup_created_at" timestamp with time zone
);


create table "public"."audit_logs" (
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

create table "public"."bank_account_details" (
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

create table "public"."country_settings" (
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

create table "public"."customs_categories" (
    "name" text not null,
    "duty_percent" numeric not null default 0,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."customs_categories" enable row level security;

create table "public"."email_templates" (
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

create table "public"."footer_settings" (
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


create table "public"."membership_tiers" (
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

create table "public"."messages" (
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

create table "public"."notification_preferences" (
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

create table "public"."notifications" (
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

create table "public"."order_tracking_events" (
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

create table "public"."order_workflow_steps" (
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

create table "public"."quote_items" (
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

create table "public"."quote_templates" (
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

create table "public"."quotes" (
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

create table "public"."referral_rewards" (
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

create table "public"."referrals" (
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

create table "public"."rejection_reasons" (
    "id" uuid not null default gen_random_uuid(),
    "category" text not null,
    "reason" text not null,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."rejection_reasons" enable row level security;

create table "public"."system_settings" (
    "id" uuid not null default gen_random_uuid(),
    "setting_key" text not null,
    "setting_value" text not null default 'false'::text,
    "description" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."system_settings" enable row level security;

create table "public"."tracking_templates" (
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


create table "public"."user_memberships" (
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

create table "public"."user_wishlist_items" (
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

alter table "public"."profiles" drop column "email";

alter table "public"."profiles" add column "avatar_url" text;

alter table "public"."profiles" add column "preferred_display_currency" text default 'USD'::text;

alter table "public"."profiles" add column "referral_code" text;

alter table "public"."profiles" add column "total_orders" integer default 0;

alter table "public"."profiles" add column "total_spent" numeric default 0;

alter table "public"."profiles" alter column "cod_enabled" set default true;

alter table "public"."profiles" alter column "cod_enabled" set not null;

alter table "public"."profiles" alter column "created_at" set default now();

alter table "public"."profiles" alter column "updated_at" set default now();

alter table "public"."user_addresses" add column "country_code" text;

alter table "public"."user_addresses" add column "state_province_region" text not null;

alter table "public"."user_addresses" add column "updated_at" timestamp with time zone not null default now();

alter table "public"."user_addresses" alter column "created_at" set default now();

alter table "public"."user_addresses" alter column "is_default" set not null;

alter table "public"."user_roles" drop column "created_at";

alter table "public"."user_roles" alter column "id" set default gen_random_uuid();

alter table "public"."user_roles" alter column "role" set data type app_role using "role"::app_role;

alter table "public"."user_roles" alter column "user_id" set not null;

CREATE UNIQUE INDEX audit_logs_pkey ON public.audit_logs USING btree (id);

CREATE UNIQUE INDEX bank_account_details_pkey ON public.bank_account_details USING btree (id);

CREATE UNIQUE INDEX country_settings_pkey ON public.country_settings USING btree (code);

CREATE UNIQUE INDEX customs_categories_pkey ON public.customs_categories USING btree (name);

CREATE UNIQUE INDEX email_templates_pkey ON public.email_templates USING btree (id);

CREATE UNIQUE INDEX footer_settings_pkey ON public.footer_settings USING btree (id);

CREATE INDEX idx_audit_logs_table_record ON public.audit_logs USING btree (table_name, record_id);

CREATE INDEX idx_order_tracking_events_created_at ON public.order_tracking_events USING btree (created_at);

CREATE INDEX idx_order_tracking_events_quote_id ON public.order_tracking_events USING btree (quote_id);

CREATE INDEX idx_quotes_approval_status ON public.quotes USING btree (approval_status);

CREATE INDEX idx_referrals_referee_id ON public.referrals USING btree (referee_id);

CREATE INDEX idx_referrals_referrer_id ON public.referrals USING btree (referrer_id);

CREATE INDEX idx_user_memberships_user_id ON public.user_memberships USING btree (user_id);

CREATE INDEX idx_user_wishlist_items_user_id ON public.user_wishlist_items USING btree (user_id);

CREATE UNIQUE INDEX membership_tiers_pkey ON public.membership_tiers USING btree (id);

CREATE UNIQUE INDEX messages_pkey ON public.messages USING btree (id);

CREATE UNIQUE INDEX notification_preferences_pkey ON public.notification_preferences USING btree (id);

CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id);

CREATE UNIQUE INDEX order_tracking_events_pkey ON public.order_tracking_events USING btree (id);

CREATE UNIQUE INDEX order_workflow_steps_pkey ON public.order_workflow_steps USING btree (id);

CREATE UNIQUE INDEX profiles_referral_code_key ON public.profiles USING btree (referral_code);

CREATE UNIQUE INDEX quote_items_pkey ON public.quote_items USING btree (id);

CREATE UNIQUE INDEX quote_templates_pkey ON public.quote_templates USING btree (id);

CREATE UNIQUE INDEX quotes_display_id_key ON public.quotes USING btree (display_id);

CREATE UNIQUE INDEX quotes_order_display_id_key ON public.quotes USING btree (order_display_id);

CREATE UNIQUE INDEX quotes_pkey ON public.quotes USING btree (id);

CREATE UNIQUE INDEX referral_rewards_pkey ON public.referral_rewards USING btree (id);

CREATE UNIQUE INDEX referrals_pkey ON public.referrals USING btree (id);

CREATE UNIQUE INDEX referrals_referral_code_key ON public.referrals USING btree (referral_code);

CREATE UNIQUE INDEX rejection_reasons_pkey ON public.rejection_reasons USING btree (id);

CREATE UNIQUE INDEX system_settings_pkey ON public.system_settings USING btree (id);

CREATE UNIQUE INDEX system_settings_setting_key_key ON public.system_settings USING btree (setting_key);

CREATE UNIQUE INDEX tracking_templates_pkey ON public.tracking_templates USING btree (id);

CREATE UNIQUE INDEX user_memberships_pkey ON public.user_memberships USING btree (id);

CREATE UNIQUE INDEX user_wishlist_items_pkey ON public.user_wishlist_items USING btree (id);

alter table "public"."audit_logs" add constraint "audit_logs_pkey" PRIMARY KEY using index "audit_logs_pkey";

alter table "public"."bank_account_details" add constraint "bank_account_details_pkey" PRIMARY KEY using index "bank_account_details_pkey";

alter table "public"."country_settings" add constraint "country_settings_pkey" PRIMARY KEY using index "country_settings_pkey";

alter table "public"."customs_categories" add constraint "customs_categories_pkey" PRIMARY KEY using index "customs_categories_pkey";

alter table "public"."email_templates" add constraint "email_templates_pkey" PRIMARY KEY using index "email_templates_pkey";

alter table "public"."footer_settings" add constraint "footer_settings_pkey" PRIMARY KEY using index "footer_settings_pkey";

alter table "public"."membership_tiers" add constraint "membership_tiers_pkey" PRIMARY KEY using index "membership_tiers_pkey";

alter table "public"."messages" add constraint "messages_pkey" PRIMARY KEY using index "messages_pkey";

alter table "public"."notification_preferences" add constraint "notification_preferences_pkey" PRIMARY KEY using index "notification_preferences_pkey";

alter table "public"."notifications" add constraint "notifications_pkey" PRIMARY KEY using index "notifications_pkey";

alter table "public"."order_tracking_events" add constraint "order_tracking_events_pkey" PRIMARY KEY using index "order_tracking_events_pkey";

alter table "public"."order_workflow_steps" add constraint "order_workflow_steps_pkey" PRIMARY KEY using index "order_workflow_steps_pkey";

alter table "public"."quote_items" add constraint "quote_items_pkey" PRIMARY KEY using index "quote_items_pkey";

alter table "public"."quote_templates" add constraint "quote_templates_pkey" PRIMARY KEY using index "quote_templates_pkey";

alter table "public"."quotes" add constraint "quotes_pkey" PRIMARY KEY using index "quotes_pkey";

alter table "public"."referral_rewards" add constraint "referral_rewards_pkey" PRIMARY KEY using index "referral_rewards_pkey";

alter table "public"."referrals" add constraint "referrals_pkey" PRIMARY KEY using index "referrals_pkey";

alter table "public"."rejection_reasons" add constraint "rejection_reasons_pkey" PRIMARY KEY using index "rejection_reasons_pkey";

alter table "public"."system_settings" add constraint "system_settings_pkey" PRIMARY KEY using index "system_settings_pkey";

alter table "public"."tracking_templates" add constraint "tracking_templates_pkey" PRIMARY KEY using index "tracking_templates_pkey";

alter table "public"."user_memberships" add constraint "user_memberships_pkey" PRIMARY KEY using index "user_memberships_pkey";

alter table "public"."user_wishlist_items" add constraint "user_wishlist_items_pkey" PRIMARY KEY using index "user_wishlist_items_pkey";

alter table "public"."audit_logs" add constraint "audit_logs_changed_by_fkey" FOREIGN KEY (changed_by) REFERENCES auth.users(id) not valid;

alter table "public"."audit_logs" validate constraint "audit_logs_changed_by_fkey";

alter table "public"."country_settings" add constraint "country_settings_weight_unit_check" CHECK ((weight_unit = ANY (ARRAY['lbs'::text, 'kg'::text]))) not valid;

alter table "public"."country_settings" validate constraint "country_settings_weight_unit_check";

alter table "public"."messages" add constraint "messages_quote_id_fkey" FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE not valid;

alter table "public"."messages" validate constraint "messages_quote_id_fkey";

alter table "public"."messages" add constraint "messages_recipient_id_fkey" FOREIGN KEY (recipient_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."messages" validate constraint "messages_recipient_id_fkey";

alter table "public"."messages" add constraint "messages_reply_to_message_id_fkey" FOREIGN KEY (reply_to_message_id) REFERENCES messages(id) ON DELETE SET NULL not valid;

alter table "public"."messages" validate constraint "messages_reply_to_message_id_fkey";

alter table "public"."messages" add constraint "messages_sender_id_fkey" FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."messages" validate constraint "messages_sender_id_fkey";

alter table "public"."notification_preferences" add constraint "notification_preferences_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."notification_preferences" validate constraint "notification_preferences_user_id_fkey";

alter table "public"."notifications" add constraint "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."notifications" validate constraint "notifications_user_id_fkey";

alter table "public"."order_tracking_events" add constraint "order_tracking_events_quote_id_fkey" FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE not valid;

alter table "public"."order_tracking_events" validate constraint "order_tracking_events_quote_id_fkey";

alter table "public"."profiles" add constraint "profiles_referral_code_key" UNIQUE using index "profiles_referral_code_key";

alter table "public"."quote_items" add constraint "quote_items_quote_id_fkey" FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE not valid;

alter table "public"."quote_items" validate constraint "quote_items_quote_id_fkey";

alter table "public"."quote_items" add constraint "url_or_image_required" CHECK (((COALESCE(product_url, ''::text) <> ''::text) OR (COALESCE(image_url, ''::text) <> ''::text))) not valid;

alter table "public"."quote_items" validate constraint "url_or_image_required";

alter table "public"."quotes" add constraint "quotes_approval_status_check" CHECK ((approval_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))) not valid;

alter table "public"."quotes" validate constraint "quotes_approval_status_check";

alter table "public"."quotes" add constraint "quotes_country_code_fkey" FOREIGN KEY (country_code) REFERENCES country_settings(code) ON DELETE SET NULL not valid;

alter table "public"."quotes" validate constraint "quotes_country_code_fkey";

alter table "public"."quotes" add constraint "quotes_customs_category_name_fkey" FOREIGN KEY (customs_category_name) REFERENCES customs_categories(name) ON DELETE SET NULL not valid;

alter table "public"."quotes" validate constraint "quotes_customs_category_name_fkey";

alter table "public"."quotes" add constraint "quotes_display_id_key" UNIQUE using index "quotes_display_id_key";

alter table "public"."quotes" add constraint "quotes_order_display_id_key" UNIQUE using index "quotes_order_display_id_key";

alter table "public"."quotes" add constraint "quotes_quantity_check" CHECK ((quantity > 0)) not valid;

alter table "public"."quotes" validate constraint "quotes_quantity_check";

alter table "public"."quotes" add constraint "quotes_rejection_reason_id_fkey" FOREIGN KEY (rejection_reason_id) REFERENCES rejection_reasons(id) ON DELETE SET NULL not valid;

alter table "public"."quotes" validate constraint "quotes_rejection_reason_id_fkey";

alter table "public"."quotes" add constraint "quotes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."quotes" validate constraint "quotes_user_id_fkey";

alter table "public"."referrals" add constraint "referrals_referee_id_fkey" FOREIGN KEY (referee_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."referrals" validate constraint "referrals_referee_id_fkey";

alter table "public"."referrals" add constraint "referrals_referral_code_key" UNIQUE using index "referrals_referral_code_key";

alter table "public"."referrals" add constraint "referrals_referrer_id_fkey" FOREIGN KEY (referrer_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."referrals" validate constraint "referrals_referrer_id_fkey";

alter table "public"."system_settings" add constraint "system_settings_setting_key_key" UNIQUE using index "system_settings_setting_key_key";

alter table "public"."user_memberships" add constraint "user_memberships_tier_id_fkey" FOREIGN KEY (tier_id) REFERENCES membership_tiers(id) not valid;

alter table "public"."user_memberships" validate constraint "user_memberships_tier_id_fkey";

alter table "public"."user_memberships" add constraint "user_memberships_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_memberships" validate constraint "user_memberships_user_id_fkey";

alter table "public"."user_wishlist_items" add constraint "user_wishlist_items_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_wishlist_items" validate constraint "user_wishlist_items_user_id_fkey";

alter table "public"."user_addresses" add constraint "user_addresses_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_addresses" validate constraint "user_addresses_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.generate_order_display_id()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Check if the status is being updated to 'paid' and there's no order_display_id yet
    IF NEW.status = 'paid' AND OLD.status != 'paid' AND NEW.order_display_id IS NULL THEN
        NEW.order_display_id := 'OD-' || LPAD(nextval('public.order_id_seq')::TEXT, 7, '0');
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_quote_display_id()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.display_id := 'QT-' || LPAD(nextval('public.quote_id_seq')::TEXT, 7, '0');
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT public.has_role(auth.uid(), 'admin');
$function$
;

CREATE OR REPLACE FUNCTION public.sync_approval_status()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NEW.status IN ('accepted', 'paid', 'ordered', 'shipped', 'completed') THEN
        NEW.approval_status := 'approved';
    ELSIF NEW.status IN ('cancelled', 'rejected') THEN
        NEW.approval_status := 'rejected';
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert into profiles table
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  
  -- Insert a default 'user' role for the new user
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user');
  
  RETURN new;
END;
$function$
;

grant delete on table "public"."admin_role_backup" to "anon";

grant insert on table "public"."admin_role_backup" to "anon";

grant references on table "public"."admin_role_backup" to "anon";

grant select on table "public"."admin_role_backup" to "anon";

grant trigger on table "public"."admin_role_backup" to "anon";

grant truncate on table "public"."admin_role_backup" to "anon";

grant update on table "public"."admin_role_backup" to "anon";

grant delete on table "public"."admin_role_backup" to "authenticated";

grant insert on table "public"."admin_role_backup" to "authenticated";

grant references on table "public"."admin_role_backup" to "authenticated";

grant select on table "public"."admin_role_backup" to "authenticated";

grant trigger on table "public"."admin_role_backup" to "authenticated";

grant truncate on table "public"."admin_role_backup" to "authenticated";

grant update on table "public"."admin_role_backup" to "authenticated";

grant delete on table "public"."admin_role_backup" to "service_role";

grant insert on table "public"."admin_role_backup" to "service_role";

grant references on table "public"."admin_role_backup" to "service_role";

grant select on table "public"."admin_role_backup" to "service_role";

grant trigger on table "public"."admin_role_backup" to "service_role";

grant truncate on table "public"."admin_role_backup" to "service_role";

grant update on table "public"."admin_role_backup" to "service_role";

grant delete on table "public"."audit_logs" to "anon";

grant insert on table "public"."audit_logs" to "anon";

grant references on table "public"."audit_logs" to "anon";

grant select on table "public"."audit_logs" to "anon";

grant trigger on table "public"."audit_logs" to "anon";

grant truncate on table "public"."audit_logs" to "anon";

grant update on table "public"."audit_logs" to "anon";

grant delete on table "public"."audit_logs" to "authenticated";

grant insert on table "public"."audit_logs" to "authenticated";

grant references on table "public"."audit_logs" to "authenticated";

grant select on table "public"."audit_logs" to "authenticated";

grant trigger on table "public"."audit_logs" to "authenticated";

grant truncate on table "public"."audit_logs" to "authenticated";

grant update on table "public"."audit_logs" to "authenticated";

grant delete on table "public"."audit_logs" to "service_role";

grant insert on table "public"."audit_logs" to "service_role";

grant references on table "public"."audit_logs" to "service_role";

grant select on table "public"."audit_logs" to "service_role";

grant trigger on table "public"."audit_logs" to "service_role";

grant truncate on table "public"."audit_logs" to "service_role";

grant update on table "public"."audit_logs" to "service_role";

grant delete on table "public"."bank_account_details" to "anon";

grant insert on table "public"."bank_account_details" to "anon";

grant references on table "public"."bank_account_details" to "anon";

grant select on table "public"."bank_account_details" to "anon";

grant trigger on table "public"."bank_account_details" to "anon";

grant truncate on table "public"."bank_account_details" to "anon";

grant update on table "public"."bank_account_details" to "anon";

grant delete on table "public"."bank_account_details" to "authenticated";

grant insert on table "public"."bank_account_details" to "authenticated";

grant references on table "public"."bank_account_details" to "authenticated";

grant select on table "public"."bank_account_details" to "authenticated";

grant trigger on table "public"."bank_account_details" to "authenticated";

grant truncate on table "public"."bank_account_details" to "authenticated";

grant update on table "public"."bank_account_details" to "authenticated";

grant delete on table "public"."bank_account_details" to "service_role";

grant insert on table "public"."bank_account_details" to "service_role";

grant references on table "public"."bank_account_details" to "service_role";

grant select on table "public"."bank_account_details" to "service_role";

grant trigger on table "public"."bank_account_details" to "service_role";

grant truncate on table "public"."bank_account_details" to "service_role";

grant update on table "public"."bank_account_details" to "service_role";

grant delete on table "public"."country_settings" to "anon";

grant insert on table "public"."country_settings" to "anon";

grant references on table "public"."country_settings" to "anon";

grant select on table "public"."country_settings" to "anon";

grant trigger on table "public"."country_settings" to "anon";

grant truncate on table "public"."country_settings" to "anon";

grant update on table "public"."country_settings" to "anon";

grant delete on table "public"."country_settings" to "authenticated";

grant insert on table "public"."country_settings" to "authenticated";

grant references on table "public"."country_settings" to "authenticated";

grant select on table "public"."country_settings" to "authenticated";

grant trigger on table "public"."country_settings" to "authenticated";

grant truncate on table "public"."country_settings" to "authenticated";

grant update on table "public"."country_settings" to "authenticated";

grant delete on table "public"."country_settings" to "service_role";

grant insert on table "public"."country_settings" to "service_role";

grant references on table "public"."country_settings" to "service_role";

grant select on table "public"."country_settings" to "service_role";

grant trigger on table "public"."country_settings" to "service_role";

grant truncate on table "public"."country_settings" to "service_role";

grant update on table "public"."country_settings" to "service_role";

grant delete on table "public"."customs_categories" to "anon";

grant insert on table "public"."customs_categories" to "anon";

grant references on table "public"."customs_categories" to "anon";

grant select on table "public"."customs_categories" to "anon";

grant trigger on table "public"."customs_categories" to "anon";

grant truncate on table "public"."customs_categories" to "anon";

grant update on table "public"."customs_categories" to "anon";

grant delete on table "public"."customs_categories" to "authenticated";

grant insert on table "public"."customs_categories" to "authenticated";

grant references on table "public"."customs_categories" to "authenticated";

grant select on table "public"."customs_categories" to "authenticated";

grant trigger on table "public"."customs_categories" to "authenticated";

grant truncate on table "public"."customs_categories" to "authenticated";

grant update on table "public"."customs_categories" to "authenticated";

grant delete on table "public"."customs_categories" to "service_role";

grant insert on table "public"."customs_categories" to "service_role";

grant references on table "public"."customs_categories" to "service_role";

grant select on table "public"."customs_categories" to "service_role";

grant trigger on table "public"."customs_categories" to "service_role";

grant truncate on table "public"."customs_categories" to "service_role";

grant update on table "public"."customs_categories" to "service_role";

grant delete on table "public"."email_templates" to "anon";

grant insert on table "public"."email_templates" to "anon";

grant references on table "public"."email_templates" to "anon";

grant select on table "public"."email_templates" to "anon";

grant trigger on table "public"."email_templates" to "anon";

grant truncate on table "public"."email_templates" to "anon";

grant update on table "public"."email_templates" to "anon";

grant delete on table "public"."email_templates" to "authenticated";

grant insert on table "public"."email_templates" to "authenticated";

grant references on table "public"."email_templates" to "authenticated";

grant select on table "public"."email_templates" to "authenticated";

grant trigger on table "public"."email_templates" to "authenticated";

grant truncate on table "public"."email_templates" to "authenticated";

grant update on table "public"."email_templates" to "authenticated";

grant delete on table "public"."email_templates" to "service_role";

grant insert on table "public"."email_templates" to "service_role";

grant references on table "public"."email_templates" to "service_role";

grant select on table "public"."email_templates" to "service_role";

grant trigger on table "public"."email_templates" to "service_role";

grant truncate on table "public"."email_templates" to "service_role";

grant update on table "public"."email_templates" to "service_role";

grant delete on table "public"."footer_settings" to "anon";

grant insert on table "public"."footer_settings" to "anon";

grant references on table "public"."footer_settings" to "anon";

grant select on table "public"."footer_settings" to "anon";

grant trigger on table "public"."footer_settings" to "anon";

grant truncate on table "public"."footer_settings" to "anon";

grant update on table "public"."footer_settings" to "anon";

grant delete on table "public"."footer_settings" to "authenticated";

grant insert on table "public"."footer_settings" to "authenticated";

grant references on table "public"."footer_settings" to "authenticated";

grant select on table "public"."footer_settings" to "authenticated";

grant trigger on table "public"."footer_settings" to "authenticated";

grant truncate on table "public"."footer_settings" to "authenticated";

grant update on table "public"."footer_settings" to "authenticated";

grant delete on table "public"."footer_settings" to "service_role";

grant insert on table "public"."footer_settings" to "service_role";

grant references on table "public"."footer_settings" to "service_role";

grant select on table "public"."footer_settings" to "service_role";

grant trigger on table "public"."footer_settings" to "service_role";

grant truncate on table "public"."footer_settings" to "service_role";

grant update on table "public"."footer_settings" to "service_role";

grant delete on table "public"."membership_tiers" to "anon";

grant insert on table "public"."membership_tiers" to "anon";

grant references on table "public"."membership_tiers" to "anon";

grant select on table "public"."membership_tiers" to "anon";

grant trigger on table "public"."membership_tiers" to "anon";

grant truncate on table "public"."membership_tiers" to "anon";

grant update on table "public"."membership_tiers" to "anon";

grant delete on table "public"."membership_tiers" to "authenticated";

grant insert on table "public"."membership_tiers" to "authenticated";

grant references on table "public"."membership_tiers" to "authenticated";

grant select on table "public"."membership_tiers" to "authenticated";

grant trigger on table "public"."membership_tiers" to "authenticated";

grant truncate on table "public"."membership_tiers" to "authenticated";

grant update on table "public"."membership_tiers" to "authenticated";

grant delete on table "public"."membership_tiers" to "service_role";

grant insert on table "public"."membership_tiers" to "service_role";

grant references on table "public"."membership_tiers" to "service_role";

grant select on table "public"."membership_tiers" to "service_role";

grant trigger on table "public"."membership_tiers" to "service_role";

grant truncate on table "public"."membership_tiers" to "service_role";

grant update on table "public"."membership_tiers" to "service_role";

grant delete on table "public"."messages" to "anon";

grant insert on table "public"."messages" to "anon";

grant references on table "public"."messages" to "anon";

grant select on table "public"."messages" to "anon";

grant trigger on table "public"."messages" to "anon";

grant truncate on table "public"."messages" to "anon";

grant update on table "public"."messages" to "anon";

grant delete on table "public"."messages" to "authenticated";

grant insert on table "public"."messages" to "authenticated";

grant references on table "public"."messages" to "authenticated";

grant select on table "public"."messages" to "authenticated";

grant trigger on table "public"."messages" to "authenticated";

grant truncate on table "public"."messages" to "authenticated";

grant update on table "public"."messages" to "authenticated";

grant delete on table "public"."messages" to "service_role";

grant insert on table "public"."messages" to "service_role";

grant references on table "public"."messages" to "service_role";

grant select on table "public"."messages" to "service_role";

grant trigger on table "public"."messages" to "service_role";

grant truncate on table "public"."messages" to "service_role";

grant update on table "public"."messages" to "service_role";

grant delete on table "public"."notification_preferences" to "anon";

grant insert on table "public"."notification_preferences" to "anon";

grant references on table "public"."notification_preferences" to "anon";

grant select on table "public"."notification_preferences" to "anon";

grant trigger on table "public"."notification_preferences" to "anon";

grant truncate on table "public"."notification_preferences" to "anon";

grant update on table "public"."notification_preferences" to "anon";

grant delete on table "public"."notification_preferences" to "authenticated";

grant insert on table "public"."notification_preferences" to "authenticated";

grant references on table "public"."notification_preferences" to "authenticated";

grant select on table "public"."notification_preferences" to "authenticated";

grant trigger on table "public"."notification_preferences" to "authenticated";

grant truncate on table "public"."notification_preferences" to "authenticated";

grant update on table "public"."notification_preferences" to "authenticated";

grant delete on table "public"."notification_preferences" to "service_role";

grant insert on table "public"."notification_preferences" to "service_role";

grant references on table "public"."notification_preferences" to "service_role";

grant select on table "public"."notification_preferences" to "service_role";

grant trigger on table "public"."notification_preferences" to "service_role";

grant truncate on table "public"."notification_preferences" to "service_role";

grant update on table "public"."notification_preferences" to "service_role";

grant delete on table "public"."notifications" to "anon";

grant insert on table "public"."notifications" to "anon";

grant references on table "public"."notifications" to "anon";

grant select on table "public"."notifications" to "anon";

grant trigger on table "public"."notifications" to "anon";

grant truncate on table "public"."notifications" to "anon";

grant update on table "public"."notifications" to "anon";

grant delete on table "public"."notifications" to "authenticated";

grant insert on table "public"."notifications" to "authenticated";

grant references on table "public"."notifications" to "authenticated";

grant select on table "public"."notifications" to "authenticated";

grant trigger on table "public"."notifications" to "authenticated";

grant truncate on table "public"."notifications" to "authenticated";

grant update on table "public"."notifications" to "authenticated";

grant delete on table "public"."notifications" to "service_role";

grant insert on table "public"."notifications" to "service_role";

grant references on table "public"."notifications" to "service_role";

grant select on table "public"."notifications" to "service_role";

grant trigger on table "public"."notifications" to "service_role";

grant truncate on table "public"."notifications" to "service_role";

grant update on table "public"."notifications" to "service_role";

grant delete on table "public"."order_tracking_events" to "anon";

grant insert on table "public"."order_tracking_events" to "anon";

grant references on table "public"."order_tracking_events" to "anon";

grant select on table "public"."order_tracking_events" to "anon";

grant trigger on table "public"."order_tracking_events" to "anon";

grant truncate on table "public"."order_tracking_events" to "anon";

grant update on table "public"."order_tracking_events" to "anon";

grant delete on table "public"."order_tracking_events" to "authenticated";

grant insert on table "public"."order_tracking_events" to "authenticated";

grant references on table "public"."order_tracking_events" to "authenticated";

grant select on table "public"."order_tracking_events" to "authenticated";

grant trigger on table "public"."order_tracking_events" to "authenticated";

grant truncate on table "public"."order_tracking_events" to "authenticated";

grant update on table "public"."order_tracking_events" to "authenticated";

grant delete on table "public"."order_tracking_events" to "service_role";

grant insert on table "public"."order_tracking_events" to "service_role";

grant references on table "public"."order_tracking_events" to "service_role";

grant select on table "public"."order_tracking_events" to "service_role";

grant trigger on table "public"."order_tracking_events" to "service_role";

grant truncate on table "public"."order_tracking_events" to "service_role";

grant update on table "public"."order_tracking_events" to "service_role";

grant delete on table "public"."order_workflow_steps" to "anon";

grant insert on table "public"."order_workflow_steps" to "anon";

grant references on table "public"."order_workflow_steps" to "anon";

grant select on table "public"."order_workflow_steps" to "anon";

grant trigger on table "public"."order_workflow_steps" to "anon";

grant truncate on table "public"."order_workflow_steps" to "anon";

grant update on table "public"."order_workflow_steps" to "anon";

grant delete on table "public"."order_workflow_steps" to "authenticated";

grant insert on table "public"."order_workflow_steps" to "authenticated";

grant references on table "public"."order_workflow_steps" to "authenticated";

grant select on table "public"."order_workflow_steps" to "authenticated";

grant trigger on table "public"."order_workflow_steps" to "authenticated";

grant truncate on table "public"."order_workflow_steps" to "authenticated";

grant update on table "public"."order_workflow_steps" to "authenticated";

grant delete on table "public"."order_workflow_steps" to "service_role";

grant insert on table "public"."order_workflow_steps" to "service_role";

grant references on table "public"."order_workflow_steps" to "service_role";

grant select on table "public"."order_workflow_steps" to "service_role";

grant trigger on table "public"."order_workflow_steps" to "service_role";

grant truncate on table "public"."order_workflow_steps" to "service_role";

grant update on table "public"."order_workflow_steps" to "service_role";

grant delete on table "public"."quote_items" to "anon";

grant insert on table "public"."quote_items" to "anon";

grant references on table "public"."quote_items" to "anon";

grant select on table "public"."quote_items" to "anon";

grant trigger on table "public"."quote_items" to "anon";

grant truncate on table "public"."quote_items" to "anon";

grant update on table "public"."quote_items" to "anon";

grant delete on table "public"."quote_items" to "authenticated";

grant insert on table "public"."quote_items" to "authenticated";

grant references on table "public"."quote_items" to "authenticated";

grant select on table "public"."quote_items" to "authenticated";

grant trigger on table "public"."quote_items" to "authenticated";

grant truncate on table "public"."quote_items" to "authenticated";

grant update on table "public"."quote_items" to "authenticated";

grant delete on table "public"."quote_items" to "service_role";

grant insert on table "public"."quote_items" to "service_role";

grant references on table "public"."quote_items" to "service_role";

grant select on table "public"."quote_items" to "service_role";

grant trigger on table "public"."quote_items" to "service_role";

grant truncate on table "public"."quote_items" to "service_role";

grant update on table "public"."quote_items" to "service_role";

grant delete on table "public"."quote_templates" to "anon";

grant insert on table "public"."quote_templates" to "anon";

grant references on table "public"."quote_templates" to "anon";

grant select on table "public"."quote_templates" to "anon";

grant trigger on table "public"."quote_templates" to "anon";

grant truncate on table "public"."quote_templates" to "anon";

grant update on table "public"."quote_templates" to "anon";

grant delete on table "public"."quote_templates" to "authenticated";

grant insert on table "public"."quote_templates" to "authenticated";

grant references on table "public"."quote_templates" to "authenticated";

grant select on table "public"."quote_templates" to "authenticated";

grant trigger on table "public"."quote_templates" to "authenticated";

grant truncate on table "public"."quote_templates" to "authenticated";

grant update on table "public"."quote_templates" to "authenticated";

grant delete on table "public"."quote_templates" to "service_role";

grant insert on table "public"."quote_templates" to "service_role";

grant references on table "public"."quote_templates" to "service_role";

grant select on table "public"."quote_templates" to "service_role";

grant trigger on table "public"."quote_templates" to "service_role";

grant truncate on table "public"."quote_templates" to "service_role";

grant update on table "public"."quote_templates" to "service_role";

grant delete on table "public"."quotes" to "anon";

grant insert on table "public"."quotes" to "anon";

grant references on table "public"."quotes" to "anon";

grant select on table "public"."quotes" to "anon";

grant trigger on table "public"."quotes" to "anon";

grant truncate on table "public"."quotes" to "anon";

grant update on table "public"."quotes" to "anon";

grant delete on table "public"."quotes" to "authenticated";

grant insert on table "public"."quotes" to "authenticated";

grant references on table "public"."quotes" to "authenticated";

grant select on table "public"."quotes" to "authenticated";

grant trigger on table "public"."quotes" to "authenticated";

grant truncate on table "public"."quotes" to "authenticated";

grant update on table "public"."quotes" to "authenticated";

grant delete on table "public"."quotes" to "service_role";

grant insert on table "public"."quotes" to "service_role";

grant references on table "public"."quotes" to "service_role";

grant select on table "public"."quotes" to "service_role";

grant trigger on table "public"."quotes" to "service_role";

grant truncate on table "public"."quotes" to "service_role";

grant update on table "public"."quotes" to "service_role";

grant delete on table "public"."referral_rewards" to "anon";

grant insert on table "public"."referral_rewards" to "anon";

grant references on table "public"."referral_rewards" to "anon";

grant select on table "public"."referral_rewards" to "anon";

grant trigger on table "public"."referral_rewards" to "anon";

grant truncate on table "public"."referral_rewards" to "anon";

grant update on table "public"."referral_rewards" to "anon";

grant delete on table "public"."referral_rewards" to "authenticated";

grant insert on table "public"."referral_rewards" to "authenticated";

grant references on table "public"."referral_rewards" to "authenticated";

grant select on table "public"."referral_rewards" to "authenticated";

grant trigger on table "public"."referral_rewards" to "authenticated";

grant truncate on table "public"."referral_rewards" to "authenticated";

grant update on table "public"."referral_rewards" to "authenticated";

grant delete on table "public"."referral_rewards" to "service_role";

grant insert on table "public"."referral_rewards" to "service_role";

grant references on table "public"."referral_rewards" to "service_role";

grant select on table "public"."referral_rewards" to "service_role";

grant trigger on table "public"."referral_rewards" to "service_role";

grant truncate on table "public"."referral_rewards" to "service_role";

grant update on table "public"."referral_rewards" to "service_role";

grant delete on table "public"."referrals" to "anon";

grant insert on table "public"."referrals" to "anon";

grant references on table "public"."referrals" to "anon";

grant select on table "public"."referrals" to "anon";

grant trigger on table "public"."referrals" to "anon";

grant truncate on table "public"."referrals" to "anon";

grant update on table "public"."referrals" to "anon";

grant delete on table "public"."referrals" to "authenticated";

grant insert on table "public"."referrals" to "authenticated";

grant references on table "public"."referrals" to "authenticated";

grant select on table "public"."referrals" to "authenticated";

grant trigger on table "public"."referrals" to "authenticated";

grant truncate on table "public"."referrals" to "authenticated";

grant update on table "public"."referrals" to "authenticated";

grant delete on table "public"."referrals" to "service_role";

grant insert on table "public"."referrals" to "service_role";

grant references on table "public"."referrals" to "service_role";

grant select on table "public"."referrals" to "service_role";

grant trigger on table "public"."referrals" to "service_role";

grant truncate on table "public"."referrals" to "service_role";

grant update on table "public"."referrals" to "service_role";

grant delete on table "public"."rejection_reasons" to "anon";

grant insert on table "public"."rejection_reasons" to "anon";

grant references on table "public"."rejection_reasons" to "anon";

grant select on table "public"."rejection_reasons" to "anon";

grant trigger on table "public"."rejection_reasons" to "anon";

grant truncate on table "public"."rejection_reasons" to "anon";

grant update on table "public"."rejection_reasons" to "anon";

grant delete on table "public"."rejection_reasons" to "authenticated";

grant insert on table "public"."rejection_reasons" to "authenticated";

grant references on table "public"."rejection_reasons" to "authenticated";

grant select on table "public"."rejection_reasons" to "authenticated";

grant trigger on table "public"."rejection_reasons" to "authenticated";

grant truncate on table "public"."rejection_reasons" to "authenticated";

grant update on table "public"."rejection_reasons" to "authenticated";

grant delete on table "public"."rejection_reasons" to "service_role";

grant insert on table "public"."rejection_reasons" to "service_role";

grant references on table "public"."rejection_reasons" to "service_role";

grant select on table "public"."rejection_reasons" to "service_role";

grant trigger on table "public"."rejection_reasons" to "service_role";

grant truncate on table "public"."rejection_reasons" to "service_role";

grant update on table "public"."rejection_reasons" to "service_role";

grant delete on table "public"."system_settings" to "anon";

grant insert on table "public"."system_settings" to "anon";

grant references on table "public"."system_settings" to "anon";

grant select on table "public"."system_settings" to "anon";

grant trigger on table "public"."system_settings" to "anon";

grant truncate on table "public"."system_settings" to "anon";

grant update on table "public"."system_settings" to "anon";

grant delete on table "public"."system_settings" to "authenticated";

grant insert on table "public"."system_settings" to "authenticated";

grant references on table "public"."system_settings" to "authenticated";

grant select on table "public"."system_settings" to "authenticated";

grant trigger on table "public"."system_settings" to "authenticated";

grant truncate on table "public"."system_settings" to "authenticated";

grant update on table "public"."system_settings" to "authenticated";

grant delete on table "public"."system_settings" to "service_role";

grant insert on table "public"."system_settings" to "service_role";

grant references on table "public"."system_settings" to "service_role";

grant select on table "public"."system_settings" to "service_role";

grant trigger on table "public"."system_settings" to "service_role";

grant truncate on table "public"."system_settings" to "service_role";

grant update on table "public"."system_settings" to "service_role";

grant delete on table "public"."tracking_templates" to "anon";

grant insert on table "public"."tracking_templates" to "anon";

grant references on table "public"."tracking_templates" to "anon";

grant select on table "public"."tracking_templates" to "anon";

grant trigger on table "public"."tracking_templates" to "anon";

grant truncate on table "public"."tracking_templates" to "anon";

grant update on table "public"."tracking_templates" to "anon";

grant delete on table "public"."tracking_templates" to "authenticated";

grant insert on table "public"."tracking_templates" to "authenticated";

grant references on table "public"."tracking_templates" to "authenticated";

grant select on table "public"."tracking_templates" to "authenticated";

grant trigger on table "public"."tracking_templates" to "authenticated";

grant truncate on table "public"."tracking_templates" to "authenticated";

grant update on table "public"."tracking_templates" to "authenticated";

grant delete on table "public"."tracking_templates" to "service_role";

grant insert on table "public"."tracking_templates" to "service_role";

grant references on table "public"."tracking_templates" to "service_role";

grant select on table "public"."tracking_templates" to "service_role";

grant trigger on table "public"."tracking_templates" to "service_role";

grant truncate on table "public"."tracking_templates" to "service_role";

grant update on table "public"."tracking_templates" to "service_role";

grant delete on table "public"."user_memberships" to "anon";

grant insert on table "public"."user_memberships" to "anon";

grant references on table "public"."user_memberships" to "anon";

grant select on table "public"."user_memberships" to "anon";

grant trigger on table "public"."user_memberships" to "anon";

grant truncate on table "public"."user_memberships" to "anon";

grant update on table "public"."user_memberships" to "anon";

grant delete on table "public"."user_memberships" to "authenticated";

grant insert on table "public"."user_memberships" to "authenticated";

grant references on table "public"."user_memberships" to "authenticated";

grant select on table "public"."user_memberships" to "authenticated";

grant trigger on table "public"."user_memberships" to "authenticated";

grant truncate on table "public"."user_memberships" to "authenticated";

grant update on table "public"."user_memberships" to "authenticated";

grant delete on table "public"."user_memberships" to "service_role";

grant insert on table "public"."user_memberships" to "service_role";

grant references on table "public"."user_memberships" to "service_role";

grant select on table "public"."user_memberships" to "service_role";

grant trigger on table "public"."user_memberships" to "service_role";

grant truncate on table "public"."user_memberships" to "service_role";

grant update on table "public"."user_memberships" to "service_role";

grant delete on table "public"."user_wishlist_items" to "anon";

grant insert on table "public"."user_wishlist_items" to "anon";

grant references on table "public"."user_wishlist_items" to "anon";

grant select on table "public"."user_wishlist_items" to "anon";

grant trigger on table "public"."user_wishlist_items" to "anon";

grant truncate on table "public"."user_wishlist_items" to "anon";

grant update on table "public"."user_wishlist_items" to "anon";

grant delete on table "public"."user_wishlist_items" to "authenticated";

grant insert on table "public"."user_wishlist_items" to "authenticated";

grant references on table "public"."user_wishlist_items" to "authenticated";

grant select on table "public"."user_wishlist_items" to "authenticated";

grant trigger on table "public"."user_wishlist_items" to "authenticated";

grant truncate on table "public"."user_wishlist_items" to "authenticated";

grant update on table "public"."user_wishlist_items" to "authenticated";

grant delete on table "public"."user_wishlist_items" to "service_role";

grant insert on table "public"."user_wishlist_items" to "service_role";

grant references on table "public"."user_wishlist_items" to "service_role";

grant select on table "public"."user_wishlist_items" to "service_role";

grant trigger on table "public"."user_wishlist_items" to "service_role";

grant truncate on table "public"."user_wishlist_items" to "service_role";

grant update on table "public"."user_wishlist_items" to "service_role";

create policy "Admins can view audit logs"
on "public"."audit_logs"
as permissive
for select
to public
using (is_admin());


create policy "admin_all_access_on_bank_accounts"
on "public"."bank_account_details"
as permissive
for all
to public
using (is_admin())
with check (is_admin());


create policy "authenticated_users_can_read_active_bank_accounts"
on "public"."bank_account_details"
as permissive
for select
to public
using (((auth.role() = 'authenticated'::text) AND (is_active = true)));


create policy "Admins can manage country settings"
on "public"."country_settings"
as permissive
for all
to public
using (has_role(auth.uid(), 'admin'::app_role))
with check (has_role(auth.uid(), 'admin'::app_role));


create policy "Public can read country settings"
on "public"."country_settings"
as permissive
for select
to public
using (true);


create policy "Admins can manage customs categories"
on "public"."customs_categories"
as permissive
for all
to public
using (has_role(auth.uid(), 'admin'::app_role))
with check (has_role(auth.uid(), 'admin'::app_role));


create policy "Public can read customs categories"
on "public"."customs_categories"
as permissive
for select
to public
using (true);


create policy "Admins can manage email templates"
on "public"."email_templates"
as permissive
for all
to public
using (is_admin());


create policy "Admins can manage membership tiers"
on "public"."membership_tiers"
as permissive
for all
to public
using (is_admin());


create policy "Everyone can view active membership tiers"
on "public"."membership_tiers"
as permissive
for select
to public
using ((is_active = true));


create policy "Admins can update all messages"
on "public"."messages"
as permissive
for update
to authenticated
using ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role)))));


create policy "Admins can view all messages"
on "public"."messages"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role)))));


create policy "Authenticated users can create messages"
on "public"."messages"
as permissive
for insert
to authenticated
with check (((auth.uid() = sender_id) AND ((quote_id IS NULL) OR (EXISTS ( SELECT 1
   FROM quotes q
  WHERE ((q.id = messages.quote_id) AND ((q.user_id = auth.uid()) OR ((q.user_id IS NULL) AND (q.email = auth.email())))))))));


create policy "Users can access messages for their quotes and direct messages"
on "public"."messages"
as permissive
for select
to public
using (((auth.uid() = sender_id) OR (auth.uid() = recipient_id) OR ((quote_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM quotes q
  WHERE ((q.id = messages.quote_id) AND ((q.user_id = auth.uid()) OR ((q.user_id IS NULL) AND (q.email = auth.email()))))))) OR is_admin()));


create policy "Users can update accessible messages"
on "public"."messages"
as permissive
for update
to public
using (((auth.uid() = sender_id) OR (auth.uid() = recipient_id) OR ((quote_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM quotes q
  WHERE ((q.id = messages.quote_id) AND ((q.user_id = auth.uid()) OR ((q.user_id IS NULL) AND (q.email = auth.email()))))))) OR is_admin()));


create policy "Users can update messages they sent or received"
on "public"."messages"
as permissive
for update
to public
using (((auth.uid() = sender_id) OR (auth.uid() = recipient_id) OR ((quote_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM quotes
  WHERE ((quotes.id = messages.quote_id) AND (quotes.user_id = auth.uid())))))));


create policy "Users can view messages they sent or received"
on "public"."messages"
as permissive
for select
to public
using (((auth.uid() = sender_id) OR (auth.uid() = recipient_id) OR ((quote_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM quotes
  WHERE ((quotes.id = messages.quote_id) AND (quotes.user_id = auth.uid())))))));


create policy "Users can view their own notification preferences"
on "public"."notification_preferences"
as permissive
for all
to public
using ((user_id = auth.uid()));


create policy "Admins can create notifications"
on "public"."notifications"
as permissive
for insert
to public
with check (is_admin());


create policy "Users can delete their own notifications"
on "public"."notifications"
as permissive
for delete
to public
using (((auth.uid() = user_id) OR is_admin()));


create policy "Users can update their own notifications"
on "public"."notifications"
as permissive
for update
to public
using (((auth.uid() = user_id) OR is_admin()))
with check (((auth.uid() = user_id) OR is_admin()));


create policy "Users can view their own notifications"
on "public"."notifications"
as permissive
for select
to public
using (((auth.uid() = user_id) OR is_admin()));


create policy "Admins can manage all data"
on "public"."order_tracking_events"
as permissive
for all
to public
using (is_admin());


create policy "Users can view their own tracking events"
on "public"."order_tracking_events"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM quotes
  WHERE ((quotes.id = order_tracking_events.quote_id) AND ((quotes.user_id = auth.uid()) OR (quotes.email = auth.email()))))));


create policy "Admins can manage workflow steps"
on "public"."order_workflow_steps"
as permissive
for all
to public
using (is_admin());


create policy "Admins can update all profiles"
on "public"."profiles"
as permissive
for update
to public
using (is_admin())
with check (is_admin());


create policy "Profiles are viewable by users and admins"
on "public"."profiles"
as permissive
for select
to public
using (((auth.uid() = id) OR is_admin()));


create policy "Users can insert their own profile"
on "public"."profiles"
as permissive
for insert
to public
with check ((auth.uid() = id));


create policy "Users can update their own profile and admins can update any"
on "public"."profiles"
as permissive
for update
to public
using (((auth.uid() = id) OR is_admin()))
with check (((auth.uid() = id) OR is_admin()));


create policy "Users can update their own profile."
on "public"."profiles"
as permissive
for update
to public
using ((auth.uid() = id));


create policy "Users can view their own profile."
on "public"."profiles"
as permissive
for select
to public
using ((auth.uid() = id));


create policy "Admins can access all quote_items"
on "public"."quote_items"
as permissive
for all
to public
using (has_role(auth.uid(), 'admin'::app_role))
with check (has_role(auth.uid(), 'admin'::app_role));


create policy "Admins can delete quote items"
on "public"."quote_items"
as permissive
for delete
to public
using ((EXISTS ( SELECT 1
   FROM quotes
  WHERE ((quotes.id = quote_items.quote_id) AND is_admin()))));


create policy "Users and recent guests can insert quote items"
on "public"."quote_items"
as permissive
for insert
to public
with check (((EXISTS ( SELECT 1
   FROM quotes
  WHERE ((quotes.id = quote_items.quote_id) AND (quotes.user_id = auth.uid())))) OR ((auth.role() = 'anon'::text) AND (EXISTS ( SELECT 1
   FROM quotes
  WHERE ((quotes.id = quote_items.quote_id) AND (quotes.user_id IS NULL) AND (quotes.created_at > (now() - '00:05:00'::interval))))))));


create policy "Users can add items to accessible quotes"
on "public"."quote_items"
as permissive
for insert
to public
with check ((EXISTS ( SELECT 1
   FROM quotes q
  WHERE ((q.id = quote_items.quote_id) AND (((auth.role() = 'authenticated'::text) AND (q.user_id = auth.uid())) OR ((auth.role() = 'anon'::text) AND (q.user_id IS NULL) AND (q.created_at > (now() - '01:00:00'::interval))) OR is_admin())))));


create policy "Users can update items for their own quotes"
on "public"."quote_items"
as permissive
for update
to public
using ((EXISTS ( SELECT 1
   FROM quotes
  WHERE ((quotes.id = quote_items.quote_id) AND ((quotes.user_id = auth.uid()) OR is_admin())))));


create policy "Users can view items for accessible quotes"
on "public"."quote_items"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM quotes q
  WHERE ((q.id = quote_items.quote_id) AND ((q.user_id = auth.uid()) OR ((q.user_id IS NULL) AND (q.email = auth.email())) OR is_admin())))));


create policy "Users can view their own quote items"
on "public"."quote_items"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM quotes
  WHERE ((quotes.id = quote_items.quote_id) AND (quotes.user_id = auth.uid())))));


create policy "Allow all access to admins"
on "public"."quote_templates"
as permissive
for all
to public
using (has_role(auth.uid(), 'admin'::app_role))
with check (has_role(auth.uid(), 'admin'::app_role));


create policy "Allow read access to authenticated users"
on "public"."quote_templates"
as permissive
for select
to public
using ((auth.role() = 'authenticated'::text));


create policy "Admins can access all quotes"
on "public"."quotes"
as permissive
for all
to public
using (has_role(auth.uid(), 'admin'::app_role))
with check (has_role(auth.uid(), 'admin'::app_role));


create policy "Admins can delete quotes"
on "public"."quotes"
as permissive
for delete
to public
using (is_admin());


create policy "Admins can manage all quotes"
on "public"."quotes"
as permissive
for all
to public
using (has_role(auth.uid(), 'admin'::app_role));


create policy "Allow public insert for quote requests"
on "public"."quotes"
as permissive
for insert
to public
with check (true);


create policy "Allow quote creation for authenticated and guest users"
on "public"."quotes"
as permissive
for insert
to public
with check ((((auth.role() = 'authenticated'::text) AND (auth.uid() = user_id)) OR ((auth.role() = 'anon'::text) AND (user_id IS NULL)) OR is_admin()));


create policy "Users and guests can create quotes"
on "public"."quotes"
as permissive
for insert
to public
with check ((((auth.role() = 'authenticated'::text) AND (user_id = auth.uid())) OR ((auth.role() = 'anon'::text) AND (user_id IS NULL))));


create policy "Users can insert quotes."
on "public"."quotes"
as permissive
for insert
to public
with check (((auth.uid() = user_id) OR (user_id IS NULL)));


create policy "Users can update their own quotes"
on "public"."quotes"
as permissive
for update
to public
using ((auth.uid() = user_id));


create policy "Users can update their own quotes, admins can update all"
on "public"."quotes"
as permissive
for update
to public
using (((auth.uid() = user_id) OR is_admin()))
with check (((auth.uid() = user_id) OR is_admin()));


create policy "Users can view their own quotes and guest quotes by email"
on "public"."quotes"
as permissive
for select
to public
using (((auth.uid() = user_id) OR ((user_id IS NULL) AND (auth.email() = email)) OR is_admin()));


create policy "Users can view their own quotes"
on "public"."quotes"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "Users can view their own quotes."
on "public"."quotes"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "Admins can manage referral rewards"
on "public"."referral_rewards"
as permissive
for all
to public
using (is_admin());


create policy "Everyone can view active referral rewards"
on "public"."referral_rewards"
as permissive
for select
to public
using ((is_active = true));


create policy "Users can view their own referrals"
on "public"."referrals"
as permissive
for select
to public
using (((referrer_id = auth.uid()) OR (referee_id = auth.uid())));


create policy "Admins can manage rejection reasons"
on "public"."rejection_reasons"
as permissive
for all
to authenticated
using (is_admin())
with check (is_admin());


create policy "Public can read rejection reasons"
on "public"."rejection_reasons"
as permissive
for select
to public
using (true);


create policy "Only admins can manage system settings"
on "public"."system_settings"
as permissive
for all
to public
using (is_admin());


create policy "Admins can manage tracking templates"
on "public"."tracking_templates"
as permissive
for all
to public
using (is_admin());


create policy "Users can manage their own addresses"
on "public"."user_addresses"
as permissive
for all
to public
using (((auth.uid() = user_id) OR is_admin()))
with check (((auth.uid() = user_id) OR is_admin()));


create policy "Users can manage their own addresses."
on "public"."user_addresses"
as permissive
for all
to public
using ((auth.uid() = user_id));


create policy "Users can view their own memberships"
on "public"."user_memberships"
as permissive
for select
to public
using ((user_id = auth.uid()));


create policy "Admins can manage roles"
on "public"."user_roles"
as permissive
for all
to public
using (has_role(auth.uid(), 'admin'::app_role))
with check (has_role(auth.uid(), 'admin'::app_role));


create policy "Admins can manage user roles"
on "public"."user_roles"
as permissive
for all
to public
using (is_admin())
with check (is_admin());


create policy "Users can view their own roles, admins can view all"
on "public"."user_roles"
as permissive
for select
to public
using (((auth.uid() = user_id) OR is_admin()));


create policy "Users can view their own wishlist items"
on "public"."user_wishlist_items"
as permissive
for all
to public
using ((user_id = auth.uid()));


create policy "Admins can delete profiles"
on "public"."profiles"
as permissive
for delete
to public
using (is_admin());


create policy "Admins can view all profiles"
on "public"."profiles"
as permissive
for select
to public
using (is_admin());


create policy "Users can update their own profile"
on "public"."profiles"
as permissive
for update
to public
using ((auth.uid() = id))
with check ((auth.uid() = id));


create policy "Users can update their own addresses"
on "public"."user_addresses"
as permissive
for update
to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));


CREATE TRIGGER set_country_settings_timestamp BEFORE UPDATE ON public.country_settings FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_customs_categories_timestamp BEFORE UPDATE ON public.customs_categories FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp BEFORE UPDATE ON public.footer_settings FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_messages BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_notifications BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER trigger_order_tracking_events_updated_at BEFORE UPDATE ON public.order_tracking_events FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.quote_templates FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_order_display_id BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION generate_order_display_id();

CREATE TRIGGER set_quote_display_id_trigger BEFORE INSERT ON public.quotes FOR EACH ROW EXECUTE FUNCTION generate_quote_display_id();

CREATE TRIGGER set_timestamp BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER trigger_sync_approval_status BEFORE UPDATE ON public.quotes FOR EACH ROW WHEN ((old.status IS DISTINCT FROM new.status)) EXECUTE FUNCTION sync_approval_status();

CREATE TRIGGER trigger_referrals_updated_at BEFORE UPDATE ON public.referrals FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_updated_at_system_settings BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp BEFORE UPDATE ON public.user_addresses FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER trigger_user_memberships_updated_at BEFORE UPDATE ON public.user_memberships FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER trigger_user_wishlist_items_updated_at BEFORE UPDATE ON public.user_wishlist_items FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();


