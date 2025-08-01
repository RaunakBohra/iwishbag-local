import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function sendToSupport() {
  console.log('📧 Sending email TO support@mail.iwishbag.com...\n');
  
  const { data, error } = await supabase.functions.invoke('send-email-ses', {
    body: {
      to: ['support@mail.iwishbag.com'],
      from: 'Customer <rnkbohra@gmail.com>',
      subject: 'Test Email TO Support',
      text: 'This is a test email sent TO support@mail.iwishbag.com to test the receiving pipeline.',
      html: `
        <h2>Test Email to Support</h2>
        <p>This email is sent TO support@mail.iwishbag.com to test:</p>
        <ul>
          <li>SES receiving configuration</li>
          <li>S3 storage of received emails</li>
          <li>Lambda processing function</li>
          <li>Storage in Supabase email_messages table</li>
        </ul>
        <p>If this email appears in the dashboard as 'received', the pipeline is working!</p>
      `
    }
  });
  
  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log('✅ Email sent successfully!');
    console.log('Response:', data);
    console.log('\n⏳ Wait 30-60 seconds for the email to be processed by Lambda');
    console.log('Then run: node check-email-dashboard.js');
  }
}

sendToSupport();