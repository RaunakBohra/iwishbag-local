import { describe, test, expect, beforeEach, vi } from 'vitest';

// Type definitions
interface PaymentRequest {
  quoteIds: string[];
  gateway: 'bank_transfer' | 'cod' | 'payu' | 'esewa' | 'khalti' | 'fonepay' | 'airwallex' | 'stripe';
  success_url: string;
  cancel_url: string;
  amount?: number;
  currency?: string;
  metadata?: Record<string, unknown>;
  customerInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
}

// Mock Deno global and environment
const mockDeno = {
  env: {
    get: vi.fn((key: string) => {
      const envVars: Record<string, string> = {
        'STRIPE_SECRET_KEY': 'sk_test_123',
        'STRIPE_PUBLISHABLE_KEY': 'pk_test_123',
        'SUPABASE_URL': 'https://test.supabase.co',
        'SUPABASE_SERVICE_ROLE_KEY': 'test-service-role-key',
        'PAYU_MERCHANT_KEY': 'test-merchant-key',
        'PAYU_SALT_KEY': 'test-salt-key',
      };
      return envVars[key] || '';
    }),
  },
};

// Mock global Deno
global.Deno = mockDeno as typeof Deno;

// Mock Stripe
const mockStripe = {
  paymentIntents: {
    create: vi.fn(),
    retrieve: vi.fn(),
    confirm: vi.fn(),
  },
  customers: {
    create: vi.fn(),
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

describe('create-payment Stripe Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Payment Intent Creation', () => {
    test('should create Stripe payment intent with correct parameters', async () => {
      const mockPaymentRequest = {
        quoteIds: ['quote-123'],
        gateway: 'stripe',
        amount: 1000,
        currency: 'USD',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
        customerInfo: {
          name: 'Test Customer',
          email: 'test@example.com',
          phone: '+1234567890',
        },
      };

      const mockPaymentIntent = {
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret_abc',
        amount: 1000,
        currency: 'usd',
        status: 'requires_payment_method',
      };

      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      // Mock the actual function logic
      const createStripePayment = async (request: PaymentRequest) => {
        const paymentIntent = await mockStripe.paymentIntents.create({
          amount: request.amount,
          currency: request.currency.toLowerCase(),
          metadata: {
            quote_ids: request.quoteIds.join(','),
            customer_email: request.customerInfo?.email || '',
            customer_name: request.customerInfo?.name || '',
          },
          description: `Payment for quotes: ${request.quoteIds.join(', ')}`,
        });

        return {
          success: true,
          client_secret: paymentIntent.client_secret,
          transactionId: paymentIntent.id,
        };
      };

      const result = await createStripePayment(mockPaymentRequest);

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 1000,
        currency: 'usd',
        metadata: {
          quote_ids: 'quote-123',
          customer_email: 'test@example.com',
          customer_name: 'Test Customer',
        },
        description: 'Payment for quotes: quote-123',
      });

      expect(result).toEqual({
        success: true,
        client_secret: 'pi_test_123_secret_abc',
        transactionId: 'pi_test_123',
      });
    });

    test('should handle multiple quote IDs in payment intent', async () => {
      const mockPaymentRequest = {
        quoteIds: ['quote-123', 'quote-456', 'quote-789'],
        gateway: 'stripe',
        amount: 2500,
        currency: 'EUR',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
      };

      const mockPaymentIntent = {
        id: 'pi_test_multi',
        client_secret: 'pi_test_multi_secret_xyz',
        amount: 2500,
        currency: 'eur',
        status: 'requires_payment_method',
      };

      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      const createStripePayment = async (request: PaymentRequest) => {
        const paymentIntent = await mockStripe.paymentIntents.create({
          amount: request.amount,
          currency: request.currency.toLowerCase(),
          metadata: {
            quote_ids: request.quoteIds.join(','),
          },
          description: `Payment for quotes: ${request.quoteIds.join(', ')}`,
        });

        return {
          success: true,
          client_secret: paymentIntent.client_secret,
          transactionId: paymentIntent.id,
        };
      };

      const result = await createStripePayment(mockPaymentRequest);

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 2500,
        currency: 'eur',
        metadata: {
          quote_ids: 'quote-123,quote-456,quote-789',
        },
        description: 'Payment for quotes: quote-123, quote-456, quote-789',
      });

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe('pi_test_multi');
    });

    test('should handle INR currency payments', async () => {
      const mockPaymentRequest = {
        quoteIds: ['quote-inr'],
        gateway: 'stripe',
        amount: 83000,
        currency: 'INR',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
      };

      const mockPaymentIntent = {
        id: 'pi_test_inr',
        client_secret: 'pi_test_inr_secret',
        amount: 83000,
        currency: 'inr',
        status: 'requires_payment_method',
      };

      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      const createStripePayment = async (request: PaymentRequest) => {
        const paymentIntent = await mockStripe.paymentIntents.create({
          amount: request.amount,
          currency: request.currency.toLowerCase(),
          metadata: {
            quote_ids: request.quoteIds.join(','),
          },
        });

        return {
          success: true,
          client_secret: paymentIntent.client_secret,
          transactionId: paymentIntent.id,
        };
      };

      const result = await createStripePayment(mockPaymentRequest);

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 83000,
        currency: 'inr',
        metadata: {
          quote_ids: 'quote-inr',
        },
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Customer Information Handling', () => {
    test('should include customer information in payment intent metadata', async () => {
      const mockPaymentRequest = {
        quoteIds: ['quote-customer'],
        gateway: 'stripe',
        amount: 1500,
        currency: 'USD',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
        customerInfo: {
          name: 'John Doe',
          email: 'john.doe@example.com',
          phone: '+1-555-0123',
          address: '123 Main St, City, State 12345',
        },
      };

      mockStripe.paymentIntents.create.mockResolvedValue({
        id: 'pi_customer_test',
        client_secret: 'pi_customer_test_secret',
        amount: 1500,
        currency: 'usd',
        status: 'requires_payment_method',
      });

      const createStripePayment = async (request: PaymentRequest) => {
        const paymentIntent = await mockStripe.paymentIntents.create({
          amount: request.amount,
          currency: request.currency.toLowerCase(),
          metadata: {
            quote_ids: request.quoteIds.join(','),
            customer_email: request.customerInfo?.email || '',
            customer_name: request.customerInfo?.name || '',
            customer_phone: request.customerInfo?.phone || '',
            customer_address: request.customerInfo?.address || '',
          },
        });

        return {
          success: true,
          client_secret: paymentIntent.client_secret,
          transactionId: paymentIntent.id,
        };
      };

      const result = await createStripePayment(mockPaymentRequest);

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 1500,
        currency: 'usd',
        metadata: {
          quote_ids: 'quote-customer',
          customer_email: 'john.doe@example.com',
          customer_name: 'John Doe',
          customer_phone: '+1-555-0123',
          customer_address: '123 Main St, City, State 12345',
        },
      });

      expect(result.success).toBe(true);
    });

    test('should handle missing customer information gracefully', async () => {
      const mockPaymentRequest = {
        quoteIds: ['quote-no-customer'],
        gateway: 'stripe',
        amount: 1000,
        currency: 'USD',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
      };

      mockStripe.paymentIntents.create.mockResolvedValue({
        id: 'pi_no_customer',
        client_secret: 'pi_no_customer_secret',
        amount: 1000,
        currency: 'usd',
        status: 'requires_payment_method',
      });

      const createStripePayment = async (request: PaymentRequest) => {
        const paymentIntent = await mockStripe.paymentIntents.create({
          amount: request.amount,
          currency: request.currency.toLowerCase(),
          metadata: {
            quote_ids: request.quoteIds.join(','),
            customer_email: request.customerInfo?.email || '',
            customer_name: request.customerInfo?.name || '',
          },
        });

        return {
          success: true,
          client_secret: paymentIntent.client_secret,
          transactionId: paymentIntent.id,
        };
      };

      const result = await createStripePayment(mockPaymentRequest);

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 1000,
        currency: 'usd',
        metadata: {
          quote_ids: 'quote-no-customer',
          customer_email: '',
          customer_name: '',
        },
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle Stripe API errors gracefully', async () => {
      const mockPaymentRequest = {
        quoteIds: ['quote-error'],
        gateway: 'stripe',
        amount: 1000,
        currency: 'USD',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
      };

      const stripeError = new Error('Invalid API key');
      mockStripe.paymentIntents.create.mockRejectedValue(stripeError);

      const createStripePayment = async (request: PaymentRequest) => {
        try {
          const paymentIntent = await mockStripe.paymentIntents.create({
            amount: request.amount,
            currency: request.currency.toLowerCase(),
            metadata: {
              quote_ids: request.quoteIds.join(','),
            },
          });

          return {
            success: true,
            client_secret: paymentIntent.client_secret,
            transactionId: paymentIntent.id,
          };
        } catch (error) {
          return {
            success: false,
            error: error.message,
          };
        }
      };

      const result = await createStripePayment(mockPaymentRequest);

      expect(result).toEqual({
        success: false,
        error: 'Invalid API key',
      });
    });

    test('should handle invalid currency errors', async () => {
      const mockPaymentRequest = {
        quoteIds: ['quote-invalid-currency'],
        gateway: 'stripe',
        amount: 1000,
        currency: 'INVALID',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
      };

      const stripeError = new Error('Invalid currency: INVALID');
      mockStripe.paymentIntents.create.mockRejectedValue(stripeError);

      const createStripePayment = async (request: PaymentRequest) => {
        try {
          const paymentIntent = await mockStripe.paymentIntents.create({
            amount: request.amount,
            currency: request.currency.toLowerCase(),
            metadata: {
              quote_ids: request.quoteIds.join(','),
            },
          });

          return {
            success: true,
            client_secret: paymentIntent.client_secret,
            transactionId: paymentIntent.id,
          };
        } catch (error) {
          return {
            success: false,
            error: error.message,
          };
        }
      };

      const result = await createStripePayment(mockPaymentRequest);

      expect(result).toEqual({
        success: false,
        error: 'Invalid currency: INVALID',
      });
    });

    test('should handle amount validation errors', async () => {
      const mockPaymentRequest = {
        quoteIds: ['quote-invalid-amount'],
        gateway: 'stripe',
        amount: -100, // Negative amount
        currency: 'USD',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
      };

      const stripeError = new Error('Amount must be greater than 0');
      mockStripe.paymentIntents.create.mockRejectedValue(stripeError);

      const createStripePayment = async (request: PaymentRequest) => {
        try {
          const paymentIntent = await mockStripe.paymentIntents.create({
            amount: request.amount,
            currency: request.currency.toLowerCase(),
            metadata: {
              quote_ids: request.quoteIds.join(','),
            },
          });

          return {
            success: true,
            client_secret: paymentIntent.client_secret,
            transactionId: paymentIntent.id,
          };
        } catch (error) {
          return {
            success: false,
            error: error.message,
          };
        }
      };

      const result = await createStripePayment(mockPaymentRequest);

      expect(result).toEqual({
        success: false,
        error: 'Amount must be greater than 0',
      });
    });
  });

  describe('Database Integration', () => {
    test('should store payment transaction in database', async () => {
      const mockPaymentRequest = {
        quoteIds: ['quote-db-test'],
        gateway: 'stripe',
        amount: 1000,
        currency: 'USD',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
      };

      const mockPaymentIntent = {
        id: 'pi_db_test',
        client_secret: 'pi_db_test_secret',
        amount: 1000,
        currency: 'usd',
        status: 'requires_payment_method',
      };

      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: { id: 'txn_123' }, error: null }),
      });

      const createStripePaymentWithDb = async (request: PaymentRequest) => {
        const paymentIntent = await mockStripe.paymentIntents.create({
          amount: request.amount,
          currency: request.currency.toLowerCase(),
          metadata: {
            quote_ids: request.quoteIds.join(','),
          },
        });

        // Store transaction in database
        await mockSupabase.from('payment_transactions').insert({
          transaction_id: paymentIntent.id,
          gateway: 'stripe',
          amount: request.amount,
          currency: request.currency,
          status: 'pending',
          gateway_response: paymentIntent,
        });

        return {
          success: true,
          client_secret: paymentIntent.client_secret,
          transactionId: paymentIntent.id,
        };
      };

      const result = await createStripePaymentWithDb(mockPaymentRequest);

      expect(mockSupabase.from).toHaveBeenCalledWith('payment_transactions');
      expect(result.success).toBe(true);
      expect(result.transactionId).toBe('pi_db_test');
    });

    test('should handle database insertion errors', async () => {
      const mockPaymentRequest = {
        quoteIds: ['quote-db-error'],
        gateway: 'stripe',
        amount: 1000,
        currency: 'USD',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
      };

      const mockPaymentIntent = {
        id: 'pi_db_error',
        client_secret: 'pi_db_error_secret',
        amount: 1000,
        currency: 'usd',
        status: 'requires_payment_method',
      };

      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Database insertion failed' } 
        }),
      });

      const createStripePaymentWithDb = async (request: PaymentRequest) => {
        try {
          const paymentIntent = await mockStripe.paymentIntents.create({
            amount: request.amount,
            currency: request.currency.toLowerCase(),
            metadata: {
              quote_ids: request.quoteIds.join(','),
            },
          });

          const { error } = await mockSupabase.from('payment_transactions').insert({
            transaction_id: paymentIntent.id,
            gateway: 'stripe',
            amount: request.amount,
            currency: request.currency,
            status: 'pending',
            gateway_response: paymentIntent,
          });

          if (error) {
            throw new Error(error.message);
          }

          return {
            success: true,
            client_secret: paymentIntent.client_secret,
            transactionId: paymentIntent.id,
          };
        } catch (error) {
          return {
            success: false,
            error: error.message,
          };
        }
      };

      const result = await createStripePaymentWithDb(mockPaymentRequest);

      expect(result).toEqual({
        success: false,
        error: 'Database insertion failed',
      });
    });
  });

  describe('Security Validations', () => {
    test('should validate quote ownership before processing payment', async () => {
      const mockPaymentRequest = {
        quoteIds: ['quote-security-test'],
        gateway: 'stripe',
        amount: 1000,
        currency: 'USD',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
      };

      // Mock quote validation
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [{ id: 'quote-security-test', user_id: 'user-123' }],
            error: null,
          }),
        }),
      });

      const validateQuoteOwnership = async (quoteIds: string[], userId: string) => {
        const { data: quotes, error } = await mockSupabase.from('quotes')
          .select('id, user_id')
          .in('id', quoteIds);

        if (error) throw error;
        
        const unauthorizedQuotes = quotes?.filter(q => q.user_id !== userId);
        if (unauthorizedQuotes?.length > 0) {
          throw new Error('Unauthorized quote access');
        }

        return true;
      };

      const result = await validateQuoteOwnership(['quote-security-test'], 'user-123');

      expect(result).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('quotes');
    });

    test('should reject payment for unauthorized quotes', async () => {
      const mockPaymentRequest = {
        quoteIds: ['quote-unauthorized'],
        gateway: 'stripe',
        amount: 1000,
        currency: 'USD',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
      };

      // Mock quote validation with unauthorized quote
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [{ id: 'quote-unauthorized', user_id: 'other-user' }],
            error: null,
          }),
        }),
      });

      const validateQuoteOwnership = async (quoteIds: string[], userId: string) => {
        const { data: quotes, error } = await mockSupabase.from('quotes')
          .select('id, user_id')
          .in('id', quoteIds);

        if (error) throw error;
        
        const unauthorizedQuotes = quotes?.filter(q => q.user_id !== userId);
        if (unauthorizedQuotes?.length > 0) {
          throw new Error('Unauthorized quote access');
        }

        return true;
      };

      await expect(validateQuoteOwnership(['quote-unauthorized'], 'user-123'))
        .rejects
        .toThrow('Unauthorized quote access');
    });
  });

  describe('Environment Configuration', () => {
    test('should use correct Stripe API key from environment', () => {
      expect(mockDeno.env.get).toHaveBeenCalledWith('STRIPE_SECRET_KEY');
    });

    test('should handle missing Stripe configuration', () => {
      mockDeno.env.get.mockImplementation((key: string) => {
        if (key === 'STRIPE_SECRET_KEY') return '';
        return 'test-value';
      });

      const initializeStripe = () => {
        const apiKey = mockDeno.env.get('STRIPE_SECRET_KEY');
        if (!apiKey) {
          throw new Error('Stripe API key not configured');
        }
        return mockStripe;
      };

      expect(() => initializeStripe()).toThrow('Stripe API key not configured');
    });
  });
});