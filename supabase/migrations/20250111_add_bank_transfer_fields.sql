-- Add new fields to bank_account_details table for QR code and instructions
ALTER TABLE bank_account_details 
ADD COLUMN IF NOT EXISTS upi_id text,
ADD COLUMN IF NOT EXISTS upi_qr_string text,
ADD COLUMN IF NOT EXISTS payment_qr_url text,
ADD COLUMN IF NOT EXISTS instructions text;

-- Add comment for new fields
COMMENT ON COLUMN bank_account_details.upi_id IS 'UPI ID for digital payments (India)';
COMMENT ON COLUMN bank_account_details.upi_qr_string IS 'UPI QR code string for generating dynamic QR codes';
COMMENT ON COLUMN bank_account_details.payment_qr_url IS 'URL to static payment QR code image';
COMMENT ON COLUMN bank_account_details.instructions IS 'Additional payment instructions for customers';