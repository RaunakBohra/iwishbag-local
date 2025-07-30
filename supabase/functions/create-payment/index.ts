import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createCorsHeaders } from '../_shared/cors.ts';
import Stripe from 'https://esm.sh/stripe@14.11.0?target=deno';
// REMOVED: PayU SDK import as it might be causing additional API calls
// import PayU from 'https://esm.sh/payu@latest?target=deno';
import { createStripePaymentEnhancedSecure } from './stripe-enhanced-secure.ts';
import { createAirwallexPaymentIntent } from './airwallex-api.ts';
import {
  withEdgeMonitoring,
  extractPaymentId,
  extractUserId as _extractUserId,
  mapGatewayError,
  createErrorResponse,
  createSuccessResponse,
  sanitizeForLogging,
} from '../_shared/monitoring-utils.ts';
import { EdgeLogCategory } from '../_shared/edge-logging.ts';
import { EdgePaymentErrorCode } from '../_shared/edge-payment-monitoring.ts';
import { getPaymentExchangeRate } from '../_shared/currency-utils.ts';

// This should match src/types/payment.ts PaymentRequest
interface PaymentRequest {
  quoteIds: string[];
  gateway:
    | 'bank_transfer'
    | 'cod'
    | 'payu'
    | 'esewa'
    | 'khalti'
    | 'fonepay'
    | 'airwallex'
    | 'stripe';
  success_url: string;
  cancel_url: string;
  amount?: number;
  currency?: string;
  metadata?: Record<string, unknown>;
  customerInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
}

// This should match src/types/payment.ts PaymentResponse
interface PaymentResponse {
  success: boolean;
  url?: string | null;
  qrCode?: string | null;
  transactionId?: string;
  client_secret?: string;
  error?: string;
  paymentIntentId?: string;
  airwallexData?: {
    intent_id: string;
    client_secret: string;
    currency: string;
    amount: number;
    env: 'demo' | 'prod';
  };
  // PayU specific fields
  method?: string;
  formData?: Record<string, string>;
  amountInINR?: number;
  exchangeRate?: number;
  paymentId?: string;
  customer_id?: string;
}

// REMOVED: PayU client initialization to avoid additional API calls
// const payuClient = new PayU({
//   key: Deno.env.get('PAYU_MERCHANT_KEY'),
//   salt: Deno.env.get('PAYU_SALT_KEY'),
// }, 'LIVE'); // Use LIVE for production environment

// Rate limiting for PayU requests
const _payuRequestCache = new Map();
const _PAYU_RATE_LIMIT_MS = 60000; // 60 seconds between requests
const _PAYU_MAX_REQUESTS_PER_MINUTE = 10;

