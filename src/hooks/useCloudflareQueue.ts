/**
 * Hook for Cloudflare Queue integration
 * 
 * Provides React integration for queue operations
 * with error handling and loading states
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cloudflareQueueService } from '@/services/CloudflareQueueService';
import { useToast } from '@/components/ui/use-toast';
import type { 
  EmailOrderConfirmation, 
  EmailQuoteReady, 
  EmailPaymentReceived,
  EmailShippingUpdate,
  WebhookPayload,
  AnalyticsEvent,
  CacheInvalidation,
  D1Sync
} from '@/services/CloudflareQueueService';

/**
 * Hook for sending order confirmation emails
 */
export function useOrderConfirmationEmail() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (data: EmailOrderConfirmation) => 
      cloudflareQueueService.sendOrderConfirmationEmail(data),
    onSuccess: () => {
      toast({
        title: 'Email queued',
        description: 'Order confirmation email will be sent shortly.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Email queue failed',
        description: 'Failed to queue order confirmation email.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook for sending quote ready emails
 */
export function useQuoteReadyEmail() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (data: EmailQuoteReady) => 
      cloudflareQueueService.sendQuoteReadyEmail(data),
    onSuccess: () => {
      toast({
        title: 'Quote notification queued',
        description: 'Customer will be notified when quote is ready.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Notification failed',
        description: 'Failed to queue quote notification.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook for sending payment received emails
 */
export function usePaymentReceivedEmail() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (data: EmailPaymentReceived) => 
      cloudflareQueueService.sendPaymentReceivedEmail(data),
    onSuccess: () => {
      toast({
        title: 'Payment confirmation queued',
        description: 'Payment confirmation email will be sent.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Confirmation failed',
        description: 'Failed to queue payment confirmation.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook for sending shipping update emails
 */
export function useShippingUpdateEmail() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (data: EmailShippingUpdate) => 
      cloudflareQueueService.sendShippingUpdateEmail(data),
    onSuccess: () => {
      toast({
        title: 'Shipping notification queued',
        description: 'Shipping update will be sent to customer.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Shipping notification failed',
        description: 'Failed to queue shipping update.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook for sending webhooks
 */
export function useWebhookSend() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (data: WebhookPayload) => 
      cloudflareQueueService.sendWebhook(data),
    onSuccess: () => {
      toast({
        title: 'Webhook queued',
        description: 'Webhook notification will be sent.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Webhook failed',
        description: 'Failed to queue webhook notification.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook for tracking analytics events
 */
export function useAnalyticsTracking() {
  return useMutation({
    mutationFn: (data: AnalyticsEvent) => 
      cloudflareQueueService.trackAnalyticsEvent(data),
    // Silent - no toast notifications for analytics
  });
}

/**
 * Hook for cache invalidation
 */
export function useCacheInvalidation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CacheInvalidation) => 
      cloudflareQueueService.invalidateCache(data),
    onSuccess: (_, variables) => {
      // Invalidate related React Query cache
      if (variables.keys) {
        variables.keys.forEach(key => {
          queryClient.invalidateQueries({ queryKey: [key] });
        });
      }
      if (variables.patterns) {
        variables.patterns.forEach(pattern => {
          queryClient.invalidateQueries({ 
            predicate: (query) => 
              query.queryKey.some(key => 
                typeof key === 'string' && key.startsWith(pattern)
              )
          });
        });
      }
    },
  });
}

/**
 * Hook for D1 sync operations
 */
export function useD1Sync() {
  return useMutation({
    mutationFn: (data: D1Sync) => 
      cloudflareQueueService.syncToD1(data),
  });
}

/**
 * Hook for queue statistics
 */
export function useQueueStats() {
  return useQuery({
    queryKey: ['queue-stats'],
    queryFn: () => cloudflareQueueService.getQueueStats(),
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 15000, // Consider fresh for 15 seconds
  });
}

/**
 * Comprehensive hook for order workflow
 */
export function useOrderWorkflow() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: ({ 
      orderId, 
      customerData, 
      orderDetails 
    }: {
      orderId: string;
      customerData: { email: string; name: string };
      orderDetails: any;
    }) => 
      cloudflareQueueService.sendOrderCompletionWorkflow(orderId, customerData, orderDetails),
    onSuccess: () => {
      toast({
        title: 'Order workflow started',
        description: 'All order notifications and processes have been queued.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Order workflow failed',
        description: 'Some order processes may not have been queued.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Comprehensive hook for quote workflow
 */
export function useQuoteWorkflow() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: ({ 
      quoteId, 
      customerData, 
      quoteData 
    }: {
      quoteId: string;
      customerData: { email: string; name: string };
      quoteData: any;
    }) => 
      cloudflareQueueService.sendQuoteWorkflow(quoteId, customerData, quoteData),
    onSuccess: () => {
      toast({
        title: 'Quote sent',
        description: 'Customer will receive the quote shortly.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Quote sending failed',
        description: 'Failed to send quote to customer.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Comprehensive hook for payment workflow
 */
export function usePaymentWorkflow() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: ({ 
      orderId, 
      paymentData 
    }: {
      orderId: string;
      paymentData: {
        amount: number;
        currency: string;
        method: string;
        customerEmail: string;
        customerName: string;
      };
    }) => 
      cloudflareQueueService.sendPaymentWorkflow(orderId, paymentData),
    onSuccess: () => {
      toast({
        title: 'Payment processed',
        description: 'Payment confirmations and processes have been queued.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Payment workflow failed',
        description: 'Some payment processes may not have completed.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to track page views automatically
 */
export function usePageViewTracking() {
  const { mutate: trackEvent } = useAnalyticsTracking();
  
  const trackPageView = (page: string, properties?: Record<string, any>) => {
    trackEvent({
      event: 'page_view',
      properties: {
        page,
        referrer: document.referrer,
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        ...properties,
      },
      timestamp: new Date().toISOString(),
    });
  };
  
  return { trackPageView };
}

/**
 * Hook to track business events
 */
export function useBusinessEventTracking() {
  const { mutate: trackEvent } = useAnalyticsTracking();
  
  const trackBusinessEvent = (event: string, properties: Record<string, any>) => {
    trackEvent({
      event,
      properties: {
        ...properties,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  };
  
  return { trackBusinessEvent };
}