import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";

type HomePageSettingsData = Omit<Tables<'footer_settings'>, 'created_at' | 'updated_at' | 'id'>;

export const useHomePageSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: homePageSettings, isLoading } = useQuery({
    queryKey: ['home-page-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('footer_settings')
        .select('*')
        .single();
      if (error) {
        toast({ title: 'Error fetching settings', description: error.message, variant: 'destructive' });
        return null;
      }
      console.log("homePageSettings", data);
      return data;
    },
  });

  const [formData, setFormData] = useState<HomePageSettingsData>({
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
    website_logo_url: '',
  });

  useEffect(() => {
    if (homePageSettings) {
      setFormData({
        company_name: homePageSettings.company_name || '',
        company_description: homePageSettings.company_description || '',
        primary_phone: homePageSettings.primary_phone || '',
        secondary_phone: homePageSettings.secondary_phone || '',
        primary_email: homePageSettings.primary_email || '',
        support_email: homePageSettings.support_email || '',
        primary_address: homePageSettings.primary_address || '',
        secondary_address: homePageSettings.secondary_address || '',
        business_hours: homePageSettings.business_hours || '',
        social_twitter: homePageSettings.social_twitter || '',
        social_facebook: homePageSettings.social_facebook || '',
        social_instagram: homePageSettings.social_instagram || '',
        social_linkedin: homePageSettings.social_linkedin || '',
        website_logo_url: homePageSettings.website_logo_url || '',
      });
    }
  }, [homePageSettings]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: HomePageSettingsData) => {
      let id = homePageSettings?.id;
      if (!id) {
        const { data: row } = await supabase.from('footer_settings').select('id').single();
        id = row?.id;
      }
      const { error } = await supabase
        .from('footer_settings')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['home-page-settings']);
      toast({ title: 'Settings updated', description: 'Home page settings updated successfully.' });
    },
    onError: (error: any) => {
      toast({ title: 'Error updating settings', description: error.message, variant: 'destructive' });
    },
  });

  const handleInputChange = (field: keyof HomePageSettingsData, value: string) => {
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

