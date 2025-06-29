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
      try {
        // Try the Edge Function first
        const { data, error } = await supabase.functions.invoke('get-users-with-emails');

        if (error) {
          console.error('Edge Function error:', error);
          // Fallback to direct database query
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select(`
              id,
              full_name,
              cod_enabled,
              internal_notes,
              created_at,
              user_addresses (
                id,
                address_line1,
                address_line2,
                city,
                country,
                postal_code,
                is_default
              )
            `);

          if (profilesError) {
            console.error('Direct query error:', profilesError);
            throw profilesError;
          }

          // Add mock email for testing
          const customersWithEmails = profiles?.map(profile => ({
            ...profile,
            email: `user-${profile.id}@example.com` // Mock email for testing
          })) || [];

          return customersWithEmails;
        }

        if (!data?.data) {
          return [];
        }

        return data.data as CustomerWithEmail[];
      } catch (error) {
        console.error('Error fetching customers:', error);
        throw error;
      }
    }
  });

  const updateCodMutation = useMutation({
    mutationFn: async ({ userId, codEnabled }: { userId: string; codEnabled: boolean }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({ cod_enabled: codEnabled })
        .eq('id', userId)
        .select();
      
      if (error) {
        throw error;
      }
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
      toast({
        title: "Success",
        description: "COD status updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update COD status",
        variant: "destructive",
      });
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
