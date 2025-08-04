/**
 * NCM Order Creation Button Component
 * Manual button interface for admins to create NCM orders for Nepal deliveries
 * Shows eligibility status and provides creation options
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Truck,
  Package,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  MapPin,
  User,
  Clock,
  Info
} from 'lucide-react';
import { ncmOrderCreationService } from '@/services/NCMOrderCreationService';
import { toast } from 'sonner';

interface NCMOrderCreationButtonProps {
  iwishbag_order_id: string;
  order_display_id?: string;
  onOrderCreated?: (result: { ncm_order_id: number; tracking_id: string }) => void;
  className?: string;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'secondary';
}

export function NCMOrderCreationButton({
  iwishbag_order_id,
  order_display_id,
  onOrderCreated,
  className,
  size = 'default',
  variant = 'default'
}: NCMOrderCreationButtonProps) {
  const [eligibility, setEligibility] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [serviceType, setServiceType] = useState<'Pickup' | 'Collect'>('Pickup');
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Check eligibility on mount
  useEffect(() => {
    checkEligibility();
  }, [iwishbag_order_id]);

  const checkEligibility = async () => {
    setLoading(true);
    try {
      const result = await ncmOrderCreationService.checkOrderEligibility(iwishbag_order_id);
      setEligibility(result);
    } catch (error) {
      console.error('Failed to check NCM eligibility:', error);
      setEligibility({
        eligible: false,
        reason: 'Failed to check eligibility'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async () => {
    setCreating(true);
    try {
      const result = await ncmOrderCreationService.createFromPaidOrder(iwishbag_order_id, {
        service_type: serviceType,
        special_instructions: specialInstructions.trim() || undefined
      });

      if (result.success && result.ncm_order_id && result.tracking_id) {
        toast.success('NCM Order Created Successfully!', {
          description: `NCM Order ID: ${result.ncm_order_id}, Tracking: ${result.tracking_id}`
        });

        if (result.warnings && result.warnings.length > 0) {
          result.warnings.forEach(warning => {
            toast.warning('Warning', { description: warning });
          });
        }

        // Close dialog and refresh eligibility
        setDialogOpen(false);
        await checkEligibility();

        // Notify parent component
        if (onOrderCreated) {
          onOrderCreated({
            ncm_order_id: result.ncm_order_id,
            tracking_id: result.tracking_id
          });
        }
      } else {
        toast.error('Failed to Create NCM Order', {
          description: result.error || 'Unknown error occurred'
        });
      }
    } catch (error) {
      console.error('NCM order creation error:', error);
      toast.error('Failed to Create NCM Order', {
        description: 'An unexpected error occurred'
      });
    } finally {
      setCreating(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <Button disabled size={size} variant={variant} className={className}>
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Checking...
      </Button>
    );
  }

  // Not eligible - show disabled button with reason
  if (!eligibility?.eligible) {
    return (
      <div className="flex items-center space-x-2">
        <Button disabled size={size} variant="outline" className={className}>
          <AlertCircle className="w-4 h-4 mr-2 text-gray-400" />
          NCM Not Available
        </Button>
        {eligibility?.reason && (
          <Badge variant="secondary" className="text-xs">
            <Info className="w-3 h-3 mr-1" />
            {eligibility.reason}
          </Badge>
        )}
      </div>
    );
  }

  // Eligible - show create button with dialog
  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button size={size} variant={variant} className={className}>
          <Truck className="w-4 h-4 mr-2" />
          Create NCM Order
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Package className="w-5 h-5 text-blue-600" />
            <span>Create NCM Order</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center space-x-2">
                <User className="w-4 h-4" />
                <span>Order Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-600">iwishBag Order:</span>
                  <span className="font-mono ml-2">{order_display_id || iwishbag_order_id}</span>
                </div>
                <div>
                  <span className="text-gray-600">Destination:</span>
                  <span className="ml-2">
                    {eligibility.order_info?.destination_country === 'NP' ? (
                      <Badge variant="default" className="text-xs">
                        <MapPin className="w-3 h-3 mr-1" />
                        Nepal
                      </Badge>
                    ) : (
                      eligibility.order_info?.destination_country
                    )}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-600">Customer:</span>
                  <span className="ml-2">{eligibility.order_info?.customer_name || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-600">Status:</span>
                  <Badge variant="secondary" className="text-xs ml-2">
                    {eligibility.order_info?.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* NCM Service Options */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center space-x-2">
                <Truck className="w-4 h-4" />
                <span>NCM Service Configuration</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="service-type">Service Type</Label>
                <Select value={serviceType} onValueChange={(value: 'Pickup' | 'Collect') => setServiceType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pickup">
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-green-600" />
                        <div>
                          <div className="font-medium">Pickup Service</div>
                          <div className="text-xs text-gray-500">Door-to-door delivery</div>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="Collect">
                      <div className="flex items-center space-x-2">
                        <Package className="w-4 h-4 text-blue-600" />
                        <div>
                          <div className="font-medium">Collect Service</div>
                          <div className="text-xs text-gray-500">Customer pickup from branch</div>
                        </div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="instructions">Special Instructions (Optional)</Label>
                <Textarea
                  id="instructions"
                  placeholder="Any special delivery instructions for NCM..."
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Information Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <div className="font-medium text-blue-800 mb-1">What happens next?</div>
                <ul className="text-blue-700 space-y-1 text-xs">
                  <li>• NCM order will be created with customer details from the quote</li>
                  <li>• iwishBag tracking ID will be generated for customer tracking</li>
                  <li>• Order status will be updated to "preparing" automatically</li>
                  <li>• Customer can track the order using the same tracking page</li>
                </ul>
              </div>
            </div>
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" asChild>
                <a
                  href="https://demo.nepalcanmove.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  NCM Portal
                </a>
              </Button>
              <Button
                onClick={handleCreateOrder}
                disabled={creating}
                className="min-w-[140px]"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Create NCM Order
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}