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
        const { error: emailError } = await supabase.functions.invoke('send-email', {
          body: {
            to: quote.email,
            subject: `Quote Confirmation - ${quote.display_id || quote.id}`,
            html: `
              <html>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h2 style="color: #2563eb;">Quote Request Confirmation</h2>
                  <p>Dear Customer,</p>
                  <p>Thank you for your quote request. We have received your request and will process it within 24-48 hours.</p>
                  <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0;">Request Details</h3>
                    <p><strong>Quote ID:</strong> ${quote.display_id || quote.id}</p>
                    <p><strong>Items:</strong> ${quote.quote_items?.length || 1}</p>
                    <p><strong>Estimated Processing Time:</strong> 24-48 hours</p>
                  </div>
                  <p>You will receive another email once your quote is ready.</p>
                  <p>Best regards,<br>The WishBag Team</p>
                </div>
              </body>
              </html>
            `,
            from: 'noreply@whyteclub.com'
          },
          headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (emailError) {
          console.error('Failed to send confirmation email:', emailError);
        }
      } else {
        console.warn('No access token available, skipping confirmation email');
      }

      // Update quote status to indicate confirmation sent
      const { error: updateError } = await supabase
        .from('quotes')
        .update({ 
          status: 'pending',
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
        const { error: emailError } = await supabase.functions.invoke('send-email', {
          body: {
            to: quote.email,
            subject: `Quote Ready - ${quote.order_display_id || quote.id}`,
            html: `
              <html>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h2 style="color: #2563eb;">Your Quote is Ready!</h2>
                  <p>Dear Customer,</p>
                  <p>Great news! Your quote is ready for review.</p>
                  <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0;">Quote Details</h3>
                    <p><strong>Quote ID:</strong> ${quote.order_display_id || quote.id}</p>
                    <p><strong>Total Amount:</strong> $${quote.final_total_local || quote.final_total}</p>
                    <p><strong>Currency:</strong> ${quote.final_currency || 'USD'}</p>
                    <p><strong>Items:</strong> ${quote.quote_items?.length || 1}</p>
                  </div>
                  <p>Please log in to your dashboard to review and approve your quote.</p>
                  <p>Best regards,<br>The WishBag Team</p>
                </div>
              </body>
              </html>
            `,
            from: 'noreply@whyteclub.com'
          },
          headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (emailError) {
          console.error('Failed to send quote ready email:', emailError);
        }
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
        .select(`
          *,
          profiles (full_name)
        `)
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
        const { error: emailError } = await supabase.functions.invoke('send-email', {
          body: {
            to: quote.email,
            subject: `Quote Status Update - ${quote.order_display_id || quote.id}`,
            html: `
              <html>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h2 style="color: #2563eb;">Quote Status Update</h2>
                  <p>Dear ${quote.profiles?.full_name || 'Customer'},</p>
                  <p>Your quote status has been updated.</p>
                  <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0;">Status Details</h3>
                    <p><strong>Quote ID:</strong> ${quote.order_display_id || quote.id}</p>
                    <p><strong>New Status:</strong> ${status.toUpperCase()}</p>
                    <p><strong>Total Amount:</strong> $${quote.final_total_local || quote.final_total}</p>
                    <p><strong>Currency:</strong> ${quote.final_currency || 'USD'}</p>
                    ${additionalData ? Object.entries(additionalData).map(([key, value]) => 
                      `<p><strong>${key.charAt(0).toUpperCase() + key.slice(1)}:</strong> ${value}</p>`
                    ).join('') : ''}
                  </div>
                  <p>Please log in to your dashboard for more details.</p>
                  <p>Best regards,<br>The WishBag Team</p>
                </div>
              </body>
              </html>
            `,
            from: 'noreply@whyteclub.com'
          },
          headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (emailError) {
          console.error('Failed to send status update email:', emailError);
        }
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
        .select(`
          *,
          profiles (full_name)
        `)
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
              customerName: quote.profiles?.full_name || 'Customer',
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