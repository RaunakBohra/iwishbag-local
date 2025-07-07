-- Add fields to support temporary account functionality
-- These fields help track the guest-to-account conversion process

-- Add temporary account fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN is_temporary BOOLEAN DEFAULT FALSE,
ADD COLUMN created_via TEXT, -- 'guest_cart', 'guest_approval', etc.
ADD COLUMN temp_account_created_at TIMESTAMPTZ;

-- Add temporary account tracking to quotes table  
ALTER TABLE public.quotes
ADD COLUMN temp_account_created_at TIMESTAMPTZ;

-- Create index for efficient temp account queries
CREATE INDEX idx_profiles_temp_accounts ON public.profiles(email, is_temporary) WHERE is_temporary = true;