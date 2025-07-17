import { useCallback } from 'react';
import { useStatusManagement } from '@/hooks/useStatusManagement';
import { QuoteState, isValidStatusTransition } from '@/types/quote';

/**
 * Hook for validating status transitions using dynamic status management configuration
 * This hook provides React components with access to dynamic status transition rules
 */
export const useStatusTransitionValidation = () => {
  const { getAllowedTransitions, getStatusConfig, quoteStatuses, orderStatuses } =
    useStatusManagement();

  // Validate status transitions using dynamic configuration
  const validateTransition = useCallback(
    (currentState: QuoteState, newState: Partial<QuoteState>): boolean => {
      const allowedTransitions = getAllowedTransitions();
      return isValidStatusTransition(currentState, newState, allowedTransitions);
    },
    [getAllowedTransitions],
  );

  // Check if a specific status allows certain actions
  const canPerformAction = useCallback(
    (
      status: string,
      action: 'edit' | 'approve' | 'cart' | 'reject' | 'cancel',
      category: 'quote' | 'order' = 'quote',
    ): boolean => {
      const statusConfig = getStatusConfig(status, category);
      if (!statusConfig) return false;

      switch (action) {
        case 'edit':
          return statusConfig.allowEdit ?? false;
        case 'approve':
          return statusConfig.allowApproval ?? false;
        case 'cart':
          return statusConfig.allowCartActions ?? false;
        case 'reject':
          return statusConfig.allowRejection ?? false;
        case 'cancel':
          return statusConfig.allowCancellation ?? false;
        default:
          return false;
      }
    },
    [getStatusConfig],
  );

  // Get statuses that allow specific actions
  const getStatusesForAction = useCallback(
    (
      action: 'edit' | 'approve' | 'cart' | 'reject' | 'cancel',
      category: 'quote' | 'order' = 'quote',
    ): string[] => {
      const statuses = category === 'quote' ? quoteStatuses : orderStatuses;

      return (statuses || [])
        .filter((status) => {
          switch (action) {
            case 'edit':
              return status.allowEdit ?? false;
            case 'approve':
              return status.allowApproval ?? false;
            case 'cart':
              return status.allowCartActions ?? false;
            case 'reject':
              return status.allowRejection ?? false;
            case 'cancel':
              return status.allowCancellation ?? false;
            default:
              return false;
          }
        })
        .map((status) => status.name);
    },
    [quoteStatuses, orderStatuses],
  );

  // Check if a status is terminal (no further transitions allowed)
  const isTerminalStatus = useCallback(
    (status: string): boolean => {
      const statusConfig = getStatusConfig(status, 'quote') || getStatusConfig(status, 'order');
      return statusConfig?.isTerminal ?? false;
    },
    [getStatusConfig],
  );

  return {
    validateTransition,
    canPerformAction,
    getStatusesForAction,
    isTerminalStatus,
  };
};

export default useStatusTransitionValidation;
