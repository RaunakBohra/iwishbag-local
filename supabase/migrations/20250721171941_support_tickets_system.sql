-- Add support ticket system tables
-- This migration adds customer support functionality to iwishBag

-- Check if tables exist first to avoid conflicts
DO $$ 
BEGIN
    -- Create support_tickets table if it doesn't exist
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'support_tickets') THEN
        CREATE TABLE support_tickets (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
            subject VARCHAR(200) NOT NULL,
            description TEXT NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
            priority VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
            category VARCHAR(50) DEFAULT 'general' CHECK (category IN ('general', 'payment', 'shipping', 'customs', 'refund', 'product', 'technical')),
            assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
        );
    END IF;

    -- Create ticket_replies table if it doesn't exist
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ticket_replies') THEN
        CREATE TABLE ticket_replies (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            message TEXT NOT NULL,
            is_internal BOOLEAN DEFAULT false NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
        );
    END IF;
END $$;

-- Add indexes for performance (with IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_replies_ticket_id ON ticket_replies(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_replies_created_at ON ticket_replies(created_at ASC);

-- Create function to update updated_at timestamp (replace if exists)
CREATE OR REPLACE FUNCTION update_support_ticket_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at (drop if exists first)
DROP TRIGGER IF EXISTS trigger_update_support_ticket_updated_at ON support_tickets;
CREATE TRIGGER trigger_update_support_ticket_updated_at
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_support_ticket_updated_at();

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_replies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support_tickets (drop existing policies first to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own tickets or admins can view all" ON support_tickets;
CREATE POLICY "Users can view own tickets or admins can view all" ON support_tickets
    FOR SELECT USING (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "Users can create own tickets" ON support_tickets;
CREATE POLICY "Users can create own tickets" ON support_tickets
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own tickets or admins can update any" ON support_tickets;
CREATE POLICY "Users can update own tickets or admins can update any" ON support_tickets
    FOR UPDATE USING (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "Only admins can delete tickets" ON support_tickets;
CREATE POLICY "Only admins can delete tickets" ON support_tickets
    FOR DELETE USING (is_admin());

-- RLS Policies for ticket_replies (drop existing policies first to avoid conflicts)
DROP POLICY IF EXISTS "Users can view replies on own tickets or admins can view all" ON ticket_replies;
CREATE POLICY "Users can view replies on own tickets or admins can view all" ON ticket_replies
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM support_tickets 
            WHERE support_tickets.id = ticket_replies.ticket_id 
            AND (support_tickets.user_id = auth.uid() OR is_admin())
        )
        AND (NOT is_internal OR is_admin())
    );

DROP POLICY IF EXISTS "Users can create replies on own tickets or admins can create any" ON ticket_replies;
CREATE POLICY "Users can create replies on own tickets or admins can create any" ON ticket_replies
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM support_tickets 
            WHERE support_tickets.id = ticket_replies.ticket_id 
            AND (support_tickets.user_id = auth.uid() OR is_admin())
        )
    );

DROP POLICY IF EXISTS "Users can update own replies or admins can update any" ON ticket_replies;
CREATE POLICY "Users can update own replies or admins can update any" ON ticket_replies
    FOR UPDATE USING (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "Only admins can delete replies" ON ticket_replies;
CREATE POLICY "Only admins can delete replies" ON ticket_replies
    FOR DELETE USING (is_admin());