// --- PayU Hash Generation for Deno (matches Node.js SDK) ---
async function generatePayUHash({
  merchantKey,
  salt,
  txnid,
  amount,
  productinfo,
  firstname,
  email,
  udf1 = '',
  udf2 = '',
  udf3 = '',
  udf4 = '',
  udf5 = '',
}: {
  merchantKey: string;
  salt: string;
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
}): Promise<{ v1: string; v2: string }> {
  // PayU expects: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT
  // That's 5 UDF fields followed by 5 empty pipes, then SALT
  const hashString = [
    merchantKey,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    udf1,
    udf2,
    udf3,
    udf4,
    udf5, // 5 UDF fields
    '',
    '',
    '',
    '',
    '', // 5 empty pipes
    salt,
  ].join('|');
  // Security: Only log non-sensitive debug info in development
  console.log('PayU hash generation for transaction:', txnid);

  const encoder = new TextEncoder();
  const data = encoder.encode(hashString);
  const hashBuffer = await crypto.subtle.digest('SHA-512', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  // v2: reversed salt, same pipe count
  const reversedSalt = salt.split('').reverse().join('');
  const hashStringV2 = [
    merchantKey,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    '',
    '',
    '',
    '',
    '', // 5 UDF fields (empty)
    '',
    '',
    '',
    '',
    '', // 5 empty pipes
    reversedSalt,
  ].join('|');

  const dataV2 = encoder.encode(hashStringV2);
  const hashBufferV2 = await crypto.subtle.digest('SHA-512', dataV2);
  const hashArrayV2 = Array.from(new Uint8Array(hashBufferV2));
  const hashHexV2 = hashArrayV2.map((b) => b.toString(16).padStart(2, '0')).join('');

  return {
    v1: hashHex,
    v2: hashHexV2,
  };
}
// --- Node.js Reference Script (for comparison) ---
// const PayU = require('payu');
// const hash = PayU.utils.hashCal('sha512', hashString);
// console.log(hash);

// Helper function to get currency multiplier for converting to smallest unit
function _getCurrencyMultiplier(currency: string): number {
  // Most currencies use 2 decimal places (100 cents = 1 dollar)
  const _twoDecimalCurrencies = [
    'USD',
    'EUR',
    'GBP',
    'CAD',
    'AUD',
    'SGD',
    'AED',
    'SAR',
    'EGP',
    'TRY',
    'INR',
    'NPR',
  ];

  // Zero decimal currencies (already in smallest unit)
  const zeroDecimalCurrencies = ['JPY', 'KRW', 'VND', 'CLP', 'ISK', 'UGX'];

  // Three decimal currencies (1000 smallest units = 1 major unit)
  const threeDecimalCurrencies = ['BHD', 'JOD', 'KWD', 'OMR', 'TND'];

  const upperCurrency = currency.toUpperCase();

  if (zeroDecimalCurrencies.includes(upperCurrency)) {
    return 1;
  } else if (threeDecimalCurrencies.includes(upperCurrency)) {
    return 1000;
  } else {
    return 100; // Default to 2 decimal places
  }
}

serve(async (req) => {
  const corsHeaders = createCorsHeaders(req);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const response = await withEdgeMonitoring(
      'create-payment',
      async (logger, paymentMonitoring) => {
        try {
          logger.info(EdgeLogCategory.EDGE_FUNCTION, 'Payment creation function started', {
            metadata: {
              method: req.method,
              userAgent: req.headers.get('user-agent'),
              origin: req.headers.get('origin'),
            },
          });

          const paymentRequest: PaymentRequest = await req.json();

          // Extract and sanitize request data for logging
          const _sanitizedRequest = sanitizeForLogging(paymentRequest);

          logger.info(EdgeLogCategory.PAYMENT_PROCESSING, 'Payment request received', {
            metadata: {
              gateway: paymentRequest.gateway,
              amount: paymentRequest.amount,
              currency: paymentRequest.currency,
              quoteIds: paymentRequest.quoteIds,
              hasCustomerInfo: !!paymentRequest.customerInfo,
              metadataKeys: Object.keys(paymentRequest.metadata || {}),
              hasAuthToken: !!req.headers.get('Authorization'),
            },
          });

          const {
            quoteIds,
            gateway,
            success_url,
            cancel_url: _cancel_url,
            amount,
            currency,
            customerInfo,
            metadata,
          } = paymentRequest;

          // Generate payment ID for tracking
          const paymentId =
            extractPaymentId(paymentRequest) ||
            `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          // Start payment monitoring
          paymentMonitoring.startPaymentMonitoring({
            paymentId,
            gateway,
            amount: amount || 0,
            currency: currency || 'USD',
            metadata: {
              quoteIds: quoteIds,
              hasCustomerInfo: !!customerInfo,
              requestSource: 'edge_function',
            },
          });

          // Validation with monitoring
          if (!quoteIds || quoteIds.length === 0) {
            paymentMonitoring.completePaymentMonitoring(
              paymentId,
              false,
              EdgePaymentErrorCode.PAYMENT_PROCESSING_FAILED,
              'Missing quoteIds',
            );
            return createErrorResponse(new Error('Missing quoteIds'), 400, logger);
          }

          if (!gateway) {
            paymentMonitoring.completePaymentMonitoring(
              paymentId,
              false,
              EdgePaymentErrorCode.PAYMENT_PROCESSING_FAILED,
              'Missing payment gateway',
            );
            return createErrorResponse(new Error('Missing payment gateway'), 400, logger);
          }

          const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
          );

          // --- Authentication and Authorization ---
          const authHeader = req.headers.get('Authorization');
          const token = authHeader?.replace('Bearer ', '');
          const guestSessionToken = metadata?.guest_session_token;
          const authSessionToken = metadata?.auth_session_token;

          let userId: string | null = null;
          let isGuestSessionValid = false;
          let _isAuthSessionValid = false;

          if (token) {
            // Authenticate user via JWT
            const supabaseClient = createClient(
              Deno.env.get('SUPABASE_URL') ?? '',
              Deno.env.get('SUPABASE_ANON_KEY') ?? '',
              { global: { headers: { Authorization: `Bearer ${token}` } } },
            );
            const {
              data: { user },
              error: userError,
            } = await supabaseClient.auth.getUser();

            if (userError || !user) {
              console.error('JWT authentication failed:', userError?.message);
              // If JWT fails, try session tokens if available
            } else {
              userId = user.id;
              console.log('Authenticated user ID:', userId);
            }
          }

          // Check authenticated user session if provided
          if (userId && authSessionToken) {
            const { data: authSession, error: authError } = await supabaseAdmin
              .from('checkout_sessions')
              .select('id, user_id, quote_ids, status')
              .eq('session_token', authSessionToken)
              .eq('status', 'active')
              .eq('is_guest', false)
              .eq('user_id', userId)
              .single();

            if (!authError && authSession) {
              _isAuthSessionValid = true;
              console.log('Valid authenticated session for user:', userId);
            }
          }

          // Check guest session if no authenticated user
          if (!userId && guestSessionToken) {
            // Validate guest session token
            const { data: guestSession, error: guestError } = await supabaseAdmin
              .from('checkout_sessions')
              .select('id, quote_ids, status')
              .eq('session_token', guestSessionToken)
              .eq('status', 'active')
              .eq('is_guest', true)
              .single();

            if (guestError || !guestSession) {
              console.error('Invalid or expired guest session token:', guestError?.message);
            } else if (guestSession.quote_id !== quoteIds[0]) {
              // Ensure guest session matches the primary quote
              console.error('Guest session quote ID mismatch.');
            } else {
              isGuestSessionValid = true;
              console.log('Valid guest session for quote ID:', guestSession.quote_id);
            }
          }

          if (!userId && !isGuestSessionValid) {
            paymentMonitoring.completePaymentMonitoring(
              paymentId,
              false,
              EdgePaymentErrorCode.UNAUTHORIZED_PAYMENT_ACCESS,
              'No valid user or guest session provided',
            );
            return createErrorResponse(
              new Error('Unauthorized: No valid user or guest session provided'),
              401,
              logger,
            );
          }

          logger.info(EdgeLogCategory.PAYMENT_PROCESSING, 'Authentication successful', {
            paymentId,
            userId,
            metadata: {
              hasAuthenticatedUser: !!userId,
              hasGuestSession: isGuestSessionValid,
              quoteCount: quoteIds.length,
            },
          });

          // --- End Authentication and Authorization ---

          // Fetch quotes and verify ownership
          const { data: quotes, error: quotesError } = await supabaseAdmin
            .from('quotes')
            .select(
              'id, user_id, product_name, final_total_usd, quantity, destination_currency, origin_country, destination_country',
            )
            .in('id', quoteIds);

          if (quotesError) {
            console.error('Error fetching quotes:', quotesError);
            return new Response(JSON.stringify({ error: 'Failed to fetch quotes' }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          if (!quotes || quotes.length === 0) {
            return new Response(JSON.stringify({ error: 'No quotes found for provided IDs' }), {
              status: 404,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          // Verify ownership
          const quotesToUse = quotes.filter((quote) => {
            if (userId && quote.user_id === userId) {
              return true;
            }
            // For guest sessions, only allow if it's the single quote linked to the session
            if (isGuestSessionValid && quoteIds.length === 1 && quote.id === quoteIds[0]) {
              return true;
            }
            return false;
          });

          if (quotesToUse.length !== quoteIds.length) {
            console.error('Ownership verification failed. User/guest does not own all quotes.');
            return new Response(
              JSON.stringify({
                error: 'Forbidden: You do not have access to all specified quotes.',
              }),
              {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              },
            );
          }

          // Calculate total amount if not provided
          const totalAmount =
            amount || quotesToUse.reduce((sum, quote) => sum + (quote.final_total_usd || 0), 0);
          const totalCurrency = currency || quotesToUse[0]?.destination_currency || 'USD';

          // 🚨 CRITICAL DEBUG: Comprehensive amount tracking in backend
          console.log('🏦 [create-payment] ===== BACKEND PAYMENT AMOUNT TRACKING =====');
          console.log('📊 STEP 1: RAW QUOTE DATA FROM DATABASE');
          quotesToUse.forEach((quote, index) => {
            console.log(`  Quote ${index + 1}:`, {
              id: quote.id,
              final_total_usd: quote.final_total_usd,
              destination_currency: quote.destination_currency,
              origin_country: quote.origin_country,
              destination_country: quote.destination_country,
            });
          });

          console.log('💰 STEP 2: RECEIVED PAYMENT REQUEST');
          console.log('  Payment Request Details:', {
            received_amount: amount,
            received_currency: currency,
            calculated_amount: quotesToUse.reduce(
              (sum, quote) => sum + (quote.final_total_usd || 0),
              0,
            ),
            final_amount: totalAmount,
            destination_currency: totalCurrency,
            gateway: gateway,
            quote_ids: quoteIds,
          });

          console.log('🔍 STEP 3: METADATA ANALYSIS');

          // 🚨 CRITICAL FIX: Validate currency metadata and USD amount consistency
          const currencyContext = metadata?.currency_context;
          console.log('  Currency Context:', currencyContext);
          console.log('  Quote Context:', metadata?.quote_context);
          if (currencyContext) {
            console.log('🔍 [create-payment] Currency context validation:', {
              source_currency: currencyContext.source_currency,
              target_currency: currencyContext.target_currency,
              conversion_rate: currencyContext.conversion_rate,
              amount_in_source_currency: currencyContext.amount_in_source_currency,
              amount_in_target_currency: currencyContext.amount_in_target_currency,
              received_amount: totalAmount,
              received_currency: totalCurrency,
            });

            // Validate that we're receiving USD amounts (new requirement)
            if (totalCurrency !== 'USD') {
              console.error(
                '🚨 [create-payment] Expected USD currency but received:',
                totalCurrency,
              );
              return new Response(
                JSON.stringify({
                  error: 'Invalid currency in payment request',
                  details: `Expected USD, received ${totalCurrency}. Frontend should always send USD amounts.`,
                }),
                {
                  status: 400,
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                },
              );
            }

            // Validate USD amount consistency (with 1% tolerance for rounding)
            const expectedUsdAmount = currencyContext.amount_in_source_currency;
            const amountDifference = Math.abs(totalAmount - expectedUsdAmount);
            const toleranceThreshold = Math.max(expectedUsdAmount * 0.01, 0.01); // 1% or 1 cent minimum

            if (amountDifference > toleranceThreshold) {
              console.error('🚨 [create-payment] USD amount validation failed:', {
                expected: expectedUsdAmount,
                received: totalAmount,
                difference: amountDifference,
                tolerance: toleranceThreshold,
                percentageDiff: (amountDifference / expectedUsdAmount) * 100,
              });
              return new Response(
                JSON.stringify({
                  error: 'USD amount validation failed',
                  details: `USD amount mismatch: expected ${expectedUsdAmount}, received ${totalAmount}`,
                }),
                {
                  status: 400,
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                },
              );
            }

            console.log('✅ [create-payment] USD amount validation passed');

            // 🚨 CRITICAL FIX: Cross-validate USD amounts with quote totals
            const calculatedUsdTotal = quotesToUse.reduce(
              (sum, quote) => sum + (quote.final_total_usd || 0),
              0,
            );
            const usdAmountDifference = Math.abs(totalAmount - calculatedUsdTotal);
            const usdToleranceThreshold = Math.max(calculatedUsdTotal * 0.01, 0.01);

            if (usdAmountDifference > usdToleranceThreshold) {
              console.error('🚨 [create-payment] USD amount vs quote total mismatch:', {
                received_usd_amount: totalAmount,
                calculated_quote_total: calculatedUsdTotal,
                difference: usdAmountDifference,
                tolerance: usdToleranceThreshold,
                quotes: quotesToUse.map((q) => ({ id: q.id, final_total_usd: q.final_total_usd })),
              });
              return new Response(
                JSON.stringify({
                  error: 'Quote total validation failed',
                  details: `USD amount (${totalAmount}) doesn't match quote total (${calculatedUsdTotal})`,
                }),
                {
                  status: 400,
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                },
              );
            }

            console.log('✅ [create-payment] USD amount vs quote total validation passed');
          } else {
            console.warn(
              '⚠️ [create-payment] No currency context provided - using legacy validation',
            );
          }

          let responseData: PaymentResponse;

          switch (gateway) {
            case 'payu':
              try {
                logger.info(EdgeLogCategory.PAYMENT_PROCESSING, 'Starting PayU payment creation', {
                  paymentId,
                  userId,
                  metadata: { amount: totalAmount, currency: totalCurrency },
                });

                // Fetch PayU config from payment_gateways table
                const { data: payuGateway, error: payuGatewayError } =
                  await paymentMonitoring.monitorGatewayCall(
                    'fetch_payu_config',
                    'payu',
                    async () => {
                      return await supabaseAdmin
                        .from('payment_gateways')
                        .select('config, test_mode')
                        .eq('code', 'payu')
                        .single();
                    },
                    paymentId,
                  );

                if (payuGatewayError || !payuGateway) {
                  paymentMonitoring.completePaymentMonitoring(
                    paymentId,
                    false,
                    EdgePaymentErrorCode.GATEWAY_CONFIGURATION_ERROR,
                    'PayU gateway config missing',
                  );
                  return createErrorResponse(new Error('PayU gateway config missing'), 500, logger);
                }

                const config = payuGateway.config || {};
                const testMode = payuGateway.test_mode;
                const payuConfig = {
                  merchant_key: config.merchant_key,
                  salt_key: config.salt_key,
                  payment_url: testMode
                    ? 'https://test.payu.in/_payment'
                    : 'https://secure.payu.in/_payment',
                };
                console.log('PayU config loaded successfully');
                if (!payuConfig.merchant_key || !payuConfig.salt_key) {
                  paymentMonitoring.completePaymentMonitoring(
                    paymentId,
                    false,
                    EdgePaymentErrorCode.GATEWAY_CONFIGURATION_ERROR,
                    'PayU merchant key or salt key missing',
                  );
                  return createErrorResponse(new Error('PayU configuration missing'), 500, logger);
                }

                // 🚨 CRITICAL FIX: Convert from USD to INR directly (no double conversion)
                let amountInINR: number;
                let exchangeRateInfo: { rate: number; source: string; confidence: string };

                // Get the origin country from the first quote (all quotes should have same origin for multi-item purchases)
                const originCountry = quotesToUse[0]?.origin_country || 'US';

                console.log('🏦 [PayU] ===== GATEWAY CONVERSION TRACKING =====');
                console.log('💰 STEP 1: INPUT TO PAYU GATEWAY');
                console.log('  Gateway Input:', {
                  amount: totalAmount,
                  currency: totalCurrency,
                  gateway: 'PayU',
                  originCountry: originCountry,
                  targetCountry: 'IN',
                  expectedOutputCurrency: 'INR',
                });

                try {
                  // Always convert from USD to INR (totalAmount is now always in USD)
                  console.log('💱 STEP 2: EXCHANGE RATE LOOKUP');
                  console.log(`  Looking up exchange rate: ${totalAmount} USD → INR`);

                  exchangeRateInfo = await getPaymentExchangeRate(
                    supabaseAdmin,
                    originCountry,
                    'IN', // PayU is for India
                    'USD', // Always from USD now
                    'INR',
                  );

                  console.log('  Exchange Rate Result:', {
                    rate: exchangeRateInfo.rate,
                    source: exchangeRateInfo.source,
                    confidence: exchangeRateInfo.confidence,
                  });

                  amountInINR = totalAmount * exchangeRateInfo.rate;

                  console.log('🎯 STEP 3: PAYU CONVERSION RESULT');
                  console.log('  Conversion Details:', {
                    usdAmount: totalAmount,
                    exchangeRate: exchangeRateInfo.rate,
                    inrAmount: amountInINR,
                    calculation: `${totalAmount} × ${exchangeRateInfo.rate} = ${amountInINR}`,
                    inrFormatted: `₹${amountInINR.toFixed(2)} INR`,
                    gatewayWillReceive: `₹${amountInINR.toFixed(2)} INR`,
                  });

                  console.log('🏦 [PayU] ===== END GATEWAY CONVERSION TRACKING =====');
                } catch (error) {
                  console.error('🚨 [PayU] Error getting USD to INR exchange rate:', error);
                  return new Response(
                    JSON.stringify({
                      error: 'Failed to get USD to INR exchange rate',
                    }),
                    {
                      status: 500,
                      headers: {
                        ...corsHeaders,
                        'Content-Type': 'application/json',
                      },
                    },
                  );
                }

                // Check minimum amount (PayU typically requires at least 1 INR)
                if (amountInINR < 1) {
                  return new Response(
                    JSON.stringify({
                      error: 'Amount too small for PayU. Minimum amount is ₹1 INR.',
                    }),
                    {
                      status: 400,
                      headers: {
                        ...corsHeaders,
                        'Content-Type': 'application/json',
                      },
                    },
                  );
                }

                // Get customer information from request or fetch from database
                let customerName = customerInfo?.name || 'Customer';
                let customerEmail = customerInfo?.email || 'customer@example.com';
                let customerPhone = customerInfo?.phone || '9999999999';

                // If customerInfo not provided, try to get from quotes
                if (
                  !customerInfo &&
                  quotesToUse &&
                  quotesToUse.length > 0 &&
                  !quoteIds.some((id) => id.startsWith('test-'))
                ) {
                  // Fetch full quote details including shipping address
                  const { data: fullQuotes } = await supabaseAdmin
                    .from('quotes')
                    .select('email, customer_name, shipping_address')
                    .in('id', quoteIds)
                    .limit(1);

                  if (fullQuotes && fullQuotes.length > 0) {
                    const firstQuote = fullQuotes[0];
                    customerEmail = firstQuote.email || customerEmail;
                    customerName = firstQuote.customer_name || customerName;

                    // Extract phone from shipping address if available
                    if (
                      firstQuote.shipping_address &&
                      typeof firstQuote.shipping_address === 'object'
                    ) {
                      const shippingAddress = firstQuote.shipping_address as Record<
                        string,
                        unknown
                      >;
                      customerPhone = shippingAddress.phone || customerPhone;
                    }
                  }
                }

                // Generate unique transaction ID (PayU format: alphanumeric only)
                const txnid = `PAYU_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                // Create product info with more details
                const productNames = quotesToUse.map((q) => q.product_name || 'Product').join(', ');
                const productinfo = `Order: ${productNames} (${quoteIds.join(',')})`;

                console.log('PayU Payment Details:', {
                  txnid,
                  amountInINR,
                  formattedAmount: amountInINR.toFixed(2),
                  currency: 'INR',
                  originalCurrency: totalCurrency,
                  customerName,
                  customerEmail,
                  customerPhone,
                  productinfo,
                  exchangeRate: totalCurrency === 'INR' ? 1 : exchangeRate,
                });

                // PayU expects amount in rupees with 2 decimal places, NOT in paise
                // Format the amount to 2 decimal places
                const formattedAmount = amountInINR.toFixed(2);

                // Extract guest session token from metadata if available
                const guestSessionToken = paymentRequest.metadata?.guest_session_token || '';

                const hashResult = await generatePayUHash({
                  merchantKey: payuConfig.merchant_key,
                  salt: payuConfig.salt_key,
                  txnid,
                  amount: formattedAmount,
                  productinfo,
                  firstname: customerName,
                  email: customerEmail,
                  udf1: guestSessionToken, // Store guest session token in UDF1
                });

                console.log('PayU hash generated for transaction:', txnid);

                // Create proper success and failure URLs using Vercel API routes
                // PayU sends POST requests, so we use API routes that can handle POST
                const baseUrl = success_url.includes('localhost')
                  ? 'http://localhost:8080' // Use local development URL
                  : 'https://whyteclub.com'; // Use production URL

                const payuSuccessUrl = `${baseUrl}/api/payu-success`;
                const payuFailureUrl = `${baseUrl}/api/payu-failure`;

                // Prepare PayU POST form data
                const payuRequest = {
                  key: payuConfig.merchant_key,
                  txnid: txnid,
                  amount: formattedAmount,
                  productinfo: productinfo,
                  firstname: customerName,
                  email: customerEmail,
                  phone: customerPhone,
                  surl: payuSuccessUrl,
                  furl: payuFailureUrl,
                  hash: hashResult.v1,
                  // Removed mode parameter to show all payment options (CC, UPI, Net Banking, Wallets)
                  udf1: guestSessionToken, // Include guest session token
                  udf2: '',
                  udf3: '',
                  udf4: '',
                  udf5: '',
                };

                // Log transaction details (non-sensitive)
                logger.info(
                  EdgeLogCategory.PAYMENT_PROCESSING,
                  'PayU payment created successfully',
                  {
                    paymentId,
                    userId,
                    metadata: {
                      transactionId: txnid,
                      amountINR: amountInINR,
                      originalAmount: totalAmount,
                      originalCurrency: totalCurrency,
                      exchangeRate: totalCurrency === 'INR' ? 1 : exchangeRate,
                      testMode,
                    },
                  },
                );

                // Don't complete payment monitoring here - let webhook handle completion
                // This way monitoring shows "pending" until webhook confirms payment

                responseData = {
                  success: true,
                  url: payuConfig.payment_url,
                  method: 'POST',
                  formData: payuRequest,
                  transactionId: txnid,
                  amountInINR: amountInINR,
                  exchangeRate: totalCurrency === 'INR' ? 1 : exchangeRate,
                  paymentId,
                };
              } catch (error) {
                const errorCode = mapGatewayError(
                  'payu',
                  error instanceof Error ? error : new Error('PayU error'),
                );

                paymentMonitoring.completePaymentMonitoring(
                  paymentId,
                  false,
                  errorCode,
                  error instanceof Error ? error.message : 'PayU payment creation failed',
                );

                logger.error(
                  EdgeLogCategory.PAYMENT_PROCESSING,
                  'PayU payment creation failed',
                  error instanceof Error ? error : new Error('PayU payment creation failed'),
                  {
                    paymentId,
                    userId,
                    metadata: {
                      gateway: 'payu',
                      amount: totalAmount,
                      currency: totalCurrency,
                    },
                  },
                );

                return createErrorResponse(
                  error instanceof Error ? error : new Error('PayU payment creation failed'),
                  500,
                  logger,
                  { gateway: 'payu', paymentId },
                );
              }
              break;

            case 'khalti':
              try {
                logger.info(
                  EdgeLogCategory.PAYMENT_PROCESSING,
                  'Starting Khalti payment creation',
                  {
                    paymentId,
                    userId,
                    metadata: { amount: totalAmount, currency: totalCurrency },
                  },
                );

                // Fetch Khalti config from payment_gateways table
                const { data: khaltiGateway, error: khaltiGatewayError } =
                  await paymentMonitoring.monitorGatewayCall(
                    'fetch_khalti_config',
                    'khalti',
                    async () => {
                      return await supabaseAdmin
                        .from('payment_gateways')
                        .select('config, test_mode')
                        .eq('code', 'khalti')
                        .single();
                    },
                    paymentId,
                  );

                if (khaltiGatewayError || !khaltiGateway) {
                  paymentMonitoring.completePaymentMonitoring(
                    paymentId,
                    false,
                    EdgePaymentErrorCode.GATEWAY_CONFIGURATION_ERROR,
                    'Khalti gateway config missing',
                  );
                  return createErrorResponse(
                    new Error('Khalti gateway config missing'),
                    500,
                    logger,
                  );
                }

                const config = khaltiGateway.config || {};
                const testMode = khaltiGateway.test_mode;
                const khaltiConfig = {
                  public_key: testMode ? config.test_public_key : config.live_public_key,
                  secret_key: testMode ? config.test_secret_key : config.live_secret_key,
                  base_url: testMode ? config.sandbox_base_url : config.production_base_url,
                };

                console.log('Khalti config:', {
                  testMode,
                  base_url: khaltiConfig.base_url,
                  has_secret_key: !!khaltiConfig.secret_key,
                  secret_key_length: khaltiConfig.secret_key?.length,
                });

                // Check if demo mode is enabled for testing
                const isDemoMode = config.demo_mode === true;

                if (isDemoMode) {
                  console.warn('⚠️ Khalti is in DEMO MODE. Using mock response for testing.');
                }

                if (!khaltiConfig.public_key || !khaltiConfig.secret_key) {
                  paymentMonitoring.completePaymentMonitoring(
                    paymentId,
                    false,
                    EdgePaymentErrorCode.GATEWAY_CONFIGURATION_ERROR,
                    'Khalti API keys missing',
                  );
                  return createErrorResponse(
                    new Error('Khalti configuration missing'),
                    500,
                    logger,
                  );
                }

                // 🚨 CRITICAL FIX: Convert from USD to NPR directly (no double conversion)
                let amountInNPR: number;
                let exchangeRateInfo: { rate: number; source: string; confidence: string };

                // Get the origin country from the first quote (all quotes should have same origin for multi-item purchases)
                const originCountry = quotesToUse[0]?.origin_country || 'US';

                console.log('🏦 [Khalti] ===== GATEWAY CONVERSION TRACKING =====');
                console.log('💰 STEP 1: INPUT TO KHALTI GATEWAY');
                console.log('  Gateway Input:', {
                  amount: totalAmount,
                  currency: totalCurrency,
                  gateway: 'Khalti',
                  originCountry: originCountry,
                  targetCountry: 'NP',
                  expectedOutputCurrency: 'NPR',
                });

                try {
                  // Always convert from USD to NPR (totalAmount is now always in USD)
                  console.log('💱 STEP 2: EXCHANGE RATE LOOKUP');
                  console.log(`  Looking up exchange rate: ${totalAmount} USD → NPR`);

                  exchangeRateInfo = await getPaymentExchangeRate(
                    supabaseAdmin,
                    originCountry,
                    'NP', // Khalti is for Nepal
                    'USD', // Always from USD now
                    'NPR',
                  );

                  console.log('  Exchange Rate Result:', {
                    rate: exchangeRateInfo.rate,
                    source: exchangeRateInfo.source,
                    confidence: exchangeRateInfo.confidence,
                  });

                  amountInNPR = totalAmount * exchangeRateInfo.rate;

                  console.log('🎯 STEP 3: KHALTI CONVERSION RESULT');
                  console.log('  Conversion Details:', {
                    usdAmount: totalAmount,
                    exchangeRate: exchangeRateInfo.rate,
                    nprAmount: amountInNPR,
                    calculation: `${totalAmount} × ${exchangeRateInfo.rate} = ${amountInNPR}`,
                    nprFormatted: `₨${amountInNPR.toFixed(2)} NPR`,
                    gatewayWillReceive: `₨${amountInNPR.toFixed(2)} NPR`,
                  });

                  console.log('🏦 [Khalti] ===== END GATEWAY CONVERSION TRACKING =====');
                } catch (error) {
                  console.error('🚨 [Khalti] Error getting USD to NPR exchange rate:', error);
                  return createErrorResponse(
                    new Error('Failed to get USD to NPR exchange rate'),
                    500,
                    logger,
                  );
                }

                // Convert to paisa (Khalti expects amount in paisa: 1 NPR = 100 paisa)
                const amountInPaisa = Math.round(amountInNPR * 100);

                // Check minimum amount (Khalti requires at least 1000 paisa = 10 NPR)
                if (amountInPaisa < 1000) {
                  return createErrorResponse(
                    new Error('Amount too small for Khalti. Minimum amount is NPR 10.'),
                    400,
                    logger,
                  );
                }

                // Get customer information
                let customerName = customerInfo?.name || 'Customer';
                let customerEmail = customerInfo?.email || 'customer@example.com';
                let customerPhone = customerInfo?.phone || '9999999999';

                // If customerInfo not provided, try to get from quotes
                if (
                  !customerInfo &&
                  quotesToUse &&
                  quotesToUse.length > 0 &&
                  !quoteIds.some((id) => id.startsWith('test-'))
                ) {
                  const { data: fullQuotes } = await supabaseAdmin
                    .from('quotes')
                    .select('email, customer_name, shipping_address')
                    .in('id', quoteIds)
                    .limit(1);

                  if (fullQuotes && fullQuotes.length > 0) {
                    const firstQuote = fullQuotes[0];
                    customerEmail = firstQuote.email || customerEmail;
                    customerName = firstQuote.customer_name || customerName;

                    if (
                      firstQuote.shipping_address &&
                      typeof firstQuote.shipping_address === 'object'
                    ) {
                      const shippingAddress = firstQuote.shipping_address as Record<
                        string,
                        unknown
                      >;
                      customerPhone = shippingAddress.phone || customerPhone;
                    }
                  }
                }

                // Generate unique purchase order ID
                const purchaseOrderId = `KHALTI_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                // Create product info
                const productNames = quotesToUse.map((q) => q.product_name || 'Product').join(', ');
                const purchaseOrderName = `Order: ${productNames} (${quoteIds.join(',')})`;

                const khaltiBaseUrl = success_url.includes('localhost')
                  ? 'http://localhost:8080'
                  : 'https://whyteclub.com';

                const khaltiReturnUrl = `${khaltiBaseUrl}/api/khalti-callback`;
                const khaltiWebsiteUrl = khaltiBaseUrl;

                // Prepare Khalti payment initiation request
                const khaltiRequest = {
                  return_url: khaltiReturnUrl,
                  website_url: khaltiWebsiteUrl,
                  amount: amountInPaisa,
                  purchase_order_id: purchaseOrderId,
                  purchase_order_name: purchaseOrderName,
                  customer_info: {
                    name: customerName,
                    email: customerEmail,
                    phone: customerPhone,
                  },
                };

                // Ensure proper URL format - remove double slashes
                const khaltiApiUrl = khaltiConfig.base_url.endsWith('/')
                  ? khaltiConfig.base_url.slice(0, -1)
                  : khaltiConfig.base_url;
                const khaltiUrl = `${khaltiApiUrl}/epayment/initiate/`;
                console.log('Khalti request:', {
                  url: khaltiUrl,
                  headers: {
                    Authorization: `Key ${khaltiConfig.secret_key?.substring(0, 20)}...`,
                    'Content-Type': 'application/json',
                  },
                  body: khaltiRequest,
                });

                let khaltiResponse;
                let khaltiData;

                if (isDemoMode) {
                  // Mock response for demo mode
                  khaltiData = {
                    pidx: `DEMO_${purchaseOrderId}`,
                    payment_url: `https://demo.khalti.com/payment/test?pidx=DEMO_${purchaseOrderId}`,
                    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
                  };
                  console.log('📱 Demo mode: Returning mock Khalti response');
                } else {
                  // Real API call
                  khaltiResponse = await fetch(khaltiUrl, {
                    method: 'POST',
                    headers: {
                      Authorization: `Key ${khaltiConfig.secret_key}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(khaltiRequest),
                  });

                  if (!khaltiResponse.ok) {
                    const errorData = await khaltiResponse.json();
                    console.error('Khalti API error:', errorData);
                    console.error('Khalti request details:', {
                      status: khaltiResponse.status,
                      statusText: khaltiResponse.statusText,
                      url: khaltiUrl,
                      testMode: testMode,
                    });

                    // Special handling for 401 errors
                    if (khaltiResponse.status === 401) {
                      paymentMonitoring.completePaymentMonitoring(
                        paymentId,
                        false,
                        EdgePaymentErrorCode.PAYMENT_PROCESSING_FAILED,
                        'Khalti authentication failed. Please check your API credentials.',
                      );
                      return createErrorResponse(
                        new Error(
                          'Khalti authentication failed. The API credentials may be incorrect or expired. Please contact support to update the Khalti configuration.',
                        ),
                        401,
                        logger,
                      );
                    }

                    paymentMonitoring.completePaymentMonitoring(
                      paymentId,
                      false,
                      EdgePaymentErrorCode.PAYMENT_PROCESSING_FAILED,
                      `Khalti API error: ${JSON.stringify(errorData)}`,
                    );
                    return createErrorResponse(
                      new Error(`Khalti API error: ${JSON.stringify(errorData)}`),
                      500,
                      logger,
                    );
                  }

                  khaltiData = await khaltiResponse.json();
                }

                // Log transaction details (non-sensitive)
                logger.info(
                  EdgeLogCategory.PAYMENT_PROCESSING,
                  'Khalti payment created successfully',
                  {
                    paymentId,
                    userId,
                    metadata: {
                      purchaseOrderId,
                      amountNPR: amountInNPR,
                      amountPaisa: amountInPaisa,
                      originalAmount: totalAmount,
                      originalCurrency: totalCurrency,
                      exchangeRate: totalCurrency === 'NPR' ? 1 : exchangeRate,
                      testMode,
                      pidx: khaltiData.pidx,
                    },
                  },
                );

                // Don't complete payment monitoring here - let webhook handle completion
                // This way monitoring shows "pending" until webhook confirms payment

                responseData = {
                  success: true,
                  url: khaltiData.payment_url,
                  transactionId: khaltiData.pidx,
                  gateway: 'khalti',
                  amount: amountInNPR,
                  currency: 'NPR',
                  qrCode: khaltiData.payment_url, // Khalti payment URL can be used for QR
                  khaltiData: {
                    pidx: khaltiData.pidx,
                    payment_url: khaltiData.payment_url,
                    expires_at: khaltiData.expires_at,
                    purchase_order_id: purchaseOrderId,
                  },
                };
              } catch (error) {
                console.error('Khalti payment creation error:', error);
                paymentMonitoring.completePaymentMonitoring(
                  paymentId,
                  false,
                  EdgePaymentErrorCode.PAYMENT_PROCESSING_FAILED,
                  error instanceof Error ? error.message : 'Unknown error',
                );

                logger.error(EdgeLogCategory.PAYMENT_PROCESSING, 'Khalti payment creation failed', {
                  error: error instanceof Error ? error.message : 'Unknown error',
                  paymentId,
                  userId,
                  metadata: {
                    gateway: 'khalti',
                    amount: totalAmount,
                    currency: totalCurrency,
                  },
                });

                return createErrorResponse(
                  error instanceof Error ? error : new Error('Khalti payment creation failed'),
                  500,
                  logger,
                  { gateway: 'khalti', paymentId },
                );
              }
              break;

            case 'stripe':
              try {
                logger.info(
                  EdgeLogCategory.PAYMENT_PROCESSING,
                  'Starting Stripe payment creation',
                  {
                    paymentId,
                    userId,
                    metadata: { amount: totalAmount, currency: totalCurrency },
                  },
                );

                // Fetch Stripe config from payment_gateways table
                const { data: stripeGateway, error: stripeGatewayError } =
                  await paymentMonitoring.monitorGatewayCall(
                    'fetch_stripe_config',
                    'stripe',
                    async () => {
                      return await supabaseAdmin
                        .from('payment_gateways')
                        .select('config, test_mode')
                        .eq('code', 'stripe')
                        .single();
                    },
                    paymentId,
                  );

                if (stripeGatewayError || !stripeGateway) {
                  paymentMonitoring.completePaymentMonitoring(
                    paymentId,
                    false,
                    EdgePaymentErrorCode.GATEWAY_CONFIGURATION_ERROR,
                    'Stripe gateway config missing',
                  );
                  return createErrorResponse(
                    new Error('Stripe gateway config missing'),
                    500,
                    logger,
                  );
                }

                const config = stripeGateway.config || {};
                const testMode = stripeGateway.test_mode;

                // Get the appropriate key based on test mode
                const stripeSecretKey = testMode
                  ? config.test_secret_key
                  : config.live_secret_key || config.secret_key;

                if (!stripeSecretKey) {
                  paymentMonitoring.completePaymentMonitoring(
                    paymentId,
                    false,
                    EdgePaymentErrorCode.GATEWAY_CONFIGURATION_ERROR,
                    'Stripe secret key not configured',
                  );
                  return createErrorResponse(
                    new Error('Stripe secret key not configured in database'),
                    500,
                    logger,
                  );
                }

                const stripe = new Stripe(stripeSecretKey, {
                  apiVersion: config.api_version || '2023-10-16',
                });

                // 🚨 CRITICAL FIX: Stripe supports USD directly, no conversion needed
                console.log(`🎯 Stripe: Using ${totalAmount} USD directly (no conversion needed)`);

                // Use secure enhanced Stripe payment creation with monitoring
                const result = await paymentMonitoring.monitorGatewayCall(
                  'create_stripe_payment',
                  'stripe',
                  async () => {
                    return await createStripePaymentEnhancedSecure({
                      stripe,
                      amount: totalAmount, // USD amount
                      currency: totalCurrency, // USD currency
                      quoteIds,
                      userId: userId || 'guest',
                      customerInfo,
                      quotes: quotesToUse,
                      supabaseAdmin,
                    });
                  },
                  paymentId,
                );

                if (!result.success) {
                  paymentMonitoring.completePaymentMonitoring(
                    paymentId,
                    false,
                    EdgePaymentErrorCode.STRIPE_API_ERROR,
                    result.error || 'Stripe payment creation failed',
                  );
                  return createErrorResponse(
                    new Error(result.error || 'Stripe payment creation failed'),
                    400,
                    logger,
                    { gateway: 'stripe', paymentId },
                  );
                }

                logger.info(
                  EdgeLogCategory.PAYMENT_PROCESSING,
                  'Stripe payment created successfully',
                  {
                    paymentId,
                    userId,
                    metadata: {
                      transactionId: result.transactionId,
                      customerId: result.customer_id,
                      amount: totalAmount,
                      currency: totalCurrency,
                      testMode,
                    },
                  },
                );

                paymentMonitoring.completePaymentMonitoring(paymentId, true, undefined, undefined, {
                  transactionId: result.transactionId,
                  gateway: 'stripe',
                  customerId: result.customer_id,
                });

                responseData = {
                  success: result.success,
                  client_secret: result.client_secret,
                  transactionId: result.transactionId,
                  customer_id: result.customer_id,
                  paymentId,
                };
              } catch (error) {
                const errorCode = mapGatewayError(
                  'stripe',
                  error instanceof Error ? error : new Error('Stripe error'),
                );

                paymentMonitoring.completePaymentMonitoring(
                  paymentId,
                  false,
                  errorCode,
                  error instanceof Error ? error.message : 'Stripe payment creation failed',
                );

                logger.error(
                  EdgeLogCategory.PAYMENT_PROCESSING,
                  'Stripe payment creation failed',
                  error instanceof Error ? error : new Error('Stripe payment creation failed'),
                  {
                    paymentId,
                    userId,
                    metadata: {
                      gateway: 'stripe',
                      amount: totalAmount,
                      currency: totalCurrency,
                    },
                  },
                );

                return createErrorResponse(
                  error instanceof Error ? error : new Error('Stripe payment creation failed'),
                  500,
                  logger,
                  { gateway: 'stripe', paymentId },
                );
              }
              break;

            case 'airwallex':
              try {
                console.log('💳 Starting Airwallex payment creation');

                // Fetch Airwallex config from payment_gateways table
                const { data: airwallexGateway, error: airwallexGatewayError } = await supabaseAdmin
                  .from('payment_gateways')
                  .select('config, test_mode')
                  .eq('code', 'airwallex')
                  .single();

                if (airwallexGatewayError || !airwallexGateway) {
                  console.error('❌ Airwallex gateway config error:', airwallexGatewayError);
                  return new Response(
                    JSON.stringify({
                      error: 'Airwallex gateway config missing',
                    }),
                    {
                      status: 500,
                      headers: {
                        ...corsHeaders,
                        'Content-Type': 'application/json',
                      },
                    },
                  );
                }

                const airwallexConfig = airwallexGateway.config || {};
                const airwallexTestMode = airwallexGateway.test_mode;

                // Extract API key and client ID from config
                const airwallexApiKey = airwallexTestMode
                  ? airwallexConfig.test_api_key
                  : airwallexConfig.live_api_key || airwallexConfig.api_key;

                const airwallexClientId = airwallexConfig.client_id;

                if (!airwallexApiKey || !airwallexClientId) {
                  return new Response(
                    JSON.stringify({
                      error: 'Airwallex configuration incomplete',
                    }),
                    {
                      status: 500,
                      headers: {
                        ...corsHeaders,
                        'Content-Type': 'application/json',
                      },
                    },
                  );
                }

                // Secure debugging: Log credential metadata without exposing secrets
                const apiKeyHash = await crypto.subtle.digest(
                  'SHA-256',
                  new TextEncoder().encode(airwallexApiKey),
                );
                const apiKeyHashHex = Array.from(new Uint8Array(apiKeyHash))
                  .map((b) => b.toString(16).padStart(2, '0'))
                  .join('');

                console.log('🔐 Airwallex configuration loaded (secure debug)', {
                  testMode: airwallexTestMode,
                  hasApiKey: !!airwallexApiKey,
                  hasClientId: !!airwallexClientId,
                  apiKeyLength: airwallexApiKey.length,
                  apiKeyLast4: airwallexApiKey.slice(-4),
                  apiKeyHash: apiKeyHashHex.slice(0, 8), // First 8 chars of hash
                  clientIdLength: airwallexClientId.length,
                  clientIdLast4: airwallexClientId.slice(-4),
                  configKeys: Object.keys(airwallexConfig),
                  selectedKeyType: airwallexTestMode
                    ? 'test_api_key'
                    : airwallexConfig.live_api_key
                      ? 'live_api_key'
                      : 'api_key',
                });

                // 🚨 CRITICAL FIX: Airwallex supports USD directly, no conversion needed
                console.log(
                  `🎯 Airwallex: Using ${totalAmount} USD directly (no conversion needed)`,
                );

                // Call the Airwallex API module to create payment intent
                const result = await createAirwallexPaymentIntent({
                  apiKey: airwallexApiKey,
                  clientId: airwallexClientId,
                  testMode: airwallexTestMode,
                  amount: totalAmount, // USD amount
                  currency: totalCurrency, // USD currency
                  quoteIds,
                  userId: userId || 'guest',
                  customerInfo,
                  quotes: quotesToUse,
                  supabaseAdmin,
                });

                // Handle the result
                if (!result.success) {
                  return new Response(
                    JSON.stringify({
                      error: result.error || 'Airwallex payment creation failed',
                    }),
                    {
                      status: 400,
                      headers: {
                        ...corsHeaders,
                        'Content-Type': 'application/json',
                      },
                    },
                  );
                }

                // Set response data from successful result
                responseData = {
                  success: result.success,
                  client_secret: result.client_secret,
                  transactionId: result.transactionId,
                  url: result.confirmationUrl,
                  paymentIntentId: result.paymentIntentId,
                  // Include airwallexData if present
                  ...(result.airwallexData && {
                    airwallexData: result.airwallexData,
                  }),
                };

                console.log('Airwallex payment created successfully:', {
                  transactionId: responseData.transactionId,
                  paymentIntentId: result.paymentIntentId,
                  url: responseData.url,
                  hasClientSecret: !!responseData.client_secret,
                });
              } catch (error) {
                console.error('Airwallex payment creation error:', error);
                return new Response(
                  JSON.stringify({
                    error: 'Airwallex payment creation failed',
                    details: error.message,
                  }),
                  {
                    status: 500,
                    headers: {
                      ...corsHeaders,
                      'Content-Type': 'application/json',
                    },
                  },
                );
              }
              break;

            case 'fonepay':
              try {
                console.log('🏦 [create-payment] ===== FONEPAY PAYMENT PROCESSING =====');
                console.log('📊 STEP 1: FONEPAY PAYMENT INITIALIZATION');

                logger.info(
                  EdgeLogCategory.PAYMENT_PROCESSING,
                  'Starting Fonepay payment creation',
                  {
                    paymentId,
                    userId,
                    metadata: { amount: totalAmount, currency: totalCurrency },
                  },
                );

                console.log('📊 STEP 2: FONEPAY GATEWAY CONFIGURATION');
                // Fetch Fonepay config from database
                const { data: fonepayGateway, error: fonepayGatewayError } =
                  await paymentMonitoring.monitorGatewayCall(
                    'fetch_fonepay_config',
                    'fonepay',
                    async () => {
                      return await supabaseAdmin
                        .from('payment_gateways')
                        .select('config, test_mode')
                        .eq('code', 'fonepay')
                        .single();
                    },
                    paymentId,
                  );

                if (fonepayGatewayError || !fonepayGateway) {
                  console.error('❌ Fonepay gateway config missing:', fonepayGatewayError);
                  paymentMonitoring.completePaymentMonitoring(
                    paymentId,
                    false,
                    EdgePaymentErrorCode.GATEWAY_CONFIGURATION_ERROR,
                    'Fonepay gateway config missing',
                  );
                  return createErrorResponse(
                    new Error('Fonepay gateway config missing'),
                    500,
                    logger,
                  );
                }

                const fonepayConfig = fonepayGateway.config || {};
                const fonepayTestMode = fonepayGateway.test_mode;

                // Extract configuration
                const merchantCode = fonepayConfig.merchant_code;
                const secretKey = fonepayConfig.secret_key;
                const _panNumber = fonepayConfig.pan_number;

                console.log('  🔧 Gateway Configuration:', {
                  merchant_code: merchantCode ? 'present' : 'missing',
                  secret_key: secretKey ? 'present' : 'missing',
                  pan_number: _panNumber ? 'present' : 'missing',
                  test_mode: fonepayTestMode,
                });

                if (!merchantCode || !secretKey) {
                  console.error('❌ Fonepay configuration incomplete');
                  paymentMonitoring.completePaymentMonitoring(
                    paymentId,
                    false,
                    EdgePaymentErrorCode.GATEWAY_CONFIGURATION_ERROR,
                    'Fonepay configuration incomplete',
                  );
                  return createErrorResponse(
                    new Error('Fonepay configuration incomplete'),
                    500,
                    logger,
                  );
                }

                console.log('📊 STEP 3: USD TO NPR CONVERSION');
                // 🚨 CRITICAL FIX: Convert from USD to NPR directly (no double conversion)
                let amountInNPR: number;
                let exchangeRateInfo: { rate: number; source: string; confidence: string };

                // Get the origin country from the first quote (all quotes should have same origin for multi-item purchases)
                const originCountry = quotesToUse[0]?.origin_country || 'US';

                console.log('  🎯 Conversion Parameters:', {
                  totalAmount_USD: totalAmount,
                  originCountry: originCountry,
                  destinationCountry: 'NP',
                  fromCurrency: 'USD',
                  toCurrency: 'NPR',
                });

                try {
                  // Always convert from USD to NPR (totalAmount is now always in USD)
                  console.log(`  🎯 Converting ${totalAmount} USD to NPR for Fonepay gateway`);

                  exchangeRateInfo = await getPaymentExchangeRate(
                    supabaseAdmin,
                    originCountry,
                    'NP', // Fonepay is for Nepal
                    'USD', // Always from USD now
                    'NPR',
                  );

                  amountInNPR = totalAmount * exchangeRateInfo.rate;
                  console.log('  ✅ Currency Conversion Result:', {
                    input_amount: totalAmount,
                    input_currency: 'USD',
                    output_amount: amountInNPR,
                    output_currency: 'NPR',
                    exchange_rate: exchangeRateInfo.rate,
                    rate_source: exchangeRateInfo.source,
                    confidence: exchangeRateInfo.confidence,
                    conversion_string: `${totalAmount} USD → ${amountInNPR} NPR`,
                  });
                } catch (error) {
                  console.error('❌ Error getting USD to NPR exchange rate:', error);
                  return createErrorResponse(
                    new Error('Failed to get USD to NPR exchange rate'),
                    500,
                    logger,
                  );
                }

                console.log('📊 STEP 4: PRN GENERATION AND CUSTOMER INFO');
                // Generate unique Product Reference Number (PRN)
                const prn = `FP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                console.log('  🔢 PRN Generation:', {
                  prn: prn,
                  payment_id: paymentId,
                  timestamp: Date.now(),
                });

                // Get customer information
                let customerName = customerInfo?.name || 'Customer';
                const _customerEmail = customerInfo?.email || 'customer@example.com';
                const _customerPhone = customerInfo?.phone || '9999999999';

                // If we have quote IDs, try to get customer info from quotes
                if (quoteIds && quoteIds.length > 0) {
                  const { data: fullQuotes } = await supabaseAdmin
                    .from('quotes')
                    .select('email, customer_name, shipping_address')
                    .in('id', quoteIds)
                    .limit(1);

                  if (fullQuotes && fullQuotes.length > 0) {
                    const firstQuote = fullQuotes[0];
                    const _customerEmailFromQuote = firstQuote.email || _customerEmail;
                    customerName = firstQuote.customer_name || customerName;

                    // Extract phone from shipping address if available
                    if (
                      firstQuote.shipping_address &&
                      typeof firstQuote.shipping_address === 'object'
                    ) {
                      const shippingAddress = firstQuote.shipping_address as Record<
                        string,
                        unknown
                      >;
                      const _customerPhoneFromQuote = shippingAddress.phone || _customerPhone;
                    }
                  }
                }

                console.log('📊 STEP 5: AMOUNT FORMATTING AND URL GENERATION');
                // Format amount to 2 decimal places
                const formattedAmount = amountInNPR.toFixed(2);

                console.log('  💰 Amount Formatting:', {
                  original_amount_NPR: amountInNPR,
                  formatted_amount_NPR: formattedAmount,
                  decimal_places: 2,
                });

                // Get base URL from success_url for return URL
                const baseUrl = new URL(success_url).origin;
                const returnUrl = `${baseUrl}/payment-callback/fonepay`;

                console.log('  🔗 URL Generation:', {
                  base_url: baseUrl,
                  return_url: returnUrl,
                  original_success_url: success_url,
                });

                console.log('📊 STEP 6: FONEPAY PAYMENT PARAMETERS');
                // Fonepay payment parameters
                const paymentParams = {
                  PID: merchantCode,
                  MD: 'P', // Payment mode
                  PRN: prn,
                  AMT: formattedAmount,
                  CRN: 'NPR', // Currency (Nepal Rupees)
                  DT: new Date().toLocaleDateString('en-US'), // MM/DD/YYYY format
                  R1: `Order_${quoteIds.join(',')}`,
                  R2: customerName.substring(0, 20), // Max 20 chars
                  RU: returnUrl,
                };

                console.log('  📦 Fonepay payment parameters:', {
                  PID: paymentParams.PID,
                  MD: paymentParams.MD,
                  PRN: paymentParams.PRN,
                  AMT: paymentParams.AMT,
                  CRN: paymentParams.CRN,
                  DT: paymentParams.DT,
                  R1: paymentParams.R1,
                  R2: paymentParams.R2,
                  RU: paymentParams.RU,
                });

                console.log('📊 STEP 7: HMAC-SHA512 SIGNATURE GENERATION');
                // Generate HMAC-SHA512 hash for security
                const hashString = [
                  paymentParams.PID,
                  paymentParams.MD,
                  paymentParams.PRN,
                  paymentParams.AMT,
                  paymentParams.CRN,
                  paymentParams.DT,
                  paymentParams.R1,
                  paymentParams.R2,
                  paymentParams.RU,
                ].join(',');

                console.log('  🔐 Fonepay hash string:', hashString);

                // Generate HMAC-SHA512 hash
                const encoder = new TextEncoder();
                const keyData = encoder.encode(secretKey);
                const messageData = encoder.encode(hashString);

                const cryptoKey = await crypto.subtle.importKey(
                  'raw',
                  keyData,
                  { name: 'HMAC', hash: 'SHA-512' },
                  false,
                  ['sign'],
                );

                const hashBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

                console.log('  ✅ Fonepay hash generated:', {
                  hash_preview: hashHex.substring(0, 20) + '...',
                  hash_length: hashHex.length,
                  hash_algorithm: 'HMAC-SHA512',
                  hash_valid: hashHex.length === 128, // SHA-512 should be 128 chars
                });

                console.log('📊 STEP 8: FONEPAY URL GENERATION');
                // Build Fonepay payment URL
                const fonepayUrl = fonepayTestMode
                  ? 'https://dev-clientapi.fonepay.com/api/merchantRequest'
                  : 'https://clientapi.fonepay.com/api/merchantRequest';

                console.log('  🌐 Fonepay URL Details:', {
                  base_url: fonepayUrl,
                  test_mode: fonepayTestMode,
                  environment: fonepayTestMode ? 'test' : 'live',
                });

                // Convert parameters to URL query string
                const queryParams = new URLSearchParams();
                Object.entries(paymentParams).forEach(([key, value]) => {
                  queryParams.append(key, value as string);
                });
                queryParams.append('DV', hashHex);

                const paymentUrl = `${fonepayUrl}?${queryParams.toString()}`;

                console.log('📊 STEP 9: FINAL FONEPAY PAYMENT RESPONSE');
                console.log('  🚀 Fonepay payment URL generated');
                console.log('  🔗 Payment URL Length:', paymentUrl.length);

                paymentMonitoring.completePaymentMonitoring(paymentId, true, undefined, undefined, {
                  gateway: 'fonepay',
                  transactionId: prn,
                  amount: amountInNPR,
                  currency: 'NPR',
                });

                responseData = {
                  success: true,
                  url: paymentUrl,
                  method: 'GET',
                  transactionId: prn,
                  gateway: 'fonepay',
                  amount: amountInNPR,
                  currency: 'NPR',
                };

                console.log('  🎯 Final Fonepay Response:', {
                  success: responseData.success,
                  url_length: responseData.url.length,
                  method: responseData.method,
                  transactionId: responseData.transactionId,
                  gateway: responseData.gateway,
                  amount: responseData.amount,
                  currency: responseData.currency,
                });
                console.log('🏦 [create-payment] ===== END FONEPAY PAYMENT PROCESSING =====');
              } catch (error) {
                paymentMonitoring.completePaymentMonitoring(
                  paymentId,
                  false,
                  EdgePaymentErrorCode.PAYMENT_PROCESSING_FAILED,
                  error instanceof Error ? error.message : 'Unknown error',
                );

                logger.error(
                  EdgeLogCategory.PAYMENT_PROCESSING,
                  'Fonepay payment creation failed',
                  {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    paymentId,
                    userId,
                    metadata: {
                      gateway: 'fonepay',
                      amount: totalAmount,
                      currency: totalCurrency,
                    },
                  },
                );

                return createErrorResponse(
                  error instanceof Error ? error : new Error('Fonepay payment creation failed'),
                  500,
                  logger,
                  { gateway: 'fonepay', paymentId },
                );
              }
              break;

            case 'bank_transfer':
            case 'cod':
              logger.info(
                EdgeLogCategory.PAYMENT_PROCESSING,
                `Manual payment method selected: ${gateway}`,
                {
                  paymentId,
                  userId,
                  metadata: { amount: totalAmount, currency: totalCurrency },
                },
              );

              paymentMonitoring.completePaymentMonitoring(paymentId, true, undefined, undefined, {
                gateway,
                paymentMethod: 'manual',
              });

              // For manual methods, just return success without transactionId to avoid showing payment status tracker
              responseData = { success: true, paymentId };
              break;

            case 'esewa':
              try {
                console.log('🏦 [create-payment] ===== ESEWA PAYMENT PROCESSING =====');
                console.log('📊 STEP 1: ESEWA PAYMENT INITIALIZATION');
                console.log('  💳 Processing eSewa payment (v2 API)');

                // 🚨 CRITICAL FIX: Convert from USD to NPR directly (no double conversion)
                let amountInNPR: number;
                let exchangeRateInfo: { rate: number; source: string; confidence: string };

                // Get the origin country from the first quote (all quotes should have same origin for multi-item purchases)
                const originCountry = quotesToUse[0]?.origin_country || 'US';

                console.log('📊 STEP 2: USD TO NPR CONVERSION');
                console.log('  🎯 Conversion Parameters:', {
                  totalAmount_USD: totalAmount,
                  originCountry: originCountry,
                  destinationCountry: 'NP',
                  fromCurrency: 'USD',
                  toCurrency: 'NPR',
                });

                try {
                  // Always convert from USD to NPR (totalAmount is now always in USD)
                  console.log(`  🎯 Converting ${totalAmount} USD to NPR for eSewa gateway`);

                  exchangeRateInfo = await getPaymentExchangeRate(
                    supabaseAdmin,
                    originCountry,
                    'NP', // eSewa is for Nepal
                    'USD', // Always from USD now
                    'NPR',
                  );

                  amountInNPR = totalAmount * exchangeRateInfo.rate;
                  console.log('  ✅ Currency Conversion Result:', {
                    input_amount: totalAmount,
                    input_currency: 'USD',
                    output_amount: amountInNPR,
                    output_currency: 'NPR',
                    exchange_rate: exchangeRateInfo.rate,
                    rate_source: exchangeRateInfo.source,
                    confidence: exchangeRateInfo.confidence,
                    conversion_string: `${totalAmount} USD → ${amountInNPR} NPR`,
                  });
                } catch (error) {
                  console.error('❌ Error getting USD to NPR exchange rate:', error);
                  paymentMonitoring.completePaymentMonitoring(
                    paymentId,
                    false,
                    EdgePaymentErrorCode.GATEWAY_CONFIGURATION_ERROR,
                    'Failed to get USD to NPR exchange rate',
                  );
                  return createErrorResponse(
                    new Error('Failed to get USD to NPR exchange rate'),
                    500,
                    logger,
                  );
                }

                console.log('📊 STEP 3: ESEWA GATEWAY CONFIGURATION');
                // Get eSewa gateway configuration (v2)
                const { data: esewaGateway, error: esewaGatewayError } = await supabaseAdmin
                  .from('payment_gateways')
                  .select('config, test_mode')
                  .eq('code', 'esewa')
                  .single();

                if (esewaGatewayError || !esewaGateway) {
                  console.error('❌ eSewa gateway config missing:', esewaGatewayError);
                  paymentMonitoring.completePaymentMonitoring(
                    paymentId,
                    false,
                    EdgePaymentErrorCode.GATEWAY_CONFIGURATION_ERROR,
                    'eSewa gateway config missing',
                  );
                  return createErrorResponse(
                    new Error('eSewa gateway config missing'),
                    500,
                    logger,
                  );
                }

                const esewaConfig = esewaGateway.config as {
                  product_code: string;
                  secret_key: string;
                  api_version: string;
                  test_url: string;
                  live_url: string;
                };

                console.log('  🔧 Gateway Configuration:', {
                  product_code: esewaConfig.product_code ? 'present' : 'missing',
                  secret_key: esewaConfig.secret_key ? 'present' : 'missing',
                  api_version: esewaConfig.api_version || 'v2',
                  test_mode: esewaGateway.test_mode,
                  test_url: esewaConfig.test_url || 'default',
                  live_url: esewaConfig.live_url || 'default',
                });

                if (!esewaConfig.product_code || !esewaConfig.secret_key) {
                  console.error('❌ eSewa product code or secret key missing');
                  paymentMonitoring.completePaymentMonitoring(
                    paymentId,
                    false,
                    EdgePaymentErrorCode.GATEWAY_CONFIGURATION_ERROR,
                    'eSewa product code or secret key missing',
                  );
                  return createErrorResponse(
                    new Error('eSewa product code or secret key missing'),
                    500,
                    logger,
                  );
                }

                console.log('📊 STEP 4: TRANSACTION UUID GENERATION');
                // Generate unique transaction UUID for this transaction
                const currentTime = new Date();
                const transactionUuid =
                  currentTime.toISOString().slice(2, 10).replace(/-/g, '') +
                  '-' +
                  currentTime.getHours() +
                  currentTime.getMinutes() +
                  currentTime.getSeconds();

                console.log('  🔢 Transaction UUID:', {
                  transaction_uuid: transactionUuid,
                  generated_at: currentTime.toISOString(),
                  payment_id: paymentId,
                });

                // Get customer information
                const _customerName = customerInfo?.name || 'Customer';
                const _customerEmail = customerInfo?.email || 'customer@example.com';

                if (quoteIds && quoteIds.length > 0) {
                  const { data: fullQuotes } = await supabaseAdmin
                    .from('quotes')
                    .select('email, customer_name, shipping_address')
                    .in('id', quoteIds)
                    .limit(1);

                  if (fullQuotes && fullQuotes.length > 0) {
                    const firstQuote = fullQuotes[0];
                    const _customerEmailFromQuote = firstQuote.email || _customerEmail;
                    const _customerNameFromQuote = firstQuote.customer_name || _customerName;
                  }
                }

                console.log('📊 STEP 5: AMOUNT FORMATTING AND URL GENERATION');
                // Format amount for eSewa v2 (whole numbers)
                const formattedAmount = Math.round(amountInNPR);

                console.log('  💰 Amount Formatting:', {
                  original_amount_NPR: amountInNPR,
                  formatted_amount_NPR: formattedAmount,
                  rounding_applied: amountInNPR !== formattedAmount,
                  difference: Math.abs(amountInNPR - formattedAmount),
                });

                // Get base URL from success_url for return URLs
                const baseUrl = new URL(success_url).origin;
                const _successUrl = `${baseUrl}/payment-callback/esewa-success`;
                const _failureUrl = `${baseUrl}/payment-callback/esewa-failure`;

                // For testing: use simple URLs like in the working test
                const testSuccessUrl = `${baseUrl}/payment-callback/esewa-success`;
                const testFailureUrl = `${baseUrl}/payment-callback/esewa-failure`;

                console.log('  🔗 URL Generation:', {
                  base_url: baseUrl,
                  success_url: testSuccessUrl,
                  failure_url: testFailureUrl,
                  original_success_url: success_url,
                });

                console.log('📊 STEP 6: HMAC-SHA256 SIGNATURE GENERATION');
                // Generate HMAC-SHA256 signature for v2 API
                const signatureString = `total_amount=${formattedAmount},transaction_uuid=${transactionUuid},product_code=${esewaConfig.product_code}`;
                console.log('  🔐 Signature Generation:', {
                  signature_string: signatureString,
                  total_amount: formattedAmount,
                  transaction_uuid: transactionUuid,
                  product_code: esewaConfig.product_code,
                });

                // Create HMAC-SHA256 hash
                const encoder = new TextEncoder();
                const keyData = encoder.encode(esewaConfig.secret_key);
                const messageData = encoder.encode(signatureString);

                // Import the secret key for HMAC
                const cryptoKey = await crypto.subtle.importKey(
                  'raw',
                  keyData,
                  { name: 'HMAC', hash: 'SHA-256' },
                  false,
                  ['sign'],
                );

                // Generate the signature
                const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);

                // Convert to base64
                const signatureArray = Array.from(new Uint8Array(signatureBuffer));
                const signatureBase64 = btoa(String.fromCharCode(...signatureArray));

                console.log('  🔏 Generated Signature:', {
                  signature_base64: signatureBase64,
                  signature_length: signatureBase64.length,
                  signature_valid: signatureBase64.length > 0,
                });

                // eSewa v2 payment parameters
                const paymentParams = {
                  amount: formattedAmount.toString(),
                  tax_amount: '0',
                  total_amount: formattedAmount.toString(),
                  transaction_uuid: transactionUuid,
                  product_code: esewaConfig.product_code,
                  product_service_charge: '0',
                  product_delivery_charge: '0',
                  success_url: testSuccessUrl,
                  failure_url: testFailureUrl,
                  signed_field_names: 'total_amount,transaction_uuid,product_code',
                  signature: signatureBase64,
                };

                console.log('📊 STEP 7: ESEWA PAYMENT PARAMETERS');
                // Debug logging
                console.log('  📦 eSewa v2 payment params:', {
                  amount: paymentParams.amount,
                  tax_amount: paymentParams.tax_amount,
                  total_amount: paymentParams.total_amount,
                  transaction_uuid: paymentParams.transaction_uuid,
                  product_code: paymentParams.product_code,
                  product_service_charge: paymentParams.product_service_charge,
                  product_delivery_charge: paymentParams.product_delivery_charge,
                  success_url: paymentParams.success_url,
                  failure_url: paymentParams.failure_url,
                  signed_field_names: paymentParams.signed_field_names,
                  signature: paymentParams.signature,
                  api_version: 'v2',
                });

                // Determine eSewa v2 URL based on test mode
                const esewaTestMode = esewaGateway.test_mode ?? true;

                console.log('📊 STEP 8: ESEWA URL GENERATION');
                // Fix URL corruption issue - hardcode correct URLs
                const esewaUrl = esewaTestMode
                  ? 'https://rc-epay.esewa.com.np/api/epay/main/v2/form' // Test environment
                  : 'https://epay.esewa.com.np/api/epay/main/v2/form'; // Live environment

                console.log('  🌐 eSewa v2 URL Details:', {
                  url: esewaUrl,
                  test_mode: esewaTestMode,
                  length: esewaUrl.length,
                  includes_epay: esewaUrl.includes('epay'),
                  includes_spaces: esewaUrl.includes('  '),
                  url_encoded: encodeURIComponent(esewaUrl),
                  environment: esewaTestMode ? 'test' : 'live',
                });

                // Create form data for POST submission (eSewa v2 with signature)
                const formData = paymentParams;

                console.log('📊 STEP 9: FINAL ESEWA PAYMENT RESPONSE');
                console.log('  🚀 eSewa v2 payment form generated with HMAC-SHA256 signature');
                console.log(
                  '  📦 Complete form data being sent:',
                  JSON.stringify(formData, null, 2),
                );

                // Don't complete payment monitoring here - let callback handle completion
                // This way monitoring shows "pending" until callback confirms payment

                responseData = {
                  success: true,
                  url: esewaUrl,
                  method: 'POST',
                  formData: formData,
                  transactionId: transactionUuid,
                  gateway: 'esewa',
                  amount: amountInNPR,
                  currency: 'NPR',
                  apiVersion: 'v2',
                };

                console.log('  🎯 Final eSewa Response:', {
                  success: responseData.success,
                  url: responseData.url,
                  method: responseData.method,
                  transactionId: responseData.transactionId,
                  gateway: responseData.gateway,
                  amount: responseData.amount,
                  currency: responseData.currency,
                  apiVersion: responseData.apiVersion,
                  formDataKeys: Object.keys(formData),
                });
                console.log('🏦 [create-payment] ===== END ESEWA PAYMENT PROCESSING =====');
              } catch (error) {
                paymentMonitoring.completePaymentMonitoring(
                  paymentId,
                  false,
                  EdgePaymentErrorCode.PAYMENT_PROCESSING_FAILED,
                  error instanceof Error ? error.message : 'eSewa payment creation failed',
                );

                logger.error(EdgeLogCategory.PAYMENT_PROCESSING, 'eSewa payment creation failed', {
                  error: error instanceof Error ? error.message : 'Unknown error',
                  paymentId,
                  userId,
                });

                return createErrorResponse(
                  error instanceof Error ? error : new Error('eSewa payment creation failed'),
                  500,
                  logger,
                );
              }
              break;

            default:
              paymentMonitoring.completePaymentMonitoring(
                paymentId,
                false,
                EdgePaymentErrorCode.PAYMENT_PROCESSING_FAILED,
                `Unsupported gateway: ${gateway}`,
              );
              return createErrorResponse(new Error(`Unsupported gateway: ${gateway}`), 400, logger);
          }

          // 🚨 CRITICAL FIX: Add comprehensive payment creation summary
          console.log('🎉 [create-payment] ===== FINAL PAYMENT SUMMARY =====');
          console.log('📊 PAYMENT FLOW SUMMARY:');
          console.log('  1. Database Storage:', {
            quotes: quotesToUse.map((q) => ({
              id: q.id,
              final_total_usd: q.final_total_usd,
              currency: q.destination_currency,
            })),
            total_usd: quotesToUse.reduce((sum, quote) => sum + (quote.final_total_usd || 0), 0),
          });

          console.log('  2. Frontend Request:', {
            received_amount: amount,
            received_currency: currency,
            gateway: gateway,
            display_currency: currencyContext?.target_currency || 'USD',
            display_amount: currencyContext?.amount_in_target_currency || totalAmount,
            conversion_rate: currencyContext?.conversion_rate || 1,
          });

          console.log('  3. Backend Processing:', {
            processed_amount: totalAmount,
            processed_currency: totalCurrency,
            gateway: gateway,
            paymentId: paymentId,
            userId: userId,
          });

          console.log('  4. Gateway Conversion:', {
            gateway: gateway,
            input_amount: totalAmount,
            input_currency: totalCurrency,
            // Gateway-specific amounts will be logged by individual gateways
            transaction_id: responseData.transactionId || 'Not generated yet',
          });

          console.log('  5. Validation Status:', {
            usd_amount_valid: totalAmount > 0 && isFinite(totalAmount),
            currency_valid: totalCurrency === 'USD',
            metadata_present: !!currencyContext,
            amounts_consistent: currencyContext
              ? Math.abs(totalAmount - currencyContext.amount_in_source_currency) < 0.01
              : true,
          });

          if (responseData.transactionId) {
            console.log('  ✅ Transaction ID:', responseData.transactionId);
          }

          console.log('🎉 [create-payment] ===== END PAYMENT SUMMARY =====');

          logger.info(
            EdgeLogCategory.PAYMENT_PROCESSING,
            'Payment creation completed successfully',
            {
              paymentId,
              userId,
              metadata: {
                gateway,
                responseType: typeof responseData,
                hasTransactionId: !!responseData.transactionId,
                usd_amount: totalAmount,
                display_currency: currencyContext?.target_currency || 'USD',
                display_amount: currencyContext?.amount_in_target_currency || totalAmount,
              },
            },
          );

          return createSuccessResponse(responseData, 200, logger, {
            gateway,
            paymentId,
          });
        } catch (error) {
          // Note: paymentRequest and paymentId may not be available in scope here
          logger.error(
            EdgeLogCategory.EDGE_FUNCTION,
            'Unexpected error in payment creation',
            error instanceof Error ? error : new Error('Unknown payment creation error'),
          );

          return createErrorResponse(
            error instanceof Error ? error : new Error('Internal server error'),
            500,
            logger,
          );
        }
      },
      req,
    );

    // Add CORS headers to the response from withEdgeMonitoring
    return addCorsHeaders(response);
  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Helper function to add CORS headers to any response
  function addCorsHeaders(response: Response): Response {
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }
});
