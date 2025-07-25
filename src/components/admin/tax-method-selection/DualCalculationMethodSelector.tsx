/**
 * DUAL CALCULATION METHOD SELECTOR
 * 
 * Admin interface component for selecting between different tax calculation methods
 * in the 2-tier tax system. Provides visual comparison, confidence indicators,
 * and intelligent recommendations.
 * 
 * Features:
 * - Visual method comparison with pros/cons
 * - Real-time confidence scoring
 * - Admin override tracking and audit logging
 * - Integration with UnifiedTaxFallbackService
 * - Method-specific configuration options
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calculator, 
  Database, 
  Settings, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  Info,
  Clock,
  Users
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { unifiedTaxFallbackService } from '@/services/UnifiedTaxFallbackService';

interface CalculationMethod {
  id: 'auto' | 'hsn_only' | 'legacy_fallback' | 'admin_choice';
  name: string;
  description: string;
  icon: React.ReactNode;
  pros: string[];
  cons: string[];
  confidence: number;
  recommended: boolean;
  requiresConfiguration?: boolean;
  configurationStatus?: 'complete' | 'partial' | 'missing';
}

interface DualCalculationMethodSelectorProps {
  quoteId: string;
  originCountry: string;
  destinationCountry: string;
  currentMethod?: string;
  onMethodChange: (method: string, metadata?: any) => void;
  adminId?: string;
  isLoading?: boolean;
  className?: string;
}

export const DualCalculationMethodSelector: React.FC<DualCalculationMethodSelectorProps> = ({
  quoteId,
  originCountry,
  destinationCountry,
  currentMethod = 'auto',
  onMethodChange,
  adminId,
  isLoading = false,
  className = ''
}) => {
  const { toast } = useToast();
  const [selectedMethod, setSelectedMethod] = useState<string>(currentMethod);
  const [methodAnalysis, setMethodAnalysis] = useState<any>(null);
  const [hsnAvailability, setHSNAvailability] = useState<boolean>(false);
  const [routeDataAvailability, setRouteDataAvailability] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Define available calculation methods with dynamic data
  const [calculationMethods, setCalculationMethods] = useState<CalculationMethod[]>([
    {
      id: 'auto',
      name: 'Auto (Recommended)',
      description: 'Intelligent selection between HSN and fallback based on data availability and confidence',
      icon: <TrendingUp className="h-5 w-5" />,
      pros: [
        'Automatically chooses best method',
        'Adapts to data availability',
        'Highest overall accuracy',
        'No admin intervention needed'
      ],
      cons: [
        'Less predictable method selection',
        'May switch methods between calculations'
      ],
      confidence: 0.95,
      recommended: true
    },
    {
      id: 'hsn_only',
      name: 'HSN Only',
      description: 'Per-item tax calculation using HSN codes with minimum valuations and currency conversion',
      icon: <Database className="h-5 w-5" />,
      pros: [
        'Most accurate per-item taxes',
        'Supports minimum valuations',
        'Currency-aware calculations',
        'Detailed item breakdowns'
      ],
      cons: [
        'Requires HSN codes for all items',
        'More complex calculations',
        'May fail if HSN data missing'
      ],
      confidence: 0.0, // Will be updated dynamically
      recommended: false,
      requiresConfiguration: true,
      configurationStatus: 'missing'
    },
    {
      id: 'legacy_fallback',
      name: 'Legacy Fallback',
      description: 'Traditional percentage-based calculation using route and country settings',
      icon: <Calculator className="h-5 w-5" />,
      pros: [
        'Always available',
        'Fast calculations',
        'Uses established shipping routes',
        'Reliable for percentage-based taxes'
      ],
      cons: [
        'Less accurate than per-item',
        'No minimum valuation support',
        'Generic tax rates'
      ],
      confidence: 0.0, // Will be updated dynamically
      recommended: false,
      requiresConfiguration: true,
      configurationStatus: 'missing'
    },
    {
      id: 'admin_choice',
      name: 'Admin Choice',
      description: 'Manual selection with hybrid approach - uses HSN where available, fallback otherwise',
      icon: <Settings className="h-5 w-5" />,
      pros: [
        'Full admin control',
        'Hybrid approach benefits',
        'Can override auto selection',
        'Audit trail for decisions'
      ],
      cons: [
        'Requires manual intervention',
        'Admin must understand implications',
        'May be inconsistent over time'
      ],
      confidence: 0.8,
      recommended: false,
      requiresConfiguration: false
    }
  ]);

  /**
   * Analyze method availability and update confidence scores
   */
  const analyzeMethodAvailability = async () => {
    if (!quoteId) return;

    setIsAnalyzing(true);
    
    try {
      // Get method comparison from UnifiedTaxFallbackService
      const comparison = await unifiedTaxFallbackService.getCalculationMethodComparison(
        originCountry,
        destinationCountry
      );

      setMethodAnalysis(comparison);
      setHSNAvailability(comparison.hsn_available);
      setRouteDataAvailability(comparison.legacy_available);

      // Update method confidence scores and status
      setCalculationMethods(prev => prev.map(method => {
        switch (method.id) {
          case 'auto':
            return {
              ...method,
              confidence: 0.95,
              recommended: true
            };
          case 'hsn_only':
            return {
              ...method,
              confidence: comparison.hsn_available ? 0.9 : 0.2,
              configurationStatus: comparison.hsn_available ? 'complete' : 'missing',
              recommended: comparison.recommended_method === 'hsn_only'
            };
          case 'legacy_fallback':
            return {
              ...method,
              confidence: comparison.unified_data.confidence_score,
              configurationStatus: comparison.legacy_available ? 'complete' : 'partial',
              recommended: comparison.recommended_method === 'legacy_fallback'
            };
          default:
            return method;
        }
      }));

      setLastUpdated(new Date());

    } catch (error) {
      console.error('Error analyzing method availability:', error);
      toast({
        title: "Analysis Error",
        description: "Failed to analyze calculation methods. Using default settings.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * Handle method selection with audit logging
   */
  const handleMethodSelection = async (methodId: string) => {
    if (isLoading || isAnalyzing) return;

    const previousMethod = selectedMethod;
    setSelectedMethod(methodId);

    try {
      // Log the method change for audit purposes
      if (adminId && previousMethod !== methodId) {
        const { error } = await supabase
          .rpc('log_tax_method_change', {
            p_quote_id: quoteId,
            p_admin_id: adminId,
            p_calculation_method: methodId,
            p_valuation_method: 'auto', // Will be set by valuation selector
            p_change_reason: `Admin selected ${methodId} method via DualCalculationMethodSelector`,
            p_change_details: {
              previous_method: previousMethod,
              route: `${originCountry} → ${destinationCountry}`,
              method_analysis: methodAnalysis,
              timestamp: new Date().toISOString(),
              ui_component: 'DualCalculationMethodSelector'
            }
          });

        if (error) {
          console.warn('Failed to log method change:', error);
        }
      }

      // Update quote with new method preference
      const { error: updateError } = await supabase
        .from('quotes')
        .update({ 
          calculation_method_preference: methodId,
          updated_at: new Date().toISOString()
        })
        .eq('id', quoteId);

      if (updateError) {
        throw updateError;
      }

      // Notify parent component
      onMethodChange(methodId, {
        previousMethod,
        methodAnalysis,
        confidence: calculationMethods.find(m => m.id === methodId)?.confidence || 0.5,
        timestamp: new Date().toISOString()
      });

      toast({
        title: "Method Updated",
        description: `Tax calculation method changed to ${calculationMethods.find(m => m.id === methodId)?.name}`,
      });

    } catch (error) {
      console.error('Error updating calculation method:', error);
      
      // Revert selection on error
      setSelectedMethod(previousMethod);
      
      toast({
        title: "Update Failed",
        description: "Failed to update calculation method. Please try again.",
        variant: "destructive"
      });
    }
  };

  /**
   * Get confidence color for visual indicators
   */
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  /**
   * Get configuration status badge
   */
  const getConfigurationBadge = (method: CalculationMethod) => {
    if (!method.requiresConfiguration) return null;

    const statusConfig = {
      complete: { variant: 'default' as const, text: 'Ready' },
      partial: { variant: 'secondary' as const, text: 'Partial' },
      missing: { variant: 'destructive' as const, text: 'Setup Required' }
    };

    const config = statusConfig[method.configurationStatus || 'missing'];
    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  // Initialize analysis on component mount
  useEffect(() => {
    analyzeMethodAvailability();
  }, [quoteId, originCountry, destinationCountry]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with status */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Tax Calculation Method
          </h3>
          <p className="text-sm text-gray-600">
            Select how taxes should be calculated for {originCountry} → {destinationCountry}
          </p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Clock className="h-4 w-4" />
          <span>Updated {lastUpdated.toLocaleTimeString()}</span>
          {isAnalyzing && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          )}
        </div>
      </div>

      {/* Method Analysis Alert */}
      {methodAnalysis && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <div className="font-medium">Route Analysis Results:</div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">HSN Data:</span>{' '}
                  {hsnAvailability ? (
                    <span className="text-green-600">Available ✓</span>
                  ) : (
                    <span className="text-red-600">Not Available ✗</span>
                  )}
                </div>
                <div>
                  <span className="font-medium">Route Data:</span>{' '}
                  {routeDataAvailability ? (
                    <span className="text-green-600">Available ✓</span>
                  ) : (
                    <span className="text-yellow-600">Partial</span>
                  )}
                </div>
              </div>
              <div className="text-sm">
                <span className="font-medium">Recommended:</span>{' '}
                <Badge variant="outline">
                  {calculationMethods.find(m => m.recommended)?.name || 'Auto'}
                </Badge>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Method Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {calculationMethods.map((method) => (
          <Card 
            key={method.id}
            className={`cursor-pointer transition-all duration-200 ${
              selectedMethod === method.id
                ? 'ring-2 ring-primary border-primary bg-primary/5'
                : 'hover:shadow-md hover:border-gray-300'
            } ${isLoading || isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => handleMethodSelection(method.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    selectedMethod === method.id ? 'bg-primary text-white' : 'bg-gray-100'
                  }`}>
                    {method.icon}
                  </div>
                  <div>
                    <CardTitle className="text-base flex items-center space-x-2">
                      <span>{method.name}</span>
                      {method.recommended && (
                        <Badge variant="default" className="text-xs">Recommended</Badge>
                      )}
                    </CardTitle>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`text-sm font-medium ${getConfidenceColor(method.confidence)}`}>
                        {Math.round(method.confidence * 100)}% confidence
                      </span>
                      {getConfigurationBadge(method)}
                    </div>
                  </div>
                </div>
                {selectedMethod === method.id && (
                  <CheckCircle className="h-5 w-5 text-primary" />
                )}
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <p className="text-sm text-gray-600 mb-3">
                {method.description}
              </p>

              <div className="space-y-3">
                {method.pros.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-green-700 mb-1">
                      Advantages:
                    </div>
                    <ul className="text-xs text-green-600 space-y-1">
                      {method.pros.slice(0, 2).map((pro, index) => (
                        <li key={index} className="flex items-start">
                          <span className="mr-1">•</span>
                          <span>{pro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {method.cons.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-red-700 mb-1">
                      Considerations:
                    </div>
                    <ul className="text-xs text-red-600 space-y-1">
                      {method.cons.slice(0, 2).map((con, index) => (
                        <li key={index} className="flex items-start">
                          <span className="mr-1">•</span>
                          <span>{con}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={analyzeMethodAvailability}
          disabled={isAnalyzing}
          className="flex items-center space-x-2"
        >
          <TrendingUp className="h-4 w-4" />
          <span>{isAnalyzing ? 'Analyzing...' : 'Refresh Analysis'}</span>
        </Button>

        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Users className="h-4 w-4" />
          <span>
            {adminId ? 'Admin Override' : 'System Selection'}
          </span>
        </div>
      </div>

      {/* Method-specific warnings */}
      {selectedMethod === 'hsn_only' && !hsnAvailability && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            HSN data is not available for this route. The system will automatically fall back to legacy calculation.
            Consider setting up HSN codes for items or using Auto method for intelligent selection.
          </AlertDescription>
        </Alert>
      )}

      {selectedMethod === 'legacy_fallback' && methodAnalysis?.unified_data.confidence_score < 0.7 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Legacy fallback has low confidence ({Math.round(methodAnalysis.unified_data.confidence_score * 100)}%) 
            for this route. Consider configuring specific shipping routes or using Auto method.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};