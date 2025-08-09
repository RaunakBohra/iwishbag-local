// React Query hooks for ticket operations

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { ticketService } from '@/services/TicketService';
import type {
  SupportTicket,
  TicketWithDetails,
  TicketReplyWithUser,
  CreateTicketData,
  CreateCustomerTicketData,
  UpdateTicketData,
  CreateReplyData,
  TicketFilters,
  TicketSortOptions,
  TicketStatus,
  CreateSurveyData,
  CustomerSatisfactionSurvey,
} from '@/types/ticket';

// Query keys for consistent caching
export const ticketKeys = {
  all: ['tickets'] as const,
  lists: () => [...ticketKeys.all, 'list'] as const,
  list: (filters?: TicketFilters) => [...ticketKeys.lists(), { filters }] as const,
  details: () => [...ticketKeys.all, 'detail'] as const,
  detail: (id: string) => [...ticketKeys.details(), id] as const,
  replies: (ticketId: string) => [...ticketKeys.all, 'replies', ticketId] as const,
  stats: () => [...ticketKeys.all, 'stats'] as const,
  userTickets: (userId: string) => [...ticketKeys.all, 'user', userId] as const,
  survey: (ticketId: string) => [...ticketKeys.all, 'survey', ticketId] as const,
  surveyStats: () => [...ticketKeys.all, 'survey-stats'] as const,
};

/**
 * Hook to fetch user's tickets
 */
