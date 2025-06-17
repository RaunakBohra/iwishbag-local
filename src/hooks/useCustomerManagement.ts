
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CustomerProfile {
  id: string;
  full_name: string | null;
  cod_enabled: boolean;
  internal_notes: string | null;
  created_at: string;
  user_addresses: Array<{
    id: string;
    address_line1: string;
    address_line2: string | null;
    city: string;
    country: string;
    postal_code: string;
    is_default: boolean;
  }>;
}

interface CustomerWithEmail extends CustomerProfile {
  email: string;
}

export const useCustomerManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: customers, isLoading } = useQuery({
    queryKey: ['admin-customers'],
    queryFn: async () => {
      console.log('Fetching customer data from edge function...');
      
      // Get all customer data from the updated edge function
      const { data: customersData, error } = await supabase.functions.invoke('get-users-with-roles');
      
      if (error) {
        console.error('Error fetching customers:', error);
        throw new Error(error.message);
      }

      console.log('Customers data received:', customersData);

      // Check if customersData is an array and has items
      if (!Array.isArray(customersData) || customersData.length === 0) {
        console.log('No customers found or invalid data structure');
        return [];
      }

      // The edge function now returns all the data we need, including addresses
      const customersWithEmails: CustomerWithEmail[] = customersData.map((customer: any) => ({
        id: customer.id,
        email: customer.email || 'No email found',
        full_name: customer.full_name,
        cod_enabled: customer.cod_enabled,
        internal_notes: customer.internal_notes,
        created_at: customer.created_at,
        user_addresses: customer.user_addresses || []
      }));

      console.log('Final customers data:', customersWithEmails);
      return customersWithEmails;
    }
  });

  const updateCodMutation = useMutation({
    mutationFn: async ({ userId, codEnabled }: { userId: string; codEnabled: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ cod_enabled: codEnabled })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
      toast({
        title: "Success",
        description: "COD status updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update COD status",
        variant: "destructive",
      });
      console.error('COD update error:', error);
    },
  });

  const updateNotesMutation = useMutation({
    mutationFn: async ({ userId, notes }: { userId: string; notes: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ internal_notes: notes.trim() || null })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
      toast({
        title: "Success",
        description: "Internal notes updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update internal notes",
        variant: "destructive",
      });
      console.error('Notes update error:', error);
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async ({ userId, fullName }: { userId: string; fullName: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim() || null })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
      toast({
        title: "Success",
        description: "Customer name updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update customer name",
        variant: "destructive",
      });
      console.error('Profile update error:', error);
    },
  });

  return {
    customers,
    isLoading,
    updateCodMutation,
    updateNotesMutation,
    updateProfileMutation
  };
};
