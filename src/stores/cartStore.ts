import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { normalizeCountryCode } from '@/lib/addressUtils';

export interface CartItem {
  id: string;
  quoteId: string;
  productName: string;
  finalTotal: number; // Amount in USD (base currency)
  finalTotalLocal?: number; // Amount in customer's local currency
  finalCurrency?: string; // Customer's local currency code
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
  toggleSelection: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  bulkDelete: (ids: string[]) => void;
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
            const existingItem = state.items.find((i) => i.id === item.id);

            if (existingItem) {
              return {
                ...state,
                items: state.items.map((i) =>
                  i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i,
                ),
              };
            }

            return {
              ...state,
              items: [...state.items, item],
            };
          });
        },

        removeItem: async (id: string) => {
          // Update local state immediately
          set((state) => ({
            ...state,
            items: state.items.filter((item) => item.id !== id),
            selectedItems: state.selectedItems.filter((itemId) => itemId !== id),
          }));

          // Sync with server
          try {
            const { error } = await supabase.from('quotes').update({ in_cart: false }).eq('id', id);

            if (error) {
              logger.error('Error syncing removeItem with server', error, 'Cart');
              // Revert local state on error
              set((state) => ({
                ...state,
                items: [...state.items, state.items.find((item) => item.id === id)].filter(Boolean),
              }));
            }
          } catch (error) {
            console.error('Error syncing removeItem with server:', error);
            // Revert local state on error
            set((state) => ({
              ...state,
              items: [...state.items, state.items.find((item) => item.id === id)].filter(Boolean),
            }));
          }
        },

        updateQuantity: (id: string, quantity: number) => {
          set((state) => ({
            ...state,
            items: state.items.map((item) => (item.id === id ? { ...item, quantity } : item)),
          }));
        },

        toggleSelection: (id: string) => {
          set((state) => ({
            selectedItems: state.selectedItems.includes(id)
              ? state.selectedItems.filter((itemId) => itemId !== id)
              : [...state.selectedItems, id],
          }));
        },

        selectAll: () => {
          set((state) => ({
            selectedItems: state.items.map((item) => item.id),
          }));
        },

        clearSelection: () => {
          set((state) => ({
            selectedItems: [],
          }));
        },

        bulkDelete: async (ids: string[]) => {
          // Store items to revert if needed
          const state = get();
          const itemsToDelete = state.items.filter((item) => ids.includes(item.id));

          // Update local state immediately
          set((state) => ({
            ...state,
            items: state.items.filter((item) => !ids.includes(item.id)),
            selectedItems: state.selectedItems.filter((id) => !ids.includes(id)),
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
                items: [...state.items, ...itemsToDelete],
              }));
            }
          } catch (error) {
            console.error('Error syncing bulkDelete with server:', error);
            // Revert local state on error
            set((state) => ({
              ...state,
              items: [...state.items, ...itemsToDelete],
            }));
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
            selectedItems: [],
            isLoading: false,
            error: null,
            hasLoadedFromServer: false,
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

          // Handle both anonymous and authenticated users
          if (!userId) {
            logger.debug('No user ID provided, skipping cart load');
            set({ isLoading: false, hasLoadedFromServer: true });
            return;
          }

          logger.cart('Loading cart from server', { userId });
          set({ isLoading: true, error: null });

          try {
            // Set user ID
            set({ userId });

            // Fetch all quotes in a single query (optimized for performance)
            // This now works for both anonymous and authenticated users
            const { data: allQuotes, error: quotesError } = await supabase
              .from('quotes')
              .select('*')
              .eq('user_id', userId)
              .order('created_at', { ascending: false });

            // 🚨 DEBUG: Log quote data to check if local currency fields are loaded
            console.log(
              '🔍 [CartStore] Raw quote data sample:',
              allQuotes?.slice(0, 1).map((q) => ({
                id: q.id,
                final_total_usd: q.final_total_usd,
                final_total_local: q.final_total_local,
                destination_currency: q.destination_currency,
                origin_country: q.origin_country,
                destination_country: q.destination_country,
              })),
            );

            if (quotesError) {
              logger.error('Error fetching quotes', quotesError, 'Cart');
              throw quotesError;
            }

            // Filter only cart quotes (in_cart = true)
            const cartQuotes = allQuotes?.filter((q) => q.in_cart) || [];

            // Helper function to convert unified quote to cart item
            interface UnifiedQuote {
              id: string;
              items: Array<{
                id: string;
                name: string;
                quantity: number;
                price_usd: number;
                weight_kg: number;
                url?: string;
                image_url?: string;
                options?: string;
              }>;
              final_total_usd: number;
              destination_country: string;
              origin_country: string;
              currency: string;
              customer_data?: {
                shipping_address?: Record<string, unknown>;
              };
              operational_data?: {
                shipping?: {
                  delivery_estimate?: string;
                };
              };
              created_at: string;
              updated_at: string;
            }

            const convertQuoteToCartItem = (quote: UnifiedQuote): CartItem => {
              // Get first item from the JSONB items array
              const firstItem = quote.items?.[0];
              const items = quote.items || [];

              // Calculate total quantity and weight from all items
              const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
              const totalWeight = items.reduce(
                (sum, item) => sum + (item.weight_kg || 0) * (item.quantity || 1),
                0,
              );

              // Use final_total_usd directly (this is the authoritative total)
              const totalPrice = quote.final_total_usd || 0;

              // Use calculated totals from items array
              // Individual item fields are no longer needed

              // Extract destination country from shipping address or quote
              let destinationCountry = quote.destination_country || 'US'; // Default fallback
              if (quote.shipping_address) {
                try {
                  const shippingAddr =
                    typeof quote.shipping_address === 'string'
                      ? JSON.parse(quote.shipping_address)
                      : quote.shipping_address;
                  if (shippingAddr?.destination_country) {
                    destinationCountry = shippingAddr.destination_country;
                  } else if (shippingAddr?.countryCode) {
                    destinationCountry = shippingAddr.countryCode;
                  } else if (shippingAddr?.country) {
                    // Also check for 'country' field in shipping address
                    destinationCountry = shippingAddr.country;
                  }
                } catch (e) {
                  console.warn('Failed to parse shipping address:', e);
                }
              }

              // Normalize country names to country codes
              // This fixes the issue where shipping addresses contain full country names
              destinationCountry = normalizeCountryCode(destinationCountry);

              // Determine purchase country (where we buy from)
              // origin_country is the merchant location (e.g., US for Amazon.com)
              const purchaseCountry = quote.origin_country || quote.destination_country || 'US';

              // Log country data for debugging
              if (!destinationCountry || destinationCountry === 'US') {
                console.debug('Cart item country resolution:', {
                  quoteId: quote.id,
                  destinationCountry,
                  purchaseCountry,
                  quote_destination_country: quote.destination_country,
                  quote_origin_country: quote.origin_country,
                  shipping_address: quote.shipping_address,
                });
              }

              const cartItem = {
                id: quote.id,
                quoteId: quote.id,
                productName: firstItem?.name || quote.product_name || 'Unknown Product',
                finalTotal: quote.final_total_usd || totalPrice, // USD amount
                finalTotalLocal: quote.final_total_local, // Local currency amount
                finalCurrency: quote.destination_currency, // Local currency code
                quantity: totalQuantity,
                itemWeight: totalWeight,
                imageUrl: firstItem?.image_url || quote.image_url,
                deliveryDate: quote.delivery_date,
                countryCode: destinationCountry, // For backward compatibility
                purchaseCountryCode: purchaseCountry,
                destinationCountryCode: destinationCountry,
                inCart: quote.in_cart || false,
                isSelected: false,
                createdAt: new Date(quote.created_at),
                updatedAt: new Date(quote.updated_at),
              };

              // 🚨 DEBUG: Log currency conversion details
              console.log('🔍 [CartStore] Converting quote to cart item:', {
                quoteId: quote.id,
                rawQuote: {
                  final_total_usd: quote.final_total_usd,
                  final_total_local: quote.final_total_local,
                  destination_currency: quote.destination_currency,
                  origin_country: quote.origin_country,
                  destination_country: quote.destination_country,
                },
                cartItem: {
                  finalTotal: cartItem.finalTotal,
                  finalTotalLocal: cartItem.finalTotalLocal,
                  finalCurrency: cartItem.finalCurrency,
                  purchaseCountryCode: cartItem.purchaseCountryCode,
                  destinationCountryCode: cartItem.destinationCountryCode,
                },
              });

              // FIXED: Final safety check to ensure all numeric values are valid
              const validatedCartItem = {
                ...cartItem,
                finalTotal: isNaN(cartItem.finalTotal) ? 0 : cartItem.finalTotal,
                finalTotalLocal:
                  cartItem.finalTotalLocal && !isNaN(cartItem.finalTotalLocal)
                    ? cartItem.finalTotalLocal
                    : undefined,
                quantity: isNaN(cartItem.quantity) ? 1 : cartItem.quantity,
                itemWeight: isNaN(cartItem.itemWeight) ? 0 : cartItem.itemWeight,
              };

              return validatedCartItem;
            };

            // Convert quotes to cart items
            const cartItems: CartItem[] = cartQuotes.map(convertQuoteToCartItem);

            // Update state
            set({
              items: cartItems,
              isLoading: false,
              hasLoadedFromServer: true,
              selectedItems: [],
              isInitialized: true,
            });

            // 🚨 DEBUG: Log final cart state after successful load
            console.log('🔍 [CartStore] Cart state updated after load:', {
              cartItemsCount: cartItems.length,
              isLoading: false,
              hasLoadedFromServer: true,
              cartItems: cartItems.slice(0, 2).map((item) => ({
                id: item.id,
                quoteId: item.quoteId,
                finalTotal: item.finalTotal,
              })),
            });

            logger.cart('Cart loaded successfully from server');
          } catch (error) {
            logger.error('Error loading cart from server', error, 'Cart');
            set({
              error: error instanceof Error ? error.message : 'Failed to load cart',
              isLoading: false,
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
        selectedItems: state.selectedItems,
        userId: state.userId,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (state) {
          state.isLoading = false;
        }
      },
    },
  ),
);

export function setCartStorageKey(userId: string) {
  if (userId) {
    useCartStore.persist.setOptions({
      name: `cart-store-${userId}`,
    });
  }
}
