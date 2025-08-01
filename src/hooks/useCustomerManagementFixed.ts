// ============================================================================
// FIXED CUSTOMER MANAGEMENT - Proper email fetching and enhanced functionality
// Fixes UUID email issue and adds proper user data retrieval
// ============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CustomerProfile {
  id: string;
  email?: string | null;
  full_name: string | null;
  country?: string | null;
  cod_enabled: boolean;
  internal_notes: string | null;
  created_at: string;
  delivery_addresses: Array<{
    id: string;
    address_line1: string;
    address_line2: string | null;
    city: string;
    destination_country: string;
    postal_code: string;
    is_default: boolean;
  }>;
}

interface CustomerWithEmail extends CustomerProfile {
  email: string;
  role?: string;
  avatar_url?: string;
  phone?: string;
  last_sign_in_at?: string;
  quote_count?: number;
  total_spent?: number;
}

export const useCustomerManagementFixed = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: customers, isLoading, refetch } = useQuery({
    queryKey: ['admin-customers-fixed'],
    queryFn: async () => {
      try {
        console.log('[CustomerManagement] Fetching customers with real emails...');

        // First, get all profiles with addresses and emails
        const { data: profiles, error: profilesError } = await supabase.from('profiles').select(`
            id, 
            email,
            full_name, 
            avatar_url,
            country,
            cod_enabled, 
            internal_notes,
            tags, 
            created_at,
            delivery_addresses(
              id, 
              address_line1, 
              address_line2, 
              city, 
              destination_country, 
              postal_code, 
              is_default
            )
          `);

        if (profilesError) {
          console.error('[CustomerManagement] Profiles query error:', profilesError);
          throw profilesError;
        }

        if (!profiles || profiles.length === 0) {
          console.log('[CustomerManagement] No profiles found');
          return [];
        }

        // Get real user emails and metadata from auth.users via edge function
        let usersWithEmails: any[] = [];

        try {
          console.log('[CustomerManagement] Invoking edge function get-users-with-emails...');
          const { data: authData, error: authError } = await supabase.functions.invoke(
            'get-users-with-emails',
            {
              method: 'GET',
            },
          );

          console.log('[CustomerManagement] Edge function response:', { authData, authError });

          if (authError) {
            console.warn('[CustomerManagement] Edge function error, falling back:', authError);
            // Don't generate fake emails - just return empty data
            console.warn('[CustomerManagement] Edge function failed, not generating fake emails');
            usersWithEmails = [];
          } else {
            usersWithEmails = authData || [];
            console.log('[CustomerManagement] Got auth users:', usersWithEmails.length);
            console.log('[CustomerManagement] Sample user data:', usersWithEmails[0]);
          }
        } catch (error) {
          console.warn('[CustomerManagement] Edge function not available');
          // Don't generate fake emails
          usersWithEmails = [];
        }

        // Get quote statistics for each customer
        const { data: quoteStats } = await supabase
          .from('quotes')
          .select('user_id, final_total_usd, status')
          .in(
            'user_id',
            profiles.map((p) => p.id),
          );

        // Combine profile data with auth data and stats
        const customersWithEmails: CustomerWithEmail[] = profiles.map((profile) => {
          const authUser = usersWithEmails.find((u) => u.id === profile.id);
          const customerQuotes = quoteStats?.filter((q) => q.user_id === profile.id) || [];

          // Calculate customer metrics
          const quoteCount = customerQuotes.length;
          const totalSpent = customerQuotes
            .filter((q) => ['paid', 'completed'].includes(q.status))
            .reduce((sum, q) => sum + (q.final_total_usd || 0), 0);

          return {
            ...profile,
            email: profile.email || authUser?.email || null, // Use profile.email first, then auth email, then null
            role: authUser?.role || 'customer',
            avatar_url: authUser?.avatar_url || profile.avatar_url,
            phone: authUser?.phone,
            last_sign_in_at: authUser?.last_sign_in_at,
            quote_count: quoteCount,
            total_spent: totalSpent,
          };
        });

        // Filter out admin users and sort by recent activity
        const customerUsers = customersWithEmails
          .filter((user) => user.role !== 'admin')
          .sort((a, b) => {
            // Sort by last activity (quotes or sign in)
            const aActivity = new Date(a.last_sign_in_at || a.created_at).getTime();
            const bActivity = new Date(b.last_sign_in_at || b.created_at).getTime();
            return bActivity - aActivity;
          });

        console.log('[CustomerManagement] Final customers:', customerUsers.length);
        return customerUsers;
      } catch (error) {
        console.error('[CustomerManagement] Error fetching customers:', error);
        throw error;
      }
    },
    staleTime: 30 * 1000, // 30 seconds for fresh customer data
    refetchOnWindowFocus: true, // ✅ Refetch when user returns to tab
  });

  const updateCodMutation = useMutation({
    mutationFn: async ({ userId, codEnabled }: { userId: string; codEnabled: boolean }) => {
      console.log('Updating COD:', { userId, codEnabled });
      
      if (!userId) {
        throw new Error('User ID is required for COD update');
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .update({ cod_enabled: codEnabled })
        .eq('id', userId)
        .select();

      if (error) {
        console.error('COD update error:', error);
        throw error;
      }
      
      console.log('COD update success:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-customers-fixed'] });
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
      console.log('Updating notes:', { userId, notes });
      
      if (!userId) {
        throw new Error('User ID is required for notes update');
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .update({ internal_notes: notes.trim() || null })
        .eq('id', userId)
        .select();
      
      if (error) {
        console.error('Notes update error:', error);
        throw error;
      }
      
      console.log('Notes update success:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-customers-fixed'] });
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
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async ({ userId, fullName }: { userId: string; fullName: string }) => {
      console.log('Updating profile:', { userId, fullName });
      
      if (!userId) {
        throw new Error('User ID is required for profile update');
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim() || null })
        .eq('id', userId)
        .select();
      
      if (error) {
        console.error('Profile update error:', error);
        throw error;
      }
      
      console.log('Profile update success:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-customers-fixed'] });
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
    },
  });

  const updateTagsMutation = useMutation({
    mutationFn: async ({ userId, tags }: { userId: string; tags: string }) => {
      console.log('Updating tags:', { userId, tags });
      
      if (!userId) {
        throw new Error('User ID is required for tags update');
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .update({ tags: tags.trim() || null })
        .eq('id', userId)
        .select();
      
      if (error) {
        console.error('Tags update error:', error);
        throw error;
      }
      
      console.log('Tags update success:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-customers-fixed'] });
      toast({
        title: 'Success',
        description: 'Customer tags updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update customer tags',
        variant: 'destructive',
      });
    },
  });

  return {
    customers,
    isLoading,
    refetch,
    updateCodMutation,
    updateNotesMutation,
    updateProfileMutation,
    updateTagsMutation,
  };
};
