-- Create a function to get formatted bank details for email templates
-- This can be used in email notifications for bank transfer payments

CREATE OR REPLACE FUNCTION get_bank_details_for_email(payment_currency TEXT)
RETURNS TEXT AS $$
DECLARE
    bank_record bank_account_details%ROWTYPE;
    formatted_details TEXT;
BEGIN
    -- Get the first active bank account for the specified currency
    SELECT * INTO bank_record
    FROM bank_account_details
    WHERE is_active = true 
    AND currency_code = payment_currency
    ORDER BY is_fallback ASC
    LIMIT 1;
    
    -- If no bank account found, return error message
    IF NOT FOUND THEN
        RETURN 'Bank details for ' || payment_currency || ' currency are currently unavailable. Please contact support for payment instructions.';
    END IF;
    
    -- Format bank details for HTML email
    formatted_details := 
        'Bank Name: ' || bank_record.bank_name || '<br>' ||
        'Account Name: ' || bank_record.account_name || '<br>' ||
        'Account Number: ' || bank_record.account_number || '<br>';
    
    -- Add SWIFT code if available
    IF bank_record.swift_code IS NOT NULL AND bank_record.swift_code != '' THEN
        formatted_details := formatted_details || 'SWIFT Code: ' || bank_record.swift_code || '<br>';
    END IF;
    
    -- Add currency
    IF bank_record.currency_code IS NOT NULL AND bank_record.currency_code != '' THEN
        formatted_details := formatted_details || 'Currency: ' || bank_record.currency_code;
    END IF;
    
    RETURN formatted_details;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated and anonymous users
-- This allows the function to be called from email services
GRANT EXECUTE ON FUNCTION get_bank_details_for_email(TEXT) TO authenticated, anon;

-- Add comment explaining the function
COMMENT ON FUNCTION get_bank_details_for_email(TEXT) IS 'Returns formatted bank account details for the specified currency, used in email templates for bank transfer payments';

-- Example usage in email template processing:
-- SELECT get_bank_details_for_email('USD') as bank_details;