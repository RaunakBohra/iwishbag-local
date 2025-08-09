// Secure user-only ticket hooks with limited data access
// This is a security-hardened version that prevents exposure of admin-level data

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { userSupportService } from '@/services/UserSupportService';
import type { CreateCustomerTicketData } from '@/types/ticket';
import type { SecureUserTicket } from '@/types/userSupport';

// Secure query keys for user tickets
const userTicketKeys = {
  all: ['user-tickets-secure'] as const,
  userTickets: (userId: string) => [...userTicketKeys.all, 'user', userId] as const,
};

/**
 * Secure hook to fetch user's own tickets with limited data exposure
 * This hook ensures users can only see their own tickets with minimal information
 */
export const useUserTicketsSecure = (userId?: string) => {
  return useQuery({
    queryKey: userTicketKeys.userTickets(userId || ''),
    queryFn: () => userSupportService.getUserTicketsSecure(userId),
    enabled: !!userId,
    staleTime: 3 * 60 * 1000, // 3 minutes - shorter for user data
    select: (data): SecureUserTicket[] => {
      // Additional client-side data filtering for extra security
      return (data || []).map(ticket => ({
        id: ticket.id,
        subject: ticket.subject,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        category: ticket.category,
        created_at: ticket.created_at,
        updated_at: ticket.updated_at,
        // Explicitly exclude any admin fields that might leak through
      }));
    },
  });
};

/**
 * Secure hook to create customer tickets with user-friendly interface
 */
export const useCreateCustomerTicketSecure = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (ticketData: CreateCustomerTicketData) =>
      userSupportService.createCustomerTicketSecure(ticketData),
    onSuccess: (data, variables) => {
      if (data) {
        // Only invalidate user-specific queries
        queryClient.invalidateQueries({ queryKey: userTicketKeys.all });

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

      // User-friendly error messages only
      let errorMessage = 'Something went wrong. Please try again.';
      if (error?.message?.includes('row-level security')) {
        errorMessage = 'Please sign in to create a support request.';
      } else if (error?.message?.includes('unauthorized')) {
        errorMessage = 'You are not authorized to perform this action.';
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
 * Secure hook for user ticket replies - read only for users
 */
export const useUserTicketRepliesSecure = (ticketId?: string, userId?: string) => {
  return useQuery({
    queryKey: [...userTicketKeys.all, 'replies', ticketId, userId],
    queryFn: () => userSupportService.getTicketRepliesSecure(ticketId!, userId!),
    enabled: !!ticketId && !!userId,
    staleTime: 1 * 60 * 1000, // 1 minute for replies
  });
};

/**
 * Secure hook to add user replies to their own tickets
 */
export const useAddUserReplySecure = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ ticketId, message, userId }: { ticketId: string; message: string; userId: string }) =>
      userSupportService.addUserReplySecure(ticketId, message, userId),
    onSuccess: (data, variables) => {
      if (data) {
        // Invalidate user-specific ticket replies
        queryClient.invalidateQueries({ 
          queryKey: [...userTicketKeys.all, 'replies', variables.ticketId, variables.userId] 
        });
        queryClient.invalidateQueries({ queryKey: userTicketKeys.userTickets(variables.userId) });

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
      console.error('Error adding user reply:', error);
      toast({
        title: 'Error',
        description: 'Failed to add reply. Please try again.',
        variant: 'destructive',
      });
    },
  });
};