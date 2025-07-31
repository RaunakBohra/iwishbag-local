-- Fix user_roles table foreign key constraints to enable user deletion
-- This migration updates foreign key constraints from NO ACTION to CASCADE

-- Drop existing foreign key constraints
ALTER TABLE IF EXISTS public.user_roles 
    DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey,
    DROP CONSTRAINT IF EXISTS user_roles_granted_by_fkey,
    DROP CONSTRAINT IF EXISTS user_roles_created_by_fkey;

-- Re-add foreign key constraints with CASCADE deletion
ALTER TABLE public.user_roles 
    ADD CONSTRAINT user_roles_user_id_fkey 
        FOREIGN KEY (user_id) 
        REFERENCES auth.users(id) 
        ON DELETE CASCADE,
    ADD CONSTRAINT user_roles_granted_by_fkey 
        FOREIGN KEY (granted_by) 
        REFERENCES auth.users(id) 
        ON DELETE SET NULL,
    ADD CONSTRAINT user_roles_created_by_fkey 
        FOREIGN KEY (created_by) 
        REFERENCES auth.users(id) 
        ON DELETE SET NULL;

-- Also fix other tables with NO ACTION constraints
ALTER TABLE IF EXISTS public.manual_analysis_tasks 
    DROP CONSTRAINT IF EXISTS manual_analysis_tasks_assigned_to_fkey,
    ADD CONSTRAINT manual_analysis_tasks_assigned_to_fkey 
        FOREIGN KEY (assigned_to) 
        REFERENCES auth.users(id) 
        ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.share_audit_log 
    DROP CONSTRAINT IF EXISTS share_audit_log_user_id_fkey,
    ADD CONSTRAINT share_audit_log_user_id_fkey 
        FOREIGN KEY (user_id) 
        REFERENCES auth.users(id) 
        ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.support_interactions 
    DROP CONSTRAINT IF EXISTS support_interactions_user_id_fkey,
    ADD CONSTRAINT support_interactions_user_id_fkey 
        FOREIGN KEY (user_id) 
        REFERENCES auth.users(id) 
        ON DELETE CASCADE;

-- Add comment explaining the changes
COMMENT ON TABLE public.user_roles IS 'User role assignments with CASCADE deletion support to allow user account deletion';