/**
 * Discount Logging Service
 * Comprehensive logging for all discount applications, validations, and usage patterns
 */

import { supabase } from '@/integrations/supabase/client';

export interface DiscountApplicationLog {
  id?: string;
  quote_id?: string;
  delivery_order_id?: string;
  discount_code_id?: string;
  discount_type_id?: string;
  country_rule_id?: string;
  application_type: 'manual' | 'automatic' | 'volume' | 'country' | 'campaign';
  customer_id?: string;
  customer_country?: string;
  discount_amount: number;
  original_amount: number;
  component_breakdown?: {
    shipping?: { original: number; discount: number; final: number };
    customs?: { original: number; discount: number; final: number };
    handling?: { original: number; discount: number; final: number };
    total?: { original: number; discount: number; final: number };
  };
  conditions_met?: {
    min_order_met?: boolean;
    country_eligible?: boolean;
    usage_limit_ok?: boolean;
    customer_limit_ok?: boolean;
    date_valid?: boolean;
    [key: string]: any;
  };
  metadata?: {
    discount_code?: string;
    discount_name?: string;
    discount_percentage?: number;
    user_agent?: string;
    ip_address?: string;
    session_id?: string;
    calculation_version?: string;
    [key: string]: any;
  };
}

export interface DiscountValidationLog {
  discount_code: string;
  customer_id?: string;
  validation_result: 'valid' | 'invalid' | 'expired' | 'usage_exceeded' | 'min_order_not_met' | 'country_restricted';
  error_message?: string;
  order_total?: number;
  customer_country?: string;
  conditions_checked?: {
    [key: string]: boolean | string | number;
  };
  validated_at: Date;
  metadata?: {
    user_agent?: string;
    ip_address?: string;
    session_id?: string;
    [key: string]: any;
  };
}

export interface DiscountUsageAnalytics {
  period: 'day' | 'week' | 'month' | 'year';
  start_date: Date;
  end_date: Date;
  total_applications: number;
  total_savings: number;
  average_discount: number;
  top_codes: Array<{
    code: string;
    usage_count: number;
    total_savings: number;
  }>;
  country_breakdown: Array<{
    country: string;
    usage_count: number;
    total_savings: number;
  }>;
  application_types: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
}

export class DiscountLoggingService {
  private static instance: DiscountLoggingService;

  static getInstance(): DiscountLoggingService {
    if (!DiscountLoggingService.instance) {
      DiscountLoggingService.instance = new DiscountLoggingService();
    }
    return DiscountLoggingService.instance;
  }

  /**
   * Log a successful discount application
   */
  async logDiscountApplication(logData: DiscountApplicationLog): Promise<void> {
    try {
      const logEntry = {
        ...logData,
        applied_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        id: crypto.randomUUID()
      };

      const { error } = await supabase
        .from('discount_application_log')
        .insert([logEntry]);

      if (error) {
        console.error('Error logging discount application:', error);
        // Don't throw - logging shouldn't break the main flow
      }

      // Also log to console for development
      console.log('✅ Discount Applied:', {
        type: logData.application_type,
        amount: logData.discount_amount,
        code: logData.metadata?.discount_code,
        customer: logData.customer_id,
        quote: logData.quote_id
      });

    } catch (error) {
      console.error('Failed to log discount application:', error);
    }
  }

  /**
   * Log discount validation attempts (both successful and failed)
   */
  async logDiscountValidation(logData: DiscountValidationLog): Promise<void> {
    try {
      // Store validation logs in a separate table or as part of application log
      const validationEntry = {
        id: crypto.randomUUID(),
        application_type: 'validation',
        customer_id: logData.customer_id,
        customer_country: logData.customer_country,
        discount_amount: 0, // No amount for validation
        original_amount: logData.order_total || 0,
        conditions_met: {
          validation_result: logData.validation_result,
          ...logData.conditions_checked
        },
        applied_at: logData.validated_at.toISOString(),
        created_at: new Date().toISOString(),
        component_breakdown: {
          validation: {
            code: logData.discount_code,
            result: logData.validation_result,
            error: logData.error_message
          }
        },
        metadata: {
          discount_code: logData.discount_code,
          validation_result: logData.validation_result,
          error_message: logData.error_message,
          ...logData.metadata
        }
      };

      // For failed validations, we'll insert into the same table but with different metadata
      const { error } = await supabase
        .from('discount_application_log')
        .insert([validationEntry]);

      if (error) {
        console.error('Error logging discount validation:', error);
      }

      // Log validation attempts for debugging
      if (logData.validation_result !== 'valid') {
        console.log(`❌ Discount Validation Failed: ${logData.discount_code} - ${logData.validation_result}`, {
          customer: logData.customer_id,
          country: logData.customer_country,
          order_total: logData.order_total,
          error: logData.error_message
        });
      } else {
        console.log(`✅ Discount Validation Success: ${logData.discount_code}`, {
          customer: logData.customer_id,
          order_total: logData.order_total
        });
      }

    } catch (error) {
      console.error('Failed to log discount validation:', error);
    }
  }

