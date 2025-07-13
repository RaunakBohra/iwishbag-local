import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { usePaymentLinks } from '@/hooks/usePaymentLinks';
import { useEmailNotifications } from '@/hooks/useEmailNotifications';
import { 
  detectDueAmount, 
  shouldGeneratePaymentLink, 
  formatDueAmountMessage,
  extractCustomerInfo,
  DueAmountInfo 
} from '@/lib/paymentUtils';
import { supabase } from '@/integrations/supabase/client';

interface UseDueAmountManagerProps {
  quoteId: string;
  currency: string;
  autoGenerateLinks?: boolean;
  autoThreshold?: number;
  onDueAmountDetected?: (dueInfo: DueAmountInfo) => void;
  onPaymentLinkCreated?: (link: any) => void;
}

export function useDueAmountManager({
  quoteId,
  currency,
  autoGenerateLinks = false,
  autoThreshold = 0,
  onDueAmountDetected,
  onPaymentLinkCreated
}: UseDueAmountManagerProps) {
  const { toast } = useToast();
  const { createPaymentLink, isCreating } = usePaymentLinks();
  const { sendPaymentLinkEmail } = useEmailNotifications();
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastKnownTotal, setLastKnownTotal] = useState<number | null>(null);

  /**
   * Handle order value changes and detect due amounts
   */
  const handleOrderValueChange = useCallback(async (newTotal: number, quote?: any) => {
    if (lastKnownTotal === null) {
      setLastKnownTotal(newTotal);
      return;
    }

    if (newTotal === lastKnownTotal) {
      return; // No change
    }

    setIsProcessing(true);

    try {
      // Detect due amount
      const dueInfo = await detectDueAmount(quoteId, lastKnownTotal, newTotal);
      
      // Update last known total
      setLastKnownTotal(newTotal);

      // Notify about due amount detection
      onDueAmountDetected?.(dueInfo);

      if (dueInfo.hasDueAmount) {
        const message = formatDueAmountMessage(dueInfo, currency);
        
        toast({
          title: "Payment Due",
          description: message,
          variant: dueInfo.changeType === 'increase' ? 'default' : 'default',
        });

        // Auto-generate payment link if enabled and threshold met
        if (autoGenerateLinks && shouldGeneratePaymentLink(dueInfo, autoThreshold)) {
          await generatePaymentLinkForDue(dueInfo.dueAmount, quote);
        }
      } else if (dueInfo.changeType === 'decrease') {
        toast({
          title: "Order Value Decreased",
          description: formatDueAmountMessage(dueInfo, currency),
        });
      }
    } catch (error) {
      console.error('Error handling order value change:', error);
      toast({
        title: "Error",
        description: "Failed to process order value change",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [lastKnownTotal, quoteId, currency, autoGenerateLinks, autoThreshold, onDueAmountDetected, toast]);

  /**
   * Generate payment link for due amount
   */
  const generatePaymentLinkForDue = useCallback(async (dueAmount: number, quote?: any) => {
    if (!quote) {
      // Fetch quote if not provided
      const { data: fetchedQuote } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', quoteId)
        .single();
      
      if (!fetchedQuote) {
        toast({
          title: "Error",
          description: "Could not fetch quote details",
          variant: "destructive",
        });
        return;
      }
      quote = fetchedQuote;
    }

    const customerInfo = extractCustomerInfo(quote);
    
    if (!customerInfo.email) {
      toast({
        title: "Missing Customer Email",
        description: "Cannot generate payment link without customer email",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await createPaymentLink({
        quoteId,
        amount: dueAmount,
        currency,
        customerInfo,
        description: `Due payment for Order ${quote.display_id || quote.id}`,
        expiryDays: 7,
        gateway: 'payu'
      });

      if (result?.success) {
        onPaymentLinkCreated?.(result);
        
        // Send email notification with payment link
        await sendPaymentLinkEmailNotification(customerInfo.email, result, quote, dueAmount);
      }
    } catch (error) {
      console.error('Error generating payment link:', error);
      toast({
        title: "Error",
        description: "Failed to generate payment link",
        variant: "destructive",
      });
    }
  }, [quoteId, currency, createPaymentLink, onPaymentLinkCreated, toast]);

  /**
   * Send payment link via email
   */
  const sendPaymentLinkEmailNotification = useCallback(async (
    customerEmail: string, 
    paymentLink: any, 
    quote: any, 
    amount: number
  ) => {
    try {
      await sendPaymentLinkEmail({
        to: customerEmail,
        customerName: extractCustomerInfo(quote).name,
        orderNumber: quote.display_id || quote.id,
        amount: amount,
        currency: currency,
        paymentUrl: paymentLink.shortUrl || paymentLink.paymentUrl,
        expiryDate: paymentLink.expiresAt
      });
    } catch (error) {
      console.error('Error sending payment link email:', error);
      // Error is already handled by the email hook
    }
  }, [currency, sendPaymentLinkEmail]);

  /**
   * Manually generate payment link
   */
  const generatePaymentLink = useCallback(async (amount: number, quote?: any) => {
    return await generatePaymentLinkForDue(amount, quote);
  }, [generatePaymentLinkForDue]);

  /**
   * Check for existing due amounts on mount
   */
  useEffect(() => {
    const checkExistingDueAmount = async () => {
      if (!quoteId) return;

      try {
        const { data: quote } = await supabase
          .from('quotes')
          .select('final_total')
          .eq('id', quoteId)
          .single();

        if (quote) {
          setLastKnownTotal(parseFloat(quote.final_total) || 0);
        }
      } catch (error) {
        console.error('Error fetching initial quote total:', error);
      }
    };

    checkExistingDueAmount();
  }, [quoteId]);

  return {
    handleOrderValueChange,
    generatePaymentLink,
    isProcessing: isProcessing || isCreating,
    lastKnownTotal
  };
}