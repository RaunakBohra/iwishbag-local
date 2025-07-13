-- Create the missing trigger that automatically calculates amount_paid from payment_records
-- This is essential for payment verification to work correctly

-- Function to calculate and update quote payment totals
CREATE OR REPLACE FUNCTION update_quote_payment_totals()
RETURNS TRIGGER AS $$
DECLARE
    total_paid DECIMAL(15,4);
    quote_total DECIMAL(15,4);
    new_payment_status TEXT;
    quote_record RECORD;
BEGIN
    -- Get the quote_id from the affected record
    IF TG_OP = 'DELETE' THEN
        -- For DELETE operations, use OLD record
        -- Calculate total payments for this quote (excluding the deleted record)
        SELECT COALESCE(SUM(amount), 0) INTO total_paid
        FROM payment_records 
        WHERE quote_id = OLD.quote_id AND id != OLD.id;
        
        -- Get quote details
        SELECT * INTO quote_record FROM quotes WHERE id = OLD.quote_id;
    ELSE
        -- For INSERT and UPDATE operations, use NEW record
        -- Calculate total payments for this quote
        SELECT COALESCE(SUM(amount), 0) INTO total_paid
        FROM payment_records 
        WHERE quote_id = NEW.quote_id;
        
        -- Get quote details
        SELECT * INTO quote_record FROM quotes WHERE id = NEW.quote_id;
    END IF;
    
    IF NOT FOUND THEN
        RAISE NOTICE 'Quote not found for payment record';
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    quote_total := quote_record.final_total;
    
    -- Determine payment status based on amount paid vs total
    IF total_paid <= 0 THEN
        new_payment_status := 'unpaid';
    ELSIF total_paid >= quote_total THEN
        -- Check if overpaid (with small tolerance for floating point precision)
        IF total_paid > quote_total + 0.01 THEN
            new_payment_status := 'overpaid';
        ELSE
            new_payment_status := 'paid';
        END IF;
    ELSE
        new_payment_status := 'partial';
    END IF;
    
    -- Update the quote with calculated values
    UPDATE quotes 
    SET 
        amount_paid = total_paid,
        payment_status = new_payment_status,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.quote_id, OLD.quote_id);
    
    RAISE NOTICE 'Updated quote % - amount_paid: %, payment_status: %', 
        COALESCE(NEW.quote_id, OLD.quote_id), total_paid, new_payment_status;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for payment_records table
-- These will automatically update amount_paid when payment_records change

-- Trigger for INSERT (new payment records)
CREATE TRIGGER trigger_payment_records_insert
    AFTER INSERT ON payment_records
    FOR EACH ROW
    EXECUTE FUNCTION update_quote_payment_totals();

-- Trigger for UPDATE (modified payment records)
CREATE TRIGGER trigger_payment_records_update
    AFTER UPDATE ON payment_records
    FOR EACH ROW
    EXECUTE FUNCTION update_quote_payment_totals();

-- Trigger for DELETE (removed payment records)
CREATE TRIGGER trigger_payment_records_delete
    AFTER DELETE ON payment_records
    FOR EACH ROW
    EXECUTE FUNCTION update_quote_payment_totals();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_quote_payment_totals TO authenticated;

-- Test the trigger by updating existing payment records (if any exist)
-- This will recalculate amount_paid for all quotes with payment records
DO $$
DECLARE
    quote_rec RECORD;
    total_paid DECIMAL(15,4);
    new_status TEXT;
BEGIN
    FOR quote_rec IN 
        SELECT DISTINCT q.id, q.final_total
        FROM quotes q 
        INNER JOIN payment_records pr ON q.id = pr.quote_id
    LOOP
        -- Calculate total for this quote
        SELECT COALESCE(SUM(amount), 0) INTO total_paid
        FROM payment_records 
        WHERE quote_id = quote_rec.id;
        
        -- Determine status
        IF total_paid <= 0 THEN
            new_status := 'unpaid';
        ELSIF total_paid >= quote_rec.final_total THEN
            IF total_paid > quote_rec.final_total + 0.01 THEN
                new_status := 'overpaid';
            ELSE
                new_status := 'paid';
            END IF;
        ELSE
            new_status := 'partial';
        END IF;
        
        -- Update the quote
        UPDATE quotes 
        SET 
            amount_paid = total_paid,
            payment_status = new_status,
            updated_at = NOW()
        WHERE id = quote_rec.id;
        
        RAISE NOTICE 'Recalculated quote % - amount_paid: %, payment_status: %', 
            quote_rec.id, total_paid, new_status;
    END LOOP;
END $$;

-- Add comment
COMMENT ON FUNCTION update_quote_payment_totals IS 'Automatically calculates and updates quote amount_paid and payment_status based on payment_records';