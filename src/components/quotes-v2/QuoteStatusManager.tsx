import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  AlertTriangle,
  Send,
  RefreshCw,
  Info
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useStatusConfig } from '@/providers/StatusConfigProvider';

interface QuoteStatusManagerProps {
  quoteId: string;
  currentStatus: string;
  onStatusChange?: (newStatus: string) => void;
  isEditMode?: boolean;
}

const statusIcons: Record<string, React.ElementType> = {
  pending: Clock,
  sent: FileText,
  approved: CheckCircle,
  rejected: XCircle,
  expired: AlertTriangle,
  calculated: FileText,
  draft: Clock
};

export function QuoteStatusManager({ 
  quoteId, 
  currentStatus, 
  onStatusChange,
  isEditMode = false
}: QuoteStatusManagerProps) {
  const [selectedStatus, setSelectedStatus] = useState(currentStatus);
  const [isUpdating, setIsUpdating] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const { quoteStatuses } = useStatusConfig();

  // Get current status config
  const currentStatusConfig = quoteStatuses.find(s => s.id === currentStatus);
  const allowedTransitions = currentStatusConfig?.allowedTransitions || [];

  // Include calculated and draft statuses if not in config
  const allStatuses = [
    ...quoteStatuses,
    ...(quoteStatuses.find(s => s.id === 'calculated') ? [] : [{
      id: 'calculated',
      label: 'Calculated',
      color: 'secondary' as const,
      icon: 'FileText',
      description: 'Quote has been calculated'
    }]),
    ...(quoteStatuses.find(s => s.id === 'draft') ? [] : [{
      id: 'draft',
      label: 'Draft',
      color: 'secondary' as const,
      icon: 'Clock',
      description: 'Quote is in draft'
    }])
  ];

  const handleStatusUpdate = async () => {
    if (selectedStatus === currentStatus) {
      toast({
        title: 'No Change',
        description: 'Please select a different status',
        variant: 'default'
      });
      return;
    }

    setIsUpdating(true);
    try {
      const updateData: any = {
        status: selectedStatus,
        updated_at: new Date().toISOString()
      };

      // Handle status-specific logic
      if (selectedStatus === 'sent') {
        // Set expiry date to 7 days from now
        updateData.expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      } else if (selectedStatus === 'rejected' && rejectionReason) {
        updateData.revision_reason = rejectionReason;
      } else if (selectedStatus === 'approved') {
        // Clear any rejection/revision reason
        updateData.revision_reason = null;
      }

      const { error } = await supabase
        .from('quotes_v2')
        .update(updateData)
        .eq('id', quoteId);

      if (error) throw error;

      toast({
        title: 'Status Updated',
        description: `Quote status changed to ${selectedStatus}`,
      });

      if (onStatusChange) {
        onStatusChange(selectedStatus);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update quote status',
        variant: 'destructive'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusIcon = (status: string) => {
    const Icon = statusIcons[status] || Clock;
    return <Icon className="h-4 w-4" />;
  };

  const getStatusColor = (status: string): string => {
    const config = allStatuses.find(s => s.id === status);
    const colorMap: Record<string, string> = {
      default: 'bg-green-100 text-green-800',
      secondary: 'bg-gray-100 text-gray-800',
      destructive: 'bg-red-100 text-red-800',
      outline: 'bg-blue-100 text-blue-800'
    };
    return colorMap[config?.color || 'secondary'] || 'bg-gray-100 text-gray-800';
  };

  // Don't show in non-edit mode for new quotes
  if (!isEditMode && !quoteId) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Status Management
        </CardTitle>
        <CardDescription>
          Update the quote status and track workflow
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status Display */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Current Status:</span>
          <Badge className={getStatusColor(currentStatus)}>
            <span className="flex items-center gap-1">
              {getStatusIcon(currentStatus)}
              {currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
            </span>
          </Badge>
        </div>

        {/* Status Change Section */}
        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Change Status To:</label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                {allStatuses.map((status) => {
                  const isAllowed = allowedTransitions.includes(status.id) || 
                                    status.id === currentStatus ||
                                    currentStatus === 'draft' || 
                                    currentStatus === 'calculated';
                  
                  return (
                    <SelectItem 
                      key={status.id} 
                      value={status.id}
                      disabled={!isAllowed}
                    >
                      <div className="flex items-center gap-2">
                        {getStatusIcon(status.id)}
                        <span>{status.label}</span>
                        {!isAllowed && <span className="text-xs text-gray-500">(Not allowed)</span>}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Revision Reason (if rejecting) */}
          {selectedStatus === 'rejected' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason for Rejection (Optional):</label>
              <textarea
                className="w-full min-h-[80px] p-2 border rounded-md"
                placeholder="Enter reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
          )}

          {/* Status Info */}
          {selectedStatus !== currentStatus && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {selectedStatus === 'sent' && 'This will set an expiry date of 7 days and make the quote available to the customer.'}
                {selectedStatus === 'approved' && 'The customer will be able to add this quote to their cart for checkout.'}
                {selectedStatus === 'rejected' && 'The quote will be marked as rejected and the customer will be notified.'}
                {selectedStatus === 'expired' && 'The quote will no longer be valid and cannot be approved.'}
              </AlertDescription>
            </Alert>
          )}

          {/* Update Button */}
          <Button 
            onClick={handleStatusUpdate}
            disabled={isUpdating || selectedStatus === currentStatus}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            {isUpdating ? 'Updating...' : 'Update Status'}
          </Button>
        </div>

        {/* Status Workflow Guide */}
        <div className="pt-4 border-t">
          <p className="text-xs text-gray-600 mb-2">Typical workflow:</p>
          <div className="flex items-center gap-1 text-xs flex-wrap">
            <Badge variant="outline">draft</Badge>
            <span>→</span>
            <Badge variant="outline">calculated</Badge>
            <span>→</span>
            <Badge variant="outline">sent</Badge>
            <span>→</span>
            <Badge variant="outline">approved</Badge>
            <span>/</span>
            <Badge variant="outline">rejected</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}