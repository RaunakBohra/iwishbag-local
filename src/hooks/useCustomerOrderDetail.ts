import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Tables } from '@/integrations/supabase/types';

type OrderDetail = Tables<'quotes'> & {
  shipping_address: Tables<'delivery_addresses'> | null;
};

export const useCustomerOrderDetail = (orderId: string | undefined) => {
  const { user } = useAuth();

  return useQuery<OrderDetail | null>({
    queryKey: ['order-detail', orderId],
    queryFn: async () => {
      if (!orderId || !user) {
        throw new Error('Order ID and user are required.');
      }

      const { data: quoteData, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', orderId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!quoteData) {
        return null;
      }

      // Ensure the user is the owner of the order, unless they are an admin
      if (quoteData.user_id !== user.id) {
        // A proper role check would be better, but this is a good security measure for now.
        const { data: userRoles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();
        if (userRoles?.role !== 'admin') {
          throw new Error('You are not authorized to view this order.');
        }
      }

      // Fetch any shipping address for the user (prefer default, but show any if no default exists)
      const { data: addressData } = await supabase
        .from('delivery_addresses')
        .select('*')
        .eq('user_id', quoteData.user_id)
        .order('is_default', { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        ...quoteData,
        shipping_address: addressData,
      };
    },
    enabled: !!orderId && !!user,
  });
};
