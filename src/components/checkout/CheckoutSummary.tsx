import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Truck, DollarSign } from 'lucide-react';
import { CartItem } from '@/stores/cartStore';
import { useQuoteCurrency } from '@/hooks/useCurrency';
import { getBreakdownSourceCurrency } from '@/utils/currencyMigration';

interface CheckoutItemPriceProps {
  item: CartItem;
}

const CheckoutItemPrice: React.FC<CheckoutItemPriceProps> = ({ item }) => {
  const { formatAmount } = useQuoteCurrency(item.quote);
  
  // Get calculation steps from origin currency system
  const calc = item.quote.calculation_data?.calculation_steps || {};
  
  return (
    <div className="text-sm text-gray-600">
      <div>Items: {formatAmount(calc.items_subtotal || calc.discounted_items_subtotal || 0)}</div>
      <div>Shipping: {formatAmount((calc.shipping_cost || calc.discounted_shipping_cost || 0) + (calc.insurance_amount || 0))}</div>
      <div>Tax: {formatAmount((calc.customs_duty || calc.discounted_customs_duty || 0) + (calc.local_tax_amount || calc.discounted_tax_amount || 0))}</div>
      <div className="font-semibold text-black">
        Total: {formatAmount(item.quote.total_origin_currency || item.quote.origin_total_amount || item.quote.total_usd || 0)}
      </div>
    </div>
  );
};

interface CheckoutTotalProps {
  items: CartItem[];
}

const CheckoutTotal: React.FC<CheckoutTotalProps> = ({ items }) => {
  const totalAmount = items.reduce((sum, item) => {
    return sum + (item.quote.total_origin_currency || item.quote.origin_total_amount || item.quote.total_usd || 0);
  }, 0);

  // Use the first item's quote for currency formatting (assumes all quotes in cart have same currency)
  const { formatAmount } = useQuoteCurrency(items[0]?.quote);

  return (
    <div className="text-lg font-bold">
      Total: {formatAmount(totalAmount)}
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

  const { formatAmount } = useQuoteCurrency(items[0]?.quote);

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
                {formatAmount(totalAmount)}
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