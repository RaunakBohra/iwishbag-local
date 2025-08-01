import AWS from 'aws-sdk';
import { createClient } from '@supabase/supabase-js';
import { simpleParser } from 'mailparser';
import dotenv from 'dotenv';

dotenv.config();

// Get message ID from command line
const messageId = process.argv[2];

if (!messageId) {
  console.log('Usage: node process-email-by-id.js MESSAGE_ID');
  console.log('\nTo find message IDs, run:');
  console.log('aws s3 ls s3://iwishbag-emails/inbox/');
  process.exit(1);
}

// Initialize AWS S3
const s3 = new AWS.S3();

// Initialize local Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log(`🔍 Processing email: ${messageId}\n`);

async function processReceivedEmail(messageId) {
  try {
    const bucket = 'iwishbag-emails';
    const key = `inbox/${messageId}`;
    
    console.log(`📧 Fetching from S3: ${key}`);
    
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
    console.log(`   Date: ${new Date(emailData.received_at).toLocaleString()}`);
    console.log(`   Size: ${emailData.size_bytes} bytes`);
    if (emailData.has_attachments) {
      console.log(`   Attachments: ${emailData.attachment_count}`);
    }
    
    // Check if already processed
    const { data: existing } = await supabase
      .from('email_messages')
      .select('id')
      .eq('message_id', emailData.message_id)
      .single();
    
    if (existing) {
      console.log('\n⚠️  Email already processed and in database');
      return true;
    }
    
    // Insert into local Supabase
    const { data, error } = await supabase
      .from('email_messages')
      .insert(emailData)
      .select();
    
    if (error) {
      console.error('\n❌ Error inserting to Supabase:', error);
      return false;
    }
    
    console.log('\n✅ Email processed and stored in local Supabase!');
    
    // Process attachments if any
    if (parsedEmail.attachments && parsedEmail.attachments.length > 0) {
      console.log('\n📎 Processing attachments...');
      for (const attachment of parsedEmail.attachments) {
        console.log(`   - ${attachment.filename} (${attachment.size} bytes)`);
      }
    }
    
    return true;
    
  } catch (error) {
    if (error.code === 'NoSuchKey') {
      console.error(`\n❌ Email not found in S3: inbox/${messageId}`);
      console.log('\nAvailable emails in inbox:');
      
      // List available emails
      const listParams = {
        Bucket: 'iwishbag-emails',
        Prefix: 'inbox/'
      };
      
      try {
        const objects = await s3.listObjectsV2(listParams).promise();
        objects.Contents.forEach(obj => {
          if (obj.Key !== 'inbox/') {
            console.log(`   - ${obj.Key.replace('inbox/', '')}`);
          }
        });
      } catch (listError) {
        console.error('Error listing emails:', listError);
      }
    } else {
      console.error('\n❌ Error processing email:', error.message);
    }
    return false;
  }
}

// Process the email
processReceivedEmail(messageId).then(success => {
  if (success) {
    console.log('\n📊 Next step: Check dashboard to see the email');
    console.log('   node check-email-dashboard.js');
  }
});