/**
 * Intelligent Workflow Automation Service
 * 
 * Automates common business processes and workflows using AI-driven decisions
 * and rule-based automation. Integrates with Master Service Orchestrator
 * for coordinated cross-service operations.
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import * as Sentry from '@sentry/react';
import { masterServiceOrchestrator, type ServiceOperation } from '@/services/MasterServiceOrchestrator';
import { unifiedUserContextService, type UnifiedUserProfile } from '@/services/UnifiedUserContextService';
import { enhancedSupportService } from '@/services/EnhancedSupportService';

// ============================================================================
// WORKFLOW AUTOMATION TYPES
// ============================================================================

export type WorkflowTrigger = 
  | 'quote_created' 
  | 'quote_approved' 
  | 'payment_completed' 
  | 'package_received' 
  | 'consolidation_ready'
  | 'storage_threshold_reached'
  | 'support_ticket_created'
  | 'user_inactive'
  | 'order_delayed';

export type WorkflowAction = 
  | 'send_notification' 
  | 'create_quote' 
  | 'approve_quote' 
  | 'consolidate_packages'
  | 'calculate_fees'
  | 'assign_support_ticket'
  | 'escalate_ticket'
  | 'offer_discount'
  | 'request_feedback';

export interface WorkflowRule {
  id: string;
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  conditions: WorkflowCondition[];
  actions: WorkflowActionConfig[];
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'not_in';
  value: any;
  type: 'user' | 'quote' | 'package' | 'order' | 'custom';
}

export interface WorkflowActionConfig {
  action: WorkflowAction;
  parameters: Record<string, any>;
  delay_minutes?: number;
  conditional?: WorkflowCondition[];
}

export interface WorkflowExecution {
  id: string;
  rule_id: string;
  trigger_data: any;
  user_context: any;
  actions_executed: number;
  actions_failed: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  error_message?: string;
}

// ============================================================================
// INTELLIGENT WORKFLOW SERVICE
// ============================================================================

class IntelligentWorkflowService {
  private static instance: IntelligentWorkflowService;
  private workflowRules = new Map<WorkflowTrigger, WorkflowRule[]>();
  private executionQueue: WorkflowExecution[] = [];
  private isProcessing = false;

  private constructor() {
    this.initializeDefaultRules();
    this.startProcessingLoop();
  }

  public static getInstance(): IntelligentWorkflowService {
    if (!IntelligentWorkflowService.instance) {
      IntelligentWorkflowService.instance = new IntelligentWorkflowService();
    }
    return IntelligentWorkflowService.instance;
  }

  // ============================================================================
  // WORKFLOW RULE MANAGEMENT
  // ============================================================================

  /**
   * Initialize default workflow rules
   */
  private initializeDefaultRules(): void {
    const defaultRules: WorkflowRule[] = [
      // Quote Automation
      {
        id: 'auto-approve-small-quotes',
        name: 'Auto-approve Small Quotes',
        description: 'Automatically approve quotes under $100 for VIP customers',
        trigger: 'quote_created',
        conditions: [
          { field: 'total_amount_usd', operator: 'less_than', value: 100, type: 'quote' },
          { field: 'customer_segment', operator: 'equals', value: 'vip', type: 'user' }
        ],
        actions: [
          {
            action: 'approve_quote',
            parameters: { auto_approved: true, reason: 'VIP customer - small amount' }
          },
          {
            action: 'send_notification',
            parameters: {
              type: 'quote_auto_approved',
              message: 'Your quote has been automatically approved! Proceed to payment.'
            }
          }
        ],
        priority: 1,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },

      // Package Automation
      {
        id: 'auto-consolidate-ready-packages',
        name: 'Auto-consolidate Ready Packages',
        description: 'Automatically consolidate packages when customer has 3+ items',
        trigger: 'package_received',
        conditions: [
          { field: 'packages_in_warehouse', operator: 'greater_than', value: 2, type: 'user' },
          { field: 'auto_consolidation_enabled', operator: 'equals', value: true, type: 'user' }
        ],
        actions: [
          {
            action: 'consolidate_packages',
            parameters: { auto_consolidation: true }
          },
          {
            action: 'send_notification',
            parameters: {
              type: 'auto_consolidation_started',
              message: 'Your packages are being automatically consolidated for shipping.'
            }
          }
        ],
        priority: 2,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },

      // Storage Fee Automation
      {
        id: 'storage-fee-alert',
        name: 'Storage Fee Alert',
        description: 'Alert customers when storage fees are accumulating',
        trigger: 'storage_threshold_reached',
        conditions: [
          { field: 'days_in_storage', operator: 'greater_than', value: 7, type: 'package' }
        ],
        actions: [
          {
            action: 'calculate_fees',
            parameters: { fee_type: 'storage' }
          },
          {
            action: 'send_notification',
            parameters: {
              type: 'storage_fee_alert',
              message: 'Your packages have been in storage for over 7 days. Storage fees may apply.'
            }
          }
        ],
        priority: 3,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },

      // Support Automation
      {
        id: 'auto-assign-support-tickets',
        name: 'Auto-assign Support Tickets',
        description: 'Automatically assign support tickets based on category and priority',
        trigger: 'support_ticket_created',
        conditions: [
          { field: 'category', operator: 'in', value: ['package_issue', 'quote_inquiry'], type: 'custom' }
        ],
        actions: [
          {
            action: 'assign_support_ticket',
            parameters: { assignment_strategy: 'category_specialist' }
          }
        ],
        priority: 1,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },

      // Customer Retention
      {
        id: 'inactive-user-engagement',
        name: 'Inactive User Engagement',
        description: 'Re-engage users who have been inactive for 30+ days',
        trigger: 'user_inactive',
        conditions: [
          { field: 'days_since_last_login', operator: 'greater_than', value: 30, type: 'user' },
          { field: 'total_orders', operator: 'greater_than', value: 0, type: 'user' }
        ],
        actions: [
          {
            action: 'offer_discount',
            parameters: { discount_percentage: 10, validity_days: 14 }
          },
          {
            action: 'send_notification',
            parameters: {
              type: 'welcome_back_offer',
              message: 'We miss you! Here\'s a 10% discount on your next order.'
            }
          }
        ],
        priority: 4,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    // Group rules by trigger
    defaultRules.forEach(rule => {
      if (!this.workflowRules.has(rule.trigger)) {
        this.workflowRules.set(rule.trigger, []);
      }
      this.workflowRules.get(rule.trigger)!.push(rule);
    });

    // Sort by priority
    this.workflowRules.forEach((rules, trigger) => {
      rules.sort((a, b) => a.priority - b.priority);
    });

    logger.info('Initialized workflow automation with default rules', {
      total_rules: defaultRules.length,
      triggers: Array.from(this.workflowRules.keys())
    });
  }

  // ============================================================================
  // WORKFLOW EXECUTION
  // ============================================================================

  /**
   * Trigger workflow execution based on event
   */
  async triggerWorkflow(
    trigger: WorkflowTrigger,
    triggerData: any,
    userId?: string
  ): Promise<void> {
    try {
      // Get applicable rules for this trigger
      const rules = this.workflowRules.get(trigger) || [];
      if (rules.length === 0) return;

      // Get user context if available
      let userContext: UnifiedUserProfile | null = null;
      if (userId) {
        userContext = await unifiedUserContextService.getUserContext(userId);
      }

      // Evaluate each rule
      for (const rule of rules) {
        if (!rule.is_active) continue;

        const shouldExecute = await this.evaluateConditions(
          rule.conditions,
          triggerData,
          userContext
        );

        if (shouldExecute) {
          await this.queueWorkflowExecution(rule, triggerData, userContext);
        }
      }
    } catch (error) {
      this.handleError('triggerWorkflow', error, { trigger, userId });
    }
  }

  /**
   * Evaluate workflow conditions
   */
  private async evaluateConditions(
    conditions: WorkflowCondition[],
    triggerData: any,
    userContext: UnifiedUserProfile | null
  ): Promise<boolean> {
    try {
      // All conditions must be true (AND logic)
      for (const condition of conditions) {
        const value = this.extractConditionValue(condition, triggerData, userContext);
        const isMatch = this.evaluateCondition(condition, value);
        
        if (!isMatch) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      logger.error('Failed to evaluate workflow conditions', { error, conditions });
      return false;
    }
  }

  /**
   * Extract value for condition evaluation
   */
  private extractConditionValue(
    condition: WorkflowCondition,
    triggerData: any,
    userContext: UnifiedUserProfile | null
  ): any {
    switch (condition.type) {
      case 'user':
        if (!userContext) return null;
        return this.getNestedValue(userContext, condition.field);
      
      case 'quote':
      case 'package':
      case 'order':
        return this.getNestedValue(triggerData, condition.field);
      
      case 'custom':
        return triggerData[condition.field];
      
      default:
        return null;
    }
  }

  /**
   * Evaluate individual condition
   */
  private evaluateCondition(condition: WorkflowCondition, actualValue: any): boolean {
    const { operator, value: expectedValue } = condition;

    switch (operator) {
      case 'equals':
        return actualValue === expectedValue;
      
      case 'not_equals':
        return actualValue !== expectedValue;
      
      case 'greater_than':
        return Number(actualValue) > Number(expectedValue);
      
      case 'less_than':
        return Number(actualValue) < Number(expectedValue);
      
      case 'contains':
        return String(actualValue).toLowerCase().includes(String(expectedValue).toLowerCase());
      
      case 'in':
        return Array.isArray(expectedValue) && expectedValue.includes(actualValue);
      
      case 'not_in':
        return Array.isArray(expectedValue) && !expectedValue.includes(actualValue);
      
      default:
        return false;
    }
  }

  /**
   * Queue workflow execution
   */
  private async queueWorkflowExecution(
    rule: WorkflowRule,
    triggerData: any,
    userContext: UnifiedUserProfile | null
  ): Promise<void> {
    const execution: WorkflowExecution = {
      id: `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      rule_id: rule.id,
      trigger_data: triggerData,
      user_context: userContext,
      actions_executed: 0,
      actions_failed: 0,
      status: 'pending',
      started_at: new Date().toISOString()
    };

    this.executionQueue.push(execution);

    logger.info('Queued workflow execution', {
      execution_id: execution.id,
      rule_name: rule.name,
      trigger: rule.trigger,
      actions_count: rule.actions.length
    });
  }

  /**
   * Process workflow execution queue
   */
  private startProcessingLoop(): void {
    setInterval(async () => {
      if (this.isProcessing || this.executionQueue.length === 0) {
        return;
      }

      this.isProcessing = true;
      
      try {
        while (this.executionQueue.length > 0) {
          const execution = this.executionQueue.shift()!;
          await this.executeWorkflow(execution);
        }
      } finally {
        this.isProcessing = false;
      }
    }, 1000); // Process every second
  }

  /**
   * Execute individual workflow
   */
  private async executeWorkflow(execution: WorkflowExecution): Promise<void> {
    try {
      execution.status = 'in_progress';
      
      // Get the rule for this execution
      const rule = this.findRuleById(execution.rule_id);
      if (!rule) {
        throw new Error(`Workflow rule not found: ${execution.rule_id}`);
      }

      // Execute each action
      for (const actionConfig of rule.actions) {
        try {
          // Apply delay if specified
          if (actionConfig.delay_minutes && actionConfig.delay_minutes > 0) {
            await this.delay(actionConfig.delay_minutes * 60 * 1000);
          }

          // Check conditional actions
          if (actionConfig.conditional) {
            const shouldExecute = await this.evaluateConditions(
              actionConfig.conditional,
              execution.trigger_data,
              execution.user_context
            );
            
            if (!shouldExecute) {
              continue;
            }
          }

          // Execute the action
          await this.executeWorkflowAction(
            actionConfig,
            execution.trigger_data,
            execution.user_context
          );

          execution.actions_executed++;
        } catch (error) {
          execution.actions_failed++;
          logger.error('Workflow action failed', {
            execution_id: execution.id,
            action: actionConfig.action,
            error: error.message
          });
        }
      }

      execution.status = 'completed';
      execution.completed_at = new Date().toISOString();

      logger.info('Workflow execution completed', {
        execution_id: execution.id,
        rule_name: rule.name,
        actions_executed: execution.actions_executed,
        actions_failed: execution.actions_failed
      });

    } catch (error) {
      execution.status = 'failed';
      execution.error_message = error.message;
      execution.completed_at = new Date().toISOString();

      this.handleError('executeWorkflow', error, { execution_id: execution.id });
    }
  }

  /**
   * Execute individual workflow action
   */
  private async executeWorkflowAction(
    actionConfig: WorkflowActionConfig,
    triggerData: any,
    userContext: UnifiedUserProfile | null
  ): Promise<void> {
    const { action, parameters } = actionConfig;

    switch (action) {
      case 'send_notification':
        await this.executeSend        break;

      case 'approve_quote':
        await this.executeApproveQuote(parameters, triggerData);
        break;

      case 'consolidate_packages':
        await this.executeConsolidatePackages(parameters, userContext);
        break;

      case 'calculate_fees':
        await this.executeCalculateFees(parameters, triggerData, userContext);
        break;

      case 'assign_support_ticket':
        await this.executeAssignSupportTicket(parameters, triggerData);
        break;

      case 'offer_discount':
        await this.executeOfferDiscount(parameters, userContext);
        break;

      default:
        logger.warn('Unknown workflow action', { action });
    }
  }

  // ============================================================================
  // ACTION IMPLEMENTATIONS
  // ============================================================================

  private async executeSend
    await notificationService.create  }

  private async executeApproveQuote(parameters: any, triggerData: any): Promise<void> {
    await masterServiceOrchestrator.executeOperation({
      id: `auto-approve-${triggerData.id}`,
      service: 'quote',
      operation: 'update',
      context: {
        quote_id: triggerData.id,
        metadata: {
          status: 'approved',
          auto_approved: parameters.auto_approved,
          approval_reason: parameters.reason
        }
      },
      priority: 'high'
    });
  }

  private async executeConsolidatePackages(
    parameters: any,
    userContext: UnifiedUserProfile | null
  ): Promise<void> {
    if (!userContext) return;

    await masterServiceOrchestrator.executeOperation({
      id: `auto-consolidate-${userContext.id}`,
      service: 'package',
      operation: 'process',
      context: {
        user_id: userContext.id,
        metadata: {
          action: 'consolidate',
          auto_consolidation: parameters.auto_consolidation
        }
      },
      priority: 'medium'
    });
  }

  private async executeCalculateFees(
    parameters: any,
    triggerData: any,
    userContext: UnifiedUserProfile | null
  ): Promise<void> {
    await masterServiceOrchestrator.executeOperation({
      id: `calculate-fees-${triggerData.id}`,
      service: 'storage',
      operation: 'calculate',
      context: {
        package_id: triggerData.id,
        metadata: {
          fee_type: parameters.fee_type
        }
      },
      priority: 'low'
    });
  }

  private async executeAssignSupportTicket(
    parameters: any,
    triggerData: any
  ): Promise<void> {
    await masterServiceOrchestrator.executeOperation({
      id: `assign-ticket-${triggerData.id}`,
      service: 'support',
      operation: 'update',
      context: {
        ticket_id: triggerData.id,
        metadata: {
          assignment_strategy: parameters.assignment_strategy
        }
      },
      priority: 'high'
    });
  }

  private async executeOfferDiscount(
    parameters: any,
    userContext: UnifiedUserProfile | null
  ): Promise<void> {
    if (!userContext) return;

    // Create discount offer in database
    await supabase.from('discount_offers').insert({
      user_id: userContext.id,
      discount_percentage: parameters.discount_percentage,
      valid_until: new Date(Date.now() + parameters.validity_days * 24 * 60 * 60 * 1000).toISOString(),
      offer_type: 'automated_retention',
      is_used: false
    });
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private findRuleById(ruleId: string): WorkflowRule | null {
    for (const rules of this.workflowRules.values()) {
      const rule = rules.find(r => r.id === ruleId);
      if (rule) return rule;
    }
    return null;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private handleError(operation: string, error: any, context: any = {}): void {
    const transaction = typeof Sentry?.startTransaction === 'function'
      ? Sentry.startTransaction({
          name: `IntelligentWorkflowService.${operation}`,
          op: 'workflow_operation'
        })
      : null;

    if (transaction) {
      Sentry.captureException(error, {
        tags: {
          service: 'IntelligentWorkflowService',
          operation
        },
        extra: context
      });
      transaction.finish();
    }

    logger.error(`IntelligentWorkflowService.${operation} failed`, {
      error: error.message,
      context
    });
  }

  // ============================================================================
  // PUBLIC API METHODS
  // ============================================================================

  /**
   * Add custom workflow rule
   */
  async addWorkflowRule(rule: Omit<WorkflowRule, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    const fullRule: WorkflowRule = {
      ...rule,
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (!this.workflowRules.has(rule.trigger)) {
      this.workflowRules.set(rule.trigger, []);
    }

    this.workflowRules.get(rule.trigger)!.push(fullRule);
    this.workflowRules.get(rule.trigger)!.sort((a, b) => a.priority - b.priority);

    logger.info('Added custom workflow rule', {
      rule_id: fullRule.id,
      rule_name: fullRule.name,
      trigger: fullRule.trigger
    });

    return fullRule.id;
  }

  /**
   * Get workflow execution statistics
   */
  async getWorkflowStats(): Promise<{
    total_rules: number;
    active_rules: number;
    executions_today: number;
    success_rate: number;
  }> {
    let totalRules = 0;
    let activeRules = 0;

    for (const rules of this.workflowRules.values()) {
      totalRules += rules.length;
      activeRules += rules.filter(r => r.is_active).length;
    }

    return {
      total_rules: totalRules,
      active_rules: activeRules,
      executions_today: 0, // Would query database for actual stats
      success_rate: 0.95, // Would calculate from execution history
    };
  }

  /**
   * Enable/disable workflow rule
   */
  async toggleWorkflowRule(ruleId: string, isActive: boolean): Promise<boolean> {
    const rule = this.findRuleById(ruleId);
    if (!rule) return false;

    rule.is_active = isActive;
    rule.updated_at = new Date().toISOString();

    logger.info('Toggled workflow rule', {
      rule_id: ruleId,
      rule_name: rule.name,
      is_active: isActive
    });

    return true;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const intelligentWorkflowService = IntelligentWorkflowService.getInstance();
export default intelligentWorkflowService;

// Export types
export type {
  WorkflowRule,
  WorkflowCondition,
  WorkflowActionConfig,
  WorkflowExecution,
  WorkflowTrigger,
  WorkflowAction
};