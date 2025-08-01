import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createCorsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts';

const getSupabaseClient = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  return createClient(supabaseUrl, supabaseServiceKey);
};

// Generate 6-digit OTP
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Simple hash function for OTP (since bcrypt is causing issues)
const hashOTP = async (otp: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(otp + Deno.env.get('SUPABASE_JWT_SECRET'));
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
};

serve(async (req) => {
  console.log('📱 === SEND PHONE OTP FUNCTION STARTED ===');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: createCorsHeaders(req, ['GET', 'POST', 'PUT', 'DELETE']),
    });
  }

  try {
    const body = await req.json();
    console.log('📱 Phone OTP request:', JSON.stringify(body, null, 2));
    
    const { phone, type = 'login' } = body;
    
    if (!phone) {
      return new Response(
        JSON.stringify({
          error: 'Phone number is required',
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

    const supabase = getSupabaseClient();

    // Generate OTP
    const otp = generateOTP();
    const otpHash = await hashOTP(otp);
    
    // TEST MODE: Log OTP for testing without SMS
    console.log('🔑 TEST MODE - Generated OTP:', otp);
    console.log('📱 Phone:', phone);

    // Delete any existing OTPs for this phone
    await supabase
      .from('phone_otps')
      .delete()
      .eq('phone', phone)
      .is('used_at', null);

    // Store OTP in database
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes expiry

    const { data: otpData, error: otpError } = await supabase
      .from('phone_otps')
      .insert({
        phone,
        otp_hash: otpHash,
        expires_at: expiresAt.toISOString(),
        type,
      })
      .select()
      .single();

    if (otpError) {
      console.error('❌ Error storing OTP:', otpError);
      throw new Error('Failed to generate OTP');
    }

    // TEST MODE: Skip SMS sending
    const testMode = true;
    
    if (!testMode) {
      // Send SMS via our send-sms function
      const message = `Your iwishBag verification code is: ${otp}. Valid for 10 minutes.`;
      
      const smsUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-sms`;
      const smsResponse = await fetch(smsUrl, {
        method: 'POST',
        headers: {
          'Authorization': req.headers.get('authorization') || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone,
          message,
          type: 'otp',
        }),
      });

      if (!smsResponse.ok) {
        const error = await smsResponse.text();
        console.error('❌ Failed to send SMS:', error);
        
        // Delete the OTP record if SMS fails
        await supabase
          .from('phone_otps')
          .delete()
          .eq('id', otpData.id);
          
        throw new Error('Failed to send SMS');
      }

      const smsResult = await smsResponse.json();
      console.log('✅ SMS sent successfully:', smsResult);
    } else {
      console.log('📧 TEST MODE: SMS skipped. Use OTP from console logs');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'OTP sent successfully',
        expires_at: expiresAt.toISOString(),
        // TEST MODE: Include OTP in response for testing
        test_otp: testMode ? otp : undefined,
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
    console.error('❌ Phone OTP error:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Failed to send OTP',
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