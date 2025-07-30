import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tables, TablesUpdate } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';

type CountrySetting = Tables<'country_settings'>;
export type CountryFormData = Omit<CountrySetting, 'created_at' | 'updated_at'>;

export const useCountrySettings = () => {
  const [editingCountry, setEditingCountry] = useState<CountrySetting | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Debug logging for state changes
  useEffect(() => {
    console.log('useCountrySettings state changed:', {
      isCreating,
      editingCountry: editingCountry?.code
    });
  }, [isCreating, editingCountry]);

  const {
    data: countries,
    isLoading,
    error: queryError
  } = useQuery({
    queryKey: ['country-settings'],
    queryFn: async () => {
      console.log('Fetching country settings...');
      console.log('Current user:', user?.id);
      console.log('Is admin:', !!user);
      
      const { data, error } = await supabase.from('country_settings').select('*').order('name');

      if (error) {
        console.error('Error fetching country settings:', error);
        throw new Error(`Failed to fetch country settings: ${error.message}`);
      }

      console.log('Country settings fetched:', data?.length || 0);
      return data;
    },
    retry: 3,
    retryDelay: 1000,
    // Since country_settings has public read access, we can fetch immediately
    enabled: true
  });

  const createMutation = useMutation({
    mutationFn: async (countryData: CountryFormData) => {
      // Validate required fields
      if (!countryData.code || !countryData.name || !countryData.currency) {
        throw new Error('Missing required fields: code, name, and currency are required');
      }

      const { error } = await supabase.from('country_settings').insert(countryData);

      if (error) {
        console.error('Error creating country setting:', error);
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['country-settings'] });
      setIsCreating(false);
      setEditingCountry(null);
      toast({
        title: 'Success',
        description: 'Country setting created successfully'
      });
    },
    onError: (error) => {
      console.error('Mutation error:', error);
      toast({
        title: 'Error creating country setting',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (countryData: CountryFormData) => {
      // Validate required fields
      if (!countryData.code || !countryData.name || !countryData.currency) {
        throw new Error('Missing required fields: code, name, and currency are required');
      }

      const { error } = await supabase
        .from('country_settings')
        .update(countryData)
        .eq('code', countryData.code);

      if (error) {
        console.error('Error updating country setting:', error);
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['country-settings'] });
      setEditingCountry(null);
      toast({
        title: 'Success',
        description: 'Country setting updated successfully'
      });
    },
    onError: (error) => {
      console.error('Update mutation error:', error);
      toast({
        title: 'Error updating country setting',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (code: string) => {
      const { error } = await supabase.from('country_settings').delete().eq('code', code);

      if (error) {
        console.error('Error deleting country setting:', error);
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['country-settings'] });
      toast({
        title: 'Success',
        description: 'Country setting deleted successfully'
      });
    },
    onError: (error) => {
      console.error('Delete mutation error:', error);
      toast({
        title: 'Error deleting country setting',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const deleteCountryWithConfirmation = (code: string) => {
    const country = countries?.find(c => c.code === code);
    const countryName = country?.display_name || country?.name || code;
    
    const confirmed = window.confirm(
      `Are you sure you want to delete ${countryName}?\n\nThis action cannot be undone and will remove all settings for this country.`
    );
    
    if (confirmed) {
      deleteMutation.mutate(code);
    }
  };

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ countryCodes, updates }: { countryCodes: string[], updates: Partial<CountrySetting> }) => {
      console.log('Bulk updating countries:', countryCodes, 'with updates:', updates);
      
      const { data, error } = await supabase
        .from('country_settings')
        .update(updates)
        .in('code', countryCodes)
        .select();

      if (error) {
        console.error('Error bulk updating country settings:', error);
        throw new Error(error.message);
      }

      return { data, countryCodes, updates };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['country-settings'] });
      // Don't show toast here - let the component handle it for better UX control
    },
    onError: (error) => {
      console.error('Bulk update mutation error:', error);
      // Don't show toast here - let the component handle it for better UX control
    }
  });

  const handleAddNewClick = () => {
    console.log('handleAddNewClick called - setting isCreating to true');
    setIsCreating(true);
    setEditingCountry(null);
    console.log('State should now be: isCreating=true, editingCountry=null');
  };

  const handleEditClick = (country: CountrySetting) => {
    setEditingCountry(country);
    setIsCreating(false);
  };

  const handleCancelClick = () => {
    setEditingCountry(null);
    setIsCreating(false);
  };

  const handleSubmit = (dataFromForm: CountryFormData) => {
    if (editingCountry) {
      updateMutation.mutate(dataFromForm);
    } else {
      createMutation.mutate(dataFromForm);
    }
  };

  // Debug logging for errors
  if (queryError) {
    console.error('Country settings query error:', queryError);
  }

  return {
    countries,
    isLoading,
    error: queryError,
    editingCountry,
    isCreating: isCreating,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isBulkUpdating: bulkUpdateMutation.isPending,
    handleAddNewClick,
    handleEditClick,
    handleCancelClick,
    handleSubmit,
    deleteCountry: deleteCountryWithConfirmation,
    bulkUpdateCountries: bulkUpdateMutation.mutate
  };
};
