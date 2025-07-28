import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Tables } from '@/integrations/supabase/types';

interface UseAddressManagementOptions {
  autoSelectDefault?: boolean;
  countryFilter?: string;
}

export function useAddressManagement(options: UseAddressManagementOptions = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  // Fetch user addresses
  const {
    data: addresses,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['user_addresses', user?.id, options.countryFilter],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (options.countryFilter) {
        query = query.eq('destination_country', options.countryFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Auto-select default address
  useEffect(() => {
    if (options.autoSelectDefault && addresses && addresses.length > 0 && !selectedAddressId) {
      const defaultAddress = addresses.find(a => a.is_default) || addresses[0];
      setSelectedAddressId(defaultAddress.id);
    }
  }, [addresses, options.autoSelectDefault, selectedAddressId]);

  // Create address mutation
  const createAddressMutation = useMutation({
    mutationFn: async (addressData: Omit<Tables<'user_addresses'>, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => {
      if (!user) throw new Error('User not authenticated');

      // If setting as default, unset other defaults
      if (addressData.is_default) {
        await supabase
          .from('user_addresses')
          .update({ is_default: false })
          .eq('user_id', user.id);
      }

      const { data, error } = await supabase
        .from('user_addresses')
        .insert({
          ...addressData,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (newAddress) => {
      queryClient.invalidateQueries({ queryKey: ['user_addresses', user?.id] });
      toast({
        title: 'Address added',
        description: 'Your new address has been saved.',
      });
      setSelectedAddressId(newAddress.id);
    },
    onError: (error) => {
      toast({
        title: 'Error adding address',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update address mutation
  const updateAddressMutation = useMutation({
    mutationFn: async ({ 
      id, 
      ...addressData 
    }: Partial<Tables<'user_addresses'>> & { id: string }) => {
      if (!user) throw new Error('User not authenticated');

      // If setting as default, unset other defaults
      if (addressData.is_default) {
        await supabase
          .from('user_addresses')
          .update({ is_default: false })
          .eq('user_id', user.id)
          .neq('id', id);
      }

      const { data, error } = await supabase
        .from('user_addresses')
        .update(addressData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_addresses', user?.id] });
      toast({
        title: 'Address updated',
        description: 'Your address has been updated.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error updating address',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete address mutation
  const deleteAddressMutation = useMutation({
    mutationFn: async (addressId: string) => {
      const { error } = await supabase
        .from('user_addresses')
        .delete()
        .eq('id', addressId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_addresses', user?.id] });
      toast({
        title: 'Address deleted',
        description: 'Your address has been removed.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error deleting address',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Set default address
  const setDefaultAddress = async (addressId: string) => {
    await updateAddressMutation.mutateAsync({
      id: addressId,
      is_default: true,
    });
  };

  // Get selected address
  const selectedAddress = addresses?.find(a => a.id === selectedAddressId);

  // Check if user has addresses
  const hasAddresses = (addresses?.length ?? 0) > 0;

  // Get default address
  const defaultAddress = addresses?.find(a => a.is_default) || addresses?.[0];

  return {
    // Data
    addresses: addresses ?? [],
    selectedAddress,
    selectedAddressId,
    defaultAddress,
    hasAddresses,
    
    // Loading states
    isLoading,
    error,
    
    // Actions
    selectAddress: setSelectedAddressId,
    createAddress: createAddressMutation.mutate,
    updateAddress: updateAddressMutation.mutate,
    deleteAddress: deleteAddressMutation.mutate,
    setDefaultAddress,
    
    // Mutation states
    isCreating: createAddressMutation.isPending,
    isUpdating: updateAddressMutation.isPending,
    isDeleting: deleteAddressMutation.isPending,
  };
}