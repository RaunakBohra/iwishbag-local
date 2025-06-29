import { useMemo, useEffect } from 'react';
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
    hasLoadedFromServer,
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
    loadFromServer,
    selectAllCart,
    selectAllSaved,
    clearCart
  } = useCartStore();

  const { formatAmount } = useUserCurrency();

  // Cart calculations - FIXED: Use consistent calculation method
  const cartTotal = useMemo(() => {
    return items.reduce((total, item) => {
      return total + ((item.finalTotal || 0) * (item.quantity || 1));
    }, 0);
  }, [items]);

  const cartWeight = useMemo(() => {
    return items.reduce((total, item) => {
      return total + ((item.itemWeight || 0) * (item.quantity || 1));
    }, 0);
  }, [items]);

  // FIXED: Ensure selectedItemsTotal only includes cart items (not saved items)
  const selectedItemsTotal = useMemo(() => {
    const selectedCartItems = items.filter(item => selectedItems.includes(item.id));
    return selectedCartItems.reduce((total, item) => {
      return total + ((item.finalTotal || 0) * (item.quantity || 1));
    }, 0);
  }, [items, selectedItems]);

  const selectedItemsWeight = useMemo(() => {
    const selectedCartItems = items.filter(item => selectedItems.includes(item.id));
    return selectedCartItems.reduce((total, item) => {
      return total + ((item.itemWeight || 0) * (item.quantity || 1));
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

  // FIXED: Add selected cart items count (excludes saved items)
  const selectedCartItemCount = useMemo(() => {
    return items.filter(item => selectedItems.includes(item.id)).length;
  }, [items, selectedItems]);

  // Formatted values
  const formattedCartTotal = useMemo(() => {
    return formatAmount(cartTotal);
  }, [cartTotal, formatAmount]);

  const formattedSelectedTotal = useMemo(() => {
    return formatAmount(selectedItemsTotal);
  }, [selectedItemsTotal, formatAmount]);

  // FIXED: Add formatted cart total for selected items only
  const formattedSelectedCartTotal = useMemo(() => {
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

  // FIXED: Context-aware select all with better logic
  const isAllCartSelected = itemCount > 0 && getSelectedCartItems().length === itemCount;
  const isAllSavedSelected = savedItemCount > 0 && getSelectedSavedItems().length === savedItemCount;

  // FIXED: Improved select all handlers with better state management
  const handleSelectAllCart = () => {
    if (isAllCartSelected) {
      // Deselect only cart items, keep saved items selected
      const cartItemIds = items.map(item => item.id);
      const remainingSelectedItems = selectedItems.filter(id => !cartItemIds.includes(id));
      useCartStore.setState({ selectedItems: remainingSelectedItems });
    } else {
      // Select all cart items, keep existing saved items selected
      const cartItemIds = items.map(item => item.id);
      const savedItemIds = savedItems.map(item => item.id);
      const currentlySelectedSavedItems = selectedItems.filter(id => savedItemIds.includes(id));
      useCartStore.setState({ 
        selectedItems: [...cartItemIds, ...currentlySelectedSavedItems]
      });
    }
  };

  const handleSelectAllSaved = () => {
    if (isAllSavedSelected) {
      // Deselect only saved items, keep cart items selected
      const savedItemIds = savedItems.map(item => item.id);
      const remainingSelectedItems = selectedItems.filter(id => !savedItemIds.includes(id));
      useCartStore.setState({ selectedItems: remainingSelectedItems });
    } else {
      // Select all saved items, keep existing cart items selected
      const savedItemIds = savedItems.map(item => item.id);
      const cartItemIds = items.map(item => item.id);
      const currentlySelectedCartItems = selectedItems.filter(id => cartItemIds.includes(id));
      useCartStore.setState({ 
        selectedItems: [...savedItemIds, ...currentlySelectedCartItems]
      });
    }
  };

  // FIXED: Improved bulk operations with better error handling
  const handleBulkDelete = () => {
    if (hasSelectedItems) {
      bulkDelete(selectedItems);
    }
  };

  const handleBulkMoveToSaved = async () => {
    const selectedCartItemIds = getSelectedCartItems().map(item => item.id);
    if (selectedCartItemIds.length > 0) {
      await bulkMove(selectedCartItemIds, true);
    }
  };

  const handleBulkMoveToCart = async () => {
    const selectedSavedItemIds = getSelectedSavedItems().map(item => item.id);
    if (selectedSavedItemIds.length > 0) {
      await bulkMove(selectedSavedItemIds, false);
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
    hasLoadedFromServer,
    
    // Calculations
    cartTotal,
    cartWeight,
    selectedItemsTotal,
    selectedItemsWeight,
    itemCount,
    savedItemCount,
    selectedItemCount,
    selectedCartItemCount, // NEW: Selected cart items count
    
    // Formatted values
    formattedCartTotal,
    formattedSelectedTotal,
    formattedSelectedCartTotal, // NEW: Formatted selected cart total
    
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
    loadFromServer,
    selectAllCart,
    selectAllSaved,
    clearCart,
    
    // FIXED: Improved handlers
    handleSelectAllCart,
    handleSelectAllSaved,
    handleBulkDelete,
    handleBulkMoveToSaved,
    handleBulkMoveToCart,
  };
}; 