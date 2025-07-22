/**
 * SLA (Service Level Agreement) Time Tracking Service
 * Handles SLA calculations, deadline management, and breach detection
 */

import { supabase } from '@/integrations/supabase/client';
import { businessHoursService } from '@/config/businessHours';

export interface SLAPolicy {
  id: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  response_time_hours: number;
  resolution_time_hours: number;
  business_hours_only: boolean;
  created_at: string;
  updated_at: string;
}

export interface SLAStatus {
  response_sla: {
    deadline: Date | null;
    is_met: boolean;
    is_breached: boolean;
    time_remaining: number; // in milliseconds
    percentage_used: number; // 0-100
    status: 'safe' | 'warning' | 'critical' | 'breached' | 'met';
  };
  resolution_sla: {
    deadline: Date | null;
    is_met: boolean;
    is_breached: boolean;
    time_remaining: number; // in milliseconds
    percentage_used: number; // 0-100
    status: 'safe' | 'warning' | 'critical' | 'breached' | 'met';
  };
}

export interface TicketWithSLA {
  id: string;
  subject: string;
  priority: string;
  status: string;
  created_at: string;
  response_sla_deadline?: string | null;
  resolution_sla_deadline?: string | null;
  first_response_at?: string | null;
  resolved_at?: string | null;
  sla_breach_flags?: {
    response_breach?: boolean;
    resolution_breach?: boolean;
  };
}

