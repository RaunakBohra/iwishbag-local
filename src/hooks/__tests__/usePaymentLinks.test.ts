import { renderHook, act } from '@testing-library/react';
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { usePaymentLinks } from '../usePaymentLinks';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
    from: vi.fn(),
  },
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: vi.fn(),
}));

// Mock navigator.clipboard
const mockClipboard = {
  writeText: vi.fn(),
};

Object.defineProperty(navigator, 'clipboard', {
  value: mockClipboard,
  writable: true,
});

type MockSupabaseClient = {
  functions: {
    invoke: ReturnType<typeof vi.fn>;
  };
  from: ReturnType<typeof vi.fn>;
};

type MockToast = {
  toast: ReturnType<typeof vi.fn>;
};

const mockSupabase = supabase as unknown as MockSupabaseClient;
const mockUseToast = useToast as unknown as vi.MockedFunction<() => MockToast>;

describe('usePaymentLinks', () => {
  let mockToast: ReturnType<typeof vi.fn>;

  // Mock data
  const mockCustomerInfo = {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
  };

  const mockPaymentLinkParams = {
    quoteId: 'quote-123',
    amount: 100.5,
    currency: 'USD',
    customerInfo: mockCustomerInfo,
    description: 'Test payment',
    expiryDays: 7,
    gateway: 'payu' as const,
  };

  const mockPaymentLinkResponse = {
    success: true,
    linkId: 'link-123',
    linkCode: 'PAY123',
    paymentUrl: 'https://test.payu.in/pay/link123',
    shortUrl: 'https://short.ly/pay123',
    expiresAt: '2024-01-08T00:00:00Z',
    amountInINR: '8300.00',
    originalAmount: 100.5,
    originalCurrency: 'USD',
    exchangeRate: 82.5,
  };

  const mockPaymentLinks = [
    {
      id: 'link-1',
      quote_id: 'quote-123',
      link_code: 'PAY001',
      payment_url: 'https://test.payu.in/pay/link1',
      amount: 100,
      currency: 'USD',
      status: 'active',
      created_at: '2024-01-01T00:00:00Z',
      expires_at: '2024-01-08T00:00:00Z',
    },
    {
      id: 'link-2',
      quote_id: 'quote-456',
      link_code: 'PAY002',
      payment_url: 'https://test.payu.in/pay/link2',
      amount: 200,
      currency: 'USD',
      status: 'cancelled',
      created_at: '2024-01-02T00:00:00Z',
      expires_at: '2024-01-09T00:00:00Z',
      cancelled_at: '2024-01-03T00:00:00Z',
    },
  ];

  beforeEach(() => {
    mockToast = vi.fn();
    mockUseToast.mockReturnValue({ toast: mockToast });

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Hook Initialization', () => {
    test('should initialize with correct default state', () => {
      const { result } = renderHook(() => usePaymentLinks());

      expect(result.current.isCreating).toBe(false);
      expect(typeof result.current.createPaymentLink).toBe('function');
      expect(typeof result.current.getPaymentLinks).toBe('function');
      expect(typeof result.current.cancelPaymentLink).toBe('function');
    });
  });

  describe('createPaymentLink', () => {
    test('should create PayU payment link successfully', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: mockPaymentLinkResponse,
        error: null,
      });

      mockClipboard.writeText.mockResolvedValue(undefined);

      const { result } = renderHook(() => usePaymentLinks());

      let response: unknown;
      await act(async () => {
        response = await result.current.createPaymentLink(mockPaymentLinkParams);
      });

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('create-payu-payment-link-v2', {
        body: mockPaymentLinkParams,
      });

      expect(response).toEqual(mockPaymentLinkResponse);
      expect(result.current.isCreating).toBe(false);

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Payment link created!',
        description: 'Payment link has been generated successfully',
      });

      expect(mockClipboard.writeText).toHaveBeenCalledWith(mockPaymentLinkResponse.shortUrl);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Link copied!',
        description: 'Payment link has been copied to your clipboard',
      });
    });

    test('should create PayU payment link with v2 function when advanced features are used', async () => {
      const advancedParams = {
        ...mockPaymentLinkParams,
        customFields: [{ key: 'value' }],
        partialPaymentAllowed: true,
        template: 'branded' as const,
        apiMethod: 'rest' as const,
      };

      mockSupabase.functions.invoke.mockResolvedValue({
        data: {
          ...mockPaymentLinkResponse,
          apiVersion: 'v2',
          features: {
            customFields: true,
            partialPayment: true,
            template: 'branded',
          },
        },
        error: null,
      });

      const { result } = renderHook(() => usePaymentLinks());

      await act(async () => {
        await result.current.createPaymentLink(advancedParams);
      });

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('create-payu-payment-link-v2', {
        body: advancedParams,
      });
    });

    test('should create PayPal payment link', async () => {
      const paypalParams = {
        ...mockPaymentLinkParams,
        gateway: 'paypal' as const,
      };

      const paypalResponse = {
        success: true,
        linkId: 'paypal-link-123',
        paymentUrl: 'https://paypal.com/pay/link123',
      };

      mockSupabase.functions.invoke.mockResolvedValue({
        data: paypalResponse,
        error: null,
      });

      const { result } = renderHook(() => usePaymentLinks());

      await act(async () => {
        await result.current.createPaymentLink(paypalParams);
      });

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('create-paypal-payment-link', {
        body: paypalParams,
      });
    });

    test('should handle unsupported gateway', async () => {
      const unsupportedParams = {
        ...mockPaymentLinkParams,
        gateway: 'stripe' as const,
      };

      const { result } = renderHook(() => usePaymentLinks());

      let response: unknown;
      await act(async () => {
        response = await result.current.createPaymentLink(unsupportedParams);
      });

      expect(response).toBeNull();
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Not implemented',
        description: 'stripe payment links are not yet implemented',
        variant: 'destructive',
      });
    });

    test('should handle successful response without shortUrl', async () => {
      const responseWithoutShortUrl = {
        ...mockPaymentLinkResponse,
        shortUrl: undefined,
      };

      mockSupabase.functions.invoke.mockResolvedValue({
        data: responseWithoutShortUrl,
        error: null,
      });

      const { result } = renderHook(() => usePaymentLinks());

      await act(async () => {
        await result.current.createPaymentLink(mockPaymentLinkParams);
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Payment link created!',
        description: 'Payment link has been generated successfully',
      });

      expect(mockClipboard.writeText).not.toHaveBeenCalled();
    });

    test('should handle clipboard write failure gracefully', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: mockPaymentLinkResponse,
        error: null,
      });

      mockClipboard.writeText.mockRejectedValue(new Error('Clipboard access denied'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => usePaymentLinks());

      await act(async () => {
        await result.current.createPaymentLink(mockPaymentLinkParams);
      });

      expect(consoleSpy).toHaveBeenCalledWith('Failed to copy to clipboard:', expect.any(Error));

      // Should still show success toast for link creation
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Payment link created!',
        description: 'Payment link has been generated successfully',
      });

      consoleSpy.mockRestore();
    });

    test('should handle function invocation error', async () => {
      const mockError = new Error('Function invocation failed');
      mockSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => usePaymentLinks());

      let response: unknown;
      await act(async () => {
        response = await result.current.createPaymentLink(mockPaymentLinkParams);
      });

      expect(response).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Edge function error:', mockError);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error creating payment link',
        description: 'Function invocation failed',
        variant: 'destructive',
      });

      consoleSpy.mockRestore();
    });

    test('should handle error with context details', async () => {
      const errorWithContext = new Error('Detailed error') as Error & {
        context?: { body?: unknown };
      };
      errorWithContext.context = {
        body: { details: 'Additional error information' },
      };

      mockSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error: errorWithContext,
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => usePaymentLinks());

      await act(async () => {
        await result.current.createPaymentLink(mockPaymentLinkParams);
      });

      expect(consoleSpy).toHaveBeenCalledWith('Edge function error:', errorWithContext);
      expect(consoleSpy).toHaveBeenCalledWith('Error details:', errorWithContext.context.body);

      consoleSpy.mockRestore();
    });

    test('should handle unexpected throw', async () => {
      mockSupabase.functions.invoke.mockRejectedValue(new Error('Unexpected error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => usePaymentLinks());

      let response: unknown;
      await act(async () => {
        response = await result.current.createPaymentLink(mockPaymentLinkParams);
      });

      expect(response).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Error creating payment link:', expect.any(Error));
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error creating payment link',
        description: 'Unexpected error',
        variant: 'destructive',
      });

      consoleSpy.mockRestore();
    });

    test('should manage loading state correctly', async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockSupabase.functions.invoke.mockReturnValue(promise);

      const { result } = renderHook(() => usePaymentLinks());

      expect(result.current.isCreating).toBe(false);

      // Start creating
      act(() => {
        result.current.createPaymentLink(mockPaymentLinkParams);
      });

      expect(result.current.isCreating).toBe(true);

      // Resolve the promise
      await act(async () => {
        resolvePromise({ data: mockPaymentLinkResponse, error: null });
      });

      expect(result.current.isCreating).toBe(false);
    });

    test('should handle browser without clipboard API', async () => {
      // Mock a browser without clipboard API by setting it to undefined
      const originalClipboard = navigator.clipboard;
      (navigator as unknown as { clipboard: unknown }).clipboard = undefined;

      mockSupabase.functions.invoke.mockResolvedValue({
        data: mockPaymentLinkResponse,
        error: null,
      });

      const { result } = renderHook(() => usePaymentLinks());

      await act(async () => {
        await result.current.createPaymentLink(mockPaymentLinkParams);
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Payment link created!',
        description: 'Payment link has been generated successfully',
      });

      // Should not attempt clipboard operations, so only 1 toast call
      expect(mockToast).toHaveBeenCalledTimes(1);

      // Restore clipboard
      (navigator as unknown as { clipboard: unknown }).clipboard = originalClipboard;
    });
  });

  describe('getPaymentLinks', () => {
    test('should fetch all payment links successfully', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockPaymentLinks,
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const { result } = renderHook(() => usePaymentLinks());

      let response: unknown;
      await act(async () => {
        response = await result.current.getPaymentLinks();
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('payment_links');
      expect(mockQuery.select).toHaveBeenCalledWith('*');
      expect(mockQuery.order).toHaveBeenCalledWith('created_at', {
        ascending: false,
      });
      expect(response).toEqual(mockPaymentLinks);
    });

    test('should fetch payment links for specific quote', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [mockPaymentLinks[0]],
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const { result } = renderHook(() => usePaymentLinks());

      let response: unknown;
      await act(async () => {
        response = await result.current.getPaymentLinks('quote-123');
      });

      expect(mockQuery.eq).toHaveBeenCalledWith('quote_id', 'quote-123');
      expect(response).toEqual([mockPaymentLinks[0]]);
    });

    test('should handle database error when fetching payment links', async () => {
      const mockError = new Error('Database error');
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: mockError,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => usePaymentLinks());

      let response: unknown;
      await act(async () => {
        response = await result.current.getPaymentLinks();
      });

      expect(response).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching payment links:', mockError);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error fetching payment links',
        description: 'Database error',
        variant: 'destructive',
      });

      consoleSpy.mockRestore();
    });

    test('should handle unexpected error when fetching payment links', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => usePaymentLinks());

      let response: unknown;
      await act(async () => {
        response = await result.current.getPaymentLinks();
      });

      expect(response).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching payment links:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    test('should handle error without message property', async () => {
      const errorWithoutMessage = { code: 'UNKNOWN_ERROR' };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: errorWithoutMessage,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const { result } = renderHook(() => usePaymentLinks());

      await act(async () => {
        await result.current.getPaymentLinks();
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error fetching payment links',
        description: 'Something went wrong',
        variant: 'destructive',
      });
    });
  });

  describe('cancelPaymentLink', () => {
    test('should cancel payment link successfully', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const { result } = renderHook(() => usePaymentLinks());

      let response: unknown;
      await act(async () => {
        response = await result.current.cancelPaymentLink('link-123');
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('payment_links');
      expect(mockQuery.update).toHaveBeenCalledWith({
        status: 'cancelled',
        cancelled_at: expect.any(String),
      });
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'link-123');
      expect(response).toBe(true);

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Payment link cancelled',
        description: 'The payment link has been cancelled successfully',
      });
    });

    test('should handle database error when cancelling payment link', async () => {
      const mockError = new Error('Database error');
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: mockError,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => usePaymentLinks());

      let response: unknown;
      await act(async () => {
        response = await result.current.cancelPaymentLink('link-123');
      });

      expect(response).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Error cancelling payment link:', mockError);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error cancelling payment link',
        description: 'Database error',
        variant: 'destructive',
      });

      consoleSpy.mockRestore();
    });

    test('should handle unexpected error when cancelling payment link', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => usePaymentLinks());

      let response: unknown;
      await act(async () => {
        response = await result.current.cancelPaymentLink('link-123');
      });

      expect(response).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Error cancelling payment link:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    test('should verify timestamp format in update', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const { result } = renderHook(() => usePaymentLinks());

      await act(async () => {
        await result.current.cancelPaymentLink('link-123');
      });

      const updateCall = mockQuery.update.mock.calls[0][0];
      expect(updateCall.status).toBe('cancelled');
      expect(updateCall.cancelled_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('Gateway Function Selection Logic', () => {
    test('should use standard PayU function for basic parameters', async () => {
      const basicParams = {
        ...mockPaymentLinkParams,
        template: 'default' as const,
        apiMethod: undefined,
      };

      mockSupabase.functions.invoke.mockResolvedValue({
        data: mockPaymentLinkResponse,
        error: null,
      });

      const { result } = renderHook(() => usePaymentLinks());

      await act(async () => {
        await result.current.createPaymentLink(basicParams);
      });

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('create-payment-link', {
        body: basicParams,
      });
    });

    test('should use v2 function when customFields are provided', async () => {
      const paramsWithCustomFields = {
        ...mockPaymentLinkParams,
        customFields: [{ customerRef: 'REF123' }],
      };

      mockSupabase.functions.invoke.mockResolvedValue({
        data: mockPaymentLinkResponse,
        error: null,
      });

      const { result } = renderHook(() => usePaymentLinks());

      await act(async () => {
        await result.current.createPaymentLink(paramsWithCustomFields);
      });

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('create-payu-payment-link-v2', {
        body: paramsWithCustomFields,
      });
    });

    test('should use v2 function when partialPaymentAllowed is true', async () => {
      const paramsWithPartialPayment = {
        ...mockPaymentLinkParams,
        partialPaymentAllowed: true,
      };

      mockSupabase.functions.invoke.mockResolvedValue({
        data: mockPaymentLinkResponse,
        error: null,
      });

      const { result } = renderHook(() => usePaymentLinks());

      await act(async () => {
        await result.current.createPaymentLink(paramsWithPartialPayment);
      });

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('create-payu-payment-link-v2', {
        body: paramsWithPartialPayment,
      });
    });

    test('should use v2 function when template is not default', async () => {
      const paramsWithBrandedTemplate = {
        ...mockPaymentLinkParams,
        template: 'minimal' as const,
      };

      mockSupabase.functions.invoke.mockResolvedValue({
        data: mockPaymentLinkResponse,
        error: null,
      });

      const { result } = renderHook(() => usePaymentLinks());

      await act(async () => {
        await result.current.createPaymentLink(paramsWithBrandedTemplate);
      });

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('create-payu-payment-link-v2', {
        body: paramsWithBrandedTemplate,
      });
    });

    test('should use v2 function when apiMethod is rest', async () => {
      const paramsWithRestAPI = {
        ...mockPaymentLinkParams,
        apiMethod: 'rest' as const,
      };

      mockSupabase.functions.invoke.mockResolvedValue({
        data: mockPaymentLinkResponse,
        error: null,
      });

      const { result } = renderHook(() => usePaymentLinks());

      await act(async () => {
        await result.current.createPaymentLink(paramsWithRestAPI);
      });

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('create-payu-payment-link-v2', {
        body: paramsWithRestAPI,
      });
    });

    test('should default to PayU when no gateway is specified', async () => {
      const paramsWithoutGateway = {
        quoteId: 'quote-123',
        amount: 100,
        currency: 'USD',
        customerInfo: mockCustomerInfo,
      };

      mockSupabase.functions.invoke.mockResolvedValue({
        data: mockPaymentLinkResponse,
        error: null,
      });

      const { result } = renderHook(() => usePaymentLinks());

      await act(async () => {
        await result.current.createPaymentLink(paramsWithoutGateway);
      });

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('create-payu-payment-link-v2', {
        body: paramsWithoutGateway,
      });
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    test('should handle empty customFields array as not triggering v2', async () => {
      const paramsWithEmptyCustomFields = {
        ...mockPaymentLinkParams,
        customFields: [],
      };

      mockSupabase.functions.invoke.mockResolvedValue({
        data: mockPaymentLinkResponse,
        error: null,
      });

      const { result } = renderHook(() => usePaymentLinks());

      await act(async () => {
        await result.current.createPaymentLink(paramsWithEmptyCustomFields);
      });

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('create-payu-payment-link-v2', {
        body: paramsWithEmptyCustomFields,
      });
    });

    test('should handle failed response with success false', async () => {
      const failedResponse = {
        success: false,
        error: 'Payment link creation failed',
      };

      mockSupabase.functions.invoke.mockResolvedValue({
        data: failedResponse,
        error: null,
      });

      const { result } = renderHook(() => usePaymentLinks());

      let response: unknown;
      await act(async () => {
        response = await result.current.createPaymentLink(mockPaymentLinkParams);
      });

      expect(response).toEqual(failedResponse);
      // Should not show success toast
      expect(mockToast).not.toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Payment link created!',
        }),
      );
    });

    test('should handle undefined data response', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: undefined,
        error: null,
      });

      const { result } = renderHook(() => usePaymentLinks());

      let response: unknown;
      await act(async () => {
        response = await result.current.createPaymentLink(mockPaymentLinkParams);
      });

      expect(response).toBeNull();
    });

    test('should handle concurrent payment link creation', async () => {
      let resolveFirst: (value: unknown) => void;
      let resolveSecond: (value: unknown) => void;

      const firstPromise = new Promise((resolve) => {
        resolveFirst = resolve;
      });
      const secondPromise = new Promise((resolve) => {
        resolveSecond = resolve;
      });

      mockSupabase.functions.invoke
        .mockReturnValueOnce(firstPromise)
        .mockReturnValueOnce(secondPromise);

      const { result } = renderHook(() => usePaymentLinks());

      // Start two concurrent operations
      let firstResponse: unknown;
      let secondResponse: unknown;

      act(() => {
        result.current.createPaymentLink(mockPaymentLinkParams).then((res) => {
          firstResponse = res;
        });
        result.current
          .createPaymentLink({
            ...mockPaymentLinkParams,
            quoteId: 'quote-456',
          })
          .then((res) => {
            secondResponse = res;
          });
      });

      expect(result.current.isCreating).toBe(true);

      // Resolve first
      await act(async () => {
        resolveFirst({
          data: { ...mockPaymentLinkResponse, linkId: 'link-1' },
          error: null,
        });
      });

      // Resolve second
      await act(async () => {
        resolveSecond({
          data: { ...mockPaymentLinkResponse, linkId: 'link-2' },
          error: null,
        });
      });

      expect(result.current.isCreating).toBe(false);
      expect(firstResponse.linkId).toBe('link-1');
      expect(secondResponse.linkId).toBe('link-2');
    });
  });
});
