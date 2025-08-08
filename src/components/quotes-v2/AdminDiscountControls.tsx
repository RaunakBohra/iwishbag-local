import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { getDiscountService, type ApplicableDiscount } from '@/services/unified/DiscountService';
import { 
  Settings,
  Percent,
  DollarSign,
  Plus,
  X,
  Truck,
  Package,
  CheckCircle
} from 'lucide-react';

interface DiscountItem {
  id: string;
  type: 'order' | 'shipping' | 'item';
  method: 'percentage' | 'fixed' | 'free';
  value: number;
  label: string;
  applied: boolean;
}

interface AdminDiscountControlsProps {
  currencySymbol?: string;
  currency?: string; // Add explicit currency prop
  onDiscountChange?: (discounts: DiscountItem[]) => void;
  className?: string;
  customerId?: string;
  quoteId?: string;
  orderTotal?: number;
  countryCode?: string;
}

export const AdminDiscountControls: React.FC<AdminDiscountControlsProps> = ({
  currencySymbol = '$',
  currency,
  onDiscountChange,
  className,
  customerId,
  quoteId,
  orderTotal = 0,
  countryCode
}) => {
  const [discounts, setDiscounts] = useState<DiscountItem[]>([]);
  const [newDiscount, setNewDiscount] = useState({
    type: 'order' as const,
    method: 'percentage' as const,
    value: 0
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  
  const discountService = getDiscountService();

  const discountTypeOptions = [
    { value: 'order', label: 'Order Total', icon: Package },
    { value: 'shipping', label: 'Shipping', icon: Truck }
  ];

  const addDiscount = async () => {
    if (newDiscount.value <= 0) return;
    
    setIsApplying(true);
    
    try {
      const discount: DiscountItem = {
        id: Date.now().toString(),
        type: newDiscount.type,
        method: newDiscount.method,
        value: newDiscount.value,
        label: getDiscountLabel(newDiscount),
        applied: true
      };

      // For admin discounts, we create a manual discount that doesn't require validation
      // but should be tracked if we have customer and quote info
      if (customerId && quoteId && orderTotal > 0) {
        try {
          // Create an ApplicableDiscount for tracking
          const trackingDiscount: ApplicableDiscount = {
            discount_source: 'code', // Use 'code' for admin override
            discount_type: newDiscount.method === 'percentage' ? 'percentage' : 'fixed_amount',
            discount_value: newDiscount.value,
            discount_amount: newDiscount.method === 'percentage' 
              ? (orderTotal * (newDiscount.value / 100))
              : Math.min(newDiscount.value, orderTotal),
            applies_to: newDiscount.type === 'shipping' ? 'shipping' : 'total',
            is_stackable: true,
            description: `Admin Override: ${getDiscountLabel(newDiscount)}`,
            priority: 0 // High priority for admin discounts
          };
          
          // Track the usage (optional - won't fail if it doesn't work)
          await discountService.recordDiscountUsage(
            customerId,
            [trackingDiscount],
            quoteId,
            undefined, // orderId
            orderTotal,
            currency || (currencySymbol === '$' ? 'USD' : 
              countryCode ? 
                (() => {
                  // Try to infer currency from country code
                  const { getDestinationCurrency } = require('@/utils/originCurrency');
                  return getDestinationCurrency(countryCode);
                })() : 'USD')
          );
          
          console.log('Admin discount tracked successfully');
        } catch (trackingError) {
          console.warn('Failed to track admin discount usage:', trackingError);
          // Don't fail the discount application if tracking fails
        }
      }

      const updatedDiscounts = [...discounts, discount];
      setDiscounts(updatedDiscounts);
      onDiscountChange?.(updatedDiscounts);
      
      // Reset form
      setNewDiscount({
        type: 'order',
        method: 'percentage',
        value: 0
      });
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding admin discount:', error);
    } finally {
      setIsApplying(false);
    }
  };

  const removeDiscount = (id: string) => {
    const updatedDiscounts = discounts.filter(d => d.id !== id);
    setDiscounts(updatedDiscounts);
    onDiscountChange?.(updatedDiscounts);
  };

  const toggleDiscount = (id: string) => {
    const updatedDiscounts = discounts.map(d => 
      d.id === id ? { ...d, applied: !d.applied } : d
    );
    setDiscounts(updatedDiscounts);
    onDiscountChange?.(updatedDiscounts);
  };

  const getDiscountLabel = (discount: typeof newDiscount) => {
    const typeLabel = discountTypeOptions.find(opt => opt.value === discount.type)?.label || '';
    
    if (discount.method === 'free' && discount.type === 'shipping') {
      return 'Free Shipping';
    }
    
    const valueStr = discount.method === 'percentage' 
      ? `${discount.value}% off`
      : `${currencySymbol}${discount.value} off`;
    
    return `${valueStr} ${typeLabel}`;
  };

  const totalDiscountValue = discounts
    .filter(d => d.applied && d.method === 'fixed')
    .reduce((sum, d) => sum + d.value, 0);

  return (
    <Card className={`border-orange-200 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings className="w-4 h-4 text-orange-600" />
          Admin Discounts
          {discounts.some(d => d.applied) && (
            <Badge className="bg-orange-100 text-orange-800 border-orange-300">
              {discounts.filter(d => d.applied).length} active
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Applied Discounts */}
        {discounts.length > 0 && (
          <div className="space-y-2">
            {discounts.map((discount) => (
              <div 
                key={discount.id}
                className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                  discount.applied 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-gray-50 border-gray-200 opacity-60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleDiscount(discount.id)}
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                      discount.applied
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-300 hover:border-green-400'
                    }`}
                  >
                    {discount.applied && <CheckCircle className="w-3 h-3" />}
                  </button>
                  <span className={`text-sm font-medium ${
                    discount.applied ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    {discount.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {discount.applied && (
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                      Applied
                    </Badge>
                  )}
                  <Button
                    onClick={() => removeDiscount(discount.id)}
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add New Discount Form */}
        {showAddForm ? (
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Select 
                value={newDiscount.type} 
                onValueChange={(value: 'order' | 'shipping') => 
                  setNewDiscount(prev => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger className="h-9 text-sm border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500 focus:ring-offset-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {discountTypeOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <option.icon className="w-3 h-3" />
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select 
                value={newDiscount.method} 
                onValueChange={(value: 'percentage' | 'fixed' | 'free') => {
                  setNewDiscount(prev => ({ 
                    ...prev, 
                    method: value,
                    value: value === 'free' ? 100 : prev.value 
                  }));
                }}
              >
                <SelectTrigger className="h-9 text-sm border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500 focus:ring-offset-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">
                    <div className="flex items-center gap-2">
                      <Percent className="w-3 h-3" />
                      Percentage
                    </div>
                  </SelectItem>
                  <SelectItem value="fixed">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-3 h-3" />
                      Fixed Amount
                    </div>
                  </SelectItem>
                  {newDiscount.type === 'shipping' && (
                    <SelectItem value="free">
                      <div className="flex items-center gap-2">
                        <Truck className="w-3 h-3" />
                        Free
                      </div>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {newDiscount.method !== 'free' && (
              <Input
                type="number"
                min="0"
                step={newDiscount.method === 'percentage' ? '1' : '0.01'}
                max={newDiscount.method === 'percentage' ? '100' : undefined}
                value={newDiscount.value || ''}
                onChange={(e) => setNewDiscount(prev => ({ 
                  ...prev, 
                  value: parseFloat(e.target.value) || 0 
                }))}
                placeholder={newDiscount.method === 'percentage' ? '10' : '5.00'}
                className="h-9 text-sm border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500 focus:ring-offset-0"
              />
            )}

            <div className="flex gap-2">
              <Button 
                onClick={addDiscount} 
                size="sm" 
                className="flex-1"
                disabled={isApplying}
              >
                {isApplying ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1" />
                    Applying...
                  </>
                ) : (
                  <>
                    <Plus className="w-3 h-3 mr-1" />
                    Add Discount
                  </>
                )}
              </Button>
              <Button 
                onClick={() => setShowAddForm(false)} 
                variant="outline" 
                size="sm"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            onClick={() => setShowAddForm(true)}
            variant="outline"
            className="w-full border-dashed border-orange-300 text-orange-600 hover:bg-orange-50"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Admin Discount
          </Button>
        )}

        {/* Summary */}
        {totalDiscountValue > 0 && (
          <div className="pt-2 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">Total Fixed Discounts:</span>
              <span className="font-semibold text-orange-700">{currencySymbol}{totalDiscountValue.toFixed(2)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};