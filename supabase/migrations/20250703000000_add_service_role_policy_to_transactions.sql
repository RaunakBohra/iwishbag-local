CREATE POLICY "service_role_all_access_payment_transactions"
ON "public"."payment_transactions"
FOR ALL
USING (true)
WITH CHECK (true);
