/**
 * HSN-Enhanced Quote Interface
 * Real-time HSN-based tax calculations without page refresh
 * Integrates government APIs, automatic classification, and per-item calculations
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Calculator,
  Truck,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Package,
  DollarSign,
  Edit,
  Save,
  Wifi,
  WifiOff,
  Database,
  Clock,
  Target,
  BarChart3,
  Settings,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// HSN-specific imports
import {
  useHSNQuoteCalculation,
  useHSNLiveCalculation,
  useHSNSystemStatus,
  useHSNPerformanceStats,
  useHSNOptimisticUpdates,
} from '@/hooks/useHSNQuoteCalculation';
import {
  hsnQuoteIntegrationService,
  HSNRealTimeOptions,
} from '@/services/HSNQuoteIntegrationService';
import { unifiedDataEngine } from '@/services/UnifiedDataEngine';
import type { UnifiedQuote, QuoteItem } from '@/types/unified-quote';

// Enhanced components
import { HSNItemBreakdownCard } from './hsn-components/HSNItemBreakdownCard';
import { HSNSystemStatusCard } from './hsn-components/HSNSystemStatusCard';
import { HSNPerformanceMetrics } from './hsn-components/HSNPerformanceMetrics';
import { HSNRealTimeControls } from './hsn-components/HSNRealTimeControls';
import { HSNTaxComparisonView } from './hsn-components/HSNTaxComparisonView';

interface HSNEnhancedQuoteInterfaceProps {
  initialQuoteId?: string;
  enableRealTime?: boolean;
  showAdvancedFeatures?: boolean;
}

export const HSNEnhancedQuoteInterface: React.FC<HSNEnhancedQuoteInterfaceProps> = ({
  initialQuoteId,
  enableRealTime = true,
  showAdvancedFeatures = true,
}) => {
  const { id: paramId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Core state
  const quoteId = initialQuoteId || paramId;
  const [activeTab, setActiveTab] = useState('overview');
  const [hsnOptions, setHSNOptions] = useState<HSNRealTimeOptions>({
    enableGovernmentAPIs: enableRealTime,
    enableAutoClassification: true,
    enableWeightDetection: true,
    enableMinimumValuation: true,
    updateFrequency: 'immediate',
    cacheDuration: 15 * 60 * 1000,
  });

  // Load quote data with React Query
  const {
    data: quote,
    isLoading: isLoadingQuote,
    error: quoteError,
    refetch: refetchQuote,
  } = useQuery({
    queryKey: ['hsn-enhanced-quote', quoteId],
    queryFn: async () => {
      if (!quoteId) throw new Error('No quote ID provided');
      const quoteData = await unifiedDataEngine.getQuote(quoteId, true);
      if (!quoteData) throw new Error('Quote not found');
      return quoteData;
    },
    enabled: !!quoteId,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // HSN-based calculation with real-time updates
  const {
    calculation,
    quote: calculatedQuote,
    itemBreakdowns,
    realTimeUpdates,
    isLoading: isCalculating,
    isError: hasCalculationError,
    error: calculationError,
    liveSyncCalculation,
    recalculate,
    isRecalculating,
    invalidate,
  } = useHSNQuoteCalculation(quote, hsnOptions);

  // Live calculation for real-time editing
  const { updateCalculation } = useHSNLiveCalculation(quote, hsnOptions);

  // System monitoring
  const { data: systemStatus } = useHSNSystemStatus();
  const { data: performanceStats } = useHSNPerformanceStats();

  // Optimistic updates for instant UI feedback
  const { updateQuoteOptimistically } = useHSNOptimisticUpdates(quoteId || '');

  // Handle real-time quote updates
  const handleQuoteUpdate = useCallback(
    (updates: Partial<UnifiedQuote>) => {
      if (!quote) return;

      const updatedQuote = { ...quote, ...updates };

      if (enableRealTime) {
        // Optimistic update for instant feedback
        const rollback = updateQuoteOptimistically(updates);

        // Then perform real-time calculation
        setTimeout(() => {
          updateCalculation(updatedQuote);
        }, 100);
      }
    },
    [quote, enableRealTime, updateQuoteOptimistically, updateCalculation],
  );

  // Handle HSN options changes
  const handleOptionsChange = useCallback(
    (newOptions: Partial<HSNRealTimeOptions>) => {
      setHSNOptions((prev) => ({ ...prev, ...newOptions }));

      if (quote) {
        // Trigger recalculation with new options
        recalculate(newOptions);
      }
    },
    [quote, recalculate],
  );

  // Manual recalculation
  const handleManualRecalculation = useCallback(() => {
    console.log('🔄 [HSN-INTERFACE] Manual recalculation triggered');
    invalidate();
    refetchQuote();
  }, [invalidate, refetchQuote]);

  // Calculate performance indicators
  const performanceIndicators = useMemo(() => {
    if (!realTimeUpdates || !performanceStats) return null;

    return {
      apiEfficiency:
        (realTimeUpdates.cacheHits / (realTimeUpdates.apiCallsMade + realTimeUpdates.cacheHits)) *
        100,
      classificationSuccess:
        (realTimeUpdates.hsnCodesClassified / (quote?.items.length || 1)) * 100,
      realTimeStatus: realTimeUpdates.taxRatesUpdated ? 'live' : 'cached',
      systemHealth: systemStatus?.overall_status || 'unknown',
    };
  }, [realTimeUpdates, performanceStats, systemStatus, quote]);

  // Error handling
  useEffect(() => {
    if (hasCalculationError && calculationError) {
      toast({
        title: 'HSN Calculation Error',
        description: 'Using cached tax rates. Real-time rates temporarily unavailable.',
        variant: 'destructive',
      });
    }
  }, [hasCalculationError, calculationError, toast]);

  // Loading state
  if (isLoadingQuote) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Loading HSN-enhanced quote...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (quoteError) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-12">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Failed to load quote: {(quoteError as Error).message}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">Quote not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const finalQuote = calculatedQuote || quote;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header with HSN status */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">HSN-Enhanced Quote #{finalQuote.id}</h1>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>
              {finalQuote.origin_country} → {finalQuote.destination_country}
            </span>
            {performanceIndicators && (
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    performanceIndicators.systemHealth === 'healthy' ? 'default' : 'destructive'
                  }
                >
                  {performanceIndicators.realTimeStatus === 'live' ? (
                    <Wifi className="h-3 w-3 mr-1" />
                  ) : (
                    <Database className="h-3 w-3 mr-1" />
                  )}
                  {performanceIndicators.realTimeStatus}
                </Badge>
                <span>{Math.round(performanceIndicators.classificationSuccess)}% classified</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRecalculation}
            disabled={isCalculating || isRecalculating}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isCalculating || isRecalculating ? 'animate-spin' : ''}`}
            />
            {isCalculating || isRecalculating ? 'Calculating...' : 'Recalculate'}
          </Button>

          {enableRealTime && (
            <Badge variant={hsnOptions.enableGovernmentAPIs ? 'default' : 'secondary'}>
              <Zap className="h-3 w-3 mr-1" />
              Real-time {hsnOptions.enableGovernmentAPIs ? 'ON' : 'OFF'}
            </Badge>
          )}
        </div>
      </div>

      {/* Progress indicator for calculations */}
      {(isCalculating || isRecalculating) && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Calculator className="h-4 w-4 animate-pulse text-blue-500" />
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span>Calculating HSN-based taxes...</span>
                  <span>
                    {realTimeUpdates ? `${realTimeUpdates.hsnCodesClassified} items processed` : ''}
                  </span>
                </div>
                <Progress
                  value={
                    realTimeUpdates
                      ? (realTimeUpdates.hsnCodesClassified / finalQuote.items.length) * 100
                      : 50
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main interface tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="items">Items & HSN</TabsTrigger>
          <TabsTrigger value="taxes">Tax Breakdown</TabsTrigger>
          <TabsTrigger value="system">System Status</TabsTrigger>
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quote Summary */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Quote Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Items Total</p>
                    <p className="text-2xl font-bold">
                      ${finalQuote.calculation_data?.breakdown?.items_total?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Final Total</p>
                    <p className="text-2xl font-bold text-green-600">
                      ${finalQuote.final_total_usd?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">HSN Classifications</p>
                    <p className="text-lg font-semibold">
                      {realTimeUpdates?.hsnCodesClassified || 0} / {finalQuote.items.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Tax Method</p>
                    <Badge variant="outline">Per-Item HSN</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {performanceIndicators && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm">API Efficiency</span>
                      <span className="text-sm font-medium">
                        {Math.round(performanceIndicators.apiEfficiency)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Classification</span>
                      <span className="text-sm font-medium">
                        {Math.round(performanceIndicators.classificationSuccess)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">System Health</span>
                      <Badge
                        variant={
                          performanceIndicators.systemHealth === 'healthy'
                            ? 'default'
                            : 'destructive'
                        }
                        className="text-xs"
                      >
                        {performanceIndicators.systemHealth}
                      </Badge>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Real-time Controls */}
          {enableRealTime && (
            <HSNRealTimeControls
              options={hsnOptions}
              onOptionsChange={handleOptionsChange}
              systemStatus={systemStatus}
              isCalculating={isCalculating}
            />
          )}
        </TabsContent>

        {/* Items & HSN Tab */}
        <TabsContent value="items" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Items with HSN Classifications
              </CardTitle>
              <CardDescription>
                Automatic HSN code detection and per-item tax calculations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {itemBreakdowns.map((breakdown, index) => (
                  <HSNItemBreakdownCard
                    key={breakdown.itemId}
                    breakdown={breakdown}
                    onUpdate={(updates) => {
                      // Handle item-level updates
                      const updatedItems = finalQuote.items.map((item) =>
                        item.id === breakdown.itemId ? { ...item, ...updates } : item,
                      );
                      handleQuoteUpdate({ items: updatedItems });
                    }}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tax Breakdown Tab */}
        <TabsContent value="taxes" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>HSN-Based Tax Calculation</CardTitle>
              </CardHeader>
              <CardContent>
                {calculation?.quote.calculation_data?.hsn_breakdown && (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Total Customs Duty</span>
                      <span className="font-medium">
                        $
                        {calculation.quote.calculation_data.hsn_breakdown.total_customs_duty.toFixed(
                          2,
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Local Tax</span>
                      <span className="font-medium">
                        $
                        {calculation.quote.calculation_data.hsn_breakdown.total_local_tax.toFixed(
                          2,
                        )}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Total Tax Amount</span>
                      <span>
                        $
                        {calculation.quote.calculation_data.hsn_breakdown.total_tax_amount.toFixed(
                          2,
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Classification Confidence</span>
                      <span>
                        {Math.round(
                          calculation.quote.calculation_data.hsn_breakdown
                            .classification_confidence * 100,
                        )}
                        %
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Government API Status</CardTitle>
              </CardHeader>
              <CardContent>
                {systemStatus && (
                  <HSNSystemStatusCard
                    systemStatus={systemStatus}
                    showDetails={showAdvancedFeatures}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* System Status Tab */}
        <TabsContent value="system" className="space-y-6">
          {showAdvancedFeatures && (
            <>
              <HSNPerformanceMetrics
                performanceStats={performanceStats}
                realTimeUpdates={realTimeUpdates}
              />

              {systemStatus && (
                <HSNSystemStatusCard systemStatus={systemStatus} showDetails={true} />
              )}
            </>
          )}
        </TabsContent>

        {/* Comparison Tab */}
        <TabsContent value="comparison" className="space-y-6">
          <HSNTaxComparisonView
            quote={finalQuote}
            itemBreakdowns={itemBreakdowns}
            showLegacyComparison={showAdvancedFeatures}
          />
        </TabsContent>
      </Tabs>

      {/* Real-time status footer */}
      {enableRealTime && realTimeUpdates && (
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Last updated: {new Date().toLocaleTimeString()}
                </span>
                <span className="flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  API calls: {realTimeUpdates.apiCallsMade} | Cache hits:{' '}
                  {realTimeUpdates.cacheHits}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={realTimeUpdates.taxRatesUpdated ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {realTimeUpdates.taxRatesUpdated ? 'Live rates' : 'Cached rates'}
                </Badge>
                {realTimeUpdates.weightDetected && (
                  <Badge variant="outline" className="text-xs">
                    Weight auto-detected
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
