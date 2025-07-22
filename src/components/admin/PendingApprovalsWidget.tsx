import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Clock, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  User,
  Calendar
} from 'lucide-react';
import { useApprovalWorkflow } from '@/hooks/useApprovalWorkflow';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';

interface PendingApprovalsWidgetProps {
  userId?: string;
  maxItems?: number;
  showActions?: boolean;
}

export const PendingApprovalsWidget: React.FC<PendingApprovalsWidgetProps> = ({
  userId,
  maxItems = 5,
  showActions = true
}) => {
  const navigate = useNavigate();
  const { pendingApprovals, processApproval, isProcessing } = useApprovalWorkflow();

  const displayApprovals = pendingApprovals.slice(0, maxItems);
  const hasMore = pendingApprovals.length > maxItems;

  const getPriorityColor = (priority: string, daysOverdue: number) => {
    if (daysOverdue > 0) return 'text-red-600 bg-red-50 border-red-200';
    if (priority === 'high') return 'text-orange-600 bg-orange-50 border-orange-200';
    if (priority === 'medium') return 'text-blue-600 bg-blue-50 border-blue-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM dd');
  };

  const handleQuickApproval = async (approvalId: string, workflowId: string, decision: 'approve' | 'reject') => {
    try {
      await processApproval({
        workflowId,
        decision,
        comments: decision === 'approve' ? 'Quick approval' : 'Quick rejection'
      });
    } catch (error) {
      console.error('Quick approval failed:', error);
    }
  };

  if (pendingApprovals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Pending Approvals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600">All caught up!</p>
            <p className="text-xs text-gray-500 mt-1">No pending approvals at the moment.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-600" />
            Pending Approvals
            <Badge variant="secondary" className="ml-2">
              {pendingApprovals.length}
            </Badge>
          </div>
          {hasMore && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/admin/approvals')}
            >
              View All
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="divide-y">
          {displayApprovals.map((approval) => (
            <div key={approval.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-0 h-auto font-semibold text-left hover:bg-transparent hover:underline"
                      onClick={() => navigate(`/admin/quotes/${approval.quoteId}`)}
                    >
                      Quote {approval.displayId}
                    </Button>
                    
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getPriorityColor(approval.priority, approval.daysOverdue)}`}
                    >
                      {approval.daysOverdue > 0 
                        ? `${approval.daysOverdue}d overdue` 
                        : approval.priority
                      }
                    </Badge>
                  </div>

                  {/* Details */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span className="truncate max-w-[120px]">
                          {approval.customerEmail}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        <span className="font-medium">
                          {formatCurrency(approval.totalValue)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Calendar className="h-3 w-3" />
                      <span>Due {formatDate(approval.dueDate)}</span>
                      {approval.daysOverdue > 0 && (
                        <div className="flex items-center gap-1 ml-2 text-red-600">
                          <AlertTriangle className="h-3 w-3" />
                          <span className="font-medium">Overdue</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {showActions && (
                  <div className="flex items-center gap-1 ml-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleQuickApproval(approval.id, approval.quoteId, 'approve')}
                      disabled={isProcessing}
                      className="h-7 px-2 text-xs text-green-700 border-green-200 hover:bg-green-50"
                    >
                      <CheckCircle className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleQuickApproval(approval.id, approval.quoteId, 'reject')}
                      disabled={isProcessing}
                      className="h-7 px-2 text-xs text-red-700 border-red-200 hover:bg-red-50"
                    >
                      <XCircle className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {hasMore && (
          <div className="p-4 border-t bg-gray-50">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => navigate('/admin/approvals')}
            >
              View {pendingApprovals.length - maxItems} More Approvals
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};