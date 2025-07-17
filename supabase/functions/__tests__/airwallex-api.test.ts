import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { 
  createAirwallexPaymentIntent, 
  formatAmountForAirwallex,
  isCurrencySupportedByAirwallex 
} from '../create-payment/airwallex-api.ts';

// Mock Deno global for environment variables
globalThis.Deno = {
  env: {
    get: vi.fn((key: string) => {
      const envVars: Record<string, string> = {
        'FRONTEND_URL': 'https://test.whyteclub.com',
        'AIRWALLEX_API_KEY': 'test_airwallex_key',
        'AIRWALLEX_CLIENT_ID': 'test_client_id',
        'AIRWALLEX_BASE_URL': 'https://api.airwallex.com',
        'SUPABASE_URL': 'http://127.0.0.1:54321',
        'SUPABASE_SERVICE_ROLE_KEY': 'test-service-role-key'
      };
      return envVars[key] || null;
    })
  }
} as any;

// Mock crypto for UUID generation
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'test-uuid-123'),
  },
  writable: true,
  configurable: true
});

// Mock types
interface MockAirwallexPaymentIntent {
  id: string;
  client_secret: string;
  amount: number;
  currency: string;
  status: string;
  customer?: any;
  metadata?: any;
  created_at: string;
  merchant_order_id: string;
  next_action?: {
    url?: string;
  };
}

interface MockAirwallexClient {
  paymentIntents: {
    create: ReturnType<typeof vi.fn>;
  };
}

