import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables, TablesUpdate } from "@/integrations/supabase/types";

type CountrySetting = Tables<'country_settings'>;
export type CountryFormData = Omit<CountrySetting, 'created_at' | 'updated_at'>;

export const useCountrySettings = () => {
  const [editingCountry, setEditingCountry] = useState<CountrySetting | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: countries, isLoading } = useQuery({
    queryKey: ['country-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('country_settings')
        .select('*')
        .order('name');
      if (error) throw new Error(error.message);
      return data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (countryData: CountryFormData) => {
      const { error } = await supabase
        .from('country_settings')
        .insert(countryData);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['country-settings'] });
      setIsCreating(false);
      setEditingCountry(null);
      toast({ title: "Country setting created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error creating country setting", description: error.message, variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (countryData: CountryFormData) => {
      const { error } = await supabase
        .from('country_settings')
        .update(countryData)
        .eq('code', countryData.code);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['country-settings'] });
      setEditingCountry(null);
      toast({ title: "Country setting updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error updating country setting", description: error.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (code: string) => {
      const { error } = await supabase
        .from('country_settings')
        .delete()
        .eq('code', code);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['country-settings'] });
      toast({ title: "Country setting deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Error deleting country setting", description: error.message, variant: "destructive" });
    }
  });

  const handleAddNewClick = () => {
    setIsCreating(true);
    setEditingCountry(null);
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

  return {
    countries,
    isLoading,
    editingCountry,
    isCreating,
    handleAddNewClick,
    handleEditClick,
    handleCancelClick,
    handleSubmit,
    deleteCountry: deleteMutation.mutate,
  };
};
