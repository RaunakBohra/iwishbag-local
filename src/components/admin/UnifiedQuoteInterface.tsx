// ============================================================================
// UNIFIED QUOTE INTERFACE - Smart 400-line replacement for 1,457-line monster
// Features: Multiple shipping options, smart suggestions, real-time optimization
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Calculator, 
  Truck, 
  Zap, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Package,
  Clock,
  DollarSign
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { unifiedDataEngine } from '@/services/UnifiedDataEngine';
import { smartCalculationEngine } from '@/services/SmartCalculationEngine';
import type { 
  UnifiedQuote, 
  ShippingOption, 
  ShippingRecommendation,
  SmartSuggestion 
} from '@/types/unified-quote';

// Smart sub-components
import { SmartItemsManager } from './smart-components/SmartItemsManager';
import { SmartShippingOptions } from './smart-components/SmartShippingOptions';
import { SmartCalculationBreakdown } from './smart-components/SmartCalculationBreakdown';
import { SmartSuggestionCards } from './smart-components/SmartSuggestionCards';
import { SmartCustomerInfo } from './smart-components/SmartCustomerInfo';
import { SmartStatusManager } from './smart-components/SmartStatusManager';

interface UnifiedQuoteInterfaceProps {
  initialQuoteId?: string;
}

