// ============================================================================
// TAX CALCULATION SIDEBAR - Comprehensive Tax Transparency and calculation method transparency, quick actions
// Replaces scattered tax info with consolidated always-visible panel
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Calculator,
  Tags,
  AlertTriangle,
  CheckCircle,
  Info,
  Zap,
  TrendingUp,
  Scale,
  Globe,
  Building2,
  Home,
  RefreshCw,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Settings,
  Target,
  BarChart3,
  DollarSign,
} from 'lucide-react';
import type { UnifiedQuote } from '@/types/unified-quote';
import { useAdminQuoteCurrency } from '@/hooks/useAdminQuoteCurrency';
import PerItemTaxCalculator from '@/services/PerItemTaxCalculator';
import type { ItemTaxBreakdown } from '@/services/PerItemTaxCalculator';
import { unifiedDataEngine } from '@/services/UnifiedDataEngine';

interface TaxCalculationSidebarProps {
  quote: UnifiedQuote;
  isCalculating?: boolean;
  onRecalculate?: () => void;
  onUpdateQuote?: () => void;
  editMode?: boolean;
  currentMethod?: string;
  onMethodChange?: (method: string, metadata?: any) => void;
  onValuationChange?: (itemId: string, method: string, amount?: number) => void;
  className?: string;
}

