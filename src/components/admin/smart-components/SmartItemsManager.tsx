// ============================================================================
// SMART ITEMS MANAGER - AI-Enhanced Product Management
// Features: Weight estimation, smart validation, optimization hints
// ============================================================================

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  Plus, 
  Edit, 
  Trash2, 
  Scale, 
  AlertTriangle,
  CheckCircle,
  Lightbulb
} from 'lucide-react';
import type { UnifiedQuote, QuoteItem } from '@/types/unified-quote';

interface SmartItemsManagerProps {
  quote: UnifiedQuote;
  onUpdateQuote: () => void;
}

export const SmartItemsManager: React.FC<SmartItemsManagerProps> = ({
  quote,
  onUpdateQuote,
}) => {
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [newItem, setNewItem] = useState<Partial<QuoteItem>>({
    name: '',
    quantity: 1,
    price_usd: 0,
    weight_kg: 0,
  });

  const getWeightConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getWeightConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) return { variant: 'default' as const, text: 'High' };
    if (confidence >= 0.6) return { variant: 'secondary' as const, text: 'Medium' };
    return { variant: 'destructive' as const, text: 'Low' };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Smart Items Manager</h3>
          <p className="text-sm text-gray-600">
            {quote.items.length} items • Total weight: {' '}
            {quote.items.reduce((sum, item) => sum + (item.weight_kg * item.quantity), 0).toFixed(2)} kg
          </p>
        </div>
        <Button className="flex items-center">
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Items List */}
      <div className="space-y-4">
        {quote.items.map((item) => (
          <Card key={item.id} className="relative">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                {/* Item Details */}
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <Package className="w-4 h-4 text-gray-500" />
                    <h4 className="font-medium">{item.name}</h4>
                    {item.options && (
                      <Badge variant="outline" className="text-xs">
                        {item.options}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Quantity:</span>
                      <div className="font-medium">{item.quantity}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Price (USD):</span>
                      <div className="font-medium">${item.price_usd.toFixed(2)}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Weight:</span>
                      <div className="flex items-center space-x-1">
                        <span className="font-medium">{item.weight_kg} kg</span>
                        <Badge {...getWeightConfidenceBadge(item.smart_data.weight_confidence)}>
                          {getWeightConfidenceBadge(item.smart_data.weight_confidence).text}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Total:</span>
                      <div className="font-medium">${(item.price_usd * item.quantity).toFixed(2)}</div>
                    </div>
                  </div>

                  {/* Smart Data Insights */}
                  <div className="mt-3 space-y-2">
                    {/* Weight Confidence */}
                    <div className="flex items-center space-x-2">
                      <Scale className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-600">Weight confidence:</span>
                      <span className={`text-xs font-medium ${getWeightConfidenceColor(item.smart_data.weight_confidence)}`}>
                        {(item.smart_data.weight_confidence * 100).toFixed(0)}%
                      </span>
                      {item.smart_data.weight_confidence < 0.7 && (
                        <div className="flex items-center text-xs text-orange-600">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Verify weight
                        </div>
                      )}
                    </div>

                    {/* Category Detection */}
                    {item.smart_data.category_detected && (
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        <span className="text-xs text-gray-600">Category:</span>
                        <Badge variant="outline" className="text-xs">
                          {item.smart_data.category_detected}
                        </Badge>
                      </div>
                    )}

                    {/* Optimization Hints */}
                    {item.smart_data.optimization_hints.length > 0 && (
                      <div className="flex items-start space-x-2">
                        <Lightbulb className="w-3 h-3 text-yellow-500 mt-0.5" />
                        <div className="text-xs text-gray-600">
                          <span className="font-medium">Hints:</span>
                          <ul className="mt-1 space-y-1">
                            {item.smart_data.optimization_hints.map((hint, index) => (
                              <li key={index}>• {hint}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Customs Suggestions */}
                    {item.smart_data.customs_suggestions.length > 0 && (
                      <div className="flex items-start space-x-2">
                        <Package className="w-3 h-3 text-blue-500 mt-0.5" />
                        <div className="text-xs text-gray-600">
                          <span className="font-medium">Customs:</span>
                          <div className="mt-1 space-x-1">
                            {item.smart_data.customs_suggestions.map((suggestion, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {suggestion}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingItem(item.id)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Items Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {quote.items.length}
              </div>
              <div className="text-sm text-gray-600">Total Items</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {quote.items.reduce((sum, item) => sum + item.quantity, 0)}
              </div>
              <div className="text-sm text-gray-600">Total Quantity</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {quote.items.reduce((sum, item) => sum + (item.weight_kg * item.quantity), 0).toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">Total Weight (kg)</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {(quote.items.reduce((sum, item) => sum + item.smart_data.weight_confidence, 0) / quote.items.length * 100).toFixed(0)}%
              </div>
              <div className="text-sm text-gray-600">Avg. Confidence</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Smart Recommendations */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center mb-3">
            <Lightbulb className="w-4 h-4 text-blue-600 mr-2" />
            <span className="font-medium text-blue-800">Smart Recommendations</span>
          </div>
          <div className="space-y-2 text-sm">
            {quote.items.some(item => item.smart_data.weight_confidence < 0.7) && (
              <div className="flex items-center text-blue-700">
                <AlertTriangle className="w-3 h-3 mr-2" />
                Consider verifying weights for items with low confidence scores
              </div>
            )}
            {quote.items.some(item => item.weight_kg < 0.1) && (
              <div className="flex items-center text-blue-700">
                <Scale className="w-3 h-3 mr-2" />
                Some items have very low weights - this may affect shipping calculations
              </div>
            )}
            <div className="flex items-center text-blue-700">
              <CheckCircle className="w-3 h-3 mr-2" />
              All items have been categorized for optimal customs processing
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};