// Test Payment Flow
// Run this with: node test-payment-flow.js

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Add credentials for your test user to your .env file
const testUserEmail = process.env.TEST_USER_EMAIL;
const testUserPassword = process.env.TEST_USER_PASSWORD;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing Supabase environment variables');
  console.log('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file');
  process.exit(1);
}

if (!testUserEmail || !testUserPassword) {
  console.log('❌ Missing test user credentials');
  console.log('Please set TEST_USER_EMAIL and TEST_USER_PASSWORD in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPaymentFlow() {
  console.log('🧪 Testing Payment Flow...\n');

  try {
    // Step 1: Sign in as a test user to comply with RLS policies
    console.log(`1. Signing in as test user: ${testUserEmail}...`);
    const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
      email: testUserEmail,
      password: testUserPassword,
    });

    if (signInError) {
      console.error('❌ Failed to sign in test user:', signInError.message);
      console.error('Please ensure the test user exists and credentials in .env are correct.');
      return;
    }

    console.log('✅ Signed in successfully.');

    // Step 2: Create a test quote associated with the signed-in user
    console.log('\n2. Creating test quote...');
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .insert({
        user_id: user.id, // Associate quote with the signed-in user
        email: user.email, // Use the user's email
        product_name: 'Test Product',
        item_price: 100,
        quantity: 1,
        status: 'pending',
        final_total: 100,
        final_currency: 'USD',
        items_currency: 'USD'
      })
      .select()
      .single();

    if (quoteError) {
      console.error('❌ Failed to create test quote:', quoteError.message);
      return;
    }

    console.log('✅ Test quote created:', quote.id);

    // Step 3: Test payment function
    console.log('\n3. Testing payment function...');
    const paymentResponse = await fetch(`${supabaseUrl}/functions/v1/create-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}` // Use service_role key for admin-level function calls
      },
      body: JSON.stringify({
        quoteIds: [quote.id],
        currency: 'USD',
        amount: 100,
        gateway: 'stripe',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
        metadata: {
          user_id: user.id,
          user_email: user.email
        }
      })
    });

    const paymentResult = await paymentResponse.json();
    
    if (paymentResponse.ok) {
      console.log('✅ Payment function working');
      console.log('Response:', paymentResult);
    } else {
      console.error('❌ Payment function error:', paymentResult);
    }

    // Step 4: Check transaction record
    console.log('\n4. Checking transaction record...');
    const { data: transactions, error: transactionError } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('quote_id', quote.id);

    if (transactionError) {
      console.error('❌ Failed to fetch transactions:', transactionError.message);
    } else {
      console.log('✅ Transaction record found:', transactions.length, 'transactions');
      transactions.forEach(t => {
        console.log(`   - ID: ${t.id}, Status: ${t.status}, Gateway: ${t.gateway_code}`);
      });
    }

    // Step 5: Check payment gateways
    console.log('\n5. Checking payment gateways...');
    const { data: gateways, error: gatewayError } = await supabase
      .from('payment_gateways')
      .select('*')
      .eq('is_active', true);

    if (gatewayError) {
      console.error('❌ Failed to fetch gateways:', gatewayError.message);
    } else {
      console.log('✅ Active payment gateways:', gateways.length);
      gateways.forEach(g => {
        console.log(`   - ${g.name} (${g.code}): ${g.supported_countries.length} countries`);
      });
    }

    console.log('\n🎉 Payment system test completed!');
    console.log('\nNext steps:');
    console.log('1. Test in the web app UI');
    console.log('2. Configure real API keys for gateways');
    console.log('3. Test with actual payment gateways');

  } catch (error) {
    console.error('❌ Test script failed:', error.message);
  } finally {
    // Sign out the user at the end of the test
    await supabase.auth.signOut();
    console.log('\n👋 Signed out test user.');
  }
}

testPaymentFlow(); 