-- Create customer satisfaction surveys table
-- This table stores customer feedback surveys for resolved support tickets

CREATE TABLE IF NOT EXISTS customer_satisfaction_surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    experience_rating INTEGER NOT NULL CHECK (experience_rating >= 1 AND experience_rating <= 5),
    response_time_rating INTEGER NOT NULL CHECK (response_time_rating >= 1 AND response_time_rating <= 5),
    resolution_rating INTEGER NOT NULL CHECK (resolution_rating >= 1 AND resolution_rating <= 5),
    would_recommend BOOLEAN NOT NULL DEFAULT false,
    additional_comments TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add foreign key constraint to support_system table (unified tickets)
-- Note: Using support_system instead of support_tickets as this is the unified table
ALTER TABLE customer_satisfaction_surveys 
ADD CONSTRAINT fk_customer_satisfaction_surveys_ticket_id 
FOREIGN KEY (ticket_id) REFERENCES support_system(id) ON DELETE CASCADE;

-- Create index for efficient lookups by ticket_id
CREATE INDEX IF NOT EXISTS idx_customer_satisfaction_surveys_ticket_id 
ON customer_satisfaction_surveys(ticket_id);

-- Create index for analytics queries by created_at
CREATE INDEX IF NOT EXISTS idx_customer_satisfaction_surveys_created_at 
ON customer_satisfaction_surveys(created_at);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_customer_satisfaction_surveys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_customer_satisfaction_surveys_updated_at
    BEFORE UPDATE ON customer_satisfaction_surveys
    FOR EACH ROW EXECUTE FUNCTION update_customer_satisfaction_surveys_updated_at();

-- Enable RLS
ALTER TABLE customer_satisfaction_surveys ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Customers can only view and create surveys for their own tickets
CREATE POLICY "Users can view their own satisfaction surveys" ON customer_satisfaction_surveys
    FOR SELECT USING (
        ticket_id IN (
            SELECT id FROM support_system 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create satisfaction surveys for their own tickets" ON customer_satisfaction_surveys
    FOR INSERT WITH CHECK (
        ticket_id IN (
            SELECT id FROM support_system 
            WHERE user_id = auth.uid()
        )
    );

-- Admins can view all surveys
CREATE POLICY "Admins can view all satisfaction surveys" ON customer_satisfaction_surveys
    FOR SELECT USING (is_admin());

-- Grant permissions
GRANT SELECT, INSERT ON customer_satisfaction_surveys TO authenticated;
GRANT ALL ON customer_satisfaction_surveys TO service_role;