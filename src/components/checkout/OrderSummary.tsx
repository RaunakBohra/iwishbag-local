import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuoteCurrency } from '@/hooks/useCurrency';
import { CartItem } from '@/stores/cartStore';

// Component to display checkout item price with proper currency conversion
const CheckoutItemPrice = ({ item }: { item: CartItem }) => {
  // Use cart item's currency data directly - no mock quotes needed
  const { formatAmount } = useQuoteCurrency({
    origin_country: item.purchaseCountryCode,
    destination_country: item.destinationCountryCode,
    destination_currency: item.finalCurrency || 'USD',
  });

  return <>{formatAmount(item.finalTotal)}</>;
};

// Component to display checkout total with proper currency conversion
const CheckoutTotal = ({ items }: { items: CartItem[] }) => {
  if (items.length === 0) return <>$0.00</>;

  // Use the first item's currency context for the total - all items should have same destination
  const firstItem = items[0];
  const { formatAmount } = useQuoteCurrency({
    origin_country: firstItem.purchaseCountryCode,
    destination_country: firstItem.destinationCountryCode,
    destination_currency: firstItem.finalCurrency || 'USD',
  });

  const totalAmount = items.reduce((sum, item) => sum + item.finalTotal, 0);
  return <>{formatAmount(totalAmount)}</>;
};

interface OrderSummaryProps {
  selectedCartItems: CartItem[];
  canPlaceOrder: boolean;
  isProcessing: boolean;
  isGuestCheckout: boolean;
  addresses?: any[];
  onPlaceOrder: () => void;
}

export const OrderSummary: React.FC<OrderSummaryProps> = ({
  selectedCartItems,
  canPlaceOrder,
  isProcessing,
  isGuestCheckout,
  addresses,
  onPlaceOrder
}) => {
  return (
    <div className="lg:col-span-2 space-y-6">
      <Card className="sticky top-6 bg-white border border-gray-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base font-medium text-gray-900">
            <ShoppingCart className="h-4 w-4 text-gray-600" />
            Order Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Items List */}
          <div className="space-y-2">
            {selectedCartItems.map((item) => (
              <div
                key={item.quoteId}
                className="flex justify-between items-start py-2 border-b border-gray-100 last:border-b-0"
              >
                <div className="flex-1 pr-3">
                  <Link
                    to={`/quote-details/${item.quoteId}`}
                    className="font-medium hover:underline text-primary text-sm leading-tight"
                  >
                    {item.productName}
                  </Link>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      Qty: {item.quantity}
                    </span>
                    <Badge variant="outline" className="text-xs px-1.5 py-0">
                      {item.countryCode}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-sm">
                    <CheckoutItemPrice item={item} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Total Section */}
          <div className="space-y-2 pt-3 border-t">
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span>
                <CheckoutTotal items={selectedCartItems} />
              </span>
            </div>
          </div>

          {/* Place Order Button */}
          <Button
            onClick={onPlaceOrder}
            disabled={
              !canPlaceOrder ||
              isProcessing ||
              (!isGuestCheckout && (!addresses || addresses.length === 0))
            }
            className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white font-medium transition-colors duration-200"
            size="default"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Place Order - <CheckoutTotal items={selectedCartItems} />
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            By placing this order, you agree to our terms and conditions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};