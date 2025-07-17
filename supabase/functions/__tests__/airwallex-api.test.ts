import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createAirwallexPaymentIntent,
  formatAmountForAirwallex,
  isCurrencySupportedByAirwallex,
} from '../create-payment/airwallex-api.ts';

// Mock Deno global for environment variables
globalThis.Deno = {
  env: {
    get: vi.fn((key: string) => {
      const envVars: Record<string, string> = {
        FRONTEND_URL: 'https://test.whyteclub.com',
        AIRWALLEX_API_KEY: 'test_airwallex_key',
        AIRWALLEX_CLIENT_ID: 'test_client_id',
        AIRWALLEX_BASE_URL: 'https://api.airwallex.com',
        SUPABASE_URL: 'http://127.0.0.1:54321',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
      };
      return envVars[key] || null;
    }),
  },
} as any;

// Mock crypto for UUID generation
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'test-uuid-123'),
  },
  writable: true,
  configurable: true,
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

    // Mock global fetch for Airwallex API calls
    const mockFetch = vi.fn();
    global.fetch = mockFetch;

    // Configure fetch mock for authentication
    mockFetch.mockImplementation((url: string, options: any) => {
      if (url.includes('/authentication/login')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              token: 'mock_access_token_123',
              expires_at: '2024-12-31T23:59:59Z',
            }),
          headers: new Headers(),
          text: () => Promise.resolve(''),
        } as Response);
      }

      // Configure fetch mock for payment intent creation
      if (url.includes('/payment_intents/create')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              id: 'pi_test_123',
              client_secret: 'pi_test_123_secret_abc',
              amount: 10050,
              currency: 'USD',
              status: 'requires_payment_method',
              customer: {
                email: 'john@example.com',
                first_name: 'John',
                last_name: 'Doe',
              },
              metadata: {
                quote_ids: 'quote_123,quote_456',
                user_id: 'user_789',
              },
              created_at: '2024-01-15T10:00:00Z',
              merchant_order_id: 'quote_123',
            }),
          headers: new Headers(),
          text: () => Promise.resolve(''),
        } as Response);
      }

      // Default fallback
      return Promise.reject(new Error(`Unmocked fetch call to: ${url}`));
    });

    // Mock Airwallex client (kept for backward compatibility but not used by actual implementation)
    mockAirwallexClient = {
      paymentIntents: {
        create: vi.fn(),
      },
    };

    // Mock Supabase client
    mockInsert = vi.fn().mockReturnValue(Promise.resolve({ error: null }));
    mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
    mockSupabaseClient = {
      from: mockFrom,
    } as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createAirwallexPaymentIntent', () => {
    const baseParams = {
      apiKey: 'test_airwallex_key',
      clientId: 'test_client_id',
      testMode: true,
      amount: 100.5,
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
          country: 'US',
        },
      },
      quotes: [
        {
          id: 'quote_123',
          product_name: 'Product 1',
          final_total: 50.25,
          quantity: 2,
          final_currency: 'USD',
        },
        {
          id: 'quote_456',
          product_name: 'Product 2',
          final_total: 50.25,
          quantity: 1,
          final_currency: 'USD',
        },
      ],
      supabaseAdmin: {} as SupabaseClient, // Will be replaced with mockSupabaseClient
    };

    it('should successfully create a payment intent', async () => {
      // Act
      const result = await createAirwallexPaymentIntent({
        ...baseParams,
        supabaseAdmin: mockSupabaseClient,
      });

      // Assert
      expect(result).toEqual({
        success: true,
        client_secret: 'pi_test_123_secret_abc',
        transactionId: 'airwallex_pi_test_123',
        paymentIntentId: 'pi_test_123',
        confirmationUrl: null,
        airwallexData: {
          intent_id: 'pi_test_123',
          client_secret: 'pi_test_123_secret_abc',
          currency: 'USD',
          amount: 10050,
          env: 'demo',
        },
      });

      // Verify fetch was called for authentication
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api-demo.airwallex.com/api/v1/authentication/login',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-client-id': 'test_client_id',
            'x-api-key': 'test_airwallex_key',
            'Content-Type': 'application/json',
            'x-api-version': '2024-06-14',
          }),
        }),
      );

      // Verify fetch was called for payment intent creation
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api-demo.airwallex.com/api/v1/pa/payment_intents/create',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock_access_token_123',
            'x-api-version': '2024-06-14',
          }),
          body: expect.stringContaining('"amount":10050'),
        }),
      );

      // Verify Supabase insert was called
      expect(mockFrom).toHaveBeenCalledWith('payment_transactions');
      expect(mockInsert).toHaveBeenCalledTimes(1);
      const insertData = mockInsert.mock.calls[0][0];
      expect(insertData.transaction_id).toBe('airwallex_pi_test_123');
      expect(insertData.amount).toBe(100.5);
      expect(insertData.gateway).toBe('airwallex');
    });

    it('should handle invalid amount', async () => {
      // Act & Assert
      const result = await createAirwallexPaymentIntent({
        ...baseParams,
        amount: 0,
        supabaseAdmin: mockSupabaseClient,
      });

      expect(result).toEqual({
        success: false,
        error: 'Invalid payment amount',
      });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle negative amount', async () => {
      // Act & Assert
      const result = await createAirwallexPaymentIntent({
        ...baseParams,
        amount: -50,
        supabaseAdmin: mockSupabaseClient,
      });

      expect(result).toEqual({
        success: false,
        error: 'Invalid payment amount',
      });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle invalid currency code', async () => {
      // Act & Assert
      const result = await createAirwallexPaymentIntent({
        ...baseParams,
        currency: 'US', // Too short
        supabaseAdmin: mockSupabaseClient,
      });

      expect(result).toEqual({
        success: false,
        error: 'Invalid currency code',
      });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle empty quoteIds', async () => {
      // Act & Assert
      const result = await createAirwallexPaymentIntent({
        ...baseParams,
        quoteIds: [],
        supabaseAdmin: mockSupabaseClient,
      });

      expect(result).toEqual({
        success: false,
        error: 'No quote IDs provided',
      });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle unsupported currency', async () => {
      // Act & Assert
      const result = await createAirwallexPaymentIntent({
        ...baseParams,
        currency: 'XXX', // Unsupported currency
        supabaseAdmin: mockSupabaseClient,
      });

      expect(result).toEqual({
        success: false,
        error: 'Currency XXX is not supported by Airwallex',
      });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle Airwallex API error', async () => {
      // Arrange - Mock authentication failure
      const mockFetch = vi.fn();
      global.fetch = mockFetch;

      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve('{"message":"Access token required","code":"unauthorized"}'),
        headers: new Headers(),
      } as Response);

      // Act
      const result = await createAirwallexPaymentIntent({
        ...baseParams,
        supabaseAdmin: mockSupabaseClient,
      });

      // Assert
      expect(result).toEqual({
        success: false,
        error: expect.stringContaining('Airwallex API error'),
      });
    });

    it('should handle Airwallex API error object', async () => {
      // Arrange - Mock authentication success but payment creation failure
      const mockFetch = vi.fn();
      global.fetch = mockFetch;

      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/authentication/login')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                token: 'mock_access_token_123',
                expires_at: '2024-12-31T23:59:59Z',
              }),
            headers: new Headers(),
          } as Response);
        }

        if (url.includes('/payment_intents/create')) {
          return Promise.resolve({
            ok: false,
            status: 400,
            text: () =>
              Promise.resolve(
                '{"message":"Payment intent creation failed","code":"payment_intent_error"}',
              ),
            headers: new Headers(),
          } as Response);
        }

        return Promise.reject(new Error(`Unmocked fetch: ${url}`));
      });

      // Act
      const result = await createAirwallexPaymentIntent({
        ...baseParams,
        supabaseAdmin: mockSupabaseClient,
      });

      // Assert
      expect(result).toEqual({
        success: false,
        error: expect.stringContaining('Payment intent creation failed'),
      });
    });

    it('should construct correct request payload', async () => {
      // Act
      await createAirwallexPaymentIntent({
        ...baseParams,
        supabaseAdmin: mockSupabaseClient,
      });

      // Assert - Check the request body sent to fetch
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api-demo.airwallex.com/api/v1/pa/payment_intents/create',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock_access_token_123',
            'x-api-version': '2024-06-14',
          }),
          body: expect.any(String),
        }),
      );

      // Parse and check the request body
      const fetchCalls = (global.fetch as any).mock.calls;
      const paymentIntentCall = fetchCalls.find((call: any[]) =>
        call[0].includes('/payment_intents/create'),
      );
      expect(paymentIntentCall).toBeDefined();

      const requestBody = JSON.parse(paymentIntentCall[1].body);

      // Check amount formatting
      expect(requestBody.amount).toBe(10050); // $100.50 -> 10050 cents
      expect(requestBody.currency).toBe('USD');

      // Check customer details
      expect(requestBody.customer).toEqual({
        email: 'john@example.com',
        first_name: 'John',
        last_name: 'Doe',
        phone_number: '+1234567890',
        address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          postcode: '10001',
          country_code: 'US',
        },
      });

      // Check metadata
      expect(requestBody.metadata).toEqual({
        quote_ids: 'quote_123,quote_456',
        user_id: 'user_789',
        quotes_count: '2',
        total_items: '3', // 2 + 1 = 3 items total
      });

      // Check other fields
      expect(requestBody.description).toBe('Payment for 2 item(s) - Order: quote_123, quote_456');
      expect(requestBody.merchant_order_id).toBe('quote_123');
      expect(requestBody.return_url).toBe('https://test.whyteclub.com/payment/complete');
      expect(requestBody.request_id).toMatch(/^user_789_\d+_[a-z0-9]+$/);
    });

    it('should handle payment intent without next_action URL', async () => {
      // Arrange - Override fetch mock for this test
      const mockFetch = vi.fn();
      global.fetch = mockFetch;

      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/authentication/login')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                token: 'mock_access_token_123',
                expires_at: '2024-12-31T23:59:59Z',
              }),
            headers: new Headers(),
          } as Response);
        }

        if (url.includes('/payment_intents/create')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                id: 'pi_test_no_action',
                client_secret: 'secret_no_action',
                amount: 10050,
                currency: 'USD',
                status: 'requires_payment_method',
                created_at: '2024-01-15T10:00:00Z',
                merchant_order_id: 'quote_123',
                // No next_action property
              }),
            headers: new Headers(),
          } as Response);
        }

        return Promise.reject(new Error(`Unmocked fetch: ${url}`));
      });

      // Act
      const result = await createAirwallexPaymentIntent({
        ...baseParams,
        supabaseAdmin: mockSupabaseClient,
      });

      // Assert - For Airwallex HPP, confirmationUrl is null (handled on frontend)
      expect(result.confirmationUrl).toBe(null);
      expect(result.airwallexData?.intent_id).toBe('pi_test_no_action');
    });

    it('should handle database insert failure gracefully', async () => {
      // Arrange - Mock database insert failure
      mockInsert.mockReturnValue(Promise.resolve({ error: new Error('Database error') }));

      // Act
      const result = await createAirwallexPaymentIntent({
        ...baseParams,
        supabaseAdmin: mockSupabaseClient,
      });

      // Assert - Should still return success since payment intent was created
      expect(result).toEqual({
        success: true,
        client_secret: 'pi_test_123_secret_abc',
        transactionId: 'airwallex_pi_test_123',
        paymentIntentId: 'pi_test_123',
        confirmationUrl: null,
        airwallexData: {
          intent_id: 'pi_test_123',
          client_secret: 'pi_test_123_secret_abc',
          currency: 'USD',
          amount: 10050,
          env: 'demo',
        },
      });
    });

    it('should handle minimal customer info', async () => {
      // Act
      await createAirwallexPaymentIntent({
        ...baseParams,
        customerInfo: undefined, // No customer info
        supabaseAdmin: mockSupabaseClient,
      });

      // Assert - Check the request body
      const fetchCalls = (global.fetch as any).mock.calls;
      const paymentIntentCall = fetchCalls.find((call: any[]) =>
        call[0].includes('/payment_intents/create'),
      );
      expect(paymentIntentCall).toBeDefined();

      const requestBody = JSON.parse(paymentIntentCall[1].body);
      expect(requestBody.customer).toBeUndefined();
    });
  });

  describe('formatAmountForAirwallex', () => {
    it('should format USD correctly (2 decimal places)', () => {
      expect(formatAmountForAirwallex(100.5, 'USD')).toBe(10050);
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
