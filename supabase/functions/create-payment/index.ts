import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createCorsHeaders } from '../_shared/cors.ts'
import Stripe from 'https://esm.sh/stripe@14.11.0?target=deno'
// REMOVED: PayU SDK import as it might be causing additional API calls
// import PayU from 'https://esm.sh/payu@latest?target=deno';
import { createStripePaymentEnhancedSecure } from './stripe-enhanced-secure.ts'
import { createAirwallexPaymentIntent } from './airwallex-api.ts'
import { 
  withEdgeMonitoring,
  extractPaymentId,
  extractUserId,
  mapGatewayError,
  createErrorResponse,
  createSuccessResponse,
  sanitizeForLogging
} from '../_shared/monitoring-utils.ts'
import { EdgeLogCategory } from '../_shared/edge-logging.ts'
import { EdgePaymentErrorCode } from '../_shared/edge-payment-monitoring.ts'


// This should match src/types/payment.ts PaymentRequest
interface PaymentRequest {
  quoteIds: string[];
  gateway: 'bank_transfer' | 'cod' | 'payu' | 'esewa' | 'khalti' | 'fonepay' | 'airwallex' | 'stripe';
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
}

// REMOVED: PayU client initialization to avoid additional API calls
// const payuClient = new PayU({
//   key: Deno.env.get('PAYU_MERCHANT_KEY'),
//   salt: Deno.env.get('PAYU_SALT_KEY'),
// }, 'LIVE'); // Use LIVE for production environment

