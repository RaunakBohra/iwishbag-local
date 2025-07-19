-- Create messenger_sessions table for storing bot conversation state
CREATE TABLE IF NOT EXISTS public.messenger_sessions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id text NOT NULL UNIQUE,
    session_data jsonb NOT NULL DEFAULT '{}',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_messenger_sessions_sender_id ON public.messenger_sessions(sender_id);
CREATE INDEX IF NOT EXISTS idx_messenger_sessions_updated_at ON public.messenger_sessions(updated_at);

-- Enable RLS
ALTER TABLE public.messenger_sessions ENABLE ROW LEVEL SECURITY;

-- Create policy for service role access (for webhook)
CREATE POLICY "Service role can manage all sessions" ON public.messenger_sessions
    FOR ALL USING (true)
    WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.messenger_sessions TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;

-- Auto-cleanup old sessions (older than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM public.messenger_sessions 
    WHERE updated_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Optional: Set up automatic cleanup (uncomment if needed)
-- SELECT cron.schedule('cleanup-messenger-sessions', '0 */6 * * *', 'SELECT cleanup_old_sessions();');