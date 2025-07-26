import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Weight, DollarSign } from 'lucide-react';

interface QuoteItem {
  id: string;
  name?: string;
  url?: string;
  image?: string;
  options?: any;
  quantity?: number;
  price_usd?: number;
  weight_kg?: number;
  hsn_code?: string;
  category?: string;
}

interface QuoteItemCardProps {
  item: QuoteItem;
}

export const QuoteItemCard: React.FC<QuoteItemCardProps> = ({ item }) => {
  const itemPrice = item.price_usd || 0;
  const itemQuantity = item.quantity || 1;
  const itemWeight = item.weight_kg || 0;
  const totalPrice = itemPrice * itemQuantity;
  const totalWeight = itemWeight * itemQuantity;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start space-x-4">
          {/* Product Image */}
          {item.image && (
            <div className="flex-shrink-0">
              <img
                src={item.image}
                alt={item.name || 'Product'}
                className="w-16 h-16 object-cover rounded-lg border"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            </div>
          )}

          {/* Product Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-900 truncate">
                  {item.name || 'Product'}
                </h3>

                {item.options && Object.keys(item.options).length > 0 && (
                  <div className="mt-1">
                    <p className="text-xs text-gray-500">
                      {Object.entries(item.options)
                        .map(([key, value]) => `${key}: ${value}`)
                        .join(', ')}
                    </p>
                  </div>
                )}

                {/* HSN Information - Always show for debugging */}
                <div className="flex items-center space-x-2 mt-2">
                  {item.hsn_code && item.hsn_code.trim() !== '' && (
                    <Badge variant="outline" className="text-xs">
                      HSN: {item.hsn_code}
                    </Badge>
                  )}
                  {item.category && item.category.trim() !== '' && (
                    <Badge variant="secondary" className="text-xs">
                      {item.category}
                    </Badge>
                  )}
                  {/* Debug info */}
                  <Badge variant="outline" className="text-xs text-gray-400">
                    Debug: HSN={item.hsn_code || 'none'} | Cat={item.category || 'none'}
                  </Badge>
                </div>
              </div>

              {/* Product Stats */}
              <div className="flex-shrink-0 text-right ml-4">
                <div className="flex items-center text-sm text-gray-900 font-medium">
                  <DollarSign className="h-4 w-4 mr-1" />
                  {totalPrice.toFixed(2)}
                </div>

                <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                  <div className="flex items-center">
                    <Package className="h-3 w-3 mr-1" />
                    Qty: {itemQuantity}
                  </div>
                  {totalWeight > 0 && (
                    <div className="flex items-center">
                      <Weight className="h-3 w-3 mr-1" />
                      {totalWeight.toFixed(2)}kg
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Product URL */}
            {item.url && (
              <div className="mt-2">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 truncate block"
                >
                  View Product →
                </a>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
