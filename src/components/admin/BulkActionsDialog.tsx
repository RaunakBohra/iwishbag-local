import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, AlertTriangle, Info, Ban, Plus, CheckSquare, FileText, MapPin, Trash2 } from 'lucide-react';

interface BulkActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  actionType: 'waive-fees' | 'extend-exemptions' | 'update-status' | 'add-notes' | 'assign-location' | 'delete-packages' | 'custom';
  selectedCount: number;
  selectedIds: string[];
  onConfirm: (data: any) => Promise<void>;
  isLoading?: boolean;
  children?: React.ReactNode;
}

export const BulkActionsDialog: React.FC<BulkActionDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  actionType,
  selectedCount,
  selectedIds,
  onConfirm,
  isLoading = false,
  children,
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  
  const handleConfirm = async () => {
    try {
      await onConfirm({
        ...formData,
        selectedIds,
      });
      setFormData({});
      onOpenChange(false);
    } catch (error) {
      // Error handling is done by parent component
    }
  };

  const renderFormFields = () => {
    switch (actionType) {
      case 'waive-fees':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">Reason for Waiving Fees *</Label>
              <Textarea
                id="reason"
                value={formData.reason || ''}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Enter the reason for waiving storage fees..."
                rows={3}
                required
              />
            </div>
            <Alert>
              <Ban className="h-4 w-4" />
              <AlertDescription>
                This will waive all unpaid storage fees for {selectedCount} selected packages.
                This action cannot be undone.
              </AlertDescription>
            </Alert>
          </div>
        );

      case 'extend-exemptions':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="days">Additional Days *</Label>
                <Input
                  id="days"
                  type="number"
                  value={formData.days || 30}
                  onChange={(e) => setFormData({ ...formData, days: parseInt(e.target.value) || 0 })}
                  min={1}
                  max={365}
                  required
                />
              </div>
              <div>
                <Label htmlFor="exemptionType">Exemption Type</Label>
                <Select
                  value={formData.exemptionType || 'standard'}
                  onValueChange={(value) => setFormData({ ...formData, exemptionType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard Extension</SelectItem>
                    <SelectItem value="special">Special Circumstances</SelectItem>
                    <SelectItem value="promotion">Promotional Extension</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="reason">Reason for Extension *</Label>
              <Textarea
                id="reason"
                value={formData.reason || ''}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Enter the reason for extending storage exemptions..."
                rows={3}
                required
              />
            </div>
            <Alert>
              <Plus className="h-4 w-4" />
              <AlertDescription>
                This will extend storage fee exemptions by {formData.days || 30} days for {selectedCount} selected packages.
              </AlertDescription>
            </Alert>
          </div>
        );

      case 'update-status':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="status">New Status *</Label>
              <Select
                value={formData.status || ''}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="ready_to_ship">Ready to Ship</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="returned">Returned</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="notes">Status Update Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional notes about the status change..."
                rows={2}
              />
            </div>
            <Alert>
              <CheckSquare className="h-4 w-4" />
              <AlertDescription>
                This will update the status to "{formData.status || 'selected status'}" for {selectedCount} selected packages.
              </AlertDescription>
            </Alert>
          </div>
        );

      case 'add-notes':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="notes">Notes to Add *</Label>
              <Textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Enter notes to add to all selected packages..."
                rows={4}
                required
              />
            </div>
            <div>
              <Label htmlFor="noteType">Note Type</Label>
              <Select
                value={formData.noteType || 'general'}
                onValueChange={(value) => setFormData({ ...formData, noteType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Note</SelectItem>
                  <SelectItem value="processing">Processing Note</SelectItem>
                  <SelectItem value="quality">Quality Check</SelectItem>
                  <SelectItem value="customer">Customer Service</SelectItem>
                  <SelectItem value="warehouse">Warehouse Note</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                This will add the specified notes to {selectedCount} selected packages.
              </AlertDescription>
            </Alert>
          </div>
        );

      case 'assign-location':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="location">Storage Location *</Label>
              <Input
                id="location"
                value={formData.location || ''}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Enter storage location (e.g., A1-B2, Section-C, etc.)"
                required
              />
            </div>
            <div>
              <Label htmlFor="notes">Assignment Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional notes about the location assignment..."
                rows={2}
              />
            </div>
            <Alert>
              <MapPin className="h-4 w-4" />
              <AlertDescription>
                This will assign the storage location "{formData.location || '[location]'}" to {selectedCount} selected packages.
              </AlertDescription>
            </Alert>
          </div>
        );

      case 'delete-packages':
        return (
          <div className="space-y-4">
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Warning:</strong> This action cannot be undone. Packages with status 'consolidated', 'shipped', or 'delivered' cannot be deleted.
              </AlertDescription>
            </Alert>
            <div>
              <Label htmlFor="reason">Reason for Deletion *</Label>
              <Textarea
                id="reason"
                value={formData.reason || ''}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Enter a detailed reason for deleting these packages..."
                rows={3}
                required
              />
            </div>
            <div>
              <Label htmlFor="confirmation">Type "DELETE" to confirm *</Label>
              <Input
                id="confirmation"
                value={formData.confirmation || ''}
                onChange={(e) => setFormData({ ...formData, confirmation: e.target.value })}
                placeholder="Type DELETE to confirm"
                required
              />
            </div>
            <Alert className="border-red-200 bg-red-50">
              <Trash2 className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                This will permanently delete {selectedCount} packages and all associated data including photos and storage fees.
              </AlertDescription>
            </Alert>
          </div>
        );

      default:
        return children;
    }
  };

  const isFormValid = () => {
    switch (actionType) {
      case 'waive-fees':
        return formData.reason && formData.reason.trim().length > 0;
      case 'extend-exemptions':
        return formData.reason && formData.reason.trim().length > 0 && formData.days > 0;
      case 'update-status':
        return formData.status && formData.status.length > 0;
      case 'add-notes':
        return formData.notes && formData.notes.trim().length > 0;
      case 'assign-location':
        return formData.location && formData.location.trim().length > 0;
      case 'delete-packages':
        return formData.reason && formData.reason.trim().length > 0 && 
               formData.confirmation === 'DELETE';
      default:
        return true;
    }
  };

  const getIcon = () => {
    switch (actionType) {
      case 'waive-fees':
        return <Ban className="h-4 w-4" />;
      case 'extend-exemptions':
        return <Plus className="h-4 w-4" />;
      case 'update-status':
        return <CheckSquare className="h-4 w-4" />;
      case 'add-notes':
        return <FileText className="h-4 w-4" />;
      case 'assign-location':
        return <MapPin className="h-4 w-4" />;
      case 'delete-packages':
        return <Trash2 className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcon()}
            {title}
          </DialogTitle>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {/* Selection Summary */}
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <Info className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              Action will be applied to 
              <Badge variant="secondary" className="mx-1">
                {selectedCount} items
              </Badge>
            </span>
          </div>

          <Separator />

          {/* Form Fields */}
          {renderFormFields()}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isFormValid() || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                {getIcon()}
                <span className="ml-2">Confirm Action</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};