import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';

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
  syncWithServer: () => Promise<void>;
  loadFromServer: (userId: string) => Promise<void>;
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
        isLoading: false,
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

        removeItem: (id: string) => {
          set((state) => ({
            ...state,
            items: state.items.filter(item => item.id !== id),
            selectedItems: state.selectedItems.filter(itemId => itemId !== id)
          }));
        },

        updateQuantity: (id: string, quantity: number) => {
          set((state) => ({
            ...state,
            items: state.items.map(item => 
              item.id === id ? { ...item, quantity } : item
            )
          }));
        },

        moveToSaved: (id: string) => {
          set((state) => {
            const item = state.items.find(i => i.id === id);
            if (!item) return state;
            
            return {
              ...state,
              items: state.items.filter(i => i.id !== id),
              savedItems: [...state.savedItems, { ...item, inCart: false }],
              selectedItems: state.selectedItems.filter(itemId => itemId !== id)
            };
          });
        },

        moveToCart: (id: string) => {
          set((state) => {
            const item = state.savedItems.find(i => i.id === id);
            if (!item) return state;
            
            return {
              ...state,
              savedItems: state.savedItems.filter(i => i.id !== id),
              items: [...state.items, { ...item, inCart: true }],
              selectedItems: state.selectedItems.filter(itemId => itemId !== id)
            };
          });
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

        bulkDelete: (ids: string[]) => {
          set((state) => ({
            ...state,
            items: state.items.filter(item => !ids.includes(item.id)),
            savedItems: state.savedItems.filter(item => !ids.includes(item.id)),
            selectedItems: state.selectedItems.filter(id => !ids.includes(id))
          }));
        },

        bulkMove: (ids: string[], toSaved: boolean) => {
          set((state) => {
            if (toSaved) {
              const itemsToMove = state.items.filter(item => ids.includes(item.id));
              return {
                ...state,
                items: state.items.filter(item => !ids.includes(item.id)),
                savedItems: [...state.savedItems, ...itemsToMove.map(item => ({ ...item, inCart: false }))],
                selectedItems: state.selectedItems.filter(id => !ids.includes(id))
              };
            } else {
              const itemsToMove = state.savedItems.filter(item => ids.includes(item.id));
              return {
                ...state,
                savedItems: state.savedItems.filter(item => !ids.includes(item.id)),
                items: [...state.items, ...itemsToMove.map(item => ({ ...item, inCart: true }))],
                selectedItems: state.selectedItems.filter(id => !ids.includes(id))
              };
            }
          });
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
          const { userId } = get();
          if (!userId) {
            return;
          }

          set({ isLoading: true, error: null });

          try {
            // Fetch all quotes for the user
            const { data: allQuotes, error: fetchError } = await supabase
              .from('quotes')
              .select(`
                id,
                display_id,
                status,
                in_cart,
                quote_items (
                  id,
                  product_name,
                  product_url,
                  quantity,
                  item_price,
                  image_url,
                  options
                )
              `)
              .eq('user_id', userId)
              .order('created_at', { ascending: false });

            if (fetchError) {
              throw fetchError;
            }

            // Separate cart and saved items
            const cartQuotes = allQuotes?.filter(quote => quote.in_cart) || [];
            const savedQuotes = allQuotes?.filter(quote => !quote.in_cart) || [];

            // Convert quotes to cart items
            const cartItems: CartItem[] = cartQuotes.flatMap(quote => 
              quote.quote_items?.map(item => ({
                id: item.id,
                quoteId: quote.id,
                displayId: quote.display_id,
                productName: item.product_name,
                productUrl: item.product_url,
                quantity: item.quantity,
                price: item.item_price,
                imageUrl: item.image_url,
                options: item.options,
                inCart: true
              })) || []
            );

            const savedItems: CartItem[] = savedQuotes.flatMap(quote => 
              quote.quote_items?.map(item => ({
                id: item.id,
                quoteId: quote.id,
                displayId: quote.display_id,
                productName: item.product_name,
                productUrl: item.product_url,
                quantity: item.quantity,
                price: item.item_price,
                imageUrl: item.image_url,
                options: item.options,
                inCart: false
              })) || []
            );

            set({
              items: cartItems,
              savedItems: savedItems,
              isLoading: false,
              hasLoadedFromServer: true
            });

            // Save to localStorage
            localStorage.setItem('cartState', JSON.stringify({
              items: cartItems,
              savedItems: savedItems,
              selectedItems: [],
              userId
            }));

          } catch (error) {
            console.error('Error syncing cart with server:', error);
            set({ 
              error: error instanceof Error ? error.message : 'Failed to sync cart',
              isLoading: false 
            });
          }
        },

        debouncedSync: debouncedSync,

        loadFromServer: async (userId: string) => {
          try {
            console.log('Loading cart from server for userId:', userId);
            get().setLoading(true);
            get().setError(null);
            
            // Set the userId in the store first
            set({ userId });
            
            // Fetch all quotes for the user with quote_items
            const { data: allQuotes, error: quotesError } = await supabase
              .from('quotes')
              .select(`
                *,
                quote_items (*)
              `)
              .eq('user_id', userId)
              .order('created_at', { ascending: false });

            if (quotesError) {
              console.error('Error fetching quotes:', quotesError);
              throw quotesError;
            }

            console.log('Fetched quotes from server:', allQuotes?.length || 0);

            // Separate cart items (in_cart: true) from saved items (in_cart: false)
            const cartQuotes = allQuotes?.filter(quote => quote.in_cart === true) || [];
            const savedQuotes = allQuotes?.filter(quote => quote.in_cart === false) || [];

            console.log('Cart quotes:', cartQuotes.length, 'Saved quotes:', savedQuotes.length);

            // Helper function to convert quote to cart item
            const convertQuoteToCartItem = (quote: any): CartItem => {
              const firstItem = quote.quote_items?.[0];
              const quoteItems = quote.quote_items || [];
              
              // Calculate total from quote items
              const totalFromItems = quoteItems.reduce((sum: number, item: any) => {
                return sum + (item.item_price * item.quantity);
              }, 0);
              
              const totalPrice = totalFromItems || quote.final_total_local || quote.final_total || 0;
              const quantity = quote.quantity || firstItem?.quantity || 1;
              
              return {
                id: quote.id,
                quoteId: quote.id,
                productName: firstItem?.product_name || quote.product_name || 'Unknown Product',
                finalTotal: totalPrice,
                quantity: quantity,
                itemWeight: firstItem?.item_weight || quote.item_weight || 0,
                imageUrl: firstItem?.image_url || quote.image_url,
                deliveryDate: quote.delivery_date,
                countryCode: quote.country_code || 'US',
                inCart: quote.in_cart || false,
                isSelected: false,
                createdAt: new Date(quote.created_at),
                updatedAt: new Date(quote.updated_at)
              };
            };

            // Convert quotes to cart items
            const cartItems: CartItem[] = cartQuotes.map(convertQuoteToCartItem);
            const savedItems: CartItem[] = savedQuotes.map(convertQuoteToCartItem);

            console.log('Converted cart items:', cartItems.length, 'saved items:', savedItems.length);

            // Update state
            set({ 
              items: cartItems, 
              savedItems, 
              isLoading: false, 
              hasLoadedFromServer: true,
              isInitialized: true 
            });
            
            // Save to localStorage for offline access
            localStorage.setItem('cartState', JSON.stringify({
              items: cartItems,
              savedItems,
              selectedItems: [],
              userId,
              timestamp: Date.now()
            }));
            
            console.log('Cart loaded successfully from server');
            
          } catch (error) {
            console.error('Error loading cart from server:', error);
            get().setError(error instanceof Error ? error.message : 'Failed to load cart');
            get().setLoading(false);
          }
        }
      };
    },
    {
      name: 'cart-storage',
      partialize: (state) => ({
        items: state.items,
        savedItems: state.savedItems,
        selectedItems: state.selectedItems
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          console.log('Cart store rehydrated from localStorage');
          state.isInitialized = true;
        }
      },
      skipHydration: false,
      version: 3,
    }
  )
); 