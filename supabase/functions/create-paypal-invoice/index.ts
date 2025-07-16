import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createCorsHeaders } from '../_shared/cors.ts';
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: createCorsHeaders(req)
    });
  }
  try {
    console.log('PayPal invoice creation started');
    // Parse request
    const invoiceRequest = await req.json();
    const { quote_id, payment_due_days = 30, allow_partial_payment = false, note, terms_and_conditions, template_id, logo_url } = invoiceRequest;
    console.log('Invoice request received:', {
      quote_id,
      payment_due_days,
      allow_partial_payment
    });
    // Validate required fields
    if (!quote_id) {
      return new Response(JSON.stringify({
        error: 'Missing required field: quote_id'
      }), {
        status: 400,
        headers: {
          ...createCorsHeaders(req),
          'Content-Type': 'application/json'
        }
      });
    }
    // Get authenticated user
    const authHeader = req.headers.get('authorization');
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(authHeader?.replace('Bearer ', '') || '');
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({
        error: 'Unauthorized'
      }), {
        status: 401,
        headers: {
          ...createCorsHeaders(req),
          'Content-Type': 'application/json'
        }
      });
    }
    console.log('User authenticated:', user.id);
    // Fetch quote details with customer information
    const { data: quote, error: quoteError } = await supabaseAdmin.from('quotes').select(`
        *,
        profiles:user_id (
          id,
          full_name,
          phone,
          country
        )
      `).eq('id', quote_id).single();
    if (quoteError || !quote) {
      console.error('Quote fetch error:', quoteError);
      return new Response(JSON.stringify({
        error: 'Quote not found or access denied',
        details: quoteError?.message
      }), {
        status: 404,
        headers: {
          ...createCorsHeaders(req),
          'Content-Type': 'application/json'
        }
      });
    }
    console.log('Quote fetched:', quote.display_id, 'Status:', quote.status);
    // Validate quote is approved
    if (quote.status !== 'approved') {
      return new Response(JSON.stringify({
        error: 'Invoice can only be created for approved quotes',
        current_status: quote.status
      }), {
        status: 400,
        headers: {
          ...createCorsHeaders(req),
          'Content-Type': 'application/json'
        }
      });
    }
    // Check if invoice already exists for this quote
    const { data: existingInvoice } = await supabaseAdmin.from('paypal_invoices').select('id, invoice_number, status').eq('quote_id', quote_id).single();
    if (existingInvoice) {
      return new Response(JSON.stringify({
        error: 'Invoice already exists for this quote',
        existing_invoice: existingInvoice
      }), {
        status: 409,
        headers: {
          ...createCorsHeaders(req),
          'Content-Type': 'application/json'
        }
      });
    }
    // Generate unique invoice number
    const { data: invoiceNumber, error: invoiceNumberError } = await supabaseAdmin.rpc('generate_invoice_number');
    if (invoiceNumberError || !invoiceNumber) {
      console.error('Failed to generate invoice number:', invoiceNumberError);
      return new Response(JSON.stringify({
        error: 'Failed to generate invoice number'
      }), {
        status: 500,
        headers: {
          ...createCorsHeaders(req),
          'Content-Type': 'application/json'
        }
      });
    }
    // Get PayPal configuration
    const { data: paypalGateway, error: gatewayError } = await supabaseAdmin.from('payment_gateways').select('config, test_mode').eq('code', 'paypal').single();
    if (gatewayError || !paypalGateway) {
      return new Response(JSON.stringify({
        error: 'PayPal configuration not found'
      }), {
        status: 500,
        headers: {
          ...createCorsHeaders(req),
          'Content-Type': 'application/json'
        }
      });
    }
    const config = paypalGateway.config || {};
    const testMode = paypalGateway.test_mode;
    const paypalConfig = {
      client_id: config.client_id,
      client_secret: config.client_secret,
      base_url: testMode ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com'
    };
    if (!paypalConfig.client_id || !paypalConfig.client_secret) {
      return new Response(JSON.stringify({
        error: 'PayPal credentials not configured'
      }), {
        status: 500,
        headers: {
          ...createCorsHeaders(req),
          'Content-Type': 'application/json'
        }
      });
    }
    // Get PayPal access token
    const authString = btoa(`${paypalConfig.client_id}:${paypalConfig.client_secret}`);
    const tokenResponse = await fetch(`${paypalConfig.base_url}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('PayPal auth error:', errorData);
      return new Response(JSON.stringify({
        error: 'PayPal authentication failed'
      }), {
        status: 500,
        headers: {
          ...createCorsHeaders(req),
          'Content-Type': 'application/json'
        }
      });
    }
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    // Parse customer name
    const customerName = quote.profiles?.full_name || 'Customer';
    const nameParts = customerName.split(' ');
    const customerFirstName = nameParts[0] || 'Customer';
    const customerLastName = nameParts.slice(1).join(' ') || '';
    // Parse shipping address
    const shippingAddress = quote.shipping_address || {};
    // Calculate payment due date
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + payment_due_days);
    // Prepare invoice items from quote
    const itemPrice = parseFloat(quote.item_price) || 0;
    const invoiceItems = [
      {
        name: quote.product_name || 'Product',
        description: `Order for ${quote.display_id}`,
        quantity: quote.quantity || 1,
        unit_amount: {
          currency_code: 'USD',
          value: itemPrice.toFixed(2)
        },
        unit_of_measure: 'QUANTITY'
      }
    ];
    // Add shipping as separate line item if exists
    const internationalShipping = parseFloat(quote.international_shipping) || 0;
    if (internationalShipping > 0) {
      invoiceItems.push({
        name: 'International Shipping',
        description: 'International shipping cost',
        quantity: 1,
        unit_amount: {
          currency_code: 'USD',
          value: internationalShipping.toFixed(2)
        },
        unit_of_measure: 'QUANTITY'
      });
    }
    // Add domestic shipping if exists
    const domesticShipping = parseFloat(quote.domestic_shipping) || 0;
    if (domesticShipping > 0) {
      invoiceItems.push({
        name: 'Domestic Shipping',
        description: 'Domestic shipping cost',
        quantity: 1,
        unit_amount: {
          currency_code: 'USD',
          value: domesticShipping.toFixed(2)
        },
        unit_of_measure: 'QUANTITY'
      });
    }
    // Add handling charge if exists
    const handlingCharge = parseFloat(quote.handling_charge) || 0;
    if (handlingCharge > 0) {
      invoiceItems.push({
        name: 'Handling Charge',
        description: 'Service and handling fee',
        quantity: 1,
        unit_amount: {
          currency_code: 'USD',
          value: handlingCharge.toFixed(2)
        },
        unit_of_measure: 'QUANTITY'
      });
    }
    // Create PayPal invoice request
    const paypalInvoiceRequest = {
      detail: {
        invoice_number: invoiceNumber,
        reference: quote.display_id || quote_id,
        invoice_date: new Date().toISOString().split('T')[0],
        currency_code: 'USD',
        note: note || `Invoice for quote ${quote.display_id}`,
        terms_and_conditions: terms_and_conditions || 'Payment is due within 30 days.',
        payment_term: {
          term_type: 'DUE_ON_DATE_SPECIFIED',
          due_date: dueDate.toISOString().split('T')[0]
        },
        metadata: {
          create_time: new Date().toISOString(),
          created_by: user.id
        }
      },
      invoicer: {
        name: {
          given_name: 'WhyteClub',
          surname: 'Team'
        },
        address: {
          address_line_1: '123 Business Street',
          admin_area_2: 'Business City',
          admin_area_1: 'Business State',
          postal_code: '12345',
          country_code: 'US'
        },
        email_address: 'billing@whyteclub.com',
        logo_url: logo_url || 'https://whyteclub.com/logo.png'
      },
      primary_recipients: [
        {
          billing_info: {
            name: {
              given_name: customerFirstName,
              surname: customerLastName
            },
            address: {
              address_line_1: shippingAddress.address_line_1 || '123 Customer Street',
              address_line_2: shippingAddress.address_line_2,
              admin_area_2: shippingAddress.city || 'Customer City',
              admin_area_1: shippingAddress.state || 'Customer State',
              postal_code: shippingAddress.postal_code || '12345',
              country_code: shippingAddress.country_code || quote.country_code || 'US'
            },
            email_address: quote.email,
            additional_info: `Customer ID: ${quote.user_id}`
          }
        }
      ],
      items: invoiceItems,
      configuration: {
        partial_payment: {
          allow_partial_payment: allow_partial_payment
        },
        allow_tip: false,
        tax_calculated_after_discount: true,
        tax_inclusive: false,
        template_id: template_id
      },
      amount: {
        breakdown: {
          shipping: internationalShipping + domesticShipping > 0 ? {
            amount: {
              currency_code: 'USD',
              value: (internationalShipping + domesticShipping).toFixed(2)
            }
          } : undefined,
          custom: (parseFloat(quote.customs_and_ecs) || 0) > 0 ? {
            label: 'Customs & Duties',
            amount: {
              currency_code: 'USD',
              value: (parseFloat(quote.customs_and_ecs) || 0).toFixed(2)
            }
          } : undefined
        }
      }
    };
    console.log('Creating PayPal invoice with request:', {
      invoice_number: invoiceNumber,
      quote_id: quote_id,
      amount: quote.final_total,
      items_count: invoiceItems.length
    });
    // Create invoice with PayPal
    const invoiceResponse = await fetch(`${paypalConfig.base_url}/v2/invoicing/invoices`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': `INV_${invoiceNumber}_${Date.now()}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(paypalInvoiceRequest)
    });
    const invoiceData = await invoiceResponse.json();
    console.log('PayPal Invoice API Response Status:', invoiceResponse.status);
    console.log('PayPal Invoice API Response Data:', JSON.stringify(invoiceData, null, 2));
    if (!invoiceResponse.ok) {
      console.error('PayPal invoice creation error:', invoiceData);
      return new Response(JSON.stringify({
        error: 'PayPal invoice creation failed',
        status: invoiceResponse.status,
        details: invoiceData
      }), {
        status: 400,
        headers: {
          ...createCorsHeaders(req),
          'Content-Type': 'application/json'
        }
      });
    }
    // Store invoice in database
    const { data: invoice, error: invoiceDbError } = await supabaseAdmin.from('paypal_invoices').insert({
      quote_id: quote_id,
      paypal_invoice_id: invoiceData.id,
      invoice_number: invoiceNumber,
      title: `Invoice for Quote ${quote.display_id}`,
      description: `Professional invoice for approved quote ${quote.display_id}`,
      note: note,
      terms_and_conditions: terms_and_conditions,
      amount: quote.final_total,
      currency: 'USD',
      payment_due_date: dueDate.toISOString().split('T')[0],
      allow_partial_payment: allow_partial_payment,
      logo_url: logo_url,
      template_id: template_id,
      status: 'draft',
      sent_to_email: quote.email,
      merchant_info: {
        name: 'WhyteClub Team',
        email: 'billing@whyteclub.com',
        address: {
          address_line_1: '123 Business Street',
          city: 'Business City',
          state: 'Business State',
          postal_code: '12345',
          country: 'US'
        }
      },
      billing_info: {
        name: customerName,
        email: quote.email,
        address: shippingAddress
      },
      paypal_response: invoiceData,
      paypal_links: invoiceData.links,
      created_by: user.id
    }).select().single();
    if (invoiceDbError) {
      console.error('Failed to store invoice in database:', invoiceDbError);
      return new Response(JSON.stringify({
        error: 'Failed to store invoice in database',
        details: invoiceDbError.message
      }), {
        status: 500,
        headers: {
          ...createCorsHeaders(req),
          'Content-Type': 'application/json'
        }
      });
    }
    // Store invoice items
    for (const item of invoiceItems){
      await supabaseAdmin.from('paypal_invoice_items').insert({
        invoice_id: invoice.id,
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        unit_price: parseFloat(item.unit_amount.value),
        category: item.name.includes('Shipping') ? 'shipping' : 'product'
      });
    }
    console.log('PayPal invoice created successfully:', {
      invoice_id: invoice.id,
      paypal_invoice_id: invoiceData.id,
      invoice_number: invoiceNumber,
      amount: quote.final_total
    });
    // Return the invoice details
    return new Response(JSON.stringify({
      success: true,
      invoice: {
        id: invoice.id,
        paypal_invoice_id: invoiceData.id,
        invoice_number: invoiceNumber,
        quote_id: quote_id,
        amount: quote.final_total,
        currency: 'USD',
        status: 'draft',
        payment_due_date: dueDate.toISOString().split('T')[0],
        customer_email: quote.email,
        links: invoiceData.links,
        created_at: invoice.created_at
      },
      paypal_response: invoiceData
    }), {
      status: 200,
      headers: {
        ...createCorsHeaders(req),
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('PayPal invoice creation error:', error);
    console.error('Error stack:', error.stack);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        ...createCorsHeaders(req),
        'Content-Type': 'application/json'
      }
    });
  }
});
