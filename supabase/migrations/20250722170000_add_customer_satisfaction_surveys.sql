-- Migration: Add Customer Satisfaction Surveys
-- This migration creates the customer satisfaction survey system for ticket resolution feedback

-- ============================================================================
-- Step 1: Create Customer Satisfaction Surveys Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS customer_satisfaction_surveys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Ratings (1-5 scale)
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    experience_rating INTEGER NOT NULL CHECK (experience_rating >= 1 AND experience_rating <= 5),
    response_time_rating INTEGER NOT NULL CHECK (response_time_rating >= 1 AND response_time_rating <= 5),
    resolution_rating INTEGER NOT NULL CHECK (resolution_rating >= 1 AND resolution_rating <= 5),
    
    -- Recommendation
    would_recommend BOOLEAN NOT NULL DEFAULT true,
    
    -- Feedback text
    feedback TEXT,
    additional_comments TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT unique_survey_per_ticket UNIQUE (ticket_id),
    CONSTRAINT valid_feedback_length CHECK (LENGTH(feedback) <= 500),
    CONSTRAINT valid_comments_length CHECK (LENGTH(additional_comments) <= 1000)
);

-- ============================================================================
-- Step 2: Create Indexes for Performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_customer_satisfaction_surveys_ticket_id ON customer_satisfaction_surveys(ticket_id);
CREATE INDEX IF NOT EXISTS idx_customer_satisfaction_surveys_user_id ON customer_satisfaction_surveys(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_satisfaction_surveys_rating ON customer_satisfaction_surveys(rating);
CREATE INDEX IF NOT EXISTS idx_customer_satisfaction_surveys_created_at ON customer_satisfaction_surveys(created_at);
CREATE INDEX IF NOT EXISTS idx_customer_satisfaction_surveys_would_recommend ON customer_satisfaction_surveys(would_recommend);

-- Composite indexes for analytics
CREATE INDEX IF NOT EXISTS idx_customer_satisfaction_surveys_analytics ON customer_satisfaction_surveys(created_at, rating, would_recommend);

-- ============================================================================
-- Step 3: Create Triggers for Data Integrity
-- ============================================================================

-- Trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_satisfaction_survey_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customer_satisfaction_surveys_updated_at
    BEFORE UPDATE ON customer_satisfaction_surveys
    FOR EACH ROW
    EXECUTE FUNCTION update_satisfaction_survey_updated_at();

-- Trigger to set user_id from ticket data if not provided
CREATE OR REPLACE FUNCTION set_survey_user_id()
RETURNS TRIGGER AS $$
BEGIN
    -- If user_id is not set, try to get it from the related ticket
    IF NEW.user_id IS NULL THEN
        SELECT user_id INTO NEW.user_id
        FROM support_system 
        WHERE id = NEW.ticket_id AND system_type = 'ticket';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_customer_satisfaction_survey_user_id
    BEFORE INSERT ON customer_satisfaction_surveys
    FOR EACH ROW
    EXECUTE FUNCTION set_survey_user_id();

-- ============================================================================
-- Step 4: Create RLS Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE customer_satisfaction_surveys ENABLE ROW LEVEL SECURITY;

-- Create policies conditionally
DO $$
BEGIN
    -- Users can view their own surveys
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'customer_satisfaction_surveys' 
        AND policyname = 'Users can view their own satisfaction surveys'
    ) THEN
        CREATE POLICY "Users can view their own satisfaction surveys" ON customer_satisfaction_surveys
            FOR SELECT USING (user_id = auth.uid());
    END IF;

    -- Users can create surveys for their own tickets
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'customer_satisfaction_surveys' 
        AND policyname = 'Users can create satisfaction surveys for their tickets'
    ) THEN
        CREATE POLICY "Users can create satisfaction surveys for their tickets" ON customer_satisfaction_surveys
            FOR INSERT WITH CHECK (
                user_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM support_system 
                    WHERE id = customer_satisfaction_surveys.ticket_id 
                    AND user_id = auth.uid()
                    AND system_type = 'ticket'
                )
            );
    END IF;

    -- Users can update their own surveys (within reasonable time limit)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'customer_satisfaction_surveys' 
        AND policyname = 'Users can update their own satisfaction surveys'
    ) THEN
        CREATE POLICY "Users can update their own satisfaction surveys" ON customer_satisfaction_surveys
            FOR UPDATE USING (
                user_id = auth.uid() AND
                created_at > (now() - interval '24 hours') -- Allow updates within 24 hours
            ) WITH CHECK (user_id = auth.uid());
    END IF;

    -- Admins can view all surveys
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'customer_satisfaction_surveys' 
        AND policyname = 'Admins can view all satisfaction surveys'
    ) THEN
        CREATE POLICY "Admins can view all satisfaction surveys" ON customer_satisfaction_surveys
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM user_roles 
                    WHERE user_id = auth.uid() AND role = 'admin'
                )
            );
    END IF;
END $$;

-- ============================================================================
-- Step 5: Create Helper Functions for Analytics
-- ============================================================================

