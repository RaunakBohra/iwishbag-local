/**
 * DeletedItemPlaceholder - Shows where a deleted item was with undo option
 * 
 * Features:
 * - Shows in exact position where item was deleted
 * - Undo button to restore the specific deleted item
 * - Auto-disappears after timeout
 * - Clean visual indication of deleted state
 */

import React, { memo, useCallback, useState, useEffect } from 'react';
import { Undo2, Loader2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cartDesignTokens } from '@/styles/cart-design-system';
import { useRecentlyDeleted } from '@/stores/cartStore';
import { useCurrency } from '@/hooks/unified';
import { logger } from '@/utils/logger';

// RecentlyDeletedItem interface
interface RecentlyDeletedItem {
  item: any; // CartItem
  deletedAt: Date;
  position: number;
}

interface DeletedItemPlaceholderProps {
  deletedItem: RecentlyDeletedItem;
  onUndo?: (item: RecentlyDeletedItem) => void;
  className?: string;
}

export const DeletedItemPlaceholder = memo<DeletedItemPlaceholderProps>(({
  deletedItem,
  onUndo,
  className = ''
}) => {
  const { undoDeleteItem, clearRecentlyDeleted } = useRecentlyDeleted();
  const { formatAmountWithConversion, getSourceCurrency } = useCurrency({ quote: deletedItem.item.quote });
  
  const [isUndoing, setIsUndoing] = useState(false);
  const [displayPrice, setDisplayPrice] = useState<string>('...');
  // Format price
  React.useEffect(() => {
    const updatePrice = async () => {
      try {
        const sourceCurrency = getSourceCurrency(deletedItem.item.quote);
        const formatted = await formatAmountWithConversion(
          deletedItem.item.quote.final_total_origincurrency, 
          sourceCurrency
        );
        setDisplayPrice(formatted);
      } catch (err) {
        logger.error('Failed to format deleted item price', { quoteId: deletedItem.item.id, error: err });
        setDisplayPrice('Price unavailable');
      }
    };

    updatePrice();
  }, [deletedItem.item.quote, formatAmountWithConversion, getSourceCurrency]);

  // No auto-hide timer - undo button persists until page refresh or manual action

  // Parse item details
  const itemDetails = React.useMemo(() => {
    const quote = deletedItem.item.quote;
    
    // Parse items from JSONB
    let items: any[] = [];
    try {
      items = Array.isArray(quote.items) ? quote.items : JSON.parse(quote.items as string);
    } catch (err) {
      logger.warn('Failed to parse quote items for deleted item', { quoteId: quote.id });
    }

    const firstItem = items[0];
    const totalItems = items.length;

    return {
      items,
      totalItems,
      firstItem,
      hasMultipleItems: totalItems > 1,
      displayName: firstItem?.name || `Quote ${quote.display_id || quote.id.slice(0, 8)}`,
      imageUrl: firstItem?.image || null
    };
  }, [deletedItem.item.quote]);

  // Handle undo
  const handleUndo = useCallback(async () => {
    if (isUndoing) return;

    setIsUndoing(true);
    try {
      logger.info('Undoing item deletion', { quoteId: deletedItem.item.id });
      await undoDeleteItem(deletedItem.item.id);
      onUndo?.(deletedItem);
      logger.info('Item deletion undone successfully', { quoteId: deletedItem.item.id });
    } catch (err) {
      logger.error('Failed to undo item deletion', { quoteId: deletedItem.item.id, error: err });
    } finally {
      setIsUndoing(false);
    }
  }, [deletedItem, undoDeleteItem, onUndo, isUndoing]);

  // Always show - no auto-hide based on timer

  return (
    <div className={`flex items-center justify-center py-3 px-4 bg-gray-50/80 border border-dashed border-gray-300 rounded-lg transition-all duration-200 ${className}`}>
      <div className="flex items-center gap-3 text-gray-500">
        <Package className="w-4 h-4" />
        
        <span className="text-sm font-medium truncate max-w-48">
          {itemDetails.displayName}
        </span>
        
        <span className="text-xs text-gray-400">removed</span>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUndo}
                disabled={isUndoing}
                className="h-7 px-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50/50 border border-blue-200"
              >
                {isUndoing ? (
                  <Loader2 className="w-3 h-3" />
                ) : (
                  <>
                    <Undo2 className="w-3 h-3 mr-1" />
                    <span className="text-xs">Undo</span>
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Restore to cart</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
});

DeletedItemPlaceholder.displayName = 'DeletedItemPlaceholder';

export default DeletedItemPlaceholder;