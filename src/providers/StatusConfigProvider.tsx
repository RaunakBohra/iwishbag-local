import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { StatusConfig } from '@/hooks/useStatusManagement';

interface StatusConfigContextType {
  quoteStatuses: StatusConfig[];
  orderStatuses: StatusConfig[];
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  lastUpdated: number; // Timestamp to trigger re-renders
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
    allowedTransitions: ['pending', 'sent', 'rejected'],
    isTerminal: false,
    category: 'quote',
    // Flow properties
    triggersEmail: false,
    requiresAction: true,
    showsInQuotesList: true,
    showsInOrdersList: false,
    canBePaid: false,
    isDefaultQuoteStatus: true,
    // Action permissions
    allowEdit: true,
    allowApproval: false,
    allowRejection: true,
    allowCartActions: false,
    allowCancellation: true,
    allowRenewal: false,
    allowShipping: false,
    allowAddressEdit: true,
    // Display properties
    showInCustomerView: true,
    showInAdminView: true,
    showExpiration: false,
    isSuccessful: false,
    countsAsOrder: false,
    progressPercentage: 10,
    // Customer messaging
    customerMessage: 'Your quote is being reviewed by our team',
    customerActionText: 'Waiting for Review',
    // CSS styling
    cssClass: 'status-pending',
    badgeVariant: 'secondary',
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
    allowedTransitions: ['sent', 'approved', 'rejected', 'expired'],
    autoExpireHours: 168, // 7 days
    isTerminal: false,
    category: 'quote',
    // Flow properties
    triggersEmail: true,
    emailTemplate: 'quote_sent',
    requiresAction: false,
    showsInQuotesList: true,
    showsInOrdersList: false,
    canBePaid: false,
    // Action permissions
    allowEdit: false,
    allowApproval: true,
    allowRejection: true,
    allowCartActions: false,
    allowCancellation: true,
    allowRenewal: false,
    allowShipping: false,
    allowAddressEdit: true,
    // Display properties
    showInCustomerView: true,
    showInAdminView: true,
    showExpiration: true,
    isSuccessful: false,
    countsAsOrder: false,
    progressPercentage: 40,
    // Customer messaging
    customerMessage: 'Your quote is ready for review',
    customerActionText: 'Review Quote',
    // CSS styling
    cssClass: 'status-sent',
    badgeVariant: 'outline',
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
    allowedTransitions: ['approved', 'pending', 'rejected', 'payment_pending', 'paid'],
    isTerminal: false,
    category: 'quote',
    // Flow properties
    triggersEmail: true,
    emailTemplate: 'quote_approved',
    requiresAction: false,
    showsInQuotesList: true,
    showsInOrdersList: false,
    canBePaid: true,
    // Action permissions
    allowEdit: false,
    allowApproval: false,
    allowRejection: true,
    allowCartActions: true,
    allowCancellation: true,
    allowRenewal: false,
    allowShipping: false,
    allowAddressEdit: true,
    // Display properties
    showInCustomerView: true,
    showInAdminView: true,
    showExpiration: true,
    isSuccessful: true,
    countsAsOrder: false,
    progressPercentage: 60,
    // Customer messaging
    customerMessage: 'Approved - Ready to add to cart',
    customerActionText: 'Add to Cart',
    // CSS styling
    cssClass: 'status-approved',
    badgeVariant: 'default',
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
    allowedTransitions: ['rejected', 'pending', 'approved'],
    isTerminal: true,
    category: 'quote',
    // Flow properties
    triggersEmail: true,
    emailTemplate: 'quote_rejected',
    requiresAction: false,
    showsInQuotesList: true,
    showsInOrdersList: false,
    canBePaid: false,
    // Action permissions
    allowEdit: false,
    allowApproval: true,
    allowRejection: false,
    allowCartActions: false,
    allowCancellation: false,
    allowRenewal: false,
    allowShipping: false,
    allowAddressEdit: false,
    // Display properties
    showInCustomerView: true,
    showInAdminView: true,
    showExpiration: false,
    isSuccessful: false,
    countsAsOrder: false,
    progressPercentage: 0,
    // Customer messaging
    customerMessage: 'Quote has been rejected',
    customerActionText: 'Request New Quote',
    // CSS styling
    cssClass: 'status-rejected',
    badgeVariant: 'destructive',
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
    allowedTransitions: ['expired', 'pending', 'approved'],
    isTerminal: true,
    category: 'quote',
    // Flow properties
    triggersEmail: true,
    emailTemplate: 'quote_expired',
    requiresAction: false,
    showsInQuotesList: true,
    showsInOrdersList: false,
    canBePaid: false,
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
    canBePaid: false,
  },
];

