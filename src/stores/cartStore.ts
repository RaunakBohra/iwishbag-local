import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CartItem {
  id: string;
  quoteId: string;
  productName: string;
  itemPrice: number;
  quantity: number;
  itemWeight: number;
  imageUrl?: string;
  deliveryDate?: string;
  countryCode: string;
  inCart: boolean;
  isSelected: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface CartStore {
  // State
  items: CartItem[];
  savedItems: CartItem[];
  selectedItems: string[];
  isLoading: boolean;
  error: string | null;

  // Actions
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  moveToSaved: (id: string) => void;
  moveToCart: (id: string) => void;
  toggleSelection: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  bulkDelete: (ids: string[]) => void;
  bulkMove: (ids: string[], toSaved: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  syncWithServer: () => Promise<void>;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      // Initial state
      items: [],
      savedItems: [],
      selectedItems: [],
      isLoading: false,
      error: null,

      // Actions
      addItem: (item: CartItem) => {
        set((state) => ({
          items: [...state.items, { ...item, isSelected: false }]
        }));
        // Sync with server in background
        get().syncWithServer();
      },

      removeItem: (id: string) => {
        set((state) => ({
          items: state.items.filter(item => item.id !== id),
          selectedItems: state.selectedItems.filter(itemId => itemId !== id)
        }));
        get().syncWithServer();
      },

      updateQuantity: (id: string, quantity: number) => {
        if (quantity <= 0) {
          get().removeItem(id);
          return;
        }

        set((state) => ({
          items: state.items.map(item =>
            item.id === id ? { ...item, quantity, updatedAt: new Date() } : item
          )
        }));
        get().syncWithServer();
      },

      moveToSaved: (id: string) => {
        set((state) => {
          const item = state.items.find(item => item.id === id);
          if (!item) return state;

          return {
            items: state.items.filter(item => item.id !== id),
            savedItems: [...state.savedItems, { ...item, inCart: false, isSelected: false }],
            selectedItems: state.selectedItems.filter(itemId => itemId !== id)
          };
        });
        get().syncWithServer();
      },

      moveToCart: (id: string) => {
        set((state) => {
          const item = state.savedItems.find(item => item.id === id);
          if (!item) return state;

          return {
            savedItems: state.savedItems.filter(item => item.id !== id),
            items: [...state.items, { ...item, inCart: true, isSelected: false }],
            selectedItems: state.selectedItems.filter(itemId => itemId !== id)
          };
        });
        get().syncWithServer();
      },

      toggleSelection: (id: string) => {
        set((state) => ({
          selectedItems: state.selectedItems.includes(id)
            ? state.selectedItems.filter(itemId => itemId !== id)
            : [...state.selectedItems, id]
        }));
      },

      selectAll: () => {
        set((state) => ({
          selectedItems: [...state.items, ...state.savedItems].map(item => item.id)
        }));
      },

      clearSelection: () => {
        set({ selectedItems: [] });
      },

      bulkDelete: (ids: string[]) => {
        set((state) => ({
          items: state.items.filter(item => !ids.includes(item.id)),
          savedItems: state.savedItems.filter(item => !ids.includes(item.id)),
          selectedItems: state.selectedItems.filter(id => !ids.includes(id))
        }));
        get().syncWithServer();
      },

      bulkMove: (ids: string[], toSaved: boolean) => {
        set((state) => {
          if (toSaved) {
            const itemsToMove = state.items.filter(item => ids.includes(item.id));
            return {
              items: state.items.filter(item => !ids.includes(item.id)),
              savedItems: [...state.savedItems, ...itemsToMove.map(item => ({ ...item, inCart: false, isSelected: false }))],
              selectedItems: state.selectedItems.filter(id => !ids.includes(id))
            };
          } else {
            const itemsToMove = state.savedItems.filter(item => ids.includes(item.id));
            return {
              savedItems: state.savedItems.filter(item => !ids.includes(item.id)),
              items: [...state.items, ...itemsToMove.map(item => ({ ...item, inCart: true, isSelected: false }))],
              selectedItems: state.selectedItems.filter(id => !ids.includes(id))
            };
          }
        });
        get().syncWithServer();
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },

      syncWithServer: async () => {
        const { user } = useAuth.getState?.() || {};
        if (!user) return;

        try {
          get().setLoading(true);
          get().clearError();

          // Get current state
          const { items, savedItems } = get();

          // Update cart items in database
          for (const item of items) {
            await supabase
              .from('quotes')
              .update({ 
                in_cart: true, 
                quantity: item.quantity,
                updated_at: new Date().toISOString()
              })
              .eq('id', item.quoteId);
          }

          // Update saved items in database
          for (const item of savedItems) {
            await supabase
              .from('quotes')
              .update({ 
                in_cart: false,
                quantity: item.quantity,
                updated_at: new Date().toISOString()
              })
              .eq('id', item.quoteId);
          }

        } catch (error) {
          console.error('Error syncing cart with server:', error);
          get().setError('Failed to sync cart with server');
        } finally {
          get().setLoading(false);
        }
      }
    }),
    {
      name: 'cart-storage', // localStorage key
      partialize: (state) => ({
        items: state.items,
        savedItems: state.savedItems,
        selectedItems: state.selectedItems
      })
    }
  )
); 