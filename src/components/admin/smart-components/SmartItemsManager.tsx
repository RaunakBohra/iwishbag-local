// ============================================================================
// SMART ITEMS MANAGER - AI-Enhanced Product Management
// Features: Weight estimation, smart validation, optimization hints
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { smartWeightEstimator } from '@/services/SmartWeightEstimator';
import { hsnWeightService, type HSNWeightData } from '@/services/HSNWeightService';
import { DirectHSNInput } from '@/components/admin/hsn-components/DirectHSNInput';
import { unifiedDataEngine } from '@/services/UnifiedDataEngine';
import { useToast } from '@/hooks/use-toast';
import { SmartDualWeightField } from '@/components/admin/SmartDualWeightField';
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Scale,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Loader2,
  Tag,
  DollarSign,
} from 'lucide-react';
import type { UnifiedQuote, QuoteItem } from '@/types/unified-quote';
import { useAdminQuoteCurrency } from '@/hooks/useAdminQuoteCurrency';

interface SmartItemsManagerProps {
  quote: UnifiedQuote;
  onUpdateQuote: () => void;
}

export const SmartItemsManager: React.FC<SmartItemsManagerProps> = ({ quote, onUpdateQuote }) => {
  const { toast } = useToast();

  // Get standardized currency display
  const currencyDisplay = useAdminQuoteCurrency(quote);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [newItem, setNewItem] = useState<Partial<QuoteItem>>({
    name: '',
    quantity: 1,
    costprice_origin: 0,
    weight: 0,
  });

  // HSN assignment state

  const getWeightConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getWeightConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) return { variant: 'default' as const, text: 'High' };
    if (confidence >= 0.6) return { variant: 'secondary' as const, text: 'Medium' };
    return { variant: 'destructive' as const, text: 'Low' };
  };

  // Handle item deletion
  const handleDeleteItem = async (itemId: string) => {
    if (quote.items.length <= 1) {
      toast({
        title: 'Cannot delete item',
        description: 'Quote must have at least one item.',
        variant: 'destructive',
      });
      return;
    }

    setIsDeleting(itemId);
    try {
      const success = await unifiedDataEngine.removeItem(quote.id, itemId);
      if (success) {
        toast({
          title: 'Item deleted',
          description: 'Item has been removed from the quote.',
        });
        onUpdateQuote(); // Refresh quote data and recalculate
      } else {
        throw new Error('Failed to delete item');
      }
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: 'Failed to delete item. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(null);
    }
  };

  // Handle item update
  const handleUpdateItem = async (
    updatedItem: QuoteItem & { weight_source?: 'hsn' | 'ml' | 'manual' },
  ) => {
    try {
      // Merge weight source into smart_data
      const itemWithWeightSource = {
        ...updatedItem,
        smart_data: {
          ...updatedItem.smart_data,
          weight_source:
            updatedItem.weight_source || updatedItem.smart_data?.weight_source || 'manual',
        },
      };

      const success = await unifiedDataEngine.updateItem(
        quote.id,
        updatedItem.id,
        itemWithWeightSource,
      );
      if (success) {
        toast({
          title: 'Item updated',
          description: 'Item has been updated successfully.',
        });
        setEditingItem(null);
        onUpdateQuote(); // Refresh quote data and recalculate
      } else {
        throw new Error('Failed to update item');
      }
    } catch (error) {
      toast({
        title: 'Update failed',
        description: 'Failed to update item. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Handle item addition
  const handleAddItem = async (
    newItem: Partial<QuoteItem> & { weight_source?: 'hsn' | 'ml' | 'manual' },
  ) => {
    try {
      const itemToAdd = {
        ...newItem,
        smart_data: {
          weight_confidence: 0.5,
          category_detected: 'general',
          optimization_hints: [],
          customs_suggestions: [],
          weight_source: newItem.weight_source || 'manual',
        },
      } as Omit<QuoteItem, 'id'>;

      const success = await unifiedDataEngine.addItem(quote.id, itemToAdd);
      if (success) {
        toast({
          title: 'Item added',
          description: 'New item has been added to the quote.',
        });
        setIsAddingItem(false);
        onUpdateQuote(); // Refresh quote data and recalculate
      } else {
        throw new Error('Failed to add item');
      }
    } catch (error) {
      toast({
        title: 'Add failed',
        description: 'Failed to add item. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Smart Items Manager</h3>
          <p className="text-sm text-gray-600">
            {quote.items.length} items • Total weight:{' '}
            {quote.items
              .reduce((sum, item) => sum + Number(item.weight || 0) * Number(item.quantity || 0), 0)
              .toFixed(2)}{' '}
            kg
          </p>
        </div>
        <Button className="flex items-center" onClick={() => setIsAddingItem(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Items List */}
      <div className="space-y-4">
        {quote.items.map((item) => (
          <Card key={item.id} className="relative">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                {/* Item Details */}
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <Package className="w-4 h-4 text-gray-500" />
                    <h4 className="font-medium">{item.name}</h4>
                    {item.options && (
                      <Badge variant="outline" className="text-xs">
                        {item.options}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Quantity:</span>
                      <div className="font-medium">{item.quantity}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">
                        Price ({currencyDisplay.originCurrency}):
                      </span>
                      <div className="font-medium">
                        {currencyDisplay.formatSingleAmount(
                          Number(item.costprice_origin || 0),
                          'origin',
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Weight:</span>
                      <div className="flex items-center space-x-1">
                        <span className="font-medium">{Number(item.weight || 0)} kg</span>
                        <Badge
                          {...getWeightConfidenceBadge(item.smart_data?.weight_confidence || 0)}
                        >
                          {getWeightConfidenceBadge(item.smart_data?.weight_confidence || 0).text}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">HSN Code:</span>
                      <div className="flex items-center space-x-1">
                        {item.hsn_code ? (
                          <div className="flex flex-col gap-1">
                            <Badge
                              variant="default"
                              className="text-xs bg-green-100 text-green-800 border-green-300 w-fit"
                            >
                              {item.hsn_code}
                            </Badge>
                            {item.category && (
                              <span className="text-xs text-gray-500">{item.category}</span>
                            )}
                          </div>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="text-xs bg-amber-100 text-amber-800 border-amber-300"
                          >
                            Not Assigned
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Total:</span>
                      <div className="font-medium">
                        {currencyDisplay.formatSingleAmount(
                          Number(item.costprice_origin || 0) * item.quantity,
                          'origin',
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Smart Data Insights */}
                  <div className="mt-3 space-y-2">
                    {/* Weight Confidence */}
                    <div className="flex items-center space-x-2">
                      <Scale className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-600">Weight confidence:</span>
                      <span
                        className={`text-xs font-medium ${getWeightConfidenceColor(item.smart_data?.weight_confidence || 0)}`}
                      >
                        {(item.smart_data?.weight_confidence || 0 * 100).toFixed(0)}%
                      </span>
                      {item.smart_data?.weight_confidence ||
                        (0 < 0.7 && (
                          <div className="flex items-center text-xs text-orange-600">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Verify weight
                          </div>
                        ))}
                      {/* Weight Source Badge */}
                      {item.smart_data?.weight_source && (
                        <Badge
                          variant={
                            item.smart_data.weight_source === 'hsn'
                              ? 'default'
                              : item.smart_data.weight_source === 'ml'
                                ? 'secondary'
                                : 'outline'
                          }
                          className="text-xs"
                        >
                          {item.smart_data.weight_source === 'hsn'
                            ? 'HSN'
                            : item.smart_data.weight_source === 'ml'
                              ? 'AI'
                              : 'Manual'}
                        </Badge>
                      )}
                    </div>

                    {/* HSN Details */}
                    {item.hsn_code && (
                      <div className="flex items-start space-x-2">
                        <Tag className="w-3 h-3 text-gray-400 mt-0.5" />
                        <div className="text-xs">
                          <span className="text-gray-600">HSN Classification: </span>
                          <span className="font-medium text-gray-800">{item.hsn_code}</span>
                          {item.category && (
                            <span className="text-gray-600"> - {item.category}</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Category Detection */}
                    {item.smart_data?.category_detected && (
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        <span className="text-xs text-gray-600">Category:</span>
                        <Badge variant="outline" className="text-xs">
                          {item.smart_data?.category_detected}
                        </Badge>
                      </div>
                    )}

                    {/* Optimization Hints */}
                    {item.smart_data?.optimization_hints?.length > 0 && (
                      <div className="flex items-start space-x-2">
                        <Lightbulb className="w-3 h-3 text-yellow-500 mt-0.5" />
                        <div className="text-xs text-gray-600">
                          <span className="font-medium">Hints:</span>
                          <ul className="mt-1 space-y-1">
                            {item.smart_data?.optimization_hints?.map((hint, index) => (
                              <li key={index}>• {hint}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Customs Suggestions */}
                    {item.smart_data?.customs_suggestions?.length > 0 && (
                      <div className="flex items-start space-x-2">
                        <Package className="w-3 h-3 text-blue-500 mt-0.5" />
                        <div className="text-xs text-gray-600">
                          <span className="font-medium">Customs:</span>
                          <div className="mt-1 space-x-1">
                            {item.smart_data?.customs_suggestions?.map((suggestion, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {suggestion}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 ml-4">
                  <Button size="sm" variant="ghost" onClick={() => setEditingItem(item.id)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => handleDeleteItem(item.id)}
                    disabled={isDeleting === item.id}
                  >
                    {isDeleting === item.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Items Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{quote.items.length}</div>
              <div className="text-sm text-gray-600">Total Items</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {quote.items.reduce((sum, item) => sum + item.quantity, 0)}
              </div>
              <div className="text-sm text-gray-600">Total Quantity</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {quote.items
                  .reduce(
                    (sum, item) => sum + Number(item.weight || 0) * Number(item.quantity || 0),
                    0,
                  )
                  .toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">Total Weight (kg)</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {(
                  (quote.items.reduce(
                    (sum, item) => sum + item.smart_data?.weight_confidence || 0,
                    0,
                  ) /
                    quote.items.length) *
                  100
                ).toFixed(0)}
                %
              </div>
              <div className="text-sm text-gray-600">Avg. Confidence</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Smart Recommendations */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center mb-3">
            <Lightbulb className="w-4 h-4 text-blue-600 mr-2" />
            <span className="font-medium text-blue-800">Smart Recommendations</span>
          </div>
          <div className="space-y-2 text-sm">
            {quote.items.some((item) => item.smart_data?.weight_confidence || 0 < 0.7) && (
              <div className="flex items-center text-blue-700">
                <AlertTriangle className="w-3 h-3 mr-2" />
                Consider verifying weights for items with low confidence scores
              </div>
            )}
            {quote.items.some((item) => Number(item.weight || 0) < 0.1) && (
              <div className="flex items-center text-blue-700">
                <Scale className="w-3 h-3 mr-2" />
                Some items have very low weights - this may affect shipping calculations
              </div>
            )}
            {quote.items.some((item) => !item.hsn_code) ? (
              <div className="flex items-center text-amber-700">
                <Tag className="w-3 h-3 mr-2" />
                {quote.items.filter((item) => !item.hsn_code).length} items need HSN classification
              </div>
            ) : (
              <div className="flex items-center text-blue-700">
                <CheckCircle className="w-3 h-3 mr-2" />
                All items have been classified for optimal customs processing
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Item Dialog */}
      {editingItem && (
        <EditItemDialog
          item={quote.items.find((item) => item.id === editingItem)!}
          onSave={handleUpdateItem}
          onCancel={() => setEditingItem(null)}
          currencyDisplay={currencyDisplay}
          hsnCode={quote.items.find((item) => item.id === editingItem)?.hsn_code}
        />
      )}

      {/* Add Item Dialog */}
      {isAddingItem && (
        <AddItemDialog
          onSave={handleAddItem}
          onCancel={() => setIsAddingItem(false)}
          currencyDisplay={currencyDisplay}
          hsnCode={quote.hsn_code}
        />
      )}
    </div>
  );
};

// Edit Item Dialog Component
interface EditItemDialogProps {
  item: QuoteItem;
  onSave: (item: QuoteItem) => void;
  onCancel: () => void;
  currencyDisplay: any;
  hsnCode?: string;
}

const EditItemDialog: React.FC<EditItemDialogProps> = ({
  item,
  onSave,
  onCancel,
  currencyDisplay,
  hsnCode,
}) => {
  const [editForm, setEditForm] = useState({
    name: item.name,
    quantity: item.quantity,
    costprice_origin: item.costprice_origin,
    weight: item.weight,
    options: item.options || '',
    hsn_code: item.hsn_code || '',
    category: item.category || '',
  });
  const [selectedWeightSource, setSelectedWeightSource] = useState<'hsn' | 'ml' | 'manual' | null>(
    null,
  );

  const handleSave = async () => {
    const updatedItem: QuoteItem = {
      ...item,
      name: editForm.name,
      quantity: editForm.quantity,
      costprice_origin: editForm.costprice_origin,
      weight: editForm.weight,
      options: editForm.options,
      hsn_code: editForm.hsn_code,
      category: editForm.category,
      smart_data: {
        ...item.smart_data,
        weight_source: selectedWeightSource || 'manual',
      },
    };

    onSave(updatedItem);
  };

  return (
    <Dialog open={true} onOpenChange={() => onCancel()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Product Name</Label>
            <Input
              id="name"
              value={editForm.name}
              onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Product name"
            />
          </div>

          {/* Inline Product Fields - Quantity, Price, Weight, HSN */}
          <div>
            <Label className="flex items-center space-x-2 mb-2">
              <span>Product Details</span>
              {(isEstimating || isLoadingHSN) && (
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs text-blue-600">
                    {isLoadingHSN ? 'Loading HSN...' : 'AI estimating...'}
                  </span>
                </div>
              )}
            </Label>

            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-4 flex-wrap">
                {/* Quantity Field */}
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-xs font-medium min-w-[30px]">QTY</span>
                  <div className="flex items-center bg-white border border-gray-200 rounded px-2 py-1">
                    <Input
                      type="number"
                      value={editForm.quantity}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, quantity: Number(e.target.value) }))
                      }
                      className="w-16 h-8 border-0 p-0 text-center text-sm font-medium"
                      min="1"
                    />
                  </div>
                </div>

                {/* Price Field */}
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-xs font-medium min-w-[35px]">PRICE</span>
                  <div className="flex items-center bg-white border border-gray-200 rounded px-2 py-1">
                    <DollarSign className="w-3 h-3 text-gray-400" />
                    <Input
                      type="number"
                      value={editForm.costprice_origin}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          costprice_origin: Number(e.target.value),
                        }))
                      }
                      className="w-20 h-8 border-0 p-0 text-sm font-medium ml-1"
                      step="0.01"
                      min="0"
                    />
                    <span className="text-xs text-gray-400 ml-1">
                      {currencyDisplay.originCurrency}
                    </span>
                  </div>
                </div>

                {/* Weight Field with Smart Dual Suggestions */}
                <div className="flex-1">
                  <SmartDualWeightField
                    value={editForm.weight}
                    onChange={(weight) => {
                      setEditForm((prev) => ({ ...prev, weight }));
                    }}
                    productName={editForm.name}
                    hsnCode={editForm.hsn_code || hsnCode}
                    productUrl={item.url}
                    onSourceSelected={(source) => {
                      setSelectedWeightSource(source);
                    }}
                    label=""
                    className="compact-mode"
                  />
                </div>

                {/* HSN Field */}
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-xs font-medium min-w-[30px]">HSN</span>
                  <div className="flex-1">
                    <DirectHSNInput
                      value={editForm.hsn_code}
                      displayValue={
                        editForm.hsn_code && editForm.category
                          ? `${editForm.hsn_code} - ${editForm.category} (${editForm.customs_rate || 15}%, ${editForm.local_tax_rate || 0}%)`
                          : ''
                      }
                      onSelect={(hsn) => {
                        setEditForm((prev) => ({
                          ...prev,
                          hsn_code: hsn.hsn_code,
                          category: hsn.display_name,
                          customs_rate: hsn.tax_data?.typical_rates?.customs?.common || 15,
                          local_tax_rate: hsn.tax_data?.typical_rates?.gst?.standard || hsn.tax_data?.typical_rates?.vat?.common || 0,
                        }));
                      }}
                      onClear={() => {
                        console.log('SmartItemsManager: Clearing HSN from edit form');
                        setEditForm((prev) => ({
                          ...prev,
                          hsn_code: '',
                          category: '',
                          customs_rate: undefined,
                          local_tax_rate: undefined,
                        }));
                      }}
                      productName={editForm.name}
                      placeholder="Type to search HSN codes..."
                      className="w-full min-w-[300px]"
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>

          <div>
            <Label htmlFor="options">Options/Notes</Label>
            <Input
              id="options"
              value={editForm.options}
              onChange={(e) => setEditForm((prev) => ({ ...prev, options: e.target.value }))}
              placeholder="Size, color, specifications..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Add Item Dialog Component
interface AddItemDialogProps {
  onSave: (item: Partial<QuoteItem>) => void;
  onCancel: () => void;
  currencyDisplay: any;
  hsnCode?: string;
}

const AddItemDialog: React.FC<AddItemDialogProps> = ({
  onSave,
  onCancel,
  currencyDisplay,
  hsnCode,
}) => {
  const [addForm, setAddForm] = useState({
    name: '',
    quantity: 1,
    costprice_origin: 0,
    weight: 0,
    options: '',
    url: '',
    hsn_code: hsnCode || '',
    category: '',
  });
  const [selectedWeightSource, setSelectedWeightSource] = useState<'hsn' | 'ml' | 'manual' | null>(
    null,
  );

  const handleSave = async () => {
    const newItem: Partial<QuoteItem> = {
      id: `item_${Date.now()}`, // Temporary ID
      name: addForm.name,
      quantity: addForm.quantity,
      costprice_origin: addForm.costprice_origin,
      weight: addForm.weight,
      options: addForm.options,
      url: addForm.url,
      hsn_code: addForm.hsn_code,
      category: addForm.category,
      smart_data: {
        weight_source: selectedWeightSource || 'manual',
        weight_confidence: 0.8,
        price_confidence: 0.9,
        category_detected: addForm.category || '',
        customs_suggestions: [],
        optimization_hints: [],
      },
    };

    onSave(newItem);
  };

  const isValid = addForm.name.trim() && addForm.quantity > 0;

  return (
    <Dialog open={true} onOpenChange={() => onCancel()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Item</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Product Name *</Label>
            <Input
              id="name"
              value={addForm.name}
              onChange={(e) => setAddForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., iPhone 15 Pro, Nike Air Jordan"
            />
          </div>

          <div>
            <Label htmlFor="url">Product URL (Optional)</Label>
            <Input
              id="url"
              value={addForm.url}
              onChange={(e) => setAddForm((prev) => ({ ...prev, url: e.target.value }))}
              placeholder="https://amazon.com/..."
            />
          </div>

          {/* Inline Product Fields - Quantity, Price, Weight, HSN */}
          <div>
            <Label className="flex items-center space-x-2 mb-2">
              <span>Product Details</span>
              {(isEstimating || isLoadingHSN) && (
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs text-blue-600">
                    {isLoadingHSN ? 'Loading HSN...' : 'AI estimating...'}
                  </span>
                </div>
              )}
            </Label>

            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-4 flex-wrap">
                {/* Quantity Field */}
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-xs font-medium min-w-[30px]">QTY</span>
                  <div className="flex items-center bg-white border border-gray-200 rounded px-2 py-1">
                    <Input
                      type="number"
                      value={addForm.quantity}
                      onChange={(e) =>
                        setAddForm((prev) => ({ ...prev, quantity: Number(e.target.value) }))
                      }
                      className="w-16 h-8 border-0 p-0 text-center text-sm font-medium"
                      min="1"
                    />
                  </div>
                </div>

                {/* Price Field */}
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-xs font-medium min-w-[35px]">PRICE</span>
                  <div className="flex items-center bg-white border border-gray-200 rounded px-2 py-1">
                    <DollarSign className="w-3 h-3 text-gray-400" />
                    <Input
                      type="number"
                      value={addForm.costprice_origin}
                      onChange={(e) =>
                        setAddForm((prev) => ({
                          ...prev,
                          costprice_origin: Number(e.target.value),
                        }))
                      }
                      className="w-20 h-8 border-0 p-0 text-sm font-medium ml-1"
                      step="0.01"
                      min="0"
                    />
                    <span className="text-xs text-gray-400 ml-1">
                      {currencyDisplay.originCurrency}
                    </span>
                  </div>
                </div>

                {/* Weight Field with Smart Dual Suggestions */}
                <div className="flex-1">
                  <SmartDualWeightField
                    value={addForm.weight}
                    onChange={(weight) => {
                      setAddForm((prev) => ({ ...prev, weight }));
                    }}
                    productName={addForm.name}
                    hsnCode={addForm.hsn_code || hsnCode}
                    productUrl={addForm.url}
                    onSourceSelected={(source) => {
                      setSelectedWeightSource(source);
                    }}
                    label=""
                    className="compact-mode"
                  />
                </div>

                {/* HSN Field */}
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-xs font-medium min-w-[30px]">HSN</span>
                  <div className="flex-1">
                    <DirectHSNInput
                      value={addForm.hsn_code}
                      displayValue={
                        addForm.hsn_code && addForm.category
                          ? `${addForm.hsn_code} - ${addForm.category} (${addForm.customs_rate || 15}%, ${addForm.local_tax_rate || 0}%)`
                          : ''
                      }
                      onSelect={(hsn) => {
                        setAddForm((prev) => ({
                          ...prev,
                          hsn_code: hsn.hsn_code,
                          category: hsn.display_name,
                          customs_rate: hsn.tax_data?.typical_rates?.customs?.common || 15,
                          local_tax_rate: hsn.tax_data?.typical_rates?.gst?.standard || hsn.tax_data?.typical_rates?.vat?.common || 0,
                        }));
                      }}
                      onClear={() => {
                        setAddForm((prev) => ({
                          ...prev,
                          hsn_code: '',
                          category: '',
                          customs_rate: undefined,
                          local_tax_rate: undefined,
                        }));
                      }}
                      productName={addForm.name}
                      placeholder="Type to search HSN codes..."
                      className="w-full min-w-[300px]"
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>

          <div>
            <Label htmlFor="options">Options/Notes</Label>
            <Input
              id="options"
              value={addForm.options}
              onChange={(e) => setAddForm((prev) => ({ ...prev, options: e.target.value }))}
              placeholder="Size, color, specifications..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            Add Item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
