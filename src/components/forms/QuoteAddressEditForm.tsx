import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AddressEditForm } from './AddressEditForm';
import { ShippingAddress } from '@/types/address';
import { Tables } from '@/integrations/supabase/types';
import { updateQuoteAddress } from '@/lib/addressUpdates';
import { useAuth } from '@/contexts/AuthContext';

interface QuoteAddressEditFormProps {
  quoteId: string;
  currentAddress?: ShippingAddress | null;
  onSuccess?: () => void;
  quote?: Tables<'quotes'>;
}

export const QuoteAddressEditForm: React.FC<QuoteAddressEditFormProps> = ({
  quoteId,
  currentAddress,
  onSuccess,
  quote
}) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  
  console.log('[QuoteAddressEditForm] Props:', {
    quoteId,
    hasCurrentAddress: !!currentAddress,
    currentAddress,
    quoteShippingAddress: quote?.shipping_address,
    quoteCountryCode: quote?.destination_country
  });

  const updateAddressMutation = useMutation({
    mutationFn: async (address: ShippingAddress) => {
      const userId = user?.id || 'anonymous';
      const result = await updateQuoteAddress(quoteId, address, userId, 'Address updated via form');
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update address');
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote', quoteId] });
      toast({
        title: 'Success',
        description: 'Shipping address updated successfully',
      });
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update shipping address',
        variant: 'destructive',
      });
    },
  });

  // Get the destination country from the quote
  const destinationCountry = quote ? getQuoteDestinationCountry(quote) : 'US';

  // If there's no current address, create a default one with the quote's destination country
  const defaultAddress: ShippingAddress | undefined = currentAddress || (quote ? {
    fullName: '',
    streetAddress: '',
    city: '',
    state: '',
    postalCode: '',
    country: destinationCountry,
    phone: '',
    email: quote.email || ''
  } : undefined);

  return (
    <AddressEditForm
      currentAddress={defaultAddress}
      onSave={(address) => updateAddressMutation.mutate(address)}
      onCancel={() => onSuccess?.()}
      isLoading={updateAddressMutation.isPending}
      canChangeCountry={false} // Don't allow country changes for quotes
    />
  );
};

// Helper function to extract destination country from quote
function getQuoteDestinationCountry(quote: Tables<'quotes'>): string {
  // First try to get from shipping address if it exists
  if (quote.shipping_address) {
    try {
      const shippingAddress = typeof quote.shipping_address === 'string' 
        ? JSON.parse(quote.shipping_address) 
        : quote.shipping_address;
      
      // Check for destination_country first (used in admin-created quotes)
      if (shippingAddress?.destination_country) {
        // Ensure it's a valid 2-letter code
        if (/^[A-Z]{2}$/i.test(shippingAddress.destination_country)) {
          return shippingAddress.destination_country.toUpperCase();
        }
      }
      
      // Then check for country field
      if (shippingAddress?.country) {
        // If it's already a 2-letter code, return it
        if (/^[A-Z]{2}$/i.test(shippingAddress.country)) {
          return shippingAddress.country.toUpperCase();
        }
        
        // Otherwise, return as-is and let the form handle the conversion
        // The AddressEditForm will use the countries list to find the correct code
        return shippingAddress.country;
      }
    } catch (e) {
      console.warn('Could not parse shipping address:', e);
    }
  }
  
  // Try to get from country_code field
  if (quote.country_code) {
    if (/^[A-Z]{2}$/i.test(quote.country_code)) {
      return quote.country_code.toUpperCase();
    }
  }
  
  // Default to US
  return 'US';
}