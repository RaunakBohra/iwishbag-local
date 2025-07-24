import { useMutation as _useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Quote as _Quote,
  QuoteStatus as _QuoteStatus,
  isValidStatusTransition as _isValidStatusTransition,
} from '@/types/quote';
import { useEmailNotifications } from './useEmailNotifications';
import { useCartStore, CartItem } from '@/stores/cartStore';
import { useAuth } from '@/contexts/AuthContext';
import { Tables } from '@/integrations/supabase/types';
import { useStatusManagement } from './useStatusManagement';
import { unifiedDataEngine } from '@/services/UnifiedDataEngine';
import type { UnifiedQuote } from '@/types/unified-quote';

export const useQuoteState = (quoteId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const {
    sendQuoteApprovedEmail: _sendQuoteApprovedEmail,
    sendQuoteRejectedEmail: _sendQuoteRejectedEmail,
  } = useEmailNotifications();
  const { loadFromServer: _loadFromServer, addItem } = useCartStore();
  const { user } = useAuth();
  const { isValidTransition } = useStatusManagement();
  const [isUpdating, setIsUpdating] = useState(false);

  // Helper function to convert unified quote to cart item
  const convertQuoteToCartItem = (quote: UnifiedQuote): CartItem => {
    const firstItem = quote.items?.[0];
    const quoteItems = quote.items || [];

    // Calculate total from quote items with proper null checks
    const totalFromItems = quoteItems.reduce((sum, item) => {
      const itemPrice = item.price_usd || 0;
      const itemQuantity = item.quantity || 1;
      return sum + itemPrice * itemQuantity;
    }, 0);

    // Use final_total_usd as the authoritative price (this comes from calculations)
    const totalPrice = quote.final_total_usd || totalFromItems || 0;

    // Calculate total quantity and weight from all items
    const totalQuantity = quoteItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
    const totalWeight = quoteItems.reduce(
      (sum, item) => sum + (item.weight_kg || 0) * (item.quantity || 1),
      0,
    );

    // Determine purchase country from the quote or product URL
    let purchaseCountry = quote.origin_country || 'US';
    const productUrl = firstItem?.url || '';
    if (productUrl.includes('amazon.in') || productUrl.includes('flipkart.com')) {
      purchaseCountry = 'IN';
    } else if (productUrl.includes('amazon.jp')) {
      purchaseCountry = 'JP';
    } else if (productUrl.includes('amazon.co.uk')) {
      purchaseCountry = 'GB';
    }

    const cartItem = {
      id: quote.id,
      quoteId: quote.id,
      productName: firstItem?.name || 'Unknown Product',
      finalTotal: totalPrice,
      quantity: totalQuantity || 1,
      itemWeight: totalWeight,
      imageUrl: firstItem?.image_url,
      deliveryDate: quote.operational_data?.shipping?.delivery_estimate,
      countryCode: quote.destination_country || 'US', // For backward compatibility
      purchaseCountryCode: purchaseCountry, // Where we buy from
      destinationCountryCode: quote.destination_country || 'US', // Where we deliver to
      inCart: true,
      isSelected: false,
      createdAt: new Date(quote.created_at),
      updatedAt: new Date(quote.updated_at),
    };

    // Final safety check to ensure all numeric values are valid
    return {
      ...cartItem,
      finalTotal: isNaN(cartItem.finalTotal) ? 0 : cartItem.finalTotal,
      quantity: isNaN(cartItem.quantity) ? 1 : cartItem.quantity,
      itemWeight: isNaN(cartItem.itemWeight) ? 0 : cartItem.itemWeight,
    };
  };

  const updateQuoteStatus = async (quoteId: string, status: string) => {
    // Get current quote to validate transition
    const { data: currentQuote, error: fetchError } = await supabase
      .from('quotes')
      .select('status')
      .eq('id', quoteId)
      .single();

    if (fetchError) {
      console.error('Error fetching current quote status:', fetchError);
      toast({
        title: 'Error',
        description: 'Failed to fetch quote status',
        variant: 'destructive',
      });
      return null;
    }

    // Validate status transition
    if (!isValidTransition(currentQuote.status, status, 'quote')) {
      toast({
        title: 'Invalid Status Transition',
        description: `Cannot change status from "${currentQuote.status}" to "${status}"`,
        variant: 'destructive',
      });
      return null;
    }

    const { data, error } = await supabase
      .from('quotes')
      .update({ status })
      .eq('id', quoteId)
      .select()
      .single();

    if (error) {
      console.error('Error updating quote status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update quote status',
        variant: 'destructive',
      });
      return null;
    }

    // Invalidate relevant queries
    queryClient.invalidateQueries({ queryKey: ['quote-detail', quoteId] });
    queryClient.invalidateQueries({ queryKey: ['user-quotes-and-orders'] });

    toast({
      title: 'Status Updated',
      description: `Quote status changed to "${status}"`,
    });

    return data;
  };

  const approveQuote = async () => {
    setIsUpdating(true);
    try {
      return await updateQuoteStatus(quoteId, 'approved');
    } finally {
      setIsUpdating(false);
    }
  };

  const rejectQuote = async (_reason: string = '') => {
    setIsUpdating(true);
    try {
      // Remove from cart if in cart
      const { data: quote, error: fetchError } = await supabase
        .from('quotes')
        .select('in_cart')
        .eq('id', quoteId)
        .single();
      if (!fetchError && quote && quote.in_cart) {
        // Remove from cart store
        const { removeItem } = useCartStore.getState();
        removeItem(quoteId);
        // Update in_cart flag in DB
        await supabase.from('quotes').update({ in_cart: false }).eq('id', quoteId);
      }
      // Now update status to rejected
      return await updateQuoteStatus(quoteId, 'rejected');
    } finally {
      setIsUpdating(false);
    }
  };

  const addToCart = async () => {
    setIsUpdating(true);
    try {
      // Use UnifiedDataEngine to get quote with proper structure
      const quote = await unifiedDataEngine.getQuote(quoteId);

      if (!quote) {
        throw new Error('Quote not found');
      }

      // Convert unified quote to cart item
      const cartItem = convertQuoteToCartItem(quote);

      // Set userId in cart store first (works for both anonymous and authenticated users)
      if (user?.id) {
        useCartStore.getState().setUserId(user.id);
      }

      // Add item to cart store
      addItem(cartItem);

      // Update quote to mark as in cart (don't change status, just add in_cart flag)
      await supabase.from('quotes').update({ in_cart: true }).eq('id', quoteId);

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['quote-detail', quoteId] });
      queryClient.invalidateQueries({ queryKey: ['user-quotes-and-orders'] });

      toast({
        title: 'Added to Cart',
        description: 'Quote has been added to your cart',
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: 'Error',
        description: 'Failed to add item to cart. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const removeFromCart = async () => {
    setIsUpdating(true);
    try {
      // Remove from cart store first
      const { removeItem } = useCartStore.getState();
      removeItem(quoteId);

      // Update quote to remove in_cart flag
      await supabase.from('quotes').update({ in_cart: false }).eq('id', quoteId);

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['quote-detail', quoteId] });
      queryClient.invalidateQueries({ queryKey: ['user-quotes-and-orders'] });

      toast({
        title: 'Removed from Cart',
        description: 'Quote has been removed from your cart',
      });

      return true;
    } catch (error) {
      console.error('Error removing from cart:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove item from cart',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const setPaymentMethod = (method: string) => {
    return updateQuoteStatus(quoteId, method);
  };

  return {
    updateQuoteStatus,
    approveQuote,
    rejectQuote,
    addToCart,
    removeFromCart,
    setPaymentMethod,
    isUpdating,
  };
};
