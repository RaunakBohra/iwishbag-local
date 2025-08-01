#!/usr/bin/env node

/**
 * Quote Reminder Script for GitHub Actions
 * Sends automated reminders for quotes that haven't been viewed
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publicSiteUrl = process.env.PUBLIC_SITE_URL || 'https://iwishbag.com';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Email sending function (implement based on your email service)
async function sendEmail(emailData) {
  // For demonstration, we'll log the email
  console.log('Sending email:', {
    to: emailData.to,
    subject: emailData.subject,
  });

  // TODO: Implement actual email sending using your service
  // Example with SendGrid:
  // const sgMail = require('@sendgrid/mail');
  // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  // await sgMail.send(emailData);

  // Example with AWS SES:
  // const AWS = require('aws-sdk');
  // const ses = new AWS.SES({ region: 'us-east-1' });
  // await ses.sendEmail(emailData).promise();

  return true;
}

// Generate reminder email HTML
function generateReminderEmailHtml(quote, shareUrl, reminderNumber) {
  const reminderMessages = [
    "Just a friendly reminder about your quote",
    "Your quote is still available",
    "Last reminder about your quote"
  ];

  const message = reminderMessages[Math.min(reminderNumber - 1, 2)];

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Quote Reminder</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #d97706;">${message}</h1>
  
  <p>Hi ${quote.customer_name || 'there'},</p>
  
  <p>Your quote #${quote.quote_number || quote.id.slice(0, 8)} is still waiting for your review.</p>
  
  <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <p><strong>Total: ${quote.customer_currency || 'USD'} ${quote.total_customer_currency || quote.total_usd}</strong></p>
    <p>Valid until: ${quote.expires_at ? new Date(quote.expires_at).toLocaleDateString() : 'No expiry'}</p>
  </div>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="${shareUrl}" style="background: #d97706; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
      Review Your Quote
    </a>
  </div>
  
  <p style="color: #92400e; text-align: center;">
    Don't miss out! Your quote may expire soon.
  </p>
</body>
</html>
  `;
}

async function main() {
  console.log('Starting quote reminder process...');
  
  const summary = {
    timestamp: new Date().toISOString(),
    processed: 0,
    sent: 0,
    errors: [],
    quotes: []
  };

  try {
    // Get quotes needing reminders
    const { data: quotesNeedingReminders, error } = await supabase
      .rpc('get_quotes_needing_reminders');

    if (error) {
      throw error;
    }

    console.log(`Found ${quotesNeedingReminders?.length || 0} quotes needing reminders`);

    // Process each quote
    for (const quote of quotesNeedingReminders || []) {
      try {
        const shareUrl = `${publicSiteUrl}/quote/view/${quote.share_token}`;
        const reminderNumber = (quote.reminder_count || 0) + 1;

        // Prepare email data
        const emailData = {
          to: quote.customer_email,
          subject: `Reminder: Your Quote #${quote.quote_number || quote.id.slice(0, 8)} is waiting`,
          html: generateReminderEmailHtml(quote, shareUrl, reminderNumber),
          text: `Hi ${quote.customer_name || 'there'},\n\nYour quote is still waiting for your review.\n\nView it here: ${shareUrl}\n\nDon't miss out!`,
        };

        // Send email
        await sendEmail(emailData);

        // Update reminder count in database
        const { error: updateError } = await supabase
          .rpc('send_quote_reminder', { quote_id: quote.id });

        if (updateError) {
          throw updateError;
        }

        summary.sent++;
        summary.quotes.push({
          id: quote.id,
          email: quote.customer_email,
          reminderNumber,
          success: true
        });

        console.log(`✅ Sent reminder #${reminderNumber} to ${quote.customer_email}`);
      } catch (error) {
        console.error(`❌ Error processing quote ${quote.id}:`, error);
        summary.errors.push({
          quoteId: quote.id,
          error: error.message
        });
      }

      summary.processed++;
    }

    // Save summary for GitHub Actions
    fs.writeFileSync('reminder-summary.json', JSON.stringify(summary, null, 2));
    
    console.log('\nReminder Summary:');
    console.log(`- Processed: ${summary.processed}`);
    console.log(`- Sent: ${summary.sent}`);
    console.log(`- Errors: ${summary.errors.length}`);

  } catch (error) {
    console.error('Fatal error:', error);
    summary.errors.push({
      type: 'fatal',
      error: error.message
    });
    fs.writeFileSync('reminder-summary.json', JSON.stringify(summary, null, 2));
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);