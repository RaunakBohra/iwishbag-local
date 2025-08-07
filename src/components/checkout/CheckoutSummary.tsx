import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Truck, DollarSign } from 'lucide-react';
import { CartItem } from '@/stores/cartStore';
import { useDisplayCurrency } from '@/hooks/useDisplayCurrency';
import { getBreakdownSourceCurrency } from '@/utils/currencyMigration';

interface CheckoutItemPriceProps {
  item: CartItem;
}

const CheckoutItemPrice: React.FC<CheckoutItemPriceProps> = ({ item }) => {
  // Add debugging for checkout item currency detection
  console.log('🏪 [CHECKOUT ITEM DEBUG] CheckoutItemPrice processing:', {
    itemId: item.id,
    quoteId: item.quote?.id,
    originCountry: item.quote?.origin_country,
    totalOriginCurrency: item.quote?.total_origin_currency,
    totalUSD: item.quote?.total_usd,
    hasQuote: !!item.quote
  });
  
  const { formatAmountWithConversion, formatAmountSync, getSourceCurrency } = useDisplayCurrency(item.quote);
  const [prices, setPrices] = useState({
    items: formatAmountSync(0),
    shipping: formatAmountSync(0),
    tax: formatAmountSync(0),
    total: formatAmountSync(0)
  });
  
  useEffect(() => {
    const convertPrices = async () => {
      // Quote is now required in CartItem interface, but add safety check
      if (!item.quote) {
        console.warn('CheckoutItemPrice: Missing quote data for item:', item.id);
        return;
      }
      
      try {
        // Get calculation steps from origin currency system
        const calc = item.quote.calculation_data?.calculation_steps || {};
        const sourceCurrency = getSourceCurrency(item.quote);
        
        const [itemsPrice, shippingPrice, taxPrice, totalPrice] = await Promise.all([
          formatAmountWithConversion(calc.items_subtotal || calc.discounted_items_subtotal || 0, sourceCurrency),
          formatAmountWithConversion((calc.shipping_cost || calc.discounted_shipping_cost || 0) + (calc.insurance_amount || 0), sourceCurrency),
          formatAmountWithConversion((calc.customs_duty || calc.discounted_customs_duty || 0) + (calc.local_tax_amount || calc.discounted_tax_amount || 0), sourceCurrency),
          formatAmountWithConversion(item.quote.total_origin_currency || item.quote.origin_total_amount || item.quote.total_usd || 0, sourceCurrency)
        ]);
        
        setPrices({
          items: itemsPrice,
          shipping: shippingPrice,
          tax: taxPrice,
          total: totalPrice
        });
      } catch (error) {
        console.warn('Checkout item price conversion failed:', error);
      }
    };
    
    convertPrices();
  }, [item, formatAmountWithConversion, getSourceCurrency]);
  
  return (
    <div className="text-sm text-gray-600">
      <div>Items: {prices.items}</div>
      <div>Shipping: {prices.shipping}</div>
      <div>Tax: {prices.tax}</div>
      <div className="font-semibold text-black">
        Total: {prices.total}
      </div>
    </div>
  );
};

interface CheckoutTotalProps {
  items: CartItem[];
}

