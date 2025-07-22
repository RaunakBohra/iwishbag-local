// ============================================================================
// UNIFIED SUPPORT HOOK - Complete Support System Management
// Replaces multiple support-related hooks with a single unified interface
// ============================================================================

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { unifiedSupportEngine } from '@/services/UnifiedSupportEngine';
import type {
  SupportRecord,
  SupportInteraction,
  CreateTicketData,
  TicketFilters,
  TicketStatus,
  TicketPriority,
  TicketCategory,
  InteractionType,
} from '@/services/UnifiedSupportEngine';

// ============================================================================
// Hook Interface Types
// ============================================================================

export interface UseUnifiedSupportProps {
  userId?: string;
  isAdmin?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface TicketWithInteractions extends SupportRecord {
  interactions?: SupportInteraction[];
  interactionCount?: number;
  lastInteraction?: SupportInteraction;
}

export interface SupportStats {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
  avg_response_time: number;
  avg_resolution_time: number;
  sla_compliance: number;
}

// ============================================================================
// UNIFIED SUPPORT HOOK
// ============================================================================

export function useUnifiedSupport(props: UseUnifiedSupportProps = {}) {
  const {
    userId,
    isAdmin = false,
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds
  } = props;

  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<TicketFilters>({});
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);

  // ============================================================================
  // Query Keys
  // ============================================================================

  const QUERY_KEYS = {
    tickets: ['support', 'tickets', { filters, userId, isAdmin }],
    ticket: (id: string) => ['support', 'ticket', id],
    interactions: (ticketId: string) => ['support', 'interactions', ticketId],
    stats: ['support', 'stats'],
    preferences: (userId: string) => ['support', 'preferences', userId],
    templates: ['support', 'templates'],
    assignmentRules: ['support', 'assignment-rules'],
  };

  // ============================================================================
  // Queries
  // ============================================================================

