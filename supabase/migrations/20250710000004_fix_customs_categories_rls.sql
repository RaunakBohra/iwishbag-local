-- Fix customs_categories RLS to match shipping_routes
DROP POLICY IF EXISTS "Enable admin full access to customs_categories" ON public.customs_categories;

CREATE POLICY "Enable admin full access to customs_categories" ON public.customs_categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  ); 