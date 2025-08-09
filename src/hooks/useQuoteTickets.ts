// React Query hook for quote-specific tickets

import { useQuery } from '@tanstack/react-query';
import { ticketService } from '@/services/TicketService';
import type { TicketWithDetails, TicketFilters } from '@/types/ticket';

/**
 * Hook to fetch support tickets for a specific quote
 */
export const useQuoteTickets = (quoteId?: string) => {
  return useQuery({
    queryKey: ['quote-tickets', quoteId],
    queryFn: async () => {
      if (!quoteId) {
        return [];
      }
      
      // Use optimized query with quote_id filter
      const filters: TicketFilters = {
        quote_id: quoteId
      };
      
      const result = await ticketService.getAdminTickets(filters);
      return result;
    },
    enabled: !!quoteId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    select: (data) => {
      return {
        data: data || [],
        ticketCount: data?.length || 0,
        isEmpty: !data || data.length === 0
      };
    }
  });
};

/**
 * Hook to get support ticket statistics for a quote
 */
export const useQuoteTicketStats = (quoteId?: string) => {
  const { data: tickets = [] } = useQuoteTickets(quoteId);
  
  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    pending: tickets.filter(t => t.status === 'pending').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    closed: tickets.filter(t => t.status === 'closed').length,
    high_priority: tickets.filter(t => t.priority === 'high' || t.priority === 'urgent').length,
    recent: tickets.filter(t => {
      const createdAt = new Date(t.created_at);
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      return createdAt > oneDayAgo;
    }).length
  };
  
  return stats;
};