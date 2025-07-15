import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useToast } from '@/hooks/use-toast';
import { useEmailSettings } from '@/hooks/useEmailSettings';

interface AbandonedCart {
  id: string;
  user_id: string;
  email: string;
  final_total_local: number;
  updated_at: string;
  quantity: number;
  product_name?: string;
  image_url?: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_content: string;
  template_type: string;
  variables?: Record<string, unknown>;
  is_active?: boolean;
}

interface EmailCampaign {
  id: string;
  name: string;
  template_id: string;
  target_count: number;
  sent_count: number;
  status: 'pending' | 'scheduled' | 'sending' | 'completed' | 'failed';
  created_at: string;
  scheduled_at?: string;
}

export const useCartAbandonmentEmails = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { shouldSendEmail } = useEmailSettings();

  // Get abandoned carts
  const { data: abandonedCarts, isLoading: loadingCarts } = useQuery({
    queryKey: ['abandoned-carts'],
    queryFn: async (): Promise<AbandonedCart[]> => {
      const abandonedThreshold = new Date();
      abandonedThreshold.setHours(abandonedThreshold.getHours() - 24);

      const { data, error } = await supabase
        .from('quotes')
        .select(`
          id,
          user_id,
          email,
          final_total_local,
          updated_at,
          quantity,
          product_name,
          image_url
        `)
        .eq('in_cart', true)
        .lt('updated_at', abandonedThreshold.toISOString())
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 300000, // 5 minutes
  });

  // Get email templates
  const { data: emailTemplates, isLoading: loadingTemplates } = useQuery({
    queryKey: ['email-templates'],
    queryFn: async (): Promise<EmailTemplate[]> => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching email templates:', error);
        // Return default templates as fallback
        return [
          {
            id: 'default-abandonment',
            name: 'Default Abandonment Recovery',
            subject: 'Complete Your Purchase - Your Cart is Waiting!',
            html_content: `Hi there!

We noticed you left some items in your cart. Don't let them get away!

Your cart contains {product_name} worth {cart_value}.

Complete your purchase now and enjoy your items!

Best regards,
The Team`,
            template_type: 'cart_abandonment',
            is_active: true
          },
          {
            id: 'discount-abandonment',
            name: 'Abandonment with Discount',
            subject: 'Special Offer - 10% Off Your Abandoned Cart!',
            html_content: `Hi there!

We noticed you left some items in your cart. As a special offer, we're giving you 10% off!

Your cart contains {product_name} worth {cart_value}.
With your discount: {discounted_value}

Use code: ABANDON10

Complete your purchase now!

Best regards,
The Team`,
            template_type: 'cart_abandonment',
            is_active: true
          }
        ];
      }
      
      return data || [];
    }
  });

  // Get email campaigns
  const { data: emailCampaigns, isLoading: loadingCampaigns } = useQuery({
    queryKey: ['email-campaigns'],
    queryFn: async (): Promise<EmailCampaign[]> => {
      // For now, return mock data
      // In a real implementation, these would come from a database table
      return [
        {
          id: '1',
          name: 'Weekly Abandonment Recovery',
          template_id: 'default-abandonment',
          target_count: 45,
          sent_count: 42,
          status: 'completed',
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          name: 'Discount Recovery Campaign',
          template_id: 'discount-abandonment',
          target_count: 23,
          sent_count: 0,
          status: 'scheduled',
          created_at: new Date().toISOString(),
          scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }
      ];
    }
  });

  // Send abandonment email
  const sendAbandonmentEmailMutation = useMutation({
    mutationFn: async ({ email, templateName, cartData }: { email: string; templateName: string; cartData: Record<string, unknown> }) => {
      // Check if cart abandonment emails are enabled
      if (!shouldSendEmail('cart_abandonment')) {
        console.log('Cart abandonment emails are disabled');
        return { skipped: true, message: 'Cart abandonment emails are disabled' };
      }

      const accessToken = await supabase.auth.getSession().then(({ data }) => data.session?.access_token);
      
      if (!accessToken) {
        throw new Error('User not authenticated - cannot send email');
      }

      // Use Supabase Edge Function instead of /api/send-email
      const { data: result, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: email,
          subject: 'Complete Your Purchase - Your Cart is Waiting!',
          html: generateCartAbandonmentHtml(templateName, cartData),
          from: 'noreply@whyteclub.com'
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
          title: 'Email skipped',
          description: data.message,
        });
      } else {
        toast({
          title: 'Email sent successfully',
          description: 'Cart abandonment email has been sent.',
        });
      }
      queryClient.invalidateQueries({ queryKey: ['abandoned-carts'] });
    },
    onError: (error) => {
      toast({
        title: 'Error sending email',
        description: error.message || 'Failed to send cart abandonment email.',
        variant: 'destructive',
      });
    },
  });

  // Helper function to generate cart abandonment email HTML
  const generateCartAbandonmentHtml = (templateName: string, cartData: Record<string, unknown>) => {
    const baseHtml = `
      <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">Complete Your Purchase</h2>
    `;

    let content = '';
    if (templateName.includes('discount')) {
      content = `
        <p>Hi there!</p>
        <p>We noticed you left some items in your cart. As a special offer, we're giving you 10% off!</p>
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Your Cart Items</h3>
          <p><strong>Product:</strong> ${cartData.product_name || 'Your items'}</p>
          <p><strong>Original Value:</strong> $${cartData.cart_value || '0'}</p>
          <p><strong>With Discount:</strong> $${cartData.discounted_value || '0'}</p>
          <p><strong>Use Code:</strong> ABANDON10</p>
        </div>
        <p>Complete your purchase now and enjoy your items!</p>
      `;
    } else {
      content = `
        <p>Hi there!</p>
        <p>We noticed you left some items in your cart. Don't let them get away!</p>
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Your Cart Items</h3>
          <p><strong>Product:</strong> ${cartData.product_name || 'Your items'}</p>
          <p><strong>Value:</strong> $${cartData.cart_value || '0'}</p>
        </div>
        <p>Complete your purchase now and enjoy your items!</p>
      `;
    }

    return baseHtml + content + `
          <p>Best regards,<br>The WishBag Team</p>
        </div>
      </body>
      </html>
    `;
  };

  // Send bulk recovery emails
  const sendBulkRecoveryEmails = useMutation({
    mutationFn: async ({ 
      cartIds, 
      templateId, 
      delayBetweenEmails = 1000 
    }: { 
      cartIds: string[]; 
      templateId: string; 
      delayBetweenEmails?: number;
    }) => {
      const results = [];
      
      for (const cartId of cartIds) {
        try {
          const result = await sendAbandonmentEmailMutation.mutateAsync({ email: cartId, templateName: templateId });
          results.push({ cartId, success: true, result });
          
          // Add delay between emails to avoid rate limiting
          if (delayBetweenEmails > 0) {
            await new Promise(resolve => setTimeout(resolve, delayBetweenEmails));
          }
        } catch (error) {
          results.push({ cartId, success: false, error });
        }
      }

      return results;
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;
      
      if (successCount > 0) {
        toast.success(`Sent ${successCount} recovery emails successfully`);
      }
      if (failureCount > 0) {
        toast.error(`${failureCount} emails failed to send`);
      }
      
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
    },
    onError: (error) => {
      toast.error('Failed to send bulk recovery emails');
      console.error('Bulk email sending error:', error);
    }
  });

  // Create email campaign
  const createEmailCampaign = useMutation({
    mutationFn: async (campaign: Omit<EmailCampaign, 'id' | 'created_at'>) => {
      // In a real implementation, this would save to database
      const newCampaign: EmailCampaign = {
        ...campaign,
        id: `campaign_${Date.now()}`,
        created_at: new Date().toISOString(),
      };

      console.log('Creating campaign:', newCampaign);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      return newCampaign;
    },
    onSuccess: () => {
      toast.success('Email campaign created successfully');
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
    },
    onError: (error) => {
      toast.error('Failed to create email campaign');
      console.error('Campaign creation error:', error);
    }
  });

  // Get abandonment analytics
  const { data: abandonmentAnalytics } = useQuery({
    queryKey: ['abandonment-analytics'],
    queryFn: async () => {
      if (!abandonedCarts) return null;

      const totalAbandoned = abandonedCarts.length;
      const totalValue = abandonedCarts.reduce((sum, cart) => sum + cart.final_total_local, 0);
      const averageValue = totalAbandoned > 0 ? totalValue / totalAbandoned : 0;

      // Group by time periods
      const now = new Date();
      const last24h = abandonedCarts.filter(cart => {
        const cartDate = new Date(cart.updated_at);
        return now.getTime() - cartDate.getTime() <= 24 * 60 * 60 * 1000;
      });

      const last7d = abandonedCarts.filter(cart => {
        const cartDate = new Date(cart.updated_at);
        return now.getTime() - cartDate.getTime() <= 7 * 24 * 60 * 60 * 1000;
      });

      return {
        totalAbandoned,
        totalValue,
        averageValue,
        last24h: last24h.length,
        last7d: last7d.length,
        recoveryRate: 0.15, // Mock recovery rate
        averageTimeToAbandon: 24, // hours
      };
    },
    enabled: !!abandonedCarts
  });

  return {
    // Data
    abandonedCarts,
    emailTemplates,
    emailCampaigns,
    abandonmentAnalytics,
    
    // Loading states
    loadingCarts,
    loadingTemplates,
    loadingCampaigns,
    
    // Mutations
    sendAbandonmentEmail: sendAbandonmentEmailMutation.mutate,
    sendBulkRecoveryEmails,
    createEmailCampaign,
    
    // Utilities
    getAbandonedCartsCount: () => abandonedCarts?.length || 0,
    getTotalAbandonedValue: () => abandonedCarts?.reduce((sum, cart) => sum + cart.final_total_local, 0) || 0,
    isSending: sendAbandonmentEmailMutation.isPending,
  };
}; 