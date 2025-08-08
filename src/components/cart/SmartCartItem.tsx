/**
 * SmartCartItem - Intelligent Cart Item Component
 * 
 * Features:
 * - Self-managing with auto-optimization
 * - Real-time currency conversion
 * - Optimistic updates with error handling
 * - Smart loading states
 * - Accessibility optimized
 * - Analytics integration
 */

import React, { memo, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, ExternalLink, AlertCircle, Loader2, Package, Calendar, MapPin } from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { cartDesignTokens } from '@/styles/cart-design-system';

import { useCartItem } from '@/hooks/useCart';
import { useCurrency } from '@/hooks/unified';
import { logger } from '@/utils/logger';
import type { CartItem } from '@/types/cart';

// Helper component for "Price when added" display with currency conversion
const PriceAtAddDisplay: React.FC<{ amount: number; quote: any }> = ({ amount, quote }) => {
  const { formatAmountWithConversion, getSourceCurrency } = useCurrency({ quote });
  const [formattedAmount, setFormattedAmount] = useState<string>('...');

  React.useEffect(() => {
    const updatePrice = async () => {
      try {
        const sourceCurrency = getSourceCurrency(quote);
        const formatted = await formatAmountWithConversion(amount, sourceCurrency);
        setFormattedAmount(formatted);
      } catch (error) {
        logger.error('Failed to format price at add', { amount, quote: quote.id, error });
        const { currencyService } = await import('@/services/CurrencyService');
        const sourceCurrency = getSourceCurrency(quote);
        setFormattedAmount(currencyService.formatAmount(amount, sourceCurrency));
      }
    };

    updatePrice();
  }, [amount, quote, formatAmountWithConversion, getSourceCurrency]);

  return <>{formattedAmount}</>;
};

interface SmartCartItemProps {
  item: CartItem;
  compact?: boolean;
  showActions?: boolean;
  showMetadata?: boolean;
  className?: string;
  onRemove?: (item: CartItem) => void;
  onError?: (error: Error, item: CartItem) => void;
}

