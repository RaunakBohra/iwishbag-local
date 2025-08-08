/**
 * CompactOrderItems - Streamlined order items display for checkout
 * 
 * Features:
 * - Single-line item display with essential info
 * - Collapsible details for full item breakdown
 * - Space-efficient design following international standards
 * - Mobile-responsive layout
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Package, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useCartCurrency } from '@/hooks/useCart';
import { currencyService } from '@/services/CurrencyService';

interface CompactOrderItemsProps {
  items: Array<{
    id: string;
    quote: {
      id: string;
      display_id?: string;
      status: string;
      items?: Array<{ product_name?: string; quantity?: number }>;
      origin_country: string;
      destination_country: string;
      final_total_origincurrency: number;
      customer_currency: string;
    };
  }>;
  showDetails?: boolean;
}

export function CompactOrderItems({ items, showDetails = false }: CompactOrderItemsProps) {
  const [isExpanded, setIsExpanded] = useState(showDetails);
  const { displayCurrency } = useCartCurrency();

  const formatCheckoutAmount = (amount: number, currency: string) => {
    return currencyService.formatAmount(amount, currency);
  };

  const getTotalItemsCount = (quoteItems?: Array<{ quantity?: number }>) => {
    if (!quoteItems || quoteItems.length === 0) return 0;
    return quoteItems.reduce((total, item) => total + (item.quantity || 1), 0);
  };

  const getItemsPreview = (quoteItems?: Array<{ product_name?: string; quantity?: number }>) => {
    if (!quoteItems || quoteItems.length === 0) return 'No items';
    
    const firstItem = quoteItems[0];
    const totalItems = getTotalItemsCount(quoteItems);
    
    if (quoteItems.length === 1) {
      return `${firstItem.product_name || 'Product'} ${firstItem.quantity && firstItem.quantity > 1 ? `(${firstItem.quantity})` : ''}`;
    } else {
      return `${firstItem.product_name || 'Product'} + ${quoteItems.length - 1} more (${totalItems} total)`;
    }
  };

  return (
    <Card className="border-gray-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-900 flex items-center gap-2">
            <Package className="w-4 h-4" />
            Order Items ({items.length})
          </h3>
          
          {items.length > 2 && (
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-1">
                  {isExpanded ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      Show all
                    </>
                  )}
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          )}
        </div>

        {/* Always show first 2 items */}
        <div className="space-y-2">
          {items.slice(0, 2).map((item) => (
            <div key={item.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border flex-shrink-0">
                  <Package className="w-4 h-4 text-gray-400" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm truncate">
                      Quote #{item.quote.display_id || item.quote.id.slice(0, 8)}
                    </span>
                    <Badge size="sm" variant={item.quote.status === 'approved' ? 'default' : 'secondary'}>
                      {item.quote.status}
                    </Badge>
                  </div>
                  
                  <div className="text-xs text-gray-600 flex items-center gap-2">
                    <span className="truncate">{getItemsPreview(item.quote.items)}</span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs font-medium">
                        {item.quote.origin_country}
                      </span>
                      <ArrowRight className="w-3 h-3 text-gray-400" />
                      <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-xs font-medium">
                        {item.quote.destination_country}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-right flex-shrink-0 ml-3">
                <p className="font-semibold text-sm">
                  {formatCheckoutAmount(item.quote.final_total_origincurrency || 0, displayCurrency)}
                </p>
              </div>
            </div>
          ))}
          
          {/* Collapsible content for remaining items */}
          {items.length > 2 && (
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleContent className="space-y-2">
                {items.slice(2).map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border flex-shrink-0">
                        <Package className="w-4 h-4 text-gray-400" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm truncate">
                            Quote #{item.quote.display_id || item.quote.id.slice(0, 8)}
                          </span>
                          <Badge size="sm" variant={item.quote.status === 'approved' ? 'default' : 'secondary'}>
                            {item.quote.status}
                          </Badge>
                        </div>
                        
                        <div className="text-xs text-gray-600 flex items-center gap-2">
                          <span className="truncate">{getItemsPreview(item.quote.items)}</span>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs font-medium">
                              {item.quote.origin_country}
                            </span>
                            <ArrowRight className="w-3 h-3 text-gray-400" />
                            <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-xs font-medium">
                              {item.quote.destination_country}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="font-semibold text-sm">
                        {formatCheckoutAmount(item.quote.final_total_origincurrency || 0, displayCurrency)}
                      </p>
                    </div>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </CardContent>
    </Card>
  );
}