import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { authenticateUser, AuthError, createAuthErrorResponse, validateMethod } from '../_shared/auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGINS') || 'https://iwishbag.com',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST',
  'Access-Control-Max-Age': '86400',
}

interface PaymentLinkV2Request {
  quoteId: string;
  amount: number;
  currency: string;
  customerInfo: {
    name: string;
    email: string;
    phone: string;
  };
  description?: string;
  expiryDays?: number;
  customFields?: CustomField[];
  template?: 'default' | 'minimal' | 'branded';
  partialPaymentAllowed?: boolean;
  apiMethod?: 'rest' | 'legacy'; // Allow selection between new REST API and legacy
}

interface CustomField {
  name: string;
  type: 'text' | 'number' | 'email' | 'phone' | 'date' | 'dropdown';
  label: string;
  required: boolean;
  options?: string[]; // For dropdown fields
  placeholder?: string;
}

interface PayUPaymentLinkRequest {
  subAmount: number;
  isPartialPaymentAllowed: boolean;
  description: string;
  source: string;
  invoiceNumber: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  udf: {
    udf1?: string;
    udf2?: string;
    udf3?: string;
    udf4?: string;
    udf5?: string;
  };
  furl: string; // Failure URL
  surl: string; // Success URL
  expiryDate: string;
  customFields?: any[];
}