export const SmartCartItem = memo<SmartCartItemProps>(({
  item,
  compact = false,
  showActions = true,
  showMetadata = false,
  className = '',
  onRemove,
  onError
}) => {
  const { remove, isLoading } = useCartItem(item.quote);
  const { formatAmountWithConversion, getSourceCurrency } = useCurrency({ quote: item.quote });
  
  const [removeLoading, setRemoveLoading] = useState(false);
  const [displayPrice, setDisplayPrice] = useState<string>('...');
  const [error, setError] = useState<string | null>(null);

  // Format price with currency conversion from origin to customer preferred currency
  React.useEffect(() => {
    const updatePrice = async () => {
      try {
        // Get the actual origin currency for this quote
        const sourceCurrency = getSourceCurrency(item.quote);
        const formatted = await formatAmountWithConversion(item.quote.final_total_origincurrency, sourceCurrency);
        setDisplayPrice(formatted);
      } catch (err) {
        logger.error('Failed to format price', { quoteId: item.id, error: err });
        // Better fallback using source currency instead of hardcoded USD
        const sourceCurrency = getSourceCurrency(item.quote);
        const { currencyService } = await import('@/services/CurrencyService');
        const fallbackFormatted = currencyService.formatAmount(item.quote.final_total_origincurrency, sourceCurrency);
        setDisplayPrice(fallbackFormatted);
      }
    };

    updatePrice();
  }, [item.quote.final_total_origincurrency, formatAmountWithConversion, item.id, getSourceCurrency, item.quote]);

  // Memoized calculations for performance
  const itemDetails = useMemo(() => {
    const quote = item.quote;
    
    // Parse items from JSONB
    let items: any[] = [];
    try {
      items = Array.isArray(quote.items) ? quote.items : JSON.parse(quote.items as string);
    } catch (err) {
      logger.warn('Failed to parse quote items', { quoteId: quote.id });
    }

    const totalItems = items.length;
    const firstItem = items[0];
    const hasMultipleItems = totalItems > 1;

    return {
      items,
      totalItems,
      firstItem,
      hasMultipleItems,
      displayName: firstItem?.name || `Quote ${quote.display_id || quote.id.slice(0, 8)}`,
      imageUrl: firstItem?.image || null,
      productUrl: firstItem?.url || null
    };
  }, [item.quote]);

  // Status badge variant
  const statusVariant = useMemo(() => {
    switch (item.quote.status) {
      case 'approved': return 'default';
      case 'pending': return 'secondary';
      case 'rejected': return 'destructive';
      case 'paid': return 'success';
      default: return 'outline';
    }
  }, [item.quote.status]);

  // Handle remove with optimistic updates
  const handleRemove = useCallback(async () => {
    if (removeLoading) return;

    setRemoveLoading(true);
    setError(null);

    try {
      logger.info('Removing item from cart', { quoteId: item.id });
      await remove();
      onRemove?.(item);
      logger.info('Item removed successfully', { quoteId: item.id });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove item';
      setError(errorMessage);
      logger.error('Failed to remove cart item', { quoteId: item.id, error: err });
      onError?.(err as Error, item);
    } finally {
      setRemoveLoading(false);
    }
  }, [item, remove, removeLoading, onRemove, onError]);

  // Compact view for mobile/sidebar
  if (compact) {
    return (
      <Card className={`transition-all duration-200 hover:shadow-md ${className}`}>
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            {/* Product Image */}
            {itemDetails.imageUrl ? (
              <img 
                src={itemDetails.imageUrl} 
                alt={itemDetails.displayName}
                className="w-12 h-12 object-cover rounded-lg bg-gray-100"
                loading="lazy"
              />
            ) : (
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-gray-400" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm truncate">
                {itemDetails.displayName}
              </h3>
              
              {itemDetails.hasMultipleItems && (
                <p className="text-xs text-gray-500">
                  +{itemDetails.totalItems - 1} more items
                </p>
              )}

              <div className="flex items-center gap-2 mt-1">
                <Badge variant={statusVariant as any} className="text-xs">
                  {item.quote.status}
                </Badge>
                <span className="font-semibold text-sm">{displayPrice}</span>
              </div>
            </div>

            {/* Actions */}
            {showActions && (
              <div className="flex items-center gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemove}
                        disabled={removeLoading || isLoading}
                        className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
                      >
                        {removeLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Remove from cart</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>

          {error && (
            <Alert className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }

  // Full view for cart page
  return (
    <Card className={`${cartDesignTokens.components.card.interactive} ${cartDesignTokens.animations.transition.all} ${className}`}>
      <CardContent className={cartDesignTokens.spacing.component.comfortable}>
        <div className={cartDesignTokens.layout.flex.itemRow}>
          {/* Product Image */}
          <div className="flex-shrink-0">
            {itemDetails.imageUrl ? (
              <img 
                src={itemDetails.imageUrl} 
                alt={itemDetails.displayName}
                className="w-20 h-20 object-cover rounded-lg bg-gray-100"
                loading="lazy"
              />
            ) : (
              <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                <Package className="w-8 h-8 text-gray-400" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h3 className={`${cartDesignTokens.typography.title.small} mb-1`}>
                  {itemDetails.productUrl ? (
                    <a 
                      href={itemDetails.productUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${cartDesignTokens.colors.interactive.primary} ${cartDesignTokens.layout.flex.itemRow} ${cartDesignTokens.animations.transition.colors}`}
                    >
                      {itemDetails.displayName}
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  ) : (
                    itemDetails.displayName
                  )}
                </h3>

                <div className={`${cartDesignTokens.layout.flex.itemRow} ${cartDesignTokens.typography.body.small} ${cartDesignTokens.colors.text.muted}`}>
                  <span>Quote {item.quote.display_id || `#${item.id.slice(0, 8)}`}</span>
                  {item.quote.origin_country && (
                    <>
                      <span>•</span>
                      <span className={cartDesignTokens.layout.flex.itemRow}>
                        <MapPin className="w-3 h-3" />
                        {item.quote.origin_country} → {item.quote.destination_country}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {showActions && (
                <div className="flex items-center gap-2 ml-4">
                  <Link to={`/quotes/${item.id}`}>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </Link>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRemove}
                          disabled={removeLoading || isLoading}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          {removeLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Remove from cart</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </div>

            {/* Item Details */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-4">
                <Badge variant={statusVariant as any}>
                  {item.quote.status}
                </Badge>
                
                {itemDetails.hasMultipleItems && (
                  <span className="text-sm text-gray-600">
                    {itemDetails.totalItems} items in this quote
                  </span>
                )}
              </div>

              <div className={`${cartDesignTokens.typography.price.primary} ${cartDesignTokens.colors.interactive.success}`}>
                {displayPrice}
              </div>
            </div>

            {/* Metadata */}
            {showMetadata && (
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 pt-4 border-t">
                <div className="space-y-1">
                  <p className="font-medium">Added to cart</p>
                  <p className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(item.addedAt, 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
                
                {item.metadata?.priceAtAdd && (
                  <div className="space-y-1">
                    <p className="font-medium">Price when added</p>
                    <p>
                      <PriceAtAddDisplay amount={item.metadata.priceAtAdd} quote={item.quote} />
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Error Display */}
            {error && (
              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

SmartCartItem.displayName = 'SmartCartItem';

// Loading skeleton for cart items
export const SmartCartItemSkeleton = memo<{ compact?: boolean }>(({ compact = false }) => {
  if (compact) {
    return (
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="w-8 h-8 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex gap-4">
          <Skeleton className="w-20 h-20 rounded-lg" />
          <div className="flex-1 space-y-3">
            <div className="space-y-2">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-8 w-32" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="w-24 h-9" />
            <Skeleton className="w-9 h-9" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

SmartCartItemSkeleton.displayName = 'SmartCartItemSkeleton';

export default SmartCartItem;