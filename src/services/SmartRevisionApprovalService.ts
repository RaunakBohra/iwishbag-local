import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/types/database';

type OrderItem = Database['public']['Tables']['order_items']['Row'];
type ItemRevision = Database['public']['Tables']['item_revisions']['Row'];
type ItemRevisionInsert = Database['public']['Tables']['item_revisions']['Insert'];

interface RevisionData {
  order_item_id: string;
  change_type: 'price_increase' | 'price_decrease' | 'weight_increase' | 'weight_decrease' | 'both_increase' | 'both_decrease' | 'mixed_changes' | 'specification_change';
  change_reason: string;
  original_price?: number;
  new_price?: number;
  original_weight?: number;
  new_weight?: number;
  total_cost_impact: number;
  shipping_cost_impact?: number;
  customs_duty_impact?: number;
  admin_notes?: string;
  supporting_documents?: string[];
}

interface AutoApprovalThresholds {
  max_amount_usd: number;
  max_percentage: number;
  max_increase_amount: number;
  max_decrease_percentage: number;
  requires_management_approval_amount: number;
}

interface RevisionResult {
  success: boolean;
  revision_id?: string;
  auto_approved: boolean;
  requires_customer_approval: boolean;
  requires_management_approval: boolean;
  total_impact: number;
  approval_deadline?: string;
  error?: string;
}

interface ApprovalConfiguration {
  customer_thresholds: AutoApprovalThresholds;
  management_thresholds: AutoApprovalThresholds;
  notification_settings: {
    send_immediate_notifications: boolean;
    reminder_intervals_hours: number[];
    escalation_after_hours: number;
  };
}

class SmartRevisionApprovalService {
  private static instance: SmartRevisionApprovalService;
  private defaultConfig: ApprovalConfiguration = {
    customer_thresholds: {
      max_amount_usd: 25.00,
      max_percentage: 5.0,
      max_increase_amount: 50.00,
      max_decrease_percentage: 15.0,
      requires_management_approval_amount: 100.00,
    },
    management_thresholds: {
      max_amount_usd: 100.00,
      max_percentage: 15.0,
      max_increase_amount: 200.00,
      max_decrease_percentage: 25.0,
      requires_management_approval_amount: 500.00,
    },
    notification_settings: {
      send_immediate_notifications: true,
      reminder_intervals_hours: [24, 48],
      escalation_after_hours: 72,
    },
  };

  public static getInstance(): SmartRevisionApprovalService {
    if (!SmartRevisionApprovalService.instance) {
      SmartRevisionApprovalService.instance = new SmartRevisionApprovalService();
    }
    return SmartRevisionApprovalService.instance;
  }

