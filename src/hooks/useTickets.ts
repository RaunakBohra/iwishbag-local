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
 * Hook to fetch admin tickets with filtering
 */
export const useAdminTickets = (filters?: TicketFilters, sort?: TicketSortOptions) => {
  return useQuery({
    queryKey: ticketKeys.list({ ...filters, sort }),
    queryFn: () => ticketService.getAdminTickets(filters, sort),
    staleTime: 2 * 60 * 1000, // 2 minutes for admin view
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
    staleTime: 1 * 60 * 1000, // 1 minute for detail view
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
    staleTime: 5 * 60 * 1000, // 5 minutes
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
    onSuccess: (success, { ticketId }) => {
      if (success) {
        // Invalidate specific ticket and lists
        queryClient.invalidateQueries({ queryKey: ticketKeys.detail(ticketId) });
        queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
        queryClient.invalidateQueries({ queryKey: ticketKeys.stats() });

        toast({
          title: 'Ticket Updated',
          description: 'Ticket has been updated successfully.',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to update ticket. Please try again.',
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      console.error('Error updating ticket:', error);
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
    onSuccess: (success, { ticketId, status }) => {
      if (success) {
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ticketKeys.detail(ticketId) });
        queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
        queryClient.invalidateQueries({ queryKey: ticketKeys.stats() });

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
        toast({
          title: 'Error',
          description: 'Failed to update ticket status. Please try again.',
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      console.error('Error updating ticket status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update ticket status. Please try again.',
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
    onSuccess: (success, { ticketId, adminUserId }) => {
      if (success) {
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ticketKeys.detail(ticketId) });
        queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });

        toast({
          title: 'Ticket Assigned',
          description: adminUserId ? 'Ticket has been assigned.' : 'Ticket assignment removed.',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to assign ticket. Please try again.',
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      console.error('Error assigning ticket:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign ticket. Please try again.',
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
