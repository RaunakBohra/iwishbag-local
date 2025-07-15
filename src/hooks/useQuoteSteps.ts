import { useMemo } from 'react';
import { Quote } from '@/types/quote';
import { useStatusManagement } from '@/hooks/useStatusManagement';

export type QuoteStep = {
  id: string;
  label: string;
  description: string;
  date: string | null;
  status: 'completed' | 'current' | 'upcoming' | 'error';
  icon: string;
};

export const useQuoteSteps = (quote: Quote | null) => {
  const { quoteStatuses, orderStatuses, getStatusConfig } = useStatusManagement();

  return useMemo(() => {
    if (!quote) return [];

    // Combine and sort all statuses by order
    const allStatuses = [...quoteStatuses, ...orderStatuses]
      .filter(status => status.isActive)
      .sort((a, b) => a.order - b.order);

    // Map statuses to steps
    const steps: QuoteStep[] = allStatuses.map(statusConfig => ({
      id: statusConfig.name,
      label: statusConfig.label,
      description: statusConfig.description,
      date: getDateForStatus(quote, statusConfig.name),
      status: 'upcoming' as const,
      icon: getIconForStatus(statusConfig.icon)
    }));

    // Determine current step based on quote status
    const currentStatusIndex = allStatuses.findIndex(s => s.name === quote.status);
    
    // Set step statuses based on progression
    for (let i = 0; i < steps.length; i++) {
      if (i < currentStatusIndex) {
        steps[i].status = 'completed';
      } else if (i === currentStatusIndex) {
        steps[i].status = 'current';
      } else {
        steps[i].status = 'upcoming';
      }
    }

    // Handle error states (rejected, cancelled, expired)
    const currentStatusConfig = getStatusConfig(quote.status || '', 'quote') || 
                               getStatusConfig(quote.status || '', 'order');
    
    if (currentStatusConfig?.isTerminal && !isSuccessStatus(quote.status || '', getStatusConfig)) {
      const currentStep = steps.find(s => s.id === quote.status);
      if (currentStep) {
        currentStep.status = 'error';
      }
    }

    return steps;
  }, [quote, quoteStatuses, orderStatuses, getStatusConfig]);
};

// Helper function to get date for a specific status
function getDateForStatus(quote: Quote, statusName: string): string | null {
  const dateMap: Record<string, string | null> = {
    'pending': quote.created_at,
    'calculated': quote.calculated_at || null,
    'sent': quote.sent_at || null,
    'approved': quote.approved_at || null,
    'paid': quote.paid_at || null,
    'ordered': quote.ordered_at || null,
    'shipped': quote.shipped_at || null,
    'completed': quote.delivered_at || quote.completed_at || null,
    'delivered': quote.delivered_at || null,
    'rejected': quote.rejected_at || null,
    'cancelled': quote.cancelled_at || null,
    'expired': quote.expired_at || null,
  };

  return dateMap[statusName] || null;
}

// Helper function to map status icon names to icon strings
function getIconForStatus(iconName: string): string {
  const iconMap: Record<string, string> = {
    'Clock': 'clock',
    'FileText': 'file-text',
    'CheckCircle': 'check-circle',
    'DollarSign': 'credit-card',
    'ShoppingCart': 'package',
    'Truck': 'truck',
    'Package': 'package',
    'XCircle': 'x-circle',
    'AlertTriangle': 'alert-triangle',
    'Calculator': 'calculator',
    'RefreshCw': 'refresh-cw',
  };

  return iconMap[iconName] || 'circle';
}

// DYNAMIC: Helper function to determine if a status represents success using status config
function isSuccessStatus(status: string, getStatusConfig: (statusName: string, category: 'quote' | 'order') => { isSuccessful?: boolean } | null): boolean {
  const statusConfig = getStatusConfig(status, 'quote') || getStatusConfig(status, 'order');
  return statusConfig?.isSuccessful ?? ['completed', 'delivered', 'paid', 'approved'].includes(status); // fallback
}