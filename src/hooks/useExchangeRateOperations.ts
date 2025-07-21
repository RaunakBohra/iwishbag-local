import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

/**
 * Simple hook to provide exchange rate refresh functionality
 * Replaces the complex exchange rate operations after currency system simplification
 */
export const useExchangeRateOperations = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const triggerUpdate = async () => {
    try {
      setIsUpdating(true);

      // Clear relevant caches to force refetch of country settings
      await queryClient.invalidateQueries({ queryKey: ['countries'] });
      await queryClient.invalidateQueries({ queryKey: ['country-settings'] });

      toast({
        title: 'Exchange rates refreshed',
        description: 'Country settings and exchange rates have been updated.',
      });
    } catch (error) {
      console.error('Error refreshing exchange rates:', error);
      toast({
        title: 'Error refreshing rates',
        description: 'Failed to refresh exchange rates. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    triggerUpdate,
    isUpdating,
  };
};
