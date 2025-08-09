/**
 * Cart Abandonment Test Script
 * 
 * Tests the cart abandonment system by simulating user behavior
 * and triggering recovery emails.
 */

import { supabase } from '@/integrations/supabase/client';
import { cartAbandonmentService } from '@/services/CartAbandonmentService';
import { emailRecoveryService } from '@/services/EmailRecoveryService';
import { logger } from '@/utils/logger';

interface TestCartItem {
  quote: {
    id: string;
    total_quote_origincurrency: number;
    destination_country: string;
    customer_data?: {
      description?: string;
    };
  };
}

export async function testCartAbandonmentSystem(userEmail: string = 'rnkbohra@gmail.com') {
  console.log('🧪 Testing Cart Abandonment System...');
  
  try {
    // Step 1: Create test cart items
    const testCartItems: TestCartItem[] = [
      {
        quote: {
          id: `test-quote-${Date.now()}`,
          total_quote_origincurrency: 2500,
          destination_country: 'IN',
          customer_data: {
            description: 'iPhone 15 Pro Max from Apple US Store'
          }
        }
      },
      {
        quote: {
          id: `test-quote-${Date.now() + 1}`,
          total_quote_origincurrency: 1200,
          destination_country: 'IN',
          customer_data: {
            description: 'Nike Air Max Shoes from US'
          }
        }
      }
    ];

    const totalValue = testCartItems.reduce((sum, item) => sum + item.quote.total_quote_origincurrency, 0);
    console.log(`📦 Created test cart with ${testCartItems.length} items worth ₹${totalValue.toLocaleString()}`);

    // Step 2: Simulate cart activity tracking
    console.log('👆 Tracking cart activity...');
    await cartAbandonmentService.trackCartActivity(testCartItems, 'cart', userEmail);

    // Wait a moment for the tracking to register
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 3: Manually trigger abandonment (bypass 30-minute timer for testing)
    console.log('⏰ Manually triggering cart abandonment...');
    
    const { data: abandonmentId, error: abandonmentError } = await supabase.rpc('detect_cart_abandonment', {
      p_user_id: null, // Testing as guest user
      p_session_id: `test-session-${Date.now()}`,
      p_cart_items: testCartItems,
      p_cart_value: totalValue,
      p_currency: 'INR',
      p_stage: 'checkout',
      p_user_email: userEmail,
      p_context: {
        page_url: 'http://localhost:8082/checkout',
        user_agent: 'Test Browser',
        country: 'IN'
      }
    });

    if (abandonmentError) {
      throw new Error(`Failed to create abandonment event: ${abandonmentError.message}`);
    }

    console.log(`✅ Abandonment event created with ID: ${abandonmentId}`);

    // Step 4: Schedule immediate recovery attempt (testing)
    console.log('📧 Scheduling recovery email...');
    
    const { data: attemptId, error: attemptError } = await supabase.rpc('schedule_recovery_attempt', {
      p_abandonment_id: abandonmentId,
      p_attempt_type: 'email',
      p_sequence_number: 1,
      p_template_id: 'cart_reminder_1h',
      p_incentive: 'none'
    });

    if (attemptError) {
      throw new Error(`Failed to schedule recovery attempt: ${attemptError.message}`);
    }

    console.log(`✅ Recovery attempt scheduled with ID: ${attemptId}`);

    // Step 5: Generate and display email content
    console.log('📄 Generating email template...');
    
    const template = emailRecoveryService.getTemplate(
      'cart_reminder_1h',
      testCartItems,
      totalValue,
      'INR',
      'none'
    );

    console.log('📧 EMAIL TEMPLATE GENERATED:');
    console.log('Subject:', template.subject);
    console.log('---');
    console.log('HTML Preview (first 500 chars):');
    console.log(template.html.substring(0, 500) + '...');
    console.log('---');
    console.log('Text Version:');
    console.log(template.text);

    // Step 6: Test different email templates
    console.log('\n🎁 Testing discount email template...');
    
    const discountTemplate = emailRecoveryService.getTemplate(
      'cart_reminder_24h',
      testCartItems,
      totalValue,
      'INR',
      '5_percent_off'
    );

    console.log('Discount Email Subject:', discountTemplate.subject);

    console.log('\n🚚 Testing free shipping email template...');
    
    const shippingTemplate = emailRecoveryService.getTemplate(
      'cart_reminder_72h',
      testCartItems,
      totalValue,
      'INR',
      'free_shipping'
    );

    console.log('Free Shipping Email Subject:', shippingTemplate.subject);

    // Step 7: Test recovery landing page URL
    const recoveryUrl = `${window.location.origin}/cart-recovery?recovery=true&discount=SAVE5NOW&source=email&abandonment=${abandonmentId}`;
    console.log('\n🔗 Recovery Landing Page URL:');
    console.log(recoveryUrl);

    // Step 8: Verify database entries
    console.log('\n📊 Verifying database entries...');
    
    const { data: abandonmentEvent } = await supabase
      .from('cart_abandonment_events')
      .select('*')
      .eq('id', abandonmentId)
      .single();

    const { data: recoveryAttempt } = await supabase
      .from('cart_recovery_attempts')
      .select('*')
      .eq('id', attemptId)
      .single();

    console.log('Abandonment Event:', {
      id: abandonmentEvent?.id,
      cart_value: abandonmentEvent?.cart_value,
      currency: abandonmentEvent?.currency,
      user_email: abandonmentEvent?.user_email,
      abandonment_stage: abandonmentEvent?.abandonment_stage,
    });

    console.log('Recovery Attempt:', {
      id: recoveryAttempt?.id,
      attempt_type: recoveryAttempt?.attempt_type,
      template_id: recoveryAttempt?.template_id,
      sequence_number: recoveryAttempt?.sequence_number,
    });

    // Step 9: Test recovery page (open in browser)
    console.log('\n🌐 Opening recovery page in browser...');
    if (typeof window !== 'undefined') {
      window.open(recoveryUrl, '_blank');
    }

    console.log('\n✅ CART ABANDONMENT TEST COMPLETE!');
    console.log('📧 Email would be sent to:', userEmail);
    console.log('🔗 Recovery page ready at:', recoveryUrl);
    console.log('\nNext steps:');
    console.log('1. Visit the recovery URL to test the landing page');
    console.log('2. Check the database for abandonment tracking');
    console.log('3. Test different email templates');
    console.log('4. Monitor analytics for recovery metrics');

    return {
      success: true,
      abandonmentId,
      attemptId,
      recoveryUrl,
      emailTemplate: template,
      userEmail
    };

  } catch (error) {
    console.error('❌ Cart abandonment test failed:', error);
    logger.error('Cart abandonment test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Auto-run test in development console
if (import.meta.env.DEV && typeof window !== 'undefined') {
  // @ts-ignore
  window.testCartAbandonment = testCartAbandonmentSystem;
  console.log('💡 Run testCartAbandonment() in console to test the abandonment system');
}

export default testCartAbandonmentSystem;