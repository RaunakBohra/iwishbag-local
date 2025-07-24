// ============================================================================
// TAX CALCULATION SIDEBAR - Comprehensive Tax Transparency and HSN Visibility
// Features: HSN classification status, calculation method transparency, quick actions
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
  className?: string;
}

export const TaxCalculationSidebar: React.FC<TaxCalculationSidebarProps> = ({
  quote,
  isCalculating = false,
  onRecalculate,
  onUpdateQuote,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isExpanded, setIsExpanded] = useState(true);
  const [showDetailedView, setShowDetailedView] = useState(false);
  const [taxBreakdowns, setTaxBreakdowns] = useState<ItemTaxBreakdown[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        // First enhance quote with HSN data
        const enhanced = await unifiedDataEngine.enhanceQuoteWithHSNData(quote);

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
    const itemsWithHSN = quote.items?.filter(item => item.hsn_code)?.length || 0;
    const itemsWithoutHSN = totalItems - itemsWithHSN;
    
    // HSN Classification Status
    const classificationProgress = totalItems > 0 ? (itemsWithHSN / totalItems) * 100 : 0;
    
    // Tax Calculation Method Analysis
    const calculationMethod = quote.calculation_method_preference || 'auto';
    const isUsingHSNMethod = calculationMethod === 'hsn_based' || (calculationMethod === 'auto' && itemsWithHSN > 0);
    
    // Tax Breakdown Analysis
    let totalCustoms = 0;
    let totalLocalTaxes = 0;
    let minValuationItems = 0;
    let highConfidenceItems = 0;
    
    taxBreakdowns.forEach(breakdown => {
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
      itemsWithHSN,
      itemsWithoutHSN,
      classificationProgress,
      calculationMethod,
      isUsingHSNMethod,
      totalCustoms,
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
    const { calculationMethod, isUsingHSNMethod, hsnSourcedTaxes, fallbackTaxes } = taxAnalytics;
    
    if (calculationMethod === 'hsn_based') {
      return {
        method: 'HSN-Based',
        status: hsnSourcedTaxes > 0 ? 'active' : 'insufficient_data',
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
        status: isUsingHSNMethod ? 'partial' : 'fallback',
        description: `HSN: ${hsnSourcedTaxes} items, Country: ${fallbackTaxes} items`,
        icon: Calculator,
        color: isUsingHSNMethod ? 'text-purple-600' : 'text-amber-600',
        bgColor: isUsingHSNMethod ? 'bg-purple-50' : 'bg-amber-50',
        borderColor: isUsingHSNMethod ? 'border-purple-200' : 'border-amber-200',
      };
    }
  };

  const methodStatus = getCalculationMethodStatus();

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Tax Status Card */}
      <Card className="border-indigo-200 bg-indigo-50/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-base">
              <Calculator className="w-4 h-4 mr-2 text-indigo-600" />
              Tax Calculation
              {isLoading && <RefreshCw className="w-3 h-3 ml-2 animate-spin" />}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-6 w-6 p-0"
            >
              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Calculation Method Status */}
          <div className={`p-3 rounded-lg border ${methodStatus.borderColor} ${methodStatus.bgColor}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <methodStatus.icon className={`w-4 h-4 ${methodStatus.color}`} />
                <span className={`font-medium text-sm ${methodStatus.color}`}>
                  {methodStatus.method}
                </span>
              </div>
              <Badge variant="outline" className="text-xs">
                {methodStatus.status}
              </Badge>
            </div>
            <p className="text-xs text-gray-600">{methodStatus.description}</p>
          </div>

          {/* HSN Classification Progress */}
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

          {/* Tax Totals Summary */}
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="text-center p-2 bg-red-50 rounded border border-red-200">
              <div className="font-semibold text-red-700">
                {currencyDisplay.formatSingleAmount(taxAnalytics.totalCustoms, 'origin')}
              </div>
              <div className="text-red-600">Customs</div>
            </div>
            <div className="text-center p-2 bg-blue-50 rounded border border-blue-200">
              <div className="font-semibold text-blue-700">
                {currencyDisplay.formatSingleAmount(taxAnalytics.totalLocalTaxes, 'origin')}
              </div>
              <div className="text-blue-600">{taxAnalytics.primaryTaxType}</div>
            </div>
          </div>

          {/* Warning for Missing HSN Classifications */}
          {taxAnalytics.itemsWithoutHSN > 0 && (
            <Alert className="mt-4 border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>{taxAnalytics.itemsWithoutHSN} items</strong> need HSN classification for 
                accurate tax calculations. Using country defaults as fallback.
              </AlertDescription>
            </Alert>
          )}

          {/* Expanded Details */}
          {isExpanded && (
            <div className="mt-4">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 h-8">
                  <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                  <TabsTrigger value="items" className="text-xs">Items</TabsTrigger>
                  <TabsTrigger value="methods" className="text-xs">Methods</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-3 space-y-3">
                  {/* Tax Source Breakdown */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                      Tax Data Sources
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 bg-green-50 border border-green-200 rounded text-center">
                        <div className="text-sm font-semibold text-green-700">
                          {taxAnalytics.hsnSourcedTaxes}
                        </div>
                        <div className="text-xs text-green-600">HSN Master</div>
                      </div>
                      <div className="p-2 bg-blue-50 border border-blue-200 rounded text-center">
                        <div className="text-sm font-semibold text-blue-700">
                          {taxAnalytics.fallbackTaxes}
                        </div>
                        <div className="text-xs text-blue-600">Country Default</div>
                      </div>
                    </div>
                  </div>

                  {/* Calculation Quality Indicators */}
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
                            hasHSN 
                              ? 'border-green-200 bg-green-50' 
                              : 'border-amber-200 bg-amber-50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium truncate flex-1 mr-2">
                              {item.name}
                            </span>
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
                              <Badge variant="secondary" className="text-xs px-1 py-0 bg-amber-200 text-amber-800">
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
                  {/* Current Method Display */}
                  <div className="p-3 bg-gray-50 rounded border">
                    <div className="text-xs font-medium text-gray-700 mb-2">Active Method</div>
                    <div className="flex items-center space-x-2">
                      <methodStatus.icon className={`w-4 h-4 ${methodStatus.color}`} />
                      <span className="font-medium">{methodStatus.method}</span>
                    </div>
                  </div>

                  {/* Method Options */}
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-gray-700">Available Methods</div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between p-2 border rounded text-xs">
                        <div className="flex items-center space-x-2">
                          <Tags className="w-3 h-3 text-green-600" />
                          <span>HSN-Based</span>
                        </div>
                        <Badge variant={taxAnalytics.calculationMethod === 'hsn_based' ? 'default' : 'outline'} className="text-xs">
                          {taxAnalytics.hsnSourcedTaxes} items
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 border rounded text-xs">
                        <div className="flex items-center space-x-2">
                          <Globe className="w-3 h-3 text-blue-600" />
                          <span>Country Default</span>
                        </div>
                        <Badge variant={taxAnalytics.calculationMethod === 'country_settings' ? 'default' : 'outline'} className="text-xs">
                          All items
                        </Badge>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* Quick Actions */}
          <div className="mt-4 pt-3 border-t border-indigo-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {taxAnalytics.itemsWithoutHSN > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onUpdateQuote}
                  className="text-xs h-7"
                >
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
          <AlertDescription className="text-sm">
            Tax calculation error: {error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default TaxCalculationSidebar;