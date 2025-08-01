#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Simple local email test service
class LocalEmailService {
  private getShareUrl(shareToken: string): string {
    return `http://localhost:8083/quote/view/${shareToken}`;
  }

  async sendQuoteEmail(quoteId: string): Promise<boolean> {
    try {
      const { data: quote } = await supabase
        .from('quotes_v2')
        .select('*')
        .eq('id', quoteId)
        .single();

      if (!quote) return false;

      const shareUrl = this.getShareUrl(quote.share_token);
      
      console.log('=== QUOTE EMAIL (LOCAL TEST) ===');
      console.log('To:', quote.customer_email);
      console.log('Subject:', `Your Quote #${quote.quote_number || quote.id.slice(0, 8)} from iwishBag`);
      console.log('Share URL:', shareUrl);
      console.log('\nEmail Content Preview:');
      console.log('---');
      console.log(`Hello ${quote.customer_name || 'Customer'},`);
      console.log('\nYour quote is ready! Click the link below to view:');
      console.log(shareUrl);
      console.log('\nQuote Details:');
      console.log(`- Items: ${quote.items?.length || 0} products`);
      console.log(`- Valid for: ${quote.validity_days} days`);
      console.log(`- Status: ${quote.status}`);
      console.log('---');
      console.log('================================\n');
      
      // Update the database
      await supabase
        .from('quotes_v2')
        .update({ 
          email_sent: true,
          sent_at: new Date().toISOString(),
          status: 'sent'
        })
        .eq('id', quoteId);
      
      return true;
    } catch (error) {
      console.error('Error in test email:', error);
      return false;
    }
  }

  async sendReminderEmail(quoteId: string): Promise<boolean> {
    try {
      const { data: quote } = await supabase
        .from('quotes_v2')
        .select('*')
        .eq('id', quoteId)
        .single();

      if (!quote) return false;

      const shareUrl = this.getShareUrl(quote.share_token);
      const reminderNumber = (quote.reminder_count || 0) + 1;
      
      console.log('=== REMINDER EMAIL (LOCAL TEST) ===');
      console.log('To:', quote.customer_email);
      console.log('Subject:', `Reminder: Your Quote #${quote.quote_number || quote.id.slice(0, 8)} is waiting`);
      console.log('Share URL:', shareUrl);
      console.log('Reminder #:', reminderNumber);
      console.log('\nEmail Content Preview:');
      console.log('---');
      console.log(`Hello ${quote.customer_name || 'Customer'},`);
      console.log(`\nThis is reminder #${reminderNumber} about your quote.`);
      console.log('\nYour quote is still available! Click below to review:');
      console.log(shareUrl);
      console.log(`\nThis quote expires in ${quote.validity_days} days.`);
      console.log('---');
      console.log('===================================\n');
      
      // Update reminder count
      await supabase.rpc('send_quote_reminder', { quote_id: quoteId });
      
      return true;
    } catch (error) {
      console.error('Error in test reminder:', error);
      return false;
    }
  }
}

async function testLocalEmail() {
  console.log('🧪 Testing Local Email Service (Console Output)\n');

  try {
    // First, create a test quote or get an existing one
    console.log('📋 Creating test quote...');
    
    const testQuote = {
      customer_email: 'rnkbohra@gmail.com',
      customer_name: 'Test Customer',
      status: 'sent',
      origin_country: 'US',
      destination_country: 'IN',
      items: [{
        id: crypto.randomUUID(),
        name: 'Test Product for Email',
        quantity: 1,
        costprice_origin: 100,
        weight: 0.5,
        hsn_code: '6204'
      }],
      validity_days: 7,
      customer_message: 'This is a test quote for email testing',
      payment_terms: '50% advance, 50% on delivery',
      email_sent: false,
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
      quote_number: quote.quote_number,
      share_token: quote.share_token
    });

    // Test sending quote email
    console.log('\n📧 Testing Quote Email...\n');
    const emailService = new LocalEmailService();
    
    const sendResult = await emailService.sendQuoteEmail(quote.id);
    
    if (sendResult) {
      console.log('✅ Quote email test successful!\n');
    } else {
      console.log('❌ Quote email test failed\n');
    }

    // Test reminder email
    console.log('\n🔔 Testing Reminder Email...\n');
    
    const reminderResult = await emailService.sendReminderEmail(quote.id);
    
    if (reminderResult) {
      console.log('✅ Reminder email test successful!\n');
    } else {
      console.log('❌ Reminder email test failed\n');
    }

    // Check updated quote
    const { data: updatedQuote } = await supabase
      .from('quotes_v2')
      .select('email_sent, sent_at, reminder_count')
      .eq('id', quote.id)
      .single();

    console.log('\n📊 Quote Status After Tests:');
    console.log('- Email Sent:', updatedQuote?.email_sent);
    console.log('- Sent At:', updatedQuote?.sent_at);
    console.log('- Reminder Count:', updatedQuote?.reminder_count);
    
    console.log('\n💡 To use real AWS SES:');
    console.log('1. Run: npm run setup:aws');
    console.log('2. Add your AWS credentials');
    console.log('3. Restart Supabase');
    console.log('4. Run: npm run test:email');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
  
  process.exit(0);
}

testLocalEmail().catch(console.error);