const defaultOrderStatuses: StatusConfig[] = [
  {
    id: 'payment_pending',
    name: 'payment_pending',
    label: 'Awaiting Payment',
    description: 'Order placed, awaiting payment verification',
    color: 'outline',
    icon: 'Clock',
    isActive: true,
    order: 1,
    allowedTransitions: ['payment_pending', 'paid', 'ordered', 'cancelled'],
    isTerminal: false,
    category: 'order',
    // Flow properties
    triggersEmail: true,
    emailTemplate: 'payment_instructions',
    requiresAction: false,
    showsInQuotesList: false,
    showsInOrdersList: true,
    canBePaid: false,
    // Action permissions
    allowEdit: false,
    allowApproval: false,
    allowRejection: false,
    allowCartActions: false,
    allowCancellation: true,
    allowRenewal: false,
    allowShipping: false,
    allowAddressEdit: true,
    // Display properties
    showInCustomerView: true,
    showInAdminView: true,
    showExpiration: false,
    isSuccessful: false,
    countsAsOrder: true,
    progressPercentage: 70,
    // Customer messaging
    customerMessage: 'Order placed - Please complete payment',
    customerActionText: 'Pay Now',
    // CSS styling
    cssClass: 'status-payment-pending',
    badgeVariant: 'outline',
  },
  {
    id: 'processing',
    name: 'processing',
    label: 'Processing',
    description: 'Order is being processed and prepared for fulfillment',
    color: 'secondary',
    icon: 'RefreshCw',
    isActive: true,
    order: 2,
    allowedTransitions: ['processing', 'ordered', 'shipped', 'cancelled'],
    isTerminal: false,
    category: 'order',
    // Flow properties
    triggersEmail: true,
    emailTemplate: 'order_processing',
    requiresAction: true,
    showsInQuotesList: false,
    showsInOrdersList: true,
    canBePaid: false,
  },
  {
    id: 'paid',
    name: 'paid',
    label: 'Paid',
    description: 'Payment has been received',
    color: 'default',
    icon: 'DollarSign',
    isActive: true,
    order: 3,
    allowedTransitions: ['paid', 'ordered', 'cancelled'],
    isTerminal: false,
    category: 'order',
    // Flow properties
    triggersEmail: true,
    emailTemplate: 'payment_received',
    requiresAction: true,
    showsInQuotesList: false,
    showsInOrdersList: true,
    canBePaid: false,
    // Action permissions
    allowEdit: false,
    allowApproval: false,
    allowRejection: false,
    allowCartActions: false,
    allowCancellation: true,
    allowRenewal: false,
    allowShipping: false,
    allowAddressEdit: false,
    // Display properties
    showInCustomerView: true,
    showInAdminView: true,
    showExpiration: false,
    isSuccessful: true,
    countsAsOrder: true,
    progressPercentage: 80,
    // Customer messaging
    customerMessage: 'Payment received - Order being processed',
    customerActionText: 'View Order',
    // CSS styling
    cssClass: 'status-paid',
    badgeVariant: 'default',
  },
  {
    id: 'ordered',
    name: 'ordered',
    label: 'Ordered',
    description: 'Order has been placed with merchant',
    color: 'default',
    icon: 'ShoppingCart',
    isActive: true,
    order: 4,
    allowedTransitions: ['ordered', 'shipped', 'cancelled'],
    isTerminal: false,
    category: 'order',
    // Flow properties
    triggersEmail: true,
    emailTemplate: 'order_placed',
    requiresAction: false,
    showsInQuotesList: false,
    showsInOrdersList: true,
    canBePaid: false,
  },
  {
    id: 'shipped',
    name: 'shipped',
    label: 'Shipped',
    description: 'Order has been shipped',
    color: 'secondary',
    icon: 'Truck',
    isActive: true,
    order: 5,
    allowedTransitions: ['shipped', 'completed', 'cancelled'],
    isTerminal: false,
    category: 'order',
    // Flow properties
    triggersEmail: true,
    emailTemplate: 'order_shipped',
    requiresAction: false,
    showsInQuotesList: false,
    showsInOrdersList: true,
    canBePaid: false,
    // Action permissions
    allowEdit: false,
    allowApproval: false,
    allowRejection: false,
    allowCartActions: false,
    allowCancellation: true,
    allowRenewal: false,
    allowShipping: true,
    allowAddressEdit: false,
    // Display properties
    showInCustomerView: true,
    showInAdminView: true,
    showExpiration: false,
    isSuccessful: true,
    countsAsOrder: true,
    progressPercentage: 90,
    // Customer messaging
    customerMessage: 'Your order is on the way!',
    customerActionText: 'Track Package',
    // CSS styling
    cssClass: 'status-shipped',
    badgeVariant: 'secondary',
  },
  {
    id: 'completed',
    name: 'completed',
    label: 'Completed',
    description: 'Order has been delivered',
    color: 'outline',
    icon: 'CheckCircle',
    isActive: true,
    order: 6,
    allowedTransitions: ['completed'],
    isTerminal: true,
    category: 'order',
    // Flow properties
    triggersEmail: true,
    emailTemplate: 'order_completed',
    requiresAction: false,
    showsInQuotesList: false,
    showsInOrdersList: true,
    canBePaid: false,
    // Action permissions
    allowEdit: false,
    allowApproval: false,
    allowRejection: false,
    allowCartActions: false,
    allowCancellation: false,
    allowRenewal: false,
    allowShipping: false,
    allowAddressEdit: false,
    // Display properties
    showInCustomerView: true,
    showInAdminView: true,
    showExpiration: false,
    isSuccessful: true,
    countsAsOrder: true,
    progressPercentage: 100,
    // Customer messaging
    customerMessage: 'Order completed successfully!',
    customerActionText: 'Order Again',
    // CSS styling
    cssClass: 'status-completed',
    badgeVariant: 'outline',
  },
  {
    id: 'cancelled',
    name: 'cancelled',
    label: 'Cancelled',
    description: 'Quote or order has been cancelled',
    color: 'destructive',
    icon: 'XCircle',
    isActive: true,
    order: 7,
    allowedTransitions: ['cancelled'],
    isTerminal: true,
    category: 'order',
    // Flow properties
    triggersEmail: true,
    emailTemplate: 'order_cancelled',
    requiresAction: false,
    showsInQuotesList: true,
    showsInOrdersList: true,
    canBePaid: false,
  },
];

