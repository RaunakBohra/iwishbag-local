import { useStatusConfig } from '@/providers/StatusConfigProvider';
import { useToast } from '@/hooks/use-toast';

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
  const { quoteStatuses, orderStatuses, isLoading, error } = useStatusConfig();
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
      category: 'quote'
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
      category: 'quote'
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
      allowedTransitions: ['rejected'],
      isTerminal: false,
      category: 'quote'
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
      category: 'quote'
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
      category: 'quote'
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
      category: 'quote'
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
      category: 'order'
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
      category: 'order'
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
      category: 'order'
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
      category: 'order'
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
      category: 'order'
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

      // First, check if the settings already exist
      // This logic is no longer needed as the statuses are loaded from the provider

      // Save quote statuses
      // This logic is no longer needed as the statuses are loaded from the provider

      // Save order statuses
      // This logic is no longer needed as the statuses are loaded from the provider

      // Update local state
      // This logic is no longer needed as the statuses are loaded from the provider

      toast({
        title: "Success",
        description: "Status settings saved successfully"
      });
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
    handleStatusChange
  };
}; 