  /**
   * Get tickets with filters
   */
  const {
    data: tickets = [],
    isLoading: ticketsLoading,
    error: ticketsError,
    refetch: refetchTickets,
  } = useQuery({
    queryKey: QUERY_KEYS.tickets,
    queryFn: () => unifiedSupportEngine.getTickets(filters, userId),
    refetchInterval: autoRefresh ? refreshInterval : false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  /**
   * Get specific ticket details
   */
  const {
    data: currentTicket,
    isLoading: ticketLoading,
    error: ticketError,
  } = useQuery({
    queryKey: QUERY_KEYS.ticket(selectedTicket || ''),
    queryFn: () => selectedTicket ? unifiedSupportEngine.getTicketById(selectedTicket) : null,
    enabled: !!selectedTicket,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  /**
   * Get ticket interactions
   */
  const {
    data: interactions = [],
    isLoading: interactionsLoading,
  } = useQuery({
    queryKey: QUERY_KEYS.interactions(selectedTicket || ''),
    queryFn: () => selectedTicket ? unifiedSupportEngine.getTicketInteractions(selectedTicket) : [],
    enabled: !!selectedTicket,
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  /**
   * Get support statistics (admin only)
   */
  const {
    data: stats,
    isLoading: statsLoading,
  } = useQuery({
    queryKey: QUERY_KEYS.stats,
    queryFn: () => unifiedSupportEngine.getTicketStats(),
    enabled: isAdmin,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  // ============================================================================
  // Mutations
  // ============================================================================

  /**
   * Create new ticket
   */
  const createTicketMutation = useMutation({
    mutationFn: (ticketData: CreateTicketData) => 
      unifiedSupportEngine.createTicket(ticketData),
    onSuccess: (newTicket) => {
      if (newTicket) {
        queryClient.invalidateQueries({ queryKey: ['support', 'tickets'] });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats });
        setSelectedTicket(newTicket.id);
        toast.success('Support ticket created successfully');
      } else {
        toast.error('Failed to create support ticket');
      }
    },
    onError: (error) => {
      console.error('Error creating ticket:', error);
      toast.error('Failed to create support ticket');
    },
  });

  /**
   * Update ticket status
   */
  const updateStatusMutation = useMutation({
    mutationFn: ({
      ticketId,
      status,
      reason,
    }: {
      ticketId: string;
      status: TicketStatus;
      reason?: string;
    }) => unifiedSupportEngine.updateTicketStatus(ticketId, status, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support', 'tickets'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ticket(selectedTicket || '') });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats });
      toast.success('Ticket status updated successfully');
    },
    onError: (error) => {
      console.error('Error updating ticket status:', error);
      toast.error('Failed to update ticket status');
    },
  });

  /**
   * Add interaction (reply, note, etc.)
   */
  const addInteractionMutation = useMutation({
    mutationFn: ({
      ticketId,
      type,
      content,
      isInternal = false,
    }: {
      ticketId: string;
      type: InteractionType;
      content: any;
      isInternal?: boolean;
    }) => unifiedSupportEngine.addInteraction(ticketId, type, content, isInternal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.interactions(selectedTicket || '') });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ticket(selectedTicket || '') });
      queryClient.invalidateQueries({ queryKey: ['support', 'tickets'] });
      toast.success('Message sent successfully');
    },
    onError: (error) => {
      console.error('Error adding interaction:', error);
      toast.error('Failed to send message');
    },
  });

  /**
   * Assign ticket
   */
  const assignTicketMutation = useMutation({
    mutationFn: ({
      ticketId,
      assigneeId,
      reason,
    }: {
      ticketId: string;
      assigneeId: string;
      reason?: string;
    }) => unifiedSupportEngine.assignTicket(ticketId, assigneeId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support', 'tickets'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ticket(selectedTicket || '') });
      toast.success('Ticket assigned successfully');
    },
    onError: (error) => {
      console.error('Error assigning ticket:', error);
      toast.error('Failed to assign ticket');
    },
  });

  // ============================================================================
  // Helper Functions
  // ============================================================================

  /**
   * Create a new support ticket
   */
  const createTicket = useCallback(
    async (ticketData: CreateTicketData) => {
      return createTicketMutation.mutateAsync(ticketData);
    },
    [createTicketMutation]
  );

  /**
   * Update ticket status
   */
  const updateTicketStatus = useCallback(
    async (ticketId: string, status: TicketStatus, reason?: string) => {
      return updateStatusMutation.mutateAsync({ ticketId, status, reason });
    },
    [updateStatusMutation]
  );

  /**
   * Add a reply to a ticket
   */
  const addReply = useCallback(
    async (ticketId: string, message: string, isInternal: boolean = false) => {
      return addInteractionMutation.mutateAsync({
        ticketId,
        type: 'reply',
        content: { message },
        isInternal,
      });
    },
    [addInteractionMutation]
  );

  /**
   * Add an internal note to a ticket
   */
  const addNote = useCallback(
    async (ticketId: string, note: string, tags: string[] = []) => {
      return addInteractionMutation.mutateAsync({
        ticketId,
        type: 'note',
        content: { note, tags },
        isInternal: true,
      });
    },
    [addInteractionMutation]
  );

  /**
   * Assign ticket to user
   */
  const assignTicket = useCallback(
    async (ticketId: string, assigneeId: string, reason?: string) => {
      return assignTicketMutation.mutateAsync({ ticketId, assigneeId, reason });
    },
    [assignTicketMutation]
  );

  /**
   * Get tickets with interactions count
   */
  const ticketsWithInteractions: TicketWithInteractions[] = tickets.map(ticket => ({
    ...ticket,
    interactionCount: interactions.filter(i => i.support_id === ticket.id).length,
    lastInteraction: interactions
      .filter(i => i.support_id === ticket.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0],
  }));

  /**
   * Filter tickets by status
   */
  const getTicketsByStatus = useCallback((status: TicketStatus) => {
    return tickets.filter(ticket => ticket.ticket_data?.status === status);
  }, [tickets]);

  /**
   * Filter tickets by priority
   */
  const getTicketsByPriority = useCallback((priority: TicketPriority) => {
    return tickets.filter(ticket => ticket.ticket_data?.priority === priority);
  }, [tickets]);

  /**
   * Get urgent tickets
   */
  const urgentTickets = getTicketsByPriority('urgent');

  /**
   * Get unassigned tickets
   */
  const unassignedTickets = tickets.filter(ticket => !ticket.ticket_data?.assigned_to);

  /**
   * Get overdue tickets (simplified logic)
   */
  const overdueTickets = tickets.filter(ticket => {
    if (!ticket.sla_data) return false;
    return ticket.sla_data.response_sla?.is_breached || ticket.sla_data.resolution_sla?.is_breached;
  });

  // ============================================================================
  // Filter Management
  // ============================================================================

  const updateFilters = useCallback((newFilters: Partial<TicketFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  const applyStatusFilter = useCallback((status: TicketStatus[]) => {
    updateFilters({ status });
  }, [updateFilters]);

  const applyPriorityFilter = useCallback((priority: TicketPriority[]) => {
    updateFilters({ priority });
  }, [updateFilters]);

  const applyCategoryFilter = useCallback((category: TicketCategory[]) => {
    updateFilters({ category });
  }, [updateFilters]);

  // ============================================================================
  // Utility Functions
  // ============================================================================

  const selectTicket = useCallback((ticketId: string | null) => {
    setSelectedTicket(ticketId);
  }, []);

  const refreshData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['support'] });
  }, [queryClient]);