describe('airwallex-api', () => {
  let mockAirwallexClient: MockAirwallexClient;
  let mockSupabaseClient: SupabaseClient;
  let mockInsert: ReturnType<typeof vi.fn>;
  let mockFrom: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Mock Airwallex client
    mockAirwallexClient = {
      paymentIntents: {
        create: vi.fn()
      }
    };

    // Mock Supabase client
    mockInsert = vi.fn().mockReturnValue(Promise.resolve({ error: null }));
    mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
    mockSupabaseClient = {
      from: mockFrom
    } as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createAirwallexPaymentIntent', () => {
    const baseParams = {
      airwallexClient: {} as any, // Will be replaced with mockAirwallexClient
      amount: 100.50,
      currency: 'USD',
      quoteIds: ['quote_123', 'quote_456'],
      userId: 'user_789',
      customerInfo: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        address: {
          line1: '123 Main St',
          city: 'New York',
          state: 'NY',
          postal_code: '10001',
          country: 'US'
        }
      },
      quotes: [
        {
          id: 'quote_123',
          product_name: 'Product 1',
          final_total: 50.25,
          quantity: 2,
          final_currency: 'USD'
        },
        {
          id: 'quote_456',
          product_name: 'Product 2',
          final_total: 50.25,
          quantity: 1,
          final_currency: 'USD'
        }
      ],
      supabaseAdmin: {} as SupabaseClient // Will be replaced with mockSupabaseClient
    };

    it('should successfully create a payment intent', async () => {
      // Arrange
      const mockPaymentIntent: MockAirwallexPaymentIntent = {
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret_abc',
        amount: 10050, // $100.50 in cents
        currency: 'USD',
        status: 'requires_payment_method',
        customer: {
          email: 'john@example.com',
          first_name: 'John',
          last_name: 'Doe'
        },
        metadata: {
          quote_ids: 'quote_123,quote_456',
          user_id: 'user_789'
        },
        created_at: '2024-01-15T10:00:00Z',
        merchant_order_id: 'quote_123',
        next_action: {
          url: 'https://checkout.airwallex.com/payment/pi_test_123/redirect'
        }
      };

      mockAirwallexClient.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      // Act
      const result = await createAirwallexPaymentIntent({
        ...baseParams,
        airwallexClient: mockAirwallexClient as any,
        supabaseAdmin: mockSupabaseClient
      });

      // Assert
      expect(result).toEqual({
        success: true,
        client_secret: 'pi_test_123_secret_abc',
        transactionId: 'airwallex_pi_test_123',
        paymentIntentId: 'pi_test_123',
        confirmationUrl: 'https://checkout.airwallex.com/payment/pi_test_123/redirect'
      });

      // Verify Airwallex API was called with correct parameters
      expect(mockAirwallexClient.paymentIntents.create).toHaveBeenCalledTimes(1);
      const createCall = mockAirwallexClient.paymentIntents.create.mock.calls[0][0];
      expect(createCall.amount).toBe(10050); // Amount in cents
      expect(createCall.currency).toBe('USD');
      expect(createCall.customer.email).toBe('john@example.com');
      expect(createCall.metadata.quote_ids).toBe('quote_123,quote_456');

      // Verify Supabase insert was called
      expect(mockFrom).toHaveBeenCalledWith('payment_transactions');
      expect(mockInsert).toHaveBeenCalledTimes(1);
      const insertData = mockInsert.mock.calls[0][0];
      expect(insertData.transaction_id).toBe('airwallex_pi_test_123');
      expect(insertData.amount).toBe(100.50);
      expect(insertData.gateway).toBe('airwallex');
    });

    it('should handle invalid amount', async () => {
      // Act & Assert
      const result = await createAirwallexPaymentIntent({
        ...baseParams,
        amount: 0,
        airwallexClient: mockAirwallexClient as any,
        supabaseAdmin: mockSupabaseClient
      });

      expect(result).toEqual({
        success: false,
        error: 'Invalid payment amount'
      });
      expect(mockAirwallexClient.paymentIntents.create).not.toHaveBeenCalled();
    });

    it('should handle negative amount', async () => {
      // Act & Assert
      const result = await createAirwallexPaymentIntent({
        ...baseParams,
        amount: -50,
        airwallexClient: mockAirwallexClient as any,
        supabaseAdmin: mockSupabaseClient
      });

      expect(result).toEqual({
        success: false,
        error: 'Invalid payment amount'
      });
      expect(mockAirwallexClient.paymentIntents.create).not.toHaveBeenCalled();
    });

    it('should handle invalid currency code', async () => {
      // Act & Assert
      const result = await createAirwallexPaymentIntent({
        ...baseParams,
        currency: 'US', // Too short
        airwallexClient: mockAirwallexClient as any,
        supabaseAdmin: mockSupabaseClient
      });

      expect(result).toEqual({
        success: false,
        error: 'Invalid currency code'
      });
      expect(mockAirwallexClient.paymentIntents.create).not.toHaveBeenCalled();
    });

    it('should handle empty quoteIds', async () => {
      // Act & Assert
      const result = await createAirwallexPaymentIntent({
        ...baseParams,
        quoteIds: [],
        airwallexClient: mockAirwallexClient as any,
        supabaseAdmin: mockSupabaseClient
      });

      expect(result).toEqual({
        success: false,
        error: 'No quote IDs provided'
      });
      expect(mockAirwallexClient.paymentIntents.create).not.toHaveBeenCalled();
    });

    it('should handle unsupported currency', async () => {
      // Act & Assert
      const result = await createAirwallexPaymentIntent({
        ...baseParams,
        currency: 'XXX', // Unsupported currency
        airwallexClient: mockAirwallexClient as any,
        supabaseAdmin: mockSupabaseClient
      });

      expect(result).toEqual({
        success: false,
        error: 'Currency XXX is not supported by Airwallex'
      });
      expect(mockAirwallexClient.paymentIntents.create).not.toHaveBeenCalled();
    });

    it('should handle Airwallex API error', async () => {
      // Arrange
      const apiError = new Error('Invalid API key');
      mockAirwallexClient.paymentIntents.create.mockRejectedValue(apiError);

      // Act
      const result = await createAirwallexPaymentIntent({
        ...baseParams,
        airwallexClient: mockAirwallexClient as any,
        supabaseAdmin: mockSupabaseClient
      });

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'Invalid API key'
      });
    });

    it('should handle Airwallex API error object', async () => {
      // Arrange
      const apiError = {
        message: 'Payment intent creation failed',
        code: 'payment_intent_error',
        status: 400
      };
      mockAirwallexClient.paymentIntents.create.mockRejectedValue(apiError);

      // Act
      const result = await createAirwallexPaymentIntent({
        ...baseParams,
        airwallexClient: mockAirwallexClient as any,
        supabaseAdmin: mockSupabaseClient
      });

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'Payment intent creation failed'
      });
    });

    it('should construct correct request payload', async () => {
      // Arrange
      const mockPaymentIntent: MockAirwallexPaymentIntent = {
        id: 'pi_test_789',
        client_secret: 'secret_xyz',
        amount: 10050,
        currency: 'USD',
        status: 'requires_payment_method',
        created_at: '2024-01-15T10:00:00Z',
        merchant_order_id: 'quote_123'
      };
      mockAirwallexClient.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      // Act
      await createAirwallexPaymentIntent({
        ...baseParams,
        airwallexClient: mockAirwallexClient as any,
        supabaseAdmin: mockSupabaseClient
      });

      // Assert
      const createCall = mockAirwallexClient.paymentIntents.create.mock.calls[0][0];
      
      // Check amount formatting
      expect(createCall.amount).toBe(10050); // $100.50 -> 10050 cents
      expect(createCall.currency).toBe('USD');
      
      // Check customer details
      expect(createCall.customer).toEqual({
        email: 'john@example.com',
        first_name: 'John',
        last_name: 'Doe',
        phone_number: '+1234567890',
        address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          postcode: '10001',
          country_code: 'US'
        }
      });
      
      // Check metadata
      expect(createCall.metadata).toEqual({
        quote_ids: 'quote_123,quote_456',
        user_id: 'user_789',
        quotes_count: '2',
        total_items: '3' // 2 + 1 = 3 items total
      });
      
      // Check other fields
      expect(createCall.description).toBe('Payment for 2 item(s) - Order: quote_123, quote_456');
      expect(createCall.merchant_order_id).toBe('quote_123');
      expect(createCall.return_url).toBe('https://test.whyteclub.com/payment/complete');
      expect(createCall.request_id).toMatch(/^user_789_\d+_[a-z0-9]+$/);
    });

    it('should handle payment intent without next_action URL', async () => {
      // Arrange
      const mockPaymentIntent: MockAirwallexPaymentIntent = {
        id: 'pi_test_no_action',
        client_secret: 'secret_no_action',
        amount: 10050,
        currency: 'USD',
        status: 'requires_payment_method',
        created_at: '2024-01-15T10:00:00Z',
        merchant_order_id: 'quote_123'
        // No next_action property
      };
      mockAirwallexClient.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      // Act
      const result = await createAirwallexPaymentIntent({
        ...baseParams,
        airwallexClient: mockAirwallexClient as any,
        supabaseAdmin: mockSupabaseClient
      });

      // Assert
      expect(result.confirmationUrl).toBe('https://checkout.airwallex.com/payment/pi_test_no_action');
    });

    it('should handle database insert failure gracefully', async () => {
      // Arrange
      const mockPaymentIntent: MockAirwallexPaymentIntent = {
        id: 'pi_test_db_fail',
        client_secret: 'secret_db_fail',
        amount: 10050,
        currency: 'USD',
        status: 'requires_payment_method',
        created_at: '2024-01-15T10:00:00Z',
        merchant_order_id: 'quote_123'
      };
      mockAirwallexClient.paymentIntents.create.mockResolvedValue(mockPaymentIntent);
      mockInsert.mockReturnValue(Promise.resolve({ error: new Error('Database error') }));

      // Act
      const result = await createAirwallexPaymentIntent({
        ...baseParams,
        airwallexClient: mockAirwallexClient as any,
        supabaseAdmin: mockSupabaseClient
      });

      // Assert - Should still return success since payment intent was created
      expect(result).toEqual({
        success: true,
        client_secret: 'secret_db_fail',
        transactionId: 'airwallex_pi_test_db_fail',
        paymentIntentId: 'pi_test_db_fail',
        confirmationUrl: 'https://checkout.airwallex.com/payment/pi_test_db_fail'
      });
    });

    it('should handle minimal customer info', async () => {
      // Arrange
      const mockPaymentIntent: MockAirwallexPaymentIntent = {
        id: 'pi_test_minimal',
        client_secret: 'secret_minimal',
        amount: 10050,
        currency: 'USD',
        status: 'requires_payment_method',
        created_at: '2024-01-15T10:00:00Z',
        merchant_order_id: 'quote_123'
      };
      mockAirwallexClient.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      // Act
      await createAirwallexPaymentIntent({
        ...baseParams,
        customerInfo: undefined, // No customer info
        airwallexClient: mockAirwallexClient as any,
        supabaseAdmin: mockSupabaseClient
      });

      // Assert
      const createCall = mockAirwallexClient.paymentIntents.create.mock.calls[0][0];
      expect(createCall.customer).toBeUndefined();
    });
  });

  describe('formatAmountForAirwallex', () => {
    it('should format USD correctly (2 decimal places)', () => {
      expect(formatAmountForAirwallex(100.50, 'USD')).toBe(10050);
      expect(formatAmountForAirwallex(99.99, 'USD')).toBe(9999);
      expect(formatAmountForAirwallex(1, 'USD')).toBe(100);
    });

    it('should format zero-decimal currencies correctly', () => {
      expect(formatAmountForAirwallex(1000, 'JPY')).toBe(1000);
      expect(formatAmountForAirwallex(5000, 'KRW')).toBe(5000);
    });

    it('should format three-decimal currencies correctly', () => {
      expect(formatAmountForAirwallex(10.5, 'KWD')).toBe(10500);
      expect(formatAmountForAirwallex(1, 'BHD')).toBe(1000);
    });
  });

  describe('isCurrencySupportedByAirwallex', () => {
    it('should return true for supported currencies', () => {
      expect(isCurrencySupportedByAirwallex('USD')).toBe(true);
      expect(isCurrencySupportedByAirwallex('EUR')).toBe(true);
      expect(isCurrencySupportedByAirwallex('GBP')).toBe(true);
      expect(isCurrencySupportedByAirwallex('JPY')).toBe(true);
    });

    it('should return false for unsupported currencies', () => {
      expect(isCurrencySupportedByAirwallex('XXX')).toBe(false);
      expect(isCurrencySupportedByAirwallex('ABC')).toBe(false);
    });

    it('should handle case insensitivity', () => {
      expect(isCurrencySupportedByAirwallex('usd')).toBe(true);
      expect(isCurrencySupportedByAirwallex('UsD')).toBe(true);
    });
  });
});