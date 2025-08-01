import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { currencyService } from '@/services/CurrencyService';
import type { AdminQuoteDetails, QuoteItem } from '@/hooks/admin/useAdminQuoteDetails';
import type { EnhancedCalculationResult } from '@/services/SmartCalculationEngine';
import {
  Package,
  Link,
  Edit2,
  Save,
  X,
  RefreshCw,
  Weight,
  DollarSign,
  Hash,
  AlertCircle
} from 'lucide-react';

interface QuoteItemsTableProps {
  quote: AdminQuoteDetails;
  calculationResult: EnhancedCalculationResult | null;
  onUpdate: (updates: Partial<AdminQuoteDetails>) => Promise<void>;
  onRecalculate: () => Promise<void>;
  isUpdating: boolean;
  isRecalculating: boolean;
}

export const QuoteItemsTable: React.FC<QuoteItemsTableProps> = ({
  quote,
  calculationResult,
  onUpdate,
  onRecalculate,
  isUpdating,
  isRecalculating
}) => {
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editedItem, setEditedItem] = useState<QuoteItem | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const originCurrency = currencyService.getCurrencySymbol(
    quote.origin_country === 'US' ? 'USD' : 'USD' // Simplified for now
  );

  // Start editing an item
  const startEditing = (item: QuoteItem, index: number) => {
    const itemId = item.id || `item-${index}`;
    setEditingItemId(itemId);
    setEditedItem({ 
      ...item,
      costprice_origin: Number(item.costprice_origin) || 0,
      weight: Number(item.weight) || 0,
      quantity: Number(item.quantity) || 1
    });
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingItemId(null);
    setEditedItem(null);
  };

  // Save edited item
  const saveItem = async () => {
    if (!editedItem || !editingItemId) return;

    const updatedItems = quote.items.map((item, index) => {
      const itemId = item.id || `item-${index}`;
      if (itemId === editingItemId) {
        return editedItem;
      }
      return item;
    });

    await onUpdate({ items: updatedItems });
    setEditingItemId(null);
    setEditedItem(null);
    await onRecalculate();
  };

  // Toggle item selection
  const toggleItemSelection = (itemId: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  // Select all items
  const toggleSelectAll = () => {
    if (selectedItems.size === quote.items.length) {
      setSelectedItems(new Set());
    } else {
      const allIds = quote.items.map((item, index) => item.id || `item-${index}`);
      setSelectedItems(new Set(allIds));
    }
  };

  // Get tax breakdown for an item
  const getItemTaxBreakdown = (itemId: string) => {
    if (!calculationResult?.updated_quote?.calculation_data?.item_breakdowns) return null;
    
    return calculationResult.updated_quote.calculation_data.item_breakdowns.find(
      breakdown => breakdown.item_id === itemId
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Items ({quote.items.length})
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={onRecalculate}
          disabled={isRecalculating || isUpdating}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRecalculating ? 'animate-spin' : ''}`} />
          Recalculate
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={selectedItems.size === quote.items.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-center">Qty</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Weight</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quote.items.map((item, index) => {
                const itemId = item.id || `item-${index}`;
                const isEditing = editingItemId === itemId;
                const currentItem = isEditing ? editedItem! : item;
                const taxBreakdown = getItemTaxBreakdown(itemId);

                return (
                  <TableRow key={itemId}>
                    <TableCell>
                      <Checkbox
                        checked={selectedItems.has(itemId)}
                        onCheckedChange={() => toggleItemSelection(itemId)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {isEditing ? (
                          <Input
                            value={currentItem.name}
                            onChange={(e) => setEditedItem({
                              ...currentItem,
                              name: e.target.value
                            })}
                            className="h-8"
                          />
                        ) : (
                          <>
                            <p className="font-medium">{item.name}</p>
                            {item.url && (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                              >
                                <Link className="w-3 h-3" />
                                View Product
                              </a>
                            )}
                            {item.sku && (
                              <p className="text-xs text-gray-500">SKU: {item.sku}</p>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {isEditing ? (
                        <Input
                          type="number"
                          value={currentItem.quantity}
                          onChange={(e) => setEditedItem({
                            ...currentItem,
                            quantity: parseInt(e.target.value) || 1
                          })}
                          className="h-8 w-16"
                          min="1"
                        />
                      ) : (
                        item.quantity
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="space-y-1">
                        {isEditing ? (
                          <Input
                            type="number"
                            value={currentItem.costprice_origin}
                            onChange={(e) => setEditedItem({
                              ...currentItem,
                              costprice_origin: parseFloat(e.target.value) || 0
                            })}
                            className="h-8 text-right"
                            step="0.01"
                          />
                        ) : (
                          <>
                            <p className="font-medium">
                              {originCurrency}{(Number(item.costprice_origin) || 0).toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500">
                              Total: {originCurrency}{((Number(item.costprice_origin) || 0) * item.quantity).toFixed(2)}
                            </p>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {isEditing ? (
                        <Input
                          type="number"
                          value={Number(currentItem.weight) || 0}
                          onChange={(e) => setEditedItem({
                            ...currentItem,
                            weight: parseFloat(e.target.value) || 0
                          })}
                          className="h-8 text-right"
                          step="0.001"
                        />
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <Weight className="w-3 h-3 text-gray-400" />
                          <span>{(Number(item.weight) || 0).toFixed(2)} kg</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {isEditing ? (
                        <Input
                          value={currentItem.hsn_code || ''}
                          onChange={(e) => setEditedItem({
                            ...currentItem,
                            hsn_code: e.target.value
                          })}
                          className="h-8"
                          placeholder="HSN Code"
                        />
                      ) : (
                        item.hsn_code ? (
                          <Badge variant="outline" className="font-mono">
                            {item.hsn_code}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {isEditing ? (
                        <Select
                          value={currentItem.tax_method || 'hsn'}
                          onValueChange={(value) => setEditedItem({
                            ...currentItem,
                            tax_method: value as 'hsn' | 'manual' | 'route_based'
                          })}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hsn">HSN</SelectItem>
                            <SelectItem value="manual">Manual</SelectItem>
                            <SelectItem value="route_based">Route</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={
                          item.tax_method === 'hsn' ? 'default' :
                          item.tax_method === 'manual' ? 'secondary' : 'outline'
                        }>
                          {item.tax_method || 'HSN'}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {taxBreakdown ? (
                        <div className="space-y-1">
                          <p className="font-medium">
                            {originCurrency}{(Number(taxBreakdown.customs) || 0).toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500">
                            on {originCurrency}{(Number(taxBreakdown.customs_value) || 0).toFixed(2)}
                          </p>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={saveItem}
                            disabled={isUpdating}
                          >
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={cancelEditing}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditing(item, index)}
                          disabled={isUpdating || editingItemId !== null}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Tax Summary */}
        {calculationResult?.hsn_calculation_summary && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-blue-600" />
              <h4 className="font-medium text-sm">Tax Calculation Summary</h4>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Total Customs</p>
                <p className="font-medium">
                  {originCurrency}{(Number(calculationResult.hsn_calculation_summary.total_customs) || 0).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Total Local Taxes</p>
                <p className="font-medium">
                  {originCurrency}{(Number(calculationResult.hsn_calculation_summary.total_local_taxes) || 0).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Items w/ Min Valuation</p>
                <p className="font-medium">
                  {calculationResult.hsn_calculation_summary.items_with_minimum_valuation} of {quote.items.length}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Tax Method</p>
                <p className="font-medium capitalize">
                  {quote.calculation_data?.tax_calculation?.method || 'HSN'}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};