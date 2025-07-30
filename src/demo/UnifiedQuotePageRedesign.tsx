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
  Upload
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock quote data
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
    location: 'New York, USA',
    customer_since: '2023-05-15',
    total_orders: 12,
    total_spent: 45000
  },
  origin_country: 'US',
  destination_country: 'IN',
  currency: 'USD',
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
      minimum_valuation: 1500,
      tax_rates: { customs: 15, sales_tax: 8.875, destination_tax: 18 }
    },
    {
      id: '2',
      product_name: 'Apple AirPods Pro (2nd Gen)',
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
    method: 'DHL Express',
    route: 'US → DE → IN',
    estimated_days: 5,
    cost: 89.50,
    tracking_available: true
  },
  pricing: {
    subtotal: 1698.98,
    tax_base: 1998.98,
    customs: 299.85,
    sales_tax: 150.89,
    destination_tax: 359.82,
    shipping: 89.50,
    handling: 25.00,
    insurance: 15.00,
    total: 2639.04
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

export default function UnifiedQuotePageRedesign() {
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>(['items', 'pricing']);
  const [messageText, setMessageText] = useState('');

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const StatusIcon = statusConfig[mockQuote.status as keyof typeof statusConfig].icon;

  // Calculate days until expiry
  const daysUntilExpiry = Math.ceil((new Date(mockQuote.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="min-h-screen bg-gray-50">
      {}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Shipping Details</CardTitle>
                    <Badge variant="secondary">
                      <Truck className="w-3 h-3 mr-1" />
                      {mockQuote.shipping.method}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Route</p>
                      <p className="font-medium flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {mockQuote.shipping.route}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Estimated Delivery</p>
                      <p className="font-medium">{mockQuote.shipping.estimated_days} business days</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Shipping Cost</p>
                      <p className="font-medium">${mockQuote.shipping.cost.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'items' && (
            <div className="space-y-6">
              {}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Items & Tax Management</CardTitle>
                      <CardDescription>
                        Configure products, pricing, and tax settings per item
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Upload className="w-4 h-4 mr-2" />
                        Import
                      </Button>
                      <Button size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Item
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left px-4 py-3 font-medium text-gray-900 text-sm">Product</th>
                          <th className="text-center px-4 py-3 font-medium text-gray-900 text-sm">Price & Qty</th>
                          <th className="text-center px-4 py-3 font-medium text-gray-900 text-sm">Weight & HSN</th>
                          <th className="text-center px-4 py-3 font-medium text-gray-900 text-sm">Tax Method</th>
                          <th className="text-center px-4 py-3 font-medium text-gray-900 text-sm">Valuation</th>
                          <th className="text-center px-4 py-3 font-medium text-gray-900 text-sm">Tax Rates</th>
                          <th className="text-center px-4 py-3 font-medium text-gray-900 text-sm">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {mockQuote.items.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <img 
                                  src={item.image_url} 
                                  alt={item.product_name}
                                  className="w-10 h-10 object-cover rounded"
                                />
                                <div>
                                  <p className="font-medium text-sm">{item.product_name}</p>
                                  <a href={item.product_url} className="text-xs text-blue-600 hover:underline">
                                    View source
                                  </a>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <p className="text-sm font-medium">${item.price}</p>
                              <p className="text-xs text-gray-500">× {item.quantity}</p>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <p className="text-sm">{item.weight}kg</p>
                              <Badge variant="outline" className="text-xs mt-1">
                                {item.hsn_code}
                              </Badge>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <Select defaultValue={item.tax_method}>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="hsn">HSN</SelectItem>
                                  <SelectItem value="country">Country</SelectItem>
                                  <SelectItem value="manual">Manual</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <Select defaultValue={item.valuation_method}>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="product_value">Product</SelectItem>
                                  <SelectItem value="minimum_valuation">Minimum</SelectItem>
                                  <SelectItem value="higher_of_both">Higher</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <div className="text-xs">
                                <p>{item.tax_rates.customs}% / {item.tax_rates.sales_tax}%</p>
                                <p className="text-gray-500">{item.tax_rates.destination_tax}%</p>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <Button variant="ghost" size="sm">
                                <Edit2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'shipping' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Shipping Configuration</CardTitle>
                  <CardDescription>
                    Manage shipping routes, carriers, and costs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Route Visualization */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span className="font-medium">US</span>
                        </div>
                        <div className="flex-1 mx-4 border-t-2 border-dashed border-gray-300 relative">
                          <Truck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">DE</span>
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        </div>
                        <div className="flex-1 mx-4 border-t-2 border-dashed border-gray-300"></div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">IN</span>
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        </div>
                      </div>
                    </div>

                    {/* Carrier Options */}
                    <div>
                      <Label className="text-sm font-medium mb-3 block">Available Carriers</Label>
                      <div className="grid grid-cols-3 gap-4">
                        {['DHL Express', 'FedEx Priority', 'UPS Worldwide'].map((carrier) => (
                          <div
                            key={carrier}
                            className={cn(
                              "border rounded-lg p-4 cursor-pointer transition-colors",
                              carrier === mockQuote.shipping.method
                                ? "border-blue-500 bg-blue-50"
                                : "hover:border-gray-300"
                            )}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-sm">{carrier}</span>
                              {carrier === mockQuote.shipping.method && (
                                <CheckCircle className="w-4 h-4 text-blue-500" />
                              )}
                            </div>
                            <p className="text-xs text-gray-500">5-7 business days</p>
                            <p className="text-sm font-semibold mt-1">$89.50</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Additional Options */}
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <Label className="text-sm font-medium">Insurance</Label>
                        <Select defaultValue="yes">
                          <SelectTrigger className="mt-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="yes">Yes ($15.00)</SelectItem>
                            <SelectItem value="no">No Insurance</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Tracking</Label>
                        <Select defaultValue="available">
                          <SelectTrigger className="mt-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="available">Available</SelectItem>
                            <SelectItem value="not_available">Not Available</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'activity' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Activity Timeline</CardTitle>
                <CardDescription>
                  Track all changes and interactions for this quote
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <div className="absolute left-9 top-0 bottom-0 w-px bg-gray-200"></div>
                  <div className="space-y-6">
                    {mockQuote.activity_log.map((activity, index) => (
                      <div key={activity.id} className="flex gap-4">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                          activity.type === 'status' ? "bg-blue-100" : "bg-gray-100"
                        )}>
                          {activity.type === 'status' ? (
                            <Send className="w-4 h-4 text-blue-600" />
                          ) : activity.type === 'system' ? (
                            <Zap className="w-4 h-4 text-gray-600" />
                          ) : (
                            <User className="w-4 h-4 text-gray-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{activity.user}</span>
                            <span className="text-xs text-gray-500">
                              {new Date(activity.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{activity.action}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'messages' && (
            <Card className="h-[600px] flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg">Customer Communication</CardTitle>
                <CardDescription>
                  Direct messages with the customer about this quote
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                  {mockQuote.messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex",
                        message.from === 'admin' ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[70%] rounded-lg px-4 py-2",
                          message.from === 'admin'
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100"
                        )}
                      >
                        <p className="text-sm">{message.text}</p>
                        <p className={cn(
                          "text-xs mt-1",
                          message.from === 'admin' ? "text-blue-100" : "text-gray-500"
                        )}>
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type your message..."
                    className="resize-none"
                    rows={3}
                  />
                  <Button className="self-end">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Sidebar - Stripe Style */}
        <div className="w-96 border-l bg-white p-6 overflow-y-auto">
          {/* Quote Summary */}
          <div className="space-y-6">
            {/* Status & Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quote Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Current Status</span>
                  <div className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white",
                    statusConfig[mockQuote.status as keyof typeof statusConfig].color
                  )}>
                    <StatusIcon className="w-3 h-3" />
                    {statusConfig[mockQuote.status as keyof typeof statusConfig].label}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Expires In</span>
                  <span className="text-sm font-medium text-orange-600">
                    {daysUntilExpiry} days
                  </span>
                </div>
                <Progress value={((7 - daysUntilExpiry) / 7) * 100} className="h-2" />
                
                <Separator />
                
                <div className="space-y-2">
                  <Button className="w-full" size="sm">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve Quote
                  </Button>
                  <Button variant="outline" className="w-full" size="sm">
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject Quote
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Price Breakdown */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Price Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Product Subtotal</span>
                    <span>${mockQuote.pricing.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Tax Base</span>
                    <span>${mockQuote.pricing.tax_base.toFixed(2)}</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Customs Duty</span>
                      <span>${mockQuote.pricing.customs.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Sales Tax</span>
                      <span>${mockQuote.pricing.sales_tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Destination Tax</span>
                      <span>${mockQuote.pricing.destination_tax.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Shipping</span>
                      <span>${mockQuote.pricing.shipping.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Handling</span>
                      <span>${mockQuote.pricing.handling.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Insurance</span>
                      <span>${mockQuote.pricing.insurance.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between">
                    <span className="font-semibold">Grand Total</span>
                    <span className="font-semibold text-lg text-green-600">
                      ${mockQuote.pricing.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Origin</p>
                    <p className="font-medium">{mockQuote.origin_country}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Destination</p>
                    <p className="font-medium">{mockQuote.destination_country}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Created</p>
                    <p className="font-medium">
                      {new Date(mockQuote.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Updated</p>
                    <p className="font-medium">
                      {new Date(mockQuote.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicate Quote
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Convert to Order
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <Mail className="w-4 h-4 mr-2" />
                  Email Customer
                </Button>
                <Button variant="outline" className="w-full justify-start text-red-600" size="sm">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Quote
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}