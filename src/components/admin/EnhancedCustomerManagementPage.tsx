import { useState, useMemo } from 'react';
import { useCustomerManagement } from '@/hooks/useCustomerManagement';
import { CustomerMetrics } from './CustomerMetrics';
import { WorldClassCustomerTable } from './WorldClassCustomerTable';
import { H1, H2, Body, BodySmall } from '@/components/ui/typography';
import { Users } from 'lucide-react';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const EnhancedCustomerManagementPage = () => {

  const { toast } = useToast();

  const { customers, isLoading, updateCodMutation, updateNotesMutation, updateProfileMutation } =
    useCustomerManagement();

  // Get customer analytics
  const { data: customerAnalytics } = useQuery({
    queryKey: ['customer-analytics'],
    queryFn: async () => {
      const { data: quotes, error } = await supabase
        .from('quotes')
        .select('*')
        .not('final_total_usd', 'is', null);

      if (error) throw error;

      // Calculate customer metrics
      const customerMetrics =
        customers?.map((customer) => {
          const customerQuotes = quotes?.filter((q) => q.user_id === customer.id) || [];
          const totalSpent = customerQuotes.reduce((sum, q) => sum + (q.final_total_usd || 0), 0);
          const orderCount = customerQuotes.filter((q) =>
            ['paid', 'ordered', 'shipped', 'completed'].includes(q.status),
          ).length;
          const quoteCount = customerQuotes.length;
          const avgOrderValue = orderCount > 0 ? totalSpent / orderCount : 0;

          return {
            customerId: customer.id,
            totalSpent,
            orderCount,
            quoteCount,
            avgOrderValue,
            lastActivity:
              customerQuotes.length > 0
                ? new Date(Math.max(...customerQuotes.map((q) => new Date(q.created_at).getTime())))
                : new Date(customer.created_at),
          };
        }) || [];

      return customerMetrics;
    },
    enabled: !!customers,
  });

  // Handler for COD updates
  const handleUpdateCod = (userId: string, codEnabled: boolean) => {
    updateCodMutation.mutate({ userId, codEnabled });
  };

  // Export functionality
  const exportCustomers = () => {
    if (!customers) return;
    
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'ID,Name,Email,Location,Join Date,Total Spent,Orders,Avg Order Value,Status\n' +
      customers
        .map((customer) => {
          const analytics = customerAnalytics?.find((a) => a.customerId === customer.id);
          const status = customer.internal_notes?.includes('VIP')
            ? 'VIP'
            : customer.cod_enabled
              ? 'Active'
              : 'Inactive';
          return `${customer.id},"${customer.full_name || 'N/A'}","${customer.email}","${customer.user_addresses[0]?.city || 'N/A'}, ${customer.user_addresses[0]?.country || 'N/A'}","${new Date(customer.created_at).toLocaleDateString()}","${analytics?.totalSpent || 0}","${analytics?.orderCount || 0}","${analytics?.avgOrderValue || 0}","${status}"`;
        })
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'customers_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Export Successful',
      description: `${customers.length} customers exported to CSV`,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50/40">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <H1 className="text-gray-900">Customer Management</H1>
              <BodySmall className="text-gray-600">
                Professional customer relationship management
              </BodySmall>
            </div>
          </div>
        </div>

        {/* Metrics Dashboard */}
        <CustomerMetrics
          customers={customers || []}
          customerAnalytics={customerAnalytics || []}
          isLoading={isLoading}
        />

        {/* World-Class Customer Table */}
        <WorldClassCustomerTable
          customers={customers || []}
          customerAnalytics={customerAnalytics || []}
          isLoading={isLoading}
          onUpdateCod={handleUpdateCod}
          onUpdateNotes={updateNotesMutation.mutate}
          onUpdateName={(userId, name) =>
            updateProfileMutation.mutate({ userId, fullName: name })
          }
          isUpdating={
            updateCodMutation.isPending ||
            updateNotesMutation.isPending ||
            updateProfileMutation.isPending
          }
          onExport={exportCustomers}
        />
      </div>
    </div>
  );
};
