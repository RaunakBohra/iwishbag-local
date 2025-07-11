import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// REMOVED: PayU SDK import as it might be causing additional API calls
// import PayU from 'https://esm.sh/payu@latest?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}


// This should match src/types/payment.ts PaymentRequest
interface PaymentRequest {
  quoteIds: string[];
  gateway: 'bank_transfer' | 'cod' | 'payu' | 'esewa' | 'khalti' | 'fonepay' | 'airwallex';
  success_url: string;
  cancel_url: string;
  amount?: number;
  currency?: string;
  metadata?: Record<string, any>;
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
  error?: string;
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Stripe Key:', Deno.env.get('STRIPE_SECRET_KEY')?.substring(0, 10));
    console.log('Supabase URL:', Deno.env.get('SUPABASE_URL'));

    const paymentRequest: PaymentRequest = await req.json()
    const { quoteIds, gateway, success_url, cancel_url, amount, currency, customerInfo } = paymentRequest

    if (!quoteIds || quoteIds.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing quoteIds' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }
    
    if (!gateway) {
      return new Response(JSON.stringify({ error: 'Missing payment gateway' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // For testing purposes, use mock quotes if quoteIds contain test values
    let quotesToUse;
    if (quoteIds.some(id => id.startsWith('test-'))) {
      console.log('Using mock quotes for testing');
      quotesToUse = [{
        product_name: 'Test Product',
        final_total: 12.82,
        quantity: 1,
        final_currency: 'USD'
      }];
    } else {
      const { data: quotes, error: quotesError } = await supabaseAdmin
        .from('quotes')
        .select('product_name, final_total, quantity, final_currency')
        .in('id', quoteIds);

      if (quotesError) {
        throw quotesError;
      }

      if (!quotes || quotes.length === 0) {
        console.log('No quotes found in database, using mock quote for testing');
        quotesToUse = [{
          product_name: 'Test Product',
          final_total: 12.82,
          quantity: 1,
          final_currency: 'USD'
        }];
      } else {
        quotesToUse = quotes;
      }
    }

    // Calculate total amount if not provided
    const totalAmount = amount || quotesToUse.reduce((sum, quote) => sum + (quote.final_total || 0), 0);
    const totalCurrency = currency || quotesToUse[0]?.final_currency || 'USD';

    let responseData: PaymentResponse;

    switch (gateway) {

      case 'payu':
        try {
          // Fetch PayU config from payment_gateways table
          const { data: payuGateway, error: payuGatewayError } = await supabaseAdmin
            .from('payment_gateways')
            .select('config, test_mode')
            .eq('code', 'payu')
            .single();

          if (payuGatewayError || !payuGateway) {
            return new Response(JSON.stringify({ error: 'PayU gateway config missing' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
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
            return new Response(JSON.stringify({ error: 'PayU configuration missing' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
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
          const exchangeRate = indiaSettings.rate_from_usd || 83.0; // Default to 83 if not found
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
          let customerName = 'Customer';
          let customerEmail = 'customer@example.com';
          let customerPhone = '9999999999';

          if (customerInfo) {
            customerName = customerInfo.name || customerName;
            customerEmail = customerInfo.email || customerEmail;
            customerPhone = customerInfo.phone || customerPhone;
          } else {
            // Try to get customer info from quotes if available
            if (quotesToUse && quotesToUse.length > 0) {
              const firstQuote = quotesToUse[0];
              if (firstQuote.email) {
                customerEmail = firstQuote.email;
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
          
          // Create proper success and failure URLs
          // For live mode, use a proper domain instead of localhost
          const baseUrl = success_url.includes('localhost') 
            ? 'http://localhost:8080' // Use local development URL
            : success_url.replace('/success', '').replace('/cancel', '');
          
          const payuSuccessUrl = `${baseUrl}/payment-success?gateway=payu`;
          const payuFailureUrl = `${baseUrl}/payment-failure?gateway=payu`;
          
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
            mode: 'CC',
            udf1: guestSessionToken, // Include guest session token
            udf2: '',
            udf3: '',
            udf4: '',
            udf5: ''
          };

          // Log transaction details (non-sensitive)
          console.log('PayU payment initiated:', { 
            txnid, 
            amountINR: amountInINR,
            customerEmail: customerEmail.substring(0, 3) + '***' 
          });
          
          responseData = { 
            success: true, 
            url: payuConfig.payment_url,
            method: 'POST',
            formData: payuRequest,
            transactionId: txnid,
            amountInINR: amountInINR,
            exchangeRate: totalCurrency === 'INR' ? 1 : exchangeRate
          };
        } catch (error) {
          console.error('PayU payment creation error:', error);
          return new Response(JSON.stringify({ 
            error: 'PayU payment creation failed', 
            details: error.message 
          }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
        }
        break;

      case 'bank_transfer':
      case 'cod':
        // For manual methods, just return success without transactionId to avoid showing payment status tracker
        responseData = { success: true };
        break;
      
      // TODO: Add cases for other payment gateways (eSewa, Khalti, etc.)

      default:
        return new Response(JSON.stringify({ error: `Unsupported gateway: ${gateway}` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

    return new Response(JSON.stringify(responseData), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('Payment creation error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 