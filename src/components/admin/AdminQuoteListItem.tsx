import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tables } from "@/integrations/supabase/types";
import { useNavigate } from "react-router-dom";
import { MultiCurrencyDisplay } from "./MultiCurrencyDisplay";
import { useAdminCurrencyDisplay } from "@/hooks/useAdminCurrencyDisplay";

type QuoteWithItems = Tables<'quotes'> & { 
  quote_items: Tables<'quote_items'>[];
  rejection_reasons: { reason: string } | null;
  profiles?: { preferred_display_currency?: string } | null;
};

interface AdminQuoteListItemProps {
    quote: QuoteWithItems;
    isSelected: boolean;
    onSelect: (id: string) => void;
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'pending':
        case 'cod_pending':
        case 'bank_transfer_pending':
        case 'calculated': 
            return 'secondary';
        case 'sent': 
            return 'outline';
        case 'accepted': 
        case 'paid':
            return 'default';
        case 'cancelled': 
            return 'destructive';
        default: 
            return 'default';
    }
};

const getPriorityBadge = (priority: QuoteWithItems['priority']) => {
  if (!priority) return null;

  const variants: { [key in NonNullable<QuoteWithItems['priority']>]: 'outline' | 'secondary' | 'default' | 'destructive' } = {
    low: 'outline',
    medium: 'secondary',
    high: 'default',
    urgent: 'destructive',
  };

  return (
    <Badge variant={variants[priority]} className="capitalize">
      {priority}
    </Badge>
  );
};

export const AdminQuoteListItem = ({ quote, isSelected, onSelect }: AdminQuoteListItemProps) => {
    const navigate = useNavigate();
    const { formatMultiCurrency } = useAdminCurrencyDisplay();
    
    const firstItem = quote.quote_items?.[0];
    const totalItems = quote.quote_items?.length || 0;
    
    const itemSummary = firstItem?.product_name 
        ? `${firstItem.product_name}${totalItems > 1 ? ` and ${totalItems - 1} more` : ''}` 
        : quote.product_name || "No items specified";

    const currencyDisplays = quote.final_total ? formatMultiCurrency({
        usdAmount: quote.final_total,
        quoteCurrency: quote.final_currency,
        customerPreferredCurrency: quote.profiles?.preferred_display_currency,
    }) : [];

    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex justify-between items-start gap-4">
                    <div className="flex items-start gap-4 flex-1">
                        <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => onSelect(quote.id)}
                            aria-label="Select quote"
                            className="mt-1"
                        />
                        <div className="flex-1 grid grid-cols-4 gap-4">
                            <div>
                                <h3 className="font-semibold">{quote.display_id || itemSummary}</h3>
                                {quote.order_display_id && <p className="text-sm font-bold text-muted-foreground">Order ID: {quote.order_display_id}</p>}
                                {quote.display_id && <p className="text-sm text-muted-foreground">{itemSummary}</p>}
                                <p className="text-sm text-muted-foreground">Total items: {totalItems || quote.quantity || 0}</p>
                                <p className="text-sm text-muted-foreground">{quote.email}</p>
                            </div>
                            <div>
                                <p className="text-sm">Country: {quote.country_code || 'Not set'}</p>
                            </div>
                            <div>
                                <div>
                                    <p className="text-sm mb-1">Final Total:</p>
                                    {quote.final_total ? (
                                        <MultiCurrencyDisplay 
                                            currencies={currencyDisplays}
                                            compact={true}
                                        />
                                    ) : (
                                        <span className="text-sm text-muted-foreground">Not calculated</span>
                                    )}
                                </div>
<<<<<<< HEAD
=======
                                <p className="text-sm mt-2">Category: {quote.customs_category_name || 'Not set'}</p>
>>>>>>> ed4ff60d414419cde21cca73f742c35e0184a312
                            </div>
                            <div>
                                <div className="flex items-center flex-wrap gap-1">
                                    <Badge variant={getStatusColor(quote.status) as any}>{quote.status}</Badge>
                                    {getPriorityBadge(quote.priority)}
                                </div>
                                {quote.status === 'cancelled' && quote.rejection_reasons?.reason && (
                                    <p className="text-xs text-red-600 mt-1" title={quote.rejection_reasons.reason}>
                                        <strong>Reason:</strong> {quote.rejection_reasons.reason}
                                    </p>
                                )}
                                <p className="text-sm text-muted-foreground mt-1">
                                    {new Date(quote.created_at).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button size="sm" variant="destructive" onClick={() => navigate(`/admin/quotes/${quote.id}`)}>
                            View Details
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
