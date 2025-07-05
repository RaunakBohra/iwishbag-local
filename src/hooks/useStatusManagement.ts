import { useStatusConfig } from '@/providers/StatusConfigProvider';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface StatusConfig {
  id: string;
  name: string;
  label: string;
  description: string;
  color: 'default' | 'secondary' | 'outline' | 'destructive';
  icon: string;
  isActive: boolean;
  order: number;
  allowedTransitions: string[];
  autoExpireHours?: number;
  isTerminal: boolean;
  category: 'quote' | 'order';
  
  // NEW: Flow-specific properties
  triggersEmail?: boolean;           // Should send email when this status is set?
  emailTemplate?: string;            // Which email template to use
  requiresAction?: boolean;          // Does this status require admin action?
  showsInQuotesList?: boolean;      // Show in quotes page?
  showsInOrdersList?: boolean;      // Show in orders page?
  canBePaid?: boolean;              // Can quotes with this status be paid?
  isDefaultQuoteStatus?: boolean;    // Is this the default status for new quotes?
}

export interface StatusWorkflow {
  [key: string]: {
    next: string[];
    label: string;
    color: 'default' | 'secondary' | 'outline' | 'destructive';
    icon: string;
    description: string;
    isTerminal: boolean;
    autoExpireHours?: number;
  };
}

