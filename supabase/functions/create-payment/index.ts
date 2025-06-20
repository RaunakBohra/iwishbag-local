import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from "https://esm.sh/stripe@11.16.0";
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface PaymentRequest {
  quoteIds: string[]
  currency: string
  amount: number
  gateway: string
  success_url: string
  cancel_url: string
  metadata?: Record<string, any>
}

interface PaymentResponse {
  success: boolean
  url?: string
  qr_code?: string
  transaction_id?: string
  error?: string
  fallback_methods?: string[]
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { quoteIds, currency, amount, gateway, success_url, cancel_url, metadata = {} }: PaymentRequest = await req.json()

    // Validate input
    if (!quoteIds || !currency || !amount || !gateway) {
      throw new Error('Missing required parameters')
    }

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    let user: any; // Define user object

    // If the service_role key is used, bypass JWT auth and get user from metadata
    if (token === Deno.env.get('CREATE_PAYMENT_SERVICE_KEY')) {
      console.log('Service role key detected, bypassing user auth.');
      if (!metadata.user_id) {
        throw new Error('user_id must be provided in metadata when using service role');
      }
      user = { id: metadata.user_id, email: metadata.user_email };
    } else {
      // Otherwise, validate the user JWT for client-side requests
      const { data: { user: jwtUser }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !jwtUser) {
        throw new Error('Invalid JWT for user authentication');
      }
      user = jwtUser;
    }

    if (!user) {
      throw new Error('Authentication failed');
    }

    // Get country settings for user
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('preferred_display_currency, country')
      .eq('id', user.id)
      .single()

    const countryCode = userProfile?.country || 'US'
    
    // Get available payment methods for country
    const availableGateways = await getAvailableGateways(countryCode, currency)
    
    if (!availableGateways.includes(gateway)) {
      return new Response(JSON.stringify({
        success: false,
        error: `Payment method ${gateway} not available for ${countryCode}`,
        fallback_methods: availableGateways
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    // Create payment transaction record
    const { data: transaction, error: transactionError } = await supabase
      .from('payment_transactions')
      .insert({
        quote_id: quoteIds[0], // For now, handle single quote
        gateway_code: gateway,
        amount: amount,
        currency: currency,
        status: 'pending',
        gateway_response: { metadata }
      })
      .select()
      .single()

    if (transactionError) {
      console.error(`[create-payment] FAILED to create transaction. Error:`, transactionError)
      throw new Error(`Failed to create transaction: ${transactionError.message}`)
    }
    console.log(`[create-payment] Created transaction record with ID: ${transaction.id}`);

    // Process payment based on gateway
    let paymentResponse: PaymentResponse

    switch (gateway) {
      case 'stripe':
        paymentResponse = await createStripePayment(transaction, success_url, cancel_url, user)
        break
      case 'payu':
        paymentResponse = await createPayUPayment(transaction, success_url, cancel_url)
        break
      case 'esewa':
        paymentResponse = await createEsewaPayment(transaction, success_url, cancel_url)
        break
      case 'khalti':
        paymentResponse = await createKhaltiPayment(transaction, success_url, cancel_url)
        break
      case 'fonepay':
        paymentResponse = await createFonepayPayment(transaction, success_url, cancel_url)
        break
      case 'airwallex':
        paymentResponse = await createAirwallexPayment(transaction, success_url, cancel_url)
        break
      default:
        throw new Error(`Unsupported payment gateway: ${gateway}`)
    }
    
    console.log(`[create-payment] Received payment response from gateway '${gateway}':`, paymentResponse);
    if (gateway === 'stripe') {
      console.log(`[create-payment] Stripe Session ID (to be saved): ${paymentResponse.transaction_id}`);
    }

    // Update transaction with gateway response
    console.log(`[create-payment] Attempting to update transaction ID ${transaction.id} with gateway transaction ID ${paymentResponse.transaction_id}`);
    const { error: updateError } = await supabase
      .from('payment_transactions')
      .update({
        gateway_transaction_id: paymentResponse.transaction_id,
        gateway_response: paymentResponse,
        status: paymentResponse.success ? 'processing' : 'failed',
        error_message: paymentResponse.error
      })
      .eq('id', transaction.id)

    if (updateError) {
      console.error(`[create-payment] FAILED to update transaction ${transaction.id}. Error:`, updateError)
      throw new Error(`Failed to update transaction with gateway info: ${updateError.message}`)
    }

    console.log(`[create-payment] Successfully updated transaction ${transaction.id}. Verifying...`);
    const { data: updatedTransaction, error: verifyError } = await supabase
      .from('payment_transactions')
      .select('id, gateway_transaction_id')
      .eq('id', transaction.id)
      .single();
  
    if (verifyError) {
      console.error(`[create-payment] VERIFICATION FAILED. Error fetching transaction after update:`, verifyError);
    } else if (updatedTransaction?.gateway_transaction_id !== paymentResponse.transaction_id) {
      console.error(`[create-payment] VERIFICATION FAILED. ID mismatch after update. Expected ${paymentResponse.transaction_id}, got ${updatedTransaction?.gateway_transaction_id}`);
    } else {
      console.log(`[create-payment] VERIFICATION SUCCEEDED. DB contains correct gateway_transaction_id.`);
    }

    return new Response(JSON.stringify(paymentResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: paymentResponse.success ? 200 : 400
    })

  } catch (error) {
    console.error('Payment creation error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      fallback_methods: ['bank_transfer', 'cod']
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})

async function getAvailableGateways(countryCode: string, currency: string): Promise<string[]> {
  const { data: gateways } = await supabase
    .from('payment_gateways')
    .select('code, supported_countries, supported_currencies, is_active')
    .eq('is_active', true)

  if (!gateways) return ['bank_transfer', 'cod']

  return gateways
    .filter(gateway => 
      gateway.supported_countries.includes(countryCode) &&
      gateway.supported_currencies.includes(currency)
    )
    .map(gateway => gateway.code)
    .concat(['bank_transfer', 'cod']) // Always include fallback methods
}

async function createStripePayment(transaction: any, success_url: string, cancel_url: string, user: any): Promise<PaymentResponse> {
  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      httpClient: Stripe.createFetchHttpClient(),
      apiVersion: '2023-10-16',
    });

    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: transaction.currency.toLowerCase(),
          product_data: {
            name: `Quote Payment - ${transaction.quote_id}`,
          },
          unit_amount: Math.round(transaction.amount * 100), // Convert to cents
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${success_url.split('?')[0]}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url,
      metadata: {
        transaction_id: transaction.id,
        quote_id: transaction.quote_id
      }
    })

