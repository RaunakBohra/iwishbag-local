import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { normalizeCountryCode } from '@/lib/addressUtils';
import { COMMON_QUERIES } from '@/lib/queryColumns';

export interface CartItem {
  id: string;
  quoteId: string;
  productName: string;
  quantity: number;
  itemWeight: number;
  imageUrl?: string;
  deliveryDate?: string;
  countryCode: string; // Keeping for backward compatibility
  purchaseCountryCode: string; // Where we buy from (e.g., Japan)
  destinationCountryCode: string; // Where we deliver to (e.g., Nepal)
  inCart: boolean;
  isSelected: boolean;
  priority?: number; // Optional priority field (may not exist in database)
  createdAt: Date;
  updatedAt: Date;
  // Full quote object for currency context - REQUIRED for currency calculations
  quote: {
    id: string;
    total_origin_currency?: number;
    origin_total_amount?: number;
    total_usd?: number;
    destination_currency?: string;
    customer_currency?: string;
    exchange_rate?: number;
    origin_country?: string;
    destination_country?: string;
    calculation_data?: any; // For accessing origin currency from calculation_data
    items?: any[]; // Quote items for display
  };
  // Legacy options for approval flow
  selectedOptions?: {
    shipping?: string;
    insurance?: boolean;
    discountCode?: string;
    adjustments?: {
      shippingAdjustment?: number;
      insuranceAdjustment?: number;
      discountAmount?: number;
    };
  };
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
  forceReload: (userId: string) => Promise<void>;
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
            // Note: In quotes_v2, we don't remove from cart by changing status
            // Cart items remain as 'approved' status, they're just not displayed if removed from UI
            // For now, we'll skip the server update to avoid breaking the quote status
            const { error } = null; // await supabase.from('quotes_v2').update({ status: 'calculated' }).eq('id', id);

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
            // Note: In quotes_v2, we don't remove from cart by changing status
            // Cart items remain as 'approved' status, they're just not displayed if removed from UI
            // For now, we'll skip the server update to avoid breaking the quote status
            const { error } = null; // await supabase.from('quotes_v2').update({ status: 'calculated' }).in('id', ids);

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
            // PERFORMANCE FIX: Bulk update with performance tracking
            const itemIds = state.items.map((item) => item.id);
            if (itemIds.length === 0) return;

            // Note: In quotes_v2, cart items are already 'approved' status
            // No server sync needed as approved quotes are automatically cart items
            // This is a significant simplification from the old system
            const { error } = null; // No server update needed

            if (error) throw error;

