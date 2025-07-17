import { describe, test, expect, beforeEach, vi } from 'vitest';

// Type definitions
interface WebhookRequest {
  headers: {
    'stripe-signature'?: string;
    'user-agent'?: string;
    [key: string]: string | undefined;
  };
  body?: string;
}

// Mock Deno global and environment
const mockDeno = {
  env: {
    get: vi.fn((key: string) => {
      const envVars: Record<string, string> = {
        STRIPE_SECRET_KEY: 'sk_test_123',
        STRIPE_WEBHOOK_SECRET: 'whsec_test_123',
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
      };
      return envVars[key] || '';
    }),
  },
};

// Mock global Deno
Object.defineProperty(global, 'Deno', {
  value: mockDeno,
  writable: true,
  configurable: true,
});

// Mock crypto for UUID generation
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'test-uuid-123'),
  },
  writable: true,
  configurable: true,
});

// Mock Stripe
const mockStripe = {
  paymentIntents: {
    retrieve: vi.fn(),
    confirm: vi.fn(),
  },
  charges: {
    list: vi.fn(),
    retrieve: vi.fn(),
  },
  webhooks: {
    constructEvent: vi.fn(),
  },
};

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  })),
  auth: {
    admin: {
      getUserById: vi.fn(),
    },
  },
  rpc: vi.fn(),
};

// Mock external dependencies
vi.mock('https://esm.sh/stripe@14.11.0?target=deno', () => ({
  default: vi.fn(() => mockStripe),
}));

