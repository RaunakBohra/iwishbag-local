import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useStatusManagement } from "./useStatusManagement";
import { useEmailSettings } from "./useEmailSettings";

export interface StatusTransitionEvent {
  quoteId: string;
  fromStatus: string;
  toStatus: string;
  trigger: 'payment_received' | 'quote_sent' | 'order_shipped' | 'quote_expired' | 'manual' | 'auto_calculation';
  metadata?: Record<string, unknown>;
}

export const useStatusTransitions = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isValidTransition, getStatusConfig } = useStatusManagement();
  const { shouldSendEmail } = useEmailSettings();

  // Automatic status transition mutation
  const transitionStatusMutation = useMutation({
    mutationFn: async (event: StatusTransitionEvent) => {
      const { quoteId, fromStatus, toStatus, trigger, metadata } = event;

      // Validate the transition
      if (!isValidTransition(fromStatus, toStatus, 'quote')) {
        throw new Error(`Invalid status transition from "${fromStatus}" to "${toStatus}"`);
      }

      // Get status config for logging
      const statusConfig = getStatusConfig(toStatus, 'quote');

      // Update the quote status
      const { error } = await supabase
        .from('quotes')
        .update({ 
          status: toStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', quoteId);

      if (error) throw new Error(error.message);

      // Log the status transition
      await logStatusTransition(event);

      // Send notification if needed
      await sendStatusNotification(event);

      return { success: true, newStatus: toStatus };
    },
    onSuccess: (data, event) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['admin-quote', event.quoteId] });
      queryClient.invalidateQueries({ queryKey: ['admin-quotes'] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });

      // Show success toast
      const statusConfig = getStatusConfig(data.newStatus, 'quote');
      toast({
        title: "Status Updated",
        description: `Quote status automatically changed to "${statusConfig?.label || data.newStatus}"`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Status Update Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Log status transition to database
  const logStatusTransition = async (event: StatusTransitionEvent) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase
        .from('status_transitions')
        .insert({
          quote_id: event.quoteId,
          from_status: event.fromStatus,
          to_status: event.toStatus,
          trigger: event.trigger,
          metadata: event.metadata || {},
          changed_by: user?.id || null,
          changed_at: new Date().toISOString()
        });
    } catch (error) {
      console.warn('Failed to log status transition:', error);
      // Don't throw error as this is just logging
    }
  };

  // Get email template for status notification
  const getStatusEmailTemplate = async (status: string): Promise<Record<string, unknown> | null> => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('template_type', 'status_notification')
        .ilike('name', `%${status}%`)
        .single();

      if (error || !data) {
        // Fallback to default template
        return {
          subject: `Quote Status Update - ${status}`,
          html_content: generateDefaultStatusEmail(status)
        };
      }

      return data;
    } catch (error) {
      console.warn('Failed to get status email template:', error);
      return {
        subject: `Quote Status Update - ${status}`,
        html_content: generateDefaultStatusEmail(status)
      };
    }
  };

  // Generate default status email content
  const generateDefaultStatusEmail = (status: string): string => {
    const statusMessages = {
      sent: 'Your quote has been sent and is ready for review.',
      approved: 'Your quote has been approved! You can now proceed with payment.',
      rejected: 'Your quote has been rejected. Please contact us for more information.',
      shipped: 'Your order has been shipped and is on its way!',
      completed: 'Your order has been delivered successfully!'
    };

    const message = statusMessages[status as keyof typeof statusMessages] || 
                   `Your quote status has been updated to ${status}.`;

    return `
      <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">Quote Status Update</h2>
          
          <p>Dear Customer,</p>
          
          <p>${message}</p>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Quote Details</h3>
            <p><strong>Status:</strong> ${status}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${window.location.origin}/dashboard" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View in Dashboard
            </a>
          </div>
          
          <p>If you have any questions, please don't hesitate to contact us.</p>
          
          <p>Best regards,<br>
          The WishBag Team</p>
        </div>
      </body>
      </html>
    `;
  };

  // Send status change notification
  const sendStatusNotification = async (event: StatusTransitionEvent) => {
    try {
      // Check if status notifications are enabled
      if (!shouldSendEmail('status_notification')) {
        console.log('Status notifications are disabled, skipping email');
        return;
      }

      // Get quote details for notification
      const { data: quote } = await supabase
        .from('quotes')
        .select('email, display_id, product_name, final_total')
        .eq('id', event.quoteId)
        .single();

      if (!quote || !quote.email) {
        console.log('No email found for quote, skipping notification');
        return;
      }

      // Get email template
      const template = await getStatusEmailTemplate(event.toStatus);
      
      // Only send notifications for certain statuses
      const shouldNotify = ['sent', 'approved', 'rejected', 'shipped', 'completed'].includes(event.toStatus);
      
      if (shouldNotify) {
        // Replace template variables
        const emailSubject = template.subject
          .replace('{{quote_id}}', quote.display_id || event.quoteId)
          .replace('{{order_id}}', quote.display_id || event.quoteId);

        const emailHtml = template.html_content
          .replace(/\{\{customer_name\}\}/g, 'Customer')
          .replace(/\{\{quote_id\}\}/g, quote.display_id || event.quoteId)
          .replace(/\{\{order_id\}\}/g, quote.display_id || event.quoteId)
          .replace(/\{\{product_name\}\}/g, quote.product_name || 'Product')
          .replace(/\{\{total_amount\}\}/g, `$${quote.final_total?.toFixed(2) || '0.00'}`)
          .replace(/\{\{tracking_number\}\}/g, 'TBD')
          .replace(/\{\{dashboard_url\}\}/g, `${window.location.origin}/dashboard`)
          .replace(/\{\{payment_url\}\}/g, `${window.location.origin}/checkout/${event.quoteId}`)
          .replace(/\{\{tracking_url\}\}/g, `${window.location.origin}/dashboard`);

        const accessToken = await getAccessToken();
        if (accessToken) {
          await supabase.functions.invoke('send-email', {
            body: {
              to: quote.email,
              subject: emailSubject,
              html: emailHtml,
            },
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          
          console.log(`Status notification email sent for quote ${event.quoteId} to ${quote.email}`);
        }
      }
    } catch (error) {
      console.warn('Failed to send status notification:', error);
      // Don't throw error as this is just notification
    }
  };

  // Helper function to get access token
  const getAccessToken = async () => {
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
  };

  // Automatic transition functions for different events
  const handlePaymentReceived = async (quoteId: string, currentStatus: string) => {
    if (currentStatus === 'approved') {
      await transitionStatusMutation.mutateAsync({
        quoteId,
        fromStatus: currentStatus,
        toStatus: 'paid',
        trigger: 'payment_received',
        metadata: { payment_method: 'stripe' }
      });
    }
  };

  const handleQuoteSent = async (quoteId: string, currentStatus: string) => {
    if (currentStatus === 'pending' || currentStatus === 'calculated') {
      await transitionStatusMutation.mutateAsync({
        quoteId,
        fromStatus: currentStatus,
        toStatus: 'sent',
        trigger: 'quote_sent'
      });
    }
  };

  const handleOrderShipped = async (quoteId: string, currentStatus: string) => {
    if (currentStatus === 'ordered') {
      await transitionStatusMutation.mutateAsync({
        quoteId,
        fromStatus: currentStatus,
        toStatus: 'shipped',
        trigger: 'order_shipped'
      });
    }
  };

  const handleQuoteExpired = async (quoteId: string, currentStatus: string) => {
    if (currentStatus === 'sent') {
      await transitionStatusMutation.mutateAsync({
        quoteId,
        fromStatus: currentStatus,
        toStatus: 'expired',
        trigger: 'quote_expired'
      });
    }
  };

  const handleAutoCalculation = async (quoteId: string, currentStatus: string) => {
    if (currentStatus === 'pending') {
      await transitionStatusMutation.mutateAsync({
        quoteId,
        fromStatus: currentStatus,
        toStatus: 'calculated',
        trigger: 'auto_calculation'
      });
    }
  };

  return {
    transitionStatus: transitionStatusMutation.mutateAsync,
    handlePaymentReceived,
    handleQuoteSent,
    handleOrderShipped,
    handleQuoteExpired,
    handleAutoCalculation,
    isTransitioning: transitionStatusMutation.isPending
  };
}; 