export const useUserTickets = (userId?: string) => {
  return useQuery({
    queryKey: ticketKeys.userTickets(userId || ''),
    queryFn: () => ticketService.getUserTickets(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to fetch admin tickets with filtering (legacy - use useAdminTicketsPaginated for better performance)
 */
export const useAdminTickets = (filters?: TicketFilters, sort?: TicketSortOptions) => {
  return useQuery({
    queryKey: ticketKeys.list({ ...filters, sort }),
    queryFn: () => ticketService.getAdminTickets(filters, sort),
    staleTime: 30 * 1000, // 30 seconds for admin view - faster updates
    refetchInterval: 60 * 1000, // Auto-refetch every minute
    refetchOnWindowFocus: true, // Refresh when window regains focus
  });
};

/**
 * Hook to fetch paginated admin tickets with filtering and sorting
 */
export const useAdminTicketsPaginated = (
  filters?: TicketFilters,
  sort?: TicketSortOptions,
  page: number = 1,
  pageSize: number = 25,
) => {
  return useQuery({
    queryKey: [...ticketKeys.list({ ...filters, sort }), 'paginated', { page, pageSize }],
    queryFn: () => ticketService.getAdminTicketsPaginated(filters, sort, page, pageSize),
    staleTime: 30 * 1000, // 30 seconds for admin view - faster updates
    refetchInterval: 60 * 1000, // Auto-refetch every minute
    refetchOnWindowFocus: true, // Refresh when window regains focus
    keepPreviousData: true, // Keep previous page data while loading new page
  });
};

/**
 * Hook to fetch a specific ticket by ID
 */
export const useTicketDetail = (ticketId: string | undefined) => {
  return useQuery({
    queryKey: ticketKeys.detail(ticketId || ''),
    queryFn: () => ticketService.getTicketById(ticketId!),
    enabled: !!ticketId,
    staleTime: 20 * 1000, // 20 seconds for detail view - very fresh data
    refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds
    refetchOnWindowFocus: true, // Refresh when window regains focus
  });
};

/**
 * Hook to fetch ticket replies
 */
export const useTicketReplies = (ticketId: string | undefined) => {
  return useQuery({
    queryKey: ticketKeys.replies(ticketId || ''),
    queryFn: () => ticketService.getTicketReplies(ticketId!),
    enabled: !!ticketId,
    staleTime: 30 * 1000, // 30 seconds for replies
  });
};

/**
 * Hook to fetch ticket statistics for admin dashboard
 */
export const useTicketStats = () => {
  return useQuery({
    queryKey: ticketKeys.stats(),
    queryFn: () => ticketService.getTicketStats(),
    staleTime: 30 * 1000, // 30 seconds for stats - keep dashboard fresh
    refetchInterval: 45 * 1000, // Auto-refetch every 45 seconds
    refetchOnWindowFocus: true, // Refresh when window regains focus
  });
};

/**
 * Hook to create a new ticket (admin/technical interface)
 */
export const useCreateTicket = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (ticketData: CreateTicketData) => ticketService.createTicket(ticketData),
    onSuccess: (data, variables) => {
      if (data) {
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ticketKeys.all });

        toast({
          title: 'Ticket Created',
          description: 'Your support ticket has been created successfully. We will respond soon.',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to create ticket. Please try again.',
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      console.error('Error creating ticket:', error);
      toast({
        title: 'Error',
        description: 'Failed to create ticket. Please try again.',
        variant: 'destructive',
      });
    },
  });
};

/**
 * Hook to create a customer ticket (customer-friendly interface)
 */
export const useCreateCustomerTicket = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (ticketData: CreateCustomerTicketData) =>
      ticketService.createCustomerTicket(ticketData),
    onSuccess: (data, variables) => {
      if (data) {
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ticketKeys.all });

        toast({
          title: 'Support Request Created',
          description: 'Thank you! We received your request and will get back to you soon.',
        });
      } else {
        toast({
          title: 'Unable to Send Request',
          description: 'Something went wrong. Please try again or contact us directly.',
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      console.error('Error creating customer ticket:', error);

      // Provide user-friendly error messages
      let errorMessage = 'Something went wrong. Please try again.';
      if (error?.message?.includes('row-level security')) {
        errorMessage = 'Please sign in to create a support request.';
      }

      toast({
        title: 'Unable to Send Request',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });
};

/**
 * Hook to update a ticket
 */
export const useUpdateTicket = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ ticketId, updateData }: { ticketId: string; updateData: UpdateTicketData }) =>
      ticketService.updateTicket(ticketId, updateData),
    
    // Optimistic update
    onMutate: async ({ ticketId, updateData }) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ticketKeys.lists() });
      await queryClient.cancelQueries({ queryKey: ticketKeys.detail(ticketId) });

      // Snapshot the previous values - get ALL list queries, not just the generic one
      const previousTickets = queryClient.getQueriesData({ queryKey: ticketKeys.lists() });
      const previousTicket = queryClient.getQueryData(ticketKeys.detail(ticketId));

      // Optimistically update ALL ticket list queries (with any filters)
      queryClient.setQueriesData({ queryKey: ticketKeys.lists() }, (oldData: any) => {
        if (!oldData || !Array.isArray(oldData)) return oldData;
        
        return oldData.map((ticket: any) =>
          ticket.id === ticketId
            ? { 
                ...ticket, 
                ...updateData,
                // Update ticket_data for unified support system compatibility
                ticket_data: ticket.ticket_data ? {
                  ...ticket.ticket_data,
                  ...updateData
                } : updateData
              }
            : ticket
        );
      });

      // Optimistically update specific ticket detail
      if (previousTicket) {
        queryClient.setQueryData(ticketKeys.detail(ticketId), (oldData: any) => ({
          ...oldData,
          ...updateData,
          ticket_data: oldData.ticket_data ? {
            ...oldData.ticket_data,
            ...updateData
          } : updateData
        }));
      }

      return { previousTickets, previousTicket };
    },

    onSuccess: (success, { ticketId }) => {
      if (success) {
        // ✅ Let optimistic update persist - no immediate invalidation to prevent race condition
        // Data will be refreshed on next scheduled refetch (60s) or window focus

        toast({
          title: 'Ticket Updated',
          description: 'Ticket has been updated successfully.',
        });
      } else {
        // Only invalidate on failure to trigger fresh data fetch
        queryClient.invalidateQueries({ queryKey: ticketKeys.detail(ticketId) });
        queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
        queryClient.invalidateQueries({ queryKey: ticketKeys.stats() });
        
        toast({
          title: 'Error',
          description: 'Failed to update ticket. Please try again.',
          variant: 'destructive',
        });
      }
    },

    // Rollback on error
    onError: (error: any, { ticketId }, context) => {
      console.error('Error updating ticket:', error);
      
      // Rollback optimistic updates
      if (context?.previousTickets && Array.isArray(context.previousTickets)) {
        context.previousTickets.forEach(([queryKey, data]: [any, any]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousTicket) {
        queryClient.setQueryData(ticketKeys.detail(ticketId), context.previousTicket);
      }

      toast({
        title: 'Error',
        description: 'Failed to update ticket. Please try again.',
        variant: 'destructive',
      });
    },
  });
};

