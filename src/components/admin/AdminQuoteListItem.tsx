import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tables } from "@/integrations/supabase/types";
import { useNavigate } from "react-router-dom";
import { MultiCurrencyDisplay } from "./MultiCurrencyDisplay";
import { useAdminCurrencyDisplay } from "@/hooks/useAdminCurrencyDisplay";
import { useStatusManagement } from '@/hooks/useStatusManagement';
import { StatusBadge } from '@/components/dashboard/StatusBadge';

type QuoteWithItems = Tables<'quotes'> & { 
  quote_items: Tables<'quote_items'>[];
  rejection_reasons: { reason: string } | null;
  profiles?: { preferred_display_currency?: string } | null;
};

interface AdminQuoteListItemProps {
  quote: QuoteWithItems;
  isSelected: boolean;
  onSelect: (quoteId: string, selected: boolean) => void;
}

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
        <Card className={`cursor-pointer transition-all duration-200 hover:shadow-md ${isSelected ? 'ring-2 ring-primary' : ''}`}>
            <CardContent className="p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                        <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => onSelect(quote.id, checked as boolean)}
                            onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-medium text-sm truncate">
                                        {quote.display_id || quote.id.substring(0, 8)}
                                    </h3>
                                    <p className="text-sm text-muted-foreground truncate">
                                        {itemSummary}
                                    </p>
                                    {quote.email && (
                                        <p className="text-xs text-muted-foreground">
                                            {quote.email}
                                        </p>
                                    )}
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
                                </div>
                                <div>
                                    <div className="flex items-center flex-wrap gap-1">
                                        <StatusBadge status={quote.status} />
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
