import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    });
  }
  try {
    console.log('PayPal invoice send started');
    // Parse request
    const sendRequest = await req.json();
    const {
      invoice_id,
      subject,
      note,
      send_to_recipient = true,
      send_to_invoicer = false,
    } = sendRequest;
    console.log('Send invoice request received:', {
      invoice_id,
      send_to_recipient,
      send_to_invoicer,
    });
    // Validate required fields
    if (!invoice_id) {
      return new Response(
        JSON.stringify({
          error: 'Missing required field: invoice_id',
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }
    // Get authenticated user
    const authHeader = req.headers.get('authorization');
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(authHeader?.replace('Bearer ', '') || '');
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }
    console.log('User authenticated:', user.id);
    // Fetch invoice details
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('paypal_invoices')
      .select(
        `
        *,
        quotes_v2 (
          display_id,
          product_name,
          email,
          user_id
        )
      `,
      )
      .eq('id', invoice_id)
      .single();
    if (invoiceError || !invoice) {
      console.error('Invoice fetch error:', invoiceError);
      return new Response(
        JSON.stringify({
          error: 'Invoice not found or access denied',
          details: invoiceError?.message,
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }
    console.log('Invoice fetched:', invoice.invoice_number, 'Status:', invoice.status);
    // Validate invoice status
    if (invoice.status !== 'draft') {
      return new Response(
        JSON.stringify({
          error: 'Invoice can only be sent when in draft status',
          current_status: invoice.status,
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }
    // Get PayPal configuration
    const { data: paypalGateway, error: gatewayError } = await supabaseAdmin
      .from('payment_gateways')
      .select('config, test_mode')
      .eq('code', 'paypal')
      .single();
    if (gatewayError || !paypalGateway) {
      return new Response(
        JSON.stringify({
          error: 'PayPal configuration not found',
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }
    const config = paypalGateway.config || {};
    const testMode = paypalGateway.test_mode;
    const paypalConfig = {
      client_id: config.client_id,
      client_secret: config.client_secret,
      base_url: testMode ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com',
    };
    // Get PayPal access token
    const authString = btoa(`${paypalConfig.client_id}:${paypalConfig.client_secret}`);
    const tokenResponse = await fetch(`${paypalConfig.base_url}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('PayPal auth error:', errorData);
      return new Response(
        JSON.stringify({
          error: 'PayPal authentication failed',
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    // Prepare send invoice request
    const sendInvoiceRequest = {
      subject: subject || `Invoice ${invoice.invoice_number} from WhyteClub`,
      note:
        note ||
        `Please find attached your invoice for quote ${invoice.quotes.display_id}. Payment is due by ${invoice.payment_due_date}.`,
      send_to_recipient: send_to_recipient,
      send_to_invoicer: send_to_invoicer,
    };
    console.log('Sending PayPal invoice:', {
      paypal_invoice_id: invoice.paypal_invoice_id,
      recipient_email: invoice.quotes.email,
      subject: sendInvoiceRequest.subject,
    });
    // Send invoice via PayPal
    const sendResponse = await fetch(
      `${paypalConfig.base_url}/v2/invoicing/invoices/${invoice.paypal_invoice_id}/send`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'PayPal-Request-Id': `SEND_${invoice.invoice_number}_${Date.now()}`,
        },
        body: JSON.stringify(sendInvoiceRequest),
      },
    );
    console.log('PayPal Send Invoice Response Status:', sendResponse.status);
    let sendResponseData = {};
    if (sendResponse.status !== 202) {
      sendResponseData = await sendResponse.json();
      console.error('PayPal invoice send error:', sendResponseData);
      return new Response(
        JSON.stringify({
          error: 'Failed to send PayPal invoice',
          status: sendResponse.status,
          details: sendResponseData,
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }
    // Update invoice status in database
    const { data: updatedInvoice, error: updateError } = await supabaseAdmin
      .from('paypal_invoices')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        last_sent_date: new Date().toISOString(),
      })
      .eq('id', invoice_id)
      .select()
      .single();
    if (updateError) {
      console.error('Failed to update invoice status:', updateError);
      return new Response(
        JSON.stringify({
          error: 'Invoice sent but failed to update status',
          details: updateError.message,
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }
    console.log('Invoice sent successfully:', {
      invoice_id: invoice_id,
      invoice_number: invoice.invoice_number,
      recipient: invoice.quotes.email,
      sent_at: updatedInvoice.sent_at,
    });
    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        invoice: {
          id: updatedInvoice.id,
          invoice_number: updatedInvoice.invoice_number,
          status: updatedInvoice.status,
          sent_at: updatedInvoice.sent_at,
          recipient_email: invoice.quotes.email,
          subject: sendInvoiceRequest.subject,
          amount: updatedInvoice.amount,
          currency: updatedInvoice.currency,
          payment_due_date: updatedInvoice.payment_due_date,
        },
        message: `Invoice ${invoice.invoice_number} sent successfully to ${invoice.quotes.email}`,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error) {
    console.error('PayPal invoice send error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  }
});
