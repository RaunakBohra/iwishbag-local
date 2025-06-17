
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";

type FooterSettingsData = Omit<Tables<'footer_settings'>, 'created_at' | 'updated_at' | 'id'>;

export const useFooterSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: footerSettings, isLoading } = useQuery({
    queryKey: ['footer-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('footer_settings')
        .select('*')
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const [formData, setFormData] = useState<FooterSettingsData>({
    company_name: '',
    company_description: '',
    primary_phone: '',
    secondary_phone: '',
    primary_email: '',
    support_email: '',
    primary_address: '',
    secondary_address: '',
    business_hours: '',
    social_twitter: '',
    social_facebook: '',
    social_instagram: '',
    social_linkedin: '',
  });

  useEffect(() => {
    if (footerSettings) {
      setFormData({
        company_name: footerSettings.company_name || '',
        company_description: footerSettings.company_description || '',
        primary_phone: footerSettings.primary_phone || '',
        secondary_phone: footerSettings.secondary_phone || '',
        primary_email: footerSettings.primary_email || '',
        support_email: footerSettings.support_email || '',
        primary_address: footerSettings.primary_address || '',
        secondary_address: footerSettings.secondary_address || '',
        business_hours: footerSettings.business_hours || '',
        social_twitter: footerSettings.social_twitter || '',
        social_facebook: footerSettings.social_facebook || '',
        social_instagram: footerSettings.social_instagram || '',
        social_linkedin: footerSettings.social_linkedin || '',
      });
    }
  }, [footerSettings]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: FooterSettingsData) => {
      const { error } = await supabase
        .from('footer_settings')
        .update(data)
        .eq('id', footerSettings?.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Settings updated",
        description: "Footer settings have been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ['footer-settings'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update footer settings. Please try again.",
        variant: "destructive",
      });
      console.error('Error updating footer settings:', error);
    },
  });

  const handleInputChange = (field: keyof FooterSettingsData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate(formData);
  };

  return {
    isLoading,
    formData,
    isUpdating: updateSettingsMutation.isPending,
    handleInputChange,
    handleSubmit,
  };
};

