// Simple script to add PayPal to the payment_gateways table
// This will be executed through the existing create-payment function

const paypalGateway = {
  name: 'PayPal',
  code: 'paypal',
  is_active: true,
  supported_countries: [
    'US',
    'CA',
    'GB',
    'AU',
    'DE',
    'FR',
    'IT',
    'ES',
    'NL',
    'BE',
    'AT',
    'CH',
    'SE',
    'NO',
    'DK',
    'FI',
    'PL',
    'CZ',
    'HU',
    'SG',
    'MY',
    'TH',
    'PH',
    'VN',
    'IN',
    'NP',
    'BD',
    'LK',
    'PK',
    'AE',
    'SA',
    'KW',
    'QA',
    'BH',
    'OM',
    'JO',
    'LB',
    'EG',
    'MA',
    'TN',
    'DZ',
    'NG',
    'GH',
    'KE',
    'UG',
    'TZ',
    'ZA',
    'BR',
    'MX',
    'AR',
    'CL',
    'CO',
    'PE',
    'UY',
    'PY',
    'BO',
    'EC',
    'VE',
  ],
  supported_currencies: [
    'USD',
    'EUR',
    'GBP',
    'CAD',
    'AUD',
    'JPY',
    'SGD',
    'MYR',
    'THB',
    'PHP',
    'VND',
    'INR',
    'NPR',
    'BDT',
    'LKR',
    'PKR',
    'AED',
    'SAR',
    'KWD',
    'QAR',
    'BHD',
    'OMR',
    'JOD',
    'LBP',
    'EGP',
    'MAD',
    'TND',
    'DZD',
    'NGN',
    'GHS',
    'KES',
    'UGX',
    'TZS',
    'ZAR',
    'BRL',
    'MXN',
    'ARS',
    'CLP',
    'COP',
    'PEN',
    'UYU',
    'PYG',
    'BOB',
    'VES',
  ],
  fee_percent: 3.49,
  fee_fixed: 0.49,
  priority: 2,
  config: {
    environment: 'sandbox',
    client_id_sandbox: '',
    client_secret_sandbox: '',
    client_id_live: '',
    client_secret_live: '',
    webhook_id: '',
    supported_funding_sources: ['paypal', 'card', 'venmo', 'applepay', 'googlepay'],
    supported_payment_methods: ['paypal', 'card'],
    merchant_account_id: '',
    partner_attribution_id: 'iwishBag_Cart_SPB',
  },
  test_mode: true,
};

console.log('PayPal Gateway Configuration:');
console.log(JSON.stringify(paypalGateway, null, 2));
console.log('\n--- SQL to add PayPal gateway ---');
console.log(`
INSERT INTO public.payment_gateways (
  name, code, is_active, supported_countries, supported_currencies, 
  fee_percent, fee_fixed, priority, config, test_mode
) VALUES (
  '${paypalGateway.name}',
  '${paypalGateway.code}',
  ${paypalGateway.is_active},
  ARRAY[${paypalGateway.supported_countries.map((c) => `'${c}'`).join(',')}],
  ARRAY[${paypalGateway.supported_currencies.map((c) => `'${c}'`).join(',')}],
  ${paypalGateway.fee_percent},
  ${paypalGateway.fee_fixed},
  ${paypalGateway.priority},
  '${JSON.stringify(paypalGateway.config)}',
  ${paypalGateway.test_mode}
) ON CONFLICT (code) DO UPDATE SET
  supported_countries = EXCLUDED.supported_countries,
  supported_currencies = EXCLUDED.supported_currencies,
  fee_percent = EXCLUDED.fee_percent,
  fee_fixed = EXCLUDED.fee_fixed,
  priority = EXCLUDED.priority,
  config = EXCLUDED.config,
  test_mode = EXCLUDED.test_mode,
  updated_at = now();
`);

console.log('\n--- SQL to add profile column ---');
console.log(`
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS preferred_payment_gateway TEXT;
`);

console.log('\n--- SQL to add country_settings columns ---');
console.log(`
ALTER TABLE public.country_settings 
ADD COLUMN IF NOT EXISTS available_gateways TEXT[] DEFAULT ARRAY['bank_transfer'];

ALTER TABLE public.country_settings 
ADD COLUMN IF NOT EXISTS default_gateway TEXT DEFAULT 'bank_transfer';

ALTER TABLE public.country_settings 
ADD COLUMN IF NOT EXISTS gateway_config JSONB DEFAULT '{}';
`);

console.log('\n--- SQL to update key countries ---');
console.log(`
-- Update US to prefer PayPal
UPDATE public.country_settings 
SET 
  available_gateways = ARRAY['stripe', 'paypal', 'bank_transfer'],
  default_gateway = 'paypal',
  gateway_config = '{"paypal_priority": 1, "stripe_priority": 2, "preferred_for_amount_above": 50.00}'
WHERE code = 'US';

-- Update India to include PayPal as secondary option
UPDATE public.country_settings 
SET 
  available_gateways = ARRAY['payu', 'paypal', 'razorpay', 'upi', 'bank_transfer'],
  default_gateway = 'payu',
  gateway_config = '{"payu_priority": 1, "paypal_priority": 2, "razorpay_priority": 3, "upi_priority": 4, "preferred_for_amount_above": 500.00}'
WHERE code = 'IN';

-- Update Nepal to prefer PayPal
UPDATE public.country_settings 
SET 
  available_gateways = ARRAY['paypal', 'esewa', 'khalti', 'fonepay', 'bank_transfer'],
  default_gateway = 'paypal',
  gateway_config = '{"paypal_priority": 1, "esewa_priority": 2, "khalti_priority": 3, "fonepay_priority": 4, "preferred_for_amount_above": 100.00}'
WHERE code = 'NP';
`);
