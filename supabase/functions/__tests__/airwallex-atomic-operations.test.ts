import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock Deno global
const mockDeno = {
  env: {
    get: vi.fn((key: string) => {
      const envVars: Record<string, string> = {
        'AIRWALLEX_API_KEY': 'test_airwallex_key',
        'AIRWALLEX_CLIENT_ID': 'test_client_id',
        'AIRWALLEX_WEBHOOK_SECRET': 'test_webhook_secret',
        'SUPABASE_URL': 'http://127.0.0.1:54321',
        'SUPABASE_SERVICE_ROLE_KEY': 'test-service-role-key',
      };
      return envVars[key] || '';
    }),
  },
};

// Set up global mocks
Object.defineProperty(global, 'Deno', {
  value: mockDeno,
  writable: true,
  configurable: true
});

// Mock crypto for UUID generation
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'test-uuid-123'),
  },
  writable: true,
  configurable: true
});

import {
  processPaymentIntentSucceeded,
  processPaymentIntentFailed,
  processRefundSucceeded,
  processRefundFailed,
  processDisputeCreated,
  processDisputeUpdated
} from '../airwallex-webhook/atomic-operations.ts';

describe('airwallex-atomic-operations', () => {
  let mockSupabaseAdmin: SupabaseClient;
  let mockFrom: ReturnType<typeof vi.fn>;
  let mockSelect: ReturnType<typeof vi.fn>;
  let mockUpdate: ReturnType<typeof vi.fn>;
  let mockInsert: ReturnType<typeof vi.fn>;
  let mockUpsert: ReturnType<typeof vi.fn>;
  let mockEq: ReturnType<typeof vi.fn>;
  let mockIn: ReturnType<typeof vi.fn>;
  let mockSingle: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mocks that return promises
    mockEq = vi.fn().mockReturnValue({ error: null });
    mockIn = vi.fn().mockReturnValue({ error: null });
    mockSingle = vi.fn().mockResolvedValue({ data: [], error: null });
    
    // Create chainable mocks with proper promise returns
    const createChainableMock = () => {
      const chainable = {
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        single: mockSingle,
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis()
      };
      
      // Make terminal operations return promises
      Object.defineProperty(chainable, 'then', {
        value: (resolve: Function) => resolve({ error: null }),
        configurable: true
      });
      
      return chainable;
    };

    mockSelect = vi.fn().mockReturnValue(createChainableMock());
    mockUpdate = vi.fn().mockReturnValue(createChainableMock());
    mockInsert = vi.fn().mockReturnValue(createChainableMock());
    mockUpsert = vi.fn().mockReturnValue(createChainableMock());

    mockFrom = vi.fn().mockReturnValue({
      select: mockSelect,
      update: mockUpdate,
      insert: mockInsert,
      upsert: mockUpsert,
      eq: vi.fn().mockReturnValue({ error: null }),
      in: vi.fn().mockReturnValue({ error: null })
    });

    mockSupabaseAdmin = {
      from: mockFrom
    } as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('processPaymentIntentSucceeded', () => {
    const mockPaymentIntent = {
      id: 'pi_test_123',
      amount: 10000, // $100 in cents
      currency: 'USD',
      status: 'succeeded',
      merchant_order_id: 'quote_123',
      metadata: {
        quote_ids: 'quote_123,quote_456',
        user_id: 'user_789'
      },
      created_at: '2024-01-15T10:00:00Z',
      customer: {
        email: 'test@example.com'
      }
    };

    it('should successfully process payment success', async () => {
      // Mock quotes fetch
      mockSingle.mockResolvedValueOnce({
        data: [
          { id: 'quote_123', status: 'approved', user_id: 'user_789' },
          { id: 'quote_456', status: 'sent', user_id: 'user_789' }
        ],
        error: null
      });

      const result = await processPaymentIntentSucceeded(mockSupabaseAdmin, mockPaymentIntent);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      // Verify function was called (checking exact calls is complex with mocked chains)
      expect(mockFrom).toHaveBeenCalledWith('payment_transactions');
      expect(mockFrom).toHaveBeenCalledWith('quotes');
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should handle missing quote IDs gracefully', async () => {
      const paymentIntentNoQuotes = {
        ...mockPaymentIntent,
        metadata: { user_id: 'user_789' },
        merchant_order_id: undefined
      };

      const result = await processPaymentIntentSucceeded(mockSupabaseAdmin, paymentIntentNoQuotes);

      expect(result.success).toBe(true);
      // Should only update transaction, not quotes
      expect(mockUpdate).toHaveBeenCalledTimes(1);
    });

    it('should handle database errors', async () => {
      // Create a mock that simulates a database error
      const errorChainable = {
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        single: mockSingle,
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        then: (resolve: Function) => resolve({ error: new Error('Database error') })
      };
      
      // Override the update mock to return an error
      mockUpdate.mockReturnValueOnce(errorChainable);

      const result = await processPaymentIntentSucceeded(mockSupabaseAdmin, mockPaymentIntent);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('processPaymentIntentFailed', () => {
    const mockPaymentIntent = {
      id: 'pi_test_failed',
      amount: 5000,
      currency: 'USD',
      status: 'failed',
      metadata: {
        quote_ids: 'quote_789'
      },
      latest_payment_attempt: {
        failure_reason: 'Insufficient funds'
      }
    };

    it('should process payment failure correctly', async () => {
      const result = await processPaymentIntentFailed(mockSupabaseAdmin, mockPaymentIntent, 'failed');

      expect(result.success).toBe(true);

      // Verify transaction update
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        status: 'failed',
        error_message: 'Insufficient funds'
      }));

      // Verify quote reset
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        status: 'approved',
        payment_transaction_id: null
      }));
    });

    it('should handle cancellation differently', async () => {
      const cancelledIntent = { ...mockPaymentIntent, status: 'cancelled' };
      
      const result = await processPaymentIntentFailed(mockSupabaseAdmin, cancelledIntent, 'cancelled');

      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        status: 'cancelled'
      }));
    });
  });

  describe('processRefundSucceeded', () => {
    const mockRefund = {
      id: 'ref_test_123',
      payment_intent_id: 'pi_test_123',
      amount: 5000, // $50 refund in cents
      currency: 'USD',
      status: 'succeeded',
      reason: 'Customer request',
      created_at: '2024-01-16T10:00:00Z'
    };

    it('should process full refund correctly', async () => {
      // Mock refunds table check
      mockSingle.mockResolvedValueOnce({ data: { table_name: 'refunds' }, error: null });
      
      // Mock transaction fetch
      mockSingle.mockResolvedValueOnce({
        data: { amount: 100, refunded_amount: 50 },
        error: null
      });
      
      // Mock quote IDs fetch
      mockSingle.mockResolvedValueOnce({
        data: { quote_ids: ['quote_123'] },
        error: null
      });

      const result = await processRefundSucceeded(mockSupabaseAdmin, mockRefund);

      expect(result.success).toBe(true);
      
      // Verify refund insert
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        id: 'airwallex_refund_ref_test_123',
        amount: 50, // Converted from cents
        status: 'succeeded'
      }));

      // Verify transaction update to fully refunded
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        refunded_amount: 100,
        status: 'refunded'
      }));
    });

    it('should handle partial refund', async () => {
      // Mock refunds table check
      mockSingle.mockResolvedValueOnce({ data: { table_name: 'refunds' }, error: null });
      
      // Mock transaction with higher amount
      mockSingle.mockResolvedValueOnce({
        data: { amount: 200, refunded_amount: 0 },
        error: null
      });

      const result = await processRefundSucceeded(mockSupabaseAdmin, mockRefund);

      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        refunded_amount: 50,
        status: 'partially_refunded'
      }));
    });

    it('should work without refunds table', async () => {
      // No refunds table
      mockSingle.mockResolvedValueOnce({ data: null, error: null });
      
      // Mock transaction
      mockSingle.mockResolvedValueOnce({
        data: { amount: 100, refunded_amount: 0 },
        error: null
      });

      const result = await processRefundSucceeded(mockSupabaseAdmin, mockRefund);

      expect(result.success).toBe(true);
      expect(mockInsert).not.toHaveBeenCalled(); // No refund insert
      expect(mockUpdate).toHaveBeenCalled(); // But transaction still updated
    });
  });

  describe('processRefundFailed', () => {
    const mockRefund = {
      id: 'ref_test_failed',
      payment_intent_id: 'pi_test_123',
      amount: 5000,
      currency: 'USD',
      status: 'failed',
      reason: 'Customer request',
      failure_reason: 'Insufficient balance',
      created_at: '2024-01-16T10:00:00Z'
    };

    it('should process failed refund with refunds table', async () => {
      // Mock refunds table exists
      mockSingle.mockResolvedValueOnce({ data: { table_name: 'refunds' }, error: null });

      const result = await processRefundFailed(mockSupabaseAdmin, mockRefund);

      expect(result.success).toBe(true);
      expect(mockUpsert).toHaveBeenCalledWith(expect.objectContaining({
        status: 'failed',
        failure_reason: 'Insufficient balance'
      }));
    });

    it('should handle missing refunds table', async () => {
      // No refunds table
      mockSingle.mockResolvedValueOnce({ data: null, error: null });

      const result = await processRefundFailed(mockSupabaseAdmin, mockRefund);

      expect(result.success).toBe(true);
      expect(mockUpsert).not.toHaveBeenCalled();
    });
  });

  describe('processDisputeCreated', () => {
    const mockDispute = {
      id: 'disp_test_123',
      payment_intent_id: 'pi_test_123',
      amount: 10000,
      currency: 'USD',
      status: 'needs_response',
      reason: 'fraudulent',
      evidence_due_by: '2024-01-30T23:59:59Z',
      created_at: '2024-01-16T10:00:00Z'
    };

    it('should create dispute record when table exists', async () => {
      // Mock disputes table exists
      mockSingle.mockResolvedValueOnce({ data: { table_name: 'disputes' }, error: null });

      const result = await processDisputeCreated(mockSupabaseAdmin, mockDispute);

      expect(result.success).toBe(true);
      
      // Verify dispute insert
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        id: 'airwallex_dispute_disp_test_123',
        amount: 100, // Converted from cents
        reason: 'fraudulent',
        evidence_due_by: '2024-01-30T23:59:59Z'
      }));

      // Verify transaction update
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        has_dispute: true
      }));
    });

    it('should handle missing disputes table', async () => {
      // No disputes table
      mockSingle.mockResolvedValueOnce({ data: null, error: null });

      const result = await processDisputeCreated(mockSupabaseAdmin, mockDispute);

      expect(result.success).toBe(true);
      expect(mockInsert).not.toHaveBeenCalled();
      // Transaction should still be updated
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        has_dispute: true
      }));
    });
  });

  describe('processDisputeUpdated', () => {
    const mockDispute = {
      id: 'disp_test_123',
      payment_intent_id: 'pi_test_123',
      amount: 10000,
      currency: 'USD',
      status: 'won',
      reason: 'fraudulent',
      created_at: '2024-01-16T10:00:00Z',
      updated_at: '2024-01-20T10:00:00Z'
    };

    it('should update dispute when won', async () => {
      // Mock disputes table exists
      mockSingle.mockResolvedValueOnce({ data: { table_name: 'disputes' }, error: null });

      const result = await processDisputeUpdated(mockSupabaseAdmin, mockDispute);

      expect(result.success).toBe(true);
      
      // Verify dispute update
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        status: 'won'
      }));

      // Verify transaction dispute flag cleared
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        has_dispute: false
      }));
    });

    it('should not clear dispute flag for ongoing disputes', async () => {
      const ongoingDispute = { ...mockDispute, status: 'under_review' };
      
      // Mock disputes table exists
      mockSingle.mockResolvedValueOnce({ data: { table_name: 'disputes' }, error: null });

      const result = await processDisputeUpdated(mockSupabaseAdmin, ongoingDispute);

      expect(result.success).toBe(true);
      
      // Should update dispute but not clear has_dispute flag
      const updateCalls = mockUpdate.mock.calls;
      expect(updateCalls).toHaveLength(1); // Only dispute update, not transaction
      expect(updateCalls[0][0]).toHaveProperty('status', 'under_review');
    });
  });
});