/**
 * Hook to update ticket status
 */
export const useUpdateTicketStatus = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ ticketId, status }: { ticketId: string; status: TicketStatus }) =>
      ticketService.updateTicketStatus(ticketId, status),
    
    // Optimistic update
    onMutate: async ({ ticketId, status }) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ticketKeys.lists() });
      await queryClient.cancelQueries({ queryKey: ticketKeys.detail(ticketId) });

      // Snapshot the previous values
      const previousTickets = queryClient.getQueryData(ticketKeys.lists());
      const previousTicket = queryClient.getQueryData(ticketKeys.detail(ticketId));

      // Optimistically update all ticket list queries with proper cache key matching
      queryClient.setQueriesData({ queryKey: ticketKeys.lists() }, (oldData: any) => {
        if (!oldData || !Array.isArray(oldData)) return oldData;
        
        return oldData.map((ticket: any) =>
          ticket.id === ticketId
            ? { 
                ...ticket, 
                status,
                // Update ticket_data.status for unified support system compatibility
                ticket_data: ticket.ticket_data ? {
                  ...ticket.ticket_data,
                  status,
                  metadata: {
                    ...ticket.ticket_data.metadata,
                    last_status_change: new Date().toISOString()
                  }
                } : undefined,
                updated_at: new Date().toISOString()
              }
            : ticket
        );
      });

      // Optimistically update individual ticket
      queryClient.setQueryData(ticketKeys.detail(ticketId), (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          status,
          updated_at: new Date().toISOString()
        };
      });

      // Return context with snapshot values
      return { previousTickets, previousTicket };
    },

    onSuccess: (success, { ticketId, status }) => {
      if (success) {
        // ✅ Let optimistic update persist - no immediate invalidation to prevent race condition
        // Data will be refreshed on next scheduled refetch (60s) or window focus
        
        const statusLabels = {
          open: 'Open',
          in_progress: 'In Progress',
          resolved: 'Resolved',
          closed: 'Closed',
        };

        toast({
          title: 'Status Updated',
          description: `Ticket status changed to ${statusLabels[status]}.`,
        });
      } else {
        // Only invalidate on failure to trigger fresh data fetch
        queryClient.invalidateQueries({ queryKey: ticketKeys.detail(ticketId) });
        queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
        
        toast({
          title: 'Error',
          description: 'Failed to update ticket status. Please try again.',
          variant: 'destructive',
        });
      }
    },
    onError: (error: any, variables, context) => {
      // Rollback optimistic update with proper cache key handling
      if (context?.previousTickets) {
        queryClient.setQueriesData({ queryKey: ticketKeys.lists() }, context.previousTickets);
      }
      if (context?.previousTicket) {
        queryClient.setQueryData(ticketKeys.detail(variables.ticketId), context.previousTicket);
      }

      console.error('❌ Error updating ticket status (rolling back):', error);
      toast({
        title: 'Status Update Failed',
        description: 'Failed to update ticket status. Changes have been reverted.',
        variant: 'destructive',
      });
    },
  });
};

