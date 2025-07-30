-- Create RLS policies for user_roles table

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

-- Policy: Users can view their own roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Admins can view all roles
CREATE POLICY "Admins can view all roles" ON public.user_roles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role = 'admin'
            AND is_active = true
        )
    );

-- Policy: Admins can insert new roles
CREATE POLICY "Admins can insert roles" ON public.user_roles
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role = 'admin'
            AND is_active = true
        )
    );

-- Policy: Admins can update roles
CREATE POLICY "Admins can update roles" ON public.user_roles
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role = 'admin'
            AND is_active = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role = 'admin'
            AND is_active = true
        )
    );

-- Policy: Admins can delete roles (except their own admin role)
CREATE POLICY "Admins can delete roles" ON public.user_roles
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role = 'admin'
            AND is_active = true
        )
        AND NOT (user_id = auth.uid() AND role = 'admin') -- Prevent admins from removing their own admin role
    );

-- Summary of user roles
SELECT 
    role,
    COUNT(*) as count,
    STRING_AGG(COALESCE(au.email, 'No email'), ', ') as users
FROM public.user_roles ur
LEFT JOIN auth.users au ON ur.user_id = au.id
WHERE ur.is_active = true
GROUP BY role
ORDER BY role;