  const isLoading = ticketsLoading || ticketLoading || interactionsLoading;
  const isCreating = createTicketMutation.isPending;
  const isUpdating = updateStatusMutation.isPending || addInteractionMutation.isPending;

  // ============================================================================
  // Return Hook Interface
  // ============================================================================

  return {
    // Data
    tickets: ticketsWithInteractions,
    currentTicket,
    interactions,
    stats,
    urgentTickets,
    unassignedTickets,
    overdueTickets,

    // Loading states
    isLoading,
    isCreating,
    isUpdating,
    ticketsLoading,
    ticketLoading,
    interactionsLoading,
    statsLoading,

    // Errors
    ticketsError,
    ticketError,

    // Actions
    createTicket,
    updateTicketStatus,
    addReply,
    addNote,
    assignTicket,
    selectTicket,
    refreshData,

    // Filter management
    filters,
    updateFilters,
    clearFilters,
    applyStatusFilter,
    applyPriorityFilter,
    applyCategoryFilter,

    // Utility functions
    getTicketsByStatus,
    getTicketsByPriority,
    refetchTickets,

    // Selected state
    selectedTicketId: selectedTicket,
  };
}

// ============================================================================
// Specialized Hooks
// ============================================================================

/**
 * Hook for customer support (user-specific tickets)
 */
export function useCustomerSupport(userId: string) {
  return useUnifiedSupport({ 
    userId, 
    isAdmin: false,
    autoRefresh: true,
    refreshInterval: 60000, // 1 minute
  });
}

/**
 * Hook for admin support dashboard
 */
export function useAdminSupport() {
  return useUnifiedSupport({ 
    isAdmin: true,
    autoRefresh: true,
    refreshInterval: 30000, // 30 seconds
  });
}

/**
 * Hook for support statistics only
 */
export function useSupportStats() {
  const { stats, statsLoading, refreshData } = useUnifiedSupport({ 
    isAdmin: true,
    autoRefresh: true,
  });
  
  return {
    stats,
    isLoading: statsLoading,
    refresh: refreshData,
  };
}

/**
 * Hook for a specific ticket
 */
export function useTicketDetails(ticketId: string) {
  const support = useUnifiedSupport({ autoRefresh: false });
  
  useEffect(() => {
    support.selectTicket(ticketId);
  }, [ticketId, support]);

  return {
    ticket: support.currentTicket,
    interactions: support.interactions,
    isLoading: support.ticketLoading || support.interactionsLoading,
    addReply: support.addReply,
    addNote: support.addNote,
    updateStatus: support.updateTicketStatus,
    assignTicket: support.assignTicket,
  };
}