  /**
   * Log automatic discount triggers (volume, country-based)
   */
  async logAutomaticDiscount(
    type: 'volume' | 'country',
    discountData: {
      customer_id?: string;
      quote_id?: string;
      order_id?: string;
      country?: string;
      order_total: number;
      discount_amount: number;
      discount_details: {
        rule_id?: string;
        tier_name?: string;
        percentage?: number;
        components_affected?: string[];
      };
      component_breakdown?: any;
    }
  ): Promise<void> {
    try {
      const logEntry: DiscountApplicationLog = {
        quote_id: discountData.quote_id,
        delivery_order_id: discountData.order_id,
        country_rule_id: type === 'country' ? discountData.discount_details.rule_id : undefined,
        discount_type_id: type === 'volume' ? discountData.discount_details.rule_id : undefined,
        application_type: type,
        customer_id: discountData.customer_id,
        customer_country: discountData.country,
        discount_amount: discountData.discount_amount,
        original_amount: discountData.order_total,
        component_breakdown: discountData.component_breakdown,
        conditions_met: {
          order_total_met: true,
          country_eligible: type === 'country' ? true : undefined,
          volume_tier_met: type === 'volume' ? true : undefined
        },
        metadata: {
          discount_name: discountData.discount_details.tier_name,
          discount_percentage: discountData.discount_details.percentage,
          components_affected: discountData.discount_details.components_affected,
          calculation_version: 'v2',
          automatic_trigger: true
        }
      };

      await this.logDiscountApplication(logEntry);

    } catch (error) {
      console.error('Failed to log automatic discount:', error);
    }
  }

  /**
   * Log discount abuse attempts or suspicious activity
   */
  async logSuspiciousActivity(
    activity: {
      type: 'rapid_attempts' | 'invalid_codes' | 'multiple_accounts' | 'unusual_pattern';
      customer_id?: string;
      ip_address?: string;
      user_agent?: string;
      details: {
        codes_attempted?: string[];
        attempt_count?: number;
        time_window?: string;
        [key: string]: any;
      };
      severity: 'low' | 'medium' | 'high';
    }
  ): Promise<void> {
    try {
      const suspiciousEntry = {
        id: crypto.randomUUID(),
        application_type: 'security_alert',
        customer_id: activity.customer_id,
        discount_amount: 0,
        original_amount: 0,
        conditions_met: {
          security_alert: true,
          activity_type: activity.type,
          severity: activity.severity
        },
        applied_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        metadata: {
          security_alert: true,
          activity_type: activity.type,
          severity: activity.severity,
          ip_address: activity.ip_address,
          user_agent: activity.user_agent,
          ...activity.details
        }
      };

      const { error } = await supabase
        .from('discount_application_log')
        .insert([suspiciousEntry]);

      if (error) {
        console.error('Error logging suspicious activity:', error);
      }

      // Always log security alerts to console
      console.warn(`🚨 Suspicious Discount Activity: ${activity.type}`, {
        severity: activity.severity,
        customer: activity.customer_id,
        details: activity.details
      });

    } catch (error) {
      console.error('Failed to log suspicious activity:', error);
    }
  }

