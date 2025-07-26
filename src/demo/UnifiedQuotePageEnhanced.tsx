import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { 
  Package,
  User,
  Calendar,
  Clock,
  DollarSign,
  Calculator,
  Truck,
  MessageSquare,
  FileText,
  Settings,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Edit2,
  Send,
  Check,
  X,
  AlertCircle,
  Info,
  TrendingUp,
  Globe,
  Hash,
  Link,
  Weight,
  MapPin,
  CreditCard,
  Building2,
  Mail,
  Phone,
  Copy,
  Download,
  Share2,
  Printer,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  XCircle,
  Clock3,
  Zap,
  Shield,
  Activity,
  Eye,
  Plus,
  Minus,
  ChevronUp,
  Trash2,
  Upload,
  Plane,
  Home,
  ShieldCheck,
  HandCoins,
  NotebookPen,
  Users,
  Lock,
  CircleDollarSign,
  Receipt,
  PlusCircle,
  TrendingDown,
  BarChart3,
  Sparkles,
  Timer,
  Wallet,
  IndianRupee,
  PackageCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Enhanced mock quote data with all fields
const mockQuote = {
  id: 'Q-2024-001234',
  tracking_id: 'IWB20241234',
  status: 'sent',
  created_at: '2024-01-20T10:30:00Z',
  updated_at: '2024-01-20T14:45:00Z',
  expires_at: '2024-01-27T10:30:00Z',
  customer: {
    id: 'cust-123',
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1 (555) 123-4567',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
    location: 'Mumbai, India',
    customer_since: '2023-05-15',
    total_orders: 12,
    total_spent: 45000,
    type: 'premium',
    preferred_language: 'en'
  },
  origin_country: 'US',
  destination_country: 'IN',
  currency: 'USD',
  exchange_rate: 83.25,
  items: [
    {
      id: '1',
      product_name: 'iPhone 15 Pro Max 256GB',
      product_url: 'https://www.amazon.com/...',
      image_url: 'https://m.media-amazon.com/images/I/81CgtwSII3L._AC_SX679_.jpg',
      price: 1199.99,
      quantity: 1,
      weight: 0.221,
      hsn_code: '8517',
      tax_method: 'hsn',
      valuation_method: 'minimum_valuation',
      minimum_valuation: 1500.00,
      tax_rates: { customs: 22, sales_tax: 8.875, destination_tax: 18 }
    },
    {
      id: '2',
      product_name: 'Apple AirPods Pro (2nd Generation)',
      product_url: 'https://www.amazon.com/...',
      image_url: 'https://m.media-amazon.com/images/I/61SUj2aKoEL._AC_SX679_.jpg',
      price: 249.00,
      quantity: 2,
      weight: 0.061,
      hsn_code: '8518',
      tax_method: 'hsn',
      valuation_method: 'product_value',
      tax_rates: { customs: 20, sales_tax: 8.875, destination_tax: 18 }
    }
  ],
  shipping: {
    // International Shipping
    international: {
      carrier: 'DHL Express',
      service: 'Express Worldwide',
      cost: 89.50,
      transit_days: '5-7',
      tracking_number: '',
      route: 'US → DE → IN',
      features: ['tracking', 'insurance', 'signature']
    },
    // Domestic Shipping (NEW)
    domestic: {
      enabled: true,
      carrier: 'Blue Dart',
      service: 'Surface',
      cost: 25.00,
      transit_days: '2-3',
      tracking_number: '',
      delivery_type: 'door',
      address: {
        line1: '123 Marine Drive',
        line2: 'Apartment 45B',
        city: 'Mumbai',
        state: 'Maharashtra',
        postal_code: '400001',
        country: 'India'
      }
    },
    // Packaging
    packaging: {
      type: 'bubble_wrap',
      special_handling: 'fragile',
      weight: 0.1
    }
  },
  fees: {
    // Insurance (ENHANCED)
    insurance: {
      mode: 'auto',
      base_rate: 0.01,
      calculated_amount: 16.99,
      manual_amount: null,
      coverage_type: 'full_value',
      provider: 'DHL Insurance'
    },
    // Handling (ENHANCED)
    handling: {
      base_fee: 15.00,
      per_item_fee: 5.00,
      total_items: 3,
      special_handling_fee: 0,
      total: 25.00
    },
    // Payment Processing
    payment: {
      gateway: 'stripe',
      fee_percentage: 2.9,
      fixed_fee: 0.30,
      total: 49.57
    }
  },
  pricing: {
    subtotal: 1698.98,
    tax_base: 1998.98,
    customs: 299.85,
    sales_tax: 150.89,
    destination_tax: 359.82,
    shipping_international: 89.50,
    shipping_domestic: 25.00,
    handling: 25.00,
    insurance: 16.99,
    payment_fee: 49.57,
    total: 2714.60,
    savings: {
      amount: 485.40,
      percentage: 15.2
    }
  },
  communication: {
    // Customer Notes (NEW)
    customer_notes: {
      visible: true,
      content: "Thank you for your order! Your iPhone will be carefully packaged with extra bubble wrap for maximum protection during international shipping. We'll send you tracking information as soon as your order ships.",
      delivery_instructions: "Please call 30 minutes before delivery. Preferred time: 10 AM - 2 PM"
    },
    // Internal Notes (NEW)
    internal_notes: {
      admin_notes: "VIP customer - ensure priority handling. Previous order had delay, provide extra care.",
      fulfillment_notes: "Double-check packaging for electronics. Use anti-static materials.",
      priority: 'high',
      assigned_to: 'fulfillment_team'
    }
  },
  activity_log: [
    { id: '1', timestamp: '2024-01-20T14:45:00Z', user: 'Admin', action: 'Quote sent to customer', type: 'status' },
    { id: '2', timestamp: '2024-01-20T14:30:00Z', user: 'System', action: 'Tax calculation completed', type: 'system' },
    { id: '3', timestamp: '2024-01-20T10:30:00Z', user: 'Customer', action: 'Quote requested', type: 'request' }
  ],
  messages: [
    { id: '1', timestamp: '2024-01-20T15:00:00Z', from: 'customer', text: 'Can you confirm if the iPhone includes a charger?' },
    { id: '2', timestamp: '2024-01-20T15:15:00Z', from: 'admin', text: 'Yes, it includes the USB-C cable but not the power adapter.' }
  ]
};

// Status configurations
const statusConfig = {
  draft: { label: 'Draft', color: 'bg-gray-500', icon: FileText },
  pending: { label: 'Pending', color: 'bg-yellow-500', icon: Clock },
  sent: { label: 'Sent', color: 'bg-blue-500', icon: Send },
  approved: { label: 'Approved', color: 'bg-green-500', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-500', icon: XCircle },
  expired: { label: 'Expired', color: 'bg-gray-500', icon: Clock3 }
};

// Carrier options
const internationalCarriers = [
  { value: 'dhl_express', label: 'DHL Express', transit: '5-7 days' },
  { value: 'fedex_priority', label: 'FedEx Priority', transit: '4-6 days' },
  { value: 'ups_worldwide', label: 'UPS Worldwide', transit: '6-8 days' },
  { value: 'aramex', label: 'Aramex', transit: '7-10 days' }
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

export default function UnifiedQuotePageEnhanced() {
  const [activeTab, setActiveTab] = useState('overview');
  const [domesticShippingEnabled, setDomesticShippingEnabled] = useState(mockQuote.shipping.domestic.enabled);
  const [insuranceMode, setInsuranceMode] = useState<'auto' | 'manual'>(mockQuote.fees.insurance.mode);
  const [customerNotesVisible, setCustomerNotesVisible] = useState(mockQuote.communication.customer_notes.visible);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const StatusIcon = statusConfig[mockQuote.status as keyof typeof statusConfig]?.icon || FileText;
  const statusColor = statusConfig[mockQuote.status as keyof typeof statusConfig]?.color || 'bg-gray-500';

  // Calculate days until expiry
  const daysUntilExpiry = Math.ceil(
    (new Date(mockQuote.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Quotes
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-semibold">Quote {mockQuote.tracking_id}</h1>
                  <Badge className={cn(statusColor, 'text-white')}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {statusConfig[mockQuote.status as keyof typeof statusConfig]?.label}
                  </Badge>
                  {daysUntilExpiry <= 3 && (
                    <Badge variant="destructive">
                      <Timer className="w-3 h-3 mr-1" />
                      Expires in {daysUntilExpiry} days
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Created on {new Date(mockQuote.created_at).toLocaleDateString()} • 
                  Last updated {new Date(mockQuote.updated_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" size="sm">
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              <Button size="sm">
                <Send className="w-4 h-4 mr-2" />
                Send to Customer
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Main Content */}
          <div className="col-span-8">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="items">Items & Tax</TabsTrigger>
                <TabsTrigger value="shipping">Shipping & Fees</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="messages">Messages</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6 space-y-6">
                {/* Customer Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Customer Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start gap-4">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={mockQuote.customer.avatar} />
                        <AvatarFallback>{mockQuote.customer.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{mockQuote.customer.name}</h3>
                          <Badge variant="secondary">
                            <Sparkles className="w-3 h-3 mr-1" />
                            {mockQuote.customer.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">{mockQuote.customer.email}</p>
                        <div className="grid grid-cols-3 gap-4 mt-4">
                          <div>
                            <p className="text-xs text-gray-500">Location</p>
                            <p className="text-sm font-medium flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {mockQuote.customer.location}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Customer Since</p>
                            <p className="text-sm font-medium">
                              {new Date(mockQuote.customer.customer_since).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Total Orders</p>
                            <p className="text-sm font-medium">{mockQuote.customer.total_orders}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quote Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quote Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {mockQuote.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <img 
                              src={item.image_url} 
                              alt={item.product_name}
                              className="w-12 h-12 object-cover rounded"
                            />
                            <div>
                              <p className="font-medium text-sm">{item.product_name}</p>
                              <p className="text-xs text-gray-500">
                                ${item.price} × {item.quantity} = ${(item.price * item.quantity).toFixed(2)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className="text-xs">
                              {item.tax_method}
                            </Badge>
                            <p className="text-xs text-gray-500 mt-1">
                              HSN: {item.hsn_code || 'N/A'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Shipping Summary */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Shipping Overview</CardTitle>
                      <Badge variant="secondary">
                        <Truck className="w-3 h-3 mr-1" />
                        {mockQuote.shipping.international.carrier}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Plane className="w-4 h-4 text-blue-600" />
                            <p className="font-medium text-sm">International Shipping</p>
                          </div>
                          <p className="text-sm text-gray-600">{mockQuote.shipping.international.carrier}</p>
                          <p className="text-xs text-gray-500">{mockQuote.shipping.international.transit_days} transit</p>
                          <p className="font-semibold mt-2">${mockQuote.shipping.international.cost}</p>
                        </div>
                        {mockQuote.shipping.domestic.enabled && (
                          <div className="p-4 bg-green-50 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Home className="w-4 h-4 text-green-600" />
                              <p className="font-medium text-sm">Domestic Delivery</p>
                            </div>
                            <p className="text-sm text-gray-600">{mockQuote.shipping.domestic.carrier}</p>
                            <p className="text-xs text-gray-500">{mockQuote.shipping.domestic.transit_days} days</p>
                            <p className="font-semibold mt-2">${mockQuote.shipping.domestic.cost}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>Route: {mockQuote.shipping.international.route}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="items" className="mt-6 space-y-6">
                {/* Items with per-item tax configuration */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">Items & Tax Configuration</CardTitle>
                        <CardDescription>
                          Configure tax calculation method and valuation for each item
                        </CardDescription>
                      </div>
                      <Button size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Item
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {mockQuote.items.map((item) => (
                        <div key={item.id} className="border rounded-lg">
                          <div className="p-4">
                            <div className="flex items-start gap-4">
                              <img 
                                src={item.image_url} 
                                alt={item.product_name}
                                className="w-20 h-20 object-cover rounded"
                              />
                              <div className="flex-1">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h4 className="font-medium">{item.product_name}</h4>
                                    <p className="text-sm text-gray-500 mt-1">
                                      ${item.price} × {item.quantity} = ${(item.price * item.quantity).toFixed(2)}
                                    </p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                                  >
                                    {expandedItem === item.id ? (
                                      <ChevronUp className="w-4 h-4" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4" />
                                    )}
                                  </Button>
                                </div>
                                
                                <div className="grid grid-cols-4 gap-4 mt-3">
                                  <div>
                                    <Label className="text-xs">Weight</Label>
                                    <div className="flex items-center gap-1 mt-1">
                                      <Weight className="w-3 h-3 text-gray-500" />
                                      <span className="text-sm font-medium">{item.weight} kg</span>
                                    </div>
                                  </div>
                                  <div>
                                    <Label className="text-xs">HSN Code</Label>
                                    <div className="flex items-center gap-1 mt-1">
                                      <Hash className="w-3 h-3 text-gray-500" />
                                      <span className="text-sm font-medium">{item.hsn_code || 'N/A'}</span>
                                    </div>
                                  </div>
                                  <div>
                                    <Label className="text-xs">Tax Method</Label>
                                    <Badge variant="outline" className="mt-1 text-xs">
                                      {item.tax_method}
                                    </Badge>
                                  </div>
                                  <div>
                                    <Label className="text-xs">Valuation</Label>
                                    <Badge variant="outline" className="mt-1 text-xs">
                                      {item.valuation_method}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {expandedItem === item.id && (
                            <div className="border-t px-4 py-3 bg-gray-50">
                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <Label className="text-xs">Tax Method</Label>
                                  <Select defaultValue={item.tax_method}>
                                    <SelectTrigger className="h-8 mt-1">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="hsn">HSN-based</SelectItem>
                                      <SelectItem value="country">Country Settings</SelectItem>
                                      <SelectItem value="manual">Manual</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-xs">Valuation Method</Label>
                                  <Select defaultValue={item.valuation_method}>
                                    <SelectTrigger className="h-8 mt-1">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="product_value">Product Value</SelectItem>
                                      <SelectItem value="minimum_valuation">Minimum Valuation</SelectItem>
                                      <SelectItem value="higher_of_both">Higher of Both</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-xs">Min. Valuation</Label>
                                  <Input 
                                    type="number" 
                                    className="h-8 mt-1" 
                                    placeholder="0.00"
                                    defaultValue={item.minimum_valuation}
                                  />
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-3 gap-4 mt-3">
                                <div>
                                  <Label className="text-xs">Customs %</Label>
                                  <Input 
                                    type="number" 
                                    className="h-8 mt-1" 
                                    placeholder="0"
                                    defaultValue={item.tax_rates.customs}
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Sales Tax %</Label>
                                  <Input 
                                    type="number" 
                                    className="h-8 mt-1" 
                                    placeholder="0"
                                    defaultValue={item.tax_rates.sales_tax}
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Dest. Tax %</Label>
                                  <Input 
                                    type="number" 
                                    className="h-8 mt-1" 
                                    placeholder="0"
                                    defaultValue={item.tax_rates.destination_tax}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Tax Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Tax Calculation Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Customs Duty</span>
                        <span className="font-medium">${mockQuote.pricing.customs.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Sales Tax</span>
                        <span className="font-medium">${mockQuote.pricing.sales_tax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Destination Tax (GST/VAT)</span>
                        <span className="font-medium">${mockQuote.pricing.destination_tax.toFixed(2)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-medium">
                        <span>Total Taxes</span>
                        <span>${(mockQuote.pricing.customs + mockQuote.pricing.sales_tax + mockQuote.pricing.destination_tax).toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="shipping" className="mt-6 space-y-6">
                {/* International Shipping */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Plane className="w-5 h-5" />
                          International Shipping
                        </CardTitle>
                        <CardDescription>
                          Primary shipping from {mockQuote.origin_country} to {mockQuote.destination_country}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary">
                        {mockQuote.shipping.international.route}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Carrier</Label>
                        <Select defaultValue="dhl_express">
                          <SelectTrigger className="mt-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {internationalCarriers.map(carrier => (
                              <SelectItem key={carrier.value} value={carrier.value}>
                                {carrier.label} - {carrier.transit}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Shipping Cost</Label>
                        <div className="relative mt-2">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <Input 
                            type="number" 
                            className="pl-10"
                            defaultValue={mockQuote.shipping.international.cost}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      {mockQuote.shipping.international.features.map((feature) => (
                        <div key={feature} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="capitalize">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Domestic/Last Mile Delivery */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Home className="w-5 h-5" />
                          Last Mile Delivery
                        </CardTitle>
                        <CardDescription>
                          Domestic shipping to customer address
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="domestic-toggle" className="text-sm">Enable</Label>
                        <Switch 
                          id="domestic-toggle"
                          checked={domesticShippingEnabled}
                          onCheckedChange={setDomesticShippingEnabled}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className={cn(!domesticShippingEnabled && "opacity-50")}>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Domestic Carrier</Label>
                        <Select 
                          defaultValue={mockQuote.shipping.domestic.carrier.toLowerCase().replace(' ', '')}
                          disabled={!domesticShippingEnabled}
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(domesticCarriers[mockQuote.destination_country] || []).map(carrier => (
                              <SelectItem key={carrier.value} value={carrier.value}>
                                {carrier.label} - {carrier.transit}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Domestic Shipping Cost</Label>
                        <div className="relative mt-2">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <Input 
                            type="number" 
                            className="pl-10"
                            defaultValue={mockQuote.shipping.domestic.cost}
                            disabled={!domesticShippingEnabled}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-blue-900">Delivery Address</p>
                          <p className="text-blue-800">
                            {mockQuote.shipping.domestic.address.line1}, {mockQuote.shipping.domestic.address.line2}<br />
                            {mockQuote.shipping.domestic.address.city}, {mockQuote.shipping.domestic.address.state} {mockQuote.shipping.domestic.address.postal_code}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Insurance & Protection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Insurance & Protection
                    </CardTitle>
                    <CardDescription>
                      Shipping insurance and package protection
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">Insurance Calculation</p>
                          <p className="text-sm text-gray-600">Auto-calculate or set manually</p>
                        </div>
                        <Select 
                          value={insuranceMode} 
                          onValueChange={(v: 'auto' | 'manual') => setInsuranceMode(v)}
                        >
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
                                <Edit2 className="w-4 h-4" />
                                Manual
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Insurance Amount</Label>
                          <div className="relative mt-2">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <Input 
                              type="number" 
                              className="pl-10"
                              value={insuranceMode === 'auto' ? mockQuote.fees.insurance.calculated_amount : ''}
                              placeholder={insuranceMode === 'auto' ? 'Auto-calculated' : 'Enter amount'}
                              readOnly={insuranceMode === 'auto'}
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Coverage Type</Label>
                          <Select defaultValue={mockQuote.fees.insurance.coverage_type}>
                            <SelectTrigger className="mt-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="full_value">Full Value Coverage</SelectItem>
                              <SelectItem value="declared">Declared Value</SelectItem>
                              <SelectItem value="limited">Limited Liability</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {insuranceMode === 'auto' && (
                        <Alert className="bg-green-50 border-green-200">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <AlertDescription className="text-green-800">
                            Auto-calculated: ${mockQuote.fees.insurance.calculated_amount} 
                            (Based on {(mockQuote.fees.insurance.base_rate * 100).toFixed(1)}% of order value)
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div>
                          <Label>Packaging Type</Label>
                          <Select defaultValue={mockQuote.shipping.packaging.type}>
                            <SelectTrigger className="mt-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="standard_box">Standard Box</SelectItem>
                              <SelectItem value="bubble_wrap">Bubble Wrap Package</SelectItem>
                              <SelectItem value="wooden_crate">Wooden Crate</SelectItem>
                              <SelectItem value="poly_mailer">Poly Mailer</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Special Handling</Label>
                          <Select defaultValue={mockQuote.shipping.packaging.special_handling}>
                            <SelectTrigger className="mt-2">
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
                    </div>
                  </CardContent>
                </Card>

                {/* Handling & Processing Fees */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <HandCoins className="w-5 h-5" />
                      Handling & Processing Fees
                    </CardTitle>
                    <CardDescription>
                      Additional fees for order processing
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Base Handling Fee</Label>
                        <div className="relative mt-2">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <Input 
                            type="number" 
                            className="pl-10"
                            defaultValue={mockQuote.fees.handling.base_fee}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Standard charge</p>
                      </div>
                      <div>
                        <Label>Per-Item Fee</Label>
                        <div className="relative mt-2">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <Input 
                            type="number" 
                            className="pl-10"
                            defaultValue={mockQuote.fees.handling.per_item_fee}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">× {mockQuote.fees.handling.total_items} items</p>
                      </div>
                      <div>
                        <Label>Total Handling</Label>
                        <div className="relative mt-2">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <Input 
                            type="number" 
                            className="pl-10 bg-gray-50"
                            value={mockQuote.fees.handling.total}
                            readOnly
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Auto-calculated</p>
                      </div>
                    </div>

                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                      <h4 className="text-sm font-medium text-blue-900 mb-2">Calculation Breakdown</h4>
                      <div className="space-y-1 text-sm text-blue-800">
                        <p>Base fee: ${mockQuote.fees.handling.base_fee}</p>
                        <p>Per-item: ${mockQuote.fees.handling.per_item_fee} × {mockQuote.fees.handling.total_items} = ${mockQuote.fees.handling.per_item_fee * mockQuote.fees.handling.total_items}</p>
                        <p className="font-medium pt-1 border-t border-blue-200">Total: ${mockQuote.fees.handling.total}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Communication & Notes */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      Communication & Notes
                    </CardTitle>
                    <CardDescription>
                      Customer-facing and internal notes
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Customer Notes */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>Customer Notes</Label>
                        <div className="flex items-center gap-2">
                          <Label htmlFor="customer-visible" className="text-sm">Visible to Customer</Label>
                          <Switch 
                            id="customer-visible"
                            checked={customerNotesVisible}
                            onCheckedChange={setCustomerNotesVisible}
                          />
                        </div>
                      </div>
                      <Textarea 
                        placeholder="Add notes visible to the customer..."
                        className="min-h-[100px]"
                        defaultValue={mockQuote.communication.customer_notes.content}
                      />
                      <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                        {customerNotesVisible ? (
                          <>
                            <Eye className="w-3 h-3" />
                            Customer will see this note
                          </>
                        ) : (
                          <>
                            <Lock className="w-3 h-3" />
                            Hidden from customer
                          </>
                        )}
                      </p>
                    </div>

                    {/* Delivery Instructions */}
                    <div>
                      <Label>Delivery Instructions</Label>
                      <Textarea 
                        placeholder="Special delivery instructions..."
                        className="mt-2"
                        defaultValue={mockQuote.communication.customer_notes.delivery_instructions}
                      />
                    </div>

                    <Separator />

                    {/* Internal Notes */}
                    <div>
                      <Label>Internal Admin Notes</Label>
                      <Textarea 
                        placeholder="Private notes for internal use..."
                        className="mt-2 min-h-[100px]"
                        defaultValue={mockQuote.communication.internal_notes.admin_notes}
                      />
                      <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        Only visible to admin users
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Priority Level</Label>
                        <Select defaultValue={mockQuote.communication.internal_notes.priority}>
                          <SelectTrigger className="mt-2">
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
                        <Select defaultValue={mockQuote.communication.internal_notes.assigned_to}>
                          <SelectTrigger className="mt-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fulfillment_team">Fulfillment Team</SelectItem>
                            <SelectItem value="john_doe">John Doe</SelectItem>
                            <SelectItem value="jane_smith">Jane Smith</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activity" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Activity Timeline</CardTitle>
                    <CardDescription>
                      Track all changes and updates to this quote
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {mockQuote.activity_log.map((activity, index) => (
                        <div key={activity.id} className="flex gap-4">
                          <div className="relative">
                            {index < mockQuote.activity_log.length - 1 && (
                              <div className="absolute top-8 left-4 w-px h-full bg-gray-200" />
                            )}
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center",
                              activity.type === 'status' ? "bg-blue-100" :
                              activity.type === 'system' ? "bg-green-100" :
                              "bg-gray-100"
                            )}>
                              {activity.type === 'status' ? (
                                <Activity className="w-4 h-4 text-blue-600" />
                              ) : activity.type === 'system' ? (
                                <Zap className="w-4 h-4 text-green-600" />
                              ) : (
                                <User className="w-4 h-4 text-gray-600" />
                              )}
                            </div>
                          </div>
                          <div className="flex-1 pb-4">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">{activity.action}</p>
                              <Badge variant="secondary" className="text-xs">
                                {activity.user}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(activity.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="messages" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Customer Messages</CardTitle>
                    <CardDescription>
                      Communication thread with the customer
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {mockQuote.messages.map((message) => (
                        <div key={message.id} className={cn(
                          "flex gap-3",
                          message.from === 'admin' && "flex-row-reverse"
                        )}>
                          <Avatar className="w-8 h-8">
                            <AvatarFallback>
                              {message.from === 'customer' ? 'C' : 'A'}
                            </AvatarFallback>
                          </Avatar>
                          <div className={cn(
                            "flex-1 max-w-[70%]",
                            message.from === 'admin' && "items-end"
                          )}>
                            <div className={cn(
                              "p-3 rounded-lg",
                              message.from === 'customer' 
                                ? "bg-gray-100" 
                                : "bg-blue-500 text-white"
                            )}>
                              <p className="text-sm">{message.text}</p>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(message.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-6 flex gap-2">
                      <Textarea 
                        placeholder="Type your message..."
                        className="min-h-[80px]"
                      />
                      <Button>
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="col-span-4 space-y-6">
            {/* Price Summary - Sticky */}
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-lg">Price Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span>${mockQuote.pricing.subtotal.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Int'l Shipping</span>
                      <span>${mockQuote.pricing.shipping_international.toFixed(2)}</span>
                    </div>
                    {mockQuote.shipping.domestic.enabled && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Domestic Shipping</span>
                        <span>${mockQuote.pricing.shipping_domestic.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Customs</span>
                      <span>${mockQuote.pricing.customs.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Taxes</span>
                      <span>${(mockQuote.pricing.sales_tax + mockQuote.pricing.destination_tax).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Handling</span>
                      <span>${mockQuote.pricing.handling.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Insurance</span>
                      <span>${mockQuote.pricing.insurance.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Fee</span>
                      <span>${mockQuote.pricing.payment_fee.toFixed(2)}</span>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>${mockQuote.pricing.total.toFixed(2)}</span>
                  </div>
                  
                  {mockQuote.pricing.savings.amount > 0 && (
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-green-800">Customer Saves</span>
                        <div className="text-right">
                          <p className="font-semibold text-green-800">
                            ${mockQuote.pricing.savings.amount.toFixed(2)}
                          </p>
                          <p className="text-xs text-green-600">
                            {mockQuote.pricing.savings.percentage}% off local price
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 space-y-2">
                  <Button className="w-full">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button variant="outline" className="w-full">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Recalculate
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm">
                    <Copy className="w-3 h-3 mr-1" />
                    Duplicate
                  </Button>
                  <Button variant="outline" size="sm">
                    <FileText className="w-3 h-3 mr-1" />
                    Convert to Order
                  </Button>
                  <Button variant="outline" size="sm">
                    <Clock className="w-3 h-3 mr-1" />
                    Extend Expiry
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-600">
                    <Trash2 className="w-3 h-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}