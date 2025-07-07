-- Add guest_email field to quotes table for guest approval workflow
-- This allows guests to approve/reject quotes without creating an account initially

ALTER TABLE public.quotes 
ADD COLUMN guest_email TEXT;