import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { base64 } from "https://deno.land/x/base64@v0.2.1/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PayPalRefundRequest {
  paymentTransactionId: string
  refundAmount: number
  currency: string
  reason?: string
  note?: string
  quoteId?: string
  userId?: string
}

interface PayPalRefundResponse {
  success: boolean
  refundId?: string
  status?: string
  amount?: number
  currency?: string
  error?: string
  details?: any
}

// Get PayPal access token
async function getPayPalAccessToken(clientId: string, clientSecret: string, isLive: boolean): Promise<string> {
  const baseUrl = isLive ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'
  const auth = btoa(`${clientId}:${clientSecret}`)
  
  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${auth}`,
    },
    body: 'grant_type=client_credentials',
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`PayPal auth failed: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  return data.access_token
}

// Process PayPal refund
async function processPayPalRefund(
  accessToken: string,
  captureId: string,
  amount: number,
  currency: string,
  note: string,
  isLive: boolean
): Promise<any> {
  const baseUrl = isLive ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'
  
  const refundRequest = {
    amount: {
      value: amount.toFixed(2),
      currency_code: currency
    },
    note_to_payer: note || 'Refund processed by iwishBag'
  }
  
  console.log('📤 Sending refund request to PayPal:', JSON.stringify(refundRequest, null, 2))
  
  const response = await fetch(`${baseUrl}/v2/payments/captures/${captureId}/refund`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'PayPal-Request-Id': `iwishbag-refund-${Date.now()}`, // Idempotency key
    },
    body: JSON.stringify(refundRequest),
  })

  const responseText = await response.text()
  
  if (!response.ok) {
    console.error('❌ PayPal refund API error:', response.status, responseText)
    throw new Error(`PayPal refund failed: ${response.status} - ${responseText}`)
  }

  return JSON.parse(responseText)
}

