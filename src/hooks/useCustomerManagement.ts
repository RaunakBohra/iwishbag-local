import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
        console.log('[CustomerManagement] Using direct database query...');

        // Direct database query to get profiles with addresses
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select(
            'id, full_name, cod_enabled, internal_notes, created_at, user_addresses(id, address_line1, address_line2, city, country, postal_code, is_default)',
          );

        if (profilesError) {
          console.error('[CustomerManagement] Direct query error:', profilesError);
          throw profilesError;
        }

        console.log('[CustomerManagement] Raw profiles data:', profiles);

        // Use mock emails for now to test the full_name field
        const customersWithEmails =
          profiles?.map((profile) => {
            const email = `user-${profile.id}@example.com`;
            console.log(
              `[CustomerManagement] Profile ${profile.id}: full_name="${profile.full_name}", email="${email}"`,
            );

            return {
              ...profile,
              email,
            };
          }) || [];

        console.log('[CustomerManagement] Final customers data:', customersWithEmails);
        return customersWithEmails;
      } catch (error) {
        console.error('[CustomerManagement] Error fetching customers:', error);
        throw error;
      }
    },
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
        title: 'Success',
        description: 'COD status updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update COD status',
        variant: 'destructive',
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
        title: 'Success',
        description: 'Internal notes updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update internal notes',
        variant: 'destructive',
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
        title: 'Success',
        description: 'Customer name updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update customer name',
        variant: 'destructive',
      });
      console.error('Profile update error:', error);
    },
  });

  return {
    customers,
    isLoading,
    updateCodMutation,
    updateNotesMutation,
    updateProfileMutation,
  };
};
