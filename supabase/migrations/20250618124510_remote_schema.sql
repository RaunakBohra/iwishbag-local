alter table "public"."quote_items" drop constraint "quote_items_category_check";

alter table "public"."quotes" drop constraint "quotes_user_id_fkey";

drop index if exists "public"."audit_logs_pkey";

drop index if exists "public"."bank_account_details_pkey";

drop index if exists "public"."country_settings_pkey";

drop index if exists "public"."customs_categories_pkey";

drop index if exists "public"."email_templates_pkey";

drop index if exists "public"."membership_tiers_pkey";

drop index if exists "public"."messages_pkey";

drop index if exists "public"."notification_preferences_pkey";

drop index if exists "public"."notifications_pkey";

drop index if exists "public"."order_tracking_events_pkey";

drop index if exists "public"."order_workflow_steps_pkey";

drop index if exists "public"."quote_templates_pkey";

drop index if exists "public"."referral_rewards_pkey";

drop index if exists "public"."referrals_pkey";

drop index if exists "public"."rejection_reasons_pkey";

drop index if exists "public"."system_settings_pkey";

drop index if exists "public"."tracking_templates_pkey";

drop index if exists "public"."user_memberships_pkey";

drop index if exists "public"."user_wishlist_items_pkey";

create table "public"."user_addresses" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "address_line1" text not null,
    "address_line2" text,
    "city" text not null,
    "state_province_region" text not null,
    "postal_code" text not null,
    "country" text not null,
    "is_default" boolean not null default false,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "country_code" text
);


alter table "public"."user_addresses" enable row level security;

create table "public"."user_roles" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "role" app_role not null
);


alter table "public"."user_roles" enable row level security;

alter table "public"."admin_role_backup" enable row level security;

alter table "public"."profiles" drop column "username";

alter table "public"."profiles" drop column "website";

alter table "public"."profiles" add column "internal_notes" text;

alter table "public"."profiles" add column "phone" text;

alter table "public"."profiles" alter column "created_at" set not null;

alter table "public"."profiles" alter column "updated_at" set not null;

alter table "public"."profiles" enable row level security;

alter table "public"."quote_items" drop column "item_name";

alter table "public"."quote_items" drop column "notes";

alter table "public"."quote_items" add column "image_url" text;

alter table "public"."quote_items" add column "item_currency" text not null default 'USD'::text;

alter table "public"."quote_items" add column "item_weight" numeric;

alter table "public"."quote_items" add column "options" text;

alter table "public"."quote_items" add column "product_name" text;

alter table "public"."quote_items" add column "product_url" text;

alter table "public"."quote_items" alter column "item_price" drop not null;

alter table "public"."quote_items" alter column "quantity" set default 1;

alter table "public"."quotes" add column "approved_at" timestamp with time zone;

alter table "public"."quotes" add column "country_code" text;

alter table "public"."quotes" add column "current_location" text;

alter table "public"."quotes" add column "customs_and_ecs" numeric;

alter table "public"."quotes" add column "customs_category_name" text;

alter table "public"."quotes" add column "discount" numeric;

alter table "public"."quotes" add column "domestic_shipping" numeric;

alter table "public"."quotes" add column "email" text not null;

alter table "public"."quotes" add column "estimated_delivery_date" date;

alter table "public"."quotes" add column "final_currency" text;

alter table "public"."quotes" add column "final_total" numeric;

alter table "public"."quotes" add column "final_total_local" numeric;

alter table "public"."quotes" add column "handling_charge" numeric;

alter table "public"."quotes" add column "image_url" text;

alter table "public"."quotes" add column "in_cart" boolean not null default true;

alter table "public"."quotes" add column "insurance_amount" numeric;

alter table "public"."quotes" add column "internal_notes" text;

alter table "public"."quotes" add column "international_shipping" numeric;

alter table "public"."quotes" add column "item_price" numeric;

alter table "public"."quotes" add column "item_weight" numeric;

alter table "public"."quotes" add column "items_currency" text default 'USD'::text;

alter table "public"."quotes" add column "last_tracking_update" timestamp with time zone;

alter table "public"."quotes" add column "merchant_shipping_price" numeric;

alter table "public"."quotes" add column "options" text;

alter table "public"."quotes" add column "paid_at" timestamp with time zone;

alter table "public"."quotes" add column "payment_gateway_fee" numeric;

alter table "public"."quotes" add column "payment_method" text;

