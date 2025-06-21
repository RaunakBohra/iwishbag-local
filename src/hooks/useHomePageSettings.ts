import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";

type HomePageSettingsData = Omit<Tables<'footer_settings'>, 'created_at' | 'updated_at' | 'id'>;

export const useHomePageSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Check user role for admin access
  const { data: userRole } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      console.log('Checking user role for home page settings:', user.id);
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        console.error('Error checking user role:', error);
        return null;
      }
      
      console.log('User role for home page settings:', data);
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: homePageSettings, isLoading, error, refetch } = useQuery({
    queryKey: ['home-page-settings'],
    queryFn: async () => {
      console.log('Fetching home page settings...');
      console.log('Current user:', user?.id);
      console.log('User role:', userRole?.role);
      
      const { data, error } = await supabase
        .from('footer_settings')
        .select('*')
        .single();
      if (error) {
        console.error('Error fetching footer settings:', error);
        throw new Error(`Failed to fetch footer settings: ${error.message}`);
      }
      console.log('Home page settings fetched successfully');
      return data;
    },
    staleTime: 0, // Always fetch fresh data
    refetchOnWindowFocus: true, // Refetch when window gains focus
    enabled: !!user?.id && !!userRole, // Only run when user and user role are loaded
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
      
      return updatedData;
    },
    onSuccess: (updatedData) => {
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

