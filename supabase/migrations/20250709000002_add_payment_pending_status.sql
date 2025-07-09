-- Add payment_pending status to default order statuses
-- This migration adds the payment_pending status for bank transfer orders

-- First, let's check if we already have status settings
DO $$
DECLARE
  current_order_statuses jsonb;
  new_order_statuses jsonb;
BEGIN
  -- Get current order statuses
  SELECT setting_value::jsonb INTO current_order_statuses
  FROM system_settings
  WHERE setting_key = 'order_statuses';

  -- If no order statuses exist, create default ones
  IF current_order_statuses IS NULL THEN
    current_order_statuses := '[]'::jsonb;
  END IF;

  -- Check if payment_pending already exists
  IF NOT EXISTS (
    SELECT 1 
    FROM jsonb_array_elements(current_order_statuses) elem
    WHERE elem->>'id' = 'payment_pending'
  ) THEN
    -- Create the new status object
    new_order_statuses := current_order_statuses || jsonb_build_array(
      jsonb_build_object(
        'id', 'payment_pending',
        'name', 'payment_pending',
        'label', 'Payment Pending',
        'description', 'Awaiting bank transfer payment confirmation',
        'color', 'secondary',
        'icon', 'Clock',
        'isActive', true,
        'order', 0,
        'allowedTransitions', '["paid", "cancelled"]'::jsonb,
        'isTerminal', false,
        'category', 'order',
        'triggersEmail', true,
        'emailTemplate', 'bank_transfer_pending',
        'requiresAction', true,
        'showsInQuotesList', false,
        'showsInOrdersList', true,
        'canBePaid', false
      )
    );

    -- Update the system settings
    INSERT INTO system_settings (setting_key, setting_value, created_at, updated_at)
    VALUES ('order_statuses', new_order_statuses::text, NOW(), NOW())
    ON CONFLICT (setting_key) DO UPDATE
    SET setting_value = EXCLUDED.setting_value,
        updated_at = NOW();
  END IF;
END $$;