import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email } = await req.json()

    if (!email) {
      throw new Error('Email address is required')
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Create test quote data
    const testQuote = {
      id: 'test-quote-id',
      quote_number: 'IWB2025TEST',
      customer_name: 'Test Customer',
      customer_email: email,
      customer_currency: 'USD',
      total_customer_currency: 299.99,
      total_usd: 299.99,
      share_token: 'test-share-token',
      reminder_count: 1,
      expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    }

    const shareUrl = `${Deno.env.get('PUBLIC_SITE_URL') || 'https://iwishbag.com'}/quote/view/${testQuote.share_token}`

    // Generate email HTML
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Test Reminder Email</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #f0f0f0; padding: 10px; border-radius: 5px; margin-bottom: 20px; text-align: center;">
    <strong>🧪 TEST REMINDER EMAIL - This is a test email</strong>
  </div>
  
  <h1 style="color: #d97706;">Just a friendly reminder about your quote</h1>
  
  <p>Hi ${testQuote.customer_name},</p>
  
  <p>Your quote #${testQuote.quote_number} is still waiting for your review.</p>
  
  <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <p><strong>Total: ${testQuote.customer_currency} ${testQuote.total_customer_currency}</strong></p>
    <p>Valid until: ${new Date(testQuote.expires_at).toLocaleDateString()}</p>
  </div>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="${shareUrl}" style="background: #d97706; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
      Review Your Quote
    </a>
  </div>
  
  <p style="color: #92400e; text-align: center;">
    Don't miss out! Your quote may expire soon.
  </p>
  
  <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
  
  <p style="font-size: 12px; color: #6b7280; text-align: center;">
    This is a test reminder email sent from Quote Reminder Settings.<br>
    In production, this would be reminder #${testQuote.reminder_count} of 3 maximum reminders.
  </p>
</body>
</html>
    `

    // Send email via SES
    const response = await fetch(`${supabaseUrl}/functions/v1/send-email-ses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        to: email,
        subject: 'TEST: Your Quote #IWB2025TEST is waiting',
        html: emailHtml,
        text: `TEST REMINDER: Your quote #${testQuote.quote_number} is still waiting for your review. View it here: ${shareUrl}`,
        from: 'iwishBag <noreply@mail.iwishbag.com>',
        replyTo: 'support@mail.iwishbag.com',
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to send email: ${error}`)
    }

    const result = await response.json()

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Test reminder sent successfully',
        emailId: result.messageId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})