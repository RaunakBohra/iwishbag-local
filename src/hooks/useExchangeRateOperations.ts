import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useExchangeRateOperations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const triggerUpdateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('update-exchange-rates', {
        body: { manual: true }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['country-settings'] }); // Invalidate country settings query
      toast({
        title: "Success",
        description: "Exchange rates updated successfully.",
      });
    },
    onError: (error: Error) => {
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
      return null;
    }
  };

  return {
    triggerUpdate: triggerUpdateMutation.mutate,
    isUpdating: triggerUpdateMutation.isPending,
    getLastUpdateInfo,
  };
};
