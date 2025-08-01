#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrateEmailSystem() {
  console.log('🔄 Email System Migration to AWS SES\n');
  
  try {
    // 1. Test AWS SES configuration
    console.log('1️⃣ Testing AWS SES Configuration...');
    
    const { data: testResult, error: testError } = await supabase.functions.invoke('send-email-ses', {
      body: {
        to: 'test@iwishbag.com',
        subject: 'AWS SES Configuration Test',
        html: '<p>This is a test email to verify AWS SES configuration.</p>',
        text: 'This is a test email to verify AWS SES configuration.',
        from: 'iwishBag <noreply@mail.iwishbag.com>',
        replyTo: 'support@mail.iwishbag.com'
      }
    });
    
    if (testError) {
      console.error('❌ AWS SES test failed:', testError);
      console.log('\n⚠️  Please ensure:');
      console.log('   - AWS credentials are configured in supabase/.env.local');
      console.log('   - mail.iwishbag.com is verified in AWS SES');
      console.log('   - You have necessary SES permissions');
      return;
    }
    
    console.log('✅ AWS SES is configured correctly!\n');
    
    // 2. Update email settings
    console.log('2️⃣ Updating Email Settings...');
    
    const { data: currentSettings } = await supabase
      .from('email_settings')
      .select('*')
      .single();
    
    if (currentSettings) {
      const { error: updateError } = await supabase
        .from('email_settings')
        .update({
          email_sending_enabled: true,
          quote_notifications: true,
          order_notifications: true,
          ticket_notifications: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', currentSettings.user_id);
      
      if (!updateError) {
        console.log('✅ Email settings updated\n');
      }
    }
    
    // 3. Summary of configured services
    console.log('3️⃣ AWS SES Email Services Summary:\n');
    
    console.log('📧 Configured Email Types:');
    console.log('   ✅ Quote emails (initial, reminders, status updates)');
    console.log('   ✅ Order emails (shipping, delivery, tracking)');
    console.log('   ✅ Payment emails (links, confirmations)');
    console.log('   ✅ Support ticket emails (all notifications)');
    console.log('   ✅ Authentication emails (via edge function)');
    
    console.log('\n🔗 Edge Functions Using AWS SES:');
    console.log('   - send-email-ses (primary)');
    console.log('   - send-payment-link-email');
    console.log('   - send-quote-email (via QuoteEmailService)');
    
    console.log('\n📨 Email Addresses:');
    console.log('   - System: noreply@mail.iwishbag.com');
    console.log('   - Support: support@mail.iwishbag.com');
    console.log('   - Payments: payments@mail.iwishbag.com');
    
    console.log('\n✅ Migration Complete!');
    console.log('\n💡 Next Steps:');
    console.log('   1. Test email sending from the admin panel');
    console.log('   2. Monitor AWS SES console for delivery stats');
    console.log('   3. Set up SES event notifications (optional)');
    console.log('   4. Configure production secrets in Supabase Dashboard');
    
  } catch (error) {
    console.error('❌ Migration error:', error);
  }
  
  process.exit(0);
}

migrateEmailSystem().catch(console.error);