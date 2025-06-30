import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface EmailSetting {
  id: string;
  setting_key: string;
  setting_value: boolean;
  description: string;
  created_at: string;
  updated_at: string;
}

export const useEmailSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all email settings
  const { data: emailSettings, isLoading } = useQuery({
    queryKey: ['email-settings'],
    queryFn: async (): Promise<EmailSetting[]> => {
      const { data, error } = await supabase
        .from('email_settings')
        .select('*')
        .order('setting_key');

      if (error) {
        console.error('Error fetching email settings:', error);
        throw error;
      }

      return data || [];
    },
  });

  // Update email setting
  const updateEmailSettingMutation = useMutation({
    mutationFn: async ({ settingKey, value }: { settingKey: string; value: boolean }) => {
      const { data, error } = await supabase
        .from('email_settings')
        .update({ setting_value: value })
        .eq('setting_key', settingKey)
        .select()
        .single();

      if (error) {
        console.error('Error updating email setting:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['email-settings'] });
      toast({
        title: 'Email setting updated',
        description: `${data.setting_key} has been ${data.setting_value ? 'enabled' : 'disabled'}`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error updating email setting',
        description: 'Failed to update email setting. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Helper functions to get specific settings
  const isEmailSendingEnabled = () => {
    const setting = emailSettings?.find(s => s.setting_key === 'email_sending_enabled');
    return setting?.setting_value ?? true;
  };

  const isCartAbandonmentEnabled = () => {
    const setting = emailSettings?.find(s => s.setting_key === 'cart_abandonment_enabled');
    return setting?.setting_value ?? true;
  };

  const isQuoteNotificationsEnabled = () => {
    const setting = emailSettings?.find(s => s.setting_key === 'quote_notifications_enabled');
    return setting?.setting_value ?? true;
  };

  const isOrderNotificationsEnabled = () => {
    const setting = emailSettings?.find(s => s.setting_key === 'order_notifications_enabled');
    return setting?.setting_value ?? true;
  };

  const isStatusNotificationsEnabled = () => {
    const setting = emailSettings?.find(s => s.setting_key === 'status_notifications_enabled');
    return setting?.setting_value ?? true;
  };

  // Helper function to check if a specific email type should be sent
  const shouldSendEmail = (emailType: 'cart_abandonment' | 'quote_notification' | 'order_notification' | 'status_notification') => {
    if (!isEmailSendingEnabled()) {
      return false;
    }

    switch (emailType) {
      case 'cart_abandonment':
        return isCartAbandonmentEnabled();
      case 'quote_notification':
        return isQuoteNotificationsEnabled();
      case 'order_notification':
        return isOrderNotificationsEnabled();
      case 'status_notification':
        return isStatusNotificationsEnabled();
      default:
        return false;
    }
  };

  return {
    emailSettings,
    isLoading,
    updateEmailSetting: updateEmailSettingMutation.mutate,
    isUpdating: updateEmailSettingMutation.isPending,
    isEmailSendingEnabled,
    isCartAbandonmentEnabled,
    isQuoteNotificationsEnabled,
    isOrderNotificationsEnabled,
    isStatusNotificationsEnabled,
    shouldSendEmail,
  };
}; 