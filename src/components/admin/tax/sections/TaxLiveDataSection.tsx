/**
 * Tax Live Data Section
 * Handles raw calculation data display and live data fetching status
 * Extracted from TaxCalculationDebugPanel for better maintainability
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, Database, Wifi, WifiOff } from 'lucide-react';
import type { UnifiedQuote } from '@/types/unified-quote';

interface TaxLiveDataSectionProps {
  quote: UnifiedQuote;
  liveHsnRates?: Record<string, any>;
  liveRouteRates?: any;
  isLoadingLiveData?: boolean;
  onRefreshLiveData?: () => void;
  className?: string;
}

export const TaxLiveDataSection: React.FC<TaxLiveDataSectionProps> = ({
  quote,
  liveHsnRates,
  liveRouteRates,
  isLoadingLiveData = false,
  onRefreshLiveData,
  className = '',
}) => {
  const exchangeRate = typeof quote.calculation_data?.exchange_rate === 'number' 
    ? quote.calculation_data.exchange_rate 
    : parseFloat(quote.calculation_data?.exchange_rate?.toString() || '1') || 1;

  const hasLiveData = liveHsnRates || liveRouteRates;
  const hasStoredData = quote.calculation_data?.breakdown || quote.tax_rates || quote.operational_data;

  // Compare live data with stored data to detect mismatches
  const dataMismatches = React.useMemo(() => {
    const mismatches = [];
    
    if (liveHsnRates && Object.keys(liveHsnRates).length > 0) {
      const storedHsnRate = quote.calculation_data?.tax_rates?.customs || 0;
      const liveHsnRate = Object.values(liveHsnRates)[0] as any;
      
      if (liveHsnRate?.customs && Math.abs(liveHsnRate.customs - storedHsnRate) > 0.1) {
        mismatches.push({
          type: 'HSN Rate',
          stored: `${storedHsnRate}%`,
          live: `${liveHsnRate.customs}%`,
          difference: Math.abs(liveHsnRate.customs - storedHsnRate).toFixed(2)
        });
      }
    }
    
    if (liveRouteRates?.customs) {
      const storedRouteRate = quote.calculation_data?.operational_data?.customs?.smart_tier?.percentage || 0;
      
      if (Math.abs(liveRouteRates.customs - storedRouteRate) > 0.1) {
        mismatches.push({
          type: 'Route Rate',
          stored: `${storedRouteRate}%`,
          live: `${liveRouteRates.customs}%`,
          difference: Math.abs(liveRouteRates.customs - storedRouteRate).toFixed(2)
        });
      }
    }
    
    return mismatches;
  }, [liveHsnRates, liveRouteRates, quote]);

  const renderLiveDataStatus = () => {
    if (isLoadingLiveData) {
      return (
        <Alert className="border-blue-200 bg-blue-50">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <AlertDescription className="text-blue-800">
            Fetching live tax rates from database...
          </AlertDescription>
        </Alert>
      );
    }

    if (dataMismatches.length > 0) {
      return (
        <Alert className="border-orange-200 bg-orange-50">
          <Wifi className="h-4 w-4" />
          <AlertDescription>
            <div className="text-orange-800">
              <div className="font-semibold mb-2">Live Data Mismatches Detected:</div>
              {dataMismatches.map((mismatch, idx) => (
                <div key={idx} className="text-sm mb-1">
                  <strong>{mismatch.type}:</strong> Stored {mismatch.stored} → Live {mismatch.live} 
                  (Δ {mismatch.difference}%)
                </div>
              ))}
              <div className="text-sm mt-2 font-medium">
                💡 Consider recalculating the quote to use current rates
              </div>
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    if (hasLiveData) {
      return (
        <Alert className="border-green-200 bg-green-50">
          <Wifi className="h-4 w-4" />
          <AlertDescription className="text-green-800">
            Live data fetched successfully. Rates are current and match stored calculations.
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <Alert className="border-gray-200 bg-gray-50">
        <WifiOff className="h-4 w-4" />
        <AlertDescription className="text-gray-600">
          No live data available. Displaying stored calculation data only.
        </AlertDescription>
      </Alert>
    );
  };

  const renderLiveDataSummary = () => {
    if (!hasLiveData) return null;

    return (
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <Database className="w-4 h-4 text-green-600" />
            Live Rate Summary
          </h4>
          {onRefreshLiveData && (
            <button
              onClick={onRefreshLiveData}
              disabled={isLoadingLiveData}
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingLiveData ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          {liveHsnRates && Object.keys(liveHsnRates).length > 0 && (
            <div>
              <div className="text-gray-600 mb-1">HSN Rates:</div>
              {Object.entries(liveHsnRates).map(([hsnCode, rates]: [string, any]) => (
                <div key={hsnCode} className="flex items-center justify-between">
                  <span className="font-mono text-xs">{hsnCode}</span>
                  <Badge variant="outline" className="text-xs">
                    {rates.customs}% customs
                  </Badge>
                </div>
              ))}
            </div>
          )}

          {liveRouteRates && (
            <div>
              <div className="text-gray-600 mb-1">Route Rates:</div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span>Customs:</span>
                  <Badge variant="outline" className="text-xs">
                    {liveRouteRates.customs}%
                  </Badge>
                </div>
                {liveRouteRates.vat && (
                  <div className="flex items-center justify-between">
                    <span>VAT:</span>
                    <Badge variant="outline" className="text-xs">
                      {liveRouteRates.vat}%
                    </Badge>
                  </div>
                )}
                {liveRouteRates.tier_name && (
                  <div className="flex items-center justify-between">
                    <span>Tier:</span>
                    <Badge variant="secondary" className="text-xs">
                      {liveRouteRates.tier_name}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <Separator />
      
      {/* Live Data Status */}
      {renderLiveDataStatus()}
      
      {/* Live Data Summary */}
      {renderLiveDataSummary()}

      {/* Raw Data Display */}
      <div className="bg-white rounded-lg border">
        <details className="group">
          <summary className="cursor-pointer p-4 text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              View Raw Calculation Data
            </span>
            <span className="text-xs text-gray-500 group-open:hidden">
              Click to expand stored calculation data
            </span>
          </summary>
          
          <div className="border-t p-4">
            <div className="space-y-4">
              {/* Calculation Summary */}
              <div>
                <h5 className="font-medium text-xs text-gray-600 mb-2">Calculation Summary</h5>
                <div className="bg-gray-50 rounded p-3 text-xs">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-600">Tax Method:</span>
                      <span className="ml-2 font-mono">{quote.tax_method || 'Unknown'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Exchange Rate:</span>
                      <span className="ml-2 font-mono">{exchangeRate.toFixed(4)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Route:</span>
                      <span className="ml-2 font-mono">{quote.origin_country}→{quote.destination_country}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Items Count:</span>
                      <span className="ml-2 font-mono">{quote.items?.length || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Raw JSON Data */}
              <div>
                <h5 className="font-medium text-xs text-gray-600 mb-2">Raw JSON Data</h5>
                <pre className="text-xs bg-gray-100 p-3 rounded overflow-x-auto max-h-96 overflow-y-auto">
{JSON.stringify({
  breakdown: quote.calculation_data?.breakdown,
  tax_rates: quote.tax_rates,
  operational_data: quote.operational_data,
  calculation_method: quote.tax_method,
  exchange_rate: exchangeRate,
  valuation_method: quote.valuation_method_preference,
  hsn_calculation: quote.calculation_data?.hsn_calculation,
  item_breakdowns: quote.calculation_data?.item_breakdowns,
  ...(hasLiveData && {
    live_data: {
      hsn_rates: liveHsnRates,
      route_rates: liveRouteRates,
      mismatches: dataMismatches
    }
  })
}, null, 2)}
                </pre>
              </div>
              
              {/* Data Quality Check */}
              <div>
                <h5 className="font-medium text-xs text-gray-600 mb-2">Data Quality</h5>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className={`p-2 rounded ${hasStoredData ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                    <div className="font-medium">Stored Data</div>
                    <div>{hasStoredData ? 'Available' : 'Missing'}</div>
                  </div>
                  <div className={`p-2 rounded ${hasLiveData ? 'bg-green-50 text-green-800' : 'bg-yellow-50 text-yellow-800'}`}>
                    <div className="font-medium">Live Data</div>
                    <div>{hasLiveData ? 'Fetched' : 'Not Available'}</div>
                  </div>
                  <div className={`p-2 rounded ${dataMismatches.length === 0 ? 'bg-green-50 text-green-800' : 'bg-orange-50 text-orange-800'}`}>
                    <div className="font-medium">Data Sync</div>
                    <div>{dataMismatches.length === 0 ? 'Synchronized' : `${dataMismatches.length} Mismatches`}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
};