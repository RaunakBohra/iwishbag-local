import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  Truck,
  Package,
  Shield,
  DollarSign,
  Calculator,
  MessageSquare,
  Info,
  AlertCircle,
  CheckCircle2,
  Globe,
  Home,
  Clock,
  MapPin,
  FileText,
  Lock,
  Eye,
  PlusCircle,
  Settings,
  Zap,
  ArrowRight,
  Building2,
  Plane,
  Ship,
  PackageCheck,
  HandCoins,
  ShieldCheck,
  NotebookPen,
  Users,
  Sparkles,
  TrendingUp,
  BarChart3,
  Receipt,
  CreditCard,
  Banknote,
  CircleDollarSign,
  Wallet,
  Target,
  Timer,
  RefreshCw,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock data for demonstration
const mockQuoteData = {
  id: 'Q-2024-001234',
  items_total: 1698.98,
  destination_country: 'IN',
  origin_country: 'US',
  customer_type: 'premium',
  shipping_routes: [
    { from: 'New York, USA', to: 'Mumbai, India', carrier: 'DHL Express' }
  ]
};

// Carrier options for different legs
const internationalCarriers = [
  { value: 'dhl_express', label: 'DHL Express', transit: '5-7 days', features: ['tracking', 'insurance'] },
  { value: 'fedex_priority', label: 'FedEx Priority', transit: '4-6 days', features: ['tracking', 'insurance', 'signature'] },
  { value: 'ups_worldwide', label: 'UPS Worldwide', transit: '6-8 days', features: ['tracking', 'insurance'] },
  { value: 'aramex', label: 'Aramex', transit: '7-10 days', features: ['tracking'] }
];

const domesticCarriers = {
  IN: [
    { value: 'bluedart', label: 'Blue Dart', transit: '2-3 days' },
    { value: 'delhivery', label: 'Delhivery', transit: '3-4 days' },
    { value: 'dtdc', label: 'DTDC', transit: '3-5 days' },
    { value: 'india_post', label: 'India Post', transit: '5-7 days' }
  ],
  US: [
    { value: 'usps', label: 'USPS', transit: '3-5 days' },
    { value: 'ups_ground', label: 'UPS Ground', transit: '2-4 days' },
    { value: 'fedex_ground', label: 'FedEx Ground', transit: '2-4 days' }
  ]
};

const packagingTypes = [
  { value: 'standard_box', label: 'Standard Box', description: 'Regular cardboard box' },
  { value: 'bubble_wrap', label: 'Bubble Wrap Package', description: 'Extra protection for fragile items' },
  { value: 'wooden_crate', label: 'Wooden Crate', description: 'Maximum protection for high-value items' },
  { value: 'poly_mailer', label: 'Poly Mailer', description: 'Lightweight items like clothing' }
];

