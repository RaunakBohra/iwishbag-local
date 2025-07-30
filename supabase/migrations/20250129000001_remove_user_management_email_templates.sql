-- Drop email_templates table and related objects
DROP TABLE IF EXISTS public.email_templates CASCADE;

-- Drop user_roles table and related objects
DROP TABLE IF EXISTS public.user_roles CASCADE;

-- Drop any functions related to user roles
DROP FUNCTION IF EXISTS public.get_user_roles_new(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_permissions_new(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.has_role(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_all_users_with_roles() CASCADE;
DROP FUNCTION IF EXISTS public.update_user_roles(UUID, INTEGER[]) CASCADE;
DROP FUNCTION IF EXISTS public.get_role_with_permissions(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.update_role_permissions(INTEGER, INTEGER[]) CASCADE;

-- Drop any RLS policies that might depend on these functions
DROP POLICY IF EXISTS "Admin can view all email templates" ON public.email_templates;
DROP POLICY IF EXISTS "Admin can manage email templates" ON public.email_templates;

-- Note: If there are roles and permissions tables, they might be needed by other parts of the system
-- Only drop them if you're sure they're not used elsewhere