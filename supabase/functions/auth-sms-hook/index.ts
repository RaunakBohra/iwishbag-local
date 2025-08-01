import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createCorsHeaders } from '../_shared/cors.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// Generate a 6-digit OTP
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

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

// MSG91 SMS for India
const sendMSG91SMS = async (phone: string, message: string) => {
  const msg91AuthKey = Deno.env.get('MSG91_AUTH_KEY');
  const msg91Sender = Deno.env.get('MSG91_SENDER');
  
  if (!msg91AuthKey || !msg91Sender) {
    throw new Error('MSG91 credentials not configured');
  }

  console.log('🇮🇳 Sending SMS via MSG91 to:', phone.replace(/\d(?=\d{4})/g, '*'));
  
  // Clean phone number - MSG91 expects without + sign
  const cleanPhone = phone.replace(/[^\d]/g, '');
  
  // MSG91 API endpoint for sending SMS
  const response = await fetch('https://control.msg91.com/api/sendhttp.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      authkey: msg91AuthKey,
      mobiles: cleanPhone,
      message: message,
      sender: msg91Sender,
      route: '4', // Transactional route
      country: cleanPhone.startsWith('91') ? '91' : '0',
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('❌ MSG91 SMS error:', errorData);
    throw new Error(`MSG91 SMS error: ${response.status} ${errorData}`);
  }

  const result = await response.text();
  console.log('✅ MSG91 SMS sent successfully:', result);
  return { provider: 'MSG91', result };
};

// Twilio SMS for all other countries
const sendTwilioSMS = async (phone: string, message: string) => {
  const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const twilioFromNumber = Deno.env.get('TWILIO_FROM_NUMBER');
  
  if (!twilioAccountSid || !twilioAuthToken || !twilioFromNumber) {
    throw new Error('Twilio credentials not configured');
  }

  console.log('🌍 Sending SMS via Twilio to:', phone.replace(/\d(?=\d{4})/g, '*'));
  console.log('📱 Twilio From Number:', twilioFromNumber);
  console.log('📱 Message to send:', message);
  
  // Twilio API uses basic auth
  const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
  
  const requestBody = new URLSearchParams({
    To: phone,
    From: twilioFromNumber,
    Body: message,
  });
  
  console.log('📱 Twilio request body:', requestBody.toString());
  
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: requestBody,
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('❌ Twilio SMS error:', errorData);
    throw new Error(`Twilio SMS error: ${response.status} ${errorData}`);
  }

  const result = await response.json();
  console.log('✅ Twilio SMS sent successfully:', result);
  return { provider: 'Twilio', result };
};

// Main SMS routing function
const sendSMS = async (phone: string, message: string, type: string = 'otp') => {
  // For now, use Twilio for all countries
  console.log(`📱 Sending SMS via Twilio to ${phone.replace(/\d(?=\d{4})/g, '*')}`);
  return await sendTwilioSMS(phone, message);
};

// Store OTP in database for verification
const storeOTP = async (phone: string, otp: string, expiresAt: Date) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration missing');
  }

  // Create a simple OTP storage table entry
  const response = await fetch(`${supabaseUrl}/rest/v1/phone_otps`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({
      phone: phone,
      otp_hash: btoa(otp), // Basic encoding (in production, use proper hashing)
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('❌ Failed to store OTP:', errorData);
    throw new Error(`Failed to store OTP: ${response.status}`);
  }

  console.log('✅ OTP stored successfully');
};

serve(async (req) => {
  console.log('📱 === SMS AUTH HOOK STARTED ===');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const body = await req.json();
    console.log('📱 SMS Auth request:', JSON.stringify(body, null, 2));
    
    const { phone, type, user_id, test_mode } = body;
    
    // Check for test mode from environment or request
    const isTestMode = test_mode || Deno.env.get('SMS_TEST_MODE') === 'true';
    
    if (!phone) {
      return new Response(
        JSON.stringify({
          error: 'Phone number is required',
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

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    console.log(`📱 Generated OTP: ${otp} for phone: ${phone.replace(/\d(?=\d{4})/g, '*')}`);
    
    // Create message based on type
    let message = '';
    switch (type) {
      case 'phone_change':
        message = `Your iWishBag phone verification code is: ${otp}. This code expires in 10 minutes. Don't share this code with anyone.`;
        break;
      case 'signup':
        message = `Welcome to iWishBag! Your verification code is: ${otp}. This code expires in 10 minutes.`;
        break;
      case 'login':
        message = `Your iWishBag login code is: ${otp}. This code expires in 10 minutes. Don't share this code with anyone.`;
        break;
      default:
        message = `Your iWishBag verification code is: ${otp}. This code expires in 10 minutes.`;
    }
    
    console.log(`📱 SMS Message: "${message}"`);
    console.log(`📱 Message length: ${message.length} characters`);

    // Store OTP for later verification
    await storeOTP(phone, otp, expiresAt);
    
    let smsResult;
    
    if (isTestMode) {
      // TEST MODE: Don't actually send SMS, just log it
      console.log('🧪 TEST MODE ENABLED - SMS NOT SENT');
      console.log('📱 Would send to:', phone);
      console.log('📝 Message:', message);
      console.log('🔐 OTP:', otp);
      console.log('⏰ Expires at:', expiresAt.toISOString());
      
      smsResult = {
        provider: 'TEST_MODE',
        result: {
          test: true,
          otp: otp, // Include OTP in test mode response
          message: 'SMS not sent in test mode. Check console logs or use check-otp.sh script.'
        }
      };
    } else {
      // PRODUCTION MODE: Actually send SMS
      smsResult = await sendSMS(phone, message, type);
    }
    
    console.log('✅ SMS OTP processed successfully');
    
    return new Response(
      JSON.stringify({
        success: true,
        phone: phone.replace(/\d(?=\d{4})/g, '*'), // Mask phone number
        provider: smsResult.provider,
        expires_at: expiresAt.toISOString(),
        type,
        ...(isTestMode ? { test_otp: otp } : {}), // Include OTP in test mode
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
    console.error('❌ SMS Auth Hook error:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Failed to send SMS OTP',
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