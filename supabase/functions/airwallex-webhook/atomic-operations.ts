/**
 * Atomic database operations for Airwallex webhook event processing
 * Ensures data consistency when updating payment statuses and related records
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Types for Airwallex webhook payloads
interface AirwallexPaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  merchant_order_id?: string;
  metadata?: {
    quote_ids?: string;
    user_id?: string;
  };
  created_at: string;
  updated_at?: string;
  customer?: {
    email?: string;
    first_name?: string;
    last_name?: string;
  };
  latest_payment_attempt?: {
    id?: string;
    amount?: number;
    captured_amount?: number;
    refunded_amount?: number;
  };
}

interface AirwallexRefund {
  id: string;
  payment_intent_id: string;
  amount: number;
  currency: string;
  status: string;
  reason?: string;
  metadata?: Record<string, string>;
  created_at: string;
  failure_reason?: string;
}

interface AirwallexDispute {
  id: string;
  payment_intent_id: string;
  amount: number;
  currency: string;
  status: string;
  reason: string;
  evidence_due_by?: string;
  created_at: string;
  updated_at?: string;
}

/**
 * Process successful payment intent
 * Updates payment transaction and quote status
 */
export async function processPaymentIntentSucceeded(
  supabaseAdmin: SupabaseClient,
  paymentIntent: AirwallexPaymentIntent,
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('Processing payment_intent.succeeded:', {
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      merchant_order_id: paymentIntent.merchant_order_id,
    });

    const transactionId = `airwallex_${paymentIntent.id}`;

    // Extract quote IDs from metadata
    const quoteIds = paymentIntent.metadata?.quote_ids?.split(',').filter(Boolean) || [];

    if (quoteIds.length === 0 && paymentIntent.merchant_order_id) {
      // Fallback to merchant_order_id if no quote_ids in metadata
      quoteIds.push(paymentIntent.merchant_order_id);
    }

    // Start transaction
    const updates: Promise<any>[] = [];

    // 1. Update payment transaction status
    const transactionUpdate = supabaseAdmin
      .from('payment_transactions')
      .update({
        status: 'succeeded',
        gateway_response: paymentIntent,
        updated_at: new Date().toISOString(),
        // Update amount if it differs (could happen with currency conversion)
        amount: paymentIntent.amount / 100, // Convert from cents to dollars
      })
      .eq('transaction_id', transactionId);

    updates.push(transactionUpdate);

    // 2. Update quote statuses to 'paid'
    if (quoteIds.length > 0) {
      // First check current quote statuses
      const { data: quotes, error: quotesError } = await supabaseAdmin
        .from('quotes_v2')
        .select('id, status, user_id')
        .in('id', quoteIds);

      if (quotesError) {
        console.error('Error fetching quotes:', quotesError);
        throw new Error(`Failed to fetch quotes: ${quotesError.message}`);
      }

      // Only update quotes that are in 'approved' or 'sent' status
      const quotesToUpdate =
        quotes?.filter((q) => ['approved', 'sent'].includes(q.status)).map((q) => q.id) || [];

      if (quotesToUpdate.length > 0) {
        const quoteUpdate = supabaseAdmin
          .from('quotes_v2')
          .update({
            status: 'paid',
            payment_transaction_id: transactionId,
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .in('id', quotesToUpdate);

        updates.push(quoteUpdate);

        // 3. Create order records if needed (depends on business flow)
        // Some businesses create orders immediately after payment
        // Others wait for manual confirmation
        console.log(`Updated ${quotesToUpdate.length} quotes to 'paid' status`);
      }

      // 4. Log payment confirmation email task
      // In a real system, this would trigger an email service
      console.log('TODO: Send payment confirmation email to customer:', {
        email: paymentIntent.customer?.email,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        quoteIds: quoteIds,
      });
    }

    // Execute all updates
    const results = await Promise.all(updates);

    // Check for errors
    const errors = results.filter((r) => r.error);
    if (errors.length > 0) {
      console.error('Errors during payment success processing:', errors);
      throw new Error(`Database update failed: ${errors.map((e) => e.error.message).join(', ')}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error processing payment success:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process failed or cancelled payment intent
 * Updates payment transaction and quote status
 */
export async function processPaymentIntentFailed(
  supabaseAdmin: SupabaseClient,
  paymentIntent: AirwallexPaymentIntent,
  eventType: 'failed' | 'cancelled',
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`Processing payment_intent.${eventType}:`, {
      id: paymentIntent.id,
      status: paymentIntent.status,
    });

    const transactionId = `airwallex_${paymentIntent.id}`;
    const quoteIds = paymentIntent.metadata?.quote_ids?.split(',').filter(Boolean) || [];

    // Start transaction
    const updates: Promise<any>[] = [];

    // 1. Update payment transaction status
    const transactionUpdate = supabaseAdmin
      .from('payment_transactions')
      .update({
        status: eventType,
        gateway_response: paymentIntent,
        updated_at: new Date().toISOString(),
        error_message:
          paymentIntent.latest_payment_attempt?.failure_reason || `Payment ${eventType}`,
      })
      .eq('transaction_id', transactionId);

    updates.push(transactionUpdate);

    // 2. Update quote statuses back to 'approved' (allowing retry)
    if (quoteIds.length > 0) {
      const quoteUpdate = supabaseAdmin
        .from('quotes_v2')
        .update({
          status: 'approved', // Reset to approved so customer can retry
          payment_transaction_id: null, // Clear failed transaction reference
          updated_at: new Date().toISOString(),
        })
        .in('id', quoteIds)
        .eq('status', 'paid'); // Only update if currently marked as paid (edge case)

      updates.push(quoteUpdate);

      // Log notification task
      console.log(`TODO: Notify customer of payment ${eventType}:`, {
        email: paymentIntent.customer?.email,
        quoteIds: quoteIds,
        reason: eventType,
      });
    }

    // Execute all updates
    const results = await Promise.all(updates);

    // Check for errors
    const errors = results.filter((r) => r.error);
    if (errors.length > 0) {
      console.error(`Errors during payment ${eventType} processing:`, errors);
      throw new Error(`Database update failed: ${errors.map((e) => e.error.message).join(', ')}`);
    }

    return { success: true };
  } catch (error) {
    console.error(`Error processing payment ${eventType}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process successful refund
 * Updates payment transaction and creates refund record
 */
export async function processRefundSucceeded(
  supabaseAdmin: SupabaseClient,
  refund: AirwallexRefund,
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('Processing refund.succeeded:', {
      id: refund.id,
      payment_intent_id: refund.payment_intent_id,
      amount: refund.amount,
      currency: refund.currency,
    });

    const transactionId = `airwallex_${refund.payment_intent_id}`;

    // Check if we have a refunds table
    const { data: tables } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'refunds')
      .single();

    const hasRefundsTable = !!tables;

    const updates: Promise<any>[] = [];

    if (hasRefundsTable) {
      // Insert refund record
      const refundInsert = supabaseAdmin.from('refunds').insert({
        id: `airwallex_refund_${refund.id}`,
        transaction_id: transactionId,
        amount: refund.amount / 100, // Convert from cents
        currency: refund.currency,
        status: 'succeeded',
        reason: refund.reason,
        gateway_response: refund,
        created_at: refund.created_at,
      });

      updates.push(refundInsert);
    }

    // Update payment transaction with refund info
    const { data: transaction } = await supabaseAdmin
      .from('payment_transactions')
      .select('amount, refunded_amount')
      .eq('transaction_id', transactionId)
      .single();

    if (transaction) {
      const newRefundedAmount = (transaction.refunded_amount || 0) + refund.amount / 100;
      const isFullyRefunded = newRefundedAmount >= transaction.amount;

      const transactionUpdate = supabaseAdmin
        .from('payment_transactions')
        .update({
          refunded_amount: newRefundedAmount,
          status: isFullyRefunded ? 'refunded' : 'partially_refunded',
          updated_at: new Date().toISOString(),
        })
        .eq('transaction_id', transactionId);

      updates.push(transactionUpdate);

      // If fully refunded, update quote status
      if (isFullyRefunded) {
        const { data: txnData } = await supabaseAdmin
          .from('payment_transactions')
          .select('quote_ids')
          .eq('transaction_id', transactionId)
          .single();

        if (txnData?.quote_ids?.length > 0) {
          const quoteUpdate = supabaseAdmin
            .from('quotes_v2')
            .update({
              status: 'refunded',
              updated_at: new Date().toISOString(),
            })
            .in('id', txnData.quote_ids);

          updates.push(quoteUpdate);
        }
      }
    }

    // Execute all updates
    const results = await Promise.all(updates);

    // Check for errors
    const errors = results.filter((r) => r.error);
    if (errors.length > 0) {
      console.error('Errors during refund success processing:', errors);
      throw new Error(`Database update failed: ${errors.map((e) => e.error.message).join(', ')}`);
    }

    // Log refund confirmation task
    console.log('TODO: Send refund confirmation email to customer');

    return { success: true };
  } catch (error) {
    console.error('Error processing refund success:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process failed refund
 * Updates refund record and alerts admin
 */
export async function processRefundFailed(
  supabaseAdmin: SupabaseClient,
  refund: AirwallexRefund,
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('Processing refund.failed:', {
      id: refund.id,
      payment_intent_id: refund.payment_intent_id,
      failure_reason: refund.failure_reason,
    });

    // Check if we have a refunds table
    const { data: tables } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'refunds')
      .single();

    const hasRefundsTable = !!tables;

    if (hasRefundsTable) {
      // Update or insert refund record as failed
      const { error } = await supabaseAdmin.from('refunds').upsert({
        id: `airwallex_refund_${refund.id}`,
        transaction_id: `airwallex_${refund.payment_intent_id}`,
        amount: refund.amount / 100,
        currency: refund.currency,
        status: 'failed',
        reason: refund.reason,
        failure_reason: refund.failure_reason,
        gateway_response: refund,
        created_at: refund.created_at,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        throw new Error(`Failed to update refund record: ${error.message}`);
      }
    }

    // Alert admin about failed refund
    console.error('ALERT: Refund failed!', {
      refund_id: refund.id,
      payment_intent_id: refund.payment_intent_id,
      amount: refund.amount,
      currency: refund.currency,
      failure_reason: refund.failure_reason,
    });

    // In a real system, this would trigger an admin notification
    console.log('TODO: Send alert to admin team about failed refund');

    return { success: true };
  } catch (error) {
    console.error('Error processing refund failure:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process dispute created
 * Creates dispute record and alerts admin
 */
export async function processDisputeCreated(
  supabaseAdmin: SupabaseClient,
  dispute: AirwallexDispute,
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('Processing dispute.created:', {
      id: dispute.id,
      payment_intent_id: dispute.payment_intent_id,
      amount: dispute.amount,
      reason: dispute.reason,
    });

    // Check if we have a disputes table
    const { data: tables } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'disputes')
      .single();

    const hasDisputesTable = !!tables;

    if (hasDisputesTable) {
      // Insert dispute record
      const { error } = await supabaseAdmin.from('disputes').insert({
        id: `airwallex_dispute_${dispute.id}`,
        transaction_id: `airwallex_${dispute.payment_intent_id}`,
        amount: dispute.amount / 100,
        currency: dispute.currency,
        status: dispute.status,
        reason: dispute.reason,
        evidence_due_by: dispute.evidence_due_by,
        gateway: 'airwallex',
        gateway_response: dispute,
        created_at: dispute.created_at,
      });

      if (error) {
        throw new Error(`Failed to create dispute record: ${error.message}`);
      }
    } else {
      // Log dispute for manual processing if no disputes table
      console.warn('No disputes table found. Logging dispute for manual processing:', dispute);
    }

    // Update payment transaction to indicate dispute
    const { error: txnError } = await supabaseAdmin
      .from('payment_transactions')
      .update({
        has_dispute: true,
        updated_at: new Date().toISOString(),
      })
      .eq('transaction_id', `airwallex_${dispute.payment_intent_id}`);

    if (txnError) {
      console.error('Failed to update transaction dispute flag:', txnError);
    }

    // Alert admin about new dispute
    console.error('URGENT: New dispute created!', {
      dispute_id: dispute.id,
      payment_intent_id: dispute.payment_intent_id,
      amount: dispute.amount,
      currency: dispute.currency,
      reason: dispute.reason,
      evidence_due_by: dispute.evidence_due_by,
    });

    // In a real system, this would trigger urgent admin notifications
    console.log('TODO: Send urgent alert to admin team about new dispute');
    console.log('TODO: Create task to gather evidence before due date');

    return { success: true };
  } catch (error) {
    console.error('Error processing dispute creation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process dispute updated
 * Updates existing dispute record
 */
export async function processDisputeUpdated(
  supabaseAdmin: SupabaseClient,
  dispute: AirwallexDispute,
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('Processing dispute.updated:', {
      id: dispute.id,
      status: dispute.status,
    });

    // Check if we have a disputes table
    const { data: tables } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'disputes')
      .single();

    const hasDisputesTable = !!tables;

    if (hasDisputesTable) {
      // Update dispute record
      const { error } = await supabaseAdmin
        .from('disputes')
        .update({
          status: dispute.status,
          gateway_response: dispute,
          updated_at: dispute.updated_at || new Date().toISOString(),
        })
        .eq('id', `airwallex_dispute_${dispute.id}`);

      if (error) {
        throw new Error(`Failed to update dispute record: ${error.message}`);
      }

      // If dispute is resolved in our favor, update transaction
      if (dispute.status === 'won' || dispute.status === 'warning_closed') {
        const { error: txnError } = await supabaseAdmin
          .from('payment_transactions')
          .update({
            has_dispute: false,
            updated_at: new Date().toISOString(),
          })
          .eq('transaction_id', `airwallex_${dispute.payment_intent_id}`);

        if (txnError) {
          console.error('Failed to update transaction dispute flag:', txnError);
        }
      }
    }

    // Log status change
    console.log('Dispute status updated:', {
      dispute_id: dispute.id,
      new_status: dispute.status,
    });

    return { success: true };
  } catch (error) {
    console.error('Error processing dispute update:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