export const TaxCalculationSidebar: React.FC<TaxCalculationSidebarProps> = ({
  quote,
  isCalculating = false,
  onRecalculate,
  onUpdateQuote,
  editMode = false,
  currentMethod,
  onMethodChange,
  onValuationChange,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isExpanded, setIsExpanded] = useState(true);
  const [showDetailedView, setShowDetailedView] = useState(false);
  const [taxBreakdowns, setTaxBreakdowns] = useState<ItemTaxBreakdown[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isChangingMethod, setIsChangingMethod] = useState(false);

  // Get standardized currency display info
  const currencyDisplay = useAdminQuoteCurrency(quote);
  const taxCalculator = PerItemTaxCalculator.getInstance();

  // Calculate tax breakdowns on quote changes
  useEffect(() => {
    const calculateItemTaxes = async () => {
      if (!quote?.items?.length) {
        setTaxBreakdowns([]);
        return;
      }

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

        // Convert items to calculator format
        const calculatorItems = itemsWithname: item.name,
          price_origin_currency: item.costprice_origin,
          weight: item.weight,
          hsn_code: item.hsn_code,
          category: item.category,
          url: item.url,
          quantity: item.quantity || 1,
        }));

        const breakdowns = await taxCalculator.calculateMultipleItemTaxes(calculatorItems, context);
        setTaxBreakdowns(breakdowns);
      } catch (error) {
        console.error('Tax calculation error:', error);
        setError(error instanceof Error ? error.message : 'Failed to calculate taxes');
      } finally {
        setIsLoading(false);
      }
    };

    calculateItemTaxes();
  }, [quote, taxCalculator]);

  // Calculate comprehensive tax analytics
  const taxAnalytics = useMemo(() => {
    const totalItems = quote.items?.length || 0;
    const itemsWithHSN = quote.items?.filter((item) => item.hsn_code)?.length || 0;
    const itemsWithoutHSN = totalItems - itemsWithHSN;

    
    const classificationProgress = totalItems > 0 ? (itemsWithHSN / totalItems) * 100 : 0;

    // Tax Calculation Method Analysis
    const calculationMethod = currentMethod || quote.calculation_method_preference || 'auto';
    const isUsingHSNMethod =
      calculationMethod === 'hsn_based' || (calculationMethod === 'auto' && itemsWithHSN > 0);

    console.log(
      `📊 [TaxAnalytics] Current method: ${calculationMethod}, Quote ID: ${quote.id}, Items: ${totalItems}}`,
    );

    // Tax Breakdown Analysis
    let totalCustoms = 0;
    let totalLocalTaxes = 0;
    let minValuationItems = 0;
    let highConfidenceItems = 0;

    taxBreakdowns.forEach((breakdown) => {
      totalCustoms += breakdown.total_customs;
      totalLocalTaxes += breakdown.total_local_taxes;
      if (breakdown.valuation_method === 'minimum_valuation') minValuationItems++;
      if (breakdown.confidence_score >= 0.8) highConfidenceItems++;
    });

    // Country-specific tax analysis
    const destinationCountry = quote.destination_country;
    let primaryTaxType = 'VAT';
    if (destinationCountry === 'US') primaryTaxType = 'Sales Tax';
    else if (destinationCountry === 'IN') primaryTaxType = 'GST';
    else if (destinationCountry === 'CA') primaryTaxType = 'GST/PST';

    return {
      totalItems,
      itemsWithitemsWithoutclassificationProgress,
      calculationMethod,
      isUsingtotalCustoms,
      totalLocalTaxes,
      totalTaxes: totalCustoms + totalLocalTaxes,
      minValuationItems,
      highConfidenceItems,
      primaryTaxType,
      destinationCountry,
      // Tax source transparency
      hsnSourcedTaxes: taxBreakdowns.length,
      fallbackTaxes: totalItems - taxBreakdowns.length,
    };
  }, [quote, taxBreakdowns]);

  // Get calculation method status
  const getCalculationMethodStatus = () => {
    const { calculationMethod, isUsinghsnSourcedTaxes, fallbackTaxes } = taxAnalytics;

    if (calculationMethod === 'hsn_based') {
      return {
        method: 'status: hsnSourcedTaxes > 0 ? 'active' : 'insufficient_data',
        description: `Using HSN master data for ${hsnSourcedTaxes} items`,
        icon: Tags,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
      };
    } else if (calculationMethod === 'country_settings') {
      return {
        method: 'Country Default',
        status: 'active',
        description: `Using country settings for all ${taxAnalytics.totalItems} items`,
        icon: Globe,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
      };
    } else {
      return {
        method: 'Auto (Hybrid)',
        status: isUsingdescription: `HSN: ${hsnSourcedTaxes} items, Country: ${fallbackTaxes} items`,
        icon: Calculator,
        color: isUsingbgColor: isUsingborderColor: isUsing};
    }
  };

  const methodStatus = getCalculationMethodStatus();

  // Handle tax method change with bulletproof form submission prevention
  const handleTaxMethodChange = async (newMethod: string, event?: React.MouseEvent) => {
    // CRITICAL: Prevent page refresh and event bubbling with all safeguards
    if (event) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      // Extra safeguard: if this event is somehow connected to a form, prevent submission
      const target = event.target as HTMLElement;
      const form = target.closest('form');
      if (form) {
        console.log('🚫 [TaxMethodChange] Preventing form submission from event chain');
      }
    }

    console.log(`🎯 [TaxSidebar] Method change requested: ${newMethod}`);

    if (onMethodChange) {
      try {
        setIsChangingMethod(true);
        await onMethodChange(newMethod);
        console.log(`✅ [TaxSidebar] Method change completed: ${newMethod}`);

        // Force recalculation after method change
        if (onRecalculate) {
          setTimeout(() => {
            console.log(`🔄 [TaxSidebar] Triggering recalculation after method change`);
            onRecalculate();
            setIsChangingMethod(false);
          }, 1000); // Delay to ensure quote data is updated and recalculation completes
        } else {
          setIsChangingMethod(false);
        }
      } catch (error) {
        console.error(`❌ [TaxSidebar] Method change failed:`, error);
        setIsChangingMethod(false);
      }
    }
  };

  // Industry-Standard Edit Mode Interface - NO NESTED FORMS
  if (editMode) {
    return (
      <div className={`space-y-4 ${className}`}>
        {}
              <button
                type="button"
                className={`w-full p-3 rounded-lg border transition-all text-left ${
                  isChangingMethod
                    ? 'cursor-not-allowed opacity-50 border-gray-200'
                    : taxAnalytics.calculationMethod === 'hsn_based'
                      ? 'border-green-300 bg-green-50 ring-2 ring-green-200 cursor-pointer'
                      : 'border-gray-200 hover:border-green-300 hover:bg-green-50/50 cursor-pointer'
                }`}
                onClick={(e) => {
                  console.log('🚫 [Button] preventing default behavior');
                  e.preventDefault();
                  e.stopPropagation();
                  e.stopImmediatePropagation();
                  // Prevent any form submission
                  if (e.currentTarget.form) {
                    console.log('🚫 [Button] Preventing form submission');
                    return false;
                  }
                  if (!isChangingMethod) {
                    console.log('✅ [Button] e);
                  } else {
                    console.log('⏳ [Button] HSN-Based blocked - method change in progress');
                  }
                  return false; // Explicitly prevent form submission
                }}
                disabled={isChangingMethod}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        taxAnalytics.calculationMethod === 'hsn_based'
                          ? 'border-green-600 bg-green-600'
                          : 'border-gray-300'
                      }`}
                    >
                      {taxAnalytics.calculationMethod === 'hsn_based' && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <Tags className="w-4 h-4 text-green-600" />
                        <span className="font-medium text-gray-900">HSN-Based</span>
                        {taxAnalytics.hsnSourcedTaxes > 0 && (
                          <Badge variant="default" className="text-xs bg-green-600">
                            Recommended
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        Uses precise HSN master data for accurate tax calculations
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-green-700">
                      {taxAnalytics.hsnSourcedTaxes} items
                    </div>
                    <div className="text-xs text-gray-500">classified</div>
                  </div>
                </div>
              </button>

              {}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">HSN Classification Progress</span>
                <span className="font-medium">
                  {taxAnalytics.itemsWithHSN}/{taxAnalytics.totalItems} items
                </span>
              </div>
              <Progress value={taxAnalytics.classificationProgress} className="h-2" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {taxAnalytics.classificationProgress.toFixed(0)}% complete
                </span>
                {taxAnalytics.itemsWithoutHSN > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onUpdateQuote}
                    className="text-xs h-6 text-blue-600 hover:text-blue-800"
                  >
                    <Zap className="w-3 h-3 mr-1" />
                    Auto-classify {taxAnalytics.itemsWithoutHSN} items
                  </Button>
                )}
              </div>
            </div>

            {}
            {taxAnalytics.itemsWithoutHSN > 0 && (
              <Alert className="border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>{taxAnalytics.itemsWithoutHSN} items</strong> need HSN classification for
                  optimal tax accuracy.
                  <Button
                    variant="link"
                    className="h-auto p-0 ml-1 text-amber-700 hover:text-amber-900"
                    onClick={onUpdateQuote}
                  >
                    Auto-classify now →
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">HSN Classification</span>
              <span className="font-medium">
                {taxAnalytics.itemsWithHSN}/{taxAnalytics.totalItems} items
              </span>
            </div>
            <Progress value={taxAnalytics.classificationProgress} className="h-2" />
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{taxAnalytics.classificationProgress.toFixed(0)}% classified</span>
              {taxAnalytics.itemsWithoutHSN > 0 && (
                <span className="text-amber-600">
                  {taxAnalytics.itemsWithoutHSN} missing HSN codes
                </span>
              )}
            </div>
          </div>

          {}
          {taxAnalytics.itemsWithoutHSN > 0 && (
            <Alert className="mt-4 border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>{taxAnalytics.itemsWithoutHSN} items</strong> need HSN classification for
                accurate tax calculations. Using country defaults as fallback.
              </AlertDescription>
            </Alert>
          )}

          {}
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                      Calculation Quality
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">High Confidence:</span>
                        <span className="font-medium">
                          {taxAnalytics.highConfidenceItems}/{taxAnalytics.hsnSourcedTaxes} items
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">Min. Valuation Applied:</span>
                        <span className="font-medium text-amber-600">
                          {taxAnalytics.minValuationItems} items
                        </span>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="items" className="mt-3">
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {quote.items?.map((item, index) => {
                      const hasHSN = !!item.hsn_code;
                      return (
                        <div
                          key={item.id || index}
                          className={`p-2 rounded border text-xs ${
                            hasHSN ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium truncate flex-1 mr-2">{item.name}</span>
                            {hasHSN ? (
                              <CheckCircle className="w-3 h-3 text-green-600 flex-shrink-0" />
                            ) : (
                              <AlertTriangle className="w-3 h-3 text-amber-600 flex-shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            {hasHSN ? (
                              <>
                                <Badge variant="outline" className="text-xs px-1 py-0">
                                  HSN: {item.hsn_code}
                                </Badge>
                                {item.category && (
                                  <Badge variant="secondary" className="text-xs px-1 py-0">
                                    {item.category}
                                  </Badge>
                                )}
                              </>
                            ) : (
                              <Badge
                                variant="secondary"
                                className="text-xs px-1 py-0 bg-amber-200 text-amber-800"
                              >
                                No HSN Code
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>

                <TabsContent value="methods" className="mt-3 space-y-3">
                  {}
          <div className="mt-4 pt-3 border-t border-indigo-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {taxAnalytics.itemsWithoutHSN > 0 && (
                <Button size="sm" variant="outline" onClick={onUpdateQuote} className="text-xs h-7">
                  <Zap className="w-3 h-3 mr-1" />
                  Auto-classify
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={onRecalculate}
                disabled={isLoading || isCalculating}
                className="text-xs h-7"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Recalculate
              </Button>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowDetailedView(!showDetailedView)}
              className="text-xs h-7"
            >
              {showDetailedView ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">Tax calculation error: {error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default TaxCalculationSidebar;
