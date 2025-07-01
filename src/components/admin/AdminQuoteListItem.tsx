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
import { 
  ChevronDown, 
  ChevronRight, 
  Mail, 
  Copy, 
  Eye, 
  Calendar,
  User,
  Package,
  DollarSign,
  AlertTriangle
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type QuoteWithItems = Tables<'quotes'> & { 
  quote_items: Tables<'quote_items'>[];
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
    <Badge variant={variants[priority]} className="capitalize text-xs">
      {priority}
    </Badge>
  );
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case 'confirmed':
      return <Eye className="h-4 w-4 text-blue-500" />;
    case 'paid':
      return <DollarSign className="h-4 w-4 text-green-500" />;
    case 'shipped':
      return <Package className="h-4 w-4 text-purple-500" />;
    case 'completed':
      return <Calendar className="h-4 w-4 text-gray-500" />;
    case 'cancelled':
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    default:
      return <Eye className="h-4 w-4 text-gray-500" />;
  }
};

export const AdminQuoteListItem = ({ quote, isSelected, onSelect }: AdminQuoteListItemProps) => {
    const navigate = useNavigate();
    const { formatMultiCurrency } = useAdminCurrencyDisplay();
    const [isExpanded, setIsExpanded] = useState(false);
    
    const firstItem = quote.quote_items?.[0];
    const totalItems = quote.quote_items?.length || 0;
    
    const itemSummary = firstItem?.product_name 
        ? `${firstItem.product_name}${totalItems > 1 ? ` +${totalItems - 1} more` : ''}` 
        : quote.product_name || "No items specified";

    const currencyDisplays = quote.final_total ? formatMultiCurrency({
        usdAmount: quote.final_total,
        quoteCurrency: quote.final_currency,
        customerPreferredCurrency: quote.profiles?.preferred_display_currency,
    }) : [];

    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) return 'Today';
      if (diffDays === 2) return 'Yesterday';
      if (diffDays <= 7) return `${diffDays - 1} days ago`;
      return date.toLocaleDateString();
    };

    return (
        <Card className={cn(
          "transition-all duration-200 hover:shadow-md border-l-4",
          isSelected ? 'ring-2 ring-primary border-l-primary' : 'border-l-transparent',
          quote.status === 'cancelled' ? 'border-l-red-500' : '',
          quote.status === 'paid' ? 'border-l-green-500' : '',
          quote.status === 'shipped' ? 'border-l-purple-500' : '',
          quote.status === 'completed' ? 'border-l-gray-500' : ''
        )}>
            <CardContent className="p-0">
                {/* Main Row - Always Visible */}
                <div className="p-4">
                    <div className="flex items-center gap-3">
                        {/* Checkbox */}
                        <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => onSelect(quote.id, checked as boolean)}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-0"
                        />
                        
                        {/* Expand/Collapse Button */}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="h-6 w-6 p-0 hover:bg-muted"
                        >
                            {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                            ) : (
                                <ChevronRight className="h-4 w-4" />
                            )}
                        </Button>

                        {/* Status Icon */}
                        <div className="flex-shrink-0">
                            {getStatusIcon(quote.status)}
                        </div>

                        {/* Quote ID and Basic Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-sm text-foreground">
                                    {quote.display_id || `QT-${quote.id.substring(0, 8).toUpperCase()}`}
                                </h3>
                                <StatusBadge status={quote.status} />
                                {getPriorityBadge(quote.priority)}
                            </div>
                            
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    <span className="truncate">{quote.email}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Package className="h-3 w-3" />
                                    <span>{itemSummary}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>{formatDate(quote.created_at)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Amount */}
                        <div className="flex-shrink-0 text-right">
                            {quote.final_total ? (
                                <div className="space-y-1">
                                    <div className="text-sm font-semibold">
                                        <MultiCurrencyDisplay 
                                            currencies={currencyDisplays}
                                            compact={true}
                                            orientation="vertical"
                                        />
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {totalItems} item{totalItems !== 1 ? 's' : ''}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-sm text-muted-foreground">
                                    Not calculated
                                </div>
                            )}
                        </div>

                        {/* Quick Actions */}
                        <div className="flex-shrink-0 flex gap-1">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/admin/quotes/${quote.id}`);
                                }}
                                className="h-8 w-8 p-0"
                            >
                                <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    // TODO: Implement quick email
                                }}
                                className="h-8 w-8 p-0"
                            >
                                <Mail className="h-4 w-4" />
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    // TODO: Implement duplicate
                                }}
                                className="h-8 w-8 p-0"
                            >
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                    <div className="border-t bg-muted/30 p-4 space-y-3">
                        {/* Rejection Details */}
                        {quote.status === 'cancelled' && quote.rejection_details && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                <div className="flex items-center gap-2 text-red-800">
                                    <AlertTriangle className="h-4 w-4" />
                                    <span className="font-medium">Rejection Reason:</span>
                                </div>
                                <p className="text-sm text-red-700 mt-1">{quote.rejection_details}</p>
                            </div>
                        )}

                        {/* Item Details */}
                        {quote.quote_items && quote.quote_items.length > 0 && (
                            <div>
                                <h4 className="font-medium text-sm mb-2">Items:</h4>
                                <div className="space-y-2">
                                    {quote.quote_items.slice(0, 3).map((item, index) => (
                                        <div key={index} className="flex justify-between text-sm bg-background p-2 rounded">
                                            <span className="truncate flex-1">{item.product_name || `Item ${index + 1}`}</span>
                                            <span className="text-muted-foreground ml-2">
                                                Qty: {item.quantity} • ${item.item_price || 0}
                                            </span>
                                        </div>
                                    ))}
                                    {quote.quote_items.length > 3 && (
                                        <div className="text-xs text-muted-foreground text-center">
                                            +{quote.quote_items.length - 3} more items
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Additional Actions */}
                        <div className="flex gap-2 pt-2 border-t">
                            <Button
                                size="sm"
                                onClick={() => navigate(`/admin/quotes/${quote.id}`)}
                                className="flex-1"
                            >
                                View Full Details
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    // TODO: Implement quick approve
                                }}
                            >
                                Quick Approve
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    // TODO: Implement quick reject
                                }}
                            >
                                Quick Reject
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