const CheckoutTotal: React.FC<CheckoutTotalProps> = ({ items }) => {
  const firstItemQuote = items.find(item => item.quote)?.quote;
  const [convertedTotal, setConvertedTotal] = useState<string>('$0.00');
  
  // CRITICAL FIX: Only call useDisplayCurrency if we have quote data
  const { formatAmountWithConversion, formatAmountSync, getSourceCurrency } = useDisplayCurrency(
    firstItemQuote || undefined // Ensure we pass undefined instead of null
  );
  
  // Add debug logging
  console.log(`💳 [CHECKOUT TOTAL DEBUG] Items count: ${items.length}, First item has quote: ${!!firstItemQuote}`);
  
  useEffect(() => {
    const convertTotal = async () => {
      if (items.length === 0) {
        setConvertedTotal(formatAmountSync(0));
        return;
      }
      
      // CRITICAL FIX: Don't try currency conversion if no quotes available
      if (!firstItemQuote) {
        console.warn('💳 [CHECKOUT DEBUG] No quote data available for checkout total - cannot calculate');
        setConvertedTotal(formatAmountSync(0));
        return;
      }
      
      try {
        console.log('💳 [CHECKOUT DEBUG] Converting checkout total with quote data:', {
          itemCount: items.length,
          firstQuoteId: firstItemQuote.id,
          originCountry: firstItemQuote.origin_country
        });
        
        const totalAmount = items.reduce((sum, item) => {
          return sum + (item.quote?.total_origin_currency || item.quote?.origin_total_amount || item.quote?.total_usd || 0);
        }, 0);
        
        const sourceCurrency = getSourceCurrency(firstItemQuote);
        const formatted = await formatAmountWithConversion(totalAmount, sourceCurrency);
        setConvertedTotal(formatted);
      } catch (error) {
        console.warn('Checkout total conversion failed:', error);
        const totalAmount = items.reduce((sum, item) => {
          return sum + (item.quote?.total_origin_currency || item.quote?.total_usd || 0);
        }, 0);
        setConvertedTotal(formatAmountSync(totalAmount));
      }
    };
    
    convertTotal();
  }, [items, formatAmountWithConversion, formatAmountSync, getSourceCurrency, firstItemQuote]);
  
  return (
    <div className="text-lg font-bold">
      Total: {convertedTotal}
    </div>
  );
};

interface CheckoutSummaryProps {
  items: CartItem[];
  loading: boolean;
  onRemoveItem?: (quoteId: string) => void;
}

export const CheckoutSummary: React.FC<CheckoutSummaryProps> = ({
  items,
  loading,
  onRemoveItem
}) => {
  const totalAmount = items.reduce((sum, item) => {
    return sum + (item.quote.total_origin_currency || item.quote.origin_total_amount || item.quote.total_usd || 0);
  }, 0);

  // Use the new display currency hook for consistency
  const firstItemQuote = items.find(item => item.quote)?.quote;
  const { formatAmountSync, getSourceCurrency } = useDisplayCurrency(firstItemQuote || undefined);

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-gray-500">
            <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Your cart is empty</h3>
            <p className="text-sm">
              Add some items to your cart to continue with checkout.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ShoppingCart className="h-5 w-5" />
            <span>Order Summary</span>
            <Badge variant="secondary">{items.length} items</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item) => (
            <div key={item.quote.id} className="flex justify-between items-start border-b pb-4">
              <div className="flex-1">
                <h4 className="font-medium">{item.quote.customer_data?.project_name || 'Quote'}</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Quote ID: {item.quote.id}
                </p>
                
                {/* Quote details */}
                <div className="mt-2 space-y-1 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <Truck className="h-3 w-3" />
                    <span>
                      From {item.quote.origin_country} to {item.quote.destination_country}
                    </span>
                  </div>
                  
                  {item.quote.customer_data?.items && (
                    <div className="text-xs">
                      {item.quote.customer_data.items.slice(0, 2).map((quoteItem: any, idx: number) => (
                        <div key={idx}>
                          {quoteItem.product_name} (Qty: {quoteItem.quantity})
                        </div>
                      ))}
                      {item.quote.customer_data.items.length > 2 && (
                        <div className="text-gray-500">
                          +{item.quote.customer_data.items.length - 2} more items
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="text-right ml-4">
                <CheckoutItemPrice item={item} />
                {onRemoveItem && (
                  <button
                    onClick={() => onRemoveItem(item.quote.id)}
                    className="text-xs text-red-600 hover:text-red-700 mt-2"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
          
          {/* Total */}
          <div className="pt-4 border-t">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Total Amount</span>
              </div>
              <div className="text-xl font-bold">
                <CheckoutTotal items={items} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shipping Notice */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 text-blue-800">
            <Truck className="h-4 w-4" />
            <span className="text-sm font-medium">
              Estimated delivery: 7-14 business days
            </span>
          </div>
          <p className="text-xs text-blue-700 mt-1">
            Shipping costs and customs duties are included in the total above.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};