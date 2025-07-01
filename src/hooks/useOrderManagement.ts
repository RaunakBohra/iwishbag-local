import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { useDebounce } from "@/hooks/useDebounce";
import { useStatusManagement } from "@/hooks/useStatusManagement";

type Order = Tables<'quotes'> & { 
  quote_items: Tables<'quote_items'>[];
  profiles?: { preferred_display_currency?: string } | null;
};

export const useOrderManagement = () => {
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [searchInput, setSearchInput] = useState("");
    const searchTerm = useDebounce(searchInput, 500);
    const { orderStatuses } = useStatusManagement();

    // Fetch orders, which are quotes with specific statuses
    const { data: orders, isLoading: ordersLoading } = useQuery<Order[]>({
        queryKey: ['admin-orders', statusFilter, searchTerm],
        queryFn: async () => {
            let query = supabase
                .from('quotes')
                .select('*, quote_items(*), profiles!quotes_user_id_fkey(preferred_display_currency)')
                .order('created_at', { ascending: false });
            
            // Filter to show only order statuses
            if (orderStatuses && orderStatuses.length > 0) {
                const orderStatusNames = orderStatuses.map(status => status.name);
                query = query.in('status', orderStatusNames);
            }
        
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
        },
        enabled: !!orderStatuses, // Only run query when orderStatuses is loaded
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
