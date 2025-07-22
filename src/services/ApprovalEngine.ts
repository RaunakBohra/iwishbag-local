import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { NotificationService } from './NotificationService';

type Quote = Tables<'quotes'>;

interface ApprovalRule {
  id: string;
  name: string;
  condition: (quote: Quote) => boolean;
  requiredApprovers: ApprovalLevel[];
  escalationHours: number;
}

interface ApprovalLevel {
  level: number;
  role: 'quote_specialist' | 'manager' | 'senior_manager' | 'director';
  requiredCount: number; // How many approvers needed at this level
  type: 'sequential' | 'parallel' | 'any-one';
}

interface ApprovalWorkflow {
  id: string;
  quoteId: string;
  steps: ApprovalStep[];
  currentStep: number;
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'escalated';
  metadata: {
    triggeredBy: string[];
    totalValue: number;
    riskScore: number;
  };
}

interface ApprovalStep {
  level: number;
  approvers: string[]; // User IDs
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  decisions: ApprovalDecision[];
  dueDate: Date;
  escalatedAt?: Date;
}

interface ApprovalDecision {
  approverId: string;
  decision: 'approve' | 'reject' | 'request_changes';
  comments?: string;
  decidedAt: Date;
}

class ApprovalEngine {
  private static instance: ApprovalEngine;
  private notificationService: NotificationService;

  private constructor() {
    this.notificationService = NotificationService.getInstance();
  }

  public static getInstance(): ApprovalEngine {
    if (!ApprovalEngine.instance) {
      ApprovalEngine.instance = new ApprovalEngine();
    }
    return ApprovalEngine.instance;
  }

  // Define approval rules based on iwishBag business logic
  private getApprovalRules(): ApprovalRule[] {
    return [
      {
        id: 'high_value_quote',
        name: 'High Value Quote Approval',
        condition: (quote) => (quote.final_total_usd || 0) > 5000,
        requiredApprovers: [
          { level: 1, role: 'manager', requiredCount: 1, type: 'sequential' },
          { level: 2, role: 'senior_manager', requiredCount: 1, type: 'sequential' }
        ],
        escalationHours: 24
      },
      {
        id: 'new_customer',
        name: 'New Customer Approval',
        condition: (quote) => this.isNewCustomer(quote),
        requiredApprovers: [
          { level: 1, role: 'manager', requiredCount: 1, type: 'sequential' }
        ],
        escalationHours: 12
      },
      {
        id: 'high_discount',
        name: 'High Discount Approval',
        condition: (quote) => this.hasHighDiscount(quote),
        requiredApprovers: [
          { level: 1, role: 'manager', requiredCount: 1, type: 'sequential' },
          { level: 2, role: 'senior_manager', requiredCount: 1, type: 'sequential' }
        ],
        escalationHours: 8
      },
      {
        id: 'high_risk_country',
        name: 'High Risk Country Approval',
        condition: (quote) => this.isHighRiskCountry(quote.destination_country),
        requiredApprovers: [
          { level: 1, role: 'senior_manager', requiredCount: 1, type: 'sequential' }
        ],
        escalationHours: 6
      },
      {
        id: 'bulk_order',
        name: 'Bulk Order Approval',
        condition: (quote) => (quote.items?.length || 0) > 10,
        requiredApprovers: [
          { level: 1, role: 'manager', requiredCount: 1, type: 'sequential' }
        ],
        escalationHours: 12
      }
    ];
  }

  // Check if quote requires approval
  public async requiresApproval(quote: Quote): Promise<boolean> {
    const rules = this.getApprovalRules();
    return rules.some(rule => rule.condition(quote));
  }

  // Get matching approval rules for a quote
  public getMatchingRules(quote: Quote): ApprovalRule[] {
    const rules = this.getApprovalRules();
    return rules.filter(rule => rule.condition(quote));
  }

