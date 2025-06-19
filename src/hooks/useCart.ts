import { useMemo } from 'react';
import { useCartStore, CartItem } from '@/stores/cartStore';
import { useUserCurrency } from '@/hooks/useUserCurrency';

export const useCart = () => {
  const {
    items,
    savedItems,
    selectedItems,
    isLoading,
    error,
    isSyncing,
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
    setUserId,
    syncWithServer,
    loadFromServer,
    selectAllCart,
    selectAllSaved
  } = useCartStore();

  const { formatAmount } = useUserCurrency();

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

  // New: Context-aware select all
  const isAllCartSelected = itemCount > 0 && getSelectedCartItems().length === itemCount;
  const isAllSavedSelected = savedItemCount > 0 && getSelectedSavedItems().length === savedItemCount;

  const handleSelectAllCart = () => {
    if (isAllCartSelected) {
      // Deselect only cart items, keep saved items selected
      const cartItemIds = items.map(item => item.id);
      const remainingSelectedItems = selectedItems.filter(id => !cartItemIds.includes(id));
      // Update the store directly to only deselect cart items
      useCartStore.setState({ selectedItems: remainingSelectedItems });
    } else {
      // Add all cart items to current selection
      selectAllCart();
    }
  };

  const handleSelectAllSaved = () => {
    if (isAllSavedSelected) {
      // Deselect only saved items, keep cart items selected
      const savedItemIds = savedItems.map(item => item.id);
      const remainingSelectedItems = selectedItems.filter(id => !savedItemIds.includes(id));
      // Update the store directly to only deselect saved items
      useCartStore.setState({ selectedItems: remainingSelectedItems });
    } else {
      // Add all saved items to current selection
      selectAllSaved();
    }
  };

  // Bulk operations
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
    isSyncing,
    
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
    isAllCartSelected,
    isAllSavedSelected,
    
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
    setUserId,
    syncWithServer,
    loadFromServer,
    
    // Bulk operations
    handleSelectAllCart,
    handleSelectAllSaved,
    handleBulkDelete,
    handleBulkMoveToSaved,
    handleBulkMoveToCart
  };
}; 