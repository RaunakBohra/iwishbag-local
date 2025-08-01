#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Direct email service implementation
class QuoteEmailServiceDirect {
  async sendQuoteEmail(quoteId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('send-quote-email', {
        body: { quoteId }
      });

      if (error) throw error;
      return data?.success || false;
    } catch (error) {
      console.error('Error sending quote email:', error);
      return false;
    }
  }

  async sendReminderEmail(quoteId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('send_quote_reminder', { 
        quote_id: quoteId 
      });

      if (error) throw error;
      
      // Send actual reminder email
      const { data: emailData, error: emailError } = await supabase.functions.invoke('send-quote-reminder', {
        body: { quoteId }
      });

      if (emailError) throw emailError;
      return emailData?.success || false;
    } catch (error) {
      console.error('Error sending reminder:', error);
      return false;
    }
  }
}

async function testRealQuoteEmail() {
  console.log('🚀 Testing Real Quote Email with AWS SES\n');

  try {
    // Create a realistic test quote
    console.log('📋 Creating test quote...');
    
    const testQuote = {
      customer_email: 'rnkbohra@gmail.com',
      customer_name: 'Raunak Bohra',
      status: 'draft',
      origin_country: 'US',
      destination_country: 'IN',
      items: [
        {
          id: crypto.randomUUID(),
          name: 'Apple iPhone 15 Pro Max',
          quantity: 1,
          costprice_origin: 1199,
          weight: 0.5,
          hsn_code: '8517',
          product_url: 'https://www.apple.com/iphone-15-pro/',
          notes: '256GB, Natural Titanium'
        },
        {
          id: crypto.randomUUID(),
          name: 'Nike Air Jordan 1 Retro High',
          quantity: 2,
          costprice_origin: 180,
          weight: 1.2,
          hsn_code: '6403',
          product_url: 'https://www.nike.com/air-jordan-1',
          notes: 'Size US 10'
        }
      ],
      validity_days: 7,
      customer_message: 'Thank you for choosing iwishBag for your international shopping needs. This quote includes all costs for shipping from US to India.',
      payment_terms: '50% advance payment required, balance before shipping',
      email_sent: false,
      calculation_data: {
        subtotal: 1559,
        shipping_cost: 45,
        customs_duty: 156,
        service_fee: 78,
        total: 1838,
        currency: 'USD'
      }
    };

    const { data: quote, error: createError } = await supabase
      .from('quotes_v2')
      .insert(testQuote)
      .select()
      .single();

    if (createError) {
      console.error('❌ Error creating test quote:', createError);
      return;
    }

    console.log('✅ Test quote created:', {
      id: quote.id,
      quote_number: quote.quote_number || quote.id.slice(0, 8),
      share_token: quote.share_token
    });

    // Initialize email service
    const emailService = new QuoteEmailServiceDirect();
    
    // Send quote email
    console.log('\n📧 Sending quote email via AWS SES...\n');
    
    const sendResult = await emailService.sendQuoteEmail(quote.id);
    
    if (sendResult) {
      console.log('✅ Quote email sent successfully to:', quote.customer_email);
      console.log('Share URL:', `http://localhost:8083/quote/view/${quote.share_token}`);
    } else {
      console.log('❌ Failed to send quote email');
    }

    // Wait a moment then send reminder
    console.log('\n⏳ Waiting 3 seconds before sending reminder...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('\n🔔 Sending reminder email via AWS SES...\n');
    
    const reminderResult = await emailService.sendReminderEmail(quote.id);
    
    if (reminderResult) {
      console.log('✅ Reminder email sent successfully!');
    } else {
      console.log('❌ Failed to send reminder email');
    }

    // Check final quote status
    const { data: updatedQuote } = await supabase
      .from('quotes_v2')
      .select('email_sent, sent_at, reminder_count, status')
      .eq('id', quote.id)
      .single();

    console.log('\n📊 Final Quote Status:');
    console.log('- Status:', updatedQuote?.status);
    console.log('- Email Sent:', updatedQuote?.email_sent);
    console.log('- Sent At:', updatedQuote?.sent_at);
    console.log('- Reminder Count:', updatedQuote?.reminder_count);
    
    console.log('\n✉️  Check your email at:', quote.customer_email);
    console.log('📱 View the quote at:', `http://localhost:8083/quote/view/${quote.share_token}`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
  
  process.exit(0);
}

testRealQuoteEmail().catch(console.error);