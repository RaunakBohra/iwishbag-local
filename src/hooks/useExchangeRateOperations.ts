
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useExchangeRateOperations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const triggerUpdateMutation = useMutation({
    mutationFn: async () => {
      console.log("Triggering exchange rate update...");
      
      const { data, error } = await supabase.functions.invoke('update-exchange-rates', {
        body: { manual: true }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      return data;
    },
    onSuccess: (data) => {
      console.log("Exchange rate update response:", data);
      
      // Invalidate relevant queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['countries-with-markup'] });
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      
      if (data.success) {
        toast({ 
          title: "Exchange rates updated successfully",
          description: data.message || `Updated exchange rates at ${new Date().toLocaleTimeString()}`
        });
      } else {
        toast({ 
          title: "Exchange rate update completed with issues", 
          description: data.message || "Some rates may not have been updated",
          variant: "destructive" 
        });
      }
    },
    onError: (error: Error) => {
      console.error("Exchange rate update failed:", error);
      toast({ 
        title: "Failed to update exchange rates", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const getLastUpdateInfo = async () => {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('setting_value, description')
        .eq('setting_key', 'last_exchange_rate_update')
        .single();
      
      return data;
    } catch (error) {
      console.error("Failed to get last update info:", error);
      return null;
    }
  };

  return {
    triggerUpdate: triggerUpdateMutation.mutate,
    isUpdating: triggerUpdateMutation.isPending,
    getLastUpdateInfo,
  };
};
