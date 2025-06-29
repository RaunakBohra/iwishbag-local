import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEmailSettings } from "@/hooks/useEmailSettings";
import { Quote } from "@/types/quote";

type EmailTemplate = 'quote_sent' | 'quote_approved' | 'quote_rejected' | 'order_shipped' | 'order_delivered' | 'contact_form';

interface EmailNotificationOptions {
  to: string;
  template: EmailTemplate;
  data: Record<string, any>;
  from?: string;
}

// Helper function to get access token
const getAccessToken = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
};

export const useEmailNotifications = () => {
  const { toast } = useToast();
  const { shouldSendEmail } = useEmailSettings();

  const sendEmailMutation = useMutation({
    mutationFn: async ({ to, template, data, from }: EmailNotificationOptions) => {
      // Determine email type for settings check
      let emailType: 'quote_notification' | 'order_notification' | undefined;
      
      if (['quote_sent', 'quote_approved', 'quote_rejected'].includes(template)) {
        emailType = 'quote_notification';
      } else if (['order_shipped', 'order_delivered'].includes(template)) {
        emailType = 'order_notification';
      }

      // Check if this type of email is enabled
      if (emailType && !shouldSendEmail(emailType)) {
        console.log(`${emailType} emails are disabled`);
        return { skipped: true, message: `${emailType} emails are disabled` };
      }

      const accessToken = await getAccessToken();
      
      if (!accessToken) {
        throw new Error('User not authenticated - cannot send email');
      }

      // Use Supabase Edge Function instead of /api/send-email
      const { data: result, error } = await supabase.functions.invoke('send-email', {
        body: {
          to,
          subject: `Quote ${data.quoteId} - ${template.replace('_', ' ').toUpperCase()}`,
          html: generateEmailHtml(template, data),
          from: from || 'noreply@whyteclub.com'
        },
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (error) {
        throw new Error(error.message || 'Failed to send email');
      }

      return result;
    },
    onSuccess: (data) => {
      if (data.skipped) {
        toast({
          title: "Email skipped",
          description: data.message,
        });
      } else {
        toast({
          title: "Email sent successfully",
          description: "The notification email has been sent.",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send email",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Helper function to generate email HTML
  const generateEmailHtml = (template: EmailTemplate, data: Record<string, any>) => {
    const baseHtml = `
      <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">Quote Update</h2>
          <p>Dear ${data.customerName || 'Customer'},</p>
    `;

    let content = '';
    switch (template) {
      case 'quote_sent':
        content = `
          <p>Your quote has been sent for review.</p>
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Quote Details</h3>
            <p><strong>Quote ID:</strong> ${data.quoteId}</p>
            <p><strong>Total Amount:</strong> $${data.totalAmount}</p>
            <p><strong>Currency:</strong> ${data.currency}</p>
          </div>
        `;
        break;
      case 'quote_approved':
        content = `
          <p>Great news! Your quote has been approved.</p>
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Approved Quote</h3>
            <p><strong>Quote ID:</strong> ${data.quoteId}</p>
            <p><strong>Total Amount:</strong> $${data.totalAmount}</p>
            <p><strong>Currency:</strong> ${data.currency}</p>
          </div>
        `;
        break;
      case 'quote_rejected':
        content = `
          <p>We regret to inform you that your quote has been rejected.</p>
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Rejection Details</h3>
            <p><strong>Quote ID:</strong> ${data.quoteId}</p>
            <p><strong>Reason:</strong> ${data.rejectionReason}</p>
          </div>
        `;
        break;
      case 'order_shipped':
        content = `
          <p>Your order has been shipped!</p>
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Shipping Details</h3>
            <p><strong>Quote ID:</strong> ${data.quoteId}</p>
            <p><strong>Tracking Number:</strong> ${data.trackingNumber}</p>
            <p><strong>Carrier:</strong> ${data.carrier}</p>
          </div>
        `;
        break;
      case 'order_delivered':
        content = `
          <p>Your order has been delivered!</p>
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Delivery Confirmation</h3>
            <p><strong>Quote ID:</strong> ${data.quoteId}</p>
          </div>
        `;
        break;
      default:
        content = `<p>You have received an update regarding your quote.</p>`;
    }

    return baseHtml + content + `
          <p>Best regards,<br>The WishBag Team</p>
        </div>
      </body>
      </html>
    `;
  };

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