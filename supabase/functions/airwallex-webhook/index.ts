import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createWebhookHeaders } from '../_shared/cors.ts';
import {
  processPaymentIntentSucceeded,
  processPaymentIntentFailed,
  processRefundSucceeded,
  processRefundFailed,
  processDisputeCreated,
  processDisputeUpdated,
} from './atomic-operations.ts';
import {
  withEdgeMonitoring,
  extractPaymentId,
  extractUserId,
  mapGatewayError,
  createErrorResponse,
  createSuccessResponse,
  validateWebhookSignature,
  sanitizeForLogging,
} from '../_shared/monitoring-utils.ts';
import { EdgeLogCategory } from '../_shared/edge-logging.ts';
import { EdgePaymentErrorCode } from '../_shared/edge-payment-monitoring.ts';

// Airwallex webhook event types
type AirwallexEventType =
  | 'payment_intent.succeeded'
  | 'payment_intent.cancelled'
  | 'payment_intent.failed'
  | 'payment_attempt.failed'
  | 'payment_attempt.authorized'
  | 'payment_attempt.captured'
  | 'payment_attempt.settled'
  | 'refund.succeeded'
  | 'refund.failed'
  | 'dispute.created'
  | 'dispute.updated'
  | string; // Allow for future event types

interface AirwallexWebhookEvent {
  id: string;
  name: AirwallexEventType;
  account_id: string;
  data: {
    object: Record<string, unknown>;
  };
  created_at: string;
  version: string;
}

interface WebhookLogEntry {
  request_id: string;
  webhook_type: string;
  status: 'processing' | 'completed' | 'failed';
  user_agent: string;
  created_at: string;
  error_message?: string;
  updated_at?: string;
}

// Get webhook headers (empty object for webhooks)
const corsHeaders = createWebhookHeaders();

