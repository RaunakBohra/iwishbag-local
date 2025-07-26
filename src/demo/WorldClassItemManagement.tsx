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
import { 
  Package,
  Link,
  Weight,
  Hash,
  DollarSign,
  Calculator,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Edit2,
  Trash2,
  Copy,
  ExternalLink,
  Search,
  Filter,
  Download,
  Upload,
  Settings,
  X,
  Check,
  Plus,
  Minus,
  ArrowUpDown,
  Eye,
  EyeOff,
  Info,
  Sparkles,
  TrendingUp,
  Globe,
  Zap,
  Command
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Enhanced mock data with all fields
const mockQuoteItems = [
  {
    id: '1',
    product_name: 'iPhone 15 Pro Max 256GB - Natural Titanium',
    product_url: 'https://www.amazon.com/Apple-iPhone-15-Pro-Max-256GB/dp/B0C123456',
    image_url: 'https://m.media-amazon.com/images/I/81CgtwSII3L._AC_SX679_.jpg',
    price: 1199.99,
    quantity: 1,
    weight: 0.221,
    weight_unit: 'kg',
    hsn_code: '8517',
    hsn_confidence: 0.95,
    category: 'Electronics',
    origin_country: 'US',
    tax_method: 'hsn',
    valuation_method: 'minimum_valuation',
    minimum_valuation: 1500,
    tax_rates: { customs: 15, sales_tax: 8.875, destination_tax: 18 },
    status: 'configured'
  },
  {
    id: '2',
    product_name: 'MacBook Pro 14" M3 Pro - Space Black',
    product_url: 'https://www.apple.com/shop/buy-mac/macbook-pro/14-inch-m3-pro',
    image_url: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/mbp14-spacegray-select-202310?wid=904&hei=840',
    price: 1999.00,
    quantity: 1,
    weight: 1.61,
    weight_unit: 'kg',
    hsn_code: null,
    category: 'Computers',
    origin_country: 'US',
    tax_method: null,
    valuation_method: null,
    tax_rates: null,
    status: 'needs_config'
  },
  {
    id: '3',
    product_name: 'Designer Gold Ring with Diamonds',
    product_url: 'https://www.tiffany.com/jewelry/rings/designer-gold-ring',
    image_url: null,
    price: 2500.00,
    quantity: 1,
    weight: 0.015,
    weight_unit: 'kg',
    hsn_code: '7113',
    hsn_confidence: 0.88,
    category: 'Jewelry',
    origin_country: 'US',
    tax_method: 'manual',
    valuation_method: 'higher_of_both',
    minimum_valuation: 1800,
    tax_rates: { customs: 12.5, sales_tax: 8.875, destination_tax: 3 },
    status: 'review_needed'
  },
  {
    id: '4',
    product_name: 'Nike Air Max 90 - White/Black',
    product_url: 'https://www.nike.com/t/air-max-90-mens-shoes',
    image_url: 'https://static.nike.com/a/images/t_PDP_1728_v1/f_auto,q_auto:eco/508214f1-5f24-444f-b3c9-f73a5c9a6b76/air-max-90-mens-shoes.png',
    price: 130.00,
    quantity: 2,
    weight: 0.385,
    weight_unit: 'kg',
    hsn_code: '6403',
    hsn_confidence: 0.92,
    category: 'Footwear',
    origin_country: 'VN',
    tax_method: 'hsn',
    valuation_method: 'minimum_valuation',
    minimum_valuation: 150,
    tax_rates: { customs: 20, sales_tax: 8.875, destination_tax: 18 },
    status: 'configured'
  }
];

// Status configurations
const statusConfig = {
  configured: { label: 'Configured', color: 'bg-green-500', icon: Check },
  needs_config: { label: 'Needs Config', color: 'bg-red-500', icon: AlertCircle },
  review_needed: { label: 'Review', color: 'bg-yellow-500', icon: Eye }
};

export default function WorldClassItemManagement() {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'compact'>('table');
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [sidebarItem, setSidebarItem] = useState<string | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Calculate totals
  const calculateTotals = () => {
    return mockQuoteItems.reduce((acc, item) => {
      const base = item.valuation_method === 'minimum_valuation' && item.minimum_valuation
        ? item.minimum_valuation
        : item.price;
      const taxes = item.tax_rates
        ? (base * (item.tax_rates.customs + item.tax_rates.sales_tax + item.tax_rates.destination_tax) / 100)
        : 0;
      return {
        items: acc.items + item.quantity,
        subtotal: acc.subtotal + (item.price * item.quantity),
        taxBase: acc.taxBase + (base * item.quantity),
        taxes: acc.taxes + (taxes * item.quantity),
        total: acc.total + ((item.price + taxes) * item.quantity)
      };
    }, { items: 0, subtotal: 0, taxBase: 0, taxes: 0, total: 0 });
  };

  const totals = calculateTotals();

  // Stripe-inspired Table View
  const TableView = () => (
    <div className="border rounded-lg overflow-hidden bg-white">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="w-10 px-4 py-3">
                <Checkbox 
                  checked={selectedItems.length === mockQuoteItems.length}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedItems(mockQuoteItems.map(i => i.id));
                    } else {
                      setSelectedItems([]);
                    }
                  }}
                />
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-900 text-sm">Product</th>
              <th className="text-left px-4 py-3 font-medium text-gray-900 text-sm">Price & Qty</th>
              <th className="text-left px-4 py-3 font-medium text-gray-900 text-sm">Weight & HSN</th>
              <th className="text-left px-4 py-3 font-medium text-gray-900 text-sm">Tax Config</th>
              <th className="text-left px-4 py-3 font-medium text-gray-900 text-sm">Status</th>
              <th className="w-10 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {mockQuoteItems.map((item) => (
              <React.Fragment key={item.id}>
                <tr 
                  className={cn(
                    "hover:bg-gray-50 transition-colors",
                    expandedItem === item.id && "bg-blue-50",
                    editingItem === item.id && "bg-yellow-50"
                  )}
                >
                  <td className="px-4 py-4">
                    <Checkbox 
                      checked={selectedItems.includes(item.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedItems([...selectedItems, item.id]);
                        } else {
                          setSelectedItems(selectedItems.filter(id => id !== item.id));
                        }
                      }}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                      >
                        {expandedItem === item.id ? 
                          <ChevronDown className="w-4 h-4" /> : 
                          <ChevronRight className="w-4 h-4" />
                        }
                      </button>
                      {item.image_url ? (
                        <img 
                          src={item.image_url} 
                          alt={item.product_name}
                          className="w-10 h-10 object-cover rounded"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                          <Package className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-gray-900 text-sm">
                          {item.product_name.length > 50 
                            ? item.product_name.substring(0, 50) + '...' 
                            : item.product_name
                          }
                        </div>
                        <a 
                          href={item.product_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          View product <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">
                        ${item.price.toFixed(2)} × {item.quantity}
                      </div>
                      <div className="text-gray-500">
                        ${(item.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm">
                      <div className="flex items-center gap-1 text-gray-900">
                        <Weight className="w-3 h-3" />
                        {item.weight} {item.weight_unit}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        {item.hsn_code ? (
                          <Badge variant="outline" className="text-xs">
                            HSN: {item.hsn_code}
                            {item.hsn_confidence && (
                              <span className="ml-1 text-gray-400">
                                {Math.round(item.hsn_confidence * 100)}%
                              </span>
                            )}
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs">
                            No HSN
                          </Badge>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {item.tax_method ? (
                      <div className="text-sm">
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="secondary" 
                            className="text-xs capitalize"
                          >
                            {item.tax_method}
                          </Badge>
                          <span className="text-gray-400">→</span>
                          <Badge 
                            variant="outline" 
                            className="text-xs capitalize"
                          >
                            {item.valuation_method?.replace('_', ' ')}
                          </Badge>
                        </div>
                        {item.tax_rates && (
                          <div className="text-xs text-gray-500 mt-1">
                            {item.tax_rates.customs}% / {item.tax_rates.sales_tax}% / {item.tax_rates.destination_tax}%
                          </div>
                        )}
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => setSidebarItem(item.id)}
                      >
                        Configure
                      </Button>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        statusConfig[item.status].color
                      )} />
                      <span className="text-sm text-gray-700">
                        {statusConfig[item.status].label}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSidebarItem(item.id)}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
                {expandedItem === item.id && (
                  <tr>
                    <td colSpan={7} className="px-4 py-4 bg-gray-50">
                      <ExpandedItemView item={item} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Expanded Item View (Linear-inspired)
  const ExpandedItemView = ({ item }: { item: typeof mockQuoteItems[0] }) => (
    <div className="grid grid-cols-3 gap-6">
      {/* Product Details */}
      <div className="space-y-4">
        <h4 className="font-medium text-sm text-gray-900">Product Details</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Origin Country</span>
            <span className="font-medium">{item.origin_country}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Category</span>
            <span className="font-medium">{item.category}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Total Weight</span>
            <span className="font-medium">{item.weight * item.quantity} {item.weight_unit}</span>
          </div>
        </div>
      </div>

      {/* Tax Configuration */}
      <div className="space-y-4">
        <h4 className="font-medium text-sm text-gray-900">Tax Configuration</h4>
        {item.tax_rates ? (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Customs Rate</span>
              <span className="font-medium">{item.tax_rates.customs}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Sales Tax</span>
              <span className="font-medium">{item.tax_rates.sales_tax}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Destination Tax</span>
              <span className="font-medium">{item.tax_rates.destination_tax}%</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Not configured</p>
        )}
      </div>

      {/* Valuation Details */}
      <div className="space-y-4">
        <h4 className="font-medium text-sm text-gray-900">Valuation Details</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Product Value</span>
            <span className="font-medium">${item.price.toFixed(2)}</span>
          </div>
          {item.minimum_valuation && (
            <div className="flex justify-between">
              <span className="text-gray-500">Minimum Valuation</span>
              <span className="font-medium">${item.minimum_valuation.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-500">Tax Base</span>
            <span className="font-semibold text-blue-600">
              ${item.valuation_method === 'minimum_valuation' && item.minimum_valuation
                ? item.minimum_valuation.toFixed(2)
                : item.price.toFixed(2)
              }
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  // Shopify-inspired Card View
  const CardView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {mockQuoteItems.map((item) => (
        <Card 
          key={item.id}
          className={cn(
            "hover:shadow-lg transition-shadow cursor-pointer",
            selectedItems.includes(item.id) && "ring-2 ring-blue-500"
          )}
          onClick={() => setSidebarItem(item.id)}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <Checkbox 
                checked={selectedItems.includes(item.id)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedItems([...selectedItems, item.id]);
                  } else {
                    setSelectedItems(selectedItems.filter(id => id !== item.id));
                  }
                }}
                onClick={(e) => e.stopPropagation()}
              />
              <div className={cn(
                "w-2 h-2 rounded-full",
                statusConfig[item.status].color
              )} />
            </div>

            <div className="flex gap-3 mb-3">
              {item.image_url ? (
                <img 
                  src={item.image_url} 
                  alt={item.product_name}
                  className="w-16 h-16 object-cover rounded"
                />
              ) : (
                <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                  <Package className="w-8 h-8 text-gray-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm text-gray-900 truncate">
                  {item.product_name}
                </h3>
                <p className="text-sm text-gray-500">
                  ${item.price} × {item.quantity}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Weight</span>
                <span>{item.weight} {item.weight_unit}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">HSN</span>
                <span>{item.hsn_code || 'Not set'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Tax</span>
                <span>{item.tax_method || 'Not configured'}</span>
              </div>
            </div>

            <Separator className="my-3" />

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                ${(item.price * item.quantity).toFixed(2)}
              </span>
              <Button size="sm" variant="ghost" className="text-xs">
                Edit
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // Notion-inspired Compact View
  const CompactView = () => (
    <div className="space-y-2">
      {mockQuoteItems.map((item) => (
        <div 
          key={item.id}
          className={cn(
            "flex items-center gap-4 p-3 border rounded-lg hover:bg-gray-50 transition-colors",
            selectedItems.includes(item.id) && "bg-blue-50 border-blue-300"
          )}
        >
          <Checkbox 
            checked={selectedItems.includes(item.id)}
            onCheckedChange={(checked) => {
              if (checked) {
                setSelectedItems([...selectedItems, item.id]);
              } else {
                setSelectedItems(selectedItems.filter(id => id !== item.id));
              }
            }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">{item.product_name}</span>
              <Badge variant="outline" className="text-xs">
                {item.quantity}x
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
              <span>${item.price}</span>
              <span>{item.weight}{item.weight_unit}</span>
              <span>HSN: {item.hsn_code || 'None'}</span>
              <span>{item.tax_method || 'No tax config'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              statusConfig[item.status].color
            )} />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarItem(item.id)}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );

  // Stripe-style Sidebar
  const ItemSidebar = () => {
    const item = mockQuoteItems.find(i => i.id === sidebarItem);
    if (!item) return null;

    return (
      <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="font-semibold text-lg">Item Details</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarItem(null)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Product Info */}
          <div>
            <h3 className="font-medium text-sm text-gray-900 mb-4">Product Information</h3>
            {item.image_url && (
              <img 
                src={item.image_url} 
                alt={item.product_name}
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
            )}
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Product Name</Label>
                <Input defaultValue={item.product_name} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Product URL</Label>
                <div className="flex gap-2 mt-1">
                  <Input defaultValue={item.product_url} />
                  <Button size="sm" variant="outline">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Price</Label>
                  <Input type="number" defaultValue={item.price} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Quantity</Label>
                  <Input type="number" defaultValue={item.quantity} className="mt-1" />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Physical Attributes */}
          <div>
            <h3 className="font-medium text-sm text-gray-900 mb-4">Physical Attributes</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Weight</Label>
                <Input type="number" defaultValue={item.weight} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Unit</Label>
                <Select defaultValue={item.weight_unit}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">Kilograms</SelectItem>
                    <SelectItem value="g">Grams</SelectItem>
                    <SelectItem value="lb">Pounds</SelectItem>
                    <SelectItem value="oz">Ounces</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Tax Configuration */}
          <div>
            <h3 className="font-medium text-sm text-gray-900 mb-4">Tax Configuration</h3>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">HSN Code</Label>
                <div className="flex gap-2 mt-1">
                  <Input 
                    defaultValue={item.hsn_code || ''} 
                    placeholder="Search or enter HSN"
                  />
                  <Button size="sm" variant="outline">
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
                {item.hsn_confidence && (
                  <p className="text-xs text-gray-500 mt-1">
                    Confidence: {Math.round(item.hsn_confidence * 100)}%
                  </p>
                )}
              </div>

              <div>
                <Label className="text-xs">Tax Method</Label>
                <Select defaultValue={item.tax_method || 'auto'}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Auto-detect
                      </div>
                    </SelectItem>
                    <SelectItem value="hsn">
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4" />
                        HSN-based
                      </div>
                    </SelectItem>
                    <SelectItem value="country">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Country defaults
                      </div>
                    </SelectItem>
                    <SelectItem value="manual">
                      <div className="flex items-center gap-2">
                        <Edit2 className="w-4 h-4" />
                        Manual entry
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Valuation Method</Label>
                <Select defaultValue={item.valuation_method || 'auto'}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto (Higher of both)</SelectItem>
                    <SelectItem value="product_value">Product Value</SelectItem>
                    <SelectItem value="minimum_valuation">Minimum Valuation</SelectItem>
                    <SelectItem value="higher_of_both">Higher of Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tax Rates */}
              <div className="space-y-2">
                <Label className="text-xs">Tax Rates (%)</Label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs text-gray-500">Customs</Label>
                    <Input 
                      type="number" 
                      defaultValue={item.tax_rates?.customs || 0}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Sales Tax</Label>
                    <Input 
                      type="number" 
                      defaultValue={item.tax_rates?.sales_tax || 0}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Dest. Tax</Label>
                    <Input 
                      type="number" 
                      defaultValue={item.tax_rates?.destination_tax || 0}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex gap-2">
            <Button className="flex-1">
              Save Changes
            </Button>
            <Button variant="outline" onClick={() => setSidebarItem(null)}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Linear inspired */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold">Quote Items Management</h1>
              <Badge variant="secondary">
                {mockQuoteItems.length} items
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCommandPaletteOpen(true)}
              >
                <Command className="w-4 h-4 mr-2" />
                Actions
              </Button>
              <div className="flex items-center border rounded-lg">
                <Button
                  variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="rounded-r-none"
                  onClick={() => setViewMode('table')}
                >
                  Table
                </Button>
                <Button
                  variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="rounded-none border-x"
                  onClick={() => setViewMode('cards')}
                >
                  Cards
                </Button>
                <Button
                  variant={viewMode === 'compact' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="rounded-l-none"
                  onClick={() => setViewMode('compact')}
                >
                  Compact
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedItems.length > 0 && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-blue-900">
                {selectedItems.length} items selected
              </span>
              <Button
                variant="link"
                size="sm"
                onClick={() => setSelectedItems([])}
                className="text-blue-700"
              >
                Clear selection
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary">
                <Calculator className="w-4 h-4 mr-2" />
                Apply Tax Method
              </Button>
              <Button size="sm" variant="secondary">
                <TrendingUp className="w-4 h-4 mr-2" />
                Set Valuation
              </Button>
              <Button size="sm" variant="secondary">
                <Hash className="w-4 h-4 mr-2" />
                Bulk HSN
              </Button>
              <Button size="sm" variant="ghost" className="text-red-600">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Items</p>
                  <p className="text-2xl font-semibold">{totals.items}</p>
                </div>
                <Package className="w-8 h-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Subtotal</p>
                  <p className="text-2xl font-semibold">${totals.subtotal.toFixed(2)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Tax Base</p>
                  <p className="text-2xl font-semibold">${totals.taxBase.toFixed(2)}</p>
                </div>
                <Calculator className="w-8 h-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Est. Taxes</p>
                  <p className="text-2xl font-semibold">${totals.taxes.toFixed(2)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* View Modes */}
        {viewMode === 'table' && <TableView />}
        {viewMode === 'cards' && <CardView />}
        {viewMode === 'compact' && <CompactView />}

        {/* Add Item Button */}
        <div className="mt-6 flex justify-center">
          <Button variant="outline" className="w-full max-w-sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Sidebar */}
      {sidebarItem && <ItemSidebar />}

      {/* Command Palette Placeholder */}
      {commandPaletteOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Press ESC to close
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="ghost" className="w-full justify-start">
                  <Upload className="w-4 h-4 mr-2" />
                  Import Items from CSV
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  <Download className="w-4 h-4 mr-2" />
                  Export to Excel
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  <Zap className="w-4 h-4 mr-2" />
                  Auto-detect all HSN codes
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  <Calculator className="w-4 h-4 mr-2" />
                  Recalculate all taxes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}