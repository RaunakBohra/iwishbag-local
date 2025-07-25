/**
 * HSN Tax Comparison View
 * Compares HSN-based calculations with legacy tax calculations
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Calculator,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Percent,
  Scale,
} from 'lucide-react';
import type { UnifiedQuote } from '@/types/unified-quote';
import type { ItemTaxBreakdown } from '@/services/PerItemTaxCalculator';

interface HSNTaxComparisonViewProps {
  quote: UnifiedQuote;
  itemBreakdowns: ItemTaxBreakdown[];
  showLegacyComparison?: boolean;
}

interface TaxComparison {
  method: string;
  customsDuty: number;
  localTax: number;
  totalTax: number;
  accuracy: number;
  confidence: number;
}

export const HSNTaxComparisonView: React.FC<HSNTaxComparisonViewProps> = ({
  quote,
  itemBreakdowns,
  showLegacyComparison = true,
}) => {
  const [activeView, setActiveView] = useState<'overview' | 'breakdown' | 'items'>('overview');

  // Calculate HSN-based totals
  const hsnTotals = {
    customsDuty: itemBreakdowns.reduce((sum, item) => sum + item.customsDuty.amount, 0),
    localTax: itemBreakdowns.reduce((sum, item) => sum + item.localTax.amount, 0),
    totalTax: itemBreakdowns.reduce((sum, item) => sum + item.totalTaxAmount, 0),
    confidence:
      itemBreakdowns.reduce((sum, item) => sum + item.classificationConfidence, 0) /
      itemBreakdowns.length,
  };

  // Calculate legacy totals (from existing quote data)
  const legacyTotals = {
    customsDuty: quote.calculation_data?.breakdown?.customs || 0,
    localTax:
      quote.calculation_data?.breakdown?.destination_tax ||
      quote.calculation_data?.breakdown?.taxes ||
      0,
    totalTax:
      (quote.calculation_data?.breakdown?.customs || 0) +
      (quote.calculation_data?.breakdown?.destination_tax ||
        quote.calculation_data?.breakdown?.taxes ||
        0),
  };

  // Calculate differences
  const differences = {
    customsDuty: hsnTotals.customsDuty - legacyTotals.customsDuty,
    localTax: hsnTotals.localTax - legacyTotals.localTax,
    totalTax: hsnTotals.totalTax - legacyTotals.totalTax,
    percentageChange:
      legacyTotals.totalTax > 0
        ? ((hsnTotals.totalTax - legacyTotals.totalTax) / legacyTotals.totalTax) * 100
        : 0,
  };

  const getDifferenceColor = (diff: number) => {
    if (Math.abs(diff) < 1) return 'text-gray-600';
    return diff > 0 ? 'text-red-600' : 'text-green-600';
  };

  const getDifferenceIcon = (diff: number) => {
    if (Math.abs(diff) < 1) return null;
    return diff > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />;
  };

  return (
    <div className="space-y-6">
      {/* Comparison Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Tax Calculation Comparison
            <Badge variant="outline" className="text-xs">
              HSN vs Legacy
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent>
          <Tabs value={activeView} onValueChange={(value) => setActiveView(value as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
              <TabsTrigger value="items">Item Details</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* HSN Method */}
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-center space-y-2">
                      <h4 className="font-medium text-green-700">HSN-Based Calculation</h4>
                      <div className="text-2xl font-bold text-green-600">
                        ${hsnTotals.totalTax.toFixed(2)}
                      </div>
                      <div className="flex items-center justify-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span className="text-xs text-green-600">
                          {Math.round(hsnTotals.confidence * 100)}% confident
                        </span>
                      </div>
                      <Progress value={hsnTotals.confidence * 100} className="h-1 mt-2" />
                    </div>
                  </CardContent>
                </Card>

                {/* Difference Indicator */}
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-center space-y-2">
                      <h4 className="font-medium text-gray-700">Difference</h4>
                      <div
                        className={`text-2xl font-bold flex items-center justify-center gap-1 ${getDifferenceColor(differences.totalTax)}`}
                      >
                        {getDifferenceIcon(differences.totalTax)}$
                        {Math.abs(differences.totalTax).toFixed(2)}
                      </div>
                      <div
                        className={`text-xs ${getDifferenceColor(differences.percentageChange)}`}
                      >
                        {differences.percentageChange > 0 ? '+' : ''}
                        {differences.percentageChange.toFixed(1)}% change
                      </div>
                      {Math.abs(differences.percentageChange) > 10 && (
                        <div className="flex items-center justify-center gap-1 text-xs text-amber-600">
                          <AlertTriangle className="h-3 w-3" />
                          Significant difference
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Legacy Method */}
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-center space-y-2">
                      <h4 className="font-medium text-blue-700">Legacy Calculation</h4>
                      <div className="text-2xl font-bold text-blue-600">
                        ${legacyTotals.totalTax.toFixed(2)}
                      </div>
                      <div className="flex items-center justify-center gap-1">
                        <Calculator className="h-3 w-3 text-blue-500" />
                        <span className="text-xs text-blue-600">Route-based</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Accuracy Indicators */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <h4 className="font-medium mb-3">HSN Advantages</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        Per-item tax calculations
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        Government API integration
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        Minimum valuation support
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        Product-specific rates
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <h4 className="font-medium mb-3">Legacy Limitations</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <AlertTriangle className="h-3 w-3 text-amber-500" />
                        Route-level tax rates only
                      </li>
                      <li className="flex items-center gap-2">
                        <AlertTriangle className="h-3 w-3 text-amber-500" />
                        No product classification
                      </li>
                      <li className="flex items-center gap-2">
                        <AlertTriangle className="h-3 w-3 text-amber-500" />
                        Static rate configuration
                      </li>
                      <li className="flex items-center gap-2">
                        <AlertTriangle className="h-3 w-3 text-amber-500" />
                        Less accurate for mixed orders
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Breakdown Tab */}
            <TabsContent value="breakdown" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Customs Duty Comparison */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Customs Duty</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">HSN-Based</span>
                      <span className="font-medium">${hsnTotals.customsDuty.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Legacy</span>
                      <span className="font-medium">${legacyTotals.customsDuty.toFixed(2)}</span>
                    </div>
                    <div className="border-t pt-2">
                      <div
                        className={`flex justify-between items-center ${getDifferenceColor(differences.customsDuty)}`}
                      >
                        <span className="text-sm font-medium">Difference</span>
                        <span className="font-bold flex items-center gap-1">
                          {getDifferenceIcon(differences.customsDuty)}$
                          {Math.abs(differences.customsDuty).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Local Tax Comparison */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Local Tax (VAT/GST)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">HSN-Based</span>
                      <span className="font-medium">${hsnTotals.localTax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Legacy</span>
                      <span className="font-medium">${legacyTotals.localTax.toFixed(2)}</span>
                    </div>
                    <div className="border-t pt-2">
                      <div
                        className={`flex justify-between items-center ${getDifferenceColor(differences.localTax)}`}
                      >
                        <span className="text-sm font-medium">Difference</span>
                        <span className="font-bold flex items-center gap-1">
                          {getDifferenceIcon(differences.localTax)}$
                          {Math.abs(differences.localTax).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Calculation Methods Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Calculation Methods</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-green-700 mb-2">HSN-Based Method</h4>
                      <ul className="text-sm space-y-1 text-gray-600">
                        <li>• Individual HSN code lookup per item</li>
                        <li>• Government API tax rates</li>
                        <li>• Minimum valuation rules applied</li>
                        <li>• Product-specific exemptions</li>
                        <li>• Real-time rate updates</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-blue-700 mb-2">Legacy Method</h4>
                      <ul className="text-sm space-y-1 text-gray-600">
                        <li>• Single route-based tax rate</li>
                        <li>• Static configuration values</li>
                        <li>• Applied to total order value</li>
                        <li>• No product differentiation</li>
                        <li>• Manual rate updates required</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Item Details Tab */}
            <TabsContent value="items" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Per-Item Tax Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {itemBreakdowns.map((item, index) => (
                      <div key={item.itemId} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h5 className="font-medium">{item.itemName}</h5>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <span>HSN: {item.hsnCode || 'Not classified'}</span>
                              <span>•</span>
                              <span>Category: {item.category}</span>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            ${item.totalTaxAmount.toFixed(2)} tax
                          </Badge>
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Customs</span>
                            <div className="font-medium">
                              {item.customsDuty.rate}% = ${item.customsDuty.amount.toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-600">Local Tax</span>
                            <div className="font-medium">
                              {item.localTax.rate}% = ${item.localTax.amount.toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-600">Confidence</span>
                            <div className="font-medium">
                              {Math.round(item.classificationConfidence * 100)}%
                            </div>
                          </div>
                        </div>

                        {item.minimumValuation && (
                          <div className="mt-2 p-2 bg-yellow-50 rounded text-xs">
                            <div className="flex items-center gap-1 text-yellow-800">
                              <Scale className="h-3 w-3" />
                              Minimum valuation applied: ${item.minimumValuation.amount}{' '}
                              {item.minimumValuation.currency}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
