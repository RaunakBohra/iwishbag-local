import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.11.0?target=deno';
import { createWebhookHeaders } from '../_shared/cors.ts';
import {
  processPaymentSuccessAtomic,
  processPaymentFailureAtomic,
  processChargeSucceededAtomic,
  processRefundAtomic,
} from './atomic-operations.ts';
import {
  withEdgeMonitoring,
  extractPaymentId,
  createErrorResponse,
  createSuccessResponse,
} from '../_shared/monitoring-utils.ts';
import { EdgeLogCategory } from '../_shared/edge-logging.ts';
import { EdgePaymentErrorCode } from '../_shared/edge-payment-monitoring.ts';

// Get webhook headers (empty object for webhooks)
const _corsHeaders = createWebhookHeaders();

serve(async (req) => {
  // Webhooks only accept POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return new Response('No signature', { status: 400 });
  }

  return await withEdgeMonitoring(
    'stripe-webhook',
    async (logger, paymentMonitoring) => {
      try {
        logger.info(EdgeLogCategory.WEBHOOK_PROCESSING, 'Stripe webhook received', {
          metadata: {
            userAgent: req.headers.get('user-agent'),
            hasSignature: !!signature,
          },
        });

        const body = await req.text();

        // Initialize Supabase admin client
        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        );

        // Get Stripe config from database with monitoring
        const { data: stripeGateway, error: configError } =
          await paymentMonitoring.monitorGatewayCall('fetch_stripe_config', 'stripe', async () => {
            return await supabaseAdmin
              .from('payment_gateways')
              .select('config, test_mode')
              .eq('code', 'stripe')
              .single();
          });

        if (configError || !stripeGateway) {
          logger.error(
            EdgeLogCategory.WEBHOOK_PROCESSING,
            'Failed to get Stripe webhook configuration',
            configError instanceof Error ? configError : new Error('Stripe config missing'),
          );
          return createErrorResponse(new Error('Configuration error'), 500, logger);
        }

        const config = stripeGateway.config || {};
        const testMode = stripeGateway.test_mode;

        // Get the appropriate keys based on test mode
        const stripeSecretKey = testMode
          ? config.test_secret_key
          : config.live_secret_key || config.secret_key;
        const webhookSecret = config.webhook_secret;

        if (!stripeSecretKey || !webhookSecret) {
          logger.error(
            EdgeLogCategory.WEBHOOK_PROCESSING,
            'Stripe webhook configuration incomplete',
            new Error('Missing secret key or webhook secret'),
          );
          return createErrorResponse(new Error('Configuration incomplete'), 500, logger);
        }

        const stripe = new Stripe(stripeSecretKey, {
          apiVersion: '2023-10-16',
        });

        // Verify webhook signature with monitoring
        let event: Stripe.Event;
        try {
          logger.startPerformance('webhook_verification');
          event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
          logger.endPerformance('webhook_verification', EdgeLogCategory.WEBHOOK_PROCESSING, {
            metadata: { eventId: event.id, eventType: event.type },
          });

          logger.info(
            EdgeLogCategory.WEBHOOK_PROCESSING,
            'Webhook signature verified successfully',
            {
              metadata: {
                eventId: event.id,
                eventType: event.type,
                payloadSize: body.length,
              },
            },
          );
        } catch (err) {
          logger.endPerformance('webhook_verification', EdgeLogCategory.WEBHOOK_PROCESSING);
          logger.error(
            EdgeLogCategory.WEBHOOK_PROCESSING,
            'Webhook signature verification failed',
            err instanceof Error ? err : new Error('Signature verification failed'),
            {
              metadata: {
                signaturePresent: !!signature,
                payloadSize: body.length,
              },
            },
          );
          return createErrorResponse(
            new Error(
              `Webhook signature verification failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
            ),
            400,
            logger,
          );
        }

        // Extract payment and order IDs from the event
        const webhookId = `stripe-${event.id}-${Date.now()}`;
        const paymentId = extractPaymentId(event.data.object) || event.id;
        const orderId =
          event.data.object?.metadata?.orderId || event.data.object?.metadata?.order_id;

        // Start webhook monitoring
        paymentMonitoring.startWebhookMonitoring({
          webhookId,
          eventType: event.type,
          gateway: 'stripe',
          paymentId,
          orderId,
          metadata: {
            eventId: event.id,
            payloadSize: body.length,
            testMode: testMode,
            requestId: webhookId,
          },
        });

        // Enhanced webhook logging with performance data
        const webhookLogResult = await supabaseAdmin.from('webhook_logs').insert({
          request_id: webhookId,
          webhook_type: 'stripe',
          status: 'processing',
          event_type: event.type,
          event_id: event.id,
          payment_id: paymentId,
          order_id: orderId,
          user_agent: req.headers.get('user-agent') || 'Unknown',
          payload_size: body.length,
          test_mode: testMode,
          created_at: new Date().toISOString(),
        });

        if (webhookLogResult.error) {
          logger.warn(EdgeLogCategory.WEBHOOK_PROCESSING, 'Failed to create webhook log entry', {
            metadata: {
              error: webhookLogResult.error.message,
              webhookId,
              eventType: event.type,
            },
          });
        }

        logger.info(
          EdgeLogCategory.WEBHOOK_PROCESSING,
          `Processing Stripe webhook: ${event.type}`,
          {
            metadata: {
              webhookId,
              eventId: event.id,
              paymentId,
              orderId,
              eventType: event.type,
            },
          },
        );

        // Handle the event
        let processingSuccess = false;
        let processingError: string | undefined;

        switch (event.type) {
          case 'payment_intent.succeeded': {
            const paymentIntent = event.data.object as Stripe.PaymentIntent;
            logger.info(EdgeLogCategory.WEBHOOK_PROCESSING, 'Processing payment success', {
              metadata: {
                webhookId,
                paymentIntentId: paymentIntent.id,
                amount: paymentIntent.amount,
                currency: paymentIntent.currency,
              },
            });

            const result = await paymentMonitoring.monitorGatewayCall(
              'process_payment_success',
              'stripe',
              async () => await processPaymentSuccessAtomic(supabaseAdmin, paymentIntent, logger),
              paymentId,
            );

            processingSuccess = result.success;
            processingError = result.error;

            if (result.success) {
              logger.info(EdgeLogCategory.WEBHOOK_PROCESSING, 'Payment success processed', {
                metadata: {
                  webhookId,
                  paymentIntentId: paymentIntent.id,
                  quotesUpdated: result.quotesUpdated || 0,
                },
              });
            }
            break;
          }

          case 'payment_intent.payment_failed': {
            const paymentIntent = event.data.object as Stripe.PaymentIntent;
            logger.info(EdgeLogCategory.WEBHOOK_PROCESSING, 'Processing payment failure', {
              metadata: {
                webhookId,
                paymentIntentId: paymentIntent.id,
                lastPaymentError: paymentIntent.last_payment_error?.message,
              },
            });

            const result = await paymentMonitoring.monitorGatewayCall(
              'process_payment_failure',
              'stripe',
              async () => await processPaymentFailureAtomic(supabaseAdmin, paymentIntent, logger),
              paymentId,
            );

            processingSuccess = result.success;
            processingError = result.error;
            break;
          }

          case 'payment_intent.canceled': {
            const paymentIntent = event.data.object as Stripe.PaymentIntent;
            logger.info(EdgeLogCategory.WEBHOOK_PROCESSING, 'Processing payment cancellation', {
              metadata: {
                webhookId,
                paymentIntentId: paymentIntent.id,
                cancellationReason: paymentIntent.cancellation_reason,
              },
            });

            const result = await paymentMonitoring.monitorGatewayCall(
              'process_payment_cancellation',
              'stripe',
              async () => await processPaymentFailureAtomic(supabaseAdmin, paymentIntent, logger),
              paymentId,
            );

            processingSuccess = result.success;
            processingError = result.error;
            break;
          }

          case 'charge.succeeded': {
            const charge = event.data.object as Stripe.Charge;
            logger.info(EdgeLogCategory.WEBHOOK_PROCESSING, 'Processing charge success', {
              metadata: {
                webhookId,
                chargeId: charge.id,
                amount: charge.amount,
                currency: charge.currency,
              },
            });

            const result = await paymentMonitoring.monitorGatewayCall(
              'process_charge_success',
              'stripe',
              async () => await processChargeSucceededAtomic(supabaseAdmin, charge, logger),
              paymentId,
            );

            processingSuccess = result.success;
            processingError = result.error;
            break;
          }

          case 'charge.failed': {
            const charge = event.data.object as Stripe.Charge;
            logger.warn(EdgeLogCategory.WEBHOOK_PROCESSING, 'Processing failed charge', {
              metadata: {
                webhookId,
                chargeId: charge.id,
                failureCode: charge.failure_code,
                failureMessage: charge.failure_message,
                amount: charge.amount,
                currency: charge.currency,
              },
            });
            processingSuccess = true; // Just log, no database changes needed
            break;
          }

          case 'charge.refunded': {
            const charge = event.data.object as Stripe.Charge;
            logger.info(EdgeLogCategory.WEBHOOK_PROCESSING, 'Processing charge refund', {
              metadata: {
                webhookId,
                chargeId: charge.id,
                refundAmount: charge.amount_refunded,
                currency: charge.currency,
              },
            });

            const result = await paymentMonitoring.monitorGatewayCall(
              'process_charge_refund',
              'stripe',
              async () => await processRefundAtomic(supabaseAdmin, charge, logger),
              paymentId,
            );

            processingSuccess = result.success;
            processingError = result.error;
            break;
          }

          case 'charge.dispute.created': {
            const dispute = event.data.object as Stripe.Dispute;
            logger.warn(EdgeLogCategory.WEBHOOK_PROCESSING, 'Processing new dispute', {
              metadata: {
                webhookId,
                disputeId: dispute.id,
                reason: dispute.reason,
                amount: dispute.amount / 100,
                currency: dispute.currency.toUpperCase(),
                chargeId: dispute.charge,
              },
            });
            // TODO: Create admin notification for dispute
            processingSuccess = true; // Just log for now
            break;
          }

          default:
            logger.info(EdgeLogCategory.WEBHOOK_PROCESSING, `Unhandled event type: ${event.type}`, {
              metadata: {
                webhookId,
                eventType: event.type,
                eventId: event.id,
              },
            });
            processingSuccess = true; // Don't fail for unknown events
        }

        // Complete webhook monitoring
        paymentMonitoring.completeWebhookMonitoring(
          webhookId,
          processingSuccess,
          processingSuccess ? undefined : EdgePaymentErrorCode.WEBHOOK_PROCESSING_FAILED,
          processingError,
          {
            eventType: event.type,
            eventId: event.id,
            processingDuration: performance.now() - 0, // Will be calculated by monitoring service
          },
        );

        // Mark webhook as processed in database
        if (!webhookLogResult.error) {
          await supabaseAdmin
            .from('webhook_logs')
            .update({
              status: processingSuccess ? 'completed' : 'failed',
              error_message: processingError || null,
              updated_at: new Date().toISOString(),
            })
            .eq('request_id', webhookId);
        }

        const responseData = {
          received: true,
          processed: processingSuccess,
          error: processingError,
          webhookId,
          eventType: event.type,
          eventId: event.id,
        };

        if (processingSuccess) {
          logger.info(
            EdgeLogCategory.WEBHOOK_PROCESSING,
            'Webhook processing completed successfully',
            {
              metadata: {
                webhookId,
                eventType: event.type,
                eventId: event.id,
              },
            },
          );
          return createSuccessResponse(responseData, 200, logger, {
            webhookId,
            eventType: event.type,
          });
        } else {
          logger.error(
            EdgeLogCategory.WEBHOOK_PROCESSING,
            'Webhook processing failed',
            new Error(processingError || 'Unknown webhook processing error'),
            {
              metadata: {
                webhookId,
                eventType: event.type,
                eventId: event.id,
              },
            },
          );
          return createErrorResponse(
            new Error(processingError || 'Webhook processing failed'),
            500,
            logger,
            { webhookId, eventType: event.type },
          );
        }
      } catch (err) {
        logger.error(
          EdgeLogCategory.WEBHOOK_PROCESSING,
          'Unexpected webhook processing error',
          err instanceof Error ? err : new Error('Unknown webhook error'),
        );

        return createErrorResponse(
          err instanceof Error ? err : new Error('Webhook processing error'),
          500,
          logger,
        );
      }
    },
    req,
  );
});

// Legacy handler functions removed - now using atomic operations from atomic-operations.ts
// This ensures data consistency and proper error handling
