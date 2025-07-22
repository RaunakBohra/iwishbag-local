/**
 * React hooks for SLA (Service Level Agreement) operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { slaService, type SLAPolicy, type TicketWithSLA } from '@/services/SLAService';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook to get all SLA policies
 */
export const useSLAPolicies = () => {
  return useQuery({
    queryKey: ['sla-policies'],
    queryFn: () => slaService.getSLAPolicies(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to get SLA policy for a specific priority
 */
export const useSLAPolicy = (priority: string) => {
  return useQuery({
    queryKey: ['sla-policy', priority],
    queryFn: () => slaService.getSLAPolicy(priority),
    enabled: !!priority,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to get SLA summary statistics
 */
export const useSLASummary = () => {
  return useQuery({
    queryKey: ['sla-summary'],
    queryFn: () => slaService.getSLASummary(),
    refetchInterval: 2 * 60 * 1000, // Refresh every 2 minutes
  });
};

/**
 * Hook to get tickets with SLA breaches
 */
export const useBreachedTickets = () => {
  return useQuery({
    queryKey: ['breached-tickets'],
    queryFn: () => slaService.getBreachedTickets(),
    refetchInterval: 60 * 1000, // Refresh every minute
  });
};

/**
 * Hook to update SLA breach flags
 */
export const useUpdateSLABreachFlags = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => slaService.updateSLABreachFlags(),
    onSuccess: (breachCount) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['sla-summary'] });
      queryClient.invalidateQueries({ queryKey: ['breached-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });

      if (breachCount > 0) {
        toast({
          title: 'SLA Status Updated',
          description: `Found ${breachCount} new SLA breaches`,
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      console.error('Failed to update SLA breach flags:', error);
      toast({
        title: 'Error',
        description: 'Failed to update SLA breach flags',
        variant: 'destructive',
      });
    },
  });
};

/**
 * Hook to calculate SLA status for a ticket
 */
export const useSLAStatus = (ticket: TicketWithSLA | null) => {
  return useQuery({
    queryKey: ['sla-status', ticket?.id],
    queryFn: () => {
      if (!ticket) return null;
      return slaService.calculateSLAStatus(ticket);
    },
    enabled: !!ticket,
    // Refresh every 30 seconds for real-time updates
    refetchInterval: 30 * 1000,
  });
};

/**
 * Utility hook for SLA formatting and colors
 */
export const useSLAUtils = () => {
  const formatTimeRemaining = (timeRemaining: number) => {
    return slaService.formatTimeRemaining(timeRemaining);
  };

  const getSLAStatusColor = (status: string) => {
    return slaService.getSLAStatusColor(status);
  };

  const getSLAStatusIcon = (status: string) => {
    switch (status) {
      case 'safe':
        return '🟢';
      case 'warning':
        return '🟡';
      case 'critical':
        return '🟠';
      case 'breached':
        return '🔴';
      case 'met':
        return '✅';
      default:
        return '⚪';
    }
  };

  const getSLAStatusLabel = (status: string) => {
    switch (status) {
      case 'safe':
        return 'On Track';
      case 'warning':
        return 'Warning';
      case 'critical':
        return 'Critical';
      case 'breached':
        return 'Breached';
      case 'met':
        return 'Met';
      default:
        return 'Unknown';
    }
  };

  const getSLAPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'Urgent';
      case 'high':
        return 'High';
      case 'medium':
        return 'Medium';
      case 'low':
        return 'Low';
      default:
        return 'Medium';
    }
  };

  const getSLAPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-700 bg-red-100 border-red-300';
      case 'high':
        return 'text-orange-700 bg-orange-100 border-orange-300';
      case 'medium':
        return 'text-blue-700 bg-blue-100 border-blue-300';
      case 'low':
        return 'text-gray-700 bg-gray-100 border-gray-300';
      default:
        return 'text-blue-700 bg-blue-100 border-blue-300';
    }
  };

  return {
    formatTimeRemaining,
    getSLAStatusColor,
    getSLAStatusIcon,
    getSLAStatusLabel,
    getSLAPriorityLabel,
    getSLAPriorityColor,
  };
};

/**
 * Hook for real-time SLA monitoring (updates every 30 seconds)
 */
export const useSLAMonitoring = () => {
  const updateSLAMutation = useUpdateSLABreachFlags();
  const { data: summary, refetch: refetchSummary } = useSLASummary();
  const { data: breachedTickets, refetch: refetchBreached } = useBreachedTickets();

  const refreshSLAData = async () => {
    try {
      // Update breach flags first
      await updateSLAMutation.mutateAsync();
      
      // Then refresh data
      await Promise.all([
        refetchSummary(),
        refetchBreached(),
      ]);
    } catch (error) {
      console.error('Error refreshing SLA data:', error);
    }
  };

  return {
    summary,
    breachedTickets,
    refreshSLAData,
    isRefreshing: updateSLAMutation.isPending,
  };
};