alter table "public"."quotes" add column "priority" quote_priority;

alter table "public"."quotes" add column "product_name" text;

alter table "public"."quotes" add column "product_url" text;

alter table "public"."quotes" add column "quantity" integer;

alter table "public"."quotes" add column "rejected_at" timestamp with time zone;

alter table "public"."quotes" add column "rejection_details" text;

alter table "public"."quotes" add column "rejection_reason_id" uuid;

alter table "public"."quotes" add column "sales_tax_price" numeric;

alter table "public"."quotes" add column "shipped_at" timestamp with time zone;

alter table "public"."quotes" add column "shipping_carrier" text;

alter table "public"."quotes" add column "sub_total" numeric;

alter table "public"."quotes" add column "tracking_number" text;

alter table "public"."quotes" add column "vat" numeric;

alter table "public"."quotes" alter column "approval_status" set default 'pending'::text;

alter table "public"."quotes" alter column "approval_status" drop not null;

alter table "public"."quotes" alter column "status" set default 'pending'::text;

alter table "public"."quotes" alter column "user_id" drop not null;

CREATE UNIQUE INDEX user_addresses_pkey ON public.user_addresses USING btree (id);

CREATE UNIQUE INDEX user_roles_pkey ON public.user_roles USING btree (id);

CREATE UNIQUE INDEX user_roles_user_id_role_key ON public.user_roles USING btree (user_id, role);

CREATE UNIQUE INDEX audit_logs_pkey ON public.audit_logs USING btree (id);

CREATE UNIQUE INDEX bank_account_details_pkey ON public.bank_account_details USING btree (id);

CREATE UNIQUE INDEX country_settings_pkey ON public.country_settings USING btree (code);

CREATE UNIQUE INDEX customs_categories_pkey ON public.customs_categories USING btree (name);

CREATE UNIQUE INDEX email_templates_pkey ON public.email_templates USING btree (id);

CREATE UNIQUE INDEX membership_tiers_pkey ON public.membership_tiers USING btree (id);

CREATE UNIQUE INDEX messages_pkey ON public.messages USING btree (id);

CREATE UNIQUE INDEX notification_preferences_pkey ON public.notification_preferences USING btree (id);

CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id);

CREATE UNIQUE INDEX order_tracking_events_pkey ON public.order_tracking_events USING btree (id);

CREATE UNIQUE INDEX order_workflow_steps_pkey ON public.order_workflow_steps USING btree (id);

CREATE UNIQUE INDEX quote_templates_pkey ON public.quote_templates USING btree (id);

CREATE UNIQUE INDEX referral_rewards_pkey ON public.referral_rewards USING btree (id);

CREATE UNIQUE INDEX referrals_pkey ON public.referrals USING btree (id);

CREATE UNIQUE INDEX rejection_reasons_pkey ON public.rejection_reasons USING btree (id);

CREATE UNIQUE INDEX system_settings_pkey ON public.system_settings USING btree (id);

CREATE UNIQUE INDEX tracking_templates_pkey ON public.tracking_templates USING btree (id);

CREATE UNIQUE INDEX user_memberships_pkey ON public.user_memberships USING btree (id);

CREATE UNIQUE INDEX user_wishlist_items_pkey ON public.user_wishlist_items USING btree (id);

alter table "public"."audit_logs" add constraint "audit_logs_pkey" PRIMARY KEY using index "audit_logs_pkey";

alter table "public"."bank_account_details" add constraint "bank_account_details_pkey" PRIMARY KEY using index "bank_account_details_pkey";

alter table "public"."country_settings" add constraint "country_settings_pkey" PRIMARY KEY using index "country_settings_pkey";

alter table "public"."customs_categories" add constraint "customs_categories_pkey" PRIMARY KEY using index "customs_categories_pkey";

alter table "public"."email_templates" add constraint "email_templates_pkey" PRIMARY KEY using index "email_templates_pkey";

alter table "public"."membership_tiers" add constraint "membership_tiers_pkey" PRIMARY KEY using index "membership_tiers_pkey";

alter table "public"."messages" add constraint "messages_pkey" PRIMARY KEY using index "messages_pkey";

alter table "public"."notification_preferences" add constraint "notification_preferences_pkey" PRIMARY KEY using index "notification_preferences_pkey";

alter table "public"."notifications" add constraint "notifications_pkey" PRIMARY KEY using index "notifications_pkey";

alter table "public"."order_tracking_events" add constraint "order_tracking_events_pkey" PRIMARY KEY using index "order_tracking_events_pkey";

