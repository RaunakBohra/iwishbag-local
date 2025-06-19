import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tables } from "@/integrations/supabase/types";
import { CountryFormData } from "@/hooks/useCountrySettings";

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

  useEffect(() => {
    if (editingCountry) {
      setFormCurrency(editingCountry.currency);
      setPurchaseAllowed(editingCountry.purchase_allowed);
      setShippingAllowed(editingCountry.shipping_allowed);
    } else {
        setFormCurrency('');
        setPurchaseAllowed(true);
        setShippingAllowed(true);
    }
  }, [editingCountry]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const countryData: CountryFormData = {
      code: editingCountry?.code || formData.get('code') as string,
      name: formData.get('name') as string,
      currency: formData.get('currency') as string,
      rate_from_usd: parseFloat(formData.get('rate_from_usd') as string),
      sales_tax: parseFloat(formData.get('sales_tax') as string) || 0,
      vat: parseFloat(formData.get('vat') as string) || 0,
      min_shipping: parseFloat(formData.get('min_shipping') as string),
      additional_shipping: parseFloat(formData.get('additional_shipping') as string) || 0,
      additional_weight: parseFloat(formData.get('additional_weight') as string),
      weight_unit: formData.get('weight_unit') as 'lbs' | 'kg',
      volumetric_divisor: parseFloat(formData.get('volumetric_divisor') as string),
      payment_gateway_fixed_fee: parseFloat(formData.get('payment_gateway_fixed_fee') as string) || 0,
      payment_gateway_percent_fee: parseFloat(formData.get('payment_gateway_percent_fee') as string) || 0,
      payment_gateway: formData.get('payment_gateway') as string,
      purchase_allowed: purchaseAllowed,
      shipping_allowed: shippingAllowed,
    };
    onSubmit(countryData);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{editingCountry ? 'Edit Country' : 'Add New Country'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="code">Country Code</Label>
            <Input 
              id="code" 
              name="code" 
              defaultValue={editingCountry?.code || ''} 
              disabled={!!editingCountry}
              required 
            />
          </div>
          <div>
            <Label htmlFor="name">Country Name</Label>
            <Input id="name" name="name" defaultValue={editingCountry?.name || ''} required />
          </div>
          <div>
            <Label htmlFor="currency">Currency</Label>
            <Input 
              id="currency" 
              name="currency" 
              defaultValue={editingCountry?.currency || ''} 
              required 
              onChange={(e) => setFormCurrency(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="rate_from_usd">Rate from USD</Label>
            <Input id="rate_from_usd" name="rate_from_usd" type="number" step="0.01" defaultValue={editingCountry?.rate_from_usd || ''} required />
          </div>
          <div>
            <Label htmlFor="sales_tax">Sales Tax (%)</Label>
            <Input id="sales_tax" name="sales_tax" type="number" step="0.01" defaultValue={editingCountry?.sales_tax || 0} />
          </div>
          <div>
            <Label htmlFor="vat">VAT (%)</Label>
            <Input id="vat" name="vat" type="number" step="0.01" defaultValue={editingCountry?.vat || 0} />
          </div>
          <div>
            <Label htmlFor="min_shipping">Min Shipping ({formCurrency})</Label>
            <Input id="min_shipping" name="min_shipping" type="number" step="0.01" defaultValue={editingCountry?.min_shipping || ''} required />
          </div>
          <div>
            <Label htmlFor="additional_shipping">Additional Shipping (%)</Label>
            <Input id="additional_shipping" name="additional_shipping" type="number" step="0.01" defaultValue={editingCountry?.additional_shipping || 0} />
          </div>
          <div>
            <Label htmlFor="additional_weight">Additional Weight Cost ({formCurrency})</Label>
            <Input id="additional_weight" name="additional_weight" type="number" step="0.01" defaultValue={editingCountry?.additional_weight || ''} required />
          </div>
          <div>
            <Label htmlFor="weight_unit">Weight Unit</Label>
            <Select name="weight_unit" defaultValue={editingCountry?.weight_unit || 'lbs'}>
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
            <Label htmlFor="volumetric_divisor">Volumetric Divisor</Label>
            <Input id="volumetric_divisor" name="volumetric_divisor" type="number" step="0.01" defaultValue={editingCountry?.volumetric_divisor || ''} required />
          </div>
          <div>
            <Label htmlFor="payment_gateway_fixed_fee">Payment Gateway Fixed Fee ({formCurrency})</Label>
            <Input id="payment_gateway_fixed_fee" name="payment_gateway_fixed_fee" type="number" step="0.01" defaultValue={editingCountry?.payment_gateway_fixed_fee || 0} />
          </div>
          <div>
            <Label htmlFor="payment_gateway_percent_fee">Payment Gateway Percent Fee (%)</Label>
            <Input id="payment_gateway_percent_fee" name="payment_gateway_percent_fee" type="number" step="0.01" defaultValue={editingCountry?.payment_gateway_percent_fee || 0} />
          </div>
          <div className="col-span-2">
            <Label htmlFor="payment_gateway">Payment Gateway</Label>
            <Select name="payment_gateway" defaultValue={editingCountry?.payment_gateway || 'stripe'}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stripe">Stripe</SelectItem>
                <SelectItem value="esewa">eSewa</SelectItem>
                <SelectItem value="payu">PayU</SelectItem>
                <SelectItem value="nepalpayqr">NepalPay QR</SelectItem>
                <SelectItem value="airwallex">Airwallex</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2 pt-4">
                <Checkbox 
                    id="purchase_allowed" 
                    name="purchase_allowed"
                    checked={purchaseAllowed}
                    onCheckedChange={(checked) => setPurchaseAllowed(!!checked)}
                />
                <Label htmlFor="purchase_allowed" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
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
                <Label htmlFor="shipping_allowed" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Shipping Allowed
                </Label>
            </div>
          </div>
          <div className="col-span-2 flex gap-2">
            <Button type="submit">{editingCountry ? 'Update' : 'Create'}</Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
