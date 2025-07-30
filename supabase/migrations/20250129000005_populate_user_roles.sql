-- Populate user_roles table with proper data

-- First, ensure all existing users have profiles and default roles
DO $$
DECLARE
    user_record RECORD;
BEGIN
    -- Loop through all users in auth.users
    FOR user_record IN SELECT id, email FROM auth.users
    LOOP
        -- Create profile if it doesn't exist
        PERFORM public.ensure_user_profile(user_record.id);
        
        -- The ensure_user_profile function already creates a default 'user' role
        -- So we just need to handle special cases
    END LOOP;
END $$;

-- Assign admin role to specific users
-- Update this with your admin email addresses
INSERT INTO public.user_roles (user_id, role, is_active, created_by, granted_by)
SELECT 
    id as user_id,
    'admin'::text as role,
    true as is_active,
    id as created_by,
    id as granted_by
FROM auth.users
WHERE email IN (
    'rnkbohra@gmail.com',  -- Add your admin emails here
    'iwbtracking@gmail.com'
)
ON CONFLICT (user_id, role) DO UPDATE
SET is_active = true,
    updated_at = now();

-- Optionally, add moderator roles for specific users
-- INSERT INTO public.user_roles (user_id, role, is_active, created_by, granted_by)
-- SELECT 
--     id as user_id,
--     'moderator'::text as role,
--     true as is_active,
--     id as created_by,
--     id as granted_by
-- FROM auth.users
-- WHERE email IN (
--     'moderator1@example.com',
--     'moderator2@example.com'
-- )
-- ON CONFLICT (user_id, role) DO NOTHING;

-- Verify the data
DO $$
DECLARE
    role_count INTEGER;
    admin_count INTEGER;
    user_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO role_count FROM public.user_roles;
    SELECT COUNT(*) INTO admin_count FROM public.user_roles WHERE role = 'admin';
    SELECT COUNT(*) INTO user_count FROM public.user_roles WHERE role = 'user';
    
    RAISE NOTICE 'Total roles created: %', role_count;
    RAISE NOTICE 'Admin roles: %', admin_count;
    RAISE NOTICE 'User roles: %', user_count;
END $$;

-- Show the current state
SELECT 
    ur.user_id,
    au.email,
    ur.role,
    ur.is_active,
    ur.created_at
FROM public.user_roles ur
JOIN auth.users au ON ur.user_id = au.id
ORDER BY ur.role, au.email;