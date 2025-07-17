#!/usr/bin/env node

// PayU Payment Flow Test Script
// This script simulates a complete payment flow for testing

const BASE_URL = 'https://grgvlrvywsfmnmkxrecd.supabase.co/functions/v1';
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

async function makeRequest(endpoint, method = 'GET', data = null) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ANON_KEY}`,
    },
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    const result = await response.text();

    return {
      status: response.status,
      statusText: response.statusText,
      data: result ? JSON.parse(result) : null,
    };
  } catch (error) {
    return {
      status: 0,
      statusText: 'Network Error',
      error: error.message,
    };
  }
}

async function testPaymentCreation() {
  console.log('🔄 Testing Payment Creation...');

  const paymentRequest = {
    quoteIds: ['test-quote-123'],
    gateway: 'payu',
    success_url: 'https://iwishbag.com/payment-success',
    cancel_url: 'https://iwishbag.com/payment-failure',
    amount: 1.0, // ₹1 for testing
    currency: 'INR',
    customerInfo: {
      name: 'Test Customer',
      email: 'test@iwishbag.com',
      phone: '9999999999',
    },
  };

  const result = await makeRequest('/create-payment', 'POST', paymentRequest);

  if (result.status === 200 && result.data) {
    console.log('✅ Payment creation successful!');
    console.log('📋 Payment Details:');
    console.log(`   Transaction ID: ${result.data.transactionId}`);
    console.log(`   Payment URL: ${result.data.url}`);
    console.log(`   Amount (INR): ₹${result.data.amountInINR}`);
    console.log(`   Exchange Rate: ${result.data.exchangeRate}`);

    return result.data;
  } else {
    console.log('❌ Payment creation failed:');
    console.log(`   Status: ${result.status}`);
    console.log(`   Error: ${result.data?.error || result.error}`);
    return null;
  }
}

async function testPaymentStatusTracking(transactionId) {
  if (!transactionId) {
    console.log('⏭️  Skipping status tracking (no transaction ID)');
    return;
  }

  console.log('\n🔄 Testing Payment Status Tracking...');

  const result = await makeRequest(`/verify-payment-status/${transactionId}`);

  if (result.status === 200 && result.data) {
    console.log('✅ Payment status check successful!');
    console.log('📊 Status Details:');
    console.log(`   Status: ${result.data.status}`);
    console.log(`   Progress: ${result.data.progress}%`);
    console.log(`   Gateway Status: ${result.data.gateway_status}`);
    console.log(`   Last Update: ${new Date(result.data.last_update).toLocaleString()}`);

    if (result.data.error_message) {
      console.log(`   Error: ${result.data.error_message}`);
    }
  } else {
    console.log('❌ Payment status check failed:');
    console.log(`   Status: ${result.status}`);
    console.log(`   Error: ${result.data?.error || result.error}`);
  }
}

async function testPaymentVerification(transactionId) {
  if (!transactionId) {
    console.log('⏭️  Skipping payment verification (no transaction ID)');
    return;
  }

  console.log('\n🔄 Testing Payment Verification...');

  const verificationRequest = {
    transaction_id: transactionId,
    gateway: 'payu',
    force_refresh: true,
  };

  const result = await makeRequest('/payment-verification', 'POST', verificationRequest);

  if (result.status === 200 && result.data) {
    console.log('✅ Payment verification successful!');
    console.log('🔍 Verification Details:');
    console.log(`   Success: ${result.data.success}`);
    console.log(`   Payment Status: ${result.data.payment_status}`);
    console.log(`   Transaction ID: ${result.data.transaction_id}`);
    console.log(`   Gateway: ${result.data.gateway.toUpperCase()}`);

    if (result.data.amount && result.data.currency) {
      console.log(`   Amount: ${result.data.amount} ${result.data.currency}`);
    }

    if (result.data.recommendations && result.data.recommendations.length > 0) {
      console.log('   Recommendations:');
      result.data.recommendations.forEach((rec, index) => {
        console.log(`     ${index + 1}. ${rec}`);
      });
    }

    if (result.data.error_message) {
      console.log(`   Error: ${result.data.error_message}`);
    }
  } else {
    console.log('❌ Payment verification failed:');
    console.log(`   Status: ${result.status}`);
    console.log(`   Error: ${result.data?.error || result.error}`);
  }
}

async function testWebhookSimulation(transactionId) {
  if (!transactionId) {
    console.log('⏭️  Skipping webhook simulation (no transaction ID)');
    return;
  }

  console.log('\n🔄 Simulating PayU Webhook...');

  // This would normally come from PayU, but we can simulate it for testing
  const webhookData = {
    txnid: transactionId,
    mihpayid: `MOJO${Date.now()}`,
    status: 'success',
    amount: '1.00',
    productinfo: `Test Product (${transactionId})`,
    firstname: 'Test Customer',
    email: 'test@iwishbag.com',
    phone: '9999999999',
    hash: 'test_hash_will_fail_verification', // This will fail hash verification
    mode: 'CC',
    bankcode: 'TEST',
    udf1: '',
    udf2: '',
    udf3: '',
    udf4: '',
    udf5: '',
  };

  console.log('ℹ️  Note: This simulation will fail hash verification (expected for testing)');

  const result = await makeRequest('/payment-webhook', 'POST', webhookData);

  console.log('📤 Webhook simulation result:');
  console.log(`   Status: ${result.status}`);
  console.log(`   Response: ${result.data?.error || result.data?.message || 'Success'}`);
}

async function testHealthMonitoring() {
  console.log('\n🔄 Testing Health Monitoring...');

  const result = await makeRequest('/payment-health-monitor', 'POST');

  if (result.status === 200 && result.data) {
    console.log('✅ Health monitoring successful!');
    console.log('💡 Health Summary:');
    console.log(`   Overall Health: ${result.data.overall_health.toUpperCase()}`);
    console.log(`   Success Rate: ${result.data.success_rate.toFixed(1)}%`);
    console.log(`   Error Rate: ${result.data.error_rate.toFixed(1)}%`);
    console.log(`   Avg Processing Time: ${result.data.avg_processing_time}ms`);

    if (result.data.alerts && result.data.alerts.length > 0) {
      console.log('   Active Alerts:');
      result.data.alerts.forEach((alert) => {
        console.log(`     🚨 ${alert.level.toUpperCase()}: ${alert.message}`);
      });
    } else {
      console.log('   ✅ No active alerts');
    }

    if (result.data.recommendations && result.data.recommendations.length > 0) {
      console.log('   Recommendations:');
      result.data.recommendations.forEach((rec, index) => {
        console.log(`     ${index + 1}. ${rec}`);
      });
    }
  } else {
    console.log('❌ Health monitoring failed:');
    console.log(`   Status: ${result.status}`);
    console.log(`   Error: ${result.data?.error || result.error}`);
  }
}

async function runCompleteTest() {
  console.log('🚀 Starting Complete PayU Integration Test');
  console.log('==========================================\n');

  // Test 1: Create Payment
  const paymentData = await testPaymentCreation();
  const transactionId = paymentData?.transactionId;

  // Test 2: Payment Status Tracking
  await testPaymentStatusTracking(transactionId);

  // Test 3: Payment Verification
  await testPaymentVerification(transactionId);

  // Test 4: Webhook Simulation
  await testWebhookSimulation(transactionId);

  // Test 5: Health Monitoring
  await testHealthMonitoring();

  console.log('\n🎉 Testing Complete!');
  console.log('===================');
  console.log('\n📋 Next Steps:');
  console.log('1. Configure PayU merchant dashboard with webhook URL');
  console.log('2. Test with real PayU credentials');
  console.log('3. Make a small test payment (₹1) through your website');
  console.log('4. Monitor logs in Supabase Dashboard → Functions');

  if (transactionId) {
    console.log(`\n🔗 Test Transaction ID: ${transactionId}`);
    console.log('   Use this to track the test payment in your admin dashboard');
  }
}

// Run the test
runCompleteTest().catch(console.error);
