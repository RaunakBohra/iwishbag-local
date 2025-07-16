import { renderHook, act } from '@testing-library/react';
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { useCart } from '../useCart';
import { useCartStore, CartItem, setCartStorageKey } from '@/stores/cartStore';
import { useUserCurrency } from '@/hooks/useUserCurrency';
import { useUserProfile } from '@/hooks/useUserProfile';

// Mock dependencies
vi.mock('@/stores/cartStore', () => ({
  useCartStore: vi.fn(),
  setCartStorageKey: vi.fn()
}));

vi.mock('@/hooks/useUserCurrency', () => ({
  useUserCurrency: vi.fn()
}));

vi.mock('@/hooks/useUserProfile', () => ({
  useUserProfile: vi.fn()
}));

type MockCartStore = {
  items: CartItem[];
  savedItems: CartItem[];
  selectedItems: string[];
  isLoading: boolean;
  error: string | null;
  isSyncing: boolean;
  hasLoadedFromServer: boolean;
  addItem: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
  updateQuantity: ReturnType<typeof vi.fn>;
  moveToSaved: ReturnType<typeof vi.fn>;
  moveToCart: ReturnType<typeof vi.fn>;
  toggleSelection: ReturnType<typeof vi.fn>;
  selectAll: ReturnType<typeof vi.fn>;
  clearSelection: ReturnType<typeof vi.fn>;
  bulkDelete: ReturnType<typeof vi.fn>;
  bulkMove: ReturnType<typeof vi.fn>;
  setLoading: ReturnType<typeof vi.fn>;
  setError: ReturnType<typeof vi.fn>;
  clearError: ReturnType<typeof vi.fn>;
  setUserId: ReturnType<typeof vi.fn>;
  loadFromServer: ReturnType<typeof vi.fn>;
  selectAllCart: ReturnType<typeof vi.fn>;
  selectAllSaved: ReturnType<typeof vi.fn>;
  clearCart: ReturnType<typeof vi.fn>;
  setState: ReturnType<typeof vi.fn>;
};

type MockUserCurrency = {
  formatAmount: ReturnType<typeof vi.fn>;
};

type MockUserProfile = {
  data: {
    id: string;
    preferred_display_currency?: string;
  } | null;
};

const mockUseCartStore = useCartStore as unknown as vi.MockedFunction<() => MockCartStore>;
const mockUseUserCurrency = useUserCurrency as unknown as vi.MockedFunction<() => MockUserCurrency>;
const mockUseUserProfile = useUserProfile as unknown as vi.MockedFunction<() => MockUserProfile>;
const mockSetCartStorageKey = setCartStorageKey as vi.MockedFunction<typeof setCartStorageKey>;

