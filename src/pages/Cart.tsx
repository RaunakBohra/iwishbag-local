/**
 * Cart Page - Customer Shopping Cart
 * 
 * Features:
 * - Simple cart item management
 * - Real-time cart persistence
 * - Basic sorting options
 * - Mobile-responsive design
 * - Clean customer-focused interface
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { OptimizedIcon, Trash2 } from '@/components/ui/OptimizedIcon';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cartDesignTokens } from '@/styles/cart-design-system';

import { SmartCartItem, SmartCartItemSkeleton } from '@/components/cart/SmartCartItem';
import { CartSummary } from '@/components/cart/CartSummary';
import { CartUndoRedo } from '@/components/cart/CartUndoRedo';
import { DeletedItemPlaceholder } from '@/components/cart/DeletedItemPlaceholder';
import { useCart, useCartCurrency } from '@/hooks/useCart';
import { useRecentlyDeleted } from '@/stores/cartStore';
import { logger } from '@/utils/logger';



const Cart: React.FC = React.memo(() => {
  const navigate = useNavigate();
  // Use the enhanced original cart system
  const { items, clearCart, isLoading, syncStatus, historyCount } = useCart();
  const { recentlyDeleted } = useRecentlyDeleted();

  const [clearingCart, setClearingCart] = useState(false);

  // Create a combined list of items and deleted placeholders in correct positions
  const displayItems = useMemo(() => {
    const result: Array<{ type: 'item' | 'deleted'; data: any; originalPosition?: number }> = [];
    
    // Add all current items
    items.forEach((item, index) => {
      result.push({ type: 'item', data: item });
    });
    
    // Insert deleted items at their original positions
    recentlyDeleted
      .sort((a, b) => a.position - b.position) // Sort by original position
      .forEach(deleted => {
        const insertIndex = Math.min(deleted.position, result.length);
        result.splice(insertIndex, 0, { 
          type: 'deleted', 
          data: deleted, 
          originalPosition: deleted.position 
        });
      });
    
    return result;
  }, [items, recentlyDeleted]);


  // Handle clear cart
  const handleClearCart = useCallback(async () => {
    if (clearingCart || items.length === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to clear all ${items.length} items from your cart?`
    );
    
    if (!confirmed) return;

    setClearingCart(true);
    try {
      logger.info('Clearing cart', { itemCount: items.length });
      await clearCart();
      logger.info('Cart cleared successfully');
    } catch (error) {
      logger.error('Failed to clear cart', error);
      // Could show toast notification here
    } finally {
      setClearingCart(false);
    }
  }, [clearCart, clearingCart, items.length]);


  // Handle checkout
  const handleCheckout = useCallback(() => {
    logger.info('Proceeding to checkout', { itemCount: items.length });
    navigate('/checkout');
  }, [navigate, items.length]);


  return (
    <div className={`min-h-screen ${cartDesignTokens.colors.background.secondary}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Cart Page Title - Clean and minimal */}
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className={`${cartDesignTokens.layout.flex.itemRow} ${cartDesignTokens.colors.text.secondary} hover:${cartDesignTokens.colors.text.primary} px-0`}
          >
            <OptimizedIcon name="ArrowLeft" className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <div className={cartDesignTokens.layout.flex.itemRow}>
            <OptimizedIcon name="ShoppingCart" className="w-6 h-6 text-blue-600 mr-3" />
            <div className="flex-1">
              <h1 className={cartDesignTokens.typography.title.large}>
                Shopping Cart
              </h1>
              <p className={`${cartDesignTokens.typography.body.small} ${cartDesignTokens.colors.text.muted}`}>
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </p>
            </div>
            
            {/* Removed header undo/redo - moved to bottom */}
            
          </div>
        </div>
        {isLoading ? (
          // Loading State
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {[1, 2, 3].map(i => <SmartCartItemSkeleton key={i} />)}
            </div>
            <div className="lg:col-span-1">
              <Card>
                <CardContent className="p-6 space-y-4">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            </div>
          </div>
        ) : items.length === 0 && recentlyDeleted.length === 0 ? (
          // Empty State - only when no items AND no recently deleted
          <div className="text-center py-16">
            <OptimizedIcon name="ShoppingCart" className="w-24 h-24 text-gray-300 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-gray-400 mb-4">Your cart is empty</h2>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Add some quotes to your cart to get started. You can find quotes in your dashboard 
              or create a new quote request.
            </p>
            <div className="flex justify-center gap-4">
              <Button onClick={() => navigate('/dashboard')}>
                View Dashboard
              </Button>
              <Button variant="outline" onClick={() => navigate('/request-quote')}>
                Request New Quote
              </Button>
            </div>
          </div>
        ) : (
          // Main Content
          <div className={cartDesignTokens.layout.grid.cartMain}>
            {/* Cart Items */}
            <div className={cartDesignTokens.layout.grid.cartItems}>


              {/* Cart Items and Deleted Item Placeholders */}
              <div className="space-y-4">
                {displayItems.map((displayItem, index) => {
                  if (displayItem.type === 'item') {
                    return (
                      <SmartCartItem
                        key={displayItem.data.id}
                        item={displayItem.data}
                        showActions={true}
                      />
                    );
                  } else {
                    return (
                      <DeletedItemPlaceholder
                        key={`deleted-${displayItem.data.item.id}-${displayItem.data.deletedAt.getTime()}`}
                        deletedItem={displayItem.data}
                        onUndo={() => {
                          logger.info('Item restored via contextual undo', { 
                            quoteId: displayItem.data.item.id,
                            originalPosition: displayItem.data.position
                          });
                        }}
                      />
                    );
                  }
                })}
                
              </div>

            </div>

            {/* Cart Summary Sidebar */}
            <div className={cartDesignTokens.layout.grid.cartSummary}>
              <CartSummary
                onCheckout={handleCheckout}
                showShippingEstimate={false}
                showTaxEstimate={false}
              />
              
            </div>
          </div>
          
        )}
      </div>
    </div>
  );
});

Cart.displayName = 'Cart';

export default Cart;