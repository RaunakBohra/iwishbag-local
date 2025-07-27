import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
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
  AlertCircle,
  Maximize2,
  TrendingUp,
  Zap,
  Layers,
  Globe,
  Check,
  ArrowRight,
  Info,
  Brain,
  Database,
  Bot,
  Settings,
  Receipt,
  ExternalLink,
  Hash,
  Trash2,
  Copy as CopyIcon,
  Star,
  Download,
  Link
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SmartHSNSearch } from '@/components/admin/hsn-components/SmartHSNSearch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Sample data with comprehensive weight and tax options
const sampleProducts = [
  {
    id: 1,
    name: 'MacBook Pro 16"',
    url: 'https://apple.com/macbook-pro-16',
    price: 2400,
    quantity: 1,
    weight: 2.5,
    weightSource: 'customs', // customs, ml, ai, volumetric
    dimensions: { length: 35.57, width: 24.59, height: 1.68, unit: 'cm' },
    hsnCode: '8471',
    taxMethod: 'customs', // customs, hsn, country, manual
    valuationMethod: 'actual', // minimum, actual
    seller: 'Apple Store',
    imageUrl: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/mbp16-spacegray-select-202301?wid=200&hei=200',
    weightOptions: {
      customs: 2.5,   // Official customs weight
      ml: 2.42,       // ML prediction
      ai: 2.48,       // AI estimation
      volumetric: 2.95 // Calculated volumetric weight
    },
    taxOptions: {
      customs: { rate: 25, amount: 600, method: 'Customs Database' },
      hsn: { rate: 18, amount: 432, method: 'HSN 8471 - Computers' },
      country: { rate: 20, amount: 480, method: 'India Standard Rate' },
      manual: { rate: 28, amount: 672, method: 'Manual Override' }
    },
    valuationOptions: {
      minimum: 1800, // Minimum customs valuation
      actual: 2400   // Actual purchase price
    }
  },
  {
    id: 2,
    name: 'iPhone 15 Pro',
    url: 'https://apple.com/iphone-15-pro',
    price: 999,
    quantity: 2,
    weight: 0.187,
    weightSource: 'ml',
    dimensions: { length: 14.67, width: 7.09, height: 0.83, unit: 'cm' },
    hsnCode: '8517',
    taxMethod: 'hsn',
    valuationMethod: 'actual',
    seller: 'Apple Store',
    imageUrl: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-pro-naturaltitanium-select?wid=200&hei=200',
    weightOptions: {
      customs: 0.221,
      ml: 0.187,      // Best ML prediction
      ai: 0.195,
      volumetric: 0.173
    },
    taxOptions: {
      customs: { rate: 20, amount: 400, method: 'Customs Telecom Rate' },
      hsn: { rate: 20, amount: 400, method: 'HSN 8517 - Mobile Phones' },
      country: { rate: 18, amount: 360, method: 'India GST Rate' },
      manual: { rate: 22, amount: 440, method: 'Premium Device Rate' }
    },
    valuationOptions: {
      minimum: 750,
      actual: 999
    }
  },
  {
    id: 3,
    name: 'Sony WH-1000XM5',
    url: 'https://electronics.sony.com/wh-1000xm5',
    price: 399,
    quantity: 1,
    weight: 0.254,
    weightSource: 'ai',
    dimensions: { length: 25.4, width: 20.3, height: 8.9, unit: 'cm' },
    hsnCode: '8518',
    taxMethod: 'country',
    valuationMethod: 'minimum',
    seller: 'Sony Direct',
    imageUrl: 'https://m.media-amazon.com/images/I/31SKhfXerJL._SY445_SX342_QL70_FMwebp_.jpg',
    weightOptions: {
      customs: 0.275,
      ml: 0.248,
      ai: 0.254,      // Best AI prediction
      volumetric: 0.926
    },
    taxOptions: {
      customs: { rate: 15, amount: 60, method: 'Audio Equipment Standard' },
      hsn: { rate: 18, amount: 72, method: 'HSN 8518 - Audio Equipment' },
      country: { rate: 12, amount: 48, method: 'Nepal Standard Rate' },
      manual: { rate: 20, amount: 80, method: 'Premium Audio Rate' }
    },
    valuationOptions: {
      minimum: 320,  // Using minimum valuation
      actual: 399
    }
  }
];

