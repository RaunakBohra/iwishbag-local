import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CartItem {
  id: string;
  quoteId: string;
  productName: string;
  finalTotal: number;
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
  userId: string | null;
  isInitialized: boolean;
  isSyncing: boolean; // Track if we're currently syncing

  // Actions
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  moveToSaved: (id: string) => void;
  moveToCart: (id: string) => void;
  toggleSelection: (id: string) => void;
  selectAll: () => void;
  selectAllCart: () => void;
  selectAllSaved: () => void;
  clearSelection: () => void;
  bulkDelete: (ids: string[]) => void;
  bulkMove: (ids: string[], toSaved: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  setUserId: (userId: string) => void;
  syncWithServer: () => Promise<void>;
  loadFromServer: (userId: string) => Promise<void>;
  debouncedSync: () => void; // Debounced sync function
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => {
      // Debounce timer for syncing
      let syncTimeout: NodeJS.Timeout | null = null;

      const debouncedSync = () => {
        // Clear existing timeout
        if (syncTimeout) {
          clearTimeout(syncTimeout);
        }
        
        // Set new timeout for 500ms
        syncTimeout = setTimeout(() => {
          get().syncWithServer();
        }, 500);
      };

      // Rehydrate from localStorage on mount
      if (typeof window !== 'undefined') {
        try {
          const savedState = localStorage.getItem('cartState');
          if (savedState) {
            const parsedState = JSON.parse(savedState);
            const now = Date.now();
            const oneDay = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
            
            // Only use localStorage data if it's less than 24 hours old
            if (parsedState.timestamp && (now - parsedState.timestamp) < oneDay) {
              set({
                items: parsedState.items || [],
                savedItems: parsedState.savedItems || [],
                selectedItems: parsedState.selectedItems || [],
                isInitialized: true
              });
            } else {
              // Clear old data
              localStorage.removeItem('cartState');
            }
          }
        } catch (error) {
          // If localStorage is corrupted, clear it
          localStorage.removeItem('cartState');
        }
      }

      return {
        // Initial state
        items: [],
        savedItems: [],
        selectedItems: [],
        isLoading: false,
        error: null,
        userId: null,
        isInitialized: false,
        isSyncing: false,

        // Actions
        addItem: (item: CartItem) => {
          set((state) => ({
            items: [...state.items, { ...item, isSelected: false }],
            selectedItems: [...state.selectedItems, item.id]
          }));
          // Sync with server in background
          debouncedSync();
        },

        removeItem: (id: string) => {
          set((state) => ({
            items: state.items.filter(item => item.id !== id),
            selectedItems: state.selectedItems.filter(itemId => itemId !== id)
          }));
          debouncedSync();
        },

        updateQuantity: (id: string, quantity: number) => {
          if (quantity <= 0) {
            get().removeItem(id);
            return;
          }

          // Optimistic update - update UI immediately
          set((state) => ({
            items: state.items.map(item =>
              item.id === id ? { ...item, quantity, updatedAt: new Date() } : item
            )
          }));
          
          // Debounced sync - update server in background
          debouncedSync();
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
          debouncedSync();
        },

        moveToCart: (id: string) => {
          set((state) => {
            const item = state.savedItems.find(item => item.id === id);
            if (!item) return state;

            return {
              savedItems: state.savedItems.filter(item => item.id !== id),
              items: [...state.items, { ...item, inCart: true, isSelected: false }],
              selectedItems: [...state.selectedItems, id]
            };
          });
          debouncedSync();
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

        selectAllCart: () => {
          set((state) => ({
            selectedItems: state.items.map(item => item.id)
          }));
        },

        selectAllSaved: () => {
          set((state) => ({
            selectedItems: state.savedItems.map(item => item.id)
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
          debouncedSync();
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
                selectedItems: [...state.selectedItems, ...ids]
              };
            }
          });
          debouncedSync();
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

        setUserId: (userId: string) => {
          set({ userId });
        },

        syncWithServer: async () => {
          if (!get().userId) return;

          try {
            set({ isSyncing: true });
            get().clearError();

            // Get current state
            const { items, savedItems } = get();

            // Update cart items in database
            for (const item of items) {
              const { error } = await supabase
                .from('quotes')
                .update({ 
                  in_cart: true, 
                  quantity: item.quantity,
                  updated_at: new Date().toISOString()
                })
                .eq('id', item.quoteId);
              
              if (error) {
                console.error('Error updating cart item:', error);
                throw error;
              }
            }

            // Update saved items in database
            for (const item of savedItems) {
              const { error } = await supabase
                .from('quotes')
                .update({ 
                  in_cart: false,
                  quantity: item.quantity,
                  updated_at: new Date().toISOString()
                })
                .eq('id', item.quoteId);
              
              if (error) {
                console.error('Error updating saved item:', error);
                throw error;
              }
            }

          } catch (error) {
            console.error('Error syncing cart with server:', error);
            get().setError('Failed to sync cart with server');
          } finally {
            set({ isSyncing: false });
          }
        },

        debouncedSync: debouncedSync,

        loadFromServer: async (userId: string) => {
          try {
            setLoading(true);
            setError(null);
            
            // Fetch all quotes for the user
            const { data: allQuotes, error: quotesError } = await supabase
              .from('quotes')
              .select('*')
              .eq('user_id', userId)
              .order('created_at', { ascending: false });

            if (quotesError) {
              throw quotesError;
            }

            // Separate cart items (status: 'in_cart') from saved items (status: 'saved')
            const cartQuotes = allQuotes?.filter(quote => quote.status === 'in_cart') || [];
            const savedQuotes = allQuotes?.filter(quote => quote.status === 'saved') || [];

            // Convert quotes to cart items
            const cartItems: CartItem[] = cartQuotes.map(quote => ({
              id: quote.id,
              productName: quote.product_name || 'Unknown Product',
              productUrl: quote.product_url || '',
              imageUrl: quote.image_url || '',
              quantity: quote.quantity || 1,
              itemPrice: quote.item_price || 0,
              itemWeight: quote.item_weight || 0,
              finalTotal: quote.final_total || 0,
              countryCode: quote.country_code || 'US',
              createdAt: quote.created_at,
              updatedAt: quote.updated_at
            }));

            const savedItems: CartItem[] = savedQuotes.map(quote => ({
              id: quote.id,
              productName: quote.product_name || 'Unknown Product',
              productUrl: quote.product_url || '',
              imageUrl: quote.image_url || '',
              quantity: quote.quantity || 1,
              itemPrice: quote.item_price || 0,
              itemWeight: quote.item_weight || 0,
              finalTotal: quote.final_total || 0,
              countryCode: quote.country_code || 'US',
              createdAt: quote.created_at,
              updatedAt: quote.updated_at
            }));

            // Update state
            set({ items: cartItems, savedItems, isLoading: false });
            
            // Save to localStorage for offline access
            localStorage.setItem('cartState', JSON.stringify({
              items: cartItems,
              savedItems,
              selectedItems: [],
              userId,
              timestamp: Date.now()
            }));
            
          } catch (error) {
            setError(error instanceof Error ? error.message : 'Failed to load cart');
            setLoading(false);
          }
        }
      };
    },
    {
      name: 'cart-storage', // localStorage key
      partialize: (state) => ({
        items: state.items,
        savedItems: state.savedItems,
        selectedItems: state.selectedItems
      }),
      // Only rehydrate if we haven't loaded from server yet
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Mark as initialized so we know localStorage was loaded
          state.isInitialized = true;
        }
      },
      // Handle localStorage errors gracefully
      skipHydration: false,
      version: 3,
    }
  )
); 