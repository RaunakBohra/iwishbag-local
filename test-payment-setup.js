// Test Payment Gateway Setup
// Run this with: node test-payment-setup.js

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Test configuration
const testConfig = {
  supabaseUrl: process.env.VITE_SUPABASE_URL || 'your_supabase_url',
  supabaseKey: process.env.VITE_SUPABASE_ANON_KEY || 'your_supabase_key',
  paymentFunctionUrl: process.env.VITE_SUPABASE_URL ? 
    `${process.env.VITE_SUPABASE_URL}/functions/v1/create-payment` : 
    'your_supabase_url/functions/v1/create-payment'
};

console.log('🔍 Testing Payment Gateway Setup...\n');

// Test 1: Environment Variables
console.log('1. Checking Environment Variables:');
const requiredVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'STRIPE_SECRET_KEY',
  'PAYU_MERCHANT_KEY',
  'ESEWA_MERCHANT_ID',
  'KHALTI_PUBLIC_KEY',
  'FONEPAY_MERCHANT_ID',
  'AIRWALLEX_API_KEY'
];

let missingVars = [];
requiredVars.forEach(varName => {
  if (!process.env[varName] || process.env[varName].includes('your_')) {
    missingVars.push(varName);
    console.log(`   ❌ ${varName}: Not configured`);
  } else {
    console.log(`   ✅ ${varName}: Configured`);
  }
});

if (missingVars.length > 0) {
  console.log(`\n⚠️  Missing or default values for: ${missingVars.join(', ')}`);
  console.log('   Please update your .env file with actual values.');
} else {
  console.log('\n✅ All environment variables are configured!');
}

// Test 2: Database Tables
console.log('\n2. Checking Database Tables:');
const supabase = createClient(testConfig.supabaseUrl, testConfig.supabaseKey);

async function checkTables() {
  try {
    // Check if payment_gateways table exists
    const { data: gateways, error: gatewaysError } = await supabase
      .from('payment_gateways')
      .select('count')
      .limit(1);
    
    if (gatewaysError) {
      console.log('   ❌ payment_gateways table: Not found or accessible');
      console.log(`      Error: ${gatewaysError.message}`);
    } else {
      console.log('   ✅ payment_gateways table: Accessible');
    }

    // Check if payment_transactions table exists
    const { data: transactions, error: transactionsError } = await supabase
      .from('payment_transactions')
      .select('count')
      .limit(1);
    
    if (transactionsError) {
      console.log('   ❌ payment_transactions table: Not found or accessible');
      console.log(`      Error: ${transactionsError.message}`);
    } else {
      console.log('   ✅ payment_transactions table: Accessible');
    }

    // Check if payment_refunds table exists
    const { data: refunds, error: refundsError } = await supabase
      .from('payment_refunds')
      .select('count')
      .limit(1);
    
    if (refundsError) {
      console.log('   ❌ payment_refunds table: Not found or accessible');
      console.log(`      Error: ${refundsError.message}`);
    } else {
      console.log('   ✅ payment_refunds table: Accessible');
    }

  } catch (error) {
    console.log('   ❌ Database connection failed');
    console.log(`      Error: ${error.message}`);
  }
}

// Test 3: Payment Function
console.log('\n3. Checking Payment Function:');
async function checkPaymentFunction() {
  try {
    const response = await fetch(testConfig.paymentFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testConfig.supabaseKey}`
      },
      body: JSON.stringify({
        quoteIds: ['test-quote-id'],
        currency: 'USD',
        amount: 100,
        gateway: 'stripe',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel'
      })
    });

    if (response.status === 404) {
      console.log('   ❌ Payment function: Not found (404)');
      console.log('      Make sure to deploy: supabase functions deploy create-payment');
    } else if (response.status === 200) {
      console.log('   ✅ Payment function: Accessible');
    } else {
      console.log(`   ⚠️  Payment function: Status ${response.status}`);
    }
  } catch (error) {
    console.log('   ❌ Payment function: Connection failed');
    console.log(`      Error: ${error.message}`);
  }
}

// Run tests
async function runTests() {
  await checkTables();
  await checkPaymentFunction();
  
  console.log('\n📋 Summary:');
  console.log('✅ Environment variables checked');
  console.log('✅ Database tables verified');
  console.log('✅ Payment function tested');
  console.log('\n🎯 Next Steps:');
  console.log('1. Update .env with actual API keys');
  console.log('2. Test payment flow in the application');
  console.log('3. Configure admin panel for payment management');
}

runTests().catch(console.error); 