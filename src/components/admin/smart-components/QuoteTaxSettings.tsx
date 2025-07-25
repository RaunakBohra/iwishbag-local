// ============================================================================
// QUOTE TAX SETTINGS - Industry-Standard Tax Configuration Component
// Features: Tax method selection, visual impact preview, clear hierarchy
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
import { Calculator, Info, Edit, Globe, Tag } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { UnifiedQuote } from '@/types/unified-quote';

interface QuoteTaxSettingsProps {
  quote: UnifiedQuote;
  onMethodChange: (method: 'manual' | 'hsn_only' | 'country_based') => void;
  isEditMode: boolean;
}

export const QuoteTaxSettings: React.FC<QuoteTaxSettingsProps> = ({
  quote,
  onMethodChange,
  isEditMode,
}) => {
  if (!isEditMode) return null;

  const currentMethod = quote.calculation_method_preference || 'hsn_only';

  // Calculate method impact
  const methodInfo = {
    manual: {
      label: 'Manual Input',
      description: 'Uses customs percentage from input field',
      icon: <Edit className="w-4 h-4" />,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
    },
    hsn_only: {
      label: 'HSN Based',
      description: 'Precise calculation using HSN codes for each item',
      icon: <Tag className="w-4 h-4" />,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
    },
    country_based: {
      label: 'Country Based',
      description: 'Uses country-wide tax rates and tiers',
      icon: <Globe className="w-4 h-4" />,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
  };

  const selectedInfo = methodInfo[currentMethod];

  // Count items with HSN codes
  const itemsWithHSN = quote.items?.filter((item) => item.hsn_code)?.length || 0;
  const totalItems = quote.items?.length || 0;
  const hsnCoverage = totalItems > 0 ? Math.round((itemsWithHSN / totalItems) * 100) : 0;

  return (
    <Card className={`shadow-sm ${selectedInfo.borderColor} ${selectedInfo.bgColor}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <Calculator className={`w-4 h-4 ${selectedInfo.color}`} />
            <span>Tax Calculation Method</span>
          </div>
          {hsnCoverage > 0 && (
            <Badge variant="outline" className="text-xs">
              {hsnCoverage}% HSN Coverage
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex-1 mr-4">
            <Select value={currentMethod} onValueChange={onMethodChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">
                  <div className="flex items-center space-x-2">
                    <Edit className="w-3 h-3 text-orange-600" />
                    <span>Manual Input</span>
                  </div>
                </SelectItem>
                <SelectItem value="hsn_only">
                  <div className="flex items-center space-x-2">
                    <Tag className="w-3 h-3 text-purple-600" />
                    <span>HSN Based</span>
                  </div>
                </SelectItem>
                <SelectItem value="country_based">
                  <div className="flex items-center space-x-2">
                    <Globe className="w-3 h-3 text-green-600" />
                    <span>Country Based</span>
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

        {/* HSN Coverage Alert */}
        {currentMethod === 'hsn_only' && itemsWithHSN < totalItems && (
          <Alert className="border-amber-200 bg-amber-50">
            <Info className="h-3 w-3" />
            <AlertDescription className="text-xs">
              {totalItems - itemsWithHSN} item{totalItems - itemsWithHSN !== 1 ? 's' : ''} without
              HSN codes won't have taxes calculated
            </AlertDescription>
          </Alert>
        )}

        {currentMethod === 'manual' && (
          <Alert className="border-orange-200 bg-orange-50">
            <Info className="h-3 w-3" />
            <AlertDescription className="text-xs">
              Using customs percentage from input field. HSN codes will be ignored.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default QuoteTaxSettings;
