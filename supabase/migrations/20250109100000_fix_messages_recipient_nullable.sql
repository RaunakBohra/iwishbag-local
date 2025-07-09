-- Make recipient_id nullable in messages table
-- This allows for admin-to-general messages where recipient_id is null

ALTER TABLE public.messages 
ALTER COLUMN recipient_id DROP NOT NULL;

-- Add comment explaining the nullable recipient_id
COMMENT ON COLUMN public.messages.recipient_id IS 'User ID of the recipient. NULL for broadcast/general messages from admin.';