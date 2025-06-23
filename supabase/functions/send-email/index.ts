import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  to: string
  subject: string
  html: string
  from?: string
  template_name?: string
  template_data?: Record<string, any>
  email_type?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { to, subject, html, template_name, template_data, email_type } = await req.json()

    // Check email settings before sending
    const { data: emailSettings, error: settingsError } = await supabaseClient
      .from('email_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['email_sending_enabled', 'cart_abandonment_enabled', 'quote_notifications_enabled', 'order_notifications_enabled'])

    if (settingsError) {
      console.error('Error fetching email settings:', settingsError)
      return new Response(
        JSON.stringify({ error: 'Failed to check email settings' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if global email sending is enabled
    const globalEnabled = emailSettings?.find(s => s.setting_key === 'email_sending_enabled')?.setting_value
    if (!globalEnabled) {
      console.log('Email sending is globally disabled')
      return new Response(
        JSON.stringify({ message: 'Email sending is disabled', skipped: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check specific email type settings
    let typeEnabled = true
    if (email_type) {
      switch (email_type) {
        case 'cart_abandonment':
          typeEnabled = emailSettings?.find(s => s.setting_key === 'cart_abandonment_enabled')?.setting_value ?? true
          break
        case 'quote_notification':
          typeEnabled = emailSettings?.find(s => s.setting_key === 'quote_notifications_enabled')?.setting_value ?? true
          break
        case 'order_notification':
          typeEnabled = emailSettings?.find(s => s.setting_key === 'order_notifications_enabled')?.setting_value ?? true
          break
      }
    }

    if (!typeEnabled) {
      console.log(`Email type ${email_type} is disabled`)
      return new Response(
        JSON.stringify({ message: `Email type ${email_type} is disabled`, skipped: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If template_name is provided, fetch and render the template
    let finalHtml = html
    let finalSubject = subject

    if (template_name && template_data) {
      const { data: template, error: templateError } = await supabaseClient
        .from('email_templates')
        .select('*')
        .eq('name', template_name)
        .single()

      if (templateError) {
        console.error('Error fetching template:', templateError)
        return new Response(
          JSON.stringify({ error: 'Template not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Render template with data
      finalHtml = renderTemplate(template.html_content, template_data)
      finalSubject = renderTemplate(template.subject, template_data)
    }

    // Send email using Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'iWishBag <noreply@iwishbag.com>',
        to: to,
        subject: finalSubject,
        html: finalHtml,
      }),
    })

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json()
      console.error('Resend API error:', errorData)
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: errorData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const result = await resendResponse.json()

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: result.id,
        message: 'Email sent successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-email function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Helper function to render template with data
function renderTemplate(template: string, data: Record<string, any>): string {
  let rendered = template
  
  // Replace simple variables like {variable_name}
  Object.entries(data).forEach(([key, value]) => {
    const regex = new RegExp(`{${key}}`, 'g')
    rendered = rendered.replace(regex, String(value))
  })
  
  return rendered
} 