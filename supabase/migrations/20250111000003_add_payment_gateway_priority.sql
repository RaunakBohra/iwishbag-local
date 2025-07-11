-- Add priority field to payment_gateways table for dynamic ordering
-- Lower priority number = higher precedence (1 = highest priority)

ALTER TABLE public.payment_gateways
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 999;

-- Update existing gateways with priority based on current hardcoded order
-- Priority order: Stripe > PayPal > Razorpay > Airwallex > PayU > UPI > Paytm > eSewa > Khalti > Fonepay > GrabPay > Alipay > Bank Transfer > COD

UPDATE public.payment_gateways SET priority = 1 WHERE code = 'stripe';
UPDATE public.payment_gateways SET priority = 2 WHERE code = 'paypal';
UPDATE public.payment_gateways SET priority = 3 WHERE code = 'razorpay';
UPDATE public.payment_gateways SET priority = 4 WHERE code = 'airwallex';
UPDATE public.payment_gateways SET priority = 5 WHERE code = 'payu';
UPDATE public.payment_gateways SET priority = 6 WHERE code = 'upi';
UPDATE public.payment_gateways SET priority = 7 WHERE code = 'paytm';
UPDATE public.payment_gateways SET priority = 8 WHERE code = 'esewa';
UPDATE public.payment_gateways SET priority = 9 WHERE code = 'khalti';
UPDATE public.payment_gateways SET priority = 10 WHERE code = 'fonepay';
UPDATE public.payment_gateways SET priority = 11 WHERE code = 'grabpay';
UPDATE public.payment_gateways SET priority = 12 WHERE code = 'alipay';
UPDATE public.payment_gateways SET priority = 13 WHERE code = 'bank_transfer';
UPDATE public.payment_gateways SET priority = 14 WHERE code = 'cod';

-- Add index for efficient priority-based queries
CREATE INDEX IF NOT EXISTS idx_payment_gateways_priority ON public.payment_gateways(priority);

-- Add comment to document the priority system
COMMENT ON COLUMN public.payment_gateways.priority IS 'Payment gateway priority (lower number = higher priority, 1 = highest)';