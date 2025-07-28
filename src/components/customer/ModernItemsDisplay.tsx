import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Package,
  ExternalLink,
  Weight,
  Tag,
  Globe,
  ShoppingBag,
  Info,
  Image as ImageIcon,
} from 'lucide-react';
import type { UnifiedQuote } from '@/types/unified-quote';

interface ModernItemsDisplayProps {
  items: UnifiedQuote['items'];
  currency: string;
  currencySymbol: string;
  onViewProduct?: (url: string) => void;
}

export const ModernItemsDisplay: React.FC<ModernItemsDisplayProps> = ({
  items,
  currency,
  currencySymbol,
  onViewProduct,
}) => {
  const formatPrice = (amount: number) => {
    return `${currencySymbol}${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatWeight = (weight: number) => {
    if (weight >= 1) {
      return `${weight.toFixed(2)} kg`;
    }
    return `${(weight * 1000).toFixed(0)} g`;
  };

  return (
    <TooltipProvider>
      <div className="grid gap-4">
        {items.map((item, index) => (
          <Card
            key={item.id}
            className="overflow-hidden hover:shadow-lg transition-all duration-300 group"
          >
            <CardContent className="p-0">
              <div className="flex flex-col lg:flex-row">
                {/* Product Image */}
                <div className="relative w-full lg:w-48 h-48 bg-gray-100 flex-shrink-0">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.product_name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'https://via.placeholder.com/200?text=No+Image';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm">
                      Qty: {item.quantity}
                    </Badge>
                  </div>
                </div>

                {/* Product Details */}
                <div className="flex-1 p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                        {item.product_name}
                      </h3>
                      
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
                        {item.seller && (
                          <div className="flex items-center gap-1">
                            <ShoppingBag className="h-4 w-4" />
                            <span>{item.seller}</span>
                          </div>
                        )}
                        {item.weight > 0 && (
                          <div className="flex items-center gap-1">
                            <Weight className="h-4 w-4" />
                            <span>{formatWeight(item.weight)}</span>
                          </div>
                        )}
                        {item.category && (
                          <div className="flex items-center gap-1">
                            <Tag className="h-4 w-4" />
                            <span>{item.category}</span>
                          </div>
                        )}
                      </div>

                      {/* HSN and Tax Info */}
                      <div className="flex flex-wrap gap-2">
                        {item.hsn_code && (
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge variant="outline" className="text-xs">
                                <Globe className="h-3 w-3 mr-1" />
                                HSN: {item.hsn_code}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Harmonized System Code for customs classification</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {item.customs_amount > 0 && (
                          <Badge variant="outline" className="text-xs text-orange-600">
                            Customs: {formatPrice(item.customs_amount)}
                          </Badge>
                        )}
                        {(item.sales_tax_amount > 0 || item.destination_tax_amount > 0) && (
                          <Badge variant="outline" className="text-xs text-blue-600">
                            Tax: {formatPrice(item.sales_tax_amount + item.destination_tax_amount)}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Price and Actions */}
                    <div className="flex flex-col items-end gap-3">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatPrice(item.price)} × {item.quantity}
                        </p>
                      </div>

                      {item.product_url && onViewProduct && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onViewProduct(item.product_url)}
                          className="group-hover:bg-primary group-hover:text-white transition-colors"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Product
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* SKU and Additional Info */}
                  {item.sku && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-xs text-gray-500">
                        SKU: <span className="font-mono">{item.sku}</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </TooltipProvider>
  );
};