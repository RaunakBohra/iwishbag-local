-- Add the working payment calculation triggers from cloud database
-- These are the exact functions that work in production

-- Function that calculates amount_paid and payment_status when quotes table is updated
CREATE OR REPLACE FUNCTION public.update_payment_status()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Calculate total paid from payment_records
  NEW.amount_paid := COALESCE((
    SELECT SUM(amount)
    FROM payment_records
    WHERE quote_id = NEW.id
  ), 0);

  -- Determine payment status
  IF NEW.amount_paid = 0 THEN
    NEW.payment_status := 'unpaid';
  ELSIF NEW.amount_paid < NEW.final_total THEN
    NEW.payment_status := 'partial';
  ELSIF NEW.amount_paid = NEW.final_total THEN
    NEW.payment_status := 'paid';
  ELSE
    NEW.payment_status := 'overpaid';
    NEW.overpayment_amount := NEW.amount_paid - NEW.final_total;
  END IF;

  RETURN NEW;
END;
$function$;

-- Function that triggers quote updates when payment_records change
CREATE OR REPLACE FUNCTION public.trigger_update_payment_status()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Update the related quote's payment status
  UPDATE quotes
  SET updated_at = now()
  WHERE id = COALESCE(NEW.quote_id, OLD.quote_id);

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Create trigger on quotes table that calculates payment status on UPDATE
DROP TRIGGER IF EXISTS update_payment_status_on_quote ON quotes;
CREATE TRIGGER update_payment_status_on_quote
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_status();

-- Create triggers on payment_records table that trigger quote updates
DROP TRIGGER IF EXISTS update_payment_status_on_payment_record ON payment_records;
CREATE TRIGGER update_payment_status_on_payment_record
  AFTER INSERT OR UPDATE OR DELETE ON payment_records
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_payment_status();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_payment_status TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_update_payment_status TO authenticated;

-- Test the triggers by recalculating any existing quotes with payment records
DO $$
DECLARE
    quote_rec RECORD;
BEGIN
    -- Update all quotes that have payment records to trigger recalculation
    FOR quote_rec IN 
        SELECT DISTINCT q.id
        FROM quotes q 
        INNER JOIN payment_records pr ON q.id = pr.quote_id
    LOOP
        UPDATE quotes 
        SET updated_at = NOW()
        WHERE id = quote_rec.id;
        
        RAISE NOTICE 'Recalculated payments for quote %', quote_rec.id;
    END LOOP;
END $$;

-- Comments
COMMENT ON FUNCTION update_payment_status IS 'Calculates amount_paid and payment_status from payment_records when quotes are updated';
COMMENT ON FUNCTION trigger_update_payment_status IS 'Triggers quote update when payment_records change to recalculate payment totals';