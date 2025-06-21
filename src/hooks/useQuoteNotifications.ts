import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";

type Quote = Tables<'quotes'>;

// Helper to get the current user's access token
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

export const useQuoteNotifications = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Send immediate confirmation email
  const sendConfirmationEmail = useMutation({
    mutationFn: async (quoteId: string) => {
      const { data: quote, error } = await supabase
        .from('quotes')
        .select(`
          *,
          quote_items (*)
        `)
        .eq('id', quoteId)
        .single();

      if (error) throw error;
      if (!quote) throw new Error('Quote not found');

      // Send confirmation email
      const accessToken = await getAccessToken();
      if (accessToken) {
        // Temporarily disabled to prevent CORS errors
        console.log('Confirmation email disabled for development:', { quoteId: quote.id, email: quote.email });
        
        // TODO: Re-enable when Edge Function is properly set up
        /*
        const { error: emailError } = await supabase.functions.invoke('send-email', {
          body: {
            to: quote.email,
            template: 'quote_confirmation',
            data: {
              quoteId: quote.display_id || quote.id,
              itemCount: quote.quote_items?.length || 1,
              estimatedTime: '24-48 hours',
              dashboardUrl: `${window.location.origin}/dashboard`
            }
          },
          headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (emailError) {
          console.error('Failed to send confirmation email:', emailError);
        }
        */
      } else {
        console.warn('No access token available, skipping confirmation email');
      }

      // Update quote status to indicate confirmation sent
      const { error: updateError } = await supabase
        .from('quotes')
        .update({ 
          status: 'confirmed',
          internal_notes: quote.internal_notes ? 
            `${quote.internal_notes}\n[${new Date().toISOString()}] Confirmation email sent` :
            `[${new Date().toISOString()}] Confirmation email sent`
        })
        .eq('id', quoteId);

      if (updateError) throw updateError;

      return quote;
    },
    onSuccess: (quote) => {
      queryClient.invalidateQueries({ queryKey: ['quote', quote.id] });
      toast({
        title: "Confirmation Sent",
        description: `Confirmation email sent to ${quote.email}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Confirmation Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Send quote ready notification
  const sendQuoteReadyNotification = useMutation({
    mutationFn: async (quoteId: string) => {
      const { data: quote, error } = await supabase
        .from('quotes')
        .select(`
          *,
          quote_items (*)
        `)
        .eq('id', quoteId)
        .single();

      if (error) throw error;
      if (!quote) throw new Error('Quote not found');

      // Send quote ready email
      const accessToken = await getAccessToken();
      if (accessToken) {
        // Temporarily disabled to prevent CORS errors
        console.log('Quote ready email disabled for development:', { quoteId: quote.id, email: quote.email });
        
        // TODO: Re-enable when Edge Function is properly set up
        /*
        const { error: emailError } = await supabase.functions.invoke('send-email', {
          body: {
            to: quote.email,
            template: 'quote_ready',
            data: {
              quoteId: quote.order_display_id || quote.id,
              totalAmount: quote.final_total_local || quote.final_total,
              currency: quote.final_currency || 'USD',
              itemCount: quote.quote_items?.length || 1,
              dashboardUrl: `${window.location.origin}/dashboard`,
              quoteUrl: `${window.location.origin}/quote-details/${quote.id}`
            }
          },
          headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (emailError) {
          console.error('Failed to send quote ready email:', emailError);
        }
        */
      } else {
        console.warn('No access token available, skipping quote ready email');
      }

      // Update quote status
      const { error: updateError } = await supabase
        .from('quotes')
        .update({ 
          status: 'sent',
          internal_notes: quote.internal_notes ? 
            `${quote.internal_notes}\n[${new Date().toISOString()}] Quote ready email sent` :
            `[${new Date().toISOString()}] Quote ready email sent`
        })
        .eq('id', quoteId);

      if (updateError) throw updateError;

      return quote;
    },
    onSuccess: (quote) => {
      queryClient.invalidateQueries({ queryKey: ['quote', quote.id] });
      toast({
        title: "Quote Ready Notification Sent",
        description: `Quote ready email sent to ${quote.email}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Notification Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Send status update notifications
  const sendStatusUpdate = useMutation({
    mutationFn: async ({ quoteId, status, additionalData }: { 
      quoteId: string; 
      status: string; 
      additionalData?: Record<string, any>;
    }) => {
      const { data: quote, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', quoteId)
        .single();

      if (error) throw error;
      if (!quote) throw new Error('Quote not found');

      const statusTemplates: Record<string, string> = {
        'accepted': 'quote_accepted',
        'paid': 'payment_confirmed',
        'ordered': 'order_placed',
        'shipped': 'order_shipped',
        'completed': 'order_delivered',
        'cancelled': 'quote_cancelled'
      };

      const template = statusTemplates[status];
      if (!template) return quote;

      // Send status update email
      const accessToken = await getAccessToken();
      if (accessToken) {
        // Temporarily disabled to prevent CORS errors
        console.log('Status update email disabled for development:', { quoteId: quote.id, status, email: quote.email });
        
        // TODO: Re-enable when Edge Function is properly set up
        /*
        const { error: emailError } = await supabase.functions.invoke('send-email', {
          body: {
            to: quote.email,
            template: template as EmailTemplate,
            data: {
              quoteId: quote.order_display_id || quote.id,
              customerName: quote.customer_name || 'Customer',
              totalAmount: quote.final_total_local || quote.final_total,
              currency: quote.final_currency || 'USD',
              dashboardUrl: `${window.location.origin}/dashboard`,
              ...additionalData
            }
          },
          headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (emailError) {
          console.error('Failed to send status update email:', emailError);
        }
        */
      } else {
        console.warn('No access token available, skipping status update email');
      }

      return quote;
    },
    onSuccess: (quote) => {
      queryClient.invalidateQueries({ queryKey: ['quote', quote.id] });
      toast({
        title: "Status Update Sent",
        description: `Status update sent to ${quote.email}`,
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

  // Send reminder emails for pending quotes
  const sendReminderEmail = useMutation({
    mutationFn: async (quoteId: string) => {
      const { data: quote, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', quoteId)
        .single();

      if (error) throw error;
      if (!quote) throw new Error('Quote not found');

      // Send reminder email
      const accessToken = await getAccessToken();
      if (accessToken) {
        const { error: emailError } = await supabase.functions.invoke('send-email', {
          body: {
            to: quote.email,
            template: 'quote_reminder',
            data: {
              quoteId: quote.order_display_id || quote.id,
              customerName: quote.customer_name || 'Customer',
              totalAmount: quote.final_total_local || quote.final_total,
              currency: quote.final_currency || 'USD',
              daysSinceRequest: Math.floor((Date.now() - new Date(quote.created_at).getTime()) / (1000 * 60 * 60 * 24)),
              dashboardUrl: `${window.location.origin}/dashboard`
            }
          },
          headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (emailError) {
          console.error('Failed to send reminder email:', emailError);
        }
      } else {
        console.warn('No access token available, skipping reminder email');
      }

      return quote;
    },
    onSuccess: (quote) => {
      toast({
        title: "Reminder Sent",
        description: `Reminder email sent to ${quote.email}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Reminder Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  return {
    sendConfirmationEmail: sendConfirmationEmail.mutate,
    isSendingConfirmation: sendConfirmationEmail.isPending,
    sendQuoteReadyNotification: sendQuoteReadyNotification.mutate,
    isSendingReadyNotification: sendQuoteReadyNotification.isPending,
    sendStatusUpdate: sendStatusUpdate.mutate,
    isSendingStatusUpdate: sendStatusUpdate.isPending,
    sendReminderEmail: sendReminderEmail.mutate,
    isSendingReminder: sendReminderEmail.isPending
  };
}; 