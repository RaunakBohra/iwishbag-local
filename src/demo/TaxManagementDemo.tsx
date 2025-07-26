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
import { 
  Calculator, 
  AlertCircle, 
  ChevronRight, 
  ChevronDown,
  Package,
  Globe,
  Edit,
  Brain,
  Lock,
  Unlock,
  Settings,
  Info,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock data for demo
const mockItems = [
  { id: '1', name: 'iPhone 15', price: 800, quantity: 1, hsn_code: '8517', category: 'Electronics' },
  { id: '2', name: 'MacBook Pro', price: 1200, quantity: 1, hsn_code: '8471', category: 'Computers' },
  { id: '3', name: 'Custom Ring', price: 500, quantity: 1, hsn_code: null, category: 'Jewelry' },
  { id: '4', name: 'Generic Toy', price: 30, quantity: 2, hsn_code: null, category: 'Toys' }
];

const mockTaxRates = {
  hsn: {
    '8517': { customs: 15, sales_tax: 8.5, destination_tax: 18 },
    '8471': { customs: 10, sales_tax: 8.5, destination_tax: 20 }
  },
  country: { customs: 10, sales_tax: 8.5, destination_tax: 18 }
};

export default function TaxManagementDemo() {
  const [selectedApproach, setSelectedApproach] = useState('hybrid');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [taxMethod, setTaxMethod] = useState<'global' | 'per-item'>('per-item');
  const [selectedItems, setSelectedItems] = useState<string[]>(['3']); // Ring needs tax setup

  // Helper to detect tax method for item
  const detectTaxMethod = (item: typeof mockItems[0]) => {
    if (item.hsn_code && mockTaxRates.hsn[item.hsn_code]) {
      return { method: 'hsn', rates: mockTaxRates.hsn[item.hsn_code], confidence: 'high' };
    }
    if (!item.hsn_code && item.category) {
      return { method: 'country', rates: mockTaxRates.country, confidence: 'medium' };
    }
    return { method: 'manual', rates: null, confidence: 'low' };
  };

  // Component: Current Broken Approach
  const CurrentBrokenApproach = () => (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          Current Approach (Broken)
        </CardTitle>
        <CardDescription>
          Global tax rates applied to all items - causes incorrect calculations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This approach applies the same tax rate to all items, regardless of their category or HSN code!
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>Customs %</Label>
            <Input type="number" defaultValue="15" className="mt-1" />
          </div>
          <div>
            <Label>Sales Tax</Label>
            <Input type="number" defaultValue="50.00" prefix="$" className="mt-1" />
          </div>
          <div>
            <Label>Destination Tax</Label>
            <Input type="number" defaultValue="75.00" prefix="$" className="mt-1" />
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">
            <strong>Problem:</strong> iPhone (15% customs) and Laptop (10% customs) both get 15% applied!
          </p>
        </div>
      </CardContent>
    </Card>
  );

  // Component: Sidebar Approach
  const SidebarApproach = () => (
    <div className="flex gap-4 h-[600px]">
      {/* Main Form */}
      <Card className="flex-1">
        <CardHeader>
          <CardTitle>Quote Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Items</Label>
            {mockItems.map(item => {
              const detection = detectTaxMethod(item);
              return (
                <div key={item.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    <span className="font-medium">{item.name}</span>
                    <span className="text-gray-500">${item.price}</span>
                  </div>
                  <Badge 
                    variant={detection.method === 'manual' ? 'destructive' : 'default'}
                    className="text-xs"
                  >
                    {detection.method === 'hsn' && '✅ HSN Auto'}
                    {detection.method === 'country' && '✅ Country'}
                    {detection.method === 'manual' && '⚠️ Set Tax'}
                  </Badge>
                </div>
              );
            })}
          </div>
          
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Tax Configuration: Per-Item</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                Configure Taxes
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            {selectedItems.length > 0 && (
              <Alert className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {selectedItems.length} item(s) need tax configuration
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sidebar */}
      <Card className={cn(
        "w-96 transition-all duration-300",
        sidebarOpen ? "translate-x-0" : "translate-x-full absolute right-0"
      )}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Tax Management</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <PerItemTaxTable />
        </CardContent>
      </Card>
    </div>
  );

  // Component: Main Component Integration
  const MainComponentApproach = () => (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Quote Details</CardTitle>
        <CardDescription>
          Tax management embedded in main form - can be overwhelming
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label>Customer Information</Label>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <Input placeholder="Name" />
            <Input placeholder="Email" />
          </div>
        </div>

        <div>
          <Label>Items</Label>
          <div className="mt-2 space-y-2">
            {mockItems.slice(0, 2).map(item => (
              <div key={item.id} className="p-2 border rounded">
                {item.name} - ${item.price}
              </div>
            ))}
          </div>
        </div>

        {/* Tax Configuration taking up lots of space */}
        <div className="border-2 border-orange-200 rounded-lg p-4 bg-orange-50">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Tax Configuration
          </h3>
          <PerItemTaxTable />
        </div>

        <div>
          <Label>Shipping Details</Label>
          <Input placeholder="Address" className="mt-2" />
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Tax configuration makes the form very long and complex for all users!
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );

  // Component: Hybrid Smart Approach
  const HybridSmartApproach = () => {
    const [expandedItem, setExpandedItem] = useState<string | null>(null);

    return (
      <div className="flex gap-4">
        {/* Main Form */}
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Unified Quote Interface</CardTitle>
            <CardDescription>
              Clean main form with smart tax indicators
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <Label>Items & Tax Overview</Label>
                <Select value={taxMethod} onValueChange={(v: any) => setTaxMethod(v)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global Tax</SelectItem>
                    <SelectItem value="per-item">Per-Item Tax</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {mockItems.map(item => {
                const detection = detectTaxMethod(item);
                const isExpanded = expandedItem === item.id;
                
                return (
                  <div key={item.id} className="border rounded-lg">
                    <div 
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
                      onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox />
                        <Package className="w-4 h-4" />
                        <span className="font-medium">{item.name}</span>
                        <span className="text-gray-500">${item.price}</span>
                        <span className="text-gray-400">×{item.quantity}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={detection.method === 'manual' ? 'destructive' : 'default'}
                          className="text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (detection.method === 'manual') setSidebarOpen(true);
                          }}
                        >
                          {detection.method === 'hsn' && '✅ HSN Auto'}
                          {detection.method === 'country' && '✅ Country'}
                          {detection.method === 'manual' && '⚠️ Set Tax'}
                        </Badge>
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="px-3 pb-3 border-t bg-gray-50">
                        <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                          <div>
                            <span className="text-gray-600">Customs:</span>
                            <span className="ml-1 font-medium">
                              {detection.rates?.customs || '__'}%
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Sales:</span>
                            <span className="ml-1 font-medium">
                              {detection.rates?.sales_tax || '__'}%
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Dest:</span>
                            <span className="ml-1 font-medium">
                              {detection.rates?.destination_tax || '__'}%
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t flex items-center justify-between">
              <div className="text-sm">
                <span className="text-gray-600">Tax Summary:</span>
                <span className="ml-2 font-semibold">$950 total</span>
              </div>
              <Button 
                variant={selectedItems.length > 0 ? "default" : "outline"}
                size="sm"
                onClick={() => setSidebarOpen(true)}
              >
                Configure Taxes
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Smart Sidebar - Hidden by default */}
        <div className={cn(
          "transition-all duration-300",
          sidebarOpen ? "w-96" : "w-32"
        )}>
          {!sidebarOpen ? (
            <Card className="h-full">
              <CardContent className="p-4">
                <div className="text-center space-y-2">
                  <Calculator className="w-8 h-8 mx-auto text-gray-400" />
                  <p className="text-xs text-gray-600">Tax Summary</p>
                  <p className="font-semibold">$950</p>
                  {selectedItems.length > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {selectedItems.length} needs setup
                    </Badge>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full"
                    onClick={() => setSidebarOpen(true)}
                  >
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Tax Management Panel</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm text-gray-600">
                    Tax Mode: <span className="font-medium">Per-Item</span>
                  </div>
                  <PerItemTaxTable compact />
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full">
                      <Brain className="w-4 h-4 mr-2" />
                      Apply HSN to All
                    </Button>
                    <Button variant="outline" size="sm" className="w-full">
                      <Globe className="w-4 h-4 mr-2" />
                      Set Country Default
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  };

  // Reusable Per-Item Tax Table
  const PerItemTaxTable = ({ compact = false }: { compact?: boolean }) => (
    <div className="space-y-2">
      <div className="text-sm font-medium mb-2">Per-Item Tax Configuration</div>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2">Item</th>
              <th className="text-left p-2">Method</th>
              <th className="text-center p-2">Customs</th>
              <th className="text-center p-2">Sales</th>
              <th className="text-center p-2">Dest</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {mockItems.map(item => {
              const detection = detectTaxMethod(item);
              return (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="p-2">
                    <div className="flex items-center gap-1">
                      {compact ? item.name.split(' ')[0] : item.name}
                    </div>
                  </td>
                  <td className="p-2">
                    <Select defaultValue={detection.method}>
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hsn">
                          <span className="flex items-center gap-1">
                            <Brain className="w-3 h-3" /> HSN
                          </span>
                        </SelectItem>
                        <SelectItem value="country">
                          <span className="flex items-center gap-1">
                            <Globe className="w-3 h-3" /> Country
                          </span>
                        </SelectItem>
                        <SelectItem value="manual">
                          <span className="flex items-center gap-1">
                            <Edit className="w-3 h-3" /> Manual
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-2 text-center">
                    {detection.method === 'manual' ? (
                      <Input className="h-7 w-16 text-xs text-center" placeholder="%" />
                    ) : (
                      <span className="text-xs">{detection.rates?.customs}%</span>
                    )}
                  </td>
                  <td className="p-2 text-center">
                    {detection.method === 'manual' ? (
                      <Input className="h-7 w-16 text-xs text-center" placeholder="%" />
                    ) : (
                      <span className="text-xs">{detection.rates?.sales_tax}%</span>
                    )}
                  </td>
                  <td className="p-2 text-center">
                    {detection.method === 'manual' ? (
                      <Input className="h-7 w-16 text-xs text-center" placeholder="%" />
                    ) : (
                      <span className="text-xs">{detection.rates?.destination_tax}%</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="text-xs text-gray-600 mt-2">
        <div className="flex items-center justify-between">
          <span>Method Distribution:</span>
          <span>HSN: 2 | Country: 1 | Manual: 1</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span>Total Tax Impact:</span>
          <span className="font-semibold">$950.00</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Tax Management UI Demo</h1>
        <p className="text-gray-600">
          Compare different approaches for per-item tax management
        </p>
      </div>

      <Tabs value={selectedApproach} onValueChange={setSelectedApproach} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="current">Current (Broken)</TabsTrigger>
          <TabsTrigger value="sidebar">Sidebar Approach</TabsTrigger>
          <TabsTrigger value="main">Main Component</TabsTrigger>
          <TabsTrigger value="hybrid">Hybrid Smart</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="mt-6">
          <CurrentBrokenApproach />
        </TabsContent>

        <TabsContent value="sidebar" className="mt-6">
          <SidebarApproach />
        </TabsContent>

        <TabsContent value="main" className="mt-6">
          <MainComponentApproach />
        </TabsContent>

        <TabsContent value="hybrid" className="mt-6">
          <HybridSmartApproach />
        </TabsContent>
      </Tabs>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Key Features Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Current Approach</h4>
              <ul className="space-y-1 text-red-600">
                <li>❌ Incorrect calculations</li>
                <li>❌ No per-item support</li>
                <li>❌ Legal compliance issues</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Sidebar Approach</h4>
              <ul className="space-y-1 text-green-600">
                <li>✅ Clean main form</li>
                <li>✅ Progressive disclosure</li>
                <li>✅ Advanced features hidden</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Main Component</h4>
              <ul className="space-y-1 text-orange-600">
                <li>⚠️ Overwhelming UI</li>
                <li>⚠️ Always visible complexity</li>
                <li>✅ Everything in one place</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Hybrid Smart</h4>
              <ul className="space-y-1 text-green-600">
                <li>✅ Best of both worlds</li>
                <li>✅ Smart indicators</li>
                <li>✅ On-demand complexity</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}