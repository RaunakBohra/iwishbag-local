// Order Editing Service - Backend operations for order modifications
// Handles validation, business rules, audit logging, and recalculation for order changes

import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/types/database';
import { orderRecalculationService, type RecalculationRequest } from './OrderRecalculationService';

type OrderRow = Database['public']['Tables']['orders']['Row'];
type OrderUpdate = Database['public']['Tables']['orders']['Update'];

export interface OrderEditRequest {
  orderId: string;
  updates: OrderUpdate;
  adminUserId?: string;
  changeReason?: string;
}

export interface OrderEditResponse {
  success: boolean;
  updatedFields: string[];
  auditLogId?: string;
  recalculationPerformed?: boolean;
  recalculationChanges?: {
    totalChange: number;
    shippingChange: number;
    taxChange: number;
  };
  customerApprovalRequired?: boolean;
  error?: string;
}

export interface OrderValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

class OrderEditingService {
  /**
   * Validate order edit request before processing
   * Checks business rules and data consistency
   */
  async validateOrderEdit(orderId: string, updates: OrderUpdate): Promise<OrderValidationResult> {
    const result: OrderValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    try {
      // Get current order data
      const { data: currentOrder, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (fetchError || !currentOrder) {
        result.isValid = false;
        result.errors.push('Order not found or inaccessible');
        return result;
      }

      // Validation rules
      this.validateStatusTransitions(currentOrder, updates, result);
      this.validateFinancialChanges(currentOrder, updates, result);
      this.validateDeliverySettings(currentOrder, updates, result);
      this.validateBusinessRules(currentOrder, updates, result);

    } catch (error) {
      console.error('Order validation error:', error);
      result.isValid = false;
      result.errors.push('Validation failed due to system error');
    }

    return result;
  }

  /**
   * Update order with validation and audit logging
   */
  async updateOrder(request: OrderEditRequest): Promise<OrderEditResponse> {
    const { orderId, updates, adminUserId, changeReason } = request;

    try {
      // Step 1: Validate the changes
      const validation = await this.validateOrderEdit(orderId, updates);
      if (!validation.isValid) {
        return {
          success: false,
          updatedFields: [],
          error: validation.errors.join(', '),
        };
      }

      // Step 2: Get current order for comparison
      const { data: currentOrder, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (fetchError || !currentOrder) {
        return {
          success: false,
          updatedFields: [],
          error: 'Order not found',
        };
      }

      // Step 3: Identify changed fields
      const changedFields = this.identifyChangedFields(currentOrder, updates);
      
      if (changedFields.length === 0) {
        return {
          success: true,
          updatedFields: [],
        };
      }

      // Step 4: Check if recalculation is needed
      let recalculationResult;
      let recalculationPerformed = false;
      let customerApprovalRequired = false;

      if (orderRecalculationService.shouldRecalculateOrder(changedFields)) {
        const recalculationRequest: RecalculationRequest = {
          orderId,
          changedFields,
          deliverySettings: {
            delivery_method: updates.delivery_method,
            primary_warehouse: updates.primary_warehouse,
            consolidation_preference: updates.consolidation_preference,
          },
        };

        recalculationResult = await orderRecalculationService.recalculateOrder(recalculationRequest);
        
        if (recalculationResult.success && recalculationResult.needsRecalculation) {
          recalculationPerformed = true;
          customerApprovalRequired = recalculationResult.customerApprovalRequired;

          // Add recalculated totals to updates
          if (recalculationResult.newTotals) {
            Object.assign(updates, {
              total_amount: recalculationResult.newTotals.total_amount,
              shipping_cost: recalculationResult.newTotals.shipping_cost,
              customs_cost: recalculationResult.newTotals.customs_cost,
              tax_amount: recalculationResult.newTotals.tax_amount,
              service_fee: recalculationResult.newTotals.service_fee,
            });
            
            // Update changed fields to include recalculated fields
            changedFields.push('total_amount', 'shipping_cost', 'customs_cost', 'tax_amount', 'service_fee');
          }
        } else if (!recalculationResult.success) {
          console.warn('Order recalculation failed:', recalculationResult.error);
          // Continue with update but log the warning
        }
      }

      // Step 5: Apply updates with timestamp
      const finalUpdates = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('orders')
        .update(finalUpdates)
        .eq('id', orderId);

      if (updateError) {
        console.error('Order update error:', updateError);
        return {
          success: false,
          updatedFields: [],
          error: updateError.message,
        };
      }

      // Step 5: Create audit log entry
      let auditLogId: string | undefined;
      if (adminUserId) {
        auditLogId = await this.createAuditLog({
          orderId,
          adminUserId,
          changedFields,
          oldValues: currentOrder,
          newValues: finalUpdates,
          changeReason,
        });
      }

      // Step 6: Trigger notifications if needed
      await this.handleOrderChangeNotifications(orderId, changedFields, currentOrder);

      return {
        success: true,
        updatedFields: changedFields,
        auditLogId,
        recalculationPerformed,
        recalculationChanges: recalculationResult?.changes ? {
          totalChange: recalculationResult.changes.totalChange,
          shippingChange: recalculationResult.changes.shippingChange,
          taxChange: recalculationResult.changes.taxChange,
        } : undefined,
        customerApprovalRequired,
      };

    } catch (error) {
      console.error('Order update service error:', error);
      return {
        success: false,
        updatedFields: [],
        error: 'Failed to update order due to system error',
      };
    }
  }

  /**
   * Validate status transitions
   */
  private validateStatusTransitions(
    currentOrder: OrderRow,
    updates: OrderUpdate,
    result: OrderValidationResult
  ): void {
    const currentStatus = currentOrder.status;
    const newStatus = updates.status;

    if (newStatus && newStatus !== currentStatus) {
      // Define valid status transitions
      const validTransitions: Record<string, string[]> = {
        'pending_payment': ['paid', 'cancelled'],
        'paid': ['processing', 'cancelled'],
        'processing': ['seller_ordered', 'cancelled'],
        'seller_ordered': ['shipped', 'cancelled'],
        'shipped': ['delivered', 'cancelled'],
        'delivered': [], // Terminal state
        'cancelled': [], // Terminal state
      };

      const allowedNextStatuses = validTransitions[currentStatus] || [];
      
      if (!allowedNextStatuses.includes(newStatus)) {
        result.errors.push(
          `Invalid status transition from "${currentStatus}" to "${newStatus}"`
        );
        result.isValid = false;
      }

      // Special validation for cancelled orders
      if (newStatus === 'cancelled' && currentOrder.payment_status === 'paid') {
        result.warnings.push(
          'Cancelling a paid order may require refund processing'
        );
      }
    }
  }

  /**
   * Validate financial changes
   */
  private validateFinancialChanges(
    currentOrder: OrderRow,
    updates: OrderUpdate,
    result: OrderValidationResult
  ): void {
    // Check for manual adjustments
    if ('variance_amount' in updates && updates.variance_amount !== undefined) {
      const adjustment = updates.variance_amount;
      
      if (Math.abs(adjustment) > currentOrder.total_amount * 0.5) {
        result.warnings.push(
          'Large adjustment detected - verify this is intentional'
        );
      }
    }

    // Validate currency consistency
    if (updates.currency && updates.currency !== currentOrder.currency) {
      result.errors.push(
        'Currency changes require special handling and are not allowed through this interface'
      );
      result.isValid = false;
    }
  }

  /**
   * Validate delivery settings
   */
  private validateDeliverySettings(
    currentOrder: OrderRow,
    updates: OrderUpdate,
    result: OrderValidationResult
  ): void {
    // Validate consolidation wait days
    if (updates.max_consolidation_wait_days !== undefined) {
      const waitDays = updates.max_consolidation_wait_days;
      if (waitDays < 1 || waitDays > 30) {
        result.errors.push(
          'Consolidation wait days must be between 1 and 30'
        );
        result.isValid = false;
      }
    }

    // Validate warehouse changes for active orders
    if (updates.primary_warehouse && updates.primary_warehouse !== currentOrder.primary_warehouse) {
      if (['processing', 'seller_ordered'].includes(currentOrder.status)) {
        result.warnings.push(
          'Changing warehouse for active order may affect processing timeline'
        );
      }
    }
  }

  /**
   * Validate general business rules
   */
  private validateBusinessRules(
    currentOrder: OrderRow,
    updates: OrderUpdate,
    result: OrderValidationResult
  ): void {
    // Check if order is in a state that allows editing
    const editableStatuses = ['pending_payment', 'paid', 'processing'];
    if (!editableStatuses.includes(currentOrder.status)) {
      result.warnings.push(
        `Order is in "${currentOrder.status}" status - some changes may not take effect`
      );
    }

    // Validate automation settings
    if (updates.automation_enabled === false && currentOrder.automation_enabled === true) {
      if (currentOrder.status === 'processing') {
        result.warnings.push(
          'Disabling automation for processing order may require manual intervention'
        );
      }
    }
  }

  /**
   * Identify which fields have actually changed
   */
  private identifyChangedFields(currentOrder: OrderRow, updates: OrderUpdate): string[] {
    const changedFields: string[] = [];

    Object.keys(updates).forEach((key) => {
      const newValue = updates[key as keyof OrderUpdate];
      const currentValue = currentOrder[key as keyof OrderRow];
      
      if (newValue !== currentValue && newValue !== undefined) {
        changedFields.push(key);
      }
    });

    return changedFields;
  }

  /**
   * Create audit log entry for order changes
   */
  private async createAuditLog({
    orderId,
    adminUserId,
    changedFields,
    oldValues,
    newValues,
    changeReason,
  }: {
    orderId: string;
    adminUserId: string;
    changedFields: string[];
    oldValues: OrderRow;
    newValues: OrderUpdate;
    changeReason?: string;
  }): Promise<string | undefined> {
    try {
      const auditEntry = {
        table_name: 'orders',
        record_id: orderId,
        action: 'UPDATE',
        old_values: JSON.stringify(
          changedFields.reduce((obj, field) => ({
            ...obj,
            [field]: oldValues[field as keyof OrderRow],
          }), {})
        ),
        new_values: JSON.stringify(
          changedFields.reduce((obj, field) => ({
            ...obj,
            [field]: newValues[field as keyof OrderUpdate],
          }), {})
        ),
        changed_fields: changedFields,
        user_id: adminUserId,
        change_reason: changeReason || 'Admin order edit',
        created_at: new Date().toISOString(),
      };

      // Note: This assumes an audit_logs table exists
      // In a real implementation, you'd need to create this table
      const { data, error } = await supabase
        .from('audit_logs')
        .insert(auditEntry)
        .select()
        .single();

      if (error) {
        console.error('Audit log creation failed:', error);
        return undefined;
      }

      return data?.id;
    } catch (error) {
      console.error('Audit log error:', error);
      return undefined;
    }
  }

  /**
   * Handle notifications for order changes
   */
  private async handleOrderChangeNotifications(
    orderId: string,
    changedFields: string[],
    currentOrder: OrderRow
  ): Promise<void> {
    try {
      // Determine which changes require customer notification
      const notificationTriggers = [
        'status',
        'overall_status',
        'delivery_method',
        'primary_warehouse',
        'customer_notes',
      ];

      const requiresNotification = changedFields.some(field => 
        notificationTriggers.includes(field)
      );

      if (requiresNotification && currentOrder.customer_id) {
        // Queue customer notification
        // This could integrate with your existing notification system
        console.log(`Queuing notification for customer ${currentOrder.customer_id} about order ${orderId} changes:`, changedFields);
        
        // In a real implementation, you might:
        // - Send email notification
        // - Create in-app notification
        // - Send SMS for critical updates
        // - Log notification in a queue for batch processing
      }
    } catch (error) {
      console.error('Notification handling error:', error);
      // Don't fail the order update if notification fails
    }
  }

  /**
   * Get order edit history
   */
  async getOrderEditHistory(orderId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          *,
          user:user_id (
            full_name,
            email
          )
        `)
        .eq('record_id', orderId)
        .eq('table_name', 'orders')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch order edit history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Order edit history error:', error);
      return [];
    }
  }

  /**
   * Batch update multiple orders
   */
  async batchUpdateOrders(requests: OrderEditRequest[]): Promise<OrderEditResponse[]> {
    const results: OrderEditResponse[] = [];

    for (const request of requests) {
      const result = await this.updateOrder(request);
      results.push(result);
    }

    return results;
  }
}

// Export singleton instance
export const orderEditingService = new OrderEditingService();
export default orderEditingService;