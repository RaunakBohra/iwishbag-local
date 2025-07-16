/**
 * Atomic database operations for Stripe webhook processing
 * Ensures data consistency and integrity for payment transactions
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.11.0?target=deno'
import { SecureLogger } from '../../../src/lib/secureLogger.ts'
import { EdgeLogger, EdgeLogCategory, logEdgeInfo, logEdgeError } from '../_shared/edge-logging.ts'
import { EdgePaymentErrorCode } from '../_shared/edge-payment-monitoring.ts'

interface AtomicPaymentResult {
  success: boolean;
  error?: string;
  transactionId?: string;
  affectedQuotes?: string[];
  quotesUpdated?: number;
}

interface CustomerDetailsFromStripe {
  email?: string;
  name?: string;
  phone?: string;
  shipping_address?: Record<string, unknown>;
  billing_details?: Record<string, unknown>;
  customer_id?: string;
}

/**
 * Processes successful payment with atomic operations
 * Ensures all database updates happen together or not at all
 */
export async function processPaymentSuccessAtomic(
  supabaseAdmin: SupabaseClient,
  paymentIntent: Stripe.PaymentIntent,
  logger?: EdgeLogger
): Promise<AtomicPaymentResult> {
  const quoteIds = paymentIntent.metadata.quote_ids?.split(',') || []
  const userId = paymentIntent.metadata.user_id
  const amount = paymentIntent.amount / 100
  const currency = paymentIntent.currency.toUpperCase()

  if (logger) {
    logger.info(EdgeLogCategory.DATABASE_OPERATION, 'Starting atomic payment success processing', {
      metadata: {
        paymentIntentId: paymentIntent.id,
        userId,
        quoteCount: quoteIds.length,
        amount,
        currency
      }
    });
  }

  if (!quoteIds.length) {
    const error = 'No quote IDs found in payment metadata';
    if (logger) {
      logger.error(EdgeLogCategory.DATABASE_OPERATION, error, new Error(error), {
        metadata: { paymentIntentId: paymentIntent.id }
      });
    }
    return {
      success: false,
      error
    };
  }

  // Extract customer details securely
  const customerDetails: CustomerDetailsFromStripe = {
    email: paymentIntent.receipt_email || undefined,
    name: paymentIntent.shipping?.name || 
          paymentIntent.metadata.customer_name || undefined,
    phone: paymentIntent.shipping?.phone || 
           paymentIntent.metadata.customer_phone || undefined,
    shipping_address: paymentIntent.shipping?.address || undefined,
    billing_details: paymentIntent.charges?.data?.[0]?.billing_details || undefined,
    customer_id: paymentIntent.customer || undefined
  };

  // Log operation securely (preserve existing SecureLogger)
  SecureLogger.logWebhookProcessing(
    'payment_intent.succeeded',
    {
      transactionId: paymentIntent.id,
      userId,
      operation: 'webhook_payment_success'
    },
    {
      email: customerDetails.email,
      name: customerDetails.name,
      phone: customerDetails.phone,
      address: customerDetails.shipping_address
    }
  );

  try {
    // Start performance tracking for database operation
    if (logger) {
      logger.startPerformance('db_payment_success_atomic');
    }

    // Use database function for atomic operations
    const { data: result, error } = await supabaseAdmin.rpc('process_stripe_payment_success', {
      p_payment_intent_id: paymentIntent.id,
      p_user_id: userId,
      p_quote_ids: quoteIds,
      p_amount: amount,
      p_currency: currency,
      p_gateway_response: {
        ...paymentIntent,
        customer_details: customerDetails
      },
      p_customer_details: customerDetails
    });

    // End performance tracking
    if (logger) {
      logger.endPerformance('db_payment_success_atomic', EdgeLogCategory.DATABASE_OPERATION, {
        metadata: {
          paymentIntentId: paymentIntent.id,
          success: !error,
          quoteCount: quoteIds.length
        }
      });
    }

    if (error) {
      if (logger) {
        logger.error(
          EdgeLogCategory.DATABASE_OPERATION,
          'Atomic payment processing database operation failed',
          new Error(error.message),
          {
            metadata: {
              paymentIntentId: paymentIntent.id,
              userId,
              quoteIds,
              rpcFunction: 'process_stripe_payment_success'
            }
          }
        );
      }
      return {
        success: false,
        error: `Database operation failed: ${error.message}`
      };
    }

    if (logger) {
      logger.info(EdgeLogCategory.DATABASE_OPERATION, 'Payment success processing completed', {
        metadata: {
          paymentIntentId: paymentIntent.id,
          userId,
          quotesUpdated: quoteIds.length,
          amount,
          currency
        }
      });
    }

    return {
      success: true,
      transactionId: paymentIntent.id,
      affectedQuotes: quoteIds,
      quotesUpdated: quoteIds.length
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (logger) {
      logger.endPerformance('db_payment_success_atomic', EdgeLogCategory.DATABASE_OPERATION);
      logger.error(
        EdgeLogCategory.DATABASE_OPERATION,
        'Atomic payment processing exception',
        error instanceof Error ? error : new Error(errorMessage),
        {
          metadata: {
            paymentIntentId: paymentIntent.id,
            userId,
            operation: 'process_stripe_payment_success'
          }
        }
      );
    }
    
    return {
      success: false,
      error: `Payment processing failed: ${errorMessage}`
    };
  }
}

/**
 * Processes failed payment with atomic operations
 */
export async function processPaymentFailureAtomic(
  supabaseAdmin: SupabaseClient,
  paymentIntent: Stripe.PaymentIntent,
  logger?: EdgeLogger
): Promise<AtomicPaymentResult> {
  const quoteIds = paymentIntent.metadata.quote_ids?.split(',') || []
  const userId = paymentIntent.metadata.user_id

  try {
    const { data: result, error } = await supabaseAdmin.rpc('process_stripe_payment_failure', {
      p_payment_intent_id: paymentIntent.id,
      p_user_id: userId,
      p_quote_ids: quoteIds,
      p_amount: paymentIntent.amount / 100,
      p_currency: paymentIntent.currency.toUpperCase(),
      p_gateway_response: paymentIntent,
      p_failure_reason: paymentIntent.last_payment_error?.message || 'Payment failed'
    })

    if (error) {
      console.error('Atomic payment failure processing failed:', error)
      return {
        success: false,
        error: `Database operation failed: ${error.message}`
      }
    }

    return {
      success: true,
      transactionId: paymentIntent.id,
      affectedQuotes: quoteIds
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Atomic payment failure processing error:', errorMessage)
    
    return {
      success: false,
      error: `Payment failure processing failed: ${errorMessage}`
    }
  }
}

/**
 * Processes charge succeeded with atomic operations
 */
export async function processChargeSucceededAtomic(
  supabaseAdmin: SupabaseClient,
  charge: Stripe.Charge,
  logger?: EdgeLogger
): Promise<AtomicPaymentResult> {
  if (!charge.payment_intent) {
    return {
      success: false,
      error: 'No payment intent associated with charge'
    }
  }

  const customerDetailsFromCharge = {
    billing_details: charge.billing_details,
    receipt_email: charge.receipt_email,
    receipt_url: charge.receipt_url,
    customer_id: charge.customer
  }

  try {
    const { data: result, error } = await supabaseAdmin.rpc('process_stripe_charge_succeeded', {
      p_charge_id: charge.id,
      p_payment_intent_id: charge.payment_intent as string,
      p_charge_details: customerDetailsFromCharge
    })

    if (error) {
      console.error('Atomic charge processing failed:', error)
      return {
        success: false,
        error: `Database operation failed: ${error.message}`
      }
    }

    return {
      success: true,
      transactionId: charge.id
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Atomic charge processing error:', errorMessage)
    
    return {
      success: false,
      error: `Charge processing failed: ${errorMessage}`
    }
  }
}

/**
 * Processes refund with atomic operations
 */
export async function processRefundAtomic(
  supabaseAdmin: SupabaseClient,
  charge: Stripe.Charge,
  logger?: EdgeLogger
): Promise<AtomicPaymentResult> {
  if (!charge.payment_intent || charge.amount_refunded <= 0) {
    return {
      success: false,
      error: 'Invalid refund data'
    }
  }

  const refundAmount = charge.amount_refunded / 100
  const currency = charge.currency.toUpperCase()

  try {
    const { data: result, error } = await supabaseAdmin.rpc('process_stripe_refund', {
      p_charge_id: charge.id,
      p_payment_intent_id: charge.payment_intent as string,
      p_refund_amount: refundAmount,
      p_currency: currency,
      p_is_full_refund: charge.amount_refunded === charge.amount,
      p_refund_reason: 'Stripe refund via webhook'
    })

    if (error) {
      console.error('Atomic refund processing failed:', error)
      return {
        success: false,
        error: `Database operation failed: ${error.message}`
      }
    }

    return {
      success: true,
      transactionId: charge.id
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Atomic refund processing error:', errorMessage)
    
    return {
      success: false,
      error: `Refund processing failed: ${errorMessage}`
    }
  }
}