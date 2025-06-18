import { useMemo } from 'react';
import { useCartStore, CartItem } from '@/stores/cartStore';
import { formatAmountForDisplay } from '@/lib/currencyUtils';

export const useCart = () => {
  const {
    items,
    savedItems,
    selectedItems,
    isLoading,
    error,
    addItem,
    removeItem,
    updateQuantity,
    moveToSaved,
    moveToCart,
    toggleSelection,
    selectAll,
    clearSelection,
    bulkDelete,
    bulkMove,
    setLoading,
    setError,
    clearError,
    syncWithServer
  } = useCartStore();

  // Cart calculations
  const cartTotal = useMemo(() => {
    return items.reduce((total, item) => {
      return total + (item.itemPrice * item.quantity);
    }, 0);
  }, [items]);

  const cartWeight = useMemo(() => {
    return items.reduce((total, item) => {
      return total + (item.itemWeight * item.quantity);
    }, 0);
  }, [items]);

  const selectedItemsTotal = useMemo(() => {
    const selectedCartItems = items.filter(item => selectedItems.includes(item.id));
    return selectedCartItems.reduce((total, item) => {
      return total + (item.itemPrice * item.quantity);
    }, 0);
  }, [items, selectedItems]);

  const selectedItemsWeight = useMemo(() => {
    const selectedCartItems = items.filter(item => selectedItems.includes(item.id));
    return selectedCartItems.reduce((total, item) => {
      return total + (item.itemWeight * item.quantity);
    }, 0);
  }, [items, selectedItems]);

  const itemCount = useMemo(() => {
    return items.length;
  }, [items]);

  const savedItemCount = useMemo(() => {
    return savedItems.length;
  }, [savedItems]);

  const selectedItemCount = useMemo(() => {
    return selectedItems.length;
  }, [selectedItems]);

  // Formatted values
  const formattedCartTotal = useMemo(() => {
    return formatAmountForDisplay(cartTotal);
  }, [cartTotal]);

  const formattedSelectedTotal = useMemo(() => {
    return formatAmountForDisplay(selectedItemsTotal);
  }, [selectedItemsTotal]);

  // Utility functions
  const isItemSelected = (id: string) => {
    return selectedItems.includes(id);
  };

  const getSelectedItems = () => {
    return [...items, ...savedItems].filter(item => selectedItems.includes(item.id));
  };

  const getSelectedCartItems = () => {
    return items.filter(item => selectedItems.includes(item.id));
  };

  const getSelectedSavedItems = () => {
    return savedItems.filter(item => selectedItems.includes(item.id));
  };

  const hasSelectedItems = selectedItemCount > 0;
  const hasCartItems = itemCount > 0;
  const hasSavedItems = savedItemCount > 0;
  const isAllSelected = selectedItemCount === (itemCount + savedItemCount) && (itemCount + savedItemCount) > 0;

  // Bulk operations
  const handleSelectAll = () => {
    if (isAllSelected) {
      clearSelection();
    } else {
      selectAll();
    }
  };

  const handleBulkDelete = () => {
    if (hasSelectedItems) {
      bulkDelete(selectedItems);
    }
  };

  const handleBulkMoveToSaved = () => {
    const selectedCartItemIds = getSelectedCartItems().map(item => item.id);
    if (selectedCartItemIds.length > 0) {
      bulkMove(selectedCartItemIds, true);
    }
  };

  const handleBulkMoveToCart = () => {
    const selectedSavedItemIds = getSelectedSavedItems().map(item => item.id);
    if (selectedSavedItemIds.length > 0) {
      bulkMove(selectedSavedItemIds, false);
    }
  };

  return {
    // State
    items,
    savedItems,
    selectedItems,
    isLoading,
    error,
    
    // Calculations
    cartTotal,
    cartWeight,
    selectedItemsTotal,
    selectedItemsWeight,
    itemCount,
    savedItemCount,
    selectedItemCount,
    
    // Formatted values
    formattedCartTotal,
    formattedSelectedTotal,
    
    // Utility functions
    isItemSelected,
    getSelectedItems,
    getSelectedCartItems,
    getSelectedSavedItems,
    
    // Computed values
    hasSelectedItems,
    hasCartItems,
    hasSavedItems,
    isAllSelected,
    
    // Actions
    addItem,
    removeItem,
    updateQuantity,
    moveToSaved,
    moveToCart,
    toggleSelection,
    selectAll,
    clearSelection,
    bulkDelete,
    bulkMove,
    setLoading,
    setError,
    clearError,
    syncWithServer,
    
    // Bulk operations
    handleSelectAll,
    handleBulkDelete,
    handleBulkMoveToSaved,
    handleBulkMoveToCart
  };
}; 