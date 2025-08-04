import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerManagementFixed as useCustomerManagement } from '@/hooks/useCustomerManagementFixed';
import { CompactCustomerMetrics } from './CompactCustomerMetrics';
import { WorldClassCustomerTable } from './WorldClassCustomerTable';
import { AddCustomerModal } from './modals/AddCustomerModal';
import { BulkTagModal } from './modals/BulkTagModal';
import { SendEmailModal } from './modals/SendEmailModal';
import { CustomerMessageModal } from './modals/CustomerMessageModal';
import { EditCustomerModal } from './modals/EditCustomerModal';
import { H1, H2, Body, BodySmall } from '@/components/ui/typography';
import { Users } from 'lucide-react';
import { Customer } from './CustomerTable';
import { isVIP } from '@/utils/customerTagUtils';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const EnhancedCustomerManagementPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Modal states
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [bulkTagOpen, setBulkTagOpen] = useState(false);
  const [sendEmailOpen, setSendEmailOpen] = useState(false);
  const [customerMessageOpen, setCustomerMessageOpen] = useState(false);
  const [editCustomerOpen, setEditCustomerOpen] = useState(false);

  // Modal data
  const [selectedCustomersForBulk, setSelectedCustomersForBulk] = useState<Customer[]>([]);
  const [selectedCustomersForEmail, setSelectedCustomersForEmail] = useState<Customer[]>([]);
  const [selectedCustomerForMessage, setSelectedCustomerForMessage] = useState<Customer | null>(
    null,
  );
  const [selectedCustomerForEdit, setSelectedCustomerForEdit] = useState<Customer | null>(null);

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
          const status = isVIP(customer)
            ? 'VIP'
            : customer.cod_enabled
              ? 'Active'
              : 'Inactive';
          const location = customer.country || customer.delivery_addresses[0]?.destination_country || 'N/A';
          return `${customer.id},"${customer.full_name || 'N/A'}","${customer.email || 'No email'}","${location}","${new Date(customer.created_at).toLocaleDateString()}","${analytics?.totalSpent || 0}","${analytics?.orderCount || 0}","${analytics?.avgOrderValue || 0}","${status}"`;
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

  // Button handlers
  const handleAddCustomer = () => {
    setAddCustomerOpen(true);
  };

  const handleBulkEmail = (customerIds: string[]) => {
    const selectedCustomers = customers?.filter((c) => customerIds.includes(c.id)) || [];
    setSelectedCustomersForEmail(selectedCustomers);
    setSendEmailOpen(true);
  };

  const handleBulkTag = (customerIds: string[]) => {
    const selectedCustomers = customers?.filter((c) => customerIds.includes(c.id)) || [];
    setSelectedCustomersForBulk(selectedCustomers);
    setBulkTagOpen(true);
  };

  const handleBulkExport = (customerIds: string[]) => {
    const selectedCustomers = customers?.filter((c) => customerIds.includes(c.id)) || [];
    if (selectedCustomers.length === 0) return;

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'ID,Name,Email,Location,Join Date,Total Spent,Orders,Avg Order Value,Status\n' +
      selectedCustomers
        .map((customer) => {
          const analytics = customerAnalytics?.find((a) => a.customerId === customer.id);
          const status = isVIP(customer)
            ? 'VIP'
            : customer.cod_enabled
              ? 'Active'
              : 'Inactive';
          const location = customer.country || customer.delivery_addresses[0]?.destination_country || 'N/A';
          return `${customer.id},"${customer.full_name || 'N/A'}","${customer.email || 'No email'}","${location}","${new Date(customer.created_at).toLocaleDateString()}","${analytics?.totalSpent || 0}","${analytics?.orderCount || 0}","${analytics?.avgOrderValue || 0}","${status}"`;
        })
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `selected_customers_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Export Successful',
      description: `${selectedCustomers.length} selected customers exported to CSV`,
    });
  };

  const handleEditCustomer = (customerId: string) => {
    const customer = customers?.find((c) => c.id === customerId);
    if (customer) {
      setSelectedCustomerForEdit(customer);
      setEditCustomerOpen(true);
    }
  };

  const handleSendEmail = (customerId: string, email: string) => {
    const customer = customers?.find((c) => c.id === customerId);
    if (customer) {
      setSelectedCustomersForEmail([customer]);
      setSendEmailOpen(true);
    }
  };

  const handleViewMessages = (customerId: string) => {
    const customer = customers?.find((c) => c.id === customerId);
    if (customer) {
      setSelectedCustomerForMessage(customer);
      setCustomerMessageOpen(true);
    }
  };

  const handleViewOrders = (customerId: string) => {
    // Navigate to orders filtered by customer
    navigate(`/admin/quotes?customer=${customerId}`);
  };

  const handleBulkCodToggle = async (customerIds: string[], enabled: boolean) => {
    try {
      // Update COD status for all selected customers
      for (const customerId of customerIds) {
        await updateCodMutation.mutateAsync({ userId: customerId, codEnabled: enabled });
      }
      
      toast({
        title: 'Success',
        description: `COD ${enabled ? 'enabled' : 'disabled'} for ${customerIds.length} customers`,
      });
    } catch (error) {
      console.error('Bulk COD toggle error:', error);
      toast({
        title: 'Error',
        description: 'Failed to update COD status for some customers',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="w-full space-y-6">
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

        {/* Compact Metrics Dashboard */}
        <CompactCustomerMetrics
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
          onUpdateName={(userId, name) => updateProfileMutation.mutate({ userId, fullName: name })}
          isUpdating={
            updateCodMutation.isPending ||
            updateNotesMutation.isPending ||
            updateProfileMutation.isPending
          }
          onExport={exportCustomers}
          onAddCustomer={handleAddCustomer}
          onBulkEmail={handleBulkEmail}
          onBulkTag={handleBulkTag}
          onBulkExport={handleBulkExport}
          onBulkCodToggle={handleBulkCodToggle}
          onEditCustomer={handleEditCustomer}
          onSendEmail={handleSendEmail}
          onViewMessages={handleViewMessages}
          onViewOrders={handleViewOrders}
        />

        {/* Modals */}
        <AddCustomerModal open={addCustomerOpen} onOpenChange={setAddCustomerOpen} />

        <BulkTagModal
          open={bulkTagOpen}
          onOpenChange={setBulkTagOpen}
          selectedCustomers={selectedCustomersForBulk}
        />

        <SendEmailModal
          open={sendEmailOpen}
          onOpenChange={setSendEmailOpen}
          recipients={selectedCustomersForEmail}
          isBulk={selectedCustomersForEmail.length > 1}
        />

        {selectedCustomerForMessage && (
          <CustomerMessageModal
            open={customerMessageOpen}
            onOpenChange={setCustomerMessageOpen}
            customer={selectedCustomerForMessage}
          />
        )}

        {selectedCustomerForEdit && (
          <EditCustomerModal
            open={editCustomerOpen}
            onOpenChange={setEditCustomerOpen}
            customer={selectedCustomerForEdit}
          />
        )}
      </div>
    </div>
  );
};

export default EnhancedCustomerManagementPage;