            logger.info('Cart synced successfully', {
              itemCount: itemIds.length,
              userId: state.userId,
            });
          } catch (error) {
            console.error('Error in syncWithServer:', error);
            logger.error('Cart sync exception', {
              error: error instanceof Error ? error.message : 'Unknown error',
              itemCount: state.items.length,
            });
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

            // PERFORMANCE FIX: Fetch cart quotes with server-side filtering
            // Temporarily disable performance tracking to isolate issue
            const { data: cartQuotes, error: quotesError } = await supabase
              .from('quotes_v2')
              .select(COMMON_QUERIES.cartItems)
              .eq('customer_id', userId)
              .eq('status', 'approved') // Cart items are approved quotes - updated for quotes_v2
              .order('created_at', { ascending: false })
              .limit(50); // Reasonable limit for cart items

            if (quotesError) {
              console.error('Cart loading error details:', quotesError);
              throw quotesError;
            }

            // Log cart data to check loaded fields
            console.log('🛍️ [CartStore] Cart quotes loaded:', {
              count: cartQuotes?.length || 0,
              fullQuoteData: cartQuotes?.slice(0, 1),
              sample: cartQuotes?.slice(0, 2).map((q) => ({
                id: q.id,
                total_usd: q.total_usd,
                total_origin_currency: q.total_origin_currency,
                customer_currency: q.customer_currency,
                origin_country: q.origin_country,
                destination_country: q.destination_country,
                status: q.status,
                // Add more fields for debugging
                quote_number: q.quote_number,
                items: q.items?.length || 0,
                itemsSample: q.items?.slice(0, 1)
              })),
            });
            
            logger.debug('[CartStore] Cart quotes loaded:', {
              count: cartQuotes?.length || 0,
              sample: cartQuotes?.slice(0, 1).map((q) => ({
                id: q.id,
                total_usd: q.total_usd,
                total_origin_currency: q.total_origin_currency,
                customer_currency: q.customer_currency,
                origin_country: q.origin_country,
                destination_country: q.destination_country,
                status: q.status,
              })),
            });

            // cartQuotes is already filtered server-side

            // Helper function to convert unified quote to cart item
            interface UnifiedQuote {
              id: string;
              quote_number: string;
              status: string;
              items: Array<{
                id: string;
                name: string;
                quantity: number;
                costprice_origin: number;
                weight: number;
                url?: string;
                image_url?: string;
                options?: string;
              }>;
              total_usd: number;
              total_origin_currency: number;
              customer_currency: string;
              destination_country: string;
              origin_country: string;
              exchange_rate?: number;
              product_name?: string;
              image_url?: string;
              delivery_date?: string;
              shipping_address?: any;
              created_at: string;
              updated_at?: string;
            }

            const convertQuoteToCartItem = (quote: UnifiedQuote): CartItem => {
              // Get first item from the JSONB items array
              const firstItem = quote.items?.[0];
              const items = quote.items || [];

              // Calculate total quantity and weight from all items
              // CRITICAL FIX: Ensure minimum quantity of 1 for cart items
              const totalQuantity = Math.max(1, items.reduce((sum, item) => sum + (item.quantity || 1), 0));
              const totalWeight = items.reduce(
                (sum, item) => sum + (item.weight || 0) * (item.quantity || 1),
                0,
              );

              // Use origin currency total as primary, fallback to USD for legacy quotes
              let totalPrice = quote.total_origin_currency || quote.total_usd || 0;
              
              // CRITICAL FIX: If totalPrice is 0, calculate from items array
              if (totalPrice === 0 && items.length > 0) {
                totalPrice = items.reduce((sum, item) => {
                  const itemPrice = item.costprice_origin || item.unit_price_origin || item.price_origin || 0;
                  const itemQty = item.quantity || 1;
                  return sum + (itemPrice * itemQty);
                }, 0);
                console.log(`🔍 [CartStore] Calculated totalPrice from items: ${totalPrice} for quote ${quote.id}`);
              }
              
              console.log(`🛍️ [CartStore] Processing quote ${quote.id}:`, {
                total_origin_currency: quote.total_origin_currency,
                total_usd: quote.total_usd,
                totalPrice,
                origin_country: quote.origin_country,
                customer_currency: quote.customer_currency,
                itemsCount: quote.items?.length || 0
              });

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
                quantity: totalQuantity,
                itemWeight: totalWeight,
                imageUrl: firstItem?.image_url || quote.image_url,
                deliveryDate: quote.delivery_date,
                countryCode: destinationCountry, // For backward compatibility
                purchaseCountryCode: purchaseCountry,
                destinationCountryCode: destinationCountry,
                inCart: quote.status === 'approved', // Cart items are approved quotes in quotes_v2
                isSelected: false,
                priority: undefined, // Priority field not available from database
                createdAt: new Date(quote.created_at),
                updatedAt: new Date(quote.updated_at || quote.created_at),
                // Full quote object with complete currency context
                quote: {
                  id: quote.id,
                  total_origin_currency: quote.total_origin_currency || totalPrice,
                  origin_total_amount: quote.total_origin_currency || totalPrice, // Alias for compatibility
                  total_usd: quote.total_usd || totalPrice,
                  destination_currency: quote.customer_currency,
                  customer_currency: quote.customer_currency,
                  exchange_rate: quote.exchange_rate,
                  origin_country: quote.origin_country,
                  destination_country: quote.destination_country,
                  // Include items array for display and calculation
                  items: quote.items || [],
                },
              };

              // Log currency conversion details for debugging
              logger.debug('[CartStore] Converting quote to cart item:', {
                quoteId: quote.id,
                rawQuote: {
                  total_usd: quote.total_usd,
                  total_origin_currency: quote.total_origin_currency,
                  customer_currency: quote.customer_currency,
                  origin_country: quote.origin_country,
                  destination_country: quote.destination_country,
                  status: quote.status,
                },
                cartItem: {
                  totalPrice: totalPrice,
                  purchaseCountryCode: cartItem.purchaseCountryCode,
                  destinationCountryCode: cartItem.destinationCountryCode,
                },
              });

              // Final safety check to ensure all numeric values are valid
              const validatedCartItem = {
                ...cartItem,
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

            // Log final cart state after successful load
            logger.debug('[CartStore] Cart state updated after load:', {
              cartItemsCount: cartItems.length,
              isLoading: false,
              hasLoadedFromServer: true,
              cartItems: cartItems.slice(0, 2).map((item) => ({
                id: item.id,
                quoteId: item.quoteId,
                total_origin_currency: item.quote?.total_origin_currency,
                total_usd: item.quote?.total_usd,
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

        forceReload: async (userId: string) => {
          console.log('🔄 [CartStore] Force reloading cart with new fixes...');
          set({
            items: [],
            selectedItems: [],
            isLoading: true,
            hasLoadedFromServer: false,
            error: null
          });
          await get().loadFromServer(userId);
          console.log('✅ [CartStore] Force reload complete');
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
