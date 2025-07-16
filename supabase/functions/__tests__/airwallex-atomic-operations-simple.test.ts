import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('airwallex-atomic-operations types and structure', () => {
  it('should export all required functions', async () => {
    const module = await import('../airwallex-webhook/atomic-operations.ts');
    
    expect(typeof module.processPaymentIntentSucceeded).toBe('function');
    expect(typeof module.processPaymentIntentFailed).toBe('function');
    expect(typeof module.processRefundSucceeded).toBe('function');
    expect(typeof module.processRefundFailed).toBe('function');
    expect(typeof module.processDisputeCreated).toBe('function');
    expect(typeof module.processDisputeUpdated).toBe('function');
  });

  it('should handle function calls without crashing', async () => {
    const { processPaymentIntentSucceeded } = await import('../airwallex-webhook/atomic-operations.ts');
    
    // Create a minimal mock that won't cause chain errors
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: [], error: null })
          })
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null })
        })
      })
    } as any;

    const mockPaymentIntent = {
      id: 'pi_test_123',
      amount: 10000,
      currency: 'USD',
      status: 'succeeded',
      metadata: {},
      created_at: '2024-01-15T10:00:00Z'
    };

    const result = await processPaymentIntentSucceeded(mockSupabase, mockPaymentIntent);
    
    // Should return a result object with success property
    expect(typeof result).toBe('object');
    expect(typeof result.success).toBe('boolean');
  });

  it('should handle missing metadata gracefully', async () => {
    const { processPaymentIntentSucceeded } = await import('../airwallex-webhook/atomic-operations.ts');
    
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: [], error: null })
          })
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null })
        })
      })
    } as any;

    const mockPaymentIntent = {
      id: 'pi_test_no_metadata',
      amount: 5000,
      currency: 'USD',
      status: 'succeeded',
      created_at: '2024-01-15T10:00:00Z'
      // No metadata property
    };

    const result = await processPaymentIntentSucceeded(mockSupabase, mockPaymentIntent);
    
    expect(typeof result).toBe('object');
    expect(typeof result.success).toBe('boolean');
  });

  it('should validate refund processing structure', async () => {
    const { processRefundSucceeded } = await import('../airwallex-webhook/atomic-operations.ts');
    
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null })
          })
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null })
        })
      })
    } as any;

    const mockRefund = {
      id: 'ref_test_123',
      payment_intent_id: 'pi_test_123',
      amount: 5000,
      currency: 'USD',
      status: 'succeeded',
      created_at: '2024-01-16T10:00:00Z'
    };

    const result = await processRefundSucceeded(mockSupabase, mockRefund);
    
    expect(typeof result).toBe('object');
    expect(typeof result.success).toBe('boolean');
  });

  it('should validate dispute processing structure', async () => {
    const { processDisputeCreated } = await import('../airwallex-webhook/atomic-operations.ts');
    
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null })
          })
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null })
        })
      })
    } as any;

    const mockDispute = {
      id: 'disp_test_123',
      payment_intent_id: 'pi_test_123',
      amount: 10000,
      currency: 'USD',
      status: 'needs_response',
      reason: 'fraudulent',
      created_at: '2024-01-16T10:00:00Z'
    };

    const result = await processDisputeCreated(mockSupabase, mockDispute);
    
    expect(typeof result).toBe('object');
    expect(typeof result.success).toBe('boolean');
  });
});