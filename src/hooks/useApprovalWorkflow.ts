import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { approvalEngine } from '@/services/ApprovalEngine';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Tables } from '@/integrations/supabase/types';

type Quote = Tables<'quotes'>;

interface ApprovalWorkflowState {
  requiresApproval: boolean;
  currentApproval?: ApprovalWorkflow;
  canApprove: boolean;
  pendingApprovals: PendingApproval[];
  isLoading: boolean;
}

interface ApprovalWorkflow {
  id: string;
  quoteId: string;
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'changes_requested';
  currentStep: number;
  steps: ApprovalStep[];
  initiatedBy: string;
  initiatedAt: string;
  metadata: any;
}

interface ApprovalStep {
  stepNumber: number;
  approverId: string;
  approverName: string;
  status: 'pending' | 'completed' | 'escalated';
  decision?: 'approve' | 'reject' | 'request_changes';
  comments?: string;
  decidedAt?: string;
  dueDate: string;
}

interface PendingApproval {
  id: string;
  quoteId: string;
  displayId: string;
  customerEmail: string;
  totalValue: number;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  daysOverdue: number;
}

export const useApprovalWorkflow = (quoteId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if quote requires approval
  const { data: approvalRequired, isLoading: checkingApproval } = useQuery({
    queryKey: ['approval-required', quoteId],
    queryFn: async () => {
      if (!quoteId) return false;
      
      const { data: quote } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', quoteId)
        .single();

      if (!quote) return false;
      
      return await approvalEngine.requiresApproval(quote);
    },
    enabled: !!quoteId
  });

  // Get current approval workflow for quote
  const { data: currentApproval, isLoading: loadingApproval } = useQuery({
    queryKey: ['approval-workflow', quoteId],
    queryFn: async () => {
      if (!quoteId) return null;
      return await approvalEngine.getApprovalStatus(quoteId);
    },
    enabled: !!quoteId && approvalRequired
  });

  // Get pending approvals for current user
  const { data: pendingApprovals, isLoading: loadingPending } = useQuery({
    queryKey: ['pending-approvals', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: approvals } = await supabase
        .from('approval_steps')
        .select(`
          id,
          approval_id,
          step_number,
          due_date,
          quote_approvals!inner (
            quote_id,
            quotes!inner (
              id,
              display_id,
              email,
              final_total_usd
            )
          )
        `)
        .eq('approver_id', user.id)
        .eq('status', 'pending');

      return (approvals || []).map(approval => {
        const quote = approval.quote_approvals.quotes;
        const dueDate = new Date(approval.due_date);
        const now = new Date();
        const daysOverdue = Math.max(0, Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));

        return {
          id: approval.id,
          quoteId: quote.id,
          displayId: quote.display_id || quote.id.substring(0, 8),
          customerEmail: quote.email || 'No email',
          totalValue: quote.final_total_usd || 0,
          dueDate: approval.due_date,
          priority: daysOverdue > 2 ? 'high' : daysOverdue > 0 ? 'medium' : 'low',
          daysOverdue
        } as PendingApproval;
      });
    },
    enabled: !!user?.id,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Check if current user can approve
  const canApprove = currentApproval?.approval_steps?.some(
    step => step.approver_id === user?.id && step.status === 'pending'
  ) || false;

  // Initiate approval workflow
  const initiateApprovalMutation = useMutation({
    mutationFn: async ({ quote }: { quote: Quote }) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      return await approvalEngine.initiateApproval(quote, user.id);
    },
    onSuccess: () => {
      toast({
        title: 'Approval Initiated',
        description: 'Quote has been submitted for approval.',
      });
      queryClient.invalidateQueries({ queryKey: ['approval-workflow', quoteId] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Approval Failed',
        description: error.message || 'Failed to initiate approval process.',
        variant: 'destructive',
      });
    }
  });

  // Process approval decision
  const processApprovalMutation = useMutation({
    mutationFn: async ({
      workflowId,
      decision,
      comments
    }: {
      workflowId: string;
      decision: 'approve' | 'reject' | 'request_changes';
      comments?: string;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      return await approvalEngine.processApproval(workflowId, user.id, decision, comments);
    },
    onSuccess: (data, variables) => {
      const actionText = variables.decision === 'approve' ? 'approved' : 
                        variables.decision === 'reject' ? 'rejected' : 'returned for changes';
      
      toast({
        title: 'Decision Recorded',
        description: `Quote has been ${actionText}.`,
      });
      
      queryClient.invalidateQueries({ queryKey: ['approval-workflow'] });
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Decision Failed',
        description: error.message || 'Failed to record approval decision.',
        variant: 'destructive',
      });
    }
  });

  return {
    // State
    requiresApproval: approvalRequired || false,
    currentApproval,
    canApprove,
    pendingApprovals: pendingApprovals || [],
    isLoading: checkingApproval || loadingApproval || loadingPending,

    // Actions
    initiateApproval: initiateApprovalMutation.mutate,
    processApproval: processApprovalMutation.mutate,
    
    // Loading states
    isInitiating: initiateApprovalMutation.isPending,
    isProcessing: processApprovalMutation.isPending,

    // Utils
    getApprovalSummary: (approval: ApprovalWorkflow) => {
      const totalSteps = approval.steps.length;
      const completedSteps = approval.steps.filter(s => s.status === 'completed').length;
      return {
        progress: (completedSteps / totalSteps) * 100,
        currentStepName: `Step ${approval.currentStep} of ${totalSteps}`,
        nextApprover: approval.steps.find(s => s.status === 'pending')?.approverName
      };
    }
  };
};