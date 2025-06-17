
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tables } from "@/integrations/supabase/types";

type OrderDetail = Tables<'quotes'> & {
  quote_items: Tables<'quote_items'>[];
};

export const useCustomerOrderDetail = (orderId: string | undefined) => {
  const { user } = useAuth();

  return useQuery<OrderDetail | null>({
    queryKey: ['order-detail', orderId],
    queryFn: async () => {
      if (!orderId || !user) {
        throw new Error("Order ID and user are required.");
      }
      
      const { data, error } = await supabase
        .from('quotes')
        .select('*, quote_items(*)')
        .eq('id', orderId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      // Ensure the user is the owner of the order, unless they are an admin
      if (data && data.user_id !== user.id) {
          // A proper role check would be better, but this is a good security measure for now.
          const { data: userRoles } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
          if (userRoles?.role !== 'admin') {
            throw new Error("You are not authorized to view this order.");
          }
      }

      return data;
    },
    enabled: !!orderId && !!user,
  });
};
