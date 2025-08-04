import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bug, Package, Shield, Wrench, Ship, AlertTriangle, CheckCircle } from 'lucide-react';
import type { RouteCalculations } from '@/services/DynamicShippingService';

interface ShippingRouteDebugProps {
  routeCalculations?: RouteCalculations | null;
  originCountry: string;
  destinationCountry: string;
  weight: number;
  itemValueUSD: number;
  fallbackUsed?: boolean;
  className?: string;
}

export function ShippingRouteDebug({ 
  routeCalculations, 
  originCountry, 
  destinationCountry, 
  weight, 
  itemValueUSD,
  fallbackUsed = false,
  className = ""
}: ShippingRouteDebugProps) {
  
  const formatCurrency = (amount: number, currency = 'INR') => {
    if (currency === 'INR') return `₹${amount.toFixed(2)}`;
    if (currency === 'NPR') return `NPR ${amount.toFixed(2)}`;
    return `$${amount.toFixed(2)}`;
  };

  return (
    <Card className={`mt-4 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Bug className="w-4 h-4" />
          Shipping Route Debug
          {fallbackUsed && (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Fallback Used
            </Badge>
          )}
          {routeCalculations && (
            <Badge variant="default" className="text-xs">
              <CheckCircle className="w-3 h-3 mr-1" />
              Dynamic Route
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Route Info */}
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <div className="text-xs font-medium text-blue-800 mb-2 flex items-center gap-1">
            <Ship className="w-3 h-3" />
            Route Information
          </div>
          <div className="space-y-1 text-xs text-blue-700">
            <div><strong>Route:</strong> {originCountry} → {destinationCountry}</div>
            <div><strong>Weight:</strong> {weight}kg</div>
            <div><strong>Item Value:</strong> ${itemValueUSD}</div>
            {routeCalculations?.route_info && (
              <div><strong>Exchange Rate:</strong> {routeCalculations.route_info.exchange_rate}</div>
            )}
          </div>
        </div>

        {routeCalculations ? (
          <>
            {/* Delivery Option Used */}
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <div className="text-xs font-medium text-green-800 mb-2 flex items-center gap-1">
                <Package className="w-3 h-3" />
                Delivery Option Selected
              </div>
              <div className="space-y-1 text-xs text-green-700">
                <div><strong>Name:</strong> {routeCalculations.delivery_option_used.name} ({routeCalculations.delivery_option_used.carrier})</div>
                <div><strong>Rate:</strong> {formatCurrency(routeCalculations.delivery_option_used.price_per_kg)}/kg</div>
                <div><strong>Delivery:</strong> {routeCalculations.delivery_option_used.delivery_days} days</div>
              </div>
            </div>

            {/* Shipping Calculation Breakdown */}
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <div className="text-xs font-medium text-gray-800 mb-2 flex items-center gap-1">
                <Ship className="w-3 h-3" />
                International Shipping Breakdown
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white p-2 rounded border">
                  <div className="font-medium text-gray-800">Base Cost</div>
                  <div className="text-gray-600">{formatCurrency(routeCalculations.shipping.base_cost)}</div>
                </div>
                <div className="bg-white p-2 rounded border">
                  <div className="font-medium text-gray-800">Per-kg Cost</div>
                  <div className="text-gray-600">
                    {formatCurrency(routeCalculations.delivery_option_used.price_per_kg)}/kg × {weight}kg = {formatCurrency(routeCalculations.shipping.per_kg_cost)}
                  </div>
                </div>
                <div className="bg-white p-2 rounded border">
                  <div className="font-medium text-gray-800">Cost Percentage</div>
                  <div className="text-gray-600">{formatCurrency(routeCalculations.shipping.cost_percentage)}</div>
                </div>
                <div className="bg-blue-100 p-2 rounded border border-blue-300">
                  <div className="font-medium text-blue-800">Total Shipping</div>
                  <div className="text-blue-700 font-bold">{formatCurrency(routeCalculations.shipping.total)}</div>
                </div>
              </div>
            </div>

            {/* Insurance Breakdown */}
            {routeCalculations.insurance.available && (
              <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                <div className="text-xs font-medium text-orange-800 mb-2 flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Insurance Calculation
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-white p-2 rounded border">
                    <div className="font-medium text-gray-800">Coverage</div>
                    <div className="text-gray-600">{routeCalculations.insurance.percentage}%</div>
                  </div>
                  <div className="bg-white p-2 rounded border">
                    <div className="font-medium text-gray-800">Min Fee</div>
                    <div className="text-gray-600">{formatCurrency(routeCalculations.insurance.min_fee)}</div>
                  </div>
                  <div className="bg-orange-100 p-2 rounded border border-orange-300">
                    <div className="font-medium text-orange-800">Total</div>
                    <div className="text-orange-700 font-bold">{formatCurrency(routeCalculations.insurance.amount)}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Handling Fee Breakdown */}
            <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
              <div className="text-xs font-medium text-purple-800 mb-2 flex items-center gap-1">
                <Wrench className="w-3 h-3" />
                Handling Fee Calculation
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white p-2 rounded border">
                  <div className="font-medium text-gray-800">Base Fee</div>
                  <div className="text-gray-600">{formatCurrency(routeCalculations.handling.base_fee)}</div>
                </div>
                <div className="bg-white p-2 rounded border">
                  <div className="font-medium text-gray-800">Percentage Fee</div>
                  <div className="text-gray-600">{formatCurrency(routeCalculations.handling.percentage_fee)}</div>
                </div>
                <div className="bg-white p-2 rounded border">
                  <div className="font-medium text-gray-800">Before Caps</div>
                  <div className="text-gray-600">{formatCurrency(routeCalculations.handling.total_before_caps)}</div>
                </div>
                <div className="bg-purple-100 p-2 rounded border border-purple-300">
                  <div className="font-medium text-purple-800">Final Total</div>
                  <div className="text-purple-700 font-bold">{formatCurrency(routeCalculations.handling.total)}</div>
                </div>
              </div>
              <div className="mt-2 text-xs text-purple-600">
                <strong>Caps:</strong> Min {formatCurrency(routeCalculations.handling.min_fee)} - Max {formatCurrency(routeCalculations.handling.max_fee)}
              </div>
            </div>

            {/* Formula Summary */}
            <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-200">
              <div className="text-xs font-medium text-indigo-800 mb-2">Complete Formula Used</div>
              <div className="text-xs text-indigo-700 font-mono bg-white p-2 rounded border">
                <div><strong>Shipping:</strong> {formatCurrency(routeCalculations.shipping.base_cost)} + {formatCurrency(routeCalculations.shipping.per_kg_cost)} + {formatCurrency(routeCalculations.shipping.cost_percentage)} = {formatCurrency(routeCalculations.shipping.total)}</div>
                <div><strong>Insurance:</strong> {formatCurrency(routeCalculations.insurance.amount)}</div>
                <div><strong>Handling:</strong> {formatCurrency(routeCalculations.handling.total)} (capped)</div>
              </div>
            </div>
          </>
        ) : (
          /* Fallback Notice */
          <div className="bg-red-50 p-3 rounded-lg border border-red-200">
            <div className="text-xs font-medium text-red-800 mb-2 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Using Hardcoded Fallback Rates
            </div>
            <div className="text-xs text-red-700">
              No shipping route configured for {originCountry} → {destinationCountry}.
              <br />
              Using default hardcoded shipping rates, insurance (1%), and handling fees ($10 + 2%).
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ShippingRouteDebug;