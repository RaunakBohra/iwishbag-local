import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MapPin, 
  Truck, 
  DollarSign, 
  CreditCard, 
  Shield, 
  Navigation,
  Package,
  Globe,
  Clock,
  Settings
} from 'lucide-react';

export default function RouteShippingDesigns() {
  // Shared state for all designs
  const [formData, setFormData] = useState({
    originCountry: 'US',
    originState: 'NY',
    destinationCountry: 'NP',
    ncmBranch: 'kathmandu-central',
    deliveryLocation: 'urban',
    shippingMethod: 'standard',
    handlingFeeType: 'both',
    paymentGateway: 'stripe',
    includeInsurance: true,
  });

  const updateFormData = (key: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  // Clean Sectioned Design
  const CleanSectionedDesign = () => (
    <div className="space-y-6 p-6 bg-white rounded-lg border">
      <div className="text-center pb-4 border-b">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center justify-center gap-2">
          <Navigation className="h-5 w-5 text-blue-600" />
          Route & Shipping Configuration
        </h2>
        <p className="text-sm text-gray-600 mt-1">Configure your shipping preferences</p>
      </div>

      {/* Origin Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 border-b pb-2">
          <Globe className="h-4 w-4 text-green-600" />
          Origin Details
        </div>
        <div className="grid grid-cols-2 gap-4 pl-6">
          <div>
            <Label className="text-xs text-gray-600">Origin Country</Label>
            <Select value={formData.originCountry} onValueChange={(value) => updateFormData('originCountry', value)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="US">🇺🇸 United States</SelectItem>
                <SelectItem value="UK">🇬🇧 United Kingdom</SelectItem>
                <SelectItem value="CN">🇨🇳 China</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-gray-600">Origin State</Label>
            <Select value={formData.originState} onValueChange={(value) => updateFormData('originState', value)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NY">New York</SelectItem>
                <SelectItem value="CA">California</SelectItem>
                <SelectItem value="TX">Texas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Destination Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 border-b pb-2">
          <MapPin className="h-4 w-4 text-red-600" />
          Destination Details
        </div>
        <div className="grid grid-cols-2 gap-4 pl-6">
          <div>
            <Label className="text-xs text-gray-600">Destination Country</Label>
            <Select value={formData.destinationCountry} onValueChange={(value) => updateFormData('destinationCountry', value)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NP">🇳🇵 Nepal</SelectItem>
                <SelectItem value="IN">🇮🇳 India</SelectItem>
                <SelectItem value="BD">🇧🇩 Bangladesh</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-gray-600">NCM Branch</Label>
            <Select value={formData.ncmBranch} onValueChange={(value) => updateFormData('ncmBranch', value)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kathmandu-central">Kathmandu Central</SelectItem>
                <SelectItem value="pokhara">Pokhara</SelectItem>
                <SelectItem value="chitwan">Chitwan</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Shipping Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 border-b pb-2">
          <Truck className="h-4 w-4 text-orange-600" />
          Shipping Options
        </div>
        <div className="grid grid-cols-2 gap-4 pl-6">
          <div>
            <Label className="text-xs text-gray-600">Delivery Location</Label>
            <Select value={formData.deliveryLocation} onValueChange={(value) => updateFormData('deliveryLocation', value)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="urban">Urban/City</SelectItem>
                <SelectItem value="rural">Rural</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-gray-600">Shipping Method</Label>
            <Select value={formData.shippingMethod} onValueChange={(value) => updateFormData('shippingMethod', value)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard (7-10 days) - $25/kg</SelectItem>
                <SelectItem value="express">Express (3-5 days) - $35/kg</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Payment Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 border-b pb-2">
          <CreditCard className="h-4 w-4 text-purple-600" />
          Payment Configuration
        </div>
        <div className="grid grid-cols-2 gap-4 pl-6">
          <div>
            <Label className="text-xs text-gray-600">Handling Fee Type</Label>
            <Select value={formData.handlingFeeType} onValueChange={(value) => updateFormData('handlingFeeType', value)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">Both ($10 + 2%)</SelectItem>
                <SelectItem value="fixed">Fixed ($10)</SelectItem>
                <SelectItem value="percentage">Percentage (2%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-gray-600">Payment Gateway</Label>
            <Select value={formData.paymentGateway} onValueChange={(value) => updateFormData('paymentGateway', value)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stripe">Stripe - 2.9% + $0.3</SelectItem>
                <SelectItem value="paypal">PayPal - 3.2% + $0.3</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center space-x-2 pl-6">
          <Switch 
            id="insurance-clean" 
            checked={formData.includeInsurance} 
            onCheckedChange={(checked) => updateFormData('includeInsurance', checked)}
          />
          <Label htmlFor="insurance-clean" className="text-sm flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Include Insurance (1% of value)
          </Label>
        </div>
      </div>
    </div>
  );

  // Horizontal Flow Design
  const HorizontalFlowDesign = () => (
    <div className="p-6 bg-white rounded-lg border">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Route & Shipping</h2>
      </div>
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <Globe className="h-4 w-4 text-green-600" />
          </div>
          <span className="text-sm text-gray-600">Origin</span>
        </div>
        <div className="flex-1 h-px bg-gray-200 mx-4"></div>
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <Truck className="h-4 w-4 text-blue-600" />
          </div>
          <span className="text-sm text-gray-600">Transit</span>
        </div>
        <div className="flex-1 h-px bg-gray-200 mx-4"></div>
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
            <MapPin className="h-4 w-4 text-red-600" />
          </div>
          <span className="text-sm text-gray-600">Destination</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Origin Column */}
        <div className="space-y-3">
          <h3 className="font-medium text-gray-900 text-center">Origin</h3>
          <div>
            <Label className="text-xs text-gray-600">Country</Label>
            <Select value={formData.originCountry} onValueChange={(value) => updateFormData('originCountry', value)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="US">🇺🇸 US</SelectItem>
                <SelectItem value="UK">🇬🇧 UK</SelectItem>
                <SelectItem value="CN">🇨🇳 CN</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-gray-600">State</Label>
            <Select value={formData.originState} onValueChange={(value) => updateFormData('originState', value)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NY">New York</SelectItem>
                <SelectItem value="CA">California</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Transit Column */}
        <div className="space-y-3">
          <h3 className="font-medium text-gray-900 text-center">Shipping</h3>
          <div>
            <Label className="text-xs text-gray-600">Method</Label>
            <Select value={formData.shippingMethod} onValueChange={(value) => updateFormData('shippingMethod', value)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="express">Express</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-gray-600">Handling</Label>
            <Select value={formData.handlingFeeType} onValueChange={(value) => updateFormData('handlingFeeType', value)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">Both</SelectItem>
                <SelectItem value="fixed">Fixed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Destination Column */}
        <div className="space-y-3">
          <h3 className="font-medium text-gray-900 text-center">Destination</h3>
          <div>
            <Label className="text-xs text-gray-600">Country</Label>
            <Select value={formData.destinationCountry} onValueChange={(value) => updateFormData('destinationCountry', value)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NP">🇳🇵 Nepal</SelectItem>
                <SelectItem value="IN">🇮🇳 India</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-gray-600">NCM Branch</Label>
            <Select value={formData.ncmBranch} onValueChange={(value) => updateFormData('ncmBranch', value)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kathmandu-central">Kathmandu</SelectItem>
                <SelectItem value="pokhara">Pokhara</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Bottom row for payment and insurance */}
      <div className="mt-6 pt-4 border-t grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs text-gray-600">Payment Gateway</Label>
          <Select value={formData.paymentGateway} onValueChange={(value) => updateFormData('paymentGateway', value)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stripe">Stripe</SelectItem>
              <SelectItem value="paypal">PayPal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2 pt-4">
          <Switch 
            id="insurance-horizontal" 
            checked={formData.includeInsurance} 
            onCheckedChange={(checked) => updateFormData('includeInsurance', checked)}
          />
          <Label htmlFor="insurance-horizontal" className="text-xs">Insurance</Label>
        </div>
      </div>
    </div>
  );

  // Compact Professional Design
  const CompactProfessionalDesign = () => (
    <div className="p-4 bg-white rounded-lg border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Route & Shipping</h2>
        <Badge variant="outline" className="text-xs">
          <Settings className="h-3 w-3 mr-1" />
          Configuration
        </Badge>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
        <div>
          <Label className="text-xs font-medium text-gray-600">Origin</Label>
          <div className="space-y-2">
            <Select value={formData.originCountry} onValueChange={(value) => updateFormData('originCountry', value)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="US">🇺🇸 US</SelectItem>
                <SelectItem value="UK">🇬🇧 UK</SelectItem>
              </SelectContent>
            </Select>
            <Select value={formData.originState} onValueChange={(value) => updateFormData('originState', value)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NY">NY</SelectItem>
                <SelectItem value="CA">CA</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-xs font-medium text-gray-600">Destination</Label>
          <div className="space-y-2">
            <Select value={formData.destinationCountry} onValueChange={(value) => updateFormData('destinationCountry', value)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NP">🇳🇵 Nepal</SelectItem>
                <SelectItem value="IN">🇮🇳 India</SelectItem>
              </SelectContent>
            </Select>
            <Select value={formData.deliveryLocation} onValueChange={(value) => updateFormData('deliveryLocation', value)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="urban">Urban</SelectItem>
                <SelectItem value="rural">Rural</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-xs font-medium text-gray-600">Shipping</Label>
          <div className="space-y-2">
            <Select value={formData.shippingMethod} onValueChange={(value) => updateFormData('shippingMethod', value)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="express">Express</SelectItem>
              </SelectContent>
            </Select>
            <Select value={formData.handlingFeeType} onValueChange={(value) => updateFormData('handlingFeeType', value)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Handling" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">Both</SelectItem>
                <SelectItem value="fixed">Fixed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-xs font-medium text-gray-600">Payment</Label>
          <div className="space-y-2">
            <Select value={formData.paymentGateway} onValueChange={(value) => updateFormData('paymentGateway', value)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stripe">Stripe</SelectItem>
                <SelectItem value="paypal">PayPal</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center space-x-2">
              <Switch 
                id="insurance-compact" 
                checked={formData.includeInsurance} 
                onCheckedChange={(checked) => updateFormData('includeInsurance', checked)}
                className="scale-75"
              />
              <Label htmlFor="insurance-compact" className="text-xs">Insurance</Label>
            </div>
          </div>
        </div>
      </div>

      {/* NCM Branch as full width */}
      <div className="mt-3 pt-3 border-t">
        <Label className="text-xs font-medium text-gray-600">NCM Branch (Where NCM will deliver the package in Nepal)</Label>
        <Select value={formData.ncmBranch} onValueChange={(value) => updateFormData('ncmBranch', value)}>
          <SelectTrigger className="h-8 text-xs mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="kathmandu-central">Kathmandu Central</SelectItem>
            <SelectItem value="pokhara">Pokhara</SelectItem>
            <SelectItem value="chitwan">Chitwan</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  // Card-Based Grid Design
  const CardBasedGridDesign = () => (
    <div className="p-6 bg-gray-50 rounded-lg">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Route & Shipping</h2>
        <p className="text-sm text-gray-600">Configure your shipping preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Origin Card */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Globe className="h-4 w-4 text-green-600" />
              Origin
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-gray-600">Country</Label>
              <Select value={formData.originCountry} onValueChange={(value) => updateFormData('originCountry', value)}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">🇺🇸 United States</SelectItem>
                  <SelectItem value="UK">🇬🇧 United Kingdom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-600">State (for sales tax)</Label>
              <Select value={formData.originState} onValueChange={(value) => updateFormData('originState', value)}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NY">New York</SelectItem>
                  <SelectItem value="CA">California</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Destination Card */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4 text-red-600" />
              Destination
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-gray-600">Country</Label>
              <Select value={formData.destinationCountry} onValueChange={(value) => updateFormData('destinationCountry', value)}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NP">🇳🇵 Nepal</SelectItem>
                  <SelectItem value="IN">🇮🇳 India</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-600">Delivery Location</Label>
              <Select value={formData.deliveryLocation} onValueChange={(value) => updateFormData('deliveryLocation', value)}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urban">Urban/City</SelectItem>
                  <SelectItem value="rural">Rural</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Shipping Card */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Truck className="h-4 w-4 text-blue-600" />
              Shipping
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-gray-600">Method</Label>
              <Select value={formData.shippingMethod} onValueChange={(value) => updateFormData('shippingMethod', value)}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard (7-10 days)</SelectItem>
                  <SelectItem value="express">Express (3-5 days)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-600">Handling Fee</Label>
              <Select value={formData.handlingFeeType} onValueChange={(value) => updateFormData('handlingFeeType', value)}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Both ($10 + 2%)</SelectItem>
                  <SelectItem value="fixed">Fixed ($10)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* NCM Branch Card - Full width */}
        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="h-4 w-4 text-purple-600" />
              NCM Branch
              <span className="text-xs font-normal text-blue-600 ml-1">(Where NCM will deliver the package in Nepal)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={formData.ncmBranch} onValueChange={(value) => updateFormData('ncmBranch', value)}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kathmandu-central">Kathmandu Central</SelectItem>
                <SelectItem value="pokhara">Pokhara</SelectItem>
                <SelectItem value="chitwan">Chitwan</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Payment Card */}
        <Card className="md:col-span-2 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-green-600" />
              Payment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-gray-600">Gateway</Label>
              <Select value={formData.paymentGateway} onValueChange={(value) => updateFormData('paymentGateway', value)}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stripe">Stripe - 2.9% + $0.3</SelectItem>
                  <SelectItem value="paypal">PayPal - 3.2% + $0.3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Insurance Card */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-orange-600" />
              Insurance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Switch 
                id="insurance-card" 
                checked={formData.includeInsurance} 
                onCheckedChange={(checked) => updateFormData('includeInsurance', checked)}
              />
              <Label htmlFor="insurance-card" className="text-sm">Include (1% of value)</Label>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Ultra-Compact Design
  const UltraCompactDesign = () => (
    <div className="p-4 bg-white rounded-lg border">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-gray-900">Route & Shipping</h2>
        <Badge variant="outline" className="text-xs h-5">
          <Clock className="h-2.5 w-2.5 mr-1" />
          Quick Setup
        </Badge>
      </div>

      <div className="space-y-3">
        {/* First Row */}
        <div className="grid grid-cols-6 gap-2 text-xs">
          <div>
            <Label className="text-xs text-gray-500">Origin</Label>
            <Select value={formData.originCountry} onValueChange={(value) => updateFormData('originCountry', value)}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="US">🇺🇸 US</SelectItem>
                <SelectItem value="UK">🇬🇧 UK</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-gray-500">State</Label>
            <Select value={formData.originState} onValueChange={(value) => updateFormData('originState', value)}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NY">NY</SelectItem>
                <SelectItem value="CA">CA</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-gray-500">Destination</Label>
            <Select value={formData.destinationCountry} onValueChange={(value) => updateFormData('destinationCountry', value)}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NP">🇳🇵 NP</SelectItem>
                <SelectItem value="IN">🇮🇳 IN</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-gray-500">Location</Label>
            <Select value={formData.deliveryLocation} onValueChange={(value) => updateFormData('deliveryLocation', value)}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="urban">Urban</SelectItem>
                <SelectItem value="rural">Rural</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-gray-500">Shipping</Label>
            <Select value={formData.shippingMethod} onValueChange={(value) => updateFormData('shippingMethod', value)}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="express">Express</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-gray-500">Handling</Label>
            <Select value={formData.handlingFeeType} onValueChange={(value) => updateFormData('handlingFeeType', value)}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">Both</SelectItem>
                <SelectItem value="fixed">Fixed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Second Row */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="col-span-2">
            <Label className="text-xs text-gray-500">NCM Branch</Label>
            <Select value={formData.ncmBranch} onValueChange={(value) => updateFormData('ncmBranch', value)}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kathmandu-central">Kathmandu Central</SelectItem>
                <SelectItem value="pokhara">Pokhara</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-gray-500">Payment</Label>
            <Select value={formData.paymentGateway} onValueChange={(value) => updateFormData('paymentGateway', value)}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stripe">Stripe</SelectItem>
                <SelectItem value="paypal">PayPal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Insurance toggle */}
        <div className="flex items-center justify-between text-xs pt-1 border-t">
          <span className="text-gray-600">Options:</span>
          <div className="flex items-center space-x-2">
            <Switch 
              id="insurance-ultra" 
              checked={formData.includeInsurance} 
              onCheckedChange={(checked) => updateFormData('includeInsurance', checked)}
              className="scale-75"
            />
            <Label htmlFor="insurance-ultra" className="text-xs">Insurance (1% of value)</Label>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Route & Shipping Design Options</h1>
          <p className="text-gray-600">Compare different layout approaches for the Route & Shipping component</p>
        </div>

        <Tabs defaultValue="clean" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-8">
            <TabsTrigger value="clean">Clean Sectioned</TabsTrigger>
            <TabsTrigger value="horizontal">Horizontal Flow</TabsTrigger>
            <TabsTrigger value="compact">Compact Professional</TabsTrigger>
            <TabsTrigger value="cards">Card-Based Grid</TabsTrigger>
            <TabsTrigger value="ultra">Ultra-Compact</TabsTrigger>
          </TabsList>

          <TabsContent value="clean" className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-blue-900 mb-2">Clean Sectioned Design</h3>
              <p className="text-blue-700 text-sm">
                <strong>Pros:</strong> Very organized, clear visual hierarchy, easy to scan<br/>
                <strong>Cons:</strong> Takes more vertical space<br/>
                <strong>Best for:</strong> Admin interfaces where clarity is priority
              </p>
            </div>
            <CleanSectionedDesign />
          </TabsContent>

          <TabsContent value="horizontal" className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-green-900 mb-2">Horizontal Flow Design</h3>
              <p className="text-green-700 text-sm">
                <strong>Pros:</strong> Shows shipping flow visually, intuitive left-to-right progression<br/>
                <strong>Cons:</strong> Less space for field labels<br/>
                <strong>Best for:</strong> Showing the shipping journey clearly
              </p>
            </div>
            <HorizontalFlowDesign />
          </TabsContent>

          <TabsContent value="compact" className="space-y-4">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-purple-900 mb-2">Compact Professional Design</h3>
              <p className="text-purple-700 text-sm">
                <strong>Pros:</strong> Space-efficient, professional look, good balance<br/>
                <strong>Cons:</strong> Slightly cramped on smaller screens<br/>
                <strong>Best for:</strong> Most admin interfaces, good compromise
              </p>
            </div>
            <CompactProfessionalDesign />
          </TabsContent>

          <TabsContent value="cards" className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-orange-900 mb-2">Card-Based Grid Design</h3>
              <p className="text-orange-700 text-sm">
                <strong>Pros:</strong> Modern look, logical grouping, flexible layout<br/>
                <strong>Cons:</strong> More visual weight, cards can feel separate<br/>
                <strong>Best for:</strong> Dashboard-style interfaces, modern design preference
              </p>
            </div>
            <CardBasedGridDesign />
          </TabsContent>

          <TabsContent value="ultra" className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-red-900 mb-2">Ultra-Compact Design</h3>
              <p className="text-red-700 text-sm">
                <strong>Pros:</strong> Maximum space efficiency, fits in small areas<br/>
                <strong>Cons:</strong> Can feel cramped, harder to scan quickly<br/>
                <strong>Best for:</strong> When vertical space is extremely limited
              </p>
            </div>
            <UltraCompactDesign />
          </TabsContent>
        </Tabs>

        {/* Decision Help */}
        <div className="mt-8 bg-white rounded-lg border p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Which design should you choose?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium text-blue-900">For Maximum Clarity</h4>
              <p className="text-gray-600">Choose <strong>Clean Sectioned</strong> - Best for complex admin interfaces where understanding each section is crucial.</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-green-900">For Shipping Flow</h4>
              <p className="text-gray-600">Choose <strong>Horizontal Flow</strong> - Great when you want users to understand the shipping journey.</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-purple-900">For Balance</h4>
              <p className="text-gray-600">Choose <strong>Compact Professional</strong> - Best compromise between space and clarity.</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-orange-900">For Modern Look</h4>
              <p className="text-gray-600">Choose <strong>Card-Based Grid</strong> - Contemporary design with logical grouping.</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-red-900">For Tight Spaces</h4>
              <p className="text-gray-600">Choose <strong>Ultra-Compact</strong> - When every pixel of vertical space matters.</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Current Issue</h4>
              <p className="text-gray-600">The existing design lacks visual hierarchy and feels disorganized. Any of these options would be an improvement.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}