  // Initiate approval workflow
  public async initiateApproval(
    quote: Quote, 
    initiatedBy: string
  ): Promise<{ success: boolean; workflowId?: string; error?: string }> {
    try {
      const matchingRules = this.getMatchingRules(quote);
      
      if (matchingRules.length === 0) {
        return { success: false, error: 'No approval rules match this quote' };
      }

      // Combine all required approval levels
      const allLevels = matchingRules.flatMap(rule => rule.requiredApprovers);
      const uniqueLevels = this.consolidateApprovalLevels(allLevels);

      // Create approval workflow
      const workflow: ApprovalWorkflow = {
        id: crypto.randomUUID(),
        quoteId: quote.id,
        currentStep: 1,
        status: 'pending',
        steps: await this.createApprovalSteps(uniqueLevels),
        metadata: {
          triggeredBy: matchingRules.map(r => r.id),
          totalValue: quote.final_total_usd || 0,
          riskScore: this.calculateRiskScore(quote)
        }
      };

      // Save to database
      const { error: dbError } = await supabase
        .from('quote_approvals')
        .insert({
          quote_id: quote.id,
          workflow_id: workflow.id,
          status: 'pending',
          initiated_by: initiatedBy,
          metadata: workflow.metadata
        });

      if (dbError) throw dbError;

      // Update quote status
      await supabase
        .from('quotes')
        .update({ status: 'pending_approval' })
        .eq('id', quote.id);

      // Notify approvers
      await this.notifyApprovers(workflow);

      return { success: true, workflowId: workflow.id };

    } catch (error) {
      console.error('Error initiating approval:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Process approval decision
  public async processApproval(
    workflowId: string,
    approverId: string,
    decision: 'approve' | 'reject' | 'request_changes',
    comments?: string
  ): Promise<{ success: boolean; nextStep?: boolean; error?: string }> {
    try {
      // Get current approval workflow
      const { data: approval } = await supabase
        .from('quote_approvals')
        .select('*')
        .eq('workflow_id', workflowId)
        .single();

      if (!approval) {
        return { success: false, error: 'Approval workflow not found' };
      }

      // Record the decision
      await supabase.from('approval_steps').insert({
        approval_id: approval.id,
        step_number: approval.current_step,
        approver_id: approverId,
        status: 'completed',
        decision,
        comments,
        decided_at: new Date().toISOString()
      });

      // Record in history
      await this.recordApprovalHistory(approval.id, 'decision_made', approverId, {
        decision,
        comments,
        step: approval.current_step
      });

      if (decision === 'reject') {
        // Rejection - end workflow
        await this.finalizeApproval(approval.id, 'rejected');
        await this.updateQuoteStatus(approval.quote_id, 'rejected');
        return { success: true, nextStep: false };
      }

      if (decision === 'request_changes') {
        // Request changes - pause workflow
        await supabase
          .from('quote_approvals')
          .update({ status: 'changes_requested' })
          .eq('id', approval.id);
        
        await this.updateQuoteStatus(approval.quote_id, 'changes_requested');
        await this.notifyQuoteOwner(approval.quote_id, 'changes_requested', comments);
        return { success: true, nextStep: false };
      }

      // Approval - check if more steps needed
      const hasMoreSteps = await this.hasRemainingSteps(approval);
      
      if (hasMoreSteps) {
        // Move to next step
        await supabase
          .from('quote_approvals')
          .update({ current_step: approval.current_step + 1 })
          .eq('id', approval.id);
        
        // Notify next level approvers
        await this.notifyNextLevelApprovers(approval);
        return { success: true, nextStep: true };
      } else {
        // Final approval
        await this.finalizeApproval(approval.id, 'approved');
        await this.updateQuoteStatus(approval.quote_id, 'approved');
        return { success: true, nextStep: false };
      }

    } catch (error) {
      console.error('Error processing approval:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Get approval status for a quote
  public async getApprovalStatus(quoteId: string) {
    const { data: approval } = await supabase
      .from('quote_approvals')
      .select(`
        *,
        approval_steps (
          step_number,
          approver_id,
          status,
          decision,
          comments,
          decided_at,
          profiles:approver_id (full_name, email)
        )
      `)
      .eq('quote_id', quoteId)
      .single();

    return approval;
  }

  // Helper methods
  private isNewCustomer(quote: Quote): boolean {
    // Check if customer has previous orders
    // This would need to be implemented based on your customer data
    return false; // Placeholder
  }

  private hasHighDiscount(quote: Quote): boolean {
    const discount = quote.discount || 0;
    const total = quote.final_total_usd || 0;
    return (discount / total) > 0.15; // 15% discount threshold
  }

  private isHighRiskCountry(country?: string): boolean {
    const highRiskCountries = ['PK', 'BD', 'MM', 'AF'];
    return country ? highRiskCountries.includes(country) : false;
  }

  private calculateRiskScore(quote: Quote): number {
    let score = 0;
    
    // Value-based risk
    const value = quote.final_total_usd || 0;
    if (value > 10000) score += 3;
    else if (value > 5000) score += 2;
    else if (value > 1000) score += 1;

    // Country-based risk
    if (this.isHighRiskCountry(quote.destination_country)) score += 2;

    // New customer risk
    if (this.isNewCustomer(quote)) score += 1;

    return Math.min(score, 10); // Cap at 10
  }

  private consolidateApprovalLevels(levels: ApprovalLevel[]): ApprovalLevel[] {
    // Merge similar levels and remove duplicates
    const levelMap = new Map<number, ApprovalLevel>();
    
    levels.forEach(level => {
      const existing = levelMap.get(level.level);
      if (!existing || level.requiredCount > existing.requiredCount) {
        levelMap.set(level.level, level);
      }
    });

    return Array.from(levelMap.values()).sort((a, b) => a.level - b.level);
  }

  private async createApprovalSteps(levels: ApprovalLevel[]): Promise<ApprovalStep[]> {
    const steps: ApprovalStep[] = [];
    
    for (const level of levels) {
      const approvers = await this.getApproversByRole(level.role);
      const dueDate = new Date();
      dueDate.setHours(dueDate.getHours() + 24); // 24 hour default

      steps.push({
        level: level.level,
        approvers: approvers.slice(0, level.requiredCount),
        status: 'pending',
        decisions: [],
        dueDate
      });
    }

    return steps;
  }

  private async getApproversByRole(role: string): Promise<string[]> {
    const { data: users } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', role);

    return users?.map(u => u.user_id) || [];
  }

  private async notifyApprovers(workflow: ApprovalWorkflow): Promise<void> {
    const firstStep = workflow.steps[0];
    if (!firstStep) return;

    for (const approverId of firstStep.approvers) {
      await this.notificationService.sendApprovalRequest(
        approverId,
        workflow.quoteId,
        workflow.metadata.totalValue
      );
    }
  }

  private async hasRemainingSteps(approval: any): Promise<boolean> {
    // Check if there are more approval steps configured
    return approval.current_step < this.getMaxStepsForApproval(approval);
  }

  private getMaxStepsForApproval(approval: any): number {
    // This would be determined by the workflow configuration
    return 3; // Placeholder
  }

  private async finalizeApproval(approvalId: string, status: string): Promise<void> {
    await supabase
      .from('quote_approvals')
      .update({
        status,
        completed_at: new Date().toISOString()
      })
      .eq('id', approvalId);
  }

  private async updateQuoteStatus(quoteId: string, status: string): Promise<void> {
    await supabase
      .from('quotes')
      .update({ status })
      .eq('id', quoteId);
  }

  private async recordApprovalHistory(
    approvalId: string,
    action: string,
    actorId: string,
    metadata?: any
  ): Promise<void> {
    await supabase.from('approval_history').insert({
      approval_id: approvalId,
      action,
      actor_id: actorId,
      metadata,
    });
  }

  private async notifyNextLevelApprovers(approval: any): Promise<void> {
    // Notify approvers for the next step
    // Implementation would depend on your notification system
  }

  private async notifyQuoteOwner(quoteId: string, status: string, comments?: string): Promise<void> {
    // Notify quote owner of status change
    // Implementation would depend on your notification system
  }
}

export const approvalEngine = ApprovalEngine.getInstance();