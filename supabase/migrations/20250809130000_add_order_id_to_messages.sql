-- Migration: Add order_id column to messages table for payment proof tracking
-- This allows payment proof messages to be linked to both quotes and orders

BEGIN;

-- Add order_id column to messages table
ALTER TABLE public.messages 
ADD COLUMN order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE;

-- Add index for performance on order_id lookups
CREATE INDEX IF NOT EXISTS idx_messages_order_id ON public.messages (order_id);

-- Add composite index for order payment proof lookups (similar to existing quote index)
CREATE INDEX IF NOT EXISTS idx_messages_order_payment_proof 
ON public.messages (order_id, message_type) 
WHERE message_type = 'payment_proof';

-- Update RLS policies if needed (existing policies should work since they check sender/recipient)
-- The existing policies should cover this new column automatically

COMMIT;