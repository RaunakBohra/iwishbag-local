import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export const useSystemSettings = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  // Check user role for admin access
  const { data: userRole } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      console.log('Checking user role for system settings:', user.id);
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        console.error('Error checking user role:', error);
        return null;
      }
      
      console.log('User role for system settings:', data);
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      console.log('Fetching system settings...');
      console.log('Current user:', user?.id);
      console.log('User role:', userRole?.role);
      
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('setting_key');
      
      if (error) {
        console.error('Error fetching system settings:', error);
        throw new Error(`Failed to fetch system settings: ${error.message}`);
      }
      
      console.log('System settings fetched:', data?.length || 0);
      return data as SystemSetting[];
    },
    enabled: !!user?.id && !!userRole, // Only run when user and user role are loaded
  });

  const updateSettingMutation = useMutation({
    mutationFn: async ({ settingKey, value }: { settingKey: string; value: string }) => {
      const { error } = await supabase
        .from('system_settings')
        .update({ setting_value: value })
        .eq('setting_key', settingKey);
      
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      toast({ title: "Setting updated successfully" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error updating setting", 
        description: error.message, 
        variant: "destructive" 
      });
    },
    onSettled: () => {
      setIsUpdating(false);
    },
  });

  const updateSetting = async (settingKey: string, value: string) => {
    setIsUpdating(true);
    updateSettingMutation.mutate({ settingKey, value });
  };

  const getSetting = (key: string): string => {
    const setting = settings?.find(s => s.setting_key === key);
    return setting?.setting_value || '';
  };

  const getBooleanSetting = (key: string): boolean => {
    return getSetting(key) === 'true';
  };

  const getNumericSetting = (key: string): number => {
    const value = getSetting(key);
    return parseFloat(value) || 0;
  };

  return {
    settings,
    isLoading,
    isUpdating,
    updateSetting,
    getSetting,
    getBooleanSetting,
    getNumericSetting,
  };
};
