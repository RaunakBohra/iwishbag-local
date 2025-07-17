// Manual script to verify and record Stripe payment
// Run this in your project to update the database

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://grgvlrvywsfmnmkxrecd.supabase.co';
const supabaseServiceKey = 'YOUR_SERVICE_ROLE_KEY'; // Use the service role key from .env

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyAndRecordStripePayment() {
  const paymentIntentId = 'pi_3RlBRmQj80XSacOA1djAv9ND';
  const quoteId = '974397df-e02b-48f3-a091-b5edd44fd35c';
  const userId = '130ec316-970f-429f-8cb8-ff9adf751248';

  console.log('Verifying Stripe payment:', paymentIntentId);

  // 1. Call payment-verification function
  const verificationResponse = await fetch(`${supabaseUrl}/functions/v1/payment-verification`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${supabaseServiceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      transaction_id: paymentIntentId,
      gateway: 'stripe',
      amount: 1063.81,
      currency: 'USD',
    }),
  });

  const verificationResult = await verificationResponse.json();
  console.log('Verification result:', verificationResult);

  // 2. Check if payment_transactions record exists
  const { data: existingTransaction } = await supabase
    .from('payment_transactions')
    .select('*')
    .or(`id.eq.${paymentIntentId},gateway_response->id.eq.${paymentIntentId}`)
    .single();

  if (!existingTransaction) {
    console.log('Creating payment_transactions record...');

    const { data: newTransaction, error: txError } = await supabase
      .from('payment_transactions')
      .insert({
        user_id: userId,
        quote_id: quoteId,
        amount: 1063.81,
        currency: 'USD',
        status: 'completed',
        payment_method: 'stripe',
        gateway_response: {
          id: paymentIntentId,
          object: 'payment_intent',
          amount: 106381,
          currency: 'usd',
          status: 'succeeded',
          created: 1752595874,
          metadata: {
            quote_ids: quoteId,
            user_id: userId,
          },
          payment_method: 'pm_1RlBSQQj80XSacOACXQu6t5h',
          latest_charge: 'ch_3RlBRmQj80XSacOA1URA7D0G',
          receipt_email: 'iwbtracking@gmail.com',
        },
      })
      .select()
      .single();

    if (txError) {
      console.error('Error creating transaction:', txError);
    } else {
      console.log('Transaction created:', newTransaction);
    }
  }

  // 3. Update quote status
  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .update({
      status: 'paid',
      payment_status: 'paid',
      payment_method: 'stripe',
      payment_completed_at: new Date().toISOString(),
    })
    .eq('id', quoteId)
    .select()
    .single();

  if (quoteError) {
    console.error('Error updating quote:', quoteError);
  } else {
    console.log('Quote updated:', quote);
  }

  // 4. Create payment_ledger entry using RPC
  const { data: ledgerResult, error: ledgerError } = await supabase.rpc(
    'create_payment_with_ledger_entry',
    {
      p_quote_id: quoteId,
      p_amount: 1063.81,
      p_currency: 'USD',
      p_payment_method: 'stripe',
      p_payment_type: 'customer_payment',
      p_reference_number: paymentIntentId,
      p_gateway_code: 'stripe',
      p_gateway_transaction_id: paymentIntentId,
      p_notes: 'Stripe payment completed successfully',
      p_user_id: userId,
    },
  );

  if (ledgerError) {
    console.error('Error creating ledger entry:', ledgerError);
  } else {
    console.log('Ledger entry created:', ledgerResult);
  }

  console.log('Payment verification and recording complete!');
}

// Run the verification
verifyAndRecordStripePayment().catch(console.error);
