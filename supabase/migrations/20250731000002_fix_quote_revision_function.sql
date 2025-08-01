-- Fix ambiguous column reference in create_quote_revision function
DROP FUNCTION IF EXISTS create_quote_revision(UUID, TEXT);

CREATE OR REPLACE FUNCTION create_quote_revision(
  p_original_quote_id UUID,
  p_revision_reason TEXT
)
RETURNS UUID AS $$
DECLARE
  new_quote_id UUID;
  original_data RECORD;
  new_version INT;
BEGIN
  -- Get original quote data using parameter name
  SELECT * INTO original_data FROM quotes_v2 WHERE id = p_original_quote_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Original quote not found';
  END IF;
  
  -- Calculate new version number
  SELECT COALESCE(MAX(version), 0) + 1 INTO new_version
  FROM quotes_v2
  WHERE parent_quote_id = p_original_quote_id OR id = p_original_quote_id;
  
  -- Create new revision with all required fields from quotes_v2 table
  INSERT INTO quotes_v2 (
    customer_id,
    customer_email,
    customer_name,
    customer_phone,
    status,
    origin_country,
    destination_country,
    items,
    shipping_method,
    insurance_required,
    calculation_data,
    total_usd,
    total_customer_currency,
    customer_currency,
    admin_notes,
    customer_notes,
    version,
    parent_quote_id,
    revision_reason,
    validity_days,
    payment_terms,
    customer_message
  ) VALUES (
    original_data.customer_id,
    original_data.customer_email,
    original_data.customer_name,
    original_data.customer_phone,
    'draft', -- New revisions start as draft
    original_data.origin_country,
    original_data.destination_country,
    original_data.items,
    original_data.shipping_method,
    original_data.insurance_required,
    original_data.calculation_data,
    original_data.total_usd,
    original_data.total_customer_currency,
    original_data.customer_currency,
    original_data.admin_notes,
    original_data.customer_notes,
    new_version,
    p_original_quote_id,
    p_revision_reason,
    original_data.validity_days,
    original_data.payment_terms,
    original_data.customer_message
  ) RETURNING id INTO new_quote_id;
  
  RETURN new_quote_id;
END;
$$ LANGUAGE plpgsql;