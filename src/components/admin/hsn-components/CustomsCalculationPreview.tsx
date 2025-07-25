// ============================================================================
// CUSTOMS CALCULATION PREVIEW - Real-time Minimum vs Actual Customs Display
// Features: Dual calculation display, currency conversion, method selection
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calculator, 
  DollarSign, 
  TrendingUp, 
  ArrowRight, 
  AlertTriangle,
  CheckCircle,
  Info,
} from 'lucide-react';
import CurrencyConversionService from '@/services/CurrencyConversionService';

interface CustomsCalculation {
  method: 'actual_price' | 'minimum_valuation';
  basisAmount: number;
  basisCurrency: string;
  customsRate: number;
  customsAmount: number;
  localTaxAmount: number;
  totalTax: number;
  conversionDetails?: string;
}

interface CustomsCalculationPreviewProps {
  productPrice: number;
  quantity: number;
  hsnCode?: string;
  category?: string;
  minimumValuationUSD?: number;
  originCountry: string;
  destinationCountry: string;
  onCalculationUpdate?: (calculation: CustomsCalculation) => void;
}

export const CustomsCalculationPreview: React.FC<CustomsCalculationPreviewProps> = ({
  productPrice,
  quantity,
  hsnCode,
  category,
  minimumValuationUSD,
  originCountry,
  destinationCountry,
  onCalculationUpdate,
}) => {
  const [calculations, setCalculations] = useState<{
    actualPrice: CustomsCalculation | null;
    minimumValuation: CustomsCalculation | null;
    selected: 'actual_price' | 'minimum_valuation';
  }>({
    actualPrice: null,
    minimumValuation: null,
    selected: 'actual_price',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currencyService = CurrencyConversionService.getInstance();

  // Calculate customs when inputs change
  useEffect(() => {
    if (productPrice > 0 && quantity > 0 && hsnCode) {
      calculateCustoms();
    }
  }, [productPrice, quantity, hsnCode, category, minimumValuationUSD, originCountry, destinationCountry]);

  const calculateCustoms = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const totalValue = productPrice * quantity;
      
      // Get typical tax rates for the category (simplified for demo)
      const taxRates = getTaxRates(category || 'general', destinationCountry);
      
      // Calculate actual price method
      const actualPriceCalculation: CustomsCalculation = {
        method: 'actual_price',
        basisAmount: totalValue,
        basisCurrency: 'USD',
        customsRate: taxRates.customs,
        customsAmount: totalValue * (taxRates.customs / 100),
        localTaxAmount: totalValue * (taxRates.localTax / 100),
        totalTax: totalValue * ((taxRates.customs + taxRates.localTax) / 100),
      };

      let minimumValuationCalculation: CustomsCalculation | null = null;

      // Calculate minimum valuation method if applicable
      if (minimumValuationUSD && minimumValuationUSD > 0) {
        try {
          const conversion = await currencyService.convertMinimumValuation(
            minimumValuationUSD * quantity,
            originCountry
          );

          const minimumBasisUSD = minimumValuationUSD * quantity;
          minimumValuationCalculation = {
            method: 'minimum_valuation',
            basisAmount: conversion.convertedAmount,
            basisCurrency: conversion.originCurrency,
            customsRate: taxRates.customs,
            customsAmount: minimumBasisUSD * (taxRates.customs / 100),
            localTaxAmount: minimumBasisUSD * (taxRates.localTax / 100),
            totalTax: minimumBasisUSD * ((taxRates.customs + taxRates.localTax) / 100),
            conversionDetails: `$${minimumValuationUSD * quantity} USD → ${conversion.convertedAmount} ${conversion.originCurrency}`,
          };
        } catch (error) {
          console.error('Currency conversion failed:', error);
        }
      }

      // Determine which method yields higher tax (government requirement)
      const selectedMethod = minimumValuationCalculation && 
        minimumValuationCalculation.totalTax > actualPriceCalculation.totalTax
        ? 'minimum_valuation'
        : 'actual_price';

      const newCalculations = {
        actualPrice: actualPriceCalculation,
        minimumValuation: minimumValuationCalculation,
        selected: selectedMethod,
      };

      setCalculations(newCalculations);

      // Notify parent component
      if (onCalculationUpdate) {
        const selectedCalculation = selectedMethod === 'minimum_valuation' 
          ? minimumValuationCalculation 
          : actualPriceCalculation;
        if (selectedCalculation) {
          onCalculationUpdate(selectedCalculation);
        }
      }

    } catch (error) {
      console.error('Customs calculation failed:', error);
      setError('Failed to calculate customs duties');
    } finally {
      setIsLoading(false);
    }
  };

  // Get tax rates based on category and destination
  const getTaxRates = (category: string, destinationCountry: string) => {
    // Simplified tax rates - in reality, would come from database/API
    const rates = {
      NP: { // Nepal
        electronics: { customs: 20, localTax: 13 },
        clothing: { customs: 12, localTax: 13 },
        books: { customs: 0, localTax: 0 },
        toys: { customs: 15, localTax: 13 },
        accessories: { customs: 15, localTax: 13 },
        home_garden: { customs: 12, localTax: 13 },
        general: { customs: 15, localTax: 13 },
      },
      IN: { // India
        electronics: { customs: 20, localTax: 18 },
        clothing: { customs: 12, localTax: 12 },
        books: { customs: 0, localTax: 0 },
        toys: { customs: 15, localTax: 12 },
        accessories: { customs: 18, localTax: 18 },
        home_garden: { customs: 15, localTax: 18 },
        general: { customs: 15, localTax: 18 },
      },
    };

    return rates[destinationCountry as keyof typeof rates]?.[category] || 
           rates[destinationCountry as keyof typeof rates]?.['general'] || 
           { customs: 10, localTax: 10 };
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency === 'NPR' ? 'NPR' : currency === 'INR' ? 'INR' : 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (!hsnCode || productPrice <= 0) {
    return (
      <Card className="border-gray-200 bg-gray-50/30">
        <CardContent className="p-4 text-center">
          <div className="flex items-center justify-center space-x-2 text-gray-500">
            <Calculator className="h-5 w-5" />
            <span className="text-sm">Select HSN code to preview customs calculation</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="border-blue-200 bg-blue-50/30">
        <CardContent className="p-4 text-center">
          <div className="flex items-center justify-center space-x-2 text-blue-600">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="text-sm">Calculating customs duties...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50/30">
        <CardContent className="p-4 text-center">
          <div className="flex items-center justify-center space-x-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-sm">{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-green-200 bg-green-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-green-800 flex items-center">
          <Calculator className="w-4 h-4 mr-2" />
          Customs Calculation Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Calculation Methods Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Actual Price Method */}
          <div className={`p-3 rounded-lg border ${
            calculations.selected === 'actual_price' 
              ? 'border-green-300 bg-green-50' 
              : 'border-gray-200 bg-gray-50'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-gray-800">Actual Price Method</h4>
              {calculations.selected === 'actual_price' && (
                <CheckCircle className="h-4 w-4 text-green-600" />
              )}
            </div>
            {calculations.actualPrice && (
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Basis:</span>
                  <span className="font-medium">{formatCurrency(calculations.actualPrice.basisAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Customs ({calculations.actualPrice.customsRate}%):</span>
                  <span className="font-medium">{formatCurrency(calculations.actualPrice.customsAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Local Tax:</span>
                  <span className="font-medium">{formatCurrency(calculations.actualPrice.localTaxAmount)}</span>
                </div>
                <div className="flex justify-between border-t pt-1 mt-2">
                  <span className="font-semibold text-gray-800">Total Tax:</span>
                  <span className="font-semibold">{formatCurrency(calculations.actualPrice.totalTax)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Minimum Valuation Method */}
          {calculations.minimumValuation ? (
            <div className={`p-3 rounded-lg border ${
              calculations.selected === 'minimum_valuation' 
                ? 'border-green-300 bg-green-50' 
                : 'border-gray-200 bg-gray-50'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-gray-800">Minimum Valuation</h4>
                {calculations.selected === 'minimum_valuation' && (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                )}
              </div>
              <div className="space-y-1 text-xs">
                {calculations.minimumValuation.conversionDetails && (
                  <div className="text-blue-600 text-xs mb-1">
                    {calculations.minimumValuation.conversionDetails}
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Basis:</span>
                  <span className="font-medium">
                    {formatCurrency(calculations.minimumValuation.basisAmount, calculations.minimumValuation.basisCurrency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Customs ({calculations.minimumValuation.customsRate}%):</span>
                  <span className="font-medium">{formatCurrency(calculations.minimumValuation.customsAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Local Tax:</span>
                  <span className="font-medium">{formatCurrency(calculations.minimumValuation.localTaxAmount)}</span>
                </div>
                <div className="flex justify-between border-t pt-1 mt-2">
                  <span className="font-semibold text-gray-800">Total Tax:</span>
                  <span className="font-semibold">{formatCurrency(calculations.minimumValuation.totalTax)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center">
              <span className="text-xs text-gray-500">No minimum valuation</span>
            </div>
          )}
        </div>

        {/* Selected Method Summary */}
        <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-green-300">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-gray-800">
              Applied Method: {calculations.selected === 'minimum_valuation' ? 'Minimum Valuation' : 'Actual Price'}
            </span>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-green-600">
              {calculations.selected === 'minimum_valuation' && calculations.minimumValuation
                ? formatCurrency(calculations.minimumValuation.totalTax)
                : calculations.actualPrice
                ? formatCurrency(calculations.actualPrice.totalTax)
                : '$0.00'
              }
            </div>
            <div className="text-xs text-gray-500">Total Duties & Taxes</div>
          </div>
        </div>

        {/* Info Note */}
        <div className="flex items-start space-x-2 text-xs text-gray-600 bg-blue-50 p-2 rounded">
          <Info className="h-3 w-3 mt-0.5 text-blue-500 flex-shrink-0" />
          <span>
            Government regulations require using the higher of actual price or minimum valuation for customs calculation.
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomsCalculationPreview;