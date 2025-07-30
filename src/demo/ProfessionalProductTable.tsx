import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ChevronDown, 
  ChevronRight, 
  Edit, 
  Copy, 
  MoreVertical,
  Package,
  DollarSign,
  Scale,
  FileText,
  Plus,
  X,
  Calculator,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Sample data
const sampleProducts = [
  {
    id: 1,
    name: 'MacBook Pro 16"',
    url: 'https://apple.com/macbook-pro-16',
    price: 2400,
    quantity: 1,
    weight: 2.5,
    weightSource: 'manual',
    dimensions: null,
    hsnCode: '8517',
    taxMethod: 'hsn',
    valuationMethod: 'actual',
    seller: 'Apple Store',
    imageUrl: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/mbp16-spacegray-select-202301?wid=200&hei=200'
  },
  {
    id: 2,
    name: 'iPhone 15 Pro',
    url: 'https://apple.com/iphone-15-pro',
    price: 999,
    quantity: 2,
    weight: 0.2,
    weightSource: 'hsn',
    dimensions: { length: 40, width: 30, height: 35, unit: 'cm' },
    volumetricWeight: 8.4,
    hsnCode: '8517',
    taxMethod: 'manual',
    valuationMethod: 'actual',
    seller: 'Apple Store',
    imageUrl: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-pro-naturaltitanium-select?wid=200&hei=200'
  },
  {
    id: 3,
    name: 'Sony WH-1000XM5',
    url: 'https://electronics.sony.com/wh-1000xm5',
    price: 399,
    quantity: 1,
    weight: 0.25,
    weightSource: 'ml',
    dimensions: { length: 22, width: 19, height: 8, unit: 'cm' },
    volumetricWeight: 0.67,
    hsnCode: '8518',
    taxMethod: 'hsn',
    valuationMethod: 'minimum',
    seller: 'Sony Direct',
    imageUrl: 'https://m.media-amazon.com/images/I/31SKhfXerJL._SY445_SX342_QL70_FMwebp_.jpg'
  }
];

