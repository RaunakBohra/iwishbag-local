-- Drop bank_statement_imports table and related constraints
-- This table was part of a payment reconciliation system that is not currently used

-- Drop the table (this will automatically drop all constraints and indexes)
DROP TABLE IF EXISTS public.bank_statement_imports CASCADE;

-- Remove any RLS policies if they exist
DROP POLICY IF EXISTS "Admin users can manage bank statement imports" ON public.bank_statement_imports;
DROP POLICY IF EXISTS "Users can view their own imports" ON public.bank_statement_imports;