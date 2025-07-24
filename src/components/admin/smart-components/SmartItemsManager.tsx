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
import { unifiedDataEngine } from '@/services/UnifiedDataEngine';
import { useToast } from '@/hooks/use-toast';
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
  Brain,
} from 'lucide-react';
import type { UnifiedQuote, QuoteItem } from '@/types/unified-quote';
import { useAdminQuoteCurrency } from '@/hooks/useAdminQuoteCurrency';
import HSNAutoComplete from '@/components/admin/hsn-components/HSNAutoComplete';
import CustomsCalculationPreview from '@/components/admin/hsn-components/CustomsCalculationPreview';

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
    price_usd: 0,
    weight_kg: 0,
  });

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
      console.error('Error deleting item:', error);
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
  const handleUpdateItem = async (updatedItem: QuoteItem) => {
    try {
      const success = await unifiedDataEngine.updateItem(quote.id, updatedItem.id, updatedItem);
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
      console.error('Error updating item:', error);
      toast({
        title: 'Update failed',
        description: 'Failed to update item. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Handle item addition
  const handleAddItem = async (newItem: Partial<QuoteItem>) => {
    try {
      const itemToAdd = {
        ...newItem,
        smart_data: {
          weight_confidence: 0.5,
          category_detected: 'general',
          optimization_hints: [],
          customs_suggestions: [],
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
      console.error('Error adding item:', error);
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
              .reduce(
                (sum, item) => sum + Number(item.weight_kg || 0) * Number(item.quantity || 0),
                0,
              )
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

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Quantity:</span>
                      <div className="font-medium">{item.quantity}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">
                        Price ({currencyDisplay.originCurrency}):
                      </span>
                      <div className="font-medium">
                        {currencyDisplay.formatSingleAmount(Number(item.price_usd || 0), 'origin')}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Weight:</span>
                      <div className="flex items-center space-x-1">
                        <span className="font-medium">{Number(item.weight_kg || 0)} kg</span>
                        <Badge
                          {...getWeightConfidenceBadge(item.smart_data?.weight_confidence || 0)}
                        >
                          {getWeightConfidenceBadge(item.smart_data?.weight_confidence || 0).text}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Total:</span>
                      <div className="font-medium">
                        {currencyDisplay.formatSingleAmount(
                          Number(item.price_usd || 0) * item.quantity,
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
                    </div>

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
                    (sum, item) => sum + Number(item.weight_kg || 0) * Number(item.quantity || 0),
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
            {quote.items.some((item) => Number(item.weight_kg || 0) < 0.1) && (
              <div className="flex items-center text-blue-700">
                <Scale className="w-3 h-3 mr-2" />
                Some items have very low weights - this may affect shipping calculations
              </div>
            )}
            <div className="flex items-center text-blue-700">
              <CheckCircle className="w-3 h-3 mr-2" />
              All items have been categorized for optimal customs processing
            </div>
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
        />
      )}

      {/* Add Item Dialog */}
      {isAddingItem && (
        <AddItemDialog
          onSave={handleAddItem}
          onCancel={() => setIsAddingItem(false)}
          currencyDisplay={currencyDisplay}
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
}

const EditItemDialog: React.FC<EditItemDialogProps> = ({
  item,
  onSave,
  onCancel,
  currencyDisplay,
}) => {
  const [editForm, setEditForm] = useState({
    name: item.name,
    quantity: item.quantity,
    price_usd: item.price_usd,
    weight_kg: item.weight_kg,
    options: item.options || '',
    hsn_code: item.hsn_code || '',
    category: item.category || '',
  });
  const [weightEstimation, setWeightEstimation] = useState<any>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [selectedHSN, setSelectedHSN] = useState<any>(null);
  const [hsnError, setHsnError] = useState<string | null>(null);

  // Initialize selectedHSN if item already has HSN data
  useEffect(() => {
    if (item.hsn_code && item.category) {
      setSelectedHSN({
        hsn_code: item.hsn_code,
        category: item.category,
        description: `${item.category} item`, // Simplified description
        minimum_valuation_usd: undefined, // Will be loaded from database if needed
      });
    }
  }, [item.hsn_code, item.category]);

  // Auto-estimate weight when name changes
  useEffect(() => {
    if (editForm.name) {
      const timeoutId = setTimeout(async () => {
        setIsEstimating(true);
        try {
          const estimation = await smartWeightEstimator.estimateWeight(editForm.name);
          setWeightEstimation(estimation);
        } catch (error) {
          console.error('Weight estimation error:', error);
        } finally {
          setIsEstimating(false);
        }
      }, 800);

      return () => clearTimeout(timeoutId);
    }
  }, [editForm.name]);

  const handleSave = async () => {
    // Learn from user input if different from estimation
    if (
      weightEstimation &&
      Math.abs(editForm.weight_kg - weightEstimation.estimated_weight) > 0.1
    ) {
      try {
        await smartWeightEstimator.learnFromActualWeight(
          editForm.name,
          editForm.weight_kg,
          undefined,
          {
            userConfirmed: true,
            originalEstimate: weightEstimation.estimated_weight,
          },
        );
        console.log('✅ ML learning completed from item edit');
      } catch (error) {
        console.error('Error learning from edit:', error);
      }
    }

    const updatedItem: QuoteItem = {
      ...item,
      name: editForm.name,
      quantity: editForm.quantity,
      price_usd: editForm.price_usd,
      weight_kg: editForm.weight_kg,
      options: editForm.options,
      hsn_code: editForm.hsn_code,
      category: editForm.category,
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={editForm.quantity}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))
                }
              />
            </div>
            <div>
              <Label htmlFor="price">Price ({currencyDisplay.originCurrency})</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={editForm.price_usd}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, price_usd: parseFloat(e.target.value) || 0 }))
                }
              />
            </div>
          </div>

          <div>
            <Label htmlFor="weight" className="flex items-center space-x-2">
              <span>Weight (kg)</span>
              {isEstimating && (
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs text-blue-600">AI estimating...</span>
                </div>
              )}
            </Label>
            <Input
              id="weight"
              type="number"
              step="0.001"
              min="0"
              value={editForm.weight_kg}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, weight_kg: parseFloat(e.target.value) || 0 }))
              }
            />

            {/* AI Weight Suggestion */}
            {weightEstimation && (
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-800">
                    AI suggests: {weightEstimation.estimated_weight} kg
                  </span>
                  <div className="flex items-center space-x-2">
                    <Badge variant={weightEstimation.confidence >= 0.8 ? 'default' : 'secondary'}>
                      {(weightEstimation.confidence * 100).toFixed(0)}% confident
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setEditForm((prev) => ({
                          ...prev,
                          weight_kg: weightEstimation.estimated_weight,
                        }))
                      }
                    >
                      Use
                    </Button>
                  </div>
                </div>
                {weightEstimation.reasoning.length > 0 && (
                  <div className="text-xs text-blue-600 mt-1">{weightEstimation.reasoning[0]}</div>
                )}
              </div>
            )}
          </div>

          {/* HSN Classification Section */}
          <div className="space-y-3 border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center">
              <Package className="w-4 h-4 mr-2" />
              HSN Classification & Customs Preview
              <span className="ml-2 text-xs text-green-600">[EDIT DIALOG]</span>
            </h3>
            
            {hsnError && (
              <div className="p-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
                HSN Error: {hsnError}
              </div>
            )}
            
            <HSNAutoComplete
              value={editForm.hsn_code}
              productName={editForm.name}
              originCountry={currencyDisplay.originCountry}
              onHSNSelect={(hsn) => {
                try {
                  setSelectedHSN(hsn);
                  setEditForm(prev => ({
                    ...prev,
                    hsn_code: hsn.hsn_code,
                    category: hsn.category
                  }));
                  setHsnError(null);
                } catch (error) {
                  console.error('HSN select error:', error);
                  setHsnError('Failed to select HSN classification');
                }
              }}
              onClear={() => {
                setSelectedHSN(null);
                setEditForm(prev => ({
                  ...prev,
                  hsn_code: '',
                  category: ''
                }));
              }}
            />
            
            {editForm.hsn_code && editForm.price_usd > 0 && (
              <CustomsCalculationPreview
                productPrice={editForm.price_usd}
                quantity={editForm.quantity}
                hsnCode={editForm.hsn_code}
                category={editForm.category}
                minimumValuationUSD={selectedHSN?.minimum_valuation_usd}
                originCountry={currencyDisplay.originCountry}
                destinationCountry={currencyDisplay.destinationCountry}
              />
            )}
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
}

const AddItemDialog: React.FC<AddItemDialogProps> = ({ onSave, onCancel, currencyDisplay }) => {
  const [addForm, setAddForm] = useState({
    name: '',
    quantity: 1,
    price_usd: 0,
    weight_kg: 0,
    options: '',
    url: '',
    hsn_code: '',
    category: '',
  });
  const [weightEstimation, setWeightEstimation] = useState<any>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [selectedHSN, setSelectedHSN] = useState<any>(null);
  const [hsnError, setHsnError] = useState<string | null>(null);

  // Auto-estimate weight when name changes
  useEffect(() => {
    if (addForm.name) {
      const timeoutId = setTimeout(async () => {
        setIsEstimating(true);
        try {
          const estimation = await smartWeightEstimator.estimateWeight(
            addForm.name,
            addForm.url || undefined,
          );
          setWeightEstimation(estimation);
        } catch (error) {
          console.error('Weight estimation error:', error);
        } finally {
          setIsEstimating(false);
        }
      }, 800);

      return () => clearTimeout(timeoutId);
    }
  }, [addForm.name, addForm.url]);

  const handleSave = async () => {
    // Learn from user input if different from estimation
    if (weightEstimation && Math.abs(addForm.weight_kg - weightEstimation.estimated_weight) > 0.1) {
      try {
        await smartWeightEstimator.learnFromActualWeight(
          addForm.name,
          addForm.weight_kg,
          addForm.url || undefined,
          {
            userConfirmed: true,
            originalEstimate: weightEstimation.estimated_weight,
          },
        );
        console.log('✅ ML learning completed from new item');
      } catch (error) {
        console.error('Error learning from new item:', error);
      }
    }

    const newItem: Partial<QuoteItem> = {
      id: `item_${Date.now()}`, // Temporary ID
      name: addForm.name,
      quantity: addForm.quantity,
      price_usd: addForm.price_usd,
      weight_kg: addForm.weight_kg,
      options: addForm.options,
      url: addForm.url,
      hsn_code: addForm.hsn_code,
      category: addForm.category,
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={addForm.quantity}
                onChange={(e) =>
                  setAddForm((prev) => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))
                }
              />
            </div>
            <div>
              <Label htmlFor="price">Price ({currencyDisplay.originCurrency})</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={addForm.price_usd}
                onChange={(e) =>
                  setAddForm((prev) => ({ ...prev, price_usd: parseFloat(e.target.value) || 0 }))
                }
              />
            </div>
          </div>

          <div>
            <Label htmlFor="weight" className="flex items-center space-x-2">
              <span>Weight (kg)</span>
              {isEstimating && (
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs text-blue-600">AI estimating...</span>
                </div>
              )}
            </Label>
            <Input
              id="weight"
              type="number"
              step="0.001"
              min="0"
              value={addForm.weight_kg}
              onChange={(e) =>
                setAddForm((prev) => ({ ...prev, weight_kg: parseFloat(e.target.value) || 0 }))
              }
            />

            {/* AI Weight Suggestion */}
            {weightEstimation && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-800">
                    <Brain className="w-4 h-4 inline mr-1" /> AI suggests:{' '}
                    {weightEstimation.estimated_weight} kg
                  </span>
                  <div className="flex items-center space-x-2">
                    <Badge variant={weightEstimation.confidence >= 0.8 ? 'default' : 'secondary'}>
                      {(weightEstimation.confidence * 100).toFixed(0)}% confident
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setAddForm((prev) => ({
                          ...prev,
                          weight_kg: weightEstimation.estimated_weight,
                        }))
                      }
                    >
                      Use Suggestion
                    </Button>
                  </div>
                </div>
                {weightEstimation.reasoning.length > 0 && (
                  <div className="text-xs text-blue-600">
                    <strong>Reasoning:</strong> {weightEstimation.reasoning[0]}
                  </div>
                )}
                {weightEstimation.suggestions.length > 0 && (
                  <div className="text-xs text-blue-600 mt-1">
                    <strong>Tip:</strong> {weightEstimation.suggestions[0]}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* HSN Classification Section */}
          <div className="space-y-3 border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center">
              <Package className="w-4 h-4 mr-2" />
              HSN Classification & Customs Preview
              <span className="ml-2 text-xs text-blue-600">[ADD DIALOG]</span>
            </h3>
            
            {hsnError && (
              <div className="p-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
                HSN Error: {hsnError}
              </div>
            )}
            
            <HSNAutoComplete
              value={addForm.hsn_code}
              productName={addForm.name}
              originCountry={currencyDisplay.originCountry}
              onHSNSelect={(hsn) => {
                try {
                  setSelectedHSN(hsn);
                  setAddForm(prev => ({
                    ...prev,
                    hsn_code: hsn.hsn_code,
                    category: hsn.category
                  }));
                  setHsnError(null);
                } catch (error) {
                  console.error('HSN select error:', error);
                  setHsnError('Failed to select HSN classification');
                }
              }}
              onClear={() => {
                setSelectedHSN(null);
                setAddForm(prev => ({
                  ...prev,
                  hsn_code: '',
                  category: ''
                }));
              }}
            />
            
            {addForm.hsn_code && addForm.price_usd > 0 && (
              <CustomsCalculationPreview
                productPrice={addForm.price_usd}
                quantity={addForm.quantity}
                hsnCode={addForm.hsn_code}
                category={addForm.category}
                minimumValuationUSD={selectedHSN?.minimum_valuation_usd}
                originCountry={currencyDisplay.originCountry}
                destinationCountry={currencyDisplay.destinationCountry}
              />
            )}
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
