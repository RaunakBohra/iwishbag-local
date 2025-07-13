-- Fix status configuration in system_settings
-- This migration fixes the showsInQuotesList and showsInOrdersList properties

-- First, let's fix the quote statuses configuration
UPDATE system_settings 
SET setting_value = jsonb_set(
  setting_value::jsonb,
  '{0,showsInQuotesList}',
  'true'::jsonb
) 
WHERE setting_key = 'quote_statuses' 
AND setting_value::jsonb->0->>'name' = 'pending';

UPDATE system_settings 
SET setting_value = jsonb_set(
  setting_value::jsonb,
  '{1,showsInQuotesList}',
  'true'::jsonb
) 
WHERE setting_key = 'quote_statuses' 
AND setting_value::jsonb->1->>'name' = 'sent';

UPDATE system_settings 
SET setting_value = jsonb_set(
  setting_value::jsonb,
  '{2,showsInQuotesList}',
  'true'::jsonb
) 
WHERE setting_key = 'quote_statuses' 
AND setting_value::jsonb->2->>'name' = 'approved';

UPDATE system_settings 
SET setting_value = jsonb_set(
  setting_value::jsonb,
  '{3,showsInQuotesList}',
  'true'::jsonb
) 
WHERE setting_key = 'quote_statuses' 
AND setting_value::jsonb->3->>'name' = 'rejected';

UPDATE system_settings 
SET setting_value = jsonb_set(
  setting_value::jsonb,
  '{4,showsInQuotesList}',
  'true'::jsonb
) 
WHERE setting_key = 'quote_statuses' 
AND setting_value::jsonb->4->>'name' = 'expired';

UPDATE system_settings 
SET setting_value = jsonb_set(
  setting_value::jsonb,
  '{5,showsInQuotesList}',
  'true'::jsonb
) 
WHERE setting_key = 'quote_statuses' 
AND setting_value::jsonb->5->>'name' = 'calculated';

-- Now fix the order statuses configuration
-- Set payment pending to show in orders list (currently false, should be true)
UPDATE system_settings 
SET setting_value = jsonb_set(
  setting_value::jsonb,
  '{0,showsInOrdersList}',
  'true'::jsonb
) 
WHERE setting_key = 'order_statuses' 
AND setting_value::jsonb->0->>'name' = 'payment pending';

-- Also fix the name inconsistency: change "payment pending" to "payment_pending"
UPDATE system_settings 
SET setting_value = jsonb_set(
  jsonb_set(
    setting_value::jsonb,
    '{0,name}',
    '"payment_pending"'::jsonb
  ),
  '{0,id}',
  '"payment_pending"'::jsonb
) 
WHERE setting_key = 'order_statuses' 
AND setting_value::jsonb->0->>'name' = 'payment pending';

-- Fix the actual quote status in the database to use the correct name
UPDATE quotes 
SET status = 'payment_pending' 
WHERE status = 'payment pending';

-- Also update the other direction in case there are any
UPDATE quotes 
SET status = 'payment_pending' 
WHERE status = 'payment pending';