import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useStatusTransitions } from '../useStatusTransitions';
import { useStatusManagement } from '../useStatusManagement';
import { supabase } from '@/integrations/supabase/client';
import React from 'react';

// Mock dependencies
vi.mock('../useStatusManagement');
vi.mock('../useEmailSettings');
vi.mock('@/components/ui/use-toast');
vi.mock('@/integrations/supabase/client');

// Mock status configuration data
const mockStatusConfigs = {
  quote: [
    {
      id: 'pending',
      name: 'pending',
      label: 'Pending',
      description: 'Quote is pending review',
      color: 'secondary' as const,
      icon: 'clock',
      isActive: true,
      order: 1,
      allowedTransitions: ['sent', 'calculated'],
      isTerminal: false,
      category: 'quote' as const,
    },
    {
      id: 'sent',
      name: 'sent',
      label: 'Sent',
      description: 'Quote has been sent to customer',
      color: 'default' as const,
      icon: 'send',
      isActive: true,
      order: 2,
      allowedTransitions: ['approved', 'rejected', 'expired'],
      isTerminal: false,
      category: 'quote' as const,
    },
    {
      id: 'approved',
      name: 'approved',
      label: 'Approved',
      description: 'Quote has been approved by customer',
      color: 'default' as const,
      icon: 'check',
      isActive: true,
      order: 3,
      allowedTransitions: ['paid'],
      isTerminal: false,
      category: 'quote' as const,
    },
    {
      id: 'rejected',
      name: 'rejected',
      label: 'Rejected',
      description: 'Quote has been rejected',
      color: 'destructive' as const,
      icon: 'x',
      isActive: true,
      order: 4,
      allowedTransitions: ['approved', 'sent'], // Can return to approved
      isTerminal: false,
      category: 'quote' as const,
    },
    {
      id: 'paid',
      name: 'paid',
      label: 'Paid',
      description: 'Payment has been received',
      color: 'default' as const,
      icon: 'check-circle',
      isActive: true,
      order: 5,
      allowedTransitions: ['ordered'],
      isTerminal: false,
      category: 'quote' as const,
    },
    {
      id: 'ordered',
      name: 'ordered',
      label: 'Ordered',
      description: 'Order has been placed',
      color: 'default' as const,
      icon: 'package',
      isActive: true,
      order: 6,
      allowedTransitions: ['shipped'],
      isTerminal: false,
      category: 'quote' as const,
    },
    {
      id: 'shipped',
      name: 'shipped',
      label: 'Shipped',
      description: 'Order has been shipped',
      color: 'default' as const,
      icon: 'truck',
      isActive: true,
      order: 7,
      allowedTransitions: ['completed'],
      isTerminal: false,
      category: 'quote' as const,
    },
    {
      id: 'completed',
      name: 'completed',
      label: 'Completed',
      description: 'Order has been completed',
      color: 'default' as const,
      icon: 'check-circle',
      isActive: true,
      order: 8,
      allowedTransitions: [],
      isTerminal: true,
      category: 'quote' as const,
    },
  ],
};

// Mock transition validation logic
const isValidTransition = (fromStatus: string, toStatus: string, category: 'quote' | 'order'): boolean => {
  const statuses = mockStatusConfigs.quote;
  const currentConfig = statuses.find(s => s.name === fromStatus);
  if (!currentConfig || !currentConfig.isActive) return false;
  return currentConfig.allowedTransitions.includes(toStatus);
};

const getStatusConfig = (statusName: string, category: 'quote' | 'order') => {
  const statuses = mockStatusConfigs.quote;
  return statuses.find(s => s.name === statusName) || null;
};

