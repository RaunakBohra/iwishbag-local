import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Quote } from "@/types/quote";

type EmailTemplate = 'quote_sent' | 'quote_approved' | 'quote_rejected' | 'order_shipped' | 'order_delivered' | 'contact_form';

interface EmailNotificationOptions {
  to: string;
  template: EmailTemplate;
  data: Record<string, any>;
  from?: string;
}

async function getAccessToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || '';
}

export const useEmailNotifications = () => {
  const { toast } = useToast();

  const sendEmailMutation = useMutation({
    mutationFn: async ({ to, template, data, from }: EmailNotificationOptions) => {
      const accessToken = await getAccessToken();
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          to,
          template,
          data,
          from: from || 'WishBag <noreply@resend.dev>'
        },
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (error) throw error;
    },
    onError: (error: Error) => {
      console.error('Email sending error:', error);
      toast({
        title: "Error",
        description: `Failed to send email: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Predefined email notification functions
  const sendQuoteSentEmail = (quote: Quote) => {
    return sendEmailMutation.mutate({
      to: quote.email,
      template: 'quote_sent',
      data: {
        quoteId: quote.id,
        customerName: quote.customer_name,
        totalAmount: quote.total_amount,
        currency: quote.currency
      }
    });
  };

  const sendQuoteApprovedEmail = (quote: Quote) => {
    return sendEmailMutation.mutate({
      to: quote.email,
      template: 'quote_approved',
      data: {
        quoteId: quote.id,
        customerName: quote.customer_name,
        totalAmount: quote.total_amount,
        currency: quote.currency
      }
    });
  };

  const sendQuoteRejectedEmail = (quote: Quote, reason: string) => {
    return sendEmailMutation.mutate({
      to: quote.email,
      template: 'quote_rejected',
      data: {
        quoteId: quote.id,
        customerName: quote.customer_name,
        rejectionReason: reason
      }
    });
  };

  const sendOrderShippedEmail = (quote: Quote, trackingInfo: { number: string; carrier: string }) => {
    return sendEmailMutation.mutate({
      to: quote.email,
      template: 'order_shipped',
      data: {
        quoteId: quote.id,
        customerName: quote.customer_name,
        trackingNumber: trackingInfo.number,
        carrier: trackingInfo.carrier
      }
    });
  };

  const sendOrderDeliveredEmail = (quote: Quote) => {
    return sendEmailMutation.mutate({
      to: quote.email,
      template: 'order_delivered',
      data: {
        quoteId: quote.id,
        customerName: quote.customer_name
      }
    });
  };

  const sendContactFormEmail = (formData: { name: string; email: string; subject: string; message: string }) => {
    return sendEmailMutation.mutate({
      to: formData.email,
      template: 'contact_form',
      data: formData
    });
  };

  return {
    sendEmail: sendEmailMutation.mutate,
    isSending: sendEmailMutation.isPending,
    sendQuoteSentEmail,
    sendQuoteApprovedEmail,
    sendQuoteRejectedEmail,
    sendOrderShippedEmail,
    sendOrderDeliveredEmail,
    sendContactFormEmail
  };
}; 