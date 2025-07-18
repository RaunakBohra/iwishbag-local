import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { MultiSelect, MultiSelectOption } from '@/components/ui/multi-select';
import { Tables } from '@/integrations/supabase/types';
import { CountryFormData } from '@/hooks/useCountrySettings';
import { useToast } from '@/hooks/use-toast';
import { FALLBACK_GATEWAY_CODES } from '@/types/payment';

type CountrySetting = Tables<'country_settings'>;

interface CountryFormProps {
  editingCountry: CountrySetting | null;
  onSubmit: (data: CountryFormData) => void;
  onCancel: () => void;
}

export const CountryForm = ({ editingCountry, onSubmit, onCancel }: CountryFormProps) => {
  const [formCurrency, setFormCurrency] = useState('');
  const [purchaseAllowed, setPurchaseAllowed] = useState(true);
  const [shippingAllowed, setShippingAllowed] = useState(true);
  const [weightUnit, setWeightUnit] = useState<'lbs' | 'kg'>('lbs');
  const [availableGateways, setAvailableGateways] = useState<string[]>(['bank_transfer']);
  const [defaultGateway, setDefaultGateway] = useState('bank_transfer');
  const [priorityThresholds, setPriorityThresholds] = useState({
    low: 0,
    normal: 500,
    urgent: 2000,
  });
  const [priorityError, setPriorityError] = useState<string | null>(null);
  const { toast } = useToast();

  // Payment gateway options with descriptions
  const paymentGatewayOptions: MultiSelectOption[] = [
    { value: 'stripe', label: 'Stripe', description: 'International card payments' },
    { value: 'paypal', label: 'PayPal', description: 'Global digital wallet' },
    { value: 'payu', label: 'PayU', description: 'Popular in India and emerging markets' },
    { value: 'razorpay', label: 'Razorpay', description: 'India-focused payment gateway' },
    { value: 'esewa', label: 'eSewa', description: 'Leading Nepal digital wallet' },
    { value: 'khalti', label: 'Khalti', description: 'Popular Nepal payment service' },
    { value: 'fonepay', label: 'Fonepay', description: 'Nepal mobile payment platform' },
    { value: 'airwallex', label: 'Airwallex', description: 'Global business payments' },
    { value: 'upi', label: 'UPI', description: 'Unified Payments Interface (India)' },
    { value: 'paytm', label: 'Paytm', description: 'India digital payments' },
    { value: 'grabpay', label: 'GrabPay', description: 'Southeast Asia digital wallet' },
    { value: 'alipay', label: 'Alipay', description: 'Global digital payment platform' },
    { value: 'bank_transfer', label: 'Bank Transfer', description: 'Direct bank transfers' },
    { value: 'cod', label: 'Cash on Delivery', description: 'Pay upon delivery' },
  ];

  useEffect(() => {
    if (editingCountry) {
      setFormCurrency(editingCountry.currency);
      setPurchaseAllowed(editingCountry.purchase_allowed ?? true);
      setShippingAllowed(editingCountry.shipping_allowed ?? true);
      setWeightUnit((editingCountry.weight_unit as 'lbs' | 'kg') || 'lbs');
      setAvailableGateways((editingCountry as any).available_gateways || ['bank_transfer']);
      setDefaultGateway((editingCountry as any).default_gateway || 'bank_transfer');
      if (editingCountry.priority_thresholds) {
        setPriorityThresholds({
          low: editingCountry.priority_thresholds.low ?? 0,
          normal: editingCountry.priority_thresholds.normal ?? 500,
          urgent: editingCountry.priority_thresholds.urgent ?? 2000,
        });
      } else {
        setPriorityThresholds({ low: 0, normal: 500, urgent: 2000 });
      }
    } else {
      setFormCurrency('');
      setPurchaseAllowed(true);
      setShippingAllowed(true);
      setWeightUnit('lbs');
      setAvailableGateways(['bank_transfer']);
      setDefaultGateway('bank_transfer');
      setPriorityThresholds({ low: 0, normal: 500, urgent: 2000 });
    }
  }, [editingCountry]);

  const handlePriorityChange = (key: 'low' | 'normal' | 'urgent', value: string) => {
    setPriorityThresholds((prev) => ({ ...prev, [key]: Number(value) }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPriorityError(null);
    const { low, normal, urgent } = priorityThresholds;
    if (
      isNaN(low) ||
      isNaN(normal) ||
      isNaN(urgent) ||
      low === null ||
      normal === null ||
      urgent === null ||
      low === undefined ||
      normal === undefined ||
      urgent === undefined
    ) {
      setPriorityError('All priority thresholds are required.');
      return;
    }
    if (!(low <= normal && normal <= urgent)) {
      setPriorityError('Thresholds must be: Low ≤ Normal ≤ Urgent.');
      return;
    }
    try {
      const formData = new FormData(e.currentTarget);

      // Validate required fields
      const code = editingCountry?.code || (formData.get('code') as string);
      const name = formData.get('name') as string;
      const currency = formData.get('currency') as string;
      const rateFromUsd = formData.get('rate_from_usd') as string;
      const minShipping = formData.get('min_shipping') as string;
      const additionalWeight = formData.get('additional_weight') as string;
      const volumetricDivisor = formData.get('volumetric_divisor') as string;

      if (
        !code ||
        !name ||
        !currency ||
        !rateFromUsd ||
        !minShipping ||
        !additionalWeight ||
        !volumetricDivisor
      ) {
        toast({
          title: 'Validation Error',
          description: 'Please fill in all required fields.',
          variant: 'destructive',
        });
        return;
      }

      const countryData: CountryFormData = {
        code: code,
        name: name,
        currency: currency,
        rate_from_usd: parseFloat(rateFromUsd),
        sales_tax: parseFloat(formData.get('sales_tax') as string) || 0,
        vat: parseFloat(formData.get('vat') as string) || 0,
        min_shipping: parseFloat(minShipping),
        additional_shipping: parseFloat(formData.get('additional_shipping') as string) || 0,
        additional_weight: parseFloat(additionalWeight),
        weight_unit: weightUnit,
        volumetric_divisor: parseFloat(volumetricDivisor),
        payment_gateway_fixed_fee:
          parseFloat(formData.get('payment_gateway_fixed_fee') as string) || 0,
        payment_gateway_percent_fee:
          parseFloat(formData.get('payment_gateway_percent_fee') as string) || 0,
        purchase_allowed: purchaseAllowed,
        shipping_allowed: shippingAllowed,
        priority_thresholds: priorityThresholds,
        // Add the new gateway fields (cast as any to avoid TypeScript issues until types are updated)
        ...({
          available_gateways: availableGateways,
          default_gateway: defaultGateway,
          gateway_config: (editingCountry as any)?.gateway_config || {},
        } as any),
      };

      onSubmit(countryData);
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit form. Please check your input.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="space-y-4">
          <div className="border-b border-gray-200 pb-3">
            <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
            <p className="text-sm text-gray-600">Configure the basic country and currency settings</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="code" className="text-sm font-medium text-gray-900">Country Code *</Label>
              <Input
                id="code"
                name="code"
                defaultValue={editingCountry?.code || ''}
                disabled={!!editingCountry}
                required
                placeholder="e.g., US, IN, NP"
                className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <Label htmlFor="name" className="text-sm font-medium text-gray-900">Country Name *</Label>
              <Input
                id="name"
                name="name"
                defaultValue={editingCountry?.name || ''}
                required
                placeholder="e.g., United States"
                className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <Label htmlFor="currency" className="text-sm font-medium text-gray-900">Currency *</Label>
              <Input
                id="currency"
                name="currency"
                defaultValue={editingCountry?.currency || ''}
                required
                onChange={(e) => setFormCurrency(e.target.value)}
                placeholder="e.g., USD, INR, NPR"
                className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <Label htmlFor="rate_from_usd" className="text-sm font-medium text-gray-900">Rate from USD *</Label>
              <Input
                id="rate_from_usd"
                name="rate_from_usd"
                type="number"
                step="0.01"
                defaultValue={editingCountry?.rate_from_usd || ''}
                required
                placeholder="e.g., 1.00, 83.00"
                className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Tax Settings */}
        <div className="space-y-4">
          <div className="border-b border-gray-200 pb-3">
            <h3 className="text-lg font-medium text-gray-900">Tax Settings</h3>
            <p className="text-sm text-gray-600">Configure tax percentages and rates</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sales_tax" className="text-sm font-medium text-gray-900">Sales Tax (%)</Label>
              <Input
                id="sales_tax"
                name="sales_tax"
                type="number"
                step="0.01"
                defaultValue={editingCountry?.sales_tax || 0}
                placeholder="0.00"
                className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <Label htmlFor="vat" className="text-sm font-medium text-gray-900">VAT (%)</Label>
              <Input
                id="vat"
                name="vat"
                type="number"
                step="0.01"
                defaultValue={editingCountry?.vat || 0}
                placeholder="0.00"
                className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Shipping Settings */}
        <div className="space-y-4">
          <div className="border-b border-gray-200 pb-3">
            <h3 className="text-lg font-medium text-gray-900">Shipping Settings</h3>
            <p className="text-sm text-gray-600">Configure shipping costs and weight units</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="min_shipping" className="text-sm font-medium text-gray-900">
                Min Shipping ({formCurrency || 'CUR'}) *
              </Label>
              <Input
                id="min_shipping"
                name="min_shipping"
                type="number"
                step="0.01"
                defaultValue={editingCountry?.min_shipping || ''}
                required
                placeholder="0.00"
                className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <Label htmlFor="additional_shipping" className="text-sm font-medium text-gray-900">
                Additional Shipping (%)
              </Label>
              <Input
                id="additional_shipping"
                name="additional_shipping"
                type="number"
                step="0.01"
                defaultValue={editingCountry?.additional_shipping || 0}
                placeholder="0.00"
                className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <Label htmlFor="additional_weight" className="text-sm font-medium text-gray-900">
                Additional Weight Cost ({formCurrency || 'CUR'}) *
              </Label>
              <Input
                id="additional_weight"
                name="additional_weight"
                type="number"
                step="0.01"
                defaultValue={editingCountry?.additional_weight || ''}
                required
                placeholder="0.00"
                className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <Label htmlFor="weight_unit" className="text-sm font-medium text-gray-900">Weight Unit</Label>
              <Select value={weightUnit} onValueChange={(value: 'lbs' | 'kg') => setWeightUnit(value)}>
                <SelectTrigger className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lbs">Pounds (lbs)</SelectItem>
                  <SelectItem value="kg">Kilograms (kg)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="volumetric_divisor" className="text-sm font-medium text-gray-900">
                Volumetric Divisor *
              </Label>
              <Input
                id="volumetric_divisor"
                name="volumetric_divisor"
                type="number"
                step="0.01"
                defaultValue={editingCountry?.volumetric_divisor || ''}
                required
                placeholder="5000"
                className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Payment Gateway Settings */}
        <div className="space-y-4">
          <div className="border-b border-gray-200 pb-3">
            <h3 className="text-lg font-medium text-gray-900">Payment Gateway Settings</h3>
            <p className="text-sm text-gray-600">Configure payment gateway fees and preferences</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="payment_gateway_fixed_fee" className="text-sm font-medium text-gray-900">
                Payment Gateway Fixed Fee ({formCurrency || 'CUR'})
              </Label>
              <Input
                id="payment_gateway_fixed_fee"
                name="payment_gateway_fixed_fee"
                type="number"
                step="0.01"
                defaultValue={editingCountry?.payment_gateway_fixed_fee || 0}
                placeholder="0.00"
                className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <Label htmlFor="payment_gateway_percent_fee" className="text-sm font-medium text-gray-900">
                Payment Gateway Percent Fee (%)
              </Label>
              <Input
                id="payment_gateway_percent_fee"
                name="payment_gateway_percent_fee"
                type="number"
                step="0.01"
                defaultValue={editingCountry?.payment_gateway_percent_fee || 0}
                placeholder="0.00"
                className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="available_gateways" className="text-sm font-medium text-gray-900">
                Available Payment Gateways
              </Label>
              <MultiSelect
                options={paymentGatewayOptions}
                value={availableGateways}
                onValueChange={(value) => {
                  setAvailableGateways(value);
                  // If default gateway is not in the selected gateways, reset it
                  if (!value.includes(defaultGateway)) {
                    setDefaultGateway(value[0] || 'bank_transfer');
                  }
                }}
                placeholder="Select available payment gateways..."
                emptyText="No payment gateways found."
                className="w-full mt-1"
              />
              <div className="text-xs text-gray-500 mt-1">
                Select all payment gateways that customers can use in this country
              </div>
            </div>
            <div>
              <Label htmlFor="default_gateway" className="text-sm font-medium text-gray-900">
                Default Payment Gateway
              </Label>
              <Select value={defaultGateway} onValueChange={setDefaultGateway}>
                <SelectTrigger className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                  <SelectValue placeholder="Select default gateway" />
                </SelectTrigger>
                <SelectContent>
                  {availableGateways.map((gateway) => {
                    const option = paymentGatewayOptions.find((opt) => opt.value === gateway);
                    return (
                      <SelectItem key={gateway} value={gateway}>
                        {option?.label || gateway}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <div className="text-xs text-gray-500 mt-1">
                This gateway will be pre-selected for customers from this country
              </div>
            </div>
          </div>
        </div>

        {/* Permissions */}
        <div className="space-y-4">
          <div className="border-b border-gray-200 pb-3">
            <h3 className="text-lg font-medium text-gray-900">Permissions</h3>
            <p className="text-sm text-gray-600">Configure what operations are allowed for this country</p>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg">
              <Checkbox
                id="purchase_allowed"
                name="purchase_allowed"
                checked={purchaseAllowed}
                onCheckedChange={(checked) => setPurchaseAllowed(!!checked)}
                className="border-gray-300"
              />
              <div className="flex-1">
                <Label
                  htmlFor="purchase_allowed"
                  className="text-sm font-medium text-gray-900 leading-none cursor-pointer"
                >
                  Purchase Allowed
                </Label>
                <p className="text-xs text-gray-500 mt-1">
                  Allow customers to make purchases from this country
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg">
              <Checkbox
                id="shipping_allowed"
                name="shipping_allowed"
                checked={shippingAllowed}
                onCheckedChange={(checked) => setShippingAllowed(!!checked)}
                className="border-gray-300"
              />
              <div className="flex-1">
                <Label
                  htmlFor="shipping_allowed"
                  className="text-sm font-medium text-gray-900 leading-none cursor-pointer"
                >
                  Shipping Allowed
                </Label>
                <p className="text-xs text-gray-500 mt-1">
                  Allow shipping deliveries to this country
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Priority Thresholds */}
        <div className="space-y-4">
          <div className="border-b border-gray-200 pb-3">
            <h3 className="text-lg font-medium text-gray-900">Priority Thresholds</h3>
            <p className="text-sm text-gray-600">
              Set the amount thresholds (in {formCurrency || 'main currency'}) for each priority level
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="priority-low" className="text-sm font-medium text-gray-900">
                Low ({formCurrency || 'CUR'})
              </Label>
              <Input
                id="priority-low"
                name="priority-low"
                type="number"
                step="0.01"
                required
                value={priorityThresholds.low}
                onChange={(e) => handlePriorityChange('low', e.target.value)}
                min={0}
                className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <Label htmlFor="priority-normal" className="text-sm font-medium text-gray-900">
                Normal ({formCurrency || 'CUR'})
              </Label>
              <Input
                id="priority-normal"
                name="priority-normal"
                type="number"
                step="0.01"
                required
                value={priorityThresholds.normal}
                onChange={(e) => handlePriorityChange('normal', e.target.value)}
                min={priorityThresholds.low}
                className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <Label htmlFor="priority-urgent" className="text-sm font-medium text-gray-900">
                Urgent ({formCurrency || 'CUR'})
              </Label>
              <Input
                id="priority-urgent"
                name="priority-urgent"
                type="number"
                step="0.01"
                required
                value={priorityThresholds.urgent}
                onChange={(e) => handlePriorityChange('urgent', e.target.value)}
                min={priorityThresholds.normal}
                className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
          {priorityError && (
            <div className="text-red-600 text-sm mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              {priorityError}
            </div>
          )}
          <div className="text-xs text-gray-500 mt-2">
            Quotes with a final total above each threshold will be assigned the corresponding
            priority, unless manually overridden.
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {editingCountry ? 'Update Country' : 'Create Country'}
          </Button>
        </div>
      </form>
    </div>
  );
};
