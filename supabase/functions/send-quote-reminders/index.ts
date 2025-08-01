// Supabase Edge Function: send-quote-reminders
// Run this daily via cron to send automatic quote reminders

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
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get quotes that need reminders
    const { data: quotesNeedingReminders, error: fetchError } = await supabase
      .from('quotes_v2')
      .select('*')
      .eq('status', 'sent')
      .lt('reminder_count', 3) // Max 3 reminders
      .lt('created_at', new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()) // At least 2 days old
      .is('converted_to_order_id', null) // Not converted to order
      .order('created_at', { ascending: true })

    if (fetchError) {
      throw fetchError
    }

    const results = {
      processed: 0,
      sent: 0,
      errors: [],
    }

    // Process each quote
    for (const quote of quotesNeedingReminders || []) {
      try {
        // Check when last reminder was sent
        if (quote.last_reminder_at) {
          const lastReminderDate = new Date(quote.last_reminder_at)
          const daysSinceLastReminder = (Date.now() - lastReminderDate.getTime()) / (1000 * 60 * 60 * 24)
          
          // Wait at least 3 days between reminders
          if (daysSinceLastReminder < 3) {
            continue
          }
        }

        // Generate email content
        const shareUrl = `${Deno.env.get('PUBLIC_SITE_URL')}/quote/view/${quote.share_token}`
        const reminderNumber = (quote.reminder_count || 0) + 1

        const emailData = {
          to: quote.customer_email,
          subject: `Reminder: Your Quote #${quote.quote_number || quote.id.slice(0, 8)} is waiting`,
          html: generateReminderEmailHtml(quote, shareUrl, reminderNumber),
          from: 'noreply@iwishbag.com',
        }

        // Send email (implement your email sending logic here)
        // For now, we'll just log it
        console.log('Sending reminder email:', emailData)

        // Update reminder count
        const { error: updateError } = await supabase.rpc('send_quote_reminder', {
          quote_id: quote.id
        })

        if (updateError) {
          throw updateError
        }

        results.sent++
      } catch (error) {
        results.errors.push({
          quoteId: quote.id,
          error: error.message,
        })
      }

      results.processed++
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
        timestamp: new Date().toISOString(),
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

function generateReminderEmailHtml(quote: any, shareUrl: string, reminderNumber: number): string {
  const reminderMessages = [
    "Just a friendly reminder about your quote",
    "Your quote is still available",
    "Last reminder about your quote"
  ]

  const message = reminderMessages[Math.min(reminderNumber - 1, 2)]

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Quote Reminder</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #d97706;">${message}</h1>
  
  <p>Hi ${quote.customer_name || 'there'},</p>
  
  <p>Your quote #${quote.quote_number || quote.id.slice(0, 8)} is still waiting for your review.</p>
  
  <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <p><strong>Total: ${quote.customer_currency} ${quote.total_customer_currency || quote.total_usd}</strong></p>
  </div>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="${shareUrl}" style="background: #d97706; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
      Review Your Quote
    </a>
  </div>
  
  <p style="color: #92400e; text-align: center;">
    Don't miss out! Your quote may expire soon.
  </p>
</body>
</html>
  `
}