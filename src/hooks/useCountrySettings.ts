import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables, TablesUpdate } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";

type CountrySetting = Tables<'country_settings'>;
export type CountryFormData = Omit<CountrySetting, 'created_at' | 'updated_at'>;

export const useCountrySettings = () => {
  const [editingCountry, setEditingCountry] = useState<CountrySetting | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  // Check user role for admin access
  const { data: userRole } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      console.log('Checking user role for country settings:', user.id);
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        console.error('Error checking user role:', error);
        return null;
      }
      
      console.log('User role for country settings:', data);
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: countries, isLoading, error: queryError } = useQuery({
    queryKey: ['country-settings'],
    queryFn: async () => {
      console.log('Fetching country settings...'); // DEBUG
      console.log('Current user:', user?.id);
      console.log('User role:', userRole?.role);
      
      const { data, error } = await supabase
        .from('country_settings')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Error fetching country settings:', error); // DEBUG
        throw new Error(`Failed to fetch country settings: ${error.message}`);
      }
      
      console.log('Country settings fetched:', data?.length || 0, 'countries'); // DEBUG
      return data;
    },
    retry: 3,
    retryDelay: 1000,
    enabled: !!user?.id && !!userRole, // Only run when user and user role are loaded
  });

  const createMutation = useMutation({
    mutationFn: async (countryData: CountryFormData) => {
      console.log('Creating country setting:', countryData); // DEBUG
      
      // Validate required fields
      if (!countryData.code || !countryData.name || !countryData.currency) {
        throw new Error('Missing required fields: code, name, and currency are required');
      }

      const { error } = await supabase
        .from('country_settings')
        .insert(countryData);
      
      if (error) {
        console.error('Error creating country setting:', error); // DEBUG
        throw new Error(error.message);
      }
      
      console.log('Country setting created successfully'); // DEBUG
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['country-settings'] });
      setIsCreating(false);
      setEditingCountry(null);
      toast({ 
        title: "Success", 
        description: "Country setting created successfully" 
      });
    },
    onError: (error) => {
      console.error('Mutation error:', error); // DEBUG
      toast({ 
        title: "Error creating country setting", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (countryData: CountryFormData) => {
      console.log('Updating country setting:', countryData); // DEBUG
      
      // Validate required fields
      if (!countryData.code || !countryData.name || !countryData.currency) {
        throw new Error('Missing required fields: code, name, and currency are required');
      }

      const { error } = await supabase
        .from('country_settings')
        .update(countryData)
        .eq('code', countryData.code);
      
      if (error) {
        console.error('Error updating country setting:', error); // DEBUG
        throw new Error(error.message);
      }
      
      console.log('Country setting updated successfully'); // DEBUG
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['country-settings'] });
      setEditingCountry(null);
      toast({ 
        title: "Success", 
        description: "Country setting updated successfully" 
      });
    },
    onError: (error) => {
      console.error('Update mutation error:', error); // DEBUG
      toast({ 
        title: "Error updating country setting", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (code: string) => {
      console.log('Deleting country setting:', code); // DEBUG
      
      const { error } = await supabase
        .from('country_settings')
        .delete()
        .eq('code', code);
      
      if (error) {
        console.error('Error deleting country setting:', error); // DEBUG
        throw new Error(error.message);
      }
      
      console.log('Country setting deleted successfully'); // DEBUG
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['country-settings'] });
      toast({ 
        title: "Success", 
        description: "Country setting deleted successfully" 
      });
    },
    onError: (error) => {
      console.error('Delete mutation error:', error); // DEBUG
      toast({ 
        title: "Error deleting country setting", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  });

  const handleAddNewClick = () => {
    console.log('Adding new country...'); // DEBUG
    setIsCreating(true);
    setEditingCountry(null);
  };

  const handleEditClick = (country: CountrySetting) => {
    console.log('Editing country:', country.code); // DEBUG
    setEditingCountry(country);
    setIsCreating(false);
  };
  
  const handleCancelClick = () => {
    console.log('Canceling edit/create...'); // DEBUG
    setEditingCountry(null);
    setIsCreating(false);
  };

  const handleSubmit = (dataFromForm: CountryFormData) => {
    console.log('Handling submit:', dataFromForm); // DEBUG
    
    if (editingCountry) {
      console.log('Updating existing country...'); // DEBUG
      updateMutation.mutate(dataFromForm);
    } else {
      console.log('Creating new country...'); // DEBUG
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
    isCreating,
    isUpdating: updateMutation.isPending,
    isCreatingMutation: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
    handleAddNewClick,
    handleEditClick,
    handleCancelClick,
    handleSubmit,
    deleteCountry: deleteMutation.mutate,
  };
};
