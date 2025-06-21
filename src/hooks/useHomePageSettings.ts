import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";

type HomePageSettingsData = Omit<Tables<'footer_settings'>, 'created_at' | 'updated_at' | 'id'>;

export const useHomePageSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: homePageSettings, isLoading, error, refetch } = useQuery({
    queryKey: ['home-page-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('footer_settings')
        .select('*')
        .single();
      if (error) {
        console.error('Error fetching footer settings:', error);
        toast({ title: 'Error fetching settings', description: error.message, variant: 'destructive' });
        return null;
      }
      console.log('Fetched footer settings:', data);
      return data;
    },
    staleTime: 0, // Always fetch fresh data
    refetchOnWindowFocus: true, // Refetch when window gains focus
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
    hero_banner_url: '',
    hero_headline: '',
    hero_subheadline: '',
    hero_cta_text: '',
    hero_cta_link: '',
    how_it_works_steps: null,
    value_props: null,
    contact_email: '',
  });

  useEffect(() => {
    if (homePageSettings) {
      console.log('Updating form data with:', homePageSettings);
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
        hero_banner_url: homePageSettings.hero_banner_url || '',
        hero_headline: homePageSettings.hero_headline || '',
        hero_subheadline: homePageSettings.hero_subheadline || '',
        hero_cta_text: homePageSettings.hero_cta_text || '',
        hero_cta_link: homePageSettings.hero_cta_link || '',
        how_it_works_steps: homePageSettings.how_it_works_steps || null,
        value_props: homePageSettings.value_props || null,
        contact_email: homePageSettings.contact_email || '',
      });
    }
  }, [homePageSettings]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: HomePageSettingsData) => {
      console.log('Updating settings with data:', data);
      let id = homePageSettings?.id;
      if (!id) {
        const { data: row } = await supabase.from('footer_settings').select('id').single();
        id = row?.id;
      }
      
      if (!id) {
        throw new Error('No footer settings record found');
      }
      
      const { data: updatedData, error } = await supabase
        .from('footer_settings')
        .update(data)
        .eq('id', id)
        .select()
        .single();
        
      if (error) {
        console.error('Error updating footer settings:', error);
        throw error;
      }
      
      if (!updatedData) {
        throw new Error('No data returned after update');
      }
      
      console.log('Settings updated successfully, returned data:', updatedData);
      return updatedData;
    },
    onSuccess: (updatedData) => {
      console.log('Mutation succeeded, updating cache with:', updatedData);
      // Update the cache directly with the new data
      queryClient.setQueryData(['home-page-settings'], updatedData);
      // Also invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['home-page-settings'] });
      // Force a refetch to ensure all components get the latest data
      refetch();
      toast({ title: 'Settings updated', description: 'Home page settings updated successfully.' });
    },
    onError: (error: any) => {
      console.error('Mutation error:', error);
      toast({ title: 'Error updating settings', description: error.message, variant: 'destructive' });
    },
  });

  const handleInputChange = (field: keyof HomePageSettingsData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting form data:', formData);
    updateSettingsMutation.mutate(formData);
  };

  return {
    settings: homePageSettings,
    loading: isLoading,
    error,
    formData,
    isUpdating: updateSettingsMutation.isPending,
    handleInputChange,
    handleSubmit,
    refetch,
  };
};

