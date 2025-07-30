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
  onMethodChange: (method: 'manual' | 'hsn' | 'route') => void;
  isEditMode: boolean;
}

export const QuoteTaxSettings: React.FC<QuoteTaxSettingsProps> = ({
  quote,
  onMethodChange,
  isEditMode,
}) => {
  if (!isEditMode) return null;

  const currentMethod = quote.calculation_method_preference || 'hsn';

  // Calculate method impact
  const methodInfo = {
    manual: {
      label: 'Manual',
      description: 'Manually enter all tax values',
      icon: <Edit className="w-4 h-4" />,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
    },
    hsn: {
      label: 'description: 'Tax rates from icon: <Tag className="w-4 h-4" />,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
    },
    route: {
      label: 'Route',
      description: 'Tax rates from route customs tiers',
      icon: <Globe className="w-4 h-4" />,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
  };

  const selectedInfo = methodInfo[currentMethod];

  
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
                <SelectItem value="hsn">
                  <div className="flex items-center space-x-2">
                    <Tag className="w-3 h-3 text-purple-600" />
                    <span>HSN</span>
                  </div>
                </SelectItem>
                <SelectItem value="route">
                  <div className="flex items-center space-x-2">
                    <Globe className="w-3 h-3 text-green-600" />
                    <span>Route</span>
                  </div>
                </SelectItem>
                <SelectItem value="manual">
                  <div className="flex items-center space-x-2">
                    <Edit className="w-3 h-3 text-orange-600" />
                    <span>Manual</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {}
        {currentMethod === 'hsn' && itemsWithHSN < totalItems && (
          <Alert className="border-amber-200 bg-amber-50">
            <Info className="h-3 w-3" />
            <AlertDescription className="text-xs">
              {totalItems - itemsWithHSN} item{totalItems - itemsWithHSN !== 1 ? 's' : ''} without
              HSN codes will use fallback rates
            </AlertDescription>
          </Alert>
        )}

        {currentMethod === 'route' && (
          <Alert className="border-green-200 bg-green-50">
            <Info className="h-3 w-3" />
            <AlertDescription className="text-xs">
              Using route-based tiers for {quote.origin_country}→{quote.destination_country}. Rates vary by price/weight.
            </AlertDescription>
          </Alert>
        )}

        {currentMethod === 'manual' && (
          <Alert className="border-orange-200 bg-orange-50">
            <Info className="h-3 w-3" />
            <AlertDescription className="text-xs">
              Enter all tax values manually. Automatic calculations disabled.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default QuoteTaxSettings;
