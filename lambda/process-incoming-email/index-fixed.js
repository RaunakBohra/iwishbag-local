const AWS = require('aws-sdk');
const { createClient } = require('@supabase/supabase-js');
const { simpleParser } = require('mailparser');

// Initialize AWS S3
const s3 = new AWS.S3();

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

exports.handler = async (event) => {
  console.log('Processing incoming email event:', JSON.stringify(event, null, 2));
  
  try {
    // SES sends its own event format, not S3 events
    for (const record of event.Records) {
      if (record.eventSource === 'aws:ses') {
        // This is a SES event
        const mail = record.ses.mail;
        const messageId = mail.messageId;
        
        // SES stores the email in S3 with a specific pattern
        // The key is usually: inbox/{messageId}
        const bucket = 'iwishbag-emails';
        const key = `inbox/${messageId}`;
        
        console.log(`Processing SES email from S3: ${bucket}/${key}`);
        
        try {
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
            message_id: parsedEmail.messageId || `ses-${Date.now()}`,
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
            metadata: {
              headers: parsedEmail.headers,
              spam_verdict: record.ses?.receipt?.spamVerdict?.status || 'UNKNOWN',
              virus_verdict: record.ses?.receipt?.virusVerdict?.status || 'UNKNOWN',
              ses_message_id: record.ses?.mail?.messageId
            }
          };
          
          // Extract customer email from to_addresses
          const customerEmail = emailData.from_address.match(/<(.+)>/)?.[1] || emailData.from_address;
          
          // Try to find associated user
          const { data: userData } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('email', customerEmail)
            .single();
          
          if (userData) {
            emailData.user_id = userData.user_id;
          }
          emailData.customer_email = customerEmail;
          
          // Insert into Supabase
          const { data, error } = await supabase
            .from('email_messages')
            .insert(emailData);
          
          if (error) {
            console.error('Error inserting email to Supabase:', error);
            throw error;
          }
          
          console.log('Email processed successfully:', emailData.message_id);
          
          // Process attachments if any
          if (parsedEmail.attachments && parsedEmail.attachments.length > 0) {
            await processAttachments(parsedEmail.attachments, emailData.message_id);
          }
        } catch (s3Error) {
          console.error('Error processing email from S3:', s3Error);
          // Continue processing other records
        }
      } else {
        console.log('Skipping non-SES event:', record.eventSource);
      }
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Email processed successfully' })
    };
    
  } catch (error) {
    console.error('Error processing email:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

async function processAttachments(attachments, messageId) {
  for (const attachment of attachments) {
    try {
      // Store attachment in S3
      const attachmentKey = `attachments/${messageId}/${attachment.filename}`;
      
      await s3.putObject({
        Bucket: 'iwishbag-emails',
        Key: attachmentKey,
        Body: attachment.content,
        ContentType: attachment.contentType,
        Metadata: {
          'message-id': messageId,
          'original-filename': attachment.filename
        }
      }).promise();
      
      console.log(`Attachment saved: ${attachmentKey}`);
    } catch (error) {
      console.error('Error saving attachment:', error);
    }
  }
}