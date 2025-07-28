import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useStatusManagement, type StatusConfig } from '@/hooks/useStatusManagement';
import { StatusHistory } from './StatusHistory';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Calculator,
  Settings,
  Activity,
  MessageSquare,
  Send,
  User,
  Calendar,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface AdminStatusManagerProps {
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
    Calculator,
  };
  return iconMap[iconName as keyof typeof iconMap] || Clock;
};

export const AdminStatusManager: React.FC<AdminStatusManagerProps> = ({
  quote,
  onStatusChange,
  isUpdating = false,
}) => {
  const { toast } = useToast();
  const { quoteStatuses, getStatusConfig, getAllowedTransitions, isValidTransition } = useStatusManagement();
  
  const [showChangeDialog, setShowChangeDialog] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [changeReason, setChangeReason] = useState('');
  const [isManualChange, setIsManualChange] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

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
    console.log('🔍 [AdminStatusManager] Computing quick actions:', {
      currentStatus: quote.status,
      allowedTransitions: allowedTransitions.map(t => ({ id: t.id, name: t.name, label: t.label })),
      allowedTransitionsCount: allowedTransitions.length
    });

    const actions = [];
    
    // Common quick actions based on current status
    if (quote.status === 'pending' || quote.status === 'calculated') {
      // Look for "sent" status or similar variations
      const sentStatus = allowedTransitions.find(s => 
        s.name === 'sent' || s.id === 'sent' || 
        s.label.toLowerCase().includes('sent') ||
        s.name === 'quote_sent'
      );
      if (sentStatus) {
        actions.push({
          status: sentStatus,
          label: 'Send Quote',
          variant: 'default' as const,
          icon: Send,
        });
      }
    }

    if (quote.status === 'sent') {
      // Look for "approved" status
      const approvedStatus = allowedTransitions.find(s => 
        s.name === 'approved' || s.id === 'approved' || 
        s.label.toLowerCase().includes('approved') ||
        s.name === 'quote_approved'
      );
      
      // Look for "rejected" status
      const rejectedStatus = allowedTransitions.find(s => 
        s.name === 'rejected' || s.id === 'rejected' || 
        s.label.toLowerCase().includes('rejected') ||
        s.name === 'quote_rejected'
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
        s.name === 'ordered' || s.id === 'ordered' || 
        s.label.toLowerCase().includes('ordered') ||
        s.name === 'order_placed'
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

    if (quote.status === 'ordered') {
      const shippedStatus = allowedTransitions.find(s => 
        s.name === 'shipped' || s.id === 'shipped' || 
        s.label.toLowerCase().includes('shipped') ||
        s.name === 'order_shipped'
      );
      if (shippedStatus) {
        actions.push({
          status: shippedStatus,
          label: 'Mark Shipped',
          variant: 'default' as const,
          icon: Truck,
        });
      }
    }

    // If no specific quick actions found, create generic ones for first few allowed transitions
    if (actions.length === 0 && allowedTransitions.length > 0) {
      // Add up to 3 most common transitions as quick actions
      allowedTransitions.slice(0, 3).forEach(status => {
        const isDestructive = status.name.includes('reject') || status.name.includes('cancel') || 
                             status.label.toLowerCase().includes('reject') || status.label.toLowerCase().includes('cancel');
        
        actions.push({
          status: status,
          label: status.label,
          variant: isDestructive ? 'destructive' as const : 'outline' as const,
          icon: getStatusIcon(status.icon),
        });
      });
    }

    console.log('🔍 [AdminStatusManager] Final quick actions:', {
      actionsCount: actions.length,
      actions: actions.map(a => ({ 
        label: a.label, 
        statusName: a.status.name, 
        statusId: a.status.id,
        variant: a.variant 
      }))
    });

    return actions;
  }, [quote.status, allowedTransitions]);

  const handleQuickAction = (statusConfig: StatusConfig) => {
    setSelectedStatus(statusConfig.name);
    setIsManualChange(false);
    
    // For destructive actions, show confirmation dialog
    if (statusConfig.name === 'rejected' || statusConfig.name === 'cancelled') {
      setShowChangeDialog(true);
    } else {
      handleStatusChange(statusConfig.name);
    }
  };

  const handleManualStatusChange = (newStatus: string) => {
    setSelectedStatus(newStatus);
    setIsManualChange(true);
    setShowChangeDialog(true);
  };

  const handleStatusChange = async (newStatus: string, notes?: string) => {
    try {
      // Validate transition
      if (!isValidTransition(quote.status, newStatus, 'quote')) {
        toast({
          title: 'Invalid Transition',
          description: `Cannot change status from ${quote.status} to ${newStatus}`,
          variant: 'destructive',
        });
        return;
      }

      // Use the parent callback to update the quote through the existing mechanism
      onStatusChange(newStatus, notes);

      // Reset dialog state
      setShowChangeDialog(false);
      setSelectedStatus('');
      setChangeReason('');

      toast({
        title: 'Status Updated',
        description: `Quote status changed to ${getStatusConfig(newStatus, 'quote')?.label || newStatus}`,
      });
    } catch (error) {
      console.error('Failed to update status:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update quote status. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleConfirmStatusChange = () => {
    if (selectedStatus) {
      handleStatusChange(selectedStatus, changeReason);
    }
  };

  if (!currentStatusConfig) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Status Configuration Missing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            No configuration found for status: {quote.status}
          </p>
        </CardContent>
      </Card>
    );
  }

  const StatusIcon = getStatusIcon(currentStatusConfig.icon);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-teal-600" />
            Status Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Status Display */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Current Status</Label>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-50 rounded-lg">
                <StatusIcon className="h-5 w-5 text-gray-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={currentStatusConfig.color}>
                    {currentStatusConfig.label}
                  </Badge>
                  {currentStatusConfig.isTerminal && (
                    <Badge variant="outline" className="text-xs">
                      Final
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {currentStatusConfig.description}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Quick Actions */}
          {quickActions.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Quick Actions</Label>
              <div className="flex flex-wrap gap-2">
                {quickActions.map(({ status, label, variant, icon: ActionIcon }) => (
                  <Button
                    key={status.id}
                    variant={variant}
                    size="sm"
                    onClick={() => handleQuickAction(status)}
                    disabled={isUpdating}
                    className="flex items-center gap-2"
                  >
                    <ActionIcon className="h-4 w-4" />
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Manual Status Change */}
          {!currentStatusConfig.isTerminal && allowedTransitions.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label className="text-sm font-medium">Change Status</Label>
                <Select
                  onValueChange={handleManualStatusChange}
                  disabled={isUpdating}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select new status..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedTransitions.map((status) => {
                      const Icon = getStatusIcon(status.icon);
                      return (
                        <SelectItem key={status.id} value={status.name}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            <span>{status.label}</span>
                            {status.isTerminal && (
                              <Badge variant="outline" className="text-xs ml-1">
                                Final
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Status Info */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Calendar className="h-3 w-3" />
              <span>Last updated: {new Date(quote.updated_at).toLocaleString()}</span>
            </div>
            {currentStatusConfig.autoExpireHours && (
              <div className="flex items-center gap-2 text-xs text-amber-600">
                <Clock className="h-3 w-3" />
                <span>Auto-expires in {currentStatusConfig.autoExpireHours} hours</span>
              </div>
            )}
            {currentStatusConfig.triggersEmail && (
              <div className="flex items-center gap-2 text-xs text-blue-600">
                <MessageSquare className="h-3 w-3" />
                <span>Email notification will be sent</span>
              </div>
            )}
          </div>

          {/* Status History Toggle */}
          <Separator />
          <div className="space-y-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="w-full justify-between p-0 h-auto hover:bg-transparent"
            >
              <span className="text-sm font-medium">Status History</span>
              {showHistory ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
            
            {showHistory && (
              <div className="mt-3">
                <StatusHistory quoteId={quote.id} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
    </>
  );
};