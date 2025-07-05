import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { StatusConfig } from '@/hooks/useStatusManagement';

interface StatusConfigContextType {
  quoteStatuses: StatusConfig[];
  orderStatuses: StatusConfig[];
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
}

const StatusConfigContext = createContext<StatusConfigContextType | undefined>(undefined);

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

export const StatusConfigProvider = ({ children }: { children: ReactNode }) => {
  const [quoteStatuses, setQuoteStatuses] = useState<StatusConfig[]>(defaultQuoteStatuses);
  const [orderStatuses, setOrderStatuses] = useState<StatusConfig[]>(defaultOrderStatuses);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        }
        if (orderSettings?.setting_value) {
          setOrderStatuses(JSON.parse(orderSettings.setting_value));
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load status config');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = async () => {
    await loadStatusSettings();
  };

  useEffect(() => {
    loadStatusSettings();
  }, []);

  return (
    <StatusConfigContext.Provider value={{ quoteStatuses, orderStatuses, isLoading, error, refreshData }}>
      {children}
    </StatusConfigContext.Provider>
  );
};

export function useStatusConfig() {
  const ctx = useContext(StatusConfigContext);
  if (!ctx) throw new Error('useStatusConfig must be used within a StatusConfigProvider');
  return ctx;
} 