export const UnifiedQuoteInterface: React.FC<UnifiedQuoteInterfaceProps> = ({
  initialQuoteId
}) => {
  const { id: paramId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Core state
  const quoteId = initialQuoteId || paramId;
  const [quote, setQuote] = useState<UnifiedQuote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  
  // Smart features state
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [shippingRecommendations, setShippingRecommendations] = useState<ShippingRecommendation[]>([]);
  const [smartSuggestions, setSmartSuggestions] = useState<SmartSuggestion[]>([]);
  const [optimizationScore, setOptimizationScore] = useState(0);
  
  // UI state
  const [activeTab, setActiveTab] = useState('overview');
  const [showAllShippingOptions, setShowAllShippingOptions] = useState(false);

  // Load quote data
  useEffect(() => {
    if (!quoteId) {
      setIsLoading(false);
      return;
    }

    loadQuoteData();
  }, [quoteId]);

  const loadQuoteData = async () => {
    try {
      setIsLoading(true);
      const quoteData = await unifiedDataEngine.getQuote(quoteId!);
      
      if (!quoteData) {
        toast({
          title: 'Quote not found',
          description: 'The requested quote could not be found.',
          variant: 'destructive',
        });
        navigate('/admin/quotes');
        return;
      }

      setQuote(quoteData);
      
      // Calculate smart features
      await calculateSmartFeatures(quoteData);
      
    } catch (error) {
      console.error('Error loading quote:', error);
      toast({
        title: 'Error',
        description: 'Failed to load quote data.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateSmartFeatures = async (quoteData: UnifiedQuote) => {
    try {
      setIsCalculating(true);
      
      const result = await smartCalculationEngine.calculateWithShippingOptions({
        quote: quoteData,
        preferences: {
          speed_priority: 'medium',
          cost_priority: 'medium',
          show_all_options: showAllShippingOptions,
        },
      });

      if (result.success) {
        setQuote(result.updated_quote);
        setShippingOptions(result.shipping_options);
        setShippingRecommendations(result.smart_recommendations);
        setSmartSuggestions(result.optimization_suggestions);
        setOptimizationScore(result.updated_quote.optimization_score);
      }
    } catch (error) {
      console.error('Error calculating smart features:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleShippingOptionSelect = async (optionId: string) => {
    if (!quote) return;

    const updatedOperationalData = {
      ...quote.operational_data,
      shipping: {
        ...quote.operational_data.shipping,
        selected_option: optionId,
      },
    };

    const success = await unifiedDataEngine.updateQuote(quote.id, {
      operational_data: updatedOperationalData,
    });

    if (success) {
      await loadQuoteData(); // Refresh with new calculations
      toast({
        title: 'Shipping updated',
        description: 'Quote recalculated with new shipping option.',
      });
    }
  };

  const handleApplySuggestion = async (suggestion: SmartSuggestion) => {
    if (!quote) return;

    // Handle different suggestion types
    if (suggestion.type === 'shipping' && suggestion.action === 'switch_shipping') {
      // Extract option ID from suggestion
      const recommendedOption = shippingRecommendations.find(rec => 
        suggestion.message.includes(rec.reason)
      );
      if (recommendedOption) {
        await handleShippingOptionSelect(recommendedOption.option_id);
      }
    }

    // Remove applied suggestion
    const updatedSuggestions = smartSuggestions.filter(s => s.id !== suggestion.id);
    setSmartSuggestions(updatedSuggestions);
  };

  // Smart metrics calculation
  const metrics = useMemo(() => {
    if (!quote) return null;

    const breakdown = quote.calculation_data.breakdown;
    const totalItems = quote.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalWeight = quote.items.reduce((sum, item) => sum + (item.weight_kg * item.quantity), 0);
    const avgWeightConfidence = quote.items.reduce((sum, item) => sum + item.smart_data.weight_confidence, 0) / quote.items.length;

    return {
      totalItems,
      totalWeight: totalWeight.toFixed(2),
      avgWeightConfidence: (avgWeightConfidence * 100).toFixed(0),
      shippingPercentage: ((breakdown.shipping / quote.final_total_usd) * 100).toFixed(1),
      customsPercentage: ((breakdown.customs / quote.final_total_usd) * 100).toFixed(1),
    };
  }, [quote]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading smart quote interface...</p>
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="text-center py-12">
        <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Quote not found</h3>
        <p className="text-gray-600">The requested quote could not be loaded.</p>
        <Button onClick={() => navigate('/admin/quotes')} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Quotes
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Smart Header with Key Metrics */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/admin/quotes')}
            className="p-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Quote {quote.display_id}
            </h1>
            <div className="flex items-center space-x-4 mt-1">
              <SmartStatusManager quote={quote} onStatusUpdate={loadQuoteData} />
              <Badge variant="outline" className="flex items-center">
                <TrendingUp className="w-3 h-3 mr-1" />
                {optimizationScore.toFixed(0)}% Optimized
              </Badge>
              {isCalculating && (
                <Badge variant="secondary" className="flex items-center">
                  <Calculator className="w-3 h-3 mr-1 animate-spin" />
                  Calculating...
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">
            ${quote.final_total_usd.toFixed(2)}
          </div>
          <div className="text-sm text-gray-600">
            {metrics?.totalItems} items • {metrics?.totalWeight} kg
          </div>
        </div>
      </div>

      {/* Smart Suggestions Bar */}
      {smartSuggestions.length > 0 && (
        <SmartSuggestionCards
          suggestions={smartSuggestions}
          onApplySuggestion={handleApplySuggestion}
        />
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="items">Smart Items</TabsTrigger>
          <TabsTrigger value="shipping">Shipping Options</TabsTrigger>
          <TabsTrigger value="customer">Customer</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Smart Calculation Breakdown */}
            <SmartCalculationBreakdown
              quote={quote}
              shippingOptions={shippingOptions}
              isCalculating={isCalculating}
            />

            {/* Key Metrics Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="w-5 h-5 mr-2 text-yellow-500" />
                  Smart Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Weight Confidence</div>
                    <div className="text-xl font-semibold">
                      {metrics?.avgWeightConfidence}%
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Shipping Cost</div>
                    <div className="text-xl font-semibold">
                      {metrics?.shippingPercentage}%
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Customs Duty</div>
                    <div className="text-xl font-semibold">
                      {metrics?.customsPercentage}%
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Options Available</div>
                    <div className="text-xl font-semibold">
                      {shippingOptions.length}
                    </div>
                  </div>
                </div>

                {shippingRecommendations.length > 0 && (
                  <div className="pt-4 border-t">
                    <div className="text-sm font-medium text-gray-900 mb-2">
                      Top Recommendation
                    </div>
                    <div className="flex items-center text-sm text-green-600">
                      <Lightbulb className="w-4 h-4 mr-1" />
                      {shippingRecommendations[0].reason === 'cost_savings' && 
                        `Save $${shippingRecommendations[0].savings_usd.toFixed(2)} with slower shipping`
                      }
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Smart Items Tab */}
        <TabsContent value="items">
          <SmartItemsManager
            quote={quote}
            onUpdateQuote={loadQuoteData}
          />
        </TabsContent>

        {/* Shipping Options Tab */}
        <TabsContent value="shipping">
          <SmartShippingOptions
            quote={quote}
            shippingOptions={shippingOptions}
            recommendations={shippingRecommendations}
            onSelectOption={handleShippingOptionSelect}
            showAllOptions={showAllShippingOptions}
            onToggleShowAll={setShowAllShippingOptions}
          />
        </TabsContent>

        {/* Customer Tab */}
        <TabsContent value="customer">
          <SmartCustomerInfo
            quote={quote}
            onUpdateQuote={loadQuoteData}
          />
        </TabsContent>
      </Tabs>

      {/* Quick Actions Footer */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => calculateSmartFeatures(quote)}
                disabled={isCalculating}
                className="flex items-center"
              >
                <Calculator className="w-4 h-4 mr-2" />
                {isCalculating ? 'Calculating...' : 'Recalculate'}
              </Button>
              
              <Button variant="outline" className="flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                Timeline
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              <Button variant="outline">Save</Button>
              <Button>Send to Customer</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UnifiedQuoteInterface;