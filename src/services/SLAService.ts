/**
 * SLA (Service Level Agreement) Time Tracking Service
 * Handles SLA calculations, deadline management, breach detection, and customer satisfaction
 */

import { supabase } from '@/integrations/supabase/client';

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

export interface CustomerSatisfactionSurvey {
  id: string;
  ticketId: string;
  rating: number; // 1-5 (overall rating)
  responseTimeRating: number; // 1-5
  experienceRating: number; // 1-5
  resolutionRating: number; // 1-5
  wouldRecommend: boolean;
  feedback?: string;
  additionalComments?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSatisfactionSurveyData {
  ticketId: string;
  rating: number; // overall rating
  responseTimeRating: number;
  experienceRating: number;
  resolutionRating: number;
  wouldRecommend: boolean;
  feedback?: string;
  additionalComments?: string;
}

export interface SLADashboardMetrics {
  totalTickets: number;
  ticketsOnTrack: number;
  ticketsApproachingDeadline: number;
  ticketsOverdue: number;
  avgFirstResponseMinutes: number | null;
  avgResolutionMinutes: number | null;
  responseSLAComplianceRate: number;
  resolutionSLAComplianceRate: number;
  customerSatisfactionAvg: number | null;
  customerSatisfactionCount: number;
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
      return policies.find((p) => p.priority === priority) || null;
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
        status: isMet ? ('met' as const) : ('breached' as const),
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
   * Get comprehensive SLA dashboard metrics (NEW)
   */
  async getDashboardMetrics(): Promise<SLADashboardMetrics | null> {
    try {
      const { data, error } = await supabase.rpc('get_sla_dashboard_metrics');

      if (error) {
        console.error('❌ Error getting SLA dashboard metrics:', error);
        return this.getDefaultDashboardMetrics();
      }

      if (!data || data.length === 0) {
        return this.getDefaultDashboardMetrics();
      }

      const result = data[0];
      return {
        totalTickets: result.total_tickets || 0,
        ticketsOnTrack: result.tickets_on_track || 0,
        ticketsApproachingDeadline: result.tickets_approaching_deadline || 0,
        ticketsOverdue: result.tickets_overdue || 0,
        avgFirstResponseMinutes: result.avg_first_response_minutes ? parseFloat(result.avg_first_response_minutes) : null,
        avgResolutionMinutes: result.avg_resolution_minutes ? parseFloat(result.avg_resolution_minutes) : null,
        responseSLAComplianceRate: result.response_sla_compliance_rate ? parseFloat(result.response_sla_compliance_rate) : 0,
        resolutionSLAComplianceRate: result.resolution_sla_compliance_rate ? parseFloat(result.resolution_sla_compliance_rate) : 0,
        customerSatisfactionAvg: result.customer_satisfaction_avg ? parseFloat(result.customer_satisfaction_avg) : null,
        customerSatisfactionCount: result.customer_satisfaction_count || 0,
      };
    } catch (error) {
      console.error('❌ Error in getDashboardMetrics:', error);
      return this.getDefaultDashboardMetrics();
    }
  }

  /**
   * Get SLA summary statistics (LEGACY - kept for compatibility)
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
        .select(
          `
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
        `,
        )
        .or(
          'sla_breach_flags->>response_breach.eq.true,sla_breach_flags->>resolution_breach.eq.true',
        )
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
   * Create a customer satisfaction survey
   */
  async createSatisfactionSurvey(surveyData: CreateSatisfactionSurveyData): Promise<CustomerSatisfactionSurvey | null> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        console.error('❌ No authenticated user for satisfaction survey');
        return null;
      }

      const { data, error } = await supabase
        .from('customer_satisfaction_surveys')
        .insert({
          ticket_id: surveyData.ticketId,
          rating: surveyData.rating,
          response_time_rating: surveyData.responseTimeRating,
          experience_rating: surveyData.experienceRating,
          resolution_rating: surveyData.resolutionRating,
          would_recommend: surveyData.wouldRecommend,
          feedback: surveyData.feedback,
          additional_comments: surveyData.additionalComments,
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating satisfaction survey:', error);
        return null;
      }

      return {
        id: data.id,
        ticketId: data.ticket_id,
        rating: data.rating,
        responseTimeRating: data.response_time_rating,
        experienceRating: data.experience_rating,
        resolutionRating: data.resolution_rating,
        wouldRecommend: data.would_recommend,
        feedback: data.feedback,
        additionalComments: data.additional_comments,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      console.error('❌ Error in createSatisfactionSurvey:', error);
      return null;
    }
  }

  /**
   * Get satisfaction surveys for a ticket (admin view)
   */
  async getTicketSatisfactionSurveys(ticketId: string): Promise<CustomerSatisfactionSurvey[]> {
    try {
      const { data, error } = await supabase
        .from('customer_satisfaction_surveys')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error getting satisfaction surveys:', error);
        return [];
      }

      return data.map((survey: any) => ({
        id: survey.id,
        ticketId: survey.ticket_id,
        rating: survey.rating,
        responseTimeRating: survey.response_time_rating,
        experienceRating: survey.experience_rating,
        resolutionRating: survey.resolution_rating,
        wouldRecommend: survey.would_recommend,
        feedback: survey.feedback,
        additionalComments: survey.additional_comments,
        createdAt: survey.created_at,
        updatedAt: survey.updated_at,
      }));
    } catch (error) {
      console.error('❌ Error in getTicketSatisfactionSurveys:', error);
      return [];
    }
  }

  /**
   * Mark a ticket as read by admin
   */
  async markTicketAsRead(ticketId: string): Promise<boolean> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        console.error('❌ No authenticated user to mark ticket as read');
        return false;
      }

      const { data, error } = await supabase.rpc('mark_ticket_as_read', {
        p_ticket_id: ticketId,
        p_admin_user_id: user.user.id
      });

      if (error) {
        console.error('❌ Error marking ticket as read:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('❌ Error in markTicketAsRead:', error);
      return false;
    }
  }

  /**
   * Utility functions for formatting time
   */
  formatResponseTime(minutes: number | null): string {
    if (minutes === null) return 'N/A';
    
    if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = Math.round(minutes % 60);
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    } else {
      const days = Math.floor(minutes / 1440);
      const remainingHours = Math.floor((minutes % 1440) / 60);
      return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
    }
  }

  /**
   * Get satisfaction rating color for UI
   */
  getSatisfactionRatingColor(rating: number): string {
    if (rating >= 4) return 'text-green-600';
    if (rating >= 3) return 'text-yellow-600';
    if (rating >= 2) return 'text-orange-600';
    return 'text-red-600';
  }

  /**
   * Format satisfaction rating as stars
   */
  formatRatingStars(rating: number): string {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  }

  /**
   * Get default dashboard metrics (fallback)
   */
  private getDefaultDashboardMetrics(): SLADashboardMetrics {
    return {
      totalTickets: 0,
      ticketsOnTrack: 0,
      ticketsApproachingDeadline: 0,
      ticketsOverdue: 0,
      avgFirstResponseMinutes: null,
      avgResolutionMinutes: null,
      responseSLAComplianceRate: 0,
      resolutionSLAComplianceRate: 0,
      customerSatisfactionAvg: null,
      customerSatisfactionCount: 0,
    };
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
