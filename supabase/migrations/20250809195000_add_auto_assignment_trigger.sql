-- Add auto-assignment trigger to support_system table
-- This ensures tickets get auto-assigned regardless of creation method

CREATE OR REPLACE FUNCTION trigger_auto_assignment()
RETURNS TRIGGER AS $$
DECLARE
    v_matched_rule RECORD;
    v_assigned_user_id UUID;
    v_ticket_data JSONB := NEW.ticket_data;
    v_priority TEXT := v_ticket_data->>'priority';
    v_category TEXT := v_ticket_data->>'category';
BEGIN
    -- Only process ticket insertions that don't already have an assigned_to
    IF NEW.system_type = 'ticket' AND (v_ticket_data->>'assigned_to' IS NULL OR v_ticket_data->>'assigned_to' = '') THEN
        
        -- Find the highest priority matching rule
        SELECT * INTO v_matched_rule
        FROM support_assignment_rules 
        WHERE is_active = true
          AND (
            -- Check priority criteria
            (criteria->>'priority' IS NULL OR 
             criteria->'priority' @> to_jsonb(v_priority))
            AND
            -- Check category criteria  
            (criteria->>'category' IS NULL OR 
             criteria->'category' @> to_jsonb(v_category))
          )
        ORDER BY priority DESC
        LIMIT 1;
        
        -- If we found a matching rule and it has eligible users
        IF v_matched_rule.id IS NOT NULL AND array_length(v_matched_rule.eligible_user_ids, 1) > 0 THEN
            
            -- For now, just pick the first eligible user (round robin/least assigned logic would be more complex)
            v_assigned_user_id := v_matched_rule.eligible_user_ids[1];
            
            -- Update the ticket_data with assignment
            NEW.ticket_data := jsonb_set(
                NEW.ticket_data,
                '{assigned_to}',
                to_jsonb(v_assigned_user_id::TEXT)
            );
            
            -- Update assignment count for the rule
            UPDATE support_assignment_rules 
            SET 
                assignment_count = assignment_count + 1,
                last_assigned_user_id = v_assigned_user_id,
                updated_at = NOW()
            WHERE id = v_matched_rule.id;
            
            -- Log the auto-assignment
            RAISE NOTICE 'Auto-assigned ticket % to user % using rule %', 
                NEW.id, v_assigned_user_id, v_matched_rule.name;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS auto_assign_tickets ON support_system;
CREATE TRIGGER auto_assign_tickets
    BEFORE INSERT ON support_system
    FOR EACH ROW
    EXECUTE FUNCTION trigger_auto_assignment();

-- Test the trigger by creating a new ticket
COMMENT ON FUNCTION trigger_auto_assignment() IS 'Automatically assigns tickets to users based on assignment rules';