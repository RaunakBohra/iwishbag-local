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
    const { orderId, type } = await req.json()

    if (!orderId) {
      throw new Error('Order ID is required')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        customer_email,
        customer_phone,
        total_amount,
        currency,
        customer_data,
        payment_method
      `)
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      throw new Error('Order not found')
    }

    // Get bank account details for the currency
    const { data: bankAccounts, error: bankError } = await supabase
      .from('bank_account_details')
      .select('*')
      .eq('is_active', true)
      .or(`currency_code.eq.${order.currency},currency_code.is.null`)
      .order('is_fallback', { ascending: false })
      .limit(1)

    if (bankError || !bankAccounts || bankAccounts.length === 0) {
      throw new Error('No bank account found for currency')
    }

    const bankAccount = bankAccounts[0]
    const customerName = order.customer_data?.name || order.customer_data?.full_name || 'Valued Customer'
    const amount = order.total_amount?.toFixed(2) || '0.00'

    let emailSent = false
    let smsSent = false

    // Send Email with Bank Details
    if (order.customer_email && type !== 'sms_only') {
      try {
        const emailHTML = generateBankDetailsEmail(order, bankAccount, customerName, amount)
        
        const { error: emailError } = await supabase.functions.invoke('send-email-ses', {
          body: {
            to: order.customer_email,
            subject: `Payment Instructions - Order ${order.order_number}`,
            html: emailHTML,
            from: 'orders@iwishbag.com'
          }
        })

        if (!emailError) {
          emailSent = true
          console.log(`📧 Bank details email sent for order ${order.order_number}`)
        } else {
          console.error('Email error:', emailError.message)
        }
      } catch (error) {
        console.error('Email sending failed:', error.message)
      }
    }

    // Send SMS Notification
    if (order.customer_phone && type !== 'email_only') {
      try {
        const smsMessage = `Hi ${customerName}! Your iwishBag order ${order.order_number} is confirmed and awaiting payment via bank transfer. Amount: ${amount} ${order.currency}. Check your email for bank details or visit: https://iwishbag.com/order-confirmation/${order.id}`

        const { error: smsError } = await supabase.functions.invoke('send-sms', {
          body: {
            to: order.customer_phone,
            message: smsMessage
          }
        })

        if (!smsError) {
          smsSent = true
          console.log(`📱 SMS notification sent for order ${order.order_number}`)
        } else {
          console.error('SMS error:', smsError.message)
        }
      } catch (error) {
        console.error('SMS sending failed:', error.message)
      }
    }

    // Log notification
    await supabase.from('notification_logs').insert({
      order_id: order.id,
      notification_type: 'bank_transfer_instructions',
      recipient_email: order.customer_email,
      recipient_phone: order.customer_phone,
      content: `Bank transfer instructions for order ${order.order_number}`,
      metadata: { email_sent: emailSent, sms_sent: smsSent }
    })

    return new Response(
      JSON.stringify({ 
        success: true,
        email_sent: emailSent,
        sms_sent: smsSent,
        message: 'Payment instructions sent successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Notification sending failed:', error.message)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send payment instructions', 
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function generateBankDetailsEmail(order: any, bankAccount: any, customerName: string, amount: string): string {
  const currency = order.currency || 'USD'
  
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Instructions - Order ${order.order_number}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f8f9fa; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: #667eea; padding: 30px; text-align: center; color: white; }
        .content { padding: 30px; }
        .bank-details { background: #f8f9fa; border: 2px dashed #dee2e6; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .amount-box { background: #d4edda; border: 1px solid #c3e6cb; border-radius: 6px; padding: 15px; text-align: center; margin: 20px 0; }
        .qr-section { text-align: center; margin: 20px 0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
        .important { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 15px; margin: 15px 0; }
        table { width: 100%; }
        .label { font-weight: bold; padding: 8px 0; color: #495057; }
        .value { padding: 8px 0; font-family: monospace; background: #f8f9fa; padding: 8px; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛍️ iwishBag</h1>
            <h2>Payment Instructions</h2>
        </div>
        
        <div class="content">
            <h3>Hi ${customerName}! 👋</h3>
            
            <p>Your order has been confirmed and is awaiting payment via bank transfer.</p>
            
            <div class="amount-box">
                <h3>💰 Amount to Pay: <strong>${amount} ${currency}</strong></h3>
                <p>Order: <strong>${order.order_number}</strong></p>
            </div>
            
            <div class="bank-details">
                <h3>🏦 Bank Transfer Details:</h3>
                <table>
                    <tr>
                        <td class="label">Bank Name:</td>
                        <td class="value">${bankAccount.bank_name}</td>
                    </tr>
                    <tr>
                        <td class="label">Account Name:</td>
                        <td class="value">${bankAccount.account_name}</td>
                    </tr>
                    <tr>
                        <td class="label">Account Number:</td>
                        <td class="value">${bankAccount.account_number}</td>
                    </tr>
                    ${bankAccount.swift_code ? `
                    <tr>
                        <td class="label">SWIFT Code:</td>
                        <td class="value">${bankAccount.swift_code}</td>
                    </tr>
                    ` : ''}
                    ${bankAccount.routing_number ? `
                    <tr>
                        <td class="label">Routing Number:</td>
                        <td class="value">${bankAccount.routing_number}</td>
                    </tr>
                    ` : ''}
                    <tr>
                        <td class="label">Payment Reference:</td>
                        <td class="value">${order.order_number}</td>
                    </tr>
                </table>
            </div>

            ${bankAccount.payment_qr_url ? `
            <div class="qr-section">
                <h3>📱 Or Pay by Scanning QR Code:</h3>
                <img src="${bankAccount.payment_qr_url}" alt="Payment QR Code" style="max-width: 200px; height: auto;">
                <p><strong>${amount} ${currency}</strong></p>
            </div>
            ` : ''}
            
            <div class="important">
                <h4>📋 Next Steps:</h4>
                <ol>
                    <li>Transfer the exact amount: <strong>${amount} ${currency}</strong></li>
                    <li>Use <strong>${order.order_number}</strong> as payment reference</li>
                    <li>Upload payment proof at: <a href="https://iwishbag.com/order-confirmation/${order.id}">Upload Receipt</a></li>
                    <li>We'll verify and process your order within 2-4 hours</li>
                </ol>
            </div>
            
            <p>Need help? Reply to this email or contact us:</p>
            <ul>
                <li>📞 Phone: +977-9800000000</li>
                <li>💬 WhatsApp: +977-9800000000</li>
                <li>📧 Email: support@iwishbag.com</li>
            </ul>
            
            <p>Thank you for choosing iwishBag! 🌟</p>
        </div>
        
        <div class="footer">
            <p>iwishBag - Shop the world, delivered to your doorstep</p>
            <p>15 Ekantakuna, Ring Road, Lalitpur 44700, Nepal</p>
        </div>
    </div>
</body>
</html>
  `.trim()
}