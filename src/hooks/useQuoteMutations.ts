import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Tables } from "@/integrations/supabase/types";
import { useStatusTransitions } from "./useStatusTransitions";

type Quote = Tables<'quotes'>;
type QuoteItem = Tables<'quote_items'>;

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

export const useQuoteMutations = (id: string | undefined) => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { handleQuoteSent, handleAutoCalculation } = useStatusTransitions();

    const updateQuoteMutation = useMutation({
        mutationFn: async (quoteData: Partial<Quote> & { id: string }) => {
            if (!quoteData.id || quoteData.id === "undefined") {
                throw new Error("Quote ID is missing or invalid.");
            }
            
            // Remove undefined and 'undefined' string fields
            const cleanQuoteData = Object.fromEntries(
                Object.entries(quoteData).filter(
                    ([, value]) => value !== undefined && value !== "undefined"
                )
            );
            
            console.log('[QUOTE UPDATE PAYLOAD]', cleanQuoteData);
            
            // Get current quote status before update
            const { data: currentQuote } = await supabase
                .from('quotes')
                .select('status')
                .eq('id', quoteData.id)
                .single();
            
            const { error } = await supabase
                .from('quotes')
                .update(cleanQuoteData)
                .eq('id', quoteData.id);
                
            if (error) throw new Error(error.message);

            // Handle automatic status transitions
            const newStatus = cleanQuoteData.status;
            if (newStatus && currentQuote?.status !== newStatus) {
                // If status changed to 'calculated' from 'pending', trigger auto-calculation transition
                if (newStatus === 'calculated' && currentQuote?.status === 'pending') {
                    await handleAutoCalculation(quoteData.id, currentQuote.status);
                }
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-quote', id] });
            queryClient.invalidateQueries({ queryKey: ['admin-quotes'] });
            queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
            toast({ title: "Quote updated and recalculated successfully" });
        },
        onError: (error: Error) => {
            toast({ title: "Error updating quote", description: error.message, variant: "destructive" });
        }
    });

    const updateQuoteItemMutation = useMutation({
        mutationFn: async (itemData: Partial<QuoteItem> & { id: string }) => {
            const { error } = await supabase
                .from('quote_items')
                .update(itemData)
                .eq('id', itemData.id);
            if (error) throw new Error(error.message);
        },
    });

    const sendQuoteEmailMutation = useMutation({
        mutationFn: async (quote: Quote) => {
            if (!quote) throw new Error('Quote data is required');

            // Generate email content
            const emailSubject = `Quote ${quote.display_id || quote.id} - ${quote.product_name}`;
            const emailHtml = `
                <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #2563eb;">Your Quote is Ready!</h2>
                        
                        <p>Dear Customer,</p>
                        
                        <p>Thank you for your quote request. Here are the details:</p>
                        
                        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="margin-top: 0;">Quote Details</h3>
                            <p><strong>Quote ID:</strong> ${quote.display_id || quote.id}</p>
                            <p><strong>Product:</strong> ${quote.product_name}</p>
                            <p><strong>Destination:</strong> ${quote.country_code}</p>
                            <p><strong>Total Amount:</strong> $${quote.final_total || quote.item_price}</p>
                        </div>
                        
                        <p>To view your complete quote and proceed with your order, please log in to your dashboard:</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${window.location.origin}/dashboard" 
                               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                                View Quote in Dashboard
                            </a>
                        </div>
                        
                        <p>If you have any questions, please don't hesitate to contact us.</p>
                        
                        <p>Best regards,<br>
                        The WishBag Team</p>
                    </div>
                </body>
                </html>
            `;

            // Before calling send-email:
            const accessToken = await getAccessToken();

            if (accessToken) {
                // Send email using the edge function
                const { error: emailError } = await supabase.functions.invoke('send-email', {
                    body: {
                        to: quote.email,
                        subject: emailSubject,
                        html: emailHtml,
                    },
                    headers: { Authorization: `Bearer ${accessToken}` }
                });

                if (emailError) {
                    console.error('Email sending error:', emailError);
                    throw new Error(`Failed to send email: ${emailError.message}`);
                }
            } else {
                console.warn('No access token available, skipping email send');
            }

            // Use the new status transition system instead of direct update
            await handleQuoteSent(quote.id, quote.status || 'pending');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-quote', id] });
            toast({ title: "Quote Sent", description: "The quote has been sent via email successfully!" });
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: `Failed to send quote: ${error.message}`, variant: "destructive" });
        }
    });

    return {
        updateQuote: updateQuoteMutation.mutate,
        updateQuoteItem: updateQuoteItemMutation.mutateAsync,
        sendQuoteEmail: sendQuoteEmailMutation.mutate,
        isUpdating: updateQuoteMutation.isPending || updateQuoteItemMutation.isPending,
        isSendingEmail: sendQuoteEmailMutation.isPending,
    };
};