import { useState, useCallback } from 'react';

export interface BulkSelectionState<T = string> {
  selectedItems: Set<T>;
  isAllSelected: boolean;
  isIndeterminate: boolean;
}

export interface BulkSelectionActions<T = string> {
  selectItem: (id: T) => void;
  deselectItem: (id: T) => void;
  toggleItem: (id: T) => void;
  selectAll: (items: T[]) => void;
  deselectAll: () => void;
  toggleAll: (items: T[]) => void;
  isSelected: (id: T) => boolean;
  getSelectedCount: () => number;
  getSelectedArray: () => T[];
}

export function useBulkSelection<T = string>(
  initialSelected: T[] = []
): BulkSelectionState<T> & BulkSelectionActions<T> {
  const [selectedItems, setSelectedItems] = useState<Set<T>>(
    new Set(initialSelected)
  );

  const selectItem = useCallback((id: T) => {
    setSelectedItems(prev => new Set(prev).add(id));
  }, []);

  const deselectItem = useCallback((id: T) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  }, []);

  const toggleItem = useCallback((id: T) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const selectAll = useCallback((items: T[]) => {
    setSelectedItems(new Set(items));
  }, []);

  const deselectAll = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  const toggleAll = useCallback((items: T[]) => {
    const allSelected = items.every(id => selectedItems.has(id));
    if (allSelected) {
      deselectAll();
    } else {
      selectAll(items);
    }
  }, [selectedItems, selectAll, deselectAll]);

  const isSelected = useCallback((id: T) => {
    return selectedItems.has(id);
  }, [selectedItems]);

  const getSelectedCount = useCallback(() => {
    return selectedItems.size;
  }, [selectedItems]);

  const getSelectedArray = useCallback(() => {
    return Array.from(selectedItems);
  }, [selectedItems]);

  // Calculate derived state
  const isAllSelected = selectedItems.size > 0;
  const isIndeterminate = selectedItems.size > 0 && selectedItems.size < 100; // This would be calculated based on total items

  return {
    selectedItems,
    isAllSelected,
    isIndeterminate,
    selectItem,
    deselectItem,
    toggleItem,
    selectAll,
    deselectAll,
    toggleAll,
    isSelected,
    getSelectedCount,
    getSelectedArray,
  };
}