  /**
   * Create and process item revision with smart auto-approval logic
   */
  async createRevision(revisionData: RevisionData): Promise<RevisionResult> {
    try {
      console.log(`Creating revision for order item ${revisionData.order_item_id}`);

      // 1. Get order item with current thresholds
      const orderItem = await this.getOrderItemWithThresholds(revisionData.order_item_id);
      if (!orderItem) {
        return { success: false, auto_approved: false, requires_customer_approval: false, requires_management_approval: false, total_impact: 0, error: 'Order item not found' };
      }

      // 2. Calculate comprehensive impact
      const impactAnalysis = await this.calculateRevisionImpact(orderItem, revisionData);

      // 3. Get approval configuration (could be customized per customer)
      const config = await this.getApprovalConfiguration(orderItem.order_id);

      // 4. Determine approval requirements
      const approvalDecision = this.determineApprovalRequirements(impactAnalysis, config);

      // 5. Create revision record
      const revision = await this.createRevisionRecord(revisionData, impactAnalysis, approvalDecision);
      if (!revision) {
        return { success: false, auto_approved: false, requires_customer_approval: false, requires_management_approval: false, total_impact: 0, error: 'Failed to create revision record' };
      }

      // 6. Update order item if auto-approved
      if (approvalDecision.auto_approved) {
        await this.applyAutoApprovedRevision(orderItem, revisionData, revision.id);
      }

      // 7. Queue notifications if needed
      if (approvalDecision.requires_customer_approval || approvalDecision.requires_management_approval) {
        await this.queueRevisionNotifications(revision, orderItem, approvalDecision);
      }

      // 8. Update order totals and counters
      await this.updateOrderImpact(orderItem.order_id, impactAnalysis);

      return {
        success: true,
        revision_id: revision.id,
        auto_approved: approvalDecision.auto_approved,
        requires_customer_approval: approvalDecision.requires_customer_approval,
        requires_management_approval: approvalDecision.requires_management_approval,
        total_impact: impactAnalysis.total_cost_impact,
        approval_deadline: approvalDecision.customer_approval_deadline,
      };
    } catch (error) {
      console.error('Error creating revision:', error);
      return {
        success: false,
        auto_approved: false,
        requires_customer_approval: false,
        requires_management_approval: false,
        total_impact: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get order item with current approval thresholds
   */
  private async getOrderItemWithThresholds(orderItemId: string): Promise<any> {
    const { data: orderItem, error } = await supabase
      .from('order_items')
      .select(`
        *,
        orders!inner (
          id,
          customer_id,
          currency,
          total_items,
          current_order_total
        )
      `)
      .eq('id', orderItemId)
      .single();

    if (error) {
      console.error('Error fetching order item:', error);
      return null;
    }

    return orderItem;
  }

  /**
   * Calculate comprehensive revision impact
   */
  private async calculateRevisionImpact(orderItem: any, revisionData: RevisionData): Promise<any> {
    const originalPrice = revisionData.original_price || orderItem.current_price;
    const newPrice = revisionData.new_price || orderItem.current_price;
    const originalWeight = revisionData.original_weight || orderItem.current_weight;
    const newWeight = revisionData.new_weight || orderItem.current_weight;

    const priceChange = newPrice - originalPrice;
    const priceChangePercentage = originalPrice > 0 ? (priceChange / originalPrice) * 100 : 0;
    const weightChange = newWeight - originalWeight;
    const weightChangePercentage = originalWeight > 0 ? (weightChange / originalWeight) * 100 : 0;

    // Recalculate shipping and customs impact based on new weight/price
    const shippingImpact = await this.calculateShippingImpact(orderItem, weightChange);
    const customsImpact = await this.calculateCustomsImpact(orderItem, priceChange);

    const totalCostImpact = revisionData.total_cost_impact || (priceChange + shippingImpact + customsImpact);

    return {
      price_change: priceChange,
      price_change_percentage: priceChangePercentage,
      weight_change: weightChange,
      weight_change_percentage: weightChangePercentage,
      shipping_cost_impact: shippingImpact,
      customs_duty_impact: customsImpact,
      total_cost_impact: totalCostImpact,
      absolute_impact: Math.abs(totalCostImpact),
      impact_percentage: orderItem.current_price > 0 ? (Math.abs(totalCostImpact) / orderItem.current_price) * 100 : 0,
    };
  }

  /**
   * Calculate shipping cost impact from weight changes
   */
  private async calculateShippingImpact(orderItem: any, weightChange: number): Promise<number> {
    if (Math.abs(weightChange) < 0.1) return 0; // Ignore minimal weight changes
    
    // Simplified shipping calculation - $5 per kg increase
    const shippingRatePerKg = 5.00;
    return weightChange * shippingRatePerKg;
  }

  /**
   * Calculate customs duty impact from price changes
   */
  private async calculateCustomsImpact(orderItem: any, priceChange: number): Promise<number> {
    if (Math.abs(priceChange) < 1.0) return 0; // Ignore minimal price changes
    
    // Simplified customs calculation - 15% duty rate
    const dutyRate = 0.15;
    return priceChange * dutyRate;
  }

  /**
   * Get approval configuration for order/customer
   */
  private async getApprovalConfiguration(orderId: string): Promise<ApprovalConfiguration> {
    // For now, return default config. Later can be customized per customer
    return this.defaultConfig;
  }

  /**
   * Determine approval requirements based on impact and thresholds
   */
  private determineApprovalRequirements(impactAnalysis: any, config: ApprovalConfiguration): any {
    const { absolute_impact, impact_percentage, total_cost_impact } = impactAnalysis;
    const thresholds = config.customer_thresholds;
    const mgmtThresholds = config.management_thresholds;

    // Check for auto-approval eligibility
    const withinAmountThreshold = absolute_impact <= thresholds.max_amount_usd;
    const withinPercentageThreshold = impact_percentage <= thresholds.max_percentage;
    
    // Special handling for decreases (more lenient)
    const isDecrease = total_cost_impact < 0;
    const decreaseWithinThreshold = isDecrease && impact_percentage <= thresholds.max_decrease_percentage;
    
    // Check for management approval requirement
    const requiresManagement = absolute_impact >= thresholds.requires_management_approval_amount ||
                              impact_percentage >= mgmtThresholds.max_percentage;

    const autoApprovalEligible = (withinAmountThreshold && withinPercentageThreshold) || decreaseWithinThreshold;

    // Determine approval path
    const auto_approved = autoApprovalEligible && !requiresManagement;
    const requires_customer_approval = !auto_approved && !requiresManagement;
    const requires_management_approval = requiresManagement;

    // Set deadlines
    const customer_approval_deadline = requires_customer_approval 
      ? new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() // 48 hours
      : null;

    const auto_approval_reason = auto_approved 
      ? `Within thresholds: $${absolute_impact.toFixed(2)} ≤ $${thresholds.max_amount_usd}, ${impact_percentage.toFixed(1)}% ≤ ${thresholds.max_percentage}%`
      : null;

    return {
      auto_approved,
      requires_customer_approval,
      requires_management_approval,
      customer_approval_deadline,
      auto_approval_reason,
    };
  }

  /**
   * Create revision record in database
   */
  private async createRevisionRecord(
    revisionData: RevisionData, 
    impactAnalysis: any, 
    approvalDecision: any
  ): Promise<ItemRevision | null> {
    const revisionInsert: ItemRevisionInsert = {
      order_item_id: revisionData.order_item_id,
      change_type: revisionData.change_type,
      change_reason: revisionData.change_reason,
      original_price: revisionData.original_price,
      new_price: revisionData.new_price,
      original_weight: revisionData.original_weight,
      new_weight: revisionData.new_weight,
      total_cost_impact: impactAnalysis.total_cost_impact,
      shipping_cost_impact: impactAnalysis.shipping_cost_impact,
      customs_duty_impact: impactAnalysis.customs_duty_impact,
      auto_approval_eligible: approvalDecision.auto_approved,
      auto_approved: approvalDecision.auto_approved,
      auto_approval_reason: approvalDecision.auto_approval_reason,
      customer_approval_status: approvalDecision.auto_approved ? 'auto_approved' : 'pending',
      customer_approval_deadline: approvalDecision.customer_approval_deadline,
      requires_management_approval: approvalDecision.requires_management_approval,
      admin_notes: revisionData.admin_notes,
    };

    const { data: revision, error } = await supabase
      .from('item_revisions')
      .insert(revisionInsert)
      .select('*')
      .single();

    if (error) {
      console.error('Error creating revision record:', error);
      return null;
    }

    return revision;
  }

  /**
   * Apply auto-approved revision to order item
   */
  private async applyAutoApprovedRevision(
    orderItem: any, 
    revisionData: RevisionData, 
    revisionId: string
  ): Promise<void> {
    const updateData: any = {
      item_status: 'revision_approved',
      variance_auto_approved: true,
      updated_at: new Date().toISOString(),
    };

    if (revisionData.new_price !== undefined) {
      updateData.current_price = revisionData.new_price;
      updateData.price_variance = revisionData.new_price - orderItem.current_price;
    }

    if (revisionData.new_weight !== undefined) {
      updateData.current_weight = revisionData.new_weight;
      updateData.weight_variance = revisionData.new_weight - orderItem.current_weight;
    }

    updateData.total_variance = revisionData.total_cost_impact;

    const { error } = await supabase
      .from('order_items')
      .update(updateData)
      .eq('id', orderItem.id);

    if (error) {
      console.error('Error applying auto-approved revision:', error);
    } else {
      console.log(`Auto-approved revision ${revisionId} applied to item ${orderItem.id}`);
    }
  }

  /**
   * Queue notification tasks for pending revisions
   */
  private async queueRevisionNotifications(
    revision: ItemRevision, 
    orderItem: any, 
    approvalDecision: any
  ): Promise<void> {
    try {
      // Mark order item as requiring customer approval
      if (approvalDecision.requires_customer_approval) {
        await supabase
          .from('order_items')
          .update({
            requires_customer_approval: true,
            item_status: 'revision_pending',
          })
          .eq('id', orderItem.id);
      }

      // TODO: Queue email/SMS notifications
      // This would integrate with your notification service
      console.log(`Queued notifications for revision ${revision.id}`);
    } catch (error) {
      console.error('Error queuing revision notifications:', error);
    }
  }

  /**
   * Update order totals and counters after revision
   */
  private async updateOrderImpact(orderId: string, impactAnalysis: any): Promise<void> {
    try {
      // Get current order totals
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('current_order_total, variance_amount')
        .eq('id', orderId)
        .single();

      if (orderError || !order) {
        console.error('Error fetching order for impact update:', orderError);
        return;
      }

      // Update order with new totals
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          current_order_total: order.current_order_total + impactAnalysis.total_cost_impact,
          variance_amount: order.variance_amount + impactAnalysis.total_cost_impact,
        })
        .eq('id', orderId);

      if (updateError) {
        console.error('Error updating order totals:', updateError);
      }
    } catch (error) {
      console.error('Error in updateOrderImpact:', error);
    }
  }

  /**
   * Process customer response to revision
   */
  async processCustomerResponse(
    revisionId: string, 
    response: 'approved' | 'rejected', 
    customerNotes?: string
  ): Promise<{success: boolean; error?: string}> {
    try {
      const { data: revision, error: revisionError } = await supabase
        .from('item_revisions')
        .select(`
          *,
          order_items!inner (
            *,
            orders!inner (
              id,
              customer_id
            )
          )
        `)
        .eq('id', revisionId)
        .single();

      if (revisionError || !revision) {
        return { success: false, error: 'Revision not found' };
      }

      // Update revision with customer response
      const { error: updateError } = await supabase
        .from('item_revisions')
        .update({
          customer_approval_status: response,
          customer_response_notes: customerNotes,
          customer_responded_at: new Date().toISOString(),
        })
        .eq('id', revisionId);

      if (updateError) {
        return { success: false, error: 'Failed to update revision' };
      }

      // Apply changes if approved
      if (response === 'approved') {
        await this.applyCustomerApprovedRevision(revision);
      } else {
        await this.handleRejectedRevision(revision);
      }

      return { success: true };
    } catch (error) {
      console.error('Error processing customer response:', error);
      return { success: false, error: 'Processing error' };
    }
  }

  /**
   * Apply customer-approved revision
   */
  private async applyCustomerApprovedRevision(revision: any): Promise<void> {
    const orderItem = revision.order_items;
    
    const updateData: any = {
      item_status: 'revision_approved',
      requires_customer_approval: false,
    };

    if (revision.new_price !== null) {
      updateData.current_price = revision.new_price;
      updateData.price_variance = revision.new_price - orderItem.original_price;
    }

    if (revision.new_weight !== null) {
      updateData.current_weight = revision.new_weight;
      updateData.weight_variance = revision.new_weight - orderItem.original_weight;
    }

    updateData.total_variance = revision.total_cost_impact;

    const { error } = await supabase
      .from('order_items')
      .update(updateData)
      .eq('id', orderItem.id);

    if (error) {
      console.error('Error applying customer-approved revision:', error);
    }
  }

  /**
   * Handle rejected revision
   */
  private async handleRejectedRevision(revision: any): Promise<void> {
    // Update order item status back to previous state
    const { error } = await supabase
      .from('order_items')
      .update({
        item_status: 'pending_order_placement',
        requires_customer_approval: false,
      })
      .eq('id', revision.order_item_id);

    if (error) {
      console.error('Error handling rejected revision:', error);
    }

    // TODO: Create exception or alternative sourcing task
  }

  /**
   * Get pending revisions requiring customer approval
   */
  async getPendingRevisions(customerId: string): Promise<any[]> {
    const { data: revisions, error } = await supabase
      .from('item_revisions')
      .select(`
        *,
        order_items!inner (
          *,
          orders!inner (
            id,
            order_number,
            customer_id
          )
        )
      `)
      .eq('customer_approval_status', 'pending')
      .eq('order_items.orders.customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching pending revisions:', error);
      return [];
    }

    return revisions || [];
  }
}

export default SmartRevisionApprovalService;