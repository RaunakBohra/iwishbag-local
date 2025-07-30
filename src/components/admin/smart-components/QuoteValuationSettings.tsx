// ============================================================================
// QUOTE VALUATION SETTINGS - Valuation Method Selection Component
// Features: Valuation method selection for customs calculation
// ============================================================================

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calculator, Info, Package, TrendingUp, Zap } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { UnifiedQuote } from '@/types/unified-quote';

interface QuoteValuationSettingsProps {
  quote: UnifiedQuote;
  onMethodChange: (method: 'product_value' | 'minimum_valuation' | 'higher_of_both') => void;
  isEditMode: boolean;
}

export const QuoteValuationSettings: React.FC<QuoteValuationSettingsProps> = ({
  quote,
  onMethodChange,
  isEditMode,
}) => {
  if (!isEditMode) return null;

  // Map database values to UI values
  const mapDbToUiValue = (dbValue: string): string => {
    console.log('[VALUATION SETTINGS] Mapping DB value to UI:', dbValue);
    if (dbValue === 'actual_price') return 'product_value';
    if (dbValue === 'auto') return 'product_value'; // Map 'auto' to 'product_value' as default
    return dbValue;
  };

  const mapUiToDbValue = (uiValue: string): string => {
    console.log('[VALUATION SETTINGS] Mapping UI value to DB:', uiValue);
    if (uiValue === 'product_value') return 'actual_price';
    return uiValue;
  };

  console.log('[VALUATION SETTINGS] Quote valuation_method_preference:', quote.valuation_method_preference);
  const currentMethod = mapDbToUiValue(quote.valuation_method_preference || 'actual_price');
  console.log('[VALUATION SETTINGS] Current method after mapping:', currentMethod);

  // Calculate method impact
  const methodInfo = {
    product_value: {
      label: 'Actual Price',
      description: 'Use actual product prices for customs calculation',
      icon: <Package className="w-4 h-4" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    minimum_valuation: {
      label: 'Minimum Valuation',
      description: 'Use icon: <TrendingUp className="w-4 h-4" />,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
    },
    higher_of_both: {
      label: 'Higher of Both',
      description: 'Use whichever is higher: actual price or icon: <Zap className="w-4 h-4" />,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
    },
  };

  const selectedInfo = methodInfo[currentMethod];

  
  const itemsWithMinimum = quote.items?.filter((item) => {
    
    return item.hsn_code;
  })?.length || 0;
  const totalItems = quote.items?.length || 0;

  return (
    <Card className={`shadow-sm ${selectedInfo.borderColor} ${selectedInfo.bgColor}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <Calculator className={`w-4 h-4 ${selectedInfo.color}`} />
            <span>Valuation Method (for Customs)</span>
          </div>
          {itemsWithMinimum > 0 && (
            <Badge variant="outline" className="text-xs">
              {itemsWithMinimum}/{totalItems} Items with HSN
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex-1 mr-4">
            <Select 
              value={currentMethod} 
              onValueChange={(value) => {
                console.log('🎯 [VALUATION SETTINGS] Select onChange triggered with:', value);
                console.log('🎯 [VALUATION SETTINGS] Current quote data:', {
                  quote_id: quote.id,
                  origin_country: quote.origin_country,
                  items_with_hsn: quote.items?.filter(item => item.hsn_code).map(item => ({
                    id: item.id,
                    name: item.name || item.product_name,
                    hsn_code: item.hsn_code,
                    price: item.costprice_origin || item.price
                  }))
                });
                const dbValue = mapUiToDbValue(value);
                console.log('🎯 [VALUATION SETTINGS] Calling onMethodChange with:', dbValue);
                onMethodChange(dbValue as 'actual_price' | 'minimum_valuation' | 'higher_of_both');
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="product_value">
                  <div className="flex items-center space-x-2">
                    <Package className="w-3 h-3 text-blue-600" />
                    <span>Actual Price</span>
                  </div>
                </SelectItem>
                <SelectItem value="minimum_valuation">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-3 h-3 text-orange-600" />
                    <span>Minimum Valuation</span>
                  </div>
                </SelectItem>
                <SelectItem value="higher_of_both">
                  <div className="flex items-center space-x-2">
                    <Zap className="w-3 h-3 text-purple-600" />
                    <span>Higher of Both</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Method Description */}
        <div
          className={`flex items-start space-x-2 p-2 rounded ${selectedInfo.bgColor} border ${selectedInfo.borderColor}`}
        >
          <div className={selectedInfo.color}>{selectedInfo.icon}</div>
          <div className="flex-1">
            <div className={`text-sm font-medium ${selectedInfo.color}`}>{selectedInfo.label}</div>
            <div className="text-xs text-gray-600 mt-0.5">{selectedInfo.description}</div>
          </div>
        </div>

        {/* Contextual Alerts */}
        {currentMethod === 'minimum_valuation' && itemsWithMinimum === 0 && (
          <Alert className="border-amber-200 bg-amber-50">
            <Info className="h-3 w-3" />
            <AlertDescription className="text-xs">
              No items have HSN codes. Actual prices will be used for all items.
            </AlertDescription>
          </Alert>
        )}

        {currentMethod === 'minimum_valuation' && itemsWithMinimum > 0 && (
          <Alert className="border-orange-200 bg-orange-50">
            <Info className="h-3 w-3" />
            <AlertDescription className="text-xs">
              HSN minimum valuations will be applied where available. May increase customs amount.
            </AlertDescription>
          </Alert>
        )}

        {currentMethod === 'higher_of_both' && (
          <Alert className="border-purple-200 bg-purple-50">
            <Info className="h-3 w-3" />
            <AlertDescription className="text-xs">
              Automatically selects higher value per item. Recommended for compliance.
            </AlertDescription>
          </Alert>
        )}

        {currentMethod === 'product_value' && (
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-3 w-3" />
            <AlertDescription className="text-xs">
              Using declared product values. May be flagged if below HSN minimums.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default QuoteValuationSettings;