const ProfessionalProductTableVariants = () => {
  const [selectedLayout, setSelectedLayout] = useState<'sleek' | 'modern' | 'executive' | 'minimal'>('sleek');
  const [products, setProducts] = useState(sampleProducts);
  const [expandedRows, setExpandedRows] = useState<number[]>([]);
  const [dimensionUnit, setDimensionUnit] = useState<'cm' | 'in'>('cm');
  const [editingField, setEditingField] = useState<{productId: number, field: string} | null>(null);
  const [tempValues, setTempValues] = useState<{[key: string]: any}>({});

  const toggleRowExpansion = (id: number) => {
    setExpandedRows(prev => 
      prev.includes(id) ? prev.filter(row => row !== id) : [...prev, id]
    );
  };

  const calculateVolumetricWeight = (dimensions: any, divisor = 5000) => {
    if (!dimensions) return null;
    const { length, width, height, unit } = dimensions;
    const multiplier = unit === 'in' ? 2.54 : 1;
    const volumeCm3 = length * width * height * multiplier * multiplier * multiplier;
    return volumeCm3 / divisor;
  };

  const updateProduct = (productId: number, field: string, value: any) => {
    setProducts(prev => prev.map(p => 
      p.id === productId ? { ...p, [field]: value } : p
    ));
  };

  const handleFieldSave = (productId: number, field: string, value: any) => {
    updateProduct(productId, field, value);
    setEditingField(null);
  };

  // Layout 1: Sleek Dashboard Style
  const SleekDashboardLayout = () => (
    <div className="w-full space-y-4">
      {products.map((product) => {
        const isExpanded = expandedRows.includes(product.id);
        
        return (
          <div key={product.id} className="group">
            {/* Main Row */}
            <div className={cn(
              "border rounded-lg transition-all duration-200 bg-white",
              isExpanded ? "shadow-lg border-blue-200 ring-1 ring-blue-100" : "hover:shadow-md hover:border-gray-300"
            )}>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  {/* Left: Product Info */}
                  <div className="flex items-center gap-4 flex-1">
                    <button
                      onClick={() => toggleRowExpansion(product.id)}
                      className={cn(
                        "p-2 rounded-lg transition-all",
                        isExpanded ? "bg-blue-50 text-blue-600" : "hover:bg-gray-100"
                      )}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                    
                    {/* Product Image */}
                    <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden">
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      {editingField?.productId === product.id && editingField?.field === 'name' ? (
                        <Input
                          className="h-8 font-medium"
                          defaultValue={product.name}
                          onBlur={() => setEditingField(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') setEditingField(null);
                            if (e.key === 'Escape') setEditingField(null);
                          }}
                          autoFocus
                        />
                      ) : (
                        <h3 
                          className="font-medium text-gray-900 cursor-pointer hover:text-blue-600 transition-colors truncate"
                          onClick={() => setEditingField({productId: product.id, field: 'name'})}
                        >
                          {product.name}
                        </h3>
                      )}
                      
                      <div className="flex items-center gap-2 mt-1">
                        {editingField?.productId === product.id && editingField?.field === 'url' ? (
                          <Input
                            className="h-6 text-xs"
                            defaultValue={product.url}
                            onBlur={() => setEditingField(null)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') setEditingField(null);
                              if (e.key === 'Escape') setEditingField(null);
                            }}
                            autoFocus
                          />
                        ) : (
                          <p 
                            className="text-sm text-gray-500 cursor-pointer hover:text-blue-500 transition-colors flex items-center gap-1 truncate"
                            onClick={() => setEditingField({productId: product.id, field: 'url'})}
                          >
                            <ExternalLink className="h-3 w-3" />
                            {new URL(product.url).hostname}
                          </p>
                        )}
                        
                        <span className="text-gray-300">•</span>
                        
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-500">Qty:</span>
                          {editingField?.productId === product.id && editingField?.field === 'quantity' ? (
                            <Input
                              type="number"
                              className="h-6 w-16 text-xs"
                              defaultValue={product.quantity}
                              onBlur={() => setEditingField(null)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') setEditingField(null);
                                if (e.key === 'Escape') setEditingField(null);
                              }}
                              autoFocus
                            />
                          ) : (
                            <span 
                              className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
                              onClick={() => setEditingField({productId: product.id, field: 'quantity'})}
                            >
                              {product.quantity}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Center: Key Metrics */}
                  <div className="flex items-center gap-8 px-4">
                    <div className="text-center">
                      <p className="text-xs text-gray-500 uppercase">Price</p>
                      {editingField?.productId === product.id && editingField?.field === 'price' ? (
                        <Input
                          type="number"
                          className="h-8 w-20 text-center font-semibold"
                          defaultValue={product.price}
                          onBlur={() => setEditingField(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') setEditingField(null);
                            if (e.key === 'Escape') setEditingField(null);
                          }}
                          autoFocus
                        />
                      ) : (
                        <p 
                          className="font-semibold cursor-pointer hover:text-blue-600 transition-colors"
                          onClick={() => setEditingField({productId: product.id, field: 'price'})}
                        >
                          ${product.price.toLocaleString()}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        Total: ${(product.price * product.quantity).toLocaleString()}
                      </p>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-xs text-gray-500 uppercase">Weight</p>
                      <div className="flex items-center gap-1">
                        <p className="font-semibold">{product.weight} kg</p>
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 capitalize">
                          {product.weightSource}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-xs text-gray-500 uppercase">HSN</p>
                      {editingField?.productId === product.id && editingField?.field === 'hsnCode' ? (
                        <div className="w-24">
                          <SmartHSNSearch
                            value={product.hsnCode}
                            onChange={(hsnCode) => {
                              updateProduct(product.id, 'hsnCode', hsnCode);
                              setEditingField(null);
                            }}
                            onCancel={() => setEditingField(null)}
                            placeholder="Search HSN"
                            className="h-8 text-xs font-mono"
                            autoFocus
                          />
                        </div>
                      ) : (
                        <p 
                          className="font-mono font-semibold cursor-pointer hover:text-blue-600 transition-colors"
                          onClick={() => setEditingField({productId: product.id, field: 'hsnCode'})}
                        >
                          {product.hsnCode}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Right: Actions */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Edit className="h-3 w-3" />
                      <span>Click to edit</span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => window.open(product.url, '_blank')}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open Product Page
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(product.url)}>
                          <Link className="h-4 w-4 mr-2" />
                          Copy Product URL
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          const newProduct = { ...product, id: Date.now(), name: product.name + ' (Copy)' };
                          setProducts(prev => [...prev, newProduct]);
                        }}>
                          <CopyIcon className="h-4 w-4 mr-2" />
                          Duplicate Product
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <Star className="h-4 w-4 mr-2" />
                          Add to Favorites
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="h-4 w-4 mr-2" />
                          Export Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => setProducts(prev => prev.filter(p => p.id !== product.id))}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove Product
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
              
              {/* Expanded Content - Sleek & Minimal */}
              {isExpanded && (
                <div className="border-t bg-white">
                  {/* Smart Weight & Tax Row */}
                  <div className="px-6 py-4 border-b border-gray-50">
                    <div className="grid grid-cols-6 gap-4 items-center">
                      {/* Weight Options */}
                      <div className="col-span-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-medium text-gray-500 w-12">Weight</span>
                          <div className="flex items-center gap-1">
                            {Object.entries(product.weightOptions).map(([source, weight]) => {
                              const isActive = product.weightSource === source;
                              const icons = { customs: Database, ml: Brain, ai: Bot, volumetric: Calculator };
                              const IconComponent = icons[source as keyof typeof icons];
                              
                              return (
                                <button
                                  key={source}
                                  className={cn(
                                    "flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all",
                                    isActive 
                                      ? "bg-blue-100 text-blue-700 font-medium" 
                                      : "text-gray-500 hover:bg-gray-100"
                                  )}
                                >
                                  <IconComponent className="h-3 w-3" />
                                  <span className="capitalize">{source}</span>
                                  <span className="font-mono">{weight}kg</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      
                      {/* Tax Options */}
                      <div className="col-span-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-medium text-gray-500 w-8">Tax</span>
                          <div className="flex items-center gap-1">
                            {Object.entries(product.taxOptions).map(([method, taxData]) => {
                              const isActive = product.taxMethod === method;
                              const icons = { customs: Database, hsn: Hash, country: Globe, manual: Settings };
                              const IconComponent = icons[method as keyof typeof icons];
                              
                              return (
                                <button
                                  key={method}
                                  className={cn(
                                    "flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all",
                                    isActive 
                                      ? "bg-emerald-100 text-emerald-700 font-medium" 
                                      : "text-gray-500 hover:bg-gray-100"
                                  )}
                                >
                                  <IconComponent className="h-3 w-3" />
                                  <span className="capitalize">{method}</span>
                                  <span className="font-mono">{taxData.rate}%</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Dimensions & Valuation Row */}
                  <div className="px-6 py-4">
                    <div className="grid grid-cols-6 gap-4 items-center">
                      {/* Dimensions */}
                      <div className="col-span-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-medium text-gray-500 w-12">Size</span>
                          <div className="flex items-center gap-1">
                            <Input 
                              placeholder="L" 
                              className="h-8 w-16 text-xs" 
                              defaultValue={product.dimensions?.length} 
                            />
                            <X className="h-3 w-3 text-gray-400" />
                            <Input 
                              placeholder="W" 
                              className="h-8 w-16 text-xs" 
                              defaultValue={product.dimensions?.width} 
                            />
                            <X className="h-3 w-3 text-gray-400" />
                            <Input 
                              placeholder="H" 
                              className="h-8 w-16 text-xs" 
                              defaultValue={product.dimensions?.height} 
                            />
                            <Select defaultValue={dimensionUnit}>
                              <SelectTrigger className="h-8 w-16 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cm">cm</SelectItem>
                                <SelectItem value="in">in</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                      
                      {/* Valuation */}
                      <div className="col-span-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-medium text-gray-500 w-8">Val</span>
                          <div className="flex items-center gap-1">
                            {Object.entries(product.valuationOptions).map(([method, amount]) => {
                              const isActive = product.valuationMethod === method;
                              return (
                                <button
                                  key={method}
                                  className={cn(
                                    "px-2 py-1 rounded-md text-xs transition-all",
                                    isActive 
                                      ? "bg-purple-100 text-purple-700 font-medium" 
                                      : "text-gray-500 hover:bg-gray-100"
                                  )}
                                >
                                  <span className="capitalize">{method}</span>
                                  <span className="font-mono ml-1">${amount}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  // Layout 2: Modern Card Stack
  const ModernCardStackLayout = () => (
    <div className="w-full space-y-3">
      {products.map((product) => {
        const isExpanded = expandedRows.includes(product.id);
        const hasVolumetric = product.volumetricWeight && product.volumetricWeight > product.weight;
        
        return (
          <div key={product.id} className="relative">
            {/* Main Card */}
            <div className={cn(
              "bg-white rounded-xl border transition-all duration-300",
              isExpanded ? "border-blue-300 shadow-xl" : "hover:shadow-lg"
            )}>
              <div className="p-5">
                <div className="flex items-center justify-between">
                  {/* Product Section */}
                  <div className="flex items-center gap-4 flex-1">
                    <button
                      onClick={() => toggleRowExpansion(product.id)}
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                        isExpanded 
                          ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg" 
                          : "bg-gray-100 hover:bg-gray-200"
                      )}
                    >
                      {isExpanded ? <Maximize2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    </button>
                    
                    <div>
                      <h3 className="font-semibold text-gray-900">{product.name}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm text-gray-500">
                          ${product.price} × {product.quantity}
                        </span>
                        <span className="text-gray-300">•</span>
                        <span className="text-sm font-medium text-gray-900">
                          ${(product.price * product.quantity).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Status Pills */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full">
                      <Scale className="h-3.5 w-3.5 text-gray-500" />
                      <span className="text-sm font-medium">{product.weight} kg</span>
                      {hasVolumetric && (
                        <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full">
                      <FileText className="h-3.5 w-3.5 text-gray-500" />
                      <span className="text-sm font-mono">{product.hsnCode}</span>
                    </div>
                    
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Expanded Panel */}
              {isExpanded && (
                <div className="border-t">
                  <div className="p-5 bg-gradient-to-r from-blue-50/30 via-transparent to-purple-50/30">
                    <div className="grid grid-cols-3 gap-4">
                      {/* Weight Card */}
                      <div className="bg-white/80 backdrop-blur rounded-lg p-4 border border-gray-100">
                        <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                          <Zap className="h-4 w-4 text-blue-500" />
                          Weight Intelligence
                        </h4>
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs text-gray-500">Actual vs Volumetric</span>
                              <span className="text-xs font-medium">
                                {hasVolumetric ? 'Volumetric Active' : 'Standard'}
                              </span>
                            </div>
                            <Progress 
                              value={hasVolumetric ? 80 : 20} 
                              className="h-1.5"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <p className="text-gray-500">Actual</p>
                              <p className="font-medium">{product.weight} kg</p>
                            </div>
                            {product.volumetricWeight && (
                              <div>
                                <p className="text-gray-500">Volumetric</p>
                                <p className={cn("font-medium", hasVolumetric && "text-orange-600")}>
                                  {product.volumetricWeight.toFixed(2)} kg
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Dimensions Card */}
                      <div className="bg-white/80 backdrop-blur rounded-lg p-4 border border-gray-100">
                        <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                          <Layers className="h-4 w-4 text-purple-500" />
                          Package Dimensions
                        </h4>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Input placeholder="L" className="h-8" defaultValue={product.dimensions?.length} />
                            <X className="h-3 w-3 text-gray-400" />
                            <Input placeholder="W" className="h-8" defaultValue={product.dimensions?.width} />
                            <X className="h-3 w-3 text-gray-400" />
                            <Input placeholder="H" className="h-8" defaultValue={product.dimensions?.height} />
                          </div>
                          <Button variant="outline" size="sm" className="w-full">
                            <Calculator className="h-3.5 w-3.5 mr-2" />
                            Calculate Volume
                          </Button>
                        </div>
                      </div>

                      {/* Compliance Card */}
                      <div className="bg-white/80 backdrop-blur rounded-lg p-4 border border-gray-100">
                        <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                          <Globe className="h-4 w-4 text-green-500" />
                          Tax & Compliance
                        </h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="text-sm text-gray-600">HSN Code</span>
                            <span className="font-mono text-sm">{product.hsnCode}</span>
                          </div>
                          <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="text-sm text-gray-600">Method</span>
                            <Badge variant="outline" className="text-xs">
                              {product.taxMethod.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  // Layout 3: Executive Summary Style
  const ExecutiveSummaryLayout = () => (
    <div className="w-full">
      <div className="border rounded-lg overflow-hidden bg-white">
        {/* Professional Header */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white px-6 py-3">
          <div className="grid grid-cols-12 gap-4 text-xs font-medium uppercase tracking-wider">
            <div className="col-span-5">Product Details</div>
            <div className="col-span-2 text-center">Financials</div>
            <div className="col-span-2 text-center">Logistics</div>
            <div className="col-span-2 text-center">Compliance</div>
            <div className="col-span-1 text-center">Actions</div>
          </div>
        </div>
        
        <div className="divide-y divide-gray-100">
          {products.map((product, index) => {
            const isExpanded = expandedRows.includes(product.id);
            const hasVolumetric = product.volumetricWeight && product.volumetricWeight > product.weight;
            
            return (
              <div key={product.id} className={cn(
                "transition-all",
                isExpanded && "bg-blue-50/30"
              )}>
                {/* Main Row */}
                <div className="px-6 py-4 hover:bg-gray-50/50 transition-colors">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    {/* Product Details */}
                    <div className="col-span-5">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleRowExpansion(product.id)}
                          className={cn(
                            "w-8 h-8 rounded flex items-center justify-center transition-all",
                            isExpanded 
                              ? "bg-blue-100 text-blue-600" 
                              : "bg-gray-100 hover:bg-gray-200"
                          )}
                        >
                          <ChevronRight className={cn(
                            "h-4 w-4 transition-transform",
                            isExpanded && "rotate-90"
                          )} />
                        </button>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded overflow-hidden">
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{product.name}</p>
                            <p className="text-xs text-gray-500">{new URL(product.url).hostname}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Financials */}
                    <div className="col-span-2 text-center">
                      <p className="text-sm text-gray-600">${product.price} × {product.quantity}</p>
                      <p className="font-semibold text-gray-900">${(product.price * product.quantity).toLocaleString()}</p>
                    </div>
                    
                    {/* Logistics */}
                    <div className="col-span-2 text-center">
                      <div className="inline-flex items-center gap-2">
                        <span className="text-sm font-medium">{product.weight} kg</span>
                        {hasVolumetric && (
                          <div className="flex items-center gap-1 px-2 py-0.5 bg-orange-100 rounded-full">
                            <div className="w-1 h-1 bg-orange-500 rounded-full" />
                            <span className="text-xs text-orange-700">VOL</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Compliance */}
                    <div className="col-span-2 text-center">
                      <Badge variant="outline" className="font-mono">
                        HSN: {product.hsnCode}
                      </Badge>
                    </div>
                    
                    {/* Actions */}
                    <div className="col-span-1 text-center">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Executive Expanded View */}
                {isExpanded && (
                  <div className="px-6 pb-4 border-t border-gray-100">
                    <div className="grid grid-cols-12 gap-4 mt-4">
                      <div className="col-span-12 bg-white rounded-lg border p-4">
                        <div className="grid grid-cols-4 gap-6">
                          {/* KPI Blocks */}
                          <div className="text-center p-4 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-500 uppercase mb-1">Weight Status</p>
                            <p className="text-2xl font-bold text-gray-900">
                              {hasVolumetric ? product.volumetricWeight?.toFixed(1) : product.weight}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              {hasVolumetric ? 'Volumetric Weight' : 'Actual Weight'} (kg)
                            </p>
                          </div>
                          
                          <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <p className="text-xs text-gray-500 uppercase mb-1">Tax Method</p>
                            <p className="text-2xl font-bold text-blue-900">
                              {product.taxMethod.toUpperCase()}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">20% Customs Rate</p>
                          </div>
                          
                          <div className="text-center p-4 bg-green-50 rounded-lg">
                            <p className="text-xs text-gray-500 uppercase mb-1">Shipping Impact</p>
                            <p className="text-2xl font-bold text-green-900">+$25</p>
                            <p className="text-xs text-gray-600 mt-1">Additional Cost</p>
                          </div>
                          
                          <div className="p-4 bg-purple-50 rounded-lg">
                            <p className="text-xs text-gray-500 uppercase mb-2">Quick Actions</p>
                            <div className="space-y-2">
                              <Button variant="outline" size="sm" className="w-full justify-start">
                                <Edit className="h-3 w-3 mr-2" />
                                Edit Details
                              </Button>
                              <Button variant="outline" size="sm" className="w-full justify-start">
                                <Calculator className="h-3 w-3 mr-2" />
                                Recalculate
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // Layout 4: Minimal Focus Layout
  const MinimalFocusLayout = () => (
    <div className="w-full space-y-2">
      {products.map((product) => {
        const isExpanded = expandedRows.includes(product.id);
        const hasVolumetric = product.volumetricWeight && product.volumetricWeight > product.weight;
        
        return (
          <div key={product.id}>
            {/* Minimal Main Row */}
            <div 
              onClick={() => toggleRowExpansion(product.id)}
              className={cn(
                "px-4 py-3 rounded-lg cursor-pointer transition-all",
                isExpanded 
                  ? "bg-gray-900 text-white" 
                  : "bg-white hover:bg-gray-50 border"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <ArrowRight className={cn(
                    "h-4 w-4 transition-transform",
                    isExpanded && "rotate-90"
                  )} />
                  <div>
                    <span className="font-medium">{product.name}</span>
                    <span className={cn(
                      "mx-3",
                      isExpanded ? "text-gray-400" : "text-gray-300"
                    )}>—</span>
                    <span className={cn(
                      isExpanded ? "text-gray-300" : "text-gray-600"
                    )}>
                      ${(product.price * product.quantity).toLocaleString()}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <span className={cn(
                    "text-sm",
                    isExpanded ? "text-gray-300" : "text-gray-600"
                  )}>
                    {product.weight} kg
                    {hasVolumetric && " *"}
                  </span>
                  <span className={cn(
                    "text-sm font-mono",
                    isExpanded ? "text-gray-300" : "text-gray-600"
                  )}>
                    {product.hsnCode}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Minimal Expanded View */}
            {isExpanded && (
              <div className="mt-2 ml-8 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Weight Analysis</p>
                      <div className="flex items-center gap-4">
                        <span className="text-sm">Actual: {product.weight} kg</span>
                        {product.volumetricWeight && (
                          <>
                            <span className="text-gray-300">•</span>
                            <span className="text-sm">
                              Volumetric: {product.volumetricWeight.toFixed(2)} kg
                            </span>
                          </>
                        )}
                        {hasVolumetric && (
                          <>
                            <span className="text-gray-300">•</span>
                            <span className="text-sm font-medium text-orange-600">Using Volumetric</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Dimensions</p>
                      <div className="flex items-center gap-2">
                        <Input placeholder="Length" className="h-8 w-24" defaultValue={product.dimensions?.length} />
                        <Input placeholder="Width" className="h-8 w-24" defaultValue={product.dimensions?.width} />
                        <Input placeholder="Height" className="h-8 w-24" defaultValue={product.dimensions?.height} />
                        <span className="text-sm text-gray-500">{dimensionUnit}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="ml-8">
                    <Button variant="outline" size="sm">
                      Update
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Beautiful Expandable Row Designs</h1>
        <p className="text-gray-600">Four stunning variations of expandable product tables with volumetric weight support</p>
      </div>

      <Tabs value={selectedLayout} onValueChange={(v) => setSelectedLayout(v as any)}>
        <TabsList className="mb-6">
          <TabsTrigger value="sleek">Sleek Dashboard</TabsTrigger>
          <TabsTrigger value="modern">Modern Cards</TabsTrigger>
          <TabsTrigger value="executive">Executive Summary</TabsTrigger>
          <TabsTrigger value="minimal">Minimal Focus</TabsTrigger>
        </TabsList>

        <TabsContent value="sleek">
          <Card>
            <CardHeader>
              <CardTitle>Sleek Dashboard Style</CardTitle>
              <CardDescription>
                Clean metrics cards with visual indicators and gradient backgrounds
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SleekDashboardLayout />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modern">
          <Card>
            <CardHeader>
              <CardTitle>Modern Card Stack</CardTitle>
              <CardDescription>
                Floating cards with animated elements and colorful accents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ModernCardStackLayout />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="executive">
          <Card>
            <CardHeader>
              <CardTitle>Executive Summary Style</CardTitle>
              <CardDescription>
                Professional KPI-focused layout with clear data hierarchy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ExecutiveSummaryLayout />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="minimal">
          <Card>
            <CardHeader>
              <CardTitle>Minimal Focus Layout</CardTitle>
              <CardDescription>
                Ultra-clean design with maximum focus on content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MinimalFocusLayout />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProfessionalProductTableVariants;