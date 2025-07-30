-- Drop user_activity_analytics table and related objects
-- This table was used for tracking user behavior but is no longer needed

BEGIN;

-- Drop functions that use the table
DROP FUNCTION IF EXISTS get_user_activity_summary(uuid);
DROP FUNCTION IF EXISTS cleanup_old_activity_data();

-- Drop policies
DROP POLICY IF EXISTS "Users can view own activity" ON user_activity_analytics;
DROP POLICY IF EXISTS "Users can insert own activity" ON user_activity_analytics;
DROP POLICY IF EXISTS "Admins can manage all activity" ON user_activity_analytics;

-- Drop indexes
DROP INDEX IF EXISTS idx_user_activity_analytics_user_id;
DROP INDEX IF EXISTS idx_user_activity_analytics_type;
DROP INDEX IF EXISTS idx_user_activity_analytics_created_at;

-- Drop the table
DROP TABLE IF EXISTS user_activity_analytics CASCADE;

-- Log the removal
DO $$
BEGIN
    RAISE NOTICE 'Successfully removed user_activity_analytics table and related objects';
END $$;

COMMIT;