serve(async (req) => {
  // Webhooks only accept POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Get the webhook signature from headers
  const signature =
    req.headers.get('x-airwallex-signature') || req.headers.get('X-Airwallex-Signature');

  if (!signature) {
    console.error('No Airwallex signature found in headers');
    return new Response('No signature', { status: 400 });
  }

  return await withEdgeMonitoring(
    'airwallex-webhook',
    async (logger, paymentMonitoring) => {
      try {
        logger.info(EdgeLogCategory.WEBHOOK_PROCESSING, 'Airwallex webhook received', {
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

        // Get Airwallex config from database with monitoring
        const { data: airwallexGateway, error: configError } =
          await paymentMonitoring.monitorGatewayCall(
            'fetch_airwallex_config',
            'airwallex',
            async () => {
              return await supabaseAdmin
                .from('payment_gateways')
                .select('config, test_mode')
                .eq('code', 'airwallex')
                .single();
            },
          );

        if (configError || !airwallexGateway) {
          logger.error(
            EdgeLogCategory.WEBHOOK_PROCESSING,
            'Failed to get Airwallex webhook configuration',
            configError instanceof Error ? configError : new Error('Airwallex config missing'),
          );
          return createErrorResponse(new Error('Configuration error'), 500, logger);
        }

        const config = airwallexGateway.config || {};
        const testMode = airwallexGateway.test_mode;

        // Get the webhook secret from config
        const webhookSecret = testMode
          ? config.test_webhook_secret
          : config.live_webhook_secret || config.webhook_secret;

        if (!webhookSecret) {
          logger.error(
            EdgeLogCategory.WEBHOOK_PROCESSING,
            'Airwallex webhook configuration incomplete',
            new Error('Missing webhook secret'),
          );
          return createErrorResponse(new Error('Configuration incomplete'), 500, logger);
        }

        // Verify webhook signature with monitoring
        let isValidSignature = false;
        try {
          logger.startPerformance('webhook_verification');
          isValidSignature = await verifyAirwallexWebhookSignature(signature, webhookSecret, body);
          logger.endPerformance('webhook_verification', EdgeLogCategory.WEBHOOK_PROCESSING, {
            metadata: { payloadSize: body.length },
          });

          if (isValidSignature) {
            logger.info(
              EdgeLogCategory.WEBHOOK_PROCESSING,
              'Airwallex webhook signature verified successfully',
              {
                metadata: {
                  payloadSize: body.length,
                },
              },
            );
          }
        } catch (err) {
          logger.endPerformance('webhook_verification', EdgeLogCategory.WEBHOOK_PROCESSING);
          logger.error(
            EdgeLogCategory.WEBHOOK_PROCESSING,
            'Airwallex webhook signature verification failed',
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

        if (!isValidSignature) {
          logger.error(
            EdgeLogCategory.WEBHOOK_PROCESSING,
            'Airwallex webhook signature verification failed',
            new Error('Invalid signature'),
          );
          return createErrorResponse(new Error('Invalid signature'), 400, logger);
        }

        // Parse the webhook event
        let event: AirwallexWebhookEvent;
        try {
          event = JSON.parse(body);
        } catch (parseError) {
          logger.error(
            EdgeLogCategory.WEBHOOK_PROCESSING,
            'Failed to parse Airwallex webhook body',
            parseError instanceof Error ? parseError : new Error('JSON parsing failed'),
          );
          return createErrorResponse(new Error('Invalid JSON'), 400, logger);
        }

        // Extract payment and order IDs from the event
        const webhookId = `airwallex-${event.id}-${Date.now()}`;
        const paymentId = extractPaymentId(event.data.object) || event.id;
        const orderId =
          event.data.object?.metadata?.orderId || event.data.object?.metadata?.order_id;

        // Start webhook monitoring
        paymentMonitoring.startWebhookMonitoring({
          webhookId,
          eventType: event.name,
          gateway: 'airwallex',
          paymentId,
          orderId,
          metadata: {
            eventId: event.id,
            accountId: event.account_id,
            payloadSize: body.length,
            testMode: testMode,
            requestId: webhookId,
          },
        });

        // Enhanced webhook logging with performance data
        const webhookLogResult = await supabaseAdmin.from('webhook_logs').insert({
          request_id: webhookId,
          webhook_type: 'airwallex',
          status: 'processing',
          event_type: event.name,
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
              eventType: event.name,
            },
          });
        }

        logger.info(
          EdgeLogCategory.WEBHOOK_PROCESSING,
          `Processing Airwallex webhook: ${event.name}`,
          {
            metadata: {
              webhookId,
              eventId: event.id,
              accountId: event.account_id,
              paymentId,
              orderId,
              eventType: event.name,
              createdAt: event.created_at,
            },
          },
        );

        // Handle the event
        let processingSuccess = false;
        let processingError: string | undefined;

        switch (event.name) {
          case 'payment_intent.succeeded': {
            logger.info(EdgeLogCategory.WEBHOOK_PROCESSING, 'Processing payment intent succeeded', {
              metadata: {
                webhookId,
                eventId: event.id,
                paymentObject: sanitizeForLogging(event.data.object),
              },
            });

            const result = await paymentMonitoring.monitorGatewayCall(
              'process_payment_intent_succeeded',
              'airwallex',
              async () =>
                await processPaymentIntentSucceeded(supabaseAdmin, event.data.object as any),
              paymentId,
            );

            processingSuccess = result.success;
            processingError = result.error;

            if (result.success) {
              logger.info(
                EdgeLogCategory.WEBHOOK_PROCESSING,
                'Payment intent succeeded processed',
                {
                  metadata: {
                    webhookId,
                    eventId: event.id,
                    quotesUpdated: result.quotesUpdated || 0,
                  },
                },
              );
            }
            break;
          }

          case 'payment_intent.failed': {
            logger.info(EdgeLogCategory.WEBHOOK_PROCESSING, 'Processing payment intent failed', {
              metadata: {
                webhookId,
                eventId: event.id,
                paymentObject: sanitizeForLogging(event.data.object),
              },
            });

            const result = await paymentMonitoring.monitorGatewayCall(
              'process_payment_intent_failed',
              'airwallex',
              async () =>
                await processPaymentIntentFailed(supabaseAdmin, event.data.object as any, 'failed'),
              paymentId,
            );

            processingSuccess = result.success;
            processingError = result.error;
            break;
          }

          case 'payment_intent.cancelled': {
            logger.info(EdgeLogCategory.WEBHOOK_PROCESSING, 'Processing payment intent cancelled', {
              metadata: {
                webhookId,
                eventId: event.id,
                paymentObject: sanitizeForLogging(event.data.object),
              },
            });

            const result = await paymentMonitoring.monitorGatewayCall(
              'process_payment_intent_cancelled',
              'airwallex',
              async () =>
                await processPaymentIntentFailed(
                  supabaseAdmin,
                  event.data.object as any,
                  'cancelled',
                ),
              paymentId,
            );

            processingSuccess = result.success;
            processingError = result.error;
            break;
          }

          case 'payment_attempt.captured': {
            logger.info(EdgeLogCategory.WEBHOOK_PROCESSING, 'Processing payment attempt captured', {
              metadata: {
                webhookId,
                eventId: event.id,
                paymentObject: sanitizeForLogging(event.data.object),
              },
            });
            // Payment capture is informational - payment_intent.succeeded handles the main flow
            // Just log for now, but could update transaction with capture details
            processingSuccess = true;
            break;
          }

          case 'payment_attempt.settled': {
            logger.info(EdgeLogCategory.WEBHOOK_PROCESSING, 'Processing payment attempt settled', {
              metadata: {
                webhookId,
                eventId: event.id,
                paymentObject: sanitizeForLogging(event.data.object),
              },
            });

            // payment_attempt.settled means the payment was successful and settled
            // We need to treat this similar to payment_intent.succeeded
            const paymentAttempt = event.data.object as any;
            const paymentIntent = {
              id: paymentAttempt.payment_intent_id,
              amount: paymentAttempt.amount,
              currency: paymentAttempt.currency,
              status: 'succeeded', // Map SETTLED to succeeded
              created_at: paymentAttempt.created_at,
              payment_method: paymentAttempt.payment_method,
              metadata: paymentAttempt.metadata || {},
              captured_amount: paymentAttempt.captured_amount,
              authorization_code: paymentAttempt.authorization_code,
            };

            const result = await paymentMonitoring.monitorGatewayCall(
              'process_payment_attempt_settled',
              'airwallex',
              async () => await processPaymentIntentSucceeded(supabaseAdmin, paymentIntent),
              paymentId,
            );

            processingSuccess = result.success;
            processingError = result.error;

            if (result.success) {
              logger.info(
                EdgeLogCategory.WEBHOOK_PROCESSING,
                'Payment attempt settled processed as succeeded',
                {
                  metadata: {
                    webhookId,
                    eventId: event.id,
                    paymentIntentId: paymentAttempt.payment_intent_id,
                    quotesUpdated: result.quotesUpdated || 0,
                  },
                },
              );
            }
            break;
          }

          case 'refund.succeeded': {
            logger.info(EdgeLogCategory.WEBHOOK_PROCESSING, 'Processing refund succeeded', {
              metadata: {
                webhookId,
                eventId: event.id,
                refundObject: sanitizeForLogging(event.data.object),
              },
            });

            const result = await paymentMonitoring.monitorGatewayCall(
              'process_refund_succeeded',
              'airwallex',
              async () => await processRefundSucceeded(supabaseAdmin, event.data.object as any),
              paymentId,
            );

            processingSuccess = result.success;
            processingError = result.error;
            break;
          }

          case 'refund.failed': {
            logger.info(EdgeLogCategory.WEBHOOK_PROCESSING, 'Processing refund failed', {
              metadata: {
                webhookId,
                eventId: event.id,
                refundObject: sanitizeForLogging(event.data.object),
              },
            });

            const result = await paymentMonitoring.monitorGatewayCall(
              'process_refund_failed',
              'airwallex',
              async () => await processRefundFailed(supabaseAdmin, event.data.object as any),
              paymentId,
            );

            processingSuccess = result.success;
            processingError = result.error;
            break;
          }

          case 'dispute.created': {
            logger.info(EdgeLogCategory.WEBHOOK_PROCESSING, 'Processing dispute created', {
              metadata: {
                webhookId,
                eventId: event.id,
                disputeObject: sanitizeForLogging(event.data.object),
              },
            });

            const result = await paymentMonitoring.monitorGatewayCall(
              'process_dispute_created',
              'airwallex',
              async () => await processDisputeCreated(supabaseAdmin, event.data.object as any),
              paymentId,
            );

            processingSuccess = result.success;
            processingError = result.error;
            break;
          }

          case 'dispute.updated': {
            logger.info(EdgeLogCategory.WEBHOOK_PROCESSING, 'Processing dispute updated', {
              metadata: {
                webhookId,
                eventId: event.id,
                disputeObject: sanitizeForLogging(event.data.object),
              },
            });

            const result = await paymentMonitoring.monitorGatewayCall(
              'process_dispute_updated',
              'airwallex',
              async () => await processDisputeUpdated(supabaseAdmin, event.data.object as any),
              paymentId,
            );

            processingSuccess = result.success;
            processingError = result.error;
            break;
          }

          default:
            logger.info(
              EdgeLogCategory.WEBHOOK_PROCESSING,
              `Unhandled Airwallex event type: ${event.name}`,
              {
                metadata: {
                  webhookId,
                  eventType: event.name,
                  eventId: event.id,
                },
              },
            );
            processingSuccess = true; // Don't fail for unknown events
        }

        // Complete webhook monitoring
        paymentMonitoring.completeWebhookMonitoring(
          webhookId,
          processingSuccess,
          processingSuccess ? undefined : EdgePaymentErrorCode.WEBHOOK_PROCESSING_FAILED,
          processingError,
          {
            eventType: event.name,
            eventId: event.id,
            accountId: event.account_id,
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
          eventType: event.name,
          eventId: event.id,
        };

        if (processingSuccess) {
          logger.info(
            EdgeLogCategory.WEBHOOK_PROCESSING,
            'Airwallex webhook processing completed successfully',
            {
              metadata: {
                webhookId,
                eventType: event.name,
                eventId: event.id,
              },
            },
          );
          return createSuccessResponse(responseData, 200, logger, {
            webhookId,
            eventType: event.name,
          });
        } else {
          logger.error(
            EdgeLogCategory.WEBHOOK_PROCESSING,
            'Airwallex webhook processing failed',
            new Error(processingError || 'Unknown webhook processing error'),
            {
              metadata: {
                webhookId,
                eventType: event.name,
                eventId: event.id,
              },
            },
          );
          return createErrorResponse(
            new Error(processingError || 'Webhook processing failed'),
            500,
            logger,
            { webhookId, eventType: event.name },
          );
        }
      } catch (err) {
        logger.error(
          EdgeLogCategory.WEBHOOK_PROCESSING,
          'Unexpected Airwallex webhook processing error',
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

/**
 * Verify Airwallex webhook signature
 * Airwallex uses HMAC-SHA256 for webhook signature verification
 *
 * @param signature - The signature from the x-airwallex-signature header
 * @param secret - The webhook secret from Airwallex configuration
 * @param payload - The raw request body
 * @returns Promise<boolean> - Whether the signature is valid
 */
async function verifyAirwallexWebhookSignature(
  signature: string,
  secret: string,
  payload: string,
): Promise<boolean> {
  try {
    // Airwallex signature format: t=timestamp,v1=signature
    // Extract timestamp and signature
    const elements = signature.split(',');
    let timestamp = '';
    let webhookSignature = '';

    for (const element of elements) {
      const [key, value] = element.split('=');
      if (key === 't') {
        timestamp = value;
      } else if (key === 'v1') {
        webhookSignature = value;
      }
    }

    if (!timestamp || !webhookSignature) {
      console.error('Invalid signature format');
      return false;
    }

    // Verify timestamp is within tolerance (5 minutes)
    const currentTime = Math.floor(Date.now() / 1000);
    const webhookTime = parseInt(timestamp);
    const timeDiff = currentTime - webhookTime;

    if (timeDiff > 300 || timeDiff < -300) {
      // 5 minutes tolerance
      console.error('Webhook timestamp outside tolerance window');
      return false;
    }

    // Create the signed payload
    const signedPayload = `${timestamp}.${payload}`;

    // Generate HMAC-SHA256 signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );

    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));

    // Convert to hex string
    const computedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // Compare signatures
    return computedSignature === webhookSignature;
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}