alter table "public"."order_workflow_steps" add constraint "order_workflow_steps_pkey" PRIMARY KEY using index "order_workflow_steps_pkey";

alter table "public"."quote_templates" add constraint "quote_templates_pkey" PRIMARY KEY using index "quote_templates_pkey";

alter table "public"."referral_rewards" add constraint "referral_rewards_pkey" PRIMARY KEY using index "referral_rewards_pkey";

alter table "public"."referrals" add constraint "referrals_pkey" PRIMARY KEY using index "referrals_pkey";

alter table "public"."rejection_reasons" add constraint "rejection_reasons_pkey" PRIMARY KEY using index "rejection_reasons_pkey";

alter table "public"."system_settings" add constraint "system_settings_pkey" PRIMARY KEY using index "system_settings_pkey";

alter table "public"."tracking_templates" add constraint "tracking_templates_pkey" PRIMARY KEY using index "tracking_templates_pkey";

alter table "public"."user_addresses" add constraint "user_addresses_pkey" PRIMARY KEY using index "user_addresses_pkey";

alter table "public"."user_memberships" add constraint "user_memberships_pkey" PRIMARY KEY using index "user_memberships_pkey";

alter table "public"."user_roles" add constraint "user_roles_pkey" PRIMARY KEY using index "user_roles_pkey";

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

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."profiles" add constraint "profiles_referral_code_key" UNIQUE using index "profiles_referral_code_key";

alter table "public"."quote_items" add constraint "url_or_image_required" CHECK (((COALESCE(product_url, ''::text) <> ''::text) OR (COALESCE(image_url, ''::text) <> ''::text))) not valid;

alter table "public"."quote_items" validate constraint "url_or_image_required";

alter table "public"."quotes" add constraint "quotes_approval_status_check" CHECK ((approval_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))) not valid;

alter table "public"."quotes" validate constraint "quotes_approval_status_check";

alter table "public"."quotes" add constraint "quotes_country_code_fkey" FOREIGN KEY (country_code) REFERENCES country_settings(code) ON DELETE SET NULL not valid;

alter table "public"."quotes" validate constraint "quotes_country_code_fkey";

alter table "public"."quotes" add constraint "quotes_customs_category_name_fkey" FOREIGN KEY (customs_category_name) REFERENCES customs_categories(name) ON DELETE SET NULL not valid;

alter table "public"."quotes" validate constraint "quotes_customs_category_name_fkey";

alter table "public"."quotes" add constraint "quotes_quantity_check" CHECK ((quantity > 0)) not valid;

alter table "public"."quotes" validate constraint "quotes_quantity_check";

alter table "public"."quotes" add constraint "quotes_rejection_reason_id_fkey" FOREIGN KEY (rejection_reason_id) REFERENCES rejection_reasons(id) ON DELETE SET NULL not valid;

alter table "public"."quotes" validate constraint "quotes_rejection_reason_id_fkey";

