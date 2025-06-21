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
          console.log('Adding item to cart:', item);
          set((state) => {
            // Check if item already exists
            const existingItem = state.items.find(i => i.id === item.id);
            if (existingItem) {
              console.log('Item already exists in cart, updating quantity');
              return {
                items: state.items.map(i => 
                  i.id === item.id 
                    ? { ...i, quantity: i.quantity + item.quantity, updatedAt: new Date() }
                    : i
                )
              };
            }
            
            return {
              items: [...state.items, { ...item, isSelected: false }]
            };
          });
          debouncedSync();
        },

        removeItem: (id: string) => {
          console.log('Removing item from cart:', id);
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

          console.log('Updating quantity for item:', id, 'to:', quantity);
          set((state) => ({
            items: state.items.map(item =>
              item.id === id ? { ...item, quantity, updatedAt: new Date() } : item
            )
          }));
          
          debouncedSync();
        },

        moveToSaved: (id: string) => {
          console.log('Moving item to saved:', id);
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
          console.log('Moving item to cart:', id);
          set((state) => {
            const item = state.savedItems.find(item => item.id === id);
            if (!item) return state;

            return {
              savedItems: state.savedItems.filter(item => item.id !== id),
              items: [...state.items, { ...item, inCart: true, isSelected: false }]
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
          console.log('Bulk deleting items:', ids);
          set((state) => ({
            items: state.items.filter(item => !ids.includes(item.id)),
            savedItems: state.savedItems.filter(item => !ids.includes(item.id)),
            selectedItems: state.selectedItems.filter(id => !ids.includes(id))
          }));
          debouncedSync();
        },

        bulkMove: (ids: string[], toSaved: boolean) => {
          console.log('Bulk moving items:', ids, 'toSaved:', toSaved);
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
                items: [...state.items, ...itemsToMove.map(item => ({ ...item, inCart: true, isSelected: false }))]
              };
            }
          });
          debouncedSync();
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
          console.log('Setting userId in cart store:', userId);
          set({ userId });
        },

        clearCart: () => {
          console.log('Clearing all cart data');
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
            console.log('No userId, skipping server sync');
            return;
          }

          try {
            console.log('Starting server sync...');
            set({ isSyncing: true });
            get().clearError();

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

            console.log('Server sync completed successfully');
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