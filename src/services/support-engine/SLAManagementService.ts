/**
 * SLA Management Service
 * Handles response time tracking, breach monitoring, and SLA compliance
 * Decomposed from UnifiedSupportEngine for better separation of concerns
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import * as Sentry from '@sentry/react';
import type { TicketStatus, TicketPriority, SupportRecord } from './SupportTicketService';

export interface SLAData {
  response_sla: {
    target_minutes: number;
    first_response_at?: string;
    is_breached: boolean;
    breach_duration?: number;
  };
  resolution_sla: {
    target_hours: number;
    resolved_at?: string;
    is_breached: boolean;
    breach_duration?: number;
  };
  escalation?: {
    escalated_at?: string;
    escalated_to?: string;
    reason?: string;
  };
}

export interface SLATarget {
  priority: TicketPriority;
  response_time_minutes: number;
  resolution_time_hours: number;
  escalation_threshold_hours: number;
}

export interface SLAMetrics {
  total_tickets: number;
  response_sla: {
    met: number;
    breached: number;
    average_response_time: number;
    compliance_rate: number;
  };
  resolution_sla: {
    met: number;
    breached: number;
    average_resolution_time: number;
    compliance_rate: number;
  };
  escalations: {
    total: number;
    automatic: number;
    manual: number;
  };
}

export interface SLABreach {
  ticket_id: string;
  breach_type: 'response' | 'resolution';
  target_time: number;
  actual_time: number;
  breach_duration: number;
  priority: TicketPriority;
  created_at: string;
}

export class SLAManagementService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 2 * 60 * 1000; // 2 minutes for SLA data

  // Default SLA targets by priority
  private readonly DEFAULT_SLA_TARGETS: Record<TicketPriority, SLATarget> = {
    urgent: {
      priority: 'urgent',
      response_time_minutes: 15,
      resolution_time_hours: 4,
      escalation_threshold_hours: 2,
    },
    high: {
      priority: 'high',
      response_time_minutes: 60,
      resolution_time_hours: 24,
      escalation_threshold_hours: 8,
    },
    medium: {
      priority: 'medium',
      response_time_minutes: 240, // 4 hours
      resolution_time_hours: 72,  // 3 days
      escalation_threshold_hours: 48, // 2 days
    },
    low: {
      priority: 'low',
      response_time_minutes: 480, // 8 hours
      resolution_time_hours: 168, // 7 days
      escalation_threshold_hours: 120, // 5 days
    },
  };

  constructor() {
    logger.info('SLAManagementService initialized');
  }

  /**
   * Initialize SLA tracking for a new ticket
   */
  async initializeSLATracking(ticketId: string, priority: TicketPriority): Promise<boolean> {
    try {
      const targets = this.DEFAULT_SLA_TARGETS[priority];
      const slaData: SLAData = {
        response_sla: {
          target_minutes: targets.response_time_minutes,
          is_breached: false,
        },
        resolution_sla: {
          target_hours: targets.resolution_time_hours,
          is_breached: false,
        },
      };

      const { error } = await supabase
        .from('support_system')
        .update({
          sla_data: slaData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId);

      if (error) {
        logger.error('Failed to initialize SLA tracking:', error);
        return false;
      }

      logger.info('SLA tracking initialized:', { ticketId, priority, targets });
      return true;

    } catch (error) {
      logger.error('SLA initialization error:', error);
      Sentry.captureException(error);
      return false;
    }
  }

  /**
   * Update SLA tracking when ticket status changes
   */
  async updateSLATracking(ticketId: string, status: TicketStatus): Promise<void> {
    try {
      const ticket = await this.getTicketById(ticketId);
      if (!ticket) {
        logger.warn('Ticket not found for SLA update:', ticketId);
        return;
      }

      const slaData = ticket.sla_data as SLAData || {};
      const createdAt = new Date(ticket.created_at);
      const now = new Date();

      let updated = false;

      // Handle first response tracking
      if (status === 'in_progress' && !slaData.response_sla?.first_response_at) {
        await this.handleFirstResponse(ticketId, slaData, createdAt, now);
        updated = true;
      }

      // Handle resolution tracking
      if (status === 'resolved' && !slaData.resolution_sla?.resolved_at) {
        await this.handleResolution(ticketId, slaData, createdAt, now);
        updated = true;
      }

      // Check for escalation needs
      if (status !== 'resolved' && status !== 'closed') {
        const needsEscalation = await this.checkEscalationNeeds(ticket, slaData, createdAt, now);
        if (needsEscalation) {
          await this.handleEscalation(ticketId, slaData, ticket.ticket_data?.priority as TicketPriority);
          updated = true;
        }
      }

      if (updated) {
        this.clearCache('sla');
      }

    } catch (error) {
      logger.error('SLA update error:', error);
      Sentry.captureException(error);
    }
  }

  /**
   * Handle first response SLA tracking
   */
  private async handleFirstResponse(
    ticketId: string,
    slaData: SLAData,
    createdAt: Date,
    responseTime: Date
  ): Promise<void> {
    try {
      const responseMinutes = Math.floor((responseTime.getTime() - createdAt.getTime()) / (1000 * 60));
      const targetMinutes = slaData.response_sla?.target_minutes || 240;
      const isBreached = responseMinutes > targetMinutes;

      const updatedSLA: SLAData = {
        ...slaData,
        response_sla: {
          ...slaData.response_sla,
          first_response_at: responseTime.toISOString(),
          is_breached: isBreached,
          breach_duration: isBreached ? responseMinutes - targetMinutes : 0,
        },
      };

      await this.updateTicketSLA(ticketId, updatedSLA);

      if (isBreached) {
        await this.logSLABreach(ticketId, 'response', targetMinutes, responseMinutes);
        logger.warn('Response SLA breached:', {
          ticketId,
          targetMinutes,
          actualMinutes: responseMinutes,
          breachDuration: responseMinutes - targetMinutes,
        });
      }

      logger.info('First response SLA updated:', { ticketId, responseMinutes, isBreached });

    } catch (error) {
      logger.error('First response SLA error:', error);
    }
  }

  /**
   * Handle resolution SLA tracking
   */
  private async handleResolution(
    ticketId: string,
    slaData: SLAData,
    createdAt: Date,
    resolutionTime: Date
  ): Promise<void> {
    try {
      const resolutionHours = Math.floor((resolutionTime.getTime() - createdAt.getTime()) / (1000 * 60 * 60));
      const targetHours = slaData.resolution_sla?.target_hours || 72;
      const isBreached = resolutionHours > targetHours;

      const updatedSLA: SLAData = {
        ...slaData,
        resolution_sla: {
          ...slaData.resolution_sla,
          resolved_at: resolutionTime.toISOString(),
          is_breached: isBreached,
          breach_duration: isBreached ? resolutionHours - targetHours : 0,
        },
      };

      await this.updateTicketSLA(ticketId, updatedSLA);

      if (isBreached) {
        await this.logSLABreach(ticketId, 'resolution', targetHours, resolutionHours);
        logger.warn('Resolution SLA breached:', {
          ticketId,
          targetHours,
          actualHours: resolutionHours,
          breachDuration: resolutionHours - targetHours,
        });
      }

      // Update ticket metadata with resolution time
      const { error } = await supabase
        .from('support_system')
        .update({
          ticket_data: {
            ...slaData,
            metadata: {
              ...((slaData as any).ticket_data?.metadata || {}),
              resolution_time: resolutionHours,
            }
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId);

      if (error) {
        logger.error('Failed to update resolution metadata:', error);
      }

      logger.info('Resolution SLA updated:', { ticketId, resolutionHours, isBreached });

    } catch (error) {
      logger.error('Resolution SLA error:', error);
    }
  }

  /**
   * Check if ticket needs escalation
   */
  private async checkEscalationNeeds(
    ticket: SupportRecord,
    slaData: SLAData,
    createdAt: Date,
    now: Date
  ): Promise<boolean> {
    try {
      // Don't escalate if already escalated
      if (slaData.escalation?.escalated_at) {
        return false;
      }

      const priority = ticket.ticket_data?.priority as TicketPriority || 'medium';
      const targets = this.DEFAULT_SLA_TARGETS[priority];
      const hoursOpen = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60));

      // Check if ticket has been open longer than escalation threshold
      return hoursOpen >= targets.escalation_threshold_hours;

    } catch (error) {
      logger.error('Escalation check error:', error);
      return false;
    }
  }

  /**
   * Handle ticket escalation
   */
  private async handleEscalation(
    ticketId: string,
    slaData: SLAData,
    priority: TicketPriority
  ): Promise<void> {
    try {
      const escalationTime = new Date();
      const targets = this.DEFAULT_SLA_TARGETS[priority];

      const updatedSLA: SLAData = {
        ...slaData,
        escalation: {
          escalated_at: escalationTime.toISOString(),
          reason: `Automatic escalation after ${targets.escalation_threshold_hours} hours`,
        },
      };

      await this.updateTicketSLA(ticketId, updatedSLA);

      logger.info('Ticket escalated:', { ticketId, priority, reason: 'automatic' });

      // TODO: Implement escalation notification logic
      // This would notify managers or senior support staff

    } catch (error) {
      logger.error('Escalation handling error:', error);
    }
  }

  /**
   * Log SLA breach
   */
  private async logSLABreach(
    ticketId: string,
    breachType: 'response' | 'resolution',
    targetTime: number,
    actualTime: number
  ): Promise<void> {
    try {
      const breachData: SLABreach = {
        ticket_id: ticketId,
        breach_type: breachType,
        target_time: targetTime,
        actual_time: actualTime,
        breach_duration: actualTime - targetTime,
        priority: 'medium', // Would need to get from ticket
        created_at: new Date().toISOString(),
      };

      // Log to external system or database
      logger.error('SLA Breach:', breachData);
      Sentry.captureMessage('SLA Breach Detected', {
        level: 'warning',
        extra: breachData,
      });

      // Store in support analytics for reporting
      await this.storeSLABreach(breachData);

    } catch (error) {
      logger.error('SLA breach logging error:', error);
    }
  }

  /**
   * Store SLA breach for analytics
   */
  private async storeSLABreach(breachData: SLABreach): Promise<void> {
    try {
      // This would store in a dedicated SLA breaches table
      // For now, we'll use the support_analytics table
      await supabase.from('support_analytics').insert({
        ticket_id: breachData.ticket_id,
        metric_type: 'sla_breach',
        metric_data: breachData,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to store SLA breach:', error);
    }
  }

  /**
   * Get SLA metrics for reporting
   */
  async getSLAMetrics(
    dateRange: { start: string; end: string },
    priority?: TicketPriority
  ): Promise<SLAMetrics> {
    try {
      const cacheKey = this.getCacheKey('metrics', { dateRange, priority });
      const cached = this.getFromCache<SLAMetrics>(cacheKey);
      if (cached) return cached;

      let query = supabase
        .from('support_system')
        .select('*')
        .eq('system_type', 'ticket')
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end);

      if (priority) {
        query = query.eq('ticket_data->priority', priority);
      }

      const { data, error } = await query;
      if (error) throw error;

      const metrics = this.calculateSLAMetrics(data || []);
      this.setCache(cacheKey, metrics);

      return metrics;

    } catch (error) {
      logger.error('Failed to get SLA metrics:', error);
      return this.getEmptySLAMetrics();
    }
  }

  /**
   * Calculate SLA metrics from ticket data
   */
  private calculateSLAMetrics(tickets: SupportRecord[]): SLAMetrics {
    const metrics: SLAMetrics = {
      total_tickets: tickets.length,
      response_sla: {
        met: 0,
        breached: 0,
        average_response_time: 0,
        compliance_rate: 0,
      },
      resolution_sla: {
        met: 0,
        breached: 0,
        average_resolution_time: 0,
        compliance_rate: 0,
      },
      escalations: {
        total: 0,
        automatic: 0,
        manual: 0,
      },
    };

    if (tickets.length === 0) return metrics;

    let totalResponseTime = 0;
    let totalResolutionTime = 0;
    let responseCount = 0;
    let resolutionCount = 0;

    tickets.forEach((ticket) => {
      const slaData = ticket.sla_data as SLAData;
      
      if (!slaData) return;

      // Response SLA metrics
      if (slaData.response_sla?.first_response_at) {
        responseCount++;
        const createdAt = new Date(ticket.created_at);
        const responseAt = new Date(slaData.response_sla.first_response_at);
        const responseTime = Math.floor((responseAt.getTime() - createdAt.getTime()) / (1000 * 60));
        
        totalResponseTime += responseTime;
        
        if (slaData.response_sla.is_breached) {
          metrics.response_sla.breached++;
        } else {
          metrics.response_sla.met++;
        }
      }

      // Resolution SLA metrics
      if (slaData.resolution_sla?.resolved_at) {
        resolutionCount++;
        const createdAt = new Date(ticket.created_at);
        const resolvedAt = new Date(slaData.resolution_sla.resolved_at);
        const resolutionTime = Math.floor((resolvedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60));
        
        totalResolutionTime += resolutionTime;
        
        if (slaData.resolution_sla.is_breached) {
          metrics.resolution_sla.breached++;
        } else {
          metrics.resolution_sla.met++;
        }
      }

      // Escalation metrics
      if (slaData.escalation?.escalated_at) {
        metrics.escalations.total++;
        if (slaData.escalation.reason?.includes('Automatic')) {
          metrics.escalations.automatic++;
        } else {
          metrics.escalations.manual++;
        }
      }
    });

    // Calculate averages and compliance rates
    metrics.response_sla.average_response_time = responseCount > 0 ? Math.round(totalResponseTime / responseCount) : 0;
    metrics.response_sla.compliance_rate = responseCount > 0 ? Math.round((metrics.response_sla.met / responseCount) * 100) : 0;

    metrics.resolution_sla.average_resolution_time = resolutionCount > 0 ? Math.round(totalResolutionTime / resolutionCount) : 0;
    metrics.resolution_sla.compliance_rate = resolutionCount > 0 ? Math.round((metrics.resolution_sla.met / resolutionCount) * 100) : 0;

    return metrics;
  }

  /**
   * Get SLA targets for priority
   */
  getSLATargets(priority: TicketPriority): SLATarget {
    return this.DEFAULT_SLA_TARGETS[priority];
  }

  /**
   * Update SLA targets (admin function)
   */
  async updateSLATargets(priority: TicketPriority, targets: Partial<SLATarget>): Promise<boolean> {
    try {
      // This would update SLA configuration in database
      // For now, we'll just log the change
      logger.info('SLA targets updated:', { priority, targets });
      
      // Clear cache to force refresh
      this.clearCache('targets');
      
      return true;
    } catch (error) {
      logger.error('Failed to update SLA targets:', error);
      return false;
    }
  }

  /**
   * Get tickets with SLA breaches
   */
  async getBreachedTickets(
    breachType: 'response' | 'resolution' | 'both' = 'both'
  ): Promise<SupportRecord[]> {
    try {
      const cacheKey = this.getCacheKey('breached', { breachType });
      const cached = this.getFromCache<SupportRecord[]>(cacheKey);
      if (cached) return cached;

      let query = supabase
        .from('support_system')
        .select('*')
        .eq('system_type', 'ticket')
        .eq('is_active', true);

      if (breachType === 'response') {
        query = query.eq('sla_data->response_sla->is_breached', true);
      } else if (breachType === 'resolution') {
        query = query.eq('sla_data->resolution_sla->is_breached', true);
      } else {
        // Both - need to use OR condition
        query = query.or('sla_data->response_sla->is_breached.eq.true,sla_data->resolution_sla->is_breached.eq.true');
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;

      this.setCache(cacheKey, data || []);
      return data || [];

    } catch (error) {
      logger.error('Failed to get breached tickets:', error);
      return [];
    }
  }

  /**
   * Utility methods
   */
  private async getTicketById(ticketId: string): Promise<SupportRecord | null> {
    try {
      const { data, error } = await supabase
        .from('support_system')
        .select('*')
        .eq('id', ticketId)
        .single();

      if (error) return null;
      return data;
    } catch (error) {
      return null;
    }
  }

  private async updateTicketSLA(ticketId: string, slaData: SLAData): Promise<void> {
    await supabase
      .from('support_system')
      .update({
        sla_data: slaData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticketId);
  }

  private getEmptySLAMetrics(): SLAMetrics {
    return {
      total_tickets: 0,
      response_sla: {
        met: 0,
        breached: 0,
        average_response_time: 0,
        compliance_rate: 0,
      },
      resolution_sla: {
        met: 0,
        breached: 0,
        average_resolution_time: 0,
        compliance_rate: 0,
      },
      escalations: {
        total: 0,
        automatic: 0,
        manual: 0,
      },
    };
  }

  /**
   * Cache management
   */
  private getCacheKey(operation: string, params: any = {}): string {
    return `sla_${operation}_${JSON.stringify(params)}`;
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data as T;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private clearCache(pattern?: string): void {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.cache.clear();
    logger.info('SLAManagementService cleanup completed');
  }
}

export default SLAManagementService;