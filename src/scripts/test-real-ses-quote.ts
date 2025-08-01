#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testRealSESQuote() {
  console.log('🚀 Testing Real Quote Email with AWS SES\n');

  try {
    // Get or create a test quote
    const { data: existingQuotes } = await supabase
      .from('quotes_v2')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    let quote = existingQuotes?.[0];

    if (!quote) {
      console.log('📋 Creating new test quote...');
      const { data: newQuote, error } = await supabase
        .from('quotes_v2')
        .insert({
          customer_email: 'rnkbohra@gmail.com',
          customer_name: 'Raunak Bohra',
          status: 'sent',
          origin_country: 'US',
          destination_country: 'IN',
          items: [{
            id: crypto.randomUUID(),
            name: 'Apple iPhone 15 Pro Max',
            quantity: 1,
            costprice_origin: 1199,
            weight: 0.5,
            hsn_code: '8517'
          }],
          validity_days: 7
        })
        .select()
        .single();

      if (error) throw error;
      quote = newQuote;
    }

    console.log('📧 Quote details:', {
      id: quote.id,
      share_token: quote.share_token,
      customer_email: quote.customer_email
    });

    const shareUrl = `https://iwishbag.com/quote/view/${quote.share_token}`;

    // Send quote email using the working send-email-ses function
    console.log('\n📤 Sending quote email via AWS SES...\n');

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
    .quote-details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Your Quote from iwishBag</h1>
    </div>
    <div class="content">
      <h2>Hello ${quote.customer_name || 'Valued Customer'},</h2>
      
      <p>Thank you for your interest in shopping with iwishBag! Your personalized quote is ready for review.</p>
      
      <div class="quote-details">
        <h3>Quote Details</h3>
        <p><strong>Quote ID:</strong> ${quote.quote_number || quote.id.slice(0, 8).toUpperCase()}</p>
        <p><strong>Valid for:</strong> ${quote.validity_days} days</p>
        <p><strong>Items:</strong> ${quote.items?.length || 0} product(s)</p>
        <p><strong>Route:</strong> ${quote.origin_country} → ${quote.destination_country}</p>
      </div>
      
      <p style="text-align: center;">
        <a href="${shareUrl}" class="button">View Your Quote</a>
      </p>
      
      <p><strong>What's next?</strong></p>
      <ul>
        <li>Review your quote details and pricing</li>
        <li>Approve the quote when ready</li>
        <li>Make payment to start your order</li>
        <li>Track your shipment from pickup to delivery</li>
      </ul>
      
      <p>If you have any questions, feel free to reply to this email or contact our support team.</p>
    </div>
    <div class="footer">
      <p>© 2025 iwishBag - Your Global Shopping Partner</p>
      <p>This quote will expire on ${new Date(Date.now() + quote.validity_days * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
    </div>
  </div>
</body>
</html>`;

    const emailText = `
Hello ${quote.customer_name || 'Valued Customer'},

Your quote from iwishBag is ready!

Quote ID: ${quote.quote_number || quote.id.slice(0, 8).toUpperCase()}
Valid for: ${quote.validity_days} days
Items: ${quote.items?.length || 0} product(s)
Route: ${quote.origin_country} → ${quote.destination_country}

View your quote: ${shareUrl}

If you have any questions, feel free to reply to this email.

Best regards,
The iwishBag Team
`;

    const { data, error } = await supabase.functions.invoke('send-email-ses', {
      body: {
        to: quote.customer_email,
        subject: `Your Quote #${quote.quote_number || quote.id.slice(0, 8).toUpperCase()} from iwishBag`,
        html: emailHtml,
        text: emailText,
        from: 'iwishBag <noreply@mail.iwishbag.com>',
        replyTo: 'support@mail.iwishbag.com'
      }
    });

    if (error) {
      console.error('❌ Error sending email:', error);
    } else {
      console.log('✅ Quote email sent successfully!');
      console.log('Response:', data);
      
      // Update quote status
      await supabase
        .from('quotes_v2')
        .update({ 
          email_sent: true,
          sent_at: new Date().toISOString()
        })
        .eq('id', quote.id);
    }

    console.log('\n📱 Share URL:', shareUrl);
    console.log('✉️  Email sent to:', quote.customer_email);
    console.log('\n✅ Check your inbox for the quote email!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
  
  process.exit(0);
}

testRealSESQuote().catch(console.error);