/**
 * Return Details Dialog
 * Handles package return details, label generation, and shipping management
 * Extracted from ReturnManagementDashboard for better maintainability
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Package,
  Truck,
  Upload,
  Download,
  CheckCircle,
  Clock,
  User,
  Calendar,
  FileText,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';

interface PackageReturn {
  id: string;
  rma_number: string;
  quote_id: string;
  quote?: {
    display_id: string;
    user_id: string;
    user?: {
      full_name: string;
      email: string;
    };
  };
  return_reason: string;
  status: string;
  return_type: string;
  customer_notes?: string;
  internal_notes?: string;
  shipping_carrier?: string;
  tracking_number?: string;
  return_label_url?: string;
  pickup_scheduled?: boolean;
  pickup_date?: string;
  received_date?: string;
  condition_assessment?: string;
  created_at: string;
  updated_at: string;
}

interface ReturnDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packageReturn: PackageReturn | null;
  onUpdate: (updates: Partial<PackageReturn>) => void;
  onGenerateLabel?: (packageReturn: PackageReturn) => void;
  onSchedulePickup?: (packageReturn: PackageReturn) => void;
  isGeneratingLabel?: boolean;
}

export const ReturnDetailsDialog: React.FC<ReturnDetailsDialogProps> = ({
  open,
  onOpenChange,
  packageReturn,
  onUpdate,
  onGenerateLabel,
  onSchedulePickup,
  isGeneratingLabel = false,
}) => {
  const [localReturn, setLocalReturn] = useState<PackageReturn | null>(packageReturn);
  const [internalNotes, setInternalNotes] = useState('');

  React.useEffect(() => {
    if (packageReturn) {
      setLocalReturn(packageReturn);
      setInternalNotes(packageReturn.internal_notes || '');
    }
  }, [packageReturn]);

  if (!localReturn) return null;

  const getStatusBadge = (status: string) => {
    const badgeMap = {
      pending: { variant: 'secondary' as const, icon: Clock, color: 'text-yellow-600' },
      approved: { variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
      label_generated: { variant: 'default' as const, icon: Upload, color: 'text-blue-600' },
      in_transit: { variant: 'default' as const, icon: Truck, color: 'text-purple-600' },
      received: { variant: 'default' as const, icon: Package, color: 'text-indigo-600' },
      processed: { variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
      completed: { variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
    };

    const config = badgeMap[status as keyof typeof badgeMap] || badgeMap.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className={`w-3 h-3 ${config.color}`} />
        {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
      </Badge>
    );
  };

  const handleStatusChange = (newStatus: string) => {
    const updatedReturn = { ...localReturn, status: newStatus };
    setLocalReturn(updatedReturn);
  };

  const handleSave = () => {
    onUpdate({
      ...localReturn,
      internal_notes: internalNotes,
    });
    onOpenChange(false);
  };

  const handleGenerateLabel = () => {
    if (onGenerateLabel && localReturn) {
      onGenerateLabel(localReturn);
    }
  };

  const handleSchedulePickup = () => {
    if (onSchedulePickup && localReturn) {
      onSchedulePickup(localReturn);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Package Return Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">RMA Number</Label>
              <p className="font-mono font-medium">{localReturn.rma_number}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Status</Label>
              <div className="mt-1">{getStatusBadge(localReturn.status)}</div>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Quote ID</Label>
              <p className="font-mono">{localReturn.quote?.display_id}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Return Type</Label>
              <Badge variant="outline">{localReturn.return_type}</Badge>
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
                <p className="font-medium">{localReturn.quote?.user?.full_name || 'Unknown'}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Email</Label>
                <p className="text-sm">{localReturn.quote?.user?.email}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Return Details */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Return Details
            </h3>
            <div className="space-y-3">
              <div>
                <Label className="text-sm text-muted-foreground">Return Reason</Label>
                <p className="text-sm bg-gray-50 p-3 rounded">{localReturn.return_reason}</p>
              </div>
              {localReturn.customer_notes && (
                <div>
                  <Label className="text-sm text-muted-foreground">Customer Notes</Label>
                  <p className="text-sm bg-gray-50 p-3 rounded">{localReturn.customer_notes}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Shipping Information */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Truck className="w-4 h-4" />
              Shipping Information
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">Shipping Carrier</Label>
                <p className="font-medium">
                  {localReturn.shipping_carrier || 'Not assigned'}
                </p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Tracking Number</Label>
                <p className="font-mono text-sm">
                  {localReturn.tracking_number || 'Not available'}
                </p>
              </div>
            </div>

            {/* Return Label */}
            {localReturn.return_label_url ? (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-green-900">Return Label Generated</p>
                    <p className="text-sm text-green-700">Customer can download and use this label</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-green-700 border-green-300 hover:bg-green-100"
                    onClick={() => window.open(localReturn.return_label_url, '_blank')}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </div>
            ) : localReturn.status === 'approved' ? (
              <Alert>
                <Upload className="h-4 w-4" />
                <AlertDescription>
                  This return is approved. Generate a return shipping label for the customer.
                </AlertDescription>
              </Alert>
            ) : null}

            {/* Pickup Information */}
            {localReturn.pickup_scheduled && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-600" />
                  <p className="font-medium text-blue-900">Pickup Scheduled</p>
                </div>
                {localReturn.pickup_date && (
                  <p className="text-sm text-blue-700 mt-1">
                    Pickup Date: {format(new Date(localReturn.pickup_date), 'MMM dd, yyyy')}
                  </p>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Admin Actions */}
          <div className="space-y-4">
            <h3 className="font-medium">Admin Actions</h3>
            
            <div>
              <Label>Update Status</Label>
              <Select
                value={localReturn.status}
                onValueChange={handleStatusChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="label_generated">Label Generated</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="processed">Processed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Internal Notes</Label>
              <Textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Add internal notes for this return..."
                className="min-h-[80px]"
              />
            </div>
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
                  <p className="font-medium">Return Requested</p>
                  <p className="text-muted-foreground">
                    {format(new Date(localReturn.created_at), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
              </div>

              {localReturn.pickup_date && (
                <div className="flex items-center gap-3 pb-2 border-b">
                  <Truck className="w-4 h-4 text-purple-600" />
                  <div>
                    <p className="font-medium">Pickup Scheduled</p>
                    <p className="text-muted-foreground">
                      {format(new Date(localReturn.pickup_date), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                </div>
              )}

              {localReturn.received_date && (
                <div className="flex items-center gap-3">
                  <Package className="w-4 h-4 text-green-600" />
                  <div>
                    <p className="font-medium">Package Received</p>
                    <p className="text-muted-foreground">
                      {format(new Date(localReturn.received_date), 'MMM dd, yyyy HH:mm')}
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
          {localReturn.status === 'approved' && !localReturn.return_label_url && onGenerateLabel && (
            <Button
              onClick={handleGenerateLabel}
              disabled={isGeneratingLabel}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isGeneratingLabel ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Generate Label
                </>
              )}
            </Button>
          )}
          {localReturn.status === 'approved' && !localReturn.pickup_scheduled && onSchedulePickup && (
            <Button
              onClick={handleSchedulePickup}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Truck className="w-4 h-4 mr-2" />
              Schedule Pickup
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};