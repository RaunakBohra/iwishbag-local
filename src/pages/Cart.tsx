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
import { 
  ShoppingCart, 
  ArrowLeft, 
  Trash2
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cartDesignTokens } from '@/styles/cart-design-system';

import { SmartCartItem, SmartCartItemSkeleton } from '@/components/cart/SmartCartItem';
import { CartSummary } from '@/components/cart/CartSummary';
import { useCart, useCartCurrency } from '@/hooks/useCart';
import { logger } from '@/utils/logger';

type SortOption = 'newest' | 'oldest' | 'price_high' | 'price_low';


const Cart: React.FC = React.memo(() => {
  const navigate = useNavigate();
  // Use the enhanced original cart system
  const { items, clearCart, isLoading, syncStatus } = useCart();

  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [clearingCart, setClearingCart] = useState(false);

  // Sort items (no complex filtering needed for customers)
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
        case 'oldest':
          return new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
        case 'price_high':
          return b.quote.final_total_origincurrency - a.quote.final_total_origincurrency;
        case 'price_low':
          return a.quote.final_total_origincurrency - b.quote.final_total_origincurrency;
        default:
          return 0;
      }
    });
  }, [items, sortBy]);


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
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <div className={cartDesignTokens.layout.flex.itemRow}>
            <ShoppingCart className="w-6 h-6 text-blue-600 mr-3" />
            <div>
              <h1 className={cartDesignTokens.typography.title.large}>
                Shopping Cart
              </h1>
              <p className={`${cartDesignTokens.typography.body.small} ${cartDesignTokens.colors.text.muted}`}>
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </p>
            </div>
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
        ) : items.length === 0 ? (
          // Empty State
          <div className="text-center py-16">
            <ShoppingCart className="w-24 h-24 text-gray-300 mx-auto mb-6" />
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
              {/* Simple Sort Options */}
              {items.length > 1 && (
                <Card className="mb-4">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-gray-600">
                        {items.length} {items.length === 1 ? 'item' : 'items'} in your cart
                      </span>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Sort by:</span>
                        <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                          <SelectTrigger className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="newest">Recently added</SelectItem>
                            <SelectItem value="oldest">Oldest first</SelectItem>
                            <SelectItem value="price_high">Price: High to low</SelectItem>
                            <SelectItem value="price_low">Price: Low to high</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}


              {/* Cart Items */}
              <div className="space-y-4">
                {sortedItems.map(item => (
                  <SmartCartItem
                    key={item.id}
                    item={item}
                    showActions={true}
                  />
                ))}
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