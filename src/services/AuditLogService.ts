/**
 * AuditLogService - Centralized security logging for quote sharing
 *
 * Features:
 * - Track all share-related actions
 * - IP address and user agent logging
 * - JSON details for flexible data storage
 * - Admin analytics support
 *
 * System Impact: Light - just INSERT operations to log table
 */

import { supabase } from '@/integrations/supabase/client';

export interface AuditLogEntry {
  id?: string;
  quote_id: string;
  user_id?: string;
  action: AuditAction;
  ip_address?: string;
  user_agent?: string;
  details?: Record<string, any>;
  created_at?: string;
}

export type AuditAction =
  | 'share_generated'
  | 'link_accessed'
  | 'quote_approved'
  | 'quote_rejected'
  | 'email_verification_sent'
  | 'email_verified'
  | 'rate_limit_exceeded'
  | 'expired_link_accessed'
  | 'bulk_operation';

export interface AuditLogFilter {
  quote_id?: string;
  user_id?: string;
  action?: AuditAction;
  start_date?: string;
  end_date?: string;
  limit?: number;
}

export interface AuditLogStats {
  totalActions: number;
  actionBreakdown: Record<AuditAction, number>;
  topUsers: Array<{ user_id: string; count: number; user_email?: string }>;
  timelineData: Array<{ date: string; count: number }>;
  recentActivity: AuditLogEntry[];
}

class AuditLogService {
  private static instance: AuditLogService;

  private constructor() {}

  public static getInstance(): AuditLogService {
    if (!AuditLogService.instance) {
      AuditLogService.instance = new AuditLogService();
    }
    return AuditLogService.instance;
  }