    return {
      success: true,
      url: session.url,
      transaction_id: session.id
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      fallback_methods: ['bank_transfer', 'cod']
    }
  }
}

async function createPayUPayment(transaction: any, success_url: string, cancel_url: string): Promise<PaymentResponse> {
  try {
    const payuConfig = {
      merchant_key: Deno.env.get('PAYU_MERCHANT_KEY')!,
      salt_key: Deno.env.get('PAYU_SALT_KEY')!,
      merchant_id: Deno.env.get('PAYU_MERCHANT_ID')!
    }

    // PayU integration logic here
    // This would typically involve creating a payment form with hash verification
    
    return {
      success: true,
      url: `${Deno.env.get('PAYU_PAYMENT_URL')}?txnid=${transaction.id}&amount=${transaction.amount}&currency=${transaction.currency}`,
      transaction_id: transaction.id
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      fallback_methods: ['bank_transfer', 'cod']
    }
  }
}

async function createEsewaPayment(transaction: any, success_url: string, cancel_url: string): Promise<PaymentResponse> {
  try {
    const esewaConfig = {
      merchant_id: Deno.env.get('ESEWA_MERCHANT_ID')!,
      merchant_key: Deno.env.get('ESEWA_MERCHANT_KEY')!
    }

    // Generate QR code for eSewa payment
    const qrData = {
      merchant_id: esewaConfig.merchant_id,
      amount: transaction.amount,
      transaction_id: transaction.id,
      success_url: success_url,
      failure_url: cancel_url
    }

    // Generate QR code (you'll need a QR code library)
    const qrCode = await generateQRCode(JSON.stringify(qrData))

    return {
      success: true,
      qr_code: qrCode,
      transaction_id: transaction.id
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      fallback_methods: ['khalti', 'fonepay', 'bank_transfer', 'cod']
    }
  }
}

async function createKhaltiPayment(transaction: any, success_url: string, cancel_url: string): Promise<PaymentResponse> {
  try {
    const khaltiConfig = {
      public_key: Deno.env.get('KHALTI_PUBLIC_KEY')!,
      secret_key: Deno.env.get('KHALTI_SECRET_KEY')!
    }

    // Generate QR code for Khalti payment
    const qrData = {
      public_key: khaltiConfig.public_key,
      amount: transaction.amount * 100, // Khalti expects amount in paisa
      transaction_id: transaction.id,
      success_url: success_url,
      failure_url: cancel_url
    }

    const qrCode = await generateQRCode(JSON.stringify(qrData))

    return {
      success: true,
      qr_code: qrCode,
      transaction_id: transaction.id
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      fallback_methods: ['esewa', 'fonepay', 'bank_transfer', 'cod']
    }
  }
}

async function createFonepayPayment(transaction: any, success_url: string, cancel_url: string): Promise<PaymentResponse> {
  try {
    const fonepayConfig = {
      merchant_id: Deno.env.get('FONEPAY_MERCHANT_ID')!,
      merchant_key: Deno.env.get('FONEPAY_MERCHANT_KEY')!
    }

    // Generate QR code for Fonepay payment
    const qrData = {
      merchant_id: fonepayConfig.merchant_id,
      amount: transaction.amount,
      transaction_id: transaction.id,
      success_url: success_url,
      failure_url: cancel_url
    }

    const qrCode = await generateQRCode(JSON.stringify(qrData))

    return {
      success: true,
      qr_code: qrCode,
      transaction_id: transaction.id
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      fallback_methods: ['esewa', 'khalti', 'bank_transfer', 'cod']
    }
  }
}

async function createAirwallexPayment(transaction: any, success_url: string, cancel_url: string): Promise<PaymentResponse> {
  try {
    const airwallexConfig = {
      api_key: Deno.env.get('AIRWALLEX_API_KEY')!,
      client_id: Deno.env.get('AIRWALLEX_CLIENT_ID')!
    }

    // Airwallex integration logic here
    // This would involve creating a payment intent and redirecting to Airwallex checkout

    return {
      success: true,
      url: `${Deno.env.get('AIRWALLEX_PAYMENT_URL')}?intent_id=${transaction.id}`,
      transaction_id: transaction.id
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      fallback_methods: ['stripe', 'bank_transfer']
    }
  }
}

async function generateQRCode(data: string): Promise<string> {
  // In a real implementation, you would use a library like 'qrcode'
  // For this example, we'll return a placeholder string
  return `QR_CODE_FOR:${data}`;
} 