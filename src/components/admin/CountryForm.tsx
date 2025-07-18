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
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="code">Country Code *</Label>
          <Input
            id="code"
            name="code"
            defaultValue={editingCountry?.code || ''}
            disabled={!!editingCountry}
            required
            placeholder="e.g., US, IN, NP"
          />
        </div>
        <div>
          <Label htmlFor="name">Country Name *</Label>
          <Input
            id="name"
            name="name"
            defaultValue={editingCountry?.name || ''}
            required
            placeholder="e.g., United States"
          />
        </div>
        <div>
          <Label htmlFor="currency">Currency *</Label>
          <Input
            id="currency"
            name="currency"
            defaultValue={editingCountry?.currency || ''}
            required
            onChange={(e) => setFormCurrency(e.target.value)}
            placeholder="e.g., USD, INR, NPR"
          />
        </div>
        <div>
          <Label htmlFor="rate_from_usd">Rate from USD *</Label>
          <Input
            id="rate_from_usd"
            name="rate_from_usd"
            type="number"
            step="0.01"
            defaultValue={editingCountry?.rate_from_usd || ''}
            required
            placeholder="e.g., 1.00, 83.00"
          />
        </div>
        <div>
          <Label htmlFor="sales_tax">Sales Tax (%)</Label>
          <Input
            id="sales_tax"
            name="sales_tax"
            type="number"
            step="0.01"
            defaultValue={editingCountry?.sales_tax || 0}
            placeholder="0.00"
          />
        </div>
        <div>
          <Label htmlFor="vat">VAT (%)</Label>
          <Input
            id="vat"
            name="vat"
            type="number"
            step="0.01"
            defaultValue={editingCountry?.vat || 0}
            placeholder="0.00"
          />
        </div>
        <div>
          <Label htmlFor="min_shipping">Min Shipping ({formCurrency}) *</Label>
          <Input
            id="min_shipping"
            name="min_shipping"
            type="number"
            step="0.01"
            defaultValue={editingCountry?.min_shipping || ''}
            required
            placeholder="0.00"
          />
        </div>
        <div>
          <Label htmlFor="additional_shipping">Additional Shipping (%)</Label>
          <Input
            id="additional_shipping"
            name="additional_shipping"
            type="number"
            step="0.01"
            defaultValue={editingCountry?.additional_shipping || 0}
            placeholder="0.00"
          />
        </div>
        <div>
          <Label htmlFor="additional_weight">Additional Weight Cost ({formCurrency}) *</Label>
          <Input
            id="additional_weight"
            name="additional_weight"
            type="number"
            step="0.01"
            defaultValue={editingCountry?.additional_weight || ''}
            required
            placeholder="0.00"
          />
        </div>
        <div>
          <Label htmlFor="weight_unit">Weight Unit</Label>
          <Select value={weightUnit} onValueChange={(value: 'lbs' | 'kg') => setWeightUnit(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lbs">Pounds (lbs)</SelectItem>
              <SelectItem value="kg">Kilograms (kg)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="volumetric_divisor">Volumetric Divisor *</Label>
          <Input
            id="volumetric_divisor"
            name="volumetric_divisor"
            type="number"
            step="0.01"
            defaultValue={editingCountry?.volumetric_divisor || ''}
            required
            placeholder="5000"
          />
        </div>
        <div>
          <Label htmlFor="payment_gateway_fixed_fee">
            Payment Gateway Fixed Fee ({formCurrency})
          </Label>
          <Input
            id="payment_gateway_fixed_fee"
            name="payment_gateway_fixed_fee"
            type="number"
            step="0.01"
            defaultValue={editingCountry?.payment_gateway_fixed_fee || 0}
            placeholder="0.00"
          />
        </div>
        <div>
          <Label htmlFor="payment_gateway_percent_fee">Payment Gateway Percent Fee (%)</Label>
          <Input
            id="payment_gateway_percent_fee"
            name="payment_gateway_percent_fee"
            type="number"
            step="0.01"
            defaultValue={editingCountry?.payment_gateway_percent_fee || 0}
            placeholder="0.00"
          />
        </div>
        <div className="col-span-2">
          <Label htmlFor="available_gateways">Available Payment Gateways</Label>
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
            className="w-full"
          />
          <div className="text-xs text-gray-500 mt-1">
            Select all payment gateways that customers can use in this country
          </div>
        </div>
        <div className="col-span-2">
          <Label htmlFor="default_gateway">Default Payment Gateway</Label>
          <Select value={defaultGateway} onValueChange={setDefaultGateway}>
            <SelectTrigger>
              <SelectValue placeholder="Select default gateway" />
            </SelectTrigger>
            <SelectContent>
              {availableGateways.map((gateway) => {
                const option = paymentGatewayOptions.find(opt => opt.value === gateway);
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
        <div className="col-span-2 grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2 pt-4">
            <Checkbox
              id="purchase_allowed"
              name="purchase_allowed"
              checked={purchaseAllowed}
              onCheckedChange={(checked) => setPurchaseAllowed(!!checked)}
            />
            <Label
              htmlFor="purchase_allowed"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Purchase Allowed
            </Label>
          </div>
          <div className="flex items-center space-x-2 pt-4">
            <Checkbox
              id="shipping_allowed"
              name="shipping_allowed"
              checked={shippingAllowed}
              onCheckedChange={(checked) => setShippingAllowed(!!checked)}
            />
            <Label
              htmlFor="shipping_allowed"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Shipping Allowed
            </Label>
          </div>
        </div>
        <div className="col-span-2">
          <Label className="font-semibold">Priority Thresholds</Label>
          <div className="text-xs text-muted-foreground mb-2">
            Set the amount thresholds (in {formCurrency || 'main currency'}) for each priority.
            Quotes with a final total above each threshold will be assigned the corresponding
            priority, unless manually overridden.
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="priority-low">Low ({formCurrency || 'CUR'})</Label>
              <Input
                id="priority-low"
                name="priority-low"
                type="number"
                step="0.01"
                required
                value={priorityThresholds.low}
                onChange={(e) => handlePriorityChange('low', e.target.value)}
                min={0}
              />
            </div>
            <div>
              <Label htmlFor="priority-normal">Normal ({formCurrency || 'CUR'})</Label>
              <Input
                id="priority-normal"
                name="priority-normal"
                type="number"
                step="0.01"
                required
                value={priorityThresholds.normal}
                onChange={(e) => handlePriorityChange('normal', e.target.value)}
                min={priorityThresholds.low}
              />
            </div>
            <div>
              <Label htmlFor="priority-urgent">Urgent ({formCurrency || 'CUR'})</Label>
              <Input
                id="priority-urgent"
                name="priority-urgent"
                type="number"
                step="0.01"
                required
                value={priorityThresholds.urgent}
                onChange={(e) => handlePriorityChange('urgent', e.target.value)}
                min={priorityThresholds.normal}
              />
            </div>
          </div>
          {priorityError && <div className="text-red-600 text-xs mt-1">{priorityError}</div>}
        </div>
        <div className="col-span-2 flex gap-2">
          <Button type="submit">{editingCountry ? 'Update' : 'Create'}</Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
};
