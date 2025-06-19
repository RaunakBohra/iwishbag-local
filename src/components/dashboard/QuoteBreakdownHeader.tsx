import React from "react";
import { CardHeader } from "@/components/ui/card";
import { Tables } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { Hash, Calendar, MapPin } from "lucide-react";

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
    <CardHeader className="flex flex-col space-y-1.5 p-6 backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl">
      <div className="flex flex-col items-center text-center">
        <h3 className="text-xl font-semibold tracking-tight mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Quote Details</h3>
        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1 backdrop-blur-xl bg-white/20 border border-white/30 rounded-lg px-3 py-1">
            <Hash className="h-4 w-4" />
            <span>{quote.display_id || `QT-${quote.id.toString().padStart(7, '0')}`}</span>
          </div>
          <span className="hidden md:inline text-white/40">•</span>
          <div className="flex items-center gap-1 backdrop-blur-xl bg-white/20 border border-white/30 rounded-lg px-3 py-1">
            <Calendar className="h-4 w-4" />
            <span>Requested: {formatDate(quote.created_at)}</span>
          </div>
          <span className="hidden md:inline text-white/40">•</span>
          <div className="flex items-center gap-1 backdrop-blur-xl bg-white/20 border border-white/30 rounded-lg px-3 py-1">
            <MapPin className="h-4 w-4" />
            <span>Shipping from: {quote.country_code}</span>
          </div>
        </div>
      </div>
    </CardHeader>
  );
};