export const useStatusManagement = () => {
  const { quoteStatuses, orderStatuses, isLoading, error, refreshData } = useStatusConfig();
  const { toast } = useToast();

  // Default statuses as fallback
  const defaultQuoteStatuses: StatusConfig[] = [
    {
      id: 'pending',
      name: 'pending',
      label: 'Pending',
      description: 'Quote request is awaiting review',
      color: 'secondary',
      icon: 'Clock',
      isActive: true,
      order: 1,
      allowedTransitions: ['sent', 'rejected'],
      isTerminal: false,
      category: 'quote',
      // Flow properties
      triggersEmail: false,
      requiresAction: true,
      showsInQuotesList: true,
      showsInOrdersList: false,
      canBePaid: false,
      isDefaultQuoteStatus: true
    },
    {
      id: 'sent',
      name: 'sent',
      label: 'Sent',
      description: 'Quote has been sent to customer',
      color: 'outline',
      icon: 'FileText',
      isActive: true,
      order: 2,
      allowedTransitions: ['approved', 'rejected', 'expired'],
      autoExpireHours: 168, // 7 days
      isTerminal: false,
      category: 'quote',
      // Flow properties
      triggersEmail: true,
      emailTemplate: 'quote_sent',
      requiresAction: false,
      showsInQuotesList: true,
      showsInOrdersList: false,
      canBePaid: false
    },
    {
      id: 'approved',
      name: 'approved',
      label: 'Approved',
      description: 'Customer has approved the quote',
      color: 'default',
      icon: 'CheckCircle',
      isActive: true,
      order: 3,
      allowedTransitions: ['rejected', 'paid'],
      isTerminal: false,
      category: 'quote',
      // Flow properties
      triggersEmail: true,
      emailTemplate: 'quote_approved',
      requiresAction: false,
      showsInQuotesList: true,
      showsInOrdersList: false,
      canBePaid: true
    },
    {
      id: 'rejected',
      name: 'rejected',
      label: 'Rejected',
      description: 'Quote has been rejected',
      color: 'destructive',
      icon: 'XCircle',
      isActive: true,
      order: 4,
      allowedTransitions: ['approved'],
      isTerminal: true,
      category: 'quote',
      // Flow properties
      triggersEmail: true,
      emailTemplate: 'quote_rejected',
      requiresAction: false,
      showsInQuotesList: true,
      showsInOrdersList: false,
      canBePaid: false
    },
    {
      id: 'expired',
      name: 'expired',
      label: 'Expired',
      description: 'Quote has expired',
      color: 'destructive',
      icon: 'AlertTriangle',
      isActive: true,
      order: 5,
      allowedTransitions: ['approved'],
      isTerminal: true,
      category: 'quote',
      // Flow properties
      triggersEmail: true,
      emailTemplate: 'quote_expired',
      requiresAction: false,
      showsInQuotesList: true,
      showsInOrdersList: false,
      canBePaid: false
    },
    {
      id: 'calculated',
      name: 'calculated',
      label: 'Calculated',
      description: 'Quote has been calculated and is ready for review',
      color: 'secondary',
      icon: 'Calculator',
      isActive: true,
      order: 6,
      allowedTransitions: ['sent', 'approved', 'rejected'],
      isTerminal: false,
      category: 'quote',
      // Flow properties
      triggersEmail: false,
      requiresAction: true,
      showsInQuotesList: true,
      showsInOrdersList: false,
      canBePaid: false
    }
  ];

  const defaultOrderStatuses: StatusConfig[] = [
    {
      id: 'paid',
      name: 'paid',
      label: 'Paid',
      description: 'Payment has been received',
      color: 'default',
      icon: 'DollarSign',
      isActive: true,
      order: 1,
      allowedTransitions: ['ordered', 'cancelled'],
      isTerminal: false,
      category: 'order',
      // Flow properties
      triggersEmail: true,
      emailTemplate: 'payment_received',
      requiresAction: true,
      showsInQuotesList: false,
      showsInOrdersList: true,
      canBePaid: false
    },
    {
      id: 'ordered',
      name: 'ordered',
      label: 'Ordered',
      description: 'Order has been placed with merchant',
      color: 'default',
      icon: 'ShoppingCart',
      isActive: true,
      order: 2,
      allowedTransitions: ['shipped', 'cancelled'],
      isTerminal: false,
      category: 'order',
      // Flow properties
      triggersEmail: true,
      emailTemplate: 'order_placed',
      requiresAction: false,
      showsInQuotesList: false,
      showsInOrdersList: true,
      canBePaid: false
    },
    {
      id: 'shipped',
      name: 'shipped',
      label: 'Shipped',
      description: 'Order has been shipped',
      color: 'secondary',
      icon: 'Truck',
      isActive: true,
      order: 3,
      allowedTransitions: ['completed', 'cancelled'],
      isTerminal: false,
      category: 'order',
      // Flow properties
      triggersEmail: true,
      emailTemplate: 'order_shipped',
      requiresAction: false,
      showsInQuotesList: false,
      showsInOrdersList: true,
      canBePaid: false
    },
    {
      id: 'completed',
      name: 'completed',
      label: 'Completed',
      description: 'Order has been delivered',
      color: 'outline',
      icon: 'CheckCircle',
      isActive: true,
      order: 4,
      allowedTransitions: [],
      isTerminal: true,
      category: 'order',
      // Flow properties
      triggersEmail: true,
      emailTemplate: 'order_completed',
      requiresAction: false,
      showsInQuotesList: false,
      showsInOrdersList: true,
      canBePaid: false
    },
    {
      id: 'cancelled',
      name: 'cancelled',
      label: 'Cancelled',
      description: 'Quote or order has been cancelled',
      color: 'destructive',
      icon: 'XCircle',
      isActive: true,
      order: 5,
      allowedTransitions: [],
      isTerminal: true,
      category: 'order',
      // Flow properties
      triggersEmail: true,
      emailTemplate: 'order_cancelled',
      requiresAction: false,
      showsInQuotesList: true,
      showsInOrdersList: true,
      canBePaid: false
    }
  ];

  const loadStatusSettings = async () => {
    // This function is no longer needed as the statuses are loaded from the provider
  };

  const saveStatusSettings = async (newQuoteStatuses: StatusConfig[], newOrderStatuses: StatusConfig[]) => {
    try {
      console.log('Saving status settings to database...');
      console.log('Quote statuses to save:', newQuoteStatuses);
      console.log('Order statuses to save:', newOrderStatuses);

      // Save quote statuses
      const { error: quoteError } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'quote_statuses',
          setting_value: JSON.stringify(newQuoteStatuses),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'setting_key'
        });

      if (quoteError) {
        console.error('Error saving quote statuses:', quoteError);
        throw quoteError;
      }

      // Save order statuses
      const { error: orderError } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'order_statuses',
          setting_value: JSON.stringify(newOrderStatuses),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'setting_key'
        });

      if (orderError) {
        console.error('Error saving order statuses:', orderError);
        throw orderError;
      }

      toast({
        title: "Success",
        description: "Status settings saved successfully"
      });

      // Refresh the provider data to pick up the new settings
      await refreshData();

    } catch (error: any) {
      console.error('Error saving status settings:', error);
      console.error('Full error object:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to save status settings';
      if (error.code === '42501') {
        errorMessage = 'Permission denied. You may not have admin access.';
      } else if (error.code === '42P01') {
        errorMessage = 'Database table not found. Please check your database setup.';
      } else if (error.code === '23505') {
        errorMessage = 'Duplicate key error. Please try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      throw error;
    }
  };

  // Get status config by name
  const getStatusConfig = (statusName: string, category: 'quote' | 'order'): StatusConfig | null => {
    const statuses = category === 'quote' ? quoteStatuses : orderStatuses;
    return statuses.find(s => s.name === statusName) || null;
  };

  // Check if status transition is valid
  const isValidTransition = (currentStatus: string, newStatus: string, category: 'quote' | 'order'): boolean => {
    const statuses = category === 'quote' ? quoteStatuses : orderStatuses;
    const currentConfig = statuses.find(s => s.name === currentStatus);
    if (!currentConfig || !currentConfig.isActive) return false;
    return currentConfig.allowedTransitions.includes(newStatus);
  };

  // Get allowed transitions for a status
  const getAllowedTransitions = (statusName: string, category: 'quote' | 'order'): string[] => {
    const statuses = category === 'quote' ? quoteStatuses : orderStatuses;
    const config = statuses.find(s => s.name === statusName);
    return config?.allowedTransitions || [];
  };

  // Combined statuses array for convenience
  const statuses = [...quoteStatuses, ...orderStatuses];

  // NEW: Flow-specific helper functions
  const getDefaultQuoteStatus = (): string => {
    const defaultStatus = quoteStatuses.find(s => s.isDefaultQuoteStatus);
    return defaultStatus?.name || 'pending';
  };

  const getStatusesForQuotesList = (): string[] => {
    return quoteStatuses
      .filter(s => s.showsInQuotesList)
      .map(s => s.name);
  };

  const getStatusesForOrdersList = (): string[] => {
    return orderStatuses
      .filter(s => s.showsInOrdersList)
      .map(s => s.name);
  };

  const canQuoteBePaid = (status: string): boolean => {
    const config = getStatusConfig(status, 'quote');
    return config?.canBePaid || false;
  };

  const shouldTriggerEmail = (status: string, category: 'quote' | 'order'): boolean => {
    const config = getStatusConfig(status, category);
    return config?.triggersEmail || false;
  };

  const getEmailTemplate = (status: string, category: 'quote' | 'order'): string | undefined => {
    const config = getStatusConfig(status, category);
    return config?.emailTemplate;
  };

  const requiresAdminAction = (status: string, category: 'quote' | 'order'): boolean => {
    const config = getStatusConfig(status, category);
    return config?.requiresAction || false;
  };

  // Handle status change (for use in components)
  const handleStatusChange = async (newStatus: string) => {
    // This function would typically update a quote's status
    // For now, it's a placeholder that can be overridden by the component
    console.log('Status change requested:', newStatus);
  };

  return {
    statuses,
    quoteStatuses,
    orderStatuses,
    isLoading,
    error,
    getStatusConfig,
    isValidTransition,
    getAllowedTransitions,
    saveStatusSettings,
    handleStatusChange,
    // NEW: Flow helper functions
    getDefaultQuoteStatus,
    getStatusesForQuotesList,
    getStatusesForOrdersList,
    canQuoteBePaid,
    shouldTriggerEmail,
    getEmailTemplate,
    requiresAdminAction,
    refreshData
  };
}; 