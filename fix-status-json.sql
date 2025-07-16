-- Fix the JSON parse error in order_statuses
-- The issue is with escaped exclamation marks in customerMessage fields

-- First, let's check the current status
SELECT id, name, config->>'customerMessage' as customer_message
FROM status_config
WHERE type = 'order'
AND config->>'customerMessage' LIKE '%\!%';

-- Fix the escaped exclamation marks
UPDATE status_config
SET config = jsonb_set(
    config,
    '{customerMessage}',
    to_jsonb(REPLACE(config->>'customerMessage', '\!', '!'))
)
WHERE type = 'order'
AND config->>'customerMessage' LIKE '%\!%';

-- Specifically fix the known problematic statuses
UPDATE status_config
SET config = jsonb_set(
    config,
    '{customerMessage}',
    '"Your order is on the way!"'::jsonb
)
WHERE type = 'order'
AND name = 'shipped';

UPDATE status_config
SET config = jsonb_set(
    config,
    '{customerMessage}',
    '"Order completed successfully!"'::jsonb
)
WHERE type = 'order'
AND name = 'completed';

-- Verify the fix
SELECT id, name, config->>'customerMessage' as customer_message
FROM status_config
WHERE type = 'order'
AND name IN ('shipped', 'completed');