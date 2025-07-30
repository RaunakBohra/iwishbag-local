-- Restore user_roles table and related system
-- This is critical for role-based access control

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role text DEFAULT 'user'::text NOT NULL,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    granted_by uuid,
    CONSTRAINT user_roles_role_check CHECK ((role = ANY (ARRAY['user'::text, 'moderator'::text, 'admin'::text])))
);

ALTER TABLE public.user_roles OWNER TO postgres;

-- Add primary key
ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);

-- Add unique constraint
ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);

-- Add foreign key constraints
ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_is_active ON public.user_roles USING btree (is_active);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles USING btree (role);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles USING btree (user_id);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create or replace the ensure_user_profile function
CREATE OR REPLACE FUNCTION public.ensure_user_profile(_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Check if profile exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id) THEN
    -- Create profile with default values
    INSERT INTO public.profiles (
      id, 
      full_name, 
      phone, 
      country, 
      preferred_display_currency, 
      referral_code
    )
    VALUES (
      _user_id,
      'User',
      NULL,
      NULL,
      NULL,
      'REF' || substr(md5(random()::text), 1, 8)
    );

    -- Create default user role (using text)
    INSERT INTO public.user_roles (user_id, role, created_by, is_active)
    VALUES (_user_id, 'user'::text, _user_id, true)
    ON CONFLICT (user_id, role) DO NOTHING;

    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- Create has_role function
CREATE OR REPLACE FUNCTION public.has_role(role_name text) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = role_name 
    AND is_active = true
  );
END;
$$;

-- Create is_admin function
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin' 
    AND is_active = true
  );
END;
$$;

-- Create is_authenticated function
CREATE OR REPLACE FUNCTION public.is_authenticated() RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$$;

-- Create update trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- Create trigger for updated_at on user_roles
CREATE TRIGGER update_user_roles_updated_at 
    BEFORE UPDATE ON public.user_roles 
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();

-- Grant permissions
GRANT ALL ON TABLE public.user_roles TO postgres;
GRANT ALL ON TABLE public.user_roles TO anon;
GRANT ALL ON TABLE public.user_roles TO authenticated;
GRANT ALL ON TABLE public.user_roles TO service_role;

-- Grant function permissions
GRANT ALL ON FUNCTION public.has_role(text) TO anon;
GRANT ALL ON FUNCTION public.has_role(text) TO authenticated;
GRANT ALL ON FUNCTION public.has_role(text) TO service_role;

GRANT ALL ON FUNCTION public.is_admin() TO anon;
GRANT ALL ON FUNCTION public.is_admin() TO authenticated;
GRANT ALL ON FUNCTION public.is_admin() TO service_role;

-- Insert default admin role for existing admin users if needed
-- This should be done carefully based on your requirements
-- Example: INSERT INTO public.user_roles (user_id, role) 
-- SELECT id, 'admin' FROM auth.users WHERE email = 'admin@example.com'
-- ON CONFLICT (user_id, role) DO NOTHING;