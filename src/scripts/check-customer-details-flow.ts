import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkCustomerDetailsFlow() {
  console.log('🔍 Analyzing Customer Details Flow in Stripe Integration\n');

  // 1. Check what customer details are stored in quotes
  console.log('📋 1. Customer Details in Quotes Table:');
  const { data: sampleQuote } = await supabase.from('quotes_v2').select(`
    id, quote_number, customer_id, customer_email, customer_name, customer_phone,
    origin_country, origin_state, destination_country, destination_state, destination_pincode,
    destination_address, items, shipping_method, payment_gateway, customer_currency,
    order_discount_type, order_discount_value, order_discount_code,
    shipping_discount_type, shipping_discount_value, insurance_required, insurance_enabled,
    admin_notes, customer_notes, status, calculation_data, calculation_result,
    total_quote_origincurrency, share_token, expires_at, reminder_count, last_reminder_at,
    created_at, updated_at, calculated_at, approved_at, created_by, approved_by,
    validity_days, sent_at, viewed_at, email_sent, sms_sent, whatsapp_sent,
    preferred_contact, version, parent_quote_id, revision_reason, changes_summary,
    payment_terms, approval_required, max_discount_percentage, minimum_order_value,
    converted_to_order_id, original_quote_id, external_reference, source,
    ip_address, user_agent, utm_source, utm_medium, utm_campaign,
    is_latest_version, approval_required_above, max_discount_allowed, api_version,
    applied_discounts, selected_shipping_option_id, delivery_address_id,
    options_last_updated_at, options_last_updated_by, in_cart
  `).limit(1).single();

  if (sampleQuote) {
    const customerFields = [
      'email',
      'customer_name',
      'customer_phone',
      'shipping_address',
      'user_id',
    ];

    console.log('Available customer fields in quotes:');
    customerFields.forEach((field) => {
      if (sampleQuote[field]) {
        console.log(
          `   ✅ ${field}:`,
          typeof sampleQuote[field] === 'object'
            ? JSON.stringify(sampleQuote[field], null, 2)
            : sampleQuote[field],
        );
      } else {
        console.log(`   ❌ ${field}: Not set`);
      }
    });

    if (sampleQuote.shipping_address) {
      console.log('\n📍 Shipping Address Structure:');
      console.log(JSON.stringify(sampleQuote.shipping_address, null, 2));
    }
  }

  // 2. Check a recent Stripe payment to see what was sent
  console.log('\n\n💳 2. Recent Stripe Payment Details:');
  const { data: stripePayment } = await supabase
    .from('payment_transactions')
    .select('*')
    .eq('payment_method', 'stripe')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (stripePayment && stripePayment.gateway_response) {
    console.log('Payment Intent Metadata:');
    console.log(JSON.stringify(stripePayment.gateway_response.metadata, null, 2));

    console.log('\nReceipt Email:', stripePayment.gateway_response.receipt_email || 'Not set');
    console.log('Description:', stripePayment.gateway_response.description || 'Not set');

    if (stripePayment.gateway_response.shipping) {
      console.log('\nShipping Info from Stripe:');
      console.log(JSON.stringify(stripePayment.gateway_response.shipping, null, 2));
    } else {
      console.log('\n⚠️  No shipping info in Stripe payment');
    }

    if (stripePayment.gateway_response.billing_details) {
      console.log('\nBilling Details from Stripe:');
      console.log(JSON.stringify(stripePayment.gateway_response.billing_details, null, 2));
    }
  }

  // 3. Analysis summary
  console.log('\n\n📊 3. Analysis Summary:');
  console.log('\n🔴 Currently NOT sending to Stripe:');
  console.log('   - Customer name');
  console.log('   - Customer phone');
  console.log('   - Shipping address');
  console.log('   - Billing address');

  console.log('\n🟢 Currently sending to Stripe:');
  console.log('   - Email (as receipt_email)');
  console.log('   - Quote IDs (in metadata)');
  console.log('   - User ID (in metadata)');
  console.log('   - Amount and currency');
  console.log('   - Description with quote IDs');

  console.log('\n💡 Recommendations:');
  console.log('   1. Add customer name to Stripe payment intent');
  console.log('   2. Add shipping address to Stripe payment intent');
  console.log('   3. Collect billing address in PaymentElement');
  console.log('   4. Add phone number for better fraud detection');
  console.log('   5. Consider creating Stripe Customer for repeat purchases');
}

checkCustomerDetailsFlow().catch(console.error);
