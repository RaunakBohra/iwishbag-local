import { useMemo, useEffect } from 'react';
import { useCartStore, CartItem, setCartStorageKey } from '@/stores/cartStore';
import { useCurrency } from '@/hooks/useCurrency';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAuth } from '@/contexts/AuthContext';

export const useCart = () => {
  const {
    items,
    selectedItems,
    isLoading,
    error,
    isSyncing,
    hasLoadedFromServer,
    addItem,
    removeItem,
    updateQuantity,
    toggleSelection,
    selectAll,
    clearSelection,
    bulkDelete,
    setLoading,
    setError,
    clearError,
    setUserId,
    loadFromServer,
    clearCart,
  } = useCartStore();

  const userProfile = useUserProfile();
  const { user } = useAuth();
  const { formatAmount } = useCurrency(userProfile?.data?.preferred_display_currency || 'USD');

  // Use auth user ID for both anonymous and authenticated users
  const userId = user?.id || userProfile?.data?.id;

  // Set the storage key per user for cart persistence
  useEffect(() => {
    if (userId) {
      setCartStorageKey(userId);
    }
  }, [userId]);

  // Cart calculations - FIXED: Use origin currency total with fallback and items calculation
  const cartTotal = useMemo(() => {
    return items.reduce((total, item) => {
      let itemTotal = item.quote?.total_origin_currency || item.quote?.total_usd || 0;
      
      // CRITICAL FIX: If itemTotal is 0, try to calculate from items array
      if (itemTotal === 0 && item.quote?.items && item.quote.items.length > 0) {
        itemTotal = item.quote.items.reduce((itemSum: number, quoteItem: any) => {
          const itemPrice = quoteItem.costprice_origin || quoteItem.unit_price_origin || quoteItem.price_origin || 0;
          const itemQty = quoteItem.quantity || 1;
          return itemSum + (itemPrice * itemQty);
        }, 0);
      }
      
      return total + itemTotal * (item.quantity || 1);
    }, 0);
  }, [items]);

  const cartWeight = useMemo(() => {
    return items.reduce((total, item) => {
      return total + (item.itemWeight || 0) * (item.quantity || 1);
    }, 0);
  }, [items]);

  const selectedItemsTotal = useMemo(() => {
    const selectedCartItems = items.filter((item) => selectedItems.includes(item.id));
    return selectedCartItems.reduce((total, item) => {
      let itemTotal = item.quote?.total_origin_currency || item.quote?.total_usd || 0;
      
      // CRITICAL FIX: If itemTotal is 0, try to calculate from items array
      if (itemTotal === 0 && item.quote?.items && item.quote.items.length > 0) {
        itemTotal = item.quote.items.reduce((itemSum: number, quoteItem: any) => {
          const itemPrice = quoteItem.costprice_origin || quoteItem.unit_price_origin || quoteItem.price_origin || 0;
          const itemQty = quoteItem.quantity || 1;
          return itemSum + (itemPrice * itemQty);
        }, 0);
      }
      
      return total + itemTotal * (item.quantity || 1);
    }, 0);
  }, [items, selectedItems]);

  const selectedItemsWeight = useMemo(() => {
    const selectedCartItems = items.filter((item) => selectedItems.includes(item.id));
    return selectedCartItems.reduce((total, item) => {
      return total + (item.itemWeight || 0) * (item.quantity || 1);
    }, 0);
  }, [items, selectedItems]);

  const itemCount = useMemo(() => {
    return items.length;
  }, [items]);

  const selectedItemCount = useMemo(() => {
    return selectedItems.length;
  }, [selectedItems]);

  // Formatted values
  const formattedCartTotal = useMemo(() => {
    return formatAmount(cartTotal);
  }, [cartTotal, formatAmount]);

  const formattedSelectedTotal = useMemo(() => {
    return formatAmount(selectedItemsTotal);
  }, [selectedItemsTotal, formatAmount]);

  // Utility functions
  const isItemSelected = (id: string) => {
    return selectedItems.includes(id);
  };

  const getSelectedItems = () => {
    return items.filter((item) => selectedItems.includes(item.id));
  };

  const hasSelectedItems = selectedItemCount > 0;
  const hasCartItems = itemCount > 0;
  const isAllSelected = selectedItemCount === itemCount && itemCount > 0;

  const handleSelectAll = () => {
    if (isAllSelected) {
      // Deselect all items
      useCartStore.setState({ selectedItems: [] });
    } else {
      // Select all cart items
      const cartItemIds = items.map((item) => item.id);
      useCartStore.setState({ selectedItems: cartItemIds });
    }
  };

  const handleBulkDelete = async () => {
    if (hasSelectedItems) {
      await bulkDelete(selectedItems);
    }
  };

  // Wait for cart rehydration before exposing cart data
  if (isLoading && !hasLoadedFromServer) {
    return {
      isLoading: true,
      items: [],
      selectedItems: [],
      // ...other fields as needed
    };
  }

  return {
    // State
    items,
    selectedItems,
    isLoading,
    error,
    isSyncing,
    hasLoadedFromServer,

    // Computed values
    cartTotal,
    cartWeight,
    selectedItemsTotal,
    selectedItemsWeight,
    itemCount,
    selectedItemCount,
    formattedCartTotal,
    formattedSelectedTotal,

    // Boolean flags
    hasSelectedItems,
    hasCartItems,
    isAllSelected,

    // Actions
    addItem,
    removeItem,
    updateQuantity,
    toggleSelection,
    selectAll,
    clearSelection,
    bulkDelete,
    setLoading,
    setError,
    clearError,
    setUserId,
    loadFromServer,
    clearCart,

    // Utility functions
    isItemSelected,
    getSelectedItems,

    // Bulk operation handlers
    handleBulkDelete,
    handleSelectAll,
  };
};
