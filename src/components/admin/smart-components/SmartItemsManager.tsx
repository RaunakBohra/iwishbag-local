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
import { taxRateService } from '@/services/TaxRateService';
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
  
  // State for dynamic tax rates
  const [dynamicTaxRates, setDynamicTaxRates] = useState<{
    customsDefault: number;
    manualDefault: number;
    countryVatRate: number;
  }>({ customsDefault: 10, manualDefault: 15, countryVatRate: 18 });
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [newItem, setNewItem] = useState<Partial<QuoteItem>>({
    name: '',
    quantity: 1,
    costprice_origin: 0,
    weight: 0,
  });

  // Fetch dynamic tax rates based on quote destination country
  useEffect(() => {
    const fetchDynamicTaxRates = async () => {
      if (!quote?.destination_country) return;
      
      try {
        const [customsDefault, manualDefault, countryVatRate] = await Promise.all([
          taxRateService.getCountryCustomsDefault(quote.destination_country),
          taxRateService.getCountryManualDefault(quote.destination_country),
          taxRateService.getCountryVATRate(quote.destination_country)
        ]);

        setDynamicTaxRates({
          customsDefault,
          manualDefault,
          countryVatRate
        });
        
        console.log(`[SmartItemsManager] Dynamic tax rates loaded for ${quote.destination_country}:`, {
          customsDefault,
          manualDefault,
          countryVatRate
        });
      } catch (error) {
        console.error('Failed to fetch dynamic tax rates:', error);
      }
    };
    
    fetchDynamicTaxRates();
  }, [quote?.destination_country]);

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

      {}
                  <div className="mt-3 space-y-2">
                    {}
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

                    {}
      {editingItem && (
        <EditItemDialog
          item={quote.items.find((item) => item.id === editingItem)!}
          onSave={handleUpdateItem}
          onCancel={() => setEditingItem(null)}
          currencyDisplay={currencyDisplay}
          hsnCode={quote.items.find((item) => item.id === editingItem)?.hsn_code}
        />
      )}

      {}
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

                {}
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
                          customs_rate: hsn.tax_data?.typical_rates?.customs?.common || dynamicTaxRates.customsDefault,
                          local_tax_rate: hsn.tax_data?.typical_rates?.gst?.standard || hsn.tax_data?.typical_rates?.vat?.common || dynamicTaxRates.countryVatRate,
                        }));
                      }}
                      onClear={() => {
                        console.log('SmartItemsManager: Clearing hsn_code: '',
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

          {}
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

                {}
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
                          customs_rate: hsn.tax_data?.typical_rates?.customs?.common || dynamicTaxRates.customsDefault,
                          local_tax_rate: hsn.tax_data?.typical_rates?.gst?.standard || hsn.tax_data?.typical_rates?.vat?.common || dynamicTaxRates.countryVatRate,
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
