/**
 * Admin Workflow Service
 * Handles admin-specific workflows, bulk operations, and quote management features
 * Extracted from QuoteCalculatorV2 for admin-focused functionality
 * 
 * RESPONSIBILITIES:
 * - Bulk quote operations and batch processing
 * - Advanced admin controls and overrides
 * - Quote approval and rejection workflows
 * - Template management and quick actions
 * - Admin reporting and analytics
 * - Customer communication automation
 * - System configuration and settings
 * - Advanced validation and error handling
 */

import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';
import { QuoteItem, CalculationInputs } from './QuoteCalculationService';
import { CustomerData, DeliveryAddress } from './CustomerManagementService';
import { ValidationResult } from './QuoteValidationService';

export interface AdminQuoteAction {
  action: AdminActionType;
  quoteIds: string[];
  reason?: string;
  adminNotes?: string;
  bulkUpdates?: Partial<QuoteUpdateData>;
  communicationTemplate?: string;
}

export enum AdminActionType {
  APPROVE = 'approve',
  REJECT = 'reject',
  REQUIRE_CLARIFICATION = 'require_clarification',
  BULK_UPDATE = 'bulk_update',
  DUPLICATE = 'duplicate',
  CONVERT_TO_TEMPLATE = 'convert_to_template',
  ARCHIVE = 'archive',
  RESTORE = 'restore',
  SEND_COMMUNICATION = 'send_communication',
  APPLY_DISCOUNT = 'apply_discount',
  UPDATE_PRIORITY = 'update_priority',
  ASSIGN_TO_ADMIN = 'assign_to_admin'
}

export interface QuoteUpdateData {
  status?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assigned_admin?: string;
  estimated_completion?: string;
  admin_notes?: string;
  customer_notes?: string;
  bulk_discount_percentage?: number;
  shipping_method_override?: string;
  custom_rates?: {
    shipping: number;
    customs: number;
    handling: number;
  };
}

export interface AdminDashboardData {
  pendingQuotes: number;
  reviewRequired: number;
  approved: number;
  rejected: number;
  totalValue: number;
  averageProcessingTime: number;
  topCustomers: CustomerSummary[];
  recentActivity: AdminActivity[];
  systemAlerts: SystemAlert[];
}

export interface CustomerSummary {
  id: string;
  name: string;
  email: string;
  totalQuotes: number;
  totalValue: number;
  averageValue: number;
  status: 'regular' | 'vip' | 'concern';
  lastQuoteDate: string;
}

export interface AdminActivity {
  id: string;
  admin_id: string;
  admin_name: string;
  action: string;
  quote_id?: string;
  customer_email?: string;
  timestamp: string;
  details: any;
}

export interface SystemAlert {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  created_at: string;
  resolved: boolean;
  affects_quotes: string[];
}

export interface BulkOperationResult {
  success: boolean;
  processed: number;
  failed: number;
  results: {
    quote_id: string;
    success: boolean;
    error?: string;
  }[];
  summary: string;
}

export interface QuoteTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  items: QuoteItem[];
  default_shipping: {
    origin_country: string;
    method: string;
  };
  admin_settings: {
    auto_approve: boolean;
    default_discount: number;
    priority: string;
  };
  usage_count: number;
  created_by: string;
  created_at: string;
}

export class AdminWorkflowService {
  private static instance: AdminWorkflowService;
  private adminCache = new Map<string, { data: any; timestamp: number }>();
  private readonly cacheTTL = 10 * 60 * 1000; // 10 minutes

  constructor() {
    logger.info('AdminWorkflowService initialized');
  }

  static getInstance(): AdminWorkflowService {
    if (!AdminWorkflowService.instance) {
      AdminWorkflowService.instance = new AdminWorkflowService();
    }
    return AdminWorkflowService.instance;
  }

