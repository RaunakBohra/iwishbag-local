-- Add message_type field to messages table to distinguish different types of messages
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS message_type text DEFAULT 'general';

-- Add comment explaining message types
COMMENT ON COLUMN public.messages.message_type IS 'Type of message: general, payment_proof, support, etc.';

-- Create index for faster queries on message type
CREATE INDEX IF NOT EXISTS idx_messages_message_type ON public.messages(message_type);

-- Create index for payment proof messages specifically
CREATE INDEX IF NOT EXISTS idx_messages_payment_proof ON public.messages(quote_id, message_type) 
WHERE message_type = 'payment_proof';