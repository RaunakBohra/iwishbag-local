import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSparrowSMS() {
  console.log('🚀 Testing Sparrow SMS...\n');

  // Phone number to test (you can change this)
  const testPhone = '+9779803939607'; // Your Nepal number for Sparrow SMS
  const testMessage = 'Hello from iwishBag! This is a test SMS sent via Sparrow SMS. Time: ' + new Date().toLocaleString();

  try {
    // Call the send-sms edge function
    const { data, error } = await supabase.functions.invoke('send-sms', {
      body: {
        phone: testPhone,
        message: testMessage,
        type: 'test',
      },
    });

    if (error) {
      console.error('❌ Error sending SMS:', error);
      return;
    }

    console.log('✅ SMS sent successfully!');
    console.log('Response:', JSON.stringify(data, null, 2));

    // Check if SMS was stored in database
    if (data.id) {
      const { data: smsRecord } = await supabase
        .from('sms_messages')
        .select('*')
        .eq('id', data.id)
        .single();

      if (smsRecord) {
        console.log('\n📊 SMS Record in Database:');
        console.log('- Status:', smsRecord.status);
        console.log('- Provider:', smsRecord.provider);
        console.log('- Credits Used:', smsRecord.credits_used);
        console.log('- Created At:', smsRecord.created_at);
      }
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

// Run the test
testSparrowSMS();