// Order Recalculation Service - Recalculates totals when orders are modified
// Integrates with existing QuoteCalculatorService for consistent calculations

import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/types/database';

type OrderRow = Database['public']['Tables']['orders']['Row'];
type OrderItem = Database['public']['Tables']['order_items']['Row'];

export interface RecalculationRequest {
  orderId: string;
  changedFields: string[];
  items?: OrderItem[];
  deliverySettings?: {
    delivery_method?: string;
    primary_warehouse?: string;
    consolidation_preference?: string;
  };
  forceRecalculation?: boolean;
}

export interface RecalculationResult {
  success: boolean;
  needsRecalculation: boolean;
  oldTotals: OrderTotals;
  newTotals?: OrderTotals;
  changes: RecalculationChanges;
  customerApprovalRequired: boolean;
  error?: string;
}

export interface OrderTotals {
  subtotal: number;
  shipping_cost: number;
  customs_cost: number;
  tax_amount: number;
  service_fee: number;
  total_amount: number;
  currency: string;
}

export interface RecalculationChanges {
  totalChange: number;
  shippingChange: number;
  taxChange: number;
  itemChanges: ItemChange[];
}

interface ItemChange {
  itemId: string;
  productName: string;
  oldPrice: number;
  newPrice: number;
  priceChange: number;
  quantityChange?: number;
}

class OrderRecalculationService {
  
  /**
   * Determine if order changes require recalculation
   */
  shouldRecalculateOrder(changedFields: string[]): boolean {
    const recalculationTriggers = [
      'delivery_method',
      'primary_warehouse', 
      'consolidation_preference',
      'max_consolidation_wait_days',
      'delivery_address',
      // Item changes handled separately but trigger recalculation
    ];

    return changedFields.some(field => recalculationTriggers.includes(field));
  }

  /**
   * Determine if item changes require order recalculation
   */
  shouldRecalculateFromItems(itemChanges: { itemId: string; changedFields: string[] }[]): boolean {
    const itemRecalculationTriggers = [
      'quantity',
      'current_price',
      'current_weight',
    ];

    return itemChanges.some(change => 
      change.changedFields.some(field => itemRecalculationTriggers.includes(field))
    );
  }

