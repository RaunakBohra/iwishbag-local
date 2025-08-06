/**
 * Refund Details Dialog
 * Handles detailed refund review, processing, and status updates
 * Extracted from ReturnManagementDashboard for better maintainability
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  DollarSign,
  CreditCard,
  Loader2,
  User,
  Calendar,
  FileText,
} from 'lucide-react';
import { formatCurrency } from '@/utils/currencyConversion';
import { format } from 'date-fns';

interface RefundRequest {
  id: string;
  quote_id: string;
  quote?: {
    display_id: string;
    user_id: string;
    user?: {
      full_name: string;
      email: string;
    };
  };
  refund_type: string;
  requested_amount: number;
  approved_amount?: number;
  currency: string;
  status: string;
  reason_code: string;
  reason_description: string;
  customer_notes?: string;
  internal_notes?: string;
  refund_method?: string;
  requested_by: string;
  requested_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  processed_by?: string;
  processed_at?: string;
  completed_at?: string;
  created_at: string;
}

interface RefundDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  refund: RefundRequest | null;
  onUpdate: (updates: Partial<RefundRequest>) => void;
  onProcess?: (refund: RefundRequest) => void;
  isProcessing?: boolean;
}

export const RefundDetailsDialog: React.FC<RefundDetailsDialogProps> = ({
  open,
  onOpenChange,
  refund,
  onUpdate,
  onProcess,
  isProcessing = false,
}) => {
  const [localRefund, setLocalRefund] = useState<RefundRequest | null>(refund);
  const [internalNotes, setInternalNotes] = useState('');

  React.useEffect(() => {
    if (refund) {
      setLocalRefund(refund);
      setInternalNotes(refund.internal_notes || '');
    }
  }, [refund]);

  if (!localRefund) return null;

  const getStatusBadge = (status: string) => {
    const badgeMap = {
      pending: { variant: 'secondary' as const, icon: Clock, color: 'text-yellow-600' },
      approved: { variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
      rejected: { variant: 'destructive' as const, icon: XCircle, color: 'text-red-600' },
      processing: { variant: 'default' as const, icon: Loader2, color: 'text-blue-600' },
      completed: { variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
    };

    const config = badgeMap[status as keyof typeof badgeMap] || badgeMap.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className={`w-3 h-3 ${config.color} ${status === 'processing' ? 'animate-spin' : ''}`} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleStatusChange = (newStatus: string) => {
    const updatedRefund = { ...localRefund, status: newStatus };
    setLocalRefund(updatedRefund);
  };

  const handleApprovedAmountChange = (amount: number) => {
    const updatedRefund = { ...localRefund, approved_amount: amount };
    setLocalRefund(updatedRefund);
  };

  const handleSave = () => {
    onUpdate({
      ...localRefund,
      internal_notes: internalNotes,
    });
    onOpenChange(false);
  };

  const handleProcess = () => {
    if (onProcess && localRefund) {
      onProcess({
        ...localRefund,
        internal_notes: internalNotes,
      });
    }
  };

  const canProcess = localRefund.status === 'approved' && localRefund.approved_amount && localRefund.approved_amount > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Refund Request Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Quote ID</Label>
              <p className="font-mono font-medium">{localRefund.quote?.display_id}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Current Status</Label>
              <div className="mt-1">{getStatusBadge(localRefund.status)}</div>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Requested Amount</Label>
              <p className="font-semibold text-lg">
                {formatCurrency(localRefund.requested_amount, localRefund.currency)}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Refund Type</Label>
              <Badge variant="outline">{localRefund.refund_type}</Badge>
            </div>
          </div>

          <Separator />

          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <User className="w-4 h-4" />
              Customer Information
            </h3>
            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
              <div>
                <Label className="text-sm text-muted-foreground">Name</Label>
                <p className="font-medium">{localRefund.quote?.user?.full_name || 'Unknown'}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Email</Label>
                <p className="text-sm">{localRefund.quote?.user?.email}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Refund Reason */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Refund Details
            </h3>
            <div className="space-y-3">
              <div>
                <Label className="text-sm text-muted-foreground">Reason Code</Label>
                <p className="capitalize">{localRefund.reason_code.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Reason Description</Label>
                <p className="text-sm bg-gray-50 p-3 rounded">{localRefund.reason_description}</p>
              </div>
              {localRefund.customer_notes && (
                <div>
                  <Label className="text-sm text-muted-foreground">Customer Notes</Label>
                  <p className="text-sm bg-gray-50 p-3 rounded">{localRefund.customer_notes}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Admin Actions */}
          <div className="space-y-4">
            <h3 className="font-medium">Admin Actions</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Update Status</Label>
                <Select
                  value={localRefund.status}
                  onValueChange={handleStatusChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(localRefund.status === 'approved' || localRefund.status === 'processing') && (
                <div>
                  <Label>Approved Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={localRefund.approved_amount || localRefund.requested_amount}
                    onChange={(e) => handleApprovedAmountChange(parseFloat(e.target.value))}
                    placeholder="Enter approved amount"
                  />
                </div>
              )}
            </div>

            <div>
              <Label>Internal Notes</Label>
              <Textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Add internal notes for this refund..."
                className="min-h-[80px]"
              />
            </div>

            {localRefund.status === 'approved' && !localRefund.processed_at && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This refund is approved and ready to be processed. Click "Process Refund" to initiate the payment.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Timeline */}
          <Separator />
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Timeline
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 pb-2 border-b">
                <Clock className="w-4 h-4 text-blue-600" />
                <div>
                  <p className="font-medium">Refund Requested</p>
                  <p className="text-muted-foreground">
                    {format(new Date(localRefund.requested_at), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
              </div>

              {localRefund.reviewed_at && (
                <div className="flex items-center gap-3 pb-2 border-b">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <div>
                    <p className="font-medium">Reviewed</p>
                    <p className="text-muted-foreground">
                      {format(new Date(localRefund.reviewed_at), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                </div>
              )}

              {localRefund.processed_at && (
                <div className="flex items-center gap-3 pb-2 border-b">
                  <CreditCard className="w-4 h-4 text-purple-600" />
                  <div>
                    <p className="font-medium">Processed</p>
                    <p className="text-muted-foreground">
                      {format(new Date(localRefund.processed_at), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                </div>
              )}

              {localRefund.completed_at && (
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <div>
                    <p className="font-medium">Completed</p>
                    <p className="text-muted-foreground">
                      {format(new Date(localRefund.completed_at), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
          {canProcess && onProcess && (
            <Button
              onClick={handleProcess}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Process Refund
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};