  /**
   * Execute bulk admin action on multiple quotes
   */
  async executeBulkAction(action: AdminQuoteAction, adminId: string): Promise<BulkOperationResult> {
    try {
      logger.info(`Admin ${adminId} executing bulk action: ${action.action} on ${action.quoteIds.length} quotes`);

      const results: { quote_id: string; success: boolean; error?: string }[] = [];
      let processed = 0;
      let failed = 0;

      // Process each quote
      for (const quoteId of action.quoteIds) {
        try {
          const result = await this.executeSingleQuoteAction(quoteId, action, adminId);
          
          results.push({
            quote_id: quoteId,
            success: result.success,
            error: result.error
          });

          if (result.success) {
            processed++;
          } else {
            failed++;
          }

          // Log individual action
          await this.logAdminActivity({
            admin_id: adminId,
            action: action.action,
            quote_id: quoteId,
            details: {
              reason: action.reason,
              bulk_operation: true,
              result: result.success ? 'success' : 'failed'
            }
          });

        } catch (error) {
          failed++;
          results.push({
            quote_id: quoteId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });

          logger.error(`Failed to process quote ${quoteId}:`, error);
        }
      }

      // Send communications if specified
      if (action.communicationTemplate && processed > 0) {
        await this.sendBulkCommunications(action.quoteIds, action.communicationTemplate, adminId);
      }

      const operationResult: BulkOperationResult = {
        success: failed === 0,
        processed,
        failed,
        results,
        summary: `Processed ${processed} quotes successfully, ${failed} failed`
      };

      logger.info(`Bulk operation completed: ${operationResult.summary}`);
      return operationResult;

    } catch (error) {
      logger.error('Bulk operation failed:', error);
      return {
        success: false,
        processed: 0,
        failed: action.quoteIds.length,
        results: action.quoteIds.map(id => ({
          quote_id: id,
          success: false,
          error: error instanceof Error ? error.message : 'Bulk operation failed'
        })),
        summary: 'Bulk operation failed completely'
      };
    }
  }

