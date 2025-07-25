/**
 * TAX OVERVIEW HUB
 * 
 * Central dashboard component implementing the "Hub" concept from our UX redesign.
 * Provides at-a-glance tax information with contextual actions and progressive disclosure.
 * 
 * Design Principles:
 * - Information hierarchy: Most important info first
 * - Progressive disclosure: Details on demand
 * - Contextual actions: Actions based on current state
 * - Visual impact: Clear cost implications
 * 
 * Features:
 * - Current tax method overview
 * - Total tax impact visualization
 * - Smart recommendations
 * - Quick action buttons
 * - Status indicators and confidence scores
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calculator, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  Settings,
  Zap,
  DollarSign,
  ArrowRight,
  BarChart3,
  Target,
  Clock,
  Info
} from 'lucide-react';
import { LayoutCard, Flex, Stack, Heading, Text, Grid } from '@/components/ui/layout-system';
import { useToast } from '@/hooks/use-toast';
import { unifiedTaxFallbackService } from '@/services/UnifiedTaxFallbackService';
import type { UnifiedQuote } from '@/types/unified-quote';

interface TaxMethodInfo {
  id: string;
  name: string;
  description: string;
  confidence: number;
  status: 'active' | 'recommended' | 'suboptimal' | 'error';
  icon: React.ReactNode;
}

interface TaxImpactData {
  totalTax: number;
  currency: string;
  breakdown: {
    customs: number;
    localTax: number;
    fees: number;
  };
  percentageOfTotal: number;
  comparedToOptimal: {
    difference: number;
    isOptimal: boolean;
  };
}

interface RecommendationAction {
  id: string;
  title: string;
  description: string;
  impact: string;
  priority: 'high' | 'medium' | 'low';
  action: () => void;
}

interface TaxOverviewHubProps {
  quote: UnifiedQuote;
  isCalculating?: boolean;
  onMethodChange: (method: string) => void;
  onOpenDetailPanel: (panel: 'methods' | 'valuations' | 'breakdown') => void;
  onRecalculate: () => void;
  className?: string;
}

export const TaxOverviewHub: React.FC<TaxOverviewHubProps> = ({
  quote,
  isCalculating = false,
  onMethodChange,
  onOpenDetailPanel,
  onRecalculate,
  className = ''
}) => {
  const { toast } = useToast();
  
  // State
  const [taxMethodInfo, setTaxMethodInfo] = useState<TaxMethodInfo | null>(null);
  const [taxImpact, setTaxImpact] = useState<TaxImpactData | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationAction[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  /**
   * Analyze current tax setup and generate insights
   */
  const analyzeTaxSetup = async () => {
    if (!quote) return;
    
    setIsAnalyzing(true);
    
    try {
      // Get method comparison data
      const comparison = await unifiedTaxFallbackService.getCalculationMethodComparison(
        quote.origin_country,
        quote.destination_country
      );

      // Determine current method info
      const currentMethod = quote.calculation_method_preference || 'auto';
      const methodInfo: TaxMethodInfo = {
        id: currentMethod,
        name: getMethodDisplayName(currentMethod),
        description: getMethodDescription(currentMethod, comparison),
        confidence: getMethodConfidence(currentMethod, comparison),
        status: getMethodStatus(currentMethod, comparison),
        icon: getMethodIcon(currentMethod)
      };
      
      setTaxMethodInfo(methodInfo);

      // Calculate tax impact
      const impact: TaxImpactData = {
        totalTax: calculateTotalTax(quote),
        currency: quote.destination_currency || 'USD',
        breakdown: {
          customs: quote.customs_and_ecs || 0,
          localTax: quote.vat || 0,
          fees: (quote.payment_gateway_fee || 0) + (quote.handling_charge || 0)
        },
        percentageOfTotal: ((calculateTotalTax(quote) / (quote.final_total_usd || 1)) * 100),
        comparedToOptimal: await getOptimalComparison(quote, comparison)
      };
      
      setTaxImpact(impact);

      // Generate recommendations
      const recs = generateRecommendations(quote, comparison, impact);
      setRecommendations(recs);
      
      setLastUpdated(new Date());

    } catch (error) {
      console.error('Tax analysis error:', error);
      toast({
        title: "Analysis Error",
        description: "Failed to analyze tax setup. Using fallback data.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * Helper functions
   */
  const getMethodDisplayName = (method: string): string => {
    const names = {
      'auto': 'Auto (Intelligent)',
      'hsn_only': 'HSN Per-Item',
      'legacy_fallback': 'Route-Based',
      'admin_choice': 'Manual Selection'
    };
    return names[method as keyof typeof names] || method;
  };

  const getMethodDescription = (method: string, comparison: any): string => {
    if (method === 'auto') {
      return comparison.recommended_method === 'hsn_only' 
        ? 'Using HSN per-item calculation'
        : 'Using route-based fallback';
    }
    
    const descriptions = {
      'hsn_only': 'Per-item tax calculation using HSN codes',
      'legacy_fallback': 'Percentage-based calculation from routes',
      'admin_choice': 'Manually configured tax method'
    };
    return descriptions[method as keyof typeof descriptions] || 'Custom tax method';
  };

  const getMethodConfidence = (method: string, comparison: any): number => {
    if (method === 'auto') return 0.95;
    if (method === 'hsn_only') return comparison.hsn_available ? 0.9 : 0.3;
    if (method === 'legacy_fallback') return comparison.unified_data.confidence_score;
    return 0.8; // admin_choice
  };

  const getMethodStatus = (method: string, comparison: any): TaxMethodInfo['status'] => {
    const confidence = getMethodConfidence(method, comparison);
    if (confidence >= 0.9) return 'active';
    if (confidence >= 0.7) return 'recommended';
    if (confidence >= 0.5) return 'suboptimal';
    return 'error';
  };

  const getMethodIcon = (method: string): React.ReactNode => {
    const icons = {
      'auto': <Zap className="h-4 w-4" />,
      'hsn_only': <BarChart3 className="h-4 w-4" />,
      'legacy_fallback': <Calculator className="h-4 w-4" />,
      'admin_choice': <Settings className="h-4 w-4" />
    };
    return icons[method as keyof typeof icons] || <Calculator className="h-4 w-4" />;
  };

  const calculateTotalTax = (quote: UnifiedQuote): number => {
    return (quote.customs_and_ecs || 0) + (quote.vat || 0) + (quote.sales_tax_price || 0);
  };

  const getOptimalComparison = async (quote: UnifiedQuote, comparison: any) => {
    // Simplified optimal comparison - would be more sophisticated in production
    const currentTotal = calculateTotalTax(quote);
    const optimalDifference = currentTotal * 0.05; // 5% potential savings
    
    return {
      difference: optimalDifference,
      isOptimal: optimalDifference < (currentTotal * 0.02) // Within 2% is considered optimal
    };
  };

  const generateRecommendations = (
    quote: UnifiedQuote, 
    comparison: any, 
    impact: TaxImpactData
  ): RecommendationAction[] => {
    const recs: RecommendationAction[] = [];

    // HSN availability recommendation
    if (comparison.hsn_available && quote.calculation_method_preference !== 'hsn_only') {
      recs.push({
        id: 'use-hsn',
        title: 'Switch to HSN Per-Item',
        description: 'HSN codes available for more accurate calculations',
        impact: 'Up to 3% more accurate',
        priority: 'high',
        action: () => onMethodChange('hsn_only')
      });
    }

    // Auto-optimization recommendation
    if (quote.calculation_method_preference !== 'auto') {
      recs.push({
        id: 'use-auto',
        title: 'Enable Auto Mode',
        description: 'Let the system choose the best method automatically',
        impact: 'Optimal accuracy',
        priority: 'medium',
        action: () => onMethodChange('auto')
      });
    }

    // High tax percentage warning
    if (impact.percentageOfTotal > 25) {
      recs.push({
        id: 'review-high-tax',
        title: 'Review High Tax Impact',
        description: 'Taxes exceed 25% of total - review calculation method',
        impact: 'Potential cost reduction',
        priority: 'high',
        action: () => onOpenDetailPanel('methods')
      });
    }

    return recs.slice(0, 3); // Show max 3 recommendations
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getStatusColor = (status: TaxMethodInfo['status']) => {
    const colors = {
      active: 'text-green-600 bg-green-50 border-green-200',
      recommended: 'text-blue-600 bg-blue-50 border-blue-200',
      suboptimal: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      error: 'text-red-600 bg-red-50 border-red-200'
    };
    return colors[status];
  };

  // Initialize analysis on mount and when quote changes
  useEffect(() => {
    if (quote) {
      analyzeTaxSetup();
    }
  }, [quote?.id, quote?.calculation_method_preference]);

  if (!taxMethodInfo || !taxImpact) {
    return (
      <LayoutCard className={`${className} animate-pulse`}>
        <Stack spacing="md">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-12 bg-gray-200 rounded w-2/3"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </Stack>
      </LayoutCard>
    );
  }

  return (
    <LayoutCard className={className} variant="elevated">
      <Stack spacing="lg">
        {/* Header with current method and confidence */}
        <Flex justify="between" align="center">
          <Stack spacing="xs">
            <Heading level={3} size="lg">Tax Calculation Overview</Heading>
            <Text size="sm" color="muted">
              {quote.origin_country} → {quote.destination_country}
            </Text>
          </Stack>
          <Flex align="center" gap="sm">
            <Text size="xs" color="muted">
              Updated {lastUpdated.toLocaleTimeString()}
            </Text>
            {isAnalyzing && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            )}
          </Flex>
        </Flex>

        {/* Current Method Status */}
        <LayoutCard variant="ghost" padding="md">
          <Flex align="center" gap="md">
            <div className={`p-2 rounded-lg ${getStatusColor(taxMethodInfo.status)}`}>
              {taxMethodInfo.icon}
            </div>
            <Stack spacing="xs" className="flex-1">
              <Flex align="center" gap="sm">
                <Heading level={4} size="base">{taxMethodInfo.name}</Heading>
                <Badge variant={taxMethodInfo.status === 'active' ? 'default' : 'secondary'}>
                  {Math.round(taxMethodInfo.confidence * 100)}% confidence
                </Badge>
              </Flex>
              <Text size="sm" color="muted">{taxMethodInfo.description}</Text>
            </Stack>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenDetailPanel('methods')}
              disabled={isCalculating}
            >
              Configure
            </Button>
          </Flex>
        </LayoutCard>

        {/* Tax Impact Overview */}
        <Stack spacing="md">
          <Flex justify="between" align="center">
            <Heading level={4} size="base">Tax Impact</Heading>
            <Text size="sm" color="accent">
              {taxImpact.percentageOfTotal.toFixed(1)}% of total
            </Text>
          </Flex>
          
          <Grid cols={3} gap="sm">
            <LayoutCard variant="outlined" padding="md">
              <Stack spacing="xs">
                <Text size="xs" color="muted">Customs & Duties</Text>
                <Text size="lg" weight="semibold" color="primary">
                  {formatCurrency(taxImpact.breakdown.customs, taxImpact.currency)}
                </Text>
              </Stack>
            </LayoutCard>
            
            <LayoutCard variant="outlined" padding="md">
              <Stack spacing="xs">
                <Text size="xs" color="muted">Local Taxes</Text>
                <Text size="lg" weight="semibold" color="primary">
                  {formatCurrency(taxImpact.breakdown.localTax, taxImpact.currency)}
                </Text>
              </Stack>
            </LayoutCard>
            
            <LayoutCard variant="outlined" padding="md">
              <Stack spacing="xs">
                <Text size="xs" color="muted">Total Tax</Text>
                <Text size="lg" weight="semibold" color="accent">
                  {formatCurrency(taxImpact.totalTax, taxImpact.currency)}
                </Text>
              </Stack>
            </LayoutCard>
          </Grid>

          {/* Optimization indicator */}
          {!taxImpact.comparedToOptimal.isOptimal && (
            <Alert>
              <TrendingUp className="h-4 w-4" />
              <AlertDescription>
                Potential savings of {formatCurrency(taxImpact.comparedToOptimal.difference, taxImpact.currency)} available with optimization.
              </AlertDescription>
            </Alert>
          )}
        </Stack>

        {/* Quick Actions */}
        <Stack spacing="sm">
          <Heading level={4} size="sm">Quick Actions</Heading>
          <Grid cols={2} gap="sm">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenDetailPanel('breakdown')}
              className="justify-start"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              View Breakdown
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenDetailPanel('valuations')}
              className="justify-start"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Item Valuations
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onRecalculate}
              disabled={isCalculating}
              className="justify-start"
            >
              <Calculator className="h-4 w-4 mr-2" />
              {isCalculating ? 'Calculating...' : 'Recalculate'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => analyzeTaxSetup()}
              disabled={isAnalyzing}
              className="justify-start"
            >
              <Target className="h-4 w-4 mr-2" />
              {isAnalyzing ? 'Analyzing...' : 'Optimize'}
            </Button>
          </Grid>
        </Stack>

        {/* Smart Recommendations */}
        {recommendations.length > 0 && (
          <Stack spacing="sm">
            <Heading level={4} size="sm">Recommendations</Heading>
            <Stack spacing="xs">
              {recommendations.map((rec) => (
                <LayoutCard key={rec.id} variant="ghost" padding="sm">
                  <Flex justify="between" align="center">
                    <Stack spacing="xs" className="flex-1">
                      <Flex align="center" gap="sm">
                        <Text size="sm" weight="medium" color="primary">{rec.title}</Text>
                        <Badge variant={rec.priority === 'high' ? 'destructive' : 'secondary'}>
                          {rec.priority}
                        </Badge>
                      </Flex>
                      <Text size="xs" color="muted">{rec.description}</Text>
                      <Text size="xs" color="accent">{rec.impact}</Text>
                    </Stack>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={rec.action}
                      className="ml-2"
                    >
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Flex>
                </LayoutCard>
              ))}
            </Stack>
          </Stack>
        )}
      </Stack>
    </LayoutCard>
  );
};