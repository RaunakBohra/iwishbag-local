import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus,
  Trash2,
  ExternalLink,
  AlertCircle,
  Sparkles,
  Scale,
  Package,
  Brain,
  DollarSign,
  Tag,
  Ruler,
  Info
} from 'lucide-react';
import { EditableUrlInput } from '@/components/EditableUrlInput';
import { CompactHSNSearch } from '@/components/forms/quote-form-fields/CompactHSNSearch';
import VolumetricWeightModal from '@/components/quotes-v2/VolumetricWeightModal';
import { productIntelligenceService } from '@/services/ProductIntelligenceService';
import { volumetricWeightService } from '@/services/VolumetricWeightService';
import { toast } from '@/hooks/use-toast';

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
  discount_amount?: number;
  discount_type?: 'percentage' | 'amount';
  hsn_code?: string;
  use_hsn_rates?: boolean;
  images?: string[];
  main_image?: string;
  aiSuggestions?: any;
}

interface QuoteItemsSectionProps {
  items: QuoteItem[];
  onItemsChange: (items: QuoteItem[]) => void;
  destinationCountry: string;
  smartFeatureLoading: Record<string, boolean>;
  onSmartFeatureLoadingChange: (loading: Record<string, boolean>) => void;
}

export const QuoteItemsSection: React.FC<QuoteItemsSectionProps> = ({
  items,
  onItemsChange,
  destinationCountry,
  smartFeatureLoading,
  onSmartFeatureLoadingChange
}) => {
  // Advanced options state - track which items have expanded advanced options
  const [expandedAdvancedOptions, setExpandedAdvancedOptions] = useState<Record<string, boolean>>({});
  const [showVolumetricModal, setShowVolumetricModal] = useState<{item: QuoteItem | null, show: boolean}>({
    item: null,
    show: false
  });

  const addItem = () => {
    const newItem: QuoteItem = {
      id: `item-${Date.now()}`,
      name: '',
      quantity: 1,
      unit_price_usd: 0,
      weight_kg: 0.1,
      category: '',
      notes: '',
    };
    onItemsChange([...items, newItem]);
  };

  const removeItem = (itemId: string) => {
    onItemsChange(items.filter(item => item.id !== itemId));
  };

  const updateItem = (itemId: string, field: keyof QuoteItem, value: any) => {
    const updatedItems = items.map(item =>
      item.id === itemId ? { ...item, [field]: value } : item
    );
    onItemsChange(updatedItems);
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'weight': return <Scale className="h-3 w-3" />;
      case 'category': return <Tag className="h-3 w-3" />;
      case 'product': return <Package className="h-3 w-3" />;
      default: return <Sparkles className="h-3 w-3" />;
    }
  };

  const applySuggestion = async (item: QuoteItem, type: string, value: any) => {
    try {
      updateItem(item.id, type as keyof QuoteItem, value);
      toast({
        title: "✨ AI suggestion applied",
        description: `${type} updated for ${item.name || 'item'}`,
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to apply suggestion:', error);
      toast({
        title: "Error applying suggestion",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleAutoFill = async (itemId: string, url: string) => {
    if (!url) return;

    const loadingKey = `autofill-${itemId}`;
    onSmartFeatureLoadingChange({ 
      ...smartFeatureLoading, 
      [loadingKey]: true 
    });

    try {
      const data = await productIntelligenceService.extractProductInfo(url);
      const currentItem = items.find(item => item.id === itemId);
      
      if (!currentItem) return;

      const updatedFields: string[] = [];
      
      // Update product name
      if (data.productName && typeof data.productName === 'string' && data.productName.trim() &&
          data.productName.trim() !== 'Unknown Product') {
        updateItem(itemId, 'name', data.productName.trim());
        updatedFields.push('name');
      }
      
      // Update price
      if (data.price && typeof data.price === 'number' && data.price > 0 && isFinite(data.price)) {
        updateItem(itemId, 'unit_price_usd', data.price);
        updatedFields.push('price');
      }
      
      // Update weight
      if (data.weight && typeof data.weight === 'number' && data.weight > 0 && isFinite(data.weight)) {
        updateItem(itemId, 'weight_kg', data.weight);
        updatedFields.push('weight');
      }
      
      // Update category
      if (data.category && typeof data.category === 'string' && data.category.trim()) {
        updateItem(itemId, 'category', data.category.trim());
        updatedFields.push('category');
      }
      
      // Update HSN code
      if (data.hsn && typeof data.hsn === 'string' && data.hsn.trim()) {
        updateItem(itemId, 'hsn_code', data.hsn.trim());
        updatedFields.push('HSN code');
      }
      
      // Handle product images
      const images = (data as any).images;
      if (images && Array.isArray(images) && images.length > 0) {
        const validImages = images.filter(img => 
          typeof img === 'string' && 
          img.trim() && 
          (img.startsWith('http://') || img.startsWith('https://'))
        );
        
        if (validImages.length > 0) {
          updateItem(itemId, 'images', validImages);
          updateItem(itemId, 'main_image', validImages[0]);
          updatedFields.push(`${validImages.length} image${validImages.length > 1 ? 's' : ''}`);
        }
      }
      
      if (updatedFields.length > 0) {
        toast({
          title: "🚀 Auto-fill completed!",
          description: `Updated: ${updatedFields.join(', ')}`,
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Auto-fill failed:', error);
      toast({
        title: "Auto-fill failed",
        description: "Please check the URL and try again",
        variant: "destructive",
      });
    } finally {
      onSmartFeatureLoadingChange({ 
        ...smartFeatureLoading, 
        [loadingKey]: false 
      });
    }
  };

  const handleWeightEstimate = async (item: QuoteItem) => {
    if (!item.name) {
      toast({
        title: "Product name required",
        description: "Enter a product name first",
        variant: "destructive",
      });
      return;
    }

    const loadingKey = `weight-${item.id}`;
    onSmartFeatureLoadingChange({ 
      ...smartFeatureLoading, 
      [loadingKey]: true 
    });

    try {
      const suggestion = await productIntelligenceService.getSmartProductSuggestion({
        product_name: item.name,
        destination_country: destinationCountry,
      });
      
      if (suggestion.suggested_weight_kg && suggestion.suggested_weight_kg > 0) {
        updateItem(item.id, 'weight_kg', suggestion.suggested_weight_kg);
        updateItem(item.id, 'aiSuggestions', {
          ...item.aiSuggestions,
          weight: suggestion.suggested_weight_kg
        });
        
        toast({
          title: "🤖 Weight estimated!",
          description: `Set to ${suggestion.suggested_weight_kg}kg based on product analysis`,
          duration: 3000,
        });
      } else {
        toast({
          title: "No weight estimate available",
          description: "Try a more specific product name",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Weight estimation failed:', error);
      toast({
        title: "Weight estimation failed",
        description: "Please try again or enter manually",
        variant: "destructive",
      });
    } finally {
      onSmartFeatureLoadingChange({ 
        ...smartFeatureLoading, 
        [loadingKey]: false 
      });
    }
  };

  const toggleAdvancedOptions = (itemId: string) => {
    setExpandedAdvancedOptions(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const openVolumetricModal = (item: QuoteItem) => {
    setShowVolumetricModal({ item, show: true });
  };

  const handleVolumetricResult = (result: { weight: number; details: any }) => {
    if (showVolumetricModal.item) {
      updateItem(showVolumetricModal.item.id, 'weight_kg', result.weight);
      setShowVolumetricModal({ item: null, show: false });
      
      toast({
        title: "📦 Volumetric weight calculated",
        description: `Updated to ${result.weight}kg`,
        duration: 3000,
      });
    }
  };

  const getDiscountDisplay = (item: QuoteItem) => {
    if (item.discount_type === 'amount' && item.discount_amount) {
      return `$${item.discount_amount.toFixed(2)} off`;
    } else if (item.discount_type === 'percentage' && item.discount_percentage) {
      return `${item.discount_percentage}% off`;
    }
    return 'No discount';
  };

  return (
    <>
      {/* Items - Each item as separate card */}
      {items.map((item, index) => (
        <Card key={item.id} className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          {/* Clean Professional Header */}
          <CardHeader className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                  {index + 1}
                </div>
                <h4 className="text-lg font-semibold text-gray-900">
                  Item {index + 1}
                </h4>
                {item.category && (
                  <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                    {item.category}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {/* Item-level discount indicator */}
                {(item.discount_percentage || item.discount_amount) && (
                  <Badge variant="outline" className="text-green-600 border-green-200">
                    <DollarSign className="w-3 h-3 mr-1" />
                    {getDiscountDisplay(item)}
                  </Badge>
                )}
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeItem(item.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                  title="Remove item"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="px-6 py-4 space-y-4">
            {/* Product URL Section - Prominently placed */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                🔗 Product URL
                <Badge variant="secondary" className="text-xs">Auto-fill enabled</Badge>
              </Label>
              <EditableUrlInput
                value={item.url || ''}
                onChange={(url) => updateItem(item.id, 'url', url)}
                onAutoFill={(url) => handleAutoFill(item.id, url)}
                loading={smartFeatureLoading[`autofill-${item.id}`]}
                placeholder="https://amazon.com/product-link"
                className="w-full"
              />
            </div>

            {/* Product Name Section */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Product Name
              </Label>
              <Input
                type="text"
                value={item.name}
                onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                placeholder="e.g., iPhone 15 Pro, Samsung Galaxy S23, Sony WH-1000XM5"
                className="h-10 border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-200 text-sm text-gray-900 font-normal"
              />
            </div>

            {/* Product Images Section */}
            {item.images && item.images.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Label className="text-sm font-medium text-gray-700">Product Images</Label>
                  <Badge variant="secondary" className="text-xs">
                    {item.images.length} image{item.images.length > 1 ? 's' : ''}
                  </Badge>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {item.images.slice(0, 4).map((imageUrl, imageIndex) => (
                    <div 
                      key={imageIndex} 
                      className="relative group cursor-pointer"
                      onClick={() => window.open(imageUrl, '_blank')}
                    >
                      <img
                        src={imageUrl}
                        alt={`${item.name} - Image ${imageIndex + 1}`}
                        className="w-16 h-16 object-cover rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all flex items-center justify-center">
                        <ExternalLink className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      {imageIndex === 0 && (
                        <Badge 
                          variant="default" 
                          className="absolute -top-1 -right-1 text-xs px-1 py-0 h-4"
                        >
                          Main
                        </Badge>
                      )}
                    </div>
                  ))}
                  {item.images.length > 4 && (
                    <div className="w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center text-xs text-gray-500">
                      +{item.images.length - 4} more
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pricing & Details Section */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Pricing & Details
              </Label>
              <div className="grid grid-cols-[80px_1px_100px_1px_1fr_1px_2fr] gap-4 p-4 bg-gray-50/50 rounded-lg border border-gray-200">
                {/* Quantity Column */}
                <div className="space-y-2 h-16 flex flex-col justify-between">
                  <div className="text-center">
                    <div className="text-xs text-gray-500 font-medium">Quantity</div>
                  </div>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                    className="h-8 text-center border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-200"
                  />
                </div>

                <div className="w-px bg-gray-300 self-stretch"></div>

                {/* Price Column */}
                <div className="space-y-2 h-16 flex flex-col justify-between">
                  <div className="text-center">
                    <div className="text-xs text-gray-500 font-medium">Price</div>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unit_price_usd || ''}
                    onChange={(e) => updateItem(item.id, 'unit_price_usd', parseFloat(e.target.value) || 0)}
                    placeholder="25.99"
                    className="h-8 text-center border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-200 text-sm text-gray-900 font-normal"
                  />
                </div>

                <div className="w-px bg-gray-300 self-stretch"></div>

                {/* Weight Column */}
                <div className="space-y-2 h-16 flex flex-col justify-between">
                  <div className="text-center">
                    <div className="text-xs text-gray-500 font-medium">Weight</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={item.weight_kg || ''}
                      onChange={(e) => updateItem(item.id, 'weight_kg', parseFloat(e.target.value) || 0)}
                      placeholder="0.5"
                      className="h-8 text-center border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-200 flex-1 text-sm text-gray-900 font-normal"
                    />
                    <span className="text-xs text-gray-500 font-medium min-w-[16px]">kg</span>
                  </div>
                </div>

                <div className="w-px bg-gray-300 self-stretch"></div>

                {/* AI Tools Column */}
                <div className="space-y-2 h-16 flex flex-col justify-between">
                  <div className="text-center">
                    <div className="text-xs text-gray-500 font-medium">AI Tools</div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleWeightEstimate(item)}
                      disabled={!item.name || smartFeatureLoading[`weight-${item.id}`]}
                      className="h-8 px-2 text-xs bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100 hover:border-teal-300"
                      title="AI weight estimate"
                    >
                      {smartFeatureLoading[`weight-${item.id}`] ? (
                        <div className="animate-spin w-3 h-3 border border-teal-600 border-t-transparent rounded-full"></div>
                      ) : (
                        <Brain className="w-3 h-3" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openVolumetricModal(item)}
                      className="h-8 px-2 text-xs bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300"
                      title="Volumetric weight calculator"
                    >
                      <Ruler className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Suggestions Display */}
            {item.aiSuggestions && Object.keys(item.aiSuggestions).length > 0 && (
              <div className="bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-teal-600" />
                  <span className="text-sm font-medium text-teal-800">AI Suggestions</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(item.aiSuggestions).map(([type, value]) => (
                    <Button
                      key={type}
                      size="sm"
                      variant="outline"
                      onClick={() => applySuggestion(item, type, value)}
                      className="h-7 px-2 text-xs bg-white/50 border-teal-300 text-teal-700 hover:bg-white"
                    >
                      {getSuggestionIcon(type)}
                      <span className="ml-1 capitalize">{type}: {value}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Advanced Options Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleAdvancedOptions(item.id)}
                className="text-gray-600 hover:text-gray-800 p-0 h-auto font-medium"
              >
                {expandedAdvancedOptions[item.id] ? '🔽 Hide Advanced' : '▶️ Show Advanced'}
              </Button>
              
              {/* Quick indicators */}
              <div className="flex items-center gap-2 text-xs text-gray-500">
                {item.hsn_code && (
                  <Badge variant="outline" className="text-xs">
                    HSN: {item.hsn_code}
                  </Badge>
                )}
                {item.notes && (
                  <Badge variant="outline" className="text-xs">
                    <Info className="w-3 h-3 mr-1" />
                    Notes
                  </Badge>
                )}
              </div>
            </div>

            {/* Advanced Options */}
            {expandedAdvancedOptions[item.id] && (
              <div className="space-y-4 pt-4 border-t border-gray-200 bg-gray-50/30 rounded-lg p-4">
                {/* HSN Code Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-gray-700">HSN Code</Label>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={item.use_hsn_rates || false}
                        onCheckedChange={(checked) => updateItem(item.id, 'use_hsn_rates', checked)}
                        className="scale-75"
                      />
                      <span className="text-xs text-gray-600">Use HSN rates</span>
                    </div>
                  </div>
                  <CompactHSNSearch
                    value={item.hsn_code || ''}
                    onChange={(hsnCode) => updateItem(item.id, 'hsn_code', hsnCode)}
                    destinationCountry={destinationCountry}
                    productName={item.name}
                  />
                </div>

                {/* Item-level Discount Section */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-700">Item Discount</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <Select
                      value={item.discount_type || 'percentage'}
                      onValueChange={(value: 'percentage' | 'amount') => {
                        updateItem(item.id, 'discount_type', value);
                        // Clear the other discount type when switching
                        if (value === 'percentage') {
                          updateItem(item.id, 'discount_amount', undefined);
                        } else {
                          updateItem(item.id, 'discount_percentage', undefined);
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="amount">Fixed Amount</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {item.discount_type === 'percentage' ? (
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={item.discount_percentage || ''}
                        onChange={(e) => updateItem(item.id, 'discount_percentage', parseFloat(e.target.value) || 0)}
                        placeholder="10"
                        className="h-8 text-center border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-200"
                      />
                    ) : (
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.discount_amount || ''}
                        onChange={(e) => updateItem(item.id, 'discount_amount', parseFloat(e.target.value) || 0)}
                        placeholder="5.00"
                        className="h-8 text-center border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-200"
                      />
                    )}
                    
                    <div className="flex items-center justify-center bg-gray-100 rounded text-xs text-gray-600">
                      {item.discount_type === 'percentage' ? '%' : '$'} off
                    </div>
                  </div>
                </div>

                {/* Notes Section */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Internal Notes</Label>
                  <textarea
                    value={item.notes || ''}
                    onChange={(e) => updateItem(item.id, 'notes', e.target.value)}
                    placeholder="Any special notes about this item..."
                    className="w-full h-16 px-3 py-2 text-sm border border-gray-300 rounded-md focus:border-teal-500 focus:ring-1 focus:ring-teal-200 resize-none"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
      
      {/* Add Another Item Button */}
      <Card className="border-dashed border-2 border-gray-300 hover:border-blue-400 transition-colors">
        <CardContent className="flex items-center justify-center py-8">
          <Button onClick={addItem} variant="outline" className="w-full max-w-md">
            <Plus className="w-4 h-4 mr-2" />
            Add Another Item
          </Button>
        </CardContent>
      </Card>

      {/* Volumetric Weight Modal */}
      <VolumetricWeightModal
        isOpen={showVolumetricModal.show}
        onClose={() => setShowVolumetricModal({ item: null, show: false })}
        onResult={handleVolumetricResult}
        item={showVolumetricModal.item}
      />
    </>
  );
};