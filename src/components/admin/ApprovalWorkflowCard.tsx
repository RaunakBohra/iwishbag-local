import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import {
  CheckCircle,
  XCircle,
  Clock,
  User,
  AlertTriangle,
  MessageSquare,
  ArrowRight,
  Calendar,
  DollarSign
} from 'lucide-react';
import { useApprovalWorkflow } from '@/hooks/useApprovalWorkflow';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';

interface ApprovalWorkflowCardProps {
  quoteId: string;
  quote?: any; // Your quote type
  showActions?: boolean;
  compact?: boolean;
}

export const ApprovalWorkflowCard: React.FC<ApprovalWorkflowCardProps> = ({
  quoteId,
  quote,
  showActions = true,
  compact = false
}) => {
  const {
    requiresApproval,
    currentApproval,
    canApprove,
    initiateApproval,
    processApproval,
    isInitiating,
    isProcessing,
    getApprovalSummary
  } = useApprovalWorkflow(quoteId);

  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [selectedDecision, setSelectedDecision] = useState<'approve' | 'reject' | 'request_changes' | null>(null);
  const [comments, setComments] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  if (!requiresApproval && !currentApproval) {
    return null; // No approval needed
  }

  const handleDecisionClick = (decision: 'approve' | 'reject' | 'request_changes') => {
    setSelectedDecision(decision);
    if (decision === 'approve') {
      setShowConfirmDialog(true);
    } else {
      setShowApprovalDialog(true);
    }
  };

  const handleConfirmApproval = () => {
    if (currentApproval && selectedDecision) {
      processApproval({
        workflowId: currentApproval.workflow_id,
        decision: selectedDecision,
        comments: comments.trim() || undefined
      });
      setShowConfirmDialog(false);
      setShowApprovalDialog(false);
      setComments('');
      setSelectedDecision(null);
    }
  };

  const handleSubmitWithComments = () => {
    if (currentApproval && selectedDecision) {
      processApproval({
        workflowId: currentApproval.workflow_id,
        decision: selectedDecision,
        comments: comments.trim() || undefined
      });
      setShowApprovalDialog(false);
      setComments('');
      setSelectedDecision(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'pending': { variant: 'secondary', icon: Clock, text: 'Pending Approval' },
      'in_progress': { variant: 'default', icon: User, text: 'Under Review' },
      'approved': { variant: 'default', icon: CheckCircle, text: 'Approved' },
      'rejected': { variant: 'destructive', icon: XCircle, text: 'Rejected' },
      'changes_requested': { variant: 'outline', icon: MessageSquare, text: 'Changes Requested' }
    } as const;

    const config = variants[status as keyof typeof variants] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    );
  };

  const renderApprovalTimeline = () => {
    if (!currentApproval?.approval_steps) return null;

    return (
      <div className="space-y-3">
        <Label className="text-sm font-medium">Approval Timeline</Label>
        <div className="space-y-2">
          {currentApproval.approval_steps.map((step, index) => {
            const isActive = step.step_number === currentApproval.current_step;
            const isCompleted = step.status === 'completed';
            const isPending = step.status === 'pending';

            return (
              <div key={step.step_number} className="flex items-center gap-3">
                <div className={`
                  flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
                  ${isCompleted ? 'bg-green-500 text-white' : 
                    isActive ? 'bg-blue-500 text-white' : 
                    'bg-gray-200 text-gray-500'}
                `}>
                  {isCompleted ? <CheckCircle className="h-3 w-3" /> : step.step_number}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm ${isActive ? 'font-medium' : ''}`}>
                      {step.profiles?.full_name || 'Approver'}
                    </p>
                    {isPending && isActive && (
                      <Badge variant="outline" className="text-xs">
                        Pending
                      </Badge>
                    )}
                  </div>
                  
                  {step.decided_at && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(step.decided_at), 'MMM dd, yyyy HH:mm')}
                      {step.decision && (
                        <Badge variant="outline" className="text-xs">
                          {step.decision}
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  {step.comments && (
                    <p className="text-xs text-gray-600 mt-1 italic">
                      "{step.comments}"
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <AlertTriangle className="h-4 w-4 text-blue-600" />
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-900">Approval Required</p>
          <p className="text-xs text-blue-700">
            Quote value exceeds approval threshold
          </p>
        </div>
        {!currentApproval && quote && (
          <Button
            size="sm"
            onClick={() => initiateApproval({ quote })}
            disabled={isInitiating}
          >
            {isInitiating ? 'Submitting...' : 'Submit for Approval'}
          </Button>
        )}
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              Approval Workflow
            </span>
            {currentApproval && getStatusBadge(currentApproval.status)}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {!currentApproval && requiresApproval && quote && (
            <div className="text-center py-4">
              <AlertTriangle className="h-8 w-8 text-orange-500 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-3">
                This quote requires approval before it can be sent to the customer.
              </p>
              <Button
                onClick={() => initiateApproval({ quote })}
                disabled={isInitiating}
                className="w-full"
              >
                {isInitiating ? 'Submitting...' : 'Submit for Approval'}
              </Button>
            </div>
          )}

          {currentApproval && (
            <div className="space-y-4">
              {/* Progress Bar */}
              {(() => {
                const summary = getApprovalSummary(currentApproval);
                return (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{Math.round(summary.progress)}% Complete</span>
                    </div>
                    <Progress value={summary.progress} className="h-2" />
                    <p className="text-xs text-gray-500">
                      {summary.currentStepName}
                      {summary.nextApprover && ` • Next: ${summary.nextApprover}`}
                    </p>
                  </div>
                );
              })()}

              {/* Approval Details */}
              <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
                <div>
                  <Label className="text-xs text-gray-500">Quote Value</Label>
                  <p className="font-medium">
                    {formatCurrency(currentApproval.metadata?.totalValue || 0)}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Risk Score</Label>
                  <p className="font-medium">
                    {currentApproval.metadata?.riskScore || 0}/10
                  </p>
                </div>
              </div>

              {/* Timeline */}
              {renderApprovalTimeline()}

              {/* Action Buttons */}
              {canApprove && showActions && currentApproval.status === 'pending' && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={() => handleDecisionClick('approve')}
                    disabled={isProcessing}
                    className="flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleDecisionClick('request_changes')}
                    disabled={isProcessing}
                    className="flex-1"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Request Changes
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleDecisionClick('reject')}
                    disabled={isProcessing}
                    className="flex-1"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval Decision Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedDecision === 'reject' ? 'Reject Quote' : 'Request Changes'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="comments">
                {selectedDecision === 'reject' ? 'Rejection Reason' : 'Required Changes'}
              </Label>
              <Textarea
                id="comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder={selectedDecision === 'reject' 
                  ? 'Please provide a reason for rejection...' 
                  : 'Please describe the changes needed...'}
                className="mt-1"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitWithComments}
              disabled={isProcessing}
              variant={selectedDecision === 'reject' ? 'destructive' : 'default'}
            >
              {isProcessing ? 'Processing...' : 
               selectedDecision === 'reject' ? 'Reject Quote' : 'Request Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Approval</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this quote? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmApproval} disabled={isProcessing}>
              {isProcessing ? 'Processing...' : 'Approve Quote'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};