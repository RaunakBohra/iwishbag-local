import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AbandonedCart {
  id: string;
  user_id: string;
  email: string;
  final_total_local: number;
  updated_at: string;
  quantity: number;
  product_name?: string;
  product_image?: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  is_default: boolean;
}

interface EmailCampaign {
  id: string;
  name: string;
  template_id: string;
  target_count: number;
  sent_count: number;
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed';
  created_at: string;
  scheduled_at?: string;
}

export const useCartAbandonmentEmails = () => {
  const queryClient = useQueryClient();

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
          product_image
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
      // For now, return default templates
      // In a real implementation, these would come from a database table
      return [
        {
          id: 'default-abandonment',
          name: 'Default Abandonment Recovery',
          subject: 'Complete Your Purchase - Your Cart is Waiting!',
          body: `Hi there!

We noticed you left some items in your cart. Don't let them get away!

Your cart contains {product_name} worth {cart_value}.

Complete your purchase now and enjoy your items!

Best regards,
The Team`,
          is_default: true
        },
        {
          id: 'discount-abandonment',
          name: 'Abandonment with Discount',
          subject: 'Special Offer - 10% Off Your Abandoned Cart!',
          body: `Hi there!

We noticed you left some items in your cart. As a special offer, we're giving you 10% off!

Your cart contains {product_name} worth {cart_value}.
With your discount: {discounted_value}

Use code: ABANDON10

Complete your purchase now!

Best regards,
The Team`,
          is_default: false
        }
      ];
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

  // Send recovery email to specific cart
  const sendRecoveryEmail = useMutation({
    mutationFn: async ({ cartId, templateId }: { cartId: string; templateId: string }) => {
      const cart = abandonedCarts?.find(c => c.id === cartId);
      if (!cart) throw new Error('Cart not found');

      const template = emailTemplates?.find(t => t.id === templateId);
      if (!template) throw new Error('Template not found');

      // In a real implementation, this would call an email service
      // For now, we'll simulate the email sending
      console.log('Sending recovery email:', {
        to: cart.email,
        subject: template.subject,
        body: template.body
          .replace('{product_name}', cart.product_name || 'items')
          .replace('{cart_value}', `$${cart.final_total_local.toFixed(2)}`)
          .replace('{discounted_value}', `$${(cart.final_total_local * 0.9).toFixed(2)}`)
      });

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      return { success: true, messageId: `email_${Date.now()}` };
    },
    onSuccess: () => {
      toast.success('Recovery email sent successfully');
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
    },
    onError: (error) => {
      toast.error('Failed to send recovery email');
      console.error('Email sending error:', error);
    }
  });

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
          const result = await sendRecoveryEmail.mutateAsync({ cartId, templateId });
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
    sendRecoveryEmail,
    sendBulkRecoveryEmails,
    createEmailCampaign,
    
    // Utilities
    getAbandonedCartsCount: () => abandonedCarts?.length || 0,
    getTotalAbandonedValue: () => abandonedCarts?.reduce((sum, cart) => sum + cart.final_total_local, 0) || 0,
  };
}; 