  /**
   * Get discount usage analytics for a specific period
   */
  async getDiscountAnalytics(
    period: 'day' | 'week' | 'month' | 'year',
    startDate?: Date,
    endDate?: Date
  ): Promise<DiscountUsageAnalytics | null> {
    try {
      const end = endDate || new Date();
      const start = startDate || this.getStartDateForPeriod(period, end);

      // Get all discount applications in the period
      const { data: applications, error } = await supabase
        .from('discount_application_log')
        .select('*')
        .gte('applied_at', start.toISOString())
        .lte('applied_at', end.toISOString())
        .neq('application_type', 'validation')
        .neq('application_type', 'security_alert');

      if (error) {
        console.error('Error fetching discount analytics:', error);
        return null;
      }

      if (!applications) return null;

      // Calculate analytics
      const totalApplications = applications.length;
      const totalSavings = applications.reduce((sum, app) => sum + (app.discount_amount || 0), 0);
      const averageDiscount = totalApplications > 0 ? totalSavings / totalApplications : 0;

      // Top codes
      const codeUsage: { [key: string]: { count: number; savings: number } } = {};
      applications.forEach(app => {
        const code = app.metadata?.discount_code || 'Unknown';
        if (!codeUsage[code]) {
          codeUsage[code] = { count: 0, savings: 0 };
        }
        codeUsage[code].count++;
        codeUsage[code].savings += app.discount_amount || 0;
      });

      const topCodes = Object.entries(codeUsage)
        .map(([code, data]) => ({
          code,
          usage_count: data.count,
          total_savings: data.savings
        }))
        .sort((a, b) => b.usage_count - a.usage_count)
        .slice(0, 10);

      // Country breakdown
      const countryUsage: { [key: string]: { count: number; savings: number } } = {};
      applications.forEach(app => {
        const country = app.customer_country || 'Unknown';
        if (!countryUsage[country]) {
          countryUsage[country] = { count: 0, savings: 0 };
        }
        countryUsage[country].count++;
        countryUsage[country].savings += app.discount_amount || 0;
      });

      const countryBreakdown = Object.entries(countryUsage)
        .map(([country, data]) => ({
          country,
          usage_count: data.count,
          total_savings: data.savings
        }))
        .sort((a, b) => b.usage_count - a.usage_count);

      // Application types
      const typeUsage: { [key: string]: number } = {};
      applications.forEach(app => {
        const type = app.application_type || 'unknown';
        typeUsage[type] = (typeUsage[type] || 0) + 1;
      });

      const applicationTypes = Object.entries(typeUsage)
        .map(([type, count]) => ({
          type,
          count,
          percentage: (count / totalApplications) * 100
        }))
        .sort((a, b) => b.count - a.count);

      return {
        period,
        start_date: start,
        end_date: end,
        total_applications: totalApplications,
        total_savings: totalSavings,
        average_discount: averageDiscount,
        top_codes: topCodes,
        country_breakdown: countryBreakdown,
        application_types: applicationTypes
      };

    } catch (error) {
      console.error('Failed to get discount analytics:', error);
      return null;
    }
  }

  /**
   * Helper method to get start date for a period
   */
  private getStartDateForPeriod(period: string, endDate: Date): Date {
    const start = new Date(endDate);
    
    switch (period) {
      case 'day':
        start.setDate(start.getDate() - 1);
        break;
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        break;
    }
    
    return start;
  }

  /**
   * Clean up old logs (data retention)
   */
  async cleanupOldLogs(retentionDays: number = 365): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const { error } = await supabase
        .from('discount_application_log')
        .delete()
        .lt('created_at', cutoffDate.toISOString());

      if (error) {
        console.error('Error cleaning up old discount logs:', error);
      } else {
        console.log(`✅ Cleaned up discount logs older than ${retentionDays} days`);
      }

    } catch (error) {
      console.error('Failed to cleanup old logs:', error);
    }
  }

  /**
   * Export logs for analysis (CSV format)
   */
  async exportLogs(
    startDate: Date,
    endDate: Date,
    format: 'json' | 'csv' = 'csv'
  ): Promise<string | null> {
    try {
      const { data: logs, error } = await supabase
        .from('discount_application_log')
        .select('*')
        .gte('applied_at', startDate.toISOString())
        .lte('applied_at', endDate.toISOString())
        .order('applied_at', { ascending: false });

      if (error || !logs) {
        console.error('Error exporting logs:', error);
        return null;
      }

      if (format === 'json') {
        return JSON.stringify(logs, null, 2);
      }

      // CSV format
      const headers = [
        'Date',
        'Type',
        'Customer ID',
        'Country',
        'Discount Code',
        'Original Amount',
        'Discount Amount',
        'Quote ID',
        'Order ID'
      ];

      const rows = logs.map(log => [
        log.applied_at,
        log.application_type,
        log.customer_id || '',
        log.customer_country || '',
        log.metadata?.discount_code || '',
        log.original_amount || 0,
        log.discount_amount || 0,
        log.quote_id || '',
        log.delivery_order_id || ''
      ]);

      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      return csvContent;

    } catch (error) {
      console.error('Failed to export logs:', error);
      return null;
    }
  }
}