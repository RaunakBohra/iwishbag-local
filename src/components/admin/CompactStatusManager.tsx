import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useStatusManagement } from '@/hooks/useStatusManagement';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Package,
  Truck,
  DollarSign,
  FileText,
  ShoppingCart,
  Send,
  MoreHorizontal,
  ChevronDown,
  History,
  MessageSquare,
  Calendar,
} from 'lucide-react';

interface CompactStatusManagerProps {
  quote: {
    id: string;
    status: string;
    display_id?: string;
    iwish_tracking_id?: string;
    customer?: {
      name: string;
      email: string;
    };
    created_at: string;
    updated_at: string;
  };
  onStatusChange: (newStatus: string, notes?: string) => void;
  isUpdating?: boolean;
  className?: string;
  hasUncheckedFiles?: boolean;
}

// Icon mapping for status display
const getStatusIcon = (iconName: string) => {
  const iconMap = {
    Clock,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Package,
    Truck,
    DollarSign,
    FileText,
    ShoppingCart,
  };
  return iconMap[iconName as keyof typeof iconMap] || Clock;
};

export const CompactStatusManager: React.FC<CompactStatusManagerProps> = ({
  quote,
  onStatusChange,
  isUpdating = false,
  className = '',
  hasUncheckedFiles = false,
}) => {
  const { toast } = useToast();
  const { quoteStatuses, getStatusConfig, getAllowedTransitions, isValidTransition } = useStatusManagement();
  
  const [showChangeDialog, setShowChangeDialog] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [changeReason, setChangeReason] = useState('');
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);

  // Get current status configuration
  const currentStatusConfig = useMemo(() => {
    return getStatusConfig(quote.status, 'quote');
  }, [quote.status, getStatusConfig]);

  // Get allowed next statuses
  const allowedTransitions = useMemo(() => {
    const transitionIds = getAllowedTransitions(quote.status, 'quote');
    return quoteStatuses.filter(status => 
      transitionIds.includes(status.id) && status.isActive
    );
  }, [quote.status, quoteStatuses, getAllowedTransitions]);

  // Quick action buttons for common transitions
  const quickActions = useMemo(() => {
    const actions = [];
    
    // Common quick actions based on current status
    if (quote.status === 'pending' || quote.status === 'calculated') {
      const sentStatus = allowedTransitions.find(s => 
        s.name === 'sent' || s.id === 'sent' || 
        s.label.toLowerCase().includes('sent')
      );
      if (sentStatus) {
        actions.push({
          status: sentStatus,
          label: hasUncheckedFiles ? 'Send Quote ⚠️' : 'Send Quote',
          variant: 'default' as const,
          icon: Send,
        });
      }
    }

    if (quote.status === 'sent') {
      const approvedStatus = allowedTransitions.find(s => 
        s.name === 'approved' || s.id === 'approved'
      );
      const rejectedStatus = allowedTransitions.find(s => 
        s.name === 'rejected' || s.id === 'rejected'
      );
      
      if (approvedStatus) {
        actions.push({
          status: approvedStatus,
          label: 'Approve',
          variant: 'default' as const,
          icon: CheckCircle,
        });
      }
      
      if (rejectedStatus) {
        actions.push({
          status: rejectedStatus,
          label: 'Reject',
          variant: 'destructive' as const,
          icon: XCircle,
        });
      }
    }

    if (quote.status === 'paid' || quote.status === 'approved') {
      const orderedStatus = allowedTransitions.find(s => 
        s.name === 'ordered' || s.id === 'ordered'
      );
      if (orderedStatus) {
        actions.push({
          status: orderedStatus,
          label: 'Mark Ordered',
          variant: 'default' as const,
          icon: ShoppingCart,
        });
      }
    }

    return actions.slice(0, 2); // Only show first 2 quick actions
  }, [quote.status, allowedTransitions]);

  const handleQuickAction = (status: typeof allowedTransitions[0]) => {
    if (!isValidTransition(quote.status, status.name, 'quote')) {
      toast({
        title: 'Invalid Status Transition',
        description: `Cannot change from "${currentStatusConfig?.label}" to "${status.label}"`,
        variant: 'destructive',
      });
      return;
    }

    setSelectedStatus(status.name);
    setChangeReason('');
    setShowChangeDialog(true);
  };

  const handleStatusSelect = (status: typeof allowedTransitions[0]) => {
    if (!isValidTransition(quote.status, status.name, 'quote')) {
      toast({
        title: 'Invalid Status Transition',
        description: `Cannot change from "${currentStatusConfig?.label}" to "${status.label}"`,
        variant: 'destructive',
      });
      return;
    }

    setSelectedStatus(status.name);
    setChangeReason('');
    setShowChangeDialog(true);
  };

  const handleConfirmStatusChange = () => {
    onStatusChange(selectedStatus, changeReason || undefined);
    setShowChangeDialog(false);
    setSelectedStatus('');
    setChangeReason('');
  };

  const StatusIcon = getStatusIcon(currentStatusConfig.icon);

  return (
    <TooltipProvider>
      <div className={`flex items-center gap-2 ${className}`}>
        {/* Current Status Badge with Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              className="h-8 px-3 gap-2"
              disabled={currentStatusConfig.isTerminal || isUpdating}
            >
              <StatusIcon className="h-4 w-4" />
              <span className="font-medium">{currentStatusConfig.label}</span>
              {!currentStatusConfig.isTerminal && <ChevronDown className="h-3 w-3" />}
            </Button>
          </DropdownMenuTrigger>
          {!currentStatusConfig.isTerminal && (
            <DropdownMenuContent align="start" className="w-56">
              <div className="px-2 py-1.5 text-sm font-medium">Change Status To:</div>
              <DropdownMenuSeparator />
              {allowedTransitions.map((status) => {
                const Icon = getStatusIcon(status.icon);
                return (
                  <DropdownMenuItem
                    key={status.id}
                    onClick={() => handleStatusSelect(status)}
                    className="gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{status.label}</span>
                    {status.isTerminal && (
                      <Badge variant="outline" className="text-xs ml-auto">
                        Final
                      </Badge>
                    )}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          )}
        </DropdownMenu>

        {/* Quick Action Buttons */}
        {quickActions.map(({ status, label, variant, icon: ActionIcon }) => (
          <Button
            key={status.id}
            variant={variant}
            size="sm"
            onClick={() => handleQuickAction(status)}
            disabled={isUpdating}
            className="h-8"
          >
            <ActionIcon className="h-4 w-4 mr-1" />
            {label}
          </Button>
        ))}

        {/* More Actions Menu */}
        {allowedTransitions.length > quickActions.length && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {allowedTransitions
                .filter(status => !quickActions.find(qa => qa.status.id === status.id))
                .map((status) => {
                  const Icon = getStatusIcon(status.icon);
                  return (
                    <DropdownMenuItem
                      key={status.id}
                      onClick={() => handleStatusSelect(status)}
                      className="gap-2"
                    >
                      <Icon className="h-4 w-4" />
                      <span>{status.label}</span>
                    </DropdownMenuItem>
                  );
                })}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowHistoryDialog(true)}>
                <History className="h-4 w-4 mr-2" />
                View History
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Status Info Tooltip */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Clock className="h-4 w-4 text-gray-500" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                <span>Updated: {new Date(quote.updated_at).toLocaleString()}</span>
              </div>
              {currentStatusConfig.autoExpireHours && (
                <div className="flex items-center gap-2 text-amber-600">
                  <Clock className="h-3 w-3" />
                  <span>Auto-expires in {currentStatusConfig.autoExpireHours} hours</span>
                </div>
              )}
              {currentStatusConfig.triggersEmail && (
                <div className="flex items-center gap-2 text-blue-600">
                  <MessageSquare className="h-3 w-3" />
                  <span>Email notifications enabled</span>
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Status Change Confirmation Dialog */}
      <Dialog open={showChangeDialog} onOpenChange={setShowChangeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Status Change</DialogTitle>
            <DialogDescription>
              Change quote status from "{currentStatusConfig?.label}" to "
              {getStatusConfig(selectedStatus, 'quote')?.label}"
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason" className="text-sm font-medium">
                Reason for change (optional)
              </Label>
              <Textarea
                id="reason"
                placeholder="Enter reason for status change..."
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                className="mt-1"
              />
            </div>

            {hasUncheckedFiles && selectedStatus === 'sent' && (
              <div className="bg-amber-50 p-3 rounded-lg mb-3">
                <div className="flex items-start gap-2 text-sm text-amber-700">
                  <AlertTriangle className="h-4 w-4 mt-0.5" />
                  <div>
                    <p className="font-medium">Customer has uploaded files!</p>
                    <p className="text-xs mt-1">Please review customer files before sending the quote to ensure accurate pricing.</p>
                  </div>
                </div>
              </div>
            )}
            
            {getStatusConfig(selectedStatus, 'quote')?.triggersEmail && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <MessageSquare className="h-4 w-4" />
                  <span>This status change will trigger an email notification to the customer.</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangeDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmStatusChange}
              disabled={isUpdating}
            >
              {isUpdating ? 'Updating...' : 'Confirm Change'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Status History</DialogTitle>
            <DialogDescription>
              Complete history of status changes for this quote
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {/* Import and use StatusHistory component here */}
            <p className="text-sm text-gray-500">Status history would be displayed here...</p>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};