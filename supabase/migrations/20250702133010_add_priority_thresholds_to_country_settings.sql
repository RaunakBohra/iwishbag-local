-- Add a priority_thresholds column to country_settings for per-country priority amount thresholds
ALTER TABLE country_settings
ADD COLUMN priority_thresholds JSONB DEFAULT '{"low":0,"normal":500,"urgent":2000}';

-- (Optional) Add a comment for clarity
COMMENT ON COLUMN country_settings.priority_thresholds IS 'JSON object mapping priority levels (low, normal, urgent) to amount thresholds in the country''s main currency.'; 