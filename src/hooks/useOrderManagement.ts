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
    const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all");
    const [searchInput, setSearchInput] = useState("");
    const searchTerm = useDebounce(searchInput, 500);
    const { getStatusesForOrdersList } = useStatusManagement();

    // Fetch orders, which are quotes with specific statuses
    const { data: orders, isLoading: ordersLoading } = useQuery<Order[]>({
        queryKey: ['admin-orders', statusFilter, paymentStatusFilter, searchTerm],
        queryFn: async () => {
            let query = supabase
                .from('quotes')
                .select('*, quote_items(*), profiles!quotes_user_id_fkey(preferred_display_currency)')
                .order('created_at', { ascending: false });
            
            // Filter based on status management configuration
            // Only show quotes with statuses that are configured to show in orders list
            const orderStatusNames = getStatusesForOrdersList();
            console.log('DEBUG: Order statuses allowed in orders list:', orderStatusNames);
            
            if (statusFilter !== 'all') {
                // Check if the selected status is allowed in orders list
                if (orderStatusNames.includes(statusFilter)) {
                    query = query.eq('status', statusFilter);
                } else {
                    // If selected status is not allowed, show all allowed statuses
                    console.log(`DEBUG: Status '${statusFilter}' is not allowed in orders list, showing all allowed statuses`);
                    if (orderStatusNames.length > 0) {
                        query = query.in('status', orderStatusNames);
                    }
                }
            } else {
                // No specific status selected, show all allowed statuses
                if (orderStatusNames.length > 0) {
                    query = query.in('status', orderStatusNames);
                }
            }

            if (paymentStatusFilter !== 'all') {
                query = query.eq('payment_status', paymentStatusFilter);
            }

            if (searchTerm) {
                const searchString = `%${searchTerm}%`;
                query = query.or(`order_display_id.ilike.${searchString},product_name.ilike.${searchString},email.ilike.${searchString},display_id.ilike.${searchString}`);
            }
        
            const { data, error } = await query;
            if (error) throw new Error(error.message);
            return data || [];
        },
        enabled: true, // Always run query - filtering is handled by getStatusesForOrdersList
    });

    const downloadCSV = () => {
        // TODO: Implement CSV download functionality
        console.log('Download CSV functionality not implemented');
    };

    return {
        statusFilter,
        setStatusFilter,
        paymentStatusFilter,
        setPaymentStatusFilter,
        searchInput,
        setSearchInput,
        orders,
        ordersLoading,
        downloadCSV,
    };
};