-- Function to get survey statistics
CREATE OR REPLACE FUNCTION get_survey_statistics(
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL,
    p_category TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    survey_data RECORD;
BEGIN
    -- Build dynamic query for survey statistics
    SELECT 
        COUNT(*) as total_surveys,
        AVG(rating) as average_rating,
        AVG(experience_rating) as average_experience_rating,
        AVG(response_time_rating) as average_response_time_rating,
        AVG(resolution_rating) as average_resolution_rating,
        (COUNT(*) FILTER (WHERE would_recommend = true))::FLOAT / COUNT(*) * 100 as recommendation_percentage,
        jsonb_build_object(
            '1', COUNT(*) FILTER (WHERE rating = 1),
            '2', COUNT(*) FILTER (WHERE rating = 2),
            '3', COUNT(*) FILTER (WHERE rating = 3),
            '4', COUNT(*) FILTER (WHERE rating = 4),
            '5', COUNT(*) FILTER (WHERE rating = 5)
        ) as rating_distribution
    INTO survey_data
    FROM customer_satisfaction_surveys css
    WHERE 
        (p_start_date IS NULL OR css.created_at >= p_start_date) AND
        (p_end_date IS NULL OR css.created_at <= p_end_date);
    
    -- Build result JSON
    result := jsonb_build_object(
        'totalSurveys', COALESCE(survey_data.total_surveys, 0),
        'averageRating', ROUND(COALESCE(survey_data.average_rating, 0)::numeric, 2),
        'averageExperienceRating', ROUND(COALESCE(survey_data.average_experience_rating, 0)::numeric, 2),
        'averageResponseTimeRating', ROUND(COALESCE(survey_data.average_response_time_rating, 0)::numeric, 2),
        'averageResolutionRating', ROUND(COALESCE(survey_data.average_resolution_rating, 0)::numeric, 2),
        'recommendationPercentage', ROUND(COALESCE(survey_data.recommendation_percentage, 0)::numeric, 2),
        'ratingDistribution', COALESCE(survey_data.rating_distribution, '{"1":0,"2":0,"3":0,"4":0,"5":0}'::jsonb)
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get recent feedback
CREATE OR REPLACE FUNCTION get_recent_survey_feedback(
    p_limit INTEGER DEFAULT 10,
    p_min_rating INTEGER DEFAULT 1
)
RETURNS TABLE(
    id UUID,
    ticket_id UUID,
    rating INTEGER,
    feedback TEXT,
    additional_comments TEXT,
    would_recommend BOOLEAN,
    created_at TIMESTAMPTZ,
    ticket_subject TEXT,
    customer_email TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        css.id,
        css.ticket_id,
        css.rating,
        css.feedback,
        css.additional_comments,
        css.would_recommend,
        css.created_at,
        (ss.ticket_data->>'subject')::TEXT as ticket_subject,
        COALESCE(
            ss.quote->'customer_data'->'info'->>'email',
            p.email
        )::TEXT as customer_email
    FROM customer_satisfaction_surveys css
    LEFT JOIN support_system ss ON ss.id = css.ticket_id AND ss.system_type = 'ticket'
    LEFT JOIN profiles p ON p.id = css.user_id
    WHERE css.rating >= p_min_rating
    AND (css.feedback IS NOT NULL OR css.additional_comments IS NOT NULL)
    ORDER BY css.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Step 6: Create Views for Reporting
-- ============================================================================

-- View for survey analytics
CREATE OR REPLACE VIEW survey_analytics_view AS
SELECT 
    css.*,
    (ss.ticket_data->>'subject') as ticket_subject,
    (ss.ticket_data->>'category') as ticket_category,
    (ss.ticket_data->>'priority') as ticket_priority,
    ss.created_at as ticket_created_at,
    ss.updated_at as ticket_updated_at,
    p.email as customer_email,
    p.full_name as customer_name,
    EXTRACT(EPOCH FROM (css.created_at - ss.created_at)) / 3600 as resolution_hours
FROM customer_satisfaction_surveys css
LEFT JOIN support_system ss ON ss.id = css.ticket_id AND ss.system_type = 'ticket'
LEFT JOIN profiles p ON p.id = css.user_id;

-- ============================================================================
-- Step 7: Add Comments for Documentation
-- ============================================================================

COMMENT ON TABLE customer_satisfaction_surveys IS 'Customer satisfaction surveys for resolved support tickets';
COMMENT ON COLUMN customer_satisfaction_surveys.rating IS 'Overall satisfaction rating (1-5 stars)';
COMMENT ON COLUMN customer_satisfaction_surveys.experience_rating IS 'Support experience quality rating (1-5 stars)';
COMMENT ON COLUMN customer_satisfaction_surveys.response_time_rating IS 'Response time satisfaction rating (1-5 stars)';
COMMENT ON COLUMN customer_satisfaction_surveys.resolution_rating IS 'Issue resolution quality rating (1-5 stars)';
COMMENT ON COLUMN customer_satisfaction_surveys.would_recommend IS 'Whether customer would recommend iwishBag to others';
COMMENT ON COLUMN customer_satisfaction_surveys.feedback IS 'Positive feedback about the support experience (max 500 chars)';
COMMENT ON COLUMN customer_satisfaction_surveys.additional_comments IS 'Improvement suggestions and additional comments (max 1000 chars)';

COMMENT ON FUNCTION get_survey_statistics IS 'Get aggregated survey statistics for admin dashboard';
COMMENT ON FUNCTION get_recent_survey_feedback IS 'Get recent survey feedback with customer and ticket details';
COMMENT ON VIEW survey_analytics_view IS 'Comprehensive view combining survey data with ticket and customer information';