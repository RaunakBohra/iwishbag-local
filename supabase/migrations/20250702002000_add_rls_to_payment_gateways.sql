CREATE POLICY "Allow authenticated users to read payment gateways"
ON public.payment_gateways
FOR SELECT
TO authenticated
USING (true); 