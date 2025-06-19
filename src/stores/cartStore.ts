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
  loadFromServer: (userId?: string) => Promise<void>;
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

        loadFromServer: async (userId?: string) => {
          if (!userId) {
            console.warn('No userId provided to loadFromServer');
            return;
          }

          // Set the userId in the store
          get().setUserId(userId);

          try {
            get().setLoading(true);
            get().clearError();

            console.log('Loading cart for user:', userId);

            // First, let's see all approved quotes for this user
            const { data: allQuotes, error: allQuotesError } = await supabase
              .from('quotes')
              .select(`
                id,
                product_name,
                final_total,
                final_total_local,
                quantity,
                item_weight,
                image_url,
                estimated_delivery_date,
                country_code,
                in_cart,
                created_at,
                updated_at,
                approval_status,
                quote_items (
                  id,
                  product_name,
                  item_price,
                  quantity,
                  item_weight,
                  image_url,
                  options
                )
              `)
              .eq('user_id', userId)
              .eq('approval_status', 'approved')
              .order('created_at', { ascending: false });

            if (allQuotesError) {
              console.error('Error fetching quotes:', allQuotesError);
              throw allQuotesError;
            }

            console.log('Fetched quotes:', allQuotes?.length || 0);

            // Filter quotes based on in_cart status
            const cartQuotes = allQuotes?.filter(quote => quote.in_cart === true) || [];
            const savedQuotes = allQuotes?.filter(quote => quote.in_cart === false) || [];

            console.log('Cart quotes:', cartQuotes.length, 'Saved quotes:', savedQuotes.length);

            // Convert quotes to CartItem format
            const convertQuoteToCartItem = (quote: any): CartItem => {
              const firstItem = quote.quote_items?.[0];
              return {
                id: quote.id,
                quoteId: quote.id,
                productName: quote.product_name || firstItem?.product_name || 'Unknown Product',
                itemPrice: quote.final_total_local || quote.final_total || firstItem?.item_price || 0,
                quantity: quote.quantity || firstItem?.quantity || 1,
                itemWeight: quote.item_weight || firstItem?.item_weight || 0,
                imageUrl: quote.image_url || firstItem?.image_url,
                deliveryDate: quote.estimated_delivery_date,
                countryCode: quote.country_code || 'US',
                inCart: quote.in_cart || false,
                isSelected: false,
                createdAt: new Date(quote.created_at),
                updatedAt: new Date(quote.updated_at)
              };
            };

            const cartItems = cartQuotes.map(convertQuoteToCartItem);
            const savedItems = savedQuotes.map(convertQuoteToCartItem);

            // Server data takes priority over localStorage
            set({
              items: cartItems,
              savedItems: savedItems,
              selectedItems: [],
              isInitialized: true
            });

            console.log('Cart loaded successfully from server:', { cartItems: cartItems.length, savedItems: savedItems.length });

          } catch (error) {
            console.error('Error loading cart from server:', error);
            get().setError('Failed to load cart from server');
            // If server fails, we keep localStorage data
            set({ isInitialized: true });
          } finally {
            get().setLoading(false);
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
          console.log('Cart state rehydrated from localStorage');
          // Mark as initialized so we know localStorage was loaded
          state.isInitialized = true;
        }
      },
      // Handle localStorage errors gracefully
      skipHydration: false,
      version: 1,
    }
  )
); 