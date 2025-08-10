import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { currencyService } from '@/services/CurrencyService';

/**
 * Enhanced hook to provide real exchange rate update functionality
 * Calls the actual exchange rate update service and clears all relevant caches
 */
export const useExchangeRateOperations = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const triggerUpdate = async () => {
    try {
      setIsUpdating(true);
      console.log('🔄 [UpdateRates] Starting exchange rate update process...');

      // Step 1: Call the Supabase Edge Function to update rates
      console.log('🔄 [UpdateRates] Calling exchange rate update service...');
      
      const { data: functionResult, error: functionError } = await supabase.functions.invoke(
        'admin-update-exchange-rates',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (functionError) {
        console.error('❌ [UpdateRates] Function error:', functionError);
        throw new Error(`Exchange rate service error: ${functionError.message}`);
      }

      console.log('✅ [UpdateRates] Function response:', functionResult);

      // Check if the function was successful
      if (!functionResult?.success) {
        throw new Error(functionResult?.error || 'Unknown error from exchange rate service');
      }

      // Step 2: Clear all relevant caches
      console.log('🔄 [UpdateRates] Clearing caches...');
      
      // Clear CurrencyService caches
      currencyService.clearCache();
      
      // Clear React Query caches
      await queryClient.invalidateQueries({ queryKey: ['countries'] });
      await queryClient.invalidateQueries({ queryKey: ['country-settings'] });
      await queryClient.invalidateQueries({ queryKey: ['exchange-rates'] });
      await queryClient.invalidateQueries({ queryKey: ['currency'] });
      
      // Clear localStorage currency caches
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('iwishbag_currency_') || key.startsWith('iwishbag_exchange_'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.warn(`Failed to remove ${key} from localStorage:`, error);
        }
      });

      // Step 3: Show detailed success message
      const updatedCount = functionResult?.updated_count || 0;
      const d1SyncedCount = functionResult?.d1_synced_count || 0;
      const processingTime = functionResult?.processing_time_ms || 0;
      const adminUser = functionResult?.admin_user || 'Unknown';
      const adminProcessingTime = functionResult?.admin_processing_time_ms || 0;

      console.log('✅ [UpdateRates] Update completed successfully:', {
        updatedCount,
        d1SyncedCount,
        processingTime,
        adminUser,
        adminProcessingTime
      });

      toast({
        title: '🎉 Exchange Rates Updated Successfully!',
        description: `Updated ${updatedCount} countries in ${Math.round(processingTime)}ms (Admin: ${adminUser}). D1 synced: ${d1SyncedCount}.`,
      });

    } catch (error) {
      console.error('💥 [UpdateRates] Error updating exchange rates:', error);
      
      // Show specific error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      toast({
        title: '❌ Failed to Update Exchange Rates',
        description: `${errorMessage}. Please try again or check the logs.`,
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