serve(async (req) => {
  console.log("🟣 === PAYPAL REFUND FUNCTION STARTED ===")
  
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      console.error('❌ No authorization header')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Initialize Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse request body
    const refundRequest: PayPalRefundRequest = await req.json()
    console.log('🟣 Refund request:', {
      transactionId: refundRequest.paymentTransactionId,
      amount: refundRequest.refundAmount,
      currency: refundRequest.currency
    })

    // Validate required fields
    if (!refundRequest.paymentTransactionId || !refundRequest.refundAmount || !refundRequest.currency) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields: paymentTransactionId, refundAmount, currency'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get the original payment transaction details
    // The paymentTransactionId could be either the payment_transactions.id or the gateway_transaction_id
    let transaction = null
    let transactionError = null
    
    // First try to find by ID
    const { data: txById, error: errorById } = await supabaseAdmin
      .from('payment_transactions')
      .select('*')
      .eq('id', refundRequest.paymentTransactionId)
      .single()
    
    if (txById) {
      transaction = txById
    } else {
      // If not found by ID, try to find by gateway_transaction_id
      const { data: txByGatewayId, error: errorByGatewayId } = await supabaseAdmin
        .from('payment_transactions')
        .select('*')
        .eq('gateway_transaction_id', refundRequest.paymentTransactionId)
        .eq('gateway_code', 'paypal')
        .single()
      
      if (txByGatewayId) {
        transaction = txByGatewayId
      } else {
        transactionError = errorById || errorByGatewayId
      }
    }

    if (!transaction) {
      console.error('❌ Transaction not found:', transactionError)
      return new Response(JSON.stringify({
        success: false,
        error: 'Payment transaction not found'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('✅ Found transaction:', {
      id: transaction.id,
      gateway: transaction.gateway_code,
      gatewayTransactionId: transaction.gateway_transaction_id,
      amount: transaction.amount
    })

    // Validate it's a PayPal transaction
    if (transaction.gateway_code !== 'paypal') {
      return new Response(JSON.stringify({
        success: false,
        error: `Transaction is not a PayPal payment (gateway: ${transaction.gateway_code})`
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Validate refund amount doesn't exceed original amount
    const totalRefunded = transaction.refund_amount || 0
    if (totalRefunded + refundRequest.refundAmount > transaction.amount) {
      return new Response(JSON.stringify({
        success: false,
        error: `Refund amount exceeds available amount. Original: ${transaction.amount}, Already refunded: ${totalRefunded}, Requested: ${refundRequest.refundAmount}`
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get PayPal configuration
    const { data: paypalGateway, error: gatewayError } = await supabaseAdmin
      .from('payment_gateways')
      .select('config, test_mode')
      .eq('code', 'paypal')
      .eq('is_active', true)
      .single()

    if (gatewayError || !paypalGateway) {
      console.error('❌ PayPal gateway config missing:', gatewayError)
      return new Response(JSON.stringify({
        success: false,
        error: 'PayPal gateway configuration not found'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const config = paypalGateway.config || {}
    const isTestMode = paypalGateway.test_mode
    
    // Get appropriate credentials based on test mode
    const clientId = isTestMode ? config.client_id_sandbox : config.client_id_live
    const clientSecret = isTestMode ? config.client_secret_sandbox : config.client_secret_live
    
    if (!clientId || !clientSecret) {
      console.error('❌ PayPal credentials missing')
      return new Response(JSON.stringify({
        success: false,
        error: 'PayPal credentials not configured'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Extract capture ID from the gateway response
    // PayPal transaction could have order ID or capture ID
    let captureId = null
    const gatewayResponse = transaction.gateway_response || {}
    
    // Try to find capture ID in various places
    if (gatewayResponse.id) {
      captureId = gatewayResponse.id
    } else if (gatewayResponse.purchase_units?.[0]?.payments?.captures?.[0]?.id) {
      captureId = gatewayResponse.purchase_units[0].payments.captures[0].id
    } else if (transaction.gateway_transaction_id) {
      // Might be the capture ID directly
      captureId = transaction.gateway_transaction_id
    }

    if (!captureId) {
      console.error('❌ No capture ID found in transaction')
      return new Response(JSON.stringify({
        success: false,
        error: 'Could not find PayPal capture ID in transaction data'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('🔑 Using capture ID:', captureId)

    // Get PayPal access token
    console.log('🔑 Getting PayPal access token...')
    const accessToken = await getPayPalAccessToken(clientId, clientSecret, !isTestMode)
    console.log('✅ PayPal access token obtained')

    // Process the refund
    console.log('💰 Processing refund...')
    const refundResponse = await processPayPalRefund(
      accessToken,
      captureId,
      refundRequest.refundAmount,
      refundRequest.currency,
      refundRequest.note || refundRequest.reason || 'Refund processed',
      !isTestMode
    )
    
    console.log('✅ PayPal refund response:', JSON.stringify(refundResponse, null, 2))

    // Store refund in gateway_refunds table
    const { data: gatewayRefund, error: refundError } = await supabaseAdmin
      .from('gateway_refunds')
      .insert({
        gateway_refund_id: refundResponse.id,
        gateway_code: 'paypal',
        payment_transaction_id: refundRequest.paymentTransactionId,
        refund_amount: refundRequest.refundAmount,
        original_amount: transaction.amount,
        currency: refundRequest.currency,
        refund_type: refundRequest.refundAmount === transaction.amount ? 'FULL' : 'PARTIAL',
        status: refundResponse.status || 'COMPLETED',
        gateway_response: refundResponse,
        refund_reason: refundRequest.reason,
        notes: refundRequest.note,
        processed_by: refundRequest.userId,
        processed_at: new Date().toISOString()
      })
      .select()
      .single()

    if (refundError) {
      console.error('⚠️ Failed to store refund record:', refundError)
      // Don't fail the refund, just log the error
    }

    // Update payment transaction with refund info
    const { error: updateError } = await supabaseAdmin
      .from('payment_transactions')
      .update({
        refund_amount: (transaction.refund_amount || 0) + refundRequest.refundAmount,
        refund_count: (transaction.refund_count || 0) + 1,
        last_refund_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', refundRequest.paymentTransactionId)

    if (updateError) {
      console.error('⚠️ Failed to update transaction:', updateError)
    }

    // Return success response
    const response: PayPalRefundResponse = {
      success: true,
      refundId: refundResponse.id,
      status: refundResponse.status,
      amount: refundRequest.refundAmount,
      currency: refundRequest.currency,
      details: {
        paypalRefundId: refundResponse.id,
        paypalStatus: refundResponse.status,
        createTime: refundResponse.create_time,
        updateTime: refundResponse.update_time,
        links: refundResponse.links
      }
    }

    console.log('🎉 PayPal refund successful')
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('❌ PayPal refund error:', error)
    
    const response: PayPalRefundResponse = {
      success: false,
      error: error.message || 'Failed to process PayPal refund',
      details: error
    }

    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})