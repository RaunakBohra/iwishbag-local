-- Add fee tracking columns to payment_transactions table
ALTER TABLE payment_transactions
ADD COLUMN gateway_fee_amount NUMERIC(10,2) DEFAULT 0,
ADD COLUMN gateway_fee_currency TEXT,
ADD COLUMN net_amount NUMERIC(10,2),
ADD COLUMN fee_percentage NUMERIC(5,3);

-- Add index for efficient querying by gateway_fee_amount
CREATE INDEX idx_payment_transactions_gateway_fee
ON payment_transactions(gateway_fee_amount)
WHERE gateway_fee_amount > 0;

-- Add comment explaining the new columns
COMMENT ON COLUMN payment_transactions.gateway_fee_amount IS 'Amount of fee charged by the payment gateway for this transaction.';
COMMENT ON COLUMN payment_transactions.gateway_fee_currency IS 'Currency of the gateway fee.';
COMMENT ON COLUMN payment_transactions.net_amount IS 'Net amount received after deducting gateway fees.';
COMMENT ON COLUMN payment_transactions.fee_percentage IS 'Percentage of the transaction amount charged as fee.';