serve(async (req) => {
  console.log("🔵 === CREATE PAYU PAYMENT LINK V2 FUNCTION STARTED ===");
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    })
  }

  try {
    // Validate request method
    validateMethod(req, ['POST']);

    // Authenticate user
    const { user, supabaseClient } = await authenticateUser(req);
    
    console.log(`🔐 Authenticated user ${user.email} creating PayU payment link`);

    const body = await req.json();
    const {
      quoteId,
      amount,
      currency,
      customerInfo,
      description,
      expiryDays = 7,
      customFields = [],
      template = 'default',
      partialPaymentAllowed = false,
      apiMethod = 'rest' // Default to new REST API
    }: PaymentLinkV2Request = body;

    console.log("🔵 Payment link request:", { 
      quoteId, 
      amount, 
      currency, 
      apiMethod,
      hasCustomFields: customFields.length > 0 
    });

    // Validate input
    if (!quoteId || !amount || !customerInfo?.email) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: quoteId, amount, customerInfo.email' 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Convert amount to INR if needed
    let amountInINR = amount;
    if (currency !== 'INR') {
      const { data: indiaSettings } = await supabaseAdmin
        .from('country_settings')
        .select('rate_from_usd')
        .eq('code', 'IN')
        .single();
      
      const exchangeRate = indiaSettings?.rate_from_usd || 83.0;
      amountInINR = amount * exchangeRate;
    }

    // STEP 1: Initial Insert - Record pending payment BEFORE external API call
    const transactionId = `PAYU_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log("🔄 COMPENSATION: Creating initial pending payment record BEFORE external API call");
    const { data: initialTransaction, error: initialError } = await supabaseAdmin
      .from('payment_transactions')
      .insert({
        transaction_id: transactionId,
        gateway_code: 'payu',
        quote_id: quoteId,
        amount: amountInINR,
        currency: 'INR',
        status: 'pending',
        payment_state: 'pending',
        metadata: {
          quote_id: quoteId,
          original_amount: amount,
          original_currency: currency,
          customer_info: customerInfo,
          description: description,
          api_method: apiMethod,
          compensation_step: 'initial_insert',
          created_at: new Date().toISOString()
        }
      })
      .select('id')
      .single();

    if (initialError) {
      console.error("❌ COMPENSATION: Failed to create initial pending payment record:", initialError);
      throw new Error(`Failed to initialize payment tracking: ${initialError.message}`);
    }
    
    const paymentTransactionId = initialTransaction.id;
    console.log("✅ COMPENSATION: Initial pending payment record created:", transactionId);

    // Decide which API to use
    if (apiMethod === 'rest') {
      return await createPaymentLinkREST({
        supabaseAdmin,
        quoteId,
        amount: amountInINR,
        originalAmount: amount,
        currency,
        customerInfo,
        description,
        expiryDays,
        customFields,
        template,
        partialPaymentAllowed,
        paymentTransactionId,
        transactionId
      });
    } else {
      // Fall back to legacy create-invoice API
      return await createPaymentLinkLegacy({
        supabaseAdmin,
        quoteId,
        amount: amountInINR,
        originalAmount: amount,
        currency,
        customerInfo,
        description,
        expiryDays,
        paymentTransactionId,
        transactionId
      });
    }

  } catch (error) {
    console.error("❌ Payment link creation error:", error);
    
    // STEP 4: Error Handling - Update payment_state if transaction was created
    try {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      if (typeof paymentTransactionId !== 'undefined') {
        let errorState = 'failed';
        let errorContext = 'unknown_error';
        
        if (error.message?.includes('PayU') || error.message?.includes('API')) {
          errorState = 'orphaned';
          errorContext = 'payu_api_error';
        } else if (error.message?.includes('database') || error.message?.includes('supabase')) {
          errorState = 'orphaned';
          errorContext = 'database_error';
        }
        
        console.log(`🔄 COMPENSATION: Updating payment state to ${errorState} due to error`);
        
        await supabaseAdmin
          .from('payment_transactions')
          .update({
            payment_state: errorState,
            status: 'failed',
            metadata: {
              error_context: errorContext,
              error_message: error.message,
              error_time: new Date().toISOString(),
              compensation_step: 'error_handling_main'
            }
          })
          .eq('id', paymentTransactionId);
          
        console.log(`✅ COMPENSATION: Payment state updated to ${errorState}`);
      }
    } catch (compensationError) {
      console.error("❌ COMPENSATION: Failed to update payment state on error:", compensationError);
    }
    
    if (error instanceof AuthError) {
      return createAuthErrorResponse(error, corsHeaders);
    }
    
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

/**
 * Create payment link using PayU's new REST API
 */
async function createPaymentLinkREST(params: {
  supabaseAdmin: any;
  quoteId: string;
  amount: number;
  originalAmount: number;
  currency: string;
  customerInfo: any;
  description?: string;
  expiryDays: number;
  customFields: CustomField[];
  template: string;
  partialPaymentAllowed: boolean;
  paymentTransactionId: string;
  transactionId: string;
}): Promise<Response> {
  const {
    supabaseAdmin,
    quoteId,
    amount,
    originalAmount,
    currency,
    customerInfo,
    description,
    expiryDays,
    customFields,
    template,
    partialPaymentAllowed
  } = params;

  console.log("🔵 Using PayU REST API for payment link creation");

  try {
    // Get access token
    const { data: tokenResult, error: tokenError } = await supabaseAdmin.functions.invoke('payu-token-manager', {
      body: { action: 'get', scope: 'create_payment_links' }
    });

    if (tokenError || !tokenResult?.success) {
      console.error("❌ Failed to get PayU access token:", tokenError);
      return new Response(JSON.stringify({
        error: 'Failed to obtain PayU access token',
        details: tokenError?.message || tokenResult?.error
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const accessToken = tokenResult.token.access_token;
    console.log("✅ Got PayU access token");

    // Get PayU configuration
    const { data: payuGateway } = await supabaseAdmin
      .from('payment_gateways')
      .select('config, test_mode')
      .eq('code', 'payu')
      .single();

    const testMode = payuGateway?.test_mode || false;
    const config = payuGateway?.config || {};
    const baseUrl = testMode ? 'https://uatoneapi.payu.in' : 'https://oneapi.payu.in';

    // Generate unique invoice number (alphanumeric only for PayU REST API)
    const invoiceNumber = `PLV2${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    // Calculate expiry date
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiryDays);

    // Build success and failure URLs
    const publicUrl = Deno.env.get('PUBLIC_URL') || 'https://iwishbag.com';
    const successUrl = `${publicUrl}/payment-success?quote_id=${quoteId}&method=payu`;
    const failureUrl = `${publicUrl}/payment-failure?quote_id=${quoteId}&method=payu`;

    // Prepare custom fields for PayU format
    const payuCustomFields = customFields.map((field, index) => ({
      fieldName: field.name,
      fieldType: mapFieldType(field.type),
      fieldLabel: field.label,
      isMandatory: field.required,
      fieldOptions: field.options || [],
      placeholder: field.placeholder || '',
      fieldOrder: index + 1
    }));

    // Create PayU payment link request (exact structure as per docs)
    const payuRequest = {
      subAmount: amount,
      isPartialPaymentAllowed: partialPaymentAllowed,
      description: description || `Payment for Order ${quoteId}`,
      source: 'API'
    };

    console.log("🔵 Making PayU REST API request:", {
      url: `${baseUrl}/payment-links`,
      headers: {
        'Authorization': `Bearer ${accessToken.substring(0, 10)}...`,
        'merchantId': config.merchant_id || config.merchant_key
      },
      requestBody: payuRequest
    });

    // Make API request to PayU
    const payuResponse = await fetch(`${baseUrl}/payment-links`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'merchantId': config.merchant_id || config.merchant_key
      },
      body: JSON.stringify(payuRequest)
    });

    console.log("🔵 PayU REST API response status:", payuResponse.status);

    if (!payuResponse.ok) {
      const errorText = await payuResponse.text();
      console.error("❌ PayU REST API error:", errorText);
      
      // If REST API fails, try legacy as fallback
      console.log("🔄 Falling back to legacy API...");
      return await createPaymentLinkLegacy({
        supabaseAdmin,
        quoteId,
        amount,
        originalAmount,
        currency,
        customerInfo,
        description,
        expiryDays,
        paymentTransactionId: params.paymentTransactionId,
        transactionId: params.transactionId
      });
    }

    const payuResult = await payuResponse.json();
    console.log("🔵 PayU REST API response:", JSON.stringify(payuResult, null, 2));
    
    // PayU REST API returns status: 0 for success, not 1
    if (payuResult.status !== 0) {
      console.error("❌ PayU REST API error:", payuResult);
      
      // If REST API fails, try legacy as fallback
      console.log("🔄 Falling back to legacy API...");
      return await createPaymentLinkLegacy({
        supabaseAdmin,
        quoteId,
        amount,
        originalAmount,
        currency,
        customerInfo,
        description,
        expiryDays,
        paymentTransactionId: params.paymentTransactionId,
        transactionId: params.transactionId
      });
    }

    console.log("✅ PayU REST API success");
    
    // STEP 2: External API Success - Update payment_state to external_created
    console.log("🔄 COMPENSATION: Updating payment state to external_created");
    const { error: externalUpdateError } = await supabaseAdmin
      .from('payment_transactions')
      .update({
        gateway_transaction_id: payuResult.result?.paymentLinkId || invoiceNumber,
        payment_state: 'external_created',
        gateway_response: payuResult,
        metadata: {
          quote_id: quoteId,
          original_amount: originalAmount,
          original_currency: currency,
          customer_info: customerInfo,
          description: description,
          api_method: 'rest',
          compensation_step: 'external_created',
          payu_link_id: invoiceNumber,
          payment_url: payuResult.result?.paymentLink || payuResult.paymentLink || payuResult.url,
          external_api_success_at: new Date().toISOString()
        }
      })
      .eq('id', params.paymentTransactionId);
      
    if (externalUpdateError) {
      console.error("❌ COMPENSATION: Failed to update payment state to external_created:", externalUpdateError);
      // Continue execution but log the issue - PayU link exists
    } else {
      console.log("✅ COMPENSATION: Payment state updated to external_created");
    }

    // Generate unique link code for our system
    const linkCode = await generateLinkCode(supabaseAdmin);

    // Store payment link in database
    const { data: paymentLink, error: insertError } = await supabaseAdmin
      .from('payment_links')
      .insert({
        quote_id: quoteId,
        gateway: 'payu',
        api_version: 'v2_rest',
        gateway_link_id: invoiceNumber,
        link_code: linkCode,
        title: description || `Payment for Order ${quoteId}`,
        amount: amount,
        currency: 'INR',
        original_amount: originalAmount,
        original_currency: currency,
        payment_url: payuResult.result?.paymentLink || payuResult.paymentLink || payuResult.url,
        expires_at: expiryDate.toISOString(),
        status: 'active',
        gateway_request: payuRequest,
        gateway_response: payuResult,
        customer_email: customerInfo.email,
        customer_name: customerInfo.name,
        customer_phone: customerInfo.phone
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error storing payment link:', insertError);
      return new Response(JSON.stringify({
        error: 'Failed to store payment link in database',
        details: insertError.message,
        payuLinkCreated: true,
        payuLinkId: invoiceNumber
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    console.log('✅ Payment link stored in database successfully:', paymentLink);
    
    // STEP 3: Database Insert Success - Update payment_state to db_recorded
    console.log("🔄 COMPENSATION: Updating payment state to db_recorded");
    const { error: finalUpdateError } = await supabaseAdmin
      .from('payment_transactions')
      .update({
        payment_state: 'db_recorded',
        metadata: {
          quote_id: quoteId,
          original_amount: originalAmount,
          original_currency: currency,
          customer_info: customerInfo,
          description: description,
          api_method: 'rest',
          compensation_step: 'db_recorded',
          payu_link_id: invoiceNumber,
          payment_link_id: paymentLink.id,
          link_code: linkCode,
          payment_url: payuResult.result?.paymentLink || payuResult.paymentLink || payuResult.url,
          db_recorded_at: new Date().toISOString()
        }
      })
      .eq('id', params.paymentTransactionId);
      
    if (finalUpdateError) {
      console.error("❌ COMPENSATION: Failed to update payment state to db_recorded:", finalUpdateError);
      // Continue execution - payment link is functional but state tracking incomplete
    } else {
      console.log("✅ COMPENSATION: Payment state updated to db_recorded - payment link creation complete");
    }

    const shortUrl = `${publicUrl}/pay/${linkCode}`;

    return new Response(JSON.stringify({
      success: true,
      apiVersion: 'v2_rest',
      linkId: invoiceNumber,
      linkCode: linkCode,
      paymentUrl: payuResult.result?.paymentLink || payuResult.paymentLink || payuResult.url,
      shortUrl: shortUrl,
      expiresAt: expiryDate.toISOString(),
      amountInINR: amount.toFixed(2),
      originalAmount: originalAmount,
      originalCurrency: currency,
      exchangeRate: currency !== 'INR' ? (amount / originalAmount) : 1,
      features: {
        customFields: customFields.length > 0,
        partialPayment: partialPaymentAllowed,
        template: template
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("❌ Error in REST API payment link creation:", error);
    
    // STEP 4: Error Handling - Update payment_state based on error context
    try {
      let errorState = 'failed';
      let errorContext = 'unknown_error';
      
      if (error.message?.includes('PayU') || error.message?.includes('API')) {
        errorState = 'orphaned';
        errorContext = 'payu_api_error';
      } else if (error.message?.includes('database') || error.message?.includes('supabase')) {
        errorState = 'orphaned';
        errorContext = 'database_error_after_external_success';
      }
      
      console.log(`🔄 COMPENSATION: Updating payment state to ${errorState} due to error`);
      
      await supabaseAdmin
        .from('payment_transactions')
        .update({
          payment_state: errorState,
          status: 'failed',
          metadata: {
            error_context: errorContext,
            error_message: error.message,
            error_time: new Date().toISOString(),
            compensation_step: 'error_handling',
            api_method: 'rest'
          }
        })
        .eq('id', params.paymentTransactionId);
        
      console.log(`✅ COMPENSATION: Payment state updated to ${errorState}`);
    } catch (compensationError) {
      console.error("❌ COMPENSATION: Failed to update payment state on error:", compensationError);
    }
    
    // Fallback to legacy API
    console.log("🔄 Falling back to legacy API due to error...");
    return await createPaymentLinkLegacy({
      supabaseAdmin,
      quoteId,
      amount,
      originalAmount,
      currency,
      customerInfo,
      description,
      expiryDays,
      paymentTransactionId: params.paymentTransactionId,
      transactionId: params.transactionId
    });
  }
}

/**
 * Create payment link using legacy Create Invoice API (fallback)
 */
async function createPaymentLinkLegacy(params: {
  supabaseAdmin: any;
  quoteId: string;
  amount: number;
  originalAmount: number;
  currency: string;
  customerInfo: any;
  description?: string;
  expiryDays: number;
  paymentTransactionId: string;
  transactionId: string;
}): Promise<Response> {
  console.log("🔵 Using legacy Create Invoice API");

  const {
    supabaseAdmin,
    quoteId,
    amount,
    originalAmount,
    currency,
    customerInfo,
    description,
    expiryDays
  } = params;

  try {
    // Fetch PayU config
    const { data: payuGateway, error: payuGatewayError } = await supabaseAdmin
      .from('payment_gateways')
      .select('config, test_mode')
      .eq('code', 'payu')
      .single();

    if (payuGatewayError || !payuGateway) {
      return new Response(JSON.stringify({ 
        error: 'PayU gateway config missing' 
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const config = payuGateway.config || {};
    const testMode = payuGateway.test_mode;
    const payuConfig = {
      merchant_key: config.merchant_key,
      salt_key: config.salt_key,
      // Use correct API endpoints for test vs production
      api_url: testMode ? 'https://test.payu.in' : 'https://info.payu.in'
    };

    console.log("🔵 PayU config:", { 
      testMode, 
      merchant_key: config.merchant_key, 
      api_url: payuConfig.api_url,
      has_salt: !!config.salt_key 
    });

    // Generate unique invoice ID (alphanumeric only)
    const invoiceId = `INV${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    // Calculate expiry date
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiryDays);

    // Create invoice data
    const invoiceData = {
      txnid: invoiceId,
      amount: amount.toFixed(2),
      productinfo: description || `Payment for Quote ${quoteId}`,
      firstname: customerInfo.name,
      email: customerInfo.email,
      phone: customerInfo.phone,
      udf1: quoteId, // Store quote ID in UDF1
      expiryDate: expiryDate.toISOString().split('T')[0], // YYYY-MM-DD format
      templateId: 1, // Default template
      invoiceEmailNotify: 1, // Send email notification
      invoiceSmsNotify: 0, // No SMS
      currency: 'INR'
    };

    // Generate hash for create_invoice command
    const command = 'create_invoice';
    const var1 = JSON.stringify(invoiceData);
    const hashString = `${payuConfig.merchant_key}|${command}|${var1}|${payuConfig.salt_key}`;
    
    const encoder = new TextEncoder();
    const data = encoder.encode(hashString);
    const hashBuffer = await crypto.subtle.digest('SHA-512', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    console.log("🔵 Making PayU legacy API request:", {
      url: `${payuConfig.api_url}/merchant/postservice.php?form=2`,
      merchant_key: payuConfig.merchant_key,
      command: command,
      hash_length: hash.length
    });

    // Make API request to PayU
    const payuResponse = await fetch(`${payuConfig.api_url}/merchant/postservice.php?form=2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        key: payuConfig.merchant_key,
        command: command,
        hash: hash,
        var1: var1
      })
    });

    console.log("🔵 PayU API response status:", payuResponse.status);

    if (!payuResponse.ok) {
      const errorText = await payuResponse.text();
      console.error("❌ PayU API request failed:", errorText);
      throw new Error(`PayU API request failed: ${payuResponse.status} - ${errorText}`);
    }

    const payuResult = await payuResponse.json();
    console.log("🔵 PayU API response:", JSON.stringify(payuResult, null, 2));
    
    // Legacy API uses status: 1 for success
    if (payuResult.status !== 1) {
      console.error("❌ PayU legacy API error response:", payuResult);
      throw new Error(`PayU API error: ${payuResult.msg || payuResult.error || 'Unknown error'} (Status: ${payuResult.status})`);
    }
    
    // STEP 2: External API Success - Update payment_state to external_created
    console.log("🔄 COMPENSATION: Updating payment state to external_created (legacy)");
    const { error: externalUpdateError } = await supabaseAdmin
      .from('payment_transactions')
      .update({
        gateway_transaction_id: invoiceId,
        payment_state: 'external_created',
        gateway_response: payuResult,
        metadata: {
          quote_id: quoteId,
          original_amount: originalAmount,
          original_currency: currency,
          customer_info: customerInfo,
          description: description,
          api_method: 'legacy',
          compensation_step: 'external_created',
          payu_invoice_id: invoiceId,
          payment_url: payuResult.URL || payuResult.result?.paymentLink || payuResult.paymentLink,
          external_api_success_at: new Date().toISOString()
        }
      })
      .eq('id', params.paymentTransactionId);
      
    if (externalUpdateError) {
      console.error("❌ COMPENSATION: Failed to update payment state to external_created:", externalUpdateError);
      // Continue execution but log the issue - PayU invoice exists
    } else {
      console.log("✅ COMPENSATION: Payment state updated to external_created (legacy)");
    }

    // Generate unique link code for our system
    const linkCode = await generateLinkCode(supabaseAdmin);

    // Store payment link in database
    const { data: paymentLink, error: insertError } = await supabaseAdmin
      .from('payment_links')
      .insert({
        quote_id: quoteId,
        gateway: 'payu',
        api_version: 'v1_legacy',
        gateway_link_id: invoiceId,
        link_code: linkCode,
        title: description || `Payment for Quote ${quoteId}`,
        amount: amount,
        currency: 'INR',
        original_amount: originalAmount,
        original_currency: currency,
        payment_url: payuResult.URL || payuResult.result?.paymentLink || payuResult.paymentLink || `${payuConfig.api_url}/invoice/${invoiceId}`,
        expires_at: expiryDate.toISOString(),
        status: 'active',
        gateway_request: invoiceData,
        gateway_response: payuResult,
        customer_email: customerInfo.email,
        customer_name: customerInfo.name,
        customer_phone: customerInfo.phone
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error storing payment link:', insertError);
      return new Response(JSON.stringify({
        error: 'Failed to store payment link in database',
        details: insertError.message,
        payuLinkCreated: true,
        payuLinkId: invoiceId
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    console.log('✅ Payment link stored in database successfully (legacy):', paymentLink);
    
    // STEP 3: Database Insert Success - Update payment_state to db_recorded
    console.log("🔄 COMPENSATION: Updating payment state to db_recorded (legacy)");
    const { error: finalUpdateError } = await supabaseAdmin
      .from('payment_transactions')
      .update({
        payment_state: 'db_recorded',
        metadata: {
          quote_id: quoteId,
          original_amount: originalAmount,
          original_currency: currency,
          customer_info: customerInfo,
          description: description,
          api_method: 'legacy',
          compensation_step: 'db_recorded',
          payu_invoice_id: invoiceId,
          payment_link_id: paymentLink.id,
          link_code: linkCode,
          payment_url: payuResult.URL || payuResult.result?.paymentLink || payuResult.paymentLink,
          db_recorded_at: new Date().toISOString()
        }
      })
      .eq('id', params.paymentTransactionId);
      
    if (finalUpdateError) {
      console.error("❌ COMPENSATION: Failed to update payment state to db_recorded:", finalUpdateError);
      // Continue execution - payment link is functional but state tracking incomplete
    } else {
      console.log("✅ COMPENSATION: Payment state updated to db_recorded - payment link creation complete (legacy)");
    }

    const publicUrl = Deno.env.get('PUBLIC_URL') || 'https://iwishbag.com';
    const shortUrl = `${publicUrl}/pay/${linkCode}`;

    return new Response(JSON.stringify({
      success: true,
      apiVersion: 'v1_legacy',
      fallbackUsed: true,
      linkId: invoiceId,
      linkCode: linkCode,
      paymentUrl: payuResult.URL || payuResult.result?.paymentLink || payuResult.paymentLink || `${payuConfig.api_url}/invoice/${invoiceId}`,
      shortUrl: shortUrl,
      expiresAt: expiryDate.toISOString(),
      amountInINR: amount.toFixed(2),
      originalAmount: originalAmount,
      originalCurrency: currency,
      exchangeRate: currency !== 'INR' ? (amount / originalAmount) : 1
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("❌ Legacy API error:", error);
    
    // STEP 4: Error Handling - Update payment_state based on error context
    try {
      let errorState = 'failed';
      let errorContext = 'unknown_error';
      
      if (error.message?.includes('PayU') || error.message?.includes('API')) {
        errorState = 'orphaned';
        errorContext = 'payu_api_error';
      } else if (error.message?.includes('database') || error.message?.includes('supabase')) {
        errorState = 'orphaned';
        errorContext = 'database_error_after_external_success';
      }
      
      console.log(`🔄 COMPENSATION: Updating payment state to ${errorState} due to error (legacy)`);
      
      await params.supabaseAdmin
        .from('payment_transactions')
        .update({
          payment_state: errorState,
          status: 'failed',
          metadata: {
            error_context: errorContext,
            error_message: error.message,
            error_time: new Date().toISOString(),
            compensation_step: 'error_handling',
            api_method: 'legacy'
          }
        })
        .eq('id', params.paymentTransactionId);
        
      console.log(`✅ COMPENSATION: Payment state updated to ${errorState} (legacy)`);
    } catch (compensationError) {
      console.error("❌ COMPENSATION: Failed to update payment state on error:", compensationError);
    }
    
    return new Response(JSON.stringify({
      error: 'Legacy API failed',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Map custom field types to PayU format
 */
function mapFieldType(type: string): string {
  const typeMap: { [key: string]: string } = {
    'text': 'TEXT',
    'number': 'NUMBER',
    'email': 'EMAIL',
    'phone': 'PHONE',
    'date': 'DATE',
    'dropdown': 'DROPDOWN'
  };
  
  return typeMap[type] || 'TEXT';
}

/**
 * Generate unique link code
 */
async function generateLinkCode(supabaseAdmin: any): Promise<string> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let attempts = 0;
  
  while (attempts < 10) {
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Check if code already exists
    const { data: existing } = await supabaseAdmin
      .from('payment_links')
      .select('id')
      .eq('link_code', code)
      .single();
    
    if (!existing) {
      return code;
    }
    
    attempts++;
  }
  
  // Fallback to timestamp-based code
  return `PLV2${Date.now()}`;
}