import React, { useState } from 'react';
import { useShippingRoutes } from '../../hooks/useShippingRoutes';
import { useAllCountries } from '../../hooks/useAllCountries';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useToast } from '../../hooks/use-toast';
import { useCountryUtils } from '../../lib/countryUtils';
import { getCurrencySymbolFromCountry } from '../../lib/currencyUtils';
import type {
  ShippingRouteFormData,
  DeliveryOption,
  WeightTier,
  Carrier,
} from '../../types/shipping';
import type { Tables } from '../../integrations/supabase/types';
import { CustomsTiersManager } from './CustomsTiersManager';
import { CurrencyInputLabel } from './DualCurrencyDisplay';
import { ExchangeRateManager } from './ExchangeRateManager';
import { ShippingRouteDisplay } from '../shared/ShippingRouteDisplay';

interface ShippingRouteFormProps {
  onSubmit: (data: ShippingRouteFormData) => Promise<boolean>;
  onCancel: () => void;
  initialData?: Partial<ShippingRouteFormData>;
}

function ShippingRouteForm({ onSubmit, onCancel, initialData }: ShippingRouteFormProps) {
  const { data: countries = [] } = useAllCountries();
  const [formData, setFormData] = useState<ShippingRouteFormData>({
    originCountry: initialData?.originCountry || '',
    destinationCountry: initialData?.destinationCountry || '',
    baseShippingCost: initialData?.baseShippingCost || 0,
    costPerKg: initialData?.costPerKg || 0,
    shippingPerKg: initialData?.shippingPerKg || 0,
    costPercentage: initialData?.costPercentage || 0,
    processingDays: initialData?.processingDays || 2,
    customsClearanceDays: initialData?.customsClearanceDays || 3,
    weightUnit: initialData?.weightUnit || 'kg',
    deliveryOptions: initialData?.deliveryOptions || [
      {
        id: 'express',
        name: 'Express Delivery',
        carrier: 'DHL',
        min_days: 3,
        max_days: 5,
        price: 45.0,
        active: true,
      },
      {
        id: 'standard',
        name: 'Standard Delivery',
        carrier: 'FedEx',
        min_days: 7,
        max_days: 12,
        price: 25.0,
        active: true,
      },
      {
        id: 'economy',
        name: 'Economy Delivery',
        carrier: 'USPS',
        min_days: 14,
        max_days: 21,
        price: 15.0,
        active: true,
      },
    ],
    weightTiers: initialData?.weightTiers || [
      { min: 0, max: 1, cost: 15.0 },
      { min: 1, max: 3, cost: 25.0 },
      { min: 3, max: 5, cost: 35.0 },
      { min: 5, max: null, cost: 45.0 },
    ],
    carriers: initialData?.carriers || [
      { name: 'DHL', costMultiplier: 1.0, days: '3-5' },
      { name: 'FedEx', costMultiplier: 0.9, days: '5-7' },
      { name: 'USPS', costMultiplier: 0.7, days: '7-14' },
    ],
    maxWeight: initialData?.maxWeight,
    restrictedItems: initialData?.restrictedItems || [],
    requiresDocumentation: initialData?.requiresDocumentation || false,
    isActive: initialData?.isActive !== undefined ? initialData.isActive : true,
    exchangeRate: initialData?.exchangeRate ?? 1,
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Transform form data to match database schema
      const _dbData = {
        origin_country: formData.originCountry,
        destination_country: formData.destinationCountry,
        base_shipping_cost: formData.baseShippingCost,
        cost_per_kg: formData.costPerKg,
        shipping_per_kg: formData.shippingPerKg,
        cost_percentage: formData.costPercentage,
        processing_days: formData.processingDays,
        customs_clearance_days: formData.customsClearanceDays,
        weight_unit: formData.weightUnit,
        delivery_options: formData.deliveryOptions,
        weight_tiers: formData.weightTiers,
        carriers: formData.carriers,
        max_weight: formData.maxWeight,
        restricted_items: formData.restrictedItems,
        requires_documentation: formData.requiresDocumentation,
        is_active: formData.isActive,
        exchange_rate: formData.exchangeRate,
      };

      const result = await onSubmit(formData);
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Shipping route saved successfully',
        });
        onCancel();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to save shipping route',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addWeightTier = () => {
    setFormData((prev) => ({
      ...prev,
      weightTiers: [...prev.weightTiers, { min: 0, max: null, cost: 0 }],
    }));
  };
  const removeWeightTier = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      weightTiers: prev.weightTiers.filter((_, i) => i !== index),
    }));
  };
  const updateWeightTier = (index: number, field: keyof WeightTier, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      weightTiers: prev.weightTiers.map((tier, i) =>
        i === index ? { ...tier, [field]: value } : tier,
      ),
    }));
  };

  const addDeliveryOption = () => {
    setFormData((prev) => ({
      ...prev,
      deliveryOptions: [
        ...prev.deliveryOptions,
        {
          id: `option_${Date.now()}`,
          name: 'New Option',
          carrier: 'DHL',
          min_days: 5,
          max_days: 10,
          price: 25.0,
          active: true,
        },
      ],
    }));
  };

  const removeDeliveryOption = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      deliveryOptions: prev.deliveryOptions.filter((_, i) => i !== index),
    }));
  };

  const updateDeliveryOption = (
    index: number,
    field: keyof DeliveryOption,
    value: string | number | boolean,
  ) => {
    setFormData((prev) => ({
      ...prev,
      deliveryOptions: prev.deliveryOptions.map((option, i) =>
        i === index ? { ...option, [field]: value } : option,
      ),
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="originCountry">Origin Country</Label>
          <Select
            value={formData.originCountry}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, originCountry: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select origin country" />
            </SelectTrigger>
            <SelectContent>
              {countries.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  {country.name} ({country.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="destinationCountry">Destination Country</Label>
          <Select
            value={formData.destinationCountry}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, destinationCountry: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select destination country" />
            </SelectTrigger>
            <SelectContent>
              {countries.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  {country.name} ({country.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Shipping Costs */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Shipping Costs</h3>
        {formData.originCountry && (
          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
            <strong>Currency:</strong> All costs below should be entered in{' '}
            {getCurrencySymbolFromCountry(formData.originCountry)} ({formData.originCountry}{' '}
            currency)
          </div>
        )}
        <div className="grid grid-cols-5 gap-4">
          <div>
            <CurrencyInputLabel
              countryCode={formData.originCountry || 'US'}
              label="Base Shipping Cost"
              required
            />
            <Input
              id="baseShippingCost"
              type="number"
              step="0.01"
              value={formData.baseShippingCost}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  baseShippingCost: parseFloat(e.target.value) || 0,
                }))
              }
              required
            />
          </div>
          <div>
            <CurrencyInputLabel
              countryCode={formData.originCountry || 'US'}
              label={`Cost per ${formData.weightUnit.toUpperCase()}`}
              required
            />
            <Input
              id="costPerKg"
              type="number"
              step="0.01"
              value={formData.costPerKg}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  costPerKg: parseFloat(e.target.value) || 0,
                }))
              }
              required
            />
          </div>
          <div>
            <CurrencyInputLabel
              countryCode={formData.originCountry || 'US'}
              label={`Shipping per ${formData.weightUnit.toUpperCase()}`}
              required
            />
            <Input
              id="shippingPerKg"
              type="number"
              step="0.01"
              value={formData.shippingPerKg}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  shippingPerKg: parseFloat(e.target.value) || 0,
                }))
              }
              required
            />
          </div>
          <div>
            <Label htmlFor="costPercentage">Cost Percentage (%)</Label>
            <Input
              id="costPercentage"
              type="number"
              step="0.01"
              value={formData.costPercentage}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  costPercentage: parseFloat(e.target.value) || 0,
                }))
              }
            />
          </div>
          <div>
            <Label htmlFor="exchangeRate">Exchange Rate</Label>
            <Input
              id="exchangeRate"
              type="number"
              step="0.01"
              value={formData.exchangeRate}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  exchangeRate: parseFloat(e.target.value) || 1,
                }))
              }
              placeholder="1.0"
            />
            {formData.originCountry && formData.destinationCountry && (
              <div className="text-xs text-gray-500 mt-1">
                1 {getCurrencySymbolFromCountry(formData.originCountry)} = {formData.exchangeRate}{' '}
                {getCurrencySymbolFromCountry(formData.destinationCountry)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Processing Times */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Processing Times</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="processingDays">Processing Days</Label>
            <Input
              id="processingDays"
              type="number"
              min="1"
              value={formData.processingDays}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  processingDays: parseInt(e.target.value) || 2,
                }))
              }
              required
            />
          </div>
          <div>
            <Label htmlFor="customsClearanceDays">Customs Clearance Days</Label>
            <Input
              id="customsClearanceDays"
              type="number"
              min="1"
              value={formData.customsClearanceDays}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  customsClearanceDays: parseInt(e.target.value) || 3,
                }))
              }
              required
            />
          </div>
        </div>
      </div>

      {/* Delivery Options */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Delivery Options</h3>
          <Button type="button" variant="outline" size="sm" onClick={addDeliveryOption}>
            Add Option
          </Button>
        </div>
        {formData.deliveryOptions.map((option, index) => (
          <div key={index} className="border rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-6 gap-3">
              <div>
                <Label>Name</Label>
                <Input
                  value={option.name}
                  onChange={(e) => updateDeliveryOption(index, 'name', e.target.value)}
                  placeholder="Express Delivery"
                />
              </div>
              <div>
                <Label>Carrier</Label>
                <Input
                  value={option.carrier}
                  onChange={(e) => updateDeliveryOption(index, 'carrier', e.target.value)}
                  placeholder="DHL"
                />
              </div>
              <div>
                <Label>Min Days</Label>
                <Input
                  type="number"
                  min="1"
                  value={option.min_days}
                  onChange={(e) =>
                    updateDeliveryOption(index, 'min_days', parseInt(e.target.value) || 1)
                  }
                />
              </div>
              <div>
                <Label>Max Days</Label>
                <Input
                  type="number"
                  min="1"
                  value={option.max_days}
                  onChange={(e) =>
                    updateDeliveryOption(index, 'max_days', parseInt(e.target.value) || 1)
                  }
                />
              </div>
              <div>
                <CurrencyInputLabel countryCode={formData.originCountry || 'US'} label="Price" />
                <Input
                  type="number"
                  step="0.01"
                  value={option.price}
                  onChange={(e) =>
                    updateDeliveryOption(index, 'price', parseFloat(e.target.value) || 0)
                  }
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={option.active}
                  onCheckedChange={(checked) => updateDeliveryOption(index, 'active', checked)}
                />
                <Label>Active</Label>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => removeDeliveryOption(index)}
            >
              Remove Option
            </Button>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="weightUnit">Weight Unit</Label>
          <Select
            value={formData.weightUnit}
            onValueChange={(value: 'kg' | 'lb') =>
              setFormData((prev) => ({ ...prev, weightUnit: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select weight unit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="kg">Kilograms (kg)</SelectItem>
              <SelectItem value="lb">Pounds (lb)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="maxWeight">Max Weight ({formData.weightUnit.toUpperCase()})</Label>
          <Input
            id="maxWeight"
            type="number"
            step="0.01"
            value={formData.maxWeight || ''}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                maxWeight: parseFloat(e.target.value) || undefined,
              }))
            }
          />
        </div>
      </div>
      <div>
        <Label htmlFor="restrictedItems">Restricted Items (comma-separated)</Label>
        <Input
          id="restrictedItems"
          value={formData.restrictedItems?.join(', ') || ''}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              restrictedItems: e.target.value
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean),
            }))
          }
          placeholder="electronics, liquids, batteries"
        />
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          id="requiresDocumentation"
          checked={formData.requiresDocumentation}
          onCheckedChange={(checked) =>
            setFormData((prev) => ({ ...prev, requiresDocumentation: checked }))
          }
        />
        <Label htmlFor="requiresDocumentation">Requires Documentation</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          id="isActive"
          checked={formData.isActive}
          onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: checked }))}
        />
        <Label htmlFor="isActive">Active</Label>
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Weight Tiers</Label>
          <Button type="button" variant="outline" size="sm" onClick={addWeightTier}>
            Add Tier
          </Button>
        </div>
        {formData.weightTiers.map((tier, index) => (
          <div key={index} className="flex items-center space-x-2">
            <Input
              type="number"
              step="0.01"
              value={tier.min}
              onChange={(e) => updateWeightTier(index, 'min', parseFloat(e.target.value) || 0)}
              placeholder="Min"
              className="w-20"
            />
            <span>to</span>
            <Input
              type="number"
              step="0.01"
              value={tier.max || ''}
              onChange={(e) => updateWeightTier(index, 'max', parseFloat(e.target.value) || null)}
              placeholder="Max"
              className="w-20"
            />
            <div className="flex items-center space-x-1">
              <Input
                type="number"
                step="0.01"
                value={tier.cost}
                onChange={(e) => updateWeightTier(index, 'cost', parseFloat(e.target.value) || 0)}
                placeholder="Cost"
                className="w-24"
              />
              <span className="text-xs text-gray-500">
                {getCurrencySymbolFromCountry(formData.originCountry || 'US')}
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => removeWeightTier(index)}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Create Route'}
        </Button>
      </div>
    </form>
  );
}

