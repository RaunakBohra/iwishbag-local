import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Trash2, ShoppingCart } from "lucide-react";
import { CheckoutButton } from "./CheckoutButton";
import { useCartMutations } from "@/hooks/useCartMutations";
import { useUserCurrency } from "@/hooks/useUserCurrency";
import { MultiCurrencyDisplay } from "@/components/admin/MultiCurrencyDisplay";
import { useAdminCurrencyDisplay } from "@/hooks/useAdminCurrencyDisplay";

export const Cart = () => {
  const { user } = useAuth();
  const [selectedQuotes, setSelectedQuotes] = useState<string[]>([]);
  const { removeFromCart, isRemovingFromCart } = useCartMutations();
  const { formatAmount } = useUserCurrency();
  const { formatMultiCurrency } = useAdminCurrencyDisplay();

  const { data: approvedQuotes, isLoading } = useQuery({
    queryKey: ['approved-quotes', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('user_id', user.id)
        .eq('approval_status', 'approved')
        .eq('in_cart', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (approvedQuotes) {
      const approvedQuoteIds = approvedQuotes.map(q => q.id);
      setSelectedQuotes(prevSelected =>
        prevSelected.filter(id => approvedQuoteIds.includes(id))
      );
    }
  }, [approvedQuotes]);

  const handleQuoteSelection = (quoteId: string, checked: boolean) => {
    if (checked) {
      setSelectedQuotes([...selectedQuotes, quoteId]);
    } else {
      setSelectedQuotes(selectedQuotes.filter(id => id !== quoteId));
    }
  };

  const handleRemoveFromCart = (quoteId: string) => {
    removeFromCart(quoteId);
  };

  // Calculate total in USD
  const totalAmount = approvedQuotes
    ?.filter(quote => selectedQuotes.includes(quote.id))
    .reduce((sum, quote) => sum + (quote.final_total || 0), 0) || 0;

  if (isLoading) {
    return <div>Loading cart...</div>;
  }

  return (
    <div className="container py-12 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ShoppingCart className="h-8 w-8" />
          Shopping Cart
        </h1>
        <p className="text-muted-foreground">
          Select approved quotes to checkout together
        </p>
      </div>

      {!approvedQuotes || approvedQuotes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Your shopping cart is empty. Approved quotes will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Approved Quotes ({approvedQuotes.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {approvedQuotes.map((quote) => {
                const quoteCurrencies = quote.final_total ? formatMultiCurrency({
                  usdAmount: quote.final_total,
                  quoteCurrency: quote.final_currency,
                  showAllVariations: false
                }) : [];

                return (
                  <div key={quote.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <Checkbox
                      checked={selectedQuotes.includes(quote.id)}
                      onCheckedChange={(checked) => handleQuoteSelection(quote.id, checked as boolean)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">{quote.product_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {quote.quantity} items
                          </p>
                          <Badge variant="secondary">{quote.country_code}</Badge>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">
                            {quoteCurrencies.length > 0 ? (
                              <MultiCurrencyDisplay 
                                currencies={quoteCurrencies}
                                orientation="vertical"
                                showLabels={false}
                                compact={true}
                              />
                            ) : (
                              formatAmount(quote.final_total)
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">Total</p>
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleRemoveFromCart(quote.id)}
                      disabled={isRemovingFromCart}
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {selectedQuotes.length > 0 && (
            <Card>
              <CardContent className="py-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold">
                      Total: {formatAmount(totalAmount)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedQuotes.length} item(s) selected
                    </p>
                  </div>
                  <CheckoutButton 
                    selectedQuoteIds={selectedQuotes}
                    totalAmount={totalAmount}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
