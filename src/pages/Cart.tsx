/**
 * Cart Page - Full Cart Management Interface
 * 
 * Features:
 * - Complete cart management
 * - Real-time updates and sync
 * - Smart filtering and sorting
 * - Bulk operations
 * - Analytics integration
 * - Mobile-responsive design
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, 
  Package, 
  ArrowLeft, 
  RotateCcw,
  Trash2,
  Filter,
  SortDesc,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  RefreshCw
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

import { SmartCartItem, SmartCartItemSkeleton } from '@/components/cart/SmartCartItem';
import { CartSummary } from '@/components/cart/CartSummary';
import { useCart, useCartSync, useCartAnalytics, useCartCurrency } from '@/hooks/useCart';
import { logger } from '@/utils/logger';

type SortOption = 'newest' | 'oldest' | 'price_high' | 'price_low' | 'status';
type FilterOption = 'all' | 'approved' | 'pending' | 'paid';

// Helper component for currency-aware analytics values - memoized for performance
const AnalyticsValue: React.FC<{ value: number }> = React.memo(({ value }) => {
  const { formatAmount } = useCartCurrency();
  const [formattedValue, setFormattedValue] = useState<string>('...');

  React.useEffect(() => {
    const updateValue = async () => {
      try {
        // Analytics values are in USD, convert to display currency
        const formatted = await formatAmount(value, 'USD');
        setFormattedValue(formatted.replace(/\.\d+$/, '')); // Remove decimals for cleaner display
      } catch (error) {
        logger.error('Failed to format analytics value', { value, error });
        setFormattedValue(`$${Math.round(value)}`); // Fallback
      }
    };

    updateValue();
  }, [value, formatAmount]);

  return <>{formattedValue}</>;
});

AnalyticsValue.displayName = 'AnalyticsValue';

const Cart: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const { items, clearCart, isLoading } = useCart();
  const { syncStatus, sync, canUndo, undo } = useCartSync();
  const analytics = useCartAnalytics();

  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [clearingCart, setClearingCart] = useState(false);

  // Sort and filter items
  const filteredAndSortedItems = useMemo(() => {
    let filtered = items;

    // Apply filter
    if (filterBy !== 'all') {
      filtered = items.filter(item => item.quote.status === filterBy);
    }

    // Apply sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
        case 'oldest':
          return new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
        case 'price_high':
          return b.quote.final_total_origincurrency - a.quote.final_total_origincurrency;
        case 'price_low':
          return a.quote.final_total_origincurrency - b.quote.final_total_origincurrency;
        case 'status':
          return a.quote.status.localeCompare(b.quote.status);
        default:
          return 0;
      }
    });

    return sorted;
  }, [items, sortBy, filterBy]);

  // Status counts for filter badges
  const statusCounts = useMemo(() => {
    const counts = { all: items.length, approved: 0, pending: 0, paid: 0 };
    items.forEach(item => {
      if (item.quote.status === 'approved') counts.approved++;
      else if (item.quote.status === 'pending') counts.pending++;
      else if (item.quote.status === 'paid') counts.paid++;
    });
    return counts;
  }, [items]);

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

  // Handle sync
  const handleSync = useCallback(async () => {
    try {
      logger.info('Manual cart sync triggered');
      await sync();
      logger.info('Cart synced successfully');
    } catch (error) {
      logger.error('Failed to sync cart', error);
    }
  }, [sync]);

  // Handle checkout
  const handleCheckout = useCallback(() => {
    logger.info('Proceeding to checkout', { itemCount: items.length });
    navigate('/checkout');
  }, [navigate, items.length]);

  // Handle undo
  const handleUndo = useCallback(() => {
    if (canUndo) {
      logger.info('Undoing last cart action');
      undo();
    }
  }, [canUndo, undo]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate(-1)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-6 h-6 text-teal-600" />
                <div>
                  <h1 className="text-2xl font-bold">Shopping Cart</h1>
                  <p className="text-sm text-gray-500">
                    {items.length} {items.length === 1 ? 'item' : 'items'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Sync Status */}
              <div className="flex items-center gap-2 text-sm">
                <Badge 
                  variant={
                    syncStatus === 'synced' ? 'success' : 
                    syncStatus === 'syncing' ? 'secondary' : 
                    syncStatus === 'error' ? 'destructive' : 'outline'
                  }
                  className="flex items-center gap-1"
                >
                  {syncStatus === 'syncing' && <RefreshCw className="w-3 h-3 animate-spin" />}
                  {syncStatus === 'synced' && <CheckCircle className="w-3 h-3" />}
                  {syncStatus === 'error' && <AlertCircle className="w-3 h-3" />}
                  {syncStatus === 'offline' && <Clock className="w-3 h-3" />}
                  {syncStatus}
                </Badge>
                
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleSync}
                  disabled={syncStatus === 'syncing'}
                >
                  <RefreshCw className={`w-4 h-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {canUndo && (
                  <Button variant="outline" size="sm" onClick={handleUndo}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Undo
                  </Button>
                )}
                
                {items.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleClearCart}
                    disabled={clearingCart}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear Cart
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              {/* Filters and Sort */}
              <Card className="mb-6">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium">Filter:</span>
                      </div>
                      
                      <div className="flex gap-2">
                        {(['all', 'approved', 'pending', 'paid'] as const).map(status => (
                          <Button
                            key={status}
                            variant={filterBy === status ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFilterBy(status)}
                            className="capitalize"
                          >
                            {status} {statusCounts[status] > 0 && `(${statusCounts[status]})`}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <SortDesc className="w-4 h-4 text-gray-500" />
                      <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="newest">Newest first</SelectItem>
                          <SelectItem value="oldest">Oldest first</SelectItem>
                          <SelectItem value="price_high">Price: High to low</SelectItem>
                          <SelectItem value="price_low">Price: Low to high</SelectItem>
                          <SelectItem value="status">Status</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Analytics Quick View */}
              {analytics.totalItems > 0 && (
                <Card className="mb-6">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Quick Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-teal-600">
                          <AnalyticsValue value={analytics.averageItemValue} />
                        </p>
                        <p className="text-xs text-gray-500">Avg. Value</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-blue-600">{analytics.addedToday}</p>
                        <p className="text-xs text-gray-500">Added Today</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-600">{analytics.conversionPotential}%</p>
                        <p className="text-xs text-gray-500">Conversion Potential</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Cart Items */}
              <div className="space-y-4">
                {filteredAndSortedItems.map(item => (
                  <SmartCartItem
                    key={item.id}
                    item={item}
                    showActions={true}
                    showMetadata={true}
                  />
                ))}
              </div>

              {filteredAndSortedItems.length === 0 && filterBy !== 'all' && (
                <Alert className="mt-4">
                  <Package className="h-4 w-4" />
                  <AlertDescription>
                    No items found with status "{filterBy}". 
                    <Button 
                      variant="link" 
                      className="h-auto p-0 ml-1"
                      onClick={() => setFilterBy('all')}
                    >
                      Show all items
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Cart Summary Sidebar */}
            <div className="lg:col-span-1">
              <CartSummary
                onCheckout={handleCheckout}
                showShippingEstimate={true}
                showTaxEstimate={true}
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