export function ShippingRouteManager() {
  const [activeTab, setActiveTab] = useState<'routes' | 'customs' | 'rates'>('routes');
  const { routes, loading, error, createRoute, updateRoute, removeRoute } = useShippingRoutes();
  const { data: _countries = [] } = useAllCountries();
  const [editingRoute, setEditingRoute] = useState<Tables<'shipping_routes'> | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleCreate = async (data: ShippingRouteFormData) => {
    return await createRoute(data);
  };

  const handleUpdate = async (data: ShippingRouteFormData) => {
    if (!editingRoute) return { success: false, error: 'No route selected' };
    return await updateRoute(editingRoute.id, { ...data, id: editingRoute.id });
  };

  const handleDelete = async (id: number) => {
    const result = await removeRoute(id);
    if (result.success) {
      toast({
        title: 'Success',
        description: 'Shipping route deleted successfully',
      });
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to delete shipping route',
        variant: 'destructive',
      });
    }
  };

  const { getCountryDisplayName: _getCountryDisplayName } = useCountryUtils();

  // Map DB row to form data for editing
  const mapRouteToFormData = (route: Tables<'shipping_routes'>): ShippingRouteFormData => ({
    originCountry: route.origin_country,
    destinationCountry: route.destination_country,
    baseShippingCost: route.base_shipping_cost,
    costPerKg: route.cost_per_kg,
    shippingPerKg: route.shipping_per_kg || 0,
    costPercentage: route.cost_percentage || 0,
    processingDays: route.processing_days || 2,
    customsClearanceDays: route.customs_clearance_days || 3,
    weightUnit: route.weight_unit || 'kg',
    deliveryOptions: route.delivery_options || [],
    weightTiers: route.weight_tiers || [],
    carriers: route.carriers || [],
    maxWeight: route.max_weight,
    restrictedItems: route.restricted_items || [],
    requiresDocumentation: route.requires_documentation || false,
    isActive: route.is_active !== undefined ? route.is_active : true,
    exchangeRate: route.exchange_rate ?? 1,
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2">Loading shipping routes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Card>
          <CardContent>
            <p className="text-red-600">Error: {error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4 border-b pb-2 mb-4">
        <button
          className={`px-4 py-2 font-semibold rounded-t ${activeTab === 'routes' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}
          onClick={() => setActiveTab('routes')}
        >
          Shipping Routes
        </button>
        <button
          className={`px-4 py-2 font-semibold rounded-t ${activeTab === 'customs' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}
          onClick={() => setActiveTab('customs')}
        >
          Customs Tiers
        </button>
        <button
          className={`px-4 py-2 font-semibold rounded-t ${activeTab === 'rates' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}
          onClick={() => setActiveTab('rates')}
        >
          Exchange Rates
        </button>
      </div>
      {activeTab === 'routes' ? (
        <div>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Shipping Routes</h2>
              <p className="text-gray-600">Manage origin-destination shipping costs</p>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>Add New Route</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Shipping Route</DialogTitle>
                  <DialogDescription>
                    Configure shipping costs for a specific origin-destination combination.
                  </DialogDescription>
                </DialogHeader>
                <ShippingRouteForm
                  onSubmit={async (data) => {
                    const result = await handleCreate(data);
                    if (result.success) setIsCreateDialogOpen(false);
                    return result;
                  }}
                  onCancel={() => setIsCreateDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
            {/* Edit Dialog */}
            <Dialog
              open={isEditDialogOpen}
              onOpenChange={(open) => {
                setIsEditDialogOpen(open);
                if (!open) setEditingRoute(null);
              }}
            >
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Shipping Route</DialogTitle>
                  <DialogDescription>
                    Update shipping costs for this origin-destination combination.
                  </DialogDescription>
                </DialogHeader>
                {editingRoute && (
                  <ShippingRouteForm
                    onSubmit={async (data) => {
                      const result = await handleUpdate(data);
                      if (result.success) setIsEditDialogOpen(false);
                      return result;
                    }}
                    onCancel={() => {
                      setIsEditDialogOpen(false);
                      setEditingRoute(null);
                    }}
                    initialData={mapRouteToFormData(editingRoute)}
                  />
                )}
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid gap-4">
            {routes.map((route) => (
              <Card key={route.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <ShippingRouteDisplay
                          origin={route.origin_country}
                          destination={route.destination_country}
                          showCodes={true}
                          showIcon={false}
                        />
                        <Badge variant={route.is_active ? 'default' : 'secondary'}>
                          {route.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        Base: {getCurrencySymbolFromCountry(route.origin_country)}
                        {route.base_shipping_cost} +{' '}
                        {getCurrencySymbolFromCountry(route.origin_country)}
                        {route.cost_per_kg}/{route.weight_unit || 'kg'}
                        {route.cost_percentage > 0 && ` + ${route.cost_percentage}% of price`}
                        {route.exchange_rate && route.exchange_rate !== 1 && (
                          <div className="text-xs text-blue-600 mt-1">
                            Rate: 1 {getCurrencySymbolFromCountry(route.origin_country)} ={' '}
                            {route.exchange_rate}{' '}
                            {getCurrencySymbolFromCountry(route.destination_country)}
                          </div>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingRoute(route);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(route.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Weight Tiers:</strong>
                      <ul className="mt-1 space-y-1">
                        {((route.weight_tiers as WeightTier[]) || []).map(
                          (tier: WeightTier, index: number) => (
                            <li key={index}>
                              {tier.min}-{tier.max || '∞'}
                              {route.weight_unit || 'kg'}:{' '}
                              {getCurrencySymbolFromCountry(route.origin_country)}
                              {tier.cost}
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                    <div>
                      <strong>Carriers:</strong>
                      <ul className="mt-1 space-y-1">
                        {((route.carriers as Carrier[]) || []).map(
                          (carrier: Carrier, index: number) => (
                            <li key={index}>
                              {carrier.name}: {carrier.days} days
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {routes.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-600">No shipping routes configured yet.</p>
                <p className="text-sm text-gray-500 mt-2">
                  Create your first shipping route to get started.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      ) : activeTab === 'customs' ? (
        <CustomsTiersManager />
      ) : (
        <ExchangeRateManager />
      )}
    </div>
  );
}
