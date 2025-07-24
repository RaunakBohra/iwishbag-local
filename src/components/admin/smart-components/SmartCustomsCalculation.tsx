// ============================================================================
// SMART CUSTOMS CALCULATION - Admin Override Interface
// Shows both actual price and minimum valuation calculations with selection options
// ============================================================================

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Calculator,
  DollarSign,
  Scale,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Edit,
  Save,
  X,
  Info,
} from 'lucide-react';
import { useAdminQuoteCurrency } from '@/hooks/useAdminQuoteCurrency';
import type { ItemTaxBreakdown } from '@/services/PerItemTaxCalculator';

interface SmartCustomsCalculationProps {
  breakdown: ItemTaxBreakdown;
  onMethodChange?: (method: 'actual_price' | 'minimum_valuation' | 'manual_override', value?: number) => void;
  allowOverride?: boolean;
  compact?: boolean;
  showDetails?: boolean;
}

export const SmartCustomsCalculation: React.FC<SmartCustomsCalculationProps> = ({
  breakdown,
  onMethodChange,
  allowOverride = true,
  compact = false,
  showDetails = true,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'actual_price' | 'minimum_valuation' | 'manual_override'>(
    breakdown.calculation_options.selected_method
  );
  const [manualAmount, setManualAmount] = useState<string>('');
  const [isEditingManual, setIsEditingManual] = useState(false);

  const { calculation_options } = breakdown;
  const hasMinimumValuation = !!calculation_options.minimum_valuation_calculation;

  // Calculate difference percentage between methods
  const getDifferencePercentage = () => {
    if (!hasMinimumValuation) return 0;
    const actualTotal = calculation_options.actual_price_calculation.total_tax;
    const minimumTotal = calculation_options.minimum_valuation_calculation!.total_tax;
    const difference = Math.abs(actualTotal - minimumTotal);
    const base = Math.max(actualTotal, minimumTotal);
    return base > 0 ? Math.round((difference / base) * 100) : 0;
  };

  const handleMethodChange = (method: 'actual_price' | 'minimum_valuation' | 'manual_override') => {
    setSelectedMethod(method);
    if (method === 'manual_override') {
      setIsEditingManual(true);
    } else {
      setIsEditingManual(false);
      onMethodChange?.(method);
    }
  };

  const handleManualSave = () => {
    const value = parseFloat(manualAmount);
    if (!isNaN(value) && value >= 0) {
      onMethodChange?.('manual_override', value);
      setIsEditingManual(false);
    }
  };

  const getSelectedCalculation = () => {
    switch (selectedMethod) {
      case 'actual_price':
        return calculation_options.actual_price_calculation;
      case 'minimum_valuation':
        return calculation_options.minimum_valuation_calculation!;
      case 'manual_override':
        const manualValue = parseFloat(manualAmount) || 0;
        return {
          basis_amount: manualValue,
          customs_amount: manualValue,
          local_tax_amount: 0,
          total_tax: manualValue,
        };
      default:
        return calculation_options.actual_price_calculation;
    }
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Customs Method:</span>
          <Badge variant={selectedMethod === 'actual_price' ? 'default' : 'secondary'}>
            {selectedMethod === 'actual_price' ? 'Actual Price' : 
             selectedMethod === 'minimum_valuation' ? 'Min. Valuation' : 'Manual'}
          </Badge>
        </div>
        {hasMinimumValuation && getDifferencePercentage() > 10 && (
          <Alert className="py-2">
            <AlertTriangle className="h-3 w-3" />
            <AlertDescription className="text-xs">
              {getDifferencePercentage()}% difference between methods
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  return (
    <Card className="shadow-sm border-indigo-200 bg-indigo-50/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-sm">
          <Calculator className="w-4 h-4 text-indigo-600" />
          <span>Customs Calculation Options</span>
          {hasMinimumValuation && (
            <Badge variant="outline" className="text-xs">
              {getDifferencePercentage()}% difference
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Calculation Options */}
        <RadioGroup
          value={selectedMethod}
          onValueChange={handleMethodChange}
          className="space-y-3"
        >
          {/* Actual Price Calculation */}
          <div className="flex items-start space-x-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
            <RadioGroupItem value="actual_price" id="actual_price" className="mt-1" />
            <div className="flex-1 space-y-2">
              <Label htmlFor="actual_price" className="text-sm font-medium cursor-pointer">
                Actual Price Customs
              </Label>
              <div className="text-xs text-gray-600 space-y-1">
                <div className="flex items-center justify-between">
                  <span>Basis Amount:</span>
                  <span className="font-medium">
                    {calculation_options.actual_price_calculation.basis_amount.toLocaleString()} {breakdown.minimum_valuation_conversion?.originCurrency || 'USD'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Customs ({breakdown.customs_calculation.rate_percentage}%):</span>
                  <span className="font-medium text-red-600">
                    {calculation_options.actual_price_calculation.customs_amount.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Local Tax:</span>
                  <span className="font-medium text-blue-600">
                    {calculation_options.actual_price_calculation.local_tax_amount.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t pt-1">
                  <span className="font-medium">Total:</span>
                  <span className="font-bold text-indigo-600">
                    {calculation_options.actual_price_calculation.total_tax.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
            {selectedMethod === 'actual_price' && (
              <CheckCircle className="w-5 h-5 text-green-600 mt-1" />
            )}
          </div>

          {/* Minimum Valuation Calculation */}
          {hasMinimumValuation && (
            <div className="flex items-start space-x-3 p-3 rounded-lg border border-gray-200 hover:border-amber-300 transition-colors">
              <RadioGroupItem value="minimum_valuation" id="minimum_valuation" className="mt-1" />
              <div className="flex-1 space-y-2">
                <Label htmlFor="minimum_valuation" className="text-sm font-medium cursor-pointer">
                  Minimum Valuation Customs
                </Label>
                <div className="text-xs text-gray-600 space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Currency Conversion:</span>
                    <span className="font-medium text-amber-700 flex items-center space-x-1">
                      <span>{calculation_options.minimum_valuation_calculation!.currency_conversion_details}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Basis Amount:</span>
                    <span className="font-medium">
                      {calculation_options.minimum_valuation_calculation!.basis_amount.toLocaleString()} {breakdown.minimum_valuation_conversion?.originCurrency || 'USD'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Customs ({breakdown.customs_calculation.rate_percentage}%):</span>
                    <span className="font-medium text-red-600">
                      {calculation_options.minimum_valuation_calculation!.customs_amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Local Tax:</span>
                    <span className="font-medium text-blue-600">
                      {calculation_options.minimum_valuation_calculation!.local_tax_amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t pt-1">
                    <span className="font-medium">Total:</span>
                    <span className="font-bold text-amber-600">
                      {calculation_options.minimum_valuation_calculation!.total_tax.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
              {selectedMethod === 'minimum_valuation' && (
                <CheckCircle className="w-5 h-5 text-green-600 mt-1" />
              )}
            </div>
          )}

          {/* Manual Override Option */}
          {allowOverride && (
            <div className="flex items-start space-x-3 p-3 rounded-lg border border-gray-200 hover:border-purple-300 transition-colors">
              <RadioGroupItem value="manual_override" id="manual_override" className="mt-1" />
              <div className="flex-1 space-y-2">
                <Label htmlFor="manual_override" className="text-sm font-medium cursor-pointer">
                  Manual Override
                </Label>
                {isEditingManual ? (
                  <div className="flex items-center space-x-2">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Enter total tax amount"
                      value={manualAmount}
                      onChange={(e) => setManualAmount(e.target.value)}
                      className="text-sm"
                    />
                    <Button
                      size="sm"
                      onClick={handleManualSave}
                      disabled={!manualAmount || isNaN(parseFloat(manualAmount))}
                    >
                      <Save className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsEditingManual(false);
                        setSelectedMethod(calculation_options.selected_method);
                      }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-xs text-gray-600">
                    <p>Enter custom tax amount for special cases</p>
                    {manualAmount && (
                      <div className="mt-1 font-medium text-purple-600">
                        Manual Amount: {parseFloat(manualAmount).toLocaleString()}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {selectedMethod === 'manual_override' && !isEditingManual && (
                <CheckCircle className="w-5 h-5 text-green-600 mt-1" />
              )}
            </div>
          )}
        </RadioGroup>

        {/* Selected Method Summary */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg border">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Selected Method:</span>
            <div className="text-right">
              <div className="text-sm font-bold text-gray-900">
                {selectedMethod === 'actual_price' && 'Actual Price Calculation'}
                {selectedMethod === 'minimum_valuation' && 'Minimum Valuation Calculation'}
                {selectedMethod === 'manual_override' && 'Manual Override'}
              </div>
              <div className="text-lg font-bold text-indigo-600">
                Total: {getSelectedCalculation().total_tax.toLocaleString()} {breakdown.minimum_valuation_conversion?.originCurrency || 'USD'}
              </div>
            </div>
          </div>
        </div>

        {/* Warnings and Info */}
        {hasMinimumValuation && getDifferencePercentage() > 20 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Large Difference Detected:</strong> {getDifferencePercentage()}% difference between calculation methods. 
              Please review the item valuation and ensure the correct method is selected.
            </AlertDescription>
          </Alert>
        )}

        {selectedMethod === 'manual_override' && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Manual override selected. This will be logged for audit purposes. Please ensure the amount is justified.
            </AlertDescription>
          </Alert>
        )}

        {/* Details Toggle */}
        {showDetails && (
          <div className="mt-4 text-xs text-gray-500 space-y-1">
            <div>Item: {breakdown.item_name}</div>
            <div>HSN Code: {breakdown.hsn_code}</div>
            <div>Confidence: {Math.round(breakdown.confidence_score * 100)}%</div>
            {breakdown.warnings.length > 0 && (
              <div className="text-amber-600">
                Warnings: {breakdown.warnings.length} item(s)
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SmartCustomsCalculation;