describe('useCart', () => {
  // Mock data
  const mockUserId = 'user-123';
  const mockCartItems: CartItem[] = [
    {
      id: 'item-1',
      quoteId: 'quote-1',
      productName: 'Test Product 1',
      finalTotal: 100,
      quantity: 2,
      itemWeight: 1.5,
      imageUrl: 'image1.jpg',
      countryCode: 'US',
      purchaseCountryCode: 'US',
      destinationCountryCode: 'IN',
      inCart: true,
      isSelected: false,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    },
    {
      id: 'item-2',
      quoteId: 'quote-2',
      productName: 'Test Product 2',
      finalTotal: 200,
      quantity: 1,
      itemWeight: 2.0,
      imageUrl: 'image2.jpg',
      countryCode: 'JP',
      purchaseCountryCode: 'JP',
      destinationCountryCode: 'IN',
      inCart: true,
      isSelected: false,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    }
  ];

  const mockSavedItems: CartItem[] = [
    {
      id: 'saved-1',
      quoteId: 'quote-3',
      productName: 'Saved Product 1',
      finalTotal: 50,
      quantity: 1,
      itemWeight: 0.5,
      countryCode: 'US',
      purchaseCountryCode: 'US',
      destinationCountryCode: 'IN',
      inCart: false,
      isSelected: false,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    }
  ];

  let mockCartStore: MockCartStore;
  let mockUserCurrency: MockUserCurrency;
  let mockUserProfile: MockUserProfile;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup mock cart store
    mockCartStore = {
      items: mockCartItems,
      savedItems: mockSavedItems,
      selectedItems: [],
      isLoading: false,
      error: null,
      isSyncing: false,
      hasLoadedFromServer: true,
      addItem: vi.fn(),
      removeItem: vi.fn(),
      updateQuantity: vi.fn(),
      moveToSaved: vi.fn(),
      moveToCart: vi.fn(),
      toggleSelection: vi.fn(),
      selectAll: vi.fn(),
      clearSelection: vi.fn(),
      bulkDelete: vi.fn().mockResolvedValue(undefined),
      bulkMove: vi.fn().mockResolvedValue(undefined),
      setLoading: vi.fn(),
      setError: vi.fn(),
      clearError: vi.fn(),
      setUserId: vi.fn(),
      loadFromServer: vi.fn().mockResolvedValue(undefined),
      selectAllCart: vi.fn(),
      selectAllSaved: vi.fn(),
      clearCart: vi.fn(),
      setState: vi.fn()
    };

    // Add setState to the store mock
    (useCartStore as any).setState = mockCartStore.setState;

    mockUseCartStore.mockReturnValue(mockCartStore);

    // Setup mock user currency
    mockUserCurrency = {
      formatAmount: vi.fn((amount: number) => `$${amount.toFixed(2)}`)
    };
    mockUseUserCurrency.mockReturnValue(mockUserCurrency);

    // Setup mock user profile
    mockUserProfile = {
      data: {
        id: mockUserId,
        preferred_display_currency: 'USD'
      }
    };
    mockUseUserProfile.mockReturnValue(mockUserProfile);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization and State', () => {
    test('should return cart state when not loading', () => {
      const { result } = renderHook(() => useCart());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.items).toEqual(mockCartItems);
      expect(result.current.savedItems).toEqual(mockSavedItems);
      expect(result.current.selectedItems).toEqual([]);
    });

    test('should return loading state when cart is loading', () => {
      mockCartStore.isLoading = true;
      mockUseCartStore.mockReturnValue(mockCartStore);

      const { result } = renderHook(() => useCart());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.items).toEqual([]);
      expect(result.current.savedItems).toEqual([]);
      expect(result.current.selectedItems).toEqual([]);
    });

    test('should set storage key when user ID is available', () => {
      renderHook(() => useCart());

      expect(mockSetCartStorageKey).toHaveBeenCalledWith(mockUserId);
    });

    test('should not set storage key when user ID is null', () => {
      mockUserProfile.data = null;
      mockUseUserProfile.mockReturnValue(mockUserProfile);

      renderHook(() => useCart());

      expect(mockSetCartStorageKey).not.toHaveBeenCalled();
    });
  });

  describe('Cart Calculations', () => {
    test('should calculate cart total correctly', () => {
      const { result } = renderHook(() => useCart());

      // (100 * 2) + (200 * 1) = 400
      expect(result.current.cartTotal).toBe(400);
    });

    test('should calculate cart weight correctly', () => {
      const { result } = renderHook(() => useCart());

      // (1.5 * 2) + (2.0 * 1) = 5.0
      expect(result.current.cartWeight).toBe(5.0);
    });

    test('should handle missing finalTotal gracefully', () => {
      const itemsWithMissingTotal = [
        {
          ...mockCartItems[0],
          finalTotal: undefined as any
        },
        mockCartItems[1]
      ];
      
      mockCartStore.items = itemsWithMissingTotal;
      mockUseCartStore.mockReturnValue(mockCartStore);

      const { result } = renderHook(() => useCart());

      // Only the second item should count: 200 * 1 = 200
      expect(result.current.cartTotal).toBe(200);
    });

    test('should handle missing itemWeight gracefully', () => {
      const itemsWithMissingWeight = [
        {
          ...mockCartItems[0],
          itemWeight: undefined as any
        },
        mockCartItems[1]
      ];
      
      mockCartStore.items = itemsWithMissingWeight;
      mockUseCartStore.mockReturnValue(mockCartStore);

      const { result } = renderHook(() => useCart());

      // Only the second item should count: 2.0 * 1 = 2.0
      expect(result.current.cartWeight).toBe(2.0);
    });

    test('should handle missing quantity gracefully', () => {
      const itemsWithMissingQuantity = [
        {
          ...mockCartItems[0],
          quantity: undefined as any
        },
        mockCartItems[1]
      ];
      
      mockCartStore.items = itemsWithMissingQuantity;
      mockUseCartStore.mockReturnValue(mockCartStore);

      const { result } = renderHook(() => useCart());

      // First item: 100 * 1 (default), Second item: 200 * 1 = 300
      expect(result.current.cartTotal).toBe(300);
    });
  });

  describe('Selected Items Calculations', () => {
    test('should calculate selected items total correctly', () => {
      mockCartStore.selectedItems = ['item-1', 'item-2'];
      mockUseCartStore.mockReturnValue(mockCartStore);

      const { result } = renderHook(() => useCart());

      // Both items selected: (100 * 2) + (200 * 1) = 400
      expect(result.current.selectedItemsTotal).toBe(400);
    });

    test('should calculate selected items weight correctly', () => {
      mockCartStore.selectedItems = ['item-1'];
      mockUseCartStore.mockReturnValue(mockCartStore);

      const { result } = renderHook(() => useCart());

      // Only first item selected: 1.5 * 2 = 3.0
      expect(result.current.selectedItemsWeight).toBe(3.0);
    });

    test('should only include cart items in selected calculations, not saved items', () => {
      mockCartStore.selectedItems = ['item-1', 'saved-1'];
      mockUseCartStore.mockReturnValue(mockCartStore);

      const { result } = renderHook(() => useCart());

      // Only cart item should count: 100 * 2 = 200
      expect(result.current.selectedItemsTotal).toBe(200);
      expect(result.current.selectedItemsWeight).toBe(3.0);
    });

    test('should return zero when no items are selected', () => {
      mockCartStore.selectedItems = [];
      mockUseCartStore.mockReturnValue(mockCartStore);

      const { result } = renderHook(() => useCart());

      expect(result.current.selectedItemsTotal).toBe(0);
      expect(result.current.selectedItemsWeight).toBe(0);
    });
  });

  describe('Item Counts', () => {
    test('should return correct item counts', () => {
      const { result } = renderHook(() => useCart());

      expect(result.current.itemCount).toBe(2);
      expect(result.current.savedItemCount).toBe(1);
      expect(result.current.selectedItemCount).toBe(0);
      expect(result.current.selectedCartItemCount).toBe(0);
    });

    test('should return correct selected cart item count', () => {
      mockCartStore.selectedItems = ['item-1', 'saved-1'];
      mockUseCartStore.mockReturnValue(mockCartStore);

      const { result } = renderHook(() => useCart());

      expect(result.current.selectedItemCount).toBe(2);
      expect(result.current.selectedCartItemCount).toBe(1); // Only cart items
    });
  });

  describe('Boolean Flags', () => {
    test('should return correct boolean flags with items', () => {
      const { result } = renderHook(() => useCart());

      expect(result.current.hasSelectedItems).toBe(false);
      expect(result.current.hasCartItems).toBe(true);
      expect(result.current.hasSavedItems).toBe(true);
      expect(result.current.isAllSelected).toBe(false);
      expect(result.current.isAllCartSelected).toBe(false);
      expect(result.current.isAllSavedSelected).toBe(false);
    });

    test('should return correct flags when all items are selected', () => {
      mockCartStore.selectedItems = ['item-1', 'item-2', 'saved-1'];
      mockUseCartStore.mockReturnValue(mockCartStore);

      const { result } = renderHook(() => useCart());

      expect(result.current.hasSelectedItems).toBe(true);
      expect(result.current.isAllSelected).toBe(true);
      expect(result.current.isAllCartSelected).toBe(true);
      expect(result.current.isAllSavedSelected).toBe(true);
    });

    test('should return correct flags when only cart items are selected', () => {
      mockCartStore.selectedItems = ['item-1', 'item-2'];
      mockUseCartStore.mockReturnValue(mockCartStore);

      const { result } = renderHook(() => useCart());

      expect(result.current.hasSelectedItems).toBe(true);
      expect(result.current.isAllSelected).toBe(false);
      expect(result.current.isAllCartSelected).toBe(true);
      expect(result.current.isAllSavedSelected).toBe(false);
    });

    test('should handle empty cart correctly', () => {
      mockCartStore.items = [];
      mockCartStore.savedItems = [];
      mockCartStore.selectedItems = [];
      mockUseCartStore.mockReturnValue(mockCartStore);

      const { result } = renderHook(() => useCart());

      expect(result.current.hasCartItems).toBe(false);
      expect(result.current.hasSavedItems).toBe(false);
      expect(result.current.isAllSelected).toBe(false);
      expect(result.current.isAllCartSelected).toBe(false);
      expect(result.current.isAllSavedSelected).toBe(false);
    });
  });

  describe('Formatted Values', () => {
    test('should format cart total correctly', () => {
      const { result } = renderHook(() => useCart());

      expect(result.current.formattedCartTotal).toBe('$400.00');
      expect(mockUserCurrency.formatAmount).toHaveBeenCalledWith(400);
    });

    test('should format selected total correctly', () => {
      mockCartStore.selectedItems = ['item-1'];
      mockUseCartStore.mockReturnValue(mockCartStore);

      const { result } = renderHook(() => useCart());

      expect(result.current.formattedSelectedTotal).toBe('$200.00');
      expect(mockUserCurrency.formatAmount).toHaveBeenCalledWith(200);
    });

    test('should update formatted values when currency formatting changes', () => {
      mockUserCurrency.formatAmount = vi.fn((amount: number) => `€${amount.toFixed(2)}`);
      mockUseUserCurrency.mockReturnValue(mockUserCurrency);

      const { result } = renderHook(() => useCart());

      expect(result.current.formattedCartTotal).toBe('€400.00');
    });
  });

  describe('Utility Functions', () => {
    test('isItemSelected should work correctly', () => {
      mockCartStore.selectedItems = ['item-1'];
      mockUseCartStore.mockReturnValue(mockCartStore);

      const { result } = renderHook(() => useCart());

      expect(result.current.isItemSelected('item-1')).toBe(true);
      expect(result.current.isItemSelected('item-2')).toBe(false);
      expect(result.current.isItemSelected('nonexistent')).toBe(false);
    });

    test('getSelectedItems should return all selected items', () => {
      mockCartStore.selectedItems = ['item-1', 'saved-1'];
      mockUseCartStore.mockReturnValue(mockCartStore);

      const { result } = renderHook(() => useCart());

      const selectedItems = result.current.getSelectedItems();
      expect(selectedItems).toHaveLength(2);
      expect(selectedItems.map(item => item.id)).toEqual(['item-1', 'saved-1']);
    });

    test('getSelectedCartItems should return only selected cart items', () => {
      mockCartStore.selectedItems = ['item-1', 'saved-1'];
      mockUseCartStore.mockReturnValue(mockCartStore);

      const { result } = renderHook(() => useCart());

      const selectedCartItems = result.current.getSelectedCartItems();
      expect(selectedCartItems).toHaveLength(1);
      expect(selectedCartItems[0].id).toBe('item-1');
    });

    test('getSelectedSavedItems should return only selected saved items', () => {
      mockCartStore.selectedItems = ['item-1', 'saved-1'];
      mockUseCartStore.mockReturnValue(mockCartStore);

      const { result } = renderHook(() => useCart());

      const selectedSavedItems = result.current.getSelectedSavedItems();
      expect(selectedSavedItems).toHaveLength(1);
      expect(selectedSavedItems[0].id).toBe('saved-1');
    });
  });

  describe('Select All Handlers', () => {
    test('handleSelectAllCart should select all cart items when none selected', () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.handleSelectAllCart();
      });

      expect(mockCartStore.setState).toHaveBeenCalledWith({
        selectedItems: ['item-1', 'item-2']
      });
    });

    test('handleSelectAllCart should deselect all cart items when all selected', () => {
      mockCartStore.selectedItems = ['item-1', 'item-2'];
      mockUseCartStore.mockReturnValue(mockCartStore);

      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.handleSelectAllCart();
      });

      expect(mockCartStore.setState).toHaveBeenCalledWith({
        selectedItems: []
      });
    });

    test('handleSelectAllCart should preserve saved item selections', () => {
      mockCartStore.selectedItems = ['saved-1'];
      mockUseCartStore.mockReturnValue(mockCartStore);

      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.handleSelectAllCart();
      });

      expect(mockCartStore.setState).toHaveBeenCalledWith({
        selectedItems: ['item-1', 'item-2', 'saved-1']
      });
    });

    test('handleSelectAllSaved should select all saved items when none selected', () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.handleSelectAllSaved();
      });

      expect(mockCartStore.setState).toHaveBeenCalledWith({
        selectedItems: ['saved-1']
      });
    });

    test('handleSelectAllSaved should preserve cart item selections', () => {
      mockCartStore.selectedItems = ['item-1'];
      mockUseCartStore.mockReturnValue(mockCartStore);

      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.handleSelectAllSaved();
      });

      expect(mockCartStore.setState).toHaveBeenCalledWith({
        selectedItems: ['saved-1', 'item-1']
      });
    });
  });

  describe('Bulk Operations', () => {
    test('handleBulkDelete should delete selected items', async () => {
      mockCartStore.selectedItems = ['item-1', 'saved-1'];
      mockUseCartStore.mockReturnValue(mockCartStore);

      const { result } = renderHook(() => useCart());

      await act(async () => {
        await result.current.handleBulkDelete();
      });

      expect(mockCartStore.bulkDelete).toHaveBeenCalledWith(['item-1', 'saved-1']);
    });

    test('handleBulkDelete should not do anything when no items selected', async () => {
      const { result } = renderHook(() => useCart());

      await act(async () => {
        await result.current.handleBulkDelete();
      });

      expect(mockCartStore.bulkDelete).not.toHaveBeenCalled();
    });

    test('handleBulkMoveToSaved should move only selected cart items', async () => {
      mockCartStore.selectedItems = ['item-1', 'saved-1'];
      mockUseCartStore.mockReturnValue(mockCartStore);

      const { result } = renderHook(() => useCart());

      await act(async () => {
        await result.current.handleBulkMoveToSaved();
      });

      expect(mockCartStore.bulkMove).toHaveBeenCalledWith(['item-1'], true);
    });

    test('handleBulkMoveToCart should move only selected saved items', async () => {
      mockCartStore.selectedItems = ['item-1', 'saved-1'];
      mockUseCartStore.mockReturnValue(mockCartStore);

      const { result } = renderHook(() => useCart());

      await act(async () => {
        await result.current.handleBulkMoveToCart();
      });

      expect(mockCartStore.bulkMove).toHaveBeenCalledWith(['saved-1'], false);
    });

    test('bulk move operations should not do anything when no relevant items selected', async () => {
      mockCartStore.selectedItems = ['item-1']; // Only cart item
      mockUseCartStore.mockReturnValue(mockCartStore);

      const { result } = renderHook(() => useCart());

      await act(async () => {
        await result.current.handleBulkMoveToCart();
      });

      expect(mockCartStore.bulkMove).not.toHaveBeenCalled();
    });
  });

  describe('Action Forwarding', () => {
    test('should forward all store actions correctly', () => {
      const { result } = renderHook(() => useCart());

      // Test a few key actions to ensure they're forwarded
      expect(result.current.addItem).toBe(mockCartStore.addItem);
      expect(result.current.removeItem).toBe(mockCartStore.removeItem);
      expect(result.current.updateQuantity).toBe(mockCartStore.updateQuantity);
      expect(result.current.toggleSelection).toBe(mockCartStore.toggleSelection);
      expect(result.current.clearCart).toBe(mockCartStore.clearCart);
    });
  });

  describe('Error Handling', () => {
    test('should handle store errors correctly', () => {
      mockCartStore.error = 'Test error message';
      mockUseCartStore.mockReturnValue(mockCartStore);

      const { result } = renderHook(() => useCart());

      expect(result.current.error).toBe('Test error message');
    });

    test('should handle null error state', () => {
      mockCartStore.error = null;
      mockUseCartStore.mockReturnValue(mockCartStore);

      const { result } = renderHook(() => useCart());

      expect(result.current.error).toBe(null);
    });
  });

  describe('Sync State', () => {
    test('should reflect syncing state correctly', () => {
      mockCartStore.isSyncing = true;
      mockUseCartStore.mockReturnValue(mockCartStore);

      const { result } = renderHook(() => useCart());

      expect(result.current.isSyncing).toBe(true);
    });

    test('should reflect server load state correctly', () => {
      mockCartStore.hasLoadedFromServer = false;
      mockUseCartStore.mockReturnValue(mockCartStore);

      const { result } = renderHook(() => useCart());

      expect(result.current.hasLoadedFromServer).toBe(false);
    });
  });

  describe('Edge Cases and Performance', () => {
    test('should handle empty arrays gracefully', () => {
      mockCartStore.items = [];
      mockCartStore.savedItems = [];
      mockCartStore.selectedItems = [];
      mockUseCartStore.mockReturnValue(mockCartStore);

      const { result } = renderHook(() => useCart());

      expect(result.current.cartTotal).toBe(0);
      expect(result.current.cartWeight).toBe(0);
      expect(result.current.selectedItemsTotal).toBe(0);
      expect(result.current.itemCount).toBe(0);
      expect(result.current.getSelectedItems()).toEqual([]);
    });

    test('should handle very large numbers correctly', () => {
      const largeValueItems: CartItem[] = [
        {
          ...mockCartItems[0],
          finalTotal: 999999.99,
          quantity: 100,
          itemWeight: 999.99
        }
      ];

      mockCartStore.items = largeValueItems;
      mockUseCartStore.mockReturnValue(mockCartStore);

      const { result } = renderHook(() => useCart());

      expect(result.current.cartTotal).toBe(99999999);
      expect(result.current.cartWeight).toBe(99999);
    });

    test('should handle negative values correctly', () => {
      const negativeValueItems: CartItem[] = [
        {
          ...mockCartItems[0],
          finalTotal: -100,
          quantity: 1,
          itemWeight: -1
        }
      ];

      mockCartStore.items = negativeValueItems;
      mockUseCartStore.mockReturnValue(mockCartStore);

      const { result } = renderHook(() => useCart());

      expect(result.current.cartTotal).toBe(-100);
      expect(result.current.cartWeight).toBe(-1);
    });

    test('should handle decimal precision correctly', () => {
      const decimalItems: CartItem[] = [
        {
          ...mockCartItems[0],
          finalTotal: 10.999,
          quantity: 3,
          itemWeight: 1.333
        }
      ];

      mockCartStore.items = decimalItems;
      mockUseCartStore.mockReturnValue(mockCartStore);

      const { result } = renderHook(() => useCart());

      expect(result.current.cartTotal).toBeCloseTo(32.997, 3);
      expect(result.current.cartWeight).toBeCloseTo(3.999, 3);
    });

    test('should handle many items efficiently', () => {
      const manyItems: CartItem[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `item-${i}`,
        quoteId: `quote-${i}`,
        productName: `Product ${i}`,
        finalTotal: 10,
        quantity: 1,
        itemWeight: 0.1,
        countryCode: 'US',
        purchaseCountryCode: 'US',
        destinationCountryCode: 'IN',
        inCart: true,
        isSelected: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      mockCartStore.items = manyItems;
      mockCartStore.selectedItems = manyItems.slice(0, 500).map(item => item.id);
      mockUseCartStore.mockReturnValue(mockCartStore);

      const start = performance.now();
      const { result } = renderHook(() => useCart());
      const end = performance.now();

      expect(end - start).toBeLessThan(100); // Should complete within 100ms
      expect(result.current.cartTotal).toBe(10000);
      expect(result.current.selectedItemsTotal).toBe(5000);
      expect(result.current.itemCount).toBe(1000);
    });
  });
});