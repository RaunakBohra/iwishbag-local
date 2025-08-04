/**
 * Smart Customs Preview Component - Phase 3
 * 
 * Shows intelligent customs rate preview based on HSN code and country.
 * Integrates with ProductIntelligenceService for accurate rate calculation.
 */

import React, { useState, useEffect } from 'react';
import { Control, useWatch } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Calculator,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Info,
  Globe,
  Percent,
  DollarSign,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { productIntelligenceService, type ProductSuggestion } from '@/services/ProductIntelligenceService';

interface CustomsCalculation {
  base_rate: number;
  gst_rate?: number;
  total_rate: number;
  exemptions: string[];
  calculation_basis: 'product_price' | 'minimum_valuation';
  minimum_valuation_usd?: number;
  confidence_score: number;
}

interface SmartCustomsPreviewProps {
  control: Control<any>;
  index: number;
  countryCode?: string;
  originCurrency?: string;
  className?: string;
}

export const SmartCustomsPreview: React.FC<SmartCustomsPreviewProps> = ({
  control,
  index,
  countryCode = 'IN',
  originCurrency = 'USD',
  className,
}) => {
  const [customsCalculation, setCustomsCalculation] = useState<CustomsCalculation | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Watch relevant fields
  const hsnCode = useWatch({
    control,
    name: `items.${index}.hsnCode`,
  });

  const productName = useWatch({
    control,
    name: `items.${index}.productName`,
  });

  const costPrice = useWatch({
    control,
    name: `items.${index}.costprice_origin`,
  });

  const category = useWatch({
    control,
    name: `items.${index}.category`,
  });

  // Calculate customs when HSN code or price changes
  useEffect(() => {
    if (hsnCode && costPrice) {
      calculateCustomsRate();
    } else {
      setCustomsCalculation(null);
    }
  }, [hsnCode, costPrice, productName, category]);

  const calculateCustomsRate = async () => {
    if (!hsnCode || !costPrice) return;

    setIsCalculating(true);
    setError(null);

    try {
      // Get product classification data
      const suggestions = await productIntelligenceService.getSmartSuggestions(
        productName || 'product',
        countryCode,
        category,
        1
      );

      const matchingSuggestion = suggestions.find(
        s => s.classification_code === hsnCode
      );

      if (matchingSuggestion && matchingSuggestion.customs_rate !== undefined) {
        const price = parseFloat(costPrice);
        const baseRate = matchingSuggestion.customs_rate;
        
        // Determine valuation method and amount
        const hasMinimumValuation = matchingSuggestion.minimum_valuation_usd && matchingSuggestion.minimum_valuation_usd > 0;
        const minimumValuation = matchingSuggestion.minimum_valuation_usd || 0;
        const useMinimumValuation = hasMinimumValuation && (
          matchingSuggestion.valuation_method === 'minimum_valuation' || 
          price < minimumValuation
        );
        
        const valuationAmount = useMinimumValuation ? minimumValuation : price;
        const valuationBasis = useMinimumValuation ? 'minimum_valuation' : 'product_price';
        
        // Calculate GST for India
        let gstRate = 0;
        if (countryCode === 'IN') {
          gstRate = getGSTRate(matchingSuggestion.category);
        }

        const calculation: CustomsCalculation = {
          base_rate: baseRate,
          gst_rate: gstRate,
          total_rate: baseRate + gstRate,
          exemptions: [],
          calculation_basis: valuationBasis,
          minimum_valuation_usd: hasMinimumValuation ? minimumValuation : undefined,
          confidence_score: matchingSuggestion.confidence_score,
        };

        setCustomsCalculation(calculation);
      } else {
        // Fallback calculation
        setCustomsCalculation({
          base_rate: 10, // Default rate
          gst_rate: countryCode === 'IN' ? 18 : undefined,
          total_rate: countryCode === 'IN' ? 28 : 10,
          exemptions: [],
          calculation_basis: 'product_price',
          confidence_score: 0.5,
        });
      }
    } catch (error) {
      console.error('Customs calculation error:', error);
      setError('Unable to calculate customs rate');
    } finally {
      setIsCalculating(false);
    }
  };

  const getGSTRate = (category: string): number => {
    const gstRates: Record<string, number> = {
      'electronics': 18,
      'clothing': 12,
      'books': 5,
      'food': 5,
      'medical': 5,
      'home_living': 18,
      'toys': 12,
    };

    return gstRates[category] || 18; // Default to 18%
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return CheckCircle;
    if (confidence >= 0.6) return AlertTriangle;
    return AlertTriangle;
  };

  const formatCurrency = (amount: number, currency?: string) => {
    // Try to determine the origin currency from the form context
    // For now, default to USD but this should be enhanced to get actual origin currency
    const defaultCurrency = currency || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: defaultCurrency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const calculateCustomsAmount = (rate: number) => {
    if (!costPrice || !customsCalculation) return 0;
    
    // Use the correct valuation amount (minimum valuation or product price)
    const price = parseFloat(costPrice);
    const valuationAmount = customsCalculation.calculation_basis === 'minimum_valuation' 
      ? (customsCalculation.minimum_valuation_usd || price)
      : price;
      
    return (valuationAmount * rate) / 100;
  };

  if (!hsnCode) {
    return (
      <Alert className={cn("border-gray-200", className)}>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Enter an HSN code to see customs rate preview
        </AlertDescription>
      </Alert>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className={cn("border-blue-200", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calculator className="h-4 w-4 text-blue-600" />
            <span>Customs Preview</span>
            <Badge variant="outline" className="text-xs">
              <Globe className="h-3 w-3 mr-1" />
              {countryCode}
            </Badge>
          </div>
          {isCalculating && (
            <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {customsCalculation ? (
          <>
            {/* Valuation Method Info */}
            {customsCalculation.calculation_basis === 'minimum_valuation' && customsCalculation.minimum_valuation_usd && (
              <Alert className="border-orange-200 bg-orange-50 mb-3">
                <Info className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800 text-xs">
                  <div className="space-y-1">
                    <p className="font-medium">Minimum Valuation Applied</p>
                    <p>
                      Customs calculated on {formatCurrency(customsCalculation.minimum_valuation_usd, originCurrency)} minimum valuation 
                      {costPrice && parseFloat(costPrice) < customsCalculation.minimum_valuation_usd 
                        ? ` (product price ${formatCurrency(parseFloat(costPrice), originCurrency)} is below minimum)`
                        : ' (classification requires minimum valuation)'}
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Rate Breakdown */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Customs Duty</span>
                <div className="flex items-center space-x-2">
                  <span className="font-medium">{customsCalculation.base_rate}%</span>
                  {costPrice && (
                    <span className="text-xs text-muted-foreground">
                      {formatCurrency(calculateCustomsAmount(customsCalculation.base_rate), originCurrency)}
                    </span>
                  )}
                </div>
              </div>

              {customsCalculation.gst_rate && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">GST</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{customsCalculation.gst_rate}%</span>
                    {costPrice && (
                      <span className="text-xs text-muted-foreground">
                        {formatCurrency(calculateCustomsAmount(customsCalculation.gst_rate), originCurrency)}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="border-t pt-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Tax Rate</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-lg">{customsCalculation.total_rate}%</span>
                    {costPrice && (
                      <span className="text-sm font-medium text-blue-600">
                        {formatCurrency(calculateCustomsAmount(customsCalculation.total_rate), originCurrency)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Confidence Indicator */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center space-x-2">
                {React.createElement(
                  getConfidenceIcon(customsCalculation.confidence_score),
                  { className: cn("h-4 w-4", getConfidenceColor(customsCalculation.confidence_score)) }
                )}
                <span className="text-sm text-muted-foreground">Confidence</span>
              </div>
              <Badge 
                variant="outline"
                className={cn(
                  "text-xs",
                  customsCalculation.confidence_score >= 0.8 
                    ? "border-green-200 text-green-700" 
                    : customsCalculation.confidence_score >= 0.6
                    ? "border-yellow-200 text-yellow-700"
                    : "border-red-200 text-red-700"
                )}
              >
                {Math.round(customsCalculation.confidence_score * 100)}%
              </Badge>
            </div>

            {/* Low Confidence Warning */}
            {customsCalculation.confidence_score < 0.7 && (
              <Alert variant="default" className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800 text-xs">
                  Low confidence rate. Consider manual verification for accuracy.
                </AlertDescription>
              </Alert>
            )}

            {/* Exemptions */}
            {customsCalculation.exemptions.length > 0 && (
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Exemptions:</span>
                <div className="flex flex-wrap gap-1">
                  {customsCalculation.exemptions.map((exemption, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {exemption}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-4">
            <div className="text-sm text-muted-foreground">
              Enter product price to calculate customs
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};