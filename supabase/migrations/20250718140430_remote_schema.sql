alter table "public"."blog_comments" drop constraint "blog_comments_status_check";

alter table "public"."blog_posts" drop constraint "blog_posts_status_check";

alter table "public"."payment_error_logs" drop constraint "check_severity";

alter table "public"."payment_health_logs" drop constraint "check_overall_health";

alter table "public"."blog_comments" add constraint "blog_comments_status_check" CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'spam'::character varying])::text[]))) not valid;

alter table "public"."blog_comments" validate constraint "blog_comments_status_check";

alter table "public"."blog_posts" add constraint "blog_posts_status_check" CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'published'::character varying, 'archived'::character varying])::text[]))) not valid;

alter table "public"."blog_posts" validate constraint "blog_posts_status_check";

alter table "public"."payment_error_logs" add constraint "check_severity" CHECK (((severity)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'critical'::character varying])::text[]))) not valid;

alter table "public"."payment_error_logs" validate constraint "check_severity";

alter table "public"."payment_health_logs" add constraint "check_overall_health" CHECK (((overall_health)::text = ANY ((ARRAY['healthy'::character varying, 'warning'::character varying, 'critical'::character varying])::text[]))) not valid;

alter table "public"."payment_health_logs" validate constraint "check_overall_health";


