import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createCorsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts';

const getSupabaseClient = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  return createClient(supabaseUrl, supabaseServiceKey);
};

// Verify OTP hash
const verifyOTP = async (otp: string, hash: string): Promise<boolean> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(otp + Deno.env.get('SUPABASE_JWT_SECRET'));
  const newHash = await crypto.subtle.digest('SHA-256', data);
  const newHashString = btoa(String.fromCharCode(...new Uint8Array(newHash)));
  return newHashString === hash;
};

serve(async (req) => {
  console.log('🔐 === VERIFY PHONE OTP FUNCTION STARTED ===');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: createCorsHeaders(req, ['GET', 'POST', 'PUT', 'DELETE']),
    });
  }

  try {
    const body = await req.json();
    console.log('🔐 Verify OTP request:', JSON.stringify(body, null, 2));
    
    const { phone, otp } = body;
    
    if (!phone || !otp) {
      return new Response(
        JSON.stringify({
          error: 'Phone number and OTP are required',
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

    // Get the latest unused OTP for this phone
    const { data: otpRecords, error: fetchError } = await supabase
      .from('phone_otps')
      .select('*')
      .eq('phone', phone)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error('❌ Error fetching OTP:', fetchError);
      throw new Error('Failed to verify OTP');
    }

    if (!otpRecords || otpRecords.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'Invalid or expired OTP',
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

    const otpRecord = otpRecords[0];

    // Verify the OTP
    const isValid = await verifyOTP(otp, otpRecord.otp_hash);

    if (!isValid) {
      return new Response(
        JSON.stringify({
          error: 'Invalid OTP',
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

    // Mark OTP as used
    await supabase
      .from('phone_otps')
      .update({ used_at: new Date().toISOString() })
      .eq('id', otpRecord.id);

    // Check if user exists with this phone in auth.users first
    console.log('🔍 Checking for existing auth user with phone:', phone);
    const { data: existingUsers, error: authUsersError } = await supabase.auth.admin.listUsers();
    
    if (authUsersError) {
      console.error('❌ Error checking auth users:', authUsersError);
      throw new Error('Failed to check existing users');
    }

    // Find user by phone number
    const existingAuthUser = existingUsers.users.find(u => u.phone === phone);
    
    let user;
    let isNewUser = false;

    if (existingAuthUser) {
      console.log('✅ Found existing auth user:', existingAuthUser.id);
      user = existingAuthUser;
      
      // Check if profile exists, create if missing
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();
        
      if (!existingProfile) {
        console.log('🆕 Creating missing profile for existing user');
        const { error: profileCreateError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            phone: user.phone, // Use phone from user record, not request parameter
            phone_verified: true,
            email: null, // Don't store temp email in profile
          });
          
        if (profileCreateError) {
          console.error('❌ Error creating profile for existing user:', profileCreateError);
          // Continue anyway, profile creation is not critical for auth
        }
      }
    } else {
      console.log('🆕 Creating new user for phone:', phone);
      // Create new user with phone
      isNewUser = true;
      
      // Generate a temporary email for the user
      const tempEmail = `${phone.replace(/[^\d]/g, '')}@phone.iwishbag.com`;
      console.log('📧 Generated temp email:', tempEmail);
      
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: tempEmail,
        phone: phone,
        phone_confirm: true,
        user_metadata: {
          phone_verified: true,
          signed_up_via: 'phone',
        },
      });

      if (authError) {
        console.error('❌ Error creating user:', authError);
        throw new Error(`Failed to create user: ${authError.message}`);
      }

      if (!authData || !authData.user) {
        throw new Error('User creation returned invalid data');
      }

      user = authData.user;
      console.log('✅ Created new user:', user.id);

      // Create user profile - don't store the temp email in profile
      const { error: profileCreateError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          phone: user.phone, // Use phone from created user, not request parameter
          phone_verified: true,
          email: null, // Explicitly set email to null for phone-only users
        });

      if (profileCreateError) {
        console.error('❌ Error creating profile:', profileCreateError);
        // Don't throw here, user is created in auth
      }
    }

    // Generate a session token for the user
    try {
      console.log('🔐 Generating session for user:', user.id);
      
      // For existing users, generate a magic link using their email
      // For new users, we need to use the temp email we created
      const emailToUse = user.email || `${phone.replace(/[^\d]/g, '')}@phone.iwishbag.com`;
      
      const { data: tokenData, error: tokenError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: emailToUse,
        options: {
          redirectTo: `${Deno.env.get('SUPABASE_URL').replace('/supabase', '')}`,
        }
      });

      if (tokenError) {
        console.error('❌ Error generating magic link:', tokenError);
        
        // Fallback: Try to create a session directly
        console.log('🔄 Trying direct session creation...');
        
        const { data: sessionData, error: sessionError } = await supabase.auth.admin.createSession({
          user_id: user.id,
          expires_at: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour
        });
        
        if (sessionError) {
          console.error('❌ Direct session creation failed:', sessionError);
          throw new Error(`Failed to create session: ${sessionError.message}`);
        }
        
        if (!sessionData?.session) {
          throw new Error('Session creation returned invalid data');
        }
        
        console.log('✅ Direct session created successfully');
        
        return new Response(
          JSON.stringify({
            success: true,
            message: 'OTP verified successfully',
            is_new_user: isNewUser,
            session: sessionData.session,
            user: {
              id: user.id,
              email: user.email?.includes('@phone.iwishbag.com') ? null : user.email, // Hide temp emails
              phone: user.phone,
            },
          }),
          {
            status: 200,
            headers: {
              ...createCorsHeaders(req, ['GET', 'POST', 'PUT', 'DELETE']),
              'Content-Type': 'application/json',
            },
          },
        );
      }

      if (!tokenData || !tokenData.properties || !tokenData.properties.action_link) {
        throw new Error('Invalid token data returned');
      }

      console.log('✅ Magic link generated successfully');

      return new Response(
        JSON.stringify({
          success: true,
          message: 'OTP verified successfully',
          is_new_user: isNewUser,
          magic_link: tokenData.properties.action_link,
          user: {
            id: user.id,
            email: user.email?.includes('@phone.iwishbag.com') ? null : user.email, // Hide temp emails
            phone: user.phone,
          },
        }),
        {
          status: 200,
          headers: {
            ...createCorsHeaders(req, ['GET', 'POST', 'PUT', 'DELETE']),
            'Content-Type': 'application/json',
          },
        },
      );
    } catch (innerError: any) {
      console.error('❌ Session generation error:', innerError);
      throw new Error(`Failed to create session: ${innerError.message}`);
    }

  } catch (error) {
    console.error('❌ Verify OTP error:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Failed to verify OTP',
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