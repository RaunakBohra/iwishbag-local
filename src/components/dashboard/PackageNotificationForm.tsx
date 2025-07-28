/**
 * Package Notification Form - Customer Interface
 * 
 * Allows customers to notify the warehouse about incoming packages
 */

import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Package,
  Truck,
  Calendar,
  Scale,
  DollarSign,
  MapPin,
  Plus,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  Edit,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import {
  customerPackageNotificationService,
  type CustomerPackageNotification,
  type PackageNotificationFormData,
} from '@/services/CustomerPackageNotificationService';

interface PackageNotificationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingNotification?: CustomerPackageNotification | null;
}

export const PackageNotificationForm: React.FC<PackageNotificationFormProps> = ({
  open,
  onOpenChange,
  editingNotification,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<PackageNotificationFormData>({
    customer_address_id: '',
    carrier: 'ups',
    tracking_number: '',
    sender_name: '',
    sender_store: '',
    expected_delivery_date: '',
    estimated_weight_kg: undefined,
    estimated_value_usd: undefined,
    package_description: '',
    special_instructions: '',
  });

  // Get customer addresses
  const { data: addresses = [] } = useQuery({
    queryKey: ['customer-addresses', user?.id],
    queryFn: () => user ? customerPackageNotificationService.getCustomerAddresses(user.id) : [],
    enabled: !!user && open,
  });

  // Reset form when dialog opens/closes or editing notification changes
  useEffect(() => {
    if (editingNotification) {
      setFormData({
        customer_address_id: editingNotification.customer_address_id,
        carrier: editingNotification.carrier,
        tracking_number: editingNotification.tracking_number || '',
        sender_name: editingNotification.sender_name || '',
        sender_store: editingNotification.sender_store || '',
        expected_delivery_date: editingNotification.expected_delivery_date 
          ? editingNotification.expected_delivery_date.split('T')[0] 
          : '',
        estimated_weight_kg: editingNotification.estimated_weight_kg,
        estimated_value_usd: editingNotification.estimated_value_usd,
        package_description: editingNotification.package_description || '',
        special_instructions: editingNotification.special_instructions || '',
      });
    } else {
      setFormData({
        customer_address_id: addresses[0]?.id || '',
        carrier: 'ups',
        tracking_number: '',
        sender_name: '',
        sender_store: '',
        expected_delivery_date: '',
        estimated_weight_kg: undefined,
        estimated_value_usd: undefined,
        package_description: '',
        special_instructions: '',
      });
    }
  }, [editingNotification, addresses, open]);

  // Submit notification mutation
  const submitNotificationMutation = useMutation({
    mutationFn: async (data: PackageNotificationFormData) => {
      if (!user) throw new Error('User not authenticated');
      
      if (editingNotification) {
        return customerPackageNotificationService.updatePackageNotification(
          editingNotification.id,
          data
        );
      } else {
        return customerPackageNotificationService.submitPackageNotification(user.id, data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-package-notifications'] });
      toast({
        title: editingNotification ? 'Notification Updated' : 'Notification Submitted',
        description: editingNotification 
          ? 'Your package notification has been updated successfully.'
          : 'Your package notification has been submitted to the warehouse.',
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: 'Submission Failed',
        description: error instanceof Error ? error.message : 'Failed to submit notification',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customer_address_id) {
      toast({
        title: 'Validation Error',
        description: 'Please select a delivery address.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.package_description?.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please provide a package description.',
        variant: 'destructive',
      });
      return;
    }

    submitNotificationMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof PackageNotificationFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {editingNotification ? 'Edit Package Notification' : 'Notify Warehouse - Incoming Package'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Let us know when you're expecting a package so we can prepare for its arrival.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Delivery Address */}
          <div>
            <Label htmlFor="address">Delivery Address *</Label>
            <Select
              value={formData.customer_address_id}
              onValueChange={(value) => handleInputChange('customer_address_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select delivery address" />
              </SelectTrigger>
              <SelectContent>
                {addresses.map((address) => (
                  <SelectItem key={address.id} value={address.id}>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {address.suite_number} - {address.full_address}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {addresses.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                No addresses available. Please contact support to set up your virtual address.
              </p>
            )}
          </div>

          {/* Tracking & Carrier */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="carrier">Carrier *</Label>
              <Select
                value={formData.carrier}
                onValueChange={(value) => handleInputChange('carrier', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ups">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      UPS
                    </div>
                  </SelectItem>
                  <SelectItem value="fedex">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      FedEx
                    </div>
                  </SelectItem>
                  <SelectItem value="usps">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      USPS
                    </div>
                  </SelectItem>
                  <SelectItem value="dhl">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      DHL
                    </div>
                  </SelectItem>
                  <SelectItem value="amazon">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      Amazon
                    </div>
                  </SelectItem>
                  <SelectItem value="other">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      Other
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="tracking">Tracking Number</Label>
              <Input
                id="tracking"
                value={formData.tracking_number}
                onChange={(e) => handleInputChange('tracking_number', e.target.value)}
                placeholder="1Z999AA1234567890"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Optional but helpful for tracking
              </p>
            </div>
          </div>

          {/* Sender Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sender">Sender Name</Label>
              <Input
                id="sender"
                value={formData.sender_name}
                onChange={(e) => handleInputChange('sender_name', e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div>
              <Label htmlFor="store">Store/Retailer</Label>
              <Input
                id="store"
                value={formData.sender_store}
                onChange={(e) => handleInputChange('sender_store', e.target.value)}
                placeholder="Amazon, eBay, Best Buy, etc."
              />
            </div>
          </div>

          {/* Package Details */}
          <div>
            <Label htmlFor="description">Package Description *</Label>
            <Textarea
              id="description"
              value={formData.package_description}
              onChange={(e) => handleInputChange('package_description', e.target.value)}
              placeholder="Electronics, clothing, books, etc. Be specific to help us identify your package."
              rows={3}
              required
            />
          </div>

          {/* Expected Delivery & Estimates */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="delivery-date">Expected Delivery</Label>
              <Input
                id="delivery-date"
                type="date"
                value={formData.expected_delivery_date}
                onChange={(e) => handleInputChange('expected_delivery_date', e.target.value)}
                min={getTomorrowDate()}
              />
            </div>
            <div>
              <Label htmlFor="weight">Est. Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                value={formData.estimated_weight_kg || ''}
                onChange={(e) => handleInputChange('estimated_weight_kg', parseFloat(e.target.value) || undefined)}
                placeholder="1.5"
              />
            </div>
            <div>
              <Label htmlFor="value">Est. Value (USD)</Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                value={formData.estimated_value_usd || ''}
                onChange={(e) => handleInputChange('estimated_value_usd', parseFloat(e.target.value) || undefined)}
                placeholder="100.00"
              />
            </div>
          </div>

          {/* Special Instructions */}
          <div>
            <Label htmlFor="instructions">Special Instructions</Label>
            <Textarea
              id="instructions"
              value={formData.special_instructions}
              onChange={(e) => handleInputChange('special_instructions', e.target.value)}
              placeholder="Any special handling requirements, fragile items, etc."
              rows={2}
            />
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Note:</strong> This notification helps our warehouse team prepare for your package. 
              We'll confirm receipt when it arrives and update you on any status changes.
            </AlertDescription>
          </Alert>
        </form>

        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={submitNotificationMutation.isPending}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={submitNotificationMutation.isPending}
          >
            {submitNotificationMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {editingNotification ? 'Updating...' : 'Submitting...'}
              </>
            ) : (
              <>
                <Package className="h-4 w-4 mr-2" />
                {editingNotification ? 'Update Notification' : 'Notify Warehouse'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};