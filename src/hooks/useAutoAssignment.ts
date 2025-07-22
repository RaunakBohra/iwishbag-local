/**
 * React hooks for auto-assignment operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { autoAssignmentService, type AutoAssignmentRule } from '@/services/AutoAssignmentService';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook to get all assignment rules
 */
export const useAssignmentRules = () => {
  return useQuery({
    queryKey: ['assignment-rules'],
    queryFn: () => autoAssignmentService.getAssignmentRules(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * Hook to get active assignment rules
 */
export const useActiveAssignmentRules = () => {
  return useQuery({
    queryKey: ['assignment-rules', 'active'],
    queryFn: () => autoAssignmentService.getActiveRules(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * Hook to get assignment statistics
 */
export const useAssignmentStats = () => {
  return useQuery({
    queryKey: ['assignment-stats'],
    queryFn: () => autoAssignmentService.getAssignmentStats(),
    refetchInterval: 30 * 1000, // Refresh every 30 seconds
  });
};

/**
 * Hook to get eligible users for assignment
 */
export const useEligibleUsers = () => {
  return useQuery({
    queryKey: ['eligible-users'],
    queryFn: () => autoAssignmentService.getEligibleUsers(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to create assignment rule
 */
export const useCreateAssignmentRule = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rule: Omit<AutoAssignmentRule, 'id' | 'created_at' | 'updated_at' | 'assignment_count' | 'last_assigned_user_id'>) => 
      autoAssignmentService.createAssignmentRule(rule),
    onSuccess: (data) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['assignment-rules'] });
      queryClient.invalidateQueries({ queryKey: ['assignment-stats'] });

      if (data) {
        toast({
          title: 'Success',
          description: 'Assignment rule created successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to create assignment rule',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      console.error('Failed to create assignment rule:', error);
      toast({
        title: 'Error',
        description: 'Failed to create assignment rule',
        variant: 'destructive',
      });
    },
  });
};

/**
 * Hook to update assignment rule
 */
export const useUpdateAssignmentRule = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<AutoAssignmentRule> }) =>
      autoAssignmentService.updateAssignmentRule(id, updates),
    onSuccess: (success) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['assignment-rules'] });
      
      if (success) {
        toast({
          title: 'Success',
          description: 'Assignment rule updated successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to update assignment rule',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      console.error('Failed to update assignment rule:', error);
      toast({
        title: 'Error',
        description: 'Failed to update assignment rule',
        variant: 'destructive',
      });
    },
  });
};

/**
 * Hook to delete assignment rule
 */
export const useDeleteAssignmentRule = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => autoAssignmentService.deleteAssignmentRule(id),
    onSuccess: (success) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['assignment-rules'] });
      queryClient.invalidateQueries({ queryKey: ['assignment-stats'] });
      
      if (success) {
        toast({
          title: 'Success',
          description: 'Assignment rule deleted successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to delete assignment rule',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      console.error('Failed to delete assignment rule:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete assignment rule',
        variant: 'destructive',
      });
    },
  });
};

/**
 * Hook to toggle assignment rule
 */
export const useToggleAssignmentRule = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      autoAssignmentService.toggleRule(id, isActive),
    onSuccess: (success, variables) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['assignment-rules'] });
      
      if (success) {
        toast({
          title: 'Success',
          description: `Assignment rule ${variables.isActive ? 'enabled' : 'disabled'}`,
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to toggle assignment rule',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      console.error('Failed to toggle assignment rule:', error);
      toast({
        title: 'Error',
        description: 'Failed to toggle assignment rule',
        variant: 'destructive',
      });
    },
  });
};

/**
 * Hook to manually assign a ticket
 */
export const useManualAssignTicket = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ticketId: string) => autoAssignmentService.assignTicket(ticketId),
    onSuccess: (assignedUserId, ticketId) => {
      // Invalidate ticket queries
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['assignment-stats'] });
      
      if (assignedUserId) {
        toast({
          title: 'Success',
          description: 'Ticket assigned automatically',
        });
      } else {
        toast({
          title: 'Info',
          description: 'No matching assignment rule found',
          variant: 'default',
        });
      }
    },
    onError: (error) => {
      console.error('Failed to assign ticket:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign ticket',
        variant: 'destructive',
      });
    },
  });
};

/**
 * Hook for auto-assignment utilities
 */
export const useAutoAssignmentUtils = () => {
  const getAssignmentMethodIcon = (method: string) => {
    switch (method) {
      case 'round_robin':
        return '🔄';
      case 'least_assigned':
        return '⚖️';
      case 'random':
        return '🎲';
      default:
        return '❓';
    }
  };

  const getAssignmentMethodLabel = (method: string) => {
    return autoAssignmentService.getAssignmentMethodLabel(method);
  };

  const testRule = (rule: AutoAssignmentRule, ticket: { priority: string; category: string }) => {
    return autoAssignmentService.testAssignmentRule(rule, ticket);
  };

  const formatCriteria = (criteria: Record<string, string[]>) => {
    const parts = [];
    
    if (criteria.priority && criteria.priority.length > 0) {
      parts.push(`Priority: ${criteria.priority.join(', ')}`);
    }
    
    if (criteria.category && criteria.category.length > 0) {
      parts.push(`Category: ${criteria.category.join(', ')}`);
    }
    
    return parts.length > 0 ? parts.join(' • ') : 'All tickets';
  };

  return {
    getAssignmentMethodIcon,
    getAssignmentMethodLabel,
    testRule,
    formatCriteria,
  };
};