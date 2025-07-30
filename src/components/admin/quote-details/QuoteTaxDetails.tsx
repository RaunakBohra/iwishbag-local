import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import type { AdminQuoteDetails } from '@/hooks/admin/useAdminQuoteDetails';
import type { EnhancedCalculationResult } from '@/services/SmartCalculationEngine';
import {
  Calculator,
  Info,
  AlertCircle,
  FileText,
  Globe,
  Zap
} from 'lucide-react';

interface QuoteTaxDetailsProps {
  quote: AdminQuoteDetails;
  calculationResult: EnhancedCalculationResult | null;
  onUpdate: (updates: Partial<AdminQuoteDetails>) => Promise<void>;
  onRecalculate: () => Promise<void>;
  isUpdating: boolean;
}

export const QuoteTaxDetails: React.FC<QuoteTaxDetailsProps> = ({
  quote,
  calculationResult,
  onUpdate,
  onRecalculate,
  isUpdating
}) => {
  const taxData = quote.calculation_data?.tax_calculation || {};
  const currentMethod = taxData.method || 'hsn_only';
  const valuationMethod = quote.valuation_method_preference || 'higher_of_both';

  const handleTaxMethodChange = async (newMethod: string) => {
    await onUpdate({
      calculation_data: {
        ...quote.calculation_data,
        tax_calculation: {
          ...taxData,
          method: newMethod as 'manual' | 'hsn_only' | 'route_based'
        }
      }
    });
    await onRecalculate();
  };

  const handleValuationMethodChange = async (newMethod: string) => {
    await onUpdate({
      valuation_method_preference: newMethod
    });
    await onRecalculate();
  };

  // Check if any items have mixed tax methods
  const itemTaxMethods = quote.items.map(item => item.tax_method || 'hsn');
  const hasMultipleTaxMethods = new Set(itemTaxMethods).size > 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          Tax Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Customs Valuation Method
          </label>
          <Select
            value={valuationMethod}
            onValueChange={handleValuationMethodChange}
            disabled={isUpdating}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="product_value">
                <div>
                  <p className="font-medium">Product Value</p>
                  <p className="text-xs text-gray-500">Use actual product cost</p>
                </div>
              </SelectItem>
              <SelectItem value="minimum_valuation">
                <div>
                  <p className="font-medium">Minimum Valuation</p>
                  <p className="text-xs text-gray-500">Use customs minimum values</p>
                </div>
              </SelectItem>
              <SelectItem value="higher_of_both">
                <div>
                  <p className="font-medium">Higher of Both (Recommended)</p>
                  <p className="text-xs text-gray-500">Use whichever value is higher</p>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {}
        {currentMethod === 'hsn_only' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">HSN Code Coverage</span>
              <Badge variant={
                quote.items.every(item => item.hsn_code) ? 'success' : 'secondary'
              }>
                {quote.items.filter(item => item.hsn_code).length} / {quote.items.length} items
              </Badge>
            </div>
            {!quote.items.every(item => item.hsn_code) && (
              <p className="text-xs text-amber-600">
                Items without HSN codes will use fallback tax calculation
              </p>
            )}
          </div>
        )}

        {/* Recalculate Button */}
        <Button
          onClick={onRecalculate}
          disabled={isUpdating}
          className="w-full"
          variant="outline"
        >
          <Calculator className="w-4 h-4 mr-2" />
          Apply Changes & Recalculate
        </Button>

        {/* Last Calculation Info */}
        {calculationResult?.updated_quote?.calculation_data?.last_calculated && (
          <p className="text-xs text-gray-500 text-center">
            Last calculated: {new Date(
              calculationResult.updated_quote.calculation_data.last_calculated
            ).toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
};