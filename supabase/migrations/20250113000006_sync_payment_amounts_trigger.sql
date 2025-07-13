-- Create function to sync quote payment amounts from payment_ledger
CREATE OR REPLACE FUNCTION sync_quote_payment_amounts()
RETURNS TRIGGER AS $$
DECLARE
  target_quote_id UUID;
  calculated_amount_paid NUMERIC;
  calculated_payment_status TEXT;
BEGIN
  -- Get the quote_id from the affected row
  target_quote_id := COALESCE(NEW.quote_id, OLD.quote_id);
  
  -- Calculate total amount paid from payment_ledger
  SELECT COALESCE(SUM(
    CASE 
      WHEN payment_type IN ('customer_payment', 'credit_applied') THEN amount
      WHEN payment_type LIKE '%refund%' OR payment_type = 'adjustment' THEN -ABS(amount)
      ELSE 0
    END
  ), 0)
  INTO calculated_amount_paid
  FROM payment_ledger 
  WHERE quote_id = target_quote_id;
  
  -- Determine payment status based on amounts
  SELECT 
    CASE
      WHEN calculated_amount_paid = 0 THEN 'unpaid'
      WHEN calculated_amount_paid >= q.final_total THEN 
        CASE 
          WHEN calculated_amount_paid > q.final_total THEN 'overpaid'
          ELSE 'paid'
        END
      WHEN calculated_amount_paid > 0 AND calculated_amount_paid < q.final_total THEN 'partial'
      ELSE 'unpaid'
    END
  INTO calculated_payment_status
  FROM quotes q
  WHERE q.id = target_quote_id;
  
  -- Update the quotes table with calculated values
  UPDATE quotes 
  SET 
    amount_paid = calculated_amount_paid,
    payment_status = calculated_payment_status,
    updated_at = NOW()
  WHERE id = target_quote_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on payment_ledger table
DROP TRIGGER IF EXISTS sync_payment_amounts_trigger ON payment_ledger;
CREATE TRIGGER sync_payment_amounts_trigger
  AFTER INSERT OR UPDATE OR DELETE ON payment_ledger
  FOR EACH ROW 
  EXECUTE FUNCTION sync_quote_payment_amounts();

-- Backfill existing quotes with correct payment amounts
DO $$
DECLARE
  quote_record RECORD;
  calculated_amount_paid NUMERIC;
  calculated_payment_status TEXT;
BEGIN
  -- Loop through all quotes that have payment ledger entries
  FOR quote_record IN 
    SELECT DISTINCT q.id, q.final_total
    FROM quotes q
    INNER JOIN payment_ledger pl ON pl.quote_id = q.id
  LOOP
    -- Calculate amount paid for this quote
    SELECT COALESCE(SUM(
      CASE 
        WHEN payment_type IN ('customer_payment', 'credit_applied') THEN amount
        WHEN payment_type LIKE '%refund%' OR payment_type = 'adjustment' THEN -ABS(amount)
        ELSE 0
      END
    ), 0)
    INTO calculated_amount_paid
    FROM payment_ledger 
    WHERE quote_id = quote_record.id;
    
    -- Determine payment status
    calculated_payment_status := 
      CASE
        WHEN calculated_amount_paid = 0 THEN 'unpaid'
        WHEN calculated_amount_paid >= quote_record.final_total THEN 
          CASE 
            WHEN calculated_amount_paid > quote_record.final_total THEN 'overpaid'
            ELSE 'paid'
          END
        WHEN calculated_amount_paid > 0 AND calculated_amount_paid < quote_record.final_total THEN 'partial'
        ELSE 'unpaid'
      END;
    
    -- Update the quote
    UPDATE quotes 
    SET 
      amount_paid = calculated_amount_paid,
      payment_status = calculated_payment_status,
      updated_at = NOW()
    WHERE id = quote_record.id;
    
    RAISE NOTICE 'Updated quote % - Amount paid: %, Status: %', quote_record.id, calculated_amount_paid, calculated_payment_status;
  END LOOP;
END $$;