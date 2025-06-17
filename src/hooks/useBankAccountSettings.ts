
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Tables, TablesInsert } from "@/integrations/supabase/types";

export type BankAccount = Tables<'bank_account_details'>;
export type BankAccountFormData = Omit<BankAccount, 'id' | 'created_at' | 'updated_at'>;

export const useBankAccountSettings = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const { data: bankAccounts, isLoading: isLoadingBankAccounts } = useQuery({
        queryKey: ['bank-accounts'],
        queryFn: async () => {
            const { data, error } = await supabase.from('bank_account_details').select('*').order('created_at');
            if (error) throw new Error(error.message);
            return data;
        }
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
