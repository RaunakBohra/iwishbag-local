import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ShippingAddress } from '@/types/address';
import { unifiedToDeliveryAddress, shippingAddressToUnified } from '@/lib/addressUtils';

export const useAddressSynchronization = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  const saveQuoteAddressToProfile = useMutation({
    mutationFn: async ({
      address,
      setAsDefault = false,
    }: {
      address: ShippingAddress;
      setAsDefault?: boolean;
    }) => {
      if (!user?.id) {
        throw new Error('User must be logged in to save address');
      }

      // Convert shipping address to unified format
      const unifiedAddress = shippingAddressToUnified(address);

      // Check if address already exists for this user
      const { data: existingAddresses } = await supabase
        .from('delivery_addresses')
        .select('*')
        .eq('user_id', user.id)
        .eq('address_line1', unifiedAddress.addressLine1)
        .eq('city', unifiedAddress.city)
        .eq('postal_code', unifiedAddress.postalCode)
        .eq('destination_country', unifiedAddress.countryCode);

      if (existingAddresses && existingAddresses.length > 0) {
        throw new Error('This address already exists in your profile');
      }

      // If setting as default, unset other defaults first
      if (setAsDefault) {
        await supabase
          .from('delivery_addresses')
          .update({ is_default: false })
          .eq('user_id', user.id)
          .eq('is_default', true);
      }

      // Convert to user address format and save
      const userAddress = unifiedToDeliveryAddress(
        {
          ...unifiedAddress,
          isDefault: setAsDefault,
        },
        user.id,
      );

      const { data, error } = await supabase
        .from('delivery_addresses')
        .insert(userAddress)
        .select()
        .single();

      if (error) throw error;

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['addresses', user?.id] });
      toast({
        title: 'Success',
        description: 'Address saved to your profile',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save address',
        variant: 'destructive',
      });
    },
  });

  const syncQuoteAddressesWithProfile = useMutation({
    mutationFn: async ({ quoteIds }: { quoteIds: string[] }) => {
      if (!user?.id) {
        throw new Error('User must be logged in to sync addresses');
      }

      // Get quotes with addresses
      const { data: quotes, error: quotesError } = await supabase
        .from('quotes')
        .select('id, shipping_address, destination_country')
        .in('id', quoteIds)
        .eq('user_id', user.id)
        .not('shipping_address', 'is', null);

      if (quotesError) throw quotesError;

      const results = {
        synced: 0,
        skipped: 0,
        errors: 0,
      };

      for (const quote of quotes || []) {
        try {
          if (!quote.shipping_address) continue;

          const shippingAddress =
            typeof quote.shipping_address === 'string'
              ? JSON.parse(quote.shipping_address)
              : quote.shipping_address;

          // Ensure country matches quote's destination
          if (shippingAddress.country !== quote.destination_country) {
            shippingAddress.country = quote.destination_country;
          }

          await saveQuoteAddressToProfile.mutateAsync({
            address: shippingAddress,
            setAsDefault: false,
          });

          results.synced++;
        } catch (error) {
          console.error(`Failed to sync address from quote ${quote.id}:`, error);
          results.errors++;
        }
      }

      return results;
    },
    onSuccess: (results) => {
      toast({
        title: 'Sync Complete',
        description: `Synced ${results.synced} addresses. ${results.errors > 0 ? `${results.errors} errors occurred.` : ''}`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Sync Failed',
        description: 'Failed to sync addresses with profile',
        variant: 'destructive',
      });
    },
  });

  return {
    saveQuoteAddressToProfile,
    syncQuoteAddressesWithProfile,
    isSaving: saveQuoteAddressToProfile.isPending || syncQuoteAddressesWithProfile.isPending,
  };
};