  /**
   * Get admin dashboard data
   */
  async getAdminDashboard(adminId: string): Promise<AdminDashboardData> {
    try {
      const cacheKey = `dashboard-${adminId}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      // Get quote statistics
      const { data: quoteStats } = await supabase
        .from('quotes_v2')
        .select('status, total_usd, created_at, updated_at')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      // Calculate statistics
      const pendingQuotes = quoteStats?.filter(q => q.status === 'pending').length || 0;
      const reviewRequired = quoteStats?.filter(q => q.status === 'sent').length || 0;
      const approved = quoteStats?.filter(q => q.status === 'approved').length || 0;
      const rejected = quoteStats?.filter(q => q.status === 'rejected').length || 0;
      const totalValue = quoteStats?.reduce((sum, q) => sum + (q.total_usd || 0), 0) || 0;

      // Calculate average processing time
      const processedQuotes = quoteStats?.filter(q => 
        ['approved', 'rejected'].includes(q.status) && q.updated_at && q.created_at
      ) || [];
      
      const averageProcessingTime = processedQuotes.length > 0
        ? processedQuotes.reduce((sum, q) => {
            const created = new Date(q.created_at).getTime();
            const updated = new Date(q.updated_at).getTime();
            return sum + (updated - created);
          }, 0) / processedQuotes.length / (1000 * 60 * 60) // Convert to hours
        : 0;

      // Get top customers
      const topCustomers = await this.getTopCustomers();

      // Get recent admin activity
      const recentActivity = await this.getRecentAdminActivity(adminId);

      // Get system alerts
      const systemAlerts = await this.getSystemAlerts();

      const dashboardData: AdminDashboardData = {
        pendingQuotes,
        reviewRequired,
        approved,
        rejected,
        totalValue,
        averageProcessingTime,
        topCustomers,
        recentActivity,
        systemAlerts
      };

      // Cache the result
      this.setCache(cacheKey, dashboardData);

      return dashboardData;

    } catch (error) {
      logger.error('Failed to get admin dashboard:', error);
      throw error;
    }
  }

  /**
   * Create quote template from existing quote
   */
  async createQuoteTemplate(
    quoteId: string, 
    templateData: Partial<QuoteTemplate>,
    adminId: string
  ): Promise<QuoteTemplate> {
    try {
      // Get the source quote
      const { data: sourceQuote } = await supabase
        .from('quotes_v2')
        .select('*')
        .eq('id', quoteId)
        .single();

      if (!sourceQuote) {
        throw new Error('Source quote not found');
      }

      // Create template data
      const template: Omit<QuoteTemplate, 'id'> = {
        name: templateData.name || `Template from Quote ${sourceQuote.quote_number}`,
        description: templateData.description || `Generated from quote ${sourceQuote.quote_number}`,
        category: templateData.category || 'general',
        items: sourceQuote.items || [],
        default_shipping: {
          origin_country: sourceQuote.origin_country || 'US',
          method: sourceQuote.shipping_method || 'standard'
        },
        admin_settings: {
          auto_approve: templateData.admin_settings?.auto_approve || false,
          default_discount: templateData.admin_settings?.default_discount || 0,
          priority: templateData.admin_settings?.priority || 'medium'
        },
        usage_count: 0,
        created_by: adminId,
        created_at: new Date().toISOString()
      };

      // Save template to database
      const { data: savedTemplate, error } = await supabase
        .from('quote_templates')
        .insert(template)
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await this.logAdminActivity({
        admin_id: adminId,
        action: 'create_template',
        quote_id: quoteId,
        details: {
          template_id: savedTemplate.id,
          template_name: savedTemplate.name
        }
      });

      logger.info(`Quote template created: ${savedTemplate.name}`);
      return savedTemplate;

    } catch (error) {
      logger.error('Failed to create quote template:', error);
      throw error;
    }
  }

  /**
   * Apply quote template to create new quote
   */
  async applyQuoteTemplate(
    templateId: string,
    customerData: CustomerData,
    customizations?: Partial<CalculationInputs>
  ): Promise<string> {
    try {
      // Get template
      const { data: template } = await supabase
        .from('quote_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (!template) {
        throw new Error('Quote template not found');
      }

      // Create quote from template
      const quoteData = {
        items: customizations?.items || template.items,
        customer_data: {
          name: customerData.name,
          email: customerData.email,
          phone: customerData.phone,
          country: customerData.country
        },
        origin_country: template.default_shipping.origin_country,
        shipping_method: template.default_shipping.method,
        priority: template.admin_settings.priority,
        admin_notes: `Created from template: ${template.name}`,
        status: template.admin_settings.auto_approve ? 'approved' : 'pending',
        created_at: new Date().toISOString()
      };

      const { data: newQuote, error } = await supabase
        .from('quotes_v2')
        .insert(quoteData)
        .select()
        .single();

      if (error) throw error;

      // Update template usage count
      await supabase
        .from('quote_templates')
        .update({ usage_count: template.usage_count + 1 })
        .eq('id', templateId);

      logger.info(`Quote created from template ${template.name}: ${newQuote.id}`);
      return newQuote.id;

    } catch (error) {
      logger.error('Failed to apply quote template:', error);
      throw error;
    }
  }

  /**
   * Get advanced quote analytics
   */
  async getQuoteAnalytics(dateRange: { start: string; end: string }): Promise<any> {
    try {
      const { data: quotes } = await supabase
        .from('quotes_v2')
        .select('*')
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end);

      if (!quotes) return null;

      // Process analytics
      const analytics = {
        totalQuotes: quotes.length,
        totalValue: quotes.reduce((sum, q) => sum + (q.total_usd || 0), 0),
        averageValue: quotes.length > 0 ? quotes.reduce((sum, q) => sum + (q.total_usd || 0), 0) / quotes.length : 0,
        statusBreakdown: this.calculateStatusBreakdown(quotes),
        countryBreakdown: this.calculateCountryBreakdown(quotes),
        monthlyTrends: this.calculateMonthlyTrends(quotes),
        topItems: this.calculateTopItems(quotes),
        conversionRate: this.calculateConversionRate(quotes),
        averageProcessingTime: this.calculateAverageProcessingTime(quotes)
      };

      return analytics;

    } catch (error) {
      logger.error('Failed to get quote analytics:', error);
      throw error;
    }
  }

  /**
   * Validate admin permissions for action
   */
  async validateAdminPermission(adminId: string, action: AdminActionType, resourceId?: string): Promise<boolean> {
    try {
      // Get admin profile
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('role, permissions')
        .eq('id', adminId)
        .single();

      if (!adminProfile) {
        return false;
      }

      // Check role-based permissions
      const role = adminProfile.role;
      const permissions = adminProfile.permissions || {};

      switch (action) {
        case AdminActionType.APPROVE:
        case AdminActionType.REJECT:
          return role === 'admin' || permissions.can_approve_quotes;

        case AdminActionType.BULK_UPDATE:
          return role === 'admin' || permissions.can_bulk_edit;

        case AdminActionType.APPLY_DISCOUNT:
          return role === 'admin' || permissions.can_apply_discounts;

        case AdminActionType.SEND_COMMUNICATION:
          return role === 'admin' || permissions.can_communicate;

        case AdminActionType.CONVERT_TO_TEMPLATE:
          return role === 'admin' || permissions.can_manage_templates;

        default:
          return role === 'admin';
      }

    } catch (error) {
      logger.error('Permission validation failed:', error);
      return false;
    }
  }

  /**
   * Private helper methods
   */
  private async executeSingleQuoteAction(
    quoteId: string,
    action: AdminQuoteAction,
    adminId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
        updated_by: adminId
      };

      switch (action.action) {
        case AdminActionType.APPROVE:
          updateData.status = 'approved';
          updateData.approved_at = new Date().toISOString();
          updateData.approved_by = adminId;
          break;

        case AdminActionType.REJECT:
          updateData.status = 'rejected';
          updateData.rejected_at = new Date().toISOString();
          updateData.rejected_by = adminId;
          updateData.rejection_reason = action.reason;
          break;

        case AdminActionType.REQUIRE_CLARIFICATION:
          updateData.status = 'requires_clarification';
          updateData.clarification_notes = action.reason;
          break;

        case AdminActionType.BULK_UPDATE:
          if (action.bulkUpdates) {
            Object.assign(updateData, action.bulkUpdates);
          }
          break;

        case AdminActionType.APPLY_DISCOUNT:
          if (action.bulkUpdates?.bulk_discount_percentage) {
            updateData.admin_discount = action.bulkUpdates.bulk_discount_percentage;
            updateData.discount_reason = action.reason;
          }
          break;

        case AdminActionType.ARCHIVE:
          updateData.archived = true;
          updateData.archived_at = new Date().toISOString();
          break;

        case AdminActionType.RESTORE:
          updateData.archived = false;
          updateData.restored_at = new Date().toISOString();
          break;
      }

      if (action.adminNotes) {
        updateData.admin_notes = action.adminNotes;
      }

      // Update the quote
      const { error } = await supabase
        .from('quotes_v2')
        .update(updateData)
        .eq('id', quoteId);

      if (error) throw error;

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async logAdminActivity(activity: Omit<AdminActivity, 'id' | 'admin_name' | 'timestamp'>): Promise<void> {
    try {
      // Get admin name
      const { data: admin } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', activity.admin_id)
        .single();

      const activityData = {
        ...activity,
        admin_name: admin?.full_name || admin?.email || 'Unknown Admin',
        timestamp: new Date().toISOString()
      };

      await supabase
        .from('admin_activity_logs')
        .insert(activityData);

    } catch (error) {
      logger.error('Failed to log admin activity:', error);
    }
  }

  private async sendBulkCommunications(
    quoteIds: string[],
    templateName: string,
    adminId: string
  ): Promise<void> {
    try {
      // This would integrate with email service
      // For now, just log the action
      logger.info(`Sending bulk communications to ${quoteIds.length} quotes using template: ${templateName}`);

      // Add communication records
      const communications = quoteIds.map(quoteId => ({
        quote_id: quoteId,
        template_name: templateName,
        sent_by: adminId,
        sent_at: new Date().toISOString(),
        status: 'sent'
      }));

      await supabase
        .from('quote_communications')
        .insert(communications);

    } catch (error) {
      logger.error('Failed to send bulk communications:', error);
    }
  }

  private async getTopCustomers(): Promise<CustomerSummary[]> {
    try {
      const { data: customerStats } = await supabase
        .from('quotes_v2')
        .select('customer_data, total_usd, created_at')
        .not('customer_data', 'is', null)
        .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

      if (!customerStats) return [];

      // Group by customer email
      const customerMap = new Map<string, CustomerSummary>();

      customerStats.forEach(quote => {
        const email = quote.customer_data?.email;
        if (!email) return;

        if (!customerMap.has(email)) {
          customerMap.set(email, {
            id: email,
            name: quote.customer_data.name || 'Unknown',
            email,
            totalQuotes: 0,
            totalValue: 0,
            averageValue: 0,
            status: 'regular',
            lastQuoteDate: quote.created_at
          });
        }

        const customer = customerMap.get(email)!;
        customer.totalQuotes++;
        customer.totalValue += quote.total_usd || 0;
        
        if (new Date(quote.created_at) > new Date(customer.lastQuoteDate)) {
          customer.lastQuoteDate = quote.created_at;
        }
      });

      // Calculate averages and determine status
      const customers = Array.from(customerMap.values()).map(customer => ({
        ...customer,
        averageValue: customer.totalQuotes > 0 ? customer.totalValue / customer.totalQuotes : 0,
        status: customer.totalValue > 5000 ? 'vip' : 'regular'
      }));

      // Return top 10 by total value
      return customers
        .sort((a, b) => b.totalValue - a.totalValue)
        .slice(0, 10);

    } catch (error) {
      logger.error('Failed to get top customers:', error);
      return [];
    }
  }

  private async getRecentAdminActivity(adminId?: string): Promise<AdminActivity[]> {
    try {
      let query = supabase
        .from('admin_activity_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(20);

      if (adminId) {
        query = query.eq('admin_id', adminId);
      }

      const { data: activities } = await query;
      return activities || [];

    } catch (error) {
      logger.error('Failed to get recent admin activity:', error);
      return [];
    }
  }

  private async getSystemAlerts(): Promise<SystemAlert[]> {
    try {
      const { data: alerts } = await supabase
        .from('system_alerts')
        .select('*')
        .eq('resolved', false)
        .order('created_at', { ascending: false })
        .limit(10);

      return alerts || [];

    } catch (error) {
      logger.error('Failed to get system alerts:', error);
      return [];
    }
  }

  private calculateStatusBreakdown(quotes: any[]): Record<string, number> {
    const breakdown: Record<string, number> = {};
    
    quotes.forEach(quote => {
      const status = quote.status || 'unknown';
      breakdown[status] = (breakdown[status] || 0) + 1;
    });

    return breakdown;
  }

  private calculateCountryBreakdown(quotes: any[]): Record<string, number> {
    const breakdown: Record<string, number> = {};
    
    quotes.forEach(quote => {
      const country = quote.destination_country || 'unknown';
      breakdown[country] = (breakdown[country] || 0) + 1;
    });

    return breakdown;
  }

  private calculateMonthlyTrends(quotes: any[]): any[] {
    const monthlyData = new Map<string, { quotes: number; value: number }>();
    
    quotes.forEach(quote => {
      const month = new Date(quote.created_at).toISOString().slice(0, 7);
      
      if (!monthlyData.has(month)) {
        monthlyData.set(month, { quotes: 0, value: 0 });
      }
      
      const data = monthlyData.get(month)!;
      data.quotes++;
      data.value += quote.total_usd || 0;
    });

    return Array.from(monthlyData.entries()).map(([month, data]) => ({
      month,
      ...data
    }));
  }

  private calculateTopItems(quotes: any[]): any[] {
    const itemCounts = new Map<string, { count: number; totalValue: number }>();
    
    quotes.forEach(quote => {
      if (quote.items) {
        quote.items.forEach((item: any) => {
          const name = item.name || 'Unknown';
          
          if (!itemCounts.has(name)) {
            itemCounts.set(name, { count: 0, totalValue: 0 });
          }
          
          const data = itemCounts.get(name)!;
          data.count += item.quantity || 1;
          data.totalValue += (item.unit_price_usd || 0) * (item.quantity || 1);
        });
      }
    });

    return Array.from(itemCounts.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private calculateConversionRate(quotes: any[]): number {
    const total = quotes.length;
    const approved = quotes.filter(q => q.status === 'approved').length;
    
    return total > 0 ? (approved / total) * 100 : 0;
  }

  private calculateAverageProcessingTime(quotes: any[]): number {
    const processedQuotes = quotes.filter(q => 
      ['approved', 'rejected'].includes(q.status) && q.updated_at && q.created_at
    );

    if (processedQuotes.length === 0) return 0;

    const totalTime = processedQuotes.reduce((sum, quote) => {
      const created = new Date(quote.created_at).getTime();
      const updated = new Date(quote.updated_at).getTime();
      return sum + (updated - created);
    }, 0);

    return totalTime / processedQuotes.length / (1000 * 60 * 60); // Convert to hours
  }

  private getFromCache(key: string): any {
    const cached = this.adminCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }
    
    if (cached) {
      this.adminCache.delete(key);
    }
    
    return null;
  }

  private setCache(key: string, data: any): void {
    this.adminCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Public utility methods
   */
  clearAdminCache(): void {
    this.adminCache.clear();
    logger.info('Admin cache cleared');
  }

  dispose(): void {
    this.adminCache.clear();
    logger.info('AdminWorkflowService disposed');
  }
}

export default AdminWorkflowService;