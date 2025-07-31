import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// Verify OTP from database
const verifyOTP = async (phone: string, otp: string) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration missing');
  }

  console.log('🔍 Verifying OTP for phone:', phone.replace(/\d(?=\d{4})/g, '*'));
  
  // Get the latest OTP for this phone number
  const response = await fetch(
    `${supabaseUrl}/rest/v1/phone_otps?phone=eq.${encodeURIComponent(phone)}&expires_at=gte.${new Date().toISOString()}&order=created_at.desc&limit=1`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.text();
    console.error('❌ Failed to fetch OTP:', errorData);
    throw new Error(`Failed to fetch OTP: ${response.status}`);
  }

  const otpRecords = await response.json();
  
  if (!otpRecords || otpRecords.length === 0) {
    console.log('❌ No valid OTP found for phone number');
    return { valid: false, error: 'No valid OTP found or OTP has expired' };
  }

  const otpRecord = otpRecords[0];
  const storedOtpHash = otpRecord.otp_hash;
  const providedOtpHash = btoa(otp);

  // Verify OTP
  if (storedOtpHash !== providedOtpHash) {
    console.log('❌ OTP verification failed - code mismatch');
    return { valid: false, error: 'Invalid verification code' };
  }

  // Check if OTP has expired
  const expiresAt = new Date(otpRecord.expires_at);
  const now = new Date();
  
  if (now > expiresAt) {
    console.log('❌ OTP verification failed - expired');
    return { valid: false, error: 'Verification code has expired' };
  }

  // OTP is valid, mark it as used
  await markOTPAsUsed(otpRecord.id);
  
  console.log('✅ OTP verification successful');
  return { valid: true, otpRecord };
};

// Mark OTP as used to prevent reuse
const markOTPAsUsed = async (otpId: string) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration missing');
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/phone_otps?id=eq.${otpId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      used_at: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    console.error('❌ Failed to mark OTP as used');
  } else {
    console.log('✅ OTP marked as used');
  }
};

serve(async (req) => {
  console.log('🔍 === SMS OTP VERIFICATION STARTED ===');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const body = await req.json();
    console.log('🔍 OTP Verification request:', JSON.stringify({
      ...body,
      otp: '***', // Don't log the actual OTP
    }, null, 2));
    
    const { phone, otp, type } = body;
    
    if (!phone || !otp) {
      return new Response(
        JSON.stringify({
          error: 'Phone number and OTP are required',
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

    // Verify OTP
    const verification = await verifyOTP(phone, otp);
    
    if (!verification.valid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: verification.error,
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
    
    console.log('✅ SMS OTP verification successful');
    
    return new Response(
      JSON.stringify({
        success: true,
        phone: phone.replace(/\d(?=\d{4})/g, '*'), // Mask phone number
        type,
        verified_at: new Date().toISOString(),
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
    console.error('❌ SMS OTP Verification error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to verify SMS OTP',
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