// Test wrapper component
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useStatusTransitions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    vi.mocked(useStatusManagement).mockReturnValue({
      isValidTransition,
      getStatusConfig,
      statuses: mockStatusConfigs.quote,
      quoteStatuses: mockStatusConfigs.quote,
      orderStatuses: [],
      isLoading: false,
      error: null,
      lastUpdated: Date.now(),
      getAllowedTransitions: vi.fn(),
      saveStatusSettings: vi.fn(),
      handleStatusChange: vi.fn(),
      getDefaultQuoteStatus: vi.fn().mockReturnValue('pending'),
      getStatusesForQuotesList: vi.fn(),
      getStatusesForOrdersList: vi.fn(),
      canQuoteBePaid: vi.fn(),
      shouldTriggerEmail: vi.fn(),
      getEmailTemplate: vi.fn(),
      requiresAdminAction: vi.fn(),
      refreshData: vi.fn(),
      findBankTransferPendingStatus: vi.fn(),
      findCODProcessingStatus: vi.fn(),
      findDefaultOrderStatus: vi.fn(),
      findStatusForPaymentMethod: vi.fn(),
    });

    // Mock toast
    const mockToast = vi.fn();
    vi.doMock('@/components/ui/use-toast', () => ({
      useToast: () => ({ toast: mockToast }),
    }));

    // Mock email settings
    vi.doMock('../useEmailSettings', () => ({
      useEmailSettings: () => ({
        shouldSendEmail: vi.fn().mockReturnValue(true),
      }),
    }));

    // Setup Supabase mocks
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { email: 'test@example.com', display_id: 'Q123', product_name: 'Test Product', final_total_usd: 100 },
          error: null,
        }),
      }),
    });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'quotes') {
        return { update: mockUpdate, select: mockSelect } as any;
      }
      if (table === 'status_transitions') {
        return { insert: mockInsert } as any;
      }
      if (table === 'email_templates') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              ilike: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'No template found' },
                }),
              }),
            }),
          }),
        } as any;
      }
      return { update: mockUpdate, select: mockSelect, insert: mockInsert } as any;
    });

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    } as any);

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
      error: null,
    } as any);

    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Valid Transitions', () => {
    it('should successfully transition from approved to paid', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useStatusTransitions(), { wrapper });

      await waitFor(async () => {
        const response = await result.current.transitionStatus({
          quoteId: 'test-quote-123',
          fromStatus: 'approved',
          toStatus: 'paid',
          trigger: 'payment_received',
        });
        expect(response.success).toBe(true);
        expect(response.newStatus).toBe('paid');
      });

      // Verify database update was called
      expect(supabase.from).toHaveBeenCalledWith('quotes');
    });

    it('should successfully transition from pending to sent', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useStatusTransitions(), { wrapper });

      await waitFor(async () => {
        const response = await result.current.transitionStatus({
          quoteId: 'test-quote-456',
          fromStatus: 'pending',
          toStatus: 'sent',
          trigger: 'quote_sent',
        });
        expect(response.success).toBe(true);
        expect(response.newStatus).toBe('sent');
      });
    });

    it('should successfully transition from sent to approved', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useStatusTransitions(), { wrapper });

      await waitFor(async () => {
        const response = await result.current.transitionStatus({
          quoteId: 'test-quote-789',
          fromStatus: 'sent',
          toStatus: 'approved',
          trigger: 'manual',
        });
        expect(response.success).toBe(true);
        expect(response.newStatus).toBe('approved');
      });
    });
  });

  describe('Invalid Transitions', () => {
    it('should reject transition from pending to shipped (skipping steps)', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useStatusTransitions(), { wrapper });

      await expect(
        result.current.transitionStatus({
          quoteId: 'test-quote-invalid',
          fromStatus: 'pending',
          toStatus: 'shipped',
          trigger: 'manual',
        })
      ).rejects.toThrow('Invalid status transition from "pending" to "shipped"');
    });

    it('should reject transition from paid to rejected (backwards flow)', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useStatusTransitions(), { wrapper });

      await expect(
        result.current.transitionStatus({
          quoteId: 'test-quote-invalid2',
          fromStatus: 'paid',
          toStatus: 'rejected',
          trigger: 'manual',
        })
      ).rejects.toThrow('Invalid status transition from "paid" to "rejected"');
    });

    it('should reject transition from completed to any status (terminal state)', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useStatusTransitions(), { wrapper });

      await expect(
        result.current.transitionStatus({
          quoteId: 'test-quote-terminal',
          fromStatus: 'completed',
          toStatus: 'shipped',
          trigger: 'manual',
        })
      ).rejects.toThrow('Invalid status transition from "completed" to "shipped"');
    });
  });

  describe('Rejection Flow', () => {
    it('should allow rejected quote to return to approved', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useStatusTransitions(), { wrapper });

      await waitFor(async () => {
        const response = await result.current.transitionStatus({
          quoteId: 'test-quote-recovery',
          fromStatus: 'rejected',
          toStatus: 'approved',
          trigger: 'manual',
        });
        expect(response.success).toBe(true);
        expect(response.newStatus).toBe('approved');
      });
    });

    it('should allow rejected quote to return to sent', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useStatusTransitions(), { wrapper });

      await waitFor(async () => {
        const response = await result.current.transitionStatus({
          quoteId: 'test-quote-resend',
          fromStatus: 'rejected',
          toStatus: 'sent',
          trigger: 'quote_sent',
        });
        expect(response.success).toBe(true);
        expect(response.newStatus).toBe('sent');
      });
    });
  });

  describe('Automatic Transition Handlers', () => {
    it('should handle payment received for approved quote', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useStatusTransitions(), { wrapper });

      await waitFor(async () => {
        await result.current.handlePaymentReceived('test-quote-payment', 'approved');
      });

      expect(supabase.from).toHaveBeenCalledWith('quotes');
    });

    it('should not handle payment received for non-approved quote', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useStatusTransitions(), { wrapper });

      // Mock the update to track if it was called
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { email: 'test@example.com' },
              error: null,
            }),
          }),
        }),
      } as any);

      await result.current.handlePaymentReceived('test-quote-wrong-status', 'pending');

      // Should not attempt to transition
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should handle quote sent for pending quote', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useStatusTransitions(), { wrapper });

      await waitFor(async () => {
        await result.current.handleQuoteSent('test-quote-send', 'pending');
      });

      expect(supabase.from).toHaveBeenCalledWith('quotes');
    });

    it('should handle order shipped for ordered quote', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useStatusTransitions(), { wrapper });

      await waitFor(async () => {
        await result.current.handleOrderShipped('test-quote-ship', 'ordered');
      });

      expect(supabase.from).toHaveBeenCalledWith('quotes');
    });

    it('should handle quote expiration for sent quote', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useStatusTransitions(), { wrapper });

      await waitFor(async () => {
        await result.current.handleQuoteExpired('test-quote-expire', 'sent');
      });

      expect(supabase.from).toHaveBeenCalledWith('quotes');
    });

    it('should handle auto calculation for pending quote', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useStatusTransitions(), { wrapper });

      await waitFor(async () => {
        await result.current.handleAutoCalculation('test-quote-calc', 'pending');
      });

      expect(supabase.from).toHaveBeenCalledWith('quotes');
    });
  });

  describe('Status Transition Logging', () => {
    it('should log status transitions to database', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useStatusTransitions(), { wrapper });

      await waitFor(async () => {
        await result.current.transitionStatus({
          quoteId: 'test-quote-logging',
          fromStatus: 'approved',
          toStatus: 'paid',
          trigger: 'payment_received',
          metadata: { payment_method: 'stripe' },
        });
      });

      // Should have called status_transitions insert
      expect(supabase.from).toHaveBeenCalledWith('status_transitions');
    });

    it('should continue with transition even if logging fails', async () => {
      // Mock logging to fail
      const mockInsertFail = vi.fn().mockRejectedValue(new Error('Logging failed'));
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'status_transitions') {
          return { insert: mockInsertFail } as any;
        }
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { email: 'test@example.com' },
                error: null,
              }),
            }),
          }),
        } as any;
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useStatusTransitions(), { wrapper });

      // Should still succeed despite logging failure
      await waitFor(async () => {
        const response = await result.current.transitionStatus({
          quoteId: 'test-quote-log-fail',
          fromStatus: 'approved',
          toStatus: 'paid',
          trigger: 'payment_received',
        });
        expect(response.success).toBe(true);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database update errors gracefully', async () => {
      // Mock update to fail
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: { message: 'Database error' } }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useStatusTransitions(), { wrapper });

      await expect(
        result.current.transitionStatus({
          quoteId: 'test-quote-db-error',
          fromStatus: 'approved',
          toStatus: 'paid',
          trigger: 'payment_received',
        })
      ).rejects.toThrow('Database error');
    });

    it('should handle missing quote data gracefully', async () => {
      // Mock select to return null
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Quote not found' },
          }),
        }),
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'quotes') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
            select: mockSelect,
          } as any;
        }
        return { insert: vi.fn().mockResolvedValue({ error: null }) } as any;
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useStatusTransitions(), { wrapper });

      // Should complete transition but not send notification
      await waitFor(async () => {
        const response = await result.current.transitionStatus({
          quoteId: 'test-quote-missing',
          fromStatus: 'approved',
          toStatus: 'paid',
          trigger: 'payment_received',
        });
        expect(response.success).toBe(true);
      });

      // Functions invoke should not be called due to missing quote
      expect(supabase.functions.invoke).not.toHaveBeenCalled();
    });
  });
});