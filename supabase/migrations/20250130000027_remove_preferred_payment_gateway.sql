-- Remove preferred_payment_gateway column from profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS preferred_payment_gateway;