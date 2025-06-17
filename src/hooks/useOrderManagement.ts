
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { useDebounce } from "@/hooks/useDebounce";

type Order = Tables<'quotes'> & { 
  quote_items: Tables<'quote_items'>[];
};

export const useOrderManagement = () => {
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [searchInput, setSearchInput] = useState("");
    const searchTerm = useDebounce(searchInput, 500);

    // Fetch orders, which are quotes with specific statuses
    const { data: orders, isLoading: ordersLoading } = useQuery<Order[]>({
        queryKey: ['admin-orders', statusFilter, searchTerm],
        queryFn: async () => {
            let query = supabase
                .from('quotes')
                .select('*, quote_items(*)')
                .in('status', ['paid', 'ordered', 'shipped', 'completed', 'cancelled', 'cod_pending', 'bank_transfer_pending'])
                .order('created_at', { ascending: false });
        
            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter);
            }

            if (searchTerm) {
                const searchString = `%${searchTerm}%`;
                query = query.or(`order_display_id.ilike.${searchString},product_name.ilike.${searchString},email.ilike.${searchString},display_id.ilike.${searchString}`);
            }
        
            const { data, error } = await query;
            if (error) throw new Error(error.message);
            return data || [];
        }
    });

    return {
        statusFilter,
        setStatusFilter,
        searchInput,
        setSearchInput,
        orders,
        ordersLoading,
    };
};
