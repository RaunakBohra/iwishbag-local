import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface AuditMetadata {
  reason?: string;
  [key: string]: any;
}

/**
 * Client-side audit logging utility
 * 
 * Use this to manually log important admin actions from the frontend
 * Note: Critical operations are automatically logged by database triggers
 */
export class AuditLogger {
  /**
   * Log a manual audit event
   */
  static async log(
    action: string,
    category: 'auth' | 'user_management' | 'quote' | 'payment' | 'order' | 
             'customer' | 'settings' | 'data_export' | 'data_deletion' | 'security',
    resourceType?: string,
    resourceId?: string,
    metadata?: AuditMetadata
  ): Promise<void> {
    try {
      const { error } = await supabase.rpc('log_audit_event', {
        p_action: action,
        p_action_category: category,
        p_resource_type: resourceType,
        p_resource_id: resourceId,
        p_metadata: metadata
      });

      if (error) {
        logger.error('Failed to log audit event:', error);
      } else {
        logger.debug('Audit event logged:', { action, category });
      }
    } catch (err) {
      logger.error('Exception in audit logging:', err);
    }
  }

  /**
   * Log a quote action
   */
  static async logQuoteAction(
    action: 'approve' | 'reject' | 'send' | 'recalculate' | 'export',
    quoteId: string,
    metadata?: AuditMetadata
  ): Promise<void> {
    await this.log(
      `quote_${action}`,
      'quote',
      'quotes',
      quoteId,
      metadata
    );
  }

  /**
   * Log a user management action
   */
  static async logUserAction(
    action: 'role_change' | 'disable' | 'enable' | 'delete' | 'invite',
    userId: string,
    metadata?: AuditMetadata
  ): Promise<void> {
    await this.log(
      `user_${action}`,
      'user_management',
      'users',
      userId,
      metadata
    );
  }

  /**
   * Log a payment action
   */
  static async logPaymentAction(
    action: 'create_link' | 'verify' | 'refund' | 'cancel',
    paymentId: string,
    metadata?: AuditMetadata
  ): Promise<void> {
    await this.log(
      `payment_${action}`,
      'payment',
      'payments',
      paymentId,
      metadata
    );
  }

  /**
   * Log a settings change
   */
  static async logSettingsChange(
    settingType: string,
    settingId: string,
    oldValue: any,
    newValue: any,
    metadata?: AuditMetadata
  ): Promise<void> {
    await this.log(
      `update_${settingType}`,
      'settings',
      settingType,
      settingId,
      {
        ...metadata,
        old_value: oldValue,
        new_value: newValue
      }
    );
  }

  /**
   * Log data export
   */
  static async logDataExport(
    exportType: string,
    recordCount: number,
    filters?: any
  ): Promise<void> {
    await this.log(
      `export_${exportType}`,
      'data_export',
      exportType,
      undefined,
      {
        record_count: recordCount,
        filters,
        exported_at: new Date().toISOString()
      }
    );
  }

  /**
   * Log security event
   */
  static async logSecurityEvent(
    event: string,
    details: any
  ): Promise<void> {
    await this.log(
      event,
      'security',
      undefined,
      undefined,
      details
    );
  }
}

// Export convenience functions
export const auditLog = AuditLogger.log.bind(AuditLogger);
export const auditQuoteAction = AuditLogger.logQuoteAction.bind(AuditLogger);
export const auditUserAction = AuditLogger.logUserAction.bind(AuditLogger);
export const auditPaymentAction = AuditLogger.logPaymentAction.bind(AuditLogger);
export const auditSettingsChange = AuditLogger.logSettingsChange.bind(AuditLogger);
export const auditDataExport = AuditLogger.logDataExport.bind(AuditLogger);
export const auditSecurityEvent = AuditLogger.logSecurityEvent.bind(AuditLogger);