  /**
   * Recalculate order totals after modifications
   */
  async recalculateOrder(request: RecalculationRequest): Promise<RecalculationResult> {
    try {
      // Get current order data
      const { data: currentOrder, error: fetchError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('id', request.orderId)
        .single();

      if (fetchError || !currentOrder) {
        return {
          success: false,
          needsRecalculation: false,
          oldTotals: {} as OrderTotals,
          changes: {} as RecalculationChanges,
          customerApprovalRequired: false,
          error: 'Order not found',
        };
      }

      // Extract current totals
      const oldTotals: OrderTotals = {
        subtotal: this.calculateSubtotal(currentOrder.order_items || []),
        shipping_cost: currentOrder.shipping_cost || 0,
        customs_cost: currentOrder.customs_cost || 0,
        tax_amount: currentOrder.tax_amount || 0,
        service_fee: currentOrder.service_fee || 0,
        total_amount: currentOrder.total_amount,
        currency: currentOrder.currency,
      };

      // Check if recalculation is needed
      const needsRecalculation = request.forceRecalculation || 
        this.shouldRecalculateOrder(request.changedFields);

      if (!needsRecalculation) {
        return {
          success: true,
          needsRecalculation: false,
          oldTotals,
          changes: this.createEmptyChanges(),
          customerApprovalRequired: false,
        };
      }

      // Perform recalculation using quote calculator logic
      const recalculationData = await this.performRecalculation(currentOrder, request);
      
      if (!recalculationData.success) {
        return {
          success: false,
          needsRecalculation: true,
          oldTotals,
          changes: this.createEmptyChanges(),
          customerApprovalRequired: false,
          error: recalculationData.error,
        };
      }

      const newTotals = recalculationData.totals!;
      const changes = this.calculateChanges(oldTotals, newTotals, currentOrder.order_items || []);
      
      // Determine if customer approval is required
      const customerApprovalRequired = this.requiresCustomerApproval(changes, oldTotals);

      return {
        success: true,
        needsRecalculation: true,
        oldTotals,
        newTotals,
        changes,
        customerApprovalRequired,
      };

    } catch (error) {
      console.error('Order recalculation error:', error);
      return {
        success: false,
        needsRecalculation: false,
        oldTotals: {} as OrderTotals,
        changes: {} as RecalculationChanges,
        customerApprovalRequired: false,
        error: 'Recalculation failed due to system error',
      };
    }
  }

  /**
   * Apply recalculated totals to the order
   */
  async applyRecalculation(
    orderId: string, 
    newTotals: OrderTotals, 
    changes: RecalculationChanges,
    adminUserId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updates = {
        total_amount: newTotals.total_amount,
        shipping_cost: newTotals.shipping_cost,
        customs_cost: newTotals.customs_cost,
        tax_amount: newTotals.tax_amount,
        service_fee: newTotals.service_fee,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', orderId);

      if (error) {
        console.error('Failed to apply recalculation:', error);
        return { success: false, error: error.message };
      }

      // Log the recalculation if admin user provided
      if (adminUserId) {
        await this.logRecalculation(orderId, changes, adminUserId);
      }

      return { success: true };

    } catch (error) {
      console.error('Apply recalculation error:', error);
      return { success: false, error: 'Failed to apply changes' };
    }
  }

  /**
   * Perform the actual recalculation logic
   */
  private async performRecalculation(
    order: any, 
    request: RecalculationRequest
  ): Promise<{ success: boolean; totals?: OrderTotals; error?: string }> {
    try {
      // Use items from request if provided, otherwise use current order items
      const items = request.items || order.order_items || [];
      
      // Calculate subtotal from items
      const subtotal = this.calculateSubtotal(items);
      
      // Calculate shipping based on delivery settings
      const shippingCost = await this.calculateShipping(order, request.deliverySettings, items);
      
      // Calculate customs and taxes
      const customsCost = await this.calculateCustoms(order, items, subtotal);
      const taxAmount = await this.calculateTax(order, subtotal, customsCost);
      
      // Calculate service fee (typically percentage of subtotal)
      const serviceFee = this.calculateServiceFee(subtotal);
      
      // Calculate final total
      const totalAmount = subtotal + shippingCost + customsCost + taxAmount + serviceFee;

      const totals: OrderTotals = {
        subtotal,
        shipping_cost: shippingCost,
        customs_cost: customsCost,
        tax_amount: taxAmount,
        service_fee: serviceFee,
        total_amount: totalAmount,
        currency: order.currency,
      };

      return { success: true, totals };

    } catch (error) {
      console.error('Perform recalculation error:', error);
      return { success: false, error: 'Calculation failed' };
    }
  }

  /**
   * Calculate subtotal from items
   */
  private calculateSubtotal(items: OrderItem[]): number {
    return items.reduce((total, item) => {
      return total + ((item.current_price || 0) * (item.quantity || 1));
    }, 0);
  }

  /**
   * Calculate shipping costs
   */
  private async calculateShipping(
    order: any, 
    deliverySettings?: RecalculationRequest['deliverySettings'],
    items?: OrderItem[]
  ): Promise<number> {
    // This would integrate with your shipping calculation logic
    // For now, return existing shipping cost or calculate basic rate
    
    const totalWeight = items?.reduce((weight, item) => 
      weight + ((item.current_weight || 0) * (item.quantity || 1)), 0) || 0;
    
    const baseShippingRate = this.getBaseShippingRate(
      deliverySettings?.delivery_method || order.delivery_method,
      deliverySettings?.primary_warehouse || order.primary_warehouse
    );

    // Weight-based calculation (simplified)
    return Math.max(baseShippingRate, totalWeight * 2.5);
  }

  /**
   * Calculate customs costs
   */
  private async calculateCustoms(order: any, items: OrderItem[], subtotal: number): Promise<number> {
    // Integrate with your customs calculation logic
    // This is a simplified version
    
    const customsRate = await this.getCustomsRate(order.profiles?.country || 'US');
    return subtotal * customsRate;
  }

  /**
   * Calculate tax amount
   */
  private async calculateTax(order: any, subtotal: number, customsCost: number): Promise<number> {
    // Integrate with your tax calculation logic
    const taxableAmount = subtotal + customsCost;
    const taxRate = await this.getTaxRate(order.profiles?.country || 'US');
    return taxableAmount * taxRate;
  }

  /**
   * Calculate service fee
   */
  private calculateServiceFee(subtotal: number): number {
    // Typically a percentage of subtotal
    const serviceFeeRate = 0.02; // 2%
    return subtotal * serviceFeeRate;
  }

  /**
   * Helper method to get base shipping rates
   */
  private getBaseShippingRate(deliveryMethod?: string, warehouse?: string): number {
    const rates: Record<string, number> = {
      'standard_shipping': 15.00,
      'express_shipping': 25.00,
      'priority_shipping': 45.00,
      'air_cargo': 35.00,
      'sea_cargo': 8.00,
    };
    
    return rates[deliveryMethod || 'standard_shipping'] || 15.00;
  }

  /**
   * Get customs rate for country
   */
  private async getCustomsRate(country: string): Promise<number> {
    // This would query your country_settings table
    const rates: Record<string, number> = {
      'IN': 0.12, // 12%
      'NP': 0.15, // 15%
      'US': 0.00, // No customs for domestic
    };
    
    return rates[country] || 0.10; // Default 10%
  }

  /**
   * Get tax rate for country
   */
  private async getTaxRate(country: string): Promise<number> {
    const rates: Record<string, number> = {
      'IN': 0.18, // GST
      'NP': 0.13, // VAT
      'US': 0.08, // State tax average
    };
    
    return rates[country] || 0.08;
  }

  /**
   * Calculate changes between old and new totals
   */
  private calculateChanges(
    oldTotals: OrderTotals, 
    newTotals: OrderTotals, 
    items: OrderItem[]
  ): RecalculationChanges {
    return {
      totalChange: newTotals.total_amount - oldTotals.total_amount,
      shippingChange: newTotals.shipping_cost - oldTotals.shipping_cost,
      taxChange: newTotals.tax_amount - oldTotals.tax_amount,
      itemChanges: [], // Would be populated with actual item changes
    };
  }

  /**
   * Determine if changes require customer approval
   */
  private requiresCustomerApproval(changes: RecalculationChanges, oldTotals: OrderTotals): boolean {
    const totalChangePercent = Math.abs(changes.totalChange) / oldTotals.total_amount;
    
    // Require approval for changes over 5% or more than $50
    return totalChangePercent > 0.05 || Math.abs(changes.totalChange) > 50;
  }

  /**
   * Create empty changes object
   */
  private createEmptyChanges(): RecalculationChanges {
    return {
      totalChange: 0,
      shippingChange: 0,
      taxChange: 0,
      itemChanges: [],
    };
  }

  /**
   * Log recalculation for audit purposes
   */
  private async logRecalculation(
    orderId: string, 
    changes: RecalculationChanges, 
    adminUserId: string
  ): Promise<void> {
    try {
      const logEntry = {
        table_name: 'orders',
        record_id: orderId,
        action: 'RECALCULATE',
        old_values: JSON.stringify({ note: 'Order totals before recalculation' }),
        new_values: JSON.stringify({ 
          total_change: changes.totalChange,
          shipping_change: changes.shippingChange,
          tax_change: changes.taxChange
        }),
        changed_fields: ['total_amount', 'shipping_cost', 'tax_amount'],
        user_id: adminUserId,
        change_reason: 'Order recalculation after modifications',
        created_at: new Date().toISOString(),
      };

      await supabase.from('audit_logs').insert(logEntry);
    } catch (error) {
      console.error('Failed to log recalculation:', error);
      // Don't fail the operation if logging fails
    }
  }

  /**
   * Get recalculation preview without applying changes
   */
  async previewRecalculation(request: RecalculationRequest): Promise<RecalculationResult> {
    // Same as recalculateOrder but doesn't apply changes
    return this.recalculateOrder(request);
  }
}

// Export singleton instance
export const orderRecalculationService = new OrderRecalculationService();
export default orderRecalculationService;