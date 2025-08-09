import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🔄 Starting payment reminder job...')

    // Get orders awaiting payment (bank transfer method, created in last 72 hours)
    const threeDaysAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()
    
    const { data: pendingOrders, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        customer_email,
        customer_phone,
        total_amount,
        currency,
        payment_method,
        created_at,
        customer_data,
        messages (
          id,
          message_type,
          verification_status,
          created_at
        )
      `)
      .eq('payment_method', 'bank_transfer')
      .in('status', ['pending_payment', 'awaiting_payment'])
      .gte('created_at', threeDaysAgo)

    if (orderError) {
      throw new Error(`Failed to fetch pending orders: ${orderError.message}`)
    }

    console.log(`📊 Found ${pendingOrders?.length || 0} orders awaiting payment`)

    if (!pendingOrders || pendingOrders.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No orders require reminders', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let remindersSent = 0

    for (const order of pendingOrders) {
      try {
        const orderAge = Date.now() - new Date(order.created_at).getTime()
        const hoursOld = Math.floor(orderAge / (1000 * 60 * 60))
        
        // Check if payment proof already uploaded
        const hasPaymentProof = order.messages?.some(m => 
          m.message_type === 'payment_proof' && 
          ['pending', 'verified', 'confirmed'].includes(m.verification_status)
        )

        if (hasPaymentProof) {
          console.log(`⏭️  Order ${order.order_number} already has payment proof, skipping`)
          continue
        }

        // Send simple reminder after 24 hours only
        let reminderType = 'payment_reminder'
        let shouldSend = hoursOld >= 24 && hoursOld < 26

        if (!shouldSend) {
          continue
        }

        // Check if we've already sent this type of reminder
        const { data: existingReminders } = await supabase
          .from('notification_logs')
          .select('id')
          .eq('order_id', order.id)
          .eq('notification_type', reminderType)
          .limit(1)

        if (existingReminders && existingReminders.length > 0) {
          console.log(`📧 Already sent ${reminderType} for order ${order.order_number}`)
          continue
        }

        // Simple reminder content
        const customerName = order.customer_data?.name || order.customer_data?.full_name || 'Valued Customer'
        const paymentUrl = `https://iwishbag.com/order-confirmation/${order.id}`
        
        const content = {
          subject: `Payment Reminder - Order ${order.order_number}`,
          message: `Hi ${customerName}! Just a friendly reminder to complete your payment for order ${order.order_number}.`
        }

        // Send Email Reminder
        if (order.customer_email) {
          try {
            const emailData = {
              to: order.customer_email,
              subject: content.subject,
              html: generateEmailHTML(order, content, paymentUrl),
              from: 'orders@iwishbag.com'
            }

            const { error: emailError } = await supabase.functions.invoke('send-email-ses', {
              body: emailData
            })

            if (emailError) {
              console.error(`❌ Email failed for order ${order.order_number}:`, emailError.message)
            } else {
              console.log(`📧 Email sent for order ${order.order_number}`)
              remindersSent++
            }
          } catch (error) {
            console.error(`❌ Email error for order ${order.order_number}:`, error.message)
          }
        }

        // Send SMS Reminder (if phone available)
        if (order.customer_phone) {
          try {
            const smsMessage = `${content.message}\n\nUpload payment proof: ${paymentUrl}\n\niwishBag Team`

            const { error: smsError } = await supabase.functions.invoke('send-sms', {
              body: {
                to: order.customer_phone,
                message: smsMessage
              }
            })

            if (smsError) {
              console.error(`❌ SMS failed for order ${order.order_number}:`, smsError.message)
            } else {
              console.log(`📱 SMS sent for order ${order.order_number}`)
            }
          } catch (error) {
            console.error(`❌ SMS error for order ${order.order_number}:`, error.message)
          }
        }

        // Log the notification
        await supabase.from('notification_logs').insert({
          order_id: order.id,
          notification_type: reminderType,
          recipient_email: order.customer_email,
          recipient_phone: order.customer_phone,
          sent_at: new Date().toISOString(),
          content: content.subject
        })

      } catch (error) {
        console.error(`❌ Error processing order ${order.order_number}:`, error.message)
      }
    }

    console.log(`✅ Payment reminder job completed. Sent ${remindersSent} reminders.`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Payment reminders job completed`,
        orders_processed: pendingOrders.length,
        reminders_sent: remindersSent
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Payment reminder job failed:', error.message)
    return new Response(
      JSON.stringify({ 
        error: 'Payment reminder job failed', 
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function generateEmailHTML(order: any, content: any, paymentUrl: string): string {
  const amount = order.total_amount?.toFixed(2) || '0.00'
  const currency = order.currency || 'USD'
  
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${content.subject}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f8f9fa; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 24px; }
        .content { padding: 30px; }
        .order-info { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .cta-button { display: inline-block; background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
        .urgent { border-left: 4px solid #ffc107; padding-left: 15px; margin: 20px 0; background: #fff9c4; padding: 15px; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛍️ iwishBag</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Your Global Shopping Partner</p>
        </div>
        
        <div class="content">
            <h2>Hi ${order.customer_data?.name || 'Valued Customer'}! 👋</h2>
            
            <p>${content.message}</p>
            
            <div class="order-info">
                <h3>📦 Order Details</h3>
                <p><strong>Order Number:</strong> ${order.order_number}</p>
                <p><strong>Amount:</strong> ${amount} ${currency}</p>
                <p><strong>Payment Method:</strong> Bank Transfer</p>
            </div>
            
            ${content.subject.includes('Final') ? `
            <div class="urgent">
                <h3>⚡ Urgent Action Required</h3>
                <p>Your order will be automatically cancelled if payment is not completed within 24 hours.</p>
            </div>
            ` : ''}
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${paymentUrl}" class="cta-button">${content.cta}</a>
            </div>
            
            <div style="background: #e3f2fd; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <h4>🚀 Quick Tips:</h4>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>Upload a clear photo of your payment receipt</li>
                    <li>Include transaction reference number</li>
                    <li>Our team verifies payments within 2-4 hours</li>
                </ul>
            </div>
            
            <p>Need help? Reply to this email or WhatsApp us at <strong>+977-9800000000</strong></p>
            
            <p>Thanks for choosing iwishBag! 🌟</p>
        </div>
        
        <div class="footer">
            <p>iwishBag - Shop the world, delivered to your doorstep</p>
            <p>15 Ekantakuna, Ring Road, Lalitpur 44700, Nepal</p>
            <p><a href="${paymentUrl}">Complete Payment</a> | <a href="https://iwishbag.com/support">Get Help</a></p>
        </div>
    </div>
</body>
</html>
  `.trim()
}