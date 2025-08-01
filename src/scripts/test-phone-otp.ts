import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import readline from 'readline';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (prompt: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
};

async function testPhoneOTP() {
  console.log('🚀 Testing Phone OTP Login...\n');

  try {
    // Get phone number
    const phone = await question('Enter phone number (with country code, e.g., +9779803939607): ');
    
    console.log('\n📱 Sending OTP to:', phone);

    // Send OTP
    const { data: otpData, error: otpError } = await supabase.functions.invoke('send-phone-otp', {
      body: { phone },
    });

    if (otpError) {
      console.error('❌ Error sending OTP:', otpError);
      rl.close();
      return;
    }

    console.log('✅ OTP sent successfully!');
    console.log('Response:', JSON.stringify(otpData, null, 2));

    // Get OTP from user
    const otp = await question('\nEnter the 6-digit OTP you received: ');

    console.log('\n🔐 Verifying OTP...');

    // Verify OTP
    const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-phone-otp', {
      body: { phone, otp },
    });

    if (verifyError) {
      console.error('❌ Error verifying OTP:', verifyError);
      rl.close();
      return;
    }

    console.log('✅ OTP verified successfully!');
    console.log('Response:', JSON.stringify(verifyData, null, 2));

    if (verifyData.success && verifyData.magic_link) {
      console.log('\n🔗 Magic link generated for automatic sign-in');
      console.log('Is new user:', verifyData.is_new_user);
      console.log('User ID:', verifyData.user.id);
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  } finally {
    rl.close();
  }
}

// Run the test
testPhoneOTP();