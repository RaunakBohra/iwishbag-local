import React, { createContext, useContext, ReactNode } from 'react';
import { useBulkSelection, type BulkSelectionState, type BulkSelectionActions } from '@/hooks/useBulkSelection';

interface BulkSelectionContextValue<T = string> extends BulkSelectionState<T>, BulkSelectionActions<T> {
  totalItems: number;
  setTotalItems: (count: number) => void;
}

const BulkSelectionContext = createContext<BulkSelectionContextValue | null>(null);

interface BulkSelectionProviderProps<T = string> {
  children: ReactNode;
  initialSelected?: T[];
}

export function BulkSelectionProvider<T = string>({ 
  children, 
  initialSelected = [] 
}: BulkSelectionProviderProps<T>) {
  const bulkSelection = useBulkSelection<T>(initialSelected);
  const [totalItems, setTotalItems] = React.useState(0);

  // Calculate if all items are selected based on total
  const isAllSelected = totalItems > 0 && bulkSelection.selectedItems.size === totalItems;
  const isIndeterminate = bulkSelection.selectedItems.size > 0 && bulkSelection.selectedItems.size < totalItems;

  const contextValue: BulkSelectionContextValue<T> = {
    ...bulkSelection,
    isAllSelected,
    isIndeterminate,
    totalItems,
    setTotalItems,
  };

  return (
    <BulkSelectionContext.Provider value={contextValue as BulkSelectionContextValue}>
      {children}
    </BulkSelectionContext.Provider>
  );
}

export function useBulkSelectionContext<T = string>(): BulkSelectionContextValue<T> {
  const context = useContext(BulkSelectionContext);
  if (!context) {
    throw new Error('useBulkSelectionContext must be used within a BulkSelectionProvider');
  }
  return context as BulkSelectionContextValue<T>;
}