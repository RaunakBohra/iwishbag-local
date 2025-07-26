/**
 * HSN Item Breakdown Card
 * Displays per-item tax calculations with HSN codes and classifications
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SmartHSNSearch } from '@/components/admin/hsn-components/SmartHSNSearch';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Package,
  Edit,
  Save,
  X,
  AlertTriangle,
  CheckCircle,
  Scale,
  DollarSign,
  Calculator,
  Tag,
  Weight,
  Info,
} from 'lucide-react';
import type { ItemTaxBreakdown } from '@/services/PerItemTaxCalculator';

interface HSNItemBreakdownCardProps {
  breakdown: ItemTaxBreakdown;
  onUpdate: (updates: any) => void;
  showDetailedCalculation?: boolean;
}

export const HSNItemBreakdownCard: React.FC<HSNItemBreakdownCardProps> = ({
  breakdown,
  onUpdate,
  showDetailedCalculation = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({
    hsnCode: breakdown.hsnCode || '',
    category: breakdown.category || '',
    customsDutyRate: breakdown.customsDuty.rate,
    localTaxRate: breakdown.localTax.rate,
  });

  const handleSave = () => {
    onUpdate({
      hsn_code: editValues.hsnCode,
      category: editValues.category,
      // Note: Tax rates would be handled by the tax calculation system
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValues({
      hsnCode: breakdown.hsnCode || '',
      category: breakdown.category || '',
      customsDutyRate: breakdown.customsDuty.rate,
      localTaxRate: breakdown.localTax.rate,
    });
    setIsEditing(false);
  };

  // Calculate confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              {breakdown.itemName}
            </CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                Qty: {breakdown.quantity}
              </Badge>
              <Badge variant="outline" className="text-xs">
                ${breakdown.costPrice.toFixed(2)} each
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`text-xs ${getConfidenceColor(breakdown.classificationConfidence)}`}
            >
              {getConfidenceText(breakdown.classificationConfidence)} Confidence
            </Badge>

            <Button variant="ghost" size="sm" onClick={() => setIsEditing(!isEditing)}>
              {isEditing ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* HSN Code and Classification */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-gray-600">HSN Code</Label>
            {isEditing ? (
              <SmartHSNSearch
                currentHSNCode={editValues.hsnCode}
                productName={breakdown.itemName}
                onHSNSelect={(hsn) => {
                  setEditValues((prev) => ({
                    ...prev,
                    hsnCode: hsn.hsn_code,
                    category: hsn.category,
                  }));
                }}
                placeholder="Search HSN code..."
                size="sm"
              />
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <Tag className="h-3 w-3 text-gray-400" />
                <span className="text-sm font-medium">{breakdown.hsnCode || 'Not classified'}</span>
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs text-gray-600">Category</Label>
            {isEditing ? (
              <Select
                value={editValues.category}
                onValueChange={(value) => setEditValues((prev) => ({ ...prev, category: value }))}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="electronics">Electronics</SelectItem>
                  <SelectItem value="clothing">Clothing</SelectItem>
                  <SelectItem value="books">Books</SelectItem>
                  <SelectItem value="food">Food</SelectItem>
                  <SelectItem value="luxury">Luxury</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <Package className="h-3 w-3 text-gray-400" />
                <span className="text-sm font-medium capitalize">{breakdown.category}</span>
              </div>
            )}
          </div>
        </div>

        {/* Valuation Method Indicator */}
        {breakdown.minimumValuation && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm text-yellow-800">
              <Scale className="h-4 w-4" />
              <span className="font-medium">Minimum Valuation Applied</span>
            </div>
            <div className="mt-1 text-xs text-yellow-700">
              Using ${breakdown.minimumValuation.amount} {breakdown.minimumValuation.currency}
              minimum instead of ${breakdown.costPrice} actual value
            </div>
          </div>
        )}

        {/* Tax Calculation Breakdown with Enhanced Transparency */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-3">
            <Calculator className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-800">Tax Calculation Details</span>
          </div>

          {/* Valuation Method Used */}
          <div className="mb-3 p-2 bg-white rounded border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600">Valuation Method:</span>
              <Badge
                variant={breakdown.valuation_method === 'minimum_valuation' ? 'default' : 'outline'}
                className="text-xs"
              >
                {breakdown.valuation_method === 'minimum_valuation'
                  ? 'Minimum Valuation'
                  : breakdown.valuation_method === 'original_price'
                    ? 'Product Value'
                    : breakdown.valuation_method === 'higher_of_both'
                      ? 'Higher of Both'
                      : 'Admin Override'}
              </Badge>
            </div>
            <div className="text-xs text-gray-600">
              Taxable Amount:{' '}
              <span className="font-medium">
                $
                {breakdown.taxable_amount_origin_currency?.toFixed(2) ||
                  breakdown.valuationAmount?.toFixed(2)}
              </span>
            </div>
            {breakdown.minimum_valuation_conversion && (
              <div className="text-xs text-amber-600 mt-1">
                Min. Valuation Applied: {breakdown.minimum_valuation_conversion.conversion_details}
              </div>
            )}
          </div>

          {/* Tax Rates and Calculations */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center p-2 bg-red-50 rounded">
              <div>
                <span className="text-gray-700">Customs Duty</span>
                <div className="text-xs text-gray-600">
                  Rate:{' '}
                  {breakdown.customs_calculation?.rate_percentage || breakdown.customsDuty?.rate}%
                </div>
              </div>
              <span className="font-medium text-red-600">
                ${(breakdown.total_customs || breakdown.customsDuty?.amount)?.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
              <div>
                <span className="text-gray-700">
                  {breakdown.local_tax_calculation?.tax_type?.toUpperCase() || 'Local Tax'}
                </span>
                <div className="text-xs text-gray-600">
                  Rate:{' '}
                  {breakdown.local_tax_calculation?.rate_percentage || breakdown.localTax?.rate}%
                </div>
              </div>
              <span className="font-medium text-blue-600">
                ${(breakdown.total_local_taxes || breakdown.localTax?.amount)?.toFixed(2)}
              </span>
            </div>
          </div>

          <Separator className="my-3" />

          {/* Summary Totals */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-800">Total Tax</span>
              <span className="font-bold text-red-600">
                ${(breakdown.total_taxes || breakdown.totalTaxAmount)?.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-800">Item Total (with tax)</span>
              <span className="font-bold text-green-600">
                $
                {breakdown.totalItemCostWithTax?.toFixed(2) ||
                  (
                    (breakdown.costPrice || breakdown.original_price_origin_currency || 0) +
                    (breakdown.total_taxes || breakdown.totalTaxAmount || 0)
                  ).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Data Source and Confidence */}
          <div className="mt-3 pt-2 border-t text-xs text-gray-600">
            <div className="flex items-center justify-between">
              <span>Confidence Score:</span>
              <Badge variant="outline" className="text-xs">
                {Math.round(
                  (breakdown.confidence_score || breakdown.classificationConfidence || 0) * 100,
                )}
                %
              </Badge>
            </div>
            {breakdown.warnings && breakdown.warnings.length > 0 && (
              <div className="mt-1 text-amber-600">
                <AlertTriangle className="h-3 w-3 inline mr-1" />
                {breakdown.warnings[0]}
              </div>
            )}
          </div>
        </div>

        {/* Detailed Calculation View */}
        {showDetailedCalculation && (
          <div className="border-t pt-3">
            <div className="text-xs text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>Base Cost ({breakdown.quantity}x)</span>
                <span>${(breakdown.costPrice * breakdown.quantity).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Valuation Method</span>
                <span className="capitalize">{breakdown.valuationMethod.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax Base Amount</span>
                <span>${breakdown.valuationAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Edit Actions */}
        {isEditing && (
          <div className="flex items-center gap-2 pt-2">
            <Button size="sm" onClick={handleSave}>
              <Save className="h-3 w-3 mr-1" />
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel}>
              <X className="h-3 w-3 mr-1" />
              Cancel
            </Button>
          </div>
        )}

        {/* Confidence Indicator */}
        <div className="pt-2">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>Classification Confidence</span>
            <span>{Math.round(breakdown.classificationConfidence * 100)}%</span>
          </div>
          <Progress value={breakdown.classificationConfidence * 100} className="h-1" />
          {breakdown.classificationConfidence < 0.6 && (
            <div className="flex items-center gap-1 mt-1 text-xs text-amber-600">
              <AlertTriangle className="h-3 w-3" />
              <span>Low confidence - manual review recommended</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
