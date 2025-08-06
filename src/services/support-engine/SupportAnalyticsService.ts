/**
 * Support Analytics Service
 * Handles metrics collection, performance tracking, and reporting for support system
 * Decomposed from UnifiedSupportEngine for better separation of concerns
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import * as Sentry from '@sentry/react';
import type { TicketStatus, TicketPriority, TicketCategory, SupportRecord } from './SupportTicketService';

export interface SupportMetrics {
  overview: {
    total_tickets: number;
    open_tickets: number;
    resolved_tickets: number;
    average_resolution_time_hours: number;
    customer_satisfaction_score: number;
    first_response_time_minutes: number;
  };
  by_status: Record<TicketStatus, number>;
  by_priority: Record<TicketPriority, number>;
  by_category: Record<TicketCategory, number>;
  agent_performance: AgentPerformanceMetrics[];
  trends: {
    daily_ticket_volume: Array<{ date: string; count: number }>;
    resolution_time_trend: Array<{ date: string; avg_hours: number }>;
    satisfaction_trend: Array<{ date: string; score: number }>;
  };
  sla_compliance: {
    response_sla_met: number;
    response_sla_breached: number;
    resolution_sla_met: number;
    resolution_sla_breached: number;
    compliance_rate_percentage: number;
  };
}

export interface AgentPerformanceMetrics {
  agent_id: string;
  agent_name: string;
  tickets_assigned: number;
  tickets_resolved: number;
  avg_resolution_time_hours: number;
  customer_satisfaction_avg: number;
  sla_compliance_rate: number;
  workload_utilization: number;
  first_response_avg_minutes: number;
  escalations_received: number;
}

export interface CustomerSatisfactionData {
  ticket_id: string;
  rating: number; // 1-5 scale
  feedback: string;
  created_at: string;
  customer_id: string;
}

export interface AnalyticsFilter {
  date_range: {
    start: string;
    end: string;
  };
  agent_ids?: string[];
  categories?: TicketCategory[];
  priorities?: TicketPriority[];
  status?: TicketStatus[];
  customer_tier?: string;
}

export interface ReportOptions {
  format: 'json' | 'csv' | 'pdf';
  include_charts: boolean;
  include_agent_details: boolean;
  include_customer_feedback: boolean;
  group_by: 'day' | 'week' | 'month';
}

export interface PerformanceTrend {
  metric: string;
  current_value: number;
  previous_value: number;
  change_percentage: number;
  trend_direction: 'up' | 'down' | 'stable';
  is_improvement: boolean;
}

export interface AlertThreshold {
  metric: string;
  threshold_value: number;
  comparison_operator: 'greater_than' | 'less_than' | 'equals';
  alert_severity: 'info' | 'warning' | 'critical';
  notification_channels: string[];
  is_active: boolean;
}

export class SupportAnalyticsService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes for analytics data

  // Alert thresholds for performance monitoring
  private readonly DEFAULT_ALERT_THRESHOLDS: AlertThreshold[] = [
    {
      metric: 'response_sla_compliance',
      threshold_value: 85,
      comparison_operator: 'less_than',
      alert_severity: 'warning',
      notification_channels: ['email', 'slack'],
      is_active: true,
    },
    {
      metric: 'avg_resolution_time_hours',
      threshold_value: 48,
      comparison_operator: 'greater_than',
      alert_severity: 'critical',
      notification_channels: ['email', 'slack', 'pagerduty'],
      is_active: true,
    },
    {
      metric: 'customer_satisfaction_score',
      threshold_value: 3.5,
      comparison_operator: 'less_than',
      alert_severity: 'warning',
      notification_channels: ['email'],
      is_active: true,
    },
    {
      metric: 'open_tickets_count',
      threshold_value: 100,
      comparison_operator: 'greater_than',
      alert_severity: 'info',
      notification_channels: ['slack'],
      is_active: true,
    },
  ];

  constructor() {
    logger.info('SupportAnalyticsService initialized');
  }

  /**
   * Get comprehensive support metrics
   */
  async getSupportMetrics(filter: AnalyticsFilter): Promise<SupportMetrics> {
    try {
      const cacheKey = this.getCacheKey('metrics', filter);
      const cached = this.getFromCache<SupportMetrics>(cacheKey);
      if (cached) return cached;

      logger.info('Generating support metrics:', { filter });

      // Fetch tickets data
      const tickets = await this.getTicketsData(filter);
      
      // Calculate metrics
      const metrics = await this.calculateMetrics(tickets, filter);
      
      this.setCache(cacheKey, metrics);
      return metrics;

    } catch (error) {
      logger.error('Failed to generate support metrics:', error);
      Sentry.captureException(error);
      return this.getEmptyMetrics();
    }
  }

  /**
   * Get agent performance metrics
   */
  async getAgentPerformanceMetrics(
    agentIds: string[],
    dateRange: { start: string; end: string }
  ): Promise<AgentPerformanceMetrics[]> {
    try {
      const cacheKey = this.getCacheKey('agent_performance', { agentIds, dateRange });
      const cached = this.getFromCache<AgentPerformanceMetrics[]>(cacheKey);
      if (cached) return cached;

      const performanceMetrics: AgentPerformanceMetrics[] = [];

      for (const agentId of agentIds) {
        const metrics = await this.calculateAgentPerformance(agentId, dateRange);
        if (metrics) {
          performanceMetrics.push(metrics);
        }
      }

      this.setCache(cacheKey, performanceMetrics);
      return performanceMetrics;

    } catch (error) {
      logger.error('Failed to get agent performance metrics:', error);
      return [];
    }
  }

  /**
   * Track customer satisfaction
   */
  async recordCustomerSatisfaction(
    ticketId: string,
    rating: number,
    feedback?: string
  ): Promise<boolean> {
    try {
      // Validate rating
      if (rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User authentication required');
      }

      const satisfactionData: CustomerSatisfactionData = {
        ticket_id: ticketId,
        rating,
        feedback: feedback || '',
        created_at: new Date().toISOString(),
        customer_id: user.id,
      };

      // Store satisfaction data
      const { error } = await supabase
        .from('customer_satisfaction')
        .insert([satisfactionData]);

      if (error) throw error;

      // Update ticket with satisfaction data
      await this.updateTicketSatisfaction(ticketId, rating);

      logger.info('Customer satisfaction recorded:', { ticketId, rating });
      this.clearCache('metrics');

      return true;

    } catch (error) {
      logger.error('Failed to record customer satisfaction:', error);
      return false;
    }
  }

  /**
   * Get performance trends
   */
  async getPerformanceTrends(
    metrics: string[],
    currentPeriod: { start: string; end: string },
    comparisonPeriod: { start: string; end: string }
  ): Promise<PerformanceTrend[]> {
    try {
      const trends: PerformanceTrend[] = [];

      for (const metric of metrics) {
        const trend = await this.calculateTrend(metric, currentPeriod, comparisonPeriod);
        if (trend) {
          trends.push(trend);
        }
      }

      return trends;

    } catch (error) {
      logger.error('Failed to get performance trends:', error);
      return [];
    }
  }

  /**
   * Generate analytics report
   */
  async generateReport(
    filter: AnalyticsFilter,
    options: ReportOptions
  ): Promise<{
    success: boolean;
    report_url?: string;
    report_data?: any;
    error?: string;
  }> {
    try {
      logger.info('Generating analytics report:', { filter, options });

      // Get metrics data
      const metrics = await this.getSupportMetrics(filter);
      
      // Get agent performance if requested
      let agentDetails: AgentPerformanceMetrics[] = [];
      if (options.include_agent_details) {
        const allAgents = await this.getAllAgentIds();
        agentDetails = await this.getAgentPerformanceMetrics(allAgents, filter.date_range);
      }

      // Get customer feedback if requested
      let customerFeedback: CustomerSatisfactionData[] = [];
      if (options.include_customer_feedback) {
        customerFeedback = await this.getCustomerFeedbackData(filter);
      }

      // Compile report data
      const reportData = {
        generated_at: new Date().toISOString(),
        filter,
        options,
        metrics,
        agent_details: agentDetails,
        customer_feedback: customerFeedback,
        summary: this.generateReportSummary(metrics, agentDetails),
      };

      // Format report based on requested format
      let reportResult;
      switch (options.format) {
        case 'json':
          reportResult = await this.generateJSONReport(reportData);
          break;
        case 'csv':
          reportResult = await this.generateCSVReport(reportData);
          break;
        case 'pdf':
          reportResult = await this.generatePDFReport(reportData);
          break;
        default:
          throw new Error(`Unsupported report format: ${options.format}`);
      }

      logger.info('Report generated successfully:', { format: options.format });

      return {
        success: true,
        report_url: reportResult.url,
        report_data: options.format === 'json' ? reportData : undefined,
      };

    } catch (error) {
      logger.error('Report generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Monitor performance alerts
   */
  async checkPerformanceAlerts(): Promise<{
    alerts_triggered: number;
    alerts: Array<{
      metric: string;
      current_value: number;
      threshold: number;
      severity: string;
      message: string;
    }>;
  }> {
    try {
      const alerts: Array<{
        metric: string;
        current_value: number;
        threshold: number;
        severity: string;
        message: string;
      }> = [];

      // Get current metrics
      const filter: AnalyticsFilter = {
        date_range: {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Last 24 hours
          end: new Date().toISOString(),
        },
      };

      const metrics = await this.getSupportMetrics(filter);

      // Check each alert threshold
      for (const threshold of this.DEFAULT_ALERT_THRESHOLDS) {
        if (!threshold.is_active) continue;

        const currentValue = this.getMetricValue(metrics, threshold.metric);
        if (currentValue === null) continue;

        const isTriggered = this.checkThreshold(
          currentValue,
          threshold.threshold_value,
          threshold.comparison_operator
        );

        if (isTriggered) {
          alerts.push({
            metric: threshold.metric,
            current_value: currentValue,
            threshold: threshold.threshold_value,
            severity: threshold.alert_severity,
            message: this.generateAlertMessage(threshold, currentValue),
          });

          // Send alert notifications
          await this.sendAlertNotifications(threshold, currentValue);
        }
      }

      if (alerts.length > 0) {
        logger.warn('Performance alerts triggered:', { count: alerts.length, alerts });
      }

      return {
        alerts_triggered: alerts.length,
        alerts,
      };

    } catch (error) {
      logger.error('Performance alert check failed:', error);
      return {
        alerts_triggered: 0,
        alerts: [],
      };
    }
  }

  /**
   * Get real-time dashboard data
   */
  async getDashboardData(): Promise<{
    tickets_today: number;
    avg_response_time_minutes: number;
    sla_compliance_percentage: number;
    customer_satisfaction_score: number;
    active_agents: number;
    tickets_by_priority: Record<TicketPriority, number>;
    recent_activity: Array<{
      type: string;
      message: string;
      timestamp: string;
    }>;
  }> {
    try {
      const cacheKey = this.getCacheKey('dashboard', {});
      const cached = this.getFromCache<any>(cacheKey);
      if (cached) return cached;

      const today = new Date().toISOString().split('T')[0];
      const filter: AnalyticsFilter = {
        date_range: {
          start: `${today}T00:00:00Z`,
          end: new Date().toISOString(),
        },
      };

      const metrics = await this.getSupportMetrics(filter);
      const recentActivity = await this.getRecentActivity();

      const dashboardData = {
        tickets_today: metrics.overview.total_tickets,
        avg_response_time_minutes: metrics.overview.first_response_time_minutes,
        sla_compliance_percentage: metrics.sla_compliance.compliance_rate_percentage,
        customer_satisfaction_score: metrics.overview.customer_satisfaction_score,
        active_agents: await this.getActiveAgentCount(),
        tickets_by_priority: metrics.by_priority,
        recent_activity: recentActivity,
      };

      this.setCache(cacheKey, dashboardData, 2 * 60 * 1000); // 2-minute cache
      return dashboardData;

    } catch (error) {
      logger.error('Failed to get dashboard data:', error);
      return {
        tickets_today: 0,
        avg_response_time_minutes: 0,
        sla_compliance_percentage: 0,
        customer_satisfaction_score: 0,
        active_agents: 0,
        tickets_by_priority: { low: 0, medium: 0, high: 0, urgent: 0 },
        recent_activity: [],
      };
    }
  }

  /**
   * Calculate comprehensive metrics from tickets data
   */
  private async calculateMetrics(tickets: SupportRecord[], filter: AnalyticsFilter): Promise<SupportMetrics> {
    try {
      // Initialize metrics structure
      const metrics: SupportMetrics = {
        overview: {
          total_tickets: tickets.length,
          open_tickets: 0,
          resolved_tickets: 0,
          average_resolution_time_hours: 0,
          customer_satisfaction_score: 0,
          first_response_time_minutes: 0,
        },
        by_status: { open: 0, in_progress: 0, pending: 0, resolved: 0, closed: 0 },
        by_priority: { low: 0, medium: 0, high: 0, urgent: 0 },
        by_category: { general: 0, payment: 0, shipping: 0, refund: 0, product: 0, customs: 0 },
        agent_performance: [],
        trends: {
          daily_ticket_volume: [],
          resolution_time_trend: [],
          satisfaction_trend: [],
        },
        sla_compliance: {
          response_sla_met: 0,
          response_sla_breached: 0,
          resolution_sla_met: 0,
          resolution_sla_breached: 0,
          compliance_rate_percentage: 0,
        },
      };

      let totalResolutionTime = 0;
      let resolvedCount = 0;
      let totalFirstResponseTime = 0;
      let responseCount = 0;
      let totalSatisfactionScore = 0;
      let satisfactionCount = 0;

      // Process each ticket
      for (const ticket of tickets) {
        const ticketData = ticket.ticket_data;
        const slaData = ticket.sla_data;
        
        if (!ticketData) continue;

        // Count by status
        metrics.by_status[ticketData.status]++;
        
        // Count open vs resolved
        if (['open', 'in_progress', 'pending'].includes(ticketData.status)) {
          metrics.overview.open_tickets++;
        } else if (['resolved', 'closed'].includes(ticketData.status)) {
          metrics.overview.resolved_tickets++;
          
          // Calculate resolution time
          if (ticketData.metadata?.resolution_time) {
            totalResolutionTime += ticketData.metadata.resolution_time;
            resolvedCount++;
          }
        }

        // Count by priority and category
        metrics.by_priority[ticketData.priority]++;
        metrics.by_category[ticketData.category]++;

        // SLA compliance tracking
        if (slaData) {
          if (slaData.response_sla?.first_response_at) {
            responseCount++;
            
            // Calculate first response time
            const createdAt = new Date(ticket.created_at);
            const respondedAt = new Date(slaData.response_sla.first_response_at);
            const responseMinutes = Math.floor((respondedAt.getTime() - createdAt.getTime()) / (1000 * 60));
            totalFirstResponseTime += responseMinutes;
            
            if (slaData.response_sla.is_breached) {
              metrics.sla_compliance.response_sla_breached++;
            } else {
              metrics.sla_compliance.response_sla_met++;
            }
          }

          if (slaData.resolution_sla?.resolved_at) {
            if (slaData.resolution_sla.is_breached) {
              metrics.sla_compliance.resolution_sla_breached++;
            } else {
              metrics.sla_compliance.resolution_sla_met++;
            }
          }
        }

        // Customer satisfaction
        if (ticketData.metadata?.customer_satisfaction) {
          totalSatisfactionScore += ticketData.metadata.customer_satisfaction;
          satisfactionCount++;
        }
      }

      // Calculate averages
      metrics.overview.average_resolution_time_hours = resolvedCount > 0 ? 
        Math.round(totalResolutionTime / resolvedCount) : 0;
      
      metrics.overview.first_response_time_minutes = responseCount > 0 ? 
        Math.round(totalFirstResponseTime / responseCount) : 0;
      
      metrics.overview.customer_satisfaction_score = satisfactionCount > 0 ? 
        Math.round((totalSatisfactionScore / satisfactionCount) * 10) / 10 : 0;

      // Calculate SLA compliance rate
      const totalSLAChecks = metrics.sla_compliance.response_sla_met + 
                            metrics.sla_compliance.response_sla_breached + 
                            metrics.sla_compliance.resolution_sla_met + 
                            metrics.sla_compliance.resolution_sla_breached;
      
      const totalSLAMet = metrics.sla_compliance.response_sla_met + 
                         metrics.sla_compliance.resolution_sla_met;
      
      metrics.sla_compliance.compliance_rate_percentage = totalSLAChecks > 0 ? 
        Math.round((totalSLAMet / totalSLAChecks) * 100) : 0;

      // Generate trends
      metrics.trends.daily_ticket_volume = await this.calculateDailyTrends(tickets, filter.date_range);
      metrics.trends.resolution_time_trend = await this.calculateResolutionTrends(tickets, filter.date_range);
      metrics.trends.satisfaction_trend = await this.calculateSatisfactionTrends(filter.date_range);

      return metrics;

    } catch (error) {
      logger.error('Metrics calculation error:', error);
      return this.getEmptyMetrics();
    }
  }

  /**
   * Get tickets data based on filter
   */
  private async getTicketsData(filter: AnalyticsFilter): Promise<SupportRecord[]> {
    try {
      let query = supabase
        .from('support_system')
        .select('*')
        .eq('system_type', 'ticket')
        .eq('is_active', true)
        .gte('created_at', filter.date_range.start)
        .lte('created_at', filter.date_range.end);

      // Apply additional filters
      if (filter.categories?.length) {
        query = query.in('ticket_data->category', filter.categories);
      }

      if (filter.priorities?.length) {
        query = query.in('ticket_data->priority', filter.priorities);
      }

      if (filter.status?.length) {
        query = query.in('ticket_data->status', filter.status);
      }

      if (filter.agent_ids?.length) {
        query = query.in('ticket_data->assigned_to', filter.agent_ids);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];

    } catch (error) {
      logger.error('Failed to get tickets data:', error);
      return [];
    }
  }

  /**
   * Utility methods for calculations and data processing
   */
  private async calculateDailyTrends(
    tickets: SupportRecord[],
    dateRange: { start: string; end: string }
  ): Promise<Array<{ date: string; count: number }>> {
    const trends: Array<{ date: string; count: number }> = [];
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);

    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0];
      const count = tickets.filter(ticket => 
        ticket.created_at.startsWith(dateStr)
      ).length;
      
      trends.push({ date: dateStr, count });
    }

    return trends;
  }

  private async calculateResolutionTrends(
    tickets: SupportRecord[],
    dateRange: { start: string; end: string }
  ): Promise<Array<{ date: string; avg_hours: number }>> {
    // Implementation would calculate daily average resolution times
    return [];
  }

  private async calculateSatisfactionTrends(
    dateRange: { start: string; end: string }
  ): Promise<Array<{ date: string; score: number }>> {
    // Implementation would calculate daily average satisfaction scores
    return [];
  }

  private getEmptyMetrics(): SupportMetrics {
    return {
      overview: {
        total_tickets: 0,
        open_tickets: 0,
        resolved_tickets: 0,
        average_resolution_time_hours: 0,
        customer_satisfaction_score: 0,
        first_response_time_minutes: 0,
      },
      by_status: { open: 0, in_progress: 0, pending: 0, resolved: 0, closed: 0 },
      by_priority: { low: 0, medium: 0, high: 0, urgent: 0 },
      by_category: { general: 0, payment: 0, shipping: 0, refund: 0, product: 0, customs: 0 },
      agent_performance: [],
      trends: {
        daily_ticket_volume: [],
        resolution_time_trend: [],
        satisfaction_trend: [],
      },
      sla_compliance: {
        response_sla_met: 0,
        response_sla_breached: 0,
        resolution_sla_met: 0,
        resolution_sla_breached: 0,
        compliance_rate_percentage: 0,
      },
    };
  }

  // Additional utility methods would be implemented here...
  private async calculateAgentPerformance(agentId: string, dateRange: { start: string; end: string }): Promise<AgentPerformanceMetrics | null> {
    // Implementation would calculate individual agent metrics
    return null;
  }

  private async updateTicketSatisfaction(ticketId: string, rating: number): Promise<void> {
    // Implementation would update ticket with satisfaction rating
  }

  private async getAllAgentIds(): Promise<string[]> {
    // Implementation would get all agent IDs
    return [];
  }

  private async getCustomerFeedbackData(filter: AnalyticsFilter): Promise<CustomerSatisfactionData[]> {
    // Implementation would fetch customer feedback
    return [];
  }

  private async getRecentActivity(): Promise<Array<{ type: string; message: string; timestamp: string }>> {
    // Implementation would get recent support activity
    return [];
  }

  private async getActiveAgentCount(): Promise<number> {
    // Implementation would count active agents
    return 0;
  }

  private getMetricValue(metrics: SupportMetrics, metricName: string): number | null {
    // Implementation would extract metric value by name
    return null;
  }

  private checkThreshold(value: number, threshold: number, operator: string): boolean {
    switch (operator) {
      case 'greater_than': return value > threshold;
      case 'less_than': return value < threshold;
      case 'equals': return value === threshold;
      default: return false;
    }
  }

  private generateAlertMessage(threshold: AlertThreshold, currentValue: number): string {
    return `${threshold.metric} is ${currentValue} (threshold: ${threshold.threshold_value})`;
  }

  private async sendAlertNotifications(threshold: AlertThreshold, currentValue: number): Promise<void> {
    // Implementation would send alert notifications
  }

  private generateReportSummary(metrics: SupportMetrics, agentDetails: AgentPerformanceMetrics[]): any {
    return {
      total_tickets: metrics.overview.total_tickets,
      resolution_rate: metrics.overview.total_tickets > 0 ? 
        Math.round((metrics.overview.resolved_tickets / metrics.overview.total_tickets) * 100) : 0,
      avg_resolution_time: metrics.overview.average_resolution_time_hours,
      customer_satisfaction: metrics.overview.customer_satisfaction_score,
      sla_compliance: metrics.sla_compliance.compliance_rate_percentage,
      top_performing_agent: agentDetails.length > 0 ? 
        agentDetails.reduce((top, agent) => 
          agent.customer_satisfaction_avg > (top?.customer_satisfaction_avg || 0) ? agent : top
        ) : null,
    };
  }

  private async generateJSONReport(data: any): Promise<{ url: string }> {
    // Implementation would generate and store JSON report
    return { url: '/reports/support-analytics.json' };
  }

  private async generateCSVReport(data: any): Promise<{ url: string }> {
    // Implementation would generate CSV report
    return { url: '/reports/support-analytics.csv' };
  }

  private async generatePDFReport(data: any): Promise<{ url: string }> {
    // Implementation would generate PDF report
    return { url: '/reports/support-analytics.pdf' };
  }

  private calculateTrend(metric: string, currentPeriod: any, comparisonPeriod: any): Promise<PerformanceTrend | null> {
    // Implementation would calculate performance trends
    return Promise.resolve(null);
  }

  /**
   * Cache management
   */
  private getCacheKey(operation: string, params: any = {}): string {
    return `analytics_${operation}_${JSON.stringify(params)}`;
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data as T;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache<T>(key: string, data: T, customTTL?: number): void {
    this.cache.set(key, { data, timestamp: Date.now() });
    
    // Auto-expire with custom TTL if provided
    if (customTTL) {
      setTimeout(() => {
        this.cache.delete(key);
      }, customTTL);
    }
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
    logger.info('SupportAnalyticsService cleanup completed');
  }
}

export default SupportAnalyticsService;