export default function AdminShippingFeesEnhanced() {
  const [activeTab, setActiveTab] = useState('shipping');
  const [insuranceMode, setInsuranceMode] = useState<'auto' | 'manual'>('auto');
  const [domesticShippingEnabled, setDomesticShippingEnabled] = useState(true);
  const [customerNotesVisible, setCustomerNotesVisible] = useState(true);
  const [calculationDetails, setCalculationDetails] = useState({
    insurance: { base: 1698.98, rate: 0.01, amount: 16.99 },
    handling: { items: 2, perItem: 5, additional: 15, total: 25 }
  });

  // Auto-calculate insurance
  const calculateInsurance = () => {
    const base = mockQuoteData.items_total;
    const rate = 0.01; // 1% of order value
    return (base * rate).toFixed(2);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Enhanced Shipping & Fees Management</h1>
        <p className="text-gray-600">
          Comprehensive shipping, fees, and communication management for quote {mockQuoteData.id}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="shipping">
            <Truck className="w-4 h-4 mr-2" />
            Shipping
          </TabsTrigger>
          <TabsTrigger value="fees">
            <CircleDollarSign className="w-4 h-4 mr-2" />
            Fees & Costs
          </TabsTrigger>
          <TabsTrigger value="communication">
            <MessageSquare className="w-4 h-4 mr-2" />
            Communication
          </TabsTrigger>
          <TabsTrigger value="summary">
            <BarChart3 className="w-4 h-4 mr-2" />
            Summary
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shipping" className="mt-6 space-y-6">
          {/* International Shipping Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Plane className="w-5 h-5" />
                    International Shipping
                  </CardTitle>
                  <CardDescription>
                    Primary shipping from origin to destination country
                  </CardDescription>
                </div>
                <Badge variant="secondary">
                  {mockQuoteData.origin_country} → {mockQuoteData.destination_country}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Carrier Selection</Label>
                  <Select defaultValue="dhl_express">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {internationalCarriers.map(carrier => (
                        <SelectItem key={carrier.value} value={carrier.value}>
                          <div className="flex items-center justify-between w-full">
                            <span>{carrier.label}</span>
                            <span className="text-sm text-gray-500 ml-2">{carrier.transit}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Shipping Cost</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input 
                      type="number" 
                      placeholder="89.50" 
                      defaultValue="89.50"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Transit Time</Label>
                  <Input placeholder="5-7 days" defaultValue="5-7 days" />
                </div>
                <div>
                  <Label>Tracking Number</Label>
                  <Input placeholder="Will be added after shipping" />
                </div>
                <div>
                  <Label>Service Type</Label>
                  <Select defaultValue="express">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="express">Express</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="economy">Economy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  International shipping includes customs clearance and door-to-port delivery
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Domestic/Last Mile Delivery Section */}
          <Card className={cn(!domesticShippingEnabled && "opacity-60")}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Home className="w-5 h-5" />
                    Last Mile Delivery
                  </CardTitle>
                  <CardDescription>
                    Domestic shipping from port/airport to customer address
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="domestic-enabled" className="text-sm">Enable</Label>
                  <Switch 
                    id="domestic-enabled"
                    checked={domesticShippingEnabled}
                    onCheckedChange={setDomesticShippingEnabled}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Domestic Carrier</Label>
                  <Select defaultValue="bluedart" disabled={!domesticShippingEnabled}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(domesticCarriers[mockQuoteData.destination_country] || []).map(carrier => (
                        <SelectItem key={carrier.value} value={carrier.value}>
                          <div className="flex items-center justify-between w-full">
                            <span>{carrier.label}</span>
                            <span className="text-sm text-gray-500 ml-2">{carrier.transit}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Domestic Shipping Cost</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input 
                      type="number" 
                      placeholder="25.00" 
                      defaultValue="25.00"
                      className="pl-10"
                      disabled={!domesticShippingEnabled}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Estimated Delivery</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input 
                      type="text" 
                      placeholder="2-3 days after customs" 
                      defaultValue="2-3 days after customs"
                      className="pl-10"
                      disabled={!domesticShippingEnabled}
                    />
                  </div>
                </div>
                <div>
                  <Label>Delivery Type</Label>
                  <Select defaultValue="door" disabled={!domesticShippingEnabled}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="door">Door Delivery</SelectItem>
                      <SelectItem value="pickup">Pickup Point</SelectItem>
                      <SelectItem value="office">Office Delivery</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {domesticShippingEnabled && (
                <Alert className="bg-blue-50 border-blue-200">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    Customer address: Mumbai, Maharashtra 400001, India
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Packaging Options */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Packaging & Protection
              </CardTitle>
              <CardDescription>
                Select appropriate packaging based on item type and value
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Packaging Type</Label>
                  <Select defaultValue="bubble_wrap">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {packagingTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          <div>
                            <p className="font-medium">{type.label}</p>
                            <p className="text-xs text-gray-500">{type.description}</p>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Special Handling</Label>
                  <Select defaultValue="fragile">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="fragile">Fragile - Handle with Care</SelectItem>
                      <SelectItem value="temperature">Temperature Controlled</SelectItem>
                      <SelectItem value="orientation">This Side Up</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fees" className="mt-6 space-y-6">
          {/* Insurance Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Shipping Insurance
              </CardTitle>
              <CardDescription>
                Protect shipment against loss or damage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">Insurance Calculation Mode</p>
                  <p className="text-xs text-gray-600">Auto-calculate based on order value or set manually</p>
                </div>
                <Select value={insuranceMode} onValueChange={(v: 'auto' | 'manual') => setInsuranceMode(v)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">
                      <div className="flex items-center gap-2">
                        <Calculator className="w-4 h-4" />
                        Auto
                      </div>
                    </SelectItem>
                    <SelectItem value="manual">
                      <div className="flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        Manual
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Insurance Amount</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input 
                      type="number" 
                      value={insuranceMode === 'auto' ? calculateInsurance() : ''}
                      placeholder={insuranceMode === 'auto' ? 'Auto-calculated' : 'Enter amount'}
                      className="pl-10"
                      readOnly={insuranceMode === 'auto'}
                    />
                  </div>
                </div>
                <div>
                  <Label>Coverage Type</Label>
                  <Select defaultValue="full">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Full Value Coverage</SelectItem>
                      <SelectItem value="declared">Declared Value</SelectItem>
                      <SelectItem value="limited">Limited Liability</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {insuranceMode === 'auto' && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <div className="space-y-1">
                      <p>Auto-calculated: ${calculateInsurance()}</p>
                      <p className="text-xs">Based on 1% of order value (${mockQuoteData.items_total})</p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Handling Fees Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HandCoins className="w-5 h-5" />
                Handling & Processing Fees
              </CardTitle>
              <CardDescription>
                Additional fees for order processing and special handling
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Base Handling Fee</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input 
                      type="number" 
                      placeholder="15.00" 
                      defaultValue="15.00"
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Standard handling charge</p>
                </div>
                <div>
                  <Label>Per-Item Fee</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input 
                      type="number" 
                      placeholder="5.00" 
                      defaultValue="5.00"
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Additional per item</p>
                </div>
                <div>
                  <Label>Total Handling</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input 
                      type="number" 
                      value="25.00"
                      className="pl-10 bg-gray-50"
                      readOnly
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Auto-calculated total</p>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Calculation Breakdown</h4>
                <div className="space-y-1 text-sm text-blue-800">
                  <p>Base fee: $15.00</p>
                  <p>Per-item fee: $5.00 × 2 items = $10.00</p>
                  <p className="font-medium pt-1 border-t border-blue-200">Total: $25.00</p>
                </div>
              </div>

              <div>
                <Label>Special Handling Requirements</Label>
                <Textarea 
                  placeholder="Note any special handling requirements (e.g., fragile electronics, liquid items, etc.)"
                  className="mt-2"
                />
              </div>
            </CardContent>
          </Card>

          {/* Additional Fees */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Additional Fees & Adjustments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Payment Processing Fee</p>
                    <p className="text-sm text-gray-600">2.9% + $0.30 per transaction</p>
                  </div>
                  <span className="font-medium">$49.57</span>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Currency Conversion</p>
                    <p className="text-sm text-gray-600">USD to INR @ 83.25</p>
                  </div>
                  <span className="font-medium">Included</span>
                </div>
                <Button variant="outline" className="w-full">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Add Custom Fee
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="communication" className="mt-6 space-y-6">
          {/* Customer Notes Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Customer Communication
                  </CardTitle>
                  <CardDescription>
                    Notes and messages visible to the customer
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="customer-visible" className="text-sm">Visible to Customer</Label>
                  <Switch 
                    id="customer-visible"
                    checked={customerNotesVisible}
                    onCheckedChange={setCustomerNotesVisible}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Quote Notes for Customer</Label>
                <Textarea 
                  placeholder="Add any special notes or instructions for the customer..."
                  className="mt-2 min-h-[100px]"
                  defaultValue="Thank you for your order! Your iPhone will be carefully packaged with bubble wrap for maximum protection during international shipping."
                />
                <p className="text-xs text-gray-500 mt-2">
                  {customerNotesVisible ? (
                    <span className="flex items-center gap-1 text-green-600">
                      <Eye className="w-3 h-3" />
                      Customer will see this note
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-gray-600">
                      <Lock className="w-3 h-3" />
                      Hidden from customer
                    </span>
                  )}
                </p>
              </div>

              <div>
                <Label>Delivery Instructions</Label>
                <Textarea 
                  placeholder="Special delivery instructions (e.g., call before delivery, specific time preferences)"
                  className="mt-2"
                  defaultValue="Please call customer 30 minutes before delivery. Preferred delivery time: 10 AM - 2 PM"
                />
              </div>

              <Alert>
                <MessageSquare className="h-4 w-4" />
                <AlertDescription>
                  Customer can also add their own delivery preferences during checkout
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Internal Notes Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <NotebookPen className="w-5 h-5" />
                Internal Notes
              </CardTitle>
              <CardDescription>
                Private notes for admin reference only
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Admin Notes</Label>
                <Textarea 
                  placeholder="Internal notes about this order..."
                  className="mt-2 min-h-[100px]"
                  defaultValue="VIP customer - ensure priority handling. Previous order had delay, provide extra care."
                />
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Only visible to admin users
                </p>
              </div>

              <div>
                <Label>Fulfillment Notes</Label>
                <Textarea 
                  placeholder="Notes for warehouse/fulfillment team..."
                  className="mt-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Priority Level</Label>
                  <Select defaultValue="high">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low Priority</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High Priority</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Assigned To</Label>
                  <Select defaultValue="team">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="team">Fulfillment Team</SelectItem>
                      <SelectItem value="john">John Doe</SelectItem>
                      <SelectItem value="jane">Jane Smith</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Communication History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Communication History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex gap-3 text-sm">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Customer inquiry about delivery time</p>
                    <p className="text-gray-600">Responded with estimated 5-7 days timeline</p>
                    <p className="text-xs text-gray-500">2 hours ago</p>
                  </div>
                </div>
                <div className="flex gap-3 text-sm">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Quote sent to customer</p>
                    <p className="text-gray-600">Awaiting approval</p>
                    <p className="text-xs text-gray-500">Yesterday at 3:45 PM</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="mt-6">
          {/* Complete Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Complete Shipping & Fees Summary</CardTitle>
              <CardDescription>
                Overview of all shipping costs, fees, and notes for quote {mockQuoteData.id}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Shipping Summary */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  Shipping Details
                </h3>
                <div className="space-y-2 pl-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">International Shipping (DHL Express)</span>
                    <span className="font-medium">$89.50</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Domestic Delivery (Blue Dart)</span>
                    <span className="font-medium">$25.00</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold pt-2 border-t">
                    <span>Total Shipping</span>
                    <span>$114.50</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Fees Summary */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <CircleDollarSign className="w-4 h-4" />
                  Additional Fees
                </h3>
                <div className="space-y-2 pl-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Insurance (Auto-calculated)</span>
                    <span className="font-medium">$16.99</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Handling Fee</span>
                    <span className="font-medium">$25.00</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Payment Processing</span>
                    <span className="font-medium">$49.57</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold pt-2 border-t">
                    <span>Total Additional Fees</span>
                    <span>$91.56</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Communication Summary */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Communication Summary
                </h3>
                <div className="space-y-3 pl-6">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-900 mb-1">Customer Note</p>
                    <p className="text-sm text-blue-800">
                      Thank you for your order! Your iPhone will be carefully packaged with bubble wrap for maximum protection.
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-900 mb-1">Internal Note</p>
                    <p className="text-sm text-gray-700">
                      VIP customer - ensure priority handling. Previous order had delay, provide extra care.
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Grand Total */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Product Total</span>
                    <span>$1,698.98</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total Shipping</span>
                    <span>$114.50</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total Fees</span>
                    <span>$91.56</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Grand Total</span>
                    <span className="text-green-600">$1,905.04</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button className="flex-1">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Save All Changes
                </Button>
                <Button variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Recalculate
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}