export class SLAService {
  private static instance: SLAService;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): SLAService {
    if (!SLAService.instance) {
      SLAService.instance = new SLAService();
    }
    return SLAService.instance;
  }

  /**
   * Get all SLA policies
   */
  async getSLAPolicies(): Promise<SLAPolicy[]> {
    try {
      const { data, error } = await supabase
        .from('sla_policies')
        .select('*')
        .order('response_time_hours', { ascending: true });

      if (error) {
        console.error('❌ Error fetching SLA policies:', error);
        return this.getDefaultSLAPolicies();
      }

      return data || this.getDefaultSLAPolicies();
    } catch (error) {
      console.error('❌ Exception fetching SLA policies:', error);
      return this.getDefaultSLAPolicies();
    }
  }

  /**
   * Get SLA policy for a specific priority
   */
  async getSLAPolicy(priority: string): Promise<SLAPolicy | null> {
    try {
      const policies = await this.getSLAPolicies();
      return policies.find(p => p.priority === priority) || null;
    } catch (error) {
      console.error('❌ Error getting SLA policy for priority:', priority, error);
      return null;
    }
  }

  /**
   * Calculate SLA status for a ticket
   */
  calculateSLAStatus(ticket: TicketWithSLA): SLAStatus {
    const now = new Date();
    const createdAt = new Date(ticket.created_at);

    // Response SLA Status
    const responseSLA = this.calculateSLAComponent({
      deadline: ticket.response_sla_deadline ? new Date(ticket.response_sla_deadline) : null,
      completedAt: ticket.first_response_at ? new Date(ticket.first_response_at) : null,
      isBreach: ticket.sla_breach_flags?.response_breach || false,
      startTime: createdAt,
      now,
    });

    // Resolution SLA Status
    const resolutionSLA = this.calculateSLAComponent({
      deadline: ticket.resolution_sla_deadline ? new Date(ticket.resolution_sla_deadline) : null,
      completedAt: ticket.resolved_at ? new Date(ticket.resolved_at) : null,
      isBreach: ticket.sla_breach_flags?.resolution_breach || false,
      startTime: createdAt,
      now,
    });

    return {
      response_sla: responseSLA,
      resolution_sla: resolutionSLA,
    };
  }

  /**
   * Calculate SLA component (response or resolution)
   */
  private calculateSLAComponent({
    deadline,
    completedAt,
    isBreach,
    startTime,
    now,
  }: {
    deadline: Date | null;
    completedAt: Date | null;
    isBreach: boolean;
    startTime: Date;
    now: Date;
  }) {
    // If no deadline, return neutral status
    if (!deadline) {
      return {
        deadline: null,
        is_met: false,
        is_breached: false,
        time_remaining: 0,
        percentage_used: 0,
        status: 'safe' as const,
      };
    }

    // If already completed, check if it was on time
    if (completedAt) {
      const isMet = completedAt <= deadline;
      return {
        deadline,
        is_met: isMet,
        is_breached: !isMet,
        time_remaining: 0,
        percentage_used: 100,
        status: isMet ? 'met' as const : 'breached' as const,
      };
    }

    // Calculate current status
    const totalTime = deadline.getTime() - startTime.getTime();
    const elapsedTime = now.getTime() - startTime.getTime();
    const timeRemaining = deadline.getTime() - now.getTime();
    const percentageUsed = Math.min(100, Math.max(0, (elapsedTime / totalTime) * 100));

    let status: 'safe' | 'warning' | 'critical' | 'breached';
    
    if (isBreach || timeRemaining <= 0) {
      status = 'breached';
    } else if (percentageUsed >= 90) {
      status = 'critical';
    } else if (percentageUsed >= 75) {
      status = 'warning';
    } else {
      status = 'safe';
    }

    return {
      deadline,
      is_met: false,
      is_breached: isBreach || timeRemaining <= 0,
      time_remaining: Math.max(0, timeRemaining),
      percentage_used: Math.min(100, percentageUsed),
      status,
    };
  }

  /**
   * Get SLA status color for UI display
   */
  getSLAStatusColor(status: string): string {
    switch (status) {
      case 'safe':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'breached':
        return 'text-red-800 bg-red-100 border-red-300';
      case 'met':
        return 'text-green-700 bg-green-100 border-green-300';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  }

  /**
   * Format time remaining for display
   */
  formatTimeRemaining(timeRemaining: number): string {
    if (timeRemaining <= 0) {
      return 'Overdue';
    }

    const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
    const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  /**
   * Get SLA summary statistics
   */
  async getSLASummary(): Promise<{
    total_tickets: number;
    response_sla_met: number;
    response_sla_breached: number;
    resolution_sla_met: number;
    resolution_sla_breached: number;
    avg_response_time_hours: number;
    avg_resolution_time_hours: number;
  }> {
    try {
      const { data, error } = await supabase.rpc('get_sla_summary');
      
      if (error) {
        console.error('❌ Error getting SLA summary:', error);
        return this.getDefaultSLASummary();
      }

      return data || this.getDefaultSLASummary();
    } catch (error) {
      console.error('❌ Exception getting SLA summary:', error);
      return this.getDefaultSLASummary();
    }
  }

  /**
   * Update SLA breach flags (should be run periodically)
   */
  async updateSLABreachFlags(): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('update_sla_breach_flags');
      
      if (error) {
        console.error('❌ Error updating SLA breach flags:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('❌ Exception updating SLA breach flags:', error);
      return 0;
    }
  }

  /**
   * Get tickets with SLA breaches
   */
  async getBreachedTickets(): Promise<TicketWithSLA[]> {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          id,
          subject,
          priority,
          status,
          created_at,
          response_sla_deadline,
          resolution_sla_deadline,
          first_response_at,
          resolved_at,
          sla_breach_flags
        `)
        .or('sla_breach_flags->>response_breach.eq.true,sla_breach_flags->>resolution_breach.eq.true')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching breached tickets:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Exception fetching breached tickets:', error);
      return [];
    }
  }

  /**
   * Get default SLA policies (fallback)
   */
  private getDefaultSLAPolicies(): SLAPolicy[] {
    return [
      {
        id: 'urgent-default',
        priority: 'urgent',
        response_time_hours: 1,
        resolution_time_hours: 4,
        business_hours_only: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'high-default',
        priority: 'high',
        response_time_hours: 4,
        resolution_time_hours: 24,
        business_hours_only: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'medium-default',
        priority: 'medium',
        response_time_hours: 8,
        resolution_time_hours: 48,
        business_hours_only: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'low-default',
        priority: 'low',
        response_time_hours: 24,
        resolution_time_hours: 72,
        business_hours_only: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
  }

  /**
   * Get default SLA summary (fallback)
   */
  private getDefaultSLASummary() {
    return {
      total_tickets: 0,
      response_sla_met: 0,
      response_sla_breached: 0,
      resolution_sla_met: 0,
      resolution_sla_breached: 0,
      avg_response_time_hours: 0,
      avg_resolution_time_hours: 0,
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const slaService = SLAService.getInstance();