// Rate limiting for PayU requests
const payuRequestCache = new Map();
const PAYU_RATE_LIMIT_MS = 60000; // 60 seconds between requests
const PAYU_MAX_REQUESTS_PER_MINUTE = 10;

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
  udf5 = ''
}: {
  merchantKey: string,
  salt: string,
  txnid: string,
  amount: string,
  productinfo: string,
  firstname: string,
  email: string,
  udf1?: string,
  udf2?: string,
  udf3?: string,
  udf4?: string,
  udf5?: string
}): Promise<{v1: string, v2: string}> {
  // PayU expects: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT
  // That's 5 UDF fields followed by 5 empty pipes, then SALT
  const hashString = [
    merchantKey,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    udf1, udf2, udf3, udf4, udf5, // 5 UDF fields
    '', '', '', '', '', // 5 empty pipes
    salt
  ].join('|');
  // Security: Only log non-sensitive debug info in development
  console.log('PayU hash generation for transaction:', txnid);
  
  const encoder = new TextEncoder();
  const data = encoder.encode(hashString);
  const hashBuffer = await crypto.subtle.digest('SHA-512', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  // v2: reversed salt, same pipe count
  const reversedSalt = salt.split('').reverse().join('');
  const hashStringV2 = [
    merchantKey,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    '', '', '', '', '', // 5 UDF fields (empty)
    '', '', '', '', '', // 5 empty pipes
    reversedSalt
  ].join('|');
  
  const dataV2 = encoder.encode(hashStringV2);
  const hashBufferV2 = await crypto.subtle.digest('SHA-512', dataV2);
  const hashArrayV2 = Array.from(new Uint8Array(hashBufferV2));
  const hashHexV2 = hashArrayV2.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return {
    v1: hashHex,
    v2: hashHexV2
  };
}
// --- Node.js Reference Script (for comparison) ---
// const PayU = require('payu');
// const hash = PayU.utils.hashCal('sha512', hashString);
// console.log(hash);

// Helper function to get currency multiplier for converting to smallest unit
function getCurrencyMultiplier(currency: string): number {
  // Most currencies use 2 decimal places (100 cents = 1 dollar)
  const twoDecimalCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'SGD', 'AED', 'SAR', 'EGP', 'TRY', 'INR', 'NPR'];
  
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
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const response = await withEdgeMonitoring('create-payment', async (logger, paymentMonitoring) => {
    try {
      logger.info(EdgeLogCategory.EDGE_FUNCTION, 'Payment creation function started', {
        metadata: {
          method: req.method,
          userAgent: req.headers.get('user-agent'),
          origin: req.headers.get('origin')
        }
      });

      const paymentRequest: PaymentRequest = await req.json()
      
      // Extract and sanitize request data for logging
      const sanitizedRequest = sanitizeForLogging(paymentRequest);
      
      logger.info(EdgeLogCategory.PAYMENT_PROCESSING, 'Payment request received', {
        metadata: {
          gateway: paymentRequest.gateway,
          amount: paymentRequest.amount,
          currency: paymentRequest.currency,
          quoteIds: paymentRequest.quoteIds,
          hasCustomerInfo: !!paymentRequest.customerInfo,
          metadataKeys: Object.keys(paymentRequest.metadata || {}),
          hasAuthToken: !!req.headers.get('Authorization')
        }
      });
    
      const { quoteIds, gateway, success_url, cancel_url, amount, currency, customerInfo, metadata } = paymentRequest

      // Generate payment ID for tracking
      const paymentId = extractPaymentId(paymentRequest) || `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Start payment monitoring
      paymentMonitoring.startPaymentMonitoring({
        paymentId,
        gateway,
        amount: amount || 0,
        currency: currency || 'USD',
        metadata: {
          quoteIds: quoteIds,
          hasCustomerInfo: !!customerInfo,
          requestSource: 'edge_function'
        }
      });

      // Validation with monitoring
      if (!quoteIds || quoteIds.length === 0) {
        paymentMonitoring.completePaymentMonitoring(
          paymentId,
          false,
          EdgePaymentErrorCode.PAYMENT_PROCESSING_FAILED,
          'Missing quoteIds'
        );
        return createErrorResponse(new Error('Missing quoteIds'), 400, logger);
      }
      
      if (!gateway) {
        paymentMonitoring.completePaymentMonitoring(
          paymentId,
          false,
          EdgePaymentErrorCode.PAYMENT_PROCESSING_FAILED,
          'Missing payment gateway'
        );
        return createErrorResponse(new Error('Missing payment gateway'), 400, logger);
      }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // --- Authentication and Authorization ---
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const guestSessionToken = metadata?.guest_session_token;
    const authSessionToken = metadata?.auth_session_token;

    let userId: string | null = null;
    let isGuestSessionValid = false;
    let isAuthSessionValid = false;

    if (token) {
      // Authenticate user via JWT
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: `Bearer ${token}` } } }
      );
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

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
        .from('authenticated_checkout_sessions')
        .select('id, user_id, quote_ids, status')
        .eq('session_token', authSessionToken)
        .eq('status', 'active')
        .eq('user_id', userId)
        .single();

      if (!authError && authSession) {
        isAuthSessionValid = true;
        console.log('Valid authenticated session for user:', userId);
      }
    }

    // Check guest session if no authenticated user
    if (!userId && guestSessionToken) {
      // Validate guest session token
      const { data: guestSession, error: guestError } = await supabaseAdmin
        .from('guest_checkout_sessions')
        .select('id, quote_id, status')
        .eq('session_token', guestSessionToken)
        .eq('status', 'active')
        .single();

      if (guestError || !guestSession) {
        console.error('Invalid or expired guest session token:', guestError?.message);
      } else if (guestSession.quote_id !== quoteIds[0]) { // Ensure guest session matches the primary quote
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
          'No valid user or guest session provided'
        );
        return createErrorResponse(new Error('Unauthorized: No valid user or guest session provided'), 401, logger);
      }

      logger.info(EdgeLogCategory.PAYMENT_PROCESSING, 'Authentication successful', {
        paymentId,
        userId,
        metadata: {
          hasAuthenticatedUser: !!userId,
          hasGuestSession: isGuestSessionValid,
          quoteCount: quoteIds.length
        }
      });

    // --- End Authentication and Authorization ---

    // Fetch quotes and verify ownership
    const { data: quotes, error: quotesError } = await supabaseAdmin
      .from('quotes')
      .select('id, user_id, product_name, final_total, quantity, final_currency')
      .in('id', quoteIds);

    if (quotesError) {
      console.error('Error fetching quotes:', quotesError);
      return new Response(JSON.stringify({ error: 'Failed to fetch quotes' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

    if (!quotes || quotes.length === 0) {
      return new Response(JSON.stringify({ error: 'No quotes found for provided IDs' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

    // Verify ownership
    const quotesToUse = quotes.filter(quote => {
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
      return new Response(JSON.stringify({ error: 'Forbidden: You do not have access to all specified quotes.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Calculate total amount if not provided
    const totalAmount = amount || quotesToUse.reduce((sum, quote) => sum + (quote.final_total || 0), 0);
    const totalCurrency = currency || quotesToUse[0]?.final_currency || 'USD';

    let responseData: PaymentResponse;

    switch (gateway) {

      case 'payu':
        try {
          logger.info(EdgeLogCategory.PAYMENT_PROCESSING, 'Starting PayU payment creation', {
            paymentId,
            userId,
            metadata: { amount: totalAmount, currency: totalCurrency }
          });

          // Fetch PayU config from payment_gateways table
          const { data: payuGateway, error: payuGatewayError } = await paymentMonitoring.monitorGatewayCall(
            'fetch_payu_config',
            'payu',
            async () => {
              return await supabaseAdmin
                .from('payment_gateways')
                .select('config, test_mode')
                .eq('code', 'payu')
                .single();
            },
            paymentId
          );

          if (payuGatewayError || !payuGateway) {
            paymentMonitoring.completePaymentMonitoring(
              paymentId,
              false,
              EdgePaymentErrorCode.GATEWAY_CONFIGURATION_ERROR,
              'PayU gateway config missing'
            );
            return createErrorResponse(new Error('PayU gateway config missing'), 500, logger);
          }

          const config = payuGateway.config || {};
          const testMode = payuGateway.test_mode;
          const payuConfig = {
            merchant_key: config.merchant_key,
            salt_key: config.salt_key,
            payment_url: testMode ? 'https://test.payu.in/_payment' : 'https://secure.payu.in/_payment'
          };
          console.log('PayU config loaded successfully');
          if (!payuConfig.merchant_key || !payuConfig.salt_key) {
            paymentMonitoring.completePaymentMonitoring(
              paymentId,
              false,
              EdgePaymentErrorCode.GATEWAY_CONFIGURATION_ERROR,
              'PayU merchant key or salt key missing'
            );
            return createErrorResponse(new Error('PayU configuration missing'), 500, logger);
          }

          // Get India's exchange rate for USD to INR conversion
          const { data: indiaSettings, error: countryError } = await supabaseAdmin
            .from('country_settings')
            .select('rate_from_usd')
            .eq('code', 'IN')
            .single();

          if (countryError || !indiaSettings) {
            console.error('Error fetching India settings:', countryError);
            return new Response(JSON.stringify({ error: 'Failed to get exchange rate for INR conversion' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
          }

          // Check if amount is already in INR or needs conversion from USD
          const exchangeRate = indiaSettings.rate_from_usd;
          if (exchangeRate === null || exchangeRate === undefined) {
            console.error('Error: Exchange rate for INR conversion is missing.');
            return new Response(JSON.stringify({ error: 'Failed to get exchange rate for INR conversion' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
          }
          let amountInINR: number;
          
          if (totalCurrency === 'INR') {
            // Amount is already in INR, no conversion needed
            amountInINR = totalAmount;
            console.log(`Amount is already in INR: ${amountInINR}`);
          } else {
            // Convert from USD (or other currency) to INR
            amountInINR = totalAmount * exchangeRate;
            console.log(`Converting ${totalAmount} ${totalCurrency} to ${amountInINR} INR (rate: ${exchangeRate})`);
          }
          
          // Check minimum amount (PayU typically requires at least 1 INR)
          if (amountInINR < 1) {
            return new Response(JSON.stringify({ 
              error: 'Amount too small for PayU. Minimum amount is ₹1 INR.' 
            }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
          }

          // Get customer information from request or fetch from database
          let customerName = customerInfo?.name || 'Customer';
          let customerEmail = customerInfo?.email || 'customer@example.com';
          let customerPhone = customerInfo?.phone || '9999999999';

          // If customerInfo not provided, try to get from quotes
          if (!customerInfo && quotesToUse && quotesToUse.length > 0 && !quoteIds.some(id => id.startsWith('test-'))) {
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
              if (firstQuote.shipping_address && typeof firstQuote.shipping_address === 'object') {
                const shippingAddress = firstQuote.shipping_address as Record<string, unknown>;
                customerPhone = shippingAddress.phone || customerPhone;
              }
            }
          }

          // Generate unique transaction ID (PayU format: alphanumeric only)
          const txnid = `PAYU_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // Create product info with more details
          const productNames = quotesToUse.map(q => q.product_name || 'Product').join(', ');
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
            exchangeRate: totalCurrency === 'INR' ? 1 : exchangeRate
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
            udf1: guestSessionToken // Store guest session token in UDF1
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
            udf5: ''
          };

          // Log transaction details (non-sensitive)
          logger.info(EdgeLogCategory.PAYMENT_PROCESSING, 'PayU payment created successfully', {
            paymentId,
            userId,
            metadata: {
              transactionId: txnid,
              amountINR: amountInINR,
              originalAmount: totalAmount,
              originalCurrency: totalCurrency,
              exchangeRate: totalCurrency === 'INR' ? 1 : exchangeRate,
              testMode
            }
          });

          paymentMonitoring.completePaymentMonitoring(
            paymentId,
            true,
            undefined,
            undefined,
            {
              transactionId: txnid,
              gateway: 'payu',
              amountInINR,
              exchangeRate: totalCurrency === 'INR' ? 1 : exchangeRate
            }
          );
          
          responseData = { 
            success: true, 
            url: payuConfig.payment_url,
            method: 'POST',
            formData: payuRequest,
            transactionId: txnid,
            amountInINR: amountInINR,
            exchangeRate: totalCurrency === 'INR' ? 1 : exchangeRate,
            paymentId
          };
        } catch (error) {
          const errorCode = mapGatewayError('payu', error instanceof Error ? error : new Error('PayU error'));
          
          paymentMonitoring.completePaymentMonitoring(
            paymentId,
            false,
            errorCode,
            error instanceof Error ? error.message : 'PayU payment creation failed'
          );

          logger.error(
            EdgeLogCategory.PAYMENT_PROCESSING,
            'PayU payment creation failed',
            error instanceof Error ? error : new Error('PayU payment creation failed'),
            {
              paymentId,
              userId,
              metadata: { gateway: 'payu', amount: totalAmount, currency: totalCurrency }
            }
          );

          return createErrorResponse(
            error instanceof Error ? error : new Error('PayU payment creation failed'),
            500,
            logger,
            { gateway: 'payu', paymentId }
          );
        }
        break;

      case 'stripe':
        try {
          logger.info(EdgeLogCategory.PAYMENT_PROCESSING, 'Starting Stripe payment creation', {
            paymentId,
            userId,
            metadata: { amount: totalAmount, currency: totalCurrency }
          });

          // Fetch Stripe config from payment_gateways table
          const { data: stripeGateway, error: stripeGatewayError } = await paymentMonitoring.monitorGatewayCall(
            'fetch_stripe_config',
            'stripe',
            async () => {
              return await supabaseAdmin
                .from('payment_gateways')
                .select('config, test_mode')
                .eq('code', 'stripe')
                .single();
            },
            paymentId
          );

          if (stripeGatewayError || !stripeGateway) {
            paymentMonitoring.completePaymentMonitoring(
              paymentId,
              false,
              EdgePaymentErrorCode.GATEWAY_CONFIGURATION_ERROR,
              'Stripe gateway config missing'
            );
            return createErrorResponse(new Error('Stripe gateway config missing'), 500, logger);
          }

          const config = stripeGateway.config || {};
          const testMode = stripeGateway.test_mode;
          
          // Get the appropriate key based on test mode
          const stripeSecretKey = testMode 
            ? config.test_secret_key 
            : (config.live_secret_key || config.secret_key);
            
          if (!stripeSecretKey) {
            paymentMonitoring.completePaymentMonitoring(
              paymentId,
              false,
              EdgePaymentErrorCode.GATEWAY_CONFIGURATION_ERROR,
              'Stripe secret key not configured'
            );
            return createErrorResponse(new Error('Stripe secret key not configured in database'), 500, logger);
          }

          const stripe = new Stripe(stripeSecretKey, {
            apiVersion: config.api_version || '2023-10-16',
          });

          // Use secure enhanced Stripe payment creation with monitoring
          const result = await paymentMonitoring.monitorGatewayCall(
            'create_stripe_payment',
            'stripe',
            async () => {
              return await createStripePaymentEnhancedSecure({
                stripe,
                amount: totalAmount,
                currency: totalCurrency,
                quoteIds,
                userId: userId || 'guest',
                customerInfo,
                quotes: quotesToUse,
                supabaseAdmin
              });
            },
            paymentId
          );

          if (!result.success) {
            paymentMonitoring.completePaymentMonitoring(
              paymentId,
              false,
              EdgePaymentErrorCode.STRIPE_API_ERROR,
              result.error || 'Stripe payment creation failed'
            );
            return createErrorResponse(
              new Error(result.error || 'Stripe payment creation failed'),
              400,
              logger,
              { gateway: 'stripe', paymentId }
            );
          }

          logger.info(EdgeLogCategory.PAYMENT_PROCESSING, 'Stripe payment created successfully', {
            paymentId,
            userId,
            metadata: {
              transactionId: result.transactionId,
              customerId: result.customer_id,
              amount: totalAmount,
              currency: totalCurrency,
              testMode
            }
          });

          paymentMonitoring.completePaymentMonitoring(
            paymentId,
            true,
            undefined,
            undefined,
            {
              transactionId: result.transactionId,
              gateway: 'stripe',
              customerId: result.customer_id
            }
          );

          responseData = {
            success: result.success,
            client_secret: result.client_secret,
            transactionId: result.transactionId,
            customer_id: result.customer_id,
            paymentId
          };

        } catch (error) {
          const errorCode = mapGatewayError('stripe', error instanceof Error ? error : new Error('Stripe error'));
          
          paymentMonitoring.completePaymentMonitoring(
            paymentId,
            false,
            errorCode,
            error instanceof Error ? error.message : 'Stripe payment creation failed'
          );

          logger.error(
            EdgeLogCategory.PAYMENT_PROCESSING,
            'Stripe payment creation failed',
            error instanceof Error ? error : new Error('Stripe payment creation failed'),
            {
              paymentId,
              userId,
              metadata: { gateway: 'stripe', amount: totalAmount, currency: totalCurrency }
            }
          );

          return createErrorResponse(
            error instanceof Error ? error : new Error('Stripe payment creation failed'),
            500,
            logger,
            { gateway: 'stripe', paymentId }
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
            return new Response(JSON.stringify({ error: 'Airwallex gateway config missing' }), { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          const airwallexConfig = airwallexGateway.config || {};
          const airwallexTestMode = airwallexGateway.test_mode;
          
          // Extract API key and client ID from config
          const airwallexApiKey = airwallexTestMode 
            ? airwallexConfig.test_api_key 
            : (airwallexConfig.live_api_key || airwallexConfig.api_key);
            
          const airwallexClientId = airwallexConfig.client_id;
            
          if (!airwallexApiKey || !airwallexClientId) {
            return new Response(JSON.stringify({ error: 'Airwallex configuration incomplete' }), { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          // Secure debugging: Log credential metadata without exposing secrets
          const apiKeyHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(airwallexApiKey));
          const apiKeyHashHex = Array.from(new Uint8Array(apiKeyHash))
            .map(b => b.toString(16).padStart(2, '0'))
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
            selectedKeyType: airwallexTestMode ? 'test_api_key' : (airwallexConfig.live_api_key ? 'live_api_key' : 'api_key')
          });

          // Call the Airwallex API module to create payment intent
          const result = await createAirwallexPaymentIntent({
            apiKey: airwallexApiKey,
            clientId: airwallexClientId,
            testMode: airwallexTestMode,
            amount: totalAmount,
            currency: totalCurrency,
            quoteIds,
            userId: userId || 'guest',
            customerInfo,
            quotes: quotesToUse,
            supabaseAdmin
          });

          // Handle the result
          if (!result.success) {
            return new Response(JSON.stringify({ 
              error: result.error || 'Airwallex payment creation failed'
            }), { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          // Set response data from successful result
          responseData = {
            success: result.success,
            client_secret: result.client_secret,
            transactionId: result.transactionId,
            url: result.confirmationUrl,
            paymentIntentId: result.paymentIntentId,
            // Include airwallexData if present
            ...(result.airwallexData && { airwallexData: result.airwallexData })
          };

          console.log('Airwallex payment created successfully:', {
            transactionId: responseData.transactionId,
            paymentIntentId: result.paymentIntentId,
            url: responseData.url,
            hasClientSecret: !!responseData.client_secret
          });

        } catch (error) {
          console.error('Airwallex payment creation error:', error);
          return new Response(JSON.stringify({ 
            error: 'Airwallex payment creation failed', 
            details: error.message 
          }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
        }
        break;

      case 'bank_transfer':
      case 'cod':
        logger.info(EdgeLogCategory.PAYMENT_PROCESSING, `Manual payment method selected: ${gateway}`, {
          paymentId,
          userId,
          metadata: { amount: totalAmount, currency: totalCurrency }
        });

        paymentMonitoring.completePaymentMonitoring(
          paymentId,
          true,
          undefined,
          undefined,
          {
            gateway,
            paymentMethod: 'manual'
          }
        );

        // For manual methods, just return success without transactionId to avoid showing payment status tracker
        responseData = { success: true, paymentId };
        break;
      
      // TODO: Add cases for other payment gateways (eSewa, Khalti, etc.)

      default:
        paymentMonitoring.completePaymentMonitoring(
          paymentId,
          false,
          EdgePaymentErrorCode.PAYMENT_PROCESSING_FAILED,
          `Unsupported gateway: ${gateway}`
        );
        return createErrorResponse(new Error(`Unsupported gateway: ${gateway}`), 400, logger);
    }

    logger.info(EdgeLogCategory.PAYMENT_PROCESSING, 'Payment creation completed successfully', {
      paymentId,
      userId,
      metadata: {
        gateway,
        responseType: typeof responseData,
        hasTransactionId: !!(responseData.transactionId)
      }
    });

    return createSuccessResponse(responseData, 200, logger, { gateway, paymentId });

    } catch (error) {
      // Note: paymentRequest and paymentId may not be available in scope here
      logger.error(
        EdgeLogCategory.EDGE_FUNCTION,
        'Unexpected error in payment creation',
        error instanceof Error ? error : new Error('Unknown payment creation error')
      );

      return createErrorResponse(
        error instanceof Error ? error : new Error('Internal server error'),
        500,
        logger
      );
    }
  }, req);
    
    // Add CORS headers to the response from withEdgeMonitoring
    return addCorsHeaders(response);
  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
  
  // Helper function to add CORS headers to any response
  function addCorsHeaders(response: Response): Response {
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }
}) 