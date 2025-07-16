import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createCorsHeaders } from '../_shared/cors.ts'

interface RefundQueueItem {
  id: string
  payment_transaction_id: string
  quote_id: string
  gateway_code: string
  refund_amount: number
  currency: string
  refund_data: Record<string, unknown>
  status: string
  retry_count: number
  max_retries: number
  next_retry_at: string
  last_error?: string
  priority: string
}

serve(async (req) => {
  console.log("🔄 === PROCESS REFUND QUEUE FUNCTION STARTED ===")
  const corsHeaders = createCorsHeaders(req)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    })
  }

  try {
    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Optional: Check for authorization header to ensure only authorized services can trigger
    const authHeader = req.headers.get('authorization')
    const expectedToken = Deno.env.get('REFUND_QUEUE_SECRET')
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      console.error("❌ Unauthorized request to process refund queue")
      return new Response(JSON.stringify({ 
        error: 'Unauthorized' 
      }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Parse request body for optional parameters
    let batchSize = 10
    let gatewayCode = null
    
    if (req.method === 'POST') {
      try {
        const body = await req.json()
        batchSize = body.batchSize || 10
        gatewayCode = body.gatewayCode || null
      } catch (e) {
        // Ignore body parse errors, use defaults
      }
    }

    console.log(`🔄 Processing refund queue with batch size: ${batchSize}, gateway: ${gatewayCode || 'all'}`)

    // Call the database function to process pending refunds
    const { data: processResult, error: processError } = await supabaseAdmin
      .rpc('process_refund_retry_queue', {
        p_batch_size: batchSize,
        p_gateway_code: gatewayCode
      })

    if (processError) {
      console.error("❌ Error processing refund queue:", processError)
      return new Response(JSON.stringify({ 
        error: 'Failed to process refund queue',
        details: processError.message 
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`✅ Processed ${processResult?.length || 0} refunds from queue`)

    // Process each refund based on gateway
    const processedRefunds = []
    
    for (const queueItem of (processResult || [])) {
      console.log(`🔄 Processing queued refund ${queueItem.queue_id} with status: ${queueItem.status}`)
      
      // Skip if already processed by the database function
      if (queueItem.status === 'completed') {
        processedRefunds.push({
          queue_id: queueItem.queue_id,
          status: 'completed',
          message: 'Already processed by database function'
        })
        continue
      }

      // Get the full queue item details
      const { data: fullQueueItem, error: fetchError } = await supabaseAdmin
        .from('refund_retry_queue')
        .select('*')
        .eq('id', queueItem.queue_id)
        .single()

      if (fetchError || !fullQueueItem) {
        console.error(`❌ Failed to fetch queue item ${queueItem.queue_id}:`, fetchError)
        continue
      }

      // Process based on gateway
      try {
        let refundResult = null
        
        if (fullQueueItem.gateway_code === 'payu') {
          refundResult = await processPayURefund(supabaseAdmin, fullQueueItem)
        } else if (fullQueueItem.gateway_code === 'paypal') {
          refundResult = await processPayPalRefund(supabaseAdmin, fullQueueItem)
        } else {
          throw new Error(`Unsupported gateway: ${fullQueueItem.gateway_code}`)
        }

        if (refundResult.success) {
          // Update queue status to completed
          await supabaseAdmin.rpc('update_refund_retry_status', {
            p_queue_id: fullQueueItem.id,
            p_status: 'completed',
            p_gateway_refund_id: refundResult.refundId,
            p_processed_by: null // System processing
          })

          processedRefunds.push({
            queue_id: fullQueueItem.id,
            status: 'completed',
            refund_id: refundResult.refundId,
            message: refundResult.message
          })
        } else {
          // Update retry status
          await supabaseAdmin.rpc('update_refund_retry_status', {
            p_queue_id: fullQueueItem.id,
            p_status: 'failed',
            p_error_message: refundResult.error,
            p_processed_by: null
          })

          processedRefunds.push({
            queue_id: fullQueueItem.id,
            status: 'retry_scheduled',
            error: refundResult.error,
            next_retry: refundResult.nextRetry
          })
        }
      } catch (error) {
        console.error(`❌ Error processing refund ${fullQueueItem.id}:`, error)
        
        // Update retry status with error
        await supabaseAdmin.rpc('update_refund_retry_status', {
          p_queue_id: fullQueueItem.id,
          p_status: 'failed',
          p_error_message: error.message,
          p_processed_by: null
        })

        processedRefunds.push({
          queue_id: fullQueueItem.id,
          status: 'error',
          error: error.message
        })
      }
    }

    // Get queue statistics
    const { data: stats } = await supabaseAdmin
      .rpc('get_refund_retry_stats', {
        p_gateway_code: gatewayCode,
        p_days_back: 7
      })

    return new Response(JSON.stringify({
      success: true,
      processed: processedRefunds.length,
      results: processedRefunds,
      queue_stats: stats?.[0] || {},
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error("❌ Unexpected error:", error)
    return new Response(JSON.stringify({ 
      error: 'An unexpected error occurred',
      details: error.message 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// Process PayU refund from queue
async function processPayURefund(supabaseAdmin: SupabaseClient, queueItem: RefundQueueItem) {
  console.log(`🔵 Processing PayU refund from queue: ${queueItem.id}`)
  
  try {
    const refundData = queueItem.refund_data
    
    // Call the PayU refund function
    const response = await supabaseAdmin.functions.invoke('payu-refund', {
      body: {
        paymentId: refundData.paymentId,
        amount: queueItem.refund_amount,
        refundType: refundData.refundType || 'full',
        reason: refundData.reason,
        notes: refundData.notes,
        quoteId: queueItem.quote_id,
        notifyCustomer: refundData.notifyCustomer
      }
    })

    if (response.error) {
      throw new Error(response.error.message || 'PayU refund failed')
    }

    const result = response.data
    
    if (result.success) {
      return {
        success: true,
        refundId: result.refundId,
        message: result.message || 'Refund processed successfully'
      }
    } else {
      // Check if error is retryable
      const isRetryable = 
        result.error?.includes('timeout') ||
        result.error?.includes('network') ||
        result.error?.includes('503')
      
      return {
        success: false,
        error: result.error || 'Unknown error',
        isRetryable: isRetryable,
        nextRetry: isRetryable ? new Date(Date.now() + 5 * 60 * 1000).toISOString() : null
      }
    }
  } catch (error) {
    console.error("❌ PayU refund processing error:", error)
    return {
      success: false,
      error: error.message,
      isRetryable: true,
      nextRetry: new Date(Date.now() + 5 * 60 * 1000).toISOString()
    }
  }
}

// Process PayPal refund from queue
async function processPayPalRefund(supabaseAdmin: SupabaseClient, queueItem: RefundQueueItem) {
  console.log(`🟣 Processing PayPal refund from queue: ${queueItem.id}`)
  
  try {
    const refundData = queueItem.refund_data
    
    // Call the PayPal refund function
    const response = await supabaseAdmin.functions.invoke('paypal-refund', {
      body: {
        paymentTransactionId: refundData.paymentTransactionId,
        refundAmount: queueItem.refund_amount,
        currency: queueItem.currency,
        reason: refundData.reason,
        note: refundData.note,
        quoteId: queueItem.quote_id,
        userId: refundData.userId
      }
    })

    if (response.error) {
      throw new Error(response.error.message || 'PayPal refund failed')
    }

    const result = response.data
    
    if (result.success) {
      return {
        success: true,
        refundId: result.refundId,
        message: result.message || 'Refund processed successfully'
      }
    } else {
      // Check if error is retryable
      const isRetryable = 
        result.error?.includes('timeout') ||
        result.error?.includes('network') ||
        result.error?.includes('503') ||
        result.error?.includes('429')
      
      return {
        success: false,
        error: result.error || 'Unknown error',
        isRetryable: isRetryable,
        nextRetry: isRetryable ? new Date(Date.now() + 5 * 60 * 1000).toISOString() : null
      }
    }
  } catch (error) {
    console.error("❌ PayPal refund processing error:", error)
    return {
      success: false,
      error: error.message,
      isRetryable: true,
      nextRetry: new Date(Date.now() + 5 * 60 * 1000).toISOString()
    }
  }
}