/**
 * Hook to assign ticket to admin
 */
export const useAssignTicket = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ ticketId, adminUserId }: { ticketId: string; adminUserId: string | null }) =>
      ticketService.assignTicket(ticketId, adminUserId),
    
    // Optimistic update for assignment
    onMutate: async ({ ticketId, adminUserId }) => {
      // Cancel any outgoing refetches - use broader pattern to catch paginated queries
      await queryClient.cancelQueries({ queryKey: ticketKeys.all });
      await queryClient.cancelQueries({ queryKey: ticketKeys.detail(ticketId) });

      // Get the admin user profile for the dropdown display  
      const adminUsers = (queryClient.getQueryData(['user-roles', 'admin-moderators']) as any[]) || [];
      const assignedUser = adminUsers.find((user: any) => user.id === adminUserId);
      const assignedUserProfile = assignedUser ? {
        id: assignedUser.id,
        full_name: assignedUser.full_name,
        email: assignedUser.email,
      } : null;

      console.log('🎯 Optimistic assignment update:', {
        ticketId,
        adminUserId,
        adminUsersCount: adminUsers.length,
        assignedUser: assignedUser?.full_name || assignedUser?.email || 'Not found',
        assignedUserProfile
      });

      // Snapshot the previous values
      const previousTickets = queryClient.getQueriesData({ queryKey: ticketKeys.all });
      const previousTicket = queryClient.getQueryData(ticketKeys.detail(ticketId));

      // Optimistically update ALL ticket queries (including paginated ones)
      queryClient.setQueriesData({ queryKey: ticketKeys.all }, (oldData: any) => {
        // Handle both direct ticket arrays and paginated response structure
        if (Array.isArray(oldData)) {
          // Direct ticket array (legacy queries)
          return oldData.map((ticket: any) =>
            ticket.id === ticketId
              ? { 
                  ...ticket, 
                  assigned_to: adminUserId,
                  assigned_to_profile: adminUserId ? assignedUserProfile : null,
                  ticket_data: ticket.ticket_data ? {
                    ...ticket.ticket_data,
                    assigned_to: adminUserId,
                    metadata: {
                      ...ticket.ticket_data.metadata,
                      last_assignment_change: new Date().toISOString()
                    }
                  } : undefined,
                  updated_at: new Date().toISOString()
                }
              : ticket
          );
        } else if (oldData && oldData.tickets && Array.isArray(oldData.tickets)) {
          // Paginated response structure
          return {
            ...oldData,
            tickets: oldData.tickets.map((ticket: any) =>
              ticket.id === ticketId
                ? { 
                    ...ticket, 
                    assigned_to: adminUserId,
                    assigned_to_profile: adminUserId ? assignedUserProfile : null,
                    ticket_data: ticket.ticket_data ? {
                      ...ticket.ticket_data,
                      assigned_to: adminUserId,
                      metadata: {
                        ...ticket.ticket_data.metadata,
                        last_assignment_change: new Date().toISOString()
                      }
                    } : undefined,
                    updated_at: new Date().toISOString()
                  }
                : ticket
            )
          };
        }
        return oldData; // Return unchanged if structure doesn't match
      });

      // Optimistically update individual ticket
      queryClient.setQueryData(ticketKeys.detail(ticketId), (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          assigned_to: adminUserId,
          assigned_to_profile: adminUserId ? assignedUserProfile : null,
          updated_at: new Date().toISOString()
        };
      });

      return { previousTickets, previousTicket };
    },

    onSuccess: (success, { ticketId, adminUserId }) => {
      if (success) {
        // ✅ Let optimistic update persist - no immediate invalidation to prevent race condition
        // Data will be refreshed on next scheduled refetch (60s) or window focus

        toast({
          title: 'Ticket Assigned',
          description: adminUserId ? 'Ticket has been assigned.' : 'Ticket assignment removed.',
        });
      } else {
        // Only invalidate on failure to trigger fresh data fetch
        queryClient.invalidateQueries({ queryKey: ticketKeys.detail(ticketId) });
        queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
        
        toast({
          title: 'Error',
          description: 'Failed to assign ticket. Please try again.',
          variant: 'destructive',
        });
      }
    },
    onError: (error: any, variables, context) => {
      // Rollback optimistic update - restore all previous query data
      if (context?.previousTickets && Array.isArray(context.previousTickets)) {
        context.previousTickets.forEach(([queryKey, data]: [any, any]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousTicket) {
        queryClient.setQueryData(ticketKeys.detail(variables.ticketId), context.previousTicket);
      }

      console.error('❌ Error assigning ticket (rolling back):', error);
      toast({
        title: 'Assignment Failed',
        description: 'Failed to assign ticket. Changes have been reverted.',
        variant: 'destructive',
      });
    },
  });
};

