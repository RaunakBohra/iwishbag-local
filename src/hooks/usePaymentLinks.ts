import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface CreatePaymentLinkParams {
  quoteId: string;
  amount: number;
  currency: string;
  customerInfo: {
    name: string;
    email: string;
    phone: string;
  };
  description?: string;
  expiryDays?: number;
  gateway?: 'payu' | 'stripe' | 'paypal';
  // Enhanced v2 options
  customFields?: Array<Record<string, unknown>>;
  template?: 'default' | 'minimal' | 'branded';
  partialPaymentAllowed?: boolean;
  apiMethod?: 'rest' | 'legacy';
}

interface PaymentLinkResponse {
  success: boolean;
  linkId?: string;
  linkCode?: string;
  paymentUrl?: string;
  shortUrl?: string;
  expiresAt?: string;
  amountInINR?: string;
  originalAmount?: number;
  originalCurrency?: string;
  exchangeRate?: number;
  error?: string;
  // Enhanced v2 response
  apiVersion?: string;
  fallbackUsed?: boolean;
  features?: {
    customFields?: boolean;
    partialPayment?: boolean;
    template?: string;
  };
}

export function usePaymentLinks() {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);

  const createPaymentLink = async (params: CreatePaymentLinkParams): Promise<PaymentLinkResponse | null> => {
    setIsCreating(true);
    
    try {
      // Determine which function to use based on gateway
      let functionName: string;
      
      if (params.gateway === 'paypal') {
        functionName = 'create-paypal-payment-link';
      } else if (params.gateway === 'payu' || !params.gateway) {
        // Use enhanced v2 function if advanced features are requested
        const useV2 = params.customFields?.length || params.partialPaymentAllowed || 
                      params.template !== 'default' || params.apiMethod === 'rest';
        functionName = useV2 ? 'create-payu-payment-link-v2' : 'create-payment-link';
      } else {
        toast({
          title: 'Not implemented',
          description: `${params.gateway} payment links are not yet implemented`,
          variant: 'destructive',
        });
        return null;
      }
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: params,
      });

      if (error) {
        console.error('Edge function error:', error);
        // Try to get error details from the response
        if (error instanceof Error && 'context' in error) {
          const context = (error as Error & { context?: unknown }).context;
          if (context?.body) {
            console.error('Error details:', context.body);
          }
        }
        throw error;
      }

      if (data.success) {
        toast({
          title: 'Payment link created!',
          description: `Payment link has been generated successfully`,
        });

        // Copy short URL to clipboard if available
        if (data.shortUrl && navigator.clipboard) {
          try {
            await navigator.clipboard.writeText(data.shortUrl);
            toast({
              title: 'Link copied!',
              description: 'Payment link has been copied to your clipboard',
            });
          } catch (clipboardError) {
            console.error('Failed to copy to clipboard:', clipboardError);
          }
        }
      }

      return data;
    } catch (error: unknown) {
      console.error('Error creating payment link:', error);
      toast({
        title: 'Error creating payment link',
        description: error.message || 'Something went wrong',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  const getPaymentLinks = async (quoteId?: string) => {
    try {
      let query = supabase
        .from('payment_links')
        .select('*')
        .order('created_at', { ascending: false });

      if (quoteId) {
        query = query.eq('quote_id', quoteId);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data;
    } catch (error: unknown) {
      console.error('Error fetching payment links:', error);
      toast({
        title: 'Error fetching payment links',
        description: error.message || 'Something went wrong',
        variant: 'destructive',
      });
      return [];
    }
  };

  const cancelPaymentLink = async (linkId: string) => {
    try {
      const { error } = await supabase
        .from('payment_links')
        .update({ 
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        })
        .eq('id', linkId);

      if (error) {
        throw error;
      }

      toast({
        title: 'Payment link cancelled',
        description: 'The payment link has been cancelled successfully',
      });

      return true;
    } catch (error: unknown) {
      console.error('Error cancelling payment link:', error);
      toast({
        title: 'Error cancelling payment link',
        description: error.message || 'Something went wrong',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    createPaymentLink,
    getPaymentLinks,
    cancelPaymentLink,
    isCreating,
  };
}