alter table "public"."referrals" add constraint "referrals_referee_id_fkey" FOREIGN KEY (referee_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."referrals" validate constraint "referrals_referee_id_fkey";

alter table "public"."referrals" add constraint "referrals_referral_code_key" UNIQUE using index "referrals_referral_code_key";

alter table "public"."referrals" add constraint "referrals_referrer_id_fkey" FOREIGN KEY (referrer_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."referrals" validate constraint "referrals_referrer_id_fkey";

alter table "public"."system_settings" add constraint "system_settings_setting_key_key" UNIQUE using index "system_settings_setting_key_key";

alter table "public"."user_addresses" add constraint "user_addresses_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_addresses" validate constraint "user_addresses_user_id_fkey";

alter table "public"."user_memberships" add constraint "user_memberships_tier_id_fkey" FOREIGN KEY (tier_id) REFERENCES membership_tiers(id) not valid;

alter table "public"."user_memberships" validate constraint "user_memberships_tier_id_fkey";

alter table "public"."user_memberships" add constraint "user_memberships_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_memberships" validate constraint "user_memberships_user_id_fkey";

alter table "public"."user_roles" add constraint "user_roles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_roles" validate constraint "user_roles_user_id_fkey";

alter table "public"."user_roles" add constraint "user_roles_user_id_role_key" UNIQUE using index "user_roles_user_id_role_key";

alter table "public"."user_wishlist_items" add constraint "user_wishlist_items_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_wishlist_items" validate constraint "user_wishlist_items_user_id_fkey";

alter table "public"."quote_items" add constraint "quote_items_category_check" CHECK ((category = ANY (ARRAY['electronics'::text, 'clothing'::text, 'home'::text, 'other'::text]))) not valid;

alter table "public"."quote_items" validate constraint "quote_items_category_check";

alter table "public"."quotes" add constraint "quotes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."quotes" validate constraint "quotes_user_id_fkey";

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

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  PERFORM
    net.http_post(
      url := CONCAT(current_setting('app.settings.webhook_url'), '/functions/v1/handle-signup'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', CONCAT('Bearer ', current_setting('app.settings.service_role_key'))
      ),
      body := jsonb_build_object(
        'type', TG_OP,
        'record', row_to_json(NEW)
      )
    );
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

grant delete on table "public"."user_addresses" to "anon";

grant insert on table "public"."user_addresses" to "anon";

grant references on table "public"."user_addresses" to "anon";

grant select on table "public"."user_addresses" to "anon";

grant trigger on table "public"."user_addresses" to "anon";

grant truncate on table "public"."user_addresses" to "anon";

grant update on table "public"."user_addresses" to "anon";

grant delete on table "public"."user_addresses" to "authenticated";

grant insert on table "public"."user_addresses" to "authenticated";

grant references on table "public"."user_addresses" to "authenticated";

grant select on table "public"."user_addresses" to "authenticated";

grant trigger on table "public"."user_addresses" to "authenticated";

grant truncate on table "public"."user_addresses" to "authenticated";

grant update on table "public"."user_addresses" to "authenticated";

grant delete on table "public"."user_addresses" to "service_role";

grant insert on table "public"."user_addresses" to "service_role";

grant references on table "public"."user_addresses" to "service_role";

grant select on table "public"."user_addresses" to "service_role";

grant trigger on table "public"."user_addresses" to "service_role";

grant truncate on table "public"."user_addresses" to "service_role";

grant update on table "public"."user_addresses" to "service_role";

grant delete on table "public"."user_roles" to "anon";

grant insert on table "public"."user_roles" to "anon";

grant references on table "public"."user_roles" to "anon";

grant select on table "public"."user_roles" to "anon";

grant trigger on table "public"."user_roles" to "anon";

grant truncate on table "public"."user_roles" to "anon";

grant update on table "public"."user_roles" to "anon";

grant delete on table "public"."user_roles" to "authenticated";

grant insert on table "public"."user_roles" to "authenticated";

grant references on table "public"."user_roles" to "authenticated";

grant select on table "public"."user_roles" to "authenticated";

grant trigger on table "public"."user_roles" to "authenticated";

grant truncate on table "public"."user_roles" to "authenticated";

grant update on table "public"."user_roles" to "authenticated";

grant delete on table "public"."user_roles" to "service_role";

grant insert on table "public"."user_roles" to "service_role";

grant references on table "public"."user_roles" to "service_role";

grant select on table "public"."user_roles" to "service_role";

grant trigger on table "public"."user_roles" to "service_role";

grant truncate on table "public"."user_roles" to "service_role";

grant update on table "public"."user_roles" to "service_role";

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


create policy "Admins can delete profiles"
on "public"."profiles"
as permissive
for delete
to public
using (is_admin());


create policy "Admins can update all profiles"
on "public"."profiles"
as permissive
for update
to public
using (is_admin())
with check (is_admin());


create policy "Admins can view all profiles"
on "public"."profiles"
as permissive
for select
to public
using (is_admin());


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


create policy "Users can update their own profile"
on "public"."profiles"
as permissive
for update
to public
using ((auth.uid() = id))
with check ((auth.uid() = id));


create policy "Users can update their own profile."
on "public"."profiles"
as permissive
for update
to public
using ((auth.uid() = id));


create policy "Users can view their own profile"
on "public"."profiles"
as permissive
for select
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


create policy "Users can delete their own addresses"
on "public"."user_addresses"
as permissive
for delete
to public
using ((auth.uid() = user_id));


create policy "Users can insert their own addresses"
on "public"."user_addresses"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


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


create policy "Users can update their own addresses"
on "public"."user_addresses"
as permissive
for update
to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));


create policy "Users can view their own addresses"
on "public"."user_addresses"
as permissive
for select
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


create policy "Users can view their own roles"
on "public"."user_roles"
as permissive
for select
to public
using ((auth.uid() = user_id));


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


