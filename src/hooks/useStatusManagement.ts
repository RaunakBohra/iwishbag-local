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

  // Flow-specific properties
  triggersEmail?: boolean; // Should send email when this status is set?
  emailTemplate?: string; // Which email template to use
  requiresAction?: boolean; // Does this status require admin action?
  showsInQuotesList?: boolean; // Show in quotes page?
  showsInOrdersList?: boolean; // Show in orders page?
  canBePaid?: boolean; // Can quotes with this status be paid?
  isDefaultQuoteStatus?: boolean; // Is this the default status for new quotes?

  // Action permissions (for dynamic behavior)
  allowEdit?: boolean; // Can edit quote/order details?
  allowApproval?: boolean; // Can approve quote?
  allowRejection?: boolean; // Can reject quote?
  allowCartActions?: boolean; // Can add to cart/checkout?
  allowCancellation?: boolean; // Can cancel quote/order?
  allowRenewal?: boolean; // Can renew expired quote?
  allowShipping?: boolean; // Can be shipped?
  allowAddressEdit?: boolean; // Can edit shipping address?

  // Display and UI properties
  showInCustomerView?: boolean; // Show to customers?
  showInAdminView?: boolean; // Show to admins?
  showExpiration?: boolean; // Show expiration timer?
  isSuccessful?: boolean; // Represents successful completion?
  countsAsOrder?: boolean; // Count in order statistics?
  progressPercentage?: number; // Progress bar percentage (0-100)

  // Customer messaging
  customerMessage?: string; // Message shown to customers
  customerActionText?: string; // Text for customer action buttons

  // CSS and styling
  cssClass?: string; // CSS class for styling
  badgeVariant?: string; // Badge variant for UI
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
  const { quoteStatuses, orderStatuses, isLoading, error, refreshData, lastUpdated } = useStatusConfig();
  const { toast } = useToast();

  // Hook now uses dynamic statuses from StatusConfigProvider - no more hardcoded defaults here!

  const loadStatusSettings = async () => {
    // This function is no longer needed as the statuses are loaded from the provider
  };

  const saveStatusSettings = async (
    newQuoteStatuses: StatusConfig[],
    newOrderStatuses: StatusConfig[],
  ) => {
    try {
      console.log('Saving status settings to database...');
      console.log('Quote statuses to save:', newQuoteStatuses);
      console.log('Order statuses to save:', newOrderStatuses);

      // Save quote statuses
      const { error: quoteError } = await supabase.from('system_settings').upsert(
        {
          setting_key: 'quote_statuses',
          setting_value: JSON.stringify(newQuoteStatuses),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'setting_key',
        },
      );

      if (quoteError) {
        console.error('Error saving quote statuses:', quoteError);
        throw quoteError;
      }

      // Save order statuses
      const { error: orderError } = await supabase.from('system_settings').upsert(
        {
          setting_key: 'order_statuses',
          setting_value: JSON.stringify(newOrderStatuses),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'setting_key',
        },
      );

      if (orderError) {
        console.error('Error saving order statuses:', orderError);
        throw orderError;
      }

      toast({
        title: 'Success',
        description: 'Status settings saved successfully',
      });

      // Refresh the provider data to pick up the new settings
      await refreshData();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error saving status settings:', error);
      console.error('Full error object:', error);

      // Provide more specific error messages
      let specificErrorMessage = 'Failed to save status settings';
      if ((error as { code?: string }).code === '42501') {
        specificErrorMessage = 'Permission denied. You may not have admin access.';
      } else if ((error as { code?: string }).code === '42P01') {
        specificErrorMessage = 'Database table not found. Please check your database setup.';
      } else if ((error as { code?: string }).code === '23505') {
        specificErrorMessage = 'Duplicate key error. Please try again.';
      } else if (errorMessage) {
        specificErrorMessage = errorMessage;
      }

      toast({
        title: 'Error',
        description: specificErrorMessage,
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Get status config by name
  const getStatusConfig = (
    statusName: string,
    category: 'quote' | 'order',
  ): StatusConfig | null => {
    const statuses = category === 'quote' ? quoteStatuses : orderStatuses;
    return statuses.find((s) => s.name === statusName) || null;
  };

  // Check if status transition is valid
  const isValidTransition = (
    currentStatus: string,
    newStatus: string,
    category: 'quote' | 'order',
  ): boolean => {
    const statuses = category === 'quote' ? quoteStatuses : orderStatuses;
    const currentConfig = statuses.find((s) => s.name === currentStatus);
    if (!currentConfig || !currentConfig.isActive) return false;
    return currentConfig.allowedTransitions.includes(newStatus);
  };

  // Get allowed transitions for a status
  const getAllowedTransitions = (statusName: string, category: 'quote' | 'order'): string[] => {
    const statuses = category === 'quote' ? quoteStatuses : orderStatuses;
    const config = statuses.find((s) => s.name === statusName);
    return config?.allowedTransitions || [];
  };

  // Combined statuses array for convenience
  const statuses = [...quoteStatuses, ...orderStatuses];

  // NEW: Flow-specific helper functions
  const getDefaultQuoteStatus = (): string => {
    const defaultStatus = quoteStatuses.find((s) => s.isDefaultQuoteStatus);
    return defaultStatus?.name || 'pending';
  };

  const getStatusesForQuotesList = (): string[] => {
    return quoteStatuses.filter((s) => s.showsInQuotesList).map((s) => s.name);
  };

  const getStatusesForOrdersList = (): string[] => {
    return orderStatuses.filter((s) => s.showsInOrdersList).map((s) => s.name);
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

  // DYNAMIC: Find status for pending bank transfers
  const findBankTransferPendingStatus = () => {
    // Look for statuses that indicate awaiting payment
    return (
      orderStatuses.find(
        (s) =>
          (s.name.includes('payment') && s.name.includes('pending')) ||
          s.id === 'payment_pending' ||
          s.label.toLowerCase().includes('awaiting payment') ||
          s.customerActionText?.toLowerCase().includes('pay'),
      ) || orderStatuses.find((s) => s.name === 'payment_pending')
    );
  };

  // DYNAMIC: Find status for COD processing
  const findCODProcessingStatus = () => {
    // Look for processing status
    return (
      orderStatuses.find(
        (s) =>
          s.name === 'processing' ||
          s.id === 'processing' ||
          s.label === 'Processing' ||
          s.description?.toLowerCase().includes('processing'),
      ) || orderStatuses.find((s) => s.name === 'processing')
    );
  };

  // DYNAMIC: Find default order status
  const findDefaultOrderStatus = () => {
    // Look for 'ordered' or similar status
    return (
      orderStatuses.find(
        (s) => s.name === 'ordered' || s.id === 'ordered' || (s.countsAsOrder && !s.requiresAction),
      ) || orderStatuses.find((s) => s.name === 'ordered')
    );
  };

  // DYNAMIC: Find status by payment method
  const findStatusForPaymentMethod = (paymentMethod: string): StatusConfig | undefined => {
    switch (paymentMethod) {
      case 'bank_transfer':
        return findBankTransferPendingStatus();
      case 'cod':
        return findCODProcessingStatus();
      case 'payu':
      case 'stripe':
        // For payment gateway redirects, use processing status until payment is confirmed
        return (
          orderStatuses.find((s) => s.name === 'processing' || s.id === 'processing') ||
          findDefaultOrderStatus()
        );
      default:
        return findDefaultOrderStatus();
    }
  };

  return {
    statuses,
    quoteStatuses,
    orderStatuses,
    isLoading,
    error,
    lastUpdated, // Include timestamp for triggering re-renders
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
    refreshData,
    // DYNAMIC: Payment method status finders
    findBankTransferPendingStatus,
    findCODProcessingStatus,
    findDefaultOrderStatus,
    findStatusForPaymentMethod,
  };
};
