// ============================================================================
// COMPACT HSN TAX BREAKDOWN - Industry-Standard Design Following Stripe/Shopify Patterns
// Features: Progressive disclosure, mobile-first, clear hierarchy
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SmartHSNSearch } from '@/components/admin/hsn-components/SmartHSNSearch';
import {
  Tags,
  Calculator,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Edit,
  Save,
  X,
  Info,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { UnifiedQuote } from '@/types/unified-quote';
import { useAdminQuoteCurrency } from '@/hooks/useAdminQuoteCurrency';
import PerItemTaxCalculator from '@/services/PerItemTaxCalculator';
import type { ItemTaxBreakdown } from '@/services/PerItemTaxCalculator';
import { unifiedDataEngine } from '@/services/UnifiedDataEngine';

interface CompactHSNTaxBreakdownProps {
  quote: UnifiedQuote;
  isCalculating?: boolean;
  compact?: boolean;
  onRecalculate?: () => void;
  onUpdateQuote?: () => void;
}

export const CompactHSNTaxBreakdown: React.FC<CompactHSNTaxBreakdownProps> = ({
  quote,
  isCalculating = false,
  compact = true,
  onRecalculate,
  onUpdateQuote,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [taxBreakdowns, setTaxBreakdowns] = useState<ItemTaxBreakdown[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemTaxBreakdown | null>(null);
  const [editForm, setEditForm] = useState({ hsn_code: '', category: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const currencyDisplay = useAdminQuoteCurrency(quote);
  const taxCalculator = PerItemTaxCalculator.getInstance();

  // Calculate HSN tax breakdowns
  useEffect(() => {
    const calculateHSNTaxes = async () => {
      if (!quote?.items?.length) return;

      setIsLoading(true);
      setError(null);

      try {
        const enhanced = await unifiedDataEngine.enhanceQuoteWithHSNData(quote);
        const itemsWithHSN = enhanced.items.filter((item) => item.hsn_code);

        if (itemsWithHSN.length === 0) {
          setTaxBreakdowns([]);
          return;
        }

        const context = {
          route: {
            id: 1,
            origin_country: quote.origin_country,
            destination_country: quote.destination_country,
            tax_configuration: {},
            weight_configuration: {},
            api_configuration: {},
          },
        };

        const calculatorItems = itemsWithHSN.map((item) => ({
          id: item.id,
          name: item.name,
          price_origin_currency: item.price_usd,
          weight_kg: item.weight_kg,
          hsn_code: item.hsn_code,
          category: item.category,
          url: item.url,
          quantity: item.quantity || 1,
        }));

        const breakdowns = await taxCalculator.calculateMultipleItemTaxes(calculatorItems, context);
        setTaxBreakdowns(breakdowns);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to calculate HSN taxes');
      } finally {
        setIsLoading(false);
      }
    };

    calculateHSNTaxes();
  }, [quote, taxCalculator]);

  // Calculate summary metrics following Stripe/Shopify patterns
  const summary = React.useMemo(() => {
    if (!taxBreakdowns.length) {
      return {
        totalItems: quote.items?.length || 0,
        itemsWithHSN: 0,
        totalCustoms: 0,
        totalLocalTaxes: 0,
        totalTaxes: 0,
      };
    }

    const totalCustoms = taxBreakdowns.reduce((sum, breakdown) => sum + breakdown.total_customs, 0);
    const totalLocalTaxes = taxBreakdowns.reduce(
      (sum, breakdown) => sum + breakdown.total_local_taxes,
      0,
    );

    return {
      totalItems: quote.items?.length || 0,
      itemsWithHSN: taxBreakdowns.length,
      totalCustoms,
      totalLocalTaxes,
      totalTaxes: totalCustoms + totalLocalTaxes,
    };
  }, [taxBreakdowns, quote.items]);

  // Open edit dialog
  const handleEditItem = (breakdown: ItemTaxBreakdown) => {
    setEditingItem(breakdown);
    setEditForm({ hsn_code: breakdown.hsn_code, category: breakdown.category });
    setDialogError(null);
    setEditDialogOpen(true);
  };

  // Save HSN changes
  const handleSaveEdit = async () => {
    if (!editingItem || !editForm.hsn_code.trim()) return;

    setIsSaving(true);
    setDialogError(null);

    try {
      const success = await unifiedDataEngine.updateItem(quote.id, editingItem.item_id, {
        hsn_code: editForm.hsn_code.trim(),
        category: editForm.category,
      });

      if (success) {
        setEditDialogOpen(false);
        setEditingItem(null);
        
        if (onUpdateQuote) onUpdateQuote();
        if (onRecalculate) onRecalculate();
      } else {
        setDialogError('Failed to update HSN classification');
      }
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : 'Failed to update HSN classification');
    } finally {
      setIsSaving(false);
    }
  };

  // Get category badge with minimal styling
  const getCategoryBadge = (category: string) => {
    if (!category) return null;
    return (
      <Badge variant="outline" className="text-xs text-gray-600">
        {category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ')}
      </Badge>
    );
  };

  // Error state
  if (error) {
    return (
      <Card className="shadow-sm border-red-200 bg-red-50/20">
        <CardContent className="p-3">
          <Alert className="border-red-200">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              HSN tax calculation failed: {error}
            </AlertDescription>
          </Alert>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setError(null);
              if (onRecalculate) onRecalculate();
            }}
            className="mt-2 text-xs"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-sm border-purple-200 bg-purple-50/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <Tags className="w-4 h-4 text-purple-600" />
              <span>HSN Tax Breakdown</span>
              {isLoading && <RefreshCw className="w-3 h-3 animate-spin" />}
            </div>
            {summary.itemsWithHSN > 0 && (
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">
                  {summary.itemsWithHSN}/{summary.totalItems} items
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="h-6 w-6 p-0"
                >
                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </Button>
              </div>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Main Summary - Always Visible (Stripe/Shopify Pattern) */}
          {summary.itemsWithHSN === 0 ? (
            <div className="flex items-center space-x-2 text-amber-600">
              <Info className="w-4 h-4" />
              <span className="text-sm">No HSN codes assigned to items</span>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Primary Totals - Most Important Information First */}
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-red-50 rounded border border-red-200">
                  <div className="text-lg font-semibold text-red-700">
                    {currencyDisplay.formatSingleAmount(summary.totalCustoms, 'origin')}
                  </div>
                  <div className="text-xs text-red-600">Customs Duty</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded border border-blue-200">
                  <div className="text-lg font-semibold text-blue-700">
                    {currencyDisplay.formatSingleAmount(summary.totalLocalTaxes, 'origin')}
                  </div>
                  <div className="text-xs text-blue-600">Local Taxes</div>
                </div>
              </div>

              {/* Total Tax Impact */}
              <div className="text-center p-2 bg-purple-50 rounded border border-purple-200">
                <div className="text-sm text-purple-600">
                  Total Tax Impact: <span className="font-semibold">
                    {currencyDisplay.formatSingleAmount(summary.totalTaxes, 'origin')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Expanded Per-Item Details */}
          {isExpanded && summary.itemsWithHSN > 0 && (
            <div className="mt-4 border-t border-purple-200 pt-4 space-y-3">
              {taxBreakdowns.map((breakdown) => {
                const isUnclassified = !breakdown.hsn_code || breakdown.hsn_code.trim() === '';
                
                return (
                  <div
                    key={breakdown.item_id}
                    className={`border rounded-lg p-3 ${
                      isUnclassified 
                        ? 'border-amber-300 bg-amber-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {/* Item Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {breakdown.item_name}
                        </h4>
                        <div className="flex items-center space-x-2 mt-1">
                          {isUnclassified ? (
                            <Badge variant="secondary" className="text-xs bg-amber-200 text-amber-800">
                              HSN: Not Assigned
                            </Badge>
                          ) : (
                            <>
                              <Badge variant="outline" className="text-xs">
                                HSN: {breakdown.hsn_code}
                              </Badge>
                              {getCategoryBadge(breakdown.category)}
                            </>
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditItem(breakdown)}
                        className="h-7 w-7 p-0 hover:bg-gray-100"
                        title="Edit HSN classification"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Tax Calculation Display - Show Applied Method Only */}
                    {!isUnclassified && (
                      <div className="grid grid-cols-3 gap-2 text-xs border-t pt-2">
                        <div className="text-center">
                          <div className="font-medium text-red-600">
                            {currencyDisplay.formatSingleAmount(breakdown.total_customs, 'origin')}
                          </div>
                          <div className="text-gray-600">Customs</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-blue-600">
                            {currencyDisplay.formatSingleAmount(breakdown.total_local_taxes, 'origin')}
                          </div>
                          <div className="text-gray-600">Local Tax</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-purple-600">
                            {currencyDisplay.formatSingleAmount(breakdown.total_taxes, 'origin')}
                          </div>
                          <div className="text-gray-600">Total</div>
                        </div>
                      </div>
                    )}

                    {/* Unclassified Item Warning */}
                    {isUnclassified && (
                      <div className="flex items-center space-x-2 p-2 bg-amber-100 rounded text-xs border-t">
                        <AlertTriangle className="w-3 h-3 text-amber-600 flex-shrink-0" />
                        <span className="text-amber-800">
                          HSN classification required for tax calculation
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Action Button */}
          {summary.itemsWithHSN > 0 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-purple-200">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (onRecalculate) onRecalculate();
                }}
                disabled={isLoading || isCalculating}
                className="text-xs"
              >
                <Calculator className="w-3 h-3 mr-1" />
                Recalculate
              </Button>
              <div className="text-xs text-gray-500">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit HSN Classification</DialogTitle>
          </DialogHeader>
          
          {editingItem && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Item</label>
                <div className="text-sm text-gray-600">{editingItem.item_name}</div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">HSN Code</label>
                <SmartHSNSearch
                  currentHSNCode={editForm.hsn_code}
                  productName={editingItem.item_name}
                  onHSNSelect={(hsn) => {
                    setEditForm({
                      hsn_code: hsn.hsn_code,
                      category: hsn.category
                    });
                  }}
                  placeholder="Search HSN by product name..."
                  size="default"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Category</label>
                <Select
                  value={editForm.category}
                  onValueChange={(value) => setEditForm(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="electronics">Electronics</SelectItem>
                    <SelectItem value="clothing">Clothing</SelectItem>
                    <SelectItem value="books">Books</SelectItem>
                    <SelectItem value="toys">Toys</SelectItem>
                    <SelectItem value="accessories">Accessories</SelectItem>
                    <SelectItem value="home_garden">Home & Garden</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {dialogError && (
                <Alert className="border-red-200">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm text-red-600">
                    {dialogError}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveEdit}
              disabled={isSaving || !editForm.hsn_code.trim()}
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-3 h-3 mr-1" />
                  Save
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CompactHSNTaxBreakdown;