import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, 
  Trash2, 
  Calculator, 
  Save, 
  Eye, 
  Package,
  DollarSign,
  Globe,
  Info,
  AlertCircle
} from 'lucide-react';
import { simplifiedQuoteCalculator } from '@/services/SimplifiedQuoteCalculator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { currencyService } from '@/services/CurrencyService';
import { QuoteBreakdownV2 } from '@/components/quotes-v2/QuoteBreakdownV2';

interface QuoteItem {
  id: string;
  name: string;
  url?: string;
  quantity: number;
  unit_price_usd: number;
  weight_kg?: number;
  category?: string;
  notes?: string;
  discount_percentage?: number;
  // Optional HSN fields - safe additions
  hsn_code?: string;
  use_hsn_rates?: boolean; // Feature flag per item
}

const QuoteCalculatorV2: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  
  // Form state
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [originCountry, setOriginCountry] = useState('US');
  const [originState, setOriginState] = useState('');
  const [destinationCountry, setDestinationCountry] = useState('NP');
  const [destinationState, setDestinationState] = useState('urban');
  const [shippingMethod, setShippingMethod] = useState<'standard' | 'express' | 'economy'>('standard');
  const [insuranceRequired, setInsuranceRequired] = useState(true);
  const [handlingFeeType, setHandlingFeeType] = useState<'fixed' | 'percentage' | 'both'>('both');
  const [paymentGateway, setPaymentGateway] = useState('stripe');
  const [adminNotes, setAdminNotes] = useState('');
  const [customerCurrency, setCustomerCurrency] = useState('NPR');
  
  // Discount state
  const [orderDiscountType, setOrderDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [orderDiscountValue, setOrderDiscountValue] = useState(0);
  const [orderDiscountCode, setOrderDiscountCode] = useState('');
  const [shippingDiscountType, setShippingDiscountType] = useState<'percentage' | 'fixed' | 'free'>('percentage');
  const [shippingDiscountValue, setShippingDiscountValue] = useState(0);
  
  // Items
  const [items, setItems] = useState<QuoteItem[]>([
    {
      id: crypto.randomUUID(),
      name: '',
      url: '',
      quantity: 1,
      unit_price_usd: 0,
      weight_kg: undefined,
      category: '',
      notes: ''
    }
  ]);
  
  // Calculation result
  const [calculationResult, setCalculationResult] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  // Feature toggles for safe implementation
  const [showAdvancedFeatures, setShowAdvancedFeatures] = useState(false);

  // Update customer currency when destination changes
  useEffect(() => {
    getCustomerCurrency(destinationCountry).then(currency => {
      setCustomerCurrency(currency);
    });
  }, [destinationCountry]);

  // Auto-calculate on changes
  useEffect(() => {
    if (items.some(item => item.name && item.unit_price_usd > 0)) {
      calculateQuote();
    }
  }, [items, originCountry, originState, destinationCountry, destinationState, shippingMethod, insuranceRequired, handlingFeeType, paymentGateway, orderDiscountValue, orderDiscountType, shippingDiscountValue, shippingDiscountType]);

  const addItem = () => {
    setItems([...items, {
      id: crypto.randomUUID(),
      name: '',
      url: '',
      quantity: 1,
      unit_price_usd: 0,
      weight_kg: undefined,
      category: '',
      notes: ''
    }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof QuoteItem, value: any) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const calculateQuote = async () => {
    setCalculating(true);
    try {
      // Filter valid items
      const validItems = items.filter(item => item.name && item.unit_price_usd > 0);
      
      if (validItems.length === 0) {
        setCalculationResult(null);
        return;
      }

      const result = await simplifiedQuoteCalculator.calculate({
        items: validItems,
        origin_country: originCountry,
        origin_state: originState,
        destination_country: destinationCountry,
        destination_state: destinationState,
        shipping_method: shippingMethod,
        insurance_required: insuranceRequired,
        handling_fee_type: handlingFeeType,
        payment_gateway: paymentGateway,
        order_discount: orderDiscountValue > 0 ? {
          type: orderDiscountType,
          value: orderDiscountValue,
          code: orderDiscountCode
        } : undefined,
        shipping_discount: shippingDiscountValue > 0 || shippingDiscountType === 'free' ? {
          type: shippingDiscountType,
          value: shippingDiscountValue
        } : undefined
      });

      setCalculationResult(result);
    } catch (error) {
      console.error('Calculation error:', error);
      toast({
        title: 'Calculation Error',
        description: 'Failed to calculate quote',
        variant: 'destructive'
      });
    } finally {
      setCalculating(false);
    }
  };

  const saveQuote = async () => {
    if (!customerEmail) {
      toast({
        title: 'Missing Information',
        description: 'Please enter customer email',
        variant: 'destructive'
      });
      return;
    }

    if (!calculationResult) {
      toast({
        title: 'No Calculation',
        description: 'Please calculate the quote first',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Generate quote number
      const { data: quoteNumber } = await supabase
        .rpc('generate_quote_number_v2');

      // Save quote
      const { data, error } = await supabase
        .from('quotes_v2')
        .insert({
          quote_number: quoteNumber,
          customer_email: customerEmail,
          customer_name: customerName,
          customer_phone: customerPhone,
          origin_country: originCountry,
          destination_country: destinationCountry,
          shipping_method: shippingMethod,
          insurance_required: insuranceRequired,
          items: items.filter(item => item.name && item.unit_price_usd > 0),
          calculation_data: calculationResult,
          total_usd: calculationResult.calculation_steps.total_usd,
          total_customer_currency: calculationResult.calculation_steps.total_customer_currency,
          customer_currency: customerCurrency,
          admin_notes: adminNotes,
          status: 'draft',
          created_by: user?.id,
          calculated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Quote ${quoteNumber} created successfully`
      });

      // Navigate to quote details
      navigate(`/admin/quotes-v2/${data.id}`);
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: 'Save Error',
        description: 'Failed to save quote',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getCustomerCurrency = async (countryCode: string): Promise<string> => {
    const countryCurrencyMap: Record<string, string> = {
      IN: 'INR',
      NP: 'NPR',
      US: 'USD',
      CA: 'CAD',
      GB: 'GBP',
      AU: 'AUD',
    };
    return countryCurrencyMap[countryCode] || 'USD';
  };

  const taxInfo = simplifiedQuoteCalculator.getTaxInfo(destinationCountry);
  const shippingMethods = simplifiedQuoteCalculator.getShippingMethods();

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Quote Calculator V2</h1>
          <p className="text-gray-500 mt-1">Simplified and transparent quote calculation</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="advanced-mode"
              checked={showAdvancedFeatures}
              onCheckedChange={setShowAdvancedFeatures}
            />
            <Label htmlFor="advanced-mode" className="cursor-pointer">
              Advanced Features
              {showAdvancedFeatures && (
                <Badge variant="secondary" className="ml-2">Beta</Badge>
              )}
            </Label>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            <Calculator className="w-4 h-4 mr-2" />
            New Calculator
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="customer@example.com"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Customer name"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+1234567890"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Route Info */}
          <Card>
            <CardHeader>
              <CardTitle>Route & Shipping</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="origin">Origin Country</Label>
                  <Select value={originCountry} onValueChange={setOriginCountry}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="CN">China</SelectItem>
                      <SelectItem value="GB">United Kingdom</SelectItem>
                      <SelectItem value="JP">Japan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {originCountry === 'US' && (
                  <div>
                    <Label htmlFor="originState">Origin State (for sales tax)</Label>
                    <Select value={originState} onValueChange={setOriginState}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No state tax</SelectItem>
                        {simplifiedQuoteCalculator.getUSStates().map(state => (
                          <SelectItem key={state.code} value={state.code}>
                            {state.code} - {state.rate}% tax
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div>
                  <Label htmlFor="destination">Destination Country</Label>
                  <Select value={destinationCountry} onValueChange={setDestinationCountry}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IN">India</SelectItem>
                      <SelectItem value="NP">Nepal</SelectItem>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="CA">Canada</SelectItem>
                      <SelectItem value="GB">United Kingdom</SelectItem>
                      <SelectItem value="AU">Australia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="destinationLocation">Delivery Location</Label>
                  <Select value={destinationState} onValueChange={setDestinationState}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {simplifiedQuoteCalculator.getDeliveryTypes().map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="shipping">Shipping Method</Label>
                  <Select value={shippingMethod} onValueChange={(value: any) => setShippingMethod(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {shippingMethods.map(method => (
                        <SelectItem key={method.value} value={method.value}>
                          {method.label} - ${method.rate}/kg
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="handlingFee">Handling Fee Type</Label>
                  <Select value={handlingFeeType} onValueChange={(value: any) => setHandlingFeeType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {simplifiedQuoteCalculator.getHandlingFeeOptions().map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="paymentGateway">Payment Gateway</Label>
                  <Select value={paymentGateway} onValueChange={setPaymentGateway}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {simplifiedQuoteCalculator.getPaymentGateways().map(gateway => (
                        <SelectItem key={gateway.value} value={gateway.value}>
                          {gateway.label} - {gateway.fees.percentage}% + ${gateway.fees.fixed}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    id="insurance"
                    checked={insuranceRequired}
                    onCheckedChange={setInsuranceRequired}
                  />
                  <Label htmlFor="insurance">Include Insurance (1% of value)</Label>
                </div>
              </div>
              
              {/* Tax Info Display */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Info className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-blue-900">Tax Rates for {taxInfo.country}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Customs:</span>
                    <span className="ml-2 font-medium">{taxInfo.customs}%</span>
                  </div>
                  <div>
                    <span className="text-gray-600">{taxInfo.local_tax_name}:</span>
                    <span className="ml-2 font-medium">{taxInfo.local_tax}%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item, index) => (
                <div key={item.id} className="space-y-4 p-4 border rounded-lg">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Item {index + 1}</h4>
                    {items.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label>Product Name *</Label>
                      <Input
                        value={item.name}
                        onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                        placeholder="Enter product name"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Product URL</Label>
                      <Input
                        value={item.url}
                        onChange={(e) => updateItem(item.id, 'url', e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <Label>Quantity *</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div>
                      <Label>Unit Price (USD) *</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price_usd}
                        onChange={(e) => updateItem(item.id, 'unit_price_usd', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label>Weight per unit (kg)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.001"
                        value={item.weight_kg || ''}
                        onChange={(e) => updateItem(item.id, 'weight_kg', parseFloat(e.target.value) || undefined)}
                        placeholder="0.5"
                      />
                    </div>
                    <div>
                      <Label>Category</Label>
                      <Input
                        value={item.category}
                        onChange={(e) => updateItem(item.id, 'category', e.target.value)}
                        placeholder="Electronics, Clothing, etc."
                      />
                    </div>
                    <div>
                      <Label>Item Discount (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={item.discount_percentage || ''}
                        onChange={(e) => updateItem(item.id, 'discount_percentage', parseFloat(e.target.value) || undefined)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  
                  {/* Optional HSN fields - only show in advanced mode */}
                  {showAdvancedFeatures && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 bg-blue-50 rounded-lg">
                      <div>
                        <Label className="flex items-center gap-2">
                          HSN Code 
                          <Badge variant="secondary" className="text-xs">Optional</Badge>
                        </Label>
                        <Input
                          value={item.hsn_code || ''}
                          onChange={(e) => updateItem(item.id, 'hsn_code', e.target.value)}
                          placeholder="e.g., 6109"
                          className="font-mono"
                        />
                        {item.hsn_code && (() => {
                          const hsnInfo = simplifiedQuoteCalculator.getHSNInfo(item.hsn_code, destinationCountry);
                          return hsnInfo ? (
                            <div className="text-xs mt-1 space-y-1">
                              <p className="text-blue-600">{hsnInfo.description}</p>
                              <p className="text-green-600 font-medium">
                                Customs: {hsnInfo.customsRate}% 
                                {hsnInfo.customsRate < hsnInfo.countryRate && 
                                  <span className="text-green-700"> (saves {hsnInfo.countryRate - hsnInfo.customsRate}%)</span>
                                }
                              </p>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-500 mt-1">
                              HSN not found - will use default rate
                            </p>
                          );
                        })()}
                      </div>
                      <div className="flex items-center space-x-2 pt-6">
                        <Switch
                          id={`hsn-${item.id}`}
                          checked={item.use_hsn_rates || false}
                          onCheckedChange={(checked) => updateItem(item.id, 'use_hsn_rates', checked)}
                          disabled={!item.hsn_code}
                        />
                        <Label htmlFor={`hsn-${item.id}`} className="cursor-pointer">
                          Use HSN-specific rates
                        </Label>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              <Button onClick={addItem} variant="outline" className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Another Item
              </Button>
            </CardContent>
          </Card>

          {/* Discounts */}
          <Card>
            <CardHeader>
              <CardTitle>Discounts (Optional)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Order Discount */}
                <div className="space-y-2">
                  <h4 className="font-medium">Order Discount</h4>
                  <div className="flex gap-2">
                    <Select value={orderDiscountType} onValueChange={(value: any) => setOrderDiscountType(value)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">%</SelectItem>
                        <SelectItem value="fixed">$</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={orderDiscountValue}
                      onChange={(e) => setOrderDiscountValue(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                  <Input
                    value={orderDiscountCode}
                    onChange={(e) => setOrderDiscountCode(e.target.value)}
                    placeholder="Promo code (optional)"
                  />
                </div>

                {/* Shipping Discount */}
                <div className="space-y-2">
                  <h4 className="font-medium">Shipping Discount</h4>
                  <div className="flex gap-2">
                    <Select value={shippingDiscountType} onValueChange={(value: any) => setShippingDiscountType(value)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">%</SelectItem>
                        <SelectItem value="fixed">$</SelectItem>
                        <SelectItem value="free">Free</SelectItem>
                      </SelectContent>
                    </Select>
                    {shippingDiscountType !== 'free' && (
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={shippingDiscountValue}
                        onChange={(e) => setShippingDiscountValue(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                      />
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Admin Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Internal notes about this quote..."
                rows={3}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right: Calculation Preview */}
        <div className="space-y-6">
          {/* Actions */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              <Button 
                onClick={calculateQuote} 
                className="w-full"
                disabled={calculating || !items.some(item => item.name && item.unit_price_usd > 0)}
              >
                <Calculator className="w-4 h-4 mr-2" />
                {calculating ? 'Calculating...' : 'Calculate Quote'}
              </Button>
              
              {calculationResult && (
                <>
                  <Button 
                    onClick={() => setShowPreview(!showPreview)} 
                    variant="outline"
                    className="w-full"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {showPreview ? 'Hide' : 'Show'} Breakdown
                  </Button>
                  
                  <Button 
                    onClick={saveQuote} 
                    variant="default"
                    className="w-full"
                    disabled={loading}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {loading ? 'Saving...' : 'Save Quote'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Calculation Result */}
          {calculationResult && (
            <Card>
              <CardHeader>
                <CardTitle>Quote Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-3xl font-bold">
                    ${calculationResult.calculation_steps.total_usd.toFixed(2)}
                  </div>
                  <div className="text-xl text-gray-600">
                    {currencyService.formatAmount(
                      calculationResult.calculation_steps.total_customer_currency,
                      customerCurrency
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detailed Breakdown using proper component */}
          {calculationResult && showPreview && (
            <QuoteBreakdownV2 
              quote={{
                id: 'temp-' + Date.now(),
                quote_number: 'PREVIEW',
                status: 'draft',
                customer_email: customerEmail || 'preview@example.com',
                customer_name: customerName,
                origin_country: originCountry,
                destination_country: destinationCountry,
                items: items.filter(item => item.name && item.unit_price_usd > 0),
                calculation_data: calculationResult,
                total_usd: calculationResult.calculation_steps.total_usd,
                total_customer_currency: calculationResult.calculation_steps.total_customer_currency,
                customer_currency: customerCurrency,
                created_at: new Date().toISOString(),
                calculated_at: calculationResult.calculation_timestamp
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default QuoteCalculatorV2;