  /**
   * Log a share-related action
   */
  public async logAction(
    quoteId: string,
    action: AuditAction,
    options: {
      userId?: string;
      ipAddress?: string;
      userAgent?: string;
      details?: Record<string, any>;
    } = {},
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const logEntry: Omit<AuditLogEntry, 'id' | 'created_at'> = {
        quote_id: quoteId,
        user_id: options.userId || null,
        action,
        ip_address: options.ipAddress || null,
        user_agent: options.userAgent || null,
        details: options.details || null,
      };

      const { data, error } = await supabase
        .from('share_audit_log')
        .insert([logEntry])
        .select('id')
        .single();

      if (error) {
        console.error('[AuditLogService] Failed to log action:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[AuditLogService] Exception logging action:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get audit logs with filtering
   */
  public async getLogs(filter: AuditLogFilter = {}): Promise<{
    logs: AuditLogEntry[];
    error?: string;
  }> {
    try {
      let query = supabase
        .from('share_audit_log')
        .select(
          `
          id,
          quote_id,
          user_id,
          action,
          ip_address,
          user_agent,
          details,
          created_at,
          quotes(id, customer_name, customer_email)
        `,
        )
        .order('created_at', { ascending: false });

      // Apply filters
      if (filter.quote_id) {
        query = query.eq('quote_id', filter.quote_id);
      }

      if (filter.user_id) {
        query = query.eq('user_id', filter.user_id);
      }

      if (filter.action) {
        query = query.eq('action', filter.action);
      }

      if (filter.start_date) {
        query = query.gte('created_at', filter.start_date);
      }

      if (filter.end_date) {
        query = query.lte('created_at', filter.end_date);
      }

      if (filter.limit) {
        query = query.limit(filter.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[AuditLogService] Failed to fetch logs:', error);
        return { logs: [], error: error.message };
      }

      return { logs: data || [] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[AuditLogService] Exception fetching logs:', errorMessage);
      return { logs: [], error: errorMessage };
    }
  }

  /**
   * Get analytics statistics for admin dashboard
   */
  public async getStatistics(days: number = 30): Promise<{
    stats: AuditLogStats | null;
    error?: string;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get all logs within the time range
      const { data: logs, error } = await supabase
        .from('share_audit_log')
        .select(
          `
          id,
          quote_id,
          user_id,
          action,
          created_at,
          quotes(customer_name, customer_email)
        `,
        )
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[AuditLogService] Failed to fetch statistics:', error);
        return { stats: null, error: error.message };
      }

      if (!logs || logs.length === 0) {
        return {
          stats: {
            totalActions: 0,
            actionBreakdown: {} as Record<AuditAction, number>,
            topUsers: [],
            timelineData: [],
            recentActivity: [],
          },
        };
      }

      // Calculate action breakdown
      const actionBreakdown: Record<string, number> = {};
      const userCounts: Record<string, number> = {};
      const dailyCounts: Record<string, number> = {};

      logs.forEach((log) => {
        // Action breakdown
        actionBreakdown[log.action] = (actionBreakdown[log.action] || 0) + 1;

        // User counts
        if (log.user_id) {
          userCounts[log.user_id] = (userCounts[log.user_id] || 0) + 1;
        }

        // Daily timeline
        const date = new Date(log.created_at).toISOString().split('T')[0];
        dailyCounts[date] = (dailyCounts[date] || 0) + 1;
      });

      // Get top users with email information
      const topUserEntries = Object.entries(userCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10);

      const topUsers = topUserEntries.map(([userId, count]) => {
        const userLog = logs.find((log) => log.user_id === userId);
        return {
          user_id: userId,
          count,
          user_email: userLog?.quotes?.customer_email || 'Unknown',
        };
      });

      // Timeline data (last 30 days)
      const timelineData = Array.from({ length: days }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (days - 1 - i));
        const dateStr = date.toISOString().split('T')[0];
        return {
          date: dateStr,
          count: dailyCounts[dateStr] || 0,
        };
      });

      const stats: AuditLogStats = {
        totalActions: logs.length,
        actionBreakdown: actionBreakdown as Record<AuditAction, number>,
        topUsers,
        timelineData,
        recentActivity: logs.slice(0, 20) as AuditLogEntry[],
      };

      return { stats };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[AuditLogService] Exception calculating statistics:', errorMessage);
      return { stats: null, error: errorMessage };
    }
  }

  /**
   * Get logs for a specific quote
   */
  public async getQuoteLogs(quoteId: string): Promise<{
    logs: AuditLogEntry[];
    error?: string;
  }> {
    return this.getLogs({ quote_id: quoteId });
  }

  /**
   * Log multiple actions (bulk operation)
   */
  public async logBulkActions(
    actions: Array<{
      quoteId: string;
      action: AuditAction;
      userId?: string;
      details?: Record<string, any>;
    }>,
    commonOptions: {
      ipAddress?: string;
      userAgent?: string;
    } = {},
  ): Promise<{ success: boolean; error?: string; successCount: number }> {
    try {
      const logEntries = actions.map((actionData) => ({
        quote_id: actionData.quoteId,
        user_id: actionData.userId || null,
        action: actionData.action,
        ip_address: commonOptions.ipAddress || null,
        user_agent: commonOptions.userAgent || null,
        details: actionData.details || null,
      }));

      const { data, error } = await supabase
        .from('share_audit_log')
        .insert(logEntries)
        .select('id');

      if (error) {
        console.error('[AuditLogService] Failed to log bulk actions:', error);
        return { success: false, error: error.message, successCount: 0 };
      }

      return {
        success: true,
        successCount: data?.length || 0,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[AuditLogService] Exception logging bulk actions:', errorMessage);
      return { success: false, error: errorMessage, successCount: 0 };
    }
  }

  /**
   * Clean up old audit logs (for maintenance)
   */
  public async cleanupOldLogs(daysToKeep: number = 365): Promise<{
    success: boolean;
    deletedCount: number;
    error?: string;
  }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const { data, error } = await supabase
        .from('share_audit_log')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .select('id');

      if (error) {
        console.error('[AuditLogService] Failed to cleanup old logs:', error);
        return { success: false, deletedCount: 0, error: error.message };
      }

      const deletedCount = data?.length || 0;
      console.log(
        `[AuditLogService] Cleaned up ${deletedCount} audit log entries older than ${daysToKeep} days`,
      );

      return { success: true, deletedCount };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[AuditLogService] Exception during cleanup:', errorMessage);
      return { success: false, deletedCount: 0, error: errorMessage };
    }
  }

  /**
   * Helper to get user's IP address from request
   */
  public static getClientIP(): string | null {
    if (typeof window === 'undefined') return null;

    // In production, you might get this from headers or a service
    // For now, return null and let the backend handle IP detection
    return null;
  }

  /**
   * Helper to get user agent
   */
  public static getUserAgent(): string {
    if (typeof window === 'undefined') return 'Server';
    return navigator.userAgent || 'Unknown';
  }
}

// Export singleton instance
export const auditLogService = AuditLogService.getInstance();
