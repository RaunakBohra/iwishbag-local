import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createCorsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

// Phone number country detection
const detectCountryFromPhone = (phone: string): string => {
  // Remove all non-digit characters except +
  const cleanPhone = phone.replace(/[^\d+]/g, '');
  
  // Country code mappings
  if (cleanPhone.startsWith('+977') || cleanPhone.startsWith('977')) {
    return 'NP'; // Nepal
  } else if (cleanPhone.startsWith('+91') || cleanPhone.startsWith('91')) {
    return 'IN'; // India  
  } else {
    return 'OTHER'; // Use Twilio for all other countries
  }
};

// Get Supabase client
const getSupabaseClient = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  return createClient(supabaseUrl, supabaseServiceKey);
};

// Sparrow SMS for Nepal
const sendSparrowSMS = async (phone: string, message: string) => {
  const sparrowToken = Deno.env.get('SPARROW_SMS_TOKEN');
  const sparrowSender = Deno.env.get('SPARROW_SMS_SENDER') || 'InfoAlert';
  
  if (!sparrowToken) {
    throw new Error('Sparrow SMS token not configured');
  }

  console.log('🇳🇵 Sending SMS via Sparrow SMS to:', phone);
  
  // Clean phone number - remove country code if present
  let cleanPhone = phone.replace(/[^\d]/g, '');
  if (cleanPhone.startsWith('977')) {
    cleanPhone = cleanPhone.substring(3);
  }
  
  // Sparrow SMS uses form-urlencoded data, not JSON
  const formData = new URLSearchParams({
    token: sparrowToken,
    from: sparrowSender,
    to: cleanPhone,
    text: message,
  });
  
  const response = await fetch('http://api.sparrowsms.com/v2/sms/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  const responseText = await response.text();
  console.log('Sparrow SMS Response:', responseText);

  if (!response.ok) {
    console.error('❌ Sparrow SMS error:', responseText);
    throw new Error(`Sparrow SMS error: ${response.status} ${responseText}`);
  }

  try {
    const result = JSON.parse(responseText);
    console.log('✅ Sparrow SMS sent successfully:', result);
    return result;
  } catch {
    // Sometimes Sparrow returns plain text instead of JSON
    console.log('✅ Sparrow SMS sent (text response):', responseText);
    return { response: responseText, count: 1 };
  }
};

// MSG91 for India
const sendMSG91SMS = async (phone: string, message: string) => {
  const msg91AuthKey = Deno.env.get('MSG91_AUTH_KEY');
  const msg91Sender = Deno.env.get('MSG91_SENDER') || 'MSGIND';
  const msg91TemplateId = Deno.env.get('MSG91_TEMPLATE_ID');
  
  if (!msg91AuthKey) {
    throw new Error('MSG91 AUTH_KEY not configured');
  }

  console.log('🇮🇳 Sending SMS via MSG91 to:', phone.replace(/\d(?=\d{4})/g, '*'));
  
  // Clean phone number - MSG91 expects without country code for Indian numbers
  let cleanPhone = phone.replace(/[^\d]/g, '');
  if (cleanPhone.startsWith('91')) {
    cleanPhone = cleanPhone.substring(2); // Remove 91 country code
  }
  
  console.log('📱 Clean phone for MSG91:', cleanPhone.replace(/\d(?=\d{4})/g, '*'));
  
  let response;
  let requestBody;
  
  // Try template-based API first (required for promotional/OTP messages)
  if (msg91TemplateId) {
    console.log('📝 Using MSG91 Template API with template:', msg91TemplateId);
    
    requestBody = {
      template_id: msg91TemplateId,
      sender: msg91Sender,
      short_url: "0",
      mobiles: cleanPhone,
      var1: message.match(/\d{6}/)?.[0] || 'CODE' // Extract OTP from message
    };
    
    response = await fetch('https://control.msg91.com/api/v5/flow/', {
      method: 'POST',
      headers: {
        'Authkey': msg91AuthKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
  } else {
    console.log('📝 Using MSG91 Direct SMS API');
    
    // Fallback to direct SMS API - using simpler format
    console.log('📝 Using MSG91 Direct SMS API with simple format');
    
    // Try the simpler API format first
    const params = new URLSearchParams({
      authkey: msg91AuthKey,
      mobiles: cleanPhone,
      message: message,
      sender: msg91Sender,
      route: '4', // Transactional route
      country: '91',
    });
    
    response = await fetch(`https://control.msg91.com/api/sendhttp.php?${params}`, {
      method: 'GET',
    });
  }

  console.log('📤 MSG91 Request:', JSON.stringify(requestBody, null, 2));
  
  const responseText = await response.text();
  console.log('📥 MSG91 Raw Response:', responseText);
  
  if (!response.ok) {
    console.error('❌ MSG91 SMS error:', responseText);
    throw new Error(`MSG91 SMS error: ${response.status} ${responseText}`);
  }

  let result;
  try {
    result = JSON.parse(responseText);
  } catch (parseError) {
    console.log('⚠️ MSG91 returned non-JSON response:', responseText);
    
    // Check if it's a hex encoded response
    if (/^[0-9a-fA-F]+$/.test(responseText)) {
      try {
        // Try to decode hex to ASCII
        const decoded = responseText.match(/.{2}/g)?.map(hex => String.fromCharCode(parseInt(hex, 16))).join('');
        console.log('📄 Decoded MSG91 response:', decoded);
        
        // Check if decoded contains success indicators
        if (decoded && (decoded.includes('success') || decoded.includes('sent') || decoded.includes('SMS'))) {
          result = { status: 'success', message: decoded, hex: responseText };
        } else {
          result = { status: 'error', message: decoded || responseText };
        }
      } catch (hexError) {
        console.log('❌ Failed to decode hex response');
        result = { status: 'unknown', message: responseText };
      }
    } else if (responseText.includes('success') || responseText.includes('sent')) {
      result = { status: 'success', message: responseText };
    } else {
      throw new Error(`MSG91 response parsing failed: ${responseText}`);
    }
  }
  console.log('✅ MSG91 SMS sent successfully:', result);
  
  return {
    provider: 'MSG91',
    result: result,
    phone: cleanPhone,
    template_id: msg91TemplateId,
  };
};

// Twilio for all other countries
const sendTwilioSMS = async (phone: string, message: string) => {
  const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const twilioFromNumber = Deno.env.get('TWILIO_FROM_NUMBER');
  
  if (!twilioAccountSid || !twilioAuthToken || !twilioFromNumber) {
    throw new Error('Twilio credentials not configured');
  }

  console.log('🌍 Sending SMS via Twilio to:', phone);
  
  // Twilio API uses basic auth
  const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
  
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      To: phone,
      From: twilioFromNumber,
      Body: message,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('❌ Twilio SMS error:', errorData);
    throw new Error(`Twilio SMS error: ${response.status} ${errorData}`);
  }

  const result = await response.json();
  console.log('✅ Twilio SMS sent successfully:', result);
  return result;
};

// Main SMS routing function
const sendSMS = async (phone: string, message: string) => {
  const country = detectCountryFromPhone(phone);
  console.log(`📱 Routing SMS for ${phone} to country: ${country}`);
  
  switch (country) {
    case 'NP':
      return await sendSparrowSMS(phone, message);
    case 'IN':
      return await sendMSG91SMS(phone, message);
    default:
      return await sendTwilioSMS(phone, message);
  }
};

serve(async (req) => {
  console.log('📱 === SMS FUNCTION STARTED ===');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: createCorsHeaders(req, ['GET', 'POST', 'PUT', 'DELETE']),
    });
  }

  try {
    const body = await req.json();
    console.log('📱 SMS request:', JSON.stringify(body, null, 2));
    
    const { phone, message, type, userId, customerPhone } = body;
    
    if (!phone || !message) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: phone, message',
        }),
        {
          status: 400,
          headers: {
            ...createCorsHeaders(req, ['GET', 'POST', 'PUT', 'DELETE']),
            'Content-Type': 'application/json',
          },
        },
      );
    }

    // Get auth header to check if it's a service call
    const authHeader = req.headers.get('authorization');
    const isServiceCall = authHeader?.includes('service_role') || false;

    // Get Supabase client
    const supabase = getSupabaseClient();

    // Detect country and provider
    const country = detectCountryFromPhone(phone);
    const provider = country === 'NP' ? 'sparrow' : 
                    country === 'IN' ? 'msg91' : 'twilio';

    // Create SMS record
    const smsRecord = {
      direction: 'sent',
      from_phone: 'InfoAlert',
      to_phone: phone,
      message: message,
      status: 'pending',
      provider: provider,
      country_code: country,
      metadata: {
        type: type || 'general',
        is_service_call: isServiceCall,
      },
      user_id: userId || null,
      customer_phone: customerPhone || phone,
    };

    // Insert SMS record
    const { data: smsData, error: insertError } = await supabase
      .from('sms_messages')
      .insert(smsRecord)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Failed to insert SMS record:', insertError);
      // Continue anyway - we still want to send the SMS
    }

    const messageId = smsData?.id;

    try {
      // Send SMS via appropriate provider
      const result = await sendSMS(phone, message);
      
      // Calculate credits used (1 credit per 160 characters)
      const creditsUsed = Math.ceil(message.length / 160);
      
      // Update SMS record with success
      if (messageId) {
        await supabase
          .from('sms_messages')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            credits_used: creditsUsed,
            metadata: {
              ...smsRecord.metadata,
              provider_response: result,
            },
          })
          .eq('id', messageId);
      }
      
      console.log(`✅ SMS sent successfully via ${provider}`);
      
      return new Response(
        JSON.stringify({
          success: true,
          id: messageId,
          provider,
          country,
          phone: phone.replace(/\d(?=\d{4})/g, '*'), // Mask phone number in response
          credits_used: creditsUsed,
          result,
          type,
        }),
        {
          status: 200,
          headers: {
            ...createCorsHeaders(req, ['GET', 'POST', 'PUT', 'DELETE']),
            'Content-Type': 'application/json',
          },
        },
      );
    } catch (sendError) {
      // Update SMS record with failure
      if (messageId) {
        await supabase
          .from('sms_messages')
          .update({
            status: 'failed',
            failed_at: new Date().toISOString(),
            error_message: sendError.message,
          })
          .eq('id', messageId);
      }
      
      throw sendError;
    }
    
  } catch (error) {
    console.error('❌ SMS sending error:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Failed to send SMS',
        details: error.message,
      }),
      {
        status: 500,
        headers: {
          ...createCorsHeaders(req, ['GET', 'POST', 'PUT', 'DELETE']),
          'Content-Type': 'application/json',
        },
      },
    );
  }
});