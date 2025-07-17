import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ShippingAddress, AddressPermissionCheck, AddressFormData } from '@/types/address';
import {
  updateQuoteAddress,
  checkAddressPermissions,
  createInitialAddress,
  lockAddressAfterPayment,
  unlockAddress,
  getAddressHistory,
} from '@/lib/addressUpdates';
import { validateAddress, normalizeAddress } from '@/lib/addressValidation';
import { useToast } from '@/components/ui/use-toast';

interface UseQuoteAddressOptions {
  quoteId: string;
  autoRefresh?: boolean;
}

export function useQuoteAddress({ quoteId, autoRefresh = true }: UseQuoteAddressOptions) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  // Fetch quote with address data
  const {
    data: quote,
    isLoading: quoteLoading,
    error: quoteError,
  } = useQuery({
    queryKey: ['quote-address', quoteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotes')
        .select(
          `
          id,
          shipping_address,
          address_locked,
          address_updated_at,
          address_updated_by,
          status,
          user_id,
          destination_country
        `,
        )
        .eq('id', quoteId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!quoteId,
    refetchInterval: autoRefresh ? 5000 : false,
  });

  // Fetch address permissions
  const { data: permissions, isLoading: permissionsLoading } = useQuery({
    queryKey: ['quote-address-permissions', quoteId, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      return await checkAddressPermissions(quoteId, user.id);
    },
    enabled: !!quoteId && !!user?.id,
  });

  // Fetch address history
  const { data: addressHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['quote-address-history', quoteId],
    queryFn: async () => {
      const result = await getAddressHistory(quoteId);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    enabled: !!quoteId,
  });

  // Update address mutation
  const updateAddressMutation = useMutation({
    mutationFn: async ({ address, reason }: { address: ShippingAddress; reason?: string }) => {
      if (!user?.id) throw new Error('User not authenticated');
      return await updateQuoteAddress(quoteId, address, user.id, reason);
    },
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: 'Address Updated',
          description: 'Your shipping address has been updated successfully.',
        });
        queryClient.invalidateQueries({ queryKey: ['quote-address', quoteId] });
        queryClient.invalidateQueries({
          queryKey: ['quote-address-history', quoteId],
        });
        setIsEditing(false);
      } else {
        toast({
          title: 'Update Failed',
          description: result.error || 'Failed to update address',
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Create initial address mutation
  const createAddressMutation = useMutation({
    mutationFn: async (address: ShippingAddress) => {
      if (!user?.id) throw new Error('User not authenticated');
      return await createInitialAddress(quoteId, address, user.id);
    },
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: 'Address Added',
          description: 'Shipping address has been added to your quote.',
        });
        queryClient.invalidateQueries({ queryKey: ['quote-address', quoteId] });
        queryClient.invalidateQueries({
          queryKey: ['quote-address-history', quoteId],
        });
        setIsEditing(false);
      } else {
        toast({
          title: 'Failed to Add Address',
          description: result.error || 'Failed to add address',
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Add Address',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Lock address mutation
  const lockAddressMutation = useMutation({
    mutationFn: async () => {
      return await lockAddressAfterPayment(quoteId);
    },
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: 'Address Locked',
          description: 'Address has been locked after payment completion.',
        });
        queryClient.invalidateQueries({ queryKey: ['quote-address', quoteId] });
      } else {
        toast({
          title: 'Failed to Lock Address',
          description: result.error || 'Failed to lock address',
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Lock Address',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Unlock address mutation (admin only)
  const unlockAddressMutation = useMutation({
    mutationFn: async (reason?: string) => {
      if (!user?.id) throw new Error('User not authenticated');
      return await unlockAddress(quoteId, user.id, reason);
    },
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: 'Address Unlocked',
          description: 'Address has been unlocked and can now be modified.',
        });
        queryClient.invalidateQueries({ queryKey: ['quote-address', quoteId] });
        queryClient.invalidateQueries({
          queryKey: ['quote-address-history', quoteId],
        });
      } else {
        toast({
          title: 'Failed to Unlock Address',
          description: result.error || 'Failed to unlock address',
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Unlock Address',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Validation function
  const validateAddressData = (address: AddressFormData) => {
    const normalizedAddress = normalizeAddress(address);
    return validateAddress(normalizedAddress);
  };

  // Check if address exists
  const hasAddress = quote?.shipping_address && Object.keys(quote.shipping_address).length > 0;

  // Check if address is locked
  const isAddressLocked = quote?.address_locked || false;

  // Check if user can edit
  const canEdit = permissions?.canEdit && !isAddressLocked;

  // Check if user can change country
  const canChangeCountry = permissions?.canChangeCountry;

  // Get current address
  const currentAddress = quote?.shipping_address as ShippingAddress | undefined;

  // Format address for display
  const formatAddress = (address: ShippingAddress) => {
    const parts = [
      address.fullName,
      address.streetAddress,
      address.city,
      address.state,
      address.postalCode,
      address.country,
    ].filter(Boolean);
    return parts.join(', ');
  };

  return {
    // Data
    quote,
    currentAddress,
    permissions,
    addressHistory,
    hasAddress,
    isAddressLocked,
    canEdit,
    canChangeCountry,

    // Loading states
    quoteLoading,
    permissionsLoading,
    historyLoading,
    isUpdating: updateAddressMutation.isPending,
    isCreating: createAddressMutation.isPending,
    isLocking: lockAddressMutation.isPending,
    isUnlocking: unlockAddressMutation.isPending,

    // Error states
    quoteError,

    // Actions
    updateAddress: updateAddressMutation.mutate,
    createAddress: createAddressMutation.mutate,
    lockAddress: lockAddressMutation.mutate,
    unlockAddress: unlockAddressMutation.mutate,
    validateAddress: validateAddressData,
    formatAddress,

    // UI state
    isEditing,
    setIsEditing,

    // Utilities
    refresh: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-address', quoteId] });
      queryClient.invalidateQueries({
        queryKey: ['quote-address-history', quoteId],
      });
    },
  };
}
