import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Tables, TablesInsert } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';

export type BankAccount = Tables<'bank_account_details'>;
export type BankAccountFormData = Omit<BankAccount, 'id' | 'created_at' | 'updated_at'>;

export const useBankAccountSettings = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const { data: bankAccounts, isLoading: isLoadingBankAccounts } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      console.log('Fetching bank accounts...');
      console.log('Current user:', user?.id);
      console.log('Is admin:', !!user); // All authenticated users have admin access
      const { data, error, count } = await supabase
        .from('bank_account_details')
        .select('*', { count: 'exact' })
        .order('destination_country', { ascending: true })
        .order('is_fallback', { ascending: false })
        .order('bank_name', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching bank accounts:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        
        // If it's an RLS error, let's check the user's admin status
        if (error.code === '42501' || error.message.includes('policy')) {
          console.log('RLS policy violation - user may not have admin access');
          console.log('Current admin status:', !!user);
        }
        throw new Error(`Failed to fetch bank accounts: ${error.message}`);
      }

      console.log('Bank accounts fetched:', data?.length || 0, 'Total count:', count);
      return data;
    },
    enabled: !!user?.id // Only run when user is authenticated (simplified access)
  });

  const createOrUpdateMutation = useMutation({
    mutationFn: async (accountData: { data: BankAccountFormData; id?: string }) => {
      const { data, id } = accountData;
      let error, result;
      
      if (id) {
        // For updates, first check if the record exists
        const { data: existingRecord, error: checkError } = await supabase
          .from('bank_account_details')
          .select('id')
          .eq('id', id)
          .single();
          
        if (checkError || !existingRecord) {
          throw new Error(`Bank account with ID ${id} not found`);
        }
        
        // Perform the update with select to avoid 404
        ({ data: result, error } = await supabase
          .from('bank_account_details')
          .update(data)
          .eq('id', id)
          .select()
          .single());
      } else {
        ({ data: result, error } = await supabase
          .from('bank_account_details')
          .insert(data as TablesInsert<'bank_account_details'>)
          .select()
          .single());
      }
      
      if (error) {
        console.error('Bank account mutation error:', error);
        throw new Error(error.message);
      }
      
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['bankAccounts'] }); // Also invalidate the query used in EnhancedBankTransferDetails
      toast({
        title: `Bank account ${variables.id ? 'updated' : 'created'} successfully`
      });
    },
    onError: (error: Error, variables) => {
      toast({
        title: `Error ${variables.id ? 'updating' : 'creating'} bank account`,
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('bank_account_details').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['bankAccounts'] }); // Also invalidate the query used in EnhancedBankTransferDetails
      toast({ title: 'Bank account deleted successfully' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error deleting bank account',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  return {
    bankAccounts: bankAccounts || [],
    isLoadingBankAccounts,
    createOrUpdateBankAccount: createOrUpdateMutation.mutate,
    deleteBankAccount: deleteMutation.mutate,
    isProcessing: createOrUpdateMutation.isPending || deleteMutation.isPending
  };
};
