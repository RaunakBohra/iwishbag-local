import AWS from 'aws-sdk';
import { createClient } from '@supabase/supabase-js';
import { simpleParser } from 'mailparser';
import dotenv from 'dotenv';

dotenv.config();

// Initialize AWS S3
const s3 = new AWS.S3();

// Initialize local Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔍 Processing received emails from S3 to local Supabase...\n');

async function processReceivedEmail(messageId) {
  try {
    const bucket = 'iwishbag-emails';
    const key = `inbox/${messageId}`;
    
    console.log(`📧 Processing email: ${key}`);
    
    // Get the email from S3
    const s3Object = await s3.getObject({
      Bucket: bucket,
      Key: key
    }).promise();
    
    const rawEmail = s3Object.Body.toString('utf-8');
    
    // Parse the email
    const parsedEmail = await simpleParser(rawEmail);
    
    // Extract email data
    const emailData = {
      message_id: parsedEmail.messageId || messageId,
      direction: 'received',
      from_address: parsedEmail.from?.text || 'unknown',
      to_addresses: parsedEmail.to?.value.map(addr => addr.address) || [],
      cc_addresses: parsedEmail.cc?.value.map(addr => addr.address) || [],
      subject: parsedEmail.subject || 'No Subject',
      text_body: parsedEmail.text || null,
      html_body: parsedEmail.html || null,
      s3_key: key,
      s3_bucket: bucket,
      size_bytes: s3Object.ContentLength,
      has_attachments: parsedEmail.attachments && parsedEmail.attachments.length > 0,
      attachment_count: parsedEmail.attachments?.length || 0,
      status: 'unread',
      received_at: parsedEmail.date || new Date().toISOString(),
      metadata: {}
    };
    
    // Extract customer email
    const customerEmail = emailData.from_address.match(/<(.+)>/)?.[1] || emailData.from_address;
    emailData.customer_email = customerEmail;
    
    console.log('📝 Email details:');
    console.log(`   From: ${emailData.from_address}`);
    console.log(`   To: ${emailData.to_addresses.join(', ')}`);
    console.log(`   Subject: ${emailData.subject}`);
    
    // Insert into local Supabase
    const { data, error } = await supabase
      .from('email_messages')
      .insert(emailData)
      .select();
    
    if (error) {
      console.error('❌ Error inserting to Supabase:', error);
      return false;
    }
    
    console.log('✅ Email processed and stored in local Supabase!');
    return true;
    
  } catch (error) {
    console.error('❌ Error processing email:', error);
    return false;
  }
}

// Process the test email we sent earlier
processReceivedEmail('k59ldl9s1fi1g348jpt79mkc03gkbbkcheh303g1').then(success => {
  if (success) {
    console.log('\n✅ Check dashboard to see the received email:');
    console.log('   node check-email-dashboard.js');
  }
});