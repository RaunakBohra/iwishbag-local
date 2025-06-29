import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ExportOptions {
  customerIds: string[];
  format: 'csv' | 'json';
  includeStats?: boolean;
  includeAddresses?: boolean;
  includeNotes?: boolean;
}

interface CustomerData {
  id: string;
  full_name: string | null;
  email: string;
  cod_enabled: boolean;
  internal_notes: string | null;
  created_at: string;
  user_addresses?: Array<{
    id: string;
    address_line1: string;
    address_line2: string | null;
    city: string;
    country: string;
    postal_code: string;
    is_default: boolean;
  }>;
  stats?: {
    totalOrders: number;
    totalSpent: number;
    lastOrderDate: string | null;
    averageOrderValue: number;
    tags: string[];
  };
}

export function useCustomerExport() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (options: ExportOptions) => {
      // Fetch customer data
      const { data: customers, error: fetchError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          cod_enabled,
          internal_notes,
          created_at,
          user_addresses (
            id,
            address_line1,
            address_line2,
            city,
            country,
            postal_code,
            is_default
          )
        `)
        .in('id', options.customerIds);

      if (fetchError) throw fetchError;

      // Fetch stats if requested
      let customerStats: Record<string, any> = {};
      if (options.includeStats) {
        const { data: quotes, error: statsError } = await supabase
          .from('quotes')
          .select('*')
          .in('user_id', options.customerIds)
          .eq('status', 'completed');

        if (statsError) throw statsError;

        // Calculate stats for each customer
        customerStats = options.customerIds.reduce((acc, customerId) => {
          const customerQuotes = quotes.filter(q => q.user_id === customerId);
          const totalOrders = customerQuotes.length;
          const totalSpent = customerQuotes.reduce((sum, q) => sum + (q.total_amount || 0), 0);
          const lastOrderDate = customerQuotes.length > 0 
            ? new Date(Math.max(...customerQuotes.map(q => new Date(q.created_at).getTime())))
            : null;
          const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

          // Generate tags based on behavior
          const tags = [];
          if (totalOrders >= 5) tags.push('Regular');
          if (totalSpent >= 1000) tags.push('High Value');
          if (totalOrders >= 10 && totalSpent >= 2000) tags.push('VIP');
          if (lastOrderDate && (new Date().getTime() - lastOrderDate.getTime()) > 90 * 24 * 60 * 60 * 1000) {
            tags.push('Inactive');
          }

          acc[customerId] = {
            totalOrders,
            totalSpent,
            lastOrderDate: lastOrderDate?.toISOString() || null,
            averageOrderValue,
            tags
          };
          return acc;
        }, {});
      }

      // Prepare data for export
      const exportData: CustomerData[] = customers.map(customer => ({
        id: customer.id,
        full_name: customer.full_name,
        email: customer.email,
        cod_enabled: customer.cod_enabled,
        internal_notes: options.includeNotes ? customer.internal_notes : undefined,
        created_at: customer.created_at,
        user_addresses: options.includeAddresses ? customer.user_addresses : undefined,
        stats: options.includeStats ? customerStats[customer.id] : undefined
      }));

      // Generate file content based on format
      let content: string;
      let filename: string;
      let mimeType: string;

      if (options.format === 'csv') {
        // Convert to CSV
        const headers = ['ID', 'Name', 'Email', 'COD Enabled', 'Created At'];
        if (options.includeNotes) headers.push('Notes');
        if (options.includeStats) {
          headers.push('Total Orders', 'Total Spent', 'Average Order Value', 'Last Order Date', 'Tags');
        }
        if (options.includeAddresses) {
          headers.push('Addresses');
        }

        const rows = exportData.map(customer => {
          const row = [
            customer.id,
            customer.full_name || '',
            customer.email,
            customer.cod_enabled ? 'Yes' : 'No',
            new Date(customer.created_at).toLocaleDateString()
          ];

          if (options.includeNotes) {
            row.push(customer.internal_notes || '');
          }

          if (options.includeStats && customer.stats) {
            row.push(
              customer.stats.totalOrders.toString(),
              customer.stats.totalSpent.toFixed(2),
              customer.stats.averageOrderValue.toFixed(2),
              customer.stats.lastOrderDate ? new Date(customer.stats.lastOrderDate).toLocaleDateString() : 'Never',
              customer.stats.tags.join(', ')
            );
          }

          if (options.includeAddresses && customer.user_addresses) {
            row.push(
              customer.user_addresses
                .map(addr => `${addr.address_line1}, ${addr.city}, ${addr.country} ${addr.postal_code}`)
                .join('; ')
            );
          }

          return row;
        });

        content = [headers, ...rows].map(row => row.join(',')).join('\n');
        filename = `customers_${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
      } else {
        // JSON format
        content = JSON.stringify(exportData, null, 2);
        filename = `customers_${new Date().toISOString().split('T')[0]}.json`;
        mimeType = 'application/json';
      }

      // Create and download file
      const blob = new Blob([content], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Customer data exported successfully',
      });
    },
    onError: (error) => {
      console.error('Export error:', error);
      toast({
        title: 'Error',
        description: 'Failed to export customer data',
        variant: 'destructive',
      });
    },
  });
} 