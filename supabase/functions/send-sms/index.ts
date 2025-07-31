import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createCorsHeaders } from '../_shared/cors.ts';

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

// Sparrow SMS for Nepal
const sendSparrowSMS = async (phone: string, message: string) => {
  const sparrowToken = Deno.env.get('SPARROW_SMS_TOKEN');
  const sparrowSender = Deno.env.get('SPARROW_SMS_SENDER');
  
  if (!sparrowToken || !sparrowSender) {
    throw new Error('Sparrow SMS credentials not configured');
  }

  console.log('🇳🇵 Sending SMS via Sparrow SMS to:', phone);
  
  const response = await fetch('https://api.sparrowsms.com/v2/sms/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sparrowToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: sparrowSender,
      message: message,
      phone: phone.replace(/[^\d]/g, ''), // Remove non-digits for Sparrow
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('❌ Sparrow SMS error:', errorData);
    throw new Error(`Sparrow SMS error: ${response.status} ${errorData}`);
  }

  const result = await response.json();
  console.log('✅ Sparrow SMS sent successfully:', result);
  return result;
};

// MSG91 for India
const sendMSG91SMS = async (phone: string, message: string) => {
  const msg91AuthKey = Deno.env.get('MSG91_AUTH_KEY');
  const msg91Sender = Deno.env.get('MSG91_SENDER');
  const msg91TemplateId = Deno.env.get('MSG91_TEMPLATE_ID');
  
  if (!msg91AuthKey || !msg91Sender) {
    throw new Error('MSG91 credentials not configured');
  }

  console.log('🇮🇳 Sending SMS via MSG91 to:', phone);
  
  // MSG91 API endpoint for sending SMS
  const response = await fetch('https://control.msg91.com/api/v5/flow/', {
    method: 'POST',
    headers: {
      'Authkey': msg91AuthKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: msg91Sender,
      message: message,
      mobiles: phone.replace(/[^\d]/g, ''), // Remove non-digits
      template_id: msg91TemplateId || undefined,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('❌ MSG91 SMS error:', errorData);
    throw new Error(`MSG91 SMS error: ${response.status} ${errorData}`);
  }

  const result = await response.json();
  console.log('✅ MSG91 SMS sent successfully:', result);
  return result;
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
    
    const { phone, message, type } = body;
    
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

    // Send SMS via appropriate provider
    const result = await sendSMS(phone, message);
    
    const country = detectCountryFromPhone(phone);
    const provider = country === 'NP' ? 'Sparrow SMS' : 
                    country === 'IN' ? 'MSG91' : 'Twilio';
    
    console.log(`✅ SMS sent successfully via ${provider}`);
    
    return new Response(
      JSON.stringify({
        success: true,
        provider,
        country,
        phone: phone.replace(/\d(?=\d{4})/g, '*'), // Mask phone number in response
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