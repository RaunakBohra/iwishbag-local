import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createCorsHeaders } from '../_shared/cors.ts';
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: createCorsHeaders(req),
    });
  }
  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: req.headers.get('Authorization'),
          },
        },
      },
    );
    // Get the request body
    const body = await req.json();
    // Validate required fields
    const requiredFields = [
      'customer_email',
      'product_url',
      'product_name',
      'product_price',
      'product_weight',
      'country_code',
      'calculated_quote',
      'final_total_usd',
    ];
    for (const field of requiredFields) {
      if (!body[field]) {
        return new Response(
          JSON.stringify({
            error: `Missing required field: ${field}`,
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
    }
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.customer_email)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid email format',
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
    // Validate price and weight
    if (body.product_price <= 0 || body.product_weight <= 0) {
      return new Response(
        JSON.stringify({
          error: 'Product price and weight must be greater than 0',
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
    // Insert the automatic quote
    const { data: quote, error } = await supabaseClient
      .from('automatic_quotes')
      .insert({
        customer_email: body.customer_email,
        product_url: body.product_url,
        product_name: body.product_name,
        product_price: body.product_price,
        product_weight: body.product_weight,
        shipping_cost: body.shipping_cost || 0,
        country_code: body.country_code,
        additional_notes: body.additional_notes,
        analysis_result: body.analysis_result,
        quote_type_info: body.quote_type_info,
        calculated_quote: body.calculated_quote,
        final_total_usd: body.final_total_usd,
        review_requested: body.review_requested || false,
        review_reason: body.review_reason,
        status: body.review_requested ? 'review_requested' : 'pending',
      })
      .select()
      .single();
    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({
          error: 'Failed to submit quote',
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
    // Send email notification if review is requested
    if (body.review_requested) {
      try {
        await supabaseClient.functions.invoke('send-email', {
          body: {
            to: body.customer_email,
            subject: 'Quote Review Requested',
            template: 'quote-review-requested',
            data: {
              quote_id: quote.id,
              product_name: body.product_name,
              final_total_usd: body.final_total_usd,
              review_reason: body.review_reason,
            },
          },
        });
      } catch (emailError) {
        console.error('Email notification failed:', emailError);
        // Don't fail the request if email fails
      }
    }
    // Send confirmation email
    try {
      await supabaseClient.functions.invoke('send-email', {
        body: {
          to: body.customer_email,
          subject: 'Automatic Quote Submitted',
          template: 'automatic-quote-confirmation',
          data: {
            quote_id: quote.id,
            product_name: body.product_name,
            final_total_usd: body.final_total_usd,
            expires_at: quote.expires_at,
            review_requested: body.review_requested,
          },
        },
      });
    } catch (emailError) {
      console.error('Confirmation email failed:', emailError);
      // Don't fail the request if email fails
    }
    return new Response(
      JSON.stringify({
        success: true,
        quote_id: quote.id,
        message: body.review_requested
          ? 'Quote submitted for expert review. You will receive an email within 24 hours.'
          : 'Quote submitted successfully. You can accept it anytime within 24 hours.',
      }),
      {
        status: 200,
        headers: {
          ...createCorsHeaders(req),
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
      }),
      {
        status: 500,
        headers: {
          ...createCorsHeaders(req),
          'Content-Type': 'application/json',
        },
      },
    );
  }
});