const ProfessionalProductTable = () => {
  const [selectedLayout, setSelectedLayout] = useState<'enhanced-linear' | 'linear' | 'cards' | 'workspace'>('enhanced-linear');
  const [products, setProducts] = useState(sampleProducts);
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [expandedRows, setExpandedRows] = useState<number[]>([]);
  const [dimensionUnit, setDimensionUnit] = useState<'cm' | 'in'>('cm');

  const toggleRowExpansion = (id: number) => {
    setExpandedRows(prev => 
      prev.includes(id) ? prev.filter(row => row !== id) : [...prev, id]
    );
  };

  const calculateVolumetricWeight = (dimensions: any, divisor = 5000) => {
    if (!dimensions) return null;
    const { length, width, height, unit } = dimensions;
    // Convert to cm if needed
    const multiplier = unit === 'in' ? 2.54 : 1;
    const volumeCm3 = length * width * height * multiplier * multiplier * multiplier;
    return volumeCm3 / divisor;
  };

  const updateProductDimensions = (productId: number, dimensions: any) => {
    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        const volumetricWeight = calculateVolumetricWeight({ ...dimensions, unit: dimensionUnit });
        return { ...p, dimensions: { ...dimensions, unit: dimensionUnit }, volumetricWeight };
      }
      return p;
    }));
  };

  // Enhanced Linear Layout with Expandable Rows (Recommended)
  const EnhancedLinearLayout = () => (
    <div className="w-full">
      <div className="border rounded-lg overflow-hidden">
        {}
        <div className="divide-y">
          {products.map((product) => {
            const isExpanded = expandedRows.includes(product.id);
            const hasVolumetric = product.volumetricWeight && product.volumetricWeight > product.weight;
            
            return (
              <div key={product.id} className="hover:bg-gray-50 transition-colors">
                {}
                    <div className="col-span-2">
                      <div className="text-sm font-mono">{product.hsnCode}</div>
                    </div>
                    
                    {}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wider">
                            Dimensions
                          </h4>
                          <Select value={dimensionUnit} onValueChange={(v: 'cm' | 'in') => setDimensionUnit(v)}>
                            <SelectTrigger className="w-16 h-6 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cm">cm</SelectItem>
                              <SelectItem value="in">in</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Input 
                              placeholder="L"
                              className="h-8 text-sm"
                              defaultValue={product.dimensions?.length}
                              onChange={(e) => {
                                const dims = {
                                  length: parseFloat(e.target.value) || 0,
                                  width: product.dimensions?.width || 0,
                                  height: product.dimensions?.height || 0
                                };
                                updateProductDimensions(product.id, dims);
                              }}
                            />
                            <span className="text-gray-500">×</span>
                            <Input 
                              placeholder="W"
                              className="h-8 text-sm"
                              defaultValue={product.dimensions?.width}
                              onChange={(e) => {
                                const dims = {
                                  length: product.dimensions?.length || 0,
                                  width: parseFloat(e.target.value) || 0,
                                  height: product.dimensions?.height || 0
                                };
                                updateProductDimensions(product.id, dims);
                              }}
                            />
                            <span className="text-gray-500">×</span>
                            <Input 
                              placeholder="H"
                              className="h-8 text-sm"
                              defaultValue={product.dimensions?.height}
                              onChange={(e) => {
                                const dims = {
                                  length: product.dimensions?.length || 0,
                                  width: product.dimensions?.width || 0,
                                  height: parseFloat(e.target.value) || 0
                                };
                                updateProductDimensions(product.id, dims);
                              }}
                            />
                          </div>
                          {!product.dimensions && (
                            <p className="text-xs text-gray-500">
                              Enter dimensions to calculate volumetric weight
                            </p>
                          )}
                          {product.dimensions && (
                            <div className="text-xs text-gray-600">
                              Volume: {(
                                (product.dimensions.length || 0) * 
                                (product.dimensions.width || 0) * 
                                (product.dimensions.height || 0)
                              ).toLocaleString()} {dimensionUnit}³
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {}
      <div className="mt-6 p-4 border rounded-lg bg-gray-50">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Sample Breakdown (Your Existing Sidebar)</h3>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Subtotal:</span>
            <span>$3,798</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Shipping:</span>
            <span>$125</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Customs:</span>
            <span>$760</span>
          </div>
          <div className="flex justify-between font-medium pt-2 border-t">
            <span>Total:</span>
            <span>$4,683</span>
          </div>
        </div>
      </div>
    </div>
  );

  // Layout 1: Linear Narrative
  const LinearNarrativeLayout = () => (
    <div className="w-full">
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-6 py-3 border-b">
          <div className="flex items-center justify-between text-xs font-medium text-gray-600 uppercase tracking-wider">
            <span>Product Story</span>
            <span>Actions</span>
          </div>
        </div>
        <div className="divide-y">
          {products.map((product) => (
            <div key={product.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-gray-900 mb-1">{product.name}</div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="text-blue-600 hover:underline cursor-pointer">
                      {new URL(product.url).hostname}
                    </span>
                    <span className="text-gray-400">→</span>
                    <span>${product.price.toLocaleString()} × {product.quantity}</span>
                    <span className="text-gray-400">→</span>
                    <span>
                      {product.weight}kg
                      {product.volumetricWeight && product.volumetricWeight > product.weight && (
                        <span className="text-orange-600 ml-1">(↑{product.volumetricWeight.toFixed(1)}kg)</span>
                      )}
                    </span>
                    <span className="text-gray-400">→</span>
                    <span>HSN:{product.hsnCode}</span>
                    <span className="text-gray-400">→</span>
                    <span className="capitalize">{product.taxMethod} Tax</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Layout 2: Data Card Grid
  const DataCardGridLayout = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {products.map((product) => (
        <Card key={product.id} className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-base">{product.name}</CardTitle>
                <CardDescription className="text-xs truncate">
                  {new URL(product.url).hostname}
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {}
        <div className="flex-1 border rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b">
            <div className="text-sm font-medium text-gray-700">Main Product List</div>
          </div>
          <div className="divide-y">
            {products.map((product) => (
              <div
                key={product.id}
                onClick={() => setSelectedProduct(product.id)}
                className={cn(
                  "px-4 py-3 cursor-pointer transition-colors",
                  selectedProduct === product.id ? "bg-blue-50 border-l-2 border-blue-500" : "hover:bg-gray-50"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <input type="checkbox" className="rounded" />
                      <div>
                        <div className="font-medium text-sm">{product.name}</div>
                        <div className="text-xs text-gray-600 mt-1">
                          {product.weight} kg | HSN: {product.hsnCode}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm">${product.price.toLocaleString()} × {product.quantity}</div>
                    <div className="text-sm font-medium">= ${(product.price * product.quantity).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium text-sm mb-3 uppercase text-gray-600">Tax & Compliance</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-600">HSN Code</label>
                    <Input value={selected.hsnCode} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Tax Method</label>
                    <Select defaultValue={selected.taxMethod}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hsn">HSN</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="ai">AI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Tax Rate</label>
                    <div className="text-sm font-medium mt-1">20%</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">Select a product to view details</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Professional Product Table Designs</h1>
        <p className="text-gray-600">Three industry-standard layouts for complex product data management</p>
      </div>

      <Tabs value={selectedLayout} onValueChange={(v) => setSelectedLayout(v as any)}>
        <TabsList className="mb-6">
          <TabsTrigger value="enhanced-linear">Enhanced Linear (Recommended)</TabsTrigger>
          <TabsTrigger value="linear">Linear Narrative</TabsTrigger>
          <TabsTrigger value="cards">Data Card Grid</TabsTrigger>
          <TabsTrigger value="workspace">Contextual Workspace</TabsTrigger>
        </TabsList>

        <TabsContent value="enhanced-linear">
          <Card>
            <CardHeader>
              <CardTitle>Enhanced Linear Layout with Expandable Rows</CardTitle>
              <CardDescription>
                Recommended approach - Clean table with expandable details, works perfectly with your existing breakdown sidebar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EnhancedLinearLayout />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="linear">
          <Card>
            <CardHeader>
              <CardTitle>Linear Narrative Layout</CardTitle>
              <CardDescription>
                Inspired by Stripe - Natural left-to-right reading flow with all data in a single line
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LinearNarrativeLayout />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cards">
          <Card>
            <CardHeader>
              <CardTitle>Data Card Grid Layout</CardTitle>
              <CardDescription>
                Inspired by Notion - Each product as a mini dashboard with grouped sections
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataCardGridLayout />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workspace">
          <Card>
            <CardHeader>
              <CardTitle>Contextual Workspace Layout</CardTitle>
              <CardDescription>
                Inspired by Figma - Clean list with detailed inspector panel for selected items
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ContextualWorkspaceLayout />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Design System Reference */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Design System Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-8">
            <div>
              <h3 className="font-medium mb-3">Typography Scale</h3>
              <div className="space-y-2 text-sm">
                <div>Product Name: 14px/20px Medium</div>
                <div>Primary Data: 13px/18px Regular</div>
                <div>Secondary: 11px/16px Regular</div>
                <div>Labels: 10px/14px Medium Uppercase</div>
              </div>
            </div>
            <div>
              <h3 className="font-medium mb-3">Color Palette</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-900 rounded"></div>
                  <span className="text-sm">Text Primary: #111827</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-500 rounded"></div>
                  <span className="text-sm">Text Secondary: #6B7280</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-200 rounded"></div>
                  <span className="text-sm">Border: #E5E7EB</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-500 rounded"></div>
                  <span className="text-sm">Warning: #F59E0B</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-medium mb-3">Spacing System</h3>
              <div className="space-y-2 text-sm">
                <div>Row Height: 56px (comfortable)</div>
                <div>Cell Padding: 16px horizontal</div>
                <div>Section Gap: 24px</div>
                <div>Card Gap: 16px</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfessionalProductTable;