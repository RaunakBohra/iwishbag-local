import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export interface CartItem {
  id: string;
  quoteId: string;
  productName: string;
  finalTotal: number;
  quantity: number;
  itemWeight: number;
  imageUrl?: string;
  deliveryDate?: string;
  countryCode: string; // Keeping for backward compatibility
  purchaseCountryCode: string; // Where we buy from (e.g., Japan)
  destinationCountryCode: string; // Where we deliver to (e.g., Nepal)
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
  isSyncing: boolean;
  hasLoadedFromServer: boolean;

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
  loadFromServer: (userId: string) => Promise<void>;
  syncWithServer: () => Promise<void>;
  debouncedSync: () => void;
  clearCart: () => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => {
      // Debounce timer for syncing
      let syncTimeout: NodeJS.Timeout | null = null;

      const debouncedSync = () => {
        if (syncTimeout) {
          clearTimeout(syncTimeout);
        }
        
        syncTimeout = setTimeout(() => {
          get().syncWithServer();
        }, 500);
      };

      return {
        // Initial state
        items: [],
        savedItems: [],
        selectedItems: [],
        isLoading: true,
        error: null,
        userId: null,
        isInitialized: false,
        isSyncing: false,
        hasLoadedFromServer: false,

        // Actions
        addItem: (item: CartItem) => {
          set((state) => {
            const existingItem = state.items.find(i => i.id === item.id);
            
            if (existingItem) {
              return {
                ...state,
                items: state.items.map(i => 
                  i.id === item.id 
                    ? { ...i, quantity: i.quantity + item.quantity }
                    : i
                )
              };
            }
            
            return {
              ...state,
              items: [...state.items, item]
            };
          });
        },

        removeItem: async (id: string) => {
          // Update local state immediately
          set((state) => ({
            ...state,
            items: state.items.filter(item => item.id !== id),
            selectedItems: state.selectedItems.filter(itemId => itemId !== id)
          }));

          // Sync with server
          try {
            const { error } = await supabase
              .from('quotes')
              .update({ in_cart: false })
              .eq('id', id);

            if (error) {
              logger.error('Error syncing removeItem with server', error, 'Cart');
              // Revert local state on error
              set((state) => ({
                ...state,
                items: [...state.items, state.items.find(item => item.id === id)].filter(Boolean)
              }));
            }
          } catch (error) {
            console.error('Error syncing removeItem with server:', error);
            // Revert local state on error
            set((state) => ({
              ...state,
              items: [...state.items, state.items.find(item => item.id === id)].filter(Boolean)
            }));
          }
        },

        updateQuantity: (id: string, quantity: number) => {
          set((state) => ({
            ...state,
            items: state.items.map(item => 
              item.id === id ? { ...item, quantity } : item
            )
          }));
        },

        moveToSaved: async (id: string) => {
          const state = get();
          const item = state.items.find(i => i.id === id);
          if (!item) return;
          
          // Update local state immediately
          set((state) => ({
            ...state,
            items: state.items.filter(i => i.id !== id),
            savedItems: [...state.savedItems, { ...item, inCart: false }],
            selectedItems: state.selectedItems.filter(itemId => itemId !== id)
          }));

          // Sync with server
          try {
            const { error } = await supabase
              .from('quotes')
              .update({ in_cart: false })
              .eq('id', id);

            if (error) {
              console.error('Error syncing moveToSaved with server:', error);
              // Revert local state on error
              set((state) => ({
                ...state,
                savedItems: state.savedItems.filter(i => i.id !== id),
                items: [...state.items, { ...item, inCart: true }]
              }));
            }
          } catch (error) {
            console.error('Error syncing moveToSaved with server:', error);
            // Revert local state on error
            set((state) => ({
              ...state,
              savedItems: state.savedItems.filter(i => i.id !== id),
              items: [...state.items, { ...item, inCart: true }]
            }));
          }
        },

        moveToCart: async (id: string) => {
          const state = get();
          const item = state.savedItems.find(i => i.id === id);
          if (!item) return;
          
          // Update local state immediately
          set((state) => ({
            ...state,
            savedItems: state.savedItems.filter(i => i.id !== id),
            items: [...state.items, { ...item, inCart: true }],
            selectedItems: state.selectedItems.filter(itemId => itemId !== id)
          }));

          // Sync with server
          try {
            const { error } = await supabase
              .from('quotes')
              .update({ in_cart: true })
              .eq('id', id);

            if (error) {
              console.error('Error syncing moveToCart with server:', error);
              // Revert local state on error
              set((state) => ({
                ...state,
                items: state.items.filter(i => i.id !== id),
                savedItems: [...state.savedItems, { ...item, inCart: false }]
              }));
            }
          } catch (error) {
            console.error('Error syncing moveToCart with server:', error);
            // Revert local state on error
            set((state) => ({
              ...state,
              items: state.items.filter(i => i.id !== id),
              savedItems: [...state.savedItems, { ...item, inCart: false }]
            }));
          }
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
          set((state) => ({
            selectedItems: []
          }));
        },

        bulkDelete: async (ids: string[]) => {
          // Store items to revert if needed
          const state = get();
          const itemsToDelete = [...state.items, ...state.savedItems].filter(item => ids.includes(item.id));
          
          // Update local state immediately
          set((state) => ({
            ...state,
            items: state.items.filter(item => !ids.includes(item.id)),
            savedItems: state.savedItems.filter(item => !ids.includes(item.id)),
            selectedItems: state.selectedItems.filter(id => !ids.includes(id))
          }));

          // Sync with server
          try {
            const { error } = await supabase
              .from('quotes')
              .update({ in_cart: false })
              .in('id', ids);

            if (error) {
              console.error('Error syncing bulkDelete with server:', error);
              // Revert local state on error
              set((state) => ({
                ...state,
                items: [...state.items, ...itemsToDelete.filter(item => !state.savedItems.some(saved => saved.id === item.id))],
                savedItems: [...state.savedItems, ...itemsToDelete.filter(item => state.savedItems.some(saved => saved.id === item.id))]
              }));
            }
          } catch (error) {
            console.error('Error syncing bulkDelete with server:', error);
            // Revert local state on error
            set((state) => ({
              ...state,
              items: [...state.items, ...itemsToDelete.filter(item => !state.savedItems.some(saved => saved.id === item.id))],
              savedItems: [...state.savedItems, ...itemsToDelete.filter(item => state.savedItems.some(saved => saved.id === item.id))]
            }));
          }
        },

        bulkMove: async (ids: string[], toSaved: boolean) => {
          const state = get();
          
          if (toSaved) {
            const itemsToMove = state.items.filter(item => ids.includes(item.id));
            
            // Update local state immediately
            set((state) => ({
              ...state,
              items: state.items.filter(item => !ids.includes(item.id)),
              savedItems: [...state.savedItems, ...itemsToMove.map(item => ({ ...item, inCart: false }))],
              selectedItems: state.selectedItems.filter(id => !ids.includes(id))
            }));

            // Sync with server
            try {
              const { error } = await supabase
                .from('quotes')
                .update({ in_cart: false })
                .in('id', ids);

              if (error) {
                console.error('Error syncing bulkMove to saved with server:', error);
                // Revert local state on error
                set((state) => ({
                  ...state,
                  savedItems: state.savedItems.filter(item => !ids.includes(item.id)),
                  items: [...state.items, ...itemsToMove.map(item => ({ ...item, inCart: true }))]
                }));
              }
            } catch (error) {
              console.error('Error syncing bulkMove to saved with server:', error);
              // Revert local state on error
              set((state) => ({
                ...state,
                savedItems: state.savedItems.filter(item => !ids.includes(item.id)),
                items: [...state.items, ...itemsToMove.map(item => ({ ...item, inCart: true }))]
              }));
            }
          } else {
            const itemsToMove = state.savedItems.filter(item => ids.includes(item.id));
            
            // Update local state immediately
            set((state) => ({
              ...state,
              savedItems: state.savedItems.filter(item => !ids.includes(item.id)),
              items: [...state.items, ...itemsToMove.map(item => ({ ...item, inCart: true }))],
              selectedItems: state.selectedItems.filter(id => !ids.includes(id))
            }));

            // Sync with server
            try {
              const { error } = await supabase
                .from('quotes')
                .update({ in_cart: true })
                .in('id', ids);

              if (error) {
                console.error('Error syncing bulkMove to cart with server:', error);
                // Revert local state on error
                set((state) => ({
                  ...state,
                  items: state.items.filter(item => !ids.includes(item.id)),
                  savedItems: [...state.savedItems, ...itemsToMove.map(item => ({ ...item, inCart: false }))]
                }));
              }
            } catch (error) {
              console.error('Error syncing bulkMove to cart with server:', error);
              // Revert local state on error
              set((state) => ({
                ...state,
                items: state.items.filter(item => !ids.includes(item.id)),
                savedItems: [...state.savedItems, ...itemsToMove.map(item => ({ ...item, inCart: false }))]
              }));
            }
          }
        },

        setLoading: (loading: boolean) => {
          set({ isLoading: loading });
        },

        setError: (error: string | null) => {
          console.error('Cart store error:', error);
          set({ error });
        },

        clearError: () => {
          set({ error: null });
        },

        setUserId: (userId: string) => {
          set({ userId });
        },

        clearCart: () => {
          set({
            items: [],
            savedItems: [],
            selectedItems: [],
            isLoading: false,
            error: null,
            hasLoadedFromServer: false
          });
          localStorage.removeItem('cartState');
        },

        syncWithServer: async () => {
          const state = get();
          if (!state.userId || state.isSyncing) return;
          
          set({ isSyncing: true });
          
          try {
            // Sync cart items (in_cart = true)
            for (const item of state.items) {
              const { error } = await supabase
                .from('quotes')
                .update({ in_cart: true })
                .eq('id', item.id);
              
              if (error) {
                console.error(`Error syncing cart item ${item.id}:`, error);
              }
            }
            
            // Sync saved items (in_cart = false)
            for (const item of state.savedItems) {
              const { error } = await supabase
                .from('quotes')
                .update({ in_cart: false })
                .eq('id', item.id);
              
              if (error) {
                console.error(`Error syncing saved item ${item.id}:`, error);
              }
            }
          } catch (error) {
            console.error('Error in syncWithServer:', error);
          } finally {
            set({ isSyncing: false });
          }
        },

        loadFromServer: async (userId: string) => {
          const state = get();
          
          // Prevent multiple simultaneous loads
          if (state.isLoading) {
            logger.debug('Cart load already in progress, skipping');
            return;
          }
          
          logger.cart('Loading cart from server', { userId });
          set({ isLoading: true, error: null });

          try {
            // Set user ID
            set({ userId });

            // Fetch all quotes in a single query (optimized for performance)
            const { data: allQuotes, error: quotesError } = await supabase
              .from('quotes')
              .select(`
                *,
                quote_items (
                  id,
                  product_name,
                  product_url,
                  quantity,
                  item_price,
                  item_weight,
                  image_url,
                  options
                )
              `)
              .eq('user_id', userId)
              .order('created_at', { ascending: false });

            if (quotesError) {
              logger.error('Error fetching quotes', quotesError, 'Cart');
              throw quotesError;
            }

            // Separate cart and saved quotes locally (more efficient than 2 DB calls)
            const cartQuotes = allQuotes?.filter(q => q.in_cart) || [];
            const savedQuotes = allQuotes?.filter(q => !q.in_cart) || [];

            // Helper function to convert quote to cart item
            const convertQuoteToCartItem = (quote: any): CartItem => {
              const firstItem = quote.quote_items?.[0];
              const quoteItems = quote.quote_items || [];
              
              // Calculate total from quote items with proper null checks
              const totalFromItems = quoteItems.reduce((sum: number, item: any) => {
                const itemPrice = item.item_price || 0;
                const itemQuantity = item.quantity || 1;
                return sum + (itemPrice * itemQuantity);
              }, 0);
              
              // FIXED: Use proper fallback chain for total price
              let totalPrice = 0;
              if (quote.final_total && quote.final_total > 0) {
                totalPrice = quote.final_total;
              } else if (quote.final_total_local && quote.final_total_local > 0) {
                totalPrice = quote.final_total_local;
              } else if (totalFromItems > 0) {
                totalPrice = totalFromItems;
              } else {
                // If no price found, use the first item's price
                totalPrice = firstItem?.item_price || 0;
              }
              
              const quantity = quote.quantity || firstItem?.quantity || 1;
              const itemWeight = firstItem?.item_weight || quote.item_weight || 0;
              
              // Extract destination country from shipping address
              let destinationCountry = quote.country_code || 'US'; // Default fallback
              if (quote.shipping_address) {
                try {
                  const shippingAddr = typeof quote.shipping_address === 'string' 
                    ? JSON.parse(quote.shipping_address) 
                    : quote.shipping_address;
                  if (shippingAddr?.country_code) {
                    destinationCountry = shippingAddr.country_code;
                  } else if (shippingAddr?.countryCode) {
                    destinationCountry = shippingAddr.countryCode;
                  }
                } catch (e) {
                  console.warn('Failed to parse shipping address:', e);
                }
              }
              
              const cartItem = {
                id: quote.id,
                quoteId: quote.id,
                productName: firstItem?.product_name || quote.product_name || 'Unknown Product',
                finalTotal: totalPrice,
                quantity: quantity,
                itemWeight: itemWeight,
                imageUrl: firstItem?.image_url || quote.image_url,
                deliveryDate: quote.delivery_date,
                countryCode: destinationCountry, // For backward compatibility
                purchaseCountryCode: quote.country_code || quote.origin_country || 'US',
                destinationCountryCode: destinationCountry,
                inCart: quote.in_cart || false,
                isSelected: false,
                createdAt: new Date(quote.created_at),
                updatedAt: new Date(quote.updated_at)
              };
              
              // FIXED: Final safety check to ensure all numeric values are valid
              const validatedCartItem = {
                ...cartItem,
                finalTotal: isNaN(cartItem.finalTotal) ? 0 : cartItem.finalTotal,
                quantity: isNaN(cartItem.quantity) ? 1 : cartItem.quantity,
                itemWeight: isNaN(cartItem.itemWeight) ? 0 : cartItem.itemWeight
              };
              
              return validatedCartItem;
            };

            // Convert quotes to cart items
            const cartItems: CartItem[] = cartQuotes.map(convertQuoteToCartItem);
            const savedItems: CartItem[] = savedQuotes.map(convertQuoteToCartItem);

            // Update state
            set({ 
              items: cartItems, 
              savedItems, 
              isLoading: false,
              hasLoadedFromServer: true,
              selectedItems: [],
              isInitialized: true
            });

            logger.cart('Cart loaded successfully from server');

          } catch (error) {
            logger.error('Error loading cart from server', error, 'Cart');
            set({ 
              error: error instanceof Error ? error.message : 'Failed to load cart',
              isLoading: false 
            });
          }
        },

        debouncedSync: debouncedSync,
      };
    },
    {
      name: 'cart-store',
      getStorage: () => localStorage,
      migrate: (persistedState, version) => {
        return persistedState;
      },
      partialize: (state) => ({
        items: state.items,
        savedItems: state.savedItems,
        selectedItems: state.selectedItems,
        userId: state.userId,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (state) {
          state.isLoading = false;
        }
      },
    }
  )
);

export function setCartStorageKey(userId: string) {
  if (userId) {
    useCartStore.persist.setOptions({
      name: `cart-store-${userId}`
    });
  }
} 