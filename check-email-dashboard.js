import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkEmails() {
  console.log('📧 Checking Email Dashboard');
  console.log('===========================\n');
  
  try {
    // Get all emails
    const { data: emails, error } = await supabase
      .from('email_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('❌ Error fetching emails:', error.message);
      console.log('\n⚠️  Make sure you\'ve created the email_messages table in Supabase!');
      console.log('Run the SQL in apply-email-messages-table.sql');
      return;
    }
    
    if (!emails || emails.length === 0) {
      console.log('📭 No emails found in the database yet.');
      console.log('\nTips:');
      console.log('1. Send a test email using: npm run test:email');
      console.log('2. Send an email to support@mail.iwishbag.com');
      console.log('3. Wait a minute for processing');
      return;
    }
    
    console.log(`📬 Found ${emails.length} email(s):\n`);
    
    emails.forEach((email, index) => {
      console.log(`${index + 1}. ${email.direction.toUpperCase()} Email`);
      console.log(`   📧 Subject: ${email.subject}`);
      console.log(`   👤 From: ${email.from_address}`);
      console.log(`   📬 To: ${email.to_addresses.join(', ')}`);
      console.log(`   📅 Date: ${new Date(email.created_at).toLocaleString()}`);
      console.log(`   📊 Status: ${email.status}`);
      console.log(`   💾 S3 Key: ${email.s3_key}`);
      console.log(`   📏 Size: ${email.size_bytes} bytes`);
      
      if (email.has_attachments) {
        console.log(`   📎 Attachments: ${email.attachment_count}`);
      }
      
      console.log('');
    });
    
    // Summary
    const sentCount = emails.filter(e => e.direction === 'sent').length;
    const receivedCount = emails.filter(e => e.direction === 'received').length;
    const unreadCount = emails.filter(e => e.status === 'unread').length;
    
    console.log('📊 Summary:');
    console.log(`   📤 Sent: ${sentCount}`);
    console.log(`   📧 Received: ${receivedCount}`);
    console.log(`   🔵 Unread: ${unreadCount}`);
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

checkEmails();