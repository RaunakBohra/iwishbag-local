import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { currencyService } from '@/services/CurrencyService';
import type { AdminQuoteDetails } from '@/hooks/admin/useAdminQuoteDetails';
import type { EnhancedCalculationResult } from '@/services/SmartCalculationEngine';
import {
  Calculator,
  DollarSign,
  Truck,
  Shield,
  Package,
  Receipt,
  TrendingDown,
  Info,
  RefreshCw
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface QuoteCostBreakdownProps {
  quote: AdminQuoteDetails;
  calculationResult: EnhancedCalculationResult | null;
  onRecalculate: () => Promise<void>;
  isRecalculating: boolean;
}

export const QuoteCostBreakdown: React.FC<QuoteCostBreakdownProps> = ({
  quote,
  calculationResult,
  onRecalculate,
  isRecalculating
}) => {
  const breakdown = calculationResult?.updated_quote?.calculation_data?.breakdown || 
                   quote.calculation_data?.breakdown || {};
  
  const totals = calculationResult?.updated_quote?.calculation_data?.totals || 
                 quote.calculation_data?.totals || {};

  // Get currencies
  const originCurrency = quote.origin_country === 'US' ? 'USD' : 'USD'; // Simplified
  const destinationCurrency = quote.destination_currency?.code || 'USD';
  const originSymbol = currencyService.getCurrencySymbol(originCurrency);
  const destSymbol = quote.destination_currency?.symbol || '$';

  // Cost line item component
  const CostLine = ({
    label,
    amount,
    icon: Icon,
    tooltip,
    isDeduction = false,
    isTotal = false,
    showBothCurrencies = true
  }: {
    label: string;
    amount: number;
    icon: React.ElementType;
    tooltip?: string;
    isDeduction?: boolean;
    isTotal?: boolean;
    showBothCurrencies?: boolean;
  }) => {
    const exchangeRate = Number(calculationResult?.updated_quote?.calculation_data?.exchange_rate || 1);
    const safeAmount = Number(amount || 0);
    const destAmount = safeAmount * exchangeRate;

    return (
      <div className={`flex items-center justify-between ${isTotal ? 'pt-2' : ''}`}>
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${isTotal ? 'text-primary' : 'text-gray-500'}`} />
          <span className={`${isTotal ? 'font-semibold' : 'text-sm'} text-gray-700`}>
            {label}
          </span>
          {tooltip && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-3 h-3 text-gray-400" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div className="text-right">
          <p className={`${isTotal ? 'font-bold text-lg' : 'font-medium'} ${isDeduction ? 'text-green-600' : ''}`}>
            {isDeduction && '-'}{originSymbol}{safeAmount.toFixed(2)}
          </p>
          {showBothCurrencies && originCurrency !== destinationCurrency && (
            <p className="text-xs text-gray-500">
              ≈ {destSymbol}{destAmount.toFixed(2)}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          Cost Breakdown
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {originCurrency} → {destinationCurrency}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRecalculate}
            disabled={isRecalculating}
            className="h-7"
          >
            <RefreshCw className={`w-3 h-3 ${isRecalculating ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Items Subtotal */}
        <CostLine
          label="Items Subtotal"
          amount={breakdown.subtotal || totals.items_total || 0}
          icon={Package}
          tooltip={`Total cost of ${quote.items.length} items`}
        />

        {/* Shipping */}
        <CostLine
          label="Shipping"
          amount={breakdown.shipping || totals.shipping_total || 0}
          icon={Truck}
          tooltip="International + Domestic shipping"
        />

        {/* Insurance */}
        {(breakdown.insurance || 0) > 0 && (
          <CostLine
            label="Insurance"
            amount={breakdown.insurance || 0}
            icon={Shield}
            tooltip="Shipment insurance"
          />
        )}

        {/* Handling */}
        {(breakdown.handling || 0) > 0 && (
          <CostLine
            label="Handling"
            amount={breakdown.handling || 0}
            icon={Package}
            tooltip="Processing and handling fees"
          />
        )}

        <Separator />

        {/* Taxes */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase">Taxes & Duties</p>
          
          {/* Customs */}
          <CostLine
            label="Customs Duty"
            amount={breakdown.customs || totals.customs_total || 0}
            icon={Receipt}
            tooltip={`${quote.calculation_data?.tax_calculation?.customs_rate || 0}% on CIF value`}
          />

          {/* Sales Tax */}
          {(breakdown.sales_tax || 0) > 0 && (
            <CostLine
              label="Sales Tax"
              amount={breakdown.sales_tax || 0}
              icon={Receipt}
              tooltip="Origin country sales tax"
            />
          )}

          {/* Destination Tax */}
          {(breakdown.destination_tax || totals.destination_tax || 0) > 0 && (
            <CostLine
              label={`${quote.destination_country === 'IN' ? 'GST' : 'VAT'}`}
              amount={breakdown.destination_tax || totals.destination_tax || 0}
              icon={Receipt}
              tooltip="Destination country tax"
            />
          )}
        </div>

        {/* Discount */}
        {(breakdown.discount || 0) > 0 && (
          <>
            <Separator />
            <CostLine
              label="Discount"
              amount={breakdown.discount || 0}
              icon={TrendingDown}
              isDeduction={true}
            />
          </>
        )}

        <Separator className="my-3" />

        {/* Total */}
        <CostLine
          label="Total Amount"
          amount={totals.final_total || quote.final_total_usd || 0}
          icon={DollarSign}
          isTotal={true}
        />

        {/* Exchange Rate Info */}
        {calculationResult?.updated_quote?.calculation_data?.exchange_rate && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600">
              Exchange Rate: 1 {originCurrency} = {Number(calculationResult.updated_quote.calculation_data.exchange_rate).toFixed(4)} {destinationCurrency}
            </p>
            {calculationResult.updated_quote.calculation_data.last_calculated && (
              <p className="text-xs text-gray-500 mt-1">
                Last calculated: {new Date(calculationResult.updated_quote.calculation_data.last_calculated).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {/* Shipping Options */}
        {calculationResult?.shipping_options && calculationResult.shipping_options.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-xs font-medium text-blue-900 mb-2">
              Available Shipping Options
            </p>
            <div className="space-y-1">
              {calculationResult.shipping_options.slice(0, 3).map((option) => (
                <div key={option.id} className="flex justify-between text-xs">
                  <span className="text-blue-700">{option.name}</span>
                  <span className="font-medium text-blue-900">
                    {originSymbol}{Number(option.cost || 0).toFixed(2)} ({option.days})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};