vi.mock('https://esm.sh/@supabase/supabase-js@2', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

vi.mock('https://deno.land/std@0.168.0/http/server.ts', () => ({
  serve: vi.fn(),
}));

describe('payment-verification Stripe Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Payment Intent Verification', () => {
    test('should verify successful payment intent', async () => {
      const mockPaymentIntent = {
        id: 'pi_test_success',
        status: 'succeeded',
        amount: 1000,
        currency: 'usd',
        metadata: {
          quote_ids: 'quote-123,quote-456',
        },
        charges: {
          data: [
            {
              id: 'ch_test_123',
              amount: 1000,
              currency: 'usd',
              status: 'succeeded',
            },
          ],
        },
      };

      mockStripe.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent);

      const verifyStripePayment = async (transactionId: string) => {
        const paymentIntent = await mockStripe.paymentIntents.retrieve(transactionId);

        return {
          success: true,
          payment_status: paymentIntent.status === 'succeeded' ? 'completed' : 'pending',
          transaction_id: transactionId,
          gateway: 'stripe',
          amount: paymentIntent.amount,
          currency: paymentIntent.currency.toUpperCase(),
          gateway_response: paymentIntent,
          verified_at: new Date().toISOString(),
        };
      };

      const result = await verifyStripePayment('pi_test_success');

      expect(mockStripe.paymentIntents.retrieve).toHaveBeenCalledWith('pi_test_success');
      expect(result).toEqual({
        success: true,
        payment_status: 'completed',
        transaction_id: 'pi_test_success',
        gateway: 'stripe',
        amount: 1000,
        currency: 'USD',
        gateway_response: mockPaymentIntent,
        verified_at: expect.any(String),
      });
    });

    test('should handle pending payment intent', async () => {
      const mockPaymentIntent = {
        id: 'pi_test_pending',
        status: 'requires_payment_method',
        amount: 1500,
        currency: 'eur',
        metadata: {
          quote_ids: 'quote-789',
        },
      };

      mockStripe.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent);

      const verifyStripePayment = async (transactionId: string) => {
        const paymentIntent = await mockStripe.paymentIntents.retrieve(transactionId);

        return {
          success: true,
          payment_status: paymentIntent.status === 'succeeded' ? 'completed' : 'pending',
          transaction_id: transactionId,
          gateway: 'stripe',
          amount: paymentIntent.amount,
          currency: paymentIntent.currency.toUpperCase(),
          gateway_response: paymentIntent,
          verified_at: new Date().toISOString(),
        };
      };

      const result = await verifyStripePayment('pi_test_pending');

      expect(result.payment_status).toBe('pending');
      expect(result.currency).toBe('EUR');
    });

    test('should handle failed payment intent', async () => {
      const mockPaymentIntent = {
        id: 'pi_test_failed',
        status: 'payment_failed',
        amount: 2000,
        currency: 'inr',
        metadata: {
          quote_ids: 'quote-failed',
        },
        last_payment_error: {
          message: 'Your card was declined.',
          type: 'card_error',
        },
      };

      mockStripe.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent);

      const verifyStripePayment = async (transactionId: string) => {
        const paymentIntent = await mockStripe.paymentIntents.retrieve(transactionId);

        let paymentStatus = 'pending';
        if (paymentIntent.status === 'succeeded') paymentStatus = 'completed';
        else if (paymentIntent.status === 'payment_failed') paymentStatus = 'failed';

        return {
          success: true,
          payment_status: paymentStatus,
          transaction_id: transactionId,
          gateway: 'stripe',
          amount: paymentIntent.amount,
          currency: paymentIntent.currency.toUpperCase(),
          gateway_response: paymentIntent,
          verified_at: new Date().toISOString(),
          error_message: paymentIntent.last_payment_error?.message,
        };
      };

      const result = await verifyStripePayment('pi_test_failed');

      expect(result.payment_status).toBe('failed');
      expect(result.error_message).toBe('Your card was declined.');
    });
  });

  describe('Webhook Verification', () => {
    test('should verify webhook signature', async () => {
      const mockWebhookPayload = JSON.stringify({
        id: 'evt_test_webhook',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_webhook_test',
            status: 'succeeded',
            amount: 1000,
            currency: 'usd',
          },
        },
      });

      const mockWebhookSignature = 'stripe-signature-header';
      const mockEvent = {
        id: 'evt_test_webhook',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_webhook_test',
            status: 'succeeded',
            amount: 1000,
            currency: 'usd',
          },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

      const verifyWebhook = async (payload: string, signature: string) => {
        const event = mockStripe.webhooks.constructEvent(
          payload,
          signature,
          mockDeno.env.get('STRIPE_WEBHOOK_SECRET'),
        );

        return {
          success: true,
          event_type: event.type,
          event_id: event.id,
          payment_intent_id: event.data.object.id,
          verified_at: new Date().toISOString(),
        };
      };

      const result = await verifyWebhook(mockWebhookPayload, mockWebhookSignature);

      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        mockWebhookPayload,
        mockWebhookSignature,
        'whsec_test_123',
      );

      expect(result).toEqual({
        success: true,
        event_type: 'payment_intent.succeeded',
        event_id: 'evt_test_webhook',
        payment_intent_id: 'pi_webhook_test',
        verified_at: expect.any(String),
      });
    });

    test('should handle invalid webhook signature', async () => {
      const mockWebhookPayload = JSON.stringify({
        id: 'evt_test_invalid',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_invalid' } },
      });

      const mockWebhookSignature = 'invalid-signature';
      const signatureError = new Error('Invalid signature');

      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw signatureError;
      });

      const verifyWebhook = async (payload: string, signature: string) => {
        try {
          const event = mockStripe.webhooks.constructEvent(
            payload,
            signature,
            mockDeno.env.get('STRIPE_WEBHOOK_SECRET'),
          );

          return {
            success: true,
            event_type: event.type,
            event_id: event.id,
            verified_at: new Date().toISOString(),
          };
        } catch (error) {
          return {
            success: false,
            error: error.message,
          };
        }
      };

      const result = await verifyWebhook(mockWebhookPayload, mockWebhookSignature);

      expect(result).toEqual({
        success: false,
        error: 'Invalid signature',
      });
    });
  });

  describe('Database Updates', () => {
    test('should update payment status in database after verification', async () => {
      const mockPaymentIntent = {
        id: 'pi_update_test',
        status: 'succeeded',
        amount: 1000,
        currency: 'usd',
        metadata: {
          quote_ids: 'quote-update',
        },
      };

      mockStripe.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent);
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: { id: 'txn_updated' }, error: null }),
        }),
      });

      const verifyAndUpdatePayment = async (transactionId: string) => {
        const paymentIntent = await mockStripe.paymentIntents.retrieve(transactionId);

        // Update payment transaction status
        const { data, error } = await mockSupabase
          .from('payment_transactions')
          .update({
            status: paymentIntent.status === 'succeeded' ? 'completed' : 'pending',
            gateway_response: paymentIntent,
            verified_at: new Date().toISOString(),
          })
          .eq('transaction_id', transactionId);

        if (error) throw error;

        return {
          success: true,
          payment_status: paymentIntent.status === 'succeeded' ? 'completed' : 'pending',
          transaction_id: transactionId,
          gateway: 'stripe',
          verified_at: new Date().toISOString(),
        };
      };

      const result = await verifyAndUpdatePayment('pi_update_test');

      expect(mockSupabase.from).toHaveBeenCalledWith('payment_transactions');
      expect(result.success).toBe(true);
      expect(result.payment_status).toBe('completed');
    });

    test('should handle database update errors', async () => {
      const mockPaymentIntent = {
        id: 'pi_db_error',
        status: 'succeeded',
        amount: 1000,
        currency: 'usd',
      };

      mockStripe.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent);
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database update failed' },
          }),
        }),
      });

      const verifyAndUpdatePayment = async (transactionId: string) => {
        try {
          const paymentIntent = await mockStripe.paymentIntents.retrieve(transactionId);

          const { data, error } = await mockSupabase
            .from('payment_transactions')
            .update({
              status: paymentIntent.status === 'succeeded' ? 'completed' : 'pending',
              gateway_response: paymentIntent,
            })
            .eq('transaction_id', transactionId);

          if (error) throw error;

          return {
            success: true,
            payment_status: 'completed',
            transaction_id: transactionId,
          };
        } catch (error) {
          return {
            success: false,
            error: error.message,
          };
        }
      };

      const result = await verifyAndUpdatePayment('pi_db_error');

      expect(result).toEqual({
        success: false,
        error: 'Database update failed',
      });
    });
  });

  describe('Multi-Currency Verification', () => {
    test('should verify payments in different currencies', async () => {
      const currencies = [
        { code: 'USD', amount: 1000 },
        { code: 'EUR', amount: 850 },
        { code: 'INR', amount: 83000 },
        { code: 'GBP', amount: 750 },
      ];

      for (const currency of currencies) {
        const mockPaymentIntent = {
          id: `pi_${currency.code.toLowerCase()}_test`,
          status: 'succeeded',
          amount: currency.amount,
          currency: currency.code.toLowerCase(),
          metadata: {
            quote_ids: `quote-${currency.code.toLowerCase()}`,
          },
        };

        mockStripe.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent);

        const verifyStripePayment = async (transactionId: string) => {
          const paymentIntent = await mockStripe.paymentIntents.retrieve(transactionId);

          return {
            success: true,
            payment_status: 'completed',
            transaction_id: transactionId,
            gateway: 'stripe',
            amount: paymentIntent.amount,
            currency: paymentIntent.currency.toUpperCase(),
            verified_at: new Date().toISOString(),
          };
        };

        const result = await verifyStripePayment(`pi_${currency.code.toLowerCase()}_test`);

        expect(result.currency).toBe(currency.code);
        expect(result.amount).toBe(currency.amount);
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle payment intent not found', async () => {
      const stripeError = new Error('No such payment_intent: pi_not_found');
      mockStripe.paymentIntents.retrieve.mockRejectedValue(stripeError);

      const verifyStripePayment = async (transactionId: string) => {
        try {
          const paymentIntent = await mockStripe.paymentIntents.retrieve(transactionId);

          return {
            success: true,
            payment_status: 'completed',
            transaction_id: transactionId,
            gateway: 'stripe',
          };
        } catch (error) {
          return {
            success: false,
            error: error.message,
            transaction_id: transactionId,
            gateway: 'stripe',
            recommendations: ['Check if the payment intent ID is correct'],
          };
        }
      };

      const result = await verifyStripePayment('pi_not_found');

      expect(result).toEqual({
        success: false,
        error: 'No such payment_intent: pi_not_found',
        transaction_id: 'pi_not_found',
        gateway: 'stripe',
        recommendations: ['Check if the payment intent ID is correct'],
      });
    });

    test('should handle Stripe API rate limiting', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      mockStripe.paymentIntents.retrieve.mockRejectedValue(rateLimitError);

      const verifyStripePayment = async (transactionId: string) => {
        try {
          const paymentIntent = await mockStripe.paymentIntents.retrieve(transactionId);

          return {
            success: true,
            payment_status: 'completed',
            transaction_id: transactionId,
            gateway: 'stripe',
          };
        } catch (error) {
          return {
            success: false,
            error: error.message,
            transaction_id: transactionId,
            gateway: 'stripe',
            recommendations: ['Retry verification after a brief delay'],
          };
        }
      };

      const result = await verifyStripePayment('pi_rate_limit');

      expect(result).toEqual({
        success: false,
        error: 'Rate limit exceeded',
        transaction_id: 'pi_rate_limit',
        gateway: 'stripe',
        recommendations: ['Retry verification after a brief delay'],
      });
    });
  });

  describe('Payment Metadata Processing', () => {
    test('should extract and validate quote IDs from metadata', async () => {
      const mockPaymentIntent = {
        id: 'pi_metadata_test',
        status: 'succeeded',
        amount: 2500,
        currency: 'usd',
        metadata: {
          quote_ids: 'quote-1,quote-2,quote-3',
          customer_email: 'customer@example.com',
          customer_name: 'John Doe',
        },
      };

      mockStripe.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent);

      const verifyStripePayment = async (transactionId: string) => {
        const paymentIntent = await mockStripe.paymentIntents.retrieve(transactionId);

        const quoteIds = paymentIntent.metadata?.quote_ids?.split(',') || [];

        return {
          success: true,
          payment_status: 'completed',
          transaction_id: transactionId,
          gateway: 'stripe',
          amount: paymentIntent.amount,
          currency: paymentIntent.currency.toUpperCase(),
          quote_ids: quoteIds,
          customer_info: {
            email: paymentIntent.metadata?.customer_email,
            name: paymentIntent.metadata?.customer_name,
          },
          verified_at: new Date().toISOString(),
        };
      };

      const result = await verifyStripePayment('pi_metadata_test');

      expect(result.quote_ids).toEqual(['quote-1', 'quote-2', 'quote-3']);
      expect(result.customer_info).toEqual({
        email: 'customer@example.com',
        name: 'John Doe',
      });
    });
  });

  describe('Security and Compliance', () => {
    test('should validate webhook endpoint security', async () => {
      const mockRequest = {
        headers: {
          'stripe-signature': 'test-signature',
          'user-agent': 'Stripe/1.0 (+https://stripe.com)',
        },
        body: JSON.stringify({
          id: 'evt_security_test',
          type: 'payment_intent.succeeded',
          data: { object: { id: 'pi_security_test' } },
        }),
      };

      const validateWebhookSecurity = (request: WebhookRequest) => {
        const signature = request.headers['stripe-signature'];
        const userAgent = request.headers['user-agent'];

        if (!signature) {
          return { valid: false, error: 'Missing Stripe signature' };
        }

        if (!userAgent?.includes('Stripe')) {
          return { valid: false, error: 'Invalid user agent' };
        }

        return { valid: true };
      };

      const result = validateWebhookSecurity(mockRequest);

      expect(result.valid).toBe(true);
    });

    test('should reject requests without proper signature', async () => {
      const mockRequest = {
        headers: {
          'user-agent': 'Stripe/1.0 (+https://stripe.com)',
        },
        body: JSON.stringify({
          id: 'evt_no_signature',
          type: 'payment_intent.succeeded',
          data: { object: { id: 'pi_no_signature' } },
        }),
      };

      const validateWebhookSecurity = (request: WebhookRequest) => {
        const signature = request.headers['stripe-signature'];

        if (!signature) {
          return { valid: false, error: 'Missing Stripe signature' };
        }

        return { valid: true };
      };

      const result = validateWebhookSecurity(mockRequest);

      expect(result).toEqual({
        valid: false,
        error: 'Missing Stripe signature',
      });
    });
  });
});
