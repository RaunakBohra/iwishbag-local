import React from "react";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Tables } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { MapPin, Hash, Calendar, Package, ChevronUp, ChevronDown } from "lucide-react";

type Quote = Tables<'quotes'>;
type QuoteWithItems = Tables<'quotes'> & {
  quote_items: Tables<'quote_items'>[];
};

interface QuoteBreakdownHeaderProps {
  quote: QuoteWithItems;
  isItemsExpanded: boolean;
  onToggleItems: () => void;
}

export const QuoteBreakdownHeader: React.FC<QuoteBreakdownHeaderProps> = ({
  quote,
  isItemsExpanded,
  onToggleItems
}) => {
  const formatDate = (date: string | Date) => {
    return format(new Date(date), 'MMM d, yyyy');
  };

  return (
    <CardHeader className="flex flex-col space-y-1.5 p-6">
      <div className="flex flex-col items-center text-center">
        <h3 className="text-xl font-semibold tracking-tight mb-4">Quote Details</h3>
        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Hash className="h-4 w-4" />
            <span>{quote.display_id || `QT-${quote.id.toString().padStart(7, '0')}`}</span>
          </div>
          <span className="hidden md:inline">•</span>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>Requested: {formatDate(quote.created_at)}</span>
          </div>
          <span className="hidden md:inline">•</span>
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            <span>Shipping from: {quote.country_code}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center mb-6 relative">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-blue-500" />
          <h3 className="text-xl font-semibold">Items Requested</h3>
        </div>
        <button
          onClick={onToggleItems}
          className="absolute right-0 p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          {isItemsExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
      </div>
    </CardHeader>
  );
};