export const StatusConfigProvider = ({ children }: { children: ReactNode }) => {
  const [quoteStatuses, setQuoteStatuses] = useState<StatusConfig[]>(defaultQuoteStatuses);
  const [orderStatuses, setOrderStatuses] = useState<StatusConfig[]>(defaultOrderStatuses);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());

  const loadStatusSettings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('🔄 Loading status settings from database...');
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .in('setting_key', ['quote_statuses', 'order_statuses']);
      if (error) throw error;

      const quoteSettings = data?.find((s) => s.setting_key === 'quote_statuses');
      const orderSettings = data?.find((s) => s.setting_key === 'order_statuses');

      // If database is empty, initialize with defaults
      if (!quoteSettings || !orderSettings) {
        console.log('📝 Database empty - initializing with default statuses...');
        await initializeDefaultStatuses();
        return; // Will reload after initialization
      }

      // Load from database
      if (quoteSettings?.setting_value) {
        try {
          // Clean up invalid escapes before parsing
          const cleanedJSON = quoteSettings.setting_value.replace(/\\!/g, '!');
          const loadedQuoteStatuses = JSON.parse(cleanedJSON);
          console.log(
            '✅ Loaded quote statuses from database:',
            loadedQuoteStatuses.map((s) => s.name),
          );
          setQuoteStatuses(loadedQuoteStatuses);
        } catch (e) {
          const errorMessage = e instanceof Error ? e.message : 'Unknown error';
          console.error('Error parsing quote statuses JSON:', errorMessage);
          console.error('Invalid JSON content:', quoteSettings.setting_value);
          throw new Error(`Invalid JSON in quote_statuses: ${errorMessage}`);
        }
      }
      if (orderSettings?.setting_value) {
        try {
          // Clean up invalid escapes before parsing
          const cleanedJSON = orderSettings.setting_value.replace(/\\!/g, '!');
          const loadedOrderStatuses = JSON.parse(cleanedJSON);
          console.log(
            '✅ Loaded order statuses from database:',
            loadedOrderStatuses.map((s) => s.name),
          );
          setOrderStatuses(loadedOrderStatuses);
        } catch (e) {
          const errorMessage = e instanceof Error ? e.message : 'Unknown error';
          console.error('Error parsing order statuses JSON:', errorMessage);
          console.error('Invalid JSON content:', orderSettings.setting_value);
          throw new Error(`Invalid JSON in order_statuses: ${errorMessage}`);
        }
      }
      
      // Update timestamp to trigger re-renders
      setLastUpdated(Date.now());
    } catch (err) {
      console.error('❌ Failed to load status config:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load status config';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeDefaultStatuses = async () => {
    try {
      console.log('🏗️ Initializing default statuses in database...');

      // Save default quote statuses
      const { error: quoteError } = await supabase.from('system_settings').upsert(
        {
          setting_key: 'quote_statuses',
          setting_value: JSON.stringify(defaultQuoteStatuses),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'setting_key',
        },
      );

      if (quoteError) throw quoteError;

      // Save default order statuses
      const { error: orderError } = await supabase.from('system_settings').upsert(
        {
          setting_key: 'order_statuses',
          setting_value: JSON.stringify(defaultOrderStatuses),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'setting_key',
        },
      );

      if (orderError) throw orderError;

      console.log('✅ Default statuses initialized successfully');

      // Set local state to defaults
      setQuoteStatuses(defaultQuoteStatuses);
      setOrderStatuses(defaultOrderStatuses);
      setLastUpdated(Date.now());
    } catch (error) {
      console.error('❌ Failed to initialize default statuses:', error);
      // Fallback to defaults in memory if database initialization fails
      setQuoteStatuses(defaultQuoteStatuses);
      setOrderStatuses(defaultOrderStatuses);
      setLastUpdated(Date.now());
    }
  };

  const refreshData = async () => {
    await loadStatusSettings();
  };

  useEffect(() => {
    loadStatusSettings();

    // Set up real-time subscription for status changes
    const subscription = supabase
      .channel('status-config-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'system_settings',
          filter: 'setting_key=in.(quote_statuses,order_statuses)',
        },
        (payload) => {
          console.log('🔄 Status config changed in database, refreshing...', payload);
          // Refresh data when status settings change
          loadStatusSettings();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <StatusConfigContext.Provider
      value={{ quoteStatuses, orderStatuses, isLoading, error, refreshData, lastUpdated }}
    >
      {children}
    </StatusConfigContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export function useStatusConfig() {
  const ctx = useContext(StatusConfigContext);
  if (!ctx) throw new Error('useStatusConfig must be used within a StatusConfigProvider');
  return ctx;
}
