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
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('Error getting session:', error);
      return null;
    }
    return session?.access_token || null;
  } catch (error) {
    console.warn('Error getting access token:', error);
    return null;
  }
}

export const useEmailNotifications = () => {
  const { toast } = useToast();

  const sendEmailMutation = useMutation({
    mutationFn: async ({ to, template, data, from }: EmailNotificationOptions) => {
      // Temporarily disabled to prevent CORS errors
      console.log('Email notification disabled for development:', { to, template, data });
      return Promise.resolve();
      
      // TODO: Re-enable when Edge Function is properly set up
      /*
      const accessToken = await getAccessToken();
      
      if (accessToken) {
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
      } else {
        console.warn('No access token available, skipping email send');
        // You might want to throw an error here or handle it differently
        throw new Error('User not authenticated - cannot send email');
      }
      */
    },
    onSuccess: () => {
      toast({
        title: "Email sent successfully",
        description: "The notification email has been sent.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send email",
        description: error.message,
        variant: "destructive",
      });
    },
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