/**
 * Hook to create a ticket reply
 */
export const useCreateReply = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (replyData: CreateReplyData) => ticketService.createReply(replyData),
    onSuccess: (data, variables) => {
      if (data) {
        // Invalidate ticket detail and replies
        queryClient.invalidateQueries({ queryKey: ticketKeys.detail(variables.ticket_id) });
        queryClient.invalidateQueries({ queryKey: ticketKeys.replies(variables.ticket_id) });
        queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });

        toast({
          title: 'Reply Added',
          description: 'Your reply has been added to the ticket.',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to add reply. Please try again.',
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      console.error('Error creating reply:', error);
      toast({
        title: 'Error',
        description: 'Failed to add reply. Please try again.',
        variant: 'destructive',
      });
    },
  });
};

// ============================================================================
// Customer Satisfaction Survey Hooks
// ============================================================================

/**
 * Hook to submit customer satisfaction survey
 */
export const useSubmitSatisfactionSurvey = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (surveyData: CreateSurveyData) =>
      ticketService.submitSatisfactionSurvey(surveyData),
    onSuccess: (data, variables) => {
      if (data) {
        // Invalidate survey-related queries
        queryClient.invalidateQueries({ queryKey: ticketKeys.survey(variables.ticket_id) });
        queryClient.invalidateQueries({ queryKey: ticketKeys.detail(variables.ticket_id) });
        queryClient.invalidateQueries({ queryKey: ticketKeys.surveyStats() });

        toast({
          title: 'Thank You!',
          description: 'Your feedback has been submitted successfully.',
        });
      } else {
        toast({
          title: 'Submission Failed',
          description: 'Failed to submit your feedback. Please try again.',
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      console.error('Error submitting satisfaction survey:', error);
      toast({
        title: 'Submission Failed',
        description: 'Failed to submit your feedback. Please try again.',
        variant: 'destructive',
      });
    },
  });
};

/**
 * Hook to check if a ticket has a completed survey
 */
export const useHasCompletedSurvey = (ticketId: string | undefined) => {
  return useQuery({
    queryKey: ticketKeys.survey(ticketId || ''),
    queryFn: () => ticketService.hasCompletedSurvey(ticketId!),
    enabled: !!ticketId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to get satisfaction survey for a ticket
 */
export const useSatisfactionSurvey = (ticketId: string | undefined) => {
  return useQuery({
    queryKey: ticketKeys.survey(ticketId || ''),
    queryFn: () => ticketService.getSatisfactionSurvey(ticketId!),
    enabled: !!ticketId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Hook to get survey statistics (admin only)
 */
export const useSurveyStatistics = (filters?: {
  dateRange?: { start: string; end: string };
  ticketCategory?: string;
}) => {
  return useQuery({
    queryKey: [...ticketKeys.surveyStats(), { filters }],
    queryFn: () => ticketService.getSurveyStatistics(filters),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};
