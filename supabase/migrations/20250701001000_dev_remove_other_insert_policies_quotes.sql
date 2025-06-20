-- DEV ONLY: Remove all other insert policies on public.quotes except the dev one
DROP POLICY IF EXISTS "Users and guests can create quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can insert quotes." ON public.quotes; 