import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
  const [quoteStatuses, setQuoteStatuses] = useState<StatusConfig[]>([]);
  const [orderStatuses, setOrderStatuses] = useState<StatusConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .in('setting_key', ['quote_statuses', 'order_statuses']);

      if (error) throw error;

      if (data) {
        const quoteSettings = data.find(s => s.setting_key === 'quote_statuses');
        const orderSettings = data.find(s => s.setting_key === 'order_statuses');

        if (quoteSettings?.setting_value) {
          setQuoteStatuses(JSON.parse(quoteSettings.setting_value));
        } else {
          setQuoteStatuses(defaultQuoteStatuses);
        }
        
        if (orderSettings?.setting_value) {
          setOrderStatuses(JSON.parse(orderSettings.setting_value));
        } else {
          setOrderStatuses(defaultOrderStatuses);
        }
      } else {
        // No settings found, use defaults
        setQuoteStatuses(defaultQuoteStatuses);
        setOrderStatuses(defaultOrderStatuses);
      }
    } catch (error: any) {
      console.error('Error loading status settings:', error);
      setError(error.message);
      // Use defaults on error
      setQuoteStatuses(defaultQuoteStatuses);
      setOrderStatuses(defaultOrderStatuses);
      
      toast({
        title: "Warning",
        description: "Using default status configurations. Check your database connection.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveStatusSettings = async (newQuoteStatuses: StatusConfig[], newOrderStatuses: StatusConfig[]) => {
    try {
      // Save quote statuses
      const { error: quoteError } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'quote_statuses',
          setting_value: JSON.stringify(newQuoteStatuses),
          description: 'Quote status configuration'
        });

      if (quoteError) throw quoteError;

      // Save order statuses
      const { error: orderError } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'order_statuses',
          setting_value: JSON.stringify(newOrderStatuses),
          description: 'Order status configuration'
        });

      if (orderError) throw orderError;

      // Update local state
      setQuoteStatuses(newQuoteStatuses);
      setOrderStatuses(newOrderStatuses);

      toast({
        title: "Success",
        description: "Status settings saved successfully"
      });
    } catch (error: any) {
      console.error('Error saving status settings:', error);
      toast({
        title: "Error",
        description: "Failed to save status settings",
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

  // Load settings on mount
  useEffect(() => {
    loadStatusSettings();
  }, []);

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
    loadStatusSettings,
    handleStatusChange
  };
}; 