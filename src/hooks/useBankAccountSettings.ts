import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Tables, TablesInsert } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";

export type BankAccount = Tables<'bank_account_details'>;
export type BankAccountFormData = Omit<BankAccount, 'id' | 'created_at' | 'updated_at'>;

export const useBankAccountSettings = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { user } = useAuth();

    // Check user role for admin access
    const { data: userRole } = useQuery({
        queryKey: ['user-role', user?.id],
        queryFn: async () => {
            if (!user?.id) return null;
            
            console.log('Checking user role for bank account settings:', user.id);
            
            const { data, error } = await supabase
                .from('user_roles')
                .select('*')
                .eq('user_id', user.id)
                .single();
            
            if (error) {
                console.error('Error checking user role:', error);
                return null;
            }
            
            console.log('User role for bank account settings:', data);
            return data;
        },
        enabled: !!user?.id,
    });

    const { data: bankAccounts, isLoading: isLoadingBankAccounts } = useQuery({
        queryKey: ['bank-accounts'],
        queryFn: async () => {
            console.log('Fetching bank accounts...');
            console.log('Current user:', user?.id);
            console.log('User role:', userRole?.role);
            
            const { data, error } = await supabase.from('bank_account_details').select('*').order('created_at');
            
            if (error) {
                console.error('Error fetching bank accounts:', error);
                throw new Error(`Failed to fetch bank accounts: ${error.message}`);
            }
            
            console.log('Bank accounts fetched:', data?.length || 0);
            return data;
        },
        enabled: !!user?.id && !!userRole, // Only run when user and user role are loaded
    });

    const createOrUpdateMutation = useMutation({
        mutationFn: async (accountData: { data: BankAccountFormData, id?: string }) => {
            const { data, id } = accountData;
            let error;
            if (id) {
                ({ error } = await supabase.from('bank_account_details').update(data).eq('id', id));
            } else {
                ({ error } = await supabase.from('bank_account_details').insert(data as TablesInsert<'bank_account_details'>));
            }
            if (error) throw new Error(error.message);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
            queryClient.invalidateQueries({ queryKey: ['bankAccounts'] }); // Also invalidate the query used in EnhancedBankTransferDetails
            toast({ title: `Bank account ${variables.id ? 'updated' : 'created'} successfully` });
        },
        onError: (error: Error, variables) => {
            toast({ title: `Error ${variables.id ? 'updating' : 'creating'} bank account`, description: error.message, variant: "destructive" });
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
            toast({ title: "Bank account deleted successfully" });
        },
        onError: (error: Error) => {
            toast({ title: "Error deleting bank account", description: error.message, variant: "destructive" });
        }
    });

    return {
        bankAccounts: bankAccounts || [],
        isLoadingBankAccounts,
        createOrUpdateBankAccount: createOrUpdateMutation.mutate,
        deleteBankAccount: deleteMutation.mutate,
        isProcessing: createOrUpdateMutation.isPending || deleteMutation.isPending,
    };
};
