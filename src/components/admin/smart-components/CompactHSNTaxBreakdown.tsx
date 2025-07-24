// ============================================================================
// COMPACT HSN TAX BREAKDOWN - Per-Item Tax Display with Currency Conversion
// Features: HSN classification, minimum valuation logic, currency conversion display
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SmartHSNSearch } from '@/components/admin/hsn-components/SmartHSNSearch';
import { Progress } from '@/components/ui/progress';
import {
  Tags,
  Calculator,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Info,
  ArrowRight,
  Zap,
  RefreshCw,
  Scale,
  Edit,
  Save,
  X,
  Clock,
  Plus,
  Trash2,
  BarChart3,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { UnifiedQuote } from '@/types/unified-quote';
import { useAdminQuoteCurrency } from '@/hooks/useAdminQuoteCurrency';
import PerItemTaxCalculator from '@/services/PerItemTaxCalculator';
import type { ItemTaxBreakdown } from '@/services/PerItemTaxCalculator';
import { unifiedDataEngine } from '@/services/UnifiedDataEngine';
import { DualCalculationMethodSelector } from '@/components/admin/tax-method-selection/DualCalculationMethodSelector';

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
  const [activeTab, setActiveTab] = useState('summary');
  const [taxBreakdowns, setTaxBreakdowns] = useState<ItemTaxBreakdown[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enhancedQuote, setEnhancedQuote] = useState<UnifiedQuote | null>(null);
  
  // Edit state management with item-specific error tracking
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ hsn_code: '', category: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [isLookingUpHSN, setIsLookingUpHSN] = useState(false);
  const [itemErrors, setItemErrors] = useState<Record<string, string | null>>({});
  
  // Method selection state and handler
  const handleMethodChange = async (method: string, metadata?: any) => {
    console.log('🔄 [HSN] Tax calculation method changed:', { method, metadata, quoteId: quote.id });
    
    // Trigger recalculation with new method
    if (onRecalculate) {
      await onRecalculate();
    }
    
    // Refresh the current calculation to reflect new method
    await calculateItemTaxes();
  };

  // Get standardized currency display info
  const currencyDisplay = useAdminQuoteCurrency(quote);
  const taxCalculator = PerItemTaxCalculator.getInstance();

  // Auto-lookup HSN code and set correct category
  const lookupHSNCode = async (hsnCode: string, itemId: string) => {
    console.log(`🔍 [HSN-LOOKUP] Attempting lookup for item ${itemId}: "${hsnCode}" (length: ${hsnCode.length})`);
    
    if (!hsnCode || !/^\d{2,8}$/.test(hsnCode)) {
      console.log(`❌ [HSN-LOOKUP] Invalid HSN code format: "${hsnCode}"`);
      // Clear any existing errors for invalid format
      setItemErrors(prev => ({ ...prev, [itemId]: null }));
      return; // Skip invalid HSN codes
    }

    console.log(`🔄 [HSN-LOOKUP] Starting database lookup for HSN: ${hsnCode}`);
    setIsLookingUpHSN(true);
    setItemErrors(prev => ({ ...prev, [itemId]: null })); // Clear any previous errors for this item

    try {
      const { data: hsnRecord, error: hsnError } = await supabase
        .from('hsn_master')
        .select('hsn_code, category, description')
        .eq('hsn_code', hsnCode)
        .eq('is_active', true)
        .single();

      console.log(`📊 [HSN-LOOKUP] Database result:`, { hsnRecord, hsnError });

      if (hsnError || !hsnRecord) {
        const errorMsg = `HSN code ${hsnCode} not found in database`;
        console.log(`❌ [HSN-LOOKUP] ${errorMsg}`);
        setItemErrors(prev => ({ ...prev, [itemId]: errorMsg }));
        return;
      }

      // Clear error and automatically set the correct category
      setItemErrors(prev => ({ ...prev, [itemId]: null })); // Ensure error is cleared on successful lookup
      setEditForm(prev => {
        console.log(`🔄 [HSN-LOOKUP] Updating form - old category: ${prev.category}, new category: ${hsnRecord.category}`);
        return {
          ...prev,
          category: hsnRecord.category,
        };
      });

      console.log(`✅ [HSN-LOOKUP] Auto-set category for HSN ${hsnCode}: ${hsnRecord.category}`);

    } catch (error) {
      console.error('❌ [HSN-LOOKUP] Database error:', error);
      setItemErrors(prev => ({ ...prev, [itemId]: 'Failed to lookup HSN code' }));
    } finally {
      setIsLookingUpHSN(false);
    }
  };

  // Calculate HSN tax breakdowns
  useEffect(() => {
    const calculateHSNTaxes = async () => {
      if (!quote?.items?.length) return;

      setIsLoading(true);
      setError(null);

      try {
        // First enhance quote with HSN data
        const enhanced = await unifiedDataEngine.enhanceQuoteWithHSNData(quote);
        setEnhancedQuote(enhanced);

        // Only calculate taxes for items with HSN codes
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

        // Convert items to calculator format
        const calculatorItems = itemsWithHSN.map((item) => ({
          id: item.id,
          name: item.name,
          price_origin_currency: item.price_usd, // Assume stored in USD for now
          weight_kg: item.weight_kg,
          hsn_code: item.hsn_code,
          category: item.category,
          url: item.url,
          quantity: item.quantity || 1,
        }));

        const breakdowns = await taxCalculator.calculateMultipleItemTaxes(calculatorItems, context);
        setTaxBreakdowns(breakdowns);
      } catch (error) {
        console.error('HSN tax calculation error:', error);
        setError(error instanceof Error ? error.message : 'Failed to calculate HSN taxes');
      } finally {
        setIsLoading(false);
      }
    };

    calculateHSNTaxes();
  }, [quote, taxCalculator]);

  // Calculate summary metrics
  const summary = React.useMemo(() => {
    if (!taxBreakdowns.length) {
      return {
        totalItems: quote.items?.length || 0,
        itemsWithHSN: 0,
        itemsWithMinimumValuation: 0,
        totalCustoms: 0,
        totalLocalTaxes: 0,
        totalTaxes: 0,
        averageConfidence: 0,
        currencyConversionsApplied: 0,
      };
    }

    const itemsWithMinimumValuation = taxBreakdowns.filter(
      (breakdown) => breakdown.valuation_method === 'minimum_valuation',
    ).length;

    const currencyConversionsApplied = taxBreakdowns.filter(
      (breakdown) => breakdown.minimum_valuation_conversion,
    ).length;

    const totalCustoms = taxBreakdowns.reduce((sum, breakdown) => sum + breakdown.total_customs, 0);
    const totalLocalTaxes = taxBreakdowns.reduce(
      (sum, breakdown) => sum + breakdown.total_local_taxes,
      0,
    );
    const averageConfidence =
      taxBreakdowns.reduce((sum, breakdown) => sum + breakdown.confidence_score, 0) /
      taxBreakdowns.length;

    return {
      totalItems: quote.items?.length || 0,
      itemsWithHSN: taxBreakdowns.length,
      itemsWithMinimumValuation,
      totalCustoms,
      totalLocalTaxes,
      totalTaxes: totalCustoms + totalLocalTaxes,
      averageConfidence,
      currencyConversionsApplied,
    };
  }, [taxBreakdowns, quote.items]);

  const getValuationMethodBadge = (method: string) => {
    switch (method) {
      case 'minimum_valuation':
        return (
          <Badge variant="destructive" className="text-xs">
            Min. Valuation
          </Badge>
        );
      case 'higher_of_both':
        return (
          <Badge variant="secondary" className="text-xs">
            Actual Price
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs">
            Original
          </Badge>
        );
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) {
      return (
        <Badge variant="default" className="text-xs bg-green-600">
          High
        </Badge>
      );
    } else if (confidence >= 0.6) {
      return (
        <Badge variant="secondary" className="text-xs">
          Medium
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive" className="text-xs">
          Low
        </Badge>
      );
    }
  };

  const getCategoryBadge = (category: string) => {
    const categoryColors = {
      electronics: 'bg-blue-100 text-blue-800 border-blue-200',
      clothing: 'bg-purple-100 text-purple-800 border-purple-200',
      books: 'bg-green-100 text-green-800 border-green-200',
      toys: 'bg-orange-100 text-orange-800 border-orange-200',
      accessories: 'bg-pink-100 text-pink-800 border-pink-200',
      home_garden: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    };

    const colorClass = categoryColors[category as keyof typeof categoryColors] || 'bg-gray-100 text-gray-800 border-gray-200';
    
    return (
      <Badge variant="outline" className={`text-xs ${colorClass}`}>
        {category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ')}
      </Badge>
    );
  };

  // Edit handlers
  const handleEditStart = (itemId: string, currentHsnCode: string, currentCategory: string) => {
    setEditingItemId(itemId);
    setEditForm({ hsn_code: currentHsnCode, category: currentCategory });
    setItemErrors(prev => ({ ...prev, [itemId]: null })); // Clear any existing errors for this item when starting edit
  };

  const handleEditCancel = () => {
    const currentItemId = editingItemId;
    setEditingItemId(null);
    setEditForm({ hsn_code: '', category: '' });
    if (currentItemId) {
      setItemErrors(prev => ({ ...prev, [currentItemId]: null })); // Clear errors for this item when cancelling edit
    }
  };

  const handleEditSave = async (itemId: string) => {
    if (!editForm.hsn_code.trim()) return;
    
    // Prevent saving while lookup is in progress
    if (isLookingUpHSN) {
      console.log(`⏳ [HSN-SAVE] Cannot save while lookup is in progress`);
      setItemErrors(prev => ({ ...prev, [itemId]: 'Please wait for HSN lookup to complete' }));
      return;
    }
    
    // Debug what's being saved
    console.log(`💾 [HSN-SAVE] Starting save for item ${itemId}:`, {
      hsn_code: editForm.hsn_code.trim(),
      category: editForm.category,
      isLookingUp: isLookingUpHSN,
      currentError: itemErrors[itemId],
    });
    
    // If category is empty but HSN code is provided, try auto-lookup one more time
    if (editForm.hsn_code.trim() && !editForm.category) {
      console.log(`🔄 [HSN-SAVE] No category provided, attempting final lookup...`);
      await lookupHSNCode(editForm.hsn_code.trim(), itemId);
      
      // Wait a moment for the lookup to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check if category was set
      if (!editForm.category) {
        setItemErrors(prev => ({ ...prev, [itemId]: 'Could not determine category for HSN code. Please select manually.' }));
        return;
      }
    }
    
    setIsSaving(true);
    try {
      // Update the item in the quote
      const success = await unifiedDataEngine.updateItem(quote.id, itemId, {
        hsn_code: editForm.hsn_code.trim(),
        category: editForm.category,
      });

      if (success) {
        console.log(`✅ [HSN-SAVE] Successfully saved HSN data for item ${itemId}`);
        // Clear any errors for this item and exit edit mode
        setItemErrors(prev => ({ ...prev, [itemId]: null }));
        setEditingItemId(null);
        
        // Force quote data refresh to ensure admin tracking is updated
        if (onUpdateQuote) {
          console.log('🔄 [HSN-UPDATE] Triggering quote data refresh after HSN modification');
          onUpdateQuote();
        }
        
        // Trigger immediate recalculation for real-time updates
        if (onRecalculate) {
          console.log('🧮 [HSN-UPDATE] Triggering immediate recalculation after HSN update');
          onRecalculate();
        }
        
        // Also refresh the local tax breakdown data
        setTimeout(() => {
          console.log('🔄 [HSN-UPDATE] Refreshing local tax breakdown data');
          // This will trigger the useEffect to recalculate with updated quote data
          setTaxBreakdowns([]);
        }, 50);
      } else {
        console.log(`❌ [HSN-SAVE] Save failed for item ${itemId} - updateItem returned false`);
        setItemErrors(prev => ({ ...prev, [itemId]: 'Failed to update HSN classification' }));
      }
    } catch (error) {
      console.error(`❌ [HSN-SAVE] Error updating HSN for item ${itemId}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update HSN classification';
      setItemErrors(prev => ({ ...prev, [itemId]: `HSN update failed: ${errorMessage}` }));
    } finally {
      setIsSaving(false);
    }
  };

  // Category options for dropdown
  const categoryOptions = [
    { value: 'electronics', label: 'Electronics' },
    { value: 'clothing', label: 'Clothing' },
    { value: 'books', label: 'Books' },
    { value: 'toys', label: 'Toys' },
    { value: 'accessories', label: 'Accessories' },
    { value: 'home_garden', label: 'Home & Garden' },
  ];

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
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
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

  // Timeline helper functions
  const getActionIcon = (modificationType: string) => {
    switch (modificationType) {
      case 'assign':
        return <Plus className="h-3 w-3 text-green-600" />;
      case 'change':
        return <Edit className="h-3 w-3 text-blue-600" />;
      case 'clear':
        return <Trash2 className="h-3 w-3 text-red-600" />;
      default:
        return <Edit className="h-3 w-3 text-gray-600" />;
    }
  };

  const getActionColor = (modificationType: string) => {
    switch (modificationType) {
      case 'assign':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'change':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'clear':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  // Get timeline data
  const history = unifiedDataEngine.getHSNAdminOverrideHistory(quote);

  return (
    <Card className="shadow-sm border-purple-200 bg-purple-50/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <Tags className="w-4 h-4 text-purple-600" />
            <span>HSN Tax Breakdown</span>
            {isLoading && <RefreshCw className="w-3 h-3 animate-spin" />}
          </div>
          <div className="flex items-center space-x-2">
            {summary.itemsWithHSN > 0 && (
              <Badge variant="outline" className="text-xs">
                {summary.itemsWithHSN}/{summary.totalItems} items
              </Badge>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="h-6 w-6 p-0"
            >
              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Summary View - Always Visible */}
        <div className="space-y-2 text-xs">
          {summary.itemsWithHSN === 0 ? (
            <div className="flex items-center space-x-2 text-amber-600">
              <Info className="w-4 h-4" />
              <span>No HSN codes assigned to items</span>
            </div>
          ) : (
            <>
              {/* Quick Summary */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Customs:</span>
                  <span className="font-medium text-red-600">
                    {currencyDisplay.formatSingleAmount(summary.totalCustoms, 'origin')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Local Taxes:</span>
                  <span className="font-medium text-blue-600">
                    {currencyDisplay.formatSingleAmount(summary.totalLocalTaxes, 'origin')}
                  </span>
                </div>
              </div>

              {/* Currency Conversions Applied */}
              {summary.currencyConversionsApplied > 0 && (
                <div className="flex items-center justify-between bg-blue-50 p-2 rounded">
                  <div className="flex items-center space-x-1">
                    <Scale className="w-3 h-3 text-blue-600" />
                    <span className="text-blue-700">Currency Conversions</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {summary.currencyConversionsApplied} items
                  </Badge>
                </div>
              )}

              {/* Minimum Valuation Applied */}
              {summary.itemsWithMinimumValuation > 0 && (
                <div className="flex items-center justify-between bg-amber-50 p-2 rounded">
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="w-3 h-3 text-amber-600" />
                    <span className="text-amber-700">Minimum Valuation Applied</span>
                  </div>
                  <Badge variant="destructive" className="text-xs">
                    {summary.itemsWithMinimumValuation} items
                  </Badge>
                </div>
              )}
            </>
          )}
        </div>

        {/* Expanded View */}
        {isExpanded && summary.itemsWithHSN > 0 && (
          <div className="mt-4 border-t border-purple-200 pt-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4 h-8">
                <TabsTrigger value="summary" className="text-xs">
                  Summary
                </TabsTrigger>
                <TabsTrigger value="per-item" className="text-xs">
                  Per Item
                </TabsTrigger>
                <TabsTrigger value="method" className="text-xs">
                  Method
                </TabsTrigger>
                <TabsTrigger value="timeline" className="text-xs">
                  Timeline
                </TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="mt-3 space-y-3">
                {/* Overall Confidence */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Calculation Confidence</span>
                    {getConfidenceBadge(summary.averageConfidence)}
                  </div>
                  <Progress value={summary.averageConfidence * 100} className="h-2" />
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Items Classified:</span>
                      <span className="font-medium">{summary.itemsWithHSN}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Min. Valuations:</span>
                      <span className="font-medium">{summary.itemsWithMinimumValuation}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Currency Conversions:</span>
                      <span className="font-medium">{summary.currencyConversionsApplied}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Tax Impact:</span>
                      <span className="font-medium text-purple-600">
                        {currencyDisplay.formatSingleAmount(summary.totalTaxes, 'origin')}
                      </span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="per-item" className="mt-3">
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {taxBreakdowns.map((breakdown, index) => {
                    const isUnclassified = !breakdown.hsn_code || breakdown.hsn_code.trim() === '';
                    return (
                    <div
                      key={breakdown.item_id}
                      className={`border rounded p-2 space-y-2 ${
                        isUnclassified 
                          ? 'border-amber-300 bg-amber-50' 
                          : 'border-gray-200'
                      }`}
                    >
                      {/* Item Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-medium text-gray-900 truncate">
                            {breakdown.item_name}
                          </h4>
                          {isUnclassified && (
                            <div className="flex items-center space-x-1 mt-1 p-1 bg-amber-100 rounded text-xs">
                              <AlertTriangle className="w-3 h-3 text-amber-600 flex-shrink-0" />
                              <span className="text-amber-800 font-medium">
                                HSN Code Required - Click Edit to Assign
                              </span>
                            </div>
                          )}
                          {editingItemId === breakdown.item_id ? (
                            // Edit Mode
                            <div className="space-y-2 mt-2">
                              <div className="flex items-center space-x-2">
                                <div className="w-48">
                                  <SmartHSNSearch
                                    currentHSNCode={editForm.hsn_code}
                                    productName={breakdown.item_name}
                                    onHSNSelect={(hsn) => {
                                      console.log(`🎯 [SMART-HSN] Selected: ${hsn.hsn_code} - ${hsn.display_name}`);
                                      setEditForm(prev => ({
                                        ...prev,
                                        hsn_code: hsn.hsn_code,
                                        category: hsn.category
                                      }));
                                    }}
                                    placeholder="Search HSN by product name..."
                                    size="sm"
                                  />
                                </div>
                                <Select
                                  value={editForm.category}
                                  onValueChange={(value) => setEditForm(prev => ({ ...prev, category: value }))}
                                  disabled={isLookingUpHSN}
                                >
                                  <SelectTrigger className="text-xs h-7 w-32">
                                    <SelectValue placeholder={isLookingUpHSN ? "Looking up..." : "Category"} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {categoryOptions.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              {/* Error display */}
                              {itemErrors[breakdown.item_id] && (
                                <div className="text-xs text-red-600 mt-1">
                                  {itemErrors[breakdown.item_id]}
                                </div>
                              )}
                              
                              {/* Lookup feedback */}
                              {isLookingUpHSN && (
                                <div className="text-xs text-blue-600 mt-1 flex items-center">
                                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                  Looking up HSN category...
                                </div>
                              )}
                              
                              <div className="flex items-center space-x-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleEditSave(breakdown.item_id);
                                  }}
                                  disabled={isSaving || isLookingUpHSN || !editForm.hsn_code.trim()}
                                  className="h-6 px-2 text-xs"
                                >
                                  <Save className="h-3 w-3 mr-1" />
                                  {isSaving ? 'Saving...' : isLookingUpHSN ? 'Looking up...' : 'Save'}
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleEditCancel();
                                  }}
                                  className="h-6 px-2 text-xs"
                                >
                                  <X className="h-3 w-3 mr-1" />
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            // Display Mode
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge 
                                variant={isUnclassified ? "secondary" : "outline"} 
                                className={`text-xs ${
                                  isUnclassified 
                                    ? 'bg-amber-200 text-amber-800 border-amber-300' 
                                    : ''
                                }`}
                              >
                                {isUnclassified ? 'HSN: Not Assigned' : `HSN: ${breakdown.hsn_code}`}
                              </Badge>
                              {getCategoryBadge(breakdown.category)}
                              {getValuationMethodBadge(breakdown.valuation_method)}
                              {getConfidenceBadge(breakdown.confidence_score)}
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleEditStart(breakdown.item_id, breakdown.hsn_code, breakdown.category);
                                }}
                                className="h-5 w-5 p-0 hover:bg-gray-100"
                                title="Edit HSN classification"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Enhanced Calculation Options Display */}
                      {breakdown.calculation_options ? (
                        <div className="space-y-2">
                          {/* Show Both Calculation Methods */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {/* Actual Price */}
                            <div className={`p-2 rounded border ${
                              breakdown.calculation_options.selected_method === 'actual_price' 
                                ? 'border-blue-300 bg-blue-50' 
                                : 'border-gray-200'
                            }`}>
                              <div className="font-medium text-gray-700 mb-1">
                                Actual Price
                                {breakdown.calculation_options.selected_method === 'actual_price' && (
                                  <CheckCircle className="w-3 h-3 text-green-600 inline ml-1" />
                                )}
                              </div>
                              <div className="space-y-1">
                                <div className="flex justify-between">
                                  <span>Basis:</span>
                                  <span>{breakdown.calculation_options.actual_price_calculation.basis_amount.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Customs:</span>
                                  <span className="text-red-600">{breakdown.calculation_options.actual_price_calculation.customs_amount.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between font-medium border-t pt-1">
                                  <span>Total:</span>
                                  <span className="text-blue-600">{breakdown.calculation_options.actual_price_calculation.total_tax.toLocaleString()}</span>
                                </div>
                              </div>
                            </div>

                            {/* Minimum Valuation */}
                            {breakdown.calculation_options.minimum_valuation_calculation && (
                              <div className={`p-2 rounded border ${
                                breakdown.calculation_options.selected_method === 'minimum_valuation' 
                                  ? 'border-amber-300 bg-amber-50' 
                                  : 'border-gray-200'
                              }`}>
                                <div className="font-medium text-gray-700 mb-1">
                                  Min. Valuation
                                  {breakdown.calculation_options.selected_method === 'minimum_valuation' && (
                                    <CheckCircle className="w-3 h-3 text-green-600 inline ml-1" />
                                  )}
                                </div>
                                <div className="space-y-1">
                                  <div className="flex justify-between">
                                    <span>Basis:</span>
                                    <span>{breakdown.calculation_options.minimum_valuation_calculation.basis_amount.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Customs:</span>
                                    <span className="text-red-600">{breakdown.calculation_options.minimum_valuation_calculation.customs_amount.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between font-medium border-t pt-1">
                                    <span>Total:</span>
                                    <span className="text-amber-600">{breakdown.calculation_options.minimum_valuation_calculation.total_tax.toLocaleString()}</span>
                                  </div>
                                </div>
                                <div className="text-xs text-amber-700 mt-1">
                                  {breakdown.calculation_options.minimum_valuation_calculation.currency_conversion_details}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Method Selection Indicator */}
                          <div className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded">
                            <span className="text-gray-600">Selected Method:</span>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium capitalize">
                                {breakdown.calculation_options.selected_method.replace('_', ' ')}
                              </span>
                              {breakdown.calculation_options.admin_can_override && (
                                <Badge variant="outline" className="text-xs">
                                  Can Override
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        // Legacy display for backward compatibility
                        <div>
                          {/* Valuation Details */}
                          <div className="text-xs space-y-1">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Original Price:</span>
                              <span>
                                {currencyDisplay.formatSingleAmount(
                                  breakdown.original_price_origin_currency,
                                  'origin',
                                )}
                              </span>
                            </div>

                            {breakdown.minimum_valuation_conversion && (
                              <div className="flex justify-between text-amber-700">
                                <span>Minimum Valuation:</span>
                                <span className="flex items-center space-x-1">
                                  <span>${breakdown.minimum_valuation_conversion.usd_amount}</span>
                                  <ArrowRight className="w-3 h-3" />
                                  <span>
                                    {breakdown.minimum_valuation_conversion.converted_amount}{' '}
                                    {breakdown.minimum_valuation_conversion.origin_currency}
                                  </span>
                                </span>
                              </div>
                            )}

                            <div className="flex justify-between font-medium">
                              <span className="text-gray-600">Taxable Amount:</span>
                              <span>
                                {currencyDisplay.formatSingleAmount(
                                  breakdown.taxable_amount_origin_currency,
                                  'origin',
                                )}
                              </span>
                            </div>
                          </div>

                          {/* Tax Calculations */}
                          <div className="border-t border-gray-100 pt-2 space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-600">
                                Customs ({breakdown.customs_calculation.rate_percentage}%):
                              </span>
                              <span className="text-red-600 font-medium">
                                {currencyDisplay.formatSingleAmount(
                                  breakdown.customs_calculation.amount_origin_currency,
                                  'origin',
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">
                                {breakdown.local_tax_calculation.tax_type.toUpperCase()} (
                                {breakdown.local_tax_calculation.rate_percentage}%):
                              </span>
                              <span className="text-blue-600 font-medium">
                                {currencyDisplay.formatSingleAmount(
                                  breakdown.local_tax_calculation.amount_origin_currency,
                                  'origin',
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between font-medium border-t border-gray-100 pt-1">
                              <span>Total Taxes:</span>
                              <span className="text-purple-600">
                                {currencyDisplay.formatSingleAmount(breakdown.total_taxes, 'origin')}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Warnings */}
                      {breakdown.warnings.length > 0 && (
                        <div className="bg-amber-50 p-2 rounded text-xs">
                          <div className="flex items-start space-x-1">
                            <AlertTriangle className="w-3 h-3 text-amber-600 mt-0.5 flex-shrink-0" />
                            <div className="space-y-1">
                              {breakdown.warnings.map((warning, idx) => (
                                <div key={idx} className="text-amber-700">
                                  {warning}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="method" className="mt-3">
                <DualCalculationMethodSelector
                  quoteId={quote.id}
                  originCountry={quote.origin_country}
                  destinationCountry={quote.destination_country}
                  currentMethod={quote.calculation_method_preference || 'auto'}
                  onMethodChange={handleMethodChange}
                  adminId={quote.operational_data?.admin_overrides?.[0]?.admin_id}
                  isLoading={isLoading || isCalculating}
                  className="border-0 shadow-none bg-transparent p-0"
                />
              </TabsContent>

              <TabsContent value="timeline" className="mt-3">
                {history.summary.total_modifications === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No admin HSN modifications yet</p>
                    <p className="text-xs mt-1">All HSN codes are from auto-classification or migration</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-2 bg-green-50 rounded-md border border-green-200">
                        <div className="text-lg font-semibold text-green-700">{history.summary.assignments}</div>
                        <div className="text-xs text-green-600">Assigned</div>
                      </div>
                      <div className="text-center p-2 bg-blue-50 rounded-md border border-blue-200">
                        <div className="text-lg font-semibold text-blue-700">{history.summary.changes}</div>
                        <div className="text-xs text-blue-600">Changed</div>
                      </div>
                      <div className="text-center p-2 bg-red-50 rounded-md border border-red-200">
                        <div className="text-lg font-semibold text-red-700">{history.summary.clears}</div>
                        <div className="text-xs text-red-600">Cleared</div>
                      </div>
                    </div>

                    <Separator />

                    {/* Recent Activity */}
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                        Recent Activity
                      </h4>
                      <ScrollArea className="h-40">
                        <div className="space-y-2">
                          {history.recent_activity.map((activity, index) => (
                            <div key={`${activity.timestamp}-${index}`} className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/30 transition-colors">
                              <div className={`p-1.5 rounded-full ${getActionColor(activity.modification_type)}`}>
                                {getActionIcon(activity.modification_type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-foreground leading-tight">
                                  {activity.action_description}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs py-0 px-1.5 h-4">
                                    {activity.modification_type}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {activity.time_ago}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>

                    {/* Metadata */}
                    {history.summary.last_activity && (
                      <>
                        <Separator />
                        <div className="text-xs text-muted-foreground">
                          Last admin activity: {new Date(history.summary.last_activity).toLocaleString()}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Action Buttons */}
        {summary.itemsWithHSN > 0 && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-purple-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
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

        {/* HSN Enhancement CTA for items without HSN codes */}
        {summary.itemsWithHSN < summary.totalItems && (
          <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-1">
                <Zap className="w-3 h-3 text-blue-600" />
                <span className="text-blue-700">
                  {summary.totalItems - summary.itemsWithHSN} items need HSN classification
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (onUpdateQuote) onUpdateQuote();
                }}
                className="h-6 text-xs text-blue-600 hover:text-blue-800"
              >
                Auto-classify
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CompactHSNTaxBreakdown;
