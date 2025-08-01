#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testEmailSending() {
  console.log('🧪 Testing AWS SES Email Sending...\n');

  try {
    // Test email data
    const emailData = {
      to: 'rnkbohra@gmail.com',
      subject: 'Test Quote Email from iwishBag',
      html: `
        <h1>Test Email</h1>
        <p>This is a test email to verify AWS SES integration.</p>
        <p>If you receive this, the email system is working!</p>
        <a href="https://iwishbag.com" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Visit iwishBag
        </a>
      `,
      text: 'Test email from iwishBag. If you receive this, the email system is working!',
      from: 'iwishBag <noreply@mail.iwishbag.com>',
      replyTo: 'support@mail.iwishbag.com',
    };

    console.log('📧 Sending test email to:', emailData.to);
    console.log('📤 From:', emailData.from);
    console.log('🔗 Calling edge function:', `${supabaseUrl}/functions/v1/send-email-ses`);

    const { data, error } = await supabase.functions.invoke('send-email-ses', {
      body: emailData,
    });

    if (error) {
      console.error('\n❌ Error:', error);
      console.error('Status:', error.status);
      console.error('Message:', error.message);
      
      // Try to get more details
      if (error.context) {
        console.error('Context:', error.context);
      }
    } else {
      console.log('\n✅ Success! Email sent.');
      console.log('Response:', data);
    }

  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
  }
}

// Also test calling the function directly with fetch
async function testDirectFetch() {
  console.log('\n\n🔍 Testing direct fetch to edge function...\n');

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-email-ses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        to: 'rnkbohra@gmail.com',
        subject: 'Direct Fetch Test',
        html: '<p>Test via direct fetch</p>',
        text: 'Test via direct fetch',
        from: 'iwishBag <noreply@mail.iwishbag.com>',
        replyTo: 'support@mail.iwishbag.com',
      }),
    });

    console.log('Response status:', response.status);
    const responseText = await response.text();
    console.log('Response body:', responseText);

    if (!response.ok) {
      try {
        const errorData = JSON.parse(responseText);
        console.error('Error details:', errorData);
      } catch {
        console.error('Raw error:', responseText);
      }
    }
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

// Run tests
async function runTests() {
  await testEmailSending();
  // await testDirectFetch(); // Commented out to send only one email
  
  console.log('\n\n💡 Debugging Tips:');
  console.log('1. Check Supabase Dashboard → Edge Functions → Logs');
  console.log('2. Verify AWS credentials are set in Supabase secrets');
  console.log('3. Check if mail.iwishbag.com is verified in AWS SES');
  console.log('4. Ensure you\'re not in SES sandbox mode for rnkbohra@gmail.com');
}

runTests().catch(console.error);