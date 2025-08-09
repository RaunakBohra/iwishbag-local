import { supabase } from '@/integrations/supabase/client';

export class OrderService {
  private static instance: OrderService;
  private constructor() {}

  static getInstance(): OrderService {
    if (!OrderService.instance) {
      OrderService.instance = new OrderService();
    }
    return OrderService.instance;
  }

  /**
   * Get paginated orders for customer dashboard (user-facing)
   */
  async getCustomerOrdersPaginated(filters?: {
    search?: string;
    status?: string | string[];
  }, page: number = 1, pageSize: number = 20): Promise<{
    data: any[];
    pagination: {
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    try {
      const offset = (page - 1) * pageSize;
      
      console.log('📋 Fetching customer paginated orders:', { filters, page, pageSize });

      // Build base query with count - RLS will automatically filter to user's orders
      let query = supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            product_name,
            quantity,
            current_price,
            product_url,
            product_image
          ),
          order_shipments (
            id,
            tracking_number,
            carrier,
            status as shipment_status,
            estimated_delivery
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      // Apply filters
      if (filters) {
        // Search filter - customer can search by order ID and product names
        if (filters.search && filters.search.trim()) {
          const searchTerm = filters.search.trim();
          query = query.or(`id.ilike.%${searchTerm}%,order_number.ilike.%${searchTerm}%`);
        }

        // Status filter
        if (filters.status && filters.status !== 'all') {
          if (Array.isArray(filters.status)) {
            query = query.in('status', filters.status);
          } else {
            query = query.eq('status', filters.status);
          }
        }
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('❌ Error fetching customer paginated orders:', error);
        throw error;
      }

      const total = count || 0;
      const totalPages = Math.ceil(total / pageSize);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;

      const result = {
        data: data || [],
        pagination: {
          total,
          page,
          pageSize,
          totalPages,
          hasNext,
          hasPrev,
        },
      };

      console.log(`✅ Fetched ${data?.length || 0} customer orders (page ${page}/${totalPages}, total: ${total})`);
      return result;
    } catch (error) {
      console.error('❌ Exception in getCustomerOrdersPaginated:', error);
      return {
        data: [],
        pagination: {
          total: 0,
          page: 1,
          pageSize,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      };
    }
  }

  /**
   * Get order by ID
   */
  async getOrderById(orderId: string): Promise<any | null> {
    try {
      console.log('🔍 Fetching order by ID:', orderId);

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            product_name,
            quantity,
            current_price,
            product_url,
            product_image
          ),
          order_shipments (
            id,
            tracking_number,
            carrier,
            status as shipment_status,
            estimated_delivery
          )
        `)
        .eq('id', orderId)
        .single();

      if (error) {
        console.error('❌ Error fetching order:', error);
        return null;
      }

      console.log('✅ Order fetched successfully:', orderId);
      return data;
    } catch (error) {
      console.error('❌ Exception in getOrderById:', error);
      return null;
    }
  }
}