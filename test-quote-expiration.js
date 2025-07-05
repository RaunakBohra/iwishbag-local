// Test script to verify quote expiration system
import { createClient } from '@supabase/supabase-js';

// Mock environment variables (replace with actual values for testing)
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'your_supabase_url';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your_service_key';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testQuoteExpiration() {
  console.log('🧪 Testing Quote Expiration System...\n');

  try {
    // 1. Test the expire_quotes function
    console.log('1️⃣ Testing expire_quotes function...');
    const { data: expiredCount, error } = await supabase.rpc('expire_quotes');
    
    if (error) {
      console.error('❌ Error calling expire_quotes:', error);
      return;
    }
    
    console.log(`✅ expire_quotes function returned: ${expiredCount} expired quotes`);

    // 2. Check for quotes that should be expired
    console.log('\n2️⃣ Checking for expired quotes...');
    const { data: expiredQuotes, error: fetchError } = await supabase
      .from('quotes')
      .select('id, display_id, email, status, sent_at, expires_at, final_total')
      .eq('status', 'expired')
      .order('updated_at', { ascending: false })
      .limit(5);

    if (fetchError) {
      console.error('❌ Error fetching expired quotes:', fetchError);
    } else {
      console.log(`📋 Found ${expiredQuotes?.length || 0} expired quotes:`);
      expiredQuotes?.forEach(quote => {
        console.log(`   - ${quote.display_id || quote.id} (${quote.email}) - $${quote.final_total}`);
        console.log(`     Sent: ${quote.sent_at}, Expired: ${quote.expires_at}`);
      });
    }

    // 3. Check for quotes that are about to expire (sent status with expires_at)
    console.log('\n3️⃣ Checking for quotes about to expire...');
    const { data: expiringQuotes, error: expiringError } = await supabase
      .from('quotes')
      .select('id, display_id, email, status, sent_at, expires_at, final_total')
      .eq('status', 'sent')
      .not('expires_at', 'is', null)
      .order('expires_at', { ascending: true })
      .limit(5);

    if (expiringError) {
      console.error('❌ Error fetching expiring quotes:', expiringError);
    } else {
      console.log(`⏰ Found ${expiringQuotes?.length || 0} quotes about to expire:`);
      expiringQuotes?.forEach(quote => {
        const now = new Date();
        const expiresAt = new Date(quote.expires_at);
        const timeLeft = expiresAt - now;
        const daysLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hoursLeft = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        
        console.log(`   - ${quote.display_id || quote.id} (${quote.email}) - $${quote.final_total}`);
        console.log(`     Expires in: ${daysLeft}d ${hoursLeft}h`);
      });
    }

    // 4. Test status transition logging
    console.log('\n4️⃣ Checking status transition logs...');
    const { data: transitions, error: transitionError } = await supabase
      .from('status_transitions_log')
      .select('*')
      .eq('trigger', 'auto_expiration')
      .order('changed_at', { ascending: false })
      .limit(3);

    if (transitionError) {
      console.error('❌ Error fetching status transitions:', transitionError);
    } else {
      console.log(`📝 Found ${transitions?.length || 0} auto-expiration transitions:`);
      transitions?.forEach(transition => {
        console.log(`   - Quote ${transition.quote_id}: ${transition.from_status} → ${transition.to_status}`);
        console.log(`     Trigger: ${transition.trigger}, Time: ${transition.changed_at}`);
      });
    }

    // 5. Test the trigger function by updating a quote status
    console.log('\n5️⃣ Testing trigger function...');
    const { data: testQuote, error: testError } = await supabase
      .from('quotes')
      .select('id, status, sent_at, expires_at')
      .eq('status', 'pending')
      .limit(1)
      .single();

    if (testError || !testQuote) {
      console.log('⚠️  No pending quotes found for testing trigger');
    } else {
      console.log(`🔧 Testing trigger with quote ${testQuote.id}...`);
      
      // Update status to 'sent' to trigger expiration
      const { error: updateError } = await supabase
        .from('quotes')
        .update({ status: 'sent' })
        .eq('id', testQuote.id);

      if (updateError) {
        console.error('❌ Error updating quote status:', updateError);
      } else {
        // Check if sent_at and expires_at were set
        const { data: updatedQuote, error: checkError } = await supabase
          .from('quotes')
          .select('id, status, sent_at, expires_at')
          .eq('id', testQuote.id)
          .single();

        if (checkError) {
          console.error('❌ Error checking updated quote:', checkError);
        } else {
          console.log('✅ Trigger function test results:');
          console.log(`   - Status: ${updatedQuote.status}`);
          console.log(`   - Sent at: ${updatedQuote.sent_at}`);
          console.log(`   - Expires at: ${updatedQuote.expires_at}`);
          
          if (updatedQuote.sent_at && updatedQuote.expires_at) {
            console.log('✅ Trigger function working correctly!');
          } else {
            console.log('❌ Trigger function not working as expected');
          }
        }
      }
    }

    console.log('\n🎉 Quote expiration system test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testQuoteExpiration(); 