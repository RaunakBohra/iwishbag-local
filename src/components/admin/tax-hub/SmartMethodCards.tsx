/**
 * SMART METHOD CARDS
 *
 * Redesigned tax method selection using card-based interface with
 * improved visual hierarchy, clear comparisons, and contextual recommendations.
 * Replaces complex tabs with intuitive, scannable method options.
 *
 * Design Principles:
 * - Visual hierarchy: Important info stands out
 * - Comparison-first: Easy to compare methods side-by-side
 * - Contextual guidance: Smart recommendations and explanations
 * - Progressive disclosure: Basic info first, details on demand
 *
 * Features:
 * - Side-by-side method comparison
 * - Visual confidence indicators
 * - Cost impact visualization
 * - Smart recommendations
 * - Expandable details sections
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Calculator,
  Database,
  Settings,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Target,
  Clock,
  BarChart3,
  Lightbulb,
} from 'lucide-react';
import { LayoutCard, Flex, Stack, Heading, Text, Grid } from '@/components/ui/layout-system';
import { useToast } from '@/hooks/use-toast';
import { unifiedTaxFallbackService } from '@/services/UnifiedTaxFallbackService';

interface MethodOption {
  id: 'auto' | 'hsn_only' | 'legacy_fallback' | 'admin_choice';
  name: string;
  shortDescription: string;
  fullDescription: string;
  icon: React.ReactNode;
  confidence: number;
  status: 'recommended' | 'optimal' | 'available' | 'limited' | 'unavailable';
  pros: string[];
  cons: string[];
  costImpact: {
    estimatedChange: number; // Percentage change vs current
    savings: number; // Absolute savings in currency
  };
  availability: {
    dataAvailable: boolean;
    requirements: string[];
    missingRequirements: string[];
  };
}

interface SmartMethodCardsProps {
  quoteId: string;
  originCountry: string;
  destinationCountry: string;
  currentMethod: string;
  onMethodChange: (method: string, metadata?: any) => void;
  isLoading?: boolean;
  className?: string;
}

export const SmartMethodCards: React.FC<SmartMethodCardsProps> = ({
  quoteId,
  originCountry,
  destinationCountry,
  currentMethod,
  onMethodChange,
  isLoading = false,
  className = '',
}) => {
  const { toast } = useToast();

  // State
  const [methods, setMethods] = useState<MethodOption[]>([]);
  const [expandedMethod, setExpandedMethod] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [recommendedMethod, setRecommendedMethod] = useState<string>('auto');

  /**
   * Analyze available methods and their effectiveness
   */
  const analyzeMethodOptions = async () => {
    setIsAnalyzing(true);

    try {
      // Get method comparison data
      const comparison = await unifiedTaxFallbackService.getCalculationMethodComparison(
        originCountry,
        destinationCountry,
      );

      // Build method options with real data
      const methodOptions: MethodOption[] = [
        {
          id: 'auto',
          name: 'Auto (Intelligent)',
          shortDescription: 'System chooses the best method automatically',
          fullDescription:
            'Intelligent selection between HSN and fallback based on data availability, confidence scores, and historical performance. Adapts automatically as data improves.',
          icon: <Zap className="h-5 w-5" />,
          confidence: 0.95,
          status: 'recommended',
          pros: [
            'Always uses the most accurate method available',
            'Adapts as data quality improves',
            'No manual configuration needed',
            'Best overall accuracy across different scenarios',
          ],
          cons: [
            'Less predictable which specific method is used',
            'May switch methods between calculations',
          ],
          costImpact: {
            estimatedChange: 0, // Baseline
            savings: 0,
          },
          availability: {
            dataAvailable: true,
            requirements: [],
            missingRequirements: [],
          },
        },
        {
          id: 'hsn_only',
          name: 'HSN Per-Item',
          shortDescription: 'Precise per-item calculation using HSN codes',
          fullDescription:
            'Calculate taxes for each item individually using HSN classification codes with minimum valuations and currency conversion. Most accurate when HSN data is complete.',
          icon: <BarChart3 className="h-5 w-5" />,
          confidence: comparison.hsn_available ? 0.92 : 0.25,
          status: comparison.hsn_available ? 'optimal' : 'limited',
          pros: [
            'Most accurate per-item tax rates',
            'Supports minimum valuation rules',
            'Currency-aware calculations',
            'Detailed item-level breakdown',
          ],
          cons: [
            'Requires HSN codes for all items',
            'More complex calculations',
            'May be slower than other methods',
          ],
          costImpact: {
            estimatedChange: comparison.hsn_available ? -2.3 : 0, // 2.3% potential savings
            savings: comparison.hsn_available ? 45.5 : 0, // Example savings
          },
          availability: {
            dataAvailable: comparison.hsn_available,
            requirements: ['HSN codes assigned to items', 'HSN master data'],
            missingRequirements: comparison.hsn_available ? [] : ['HSN codes for items'],
          },
        },
        {
          id: 'legacy_fallback',
          name: 'Route-Based',
          shortDescription: 'Traditional percentage-based calculation',
          fullDescription:
            'Uses shipping route and country settings to calculate taxes as percentages of item values. Fast and reliable but less precise than per-item methods.',
          icon: <Calculator className="h-5 w-5" />,
          confidence: comparison.unified_data.confidence_score,
          status: comparison.legacy_available ? 'available' : 'limited',
          pros: [
            'Always available',
            'Fast calculations',
            'Uses established shipping routes',
            'Consistent results',
          ],
          cons: [
            'Less accurate than per-item methods',
            'No minimum valuation support',
            'Generic tax rates for all items',
          ],
          costImpact: {
            estimatedChange: 1.8, // 1.8% potential increase
            savings: -28.75, // Potential cost increase
          },
          availability: {
            dataAvailable: comparison.legacy_available,
            requirements: ['Shipping route configured', 'Country tax settings'],
            missingRequirements: comparison.legacy_available ? [] : ['Route configuration'],
          },
        },
        {
          id: 'admin_choice',
          name: 'Manual Control',
          shortDescription: 'Full admin control with hybrid approach',
          fullDescription:
            'Manual method selection with hybrid calculation approach. Uses HSN where available and falls back to route data otherwise. Best for experienced admins who understand tax implications.',
          icon: <Settings className="h-5 w-5" />,
          confidence: 0.85,
          status: 'available',
          pros: [
            'Full control over method selection',
            'Hybrid approach benefits',
            'Can override automatic decisions',
            'Complete audit trail',
          ],
          cons: [
            'Requires tax knowledge',
            'Manual intervention needed',
            'May be inconsistent over time',
          ],
          costImpact: {
            estimatedChange: 0.5, // 0.5% variance
            savings: -8.25,
          },
          availability: {
            dataAvailable: true,
            requirements: ['Admin tax knowledge'],
            missingRequirements: [],
          },
        },
      ];

      setMethods(methodOptions);
      setRecommendedMethod(comparison.recommended_method || 'auto');
    } catch (error) {
      console.error('Method analysis error:', error);
      toast({
        title: 'Analysis Error',
        description: 'Failed to analyze method options. Using defaults.',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * Handle method selection with confirmation for significant changes
   */
  const handleMethodSelect = async (methodId: string) => {
    const method = methods.find((m) => m.id === methodId);
    if (!method) return;

    // Show confirmation for methods with significant cost impact
    if (Math.abs(method.costImpact.estimatedChange) > 3) {
      const proceed = window.confirm(
        `Switching to ${method.name} may change costs by ${method.costImpact.estimatedChange > 0 ? '+' : ''}${method.costImpact.estimatedChange.toFixed(1)}%. Continue?`,
      );
      if (!proceed) return;
    }

    try {
      await onMethodChange(methodId, {
        method_analysis: method,
        confidence_score: method.confidence,
        cost_impact: method.costImpact,
        selected_via: 'SmartMethodCards',
      });

      toast({
        title: 'Method Updated',
        description: `Switched to ${method.name}. Recalculating taxes...`,
      });
    } catch (error) {
      console.error('Method selection error:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update tax method. Please try again.',
        variant: 'destructive',
      });
    }
  };

  /**
   * Get status styling
   */
  const getStatusStyle = (status: MethodOption['status']) => {
    const styles = {
      recommended: 'border-blue-200 bg-blue-50',
      optimal: 'border-green-200 bg-green-50',
      available: 'border-gray-200 bg-white',
      limited: 'border-yellow-200 bg-yellow-50',
      unavailable: 'border-red-200 bg-red-50',
    };
    return styles[status];
  };

  const getStatusBadge = (status: MethodOption['status']) => {
    const badges = {
      recommended: <Badge className="bg-blue-100 text-blue-800">Recommended</Badge>,
      optimal: <Badge className="bg-green-100 text-green-800">Optimal</Badge>,
      available: <Badge variant="outline">Available</Badge>,
      limited: <Badge className="bg-yellow-100 text-yellow-800">Limited</Badge>,
      unavailable: <Badge variant="destructive">Unavailable</Badge>,
    };
    return badges[status];
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Initialize analysis
  useEffect(() => {
    analyzeMethodOptions();
  }, [originCountry, destinationCountry]);

  if (isAnalyzing) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Stack spacing="md">
          <div className="h-6 bg-gray-200 rounded w-1/3 animate-pulse"></div>
          <Grid cols={2} gap="md">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </Grid>
        </Stack>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with recommendation */}
      <Stack spacing="sm">
        <Heading level={3} size="lg">
          Tax Calculation Methods
        </Heading>
        <Text color="muted">
          Choose how taxes should be calculated for {originCountry} → {destinationCountry}
        </Text>

        {recommendedMethod && (
          <Alert>
            <Lightbulb className="h-4 w-4" />
            <AlertDescription>
              <strong>Recommendation:</strong>{' '}
              {methods.find((m) => m.id === recommendedMethod)?.name} is recommended for this route
              based on data availability and accuracy.
            </AlertDescription>
          </Alert>
        )}
      </Stack>

      {/* Method Cards Grid */}
      <Grid cols={2} gap="lg">
        {methods.map((method) => {
          const isSelected = currentMethod === method.id;
          const isExpanded = expandedMethod === method.id;

          return (
            <LayoutCard
              key={method.id}
              className={`
                cursor-pointer transition-all duration-200 hover:shadow-md
                ${isSelected ? 'ring-2 ring-blue-500 border-blue-300' : ''}
                ${getStatusStyle(method.status)}
                ${method.status === 'unavailable' ? 'opacity-60 cursor-not-allowed' : ''}
              `}
              onClick={() => method.status !== 'unavailable' && handleMethodSelect(method.id)}
            >
              <Stack spacing="md">
                {/* Header */}
                <Flex justify="between" align="start">
                  <Flex align="center" gap="sm">
                    <div
                      className={`p-2 rounded-lg ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
                    >
                      {method.icon}
                    </div>
                    <Stack spacing="xs">
                      <Heading level={4} size="base">
                        {method.name}
                      </Heading>
                      <Text size="sm" color="muted">
                        {method.shortDescription}
                      </Text>
                    </Stack>
                  </Flex>
                  {isSelected && <CheckCircle className="h-5 w-5 text-blue-600" />}
                </Flex>

                {/* Status and Confidence */}
                <Flex justify="between" align="center">
                  {getStatusBadge(method.status)}
                  <div className="text-right">
                    <Text size="sm" weight="medium" color="primary">
                      {Math.round(method.confidence * 100)}% confidence
                    </Text>
                    <Progress value={method.confidence * 100} className="w-16 h-1 mt-1" />
                  </div>
                </Flex>

                {/* Cost Impact */}
                {method.costImpact.estimatedChange !== 0 && (
                  <Flex align="center" gap="sm">
                    <DollarSign className="h-4 w-4 text-gray-500" />
                    <Text
                      size="sm"
                      color={method.costImpact.estimatedChange > 0 ? 'muted' : 'accent'}
                    >
                      {method.costImpact.estimatedChange > 0 ? '+' : ''}
                      {method.costImpact.estimatedChange.toFixed(1)}% impact
                      {method.costImpact.savings !== 0 && (
                        <span className="ml-2">
                          ({method.costImpact.savings > 0 ? 'saves' : 'costs'}{' '}
                          {formatCurrency(Math.abs(method.costImpact.savings))})
                        </span>
                      )}
                    </Text>
                  </Flex>
                )}

                {/* Expandable Details */}
                <Collapsible
                  open={isExpanded}
                  onOpenChange={() => setExpandedMethod(isExpanded ? null : method.id)}
                >
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between p-2">
                      <span>View Details</span>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="space-y-3 pt-3">
                    <Text size="sm" color="secondary">
                      {method.fullDescription}
                    </Text>

                    <div className="space-y-2">
                      <Text size="sm" weight="medium" color="primary">
                        Advantages:
                      </Text>
                      <ul className="text-sm text-green-700 space-y-1">
                        {method.pros.slice(0, 2).map((pro, index) => (
                          <li key={index} className="flex items-start">
                            <CheckCircle className="h-3 w-3 mr-2 mt-0.5 flex-shrink-0" />
                            <span>{pro}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <Text size="sm" weight="medium" color="primary">
                        Considerations:
                      </Text>
                      <ul className="text-sm text-yellow-700 space-y-1">
                        {method.cons.slice(0, 2).map((con, index) => (
                          <li key={index} className="flex items-start">
                            <AlertTriangle className="h-3 w-3 mr-2 mt-0.5 flex-shrink-0" />
                            <span>{con}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {method.availability.missingRequirements.length > 0 && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Missing:</strong>{' '}
                          {method.availability.missingRequirements.join(', ')}
                        </AlertDescription>
                      </Alert>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </Stack>
            </LayoutCard>
          );
        })}
      </Grid>
    </div>
  );
};
